namespace BACKEND.DTOs.Pasajeros
{
    public class ColumnaExcelDto
    {
        public int Indice { get; set; }

        public string Letra { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;
    }

    public class MapeoColumnasImportacionDto
    {
        public int NombreColumna { get; set; }

        public int RutColumna { get; set; }

        public int TelefonoColumna { get; set; }

        public int? EmailColumna { get; set; }

        public int DireccionColumna { get; set; }
    }

    public class HojasImportacionDto
    {
        public IReadOnlyList<string> Hojas { get; set; } = Array.Empty<string>();
    }

    public class EncabezadosImportacionDto
    {
        public string NombreHoja { get; set; } = string.Empty;

        public IReadOnlyList<ColumnaExcelDto> Encabezados { get; set; } = Array.Empty<ColumnaExcelDto>();

        public MapeoColumnasImportacionDto Sugerencia { get; set; } = new();
    }

    public class FilaPreviewImportacionDto
    {
        public int NumeroFila { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Rut { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string Direccion { get; set; } = string.Empty;

        public bool EsValida { get; set; }

        public IReadOnlyList<string> Errores { get; set; } = Array.Empty<string>();
    }

    public class PreviewImportacionPasajerosDto
    {
        public int TotalFilas { get; set; }

        public int Validas { get; set; }

        public int Invalidas { get; set; }

        public IReadOnlyList<FilaPreviewImportacionDto> Filas { get; set; } = Array.Empty<FilaPreviewImportacionDto>();
    }

    public class FilaOmitidaImportacionDto
    {
        public int NumeroFila { get; set; }

        public IReadOnlyList<string> Errores { get; set; } = Array.Empty<string>();
    }

    public class EnvioErrorImportacionDto
    {
        public int IdPasajero { get; set; }

        public string Telefono { get; set; } = string.Empty;

        public string Mensaje { get; set; } = string.Empty;
    }

    public class ResultadoImportacionPasajerosDto
    {
        public int TotalFilas { get; set; }

        public int Creados { get; set; }

        public int Omitidos { get; set; }

        public int ActivacionesEnviadas { get; set; }

        public int ActivacionesError { get; set; }

        public IReadOnlyList<FilaOmitidaImportacionDto> FilasOmitidas { get; set; } = Array.Empty<FilaOmitidaImportacionDto>();

        public IReadOnlyList<EnvioErrorImportacionDto> EnviosError { get; set; } = Array.Empty<EnvioErrorImportacionDto>();
    }
}
