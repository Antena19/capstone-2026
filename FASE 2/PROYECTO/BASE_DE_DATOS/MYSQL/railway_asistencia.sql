-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: tokaido.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.7.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '03c1800a-b127-11f1-84fb-922033204891:1-135,
3b2850ad-b50b-11f1-bdd4-52e018c30c80:1-73,
46d4f03c-b80e-11f1-a4a9-6ee100e3394b:1-32,
9fb98010-b5fd-11f1-828e-2e426c239422:1-38';

--
-- Table structure for table `asistencia`
--

DROP TABLE IF EXISTS `asistencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asistencia` (
  `id_asistencia` int NOT NULL AUTO_INCREMENT,
  `id_servicio` int NOT NULL,
  `id_pasajero` int NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metodo` enum('QR','MANUAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_asistencia` enum('PLANIFICADA','NO_PLANIFICADA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `excede_capacidad` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('PROVISIONAL','VALIDA','ANULADA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VALIDA',
  PRIMARY KEY (`id_asistencia`),
  UNIQUE KEY `uk_asistencia_servicio_pasajero` (`id_servicio`,`id_pasajero`),
  KEY `ix_asistencia_id_pasajero` (`id_pasajero`),
  KEY `ix_asistencia_fecha_hora` (`fecha_hora`),
  KEY `ix_asistencia_estado` (`estado`),
  CONSTRAINT `fk_asistencia_pasajero` FOREIGN KEY (`id_pasajero`) REFERENCES `pasajero` (`id_pasajero`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_asistencia_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asistencia`
--

LOCK TABLES `asistencia` WRITE;
/*!40000 ALTER TABLE `asistencia` DISABLE KEYS */;
INSERT INTO `asistencia` VALUES (1,2,1,'2026-09-02 14:58:35','QR','PLANIFICADA',0,'VALIDA'),(2,3,1,'2026-09-02 15:07:34','QR','NO_PLANIFICADA',0,'VALIDA'),(3,3,2,'2026-09-02 15:29:54','QR','NO_PLANIFICADA',0,'VALIDA'),(4,5,2,'2026-09-02 15:49:58','QR','NO_PLANIFICADA',0,'ANULADA'),(5,5,1,'2026-09-02 15:51:00','QR','PLANIFICADA',0,'VALIDA'),(6,21,199,'2026-09-20 18:28:52','QR','NO_PLANIFICADA',0,'VALIDA'),(7,23,3,'2026-09-21 13:47:14','QR','PLANIFICADA',0,'VALIDA'),(8,24,199,'2026-09-21 14:00:41','QR','NO_PLANIFICADA',0,'PROVISIONAL'),(9,48,1,'2026-10-05 14:49:52','QR','PLANIFICADA',0,'VALIDA'),(10,48,199,'2026-10-05 14:50:51','QR','PLANIFICADA',0,'VALIDA'),(11,27,1,'2026-10-05 22:05:33','QR','PLANIFICADA',0,'VALIDA'),(12,33,199,'2026-10-13 23:25:35','QR','PLANIFICADA',0,'VALIDA');
/*!40000 ALTER TABLE `asistencia` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-15 20:45:25
