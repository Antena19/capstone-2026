using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Ruteo;
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

        Task<RutaRespuestaDto> CrearDisenoAsync(CrearRutaDisenoSolicitudDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> EditarAsync(string idRuta, EditarRutaSolicitudDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> CambiarEstadoAsync(string idRuta, CambiarEstadoRutaSolicitudDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> AgregarPuntoRecogidaAsync(string idRuta, PuntoRecogidaRutaDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> EditarPuntoRecogidaAsync(string idRuta, string idPunto, PuntoRecogidaRutaDto solicitud, int idAdministrador);

        Task<RutaRespuestaDto> EliminarPuntoRecogidaAsync(string idRuta, string idPunto, int idAdministrador);

        Task<RutaRespuestaDto> AsignarPasajerosPuntoAsync(
            string idRuta,
            string idPunto,
            AsignarPasajerosPuntoSolicitudDto solicitud,
            int idAdministrador);

        Task<RutaRespuestaDto> ReordenarPuntosAsync(
            string idRuta,
            ReordenarPuntosSolicitudDto solicitud,
            int idAdministrador);

        Task<RutaRespuestaDto> DefinirOrigenAsync(
            string idRuta,
            DefinirExtremoRutaSolicitudDto solicitud,
            int idAdministrador);

        Task<RutaRespuestaDto> DefinirDestinoAsync(
            string idRuta,
            DefinirExtremoRutaSolicitudDto solicitud,
            int idAdministrador);

        Task<RutaRespuestaDto> CalcularTrazadoAsync(string idRuta, int idAdministrador, CancellationToken cancellationToken);
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
        private readonly IRuteador _ruteador;
        private readonly ILogger<ServicioRutas> _logger;

        public ServicioRutas(
            IMongoCollection<Ruta> rutas,
            TransporteContext contexto,
            IRuteador ruteador,
            ILogger<ServicioRutas> logger)
        {
            _rutas = rutas;
            _contexto = contexto;
            _ruteador = ruteador;
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

        public async Task<RutaRespuestaDto> CrearDisenoAsync(CrearRutaDisenoSolicitudDto solicitud, int idAdministrador)
        {
            var nombre = RequerirTexto(solicitud.Nombre, "El nombre es obligatorio.");
            if (nombre.Length > 150)
            {
                throw new ExcepcionNegocio("El nombre no puede superar 150 caracteres.");
            }

            await AsegurarEmpresaAsignableAsync(solicitud.EmpresaId, exigirActiva: true);

            var sector = solicitud.Sector?.Trim() ?? string.Empty;
            if (sector.Length > 150)
            {
                throw new ExcepcionNegocio("El sector no puede superar 150 caracteres.");
            }

            var ruta = new Ruta
            {
                Nombre = nombre,
                EmpresaId = solicitud.EmpresaId,
                Sector = sector,
                Origen = null,
                Destino = null,
                PuntosRecogida = [],
                Trazado = null,
                DistanciaEstimadaKm = 0,
                DuracionEstimadaMin = 0,
                Estado = EstadoRegistro.ACTIVO
            };

            await _rutas.InsertOneAsync(ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó la ruta de diseño {IdRuta} para la empresa {EmpresaId}.",
                idAdministrador,
                ruta.Id.ToString(),
                solicitud.EmpresaId);

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

            ruta.PuntosRecogida ??= new List<PuntoRecogidaRuta>();

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
            await AsegurarPuntosEliminadosNoUsadosAsync(idRuta, ruta.PuntosRecogida, datos.PuntosRecogida);

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

        public async Task<RutaRespuestaDto> AgregarPuntoRecogidaAsync(
            string idRuta,
            PuntoRecogidaRutaDto solicitud,
            int idAdministrador)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var punto = NormalizarPuntoRecogida(solicitud, ruta.PuntosRecogida, permitirIdExistente: false);
            ruta.PuntosRecogida.Add(punto);
            if ((solicitud.PasajerosIds ?? []).Count > 0)
            {
                await AsignarPasajerosInternoAsync(ruta, punto, solicitud.PasajerosIds ?? []);
            }

            InvalidarTrazado(ruta);
            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} agregó el punto {IdPunto} a la ruta {IdRuta}.",
                idAdministrador,
                punto.IdPunto,
                idRuta);

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> EditarPuntoRecogidaAsync(
            string idRuta,
            string idPunto,
            PuntoRecogidaRutaDto solicitud,
            int idAdministrador)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var actual = BuscarPunto(ruta, idPunto);
            var resto = ruta.PuntosRecogida.Where(p => !EsMismoIdPunto(p.IdPunto, idPunto)).ToList();

            solicitud.IdPunto = actual.IdPunto;
            var actualizado = NormalizarPuntoRecogida(solicitud, resto, permitirIdExistente: false);
            var ubicacionCambio = !MismasCoordenadas(actual.Ubicacion, actualizado.Ubicacion);
            actual.Nombre = actualizado.Nombre;
            actual.Referencia = actualizado.Referencia;
            actual.Orden = actualizado.Orden;
            actual.Ubicacion = actualizado.Ubicacion;
            actual.PasajerosIds ??= [];
            if (ubicacionCambio)
            {
                InvalidarTrazado(ruta);
            }

            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el punto {IdPunto} de la ruta {IdRuta}.",
                idAdministrador,
                actual.IdPunto,
                idRuta);

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> EliminarPuntoRecogidaAsync(
            string idRuta,
            string idPunto,
            int idAdministrador)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var actual = BuscarPunto(ruta, idPunto);

            if (await PuntoEstaEnUsoAsync(idRuta, actual.IdPunto))
            {
                throw new ExcepcionNegocio(
                    "El punto no puede eliminarse porque está siendo utilizado por servicios.",
                    StatusCodes.Status409Conflict);
            }

            if ((actual.PasajerosIds ?? []).Count > 0)
            {
                throw new ExcepcionNegocio(
                    "Debes desasociar los pasajeros de este punto antes de eliminarlo.");
            }

            ruta.PuntosRecogida.Remove(actual);
            InvalidarTrazado(ruta);
            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} eliminó el punto {IdPunto} de la ruta {IdRuta}.",
                idAdministrador,
                actual.IdPunto,
                idRuta);

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> AsignarPasajerosPuntoAsync(
            string idRuta,
            string idPunto,
            AsignarPasajerosPuntoSolicitudDto solicitud,
            int idAdministrador)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var punto = BuscarPunto(ruta, idPunto);
            await AsignarPasajerosInternoAsync(ruta, punto, solicitud.PasajerosIds ?? []);
            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó los pasajeros del punto {IdPunto} de la ruta {IdRuta}.",
                idAdministrador,
                punto.IdPunto,
                idRuta);

            return Mapear(ruta);
        }

        public async Task<RutaRespuestaDto> ReordenarPuntosAsync(
            string idRuta,
            ReordenarPuntosSolicitudDto solicitud,
            int idAdministrador)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var pedidos = solicitud.Puntos ?? [];
            if (pedidos.Count != ruta.PuntosRecogida.Count)
            {
                throw new ExcepcionNegocio("Debes indicar todos los puntos de la ruta para reordenar.");
            }

            var idsPedido = pedidos
                .Select(p => RequerirTexto(p.IdPunto, "El identificador del punto es obligatorio."))
                .ToList();

            if (idsPedido.Distinct(StringComparer.OrdinalIgnoreCase).Count() != idsPedido.Count)
            {
                throw new ExcepcionNegocio("No se permiten identificadores de punto duplicados.");
            }

            var porId = ruta.PuntosRecogida.ToDictionary(p => p.IdPunto, StringComparer.OrdinalIgnoreCase);
            if (idsPedido.Any(id => !porId.ContainsKey(id)))
            {
                throw new ExcepcionNegocio("Uno o más puntos no pertenecen a esta ruta.");
            }

            if (ruta.PuntosRecogida.Any(p => !idsPedido.Contains(p.IdPunto, StringComparer.OrdinalIgnoreCase)))
            {
                throw new ExcepcionNegocio("Debes indicar todos los puntos de la ruta para reordenar.");
            }

            var ordenados = pedidos
                .OrderBy(p => p.Orden)
                .ThenBy(p => p.IdPunto, StringComparer.OrdinalIgnoreCase)
                .ToList();

            for (var i = 0; i < ordenados.Count; i++)
            {
                porId[ordenados[i].IdPunto].Orden = i + 1;
            }

            InvalidarTrazado(ruta);
            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} reordenó los puntos de la ruta {IdRuta}.",
                idAdministrador,
                idRuta);

            return Mapear(ruta);
        }

        public Task<RutaRespuestaDto> DefinirOrigenAsync(
            string idRuta,
            DefinirExtremoRutaSolicitudDto solicitud,
            int idAdministrador)
        {
            return DefinirExtremoAsync(idRuta, solicitud, esOrigen: true, idAdministrador);
        }

        public Task<RutaRespuestaDto> DefinirDestinoAsync(
            string idRuta,
            DefinirExtremoRutaSolicitudDto solicitud,
            int idAdministrador)
        {
            return DefinirExtremoAsync(idRuta, solicitud, esOrigen: false, idAdministrador);
        }

        public async Task<RutaRespuestaDto> CalcularTrazadoAsync(
            string idRuta,
            int idAdministrador,
            CancellationToken cancellationToken)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var origen = ExtraerWaypoint(ruta.Origen, "origen");
            var destino = ExtraerWaypoint(ruta.Destino, "destino");
            var puntos = (ruta.PuntosRecogida ?? [])
                .OrderBy(p => p.Orden)
                .ToList();

            var waypoints = new List<WaypointRuteo>
            {
                new(origen.Latitud, origen.Longitud, "origen")
            };
            foreach (var punto in puntos)
            {
                var posicion = ExtraerWaypoint(punto.Ubicacion, punto.IdPunto);
                waypoints.Add(new WaypointRuteo(posicion.Latitud, posicion.Longitud, punto.IdPunto));
            }

            waypoints.Add(new WaypointRuteo(destino.Latitud, destino.Longitud, "destino"));

            var calculado = await _ruteador.CalcularAsync(waypoints, cancellationToken);
            if (calculado.Coordenadas.Count < 2)
            {
                throw new ExcepcionNegocio("No fue posible calcular un recorrido entre los puntos seleccionados.");
            }

            ruta.Trazado = new LineaGeoJson
            {
                Type = TipoLineString,
                Coordinates = calculado.Coordenadas.Select(p => new[] { p[0], p[1] }).ToList()
            };
            ruta.DistanciaEstimadaKm = Math.Round(calculado.DistanciaMetros / 1000.0, 3, MidpointRounding.AwayFromZero);
            ruta.DuracionEstimadaMin = calculado.DuracionSegundos <= 0
                ? 0
                : (int)Math.Ceiling(calculado.DuracionSegundos / 60.0);

            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} calculó el trazado de la ruta {IdRuta}. Waypoints {Cantidad}. Distancia {Km} km. Duración {Min} min.",
                idAdministrador,
                idRuta,
                waypoints.Count,
                ruta.DistanciaEstimadaKm,
                ruta.DuracionEstimadaMin);

            return Mapear(ruta);
        }

        private async Task<RutaRespuestaDto> DefinirExtremoAsync(
            string idRuta,
            DefinirExtremoRutaSolicitudDto solicitud,
            bool esOrigen,
            int idAdministrador)
        {
            var ruta = await ObtenerRutaDocumentoAsync(idRuta);
            var nombre = RequerirTexto(solicitud.Nombre, "El nombre es obligatorio.");
            if (nombre.Length > 150)
            {
                throw new ExcepcionNegocio("El nombre no puede superar 150 caracteres.");
            }

            var referencia = string.IsNullOrWhiteSpace(solicitud.Referencia) ? null : solicitud.Referencia.Trim();
            if (referencia is { Length: > 255 })
            {
                throw new ExcepcionNegocio("La referencia no puede superar 255 caracteres.");
            }

            ValidarPosicion([solicitud.Longitud, solicitud.Latitud], esOrigen ? "origen" : "destino");
            var punto = new PuntoGeoJson
            {
                Type = TipoPoint,
                Coordinates = [solicitud.Longitud, solicitud.Latitud]
            };

            if (esOrigen)
            {
                ruta.Origen = punto;
                ruta.NombreOrigen = nombre;
                ruta.ReferenciaOrigen = referencia;
            }
            else
            {
                ruta.Destino = punto;
                ruta.NombreDestino = nombre;
                ruta.ReferenciaDestino = referencia;
            }

            InvalidarTrazado(ruta);
            await _rutas.ReplaceOneAsync(r => r.Id == ruta.Id, ruta);

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el {Extremo} de la ruta {IdRuta}.",
                idAdministrador,
                esOrigen ? "origen" : "destino",
                idRuta);

            return Mapear(ruta);
        }

        private static void InvalidarTrazado(Ruta ruta)
        {
            ruta.Trazado = null;
            ruta.DistanciaEstimadaKm = 0;
            ruta.DuracionEstimadaMin = 0;
        }

        private static (double Latitud, double Longitud) ExtraerWaypoint(PuntoGeoJson? punto, string campo)
        {
            if (punto?.Coordinates is not { Length: 2 })
            {
                throw new ExcepcionNegocio($"La ruta no tiene {campo} definido.");
            }

            ValidarPosicion(punto.Coordinates, campo);
            return (punto.Coordinates[1], punto.Coordinates[0]);
        }

        private static bool MismasCoordenadas(PuntoGeoJson? izquierdo, PuntoGeoJson? derecho)
        {
            if (izquierdo?.Coordinates is not { Length: 2 } || derecho?.Coordinates is not { Length: 2 })
            {
                return false;
            }

            return Math.Abs(izquierdo.Coordinates[0] - derecho.Coordinates[0]) < 1e-7
                && Math.Abs(izquierdo.Coordinates[1] - derecho.Coordinates[1]) < 1e-7;
        }

        private async Task AsignarPasajerosInternoAsync(Ruta ruta, PuntoRecogidaRuta punto, IReadOnlyCollection<int> pasajerosIds)
        {
            var ids = pasajerosIds
                .Distinct()
                .Where(id => id > 0)
                .ToList();

            if (ids.Count > 0)
            {
                var pasajeros = await _contexto.Pasajeros
                    .AsNoTracking()
                    .Where(p => ids.Contains(p.IdPasajero))
                    .Select(p => new { p.IdPasajero, p.IdEmpresa, p.Estado })
                    .ToListAsync();

                if (pasajeros.Count != ids.Count)
                {
                    throw new ExcepcionNegocio("Uno o más pasajeros no existen.");
                }

                if (pasajeros.Any(p => p.Estado != EstadoRegistro.ACTIVO))
                {
                    throw new ExcepcionNegocio("Solo se pueden asociar pasajeros activos.");
                }

                if (pasajeros.Any(p => p.IdEmpresa != ruta.EmpresaId))
                {
                    throw new ExcepcionNegocio("Los pasajeros deben pertenecer a la misma empresa de la ruta.");
                }
            }

            foreach (var otro in ruta.PuntosRecogida)
            {
                otro.PasajerosIds ??= [];
                if (EsMismoIdPunto(otro.IdPunto, punto.IdPunto))
                {
                    continue;
                }

                otro.PasajerosIds.RemoveAll(ids.Contains);
            }

            punto.PasajerosIds = ids;
        }

        private async Task<Ruta> ObtenerRutaDocumentoAsync(string idRuta)
        {
            var objectId = ParsearObjectId(idRuta);
            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();

            if (ruta is null)
            {
                throw new ExcepcionNegocio(MensajeNoExiste, StatusCodes.Status404NotFound);
            }

            ruta.PuntosRecogida ??= new List<PuntoRecogidaRuta>();
            foreach (var punto in ruta.PuntosRecogida)
            {
                punto.PasajerosIds ??= [];
            }

            return ruta;
        }

        private static PuntoRecogidaRuta BuscarPunto(Ruta ruta, string idPunto)
        {
            var identificador = RequerirTexto(idPunto, "El identificador del punto es obligatorio.");
            var punto = ruta.PuntosRecogida.FirstOrDefault(p => EsMismoIdPunto(p.IdPunto, identificador));

            if (punto is null)
            {
                throw new ExcepcionNegocio("El punto de recogida no existe en esta ruta.", StatusCodes.Status404NotFound);
            }

            return punto;
        }

        private async Task AsegurarPuntosEliminadosNoUsadosAsync(
            string idRuta,
            IEnumerable<PuntoRecogidaRuta> anteriores,
            IEnumerable<PuntoRecogidaRuta> posteriores)
        {
            var idsPosteriores = posteriores
                .Select(p => p.IdPunto)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var eliminados = anteriores
                .Select(p => p.IdPunto)
                .Where(id => !string.IsNullOrWhiteSpace(id) && !idsPosteriores.Contains(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var idPunto in eliminados)
            {
                if (await PuntoEstaEnUsoAsync(idRuta, idPunto))
                {
                    throw new ExcepcionNegocio(
                        $"No se puede quitar el punto {idPunto} porque está asignado a pasajeros de servicios de esta ruta.",
                        StatusCodes.Status409Conflict);
                }
            }
        }

        private async Task<bool> PuntoEstaEnUsoAsync(string idRuta, string idPunto)
        {
            var idsServicios = await _contexto.Servicios
                .AsNoTracking()
                .Where(s => s.IdRuta == idRuta)
                .Select(s => s.IdServicio)
                .ToListAsync();

            if (idsServicios.Count == 0)
            {
                return false;
            }

            return await _contexto.PasajerosServicio
                .AsNoTracking()
                .AnyAsync(p => idsServicios.Contains(p.IdServicio) && p.IdPuntoRecogida == idPunto);
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
            List<PuntoRecogidaRutaDto>? puntosRecogida,
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

            var puntos = new List<PuntoRecogidaRuta>();
            foreach (var dto in puntosRecogida ?? new List<PuntoRecogidaRutaDto>())
            {
                puntos.Add(NormalizarPuntoRecogida(dto, puntos, permitirIdExistente: false));
            }

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

        private static PuntoRecogidaRuta NormalizarPuntoRecogida(
            PuntoRecogidaRutaDto solicitud,
            IReadOnlyCollection<PuntoRecogidaRuta> existentes,
            bool permitirIdExistente)
        {
            var nombre = RequerirTexto(solicitud.Nombre, "El nombre del punto de recogida es obligatorio.");
            if (nombre.Length > 150)
            {
                throw new ExcepcionNegocio("El nombre del punto no puede superar 150 caracteres.");
            }

            var referencia = string.IsNullOrWhiteSpace(solicitud.Referencia) ? null : solicitud.Referencia.Trim();
            if (referencia is { Length: > 255 })
            {
                throw new ExcepcionNegocio("La referencia no puede superar 255 caracteres.");
            }

            var orden = solicitud.Orden;
            if (orden <= 0)
            {
                orden = existentes.Count == 0 ? 1 : existentes.Max(p => p.Orden) + 1;
            }
            else if (existentes.Any(p => p.Orden == orden))
            {
                throw new ExcepcionNegocio("El orden del punto de recogida ya está utilizado en esta ruta.");
            }

            var idPunto = solicitud.IdPunto?.Trim() ?? string.Empty;
            if (idPunto.Length == 0)
            {
                idPunto = GenerarIdPunto(existentes);
            }

            if (idPunto.Length > 50)
            {
                throw new ExcepcionNegocio("El identificador del punto no puede superar 50 caracteres.");
            }

            if (!permitirIdExistente && existentes.Any(p => EsMismoIdPunto(p.IdPunto, idPunto)))
            {
                throw new ExcepcionNegocio("Ya existe un punto de recogida con ese identificador en la ruta.");
            }

            return new PuntoRecogidaRuta
            {
                IdPunto = idPunto,
                Nombre = nombre,
                Referencia = referencia,
                Orden = orden,
                Ubicacion = MapearPunto(ValidarPunto(solicitud.Ubicacion, "ubicacion")),
                PasajerosIds = []
            };
        }

        private static string GenerarIdPunto(IEnumerable<PuntoRecogidaRuta> existentes)
        {
            var maximo = 0;
            foreach (var punto in existentes)
            {
                var id = punto.IdPunto?.Trim() ?? string.Empty;
                if (id.StartsWith("PR-", StringComparison.OrdinalIgnoreCase)
                    && int.TryParse(id[3..], out var numero))
                {
                    maximo = Math.Max(maximo, numero);
                }
            }

            return $"PR-{(maximo + 1):D3}";
        }

        private static bool EsMismoIdPunto(string? izquierdo, string? derecho)
        {
            return string.Equals(izquierdo?.Trim(), derecho?.Trim(), StringComparison.OrdinalIgnoreCase);
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

        private static ExtremoRutaDto? MapearExtremo(
            PuntoGeoJson? punto,
            string? nombre,
            string? referencia,
            string fallback)
        {
            var ubicacion = MapearPuntoDto(punto);
            if (ubicacion is null || punto?.Coordinates is not { Length: 2 })
            {
                return null;
            }

            return new ExtremoRutaDto
            {
                Nombre = string.IsNullOrWhiteSpace(nombre) ? fallback : nombre.Trim(),
                Referencia = string.IsNullOrWhiteSpace(referencia) ? null : referencia.Trim(),
                Longitud = punto.Coordinates[0],
                Latitud = punto.Coordinates[1],
                Ubicacion = ubicacion
            };
        }

        private static PuntoGeoJsonDto? MapearPuntoDto(PuntoGeoJson? punto)
        {
            if (punto is null)
            {
                return null;
            }

            return new PuntoGeoJsonDto
            {
                Type = string.IsNullOrWhiteSpace(punto.Type) ? "Point" : punto.Type,
                Coordinates = punto.Coordinates ?? Array.Empty<double>()
            };
        }

        private static LineaGeoJsonDto? MapearTrazadoDto(LineaGeoJson? trazado)
        {
            if (trazado is null)
            {
                return null;
            }

            return new LineaGeoJsonDto
            {
                Type = string.IsNullOrWhiteSpace(trazado.Type) ? "LineString" : trazado.Type,
                Coordinates = trazado.Coordinates ?? []
            };
        }

        private static PuntoRecogidaRutaDto MapearPuntoRecogidaDto(PuntoRecogidaRuta punto)
        {
            var coordenadas = punto.Ubicacion?.Coordinates ?? [];
            var ids = punto.PasajerosIds ?? [];
            return new PuntoRecogidaRutaDto
            {
                IdPunto = punto.IdPunto,
                Nombre = punto.Nombre,
                Referencia = punto.Referencia,
                Orden = punto.Orden,
                Ubicacion = MapearPuntoDto(punto.Ubicacion) ?? new PuntoGeoJsonDto(),
                PasajerosIds = ids.ToList(),
                CantidadPasajeros = ids.Count,
                Longitud = coordenadas.Length == 2 ? coordenadas[0] : null,
                Latitud = coordenadas.Length == 2 ? coordenadas[1] : null
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
                Origen = MapearExtremo(ruta.Origen, ruta.NombreOrigen, ruta.ReferenciaOrigen, "Origen"),
                Destino = MapearExtremo(ruta.Destino, ruta.NombreDestino, ruta.ReferenciaDestino, "Destino"),
                PuntosRecogida = (ruta.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                    .OrderBy(p => p.Orden)
                    .Select(MapearPuntoRecogidaDto)
                    .ToList(),
                Trazado = MapearTrazadoDto(ruta.Trazado),
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
            List<PuntoRecogidaRuta> PuntosRecogida,
            LineaGeoJson Trazado,
            double DistanciaEstimadaKm,
            int DuracionEstimadaMin);
    }
}
