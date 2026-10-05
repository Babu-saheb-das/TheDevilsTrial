(function initDevilSpeech(global) {
  "use strict";

  var PITCH_MIN = 0.4;
  var PITCH_MAX = 0.6;
  var RATE_MIN = 0.7;
  var RATE_MAX = 0.8;

  var START_LINES = [
    "Mortal coder. Five chambers. Your soul is the wager.",
    "The trial begins. Speak the output, or burn.",
    "Kneel, Knight Coder. The first chamber hungers."
  ];

  var RAGE_TAUNTS = [
    "You strike true. I will remember this insult.",
    "A lucky glyph. The next chamber will break you.",
    "My flesh recedes. Do not mistake that for mercy.",
    "Rage. You dare wound the Demon Lord."
  ];

  var MOCK_TAUNTS = [
    "Pathetic. Even the runes laugh at you.",
    "Wrong. Your mind is ash.",
    "Timeout or folly, the result is the same. Bleed.",
    "That output is a child's guess. Fall."
  ];

  var GAME_OVER_MOCKS = [
    "Your soul was consumed. The realm remains mine.",
    "The Knight Coder is silent. Delicious.",
    "Trial failed. Crawl back when you learn to read code."
  ];

  var cachedVoices = [];
  var voicesReady = false;

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function looksMale(voice) {
    var label = ((voice && voice.name) || "") + " " + ((voice && voice.voiceURI) || "");
    if (/female|zira|samantha|susan|hazel|karen|linda|heather|fiona|moira|tessa|victoria|zira/i.test(label)) {
      return false;
    }
    return /male|david|daniel|mark|george|fred|ravi|guy|alex|james|thomas|richard|google uk english male|microsoft david|microsoft mark|microsoft george/i.test(label);
  }

  function isEnglish(voice) {
    var lang = (voice && voice.lang) || "";
    return /^en([-_]|$)/i.test(lang) || /english/i.test((voice && voice.name) || "");
  }

  function selectDemonicVoice(voices) {
    var list = voices && voices.length ? voices : [];
    var english = list.filter(isEnglish);
    var pool = english.length ? english : list;
    var male = pool.filter(looksMale);
    if (male.length) {
      return male[0];
    }
    var notFemale = pool.filter(function (voice) {
      var label = (voice.name || "") + " " + (voice.voiceURI || "");
      return !/female|zira|samantha|susan|hazel|karen/i.test(label);
    });
    return notFemale[0] || pool[0] || null;
  }

  function refreshVoices() {
    if (!global.speechSynthesis) {
      return [];
    }
    cachedVoices = global.speechSynthesis.getVoices() || [];
    voicesReady = cachedVoices.length > 0;
    return cachedVoices;
  }

  function whenVoicesReady(callback) {
    refreshVoices();
    if (voicesReady) {
      callback();
      return;
    }
    if (!global.speechSynthesis) {
      return;
    }
    var fallback = setTimeout(function () {
      refreshVoices();
      callback();
    }, 700);
    global.speechSynthesis.addEventListener(
      "voiceschanged",
      function onVoices() {
        clearTimeout(fallback);
        global.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        refreshVoices();
        callback();
      },
      { once: true }
    );
  }

  function speakDevil(text) {
    var line = String(text || "").trim();
    if (!line) {
      return;
    }
    if (!global.speechSynthesis || typeof global.SpeechSynthesisUtterance === "undefined") {
      return;
    }

    whenVoicesReady(function () {
      global.speechSynthesis.cancel();

      var utterance = new global.SpeechSynthesisUtterance(line);
      var voice = selectDemonicVoice(cachedVoices);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || "en-US";
      } else {
        utterance.lang = "en-US";
      }
      utterance.pitch = randomInRange(PITCH_MIN, PITCH_MAX);
      utterance.rate = randomInRange(RATE_MIN, RATE_MAX);
      utterance.volume = 1;
      global.speechSynthesis.speak(utterance);
    });
  }

  function speakTrialStart() {
    speakDevil(pickLine(START_LINES));
  }

  function speakRageTaunt() {
    speakDevil(pickLine(RAGE_TAUNTS));
  }

  function speakMockTaunt() {
    speakDevil(pickLine(MOCK_TAUNTS));
  }

  function speakGameOver() {
    speakDevil(pickLine(GAME_OVER_MOCKS));
  }

  global.speakDevil = speakDevil;
  global.speakTrialStart = speakTrialStart;
  global.speakRageTaunt = speakRageTaunt;
  global.speakMockTaunt = speakMockTaunt;
  global.speakGameOver = speakGameOver;

  if (global.speechSynthesis) {
    refreshVoices();
    global.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  }
})(window);
