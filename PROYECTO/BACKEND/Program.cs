using BACKEND.Datos.MySQL;
using Microsoft.EntityFrameworkCore;
using BACKEND.Datos.MongoDB;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

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

builder.Services.AddOpenApi();

var app = builder.Build();



// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();