using BACKEND.Modelos;

namespace BACKEND.DTOs.Conductores
{
    /// <summary>
    /// Datos de conductor que pueden devolverse al cliente administrativo.
    /// No incluye password_hash ni información interna de autenticación.
    /// </summary>
    public class ConductorRespuestaDto
    {
        public int IdConductor { get; set; }

        public int IdUsuario { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Rut { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }
    }
}
