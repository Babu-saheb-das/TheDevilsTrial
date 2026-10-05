(function initTrialGame(global) {
  "use strict";

  var MAX_HP = 100;
  var DEVIL_HIT = 20;
  var HERO_HIT = 25;
  var TIMER_SECONDS = 30;
  var TOTAL_CHAMBERS = 5;
  var TIMER_RING_RADIUS = 52;
  var TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;
  var API_GAME = "/api/game";

  var LOCAL_CHAMBERS = [
    {
      chamber: 1,
      title: "Chamber I — Summoning Loop",
      description: "Predict the printed integer. A simple accumulating for-loop.",
      puzzle:
        "int n = 0;\nfor (int i = 1; i <= 4; i++) {\n    n += i;\n}\nSystem.out.println(n);",
      expected: "10"
    },
    {
      chamber: 2,
      title: "Chamber II — Rune Slice",
      description: "Predict the exact string printed after substring and char concatenation.",
      puzzle:
        'String s = "trial";\nSystem.out.println(s.substring(1, 4) + s.charAt(0));',
      expected: "riat"
    },
    {
      chamber: 3,
      title: "Chamber III — Trailing Curse",
      description: "Debug the empty-statement trap. What integer is printed?",
      puzzle: "int x = 0;\nfor (int i = 0; i < 5; i++);\n    x++;\nSystem.out.println(x);",
      expected: "1"
    },
    {
      chamber: 4,
      title: "Chamber IV — Nested Sigils",
      description: "Count how many times the inner body runs in this triangular nested loop.",
      puzzle:
        "int k = 0;\nfor (int i = 1; i <= 3; i++) {\n    for (int j = 1; j <= i; j++) {\n        k++;\n    }\n}\nSystem.out.println(k);",
      expected: "6"
    },
    {
      chamber: 5,
      title: "Chamber V — False Twin",
      description: "Debugging: string identity vs value. Predict the boolean printed by ==.",
      puzzle:
        'String a = "soul";\nString b = new String("soul");\nSystem.out.println(a == b);',
      expected: "false"
    }
  ];

  var heroHp = 100;
  var devilHp = 100;
  var currentChamber = 1;
  var timeLeft = TIMER_SECONDS;
  var expectedOutput = "";
  var timerId = null;
  var trialStartedAt = 0;
  var locked = false;
  var ended = false;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function clampHp(value) {
    return Math.max(0, Math.min(MAX_HP, value));
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function formatClock(totalSeconds) {
    var sec = Math.max(0, Math.floor(totalSeconds));
    var m = String(Math.floor(sec / 60)).padStart(2, "0");
    var s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }

  function elapsedSeconds() {
    if (!trialStartedAt) {
      return 0;
    }
    return Math.floor((Date.now() - trialStartedAt) / 1000);
  }

  function callVoice(name, fallbackText) {
    if (typeof global[name] === "function") {
      global[name]();
      return;
    }
    if (typeof global.speakDevil === "function" && fallbackText) {
      global.speakDevil(fallbackText);
    }
  }

  function pulseClass(node, className, durationMs) {
    if (!node) {
      return;
    }
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
    global.setTimeout(function () {
      node.classList.remove(className);
    }, durationMs);
  }

  function updateTimerRing() {
    if (!els.timerRing) {
      return;
    }
    var ratio = timeLeft / TIMER_SECONDS;
    els.timerRing.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
    els.timerRing.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - ratio));
  }

  function updateHUD(change) {
    change = change || {};

    heroHp = clampHp(heroHp);
    devilHp = clampHp(devilHp);

    var heroLabel = "Hero HP: " + heroHp + " / " + MAX_HP;
    var devilLabel = "Devil HP: " + devilHp + " / " + MAX_HP;

    if (els.heroHpText) {
      els.heroHpText.textContent = heroHp + " / " + MAX_HP;
    }
    if (els.devilHpText) {
      els.devilHpText.textContent = devilHp + " / " + MAX_HP;
    }
    if (els.heroHpBar) {
      els.heroHpBar.style.width = (heroHp / MAX_HP) * 100 + "%";
      els.heroHpBar.setAttribute("aria-valuenow", String(heroHp));
      els.heroHpBar.setAttribute("aria-label", heroLabel);
    }
    if (els.devilHpBar) {
      els.devilHpBar.style.width = (devilHp / MAX_HP) * 100 + "%";
      els.devilHpBar.setAttribute("aria-valuenow", String(devilHp));
      els.devilHpBar.setAttribute("aria-label", devilLabel);
    }
    if (els.chamberIndicator) {
      els.chamberIndicator.textContent = "Chamber " + currentChamber + " / " + TOTAL_CHAMBERS;
    }
    if (els.countdown) {
      els.countdown.textContent = String(timeLeft);
      els.countdown.setAttribute("datetime", "PT" + timeLeft + "S");
    }
    updateTimerRing();

    if (change.shakeHero) {
      pulseClass(document.body, "is-shaking", 450);
      pulseClass(els.stage, "is-shaking", 450);
      pulseClass(els.arenaHud, "is-shaking", 450);
      pulseClass(els.heroCard, "is-shaking", 450);
      pulseClass(els.heroHpBar, "is-shaking", 450);
      pulseClass(document.body, "is-flashing", 420);
    }
    if (change.shakeDevil) {
      pulseClass(els.devilCard, "is-shaking", 450);
      pulseClass(els.devilHpBar, "is-shaking", 450);
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      global.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timeLeft = TIMER_SECONDS;
    updateHUD();
    timerId = global.setInterval(function () {
      if (ended || locked) {
        return;
      }
      timeLeft -= 1;
      updateHUD();
      if (timeLeft <= 0) {
        timeLeft = 0;
        updateHUD();
        onTimeout();
      }
    }, 1000);
  }

  function playSlashAttack() {
    document.body.classList.add("is-slashing");
    if (els.slashFx) {
      els.slashFx.hidden = false;
      els.slashFx.classList.remove("is-active");
      void els.slashFx.offsetWidth;
      els.slashFx.classList.add("is-active");
    }
    global.setTimeout(function () {
      document.body.classList.remove("is-slashing");
      if (els.slashFx) {
        els.slashFx.classList.remove("is-active");
        els.slashFx.hidden = true;
      }
    }, 560);
  }

  function applyChamber(payload) {
    var chamber = payload || {};
    currentChamber = Number(chamber.chamber || chamber.level_id || currentChamber) || 1;
    expectedOutput = String(chamber.expected || chamber.expected_output || "");
    if (els.puzzlePrompt) {
      els.puzzlePrompt.textContent =
        chamber.description || "Predict the output of the forbidden snippet.";
    }
    if (els.puzzleCode) {
      els.puzzleCode.textContent = chamber.puzzle || chamber.puzzle_code || "";
    }
    if (els.answerInput) {
      els.answerInput.value = "";
      els.answerInput.focus();
    }
    updateHUD();
  }

  function localChamber(index) {
    var i = Math.max(1, Math.min(TOTAL_CHAMBERS, index)) - 1;
    return LOCAL_CHAMBERS[i];
  }

  function fetchNextLevel() {
    var url =
      API_GAME +
      "?action=nextLevel&chamber=" +
      encodeURIComponent(String(currentChamber)) +
      "&heroHp=" +
      encodeURIComponent(String(heroHp)) +
      "&devilHp=" +
      encodeURIComponent(String(devilHp));

    return fetch(url, { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("nextLevel " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        applyChamber(data);
      })
      .catch(function () {
        applyChamber(localChamber(currentChamber));
      });
  }

  function setInputLocked(isLocked) {
    locked = isLocked;
    if (els.answerInput) {
      els.answerInput.disabled = isLocked;
    }
    if (els.castBtn) {
      els.castBtn.disabled = isLocked;
    }
  }

  function showModal(kind) {
    if (!els.fateModal) {
      return;
    }
    els.fateModal.hidden = false;
    if (els.victoryPanel) {
      els.victoryPanel.hidden = kind !== "victory";
    }
    if (els.defeatPanel) {
      els.defeatPanel.hidden = kind !== "defeat";
    }
    if (typeof els.fateModal.showModal === "function" && !els.fateModal.open) {
      els.fateModal.showModal();
    }
  }

  function hideModal() {
    if (!els.fateModal) {
      return;
    }
    if (typeof els.fateModal.close === "function" && els.fateModal.open) {
      els.fateModal.close();
    }
    els.fateModal.hidden = true;
    if (els.victoryPanel) {
      els.victoryPanel.hidden = true;
    }
    if (els.defeatPanel) {
      els.defeatPanel.hidden = true;
    }
  }

  function rankForClear() {
    var elapsed = elapsedSeconds();
    if (heroHp >= 75 && elapsed <= 90) {
      return "S — Hellbreaker";
    }
    if (heroHp >= 50) {
      return "A — Spellblade";
    }
    if (heroHp >= 25) {
      return "B — Survivor";
    }
    return "C — Scarred";
  }

  function showVictory() {
    ended = true;
    stopTimer();
    setInputLocked(true);
    if (els.statClearTime) {
      els.statClearTime.textContent = formatClock(elapsedSeconds());
    }
    if (els.statChambers) {
      els.statChambers.textContent = TOTAL_CHAMBERS + " / " + TOTAL_CHAMBERS;
    }
    if (els.statHeroHp) {
      els.statHeroHp.textContent = String(heroHp);
    }
    if (els.statRank) {
      els.statRank.textContent = rankForClear();
    }
    showModal("victory");
  }

  function showDefeat() {
    ended = true;
    stopTimer();
    setInputLocked(true);
    var flavor = els.defeatPanel && els.defeatPanel.querySelector(".fate-flavor");
    if (flavor) {
      flavor.textContent = "Your soul was consumed. The Demon Lord still holds the realm.";
    }
    if (els.statSurviveTime) {
      els.statSurviveTime.textContent = formatClock(elapsedSeconds());
    }
    if (els.statChamberReached) {
      els.statChamberReached.textContent = currentChamber + " / " + TOTAL_CHAMBERS;
    }
    if (els.statDevilHp) {
      els.statDevilHp.textContent = String(devilHp);
    }
    callVoice("speakGameOver", "Your soul was consumed.");
    showModal("defeat");
  }

  function resolveOutcome() {
    if (devilHp <= 0) {
      showVictory();
      return true;
    }
    if (heroHp <= 0) {
      showDefeat();
      return true;
    }
    return false;
  }

  function onCorrect() {
    devilHp -= DEVIL_HIT;
    updateHUD({ shakeDevil: true });
    playSlashAttack();
    callVoice("speakRageTaunt", "You strike true.");
    if (resolveOutcome()) {
      return;
    }
    currentChamber = Math.min(TOTAL_CHAMBERS, currentChamber + 1);
    fetchNextLevel().then(function () {
      if (!ended) {
        setInputLocked(false);
        startTimer();
      }
    });
  }

  function onIncorrect() {
    heroHp -= HERO_HIT;
    updateHUD({ shakeHero: true });
    callVoice("speakMockTaunt", "Pathetic.");
    if (resolveOutcome()) {
      return;
    }
    setInputLocked(false);
    startTimer();
  }

  function onTimeout() {
    if (ended) {
      return;
    }
    stopTimer();
    setInputLocked(true);
    onIncorrect();
  }

  function checkAnswer(rawInput) {
    if (ended || locked) {
      return;
    }
    var guess = normalizeAnswer(rawInput);
    if (!guess) {
      return;
    }
    stopTimer();
    setInputLocked(true);
    if (guess === normalizeAnswer(expectedOutput)) {
      onCorrect();
    } else {
      onIncorrect();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    checkAnswer(els.answerInput ? els.answerInput.value : "");
  }

  function initGame() {
    hideModal();
    ended = false;
    setInputLocked(false);
    heroHp = 100;
    devilHp = 100;
    currentChamber = 1;
    timeLeft = TIMER_SECONDS;
    trialStartedAt = Date.now();
    updateHUD();
    fetchNextLevel().then(function () {
      startTimer();
      callVoice("speakTrialStart", "The trial begins.");
    });
  }

  function cacheElements() {
    els.stage = $("app");
    els.arenaHud = document.querySelector(".arena-hud");
    els.heroCard = $("hero-card");
    els.devilCard = $("devil-card");
    els.heroHpBar = $("hero-hp-bar");
    els.devilHpBar = $("devil-hp-bar");
    els.heroHpText = $("hero-hp-text");
    els.devilHpText = $("devil-hp-text");
    els.chamberIndicator = $("chamber-indicator");
    els.countdown = $("countdown-timer");
    els.timerRing = $("timer-ring-progress");
    els.puzzleCode = $("puzzle-code");
    els.puzzlePrompt = $("puzzle-prompt");
    els.answerInput = $("answer-input");
    els.castBtn = $("cast-spell-btn");
    els.spellForm = $("spell-form");
    els.slashFx = $("slash-fx");
    els.fateModal = $("fate-modal");
    els.victoryPanel = $("victory-panel");
    els.defeatPanel = $("defeat-panel");
    els.statClearTime = $("stat-clear-time");
    els.statChambers = $("stat-chambers");
    els.statHeroHp = $("stat-hero-hp");
    els.statRank = $("stat-rank");
    els.statSurviveTime = $("stat-survive-time");
    els.statChamberReached = $("stat-chamber-reached");
    els.statDevilHp = $("stat-devil-hp");
    els.victoryRetry = $("victory-retry-btn");
    els.defeatRetry = $("defeat-retry-btn");
  }

  function bindEvents() {
    if (els.spellForm) {
      els.spellForm.addEventListener("submit", handleSubmit);
    }
    if (els.victoryRetry) {
      els.victoryRetry.addEventListener("click", initGame);
    }
    if (els.defeatRetry) {
      els.defeatRetry.addEventListener("click", initGame);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEvents();
    initGame();
  });

  global.updateHUD = updateHUD;
  global.checkAnswer = checkAnswer;
  global.initGame = initGame;
})(window);
