using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Simulacion;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BACKEND.Tests;

public sealed class TrazabilidadSimulacionTests : IDisposable
{
    private readonly string _ruta;
    private readonly DbContextOptions<TransporteContext> _opciones;
    private readonly int _idEmpresa;
    private readonly int _idPlanificacion;
    private readonly int _idPasajero;
    private readonly int _idServicio;
    private readonly int _idAsistencia;

    public TrazabilidadSimulacionTests()
    {
        _ruta = Path.Combine(Path.GetTempPath(), $"trayek-simulacion-{Guid.NewGuid():N}.db");
        _opciones = new DbContextOptionsBuilder<TransporteContext>()
            .UseSqlite($"Data Source={_ruta}")
            .AddInterceptors(new PragmaSqlite())
            .Options;

        using var contexto = Crear();
        contexto.Database.EnsureCreated();
        (_idEmpresa, _idPlanificacion, _idPasajero, _idServicio, _idAsistencia) = Sembrar(contexto);
    }

    [Fact]
    public async Task GuardaUnServicioFinalizadoSinAsistencias()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        await using (var contexto = Crear())
        {
            contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.COMPLETADO));
            contexto.SimulacionesServicio.Add(Marca(idLote, _idServicio));
            await contexto.SaveChangesAsync();
        }

        await using var lectura = Crear();
        var marca = await lectura.SimulacionesServicio
            .Include(s => s.Asistencias)
            .SingleAsync(s => s.IdLote == idLote);

        Assert.Equal(EstadoServicio.PROGRAMADO, marca.EstadoAnterior);
        Assert.Equal(EstadoServicio.FINALIZADO, marca.EstadoPosterior);
        Assert.Equal(_idServicio, marca.IdServicioVigente);
        Assert.Empty(marca.Asistencias);
    }

    [Fact]
    public async Task GuardaCadaAsistenciaDelLote()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        await using var contexto = Crear();
        var marca = Marca(idLote, _idServicio);
        marca.Asistencias.Add(new SimulacionAsistencia
        {
            IdPasajero = _idPasajero,
            IdAsistencia = _idAsistencia
        });
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.COMPLETADO));
        contexto.SimulacionesServicio.Add(marca);
        await contexto.SaveChangesAsync();

        Assert.Equal(_idAsistencia, marca.Asistencias.Single().IdAsistencia);
    }

    [Fact]
    public async Task ImpideDosMarcasVigentesDelMismoServicio()
    {
        var primero = MarcaSimulacionOperacional.NuevoIdLote();
        var segundo = MarcaSimulacionOperacional.NuevoIdLote();
        await using var contexto = Crear();
        contexto.SimulacionesLote.AddRange(Lote(primero, EstadoLoteSimulacion.COMPLETADO), Lote(segundo, EstadoLoteSimulacion.COMPLETADO));
        contexto.SimulacionesServicio.Add(Marca(primero, _idServicio));
        await contexto.SaveChangesAsync();
        contexto.SimulacionesServicio.Add(Marca(segundo, _idServicio));

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task ImpideRepetirElServicioDentroDelMismoLote()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        await using var contexto = Crear();
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.EN_CURSO));
        contexto.SimulacionesServicio.Add(Marca(idLote, _idServicio));
        await contexto.SaveChangesAsync();
        contexto.SimulacionesServicio.Add(Marca(idLote, _idServicio));

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task ConservaDosMarcasRevertidasYLiberaElServicio()
    {
        var primero = MarcaSimulacionOperacional.NuevoIdLote();
        var segundo = MarcaSimulacionOperacional.NuevoIdLote();
        var antigua = Marca(primero, _idServicio);
        var repetida = Marca(segundo, _idServicio);
        MarcaSimulacionOperacional.MarcarRevertida(antigua);
        MarcaSimulacionOperacional.MarcarRevertida(repetida);

        await using var contexto = Crear();
        contexto.SimulacionesLote.AddRange(
            Lote(primero, EstadoLoteSimulacion.REVERTIDO),
            Lote(segundo, EstadoLoteSimulacion.REVERTIDO));
        contexto.SimulacionesServicio.AddRange(antigua, repetida);
        await contexto.SaveChangesAsync();

        Assert.Equal(2, await contexto.SimulacionesServicio.CountAsync(s => s.IdServicio == _idServicio));
        Assert.Null(antigua.IdServicioVigente);
        Assert.Null(repetida.IdServicioVigente);
    }

    [Fact]
    public async Task RechazaUnaMarcaVigenteSinIdentificadorVigente()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        var marca = Marca(idLote, _idServicio);
        marca.IdServicioVigente = null;

        await using var contexto = Crear();
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.EN_CURSO));
        contexto.SimulacionesServicio.Add(marca);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task RechazaUnaMarcaRevertidaQueSigueOcupandoElServicio()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        var marca = Marca(idLote, _idServicio);
        marca.EstadoMarca = EstadoMarcaSimulacion.REVERTIDO;

        await using var contexto = Crear();
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.REVERTIDO));
        contexto.SimulacionesServicio.Add(marca);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task RechazaUnPosteriorDistintoDeFinalizado()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        var marca = Marca(idLote, _idServicio);
        marca.EstadoPosterior = EstadoServicio.CANCELADO;

        await using var contexto = Crear();
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.EN_CURSO));
        contexto.SimulacionesServicio.Add(marca);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task ImpideMarcarDosVecesLaMismaAsistenciaOAlMismoPasajero()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        await using var contexto = Crear();
        var marca = Marca(idLote, _idServicio);
        marca.Asistencias.Add(new SimulacionAsistencia
        {
            IdPasajero = _idPasajero,
            IdAsistencia = _idAsistencia
        });
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.COMPLETADO));
        contexto.SimulacionesServicio.Add(marca);
        await contexto.SaveChangesAsync();

        marca.Asistencias.Add(new SimulacionAsistencia
        {
            IdPasajero = _idPasajero,
            IdAsistencia = _idAsistencia
        });

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task RechazaUnServicioInexistente()
    {
        var idLote = MarcaSimulacionOperacional.NuevoIdLote();
        await using var contexto = Crear();
        contexto.SimulacionesLote.Add(Lote(idLote, EstadoLoteSimulacion.EN_CURSO));
        contexto.SimulacionesServicio.Add(Marca(idLote, _idServicio + 1000));

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    public void Dispose()
    {
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

    private TransporteContext Crear() => new(_opciones);

    private SimulacionLote Lote(string idLote, EstadoLoteSimulacion estado)
    {
        return new SimulacionLote
        {
            IdLote = idLote,
            IdEmpresa = _idEmpresa,
            IdPlanificacion = _idPlanificacion,
            Estado = estado,
            FechaInicio = new DateTime(2026, 11, 11, 22, 0, 0, DateTimeKind.Utc),
            FechaCierre = estado == EstadoLoteSimulacion.COMPLETADO
                ? new DateTime(2026, 11, 11, 22, 5, 0, DateTimeKind.Utc)
                : null
        };
    }

    private static SimulacionServicio Marca(string idLote, int idServicio)
    {
        return MarcaSimulacionOperacional.CrearVigente(
            idLote,
            idServicio,
            EstadoServicio.PROGRAMADO,
            null,
            null,
            null,
            new DateTime(2026, 11, 16, 10, 2, 0, DateTimeKind.Utc),
            new DateTime(2026, 11, 16, 12, 5, 0, DateTimeKind.Utc));
    }

    private static (int Empresa, int Planificacion, int Pasajero, int Servicio, int Asistencia) Sembrar(
        TransporteContext contexto)
    {
        var rol = new Rol { Nombre = "CONDUCTOR", Estado = EstadoRegistro.ACTIVO };
        contexto.Roles.Add(rol);
        contexto.SaveChanges();

        var usuario = new Usuario
        {
            Email = $"simulacion-{Guid.NewGuid():N}@trayek.test",
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
        contexto.EmpresasCliente.Add(empresa);
        contexto.SaveChanges();

        var planificacion = new Planificacion
        {
            IdEmpresa = empresa.IdEmpresa,
            Periodo = "2026-11",
            FechaCreacion = DateTime.UtcNow,
            IdUsuarioCreador = usuario.IdUsuario,
            Estado = EstadoPlanificacion.ACTIVA
        };
        var pasajero = new Pasajero
        {
            IdEmpresa = empresa.IdEmpresa,
            Nombre = "Pasajero prueba",
            Rut = "11111111-1",
            Telefono = "222222222",
            Direccion = "Direccion",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Planificaciones.Add(planificacion);
        contexto.Pasajeros.Add(pasajero);
        contexto.SaveChanges();

        var servicio = new Servicio
        {
            IdEmpresa = empresa.IdEmpresa,
            IdPlanificacion = planificacion.IdPlanificacion,
            IdRuta = "6a970da8b12295fd44e62f67",
            Fecha = new DateOnly(2026, 11, 16),
            HoraInicio = new TimeOnly(10, 0),
            HoraFin = new TimeOnly(12, 0),
            TipoServicio = "IDA",
            Estado = EstadoServicio.PROGRAMADO
        };
        contexto.Servicios.Add(servicio);
        contexto.SaveChanges();

        var asistencia = new Asistencia
        {
            IdServicio = servicio.IdServicio,
            IdPasajero = pasajero.IdPasajero,
            FechaHora = DateTime.UtcNow,
            Metodo = MetodoAsistencia.MANUAL,
            TipoAsistencia = TipoAsistencia.PLANIFICADA,
            ExcedeCapacidad = false,
            Estado = EstadoAsistencia.VALIDA
        };
        contexto.Asistencias.Add(asistencia);
        contexto.SaveChanges();

        return (empresa.IdEmpresa, planificacion.IdPlanificacion, pasajero.IdPasajero, servicio.IdServicio, asistencia.IdAsistencia);
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
