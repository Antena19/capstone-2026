using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Restablecimiento de contraseña por un ADMINISTRADOR.
    /// La nueva contraseña se hashea antes de guardarse.
    /// </summary>
    public class RestablecerPasswordSolicitudDto
    {
        [Required(ErrorMessage = "La nueva contraseña es obligatoria.")]
        [MinLength(ValidadorPassword.LongitudMinima, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        [MaxLength(ValidadorPassword.LongitudMaxima, ErrorMessage = "La contraseña supera la longitud máxima permitida.")]
        [RegularExpression(ValidadorPassword.Patron, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        public string PasswordNueva { get; set; } = string.Empty;
    }
}
