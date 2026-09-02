using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Planificaciones
{
    /// <summary>
    /// Cambio de estado de una planificación. Las transiciones las valida el servicio.
    /// </summary>
    public class CambiarEstadoPlanificacionSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoPlanificacion), ErrorMessage = "El estado debe ser BORRADOR, ACTIVA, CERRADA o CANCELADA.")]
        public EstadoPlanificacion Estado { get; set; }
    }
}
