using BACKEND.DTOs.Asistencias;
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
    /// Consulta, regularización y anulación de asistencias. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR no puede crear, modificar ni anular asistencias.
    /// </summary>
    [ApiController]
    [Route("api/asistencias")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class AsistenciasController : ControllerBase
    {
        private readonly IServicioAsistencias _servicioAsistencias;

        public AsistenciasController(IServicioAsistencias servicioAsistencias)
        {
            _servicioAsistencias = servicioAsistencias;
        }

        /// <summary>
        /// Lista asistencias. Permite filtrar por servicio, pasajero, método, tipo, sobrecupo y estado.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<AsistenciaRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<AsistenciaRespuestaDto>>> Listar(
            [FromQuery] int? idServicio,
            [FromQuery] int? idPasajero,
            [FromQuery] MetodoAsistencia? metodo,
            [FromQuery] TipoAsistencia? tipoAsistencia,
            [FromQuery] bool? excedeCapacidad,
            [FromQuery] EstadoAsistencia? estado)
        {
            var registros = await _servicioAsistencias.ListarAsync(
                idServicio,
                idPasajero,
                metodo,
                tipoAsistencia,
                excedeCapacidad,
                estado);
            return Ok(registros);
        }

        /// <summary>
        /// Obtiene el detalle de una asistencia.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(AsistenciaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsistenciaRespuestaDto>> ObtenerPorId(int id)
        {
            var registro = await _servicioAsistencias.ObtenerPorIdAsync(id);
            return Ok(registro);
        }

        /// <summary>
        /// Regularización excepcional de asistencia. El cliente no envía método, tipo, estado ni sobrecupo.
        /// </summary>
        [HttpPost("manual")]
        [ProducesResponseType(typeof(AsistenciaRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsistenciaRespuestaDto>> CrearManual(
            [FromBody] CrearAsistenciaManualSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var registro = await _servicioAsistencias.CrearManualAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = registro.IdAsistencia }, registro);
        }

        /// <summary>
        /// Anula una asistencia VALIDA. No se permite reactivar una ANULADA ni eliminar el registro.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(AsistenciaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<AsistenciaRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoAsistenciaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var registro = await _servicioAsistencias.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(registro);
        }
    }
}
