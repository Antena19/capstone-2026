using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Mobile.Pasajero;
using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioOperacionPasajero
    {
        Task<IReadOnlyList<ServicioPasajeroResumenDto>> ListarMisServiciosAsync(
            int idUsuario,
            DateOnly? fecha,
            DateOnly? desde,
            DateOnly? hasta,
            EstadoServicio? estadoServicio,
            EstadoConfirmacionViaje? estadoConfirmacion);

        Task<ProximoServicioPasajeroDto?> ObtenerProximoAsync(int idUsuario);

        Task<ServicioPasajeroDetalleDto> ObtenerDetalleAsync(int idServicio, int idUsuario);

        Task<RutaServicioPasajeroDto> ObtenerRutaAsync(int idServicio, int idUsuario);
    }

    /// <summary>
    /// Consultas Mobile del PASAJERO autenticado. Solo ve sus propias asociaciones y asistencias.
    /// El pasajero se resuelve desde JWT; no confirma ni consulta servicios ajenos.
    /// </summary>
    public class ServicioOperacionPasajero : IServicioOperacionPasajero
    {
        private readonly TransporteContext _contexto;
        private readonly IMongoCollection<Ruta> _rutas;
        private readonly ILogger<ServicioOperacionPasajero> _logger;

        public ServicioOperacionPasajero(
            TransporteContext contexto,
            IMongoCollection<Ruta> rutas,
            ILogger<ServicioOperacionPasajero> logger)
        {
            _contexto = contexto;
            _rutas = rutas;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ServicioPasajeroResumenDto>> ListarMisServiciosAsync(
            int idUsuario,
            DateOnly? fecha,
            DateOnly? desde,
            DateOnly? hasta,
            EstadoServicio? estadoServicio,
            EstadoConfirmacionViaje? estadoConfirmacion)
        {
            var pasajero = await ObtenerPasajeroAsync(idUsuario);

            if (desde.HasValue && hasta.HasValue && desde.Value > hasta.Value)
            {
                throw new ExcepcionNegocio("La fecha inicial no puede ser posterior a la fecha final.");
            }

            var consulta = _contexto.PasajerosServicio
                .AsNoTracking()
                .Include(p => p.Servicio)
                .Where(p => p.IdPasajero == pasajero.IdPasajero
                    && p.Estado == EstadoPasajeroServicio.ACTIVO);

            if (fecha.HasValue)
            {
                consulta = consulta.Where(p => p.Servicio.Fecha == fecha.Value);
            }

            if (desde.HasValue)
            {
                consulta = consulta.Where(p => p.Servicio.Fecha >= desde.Value);
            }

            if (hasta.HasValue)
            {
                consulta = consulta.Where(p => p.Servicio.Fecha <= hasta.Value);
            }

            if (estadoServicio.HasValue)
            {
                consulta = consulta.Where(p => p.Servicio.Estado == estadoServicio.Value);
            }

            if (estadoConfirmacion.HasValue)
            {
                consulta = consulta.Where(p => p.EstadoConfirmacion == estadoConfirmacion.Value);
            }

            var asociaciones = await consulta
                .OrderBy(p => p.Servicio.Fecha)
                .ThenBy(p => p.Servicio.HoraInicio)
                .ToListAsync();

            var rutasPorId = await ObtenerRutasPorIdentificadoresAsync(
                asociaciones.Select(a => a.Servicio.IdRuta));
            var asistenciasPorServicio = await ObtenerAsistenciasPorServicioAsync(
                pasajero.IdPasajero,
                asociaciones.Select(a => a.IdServicio));

            return asociaciones.Select(asociacion =>
            {
                rutasPorId.TryGetValue(asociacion.Servicio.IdRuta, out var ruta);
                asistenciasPorServicio.TryGetValue(asociacion.IdServicio, out var asistencia);
                var punto = ResolverPunto(ruta, asociacion.IdPuntoRecogida);
                return MapearResumen(asociacion, ruta, punto, asistencia);
            }).ToList();
        }

        public async Task<ProximoServicioPasajeroDto?> ObtenerProximoAsync(int idUsuario)
        {
            var pasajero = await ObtenerPasajeroAsync(idUsuario);

            var asociaciones = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Include(p => p.Servicio)
                .Where(p => p.IdPasajero == pasajero.IdPasajero
                    && p.Estado == EstadoPasajeroServicio.ACTIVO
                    && p.Servicio.Estado != EstadoServicio.CANCELADO
                    && p.Servicio.Estado != EstadoServicio.FINALIZADO)
                .ToListAsync();

            if (asociaciones.Count == 0)
            {
                return null;
            }

            var enCurso = asociaciones
                .Where(p => p.Servicio.Estado == EstadoServicio.EN_CURSO)
                .OrderBy(p => p.Servicio.Fecha)
                .ThenBy(p => p.Servicio.HoraInicio)
                .FirstOrDefault();

            var elegido = enCurso ?? asociaciones
                .OrderBy(p => p.Servicio.Fecha)
                .ThenBy(p => p.Servicio.HoraInicio)
                .FirstOrDefault(p =>
                    p.Servicio.Fecha.ToDateTime(p.Servicio.HoraInicio) >= DateTime.UtcNow)
                ?? asociaciones
                    .Where(p => p.Servicio.Estado == EstadoServicio.PROGRAMADO)
                    .OrderBy(p => p.Servicio.Fecha)
                    .ThenBy(p => p.Servicio.HoraInicio)
                    .FirstOrDefault();

            if (elegido is null)
            {
                return null;
            }

            var ruta = await ObtenerRutaOpcionalAsync(elegido.Servicio.IdRuta);
            var asistencia = await _contexto.Asistencias
                .AsNoTracking()
                .FirstOrDefaultAsync(a =>
                    a.IdServicio == elegido.IdServicio && a.IdPasajero == pasajero.IdPasajero);
            var punto = ResolverPunto(ruta, elegido.IdPuntoRecogida);

            return new ProximoServicioPasajeroDto
            {
                IdPasajeroServicio = elegido.IdPasajeroServicio,
                IdServicio = elegido.IdServicio,
                Fecha = elegido.Servicio.Fecha,
                HoraInicio = elegido.Servicio.HoraInicio,
                HoraFin = elegido.Servicio.HoraFin,
                EstadoServicio = elegido.Servicio.Estado,
                TipoServicio = elegido.Servicio.TipoServicio,
                NombreRuta = ruta?.Nombre,
                SectorRuta = ruta?.Sector,
                PuntoRecogida = MapearPuntoAsignado(punto),
                EstadoConfirmacion = elegido.EstadoConfirmacion,
                TieneAsistencia = asistencia is not null,
                EstadoAsistencia = asistencia?.Estado
            };
        }

        public async Task<ServicioPasajeroDetalleDto> ObtenerDetalleAsync(int idServicio, int idUsuario)
        {
            var (pasajero, asociacion) = await ObtenerAsociacionDelPasajeroAsync(idServicio, idUsuario);
            var servicio = asociacion.Servicio;
            var ruta = await ObtenerRutaOpcionalAsync(servicio.IdRuta);
            var punto = ResolverPunto(ruta, asociacion.IdPuntoRecogida);

            var asistencia = await _contexto.Asistencias
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.IdServicio == idServicio && a.IdPasajero == pasajero.IdPasajero);

            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Vehiculo)
                .FirstOrDefaultAsync(a =>
                    a.IdServicio == idServicio && a.Estado == EstadoAsignacionServicio.ACTIVA);

            return new ServicioPasajeroDetalleDto
            {
                IdPasajeroServicio = asociacion.IdPasajeroServicio,
                IdServicio = servicio.IdServicio,
                Fecha = servicio.Fecha,
                HoraInicio = servicio.HoraInicio,
                HoraFin = servicio.HoraFin,
                FechaHoraInicioReal = servicio.FechaHoraInicioReal,
                FechaHoraFinReal = servicio.FechaHoraFinReal,
                TipoServicio = servicio.TipoServicio,
                Estado = servicio.Estado,
                Empresa = new EmpresaServicioPasajeroDto
                {
                    IdEmpresa = servicio.Empresa.IdEmpresa,
                    RazonSocial = servicio.Empresa.RazonSocial
                },
                Ruta = ruta is null
                    ? null
                    : new RutaServicioPasajeroResumenDto
                    {
                        IdRuta = ruta.Id.ToString(),
                        Nombre = ruta.Nombre,
                        Sector = ruta.Sector,
                        DistanciaEstimadaKm = ruta.DistanciaEstimadaKm,
                        DuracionEstimadaMin = ruta.DuracionEstimadaMin
                    },
                PuntoRecogida = MapearPuntoAsignado(punto),
                EstadoConfirmacion = asociacion.EstadoConfirmacion,
                FechaConfirmacion = asociacion.FechaConfirmacion,
                Asistencia = new AsistenciaPasajeroDto
                {
                    TieneAsistencia = asistencia is not null,
                    Metodo = asistencia?.Metodo,
                    TipoAsistencia = asistencia?.TipoAsistencia,
                    EstadoAsistencia = asistencia?.Estado,
                    FechaHora = asistencia?.FechaHora
                },
                Vehiculo = asignacion is null
                    ? null
                    : new VehiculoServicioPasajeroDto
                    {
                        Patente = asignacion.Vehiculo.Patente,
                        Tipo = asignacion.Vehiculo.Tipo,
                        Marca = asignacion.Vehiculo.Marca,
                        Modelo = asignacion.Vehiculo.Modelo
                    }
            };
        }

        public async Task<RutaServicioPasajeroDto> ObtenerRutaAsync(int idServicio, int idUsuario)
        {
            var (_, asociacion) = await ObtenerAsociacionDelPasajeroAsync(idServicio, idUsuario);
            var ruta = await ObtenerRutaOpcionalAsync(asociacion.Servicio.IdRuta);

            if (ruta is null)
            {
                throw new ExcepcionNegocio("La ruta del servicio no está disponible.", StatusCodes.Status404NotFound);
            }

            return new RutaServicioPasajeroDto
            {
                IdRuta = ruta.Id.ToString(),
                Nombre = ruta.Nombre,
                Sector = ruta.Sector,
                Origen = MapearPuntoGeo(ruta.Origen),
                Destino = MapearPuntoGeo(ruta.Destino),
                PuntosRecogida = (ruta.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                    .OrderBy(p => p.Orden)
                    .Select(MapearPuntoRuta)
                    .ToList(),
                Trazado = new LineaGeoJsonDto
                {
                    Type = string.IsNullOrWhiteSpace(ruta.Trazado?.Type) ? "LineString" : ruta.Trazado.Type,
                    Coordinates = ruta.Trazado?.Coordinates ?? new List<double[]>()
                },
                DistanciaEstimadaKm = ruta.DistanciaEstimadaKm,
                DuracionEstimadaMin = ruta.DuracionEstimadaMin,
                Estado = ruta.Estado,
                IdPuntoRecogidaAsignado = string.IsNullOrWhiteSpace(asociacion.IdPuntoRecogida)
                    ? null
                    : asociacion.IdPuntoRecogida
            };
        }

        private async Task<Pasajero> ObtenerPasajeroAsync(int idUsuario)
        {
            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdUsuario == idUsuario);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio(
                    "No hay un pasajero asociado a la cuenta autenticada.",
                    StatusCodes.Status403Forbidden);
            }

            return pasajero;
        }

        private async Task<(Pasajero Pasajero, PasajeroServicio Asociacion)> ObtenerAsociacionDelPasajeroAsync(
            int idServicio,
            int idUsuario)
        {
            var pasajero = await ObtenerPasajeroAsync(idUsuario);

            var servicioExiste = await _contexto.Servicios
                .AsNoTracking()
                .AnyAsync(s => s.IdServicio == idServicio);

            if (!servicioExiste)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            var asociacion = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Include(p => p.Servicio)
                    .ThenInclude(s => s.Empresa)
                .FirstOrDefaultAsync(p =>
                    p.IdServicio == idServicio
                    && p.IdPasajero == pasajero.IdPasajero
                    && p.Estado == EstadoPasajeroServicio.ACTIVO);

            if (asociacion is null)
            {
                throw new ExcepcionNegocio(
                    "No tiene un servicio planificado asociado a esta cuenta.",
                    StatusCodes.Status403Forbidden);
            }

            return (pasajero, asociacion);
        }

        private async Task<Dictionary<int, Asistencia>> ObtenerAsistenciasPorServicioAsync(
            int idPasajero,
            IEnumerable<int> idsServicio)
        {
            var ids = idsServicio.Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<int, Asistencia>();
            }

            var asistencias = await _contexto.Asistencias
                .AsNoTracking()
                .Where(a => a.IdPasajero == idPasajero && ids.Contains(a.IdServicio))
                .ToListAsync();

            return asistencias.ToDictionary(a => a.IdServicio);
        }

        private async Task<Dictionary<string, Ruta>> ObtenerRutasPorIdentificadoresAsync(
            IEnumerable<string> identificadores)
        {
            var objectIds = identificadores
                .Distinct()
                .Select(id => ObjectId.TryParse(id, out var objectId) ? objectId : ObjectId.Empty)
                .Where(id => id != ObjectId.Empty)
                .ToList();

            if (objectIds.Count == 0)
            {
                return new Dictionary<string, Ruta>(StringComparer.Ordinal);
            }

            var rutas = await _rutas
                .Find(Builders<Ruta>.Filter.In(r => r.Id, objectIds))
                .ToListAsync();

            return rutas.ToDictionary(r => r.Id.ToString(), StringComparer.Ordinal);
        }

        private async Task<Ruta?> ObtenerRutaOpcionalAsync(string idRuta)
        {
            if (!ObjectId.TryParse(idRuta, out var objectId))
            {
                _logger.LogWarning("El servicio referencia un identificador de ruta no válido.");
                return null;
            }

            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();
            if (ruta is null)
            {
                _logger.LogWarning("La ruta referenciada por el servicio no está disponible en MongoDB.");
            }

            return ruta;
        }

        private PuntoRecogidaRuta? ResolverPunto(Ruta? ruta, string? idPuntoRecogida)
        {
            if (ruta is null || string.IsNullOrWhiteSpace(idPuntoRecogida))
            {
                return null;
            }

            var punto = (ruta.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                .FirstOrDefault(p =>
                    string.Equals(p.IdPunto?.Trim(), idPuntoRecogida.Trim(), StringComparison.OrdinalIgnoreCase));

            if (punto is null)
            {
                _logger.LogWarning("El punto de recogida asignado ya no está disponible en la ruta.");
            }

            return punto;
        }

        private static ServicioPasajeroResumenDto MapearResumen(
            PasajeroServicio asociacion,
            Ruta? ruta,
            PuntoRecogidaRuta? punto,
            Asistencia? asistencia)
        {
            return new ServicioPasajeroResumenDto
            {
                IdPasajeroServicio = asociacion.IdPasajeroServicio,
                IdServicio = asociacion.IdServicio,
                Fecha = asociacion.Servicio.Fecha,
                HoraInicio = asociacion.Servicio.HoraInicio,
                HoraFin = asociacion.Servicio.HoraFin,
                TipoServicio = asociacion.Servicio.TipoServicio,
                EstadoServicio = asociacion.Servicio.Estado,
                EstadoConfirmacion = asociacion.EstadoConfirmacion,
                FechaConfirmacion = asociacion.FechaConfirmacion,
                IdRuta = asociacion.Servicio.IdRuta,
                NombreRuta = ruta?.Nombre,
                SectorRuta = ruta?.Sector,
                IdPuntoRecogida = asociacion.IdPuntoRecogida,
                NombrePuntoRecogida = punto?.Nombre,
                ReferenciaPuntoRecogida = punto?.Referencia,
                OrdenPuntoRecogida = punto?.Orden,
                UbicacionPuntoRecogida = punto is null ? null : MapearPuntoGeo(punto.Ubicacion),
                TieneAsistencia = asistencia is not null,
                TipoAsistencia = asistencia?.TipoAsistencia,
                EstadoAsistencia = asistencia?.Estado,
                FechaHoraAsistencia = asistencia?.FechaHora
            };
        }

        private static PuntoRecogidaPasajeroDto? MapearPuntoAsignado(PuntoRecogidaRuta? punto)
        {
            if (punto is null)
            {
                return null;
            }

            return new PuntoRecogidaPasajeroDto
            {
                IdPunto = punto.IdPunto,
                Nombre = punto.Nombre,
                Referencia = punto.Referencia,
                Orden = punto.Orden,
                Ubicacion = MapearPuntoGeo(punto.Ubicacion)
            };
        }

        private static PuntoRecogidaRutaDto MapearPuntoRuta(PuntoRecogidaRuta punto)
        {
            return new PuntoRecogidaRutaDto
            {
                IdPunto = punto.IdPunto,
                Nombre = punto.Nombre,
                Referencia = punto.Referencia,
                Orden = punto.Orden,
                Ubicacion = MapearPuntoGeo(punto.Ubicacion)
            };
        }

        private static PuntoGeoJsonDto MapearPuntoGeo(PuntoGeoJson? punto)
        {
            return new PuntoGeoJsonDto
            {
                Type = string.IsNullOrWhiteSpace(punto?.Type) ? "Point" : punto.Type,
                Coordinates = punto?.Coordinates ?? Array.Empty<double>()
            };
        }
    }
}
