using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// GeoJSON Point. <c>type</c> debe ser exactamente "Point".
    /// <c>coordinates</c> usa orden [longitud, latitud].
    /// </summary>
    public class PuntoGeoJsonDto
    {
        [Required(ErrorMessage = "El tipo GeoJSON es obligatorio.")]
        public string Type { get; set; } = "Point";

        [Required(ErrorMessage = "Las coordenadas son obligatorias.")]
        [MinLength(2, ErrorMessage = "Un Point debe tener exactamente dos coordenadas: longitud y latitud.")]
        [MaxLength(2, ErrorMessage = "Un Point debe tener exactamente dos coordenadas: longitud y latitud.")]
        public double[] Coordinates { get; set; } = Array.Empty<double>();
    }
}
