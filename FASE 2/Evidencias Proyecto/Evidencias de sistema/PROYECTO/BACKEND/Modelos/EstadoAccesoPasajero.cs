namespace BACKEND.Modelos
{
    /// <summary>
    /// Estado de acceso derivado para el administrador: no se persiste como ENUM propio.
    /// </summary>
    public enum EstadoAccesoPasajero
    {
        SIN_CUENTA,
        PENDIENTE,
        ENVIADA,
        ERROR,
        ACTIVADA
    }
}
