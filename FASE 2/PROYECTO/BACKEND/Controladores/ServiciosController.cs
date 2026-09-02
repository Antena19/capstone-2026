using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Servicios;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de servicios. Exclusivo del rol ADMINISTRADOR.
    /// El conductor inicia y finaliza sus servicios en /api/mis-servicios.
    /// </summary>
    [ApiController]
    [Route("api/servicios")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class ServiciosController : ControllerBase
    {
        private readonly IServicioServicios _servicioServicios;

        public ServiciosController(IServicioServicios servicioServicios)
        {
            _servicioServicios = servicioServicios;
        }

        /// <summary>
        /// Lista servicios. Permite filtrar por empresa, planificación, fecha, estado y tipo.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<ServicioRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<ServicioRespuestaDto>>> Listar(
            [FromQuery] int? idEmpresa,
            [FromQuery] int? idPlanificacion,
            [FromQuery] DateOnly? fecha,
            [FromQuery] EstadoServicio? estado,
            [FromQuery] string? tipoServicio)
        {
            var servicios = await _servicioServicios.ListarAsync(
                idEmpresa,
                idPlanificacion,
                fecha,
                estado,
                tipoServicio);
            return Ok(servicios);
        }

        /// <summary>
        /// Obtiene el detalle de un servicio.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ServicioRespuestaDto>> ObtenerPorId(int id)
        {
            var servicio = await _servicioServicios.ObtenerPorIdAsync(id);
            return Ok(servicio);
        }

        /// <summary>
        /// Crea un servicio en estado PROGRAMADO, sin fechas reales.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ServicioRespuestaDto>> Crear([FromBody] CrearServicioSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = servicio.IdServicio }, servicio);
        }

        /// <summary>
        /// Actualiza la programación de un servicio en estado PROGRAMADO.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ServicioRespuestaDto>> Editar(int id, [FromBody] EditarServicioSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.EditarAsync(id, solicitud, idAdministrador);
            return Ok(servicio);
        }

        /// <summary>
        /// Cambia el estado de un servicio según las transiciones permitidas.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ServicioRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoServicioSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(servicio);
        }
    }
}
