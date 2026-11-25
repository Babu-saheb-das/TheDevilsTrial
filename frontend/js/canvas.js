(function initEmberCanvas(global) {
  "use strict";

  var canvas;
  var ctx;
  var embers = [];
  var running = false;
  var reduced = false;

  function resize() {
    if (!canvas) {
      return;
    }
    canvas.width = global.innerWidth;
    canvas.height = global.innerHeight;
  }

  function spawn(count) {
    var i;
    for (i = 0; i < count; i += 1) {
      embers.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.35 - Math.random() * 1.35,
        r: 0.7 + Math.random() * 2.4,
        life: 0.35 + Math.random() * 0.65,
        drift: Math.random() * Math.PI * 2
      });
    }
  }

  function tick() {
    if (!running || !ctx) {
      return;
    }
    var width = canvas.width;
    var height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (embers.length < 70) {
      spawn(2);
    }

    var i;
    for (i = embers.length - 1; i >= 0; i -= 1) {
      var ember = embers[i];
      ember.drift += 0.02;
      ember.x += ember.vx + Math.sin(ember.drift) * 0.25;
      ember.y += ember.vy;
      ember.life -= 0.0022;
      if (ember.y < -12 || ember.life <= 0) {
        embers.splice(i, 1);
        continue;
      }
      var alpha = Math.max(0, ember.life);
      var gradient = ctx.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, ember.r * 4);
      gradient.addColorStop(0, "rgba(255, 210, 160, " + (alpha * 0.95) + ")");
      gradient.addColorStop(0.35, "rgba(255, 40, 40, " + (alpha * 0.7) + ")");
      gradient.addColorStop(1, "rgba(80, 0, 0, 0)");
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(ember.x, ember.y, ember.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    global.requestAnimationFrame(tick);
  }

  function start() {
    canvas = document.getElementById("ember-canvas");
    if (!canvas || !canvas.getContext) {
      return;
    }
    reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ctx = canvas.getContext("2d");
    resize();
    global.addEventListener("resize", resize);
    if (reduced) {
      return;
    }
    spawn(40);
    running = true;
    global.requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window);
