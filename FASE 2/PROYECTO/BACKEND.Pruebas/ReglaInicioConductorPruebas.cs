using BACKEND.Modelos;
using BACKEND.Negocio.Tiempo;
using Xunit;

namespace BACKEND.Pruebas;

public class ReglaInicioConductorPruebas
{
    private static readonly DateOnly Fecha = new(2026, 10, 17);
    private static readonly TimeOnly HoraInicio = new(7, 0, 0);

    [Fact]
    public void Antes_de_las_0650_no_permite_iniciar()
    {
        var ahora = new DateTime(2026, 10, 17, 6, 49, 59);

        Assert.Equal(ReglaInicioConductor.Disponibilidad.Antes, ReglaInicioConductor.Evaluar(Fecha, HoraInicio, ahora));
        Assert.False(ReglaInicioConductor.DebeCancelarPorFaltaDeInicio(EstadoServicio.PROGRAMADO, Fecha, HoraInicio, ahora));
    }

    [Fact]
    public void Desde_las_0650_hasta_antes_de_las_0730_permite_iniciar()
    {
        Assert.Equal(
            ReglaInicioConductor.Disponibilidad.Disponible,
            ReglaInicioConductor.Evaluar(Fecha, HoraInicio, new DateTime(2026, 10, 17, 6, 50, 0)));
        Assert.Equal(
            ReglaInicioConductor.Disponibilidad.Disponible,
            ReglaInicioConductor.Evaluar(Fecha, HoraInicio, new DateTime(2026, 10, 17, 7, 29, 59)));
    }

    [Fact]
    public void A_las_0730_impide_el_inicio_y_marca_falta_de_inicio_si_sigue_programado()
    {
        var ahora = new DateTime(2026, 10, 17, 7, 30, 0);

        Assert.Equal(ReglaInicioConductor.Disponibilidad.Vencido, ReglaInicioConductor.Evaluar(Fecha, HoraInicio, ahora));
        Assert.True(ReglaInicioConductor.DebeCancelarPorFaltaDeInicio(EstadoServicio.PROGRAMADO, Fecha, HoraInicio, ahora));
        Assert.Equal("FALTA_DE_INICIO", ReglaInicioConductor.MotivoFaltaDeInicio);
    }

    [Fact]
    public void Un_servicio_en_curso_no_se_cancela_por_esta_regla()
    {
        var ahora = new DateTime(2026, 10, 17, 8, 0, 0);

        Assert.False(ReglaInicioConductor.DebeCancelarPorFaltaDeInicio(EstadoServicio.EN_CURSO, Fecha, HoraInicio, ahora));
        Assert.False(ReglaInicioConductor.DebeCancelarPorFaltaDeInicio(EstadoServicio.FINALIZADO, Fecha, HoraInicio, ahora));
        Assert.False(ReglaInicioConductor.DebeCancelarPorFaltaDeInicio(EstadoServicio.CANCELADO, Fecha, HoraInicio, ahora));
    }

    [Fact]
    public void La_ventana_puede_abrir_el_dia_anterior_cuando_el_inicio_es_de_madrugada()
    {
        var fecha = new DateOnly(2026, 10, 18);
        var hora = new TimeOnly(0, 5, 0);

        Assert.Equal(
            ReglaInicioConductor.Disponibilidad.Disponible,
            ReglaInicioConductor.Evaluar(fecha, hora, new DateTime(2026, 10, 17, 23, 55, 0)));
        Assert.Equal(
            ReglaInicioConductor.Disponibilidad.Antes,
            ReglaInicioConductor.Evaluar(fecha, hora, new DateTime(2026, 10, 17, 23, 54, 59)));
    }

    [Fact]
    public void El_proceso_automatico_incluye_hoy_y_ayer_y_excluye_el_historial_antiguo()
    {
        var hoy = new DateOnly(2026, 10, 17);

        Assert.True(ReglaInicioConductor.EnAlcanceAutomatico(hoy, hoy));
        Assert.True(ReglaInicioConductor.EnAlcanceAutomatico(hoy.AddDays(-1), hoy));
        Assert.False(ReglaInicioConductor.EnAlcanceAutomatico(new DateOnly(2026, 9, 16), hoy));
    }

    [Fact]
    public void La_zona_de_Chile_no_aplica_un_desfase_fijo_entre_verano_e_invierno()
    {
        var verano = RelojChile.AUtc(new DateTime(2026, 1, 15, 12, 0, 0));
        var invierno = RelojChile.AUtc(new DateTime(2026, 7, 15, 12, 0, 0));
        var diasEntreFechas = new DateTime(2026, 7, 15) - new DateTime(2026, 1, 15);

        Assert.Equal(diasEntreFechas + TimeSpan.FromHours(1), invierno - verano);
    }
}
