-- =============================================================================
-- Script: 02_actualizar_asistencia.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Agrega a asistencia:
--   - tipo_asistencia  ENUM('PLANIFICADA', 'NO_PLANIFICADA') NOT NULL
--   - excede_capacidad TINYINT(1) NOT NULL DEFAULT 0  (BOOLEAN / FALSE)
--
-- No modifica otras tablas.
-- No elimina campos, FK, UNIQUE ni índices existentes.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `asistencia`
  ADD COLUMN `tipo_asistencia` ENUM('PLANIFICADA', 'NO_PLANIFICADA') NOT NULL AFTER `metodo`,
  ADD COLUMN `excede_capacidad` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tipo_asistencia`;
