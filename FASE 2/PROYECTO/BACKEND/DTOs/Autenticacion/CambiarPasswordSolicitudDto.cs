using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Autenticacion
{
    /// <summary>
    /// Cambio de contraseña del usuario autenticado.
    /// El identificador se obtiene del JWT, no de este cuerpo.
    /// </summary>
    public class CambiarPasswordSolicitudDto
    {
        [Required(ErrorMessage = "La contraseña actual es obligatoria.")]
        public string PasswordActual { get; set; } = string.Empty;

        [Required(ErrorMessage = "La nueva contraseña es obligatoria.")]
        [MinLength(ValidadorPassword.LongitudMinima, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        [MaxLength(ValidadorPassword.LongitudMaxima, ErrorMessage = "La nueva contraseña supera la longitud máxima permitida.")]
        [RegularExpression(ValidadorPassword.Patron, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        public string PasswordNueva { get; set; } = string.Empty;
    }
}
