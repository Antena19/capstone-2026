using BACKEND.Modelos;

namespace BACKEND.DTOs.Vehiculos
{
    /// <summary>
    /// Datos de vehículo que pueden devolverse al cliente administrativo.
    /// </summary>
    public class VehiculoRespuestaDto
    {
        public int IdVehiculo { get; set; }

        public string Patente { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty;

        public string Marca { get; set; } = string.Empty;

        public string Modelo { get; set; } = string.Empty;

        public int Capacidad { get; set; }

        public EstadoRegistro Estado { get; set; }
    }
}
