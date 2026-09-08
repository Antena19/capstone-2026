using System.Security.Cryptography;
using System.Text;
using BACKEND.Negocio.Configuracion;
using Microsoft.Extensions.Options;

namespace BACKEND.Negocio.Seguridad
{
    public interface IServicioHashCodigoActivacion
    {
        string GenerarHash(int idUsuario, string codigo);

        bool Verificar(string hashAlmacenado, int idUsuario, string codigo);
    }

    /// <summary>
    /// HMAC-SHA256 del código ligado al usuario. El espacio de 6 dígitos es pequeño: se usa secreto de servidor.
    /// </summary>
    public class ServicioHashCodigoActivacion : IServicioHashCodigoActivacion
    {
        private readonly byte[] _clave;

        public ServicioHashCodigoActivacion(IOptions<ActivacionUsuariosOpciones> opciones)
        {
            var clave = opciones.Value.HmacKey;
            if (string.IsNullOrWhiteSpace(clave) || clave.Length < 32)
            {
                throw new InvalidOperationException(
                    "ActivacionUsuarios:HmacKey no está configurada o es demasiado corta. Utilice User Secrets.");
            }

            _clave = Encoding.UTF8.GetBytes(clave);
        }

        public string GenerarHash(int idUsuario, string codigo)
        {
            var payload = Encoding.UTF8.GetBytes($"{idUsuario}:{codigo}");
            using var hmac = new HMACSHA256(_clave);
            return Convert.ToHexString(hmac.ComputeHash(payload));
        }

        public bool Verificar(string hashAlmacenado, int idUsuario, string codigo)
        {
            if (string.IsNullOrWhiteSpace(hashAlmacenado) || string.IsNullOrWhiteSpace(codigo))
            {
                return false;
            }

            try
            {
                var calculado = GenerarHash(idUsuario, codigo);
                var almacenado = Convert.FromHexString(hashAlmacenado);
                var actual = Convert.FromHexString(calculado);
                if (almacenado.Length != actual.Length)
                {
                    return false;
                }

                return CryptographicOperations.FixedTimeEquals(almacenado, actual);
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
