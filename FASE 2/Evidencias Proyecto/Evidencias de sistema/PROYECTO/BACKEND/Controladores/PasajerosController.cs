using BACKEND.DTOs.Comun;
using BACKEND.DTOs.Pasajeros;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Importacion;
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
        private const string TipoExcel =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        private readonly IServicioPasajeros _servicioPasajeros;
        private readonly IServicioImportacionPasajeros _servicioImportacion;

        public PasajerosController(
            IServicioPasajeros servicioPasajeros,
            IServicioImportacionPasajeros servicioImportacion)
        {
            _servicioPasajeros = servicioPasajeros;
            _servicioImportacion = servicioImportacion;
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
        /// Preferir POST /api/pasajeros/con-cuenta para altas administrativas nuevas.
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
        /// Alta transaccional de pasajero con cuenta PASAJERO y código de activación por SMS.
        /// </summary>
        [HttpPost("con-cuenta")]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> CrearConCuenta(
            [FromBody] CrearPasajeroConCuentaSolicitudDto solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var pasajero = await _servicioPasajeros.CrearConCuentaAsync(solicitud, idAdministrador);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = pasajero.IdPasajero }, pasajero);
        }

        /// <summary>
        /// Crea una cuenta PASAJERO pendiente de activación para un pasajero histórico sin usuario.
        /// </summary>
        [HttpPost("{id:int}/habilitar-acceso")]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> HabilitarAcceso(
            int id,
            [FromBody] HabilitarAccesoPasajeroSolicitudDto? solicitud)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var pasajero = await _servicioPasajeros.HabilitarAccesoAsync(
                id,
                solicitud ?? new HabilitarAccesoPasajeroSolicitudDto(),
                idAdministrador);
            return Ok(pasajero);
        }

        /// <summary>
        /// Genera y envía un nuevo código de activación para un pasajero con cuenta pendiente.
        /// </summary>
        [HttpPost("{id:int}/reenviar-activacion")]
        [ProducesResponseType(typeof(PasajeroRespuestaDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PasajeroRespuestaDto>> ReenviarActivacion(int id)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var pasajero = await _servicioPasajeros.ReenviarActivacionAsync(id, idAdministrador);
            return Ok(pasajero);
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

        /// <summary>
        /// Plantilla .xlsx opcional. No es requisito para importar una nómina propia.
        /// </summary>
        [HttpGet("importacion/plantilla")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult DescargarPlantilla()
        {
            var archivo = _servicioImportacion.GenerarPlantilla();
            return File(archivo.Contenido, TipoExcel, archivo.NombreArchivo);
        }

        [HttpPost("importacion/inspeccionar")]
        [RequestSizeLimit(LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [RequestFormLimits(MultipartBodyLengthLimit = LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [ProducesResponseType(typeof(HojasImportacionDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public ActionResult<HojasImportacionDto> Inspeccionar([FromForm] IFormFile archivo)
        {
            return Ok(_servicioImportacion.Inspeccionar(archivo));
        }

        [HttpPost("importacion/encabezados")]
        [RequestSizeLimit(LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [RequestFormLimits(MultipartBodyLengthLimit = LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [ProducesResponseType(typeof(EncabezadosImportacionDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public ActionResult<EncabezadosImportacionDto> Encabezados(
            [FromForm] IFormFile archivo,
            [FromForm] string nombreHoja)
        {
            return Ok(_servicioImportacion.LeerEncabezados(archivo, nombreHoja));
        }

        [HttpPost("importacion/validar")]
        [RequestSizeLimit(LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [RequestFormLimits(MultipartBodyLengthLimit = LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [ProducesResponseType(typeof(PreviewImportacionPasajerosDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<PreviewImportacionPasajerosDto>> Validar(
            [FromForm] int idEmpresa,
            [FromForm] IFormFile archivo,
            [FromForm] string nombreHoja,
            [FromForm] string mapeoJson)
        {
            var preview = await _servicioImportacion.ValidarAsync(idEmpresa, archivo, nombreHoja, mapeoJson);
            return Ok(preview);
        }

        [HttpPost("importacion")]
        [RequestSizeLimit(LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [RequestFormLimits(MultipartBodyLengthLimit = LimitesImportacionPasajeros.MaxBytesSolicitud)]
        [ProducesResponseType(typeof(ResultadoImportacionPasajerosDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(MensajeRespuestaDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ResultadoImportacionPasajerosDto>> Importar(
            [FromForm] int idEmpresa,
            [FromForm] IFormFile archivo,
            [FromForm] string nombreHoja,
            [FromForm] string mapeoJson)
        {
            var idAdministrador = User.ObtenerIdUsuario();
            var resultado = await _servicioImportacion.ImportarAsync(
                idEmpresa,
                archivo,
                nombreHoja,
                mapeoJson,
                idAdministrador);
            return Ok(resultado);
        }
    }
}
