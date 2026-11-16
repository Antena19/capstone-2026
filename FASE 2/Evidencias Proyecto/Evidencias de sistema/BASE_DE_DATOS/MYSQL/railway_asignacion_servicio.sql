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
-- Table structure for table `asignacion_servicio`
--

DROP TABLE IF EXISTS `asignacion_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignacion_servicio` (
  `id_asignacion` int NOT NULL AUTO_INCREMENT,
  `id_servicio` int NOT NULL,
  `id_conductor` int NOT NULL,
  `id_vehiculo` int NOT NULL,
  `fecha_asignacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('ACTIVA','REEMPLAZADA','CANCELADA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVA',
  PRIMARY KEY (`id_asignacion`),
  KEY `ix_asignacion_servicio_id_servicio` (`id_servicio`),
  KEY `ix_asignacion_servicio_id_conductor` (`id_conductor`),
  KEY `ix_asignacion_servicio_id_vehiculo` (`id_vehiculo`),
  KEY `ix_asignacion_servicio_estado` (`estado`),
  CONSTRAINT `fk_asignacion_servicio_conductor` FOREIGN KEY (`id_conductor`) REFERENCES `conductor` (`id_conductor`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_asignacion_servicio_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_asignacion_servicio_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculo` (`id_vehiculo`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asignacion_servicio`
--

LOCK TABLES `asignacion_servicio` WRITE;
/*!40000 ALTER TABLE `asignacion_servicio` DISABLE KEYS */;
INSERT INTO `asignacion_servicio` VALUES (1,2,1,1,'2026-09-01 19:19:13','REEMPLAZADA'),(2,2,1,2,'2026-09-01 19:22:20','ACTIVA'),(3,3,1,1,'2026-09-02 15:31:37','ACTIVA'),(4,4,1,1,'2026-09-02 15:42:18','ACTIVA'),(5,5,1,3,'2026-09-02 15:45:55','ACTIVA'),(6,6,1,1,'2026-09-15 20:07:36','ACTIVA'),(7,13,1,4,'2026-09-20 17:32:28','ACTIVA'),(8,21,1,1,'2026-09-20 18:20:27','ACTIVA'),(9,22,1,3,'2026-09-20 18:38:08','ACTIVA'),(10,23,1,3,'2026-09-21 13:26:41','ACTIVA'),(11,24,1,3,'2026-09-21 13:56:06','ACTIVA'),(12,27,1,1,'2026-10-05 14:38:16','ACTIVA'),(13,48,1,1,'2026-10-05 14:46:10','ACTIVA'),(14,7,3,4,'2026-10-13 16:08:30','ACTIVA'),(15,50,1,5,'2026-10-13 17:55:01','ACTIVA'),(16,51,1,5,'2026-10-13 17:55:01','ACTIVA'),(17,52,1,5,'2026-10-13 17:55:02','ACTIVA'),(18,53,1,5,'2026-10-13 17:55:03','ACTIVA'),(19,33,3,4,'2026-10-13 23:22:34','ACTIVA');
/*!40000 ALTER TABLE `asignacion_servicio` ENABLE KEYS */;
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

-- Dump completed on 2026-10-15 20:46:31
