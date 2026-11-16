using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Pasajeros
{
    /// <summary>
    /// Activación o inactivación de un pasajero. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoPasajeroSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoRegistro), ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public EstadoRegistro Estado { get; set; }
    }
}
