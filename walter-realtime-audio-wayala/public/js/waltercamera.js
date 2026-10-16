let walterCameraInstance = null;
let walterFaceDetection = null;

let lastFaceCenter = null;
let lastFaceSeenAt = 0;

let smoothX = 0;
let smoothY = 0;

// ===============================
// SEGUIMIENTO DE VARIOS ROSTROS
// ===============================

let trackedFaces = [];
let nextFaceId = 1;

let activeFaceId = null;
let lastFaceSwitchAt = 0;

// ===============================
// CONFIGURACIÓN
// ===============================

const FACE_LOST_TIMEOUT = 900;
const FACE_SWITCH_INTERVAL = 4000;
const FACE_TRACK_TIMEOUT = 1300;
const FACE_MATCH_DISTANCE = 0.20;

const SMOOTHING = 0.25;
const DEAD_ZONE = 0.06;

const MAX_PUPIL_X = 80;
const MAX_PUPIL_Y = 80;

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

// ===============================
// UTILIDADES
// ===============================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyDeadZone(value) {
  if (Math.abs(value) < DEAD_ZONE) return 0;

  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - DEAD_ZONE) / (1 - DEAD_ZONE));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeCoordinate(value, size) {
  if (typeof value !== "number") return 0;
  return value > 1 ? value / Math.max(size, 1) : value;
}

function normalizeLength(value, size) {
  if (typeof value !== "number") return 0;
  return value > 1 ? value / Math.max(size, 1) : value;
}

// ===============================
// EXTRAER INFORMACIÓN DEL ROSTRO
// ===============================

function getDetectionInfo(detection, videoElement) {
  if (!detection || !videoElement) return null;

  const videoWidth = videoElement.videoWidth || CAMERA_WIDTH;
  const videoHeight = videoElement.videoHeight || CAMERA_HEIGHT;

  const box = detection.boundingBox;

  if (box) {
    if (
      typeof box.xCenter === "number" &&
      typeof box.yCenter === "number"
    ) {
      const x = normalizeCoordinate(box.xCenter, videoWidth);
      const y = normalizeCoordinate(box.yCenter, videoHeight);
      const width = normalizeLength(box.width, videoWidth);
      const height = normalizeLength(box.height, videoHeight);

      return {
        center: {
          x: clamp(x, 0, 1),
          y: clamp(y, 0, 1)
        },
        area: Math.max(0, width * height)
      };
    }

    if (
      typeof box.xMin === "number" &&
      typeof box.yMin === "number" &&
      typeof box.width === "number" &&
      typeof box.height === "number"
    ) {
      const normalizedXMin = normalizeCoordinate(box.xMin, videoWidth);
      const normalizedYMin = normalizeCoordinate(box.yMin, videoHeight);

      const width = normalizeLength(box.width, videoWidth);
      const height = normalizeLength(box.height, videoHeight);

      const x = normalizedXMin + width / 2;
      const y = normalizedYMin + height / 2;

      return {
        center: {
          x: clamp(x, 0, 1),
          y: clamp(y, 0, 1)
        },
        area: Math.max(0, width * height)
      };
    }
  }

  const relativeBox = detection.locationData?.relativeBoundingBox;

  if (relativeBox) {
    const width = relativeBox.width || 0;
    const height = relativeBox.height || 0;

    const x = relativeBox.xMin + width / 2;
    const y = relativeBox.yMin + height / 2;

    return {
      center: {
        x: clamp(x, 0, 1),
        y: clamp(y, 0, 1)
      },
      area: Math.max(0, width * height)
    };
  }

  return null;
}

// ===============================
// ACTUALIZAR ROSTROS RASTREADOS
// ===============================

function updateTrackedFaces(detections, videoElement, now) {
  const detectionInfos = detections
    .map((detection) => getDetectionInfo(detection, videoElement))
    .filter(Boolean);

  trackedFaces.forEach((face) => {
    face.visibleNow = false;
  });

  const usedFaceIds = new Set();

  for (const detectionInfo of detectionInfos) {
    let bestFace = null;
    let bestDistance = Infinity;

    for (const trackedFace of trackedFaces) {
      if (usedFaceIds.has(trackedFace.id)) continue;

      const currentDistance = distance(
        detectionInfo.center,
        trackedFace.center
      );

      if (
        currentDistance < bestDistance &&
        currentDistance <= FACE_MATCH_DISTANCE
      ) {
        bestDistance = currentDistance;
        bestFace = trackedFace;
      }
    }

    if (bestFace) {
      bestFace.center = detectionInfo.center;
      bestFace.area = detectionInfo.area;
      bestFace.lastSeenAt = now;
      bestFace.visibleNow = true;

      usedFaceIds.add(bestFace.id);
    } else {
      const newFace = {
        id: nextFaceId++,
        center: detectionInfo.center,
        area: detectionInfo.area,
        lastSeenAt: now,
        lastLookedAt: 0,
        visibleNow: true
      };

      trackedFaces.push(newFace);
      usedFaceIds.add(newFace.id);
    }
  }

  trackedFaces = trackedFaces.filter(
    (face) => now - face.lastSeenAt <= FACE_TRACK_TIMEOUT
  );

  return trackedFaces;
}

// ===============================
// SELECCIONAR ROSTRO ACTIVO
// ===============================

function selectLargestFace(faces) {
  if (faces.length === 0) return null;

  return [...faces].sort(
    (faceA, faceB) => faceB.area - faceA.area
  )[0];
}

function activateFace(face, now) {
  if (!face) {
    activeFaceId = null;
    return null;
  }

  activeFaceId = face.id;
  face.lastLookedAt = now;
  lastFaceSwitchAt = now;

  console.log(`Walter ahora mira al rostro ${face.id}.`);

  return face;
}

function chooseFace(detections, videoElement) {
  const now = Date.now();

  updateTrackedFaces(detections, videoElement, now);

  const visibleFaces = trackedFaces.filter((face) => face.visibleNow);
  const activeFace = trackedFaces.find((face) => face.id === activeFaceId);

  if (!activeFace) {
    const largestFace = selectLargestFace(visibleFaces);
    return activateFace(largestFace, now);
  }

  if (!activeFace.visibleNow) {
    const timeSinceActiveFaceSeen = now - activeFace.lastSeenAt;

    if (timeSinceActiveFaceSeen <= FACE_LOST_TIMEOUT) {
      return activeFace;
    }

    const replacementFace = selectLargestFace(visibleFaces);
    return activateFace(replacementFace, now);
  }

  if (visibleFaces.length <= 1) return activeFace;

  const timeLookingAtCurrentFace = now - lastFaceSwitchAt;

  if (timeLookingAtCurrentFace < FACE_SWITCH_INTERVAL) {
    return activeFace;
  }

  const otherFaces = visibleFaces
    .filter((face) => face.id !== activeFace.id)
    .sort((faceA, faceB) => {
      if (faceA.lastLookedAt !== faceB.lastLookedAt) {
        return faceA.lastLookedAt - faceB.lastLookedAt;
      }

      return faceB.area - faceA.area;
    });

  const nextFace = otherFaces[0];

  if (!nextFace) return activeFace;

  return activateFace(nextFace, now);
}

// ===============================
// MOVER PUPILAS SEGÚN ROSTRO
// ===============================

function updatePupilsFromFace(center) {
  if (
    !window.WalterEyes ||
    typeof window.WalterEyes.trackPupils !== "function"
  ) {
    console.warn("WalterEyes.trackPupils no está disponible.");
    return;
  }

  let normalizedX = -((center.x - 0.5) * 2);
  let normalizedY = (center.y - 0.5) * 2;

  normalizedX = applyDeadZone(normalizedX);
  normalizedY = applyDeadZone(normalizedY);

  const targetX = clamp(
    normalizedX * MAX_PUPIL_X,
    -MAX_PUPIL_X,
    MAX_PUPIL_X
  );

  const targetY = clamp(
    normalizedY * MAX_PUPIL_Y,
    -MAX_PUPIL_Y,
    MAX_PUPIL_Y
  );

  smoothX += (targetX - smoothX) * SMOOTHING;
  smoothY += (targetY - smoothY) * SMOOTHING;

  window.WalterEyes.trackPupils(smoothX, smoothY);
}

// ===============================
// VOLVER A POSICIÓN ORIGINAL
// ===============================

function returnPupilsHomeSmoothly() {
  if (!window.WalterEyes) return;

  smoothX *= 0.75;
  smoothY *= 0.75;

  if (Math.abs(smoothX) < 1 && Math.abs(smoothY) < 1) {
    smoothX = 0;
    smoothY = 0;

    if (typeof window.WalterEyes.lookHome === "function") {
      window.WalterEyes.lookHome();
    }

    return;
  }

  if (typeof window.WalterEyes.trackPupils === "function") {
    window.WalterEyes.trackPupils(smoothX, smoothY);
  }
}

// ===============================
// RESULTADOS DE MEDIAPIPE
// ===============================

function onFaceResults(results) {
  const detections = results.detections || [];
  const videoElement = window.WalterCameraVideo;

  if (!videoElement) return;

  const selectedFace = chooseFace(detections, videoElement);

  if (selectedFace) {
    const selectedCenter = selectedFace.center || selectedFace;

    window.WalterActiveFaceCenter = {
      x: selectedCenter.x,
      y: selectedCenter.y,
      seenAt: Date.now()
    };

    lastFaceCenter = selectedCenter;
    lastFaceSeenAt = Date.now();

    updatePupilsFromFace(selectedCenter);
  } else {
    const timeWithoutFace = Date.now() - lastFaceSeenAt;

    if (timeWithoutFace > FACE_LOST_TIMEOUT) {
      lastFaceCenter = null;
      window.WalterActiveFaceCenter = null;

      returnPupilsHomeSmoothly();
    }
  }

  const timeWithoutFace = Date.now() - lastFaceSeenAt;

  if (timeWithoutFace > FACE_LOST_TIMEOUT) {
    lastFaceCenter = null;
    activeFaceId = null;

    returnPupilsHomeSmoothly();
  }
}

// ===============================
// INICIAR CÁMARA
// ===============================

async function startWalterCamera() {
  if (!window.FaceDetection || !window.Camera) {
    console.error(
      "MediaPipe no está cargado. Revisa los scripts en display_walter.html."
    );

    return;
  }

  if (!window.WalterEyes) {
    console.error(
      "WalterEyes no está cargado. Revisa que speechojos.js cargue antes que waltercamera.js."
    );

    return;
  }

  const videoElement = document.createElement("video");

  videoElement.setAttribute("playsinline", "");
  videoElement.muted = true;
  videoElement.style.display = "none";

  document.body.appendChild(videoElement);

  window.WalterCameraVideo = videoElement;

  walterFaceDetection = new FaceDetection({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
  });

  walterFaceDetection.setOptions({
    model: "short",
    minDetectionConfidence: 0.55
  });

  walterFaceDetection.onResults(onFaceResults);

  walterCameraInstance = new Camera(videoElement, {
    onFrame: async () => {
      await walterFaceDetection.send({
        image: videoElement
      });
    },

    width: CAMERA_WIDTH,
    height: CAMERA_HEIGHT
  });

  try {
    await walterCameraInstance.start();

    console.log("Cámara de Walter iniciada correctamente.");
  } catch (error) {
    console.error(
      "No se pudo iniciar la cámara de Walter:",
      error
    );
  }
}

// ===============================
// DETENER CÁMARA
// ===============================

function stopWalterCamera() {
  if (
    walterCameraInstance &&
    typeof walterCameraInstance.stop === "function"
  ) {
    walterCameraInstance.stop();
  }

  walterCameraInstance = null;
  walterFaceDetection = null;

  lastFaceCenter = null;
  lastFaceSeenAt = 0;

  trackedFaces = [];
  nextFaceId = 1;

  activeFaceId = null;
  lastFaceSwitchAt = 0;

  smoothX = 0;
  smoothY = 0;

  if (
    window.WalterEyes &&
    typeof window.WalterEyes.lookHome === "function"
  ) {
    window.WalterEyes.lookHome();
  }

  console.log("Cámara de Walter detenida.");
}

// ===============================
// EXPONER FUNCIONES
// ===============================

window.WalterCameraFollow = {
  start: startWalterCamera,
  stop: stopWalterCamera
};

startWalterCamera();