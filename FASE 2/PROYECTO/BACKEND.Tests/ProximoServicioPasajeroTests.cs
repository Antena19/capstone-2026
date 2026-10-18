using BACKEND.Modelos;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Tiempo;
using BACKEND.Tests.Soporte;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BACKEND.Tests;

public sealed class ProximoServicioPasajeroTests : IDisposable
{
    private readonly BasePruebasServicio _base = new();

    [Fact]
    public async Task Elige_el_programado_de_hoy_antes_que_el_de_manana_con_hora_de_chile()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroAsync(contexto);
        var hoy = await CrearProgramadoAsync(contexto, new DateOnly(2026, 10, 18), new TimeOnly(12, 30), new TimeOnly(13, 30));
        await CrearProgramadoAsync(contexto, new DateOnly(2026, 10, 19), new TimeOnly(8, 0), new TimeOnly(9, 0));

        var ahoraChile = new DateTime(2026, 10, 18, 12, 20, 0);
        var operacion = CrearOperacion(contexto, RelojChile.AUtc(ahoraChile));

        var proximo = await operacion.ObtenerProximoAsync(idUsuario);

        Assert.NotNull(proximo);
        Assert.Equal(hoy, proximo.IdServicio);
        Assert.Equal(EstadoServicio.PROGRAMADO, proximo.EstadoServicio);
    }

    [Fact]
    public async Task Un_servicio_en_curso_tiene_prioridad_sobre_el_programado_mas_cercano()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroAsync(contexto);
        await CrearProgramadoAsync(contexto, new DateOnly(2026, 10, 18), new TimeOnly(12, 30), new TimeOnly(13, 30));
        var enCurso = await CrearProgramadoAsync(
            contexto,
            new DateOnly(2026, 10, 18),
            new TimeOnly(15, 0),
            new TimeOnly(16, 0),
            EstadoServicio.EN_CURSO);

        var operacion = CrearOperacion(contexto, RelojChile.AUtc(new DateTime(2026, 10, 18, 12, 20, 0)));

        var proximo = await operacion.ObtenerProximoAsync(idUsuario);

        Assert.NotNull(proximo);
        Assert.Equal(enCurso, proximo.IdServicio);
        Assert.Equal(EstadoServicio.EN_CURSO, proximo.EstadoServicio);
    }

    [Fact]
    public async Task Ignora_cancelados_finalizados_y_asociaciones_inactivas()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroAsync(contexto);
        var cancelado = await CrearProgramadoAsync(
            contexto,
            new DateOnly(2026, 10, 18),
            new TimeOnly(7, 0),
            new TimeOnly(8, 0),
            EstadoServicio.CANCELADO);
        var finalizado = await CrearProgramadoAsync(
            contexto,
            new DateOnly(2026, 10, 18),
            new TimeOnly(9, 0),
            new TimeOnly(10, 0),
            EstadoServicio.FINALIZADO);
        var inactivo = await CrearProgramadoAsync(
            contexto,
            new DateOnly(2026, 10, 18),
            new TimeOnly(11, 0),
            new TimeOnly(12, 0));
        var asociacion = await contexto.PasajerosServicio.SingleAsync(p => p.IdServicio == inactivo);
        asociacion.Estado = EstadoPasajeroServicio.CANCELADO;
        await contexto.SaveChangesAsync();

        var vigente = await CrearProgramadoAsync(
            contexto,
            new DateOnly(2026, 10, 19),
            new TimeOnly(8, 0),
            new TimeOnly(9, 0));

        var operacion = CrearOperacion(contexto, RelojChile.AUtc(new DateTime(2026, 10, 18, 12, 20, 0)));
        var proximo = await operacion.ObtenerProximoAsync(idUsuario);

        Assert.NotNull(proximo);
        Assert.Equal(vigente, proximo.IdServicio);
        Assert.NotEqual(cancelado, proximo.IdServicio);
        Assert.NotEqual(finalizado, proximo.IdServicio);
        Assert.NotEqual(inactivo, proximo.IdServicio);
    }

    public void Dispose() => _base.Dispose();

    private async Task<int> VincularPasajeroAsync(Datos.MySQL.TransporteContext contexto)
    {
        var idRol = await contexto.Usuarios
            .Where(u => u.IdUsuario == _base.IdUsuarioConductor)
            .Select(u => u.IdRol)
            .SingleAsync();
        var usuario = new Usuario
        {
            Email = $"pasajero-{Guid.NewGuid():N}@trayek.test",
            PasswordHash = "hash-de-prueba",
            IdRol = idRol,
            Estado = EstadoRegistro.ACTIVO,
            CuentaActivada = true,
            FechaCreacion = DateTime.UtcNow
        };
        contexto.Usuarios.Add(usuario);
        await contexto.SaveChangesAsync();

        var pasajero = await contexto.Pasajeros.SingleAsync(p => p.IdPasajero == _base.IdPasajero);
        pasajero.IdUsuario = usuario.IdUsuario;
        await contexto.SaveChangesAsync();
        return usuario.IdUsuario;
    }

    private async Task<int> CrearProgramadoAsync(
        Datos.MySQL.TransporteContext contexto,
        DateOnly fecha,
        TimeOnly inicio,
        TimeOnly fin,
        EstadoServicio estado = EstadoServicio.PROGRAMADO)
    {
        var servicio = await _base.CrearServicioAsync(contexto, fecha, inicio, fin, estado);
        servicio.IdRuta = "sin-mongo";
        await contexto.SaveChangesAsync();
        await _base.AgregarPasajeroAsync(contexto, servicio.IdServicio);
        return servicio.IdServicio;
    }

    private static ServicioOperacionPasajero CrearOperacion(Datos.MySQL.TransporteContext contexto, DateTime ahoraUtc)
    {
        return new ServicioOperacionPasajero(
            contexto,
            null!,
            new RelojFijo(ahoraUtc),
            NullLogger<ServicioOperacionPasajero>.Instance);
    }

    private sealed class RelojFijo : IRelojOperacion
    {
        public RelojFijo(DateTime utcAhora) => UtcAhora = DateTime.SpecifyKind(utcAhora, DateTimeKind.Utc);

        public DateTime UtcAhora { get; }
    }
}
