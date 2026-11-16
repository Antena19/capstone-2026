using BACKEND.DTOs.Reportes;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Servicios;
using BACKEND.Tests.Soporte;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Tests;

public sealed class MetodoRegistroReporteTests : IDisposable
{
    private readonly BasePruebasServicio _base = new();

    [Fact]
    public async Task El_reporte_distingue_qr_manual_y_pasajero_sin_asistencia()
    {
        await using var contexto = _base.Crear();
        var manual = await CrearPasajeroAsync(contexto, "Pasajero manual", "33333333-3");
        var ausente = await CrearPasajeroAsync(contexto, "Pasajero ausente", "44444444-4");
        var servicio = await CrearServicioAsync(contexto);

        contexto.PasajerosServicio.AddRange(
            Asociacion(servicio.IdServicio, _base.IdPasajero, EstadoConfirmacionViaje.CONFIRMADO),
            Asociacion(servicio.IdServicio, ausente, EstadoConfirmacionViaje.PENDIENTE));
        contexto.Asistencias.AddRange(
            Asistencia(servicio.IdServicio, _base.IdPasajero, MetodoAsistencia.QR, TipoAsistencia.PLANIFICADA),
            Asistencia(servicio.IdServicio, manual, MetodoAsistencia.MANUAL, TipoAsistencia.NO_PLANIFICADA));
        await contexto.SaveChangesAsync();

        var filas = await new ServicioReportes(contexto, null!, null!)
            .ListarPasajerosServicioAsync(servicio.IdServicio);

        var porQr = Assert.Single(filas, fila => fila.IdPasajero == _base.IdPasajero);
        var porManual = Assert.Single(filas, fila => fila.IdPasajero == manual);
        var sinAsistencia = Assert.Single(filas, fila => fila.IdPasajero == ausente);

        Assert.Equal(MetodoAsistencia.QR, porQr.Metodo);
        Assert.Equal(TipoAsistencia.PLANIFICADA, porQr.TipoAsistencia);
        Assert.Equal(EstadoConfirmacionViaje.CONFIRMADO, porQr.EstadoConfirmacion);
        Assert.True(porQr.TieneAsistencia);

        Assert.Equal(MetodoAsistencia.MANUAL, porManual.Metodo);
        Assert.Equal(TipoAsistencia.NO_PLANIFICADA, porManual.TipoAsistencia);
        Assert.False(porManual.EstabaPlanificado);
        Assert.Null(porManual.EstadoConfirmacion);

        Assert.Null(sinAsistencia.Metodo);
        Assert.Null(sinAsistencia.TipoAsistencia);
        Assert.False(sinAsistencia.TieneAsistencia);
        Assert.Equal(ResultadoAsistenciaReporte.AUSENTE, sinAsistencia.Resultado);
        Assert.Equal(EstadoConfirmacionViaje.PENDIENTE, sinAsistencia.EstadoConfirmacion);
    }

    [Fact]
    public void El_excel_agrega_el_metodo_sin_mover_las_columnas_ni_los_totales()
    {
        var resumen = new ReporteMensualResumenDto
        {
            PersonasPlanificadas = 4,
            PlanificadosTransportados = 2,
            PlanificadosNoTransportados = 2,
            NoPlanificadosTransportados = 1,
            TotalTransportados = 3
        };
        var reporte = new ReporteServiciosRangoDto
        {
            Desde = new DateOnly(2026, 10, 18),
            Hasta = new DateOnly(2026, 10, 18),
            RazonSocial = "Empresa prueba",
            Resumen = resumen,
            Servicios = []
        };
        var pasajeros = new List<ReportePasajeroServicioDto>
        {
            Fila("Ana", MetodoAsistencia.QR, TipoAsistencia.PLANIFICADA),
            Fila("Luis", MetodoAsistencia.MANUAL, TipoAsistencia.NO_PLANIFICADA),
            Fila("Marta", null, null)
        };

        var archivo = new ServicioExportacionExcel().GenerarServicios(reporte, pasajeros);

        using var libro = new XLWorkbook(new MemoryStream(archivo.Contenido));
        var pasajerosHoja = libro.Worksheet("Detalle pasajeros");
        var resumenHoja = libro.Worksheet("Resumen");

        Assert.Equal("Tipo asistencia", pasajerosHoja.Cell(1, 10).GetString());
        Assert.Equal("Hora asistencia", pasajerosHoja.Cell(1, 11).GetString());
        Assert.Equal("Método de registro", pasajerosHoja.Cell(1, 12).GetString());
        Assert.Equal("PLANIFICADA", pasajerosHoja.Cell(2, 10).GetString());
        Assert.Equal("NO_PLANIFICADA", pasajerosHoja.Cell(3, 10).GetString());
        Assert.Equal(string.Empty, pasajerosHoja.Cell(4, 10).GetString());
        Assert.Equal("Código QR", pasajerosHoja.Cell(2, 12).GetString());
        Assert.Equal("Manual", pasajerosHoja.Cell(3, 12).GetString());
        Assert.Equal(string.Empty, pasajerosHoja.Cell(4, 12).GetString());
        var filaTotal = resumenHoja.Column(1).CellsUsed()
            .Single(celda => celda.GetString() == "Total personas transportadas");
        Assert.Equal(3, resumenHoja.Cell(filaTotal.Address.RowNumber, 2).GetValue<int>());
    }

    public void Dispose() => _base.Dispose();

    private async Task<Servicio> CrearServicioAsync(BACKEND.Datos.MySQL.TransporteContext contexto)
    {
        var servicio = new Servicio
        {
            IdEmpresa = _base.IdEmpresa,
            IdPlanificacion = _base.IdPlanificacion,
            IdRuta = "sin-mongo",
            Fecha = new DateOnly(2026, 10, 18),
            HoraInicio = new TimeOnly(12, 30),
            HoraFin = new TimeOnly(13, 30),
            TipoServicio = TiposServicio.Ida,
            Estado = EstadoServicio.EN_CURSO
        };
        contexto.Servicios.Add(servicio);
        await contexto.SaveChangesAsync();
        return servicio;
    }

    private async Task<int> CrearPasajeroAsync(
        BACKEND.Datos.MySQL.TransporteContext contexto,
        string nombre,
        string rut)
    {
        var pasajero = new Pasajero
        {
            IdEmpresa = _base.IdEmpresa,
            Nombre = nombre,
            Rut = rut,
            Telefono = "222222222",
            Direccion = "Direccion",
            Estado = EstadoRegistro.ACTIVO
        };
        contexto.Pasajeros.Add(pasajero);
        await contexto.SaveChangesAsync();
        return pasajero.IdPasajero;
    }

    private static PasajeroServicio Asociacion(int idServicio, int idPasajero, EstadoConfirmacionViaje confirmacion)
    {
        return new PasajeroServicio
        {
            IdServicio = idServicio,
            IdPasajero = idPasajero,
            EstadoConfirmacion = confirmacion,
            Estado = EstadoPasajeroServicio.ACTIVO
        };
    }

    private static Asistencia Asistencia(
        int idServicio,
        int idPasajero,
        MetodoAsistencia metodo,
        TipoAsistencia tipo)
    {
        return new Asistencia
        {
            IdServicio = idServicio,
            IdPasajero = idPasajero,
            FechaHora = DateTime.UtcNow,
            Metodo = metodo,
            TipoAsistencia = tipo,
            ExcedeCapacidad = false,
            Estado = EstadoAsistencia.VALIDA
        };
    }

    private static ReportePasajeroServicioDto Fila(string nombre, MetodoAsistencia? metodo, TipoAsistencia? tipo)
    {
        return new ReportePasajeroServicioDto
        {
            Nombre = nombre,
            Rut = "1-9",
            TipoAsistencia = tipo,
            Metodo = metodo,
            Resultado = metodo is null ? ResultadoAsistenciaReporte.AUSENTE : ResultadoAsistenciaReporte.PRESENTE
        };
    }
}
