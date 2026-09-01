using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad de cuenta de acceso. Mapea la tabla <c>usuario</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// </summary>
    [Table("usuario")]
    public class Usuario
    {
        [Key]
        [Column("id_usuario")]
        public int IdUsuario { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Hash de la contraseña. Nunca se serializa ni se incluye en DTOs.
        /// </summary>
        [Required]
        [MaxLength(255)]
        [Column("password_hash")]
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        [Column("id_rol")]
        public int IdRol { get; set; }

        [Required]
        [Column("estado")]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;

        [Column("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [Column("ultimo_acceso")]
        public DateTime? UltimoAcceso { get; set; }

        [ForeignKey(nameof(IdRol))]
        public Rol Rol { get; set; } = null!;
    }
}
