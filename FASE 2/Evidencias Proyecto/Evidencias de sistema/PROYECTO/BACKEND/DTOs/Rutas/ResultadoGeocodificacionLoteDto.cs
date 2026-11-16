using BACKEND.Modelos;

namespace BACKEND.DTOs.Rutas
{
    public class ItemGeocodificacionLoteDto
    {
        public int IdPasajero { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public EstadoGeocodificacion Estado { get; set; }

        public decimal? Latitud { get; set; }

        public decimal? Longitud { get; set; }

        public string? Mensaje { get; set; }
    }

    public class ResultadoGeocodificacionLoteDto
    {
        public int TotalPendientes { get; set; }

        public int Geocodificados { get; set; }

        public int Errores { get; set; }

        public IReadOnlyList<ItemGeocodificacionLoteDto> Resultados { get; set; } =
            Array.Empty<ItemGeocodificacionLoteDto>();
    }
}
