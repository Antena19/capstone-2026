using System.Data;
using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Usuarios;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioUsuarios
    {
        Task<UsuarioRespuestaDto> ObtenerPerfilAsync(int idUsuario);

        Task<UsuarioRespuestaDto> EditarPerfilAsync(int idUsuario, EditarUsuarioSolicitudDto solicitud);

        Task<IReadOnlyList<UsuarioRespuestaDto>> ListarAdministradoresAsync(EstadoRegistro? estado);

        Task<UsuarioRespuestaDto> CrearAdministradorAsync(CrearAdministradorSolicitudDto solicitud);

        Task<UsuarioRespuestaDto> EditarAdministradorAsync(int idUsuario, EditarUsuarioSolicitudDto solicitud);

        Task<UsuarioRespuestaDto> CambiarEstadoAsync(int idUsuario, int idAdministrador, CambiarEstadoUsuarioSolicitudDto solicitud);

        Task<RestablecerPasswordRespuestaDto> RestablecerPasswordAsync(int idUsuario);
    }

    /// <summary>
    /// Gestión de cuentas ADMINISTRADOR y del perfil del usuario autenticado.
    /// Los pasajeros y conductores se crean por sus propios servicios, no por este.
    /// </summary>
    public class ServicioUsuarios : IServicioUsuarios
    {
        private const string MensajeConflictoCuenta = "No fue posible crear la cuenta con los datos indicados.";
        private const string MensajeConflictoIdentidad = "No fue posible actualizar la cuenta con los datos indicados.";
        private const string MensajeUltimoAdministrador = "No es posible inactivar al último administrador activo.";
        private const string MensajeNoEsAdministrador = "El usuario indicado no es un administrador.";

        private readonly TransporteContext _contexto;
        private readonly IServicioHashPassword _hashPassword;
        private readonly ILogger<ServicioUsuarios> _logger;

        public ServicioUsuarios(
            TransporteContext contexto,
            IServicioHashPassword hashPassword,
            ILogger<ServicioUsuarios> logger)
        {
            _contexto = contexto;
            _hashPassword = hashPassword;
            _logger = logger;
        }

        public async Task<UsuarioRespuestaDto> ObtenerPerfilAsync(int idUsuario)
        {
            var usuario = await ObtenerUsuarioConRolAsync(idUsuario);
            return Mapear(usuario);
        }

        public async Task<UsuarioRespuestaDto> EditarPerfilAsync(int idUsuario, EditarUsuarioSolicitudDto solicitud)
        {
            var usuario = await ObtenerUsuarioConRolAsync(idUsuario);
            await AplicarIdentidadAsync(usuario, solicitud, MensajeConflictoIdentidad);

            _logger.LogInformation("El usuario {IdUsuario} actualizó su perfil.", idUsuario);

            return Mapear(usuario);
        }

        public async Task<IReadOnlyList<UsuarioRespuestaDto>> ListarAdministradoresAsync(EstadoRegistro? estado)
        {
            var consulta = _contexto.Usuarios
                .AsNoTracking()
                .Include(u => u.Rol)
                .Where(u => u.Rol.Nombre == NombresRol.Administrador);

            if (estado.HasValue)
            {
                consulta = consulta.Where(u => u.Estado == estado.Value);
            }

            var administradores = await consulta
                .OrderBy(u => u.IdUsuario)
                .ToListAsync();

            return administradores.Select(Mapear).ToList();
        }

        public async Task<UsuarioRespuestaDto> CrearAdministradorAsync(CrearAdministradorSolicitudDto solicitud)
        {
            if (!ValidadorPassword.CumpleRequisitos(solicitud.Password))
            {
                throw new ExcepcionNegocio(ValidadorPassword.MensajeRequisitos);
            }

            var email = NormalizarEmailRequerido(solicitud.Email);
            var telefono = NormalizarTelefonoOpcional(solicitud.Telefono);

            await AsegurarEmailDisponibleAsync(email);
            await AsegurarTelefonoDisponibleAsync(telefono);

            var rol = await ResolverRolAdministradorAsync();

            var usuario = new Usuario
            {
                Email = email,
                Telefono = telefono,
                PasswordHash = _hashPassword.GenerarHash(solicitud.Password),
                DebeCambiarPassword = false,
                CuentaActivada = true,
                IdRol = rol.IdRol,
                Estado = EstadoRegistro.ACTIVO,
                FechaCreacion = DateTime.UtcNow
            };

            _contexto.Usuarios.Add(usuario);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation("Se creó la cuenta de administrador {IdUsuario}.", usuario.IdUsuario);

            usuario.Rol = rol;
            return Mapear(usuario);
        }

        public async Task<UsuarioRespuestaDto> EditarAdministradorAsync(int idUsuario, EditarUsuarioSolicitudDto solicitud)
        {
            var usuario = await ObtenerUsuarioConRolAsync(idUsuario);
            AsegurarEsAdministrador(usuario);
            await AplicarIdentidadAsync(usuario, solicitud, MensajeConflictoIdentidad);

            _logger.LogInformation("Se actualizó la cuenta de administrador {IdUsuario}.", idUsuario);

            return Mapear(usuario);
        }

        public async Task<UsuarioRespuestaDto> CambiarEstadoAsync(
            int idUsuario,
            int idAdministrador,
            CambiarEstadoUsuarioSolicitudDto solicitud)
        {
            if (idUsuario == idAdministrador && solicitud.Estado == EstadoRegistro.INACTIVO)
            {
                throw new ExcepcionNegocio("No puede inactivar su propia cuenta.");
            }

            var usuario = await ObtenerUsuarioConRolAsync(idUsuario);
            var inactivarAdministradorActivo = EsAdministrador(usuario)
                && usuario.Estado == EstadoRegistro.ACTIVO
                && solicitud.Estado == EstadoRegistro.INACTIVO;

            if (!inactivarAdministradorActivo)
            {
                usuario.Estado = solicitud.Estado;
                await _contexto.SaveChangesAsync();

                _logger.LogInformation(
                    "El administrador {IdAdministrador} cambió el estado del usuario {IdUsuario} a {Estado}.",
                    idAdministrador,
                    idUsuario,
                    solicitud.Estado);

                return Mapear(usuario);
            }

            await using var transaccion = await _contexto.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                if (await ContarAdministradoresActivosAsync() <= 1)
                {
                    throw new ExcepcionNegocio(MensajeUltimoAdministrador, StatusCodes.Status409Conflict);
                }

                usuario.Estado = solicitud.Estado;
                await _contexto.SaveChangesAsync();

                if (await ContarAdministradoresActivosAsync() < 1)
                {
                    throw new ExcepcionNegocio(MensajeUltimoAdministrador, StatusCodes.Status409Conflict);
                }

                await transaccion.CommitAsync();
            }
            catch (ExcepcionNegocio)
            {
                await transaccion.RollbackAsync();
                throw;
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del usuario {IdUsuario} a {Estado}.",
                idAdministrador,
                idUsuario,
                solicitud.Estado);

            return Mapear(usuario);
        }

        public async Task<RestablecerPasswordRespuestaDto> RestablecerPasswordAsync(int idUsuario)
        {
            var usuario = await ObtenerUsuarioConRolAsync(idUsuario);
            var passwordTemporal = GeneradorPasswordTemporal.Generar();

            usuario.PasswordHash = _hashPassword.GenerarHash(passwordTemporal);
            usuario.DebeCambiarPassword = true;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation("Se restableció la contraseña del usuario {IdUsuario}.", idUsuario);

            return new RestablecerPasswordRespuestaDto
            {
                IdUsuario = usuario.IdUsuario,
                Email = usuario.Email ?? string.Empty,
                PasswordTemporal = passwordTemporal
            };
        }

        private async Task AplicarIdentidadAsync(
            Usuario usuario,
            EditarUsuarioSolicitudDto solicitud,
            string mensajeConflicto)
        {
            var email = NormalizarEmailRequerido(solicitud.Email);
            var telefono = NormalizarTelefonoOpcional(solicitud.Telefono);

            await AsegurarEmailDisponibleAsync(email, usuario.IdUsuario);
            await AsegurarTelefonoDisponibleAsync(telefono, usuario.IdUsuario);

            usuario.Email = email;
            usuario.Telefono = telefono;

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(mensajeConflicto, StatusCodes.Status409Conflict);
            }
        }

        private async Task<Usuario> ObtenerUsuarioConRolAsync(int idUsuario)
        {
            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario);

            if (usuario is null)
            {
                throw new ExcepcionNegocio("El usuario no existe.", StatusCodes.Status404NotFound);
            }

            return usuario;
        }

        private async Task<Rol> ResolverRolAdministradorAsync()
        {
            var rol = await _contexto.Roles.FirstOrDefaultAsync(r =>
                r.Nombre == NombresRol.Administrador
                && r.Estado == EstadoRegistro.ACTIVO);

            if (rol is null)
            {
                throw new ExcepcionNegocio("El rol ADMINISTRADOR no existe o no se encuentra activo.");
            }

            return rol;
        }

        private async Task AsegurarEmailDisponibleAsync(string email, int? idUsuarioExcluido = null)
        {
            var consulta = _contexto.Usuarios.Where(u => u.Email == email);
            if (idUsuarioExcluido.HasValue)
            {
                consulta = consulta.Where(u => u.IdUsuario != idUsuarioExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                var mensaje = idUsuarioExcluido.HasValue ? MensajeConflictoIdentidad : MensajeConflictoCuenta;
                throw new ExcepcionNegocio(mensaje, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarTelefonoDisponibleAsync(string? telefono, int? idUsuarioExcluido = null)
        {
            if (telefono is null)
            {
                return;
            }

            var consulta = _contexto.Usuarios.Where(u => u.Telefono == telefono);
            if (idUsuarioExcluido.HasValue)
            {
                consulta = consulta.Where(u => u.IdUsuario != idUsuarioExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                var mensaje = idUsuarioExcluido.HasValue ? MensajeConflictoIdentidad : MensajeConflictoCuenta;
                throw new ExcepcionNegocio(mensaje, StatusCodes.Status409Conflict);
            }
        }

        private Task<int> ContarAdministradoresActivosAsync()
        {
            return _contexto.Usuarios.CountAsync(u =>
                u.Rol.Nombre == NombresRol.Administrador
                && u.Estado == EstadoRegistro.ACTIVO);
        }

        private static void AsegurarEsAdministrador(Usuario usuario)
        {
            if (!EsAdministrador(usuario))
            {
                throw new ExcepcionNegocio(MensajeNoEsAdministrador);
            }
        }

        private static bool EsAdministrador(Usuario usuario)
        {
            return string.Equals(usuario.Rol.Nombre, NombresRol.Administrador, StringComparison.Ordinal);
        }

        private static string NormalizarEmailRequerido(string? valor)
        {
            if (!EmailContacto.TryNormalizarOpcional(valor, out var email))
            {
                throw new ExcepcionNegocio(EmailContacto.MensajeInvalido);
            }

            if (email is null)
            {
                throw new ExcepcionNegocio("El correo electrónico es obligatorio.");
            }

            return email;
        }

        private static string? NormalizarTelefonoOpcional(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                return null;
            }

            if (!TelefonoChileno.TryNormalizar(valor, out var telefono))
            {
                throw new ExcepcionNegocio(TelefonoChileno.MensajeInvalido);
            }

            return telefono;
        }

        private static UsuarioRespuestaDto Mapear(Usuario usuario)
        {
            return new UsuarioRespuestaDto
            {
                IdUsuario = usuario.IdUsuario,
                Email = usuario.Email ?? string.Empty,
                Telefono = usuario.Telefono,
                IdRol = usuario.IdRol,
                Rol = usuario.Rol.Nombre,
                Estado = usuario.Estado,
                FechaCreacion = usuario.FechaCreacion,
                UltimoAcceso = usuario.UltimoAcceso
            };
        }
    }
}
