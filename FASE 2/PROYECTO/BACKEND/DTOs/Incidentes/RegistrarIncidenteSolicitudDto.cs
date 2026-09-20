using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Incidentes
{
    /// <summary>
    /// Alta de incidente por el CONDUCTOR autenticado.
    /// El servicio, conductor, fecha/hora y estado los asigna el Backend.
    /// </summary>
    public class RegistrarIncidenteSolicitudDto
    {
        [Required(ErrorMessage = "El tipo es obligatorio.")]
        public string Tipo { get; set; } = string.Empty;

        [Required(ErrorMessage = "La descripción es obligatoria.")]
        [MaxLength(1000, ErrorMessage = "La descripción no puede superar los 1000 caracteres.")]
        public string Descripcion { get; set; } = string.Empty;
    }
}
