using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Rutas
{
    /// <summary>
    /// Activación o inactivación de una ruta. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoRutaSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoRegistro), ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public EstadoRegistro Estado { get; set; }
    }
}
