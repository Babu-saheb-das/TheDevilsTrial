CREATE DATABASE devilstrial_db;
USE devilstrial_db;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE game_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    current_level INT DEFAULT 1,
    user_hp INT DEFAULT 100,
    devil_hp INT DEFAULT 100,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);


CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    level INT NOT NULL,
    code_snippet TEXT,
    question_text TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL
);


INSERT INTO questions (level, code_snippet, question_text, correct_answer) 
VALUES (1, 'System.out.println(10 + 20);', 'Is code ka exact output kya hoga?', '30');
