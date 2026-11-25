(function initTrialAuth(global) {
  "use strict";

  var CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

  function apiRoot() {
    if (global.TRIAL_API_BASE) {
      return String(global.TRIAL_API_BASE).replace(/\/$/, "");
    }
    if (global.location.protocol === "file:") {
      return "http://localhost:8080/TheDevilsTrial";
    }
    if (global.location.port === "8080") {
      return global.location.origin + "/TheDevilsTrial";
    }
    return "http://localhost:8080/TheDevilsTrial";
  }

  function apiUrl(path) {
    return apiRoot() + path;
  }

  var auth = {
    userId: null,
    name: "",
    email: "",
    picture: "",
    apiUrl: apiUrl,
    apiRoot: apiRoot,
    isSignedIn: function () {
      return auth.userId !== null;
    }
  };

  function showProfile() {
    var hud = document.getElementById("user-profile-hud");
    var name = document.getElementById("user-name");
    var avatar = document.getElementById("user-avatar");
    var widget = document.getElementById("g_id_signin");
    if (name) {
      name.textContent = auth.name || "Summoner";
    }
    if (avatar && auth.picture) {
      avatar.src = auth.picture;
    }
    if (hud) {
      hud.hidden = false;
    }
    if (widget) {
      widget.hidden = true;
    }
  }

  function handleGoogleCredential(response) {
    var credential = response && response.credential;
    if (!credential) {
      return;
    }
    fetch(apiUrl("/auth/google"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ idToken: credential })
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("auth " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        auth.userId = data.user_id;
        auth.name = data.name || "";
        auth.email = data.email || "";
        auth.picture = data.picture || "";
        showProfile();
        if (typeof global.initGame === "function") {
          global.initGame();
        }
      })
      .catch(function () {
        window.alert("Google sign-in could not reach the Tomcat API. Confirm Tomcat is running at " + apiRoot());
      });
  }

  function configureGsi() {
    var onload = document.getElementById("g_id_onload");
    if (onload && CLIENT_ID && CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
      onload.setAttribute("data-client_id", CLIENT_ID);
    }
  }

  global.handleGoogleCredential = handleGoogleCredential;
  global.TrialAuth = auth;

  document.addEventListener("DOMContentLoaded", configureGsi);
})(window);
