-- =============================================================================
-- Script: 04_agregar_punto_recogida_pasajero_servicio.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Agrega a pasajero_servicio:
--   - id_punto_recogida VARCHAR(50) NULL
--
-- El punto vive en MongoDB (rutas.puntosRecogida.idPunto).
-- No hay FK entre motores; la validez la controla el backend.
-- Nullable: la asociación puede existir temporalmente sin punto.
-- No modifica otros campos ni tablas.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `pasajero_servicio`
  ADD COLUMN `id_punto_recogida` VARCHAR(50) NULL AFTER `id_pasajero`;
