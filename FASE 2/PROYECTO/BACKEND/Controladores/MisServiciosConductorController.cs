using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Mobile.Conductor;
using BACKEND.DTOs.QR;
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
    /// Operación Mobile del conductor autenticado: consulta de sus servicios, ruta y pasajeros,
    /// más generación de QR, inicio y fin. No modifica asistencias ni planificación.
    /// </summary>
    [ApiController]
    [Route("api/mis-servicios")]
    [Authorize(Roles = NombresRol.Conductor)]
    public class MisServiciosConductorController : ControllerBase
    {
        private readonly IServicioQr _servicioQr;
        private readonly IServicioServicios _servicioServicios;
        private readonly IServicioOperacionConductor _servicioOperacionConductor;

        public MisServiciosConductorController(
            IServicioQr servicioQr,
            IServicioServicios servicioServicios,
            IServicioOperacionConductor servicioOperacionConductor)
        {
            _servicioQr = servicioQr;
            _servicioServicios = servicioServicios;
            _servicioOperacionConductor = servicioOperacionConductor;
        }

        /// <summary>
        /// Lista los servicios con asignación ACTIVA del conductor autenticado.
        /// </summary>
        [HttpGet("conductor")]
        [ProducesResponseType(typeof(IReadOnlyList<ServicioConductorResumenDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<ServicioConductorResumenDto>>> Listar(
            [FromQuery] DateOnly? fecha,
            [FromQuery] EstadoServicio? estado,
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var servicios = await _servicioOperacionConductor.ListarMisServiciosAsync(
                idUsuario,
                fecha,
                estado,
                desde,
                hasta);
            return Ok(servicios);
        }

        /// <summary>
        /// Detalle operacional de un servicio asignado al conductor autenticado.
        /// </summary>
        [HttpGet("{idServicio:int}/detalle")]
        [ProducesResponseType(typeof(ServicioConductorDetalleDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ServicioConductorDetalleDto>> ObtenerDetalle(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var detalle = await _servicioOperacionConductor.ObtenerDetalleAsync(idServicio, idUsuario);
            return Ok(detalle);
        }

        /// <summary>
        /// Ruta GeoJSON del servicio para dibujar el mapa en Mobile.
        /// </summary>
        [HttpGet("{idServicio:int}/ruta")]
        [ProducesResponseType(typeof(RutaServicioConductorDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<RutaServicioConductorDto>> ObtenerRuta(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var ruta = await _servicioOperacionConductor.ObtenerRutaAsync(idServicio, idUsuario);
            return Ok(ruta);
        }

        /// <summary>
        /// Pasajeros planificados y no planificados detectados por asistencia. Solo consulta.
        /// </summary>
        [HttpGet("{idServicio:int}/pasajeros")]
        [ProducesResponseType(typeof(IReadOnlyList<PasajeroServicioConductorDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<IReadOnlyList<PasajeroServicioConductorDto>>> ListarPasajeros(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var pasajeros = await _servicioOperacionConductor.ListarPasajerosAsync(idServicio, idUsuario);
            return Ok(pasajeros);
        }

        /// <summary>
        /// Genera el QR operativo del servicio asignado al conductor autenticado.
        /// </summary>
        [HttpPost("{idServicio:int}/qr")]
        [ProducesResponseType(typeof(GenerarQrRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<GenerarQrRespuestaDto>> GenerarQr(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var qr = await _servicioQr.GenerarComoConductorAsync(idServicio, idUsuario);
            return Created($"api/mis-servicios/{idServicio}/qr", qr);
        }

        /// <summary>
        /// Inicia el servicio asignado: PROGRAMADO → EN_CURSO y resuelve asistencias provisionales.
        /// </summary>
        [HttpPut("{idServicio:int}/iniciar")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ServicioRespuestaDto>> Iniciar(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.IniciarComoConductorAsync(idServicio, idUsuario);
            return Ok(servicio);
        }

        /// <summary>
        /// Finaliza el servicio asignado: EN_CURSO → FINALIZADO.
        /// </summary>
        [HttpPut("{idServicio:int}/finalizar")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ServicioRespuestaDto>> Finalizar(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.FinalizarComoConductorAsync(idServicio, idUsuario);
            return Ok(servicio);
        }
    }
}
