-- =============================================================================
-- Script: 03_actualizar_estado_asistencia.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Modifica asistencia.estado para incorporar PROVISIONAL:
--   ENUM('PROVISIONAL', 'VALIDA', 'ANULADA') NOT NULL DEFAULT 'VALIDA'
--
-- Conserva NOT NULL y DEFAULT 'VALIDA'.
-- No modifica otros campos ni tablas.
-- No elimina filas, FK, UNIQUE ni índices existentes.
-- Las filas actuales VALIDA o ANULADA permanecen válidas.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `asistencia`
  MODIFY COLUMN `estado` ENUM('PROVISIONAL', 'VALIDA', 'ANULADA') NOT NULL DEFAULT 'VALIDA';
