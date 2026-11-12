using BACKEND.Modelos;
using BACKEND.Negocio.Tiempo;

namespace BACKEND.Negocio.Simulacion
{
    /// <summary>
    /// Selección pura de servicios y pasajeros para la simulación operacional.
    /// No consulta ni escribe en MySQL. La hora de término se interpreta en America/Santiago.
    /// </summary>
    public static class SelectorSimulacionOperacional
    {
        public const int IdEmpresaDemostracion = 1;

        public const int IdPlanificacionDemostracion = 10;

        private const ulong SemillaFnv = 14695981039346656037UL;

        private const ulong PrimoFnv = 1099511628211UL;

        public static decimal TasaAsistencia(int idServicio)
        {
            if (idServicio <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(idServicio));
            }

            return (70m + idServicio % 31) / 100m;
        }

        public static int CantidadAsistentes(int pasajerosElegibles, decimal tasa)
        {
            if (pasajerosElegibles < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(pasajerosElegibles));
            }

            if (tasa < 0m)
            {
                throw new ArgumentOutOfRangeException(nameof(tasa));
            }

            return (int)Math.Ceiling(pasajerosElegibles * tasa);
        }

        /// <summary>
        /// Orden estable entre pasajeros. Recorre los bytes de ambos identificadores
        /// con FNV-1a de 64 bits y no usa <see cref="object.GetHashCode"/>.
        /// </summary>
        public static ulong OrdenEstable(int idServicio, int idPasajero)
        {
            var hash = SemillaFnv;
            hash = Mezclar(hash, idServicio);
            hash = Mezclar(hash, idPasajero);
            return hash;
        }

        /// <summary>
        /// El término programado ya ocurrió cuando su instante en Chile es anterior
        /// o igual al instante indicado.
        /// </summary>
        public static bool TerminoAlcanzado(DateOnly fecha, TimeOnly horaFin, DateTime ahoraUtc)
        {
            var finUtc = RelojChile.AUtc(fecha.ToDateTime(horaFin));
            return finUtc <= VencimientoServicio.NormalizarUtc(ahoraUtc);
        }

        public static EvaluacionSimulacionOperacional Evaluar(
            CandidatoSimulacionOperacional candidato,
            DateTime ahoraUtc)
        {
            ArgumentNullException.ThrowIfNull(candidato);
            ArgumentNullException.ThrowIfNull(candidato.Asignaciones);
            ArgumentNullException.ThrowIfNull(candidato.Pasajeros);

            var omision = Validar(candidato, ahoraUtc);
            if (omision != MotivoOmisionSimulacion.Ninguno)
            {
                return new EvaluacionSimulacionOperacional(
                    false,
                    omision,
                    Describir(omision),
                    0m,
                    Array.Empty<int>());
            }

            var elegibles = candidato.Pasajeros
                .Where(EsElegible)
                .Select(p => p.IdPasajero)
                .ToArray();

            var tasa = TasaAsistencia(candidato.IdServicio);
            return new EvaluacionSimulacionOperacional(
                true,
                MotivoOmisionSimulacion.Ninguno,
                Describir(MotivoOmisionSimulacion.Ninguno),
                tasa,
                Seleccionar(candidato.IdServicio, elegibles));
        }

        public static IReadOnlyList<int> Seleccionar(int idServicio, IReadOnlyCollection<int> idsElegibles)
        {
            ArgumentNullException.ThrowIfNull(idsElegibles);

            var cantidad = CantidadAsistentes(idsElegibles.Count, TasaAsistencia(idServicio));
            return idsElegibles
                .OrderBy(id => OrdenEstable(idServicio, id))
                .ThenBy(id => id)
                .Take(cantidad)
                .ToArray();
        }

        public static string Describir(MotivoOmisionSimulacion motivo)
        {
            return motivo switch
            {
                MotivoOmisionSimulacion.Ninguno => "El servicio puede simularse.",
                MotivoOmisionSimulacion.IdentificadorInvalido => "El servicio no tiene un identificador válido.",
                MotivoOmisionSimulacion.OtraEmpresa => "El servicio no pertenece a la empresa de demostración.",
                MotivoOmisionSimulacion.OtraPlanificacion => "El servicio no pertenece a la planificación de noviembre.",
                MotivoOmisionSimulacion.EstadoDistintoDeProgramado => "El servicio no está PROGRAMADO.",
                MotivoOmisionSimulacion.InicioRealRegistrado => "El servicio ya tiene hora de inicio real.",
                MotivoOmisionSimulacion.FinRealRegistrado => "El servicio ya tiene hora de fin real.",
                MotivoOmisionSimulacion.AsistenciaPrevia => "El servicio ya tiene asistencias.",
                MotivoOmisionSimulacion.FinProgramadoPendiente => "La hora de término programada todavía no ocurre.",
                MotivoOmisionSimulacion.SinAsignacionActiva => "El servicio no tiene una asignación activa.",
                MotivoOmisionSimulacion.AsignacionesActivasMultiples => "El servicio tiene más de una asignación activa.",
                MotivoOmisionSimulacion.CapacidadInvalida => "El vehículo asignado no tiene capacidad mayor que cero.",
                MotivoOmisionSimulacion.PasajeroInvalido => "El servicio tiene un pasajero con identificador inválido.",
                MotivoOmisionSimulacion.PasajerosDuplicados => "El servicio tiene pasajeros duplicados.",
                MotivoOmisionSimulacion.CapacidadInsuficiente => "Los pasajeros planificados activos superan la capacidad del vehículo.",
                _ => "El servicio no puede simularse."
            };
        }

        private static MotivoOmisionSimulacion Validar(
            CandidatoSimulacionOperacional candidato,
            DateTime ahoraUtc)
        {
            if (candidato.IdServicio <= 0)
            {
                return MotivoOmisionSimulacion.IdentificadorInvalido;
            }

            if (candidato.IdEmpresa != IdEmpresaDemostracion)
            {
                return MotivoOmisionSimulacion.OtraEmpresa;
            }

            if (candidato.IdPlanificacion != IdPlanificacionDemostracion)
            {
                return MotivoOmisionSimulacion.OtraPlanificacion;
            }

            if (candidato.Estado != EstadoServicio.PROGRAMADO)
            {
                return MotivoOmisionSimulacion.EstadoDistintoDeProgramado;
            }

            if (candidato.FechaHoraInicioReal.HasValue)
            {
                return MotivoOmisionSimulacion.InicioRealRegistrado;
            }

            if (candidato.FechaHoraFinReal.HasValue)
            {
                return MotivoOmisionSimulacion.FinRealRegistrado;
            }

            if (candidato.TieneAsistenciaPrevia)
            {
                return MotivoOmisionSimulacion.AsistenciaPrevia;
            }

            if (!TerminoAlcanzado(candidato.Fecha, candidato.HoraFin, ahoraUtc))
            {
                return MotivoOmisionSimulacion.FinProgramadoPendiente;
            }

            var activas = candidato.Asignaciones
                .Where(a => a.Estado == EstadoAsignacionServicio.ACTIVA)
                .ToList();

            if (activas.Count == 0)
            {
                return MotivoOmisionSimulacion.SinAsignacionActiva;
            }

            if (activas.Count > 1)
            {
                return MotivoOmisionSimulacion.AsignacionesActivasMultiples;
            }

            var capacidad = activas[0].CapacidadVehiculo;
            if (capacidad <= 0)
            {
                return MotivoOmisionSimulacion.CapacidadInvalida;
            }

            if (candidato.Pasajeros.Any(p => p.IdPasajero <= 0))
            {
                return MotivoOmisionSimulacion.PasajeroInvalido;
            }

            if (candidato.Pasajeros.GroupBy(p => p.IdPasajero).Any(g => g.Count() > 1))
            {
                return MotivoOmisionSimulacion.PasajerosDuplicados;
            }

            var planificadosActivos = candidato.Pasajeros.Count(p => p.EstadoAsociacion == EstadoPasajeroServicio.ACTIVO);
            if (planificadosActivos > capacidad)
            {
                return MotivoOmisionSimulacion.CapacidadInsuficiente;
            }

            return MotivoOmisionSimulacion.Ninguno;
        }

        private static bool EsElegible(PasajeroCandidatoSimulacion pasajero)
        {
            return pasajero.IdEmpresa == IdEmpresaDemostracion
                && pasajero.Estado == EstadoRegistro.ACTIVO
                && pasajero.EstadoAsociacion == EstadoPasajeroServicio.ACTIVO;
        }

        private static ulong Mezclar(ulong hash, int valor)
        {
            var bytes = (uint)valor;
            for (var i = 0; i < 4; i++)
            {
                hash ^= bytes & 0xFF;
                hash *= PrimoFnv;
                bytes >>= 8;
            }

            return hash;
        }
    }
}
