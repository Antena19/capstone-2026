using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Simulacion;
using BACKEND.Negocio.Tiempo;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace BACKEND.Tests;

public class InstantesSimulacionOperacionalTests
{
    [Fact]
    public void ConvierteLaHoraDeChileAUtc()
    {
        var fecha = new DateOnly(2026, 11, 9);
        var horaInicio = new TimeOnly(7, 0);
        var horaFin = new TimeOnly(8, 0);
        const int idServicio = 10;

        var inicio = InstantesSimulacionOperacional.InicioUtc(idServicio, fecha, horaInicio);
        var fin = InstantesSimulacionOperacional.FinUtc(idServicio, fecha, horaInicio, horaFin);
        var paredInicio = RelojChile.AUtc(new DateTime(2026, 11, 9, 7, 0, 0));

        Assert.Equal(paredInicio.AddMinutes(1 + idServicio % 5), inicio);
        Assert.Equal(DateTimeKind.Utc, inicio.Kind);
        Assert.Equal(10, inicio.Hour);
        Assert.True(fin > inicio);
        Assert.Equal(11, fin.Hour);
    }
}

public sealed class ServicioSimulacionOperacionalTests : IDisposable
{
    private static readonly DateOnly Fecha = new(2026, 11, 16);
    private static readonly TimeOnly HoraInicio = new(7, 0);
    private static readonly TimeOnly HoraFin = new(8, 0);
    private static readonly DateTime Ahora = RelojChile.AUtc(new DateTime(2026, 11, 16, 21, 0, 0));

    private readonly string _ruta;
    private readonly DbContextOptions<TransporteContext> _opciones;
    private readonly ILoggerFactory _registros = LoggerFactory.Create(_ => { });
    private readonly int _empresa;
    private readonly int _otraEmpresa;
    private readonly int _plan;
    private readonly int _otroPlan;
    private readonly int _planAjeno;
    private readonly int _conductor;
    private readonly int _vehiculo;
    private readonly int _vehiculoChico;
    private readonly int[] _pasajeros;

    public ServicioSimulacionOperacionalTests()
    {
        _ruta = Path.Combine(Path.GetTempPath(), $"trayek-cierre-{Guid.NewGuid():N}.db");
        _opciones = new DbContextOptionsBuilder<TransporteContext>()
            .UseSqlite($"Data Source={_ruta}")
            .AddInterceptors(new PragmaSqlite())
            .Options;

        using var contexto = Crear();
        contexto.Database.EnsureCreated();
        (_empresa, _otraEmpresa, _plan, _otroPlan, _planAjeno, _conductor, _vehiculo, _vehiculoChico, _pasajeros) =
            Sembrar(contexto);
    }

    [Fact]
    public async Task SinServiciosCandidatosNoCreaLote()
    {
        await using var contexto = Crear();

        var resultado = await EjecutarAsync(contexto, Ahora);

        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(0, resultado.Procesados);
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
        Assert.Empty(await contexto.SimulacionesServicio.ToListAsync());
        Assert.Empty(await contexto.SimulacionesAsistencia.ToListAsync());
    }

    [Fact]
    public async Task UnServicioFuturoNoCreaLote()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(
            contexto,
            _empresa,
            _plan,
            EstadoServicio.PROGRAMADO,
            _vehiculo,
            _pasajeros,
            fecha: Fecha.AddDays(1));

        var resultado = await EjecutarAsync(contexto, Ahora);

        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio)).Estado);
        Assert.Empty(await contexto.Asistencias.ToListAsync());
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
    }

    [Fact]
    public async Task UnProgramadoConHoraRealNoCreaLote()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, _pasajeros);
        var servicio = await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio);
        servicio.FechaHoraInicioReal = Ahora;
        await contexto.SaveChangesAsync();

        var resultado = await EjecutarAsync(contexto, Ahora);

        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.AsNoTracking().SingleAsync()).Estado);
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
    }

    [Fact]
    public async Task CierraConAsistenciasYMarcaLaTrazabilidad()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, _pasajeros);
        contexto.QrServicios.Add(new QrServicio
        {
            IdServicio = idServicio,
            Token = "token-que-debe-conservarse-000000000000000000000000",
            FechaGeneracion = Ahora,
            FechaExpiracion = Ahora.AddHours(2),
            Estado = EstadoQrServicio.ACTIVO
        });
        await contexto.SaveChangesAsync();

        var resultado = await EjecutarAsync(contexto, Ahora);
        contexto.ChangeTracker.Clear();

        var servicio = await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio);
        var asistencias = await contexto.Asistencias.Where(a => a.IdServicio == idServicio).ToListAsync();
        var marca = await contexto.SimulacionesServicio
            .Include(s => s.Asistencias)
            .SingleAsync(s => s.IdServicio == idServicio);
        var lote = await contexto.SimulacionesLote.SingleAsync();
        var esperados = SelectorSimulacionOperacional.Seleccionar(idServicio, _pasajeros);
        var inicio = InstantesSimulacionOperacional.InicioUtc(idServicio, Fecha, HoraInicio);
        var fin = InstantesSimulacionOperacional.FinUtc(idServicio, Fecha, HoraInicio, HoraFin);

        Assert.Equal(1, resultado.Procesados);
        Assert.Equal(EstadoServicio.FINALIZADO, servicio.Estado);
        Assert.Equal(inicio.Ticks, servicio.FechaHoraInicioReal!.Value.Ticks);
        Assert.Equal(fin.Ticks, servicio.FechaHoraFinReal!.Value.Ticks);
        Assert.Null(servicio.MotivoCancelacion);
        Assert.Equal(
            esperados,
            asistencias
                .Select(a => a.IdPasajero)
                .OrderBy(id => SelectorSimulacionOperacional.OrdenEstable(idServicio, id))
                .ThenBy(id => id));
        Assert.All(asistencias, a =>
        {
            Assert.Equal(EstadoAsistencia.VALIDA, a.Estado);
            Assert.Equal(TipoAsistencia.PLANIFICADA, a.TipoAsistencia);
            Assert.Equal(MetodoAsistencia.MANUAL, a.Metodo);
            Assert.False(a.ExcedeCapacidad);
            Assert.InRange(a.FechaHora.Ticks, inicio.Ticks, fin.Ticks);
        });
        Assert.Equal(EstadoMarcaSimulacion.VIGENTE, marca.EstadoMarca);
        Assert.Equal(EstadoServicio.PROGRAMADO, marca.EstadoAnterior);
        Assert.Equal(EstadoServicio.FINALIZADO, marca.EstadoPosterior);
        Assert.Equal(esperados.Count, marca.Asistencias.Count);
        Assert.All(marca.Asistencias, a => Assert.NotNull(a.IdAsistencia));
        Assert.Equal(EstadoLoteSimulacion.COMPLETADO, lote.Estado);
        Assert.Equal(EstadoQrServicio.ACTIVO, (await contexto.QrServicios.SingleAsync()).Estado);
        Assert.Equal(EstadoAsignacionServicio.ACTIVA, (await contexto.AsignacionesServicio.SingleAsync()).Estado);
        Assert.Equal(_pasajeros.Length, await contexto.PasajerosServicio.CountAsync(p => p.IdServicio == idServicio && p.Estado == EstadoPasajeroServicio.ACTIVO));
    }

    [Fact]
    public async Task CierraUnServicioSinPasajeros()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, []);

        var resultado = await EjecutarAsync(contexto, Ahora);
        contexto.ChangeTracker.Clear();

        Assert.NotNull(resultado.IdLote);
        Assert.Equal(ResultadoServicioSimulacion.Procesado, resultado.Servicios.Single().Resultado);
        Assert.Equal(EstadoServicio.FINALIZADO, (await contexto.Servicios.SingleAsync()).Estado);
        Assert.Empty(await contexto.Asistencias.ToListAsync());
        Assert.Empty(await contexto.SimulacionesAsistencia.ToListAsync());
        Assert.Equal(1, await contexto.SimulacionesServicio.CountAsync());
        Assert.Equal(EstadoLoteSimulacion.COMPLETADO, (await contexto.SimulacionesLote.SingleAsync()).Estado);
    }

    [Fact]
    public async Task UnaAsistenciaPreviaNoCreaLote()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, [_pasajeros[0]], conAsistencia: true);

        var resultado = await EjecutarAsync(contexto, Ahora);

        await AssertSinLoteAsync(contexto, resultado);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio)).Estado);
        Assert.Equal(1, await contexto.Asistencias.CountAsync());
    }

    [Fact]
    public async Task SinAsignacionActivaNoCreaLote()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, [_pasajeros[0]]);
        var asignacion = await contexto.AsignacionesServicio.SingleAsync(a => a.IdServicio == idServicio);
        asignacion.Estado = EstadoAsignacionServicio.CANCELADA;
        await contexto.SaveChangesAsync();

        var resultado = await EjecutarAsync(contexto, Ahora);

        await AssertSinLoteAsync(contexto, resultado);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.AsNoTracking().SingleAsync()).Estado);
    }

    [Fact]
    public async Task DosAsignacionesActivasNoCreaLote()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, [_pasajeros[0]]);
        contexto.AsignacionesServicio.Add(new AsignacionServicio
        {
            IdServicio = idServicio,
            IdConductor = _conductor,
            IdVehiculo = _vehiculoChico,
            FechaAsignacion = Ahora,
            Estado = EstadoAsignacionServicio.ACTIVA
        });
        await contexto.SaveChangesAsync();

        var resultado = await EjecutarAsync(contexto, Ahora);

        await AssertSinLoteAsync(contexto, resultado);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.AsNoTracking().SingleAsync()).Estado);
        Assert.Equal(2, await contexto.AsignacionesServicio.CountAsync(a => a.Estado == EstadoAsignacionServicio.ACTIVA));
    }

    [Theory]
    [InlineData(EstadoServicio.FINALIZADO)]
    [InlineData(EstadoServicio.CANCELADO)]
    public async Task UnServicioQueNoEstaProgramadoNoCreaLote(EstadoServicio estado)
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, estado, _vehiculo, [_pasajeros[0]]);

        var resultado = await EjecutarAsync(contexto, Ahora);

        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(estado, (await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio)).Estado);
        Assert.Empty(await contexto.Asistencias.ToListAsync());
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
    }

    [Fact]
    public async Task NoTocaUnServicioDeOtraEmpresa()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _otraEmpresa, _planAjeno, EstadoServicio.PROGRAMADO, _vehiculo, []);

        var resultado = await EjecutarAsync(contexto, Ahora);

        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.SingleAsync()).Estado);
        Assert.Empty(await contexto.SimulacionesServicio.ToListAsync());
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
    }

    [Fact]
    public async Task NoTocaUnServicioDeOtraPlanificacion()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _otroPlan, EstadoServicio.PROGRAMADO, _vehiculo, [_pasajeros[0]]);

        var resultado = await EjecutarAsync(contexto, Ahora);

        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio)).Estado);
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
    }

    [Fact]
    public async Task UnaCapacidadInsuficienteNoCreaLote()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(
            contexto,
            _empresa,
            _plan,
            EstadoServicio.PROGRAMADO,
            _vehiculoChico,
            [_pasajeros[0], _pasajeros[1]]);

        var resultado = await EjecutarAsync(contexto, Ahora);

        await AssertSinLoteAsync(contexto, resultado);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.AsNoTracking().SingleAsync()).Estado);
        Assert.Empty(await contexto.Asistencias.ToListAsync());
    }

    [Fact]
    public async Task UnaSegundaEjecucionNoDuplica()
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, _pasajeros);
        await EjecutarAsync(contexto, Ahora);
        var asistencias = await contexto.Asistencias.CountAsync();

        var segunda = await EjecutarAsync(contexto, Ahora);

        Assert.Null(segunda.IdLote);
        Assert.Empty(segunda.Servicios);
        Assert.Equal(0, segunda.Procesados);
        Assert.Equal(asistencias, await contexto.Asistencias.CountAsync());
        Assert.Equal(1, await contexto.SimulacionesServicio.CountAsync(s => s.IdServicioVigente == idServicio));
        Assert.Equal(1, await contexto.SimulacionesLote.CountAsync(l => l.Estado == EstadoLoteSimulacion.COMPLETADO));
    }

    [Fact]
    public async Task RevierteSiFallaLaInsercionDeAsistencias()
    {
        await AssertRollbackAsync(new SondaFalla { Asistencias = true });
    }

    [Fact]
    public async Task RevierteSiFallaLaActualizacionDelServicio()
    {
        await AssertRollbackAsync(new SondaFalla { Actualizar = true });
    }

    [Fact]
    public async Task RevierteSiFallaLaTrazabilidad()
    {
        await AssertRollbackAsync(new SondaFalla { Trazabilidad = true });
    }

    [Fact]
    public async Task PersisteLasHorasRealesEnUtcDeChile()
    {
        var fecha = new DateOnly(2026, 11, 9);
        var inicio = new TimeOnly(7, 0);
        var fin = new TimeOnly(8, 0);
        var ahora = RelojChile.AUtc(new DateTime(2026, 11, 9, 21, 0, 0));
        Assert.Equal(new DateOnly(2026, 11, 10), DateOnly.FromDateTime(ahora));

        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(
            contexto,
            _empresa,
            _plan,
            EstadoServicio.PROGRAMADO,
            _vehiculo,
            [_pasajeros[0]],
            fecha: fecha,
            horaInicio: inicio,
            horaFin: fin);

        await EjecutarAsync(contexto, ahora);
        contexto.ChangeTracker.Clear();

        var servicio = await contexto.Servicios.SingleAsync();
        var esperadoInicio = InstantesSimulacionOperacional.InicioUtc(idServicio, fecha, inicio);
        var esperadoFin = InstantesSimulacionOperacional.FinUtc(idServicio, fecha, inicio, fin);
        Assert.Equal(esperadoInicio.Ticks, servicio.FechaHoraInicioReal!.Value.Ticks);
        Assert.Equal(esperadoFin.Ticks, servicio.FechaHoraFinReal!.Value.Ticks);
        Assert.Equal(10, esperadoInicio.Hour);
    }

    public void Dispose()
    {
        _registros.Dispose();
        SqliteConnection.ClearAllPools();
        try
        {
            if (File.Exists(_ruta))
            {
                File.Delete(_ruta);
            }
        }
        catch (IOException)
        {
        }
    }

    private async Task AssertRollbackAsync(ISondaSimulacionOperacional sonda)
    {
        await using var contexto = Crear();
        var idServicio = await CrearServicioAsync(contexto, _empresa, _plan, EstadoServicio.PROGRAMADO, _vehiculo, _pasajeros);

        var resultado = await EjecutarAsync(contexto, Ahora, sonda);

        Assert.Equal(ResultadoServicioSimulacion.Fallido, resultado.Servicios.Single().Resultado);
        Assert.Equal(EstadoServicio.PROGRAMADO, (await contexto.Servicios.SingleAsync(s => s.IdServicio == idServicio)).Estado);
        Assert.Null((await contexto.Servicios.SingleAsync()).FechaHoraInicioReal);
        Assert.Empty(await contexto.Asistencias.ToListAsync());
        Assert.Empty(await contexto.SimulacionesServicio.ToListAsync());
        Assert.Equal(EstadoLoteSimulacion.COMPLETADO, (await contexto.SimulacionesLote.SingleAsync()).Estado);
    }

    private static async Task AssertSinLoteAsync(TransporteContext contexto, ResultadoSimulacionOperacional resultado)
    {
        Assert.Null(resultado.IdLote);
        Assert.Empty(resultado.Servicios);
        Assert.Equal(0, resultado.Procesados);
        Assert.Empty(await contexto.SimulacionesLote.ToListAsync());
        Assert.Empty(await contexto.SimulacionesServicio.ToListAsync());
    }

    private Task<ResultadoSimulacionOperacional> EjecutarAsync(
        TransporteContext contexto,
        DateTime ahora,
        ISondaSimulacionOperacional? sonda = null)
    {
        var servicio = new ServicioSimulacionOperacional(
            contexto,
            new RelojFijo(ahora),
            _registros.CreateLogger<ServicioSimulacionOperacional>(),
            sonda);
        return servicio.EjecutarAsync();
    }

    private TransporteContext Crear() => new(_opciones);

    private async Task<int> CrearServicioAsync(
        TransporteContext contexto,
        int idEmpresa,
        int idPlanificacion,
        EstadoServicio estado,
        int idVehiculo,
        IReadOnlyList<int> pasajeros,
        bool conAsistencia = false,
        DateOnly? fecha = null,
        TimeOnly? horaInicio = null,
        TimeOnly? horaFin = null)
    {
        var servicio = new Servicio
        {
            IdEmpresa = idEmpresa,
            IdPlanificacion = idPlanificacion,
            IdRuta = "6a970da8b12295fd44e62f67",
            Fecha = fecha ?? Fecha,
            HoraInicio = horaInicio ?? HoraInicio,
            HoraFin = horaFin ?? HoraFin,
            TipoServicio = "IDA",
            Estado = estado,
            FechaHoraInicioReal = estado == EstadoServicio.FINALIZADO ? Ahora : null,
            FechaHoraFinReal = estado == EstadoServicio.FINALIZADO ? Ahora : null
        };
        contexto.Servicios.Add(servicio);
        await contexto.SaveChangesAsync();

        contexto.AsignacionesServicio.Add(new AsignacionServicio
        {
            IdServicio = servicio.IdServicio,
            IdConductor = _conductor,
            IdVehiculo = idVehiculo,
            FechaAsignacion = Ahora,
            Estado = EstadoAsignacionServicio.ACTIVA
        });

        foreach (var idPasajero in pasajeros)
        {
            contexto.PasajerosServicio.Add(new PasajeroServicio
            {
                IdServicio = servicio.IdServicio,
                IdPasajero = idPasajero,
                EstadoConfirmacion = EstadoConfirmacionViaje.CONFIRMADO,
                Estado = EstadoPasajeroServicio.ACTIVO
            });
        }

        if (conAsistencia)
        {
            contexto.Asistencias.Add(new Asistencia
            {
                IdServicio = servicio.IdServicio,
                IdPasajero = pasajeros[0],
                FechaHora = Ahora,
                Metodo = MetodoAsistencia.QR,
                TipoAsistencia = TipoAsistencia.PLANIFICADA,
                ExcedeCapacidad = false,
                Estado = EstadoAsistencia.VALIDA
            });
        }

        await contexto.SaveChangesAsync();
        return servicio.IdServicio;
    }

    private static (int Empresa, int OtraEmpresa, int Plan, int OtroPlan, int PlanAjeno, int Conductor, int Vehiculo, int VehiculoChico, int[] Pasajeros) Sembrar(
        TransporteContext contexto)
    {
        var rol = new Rol { Nombre = "CONDUCTOR", Estado = EstadoRegistro.ACTIVO };
        contexto.Roles.Add(rol);
        contexto.SaveChanges();

        var usuario = new Usuario
        {
            Email = "conductor-simulacion@trayek.test",
            PasswordHash = "hash-de-prueba",
            IdRol = rol.IdRol,
            Estado = EstadoRegistro.ACTIVO,
            CuentaActivada = true,
            FechaCreacion = DateTime.UtcNow
        };
        contexto.Usuarios.Add(usuario);
        contexto.SaveChanges();

        var empresa = new EmpresaCliente
        {
            Rut = "76123456-7",
            RazonSocial = "Empresa Prueba Capstone Ltda.",
            Direccion = "Direccion",
            Telefono = "111111111",
            EmailContacto = "contacto@empresaprueba.cl",
            NombreContacto = "Contacto",
            Estado = EstadoRegistro.ACTIVO
        };
        var otra = new EmpresaCliente
        {
            Rut = "96714870-9",
            RazonSocial = "Otra empresa",
            Direccion = "Direccion",
            Telefono = "222222222",
            EmailContacto = "otra@trayek.test",
            NombreContacto = "Otro",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.EmpresasCliente.AddRange(empresa, otra);
        contexto.SaveChanges();
        if (empresa.IdEmpresa != SelectorSimulacionOperacional.IdEmpresaDemostracion)
        {
            throw new InvalidOperationException("La empresa de demostración no quedó con id 1.");
        }

        var plan = new Planificacion
        {
            IdPlanificacion = SelectorSimulacionOperacional.IdPlanificacionDemostracion,
            IdEmpresa = empresa.IdEmpresa,
            Periodo = "2026-11",
            FechaCreacion = DateTime.UtcNow,
            IdUsuarioCreador = usuario.IdUsuario,
            Estado = EstadoPlanificacion.ACTIVA
        };
        var otroPlan = new Planificacion
        {
            IdPlanificacion = 11,
            IdEmpresa = empresa.IdEmpresa,
            Periodo = "2026-11",
            FechaCreacion = DateTime.UtcNow,
            IdUsuarioCreador = usuario.IdUsuario,
            Estado = EstadoPlanificacion.ACTIVA
        };
        var planAjeno = new Planificacion
        {
            IdEmpresa = otra.IdEmpresa,
            Periodo = "2026-11",
            FechaCreacion = DateTime.UtcNow,
            IdUsuarioCreador = usuario.IdUsuario,
            Estado = EstadoPlanificacion.ACTIVA
        };
        contexto.Planificaciones.AddRange(plan, otroPlan, planAjeno);
        contexto.SaveChanges();

        var conductor = new Conductor
        {
            IdUsuario = usuario.IdUsuario,
            Nombre = "Conductor prueba",
            Rut = "17654321-8",
            Telefono = "333333333",
            Estado = EstadoRegistro.ACTIVO
        };
        var vehiculo = new Vehiculo
        {
            Patente = "SIMU12",
            Tipo = "Van",
            Marca = "Marca",
            Modelo = "Modelo",
            Capacidad = 12,
            Estado = EstadoRegistro.ACTIVO
        };
        var chico = new Vehiculo
        {
            Patente = "SIMU01",
            Tipo = "Van",
            Marca = "Marca",
            Modelo = "Modelo",
            Capacidad = 1,
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Conductores.Add(conductor);
        contexto.Vehiculos.AddRange(vehiculo, chico);

        var pasajeros = Enumerable.Range(1, 5).Select(n => new Pasajero
        {
            IdEmpresa = empresa.IdEmpresa,
            Nombre = $"Pasajero {n}",
            Rut = $"1500000{n}-K",
            Telefono = $"44444444{n}",
            Direccion = "Direccion",
            Estado = EstadoRegistro.ACTIVO
        }).ToArray();
        contexto.Pasajeros.AddRange(pasajeros);
        contexto.SaveChanges();

        return (
            empresa.IdEmpresa,
            otra.IdEmpresa,
            plan.IdPlanificacion,
            otroPlan.IdPlanificacion,
            planAjeno.IdPlanificacion,
            conductor.IdConductor,
            vehiculo.IdVehiculo,
            chico.IdVehiculo,
            pasajeros.Select(p => p.IdPasajero).ToArray());
    }

    private sealed class RelojFijo : IRelojOperacion
    {
        public RelojFijo(DateTime utcAhora) => UtcAhora = VencimientoServicio.NormalizarUtc(utcAhora);

        public DateTime UtcAhora { get; }
    }

    private sealed class SondaFalla : ISondaSimulacionOperacional
    {
        public bool Asistencias { get; init; }

        public bool Actualizar { get; init; }

        public bool Trazabilidad { get; init; }

        public void AntesDeInsertarAsistencias(int idServicio)
        {
            if (Asistencias)
            {
                throw new InvalidOperationException("falla-asistencias");
            }
        }

        public void AntesDeActualizarServicio(int idServicio)
        {
            if (Actualizar)
            {
                throw new InvalidOperationException("falla-actualizacion");
            }
        }

        public void AntesDeRegistrarTrazabilidad(int idServicio)
        {
            if (Trazabilidad)
            {
                throw new InvalidOperationException("falla-trazabilidad");
            }
        }
    }

    private sealed class PragmaSqlite : DbConnectionInterceptor
    {
        public override void ConnectionOpened(System.Data.Common.DbConnection connection, ConnectionEndEventData eventData)
        {
            using var comando = connection.CreateCommand();
            comando.CommandText = "PRAGMA foreign_keys = ON;";
            comando.ExecuteNonQuery();
        }

        public override Task ConnectionOpenedAsync(
            System.Data.Common.DbConnection connection,
            ConnectionEndEventData eventData,
            CancellationToken cancellationToken = default)
        {
            ConnectionOpened(connection, eventData);
            return Task.CompletedTask;
        }
    }
}
