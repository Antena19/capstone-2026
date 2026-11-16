namespace BACKEND.Negocio.Validacion
{
    public static class EmailContacto
    {
        public const int LongitudMaxima = 150;
        public const string MensajeInvalido = "El correo electrónico no es válido.";

        public static bool TryNormalizarOpcional(string? valor, out string? email)
        {
            email = null;
            var texto = valor?.Trim() ?? string.Empty;
            if (texto.Length == 0)
            {
                return true;
            }

            if (texto.Length > LongitudMaxima)
            {
                return false;
            }

            var normalizado = texto.ToLowerInvariant();
            if (!normalizado.Contains('@', StringComparison.Ordinal)
                || normalizado.StartsWith('@')
                || normalizado.EndsWith('@'))
            {
                return false;
            }

            email = normalizado;
            return true;
        }
    }
}
