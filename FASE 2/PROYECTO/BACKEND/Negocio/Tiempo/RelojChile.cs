namespace BACKEND.Negocio.Tiempo
{
    /// <summary>
    /// Fecha y hora actuales de Chile continental (zona Santiago).
    /// Respeta el horario de verano; no usa un offset fijo UTC−3.
    /// </summary>
    public static class RelojChile
    {
        private const string IdIana = "America/Santiago";
        private const string IdWindows = "Pacific SA Standard Time";

        private static readonly TimeZoneInfo Zona = ResolverZona();

        /// <summary>
        /// Instante actual expresado como hora local de Chile continental.
        /// El valor no incluye desplazamiento; representa la hora de pared.
        /// </summary>
        public static DateTime Ahora =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zona);

        /// <summary>
        /// Fecha civil actual en Chile continental.
        /// </summary>
        public static DateOnly Hoy => DateOnly.FromDateTime(Ahora);

        /// <summary>
        /// Hora de pared actual en Chile continental.
        /// </summary>
        public static TimeOnly HoraActual => TimeOnly.FromDateTime(Ahora);

        /// <summary>
        /// Fecha y hora de Chile obtenidas del mismo instante UTC.
        /// Usar esta sobrecarga cuando ambas deban corresponder al mismo momento.
        /// </summary>
        public static (DateTime FechaHora, DateOnly Fecha, TimeOnly Hora) ObtenerInstante()
        {
            var fechaHora = Ahora;
            return (fechaHora, DateOnly.FromDateTime(fechaHora), TimeOnly.FromDateTime(fechaHora));
        }

        /// <summary>
        /// Interpreta una fecha/hora de pared de Chile continental y la convierte a UTC.
        /// No usa un offset fijo; respeta el horario de verano de Santiago.
        /// </summary>
        public static DateTime AUtc(DateTime fechaHoraChile)
        {
            var local = DateTime.SpecifyKind(fechaHoraChile, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(local, Zona);
        }

        private static TimeZoneInfo ResolverZona()
        {
            if (TimeZoneInfo.TryFindSystemTimeZoneById(IdIana, out var iana))
            {
                return iana;
            }

            if (TimeZoneInfo.TryFindSystemTimeZoneById(IdWindows, out var windows))
            {
                return windows;
            }

            throw new InvalidOperationException(
                "No se pudo resolver la zona horaria de Chile continental (America/Santiago).");
        }
    }
}
