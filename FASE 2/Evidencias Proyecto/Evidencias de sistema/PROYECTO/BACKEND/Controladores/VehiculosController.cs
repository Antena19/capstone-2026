using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Vehiculos;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de vehículos. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// </summary>
    [ApiController]
    [Route("api/vehiculos")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class VehiculosController : ControllerBase
    {
        private readonly IServicioVehiculos _servicioVehiculos;

        public VehiculosController(IServicioVehiculos servicioVehiculos)
        {
            _servicioVehiculos = servicioVehiculos;
        }

        /// <summary>
        /// Lista vehículos. Permite filtrar por estado y por tipo.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<VehiculoRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<VehiculoRespuestaDto>>> Listar(
            [FromQuery] EstadoRegistro? estado,
            [FromQuery] string? tipo)
        {
            var vehiculos = await _servicioVehiculos.ListarAsync(estado, tipo);
            return Ok(vehiculos);
        }

        /// <summary>
        /// Obtiene el detalle de un vehículo.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(VehiculoRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<VehiculoRespuestaDto>> ObtenerPorId(int id)
        {
            var vehiculo = await _servicioVehiculos.ObtenerPorIdAsync(id);
            return Ok(vehiculo);
        }

        /// <summary>
        /// Crea un vehículo con estado ACTIVO.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(VehiculoRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<VehiculoRespuestaDto>> Crear([FromBody] CrearVehiculoSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var vehiculo = await _servicioVehiculos.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = vehiculo.IdVehiculo }, vehiculo);
        }

        /// <summary>
        /// Actualiza los datos de un vehículo. El identificador no se modifica.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(VehiculoRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<VehiculoRespuestaDto>> Editar(int id, [FromBody] EditarVehiculoSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var vehiculo = await _servicioVehiculos.EditarAsync(id, solicitud, idAdministrador);
            return Ok(vehiculo);
        }

        /// <summary>
        /// Activa o inactiva un vehículo existente. No elimina el registro.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(VehiculoRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<VehiculoRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoVehiculoSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var vehiculo = await _servicioVehiculos.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(vehiculo);
        }
    }
}
