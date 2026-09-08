using System.Security.Cryptography;
using BACKEND.Negocio.Validacion;

namespace BACKEND.Negocio.Seguridad
{
    /// <summary>
    /// Genera contraseñas temporales con RandomNumberGenerator.
    /// El valor en texto plano no se persiste: solo se hashea y, si corresponde, se devuelve una vez.
    /// </summary>
    public static class GeneradorPasswordTemporal
    {
        public const int Longitud = 14;

        // Omite 0/O, 1/l/I para facilitar la entrega manual sin recortar de forma relevante la entropía.
        private const string Letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
        private const string Digitos = "23456789";
        private const string Alfabeto = Letras + Digitos;

        public static string Generar()
        {
            for (var intento = 0; intento < 8; intento++)
            {
                var password = Construir();
                if (ValidadorPassword.CumpleRequisitos(password))
                {
                    return password;
                }
            }

            throw new InvalidOperationException("No fue posible generar una contraseña temporal válida.");
        }

        private static string Construir()
        {
            Span<char> caracteres = stackalloc char[Longitud];
            for (var indice = 0; indice < Longitud; indice++)
            {
                caracteres[indice] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
            }

            var posicionLetra = RandomNumberGenerator.GetInt32(Longitud);
            var posicionDigito = RandomNumberGenerator.GetInt32(Longitud - 1);
            if (posicionDigito >= posicionLetra)
            {
                posicionDigito++;
            }

            caracteres[posicionLetra] = Letras[RandomNumberGenerator.GetInt32(Letras.Length)];
            caracteres[posicionDigito] = Digitos[RandomNumberGenerator.GetInt32(Digitos.Length)];
            return new string(caracteres);
        }
    }
}
