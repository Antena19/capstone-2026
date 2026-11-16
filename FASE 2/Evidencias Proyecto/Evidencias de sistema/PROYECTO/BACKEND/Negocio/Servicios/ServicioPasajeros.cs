using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Pasajeros;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioPasajeros
    {
        Task<IReadOnlyList<PasajeroRespuestaDto>> ListarAsync(EstadoRegistro? estado, int? idEmpresa);

        Task<PasajeroRespuestaDto> ObtenerPorIdAsync(int idPasajero);

        Task<PasajeroRespuestaDto> CrearAsync(CrearPasajeroSolicitudDto solicitud, int idAdministrador);

        Task<PasajeroRespuestaDto> CrearConCuentaAsync(
            CrearPasajeroConCuentaSolicitudDto solicitud,
            int idAdministrador);

        Task<PasajeroRespuestaDto> HabilitarAccesoAsync(
            int idPasajero,
            HabilitarAccesoPasajeroSolicitudDto solicitud,
            int idAdministrador);

        Task<PasajeroRespuestaDto> ReenviarActivacionAsync(int idPasajero, int idAdministrador);

        Task<PasajeroRespuestaDto> EditarAsync(int idPasajero, EditarPasajeroSolicitudDto solicitud, int idAdministrador);

        Task<PasajeroRespuestaDto> CambiarEstadoAsync(int idPasajero, CambiarEstadoPasajeroSolicitudDto solicitud, int idAdministrador);
    }

    /// <summary>
    /// Gestión de pasajeros reservada al rol ADMINISTRADOR.
    /// El alta administrativa con cuenta usa una transacción Usuario + Pasajero + activación.
    /// POST /api/pasajeros sigue permitiendo pasajeros históricos sin cuenta.
    /// </summary>
    public class ServicioPasajeros : IServicioPasajeros
    {
        private const string MensajeRutDuplicado = "Ya existe un pasajero con el RUT indicado.";
        private const string MensajeUsuarioAsociado = "El usuario indicado ya está asociado a otro pasajero.";
        private const string MensajeConflicto = "No fue posible guardar el pasajero con los datos indicados.";
        private const string MensajeConflictoCuenta = "No fue posible crear la cuenta con los datos indicados.";

        private readonly TransporteContext _contexto;
        private readonly IServicioHashPassword _hashPassword;
        private readonly IServicioActivacionCuentas _activacion;
        private readonly ILogger<ServicioPasajeros> _logger;

        public ServicioPasajeros(
            TransporteContext contexto,
            IServicioHashPassword hashPassword,
            IServicioActivacionCuentas activacion,
            ILogger<ServicioPasajeros> logger)
        {
            _contexto = contexto;
            _hashPassword = hashPassword;
            _activacion = activacion;
            _logger = logger;
        }

        public async Task<IReadOnlyList<PasajeroRespuestaDto>> ListarAsync(EstadoRegistro? estado, int? idEmpresa)
        {
            var consulta = _contexto.Pasajeros
                .AsNoTracking()
                .Include(p => p.Usuario)
                .AsQueryable();

            if (estado.HasValue)
            {
                consulta = consulta.Where(p => p.Estado == estado.Value);
            }

            if (idEmpresa.HasValue)
            {
                consulta = consulta.Where(p => p.IdEmpresa == idEmpresa.Value);
            }

            var pasajeros = await consulta
                .OrderBy(p => p.IdPasajero)
                .ToListAsync();

            var ultimas = await ObtenerUltimasActivacionesAsync(
                pasajeros.Where(p => p.IdUsuario.HasValue).Select(p => p.IdUsuario!.Value));

            return pasajeros
                .Select(p => Mapear(p, p.Usuario, ObtenerActivacion(ultimas, p.IdUsuario)))
                .ToList();
        }

        public async Task<PasajeroRespuestaDto> ObtenerPorIdAsync(int idPasajero)
        {
            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            var activacion = await ObtenerUltimaActivacionAsync(pasajero.IdUsuario);
            return Mapear(pasajero, pasajero.Usuario, activacion);
        }

        public async Task<PasajeroRespuestaDto> CrearAsync(CrearPasajeroSolicitudDto solicitud, int idAdministrador)
        {
            var datos = NormalizarDatos(
                solicitud.IdEmpresa,
                solicitud.IdUsuario,
                solicitud.Nombre,
                solicitud.Rut,
                solicitud.Telefono,
                solicitud.Direccion);

            await AsegurarEmpresaAsignableAsync(datos.IdEmpresa, exigirActiva: true);
            await AsegurarRutDisponibleAsync(datos.Rut);
            await AsegurarUsuarioAsociableAsync(datos.IdUsuario);

            var pasajero = new Pasajero
            {
                IdEmpresa = datos.IdEmpresa,
                IdUsuario = datos.IdUsuario,
                Nombre = datos.Nombre,
                Rut = datos.Rut,
                Telefono = datos.Telefono,
                Direccion = datos.Direccion,
                Estado = EstadoRegistro.ACTIVO
            };

            _contexto.Pasajeros.Add(pasajero);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeConflicto, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el pasajero {IdPasajero} sin cuenta automática.",
                idAdministrador,
                pasajero.IdPasajero);

            return await ObtenerPorIdAsync(pasajero.IdPasajero);
        }

        public async Task<PasajeroRespuestaDto> CrearConCuentaAsync(
            CrearPasajeroConCuentaSolicitudDto solicitud,
            int idAdministrador)
        {
            var nombre = RequerirTexto(solicitud.Nombre, "El nombre es obligatorio.");
            var rut = NormalizarRut(solicitud.Rut);
            var telefono = NormalizarTelefono(solicitud.Telefono);
            var direccion = RequerirTexto(solicitud.Direccion, "La dirección es obligatoria.");
            var email = NormalizarEmailOpcional(solicitud.Email);

            await AsegurarEmpresaAsignableAsync(solicitud.IdEmpresa, exigirActiva: true);
            await AsegurarRutDisponibleAsync(rut);
            await AsegurarTelefonoUsuarioDisponibleAsync(telefono);
            await AsegurarEmailUsuarioDisponibleAsync(email);

            var resultado = await CrearCuentaYPasajeroAsync(
                solicitud.IdEmpresa,
                nombre,
                rut,
                telefono,
                email,
                direccion);

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el pasajero {IdPasajero} con cuenta {IdUsuario}.",
                idAdministrador,
                resultado.Pasajero.IdPasajero,
                resultado.Usuario.IdUsuario);

            return Mapear(resultado.Pasajero, resultado.Usuario, resultado.Activacion);
        }

        public async Task<PasajeroRespuestaDto> HabilitarAccesoAsync(
            int idPasajero,
            HabilitarAccesoPasajeroSolicitudDto solicitud,
            int idAdministrador)
        {
            var pasajero = await ObtenerPasajeroAsync(idPasajero);
            if (pasajero.IdUsuario.HasValue)
            {
                throw new ExcepcionNegocio("El pasajero ya tiene una cuenta de acceso.");
            }

            var telefono = NormalizarTelefono(pasajero.Telefono);
            var email = NormalizarEmailOpcional(solicitud.Email);

            await AsegurarTelefonoUsuarioDisponibleAsync(telefono);
            await AsegurarEmailUsuarioDisponibleAsync(email);

            var resultado = await AsociarCuentaAPasajeroExistenteAsync(pasajero, telefono, email);

            _logger.LogInformation(
                "El administrador {IdAdministrador} habilitó el acceso del pasajero {IdPasajero} con usuario {IdUsuario}.",
                idAdministrador,
                idPasajero,
                resultado.Usuario.IdUsuario);

            return Mapear(resultado.Pasajero, resultado.Usuario, resultado.Activacion);
        }

        public async Task<PasajeroRespuestaDto> ReenviarActivacionAsync(int idPasajero, int idAdministrador)
        {
            var pasajero = await _contexto.Pasajeros
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            if (pasajero.Usuario is null)
            {
                throw new ExcepcionNegocio("El pasajero no tiene una cuenta de acceso.");
            }

            await _activacion.ReenviarAdministradorAsync(pasajero.Usuario.IdUsuario);

            _logger.LogInformation(
                "El administrador {IdAdministrador} reenvió la activación del pasajero {IdPasajero}.",
                idAdministrador,
                idPasajero);

            return await ObtenerPorIdAsync(idPasajero);
        }

        public async Task<PasajeroRespuestaDto> EditarAsync(
            int idPasajero,
            EditarPasajeroSolicitudDto solicitud,
            int idAdministrador)
        {
            var pasajero = await _contexto.Pasajeros
                .Include(p => p.Usuario)
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            var idUsuarioSolicitud = pasajero.IdUsuario ?? solicitud.IdUsuario;
            var datos = NormalizarDatos(
                solicitud.IdEmpresa,
                idUsuarioSolicitud,
                solicitud.Nombre,
                solicitud.Rut,
                solicitud.Telefono,
                solicitud.Direccion);
            var email = NormalizarEmailOpcional(solicitud.Email);

            var cambiaEmpresa = pasajero.IdEmpresa != datos.IdEmpresa;
            await AsegurarEmpresaAsignableAsync(datos.IdEmpresa, exigirActiva: cambiaEmpresa);
            await AsegurarRutDisponibleAsync(datos.Rut, idPasajero);

            if (!pasajero.IdUsuario.HasValue)
            {
                await AsegurarUsuarioAsociableAsync(datos.IdUsuario, idPasajero);
            }

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                pasajero.IdEmpresa = datos.IdEmpresa;
                pasajero.Nombre = datos.Nombre;
                pasajero.Rut = datos.Rut;

                if (!string.Equals(pasajero.Direccion.Trim(), datos.Direccion, StringComparison.OrdinalIgnoreCase))
                {
                    pasajero.Latitud = null;
                    pasajero.Longitud = null;
                    pasajero.DireccionGeocodificada = null;
                    pasajero.FechaGeocodificacion = null;
                }

                pasajero.Direccion = datos.Direccion;

                if (pasajero.Usuario is not null)
                {
                    await SincronizarIdentidadUsuarioAsync(pasajero, pasajero.Usuario, datos.Telefono, email);
                }
                else
                {
                    pasajero.IdUsuario = datos.IdUsuario;
                    pasajero.Telefono = datos.Telefono;
                }

                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch (ExcepcionNegocio)
            {
                await transaccion.RollbackAsync();
                throw;
            }
            catch (DbUpdateException)
            {
                await transaccion.RollbackAsync();
                throw new ExcepcionNegocio(MensajeConflicto, StatusCodes.Status409Conflict);
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el pasajero {IdPasajero}.",
                idAdministrador,
                idPasajero);

            return await ObtenerPorIdAsync(idPasajero);
        }

        public async Task<PasajeroRespuestaDto> CambiarEstadoAsync(
            int idPasajero,
            CambiarEstadoPasajeroSolicitudDto solicitud,
            int idAdministrador)
        {
            var pasajero = await ObtenerPasajeroAsync(idPasajero);

            pasajero.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del pasajero {IdPasajero} a {Estado}.",
                idAdministrador,
                idPasajero,
                solicitud.Estado);

            return await ObtenerPorIdAsync(idPasajero);
        }

        private async Task<(Pasajero Pasajero, Usuario Usuario, ActivacionUsuario Activacion)> CrearCuentaYPasajeroAsync(
            int idEmpresa,
            string nombre,
            string rut,
            string telefono,
            string? email,
            string direccion)
        {
            var rol = await ResolverRolPasajeroAsync();
            ActivacionUsuario? activacion = null;
            string? codigo = null;
            Usuario? usuario = null;
            Pasajero? pasajero = null;

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                usuario = CrearUsuarioPasajeroPendiente(rol.IdRol, telefono, email);
                _contexto.Usuarios.Add(usuario);
                await _contexto.SaveChangesAsync();

                pasajero = new Pasajero
                {
                    IdEmpresa = idEmpresa,
                    IdUsuario = usuario.IdUsuario,
                    Nombre = nombre,
                    Rut = rut,
                    Telefono = telefono,
                    Direccion = direccion,
                    Estado = EstadoRegistro.ACTIVO
                };

                _contexto.Pasajeros.Add(pasajero);
                await _contexto.SaveChangesAsync();

                (activacion, codigo) = await _activacion.GenerarAsync(usuario.IdUsuario);
                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch (ExcepcionNegocio)
            {
                await transaccion.RollbackAsync();
                throw;
            }
            catch (DbUpdateException)
            {
                await transaccion.RollbackAsync();
                throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            await _activacion.IntentarEnviarAsync(activacion!, telefono, codigo!);
            return (pasajero!, usuario!, activacion!);
        }

        private async Task<(Pasajero Pasajero, Usuario Usuario, ActivacionUsuario Activacion)> AsociarCuentaAPasajeroExistenteAsync(
            Pasajero pasajero,
            string telefono,
            string? email)
        {
            var rol = await ResolverRolPasajeroAsync();
            ActivacionUsuario? activacion = null;
            string? codigo = null;
            Usuario? usuario = null;

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                usuario = CrearUsuarioPasajeroPendiente(rol.IdRol, telefono, email);
                _contexto.Usuarios.Add(usuario);
                await _contexto.SaveChangesAsync();

                pasajero.IdUsuario = usuario.IdUsuario;
                pasajero.Telefono = telefono;
                await _contexto.SaveChangesAsync();

                (activacion, codigo) = await _activacion.GenerarAsync(usuario.IdUsuario);
                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch (ExcepcionNegocio)
            {
                await transaccion.RollbackAsync();
                throw;
            }
            catch (DbUpdateException)
            {
                await transaccion.RollbackAsync();
                throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            await _activacion.IntentarEnviarAsync(activacion!, telefono, codigo!);
            return (pasajero, usuario!, activacion!);
        }

        private Usuario CrearUsuarioPasajeroPendiente(int idRol, string telefono, string? email)
        {
            return new Usuario
            {
                Email = email,
                Telefono = telefono,
                PasswordHash = _hashPassword.GenerarHash(GeneradorPasswordTemporal.Generar()),
                DebeCambiarPassword = false,
                CuentaActivada = false,
                IdRol = idRol,
                Estado = EstadoRegistro.ACTIVO,
                FechaCreacion = DateTime.UtcNow
            };
        }

        private async Task SincronizarIdentidadUsuarioAsync(
            Pasajero pasajero,
            Usuario usuario,
            string telefono,
            string? email)
        {
            var telefonoCambio = !string.Equals(usuario.Telefono, telefono, StringComparison.Ordinal);
            var emailCambio = !string.Equals(usuario.Email, email, StringComparison.Ordinal);

            if (telefonoCambio)
            {
                await AsegurarTelefonoUsuarioDisponibleAsync(telefono, usuario.IdUsuario);
                usuario.Telefono = telefono;
                pasajero.Telefono = telefono;

                if (!usuario.CuentaActivada)
                {
                    await _activacion.InvalidarVigentesAsync(usuario.IdUsuario);
                }
            }
            else
            {
                pasajero.Telefono = telefono;
            }

            if (emailCambio)
            {
                await AsegurarEmailUsuarioDisponibleAsync(email, usuario.IdUsuario);
                usuario.Email = email;
            }
        }

        private async Task<Rol> ResolverRolPasajeroAsync()
        {
            var rol = await _contexto.Roles
                .FirstOrDefaultAsync(r =>
                    r.Nombre == NombresRol.Pasajero
                    && r.Estado == EstadoRegistro.ACTIVO);

            if (rol is null)
            {
                throw new ExcepcionNegocio("El rol PASAJERO no existe o no se encuentra activo.");
            }

            return rol;
        }

        private async Task<Pasajero> ObtenerPasajeroAsync(int idPasajero)
        {
            var pasajero = await _contexto.Pasajeros
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            return pasajero;
        }

        private async Task AsegurarEmpresaAsignableAsync(int idEmpresa, bool exigirActiva)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.");
            }

            if (exigirActiva && empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
            }
        }

        private async Task AsegurarRutDisponibleAsync(string rut, int? idPasajeroExcluido = null)
        {
            var consulta = _contexto.Pasajeros.Where(p => p.Rut == rut);

            if (idPasajeroExcluido.HasValue)
            {
                consulta = consulta.Where(p => p.IdPasajero != idPasajeroExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarTelefonoUsuarioDisponibleAsync(string telefono, int? idUsuarioExcluido = null)
        {
            var consulta = _contexto.Usuarios.Where(u => u.Telefono == telefono);
            if (idUsuarioExcluido.HasValue)
            {
                consulta = consulta.Where(u => u.IdUsuario != idUsuarioExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarEmailUsuarioDisponibleAsync(string? email, int? idUsuarioExcluido = null)
        {
            if (email is null)
            {
                return;
            }

            var consulta = _contexto.Usuarios.Where(u => u.Email == email);
            if (idUsuarioExcluido.HasValue)
            {
                consulta = consulta.Where(u => u.IdUsuario != idUsuarioExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarUsuarioAsociableAsync(int? idUsuario, int? idPasajeroExcluido = null)
        {
            if (!idUsuario.HasValue)
            {
                return;
            }

            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario.Value);

            if (usuario is null)
            {
                throw new ExcepcionNegocio("El usuario indicado no existe.");
            }

            if (!string.Equals(usuario.Rol.Nombre, NombresRol.Pasajero, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio("El usuario indicado debe tener rol PASAJERO.");
            }

            var consulta = _contexto.Pasajeros.Where(p => p.IdUsuario == idUsuario.Value);

            if (idPasajeroExcluido.HasValue)
            {
                consulta = consulta.Where(p => p.IdPasajero != idPasajeroExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeUsuarioAsociado, StatusCodes.Status409Conflict);
            }
        }

        private async Task<Dictionary<int, ActivacionUsuario>> ObtenerUltimasActivacionesAsync(IEnumerable<int> idsUsuario)
        {
            var ids = idsUsuario.Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<int, ActivacionUsuario>();
            }

            var activaciones = await _contexto.ActivacionesUsuario
                .AsNoTracking()
                .Where(a => ids.Contains(a.IdUsuario))
                .ToListAsync();

            return activaciones
                .GroupBy(a => a.IdUsuario)
                .ToDictionary(
                    grupo => grupo.Key,
                    grupo => grupo.OrderByDescending(a => a.FechaCreacion).First());
        }

        private async Task<ActivacionUsuario?> ObtenerUltimaActivacionAsync(int? idUsuario)
        {
            if (!idUsuario.HasValue)
            {
                return null;
            }

            return await _contexto.ActivacionesUsuario
                .AsNoTracking()
                .Where(a => a.IdUsuario == idUsuario.Value)
                .OrderByDescending(a => a.FechaCreacion)
                .FirstOrDefaultAsync();
        }

        private static ActivacionUsuario? ObtenerActivacion(IReadOnlyDictionary<int, ActivacionUsuario> ultimas, int? idUsuario)
        {
            if (!idUsuario.HasValue)
            {
                return null;
            }

            return ultimas.TryGetValue(idUsuario.Value, out var activacion) ? activacion : null;
        }

        private static DatosPasajeroNormalizados NormalizarDatos(
            int idEmpresa,
            int? idUsuario,
            string nombre,
            string rut,
            string telefono,
            string direccion)
        {
            return new DatosPasajeroNormalizados(
                idEmpresa,
                idUsuario,
                RequerirTexto(nombre, "El nombre es obligatorio."),
                NormalizarRut(rut),
                NormalizarTelefono(telefono),
                RequerirTexto(direccion, "La dirección es obligatoria."));
        }

        private static string NormalizarRut(string? valor)
        {
            var texto = valor?.Trim() ?? string.Empty;
            if (texto.Length == 0)
            {
                throw new ExcepcionNegocio("El RUT es obligatorio.");
            }

            if (!RutChileno.TryNormalizar(texto, out var rutNormalizado))
            {
                throw new ExcepcionNegocio(RutChileno.MensajeInvalido);
            }

            return rutNormalizado;
        }

        private static string NormalizarTelefono(string? valor)
        {
            if (!TelefonoChileno.TryNormalizar(valor, out var telefono))
            {
                throw new ExcepcionNegocio(TelefonoChileno.MensajeInvalido);
            }

            return telefono;
        }

        private static string? NormalizarEmailOpcional(string? valor)
        {
            if (!EmailContacto.TryNormalizarOpcional(valor, out var email))
            {
                throw new ExcepcionNegocio(EmailContacto.MensajeInvalido);
            }

            return email;
        }

        private static string RequerirTexto(string? valor, string mensaje)
        {
            var texto = valor?.Trim() ?? string.Empty;

            if (texto.Length == 0)
            {
                throw new ExcepcionNegocio(mensaje);
            }

            return texto;
        }

        private static PasajeroRespuestaDto Mapear(
            Pasajero pasajero,
            Usuario? usuario,
            ActivacionUsuario? activacion)
        {
            return new PasajeroRespuestaDto
            {
                IdPasajero = pasajero.IdPasajero,
                IdEmpresa = pasajero.IdEmpresa,
                IdUsuario = pasajero.IdUsuario,
                Nombre = pasajero.Nombre,
                Rut = pasajero.Rut,
                Telefono = pasajero.Telefono,
                Email = usuario?.Email,
                Direccion = pasajero.Direccion,
                Estado = pasajero.Estado,
                EstadoAcceso = ResolverEstadoAcceso(usuario, activacion)
            };
        }

        private static EstadoAccesoPasajero ResolverEstadoAcceso(Usuario? usuario, ActivacionUsuario? activacion)
        {
            if (usuario is null)
            {
                return EstadoAccesoPasajero.SIN_CUENTA;
            }

            if (usuario.CuentaActivada)
            {
                return EstadoAccesoPasajero.ACTIVADA;
            }

            return activacion?.Vigente == true
                ? activacion.EstadoEnvio switch
                {
                    EstadoEnvioActivacion.ENVIADA => EstadoAccesoPasajero.ENVIADA,
                    EstadoEnvioActivacion.ERROR => EstadoAccesoPasajero.ERROR,
                    _ => EstadoAccesoPasajero.PENDIENTE
                }
                : EstadoAccesoPasajero.PENDIENTE;
        }

        private sealed record DatosPasajeroNormalizados(
            int IdEmpresa,
            int? IdUsuario,
            string Nombre,
            string Rut,
            string Telefono,
            string Direccion);
    }
}
