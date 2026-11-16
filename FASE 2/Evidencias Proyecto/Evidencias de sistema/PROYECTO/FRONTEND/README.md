# Frontend - Entorno de desarrollo

## Versiones utilizadas y validadas

- Node.js: 22.23.2
- npm: 10.9.8
- Angular Web: 20.3.29
- Angular CLI: 20.3.34
- Ionic CLI: 7.2.1
- Angular Mobile: 22.0.1
- Ionic Angular: 9.0.0
- Capacitor: 8.5.0
- Barcode Scanner: 3.1.1
- Android Studio: Quail 3 - 2026.1.3 Patch 1
- JVM: 21
- Android minSdk: 26

---

## Configuración inicial

### 1. Instalar y configurar Node.js con NVM

```powershell
nvm install 22.23.2
nvm use 22.23.2
```

Comprobar:

```powershell
node -v
npm -v
```

### 2. Instalar Angular CLI e Ionic CLI

```powershell
npm install -g @angular/cli@20
npm install -g @ionic/cli@7.2.1
```

### 3. Clonar el repositorio

Clonar el repositorio y abrir la carpeta del proyecto en Cursor, VS Code o el editor utilizado.

---

## Frontend Web

### 4. Configurar Web

Entrar a:

```powershell
cd PROYECTO\FRONTEND\WEB
```

Instalar las dependencias:

```powershell
npm install
```

Comprobar la compilación:

```powershell
ng build
```

Para levantar la aplicación:

```powershell
ng serve
```

La aplicación Web estará disponible normalmente en:

```text
http://localhost:4200
```

---

## Frontend Mobile

### 5. Configurar Mobile

Entrar a:

```powershell
cd PROYECTO\FRONTEND\MOBILE
```

Instalar las dependencias:

```powershell
npm install
```

Compilar la aplicación:

```powershell
ionic build
```

Sincronizar el proyecto Android:

```powershell
npx cap sync android
```

Para abrir el proyecto en Android Studio:

```powershell
npx cap open android
```

En Android Studio utilizar JVM 21.

---

## Flujo después de realizar cambios en Mobile

Cuando se realicen cambios que deban probarse en Android:

```powershell
ionic build
npx cap sync android
```

Luego ejecutar la aplicación desde Android Studio.

---

## Importante

- La aplicación Ionic utiliza Standalone Components.
- Android utiliza `minSdkVersion 26` por compatibilidad con el lector QR.
- Las versiones de Angular Web y Angular Mobile son diferentes y deben mantenerse según sus respectivos `package.json`.
- No actualizar Angular, Ionic, Capacitor o Barcode Scanner sin revisar compatibilidad.
- No ejecutar `npm audit fix --force`.
- Web y Mobile consumen la API del mismo Backend.