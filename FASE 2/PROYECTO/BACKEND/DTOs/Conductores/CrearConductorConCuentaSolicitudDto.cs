using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Conductores
{
    /// <summary>
    /// Alta transaccional de conductor con cuenta CONDUCTOR.
    /// El backend genera la contraseña temporal, resuelve el rol y asigna el estado.
    /// </summary>
    public class CrearConductorConCuentaSolicitudDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [MaxLength(100, ErrorMessage = "El nombre no puede superar los 100 caracteres.")]
        public string Nombre { get; set; } = string.Empty;

        [Required(ErrorMessage = "El RUT es obligatorio.")]
        [MaxLength(12, ErrorMessage = "El RUT no puede superar los 12 caracteres.")]
        [RutChileno]
        public string Rut { get; set; } = string.Empty;

        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [MaxLength(20, ErrorMessage = "El teléfono no puede superar los 20 caracteres.")]
        public string Telefono { get; set; } = string.Empty;

        [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
        [EmailAddress(ErrorMessage = "El correo electrónico no es válido.")]
        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string Email { get; set; } = string.Empty;
    }
}
