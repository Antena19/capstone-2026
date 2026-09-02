using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Servicios;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioServicios
    {
        Task<IReadOnlyList<ServicioRespuestaDto>> ListarAsync(
            int? idEmpresa,
            int? idPlanificacion,
            DateOnly? fecha,
            EstadoServicio? estado,
            string? tipoServicio);

        Task<ServicioRespuestaDto> ObtenerPorIdAsync(int idServicio);

        Task<ServicioRespuestaDto> CrearAsync(CrearServicioSolicitudDto solicitud, int idAdministrador);

        Task<ServicioRespuestaDto> EditarAsync(int idServicio, EditarServicioSolicitudDto solicitud, int idAdministrador);

        Task<ServicioRespuestaDto> CambiarEstadoAsync(
            int idServicio,
            CambiarEstadoServicioSolicitudDto solicitud,
            int idAdministrador);

        Task<ServicioRespuestaDto> IniciarComoConductorAsync(int idServicio, int idUsuario);

        Task<ServicioRespuestaDto> FinalizarComoConductorAsync(int idServicio, int idUsuario);
    }

    /// <summary>
    /// Gestión de servicios. El ADMINISTRADOR administra y da soporte;
    /// el CONDUCTOR inicia y finaliza únicamente los servicios con asignación ACTIVA.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioServicios : IServicioServicios
    {
        private static readonly HashSet<(EstadoServicio Origen, EstadoServicio Destino)> TransicionesPermitidas =
        [
            (EstadoServicio.PROGRAMADO, EstadoServicio.EN_CURSO),
            (EstadoServicio.PROGRAMADO, EstadoServicio.CANCELADO),
            (EstadoServicio.EN_CURSO, EstadoServicio.FINALIZADO),
            (EstadoServicio.EN_CURSO, EstadoServicio.CANCELADO)
        ];

        private readonly TransporteContext _contexto;
        private readonly IMongoCollection<Ruta> _rutas;
        private readonly IServicioAsistencias _servicioAsistencias;
        private readonly ILogger<ServicioServicios> _logger;

        public ServicioServicios(
            TransporteContext contexto,
            IMongoCollection<Ruta> rutas,
            IServicioAsistencias servicioAsistencias,
            ILogger<ServicioServicios> logger)
        {
            _contexto = contexto;
            _rutas = rutas;
            _servicioAsistencias = servicioAsistencias;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ServicioRespuestaDto>> ListarAsync(
            int? idEmpresa,
            int? idPlanificacion,
            DateOnly? fecha,
            EstadoServicio? estado,
            string? tipoServicio)
        {
            var consulta = _contexto.Servicios.AsNoTracking();

            if (idEmpresa.HasValue)
            {
                consulta = consulta.Where(s => s.IdEmpresa == idEmpresa.Value);
            }

            if (idPlanificacion.HasValue)
            {
                consulta = consulta.Where(s => s.IdPlanificacion == idPlanificacion.Value);
            }

            if (fecha.HasValue)
            {
                consulta = consulta.Where(s => s.Fecha == fecha.Value);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(s => s.Estado == estado.Value);
            }

            var tipoFiltro = tipoServicio?.Trim();
            if (!string.IsNullOrEmpty(tipoFiltro))
            {
                consulta = consulta.Where(s => s.TipoServicio == tipoFiltro);
            }

            var servicios = await consulta
                .OrderBy(s => s.IdServicio)
                .ToListAsync();

            return servicios.Select(Mapear).ToList();
        }

        public async Task<ServicioRespuestaDto> ObtenerPorIdAsync(int idServicio)
        {
            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(servicio);
        }

        public async Task<ServicioRespuestaDto> CrearAsync(CrearServicioSolicitudDto solicitud, int idAdministrador)
        {
            var datos = await ValidarProgramacionAsync(
                solicitud.IdEmpresa,
                solicitud.IdPlanificacion,
                solicitud.IdRuta,
                solicitud.Fecha,
                solicitud.HoraInicio,
                solicitud.HoraFin,
                solicitud.TipoServicio);

            var servicio = new Servicio
            {
                IdEmpresa = datos.IdEmpresa,
                IdPlanificacion = datos.IdPlanificacion,
                IdRuta = datos.IdRuta,
                Fecha = datos.Fecha,
                HoraInicio = datos.HoraInicio,
                HoraFin = datos.HoraFin,
                FechaHoraInicioReal = null,
                FechaHoraFinReal = null,
                TipoServicio = datos.TipoServicio,
                Estado = EstadoServicio.PROGRAMADO
            };

            _contexto.Servicios.Add(servicio);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el servicio {IdServicio}.",
                idAdministrador,
                servicio.IdServicio);

            return Mapear(servicio);
        }

        public async Task<ServicioRespuestaDto> EditarAsync(
            int idServicio,
            EditarServicioSolicitudDto solicitud,
            int idAdministrador)
        {
            var servicio = await ObtenerServicioAsync(idServicio);

            if (servicio.Estado != EstadoServicio.PROGRAMADO)
            {
                throw new ExcepcionNegocio("Solo se puede editar un servicio en estado PROGRAMADO.");
            }

            var datos = await ValidarProgramacionAsync(
                solicitud.IdEmpresa,
                solicitud.IdPlanificacion,
                solicitud.IdRuta,
                solicitud.Fecha,
                solicitud.HoraInicio,
                solicitud.HoraFin,
                solicitud.TipoServicio);

            servicio.IdEmpresa = datos.IdEmpresa;
            servicio.IdPlanificacion = datos.IdPlanificacion;
            servicio.IdRuta = datos.IdRuta;
            servicio.Fecha = datos.Fecha;
            servicio.HoraInicio = datos.HoraInicio;
            servicio.HoraFin = datos.HoraFin;
            servicio.TipoServicio = datos.TipoServicio;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el servicio {IdServicio}.",
                idAdministrador,
                idServicio);

            return Mapear(servicio);
        }

        public async Task<ServicioRespuestaDto> CambiarEstadoAsync(
            int idServicio,
            CambiarEstadoServicioSolicitudDto solicitud,
            int idAdministrador)
        {
            var servicio = await ObtenerServicioAsync(idServicio);

            if (!TransicionesPermitidas.Contains((servicio.Estado, solicitud.Estado)))
            {
                throw new ExcepcionNegocio(
                    $"No está permitido cambiar el estado de {servicio.Estado} a {solicitud.Estado}.");
            }

            if (solicitud.Estado == EstadoServicio.EN_CURSO)
            {
                return await IniciarServicioAsync(servicio, idAdministrador, "administrador");
            }

            if (solicitud.Estado == EstadoServicio.FINALIZADO)
            {
                return await FinalizarServicioAsync(servicio, idAdministrador, "administrador");
            }

            servicio.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del servicio {IdServicio} a {Estado}.",
                idAdministrador,
                idServicio,
                solicitud.Estado);

            return Mapear(servicio);
        }

        public async Task<ServicioRespuestaDto> IniciarComoConductorAsync(int idServicio, int idUsuario)
        {
            var conductor = await AsegurarConductorAsignadoAsync(idServicio, idUsuario);
            var servicio = await ObtenerServicioAsync(idServicio);
            return await IniciarServicioAsync(servicio, conductor.IdConductor, "conductor");
        }

        public async Task<ServicioRespuestaDto> FinalizarComoConductorAsync(int idServicio, int idUsuario)
        {
            var conductor = await AsegurarConductorAsignadoAsync(idServicio, idUsuario);
            var servicio = await ObtenerServicioAsync(idServicio);
            return await FinalizarServicioAsync(servicio, conductor.IdConductor, "conductor");
        }

        private async Task<ServicioRespuestaDto> IniciarServicioAsync(
            Servicio servicio,
            int idActor,
            string rolActor)
        {
            if (servicio.Estado != EstadoServicio.PROGRAMADO)
            {
                throw new ExcepcionNegocio(
                    $"No está permitido cambiar el estado de {servicio.Estado} a {EstadoServicio.EN_CURSO}.");
            }

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();

            await _servicioAsistencias.ResolverProvisionalesAlIniciarAsync(servicio.IdServicio);
            servicio.FechaHoraInicioReal = DateTime.UtcNow;
            servicio.Estado = EstadoServicio.EN_CURSO;
            await _contexto.SaveChangesAsync();
            await transaccion.CommitAsync();

            _logger.LogInformation(
                "El {RolActor} {IdActor} inició el servicio {IdServicio}.",
                rolActor,
                idActor,
                servicio.IdServicio);

            return Mapear(servicio);
        }

        private async Task<ServicioRespuestaDto> FinalizarServicioAsync(
            Servicio servicio,
            int idActor,
            string rolActor)
        {
            if (servicio.Estado != EstadoServicio.EN_CURSO)
            {
                throw new ExcepcionNegocio(
                    $"No está permitido cambiar el estado de {servicio.Estado} a {EstadoServicio.FINALIZADO}.");
            }

            servicio.FechaHoraFinReal = DateTime.UtcNow;
            servicio.Estado = EstadoServicio.FINALIZADO;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El {RolActor} {IdActor} finalizó el servicio {IdServicio}.",
                rolActor,
                idActor,
                servicio.IdServicio);

            return Mapear(servicio);
        }

        private async Task<Conductor> AsegurarConductorAsignadoAsync(int idServicio, int idUsuario)
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

            var servicioExiste = await _contexto.Servicios
                .AsNoTracking()
                .AnyAsync(s => s.IdServicio == idServicio);

            if (!servicioExiste)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            var asignado = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .AnyAsync(a =>
                    a.IdServicio == idServicio
                    && a.IdConductor == conductor.IdConductor
                    && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (!asignado)
            {
                throw new ExcepcionNegocio(
                    "No tiene una asignación activa para este servicio.",
                    StatusCodes.Status403Forbidden);
            }

            return conductor;
        }

        private async Task<Servicio> ObtenerServicioAsync(int idServicio)
        {
            var servicio = await _contexto.Servicios
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            return servicio;
        }

        private async Task<DatosProgramacion> ValidarProgramacionAsync(
            int idEmpresa,
            int idPlanificacion,
            string idRuta,
            DateOnly fecha,
            TimeOnly horaInicio,
            TimeOnly horaFin,
            string tipoServicio)
        {
            var tipo = RequerirTexto(tipoServicio, "El tipo de servicio es obligatorio.");
            ValidarHorario(horaInicio, horaFin);

            await AsegurarEmpresaActivaAsync(idEmpresa);
            var planificacion = await AsegurarPlanificacionAsignableAsync(idPlanificacion, idEmpresa);
            ValidarFechaEnPeriodo(fecha, planificacion.Periodo);
            var rutaId = await AsegurarRutaAsignableAsync(idRuta, idEmpresa);

            return new DatosProgramacion(
                idEmpresa,
                planificacion.IdPlanificacion,
                rutaId,
                fecha,
                horaInicio,
                horaFin,
                tipo);
        }

        private async Task AsegurarEmpresaActivaAsync(int idEmpresa)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.", StatusCodes.Status404NotFound);
            }

            if (empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
            }
        }

        private async Task<Planificacion> AsegurarPlanificacionAsignableAsync(int idPlanificacion, int idEmpresa)
        {
            var planificacion = await _contexto.Planificaciones
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdPlanificacion == idPlanificacion);

            if (planificacion is null)
            {
                throw new ExcepcionNegocio("La planificación indicada no existe.", StatusCodes.Status404NotFound);
            }

            if (planificacion.Estado != EstadoPlanificacion.ACTIVA)
            {
                throw new ExcepcionNegocio("La planificación indicada debe estar ACTIVA.");
            }

            if (planificacion.IdEmpresa != idEmpresa)
            {
                throw new ExcepcionNegocio("La planificación no pertenece a la empresa indicada.");
            }

            return planificacion;
        }

        private async Task<string> AsegurarRutaAsignableAsync(string idRuta, int idEmpresa)
        {
            var identificador = idRuta?.Trim() ?? string.Empty;

            if (!ObjectId.TryParse(identificador, out var objectId))
            {
                throw new ExcepcionNegocio("El identificador de la ruta no es válido.");
            }

            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();

            if (ruta is null)
            {
                throw new ExcepcionNegocio("La ruta indicada no existe.", StatusCodes.Status404NotFound);
            }

            if (ruta.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La ruta indicada no se encuentra activa.");
            }

            if (ruta.EmpresaId != idEmpresa)
            {
                throw new ExcepcionNegocio("La ruta no pertenece a la empresa indicada.");
            }

            return ruta.Id.ToString();
        }

        private static void ValidarFechaEnPeriodo(DateOnly fecha, string periodo)
        {
            var periodoFecha = $"{fecha.Year:D4}-{fecha.Month:D2}";

            if (!string.Equals(periodoFecha, periodo, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio("La fecha no corresponde al período de la planificación.");
            }
        }

        private static void ValidarHorario(TimeOnly horaInicio, TimeOnly horaFin)
        {
            if (horaFin <= horaInicio)
            {
                throw new ExcepcionNegocio("La hora de fin debe ser posterior a la hora de inicio.");
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

        private static ServicioRespuestaDto Mapear(Servicio servicio)
        {
            return new ServicioRespuestaDto
            {
                IdServicio = servicio.IdServicio,
                IdEmpresa = servicio.IdEmpresa,
                IdPlanificacion = servicio.IdPlanificacion,
                IdRuta = servicio.IdRuta,
                Fecha = servicio.Fecha,
                HoraInicio = servicio.HoraInicio,
                HoraFin = servicio.HoraFin,
                FechaHoraInicioReal = servicio.FechaHoraInicioReal,
                FechaHoraFinReal = servicio.FechaHoraFinReal,
                TipoServicio = servicio.TipoServicio,
                Estado = servicio.Estado
            };
        }

        private sealed record DatosProgramacion(
            int IdEmpresa,
            int IdPlanificacion,
            string IdRuta,
            DateOnly Fecha,
            TimeOnly HoraInicio,
            TimeOnly HoraFin,
            string TipoServicio);
    }
}
