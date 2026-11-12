using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Simulacion;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace BACKEND.Negocio.Servicios
{
    /// <summary>
    /// Barrido al arrancar el proceso y luego en un intervalo fijo.
    /// Un reinicio no pierde vencimientos: cada pasada vuelve a leer la tabla.
    /// La pasada espera a terminar antes de aceptar la siguiente, así que simulación
    /// y cancelación no se cruzan dentro de esta instancia.
    /// </summary>
    public class CancelacionServiciosNoIniciadosWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _alcances;
        private readonly IOptions<CancelacionAutomaticaOpciones> _opciones;
        private readonly IOptions<SimulacionOperacionalOpciones> _simulacion;
        private readonly ILogger<CancelacionServiciosNoIniciadosWorker> _logger;
        private readonly SemaphoreSlim _pasada = new(1, 1);

        public CancelacionServiciosNoIniciadosWorker(
            IServiceScopeFactory alcances,
            IOptions<CancelacionAutomaticaOpciones> opciones,
            IOptions<SimulacionOperacionalOpciones> simulacion,
            ILogger<CancelacionServiciosNoIniciadosWorker> logger)
        {
            _alcances = alcances;
            _opciones = opciones;
            _simulacion = simulacion;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await EjecutarPasadaAsync(stoppingToken);

            var minutos = Math.Clamp(_opciones.Value.IntervaloMinutos, 1, 24 * 60);
            using var temporizador = new PeriodicTimer(TimeSpan.FromMinutes(minutos));

            while (await temporizador.WaitForNextTickAsync(stoppingToken))
            {
                await EjecutarPasadaAsync(stoppingToken);
            }
        }

        internal async Task EjecutarPasadaAsync(CancellationToken cancellationToken)
        {
            if (!await _pasada.WaitAsync(TimeSpan.Zero, cancellationToken))
            {
                _logger.LogWarning(
                    "Se omitió una pasada porque la anterior del mismo proceso sigue en curso.");
                return;
            }

            try
            {
                await EjecutarSimulacionSiCorresponde(cancellationToken);

                await using var alcance = _alcances.CreateAsyncScope();
                var servicio = alcance.ServiceProvider.GetRequiredService<IServicioCancelacionAutomatica>();
                await servicio.EjecutarAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception excepcion)
            {
                _logger.LogError(
                    excepcion,
                    "Falló el barrido de cancelación automática de servicios no iniciados.");
            }
            finally
            {
                _pasada.Release();
            }
        }

        public override void Dispose()
        {
            _pasada.Dispose();
            base.Dispose();
        }

        /// <summary>
        /// Un lote EN_CURSO dejado por el apagado no se cierra ni se revierte aquí.
        /// Cerrarlo marcaría como terminada una pasada interrumpida. Revertirlo podría
        /// deshacer servicios ya confirmados si otra pasada los sigue usando.
        /// </summary>
        private async Task EjecutarSimulacionSiCorresponde(CancellationToken cancellationToken)
        {
            if (!_simulacion.Value.Habilitada)
            {
                return;
            }

            try
            {
                cancellationToken.ThrowIfCancellationRequested();
                await using var alcance = _alcances.CreateAsyncScope();
                var simulador = alcance.ServiceProvider.GetRequiredService<IServicioSimulacionOperacional>();

                _logger.LogInformation("Inicia la simulación operacional.");
                var resultado = await simulador.EjecutarAsync(cancellationToken);
                if (resultado.IdLote is null)
                {
                    _logger.LogInformation(
                        "La simulación operacional no encontró servicios candidatos. Procesados: 0. Omitidos: 0. Fallidos: 0.");
                    return;
                }

                _logger.LogInformation(
                    "La simulación operacional {IdLote} terminó. Procesados: {Procesados}. Omitidos: {Omitidos}. Fallidos: {Fallidos}.",
                    resultado.IdLote,
                    resultado.Procesados,
                    resultado.Omitidos,
                    resultado.Fallidos);

                if (resultado.Fallidos > 0)
                {
                    var ids = string.Join(
                        ", ",
                        resultado.Servicios
                            .Where(s => s.Resultado == ResultadoServicioSimulacion.Fallido)
                            .Select(s => s.IdServicio));
                    _logger.LogWarning(
                        "La simulación operacional {IdLote} no pudo procesar los servicios {IdsServicio}.",
                        resultado.IdLote,
                        ids);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                _logger.LogInformation(
                    "La simulación operacional se detuvo porque el proceso se está apagando.");
                throw;
            }
            catch (Exception excepcion)
            {
                _logger.LogError(
                    excepcion,
                    "Falló la simulación operacional. El barrido de cancelación continúa.");
            }
        }
    }
}
