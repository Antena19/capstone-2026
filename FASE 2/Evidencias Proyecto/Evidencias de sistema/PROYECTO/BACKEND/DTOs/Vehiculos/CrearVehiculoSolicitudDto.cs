using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Vehiculos
{
    /// <summary>
    /// Alta de vehículo. Solo puede utilizarla un ADMINISTRADOR.
    /// El estado inicial lo asigna el servicio (ACTIVO).
    /// </summary>
    public class CrearVehiculoSolicitudDto
    {
        [Required(ErrorMessage = "La patente es obligatoria.")]
        [MaxLength(10, ErrorMessage = "La patente no puede superar los 10 caracteres.")]
        public string Patente { get; set; } = string.Empty;

        [Required(ErrorMessage = "El tipo es obligatorio.")]
        [MaxLength(50, ErrorMessage = "El tipo no puede superar los 50 caracteres.")]
        public string Tipo { get; set; } = string.Empty;

        [Required(ErrorMessage = "La marca es obligatoria.")]
        [MaxLength(50, ErrorMessage = "La marca no puede superar los 50 caracteres.")]
        public string Marca { get; set; } = string.Empty;

        [Required(ErrorMessage = "El modelo es obligatorio.")]
        [MaxLength(50, ErrorMessage = "El modelo no puede superar los 50 caracteres.")]
        public string Modelo { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "La capacidad debe ser mayor que cero.")]
        public int Capacidad { get; set; }
    }
}
