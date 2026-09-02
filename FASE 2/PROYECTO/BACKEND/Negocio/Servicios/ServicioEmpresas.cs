using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Empresas;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioEmpresas
    {
        Task<IReadOnlyList<EmpresaRespuestaDto>> ListarAsync(EstadoRegistro? estado);

        Task<EmpresaRespuestaDto> ObtenerPorIdAsync(int idEmpresa);

        Task<EmpresaRespuestaDto> CrearAsync(CrearEmpresaSolicitudDto solicitud, int idAdministrador);

        Task<EmpresaRespuestaDto> EditarAsync(int idEmpresa, EditarEmpresaSolicitudDto solicitud, int idAdministrador);

        Task<EmpresaRespuestaDto> CambiarEstadoAsync(int idEmpresa, CambiarEstadoEmpresaSolicitudDto solicitud, int idAdministrador);
    }

    /// <summary>
    /// Gestión de empresas clientes reservada al rol ADMINISTRADOR.
    /// No elimina físicamente registros: solo activa o inactiva.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioEmpresas : IServicioEmpresas
    {
        private const string MensajeRutDuplicado = "Ya existe una empresa con el RUT indicado.";

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioEmpresas> _logger;

        public ServicioEmpresas(TransporteContext contexto, ILogger<ServicioEmpresas> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<EmpresaRespuestaDto>> ListarAsync(EstadoRegistro? estado)
        {
            var consulta = _contexto.EmpresasCliente.AsNoTracking();

            if (estado.HasValue)
            {
                consulta = consulta.Where(e => e.Estado == estado.Value);
            }

            var empresas = await consulta
                .OrderBy(e => e.IdEmpresa)
                .ToListAsync();

            return empresas.Select(Mapear).ToList();
        }

        public async Task<EmpresaRespuestaDto> ObtenerPorIdAsync(int idEmpresa)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(empresa);
        }

        public async Task<EmpresaRespuestaDto> CrearAsync(CrearEmpresaSolicitudDto solicitud, int idAdministrador)
        {
            var datos = NormalizarDatos(
                solicitud.Rut,
                solicitud.RazonSocial,
                solicitud.Direccion,
                solicitud.Telefono,
                solicitud.EmailContacto,
                solicitud.NombreContacto);

            await AsegurarRutDisponibleAsync(datos.Rut);

            var empresa = new EmpresaCliente
            {
                Rut = datos.Rut,
                RazonSocial = datos.RazonSocial,
                Direccion = datos.Direccion,
                Telefono = datos.Telefono,
                EmailContacto = datos.EmailContacto,
                NombreContacto = datos.NombreContacto,
                Estado = EstadoRegistro.ACTIVO
            };

            _contexto.EmpresasCliente.Add(empresa);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó la empresa {IdEmpresa}.",
                idAdministrador,
                empresa.IdEmpresa);

            return Mapear(empresa);
        }

        public async Task<EmpresaRespuestaDto> EditarAsync(
            int idEmpresa,
            EditarEmpresaSolicitudDto solicitud,
            int idAdministrador)
        {
            var empresa = await ObtenerEmpresaAsync(idEmpresa);

            var datos = NormalizarDatos(
                solicitud.Rut,
                solicitud.RazonSocial,
                solicitud.Direccion,
                solicitud.Telefono,
                solicitud.EmailContacto,
                solicitud.NombreContacto);

            await AsegurarRutDisponibleAsync(datos.Rut, idEmpresa);

            empresa.Rut = datos.Rut;
            empresa.RazonSocial = datos.RazonSocial;
            empresa.Direccion = datos.Direccion;
            empresa.Telefono = datos.Telefono;
            empresa.EmailContacto = datos.EmailContacto;
            empresa.NombreContacto = datos.NombreContacto;

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó la empresa {IdEmpresa}.",
                idAdministrador,
                idEmpresa);

            return Mapear(empresa);
        }

        public async Task<EmpresaRespuestaDto> CambiarEstadoAsync(
            int idEmpresa,
            CambiarEstadoEmpresaSolicitudDto solicitud,
            int idAdministrador)
        {
            var empresa = await ObtenerEmpresaAsync(idEmpresa);

            empresa.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado de la empresa {IdEmpresa} a {Estado}.",
                idAdministrador,
                idEmpresa,
                solicitud.Estado);

            return Mapear(empresa);
        }

        private async Task<EmpresaCliente> ObtenerEmpresaAsync(int idEmpresa)
        {
            var empresa = await _contexto.EmpresasCliente
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa no existe.", StatusCodes.Status404NotFound);
            }

            return empresa;
        }

        private async Task AsegurarRutDisponibleAsync(string rut, int? idEmpresaExcluida = null)
        {
            var consulta = _contexto.EmpresasCliente.Where(e => e.Rut == rut);

            if (idEmpresaExcluida.HasValue)
            {
                consulta = consulta.Where(e => e.IdEmpresa != idEmpresaExcluida.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }
        }

        private static DatosEmpresaNormalizados NormalizarDatos(
            string rut,
            string razonSocial,
            string direccion,
            string telefono,
            string emailContacto,
            string nombreContacto)
        {
            return new DatosEmpresaNormalizados(
                RequerirTexto(rut, "El RUT es obligatorio."),
                RequerirTexto(razonSocial, "La razón social es obligatoria."),
                RequerirTexto(direccion, "La dirección es obligatoria."),
                RequerirTexto(telefono, "El teléfono es obligatorio."),
                RequerirTexto(emailContacto, "El correo de contacto es obligatorio.").ToLowerInvariant(),
                RequerirTexto(nombreContacto, "El nombre de contacto es obligatorio."));
        }

        private static string RequerirTexto(string? valor, string mensaje)
        {
            var texto = valor?.Trim() ?? string.Empty;

            if (texto.Length == 0)
            {
                throw new ExcepcionNegocio(mensaje);
            }

            return texto;
        }

        private static EmpresaRespuestaDto Mapear(EmpresaCliente empresa)
        {
            return new EmpresaRespuestaDto
            {
                IdEmpresa = empresa.IdEmpresa,
                Rut = empresa.Rut,
                RazonSocial = empresa.RazonSocial,
                Direccion = empresa.Direccion,
                Telefono = empresa.Telefono,
                EmailContacto = empresa.EmailContacto,
                NombreContacto = empresa.NombreContacto,
                Estado = empresa.Estado
            };
        }

        private sealed record DatosEmpresaNormalizados(
            string Rut,
            string RazonSocial,
            string Direccion,
            string Telefono,
            string EmailContacto,
            string NombreContacto);
    }
}
