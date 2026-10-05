-- The Devil's Trial — MySQL schema
-- Database name matches DBConnection.DB_NAME

CREATE DATABASE IF NOT EXISTS devils_trial
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE devils_trial;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS levels;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(191) NOT NULL,
    google_id     VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_google_id (google_id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE levels (
    level_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title             VARCHAR(120) NOT NULL,
    description       VARCHAR(500) NOT NULL,
    puzzle_code       TEXT NOT NULL,
    expected_output   VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_sessions (
    session_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id            INT UNSIGNED NOT NULL,
    current_level      INT UNSIGNED NOT NULL DEFAULT 1,
    hero_hp            INT NOT NULL DEFAULT 100,
    devil_hp           INT NOT NULL DEFAULT 100,
    total_time_taken   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Elapsed seconds for this trial',
    status             ENUM('PLAYING', 'WON', 'FAILED') NOT NULL DEFAULT 'PLAYING',
    started_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at           TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_sessions_level
        FOREIGN KEY (current_level) REFERENCES levels (level_id)
        ON UPDATE CASCADE,
    CONSTRAINT chk_hero_hp CHECK (hero_hp >= 0 AND hero_hp <= 100),
    CONSTRAINT chk_devil_hp CHECK (devil_hp >= 0 AND devil_hp <= 100),
    INDEX idx_sessions_user_status (user_id, status),
    INDEX idx_sessions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO levels (level_id, title, description, puzzle_code, expected_output) VALUES
(
    1,
    'Chamber I — Summoning Loop',
    'Predict the printed integer. A simple accumulating for-loop.',
    'int n = 0;\nfor (int i = 1; i <= 4; i++) {\n    n += i;\n}\nSystem.out.println(n);',
    '10'
),
(
    2,
    'Chamber II — Rune Slice',
    'Predict the exact string printed after substring and char concatenation.',
    'String s = "trial";\nSystem.out.println(s.substring(1, 4) + s.charAt(0));',
    'riat'
),
(
    3,
    'Chamber III — Trailing Curse',
    'Debug the empty-statement trap. What integer is printed?',
    'int x = 0;\nfor (int i = 0; i < 5; i++);\n    x++;\nSystem.out.println(x);',
    '1'
),
(
    4,
    'Chamber IV — Nested Sigils',
    'Count how many times the inner body runs in this triangular nested loop.',
    'int k = 0;\nfor (int i = 1; i <= 3; i++) {\n    for (int j = 1; j <= i; j++) {\n        k++;\n    }\n}\nSystem.out.println(k);',
    '6'
),
(
    5,
    'Chamber V — False Twin',
    'Debugging: string identity vs value. Predict the boolean printed by ==.',
    'String a = "soul";\nString b = new String("soul");\nSystem.out.println(a == b);',
    'false'
);
