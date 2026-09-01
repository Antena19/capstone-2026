namespace BACKEND.Negocio.Configuracion
{
    /// <summary>
    /// Opciones de JWT. La clave de firma se carga desde User Secrets, no desde el código.
    /// </summary>
    public class JwtOpciones
    {
        public const string Seccion = "Jwt";

        public string Key { get; set; } = string.Empty;

        public string Issuer { get; set; } = string.Empty;

        public string Audience { get; set; } = string.Empty;

        public int ExpiracionMinutos { get; set; } = 480;
    }
}
