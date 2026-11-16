namespace BACKEND.Modelos
{
    /// <summary>
    /// Vigencia de una asistencia, alineada con el ENUM de MySQL.
    /// Las NO_PLANIFICADAS inician en PROVISIONAL y se resuelven al pasar el servicio a EN_CURSO.
    /// </summary>
    public enum EstadoAsistencia
    {
        PROVISIONAL,
        VALIDA,
        ANULADA
    }
}
