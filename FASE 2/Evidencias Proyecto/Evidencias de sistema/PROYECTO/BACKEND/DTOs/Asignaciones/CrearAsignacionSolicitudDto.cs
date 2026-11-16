using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Asignaciones
{
    /// <summary>
    /// Alta de asignación de conductor y vehículo a un servicio. Solo ADMINISTRADOR.
    /// El estado inicial y la fecha de asignación los asigna el backend.
    /// </summary>
    public class CrearAsignacionSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un servicio válido.")]
        public int IdServicio { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un conductor válido.")]
        public int IdConductor { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un vehículo válido.")]
        public int IdVehiculo { get; set; }
    }
}
