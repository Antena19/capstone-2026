using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// Punto de recogida de una ruta. <c>ubicacion</c> es GeoJSON Point [longitud, latitud].
    /// </summary>
    public class PuntoRecogidaRutaDto
    {
        [MaxLength(50, ErrorMessage = "El identificador del punto no puede superar 50 caracteres.")]
        public string? IdPunto { get; set; }

        [Required(ErrorMessage = "El nombre del punto de recogida es obligatorio.")]
        [MaxLength(150, ErrorMessage = "El nombre del punto no puede superar 150 caracteres.")]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(255, ErrorMessage = "La referencia no puede superar 255 caracteres.")]
        public string? Referencia { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "El orden del punto debe ser un entero positivo.")]
        public int Orden { get; set; }

        [Required(ErrorMessage = "La ubicación del punto es obligatoria.")]
        public PuntoGeoJsonDto Ubicacion { get; set; } = new();
    }
}
