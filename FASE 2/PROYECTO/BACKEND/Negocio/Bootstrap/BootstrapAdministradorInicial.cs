using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Bootstrap
{
    /// <summary>
    /// BOOTSTRAP TEMPORAL DE DESARROLLO.
    /// Crea el primer usuario ADMINISTRADOR únicamente si aún no existe ninguno.
    /// No es un endpoint, no corre fuera de Development y no registra credenciales.
    /// Debe eliminarse cuando el sistema ya tenga un administrador definitivo.
    /// </summary>
    public static class BootstrapAdministradorInicial
    {
        public const string SeccionConfiguracion = "BootstrapAdmin";

        public static async Task EjecutarAsync(IServiceProvider servicios)
        {
            var entorno = servicios.GetRequiredService<IHostEnvironment>();
            if (!entorno.IsDevelopment())
            {
                return;
            }

            using var alcance = servicios.CreateScope();
            var proveedor = alcance.ServiceProvider;
            var logger = proveedor.GetRequiredService<ILoggerFactory>()
                .CreateLogger("BootstrapAdministradorInicial");
            var contexto = proveedor.GetRequiredService<TransporteContext>();
            var hashPassword = proveedor.GetRequiredService<IServicioHashPassword>();
            var configuracion = proveedor.GetRequiredService<IConfiguration>();

            var yaExisteAdministrador = await contexto.Usuarios
                .AsNoTracking()
                .AnyAsync(u => u.Rol.Nombre == NombresRol.Administrador);

            if (yaExisteAdministrador)
            {
                logger.LogInformation("Bootstrap inicial: ya existe un administrador. No se realizaron cambios.");
                return;
            }

            var rolAdministrador = await contexto.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.Nombre == NombresRol.Administrador
                    && r.Estado == EstadoRegistro.ACTIVO);

            if (rolAdministrador is null)
            {
                throw new InvalidOperationException(
                    "Bootstrap inicial: no existe un rol ADMINISTRADOR activo. Créelo en MySQL antes de continuar.");
            }

            var email = configuracion[$"{SeccionConfiguracion}:Email"];
            var password = configuracion[$"{SeccionConfiguracion}:Password"];

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException(
                    "Bootstrap inicial: configure BootstrapAdmin:Email y BootstrapAdmin:Password en User Secrets.");
            }

            email = email.Trim().ToLowerInvariant();

            if (email.Length > 150 || !email.Contains('@'))
            {
                throw new InvalidOperationException(
                    "Bootstrap inicial: BootstrapAdmin:Email no es un correo válido.");
            }

            if (!ValidadorPassword.CumpleRequisitos(password))
            {
                throw new InvalidOperationException(
                    "Bootstrap inicial: BootstrapAdmin:Password no cumple los requisitos mínimos de contraseña.");
            }

            var emailEnUso = await contexto.Usuarios.AnyAsync(u => u.Email == email);
            if (emailEnUso)
            {
                throw new InvalidOperationException(
                    "Bootstrap inicial: el correo configurado ya está asociado a otra cuenta.");
            }

            var administrador = new Usuario
            {
                Email = email,
                PasswordHash = hashPassword.GenerarHash(password),
                IdRol = rolAdministrador.IdRol,
                Estado = EstadoRegistro.ACTIVO,
                FechaCreacion = DateTime.UtcNow
            };

            contexto.Usuarios.Add(administrador);
            await contexto.SaveChangesAsync();

            logger.LogInformation("Bootstrap inicial: se creó el primer usuario administrador.");
        }
    }
}
