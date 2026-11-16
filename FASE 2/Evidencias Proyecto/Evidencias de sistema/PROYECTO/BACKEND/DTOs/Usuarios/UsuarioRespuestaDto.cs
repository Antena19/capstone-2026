using BACKEND.Modelos;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Datos de cuenta que pueden devolverse al cliente.
    /// Omite <c>password_hash</c> y cualquier secreto interno.
    /// </summary>
    public class UsuarioRespuestaDto
    {
        public int IdUsuario { get; set; }

        public string Email { get; set; } = string.Empty;

        public string? Telefono { get; set; }

        public int IdRol { get; set; }

        public string Rol { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }

        public DateTime FechaCreacion { get; set; }

        public DateTime? UltimoAcceso { get; set; }
    }
}
