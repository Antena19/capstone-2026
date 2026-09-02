using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Pasajero
{
    /// <summary>
    /// Próximo servicio relevante para la pantalla de inicio del pasajero.
    /// </summary>
    public class ProximoServicioPasajeroDto
    {
        public int IdPasajeroServicio { get; set; }

        public int IdServicio { get; set; }

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public EstadoServicio EstadoServicio { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public string? NombreRuta { get; set; }

        public string? SectorRuta { get; set; }

        public PuntoRecogidaPasajeroDto? PuntoRecogida { get; set; }

        public EstadoConfirmacionViaje EstadoConfirmacion { get; set; }

        public bool TieneAsistencia { get; set; }

        public EstadoAsistencia? EstadoAsistencia { get; set; }
    }
}
