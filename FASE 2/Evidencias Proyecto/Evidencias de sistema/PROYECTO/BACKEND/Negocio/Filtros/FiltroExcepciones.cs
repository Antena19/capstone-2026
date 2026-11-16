using BACKEND.DTOs.Comun;
using BACKEND.Negocio.Excepciones;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BACKEND.Negocio.Filtros
{
    /// <summary>
    /// Convierte errores de negocio en respuestas HTTP controladas
    /// y oculta excepciones internas al cliente.
    /// </summary>
    public class FiltroExcepciones : IExceptionFilter
    {
        private readonly ILogger<FiltroExcepciones> _logger;

        public FiltroExcepciones(ILogger<FiltroExcepciones> logger)
        {
            _logger = logger;
        }

        public void OnException(ExceptionContext context)
        {
            if (context.Exception is ExcepcionNegocio excepcionNegocio)
            {
                context.Result = new ObjectResult(new MensajeRespuestaDto
                {
                    Mensaje = excepcionNegocio.Message
                })
                {
                    StatusCode = excepcionNegocio.CodigoEstado
                };

                context.ExceptionHandled = true;
                return;
            }

            // No se registran contraseñas, hashes ni tokens: solo la ruta y el tipo de error.
            _logger.LogError(
                context.Exception,
                "Error no controlado en {Ruta}.",
                context.HttpContext.Request.Path.Value);

            context.Result = new ObjectResult(new MensajeRespuestaDto
            {
                Mensaje = "Ha ocurrido un error interno."
            })
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };

            context.ExceptionHandled = true;
        }
    }
}
