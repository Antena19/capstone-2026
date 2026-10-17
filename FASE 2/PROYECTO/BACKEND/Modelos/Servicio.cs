using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad de servicio de transporte. Mapea la tabla <c>servicio</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// <c>id_ruta</c> es el ObjectId hexadecimal de una ruta en MongoDB; no hay FK entre motores.
    /// <c>id_serie</c> es nulo en un servicio único y un UUID compartido en ocurrencias recurrentes.
    /// </summary>
    [Table("servicio")]
    public class Servicio
    {
        [Key]
        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Column("id_empresa")]
        public int IdEmpresa { get; set; }

        [Column("id_planificacion")]
        public int IdPlanificacion { get; set; }

        [MaxLength(24)]
        [Column("id_ruta")]
        public string IdRuta { get; set; } = string.Empty;

        [MaxLength(36)]
        [Column("id_serie")]
        public string? IdSerie { get; set; }

        [Column("fecha")]
        public DateOnly Fecha { get; set; }

        [Column("hora_inicio")]
        public TimeOnly HoraInicio { get; set; }

        [Column("hora_fin")]
        public TimeOnly HoraFin { get; set; }

        [Column("fecha_hora_inicio_real")]
        public DateTime? FechaHoraInicioReal { get; set; }

        [Column("fecha_hora_fin_real")]
        public DateTime? FechaHoraFinReal { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("tipo_servicio")]
        public string TipoServicio { get; set; } = string.Empty;

        [Required]
        [Column("estado")]
        public EstadoServicio Estado { get; set; } = EstadoServicio.PROGRAMADO;

        /// <summary>
        /// Código de cancelación. Nulo en servicios no cancelados y en cancelaciones antiguas.
        /// </summary>
        [MaxLength(50)]
        [Column("motivo_cancelacion")]
        public string? MotivoCancelacion { get; set; }

        /// <summary>
        /// Instante UTC en que se registró la cancelación. No es la hora de vencimiento del plazo.
        /// </summary>
        [Column("fecha_hora_cancelacion")]
        public DateTime? FechaHoraCancelacion { get; set; }

        [ForeignKey(nameof(IdEmpresa))]
        public EmpresaCliente Empresa { get; set; } = null!;

        [ForeignKey(nameof(IdPlanificacion))]
        public Planificacion Planificacion { get; set; } = null!;
    }
}
