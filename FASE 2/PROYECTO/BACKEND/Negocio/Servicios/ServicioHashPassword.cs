using BACKEND.Modelos;
using Microsoft.AspNetCore.Identity;

namespace BACKEND.Negocio.Servicios
{
    /// <summary>
    /// Hash y verificación de contraseñas con el algoritmo de ASP.NET Identity (PBKDF2).
    /// Las contraseñas nunca se persisten ni se registran en texto plano.
    /// </summary>
    public interface IServicioHashPassword
    {
        string GenerarHash(string password);

        bool Verificar(string hashAlmacenado, string password);
    }

    public class ServicioHashPassword : IServicioHashPassword
    {
        // PasswordHasher usa PBKDF2 con HMAC-SHA512; el resultado cabe en usuario.password_hash (VARCHAR 255).
        private readonly PasswordHasher<Usuario> _hasher = new();

        // Hash de comparación cuando el usuario no existe, para no filtrar correos por tiempo de respuesta.
        private readonly string _hashSimulado;

        public ServicioHashPassword()
        {
            _hashSimulado = _hasher.HashPassword(new Usuario(), "valor-no-utilizado");
        }

        public string GenerarHash(string password)
        {
            return _hasher.HashPassword(new Usuario(), password);
        }

        public bool Verificar(string hashAlmacenado, string password)
        {
            var hash = string.IsNullOrWhiteSpace(hashAlmacenado) ? _hashSimulado : hashAlmacenado;
            var resultado = _hasher.VerifyHashedPassword(new Usuario(), hash, password);
            return resultado != PasswordVerificationResult.Failed;
        }
    }
}
