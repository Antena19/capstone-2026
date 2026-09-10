using BACKEND.Datos.MySQL;
using BACKEND.DTOs.PasajerosServicio;
using BACKEND.DTOs.Servicios;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
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

        Task<CrearServiciosRecurrentesRespuestaDto> CrearRecurrentesAsync(
            CrearServiciosRecurrentesSolicitudDto solicitud,
            int idAdministrador);

        Task<ServicioRespuestaDto> EditarAsync(int idServicio, EditarServicioSolicitudDto solicitud, int idAdministrador);

        Task<IReadOnlyList<ServicioRespuestaDto>> EditarSerieAsync(
            int idServicio,
            EditarSerieServiciosSolicitudDto solicitud,
            int idAdministrador);

        Task<ServicioRespuestaDto> CambiarEstadoAsync(
            int idServicio,
            CambiarEstadoServicioSolicitudDto solicitud,
            int idAdministrador);

        Task<IReadOnlyList<ServicioRespuestaDto>> CambiarEstadoSerieAsync(
            int idServicio,
            CambiarEstadoSerieServiciosSolicitudDto solicitud,
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
        private readonly IServicioPasajerosServicio _servicioPasajerosServicio;
        private readonly ILogger<ServicioServicios> _logger;

        public ServicioServicios(
            TransporteContext contexto,
            IMongoCollection<Ruta> rutas,
            IServicioAsistencias servicioAsistencias,
            IServicioPasajerosServicio servicioPasajerosServicio,
            ILogger<ServicioServicios> logger)
        {
            _contexto = contexto;
            _rutas = rutas;
            _servicioAsistencias = servicioAsistencias;
            _servicioPasajerosServicio = servicioPasajerosServicio;
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

            var pasajeros = solicitud.Pasajeros ?? [];
            var transaccionPropia = pasajeros.Count > 0 && _contexto.Database.CurrentTransaction is null;

            if (transaccionPropia)
            {
                await using var transaccion = await _contexto.Database.BeginTransactionAsync();
                var creado = await PersistirServicioUnicoAsync(datos, pasajeros, idAdministrador);
                await transaccion.CommitAsync();
                return creado;
            }

            return await PersistirServicioUnicoAsync(datos, pasajeros, idAdministrador);
        }

        public async Task<CrearServiciosRecurrentesRespuestaDto> CrearRecurrentesAsync(
            CrearServiciosRecurrentesSolicitudDto solicitud,
            int idAdministrador)
        {
            if (solicitud.FechaDesde > solicitud.FechaHasta)
            {
                throw new ExcepcionNegocio("La fecha inicial no puede ser posterior a la fecha final.");
            }

            var dias = NormalizarDiasSemana(solicitud.DiasSemana);
            var datosBase = await ValidarProgramacionAsync(
                solicitud.IdEmpresa,
                solicitud.IdPlanificacion,
                solicitud.IdRuta,
                solicitud.FechaDesde,
                solicitud.HoraInicio,
                solicitud.HoraFin,
                solicitud.TipoServicio);

            ValidarFechaEnPeriodo(solicitud.FechaHasta, datosBase.Periodo);
            AsegurarFechaNoAnteriorAlDiaActual(solicitud.FechaHasta);

            var fechas = GenerarFechasSerie(
                solicitud.FechaDesde,
                solicitud.FechaHasta,
                dias,
                datosBase.Periodo);

            var pasajeros = solicitud.Pasajeros ?? [];
            var idSerie = Guid.NewGuid().ToString();

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();

            var servicios = new List<Servicio>();
            foreach (var fecha in fechas)
            {
                var servicio = new Servicio
                {
                    IdEmpresa = datosBase.IdEmpresa,
                    IdPlanificacion = datosBase.IdPlanificacion,
                    IdRuta = datosBase.IdRuta,
                    IdSerie = idSerie,
                    Fecha = fecha,
                    HoraInicio = datosBase.HoraInicio,
                    HoraFin = datosBase.HoraFin,
                    FechaHoraInicioReal = null,
                    FechaHoraFinReal = null,
                    TipoServicio = datosBase.TipoServicio,
                    Estado = EstadoServicio.PROGRAMADO
                };
                _contexto.Servicios.Add(servicio);
                servicios.Add(servicio);
            }

            await _contexto.SaveChangesAsync();

            if (pasajeros.Count > 0)
            {
                foreach (var servicio in servicios)
                {
                    await _servicioPasajerosServicio.CrearLoteAsync(
                        new CrearPasajerosServicioLoteSolicitudDto
                        {
                            IdServicio = servicio.IdServicio,
                            Pasajeros = pasajeros.ToList()
                        },
                        idAdministrador);
                }
            }

            await transaccion.CommitAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó la serie {IdSerie} con {Cantidad} servicios.",
                idAdministrador,
                idSerie,
                servicios.Count);

            return new CrearServiciosRecurrentesRespuestaDto
            {
                IdSerie = idSerie,
                CantidadServicios = servicios.Count,
                Servicios = servicios.Select(Mapear).ToList()
            };
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

        public async Task<IReadOnlyList<ServicioRespuestaDto>> EditarSerieAsync(
            int idServicio,
            EditarSerieServiciosSolicitudDto solicitud,
            int idAdministrador)
        {
            var origen = await ObtenerServicioAsync(idServicio);
            await AsegurarPlanificacionAsignableAsync(origen.IdPlanificacion, origen.IdEmpresa);

            var tipo = NormalizarTipoServicio(solicitud.TipoServicio);
            ValidarHorario(solicitud.HoraInicio, solicitud.HoraFin);
            var idRuta = await AsegurarRutaAsignableAsync(solicitud.IdRuta, origen.IdEmpresa);

            var objetivos = await ObtenerServiciosDeAlcanceAsync(origen, solicitud.Alcance);
            if (solicitud.Alcance == AlcanceEdicionSerie.ESTE)
            {
                AsegurarFechaNoAnteriorAlDiaActual(origen.Fecha);
            }
            else
            {
                var hoy = DateOnly.FromDateTime(DateTime.Now);
                objetivos = objetivos.Where(s => s.Fecha >= hoy).ToList();
            }

            if (objetivos.Count == 0)
            {
                throw new ExcepcionNegocio("No hay servicios PROGRAMADOS para aplicar el alcance indicado.");
            }

            foreach (var servicio in objetivos)
            {
                servicio.IdRuta = idRuta;
                servicio.HoraInicio = solicitud.HoraInicio;
                servicio.HoraFin = solicitud.HoraFin;
                servicio.TipoServicio = tipo;
            }

            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó {Cantidad} servicios de la serie {IdSerie} con alcance {Alcance}.",
                idAdministrador,
                objetivos.Count,
                origen.IdSerie,
                solicitud.Alcance);

            return objetivos.Select(Mapear).ToList();
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

        public async Task<IReadOnlyList<ServicioRespuestaDto>> CambiarEstadoSerieAsync(
            int idServicio,
            CambiarEstadoSerieServiciosSolicitudDto solicitud,
            int idAdministrador)
        {
            if (solicitud.Estado != EstadoServicio.CANCELADO)
            {
                throw new ExcepcionNegocio("Solo se puede cancelar una serie desde este endpoint.");
            }

            var origen = await ObtenerServicioAsync(idServicio);
            var objetivos = await ObtenerServiciosDeAlcanceAsync(origen, solicitud.Alcance);
            if (objetivos.Count == 0)
            {
                throw new ExcepcionNegocio("No hay servicios PROGRAMADOS para aplicar el alcance indicado.");
            }

            foreach (var servicio in objetivos)
            {
                if (!TransicionesPermitidas.Contains((servicio.Estado, EstadoServicio.CANCELADO)))
                {
                    throw new ExcepcionNegocio(
                        $"No está permitido cambiar el estado de {servicio.Estado} a {EstadoServicio.CANCELADO}.");
                }

                servicio.Estado = EstadoServicio.CANCELADO;
            }

            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} canceló {Cantidad} servicios de la serie {IdSerie} con alcance {Alcance}.",
                idAdministrador,
                objetivos.Count,
                origen.IdSerie,
                solicitud.Alcance);

            return objetivos.Select(Mapear).ToList();
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

        private async Task<ServicioRespuestaDto> PersistirServicioUnicoAsync(
            DatosProgramacion datos,
            IReadOnlyList<PasajeroServicioInicialDto> pasajeros,
            int idAdministrador)
        {
            var servicio = new Servicio
            {
                IdEmpresa = datos.IdEmpresa,
                IdPlanificacion = datos.IdPlanificacion,
                IdRuta = datos.IdRuta,
                IdSerie = null,
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

            if (pasajeros.Count > 0)
            {
                await _servicioPasajerosServicio.CrearLoteAsync(
                    new CrearPasajerosServicioLoteSolicitudDto
                    {
                        IdServicio = servicio.IdServicio,
                        Pasajeros = pasajeros.ToList()
                    },
                    idAdministrador);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el servicio {IdServicio}.",
                idAdministrador,
                servicio.IdServicio);

            return Mapear(servicio);
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
            var tipo = NormalizarTipoServicio(tipoServicio);
            ValidarHorario(horaInicio, horaFin);
            AsegurarFechaNoAnteriorAlDiaActual(fecha);

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
                tipo,
                planificacion.Periodo);
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

            if (planificacion.Estado is EstadoPlanificacion.CERRADA or EstadoPlanificacion.CANCELADA)
            {
                throw new ExcepcionNegocio(
                    "No se pueden crear o modificar servicios en una planificación cerrada o cancelada.",
                    StatusCodes.Status409Conflict);
            }

            if (planificacion.Estado is not (EstadoPlanificacion.BORRADOR or EstadoPlanificacion.ACTIVA))
            {
                throw new ExcepcionNegocio(
                    "No se pueden crear o modificar servicios en una planificación cerrada o cancelada.",
                    StatusCodes.Status409Conflict);
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

        private static void AsegurarFechaNoAnteriorAlDiaActual(DateOnly fecha)
        {
            var hoy = DateOnly.FromDateTime(DateTime.Now);
            if (fecha < hoy)
            {
                throw new ExcepcionNegocio(
                    "No se puede crear ni modificar un servicio para una fecha anterior al día actual.");
            }
        }

        private static void AsegurarServicioProgramado(Servicio servicio)
        {
            if (servicio.Estado != EstadoServicio.PROGRAMADO)
            {
                throw new ExcepcionNegocio("Solo se puede editar un servicio en estado PROGRAMADO.");
            }
        }

        private static string NormalizarTipoServicio(string? tipoServicio)
        {
            var tipo = (tipoServicio ?? string.Empty).Trim().ToUpperInvariant();
            if (!TiposServicio.EsValido(tipo))
            {
                throw new ExcepcionNegocio(TiposServicio.MensajeInvalido);
            }

            return tipo;
        }

        private static HashSet<DayOfWeek> NormalizarDiasSemana(IReadOnlyCollection<DiaSemana>? dias)
        {
            if (dias is null || dias.Count == 0)
            {
                throw new ExcepcionNegocio("Debe indicar al menos un día de la semana.");
            }

            return dias.Select(MapearDiaSemana).ToHashSet();
        }

        private static DayOfWeek MapearDiaSemana(DiaSemana dia)
        {
            return dia switch
            {
                DiaSemana.LUNES => DayOfWeek.Monday,
                DiaSemana.MARTES => DayOfWeek.Tuesday,
                DiaSemana.MIERCOLES => DayOfWeek.Wednesday,
                DiaSemana.JUEVES => DayOfWeek.Thursday,
                DiaSemana.VIERNES => DayOfWeek.Friday,
                DiaSemana.SABADO => DayOfWeek.Saturday,
                DiaSemana.DOMINGO => DayOfWeek.Sunday,
                _ => throw new ExcepcionNegocio("El día de la semana indicado no es válido.")
            };
        }

        private static IReadOnlyList<DateOnly> GenerarFechasSerie(
            DateOnly fechaDesde,
            DateOnly fechaHasta,
            IReadOnlyCollection<DayOfWeek> dias,
            string periodo)
        {
            var fechas = new List<DateOnly>();
            for (var fecha = fechaDesde; fecha <= fechaHasta; fecha = fecha.AddDays(1))
            {
                if (!dias.Contains(fecha.DayOfWeek))
                {
                    continue;
                }

                ValidarFechaEnPeriodo(fecha, periodo);
                AsegurarFechaNoAnteriorAlDiaActual(fecha);
                fechas.Add(fecha);
            }

            if (fechas.Count == 0)
            {
                throw new ExcepcionNegocio("El rango y los días seleccionados no generan ninguna ocurrencia.");
            }

            return fechas;
        }

        private async Task<IReadOnlyList<Servicio>> ObtenerServiciosDeAlcanceAsync(
            Servicio origen,
            AlcanceEdicionSerie alcance)
        {
            if (alcance == AlcanceEdicionSerie.ESTE)
            {
                AsegurarServicioProgramado(origen);
                return [origen];
            }

            if (string.IsNullOrWhiteSpace(origen.IdSerie))
            {
                throw new ExcepcionNegocio("El servicio no pertenece a una serie.");
            }

            var consulta = _contexto.Servicios.Where(s =>
                s.IdSerie == origen.IdSerie && s.Estado == EstadoServicio.PROGRAMADO);

            if (alcance == AlcanceEdicionSerie.ESTE_Y_FUTUROS)
            {
                consulta = consulta.Where(s => s.Fecha >= origen.Fecha);
            }

            return await consulta
                .OrderBy(s => s.Fecha)
                .ThenBy(s => s.IdServicio)
                .ToListAsync();
        }

        private static void ValidarHorario(TimeOnly horaInicio, TimeOnly horaFin)
        {
            if (horaFin <= horaInicio)
            {
                throw new ExcepcionNegocio("La hora de fin debe ser posterior a la hora de inicio.");
            }
        }

        private static ServicioRespuestaDto Mapear(Servicio servicio)
        {
            return new ServicioRespuestaDto
            {
                IdServicio = servicio.IdServicio,
                IdEmpresa = servicio.IdEmpresa,
                IdPlanificacion = servicio.IdPlanificacion,
                IdRuta = servicio.IdRuta,
                IdSerie = servicio.IdSerie,
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
            string TipoServicio,
            string Periodo);
    }
}
