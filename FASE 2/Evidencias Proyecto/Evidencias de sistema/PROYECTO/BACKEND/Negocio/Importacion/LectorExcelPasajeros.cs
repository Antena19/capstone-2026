using ClosedXML.Excel;
using BACKEND.Negocio.Excepciones;

namespace BACKEND.Negocio.Importacion
{
    public static class LectorExcelPasajeros
    {
        public static MemoryStream CopiarArchivo(IFormFile archivo)
        {
            if (archivo is null || archivo.Length == 0)
            {
                throw new ExcepcionNegocio("Debes seleccionar un archivo Excel.");
            }

            if (archivo.Length > LimitesImportacionPasajeros.MaxBytes)
            {
                throw new ExcepcionNegocio("El archivo supera el máximo de 5 MB.");
            }

            var extension = Path.GetExtension(archivo.FileName);
            if (!string.Equals(extension, LimitesImportacionPasajeros.ExtensionPermitida, StringComparison.OrdinalIgnoreCase))
            {
                throw new ExcepcionNegocio("Solo se admiten archivos .xlsx.");
            }

            var memoria = new MemoryStream();
            archivo.CopyTo(memoria);
            memoria.Position = 0;

            if (memoria.Length < 4)
            {
                throw new ExcepcionNegocio("El archivo Excel no es válido o está dañado.");
            }

            var firma = new byte[4];
            var leidos = memoria.Read(firma, 0, 4);
            if (leidos < 2 || firma[0] != (byte)'P' || firma[1] != (byte)'K')
            {
                throw new ExcepcionNegocio("El archivo no es un Excel .xlsx válido.");
            }

            memoria.Position = 0;
            return memoria;
        }

        public static XLWorkbook Abrir(Stream contenido)
        {
            try
            {
                contenido.Position = 0;
                return new XLWorkbook(contenido);
            }
            catch (Exception)
            {
                throw new ExcepcionNegocio("El archivo Excel no es válido o está dañado.");
            }
        }

        public static IReadOnlyList<string> ListarHojasVisibles(XLWorkbook libro)
        {
            var visibles = libro.Worksheets
                .Where(h => h.Visibility == XLWorksheetVisibility.Visible)
                .Select(h => h.Name)
                .ToList();

            if (visibles.Count > 0)
            {
                return visibles;
            }

            return libro.Worksheets.Select(h => h.Name).ToList();
        }

        public static IXLWorksheet ObtenerHoja(XLWorkbook libro, string? nombreHoja)
        {
            if (string.IsNullOrWhiteSpace(nombreHoja))
            {
                throw new ExcepcionNegocio("Debes seleccionar una hoja.");
            }

            var hoja = libro.Worksheets.FirstOrDefault(h =>
                string.Equals(h.Name, nombreHoja.Trim(), StringComparison.Ordinal));

            if (hoja is null)
            {
                throw new ExcepcionNegocio("La hoja indicada no existe en el archivo.");
            }

            return hoja;
        }

        public static (int FilaEncabezado, IReadOnlyList<ColumnaExcelInterna> Columnas) LeerEncabezados(IXLWorksheet hoja)
        {
            var usada = hoja.RangeUsed();
            if (usada is null)
            {
                throw new ExcepcionNegocio("La hoja seleccionada está vacía.");
            }

            var ultimaFila = usada.LastRow().RowNumber();
            var ultimaColumna = usada.LastColumn().ColumnNumber();
            if (ultimaFila - usada.FirstRow().RowNumber() > LimitesImportacionPasajeros.MaxFilasRecorridas)
            {
                throw new ExcepcionNegocio("El archivo supera el máximo de 2.000 filas.");
            }

            for (var fila = usada.FirstRow().RowNumber(); fila <= ultimaFila; fila++)
            {
                var columnas = new List<ColumnaExcelInterna>();
                var hayContenido = false;

                for (var indice = 1; indice <= ultimaColumna; indice++)
                {
                    var texto = LeerTexto(hoja.Cell(fila, indice));
                    if (!string.IsNullOrWhiteSpace(texto))
                    {
                        hayContenido = true;
                    }

                    columnas.Add(new ColumnaExcelInterna(
                        indice,
                        XLHelper.GetColumnLetterFromNumber(indice),
                        texto));
                }

                if (hayContenido)
                {
                    if (columnas.All(c => string.IsNullOrWhiteSpace(c.Nombre)))
                    {
                        continue;
                    }

                    return (fila, columnas);
                }
            }

            throw new ExcepcionNegocio("No se encontraron encabezados en la hoja.");
        }

        public static string LeerTexto(IXLCell celda)
        {
            if (celda is null || celda.IsEmpty())
            {
                return string.Empty;
            }

            try
            {
                if (celda.HasFormula)
                {
                    if (celda.CachedValue.IsBlank)
                    {
                        return string.Empty;
                    }

                    return NormalizarValor(celda.CachedValue.ToString());
                }

                if (celda.DataType == XLDataType.Number)
                {
                    var numero = celda.GetDouble();
                    if (Math.Abs(numero - Math.Truncate(numero)) < 0.0000001)
                    {
                        return Math.Truncate(numero).ToString("0");
                    }

                    return numero.ToString("G", System.Globalization.CultureInfo.InvariantCulture);
                }

                return NormalizarValor(celda.GetFormattedString());
            }
            catch
            {
                return string.Empty;
            }
        }

        public static bool FilaCompletamenteVacia(IXLWorksheet hoja, int fila, int ultimaColumna)
        {
            for (var indice = 1; indice <= ultimaColumna; indice++)
            {
                if (!string.IsNullOrWhiteSpace(LeerTexto(hoja.Cell(fila, indice))))
                {
                    return false;
                }
            }

            return true;
        }

        private static string NormalizarValor(string? valor)
        {
            return (valor ?? string.Empty).Trim();
        }
    }

    public sealed record ColumnaExcelInterna(int Indice, string Letra, string Nombre);
}
