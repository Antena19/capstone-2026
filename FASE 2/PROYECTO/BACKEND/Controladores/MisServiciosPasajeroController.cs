using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Mobile.Pasajero;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Operación Mobile del pasajero autenticado: consulta de sus servicios, ruta y punto de recogida.
    /// La confirmación permanece en MisServiciosController; el escaneo QR, en EscaneoAsistenciaController.
    /// </summary>
    [ApiController]
    [Route("api/mis-servicios/pasajero")]
    [Authorize(Roles = NombresRol.Pasajero)]
    public class MisServiciosPasajeroController : ControllerBase
    {
        private readonly IServicioOperacionPasajero _servicioOperacionPasajero;

        public MisServiciosPasajeroController(IServicioOperacionPasajero servicioOperacionPasajero)
        {
            _servicioOperacionPasajero = servicioOperacionPasajero;
        }

        /// <summary>
        /// Lista los servicios planificados (pasajero_servicio ACTIVO) del pasajero autenticado.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<ServicioPasajeroResumenDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<ServicioPasajeroResumenDto>>> Listar(
            [FromQuery] DateOnly? fecha,
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta,
            [FromQuery] EstadoServicio? estadoServicio,
            [FromQuery] EstadoConfirmacionViaje? estadoConfirmacion)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var servicios = await _servicioOperacionPasajero.ListarMisServiciosAsync(
                idUsuario,
                fecha,
                desde,
                hasta,
                estadoServicio,
                estadoConfirmacion);
            return Ok(servicios);
        }

        /// <summary>
        /// Próximo servicio relevante: EN_CURSO si existe; si no, el PROGRAMADO más cercano.
        /// </summary>
        [HttpGet("proximo")]
        [ProducesResponseType(typeof(ProximoServicioPasajeroDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ProximoServicioPasajeroDto>> ObtenerProximo()
        {
            var idUsuario = User.ObtenerIdUsuario();
            var proximo = await _servicioOperacionPasajero.ObtenerProximoAsync(idUsuario);
            if (proximo is null)
            {
                return NoContent();
            }

            return Ok(proximo);
        }

        /// <summary>
        /// Detalle de un servicio planificado del pasajero autenticado.
        /// </summary>
        [HttpGet("{idServicio:int}")]
        [ProducesResponseType(typeof(ServicioPasajeroDetalleDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ServicioPasajeroDetalleDto>> ObtenerDetalle(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var detalle = await _servicioOperacionPasajero.ObtenerDetalleAsync(idServicio, idUsuario);
            return Ok(detalle);
        }

        /// <summary>
        /// Ruta GeoJSON del servicio, con el punto de recogida asignado al pasajero.
        /// </summary>
        [HttpGet("{idServicio:int}/ruta")]
        [ProducesResponseType(typeof(RutaServicioPasajeroDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<RutaServicioPasajeroDto>> ObtenerRuta(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var ruta = await _servicioOperacionPasajero.ObtenerRutaAsync(idServicio, idUsuario);
            return Ok(ruta);
        }
    }
}
