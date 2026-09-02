using BACKEND.Modelos;

namespace BACKEND.DTOs.Asistencias
{
    /// <summary>
    /// Datos de asistencia efectiva. No incluye información personal del pasajero ni el token QR.
    /// </summary>
    public class AsistenciaRespuestaDto
    {
        public int IdAsistencia { get; set; }

        public int IdServicio { get; set; }

        public int IdPasajero { get; set; }

        public DateTime FechaHora { get; set; }

        public MetodoAsistencia Metodo { get; set; }

        public TipoAsistencia TipoAsistencia { get; set; }

        public bool ExcedeCapacidad { get; set; }

        public EstadoAsistencia Estado { get; set; }
    }
}
