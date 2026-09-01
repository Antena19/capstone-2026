using Microsoft.EntityFrameworkCore;

namespace BACKEND.Datos.MySQL
{
    public class TransporteContext : DbContext
    {
        public TransporteContext(DbContextOptions<TransporteContext> options)
            : base(options)
        {
        }
    }
}