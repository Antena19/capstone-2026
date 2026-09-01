# Sistema Integral de Gestión de Transporte de Personal

Proyecto desarrollado como parte del Proyecto APT 2026.

El sistema tiene como objetivo digitalizar y centralizar la gestión de servicios de transporte de personal, permitiendo administrar empresas clientes, pasajeros, conductores, vehículos, rutas, planificación de servicios, asistencia y contingencias operacionales.

La solución está compuesta por una **plataforma web administrativa**, una **aplicación móvil** y una **API backend compartida**.

---

## Problema

Actualmente, la coordinación de servicios de transporte de personal puede depender de herramientas como planillas Excel, mensajería instantánea y registros manuales.

Esto dificulta mantener información actualizada respecto de:

- Servicios planificados.
- Conductores y vehículos asignados.
- Pasajeros asociados a cada servicio.
- Confirmación de pasajeros.
- Uso efectivo del transporte.
- Cambios de conductor o vehículo.
- Incidentes durante los recorridos.
- Consolidación mensual de información para cobro.

Además, la confirmación previa de un pasajero no necesariamente significa que utilizó efectivamente el servicio.

El sistema busca centralizar estos procesos y mantener trazabilidad de la operación.

---

# Componentes del sistema

La solución está dividida en tres componentes principales:

```text
Sistema Integral de Gestión de Transporte de Personal
│
├── Plataforma Web
│
├── Aplicación Mobile
│
└── Backend / API
        │
        ├── MySQL
        └── MongoDB
```

La plataforma web y la aplicación móvil consumen una misma API.

---

# Plataforma Web

La plataforma web está orientada principalmente a usuarios administrativos, planificación y supervisión de la operación.

## Dashboard

Permitirá visualizar indicadores generales del sistema, por ejemplo:

- Servicios programados.
- Servicios en curso.
- Servicios finalizados.
- Servicios cancelados.
- Pasajeros transportados.
- Asistencia registrada.
- Incidentes.
- Estado general de la operación.

---

## Empresas clientes

Administración de las empresas que utilizan el servicio de transporte.

Funciones principales:

- Registrar empresa.
- Editar información.
- Consultar empresas.
- Activar o inactivar empresas.
- Consultar información relacionada con sus servicios.

---

## Pasajeros

Administración de trabajadores que utilizan los servicios.

Funciones principales:

- Registrar pasajeros.
- Asociar pasajeros a una empresa.
- Editar información.
- Consultar pasajeros.
- Activar o inactivar pasajeros.
- Gestionar información necesaria para los servicios de transporte.

---

## Conductores

Administración de conductores.

Funciones principales:

- Registrar conductor.
- Editar información.
- Consultar conductores.
- Activar o inactivar conductores.
- Consultar asignaciones de servicios.

---

## Vehículos

Administración de la flota utilizada para los servicios.

Funciones principales:

- Registrar vehículos.
- Registrar patente.
- Registrar tipo de vehículo.
- Registrar capacidad.
- Registrar marca y modelo.
- Editar información.
- Activar o inactivar vehículos.

---

## Rutas

Administración de rutas utilizadas para los servicios de transporte.

Las rutas podrán considerar:

- Nombre.
- Empresa asociada.
- Sector.
- Origen.
- Destino.
- Puntos de recogida.
- Trazado.
- Distancia estimada.
- Duración estimada.
- Estado.

La información geográfica de las rutas se almacena en MongoDB.

---

## Planificación

Permite organizar los servicios de transporte correspondientes a una empresa y período determinado.

La planificación podrá considerar:

- Empresa.
- Período.
- Rutas.
- Fechas.
- Horarios.
- Pasajeros.
- Conductores.
- Vehículos.

Estados considerados:

- BORRADOR
- ACTIVA
- CERRADA
- CANCELADA

---

## Servicios

Representan los viajes concretos que deben realizarse.

Cada servicio puede contener:

- Empresa.
- Planificación.
- Ruta.
- Fecha.
- Hora de inicio.
- Hora de término.
- Conductor.
- Vehículo.
- Pasajeros.
- Estado.

Estados considerados:

- PROGRAMADO
- EN_CURSO
- FINALIZADO
- CANCELADO

El sistema también podrá registrar el horario real de inicio y finalización del servicio.

---

## Asignaciones

Cada servicio puede tener un conductor y vehículo asignados.

Ante contingencias será posible realizar reemplazos manteniendo la trazabilidad de:

- Conductor anterior.
- Conductor nuevo.
- Vehículo anterior.
- Vehículo nuevo.
- Fecha y hora del cambio.

---

## Asistencia

El sistema permitirá consultar la asistencia efectiva de pasajeros.

La confirmación previa de un pasajero no representa automáticamente asistencia.

La asistencia se registra cuando el pasajero utiliza efectivamente el servicio.

Métodos considerados:

- QR.
- Registro manual autorizado.

---

## Incidentes

Permitirá registrar contingencias asociadas a los servicios.

Ejemplos:

- Atrasos.
- Fallas del vehículo.
- Accidentes.
- Problemas durante el recorrido.
- Otras contingencias operacionales.

---

## Reportes

La plataforma web permitirá generar información consolidada de la operación.

Entre los reportes considerados se encuentran:

- Servicios realizados.
- Asistencia de pasajeros.
- Servicios por empresa.
- Incidentes.
- Utilización del transporte.
- Información mensual para cobro.

Se contempla la generación y exportación de información a Excel.

---

# Aplicación Mobile

La aplicación móvil está orientada principalmente a la operación diaria del transporte.

Será desarrollada utilizando Ionic + Angular.

---

## Conductor

Desde la aplicación móvil, el conductor podrá acceder a las funcionalidades relacionadas con sus servicios.

Entre ellas:

- Consultar servicios asignados.
- Consultar información del recorrido.
- Consultar pasajeros asociados.
- Iniciar un servicio.
- Finalizar un servicio.
- Gestionar el QR del servicio.
- Registrar incidentes.

---

## Pasajero

El pasajero podrá utilizar la aplicación para interactuar con sus servicios.

Entre las funcionalidades consideradas:

- Consultar servicios asociados.
- Consultar información del recorrido.
- Confirmar participación cuando corresponda.
- Escanear el QR del servicio.
- Registrar su asistencia efectiva.

---

# Control de asistencia mediante QR

Uno de los componentes principales del proyecto es el registro de asistencia mediante código QR.

El flujo general considerado es:

```text
Servicio programado
        ↓
Conductor inicia servicio
        ↓
Generación / activación de QR
        ↓
Pasajero escanea QR
        ↓
Backend valida servicio y pasajero
        ↓
Registro de asistencia
        ↓
Información disponible para reportes
```

Cada pasajero podrá registrar una sola asistencia válida por servicio.

---

# Backend

La plataforma web y la aplicación móvil utilizan un backend común desarrollado en:

```text
ASP.NET Core Web API
.NET 9
```

La estructura principal es:

```text
BACKEND/
├── Controladores/
├── Negocio/
├── Modelos/
├── DTOs/
├── Datos/
│   ├── MySQL/
│   └── MongoDB/
├── Program.cs
└── BACKEND.csproj
```

El backend centraliza:

- Acceso a datos.
- Reglas de negocio.
- Validaciones.
- Autenticación y autorización.
- Servicios utilizados por Web y Mobile.
- Integración con MySQL.
- Integración con MongoDB.

---

# Bases de datos

El proyecto utiliza una arquitectura de persistencia híbrida.

## MySQL

MySQL almacena principalmente información estructurada y transaccional.

Base:

```text
transporte_personal
```

Entre las entidades consideradas se encuentran:

- Rol.
- Usuario.
- Empresa cliente.
- Pasajero.
- Conductor.
- Vehículo.
- Planificación.
- Servicio.
- Asignación de servicio.
- Pasajero por servicio.
- QR del servicio.
- Asistencia.
- Incidente.
- Historial de asignaciones.
- Auditoría.

La integración con .NET se realiza mediante:

- Entity Framework Core.
- Pomelo EntityFrameworkCore MySQL.

---

## MongoDB

MongoDB se utiliza principalmente para información flexible y geográfica relacionada con rutas.

Base:

```text
transporte_personal
```

Colección inicial:

```text
rutas
```

Una ruta puede almacenar:

- Empresa asociada.
- Sector.
- Origen.
- Destino.
- Puntos de recogida.
- Trazado.
- Distancia estimada.
- Duración estimada.
- Estado.

Se utiliza GeoJSON para representar información geográfica y un índice `2dsphere` para el trazado.

---

# Relación MySQL y MongoDB

Los servicios almacenados en MySQL pueden referenciar una ruta almacenada en MongoDB.

Ejemplo:

```text
MySQL

SERVICIO
└── id_ruta
        │
        ▼
MongoDB

rutas
└── _id
```

De esta forma se mantiene la información transaccional en MySQL y la información geográfica en MongoDB.

---

# Seguridad

El sistema contempla medidas de seguridad y protección de datos desde su diseño.

Entre ellas:

- Contraseñas almacenadas mediante hash.
- Autenticación de usuarios.
- Autorización según roles.
- Restricción de acceso según perfil.
- Auditoría de operaciones relevantes.
- Protección de cadenas de conexión.
- Uso de User Secrets durante desarrollo.
- No almacenar credenciales en GitHub.
- Uso de HTTPS.
- Trazabilidad de modificaciones.
- Activación e inactivación de registros maestros.
- Acceso restringido a información personal.

El tratamiento de información personal deberá considerar la normativa chilena aplicable en materia de protección de datos personales.

---

# Estados de registros

Los registros maestros utilizan principalmente:

```text
ACTIVO
INACTIVO
```

Esto permite conservar referencias históricas sin eliminar físicamente información necesaria para la operación.

Los procesos utilizan estados propios según su ciclo de vida.

Por ejemplo:

```text
PLANIFICACIÓN
BORRADOR
ACTIVA
CERRADA
CANCELADA
```

```text
SERVICIO
PROGRAMADO
EN_CURSO
FINALIZADO
CANCELADO
```

---

# Mockups

El proyecto cuenta con mockups desarrollados durante la etapa de análisis y diseño.

Estos mockups se utilizarán como **referencia funcional y visual durante el desarrollo** de la plataforma web y la aplicación móvil.

Permiten orientar:

- Distribución de las pantallas.
- Navegación.
- Formularios.
- Dashboard.
- Módulos administrativos.
- Flujos de usuario.
- Aplicación móvil.
- Experiencia de conductor y pasajero.

Los mockups representan una referencia inicial y podrán recibir ajustes durante el desarrollo cuando existan necesidades técnicas o funcionales justificadas.

---

# Organización del desarrollo

El proyecto está organizado para permitir trabajo paralelo entre plataforma web y aplicación móvil.

```text
FRONTEND/
│
├── WEB/
│
└── MOBILE/

BACKEND/

BASE_DE_DATOS/
│
├── MySQL/
└── MongoDB/
```

La plataforma web y la aplicación móvil se desarrollan de manera independiente, pero ambas consumen el mismo backend.

En el backend, el trabajo se organiza preferentemente por funcionalidad o módulo para reducir conflictos entre integrantes.

---

# Tecnologías

## Web

- Angular 20

## Mobile

- Ionic 9
- Angular 22
- Capacitor 8
- Barcode Scanner

## Backend

- ASP.NET Core Web API
- .NET 9
- Entity Framework Core
- Pomelo EntityFrameworkCore MySQL
- MongoDB.Driver

## Bases de datos

- MySQL
- MongoDB Atlas

## Herramientas de desarrollo

- Cursor
- Visual Studio 2022
- Visual Studio Code
- MySQL Workbench
- Android Studio
- Git
- GitHub
- GitHub Desktop

---

# Metodología de trabajo

Para la gestión del proyecto se utiliza Kanban.

Los estados principales de las tareas son:

```text
Pendiente
En desarrollo
En revisión
Finalizado
```

La planificación y seguimiento del proyecto se mantiene mediante Notion y la Carta Gantt del proyecto.

---

# Estado del proyecto

Actualmente se encuentra configurada la estructura técnica inicial:

- Proyecto Web creado.
- Proyecto Mobile creado.
- Proyecto Backend creado.
- Proyecto Android configurado mediante Capacitor.
- Lector QR incorporado al proyecto Mobile.
- Base de datos MySQL creada.
- MongoDB Atlas configurado.
- Colección de rutas creada.
- Índice geoespacial configurado.
- Backend conectado y validado con MySQL.
- Backend conectado y validado con MongoDB Atlas.
- Credenciales de desarrollo protegidas mediante User Secrets.

A partir de esta base se continuará con la implementación de modelos, lógica de negocio, API, módulos Web y funcionalidades Mobile.