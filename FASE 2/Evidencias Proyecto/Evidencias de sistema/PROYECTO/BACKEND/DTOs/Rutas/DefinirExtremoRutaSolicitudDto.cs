using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    public class DefinirExtremoRutaSolicitudDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [MaxLength(150, ErrorMessage = "El nombre no puede superar 150 caracteres.")]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(255, ErrorMessage = "La referencia no puede superar 255 caracteres.")]
        public string? Referencia { get; set; }

        [Range(-90, 90, ErrorMessage = "La latitud debe estar entre -90 y 90.")]
        public double Latitud { get; set; }

        [Range(-180, 180, ErrorMessage = "La longitud debe estar entre -180 y 180.")]
        public double Longitud { get; set; }
    }
}
