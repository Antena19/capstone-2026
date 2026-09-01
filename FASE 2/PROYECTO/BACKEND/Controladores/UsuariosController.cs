using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Usuarios;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de cuentas. Exclusivo del rol ADMINISTRADOR en el backend.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// </summary>
    [ApiController]
    [Route("api/usuarios")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class UsuariosController : ControllerBase
    {
        private readonly IServicioUsuarios _servicioUsuarios;

        public UsuariosController(IServicioUsuarios servicioUsuarios)
        {
            _servicioUsuarios = servicioUsuarios;
        }

        /// <summary>
        /// Crea una cuenta. La contraseña recibida se hashea de inmediato y no se almacena en texto plano.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<UsuarioRespuestaDto>> Crear([FromBody] CrearUsuarioSolicitudDto solicitud)
        {
            var usuario = await _servicioUsuarios.CrearAsync(solicitud);
            return StatusCode(StatusCodes.Status201Created, usuario);
        }

        /// <summary>
        /// Activa o inactiva una cuenta existente.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<UsuarioRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoUsuarioSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var usuario = await _servicioUsuarios.CambiarEstadoAsync(id, idAdministrador, solicitud);
            return Ok(usuario);
        }

        /// <summary>
        /// Restablece la contraseña de una cuenta. El valor recibido se convierte a hash antes de guardarse.
        /// </summary>
        [HttpPost("{id:int}/restablecer-password")]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<MensajeRespuestaDto>> RestablecerPassword(
            int id,
            [FromBody] RestablecerPasswordSolicitudDto solicitud)
        {
            await _servicioUsuarios.RestablecerPasswordAsync(id, solicitud);

            return Ok(new MensajeRespuestaDto
            {
                Mensaje = "La contraseña se restableció correctamente."
            });
        }
    }
}
