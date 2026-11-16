namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Cierra servicios ya existentes de la empresa de demostración y registra la trazabilidad.
    /// Lo invoca el worker de cancelación cuando la configuración está habilitada.
    /// No se expone por HTTP.
    /// </summary>
    public interface IServicioSimulacionOperacional
    {
        Task<ResultadoSimulacionOperacional> EjecutarAsync(CancellationToken cancellationToken = default);
    }
}
