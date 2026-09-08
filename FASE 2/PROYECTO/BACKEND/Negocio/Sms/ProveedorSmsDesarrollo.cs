using System.Collections.Concurrent;

namespace BACKEND.Negocio.Sms
{
    public interface IProveedorSms
    {
        Task EnviarAsync(string telefono, string mensaje, CancellationToken cancellationToken = default);
    }

    public sealed class SmsSimuladoRegistro
    {
        public string Telefono { get; init; } = string.Empty;

        public string Mensaje { get; init; } = string.Empty;

        public string? Codigo { get; init; }

        public DateTime Fecha { get; init; }
    }

    /// <summary>
    /// Proveedor de desarrollo: no envía SMS reales ni hace requests externos.
    /// Conserva el último mensaje en memoria para pruebas locales.
    /// </summary>
    public sealed class ProveedorSmsDesarrollo : IProveedorSms
    {
        private readonly ConcurrentDictionary<string, SmsSimuladoRegistro> _ultimos = new();
        private readonly ILogger<ProveedorSmsDesarrollo> _logger;

        public ProveedorSmsDesarrollo(ILogger<ProveedorSmsDesarrollo> logger)
        {
            _logger = logger;
        }

        public Task EnviarAsync(string telefono, string mensaje, CancellationToken cancellationToken = default)
        {
            _ultimos[telefono] = new SmsSimuladoRegistro
            {
                Telefono = telefono,
                Mensaje = mensaje,
                Codigo = ExtraerCodigo(mensaje),
                Fecha = DateTime.UtcNow
            };

            _logger.LogInformation(
                "[SMS SIMULADO] Destino: {Telefono}. Mensaje: Trayek: tu código de activación es ******. Válido por 15 minutos.",
                telefono);

            return Task.CompletedTask;
        }

        public SmsSimuladoRegistro? ObtenerUltimo(string telefono)
        {
            return _ultimos.TryGetValue(telefono, out var registro) ? registro : null;
        }

        private static string? ExtraerCodigo(string mensaje)
        {
            var indice = mensaje.IndexOf("es ", StringComparison.Ordinal);
            if (indice < 0 || indice + 9 > mensaje.Length)
            {
                return null;
            }

            var candidato = mensaje.Substring(indice + 3, 6);
            return candidato.All(char.IsDigit) ? candidato : null;
        }
    }
}
