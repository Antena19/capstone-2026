namespace BACKEND.Negocio.Ruteo
{
    public interface IRuteador
    {
        bool EstaConfigurado { get; }

        Task<ResultadoRuteo> CalcularAsync(
            IReadOnlyList<WaypointRuteo> waypoints,
            CancellationToken cancellationToken);
    }

    public readonly record struct WaypointRuteo(double Latitud, double Longitud, string Etiqueta);
}
