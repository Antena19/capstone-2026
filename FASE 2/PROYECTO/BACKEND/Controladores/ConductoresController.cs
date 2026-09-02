using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Conductores;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de conductores. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// </summary>
    [ApiController]
    [Route("api/conductores")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class ConductoresController : ControllerBase
    {
        private readonly IServicioConductores _servicioConductores;

        public ConductoresController(IServicioConductores servicioConductores)
        {
            _servicioConductores = servicioConductores;
        }

        /// <summary>
        /// Lista conductores. Permite filtrar por estado ACTIVO o INACTIVO.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<ConductorRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<ConductorRespuestaDto>>> Listar([FromQuery] EstadoRegistro? estado)
        {
            var conductores = await _servicioConductores.ListarAsync(estado);
            return Ok(conductores);
        }

        /// <summary>
        /// Obtiene el detalle de un conductor.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(ConductorRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ConductorRespuestaDto>> ObtenerPorId(int id)
        {
            var conductor = await _servicioConductores.ObtenerPorIdAsync(id);
            return Ok(conductor);
        }

        /// <summary>
        /// Crea un conductor con estado ACTIVO. No crea una cuenta de usuario.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ConductorRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ConductorRespuestaDto>> Crear([FromBody] CrearConductorSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var conductor = await _servicioConductores.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = conductor.IdConductor }, conductor);
        }

        /// <summary>
        /// Actualiza los datos de un conductor. El identificador no se modifica.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(ConductorRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ConductorRespuestaDto>> Editar(int id, [FromBody] EditarConductorSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var conductor = await _servicioConductores.EditarAsync(id, solicitud, idAdministrador);
            return Ok(conductor);
        }

        /// <summary>
        /// Activa o inactiva un conductor existente. No elimina el registro.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(ConductorRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ConductorRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoConductorSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var conductor = await _servicioConductores.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(conductor);
        }
    }
}
