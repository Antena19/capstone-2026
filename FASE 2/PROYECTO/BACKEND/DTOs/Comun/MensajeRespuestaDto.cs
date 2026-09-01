namespace BACKEND.DTOs.Comun
{
    /// <summary>
    /// Respuesta genérica con un mensaje visible para el cliente.
    /// No debe incluir detalles técnicos internos.
    /// </summary>
    public class MensajeRespuestaDto
    {
        public string Mensaje { get; set; } = string.Empty;
    }
}
