-- =============================================================================
-- Cancelación automática de servicios no iniciados.
-- Motor: MySQL 8.x. Ejecutar una vez, a mano, sobre la base que corresponda.
--
-- No modifica filas de servicio, asistencia, pasajero_servicio, asignacion
-- ni qr_servicio. No borra históricos.
--
-- El corte queda en configuracion_sistema y sobrevive a un reinicio de Railway.
-- Su valor es el id_servicio máximo que YA existe al ejecutar este script.
-- La aplicación solo cancela servicios con id_servicio estrictamente mayor.
-- Volver a ejecutar el script no mueve el corte.
--
-- Orden seguro:
--   1. Cargar o conservar los servicios que deben quedar fuera de la regla.
--   2. Ejecutar este script.
--   3. Recién entonces iniciar el backend que contiene el barrido.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `configuracion_sistema` (
  `clave` VARCHAR(100) NOT NULL,
  `valor` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @columna_existe := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'servicio'
    AND COLUMN_NAME = 'motivo_cancelacion'
);

SET @ddl := IF(
  @columna_existe = 0,
  'ALTER TABLE `servicio` ADD COLUMN `motivo_cancelacion` VARCHAR(50) NULL',
  'SELECT 1'
);

PREPARE sentencia FROM @ddl;
EXECUTE sentencia;
DEALLOCATE PREPARE sentencia;

INSERT INTO `configuracion_sistema` (`clave`, `valor`)
SELECT
  'cancelacion_automatica.id_servicio_corte',
  CAST(COALESCE(MAX(`id_servicio`), 0) AS CHAR(20))
FROM `servicio`
WHERE NOT EXISTS (
  SELECT 1
  FROM `configuracion_sistema`
  WHERE `clave` = 'cancelacion_automatica.id_servicio_corte'
);
