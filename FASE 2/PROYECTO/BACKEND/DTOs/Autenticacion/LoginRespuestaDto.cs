namespace BACKEND.DTOs.Autenticacion
{
    /// <summary>
    /// Información necesaria para mantener la sesión en Web o Mobile.
    /// El nombre sale de la ficha del propio pasajero o conductor.
    /// No incluye apellido separado, datos de otras personas ni el hash de contraseña.
    /// </summary>
    public class LoginRespuestaDto
    {
        public string Token { get; set; } = string.Empty;

        public int IdUsuario { get; set; }

        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Nombre completo guardado en la ficha vinculada a esta cuenta.
        /// Nulo si no hay ficha activa.
        /// </summary>
        public string? Nombre { get; set; }

        public string? Telefono { get; set; }

        public string Rol { get; set; } = string.Empty;

        public DateTime Expiracion { get; set; }

        public bool DebeCambiarPassword { get; set; }
    }
}
