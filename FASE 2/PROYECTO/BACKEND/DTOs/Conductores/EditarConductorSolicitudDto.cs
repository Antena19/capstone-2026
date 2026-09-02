using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Conductores
{
    /// <summary>
    /// Edición de un conductor existente. El identificador se toma de la ruta, no del cuerpo.
    /// El estado se cambia por el endpoint dedicado. No crea ni modifica cuentas de usuario.
    /// </summary>
    public class EditarConductorSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un usuario válido.")]
        public int IdUsuario { get; set; }

        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [MaxLength(100, ErrorMessage = "El nombre no puede superar los 100 caracteres.")]
        public string Nombre { get; set; } = string.Empty;

        [Required(ErrorMessage = "El RUT es obligatorio.")]
        [MaxLength(12, ErrorMessage = "El RUT no puede superar los 12 caracteres.")]
        public string Rut { get; set; } = string.Empty;

        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [MaxLength(20, ErrorMessage = "El teléfono no puede superar los 20 caracteres.")]
        public string Telefono { get; set; } = string.Empty;
    }
}
