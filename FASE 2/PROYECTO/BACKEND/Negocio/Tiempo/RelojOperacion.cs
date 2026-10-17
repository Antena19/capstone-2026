namespace BACKEND.Negocio.Tiempo
{
    /// <summary>
    /// Reloj UTC del sistema.
    /// </summary>
    public sealed class RelojOperacion : IRelojOperacion
    {
        public DateTime UtcAhora => DateTime.UtcNow;
    }
}
