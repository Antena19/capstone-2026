using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    [Table("activacion_usuario")]
    public class ActivacionUsuario
    {
        [Key]
        [Column("id_activacion")]
        public int IdActivacion { get; set; }

        [Column("id_usuario")]
        public int IdUsuario { get; set; }

        [Required]
        [MaxLength(128)]
        [Column("codigo_hash")]
        public string CodigoHash { get; set; } = string.Empty;

        [Column("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [Column("fecha_expiracion")]
        public DateTime FechaExpiracion { get; set; }

        [Column("usado")]
        public bool Usado { get; set; }

        [Column("vigente")]
        public bool Vigente { get; set; } = true;

        [Column("intentos")]
        public int Intentos { get; set; }

        [Column("fecha_uso")]
        public DateTime? FechaUso { get; set; }

        [Required]
        [Column("estado_envio")]
        public EstadoEnvioActivacion EstadoEnvio { get; set; } = EstadoEnvioActivacion.PENDIENTE;

        [Column("fecha_envio")]
        public DateTime? FechaEnvio { get; set; }

        [ForeignKey(nameof(IdUsuario))]
        public Usuario Usuario { get; set; } = null!;
    }
}
