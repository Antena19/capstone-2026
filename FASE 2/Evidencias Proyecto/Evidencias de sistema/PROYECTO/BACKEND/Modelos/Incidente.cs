using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Incidente operacional de un servicio. Mapea la tabla <c>incidente</c> de MySQL.
    /// <c>tipo</c> es VARCHAR(50) validado contra catálogo de Backend; <c>estado</c> es ENUM MySQL.
    /// </summary>
    [Table("incidente")]
    public class Incidente
    {
        [Key]
        [Column("id_incidente")]
        public int IdIncidente { get; set; }

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Column("id_conductor")]
        public int IdConductor { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("tipo")]
        public TipoIncidente Tipo { get; set; }

        [Required]
        [Column("descripcion")]
        public string Descripcion { get; set; } = string.Empty;

        [Column("fecha_hora")]
        public DateTime FechaHora { get; set; }

        [Required]
        [Column("estado")]
        public EstadoIncidente Estado { get; set; } = EstadoIncidente.ABIERTO;

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;

        [ForeignKey(nameof(IdConductor))]
        public Conductor Conductor { get; set; } = null!;
    }
}
