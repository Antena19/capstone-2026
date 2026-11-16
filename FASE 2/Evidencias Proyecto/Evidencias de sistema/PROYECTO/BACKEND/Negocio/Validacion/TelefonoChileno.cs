namespace BACKEND.Negocio.Validacion
{
    /// <summary>
    /// Normalización de móviles Chile al formato canónico +569XXXXXXXX.
    /// Acepta +569..., 569..., 9 XXXX XXXX y variantes con espacios o guiones.
    /// No cubre fijos ni numeración internacional.
    /// </summary>
    public static class TelefonoChileno
    {
        public const string MensajeInvalido = "Ingresa un teléfono móvil chileno válido.";
        public const int LongitudMaxima = 20;

        public static bool TryNormalizar(string? valor, out string normalizado)
        {
            normalizado = string.Empty;
            if (string.IsNullOrWhiteSpace(valor))
            {
                return false;
            }

            var buffer = new System.Text.StringBuilder(valor.Length);
            foreach (var caracter in valor.Trim())
            {
                if (caracter == '+' && buffer.Length == 0)
                {
                    buffer.Append(caracter);
                }
                else if (char.IsDigit(caracter))
                {
                    buffer.Append(caracter);
                }
            }

            var limpio = buffer.ToString();
            var digitos = limpio.StartsWith('+') ? limpio[1..] : limpio;

            if (digitos.StartsWith("56", StringComparison.Ordinal) && digitos.Length == 11 && digitos[2] == '9')
            {
                normalizado = "+" + digitos;
            }
            else if (digitos.Length == 9 && digitos[0] == '9')
            {
                normalizado = "+56" + digitos;
            }
            else
            {
                return false;
            }

            return normalizado.Length == 12 && normalizado.StartsWith("+569", StringComparison.Ordinal);
        }
    }
}
