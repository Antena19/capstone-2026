using BACKEND.Modelos;

namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Asignación ya leída para evaluar un servicio. La función pura no consulta MySQL.
    /// </summary>
    public sealed record AsignacionCandidataSimulacion(
        EstadoAsignacionServicio Estado,
        int CapacidadVehiculo);

    /// <summary>
    /// Pasajero ya asociado al servicio. La función pura no consulta MySQL.
    /// </summary>
    public sealed record PasajeroCandidatoSimulacion(
        int IdPasajero,
        int IdEmpresa,
        EstadoRegistro Estado,
        EstadoPasajeroServicio EstadoAsociacion);

    /// <summary>
    /// Datos necesarios para decidir si un servicio se simula y qué pasajeros asisten.
    /// </summary>
    public sealed record CandidatoSimulacionOperacional(
        int IdServicio,
        int IdEmpresa,
        int IdPlanificacion,
        EstadoServicio Estado,
        DateOnly Fecha,
        TimeOnly HoraFin,
        DateTime? FechaHoraInicioReal,
        DateTime? FechaHoraFinReal,
        bool TieneAsistenciaPrevia,
        IReadOnlyList<AsignacionCandidataSimulacion> Asignaciones,
        IReadOnlyList<PasajeroCandidatoSimulacion> Pasajeros);
}
