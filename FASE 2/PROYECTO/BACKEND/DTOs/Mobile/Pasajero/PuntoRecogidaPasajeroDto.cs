using BACKEND.DTOs.Rutas;

namespace BACKEND.DTOs.Mobile.Pasajero
{
    /// <summary>
    /// Punto de recogida asignado al pasajero en un servicio.
    /// </summary>
    public class PuntoRecogidaPasajeroDto
    {
        public string IdPunto { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;

        public string? Referencia { get; set; }

        public int Orden { get; set; }

        public PuntoGeoJsonDto Ubicacion { get; set; } = new();
    }
}
