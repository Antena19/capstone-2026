using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Vehiculos
{
    /// <summary>
    /// Activación o inactivación de un vehículo. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoVehiculoSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoRegistro), ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public EstadoRegistro Estado { get; set; }
    }
}
