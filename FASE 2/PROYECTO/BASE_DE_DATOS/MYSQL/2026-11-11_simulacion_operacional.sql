-- =============================================================================
-- Trazabilidad de la simulación operacional.
-- Motor: MySQL 8.x. Ejecutar una vez, a mano, sobre la base que corresponda.
--
-- Este archivo solo crea tablas vacías. No inserta, actualiza ni borra
-- servicios, asistencias, pasajeros ni asignaciones.
-- No se ejecuta desde la aplicación ni desde las pruebas.
--
-- Identificación: un registro es simulado si aparece en simulacion_servicio
-- o en simulacion_asistencia. Las tablas operacionales no ganan columnas.
--
-- Un servicio finalizado sin pasajeros tiene fila en simulacion_servicio
-- y ninguna fila en simulacion_asistencia.
--
-- Unicidad vigente: id_servicio_vigente vale id_servicio mientras la marca
-- está VIGENTE y queda NULL al revertir. El índice único admite varios NULL,
-- así que el historial revertido se conserva y el servicio puede simularse
-- otra vez en un lote nuevo.
--
-- Reversión futura, todavía no implementada, en una sola transacción:
--   1. Bloquear el lote y exigir estado COMPLETADO.
--   2. Por cada marca VIGENTE, bloquear el servicio y comprobar que su estado,
--      sus horas reales, su motivo y el conjunto de asistencias siguen iguales
--      a lo registrado como posterior. Si uno no coincide, no se revierte nada.
--   3. Borrar solo las asistencias cuyo id está en simulacion_asistencia.
--      La clave foránea las deja en NULL y conserva id_pasajero.
--   4. Devolver cada servicio a estado_anterior y a las horas y motivo anteriores.
--   5. Pasar la marca a REVERTIDO, limpiar id_servicio_vigente y cerrar el lote
--      como REVERTIDO. No se borran las marcas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `simulacion_lote` (
  `id_lote` CHAR(36) NOT NULL,
  `id_empresa` INT NOT NULL,
  `id_planificacion` INT NOT NULL,
  `estado` ENUM('EN_CURSO', 'COMPLETADO', 'REVERTIDO') NOT NULL DEFAULT 'EN_CURSO',
  `fecha_inicio` DATETIME NOT NULL,
  `fecha_cierre` DATETIME NULL,
  `fecha_reversion` DATETIME NULL,
  PRIMARY KEY (`id_lote`),
  KEY `ix_simulacion_lote_estado` (`estado`),
  KEY `ix_simulacion_lote_empresa_planificacion` (`id_empresa`, `id_planificacion`),
  CONSTRAINT `fk_simulacion_lote_empresa`
    FOREIGN KEY (`id_empresa`) REFERENCES `empresa_cliente` (`id_empresa`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_simulacion_lote_planificacion`
    FOREIGN KEY (`id_planificacion`) REFERENCES `planificacion` (`id_planificacion`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `simulacion_servicio` (
  `id_simulacion_servicio` INT NOT NULL AUTO_INCREMENT,
  `id_lote` CHAR(36) NOT NULL,
  `id_servicio` INT NOT NULL,
  `estado_marca` ENUM('VIGENTE', 'REVERTIDO') NOT NULL DEFAULT 'VIGENTE',
  `id_servicio_vigente` INT NULL,
  `estado_anterior` ENUM('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL,
  `estado_posterior` ENUM('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL,
  `fecha_hora_inicio_real_anterior` DATETIME NULL,
  `fecha_hora_inicio_real_posterior` DATETIME NULL,
  `fecha_hora_fin_real_anterior` DATETIME NULL,
  `fecha_hora_fin_real_posterior` DATETIME NULL,
  `motivo_cancelacion_anterior` VARCHAR(50) NULL,
  `motivo_cancelacion_posterior` VARCHAR(50) NULL,
  PRIMARY KEY (`id_simulacion_servicio`),
  UNIQUE KEY `uk_simulacion_servicio_lote_servicio` (`id_lote`, `id_servicio`),
  UNIQUE KEY `uk_simulacion_servicio_vigente` (`id_servicio_vigente`),
  KEY `ix_simulacion_servicio_estado_marca` (`estado_marca`),
  CONSTRAINT `fk_simulacion_servicio_lote`
    FOREIGN KEY (`id_lote`) REFERENCES `simulacion_lote` (`id_lote`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_simulacion_servicio_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `ck_simulacion_servicio_vigente`
    CHECK (
      (`estado_marca` = 'VIGENTE' AND `id_servicio_vigente` IS NOT NULL AND `id_servicio_vigente` = `id_servicio`)
      OR (`estado_marca` = 'REVERTIDO' AND `id_servicio_vigente` IS NULL)
    ),
  CONSTRAINT `ck_simulacion_servicio_posterior`
    CHECK (`estado_posterior` = 'FINALIZADO')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `simulacion_asistencia` (
  `id_simulacion_asistencia` INT NOT NULL AUTO_INCREMENT,
  `id_simulacion_servicio` INT NOT NULL,
  `id_pasajero` INT NOT NULL,
  `id_asistencia` INT NULL,
  PRIMARY KEY (`id_simulacion_asistencia`),
  UNIQUE KEY `uk_simulacion_asistencia_pasajero` (`id_simulacion_servicio`, `id_pasajero`),
  UNIQUE KEY `uk_simulacion_asistencia_id` (`id_asistencia`),
  KEY `ix_simulacion_asistencia_id_pasajero` (`id_pasajero`),
  CONSTRAINT `fk_simulacion_asistencia_servicio`
    FOREIGN KEY (`id_simulacion_servicio`) REFERENCES `simulacion_servicio` (`id_simulacion_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_simulacion_asistencia_pasajero`
    FOREIGN KEY (`id_pasajero`) REFERENCES `pasajero` (`id_pasajero`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_simulacion_asistencia_asistencia`
    FOREIGN KEY (`id_asistencia`) REFERENCES `asistencia` (`id_asistencia`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
