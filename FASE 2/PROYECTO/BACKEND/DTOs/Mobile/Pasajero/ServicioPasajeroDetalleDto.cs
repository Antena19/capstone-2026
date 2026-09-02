using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Pasajero
{
    /// <summary>
    /// Detalle del servicio planificado del pasajero autenticado.
    /// </summary>
    public class ServicioPasajeroDetalleDto
    {
        public int IdPasajeroServicio { get; set; }

        public int IdServicio { get; set; }

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public DateTime? FechaHoraInicioReal { get; set; }

        public DateTime? FechaHoraFinReal { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public EstadoServicio Estado { get; set; }

        public EmpresaServicioPasajeroDto Empresa { get; set; } = new();

        public RutaServicioPasajeroResumenDto? Ruta { get; set; }

        public PuntoRecogidaPasajeroDto? PuntoRecogida { get; set; }

        public EstadoConfirmacionViaje EstadoConfirmacion { get; set; }

        public DateTime? FechaConfirmacion { get; set; }

        public AsistenciaPasajeroDto Asistencia { get; set; } = new();

        public VehiculoServicioPasajeroDto? Vehiculo { get; set; }
    }

    public class EmpresaServicioPasajeroDto
    {
        public int IdEmpresa { get; set; }

        public string RazonSocial { get; set; } = string.Empty;
    }

    public class RutaServicioPasajeroResumenDto
    {
        public string IdRuta { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;

        public string Sector { get; set; } = string.Empty;

        public double DistanciaEstimadaKm { get; set; }

        public int DuracionEstimadaMin { get; set; }
    }

    public class VehiculoServicioPasajeroDto
    {
        public string Patente { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty;

        public string Marca { get; set; } = string.Empty;

        public string Modelo { get; set; } = string.Empty;
    }
}
