using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Excepciones;
using Microsoft.Extensions.Options;

namespace BACKEND.Negocio.Geocodificacion
{
    public sealed class GeoapifyGeocodificador : IGeocodificador
    {
        private const string MensajeNoConfigurado = "El servicio de geocodificación no está configurado.";
        private const string MensajeSinResultado = "No se encontró una ubicación para esta dirección.";
        private const string MensajeLimite =
            "El servicio de geocodificación alcanzó temporalmente su límite. Intenta nuevamente más tarde.";
        private const string MensajeTimeout = "El servicio de geocodificación no respondió a tiempo.";
        private const string MensajeIndisponible = "No fue posible consultar el servicio de geocodificación.";

        private static readonly JsonSerializerOptions JsonOpciones = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly HttpClient _http;
        private readonly GeoapifyOptions _opciones;
        private readonly ILogger<GeoapifyGeocodificador> _logger;

        public GeoapifyGeocodificador(
            HttpClient http,
            IOptions<GeoapifyOptions> opciones,
            ILogger<GeoapifyGeocodificador> logger)
        {
            _http = http;
            _opciones = opciones.Value;
            _logger = logger;
        }

        public bool EstaConfigurado => !string.IsNullOrWhiteSpace(_opciones.ApiKey);

        public string ConstruirTextoBusqueda(string direccion)
        {
            var texto = direccion.Trim();
            if (texto.Length == 0)
            {
                return texto;
            }

            var ciudad = string.IsNullOrWhiteSpace(_opciones.CiudadReferencia)
                ? "Puerto Montt"
                : _opciones.CiudadReferencia.Trim();

            if (!texto.Contains(ciudad, StringComparison.OrdinalIgnoreCase))
            {
                texto = $"{texto}, {ciudad}";
            }

            if (!texto.Contains("Los Lagos", StringComparison.OrdinalIgnoreCase)
                && !texto.Contains("LosLagos", StringComparison.OrdinalIgnoreCase))
            {
                texto = $"{texto}, Región de Los Lagos";
            }

            if (!texto.Contains("Chile", StringComparison.OrdinalIgnoreCase))
            {
                texto = $"{texto}, Chile";
            }

            return texto;
        }

        public async Task<ResultadoGeocodificacion> BuscarAsync(string direccion, CancellationToken cancellationToken)
        {
            if (!EstaConfigurado)
            {
                throw new ExcepcionNegocio(MensajeNoConfigurado);
            }

            var texto = ConstruirTextoBusqueda(direccion);
            if (texto.Length == 0)
            {
                throw new ExcepcionNegocio("La dirección es obligatoria.");
            }

            var pais = string.IsNullOrWhiteSpace(_opciones.PaisCodigo)
                ? "cl"
                : _opciones.PaisCodigo.Trim().ToLowerInvariant();

            var consulta = new Dictionary<string, string?>
            {
                ["text"] = texto,
                ["filter"] = $"countrycode:{pais}",
                ["bias"] = string.Create(
                    CultureInfo.InvariantCulture,
                    $"proximity:{_opciones.LongitudReferencia},{_opciones.LatitudReferencia}"),
                ["limit"] = "5",
                ["lang"] = "es",
                ["format"] = "json",
                ["apiKey"] = _opciones.ApiKey
            };

            var uri = QueryString.Create(consulta).ToUriComponent();
            if (uri.StartsWith('?'))
            {
                uri = "geocode/search" + uri;
            }

            HttpResponseMessage respuesta;
            try
            {
                respuesta = await _http.GetAsync(uri, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (TaskCanceledException)
            {
                throw new ExcepcionNegocio(MensajeTimeout);
            }
            catch (HttpRequestException)
            {
                throw new ExcepcionNegocio(MensajeIndisponible);
            }

            using (respuesta)
            {
                return await InterpretarRespuestaAsync(respuesta, texto, cancellationToken);
            }
        }

        private async Task<ResultadoGeocodificacion> InterpretarRespuestaAsync(
            HttpResponseMessage respuesta,
            string textoConsultado,
            CancellationToken cancellationToken)
        {
            var status = (int)respuesta.StatusCode;
            if (respuesta.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Geoapify respondió 429 al geocodificar. Texto: {Texto}.", textoConsultado);
                throw new ExcepcionNegocio(MensajeLimite);
            }

            if (respuesta.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Geoapify rechazó la autenticación. Status {Status}.", status);
                throw new ExcepcionNegocio(MensajeNoConfigurado);
            }

            if (status >= 500)
            {
                _logger.LogWarning("Geoapify no está disponible. Status {Status}.", status);
                throw new ExcepcionNegocio(MensajeIndisponible);
            }

            if (!respuesta.IsSuccessStatusCode)
            {
                _logger.LogWarning("Geoapify respondió {Status} al geocodificar. Texto: {Texto}.", status, textoConsultado);
                throw new ExcepcionNegocio(MensajeSinResultado);
            }

            GeoapifySearchResponse? cuerpo;
            try
            {
                await using var stream = await respuesta.Content.ReadAsStreamAsync(cancellationToken);
                cuerpo = await JsonSerializer.DeserializeAsync<GeoapifySearchResponse>(stream, JsonOpciones, cancellationToken);
            }
            catch (JsonException)
            {
                throw new ExcepcionNegocio(MensajeIndisponible);
            }

            var elegido = cuerpo?.Results?
                .FirstOrDefault(r => string.Equals(r.CountryCode, "cl", StringComparison.OrdinalIgnoreCase));

            if (elegido is null || !EsCoordenadaValida(elegido.Lat, elegido.Lon))
            {
                _logger.LogInformation("Geoapify no devolvió un resultado válido en Chile. Texto: {Texto}.", textoConsultado);
                throw new ExcepcionNegocio(MensajeSinResultado);
            }

            var formateada = string.IsNullOrWhiteSpace(elegido.Formatted)
                ? textoConsultado
                : elegido.Formatted.Trim();
            if (formateada.Length > 255)
            {
                formateada = formateada[..255];
            }

            var resultado = new ResultadoGeocodificacion
            {
                Latitud = ToDecimal(elegido.Lat),
                Longitud = ToDecimal(elegido.Lon),
                DireccionFormateada = formateada,
                Confianza = elegido.Rank?.Confidence,
                TipoResultado = elegido.ResultType
            };

            _logger.LogInformation(
                "Geoapify localizó la dirección. Texto: {Texto}. Status: {Status}. Lat: {Latitud}. Lon: {Longitud}. Confianza: {Confianza}. Tipo: {Tipo}.",
                textoConsultado,
                status,
                resultado.Latitud,
                resultado.Longitud,
                resultado.Confianza,
                resultado.TipoResultado);

            return resultado;
        }

        private static bool EsCoordenadaValida(double latitud, double longitud)
        {
            return latitud is >= -90 and <= 90 && longitud is >= -180 and <= 180;
        }

        private static decimal ToDecimal(double valor)
        {
            return Math.Round(Convert.ToDecimal(valor, CultureInfo.InvariantCulture), 7);
        }

        private sealed class GeoapifySearchResponse
        {
            public List<GeoapifyResultado> Results { get; set; } = [];
        }

        private sealed class GeoapifyResultado
        {
            public double Lat { get; set; }

            public double Lon { get; set; }

            public string? Formatted { get; set; }

            [JsonPropertyName("country_code")]
            public string? CountryCode { get; set; }

            [JsonPropertyName("result_type")]
            public string? ResultType { get; set; }

            public GeoapifyRank? Rank { get; set; }
        }

        private sealed class GeoapifyRank
        {
            public double? Confidence { get; set; }
        }
    }
}
