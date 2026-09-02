using BACKEND.DTOs.Reportes;
using ClosedXML.Excel;
using System.Text;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioExportacionExcel
    {
        ArchivoExcelDto GenerarMensual(ReporteMensualDto reporte);

        ArchivoExcelDto GenerarServicios(ReporteServiciosRangoDto reporte);
    }

    /// <summary>
    /// Genera archivos .xlsx operacionales a partir de los mismos modelos JSON de reportes.
    /// No recalcula KPI: recibe el resultado ya calculado por <see cref="IServicioMetricasOperacionales"/>.
    /// </summary>
    public class ServicioExportacionExcel : IServicioExportacionExcel
    {
        private const string FormatoFecha = "yyyy-mm-dd";
        private const string FormatoHora = "hh:mm";
        private const string FormatoEntero = "0";
        private const string FormatoPorcentaje = "0.00";

        public ArchivoExcelDto GenerarMensual(ReporteMensualDto reporte)
        {
            using var libro = new XLWorkbook();
            EscribirHojaResumen(
                libro,
                reporte.RazonSocial,
                reporte.Periodo,
                null,
                null,
                reporte.Resumen);
            EscribirHojaDetalle(libro, reporte.Servicios, incluirEmpresa: false);

            return new ArchivoExcelDto
            {
                Contenido = Guardar(libro),
                NombreArchivo = $"Reporte_Operacional_{SanitizarNombreArchivo(reporte.RazonSocial)}_{reporte.Periodo}.xlsx"
            };
        }

        public ArchivoExcelDto GenerarServicios(ReporteServiciosRangoDto reporte)
        {
            var etiquetaEmpresa = reporte.RazonSocial ?? "Todas";
            var periodo = $"{reporte.Desde:yyyy-MM-dd}_{reporte.Hasta:yyyy-MM-dd}";

            using var libro = new XLWorkbook();
            EscribirHojaResumen(
                libro,
                etiquetaEmpresa,
                null,
                reporte.Desde,
                reporte.Hasta,
                reporte.Resumen);
            EscribirHojaDetalle(libro, reporte.Servicios, incluirEmpresa: !reporte.IdEmpresa.HasValue);

            return new ArchivoExcelDto
            {
                Contenido = Guardar(libro),
                NombreArchivo = $"Reporte_Operacional_{SanitizarNombreArchivo(etiquetaEmpresa)}_{periodo}.xlsx"
            };
        }

        private static void EscribirHojaResumen(
            XLWorkbook libro,
            string empresa,
            string? periodo,
            DateOnly? desde,
            DateOnly? hasta,
            ReporteMensualResumenDto resumen)
        {
            var hoja = libro.Worksheets.Add("Resumen mensual");
            var fila = 1;

            hoja.Cell(fila, 1).Value = "Empresa";
            hoja.Cell(fila, 2).Value = empresa;
            fila++;

            if (!string.IsNullOrWhiteSpace(periodo))
            {
                hoja.Cell(fila, 1).Value = "Período";
                hoja.Cell(fila, 2).Value = periodo;
                fila++;
            }

            if (desde.HasValue && hasta.HasValue)
            {
                hoja.Cell(fila, 1).Value = "Desde";
                hoja.Cell(fila, 2).Value = desde.Value.ToDateTime(TimeOnly.MinValue);
                hoja.Cell(fila, 2).Style.DateFormat.Format = FormatoFecha;
                fila++;
                hoja.Cell(fila, 1).Value = "Hasta";
                hoja.Cell(fila, 2).Value = hasta.Value.ToDateTime(TimeOnly.MinValue);
                hoja.Cell(fila, 2).Style.DateFormat.Format = FormatoFecha;
                fila++;
            }

            fila++;
            hoja.Cell(fila, 1).Value = "Indicador";
            hoja.Cell(fila, 2).Value = "Valor";
            EstiloEncabezado(hoja.Range(fila, 1, fila, 2));
            fila++;

            EscribirIndicador(hoja, ref fila, "Servicios planificados", resumen.ServiciosPlanificados);
            EscribirIndicador(hoja, ref fila, "Servicios realizados", resumen.ServiciosRealizados);
            EscribirIndicador(hoja, ref fila, "Servicios cancelados", resumen.ServiciosCancelados);
            EscribirPorcentaje(hoja, ref fila, "% servicios realizados", resumen.PorcentajeServiciosRealizados);

            fila++;
            EscribirIndicador(hoja, ref fila, "Personas planificadas", resumen.PersonasPlanificadas);
            EscribirIndicador(hoja, ref fila, "Planificados transportados", resumen.PlanificadosTransportados);
            EscribirIndicador(hoja, ref fila, "Planificados no transportados", resumen.PlanificadosNoTransportados);
            EscribirIndicador(hoja, ref fila, "No planificados transportados", resumen.NoPlanificadosTransportados);
            EscribirIndicador(hoja, ref fila, "Total personas transportadas", resumen.TotalTransportados);
            EscribirPorcentaje(hoja, ref fila, "% planificados transportados", resumen.PorcentajePlanificadosTransportados);

            hoja.Column(1).Width = 38;
            hoja.Column(2).Width = 28;
            hoja.SheetView.FreezeRows(1);
        }

        private static void EscribirHojaDetalle(
            XLWorkbook libro,
            IReadOnlyList<ReporteServicioDto> servicios,
            bool incluirEmpresa)
        {
            var hoja = libro.Worksheets.Add("Detalle servicios");
            var encabezados = incluirEmpresa
                ? new[]
                {
                    "Fecha", "Hora inicio", "Hora fin", "Empresa", "Ruta", "Sector", "Vehículo", "Estado",
                    "Personas planificadas", "Planificados transportados", "Planificados no transportados",
                    "No planificados transportados", "Total transportados"
                }
                : new[]
                {
                    "Fecha", "Hora inicio", "Hora fin", "Ruta", "Sector", "Vehículo", "Estado",
                    "Personas planificadas", "Planificados transportados", "Planificados no transportados",
                    "No planificados transportados", "Total transportados"
                };

            for (var i = 0; i < encabezados.Length; i++)
            {
                hoja.Cell(1, i + 1).Value = encabezados[i];
            }

            EstiloEncabezado(hoja.Range(1, 1, 1, encabezados.Length));

            var fila = 2;
            foreach (var servicio in servicios)
            {
                var columna = 1;
                hoja.Cell(fila, columna).Value = servicio.Fecha.ToDateTime(TimeOnly.MinValue);
                hoja.Cell(fila, columna).Style.DateFormat.Format = FormatoFecha;
                columna++;

                hoja.Cell(fila, columna).Value = servicio.HoraInicio.ToTimeSpan();
                hoja.Cell(fila, columna).Style.NumberFormat.Format = FormatoHora;
                columna++;

                hoja.Cell(fila, columna).Value = servicio.HoraFin.ToTimeSpan();
                hoja.Cell(fila, columna).Style.NumberFormat.Format = FormatoHora;
                columna++;

                if (incluirEmpresa)
                {
                    hoja.Cell(fila, columna).Value = servicio.RazonSocial;
                    columna++;
                }

                hoja.Cell(fila, columna).Value = servicio.NombreRuta ?? string.Empty;
                columna++;
                hoja.Cell(fila, columna).Value = servicio.SectorRuta ?? string.Empty;
                columna++;
                hoja.Cell(fila, columna).Value = servicio.PatenteVehiculo ?? string.Empty;
                columna++;
                hoja.Cell(fila, columna).Value = servicio.Estado.ToString();
                columna++;

                EscribirEntero(hoja.Cell(fila, columna), servicio.PersonasPlanificadas);
                columna++;
                EscribirEntero(hoja.Cell(fila, columna), servicio.PlanificadosTransportados);
                columna++;
                EscribirEntero(hoja.Cell(fila, columna), servicio.PlanificadosNoTransportados);
                columna++;
                EscribirEntero(hoja.Cell(fila, columna), servicio.NoPlanificadosTransportados);
                columna++;
                EscribirEntero(hoja.Cell(fila, columna), servicio.TotalTransportados);

                fila++;
            }

            hoja.SheetView.FreezeRows(1);
            hoja.Columns().AdjustToContents();
        }

        private static void EscribirIndicador(IXLWorksheet hoja, ref int fila, string nombre, int valor)
        {
            hoja.Cell(fila, 1).Value = nombre;
            EscribirEntero(hoja.Cell(fila, 2), valor);
            fila++;
        }

        private static void EscribirPorcentaje(IXLWorksheet hoja, ref int fila, string nombre, decimal valor)
        {
            hoja.Cell(fila, 1).Value = nombre;
            hoja.Cell(fila, 2).Value = valor;
            hoja.Cell(fila, 2).Style.NumberFormat.Format = FormatoPorcentaje;
            fila++;
        }

        private static void EscribirEntero(IXLCell celda, int valor)
        {
            celda.Value = valor;
            celda.Style.NumberFormat.Format = FormatoEntero;
        }

        private static void EstiloEncabezado(IXLRange rango)
        {
            rango.Style.Font.Bold = true;
        }

        private static byte[] Guardar(XLWorkbook libro)
        {
            using var memoria = new MemoryStream();
            libro.SaveAs(memoria);
            return memoria.ToArray();
        }

        internal static string SanitizarNombreArchivo(string valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                return "Empresa";
            }

            var constructor = new StringBuilder(valor.Trim().Length);
            foreach (var caracter in valor.Trim())
            {
                if (Path.GetInvalidFileNameChars().Contains(caracter) || char.IsControl(caracter))
                {
                    constructor.Append('_');
                    continue;
                }

                constructor.Append(caracter == ' ' ? '_' : caracter);
            }

            var limpio = constructor.ToString().Trim('_');
            return string.IsNullOrWhiteSpace(limpio)
                ? "Empresa"
                : limpio;
        }
    }
}
