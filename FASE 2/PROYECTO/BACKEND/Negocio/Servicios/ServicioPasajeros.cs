using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Pasajeros;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioPasajeros
    {
        Task<IReadOnlyList<PasajeroRespuestaDto>> ListarAsync(EstadoRegistro? estado, int? idEmpresa);

        Task<PasajeroRespuestaDto> ObtenerPorIdAsync(int idPasajero);

        Task<PasajeroRespuestaDto> CrearAsync(CrearPasajeroSolicitudDto solicitud, int idAdministrador);

        Task<PasajeroRespuestaDto> EditarAsync(int idPasajero, EditarPasajeroSolicitudDto solicitud, int idAdministrador);

        Task<PasajeroRespuestaDto> CambiarEstadoAsync(int idPasajero, CambiarEstadoPasajeroSolicitudDto solicitud, int idAdministrador);
    }

    /// <summary>
    /// Gestión de pasajeros reservada al rol ADMINISTRADOR.
    /// No elimina físicamente registros: solo activa o inactiva.
    /// No crea ni modifica cuentas de usuario; la asociación con id_usuario es opcional.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioPasajeros : IServicioPasajeros
    {
        private const string MensajeRutDuplicado = "Ya existe un pasajero con el RUT indicado.";
        private const string MensajeUsuarioAsociado = "El usuario indicado ya está asociado a otro pasajero.";
        private const string MensajeConflicto = "No fue posible guardar el pasajero con los datos indicados.";

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioPasajeros> _logger;

        public ServicioPasajeros(TransporteContext contexto, ILogger<ServicioPasajeros> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<PasajeroRespuestaDto>> ListarAsync(EstadoRegistro? estado, int? idEmpresa)
        {
            var consulta = _contexto.Pasajeros.AsNoTracking();

            if (estado.HasValue)
            {
                consulta = consulta.Where(p => p.Estado == estado.Value);
            }

            if (idEmpresa.HasValue)
            {
                consulta = consulta.Where(p => p.IdEmpresa == idEmpresa.Value);
            }

            var pasajeros = await consulta
                .OrderBy(p => p.IdPasajero)
                .ToListAsync();

            return pasajeros.Select(Mapear).ToList();
        }

        public async Task<PasajeroRespuestaDto> ObtenerPorIdAsync(int idPasajero)
        {
            var pasajero = await _contexto.Pasajeros
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(pasajero);
        }

        public async Task<PasajeroRespuestaDto> CrearAsync(CrearPasajeroSolicitudDto solicitud, int idAdministrador)
        {
            var datos = NormalizarDatos(
                solicitud.IdEmpresa,
                solicitud.IdUsuario,
                solicitud.Nombre,
                solicitud.Rut,
                solicitud.Telefono,
                solicitud.Direccion);

            await AsegurarEmpresaAsignableAsync(datos.IdEmpresa, exigirActiva: true);
            await AsegurarRutDisponibleAsync(datos.Rut);
            await AsegurarUsuarioAsociableAsync(datos.IdUsuario);

            var pasajero = new Pasajero
            {
                IdEmpresa = datos.IdEmpresa,
                IdUsuario = datos.IdUsuario,
                Nombre = datos.Nombre,
                Rut = datos.Rut,
                Telefono = datos.Telefono,
                Direccion = datos.Direccion,
                Estado = EstadoRegistro.ACTIVO
            };

            _contexto.Pasajeros.Add(pasajero);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeConflicto, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el pasajero {IdPasajero}.",
                idAdministrador,
                pasajero.IdPasajero);

            return Mapear(pasajero);
        }

        public async Task<PasajeroRespuestaDto> EditarAsync(
            int idPasajero,
            EditarPasajeroSolicitudDto solicitud,
            int idAdministrador)
        {
            var pasajero = await ObtenerPasajeroAsync(idPasajero);

            var datos = NormalizarDatos(
                solicitud.IdEmpresa,
                solicitud.IdUsuario,
                solicitud.Nombre,
                solicitud.Rut,
                solicitud.Telefono,
                solicitud.Direccion);

            var cambiaEmpresa = pasajero.IdEmpresa != datos.IdEmpresa;
            await AsegurarEmpresaAsignableAsync(datos.IdEmpresa, exigirActiva: cambiaEmpresa);
            await AsegurarRutDisponibleAsync(datos.Rut, idPasajero);
            await AsegurarUsuarioAsociableAsync(datos.IdUsuario, idPasajero);

            pasajero.IdEmpresa = datos.IdEmpresa;
            pasajero.IdUsuario = datos.IdUsuario;
            pasajero.Nombre = datos.Nombre;
            pasajero.Rut = datos.Rut;
            pasajero.Telefono = datos.Telefono;
            pasajero.Direccion = datos.Direccion;

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajeConflicto, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el pasajero {IdPasajero}.",
                idAdministrador,
                idPasajero);

            return Mapear(pasajero);
        }

        public async Task<PasajeroRespuestaDto> CambiarEstadoAsync(
            int idPasajero,
            CambiarEstadoPasajeroSolicitudDto solicitud,
            int idAdministrador)
        {
            var pasajero = await ObtenerPasajeroAsync(idPasajero);

            pasajero.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del pasajero {IdPasajero} a {Estado}.",
                idAdministrador,
                idPasajero,
                solicitud.Estado);

            return Mapear(pasajero);
        }

        private async Task<Pasajero> ObtenerPasajeroAsync(int idPasajero)
        {
            var pasajero = await _contexto.Pasajeros
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            return pasajero;
        }

        private async Task AsegurarEmpresaAsignableAsync(int idEmpresa, bool exigirActiva)
        {
            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.");
            }

            if (exigirActiva && empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
            }
        }

        private async Task AsegurarRutDisponibleAsync(string rut, int? idPasajeroExcluido = null)
        {
            var consulta = _contexto.Pasajeros.Where(p => p.Rut == rut);

            if (idPasajeroExcluido.HasValue)
            {
                consulta = consulta.Where(p => p.IdPasajero != idPasajeroExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeRutDuplicado, StatusCodes.Status409Conflict);
            }
        }

        private async Task AsegurarUsuarioAsociableAsync(int? idUsuario, int? idPasajeroExcluido = null)
        {
            if (!idUsuario.HasValue)
            {
                return;
            }

            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario.Value);

            if (usuario is null)
            {
                throw new ExcepcionNegocio("El usuario indicado no existe.");
            }

            if (!string.Equals(usuario.Rol.Nombre, NombresRol.Pasajero, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio("El usuario indicado debe tener rol PASAJERO.");
            }

            var consulta = _contexto.Pasajeros.Where(p => p.IdUsuario == idUsuario.Value);

            if (idPasajeroExcluido.HasValue)
            {
                consulta = consulta.Where(p => p.IdPasajero != idPasajeroExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajeUsuarioAsociado, StatusCodes.Status409Conflict);
            }
        }

        private static DatosPasajeroNormalizados NormalizarDatos(
            int idEmpresa,
            int? idUsuario,
            string nombre,
            string rut,
            string telefono,
            string direccion)
        {
            return new DatosPasajeroNormalizados(
                idEmpresa,
                idUsuario,
                RequerirTexto(nombre, "El nombre es obligatorio."),
                RequerirTexto(rut, "El RUT es obligatorio."),
                RequerirTexto(telefono, "El teléfono es obligatorio."),
                RequerirTexto(direccion, "La dirección es obligatoria."));
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

        private static PasajeroRespuestaDto Mapear(Pasajero pasajero)
        {
            return new PasajeroRespuestaDto
            {
                IdPasajero = pasajero.IdPasajero,
                IdEmpresa = pasajero.IdEmpresa,
                IdUsuario = pasajero.IdUsuario,
                Nombre = pasajero.Nombre,
                Rut = pasajero.Rut,
                Telefono = pasajero.Telefono,
                Direccion = pasajero.Direccion,
                Estado = pasajero.Estado
            };
        }

        private sealed record DatosPasajeroNormalizados(
            int IdEmpresa,
            int? IdUsuario,
            string Nombre,
            string Rut,
            string Telefono,
            string Direccion);
    }
}
