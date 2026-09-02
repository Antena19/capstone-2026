using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Pasajeros;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de pasajeros. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// </summary>
    [ApiController]
    [Route("api/pasajeros")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class PasajerosController : ControllerBase
    {
        private readonly IServicioPasajeros _servicioPasajeros;

        public PasajerosController(IServicioPasajeros servicioPasajeros)
        {
            _servicioPasajeros = servicioPasajeros;
        }

        /// <summary>
        /// Lista pasajeros. Permite filtrar por estado y por empresa.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<PasajeroRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<PasajeroRespuestaDto>>> Listar(
            [FromQuery] EstadoRegistro? estado,
            [FromQuery] int? idEmpresa)
        {
            var pasajeros = await _servicioPasajeros.ListarAsync(estado, idEmpresa);
            return Ok(pasajeros);
        }

        /// <summary>
        /// Obtiene el detalle de un pasajero.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> ObtenerPorId(int id)
        {
            var pasajero = await _servicioPasajeros.ObtenerPorIdAsync(id);
            return Ok(pasajero);
        }

        /// <summary>
        /// Crea un pasajero con estado ACTIVO. No crea una cuenta de usuario.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> Crear([FromBody] CrearPasajeroSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var pasajero = await _servicioPasajeros.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = pasajero.IdPasajero }, pasajero);
        }

        /// <summary>
        /// Actualiza los datos de un pasajero. El identificador no se modifica.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> Editar(int id, [FromBody] EditarPasajeroSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var pasajero = await _servicioPasajeros.EditarAsync(id, solicitud, idAdministrador);
            return Ok(pasajero);
        }

        /// <summary>
        /// Activa o inactiva un pasajero existente. No elimina el registro.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoPasajeroSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var pasajero = await _servicioPasajeros.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(pasajero);
        }
    }
}
