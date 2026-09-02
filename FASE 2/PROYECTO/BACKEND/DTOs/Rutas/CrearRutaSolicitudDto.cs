using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// Alta de ruta. Solo puede utilizarla un ADMINISTRADOR.
    /// El estado inicial lo asigna el servicio (ACTIVO). MongoDB genera el ObjectId.
    /// </summary>
    public class CrearRutaSolicitudDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        public string Nombre { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Debe indicar una empresa válida.")]
        public int EmpresaId { get; set; }

        [Required(ErrorMessage = "El sector es obligatorio.")]
        public string Sector { get; set; } = string.Empty;

        [Required(ErrorMessage = "El origen es obligatorio.")]
        public PuntoGeoJsonDto Origen { get; set; } = new();

        [Required(ErrorMessage = "El destino es obligatorio.")]
        public PuntoGeoJsonDto Destino { get; set; } = new();

        public List<PuntoRecogidaRutaDto> PuntosRecogida { get; set; } = new();

        [Required(ErrorMessage = "El trazado es obligatorio.")]
        public LineaGeoJsonDto Trazado { get; set; } = new();

        [Range(0, double.MaxValue, ErrorMessage = "La distancia estimada no puede ser negativa.")]
        public double DistanciaEstimadaKm { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "La duración estimada no puede ser negativa.")]
        public int DuracionEstimadaMin { get; set; }
    }
}
