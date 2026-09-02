using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Dashboard;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Dashboard operacional PLANIFICADO vs REAL. Exclusivo del rol ADMINISTRADOR.
    /// Sin fechas, el rango por defecto es el día actual (UTC). Las fechas son inclusivas.
    /// </summary>
    [ApiController]
    [Route("api/dashboard")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class DashboardController : ControllerBase
    {
        private readonly IServicioDashboard _servicioDashboard;

        public DashboardController(IServicioDashboard servicioDashboard)
        {
            _servicioDashboard = servicioDashboard;
        }

        /// <summary>
        /// Resumen de KPI operacionales. Filtros opcionales: idEmpresa, desde, hasta.
        /// Si no se envían fechas, se utiliza el día actual (UTC).
        /// </summary>
        [HttpGet("resumen")]
        [ProducesResponseType(typeof(DashboardResumenDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<DashboardResumenDto>> ObtenerResumen(
            [FromQuery] int? idEmpresa,
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta)
        {
            var resumen = await _servicioDashboard.ObtenerResumenAsync(idEmpresa, desde, hasta);
            return Ok(resumen);
        }

        /// <summary>
        /// Serie temporal para gráficos de Angular. agrupacion: DIA o SEMANA.
        /// Si no se envía, se usa DIA cuando el rango tiene 14 días o menos; SEMANA en caso contrario.
        /// </summary>
        [HttpGet("evolucion")]
        [ProducesResponseType(typeof(DashboardEvolucionRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<DashboardEvolucionRespuestaDto>> ObtenerEvolucion(
            [FromQuery] int? idEmpresa,
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta,
            [FromQuery] AgrupacionEvolucion? agrupacion)
        {
            var evolucion = await _servicioDashboard.ObtenerEvolucionAsync(idEmpresa, desde, hasta, agrupacion);
            return Ok(evolucion);
        }

        /// <summary>
        /// Comparativo operacional por empresa en el rango indicado.
        /// </summary>
        [HttpGet("empresas")]
        [ProducesResponseType(typeof(IReadOnlyList<DashboardEmpresaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<DashboardEmpresaDto>>> ListarEmpresas(
            [FromQuery] DateOnly? desde,
            [FromQuery] DateOnly? hasta)
        {
            var empresas = await _servicioDashboard.ListarEmpresasAsync(desde, hasta);
            return Ok(empresas);
        }
    }
}
