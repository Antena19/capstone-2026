namespace BACKEND.Modelos
{
    /// <summary>
    /// Catálogo validado en Backend para <c>incidente.tipo</c>.
    /// La columna MySQL permanece VARCHAR(50); no es ENUM de base de datos.
    /// </summary>
    public enum TipoIncidente
    {
        TRAFICO,
        ACCIDENTE,
        VEHICULO,
        PASAJERO,
        ASISTENCIA_QR,
        OTRO
    }
}
