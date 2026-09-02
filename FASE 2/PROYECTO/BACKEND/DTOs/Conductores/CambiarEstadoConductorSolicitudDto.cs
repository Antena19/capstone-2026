using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Conductores
{
    /// <summary>
    /// Activación o inactivación de un conductor. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoConductorSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoRegistro), ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public EstadoRegistro Estado { get; set; }
    }
}
