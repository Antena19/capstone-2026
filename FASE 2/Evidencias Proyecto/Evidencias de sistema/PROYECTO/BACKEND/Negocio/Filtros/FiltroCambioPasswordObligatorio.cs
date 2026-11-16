using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Comun;
using BACKEND.Negocio.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Filtros
{
    /// <summary>
    /// Impide el uso de endpoints operacionales mientras el usuario deba cambiar su contraseña.
    /// Permite autenticación anónima y el cambio de contraseña del propio usuario.
    /// </summary>
    public sealed class FiltroCambioPasswordObligatorio : IAsyncActionFilter
    {
        public const string Mensaje = "Debe cambiar su contraseña antes de continuar.";

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var http = context.HttpContext;

            if (http.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            {
                await next();
                return;
            }

            if (http.User.Identity?.IsAuthenticated != true)
            {
                await next();
                return;
            }

            if (EsCambioPassword(http.Request))
            {
                await next();
                return;
            }

            var idClaim = http.User.FindFirst(ExtensionesClaims.ClaimIdUsuario)?.Value;
            if (!int.TryParse(idClaim, out var idUsuario))
            {
                await next();
                return;
            }

            var db = http.RequestServices.GetRequiredService<TransporteContext>();
            var debeCambiar = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.IdUsuario == idUsuario)
                .Select(u => u.DebeCambiarPassword)
                .FirstOrDefaultAsync();

            if (debeCambiar)
            {
                context.Result = new ObjectResult(new MensajeRespuestaDto { Mensaje = Mensaje })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }

            await next();
        }

        private static bool EsCambioPassword(HttpRequest request)
        {
            return HttpMethods.IsPost(request.Method)
                && request.Path.Equals("/api/autenticacion/cambiar-password", StringComparison.OrdinalIgnoreCase);
        }
    }
}
