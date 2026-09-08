-- =============================================================================
-- Script: 06_telefono_usuario_y_activacion.sql
-- Motor: MySQL 8.x
-- Uso: ejecutar en MySQL Workbench sobre la base existente transporte_personal
-- =============================================================================
-- Usuario:
--   - email pasa a NULL (el teléfono puede ser el único identificador)
--   - telefono VARCHAR(20) NULL, UNIQUE (varios NULL permitidos)
--   - cuenta_activada TINYINT(1) NOT NULL DEFAULT 1
--
-- Las cuentas históricas quedan activadas (1) y conservan su email.
--
-- Nueva tabla activacion_usuario: códigos de 6 dígitos hasheados, nunca en texto plano.
-- =============================================================================

USE `transporte_personal`;

ALTER TABLE `usuario`
  MODIFY COLUMN `email` VARCHAR(150) NULL,
  ADD COLUMN `telefono` VARCHAR(20) NULL AFTER `email`,
  ADD COLUMN `cuenta_activada` TINYINT(1) NOT NULL DEFAULT 1 AFTER `debe_cambiar_password`;

ALTER TABLE `usuario`
  ADD UNIQUE KEY `uk_usuario_telefono` (`telefono`);

CREATE TABLE `activacion_usuario` (
  `id_activacion` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `codigo_hash` VARCHAR(128) NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` DATETIME NOT NULL,
  `usado` TINYINT(1) NOT NULL DEFAULT 0,
  `vigente` TINYINT(1) NOT NULL DEFAULT 1,
  `intentos` INT NOT NULL DEFAULT 0,
  `fecha_uso` DATETIME NULL,
  `estado_envio` ENUM('PENDIENTE', 'ENVIADA', 'ERROR') NOT NULL DEFAULT 'PENDIENTE',
  `fecha_envio` DATETIME NULL,
  PRIMARY KEY (`id_activacion`),
  KEY `ix_activacion_usuario_id_usuario` (`id_usuario`),
  KEY `ix_activacion_usuario_vigente` (`id_usuario`, `vigente`),
  CONSTRAINT `fk_activacion_usuario`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
