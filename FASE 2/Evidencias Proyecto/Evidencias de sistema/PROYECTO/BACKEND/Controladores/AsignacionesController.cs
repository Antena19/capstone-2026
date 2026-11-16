using BACKEND.DTOs.Asignaciones;
using BACKEND.DTOs.Comun;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de asignaciones de conductor y vehículo. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403. Los endpoints móviles del conductor se implementarán aparte.
    /// </summary>
    [ApiController]
    [Route("api/asignaciones")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class AsignacionesController : ControllerBase
    {
        private readonly IServicioAsignaciones _servicioAsignaciones;

        public AsignacionesController(IServicioAsignaciones servicioAsignaciones)
        {
            _servicioAsignaciones = servicioAsignaciones;
        }

        /// <summary>
        /// Lista asignaciones. Permite filtrar por servicio, conductor, vehículo y estado.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<AsignacionRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<AsignacionRespuestaDto>>> Listar(
            [FromQuery] int? idServicio,
            [FromQuery] int? idConductor,
            [FromQuery] int? idVehiculo,
            [FromQuery] EstadoAsignacionServicio? estado)
        {
            var asignaciones = await _servicioAsignaciones.ListarAsync(
                idServicio,
                idConductor,
                idVehiculo,
                estado);
            return Ok(asignaciones);
        }

        /// <summary>
        /// Obtiene el detalle de una asignación.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(AsignacionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsignacionRespuestaDto>> ObtenerPorId(int id)
        {
            var asignacion = await _servicioAsignaciones.ObtenerPorIdAsync(id);
            return Ok(asignacion);
        }

        /// <summary>
        /// Crea una asignación ACTIVA. La fecha de asignación la asigna el backend.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(AsignacionRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsignacionRespuestaDto>> Crear([FromBody] CrearAsignacionSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var asignacion = await _servicioAsignaciones.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = asignacion.IdAsignacion }, asignacion);
        }

        /// <summary>
        /// Reemplaza conductor, vehículo o ambos de forma transaccional y registra el historial.
        /// </summary>
        [HttpPut("{id:int}/reemplazar")]
        [ProducesResponseType(typeof(AsignacionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsignacionRespuestaDto>> Reemplazar(
            int id,
            [FromBody] ReemplazarAsignacionSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var asignacion = await _servicioAsignaciones.ReemplazarAsync(id, solicitud, idAdministrador);
            return Ok(asignacion);
        }

        /// <summary>
        /// Cancela una asignación ACTIVA. No permite reactivar REEMPLAZADA o CANCELADA.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(AsignacionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsignacionRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoAsignacionSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var asignacion = await _servicioAsignaciones.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(asignacion);
        }
    }
}
