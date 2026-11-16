namespace BACKEND.Modelos
{
    /// <summary>
    /// Ciclo de vida de una planificación, alineado con el ENUM de MySQL.
    /// </summary>
    public enum EstadoPlanificacion
    {
        BORRADOR,
        ACTIVA,
        CERRADA,
        CANCELADA
    }
}
