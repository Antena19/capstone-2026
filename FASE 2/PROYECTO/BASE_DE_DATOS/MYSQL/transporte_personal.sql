-- =============================================================================
-- Script: transporte_personal.sql
-- Motor: MySQL 8.x
-- Uso: copiar y ejecutar completo en MySQL Workbench
-- =============================================================================
-- Integridad:
--   - Los maestros no se eliminan en cascada (ON DELETE RESTRICT).
--   - La información histórica no usa ON DELETE CASCADE.
--   - No se incluyen datos de prueba.
--
-- Nota sobre id_ruta:
--   La ruta se persiste en MongoDB. servicio.id_ruta es VARCHAR(24) NULL
--   para almacenar el _id de Mongo (ObjectId en hexadecimal) y no tiene
--   clave foránea en MySQL.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `transporte_personal`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `transporte_personal`;

-- -----------------------------------------------------------------------------
-- Maestros
-- -----------------------------------------------------------------------------

CREATE TABLE `rol` (
  `id_rol` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uk_rol_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuario` (
  `id_usuario` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `id_rol` INT NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acceso` DATETIME NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuario_email` (`email`),
  KEY `ix_usuario_id_rol` (`id_rol`),
  KEY `ix_usuario_estado` (`estado`),
  CONSTRAINT `fk_usuario_rol`
    FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `empresa_cliente` (
  `id_empresa` INT NOT NULL AUTO_INCREMENT,
  `rut` VARCHAR(12) NOT NULL,
  `razon_social` VARCHAR(200) NOT NULL,
  `direccion` VARCHAR(255) NOT NULL,
  `telefono` VARCHAR(20) NOT NULL,
  `email_contacto` VARCHAR(150) NOT NULL,
  `nombre_contacto` VARCHAR(100) NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_empresa`),
  UNIQUE KEY `uk_empresa_cliente_rut` (`rut`),
  KEY `ix_empresa_cliente_estado` (`estado`),
  KEY `ix_empresa_cliente_razon_social` (`razon_social`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pasajero` (
  `id_pasajero` INT NOT NULL AUTO_INCREMENT,
  `id_empresa` INT NOT NULL,
  `id_usuario` INT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `rut` VARCHAR(12) NOT NULL,
  `telefono` VARCHAR(20) NOT NULL,
  `direccion` VARCHAR(255) NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_pasajero`),
  UNIQUE KEY `uk_pasajero_rut` (`rut`),
  UNIQUE KEY `uk_pasajero_id_usuario` (`id_usuario`),
  KEY `ix_pasajero_id_empresa` (`id_empresa`),
  KEY `ix_pasajero_estado` (`estado`),
  CONSTRAINT `fk_pasajero_empresa_cliente`
    FOREIGN KEY (`id_empresa`) REFERENCES `empresa_cliente` (`id_empresa`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_pasajero_usuario`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conductor` (
  `id_conductor` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `rut` VARCHAR(12) NOT NULL,
  `telefono` VARCHAR(20) NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_conductor`),
  UNIQUE KEY `uk_conductor_rut` (`rut`),
  UNIQUE KEY `uk_conductor_id_usuario` (`id_usuario`),
  KEY `ix_conductor_estado` (`estado`),
  CONSTRAINT `fk_conductor_usuario`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehiculo` (
  `id_vehiculo` INT NOT NULL AUTO_INCREMENT,
  `patente` VARCHAR(10) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `marca` VARCHAR(50) NOT NULL,
  `modelo` VARCHAR(50) NOT NULL,
  `capacidad` INT NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `uk_vehiculo_patente` (`patente`),
  KEY `ix_vehiculo_estado` (`estado`),
  CONSTRAINT `ck_vehiculo_capacidad`
    CHECK (`capacidad` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Planificación y servicios
-- -----------------------------------------------------------------------------

CREATE TABLE `planificacion` (
  `id_planificacion` INT NOT NULL AUTO_INCREMENT,
  `id_empresa` INT NOT NULL,
  `periodo` CHAR(7) NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario_creador` INT NOT NULL,
  `estado` ENUM('BORRADOR', 'ACTIVA', 'CERRADA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
  PRIMARY KEY (`id_planificacion`),
  KEY `ix_planificacion_id_empresa` (`id_empresa`),
  KEY `ix_planificacion_id_usuario_creador` (`id_usuario_creador`),
  KEY `ix_planificacion_periodo` (`periodo`),
  KEY `ix_planificacion_estado` (`estado`),
  CONSTRAINT `fk_planificacion_empresa_cliente`
    FOREIGN KEY (`id_empresa`) REFERENCES `empresa_cliente` (`id_empresa`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_planificacion_usuario_creador`
    FOREIGN KEY (`id_usuario_creador`) REFERENCES `usuario` (`id_usuario`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `ck_planificacion_periodo`
    CHECK (`periodo` REGEXP '^[0-9]{4}-[0-9]{2}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `servicio` (
  `id_servicio` INT NOT NULL AUTO_INCREMENT,
  `id_empresa` INT NOT NULL,
  `id_planificacion` INT NOT NULL,
  `id_ruta` VARCHAR(24) NULL,
  `fecha` DATE NOT NULL,
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NOT NULL,
  `fecha_hora_inicio_real` DATETIME NULL,
  `fecha_hora_fin_real` DATETIME NULL,
  `tipo_servicio` VARCHAR(50) NOT NULL,
  `estado` ENUM('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'PROGRAMADO',
  PRIMARY KEY (`id_servicio`),
  KEY `ix_servicio_id_empresa` (`id_empresa`),
  KEY `ix_servicio_id_planificacion` (`id_planificacion`),
  KEY `ix_servicio_id_ruta` (`id_ruta`),
  KEY `ix_servicio_fecha` (`fecha`),
  KEY `ix_servicio_estado` (`estado`),
  KEY `ix_servicio_empresa_fecha` (`id_empresa`, `fecha`),
  CONSTRAINT `fk_servicio_empresa_cliente`
    FOREIGN KEY (`id_empresa`) REFERENCES `empresa_cliente` (`id_empresa`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_servicio_planificacion`
    FOREIGN KEY (`id_planificacion`) REFERENCES `planificacion` (`id_planificacion`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asignacion_servicio` (
  `id_asignacion` INT NOT NULL AUTO_INCREMENT,
  `id_servicio` INT NOT NULL,
  `id_conductor` INT NOT NULL,
  `id_vehiculo` INT NOT NULL,
  `fecha_asignacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('ACTIVA', 'REEMPLAZADA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',
  PRIMARY KEY (`id_asignacion`),
  KEY `ix_asignacion_servicio_id_servicio` (`id_servicio`),
  KEY `ix_asignacion_servicio_id_conductor` (`id_conductor`),
  KEY `ix_asignacion_servicio_id_vehiculo` (`id_vehiculo`),
  KEY `ix_asignacion_servicio_estado` (`estado`),
  CONSTRAINT `fk_asignacion_servicio_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_asignacion_servicio_conductor`
    FOREIGN KEY (`id_conductor`) REFERENCES `conductor` (`id_conductor`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_asignacion_servicio_vehiculo`
    FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculo` (`id_vehiculo`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pasajero_servicio` (
  `id_pasajero_servicio` INT NOT NULL AUTO_INCREMENT,
  `id_servicio` INT NOT NULL,
  `id_pasajero` INT NOT NULL,
  `id_punto_recogida` VARCHAR(50) NULL,
  `estado_confirmacion` ENUM('PENDIENTE', 'CONFIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
  `fecha_confirmacion` DATETIME NULL,
  `estado` ENUM('ACTIVO', 'CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_pasajero_servicio`),
  UNIQUE KEY `uk_pasajero_servicio` (`id_servicio`, `id_pasajero`),
  KEY `ix_pasajero_servicio_id_pasajero` (`id_pasajero`),
  KEY `ix_pasajero_servicio_estado_confirmacion` (`estado_confirmacion`),
  KEY `ix_pasajero_servicio_estado` (`estado`),
  CONSTRAINT `fk_pasajero_servicio_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_pasajero_servicio_pasajero`
    FOREIGN KEY (`id_pasajero`) REFERENCES `pasajero` (`id_pasajero`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `qr_servicio` (
  `id_qr` INT NOT NULL AUTO_INCREMENT,
  `id_servicio` INT NOT NULL,
  `token` VARCHAR(128) NOT NULL,
  `fecha_generacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` DATETIME NOT NULL,
  `estado` ENUM('ACTIVO', 'EXPIRADO', 'INVALIDADO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_qr`),
  UNIQUE KEY `uk_qr_servicio_token` (`token`),
  KEY `ix_qr_servicio_id_servicio` (`id_servicio`),
  KEY `ix_qr_servicio_estado` (`estado`),
  KEY `ix_qr_servicio_fecha_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_qr_servicio_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Operación, incidentes e histórico
-- -----------------------------------------------------------------------------

CREATE TABLE `asistencia` (
  `id_asistencia` INT NOT NULL AUTO_INCREMENT,
  `id_servicio` INT NOT NULL,
  `id_pasajero` INT NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metodo` ENUM('QR', 'MANUAL') NOT NULL,
  `tipo_asistencia` ENUM('PLANIFICADA', 'NO_PLANIFICADA') NOT NULL,
  `excede_capacidad` TINYINT(1) NOT NULL DEFAULT 0,
  `estado` ENUM('PROVISIONAL', 'VALIDA', 'ANULADA') NOT NULL DEFAULT 'VALIDA',
  PRIMARY KEY (`id_asistencia`),
  UNIQUE KEY `uk_asistencia_servicio_pasajero` (`id_servicio`, `id_pasajero`),
  KEY `ix_asistencia_id_pasajero` (`id_pasajero`),
  KEY `ix_asistencia_fecha_hora` (`fecha_hora`),
  KEY `ix_asistencia_estado` (`estado`),
  CONSTRAINT `fk_asistencia_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_asistencia_pasajero`
    FOREIGN KEY (`id_pasajero`) REFERENCES `pasajero` (`id_pasajero`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `incidente` (
  `id_incidente` INT NOT NULL AUTO_INCREMENT,
  `id_servicio` INT NOT NULL,
  `id_conductor` INT NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('ABIERTO', 'RESUELTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
  PRIMARY KEY (`id_incidente`),
  KEY `ix_incidente_id_servicio` (`id_servicio`),
  KEY `ix_incidente_id_conductor` (`id_conductor`),
  KEY `ix_incidente_fecha_hora` (`fecha_hora`),
  KEY `ix_incidente_tipo` (`tipo`),
  KEY `ix_incidente_estado` (`estado`),
  CONSTRAINT `fk_incidente_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_incidente_conductor`
    FOREIGN KEY (`id_conductor`) REFERENCES `conductor` (`id_conductor`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `historial_asignacion` (
  `id_historial` INT NOT NULL AUTO_INCREMENT,
  `id_servicio` INT NOT NULL,
  `conductor_anterior` INT NULL,
  `conductor_nuevo` INT NOT NULL,
  `vehiculo_anterior` INT NULL,
  `vehiculo_nuevo` INT NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `ix_historial_asignacion_id_servicio` (`id_servicio`),
  KEY `ix_historial_asignacion_conductor_anterior` (`conductor_anterior`),
  KEY `ix_historial_asignacion_conductor_nuevo` (`conductor_nuevo`),
  KEY `ix_historial_asignacion_vehiculo_anterior` (`vehiculo_anterior`),
  KEY `ix_historial_asignacion_vehiculo_nuevo` (`vehiculo_nuevo`),
  KEY `ix_historial_asignacion_fecha_hora` (`fecha_hora`),
  CONSTRAINT `fk_historial_asignacion_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_conductor_anterior`
    FOREIGN KEY (`conductor_anterior`) REFERENCES `conductor` (`id_conductor`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_conductor_nuevo`
    FOREIGN KEY (`conductor_nuevo`) REFERENCES `conductor` (`id_conductor`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_vehiculo_anterior`
    FOREIGN KEY (`vehiculo_anterior`) REFERENCES `vehiculo` (`id_vehiculo`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_vehiculo_nuevo`
    FOREIGN KEY (`vehiculo_nuevo`) REFERENCES `vehiculo` (`id_vehiculo`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auditoria` (
  `id_auditoria` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `accion` VARCHAR(100) NOT NULL,
  `entidad` VARCHAR(100) NOT NULL,
  `id_registro` INT NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `detalle` TEXT NULL,
  `ip` VARCHAR(45) NULL,
  PRIMARY KEY (`id_auditoria`),
  KEY `ix_auditoria_id_usuario` (`id_usuario`),
  KEY `ix_auditoria_entidad` (`entidad`),
  KEY `ix_auditoria_id_registro` (`id_registro`),
  KEY `ix_auditoria_fecha_hora` (`fecha_hora`),
  KEY `ix_auditoria_entidad_registro` (`entidad`, `id_registro`),
  CONSTRAINT `fk_auditoria_usuario`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
