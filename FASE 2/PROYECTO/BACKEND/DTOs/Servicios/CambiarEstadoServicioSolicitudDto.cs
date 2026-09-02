using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Cambio de estado de un servicio. Las transiciones y fechas reales las valida el servicio.
    /// </summary>
    public class CambiarEstadoServicioSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoServicio), ErrorMessage = "El estado debe ser PROGRAMADO, EN_CURSO, FINALIZADO o CANCELADO.")]
        public EstadoServicio Estado { get; set; }
    }
}
