using System.ComponentModel.DataAnnotations;

namespace BACKEND.Negocio.Validacion
{
    /// <summary>
    /// Valida el formato y dígito verificador de un RUT chileno.
    /// El vacío lo resuelve [Required]; este atributo no lo sustituye.
    /// </summary>
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
    public sealed class RutChilenoAttribute : ValidationAttribute
    {
        public RutChilenoAttribute()
        {
            ErrorMessage = RutChileno.MensajeInvalido;
        }

        public override bool IsValid(object? value)
        {
            if (value is null)
            {
                return true;
            }

            if (value is not string texto)
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(texto))
            {
                return true;
            }

            return RutChileno.EsValido(texto);
        }
    }
}
