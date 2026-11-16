using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Edición de ruta, horario y tipo sobre una serie. No regenera fechas ni ocurrencias.
    /// </summary>
    public class EditarSerieServiciosSolicitudDto
    {
        [Required(ErrorMessage = "El alcance es obligatorio.")]
        [EnumDataType(typeof(AlcanceEdicionSerie), ErrorMessage = "El alcance debe ser ESTE, ESTE_Y_FUTUROS o TODOS_PROGRAMADOS.")]
        public AlcanceEdicionSerie Alcance { get; set; }

        [Required(ErrorMessage = "La ruta es obligatoria.")]
        [RegularExpression(@"^[a-fA-F0-9]{24}$", ErrorMessage = "El identificador de la ruta no es válido.")]
        public string IdRuta { get; set; } = string.Empty;

        [Required(ErrorMessage = "La hora de inicio es obligatoria.")]
        public TimeOnly HoraInicio { get; set; }

        [Required(ErrorMessage = "La hora de fin es obligatoria.")]
        public TimeOnly HoraFin { get; set; }

        [Required(ErrorMessage = "El tipo de servicio es obligatorio.")]
        [MaxLength(50, ErrorMessage = "El tipo de servicio no puede superar los 50 caracteres.")]
        public string TipoServicio { get; set; } = string.Empty;
    }
}
