using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Usuarios;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Perfil del administrador autenticado y gestión de cuentas ADMINISTRADOR.
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
        /// Lista cuentas con rol ADMINISTRADOR. Permite filtrar por estado ACTIVO o INACTIVO.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<UsuarioRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<UsuarioRespuestaDto>>> Listar([FromQuery] EstadoRegistro? estado)
        {
            var administradores = await _servicioUsuarios.ListarAdministradoresAsync(estado);
            return Ok(administradores);
        }

        /// <summary>
        /// Devuelve los datos de la cuenta autenticada. El identificador se toma del JWT.
        /// </summary>
        [HttpGet("me")]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<UsuarioRespuestaDto>> ObtenerPerfil()
        {
            var idUsuario = User.ObtenerIdUsuario();
            var usuario = await _servicioUsuarios.ObtenerPerfilAsync(idUsuario);
            return Ok(usuario);
        }

        /// <summary>
        /// Actualiza el correo y el teléfono de la cuenta autenticada. El identificador se toma del JWT.
        /// </summary>
        [HttpPut("me")]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<UsuarioRespuestaDto>> EditarPerfil([FromBody] EditarUsuarioSolicitudDto solicitud)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var usuario = await _servicioUsuarios.EditarPerfilAsync(idUsuario, solicitud);
            return Ok(usuario);
        }

        /// <summary>
        /// Crea una cuenta ADMINISTRADOR. El rol lo asigna el servidor.
        /// La contraseña recibida se hashea de inmediato y no se almacena en texto plano.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<UsuarioRespuestaDto>> Crear([FromBody] CrearAdministradorSolicitudDto solicitud)
        {
            var usuario = await _servicioUsuarios.CrearAdministradorAsync(solicitud);
            return StatusCode(StatusCodes.Status201Created, usuario);
        }

        /// <summary>
        /// Actualiza el correo y el teléfono de otro administrador. El identificador no se modifica.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<UsuarioRespuestaDto>> Editar(int id, [FromBody] EditarUsuarioSolicitudDto solicitud)
        {
            var usuario = await _servicioUsuarios.EditarAdministradorAsync(id, solicitud);
            return Ok(usuario);
        }

        /// <summary>
        /// Activa o inactiva una cuenta existente.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(UsuarioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
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
        /// Restablece la contraseña con un valor temporal generado en el servidor.
        /// La clave en texto plano se devuelve una sola vez.
        /// </summary>
        [HttpPost("{id:int}/restablecer-password")]
        [ProducesResponseType(typeof(RestablecerPasswordRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<RestablecerPasswordRespuestaDto>> RestablecerPassword(int id)
        {
            var respuesta = await _servicioUsuarios.RestablecerPasswordAsync(id);
            return Ok(respuesta);
        }
    }
}
