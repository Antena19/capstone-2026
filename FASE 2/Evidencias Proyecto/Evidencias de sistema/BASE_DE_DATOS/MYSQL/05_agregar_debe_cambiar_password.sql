-- =============================================================================
-- Script: 05_agregar_debe_cambiar_password.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Agrega a usuario:
--   - debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0
--
-- true (1): el usuario debe cambiar su contraseña antes de operar.
-- false (0): la contraseña ya es definitiva.
--
-- Las cuentas históricas quedan en 0 y conservan su acceso.
-- No modifica otros campos ni tablas.
-- No elimina filas, FK, UNIQUE ni índices existentes.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `usuario`
  ADD COLUMN `debe_cambiar_password` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `password_hash`;
