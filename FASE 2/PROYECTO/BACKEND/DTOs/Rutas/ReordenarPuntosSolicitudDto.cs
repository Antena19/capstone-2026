using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    public class OrdenPuntoSolicitudDto
    {
        [Required(ErrorMessage = "El identificador del punto es obligatorio.")]
        public string IdPunto { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "El orden del punto debe ser un entero positivo.")]
        public int Orden { get; set; }
    }

    public class ReordenarPuntosSolicitudDto
    {
        [Required(ErrorMessage = "Debe indicar los puntos a reordenar.")]
        [MinLength(1, ErrorMessage = "Debe indicar los puntos a reordenar.")]
        public List<OrdenPuntoSolicitudDto> Puntos { get; set; } = [];
    }
}
