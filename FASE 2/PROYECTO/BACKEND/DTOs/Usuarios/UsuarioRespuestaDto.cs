using BACKEND.Modelos;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Datos de cuenta que pueden devolverse al cliente.
    /// Omite <c>password_hash</c> y cualquier dato personal ajeno a la sesión.
    /// </summary>
    public class UsuarioRespuestaDto
    {
        public int IdUsuario { get; set; }

        public string Email { get; set; } = string.Empty;

        public int IdRol { get; set; }

        public string Rol { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }

        public DateTime FechaCreacion { get; set; }

        public DateTime? UltimoAcceso { get; set; }
    }
}
