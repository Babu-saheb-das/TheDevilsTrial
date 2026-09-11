# 😈 The Devil's Trial

> A dark-fantasy, gamified coding survival web application where players answer programming logic puzzles and output challenges to defeat the Demon Lord.

---

## 📜 Table of Contents
- [😈 The Devil's Trial](#-the-devils-trial)
  - [📜 Table of Contents](#-table-of-contents)
  - [⚔️ About The Project](#️-about-the-project)
    - [Key Highlights:](#key-highlights)
  - [🎮 Game Mechanics \& Rules](#-game-mechanics--rules)
  - [🛠️ Tech Stack](#️-tech-stack)
    - [Front-End](#front-end)
    - [Back-End](#back-end)
    - [Database \& Authentication](#database--authentication)
    - [Build \& Server Tools](#build--server-tools)
  - [📁 Project Architecture](#-project-architecture)

---

## ⚔️ About The Project

**The Devil's Trial** is a full-stack interactive web application designed to test a coder's fundamental programming logic, debugging capabilities, and problem-solving speed under atmospheric pressure. 

Players enter a mysterious digital realm trapped by a Demon Lord. To escape, they must clear 5 sequential trial chambers by answering programming questions and output predictions correctly.

### Key Highlights:
* **Dark Fantasy Aesthetic:** Atmospheric red-and-black glowing UI with retro battle visuals.
* **Real-time Battle Feedback:** Dynamic HP deduction mechanics for both the Hero and the Devil.
* **Audio Immersion:** Integrated browser Text-to-Speech (Web Speech API) for deep Devil voiceover lines.
* **Google Authentication:** Seamless Google OAuth 2.0 single sign-on integration.

---

## 🎮 Game Mechanics & Rules

* **Health Point (HP) System:**
  * **Hero HP:** Starts at `100`
  * **Devil HP:** Starts at `100`
* **Battle Logic:**
  * **Correct Answer:** Hero executes an attack, dealing `-20 HP` damage to the Devil.
  * **Incorrect Answer / Time-Out:** Devil counters with dark magic, dealing `-25 HP` damage to the Hero.
* **Winning Condition:** Reduce Devil's HP to `0` to clear the realm and record your completion time.
* **Losing Condition:** If Hero's HP reaches `0`, the trial fails, requiring a level retry.

---

## 🛠️ Tech Stack

### Front-End
* **HTML5 & CSS3:** Semantic layout, glassmorphic HUD overlay, CSS keyframe animations, and dark gradients.
* **JavaScript (ES6+):** DOM Manipulation, Fetch API (AJAX), and Web Speech API.

### Back-End
* **Java Core:** Business logic execution and data processing.
* **Java Servlets:** HTTP Request/Response handling and JSON API endpoints.
* **JDBC (Java Database Connectivity):** Database integration layer.

### Database & Authentication
* **MySQL Database:** User profile management and game level data storage.
* **Google OAuth 2.0:** Secure client-side and server-side user authentication.

### Build & Server Tools
* **Apache Tomcat Server:** Web application host server.
* **Visual Studio Code / Apache NetBeans:** IDE Development environments.

---

## 📁 Project Architecture

```text
TheDevilsTrial/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── audio.js
│   │   └── auth.js
│   └── assets/
│       ├── images/
│       └── audio/
├── backend/
│   ├── src/
│   │   └── com/devilstrial/
│   │       ├── auth/
│   │       ├── db/
│   │       │   └── DBConnection.java
│   │       └── game/
│   └── WebContent/
│       └── WEB-INF/
│           ├── web.xml
│           └── lib/
│               ├── mysql-connector-j.jar
│               └── gson.jar
├── database/
│   └── schema.sql
├── .gitignore
└── README.md