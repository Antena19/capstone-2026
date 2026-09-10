using System.ComponentModel.DataAnnotations;
using BACKEND.DTOs.PasajerosServicio;

namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Alta de servicio. Solo ADMINISTRADOR.
    /// El estado inicial, idSerie nulo y las fechas reales las asigna el backend.
    /// </summary>
    public class CrearServicioSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int IdEmpresa { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una planificación válida.")]
        public int IdPlanificacion { get; set; }

        [Required(ErrorMessage = "La ruta es obligatoria.")]
        [RegularExpression(@"^[a-fA-F0-9]{24}$", ErrorMessage = "El identificador de la ruta no es válido.")]
        public string IdRuta { get; set; } = string.Empty;

        [Required(ErrorMessage = "La fecha es obligatoria.")]
        public DateOnly Fecha { get; set; }

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
