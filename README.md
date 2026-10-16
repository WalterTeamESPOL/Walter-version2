# 🤖 Walter — Guía de instalación y ejecución

> **Proyecto:** Walter (aplicación de voz y rostro con Electron + control físico de la cabeza).  
> **Carpeta principal utilizada:** `walter-realtime-audio-wayala/`.  
> **Sistemas contemplados:** Windows (archivos `.bat`) y Ubuntu/Linux (Intel NUC, archivos `.sh`).  
> **Objetivo:** dejar Walter funcionando desde una computadora nueva sin instalar dependencias una por una innecesariamente.

## 1. ¿Qué contiene Walter?

| Componente | Para qué sirve | Cómo se prepara |
|---|---|---|
| **Node.js + npm** | Ejecutar la interfaz y los procesos JavaScript | Instalar Node.js y ejecutar `npm ci`/`npm install` |
| **Next.js / React** | Interfaz web y lógica de conversación | Se instala desde `package.json` |
| **Electron** | Abrir Walter como aplicación de escritorio y controlar procesos | Se instala desde `package.json` (si figura como dependencia) |
| **Python 3** | Ejecutar el controlador físico de la cabeza | Instalar Python y configurar un entorno virtual |
| **pyserial** | Comunicación USB/serie entre Python y la controladora del robot | `pip install -r movimientos/requirements.txt` |
| **Arduino / controladora / motores** | Movimiento físico | Conectar hardware y comprobar el puerto; IDE solo si se necesita programar firmware |
| **Micrófono, altavoces, pantalla** | Interacción de Walter | Conectar y conceder permisos del sistema |
| **Conexión a Internet / servicio de voz** | Funciones conversacionales en tiempo real | Configurar las credenciales que utiliza la aplicación |

**Importante:** `package.json` y su archivo de bloqueo (`package-lock.json`, si existe) son la fuente real de las dependencias JavaScript. No conviene adivinar versiones ni instalar manualmente paquetes que `npm` ya gestiona.

## 2. Requisitos previos

### Software principal

1. **Node.js:** se recomienda comenzar con **Node.js 22.12 o posterior de la rama 22**, salvo que `package.json` (`engines`) o el archivo de bloqueo indiquen otra versión. Versiones antiguas de Node 20 provocaron advertencias `EBADENGINE` en una instalación anterior de Walter.
2. **npm:** viene incluido con Node.js.
3. **Python 3:** preferiblemente 3.10–3.12, sujeto a las bibliotecas adicionales que realmente use el proyecto.
4. **Git:** recomendado para descargar y actualizar el código; no es obligatorio si se entrega un ZIP.
5. **Editor (opcional):** Visual Studio Code.
6. **Hardware:** controladora y fuente de alimentación correctas para los motores, cable USB de datos, micrófono, altavoces y pantalla.

Sitios oficiales: [Node.js](https://nodejs.org/), [Python](https://www.python.org/downloads/), [Git](https://git-scm.com/downloads).

### Comprobar instalaciones

```bash
node -v
npm -v
python --version
```

En Ubuntu, normalmente se usa `python3 --version`; en Windows también se puede usar `py --version`.

## 3. Preparar los archivos del proyecto

1. Descargar o descomprimir el proyecto.
2. Abrir una terminal **en la raíz**, es decir, dentro de `walter-realtime-audio-wayala/`.
3. Verificar que existen `package.json`, `electron/` y `movimientos/`.
4. Conservar los scripts de arranque que ya funcionan: `Walter.bat`, `walter-final.bat` y/o `walter-final.sh`, según la copia y el sistema operativo.

Estructura **de referencia** (puede variar con la versión del ZIP):

```text
walter-realtime-audio-wayala/
├── package.json
├── package-lock.json                 # si está incluido
├── electron/
│   ├── main.cjs
│   └── preload.cjs
├── public/
├── src/
├── movimientos/
│   ├── head_controller.py
│   ├── test_all.txt
│   └── requirements.txt
├── Walter.bat                        # si está incluido
├── walter-final.bat                  # si está incluido
└── walter-final.sh                   # si está incluido
```

**No borrar `test_all.txt`:** contiene la secuencia que ya se utiliza para mover la cabeza.

## 4. Instalación en Windows (recomendada cuando se usan los `.bat`)

### 4.1. Instalar Node.js y Python

- Instalar Node.js desde su página oficial. Cerrar y volver a abrir la terminal.
- Instalar Python 3 desde su página oficial y activar **“Add Python to PATH”** si el instalador ofrece esa opción.
- Conectar la controladora del robot por USB y comprobar qué puerto COM tiene en el **Administrador de dispositivos → Puertos (COM y LPT)**.

### 4.2. Instalar dependencias JavaScript

Abrir **CMD** en la carpeta raíz del proyecto:

```bat
node -v
npm -v
```

Si existe `package-lock.json`:

```bat
npm ci
```

Si **no** existe `package-lock.json` o está desactualizado respecto de `package.json`:

```bat
npm install
```

Esto instala las dependencias declaradas en el proyecto, incluidas las de interfaz y Electron si están registradas. **No hace falta `npm install -g electron`.**

### 4.3. Instalar las dependencias de la cabeza

En la raíz del proyecto (CMD):

```bat
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r movimientos\requirements.txt
```

El `requirements.txt` de la integración documentada incluye **`pyserial`**. Para comprobarlo:

```bat
.venv\Scripts\python.exe -m pip show pyserial
.venv\Scripts\python.exe -m serial.tools.list_ports
```

Si tu copia no contiene `movimientos/requirements.txt`, pero el controlador sí utiliza `import serial`, instala al menos:

```bat
.venv\Scripts\python.exe -m pip install pyserial
```

### 4.4. Configurar Python y el puerto de la cabeza

En la **misma ventana CMD** desde la que iniciarás Walter:

```bat
set "WALTER_PYTHON=%CD%\.venv\Scripts\python.exe"
set "WALTER_HEAD_PORT=COM3"
```

- Cambia `COM3` por el puerto que Windows muestre para la controladora (`COM4`, `COM5`, etc.).
- La integración de cabeza documentada utiliza **1 000 000 baudios** de forma predeterminada; no cambies esta velocidad sin comprobar la configuración del firmware.
- Configurar `WALTER_PYTHON` es importante para que **Electron use el Python con `pyserial` instalado** y no otro Python del sistema.
- Las variables `set` permanecen activas solo en esa ventana de CMD. Al abrir una terminal nueva habrá que definirlas otra vez, o agregarlas al script de arranque.

### 4.5. Arrancar Walter

Desde la misma terminal, utiliza el `.bat` que corresponda a tu copia:

```bat
walter-final.bat
```

O bien:

```bat
Walter.bat
```

**Usa el archivo que ya fue probado en tu equipo; no ejecutes ambos a la vez.** En el proyecto también se utilizó `iniciar-walter.bat`, pero ese lanzador abre el navegador y no reemplaza necesariamente al arranque de Electron con control de cabeza.

## 5. Instalación en Ubuntu/Linux (Intel NUC)

### 5.1. Paquetes del sistema

```bash
sudo apt update
sudo apt install -y curl git python3 python3-venv python3-pip build-essential pkg-config
```

Instalar **Node.js 22** mediante un gestor de versiones como [`nvm`](https://github.com/nvm-sh/nvm) siguiendo sus instrucciones oficiales. Una vez instalado `nvm`:

```bash
nvm install 22
nvm use 22
node -v
npm -v
```

**No uses** `sudo npm install` dentro del proyecto.

### 5.2. Dependencias del proyecto

```bash
cd ~/Escritorio/WalterFinal/walter-realtime-audio-wayala
```

> Cambia la ruta si Walter está en otra carpeta.

```bash
# Si hay un package-lock.json consistente:
npm ci

# Si no existe ese archivo, usar npm install en su lugar.
```

### 5.3. Python y cabeza

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r movimientos/requirements.txt
./.venv/bin/python -m serial.tools.list_ports
```

Si falta el archivo `requirements.txt` y se confirma que solo falta la biblioteca serie:

```bash
./.venv/bin/python -m pip install pyserial
```

### 5.4. Permisos USB/serial

Detectar el dispositivo:

```bash
ls -l /dev/serial/by-id/ 2>/dev/null
ls /dev/ttyACM* /dev/ttyUSB* 2>/dev/null
```

Conceder a tu usuario acceso al grupo serie (típicamente `dialout` en Ubuntu):

```bash
sudo usermod -aG dialout "$USER"
```

**Cerrar sesión y volver a entrar** antes de verificar con `groups`. Esto evita ejecutar Walter con `sudo`.

### 5.5. Variables y arranque

```bash
export WALTER_PYTHON="$PWD/.venv/bin/python"
export WALTER_HEAD_PORT="/dev/serial/by-id/ID_REAL_DE_TU_CONTROLADORA"
```

Sustituye el ID de ejemplo por la ruta que realmente mostró `ls -l /dev/serial/by-id/`. Si ese directorio no existe, utiliza temporalmente el `/dev/ttyACM0` o `/dev/ttyUSB0` correcto.

El proyecto se ha iniciado en Ubuntu con:

```bash
chmod +x walter-final.sh
./walter-final.sh
```

El lanzador conocido abre el servidor de desarrollo y Electron. Si necesitas diagnosticar el inicio manualmente, consulta primero los scripts disponibles:

```bash
npm run
```

En la versión analizada anteriormente, el arranque manual se separaba entre `npm run dev` y `electron/main.cjs`, con la interfaz web en `http://localhost:3000`. Si el proyecto conserva ese flujo, puedes probarlo en **dos terminales**:

```bash
# Terminal 1
npm run dev
```

```bash
# Terminal 2 (desde la raíz del proyecto)
./node_modules/.bin/electron electron/main.cjs
```

**Nota:** si el `.sh` ya configura rutas, puertos o variables adicionales, es preferible utilizarlo antes que forzar el inicio manual.

## 6. Configuración de credenciales y audio

El módulo conversacional utiliza servicios y paquetes de voz/IA que requieren configuración propia. Antes de ejecutar:

1. Buscar si la copia del proyecto incluye `.env.example`, `.env.local.example` o documentación de variables de entorno.
2. Crear el archivo `.env` o `.env.local` **según la configuración del proyecto** (no asumir que ambos se leen).
3. Proporcionar la clave de API requerida mediante una variable **del lado del servidor**. Una variable habitual es `OPENAI_API_KEY`, pero el nombre efectivo debe confirmarse en el código de esa versión.
4. **No guardar claves en Git** ni exponerlas en variables públicas del navegador como `NEXT_PUBLIC_*`.
5. Seleccionar el micrófono y la salida de sonido correctos, y autorizar el acceso al micrófono en el sistema.
6. Confirmar que el equipo dispone de Internet para las funcionalidades en tiempo real que requieren conexión.

No se incluyen claves ni valores de ejemplo funcionales en este README.

## 7. Cómo debe funcionar la cabeza en la versión actual

El comportamiento acordado y probado para esta versión de Walter es:

```text
Iniciar Walter
      ↓
Iniciar Electron
      ↓
Electron inicia movimientos/head_controller.py
      ↓
Python abre el puerto serial configurado
      ↓
Se ejecuta la secuencia de movimientos/test_all.txt
      ↓
La cabeza se mueve al iniciar Walter,
sin depender de que la cámara reconozca a alguien
```

**La cámara de ojo de pez no debe usarse como condición para mover la cabeza en este flujo**, ya que puede producir seguimientos incorrectos. No iniciar controladores de movimiento duplicados contra el mismo puerto USB.

Antes de activar los motores, despejar el recorrido y verificar alimentación, límites y ausencia de obstrucciones. El arranque automático puede generar movimiento inesperado si alguien está manipulando el robot.

## 8. Comprobación final de instalación

Marca cada elemento cuando funcione:

- [ ] `node -v` y `npm -v` muestran versiones instaladas.
- [ ] `npm ci` o `npm install` termina sin errores.
- [ ] Python y el entorno virtual `.venv` funcionan.
- [ ] `pyserial` está instalado **en el Python que ejecuta Electron**.
- [ ] El sistema reconoce el puerto `COMx` o `/dev/ttyACM*`/`/dev/serial/by-id/*`.
- [ ] Las variables `WALTER_PYTHON` y `WALTER_HEAD_PORT` apuntan a valores reales.
- [ ] El archivo `movimientos/test_all.txt` está presente.
- [ ] Las credenciales requeridas por la aplicación están configuradas sin exponerse públicamente.
- [ ] Walter abre su interfaz con el lanzador correspondiente.
- [ ] El micrófono y los altavoces funcionan.
- [ ] La cabeza realiza su secuencia al iniciar, sin depender de la cámara.

## 9. Errores frecuentes y soluciones

### `npm warn EBADENGINE Unsupported engine`

Normalmente significa que la versión de Node.js no cumple los requisitos de alguna dependencia. En pruebas anteriores, Node 20 resultó insuficiente para parte del ecosistema instalado. Revisa `node -v`, `package.json` y los mensajes de `npm`; utiliza una versión compatible (por ejemplo, Node 22.12+ cuando corresponda) y reinstala sin modificar las versiones fijadas del proyecto innecesariamente.

### `Cannot find module ...` o no aparece Electron

Asegúrate de estar en la raíz del proyecto y de que se completó `npm ci` o `npm install`. Comprueba `npm run` y la dependencia local de Electron en `package.json`; evita depender de una instalación global.

### `ModuleNotFoundError: No module named 'serial'`

Electron está ejecutando un Python distinto o falta `pyserial`:

```bash
# Ubuntu
./.venv/bin/python -m pip install pyserial
```

```bat
REM Windows
.venv\Scripts\python.exe -m pip install pyserial
```

Comprueba la variable `WALTER_PYTHON` antes de iniciar Walter.

### `could not open port COM3` / `No such file or directory` para `/dev/serial/...`

El puerto configurado no existe, está desconectado, cambió de nombre o está ocupado por otra aplicación. Consulta el Administrador de dispositivos en Windows o `python -m serial.tools.list_ports` en Linux/Windows. Corrige `WALTER_HEAD_PORT` y cierra monitores serie que estén utilizando el dispositivo.

### `Permission denied: /dev/ttyACM0`

En Ubuntu, comprueba el grupo `dialout`, vuelve a iniciar sesión y verifica los permisos del dispositivo. No ejecutes toda la aplicación con `sudo` para esquivar el problema.

### `The SUID sandbox helper binary was found, but is not configured correctly` (Electron en Ubuntu)

Si el error menciona expresamente `node_modules/electron/dist/chrome-sandbox`, verifica primero que Electron se instaló desde una fuente confiable. Para la instalación local afectada, la corrección habitual es:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
ls -l node_modules/electron/dist/chrome-sandbox
```

Esto cambia permisos de un ejecutable con privilegios elevados: aplícalo **solo** a la ruta exacta indicada y únicamente si confías en ese binario. No se recomienda utilizar `--no-sandbox` como solución permanente.

### `[CONTROL] Error connecting via SDK: [object DOMException]`

Comprobar el dispositivo o servicio al que se conecta ese SDK, permisos, cable, puerto, uso simultáneo por otro proceso y el registro completo en consola. **Ese mensaje por sí solo no permite identificar la causa exacta.**

### Walter abre, pero no se mueve la cabeza

Revisa si Electron inició `head_controller.py`, si existe `test_all.txt`, si Python tiene `pyserial`, si el puerto serie coincide y si la controladora está alimentada. Realiza la prueba con el espacio físico despejado. Evita lanzar simultáneamente otro script que controle los mismos motores.

## 10. Componentes opcionales de otras pruebas de Walter

**No son requisitos obligatorios del arranque actual de la cabeza.** Úsalos solo si ejecutas los módulos correspondientes:

- **OpenCV / MediaPipe / NumPy:** para scripts de visión artificial y detección de personas o gestos.
- **Intel RealSense SDK y `pyrealsense2`:** si se usa una cámara RealSense de profundidad compatible.
- **Arduino IDE + librerías específicas del firmware:** si se necesita cargar o modificar el programa de Arduino/OpenRB/controladora; no hace falta reinstalarlas para cada arranque normal.
- **`serialport` de Node.js y Socket.IO:** solo si el `package.json` y los módulos empleados en tu copia los requieren; `npm` debe gestionar estas dependencias.

No instales estos componentes opcionales "por si acaso": algunos dependen de la versión exacta de Python, la arquitectura y el hardware.

## 11. Resumen rápido

| Windows | Ubuntu/Linux |
|---|---|
| Instalar Node.js y Python | Instalar Node.js, Python y herramientas del sistema |
| `npm ci` (o `npm install`) | `npm ci` (o `npm install`) |
| `py -3 -m venv .venv` | `python3 -m venv .venv` |
| `.venv\Scripts\python.exe -m pip install -r movimientos\requirements.txt` | `./.venv/bin/python -m pip install -r movimientos/requirements.txt` |
| Configurar `WALTER_PYTHON` y `WALTER_HEAD_PORT=COM3` | Configurar `WALTER_PYTHON`, `WALTER_HEAD_PORT` y permisos `dialout` |
| Iniciar con el `.bat` ya probado | Iniciar con `./walter-final.sh` |

---

### Alcance y verificación pendiente

Esta guía se ha construido a partir de la estructura y los problemas de instalación documentados previamente para Walter, junto con la integración de cabeza conocida. **No se ha podido inspeccionar aquí el ZIP completo de la versión final**, por lo que los nombres exactos de todos los paquetes npm, scripts, variables `.env` y drivers de cada controladora se deben contrastar con el `package.json`, los archivos de arranque y el hardware de la copia que se vaya a desplegar. La forma correcta de instalar las dependencias JavaScript del proyecto es a través de `npm ci`/`npm install`, no una lista adivinada de paquetes.
