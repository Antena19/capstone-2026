using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    public class CrearRutaDisenoSolicitudDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [MaxLength(150, ErrorMessage = "El nombre no puede superar 150 caracteres.")]
        public string Nombre { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int EmpresaId { get; set; }

        [MaxLength(150, ErrorMessage = "El sector no puede superar 150 caracteres.")]
        public string? Sector { get; set; }
    }
}
