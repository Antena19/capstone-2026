using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Conductor
{
    /// <summary>
    /// Ruta GeoJSON para dibujar el mapa en Mobile. Las coordenadas se mantienen [longitud, latitud].
    /// </summary>
    public class RutaServicioConductorDto
    {
        public string IdRuta { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;

        public string Sector { get; set; } = string.Empty;

        public PuntoGeoJsonDto Origen { get; set; } = new();

        public PuntoGeoJsonDto Destino { get; set; } = new();

        public List<PuntoRecogidaRutaDto> PuntosRecogida { get; set; } = new();

        public LineaGeoJsonDto Trazado { get; set; } = new();

        public double DistanciaEstimadaKm { get; set; }

        public int DuracionEstimadaMin { get; set; }

        public EstadoRegistro Estado { get; set; }
    }
}
