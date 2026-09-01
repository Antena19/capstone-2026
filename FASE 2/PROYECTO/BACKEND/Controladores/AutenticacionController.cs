using BACKEND.DTOs.Autenticacion;
using BACKEND.DTOs.Comun;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Inicio de sesión y cambio de contraseña del usuario autenticado.
    /// </summary>
    [ApiController]
    [Route("api/autenticacion")]
    public class AutenticacionController : ControllerBase
    {
        private readonly IServicioAutenticacion _servicioAutenticacion;

        public AutenticacionController(IServicioAutenticacion servicioAutenticacion)
        {
            _servicioAutenticacion = servicioAutenticacion;
        }

        /// <summary>
        /// Valida correo y contraseña, exige usuario y rol activos, actualiza ultimo_acceso y emite un JWT.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<LoginRespuestaDto>> Login([FromBody] LoginSolicitudDto solicitud)
        {
            var respuesta = await _servicioAutenticacion.IniciarSesionAsync(solicitud);
            return Ok(respuesta);
        }

        /// <summary>
        /// Permite al usuario autenticado cambiar su propia contraseña.
        /// El id se toma del JWT para impedir suplantar a otro usuario.
        /// </summary>
        [Authorize]
        [HttpPost("cambiar-password")]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<MensajeRespuestaDto>> CambiarPassword([FromBody] CambiarPasswordSolicitudDto solicitud)
        {
            var idUsuario = User.ObtenerIdUsuario();
            await _servicioAutenticacion.CambiarPasswordAsync(idUsuario, solicitud);

            return Ok(new MensajeRespuestaDto
            {
                Mensaje = "La contraseña se actualizó correctamente."
            });
        }
    }
}
