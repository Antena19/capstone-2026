using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Tiempo;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Finaliza servicios vencidos de la empresa 1 y la planificación 10.
    /// El lote solo se abre si el selector acepta al menos uno. Dentro de cada
    /// transacción el servicio se vuelve a evaluar después del bloqueo. El lote
    /// se cierra como COMPLETADO aunque alguno se omita o falle en esa revalidación.
    /// </summary>
    public class ServicioSimulacionOperacional : IServicioSimulacionOperacional
    {
        private readonly TransporteContext _contexto;
        private readonly IRelojOperacion _reloj;
        private readonly ILogger<ServicioSimulacionOperacional> _logger;
        private readonly ISondaSimulacionOperacional? _sonda;

        public ServicioSimulacionOperacional(
            TransporteContext contexto,
            IRelojOperacion reloj,
            ILogger<ServicioSimulacionOperacional> logger)
            : this(contexto, reloj, logger, null)
        {
        }

        internal ServicioSimulacionOperacional(
            TransporteContext contexto,
            IRelojOperacion reloj,
            ILogger<ServicioSimulacionOperacional> logger,
            ISondaSimulacionOperacional? sonda)
        {
            _contexto = contexto;
            _reloj = reloj;
            _logger = logger;
            _sonda = sonda;
        }

        public async Task<ResultadoSimulacionOperacional> EjecutarAsync(CancellationToken cancellationToken = default)
        {
            var ahora = VencimientoServicio.NormalizarUtc(_reloj.UtcAhora);
            var identificadores = await ListarElegiblesAsync(ahora, cancellationToken);
            if (identificadores.Count == 0)
            {
                return new ResultadoSimulacionOperacional(null, []);
            }

            var idLote = await AbrirLoteAsync(ahora, cancellationToken);
            var detalles = new List<DetalleServicioSimulado>();

            try
            {
                foreach (var idServicio in identificadores)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    detalles.Add(await ProcesarServicioAsync(idLote, idServicio, ahora, cancellationToken));
                }

                return new ResultadoSimulacionOperacional(idLote, detalles);
            }
            finally
            {
                await CerrarLoteAsync(idLote, ahora, cancellationToken);
            }
        }

        private async Task<string> AbrirLoteAsync(DateTime ahoraUtc, CancellationToken cancellationToken)
        {
            var lote = new SimulacionLote
            {
                IdLote = MarcaSimulacionOperacional.NuevoIdLote(),
                IdEmpresa = SelectorSimulacionOperacional.IdEmpresaDemostracion,
                IdPlanificacion = SelectorSimulacionOperacional.IdPlanificacionDemostracion,
                Estado = EstadoLoteSimulacion.EN_CURSO,
                FechaInicio = ahoraUtc
            };
            _contexto.SimulacionesLote.Add(lote);
            await _contexto.SaveChangesAsync(cancellationToken);
            return lote.IdLote;
        }

        private async Task CerrarLoteAsync(string idLote, DateTime ahoraUtc, CancellationToken cancellationToken)
        {
            var lote = await _contexto.SimulacionesLote
                .FirstOrDefaultAsync(l => l.IdLote == idLote, cancellationToken);

            if (lote is null || lote.Estado != EstadoLoteSimulacion.EN_CURSO)
            {
                return;
            }

            lote.Estado = EstadoLoteSimulacion.COMPLETADO;
            lote.FechaCierre = ahoraUtc;
            await _contexto.SaveChangesAsync(cancellationToken);
        }

        private async Task<List<int>> ListarElegiblesAsync(DateTime ahoraUtc, CancellationToken cancellationToken)
        {
            var posibles = await _contexto.Servicios
                .AsNoTracking()
                .Where(s => s.IdEmpresa == SelectorSimulacionOperacional.IdEmpresaDemostracion
                    && s.IdPlanificacion == SelectorSimulacionOperacional.IdPlanificacionDemostracion
                    && s.Estado == EstadoServicio.PROGRAMADO
                    && s.FechaHoraInicioReal == null
                    && s.FechaHoraFinReal == null)
                .OrderBy(s => s.Fecha)
                .ThenBy(s => s.HoraInicio)
                .ThenBy(s => s.IdServicio)
                .Select(s => new
                {
                    s.IdServicio,
                    s.IdEmpresa,
                    s.IdPlanificacion,
                    s.Estado,
                    s.Fecha,
                    s.HoraFin,
                    s.FechaHoraInicioReal,
                    s.FechaHoraFinReal
                })
                .ToListAsync(cancellationToken);

            var vencidos = posibles
                .Where(s => SelectorSimulacionOperacional.TerminoAlcanzado(s.Fecha, s.HoraFin, ahoraUtc))
                .ToList();
            if (vencidos.Count == 0)
            {
                return [];
            }

            var ids = vencidos.Select(s => s.IdServicio).ToList();
            var asignaciones = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Where(a => ids.Contains(a.IdServicio))
                .Select(a => new { a.IdServicio, a.Estado, a.Vehiculo.Capacidad })
                .ToListAsync(cancellationToken);
            var pasajeros = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Where(p => ids.Contains(p.IdServicio))
                .Select(p => new
                {
                    p.IdServicio,
                    p.IdPasajero,
                    p.Pasajero.IdEmpresa,
                    EstadoPasajero = p.Pasajero.Estado,
                    EstadoAsociacion = p.Estado
                })
                .ToListAsync(cancellationToken);
            var conAsistencia = (await _contexto.Asistencias
                .AsNoTracking()
                .Where(a => ids.Contains(a.IdServicio))
                .Select(a => a.IdServicio)
                .Distinct()
                .ToListAsync(cancellationToken))
                .ToHashSet();

            var asignacionesPorServicio = asignaciones
                .GroupBy(a => a.IdServicio)
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<AsignacionCandidataSimulacion>)g
                        .Select(a => new AsignacionCandidataSimulacion(a.Estado, a.Capacidad))
                        .ToList());
            var pasajerosPorServicio = pasajeros
                .GroupBy(p => p.IdServicio)
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<PasajeroCandidatoSimulacion>)g
                        .Select(p => new PasajeroCandidatoSimulacion(
                            p.IdPasajero,
                            p.IdEmpresa,
                            p.EstadoPasajero,
                            p.EstadoAsociacion))
                        .ToList());

            var elegibles = new List<int>();
            foreach (var servicio in vencidos)
            {
                var candidato = new CandidatoSimulacionOperacional(
                    servicio.IdServicio,
                    servicio.IdEmpresa,
                    servicio.IdPlanificacion,
                    servicio.Estado,
                    servicio.Fecha,
                    servicio.HoraFin,
                    servicio.FechaHoraInicioReal,
                    servicio.FechaHoraFinReal,
                    conAsistencia.Contains(servicio.IdServicio),
                    asignacionesPorServicio.GetValueOrDefault(servicio.IdServicio) ?? [],
                    pasajerosPorServicio.GetValueOrDefault(servicio.IdServicio) ?? []);
                if (SelectorSimulacionOperacional.Evaluar(candidato, ahoraUtc).PuedeSimular)
                {
                    elegibles.Add(servicio.IdServicio);
                }
            }

            return elegibles;
        }

        private async Task<DetalleServicioSimulado> ProcesarServicioAsync(
            string idLote,
            int idServicio,
            DateTime ahoraUtc,
            CancellationToken cancellationToken)
        {
            await using var transaccion = await _contexto.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                if (!await BloquearFilaMysqlAsync(idServicio, cancellationToken))
                {
                    await transaccion.RollbackAsync(cancellationToken);
                    return Fallido(idServicio, "El servicio no existe.");
                }

                var candidato = await CargarCandidatoAsync(idServicio, cancellationToken);
                if (candidato is null)
                {
                    await transaccion.RollbackAsync(cancellationToken);
                    return Fallido(idServicio, "El servicio no existe.");
                }

                var evaluacion = SelectorSimulacionOperacional.Evaluar(candidato.Datos, ahoraUtc);
                if (!evaluacion.PuedeSimular)
                {
                    await transaccion.CommitAsync(cancellationToken);
                    return new DetalleServicioSimulado(
                        idServicio,
                        ResultadoServicioSimulacion.Omitido,
                        evaluacion.Motivo,
                        evaluacion.Mensaje);
                }

                _sonda?.AntesDeInsertarAsistencias(idServicio);
                var asistencias = CrearAsistencias(candidato, evaluacion.IdsPasajerosAsistentes);
                if (asistencias.Count > 0)
                {
                    _contexto.Asistencias.AddRange(asistencias);
                    await _contexto.SaveChangesAsync(cancellationToken);
                }

                _sonda?.AntesDeActualizarServicio(idServicio);
                var inicioReal = InstantesSimulacionOperacional.InicioUtc(
                    idServicio,
                    candidato.Fecha,
                    candidato.HoraInicio);
                var finReal = InstantesSimulacionOperacional.FinUtc(
                    idServicio,
                    candidato.Fecha,
                    candidato.HoraInicio,
                    candidato.Datos.HoraFin);

                var filas = await _contexto.Database.ExecuteSqlInterpolatedAsync(
                    $@"UPDATE `servicio`
                       SET `estado` = 'FINALIZADO',
                           `fecha_hora_inicio_real` = {inicioReal},
                           `fecha_hora_fin_real` = {finReal},
                           `motivo_cancelacion` = NULL
                       WHERE `id_servicio` = {idServicio}
                         AND `estado` = 'PROGRAMADO'
                         AND `fecha_hora_inicio_real` IS NULL
                         AND `fecha_hora_fin_real` IS NULL
                         AND `id_empresa` = {SelectorSimulacionOperacional.IdEmpresaDemostracion}
                         AND `id_planificacion` = {SelectorSimulacionOperacional.IdPlanificacionDemostracion}",
                    cancellationToken);

                if (filas != 1)
                {
                    throw new InvalidOperationException("El servicio cambió antes de poder finalizarse.");
                }

                _sonda?.AntesDeRegistrarTrazabilidad(idServicio);
                var marca = MarcaSimulacionOperacional.CrearVigente(
                    idLote,
                    idServicio,
                    candidato.Datos.Estado,
                    candidato.Datos.FechaHoraInicioReal,
                    candidato.Datos.FechaHoraFinReal,
                    candidato.MotivoCancelacion,
                    inicioReal,
                    finReal);

                for (var i = 0; i < asistencias.Count; i++)
                {
                    marca.Asistencias.Add(new SimulacionAsistencia
                    {
                        IdPasajero = asistencias[i].IdPasajero,
                        IdAsistencia = asistencias[i].IdAsistencia
                    });
                }

                _contexto.SimulacionesServicio.Add(marca);
                await _contexto.SaveChangesAsync(cancellationToken);
                await transaccion.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "La simulación {IdLote} finalizó el servicio {IdServicio} con {Cantidad} asistencias.",
                    idLote,
                    idServicio,
                    asistencias.Count);

                return new DetalleServicioSimulado(
                    idServicio,
                    ResultadoServicioSimulacion.Procesado,
                    MotivoOmisionSimulacion.Ninguno,
                    SelectorSimulacionOperacional.Describir(MotivoOmisionSimulacion.Ninguno));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                await transaccion.RollbackAsync(cancellationToken);
                _contexto.ChangeTracker.Clear();
                _logger.LogWarning(
                    ex,
                    "La simulación {IdLote} revirtió el servicio {IdServicio}.",
                    idLote,
                    idServicio);
                return Fallido(idServicio, "No se pudo simular el servicio. La transacción fue revertida.");
            }
        }

        private async Task<CandidatoCargado?> CargarCandidatoAsync(int idServicio, CancellationToken cancellationToken)
        {
            var servicio = await _contexto.Servicios
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio, cancellationToken);

            if (servicio is null)
            {
                return null;
            }

            var asignaciones = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .Where(a => a.IdServicio == idServicio)
                .Select(a => new AsignacionCandidataSimulacion(a.Estado, a.Vehiculo.Capacidad))
                .ToListAsync(cancellationToken);

            var pasajeros = await _contexto.PasajerosServicio
                .AsNoTracking()
                .Where(p => p.IdServicio == idServicio)
                .Select(p => new PasajeroCandidatoSimulacion(
                    p.IdPasajero,
                    p.Pasajero.IdEmpresa,
                    p.Pasajero.Estado,
                    p.Estado))
                .ToListAsync(cancellationToken);

            var tieneAsistencia = await _contexto.Asistencias
                .AsNoTracking()
                .AnyAsync(a => a.IdServicio == idServicio, cancellationToken);

            return new CandidatoCargado(
                servicio.Fecha,
                servicio.HoraInicio,
                servicio.MotivoCancelacion,
                new CandidatoSimulacionOperacional(
                    servicio.IdServicio,
                    servicio.IdEmpresa,
                    servicio.IdPlanificacion,
                    servicio.Estado,
                    servicio.Fecha,
                    servicio.HoraFin,
                    servicio.FechaHoraInicioReal,
                    servicio.FechaHoraFinReal,
                    tieneAsistencia,
                    asignaciones,
                    pasajeros));
        }

        private static List<Asistencia> CrearAsistencias(
            CandidatoCargado candidato,
            IReadOnlyList<int> idsPasajeros)
        {
            var inicio = InstantesSimulacionOperacional.InicioUtc(
                candidato.Datos.IdServicio,
                candidato.Fecha,
                candidato.HoraInicio);
            var fin = InstantesSimulacionOperacional.FinUtc(
                candidato.Datos.IdServicio,
                candidato.Fecha,
                candidato.HoraInicio,
                candidato.Datos.HoraFin);

            var asistencias = new List<Asistencia>(idsPasajeros.Count);
            for (var i = 0; i < idsPasajeros.Count; i++)
            {
                asistencias.Add(new Asistencia
                {
                    IdServicio = candidato.Datos.IdServicio,
                    IdPasajero = idsPasajeros[i],
                    FechaHora = InstantesSimulacionOperacional.AsistenciaUtc(inicio, fin, i, idsPasajeros.Count),
                    Metodo = MetodoAsistencia.MANUAL,
                    TipoAsistencia = TipoAsistencia.PLANIFICADA,
                    ExcedeCapacidad = false,
                    Estado = EstadoAsistencia.VALIDA
                });
            }

            return asistencias;
        }

        private async Task<bool> BloquearFilaMysqlAsync(int idServicio, CancellationToken cancellationToken)
        {
            var proveedor = _contexto.Database.ProviderName ?? string.Empty;
            if (!proveedor.Contains("MySql", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var transaccion = _contexto.Database.CurrentTransaction
                ?? throw new InvalidOperationException(
                    "Se requiere una transacción para bloquear el servicio.");

            var conexion = _contexto.Database.GetDbConnection();
            await using var comando = conexion.CreateCommand();
            comando.Transaction = transaccion.GetDbTransaction();
            comando.CommandText = "SELECT `id_servicio` FROM `servicio` WHERE `id_servicio` = @idServicio FOR UPDATE";

            var parametro = comando.CreateParameter();
            parametro.ParameterName = "@idServicio";
            parametro.Value = idServicio;
            comando.Parameters.Add(parametro);

            var id = await comando.ExecuteScalarAsync(cancellationToken);
            return id is not null && id is not DBNull;
        }

        private static DetalleServicioSimulado Fallido(int idServicio, string mensaje)
        {
            return new DetalleServicioSimulado(
                idServicio,
                ResultadoServicioSimulacion.Fallido,
                MotivoOmisionSimulacion.Ninguno,
                mensaje);
        }

        private sealed record CandidatoCargado(
            DateOnly Fecha,
            TimeOnly HoraInicio,
            string? MotivoCancelacion,
            CandidatoSimulacionOperacional Datos);
    }
}
