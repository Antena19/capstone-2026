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
-- Table structure for table `pasajero`
--

DROP TABLE IF EXISTS `pasajero`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pasajero` (
  `id_pasajero` int NOT NULL AUTO_INCREMENT,
  `id_empresa` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rut` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `direccion_geocodificada` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_geocodificacion` datetime DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_pasajero`),
  UNIQUE KEY `uk_pasajero_rut` (`rut`),
  UNIQUE KEY `uk_pasajero_id_usuario` (`id_usuario`),
  KEY `ix_pasajero_id_empresa` (`id_empresa`),
  KEY `ix_pasajero_estado` (`estado`),
  KEY `ix_pasajero_geocodificacion` (`id_empresa`,`estado`,`latitud`),
  CONSTRAINT `fk_pasajero_empresa_cliente` FOREIGN KEY (`id_empresa`) REFERENCES `empresa_cliente` (`id_empresa`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pasajero_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=214 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pasajero`
--

LOCK TABLES `pasajero` WRITE;
/*!40000 ALTER TABLE `pasajero` DISABLE KEYS */;
INSERT INTO `pasajero` VALUES (1,2,3,'Pasajero Prueba','22222222-2','+56987654321','Fuente de Sevilla 1932, Puerto Montt',-41.4457973,-72.9291399,'Fuente de Sevilla 1932, 550 7195 Puerto Montt, Chile','2026-09-20 16:38:55','ACTIVO'),(2,1,4,'Pasajero Provisional','16987654-3','+56933333333','Calle Prueba 789, Puerto Montt',NULL,NULL,NULL,NULL,'ACTIVO'),(3,1,6,'Ana Perez Test','25111222-3','+56917777777','Mirasol 123, Puerto Montt',-41.4741990,-72.9833384,'Humedal Urbano Parque Mirasol, Mirasol, Puerto Montt, Provincia de Llanquihue, Chile','2026-10-13 14:42:44','ACTIVO'),(4,1,7,'Sin Email Test','25111333-5','+56918888888','Calle 1',NULL,NULL,NULL,NULL,'ACTIVO'),(5,1,8,'Intentos Test','25111777-2','+56916666666','Calle 6',NULL,NULL,NULL,NULL,'ACTIVO'),(6,1,9,'Historico Sin Cuenta','25111999-6','+56919999999','Calle X',NULL,NULL,NULL,NULL,'ACTIVO'),(7,1,10,'Ana Trayek','25122111-1','+56920000001','Mirasol 100, Puerto Montt',-41.4741990,-72.9833384,'Humedal Urbano Parque Mirasol, Mirasol, Puerto Montt, Provincia de Llanquihue, Chile','2026-10-12 00:35:12','ACTIVO'),(8,1,11,'Luis Sin Correo','25122112-K','+56920000002','Avenida Alemania 200',NULL,NULL,NULL,NULL,'ACTIVO'),(9,1,12,'Trabajador 002','26000002-0','+56921000002','Domicilio 2, Puerto Montt',NULL,NULL,NULL,NULL,'ACTIVO'),(10,1,13,'Trabajador 003','26000003-9','+56921000003','Domicilio 3, Puerto Montt',NULL,NULL,NULL,NULL,'ACTIVO'),(11,1,14,'Trabajador 004','26000004-7','+56921000004','Domicilio 4, Puerto Montt',NULL,NULL,NULL,NULL,'ACTIVO'),(198,1,201,'Camila Torres Soto','18123456-3','+56931110001','Volcán Puntiagudo 1450, Puerto Montt',NULL,NULL,NULL,NULL,'ACTIVO'),(199,2,202,'Diego Muñoz Vera','19876543-0','+56931110011','Avenida Austral 850, Puerto Montt',-41.4469476,-72.9274756,'Avenida Austral 850, 550 7195 Puerto Montt, Chile','2026-09-09 17:01:37','ACTIVO'),(203,2,208,'Pasajero Cocacola 1','12345678-5','+56950000002','Avenia Austral 1342',-41.4557220,-72.9366170,'Puerto Montt, LG, Chile','2026-09-21 22:13:14','ACTIVO'),(204,3,209,'Camila Soto Vargas','12123456-4','+56940001001','Av. Presidente Ibáñez 1200, Puerto Montt',-41.4694688,-72.9622635,'Avenida Presidente Ibáñez 1200, 548 0000 Puerto Montt, Chile','2026-10-13 17:01:13','ACTIVO'),(205,3,210,'Felipe Andrade Muñoz','13234567-8','+56940001002','Av. Violeta Parra 1800, Puerto Montt',-41.3963651,-72.9050108,'Avenida Violeta Parra 1800, Alerce, Chile','2026-10-13 17:01:40','ACTIVO'),(206,3,211,'Valentina Rojas Silva','14345678-1','+56940001003','Av. Los Notros 1500, Puerto Montt',-41.4845946,-72.9984520,'Avenida Los Notros 1500, 550 4052 Puerto Montt, Chile','2026-10-13 17:00:35','ACTIVO'),(207,3,212,'Nicolás Barría Soto','15456789-5','+56940001004','Av. Austral 2100, Puerto Montt',-41.4469476,-72.9274756,'Avenida Austral 2100, 550 7195 Puerto Montt, Chile','2026-10-13 17:01:50','ACTIVO'),(208,3,213,'Fernanda Mansilla Díaz','16567890-7','+56940001005','Av. La Cruz 900, Puerto Montt',-41.4746060,-72.9843080,'Avenida La Cruz 900, 550 4052 Puerto Montt, Chile','2026-10-13 17:01:45','ACTIVO'),(209,3,214,'Matías Oyarzún Vera','17678901-8','+56940001006','Av. Pacheco Altamirano 1400, Puerto Montt',-41.4916543,-72.9857258,'Avenida Pacheco Altamirano 1400, 550 4052 Puerto Montt, Chile','2026-10-13 17:01:48','ACTIVO'),(210,3,215,'Daniela Almonacid Ruiz','18789012-8','+56940001007','Sargento Silva 1100, Puerto Montt',-41.4615632,-72.9395106,'Sargento Silva 1100, 550 7195 Puerto Montt, Chile','2026-10-13 17:01:38','ACTIVO'),(211,3,216,'Sebastián Cárcamo Pérez','19890123-7','+56940001008','Volcán Puntiagudo 1300, Puerto Montt',-41.4492989,-72.9230551,'Volcán Puntiagudo 1300, 550 7195 Puerto Montt, Chile','2026-10-13 17:01:51','ACTIVO'),(212,2,218,'Batitu Mayorga','25592802-3','+56912122122','Avenida Austral 1343',-41.4448508,-72.9409225,'Avenida Austral 1343, 550 7195 Puerto Montt, Chile','2026-10-12 00:08:23','ACTIVO'),(213,1,219,'Cecilia Yañez','11402302-7','+56912125122','Avenida Austral 1343',NULL,NULL,NULL,NULL,'ACTIVO');
/*!40000 ALTER TABLE `pasajero` ENABLE KEYS */;
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

-- Dump completed on 2026-10-15 20:46:15
