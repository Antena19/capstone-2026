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
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
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
                consulta = consulta.Where(p => p.Periodo == periodoFiltro);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(p => p.Estado == estado.Value);
            }

            var planificaciones = await consulta
                .OrderBy(p => p.IdPlanificacion)
                .ToListAsync();

            return planificaciones.Select(Mapear).ToList();
        }

        public async Task<PlanificacionRespuestaDto> ObtenerPorIdAsync(int idPlanificacion)
        {
            var planificacion = await _contexto.Planificaciones
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdPlanificacion == idPlanificacion);

            if (planificacion is null)
            {
                throw new ExcepcionNegocio("La planificación no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(planificacion);
        }

        public async Task<PlanificacionRespuestaDto> CrearAsync(
            CrearPlanificacionSolicitudDto solicitud,
            int idUsuarioCreador)
        {
            var periodo = NormalizarPeriodo(solicitud.Periodo);
            await AsegurarEmpresaAsignableAsync(solicitud.IdEmpresa, exigirActiva: true);

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

            return Mapear(planificacion);
        }

        public async Task<PlanificacionRespuestaDto> EditarAsync(
            int idPlanificacion,
            EditarPlanificacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var planificacion = await ObtenerPlanificacionAsync(idPlanificacion);

            if (planificacion.Estado != EstadoPlanificacion.BORRADOR)
            {
                throw new ExcepcionNegocio("Solo se puede editar una planificación en estado BORRADOR.");
            }

            var periodo = NormalizarPeriodo(solicitud.Periodo);
            var cambiaEmpresa = planificacion.IdEmpresa != solicitud.IdEmpresa;
            await AsegurarEmpresaAsignableAsync(solicitud.IdEmpresa, exigirActiva: cambiaEmpresa);

            planificacion.IdEmpresa = solicitud.IdEmpresa;
            planificacion.Periodo = periodo;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó la planificación {IdPlanificacion}.",
                idAdministrador,
                idPlanificacion);

            return Mapear(planificacion);
        }

        public async Task<PlanificacionRespuestaDto> CambiarEstadoAsync(
            int idPlanificacion,
            CambiarEstadoPlanificacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var planificacion = await ObtenerPlanificacionAsync(idPlanificacion);

            if (!TransicionesPermitidas.Contains((planificacion.Estado, solicitud.Estado)))
            {
                throw new ExcepcionNegocio(
                    $"No está permitido cambiar el estado de {planificacion.Estado} a {solicitud.Estado}.");
            }

            planificacion.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado de la planificación {IdPlanificacion} a {Estado}.",
                idAdministrador,
                idPlanificacion,
                solicitud.Estado);

            return Mapear(planificacion);
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
                throw new ExcepcionNegocio("La empresa indicada no existe.");
            }

            if (exigirActiva && empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
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
                throw new ExcepcionNegocio("El período debe tener el formato AAAA-MM.");
            }

            return valor;
        }

        private static PlanificacionRespuestaDto Mapear(Planificacion planificacion)
        {
            return new PlanificacionRespuestaDto
            {
                IdPlanificacion = planificacion.IdPlanificacion,
                IdEmpresa = planificacion.IdEmpresa,
                Periodo = planificacion.Periodo,
                FechaCreacion = planificacion.FechaCreacion,
                IdUsuarioCreador = planificacion.IdUsuarioCreador,
                Estado = planificacion.Estado
            };
        }
    }
}
