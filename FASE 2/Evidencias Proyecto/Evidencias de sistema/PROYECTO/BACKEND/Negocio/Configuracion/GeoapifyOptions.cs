namespace BACKEND.Negocio.Configuracion
{
    public class GeoapifyOptions
    {
        public const string Seccion = "Geoapify";

        public string BaseUrl { get; set; } = "https://api.geoapify.com/v1";

        public string ApiKey { get; set; } = string.Empty;

        public string PaisCodigo { get; set; } = "cl";

        public string CiudadReferencia { get; set; } = "Puerto Montt";

        public double LatitudReferencia { get; set; } = -41.4693;

        public double LongitudReferencia { get; set; } = -72.9424;
    }
}
