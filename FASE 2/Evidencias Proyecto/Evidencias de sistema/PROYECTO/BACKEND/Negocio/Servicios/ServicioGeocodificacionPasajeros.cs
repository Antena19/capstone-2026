using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Rutas;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Geocodificacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioGeocodificacionPasajeros
    {
        Task<IReadOnlyList<PasajeroMapaDto>> ListarPorEmpresaAsync(int idEmpresa, CancellationToken cancellationToken);

        Task<PasajeroMapaDto> GeocodificarAsync(int idPasajero, CancellationToken cancellationToken);

        Task<ResultadoGeocodificacionLoteDto> GeocodificarPendientesAsync(
            int idEmpresa,
            CancellationToken cancellationToken);
    }

    public class ServicioGeocodificacionPasajeros : IServicioGeocodificacionPasajeros
    {
        private readonly TransporteContext _contexto;
        private readonly IGeocodificador _geocodificador;
        private readonly ILogger<ServicioGeocodificacionPasajeros> _logger;

        public ServicioGeocodificacionPasajeros(
            TransporteContext contexto,
            IGeocodificador geocodificador,
            ILogger<ServicioGeocodificacionPasajeros> logger)
        {
            _contexto = contexto;
            _geocodificador = geocodificador;
            _logger = logger;
        }

        public async Task<IReadOnlyList<PasajeroMapaDto>> ListarPorEmpresaAsync(
            int idEmpresa,
            CancellationToken cancellationToken)
        {
            await AsegurarEmpresaActivaAsync(idEmpresa, cancellationToken);

            var pasajeros = await _contexto.Pasajeros
                .AsNoTracking()
                .Where(p => p.IdEmpresa == idEmpresa && p.Estado == EstadoRegistro.ACTIVO)
                .OrderBy(p => p.Nombre)
                .Select(p => new PasajeroMapaDto
                {
                    IdPasajero = p.IdPasajero,
                    Nombre = p.Nombre,
                    Rut = p.Rut,
                    Telefono = p.Telefono,
                    Direccion = p.Direccion,
                    Latitud = p.Latitud,
                    Longitud = p.Longitud,
                    DireccionGeocodificada = p.DireccionGeocodificada,
                    FechaGeocodificacion = p.FechaGeocodificacion,
                    EstadoGeocodificacion = p.Latitud != null && p.Longitud != null
                        ? EstadoGeocodificacion.GEOCODIFICADO
                        : EstadoGeocodificacion.PENDIENTE
                })
                .ToListAsync(cancellationToken);

            return pasajeros;
        }

        public async Task<PasajeroMapaDto> GeocodificarAsync(int idPasajero, CancellationToken cancellationToken)
        {
            var pasajero = await _contexto.Pasajeros
                .FirstOrDefaultAsync(p => p.IdPasajero == idPasajero, cancellationToken);

            if (pasajero is null)
            {
                throw new ExcepcionNegocio("El pasajero no existe.", StatusCodes.Status404NotFound);
            }

            if (pasajero.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("Solo se pueden geocodificar pasajeros activos.");
            }

            await AplicarGeocodificacionAsync(pasajero, cancellationToken);
            await _contexto.SaveChangesAsync(cancellationToken);
            return Mapear(pasajero);
        }

        public async Task<ResultadoGeocodificacionLoteDto> GeocodificarPendientesAsync(
            int idEmpresa,
            CancellationToken cancellationToken)
        {
            await AsegurarEmpresaActivaAsync(idEmpresa, cancellationToken);

            if (!_geocodificador.EstaConfigurado)
            {
                throw new ExcepcionNegocio("El servicio de geocodificación no está configurado.");
            }

            var pendientes = await _contexto.Pasajeros
                .Where(p => p.IdEmpresa == idEmpresa
                    && p.Estado == EstadoRegistro.ACTIVO
                    && (p.Latitud == null || p.Longitud == null)
                    && p.Direccion != "")
                .OrderBy(p => p.Nombre)
                .ToListAsync(cancellationToken);

            var resultados = new List<ItemGeocodificacionLoteDto>(pendientes.Count);
            var geocodificados = 0;
            var errores = 0;

            foreach (var pasajero in pendientes)
            {
                cancellationToken.ThrowIfCancellationRequested();

                try
                {
                    await AplicarGeocodificacionAsync(pasajero, cancellationToken);
                    await _contexto.SaveChangesAsync(cancellationToken);
                    geocodificados++;
                    resultados.Add(new ItemGeocodificacionLoteDto
                    {
                        IdPasajero = pasajero.IdPasajero,
                        Nombre = pasajero.Nombre,
                        Estado = EstadoGeocodificacion.GEOCODIFICADO,
                        Latitud = pasajero.Latitud,
                        Longitud = pasajero.Longitud
                    });
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (ExcepcionNegocio ex)
                {
                    errores++;
                    resultados.Add(CrearError(pasajero, ex.Message));
                    _logger.LogWarning(
                        "No se geocodificó al pasajero {IdPasajero} de la empresa {IdEmpresa}: {Mensaje}.",
                        pasajero.IdPasajero,
                        idEmpresa,
                        ex.Message);
                }
                catch (Exception ex)
                {
                    errores++;
                    resultados.Add(CrearError(pasajero, "No fue posible consultar el servicio de geocodificación."));
                    _logger.LogWarning(
                        ex,
                        "Error inesperado al geocodificar al pasajero {IdPasajero} de la empresa {IdEmpresa}.",
                        pasajero.IdPasajero,
                        idEmpresa);
                }
            }

            _logger.LogInformation(
                "Geocodificación batch de empresa {IdEmpresa}: {Geocodificados} ok, {Errores} error(es), {Pendientes} pendientes.",
                idEmpresa,
                geocodificados,
                errores,
                pendientes.Count);

            return new ResultadoGeocodificacionLoteDto
            {
                TotalPendientes = pendientes.Count,
                Geocodificados = geocodificados,
                Errores = errores,
                Resultados = resultados
            };
        }

        private async Task AplicarGeocodificacionAsync(Pasajero pasajero, CancellationToken cancellationToken)
        {
            var direccion = pasajero.Direccion?.Trim() ?? string.Empty;
            if (direccion.Length == 0)
            {
                throw new ExcepcionNegocio("La dirección es obligatoria.");
            }

            var resultado = await _geocodificador.BuscarAsync(direccion, cancellationToken);
            pasajero.Latitud = resultado.Latitud;
            pasajero.Longitud = resultado.Longitud;
            pasajero.DireccionGeocodificada = resultado.DireccionFormateada;
            pasajero.FechaGeocodificacion = DateTime.UtcNow;

            _logger.LogInformation(
                "Se geocodificó al pasajero {IdPasajero} de la empresa {IdEmpresa}. Lat: {Latitud}. Lon: {Longitud}.",
                pasajero.IdPasajero,
                pasajero.IdEmpresa,
                pasajero.Latitud,
                pasajero.Longitud);
        }

        private async Task AsegurarEmpresaActivaAsync(int idEmpresa, CancellationToken cancellationToken)
        {
            if (idEmpresa < 1)
            {
                throw new ExcepcionNegocio("Debe indicar una empresa válida.");
            }

            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa, cancellationToken);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.");
            }

            if (empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
            }
        }

        private static PasajeroMapaDto Mapear(Pasajero pasajero)
        {
            return new PasajeroMapaDto
            {
                IdPasajero = pasajero.IdPasajero,
                Nombre = pasajero.Nombre,
                Rut = pasajero.Rut,
                Telefono = pasajero.Telefono,
                Direccion = pasajero.Direccion,
                Latitud = pasajero.Latitud,
                Longitud = pasajero.Longitud,
                DireccionGeocodificada = pasajero.DireccionGeocodificada,
                FechaGeocodificacion = pasajero.FechaGeocodificacion,
                EstadoGeocodificacion = pasajero.Latitud != null && pasajero.Longitud != null
                    ? EstadoGeocodificacion.GEOCODIFICADO
                    : EstadoGeocodificacion.PENDIENTE
            };
        }

        private static ItemGeocodificacionLoteDto CrearError(Pasajero pasajero, string mensaje)
        {
            return new ItemGeocodificacionLoteDto
            {
                IdPasajero = pasajero.IdPasajero,
                Nombre = pasajero.Nombre,
                Estado = EstadoGeocodificacion.ERROR,
                Mensaje = mensaje
            };
        }
    }
}
