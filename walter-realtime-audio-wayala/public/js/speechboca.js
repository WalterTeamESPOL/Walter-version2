(() => {
  "use strict";

  const MOUTH_INTERVAL = 180;

  let mouthTimer = null;
  let mouthOpenState = false;

  function getMouthParts() {
    return {
      mouthClosed: document.getElementById("mouthClosed"),
      mouthOpen: document.getElementById("mouthOpen"),
      mouthSad: document.getElementById("mouthSad"),
      mouthSadOpen: document.getElementById("mouthSadOpen"),
      mouthAngry: document.getElementById("mouthAngry"),
      mouthAngryOpen: document.getElementById("mouthAngryOpen")
    };
  }

  function getCurrentExpression() {
    if (typeof window.WalterExpressionState === "string") {
      return window.WalterExpressionState;
    }

    if (window.WalterEyes && typeof window.WalterEyes.getExpression === "function") {
      return window.WalterEyes.getExpression() || "normal";
    }

    return "normal";
  }

  function hideAllMouths() {
    const {
      mouthClosed,
      mouthOpen,
      mouthSad,
      mouthSadOpen,
      mouthAngry,
      mouthAngryOpen
    } = getMouthParts();

    if (mouthClosed) mouthClosed.style.display = "none";
    if (mouthOpen) mouthOpen.style.display = "none";
    if (mouthSad) mouthSad.style.display = "none";
    if (mouthSadOpen) mouthSadOpen.style.display = "none";
    if (mouthAngry) mouthAngry.style.display = "none";
    if (mouthAngryOpen) mouthAngryOpen.style.display = "none";
  }

  function showClosedMouth() {
    const { mouthClosed, mouthSad, mouthAngry } = getMouthParts();
    const expression = getCurrentExpression();

    hideAllMouths();

    if (expression === "sad") {
      if (mouthSad) mouthSad.style.display = "";
      return;
    }

    if (expression === "angry") {
      if (mouthAngry) mouthAngry.style.display = "";
      return;
    }

    if (mouthClosed) mouthClosed.style.display = "";
  }

  function showOpenMouth() {
    const { mouthOpen, mouthSadOpen, mouthAngryOpen } = getMouthParts();
    const expression = getCurrentExpression();

    hideAllMouths();

    if (expression === "sad") {
      if (mouthSadOpen) mouthSadOpen.style.display = "";
      return;
    }

    if (expression === "angry") {
      if (mouthAngryOpen) mouthAngryOpen.style.display = "";
      return;
    }

    if (mouthOpen) mouthOpen.style.display = "";
  }

  function renderCurrentMouthState() {
    if (mouthOpenState) {
      showOpenMouth();
    } else {
      showClosedMouth();
    }
  }

  function startMouthAnimation() {
    if (mouthTimer !== null) {
      window.clearInterval(mouthTimer);
      mouthTimer = null;
    }

    mouthOpenState = true;
    renderCurrentMouthState();

    mouthTimer = window.setInterval(() => {
      mouthOpenState = !mouthOpenState;
      renderCurrentMouthState();
    }, MOUTH_INTERVAL);

    console.log("Animación de boca de Walter iniciada.");
  }

  function stopMouthAnimation() {
    if (mouthTimer !== null) {
      window.clearInterval(mouthTimer);
      mouthTimer = null;
    }

    mouthOpenState = false;
    renderCurrentMouthState();

    console.log("Animación de boca de Walter detenida.");
  }

  function handleExpressionChange() {
    renderCurrentMouthState();
  }

  window.addEventListener("walter-expression-change", handleExpressionChange);

  window.WalterMouth = {
    start: startMouthAnimation,
    stop: stopMouthAnimation,

    open() {
      mouthOpenState = true;
      renderCurrentMouthState();
    },

    close() {
      mouthOpenState = false;
      renderCurrentMouthState();
    },

    refresh: renderCurrentMouthState,

    getState() {
      return {
        running: mouthTimer !== null,
        open: mouthOpenState,
        expression: getCurrentExpression()
      };
    }
  };

  const walterChannel = new BroadcastChannel("walter-channel");

  walterChannel.onmessage = function (event) {
    const data = event.data;

    if (!data || typeof data !== "object") return;

    if (data.type === "WALTER_AUDIO_START") {
      console.log("Walter empezó a hablar: moviendo la boca.");
      startMouthAnimation();
      return;
    }

    if (data.type === "WALTER_AUDIO_END") {
      console.log("Walter terminó de hablar: cerrando la boca.");
      stopMouthAnimation();
    }
  };

  function validateMouthElements() {
    const {
      mouthClosed,
      mouthOpen,
      mouthSad,
      mouthSadOpen,
      mouthAngry,
      mouthAngryOpen
    } = getMouthParts();

    const missingElements = [];

    if (!mouthClosed) missingElements.push("mouthClosed");
    if (!mouthOpen) missingElements.push("mouthOpen");
    if (!mouthSad) missingElements.push("mouthSad");
    if (!mouthSadOpen) missingElements.push("mouthSadOpen");
    if (!mouthAngry) missingElements.push("mouthAngry");
    if (!mouthAngryOpen) missingElements.push("mouthAngryOpen");

    if (missingElements.length > 0) {
      console.warn(
        "Faltan elementos de la boca en walter-face.svg:",
        missingElements
      );

      return false;
    }

    return true;
  }

  validateMouthElements();

  mouthOpenState = false;
  renderCurrentMouthState();

  console.log("Sistema de boca de Walter inicializado.");
})();