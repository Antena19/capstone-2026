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
-- Table structure for table `historial_asignacion`
--

DROP TABLE IF EXISTS `historial_asignacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_asignacion` (
  `id_historial` int NOT NULL AUTO_INCREMENT,
  `id_servicio` int NOT NULL,
  `conductor_anterior` int DEFAULT NULL,
  `conductor_nuevo` int NOT NULL,
  `vehiculo_anterior` int DEFAULT NULL,
  `vehiculo_nuevo` int NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `ix_historial_asignacion_id_servicio` (`id_servicio`),
  KEY `ix_historial_asignacion_conductor_anterior` (`conductor_anterior`),
  KEY `ix_historial_asignacion_conductor_nuevo` (`conductor_nuevo`),
  KEY `ix_historial_asignacion_vehiculo_anterior` (`vehiculo_anterior`),
  KEY `ix_historial_asignacion_vehiculo_nuevo` (`vehiculo_nuevo`),
  KEY `ix_historial_asignacion_fecha_hora` (`fecha_hora`),
  CONSTRAINT `fk_historial_asignacion_conductor_anterior` FOREIGN KEY (`conductor_anterior`) REFERENCES `conductor` (`id_conductor`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_conductor_nuevo` FOREIGN KEY (`conductor_nuevo`) REFERENCES `conductor` (`id_conductor`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_vehiculo_anterior` FOREIGN KEY (`vehiculo_anterior`) REFERENCES `vehiculo` (`id_vehiculo`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_historial_asignacion_vehiculo_nuevo` FOREIGN KEY (`vehiculo_nuevo`) REFERENCES `vehiculo` (`id_vehiculo`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_asignacion`
--

LOCK TABLES `historial_asignacion` WRITE;
/*!40000 ALTER TABLE `historial_asignacion` DISABLE KEYS */;
INSERT INTO `historial_asignacion` VALUES (1,2,1,1,1,2,'2026-09-01 19:22:20');
/*!40000 ALTER TABLE `historial_asignacion` ENABLE KEYS */;
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

-- Dump completed on 2026-10-15 20:46:00
