using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Asociación de varios pasajeros a un servicio PROGRAMADO. Solo ADMINISTRADOR.
    /// </summary>
    public class CrearPasajerosServicioLoteSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un servicio válido.")]
        public int IdServicio { get; set; }

        [Required(ErrorMessage = "Debe indicar al menos un pasajero.")]
        [MinLength(1, ErrorMessage = "Debe indicar al menos un pasajero.")]
        public List<PasajeroServicioInicialDto> Pasajeros { get; set; } = [];
    }
}
