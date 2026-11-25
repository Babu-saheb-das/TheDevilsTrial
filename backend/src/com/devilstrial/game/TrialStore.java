package com.devilstrial.game;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;

import com.devilstrial.db.DBConnection;
import com.google.gson.JsonObject;

public final class TrialStore {

    public static final int MAX_HP = 100;
    public static final int DEVIL_HIT = 20;
    public static final int HERO_HIT = 25;
    public static final int MAX_LEVEL = 5;

    private TrialStore() {
    }

    public static int clampHp(int value) {
        if (value < 0) {
            return 0;
        }
        if (value > MAX_HP) {
            return MAX_HP;
        }
        return value;
    }

    public static JsonObject loadLevelPublic(int levelId) throws SQLException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "SELECT level_id, title, description, puzzle_code FROM levels WHERE level_id = ?");
            statement.setInt(1, levelId);
            ResultSet rows = statement.executeQuery();
            JsonObject level = null;
            if (rows.next()) {
                level = new JsonObject();
                level.addProperty("level_id", rows.getInt("level_id"));
                level.addProperty("chamber", rows.getInt("level_id"));
                level.addProperty("title", rows.getString("title"));
                level.addProperty("description", rows.getString("description"));
                level.addProperty("puzzle_code", rows.getString("puzzle_code"));
            }
            rows.close();
            statement.close();
            return level;
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    public static String loadCorrectAnswer(int levelId) throws SQLException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "SELECT correct_answer FROM levels WHERE level_id = ?");
            statement.setInt(1, levelId);
            ResultSet rows = statement.executeQuery();
            String answer = null;
            if (rows.next()) {
                answer = rows.getString("correct_answer");
            }
            rows.close();
            statement.close();
            return answer;
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    public static SessionState requirePlaying(int userId) throws SQLException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "SELECT session_id, current_level, hero_hp, devil_hp, total_time_taken, status "
                            + "FROM game_sessions WHERE user_id = ? AND status = 'PLAYING' "
                            + "ORDER BY session_id DESC LIMIT 1");
            statement.setInt(1, userId);
            ResultSet rows = statement.executeQuery();
            SessionState state = null;
            if (rows.next()) {
                state = fromRow(rows);
            }
            rows.close();
            statement.close();
            if (state != null) {
                return state;
            }
            PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO game_sessions (user_id, current_level, hero_hp, devil_hp, status) "
                            + "VALUES (?, 1, 100, 100, 'PLAYING')",
                    PreparedStatement.RETURN_GENERATED_KEYS);
            insert.setInt(1, userId);
            insert.executeUpdate();
            ResultSet keys = insert.getGeneratedKeys();
            int sessionId = 0;
            if (keys.next()) {
                sessionId = keys.getInt(1);
            }
            keys.close();
            insert.close();
            return new SessionState(sessionId, 1, MAX_HP, MAX_HP, 0, "PLAYING");
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    public static void save(SessionState state) throws SQLException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "UPDATE game_sessions SET current_level = ?, hero_hp = ?, devil_hp = ?, "
                            + "total_time_taken = ?, status = ?, ended_at = ? WHERE session_id = ?");
            statement.setInt(1, state.currentLevel);
            statement.setInt(2, clampHp(state.heroHp));
            statement.setInt(3, clampHp(state.devilHp));
            statement.setInt(4, Math.max(0, state.totalTimeTaken));
            statement.setString(5, state.status);
            if ("PLAYING".equals(state.status)) {
                statement.setTimestamp(6, null);
            } else {
                statement.setTimestamp(6, new Timestamp(System.currentTimeMillis()));
            }
            statement.setInt(7, state.sessionId);
            statement.executeUpdate();
            statement.close();
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    public static void recordVictoryScore(int userId, int heroHp) throws SQLException {
        int score = clampHp(heroHp) * 10;
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO leaderboard (user_id, score, hero_hp) VALUES (?, ?, ?)");
            statement.setInt(1, userId);
            statement.setInt(2, score);
            statement.setInt(3, clampHp(heroHp));
            statement.executeUpdate();
            statement.close();
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    public static SessionState loadLatest(int userId) throws SQLException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "SELECT session_id, current_level, hero_hp, devil_hp, total_time_taken, status "
                            + "FROM game_sessions WHERE user_id = ? ORDER BY session_id DESC LIMIT 1");
            statement.setInt(1, userId);
            ResultSet rows = statement.executeQuery();
            SessionState state = null;
            if (rows.next()) {
                state = fromRow(rows);
            }
            rows.close();
            statement.close();
            return state;
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    public static JsonObject toJson(SessionState state) {
        JsonObject object = new JsonObject();
        object.addProperty("session_id", state.sessionId);
        object.addProperty("current_level", state.currentLevel);
        object.addProperty("hero_hp", state.heroHp);
        object.addProperty("devil_hp", state.devilHp);
        object.addProperty("total_time_taken", state.totalTimeTaken);
        object.addProperty("status", state.status);
        return object;
    }

    private static SessionState fromRow(ResultSet rows) throws SQLException {
        return new SessionState(
                rows.getInt("session_id"),
                rows.getInt("current_level"),
                rows.getInt("hero_hp"),
                rows.getInt("devil_hp"),
                rows.getInt("total_time_taken"),
                rows.getString("status"));
    }

    public static final class SessionState {
        public int sessionId;
        public int currentLevel;
        public int heroHp;
        public int devilHp;
        public int totalTimeTaken;
        public String status;

        public SessionState(int sessionId, int currentLevel, int heroHp, int devilHp, int totalTimeTaken, String status) {
            this.sessionId = sessionId;
            this.currentLevel = currentLevel;
            this.heroHp = heroHp;
            this.devilHp = devilHp;
            this.totalTimeTaken = totalTimeTaken;
            this.status = status;
        }
    }
}
