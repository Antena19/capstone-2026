-- =============================================================================
-- Script: 11_regularizar_falta_inicio_prueba.sql
-- Motor: MySQL 8.x / 9.x
-- Uso: ejecutar DESPUÉS de 10_agregar_cancelacion_servicio.sql,
-- sobre la misma base de la API. En Railway esa base se llama railway.
-- NO ejecutar este archivo hasta la confirmación explícita.
-- =============================================================================
-- Lectura de la API de producción el 2026-10-17 05:20:56 America/Santiago.
-- Total de servicios: 53.
-- PROGRAMADO con plazo de inicio ya vencido (inicio + 30 min <= ese instante): 29.
-- Esos 29 corresponden a servicios de prueba, según confirmación del equipo.
-- PROGRAMADO futuros, excluidos: 37, 38, 39, 40, 41, 42, 43, 44, 45, 46.
-- No hay EN_CURSO. FINALIZADO y CANCELADO no entran en el WHERE.
--
-- fecha_hora_cancelacion queda en UTC_TIMESTAMP(): momento de esta
-- regularización, no la hora real en que venció cada plazo.
-- =============================================================================

-- Respaldo de las filas completas antes de cambiarlas.
CREATE TABLE `servicio_respaldo_falta_inicio_20261017` AS
SELECT *
FROM `servicio`
WHERE `id_servicio` IN (
  2, 4, 5, 7, 13, 14, 15, 16, 17, 18, 19, 20, 24,
  25, 26, 28, 29, 30, 31, 32, 34, 35, 36, 47, 49,
  50, 51, 52, 53
);

-- Solo PROGRAMADO. Si una fila ya cambió de estado, no se toca.
UPDATE `servicio`
SET
  `estado` = 'CANCELADO',
  `motivo_cancelacion` = 'FALTA_DE_INICIO',
  `fecha_hora_cancelacion` = UTC_TIMESTAMP()
WHERE `estado` = 'PROGRAMADO'
  AND `id_servicio` IN (
    2, 4, 5, 7, 13, 14, 15, 16, 17, 18, 19, 20, 24,
    25, 26, 28, 29, 30, 31, 32, 34, 35, 36, 47, 49,
    50, 51, 52, 53
  );

-- Comprobación esperada: 29 filas con el motivo y una fecha de regularización.
SELECT
  `id_servicio`,
  `fecha`,
  `hora_inicio`,
  `estado`,
  `motivo_cancelacion`,
  `fecha_hora_cancelacion`
FROM `servicio`
WHERE `id_servicio` IN (
  2, 4, 5, 7, 13, 14, 15, 16, 17, 18, 19, 20, 24,
  25, 26, 28, 29, 30, 31, 32, 34, 35, 36, 47, 49,
  50, 51, 52, 53
)
ORDER BY `id_servicio`;

-- Los futuros deben seguir PROGRAMADO y con motivo nulo.
SELECT `id_servicio`, `fecha`, `hora_inicio`, `estado`, `motivo_cancelacion`
FROM `servicio`
WHERE `id_servicio` BETWEEN 37 AND 46
ORDER BY `id_servicio`;
