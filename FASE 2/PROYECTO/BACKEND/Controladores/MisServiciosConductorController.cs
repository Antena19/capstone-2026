using BACKEND.DTOs.Comun;
using BACKEND.DTOs.QR;
using BACKEND.DTOs.Servicios;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Endpoints del conductor autenticado sobre sus servicios asignados.
    /// El conductor se resuelve desde el JWT; no opera servicios de otros conductores
    /// ni modifica asistencias.
    /// </summary>
    [ApiController]
    [Route("api/mis-servicios")]
    [Authorize(Roles = NombresRol.Conductor)]
    public class MisServiciosConductorController : ControllerBase
    {
        private readonly IServicioQr _servicioQr;
        private readonly IServicioServicios _servicioServicios;

        public MisServiciosConductorController(IServicioQr servicioQr, IServicioServicios servicioServicios)
        {
            _servicioQr = servicioQr;
            _servicioServicios = servicioServicios;
        }

        /// <summary>
        /// Genera el QR operativo del servicio asignado al conductor autenticado.
        /// </summary>
        [HttpPost("{idServicio:int}/qr")]
        [ProducesResponseType(typeof(GenerarQrRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<GenerarQrRespuestaDto>> GenerarQr(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var qr = await _servicioQr.GenerarComoConductorAsync(idServicio, idUsuario);
            return Created($"api/mis-servicios/{idServicio}/qr", qr);
        }

        /// <summary>
        /// Inicia el servicio asignado: PROGRAMADO → EN_CURSO y resuelve asistencias provisionales.
        /// </summary>
        [HttpPut("{idServicio:int}/iniciar")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ServicioRespuestaDto>> Iniciar(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.IniciarComoConductorAsync(idServicio, idUsuario);
            return Ok(servicio);
        }

        /// <summary>
        /// Finaliza el servicio asignado: EN_CURSO → FINALIZADO.
        /// </summary>
        [HttpPut("{idServicio:int}/finalizar")]
        [ProducesResponseType(typeof(ServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ServicioRespuestaDto>> Finalizar(int idServicio)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var servicio = await _servicioServicios.FinalizarComoConductorAsync(idServicio, idUsuario);
            return Ok(servicio);
        }
    }
}
