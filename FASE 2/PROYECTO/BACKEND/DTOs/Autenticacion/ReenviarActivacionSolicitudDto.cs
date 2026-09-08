using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Autenticacion
{
    public class ReenviarActivacionSolicitudDto
    {
        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [MaxLength(20)]
        public string Telefono { get; set; } = string.Empty;
    }
}
