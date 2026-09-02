using BACKEND.Modelos;

namespace BACKEND.DTOs.Planificaciones
{
    /// <summary>
    /// Datos de planificación que pueden devolverse al cliente administrativo.
    /// </summary>
    public class PlanificacionRespuestaDto
    {
        public int IdPlanificacion { get; set; }

        public int IdEmpresa { get; set; }

        public string Periodo { get; set; } = string.Empty;

        public DateTime FechaCreacion { get; set; }

        public int IdUsuarioCreador { get; set; }

        public EstadoPlanificacion Estado { get; set; }
    }
}
