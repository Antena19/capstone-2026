using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Conductor
{
    /// <summary>
    /// Distingue pasajeros de la planificación y los detectados por asistencia no planificada.
    /// </summary>
    public enum TipoParticipacionConductor
    {
        PLANIFICADO,
        NO_PLANIFICADO
    }

    /// <summary>
    /// Consulta operacional de un pasajero en el servicio del conductor.
    /// No incluye RUT, teléfono ni otros datos sensibles.
    /// </summary>
    public class PasajeroServicioConductorDto
    {
        public int IdPasajero { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public TipoParticipacionConductor TipoParticipacion { get; set; }

        public EstadoConfirmacionViaje? EstadoConfirmacion { get; set; }

        public DateTime? FechaConfirmacion { get; set; }

        public EstadoPasajeroServicio? EstadoPasajeroServicio { get; set; }

        public bool TieneAsistencia { get; set; }

        public TipoAsistencia? TipoAsistencia { get; set; }

        public EstadoAsistencia? EstadoAsistencia { get; set; }

        public DateTime? FechaHoraAsistencia { get; set; }

        public string? IdPuntoRecogida { get; set; }

        public string? NombrePuntoRecogida { get; set; }

        public string? ReferenciaPuntoRecogida { get; set; }

        public int? OrdenPuntoRecogida { get; set; }

        public PuntoGeoJsonDto? UbicacionPuntoRecogida { get; set; }
    }
}
