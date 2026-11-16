namespace BACKEND.Negocio.Configuracion
{
    /// <summary>
    /// Cadencia del barrido de servicios programados no iniciados.
    /// </summary>
    public class CancelacionAutomaticaOpciones
    {
        public const string Seccion = "CancelacionAutomatica";

        public int IntervaloMinutos { get; set; } = 5;
    }
}
