using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Tiempo;
using BACKEND.Tests.Soporte;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Tests;

/// <summary>
/// La ventana de inicio del conductor es [inicio − 30 min, inicio + 30 min],
/// aunque cruce la medianoche. El reloj de las pruebas es America/Santiago.
/// </summary>
public class InicioMedianocheConductorTests
{
    private const string MensajeVentana =
        "El servicio solo puede iniciarse entre 30 minutos antes y 30 minutos después de la hora de inicio programada.";

    private static readonly DateOnly Nueve = new(2026, 11, 9);
    private static readonly DateOnly Diez = new(2026, 11, 10);
    private static readonly DateOnly Doce = new(2026, 11, 12);

    [Fact]
    public Task PermiteIniciarALas2340UnServicioDeLas0010()
    {
        return AssertPermiteAsync(Diez, new TimeOnly(0, 10), new TimeOnly(1, 0), new DateTime(2026, 11, 9, 23, 40, 0));
    }

    [Fact]
    public Task PermiteIniciarALas0005UnServicioDeLas2340()
    {
        return AssertPermiteAsync(Nueve, new TimeOnly(23, 40), new TimeOnly(23, 59), new DateTime(2026, 11, 10, 0, 5, 0));
    }

    [Fact]
    public Task RechazaIniciarALas2339UnServicioDeLas0010()
    {
        return AssertRechazaVentanaAsync(Diez, new TimeOnly(0, 10), new TimeOnly(1, 0), new DateTime(2026, 11, 9, 23, 39, 0));
    }

    [Fact]
    public Task RechazaIniciarALas0011UnServicioDeLas2340()
    {
        return AssertRechazaVentanaAsync(Nueve, new TimeOnly(23, 40), new TimeOnly(23, 59), new DateTime(2026, 11, 10, 0, 11, 0));
    }

    [Fact]
    public Task PermiteIniciarALas1130UnServicioDeLas1200()
    {
        return AssertPermiteAsync(Nueve, new TimeOnly(12, 0), new TimeOnly(13, 0), new DateTime(2026, 11, 9, 11, 30, 0));
    }

    [Fact]
    public Task PermiteIniciarALas1230UnServicioDeLas1200()
    {
        return AssertPermiteAsync(Nueve, new TimeOnly(12, 0), new TimeOnly(13, 0), new DateTime(2026, 11, 9, 12, 30, 0));
    }

    [Fact]
    public Task RechazaIniciarALas1129UnServicioDeLas1200()
    {
        return AssertRechazaVentanaAsync(Nueve, new TimeOnly(12, 0), new TimeOnly(13, 0), new DateTime(2026, 11, 9, 11, 29, 0));
    }

    [Fact]
    public Task RechazaIniciarALas1231UnServicioDeLas1200()
    {
        return AssertRechazaVentanaAsync(Nueve, new TimeOnly(12, 0), new TimeOnly(13, 0), new DateTime(2026, 11, 9, 12, 31, 0));
    }

    [Fact]
    public Task RechazaUnServicioDeOtroDiaFueraDeLaVentana()
    {
        return AssertRechazaVentanaAsync(Doce, new TimeOnly(12, 0), new TimeOnly(13, 0), new DateTime(2026, 11, 9, 12, 0, 0));
    }

    [Fact]
    public async Task RechazaElInicioDeUnConductorSinAsignacion()
    {
        using var db = new BasePruebasServicio();
        await using var contexto = db.Crear();
        var id = (await db.CrearServicioAsync(contexto, Nueve, new TimeOnly(12, 0), new TimeOnly(13, 0))).IdServicio;
        await db.AsignarAsync(contexto, id);
        var ajeno = await CrearConductorAjenoAsync(contexto);

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            db.CrearOperacion(contexto, Reloj(new DateTime(2026, 11, 9, 12, 0, 0)))
                .IniciarComoConductorAsync(id, ajeno));

        Assert.Equal("No tiene una asignación activa para este servicio.", error.Message);
        Assert.Equal(403, error.CodigoEstado);
        await AssertSigueProgramadoAsync(db, id);
    }

    [Fact]
    public async Task RechazaIniciarUnServicioQueNoEstaProgramado()
    {
        using var db = new BasePruebasServicio();
        await using var contexto = db.Crear();
        var id = (await db.CrearServicioAsync(
            contexto,
            Nueve,
            new TimeOnly(12, 0),
            new TimeOnly(13, 0),
            EstadoServicio.CANCELADO)).IdServicio;
        await db.AsignarAsync(contexto, id);

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            db.CrearOperacion(contexto, Reloj(new DateTime(2026, 11, 9, 12, 0, 0)))
                .IniciarComoConductorAsync(id, db.IdUsuarioConductor));

        Assert.Equal("No está permitido cambiar el estado de CANCELADO a EN_CURSO.", error.Message);
        await using var lectura = db.Crear();
        var actual = await lectura.Servicios.SingleAsync(s => s.IdServicio == id);
        Assert.Equal(EstadoServicio.CANCELADO, actual.Estado);
        Assert.Null(actual.FechaHoraInicioReal);
    }

    private static async Task AssertPermiteAsync(
        DateOnly fecha,
        TimeOnly inicio,
        TimeOnly fin,
        DateTime ahoraChile)
    {
        using var db = new BasePruebasServicio();
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, fecha, inicio, fin)).IdServicio;
            await db.AsignarAsync(contexto, id);
            var resultado = await db.CrearOperacion(contexto, Reloj(ahoraChile))
                .IniciarComoConductorAsync(id, db.IdUsuarioConductor);
            Assert.Equal(EstadoServicio.EN_CURSO, resultado.Estado);
        }

        await using var lectura = db.Crear();
        var actual = await lectura.Servicios.SingleAsync(s => s.IdServicio == id);
        Assert.Equal(EstadoServicio.EN_CURSO, actual.Estado);
        Assert.NotNull(actual.FechaHoraInicioReal);
    }

    private static async Task AssertRechazaVentanaAsync(
        DateOnly fecha,
        TimeOnly inicio,
        TimeOnly fin,
        DateTime ahoraChile)
    {
        using var db = new BasePruebasServicio();
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, fecha, inicio, fin)).IdServicio;
            await db.AsignarAsync(contexto, id);
            var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
                db.CrearOperacion(contexto, Reloj(ahoraChile))
                    .IniciarComoConductorAsync(id, db.IdUsuarioConductor));
            Assert.Equal(MensajeVentana, error.Message);
        }

        await AssertSigueProgramadoAsync(db, id);
    }

    private static async Task AssertSigueProgramadoAsync(BasePruebasServicio db, int id)
    {
        await using var lectura = db.Crear();
        var actual = await lectura.Servicios.SingleAsync(s => s.IdServicio == id);
        Assert.Equal(EstadoServicio.PROGRAMADO, actual.Estado);
        Assert.Null(actual.FechaHoraInicioReal);
    }

    private static async Task<int> CrearConductorAjenoAsync(Datos.MySQL.TransporteContext contexto)
    {
        var idRol = await contexto.Roles.Select(r => r.IdRol).FirstAsync();
        var usuario = new Usuario
        {
            Email = $"ajeno-{Guid.NewGuid():N}@trayek.test",
            PasswordHash = "hash-de-prueba",
            IdRol = idRol,
            Estado = EstadoRegistro.ACTIVO,
            CuentaActivada = true,
            FechaCreacion = DateTime.UtcNow
        };
        contexto.Usuarios.Add(usuario);
        await contexto.SaveChangesAsync();

        contexto.Conductores.Add(new Conductor
        {
            IdUsuario = usuario.IdUsuario,
            Nombre = "Conductor ajeno",
            Rut = "33333333-3",
            Telefono = "444444444",
            Estado = EstadoRegistro.ACTIVO
        });
        await contexto.SaveChangesAsync();
        return usuario.IdUsuario;
    }

    private static RelojFijo Reloj(DateTime ahoraChile) => new(RelojChile.AUtc(ahoraChile));

    private sealed class RelojFijo : IRelojOperacion
    {
        public RelojFijo(DateTime utcAhora) => UtcAhora = VencimientoServicio.NormalizarUtc(utcAhora);

        public DateTime UtcAhora { get; }
    }
}
