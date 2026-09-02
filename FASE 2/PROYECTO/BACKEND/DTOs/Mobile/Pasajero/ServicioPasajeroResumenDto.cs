using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Pasajero
{
    /// <summary>
    /// Fila de la lista Mobile de servicios planificados del pasajero.
    /// </summary>
    public class ServicioPasajeroResumenDto
    {
        public int IdPasajeroServicio { get; set; }

        public int IdServicio { get; set; }

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public EstadoServicio EstadoServicio { get; set; }

        public EstadoConfirmacionViaje EstadoConfirmacion { get; set; }

        public DateTime? FechaConfirmacion { get; set; }

        public string IdRuta { get; set; } = string.Empty;

        public string? NombreRuta { get; set; }

        public string? SectorRuta { get; set; }

        public string? IdPuntoRecogida { get; set; }

        public string? NombrePuntoRecogida { get; set; }

        public string? ReferenciaPuntoRecogida { get; set; }

        public int? OrdenPuntoRecogida { get; set; }

        public PuntoGeoJsonDto? UbicacionPuntoRecogida { get; set; }

        public bool TieneAsistencia { get; set; }

        public TipoAsistencia? TipoAsistencia { get; set; }

        public EstadoAsistencia? EstadoAsistencia { get; set; }

        public DateTime? FechaHoraAsistencia { get; set; }
    }
}
