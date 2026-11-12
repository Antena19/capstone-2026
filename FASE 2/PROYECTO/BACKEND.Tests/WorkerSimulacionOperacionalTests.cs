using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Simulacion;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BACKEND.Tests;

public class WorkerSimulacionOperacionalTests
{
    [Fact]
    public async Task ConLaBanderaApagadaNoEjecutaLaSimulacionYSiLaCancelacion()
    {
        var simulador = new SimuladorFijo(ResultadoVacio("lote-apagado"));
        var cancelacion = new CancelacionContadora();
        var worker = CrearWorker(simulador, cancelacion, habilitada: false, out _);

        await worker.EjecutarPasadaAsync(CancellationToken.None);

        Assert.Equal(0, simulador.Llamadas);
        Assert.Equal(1, cancelacion.Llamadas);
    }

    [Fact]
    public async Task ConLaBanderaApagadaNoResuelveElSimulador()
    {
        var cancelacion = new CancelacionContadora();
        var worker = CrearWorker(simulador: null, cancelacion, habilitada: false, out _);

        await worker.EjecutarPasadaAsync(CancellationToken.None);

        Assert.Equal(1, cancelacion.Llamadas);
    }

    [Fact]
    public async Task SinCandidatosLaCancelacionSigueYNoInformaUnLote()
    {
        var simulador = new SimuladorFijo(
            new ResultadoSimulacionOperacional(null, Array.Empty<DetalleServicioSimulado>()));
        var cancelacion = new CancelacionContadora();
        var worker = CrearWorker(simulador, cancelacion, habilitada: true, out var registros);

        await worker.EjecutarPasadaAsync(CancellationToken.None);

        Assert.Equal(1, simulador.Llamadas);
        Assert.Equal(1, cancelacion.Llamadas);
        Assert.Contains(
            registros.Mensajes,
            m => m.Contains("no encontró servicios candidatos", StringComparison.Ordinal));
        Assert.DoesNotContain(registros.Mensajes, m => m.Contains("terminó", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ConLaBanderaEncendidaSimulaAntesDeCancelar()
    {
        var orden = new List<string>();
        var simulador = new SimuladorFijo(ResultadoVacio("lote-1"), () => orden.Add("simulacion"));
        var cancelacion = new CancelacionContadora(() => orden.Add("cancelacion"));
        var worker = CrearWorker(simulador, cancelacion, habilitada: true, out var registros);

        await worker.EjecutarPasadaAsync(CancellationToken.None);

        Assert.Equal(new[] { "simulacion", "cancelacion" }, orden);
        Assert.Contains(registros.Mensajes, m => m.Contains("lote-1", StringComparison.Ordinal)
            && m.Contains("Procesados: 0", StringComparison.Ordinal)
            && m.Contains("Omitidos: 0", StringComparison.Ordinal)
            && m.Contains("Fallidos: 0", StringComparison.Ordinal));
        Assert.DoesNotContain(registros.Mensajes, m => m.Contains("pasajero", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task UnErrorDelSimuladorSeRegistraYLaCancelacionContinua()
    {
        var simulador = new SimuladorFijo(
            ResultadoVacio("lote-error"),
            () => throw new InvalidOperationException("fallo controlado del simulador"));
        var cancelacion = new CancelacionContadora();
        var worker = CrearWorker(simulador, cancelacion, habilitada: true, out var registros);

        await worker.EjecutarPasadaAsync(CancellationToken.None);

        Assert.Equal(1, cancelacion.Llamadas);
        Assert.Contains(
            registros.Mensajes,
            m => m.Contains("Falló la simulación operacional", StringComparison.Ordinal));
        Assert.DoesNotContain(registros.Mensajes, m => m.Contains("pasajero", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task RegistraLosServiciosFallidosPorIdentificador()
    {
        var resultado = new ResultadoSimulacionOperacional(
            "lote-fallidos",
            new[]
            {
                new DetalleServicioSimulado(4, ResultadoServicioSimulacion.Procesado, MotivoOmisionSimulacion.Ninguno, "Procesado."),
                new DetalleServicioSimulado(9, ResultadoServicioSimulacion.Fallido, MotivoOmisionSimulacion.Ninguno, "La transacción fue revertida.")
            });
        var worker = CrearWorker(new SimuladorFijo(resultado), new CancelacionContadora(), habilitada: true, out var registros);

        await worker.EjecutarPasadaAsync(CancellationToken.None);

        Assert.Contains(
            registros.Mensajes,
            m => m.Contains("lote-fallidos", StringComparison.Ordinal) && m.Contains('9'));
        Assert.DoesNotContain(registros.Mensajes, m => m.Contains("transacción fue revertida", StringComparison.Ordinal));
    }

    [Fact]
    public async Task NoEjecutaDosPasadasAlMismoTiempo()
    {
        var entro = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var seguir = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var llamadas = 0;
        var simulador = new SimuladorFijo(ResultadoVacio("lote-solape"), async () =>
        {
            Interlocked.Increment(ref llamadas);
            entro.TrySetResult();
            await seguir.Task;
        });
        var cancelacion = new CancelacionContadora();
        var worker = CrearWorker(simulador, cancelacion, habilitada: true, out var registros);

        var primera = worker.EjecutarPasadaAsync(CancellationToken.None);
        await entro.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var segunda = worker.EjecutarPasadaAsync(CancellationToken.None);
        var completada = await Task.WhenAny(segunda, Task.Delay(TimeSpan.FromSeconds(1)));

        Assert.Same(segunda, completada);
        Assert.Equal(1, Volatile.Read(ref llamadas));
        Assert.Equal(0, cancelacion.Llamadas);
        Assert.Contains(registros.Mensajes, m => m.Contains("sigue en curso", StringComparison.Ordinal));

        seguir.TrySetResult();
        await primera;
        Assert.Equal(1, cancelacion.Llamadas);

        await worker.EjecutarPasadaAsync(CancellationToken.None);
        Assert.Equal(2, Volatile.Read(ref llamadas));
        Assert.Equal(2, cancelacion.Llamadas);
    }

    [Fact]
    public async Task AlApagarElProcesoDetieneLaSimulacionYNoCancela()
    {
        var simulador = new SimuladorQueEsperaCancelacion();
        var cancelacion = new CancelacionContadora();
        var servicios = new ServiceCollection();
        servicios.AddSingleton<IServicioSimulacionOperacional>(simulador);
        servicios.AddSingleton<IServicioCancelacionAutomatica>(cancelacion);
        servicios.AddSingleton<ILogger<CancelacionServiciosNoIniciadosWorker>>(new RegistroEnMemoria());
        servicios.Configure<CancelacionAutomaticaOpciones>(opciones => opciones.IntervaloMinutos = 60);
        servicios.Configure<SimulacionOperacionalOpciones>(opciones => opciones.Habilitada = true);
        servicios.AddHostedService<CancelacionServiciosNoIniciadosWorker>();

        await using var proveedor = servicios.BuildServiceProvider();
        var worker = proveedor.GetServices<IHostedService>().OfType<CancelacionServiciosNoIniciadosWorker>().Single();

        await worker.StartAsync(CancellationToken.None);
        await simulador.Entro.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await worker.StopAsync(CancellationToken.None);

        Assert.Equal(1, simulador.Llamadas);
        Assert.Equal(0, cancelacion.Llamadas);
    }

    private static CancelacionServiciosNoIniciadosWorker CrearWorker(
        IServicioSimulacionOperacional? simulador,
        CancelacionContadora cancelacion,
        bool habilitada,
        out RegistroEnMemoria registros)
    {
        registros = new RegistroEnMemoria();
        var servicios = new ServiceCollection();
        if (simulador is not null)
        {
            servicios.AddSingleton(simulador);
        }

        servicios.AddSingleton<IServicioCancelacionAutomatica>(cancelacion);
        servicios.Configure<CancelacionAutomaticaOpciones>(opciones => opciones.IntervaloMinutos = 60);
        servicios.Configure<SimulacionOperacionalOpciones>(opciones => opciones.Habilitada = habilitada);

        var proveedor = servicios.BuildServiceProvider();
        return new CancelacionServiciosNoIniciadosWorker(
            proveedor.GetRequiredService<IServiceScopeFactory>(),
            proveedor.GetRequiredService<IOptions<CancelacionAutomaticaOpciones>>(),
            proveedor.GetRequiredService<IOptions<SimulacionOperacionalOpciones>>(),
            registros);
    }

    private static ResultadoSimulacionOperacional ResultadoVacio(string idLote)
    {
        return new ResultadoSimulacionOperacional(idLote, Array.Empty<DetalleServicioSimulado>());
    }

    private sealed class SimuladorFijo : IServicioSimulacionOperacional
    {
        private readonly ResultadoSimulacionOperacional _resultado;
        private readonly Action? _alEntrar;
        private readonly Func<Task>? _esperar;

        public int Llamadas { get; private set; }

        public SimuladorFijo(ResultadoSimulacionOperacional resultado, Action? alEntrar = null)
        {
            _resultado = resultado;
            _alEntrar = alEntrar;
        }

        public SimuladorFijo(ResultadoSimulacionOperacional resultado, Func<Task> esperar)
        {
            _resultado = resultado;
            _esperar = esperar;
        }

        public async Task<ResultadoSimulacionOperacional> EjecutarAsync(CancellationToken cancellationToken = default)
        {
            Llamadas++;
            _alEntrar?.Invoke();
            if (_esperar is not null)
            {
                await _esperar();
            }

            cancellationToken.ThrowIfCancellationRequested();
            return _resultado;
        }
    }

    private sealed class SimuladorQueEsperaCancelacion : IServicioSimulacionOperacional
    {
        public int Llamadas { get; private set; }

        public TaskCompletionSource Entro { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public async Task<ResultadoSimulacionOperacional> EjecutarAsync(CancellationToken cancellationToken = default)
        {
            Llamadas++;
            Entro.TrySetResult();
            await Task.Delay(Timeout.Infinite, cancellationToken);
            return new ResultadoSimulacionOperacional("lote-apagado", Array.Empty<DetalleServicioSimulado>());
        }
    }

    private sealed class CancelacionContadora : IServicioCancelacionAutomatica
    {
        private readonly Action? _alEntrar;

        public int Llamadas { get; private set; }

        public CancelacionContadora(Action? alEntrar = null)
        {
            _alEntrar = alEntrar;
        }

        public Task<int> EjecutarAsync(CancellationToken cancellationToken = default)
        {
            Llamadas++;
            _alEntrar?.Invoke();
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(0);
        }
    }

    private sealed class RegistroEnMemoria : ILogger<CancelacionServiciosNoIniciadosWorker>
    {
        public List<string> Mensajes { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Mensajes.Add(formatter(state, exception));
        }
    }
}
