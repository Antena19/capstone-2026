namespace BACKEND.DTOs.Autenticacion
{
    /// <summary>
    /// Información mínima necesaria para mantener la sesión en Web o Mobile.
    /// No incluye datos personales ni el hash de contraseña.
    /// </summary>
    public class LoginRespuestaDto
    {
        public string Token { get; set; } = string.Empty;

        public int IdUsuario { get; set; }

        public string Email { get; set; } = string.Empty;

        public string Rol { get; set; } = string.Empty;

        public DateTime Expiracion { get; set; }
    }
}
