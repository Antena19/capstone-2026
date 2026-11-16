namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Contraseña temporal generada al restablecer una cuenta.
    /// El texto plano no se vuelve a consultar: solo se devuelve en esta respuesta.
    /// </summary>
    public class RestablecerPasswordRespuestaDto
    {
        public int IdUsuario { get; set; }

        public string Email { get; set; } = string.Empty;

        public string PasswordTemporal { get; set; } = string.Empty;
    }
}
