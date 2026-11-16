namespace BACKEND.Negocio.Configuracion
{
    public class ActivacionUsuariosOpciones
    {
        public const string Seccion = "ActivacionUsuarios";

        public int DuracionMinutos { get; set; } = 15;

        public int MaxIntentos { get; set; } = 5;

        public int CooldownSegundos { get; set; } = 60;

        public string HmacKey { get; set; } = string.Empty;
    }
}
