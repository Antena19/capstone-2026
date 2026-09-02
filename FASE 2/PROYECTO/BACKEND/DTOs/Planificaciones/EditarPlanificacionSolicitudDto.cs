using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Planificaciones
{
    /// <summary>
    /// Edición de empresa y período. Solo es válida mientras la planificación esté en BORRADOR.
    /// El identificador, la fecha de creación y el usuario creador no se reciben en el cuerpo.
    /// </summary>
    public class EditarPlanificacionSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int IdEmpresa { get; set; }

        [Required(ErrorMessage = "El período es obligatorio.")]
        [RegularExpression(@"^\d{4}-(0[1-9]|1[0-2])$", ErrorMessage = "El período debe tener el formato AAAA-MM.")]
        public string Periodo { get; set; } = string.Empty;
    }
}
