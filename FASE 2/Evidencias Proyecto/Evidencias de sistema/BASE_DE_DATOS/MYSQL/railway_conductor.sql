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
-- Table structure for table `conductor`
--

DROP TABLE IF EXISTS `conductor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conductor` (
  `id_conductor` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rut` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('ACTIVO','INACTIVO') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_conductor`),
  UNIQUE KEY `uk_conductor_rut` (`rut`),
  UNIQUE KEY `uk_conductor_id_usuario` (`id_usuario`),
  KEY `ix_conductor_estado` (`estado`),
  CONSTRAINT `fk_conductor_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conductor`
--

LOCK TABLES `conductor` WRITE;
/*!40000 ALTER TABLE `conductor` DISABLE KEYS */;
INSERT INTO `conductor` VALUES (1,2,'Conductor Prueba','17654321-8','+56955555555','ACTIVO'),(2,5,'Juan Perez E2E','76284110-K','+56912345678','INACTIVO'),(3,207,'Conductor 1','11111111-1','+56 9 5000 0001','ACTIVO'),(4,220,'Conductor 3','13324351-8','569878765455','ACTIVO');
/*!40000 ALTER TABLE `conductor` ENABLE KEYS */;
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

-- Dump completed on 2026-10-15 20:45:40
