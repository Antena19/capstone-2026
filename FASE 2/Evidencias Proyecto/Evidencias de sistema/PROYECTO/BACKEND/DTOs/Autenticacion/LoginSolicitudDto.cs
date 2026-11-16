using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Autenticacion
{
    /// <summary>
    /// Credenciales de inicio de sesión. Acepta identificador (teléfono o correo) y, por compatibilidad, email.
    /// </summary>
    public class LoginSolicitudDto
    {
        [MaxLength(150)]
        public string? Identificador { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        public string Password { get; set; } = string.Empty;
    }
}
