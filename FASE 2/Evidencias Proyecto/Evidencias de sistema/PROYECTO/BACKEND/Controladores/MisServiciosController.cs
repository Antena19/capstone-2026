using BACKEND.DTOs.Comun;
using BACKEND.DTOs.PasajerosServicio;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Endpoints del pasajero autenticado sobre sus servicios planificados.
    /// El pasajero se resuelve desde el JWT; no se confía en un id enviado por el cliente.
    /// </summary>
    [ApiController]
    [Route("api/mis-servicios")]
    [Authorize(Roles = NombresRol.Pasajero)]
    public class MisServiciosController : ControllerBase
    {
        private readonly IServicioPasajerosServicio _servicioPasajerosServicio;

        public MisServiciosController(IServicioPasajerosServicio servicioPasajerosServicio)
        {
            _servicioPasajerosServicio = servicioPasajerosServicio;
        }

        /// <summary>
        /// Confirma o rechaza la participación en un servicio asociado al pasajero autenticado.
        /// </summary>
        [HttpPut("{idPasajeroServicio:int}/confirmacion")]
        [ProducesResponseType(typeof(PasajeroServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<PasajeroServicioRespuestaDto>> Confirmar(
            int idPasajeroServicio,
            [FromBody] ConfirmarViajeSolicitudDto solicitud)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var registro = await _servicioPasajerosServicio.ConfirmarViajeAsync(
                idPasajeroServicio,
                idUsuario,
                solicitud);
            return Ok(registro);
        }
    }
}
