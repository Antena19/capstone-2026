using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Marca de un servicio tocado por un lote. Mapea <c>simulacion_servicio</c>.
    /// Conserva el estado y las horas reales anteriores y posteriores.
    /// Un servicio finalizado sin pasajeros no tiene filas en <c>simulacion_asistencia</c>.
    /// </summary>
    [Table("simulacion_servicio")]
    public class SimulacionServicio
    {
        [Key]
        [Column("id_simulacion_servicio")]
        public int IdSimulacionServicio { get; set; }

        [MaxLength(36)]
        [Column("id_lote")]
        public string IdLote { get; set; } = string.Empty;

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Required]
        [Column("estado_marca")]
        public EstadoMarcaSimulacion EstadoMarca { get; set; } = EstadoMarcaSimulacion.VIGENTE;

        /// <summary>
        /// Igual a <see cref="IdServicio"/> mientras la marca está vigente.
        /// Nulo al revertir, para liberar la unicidad sin borrar el historial.
        /// </summary>
        [Column("id_servicio_vigente")]
        public int? IdServicioVigente { get; set; }

        [Required]
        [Column("estado_anterior")]
        public EstadoServicio EstadoAnterior { get; set; }

        [Required]
        [Column("estado_posterior")]
        public EstadoServicio EstadoPosterior { get; set; } = EstadoServicio.FINALIZADO;

        [Column("fecha_hora_inicio_real_anterior")]
        public DateTime? FechaHoraInicioRealAnterior { get; set; }

        [Column("fecha_hora_inicio_real_posterior")]
        public DateTime? FechaHoraInicioRealPosterior { get; set; }

        [Column("fecha_hora_fin_real_anterior")]
        public DateTime? FechaHoraFinRealAnterior { get; set; }

        [Column("fecha_hora_fin_real_posterior")]
        public DateTime? FechaHoraFinRealPosterior { get; set; }

        [MaxLength(50)]
        [Column("motivo_cancelacion_anterior")]
        public string? MotivoCancelacionAnterior { get; set; }

        [MaxLength(50)]
        [Column("motivo_cancelacion_posterior")]
        public string? MotivoCancelacionPosterior { get; set; }

        [ForeignKey(nameof(IdLote))]
        public SimulacionLote Lote { get; set; } = null!;

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;

        public List<SimulacionAsistencia> Asistencias { get; set; } = new();
    }
}
