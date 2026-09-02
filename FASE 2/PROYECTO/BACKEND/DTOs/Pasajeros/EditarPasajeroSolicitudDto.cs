using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Pasajeros
{
    /// <summary>
    /// Edición de un pasajero existente. El identificador se toma de la ruta, no del cuerpo.
    /// El estado se cambia por el endpoint dedicado. No crea ni modifica cuentas de usuario.
    /// </summary>
    public class EditarPasajeroSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int IdEmpresa { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un usuario válido.")]
        public int? IdUsuario { get; set; }

        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [MaxLength(100, ErrorMessage = "El nombre no puede superar los 100 caracteres.")]
        public string Nombre { get; set; } = string.Empty;

        [Required(ErrorMessage = "El RUT es obligatorio.")]
        [MaxLength(12, ErrorMessage = "El RUT no puede superar los 12 caracteres.")]
        public string Rut { get; set; } = string.Empty;

        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [MaxLength(20, ErrorMessage = "El teléfono no puede superar los 20 caracteres.")]
        public string Telefono { get; set; } = string.Empty;

        [Required(ErrorMessage = "La dirección es obligatoria.")]
        [MaxLength(255, ErrorMessage = "La dirección no puede superar los 255 caracteres.")]
        public string Direccion { get; set; } = string.Empty;
    }
}
