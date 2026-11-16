using BACKEND.Modelos;

namespace BACKEND.DTOs.Dashboard
{
    public enum AgrupacionEvolucion
    {
        DIA,
        SEMANA
    }

    public class DashboardResumenDto
    {
        public DateOnly Desde { get; set; }

        public DateOnly Hasta { get; set; }

        public int? IdEmpresa { get; set; }

        public int ServiciosPlanificados { get; set; }

        public int ServiciosRealizados { get; set; }

        public int ServiciosProgramados { get; set; }

        public int ServiciosEnCurso { get; set; }

        public int ServiciosCancelados { get; set; }

        public decimal PorcentajeServiciosRealizados { get; set; }

        public int PersonasPlanificadas { get; set; }

        public int PlanificadosTransportados { get; set; }

        public int PlanificadosNoTransportados { get; set; }

        public int NoPlanificadosTransportados { get; set; }

        public int TotalTransportados { get; set; }

        public decimal PorcentajePlanificadosTransportados { get; set; }
    }

    public class DashboardEvolucionRespuestaDto
    {
        public DateOnly Desde { get; set; }

        public DateOnly Hasta { get; set; }

        public AgrupacionEvolucion Agrupacion { get; set; }

        public IReadOnlyList<DashboardEvolucionDto> Series { get; set; } = Array.Empty<DashboardEvolucionDto>();
    }

    public class DashboardEvolucionDto
    {
        public string Periodo { get; set; } = string.Empty;

        public int ServiciosPlanificados { get; set; }

        public int ServiciosRealizados { get; set; }

        public int PersonasPlanificadas { get; set; }

        public int PlanificadosTransportados { get; set; }

        public int NoPlanificadosTransportados { get; set; }

        public int TotalTransportados { get; set; }
    }

    public class DashboardEmpresaDto
    {
        public int IdEmpresa { get; set; }

        public string RazonSocial { get; set; } = string.Empty;

        public int ServiciosPlanificados { get; set; }

        public int ServiciosRealizados { get; set; }

        public decimal PorcentajeServiciosRealizados { get; set; }

        public int PersonasPlanificadas { get; set; }

        public int PlanificadosTransportados { get; set; }

        public int NoPlanificadosTransportados { get; set; }

        public int TotalTransportados { get; set; }

        public decimal PorcentajePlanificadosTransportados { get; set; }
    }
}
