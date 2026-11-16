using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Asigna o quita el punto de recogida de un pasajero en un servicio. Solo ADMINISTRADOR.
    /// </summary>
    public class AsignarPuntoRecogidaSolicitudDto
    {
        [MaxLength(50, ErrorMessage = "El identificador del punto no puede superar 50 caracteres.")]
        public string? IdPuntoRecogida { get; set; }
    }
}
