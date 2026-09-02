using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Asociación de un pasajero a un servicio. Mapea la tabla <c>pasajero_servicio</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// </summary>
    [Table("pasajero_servicio")]
    public class PasajeroServicio
    {
        [Key]
        [Column("id_pasajero_servicio")]
        public int IdPasajeroServicio { get; set; }

        [Column("id_servicio")]
        public int IdServicio { get; set; }

        [Column("id_pasajero")]
        public int IdPasajero { get; set; }

        [Required]
        [Column("estado_confirmacion")]
        public EstadoConfirmacionViaje EstadoConfirmacion { get; set; } = EstadoConfirmacionViaje.PENDIENTE;

        [Column("fecha_confirmacion")]
        public DateTime? FechaConfirmacion { get; set; }

        [Required]
        [Column("estado")]
        public EstadoPasajeroServicio Estado { get; set; } = EstadoPasajeroServicio.ACTIVO;

        [ForeignKey(nameof(IdServicio))]
        public Servicio Servicio { get; set; } = null!;

        [ForeignKey(nameof(IdPasajero))]
        public Pasajero Pasajero { get; set; } = null!;
    }
}
