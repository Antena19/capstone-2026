using BACKEND.Modelos;

namespace BACKEND.DTOs.Incidentes
{
    /// <summary>
    /// Incidente operacional registrado en un servicio.
    /// </summary>
    public class IncidenteRespuestaDto
    {
        public int IdIncidente { get; set; }

        public int IdServicio { get; set; }

        public TipoIncidente Tipo { get; set; }

        public string Descripcion { get; set; } = string.Empty;

        public DateTime FechaHora { get; set; }

        public EstadoIncidente Estado { get; set; }
    }
}
