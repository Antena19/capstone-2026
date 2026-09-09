using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    public class AsignarPasajerosPuntoSolicitudDto
    {
        [Required]
        public List<int> PasajerosIds { get; set; } = [];
    }
}
