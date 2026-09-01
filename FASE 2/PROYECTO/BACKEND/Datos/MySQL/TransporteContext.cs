using BACKEND.Modelos;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Datos.MySQL
{
    /// <summary>
    /// Contexto de Entity Framework Core para MySQL.
    /// Mapea las tablas existentes; no genera ni aplica migraciones.
    /// </summary>
    public class TransporteContext : DbContext
    {
        public TransporteContext(DbContextOptions<TransporteContext> options)
            : base(options)
        {
        }

        public DbSet<Rol> Roles => Set<Rol>();

        public DbSet<Usuario> Usuarios => Set<Usuario>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Mapeo explícito a la estructura definida en transporte_personal.sql.
            modelBuilder.Entity<Rol>(entity =>
            {
                entity.ToTable("rol");
                entity.HasKey(e => e.IdRol);

                entity.Property(e => e.IdRol)
                    .HasColumnName("id_rol");

                entity.Property(e => e.Nombre)
                    .HasColumnName("nombre")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.Nombre)
                    .IsUnique()
                    .HasDatabaseName("uk_rol_nombre");
            });

            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("usuario");
                entity.HasKey(e => e.IdUsuario);

                entity.Property(e => e.IdUsuario)
                    .HasColumnName("id_usuario");

                entity.Property(e => e.Email)
                    .HasColumnName("email")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(e => e.PasswordHash)
                    .HasColumnName("password_hash")
                    .HasMaxLength(255)
                    .IsRequired();

                entity.Property(e => e.IdRol)
                    .HasColumnName("id_rol")
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.FechaCreacion)
                    .HasColumnName("fecha_creacion")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP")
                    .IsRequired();

                entity.Property(e => e.UltimoAcceso)
                    .HasColumnName("ultimo_acceso");

                entity.HasIndex(e => e.Email)
                    .IsUnique()
                    .HasDatabaseName("uk_usuario_email");

                entity.HasIndex(e => e.IdRol)
                    .HasDatabaseName("ix_usuario_id_rol");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_usuario_estado");

                entity.HasOne(e => e.Rol)
                    .WithMany(r => r.Usuarios)
                    .HasForeignKey(e => e.IdRol)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_usuario_rol");
            });
        }
    }
}
