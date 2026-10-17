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
        /// Cancela los servicios nuevos ya vencidos. Devuelve cuántos cambió en esta pasada.
        /// </summary>
        Task<int> EjecutarAsync(CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Pasa a CANCELADO los servicios PROGRAMADO que no se iniciaron y no tienen
    /// asistencias, 12 horas después de su fin programado en America/Santiago.
    /// No recorre servicios con id menor o igual al corte persistido: esos son
    /// anteriores a la activación. Si el corte no existe, no cancela ninguno.
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
            var corte = await LeerCorteAsync(cancellationToken);
            if (corte is null)
            {
                _logger.LogWarning(
                    "No hay corte persistente {Clave}. La cancelación automática no modifica servicios.",
                    ClavesConfiguracion.CorteCancelacionAutomatica);
                return 0;
            }

            var ahoraUtc = VencimientoServicio.NormalizarUtc(_reloj.UtcAhora);
            var hoyChile = RelojChile.FechaDeUtc(ahoraUtc);

            var candidatos = await _contexto.Servicios
                .AsNoTracking()
                .Where(s => s.IdServicio > corte.Value
                    && s.Estado == EstadoServicio.PROGRAMADO
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
                if (await CancelarUnoAsync(idServicio, corte.Value, cancellationToken))
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

        private async Task<int?> LeerCorteAsync(CancellationToken cancellationToken)
        {
            var fila = await _contexto.ConfiguracionesSistema
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    c => c.Clave == ClavesConfiguracion.CorteCancelacionAutomatica,
                    cancellationToken);

            if (fila is null || !int.TryParse(fila.Valor, out var corte) || corte < 0)
            {
                return null;
            }

            return corte;
        }

        private async Task<bool> CancelarUnoAsync(
            int idServicio,
            int corte,
            CancellationToken cancellationToken)
        {
            await using var transaccion = await _contexto.Database.BeginTransactionAsync(cancellationToken);

            var reclamado = await ReclamoTransicionServicio.ReclamarCancelacionAutomaticaAsync(
                _contexto,
                idServicio,
                corte,
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
