using BACKEND.Negocio.Tiempo;

namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Horas reales de una simulación. La hora de pared de Chile se convierte a UTC
    /// con <see cref="RelojChile"/> y se desplaza unos minutos de forma estable.
    /// </summary>
    public static class InstantesSimulacionOperacional
    {
        public static DateTime InicioUtc(int idServicio, DateOnly fecha, TimeOnly horaInicio)
        {
            return RelojChile.AUtc(fecha.ToDateTime(horaInicio)).AddMinutes(1 + idServicio % 5);
        }

        public static DateTime FinUtc(int idServicio, DateOnly fecha, TimeOnly horaInicio, TimeOnly horaFin)
        {
            var inicio = InicioUtc(idServicio, fecha, horaInicio);
            var fin = RelojChile.AUtc(fecha.ToDateTime(horaFin)).AddMinutes(1 + idServicio % 4);
            return fin > inicio ? fin : inicio.AddMinutes(1);
        }

        public static DateTime AsistenciaUtc(DateTime inicioUtc, DateTime finUtc, int indice, int total)
        {
            if (total <= 1 || finUtc <= inicioUtc)
            {
                return DateTime.SpecifyKind(inicioUtc, DateTimeKind.Utc);
            }

            var paso = (finUtc.Ticks - inicioUtc.Ticks) / (total - 1);
            return new DateTime(inicioUtc.Ticks + paso * indice, DateTimeKind.Utc);
        }
    }
}
