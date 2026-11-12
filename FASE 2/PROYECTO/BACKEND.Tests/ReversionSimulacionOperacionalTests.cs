using BACKEND.Modelos;
using BACKEND.Negocio.Simulacion;

namespace BACKEND.Tests;

public class ReversionSimulacionOperacionalTests
{
    private static readonly DateTime Inicio = new(2026, 11, 16, 10, 2, 0, DateTimeKind.Utc);
    private static readonly DateTime Fin = new(2026, 11, 16, 12, 5, 0, DateTimeKind.Utc);

    [Fact]
    public void RevierteUnServicioFinalizadoSinAsistencias()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(Solicitud(ServicioCoincide()));

        Assert.True(evaluacion.PuedeRevertir);
        Assert.Equal(MotivoRechazoReversion.Ninguno, evaluacion.Motivo);
        Assert.Null(evaluacion.IdServicio);
    }

    [Fact]
    public void RevierteCuandoLasAsistenciasCoincidenSinImportarElOrden()
    {
        var servicio = ServicioCoincide() with
        {
            IdsAsistenciasMarcadas = new int?[] { 9, 4 },
            IdsAsistenciasActuales = new[] { 4, 9 }
        };

        var evaluacion = ReversionSimulacionOperacional.Evaluar(Solicitud(servicio));

        Assert.True(evaluacion.PuedeRevertir);
    }

    [Fact]
    public void LaHoraCoincideAunqueElKindDifiera()
    {
        var servicio = ServicioCoincide() with
        {
            InicioRealActual = DateTime.SpecifyKind(Inicio, DateTimeKind.Unspecified),
            FinRealActual = DateTime.SpecifyKind(Fin, DateTimeKind.Local)
        };

        var evaluacion = ReversionSimulacionOperacional.Evaluar(Solicitud(servicio));

        Assert.True(evaluacion.PuedeRevertir);
    }

    [Theory]
    [InlineData(EstadoLoteSimulacion.EN_CURSO)]
    [InlineData(EstadoLoteSimulacion.REVERTIDO)]
    public void RechazaUnLoteQueNoEstaCompletado(EstadoLoteSimulacion estado)
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(
            new SolicitudReversionSimulacion(estado, [ServicioCoincide()]));

        AssertRechazo(evaluacion, MotivoRechazoReversion.LoteNoCompletado, null);
    }

    [Fact]
    public void RechazaUnaMarcaQueYaFueRevertida()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(
            Solicitud(ServicioCoincide() with { EstadoMarca = EstadoMarcaSimulacion.REVERTIDO }));

        AssertRechazo(evaluacion, MotivoRechazoReversion.MarcaNoVigente, 67);
    }

    [Fact]
    public void RechazaSiElEstadoActualCambio()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(
            Solicitud(ServicioCoincide() with { EstadoActual = EstadoServicio.EN_CURSO }));

        AssertRechazo(evaluacion, MotivoRechazoReversion.EstadoDistintoDelPosterior, 67);
    }

    [Fact]
    public void RechazaSiLaHoraRealCambio()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(
            Solicitud(ServicioCoincide() with { FinRealActual = Fin.AddMinutes(5) }));

        AssertRechazo(evaluacion, MotivoRechazoReversion.FinRealDistinto, 67);
    }

    [Fact]
    public void RechazaSiAparecioUnaAsistenciaAjena()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(
            Solicitud(ServicioCoincide() with
            {
                IdsAsistenciasMarcadas = new int?[] { 4 },
                IdsAsistenciasActuales = new[] { 4, 8 }
            }));

        AssertRechazo(evaluacion, MotivoRechazoReversion.AsistenciasDistintas, 67);
    }

    [Fact]
    public void RechazaUnaMarcaDeAsistenciaSinIdentificador()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(
            Solicitud(ServicioCoincide() with
            {
                IdsAsistenciasMarcadas = new int?[] { null }
            }));

        AssertRechazo(evaluacion, MotivoRechazoReversion.AsistenciaSinIdentificador, 67);
    }

    [Fact]
    public void SeDetieneEnElPrimerServicioQueNoCoincide()
    {
        var evaluacion = ReversionSimulacionOperacional.Evaluar(new SolicitudReversionSimulacion(
            EstadoLoteSimulacion.COMPLETADO,
            [
                ServicioCoincide(),
                ServicioCoincide() with { IdServicio = 78, EstadoActual = EstadoServicio.CANCELADO },
                ServicioCoincide() with { IdServicio = 84, FinRealActual = Fin.AddHours(1) }
            ]));

        AssertRechazo(evaluacion, MotivoRechazoReversion.EstadoDistintoDelPosterior, 78);
    }

    private static void AssertRechazo(
        EvaluacionReversionSimulacion evaluacion,
        MotivoRechazoReversion motivo,
        int? idServicio)
    {
        Assert.False(evaluacion.PuedeRevertir);
        Assert.Equal(motivo, evaluacion.Motivo);
        Assert.Equal(ReversionSimulacionOperacional.Describir(motivo), evaluacion.Mensaje);
        Assert.Equal(idServicio, evaluacion.IdServicio);
    }

    private static SolicitudReversionSimulacion Solicitud(ServicioObservadoParaReversion servicio)
    {
        return new SolicitudReversionSimulacion(EstadoLoteSimulacion.COMPLETADO, [servicio]);
    }

    private static ServicioObservadoParaReversion ServicioCoincide()
    {
        return new ServicioObservadoParaReversion(
            67,
            EstadoMarcaSimulacion.VIGENTE,
            EstadoServicio.FINALIZADO,
            Inicio,
            Fin,
            null,
            EstadoServicio.FINALIZADO,
            Inicio,
            Fin,
            null,
            Array.Empty<int?>(),
            Array.Empty<int>());
    }
}
