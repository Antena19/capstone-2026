-- =============================================================================
-- Script: 08_agregar_id_serie_servicio.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Agrega a servicio:
--   - id_serie CHAR(36) NULL
--   - INDEX idx_servicio_id_serie (id_serie)
--
-- NULL: servicio único.
-- UUID compartido: ocurrencias de una misma serie recurrente.
-- No crea tabla serie_servicio.
-- No agrega FK.
-- No elimina filas, UNIQUE ni índices existentes.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `servicio`
  ADD COLUMN `id_serie` CHAR(36) NULL AFTER `id_ruta`;

ALTER TABLE `servicio`
  ADD INDEX `idx_servicio_id_serie` (`id_serie`);
