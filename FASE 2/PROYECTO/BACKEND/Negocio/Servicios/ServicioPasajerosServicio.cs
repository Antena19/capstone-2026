using BACKEND.Datos.MySQL;
using BACKEND.DTOs.PasajerosServicio;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioPasajerosServicio
    {
        Task<IReadOnlyList<PasajeroServicioRespuestaDto>> ListarAsync(
            int? idServicio,
            int? idPasajero,
            EstadoPasajeroServicio? estado,
            EstadoConfirmacionViaje? estadoConfirmacion);

        Task<PasajeroServicioRespuestaDto> ObtenerPorIdAsync(int idPasajeroServicio);

        Task<PasajeroServicioRespuestaDto> CrearAsync(CrearPasajeroServicioSolicitudDto solicitud, int idAdministrador);

        Task<PasajeroServicioRespuestaDto> CambiarEstadoAsync(
            int idPasajeroServicio,
            CambiarEstadoPasajeroServicioSolicitudDto solicitud,
            int idAdministrador);

        Task<PasajeroServicioRespuestaDto> ConfirmarViajeAsync(
            int idPasajeroServicio,
            int idUsuario,
            ConfirmarViajeSolicitudDto solicitud);
    }

    /// <summary>
    /// Planificación de pasajeros por servicio. La asociación administrativa es exclusiva del ADMINISTRADOR.
    /// La confirmación la realiza el PASAJERO autenticado, resolviendo el pasajero desde id_usuario del JWT.
    /// Si hay asignación ACTIVA, se respeta la capacidad del vehículo. Sin asignación, no se inventa un cupo.
    /// </summary>
    public class ServicioPasajerosServicio : IServicioPasajerosServicio
    {
        private const string MensajeDuplicado = "El pasajero ya está asociado a este servicio.";
        private const string MensajeCapacidad = "El vehículo asignado no tiene capacidad disponible.";

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioPasajerosServicio> _logger;

        public ServicioPasajerosServicio(TransporteContext contexto, ILogger<ServicioPasajerosServicio> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<PasajeroServicioRespuestaDto>> ListarAsync(
            int? idServicio,
            int? idPasajero,
            EstadoPasajeroServicio? estado,
            EstadoConfirmacionViaje? estadoConfirmacion)
        {
            var consulta = _contexto.PasajerosServicio.AsNoTracking();

            if (idServicio.HasValue)
            {
                consulta = consulta.Where(p => p.IdServicio == idServicio.Value);
            }

            if (idPasajero.HasValue)
            {
                consulta = consulta.Where(p => p.IdPasajero == idPasajero.Value);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(p => p.Estado == estado.Value);
            }

            if (estadoConfirmacion.HasValue)
            {
                consulta = consulta.Where(p => p.EstadoConfirmacion == estadoConfirmacion.Value);
            }

            var registros = await consulta
                .OrderBy(p => p.IdPasajeroServicio)
                .ToListAsync();

            return registros.Select(Mapear).ToList();
        }

        public async Task<PasajeroServicioRespuestaDto> ObtenerPorIdAsync(int idPasajeroServicio)
        {
            var registro = await _contexto.PasajerosServicio
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdPasajeroServicio == idPasajeroServicio);

            if (registro is null)
            {
                throw new ExcepcionNegocio("El registro de pasajero por servicio no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(registro);
        }

        public async Task<PasajeroServicioRespuestaDto> CrearAsync(
            CrearPasajeroServicioSolicitudDto solicitud,
            int idAdministrador)
        {
            var servicio = await ObtenerServicioProgramableAsync(solicitud.IdServicio);
            await AsegurarPasajeroAsignableAsync(solicitud.IdPasajero, servicio.IdEmpresa);
            await AsegurarNoDuplicadoAsync(solicitud.IdServicio, solicitud.IdPasajero);
            await AsegurarCapacidadDisponibleAsync(solicitud.IdServicio);

            var registro = new PasajeroServicio
            {
                IdServicio = solicitud.IdServicio,
                IdPasajero = solicitud.IdPasajero,
                EstadoConfirmacion = EstadoConfirmacionViaje.PENDIENTE,
                FechaConfirmacion = null,
                Estado = EstadoPasajeroServicio.ACTIVO
            };

            _contexto.PasajerosServicio.Add(registro);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeDuplicado, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} asoció el pasajero {IdPasajero} al servicio {IdServicio}.",
                idAdministrador,
                solicitud.IdPasajero,
                solicitud.IdServicio);

            return Mapear(registro);
        }

        public async Task<PasajeroServicioRespuestaDto> CambiarEstadoAsync(
            int idPasajeroServicio,
            CambiarEstadoPasajeroServicioSolicitudDto solicitud,
            int idAdministrador)
        {
            var registro = await ObtenerRegistroAsync(idPasajeroServicio);

            if (registro.Estado == solicitud.Estado)
            {
                return Mapear(registro);
            }

            if (solicitud.Estado == EstadoPasajeroServicio.ACTIVO)
            {
                var servicio = await ObtenerServicioProgramableAsync(registro.IdServicio);
                var pasajero = await _contexto.Pasajeros
                    .AsNoTracking()
                    .FirstAsync(p => p.IdPasajero == registro.IdPasajero);

                if (pasajero.Estado != EstadoRegistro.ACTIVO)
                {
                    throw new ExcepcionNegocio("El pasajero indicado no se encuentra activo.");
                }

                if (pasajero.IdEmpresa != servicio.IdEmpresa)
                {
                    throw new ExcepcionNegocio("El pasajero no pertenece a la empresa del servicio.");
                }

                await AsegurarCapacidadDisponibleAsync(registro.IdServicio);
            }

            registro.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del pasajero-servicio {IdPasajeroServicio} a {Estado}.",
                idAdministrador,
                idPasajeroServicio,
                solicitud.Estado);

            return Mapear(registro);
        }

        public async Task<PasajeroServicioRespuestaDto> ConfirmarViajeAsync(
            int idPasajeroServicio,
            int idUsuario,
            ConfirmarViajeSolicitudDto solicitud)
        {
            if (solicitud.EstadoConfirmacion is not (EstadoConfirmacionViaje.CONFIRMADO or EstadoConfirmacionViaje.RECHAZADO))
            {
                throw new ExcepcionNegocio("El estado de confirmación debe ser CONFIRMADO o RECHAZADO.");
            }

            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdUsuario == idUsuario);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("No hay un pasajero asociado a la cuenta autenticada.", StatusCodes.Status403Forbidden);
            }

            var registro = await ObtenerRegistroAsync(idPasajeroServicio);

            if (registro.IdPasajero != pasajero.IdPasajero)
            {
                throw new ExcepcionNegocio("No tiene permisos para confirmar este viaje.", StatusCodes.Status403Forbidden);
            }

            if (registro.Estado != EstadoPasajeroServicio.ACTIVO)
            {
                throw new ExcepcionNegocio("La asociación con el servicio no se encuentra activa.");
            }

            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstAsync(s => s.IdServicio == registro.IdServicio);

            if (servicio.Estado is EstadoServicio.FINALIZADO or EstadoServicio.CANCELADO)
            {
                throw new ExcepcionNegocio("No se puede confirmar un servicio FINALIZADO o CANCELADO.");
            }

            registro.EstadoConfirmacion = solicitud.EstadoConfirmacion;
            registro.FechaConfirmacion = DateTime.UtcNow;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El pasajero {IdPasajero} actualizó la confirmación del registro {IdPasajeroServicio} a {Estado}.",
                pasajero.IdPasajero,
                idPasajeroServicio,
                solicitud.EstadoConfirmacion);

            return Mapear(registro);
        }

        private async Task<PasajeroServicio> ObtenerRegistroAsync(int idPasajeroServicio)
        {
            var registro = await _contexto.PasajerosServicio
                .FirstOrDefaultAsync(p => p.IdPasajeroServicio == idPasajeroServicio);

            if (registro is null)
            {
                throw new ExcepcionNegocio("El registro de pasajero por servicio no existe.", StatusCodes.Status404NotFound);
            }

            return registro;
        }

        private async Task<Servicio> ObtenerServicioProgramableAsync(int idServicio)
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
                throw new ExcepcionNegocio("No se pueden asociar pasajeros a un servicio FINALIZADO o CANCELADO.");
            }

            if (servicio.Estado != EstadoServicio.PROGRAMADO)
            {
                throw new ExcepcionNegocio("Solo se pueden asociar pasajeros a un servicio PROGRAMADO.");
            }

            return servicio;
        }

        private async Task AsegurarPasajeroAsignableAsync(int idPasajero, int idEmpresa)
        {
            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero indicado no existe.", StatusCodes.Status404NotFound);
            }

            if (pasajero.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("El pasajero indicado no se encuentra activo.");
            }

            if (pasajero.IdEmpresa != idEmpresa)
            {
                throw new ExcepcionNegocio("El pasajero no pertenece a la empresa del servicio.");
            }
        }

        private async Task AsegurarNoDuplicadoAsync(int idServicio, int idPasajero)
        {
            var existe = await _contexto.PasajerosServicio
                .AnyAsync(p => p.IdServicio == idServicio && p.IdPasajero == idPasajero);

            if (existe)
            {
                throw new ExcepcionNegocio(MensajeDuplicado, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarCapacidadDisponibleAsync(int idServicio)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Vehiculo)
                .FirstOrDefaultAsync(a => a.IdServicio == idServicio && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (asignacion is null)
            {
                return;
            }

            var pasajerosActivos = await _contexto.PasajerosServicio
                .CountAsync(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO);

            if (pasajerosActivos >= asignacion.Vehiculo.Capacidad)
            {
                throw new ExcepcionNegocio(MensajeCapacidad, StatusCodes.Status409Conflict);
            }
        }

        private static PasajeroServicioRespuestaDto Mapear(PasajeroServicio registro)
        {
            return new PasajeroServicioRespuestaDto
            {
                IdPasajeroServicio = registro.IdPasajeroServicio,
                IdServicio = registro.IdServicio,
                IdPasajero = registro.IdPasajero,
                EstadoConfirmacion = registro.EstadoConfirmacion,
                FechaConfirmacion = registro.FechaConfirmacion,
                Estado = registro.Estado
            };
        }
    }
}
