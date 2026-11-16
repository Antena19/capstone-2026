using BACKEND.Modelos;

namespace BACKEND.DTOs.Conductores
{
    /// <summary>
    /// Respuesta del alta transaccional. <c>PasswordTemporal</c> aparece únicamente aquí, una sola vez.
    /// No incluye hash ni el identificador de rol.
    /// </summary>
    public class ConductorConCuentaRespuestaDto
    {
        public int IdConductor { get; set; }

        public int IdUsuario { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Rut { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }

        public string PasswordTemporal { get; set; } = string.Empty;
    }
}
