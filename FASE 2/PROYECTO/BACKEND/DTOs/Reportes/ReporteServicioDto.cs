using BACKEND.Modelos;

namespace BACKEND.DTOs.Reportes
{
    public class ReporteServicioDto
    {
        public int IdServicio { get; set; }

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public EstadoServicio Estado { get; set; }

        public int IdEmpresa { get; set; }

        public string RazonSocial { get; set; } = string.Empty;

        public string IdRuta { get; set; } = string.Empty;

        public string? NombreRuta { get; set; }

        public string? SectorRuta { get; set; }

        public string? PatenteVehiculo { get; set; }

        public int PersonasPlanificadas { get; set; }

        public int PlanificadosTransportados { get; set; }

        public int PlanificadosNoTransportados { get; set; }

        public int NoPlanificadosTransportados { get; set; }

        public int TotalTransportados { get; set; }
    }

    public class ReporteMensualResumenDto
    {
        public int ServiciosPlanificados { get; set; }

        public int ServiciosRealizados { get; set; }

        public int ServiciosCancelados { get; set; }

        public decimal PorcentajeServiciosRealizados { get; set; }

        public int PersonasPlanificadas { get; set; }

        public int PlanificadosTransportados { get; set; }

        public int PlanificadosNoTransportados { get; set; }

        public int NoPlanificadosTransportados { get; set; }

        public int TotalTransportados { get; set; }

        public decimal PorcentajePlanificadosTransportados { get; set; }
    }

    public class ReporteMensualDto
    {
        public int IdEmpresa { get; set; }

        public string RazonSocial { get; set; } = string.Empty;

        public string Periodo { get; set; } = string.Empty;

        public ReporteMensualResumenDto Resumen { get; set; } = new();

        public IReadOnlyList<ReporteServicioDto> Servicios { get; set; } = Array.Empty<ReporteServicioDto>();
    }

    public class ReportePasajeroServicioDto
    {
        public int IdPasajero { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public bool EstabaPlanificado { get; set; }

        public EstadoConfirmacionViaje? EstadoConfirmacion { get; set; }

        public bool TieneAsistencia { get; set; }

        public TipoAsistencia? TipoAsistencia { get; set; }

        public EstadoAsistencia? EstadoAsistencia { get; set; }

        public DateTime? FechaHoraAsistencia { get; set; }

        public string? IdPuntoRecogida { get; set; }

        public string? NombrePuntoRecogida { get; set; }
    }

    public class ReporteServiciosRangoDto
    {
        public DateOnly Desde { get; set; }

        public DateOnly Hasta { get; set; }

        public int? IdEmpresa { get; set; }

        public string? RazonSocial { get; set; }

        public ReporteMensualResumenDto Resumen { get; set; } = new();

        public IReadOnlyList<ReporteServicioDto> Servicios { get; set; } = Array.Empty<ReporteServicioDto>();
    }

    public class ArchivoExcelDto
    {
        public byte[] Contenido { get; set; } = Array.Empty<byte>();

        public string NombreArchivo { get; set; } = string.Empty;
    }
}
