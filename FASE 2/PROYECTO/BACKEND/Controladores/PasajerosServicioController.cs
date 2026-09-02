using BACKEND.DTOs.Comun;
using BACKEND.DTOs.PasajerosServicio;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de pasajeros planificados por servicio. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403. La confirmación del viaje se realiza en MisServiciosController.
    /// </summary>
    [ApiController]
    [Route("api/pasajeros-servicio")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class PasajerosServicioController : ControllerBase
    {
        private readonly IServicioPasajerosServicio _servicioPasajerosServicio;

        public PasajerosServicioController(IServicioPasajerosServicio servicioPasajerosServicio)
        {
            _servicioPasajerosServicio = servicioPasajerosServicio;
        }

        /// <summary>
        /// Lista asociaciones pasajero-servicio. Permite filtrar por servicio, pasajero, estado y confirmación.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<PasajeroServicioRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<PasajeroServicioRespuestaDto>>> Listar(
            [FromQuery] int? idServicio,
            [FromQuery] int? idPasajero,
            [FromQuery] EstadoPasajeroServicio? estado,
            [FromQuery] EstadoConfirmacionViaje? estadoConfirmacion)
        {
            var registros = await _servicioPasajerosServicio.ListarAsync(
                idServicio,
                idPasajero,
                estado,
                estadoConfirmacion);
            return Ok(registros);
        }

        /// <summary>
        /// Obtiene el detalle de una asociación pasajero-servicio.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PasajeroServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroServicioRespuestaDto>> ObtenerPorId(int id)
        {
            var registro = await _servicioPasajerosServicio.ObtenerPorIdAsync(id);
            return Ok(registro);
        }

        /// <summary>
        /// Asocia un pasajero a un servicio en estado ACTIVO y confirmación PENDIENTE.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(PasajeroServicioRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroServicioRespuestaDto>> Crear(
            [FromBody] CrearPasajeroServicioSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var registro = await _servicioPasajerosServicio.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = registro.IdPasajeroServicio }, registro);
        }

        /// <summary>
        /// Activa o cancela la asociación. No elimina el registro.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(PasajeroServicioRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroServicioRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoPasajeroServicioSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var registro = await _servicioPasajerosServicio.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(registro);
        }
    }
}
