using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Asignaciones
{
    /// <summary>
    /// Cambio de estado de una asignación. Solo se permite cancelar una asignación ACTIVA.
    /// </summary>
    public class CambiarEstadoAsignacionSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoAsignacionServicio), ErrorMessage = "El estado debe ser ACTIVA, REEMPLAZADA o CANCELADA.")]
        public EstadoAsignacionServicio Estado { get; set; }
    }
}
