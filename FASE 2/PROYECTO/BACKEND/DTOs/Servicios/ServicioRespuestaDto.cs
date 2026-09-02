using BACKEND.Modelos;

namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Datos de servicio que pueden devolverse al cliente administrativo.
    /// </summary>
    public class ServicioRespuestaDto
    {
        public int IdServicio { get; set; }

        public int IdEmpresa { get; set; }

        public int IdPlanificacion { get; set; }

        public string IdRuta { get; set; } = string.Empty;

        public DateOnly Fecha { get; set; }

        public TimeOnly HoraInicio { get; set; }

        public TimeOnly HoraFin { get; set; }

        public DateTime? FechaHoraInicioReal { get; set; }

        public DateTime? FechaHoraFinReal { get; set; }

        public string TipoServicio { get; set; } = string.Empty;

        public EstadoServicio Estado { get; set; }
    }
}
