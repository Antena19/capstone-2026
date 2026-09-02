using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Conductor
{
    /// <summary>
    /// Fila de la lista Mobile de servicios asignados al conductor.
    /// </summary>
    public class ServicioConductorResumenDto
    {
        public int IdServicio { get; set; }

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public EstadoServicio Estado { get; set; }

        public string IdRuta { get; set; } = string.Empty;

        public string? NombreRuta { get; set; }

        public string? SectorRuta { get; set; }

        public int IdVehiculo { get; set; }

        public string PatenteVehiculo { get; set; } = string.Empty;

        public string TipoVehiculo { get; set; } = string.Empty;
    }
}
