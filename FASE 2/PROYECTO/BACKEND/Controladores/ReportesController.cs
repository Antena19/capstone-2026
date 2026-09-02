using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Reportes;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Reportes operacionales y exportación Excel. Exclusivo del rol ADMINISTRADOR.
    /// No incluye precios, tarifas ni facturación.
    /// </summary>
    [ApiController]
    [Route("api/reportes")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class ReportesController : ControllerBase
    {
        private const string TipoExcel =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        private readonly IServicioReportes _servicioReportes;
        private readonly IServicioExportacionExcel _servicioExportacionExcel;

        public ReportesController(
            IServicioReportes servicioReportes,
            IServicioExportacionExcel servicioExportacionExcel)
        {
            _servicioReportes = servicioReportes;
            _servicioExportacionExcel = servicioExportacionExcel;
        }

        /// <summary>
        /// Detalle operacional por servicio. Fechas inclusivas; sin fechas, día actual (UTC).
        /// </summary>
        [HttpGet("servicios")]
        [ProducesResponseType(typeof(IReadOnlyList<ReporteServicioDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<ReporteServicioDto>>> ListarServicios(
            [FromQuery] int? idEmpresa,
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta,
            [FromQuery] EstadoServicio? estado)
        {
            var servicios = await _servicioReportes.ListarServiciosAsync(idEmpresa, desde, hasta, estado);
            return Ok(servicios);
        }

        /// <summary>
        /// Exporta el detalle de servicios del rango a Excel, con la misma lógica que GET /api/reportes/servicios.
        /// </summary>
        [HttpGet("servicios/excel")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> ExportarServiciosExcel(
            [FromQuery] int? idEmpresa,
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta)
        {
            var reporte = await _servicioReportes.ObtenerServiciosRangoAsync(idEmpresa, desde, hasta, null);
            var archivo = _servicioExportacionExcel.GenerarServicios(reporte);
            return File(archivo.Contenido, TipoExcel, archivo.NombreArchivo);
        }

        /// <summary>
        /// Pasajeros de un servicio: planificados ACTIVO y no planificados detectados por asistencia.
        /// </summary>
        [HttpGet("servicios/{idServicio:int}/pasajeros")]
        [ProducesResponseType(typeof(IReadOnlyList<ReportePasajeroServicioDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<ReportePasajeroServicioDto>>> ListarPasajeros(int idServicio)
        {
            var pasajeros = await _servicioReportes.ListarPasajerosServicioAsync(idServicio);
            return Ok(pasajeros);
        }

        /// <summary>
        /// Consolidado operacional mensual por empresa. periodo en formato AAAA-MM.
        /// </summary>
        [HttpGet("mensual")]
        [ProducesResponseType(typeof(ReporteMensualDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ReporteMensualDto>> ObtenerMensual(
            [FromQuery] int idEmpresa,
            [FromQuery] string periodo)
        {
            var reporte = await _servicioReportes.ObtenerMensualAsync(idEmpresa, periodo);
            return Ok(reporte);
        }

        /// <summary>
        /// Exporta el consolidado mensual a Excel con la misma lógica que GET /api/reportes/mensual.
        /// </summary>
        [HttpGet("mensual/excel")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> ExportarMensualExcel(
            [FromQuery] int idEmpresa,
            [FromQuery] string periodo)
        {
            var reporte = await _servicioReportes.ObtenerMensualAsync(idEmpresa, periodo);
            var archivo = _servicioExportacionExcel.GenerarMensual(reporte);
            return File(archivo.Contenido, TipoExcel, archivo.NombreArchivo);
        }
    }
}
