using BACKEND.DTOs.Dashboard;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioDashboard
    {
        Task<DashboardResumenDto> ObtenerResumenAsync(int? idEmpresa, DateOnly? desde, DateOnly? hasta);

        Task<DashboardEvolucionRespuestaDto> ObtenerEvolucionAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta,
            AgrupacionEvolucion? agrupacion);

        Task<IReadOnlyList<DashboardEmpresaDto>> ListarEmpresasAsync(DateOnly? desde, DateOnly? hasta);
    }

    /// <summary>
    /// Dashboard operacional del ADMINISTRADOR. Delega el cálculo a <see cref="IServicioMetricasOperacionales"/>.
    /// Sin fechas, el rango por defecto es el día actual (UTC).
    /// </summary>
    public class ServicioDashboard : IServicioDashboard
    {
        private readonly IServicioMetricasOperacionales _metricas;

        public ServicioDashboard(IServicioMetricasOperacionales metricas)
        {
            _metricas = metricas;
        }

        public async Task<DashboardResumenDto> ObtenerResumenAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta)
        {
            var rango = _metricas.ResolverRango(desde, hasta);
            var snapshot = await _metricas.CargarAsync(rango.Desde, rango.Hasta, idEmpresa);
            var kpis = _metricas.CalcularKpis(snapshot);
            return MapearResumen(rango.Desde, rango.Hasta, idEmpresa, kpis);
        }

        public async Task<DashboardEvolucionRespuestaDto> ObtenerEvolucionAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta,
            AgrupacionEvolucion? agrupacion)
        {
            var rango = _metricas.ResolverRango(desde, hasta);
            var agrupacionEfectiva = _metricas.ResolverAgrupacion(agrupacion, rango.Desde, rango.Hasta);
            var snapshot = await _metricas.CargarAsync(rango.Desde, rango.Hasta, idEmpresa);

            return new DashboardEvolucionRespuestaDto
            {
                Desde = rango.Desde,
                Hasta = rango.Hasta,
                Agrupacion = agrupacionEfectiva,
                Series = _metricas.CalcularEvolucion(snapshot, agrupacionEfectiva)
            };
        }

        public async Task<IReadOnlyList<DashboardEmpresaDto>> ListarEmpresasAsync(
            DateOnly? desde,
            DateOnly? hasta)
        {
            var rango = _metricas.ResolverRango(desde, hasta);
            var snapshot = await _metricas.CargarAsync(rango.Desde, rango.Hasta, null);
            var empresas = await _metricas.ListarEmpresasAsync();
            return _metricas.CalcularPorEmpresa(snapshot, empresas);
        }

        internal static DashboardResumenDto MapearResumen(
            DateOnly desde,
            DateOnly hasta,
            int? idEmpresa,
            KpisOperacionales kpis)
        {
            return new DashboardResumenDto
            {
                Desde = desde,
                Hasta = hasta,
                IdEmpresa = idEmpresa,
                ServiciosPlanificados = kpis.ServiciosPlanificados,
                ServiciosRealizados = kpis.ServiciosRealizados,
                ServiciosProgramados = kpis.ServiciosProgramados,
                ServiciosEnCurso = kpis.ServiciosEnCurso,
                ServiciosCancelados = kpis.ServiciosCancelados,
                PorcentajeServiciosRealizados = kpis.PorcentajeServiciosRealizados,
                PersonasPlanificadas = kpis.PersonasPlanificadas,
                PlanificadosTransportados = kpis.PlanificadosTransportados,
                PlanificadosNoTransportados = kpis.PlanificadosNoTransportados,
                NoPlanificadosTransportados = kpis.NoPlanificadosTransportados,
                TotalTransportados = kpis.TotalTransportados,
                PorcentajePlanificadosTransportados = kpis.PorcentajePlanificadosTransportados
            };
        }
    }
}
