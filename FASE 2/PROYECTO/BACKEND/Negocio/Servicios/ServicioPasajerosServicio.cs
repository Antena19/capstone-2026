using BACKEND.Datos.MySQL;
using BACKEND.DTOs.PasajerosServicio;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;

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

        Task<PasajeroServicioRespuestaDto> AsignarPuntoRecogidaAsync(
            int idPasajeroServicio,
            AsignarPuntoRecogidaSolicitudDto solicitud,
            int idAdministrador);

        Task<PasajeroServicioRespuestaDto> ConfirmarViajeAsync(
            int idPasajeroServicio,
            int idUsuario,
            ConfirmarViajeSolicitudDto solicitud);

        Task<IReadOnlyList<PasajeroServicioRespuestaDto>> CrearLoteAsync(
            CrearPasajerosServicioLoteSolicitudDto solicitud,
            int idAdministrador);
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
        private readonly IMongoCollection<Ruta> _rutas;
        private readonly ILogger<ServicioPasajerosServicio> _logger;

        public ServicioPasajerosServicio(
            TransporteContext contexto,
            IMongoCollection<Ruta> rutas,
            ILogger<ServicioPasajerosServicio> logger)
        {
            _contexto = contexto;
            _rutas = rutas;
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
            var resultados = await CrearLoteAsync(
                new CrearPasajerosServicioLoteSolicitudDto
                {
                    IdServicio = solicitud.IdServicio,
                    Pasajeros =
                    [
                        new PasajeroServicioInicialDto
                        {
                            IdPasajero = solicitud.IdPasajero,
                            IdPuntoRecogida = solicitud.IdPuntoRecogida
                        }
                    ]
                },
                idAdministrador);

            return resultados[0];
        }

        public async Task<IReadOnlyList<PasajeroServicioRespuestaDto>> CrearLoteAsync(
            CrearPasajerosServicioLoteSolicitudDto solicitud,
            int idAdministrador)
        {
            var pasajeros = solicitud.Pasajeros ?? [];
            if (pasajeros.Count == 0)
            {
                throw new ExcepcionNegocio("Debe indicar al menos un pasajero.");
            }

            var ids = pasajeros.Select(p => p.IdPasajero).ToList();
            if (ids.Count != ids.Distinct().Count())
            {
                throw new ExcepcionNegocio("El lote contiene pasajeros duplicados.");
            }

            var transaccionPropia = _contexto.Database.CurrentTransaction is null;
            if (transaccionPropia)
            {
                await using var transaccion = await _contexto.Database.BeginTransactionAsync();
                var creados = await AplicarLoteAsync(solicitud.IdServicio, pasajeros, idAdministrador);
                await transaccion.CommitAsync();
                return creados;
            }

            return await AplicarLoteAsync(solicitud.IdServicio, pasajeros, idAdministrador);
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

        public async Task<PasajeroServicioRespuestaDto> AsignarPuntoRecogidaAsync(
            int idPasajeroServicio,
            AsignarPuntoRecogidaSolicitudDto solicitud,
            int idAdministrador)
        {
            var registro = await ObtenerRegistroAsync(idPasajeroServicio);
            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstAsync(s => s.IdServicio == registro.IdServicio);

            registro.IdPuntoRecogida = await ResolverPuntoRecogidaAsync(servicio.IdRuta, solicitud.IdPuntoRecogida);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el punto de recogida del pasajero-servicio {IdPasajeroServicio}.",
                idAdministrador,
                idPasajeroServicio);

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

        private async Task<IReadOnlyList<PasajeroServicioRespuestaDto>> AplicarLoteAsync(
            int idServicio,
            IReadOnlyList<PasajeroServicioInicialDto> pasajeros,
            int idAdministrador)
        {
            var servicio = await ObtenerServicioProgramableAsync(idServicio);
            var ruta = await ObtenerRutaDelServicioAsync(servicio.IdRuta);
            var ids = pasajeros.Select(p => p.IdPasajero).ToList();

            var existentes = await _contexto.PasajerosServicio
                .Where(p => p.IdServicio == idServicio && ids.Contains(p.IdPasajero))
                .ToListAsync();

            var capacidad = await ObtenerCapacidadAsignadaAsync(idServicio);
            var activos = await _contexto.PasajerosServicio
                .CountAsync(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO);

            var resultados = new List<PasajeroServicio>();

            foreach (var item in pasajeros)
            {
                await AsegurarPasajeroAsignableAsync(item.IdPasajero, servicio.IdEmpresa);
                var idPuntoRecogida = ResolverPuntoRecogidaEnRuta(ruta, servicio.IdRuta, item.IdPuntoRecogida);
                var existente = existentes.FirstOrDefault(p => p.IdPasajero == item.IdPasajero);

                if (existente is null)
                {
                    AsegurarHayCupo(capacidad, activos);
                    var registro = new PasajeroServicio
                    {
                        IdServicio = idServicio,
                        IdPasajero = item.IdPasajero,
                        IdPuntoRecogida = idPuntoRecogida,
                        EstadoConfirmacion = EstadoConfirmacionViaje.PENDIENTE,
                        FechaConfirmacion = null,
                        Estado = EstadoPasajeroServicio.ACTIVO
                    };
                    _contexto.PasajerosServicio.Add(registro);
                    resultados.Add(registro);
                    activos++;
                    continue;
                }

                if (existente.Estado == EstadoPasajeroServicio.ACTIVO)
                {
                    throw new ExcepcionNegocio(MensajeDuplicado, StatusCodes.Status409Conflict);
                }

                AsegurarHayCupo(capacidad, activos);
                existente.Estado = EstadoPasajeroServicio.ACTIVO;
                existente.EstadoConfirmacion = EstadoConfirmacionViaje.PENDIENTE;
                existente.FechaConfirmacion = null;
                existente.IdPuntoRecogida = idPuntoRecogida;
                resultados.Add(existente);
                activos++;
            }

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeDuplicado, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} asoció {Cantidad} pasajeros al servicio {IdServicio}.",
                idAdministrador,
                resultados.Count,
                idServicio);

            return resultados.Select(Mapear).ToList();
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

        private async Task AsegurarCapacidadDisponibleAsync(int idServicio)
        {
            var capacidad = await ObtenerCapacidadAsignadaAsync(idServicio);
            var pasajerosActivos = await _contexto.PasajerosServicio
                .CountAsync(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO);
            AsegurarHayCupo(capacidad, pasajerosActivos);
        }

        private async Task<int?> ObtenerCapacidadAsignadaAsync(int idServicio)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Vehiculo)
                .FirstOrDefaultAsync(a => a.IdServicio == idServicio && a.Estado == EstadoAsignacionServicio.ACTIVA);

            return asignacion?.Vehiculo.Capacidad;
        }

        private static void AsegurarHayCupo(int? capacidad, int pasajerosActivos)
        {
            if (capacidad.HasValue && pasajerosActivos >= capacidad.Value)
            {
                throw new ExcepcionNegocio(MensajeCapacidad, StatusCodes.Status409Conflict);
            }
        }

        private async Task<string?> ResolverPuntoRecogidaAsync(string idRuta, string? idPuntoRecogida)
        {
            if (string.IsNullOrWhiteSpace(idPuntoRecogida))
            {
                return null;
            }

            var ruta = await ObtenerRutaDelServicioAsync(idRuta);
            return ResolverPuntoRecogidaEnRuta(ruta, idRuta, idPuntoRecogida);
        }

        private async Task<Ruta> ObtenerRutaDelServicioAsync(string idRuta)
        {
            if (!ObjectId.TryParse(idRuta, out var objectId))
            {
                throw new ExcepcionNegocio("El servicio no tiene una ruta válida para asignar un punto de recogida.");
            }

            var ruta = await _rutas.Find(r => r.Id == objectId).FirstOrDefaultAsync();
            if (ruta is null)
            {
                throw new ExcepcionNegocio("La ruta del servicio no está disponible.");
            }

            return ruta;
        }

        private static string? ResolverPuntoRecogidaEnRuta(Ruta ruta, string idRuta, string? idPuntoRecogida)
        {
            var identificador = idPuntoRecogida?.Trim();
            if (string.IsNullOrEmpty(identificador))
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(idRuta))
            {
                throw new ExcepcionNegocio("El servicio no tiene una ruta válida para asignar un punto de recogida.");
            }

            var punto = (ruta.PuntosRecogida ?? new List<PuntoRecogidaRuta>())
                .FirstOrDefault(p => string.Equals(p.IdPunto?.Trim(), identificador, StringComparison.OrdinalIgnoreCase));

            if (punto is null)
            {
                throw new ExcepcionNegocio("El punto de recogida no pertenece a la ruta de este servicio.");
            }

            return punto.IdPunto;
        }

        private static PasajeroServicioRespuestaDto Mapear(PasajeroServicio registro)
        {
            return new PasajeroServicioRespuestaDto
            {
                IdPasajeroServicio = registro.IdPasajeroServicio,
                IdServicio = registro.IdServicio,
                IdPasajero = registro.IdPasajero,
                IdPuntoRecogida = registro.IdPuntoRecogida,
                EstadoConfirmacion = registro.EstadoConfirmacion,
                FechaConfirmacion = registro.FechaConfirmacion,
                Estado = registro.Estado
            };
        }
    }
}
