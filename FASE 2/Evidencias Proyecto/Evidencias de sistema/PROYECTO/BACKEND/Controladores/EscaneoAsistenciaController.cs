using BACKEND.DTOs.Asistencias;
using BACKEND.DTOs.Comun;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Escaneo de QR por el pasajero autenticado.
    /// La identidad se resuelve desde el JWT; el servicio, desde el token QR.
    /// CONDUCTOR no tiene acceso a este endpoint.
    /// </summary>
    [ApiController]
    [Route("api/asistencia")]
    [Authorize(Roles = NombresRol.Pasajero)]
    public class EscaneoAsistenciaController : ControllerBase
    {
        private readonly IServicioAsistencias _servicioAsistencias;

        public EscaneoAsistenciaController(IServicioAsistencias servicioAsistencias)
        {
            _servicioAsistencias = servicioAsistencias;
        }

        /// <summary>
        /// Registra la asistencia efectiva del pasajero autenticado a partir del token QR.
        /// </summary>
        [HttpPost("escanear")]
        [ProducesResponseType(typeof(AsistenciaRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<AsistenciaRespuestaDto>> Escanear(
            [FromBody] EscanearQrSolicitudDto solicitud)
        {
            var idUsuario = User.ObtenerIdUsuario();
            var registro = await _servicioAsistencias.EscanearAsync(solicitud.Token, idUsuario);
            return StatusCode(StatusCodes.Status201Created, registro);
        }
    }
}
