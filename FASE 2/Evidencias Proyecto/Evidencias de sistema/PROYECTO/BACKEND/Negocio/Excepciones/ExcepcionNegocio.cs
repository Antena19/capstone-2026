namespace BACKEND.Negocio.Excepciones
{
    /// <summary>
    /// Error de regla de negocio que puede mostrarse al cliente con un código HTTP controlado.
    /// No debe utilizarse para filtrar excepciones internas ni datos sensibles.
    /// </summary>
    public class ExcepcionNegocio : Exception
    {
        public int CodigoEstado { get; }

        public ExcepcionNegocio(string mensaje, int codigoEstado = StatusCodes.Status400BadRequest)
            : base(mensaje)
        {
            CodigoEstado = codigoEstado;
        }
    }
}
