using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Confirmación o rechazo del viaje por el pasajero autenticado.
    /// </summary>
    public class ConfirmarViajeSolicitudDto
    {
        [Required(ErrorMessage = "El estado de confirmación es obligatorio.")]
        [EnumDataType(typeof(EstadoConfirmacionViaje), ErrorMessage = "El estado de confirmación debe ser CONFIRMADO o RECHAZADO.")]
        public EstadoConfirmacionViaje EstadoConfirmacion { get; set; }
    }
}
