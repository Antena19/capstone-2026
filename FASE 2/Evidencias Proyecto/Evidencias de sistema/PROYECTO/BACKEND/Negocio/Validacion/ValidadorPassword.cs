namespace BACKEND.Negocio.Validacion
{
    /// <summary>
    /// Requisitos mínimos de contraseña aplicados al crear, cambiar o restablecer claves.
    /// </summary>
    public static class ValidadorPassword
    {
        public const int LongitudMinima = 8;
        public const int LongitudMaxima = 100;

        /// <summary>
        /// Al menos 8 caracteres, con una letra y un número.
        /// </summary>
        public const string Patron = @"^(?=.*[A-Za-z])(?=.*\d).{8,100}$";

        public const string MensajeRequisitos =
            "La contraseña debe tener entre 8 y 100 caracteres, e incluir al menos una letra y un número.";

        public static bool CumpleRequisitos(string? password)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                return false;
            }

            if (password.Length < LongitudMinima || password.Length > LongitudMaxima)
            {
                return false;
            }

            var tieneLetra = password.Any(char.IsLetter);
            var tieneNumero = password.Any(char.IsDigit);
            return tieneLetra && tieneNumero;
        }
    }
}
