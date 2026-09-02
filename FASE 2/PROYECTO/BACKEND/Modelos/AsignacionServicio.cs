using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad de asignación de conductor y vehículo a un servicio.
    /// Mapea la tabla <c>asignacion_servicio</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// </summary>
    [Table("asignacion_servicio")]
    public class AsignacionServicio
    {
        [Key]
        [Column("id_asignacion")]
        public int IdAsignacion { get; set; }

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Column("id_conductor")]
        public int IdConductor { get; set; }

        [Column("id_vehiculo")]
        public int IdVehiculo { get; set; }

        [Column("fecha_asignacion")]
        public DateTime FechaAsignacion { get; set; }

        [Required]
        [Column("estado")]
        public EstadoAsignacionServicio Estado { get; set; } = EstadoAsignacionServicio.ACTIVA;

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;

        [ForeignKey(nameof(IdConductor))]
        public Conductor Conductor { get; set; } = null!;

        [ForeignKey(nameof(IdVehiculo))]
        public Vehiculo Vehiculo { get; set; } = null!;
    }
}
