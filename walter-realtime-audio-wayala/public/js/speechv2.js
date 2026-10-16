/*
 * speech.js
 * Este archivo queda solo para la síntesis de voz del navegador.
 */

var supportMsg = document.getElementById("msg");
var msg = null;

// Verificar soporte del navegador
if ("speechSynthesis" in window) {
  if (supportMsg) {
    supportMsg.innerHTML = "Su browser <strong>sí soporta</strong> la síntesis de voz.";
  }
} else {
  if (supportMsg) {
    supportMsg.innerHTML =
      "Lo siento <strong>no soporta</strong> la síntesis de voz.<br>Actualice su Google Chrome";
    supportMsg.classList.add("not-supported");
  }
}

// Elementos del HTML
var buttonSpeak = document.getElementById("speak");
var buttonConfigSpeak = document.getElementById("configSpeak");

var speechMsgInput = document.getElementById("speech-msg");
var voiceSelect = document.getElementById("voice");

var volumeInput = document.getElementById("volume");
var rateInput = document.getElementById("rate");
var pitchInput = document.getElementById("pitch");

/*
 * Cargar voces disponibles
 */
function loadVoices() {
  if (!voiceSelect) return;

  var voices = speechSynthesis.getVoices();

  // Evita que se dupliquen las voces cada vez que Chrome recarga la lista
  voiceSelect.innerHTML = "";

  voices.forEach(function (voice) {
    var option = document.createElement("option");
    option.value = voice.name;
    option.innerHTML = voice.name;
    voiceSelect.appendChild(option);
  });
}

loadVoices();

window.speechSynthesis.onvoiceschanged = function () {
  loadVoices();
};

/*
 * Crear o actualizar configuración de voz
 */
function createOrUpdateSpeechConfig() {
  msg = new SpeechSynthesisUtterance();

  if (volumeInput) {
    msg.volume = parseFloat(volumeInput.value);
  } else {
    msg.volume = 1;
  }

  if (rateInput) {
    msg.rate = parseFloat(rateInput.value);
  } else {
    msg.rate = 0.8;
  }

  if (pitchInput) {
    msg.pitch = parseFloat(pitchInput.value);
  } else {
    msg.pitch = 1.5;
  }

  if (voiceSelect && voiceSelect.value) {
    var selectedVoice = speechSynthesis.getVoices().find(function (voice) {
      return voice.name === voiceSelect.value;
    });

    if (selectedVoice) {
      msg.voice = selectedVoice;
    }
  }
}

/*
 * Función principal para hablar
 * Esta función la llama display.html cuando llega updateHabla.
 */
function speak(text) {
  console.log("Texto recibido para hablar:", text);

  if (!text || text.trim().length === 0) return;

  // Si todavía no se configuró la voz, se crea una configuración por defecto
  if (!msg) {
    createOrUpdateSpeechConfig();
  }

  // Cancelar cualquier voz anterior para evitar que se acumulen frases
  window.speechSynthesis.cancel();

  msg.text = text;

  // Cuando empieza a hablar, movemos la boca
  msg.onstart = function () {
    console.log("Walter empezó a hablar con speechSynthesis");

    if (window.WalterMouth) {
      window.WalterMouth.start();
    }
  };

  // Cuando termina de hablar, cerramos la boca
  msg.onend = function () {
    console.log("Walter terminó de hablar con speechSynthesis");

    if (window.WalterMouth) {
      window.WalterMouth.stop();
    }
  };

  // Si ocurre error, también cerramos la boca
  msg.onerror = function (event) {
    console.error("Error en speechSynthesis:", event);

    if (window.WalterMouth) {
      window.WalterMouth.stop();
    }
  };

  window.speechSynthesis.speak(msg);
}

/*
 * Botón para hablar manualmente
 */
if (buttonSpeak) {
  buttonSpeak.addEventListener("click", function () {
    if (speechMsgInput && speechMsgInput.value.length > 0) {
      speak(speechMsgInput.value);
    }
  });
}

/*
 * Botón para setear configuración manualmente
 */
if (buttonConfigSpeak) {
  buttonConfigSpeak.addEventListener("click", function () {
    createOrUpdateSpeechConfig();
    console.log("Configuración de voz seteada.");
  });
}