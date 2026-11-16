namespace BACKEND.Negocio.Validacion
{
    /// <summary>
    /// Validación y normalización de RUT chileno (módulo 11).
    /// Reutilizable en empresas, pasajeros y conductores.
    /// Formato canónico persistido: cuerpo sin puntos + guion + DV en mayúscula (76284110-K).
    /// </summary>
    public static class RutChileno
    {
        public const string MensajeInvalido = "El RUT ingresado no es válido.";

        public static bool EsValido(string? valor)
        {
            return TryNormalizar(valor, out _);
        }

        public static bool TryNormalizar(string? valor, out string normalizado)
        {
            normalizado = string.Empty;

            if (string.IsNullOrWhiteSpace(valor))
            {
                return false;
            }

            var limpio = valor.Trim().Replace(".", string.Empty).Replace(" ", string.Empty);
            var separador = limpio.IndexOf('-');
            if (separador <= 0 || separador != limpio.LastIndexOf('-') || separador == limpio.Length - 1)
            {
                return false;
            }

            var cuerpo = limpio[..separador];
            var dvIngresado = limpio[(separador + 1)..];

            if (cuerpo.Length is < 1 or > 8 || !cuerpo.All(char.IsDigit) || dvIngresado.Length != 1)
            {
                return false;
            }

            var dvEsperado = CalcularDigitoVerificador(cuerpo);
            if (!dvEsperado.Equals(dvIngresado, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            normalizado = $"{cuerpo}-{dvEsperado}";
            return true;
        }

        private static string CalcularDigitoVerificador(string cuerpo)
        {
            var suma = 0;
            var multiplicador = 2;

            for (var indice = cuerpo.Length - 1; indice >= 0; indice--)
            {
                suma += (cuerpo[indice] - '0') * multiplicador;
                multiplicador = multiplicador == 7 ? 2 : multiplicador + 1;
            }

            var resto = 11 - (suma % 11);
            if (resto == 11)
            {
                return "0";
            }

            if (resto == 10)
            {
                return "K";
            }

            return resto.ToString();
        }
    }
}
