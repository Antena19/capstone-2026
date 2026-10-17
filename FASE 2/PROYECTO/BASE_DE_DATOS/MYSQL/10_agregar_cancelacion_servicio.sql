-- =============================================================================
-- Script: 10_agregar_cancelacion_servicio.sql
-- Motor: MySQL 8.x / 9.x
-- Uso: ejecutar sobre la base que usa la API. En Railway esa base se llama railway.
-- NO ejecutar este archivo hasta la confirmación explícita.
-- =============================================================================
-- Agrega a servicio:
--   - motivo_cancelacion VARCHAR(50) NULL
--   - fecha_hora_cancelacion DATETIME NULL
--
-- motivo_cancelacion guarda un código corto, igual que otros textos de negocio.
-- fecha_hora_cancelacion sigue la convención de fecha_hora_inicio_real:
-- DATETIME sin zona, con el instante UTC en que se registró la cancelación.
-- No guarda la hora en que venció el plazo. Ese plazo sigue siendo
-- fecha + hora_inicio + 30 minutos, en hora de pared de Chile.
--
-- Las filas existentes quedan con ambos campos en NULL y conservan su estado.
-- No elimina filas, índices ni claves.
-- =============================================================================

ALTER TABLE `servicio`
  ADD COLUMN `motivo_cancelacion` VARCHAR(50) NULL AFTER `estado`,
  ADD COLUMN `fecha_hora_cancelacion` DATETIME NULL AFTER `motivo_cancelacion`;
