using BACKEND.Modelos;

namespace BACKEND.DTOs.Empresas
{
    /// <summary>
    /// Datos de empresa cliente que pueden devolverse al cliente administrativo.
    /// </summary>
    public class EmpresaRespuestaDto
    {
        public int IdEmpresa { get; set; }

        public string Rut { get; set; } = string.Empty;

        public string RazonSocial { get; set; } = string.Empty;

        public string Direccion { get; set; } = string.Empty;

        public string Telefono { get; set; } = string.Empty;

        public string EmailContacto { get; set; } = string.Empty;

        public string NombreContacto { get; set; } = string.Empty;

        public EstadoRegistro Estado { get; set; }
    }
}
