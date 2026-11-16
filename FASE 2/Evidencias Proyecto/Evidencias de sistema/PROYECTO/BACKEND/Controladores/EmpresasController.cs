using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Empresas;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BACKEND.Controladores
{
    /// <summary>
    /// Administración de empresas clientes. Exclusivo del rol ADMINISTRADOR.
    /// CONDUCTOR y PASAJERO reciben 403 aunque invoquen estos endpoints manualmente.
    /// </summary>
    [ApiController]
    [Route("api/empresas")]
    [Authorize(Roles = NombresRol.Administrador)]
    public class EmpresasController : ControllerBase
    {
        private readonly IServicioEmpresas _servicioEmpresas;

        public EmpresasController(IServicioEmpresas servicioEmpresas)
        {
            _servicioEmpresas = servicioEmpresas;
        }

        /// <summary>
        /// Lista empresas clientes. Permite filtrar por estado ACTIVO o INACTIVO.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<EmpresaRespuestaDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<EmpresaRespuestaDto>>> Listar([FromQuery] EstadoRegistro? estado)
        {
            var empresas = await _servicioEmpresas.ListarAsync(estado);
            return Ok(empresas);
        }

        /// <summary>
        /// Obtiene el detalle de una empresa cliente.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(EmpresaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<EmpresaRespuestaDto>> ObtenerPorId(int id)
        {
            var empresa = await _servicioEmpresas.ObtenerPorIdAsync(id);
            return Ok(empresa);
        }

        /// <summary>
        /// Crea una empresa cliente con estado ACTIVO.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(EmpresaRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<EmpresaRespuestaDto>> Crear([FromBody] CrearEmpresaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var empresa = await _servicioEmpresas.CrearAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = empresa.IdEmpresa }, empresa);
        }

        /// <summary>
        /// Actualiza los datos de una empresa cliente. El identificador no se modifica.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(EmpresaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<EmpresaRespuestaDto>> Editar(int id, [FromBody] EditarEmpresaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var empresa = await _servicioEmpresas.EditarAsync(id, solicitud, idAdministrador);
            return Ok(empresa);
        }

        /// <summary>
        /// Activa o inactiva una empresa cliente existente. No elimina el registro.
        /// </summary>
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(typeof(EmpresaRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<EmpresaRespuestaDto>> CambiarEstado(
            int id,
            [FromBody] CambiarEstadoEmpresaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var empresa = await _servicioEmpresas.CambiarEstadoAsync(id, solicitud, idAdministrador);
            return Ok(empresa);
        }
    }
}
