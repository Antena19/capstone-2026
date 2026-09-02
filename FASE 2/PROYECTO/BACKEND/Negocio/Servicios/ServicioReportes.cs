using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Reportes;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioReportes
    {
        Task<IReadOnlyList<ReporteServicioDto>> ListarServiciosAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta,
            EstadoServicio? estado);

        Task<ReporteServiciosRangoDto> ObtenerServiciosRangoAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta,
            EstadoServicio? estado);

        Task<ReporteMensualDto> ObtenerMensualAsync(int idEmpresa, string periodo);

        Task<IReadOnlyList<ReportePasajeroServicioDto>> ListarPasajerosServicioAsync(int idServicio);
    }

    /// <summary>
    /// Reportes operacionales del ADMINISTRADOR. Reutiliza las mismas métricas que el dashboard.
    /// </summary>
    public class ServicioReportes : IServicioReportes
    {
        private readonly TransporteContext _contexto;
        private readonly IMongoCollection<Ruta> _rutas;
        private readonly IServicioMetricasOperacionales _metricas;

        public ServicioReportes(
            TransporteContext contexto,
            IMongoCollection<Ruta> rutas,
            IServicioMetricasOperacionales metricas)
        {
            _contexto = contexto;
            _rutas = rutas;
            _metricas = metricas;
        }

        public async Task<IReadOnlyList<ReporteServicioDto>> ListarServiciosAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta,
            EstadoServicio? estado)
        {
            var reporte = await ObtenerServiciosRangoAsync(idEmpresa, desde, hasta, estado);
            return reporte.Servicios;
        }

        public async Task<ReporteServiciosRangoDto> ObtenerServiciosRangoAsync(
            int? idEmpresa,
            DateOnly? desde,
            DateOnly? hasta,
            EstadoServicio? estado)
        {
            var rango = _metricas.ResolverRango(desde, hasta);
            var snapshot = await _metricas.CargarAsync(rango.Desde, rango.Hasta, idEmpresa, estado);
            var kpis = _metricas.CalcularKpis(snapshot);
            var servicios = await _metricas.MapearServiciosAsync(snapshot);

            string? razonSocial = null;
            if (idEmpresa.HasValue)
            {
                var empresa = await _metricas.ObtenerEmpresaAsync(idEmpresa.Value);
                razonSocial = empresa.RazonSocial;
            }

            return new ReporteServiciosRangoDto
            {
                Desde = rango.Desde,
                Hasta = rango.Hasta,
                IdEmpresa = idEmpresa,
                RazonSocial = razonSocial,
                Resumen = MapearResumen(kpis),
                Servicios = servicios
            };
        }

        public async Task<ReporteMensualDto> ObtenerMensualAsync(int idEmpresa, string periodo)
        {
            if (idEmpresa <= 0)
            {
                throw new ExcepcionNegocio("Debe indicar una empresa válida.");
            }

            var rango = _metricas.ParsearPeriodo(periodo);
            var empresa = await _metricas.ObtenerEmpresaAsync(idEmpresa);
            var snapshot = await _metricas.CargarAsync(rango.Desde, rango.Hasta, idEmpresa);
            var kpis = _metricas.CalcularKpis(snapshot);
            var servicios = await _metricas.MapearServiciosAsync(snapshot);

            return new ReporteMensualDto
            {
                IdEmpresa = empresa.IdEmpresa,
                RazonSocial = empresa.RazonSocial,
                Periodo = rango.Desde.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture),
                Resumen = MapearResumen(kpis),
                Servicios = servicios
            };
        }

        public async Task<IReadOnlyList<ReportePasajeroServicioDto>> ListarPasajerosServicioAsync(int idServicio)
        {
            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            var planificados = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Include(p => p.Pasajero)
                .Where(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO)
                .ToListAsync();

            var asistencias = await _contexto.Asistencias
                .AsNoTracking()
                .Include(a => a.Pasajero)
                .Where(a => a.IdServicio == idServicio)
                .ToListAsync();

            var asistenciaPorPasajero = asistencias
                .GroupBy(a => a.IdPasajero)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.FechaHora).First());

            var ruta = await ObtenerRutaOpcionalAsync(servicio.IdRuta);
            var filas = new Dictionary<int, ReportePasajeroServicioDto>();

            foreach (var planificado in planificados.OrderBy(p => p.Pasajero.Nombre).ThenBy(p => p.IdPasajero))
            {
                asistenciaPorPasajero.TryGetValue(planificado.IdPasajero, out var asistencia);
                var punto = ResolverPunto(ruta, planificado.IdPuntoRecogida);

                filas[planificado.IdPasajero] = new ReportePasajeroServicioDto
                {
                    IdPasajero = planificado.IdPasajero,
                    Nombre = planificado.Pasajero.Nombre,
                    EstabaPlanificado = true,
                    EstadoConfirmacion = planificado.EstadoConfirmacion,
                    TieneAsistencia = asistencia is not null,
                    TipoAsistencia = asistencia?.TipoAsistencia,
                    EstadoAsistencia = asistencia?.Estado,
                    FechaHoraAsistencia = asistencia?.FechaHora,
                    IdPuntoRecogida = planificado.IdPuntoRecogida,
                    NombrePuntoRecogida = punto?.Nombre
                };
            }

            foreach (var asistencia in asistencias.OrderBy(a => a.Pasajero.Nombre).ThenBy(a => a.IdPasajero))
            {
                if (filas.ContainsKey(asistencia.IdPasajero))
                {
                    continue;
                }

                filas[asistencia.IdPasajero] = new ReportePasajeroServicioDto
                {
                    IdPasajero = asistencia.IdPasajero,
                    Nombre = asistencia.Pasajero.Nombre,
                    EstabaPlanificado = false,
                    EstadoConfirmacion = null,
                    TieneAsistencia = true,
                    TipoAsistencia = asistencia.TipoAsistencia,
                    EstadoAsistencia = asistencia.Estado,
                    FechaHoraAsistencia = asistencia.FechaHora,
                    IdPuntoRecogida = null,
                    NombrePuntoRecogida = null
                };
            }

            return filas.Values
                .OrderByDescending(f => f.EstabaPlanificado)
                .ThenBy(f => f.Nombre)
                .ThenBy(f => f.IdPasajero)
                .ToList();
        }

        internal static ReporteMensualResumenDto MapearResumen(KpisOperacionales kpis)
        {
            return new ReporteMensualResumenDto
            {
                ServiciosPlanificados = kpis.ServiciosPlanificados,
                ServiciosRealizados = kpis.ServiciosRealizados,
                ServiciosCancelados = kpis.ServiciosCancelados,
                PorcentajeServiciosRealizados = kpis.PorcentajeServiciosRealizados,
                PersonasPlanificadas = kpis.PersonasPlanificadas,
                PlanificadosTransportados = kpis.PlanificadosTransportados,
                PlanificadosNoTransportados = kpis.PlanificadosNoTransportados,
                NoPlanificadosTransportados = kpis.NoPlanificadosTransportados,
                TotalTransportados = kpis.TotalTransportados,
                PorcentajePlanificadosTransportados = kpis.PorcentajePlanificadosTransportados
            };
        }

        private async Task<Ruta?> ObtenerRutaOpcionalAsync(string idRuta)
        {
            if (!ObjectId.TryParse(idRuta, out var objectId))
            {
                return null;
            }

            return await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();
        }

        private static PuntoRecogidaRuta? ResolverPunto(Ruta? ruta, string? idPuntoRecogida)
        {
            if (ruta is null || string.IsNullOrWhiteSpace(idPuntoRecogida))
            {
                return null;
            }

            return (ruta.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                .FirstOrDefault(p =>
                    string.Equals(p.IdPunto?.Trim(), idPuntoRecogida.Trim(), StringComparison.OrdinalIgnoreCase));
        }
    }
}
