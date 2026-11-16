using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Cancelación de uno o más servicios PROGRAMADOS de una serie.
    /// </summary>
    public class CambiarEstadoSerieServiciosSolicitudDto
    {
        [Required(ErrorMessage = "El alcance es obligatorio.")]
        [EnumDataType(typeof(AlcanceEdicionSerie), ErrorMessage = "El alcance debe ser ESTE, ESTE_Y_FUTUROS o TODOS_PROGRAMADOS.")]
        public AlcanceEdicionSerie Alcance { get; set; }

        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoServicio), ErrorMessage = "El estado debe ser CANCELADO.")]
        public EstadoServicio Estado { get; set; }
    }
}
