# Trayek - Sistema Integral de Gestión de Transporte de Personal

Proyecto desarrollado como parte del Proyecto APT 2026.

**Trayek** es un sistema integral para la gestión de transporte de personal. Su objetivo es digitalizar y centralizar la gestión de servicios de transporte, permitiendo administrar empresas clientes, pasajeros, conductores, vehículos, rutas, planificaciones, servicios, asistencia y contingencias operacionales.

La solución está compuesta por una **plataforma web administrativa**, una **aplicación móvil** y una **API backend compartida**.

---

# Problema

Actualmente, la coordinación de servicios de transporte de personal puede depender de herramientas como planillas Excel, mensajería instantánea y registros manuales.

Esto dificulta mantener información actualizada respecto de:

- Servicios planificados.
- Conductores y vehículos asignados.
- Pasajeros asociados a cada servicio.
- Confirmación de pasajeros.
- Uso efectivo del transporte.
- Cambios de conductor o vehículo.
- Incidentes durante los recorridos.
- Consolidación mensual de información operacional.

Además, la confirmación previa de un pasajero no necesariamente significa que utilizó efectivamente el servicio.

Trayek busca centralizar estos procesos y mantener trazabilidad de la operación.

---

# Componentes del sistema

La solución está dividida en tres componentes principales:

```text
Trayek
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

La plataforma web está orientada principalmente a la administración, planificación y supervisión de la operación.

## Dashboard

Permite visualizar indicadores generales de la operación, incluyendo información relacionada con:

- Servicios programados.
- Servicios en curso.
- Servicios finalizados.
- Servicios cancelados.
- Pasajeros transportados.
- Asistencia registrada.
- Estado general de la operación.

---

## Empresas clientes

Permite administrar las empresas que utilizan el servicio de transporte.

Funciones principales:

- Registrar empresas.
- Editar información.
- Consultar empresas.
- Activar o inactivar empresas.
- Consultar información relacionada con sus servicios.

---

## Pasajeros

Permite administrar los trabajadores que utilizan los servicios.

Funciones principales:

- Registrar pasajeros.
- Asociar pasajeros a una empresa.
- Editar información.
- Consultar pasajeros.
- Activar o inactivar pasajeros.
- Importar pasajeros desde archivos Excel.
- Gestionar información necesaria para los servicios de transporte.

Los pasajeros pueden disponer de una cuenta de usuario asociada para acceder a las funcionalidades correspondientes de la aplicación móvil.

---

## Conductores

Permite administrar los conductores responsables de realizar los servicios.

Funciones principales:

- Registrar conductores.
- Crear su cuenta de usuario asociada.
- Editar información.
- Consultar conductores.
- Activar o inactivar conductores.
- Consultar asignaciones de servicios.

---

## Vehículos

Permite administrar la flota utilizada para los servicios.

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

Permite administrar y planificar las rutas utilizadas para los servicios de transporte.

Las rutas pueden considerar:

- Nombre.
- Empresa asociada.
- Sector.
- Origen.
- Destino.
- Puntos de recogida.
- Pasajeros asociados a puntos de recogida.
- Trazado.
- Distancia estimada.
- Duración estimada.
- Estado.

La información geográfica de las rutas se almacena en MongoDB.

El sistema utiliza información geográfica para representar los puntos y trazados de las rutas sobre un mapa.

---

## Planificación

Permite organizar los servicios de transporte correspondientes a una empresa y período determinado.

La planificación considera principalmente:

- Empresa.
- Período.
- Servicios asociados.
- Estado.

Estados:

```text
BORRADOR
ACTIVA
CERRADA
CANCELADA
```

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
- Tipo de servicio.
- Conductor.
- Vehículo.
- Pasajeros.
- Puntos de recogida.
- Estado.

Estados:

```text
PROGRAMADO
EN_CURSO
FINALIZADO
CANCELADO
```

El sistema permite crear servicios individuales y recurrentes.

Los servicios recurrentes pueden formar parte de una misma serie, manteniendo cada viaje como un servicio independiente.

También es posible editar y cancelar servicios según su estado y gestionar los pasajeros asociados a cada viaje.

---

## Asignaciones

Cada servicio puede tener un conductor y vehículo asignados.

Ante contingencias es posible realizar reemplazos manteniendo la información necesaria para la trazabilidad de la operación.

---

## Asistencia

El sistema contempla el registro de asistencia efectiva de pasajeros.

La confirmación previa de un pasajero no representa automáticamente asistencia.

El mecanismo principal considerado para registrar asistencia es el escaneo de un código QR asociado al servicio.

Cada pasajero puede registrar una sola asistencia por servicio.

La información de asistencia se mantiene separada de la planificación de pasajeros, permitiendo distinguir entre pasajeros planificados y pasajeros que utilizaron efectivamente el transporte.

---

## Incidentes

El sistema contempla el registro de contingencias asociadas a los servicios.

Ejemplos:

- Atrasos.
- Fallas del vehículo.
- Accidentes.
- Problemas durante el recorrido.
- Otras contingencias operacionales.

---

## Reportes

La plataforma contempla la generación de información consolidada de la operación.

Entre los reportes considerados se encuentran:

- Servicios realizados.
- Asistencia de pasajeros.
- Servicios por empresa.
- Incidentes.
- Utilización del transporte.
- Información mensual de la operación.

Se contempla la generación y exportación de información a Excel.

---

## Administradores

La plataforma permite gestionar las cuentas administrativas del sistema.

Funciones principales:

- Crear administradores.
- Editar correo y teléfono.
- Consultar administradores.
- Filtrar cuentas por estado.
- Activar o inactivar cuentas administrativas.
- Proteger la cuenta administrativa actualmente autenticada.

---

## Mi perfil

Los usuarios administrativos pueden consultar y administrar información de su propia cuenta.

Funciones principales:

- Consultar datos de la cuenta.
- Editar correo electrónico.
- Editar teléfono.
- Consultar rol y estado.
- Cambiar contraseña.

---

# Aplicación Mobile

La aplicación móvil está orientada principalmente a la operación diaria del transporte.

Será desarrollada utilizando Ionic + Angular y consumirá la misma API utilizada por la plataforma web.

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
Conductor dispone del QR del servicio
        ↓
Pasajero escanea QR
        ↓
Backend valida servicio y pasajero
        ↓
Registro de asistencia
        ↓
Información disponible para seguimiento y reportes
```

Cada pasajero puede registrar una sola asistencia por servicio.

El backend contempla además el tratamiento de pasajeros planificados y no planificados, considerando la capacidad disponible del vehículo.

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
- Integración con servicios geográficos.

---

# Bases de datos

El proyecto utiliza una arquitectura de persistencia híbrida.

## MySQL

MySQL almacena principalmente información estructurada y transaccional.

Para el trabajo colaborativo se dispone de una base MySQL compartida alojada en Aiven.

```text
Base compartida de desarrollo: defaultdb
```

El proyecto conserva además la posibilidad de utilizar una instancia local:

```text
Base local: transporte_personal
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
- Activación de usuario.

La integración con .NET se realiza mediante:

- Entity Framework Core.
- Pomelo EntityFrameworkCore MySQL.

La configuración de la conexión se realiza mediante .NET User Secrets.

---

## MongoDB

MongoDB se utiliza principalmente para información flexible y geográfica relacionada con rutas.

Servicio:

```text
MongoDB Atlas
```

Base:

```text
transporte_personal
```

Colección:

```text
rutas
```

Una ruta puede almacenar:

- Empresa asociada.
- Sector.
- Origen.
- Destino.
- Puntos de recogida.
- Pasajeros asociados a puntos de recogida.
- Trazado.
- Distancia estimada.
- Duración estimada.
- Estado.

Se utiliza GeoJSON para representar información geográfica y un índice `2dsphere` para la información geoespacial.

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
- Autenticación mediante JWT.
- Autorización según roles.
- Restricción de acceso según perfil.
- Validación de reglas de negocio en el backend.
- Protección de cadenas de conexión.
- Uso de User Secrets durante desarrollo.
- No almacenar credenciales en GitHub.
- Trazabilidad de operaciones relevantes.
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

Estos mockups se utilizan como **referencia funcional y visual durante el desarrollo** de la plataforma web y la aplicación móvil.

Permiten orientar:

- Distribución de las pantallas.
- Navegación.
- Formularios.
- Dashboard.
- Módulos administrativos.
- Flujos de usuario.
- Aplicación móvil.
- Experiencia de conductor y pasajero.

Los mockups representan una referencia inicial y pueden recibir ajustes durante el desarrollo cuando existan necesidades técnicas o funcionales justificadas.

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

- Angular 20.
- MapLibre GL.
- Chart.js.

## Mobile

- Ionic 9.
- Angular 22.
- Capacitor 8.
- Barcode Scanner.

## Backend

- ASP.NET Core Web API.
- .NET 9.
- Entity Framework Core.
- Pomelo EntityFrameworkCore MySQL.
- MongoDB.Driver.

## Bases de datos

- MySQL.
- Aiven.
- MongoDB Atlas.

## Servicios geográficos

- Geoapify.
- GeoJSON.

## Herramientas de desarrollo

- Cursor.
- Visual Studio 2022.
- Visual Studio Code.
- MySQL Workbench.
- Android Studio.
- Git.
- GitHub.
- GitHub Desktop.
- Postman.

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

Actualmente se encuentran implementados y configurados los principales componentes base de Trayek.

## Plataforma Web

- Autenticación y control de acceso.
- Dashboard operacional.
- Gestión de empresas clientes.
- Gestión de pasajeros.
- Importación de pasajeros desde Excel.
- Gestión de conductores.
- Gestión de vehículos.
- Gestión y planificación de rutas.
- Gestión de planificaciones mensuales.
- Gestión de servicios individuales y recurrentes.
- Asociación de pasajeros a servicios.
- Asignación de conductores y vehículos.
- Gestión de administradores.
- Gestión de perfil del usuario administrativo.

## Backend

- API ASP.NET Core configurada.
- Autenticación mediante JWT.
- Autorización mediante roles.
- Integración con MySQL.
- Integración con MongoDB Atlas.
- Gestión de usuarios y activación de pasajeros.
- Gestión de entidades operacionales.
- Gestión de rutas.
- Gestión de planificaciones y servicios.
- Gestión de asignaciones.
- Gestión de QR y asistencia.
- Integración con servicios geográficos.

## Bases de datos

- MySQL configurado.
- Base MySQL compartida para desarrollo.
- Alternativa de ejecución con MySQL local.
- MongoDB Atlas configurado.
- Colección de rutas configurada.
- Información geoespacial mediante GeoJSON.

## Mobile

- Proyecto Ionic + Angular configurado.
- Proyecto Android configurado mediante Capacitor.
- Integración del lector QR preparada.

El desarrollo continúa con las funcionalidades operacionales de la aplicación Mobile, el flujo de asistencia mediante QR, reportes, pruebas e integración final.ok. subore cambios agithub+
