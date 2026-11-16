using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Conductores;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioConductores
    {
        Task<IReadOnlyList<ConductorRespuestaDto>> ListarAsync(EstadoRegistro? estado);

        Task<ConductorRespuestaDto> ObtenerPorIdAsync(int idConductor);

        Task<ConductorRespuestaDto> CrearAsync(CrearConductorSolicitudDto solicitud, int idAdministrador);

        Task<ConductorConCuentaRespuestaDto> CrearConCuentaAsync(
            CrearConductorConCuentaSolicitudDto solicitud,
            int idAdministrador);

        Task<ConductorRespuestaDto> EditarAsync(int idConductor, EditarConductorSolicitudDto solicitud, int idAdministrador);

        Task<ConductorRespuestaDto> CambiarEstadoAsync(int idConductor, CambiarEstadoConductorSolicitudDto solicitud, int idAdministrador);
    }

    /// <summary>
    /// Gestión de conductores reservada al rol ADMINISTRADOR.
    /// No elimina físicamente registros: solo activa o inactiva.
    /// El alta administrativa con cuenta usa una transacción Usuario + Conductor.
    /// POST /api/conductores sigue asociando un id_usuario CONDUCTOR ya existente.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioConductores : IServicioConductores
    {
        private const string MensajeRutDuplicado = "Ya existe un conductor con el RUT indicado.";
        private const string MensajeUsuarioAsociado = "El usuario indicado ya está asociado a otro conductor.";
        private const string MensajeConflicto = "No fue posible guardar el conductor con los datos indicados.";
        private const string MensajeConflictoCuenta = "No fue posible crear la cuenta con los datos indicados.";

        private readonly TransporteContext _contexto;
        private readonly IServicioHashPassword _hashPassword;
        private readonly ILogger<ServicioConductores> _logger;

        public ServicioConductores(
            TransporteContext contexto,
            IServicioHashPassword hashPassword,
            ILogger<ServicioConductores> logger)
        {
            _contexto = contexto;
            _hashPassword = hashPassword;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ConductorRespuestaDto>> ListarAsync(EstadoRegistro? estado)
        {
            var consulta = _contexto.Conductores.AsNoTracking();

            if (estado.HasValue)
            {
                consulta = consulta.Where(c => c.Estado == estado.Value);
            }

            var conductores = await consulta
                .OrderBy(c => c.IdConductor)
                .ToListAsync();

            return conductores.Select(Mapear).ToList();
        }

        public async Task<ConductorRespuestaDto> ObtenerPorIdAsync(int idConductor)
        {
            var conductor = await _contexto.Conductores
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdConductor == idConductor);

            if (conductor is null)
            {
                throw new ExcepcionNegocio("El conductor no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(conductor);
        }

        public async Task<ConductorRespuestaDto> CrearAsync(CrearConductorSolicitudDto solicitud, int idAdministrador)
        {
            var datos = NormalizarDatos(
                solicitud.IdUsuario,
                solicitud.Nombre,
                solicitud.Rut,
                solicitud.Telefono);

            await AsegurarRutDisponibleAsync(datos.Rut);
            await AsegurarUsuarioAsociableAsync(datos.IdUsuario);

            var conductor = new Conductor
            {
                IdUsuario = datos.IdUsuario,
                Nombre = datos.Nombre,
                Rut = datos.Rut,
                Telefono = datos.Telefono,
                Estado = EstadoRegistro.ACTIVO
            };

            _contexto.Conductores.Add(conductor);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeConflicto, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el conductor {IdConductor}.",
                idAdministrador,
                conductor.IdConductor);

            return Mapear(conductor);
        }

        public async Task<ConductorConCuentaRespuestaDto> CrearConCuentaAsync(
            CrearConductorConCuentaSolicitudDto solicitud,
            int idAdministrador)
        {
            var nombre = RequerirTexto(solicitud.Nombre, "El nombre es obligatorio.");
            var rut = NormalizarRut(solicitud.Rut);
            var telefono = RequerirTexto(solicitud.Telefono, "El teléfono es obligatorio.");
            var email = NormalizarEmail(solicitud.Email);

            var rolConductor = await _contexto.Roles
                .FirstOrDefaultAsync(r =>
                    r.Nombre == NombresRol.Conductor
                    && r.Estado == EstadoRegistro.ACTIVO);

            if (rolConductor is null)
            {
                throw new ExcepcionNegocio("El rol CONDUCTOR no existe o no se encuentra activo.");
            }

            var passwordTemporal = GeneradorPasswordTemporal.Generar();
            var passwordHash = _hashPassword.GenerarHash(passwordTemporal);

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                await AsegurarRutDisponibleAsync(rut);

                if (await _contexto.Usuarios.AnyAsync(u => u.Email == email))
                {
                    throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
                }

                var usuario = new Usuario
                {
                    Email = email,
                    PasswordHash = passwordHash,
                    DebeCambiarPassword = true,
                    CuentaActivada = true,
                    IdRol = rolConductor.IdRol,
                    Estado = EstadoRegistro.ACTIVO,
                    FechaCreacion = DateTime.UtcNow
                };

                _contexto.Usuarios.Add(usuario);
                await _contexto.SaveChangesAsync();

                var conductor = new Conductor
                {
                    IdUsuario = usuario.IdUsuario,
                    Nombre = nombre,
                    Rut = rut,
                    Telefono = telefono,
                    Estado = EstadoRegistro.ACTIVO
                };

                _contexto.Conductores.Add(conductor);
                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();

                _logger.LogInformation(
                    "El administrador {IdAdministrador} creó el conductor {IdConductor} con la cuenta {IdUsuario}.",
                    idAdministrador,
                    conductor.IdConductor,
                    usuario.IdUsuario);

                return new ConductorConCuentaRespuestaDto
                {
                    IdConductor = conductor.IdConductor,
                    IdUsuario = usuario.IdUsuario,
                    Nombre = conductor.Nombre,
                    Rut = conductor.Rut,
                    Telefono = conductor.Telefono,
                    Email = usuario.Email,
                    Estado = conductor.Estado,
                    PasswordTemporal = passwordTemporal
                };
            }
            catch (DbUpdateException ex)
            {
                await transaccion.RollbackAsync();
                throw MapearConflictoAlta(ex);
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }
        }

        public async Task<ConductorRespuestaDto> EditarAsync(
            int idConductor,
            EditarConductorSolicitudDto solicitud,
            int idAdministrador)
        {
            var conductor = await ObtenerConductorAsync(idConductor);

            var datos = NormalizarDatos(
                solicitud.IdUsuario,
                solicitud.Nombre,
                solicitud.Rut,
                solicitud.Telefono);

            await AsegurarRutDisponibleAsync(datos.Rut, idConductor);

            if (conductor.IdUsuario != datos.IdUsuario)
            {
                await AsegurarUsuarioAsociableAsync(datos.IdUsuario, idConductor);
            }

            conductor.IdUsuario = datos.IdUsuario;
            conductor.Nombre = datos.Nombre;
            conductor.Rut = datos.Rut;
            conductor.Telefono = datos.Telefono;

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeConflicto, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el conductor {IdConductor}.",
                idAdministrador,
                idConductor);

            return Mapear(conductor);
        }

        public async Task<ConductorRespuestaDto> CambiarEstadoAsync(
            int idConductor,
            CambiarEstadoConductorSolicitudDto solicitud,
            int idAdministrador)
        {
            var conductor = await ObtenerConductorAsync(idConductor);

            conductor.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del conductor {IdConductor} a {Estado}.",
                idAdministrador,
                idConductor,
                solicitud.Estado);

            return Mapear(conductor);
        }

        private async Task<Conductor> ObtenerConductorAsync(int idConductor)
        {
            var conductor = await _contexto.Conductores
                .FirstOrDefaultAsync(c => c.IdConductor == idConductor);

            if (conductor is null)
            {
                throw new ExcepcionNegocio("El conductor no existe.", StatusCodes.Status404NotFound);
            }

            return conductor;
        }

        private async Task AsegurarRutDisponibleAsync(string rut, int? idConductorExcluido = null)
        {
            var consulta = _contexto.Conductores.Where(c => c.Rut == rut);

            if (idConductorExcluido.HasValue)
            {
                consulta = consulta.Where(c => c.IdConductor != idConductorExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarUsuarioAsociableAsync(int idUsuario, int? idConductorExcluido = null)
        {
            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario);

            if (usuario is null)
            {
                throw new ExcepcionNegocio("El usuario indicado no existe.");
            }

            if (!string.Equals(usuario.Rol.Nombre, NombresRol.Conductor, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio("El usuario indicado debe tener rol CONDUCTOR.");
            }

            var consulta = _contexto.Conductores.Where(c => c.IdUsuario == idUsuario);

            if (idConductorExcluido.HasValue)
            {
                consulta = consulta.Where(c => c.IdConductor != idConductorExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeUsuarioAsociado, StatusCodes.Status409Conflict);
            }
        }

        private static DatosConductorNormalizados NormalizarDatos(
            int idUsuario,
            string nombre,
            string rut,
            string telefono)
        {
            return new DatosConductorNormalizados(
                idUsuario,
                RequerirTexto(nombre, "El nombre es obligatorio."),
                NormalizarRut(rut),
                RequerirTexto(telefono, "El teléfono es obligatorio."));
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

        private static string RequerirTexto(string? valor, string mensaje)
        {
            var texto = valor?.Trim() ?? string.Empty;

            if (texto.Length == 0)
            {
                throw new ExcepcionNegocio(mensaje);
            }

            return texto;
        }

        private static string NormalizarEmail(string? valor)
        {
            var email = valor?.Trim().ToLowerInvariant() ?? string.Empty;
            if (email.Length == 0)
            {
                throw new ExcepcionNegocio("El correo electrónico es obligatorio.");
            }

            return email;
        }

        private static ExcepcionNegocio MapearConflictoAlta(DbUpdateException ex)
        {
            var detalle = ex.InnerException?.Message ?? ex.Message;
            if (detalle.Contains("uk_conductor_rut", StringComparison.OrdinalIgnoreCase))
            {
                return new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }

            return new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
        }

        private static ConductorRespuestaDto Mapear(Conductor conductor)
        {
            return new ConductorRespuestaDto
            {
                IdConductor = conductor.IdConductor,
                IdUsuario = conductor.IdUsuario,
                Nombre = conductor.Nombre,
                Rut = conductor.Rut,
                Telefono = conductor.Telefono,
                Estado = conductor.Estado
            };
        }

        private sealed record DatosConductorNormalizados(
            int IdUsuario,
            string Nombre,
            string Rut,
            string Telefono);
    }
}
