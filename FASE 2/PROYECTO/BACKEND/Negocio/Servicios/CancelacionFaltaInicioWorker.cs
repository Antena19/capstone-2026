using BACKEND.Negocio.Tiempo;

namespace BACKEND.Negocio.Servicios
{
    /// <summary>
    /// Revisa en segundo plano los servicios PROGRAMADO cuyo plazo de inicio ya venció.
    /// Un servicio EN_CURSO no entra en la consulta.
    /// </summary>
    public class CancelacionFaltaInicioWorker : BackgroundService
    {
        private static readonly TimeSpan Intervalo = TimeSpan.FromSeconds(30);

        private readonly IServiceScopeFactory _alcances;
        private readonly ILogger<CancelacionFaltaInicioWorker> _logger;

        public CancelacionFaltaInicioWorker(
            IServiceScopeFactory alcances,
            ILogger<CancelacionFaltaInicioWorker> logger)
        {
            _alcances = alcances;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var temporizador = new PeriodicTimer(Intervalo);

            while (!stoppingToken.IsCancellationRequested)
            {
                await EjecutarAsync();

                try
                {
                    await temporizador.WaitForNextTickAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        private async Task EjecutarAsync()
        {
            try
            {
                await using var alcance = _alcances.CreateAsyncScope();
                var servicios = alcance.ServiceProvider.GetRequiredService<IServicioServicios>();
                await servicios.CancelarPorFaltaDeInicioAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "No se pudo ejecutar la cancelación automática por {Motivo}.",
                    ReglaInicioConductor.MotivoFaltaDeInicio);
            }
        }
    }
}
