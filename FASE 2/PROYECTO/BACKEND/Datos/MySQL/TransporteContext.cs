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

        public DbSet<EmpresaCliente> EmpresasCliente => Set<EmpresaCliente>();

        public DbSet<Pasajero> Pasajeros => Set<Pasajero>();

        public DbSet<Conductor> Conductores => Set<Conductor>();

        public DbSet<Vehiculo> Vehiculos => Set<Vehiculo>();

        public DbSet<Planificacion> Planificaciones => Set<Planificacion>();

        public DbSet<Servicio> Servicios => Set<Servicio>();

        public DbSet<AsignacionServicio> AsignacionesServicio => Set<AsignacionServicio>();

        public DbSet<HistorialAsignacion> HistorialesAsignacion => Set<HistorialAsignacion>();

        public DbSet<PasajeroServicio> PasajerosServicio => Set<PasajeroServicio>();

        public DbSet<QrServicio> QrServicios => Set<QrServicio>();

        public DbSet<Asistencia> Asistencias => Set<Asistencia>();

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

            modelBuilder.Entity<EmpresaCliente>(entity =>
            {
                entity.ToTable("empresa_cliente");
                entity.HasKey(e => e.IdEmpresa);

                entity.Property(e => e.IdEmpresa)
                    .HasColumnName("id_empresa");

                entity.Property(e => e.Rut)
                    .HasColumnName("rut")
                    .HasMaxLength(12)
                    .IsRequired();

                entity.Property(e => e.RazonSocial)
                    .HasColumnName("razon_social")
                    .HasMaxLength(200)
                    .IsRequired();

                entity.Property(e => e.Direccion)
                    .HasColumnName("direccion")
                    .HasMaxLength(255)
                    .IsRequired();

                entity.Property(e => e.Telefono)
                    .HasColumnName("telefono")
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.EmailContacto)
                    .HasColumnName("email_contacto")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(e => e.NombreContacto)
                    .HasColumnName("nombre_contacto")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.Rut)
                    .IsUnique()
                    .HasDatabaseName("uk_empresa_cliente_rut");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_empresa_cliente_estado");

                entity.HasIndex(e => e.RazonSocial)
                    .HasDatabaseName("ix_empresa_cliente_razon_social");
            });

            modelBuilder.Entity<Pasajero>(entity =>
            {
                entity.ToTable("pasajero");
                entity.HasKey(e => e.IdPasajero);

                entity.Property(e => e.IdPasajero)
                    .HasColumnName("id_pasajero");

                entity.Property(e => e.IdEmpresa)
                    .HasColumnName("id_empresa")
                    .IsRequired();

                entity.Property(e => e.IdUsuario)
                    .HasColumnName("id_usuario");

                entity.Property(e => e.Nombre)
                    .HasColumnName("nombre")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(e => e.Rut)
                    .HasColumnName("rut")
                    .HasMaxLength(12)
                    .IsRequired();

                entity.Property(e => e.Telefono)
                    .HasColumnName("telefono")
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.Direccion)
                    .HasColumnName("direccion")
                    .HasMaxLength(255)
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.Rut)
                    .IsUnique()
                    .HasDatabaseName("uk_pasajero_rut");

                entity.HasIndex(e => e.IdUsuario)
                    .IsUnique()
                    .HasDatabaseName("uk_pasajero_id_usuario");

                entity.HasIndex(e => e.IdEmpresa)
                    .HasDatabaseName("ix_pasajero_id_empresa");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_pasajero_estado");

                entity.HasOne(e => e.Empresa)
                    .WithMany()
                    .HasForeignKey(e => e.IdEmpresa)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_pasajero_empresa_cliente");

                entity.HasOne(e => e.Usuario)
                    .WithMany()
                    .HasForeignKey(e => e.IdUsuario)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_pasajero_usuario");
            });

            modelBuilder.Entity<Conductor>(entity =>
            {
                entity.ToTable("conductor");
                entity.HasKey(e => e.IdConductor);

                entity.Property(e => e.IdConductor)
                    .HasColumnName("id_conductor");

                entity.Property(e => e.IdUsuario)
                    .HasColumnName("id_usuario")
                    .IsRequired();

                entity.Property(e => e.Nombre)
                    .HasColumnName("nombre")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(e => e.Rut)
                    .HasColumnName("rut")
                    .HasMaxLength(12)
                    .IsRequired();

                entity.Property(e => e.Telefono)
                    .HasColumnName("telefono")
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.Rut)
                    .IsUnique()
                    .HasDatabaseName("uk_conductor_rut");

                entity.HasIndex(e => e.IdUsuario)
                    .IsUnique()
                    .HasDatabaseName("uk_conductor_id_usuario");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_conductor_estado");

                entity.HasOne(e => e.Usuario)
                    .WithMany()
                    .HasForeignKey(e => e.IdUsuario)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_conductor_usuario");
            });

            modelBuilder.Entity<Vehiculo>(entity =>
            {
                entity.ToTable("vehiculo", tabla =>
                {
                    tabla.HasCheckConstraint("ck_vehiculo_capacidad", "capacidad > 0");
                });
                entity.HasKey(e => e.IdVehiculo);

                entity.Property(e => e.IdVehiculo)
                    .HasColumnName("id_vehiculo");

                entity.Property(e => e.Patente)
                    .HasColumnName("patente")
                    .HasMaxLength(10)
                    .IsRequired();

                entity.Property(e => e.Tipo)
                    .HasColumnName("tipo")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.Marca)
                    .HasColumnName("marca")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.Modelo)
                    .HasColumnName("modelo")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.Capacidad)
                    .HasColumnName("capacidad")
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.Patente)
                    .IsUnique()
                    .HasDatabaseName("uk_vehiculo_patente");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_vehiculo_estado");
            });

            modelBuilder.Entity<Planificacion>(entity =>
            {
                entity.ToTable("planificacion", tabla =>
                {
                    tabla.HasCheckConstraint("ck_planificacion_periodo", "periodo REGEXP '^[0-9]{4}-[0-9]{2}$'");
                });
                entity.HasKey(e => e.IdPlanificacion);

                entity.Property(e => e.IdPlanificacion)
                    .HasColumnName("id_planificacion");

                entity.Property(e => e.IdEmpresa)
                    .HasColumnName("id_empresa")
                    .IsRequired();

                entity.Property(e => e.Periodo)
                    .HasColumnName("periodo")
                    .HasMaxLength(7)
                    .IsFixedLength()
                    .IsRequired();

                entity.Property(e => e.FechaCreacion)
                    .HasColumnName("fecha_creacion")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP")
                    .IsRequired();

                entity.Property(e => e.IdUsuarioCreador)
                    .HasColumnName("id_usuario_creador")
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.IdEmpresa)
                    .HasDatabaseName("ix_planificacion_id_empresa");

                entity.HasIndex(e => e.IdUsuarioCreador)
                    .HasDatabaseName("ix_planificacion_id_usuario_creador");

                entity.HasIndex(e => e.Periodo)
                    .HasDatabaseName("ix_planificacion_periodo");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_planificacion_estado");

                entity.HasOne(e => e.Empresa)
                    .WithMany()
                    .HasForeignKey(e => e.IdEmpresa)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_planificacion_empresa_cliente");

                entity.HasOne(e => e.UsuarioCreador)
                    .WithMany()
                    .HasForeignKey(e => e.IdUsuarioCreador)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_planificacion_usuario_creador");
            });

            modelBuilder.Entity<Servicio>(entity =>
            {
                entity.ToTable("servicio");
                entity.HasKey(e => e.IdServicio);

                entity.Property(e => e.IdServicio)
                    .HasColumnName("id_servicio");

                entity.Property(e => e.IdEmpresa)
                    .HasColumnName("id_empresa")
                    .IsRequired();

                entity.Property(e => e.IdPlanificacion)
                    .HasColumnName("id_planificacion")
                    .IsRequired();

                entity.Property(e => e.IdRuta)
                    .HasColumnName("id_ruta")
                    .HasMaxLength(24);

                entity.Property(e => e.Fecha)
                    .HasColumnName("fecha")
                    .HasColumnType("date")
                    .IsRequired();

                entity.Property(e => e.HoraInicio)
                    .HasColumnName("hora_inicio")
                    .HasColumnType("time")
                    .IsRequired();

                entity.Property(e => e.HoraFin)
                    .HasColumnName("hora_fin")
                    .HasColumnType("time")
                    .IsRequired();

                entity.Property(e => e.FechaHoraInicioReal)
                    .HasColumnName("fecha_hora_inicio_real");

                entity.Property(e => e.FechaHoraFinReal)
                    .HasColumnName("fecha_hora_fin_real");

                entity.Property(e => e.TipoServicio)
                    .HasColumnName("tipo_servicio")
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.IdEmpresa)
                    .HasDatabaseName("ix_servicio_id_empresa");

                entity.HasIndex(e => e.IdPlanificacion)
                    .HasDatabaseName("ix_servicio_id_planificacion");

                entity.HasIndex(e => e.IdRuta)
                    .HasDatabaseName("ix_servicio_id_ruta");

                entity.HasIndex(e => e.Fecha)
                    .HasDatabaseName("ix_servicio_fecha");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_servicio_estado");

                entity.HasIndex(e => new { e.IdEmpresa, e.Fecha })
                    .HasDatabaseName("ix_servicio_empresa_fecha");

                entity.HasOne(e => e.Empresa)
                    .WithMany()
                    .HasForeignKey(e => e.IdEmpresa)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_servicio_empresa_cliente");

                entity.HasOne(e => e.Planificacion)
                    .WithMany()
                    .HasForeignKey(e => e.IdPlanificacion)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_servicio_planificacion");
            });

            modelBuilder.Entity<AsignacionServicio>(entity =>
            {
                entity.ToTable("asignacion_servicio");
                entity.HasKey(e => e.IdAsignacion);

                entity.Property(e => e.IdAsignacion)
                    .HasColumnName("id_asignacion");

                entity.Property(e => e.IdServicio)
                    .HasColumnName("id_servicio")
                    .IsRequired();

                entity.Property(e => e.IdConductor)
                    .HasColumnName("id_conductor")
                    .IsRequired();

                entity.Property(e => e.IdVehiculo)
                    .HasColumnName("id_vehiculo")
                    .IsRequired();

                entity.Property(e => e.FechaAsignacion)
                    .HasColumnName("fecha_asignacion")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP")
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.IdServicio)
                    .HasDatabaseName("ix_asignacion_servicio_id_servicio");

                entity.HasIndex(e => e.IdConductor)
                    .HasDatabaseName("ix_asignacion_servicio_id_conductor");

                entity.HasIndex(e => e.IdVehiculo)
                    .HasDatabaseName("ix_asignacion_servicio_id_vehiculo");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_asignacion_servicio_estado");

                entity.HasOne(e => e.Servicio)
                    .WithMany()
                    .HasForeignKey(e => e.IdServicio)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_asignacion_servicio_servicio");

                entity.HasOne(e => e.Conductor)
                    .WithMany()
                    .HasForeignKey(e => e.IdConductor)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_asignacion_servicio_conductor");

                entity.HasOne(e => e.Vehiculo)
                    .WithMany()
                    .HasForeignKey(e => e.IdVehiculo)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_asignacion_servicio_vehiculo");
            });

            modelBuilder.Entity<HistorialAsignacion>(entity =>
            {
                entity.ToTable("historial_asignacion");
                entity.HasKey(e => e.IdHistorial);

                entity.Property(e => e.IdHistorial)
                    .HasColumnName("id_historial");

                entity.Property(e => e.IdServicio)
                    .HasColumnName("id_servicio")
                    .IsRequired();

                entity.Property(e => e.IdConductorAnterior)
                    .HasColumnName("conductor_anterior");

                entity.Property(e => e.IdConductorNuevo)
                    .HasColumnName("conductor_nuevo")
                    .IsRequired();

                entity.Property(e => e.IdVehiculoAnterior)
                    .HasColumnName("vehiculo_anterior");

                entity.Property(e => e.IdVehiculoNuevo)
                    .HasColumnName("vehiculo_nuevo")
                    .IsRequired();

                entity.Property(e => e.FechaHora)
                    .HasColumnName("fecha_hora")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP")
                    .IsRequired();

                entity.HasIndex(e => e.IdServicio)
                    .HasDatabaseName("ix_historial_asignacion_id_servicio");

                entity.HasIndex(e => e.IdConductorAnterior)
                    .HasDatabaseName("ix_historial_asignacion_conductor_anterior");

                entity.HasIndex(e => e.IdConductorNuevo)
                    .HasDatabaseName("ix_historial_asignacion_conductor_nuevo");

                entity.HasIndex(e => e.IdVehiculoAnterior)
                    .HasDatabaseName("ix_historial_asignacion_vehiculo_anterior");

                entity.HasIndex(e => e.IdVehiculoNuevo)
                    .HasDatabaseName("ix_historial_asignacion_vehiculo_nuevo");

                entity.HasIndex(e => e.FechaHora)
                    .HasDatabaseName("ix_historial_asignacion_fecha_hora");

                entity.HasOne(e => e.Servicio)
                    .WithMany()
                    .HasForeignKey(e => e.IdServicio)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_historial_asignacion_servicio");

                entity.HasOne(e => e.ConductorAnterior)
                    .WithMany()
                    .HasForeignKey(e => e.IdConductorAnterior)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_historial_asignacion_conductor_anterior");

                entity.HasOne(e => e.ConductorNuevo)
                    .WithMany()
                    .HasForeignKey(e => e.IdConductorNuevo)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_historial_asignacion_conductor_nuevo");

                entity.HasOne(e => e.VehiculoAnterior)
                    .WithMany()
                    .HasForeignKey(e => e.IdVehiculoAnterior)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_historial_asignacion_vehiculo_anterior");

                entity.HasOne(e => e.VehiculoNuevo)
                    .WithMany()
                    .HasForeignKey(e => e.IdVehiculoNuevo)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_historial_asignacion_vehiculo_nuevo");
            });

            modelBuilder.Entity<PasajeroServicio>(entity =>
            {
                entity.ToTable("pasajero_servicio");
                entity.HasKey(e => e.IdPasajeroServicio);

                entity.Property(e => e.IdPasajeroServicio)
                    .HasColumnName("id_pasajero_servicio");

                entity.Property(e => e.IdServicio)
                    .HasColumnName("id_servicio")
                    .IsRequired();

                entity.Property(e => e.IdPasajero)
                    .HasColumnName("id_pasajero")
                    .IsRequired();

                entity.Property(e => e.IdPuntoRecogida)
                    .HasColumnName("id_punto_recogida")
                    .HasMaxLength(50);

                entity.Property(e => e.EstadoConfirmacion)
                    .HasColumnName("estado_confirmacion")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.FechaConfirmacion)
                    .HasColumnName("fecha_confirmacion");

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => new { e.IdServicio, e.IdPasajero })
                    .IsUnique()
                    .HasDatabaseName("uk_pasajero_servicio");

                entity.HasIndex(e => e.IdPasajero)
                    .HasDatabaseName("ix_pasajero_servicio_id_pasajero");

                entity.HasIndex(e => e.EstadoConfirmacion)
                    .HasDatabaseName("ix_pasajero_servicio_estado_confirmacion");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_pasajero_servicio_estado");

                entity.HasOne(e => e.Servicio)
                    .WithMany()
                    .HasForeignKey(e => e.IdServicio)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_pasajero_servicio_servicio");

                entity.HasOne(e => e.Pasajero)
                    .WithMany()
                    .HasForeignKey(e => e.IdPasajero)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_pasajero_servicio_pasajero");
            });

            modelBuilder.Entity<QrServicio>(entity =>
            {
                entity.ToTable("qr_servicio");
                entity.HasKey(e => e.IdQr);

                entity.Property(e => e.IdQr)
                    .HasColumnName("id_qr");

                entity.Property(e => e.IdServicio)
                    .HasColumnName("id_servicio")
                    .IsRequired();

                entity.Property(e => e.Token)
                    .HasColumnName("token")
                    .HasMaxLength(128)
                    .IsRequired();

                entity.Property(e => e.FechaGeneracion)
                    .HasColumnName("fecha_generacion")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP")
                    .IsRequired();

                entity.Property(e => e.FechaExpiracion)
                    .HasColumnName("fecha_expiracion")
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => e.Token)
                    .IsUnique()
                    .HasDatabaseName("uk_qr_servicio_token");

                entity.HasIndex(e => e.IdServicio)
                    .HasDatabaseName("ix_qr_servicio_id_servicio");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_qr_servicio_estado");

                entity.HasIndex(e => e.FechaExpiracion)
                    .HasDatabaseName("ix_qr_servicio_fecha_expiracion");

                entity.HasOne(e => e.Servicio)
                    .WithMany()
                    .HasForeignKey(e => e.IdServicio)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_qr_servicio_servicio");
            });

            modelBuilder.Entity<Asistencia>(entity =>
            {
                entity.ToTable("asistencia");
                entity.HasKey(e => e.IdAsistencia);

                entity.Property(e => e.IdAsistencia)
                    .HasColumnName("id_asistencia");

                entity.Property(e => e.IdServicio)
                    .HasColumnName("id_servicio")
                    .IsRequired();

                entity.Property(e => e.IdPasajero)
                    .HasColumnName("id_pasajero")
                    .IsRequired();

                entity.Property(e => e.FechaHora)
                    .HasColumnName("fecha_hora")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP")
                    .IsRequired();

                entity.Property(e => e.Metodo)
                    .HasColumnName("metodo")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.TipoAsistencia)
                    .HasColumnName("tipo_asistencia")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.ExcedeCapacidad)
                    .HasColumnName("excede_capacidad")
                    .IsRequired();

                entity.Property(e => e.Estado)
                    .HasColumnName("estado")
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.HasIndex(e => new { e.IdServicio, e.IdPasajero })
                    .IsUnique()
                    .HasDatabaseName("uk_asistencia_servicio_pasajero");

                entity.HasIndex(e => e.IdPasajero)
                    .HasDatabaseName("ix_asistencia_id_pasajero");

                entity.HasIndex(e => e.FechaHora)
                    .HasDatabaseName("ix_asistencia_fecha_hora");

                entity.HasIndex(e => e.Estado)
                    .HasDatabaseName("ix_asistencia_estado");

                entity.HasOne(e => e.Servicio)
                    .WithMany()
                    .HasForeignKey(e => e.IdServicio)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_asistencia_servicio");

                entity.HasOne(e => e.Pasajero)
                    .WithMany()
                    .HasForeignKey(e => e.IdPasajero)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("fk_asistencia_pasajero");
            });
        }
    }
}
