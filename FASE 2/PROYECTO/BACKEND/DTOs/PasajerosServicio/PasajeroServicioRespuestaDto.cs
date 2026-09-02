using BACKEND.Modelos;

namespace BACKEND.DTOs.PasajerosServicio
{
    /// <summary>
    /// Datos de pasajero por servicio que pueden devolverse al cliente.
    /// </summary>
    public class PasajeroServicioRespuestaDto
    {
        public int IdPasajeroServicio { get; set; }

        public int IdServicio { get; set; }

        public int IdPasajero { get; set; }

        public EstadoConfirmacionViaje EstadoConfirmacion { get; set; }

        public DateTime? FechaConfirmacion { get; set; }

        public EstadoPasajeroServicio Estado { get; set; }
    }
}
