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
        private readonly IServicioActivacionCuentas _servicioActivacion;

        public AutenticacionController(
            IServicioAutenticacion servicioAutenticacion,
            IServicioActivacionCuentas servicioActivacion)
        {
            _servicioAutenticacion = servicioAutenticacion;
            _servicioActivacion = servicioActivacion;
        }

        /// <summary>
        /// Valida identificador (correo o teléfono) y contraseña, exige usuario y rol activos,
        /// exige cuenta activada, actualiza ultimo_acceso y emite un JWT.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<LoginRespuestaDto>> Login([FromBody] LoginSolicitudDto solicitud)
        {
            var respuesta = await _servicioAutenticacion.IniciarSesionAsync(solicitud);
            return Ok(respuesta);
        }

        /// <summary>
        /// Activa una cuenta PASAJERO con teléfono, código temporal y nueva contraseña.
        /// No emite JWT: el usuario debe iniciar sesión después.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("activar-cuenta")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ActivarCuenta([FromBody] ActivarCuentaSolicitudDto solicitud)
        {
            await _servicioActivacion.ActivarCuentaAsync(
                solicitud.Telefono,
                solicitud.Codigo,
                solicitud.NuevaPassword);
            return NoContent();
        }

        /// <summary>
        /// Reenvía un código de activación. La respuesta es genérica para no enumerar cuentas.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("reenviar-activacion")]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<MensajeRespuestaDto>> ReenviarActivacion(
            [FromBody] ReenviarActivacionSolicitudDto solicitud)
        {
            await _servicioActivacion.ReenviarPublicoAsync(solicitud.Telefono);
            return Ok(new MensajeRespuestaDto
            {
                Mensaje = ServicioActivacionCuentas.MensajeReenvioPublico
            });
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
