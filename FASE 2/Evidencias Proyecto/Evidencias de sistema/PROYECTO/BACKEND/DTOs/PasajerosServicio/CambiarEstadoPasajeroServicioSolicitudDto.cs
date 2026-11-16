using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Activación o cancelación de la asociación pasajero-servicio. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoPasajeroServicioSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoPasajeroServicio), ErrorMessage = "El estado debe ser ACTIVO o CANCELADO.")]
        public EstadoPasajeroServicio Estado { get; set; }
    }
}
