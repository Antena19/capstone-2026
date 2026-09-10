namespace BACKEND.DTOs.Servicios
{
    /// <summary>
    /// Resultado de generar una serie de servicios.
    /// </summary>
    public class CrearServiciosRecurrentesRespuestaDto
    {
        public string IdSerie { get; set; } = string.Empty;

        public int CantidadServicios { get; set; }

        public IReadOnlyList<ServicioRespuestaDto> Servicios { get; set; } = [];
    }
}
