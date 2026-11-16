using BACKEND.Modelos;

namespace BACKEND.DTOs.Rutas
{
    public class PasajeroMapaDto
    {
        public int IdPasajero { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Rut { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public string Direccion { get; set; } = string.Empty;

        public decimal? Latitud { get; set; }

        public decimal? Longitud { get; set; }

        public string? DireccionGeocodificada { get; set; }

        public DateTime? FechaGeocodificacion { get; set; }

        public EstadoGeocodificacion EstadoGeocodificacion { get; set; }
    }
}
