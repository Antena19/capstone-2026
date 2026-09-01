using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Usuarios
{
    /// <summary>
    /// Activación o inactivación de una cuenta. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoUsuarioSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoRegistro), ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public EstadoRegistro Estado { get; set; }
    }
}
