using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Vehiculos;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioVehiculos
    {
        Task<IReadOnlyList<VehiculoRespuestaDto>> ListarAsync(EstadoRegistro? estado, string? tipo);

        Task<VehiculoRespuestaDto> ObtenerPorIdAsync(int idVehiculo);

        Task<VehiculoRespuestaDto> CrearAsync(CrearVehiculoSolicitudDto solicitud, int idAdministrador);

        Task<VehiculoRespuestaDto> EditarAsync(int idVehiculo, EditarVehiculoSolicitudDto solicitud, int idAdministrador);

        Task<VehiculoRespuestaDto> CambiarEstadoAsync(int idVehiculo, CambiarEstadoVehiculoSolicitudDto solicitud, int idAdministrador);
    }

    /// <summary>
    /// Gestión de vehículos reservada al rol ADMINISTRADOR.
    /// No elimina físicamente registros: solo activa o inactiva.
    /// Las reglas de asignación (vehículo inactivo, capacidad y horarios superpuestos)
    /// se implementarán en el módulo de Servicios/Asignaciones.
    /// La persistencia en la tabla auditoria se incorporará cuando el módulo transversal esté disponible.
    /// </summary>
    public class ServicioVehiculos : IServicioVehiculos
    {
        private const string MensajePatenteDuplicada = "Ya existe un vehículo con la patente indicada.";
        private const string MensajeCapacidad = "La capacidad debe ser mayor que cero.";

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioVehiculos> _logger;

        public ServicioVehiculos(TransporteContext contexto, ILogger<ServicioVehiculos> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IReadOnlyList<VehiculoRespuestaDto>> ListarAsync(EstadoRegistro? estado, string? tipo)
        {
            var consulta = _contexto.Vehiculos.AsNoTracking();

            if (estado.HasValue)
            {
                consulta = consulta.Where(v => v.Estado == estado.Value);
            }

            var tipoFiltro = tipo?.Trim();
            if (!string.IsNullOrEmpty(tipoFiltro))
            {
                consulta = consulta.Where(v => v.Tipo == tipoFiltro);
            }

            var vehiculos = await consulta
                .OrderBy(v => v.IdVehiculo)
                .ToListAsync();

            return vehiculos.Select(Mapear).ToList();
        }

        public async Task<VehiculoRespuestaDto> ObtenerPorIdAsync(int idVehiculo)
        {
            var vehiculo = await _contexto.Vehiculos
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.IdVehiculo == idVehiculo);

            if (vehiculo is null)
            {
                throw new ExcepcionNegocio("El vehículo no existe.", StatusCodes.Status404NotFound);
            }

            return Mapear(vehiculo);
        }

        public async Task<VehiculoRespuestaDto> CrearAsync(CrearVehiculoSolicitudDto solicitud, int idAdministrador)
        {
            var datos = NormalizarDatos(
                solicitud.Patente,
                solicitud.Tipo,
                solicitud.Marca,
                solicitud.Modelo,
                solicitud.Capacidad);

            await AsegurarPatenteDisponibleAsync(datos.Patente);

            var vehiculo = new Vehiculo
            {
                Patente = datos.Patente,
                Tipo = datos.Tipo,
                Marca = datos.Marca,
                Modelo = datos.Modelo,
                Capacidad = datos.Capacidad,
                Estado = EstadoRegistro.ACTIVO
            };

            _contexto.Vehiculos.Add(vehiculo);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajePatenteDuplicada, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} creó el vehículo {IdVehiculo}.",
                idAdministrador,
                vehiculo.IdVehiculo);

            return Mapear(vehiculo);
        }

        public async Task<VehiculoRespuestaDto> EditarAsync(
            int idVehiculo,
            EditarVehiculoSolicitudDto solicitud,
            int idAdministrador)
        {
            var vehiculo = await ObtenerVehiculoAsync(idVehiculo);

            var datos = NormalizarDatos(
                solicitud.Patente,
                solicitud.Tipo,
                solicitud.Marca,
                solicitud.Modelo,
                solicitud.Capacidad);

            await AsegurarPatenteDisponibleAsync(datos.Patente, idVehiculo);

            vehiculo.Patente = datos.Patente;
            vehiculo.Tipo = datos.Tipo;
            vehiculo.Marca = datos.Marca;
            vehiculo.Modelo = datos.Modelo;
            vehiculo.Capacidad = datos.Capacidad;

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new ExcepcionNegocio(MensajePatenteDuplicada, StatusCodes.Status409Conflict);
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} actualizó el vehículo {IdVehiculo}.",
                idAdministrador,
                idVehiculo);

            return Mapear(vehiculo);
        }

        public async Task<VehiculoRespuestaDto> CambiarEstadoAsync(
            int idVehiculo,
            CambiarEstadoVehiculoSolicitudDto solicitud,
            int idAdministrador)
        {
            var vehiculo = await ObtenerVehiculoAsync(idVehiculo);

            vehiculo.Estado = solicitud.Estado;
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El administrador {IdAdministrador} cambió el estado del vehículo {IdVehiculo} a {Estado}.",
                idAdministrador,
                idVehiculo,
                solicitud.Estado);

            return Mapear(vehiculo);
        }

        private async Task<Vehiculo> ObtenerVehiculoAsync(int idVehiculo)
        {
            var vehiculo = await _contexto.Vehiculos
                .FirstOrDefaultAsync(v => v.IdVehiculo == idVehiculo);

            if (vehiculo is null)
            {
                throw new ExcepcionNegocio("El vehículo no existe.", StatusCodes.Status404NotFound);
            }

            return vehiculo;
        }

        private async Task AsegurarPatenteDisponibleAsync(string patente, int? idVehiculoExcluido = null)
        {
            var consulta = _contexto.Vehiculos.Where(v => v.Patente == patente);

            if (idVehiculoExcluido.HasValue)
            {
                consulta = consulta.Where(v => v.IdVehiculo != idVehiculoExcluido.Value);
            }

            if (await consulta.AnyAsync())
            {
                throw new ExcepcionNegocio(MensajePatenteDuplicada, StatusCodes.Status409Conflict);
            }
        }

        private static DatosVehiculoNormalizados NormalizarDatos(
            string patente,
            string tipo,
            string marca,
            string modelo,
            int capacidad)
        {
            if (capacidad <= 0)
            {
                throw new ExcepcionNegocio(MensajeCapacidad);
            }

            return new DatosVehiculoNormalizados(
                RequerirTexto(patente, "La patente es obligatoria."),
                RequerirTexto(tipo, "El tipo es obligatorio."),
                RequerirTexto(marca, "La marca es obligatoria."),
                RequerirTexto(modelo, "El modelo es obligatorio."),
                capacidad);
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

        private static VehiculoRespuestaDto Mapear(Vehiculo vehiculo)
        {
            return new VehiculoRespuestaDto
            {
                IdVehiculo = vehiculo.IdVehiculo,
                Patente = vehiculo.Patente,
                Tipo = vehiculo.Tipo,
                Marca = vehiculo.Marca,
                Modelo = vehiculo.Modelo,
                Capacidad = vehiculo.Capacidad,
                Estado = vehiculo.Estado
            };
        }

        private sealed record DatosVehiculoNormalizados(
            string Patente,
            string Tipo,
            string Marca,
            string Modelo,
            int Capacidad);
    }
}
