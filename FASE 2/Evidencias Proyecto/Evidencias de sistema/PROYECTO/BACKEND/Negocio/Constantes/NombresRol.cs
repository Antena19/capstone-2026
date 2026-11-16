namespace BACKEND.Negocio.Constantes
{
    /// <summary>
    /// Roles reconocidos por la API. Deben coincidir con el campo <c>rol.nombre</c> en MySQL.
    /// </summary>
    public static class NombresRol
    {
        public const string Administrador = "ADMINISTRADOR";
        public const string Conductor = "CONDUCTOR";
        public const string Pasajero = "PASAJERO";

        public static readonly string[] Permitidos =
        {
            Administrador,
            Conductor,
            Pasajero
        };

        public static bool EsRolPermitido(string? nombre)
        {
            return !string.IsNullOrWhiteSpace(nombre)
                && Permitidos.Contains(nombre, StringComparer.OrdinalIgnoreCase);
        }
    }
}
