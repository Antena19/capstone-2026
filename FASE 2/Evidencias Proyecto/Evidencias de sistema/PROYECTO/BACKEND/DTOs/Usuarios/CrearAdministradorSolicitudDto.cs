using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Alta de cuenta ADMINISTRADOR. El rol lo resuelve el servidor; no se recibe <c>idRol</c>.
    /// </summary>
    public class CrearAdministradorSolicitudDto
    {
        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [EmailAddress(ErrorMessage = "El correo electrónico no es válido.")]
        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(TelefonoChileno.LongitudMaxima, ErrorMessage = "El teléfono no puede superar los 20 caracteres.")]
        public string? Telefono { get; set; }

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        [MinLength(ValidadorPassword.LongitudMinima, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        [MaxLength(ValidadorPassword.LongitudMaxima, ErrorMessage = "La contraseña supera la longitud máxima permitida.")]
        [RegularExpression(ValidadorPassword.Patron, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        public string Password { get; set; } = string.Empty;
    }
}
