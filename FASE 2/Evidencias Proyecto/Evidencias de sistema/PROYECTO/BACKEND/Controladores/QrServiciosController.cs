using BACKEND.DTOs.Comun;
using BACKEND.DTOs.QR;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Consulta y generación excepcional de QR por ADMINISTRADOR (soporte).
    /// El flujo operativo del conductor está en GET/POST /api/mis-servicios/{idServicio}/qr.
    /// </summary>
    [ApiController]
    [Route("api/servicios")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class QrServiciosController : ControllerBase
    {
        private readonly IServicioQr _servicioQr;

        public QrServiciosController(IServicioQr servicioQr)
        {
            _servicioQr = servicioQr;
        }

        /// <summary>
        /// Consulta el QR ACTIVO vigente del servicio. No genera ni invalida tokens. No exige asignación de conductor.
        /// </summary>
        [HttpGet("{idServicio:int}/qr")]
        [ProducesResponseType(typeof(GenerarQrRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<GenerarQrRespuestaDto>> Obtener(int idServicio)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var qr = await _servicioQr.ObtenerActivoComoAdministradorAsync(idServicio, idAdministrador);
            return Ok(qr);
        }

        /// <summary>
        /// Genera o regenera un token QR ACTIVO como soporte excepcional. No exige asignación de conductor.
        /// Invalida el QR ACTIVO anterior y crea uno nuevo.
        /// </summary>
        [HttpPost("{idServicio:int}/qr")]
        [ProducesResponseType(typeof(GenerarQrRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<GenerarQrRespuestaDto>> Generar(int idServicio)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var qr = await _servicioQr.GenerarComoAdministradorAsync(idServicio, idAdministrador);
            return Created($"api/servicios/{idServicio}/qr", qr);
        }
    }
}
