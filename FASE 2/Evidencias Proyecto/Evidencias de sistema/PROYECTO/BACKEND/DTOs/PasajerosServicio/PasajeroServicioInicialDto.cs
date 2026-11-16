using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Pasajero a asociar al crear un servicio o un lote.
    /// </summary>
    public class PasajeroServicioInicialDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un pasajero válido.")]
        public int IdPasajero { get; set; }

        [MaxLength(50, ErrorMessage = "El identificador del punto no puede superar 50 caracteres.")]
        public string? IdPuntoRecogida { get; set; }
    }
}
