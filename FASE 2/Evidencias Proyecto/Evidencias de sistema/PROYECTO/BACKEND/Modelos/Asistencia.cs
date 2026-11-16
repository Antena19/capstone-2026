using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Asistencia efectiva de un pasajero a un servicio. Mapea la tabla <c>asistencia</c> de MySQL.
    /// Distinta de la confirmación de viaje en pasajero_servicio.
    /// Las NO_PLANIFICADAS se registran como PROVISIONAL hasta el inicio del servicio.
    /// </summary>
    [Table("asistencia")]
    public class Asistencia
    {
        [Key]
        [Column("id_asistencia")]
        public int IdAsistencia { get; set; }

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Column("id_pasajero")]
        public int IdPasajero { get; set; }

        [Column("fecha_hora")]
        public DateTime FechaHora { get; set; }

        [Required]
        [Column("metodo")]
        public MetodoAsistencia Metodo { get; set; }

        [Required]
        [Column("tipo_asistencia")]
        public TipoAsistencia TipoAsistencia { get; set; }

        [Column("excede_capacidad")]
        public bool ExcedeCapacidad { get; set; }

        [Required]
        [Column("estado")]
        public EstadoAsistencia Estado { get; set; } = EstadoAsistencia.VALIDA;

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;

        [ForeignKey(nameof(IdPasajero))]
        public Pasajero Pasajero { get; set; } = null!;
    }
}
