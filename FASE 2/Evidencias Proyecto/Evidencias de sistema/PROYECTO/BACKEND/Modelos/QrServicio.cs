using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Token QR de un servicio. Mapea la tabla <c>qr_servicio</c> de MySQL.
    /// El token no se registra en logs ni se incluye en DTOs de asistencia.
    /// </summary>
    [Table("qr_servicio")]
    public class QrServicio
    {
        [Key]
        [Column("id_qr")]
        public int IdQr { get; set; }

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Required]
        [MaxLength(128)]
        [Column("token")]
        public string Token { get; set; } = string.Empty;

        [Column("fecha_generacion")]
        public DateTime FechaGeneracion { get; set; }

        [Column("fecha_expiracion")]
        public DateTime FechaExpiracion { get; set; }

        [Required]
        [Column("estado")]
        public EstadoQrServicio Estado { get; set; } = EstadoQrServicio.ACTIVO;

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;
    }
}
