using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad de planificación mensual por empresa. Mapea la tabla <c>planificacion</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// Los servicios se asociarán posteriormente mediante <c>servicio.id_planificacion</c>.
    /// </summary>
    [Table("planificacion")]
    public class Planificacion
    {
        [Key]
        [Column("id_planificacion")]
        public int IdPlanificacion { get; set; }

        [Column("id_empresa")]
        public int IdEmpresa { get; set; }

        [Required]
        [MaxLength(7)]
        [Column("periodo")]
        public string Periodo { get; set; } = string.Empty;

        [Column("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [Column("id_usuario_creador")]
        public int IdUsuarioCreador { get; set; }

        [Required]
        [Column("estado")]
        public EstadoPlanificacion Estado { get; set; } = EstadoPlanificacion.BORRADOR;

        [ForeignKey(nameof(IdEmpresa))]
        public EmpresaCliente Empresa { get; set; } = null!;

        [ForeignKey(nameof(IdUsuarioCreador))]
        public Usuario UsuarioCreador { get; set; } = null!;
    }
}
