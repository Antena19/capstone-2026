using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BACKEND.Modelos;
using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Seguridad;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioJwt
    {
        (string Token, DateTime Expiracion) GenerarToken(Usuario usuario);
    }

    /// <summary>
    /// Emite JWT con la información mínima para identificar y autorizar al usuario.
    /// </summary>
    public class ServicioJwt : IServicioJwt
    {
        private readonly JwtOpciones _opciones;

        public ServicioJwt(IOptions<JwtOpciones> opciones)
        {
            _opciones = opciones.Value;
        }

        public (string Token, DateTime Expiracion) GenerarToken(Usuario usuario)
        {
            var expiracion = DateTime.UtcNow.AddMinutes(_opciones.ExpiracionMinutos);

            // Solo id, correo y rol: sin RUT, teléfono ni otros datos personales.
            var claims = new List<Claim>
            {
                new(ExtensionesClaims.ClaimIdUsuario, usuario.IdUsuario.ToString()),
                new(ExtensionesClaims.ClaimEmail, usuario.Email),
                new(ExtensionesClaims.ClaimRol, usuario.Rol.Nombre)
            };

            var clave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opciones.Key));
            var credenciales = new SigningCredentials(clave, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _opciones.Issuer,
                audience: _opciones.Audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: expiracion,
                signingCredentials: credenciales);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiracion);
        }
    }
}
