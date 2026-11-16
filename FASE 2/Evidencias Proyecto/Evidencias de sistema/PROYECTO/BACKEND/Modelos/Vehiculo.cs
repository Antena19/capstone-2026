using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad del maestro de vehículos. Mapea la tabla <c>vehiculo</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// Las reglas de asignación a servicios se aplicarán en el módulo de Servicios/Asignaciones.
    /// </summary>
    [Table("vehiculo")]
    public class Vehiculo
    {
        [Key]
        [Column("id_vehiculo")]
        public int IdVehiculo { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("patente")]
        public string Patente { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("tipo")]
        public string Tipo { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("marca")]
        public string Marca { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("modelo")]
        public string Modelo { get; set; } = string.Empty;

        [Column("capacidad")]
        public int Capacidad { get; set; }

        [Required]
        [Column("estado")]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;
    }
}
