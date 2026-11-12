using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Marca de una asistencia creada por la simulación. Mapea <c>simulacion_asistencia</c>.
    /// <c>id_asistencia</c> apunta a la fila real cuando ya existe.
    /// </summary>
    [Table("simulacion_asistencia")]
    public class SimulacionAsistencia
    {
        [Key]
        [Column("id_simulacion_asistencia")]
        public int IdSimulacionAsistencia { get; set; }

        [Column("id_simulacion_servicio")]
        public int IdSimulacionServicio { get; set; }

        [Column("id_pasajero")]
        public int IdPasajero { get; set; }

        [Column("id_asistencia")]
        public int? IdAsistencia { get; set; }

        [ForeignKey(nameof(IdSimulacionServicio))]
        public SimulacionServicio SimulacionServicio { get; set; } = null!;

        [ForeignKey(nameof(IdPasajero))]
        public Pasajero Pasajero { get; set; } = null!;

        [ForeignKey(nameof(IdAsistencia))]
        public Asistencia? Asistencia { get; set; }
    }
}
