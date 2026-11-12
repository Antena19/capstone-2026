using BACKEND.Modelos;

namespace BACKEND.Negocio.Simulacion
{
    public enum MotivoRechazoReversion
    {
        Ninguno,
        LoteNoCompletado,
        MarcaNoVigente,
        EstadoPosteriorInvalido,
        EstadoDistintoDelPosterior,
        InicioRealDistinto,
        FinRealDistinto,
        MotivoDistinto,
        AsistenciaSinIdentificador,
        AsistenciasDistintas
    }

    /// <summary>
    /// Servicio tal como quedó en la simulación y tal como está ahora.
    /// Las listas de asistencias se comparan como conjuntos.
    /// </summary>
    public sealed record ServicioObservadoParaReversion(
        int IdServicio,
        EstadoMarcaSimulacion EstadoMarca,
        EstadoServicio EstadoPosterior,
        DateTime? InicioRealPosterior,
        DateTime? FinRealPosterior,
        string? MotivoPosterior,
        EstadoServicio EstadoActual,
        DateTime? InicioRealActual,
        DateTime? FinRealActual,
        string? MotivoActual,
        IReadOnlyList<int?> IdsAsistenciasMarcadas,
        IReadOnlyList<int> IdsAsistenciasActuales);

    public sealed record SolicitudReversionSimulacion(
        EstadoLoteSimulacion EstadoLote,
        IReadOnlyList<ServicioObservadoParaReversion> Servicios);

    public sealed record EvaluacionReversionSimulacion(
        bool PuedeRevertir,
        MotivoRechazoReversion Motivo,
        string Mensaje,
        int? IdServicio);

    /// <summary>
    /// Decide si un lote completo puede volver atrás. No modifica filas.
    /// La reversión futura es una sola transacción: si un servicio no coincide
    /// con su marca, no se revierte ninguno.
    /// </summary>
    public static class ReversionSimulacionOperacional
    {
        public static EvaluacionReversionSimulacion Evaluar(SolicitudReversionSimulacion solicitud)
        {
            ArgumentNullException.ThrowIfNull(solicitud);
            ArgumentNullException.ThrowIfNull(solicitud.Servicios);

            if (solicitud.EstadoLote != EstadoLoteSimulacion.COMPLETADO)
            {
                return Rechazo(MotivoRechazoReversion.LoteNoCompletado, null);
            }

            foreach (var servicio in solicitud.Servicios)
            {
                ArgumentNullException.ThrowIfNull(servicio);
                ArgumentNullException.ThrowIfNull(servicio.IdsAsistenciasMarcadas);
                ArgumentNullException.ThrowIfNull(servicio.IdsAsistenciasActuales);

                var motivo = ValidarServicio(servicio);
                if (motivo != MotivoRechazoReversion.Ninguno)
                {
                    return Rechazo(motivo, servicio.IdServicio);
                }
            }

            return new EvaluacionReversionSimulacion(
                true,
                MotivoRechazoReversion.Ninguno,
                Describir(MotivoRechazoReversion.Ninguno),
                null);
        }

        public static string Describir(MotivoRechazoReversion motivo)
        {
            return motivo switch
            {
                MotivoRechazoReversion.Ninguno => "El lote puede revertirse.",
                MotivoRechazoReversion.LoteNoCompletado => "Solo se puede revertir un lote COMPLETADO.",
                MotivoRechazoReversion.MarcaNoVigente => "La marca del servicio ya no está vigente.",
                MotivoRechazoReversion.EstadoPosteriorInvalido => "La marca no registra el servicio como FINALIZADO.",
                MotivoRechazoReversion.EstadoDistintoDelPosterior => "El estado actual del servicio no coincide con la simulación.",
                MotivoRechazoReversion.InicioRealDistinto => "La hora de inicio real ya no coincide con la simulación.",
                MotivoRechazoReversion.FinRealDistinto => "La hora de fin real ya no coincide con la simulación.",
                MotivoRechazoReversion.MotivoDistinto => "El motivo de cancelación ya no coincide con la simulación.",
                MotivoRechazoReversion.AsistenciaSinIdentificador => "Hay una asistencia simulada sin identificador.",
                MotivoRechazoReversion.AsistenciasDistintas => "Las asistencias actuales no coinciden con las de la simulación.",
                _ => "El lote no puede revertirse."
            };
        }

        private static MotivoRechazoReversion ValidarServicio(ServicioObservadoParaReversion servicio)
        {
            if (servicio.EstadoMarca != EstadoMarcaSimulacion.VIGENTE)
            {
                return MotivoRechazoReversion.MarcaNoVigente;
            }

            if (servicio.EstadoPosterior != EstadoServicio.FINALIZADO)
            {
                return MotivoRechazoReversion.EstadoPosteriorInvalido;
            }

            if (servicio.EstadoActual != servicio.EstadoPosterior)
            {
                return MotivoRechazoReversion.EstadoDistintoDelPosterior;
            }

            if (!MismaFecha(servicio.InicioRealActual, servicio.InicioRealPosterior))
            {
                return MotivoRechazoReversion.InicioRealDistinto;
            }

            if (!MismaFecha(servicio.FinRealActual, servicio.FinRealPosterior))
            {
                return MotivoRechazoReversion.FinRealDistinto;
            }

            if (!string.Equals(servicio.MotivoActual, servicio.MotivoPosterior, StringComparison.Ordinal))
            {
                return MotivoRechazoReversion.MotivoDistinto;
            }

            var marcadas = new List<int>(servicio.IdsAsistenciasMarcadas.Count);
            foreach (var id in servicio.IdsAsistenciasMarcadas)
            {
                if (id is null)
                {
                    return MotivoRechazoReversion.AsistenciaSinIdentificador;
                }

                marcadas.Add(id.Value);
            }
            if (marcadas.Distinct().Count() != marcadas.Count
                || servicio.IdsAsistenciasActuales.Distinct().Count() != servicio.IdsAsistenciasActuales.Count
                || !new HashSet<int>(marcadas).SetEquals(servicio.IdsAsistenciasActuales))
            {
                return MotivoRechazoReversion.AsistenciasDistintas;
            }

            return MotivoRechazoReversion.Ninguno;
        }

        private static bool MismaFecha(DateTime? actual, DateTime? posterior)
        {
            if (!actual.HasValue || !posterior.HasValue)
            {
                return actual.HasValue == posterior.HasValue;
            }

            return actual.Value.Ticks == posterior.Value.Ticks;
        }

        private static EvaluacionReversionSimulacion Rechazo(MotivoRechazoReversion motivo, int? idServicio)
        {
            return new EvaluacionReversionSimulacion(false, motivo, Describir(motivo), idServicio);
        }
    }
}
