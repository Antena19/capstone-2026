using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Mobile.Pasajero
{
    /// <summary>
    /// Ruta GeoJSON para el mapa del pasajero. Incluye el identificador de su punto asignado.
    /// </summary>
    public class RutaServicioPasajeroDto
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

        public string? IdPuntoRecogidaAsignado { get; set; }
    }
}
