using BACKEND.Negocio.Configuracion;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace BACKEND.Negocio.Servicios
{
    /// <summary>
    /// Barrido al arrancar el proceso y luego en un intervalo fijo.
    /// Un reinicio no pierde vencimientos: cada pasada vuelve a leer la tabla.
    /// </summary>
    public class CancelacionServiciosNoIniciadosWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _alcances;
        private readonly IOptions<CancelacionAutomaticaOpciones> _opciones;
        private readonly ILogger<CancelacionServiciosNoIniciadosWorker> _logger;

        public CancelacionServiciosNoIniciadosWorker(
            IServiceScopeFactory alcances,
            IOptions<CancelacionAutomaticaOpciones> opciones,
            ILogger<CancelacionServiciosNoIniciadosWorker> logger)
        {
            _alcances = alcances;
            _opciones = opciones;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await EjecutarProtegido(stoppingToken);

            var minutos = Math.Clamp(_opciones.Value.IntervaloMinutos, 1, 24 * 60);
            using var temporizador = new PeriodicTimer(TimeSpan.FromMinutes(minutos));

            while (await temporizador.WaitForNextTickAsync(stoppingToken))
            {
                await EjecutarProtegido(stoppingToken);
            }
        }

        private async Task EjecutarProtegido(CancellationToken cancellationToken)
        {
            try
            {
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
        }
    }
}
