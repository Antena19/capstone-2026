using BACKEND.Modelos;

namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// Datos de ruta que pueden devolverse al cliente administrativo.
    /// <c>IdRuta</c> es el ObjectId en hexadecimal de 24 caracteres, compatible con servicio.id_ruta.
    /// </summary>
    public class RutaRespuestaDto
    {
        public string IdRuta { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;

        public int EmpresaId { get; set; }

        public string Sector { get; set; } = string.Empty;

        public PuntoGeoJsonDto Origen { get; set; } = new();

        public PuntoGeoJsonDto Destino { get; set; } = new();

        public List<PuntoGeoJsonDto> PuntosRecogida { get; set; } = new();

        public LineaGeoJsonDto Trazado { get; set; } = new();

        public double DistanciaEstimadaKm { get; set; }

        public int DuracionEstimadaMin { get; set; }

        public EstadoRegistro Estado { get; set; }
    }
}
