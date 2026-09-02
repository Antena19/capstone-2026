using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Trazabilidad de reemplazos de conductor o vehículo.
    /// Mapea la tabla <c>historial_asignacion</c> de MySQL.
    /// </summary>
    [Table("historial_asignacion")]
    public class HistorialAsignacion
    {
        [Key]
        [Column("id_historial")]
        public int IdHistorial { get; set; }

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Column("conductor_anterior")]
        public int? IdConductorAnterior { get; set; }

        [Column("conductor_nuevo")]
        public int IdConductorNuevo { get; set; }

        [Column("vehiculo_anterior")]
        public int? IdVehiculoAnterior { get; set; }

        [Column("vehiculo_nuevo")]
        public int IdVehiculoNuevo { get; set; }

        [Column("fecha_hora")]
        public DateTime FechaHora { get; set; }

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;

        [ForeignKey(nameof(IdConductorAnterior))]
        public Conductor? ConductorAnterior { get; set; }

        [ForeignKey(nameof(IdConductorNuevo))]
        public Conductor ConductorNuevo { get; set; } = null!;

        [ForeignKey(nameof(IdVehiculoAnterior))]
        public Vehiculo? VehiculoAnterior { get; set; }

        [ForeignKey(nameof(IdVehiculoNuevo))]
        public Vehiculo VehiculoNuevo { get; set; } = null!;
    }
}
