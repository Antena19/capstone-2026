using System.Text;
using System.Text.Json.Serialization;
using BACKEND.Datos.MySQL;
using BACKEND.Datos.MongoDB;
using BACKEND.DTOs.Comun;
using BACKEND.Modelos;
using BACKEND.Negocio.Bootstrap;
using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Filtros;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Servicios;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<FiltroExcepciones>();
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
})
.ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var mensaje = context.ModelState.Values
            .SelectMany(valor => valor.Errors)
            .Select(error => error.ErrorMessage)
            .FirstOrDefault(texto => !string.IsNullOrWhiteSpace(texto))
            ?? "Los datos enviados no son válidos.";

        return new BadRequestObjectResult(new MensajeRespuestaDto { Mensaje = mensaje });
    };
});

builder.Services.AddScoped<FiltroExcepciones>();

// Configuración de MySQL con Entity Framework Core
var connectionString = builder.Configuration.GetConnectionString("MySQL")
    ?? throw new InvalidOperationException(
        "No se encontró la cadena de conexión 'MySQL'.");

builder.Services.AddDbContext<TransporteContext>(options =>
    options.UseMySql(
        connectionString,
        Microsoft.EntityFrameworkCore.ServerVersion.AutoDetect(connectionString)
    )
);

// Configuración de MongoDB
var mongoConnectionString = builder.Configuration["MongoDB:ConnectionString"]
    ?? throw new InvalidOperationException(
        "No se encontró la cadena de conexión de MongoDB.");

var mongoDatabaseName = builder.Configuration["MongoDB:DatabaseName"]
    ?? throw new InvalidOperationException(
        "No se encontró el nombre de la base de datos MongoDB.");

builder.Services.AddSingleton<IMongoClient>(
    new MongoClient(mongoConnectionString)
);

builder.Services.AddSingleton(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(mongoDatabaseName);
});

builder.Services.AddSingleton(sp =>
{
    var database = sp.GetRequiredService<IMongoDatabase>();
    return database.GetCollection<Ruta>(ColeccionesMongo.Rutas);
});

// Autenticación JWT Bearer. La clave de firma (Jwt:Key) vive en User Secrets,
// con el mismo criterio que las cadenas de MySQL y MongoDB: no se versiona en GitHub.
builder.Services.Configure<JwtOpciones>(builder.Configuration.GetSection(JwtOpciones.Seccion));

var jwtOpciones = builder.Configuration.GetSection(JwtOpciones.Seccion).Get<JwtOpciones>()
    ?? throw new InvalidOperationException("No se encontró la sección de configuración 'Jwt'.");

if (string.IsNullOrWhiteSpace(jwtOpciones.Key) || jwtOpciones.Key.Length < 32)
{
    throw new InvalidOperationException(
        "La clave JWT no está configurada o es demasiado corta. Utilice User Secrets (Jwt:Key) con al menos 32 caracteres.");
}

if (string.IsNullOrWhiteSpace(jwtOpciones.Issuer) || string.IsNullOrWhiteSpace(jwtOpciones.Audience))
{
    throw new InvalidOperationException("Jwt:Issuer y Jwt:Audience son obligatorios.");
}

var claveFirma = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpciones.Key));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveToken = false;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOpciones.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOpciones.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = claveFirma,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = ExtensionesClaims.ClaimRol,
            NameClaimType = ExtensionesClaims.ClaimEmail
        };

        options.Events = new JwtBearerEvents
        {
            // Revoca de inmediato el acceso si el usuario o su rol pasan a INACTIVO.
            OnTokenValidated = async contexto =>
            {
                var idClaim = contexto.Principal?.FindFirst(ExtensionesClaims.ClaimIdUsuario)?.Value;
                if (!int.TryParse(idClaim, out var idUsuario))
                {
                    contexto.Fail("Token inválido.");
                    return;
                }

                var db = contexto.HttpContext.RequestServices.GetRequiredService<TransporteContext>();
                var usuario = await db.Usuarios
                    .Include(u => u.Rol)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.IdUsuario == idUsuario);

                if (usuario is null
                    || usuario.Estado != EstadoRegistro.ACTIVO
                    || usuario.Rol.Estado != EstadoRegistro.ACTIVO)
                {
                    contexto.Fail("Sesión no autorizada.");
                    return;
                }

                var rolToken = contexto.Principal?.FindFirst(ExtensionesClaims.ClaimRol)?.Value;
                if (!string.Equals(rolToken, usuario.Rol.Nombre, StringComparison.Ordinal))
                {
                    contexto.Fail("Sesión no autorizada.");
                }
            },
            OnChallenge = async contexto =>
            {
                contexto.HandleResponse();
                contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
                contexto.Response.ContentType = "application/json";
                await contexto.Response.WriteAsJsonAsync(new MensajeRespuestaDto
                {
                    Mensaje = "No autenticado."
                });
            },
            OnForbidden = async contexto =>
            {
                contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
                contexto.Response.ContentType = "application/json";
                await contexto.Response.WriteAsJsonAsync(new MensajeRespuestaDto
                {
                    Mensaje = "No tiene permisos para realizar esta acción."
                });
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSingleton<IServicioHashPassword, ServicioHashPassword>();
builder.Services.AddSingleton<IServicioJwt, ServicioJwt>();
builder.Services.AddScoped<IServicioAutenticacion, ServicioAutenticacion>();
builder.Services.AddScoped<IServicioUsuarios, ServicioUsuarios>();
builder.Services.AddScoped<IServicioEmpresas, ServicioEmpresas>();
builder.Services.AddScoped<IServicioPasajeros, ServicioPasajeros>();
builder.Services.AddScoped<IServicioConductores, ServicioConductores>();
builder.Services.AddScoped<IServicioVehiculos, ServicioVehiculos>();
builder.Services.AddScoped<IServicioRutas, ServicioRutas>();
builder.Services.AddScoped<IServicioPlanificaciones, ServicioPlanificaciones>();
builder.Services.AddScoped<IServicioServicios, ServicioServicios>();
builder.Services.AddScoped<IServicioAsignaciones, ServicioAsignaciones>();
builder.Services.AddScoped<IServicioPasajerosServicio, ServicioPasajerosServicio>();
builder.Services.AddScoped<IServicioQr, ServicioQr>();
builder.Services.AddScoped<IServicioAsistencias, ServicioAsistencias>();
builder.Services.AddScoped<IServicioOperacionConductor, ServicioOperacionConductor>();
builder.Services.AddScoped<IServicioOperacionPasajero, ServicioOperacionPasajero>();
builder.Services.AddScoped<IServicioMetricasOperacionales, ServicioMetricasOperacionales>();
builder.Services.AddScoped<IServicioDashboard, ServicioDashboard>();
builder.Services.AddScoped<IServicioReportes, ServicioReportes>();
builder.Services.AddScoped<IServicioExportacionExcel, ServicioExportacionExcel>();

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // TEMPORAL: crea el primer ADMINISTRADOR solo en Development y solo si aún no existe.
    await BootstrapAdministradorInicial.EjecutarAsync(app.Services);
}

app.UseHttpsRedirection();

// UseAuthentication debe ir antes de UseAuthorization para que el JWT se evalúe en cada petición.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
