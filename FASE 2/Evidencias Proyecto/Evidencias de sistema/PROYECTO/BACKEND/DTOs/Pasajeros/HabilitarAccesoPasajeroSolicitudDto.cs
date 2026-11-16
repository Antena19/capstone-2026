using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Pasajeros
{
    public class HabilitarAccesoPasajeroSolicitudDto
    {
        [MaxLength(150, ErrorMessage = "El correo electrónico no puede superar los 150 caracteres.")]
        public string? Email { get; set; }
    }
}
