using System.Globalization;
using System.Net;
using System.Text.Json;
using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Excepciones;
using Microsoft.Extensions.Options;

namespace BACKEND.Negocio.Ruteo
{
    public sealed class GeoapifyRuteador : IRuteador
    {
        private const string MensajeNoConfigurado = "El servicio de rutas no está configurado.";
        private const string MensajeLimite =
            "El servicio de rutas alcanzó temporalmente su límite. Intenta nuevamente más tarde.";
        private const string MensajeTimeout = "El servicio de rutas no respondió a tiempo.";
        private const string MensajeIndisponible = "No fue posible consultar el servicio de rutas.";
        private const string MensajeSinRuta =
            "No fue posible calcular un recorrido entre los puntos seleccionados.";

        private static readonly JsonSerializerOptions JsonOpciones = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly HttpClient _http;
        private readonly GeoapifyOptions _opciones;
        private readonly ILogger<GeoapifyRuteador> _logger;

        public GeoapifyRuteador(
            HttpClient http,
            IOptions<GeoapifyOptions> opciones,
            ILogger<GeoapifyRuteador> logger)
        {
            _http = http;
            _opciones = opciones.Value;
            _logger = logger;
        }

        public bool EstaConfigurado => !string.IsNullOrWhiteSpace(_opciones.ApiKey);

        public async Task<ResultadoRuteo> CalcularAsync(
            IReadOnlyList<WaypointRuteo> waypoints,
            CancellationToken cancellationToken)
        {
            if (!EstaConfigurado)
            {
                throw new ExcepcionNegocio(MensajeNoConfigurado);
            }

            if (waypoints.Count < 2)
            {
                throw new ExcepcionNegocio("Se necesitan origen y destino para calcular el recorrido.");
            }

            var pares = waypoints
                .Select(w => string.Create(
                    CultureInfo.InvariantCulture,
                    $"{w.Latitud},{w.Longitud}"))
                .ToList();

            var orden = string.Join(" → ", waypoints.Select(w => w.Etiqueta));
            _logger.LogInformation(
                "Ruteo Geoapify. Waypoints: {Cantidad}. Orden: {Orden}.",
                waypoints.Count,
                orden);

            var consulta = new Dictionary<string, string?>
            {
                ["waypoints"] = string.Join('|', pares),
                ["mode"] = "drive",
                ["format"] = "geojson",
                ["apiKey"] = _opciones.ApiKey
            };

            var uri = QueryString.Create(consulta).ToUriComponent();
            if (uri.StartsWith('?'))
            {
                uri = "routing" + uri;
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
                return await InterpretarRespuestaAsync(respuesta, waypoints.Count, cancellationToken);
            }
        }

        private async Task<ResultadoRuteo> InterpretarRespuestaAsync(
            HttpResponseMessage respuesta,
            int cantidadWaypoints,
            CancellationToken cancellationToken)
        {
            var status = (int)respuesta.StatusCode;
            if (respuesta.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Geoapify Routing respondió 429. Waypoints: {Cantidad}.", cantidadWaypoints);
                throw new ExcepcionNegocio(MensajeLimite);
            }

            if (respuesta.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Geoapify Routing rechazó la autenticación. Status {Status}.", status);
                throw new ExcepcionNegocio(MensajeNoConfigurado);
            }

            if (status >= 500)
            {
                _logger.LogWarning("Geoapify Routing no está disponible. Status {Status}.", status);
                throw new ExcepcionNegocio(MensajeIndisponible);
            }

            if (!respuesta.IsSuccessStatusCode)
            {
                _logger.LogWarning("Geoapify Routing respondió {Status}. Waypoints: {Cantidad}.", status, cantidadWaypoints);
                throw new ExcepcionNegocio(MensajeSinRuta);
            }

            GeoapifyRoutingResponse? cuerpo;
            try
            {
                await using var stream = await respuesta.Content.ReadAsStreamAsync(cancellationToken);
                cuerpo = await JsonSerializer.DeserializeAsync<GeoapifyRoutingResponse>(stream, JsonOpciones, cancellationToken);
            }
            catch (JsonException)
            {
                throw new ExcepcionNegocio(MensajeIndisponible);
            }

            var feature = cuerpo?.Features?.FirstOrDefault();
            var coordenadas = ExtraerCoordenadas(feature?.Geometry);
            if (coordenadas.Count < 2)
            {
                _logger.LogWarning(
                    "Geoapify Routing devolvió geometría inválida. Status {Status}. Vértices: {Vertices}.",
                    status,
                    coordenadas.Count);
                throw new ExcepcionNegocio(MensajeSinRuta);
            }

            var distancia = feature?.Properties?.Distance ?? 0;
            var duracion = feature?.Properties?.Time ?? 0;
            _logger.LogInformation(
                "Geoapify Routing calculó el recorrido. Status {Status}. Waypoints {Cantidad}. Distancia {Metros} m. Duración {Segundos} s. Vértices {Vertices}.",
                status,
                cantidadWaypoints,
                distancia,
                duracion,
                coordenadas.Count);

            return new ResultadoRuteo
            {
                Coordenadas = coordenadas,
                DistanciaMetros = distancia,
                DuracionSegundos = duracion
            };
        }

        private static List<double[]> ExtraerCoordenadas(GeoapifyGeometry? geometria)
        {
            var puntos = new List<double[]>();
            if (geometria is null || geometria.Coordinates.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return puntos;
            }

            var tipo = geometria.Type?.Trim();
            if (string.Equals(tipo, "LineString", StringComparison.OrdinalIgnoreCase))
            {
                AgregarLinea(puntos, geometria.Coordinates);
            }
            else if (string.Equals(tipo, "MultiLineString", StringComparison.OrdinalIgnoreCase))
            {
                foreach (var linea in geometria.Coordinates.EnumerateArray())
                {
                    AgregarLinea(puntos, linea);
                }
            }

            return puntos;
        }

        private static void AgregarLinea(List<double[]> destino, JsonElement linea)
        {
            if (linea.ValueKind != JsonValueKind.Array)
            {
                return;
            }

            foreach (var posicion in linea.EnumerateArray())
            {
                if (posicion.ValueKind != JsonValueKind.Array || posicion.GetArrayLength() < 2)
                {
                    continue;
                }

                var longitud = posicion[0].GetDouble();
                var latitud = posicion[1].GetDouble();
                if (longitud is < -180 or > 180 || latitud is < -90 or > 90)
                {
                    continue;
                }

                if (destino.Count > 0
                    && Math.Abs(destino[^1][0] - longitud) < 1e-9
                    && Math.Abs(destino[^1][1] - latitud) < 1e-9)
                {
                    continue;
                }

                destino.Add([longitud, latitud]);
            }
        }

        private sealed class GeoapifyRoutingResponse
        {
            public List<GeoapifyFeature> Features { get; set; } = [];
        }

        private sealed class GeoapifyFeature
        {
            public GeoapifyGeometry? Geometry { get; set; }

            public GeoapifyProperties? Properties { get; set; }
        }

        private sealed class GeoapifyGeometry
        {
            public string? Type { get; set; }

            public JsonElement Coordinates { get; set; }
        }

        private sealed class GeoapifyProperties
        {
            public double Distance { get; set; }

            public double Time { get; set; }
        }
    }
}
