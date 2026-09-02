using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Asistencias
{
    /// <summary>
        /// Anulación de una asistencia VALIDA. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoAsistenciaSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoAsistencia), ErrorMessage = "El estado debe ser PROVISIONAL, VALIDA o ANULADA.")]
        public EstadoAsistencia Estado { get; set; }
    }
}
