using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Edición de correo y teléfono de una cuenta. El identificador se toma del JWT o de la ruta.
    /// No admite rol, estado ni contraseña.
    /// </summary>
    public class EditarUsuarioSolicitudDto
    {
        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [EmailAddress(ErrorMessage = "El correo electrónico no es válido.")]
        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(TelefonoChileno.LongitudMaxima, ErrorMessage = "El teléfono no puede superar los 20 caracteres.")]
        public string? Telefono { get; set; }
    }
}
