using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Conductor
{
    /// <summary>
    /// Detalle operacional de un servicio asignado al conductor autenticado.
    /// </summary>
    public class ServicioConductorDetalleDto
    {
        public int IdServicio { get; set; }

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public DateTime? FechaHoraInicioReal { get; set; }

        public DateTime? FechaHoraFinReal { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public EstadoServicio Estado { get; set; }

        public EmpresaServicioConductorDto Empresa { get; set; } = new();

        public VehiculoServicioConductorDto Vehiculo { get; set; } = new();

        public RutaServicioConductorResumenDto? Ruta { get; set; }

        public ResumenPasajerosServicioDto ResumenPasajeros { get; set; } = new();
    }

    public class EmpresaServicioConductorDto
    {
        public int IdEmpresa { get; set; }

        public string RazonSocial { get; set; } = string.Empty;
    }

    public class VehiculoServicioConductorDto
    {
        public int IdVehiculo { get; set; }

        public string Patente { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty;

        public string Marca { get; set; } = string.Empty;

        public string Modelo { get; set; } = string.Empty;

        public int Capacidad { get; set; }
    }

    public class RutaServicioConductorResumenDto
    {
        public string IdRuta { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;

        public string Sector { get; set; } = string.Empty;

        public double DistanciaEstimadaKm { get; set; }

        public int DuracionEstimadaMin { get; set; }
    }
}
