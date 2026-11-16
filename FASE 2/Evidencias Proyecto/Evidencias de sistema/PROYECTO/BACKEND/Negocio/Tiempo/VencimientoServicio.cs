namespace BACKEND.Negocio.Tiempo
{
    /// <summary>
    /// Vencimiento de un servicio no iniciado: 12 horas después de la hora de fin
    /// programada, interpretada en America/Santiago.
    /// Las 12 horas se suman al instante UTC, así que cruzan la medianoche y
    /// respetan el horario de verano de Chile.
    /// </summary>
    public static class VencimientoServicio
    {
        public static readonly TimeSpan Plazo = TimeSpan.FromHours(12);

        public static DateTime EnUtc(DateOnly fecha, TimeOnly horaFin)
        {
            var finChile = fecha.ToDateTime(horaFin);
            return RelojChile.AUtc(finChile).Add(Plazo);
        }

        public static bool Cumplido(DateOnly fecha, TimeOnly horaFin, DateTime ahoraUtc)
        {
            return NormalizarUtc(ahoraUtc) >= EnUtc(fecha, horaFin);
        }

        public static DateTime NormalizarUtc(DateTime valor)
        {
            return valor.Kind switch
            {
                DateTimeKind.Utc => valor,
                DateTimeKind.Local => valor.ToUniversalTime(),
                _ => DateTime.SpecifyKind(valor, DateTimeKind.Utc)
            };
        }
    }
}
