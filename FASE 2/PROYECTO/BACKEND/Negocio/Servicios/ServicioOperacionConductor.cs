using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Mobile.Conductor;
using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioOperacionConductor
    {
        Task<IReadOnlyList<ServicioConductorResumenDto>> ListarMisServiciosAsync(
            int idUsuario,
            DateOnly? fecha,
            EstadoServicio? estado,
            DateOnly? desde,
            DateOnly? hasta);

        Task<ServicioConductorDetalleDto> ObtenerDetalleAsync(int idServicio, int idUsuario);

        Task<RutaServicioConductorDto> ObtenerRutaAsync(int idServicio, int idUsuario);

        Task<IReadOnlyList<PasajeroServicioConductorDto>> ListarPasajerosAsync(int idServicio, int idUsuario);
    }

    /// <summary>
    /// Consultas operacionales del CONDUCTOR autenticado. Solo lectura de pasajeros y asistencias.
    /// El conductor se resuelve desde JWT; no opera servicios de otros conductores.
    /// </summary>
    public class ServicioOperacionConductor : IServicioOperacionConductor
    {
        private readonly TransporteContext _contexto;
        private readonly IMongoCollection<Ruta> _rutas;
        private readonly ILogger<ServicioOperacionConductor> _logger;

        public ServicioOperacionConductor(
            TransporteContext contexto,
            IMongoCollection<Ruta> rutas,
            ILogger<ServicioOperacionConductor> logger)
        {
            _contexto = contexto;
            _rutas = rutas;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ServicioConductorResumenDto>> ListarMisServiciosAsync(
            int idUsuario,
            DateOnly? fecha,
            EstadoServicio? estado,
            DateOnly? desde,
            DateOnly? hasta)
        {
            var conductor = await ObtenerConductorAsync(idUsuario);

            if (desde.HasValue && hasta.HasValue && desde.Value > hasta.Value)
            {
                throw new ExcepcionNegocio("La fecha inicial no puede ser posterior a la fecha final.");
            }

            var consulta = _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Servicio)
                .Include(a => a.Vehiculo)
                .Where(a => a.IdConductor == conductor.IdConductor
                    && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (fecha.HasValue)
            {
                consulta = consulta.Where(a => a.Servicio.Fecha == fecha.Value);
            }

            if (desde.HasValue)
            {
                consulta = consulta.Where(a => a.Servicio.Fecha >= desde.Value);
            }

            if (hasta.HasValue)
            {
                consulta = consulta.Where(a => a.Servicio.Fecha <= hasta.Value);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(a => a.Servicio.Estado == estado.Value);
            }

            var asignaciones = await consulta
                .OrderBy(a => a.Servicio.Fecha)
                .ThenBy(a => a.Servicio.HoraInicio)
                .ToListAsync();

            var rutasPorId = await ObtenerRutasPorIdentificadoresAsync(
                asignaciones.Select(a => a.Servicio.IdRuta));

            return asignaciones.Select(asignacion =>
            {
                rutasPorId.TryGetValue(asignacion.Servicio.IdRuta, out var ruta);
                return new ServicioConductorResumenDto
                {
                    IdServicio = asignacion.IdServicio,
                    Fecha = asignacion.Servicio.Fecha,
                    HoraInicio = asignacion.Servicio.HoraInicio,
                    HoraFin = asignacion.Servicio.HoraFin,
                    TipoServicio = asignacion.Servicio.TipoServicio,
                    Estado = asignacion.Servicio.Estado,
                    IdRuta = asignacion.Servicio.IdRuta,
                    NombreRuta = ruta?.Nombre,
                    SectorRuta = ruta?.Sector,
                    IdVehiculo = asignacion.IdVehiculo,
                    PatenteVehiculo = asignacion.Vehiculo.Patente,
                    TipoVehiculo = asignacion.Vehiculo.Tipo
                };
            }).ToList();
        }

        public async Task<ServicioConductorDetalleDto> ObtenerDetalleAsync(int idServicio, int idUsuario)
        {
            var asignacion = await ObtenerAsignacionOperativaAsync(idServicio, idUsuario);
            var servicio = asignacion.Servicio;
            var ruta = await ObtenerRutaOpcionalAsync(servicio.IdRuta);

            var planificados = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Where(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO)
                .Select(p => p.EstadoConfirmacion)
                .ToListAsync();

            var asistencias = await _contexto.Asistencias
                .AsNoTracking()
                .Where(a => a.IdServicio == idServicio)
                .Select(a => new { a.TipoAsistencia, a.Estado })
                .ToListAsync();

            return new ServicioConductorDetalleDto
            {
                IdServicio = servicio.IdServicio,
                Fecha = servicio.Fecha,
                HoraInicio = servicio.HoraInicio,
                HoraFin = servicio.HoraFin,
                FechaHoraInicioReal = servicio.FechaHoraInicioReal,
                FechaHoraFinReal = servicio.FechaHoraFinReal,
                TipoServicio = servicio.TipoServicio,
                Estado = servicio.Estado,
                Empresa = new EmpresaServicioConductorDto
                {
                    IdEmpresa = servicio.Empresa.IdEmpresa,
                    RazonSocial = servicio.Empresa.RazonSocial
                },
                Vehiculo = new VehiculoServicioConductorDto
                {
                    IdVehiculo = asignacion.Vehiculo.IdVehiculo,
                    Patente = asignacion.Vehiculo.Patente,
                    Tipo = asignacion.Vehiculo.Tipo,
                    Marca = asignacion.Vehiculo.Marca,
                    Modelo = asignacion.Vehiculo.Modelo,
                    Capacidad = asignacion.Vehiculo.Capacidad
                },
                Ruta = ruta is null
                    ? null
                    : new RutaServicioConductorResumenDto
                    {
                        IdRuta = ruta.Id.ToString(),
                        Nombre = ruta.Nombre,
                        Sector = ruta.Sector,
                        DistanciaEstimadaKm = ruta.DistanciaEstimadaKm,
                        DuracionEstimadaMin = ruta.DuracionEstimadaMin
                    },
                ResumenPasajeros = new ResumenPasajerosServicioDto
                {
                    TotalPlanificados = planificados.Count,
                    TotalConfirmados = planificados.Count(c => c == EstadoConfirmacionViaje.CONFIRMADO),
                    TotalPendientes = planificados.Count(c => c == EstadoConfirmacionViaje.PENDIENTE),
                    TotalRechazados = planificados.Count(c => c == EstadoConfirmacionViaje.RECHAZADO),
                    TotalAsistenciasValidas = asistencias.Count(a => a.Estado == EstadoAsistencia.VALIDA),
                    TotalNoPlanificados = asistencias.Count(a => a.TipoAsistencia == TipoAsistencia.NO_PLANIFICADA),
                    TotalProvisionales = asistencias.Count(a => a.Estado == EstadoAsistencia.PROVISIONAL)
                }
            };
        }

        public async Task<RutaServicioConductorDto> ObtenerRutaAsync(int idServicio, int idUsuario)
        {
            var asignacion = await ObtenerAsignacionOperativaAsync(idServicio, idUsuario);
            var ruta = await ObtenerRutaOpcionalAsync(asignacion.Servicio.IdRuta);

            if (ruta is null)
            {
                throw new ExcepcionNegocio("La ruta del servicio no está disponible.", StatusCodes.Status404NotFound);
            }

            return MapearRutaMapa(ruta);
        }

        public async Task<IReadOnlyList<PasajeroServicioConductorDto>> ListarPasajerosAsync(
            int idServicio,
            int idUsuario)
        {
            var asignacion = await ObtenerAsignacionOperativaAsync(idServicio, idUsuario);
            var ruta = await ObtenerRutaOpcionalAsync(asignacion.Servicio.IdRuta);
            var puntosPorId = (ruta?.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                .Where(p => !string.IsNullOrWhiteSpace(p.IdPunto))
                .GroupBy(p => p.IdPunto.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var planificados = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Include(p => p.Pasajero)
                .Where(p => p.IdServicio == idServicio)
                .ToListAsync();

            var asistencias = await _contexto.Asistencias
                .AsNoTracking()
                .Include(a => a.Pasajero)
                .Where(a => a.IdServicio == idServicio)
                .ToListAsync();

            var asistenciaPorPasajero = asistencias.ToDictionary(a => a.IdPasajero);
            var idsPlanificados = planificados.Select(p => p.IdPasajero).ToHashSet();

            var resultado = planificados
                .OrderBy(p => p.Pasajero.Nombre)
                .Select(registro => MapearPasajeroPlanificado(registro, asistenciaPorPasajero, puntosPorId))
                .ToList();

            var noPlanificados = asistencias
                .Where(a => !idsPlanificados.Contains(a.IdPasajero))
                .OrderBy(a => a.FechaHora)
                .ThenBy(a => a.IdAsistencia)
                .Select(MapearPasajeroNoPlanificado);

            resultado.AddRange(noPlanificados);
            return resultado;
        }

        private async Task<Conductor> ObtenerConductorAsync(int idUsuario)
        {
            var conductor = await _contexto.Conductores
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdUsuario == idUsuario);

            if (conductor is null)
            {
                throw new ExcepcionNegocio(
                    "No hay un conductor asociado a la cuenta autenticada.",
                    StatusCodes.Status403Forbidden);
            }

            return conductor;
        }

        private async Task<AsignacionServicio> ObtenerAsignacionOperativaAsync(int idServicio, int idUsuario)
        {
            var conductor = await ObtenerConductorAsync(idUsuario);

            var servicioExiste = await _contexto.Servicios
                .AsNoTracking()
                .AnyAsync(s => s.IdServicio == idServicio);

            if (!servicioExiste)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Servicio)
                    .ThenInclude(s => s.Empresa)
                .Include(a => a.Vehiculo)
                .FirstOrDefaultAsync(a =>
                    a.IdServicio == idServicio
                    && a.IdConductor == conductor.IdConductor
                    && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (asignacion is null)
            {
                throw new ExcepcionNegocio(
                    "No tiene una asignación activa para este servicio.",
                    StatusCodes.Status403Forbidden);
            }

            return asignacion;
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

        private static PasajeroServicioConductorDto MapearPasajeroPlanificado(
            PasajeroServicio registro,
            IReadOnlyDictionary<int, Asistencia> asistencias,
            IReadOnlyDictionary<string, PuntoRecogidaRuta> puntosPorId)
        {
            asistencias.TryGetValue(registro.IdPasajero, out var asistencia);
            PuntoRecogidaRuta? punto = null;
            if (!string.IsNullOrWhiteSpace(registro.IdPuntoRecogida))
            {
                puntosPorId.TryGetValue(registro.IdPuntoRecogida.Trim(), out punto);
            }

            return new PasajeroServicioConductorDto
            {
                IdPasajero = registro.IdPasajero,
                Nombre = registro.Pasajero.Nombre,
                TipoParticipacion = TipoParticipacionConductor.PLANIFICADO,
                EstadoConfirmacion = registro.EstadoConfirmacion,
                FechaConfirmacion = registro.FechaConfirmacion,
                EstadoPasajeroServicio = registro.Estado,
                TieneAsistencia = asistencia is not null,
                TipoAsistencia = asistencia?.TipoAsistencia,
                EstadoAsistencia = asistencia?.Estado,
                FechaHoraAsistencia = asistencia?.FechaHora,
                IdPuntoRecogida = registro.IdPuntoRecogida,
                NombrePuntoRecogida = punto?.Nombre,
                ReferenciaPuntoRecogida = punto?.Referencia,
                OrdenPuntoRecogida = punto?.Orden,
                UbicacionPuntoRecogida = punto is null ? null : MapearPunto(punto.Ubicacion)
            };
        }

        private static PasajeroServicioConductorDto MapearPasajeroNoPlanificado(Asistencia asistencia)
        {
            return new PasajeroServicioConductorDto
            {
                IdPasajero = asistencia.IdPasajero,
                Nombre = asistencia.Pasajero.Nombre,
                TipoParticipacion = TipoParticipacionConductor.NO_PLANIFICADO,
                EstadoConfirmacion = null,
                FechaConfirmacion = null,
                EstadoPasajeroServicio = null,
                TieneAsistencia = true,
                TipoAsistencia = asistencia.TipoAsistencia,
                EstadoAsistencia = asistencia.Estado,
                FechaHoraAsistencia = asistencia.FechaHora
            };
        }

        private static RutaServicioConductorDto MapearRutaMapa(Ruta ruta)
        {
            return new RutaServicioConductorDto
            {
                IdRuta = ruta.Id.ToString(),
                Nombre = ruta.Nombre,
                Sector = ruta.Sector,
                Origen = MapearPunto(ruta.Origen),
                Destino = MapearPunto(ruta.Destino),
                PuntosRecogida = (ruta.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                    .OrderBy(p => p.Orden)
                    .Select(MapearPuntoRecogida)
                    .ToList(),
                Trazado = new LineaGeoJsonDto
                {
                    Type = string.IsNullOrWhiteSpace(ruta.Trazado?.Type) ? "LineString" : ruta.Trazado.Type,
                    Coordinates = ruta.Trazado?.Coordinates ?? new List<double[]>()
                },
                DistanciaEstimadaKm = ruta.DistanciaEstimadaKm,
                DuracionEstimadaMin = ruta.DuracionEstimadaMin,
                Estado = ruta.Estado
            };
        }

        private static PuntoRecogidaRutaDto MapearPuntoRecogida(PuntoRecogidaRuta punto)
        {
            return new PuntoRecogidaRutaDto
            {
                IdPunto = punto.IdPunto,
                Nombre = punto.Nombre,
                Referencia = punto.Referencia,
                Orden = punto.Orden,
                Ubicacion = MapearPunto(punto.Ubicacion)
            };
        }

        private static PuntoGeoJsonDto MapearPunto(PuntoGeoJson? punto)
        {
            return new PuntoGeoJsonDto
            {
                Type = string.IsNullOrWhiteSpace(punto?.Type) ? "Point" : punto.Type,
                Coordinates = punto?.Coordinates ?? Array.Empty<double>()
            };
        }
    }
}
