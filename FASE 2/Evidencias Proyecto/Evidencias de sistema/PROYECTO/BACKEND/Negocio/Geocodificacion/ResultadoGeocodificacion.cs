namespace BACKEND.Negocio.Geocodificacion
{
    public sealed class ResultadoGeocodificacion
    {
        public decimal Latitud { get; init; }

        public decimal Longitud { get; init; }

        public string DireccionFormateada { get; init; } = string.Empty;

        public double? Confianza { get; init; }

        public string? TipoResultado { get; init; }
    }
}
