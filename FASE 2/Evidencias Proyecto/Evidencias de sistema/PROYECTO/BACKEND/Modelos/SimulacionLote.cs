using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Ejecución de la simulación operacional. Mapea <c>simulacion_lote</c>.
    /// El identificador es un UUID canónico de 36 caracteres.
    /// </summary>
    [Table("simulacion_lote")]
    public class SimulacionLote
    {
        [Key]
        [MaxLength(36)]
        [Column("id_lote")]
        public string IdLote { get; set; } = string.Empty;

        [Column("id_empresa")]
        public int IdEmpresa { get; set; }

        [Column("id_planificacion")]
        public int IdPlanificacion { get; set; }

        [Required]
        [Column("estado")]
        public EstadoLoteSimulacion Estado { get; set; } = EstadoLoteSimulacion.EN_CURSO;

        [Column("fecha_inicio")]
        public DateTime FechaInicio { get; set; }

        [Column("fecha_cierre")]
        public DateTime? FechaCierre { get; set; }

        [Column("fecha_reversion")]
        public DateTime? FechaReversion { get; set; }

        [ForeignKey(nameof(IdEmpresa))]
        public EmpresaCliente Empresa { get; set; } = null!;

        [ForeignKey(nameof(IdPlanificacion))]
        public Planificacion Planificacion { get; set; } = null!;

        public List<SimulacionServicio> Servicios { get; set; } = new();
    }
}
