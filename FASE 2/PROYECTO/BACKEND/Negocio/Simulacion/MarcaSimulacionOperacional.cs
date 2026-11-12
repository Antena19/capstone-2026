using BACKEND.Modelos;

namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Arma la marca de un servicio simulado sin escribir en la base.
    /// El estado posterior queda en FINALIZADO y la marca nace vigente.
    /// </summary>
    public static class MarcaSimulacionOperacional
    {
        public static string NuevoIdLote()
        {
            return Guid.NewGuid().ToString("D");
        }

        public static SimulacionServicio CrearVigente(
            string idLote,
            int idServicio,
            EstadoServicio estadoAnterior,
            DateTime? inicioRealAnterior,
            DateTime? finRealAnterior,
            string? motivoCancelacionAnterior,
            DateTime? inicioRealPosterior,
            DateTime? finRealPosterior)
        {
            if (!Guid.TryParseExact(idLote, "D", out _))
            {
                throw new ArgumentException("El lote debe ser un UUID canónico de 36 caracteres.", nameof(idLote));
            }

            if (idServicio <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(idServicio));
            }

            return new SimulacionServicio
            {
                IdLote = idLote,
                IdServicio = idServicio,
                EstadoMarca = EstadoMarcaSimulacion.VIGENTE,
                IdServicioVigente = idServicio,
                EstadoAnterior = estadoAnterior,
                EstadoPosterior = EstadoServicio.FINALIZADO,
                FechaHoraInicioRealAnterior = inicioRealAnterior,
                FechaHoraInicioRealPosterior = inicioRealPosterior,
                FechaHoraFinRealAnterior = finRealAnterior,
                FechaHoraFinRealPosterior = finRealPosterior,
                MotivoCancelacionAnterior = motivoCancelacionAnterior,
                MotivoCancelacionPosterior = null
            };
        }

        public static void MarcarRevertida(SimulacionServicio marca)
        {
            ArgumentNullException.ThrowIfNull(marca);
            marca.EstadoMarca = EstadoMarcaSimulacion.REVERTIDO;
            marca.IdServicioVigente = null;
        }
    }
}
