namespace BACKEND.Negocio.Constantes
{
    /// <summary>
    /// Tipos de servicio admitidos. La columna MySQL permanece VARCHAR(50).
    /// </summary>
    public static class TiposServicio
    {
        public const string Ida = "IDA";
        public const string Regreso = "REGRESO";
        public const string Especial = "ESPECIAL";

        public const string MensajeInvalido = "El tipo de servicio debe ser IDA, REGRESO o ESPECIAL.";

        public static readonly string[] Permitidos = [Ida, Regreso, Especial];

        public static bool EsValido(string? tipo)
        {
            return !string.IsNullOrWhiteSpace(tipo)
                && Permitidos.Contains(tipo, StringComparer.Ordinal);
        }
    }
}
