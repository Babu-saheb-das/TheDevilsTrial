let currentLevel = 1;
let currentQuestionId = null;
let heroHP = 100;
let devilHP = 100;
let currentUserId = 1; // Google Auth response se assign hone wala User ID

// Safe DOM Access Helper (Node execution safety ke liye)
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Question Load Function
function loadQuestion(level) {
    if (!isBrowser) return;

    fetch('/TheDevilsTrial/api/get-question?level=' + level)
        .then(response => response.json())
        .then(data => {
            if (!data.questionId) {
                document.getElementById("question-box").innerText = "No more questions available in the realm!";
                return;
            }

            currentQuestionId = data.questionId;
            
            let questionHtml = `<p><strong>LEVEL ${data.level}:</strong> ${data.questionText}</p>`;
            if (data.codeSnippet) {
                questionHtml += `<pre style="background:#000; padding:10px; border:1px solid #444; color:#00ff00; text-align:left;">${data.codeSnippet}</pre>`;
            }
            
            document.getElementById("question-box").innerHTML = questionHtml;
        })
        .catch(error => {
            console.error("Error loading question:", error);
            document.getElementById("question-box").innerText = "Failed to load Devil's Trial question!";
        });
}

// Answer Submit & Battle Handler
function submitAnswer() {
    if (!isBrowser) return;

    const inputField = document.getElementById("answer-input");
    const attackBtn = document.getElementById("attack-btn");
    const userAnswer = inputField.value.trim();

    // Edge Case: Empty Input Check
    if (!userAnswer || heroHP === 0 || devilHP === 0) {
        if (typeof alert !== 'undefined') alert("Enter an answer before attacking!");
        return;
    }

    // Prevent Spam Clicks
    if (attackBtn) attackBtn.disabled = true;

    const formData = new URLSearchParams();
    formData.append("questionId", currentQuestionId);
    formData.append("answer", userAnswer);

    fetch('/TheDevilsTrial/api/validate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        inputField.value = ""; // Input Clear
        if (attackBtn) attackBtn.disabled = false; // Re-enable button

        if (data.isCorrect) {
            if (typeof playSFX === 'function') playSFX('attack');
            devilHP = Math.max(0, devilHP - data.damageDealt);
            document.getElementById("devil-hp").style.width = devilHP + "%";
            if (typeof speakDevil === 'function') speakDevil("Impudent mortal! That hit actually hurt!");
            
            saveGameState("IN_PROGRESS");

            // Check Victory Condition
            if (devilHP === 0) {
                saveGameState("VICTORIOUS");
                setTimeout(() => {
                    alert("VICTORY! You defeated the Devil!");
                    disableGameInput();
                }, 300);
                return;
            }
            
            currentLevel++;
            loadQuestion(currentLevel);

        } else {
            if (typeof playSFX === 'function') playSFX('damage');
            heroHP = Math.max(0, heroHP - data.damageDealt);
            document.getElementById("hero-hp").style.width = heroHP + "%";
            
            // Screen Shake Effect
            const gameContainer = document.querySelector(".game-container");
            if (gameContainer) {
                gameContainer.classList.add("shake");
                setTimeout(() => gameContainer.classList.remove("shake"), 500);
            }

            if (typeof speakDevil === 'function') speakDevil("Foolish human! Your mistake feeds my power!");

            // Check Defeat Condition
            if (heroHP === 0) {
                saveGameState("FAILED");
                setTimeout(() => {
                    alert("DEFEAT! Your soul belongs to the Devil now!");
                    disableGameInput();
                }, 300);
                return;
            }

            saveGameState("IN_PROGRESS");
        }
    })
    .catch(err => {
        console.error("Error validating answer:", err);
        if (attackBtn) attackBtn.disabled = false;
    });
}

// Save Game Progress to Backend Database
function saveGameState(status = "IN_PROGRESS") {
    if (!isBrowser) return;

    const formData = new URLSearchParams();
    formData.append("userId", currentUserId);
    formData.append("level", currentLevel);
    formData.append("heroHp", heroHP);
    formData.append("devilHp", devilHP);
    formData.append("status", status);

    fetch('/TheDevilsTrial/api/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    }).catch(err => console.error("Error saving game state:", err));
}

// Single Event Listener Setup for Browser DOM Load
if (isBrowser) {
    document.addEventListener("DOMContentLoaded", () => {
        const inputField = document.getElementById("answer-input");
        if (inputField) {
            inputField.addEventListener("keypress", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    submitAnswer();
                }
            });
        }
    });
}

// Disable Input Controls
function disableGameInput() {
    if (!isBrowser) return;
    document.getElementById("answer-input").disabled = true;
    document.getElementById("attack-btn").disabled = true;
}

// Toggle Leaderboard Modal Overlay
function toggleLeaderboard() {
    if (!isBrowser) return;

    const modal = document.getElementById("leaderboard-modal");
    if (modal.style.display === "none" || modal.style.display === "") {
        fetch('/TheDevilsTrial/api/get-leaderboard')
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById("leaderboard-list");
                list.innerHTML = "";
                data.forEach(player => {
                    list.innerHTML += `<li>${player.name} - <strong>${player.score} pts</strong></li>`;
                });
                modal.style.display = "flex";
            });
    } else {
        modal.style.display = "none";
    }
}