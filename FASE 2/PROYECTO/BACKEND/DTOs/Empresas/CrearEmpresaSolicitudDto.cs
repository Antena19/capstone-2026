using System.ComponentModel.DataAnnotations;

namespace BACKEND.DTOs.Empresas
{
    /// <summary>
    /// Alta de empresa cliente. Solo puede utilizarla un ADMINISTRADOR.
    /// El estado inicial lo asigna el servicio (ACTIVO); no se recibe en la petición.
    /// </summary>
    public class CrearEmpresaSolicitudDto
    {
        [Required(ErrorMessage = "El RUT es obligatorio.")]
        [MaxLength(12, ErrorMessage = "El RUT no puede superar los 12 caracteres.")]
        public string Rut { get; set; } = string.Empty;

        [Required(ErrorMessage = "La razón social es obligatoria.")]
        [MaxLength(200, ErrorMessage = "La razón social no puede superar los 200 caracteres.")]
        public string RazonSocial { get; set; } = string.Empty;

        [Required(ErrorMessage = "La dirección es obligatoria.")]
        [MaxLength(255, ErrorMessage = "La dirección no puede superar los 255 caracteres.")]
        public string Direccion { get; set; } = string.Empty;

        [Required(ErrorMessage = "El teléfono es obligatorio.")]
        [MaxLength(20, ErrorMessage = "El teléfono no puede superar los 20 caracteres.")]
        public string Telefono { get; set; } = string.Empty;

        [Required(ErrorMessage = "El correo de contacto es obligatorio.")]
        [EmailAddress(ErrorMessage = "El correo de contacto no es válido.")]
        [MaxLength(150, ErrorMessage = "El correo de contacto no puede superar los 150 caracteres.")]
        public string EmailContacto { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre de contacto es obligatorio.")]
        [MaxLength(100, ErrorMessage = "El nombre de contacto no puede superar los 100 caracteres.")]
        public string NombreContacto { get; set; } = string.Empty;
    }
}
