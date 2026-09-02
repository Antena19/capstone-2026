using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Asociación de un pasajero a un servicio. Solo ADMINISTRADOR.
    /// El estado, la confirmación y la fecha de confirmación los asigna el backend.
    /// </summary>
    public class CrearPasajeroServicioSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un servicio válido.")]
        public int IdServicio { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un pasajero válido.")]
        public int IdPasajero { get; set; }
    }
}
