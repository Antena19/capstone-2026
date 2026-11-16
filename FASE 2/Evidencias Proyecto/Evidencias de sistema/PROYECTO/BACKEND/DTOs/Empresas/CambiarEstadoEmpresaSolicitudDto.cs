using System.ComponentModel.DataAnnotations;
using BACKEND.Modelos;

namespace BACKEND.DTOs.Empresas
{
    /// <summary>
    /// Activación o inactivación de una empresa cliente. Solo ADMINISTRADOR.
    /// </summary>
    public class CambiarEstadoEmpresaSolicitudDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        [EnumDataType(typeof(EstadoRegistro), ErrorMessage = "El estado debe ser ACTIVO o INACTIVO.")]
        public EstadoRegistro Estado { get; set; }
    }
}
