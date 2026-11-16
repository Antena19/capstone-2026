namespace BACKEND.Negocio.Importacion
{
    public static class LimitesImportacionPasajeros
    {
        public const int MaxFilasUtiles = 2000;

        public const int MaxBytes = 5 * 1024 * 1024;

        /// <summary>
        /// Techo HTTP un poco mayor que el archivo, para que el multipart
        /// llegue al validador de negocio y el mensaje sea en español.
        /// </summary>
        public const int MaxBytesSolicitud = MaxBytes + (3 * 1024 * 1024);

        public const int MaxFilasRecorridas = 2500;

        public const string ExtensionPermitida = ".xlsx";
    }
}
