const BLINK_INTERVAL = 5000;
const BLINK_DURATION = 160;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

let blinkIntervalTimer = null;
let blinkEndTimer = null;

let eyeSequenceRunning = false;
let blinking = false;
let currentExpression = "normal";

let ORIGINAL = null;
let CURRENT_LOOK = null;

function getEyeParts() {
  return {
    eyeL: document.getElementById("eyeL"),
    eyeR: document.getElementById("eyeR"),
    eyeBaseL: document.getElementById("eyeBaseL"),
    eyeBaseR: document.getElementById("eyeBaseR"),
    angryEyeBaseL: document.getElementById("angryEyeBaseL"),
    angryEyeBaseR: document.getElementById("angryEyeBaseR"),
    eyeClipL: document.getElementById("eyeClipL"),
    eyeClipR: document.getElementById("eyeClipR"),
    pupilGroupL: document.getElementById("pupilGroupL"),
    pupilGroupR: document.getElementById("pupilGroupR"),
    pupilL: document.getElementById("pupilL"),
    pupilR: document.getElementById("pupilR"),
    happyLidL: document.getElementById("happyLidL"),
    happyLidR: document.getElementById("happyLidR"),
    sadLidL: document.getElementById("sadLidL"),
    sadLidR: document.getElementById("sadLidR")
  };
}

function numberAttribute(element, attribute, fallback) {
  if (!element) return fallback;

  const value = Number.parseFloat(element.getAttribute(attribute));
  return Number.isFinite(value) ? value : fallback;
}

function setElementVisible(element, visible) {
  if (!element) return;
  element.style.display = visible ? "block" : "none";
}

function ensureAngryClipPaths(svg, defs) {
  const { angryEyeBaseL, angryEyeBaseR } = getEyeParts();

  const configurations = [
    { id: "clipAngryEyeL", source: angryEyeBaseL },
    { id: "clipAngryEyeR", source: angryEyeBaseR }
  ];

  configurations.forEach(({ id, source }) => {
    if (!source) return;

    let clipPath = document.getElementById(id);

    if (!clipPath) {
      clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
      clipPath.setAttribute("id", id);
      defs.appendChild(clipPath);
    }

    let path = clipPath.querySelector("path");

    if (!path) {
      path = document.createElementNS(SVG_NAMESPACE, "path");
      clipPath.appendChild(path);
    }

    const d = source.getAttribute("d");
    if (d) path.setAttribute("d", d);
  });
}

function ensureEyeClipPaths() {
  const { eyeBaseL, pupilGroupL, pupilGroupR } = getEyeParts();
  const svg = eyeBaseL?.ownerSVGElement;

  if (!svg) return false;

  let defs = svg.querySelector("defs");

  if (!defs) {
    defs = document.createElementNS(SVG_NAMESPACE, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  let clipEyeL = document.getElementById("clipEyeL");
  let clipEyeR = document.getElementById("clipEyeR");

  if (!clipEyeL) {
    clipEyeL = document.createElementNS(SVG_NAMESPACE, "clipPath");
    clipEyeL.setAttribute("id", "clipEyeL");

    const ellipseL = document.createElementNS(SVG_NAMESPACE, "ellipse");
    ellipseL.setAttribute("id", "eyeClipL");
    ellipseL.setAttribute("cx", "0");
    ellipseL.setAttribute("cy", "0");
    ellipseL.setAttribute("rx", "115");
    ellipseL.setAttribute("ry", "125");

    clipEyeL.appendChild(ellipseL);
    defs.appendChild(clipEyeL);
  }

  if (!clipEyeR) {
    clipEyeR = document.createElementNS(SVG_NAMESPACE, "clipPath");
    clipEyeR.setAttribute("id", "clipEyeR");

    const ellipseR = document.createElementNS(SVG_NAMESPACE, "ellipse");
    ellipseR.setAttribute("id", "eyeClipR");
    ellipseR.setAttribute("cx", "0");
    ellipseR.setAttribute("cy", "0");
    ellipseR.setAttribute("rx", "115");
    ellipseR.setAttribute("ry", "125");

    clipEyeR.appendChild(ellipseR);
    defs.appendChild(clipEyeR);
  }

  ensureAngryClipPaths(svg, defs);

  if (pupilGroupL) pupilGroupL.setAttribute("clip-path", "url(#clipEyeL)");
  if (pupilGroupR) pupilGroupR.setAttribute("clip-path", "url(#clipEyeR)");

  return true;
}

function saveOriginalEyeState() {
  ensureEyeClipPaths();

  const { eyeBaseL, eyeBaseR, eyeClipL, eyeClipR, pupilL, pupilR } = getEyeParts();

  if (!eyeBaseL || !eyeBaseR || !pupilL || !pupilR) {
    console.warn("No se encontraron los ojos de Walter.");
    return false;
  }

  ORIGINAL = {
    eyeBaseLRy: numberAttribute(eyeBaseL, "ry", 125),
    eyeBaseRRy: numberAttribute(eyeBaseR, "ry", 125),
    eyeBaseLFill: eyeBaseL.getAttribute("fill") || "#1de4ff",
    eyeBaseRFill: eyeBaseR.getAttribute("fill") || "#1de4ff",
    eyeClipLRy: eyeClipL ? numberAttribute(eyeClipL, "ry", 125) : 125,
    eyeClipRRy: eyeClipR ? numberAttribute(eyeClipR, "ry", 125) : 125,
    pupilLCx: numberAttribute(pupilL, "cx", 55),
    pupilLCy: numberAttribute(pupilL, "cy", -45),
    pupilRCx: numberAttribute(pupilR, "cx", 55),
    pupilRCy: numberAttribute(pupilR, "cy", -45)
  };

  CURRENT_LOOK = {
    leftX: ORIGINAL.pupilLCx,
    leftY: ORIGINAL.pupilLCy,
    rightX: ORIGINAL.pupilRCx,
    rightY: ORIGINAL.pupilRCy
  };

  return true;
}

function ensureOriginalState() {
  if (ORIGINAL) return true;
  return saveOriginalEyeState();
}

function setPupilsVisible(visible) {
  const { pupilL, pupilR } = getEyeParts();

  if (pupilL) pupilL.style.visibility = visible ? "visible" : "hidden";
  if (pupilR) pupilR.style.visibility = visible ? "visible" : "hidden";
}

function hideExpressionLids() {
  const { happyLidL, happyLidR, sadLidL, sadLidR } = getEyeParts();

  setElementVisible(happyLidL, false);
  setElementVisible(happyLidR, false);
  setElementVisible(sadLidL, false);
  setElementVisible(sadLidR, false);
}

function setNormalPupilClips() {
  const { pupilGroupL, pupilGroupR } = getEyeParts();

  if (pupilGroupL) pupilGroupL.setAttribute("clip-path", "url(#clipEyeL)");
  if (pupilGroupR) pupilGroupR.setAttribute("clip-path", "url(#clipEyeR)");
}

function setAngryPupilClips() {
  const { pupilGroupL, pupilGroupR } = getEyeParts();

  if (pupilGroupL) pupilGroupL.setAttribute("clip-path", "url(#clipAngryEyeL)");
  if (pupilGroupR) pupilGroupR.setAttribute("clip-path", "url(#clipAngryEyeR)");
}

function setAngryEyesVisible(active) {
  const { eyeBaseL, eyeBaseR, angryEyeBaseL, angryEyeBaseR } = getEyeParts();

  if (active) {
    setElementVisible(eyeBaseL, false);
    setElementVisible(eyeBaseR, false);
    setElementVisible(angryEyeBaseL, true);
    setElementVisible(angryEyeBaseR, true);

    setAngryPupilClips();
    return;
  }

  setElementVisible(angryEyeBaseL, false);
  setElementVisible(angryEyeBaseR, false);
  setElementVisible(eyeBaseL, true);
  setElementVisible(eyeBaseR, true);

  setNormalPupilClips();
}

function renderExpression() {
  const { happyLidL, happyLidR, sadLidL, sadLidR } = getEyeParts();

  hideExpressionLids();

  if (blinking) return;

  setAngryEyesVisible(currentExpression === "angry");

  if (currentExpression === "happy") {
    setElementVisible(happyLidL, true);
    setElementVisible(happyLidR, true);
    return;
  }

  if (currentExpression === "sad") {
    setElementVisible(sadLidL, true);
    setElementVisible(sadLidR, true);
  }
}

function setExpression(expression) {
  const allowedExpressions = ["normal", "happy", "sad", "angry"];
  const nextExpression = allowedExpressions.includes(expression) ? expression : "normal";

  currentExpression = nextExpression;
  window.WalterExpressionState = currentExpression;

  renderExpression();

  return currentExpression;
}

function showHappyEyes() {
  return setExpression("happy");
}

function showSadEyes() {
  return setExpression("sad");
}

function showNormalEyes() {
  return setExpression("normal");
}

function showAngryEyes() {
  return setExpression("angry");
}

function setHappyExpression(active) {
  return setExpression(active ? "happy" : "normal");
}

function applyCurrentLook() {
  const { pupilL, pupilR } = getEyeParts();

  if (!CURRENT_LOOK) return;

  if (pupilL) {
    pupilL.setAttribute("cx", CURRENT_LOOK.leftX);
    pupilL.setAttribute("cy", CURRENT_LOOK.leftY);
  }

  if (pupilR) {
    pupilR.setAttribute("cx", CURRENT_LOOK.rightX);
    pupilR.setAttribute("cy", CURRENT_LOOK.rightY);
  }
}

function setCurrentLook(leftX, leftY, rightX = leftX, rightY = leftY) {
  CURRENT_LOOK = { leftX, leftY, rightX, rightY };
  applyCurrentLook();
}

function lookHome() {
  if (!ensureOriginalState()) return;

  setCurrentLook(
    ORIGINAL.pupilLCx,
    ORIGINAL.pupilLCy,
    ORIGINAL.pupilRCx,
    ORIGINAL.pupilRCy
  );
}

function movePupils(x, y) {
  if (!ensureOriginalState()) return;

  const maxX = 28;
  const maxY = 20;

  const limitedX = Math.max(-maxX, Math.min(maxX, x));
  const limitedY = Math.max(-maxY, Math.min(maxY, y));

  setCurrentLook(
    ORIGINAL.pupilLCx + limitedX,
    ORIGINAL.pupilLCy + limitedY,
    ORIGINAL.pupilRCx + limitedX,
    ORIGINAL.pupilRCy + limitedY
  );
}

function trackPupils(x, y) {
  if (!ensureOriginalState()) return;

  const maxX = 80;
  const maxY = 80;

  const limitedX = Math.max(-maxX, Math.min(maxX, x));
  const limitedY = Math.max(-maxY, Math.min(maxY, y));

  setCurrentLook(limitedX, limitedY, limitedX, limitedY);
}

function closeEyesVisual() {
  if (!ensureOriginalState()) return;

  const {
    eyeBaseL,
    eyeBaseR,
    angryEyeBaseL,
    angryEyeBaseR,
    eyeClipL,
    eyeClipR
  } = getEyeParts();

  blinking = true;

  hideExpressionLids();
  setPupilsVisible(false);

  if (currentExpression === "angry") {
    const angryColorL = angryEyeBaseL?.getAttribute("fill") || "#ff1a1a";
    const angryColorR = angryEyeBaseR?.getAttribute("fill") || "#ff1a1a";

    setElementVisible(angryEyeBaseL, false);
    setElementVisible(angryEyeBaseR, false);
    setElementVisible(eyeBaseL, true);
    setElementVisible(eyeBaseR, true);

    if (eyeBaseL) eyeBaseL.setAttribute("fill", angryColorL);
    if (eyeBaseR) eyeBaseR.setAttribute("fill", angryColorR);
  } else {
    setElementVisible(angryEyeBaseL, false);
    setElementVisible(angryEyeBaseR, false);
    setElementVisible(eyeBaseL, true);
    setElementVisible(eyeBaseR, true);
  }

  if (eyeBaseL) eyeBaseL.setAttribute("ry", "5");
  if (eyeBaseR) eyeBaseR.setAttribute("ry", "5");
  if (eyeClipL) eyeClipL.setAttribute("ry", "5");
  if (eyeClipR) eyeClipR.setAttribute("ry", "5");
}

function openEyesVisual() {
  if (!ensureOriginalState()) return;

  const { eyeBaseL, eyeBaseR, eyeClipL, eyeClipR } = getEyeParts();

  if (eyeBaseL) {
    eyeBaseL.setAttribute("ry", ORIGINAL.eyeBaseLRy);
    eyeBaseL.setAttribute("fill", ORIGINAL.eyeBaseLFill);
  }

  if (eyeBaseR) {
    eyeBaseR.setAttribute("ry", ORIGINAL.eyeBaseRRy);
    eyeBaseR.setAttribute("fill", ORIGINAL.eyeBaseRFill);
  }

  if (eyeClipL) eyeClipL.setAttribute("ry", ORIGINAL.eyeClipLRy);
  if (eyeClipR) eyeClipR.setAttribute("ry", ORIGINAL.eyeClipRRy);

  applyCurrentLook();
  setPupilsVisible(true);

  blinking = false;

  renderExpression();
}

function blinkOnce() {
  if (blinking) return;

  if (blinkEndTimer !== null) {
    window.clearTimeout(blinkEndTimer);
    blinkEndTimer = null;
  }

  closeEyesVisual();

  blinkEndTimer = window.setTimeout(() => {
    blinkEndTimer = null;
    openEyesVisual();
  }, BLINK_DURATION);
}

function scheduleNextBlink() {
  if (!eyeSequenceRunning) return;

  if (blinkIntervalTimer !== null) {
    window.clearTimeout(blinkIntervalTimer);
  }

  blinkIntervalTimer = window.setTimeout(() => {
    blinkIntervalTimer = null;
    blinkOnce();
    scheduleNextBlink();
  }, BLINK_INTERVAL);
}

function startEyeSequence() {
  if (!ensureOriginalState()) return;

  eyeSequenceRunning = true;

  openEyesVisual();
  renderExpression();
  scheduleNextBlink();

  console.log("Parpadeo automático de Walter iniciado cada 5 segundos.");
}

function stopEyeSequence() {
  eyeSequenceRunning = false;

  if (blinkIntervalTimer !== null) {
    window.clearTimeout(blinkIntervalTimer);
    blinkIntervalTimer = null;
  }

  if (blinkEndTimer !== null) {
    window.clearTimeout(blinkEndTimer);
    blinkEndTimer = null;
  }

  openEyesVisual();

  console.log("Parpadeo automático de Walter detenido.");
}

window.WalterEyes = {
  blink: blinkOnce,
  close: closeEyesVisual,
  open: openEyesVisual,
  start: startEyeSequence,
  stop: stopEyeSequence,

  setExpression,
  getExpression: () => currentExpression,

  normal: showNormalEyes,
  happy: showHappyEyes,
  sad: showSadEyes,
  angry: showAngryEyes,

  setHappy: setHappyExpression,

  lookHome,
  movePupils,
  trackPupils,

  isBlinking: () => blinking,
  isRunning: () => eyeSequenceRunning
};

function initializeWalterEyes() {
  if (!saveOriginalEyeState()) {
    console.error("No se pudo inicializar speechojos.js.");
    return;
  }

  window.WalterExpressionState = "normal";

  setExpression("normal");
  startEyeSequence();

  console.log("Sistema de ojos de Walter inicializado.");
}

initializeWalterEyes();