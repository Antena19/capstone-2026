using System.Security.Cryptography;
using BACKEND.Datos.MySQL;
using BACKEND.DTOs.QR;
using BACKEND.Modelos;
using BACKEND.Negocio.Excepciones;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioQr
    {
        Task<GenerarQrRespuestaDto> GenerarComoAdministradorAsync(int idServicio, int idAdministrador);

        Task<GenerarQrRespuestaDto> GenerarComoConductorAsync(int idServicio, int idUsuario);

        Task<QrServicio> ValidarParaAsistenciaAsync(string token);
    }

    /// <summary>
    /// Generación y validación de tokens QR de servicio.
    /// El flujo operativo es del CONDUCTOR asignado. El ADMINISTRADOR solo genera QR como soporte excepcional.
    /// El token no contiene datos personales ni identificadores de usuario.
    /// No se generan imágenes QR en backend.
    /// </summary>
    public class ServicioQr : IServicioQr
    {
        /// <summary>
        /// Margen posterior a hora_fin para permitir escaneos al término del viaje.
        /// </summary>
        private static readonly TimeSpan MargenExpiracion = TimeSpan.FromMinutes(30);

        private readonly TransporteContext _contexto;
        private readonly ILogger<ServicioQr> _logger;

        public ServicioQr(TransporteContext contexto, ILogger<ServicioQr> logger)
        {
            _contexto = contexto;
            _logger = logger;
        }

        public async Task<GenerarQrRespuestaDto> GenerarComoAdministradorAsync(int idServicio, int idAdministrador)
        {
            var servicio = await ObtenerServicioGenerableAsync(idServicio);
            var qr = await GenerarInternoAsync(servicio);

            _logger.LogInformation(
                "El administrador {IdAdministrador} generó el QR {IdQr} para el servicio {IdServicio} como soporte excepcional.",
                idAdministrador,
                qr.IdQr,
                idServicio);

            return Mapear(qr);
        }

        public async Task<GenerarQrRespuestaDto> GenerarComoConductorAsync(int idServicio, int idUsuario)
        {
            var conductor = await _contexto.Conductores
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdUsuario == idUsuario);

            if (conductor is null)
            {
                throw new ExcepcionNegocio("No hay un conductor asociado a la cuenta autenticada.", StatusCodes.Status403Forbidden);
            }

            var servicio = await ObtenerServicioGenerableAsync(idServicio);

            var asignado = await _contexto.AsignacionesServicio
                .AsNoTracking()
                .AnyAsync(a =>
                    a.IdServicio == idServicio
                    && a.IdConductor == conductor.IdConductor
                    && a.Estado == EstadoAsignacionServicio.ACTIVA);

            if (!asignado)
            {
                throw new ExcepcionNegocio(
                    "No tiene una asignación activa para este servicio.",
                    StatusCodes.Status403Forbidden);
            }

            var qr = await GenerarInternoAsync(servicio);

            _logger.LogInformation(
                "El conductor {IdConductor} generó el QR {IdQr} para el servicio {IdServicio}.",
                conductor.IdConductor,
                qr.IdQr,
                idServicio);

            return Mapear(qr);
        }

        public async Task<QrServicio> ValidarParaAsistenciaAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new ExcepcionNegocio("El token es obligatorio.");
            }

            var qr = await _contexto.QrServicios
                .Include(q => q.Servicio)
                .FirstOrDefaultAsync(q => q.Token == token.Trim());

            if (qr is null)
            {
                throw new ExcepcionNegocio("El código QR no es válido.");
            }

            if (qr.Estado != EstadoQrServicio.ACTIVO)
            {
                throw new ExcepcionNegocio("El código QR no se encuentra activo.");
            }

            if (DateTime.UtcNow >= qr.FechaExpiracion)
            {
                qr.Estado = EstadoQrServicio.EXPIRADO;
                await _contexto.SaveChangesAsync();

                _logger.LogInformation(
                    "El QR {IdQr} del servicio {IdServicio} pasó a EXPIRADO al detectar vencimiento.",
                    qr.IdQr,
                    qr.IdServicio);

                throw new ExcepcionNegocio("El código QR ha expirado.");
            }

            if (qr.Servicio is null)
            {
                throw new ExcepcionNegocio("El servicio asociado al QR no existe.", StatusCodes.Status404NotFound);
            }

            if (qr.Servicio.Estado is EstadoServicio.CANCELADO or EstadoServicio.FINALIZADO)
            {
                throw new ExcepcionNegocio("No se puede registrar asistencia en un servicio CANCELADO o FINALIZADO.");
            }

            if (qr.Servicio.Estado is not (EstadoServicio.PROGRAMADO or EstadoServicio.EN_CURSO))
            {
                throw new ExcepcionNegocio("El servicio no admite registro de asistencia en su estado actual.");
            }

            return qr;
        }

        private async Task<Servicio> ObtenerServicioGenerableAsync(int idServicio)
        {
            var servicio = await _contexto.Servicios
                .FirstOrDefaultAsync(s => s.IdServicio == idServicio);

            if (servicio is null)
            {
                throw new ExcepcionNegocio("El servicio indicado no existe.", StatusCodes.Status404NotFound);
            }

            if (servicio.Estado is EstadoServicio.CANCELADO or EstadoServicio.FINALIZADO)
            {
                throw new ExcepcionNegocio("No se puede generar un QR para un servicio CANCELADO o FINALIZADO.");
            }

            if (servicio.Estado is not (EstadoServicio.PROGRAMADO or EstadoServicio.EN_CURSO))
            {
                throw new ExcepcionNegocio("Solo se puede generar un QR para un servicio PROGRAMADO o EN_CURSO.");
            }

            return servicio;
        }

        private async Task<QrServicio> GenerarInternoAsync(Servicio servicio)
        {
            await using var transaccion = await _contexto.Database.BeginTransactionAsync();

            var activos = await _contexto.QrServicios
                .Where(q => q.IdServicio == servicio.IdServicio && q.Estado == EstadoQrServicio.ACTIVO)
                .ToListAsync();

            foreach (var anterior in activos)
            {
                anterior.Estado = EstadoQrServicio.INVALIDADO;
                _logger.LogInformation(
                    "Se invalidó el QR {IdQr} del servicio {IdServicio} antes de generar uno nuevo.",
                    anterior.IdQr,
                    servicio.IdServicio);
            }

            var fechaGeneracion = DateTime.UtcNow;
            var qr = new QrServicio
            {
                IdServicio = servicio.IdServicio,
                Token = GenerarToken(),
                FechaGeneracion = fechaGeneracion,
                FechaExpiracion = CalcularExpiracion(servicio, fechaGeneracion),
                Estado = EstadoQrServicio.ACTIVO
            };

            _contexto.QrServicios.Add(qr);

            try
            {
                await _contexto.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                qr.Token = GenerarToken();
                await _contexto.SaveChangesAsync();
            }

            await transaccion.CommitAsync();
            return qr;
        }

        private static DateTime CalcularExpiracion(Servicio servicio, DateTime fechaGeneracion)
        {
            var finProgramado = servicio.Fecha.ToDateTime(servicio.HoraFin);
            var expiracion = finProgramado.Add(MargenExpiracion);

            if (expiracion < fechaGeneracion)
            {
                expiracion = fechaGeneracion.Add(MargenExpiracion);
            }

            return expiracion;
        }

        private static string GenerarToken()
        {
            Span<byte> bytes = stackalloc byte[32];
            RandomNumberGenerator.Fill(bytes);
            return Convert.ToHexString(bytes);
        }

        private static GenerarQrRespuestaDto Mapear(QrServicio qr)
        {
            return new GenerarQrRespuestaDto
            {
                IdQr = qr.IdQr,
                IdServicio = qr.IdServicio,
                Token = qr.Token,
                FechaGeneracion = qr.FechaGeneracion,
                FechaExpiracion = qr.FechaExpiracion,
                Estado = qr.Estado
            };
        }
    }
}
