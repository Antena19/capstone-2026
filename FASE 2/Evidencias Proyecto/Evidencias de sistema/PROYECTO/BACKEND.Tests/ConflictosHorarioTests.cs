using BACKEND.DTOs.Asignaciones;
using BACKEND.DTOs.Servicios;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Rutas;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Tiempo;
using BACKEND.Tests.Soporte;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;

namespace BACKEND.Tests;

/// <summary>
/// Los conflictos de conductor y vehículo nombran el recurso y el servicio.
/// Cambiar el horario vuelve a comprobar las asignaciones activas antes de guardar.
/// </summary>
public class ConflictosHorarioTests
{
    private const string IdRuta = "6a970da8b12295fd44e62f67";
    private static readonly DateOnly Fecha = new(2026, 11, 12);
    private static readonly DateOnly DiaSiguiente = new(2026, 11, 13);
    private static readonly DateTime Ahora = RelojChile.AUtc(new DateTime(2026, 11, 12, 7, 0, 0));

    [Fact]
    public async Task RechazaConductorOcupadoConNombreServicioYHorario()
    {
        using var db = await Datos.CrearAsync();
        int ocupado;
        int destino;
        await using (var contexto = db.Base.Crear())
        {
            ocupado = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            destino = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 30), new TimeOnly(9, 30));
            await db.AsignarAsync(contexto, ocupado, db.IdConductor, db.IdOtroVehiculo);
        }

        await using var operacion = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            Asignaciones(operacion).CrearAsync(
                new CrearAsignacionSolicitudDto
                {
                    IdServicio = destino,
                    IdConductor = db.IdConductor,
                    IdVehiculo = db.IdVehiculo
                },
                idAdministrador: 1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Equal(
            $"El conductor Juan Pérez ya está asignado al servicio #{ocupado} del 12/11/2026, entre las 08:00 y las 09:00.",
            error.Message);
        Assert.Empty(await operacion.AsignacionesServicio.Where(a => a.IdServicio == destino).ToListAsync());
    }

    [Fact]
    public async Task RechazaVehiculoOcupadoConPatenteServicioYHorario()
    {
        using var db = await Datos.CrearAsync();
        int ocupado;
        int destino;
        await using (var contexto = db.Base.Crear())
        {
            ocupado = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 30), new TimeOnly(9, 30));
            destino = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            await db.AsignarAsync(contexto, ocupado, db.IdOtroConductor, db.IdVehiculo);
        }

        await using var operacion = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            Asignaciones(operacion).CrearAsync(
                new CrearAsignacionSolicitudDto
                {
                    IdServicio = destino,
                    IdConductor = db.IdConductor,
                    IdVehiculo = db.IdVehiculo
                },
                idAdministrador: 1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Equal(
            $"El vehículo TEST01 ya está asignado al servicio #{ocupado} del 12/11/2026, entre las 08:30 y las 09:30.",
            error.Message);
    }

    [Fact]
    public async Task InformaConductorYVehiculoCuandoAmbosEstanOcupados()
    {
        using var db = await Datos.CrearAsync();
        int servicioConductor;
        int servicioVehiculo;
        int destino;
        await using (var contexto = db.Base.Crear())
        {
            servicioConductor = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            servicioVehiculo = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 30), new TimeOnly(9, 30));
            destino = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 15), new TimeOnly(8, 45));
            await db.AsignarAsync(contexto, servicioConductor, db.IdConductor, db.IdOtroVehiculo);
            await db.AsignarAsync(contexto, servicioVehiculo, db.IdOtroConductor, db.IdVehiculo);
        }

        await using var operacion = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            Asignaciones(operacion).CrearAsync(
                new CrearAsignacionSolicitudDto
                {
                    IdServicio = destino,
                    IdConductor = db.IdConductor,
                    IdVehiculo = db.IdVehiculo
                },
                idAdministrador: 1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Contains(
            $"El conductor Juan Pérez ya está asignado al servicio #{servicioConductor} del 12/11/2026, entre las 08:00 y las 09:00.",
            error.Message);
        Assert.Contains(
            $"El vehículo TEST01 ya está asignado al servicio #{servicioVehiculo} del 12/11/2026, entre las 08:30 y las 09:30.",
            error.Message);
    }

    [Fact]
    public async Task PermiteAsignarCuandoElHorarioNoSeSuperpone()
    {
        using var db = await Datos.CrearAsync();
        int ocupado;
        int destino;
        await using (var contexto = db.Base.Crear())
        {
            ocupado = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            destino = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(9, 0), new TimeOnly(10, 0));
            await db.AsignarAsync(contexto, ocupado, db.IdConductor, db.IdVehiculo);
        }

        await using var operacion = db.Base.Crear();
        var creada = await Asignaciones(operacion).CrearAsync(
            new CrearAsignacionSolicitudDto
            {
                IdServicio = destino,
                IdConductor = db.IdConductor,
                IdVehiculo = db.IdVehiculo
            },
            idAdministrador: 1);

        Assert.Equal(EstadoAsignacionServicio.ACTIVA, creada.Estado);
        Assert.Equal(destino, creada.IdServicio);
    }

    [Fact]
    public async Task UnServicioCanceladoOFinalizadoNoBloqueaLaDisponibilidad()
    {
        using var db = await Datos.CrearAsync();
        int cancelado;
        int finalizado;
        int destino;
        await using (var contexto = db.Base.Crear())
        {
            cancelado = await db.InsertarServicioAsync(
                contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0), EstadoServicio.CANCELADO);
            finalizado = await db.InsertarServicioAsync(
                contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0), EstadoServicio.FINALIZADO);
            destino = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            await db.AsignarAsync(contexto, cancelado, db.IdConductor, db.IdOtroVehiculo);
            await db.AsignarAsync(contexto, finalizado, db.IdOtroConductor, db.IdVehiculo);
        }

        await using var operacion = db.Base.Crear();
        var creada = await Asignaciones(operacion).CrearAsync(
            new CrearAsignacionSolicitudDto
            {
                IdServicio = destino,
                IdConductor = db.IdConductor,
                IdVehiculo = db.IdVehiculo
            },
            idAdministrador: 1);

        Assert.Equal(EstadoAsignacionServicio.ACTIVA, creada.Estado);
    }

    [Fact]
    public async Task UnServicioEnCursoSigueBloqueandoLaDisponibilidad()
    {
        using var db = await Datos.CrearAsync();
        int enCurso;
        int destino;
        await using (var contexto = db.Base.Crear())
        {
            enCurso = await db.InsertarServicioAsync(
                contexto, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0), EstadoServicio.EN_CURSO);
            destino = await db.InsertarServicioAsync(contexto, Fecha, new TimeOnly(8, 15), new TimeOnly(8, 45));
            await db.AsignarAsync(contexto, enCurso, db.IdConductor, db.IdVehiculo);
        }

        await using var operacion = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            Asignaciones(operacion).CrearAsync(
                new CrearAsignacionSolicitudDto
                {
                    IdServicio = destino,
                    IdConductor = db.IdConductor,
                    IdVehiculo = db.IdOtroVehiculo
                },
                idAdministrador: 1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Contains($"servicio #{enCurso}", error.Message);
    }

    [Fact]
    public async Task RechazaEditarHaciaUnHorarioConElConductorOcupadoSinGuardar()
    {
        using var db = await Datos.CrearAsync();
        int destino;
        await using (var preparacion = db.Base.Crear())
        {
            var ocupado = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            destino = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(10, 0), new TimeOnly(11, 0));
            await db.AsignarAsync(preparacion, ocupado, db.IdConductor, db.IdOtroVehiculo);
            await db.AsignarAsync(preparacion, destino, db.IdConductor, db.IdVehiculo);
            await db.Base.AgregarPasajeroAsync(preparacion, destino);
            await db.Base.AgregarAsistenciaAsync(preparacion, destino);
        }

        await using var contexto = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            db.Operacion(contexto).EditarAsync(destino, db.Edicion(new TimeOnly(8, 30), new TimeOnly(9, 30)), 1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Contains("Juan Pérez", error.Message);
        var actual = await contexto.Servicios.SingleAsync(s => s.IdServicio == destino);
        Assert.Equal(new TimeOnly(10, 0), actual.HoraInicio);
        Assert.Equal(new TimeOnly(11, 0), actual.HoraFin);
        Assert.Equal(1, await contexto.PasajerosServicio.CountAsync(p => p.IdServicio == destino));
        Assert.Equal(1, await contexto.Asistencias.CountAsync(a => a.IdServicio == destino));
    }

    [Fact]
    public async Task RechazaEditarHaciaUnHorarioConElVehiculoOcupadoSinGuardar()
    {
        using var db = await Datos.CrearAsync();
        int destino;
        await using (var preparacion = db.Base.Crear())
        {
            var ocupado = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(8, 30), new TimeOnly(9, 30));
            destino = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(12, 0), new TimeOnly(13, 0));
            await db.AsignarAsync(preparacion, ocupado, db.IdOtroConductor, db.IdVehiculo);
            await db.AsignarAsync(preparacion, destino, db.IdConductor, db.IdVehiculo);
        }

        await using var contexto = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            db.Operacion(contexto).EditarAsync(destino, db.Edicion(new TimeOnly(8, 0), new TimeOnly(9, 0)), 1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Contains("TEST01", error.Message);
        var actual = await contexto.Servicios.SingleAsync(s => s.IdServicio == destino);
        Assert.Equal(new TimeOnly(12, 0), actual.HoraInicio);
        Assert.Equal(new TimeOnly(13, 0), actual.HoraFin);
    }

    [Fact]
    public async Task PermiteEditarCuandoElNuevoHorarioNoTieneConflictos()
    {
        using var db = await Datos.CrearAsync();
        int destino;
        await using (var preparacion = db.Base.Crear())
        {
            var ocupado = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            destino = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(10, 0), new TimeOnly(11, 0));
            await db.AsignarAsync(preparacion, ocupado, db.IdConductor, db.IdVehiculo);
            await db.AsignarAsync(preparacion, destino, db.IdConductor, db.IdVehiculo);
            await db.Base.AgregarPasajeroAsync(preparacion, destino);
            await db.Base.AgregarAsistenciaAsync(preparacion, destino);
        }

        await using var contexto = db.Base.Crear();
        var editado = await db.Operacion(contexto).EditarAsync(
            destino,
            db.Edicion(new TimeOnly(11, 0), new TimeOnly(12, 0)),
            1);

        Assert.Equal(new TimeOnly(11, 0), editado.HoraInicio);
        Assert.Equal(new TimeOnly(12, 0), editado.HoraFin);
        Assert.Equal(EstadoPasajeroServicio.ACTIVO, (await contexto.PasajerosServicio.SingleAsync(p => p.IdServicio == destino)).Estado);
        Assert.Equal(1, await contexto.Asistencias.CountAsync(a => a.IdServicio == destino));
    }

    [Fact]
    public async Task PermiteEditarSinCambiarElHorarioAunqueExistaOtroSolapeHistorico()
    {
        using var db = await Datos.CrearAsync();
        int destino;
        await using (var preparacion = db.Base.Crear())
        {
            var ocupado = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0));
            destino = await db.InsertarServicioAsync(preparacion, Fecha, new TimeOnly(8, 30), new TimeOnly(9, 30));
            await db.AsignarAsync(preparacion, ocupado, db.IdConductor, db.IdVehiculo);
            await db.AsignarAsync(preparacion, destino, db.IdConductor, db.IdVehiculo);
        }

        await using var contexto = db.Base.Crear();
        var solicitud = db.Edicion(new TimeOnly(8, 30), new TimeOnly(9, 30));
        solicitud.TipoServicio = TiposServicio.Especial;
        var editado = await db.Operacion(contexto).EditarAsync(destino, solicitud, 1);

        Assert.Equal(TiposServicio.Especial, editado.TipoServicio);
        Assert.Equal(new TimeOnly(8, 30), editado.HoraInicio);
        Assert.Equal(new TimeOnly(9, 30), editado.HoraFin);
    }

    [Fact]
    public async Task RechazaLaSerieCompletaCuandoUnaOcurrenciaQuedaEnConflicto()
    {
        using var db = await Datos.CrearAsync();
        var serie = Guid.NewGuid().ToString();
        int primero;
        int segundo;
        await using (var preparacion = db.Base.Crear())
        {
            primero = await db.InsertarServicioAsync(
                preparacion, Fecha, new TimeOnly(8, 0), new TimeOnly(9, 0), serie: serie);
            segundo = await db.InsertarServicioAsync(
                preparacion, DiaSiguiente, new TimeOnly(8, 0), new TimeOnly(9, 0), serie: serie);
            var ajeno = await db.InsertarServicioAsync(preparacion, DiaSiguiente, new TimeOnly(10, 0), new TimeOnly(11, 0));
            await db.AsignarAsync(preparacion, primero, db.IdConductor, db.IdVehiculo);
            await db.AsignarAsync(preparacion, segundo, db.IdConductor, db.IdVehiculo);
            await db.AsignarAsync(preparacion, ajeno, db.IdConductor, db.IdOtroVehiculo);
        }

        await using var contexto = db.Base.Crear();
        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            db.Operacion(contexto).EditarSerieAsync(
                primero,
                new EditarSerieServiciosSolicitudDto
                {
                    Alcance = AlcanceEdicionSerie.ESTE_Y_FUTUROS,
                    IdRuta = IdRuta,
                    HoraInicio = new TimeOnly(10, 30),
                    HoraFin = new TimeOnly(11, 30),
                    TipoServicio = TiposServicio.Ida
                },
                1));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Contains("Juan Pérez", error.Message);
        var servicios = await contexto.Servicios.Where(s => s.IdServicio == primero || s.IdServicio == segundo).ToListAsync();
        Assert.All(servicios, servicio =>
        {
            Assert.Equal(new TimeOnly(8, 0), servicio.HoraInicio);
            Assert.Equal(new TimeOnly(9, 0), servicio.HoraFin);
            Assert.Equal(TiposServicio.Ida, servicio.TipoServicio);
        });
    }

    private static ServicioAsignaciones Asignaciones(BACKEND.Datos.MySQL.TransporteContext contexto)
    {
        var registros = LoggerFactory.Create(_ => { });
        return new ServicioAsignaciones(contexto, registros.CreateLogger<ServicioAsignaciones>());
    }

    private sealed class Datos : IDisposable
    {
        private Datos(BasePruebasServicio basePruebas, int idPlanificacion, int idOtroConductor, int idOtroVehiculo)
        {
            Base = basePruebas;
            IdPlanificacion = idPlanificacion;
            IdOtroConductor = idOtroConductor;
            IdOtroVehiculo = idOtroVehiculo;
        }

        public BasePruebasServicio Base { get; }

        public int IdPlanificacion { get; }

        public int IdConductor => Base.IdConductor;

        public int IdVehiculo => Base.IdVehiculo;

        public int IdOtroConductor { get; }

        public int IdOtroVehiculo { get; }

        public static async Task<Datos> CrearAsync()
        {
            var db = new BasePruebasServicio();
            await using var contexto = db.Crear();
            var conductor = await contexto.Conductores.SingleAsync(c => c.IdConductor == db.IdConductor);
            conductor.Nombre = "Juan Pérez";
            var vehiculo = await contexto.Vehiculos.SingleAsync(v => v.IdVehiculo == db.IdVehiculo);
            vehiculo.Patente = "TEST01";

            var idRol = await contexto.Roles.Select(r => r.IdRol).FirstAsync();
            var usuario = new Usuario
            {
                Email = $"otro-{Guid.NewGuid():N}@trayek.test",
                PasswordHash = "hash-de-prueba",
                IdRol = idRol,
                Estado = EstadoRegistro.ACTIVO,
                CuentaActivada = true,
                FechaCreacion = DateTime.UtcNow
            };
            contexto.Usuarios.Add(usuario);
            await contexto.SaveChangesAsync();

            var otroConductor = new Conductor
            {
                IdUsuario = usuario.IdUsuario,
                Nombre = "Ana Soto",
                Rut = "44444444-4",
                Telefono = "555555555",
                Estado = EstadoRegistro.ACTIVO
            };
            var otroVehiculo = new Vehiculo
            {
                Patente = "OTRO01",
                Tipo = "Van",
                Marca = "Marca",
                Modelo = "Modelo",
                Capacidad = 8,
                Estado = EstadoRegistro.ACTIVO
            };
            contexto.Conductores.Add(otroConductor);
            contexto.Vehiculos.Add(otroVehiculo);

            var planificacion = new Planificacion
            {
                IdEmpresa = db.IdEmpresa,
                Periodo = "2026-11",
                FechaCreacion = DateTime.UtcNow,
                IdUsuarioCreador = db.IdUsuarioConductor,
                Estado = EstadoPlanificacion.ACTIVA
            };
            contexto.Planificaciones.Add(planificacion);
            await contexto.SaveChangesAsync();

            return new Datos(db, planificacion.IdPlanificacion, otroConductor.IdConductor, otroVehiculo.IdVehiculo);
        }

        public async Task<int> InsertarServicioAsync(
            BACKEND.Datos.MySQL.TransporteContext contexto,
            DateOnly fecha,
            TimeOnly inicio,
            TimeOnly fin,
            EstadoServicio estado = EstadoServicio.PROGRAMADO,
            string? serie = null)
        {
            var servicio = new Servicio
            {
                IdEmpresa = Base.IdEmpresa,
                IdPlanificacion = IdPlanificacion,
                IdRuta = IdRuta,
                IdSerie = serie,
                Fecha = fecha,
                HoraInicio = inicio,
                HoraFin = fin,
                TipoServicio = TiposServicio.Ida,
                Estado = estado
            };
            contexto.Servicios.Add(servicio);
            await contexto.SaveChangesAsync();
            return servicio.IdServicio;
        }

        public async Task AsignarAsync(
            BACKEND.Datos.MySQL.TransporteContext contexto,
            int idServicio,
            int idConductor,
            int idVehiculo)
        {
            contexto.AsignacionesServicio.Add(new AsignacionServicio
            {
                IdServicio = idServicio,
                IdConductor = idConductor,
                IdVehiculo = idVehiculo,
                FechaAsignacion = DateTime.UtcNow,
                Estado = EstadoAsignacionServicio.ACTIVA
            });
            await contexto.SaveChangesAsync();
        }

        public EditarServicioSolicitudDto Edicion(TimeOnly inicio, TimeOnly fin)
        {
            return new EditarServicioSolicitudDto
            {
                IdEmpresa = Base.IdEmpresa,
                IdPlanificacion = IdPlanificacion,
                IdRuta = IdRuta,
                Fecha = Fecha,
                HoraInicio = inicio,
                HoraFin = fin,
                TipoServicio = TiposServicio.Ida
            };
        }

        public ServicioServicios Operacion(BACKEND.Datos.MySQL.TransporteContext contexto)
        {
            var registros = LoggerFactory.Create(_ => { });
            var qr = new ServicioQr(contexto, registros.CreateLogger<ServicioQr>());
            var asistencias = new ServicioAsistencias(contexto, qr, registros.CreateLogger<ServicioAsistencias>());
            return new ServicioServicios(
                contexto,
                new RutasDePrueba(Base.IdEmpresa),
                asistencias,
                null!,
                qr,
                new RelojFijo(Ahora),
                new ServicioAsignaciones(contexto, registros.CreateLogger<ServicioAsignaciones>()),
                registros.CreateLogger<ServicioServicios>());
        }

        public void Dispose() => Base.Dispose();
    }

    private sealed class RelojFijo : IRelojOperacion
    {
        public RelojFijo(DateTime utcAhora) => UtcAhora = VencimientoServicio.NormalizarUtc(utcAhora);

        public DateTime UtcAhora { get; }
    }

    private sealed class RutasDePrueba : IRepositorioRutas
    {
        private readonly Ruta _ruta;

        public RutasDePrueba(int idEmpresa)
        {
            _ruta = new Ruta
            {
                Id = ObjectId.Parse(IdRuta),
                EmpresaId = idEmpresa,
                Nombre = "Ruta prueba",
                Estado = EstadoRegistro.ACTIVO
            };
        }

        public Task<Ruta?> ObtenerPorIdAsync(ObjectId id)
        {
            return Task.FromResult<Ruta?>(id == _ruta.Id ? _ruta : null);
        }
    }
}
