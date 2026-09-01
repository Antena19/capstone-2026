using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Entidad del maestro de roles. Mapea la tabla <c>rol</c> de MySQL.
    /// Los nombres esperados por el sistema son ADMINISTRADOR, CONDUCTOR y PASAJERO.
    /// </summary>
    [Table("rol")]
    public class Rol
    {
        [Key]
        [Column("id_rol")]
        public int IdRol { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [Column("estado")]
        public EstadoRegistro Estado { get; set; } = EstadoRegistro.ACTIVO;

        public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    }
}
