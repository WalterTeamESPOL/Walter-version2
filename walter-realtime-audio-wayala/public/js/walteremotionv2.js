(() => {
  "use strict";

  const TASKS_VISION_VERSION = "0.10.35";

  const TASKS_VISION_URL =
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/+esm`;

  const TASKS_VISION_WASM_URL =
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;

  const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/" +
    "face_landmarker/face_landmarker/float16/latest/" +
    "face_landmarker.task";

  const EMOTION_INTERVAL = 100;
  const SCORE_SMOOTHING = 0.35;

  const EXPRESSION_ON_FRAMES = 3;
  const EXPRESSION_OFF_FRAMES = 4;

  const FACE_LOST_TIMEOUT = 900;

  const HAPPY_ON_THRESHOLD = 0.48;
  const HAPPY_OFF_THRESHOLD = 0.30;

  const SAD_ON_THRESHOLD = 0.34;
  const SAD_OFF_THRESHOLD = 0.18;

  const ANGRY_ON_THRESHOLD = 0.42;
  const ANGRY_OFF_THRESHOLD = 0.32;

  const EYE_BLINK_CLOSED_THRESHOLD = 0.70;
  const EYE_BLINK_OPEN_THRESHOLD = 0.35;

  const CLOSED_EYES_SAD_TIME = 3000;
  const OPEN_EYES_NEUTRAL_TIME = 800;

  let debugEnabled = true;

  let FaceLandmarkerClass = null;
  let FilesetResolverClass = null;
  let faceLandmarker = null;

  let emotionRunning = false;
  let emotionProcessing = false;

  let emotionTimer = null;
  let dependencyTimer = null;

  let detectedExpression = "normal";

  let candidateExpression = "normal";
  let candidateFrames = 0;

  let smoothedHappyScore = 0;
  let smoothedSadScore = 0;
  let smoothedAngryScore = 0;

  let lastFaceSeenAt = 0;
  let lastDebugAt = 0;

  let eyesClosedSince = null;
  let eyesOpenSince = null;

  let sadTriggeredByClosedEyes = false;
  let lastVideoTimestamp = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothValue(current, target, smoothing) {
    return current + (target - current) * smoothing;
  }

  function getBlendshapeScore(categories, name) {
    if (!Array.isArray(categories)) return 0;

    const normalizedName = name.toLowerCase();

    const category = categories.find((item) => {
      const categoryName =
        (item.categoryName || item.displayName || "").toLowerCase();

      return categoryName === normalizedName;
    });

    if (!category) return 0;

    const score = Number(category.score);
    return Number.isFinite(score) ? clamp(score, 0, 1) : 0;
  }

  function getFaceInfo(landmarks) {
    if (!Array.isArray(landmarks) || landmarks.length === 0) return null;

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    landmarks.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const width = Math.max(0, maxX - minX);
    const height = Math.max(0, maxY - minY);

    return {
      center: {
        x: minX + width / 2,
        y: minY + height / 2
      },
      area: width * height
    };
  }

  function centerDistance(centerA, centerB) {
    const dx = centerA.x - centerB.x;
    const dy = centerA.y - centerB.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function chooseActiveFaceIndex(result) {
    const faces = result?.faceLandmarks;

    if (!Array.isArray(faces) || faces.length === 0) return -1;
    if (faces.length === 1) return 0;

    const faceInfos = faces.map(getFaceInfo);
    const activeCenter = window.WalterActiveFaceCenter;

    if (
      activeCenter &&
      typeof activeCenter.x === "number" &&
      typeof activeCenter.y === "number" &&
      Date.now() - (activeCenter.seenAt || 0) < 1600
    ) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      faceInfos.forEach((faceInfo, index) => {
        if (!faceInfo) return;

        const distance = centerDistance(faceInfo.center, activeCenter);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      return bestIndex;
    }

    let largestIndex = 0;
    let largestArea = 0;

    faceInfos.forEach((faceInfo, index) => {
      if (faceInfo && faceInfo.area > largestArea) {
        largestArea = faceInfo.area;
        largestIndex = index;
      }
    });

    return largestIndex;
  }

  function calculateBlendshapeMetrics(categories) {
    const smileLeft = getBlendshapeScore(categories, "mouthSmileLeft");
    const smileRight = getBlendshapeScore(categories, "mouthSmileRight");

    const cheekSquintLeft = getBlendshapeScore(categories, "cheekSquintLeft");
    const cheekSquintRight = getBlendshapeScore(categories, "cheekSquintRight");

    const smile = (smileLeft + smileRight) / 2;
    const cheekSquint = (cheekSquintLeft + cheekSquintRight) / 2;

    const happyScore = smile * 0.80 + cheekSquint * 0.20;

    const frownLeft = getBlendshapeScore(categories, "mouthFrownLeft");
    const frownRight = getBlendshapeScore(categories, "mouthFrownRight");
    const browInnerUp = getBlendshapeScore(categories, "browInnerUp");

    const frown = (frownLeft + frownRight) / 2;

    const frownNormalized = clamp(
      (frown - 0.04) / (0.16 - 0.04),
      0,
      1
    );

    const browInnerNormalized = clamp(
      (browInnerUp - 0.10) / (0.45 - 0.10),
      0,
      1
    );

    const sadScore =
      frownNormalized * 0.95 +
      browInnerNormalized * 0.05;

    const browDownLeft = getBlendshapeScore(categories, "browDownLeft");
    const browDownRight = getBlendshapeScore(categories, "browDownRight");

    const mouthPressLeft = getBlendshapeScore(categories, "mouthPressLeft");
    const mouthPressRight = getBlendshapeScore(categories, "mouthPressRight");

    const noseSneerLeft = getBlendshapeScore(categories, "noseSneerLeft");
    const noseSneerRight = getBlendshapeScore(categories, "noseSneerRight");

    const browDown = (browDownLeft + browDownRight) / 2;
    const mouthPress = (mouthPressLeft + mouthPressRight) / 2;
    const noseSneer = (noseSneerLeft + noseSneerRight) / 2;

    const browDownNormalized = clamp(
      (browDown - 0.08) / (0.38 - 0.08),
      0,
      1
    );

    const mouthPressNormalized = clamp(
      (mouthPress - 0.08) / (0.45 - 0.08),
      0,
      1
    );

    const noseSneerNormalized = clamp(
      (noseSneer - 0.08) / (0.45 - 0.08),
      0,
      1
    );

    const angryScore =
      browDownNormalized * 0.70 +
      mouthPressNormalized * 0.25 +
      noseSneerNormalized * 0.05;

    const eyeBlinkLeft = getBlendshapeScore(categories, "eyeBlinkLeft");
    const eyeBlinkRight = getBlendshapeScore(categories, "eyeBlinkRight");

    const bothEyesClosed =
      eyeBlinkLeft >= EYE_BLINK_CLOSED_THRESHOLD &&
      eyeBlinkRight >= EYE_BLINK_CLOSED_THRESHOLD;

    const bothEyesOpen =
      eyeBlinkLeft <= EYE_BLINK_OPEN_THRESHOLD &&
      eyeBlinkRight <= EYE_BLINK_OPEN_THRESHOLD;

    return {
      smileLeft,
      smileRight,
      smile,

      cheekSquintLeft,
      cheekSquintRight,
      cheekSquint,

      happyScore,

      frownNormalized,
      browInnerNormalized,

      frownLeft,
      frownRight,
      frown,

      browInnerUp,
      sadScore,

      browDownLeft,
      browDownRight,
      browDown,
      browDownNormalized,

      mouthPressLeft,
      mouthPressRight,
      mouthPress,
      mouthPressNormalized,

      noseSneerLeft,
      noseSneerRight,
      noseSneer,
      noseSneerNormalized,

      angryScore,

      eyeBlinkLeft,
      eyeBlinkRight,

      bothEyesClosed,
      bothEyesOpen
    };
  }

  function applyExpression(expression) {
    const allowed = ["normal", "happy", "sad", "angry"];
    const next = allowed.includes(expression) ? expression : "normal";

    if (detectedExpression === next) return;

    detectedExpression = next;
    window.WalterExpressionState = detectedExpression;

    if (
      window.WalterEyes &&
      typeof window.WalterEyes.setExpression === "function"
    ) {
      window.WalterEyes.setExpression(detectedExpression);
    } else if (
      window.WalterEyes &&
      typeof window.WalterEyes.setHappy === "function"
    ) {
      window.WalterEyes.setHappy(detectedExpression === "happy");
    }

    window.dispatchEvent(
      new CustomEvent("walter-expression-change", {
        detail: {
          expression: detectedExpression,
          happyScore: smoothedHappyScore,
          sadScore: smoothedSadScore,
          angryScore: smoothedAngryScore,
          sadTriggeredByClosedEyes
        }
      })
    );

    console.log(`[Emotion V2] ${detectedExpression}`);
  }

  function updateClosedEyesGesture(metrics) {
    const now = performance.now();

    if (metrics.bothEyesClosed) {
      eyesOpenSince = null;

      if (smoothedHappyScore >= HAPPY_ON_THRESHOLD) {
        eyesClosedSince = null;
        return;
      }

      if (eyesClosedSince === null) eyesClosedSince = now;

      const duration = now - eyesClosedSince;

      if (
        duration >= CLOSED_EYES_SAD_TIME &&
        !sadTriggeredByClosedEyes
      ) {
        sadTriggeredByClosedEyes = true;

        candidateExpression = "sad";
        candidateFrames = 0;

        applyExpression("sad");
      }

      return;
    }

    eyesClosedSince = null;

    if (!sadTriggeredByClosedEyes) {
      eyesOpenSince = null;
      return;
    }

    if (!metrics.bothEyesOpen) {
      eyesOpenSince = null;
      return;
    }

    if (eyesOpenSince === null) eyesOpenSince = now;

    const openDuration = now - eyesOpenSince;

    if (openDuration < OPEN_EYES_NEUTRAL_TIME) return;

    sadTriggeredByClosedEyes = false;
    eyesOpenSince = null;

    if (smoothedHappyScore >= HAPPY_ON_THRESHOLD) {
      applyExpression("happy");
      return;
    }

    if (smoothedSadScore >= SAD_ON_THRESHOLD) {
      applyExpression("sad");
      return;
    }

    applyExpression("normal");
  }

  function decideTargetExpression() {
    if (sadTriggeredByClosedEyes) return "sad";

    if (detectedExpression === "happy") {
      if (smoothedHappyScore >= HAPPY_OFF_THRESHOLD) return "happy";
      if (smoothedSadScore >= SAD_ON_THRESHOLD) return "sad";
      if (smoothedAngryScore >= ANGRY_ON_THRESHOLD) return "angry";

      return "normal";
    }

    if (detectedExpression === "sad") {
      if (smoothedHappyScore >= HAPPY_ON_THRESHOLD) return "happy";
      if (smoothedSadScore >= SAD_OFF_THRESHOLD) return "sad";
      if (smoothedAngryScore >= ANGRY_ON_THRESHOLD) return "angry";

      return "normal";
    }

    if (detectedExpression === "angry") {
      if (smoothedHappyScore >= HAPPY_ON_THRESHOLD) return "happy";
      if (smoothedSadScore >= SAD_ON_THRESHOLD) return "sad";
      if (smoothedAngryScore >= ANGRY_OFF_THRESHOLD) return "angry";

      return "normal";
    }

    if (
      smoothedHappyScore >= HAPPY_ON_THRESHOLD &&
      smoothedHappyScore > smoothedSadScore &&
      smoothedHappyScore > smoothedAngryScore
    ) {
      return "happy";
    }

    if (
      smoothedSadScore >= SAD_ON_THRESHOLD &&
      smoothedSadScore > smoothedHappyScore &&
      smoothedSadScore > smoothedAngryScore
    ) {
      return "sad";
    }

    if (
      smoothedAngryScore >= ANGRY_ON_THRESHOLD &&
      smoothedAngryScore > smoothedHappyScore &&
      smoothedAngryScore > smoothedSadScore
    ) {
      return "angry";
    }

    return "normal";
  }

  function updateExpressionScores(metrics) {
    smoothedHappyScore = smoothValue(
      smoothedHappyScore,
      metrics.happyScore,
      SCORE_SMOOTHING
    );

    smoothedSadScore = smoothValue(
      smoothedSadScore,
      metrics.sadScore,
      SCORE_SMOOTHING
    );

    smoothedAngryScore = smoothValue(
      smoothedAngryScore,
      metrics.angryScore,
      SCORE_SMOOTHING
    );
  }

  function updateExpressionState() {
    if (sadTriggeredByClosedEyes) {
      candidateExpression = "sad";
      candidateFrames = 0;
      return;
    }

    const target = decideTargetExpression();

    if (target === candidateExpression) {
      candidateFrames += 1;
    } else {
      candidateExpression = target;
      candidateFrames = 1;
    }

    const requiredFrames =
      target === "normal"
        ? EXPRESSION_OFF_FRAMES
        : EXPRESSION_ON_FRAMES;

    if (candidateFrames < requiredFrames) return;

    candidateFrames = 0;
    applyExpression(target);
  }

  function processFaceLandmarkerResult(result) {
    const faceIndex = chooseActiveFaceIndex(result);

    if (faceIndex < 0) {
      handleFaceLost();
      return;
    }

    const blendshapeFace = result.faceBlendshapes?.[faceIndex];
    const categories = blendshapeFace?.categories;

    if (!Array.isArray(categories) || categories.length === 0) {
      handleFaceLost();
      return;
    }

    lastFaceSeenAt = Date.now();

    const metrics = calculateBlendshapeMetrics(categories);

    updateExpressionScores(metrics);
    updateClosedEyesGesture(metrics);
    updateExpressionState();

    if (debugEnabled && Date.now() - lastDebugAt > 500) {
      lastDebugAt = Date.now();

      console.table({
        expression: detectedExpression,

        happy: smoothedHappyScore.toFixed(3),
        sad: smoothedSadScore.toFixed(3),
        angry: smoothedAngryScore.toFixed(3),

        smile: metrics.smile.toFixed(3),
        cheekSquint: metrics.cheekSquint.toFixed(3),

        frownRaw: metrics.frown.toFixed(3),
        frownNorm: metrics.frownNormalized.toFixed(3),

        browInnerUp: metrics.browInnerUp.toFixed(3),
        browInnerNorm: metrics.browInnerNormalized.toFixed(3),

        browDownRaw: metrics.browDown.toFixed(3),
        browDownNorm: metrics.browDownNormalized.toFixed(3),

        mouthPressRaw: metrics.mouthPress.toFixed(3),
        mouthPressNorm: metrics.mouthPressNormalized.toFixed(3),

        noseSneerRaw: metrics.noseSneer.toFixed(3),
        noseSneerNorm: metrics.noseSneerNormalized.toFixed(3),

        blinkLeft: metrics.eyeBlinkLeft.toFixed(3),
        blinkRight: metrics.eyeBlinkRight.toFixed(3),

        eyesClosed: metrics.bothEyesClosed,

        eyesClosedMs:
          eyesClosedSince === null
            ? 0
            : Math.round(performance.now() - eyesClosedSince),

        closedEyesSad: sadTriggeredByClosedEyes
      });
    }
  }

  function handleFaceLost() {
    if (
      lastFaceSeenAt > 0 &&
      Date.now() - lastFaceSeenAt < FACE_LOST_TIMEOUT
    ) {
      return;
    }

    smoothedHappyScore = 0;
    smoothedSadScore = 0;
    smoothedAngryScore = 0;

    candidateExpression = "normal";
    candidateFrames = 0;

    eyesClosedSince = null;
    eyesOpenSince = null;

    sadTriggeredByClosedEyes = false;

    applyExpression("normal");
  }

  function processFrame() {
    if (!emotionRunning) return;

    const video = window.WalterCameraVideo;

    if (
      !video ||
      video.readyState < 2 ||
      video.videoWidth <= 0
    ) {
      handleFaceLost();
      scheduleNextFrame();
      return;
    }

    if (emotionProcessing || !faceLandmarker) {
      scheduleNextFrame();
      return;
    }

    emotionProcessing = true;

    try {
      let timestamp = performance.now();

      if (timestamp <= lastVideoTimestamp) {
        timestamp = lastVideoTimestamp + 1;
      }

      lastVideoTimestamp = timestamp;

      const result = faceLandmarker.detectForVideo(video, timestamp);

      processFaceLandmarkerResult(result);
    } catch (error) {
      console.error(
        "[Walter Emotion V2] Error procesando frame:",
        error
      );
    } finally {
      emotionProcessing = false;
    }

    scheduleNextFrame();
  }

  function scheduleNextFrame() {
    if (!emotionRunning) return;

    if (emotionTimer !== null) {
      window.clearTimeout(emotionTimer);
    }

    emotionTimer = window.setTimeout(
      processFrame,
      EMOTION_INTERVAL
    );
  }

  async function loadTasksVision() {
    if (FaceLandmarkerClass && FilesetResolverClass) return;

    console.log(
      "[Walter Emotion V2] Cargando MediaPipe Tasks Vision..."
    );

    const vision = await import(TASKS_VISION_URL);

    FaceLandmarkerClass = vision.FaceLandmarker;
    FilesetResolverClass = vision.FilesetResolver;

    if (!FaceLandmarkerClass || !FilesetResolverClass) {
      throw new Error(
        "No se pudieron cargar FaceLandmarker o FilesetResolver."
      );
    }
  }

  async function createFaceLandmarker() {
    await loadTasksVision();

    const fileset =
      await FilesetResolverClass.forVisionTasks(
        TASKS_VISION_WASM_URL
      );

    try {
      faceLandmarker =
        await FaceLandmarkerClass.createFromOptions(
          fileset,
          {
            baseOptions: {
              modelAssetPath: FACE_LANDMARKER_MODEL_URL,
              delegate: "GPU"
            },

            runningMode: "VIDEO",
            numFaces: 4,

            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,

            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false
          }
        );

      console.log(
        "[Walter Emotion V2] Face Landmarker iniciado con GPU."
      );

      return;
    } catch (gpuError) {
      console.warn(
        "[Walter Emotion V2] GPU no disponible. Intentando CPU...",
        gpuError
      );
    }

    faceLandmarker =
      await FaceLandmarkerClass.createFromOptions(
        fileset,
        {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL_URL
          },

          runningMode: "VIDEO",
          numFaces: 4,

          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,

          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false
        }
      );

    console.log(
      "[Walter Emotion V2] Face Landmarker iniciado con CPU."
    );
  }

  function scheduleDependencyRetry() {
    if (dependencyTimer !== null) {
      window.clearTimeout(dependencyTimer);
    }

    dependencyTimer = window.setTimeout(() => {
      dependencyTimer = null;
      startWalterEmotionV2();
    }, 500);
  }

  async function startWalterEmotionV2() {
    if (emotionRunning) return;

    if (
      !window.WalterEyes ||
      typeof window.WalterEyes.setExpression !== "function"
    ) {
      console.warn(
        "[Walter Emotion V2] Esperando WalterEyes..."
      );

      scheduleDependencyRetry();
      return;
    }

    if (!window.WalterCameraVideo) {
      console.warn(
        "[Walter Emotion V2] Esperando WalterCameraVideo..."
      );

      scheduleDependencyRetry();
      return;
    }

    try {
      await createFaceLandmarker();
    } catch (error) {
      console.error(
        "[Walter Emotion V2] No se pudo inicializar:",
        error
      );

      return;
    }

    emotionRunning = true;

    detectedExpression = "normal";
    candidateExpression = "normal";
    candidateFrames = 0;

    smoothedHappyScore = 0;
    smoothedSadScore = 0;
    smoothedAngryScore = 0;

    window.WalterExpressionState = "normal";
    window.WalterEyes.setExpression("normal");

    processFrame();

    console.log(
      "[Walter Emotion V2] Reconocimiento iniciado."
    );
  }

  function stopWalterEmotionV2() {
    emotionRunning = false;
    emotionProcessing = false;

    if (emotionTimer !== null) {
      window.clearTimeout(emotionTimer);
      emotionTimer = null;
    }

    if (dependencyTimer !== null) {
      window.clearTimeout(dependencyTimer);
      dependencyTimer = null;
    }

    if (
      faceLandmarker &&
      typeof faceLandmarker.close === "function"
    ) {
      faceLandmarker.close();
    }

    faceLandmarker = null;

    smoothedHappyScore = 0;
    smoothedSadScore = 0;
    smoothedAngryScore = 0;

    candidateExpression = "normal";
    candidateFrames = 0;

    eyesClosedSince = null;
    eyesOpenSince = null;

    sadTriggeredByClosedEyes = false;
    detectedExpression = "normal";

    window.WalterExpressionState = "normal";

    if (
      window.WalterEyes &&
      typeof window.WalterEyes.setExpression === "function"
    ) {
      window.WalterEyes.setExpression("normal");
    }

    console.log(
      "[Walter Emotion V2] Reconocimiento detenido."
    );
  }

  window.WalterEmotionV2 = {
    start: startWalterEmotionV2,
    stop: stopWalterEmotionV2,

    setDebug(active) {
      debugEnabled = Boolean(active);

      console.log(
        debugEnabled
          ? "[Emotion V2] Debug ON"
          : "[Emotion V2] Debug OFF"
      );
    },

    getState() {
      return {
        running: emotionRunning,
        expression: detectedExpression,

        happyScore: smoothedHappyScore,
        sadScore: smoothedSadScore,
        angryScore: smoothedAngryScore,

        eyesClosedForMs:
          eyesClosedSince === null
            ? 0
            : Math.round(
                performance.now() - eyesClosedSince
              ),

        sadTriggeredByClosedEyes,

        faceLandmarkerReady: Boolean(faceLandmarker),
        videoReady: Boolean(window.WalterCameraVideo)
      };
    }
  };

  startWalterEmotionV2();
})();