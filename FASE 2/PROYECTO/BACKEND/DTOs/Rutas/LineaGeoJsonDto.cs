using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// GeoJSON LineString. <c>type</c> debe ser exactamente "LineString".
    /// Cada posición en <c>coordinates</c> usa orden [longitud, latitud].
    /// </summary>
    public class LineaGeoJsonDto
    {
        [Required(ErrorMessage = "El tipo GeoJSON es obligatorio.")]
        public string Type { get; set; } = "LineString";

        [Required(ErrorMessage = "Las coordenadas del trazado son obligatorias.")]
        [MinLength(2, ErrorMessage = "Un LineString debe contener al menos dos posiciones.")]
        public List<double[]> Coordinates { get; set; } = new();
    }
}
