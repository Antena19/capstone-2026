using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad del maestro de empresas clientes. Mapea la tabla <c>empresa_cliente</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// </summary>
    [Table("empresa_cliente")]
    public class EmpresaCliente
    {
        [Key]
        [Column("id_empresa")]
        public int IdEmpresa { get; set; }

        [Required]
        [MaxLength(12)]
        [Column("rut")]
        public string Rut { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        [Column("razon_social")]
        public string RazonSocial { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("direccion")]
        public string Direccion { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("telefono")]
        public string Telefono { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("email_contacto")]
        public string EmailContacto { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("nombre_contacto")]
        public string NombreContacto { get; set; } = string.Empty;

        [Required]
        [Column("estado")]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;
    }
}
