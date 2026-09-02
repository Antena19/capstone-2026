using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Asistencias
{
    /// <summary>
    /// Regularización excepcional de asistencia. Solo ADMINISTRADOR.
    /// El método, tipo, estado y sobrecupo los calcula el backend.
    /// </summary>
    public class CrearAsistenciaManualSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un servicio válido.")]
        public int IdServicio { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar un pasajero válido.")]
        public int IdPasajero { get; set; }
    }
}
