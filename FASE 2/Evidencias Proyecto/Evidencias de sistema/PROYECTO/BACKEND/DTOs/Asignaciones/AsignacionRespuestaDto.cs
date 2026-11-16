using BACKEND.Modelos;

namespace BACKEND.DTOs.Asignaciones
{
    /// <summary>
    /// Datos de asignación que pueden devolverse al cliente administrativo.
    /// </summary>
    public class AsignacionRespuestaDto
    {
        public int IdAsignacion { get; set; }

        public int IdServicio { get; set; }

        public int IdConductor { get; set; }

        public int IdVehiculo { get; set; }

        public DateTime FechaAsignacion { get; set; }

        public EstadoAsignacionServicio Estado { get; set; }
    }
}
