using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Dashboard;
using BACKEND.DTOs.Reportes;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Globalization;
using System.Text.RegularExpressions;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioMetricasOperacionales
    {
        DateOnly HoyUtc { get; }

        (DateOnly Desde, DateOnly Hasta) ResolverRango(DateOnly? desde, DateOnly? hasta);

        (DateOnly Desde, DateOnly Hasta) ParsearPeriodo(string periodo);

        AgrupacionEvolucion ResolverAgrupacion(AgrupacionEvolucion? agrupacion, DateOnly desde, DateOnly hasta);

        Task AsegurarEmpresaAsync(int idEmpresa);

        Task<EmpresaCliente> ObtenerEmpresaAsync(int idEmpresa);

        Task<IReadOnlyList<EmpresaCliente>> ListarEmpresasAsync();

        Task<SnapshotOperacional> CargarAsync(DateOnly desde, DateOnly hasta, int? idEmpresa, EstadoServicio? estado = null);

        KpisOperacionales CalcularKpis(SnapshotOperacional snapshot);

        IReadOnlyList<DashboardEvolucionDto> CalcularEvolucion(SnapshotOperacional snapshot, AgrupacionEvolucion agrupacion);

        IReadOnlyList<DashboardEmpresaDto> CalcularPorEmpresa(
            SnapshotOperacional snapshot,
            IReadOnlyList<EmpresaCliente> empresas);

        Task<IReadOnlyList<ReporteServicioDto>> MapearServiciosAsync(SnapshotOperacional snapshot);
    }

    public sealed class KpisOperacionales
    {
        public int ServiciosPlanificados { get; init; }

        public int ServiciosRealizados { get; init; }

        public int ServiciosProgramados { get; init; }

        public int ServiciosEnCurso { get; init; }

        public int ServiciosCancelados { get; init; }

        public decimal PorcentajeServiciosRealizados { get; init; }

        public int PersonasPlanificadas { get; init; }

        public int PlanificadosTransportados { get; init; }

        public int PlanificadosNoTransportados { get; init; }

        public int NoPlanificadosTransportados { get; init; }

        public int TotalTransportados { get; init; }

        public decimal PorcentajePlanificadosTransportados { get; init; }
    }

    public sealed class SnapshotOperacional
    {
        public DateOnly Desde { get; init; }

        public DateOnly Hasta { get; init; }

        public int? IdEmpresa { get; init; }

        public IReadOnlyList<Servicio> Servicios { get; init; } = Array.Empty<Servicio>();

        public ILookup<int, PasajeroServicio> PlanificadosActivos { get; init; } = Array.Empty<PasajeroServicio>().ToLookup(p => p.IdServicio);

        public ILookup<int, Asistencia> AsistenciasValidas { get; init; } = Array.Empty<Asistencia>().ToLookup(a => a.IdServicio);

        public IReadOnlyDictionary<int, AsignacionServicio> AsignacionesActivas { get; init; } =
            new Dictionary<int, AsignacionServicio>();
    }

    /// <summary>
    /// Fuente única de KPI operacionales. Dashboard, reportes JSON y Excel reutilizan estas definiciones.
    /// No persiste resúmenes: calcula sobre datos transaccionales.
    /// Servicios planificados: todos los servicios del rango, cualquier estado (incluye CANCELADO).
    /// Servicios realizados: únicamente FINALIZADO. Personas planificadas: pasajero_servicio ACTIVO.
    /// Transportados: asistencia VALIDA. Ausencias: planificados ACTIVO sin asistencia VALIDA.
    /// Un servicio CANCELADO cuenta como planificado y cancelado, no como realizado;
    /// sus pasajeros ACTIVO y asistencias VALIDA siguen en las métricas de personas.
    /// </summary>
    public class ServicioMetricasOperacionales : IServicioMetricasOperacionales
    {
        private static readonly Regex FormatoPeriodo = new(@"^\d{4}-(0[1-9]|1[0-2])$", RegexOptions.Compiled);

        private readonly TransporteContext _contexto;
        private readonly IMongoCollection<Ruta> _rutas;

        public ServicioMetricasOperacionales(TransporteContext contexto, IMongoCollection<Ruta> rutas)
        {
            _contexto = contexto;
            _rutas = rutas;
        }

        public DateOnly HoyUtc => DateOnly.FromDateTime(DateTime.UtcNow);

        public (DateOnly Desde, DateOnly Hasta) ResolverRango(DateOnly? desde, DateOnly? hasta)
        {
            var hoy = HoyUtc;
            var inicio = desde ?? hasta ?? hoy;
            var fin = hasta ?? desde ?? hoy;

            if (inicio > fin)
            {
                throw new ExcepcionNegocio("La fecha inicial no puede ser posterior a la fecha final.");
            }

            return (inicio, fin);
        }

        public (DateOnly Desde, DateOnly Hasta) ParsearPeriodo(string periodo)
        {
            var texto = periodo?.Trim() ?? string.Empty;
            if (!FormatoPeriodo.IsMatch(texto))
            {
                throw new ExcepcionNegocio("El período debe tener el formato AAAA-MM.");
            }

            var anio = int.Parse(texto[..4], CultureInfo.InvariantCulture);
            var mes = int.Parse(texto[5..], CultureInfo.InvariantCulture);
            var desde = new DateOnly(anio, mes, 1);
            var hasta = desde.AddMonths(1).AddDays(-1);
            return (desde, hasta);
        }

        public AgrupacionEvolucion ResolverAgrupacion(
            AgrupacionEvolucion? agrupacion,
            DateOnly desde,
            DateOnly hasta)
        {
            if (agrupacion.HasValue)
            {
                return agrupacion.Value;
            }

            var dias = hasta.DayNumber - desde.DayNumber + 1;
            return dias <= 14 ? AgrupacionEvolucion.DIA : AgrupacionEvolucion.SEMANA;
        }

        public async Task AsegurarEmpresaAsync(int idEmpresa)
        {
            await ObtenerEmpresaAsync(idEmpresa);
        }

        public async Task<EmpresaCliente> ObtenerEmpresaAsync(int idEmpresa)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.", StatusCodes.Status404NotFound);
            }

            return empresa;
        }

        public async Task<IReadOnlyList<EmpresaCliente>> ListarEmpresasAsync()
        {
            return await _contexto.EmpresasCliente
                .AsNoTracking()
                .OrderBy(e => e.RazonSocial)
                .ThenBy(e => e.IdEmpresa)
                .ToListAsync();
        }

        public async Task<SnapshotOperacional> CargarAsync(
            DateOnly desde,
            DateOnly hasta,
            int? idEmpresa,
            EstadoServicio? estado = null)
        {
            if (idEmpresa.HasValue)
            {
                await AsegurarEmpresaAsync(idEmpresa.Value);
            }

            var consulta = _contexto.Servicios
                .AsNoTracking()
                .Include(s => s.Empresa)
                .Where(s => s.Fecha >= desde && s.Fecha <= hasta);

            if (idEmpresa.HasValue)
            {
                consulta = consulta.Where(s => s.IdEmpresa == idEmpresa.Value);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(s => s.Estado == estado.Value);
            }

            var servicios = await consulta
                .OrderBy(s => s.Fecha)
                .ThenBy(s => s.HoraInicio)
                .ThenBy(s => s.IdServicio)
                .ToListAsync();

            var ids = servicios.Select(s => s.IdServicio).ToList();

            var planificados = ids.Count == 0
                ? new List<PasajeroServicio>()
                : await _contexto.PasajerosServicio
                    .AsNoTracking()
                    .Where(p => ids.Contains(p.IdServicio) && p.Estado == EstadoPasajeroServicio.ACTIVO)
                    .ToListAsync();

            var asistencias = ids.Count == 0
                ? new List<Asistencia>()
                : await _contexto.Asistencias
                    .AsNoTracking()
                    .Where(a => ids.Contains(a.IdServicio) && a.Estado == EstadoAsistencia.VALIDA)
                    .ToListAsync();

            var asignaciones = ids.Count == 0
                ? new List<AsignacionServicio>()
                : await _contexto.AsignacionesServicio
                    .AsNoTracking()
                    .Include(a => a.Vehiculo)
                    .Where(a => ids.Contains(a.IdServicio) && a.Estado == EstadoAsignacionServicio.ACTIVA)
                    .ToListAsync();

            return new SnapshotOperacional
            {
                Desde = desde,
                Hasta = hasta,
                IdEmpresa = idEmpresa,
                Servicios = servicios,
                PlanificadosActivos = planificados.ToLookup(p => p.IdServicio),
                AsistenciasValidas = asistencias.ToLookup(a => a.IdServicio),
                AsignacionesActivas = asignaciones
                    .GroupBy(a => a.IdServicio)
                    .ToDictionary(g => g.Key, g => g.First())
            };
        }

        public KpisOperacionales CalcularKpis(SnapshotOperacional snapshot)
        {
            var serviciosPlanificados = snapshot.Servicios.Count;
            var serviciosRealizados = snapshot.Servicios.Count(s => s.Estado == EstadoServicio.FINALIZADO);
            var serviciosProgramados = snapshot.Servicios.Count(s => s.Estado == EstadoServicio.PROGRAMADO);
            var serviciosEnCurso = snapshot.Servicios.Count(s => s.Estado == EstadoServicio.EN_CURSO);
            var serviciosCancelados = snapshot.Servicios.Count(s => s.Estado == EstadoServicio.CANCELADO);

            var personasPlanificadas = 0;
            var planificadosTransportados = 0;
            var planificadosNoTransportados = 0;
            var noPlanificadosTransportados = 0;
            var totalTransportados = 0;

            foreach (var servicio in snapshot.Servicios)
            {
                var metricas = CalcularMetricasServicio(servicio.IdServicio, snapshot);
                personasPlanificadas += metricas.PersonasPlanificadas;
                planificadosTransportados += metricas.PlanificadosTransportados;
                planificadosNoTransportados += metricas.PlanificadosNoTransportados;
                noPlanificadosTransportados += metricas.NoPlanificadosTransportados;
                totalTransportados += metricas.TotalTransportados;
            }

            return new KpisOperacionales
            {
                ServiciosPlanificados = serviciosPlanificados,
                ServiciosRealizados = serviciosRealizados,
                ServiciosProgramados = serviciosProgramados,
                ServiciosEnCurso = serviciosEnCurso,
                ServiciosCancelados = serviciosCancelados,
                PorcentajeServiciosRealizados = Porcentaje(serviciosRealizados, serviciosPlanificados),
                PersonasPlanificadas = personasPlanificadas,
                PlanificadosTransportados = planificadosTransportados,
                PlanificadosNoTransportados = planificadosNoTransportados,
                NoPlanificadosTransportados = noPlanificadosTransportados,
                TotalTransportados = totalTransportados,
                PorcentajePlanificadosTransportados = Porcentaje(planificadosTransportados, personasPlanificadas)
            };
        }

        public IReadOnlyList<DashboardEvolucionDto> CalcularEvolucion(
            SnapshotOperacional snapshot,
            AgrupacionEvolucion agrupacion)
        {
            var porPeriodo = snapshot.Servicios
                .GroupBy(s => ClavePeriodo(s.Fecha, agrupacion))
                .ToDictionary(g => g.Key, g => g.ToList());

            return EnumerarPeriodos(snapshot.Desde, snapshot.Hasta, agrupacion)
                .Select(clave =>
                {
                    porPeriodo.TryGetValue(clave, out var grupo);
                    grupo ??= new List<Servicio>();

                    var personasPlanificadas = 0;
                    var planificadosTransportados = 0;
                    var noPlanificadosTransportados = 0;
                    var totalTransportados = 0;

                    foreach (var servicio in grupo)
                    {
                        var metricas = CalcularMetricasServicio(servicio.IdServicio, snapshot);
                        personasPlanificadas += metricas.PersonasPlanificadas;
                        planificadosTransportados += metricas.PlanificadosTransportados;
                        noPlanificadosTransportados += metricas.NoPlanificadosTransportados;
                        totalTransportados += metricas.TotalTransportados;
                    }

                    return new DashboardEvolucionDto
                    {
                        Periodo = clave.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                        ServiciosPlanificados = grupo.Count,
                        ServiciosRealizados = grupo.Count(s => s.Estado == EstadoServicio.FINALIZADO),
                        PersonasPlanificadas = personasPlanificadas,
                        PlanificadosTransportados = planificadosTransportados,
                        NoPlanificadosTransportados = noPlanificadosTransportados,
                        TotalTransportados = totalTransportados
                    };
                })
                .ToList();
        }

        public IReadOnlyList<DashboardEmpresaDto> CalcularPorEmpresa(
            SnapshotOperacional snapshot,
            IReadOnlyList<EmpresaCliente> empresas)
        {
            var serviciosPorEmpresa = snapshot.Servicios.ToLookup(s => s.IdEmpresa);

            return empresas
                .OrderBy(e => e.RazonSocial)
                .ThenBy(e => e.IdEmpresa)
                .Select(empresa =>
                {
                    var grupo = serviciosPorEmpresa[empresa.IdEmpresa].ToList();
                    var personasPlanificadas = 0;
                    var planificadosTransportados = 0;
                    var noPlanificadosTransportados = 0;
                    var totalTransportados = 0;

                    foreach (var servicio in grupo)
                    {
                        var metricas = CalcularMetricasServicio(servicio.IdServicio, snapshot);
                        personasPlanificadas += metricas.PersonasPlanificadas;
                        planificadosTransportados += metricas.PlanificadosTransportados;
                        noPlanificadosTransportados += metricas.NoPlanificadosTransportados;
                        totalTransportados += metricas.TotalTransportados;
                    }

                    var planificados = grupo.Count;
                    var realizados = grupo.Count(s => s.Estado == EstadoServicio.FINALIZADO);

                    return new DashboardEmpresaDto
                    {
                        IdEmpresa = empresa.IdEmpresa,
                        RazonSocial = empresa.RazonSocial,
                        ServiciosPlanificados = planificados,
                        ServiciosRealizados = realizados,
                        PorcentajeServiciosRealizados = Porcentaje(realizados, planificados),
                        PersonasPlanificadas = personasPlanificadas,
                        PlanificadosTransportados = planificadosTransportados,
                        NoPlanificadosTransportados = noPlanificadosTransportados,
                        TotalTransportados = totalTransportados,
                        PorcentajePlanificadosTransportados = Porcentaje(planificadosTransportados, personasPlanificadas)
                    };
                })
                .ToList();
        }

        public async Task<IReadOnlyList<ReporteServicioDto>> MapearServiciosAsync(SnapshotOperacional snapshot)
        {
            var rutasPorId = await ObtenerRutasPorIdentificadoresAsync(
                snapshot.Servicios.Select(s => s.IdRuta));

            return snapshot.Servicios.Select(servicio =>
            {
                rutasPorId.TryGetValue(servicio.IdRuta, out var ruta);
                snapshot.AsignacionesActivas.TryGetValue(servicio.IdServicio, out var asignacion);
                var metricas = CalcularMetricasServicio(servicio.IdServicio, snapshot);

                return new ReporteServicioDto
                {
                    IdServicio = servicio.IdServicio,
                    Fecha = servicio.Fecha,
                    HoraInicio = servicio.HoraInicio,
                    HoraFin = servicio.HoraFin,
                    TipoServicio = servicio.TipoServicio,
                    Estado = servicio.Estado,
                    IdEmpresa = servicio.IdEmpresa,
                    RazonSocial = servicio.Empresa.RazonSocial,
                    IdRuta = servicio.IdRuta,
                    NombreRuta = ruta?.Nombre,
                    SectorRuta = ruta?.Sector,
                    PatenteVehiculo = asignacion?.Vehiculo.Patente,
                    PersonasPlanificadas = metricas.PersonasPlanificadas,
                    PlanificadosTransportados = metricas.PlanificadosTransportados,
                    PlanificadosNoTransportados = metricas.PlanificadosNoTransportados,
                    NoPlanificadosTransportados = metricas.NoPlanificadosTransportados,
                    TotalTransportados = metricas.TotalTransportados
                };
            }).ToList();
        }

        internal static MetricasServicio CalcularMetricasServicio(int idServicio, SnapshotOperacional snapshot)
        {
            var planificados = snapshot.PlanificadosActivos[idServicio].ToList();
            var validas = snapshot.AsistenciasValidas[idServicio].ToList();
            var idsTransportados = validas.Select(a => a.IdPasajero).ToHashSet();

            var personasPlanificadas = planificados.Count;
            var planificadosTransportados = planificados.Count(p => idsTransportados.Contains(p.IdPasajero));

            return new MetricasServicio(
                personasPlanificadas,
                planificadosTransportados,
                personasPlanificadas - planificadosTransportados,
                validas.Count(a => a.TipoAsistencia == TipoAsistencia.NO_PLANIFICADA),
                validas.Count);
        }

        internal readonly record struct MetricasServicio(
            int PersonasPlanificadas,
            int PlanificadosTransportados,
            int PlanificadosNoTransportados,
            int NoPlanificadosTransportados,
            int TotalTransportados);

        internal static decimal Porcentaje(int numerador, int denominador)
        {
            if (denominador == 0)
            {
                return 0;
            }

            return Math.Round((decimal)numerador / denominador * 100, 2, MidpointRounding.AwayFromZero);
        }

        private static DateOnly ClavePeriodo(DateOnly fecha, AgrupacionEvolucion agrupacion)
        {
            if (agrupacion == AgrupacionEvolucion.DIA)
            {
                return fecha;
            }

            var dateTime = fecha.ToDateTime(TimeOnly.MinValue);
            var desplazamiento = ((int)dateTime.DayOfWeek + 6) % 7;
            return DateOnly.FromDateTime(dateTime.AddDays(-desplazamiento));
        }

        private static IEnumerable<DateOnly> EnumerarPeriodos(
            DateOnly desde,
            DateOnly hasta,
            AgrupacionEvolucion agrupacion)
        {
            if (agrupacion == AgrupacionEvolucion.DIA)
            {
                for (var dia = desde; dia <= hasta; dia = dia.AddDays(1))
                {
                    yield return dia;
                }

                yield break;
            }

            var inicio = ClavePeriodo(desde, AgrupacionEvolucion.SEMANA);
            var fin = ClavePeriodo(hasta, AgrupacionEvolucion.SEMANA);
            for (var semana = inicio; semana <= fin; semana = semana.AddDays(7))
            {
                yield return semana;
            }
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
    }
}
