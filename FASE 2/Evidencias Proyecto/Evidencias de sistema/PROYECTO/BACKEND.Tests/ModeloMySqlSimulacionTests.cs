using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

namespace BACKEND.Tests;

public class ModeloMySqlSimulacionTests
{
    [Fact]
    public void ElModeloSeInicializaConElProveedorMySql()
    {
        var servicios = new ServiceCollection();
        servicios.AddEntityFrameworkMySql();
        using var proveedor = servicios.BuildServiceProvider();
        var opciones = new DbContextOptionsBuilder<TransporteContext>()
            .UseMySql(
                "Server=127.0.0.1;Port=3306;Database=modelo_local;User=ninguno;Password=ninguna",
                new MySqlServerVersion(new Version(8, 0, 36)))
            .UseInternalServiceProvider(proveedor)
            .Options;

        using var contexto = new TransporteContext(opciones);
        var modelo = contexto.Model;

        Assert.Contains(modelo.GetEntityTypes(), tipo => tipo.ClrType == typeof(Servicio));
        var lote = Assert.Single(modelo.GetEntityTypes(), tipo => tipo.ClrType == typeof(SimulacionLote));
        var marca = Assert.Single(modelo.GetEntityTypes(), tipo => tipo.ClrType == typeof(SimulacionServicio));
        Assert.Contains(modelo.GetEntityTypes(), tipo => tipo.ClrType == typeof(SimulacionAsistencia));
        Assert.Equal("char(36)", lote.FindProperty(nameof(SimulacionLote.IdLote))!.GetColumnType());
        Assert.Equal("char(36)", marca.FindProperty(nameof(SimulacionServicio.IdLote))!.GetColumnType());
    }
}
