using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad del maestro de pasajeros. Mapea la tabla <c>pasajero</c> de MySQL.
    /// No se expone en las respuestas de la API: se utilizan DTOs.
    /// <c>id_usuario</c> es opcional: el pasajero puede existir sin cuenta de acceso.
    /// </summary>
    [Table("pasajero")]
    public class Pasajero
    {
        [Key]
        [Column("id_pasajero")]
        public int IdPasajero { get; set; }

        [Column("id_empresa")]
        public int IdEmpresa { get; set; }

        [Column("id_usuario")]
        public int? IdUsuario { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [MaxLength(12)]
        [Column("rut")]
        public string Rut { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("telefono")]
        public string Telefono { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("direccion")]
        public string Direccion { get; set; } = string.Empty;

        [Required]
        [Column("estado")]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;

        [ForeignKey(nameof(IdEmpresa))]
        public EmpresaCliente Empresa { get; set; } = null!;

        [ForeignKey(nameof(IdUsuario))]
        public Usuario? Usuario { get; set; }
    }
}
