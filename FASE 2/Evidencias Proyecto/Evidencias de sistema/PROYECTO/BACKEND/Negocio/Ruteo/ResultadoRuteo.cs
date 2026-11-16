namespace BACKEND.Negocio.Ruteo
{
    /// <summary>
    /// Recorrido calculado. <c>Coordenadas</c> es GeoJSON [longitud, latitud].
    /// </summary>
    public sealed class ResultadoRuteo
    {
        public required IReadOnlyList<double[]> Coordenadas { get; init; }

        public double DistanciaMetros { get; init; }

        public double DuracionSegundos { get; init; }
    }
}
