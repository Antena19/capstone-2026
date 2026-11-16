using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Asistencias
{
    /// <summary>
    /// Escaneo de QR por el pasajero autenticado. La identidad y el servicio no se envían en el cuerpo.
    /// </summary>
    public class EscanearQrSolicitudDto
    {
        [Required(ErrorMessage = "El token es obligatorio.")]
        [MaxLength(128, ErrorMessage = "El token no es válido.")]
        public string Token { get; set; } = string.Empty;
    }
}
