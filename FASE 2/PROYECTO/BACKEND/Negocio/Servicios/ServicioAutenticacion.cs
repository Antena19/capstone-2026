using System.Diagnostics.CodeAnalysis;
using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Autenticacion;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioAutenticacion
    {
        Task<LoginRespuestaDto> IniciarSesionAsync(LoginSolicitudDto solicitud);

        Task CambiarPasswordAsync(int idUsuario, CambiarPasswordSolicitudDto solicitud);
    }

    /// <summary>
    /// Autenticación por correo y contraseña, emisión de JWT y cambio de clave del propio usuario.
    /// </summary>
    public class ServicioAutenticacion : IServicioAutenticacion
    {
        private const string MensajeCredencialesInvalidas = "Credenciales inválidas.";

        private readonly TransporteContext _contexto;
        private readonly IServicioHashPassword _hashPassword;
        private readonly IServicioJwt _servicioJwt;
        private readonly ILogger<ServicioAutenticacion> _logger;

        public ServicioAutenticacion(
            TransporteContext contexto,
            IServicioHashPassword hashPassword,
            IServicioJwt servicioJwt,
            ILogger<ServicioAutenticacion> logger)
        {
            _contexto = contexto;
            _hashPassword = hashPassword;
            _servicioJwt = servicioJwt;
            _logger = logger;
        }

        public async Task<LoginRespuestaDto> IniciarSesionAsync(LoginSolicitudDto solicitud)
        {
            var email = NormalizarEmail(solicitud.Email);

            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Email == email);

            // Si no existe, se verifica un hash simulado para no revelar si el correo está registrado.
            if (usuario is null)
            {
                _hashPassword.Verificar(string.Empty, solicitud.Password);
                RechazarLogin();
            }

            if (!_hashPassword.Verificar(usuario.PasswordHash, solicitud.Password))
            {
                RechazarLogin();
            }

            // Usuario o rol inactivo: misma respuesta genérica que credenciales incorrectas.
            if (usuario.Estado != EstadoRegistro.ACTIVO || usuario.Rol.Estado != EstadoRegistro.ACTIVO)
            {
                RechazarLogin();
            }

            usuario.UltimoAcceso = DateTime.UtcNow;
            await _contexto.SaveChangesAsync();

            var (token, expiracion) = _servicioJwt.GenerarToken(usuario);

            _logger.LogInformation("Inicio de sesión correcto para el usuario {IdUsuario}.", usuario.IdUsuario);

            return new LoginRespuestaDto
            {
                Token = token,
                IdUsuario = usuario.IdUsuario,
                Email = usuario.Email,
                Rol = usuario.Rol.Nombre,
                Expiracion = expiracion
            };
        }

        public async Task CambiarPasswordAsync(int idUsuario, CambiarPasswordSolicitudDto solicitud)
        {
            if (solicitud.PasswordActual == solicitud.PasswordNueva)
            {
                throw new ExcepcionNegocio("La nueva contraseña debe ser distinta a la actual.");
            }

            if (!ValidadorPassword.CumpleRequisitos(solicitud.PasswordNueva))
            {
                throw new ExcepcionNegocio(ValidadorPassword.MensajeRequisitos);
            }

            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario);

            if (usuario is null || usuario.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("No se pudo completar la operación.", StatusCodes.Status401Unauthorized);
            }

            if (!_hashPassword.Verificar(usuario.PasswordHash, solicitud.PasswordActual))
            {
                throw new ExcepcionNegocio("La contraseña actual no es válida.");
            }

            usuario.PasswordHash = _hashPassword.GenerarHash(solicitud.PasswordNueva);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation("El usuario {IdUsuario} actualizó su contraseña.", idUsuario);
        }

        private static string NormalizarEmail(string email)
        {
            return email.Trim().ToLowerInvariant();
        }

        [DoesNotReturn]
        private static void RechazarLogin()
        {
            throw new ExcepcionNegocio(MensajeCredencialesInvalidas, StatusCodes.Status401Unauthorized);
        }
    }
}
