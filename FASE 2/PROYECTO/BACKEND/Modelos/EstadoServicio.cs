namespace BACKEND.Modelos
{
    /// <summary>
    /// Ciclo de vida de un servicio, alineado con el ENUM de MySQL.
    /// </summary>
    public enum EstadoServicio
    {
        PROGRAMADO,
        EN_CURSO,
        FINALIZADO,
        CANCELADO
    }
}
