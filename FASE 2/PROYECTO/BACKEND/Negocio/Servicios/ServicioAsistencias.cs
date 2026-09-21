using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Asistencias;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioAsistencias
    {
        Task<IReadOnlyList<AsistenciaRespuestaDto>> ListarAsync(
            int? idServicio,
            int? idPasajero,
            MetodoAsistencia? metodo,
            TipoAsistencia? tipoAsistencia,
            bool? excedeCapacidad,
            EstadoAsistencia? estado);

        Task<AsistenciaRespuestaDto> ObtenerPorIdAsync(int idAsistencia);

        Task<AsistenciaRespuestaDto> EscanearAsync(string token, int idUsuario);

        Task<AsistenciaRespuestaDto> CrearManualAsync(CrearAsistenciaManualSolicitudDto solicitud, int idAdministrador);

        Task<AsistenciaRespuestaDto> CambiarEstadoAsync(
            int idAsistencia,
            CambiarEstadoAsistenciaSolicitudDto solicitud,
            int idAdministrador);

        Task ResolverProvisionalesAlIniciarAsync(int idServicio);
    }

    /// <summary>
    /// Registro de asistencia. Distinto de la planificación en pasajero_servicio
    /// y de la confirmación de viaje. Los planificados ACTIVO reservan asiento;
    /// los no planificados en PROGRAMADO quedan PROVISIONAL y en EN_CURSO
    /// ingresan VALIDA solo si hay cupo.
    /// </summary>
    public class ServicioAsistencias : IServicioAsistencias
    {
        private const string MensajeDuplicado = "Ya existe una asistencia para este pasajero en el servicio.";
        private const string MensajeSinCupo = "El servicio no tiene cupos disponibles.";
        private const string MensajeSinCapacidad =
            "No es posible determinar la capacidad del servicio porque no tiene un vehículo asignado.";

        private readonly TransporteContext _contexto;
        private readonly IServicioQr _servicioQr;
        private readonly ILogger<ServicioAsistencias> _logger;

        public ServicioAsistencias(
            TransporteContext contexto,
            IServicioQr servicioQr,
            ILogger<ServicioAsistencias> logger)
        {
            _contexto = contexto;
            _servicioQr = servicioQr;
            _logger = logger;
        }

        public async Task<IReadOnlyList<AsistenciaRespuestaDto>> ListarAsync(
            int? idServicio,
            int? idPasajero,
            MetodoAsistencia? metodo,
            TipoAsistencia? tipoAsistencia,
            bool? excedeCapacidad,
            EstadoAsistencia? estado)
        {
            var consulta = _contexto.Asistencias.AsNoTracking();

            if (idServicio.HasValue)
            {
                consulta = consulta.Where(a => a.IdServicio == idServicio.Value);
            }

            if (idPasajero.HasValue)
            {
                consulta = consulta.Where(a => a.IdPasajero == idPasajero.Value);
            }

            if (metodo.HasValue)
            {
                consulta = consulta.Where(a => a.Metodo == metodo.Value);
            }

            if (tipoAsistencia.HasValue)
            {
                consulta = consulta.Where(a => a.TipoAsistencia == tipoAsistencia.Value);
            }

            if (excedeCapacidad.HasValue)
            {
                consulta = consulta.Where(a => a.ExcedeCapacidad == excedeCapacidad.Value);
            }

            if (estado.HasValue)
            {
                consulta = consulta.Where(a => a.Estado == estado.Value);
            }

            var registros = await consulta
                .OrderBy(a => a.IdAsistencia)
                .ToListAsync();

            return registros.Select(Mapear).ToList();
        }

        public async Task<AsistenciaRespuestaDto> ObtenerPorIdAsync(int idAsistencia)
        {
            var registro = await _contexto.Asistencias
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.IdAsistencia == idAsistencia);

            if (registro is null)
            {
                throw new ExcepcionNegocio("La asistencia indicada no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(registro);
        }

        public async Task<AsistenciaRespuestaDto> EscanearAsync(string token, int idUsuario)
        {
            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdUsuario == idUsuario);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("No hay un pasajero asociado a la cuenta autenticada.", StatusCodes.Status403Forbidden);
            }

            if (pasajero.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("El pasajero asociado a la cuenta no se encuentra activo.");
            }

            var qr = await _servicioQr.ValidarParaAsistenciaAsync(token);
            var servicio = qr.Servicio;

            if (pasajero.IdEmpresa != servicio.IdEmpresa)
            {
                throw new ExcepcionNegocio("El pasajero no pertenece a la empresa del servicio.");
            }

            var tipo = await DeterminarTipoAsistenciaAsync(servicio.IdServicio, pasajero.IdPasajero);
            var estado = DeterminarEstadoInicial(tipo, servicio.Estado);

            var asistencia = new Asistencia
            {
                IdServicio = servicio.IdServicio,
                IdPasajero = pasajero.IdPasajero,
                FechaHora = DateTime.UtcNow,
                Metodo = MetodoAsistencia.QR,
                TipoAsistencia = tipo,
                ExcedeCapacidad = false,
                Estado = estado
            };

            await PersistirAsistenciaAsync(asistencia, servicio.Estado);

            _logger.LogInformation(
                "El pasajero {IdPasajero} registró asistencia QR {IdAsistencia} en el servicio {IdServicio} (tipo {Tipo}, estado {Estado}).",
                pasajero.IdPasajero,
                asistencia.IdAsistencia,
                servicio.IdServicio,
                asistencia.TipoAsistencia,
                asistencia.Estado);

            return Mapear(asistencia);
        }

        public async Task<AsistenciaRespuestaDto> CrearManualAsync(
            CrearAsistenciaManualSolicitudDto solicitud,
            int idAdministrador)
        {
            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdServicio == solicitud.IdServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio indicado no existe.", StatusCodes.Status404NotFound);
            }

            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdPasajero == solicitud.IdPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero indicado no existe.", StatusCodes.Status404NotFound);
            }

            if (pasajero.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("El pasajero indicado no se encuentra activo.");
            }

            if (pasajero.IdEmpresa != servicio.IdEmpresa)
            {
                throw new ExcepcionNegocio("El pasajero no pertenece a la empresa del servicio.");
            }

            var tipo = await DeterminarTipoAsistenciaAsync(servicio.IdServicio, pasajero.IdPasajero);
            var estado = DeterminarEstadoInicial(tipo, servicio.Estado);

            var asistencia = new Asistencia
            {
                IdServicio = servicio.IdServicio,
                IdPasajero = pasajero.IdPasajero,
                FechaHora = DateTime.UtcNow,
                Metodo = MetodoAsistencia.MANUAL,
                TipoAsistencia = tipo,
                ExcedeCapacidad = false,
                Estado = estado
            };

            await PersistirAsistenciaAsync(asistencia, servicio.Estado);

            _logger.LogInformation(
                "El administrador {IdAdministrador} registró asistencia MANUAL {IdAsistencia} del pasajero {IdPasajero} en el servicio {IdServicio} (tipo {Tipo}, estado {Estado}).",
                idAdministrador,
                asistencia.IdAsistencia,
                pasajero.IdPasajero,
                servicio.IdServicio,
                asistencia.TipoAsistencia,
                asistencia.Estado);

            return Mapear(asistencia);
        }

        public async Task ResolverProvisionalesAlIniciarAsync(int idServicio)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Vehiculo)
                .FirstOrDefaultAsync(a => a.IdServicio == idServicio && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (asignacion is null || asignacion.Vehiculo is null)
            {
                throw new ExcepcionNegocio(
                    "El servicio requiere un conductor y un vehículo asignados para poder iniciarse.");
            }

            var capacidad = asignacion.Vehiculo.Capacidad;
            var (planificadosActivos, validasNoPlanificadas) = await ContarOcupacionNoPlanificadaAsync(idServicio);
            var cuposDisponibles = Math.Max(
                0,
                CalcularCuposDisponiblesNoPlanificados(capacidad, planificadosActivos, validasNoPlanificadas));

            var provisionales = await _contexto.Asistencias
                .Where(a =>
                    a.IdServicio == idServicio
                    && a.TipoAsistencia == TipoAsistencia.NO_PLANIFICADA
                    && a.Estado == EstadoAsistencia.PROVISIONAL)
                .OrderBy(a => a.FechaHora)
                .ThenBy(a => a.IdAsistencia)
                .ToListAsync();

            var confirmadas = 0;
            var anuladas = 0;

            foreach (var provisional in provisionales)
            {
                if (cuposDisponibles > 0)
                {
                    provisional.Estado = EstadoAsistencia.VALIDA;
                    provisional.ExcedeCapacidad = false;
                    cuposDisponibles--;
                    confirmadas++;
                }
                else
                {
                    provisional.Estado = EstadoAsistencia.ANULADA;
                    anuladas++;
                }
            }

            _logger.LogInformation(
                "Se resolvieron asistencias provisionales del servicio {IdServicio}: capacidad {Capacidad}, planificados activos {Planificados}, válidas no planificadas {ValidasNoPlanificadas}, confirmadas {Confirmadas}, anuladas {Anuladas}.",
                idServicio,
                capacidad,
                planificadosActivos,
                validasNoPlanificadas,
                confirmadas,
                anuladas);
        }

        public async Task<AsistenciaRespuestaDto> CambiarEstadoAsync(
            int idAsistencia,
            CambiarEstadoAsistenciaSolicitudDto solicitud,
            int idAdministrador)
        {
            var registro = await _contexto.Asistencias
                .FirstOrDefaultAsync(a => a.IdAsistencia == idAsistencia);

            if (registro is null)
            {
                throw new ExcepcionNegocio("La asistencia indicada no existe.", StatusCodes.Status404NotFound);
            }

            if (registro.Estado == solicitud.Estado)
            {
                return Mapear(registro);
            }

            if (registro.Estado != EstadoAsistencia.VALIDA || solicitud.Estado != EstadoAsistencia.ANULADA)
            {
                throw new ExcepcionNegocio("Solo se permite anular una asistencia VALIDA. No se puede reactivar una asistencia ANULADA.");
            }

            registro.Estado = EstadoAsistencia.ANULADA;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} anuló la asistencia {IdAsistencia}.",
                idAdministrador,
                idAsistencia);

            return Mapear(registro);
        }

        private async Task PersistirAsistenciaAsync(Asistencia asistencia, EstadoServicio estadoServicio)
        {
            var requiereCupoNoPlanificado = asistencia.TipoAsistencia == TipoAsistencia.NO_PLANIFICADA
                && estadoServicio == EstadoServicio.EN_CURSO;

            if (!requiereCupoNoPlanificado)
            {
                await GuardarAsistenciaAsync(asistencia);
                return;
            }

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();

            await BloquearFilaServicioAsync(asistencia.IdServicio);

            var estadoActual = await _contexto.Servicios
                .AsNoTracking()
                .Where(s => s.IdServicio == asistencia.IdServicio)
                .Select(s => s.Estado)
                .SingleAsync();

            if (estadoActual != EstadoServicio.EN_CURSO)
            {
                asistencia.Estado = DeterminarEstadoInicial(asistencia.TipoAsistencia, estadoActual);
                await GuardarAsistenciaAsync(asistencia);
                await transaccion.CommitAsync();
                return;
            }

            await AsegurarCupoNoPlanificadoEnCursoAsync(asistencia.IdServicio);
            asistencia.Estado = EstadoAsistencia.VALIDA;
            await GuardarAsistenciaAsync(asistencia);
            await transaccion.CommitAsync();
        }

        private async Task BloquearFilaServicioAsync(int idServicio)
        {
            var transaccion = _contexto.Database.CurrentTransaction
                ?? throw new InvalidOperationException("Se requiere una transacción para bloquear el servicio.");

            var conexion = _contexto.Database.GetDbConnection();
            await using var comando = conexion.CreateCommand();
            comando.Transaction = transaccion.GetDbTransaction();
            comando.CommandText = "SELECT `id_servicio` FROM `servicio` WHERE `id_servicio` = @idServicio FOR UPDATE";
            var parametro = comando.CreateParameter();
            parametro.ParameterName = "@idServicio";
            parametro.Value = idServicio;
            comando.Parameters.Add(parametro);

            var id = await comando.ExecuteScalarAsync();
            if (id is null || id is DBNull)
            {
                throw new ExcepcionNegocio("El servicio indicado no existe.", StatusCodes.Status404NotFound);
            }
        }

        private async Task AsegurarCupoNoPlanificadoEnCursoAsync(int idServicio)
        {
            var asignacion = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Include(a => a.Vehiculo)
                .FirstOrDefaultAsync(a => a.IdServicio == idServicio && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (asignacion?.Vehiculo is null)
            {
                throw new ExcepcionNegocio(MensajeSinCapacidad, StatusCodes.Status409Conflict);
            }

            var (planificadosActivos, validasNoPlanificadas) = await ContarOcupacionNoPlanificadaAsync(idServicio);
            var disponibles = CalcularCuposDisponiblesNoPlanificados(
                asignacion.Vehiculo.Capacidad,
                planificadosActivos,
                validasNoPlanificadas);

            if (disponibles <= 0)
            {
                throw new ExcepcionNegocio(MensajeSinCupo, StatusCodes.Status409Conflict);
            }
        }

        private async Task<(int PlanificadosActivos, int ValidasNoPlanificadas)> ContarOcupacionNoPlanificadaAsync(
            int idServicio)
        {
            var planificadosActivos = await _contexto.PasajerosServicio
                .CountAsync(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO);

            var validasNoPlanificadas = await _contexto.Asistencias
                .CountAsync(a =>
                    a.IdServicio == idServicio
                    && a.TipoAsistencia == TipoAsistencia.NO_PLANIFICADA
                    && a.Estado == EstadoAsistencia.VALIDA);

            return (planificadosActivos, validasNoPlanificadas);
        }

        private static int CalcularCuposDisponiblesNoPlanificados(
            int capacidad,
            int planificadosActivos,
            int validasNoPlanificadas)
        {
            return capacidad - planificadosActivos - validasNoPlanificadas;
        }

        private async Task GuardarAsistenciaAsync(Asistencia asistencia)
        {
            var existe = await _contexto.Asistencias
                .AnyAsync(a => a.IdServicio == asistencia.IdServicio && a.IdPasajero == asistencia.IdPasajero);

            if (existe)
            {
                throw new ExcepcionNegocio(MensajeDuplicado, StatusCodes.Status409Conflict);
            }

            _contexto.Asistencias.Add(asistencia);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeDuplicado, StatusCodes.Status409Conflict);
            }
        }

        private async Task<TipoAsistencia> DeterminarTipoAsistenciaAsync(int idServicio, int idPasajero)
        {
            var planificado = await _contexto.PasajerosServicio
                .AsNoTracking()
                .AnyAsync(p =>
                    p.IdServicio == idServicio
                    && p.IdPasajero == idPasajero
                    && p.Estado == EstadoPasajeroServicio.ACTIVO);

            return planificado ? TipoAsistencia.PLANIFICADA : TipoAsistencia.NO_PLANIFICADA;
        }

        private static EstadoAsistencia DeterminarEstadoInicial(TipoAsistencia tipo, EstadoServicio estadoServicio)
        {
            if (estadoServicio is EstadoServicio.FINALIZADO or EstadoServicio.CANCELADO)
            {
                throw new ExcepcionNegocio("No se puede registrar asistencia en un servicio CANCELADO o FINALIZADO.");
            }

            if (tipo == TipoAsistencia.PLANIFICADA)
            {
                return EstadoAsistencia.VALIDA;
            }

            if (estadoServicio == EstadoServicio.EN_CURSO)
            {
                return EstadoAsistencia.VALIDA;
            }

            if (estadoServicio != EstadoServicio.PROGRAMADO)
            {
                throw new ExcepcionNegocio("El servicio no admite registro de asistencia en su estado actual.");
            }

            return EstadoAsistencia.PROVISIONAL;
        }

        private static AsistenciaRespuestaDto Mapear(Asistencia registro)
        {
            return new AsistenciaRespuestaDto
            {
                IdAsistencia = registro.IdAsistencia,
                IdServicio = registro.IdServicio,
                IdPasajero = registro.IdPasajero,
                FechaHora = registro.FechaHora,
                Metodo = registro.Metodo,
                TipoAsistencia = registro.TipoAsistencia,
                ExcedeCapacidad = registro.ExcedeCapacidad,
                Estado = registro.Estado
            };
        }
    }
}
