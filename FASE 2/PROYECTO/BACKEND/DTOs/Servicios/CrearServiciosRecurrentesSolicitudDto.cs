using System.ComponentModel.DataAnnotations;
using BACKEND.DTOs.PasajerosServicio;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Alta de una serie de servicios PROGRAMADOS que comparten el mismo idSerie.
    /// </summary>
    public class CrearServiciosRecurrentesSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int IdEmpresa { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una planificación válida.")]
        public int IdPlanificacion { get; set; }

        [Required(ErrorMessage = "La ruta es obligatoria.")]
        [RegularExpression(@"^[a-fA-F0-9]{24}$", ErrorMessage = "El identificador de la ruta no es válido.")]
        public string IdRuta { get; set; } = string.Empty;

        [Required(ErrorMessage = "La fecha inicial es obligatoria.")]
        public DateOnly FechaDesde { get; set; }

        [Required(ErrorMessage = "La fecha final es obligatoria.")]
        public DateOnly FechaHasta { get; set; }

        [Required(ErrorMessage = "Debe indicar al menos un día de la semana.")]
        [MinLength(1, ErrorMessage = "Debe indicar al menos un día de la semana.")]
        public List<DiaSemana> DiasSemana { get; set; } = [];

        [Required(ErrorMessage = "La hora de inicio es obligatoria.")]
        public TimeOnly HoraInicio { get; set; }

        [Required(ErrorMessage = "La hora de fin es obligatoria.")]
        public TimeOnly HoraFin { get; set; }

        [Required(ErrorMessage = "El tipo de servicio es obligatorio.")]
        [MaxLength(50, ErrorMessage = "El tipo de servicio no puede superar los 50 caracteres.")]
        public string TipoServicio { get; set; } = string.Empty;

        public List<PasajeroServicioInicialDto>? Pasajeros { get; set; }
    }
}
