using BACKEND.Modelos;

namespace BACKEND.Negocio.Tiempo
{
    /// <summary>
    /// Ventana en que el conductor puede iniciar un servicio, medida en hora de pared de Chile.
    /// Se abre 10 minutos antes de la hora programada y se cierra al cumplirse 30 minutos después.
    /// </summary>
    public static class ReglaInicioConductor
    {
        public const string MotivoFaltaDeInicio = "FALTA_DE_INICIO";

        public static readonly TimeSpan Anticipacion = TimeSpan.FromMinutes(10);
        public static readonly TimeSpan LimitePosterior = TimeSpan.FromMinutes(30);

        public enum Disponibilidad
        {
            Antes,
            Disponible,
            Vencido
        }

        public static DateTime InicioPlanificado(DateOnly fecha, TimeOnly horaInicio) =>
            fecha.ToDateTime(horaInicio);

        public static DateTime Apertura(DateOnly fecha, TimeOnly horaInicio) =>
            InicioPlanificado(fecha, horaInicio) - Anticipacion;

        /// <summary>
        /// Instante en que la ventana deja de estar abierta. Ese segundo ya no permite iniciar.
        /// </summary>
        public static DateTime CierreExclusivo(DateOnly fecha, TimeOnly horaInicio) =>
            InicioPlanificado(fecha, horaInicio) + LimitePosterior;

        public static Disponibilidad Evaluar(DateOnly fecha, TimeOnly horaInicio, DateTime ahoraChile)
        {
            var ahora = SinZona(ahoraChile);
            if (ahora < Apertura(fecha, horaInicio))
            {
                return Disponibilidad.Antes;
            }

            if (ahora < CierreExclusivo(fecha, horaInicio))
            {
                return Disponibilidad.Disponible;
            }

            return Disponibilidad.Vencido;
        }

        /// <summary>
        /// Solo un servicio PROGRAMADO cuyo plazo ya se cumplió se cancela por esta regla.
        /// EN_CURSO, FINALIZADO y CANCELADO no cambian.
        /// </summary>
        public static bool DebeCancelarPorFaltaDeInicio(
            EstadoServicio estado,
            DateOnly fecha,
            TimeOnly horaInicio,
            DateTime ahoraChile) =>
            estado == EstadoServicio.PROGRAMADO
            && Evaluar(fecha, horaInicio, ahoraChile) == Disponibilidad.Vencido;

        /// <summary>
        /// El proceso automático solo regulariza hoy y ayer.
        /// Los servicios más antiguos quedan fuera hasta una regularización autorizada.
        /// </summary>
        public static bool EnAlcanceAutomatico(DateOnly fechaServicio, DateOnly hoyChile) =>
            fechaServicio >= hoyChile.AddDays(-1) && fechaServicio <= hoyChile;

        private static DateTime SinZona(DateTime valor) =>
            DateTime.SpecifyKind(valor, DateTimeKind.Unspecified);
    }
}
