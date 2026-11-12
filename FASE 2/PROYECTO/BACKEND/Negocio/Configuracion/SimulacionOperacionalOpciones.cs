namespace BACKEND.Negocio.Configuracion
{
    /// <summary>
    /// Interruptor del simulador operacional. Apagado, el worker de cancelación
    /// conserva su barrido actual.
    /// </summary>
    public class SimulacionOperacionalOpciones
    {
        public const string Seccion = "SimulacionOperacional";

        public bool Habilitada { get; set; }
    }
}
