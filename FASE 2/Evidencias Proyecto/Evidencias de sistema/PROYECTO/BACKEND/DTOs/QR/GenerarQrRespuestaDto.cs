using BACKEND.Modelos;

namespace BACKEND.DTOs.QR
{
    /// <summary>
    /// Token QR generado para un servicio. El cliente Mobile construye la imagen a partir de Token.
    /// </summary>
    public class GenerarQrRespuestaDto
    {
        public int IdQr { get; set; }

        public int IdServicio { get; set; }

        public string Token { get; set; } = string.Empty;

        public DateTime FechaGeneracion { get; set; }

        public DateTime FechaExpiracion { get; set; }

        public EstadoQrServicio Estado { get; set; }
    }
}
