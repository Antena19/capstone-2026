using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Planificaciones;
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
/// El día civil de la programación es America/Santiago, aunque el proceso esté en UTC.
/// El 9 de noviembre de 2026 Chile está en UTC−3: a las 21:00 el calendario UTC ya es el día 10.
/// </summary>
public class ProgramacionFechaChileTests
{
    private const string IdRuta = "6a970da8b12295fd44e62f67";
    private const string MensajeFechaAnterior =
        "No se puede crear ni modificar un servicio para una fecha anterior al día actual.";

    private static readonly DateOnly NueveNoviembre = new(2026, 11, 9);
    private static readonly DateOnly DiezNoviembre = new(2026, 11, 10);

    [Fact]
    public async Task CreaEspecialParaHoyALas2059CuandoUtcSigueEnElMismoDia()
    {
        var ahora = EnChile(2026, 11, 9, 20, 59);
        Assert.Equal(NueveNoviembre, DateOnly.FromDateTime(ahora));

        var servicio = await CrearEspecialAsync(ahora, NueveNoviembre, new TimeOnly(23, 0), new TimeOnly(23, 30));

        Assert.Equal(NueveNoviembre, servicio.Fecha);
        Assert.Equal(TiposServicio.Especial, servicio.TipoServicio);
        Assert.Equal(EstadoServicio.PROGRAMADO, servicio.Estado);
    }

    [Fact]
    public async Task CreaEspecialParaHoyALas2100CuandoUtcYaEsElDiaSiguiente()
    {
        var ahora = EnChile(2026, 11, 9, 21, 0);
        Assert.Equal(DiezNoviembre, DateOnly.FromDateTime(ahora));

        var servicio = await CrearEspecialAsync(ahora, NueveNoviembre, new TimeOnly(23, 0), new TimeOnly(23, 30));

        Assert.Equal(NueveNoviembre, servicio.Fecha);
        Assert.Equal(TiposServicio.Especial, servicio.TipoServicio);
    }

    [Fact]
    public async Task CreaEspecialParaHoyALas2350()
    {
        var ahora = EnChile(2026, 11, 9, 23, 50);
        Assert.True(DateOnly.FromDateTime(ahora) > NueveNoviembre);

        var servicio = await CrearEspecialAsync(ahora, NueveNoviembre, new TimeOnly(23, 55), new TimeOnly(23, 59));

        Assert.Equal(NueveNoviembre, servicio.Fecha);
        Assert.Equal(new TimeOnly(23, 55), servicio.HoraInicio);
    }

    [Fact]
    public async Task CreaALas2355UnServicioParaMananaALas0015()
    {
        var ahora = EnChile(2026, 11, 9, 23, 55);

        var servicio = await CrearEspecialAsync(ahora, DiezNoviembre, new TimeOnly(0, 15), new TimeOnly(0, 45));

        Assert.Equal(DiezNoviembre, servicio.Fecha);
        Assert.Equal(new TimeOnly(0, 15), servicio.HoraInicio);
        Assert.Equal(new TimeOnly(0, 45), servicio.HoraFin);
    }

    [Fact]
    public async Task CreaALas0010UnServicioParaHoyALas0400()
    {
        var ahora = EnChile(2026, 11, 10, 0, 10);
        Assert.Equal(DiezNoviembre, DateOnly.FromDateTime(ahora));

        var servicio = await CrearEspecialAsync(ahora, DiezNoviembre, new TimeOnly(4, 0), new TimeOnly(4, 30));

        Assert.Equal(DiezNoviembre, servicio.Fecha);
        Assert.Equal(new TimeOnly(4, 0), servicio.HoraInicio);
    }

    [Fact]
    public async Task RechazaUnaFechaAnteriorAlDiaDeChile()
    {
        var ahora = EnChile(2026, 11, 9, 21, 0);

        var excepcion = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            CrearEspecialAsync(ahora, NueveNoviembre.AddDays(-1), new TimeOnly(8, 0), new TimeOnly(9, 0)));

        Assert.Equal(MensajeFechaAnterior, excepcion.Message);
        Assert.Equal(400, excepcion.CodigoEstado);
    }

    [Fact]
    public async Task CreaSerieRecurrenteQueIncluyeElDiaDeChileDespuesDeLas2100()
    {
        var ahora = EnChile(2026, 11, 9, 21, 0);
        using var db = new BasePruebasServicio();
        var idPlan = await CrearPlanificacionActivaAsync(db, "2026-11");

        CrearServiciosRecurrentesRespuestaDto resultado;
        await using (var contexto = db.Crear())
        {
            resultado = await Operacion(db, contexto, ahora).CrearRecurrentesAsync(
                new CrearServiciosRecurrentesSolicitudDto
                {
                    IdEmpresa = db.IdEmpresa,
                    IdPlanificacion = idPlan,
                    IdRuta = IdRuta,
                    FechaDesde = NueveNoviembre,
                    FechaHasta = DiezNoviembre,
                    DiasSemana = [DiaSemana.LUNES, DiaSemana.MARTES],
                    HoraInicio = new TimeOnly(23, 0),
                    HoraFin = new TimeOnly(23, 30),
                    TipoServicio = TiposServicio.Especial
                },
                idAdministrador: 1);
        }

        Assert.Equal(2, resultado.CantidadServicios);
        Assert.Contains(resultado.Servicios, servicio => servicio.Fecha == NueveNoviembre);
        Assert.Contains(resultado.Servicios, servicio => servicio.Fecha == DiezNoviembre);
        Assert.All(resultado.Servicios, servicio => Assert.Equal(TiposServicio.Especial, servicio.TipoServicio));
    }

    [Fact]
    public async Task EditaElServicioDeHoyDespuesDeLas2100()
    {
        var ahora = EnChile(2026, 11, 9, 21, 0);
        using var db = new BasePruebasServicio();
        var idPlan = await CrearPlanificacionActivaAsync(db, "2026-11");
        var idServicio = await InsertarServicioAsync(db, idPlan, NueveNoviembre, idSerie: null);

        ServicioRespuestaDto editado;
        await using (var contexto = db.Crear())
        {
            editado = await Operacion(db, contexto, ahora).EditarAsync(
                idServicio,
                new EditarServicioSolicitudDto
                {
                    IdEmpresa = db.IdEmpresa,
                    IdPlanificacion = idPlan,
                    IdRuta = IdRuta,
                    Fecha = NueveNoviembre,
                    HoraInicio = new TimeOnly(22, 0),
                    HoraFin = new TimeOnly(22, 40),
                    TipoServicio = TiposServicio.Especial
                },
                idAdministrador: 1);
        }

        Assert.Equal(NueveNoviembre, editado.Fecha);
        Assert.Equal(new TimeOnly(22, 0), editado.HoraInicio);
        Assert.Equal(new TimeOnly(22, 40), editado.HoraFin);
    }

    [Fact]
    public async Task EditaLaSerieDespuesDeLas2100SinOmitirElDiaDeChile()
    {
        var ahora = EnChile(2026, 11, 9, 21, 30);
        Assert.True(DateOnly.FromDateTime(ahora) > NueveNoviembre);

        using var db = new BasePruebasServicio();
        var idPlan = await CrearPlanificacionActivaAsync(db, "2026-11");
        var serie = Guid.NewGuid().ToString();
        var idAyer = await InsertarServicioAsync(db, idPlan, NueveNoviembre.AddDays(-1), serie);
        var idHoy = await InsertarServicioAsync(db, idPlan, NueveNoviembre, serie);
        var idManana = await InsertarServicioAsync(db, idPlan, DiezNoviembre, serie);

        await using (var contexto = db.Crear())
        {
            var actualizados = await Operacion(db, contexto, ahora).EditarSerieAsync(
                idHoy,
                new EditarSerieServiciosSolicitudDto
                {
                    Alcance = AlcanceEdicionSerie.ESTE_Y_FUTUROS,
                    IdRuta = IdRuta,
                    HoraInicio = new TimeOnly(21, 10),
                    HoraFin = new TimeOnly(21, 40),
                    TipoServicio = TiposServicio.Ida
                },
                idAdministrador: 1);

            Assert.Equal(2, actualizados.Count);
            Assert.Contains(actualizados, servicio => servicio.IdServicio == idHoy && servicio.Fecha == NueveNoviembre);
            Assert.Contains(actualizados, servicio => servicio.IdServicio == idManana);
        }

        await using var lectura = db.Crear();
        var ayer = await lectura.Servicios.SingleAsync(s => s.IdServicio == idAyer);
        var hoy = await lectura.Servicios.SingleAsync(s => s.IdServicio == idHoy);
        var manana = await lectura.Servicios.SingleAsync(s => s.IdServicio == idManana);

        Assert.Equal(new TimeOnly(18, 0), ayer.HoraInicio);
        Assert.Equal(new TimeOnly(21, 10), hoy.HoraInicio);
        Assert.Equal(new TimeOnly(21, 10), manana.HoraInicio);
        Assert.Equal(TiposServicio.Ida, hoy.TipoServicio);
    }

    [Fact]
    public async Task CreaPlanificacionDelMesDeChileEnLaUltimaNocheDelMes()
    {
        var ahora = EnChile(2026, 11, 30, 23, 50);
        Assert.Equal(new DateOnly(2026, 12, 1), DateOnly.FromDateTime(ahora));

        using var db = new BasePruebasServicio();
        using var registros = LoggerFactory.Create(_ => { });
        await using var contexto = db.Crear();
        var planificaciones = new ServicioPlanificaciones(
            contexto,
            new RelojFijo(ahora),
            registros.CreateLogger<ServicioPlanificaciones>());

        var creada = await planificaciones.CrearAsync(
            new CrearPlanificacionSolicitudDto
            {
                IdEmpresa = db.IdEmpresa,
                Periodo = "2026-11"
            },
            db.IdUsuarioConductor);

        Assert.Equal("2026-11", creada.Periodo);
        Assert.Equal(EstadoPlanificacion.BORRADOR, creada.Estado);

        var anterior = await Assert.ThrowsAsync<ExcepcionNegocio>(() => planificaciones.CrearAsync(
            new CrearPlanificacionSolicitudDto
            {
                IdEmpresa = db.IdEmpresa,
                Periodo = "2026-10"
            },
            db.IdUsuarioConductor));

        Assert.Equal(
            "No se puede crear ni modificar una planificación para un período anterior al mes actual.",
            anterior.Message);
    }

    private static async Task<ServicioRespuestaDto> CrearEspecialAsync(
        DateTime ahoraUtc,
        DateOnly fecha,
        TimeOnly horaInicio,
        TimeOnly horaFin)
    {
        using var db = new BasePruebasServicio();
        var idPlan = await CrearPlanificacionActivaAsync(db, $"{fecha.Year:D4}-{fecha.Month:D2}");
        await using var contexto = db.Crear();
        return await Operacion(db, contexto, ahoraUtc).CrearAsync(
            new CrearServicioSolicitudDto
            {
                IdEmpresa = db.IdEmpresa,
                IdPlanificacion = idPlan,
                IdRuta = IdRuta,
                Fecha = fecha,
                HoraInicio = horaInicio,
                HoraFin = horaFin,
                TipoServicio = TiposServicio.Especial
            },
            idAdministrador: 1);
    }

    private static async Task<int> CrearPlanificacionActivaAsync(BasePruebasServicio db, string periodo)
    {
        await using var contexto = db.Crear();
        var planificacion = new Planificacion
        {
            IdEmpresa = db.IdEmpresa,
            Periodo = periodo,
            FechaCreacion = DateTime.UtcNow,
            IdUsuarioCreador = db.IdUsuarioConductor,
            Estado = EstadoPlanificacion.ACTIVA
        };
        contexto.Planificaciones.Add(planificacion);
        await contexto.SaveChangesAsync();
        return planificacion.IdPlanificacion;
    }

    private static async Task<int> InsertarServicioAsync(
        BasePruebasServicio db,
        int idPlanificacion,
        DateOnly fecha,
        string? idSerie)
    {
        await using var contexto = db.Crear();
        var servicio = new Servicio
        {
            IdEmpresa = db.IdEmpresa,
            IdPlanificacion = idPlanificacion,
            IdRuta = IdRuta,
            IdSerie = idSerie,
            Fecha = fecha,
            HoraInicio = new TimeOnly(18, 0),
            HoraFin = new TimeOnly(19, 0),
            TipoServicio = TiposServicio.Especial,
            Estado = EstadoServicio.PROGRAMADO
        };
        contexto.Servicios.Add(servicio);
        await contexto.SaveChangesAsync();
        return servicio.IdServicio;
    }

    private static ServicioServicios Operacion(BasePruebasServicio db, TransporteContext contexto, DateTime ahoraUtc)
    {
        var registros = LoggerFactory.Create(_ => { });
        var qr = new ServicioQr(contexto, registros.CreateLogger<ServicioQr>());
        var asistencias = new ServicioAsistencias(contexto, qr, registros.CreateLogger<ServicioAsistencias>());
        return new ServicioServicios(
            contexto,
            new RutasDePrueba(db.IdEmpresa),
            asistencias,
            null!,
            qr,
            new RelojFijo(ahoraUtc),
            new ServicioAsignaciones(contexto, registros.CreateLogger<ServicioAsignaciones>()),
            registros.CreateLogger<ServicioServicios>());
    }

    private static DateTime EnChile(int anio, int mes, int dia, int hora, int minuto)
    {
        return RelojChile.AUtc(new DateTime(anio, mes, dia, hora, minuto, 0));
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
