using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Asignaciones;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioAsignaciones
    {
        Task<IReadOnlyList<AsignacionRespuestaDto>> ListarAsync(
            int? idServicio,
            int? idConductor,
            int? idVehiculo,
            EstadoAsignacionServicio? estado);

        Task<AsignacionRespuestaDto> ObtenerPorIdAsync(int idAsignacion);

        Task<AsignacionRespuestaDto> CrearAsync(CrearAsignacionSolicitudDto solicitud, int idAdministrador);

        Task<AsignacionRespuestaDto> ReemplazarAsync(
            int idAsignacion,
            ReemplazarAsignacionSolicitudDto solicitud,
            int idAdministrador);

        Task<AsignacionRespuestaDto> CambiarEstadoAsync(
            int idAsignacion,
            CambiarEstadoAsignacionSolicitudDto solicitud,
            int idAdministrador);
    }

    /// <summary>
    /// Gestión administrativa de asignaciones de conductor y vehículo.
    /// Un servicio tiene como máximo una asignación ACTIVA. Los reemplazos se registran en historial_asignacion.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioAsignaciones : IServicioAsignaciones
    {
        private const string MensajeConductorOcupado = "El conductor indicado ya tiene una asignación activa en un horario superpuesto.";
        private const string MensajeVehiculoOcupado = "El vehículo indicado ya tiene una asignación activa en un horario superpuesto.";
        private const string MensajeAsignacionActiva = "El servicio ya tiene una asignación activa.";

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioAsignaciones> _logger;

        public ServicioAsignaciones(TransporteContext contexto, ILogger<ServicioAsignaciones> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<AsignacionRespuestaDto>> ListarAsync(
            int? idServicio,
            int? idConductor,
            int? idVehiculo,
            EstadoAsignacionServicio? estado)
        {
            var consulta = _contexto.AsignacionesServicio.AsNoTracking();

            if (idServicio.HasValue)
            {
                consulta = consulta.Where(a => a.IdServicio == idServicio.Value);
            }

            if (idConductor.HasValue)
            {
                consulta = consulta.Where(a => a.IdConductor == idConductor.Value);
            }

            if (idVehiculo.HasValue)
            {
                consulta = consulta.Where(a => a.IdVehiculo == idVehiculo.Value);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(a => a.Estado == estado.Value);
            }

            var asignaciones = await consulta
                .OrderBy(a => a.IdAsignacion)
                .ToListAsync();

            return asignaciones.Select(Mapear).ToList();
        }

        public async Task<AsignacionRespuestaDto> ObtenerPorIdAsync(int idAsignacion)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.IdAsignacion == idAsignacion);

            if (asignacion is null)
            {
                throw new ExcepcionNegocio("La asignación no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(asignacion);
        }

        public async Task<AsignacionRespuestaDto> CrearAsync(
            CrearAsignacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var servicio = await ObtenerServicioParaAsignarAsync(solicitud.IdServicio);

            if (servicio.Estado != EstadoServicio.PROGRAMADO)
            {
                throw new ExcepcionNegocio("Solo se pueden crear asignaciones para un servicio PROGRAMADO.");
            }

            await AsegurarSinAsignacionActivaAsync(servicio.IdServicio);
            await AsegurarConductorActivoAsync(solicitud.IdConductor);
            await AsegurarVehiculoActivoAsync(solicitud.IdVehiculo);
            await AsegurarDisponibilidadAsync(
                solicitud.IdConductor,
                solicitud.IdVehiculo,
                servicio);

            var asignacion = new AsignacionServicio
            {
                IdServicio = servicio.IdServicio,
                IdConductor = solicitud.IdConductor,
                IdVehiculo = solicitud.IdVehiculo,
                FechaAsignacion = DateTime.UtcNow,
                Estado = EstadoAsignacionServicio.ACTIVA
            };

            _contexto.AsignacionesServicio.Add(asignacion);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó la asignación {IdAsignacion} para el servicio {IdServicio}.",
                idAdministrador,
                asignacion.IdAsignacion,
                servicio.IdServicio);

            return Mapear(asignacion);
        }

        public async Task<AsignacionRespuestaDto> ReemplazarAsync(
            int idAsignacion,
            ReemplazarAsignacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var anterior = await ObtenerAsignacionConServicioAsync(idAsignacion);

            if (anterior.Estado != EstadoAsignacionServicio.ACTIVA)
            {
                throw new ExcepcionNegocio("Solo se puede reemplazar una asignación ACTIVA.");
            }

            if (anterior.Servicio.Estado is EstadoServicio.FINALIZADO or EstadoServicio.CANCELADO)
            {
                throw new ExcepcionNegocio("No se puede reemplazar la asignación de un servicio FINALIZADO o CANCELADO.");
            }

            var idConductorNuevo = solicitud.IdConductor ?? anterior.IdConductor;
            var idVehiculoNuevo = solicitud.IdVehiculo ?? anterior.IdVehiculo;

            if (idConductorNuevo == anterior.IdConductor && idVehiculoNuevo == anterior.IdVehiculo)
            {
                throw new ExcepcionNegocio("No existe un cambio de conductor o vehículo que registrar.");
            }

            await AsegurarConductorActivoAsync(idConductorNuevo);
            await AsegurarVehiculoActivoAsync(idVehiculoNuevo);
            await AsegurarDisponibilidadAsync(
                idConductorNuevo,
                idVehiculoNuevo,
                anterior.Servicio,
                anterior.IdAsignacion);

            var ahora = DateTime.UtcNow;
            var nueva = new AsignacionServicio
            {
                IdServicio = anterior.IdServicio,
                IdConductor = idConductorNuevo,
                IdVehiculo = idVehiculoNuevo,
                FechaAsignacion = ahora,
                Estado = EstadoAsignacionServicio.ACTIVA
            };

            var historial = new HistorialAsignacion
            {
                IdServicio = anterior.IdServicio,
                IdConductorAnterior = anterior.IdConductor,
                IdConductorNuevo = idConductorNuevo,
                IdVehiculoAnterior = anterior.IdVehiculo,
                IdVehiculoNuevo = idVehiculoNuevo,
                FechaHora = ahora
            };

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                anterior.Estado = EstadoAsignacionServicio.REEMPLAZADA;
                _contexto.AsignacionesServicio.Add(nueva);
                _contexto.HistorialesAsignacion.Add(historial);
                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} reemplazó la asignación {IdAsignacionAnterior} por {IdAsignacionNueva} en el servicio {IdServicio}.",
                idAdministrador,
                anterior.IdAsignacion,
                nueva.IdAsignacion,
                anterior.IdServicio);

            return Mapear(nueva);
        }

        public async Task<AsignacionRespuestaDto> CambiarEstadoAsync(
            int idAsignacion,
            CambiarEstadoAsignacionSolicitudDto solicitud,
            int idAdministrador)
        {
            var asignacion = await ObtenerAsignacionAsync(idAsignacion);

            if (asignacion.Estado != EstadoAsignacionServicio.ACTIVA
                || solicitud.Estado != EstadoAsignacionServicio.CANCELADA)
            {
                throw new ExcepcionNegocio(
                    $"No está permitido cambiar el estado de {asignacion.Estado} a {solicitud.Estado}.");
            }

            asignacion.Estado = EstadoAsignacionServicio.CANCELADA;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} canceló la asignación {IdAsignacion}.",
                idAdministrador,
                idAsignacion);

            return Mapear(asignacion);
        }

        private async Task<AsignacionServicio> ObtenerAsignacionAsync(int idAsignacion)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .FirstOrDefaultAsync(a => a.IdAsignacion == idAsignacion);

            if (asignacion is null)
            {
                throw new ExcepcionNegocio("La asignación no existe.", StatusCodes.Status404NotFound);
            }

            return asignacion;
        }

        private async Task<AsignacionServicio> ObtenerAsignacionConServicioAsync(int idAsignacion)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .Include(a => a.Servicio)
                .FirstOrDefaultAsync(a => a.IdAsignacion == idAsignacion);

            if (asignacion is null)
            {
                throw new ExcepcionNegocio("La asignación no existe.", StatusCodes.Status404NotFound);
            }

            return asignacion;
        }

        private async Task<Servicio> ObtenerServicioParaAsignarAsync(int idServicio)
        {
            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio indicado no existe.", StatusCodes.Status404NotFound);
            }

            if (servicio.Estado is EstadoServicio.FINALIZADO or EstadoServicio.CANCELADO)
            {
                throw new ExcepcionNegocio("No se pueden crear asignaciones sobre un servicio FINALIZADO o CANCELADO.");
            }

            return servicio;
        }

        private async Task AsegurarSinAsignacionActivaAsync(int idServicio)
        {
            var existeActiva = await _contexto.AsignacionesServicio
                .AnyAsync(a => a.IdServicio == idServicio && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (existeActiva)
            {
                throw new ExcepcionNegocio(MensajeAsignacionActiva, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarConductorActivoAsync(int idConductor)
        {
            var conductor = await _contexto.Conductores
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdConductor == idConductor);

            if (conductor is null)
            {
                throw new ExcepcionNegocio("El conductor indicado no existe.", StatusCodes.Status404NotFound);
            }

            if (conductor.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("El conductor indicado no se encuentra activo.");
            }
        }

        private async Task AsegurarVehiculoActivoAsync(int idVehiculo)
        {
            var vehiculo = await _contexto.Vehiculos
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.IdVehiculo == idVehiculo);

            if (vehiculo is null)
            {
                throw new ExcepcionNegocio("El vehículo indicado no existe.", StatusCodes.Status404NotFound);
            }

            if (vehiculo.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("El vehículo indicado no se encuentra activo.");
            }
        }

        private async Task AsegurarDisponibilidadAsync(
            int idConductor,
            int idVehiculo,
            Servicio servicioObjetivo,
            int? idAsignacionExcluida = null)
        {
            var consulta = _contexto.AsignacionesServicio
                .AsNoTracking()
                .Where(a => a.Estado == EstadoAsignacionServicio.ACTIVA)
                .Where(a => a.IdConductor == idConductor || a.IdVehiculo == idVehiculo)
                .Where(a => a.Servicio.Fecha == servicioObjetivo.Fecha)
                .Where(a => a.Servicio.Estado != EstadoServicio.FINALIZADO
                    && a.Servicio.Estado != EstadoServicio.CANCELADO)
                .Where(a => servicioObjetivo.HoraInicio < a.Servicio.HoraFin
                    && servicioObjetivo.HoraFin > a.Servicio.HoraInicio);

            if (idAsignacionExcluida.HasValue)
            {
                consulta = consulta.Where(a => a.IdAsignacion != idAsignacionExcluida.Value);
            }

            var conflictos = await consulta
                .Select(a => new { a.IdConductor, a.IdVehiculo })
                .ToListAsync();

            if (conflictos.Any(c => c.IdConductor == idConductor))
            {
                throw new ExcepcionNegocio(MensajeConductorOcupado, StatusCodes.Status409Conflict);
            }

            if (conflictos.Any(c => c.IdVehiculo == idVehiculo))
            {
                throw new ExcepcionNegocio(MensajeVehiculoOcupado, StatusCodes.Status409Conflict);
            }
        }

        private static AsignacionRespuestaDto Mapear(AsignacionServicio asignacion)
        {
            return new AsignacionRespuestaDto
            {
                IdAsignacion = asignacion.IdAsignacion,
                IdServicio = asignacion.IdServicio,
                IdConductor = asignacion.IdConductor,
                IdVehiculo = asignacion.IdVehiculo,
                FechaAsignacion = asignacion.FechaAsignacion,
                Estado = asignacion.Estado
            };
        }
    }
}
