using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.AspNetCore.Http;
using BACKEND.Negocio.Servicios;
using BACKEND.Negocio.Tiempo;
using BACKEND.Tests.Soporte;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BACKEND.Tests;

public sealed class ConsultaServiciosPasajeroTests : IDisposable
{
    private readonly BasePruebasServicio _base = new();

    [Fact]
    public async Task Conserva_el_servicio_planificado_con_su_confirmacion()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var idServicio = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.PROGRAMADO);
        await _base.AgregarPasajeroAsync(contexto, idServicio);

        var operacion = CrearOperacion(contexto);
        var lista = await operacion.ListarMisServiciosAsync(idUsuario, null, null, null, null, null);

        var fila = Assert.Single(lista);
        Assert.Equal(idServicio, fila.IdServicio);
        Assert.True(fila.Planificado);
        Assert.Equal(EstadoConfirmacionViaje.CONFIRMADO, fila.EstadoConfirmacion);
        Assert.False(fila.TieneAsistencia);
        Assert.Null(fila.IdPuntoRecogida);
        Assert.Null(fila.NombrePuntoRecogida);
    }

    [Fact]
    public async Task Incluye_una_asistencia_sin_asociacion_activa_y_sin_datos_inventados()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var idServicio = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        await AgregarAsistenciaAsync(contexto, idServicio, _base.IdPasajero, EstadoAsistencia.VALIDA);

        var operacion = CrearOperacion(contexto);
        var lista = await operacion.ListarMisServiciosAsync(idUsuario, null, null, null, null, null);

        var fila = Assert.Single(lista);
        Assert.Equal(idServicio, fila.IdServicio);
        Assert.False(fila.Planificado);
        Assert.Equal(0, fila.IdPasajeroServicio);
        Assert.Null(fila.EstadoConfirmacion);
        Assert.Null(fila.FechaConfirmacion);
        Assert.Null(fila.IdPuntoRecogida);
        Assert.Null(fila.NombrePuntoRecogida);
        Assert.True(fila.TieneAsistencia);
        Assert.Equal(TipoAsistencia.NO_PLANIFICADA, fila.TipoAsistencia);
        Assert.Equal(EstadoAsistencia.VALIDA, fila.EstadoAsistencia);
    }

    [Fact]
    public async Task No_duplica_un_servicio_planificado_que_tambien_tiene_asistencia()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var idServicio = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        await _base.AgregarPasajeroAsync(contexto, idServicio);
        await AgregarAsistenciaAsync(contexto, idServicio, _base.IdPasajero, EstadoAsistencia.VALIDA);

        var operacion = CrearOperacion(contexto);
        var lista = await operacion.ListarMisServiciosAsync(idUsuario, null, null, null, null, null);

        var fila = Assert.Single(lista);
        Assert.True(fila.Planificado);
        Assert.True(fila.IdPasajeroServicio > 0);
        Assert.Equal(EstadoConfirmacionViaje.CONFIRMADO, fila.EstadoConfirmacion);
        Assert.Equal(EstadoAsistencia.VALIDA, fila.EstadoAsistencia);
    }

    [Fact]
    public async Task Respeta_los_estados_real_de_cada_asistencia()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var valida = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        var provisional = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 26), EstadoServicio.PROGRAMADO);
        var anulada = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 24), EstadoServicio.FINALIZADO);
        await AgregarAsistenciaAsync(contexto, valida, _base.IdPasajero, EstadoAsistencia.VALIDA);
        await AgregarAsistenciaAsync(contexto, provisional, _base.IdPasajero, EstadoAsistencia.PROVISIONAL);
        await AgregarAsistenciaAsync(contexto, anulada, _base.IdPasajero, EstadoAsistencia.ANULADA);

        var operacion = CrearOperacion(contexto);
        var lista = await operacion.ListarMisServiciosAsync(idUsuario, null, null, null, null, null);

        Assert.Equal(3, lista.Count);
        Assert.Equal(EstadoAsistencia.ANULADA, lista.Single(f => f.IdServicio == anulada).EstadoAsistencia);
        Assert.Equal(EstadoAsistencia.VALIDA, lista.Single(f => f.IdServicio == valida).EstadoAsistencia);
        Assert.Equal(EstadoAsistencia.PROVISIONAL, lista.Single(f => f.IdServicio == provisional).EstadoAsistencia);
        Assert.All(lista, fila => Assert.False(fila.Planificado));
    }

    [Fact]
    public async Task No_muestra_la_asistencia_de_otro_pasajero()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var otro = await CrearOtroPasajeroAsync(contexto);
        var propio = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        var ajeno = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        await AgregarAsistenciaAsync(contexto, propio, _base.IdPasajero, EstadoAsistencia.VALIDA);
        await AgregarAsistenciaAsync(contexto, ajeno, otro.IdPasajero, EstadoAsistencia.VALIDA);

        var operacion = CrearOperacion(contexto);
        var lista = await operacion.ListarMisServiciosAsync(idUsuario, null, null, null, null, null);
        var listaAjena = await operacion.ListarMisServiciosAsync(otro.IdUsuario, null, null, null, null, null);

        Assert.Equal(propio, Assert.Single(lista).IdServicio);
        Assert.Equal(ajeno, Assert.Single(listaAjena).IdServicio);
    }

    [Fact]
    public async Task El_filtro_de_confirmacion_no_incorpora_asistencias_sin_planificacion()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var planificado = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.PROGRAMADO);
        var suelto = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        await _base.AgregarPasajeroAsync(contexto, planificado);
        await AgregarAsistenciaAsync(contexto, suelto, _base.IdPasajero, EstadoAsistencia.VALIDA);

        var operacion = CrearOperacion(contexto);
        var lista = await operacion.ListarMisServiciosAsync(
            idUsuario,
            null,
            null,
            null,
            null,
            EstadoConfirmacionViaje.CONFIRMADO);

        Assert.Equal(planificado, Assert.Single(lista).IdServicio);
    }

    [Fact]
    public async Task El_proximo_puede_ser_un_servicio_en_curso_solo_con_asistencia()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var programado = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 18), EstadoServicio.PROGRAMADO, new TimeOnly(12, 30));
        var enCurso = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 18), EstadoServicio.EN_CURSO, new TimeOnly(15, 0));
        await _base.AgregarPasajeroAsync(contexto, programado);
        await AgregarAsistenciaAsync(contexto, enCurso, _base.IdPasajero, EstadoAsistencia.VALIDA);

        var operacion = CrearOperacion(contexto, RelojChile.AUtc(new DateTime(2026, 10, 18, 12, 20, 0)));
        var proximo = await operacion.ObtenerProximoAsync(idUsuario);

        Assert.NotNull(proximo);
        Assert.Equal(enCurso, proximo.IdServicio);
        Assert.False(proximo.Planificado);
        Assert.Null(proximo.EstadoConfirmacion);
        Assert.Null(proximo.PuntoRecogida);
        Assert.Equal(EstadoAsistencia.VALIDA, proximo.EstadoAsistencia);
    }

    [Fact]
    public async Task El_detalle_y_la_ruta_admiten_la_asistencia_propia_y_rechazan_la_ajena()
    {
        await using var contexto = _base.Crear();
        var idUsuario = await VincularPasajeroSemillaAsync(contexto);
        var otro = await CrearOtroPasajeroAsync(contexto);
        var idServicio = await CrearServicioAsync(contexto, new DateOnly(2026, 10, 25), EstadoServicio.EN_CURSO);
        await AgregarAsistenciaAsync(contexto, idServicio, _base.IdPasajero, EstadoAsistencia.PROVISIONAL);

        var operacion = CrearOperacion(contexto);
        var detalle = await operacion.ObtenerDetalleAsync(idServicio, idUsuario);

        Assert.False(detalle.Planificado);
        Assert.Null(detalle.EstadoConfirmacion);
        Assert.Null(detalle.FechaConfirmacion);
        Assert.Null(detalle.PuntoRecogida);
        Assert.Equal(EstadoAsistencia.PROVISIONAL, detalle.Asistencia.EstadoAsistencia);
        Assert.Equal(TipoAsistencia.NO_PLANIFICADA, detalle.Asistencia.TipoAsistencia);

        var ajeno = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            operacion.ObtenerDetalleAsync(idServicio, otro.IdUsuario));
        Assert.Equal(StatusCodes.Status403Forbidden, ajeno.CodigoEstado);

        var rutaPropia = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            operacion.ObtenerRutaAsync(idServicio, idUsuario));
        Assert.Equal(StatusCodes.Status404NotFound, rutaPropia.CodigoEstado);

        var rutaAjena = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            operacion.ObtenerRutaAsync(idServicio, otro.IdUsuario));
        Assert.Equal(StatusCodes.Status403Forbidden, rutaAjena.CodigoEstado);
    }

    public void Dispose() => _base.Dispose();

    private async Task<int> VincularPasajeroSemillaAsync(Datos.MySQL.TransporteContext contexto)
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

    private async Task<(int IdUsuario, int IdPasajero)> CrearOtroPasajeroAsync(Datos.MySQL.TransporteContext contexto)
    {
        var idRol = await contexto.Usuarios
            .Where(u => u.IdUsuario == _base.IdUsuarioConductor)
            .Select(u => u.IdRol)
            .SingleAsync();
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

        var sufijo = Guid.NewGuid().ToString("N")[..4];
        var pasajero = new Pasajero
        {
            IdEmpresa = _base.IdEmpresa,
            IdUsuario = usuario.IdUsuario,
            Nombre = "Otro pasajero",
            Rut = $"9{sufijo}-K",
            Telefono = "444444444",
            Direccion = "Otra direccion",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Pasajeros.Add(pasajero);
        await contexto.SaveChangesAsync();
        return (usuario.IdUsuario, pasajero.IdPasajero);
    }

    private async Task<int> CrearServicioAsync(
        Datos.MySQL.TransporteContext contexto,
        DateOnly fecha,
        EstadoServicio estado,
        TimeOnly? inicio = null)
    {
        var horaInicio = inicio ?? new TimeOnly(8, 0);
        var servicio = await _base.CrearServicioAsync(
            contexto,
            fecha,
            horaInicio,
            horaInicio.AddHours(1),
            estado);
        servicio.IdRuta = "sin-mongo";
        await contexto.SaveChangesAsync();
        return servicio.IdServicio;
    }

    private static Task AgregarAsistenciaAsync(
        Datos.MySQL.TransporteContext contexto,
        int idServicio,
        int idPasajero,
        EstadoAsistencia estado)
    {
        contexto.Asistencias.Add(new Asistencia
        {
            IdServicio = idServicio,
            IdPasajero = idPasajero,
            FechaHora = DateTime.UtcNow,
            Metodo = MetodoAsistencia.QR,
            TipoAsistencia = TipoAsistencia.NO_PLANIFICADA,
            ExcedeCapacidad = false,
            Estado = estado
        });
        return contexto.SaveChangesAsync();
    }

    private static ServicioOperacionPasajero CrearOperacion(
        Datos.MySQL.TransporteContext contexto,
        DateTime? ahoraUtc = null)
    {
        return new ServicioOperacionPasajero(
            contexto,
            null!,
            new RelojFijo(ahoraUtc ?? DateTime.UtcNow),
            NullLogger<ServicioOperacionPasajero>.Instance);
    }

    private sealed class RelojFijo : IRelojOperacion
    {
        public RelojFijo(DateTime utcAhora) => UtcAhora = DateTime.SpecifyKind(utcAhora, DateTimeKind.Utc);

        public DateTime UtcAhora { get; }
    }
}
