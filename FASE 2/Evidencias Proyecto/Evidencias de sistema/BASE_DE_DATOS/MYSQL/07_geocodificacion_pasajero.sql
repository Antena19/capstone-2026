-- =============================================================================
-- Script: 07_geocodificacion_pasajero.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Agrega coordenadas de domicilio al maestro de pasajeros.
-- Los registros históricos quedan en NULL (PENDIENTE de geocodificación).
-- No se geocodifica en este script.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `pasajero`
  ADD COLUMN `latitud` DECIMAL(10,7) NULL AFTER `direccion`,
  ADD COLUMN `longitud` DECIMAL(10,7) NULL AFTER `latitud`,
  ADD COLUMN `direccion_geocodificada` VARCHAR(255) NULL AFTER `longitud`,
  ADD COLUMN `fecha_geocodificacion` DATETIME NULL AFTER `direccion_geocodificada`;

ALTER TABLE `pasajero`
  ADD KEY `ix_pasajero_geocodificacion` (`id_empresa`, `estado`, `latitud`);
