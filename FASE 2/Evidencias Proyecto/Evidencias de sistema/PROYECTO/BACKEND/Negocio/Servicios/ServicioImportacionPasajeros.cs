using System.Text.Json;
using BACKEND.Datos.MySQL;
using BACKEND.DTOs.Pasajeros;
using BACKEND.DTOs.Reportes;
using BACKEND.Modelos;
using BACKEND.Negocio.Constantes;
using BACKEND.Negocio.Excepciones;
using BACKEND.Negocio.Importacion;
using BACKEND.Negocio.Seguridad;
using BACKEND.Negocio.Validacion;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BACKEND.Negocio.Servicios
{
    public interface IServicioImportacionPasajeros
    {
        ArchivoExcelDto GenerarPlantilla();

        HojasImportacionDto Inspeccionar(IFormFile archivo);

        EncabezadosImportacionDto LeerEncabezados(IFormFile archivo, string nombreHoja);

        Task<PreviewImportacionPasajerosDto> ValidarAsync(
            int idEmpresa,
            IFormFile archivo,
            string nombreHoja,
            string mapeoJson);

        Task<ResultadoImportacionPasajerosDto> ImportarAsync(
            int idEmpresa,
            IFormFile archivo,
            string nombreHoja,
            string mapeoJson,
            int idAdministrador);
    }

    public class ServicioImportacionPasajeros : IServicioImportacionPasajeros
    {
        private const string MensajeConflictoCuenta = "No fue posible crear las cuentas con los datos indicados.";
        private static readonly JsonSerializerOptions JsonOpciones = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly TransporteContext _contexto;
        private readonly IServicioHashPassword _hashPassword;
        private readonly IServicioActivacionCuentas _activacion;
        private readonly ILogger<ServicioImportacionPasajeros> _logger;

        public ServicioImportacionPasajeros(
            TransporteContext contexto,
            IServicioHashPassword hashPassword,
            IServicioActivacionCuentas activacion,
            ILogger<ServicioImportacionPasajeros> logger)
        {
            _contexto = contexto;
            _hashPassword = hashPassword;
            _activacion = activacion;
            _logger = logger;
        }

        public ArchivoExcelDto GenerarPlantilla()
        {
            using var libro = new XLWorkbook();
            var pasajeros = libro.Worksheets.Add("Pasajeros");
            pasajeros.Cell(1, 1).Value = "Nombre";
            pasajeros.Cell(1, 2).Value = "RUT";
            pasajeros.Cell(1, 3).Value = "Teléfono";
            pasajeros.Cell(1, 4).Value = "Correo";
            pasajeros.Cell(1, 5).Value = "Dirección";
            pasajeros.Range(1, 1, 1, 5).Style.Font.Bold = true;
            pasajeros.Columns().AdjustToContents();

            var instrucciones = libro.Worksheets.Add("Instrucciones");
            instrucciones.Cell(1, 1).Value = "Importación de pasajeros Trayek";
            instrucciones.Cell(1, 1).Style.Font.Bold = true;
            instrucciones.Cell(3, 1).Value = "Nombre: obligatorio.";
            instrucciones.Cell(4, 1).Value = "RUT: obligatorio y válido (formato chileno).";
            instrucciones.Cell(5, 1).Value = "Teléfono: obligatorio. Se normaliza a un móvil Chile (+569XXXXXXXX).";
            instrucciones.Cell(6, 1).Value = "Correo: opcional.";
            instrucciones.Cell(7, 1).Value = "Dirección: obligatoria. No se geocodifica.";
            instrucciones.Cell(9, 1).Value = "La empresa se selecciona en Trayek; no se indica en este archivo.";
            instrucciones.Cell(10, 1).Value = "Puedes usar un Excel propio de la empresa. Esta plantilla es opcional.";
            instrucciones.Cell(12, 1).Value = "No incluyas identificadores internos ni el estado del pasajero.";
            instrucciones.Column(1).Width = 110;
            instrucciones.Style.Alignment.WrapText = true;

            using var memoria = new MemoryStream();
            libro.SaveAs(memoria);
            return new ArchivoExcelDto
            {
                Contenido = memoria.ToArray(),
                NombreArchivo = "Plantilla_Importacion_Pasajeros.xlsx"
            };
        }

        public HojasImportacionDto Inspeccionar(IFormFile archivo)
        {
            using var contenido = LectorExcelPasajeros.CopiarArchivo(archivo);
            using var libro = LectorExcelPasajeros.Abrir(contenido);
            var hojas = LectorExcelPasajeros.ListarHojasVisibles(libro);
            if (hojas.Count == 0)
            {
                throw new ExcepcionNegocio("El archivo no contiene hojas.");
            }

            return new HojasImportacionDto { Hojas = hojas };
        }

        public EncabezadosImportacionDto LeerEncabezados(IFormFile archivo, string nombreHoja)
        {
            using var contenido = LectorExcelPasajeros.CopiarArchivo(archivo);
            using var libro = LectorExcelPasajeros.Abrir(contenido);
            var hoja = LectorExcelPasajeros.ObtenerHoja(libro, nombreHoja);
            var (_, columnas) = LectorExcelPasajeros.LeerEncabezados(hoja);
            var dtos = columnas
                .Select(c => new ColumnaExcelDto
                {
                    Indice = c.Indice,
                    Letra = c.Letra,
                    Nombre = c.Nombre
                })
                .ToList();

            return new EncabezadosImportacionDto
            {
                NombreHoja = hoja.Name,
                Encabezados = dtos,
                Sugerencia = SugeridorMapeoColumnas.Sugerir(dtos)
            };
        }

        public async Task<PreviewImportacionPasajerosDto> ValidarAsync(
            int idEmpresa,
            IFormFile archivo,
            string nombreHoja,
            string mapeoJson)
        {
            await AsegurarEmpresaActivaAsync(idEmpresa);
            var filas = await EvaluarFilasAsync(archivo, nombreHoja, mapeoJson);
            return MapearPreview(filas);
        }

        public async Task<ResultadoImportacionPasajerosDto> ImportarAsync(
            int idEmpresa,
            IFormFile archivo,
            string nombreHoja,
            string mapeoJson,
            int idAdministrador)
        {
            await AsegurarEmpresaActivaAsync(idEmpresa);
            var filas = await EvaluarFilasAsync(archivo, nombreHoja, mapeoJson);
            var validas = filas.Where(f => f.EsValida).ToList();
            var omitidas = filas
                .Where(f => !f.EsValida)
                .Select(f => new FilaOmitidaImportacionDto
                {
                    NumeroFila = f.NumeroFila,
                    Errores = f.Errores
                })
                .ToList();

            if (validas.Count == 0)
            {
                return new ResultadoImportacionPasajerosDto
                {
                    TotalFilas = filas.Count,
                    Creados = 0,
                    Omitidos = omitidas.Count,
                    FilasOmitidas = omitidas
                };
            }

            var rol = await ResolverRolPasajeroAsync();
            var pendientes = new List<PendienteEnvio>(validas.Count);

            await using var transaccion = await _contexto.Database.BeginTransactionAsync();
            try
            {
                var usuarios = validas.Select(fila => CrearUsuarioPendiente(rol.IdRol, fila)).ToList();
                _contexto.Usuarios.AddRange(usuarios);
                await _contexto.SaveChangesAsync();

                var pasajeros = new List<Pasajero>(validas.Count);
                for (var i = 0; i < validas.Count; i++)
                {
                    var fila = validas[i];
                    pasajeros.Add(new Pasajero
                    {
                        IdEmpresa = idEmpresa,
                        IdUsuario = usuarios[i].IdUsuario,
                        Nombre = fila.Nombre,
                        Rut = fila.Rut,
                        Telefono = fila.Telefono,
                        Direccion = fila.Direccion,
                        Estado = EstadoRegistro.ACTIVO
                    });
                }

                _contexto.Pasajeros.AddRange(pasajeros);
                await _contexto.SaveChangesAsync();

                for (var i = 0; i < validas.Count; i++)
                {
                    var (activacion, codigo) = await _activacion.GenerarParaUsuarioNuevoAsync(usuarios[i].IdUsuario);
                    pendientes.Add(new PendienteEnvio(pasajeros[i], activacion, codigo, validas[i].Telefono));
                }

                await _contexto.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch (ExcepcionNegocio)
            {
                await transaccion.RollbackAsync();
                throw;
            }
            catch (DbUpdateException)
            {
                await transaccion.RollbackAsync();
                throw new ExcepcionNegocio(MensajeConflictoCuenta, StatusCodes.Status409Conflict);
            }
            catch
            {
                await transaccion.RollbackAsync();
                throw;
            }

            var enviosError = new List<EnvioErrorImportacionDto>();
            var enviadas = 0;
            foreach (var pendiente in pendientes)
            {
                await _activacion.IntentarEnviarAsync(pendiente.Activacion, pendiente.Telefono, pendiente.Codigo);
                if (pendiente.Activacion.EstadoEnvio == EstadoEnvioActivacion.ENVIADA)
                {
                    enviadas++;
                    continue;
                }

                enviosError.Add(new EnvioErrorImportacionDto
                {
                    IdPasajero = pendiente.Pasajero.IdPasajero,
                    Telefono = pendiente.Telefono,
                    Mensaje = "No se pudo enviar el código de activación."
                });
            }

            _logger.LogInformation(
                "El administrador {IdAdministrador} importó {Creados} pasajeros de la empresa {IdEmpresa}. Omitidos: {Omitidos}.",
                idAdministrador,
                validas.Count,
                idEmpresa,
                omitidas.Count);

            return new ResultadoImportacionPasajerosDto
            {
                TotalFilas = filas.Count,
                Creados = validas.Count,
                Omitidos = omitidas.Count,
                ActivacionesEnviadas = enviadas,
                ActivacionesError = enviosError.Count,
                FilasOmitidas = omitidas,
                EnviosError = enviosError
            };
        }

        private async Task<IReadOnlyList<FilaEvaluada>> EvaluarFilasAsync(
            IFormFile archivo,
            string nombreHoja,
            string mapeoJson)
        {
            var mapeo = DeserializarMapeo(mapeoJson);
            using var contenido = LectorExcelPasajeros.CopiarArchivo(archivo);
            using var libro = LectorExcelPasajeros.Abrir(contenido);
            var hoja = LectorExcelPasajeros.ObtenerHoja(libro, nombreHoja);
            var (filaEncabezado, columnas) = LectorExcelPasajeros.LeerEncabezados(hoja);
            ValidarMapeo(mapeo, columnas);

            var usada = hoja.RangeUsed()
                ?? throw new ExcepcionNegocio("La hoja seleccionada está vacía.");
            var ultimaFila = usada.LastRow().RowNumber();
            if (ultimaFila - filaEncabezado > LimitesImportacionPasajeros.MaxFilasRecorridas)
            {
                throw new ExcepcionNegocio("El archivo supera el máximo de 2.000 filas.");
            }

            var ultimaColumna = usada.LastColumn().ColumnNumber();
            var filas = new List<FilaEvaluada>();
            var utiles = 0;

            for (var numero = filaEncabezado + 1; numero <= ultimaFila; numero++)
            {
                if (LectorExcelPasajeros.FilaCompletamenteVacia(hoja, numero, ultimaColumna))
                {
                    continue;
                }

                utiles++;
                if (utiles > LimitesImportacionPasajeros.MaxFilasUtiles)
                {
                    throw new ExcepcionNegocio("El archivo supera el máximo de 2.000 filas.");
                }

                filas.Add(LeerFila(hoja, numero, mapeo));
            }

            MarcarDuplicadosInternos(filas);
            await MarcarDuplicadosBaseDatosAsync(filas);
            return filas;
        }

        private FilaEvaluada LeerFila(IXLWorksheet hoja, int numeroFila, MapeoColumnasImportacionDto mapeo)
        {
            var errores = new List<string>();
            var nombreTexto = LectorExcelPasajeros.LeerTexto(hoja.Cell(numeroFila, mapeo.NombreColumna));
            var rutTexto = LectorExcelPasajeros.LeerTexto(hoja.Cell(numeroFila, mapeo.RutColumna));
            var telefonoTexto = LectorExcelPasajeros.LeerTexto(hoja.Cell(numeroFila, mapeo.TelefonoColumna));
            var direccionTexto = LectorExcelPasajeros.LeerTexto(hoja.Cell(numeroFila, mapeo.DireccionColumna));
            var emailTexto = mapeo.EmailColumna.HasValue
                ? LectorExcelPasajeros.LeerTexto(hoja.Cell(numeroFila, mapeo.EmailColumna.Value))
                : string.Empty;

            AdvertirFormulaSinValor(hoja, numeroFila, mapeo.NombreColumna, "Nombre", errores);
            AdvertirFormulaSinValor(hoja, numeroFila, mapeo.RutColumna, "RUT", errores);
            AdvertirFormulaSinValor(hoja, numeroFila, mapeo.TelefonoColumna, "Teléfono", errores);
            AdvertirFormulaSinValor(hoja, numeroFila, mapeo.DireccionColumna, "Dirección", errores);

            var nombre = nombreTexto.Trim();
            if (nombre.Length == 0)
            {
                errores.Add("El nombre es obligatorio.");
            }
            else if (nombre.Length > 100)
            {
                errores.Add("El nombre no puede superar los 100 caracteres.");
            }

            var rut = string.Empty;
            if (rutTexto.Length == 0)
            {
                errores.Add("El RUT es obligatorio.");
            }
            else if (!RutChileno.TryNormalizar(rutTexto, out rut))
            {
                errores.Add(RutChileno.MensajeInvalido);
            }

            var telefono = string.Empty;
            if (telefonoTexto.Length == 0)
            {
                errores.Add("El teléfono es obligatorio.");
            }
            else if (!TelefonoChileno.TryNormalizar(telefonoTexto, out telefono))
            {
                errores.Add(TelefonoChileno.MensajeInvalido);
            }

            string? email = null;
            if (!EmailContacto.TryNormalizarOpcional(emailTexto, out email))
            {
                errores.Add(EmailContacto.MensajeInvalido);
            }

            var direccion = direccionTexto.Trim();
            if (direccion.Length == 0)
            {
                errores.Add("La dirección es obligatoria.");
            }
            else if (direccion.Length > 255)
            {
                errores.Add("La dirección no puede superar los 255 caracteres.");
            }

            return new FilaEvaluada
            {
                NumeroFila = numeroFila,
                Nombre = nombre,
                Rut = rut,
                Telefono = telefono,
                Email = email,
                Direccion = direccion,
                Errores = errores
            };
        }

        private static void MarcarDuplicadosInternos(IReadOnlyList<FilaEvaluada> filas)
        {
            MarcarGrupoDuplicado(
                filas.Where(f => !string.IsNullOrWhiteSpace(f.Rut)),
                f => f.Rut,
                (clave, numeros) => $"El RUT está duplicado en el archivo ({FormatearFilas(numeros)}).");

            MarcarGrupoDuplicado(
                filas.Where(f => !string.IsNullOrWhiteSpace(f.Telefono)),
                f => f.Telefono,
                (clave, numeros) => $"El teléfono está duplicado en el archivo ({FormatearFilas(numeros)}).");

            MarcarGrupoDuplicado(
                filas.Where(f => !string.IsNullOrWhiteSpace(f.Email)),
                f => f.Email!,
                (clave, numeros) => $"El correo está duplicado en el archivo ({FormatearFilas(numeros)}).");
        }

        private static void MarcarGrupoDuplicado(
            IEnumerable<FilaEvaluada> origen,
            Func<FilaEvaluada, string> clave,
            Func<string, IReadOnlyList<int>, string> mensaje)
        {
            foreach (var grupo in origen.GroupBy(clave, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1))
            {
                var numeros = grupo.Select(f => f.NumeroFila).OrderBy(n => n).ToList();
                var texto = mensaje(grupo.Key, numeros);
                foreach (var fila in grupo)
                {
                    fila.Errores.Add(texto);
                }
            }
        }

        private async Task MarcarDuplicadosBaseDatosAsync(IReadOnlyList<FilaEvaluada> filas)
        {
            var ruts = filas.Where(f => !string.IsNullOrWhiteSpace(f.Rut)).Select(f => f.Rut).Distinct().ToList();
            var telefonos = filas.Where(f => !string.IsNullOrWhiteSpace(f.Telefono)).Select(f => f.Telefono).Distinct().ToList();
            var emails = filas.Where(f => !string.IsNullOrWhiteSpace(f.Email)).Select(f => f.Email!).Distinct().ToList();

            var rutsExistentes = ruts.Count == 0
                ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : (await _contexto.Pasajeros.AsNoTracking()
                    .Where(p => ruts.Contains(p.Rut))
                    .Select(p => p.Rut)
                    .ToListAsync())
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var telefonosExistentes = telefonos.Count == 0
                ? new HashSet<string>(StringComparer.Ordinal)
                : (await _contexto.Usuarios.AsNoTracking()
                    .Where(u => u.Telefono != null && telefonos.Contains(u.Telefono))
                    .Select(u => u.Telefono!)
                    .ToListAsync())
                    .ToHashSet(StringComparer.Ordinal);

            var emailsExistentes = emails.Count == 0
                ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : (await _contexto.Usuarios.AsNoTracking()
                    .Where(u => u.Email != null && emails.Contains(u.Email))
                    .Select(u => u.Email!)
                    .ToListAsync())
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var fila in filas)
            {
                if (rutsExistentes.Contains(fila.Rut))
                {
                    fila.Errores.Add("Ya existe un pasajero con el RUT indicado.");
                }

                if (telefonosExistentes.Contains(fila.Telefono))
                {
                    fila.Errores.Add("Ya existe una cuenta con el teléfono indicado.");
                }

                if (!string.IsNullOrWhiteSpace(fila.Email) && emailsExistentes.Contains(fila.Email))
                {
                    fila.Errores.Add("Ya existe una cuenta con el correo indicado.");
                }
            }
        }

        private async Task AsegurarEmpresaActivaAsync(int idEmpresa)
        {
            if (idEmpresa < 1)
            {
                throw new ExcepcionNegocio("Debe indicar una empresa válida.");
            }

            var empresa = await _contexto.EmpresasCliente
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.IdEmpresa == idEmpresa);

            if (empresa is null)
            {
                throw new ExcepcionNegocio("La empresa indicada no existe.");
            }

            if (empresa.Estado != EstadoRegistro.ACTIVO)
            {
                throw new ExcepcionNegocio("La empresa indicada no se encuentra activa.");
            }
        }

        private async Task<Rol> ResolverRolPasajeroAsync()
        {
            var rol = await _contexto.Roles.FirstOrDefaultAsync(r =>
                r.Nombre == NombresRol.Pasajero && r.Estado == EstadoRegistro.ACTIVO);

            if (rol is null)
            {
                throw new ExcepcionNegocio("El rol PASAJERO no existe o no se encuentra activo.");
            }

            return rol;
        }

        private Usuario CrearUsuarioPendiente(int idRol, FilaEvaluada fila)
        {
            return new Usuario
            {
                Email = fila.Email,
                Telefono = fila.Telefono,
                PasswordHash = _hashPassword.GenerarHash(GeneradorPasswordTemporal.Generar()),
                DebeCambiarPassword = false,
                CuentaActivada = false,
                IdRol = idRol,
                Estado = EstadoRegistro.ACTIVO,
                FechaCreacion = DateTime.UtcNow
            };
        }

        private static MapeoColumnasImportacionDto DeserializarMapeo(string? mapeoJson)
        {
            if (string.IsNullOrWhiteSpace(mapeoJson))
            {
                throw new ExcepcionNegocio("Debes indicar el mapeo de columnas.");
            }

            try
            {
                return JsonSerializer.Deserialize<MapeoColumnasImportacionDto>(mapeoJson, JsonOpciones)
                    ?? throw new ExcepcionNegocio("El mapeo de columnas no es válido.");
            }
            catch (JsonException)
            {
                throw new ExcepcionNegocio("El mapeo de columnas no es válido.");
            }
        }

        private static void ValidarMapeo(MapeoColumnasImportacionDto mapeo, IReadOnlyList<ColumnaExcelInterna> columnas)
        {
            AsegurarColumna(mapeo.NombreColumna, "Nombre", columnas);
            AsegurarColumna(mapeo.RutColumna, "RUT", columnas);
            AsegurarColumna(mapeo.TelefonoColumna, "Teléfono", columnas);
            AsegurarColumna(mapeo.DireccionColumna, "Dirección", columnas);
            if (mapeo.EmailColumna.HasValue)
            {
                AsegurarColumna(mapeo.EmailColumna.Value, "Correo", columnas);
            }

            var indices = new[] { mapeo.NombreColumna, mapeo.RutColumna, mapeo.TelefonoColumna, mapeo.DireccionColumna }
                .Concat(mapeo.EmailColumna.HasValue ? [mapeo.EmailColumna.Value] : Array.Empty<int>())
                .ToList();

            if (indices.Distinct().Count() != indices.Count)
            {
                throw new ExcepcionNegocio("Cada columna de Excel solo puede mapearse a un campo de Trayek.");
            }
        }

        private static void AsegurarColumna(int indice, string campo, IReadOnlyList<ColumnaExcelInterna> columnas)
        {
            if (indice < 1)
            {
                throw new ExcepcionNegocio($"Debes seleccionar una columna para {campo}.");
            }

            if (columnas.All(c => c.Indice != indice))
            {
                throw new ExcepcionNegocio($"La columna mapeada para {campo} no existe en la hoja.");
            }
        }

        private static void AdvertirFormulaSinValor(
            IXLWorksheet hoja,
            int numeroFila,
            int columna,
            string campo,
            List<string> errores)
        {
            var celda = hoja.Cell(numeroFila, columna);
            if (celda.HasFormula && string.IsNullOrWhiteSpace(LectorExcelPasajeros.LeerTexto(celda)))
            {
                errores.Add($"La celda de {campo} contiene una fórmula sin valor utilizable.");
            }
        }

        private static PreviewImportacionPasajerosDto MapearPreview(IReadOnlyList<FilaEvaluada> filas)
        {
            return new PreviewImportacionPasajerosDto
            {
                TotalFilas = filas.Count,
                Validas = filas.Count(f => f.EsValida),
                Invalidas = filas.Count(f => !f.EsValida),
                Filas = filas.Select(f => new FilaPreviewImportacionDto
                {
                    NumeroFila = f.NumeroFila,
                    Nombre = f.Nombre,
                    Rut = f.Rut,
                    Telefono = f.Telefono,
                    Email = f.Email,
                    Direccion = f.Direccion,
                    EsValida = f.EsValida,
                    Errores = f.Errores
                }).ToList()
            };
        }

        private static string FormatearFilas(IReadOnlyList<int> numeros)
        {
            if (numeros.Count == 1)
            {
                return $"fila {numeros[0]}";
            }

            if (numeros.Count == 2)
            {
                return $"filas {numeros[0]} y {numeros[1]}";
            }

            return $"filas {string.Join(", ", numeros.Take(numeros.Count - 1))} y {numeros[^1]}";
        }

        private sealed class FilaEvaluada
        {
            public int NumeroFila { get; init; }

            public string Nombre { get; init; } = string.Empty;

            public string Rut { get; init; } = string.Empty;

            public string Telefono { get; init; } = string.Empty;

            public string? Email { get; init; }

            public string Direccion { get; init; } = string.Empty;

            public List<string> Errores { get; init; } = [];

            public bool EsValida => Errores.Count == 0;
        }

        private sealed record PendienteEnvio(
            Pasajero Pasajero,
            ActivacionUsuario Activacion,
            string Codigo,
            string Telefono);
    }
}
