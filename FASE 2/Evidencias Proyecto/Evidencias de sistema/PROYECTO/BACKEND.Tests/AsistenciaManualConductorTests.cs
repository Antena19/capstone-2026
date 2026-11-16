using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Servicios;
using BACKEND.Tests.Soporte;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BACKEND.Tests;

public sealed class AsistenciaManualConductorTests : IDisposable
{
    private readonly BasePruebasServicio _base = new();

    [Fact]
    public async Task El_conductor_asignado_registra_manual_en_un_servicio_en_curso()
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.CONFIRMADO);
        var antes = DateTime.UtcNow;

        var respuesta = await CrearAsistencias(contexto).RegistrarManualComoConductorAsync(
            servicio,
            _base.IdPasajero,
            _base.IdUsuarioConductor);

        var guardada = await contexto.Asistencias.AsNoTracking().SingleAsync();
        Assert.Equal(MetodoAsistencia.MANUAL, respuesta.Metodo);
        Assert.Equal(MetodoAsistencia.MANUAL, guardada.Metodo);
        Assert.Equal(EstadoAsistencia.VALIDA, guardada.Estado);
        Assert.Equal(TipoAsistencia.PLANIFICADA, guardada.TipoAsistencia);
        Assert.Equal(servicio, guardada.IdServicio);
        Assert.Equal(_base.IdPasajero, guardada.IdPasajero);
        Assert.InRange((guardada.FechaHora - antes).TotalMinutes, -1, 2);
    }

    [Fact]
    public async Task Permite_un_pasajero_pendiente_de_confirmacion()
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.PENDIENTE);

        var respuesta = await CrearAsistencias(contexto).RegistrarManualComoConductorAsync(
            servicio,
            _base.IdPasajero,
            _base.IdUsuarioConductor);

        Assert.Equal(MetodoAsistencia.MANUAL, respuesta.Metodo);
        Assert.Equal(EstadoAsistencia.VALIDA, respuesta.Estado);
    }

    [Fact]
    public async Task Rechaza_a_un_conductor_sin_asignacion_activa()
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.CONFIRMADO);
        var otro = await CrearOtroConductorAsync(contexto);

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            CrearAsistencias(contexto).RegistrarManualComoConductorAsync(servicio, _base.IdPasajero, otro));

        Assert.Equal(403, error.CodigoEstado);
        Assert.Equal(0, await contexto.Asistencias.CountAsync());
    }

    [Theory]
    [InlineData(EstadoServicio.PROGRAMADO)]
    [InlineData(EstadoServicio.FINALIZADO)]
    [InlineData(EstadoServicio.CANCELADO)]
    public async Task Rechaza_un_servicio_que_no_esta_en_curso(EstadoServicio estado)
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, estado, EstadoConfirmacionViaje.CONFIRMADO);

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            CrearAsistencias(contexto).RegistrarManualComoConductorAsync(
                servicio,
                _base.IdPasajero,
                _base.IdUsuarioConductor));

        Assert.Equal(400, error.CodigoEstado);
        Assert.Equal(0, await contexto.Asistencias.CountAsync());
    }

    [Fact]
    public async Task Rechaza_un_pasajero_no_planificado()
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.CONFIRMADO);
        var ajeno = await CrearPasajeroAsync(contexto, "44444444-4");

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            CrearAsistencias(contexto).RegistrarManualComoConductorAsync(
                servicio,
                ajeno,
                _base.IdUsuarioConductor));

        Assert.Equal(400, error.CodigoEstado);
    }

    [Fact]
    public async Task Rechaza_un_pasajero_que_rechazo_el_viaje()
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.RECHAZADO);

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            CrearAsistencias(contexto).RegistrarManualComoConductorAsync(
                servicio,
                _base.IdPasajero,
                _base.IdUsuarioConductor));

        Assert.Contains("rechazó", error.Message, StringComparison.Ordinal);
        Assert.Equal(0, await contexto.Asistencias.CountAsync());
    }

    [Fact]
    public async Task Rechaza_una_segunda_asistencia_del_mismo_pasajero()
    {
        await using var contexto = _base.Crear();
        var servicio = await PrepararServicioAsync(contexto, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.CONFIRMADO);
        var asistencias = CrearAsistencias(contexto);
        await asistencias.RegistrarManualComoConductorAsync(servicio, _base.IdPasajero, _base.IdUsuarioConductor);

        var error = await Assert.ThrowsAsync<ExcepcionNegocio>(() =>
            asistencias.RegistrarManualComoConductorAsync(servicio, _base.IdPasajero, _base.IdUsuarioConductor));

        Assert.Equal(409, error.CodigoEstado);
        Assert.Equal(1, await contexto.Asistencias.CountAsync());
    }

    [Fact]
    public async Task Una_carrera_con_el_escaneo_qr_deja_una_sola_asistencia()
    {
        await using var preparacion = _base.Crear();
        var servicio = await PrepararServicioAsync(preparacion, EstadoServicio.EN_CURSO, EstadoConfirmacionViaje.CONFIRMADO);
        await VincularCuentaPasajeroAsync(preparacion);
        var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        preparacion.QrServicios.Add(new QrServicio
        {
            IdServicio = servicio,
            Token = token,
            FechaGeneracion = DateTime.UtcNow,
            FechaExpiracion = DateTime.UtcNow.AddHours(2),
            Estado = EstadoQrServicio.ACTIVO
        });
        await preparacion.SaveChangesAsync();

        var manual = RegistrarEnContextoNuevo(servicio, esQr: false, token);
        var qr = RegistrarEnContextoNuevo(servicio, esQr: true, token);
        var resultados = await Task.WhenAll(Capturar(manual), Capturar(qr));

        await using var lectura = _base.Crear();
        var filas = await lectura.Asistencias.AsNoTracking().ToListAsync();
        Assert.Single(filas);
        Assert.Equal(1, resultados.Count(r => r is null));
        var fallo = Assert.Single(resultados, r => r is not null);
        Assert.Equal(409, fallo!.CodigoEstado);
    }

    public void Dispose() => _base.Dispose();

    private async Task<int> PrepararServicioAsync(
        Datos.MySQL.TransporteContext contexto,
        EstadoServicio estado,
        EstadoConfirmacionViaje confirmacion)
    {
        var horario = BasePruebasServicio.HorarioIniciableAhora();
        var servicio = await _base.CrearServicioAsync(
            contexto,
            horario.Fecha,
            horario.HoraInicio,
            horario.HoraFin,
            estado);
        await _base.AsignarAsync(contexto, servicio.IdServicio);
        contexto.PasajerosServicio.Add(new PasajeroServicio
        {
            IdServicio = servicio.IdServicio,
            IdPasajero = _base.IdPasajero,
            EstadoConfirmacion = confirmacion,
            Estado = EstadoPasajeroServicio.ACTIVO
        });
        await contexto.SaveChangesAsync();
        return servicio.IdServicio;
    }

    private async Task<int> CrearOtroConductorAsync(Datos.MySQL.TransporteContext contexto)
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
        contexto.Conductores.Add(new Conductor
        {
            IdUsuario = usuario.IdUsuario,
            Nombre = "Otro conductor",
            Rut = "33333333-3",
            Telefono = "444444444",
            Estado = EstadoRegistro.ACTIVO
        });
        await contexto.SaveChangesAsync();
        return usuario.IdUsuario;
    }

    private async Task<int> CrearPasajeroAsync(Datos.MySQL.TransporteContext contexto, string rut)
    {
        var pasajero = new Pasajero
        {
            IdEmpresa = _base.IdEmpresa,
            Nombre = "Pasajero ajeno",
            Rut = rut,
            Telefono = "555555555",
            Direccion = "Direccion",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Pasajeros.Add(pasajero);
        await contexto.SaveChangesAsync();
        return pasajero.IdPasajero;
    }

    private async Task<int> VincularCuentaPasajeroAsync(Datos.MySQL.TransporteContext contexto)
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

    private Task RegistrarEnContextoNuevo(int idServicio, bool esQr, string token)
    {
        var idUsuarioPasajero = 0;
        return Task.Run(async () =>
        {
            await using var contexto = _base.Crear();
            if (esQr && idUsuarioPasajero == 0)
            {
                idUsuarioPasajero = await contexto.Pasajeros
                    .Where(p => p.IdPasajero == _base.IdPasajero)
                    .Select(p => p.IdUsuario!.Value)
                    .SingleAsync();
            }

            var asistencias = CrearAsistencias(contexto);
            if (esQr)
            {
                await asistencias.EscanearAsync(token, idUsuarioPasajero);
                return;
            }

            await asistencias.RegistrarManualComoConductorAsync(
                idServicio,
                _base.IdPasajero,
                _base.IdUsuarioConductor);
        });
    }

    private static async Task<ExcepcionNegocio?> Capturar(Task tarea)
    {
        try
        {
            await tarea;
            return null;
        }
        catch (ExcepcionNegocio error)
        {
            return error;
        }
    }

    private static ServicioAsistencias CrearAsistencias(Datos.MySQL.TransporteContext contexto)
    {
        var qr = new ServicioQr(contexto, NullLogger<ServicioQr>.Instance);
        return new ServicioAsistencias(contexto, qr, NullLogger<ServicioAsistencias>.Instance);
    }
}
