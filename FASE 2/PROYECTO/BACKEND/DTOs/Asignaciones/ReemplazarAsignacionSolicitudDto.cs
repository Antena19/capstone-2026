using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Asignaciones
{
    /// <summary>
    /// Reemplazo de conductor, vehículo o ambos. Los identificadores omitidos conservan el valor actual.
    /// </summary>
    public class ReemplazarAsignacionSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un conductor válido.")]
        public int? IdConductor { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un vehículo válido.")]
        public int? IdVehiculo { get; set; }
    }
}
