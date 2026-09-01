using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Usuarios;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioUsuarios
    {
        Task<UsuarioRespuestaDto> CrearAsync(CrearUsuarioSolicitudDto solicitud);

        Task<UsuarioRespuestaDto> CambiarEstadoAsync(int idUsuario, int idAdministrador, CambiarEstadoUsuarioSolicitudDto solicitud);

        Task RestablecerPasswordAsync(int idUsuario, RestablecerPasswordSolicitudDto solicitud);
    }

    /// <summary>
    /// Gestión de cuentas reservada al rol ADMINISTRADOR.
    /// Los pasajeros y conductores no crean sus propias cuentas.
    /// </summary>
    public class ServicioUsuarios : IServicioUsuarios
    {
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

        public async Task<UsuarioRespuestaDto> CrearAsync(CrearUsuarioSolicitudDto solicitud)
        {
            if (!ValidadorPassword.CumpleRequisitos(solicitud.Password))
            {
                throw new ExcepcionNegocio(ValidadorPassword.MensajeRequisitos);
            }

            var email = solicitud.Email.Trim().ToLowerInvariant();

            var existe = await _contexto.Usuarios.AnyAsync(u => u.Email == email);
            if (existe)
            {
                throw new ExcepcionNegocio("No fue posible crear la cuenta con los datos indicados.", StatusCodes.Status409Conflict);
            }

            var rol = ValidarRolAsignable(
                await _contexto.Roles.FirstOrDefaultAsync(r => r.IdRol == solicitud.IdRol));

            var usuario = new Usuario
            {
                Email = email,
                PasswordHash = _hashPassword.GenerarHash(solicitud.Password),
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
                throw new ExcepcionNegocio("No fue posible crear la cuenta con los datos indicados.", StatusCodes.Status409Conflict);
            }

            _logger.LogInformation("Se creó la cuenta {IdUsuario} con rol {IdRol}.", usuario.IdUsuario, usuario.IdRol);

            usuario.Rol = rol;
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

            usuario.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del usuario {IdUsuario} a {Estado}.",
                idAdministrador,
                idUsuario,
                solicitud.Estado);

            return Mapear(usuario);
        }

        public async Task RestablecerPasswordAsync(int idUsuario, RestablecerPasswordSolicitudDto solicitud)
        {
            if (!ValidadorPassword.CumpleRequisitos(solicitud.PasswordNueva))
            {
                throw new ExcepcionNegocio(ValidadorPassword.MensajeRequisitos);
            }

            var usuario = await ObtenerUsuarioConRolAsync(idUsuario);

            usuario.PasswordHash = _hashPassword.GenerarHash(solicitud.PasswordNueva);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation("Se restableció la contraseña del usuario {IdUsuario}.", idUsuario);
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

        private static Rol ValidarRolAsignable(Rol? rol)
        {
            if (rol is null)
            {
                throw new ExcepcionNegocio("El rol indicado no existe.");
            }

            if (rol.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("El rol indicado no se encuentra activo.");
            }

            if (!NombresRol.EsRolPermitido(rol.Nombre))
            {
                throw new ExcepcionNegocio("El rol indicado no está permitido en el sistema.");
            }

            return rol;
        }

        private static UsuarioRespuestaDto Mapear(Usuario usuario)
        {
            return new UsuarioRespuestaDto
            {
                IdUsuario = usuario.IdUsuario,
                Email = usuario.Email,
                IdRol = usuario.IdRol,
                Rol = usuario.Rol.Nombre,
                Estado = usuario.Estado,
                FechaCreacion = usuario.FechaCreacion,
                UltimoAcceso = usuario.UltimoAcceso
            };
        }
    }
}
