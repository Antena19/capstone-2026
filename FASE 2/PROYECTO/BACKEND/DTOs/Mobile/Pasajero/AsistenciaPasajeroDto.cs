using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Pasajero
{
    /// <summary>
    /// Asistencia propia del pasajero autenticado en un servicio.
    /// </summary>
    public class AsistenciaPasajeroDto
    {
        public bool TieneAsistencia { get; set; }

        public MetodoAsistencia? Metodo { get; set; }

        public TipoAsistencia? TipoAsistencia { get; set; }

        public EstadoAsistencia? EstadoAsistencia { get; set; }

        public DateTime? FechaHora { get; set; }
    }
}
