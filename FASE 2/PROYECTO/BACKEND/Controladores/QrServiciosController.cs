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
    /// Generación excepcional de QR por ADMINISTRADOR (soporte).
    /// El flujo operativo del conductor está en POST /api/mis-servicios/{idServicio}/qr.
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
        /// Genera un token QR ACTIVO como soporte excepcional. No exige asignación de conductor.
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
