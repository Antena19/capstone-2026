using BACKEND.Modelos;

namespace BACKEND.DTOs.Pasajeros
{
    /// <summary>
    /// Datos de pasajero que pueden devolverse al cliente administrativo.
    /// No incluye password_hash ni información interna de autenticación.
    /// </summary>
    public class PasajeroRespuestaDto
    {
        public int IdPasajero { get; set; }

        public int IdEmpresa { get; set; }

        public int? IdUsuario { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Rut { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public string Direccion { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }
    }
}
