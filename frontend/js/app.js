(function initTrialGame(global) {
  "use strict";

  var MAX_HP = 100;
  var DEVIL_HIT = 20;
  var HERO_HIT = 25;
  var TIMER_SECONDS = 30;
  var TOTAL_CHAMBERS = 5;
  var TIMER_RING_RADIUS = 52;
  var TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

  var LOCAL_CHAMBERS = [
    {
      chamber: 1,
      title: "Chamber I — Summoning Loop",
      description: "Predict the printed integer. Type only the output.",
      puzzle_code:
        "int n = 0;\nfor (int i = 1; i <= 4; i++) {\n    n += i;\n}\nSystem.out.println(n);",
      expected: "10"
    },
    {
      chamber: 2,
      title: "Chamber II — Rune Slice",
      description: "Predict the exact string printed after substring and char concatenation.",
      puzzle_code: 'String s = "trial";\nSystem.out.println(s.substring(1, 4) + s.charAt(0));',
      expected: "riat"
    },
    {
      chamber: 3,
      title: "Chamber III — Trailing Curse",
      description: "Debug the empty-statement trap. What integer is printed?",
      puzzle_code: "int x = 0;\nfor (int i = 0; i < 5; i++);\n    x++;\nSystem.out.println(x);",
      expected: "1"
    },
    {
      chamber: 4,
      title: "Chamber IV — Nested Sigils",
      description: "Count how many times the inner body runs in this triangular nested loop.",
      puzzle_code:
        "int k = 0;\nfor (int i = 1; i <= 3; i++) {\n    for (int j = 1; j <= i; j++) {\n        k++;\n    }\n}\nSystem.out.println(k);",
      expected: "6"
    },
    {
      chamber: 5,
      title: "Chamber V — False Twin",
      description: "String identity vs value. Predict the boolean printed by ==.",
      puzzle_code: 'String a = "soul";\nString b = new String("soul");\nSystem.out.println(a == b);',
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
  var signedIn = false;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function apiUrl(path) {
    if (global.TrialAuth && typeof global.TrialAuth.apiUrl === "function") {
      return global.TrialAuth.apiUrl(path);
    }
    return "http://localhost:8080/TheDevilsTrial" + path;
  }

  function isSignedIn() {
    return !!(global.TrialAuth && global.TrialAuth.userId);
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
      pulseClass(document.body, "is-flashing", 420);
      pulseClass(els.devilPortrait, "is-attacking", 500);
      if (typeof global.playHurtSfx === "function") {
        global.playHurtSfx();
      }
    }
    if (change.shakeDevil) {
      pulseClass(els.devilCard, "is-shaking", 450);
      pulseClass(els.heroPortrait, "is-attacking", 500);
      if (typeof global.playHitSfx === "function") {
        global.playHitSfx();
      }
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
    if (typeof global.playSlashSfx === "function") {
      global.playSlashSfx();
    }
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
    expectedOutput = String(chamber.expected || chamber.expected_output || chamber.correct_answer || "");
    if (els.puzzlePrompt) {
      els.puzzlePrompt.textContent = chamber.description || "Type the exact output of the forbidden snippet.";
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

  function applySession(session) {
    if (!session) {
      return;
    }
    if (typeof session.hero_hp === "number") {
      heroHp = session.hero_hp;
    }
    if (typeof session.devil_hp === "number") {
      devilHp = session.devil_hp;
    }
    if (typeof session.current_level === "number") {
      currentChamber = session.current_level;
    }
  }

  function fetchQuestion(level) {
    return fetch(apiUrl("/game/question?level=" + encodeURIComponent(String(level))), {
      credentials: "include",
      headers: { Accept: "application/json" }
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("question " + response.status);
      }
      return response.json();
    });
  }

  function loadChamber() {
    return fetchQuestion(currentChamber)
      .then(function (data) {
        if (data.session) {
          applySession(data.session);
        }
        applyChamber(data);
        expectedOutput = "";
      })
      .catch(function () {
        applyChamber(localChamber(currentChamber));
      });
  }

  function persistProgress(extra) {
    if (!isSignedIn()) {
      return;
    }
    extra = extra || {};
    fetch(apiUrl("/game/progress"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        heroHp: heroHp,
        devilHp: devilHp,
        currentLevel: currentChamber,
        totalTimeTaken: elapsedSeconds(),
        status: extra.status || "PLAYING",
        victory: !!extra.victory,
        newTrial: !!extra.newTrial
      })
    }).catch(function () {
      return null;
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

  function hideLeaderboard() {
    if (!els.leaderboardModal) {
      return;
    }
    if (typeof els.leaderboardModal.close === "function" && els.leaderboardModal.open) {
      els.leaderboardModal.close();
    }
    els.leaderboardModal.hidden = true;
  }

  function renderLeaders(entries) {
    if (!els.leaderboardList) {
      return;
    }
    els.leaderboardList.innerHTML = "";
    if (!entries || !entries.length) {
      els.leaderboardList.innerHTML = "<li class=\"leader-empty\">No souls recorded yet.</li>";
      return;
    }
    entries.forEach(function (entry) {
      var item = document.createElement("li");
      item.className = "leader-row";
      item.innerHTML =
        "<span class=\"leader-rank\">#" +
        entry.rank +
        "</span><span class=\"leader-name\"></span><span class=\"leader-score\"></span>";
      item.querySelector(".leader-name").textContent = entry.name;
      item.querySelector(".leader-score").textContent = String(entry.score);
      els.leaderboardList.appendChild(item);
    });
  }

  function openLeaderboard() {
    if (!els.leaderboardModal) {
      return;
    }
    els.leaderboardModal.hidden = false;
    if (typeof els.leaderboardModal.showModal === "function" && !els.leaderboardModal.open) {
      els.leaderboardModal.showModal();
    }
    fetch(apiUrl("/game/leaderboard"), {
      credentials: "include",
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("leaderboard");
        }
        return response.json();
      })
      .then(function (data) {
        renderLeaders(data.leaders || []);
      })
      .catch(function () {
        renderLeaders([]);
      });
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
      els.statRank.textContent = rankForClear() + " · " + heroHp * 10 + " souls";
    }
    persistProgress({ status: "WON", victory: true });
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
    persistProgress({ status: "FAILED" });
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

  function onCorrect(nextLevel) {
    devilHp -= DEVIL_HIT;
    updateHUD({ shakeDevil: true });
    playSlashAttack();
    callVoice("speakRageTaunt", "You strike true.");
    if (resolveOutcome()) {
      return;
    }
    if (nextLevel && nextLevel.level_id) {
      applyChamber(nextLevel);
      expectedOutput = "";
    } else {
      currentChamber = Math.min(TOTAL_CHAMBERS, currentChamber + 1);
      loadChamber();
    }
    persistProgress();
    if (!ended) {
      setInputLocked(false);
      startTimer();
    }
  }

  function onIncorrect() {
    heroHp -= HERO_HIT;
    updateHUD({ shakeHero: true });
    callVoice("speakMockTaunt", "Pathetic.");
    persistProgress();
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
    if (isSignedIn()) {
      checkAnswer("\u0000timeout").catch(function () {
        setInputLocked(true);
        onIncorrect();
      });
      return;
    }
    setInputLocked(true);
    onIncorrect();
  }

  function validateRemote(rawInput) {
    return fetch(apiUrl("/game/validate"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        answer: rawInput,
        totalTimeTaken: elapsedSeconds()
      })
    }).then(function (response) {
      if (response.status === 401) {
        throw new Error("unauthorized");
      }
      if (!response.ok) {
        throw new Error("validate " + response.status);
      }
      return response.json();
    });
  }

  function checkAnswer(rawInput) {
    if (ended || locked) {
      return Promise.resolve();
    }
    var guess = normalizeAnswer(rawInput);
    if (!guess && !isSignedIn()) {
      return Promise.resolve();
    }
    stopTimer();
    setInputLocked(true);

    if (isSignedIn()) {
      signedIn = true;
      return validateRemote(rawInput).then(function (data) {
        heroHp = typeof data.hero_hp === "number" ? data.hero_hp : heroHp;
        devilHp = typeof data.devil_hp === "number" ? data.devil_hp : devilHp;
        currentChamber = data.current_level || currentChamber;
        updateHUD();
        if (data.correct) {
          updateHUD({ shakeDevil: true });
          playSlashAttack();
          callVoice("speakRageTaunt", "You strike true.");
        } else {
          updateHUD({ shakeHero: true });
          callVoice("speakMockTaunt", "Pathetic.");
        }
        if (data.status === "WON" || devilHp <= 0) {
          showVictory();
          return;
        }
        if (data.status === "FAILED" || heroHp <= 0) {
          showDefeat();
          return;
        }
        if (data.correct && data.next_level) {
          applyChamber(data.next_level);
          expectedOutput = "";
        }
        setInputLocked(false);
        startTimer();
      });
    }

    if (guess === normalizeAnswer(expectedOutput)) {
      onCorrect();
    } else {
      onIncorrect();
    }
    return Promise.resolve();
  }

  function handleSubmit(event) {
    event.preventDefault();
    checkAnswer(els.answerInput ? els.answerInput.value : "");
  }

  function initGame() {
    hideModal();
    hideLeaderboard();
    ended = false;
    setInputLocked(false);
    heroHp = 100;
    devilHp = 100;
    currentChamber = 1;
    timeLeft = TIMER_SECONDS;
    trialStartedAt = Date.now();
    signedIn = isSignedIn();
    updateHUD();
    if (signedIn) {
      persistProgress({ newTrial: true, status: "PLAYING" });
    }
    loadChamber().then(function () {
      startTimer();
      callVoice("speakTrialStart", "The trial begins.");
    });
  }

  function cacheElements() {
    els.stage = $("app");
    els.arenaHud = document.querySelector(".arena-hud");
    els.heroCard = $("hero-card");
    els.devilCard = $("devil-card");
    els.heroPortrait = document.querySelector(".hero-portrait");
    els.devilPortrait = document.querySelector(".devil-portrait");
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
    els.leaderboardBtn = $("leaderboard-btn");
    els.leaderboardModal = $("leaderboard-modal");
    els.leaderboardList = $("leaderboard-list");
    els.leaderboardClose = $("leaderboard-close-btn");
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
    if (els.leaderboardBtn) {
      els.leaderboardBtn.addEventListener("click", openLeaderboard);
    }
    if (els.leaderboardClose) {
      els.leaderboardClose.addEventListener("click", hideLeaderboard);
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
