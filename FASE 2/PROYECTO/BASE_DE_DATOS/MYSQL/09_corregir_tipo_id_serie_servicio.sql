-- =============================================================================
-- Script: 09_corregir_tipo_id_serie_servicio.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Corrige el tipo de servicio.id_serie:
--   CHAR(36)  -> VARCHAR(36) NULL
--
-- Motivo: MySqlConnector/EF Core materializa CHAR(36) como Guid, y el
-- dominio expone IdSerie como string. VARCHAR(36) se lee como texto.
--
-- No elimina filas ni datos.
-- No recrea ni elimina el índice idx_servicio_id_serie.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `servicio`
  MODIFY COLUMN `id_serie` VARCHAR(36) NULL;
