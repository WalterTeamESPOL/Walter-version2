//  const { app, BrowserWindow } = require("electron");

//  let ventanaWalter;

//  app.commandLine.appendSwitch(
//    "autoplay-policy",
//    "no-user-gesture-required"
//  );

//  function crearVentana() {
//    console.log("[Electron] Creando ventana...");

//    ventanaWalter = new BrowserWindow({
//      width: 1000,
//      height: 700,

//      show: true,
//      fullscreen: true,
//      kiosk: true,
//      frame: false,
//      autoHideMenuBar: true,

//      backgroundColor: "#000000",

//      webPreferences: {
//        nodeIntegration: false,
//        contextIsolation: true,
//        backgroundThrottling: false,
//      },
//    });

//    ventanaWalter.setMenu(null);

//    const urlWalter =
//      "http://localhost:3000/display_walter.html";

//    console.log("[Electron] Cargando:", urlWalter);

//    ventanaWalter.loadURL(urlWalter);

//    ventanaWalter.webContents.on(
//      "did-finish-load",
//      () => {
//        console.log("[Electron] HTML cargado correctamente.");

//        ventanaWalter.show();
//        ventanaWalter.focus();
//        ventanaWalter.setKiosk(true);
//        ventanaWalter.setFullScreen(true);
//      }
//    );

//    ventanaWalter.webContents.on(
//      "did-fail-load",
//      (
//        event,
//        errorCode,
//       errorDescription,
//        validatedURL
//      ) => {
//        console.error("[Electron] ERROR AL CARGAR:");
//        console.error("Codigo:", errorCode);
//        console.error("Descripcion:", errorDescription);
//        console.error("URL:", validatedURL);
//      }
//    );

//    ventanaWalter.on("closed", () => {
//      ventanaWalter = null;
//    });
//  }

//  app.whenReady().then(() => {
//    console.log("[Electron] Aplicacion lista.");
//    crearVentana();
//  });

//  app.on("window-all-closed", () => {
//    app.quit();
//  });
// const {
//   app,
//   BrowserWindow,
//   globalShortcut,
//   screen,
//   session,
// } = require("electron");

// const http = require("node:http");

// const CONTROL_URL = "http://localhost:3000";
// const DISPLAY_URL =
//   "http://localhost:3000/display_walter.html";

// let ventanaControl = null;
// let ventanaDisplay = null;

// // Permitir que el audio de Walter se reproduzca
// // sin tener que hacer clic en la ventana.
// app.commandLine.appendSwitch(
//   "autoplay-policy",
//   "no-user-gesture-required"
// );

// // ======================================================
// // ESPERAR A QUE NEXT.JS ESTÉ DISPONIBLE
// // ======================================================

// function comprobarServidor() {
//   return new Promise((resolve) => {
//     const request = http.get(CONTROL_URL, (response) => {
//       response.resume();

//       const disponible =
//         response.statusCode >= 200 &&
//         response.statusCode < 500;

//       resolve(disponible);
//     });

//     request.setTimeout(1000, () => {
//       request.destroy();
//       resolve(false);
//     });

//     request.on("error", () => {
//       resolve(false);
//     });
//   });
// }

// async function esperarServidor() {
//   console.log(
//     "[Electron] Esperando http://localhost:3000..."
//   );

//   // 120 intentos cada 500 ms = aproximadamente 60 segundos.
//   for (let intento = 1; intento <= 120; intento++) {
//     const disponible = await comprobarServidor();

//     if (disponible) {
//       console.log(
//         "[Electron] Next.js y la API están disponibles."
//       );

//       return;
//     }

//     await new Promise((resolve) => {
//       setTimeout(resolve, 500);
//     });
//   }

//   throw new Error(
//     "Next.js no respondió en http://localhost:3000"
//   );
// }

// // ======================================================
// // PERMISOS DE MICRÓFONO
// // ======================================================

// function esOrigenWalter(url = "") {
//   return url.startsWith("http://localhost:3000");
// }

// function configurarPermisos() {
//   session.defaultSession.setPermissionRequestHandler(
//     (webContents, permission, callback, details) => {
//       const urlSolicitante =
//         details?.requestingUrl ||
//         webContents?.getURL() ||
//         "";

//       const permisoPermitido =
//         permission === "media" ||
//         permission === "fullscreen";

//       const permitir =
//         esOrigenWalter(urlSolicitante) &&
//         permisoPermitido;

//       console.log(
//         `[Electron] Permiso ${permission}: ${permitir}`
//       );

//       callback(permitir);
//     }
//   );

//   session.defaultSession.setPermissionCheckHandler(
//     (
//       webContents,
//       permission,
//       requestingOrigin,
//       details
//     ) => {
//       const urlSolicitante =
//         requestingOrigin ||
//         details?.requestingUrl ||
//         webContents?.getURL() ||
//         "";

//       const permisoPermitido =
//         permission === "media" ||
//         permission === "fullscreen";

//       return (
//         esOrigenWalter(urlSolicitante) &&
//         permisoPermitido
//       );
//     }
//   );
// }
// // ======================================================
// // VENTANA OCULTA: API REALTIME, VOZ Y MICRÓFONO
// // ======================================================

// async function crearVentanaControl() {
//   console.log(
//     "[Electron] Cargando agente Realtime en segundo plano..."
//   );

//   ventanaControl = new BrowserWindow({
//     width: 1000,
//     height: 700,

//     // No aparece visualmente.
//     show: false,

//     // No aparece en la barra de tareas.
//     skipTaskbar: true,

//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,

//       // Evita que Electron ralentice timers,
//       // WebRTC y animaciones por estar oculta.
//       backgroundThrottling: false,
//     },
//   });

//   // Asegurar que el audio de Walter no quede silenciado.
//   ventanaControl.webContents.setAudioMuted(false);

//   ventanaControl.webContents.on(
//     "did-finish-load",
//     () => {
//       console.log(
//         "[Electron] Página principal cargada."
//       );

//       console.log(
//         "[Electron] El agente Realtime está ejecutándose en segundo plano."
//       );
//     }
//   );

//   ventanaControl.webContents.on(
//     "did-fail-load",
//     (
//       event,
//       errorCode,
//       errorDescription,
//       validatedURL
//     ) => {
//       console.error(
//         "[Electron] Error cargando el agente:"
//       );

//       console.error("Código:", errorCode);
//       console.error(
//         "Descripción:",
//         errorDescription
//       );
//       console.error("URL:", validatedURL);
//     }
//   );

//   ventanaControl.webContents.on(
//     "console-message",
//     (
//       event,
//       level,
//       message,
//       line,
//       sourceId
//     ) => {
//       console.log(
//         `[CONTROL] ${message}`
//       );
//     }
//   );

//   await ventanaControl.loadURL(CONTROL_URL);

//   ventanaControl.hide();
// }
// // ======================================================
// // SELECCIONAR PANTALLA
// // ======================================================

// function seleccionarPantallaWalter() {
//   const pantallas = screen.getAllDisplays();
//   const principal = screen.getPrimaryDisplay();

//   console.log(
//     `[Electron] Pantallas detectadas: ${pantallas.length}`
//   );

//   // Priorizar pantalla secundaria.
//   const secundaria = pantallas.find(
//     (pantalla) => pantalla.id !== principal.id
//   );

//   return secundaria || principal;
// }

// // ======================================================
// // VENTANA VISIBLE: ROSTRO
// // ======================================================

// async function crearVentanaDisplay() {
//   const pantalla = seleccionarPantallaWalter();

//   const {
//     x,
//     y,
//     width,
//     height,
//   } = pantalla.bounds;

//   console.log(
//     "[Electron] Abriendo display de Walter..."
//   );

//   ventanaDisplay = new BrowserWindow({
//     x,
//     y,
//     width,
//     height,

//     show: false,
//     fullscreen: true,
//     kiosk: true,
//     frame: false,

//     autoHideMenuBar: true,
//     alwaysOnTop: true,

//     backgroundColor: "#000000",

//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,
//       backgroundThrottling: false,
//     },
//   });

//   ventanaDisplay.setMenu(null);
//   ventanaDisplay.setMenuBarVisibility(false);

//   ventanaDisplay.webContents.setWindowOpenHandler(
//     () => ({
//       action: "deny",
//     })
//   );

//   ventanaDisplay.once("ready-to-show", () => {
//     ventanaDisplay.setBounds({
//       x,
//       y,
//       width,
//       height,
//     });

//     ventanaDisplay.show();
//     ventanaDisplay.setKiosk(true);
//     ventanaDisplay.setFullScreen(true);

//     ventanaDisplay.setAlwaysOnTop(
//       true,
//       "screen-saver"
//     );

//     ventanaDisplay.moveTop();
//     ventanaDisplay.focus();

//     console.log(
//       "[Electron] Display visible en modo kiosco."
//     );
//   });

//   ventanaDisplay.webContents.on(
//     "did-finish-load",
//     () => {
//       console.log(
//         "[Electron] display_walter.html cargado."
//       );
//     }
//   );

//   ventanaDisplay.webContents.on(
//     "did-fail-load",
//     (
//       event,
//       errorCode,
//       errorDescription,
//       validatedURL
//     ) => {
//       console.error(
//         "[Electron] Error cargando el display:"
//       );

//       console.error("Código:", errorCode);
//       console.error(
//         "Descripción:",
//         errorDescription
//       );
//       console.error("URL:", validatedURL);
//     }
//   );

//   ventanaDisplay.on("closed", () => {
//     ventanaDisplay = null;

//     // Cerrar también la ventana oculta.
//     app.quit();
//   });

//   await ventanaDisplay.loadURL(DISPLAY_URL);
// }

// // ======================================================
// // INICIO DE ELECTRON
// // ======================================================

// app.whenReady().then(async () => {
//   try {
//     configurarPermisos();

//     // Esperar hasta que npm run dev esté listo.
//     await esperarServidor();

//     // Primero cargar el agente, voz y micrófono.
//     await crearVentanaControl();

//     // Después mostrar el rostro.
//     await crearVentanaDisplay();

//     // F11: entrar o salir del modo kiosco.
//     globalShortcut.register("F11", () => {
//       if (
//         !ventanaDisplay ||
//         ventanaDisplay.isDestroyed()
//       ) {
//         return;
//       }

//       const modoKiosco =
//         ventanaDisplay.isKiosk();

//       ventanaDisplay.setKiosk(!modoKiosco);
//       ventanaDisplay.setFullScreen(!modoKiosco);

//       ventanaDisplay.show();
//       ventanaDisplay.focus();
//     });

//     // Ctrl + Shift + Q: cerrar Electron.
//     globalShortcut.register(
//       "CommandOrControl+Shift+Q",
//       () => {
//         app.quit();
//       }
//     );
//   } catch (error) {
//     console.error(
//       "[Electron] No se pudo iniciar Walter:"
//     );

//     console.error(error);

//     app.quit();
//   }
// });

// // ======================================================
// // CIERRE
// // ======================================================

// app.on("will-quit", () => {
//   globalShortcut.unregisterAll();
// });
// app.on("window-all-closed", () => {
//   app.quit();
// });

const {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  session,
} = require("electron");

const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const CONTROL_URL = "http://localhost:3000";
const DISPLAY_URL =
  "http://localhost:3000/display_walter.html";

let ventanaControl = null;
let ventanaDisplay = null;

// ======================================================
// MOVIMIENTO DE CABEZA AL INICIAR WALTER
// ======================================================

let procesoMovimientoCabeza = null;

function iniciarMovimientoCabeza() {
  if (
    procesoMovimientoCabeza &&
    !procesoMovimientoCabeza.killed
  ) {
    console.log(
      "[Cabeza] El proceso de movimiento ya está corriendo."
    );
    return;
  }

  const scriptPython = path.join(
    __dirname,
    "..",
    "movimientos",
    "test_movimientos.py"
  );

  const pythonCommand =
    process.env.WALTER_PYTHON ||
    (process.platform === "win32" ? "python" : "python3");

  console.log(
    `[Cabeza] Iniciando movimiento automático con ${pythonCommand}: ${scriptPython}`
  );

  try {
    procesoMovimientoCabeza = spawn(
      pythonCommand,
      ["-u", scriptPython],
      {
        cwd: path.dirname(scriptPython),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    procesoMovimientoCabeza.stdout.on(
      "data",
      (data) => {
        const texto = data.toString().trim();

        if (texto) {
          console.log(`[Cabeza] ${texto}`);
        }
      }
    );

    procesoMovimientoCabeza.stderr.on(
      "data",
      (data) => {
        const texto = data.toString().trim();

        if (texto) {
          console.error(
            `[Cabeza ERROR] ${texto}`
          );
        }
      }
    );

    procesoMovimientoCabeza.on(
      "error",
      (error) => {
        console.error(
          "[Cabeza] No se pudo iniciar el proceso Python:"
        );
        console.error(error);
      }
    );

    procesoMovimientoCabeza.on(
      "close",
      (code, signal) => {
        console.log(
          `[Cabeza] Proceso finalizado. code=${code} signal=${signal}`
        );

        procesoMovimientoCabeza = null;
      }
    );
  } catch (error) {
    console.error(
      "[Cabeza] Error al lanzar test_movimientos.py:"
    );
    console.error(error);
  }
}

function detenerMovimientoCabeza() {
  if (!procesoMovimientoCabeza) {
    return;
  }

  console.log(
    "[Cabeza] Deteniendo movimiento de cabeza..."
  );

  try {
    if (process.platform === "win32") {
      spawn(
        "taskkill",
        [
          "/pid",
          String(procesoMovimientoCabeza.pid),
          "/t",
          "/f",
        ],
        {
          windowsHide: true,
          stdio: "ignore",
        }
      );
    } else {
      procesoMovimientoCabeza.kill("SIGTERM");
    }
  } catch (error) {
    console.error(
      "[Cabeza] Error al detener el proceso:"
    );
    console.error(error);
  }
}

// Permitir que el audio de Walter se reproduzca
// sin tener que hacer clic en la ventana.
app.commandLine.appendSwitch(
  "autoplay-policy",
  "no-user-gesture-required"
);

// ======================================================
// ESPERAR A QUE NEXT.JS ESTÉ DISPONIBLE
// ======================================================

function comprobarServidor() {
  return new Promise((resolve) => {
    const request = http.get(CONTROL_URL, (response) => {
      response.resume();

      const disponible =
        response.statusCode >= 200 &&
        response.statusCode < 500;

      resolve(disponible);
    });

    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => {
      resolve(false);
    });
  });
}

async function esperarServidor() {
  console.log(
    "[Electron] Esperando http://localhost:3000..."
  );

  // 120 intentos cada 500 ms = aproximadamente 60 segundos.
  for (let intento = 1; intento <= 120; intento++) {
    const disponible = await comprobarServidor();

    if (disponible) {
      console.log(
        "[Electron] Next.js y la API están disponibles."
      );

      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  throw new Error(
    "Next.js no respondió en http://localhost:3000"
  );
}

// ======================================================
// PERMISOS DE MICRÓFONO
// ======================================================

function esOrigenWalter(url = "") {
  return url.startsWith("http://localhost:3000");
}

function configurarPermisos() {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const urlSolicitante =
        details?.requestingUrl ||
        webContents?.getURL() ||
        "";

      const permisoPermitido =
        permission === "media" ||
        permission === "fullscreen";

      const permitir =
        esOrigenWalter(urlSolicitante) &&
        permisoPermitido;

      console.log(
        `[Electron] Permiso ${permission}: ${permitir}`
      );

      callback(permitir);
    }
  );

  session.defaultSession.setPermissionCheckHandler(
    (
      webContents,
      permission,
      requestingOrigin,
      details
    ) => {
      const urlSolicitante =
        requestingOrigin ||
        details?.requestingUrl ||
        webContents?.getURL() ||
        "";

      const permisoPermitido =
        permission === "media" ||
        permission === "fullscreen";

      return (
        esOrigenWalter(urlSolicitante) &&
        permisoPermitido
      );
    }
  );
}

// ======================================================
// VENTANA OCULTA: API REALTIME, VOZ Y MICRÓFONO
// ======================================================

async function crearVentanaControl() {
  console.log(
    "[Electron] Cargando agente Realtime en segundo plano..."
  );

  ventanaControl = new BrowserWindow({
    width: 1000,
    height: 700,

    // No aparece visualmente.
    show: false,

    // No aparece en la barra de tareas.
    skipTaskbar: true,

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,

      // Evita que Electron ralentice timers,
      // WebRTC y animaciones por estar oculta.
      backgroundThrottling: false,
    },
  });

  // Asegurar que el audio de Walter no quede silenciado.
  ventanaControl.webContents.setAudioMuted(false);

  ventanaControl.webContents.on(
    "did-finish-load",
    () => {
      console.log(
        "[Electron] Página principal cargada."
      );

      console.log(
        "[Electron] El agente Realtime está ejecutándose en segundo plano."
      );
    }
  );

  ventanaControl.webContents.on(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {
      console.error(
        "[Electron] Error cargando el agente:"
      );

      console.error("Código:", errorCode);
      console.error(
        "Descripción:",
        errorDescription
      );
      console.error("URL:", validatedURL);
    }
  );

  ventanaControl.webContents.on(
    "console-message",
    (
      event,
      level,
      message,
      line,
      sourceId
    ) => {
      console.log(
        `[CONTROL] ${message}`
      );
    }
  );

  await ventanaControl.loadURL(CONTROL_URL);

  ventanaControl.hide();
}

// ======================================================
// SELECCIONAR PANTALLA
// ======================================================

function seleccionarPantallaWalter() {
  const pantallas = screen.getAllDisplays();
  const principal = screen.getPrimaryDisplay();

  console.log(
    `[Electron] Pantallas detectadas: ${pantallas.length}`
  );

  // Priorizar pantalla secundaria.
  const secundaria = pantallas.find(
    (pantalla) => pantalla.id !== principal.id
  );

  return secundaria || principal;
}

// ======================================================
// VENTANA VISIBLE: ROSTRO
// ======================================================

async function crearVentanaDisplay() {
  const pantalla = seleccionarPantallaWalter();

  const {
    x,
    y,
    width,
    height,
  } = pantalla.bounds;

  console.log(
    "[Electron] Abriendo display de Walter..."
  );

  ventanaDisplay = new BrowserWindow({
    x,
    y,
    width,
    height,

    show: false,
    fullscreen: true,
    kiosk: true,
    frame: false,

    autoHideMenuBar: true,
    alwaysOnTop: true,

    backgroundColor: "#000000",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  ventanaDisplay.setMenu(null);
  ventanaDisplay.setMenuBarVisibility(false);

  ventanaDisplay.webContents.setWindowOpenHandler(
    () => ({
      action: "deny",
    })
  );

  ventanaDisplay.once("ready-to-show", () => {
    ventanaDisplay.setBounds({
      x,
      y,
      width,
      height,
    });

    ventanaDisplay.show();
    ventanaDisplay.setKiosk(true);
    ventanaDisplay.setFullScreen(true);

    ventanaDisplay.setAlwaysOnTop(
      true,
      "screen-saver"
    );

    ventanaDisplay.moveTop();
    ventanaDisplay.focus();

    console.log(
      "[Electron] Display visible en modo kiosco."
    );
  });

  ventanaDisplay.webContents.on(
    "did-finish-load",
    () => {
      console.log(
        "[Electron] display_walter.html cargado."
      );
    }
  );

  ventanaDisplay.webContents.on(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {
      console.error(
        "[Electron] Error cargando el display:"
      );

      console.error("Código:", errorCode);
      console.error(
        "Descripción:",
        errorDescription
      );
      console.error("URL:", validatedURL);
    }
  );

  ventanaDisplay.on("closed", () => {
    ventanaDisplay = null;

    // Cerrar también la ventana oculta.
    app.quit();
  });

  await ventanaDisplay.loadURL(DISPLAY_URL);
}

// ======================================================
// INICIO DE ELECTRON
// ======================================================

app.whenReady().then(async () => {
  try {
    configurarPermisos();

    // Esperar hasta que npm run dev esté listo.
    await esperarServidor();

    // Iniciar el movimiento de cabeza apenas arranca Walter.
    iniciarMovimientoCabeza();

    // Primero cargar el agente, voz y micrófono.
    await crearVentanaControl();

    // Después mostrar el rostro.
    await crearVentanaDisplay();

    // F11: entrar o salir del modo kiosco.
    globalShortcut.register("F11", () => {
      if (
        !ventanaDisplay ||
        ventanaDisplay.isDestroyed()
      ) {
        return;
      }

      const modoKiosco =
        ventanaDisplay.isKiosk();

      ventanaDisplay.setKiosk(!modoKiosco);
      ventanaDisplay.setFullScreen(!modoKiosco);

      ventanaDisplay.show();
      ventanaDisplay.focus();
    });

    // Ctrl + Shift + Q: cerrar Electron.
    globalShortcut.register(
      "CommandOrControl+Shift+Q",
      () => {
        app.quit();
      }
    );
  } catch (error) {
    console.error(
      "[Electron] No se pudo iniciar Walter:"
    );

    console.error(error);

    app.quit();
  }
});

// ======================================================
// CIERRE
// ======================================================

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  detenerMovimientoCabeza();
});

app.on("window-all-closed", () => {
  app.quit();
});