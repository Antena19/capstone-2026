using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Tiempo;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioCancelacionAutomatica
    {
        /// <summary>
        /// Cancela los servicios ya vencidos. Devuelve cuántos cambió en esta pasada.
        /// </summary>
        Task<int> EjecutarAsync(CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Pasa a CANCELADO los servicios PROGRAMADO que no se iniciaron y no tienen
    /// asistencias, 12 horas después de su fin programado en America/Santiago.
    /// El identificador del servicio no excluye a nadie.
    /// </summary>
    public class ServicioCancelacionAutomatica : IServicioCancelacionAutomatica
    {
        private readonly TransporteContext _contexto;
        private readonly IServicioQr _servicioQr;
        private readonly IRelojOperacion _reloj;
        private readonly ILogger<ServicioCancelacionAutomatica> _logger;

        public ServicioCancelacionAutomatica(
            TransporteContext contexto,
            IServicioQr servicioQr,
            IRelojOperacion reloj,
            ILogger<ServicioCancelacionAutomatica> logger)
        {
            _contexto = contexto;
            _servicioQr = servicioQr;
            _reloj = reloj;
            _logger = logger;
        }

        public async Task<int> EjecutarAsync(CancellationToken cancellationToken = default)
        {
            var ahoraUtc = VencimientoServicio.NormalizarUtc(_reloj.UtcAhora);
            var hoyChile = RelojChile.FechaDeUtc(ahoraUtc);

            var candidatos = await _contexto.Servicios
                .AsNoTracking()
                .Where(s => s.Estado == EstadoServicio.PROGRAMADO
                    && s.FechaHoraInicioReal == null
                    && s.Fecha <= hoyChile
                    && !_contexto.Asistencias.Any(a => a.IdServicio == s.IdServicio))
                .Select(s => new { s.IdServicio, s.Fecha, s.HoraFin })
                .ToListAsync(cancellationToken);

            var vencidos = candidatos
                .Where(s => VencimientoServicio.Cumplido(s.Fecha, s.HoraFin, ahoraUtc))
                .Select(s => s.IdServicio)
                .ToList();

            var cancelados = 0;
            foreach (var idServicio in vencidos)
            {
                if (await CancelarUnoAsync(idServicio, cancellationToken))
                {
                    cancelados++;
                }
            }

            if (cancelados > 0)
            {
                _logger.LogInformation(
                    "La cancelación automática marcó {Cantidad} servicios como CANCELADO por {Motivo}.",
                    cancelados,
                    MotivosCancelacionServicio.FaltaDeInicio);
            }

            return cancelados;
        }

        private async Task<bool> CancelarUnoAsync(
            int idServicio,
            CancellationToken cancellationToken)
        {
            await using var transaccion = await _contexto.Database.BeginTransactionAsync(cancellationToken);

            var reclamado = await ReclamoTransicionServicio.ReclamarCancelacionAutomaticaAsync(
                _contexto,
                idServicio,
                cancellationToken);

            if (!reclamado)
            {
                return false;
            }

            foreach (var entrada in _contexto.ChangeTracker.Entries<Servicio>()
                .Where(e => e.Entity.IdServicio == idServicio)
                .ToList())
            {
                entrada.State = EntityState.Detached;
            }

            await _servicioQr.InvalidarActivosEnTransaccionActualAsync(idServicio);
            await _contexto.SaveChangesAsync(cancellationToken);
            await transaccion.CommitAsync(cancellationToken);
            _contexto.ChangeTracker.Clear();

            _logger.LogInformation(
                "Cancelación automática del servicio {IdServicio} por {Motivo}.",
                idServicio,
                MotivosCancelacionServicio.FaltaDeInicio);

            return true;
        }
    }
}
