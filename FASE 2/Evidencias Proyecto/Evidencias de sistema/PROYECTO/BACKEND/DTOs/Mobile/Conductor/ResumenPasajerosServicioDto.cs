namespace BACKEND.DTOs.Mobile.Conductor
{
    /// <summary>
    /// Totales operacionales de pasajeros y asistencias de un servicio.
    /// </summary>
    public class ResumenPasajerosServicioDto
    {
        public int TotalPlanificados { get; set; }

        public int TotalConfirmados { get; set; }

        public int TotalPendientes { get; set; }

        public int TotalRechazados { get; set; }

        public int TotalAsistenciasValidas { get; set; }

        public int TotalNoPlanificados { get; set; }

        public int TotalProvisionales { get; set; }
    }
}
