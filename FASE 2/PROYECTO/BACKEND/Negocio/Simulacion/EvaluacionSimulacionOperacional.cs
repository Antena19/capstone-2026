namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Motivo por el que un servicio queda fuera de la simulación.
    /// <see cref="Ninguno"/> indica que puede simularse.
    /// </summary>
    public enum MotivoOmisionSimulacion
    {
        Ninguno,
        IdentificadorInvalido,
        OtraEmpresa,
        OtraPlanificacion,
        EstadoDistintoDeProgramado,
        InicioRealRegistrado,
        FinRealRegistrado,
        AsistenciaPrevia,
        FinProgramadoPendiente,
        SinAsignacionActiva,
        AsignacionesActivasMultiples,
        CapacidadInvalida,
        PasajeroInvalido,
        PasajerosDuplicados,
        CapacidadInsuficiente
    }

    /// <summary>
    /// Resultado de la evaluación pura. No persiste asistencias ni cambia el servicio.
    /// </summary>
    public sealed record EvaluacionSimulacionOperacional(
        bool PuedeSimular,
        MotivoOmisionSimulacion Motivo,
        string Mensaje,
        decimal Tasa,
        IReadOnlyList<int> IdsPasajerosAsistentes);
}
