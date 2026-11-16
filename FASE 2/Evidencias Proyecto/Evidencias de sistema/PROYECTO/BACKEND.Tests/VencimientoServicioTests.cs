using BACKEND.Negocio.Tiempo;

namespace BACKEND.Tests;

public class VencimientoServicioTests
{
    [Fact]
    public void CumpleExactamenteALasDoceHoras()
    {
        var zona = ZonaChile();
        var fin = new DateTime(2026, 10, 17, 8, 30, 0, DateTimeKind.Unspecified);
        var vencimiento = TimeZoneInfo.ConvertTimeToUtc(fin, zona).AddHours(12);
        var fecha = new DateOnly(2026, 10, 17);
        var horaFin = new TimeOnly(8, 30);

        Assert.Equal(vencimiento, VencimientoServicio.EnUtc(fecha, horaFin));
        Assert.True(VencimientoServicio.Cumplido(fecha, horaFin, vencimiento));
        Assert.False(VencimientoServicio.Cumplido(fecha, horaFin, vencimiento.AddTicks(-1)));
    }

    [Fact]
    public void UnFinALas16VenceALas4DelDiaSiguiente()
    {
        var zona = ZonaChile();
        var fin = new DateTime(2026, 10, 17, 16, 0, 0, DateTimeKind.Unspecified);
        var vencimiento = TimeZoneInfo.ConvertTimeToUtc(fin, zona).AddHours(12);
        var local = TimeZoneInfo.ConvertTimeFromUtc(vencimiento, zona);

        Assert.Equal(new DateTime(2026, 10, 18, 4, 0, 0), local);
        Assert.Equal(vencimiento, VencimientoServicio.EnUtc(new DateOnly(2026, 10, 17), new TimeOnly(16, 0)));
        Assert.True(VencimientoServicio.Cumplido(new DateOnly(2026, 10, 17), new TimeOnly(16, 0), vencimiento));
        Assert.False(VencimientoServicio.Cumplido(
            new DateOnly(2026, 10, 17),
            new TimeOnly(16, 0),
            vencimiento.AddSeconds(-1)));
    }

    [Fact]
    public void DoceHorasSeCuentanSobreElInstanteUtcCuandoCambiaElHorarioDeVerano()
    {
        var zona = ZonaChile();
        var distinta = BuscarDiaConDesfaseDistinto(zona);
        Assert.NotNull(distinta);

        Assert.Equal(
            distinta.PorInstante,
            VencimientoServicio.EnUtc(DateOnly.FromDateTime(distinta.FinLocal), TimeOnly.FromDateTime(distinta.FinLocal)));
        Assert.NotEqual(distinta.PorPared, distinta.PorInstante);
    }

    private static DiaConDesfase? BuscarDiaConDesfaseDistinto(TimeZoneInfo zona)
    {
        for (var dia = new DateTime(2024, 1, 1); dia < new DateTime(2027, 1, 1); dia = dia.AddDays(1))
        {
            var finLocal = new DateTime(dia.Year, dia.Month, dia.Day, 20, 0, 0, DateTimeKind.Unspecified);
            if (zona.IsInvalidTime(finLocal))
            {
                continue;
            }

            var paredMasDoce = finLocal.AddHours(12);
            if (zona.IsInvalidTime(paredMasDoce) || zona.IsAmbiguousTime(paredMasDoce) || zona.IsAmbiguousTime(finLocal))
            {
                continue;
            }

            var porInstante = TimeZoneInfo.ConvertTimeToUtc(finLocal, zona).AddHours(12);
            var porPared = TimeZoneInfo.ConvertTimeToUtc(paredMasDoce, zona);
            if (porInstante != porPared)
            {
                return new DiaConDesfase(finLocal, porInstante, porPared);
            }
        }

        return null;
    }

    private static TimeZoneInfo ZonaChile()
    {
        if (TimeZoneInfo.TryFindSystemTimeZoneById("America/Santiago", out var iana))
        {
            return iana;
        }

        if (TimeZoneInfo.TryFindSystemTimeZoneById("Pacific SA Standard Time", out var windows))
        {
            return windows;
        }

        throw new InvalidOperationException("No está disponible la zona horaria de Chile.");
    }

    private sealed record DiaConDesfase(DateTime FinLocal, DateTime PorInstante, DateTime PorPared);
}
