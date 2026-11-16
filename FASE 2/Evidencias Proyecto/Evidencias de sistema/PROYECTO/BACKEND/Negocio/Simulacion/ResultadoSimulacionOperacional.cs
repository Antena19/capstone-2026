namespace BACKEND.Negocio.Simulacion
{
    public enum ResultadoServicioSimulacion
    {
        Procesado,
        Omitido,
        Fallido
    }

    public sealed record DetalleServicioSimulado(
        int IdServicio,
        ResultadoServicioSimulacion Resultado,
        MotivoOmisionSimulacion Motivo,
        string Mensaje);

    /// <summary>
    /// Resumen de una ejecución. <see cref="IdLote"/> es nulo cuando ningún servicio
    /// superó el selector y no se creó lote. Los omitidos y fallidos no quedan en el lote:
    /// el lote solo contiene los servicios procesados.
    /// </summary>
    public sealed record ResultadoSimulacionOperacional(
        string? IdLote,
        IReadOnlyList<DetalleServicioSimulado> Servicios)
    {
        public int Procesados => Servicios.Count(s => s.Resultado == ResultadoServicioSimulacion.Procesado);

        public int Omitidos => Servicios.Count(s => s.Resultado == ResultadoServicioSimulacion.Omitido);

        public int Fallidos => Servicios.Count(s => s.Resultado == ResultadoServicioSimulacion.Fallido);
    }
}
