namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// Origen o destino de una ruta de diseño. Las coordenadas salen de GeoJSON [longitud, latitud].
    /// </summary>
    public class ExtremoRutaDto
    {
        public string Nombre { get; set; } = string.Empty;

        public string? Referencia { get; set; }

        public double? Latitud { get; set; }

        public double? Longitud { get; set; }

        public PuntoGeoJsonDto? Ubicacion { get; set; }
    }
}
