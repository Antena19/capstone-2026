using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Autenticacion
{
    /// <summary>
    /// Credenciales de inicio de sesión. La contraseña viaja solo en el cuerpo de la petición.
    /// </summary>
    public class LoginSolicitudDto
    {
        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [EmailAddress(ErrorMessage = "El correo electrónico no es válido.")]
        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        public string Password { get; set; } = string.Empty;
    }
}
