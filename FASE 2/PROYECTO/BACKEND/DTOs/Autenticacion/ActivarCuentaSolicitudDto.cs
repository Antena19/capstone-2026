using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Autenticacion
{
    public class ActivarCuentaSolicitudDto
    {
        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [MaxLength(20)]
        public string Telefono { get; set; } = string.Empty;

        [Required(ErrorMessage = "El código es obligatorio.")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "El código debe tener 6 dígitos.")]
        public string Codigo { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        [MinLength(ValidadorPassword.LongitudMinima, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        [MaxLength(ValidadorPassword.LongitudMaxima, ErrorMessage = "La contraseña supera la longitud máxima permitida.")]
        [RegularExpression(ValidadorPassword.Patron, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        public string NuevaPassword { get; set; } = string.Empty;
    }
}
