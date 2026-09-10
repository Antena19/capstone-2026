using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Planificaciones;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioPlanificaciones
    {
        Task<IReadOnlyList<PlanificacionRespuestaDto>> ListarAsync(
            int? idEmpresa,
            string? periodo,
            EstadoPlanificacion? estado);

        Task<PlanificacionRespuestaDto> ObtenerPorIdAsync(int idPlanificacion);

        Task<PlanificacionRespuestaDto> CrearAsync(CrearPlanificacionSolicitudDto solicitud, int idUsuarioCreador);

        Task<PlanificacionRespuestaDto> EditarAsync(
            int idPlanificacion,
            EditarPlanificacionSolicitudDto solicitud,
            int idAdministrador);

        Task<PlanificacionRespuestaDto> CambiarEstadoAsync(
            int idPlanificacion,
            CambiarEstadoPlanificacionSolicitudDto solicitud,
            int idAdministrador);
    }

    /// <summary>
    /// Gestión de planificaciones reservada al rol ADMINISTRADOR.
    /// No elimina físicamente registros. CERRADA y CANCELADA son estados finales.
    /// Los servicios se asociarán posteriormente mediante servicio.id_planificacion.
    /// </summary>
    public class ServicioPlanificaciones : IServicioPlanificaciones
    {
        private static readonly HashSet<(EstadoPlanificacion Origen, EstadoPlanificacion Destino)> TransicionesPermitidas =
        [
            (EstadoPlanificacion.BORRADOR, EstadoPlanificacion.ACTIVA),
            (EstadoPlanificacion.BORRADOR, EstadoPlanificacion.CANCELADA),
            (EstadoPlanificacion.ACTIVA, EstadoPlanificacion.CERRADA),
            (EstadoPlanificacion.ACTIVA, EstadoPlanificacion.CANCELADA)
        ];

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioPlanificaciones> _logger;

        public ServicioPlanificaciones(TransporteContext contexto, ILogger<ServicioPlanificaciones> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<PlanificacionRespuestaDto>> ListarAsync(
            int? idEmpresa,
            string? periodo,
            EstadoPlanificacion? estado)
        {
            var consulta = _contexto.Planificaciones.AsNoTracking();

            if (idEmpresa.HasValue)
            {
                consulta = consulta.Where(p => p.IdEmpresa == idEmpresa.Value);
            }

            var periodoFiltro = periodo?.Trim();
            if (!string.IsNullOrEmpty(periodoFiltro))
            {
                NormalizarPeriodo(periodoFiltro);
                consulta = consulta.Where(p => p.Periodo == periodoFiltro);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(p => p.Estado == estado.Value);
            }

            return await Proyectar(
                    consulta
                        .OrderByDescending(p => p.Periodo)
                        .ThenByDescending(p => p.FechaCreacion))
                .ToListAsync();
        }

        public async Task<PlanificacionRespuestaDto> ObtenerPorIdAsync(int idPlanificacion)
        {
            var planificacion = await Proyectar(
                    _contexto.Planificaciones
                        .AsNoTracking()
                        .Where(p => p.IdPlanificacion == idPlanificacion))
                .FirstOrDefaultAsync();

            if (planificacion is null)
            {
                throw new ExcepcionNegocio("La planificación no existe.", StatusCodes.Status404NotFound);
            }

            return planificacion;
        }

        public async Task<PlanificacionRespuestaDto> CrearAsync(
            CrearPlanificacionSolicitudDto solicitud,
            int idUsuarioCreador)
        {
            var periodo = NormalizarPeriodo(solicitud.Periodo);
            AsegurarPeriodoNoAnteriorAlMesActual(periodo);
            await AsegurarEmpresaAsignableAsync(solicitud.IdEmpresa, exigirActiva: true);
            await AsegurarPeriodoDisponibleAsync(solicitud.IdEmpresa, periodo);

            var planificacion = new Planificacion
            {
                IdEmpresa = solicitud.IdEmpresa,
                Periodo = periodo,
                FechaCreacion = DateTime.UtcNow,
                IdUsuarioCreador = idUsuarioCreador,
                Estado = EstadoPlanificacion.BORRADOR
            };

            _contexto.Planificaciones.Add(planificacion);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó la planificación {IdPlanificacion}.",
                idUsuarioCreador,
                planificacion.IdPlanificacion);

            return await ObtenerPorIdAsync(planificacion.IdPlanificacion);
        }

        public async Task<PlanificacionRespuestaDto> EditarAsync(
            int idPlanificacion,
            EditarPlanificacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var planificacion = await ObtenerPlanificacionAsync(idPlanificacion);

            if (planificacion.Estado != EstadoPlanificacion.BORRADOR)
            {
                throw new ExcepcionNegocio(
                    "Solo se puede editar una planificación en estado BORRADOR.",
                    StatusCodes.Status409Conflict);
            }

            var periodo = NormalizarPeriodo(solicitud.Periodo);
            AsegurarPeriodoNoAnteriorAlMesActual(periodo);
            var cambiaEmpresa = planificacion.IdEmpresa != solicitud.IdEmpresa;
            await AsegurarEmpresaAsignableAsync(solicitud.IdEmpresa, exigirActiva: cambiaEmpresa);
            await AsegurarPeriodoDisponibleAsync(solicitud.IdEmpresa, periodo, idPlanificacion);

            planificacion.IdEmpresa = solicitud.IdEmpresa;
            planificacion.Periodo = periodo;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó la planificación {IdPlanificacion}.",
                idAdministrador,
                idPlanificacion);

            return await ObtenerPorIdAsync(idPlanificacion);
        }

        public async Task<PlanificacionRespuestaDto> CambiarEstadoAsync(
            int idPlanificacion,
            CambiarEstadoPlanificacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var planificacion = await ObtenerPlanificacionAsync(idPlanificacion);
            var destino = solicitud.Estado;

            if (destino == EstadoPlanificacion.BORRADOR)
            {
                throw new ExcepcionNegocio("El estado BORRADOR no es un destino válido de transición.");
            }

            if (!TransicionesPermitidas.Contains((planificacion.Estado, destino)))
            {
                throw new ExcepcionNegocio(
                    $"No se puede cambiar una planificación {planificacion.Estado} a {destino}.",
                    StatusCodes.Status409Conflict);
            }

            planificacion.Estado = destino;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado de la planificación {IdPlanificacion} a {Estado}.",
                idAdministrador,
                idPlanificacion,
                destino);

            return await ObtenerPorIdAsync(idPlanificacion);
        }

        private async Task<Planificacion> ObtenerPlanificacionAsync(int idPlanificacion)
        {
            var planificacion = await _contexto.Planificaciones
                .FirstOrDefaultAsync(p => p.IdPlanificacion == idPlanificacion);

            if (planificacion is null)
            {
                throw new ExcepcionNegocio("La planificación no existe.", StatusCodes.Status404NotFound);
            }

            return planificacion;
        }

        private async Task AsegurarEmpresaAsignableAsync(int idEmpresa, bool exigirActiva)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.", StatusCodes.Status404NotFound);
            }

            if (exigirActiva && empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio(
                    "No se puede crear una planificación para una empresa inactiva.",
                    StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarPeriodoDisponibleAsync(
            int idEmpresa,
            string periodo,
            int? idPlanificacionExcluida = null)
        {
            var existe = await _contexto.Planificaciones
                .AsNoTracking()
                .AnyAsync(p =>
                    p.IdEmpresa == idEmpresa
                    && p.Periodo == periodo
                    && p.Estado != EstadoPlanificacion.CANCELADA
                    && (!idPlanificacionExcluida.HasValue || p.IdPlanificacion != idPlanificacionExcluida.Value));

            if (existe)
            {
                throw new ExcepcionNegocio(
                    $"Ya existe una planificación {periodo} vigente para esta empresa.",
                    StatusCodes.Status409Conflict);
            }
        }

        private static string NormalizarPeriodo(string? periodo)
        {
            var valor = periodo?.Trim() ?? string.Empty;

            if (valor.Length == 0)
            {
                throw new ExcepcionNegocio("El período es obligatorio.");
            }

            if (valor.Length != 7
                || valor[4] != '-'
                || !int.TryParse(valor[..4], out _)
                || !int.TryParse(valor[5..], out var mes)
                || mes is < 1 or > 12)
            {
                throw new ExcepcionNegocio("El período debe tener el formato YYYY-MM.");
            }

            return valor;
        }

        private static void AsegurarPeriodoNoAnteriorAlMesActual(string periodo)
        {
            var anio = int.Parse(periodo[..4]);
            var mes = int.Parse(periodo[5..]);
            var periodoSolicitado = new DateOnly(anio, mes, 1);
            var hoy = DateTime.Now;
            var mesActual = new DateOnly(hoy.Year, hoy.Month, 1);

            if (periodoSolicitado < mesActual)
            {
                throw new ExcepcionNegocio(
                    "No se puede crear ni modificar una planificación para un período anterior al mes actual.");
            }
        }

        private static IQueryable<PlanificacionRespuestaDto> Proyectar(IQueryable<Planificacion> consulta)
        {
            return consulta.Select(p => new PlanificacionRespuestaDto
            {
                IdPlanificacion = p.IdPlanificacion,
                IdEmpresa = p.IdEmpresa,
                RazonSocialEmpresa = p.Empresa.RazonSocial,
                Periodo = p.Periodo,
                FechaCreacion = p.FechaCreacion,
                IdUsuarioCreador = p.IdUsuarioCreador,
                EmailUsuarioCreador = p.UsuarioCreador.Email,
                Estado = p.Estado
            });
        }
    }
}
