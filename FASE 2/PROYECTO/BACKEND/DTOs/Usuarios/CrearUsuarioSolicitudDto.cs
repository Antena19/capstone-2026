using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Alta de cuenta. Solo puede utilizarla un ADMINISTRADOR.
    /// La contraseña se convierte a hash antes de persistirse.
    /// </summary>
    public class CrearUsuarioSolicitudDto
    {
        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [EmailAddress(ErrorMessage = "El correo electrónico no es válido.")]
        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria.")]
        [MinLength(ValidadorPassword.LongitudMinima, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        [MaxLength(ValidadorPassword.LongitudMaxima, ErrorMessage = "La contraseña supera la longitud máxima permitida.")]
        [RegularExpression(ValidadorPassword.Patron, ErrorMessage = ValidadorPassword.MensajeRequisitos)]
        public string Password { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un rol válido.")]
        public int IdRol { get; set; }
    }
}
