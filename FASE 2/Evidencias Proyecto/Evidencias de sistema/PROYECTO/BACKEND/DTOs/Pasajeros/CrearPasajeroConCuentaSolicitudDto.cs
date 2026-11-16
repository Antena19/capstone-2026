using System.ComponentModel.DataAnnotations;
using BACKEND.Negocio.Validacion;

namespace BACKEND.DTOs.Pasajeros
{
    public class CrearPasajeroConCuentaSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int IdEmpresa { get; set; }

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

        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string? Email { get; set; }

        [Required(ErrorMessage = "La dirección es obligatoria.")]
        [MaxLength(255, ErrorMessage = "La dirección no puede superar los 255 caracteres.")]
        public string Direccion { get; set; } = string.Empty;
    }
}
