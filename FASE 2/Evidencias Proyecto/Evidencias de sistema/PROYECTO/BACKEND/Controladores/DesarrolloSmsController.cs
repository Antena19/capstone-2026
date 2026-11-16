using BACKEND.DTOs.Comun;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Sms;
using BACKEND.Negocio.Validacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Consulta de SMS simulados. Solo existe para pruebas locales en Development.
    /// </summary>
    [ApiController]
    [Route("api/desarrollo/sms")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class DesarrolloSmsController : ControllerBase
    {
        private readonly IHostEnvironment _entorno;
        private readonly ProveedorSmsDesarrollo _sms;

        public DesarrolloSmsController(IHostEnvironment entorno, ProveedorSmsDesarrollo sms)
        {
            _entorno = entorno;
            _sms = sms;
        }

        [HttpGet]
        [ProducesResponseType(typeof(SmsDesarrolloRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public ActionResult<SmsDesarrolloRespuestaDto> ObtenerUltimo([FromQuery] string telefono)
        {
            if (!_entorno.IsDevelopment())
            {
                return NotFound();
            }

            if (!TelefonoChileno.TryNormalizar(telefono, out var telefonoNormalizado))
            {
                return NotFound();
            }

            var registro = _sms.ObtenerUltimo(telefonoNormalizado);
            if (registro is null)
            {
                return NotFound(new MensajeRespuestaDto { Mensaje = "No hay un SMS simulado para ese teléfono." });
            }

            return Ok(new SmsDesarrolloRespuestaDto
            {
                Telefono = registro.Telefono,
                Fecha = registro.Fecha,
                Codigo = registro.Codigo
            });
        }
    }

    public class SmsDesarrolloRespuestaDto
    {
        public string Telefono { get; set; } = string.Empty;

        public DateTime Fecha { get; set; }

        public string? Codigo { get; set; }
    }
}
