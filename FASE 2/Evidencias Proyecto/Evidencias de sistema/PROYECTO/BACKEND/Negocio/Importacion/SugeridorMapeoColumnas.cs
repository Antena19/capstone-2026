using System.Globalization;
using System.Text;
using BACKEND.DTOs.Pasajeros;

namespace BACKEND.Negocio.Importacion
{
    public static class SugeridorMapeoColumnas
    {
        private static readonly string[] AliasNombre =
        [
            "nombre", "trabajador", "nombretrabajador", "trabajadornombre",
            "empleado", "nombreempleado", "nombrecompleto"
        ];

        private static readonly string[] AliasRut =
        [
            "rut", "run", "ruttrabajador", "rutempleado", "runtrabajador", "runempleado"
        ];

        private static readonly string[] AliasTelefono =
        [
            "telefono", "celular", "fono", "telefonocontacto", "celularcontacto"
        ];

        private static readonly string[] AliasEmail =
        [
            "correo", "email", "mail", "correoelectronico", "emailpersonal"
        ];

        private static readonly string[] AliasDireccion =
        [
            "direccion", "domicilio", "direccionparticular", "domicilioparticular"
        ];

        public static MapeoColumnasImportacionDto Sugerir(IReadOnlyList<ColumnaExcelDto> columnas)
        {
            var usados = new HashSet<int>();
            return new MapeoColumnasImportacionDto
            {
                NombreColumna = Resolver(columnas, AliasNombre, usados),
                RutColumna = Resolver(columnas, AliasRut, usados),
                TelefonoColumna = Resolver(columnas, AliasTelefono, usados),
                EmailColumna = ResolverOpcional(columnas, AliasEmail, usados),
                DireccionColumna = Resolver(columnas, AliasDireccion, usados)
            };
        }

        public static string NormalizarEncabezado(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                return string.Empty;
            }

            var descompuesto = valor.Trim().Normalize(NormalizationForm.FormD);
            var buffer = new StringBuilder(descompuesto.Length);
            foreach (var caracter in descompuesto)
            {
                var categoria = CharUnicodeInfo.GetUnicodeCategory(caracter);
                if (categoria == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                if (char.IsLetterOrDigit(caracter))
                {
                    buffer.Append(char.ToLowerInvariant(caracter));
                }
            }

            return buffer.ToString();
        }

        private static int Resolver(
            IReadOnlyList<ColumnaExcelDto> columnas,
            IReadOnlyList<string> alias,
            HashSet<int> usados)
        {
            return ResolverOpcional(columnas, alias, usados) ?? 0;
        }

        private static int? ResolverOpcional(
            IReadOnlyList<ColumnaExcelDto> columnas,
            IReadOnlyList<string> alias,
            HashSet<int> usados)
        {
            foreach (var columna in columnas)
            {
                if (usados.Contains(columna.Indice))
                {
                    continue;
                }

                var clave = NormalizarEncabezado(columna.Nombre);
                if (alias.Contains(clave))
                {
                    usados.Add(columna.Indice);
                    return columna.Indice;
                }
            }

            return null;
        }
    }
}
