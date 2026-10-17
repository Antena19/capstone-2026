using BACKEND.Datos.MySQL;
using BACKEND.Negocio.Constantes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BACKEND.Negocio.Servicios
{
    /// <summary>
    /// Cambios de estado condicionados en la base. El UPDATE solo afecta la fila
    /// si todavía cumple las premisas, así que un inicio y una cancelación
    /// concurrentes no pueden dejar el servicio en un estado mixto.
    /// </summary>
    public static class ReclamoTransicionServicio
    {
        public static async Task<bool> ReclamarInicioAsync(
            TransporteContext contexto,
            int idServicio,
            DateTime fechaHoraInicioUtc,
            CancellationToken cancellationToken = default)
        {
            if (!await BloquearFilaMysqlAsync(contexto, idServicio, cancellationToken))
            {
                return false;
            }

            var filas = await contexto.Database.ExecuteSqlInterpolatedAsync(
                $@"UPDATE `servicio`
                   SET `estado` = 'EN_CURSO',
                       `fecha_hora_inicio_real` = {fechaHoraInicioUtc}
                   WHERE `id_servicio` = {idServicio}
                     AND `estado` = 'PROGRAMADO'",
                cancellationToken);

            return filas == 1;
        }

        public static async Task<bool> ReclamarCancelacionAutomaticaAsync(
            TransporteContext contexto,
            int idServicio,
            int idServicioCorte,
            CancellationToken cancellationToken = default)
        {
            if (!await BloquearFilaMysqlAsync(contexto, idServicio, cancellationToken))
            {
                return false;
            }

            var motivo = MotivosCancelacionServicio.FaltaDeInicio;
            var filas = await contexto.Database.ExecuteSqlInterpolatedAsync(
                $@"UPDATE `servicio`
                   SET `estado` = 'CANCELADO',
                       `motivo_cancelacion` = {motivo}
                   WHERE `id_servicio` = {idServicio}
                     AND `id_servicio` > {idServicioCorte}
                     AND `estado` = 'PROGRAMADO'
                     AND `fecha_hora_inicio_real` IS NULL
                     AND NOT EXISTS (
                         SELECT 1 FROM `asistencia` WHERE `id_servicio` = {idServicio}
                     )",
                cancellationToken);

            return filas == 1;
        }

        private static async Task<bool> BloquearFilaMysqlAsync(
            TransporteContext contexto,
            int idServicio,
            CancellationToken cancellationToken)
        {
            var proveedor = contexto.Database.ProviderName ?? string.Empty;
            if (!proveedor.Contains("MySql", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var transaccion = contexto.Database.CurrentTransaction
                ?? throw new InvalidOperationException(
                    "Se requiere una transacción para reclamar el estado del servicio.");

            var conexion = contexto.Database.GetDbConnection();
            await using var comando = conexion.CreateCommand();
            comando.Transaction = transaccion.GetDbTransaction();
            comando.CommandText = "SELECT `id_servicio` FROM `servicio` WHERE `id_servicio` = @idServicio FOR UPDATE";

            var parametro = comando.CreateParameter();
            parametro.ParameterName = "@idServicio";
            parametro.Value = idServicio;
            comando.Parameters.Add(parametro);

            var id = await comando.ExecuteScalarAsync(cancellationToken);
            return id is not null && id is not DBNull;
        }
    }
}
