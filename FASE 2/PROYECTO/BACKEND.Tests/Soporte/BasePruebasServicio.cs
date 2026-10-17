using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Tiempo;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace BACKEND.Tests.Soporte;

public sealed class BasePruebasServicio : IDisposable
{
    private readonly string _ruta;
    private readonly DbContextOptions<TransporteContext> _opciones;
    private readonly ILoggerFactory _registros = LoggerFactory.Create(_ => { });

    public BasePruebasServicio()
    {
        _ruta = Path.Combine(Path.GetTempPath(), $"trayek-cancelacion-{Guid.NewGuid():N}.db");
        _opciones = new DbContextOptionsBuilder<TransporteContext>()
            .UseSqlite($"Data Source={_ruta}")
            .AddInterceptors(new PragmaSqlite())
            .Options;

        using var contexto = Crear();
        contexto.Database.EnsureCreated();
        Sembrar(contexto);
    }

    public int IdEmpresa { get; private set; }

    public int IdPlanificacion { get; private set; }

    public int IdPasajero { get; private set; }

    public int IdConductor { get; private set; }

    public int IdUsuarioConductor { get; private set; }

    public int IdVehiculo { get; private set; }

    public string Ruta => _ruta;

    public TransporteContext Crear() => new(_opciones);

    public async Task FijarCorteAsync(TransporteContext contexto, int idServicioCorte)
    {
        var fila = await contexto.ConfiguracionesSistema
            .FirstOrDefaultAsync(c => c.Clave == ClavesConfiguracion.CorteCancelacionAutomatica);

        if (fila is null)
        {
            contexto.ConfiguracionesSistema.Add(new ConfiguracionSistema
            {
                Clave = ClavesConfiguracion.CorteCancelacionAutomatica,
                Valor = idServicioCorte.ToString()
            });
        }
        else
        {
            fila.Valor = idServicioCorte.ToString();
        }

        await contexto.SaveChangesAsync();
    }

    public async Task<Servicio> CrearServicioAsync(
        TransporteContext contexto,
        DateOnly fecha,
        TimeOnly horaInicio,
        TimeOnly horaFin,
        EstadoServicio estado = EstadoServicio.PROGRAMADO,
        DateTime? inicioReal = null,
        DateTime? finReal = null,
        string? motivo = null)
    {
        var servicio = new Servicio
        {
            IdEmpresa = IdEmpresa,
            IdPlanificacion = IdPlanificacion,
            IdRuta = "6a970da8b12295fd44e62f67",
            Fecha = fecha,
            HoraInicio = horaInicio,
            HoraFin = horaFin,
            FechaHoraInicioReal = inicioReal,
            FechaHoraFinReal = finReal,
            TipoServicio = TiposServicio.Ida,
            Estado = estado,
            MotivoCancelacion = motivo
        };
        contexto.Servicios.Add(servicio);
        await contexto.SaveChangesAsync();
        return servicio;
    }

    public async Task AsignarAsync(TransporteContext contexto, int idServicio)
    {
        contexto.AsignacionesServicio.Add(new AsignacionServicio
        {
            IdServicio = idServicio,
            IdConductor = IdConductor,
            IdVehiculo = IdVehiculo,
            FechaAsignacion = DateTime.UtcNow,
            Estado = EstadoAsignacionServicio.ACTIVA
        });
        await contexto.SaveChangesAsync();
    }

    public async Task AgregarAsistenciaAsync(TransporteContext contexto, int idServicio)
    {
        contexto.Asistencias.Add(new Asistencia
        {
            IdServicio = idServicio,
            IdPasajero = IdPasajero,
            FechaHora = DateTime.UtcNow,
            Metodo = MetodoAsistencia.MANUAL,
            TipoAsistencia = TipoAsistencia.NO_PLANIFICADA,
            ExcedeCapacidad = false,
            Estado = EstadoAsistencia.PROVISIONAL
        });
        await contexto.SaveChangesAsync();
    }

    public async Task AgregarPasajeroAsync(TransporteContext contexto, int idServicio)
    {
        contexto.PasajerosServicio.Add(new PasajeroServicio
        {
            IdServicio = idServicio,
            IdPasajero = IdPasajero,
            EstadoConfirmacion = EstadoConfirmacionViaje.CONFIRMADO,
            Estado = EstadoPasajeroServicio.ACTIVO
        });
        await contexto.SaveChangesAsync();
    }

    public async Task AgregarQrAsync(
        TransporteContext contexto,
        int idServicio,
        EstadoQrServicio estado)
    {
        contexto.QrServicios.Add(new QrServicio
        {
            IdServicio = idServicio,
            Token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
            FechaGeneracion = DateTime.UtcNow,
            FechaExpiracion = DateTime.UtcNow.AddHours(2),
            Estado = estado
        });
        await contexto.SaveChangesAsync();
    }

    public ServicioCancelacionAutomatica CrearCancelacion(TransporteContext contexto, DateTime ahoraUtc)
    {
        return new ServicioCancelacionAutomatica(
            contexto,
            new ServicioQr(contexto, _registros.CreateLogger<ServicioQr>()),
            new RelojFijo(ahoraUtc),
            _registros.CreateLogger<ServicioCancelacionAutomatica>());
    }

    public ServicioServicios CrearOperacion(TransporteContext contexto)
    {
        var qr = new ServicioQr(contexto, _registros.CreateLogger<ServicioQr>());
        var asistencias = new ServicioAsistencias(
            contexto,
            qr,
            _registros.CreateLogger<ServicioAsistencias>());

        return new ServicioServicios(
            contexto,
            null!,
            asistencias,
            null!,
            qr,
            _registros.CreateLogger<ServicioServicios>());
    }

    public static (DateOnly Fecha, TimeOnly HoraInicio, TimeOnly HoraFin) HorarioIniciableAhora()
    {
        var (_, fecha, hora) = RelojChile.ObtenerInstante();
        var inicio = hora > new TimeOnly(0, 5) ? hora.AddMinutes(-1) : hora;
        var fin = inicio < new TimeOnly(23, 59, 0) ? inicio.AddMinutes(1) : new TimeOnly(23, 59, 59);
        return (fecha, inicio, fin);
    }

    public void Dispose()
    {
        _registros.Dispose();
        SqliteConnection.ClearAllPools();
        TryDelete(_ruta);
        TryDelete(_ruta + "-wal");
        TryDelete(_ruta + "-shm");
    }

    private void Sembrar(TransporteContext contexto)
    {
        var rol = new Rol { Nombre = "CONDUCTOR", Estado = EstadoRegistro.ACTIVO };
        contexto.Roles.Add(rol);
        contexto.SaveChanges();

        var usuario = new Usuario
        {
            Email = $"conductor-{Guid.NewGuid():N}@trayek.test",
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
            Rut = "76000000-0",
            RazonSocial = "Empresa prueba",
            Direccion = "Direccion",
            Telefono = "111111111",
            EmailContacto = "empresa@trayek.test",
            NombreContacto = "Contacto",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.EmpresasCliente.Add(empresa);
        contexto.SaveChanges();

        var planificacion = new Planificacion
        {
            IdEmpresa = empresa.IdEmpresa,
            Periodo = "2026-10",
            FechaCreacion = DateTime.UtcNow,
            IdUsuarioCreador = usuario.IdUsuario,
            Estado = EstadoPlanificacion.ACTIVA
        };
        contexto.Planificaciones.Add(planificacion);

        var pasajero = new Pasajero
        {
            IdEmpresa = empresa.IdEmpresa,
            Nombre = "Pasajero prueba",
            Rut = "11111111-1",
            Telefono = "222222222",
            Direccion = "Direccion",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Pasajeros.Add(pasajero);

        var vehiculo = new Vehiculo
        {
            Patente = "ABCD11",
            Tipo = "Van",
            Marca = "Marca",
            Modelo = "Modelo",
            Capacidad = 10,
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Vehiculos.Add(vehiculo);

        var conductor = new Conductor
        {
            IdUsuario = usuario.IdUsuario,
            Nombre = "Conductor prueba",
            Rut = "22222222-2",
            Telefono = "333333333",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Conductores.Add(conductor);
        contexto.SaveChanges();

        IdEmpresa = empresa.IdEmpresa;
        IdPlanificacion = planificacion.IdPlanificacion;
        IdPasajero = pasajero.IdPasajero;
        IdConductor = conductor.IdConductor;
        IdUsuarioConductor = usuario.IdUsuario;
        IdVehiculo = vehiculo.IdVehiculo;
    }

    private static void TryDelete(string ruta)
    {
        try
        {
            if (File.Exists(ruta))
            {
                File.Delete(ruta);
            }
        }
        catch (IOException)
        {
        }
    }

    private sealed class RelojFijo : IRelojOperacion
    {
        public RelojFijo(DateTime utcAhora) => UtcAhora = VencimientoServicio.NormalizarUtc(utcAhora);

        public DateTime UtcAhora { get; }
    }

    private sealed class PragmaSqlite : DbConnectionInterceptor
    {
        public override void ConnectionOpened(System.Data.Common.DbConnection connection, ConnectionEndEventData eventData)
        {
            Aplicar(connection);
        }

        public override Task ConnectionOpenedAsync(
            System.Data.Common.DbConnection connection,
            ConnectionEndEventData eventData,
            CancellationToken cancellationToken = default)
        {
            Aplicar(connection);
            return Task.CompletedTask;
        }

        private static void Aplicar(System.Data.Common.DbConnection connection)
        {
            using var comando = connection.CreateCommand();
            comando.CommandText = "PRAGMA busy_timeout = 5000;";
            comando.ExecuteNonQuery();
            using var wal = connection.CreateCommand();
            wal.CommandText = "PRAGMA journal_mode = WAL;";
            wal.ExecuteNonQuery();
        }
    }
}
