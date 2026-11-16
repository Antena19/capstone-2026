namespace BACKEND.Negocio.Geocodificacion
{
    public interface IGeocodificador
    {
        bool EstaConfigurado { get; }

        string ConstruirTextoBusqueda(string direccion);

        Task<ResultadoGeocodificacion> BuscarAsync(string direccion, CancellationToken cancellationToken);
    }
}
