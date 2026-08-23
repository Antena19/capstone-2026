# Backend - Entorno de desarrollo

## Tecnologías y versiones

Versiones utilizadas y validadas:

- .NET SDK: 9.0.201
- Target Framework: .NET 9 (`net9.0`)
- Visual Studio 2022: 17.13.4
- Entity Framework Core: 9.0.3
- Pomelo EntityFrameworkCore MySQL: 9.0.0
- MongoDB Driver: 3.11.0

---

## Estructura

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
├── appsettings.json
└── BACKEND.csproj
```

---

## Configuración después de clonar el repositorio

### 1. Verificar .NET

Comprobar que .NET 9 esté instalado:

```powershell
dotnet --list-sdks
```

Debe aparecer:

```text
9.0.201
```

### 2. Entrar a la carpeta del backend

```powershell
cd PROYECTO\BACKEND
```

### 3. Restaurar dependencias

```powershell
dotnet restore
```

---

## Configuración de MySQL

### 4. Crear la base de datos local

Abrir MySQL Workbench y ejecutar el script:

```text
PROYECTO/BASE_DE_DATOS/MySQL/transporte_personal.sql
```

El script crea la base de datos:

```text
transporte_personal
```

con las tablas necesarias para el sistema.

### 5. Configurar la conexión a MySQL

Las credenciales no se almacenan en `appsettings.json` ni se suben a GitHub.

Cada integrante debe configurar su propia conexión local mediante .NET User Secrets.

Desde `PROYECTO\BACKEND` ejecutar:

```powershell
dotnet user-secrets set "ConnectionStrings:MySQL" "Server=localhost;Port=3306;Database=transporte_personal;User=root;Password=TU_CONTRASEÑA;"
```

Reemplazar:

```text
TU_CONTRASEÑA
```

por la contraseña correspondiente al usuario local de MySQL.

---

## Configuración de MongoDB Atlas

MongoDB se utiliza para almacenar información no relacional asociada a rutas y datos geográficos.

Base de datos:

```text
transporte_personal
```

Colección inicial:

```text
rutas
```

### 6. Configurar la conexión a MongoDB

Cada integrante debe contar con acceso autorizado al proyecto de MongoDB Atlas.

La cadena de conexión debe almacenarse mediante User Secrets:

```powershell
dotnet user-secrets set "MongoDB:ConnectionString" "TU_CADENA_DE_MONGODB_ATLAS"
```

Reemplazar:

```text
TU_CADENA_DE_MONGODB_ATLAS
```

por la cadena de conexión correspondiente.

Si Atlas entrega una cadena que contiene:

```text
<db_password>
```

se debe reemplazar por la contraseña real del usuario de MongoDB, sin incluir los símbolos `< >`.

Ejemplo de formato:

```text
mongodb+srv://USUARIO:CONTRASEÑA@CLUSTER.mongodb.net/?appName=CLUSTER
```

No guardar esta cadena directamente en archivos versionados por Git.

### 7. Configurar el nombre de la base MongoDB

Ejecutar:

```powershell
dotnet user-secrets set "MongoDB:DatabaseName" "transporte_personal"
```

---

## Compilar el backend

Una vez configuradas ambas bases de datos:

```powershell
dotnet build
```

La compilación debe finalizar correctamente.

---

## Ejecutar el backend

```powershell
dotnet run
```

También se puede abrir:

```text
BACKEND.csproj
```

con Visual Studio 2022 para ejecutar y depurar la API.

---

## Bases de datos

### MySQL

- Base de datos: `transporte_personal`
- Motor: MySQL
- ORM: Entity Framework Core
- Proveedor: Pomelo EntityFrameworkCore MySQL
- Estructura respaldada mediante script SQL.

Script:

```text
PROYECTO/BASE_DE_DATOS/MySQL/transporte_personal.sql
```

### MongoDB

- Servicio: MongoDB Atlas
- Base de datos: `transporte_personal`
- Colección inicial: `rutas`
- Driver: MongoDB.Driver
- La colección `rutas` utiliza un índice geoespacial `2dsphere` para el campo `trazado`.

---

## Seguridad

Las credenciales y cadenas de conexión no deben almacenarse directamente en el código fuente.

Para desarrollo local se utilizan .NET User Secrets.

Cada integrante debe configurar sus propias credenciales después de clonar el repositorio.

No subir al repositorio:

- Contraseñas de MySQL.
- Contraseñas de MongoDB.
- Cadenas de conexión con credenciales.
- Archivos `.env` con información sensible.
- Tokens o claves privadas.

Para MongoDB Atlas, cada integrante debe tener un usuario autorizado y acceso de red habilitado.

---

## Importante

- El backend utiliza .NET 9.
- Mantener las versiones definidas en `BACKEND.csproj`.
- No actualizar Entity Framework, Pomelo o MongoDB.Driver sin revisar compatibilidad.
- No compartir credenciales entre integrantes.
- No subir información sensible a GitHub.
- MySQL y MongoDB deben estar configurados antes de ejecutar funcionalidades que dependan de las bases de datos.