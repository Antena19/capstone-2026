namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Punto de prueba para provocar un fallo dentro de la transacción.
    /// Producción no lo usa.
    /// </summary>
    internal interface ISondaSimulacionOperacional
    {
        void AntesDeInsertarAsistencias(int idServicio);

        void AntesDeActualizarServicio(int idServicio);

        void AntesDeRegistrarTrazabilidad(int idServicio);
    }
}
