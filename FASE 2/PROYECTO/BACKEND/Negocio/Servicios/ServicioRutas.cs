using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioRutas
    {
        Task<IReadOnlyList<RutaRespuestaDto>> ListarAsync(EstadoRegistro? estado, int? empresaId, string? sector);

        Task<RutaRespuestaDto> ObtenerPorIdAsync(string idRuta);

        Task<RutaRespuestaDto> CrearAsync(CrearRutaSolicitudDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> EditarAsync(string idRuta, EditarRutaSolicitudDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> CambiarEstadoAsync(string idRuta, CambiarEstadoRutaSolicitudDto solicitud, int idAdministrador);
    }

    /// <summary>
    /// Gestión de rutas en MongoDB reservada al rol ADMINISTRADOR.
    /// No elimina físicamente documentos: solo activa o inactiva.
    /// empresaId se valida contra empresa_cliente en MySQL; no existe FK entre ambos motores.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioRutas : IServicioRutas
    {
        private const string TipoPoint = "Point";
        private const string TipoLineString = "LineString";
        private const string MensajeIdInvalido = "El identificador de la ruta no es válido.";
        private const string MensajeNoExiste = "La ruta no existe.";

        private readonly IMongoCollection<Ruta> _rutas;
        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioRutas> _logger;

        public ServicioRutas(
            IMongoCollection<Ruta> rutas,
            TransporteContext contexto,
            ILogger<ServicioRutas> logger)
        {
            _rutas = rutas;
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<RutaRespuestaDto>> ListarAsync(
            EstadoRegistro? estado,
            int? empresaId,
            string? sector)
        {
            var filtro = Builders<Ruta>.Filter.Empty;

            if (estado.HasValue)
            {
                filtro &= Builders<Ruta>.Filter.Eq(r => r.Estado, estado.Value);
            }

            if (empresaId.HasValue)
            {
                filtro &= Builders<Ruta>.Filter.Eq(r => r.EmpresaId, empresaId.Value);
            }

            var sectorFiltro = sector?.Trim();
            if (!string.IsNullOrEmpty(sectorFiltro))
            {
                filtro &= Builders<Ruta>.Filter.Eq(r => r.Sector, sectorFiltro);
            }

            var rutas = await _rutas
                .Find(filtro)
                .SortBy(r => r.Id)
                .ToListAsync();

            return rutas.Select(Mapear).ToList();
        }

        public async Task<RutaRespuestaDto> ObtenerPorIdAsync(string idRuta)
        {
            var objectId = ParsearObjectId(idRuta);
            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();

            if (ruta is null)
            {
                throw new ExcepcionNegocio(MensajeNoExiste, StatusCodes.Status404NotFound);
            }

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> CrearAsync(CrearRutaSolicitudDto solicitud, int idAdministrador)
        {
            var datos = NormalizarYValidar(
                solicitud.Nombre,
                solicitud.EmpresaId,
                solicitud.Sector,
                solicitud.Origen,
                solicitud.Destino,
                solicitud.PuntosRecogida,
                solicitud.Trazado,
                solicitud.DistanciaEstimadaKm,
                solicitud.DuracionEstimadaMin);

            await AsegurarEmpresaAsignableAsync(datos.EmpresaId, exigirActiva: true);

            var ruta = new Ruta
            {
                Nombre = datos.Nombre,
                EmpresaId = datos.EmpresaId,
                Sector = datos.Sector,
                Origen = datos.Origen,
                Destino = datos.Destino,
                PuntosRecogida = datos.PuntosRecogida,
                Trazado = datos.Trazado,
                DistanciaEstimadaKm = datos.DistanciaEstimadaKm,
                DuracionEstimadaMin = datos.DuracionEstimadaMin,
                Estado = EstadoRegistro.ACTIVO
            };

            await _rutas.InsertOneAsync(ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó la ruta {IdRuta}.",
                idAdministrador,
                ruta.Id.ToString());

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> EditarAsync(
            string idRuta,
            EditarRutaSolicitudDto solicitud,
            int idAdministrador)
        {
            var objectId = ParsearObjectId(idRuta);
            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();

            if (ruta is null)
            {
                throw new ExcepcionNegocio(MensajeNoExiste, StatusCodes.Status404NotFound);
            }

            var datos = NormalizarYValidar(
                solicitud.Nombre,
                solicitud.EmpresaId,
                solicitud.Sector,
                solicitud.Origen,
                solicitud.Destino,
                solicitud.PuntosRecogida,
                solicitud.Trazado,
                solicitud.DistanciaEstimadaKm,
                solicitud.DuracionEstimadaMin);

            var cambiaEmpresa = ruta.EmpresaId != datos.EmpresaId;
            await AsegurarEmpresaAsignableAsync(datos.EmpresaId, exigirActiva: cambiaEmpresa);

            ruta.Nombre = datos.Nombre;
            ruta.EmpresaId = datos.EmpresaId;
            ruta.Sector = datos.Sector;
            ruta.Origen = datos.Origen;
            ruta.Destino = datos.Destino;
            ruta.PuntosRecogida = datos.PuntosRecogida;
            ruta.Trazado = datos.Trazado;
            ruta.DistanciaEstimadaKm = datos.DistanciaEstimadaKm;
            ruta.DuracionEstimadaMin = datos.DuracionEstimadaMin;

            await _rutas.ReplaceOneAsync(r => r.Id == objectId, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó la ruta {IdRuta}.",
                idAdministrador,
                idRuta);

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> CambiarEstadoAsync(
            string idRuta,
            CambiarEstadoRutaSolicitudDto solicitud,
            int idAdministrador)
        {
            var objectId = ParsearObjectId(idRuta);
            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();

            if (ruta is null)
            {
                throw new ExcepcionNegocio(MensajeNoExiste, StatusCodes.Status404NotFound);
            }

            ruta.Estado = solicitud.Estado;
            await _rutas.ReplaceOneAsync(r => r.Id == objectId, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado de la ruta {IdRuta} a {Estado}.",
                idAdministrador,
                idRuta,
                solicitud.Estado);

            return Mapear(ruta);
        }

        private async Task AsegurarEmpresaAsignableAsync(int empresaId, bool exigirActiva)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == empresaId);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.");
            }

            if (exigirActiva && empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
            }
        }

        private static ObjectId ParsearObjectId(string idRuta)
        {
            if (!ObjectId.TryParse(idRuta, out var objectId))
            {
                throw new ExcepcionNegocio(MensajeIdInvalido);
            }

            return objectId;
        }

        private static DatosRutaNormalizados NormalizarYValidar(
            string nombre,
            int empresaId,
            string sector,
            PuntoGeoJsonDto origen,
            PuntoGeoJsonDto destino,
            List<PuntoGeoJsonDto>? puntosRecogida,
            LineaGeoJsonDto trazado,
            double distanciaEstimadaKm,
            int duracionEstimadaMin)
        {
            if (distanciaEstimadaKm < 0)
            {
                throw new ExcepcionNegocio("La distancia estimada no puede ser negativa.");
            }

            if (duracionEstimadaMin < 0)
            {
                throw new ExcepcionNegocio("La duración estimada no puede ser negativa.");
            }

            var puntos = (puntosRecogida ?? new List<PuntoGeoJsonDto>())
                .Select((punto, indice) => MapearPunto(ValidarPunto(punto, $"puntosRecogida[{indice}]")))
                .ToList();

            return new DatosRutaNormalizados(
                RequerirTexto(nombre, "El nombre es obligatorio."),
                empresaId,
                RequerirTexto(sector, "El sector es obligatorio."),
                MapearPunto(ValidarPunto(origen, "origen")),
                MapearPunto(ValidarPunto(destino, "destino")),
                puntos,
                MapearLinea(ValidarTrazado(trazado)),
                distanciaEstimadaKm,
                duracionEstimadaMin);
        }

        private static PuntoGeoJsonDto ValidarPunto(PuntoGeoJsonDto? punto, string campo)
        {
            if (punto is null)
            {
                throw new ExcepcionNegocio($"El {campo} es obligatorio.");
            }

            if (!string.Equals(punto.Type?.Trim(), TipoPoint, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio($"El {campo} debe ser un GeoJSON Point.");
            }

            ValidarPosicion(punto.Coordinates, campo);
            punto.Type = TipoPoint;
            return punto;
        }

        private static LineaGeoJsonDto ValidarTrazado(LineaGeoJsonDto? trazado)
        {
            if (trazado is null)
            {
                throw new ExcepcionNegocio("El trazado es obligatorio.");
            }

            if (!string.Equals(trazado.Type?.Trim(), TipoLineString, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio("El trazado debe ser un GeoJSON LineString.");
            }

            if (trazado.Coordinates is null || trazado.Coordinates.Count < 2)
            {
                throw new ExcepcionNegocio("Un LineString debe contener al menos dos posiciones.");
            }

            for (var i = 0; i < trazado.Coordinates.Count; i++)
            {
                ValidarPosicion(trazado.Coordinates[i], $"trazado[{i}]");
            }

            trazado.Type = TipoLineString;
            return trazado;
        }

        private static void ValidarPosicion(double[]? coordenadas, string campo)
        {
            if (coordenadas is null || coordenadas.Length != 2)
            {
                throw new ExcepcionNegocio($"Las coordenadas de {campo} deben ser [longitud, latitud].");
            }

            var longitud = coordenadas[0];
            var latitud = coordenadas[1];

            if (longitud is < -180 or > 180)
            {
                throw new ExcepcionNegocio($"La longitud de {campo} debe estar entre -180 y 180.");
            }

            if (latitud is < -90 or > 90)
            {
                throw new ExcepcionNegocio($"La latitud de {campo} debe estar entre -90 y 90.");
            }
        }

        private static string RequerirTexto(string? valor, string mensaje)
        {
            var texto = valor?.Trim() ?? string.Empty;

            if (texto.Length == 0)
            {
                throw new ExcepcionNegocio(mensaje);
            }

            return texto;
        }

        private static PuntoGeoJson MapearPunto(PuntoGeoJsonDto punto)
        {
            return new PuntoGeoJson
            {
                Type = TipoPoint,
                Coordinates = [punto.Coordinates[0], punto.Coordinates[1]]
            };
        }

        private static LineaGeoJson MapearLinea(LineaGeoJsonDto linea)
        {
            return new LineaGeoJson
            {
                Type = TipoLineString,
                Coordinates = linea.Coordinates
                    .Select(posicion => new[] { posicion[0], posicion[1] })
                    .ToList()
            };
        }

        private static PuntoGeoJsonDto MapearPuntoDto(PuntoGeoJson punto)
        {
            return new PuntoGeoJsonDto
            {
                Type = punto.Type,
                Coordinates = punto.Coordinates
            };
        }

        private static RutaRespuestaDto Mapear(Ruta ruta)
        {
            return new RutaRespuestaDto
            {
                IdRuta = ruta.Id.ToString(),
                Nombre = ruta.Nombre,
                EmpresaId = ruta.EmpresaId,
                Sector = ruta.Sector,
                Origen = MapearPuntoDto(ruta.Origen),
                Destino = MapearPuntoDto(ruta.Destino),
                PuntosRecogida = (ruta.PuntosRecogida ?? new List<PuntoGeoJson>())
                    .Select(MapearPuntoDto)
                    .ToList(),
                Trazado = new LineaGeoJsonDto
                {
                    Type = ruta.Trazado.Type,
                    Coordinates = ruta.Trazado.Coordinates
                },
                DistanciaEstimadaKm = ruta.DistanciaEstimadaKm,
                DuracionEstimadaMin = ruta.DuracionEstimadaMin,
                Estado = ruta.Estado
            };
        }

        private sealed record DatosRutaNormalizados(
            string Nombre,
            int EmpresaId,
            string Sector,
            PuntoGeoJson Origen,
            PuntoGeoJson Destino,
            List<PuntoGeoJson> PuntosRecogida,
            LineaGeoJson Trazado,
            double DistanciaEstimadaKm,
            int DuracionEstimadaMin);
    }
}
