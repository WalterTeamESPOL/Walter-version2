/*
 * walteremotion.js
 *
 * Detecta:
 * - normal
 * - happy: por la sonrisa
 * - sad: cuando ambos ojos permanecen cerrados durante 3 segundos
 *
 * No detecta tristeza por boca ni cejas.
 * Reutiliza window.WalterCameraVideo, creada por waltercamera.js.
 */

(() => {
  "use strict";

  // ===============================
  // ESTADO
  // ===============================

  let walterFaceMesh = null;
  let emotionLoopTimer = null;
  let dependencyRetryTimer = null;

  let emotionRunning = false;
  let emotionProcessing = false;

  let detectedExpression = "normal";

  // Sonrisa
  let smoothedSmileScore = 0;
  let positiveSmileFrames = 0;
  let negativeSmileFrames = 0;

  // Ojos
  let smoothedLeftEyeRatio = null;
  let smoothedRightEyeRatio = null;
  let openEyeBaseline = null;

  let eyesClosedDetected = false;
  let eyesClosedSince = null;
  let eyesOpenSince = null;
  let sadTriggeredByClosedEyes = false;

  let lastClosedThreshold = 0;
  let lastOpenThreshold = 0;

  let lastLandmarksSeenAt = 0;
  let lastDebugAt = 0;

  let emotionDebugEnabled = true;

  // ===============================
  // CONFIGURACIÓN
  // ===============================

  // Aproximadamente ocho análisis por segundo.
  const EMOTION_FRAME_INTERVAL = 120;

  // Tiempo sin rostro antes de volver a neutral.
  const EMOTION_FACE_LOST_TIMEOUT = 800;

  // Felicidad: valores que ya funcionaban.
  const SMILE_SCORE_SMOOTHING = 0.35;
  const SMILE_ON_THRESHOLD = 0.58;
  const SMILE_OFF_THRESHOLD = 0.42;

  const SMILE_ON_FRAMES = 3;
  const SMILE_OFF_FRAMES = 5;

  // Suavizado de apertura de ojos.
  const EYE_RATIO_SMOOTHING = 0.35;

  /*
   * Walter aprende lentamente cuánto suelen abrirse
   * los ojos de la persona detectada.
   */
  const OPEN_EYE_BASELINE_SMOOTHING = 0.03;

  /*
   * Umbrales dinámicos respecto a la apertura normal.
   *
   * Cerrado: aproximadamente 60 % de la apertura normal.
   * Abierto: aproximadamente 82 % de la apertura normal.
   */
  const EYE_CLOSED_BASELINE_FACTOR = 0.60;
  const EYE_OPEN_BASELINE_FACTOR = 0.82;

  /*
   * Límites para impedir que los umbrales dinámicos
   * adopten valores extremos.
   */
  const EYE_CLOSED_THRESHOLD_MIN = 0.10;
  const EYE_CLOSED_THRESHOLD_MAX = 0.20;

  const EYE_OPEN_THRESHOLD_MIN = 0.18;
  const EYE_OPEN_THRESHOLD_MAX = 0.32;

  // Tres segundos con ambos ojos cerrados.
  const EYES_CLOSED_SAD_TIME = 1000;

  /*
   * Los ojos deben permanecer claramente abiertos
   * durante 1.8 segundos para volver a neutral.
   *
   * Esto evita que bajar la cabeza provoque
   * un cambio falso a neutral.
   */
  const EYES_OPEN_NEUTRAL_TIME = 1200;

  // ===============================
  // UTILIDADES
  // ===============================

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function normalizeMetric(value, min, max) {
    if (max <= min) {
      return 0;
    }

    return clamp(
      (value - min) / (max - min),
      0,
      1
    );
  }

  function landmarkDistance(pointA, pointB) {
    if (!pointA || !pointB) {
      return 0;
    }

    const dx =
      pointA.x - pointB.x;

    const dy =
      pointA.y - pointB.y;

    const dz =
      (pointA.z || 0) -
      (pointB.z || 0);

    return Math.sqrt(
      dx * dx +
      dy * dy +
      dz * dz
    );
  }

  function landmarkDistance2D(pointA, pointB) {
    if (!pointA || !pointB) {
      return 0;
    }

    const dx =
      pointA.x - pointB.x;

    const dy =
      pointA.y - pointB.y;

    return Math.sqrt(
      dx * dx +
      dy * dy
    );
  }

  function getLandmarkFaceInfo(landmarks) {
    if (
      !Array.isArray(landmarks) ||
      landmarks.length === 0
    ) {
      return null;
    }

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    landmarks.forEach((point) => {
      minX = Math.min(
        minX,
        point.x
      );

      minY = Math.min(
        minY,
        point.y
      );

      maxX = Math.max(
        maxX,
        point.x
      );

      maxY = Math.max(
        maxY,
        point.y
      );
    });

    const width = Math.max(
      0,
      maxX - minX
    );

    const height = Math.max(
      0,
      maxY - minY
    );

    return {
      landmarks,

      center: {
        x: minX + width / 2,
        y: minY + height / 2
      },

      area:
        width * height
    };
  }

  function centerDistance(centerA, centerB) {
    const dx =
      centerA.x - centerB.x;

    const dy =
      centerA.y - centerB.y;

    return Math.sqrt(
      dx * dx +
      dy * dy
    );
  }

  // ===============================
  // SELECCIONAR EL ROSTRO ACTIVO
  // ===============================

  function chooseEmotionFace(
    multiFaceLandmarks
  ) {
    const faces =
      (multiFaceLandmarks || [])
        .map(getLandmarkFaceInfo)
        .filter(Boolean);

    if (faces.length === 0) {
      return null;
    }

    const activeCenter =
      window.WalterActiveFaceCenter;

    /*
     * Analiza a la misma persona que está
     * siguiendo waltercamera.js.
     */
    if (
      activeCenter &&
      typeof activeCenter.x === "number" &&
      typeof activeCenter.y === "number" &&
      Date.now() -
        (activeCenter.seenAt || 0) <
        1600
    ) {
      return faces.reduce(
        (closestFace, face) => {
          if (!closestFace) {
            return face;
          }

          const currentDistance =
            centerDistance(
              face.center,
              activeCenter
            );

          const closestDistance =
            centerDistance(
              closestFace.center,
              activeCenter
            );

          return currentDistance <
            closestDistance
            ? face
            : closestFace;
        },
        null
      );
    }

    /*
     * Si waltercamera.js todavía no seleccionó
     * un rostro, usar el más grande.
     */
    return faces.reduce(
      (largestFace, face) => {
        return (
          !largestFace ||
          face.area >
            largestFace.area
        )
          ? face
          : largestFace;
      },
      null
    );
  }

  // ===============================
  // RELACIÓN DE APERTURA DEL OJO
  // ===============================

  function calculateEyeAspectRatio(
    landmarks,
    outerCornerIndex,
    upperOuterIndex,
    upperInnerIndex,
    innerCornerIndex,
    lowerInnerIndex,
    lowerOuterIndex
  ) {
    const outerCorner =
      landmarks[outerCornerIndex];

    const upperOuter =
      landmarks[upperOuterIndex];

    const upperInner =
      landmarks[upperInnerIndex];

    const innerCorner =
      landmarks[innerCornerIndex];

    const lowerInner =
      landmarks[lowerInnerIndex];

    const lowerOuter =
      landmarks[lowerOuterIndex];

    if (
      !outerCorner ||
      !upperOuter ||
      !upperInner ||
      !innerCorner ||
      !lowerInner ||
      !lowerOuter
    ) {
      return null;
    }

    const verticalOuter =
      landmarkDistance2D(
        upperOuter,
        lowerOuter
      );

    const verticalInner =
      landmarkDistance2D(
        upperInner,
        lowerInner
      );

    const horizontal =
      landmarkDistance2D(
        outerCorner,
        innerCorner
      );

    if (horizontal < 0.0001) {
      return null;
    }

    return (
      verticalOuter +
      verticalInner
    ) / (2 * horizontal);
  }

  // ===============================
  // CALCULAR MÉTRICAS
  // ===============================

  function calculateExpressionMetrics(
    landmarks
  ) {
    /*
     * La boca únicamente se utiliza
     * para detectar felicidad.
     */
    const mouthLeft =
      landmarks[61];

    const mouthRight =
      landmarks[291];

    const upperLip =
      landmarks[13];

    const lowerLip =
      landmarks[14];

    const faceLeft =
      landmarks[234];

    const faceRight =
      landmarks[454];

    const faceTop =
      landmarks[10];

    const chin =
      landmarks[152];

    if (
      !mouthLeft ||
      !mouthRight ||
      !upperLip ||
      !lowerLip ||
      !faceLeft ||
      !faceRight ||
      !faceTop ||
      !chin
    ) {
      return null;
    }

    const faceWidth =
      landmarkDistance(
        faceLeft,
        faceRight
      );

    const faceHeight =
      landmarkDistance(
        faceTop,
        chin
      );

    const mouthWidth =
      landmarkDistance(
        mouthLeft,
        mouthRight
      );

    if (
      faceWidth < 0.001 ||
      faceHeight < 0.001
    ) {
      return null;
    }

    // ===================================
    // FELICIDAD
    // ===================================

    const mouthWidthRatio =
      mouthWidth / faceWidth;

    const mouthCornerY =
      (
        mouthLeft.y +
        mouthRight.y
      ) / 2;

    const mouthCenterY =
      (
        upperLip.y +
        lowerLip.y
      ) / 2;

    const cornerLiftRatio =
      (
        mouthCenterY -
        mouthCornerY
      ) / faceHeight;

    const widthScore =
      normalizeMetric(
        mouthWidthRatio,
        0.34,
        0.46
      );

    const liftScore =
      normalizeMetric(
        cornerLiftRatio,
        0.002,
        0.040
      );

    /*
     * Fórmula de sonrisa que ya funcionaba.
     */
    const smileScore =
      widthScore * 0.62 +
      liftScore * 0.38;

    // ===================================
    // OJOS
    // ===================================

    /*
     * Ojo izquierdo:
     * 33, 160, 158, 133, 153, 144
     */
    const leftEyeRatio =
      calculateEyeAspectRatio(
        landmarks,
        33,
        160,
        158,
        133,
        153,
        144
      );

    /*
     * Ojo derecho:
     * 362, 385, 387, 263, 373, 380
     */
    const rightEyeRatio =
      calculateEyeAspectRatio(
        landmarks,
        362,
        385,
        387,
        263,
        373,
        380
      );

    if (
      leftEyeRatio === null ||
      rightEyeRatio === null
    ) {
      return null;
    }

    return {
      smileScore,

      mouthWidthRatio,
      cornerLiftRatio,

      widthScore,
      liftScore,

      leftEyeRatio,
      rightEyeRatio,

      averageEyeRatio:
        (
          leftEyeRatio +
          rightEyeRatio
        ) / 2
    };
  }

  // ===============================
  // APLICAR EXPRESIÓN
  // ===============================

  function applyDetectedExpression(
    expression,
    force = false
  ) {
    const allowedExpressions = [
      "normal",
      "happy",
      "sad"
    ];

    const nextExpression =
      allowedExpressions.includes(
        expression
      )
        ? expression
        : "normal";

    if (
      !force &&
      detectedExpression ===
        nextExpression
    ) {
      return;
    }

    detectedExpression =
      nextExpression;

    window.WalterExpressionState =
      detectedExpression;

    if (
      window.WalterEyes &&
      typeof window.WalterEyes
        .setExpression === "function"
    ) {
      window.WalterEyes.setExpression(
        detectedExpression
      );
    } else if (
      window.WalterEyes &&
      typeof window.WalterEyes
        .setHappy === "function"
    ) {
      window.WalterEyes.setHappy(
        detectedExpression === "happy"
      );

      if (
        detectedExpression === "sad"
      ) {
        console.warn(
          "WalterEyes.setExpression no existe; " +
          "no se puede mostrar sad."
        );
      }
    }

    window.dispatchEvent(
      new CustomEvent(
        "walter-expression-change",
        {
          detail: {
            expression:
              detectedExpression,

            smileScore:
              smoothedSmileScore,

            sadTriggeredByClosedEyes
          }
        }
      )
    );

    console.log(
      `Expresión de Walter: ${detectedExpression}`
    );
  }

  // ===============================
  // ESTADO DE LOS OJOS
  // ===============================

  function updateEyeClosureState(
    metrics
  ) {
    /*
     * Suavizar el valor de cada ojo.
     */
    if (
      smoothedLeftEyeRatio === null
    ) {
      smoothedLeftEyeRatio =
        metrics.leftEyeRatio;

      smoothedRightEyeRatio =
        metrics.rightEyeRatio;
    } else {
      smoothedLeftEyeRatio +=
        (
          metrics.leftEyeRatio -
          smoothedLeftEyeRatio
        ) *
        EYE_RATIO_SMOOTHING;

      smoothedRightEyeRatio +=
        (
          metrics.rightEyeRatio -
          smoothedRightEyeRatio
        ) *
        EYE_RATIO_SMOOTHING;
    }

    const smoothedAverage =
      (
        smoothedLeftEyeRatio +
        smoothedRightEyeRatio
      ) / 2;

    /*
     * Inicializar la apertura normal.
     */
    if (
      openEyeBaseline === null
    ) {
      openEyeBaseline =
        Math.max(
          smoothedAverage,
          0.22
        );
    }

    /*
     * Umbral para considerar cerrados
     * los ojos.
     */
    const closedThreshold =
      clamp(
        openEyeBaseline *
          EYE_CLOSED_BASELINE_FACTOR,

        EYE_CLOSED_THRESHOLD_MIN,
        EYE_CLOSED_THRESHOLD_MAX
      );

    /*
     * Umbral separado para considerar
     * que los ojos se abrieron.
     */
    const openThreshold =
      clamp(
        openEyeBaseline *
          EYE_OPEN_BASELINE_FACTOR,

        EYE_OPEN_THRESHOLD_MIN,
        EYE_OPEN_THRESHOLD_MAX
      );

    lastClosedThreshold =
      closedThreshold;

    lastOpenThreshold =
      openThreshold;

    /*
     * Si el sistema considera abiertos
     * los ojos, comprobar si ambos cerraron.
     */
    if (!eyesClosedDetected) {
      const bothSmoothedClosed =
        smoothedLeftEyeRatio <=
          closedThreshold &&
        smoothedRightEyeRatio <=
          closedThreshold;

      if (bothSmoothedClosed) {
        eyesClosedDetected = true;
      } else if (
        !sadTriggeredByClosedEyes &&
        smoothedLeftEyeRatio >=
          openThreshold &&
        smoothedRightEyeRatio >=
          openThreshold
      ) {
        /*
         * Actualizar lentamente la apertura
         * normal mientras los ojos están abiertos.
         */
        openEyeBaseline +=
          (
            smoothedAverage -
            openEyeBaseline
          ) *
          OPEN_EYE_BASELINE_SMOOTHING;
      }
    } else {
      /*
       * Si se consideraban cerrados, exigir
       * una apertura clara para cambiar el estado.
       */
      const bothSmoothedOpen =
        smoothedLeftEyeRatio >=
          openThreshold &&
        smoothedRightEyeRatio >=
          openThreshold;

      /*
       * También se revisa el valor sin suavizar.
       * Esto reduce cambios provocados por un
       * único frame incorrecto.
       */
      const rawOpenThreshold =
        openThreshold * 0.95;

      const bothRawOpen =
        metrics.leftEyeRatio >=
          rawOpenThreshold &&
        metrics.rightEyeRatio >=
          rawOpenThreshold;

      if (
        bothSmoothedOpen &&
        bothRawOpen
      ) {
        eyesClosedDetected = false;
      }
    }

    return {
      closed:
        eyesClosedDetected,

      smoothedLeft:
        smoothedLeftEyeRatio,

      smoothedRight:
        smoothedRightEyeRatio,

      smoothedAverage,

      baseline:
        openEyeBaseline,

      closedThreshold,
      openThreshold
    };
  }

  // ===============================
  // ACTUALIZAR FELICIDAD
  // ===============================

  function updateSmileState(
    rawScore,
    eyesAreClosed
  ) {
    smoothedSmileScore +=
      (
        rawScore -
        smoothedSmileScore
      ) *
      SMILE_SCORE_SMOOTHING;

    /*
     * Mientras la tristeza por ojos cerrados
     * esté activa, no cambiar todavía a feliz.
     *
     * El cambio se hará cuando se confirme
     * que los ojos volvieron a abrirse.
     */
    if (sadTriggeredByClosedEyes) {
      positiveSmileFrames = 0;
      negativeSmileFrames = 0;

      return;
    }

    /*
     * Walter todavía no está feliz.
     */
    if (
      detectedExpression !== "happy"
    ) {
      if (
        !eyesAreClosed &&
        smoothedSmileScore >=
          SMILE_ON_THRESHOLD
      ) {
        positiveSmileFrames += 1;
      } else {
        positiveSmileFrames = 0;
      }

      negativeSmileFrames = 0;

      if (
        positiveSmileFrames >=
        SMILE_ON_FRAMES
      ) {
        positiveSmileFrames = 0;

        eyesClosedSince = null;
        eyesOpenSince = null;

        applyDetectedExpression(
          "happy"
        );
      }

      return;
    }

    /*
     * Walter actualmente está feliz.
     */
    if (
      smoothedSmileScore <=
      SMILE_OFF_THRESHOLD
    ) {
      negativeSmileFrames += 1;
    } else {
      negativeSmileFrames = 0;
    }

    positiveSmileFrames = 0;

    if (
      negativeSmileFrames >=
      SMILE_OFF_FRAMES
    ) {
      negativeSmileFrames = 0;

      applyDetectedExpression(
        "normal"
      );
    }
  }

  // ===============================
  // TRISTEZA POR OJOS CERRADOS
  // ===============================

  function updateClosedEyesSadness(
    eyeState
  ) {
    const now =
      performance.now();

    /*
     * Ambos ojos se consideran cerrados.
     */
    if (eyeState.closed) {
      eyesOpenSince = null;

      /*
       * Una sonrisa clara impide activar
       * tristeza con los ojos cerrados.
       */
      const notSmiling =
        smoothedSmileScore <
        SMILE_OFF_THRESHOLD;

      if (!notSmiling) {
        eyesClosedSince = null;
        return;
      }

      if (
        eyesClosedSince === null
      ) {
        eyesClosedSince = now;
      }

      const closedDuration =
        now - eyesClosedSince;

      /*
       * Después de tres segundos,
       * activar la expresión triste.
       */
      if (
        closedDuration >=
          EYES_CLOSED_SAD_TIME &&
        !sadTriggeredByClosedEyes
      ) {
        sadTriggeredByClosedEyes =
          true;

        applyDetectedExpression(
          "sad"
        );
      }

      return;
    }

    /*
     * El sistema considera que los ojos
     * están abiertos.
     */
    eyesClosedSince = null;

    if (!sadTriggeredByClosedEyes) {
      eyesOpenSince = null;
      return;
    }

    if (
      eyesOpenSince === null
    ) {
      eyesOpenSince = now;
    }

    const openDuration =
      now - eyesOpenSince;

    /*
     * No volver a neutral por una variación
     * momentánea al bajar o levantar la cabeza.
     */
    if (
      openDuration <
      EYES_OPEN_NEUTRAL_TIME
    ) {
      return;
    }

    sadTriggeredByClosedEyes =
      false;

    eyesOpenSince = null;

    /*
     * Al abrir los ojos:
     *
     * - si hay sonrisa, pasar a feliz;
     * - de lo contrario, volver a normal.
     */
    if (
      smoothedSmileScore >=
      SMILE_ON_THRESHOLD
    ) {
      applyDetectedExpression(
        "happy"
      );
    } else {
      applyDetectedExpression(
        "normal"
      );
    }
  }

  // ===============================
  // PÉRDIDA DEL ROSTRO
  // ===============================

  function resetEmotionAfterFaceLoss() {
    if (
      lastLandmarksSeenAt > 0 &&
      Date.now() -
        lastLandmarksSeenAt <=
        EMOTION_FACE_LOST_TIMEOUT
    ) {
      return;
    }

    smoothedSmileScore = 0;
    positiveSmileFrames = 0;
    negativeSmileFrames = 0;

    smoothedLeftEyeRatio = null;
    smoothedRightEyeRatio = null;
    openEyeBaseline = null;

    eyesClosedDetected = false;
    eyesClosedSince = null;
    eyesOpenSince = null;

    sadTriggeredByClosedEyes =
      false;

    applyDetectedExpression(
      "normal"
    );
  }

  // ===============================
  // RESULTADOS DE FACE MESH
  // ===============================

  function onEmotionResults(results) {
    const selectedFace =
      chooseEmotionFace(
        results.multiFaceLandmarks ||
          []
      );

    if (!selectedFace) {
      resetEmotionAfterFaceLoss();
      return;
    }

    lastLandmarksSeenAt =
      Date.now();

    const metrics =
      calculateExpressionMetrics(
        selectedFace.landmarks
      );

    if (!metrics) {
      resetEmotionAfterFaceLoss();
      return;
    }

    const eyeState =
      updateEyeClosureState(
        metrics
      );

    /*
     * Primero actualizar la sonrisa.
     */
    updateSmileState(
      metrics.smileScore,
      eyeState.closed
    );

    /*
     * La tristeza depende únicamente
     * de mantener ambos ojos cerrados.
     */
    updateClosedEyesSadness(
      eyeState
    );

    // =============================
    // DEBUG
    // =============================

    if (
      emotionDebugEnabled &&
      Date.now() -
        lastDebugAt >
        500
    ) {
      lastDebugAt =
        Date.now();

      console.table({
        expression:
          detectedExpression,

        smileRaw:
          metrics.smileScore.toFixed(
            3
          ),

        smileSmooth:
          smoothedSmileScore.toFixed(
            3
          ),

        leftEyeRaw:
          metrics.leftEyeRatio.toFixed(
            3
          ),

        rightEyeRaw:
          metrics.rightEyeRatio.toFixed(
            3
          ),

        leftEyeSmooth:
          eyeState.smoothedLeft.toFixed(
            3
          ),

        rightEyeSmooth:
          eyeState.smoothedRight.toFixed(
            3
          ),

        eyeBaseline:
          eyeState.baseline.toFixed(
            3
          ),

        closedThreshold:
          eyeState.closedThreshold.toFixed(
            3
          ),

        openThreshold:
          eyeState.openThreshold.toFixed(
            3
          ),

        eyesClosed:
          eyeState.closed,

        closedTimeMs:
          eyesClosedSince === null
            ? 0
            : Math.round(
                performance.now() -
                eyesClosedSince
              ),

        openTimeMs:
          eyesOpenSince === null
            ? 0
            : Math.round(
                performance.now() -
                eyesOpenSince
              ),

        closedEyesSad:
          sadTriggeredByClosedEyes
      });
    }
  }

  // ===============================
  // CICLO DE ANÁLISIS
  // ===============================

  async function processEmotionFrame() {
    if (!emotionRunning) {
      return;
    }

    const videoElement =
      window.WalterCameraVideo;

    if (
      !emotionProcessing &&
      walterFaceMesh &&
      videoElement &&
      videoElement.readyState >= 2 &&
      videoElement.videoWidth > 0
    ) {
      emotionProcessing = true;

      try {
        await walterFaceMesh.send({
          image: videoElement
        });
      } catch (error) {
        console.error(
          "Error analizando la expresión facial:",
          error
        );
      } finally {
        emotionProcessing = false;
      }
    } else if (
      !videoElement ||
      videoElement.readyState < 2
    ) {
      resetEmotionAfterFaceLoss();
    }

    emotionLoopTimer =
      window.setTimeout(
        processEmotionFrame,
        EMOTION_FRAME_INTERVAL
      );
  }

  // ===============================
  // ESPERAR DEPENDENCIAS
  // ===============================

  function scheduleDependencyRetry() {
    if (
      dependencyRetryTimer !== null
    ) {
      window.clearTimeout(
        dependencyRetryTimer
      );
    }

    dependencyRetryTimer =
      window.setTimeout(() => {
        dependencyRetryTimer = null;

        startWalterEmotion();
      }, 500);
  }

  // ===============================
  // INICIAR
  // ===============================

  async function startWalterEmotion() {
    if (emotionRunning) {
      return;
    }

    if (!window.FaceMesh) {
      console.warn(
        "Esperando MediaPipe Face Mesh..."
      );

      scheduleDependencyRetry();
      return;
    }

    if (
      !window.WalterEyes ||
      (
        typeof window.WalterEyes
          .setExpression !==
          "function" &&
        typeof window.WalterEyes
          .setHappy !==
          "function"
      )
    ) {
      console.warn(
        "Esperando WalterEyes..."
      );

      scheduleDependencyRetry();
      return;
    }

    walterFaceMesh =
      new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

    walterFaceMesh.setOptions({
      maxNumFaces: 4,
      refineLandmarks: false,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    walterFaceMesh.onResults(
      onEmotionResults
    );

    emotionRunning = true;
    detectedExpression = "normal";

    window.WalterExpressionState =
      "normal";

    if (
      typeof window.WalterEyes
        .setExpression ===
      "function"
    ) {
      window.WalterEyes.setExpression(
        "normal"
      );
    } else {
      window.WalterEyes.setHappy(
        false
      );
    }

    processEmotionFrame();

    console.log(
      "Reconocimiento de felicidad y tristeza por ojos iniciado."
    );
  }

  // ===============================
  // DETENER
  // ===============================

  function stopWalterEmotion() {
    emotionRunning = false;
    emotionProcessing = false;

    if (
      dependencyRetryTimer !== null
    ) {
      window.clearTimeout(
        dependencyRetryTimer
      );

      dependencyRetryTimer = null;
    }

    if (
      emotionLoopTimer !== null
    ) {
      window.clearTimeout(
        emotionLoopTimer
      );

      emotionLoopTimer = null;
    }

    if (
      walterFaceMesh &&
      typeof walterFaceMesh.close ===
        "function"
    ) {
      walterFaceMesh.close();
    }

    walterFaceMesh = null;

    smoothedSmileScore = 0;
    positiveSmileFrames = 0;
    negativeSmileFrames = 0;

    smoothedLeftEyeRatio = null;
    smoothedRightEyeRatio = null;
    openEyeBaseline = null;

    eyesClosedDetected = false;
    eyesClosedSince = null;
    eyesOpenSince = null;

    sadTriggeredByClosedEyes =
      false;

    applyDetectedExpression(
      "normal",
      true
    );

    console.log(
      "Reconocimiento de expresiones de Walter detenido."
    );
  }

  // ===============================
  // API GLOBAL
  // ===============================

  window.WalterEmotion = {
    start:
      startWalterEmotion,

    stop:
      stopWalterEmotion,

    setDebug(active) {
      emotionDebugEnabled =
        Boolean(active);

      console.log(
        emotionDebugEnabled
          ? "Debug de emociones activado."
          : "Debug de emociones desactivado."
      );
    },

    getState() {
      return {
        running:
          emotionRunning,

        processing:
          emotionProcessing,

        expression:
          detectedExpression,

        smileScore:
          smoothedSmileScore,

        leftEyeRatio:
          smoothedLeftEyeRatio,

        rightEyeRatio:
          smoothedRightEyeRatio,

        openEyeBaseline,

        eyesClosed:
          eyesClosedDetected,

        closedThreshold:
          lastClosedThreshold,

        openThreshold:
          lastOpenThreshold,

        eyesClosedForMs:
          eyesClosedSince === null
            ? 0
            : Math.round(
                performance.now() -
                eyesClosedSince
              ),

        eyesOpenForMs:
          eyesOpenSince === null
            ? 0
            : Math.round(
                performance.now() -
                eyesOpenSince
              ),

        sadTriggeredByClosedEyes,

        faceMeshLoaded:
          Boolean(window.FaceMesh),

        videoAvailable:
          Boolean(
            window.WalterCameraVideo
          ),

        expressionApiAvailable:
          Boolean(
            window.WalterEyes &&
            typeof window.WalterEyes
              .setExpression ===
              "function"
          )
      };
    }
  };

  // Arranque automático.
  startWalterEmotion();
})();