using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BACKEND.Modelos
{
    /// <summary>
    /// Parámetro persistente de la aplicación. Sobrevive a los reinicios del proceso.
    /// </summary>
    [Table("configuracion_sistema")]
    public class ConfiguracionSistema
    {
        [Key]
        [MaxLength(100)]
        [Column("clave")]
        public string Clave { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("valor")]
        public string Valor { get; set; } = string.Empty;
    }
}
