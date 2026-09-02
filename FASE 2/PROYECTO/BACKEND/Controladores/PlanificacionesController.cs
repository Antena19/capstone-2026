using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Planificaciones;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de planificaciones. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// El usuario creador se toma del JWT, nunca del cuerpo de la petición.
    /// </summary>
    [ApiController]
    [Route("api/planificaciones")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class PlanificacionesController : ControllerBase
    {
        private readonly IServicioPlanificaciones _servicioPlanificaciones;

        public PlanificacionesController(IServicioPlanificaciones servicioPlanificaciones)
        {
            _servicioPlanificaciones = servicioPlanificaciones;
        }

        /// <summary>
        /// Lista planificaciones. Permite filtrar por empresa, período y estado.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<PlanificacionRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<PlanificacionRespuestaDto>>> Listar(
            [FromQuery] int? idEmpresa,
            [FromQuery] string? periodo,
            [FromQuery] EstadoPlanificacion? estado)
        {
            var planificaciones = await _servicioPlanificaciones.ListarAsync(idEmpresa, periodo, estado);
            return Ok(planificaciones);
        }

        /// <summary>
        /// Obtiene el detalle de una planificación.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PlanificacionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PlanificacionRespuestaDto>> ObtenerPorId(int id)
        {
            var planificacion = await _servicioPlanificaciones.ObtenerPorIdAsync(id);
            return Ok(planificacion);
        }

        /// <summary>
        /// Crea una planificación en estado BORRADOR. El creador se obtiene del JWT.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(PlanificacionRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PlanificacionRespuestaDto>> Crear(
            [FromBody] CrearPlanificacionSolicitudDto solicitud)
        {
            var idUsuarioCreador = User.ObtenerIdUsuario();
            var planificacion = await _servicioPlanificaciones.CrearAsync(solicitud, idUsuarioCreador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = planificacion.IdPlanificacion }, planificacion);
        }

        /// <summary>
        /// Actualiza empresa y período de una planificación en BORRADOR.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(PlanificacionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PlanificacionRespuestaDto>> Editar(
            int id,
            [FromBody] EditarPlanificacionSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var planificacion = await _servicioPlanificaciones.EditarAsync(id, solicitud, idAdministrador);
            return Ok(planificacion);
        }

        /// <summary>
        /// Cambia el estado de una planificación según las transiciones permitidas.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(PlanificacionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PlanificacionRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoPlanificacionSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var planificacion = await _servicioPlanificaciones.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(planificacion);
        }
    }
}
