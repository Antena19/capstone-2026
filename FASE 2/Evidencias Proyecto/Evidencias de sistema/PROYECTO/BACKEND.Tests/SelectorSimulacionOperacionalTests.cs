using BACKEND.Modelos;
using BACKEND.Negocio.Simulacion;
using BACKEND.Negocio.Tiempo;

namespace BACKEND.Tests;

public class SelectorSimulacionOperacionalTests
{
    private static readonly DateTime Ahora = EnChile(2026, 11, 11, 22, 0);

    [Fact]
    public void ServicioElegibleSeleccionaAsistentes()
    {
        var pasajeros = new[]
        {
            Pasajero(5),
            Pasajero(4),
            Pasajero(3),
            Pasajero(2),
            Pasajero(1)
        };
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { IdServicio = 10, Pasajeros = pasajeros },
            Ahora);

        Assert.True(evaluacion.PuedeSimular);
        Assert.Equal(MotivoOmisionSimulacion.Ninguno, evaluacion.Motivo);
        Assert.Equal(0.80m, evaluacion.Tasa);
        Assert.Equal(4, evaluacion.IdsPasajerosAsistentes.Count);
        Assert.Equal(Esperados(10, pasajeros.Select(p => p.IdPasajero)), evaluacion.IdsPasajerosAsistentes);
    }

    [Fact]
    public void OmiteOtraEmpresa()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(Base() with { IdEmpresa = 2 }, Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.OtraEmpresa);
    }

    [Fact]
    public void OmiteOtraPlanificacion()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(Base() with { IdPlanificacion = 3 }, Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.OtraPlanificacion);
    }

    [Theory]
    [InlineData(EstadoServicio.FINALIZADO)]
    [InlineData(EstadoServicio.CANCELADO)]
    [InlineData(EstadoServicio.EN_CURSO)]
    public void OmiteEstadoDistintoDeProgramado(EstadoServicio estado)
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(Base() with { Estado = estado }, Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.EstadoDistintoDeProgramado);
    }

    [Fact]
    public void OmiteAsistenciaPrevia()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { TieneAsistenciaPrevia = true },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.AsistenciaPrevia);
    }

    [Fact]
    public void OmiteInicioReal()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { FechaHoraInicioReal = Ahora },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.InicioRealRegistrado);
    }

    [Fact]
    public void OmiteCuandoElFinTodaviaNoOcurre()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { HoraFin = new TimeOnly(23, 0) },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.FinProgramadoPendiente);
    }

    [Fact]
    public void OmiteSinAsignacionActiva()
    {
        var reemplazada = new AsignacionCandidataSimulacion(EstadoAsignacionServicio.REEMPLAZADA, 12);
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { Asignaciones = [reemplazada] },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.SinAsignacionActiva);
    }

    [Fact]
    public void OmiteCuandoLosPlanificadosSuperanLaCapacidad()
    {
        var pasajeros = new[] { Pasajero(1), Pasajero(2), Pasajero(3) };
        var asignacion = new AsignacionCandidataSimulacion(EstadoAsignacionServicio.ACTIVA, 2);
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { Asignaciones = [asignacion], Pasajeros = pasajeros },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.CapacidadInsuficiente);
    }

    [Fact]
    public void LaCapacidadCuentaAsociacionesActivasAunqueElPasajeroNoSeaElegible()
    {
        var pasajeros = new[]
        {
            Pasajero(1, estado: EstadoRegistro.INACTIVO),
            Pasajero(2, estado: EstadoRegistro.INACTIVO)
        };
        var asignacion = new AsignacionCandidataSimulacion(EstadoAsignacionServicio.ACTIVA, 1);
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { Asignaciones = [asignacion], Pasajeros = pasajeros },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.CapacidadInsuficiente);
    }

    [Fact]
    public void ServicioSinPasajerosPuedeSimularse()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(Base(), Ahora);

        Assert.True(evaluacion.PuedeSimular);
        Assert.Equal(0.80m, evaluacion.Tasa);
        Assert.Empty(evaluacion.IdsPasajerosAsistentes);
    }

    [Fact]
    public void ExcluyeInactivosDeOtraEmpresaYAsociacionesNoActivas()
    {
        var propios = new[] { Pasajero(1), Pasajero(2), Pasajero(3), Pasajero(4), Pasajero(5) };
        var pasajeros = propios.Concat(new[]
        {
            Pasajero(6, estado: EstadoRegistro.INACTIVO),
            Pasajero(7, empresa: 2),
            Pasajero(8, asociacion: EstadoPasajeroServicio.CANCELADO)
        }).ToArray();

        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { IdServicio = 10, Pasajeros = pasajeros },
            Ahora);

        Assert.True(evaluacion.PuedeSimular);
        Assert.Equal(Esperados(10, propios.Select(p => p.IdPasajero)), evaluacion.IdsPasajerosAsistentes);
        Assert.DoesNotContain(6, evaluacion.IdsPasajerosAsistentes);
        Assert.DoesNotContain(7, evaluacion.IdsPasajerosAsistentes);
        Assert.DoesNotContain(8, evaluacion.IdsPasajerosAsistentes);
    }

    [Fact]
    public void LaTasaQuedaEntreSetentaYCienPorCiento()
    {
        for (var id = 1; id <= 93; id++)
        {
            var tasa = SelectorSimulacionOperacional.TasaAsistencia(id);
            Assert.Equal((70m + id % 31) / 100m, tasa);
            Assert.InRange(tasa, 0.70m, 1.00m);
        }

        Assert.Equal(0.70m, SelectorSimulacionOperacional.TasaAsistencia(31));
        Assert.Equal(1.00m, SelectorSimulacionOperacional.TasaAsistencia(30));
    }

    [Fact]
    public void LaSeleccionEsDeterministaEntreEjecuciones()
    {
        var candidato = Base() with
        {
            IdServicio = 41,
            Pasajeros = Enumerable.Range(1, 12).Select(id => Pasajero(id)).ToArray()
        };

        var primera = SelectorSimulacionOperacional.Evaluar(candidato, Ahora);
        var segunda = SelectorSimulacionOperacional.Evaluar(candidato, Ahora);

        Assert.True(primera.PuedeSimular);
        Assert.Equal(primera.IdsPasajerosAsistentes, segunda.IdsPasajerosAsistentes);
        Assert.Equal(primera.Tasa, segunda.Tasa);
    }

    [Fact]
    public void LaSeleccionNoDependeDelOrdenDeLosPasajeros()
    {
        var ascendente = Enumerable.Range(1, 12).Select(id => Pasajero(id)).ToArray();
        var descendente = ascendente.Reverse().ToArray();

        var enOrden = SelectorSimulacionOperacional.Evaluar(
            Base() with { IdServicio = 41, Pasajeros = ascendente },
            Ahora);
        var invertido = SelectorSimulacionOperacional.Evaluar(
            Base() with { IdServicio = 41, Pasajeros = descendente },
            Ahora);

        Assert.Equal(enOrden.IdsPasajerosAsistentes, invertido.IdsPasajerosAsistentes);
        Assert.Equal(Esperados(41, ascendente.Select(p => p.IdPasajero)), enOrden.IdsPasajerosAsistentes);
    }

    [Fact]
    public void ElTerminoIncluyeElInstanteExacto()
    {
        var fin = EnChile(2026, 11, 11, 22, 0);
        var candidato = Base() with { HoraFin = new TimeOnly(22, 0) };

        var exacto = SelectorSimulacionOperacional.Evaluar(candidato, fin);
        var anterior = SelectorSimulacionOperacional.Evaluar(candidato, fin.AddTicks(-1));

        Assert.True(exacto.PuedeSimular);
        AssertOmision(anterior, MotivoOmisionSimulacion.FinProgramadoPendiente);
    }

    [Fact]
    public void ElTerminoUsaLaHoraDeChileCuandoUtcYaCambioDeDia()
    {
        var ahora = EnChile(2026, 11, 9, 21, 0);
        Assert.Equal(new DateOnly(2026, 11, 10), DateOnly.FromDateTime(ahora));

        var yaTerminado = SelectorSimulacionOperacional.Evaluar(
            Base() with { Fecha = new DateOnly(2026, 11, 9), HoraFin = new TimeOnly(20, 0) },
            ahora);
        var todaviaEnCurso = SelectorSimulacionOperacional.Evaluar(
            Base() with { Fecha = new DateOnly(2026, 11, 9), HoraFin = new TimeOnly(22, 0) },
            ahora);

        Assert.True(yaTerminado.PuedeSimular);
        AssertOmision(todaviaEnCurso, MotivoOmisionSimulacion.FinProgramadoPendiente);
        Assert.True(SelectorSimulacionOperacional.TerminoAlcanzado(
            new DateOnly(2026, 11, 9),
            new TimeOnly(20, 0),
            ahora));
        Assert.False(SelectorSimulacionOperacional.TerminoAlcanzado(
            new DateOnly(2026, 11, 9),
            new TimeOnly(22, 0),
            ahora));
    }

    [Fact]
    public void OmitePasajerosDuplicados()
    {
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { Pasajeros = [Pasajero(1), Pasajero(1)] },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.PasajerosDuplicados);
    }

    [Fact]
    public void OmiteCapacidadCero()
    {
        var asignacion = new AsignacionCandidataSimulacion(EstadoAsignacionServicio.ACTIVA, 0);
        var evaluacion = SelectorSimulacionOperacional.Evaluar(
            Base() with { Asignaciones = [asignacion] },
            Ahora);

        AssertOmision(evaluacion, MotivoOmisionSimulacion.CapacidadInvalida);
    }

    private static void AssertOmision(EvaluacionSimulacionOperacional evaluacion, MotivoOmisionSimulacion motivo)
    {
        Assert.False(evaluacion.PuedeSimular);
        Assert.Equal(motivo, evaluacion.Motivo);
        Assert.Equal(SelectorSimulacionOperacional.Describir(motivo), evaluacion.Mensaje);
        Assert.Equal(0m, evaluacion.Tasa);
        Assert.Empty(evaluacion.IdsPasajerosAsistentes);
    }

    private static IReadOnlyList<int> Esperados(int idServicio, IEnumerable<int> ids)
    {
        return SelectorSimulacionOperacional.Seleccionar(idServicio, ids.ToArray());
    }

    private static CandidatoSimulacionOperacional Base()
    {
        return new CandidatoSimulacionOperacional(
            10,
            SelectorSimulacionOperacional.IdEmpresaDemostracion,
            SelectorSimulacionOperacional.IdPlanificacionDemostracion,
            EstadoServicio.PROGRAMADO,
            new DateOnly(2026, 11, 11),
            new TimeOnly(18, 0),
            null,
            null,
            false,
            [new AsignacionCandidataSimulacion(EstadoAsignacionServicio.ACTIVA, 12)],
            Array.Empty<PasajeroCandidatoSimulacion>());
    }

    private static PasajeroCandidatoSimulacion Pasajero(
        int id,
        int empresa = SelectorSimulacionOperacional.IdEmpresaDemostracion,
        EstadoRegistro estado = EstadoRegistro.ACTIVO,
        EstadoPasajeroServicio asociacion = EstadoPasajeroServicio.ACTIVO)
    {
        return new PasajeroCandidatoSimulacion(id, empresa, estado, asociacion);
    }

    private static DateTime EnChile(int anio, int mes, int dia, int hora, int minuto)
    {
        return RelojChile.AUtc(new DateTime(anio, mes, dia, hora, minuto, 0));
    }
}
