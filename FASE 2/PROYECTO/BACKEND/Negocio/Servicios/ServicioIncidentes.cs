using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Incidentes;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioIncidentes
    {
        Task<IncidenteRespuestaDto> RegistrarComoConductorAsync(
            int idServicio,
            int idUsuario,
            RegistrarIncidenteSolicitudDto solicitud);

        Task<IReadOnlyList<IncidenteRespuestaDto>> ListarComoConductorAsync(int idServicio, int idUsuario);
    }

    /// <summary>
    /// Registro y consulta de incidentes operacionales del CONDUCTOR autenticado.
    /// El conductor se resuelve desde JWT; no se acepta idConductor del cliente.
    /// </summary>
    public class ServicioIncidentes : IServicioIncidentes
    {
        private static readonly HashSet<string> TiposPermitidos = Enum
            .GetNames<TipoIncidente>()
            .ToHashSet(StringComparer.Ordinal);

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioIncidentes> _logger;

        public ServicioIncidentes(TransporteContext contexto, ILogger<ServicioIncidentes> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<IncidenteRespuestaDto> RegistrarComoConductorAsync(
            int idServicio,
            int idUsuario,
            RegistrarIncidenteSolicitudDto solicitud)
        {
            var conductor = await AsegurarConductorAsignadoAsync(idServicio, idUsuario);
            var servicio = await ObtenerServicioAsync(idServicio);

            if (servicio.Estado != EstadoServicio.EN_CURSO)
            {
                throw new ExcepcionNegocio("Solo se pueden registrar incidentes en un servicio en curso.");
            }

            var tipo = ResolverTipo(solicitud.Tipo);
            var descripcion = NormalizarDescripcion(solicitud.Descripcion);

            var incidente = new Incidente
            {
                IdServicio = servicio.IdServicio,
                IdConductor = conductor.IdConductor,
                Tipo = tipo,
                Descripcion = descripcion,
                FechaHora = DateTime.UtcNow,
                Estado = EstadoIncidente.ABIERTO
            };

            _contexto.Incidentes.Add(incidente);
            await _contexto.SaveChangesAsync();

            _logger.LogInformation(
                "El conductor {IdConductor} registró el incidente {IdIncidente} de tipo {Tipo} en el servicio {IdServicio}.",
                conductor.IdConductor,
                incidente.IdIncidente,
                incidente.Tipo,
                servicio.IdServicio);

            return Mapear(incidente);
        }

        public async Task<IReadOnlyList<IncidenteRespuestaDto>> ListarComoConductorAsync(
            int idServicio,
            int idUsuario)
        {
            await AsegurarConductorAsignadoAsync(idServicio, idUsuario);

            var incidentes = await _contexto.Incidentes
                .AsNoTracking()
                .Where(i => i.IdServicio == idServicio)
                .OrderByDescending(i => i.FechaHora)
                .ThenByDescending(i => i.IdIncidente)
                .ToListAsync();

            return incidentes.Select(Mapear).ToList();
        }

        private async Task<Conductor> AsegurarConductorAsignadoAsync(int idServicio, int idUsuario)
        {
            var conductor = await _contexto.Conductores
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdUsuario == idUsuario);

            if (conductor is null)
            {
                throw new ExcepcionNegocio(
                    "No hay un conductor asociado a la cuenta autenticada.",
                    StatusCodes.Status403Forbidden);
            }

            var servicioExiste = await _contexto.Servicios
                .AsNoTracking()
                .AnyAsync(s => s.IdServicio == idServicio);

            if (!servicioExiste)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            var asignado = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .AnyAsync(a =>
                    a.IdServicio == idServicio
                    && a.IdConductor == conductor.IdConductor
                    && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (!asignado)
            {
                throw new ExcepcionNegocio(
                    "No tiene una asignación activa para este servicio.",
                    StatusCodes.Status403Forbidden);
            }

            return conductor;
        }

        private async Task<Servicio> ObtenerServicioAsync(int idServicio)
        {
            var servicio = await _contexto.Servicios
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio no existe.", StatusCodes.Status404NotFound);
            }

            return servicio;
        }

        private static TipoIncidente ResolverTipo(string? tipo)
        {
            var normalizado = tipo?.Trim().ToUpperInvariant() ?? string.Empty;

            if (!TiposPermitidos.Contains(normalizado)
                || !Enum.TryParse<TipoIncidente>(normalizado, ignoreCase: false, out var valor))
            {
                throw new ExcepcionNegocio(
                    "El tipo de incidente no es válido. Use TRAFICO, ACCIDENTE, VEHICULO, PASAJERO, ASISTENCIA_QR u OTRO.");
            }

            return valor;
        }

        private static string NormalizarDescripcion(string? descripcion)
        {
            var valor = descripcion?.Trim() ?? string.Empty;

            if (valor.Length == 0)
            {
                throw new ExcepcionNegocio("La descripción es obligatoria.");
            }

            if (valor.Length > 1000)
            {
                throw new ExcepcionNegocio("La descripción no puede superar los 1000 caracteres.");
            }

            return valor;
        }

        private static IncidenteRespuestaDto Mapear(Incidente incidente)
        {
            return new IncidenteRespuestaDto
            {
                IdIncidente = incidente.IdIncidente,
                IdServicio = incidente.IdServicio,
                Tipo = incidente.Tipo,
                Descripcion = incidente.Descripcion,
                FechaHora = incidente.FechaHora,
                Estado = incidente.Estado
            };
        }
    }
}
