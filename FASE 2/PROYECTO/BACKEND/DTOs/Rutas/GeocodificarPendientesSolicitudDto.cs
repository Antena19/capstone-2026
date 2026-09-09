using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    public class GeocodificarPendientesSolicitudDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int IdEmpresa { get; set; }
    }
}
