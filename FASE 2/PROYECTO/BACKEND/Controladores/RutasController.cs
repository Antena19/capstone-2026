using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de rutas almacenadas en MongoDB. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// </summary>
    [ApiController]
    [Route("api/rutas")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class RutasController : ControllerBase
    {
        private readonly IServicioRutas _servicioRutas;

        public RutasController(IServicioRutas servicioRutas)
        {
            _servicioRutas = servicioRutas;
        }

        /// <summary>
        /// Lista rutas. Permite filtrar por estado, empresaId y sector.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<RutaRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<RutaRespuestaDto>>> Listar(
            [FromQuery] EstadoRegistro? estado,
            [FromQuery] int? empresaId,
            [FromQuery] string? sector)
        {
            var rutas = await _servicioRutas.ListarAsync(estado, empresaId, sector);
            return Ok(rutas);
        }

        /// <summary>
        /// Obtiene el detalle de una ruta por su ObjectId.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(RutaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<RutaRespuestaDto>> ObtenerPorId(string id)
        {
            var ruta = await _servicioRutas.ObtenerPorIdAsync(id);
            return Ok(ruta);
        }

        /// <summary>
        /// Crea una ruta con estado ACTIVO. MongoDB genera el ObjectId.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(RutaRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<RutaRespuestaDto>> Crear([FromBody] CrearRutaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var ruta = await _servicioRutas.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = ruta.IdRuta }, ruta);
        }

        /// <summary>
        /// Actualiza los datos de una ruta. El ObjectId no se modifica.
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(RutaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<RutaRespuestaDto>> Editar(string id, [FromBody] EditarRutaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var ruta = await _servicioRutas.EditarAsync(id, solicitud, idAdministrador);
            return Ok(ruta);
        }

        /// <summary>
        /// Activa o inactiva una ruta existente. No elimina el documento.
        /// </summary>
        [HttpPut("{id}/estado")]
        [ProducesResponseType(typeof(RutaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<RutaRespuestaDto>> CambiarEstado(
            string id,
            [FromBody] CambiarEstadoRutaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var ruta = await _servicioRutas.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(ruta);
        }
    }
}
