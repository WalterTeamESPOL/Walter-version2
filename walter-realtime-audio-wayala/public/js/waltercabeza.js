/*
 * speechcabeza.js
 *
 * Detecta un rostro mediante waltercamera.js.
 *
 * Cuando aparece:
 *   - mueve la cabeza inmediatamente;
 *   - repite cada 7 segundos.
 *
 * Cuando desaparece:
 *   - detiene las repeticiones.
 */

(() => {
  "use strict";

  // Conectar directamente al servidor de cabeza.
  const socket = io(
    "http://localhost:3001",
    {
      reconnection: true
    }
  );

  const FACE_CHECK_INTERVAL = 200;
  const FACE_CONFIRM_TIME = 500;
  const MOVEMENT_INTERVAL = 7000;

  let faceDetectedSince = 0;
  let faceConfirmed = false;
  let movementTimer = null;

  // =====================================
  // DETECCIÓN DE ROSTRO
  // =====================================

  function cameraAvailable() {
    return Boolean(
      window.WalterCameraFollow &&
      typeof window.WalterCameraFollow.getState ===
        "function"
    );
  }

  function isFaceDetected() {
    if (!cameraAvailable()) {
      return false;
    }

    const state =
      window.WalterCameraFollow.getState();

    return (
      state.activeFaceId !== null &&
      state.activeFaceId !== undefined &&
      state.lastFaceCenter !== null
    );
  }

  // =====================================
  // SOLICITAR MOVIMIENTO
  // =====================================

  function requestMovement() {
    if (!socket.connected) {
      console.warn(
        "[Cabeza] No está conectado serverprueba.js."
      );

      return;
    }

    console.log(
      "[Cabeza] Solicitando movimiento."
    );

    socket.emit(
      "probarMovimientoCabeza"
    );
  }

  // =====================================
  // INICIAR REPETICIÓN
  // =====================================

  function startMovementLoop() {
    if (movementTimer !== null) {
      return;
    }

    console.log(
      "[Cabeza] Rostro confirmado."
    );

    // Primer movimiento inmediatamente.
    requestMovement();

    // Repeticiones posteriores.
    movementTimer = window.setInterval(
      () => {
        if (!isFaceDetected()) {
          stopMovementLoop();
          return;
        }

        requestMovement();
      },
      MOVEMENT_INTERVAL
    );
  }

  // =====================================
  // DETENER REPETICIÓN
  // =====================================

  function stopMovementLoop() {
    if (movementTimer !== null) {
      window.clearInterval(
        movementTimer
      );

      movementTimer = null;
    }

    faceDetectedSince = 0;
    faceConfirmed = false;

    console.log(
      "[Cabeza] Rostro perdido. Movimiento detenido."
    );
  }

  // =====================================
  // REVISAR CÁMARA
  // =====================================

  function checkFace() {
    if (!cameraAvailable()) {
      return;
    }

    const faceDetected =
      isFaceDetected();

    if (!faceDetected) {
      if (
        faceConfirmed ||
        movementTimer !== null
      ) {
        stopMovementLoop();
      } else {
        faceDetectedSince = 0;
      }

      return;
    }

    if (faceConfirmed) {
      return;
    }

    if (faceDetectedSince === 0) {
      faceDetectedSince =
        Date.now();

      console.log(
        "[Cabeza] Posible rostro detectado."
      );

      return;
    }

    const visibleTime =
      Date.now() -
      faceDetectedSince;

    if (
      visibleTime <
      FACE_CONFIRM_TIME
    ) {
      return;
    }

    faceConfirmed = true;

    startMovementLoop();
  }

  // =====================================
  // SOCKET.IO
  // =====================================

  socket.on("connect", () => {
    console.log(
      "[Cabeza] Conectado al puerto 3001:",
      socket.id
    );
  });

  socket.on("connect_error", (error) => {
    console.error(
      "[Cabeza] No se pudo conectar al puerto 3001:",
      error.message
    );
  });

  socket.on("disconnect", () => {
    console.warn(
      "[Cabeza] Servidor de cabeza desconectado."
    );
  });

  socket.on(
    "estadoMovimientoCabeza",
    (data) => {
      console.log(
        "[Cabeza] Estado:",
        data
      );
    }
  );

  socket.on(
    "errorMovimientoCabeza",
    (data) => {
      console.error(
        "[Cabeza] Error Python:",
        data
      );
    }
  );

  // =====================================
  // INICIAR
  // =====================================

  window.setInterval(
    checkFace,
    FACE_CHECK_INTERVAL
  );

  window.WalterHeadTest = {
    test() {
      requestMovement();
    },

    getState() {
      return {
        socketConnected:
          socket.connected,

        cameraAvailable:
          cameraAvailable(),

        faceDetected:
          isFaceDetected(),

        faceConfirmed,

        repeating:
          movementTimer !== null
      };
    }
  };

  console.log(
    "[Cabeza] speechcabeza.js cargado."
  );
})();