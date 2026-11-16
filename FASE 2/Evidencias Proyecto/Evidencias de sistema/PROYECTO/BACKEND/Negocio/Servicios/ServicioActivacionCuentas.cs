using System.Security.Cryptography;
using BACKEND.Datos.MySQL;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Configuracion;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Sms;
using BACKEND.Negocio.Validacion;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioActivacionCuentas
    {
        Task<(ActivacionUsuario Activacion, string Codigo)> GenerarAsync(int idUsuario);

        Task<(ActivacionUsuario Activacion, string Codigo)> GenerarParaUsuarioNuevoAsync(int idUsuario);

        Task IntentarEnviarAsync(ActivacionUsuario activacion, string telefono, string codigoPlano);

        Task ActivarCuentaAsync(string telefono, string codigo, string nuevaPassword);

        Task ReenviarPublicoAsync(string telefono);

        Task ReenviarAdministradorAsync(int idUsuario);

        Task InvalidarVigentesAsync(int idUsuario);

        Task<bool> EstaEnCooldownAsync(int idUsuario);
    }

    public class ServicioActivacionCuentas : IServicioActivacionCuentas
    {
        public const string MensajeCodigoInvalido = "Código inválido o expirado.";
        public const string MensajeReenvioPublico = "Si existe una cuenta pendiente, se enviará un nuevo código.";

        private readonly TransporteContext _contexto;
        private readonly IServicioHashCodigoActivacion _hashCodigo;
        private readonly IServicioHashPassword _hashPassword;
        private readonly IProveedorSms _sms;
        private readonly ActivacionUsuariosOpciones _opciones;
        private readonly ILogger<ServicioActivacionCuentas> _logger;

        public ServicioActivacionCuentas(
            TransporteContext contexto,
            IServicioHashCodigoActivacion hashCodigo,
            IServicioHashPassword hashPassword,
            IProveedorSms sms,
            IOptions<ActivacionUsuariosOpciones> opciones,
            ILogger<ServicioActivacionCuentas> logger)
        {
            _contexto = contexto;
            _hashCodigo = hashCodigo;
            _hashPassword = hashPassword;
            _sms = sms;
            _opciones = opciones.Value;
            _logger = logger;
        }

        public string GenerarCodigoPlano()
        {
            return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        }

        public async Task<(ActivacionUsuario Activacion, string Codigo)> GenerarAsync(int idUsuario)
        {
            var codigo = GenerarCodigoPlano();
            var activacion = await GenerarConCodigoAsync(idUsuario, codigo, invalidarAnteriores: true);
            return (activacion, codigo);
        }

        public Task<(ActivacionUsuario Activacion, string Codigo)> GenerarParaUsuarioNuevoAsync(int idUsuario)
        {
            var codigo = GenerarCodigoPlano();
            var activacion = CrearActivacion(idUsuario, codigo);
            _contexto.ActivacionesUsuario.Add(activacion);
            return Task.FromResult((activacion, codigo));
        }

        public async Task IntentarEnviarAsync(ActivacionUsuario activacion, string telefono, string codigoPlano)
        {
            var mensaje =
                $"Trayek: tu código de activación es {codigoPlano}. Válido por {_opciones.DuracionMinutos} minutos.";

            try
            {
                await _sms.EnviarAsync(telefono, mensaje);
                activacion.EstadoEnvio = EstadoEnvioActivacion.ENVIADA;
                activacion.FechaEnvio = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                activacion.EstadoEnvio = EstadoEnvioActivacion.ERROR;
                _logger.LogWarning(ex, "No se pudo simular/enviar SMS de activación al usuario {IdUsuario}.", activacion.IdUsuario);
            }

            await _contexto.SaveChangesAsync();
        }

        public async Task ActivarCuentaAsync(string telefono, string codigo, string nuevaPassword)
        {
            if (!TelefonoChileno.TryNormalizar(telefono, out var telefonoNormalizado)
                || string.IsNullOrWhiteSpace(codigo)
                || codigo.Length != 6
                || !codigo.All(char.IsDigit))
            {
                throw new ExcepcionNegocio(MensajeCodigoInvalido);
            }

            if (!ValidadorPassword.CumpleRequisitos(nuevaPassword))
            {
                throw new ExcepcionNegocio(ValidadorPassword.MensajeRequisitos);
            }

            var usuario = await _contexto.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Telefono == telefonoNormalizado);

            var activacion = usuario is null
                ? null
                : await _contexto.ActivacionesUsuario
                    .Where(a => a.IdUsuario == usuario.IdUsuario && a.Vigente)
                    .OrderByDescending(a => a.FechaCreacion)
                    .FirstOrDefaultAsync();

            if (usuario is null
                || activacion is null
                || usuario.Estado != EstadoRegistro.ACTIVO
                || !string.Equals(usuario.Rol.Nombre, NombresRol.Pasajero, StringComparison.Ordinal))
            {
                throw new ExcepcionNegocio(MensajeCodigoInvalido);
            }

            if (usuario.CuentaActivada
                || activacion.Usado
                || !activacion.Vigente
                || activacion.FechaExpiracion < DateTime.UtcNow
                || activacion.Intentos >= _opciones.MaxIntentos)
            {
                activacion.Vigente = false;
                await _contexto.SaveChangesAsync();
                throw new ExcepcionNegocio(MensajeCodigoInvalido);
            }

            if (!_hashCodigo.Verificar(activacion.CodigoHash, usuario.IdUsuario, codigo))
            {
                activacion.Intentos += 1;
                if (activacion.Intentos >= _opciones.MaxIntentos)
                {
                    activacion.Vigente = false;
                }

                await _contexto.SaveChangesAsync();
                throw new ExcepcionNegocio(MensajeCodigoInvalido);
            }

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                usuario.PasswordHash = _hashPassword.GenerarHash(nuevaPassword);
                usuario.CuentaActivada = true;
                usuario.DebeCambiarPassword = false;
                activacion.Usado = true;
                activacion.Vigente = false;
                activacion.FechaUso = DateTime.UtcNow;
                await InvalidarVigentesAsync(usuario.IdUsuario);
                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            _logger.LogInformation("Se activó la cuenta {IdUsuario}.", usuario.IdUsuario);
        }

        public async Task ReenviarPublicoAsync(string telefono)
        {
            if (!TelefonoChileno.TryNormalizar(telefono, out var telefonoNormalizado))
            {
                return;
            }

            var usuario = await _contexto.Usuarios
                .FirstOrDefaultAsync(u => u.Telefono == telefonoNormalizado);

            if (usuario is null
                || usuario.CuentaActivada
                || usuario.Estado != EstadoRegistro.ACTIVO)
            {
                return;
            }

            if (await EstaEnCooldownAsync(usuario.IdUsuario))
            {
                return;
            }

            var codigo = GenerarCodigoPlano();
            var activacion = await GenerarConCodigoAsync(usuario.IdUsuario, codigo, invalidarAnteriores: true);
            await _contexto.SaveChangesAsync();
            await IntentarEnviarAsync(activacion, telefonoNormalizado, codigo);
        }

        public async Task ReenviarAdministradorAsync(int idUsuario)
        {
            var usuario = await _contexto.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == idUsuario);
            if (usuario is null)
            {
                throw new ExcepcionNegocio("El usuario no existe.", StatusCodes.Status404NotFound);
            }

            if (usuario.CuentaActivada)
            {
                throw new ExcepcionNegocio("La cuenta ya está activada.");
            }

            if (string.IsNullOrWhiteSpace(usuario.Telefono))
            {
                throw new ExcepcionNegocio("La cuenta no tiene un teléfono de activación.");
            }

            if (await EstaEnCooldownAsync(idUsuario))
            {
                throw new ExcepcionNegocio("Debe esperar antes de reenviar un nuevo código.");
            }

            var codigo = GenerarCodigoPlano();
            var activacion = await GenerarConCodigoAsync(idUsuario, codigo, invalidarAnteriores: true);
            await _contexto.SaveChangesAsync();
            await IntentarEnviarAsync(activacion, usuario.Telefono, codigo);

            if (activacion.EstadoEnvio == EstadoEnvioActivacion.ERROR)
            {
                throw new ExcepcionNegocio("La cuenta está pendiente, pero no se pudo enviar el código.");
            }
        }

        public async Task InvalidarVigentesAsync(int idUsuario)
        {
            var vigentes = await _contexto.ActivacionesUsuario
                .Where(a => a.IdUsuario == idUsuario && a.Vigente)
                .ToListAsync();

            foreach (var activacion in vigentes)
            {
                activacion.Vigente = false;
            }
        }

        public async Task<bool> EstaEnCooldownAsync(int idUsuario)
        {
            var limite = DateTime.UtcNow.AddSeconds(-_opciones.CooldownSegundos);
            return await _contexto.ActivacionesUsuario
                .AnyAsync(a => a.IdUsuario == idUsuario && a.FechaCreacion >= limite);
        }

        private async Task<ActivacionUsuario> GenerarConCodigoAsync(int idUsuario, string codigo, bool invalidarAnteriores)
        {
            if (invalidarAnteriores)
            {
                await InvalidarVigentesAsync(idUsuario);
            }

            var activacion = CrearActivacion(idUsuario, codigo);
            _contexto.ActivacionesUsuario.Add(activacion);
            return activacion;
        }

        private ActivacionUsuario CrearActivacion(int idUsuario, string codigo)
        {
            var ahora = DateTime.UtcNow;
            return new ActivacionUsuario
            {
                IdUsuario = idUsuario,
                CodigoHash = _hashCodigo.GenerarHash(idUsuario, codigo),
                FechaCreacion = ahora,
                FechaExpiracion = ahora.AddMinutes(_opciones.DuracionMinutos),
                Usado = false,
                Vigente = true,
                Intentos = 0,
                EstadoEnvio = EstadoEnvioActivacion.PENDIENTE
            };
        }
    }
}
