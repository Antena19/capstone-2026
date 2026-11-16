namespace BACKEND.Negocio.Tiempo
{
    /// <summary>
    /// Instante UTC que la operación usa como «ahora».
    /// Las pruebas sustituyen la implementación; producción usa el reloj del sistema.
    /// </summary>
    public interface IRelojOperacion
    {
        DateTime UtcAhora { get; }
    }
}
