using System.Security.Claims;
using BACKEND.Negocio.Excepciones;

namespace BACKEND.Negocio.Seguridad
{
    /// <summary>
    /// Lectura de claims del JWT. El identificador de usuario nunca se toma del cuerpo de la petición.
    /// </summary>
    public static class ExtensionesClaims
    {
        public const string ClaimIdUsuario = "id_usuario";
        public const string ClaimEmail = "email";
        public const string ClaimRol = "rol";

        public static int ObtenerIdUsuario(this ClaimsPrincipal usuario)
        {
            var valor = usuario.FindFirst(ClaimIdUsuario)?.Value;

            if (!int.TryParse(valor, out var idUsuario))
            {
                throw new ExcepcionNegocio("No se pudo determinar el usuario autenticado.", StatusCodes.Status401Unauthorized);
            }

            return idUsuario;
        }
    }
}
