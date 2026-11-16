using BACKEND.Modelos;

namespace BACKEND.DTOs.Pasajeros
{
    public class PasajeroRespuestaDto
    {
        public int IdPasajero { get; set; }

        public int IdEmpresa { get; set; }

        public int? IdUsuario { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Rut { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string Direccion { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }

        public EstadoAccesoPasajero EstadoAcceso { get; set; } = EstadoAccesoPasajero.SIN_CUENTA;
    }
}
