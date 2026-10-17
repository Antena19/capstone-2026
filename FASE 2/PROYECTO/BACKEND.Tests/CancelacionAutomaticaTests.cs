using BACKEND.DTOs.Servicios;
using BACKEND.Modelos;
using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Tiempo;
using BACKEND.Tests.Soporte;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BACKEND.Tests;

public class CancelacionAutomaticaTests
{
    private static readonly DateOnly Fecha = new(2026, 10, 17);
    private static readonly TimeOnly Inicio = new(7, 30);
    private static readonly TimeOnly Fin = new(8, 30);

    [Fact]
    public async Task CancelaCuandoSeCumplenExactamenteDoceHoras()
    {
        using var db = new BasePruebasServicio();
        var vencimiento = VencimientoServicio.EnUtc(Fecha, Fin);
        var id = await PrepararNuevoAsync(db, Fecha, Inicio, Fin);

        await using (var contexto = db.Crear())
        {
            var cancelados = await db.CrearCancelacion(contexto, vencimiento).EjecutarAsync();
            Assert.Equal(1, cancelados);
        }

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.CANCELADO, actual.Estado);
        Assert.Equal(MotivosCancelacionServicio.FaltaDeInicio, actual.MotivoCancelacion);
        Assert.Null(actual.FechaHoraInicioReal);
    }

    [Fact]
    public async Task NoCancelaSiFaltaUnInstanteParaLasDoceHoras()
    {
        using var db = new BasePruebasServicio();
        var vencimiento = VencimientoServicio.EnUtc(Fecha, Fin);
        var id = await PrepararNuevoAsync(db, Fecha, Inicio, Fin);

        await using (var contexto = db.Crear())
        {
            var cancelados = await db.CrearCancelacion(contexto, vencimiento.AddTicks(-1)).EjecutarAsync();
            Assert.Equal(0, cancelados);
        }

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.PROGRAMADO, actual.Estado);
        Assert.Null(actual.MotivoCancelacion);
    }

    [Fact]
    public async Task CancelaCuandoElVencimientoCaeAlDiaSiguiente()
    {
        using var db = new BasePruebasServicio();
        var horaFin = new TimeOnly(16, 0);
        var vencimiento = VencimientoServicio.EnUtc(Fecha, horaFin);
        var id = await PrepararNuevoAsync(db, Fecha, new TimeOnly(15, 0), horaFin);

        await using (var contexto = db.Crear())
        {
            Assert.Equal(1, await db.CrearCancelacion(contexto, vencimiento).EjecutarAsync());
        }

        Assert.Equal(EstadoServicio.CANCELADO, (await LeerAsync(db, id)).Estado);

        using var anterior = new BasePruebasServicio();
        var idAnterior = await PrepararNuevoAsync(anterior, Fecha, new TimeOnly(15, 0), horaFin);
        await using (var contexto = anterior.Crear())
        {
            Assert.Equal(0, await anterior.CrearCancelacion(contexto, vencimiento.AddSeconds(-1)).EjecutarAsync());
        }

        Assert.Equal(EstadoServicio.PROGRAMADO, (await LeerAsync(anterior, idAnterior)).Estado);
    }

    [Fact]
    public async Task NoCancelaSiTieneAsistencia()
    {
        using var db = new BasePruebasServicio();
        var id = await PrepararNuevoAsync(db, Fecha, Inicio, Fin);
        await using (var contexto = db.Crear())
        {
            await db.AgregarAsistenciaAsync(contexto, id);
            Assert.Equal(0, await db.CrearCancelacion(contexto, VencimientoServicio.EnUtc(Fecha, Fin)).EjecutarAsync());
        }

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.PROGRAMADO, actual.Estado);
        Assert.Null(actual.MotivoCancelacion);
    }

    [Fact]
    public async Task NoCancelaSiTieneInicioRealAunqueSigaProgramado()
    {
        using var db = new BasePruebasServicio();
        int id;
        await using (var contexto = db.Crear())
        {
            var servicio = await db.CrearServicioAsync(
                contexto,
                Fecha,
                Inicio,
                Fin,
                inicioReal: DateTime.UtcNow);
            id = servicio.IdServicio;
            await db.FijarCorteAsync(contexto, 0);
            Assert.Equal(0, await db.CrearCancelacion(contexto, VencimientoServicio.EnUtc(Fecha, Fin)).EjecutarAsync());
        }

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.PROGRAMADO, actual.Estado);
        Assert.NotNull(actual.FechaHoraInicioReal);
        Assert.Null(actual.MotivoCancelacion);
    }

    [Fact]
    public async Task NoCancelaEnCursoFinalizadoNiCancelado()
    {
        using var db = new BasePruebasServicio();
        int enCurso;
        int finalizado;
        int cancelado;
        await using (var contexto = db.Crear())
        {
            enCurso = (await db.CrearServicioAsync(
                contexto, Fecha, Inicio, Fin, EstadoServicio.EN_CURSO, DateTime.UtcNow)).IdServicio;
            finalizado = (await db.CrearServicioAsync(
                contexto,
                Fecha,
                Inicio,
                Fin,
                EstadoServicio.FINALIZADO,
                DateTime.UtcNow.AddHours(-2),
                DateTime.UtcNow)).IdServicio;
            cancelado = (await db.CrearServicioAsync(
                contexto, Fecha, Inicio, Fin, EstadoServicio.CANCELADO)).IdServicio;
            await db.FijarCorteAsync(contexto, 0);
            Assert.Equal(0, await db.CrearCancelacion(contexto, DateTime.UtcNow.AddDays(3)).EjecutarAsync());
        }

        Assert.Equal(EstadoServicio.EN_CURSO, (await LeerAsync(db, enCurso)).Estado);
        Assert.Equal(EstadoServicio.FINALIZADO, (await LeerAsync(db, finalizado)).Estado);
        var manual = await LeerAsync(db, cancelado);
        Assert.Equal(EstadoServicio.CANCELADO, manual.Estado);
        Assert.Null(manual.MotivoCancelacion);
    }

    [Fact]
    public async Task ExcluyeLosServiciosConIdMenorOIgualAlCorte()
    {
        using var db = new BasePruebasServicio();
        int historico;
        int nuevo;
        var vencimiento = VencimientoServicio.EnUtc(Fecha, Fin);
        await using (var contexto = db.Crear())
        {
            historico = (await db.CrearServicioAsync(contexto, Fecha, Inicio, Fin)).IdServicio;
            await db.FijarCorteAsync(contexto, historico);
            nuevo = (await db.CrearServicioAsync(contexto, Fecha, Inicio, Fin)).IdServicio;
            Assert.Equal(1, await db.CrearCancelacion(contexto, vencimiento).EjecutarAsync());
        }

        Assert.Equal(EstadoServicio.PROGRAMADO, (await LeerAsync(db, historico)).Estado);
        Assert.Equal(EstadoServicio.CANCELADO, (await LeerAsync(db, nuevo)).Estado);
        Assert.True(nuevo > historico);
    }

    [Fact]
    public async Task SinCortePersistenteNoCancela()
    {
        using var db = new BasePruebasServicio();
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, Fecha, Inicio, Fin)).IdServicio;
            Assert.Equal(0, await db.CrearCancelacion(contexto, VencimientoServicio.EnUtc(Fecha, Fin)).EjecutarAsync());
        }

        Assert.Equal(EstadoServicio.PROGRAMADO, (await LeerAsync(db, id)).Estado);
    }

    [Fact]
    public async Task UnaSegundaPasadaNoVuelveACancelarYConservaHistorial()
    {
        using var db = new BasePruebasServicio();
        var vencimiento = VencimientoServicio.EnUtc(Fecha, Fin);
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, Fecha, Inicio, Fin)).IdServicio;
            await db.FijarCorteAsync(contexto, 0);
            await db.AgregarPasajeroAsync(contexto, id);
            await db.AsignarAsync(contexto, id);
            await db.AgregarQrAsync(contexto, id, EstadoQrServicio.ACTIVO);
            await db.AgregarQrAsync(contexto, id, EstadoQrServicio.EXPIRADO);

            var job = db.CrearCancelacion(contexto, vencimiento);
            Assert.Equal(1, await job.EjecutarAsync());
            Assert.Equal(0, await job.EjecutarAsync());

            var corte = await contexto.ConfiguracionesSistema
                .AsNoTracking()
                .SingleAsync(c => c.Clave == ClavesConfiguracion.CorteCancelacionAutomatica);
            Assert.Equal("0", corte.Valor);
        }

        await using var lectura = db.Crear();
        var servicio = await lectura.Servicios.AsNoTracking().SingleAsync(s => s.IdServicio == id);
        Assert.Equal(EstadoServicio.CANCELADO, servicio.Estado);
        Assert.Equal(MotivosCancelacionServicio.FaltaDeInicio, servicio.MotivoCancelacion);

        var pasajero = await lectura.PasajerosServicio.AsNoTracking().SingleAsync(p => p.IdServicio == id);
        Assert.Equal(EstadoPasajeroServicio.ACTIVO, pasajero.Estado);
        Assert.Equal(EstadoConfirmacionViaje.CONFIRMADO, pasajero.EstadoConfirmacion);

        var asignacion = await lectura.AsignacionesServicio.AsNoTracking().SingleAsync(a => a.IdServicio == id);
        Assert.Equal(EstadoAsignacionServicio.ACTIVA, asignacion.Estado);

        var qrs = await lectura.QrServicios.AsNoTracking().Where(q => q.IdServicio == id).ToListAsync();
        Assert.Equal(2, qrs.Count);
        Assert.DoesNotContain(qrs, q => q.Estado == EstadoQrServicio.ACTIVO);
        Assert.Contains(qrs, q => q.Estado == EstadoQrServicio.INVALIDADO);
        Assert.Contains(qrs, q => q.Estado == EstadoQrServicio.EXPIRADO);
        Assert.Equal(1, await lectura.Servicios.CountAsync());
    }

    [Fact]
    public async Task InicioAdministrativoYCancelacionNoDejanUnEstadoMixto()
    {
        using var db = new BasePruebasServicio();
        int id;
        await using (var preparacion = db.Crear())
        {
            id = (await db.CrearServicioAsync(preparacion, Fecha, Inicio, Fin)).IdServicio;
            await db.FijarCorteAsync(preparacion, 0);
            await db.AsignarAsync(preparacion, id);
            await db.AgregarQrAsync(preparacion, id, EstadoQrServicio.ACTIVO);
        }

        var vencimiento = VencimientoServicio.EnUtc(Fecha, Fin);
        var inicio = Task.Run(async () =>
        {
            await using var contexto = db.Crear();
            try
            {
                await db.CrearOperacion(contexto).CambiarEstadoAsync(
                    id,
                    new CambiarEstadoServicioSolicitudDto { Estado = EstadoServicio.EN_CURSO },
                    1);
                return true;
            }
            catch (ExcepcionNegocio)
            {
                return false;
            }
        });
        var cancelacion = Task.Run(async () =>
        {
            await using var contexto = db.Crear();
            return await db.CrearCancelacion(contexto, vencimiento).EjecutarAsync();
        });

        await Task.WhenAll(inicio, cancelacion);
        var actual = await LeerAsync(db, id);
        AssertEstadoExclusivo(actual);

        await using var qrs = db.Crear();
        var activos = await qrs.QrServicios.CountAsync(q => q.IdServicio == id && q.Estado == EstadoQrServicio.ACTIVO);
        if (actual.Estado == EstadoServicio.CANCELADO)
        {
            Assert.Equal(0, activos);
        }
        else
        {
            Assert.Equal(1, activos);
        }
    }

    [Fact]
    public async Task UnContextoQueYaLeiaProgramadoNoPisaLaCancelacion()
    {
        using var db = new BasePruebasServicio();
        int id;
        await using var lectura = db.Crear();
        var servicio = await db.CrearServicioAsync(lectura, Fecha, Inicio, Fin);
        id = servicio.IdServicio;
        await db.FijarCorteAsync(lectura, 0);
        Assert.Equal(EstadoServicio.PROGRAMADO, servicio.Estado);

        await using (var otro = db.Crear())
        {
            Assert.Equal(1, await db.CrearCancelacion(otro, VencimientoServicio.EnUtc(Fecha, Fin)).EjecutarAsync());
        }

        await using var transaccion = await lectura.Database.BeginTransactionAsync();
        var reclamado = await ReclamoTransicionServicio.ReclamarInicioAsync(lectura, id, DateTime.UtcNow);
        Assert.False(reclamado);
        await transaccion.RollbackAsync();

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.CANCELADO, actual.Estado);
        Assert.Null(actual.FechaHoraInicioReal);
        Assert.Equal(MotivosCancelacionServicio.FaltaDeInicio, actual.MotivoCancelacion);
    }

    [Fact]
    public async Task ElConductorNoReiniciaUnServicioCanceladoPorFaltaDeInicio()
    {
        using var db = new BasePruebasServicio();
        var horario = BasePruebasServicio.HorarioIniciableAhora();
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, horario.Fecha, horario.HoraInicio, horario.HoraFin)).IdServicio;
            await db.FijarCorteAsync(contexto, 0);
            await db.AsignarAsync(contexto, id);
            Assert.Equal(
                1,
                await db.CrearCancelacion(contexto, VencimientoServicio.EnUtc(horario.Fecha, horario.HoraFin)).EjecutarAsync());
        }

        await using (var contexto = db.Crear())
        {
            var operacion = db.CrearOperacion(contexto);
            await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
                operacion.IniciarComoConductorAsync(id, db.IdUsuarioConductor));
        }

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.CANCELADO, actual.Estado);
        Assert.Null(actual.FechaHoraInicioReal);
        Assert.Equal(MotivosCancelacionServicio.FaltaDeInicio, actual.MotivoCancelacion);
    }

    [Fact]
    public async Task UnServicioIniciadoPorElConductorNoSeCancelaDespues()
    {
        using var db = new BasePruebasServicio();
        var horario = BasePruebasServicio.HorarioIniciableAhora();
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, horario.Fecha, horario.HoraInicio, horario.HoraFin)).IdServicio;
            await db.FijarCorteAsync(contexto, 0);
            await db.AsignarAsync(contexto, id);
            await db.CrearOperacion(contexto).IniciarComoConductorAsync(id, db.IdUsuarioConductor);
            Assert.Equal(0, await db.CrearCancelacion(contexto, DateTime.UtcNow.AddDays(2)).EjecutarAsync());
        }

        var actual = await LeerAsync(db, id);
        Assert.Equal(EstadoServicio.EN_CURSO, actual.Estado);
        Assert.NotNull(actual.FechaHoraInicioReal);
        Assert.Null(actual.MotivoCancelacion);
    }

    [Fact]
    public async Task InicioDelConductorYCancelacionNoDejanUnEstadoMixto()
    {
        using var db = new BasePruebasServicio();
        var horario = BasePruebasServicio.HorarioIniciableAhora();
        int id;
        await using (var preparacion = db.Crear())
        {
            id = (await db.CrearServicioAsync(preparacion, horario.Fecha, horario.HoraInicio, horario.HoraFin)).IdServicio;
            await db.FijarCorteAsync(preparacion, 0);
            await db.AsignarAsync(preparacion, id);
        }

        var vencimiento = VencimientoServicio.EnUtc(horario.Fecha, horario.HoraFin);
        var inicio = Task.Run(async () =>
        {
            await using var contexto = db.Crear();
            try
            {
                await db.CrearOperacion(contexto).IniciarComoConductorAsync(id, db.IdUsuarioConductor);
                return true;
            }
            catch (ExcepcionNegocio)
            {
                return false;
            }
        });
        var cancelacion = Task.Run(async () =>
        {
            await using var contexto = db.Crear();
            return await db.CrearCancelacion(contexto, vencimiento).EjecutarAsync();
        });

        await Task.WhenAll(inicio, cancelacion);
        AssertEstadoExclusivo(await LeerAsync(db, id));
    }

    [Fact]
    public async Task ElProcesoAlArrancarCancelaElServicioVencido()
    {
        using var db = new BasePruebasServicio();
        var vencimiento = VencimientoServicio.EnUtc(Fecha, Fin);
        int id;
        await using (var contexto = db.Crear())
        {
            id = (await db.CrearServicioAsync(contexto, Fecha, Inicio, Fin)).IdServicio;
            await db.FijarCorteAsync(contexto, 0);
        }

        var servicios = new ServiceCollection();
        servicios.AddLogging();
        servicios.AddDbContext<BACKEND.Datos.MySQL.TransporteContext>(opciones =>
            opciones.UseSqlite($"Data Source={db.Ruta};Default Timeout=5"));
        servicios.AddScoped<IServicioQr, ServicioQr>();
        servicios.AddScoped<IServicioCancelacionAutomatica, ServicioCancelacionAutomatica>();
        servicios.AddSingleton<IRelojOperacion>(new RelojDePrueba(vencimiento));
        servicios.Configure<CancelacionAutomaticaOpciones>(opciones => opciones.IntervaloMinutos = 60);
        servicios.AddHostedService<CancelacionServiciosNoIniciadosWorker>();

        await using var proveedor = servicios.BuildServiceProvider();
        var worker = proveedor.GetServices<IHostedService>().OfType<CancelacionServiciosNoIniciadosWorker>().Single();
        await worker.StartAsync(CancellationToken.None);

        var limite = DateTime.UtcNow.AddSeconds(8);
        Servicio actual;
        do
        {
            actual = await LeerAsync(db, id);
            if (actual.Estado == EstadoServicio.CANCELADO)
            {
                break;
            }

            await Task.Delay(50);
        }
        while (DateTime.UtcNow < limite);

        await worker.StopAsync(CancellationToken.None);

        Assert.Equal(EstadoServicio.CANCELADO, actual.Estado);
        Assert.Equal(MotivosCancelacionServicio.FaltaDeInicio, actual.MotivoCancelacion);
    }

    private static async Task<int> PrepararNuevoAsync(
        BasePruebasServicio db,
        DateOnly fecha,
        TimeOnly horaInicio,
        TimeOnly horaFin)
    {
        await using var contexto = db.Crear();
        var servicio = await db.CrearServicioAsync(contexto, fecha, horaInicio, horaFin);
        await db.FijarCorteAsync(contexto, 0);
        return servicio.IdServicio;
    }

    private static async Task<Servicio> LeerAsync(BasePruebasServicio db, int idServicio)
    {
        await using var contexto = db.Crear();
        return await contexto.Servicios.AsNoTracking().SingleAsync(s => s.IdServicio == idServicio);
    }

    private static void AssertEstadoExclusivo(Servicio actual)
    {
        var canceladoLimpio = actual.Estado == EstadoServicio.CANCELADO
            && actual.FechaHoraInicioReal is null
            && actual.MotivoCancelacion == MotivosCancelacionServicio.FaltaDeInicio;
        var iniciadoLimpio = actual.Estado == EstadoServicio.EN_CURSO
            && actual.FechaHoraInicioReal is not null
            && actual.MotivoCancelacion is null;

        Assert.True(canceladoLimpio || iniciadoLimpio);
    }

    private sealed class RelojDePrueba : IRelojOperacion
    {
        public RelojDePrueba(DateTime utcAhora) => UtcAhora = VencimientoServicio.NormalizarUtc(utcAhora);

        public DateTime UtcAhora { get; }
    }
}
