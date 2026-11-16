using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad del maestro de conductores. Mapea la tabla <c>conductor</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// <c>id_usuario</c> es obligatorio y único: cada conductor tiene una cuenta CONDUCTOR.
    /// </summary>
    [Table("conductor")]
    public class Conductor
    {
        [Key]
        [Column("id_conductor")]
        public int IdConductor { get; set; }

        [Column("id_usuario")]
        public int IdUsuario { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [MaxLength(12)]
        [Column("rut")]
        public string Rut { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("telefono")]
        public string Telefono { get; set; } = string.Empty;

        [Required]
        [Column("estado")]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;

        [ForeignKey(nameof(IdUsuario))]
        public Usuario Usuario { get; set; } = null!;
    }
}
