package com.devilstrial.game;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.devilstrial.db.ApiIO;
import com.devilstrial.db.DBConnection;
import com.devilstrial.game.TrialStore.SessionState;
import com.google.gson.JsonObject;

public class SaveProgressServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        Integer userId = ApiIO.userId(request);
        if (userId == null) {
            ApiIO.writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, ApiIO.error("Sign in required."));
            return;
        }

        JsonObject body = ApiIO.readJson(request);
        boolean newTrial = body.has("newTrial") && body.get("newTrial").getAsBoolean();

        try {
            String incomingStatus = ApiIO.jsonString(body, "status", "").toUpperCase();
            boolean victory = body.has("victory") && body.get("victory").getAsBoolean();
            SessionState state;

            if (newTrial) {
                abandonPlaying(userId.intValue());
                state = TrialStore.requirePlaying(userId.intValue());
            } else if (victory || "WON".equals(incomingStatus) || "FAILED".equals(incomingStatus)) {
                SessionState latest = TrialStore.loadLatest(userId.intValue());
                if (latest != null && ("WON".equals(latest.status) || "FAILED".equals(latest.status))) {
                    JsonObject result = ApiIO.ok();
                    result.add("session", TrialStore.toJson(latest));
                    if ("WON".equals(latest.status)) {
                        result.addProperty("score", latest.heroHp * 10);
                    }
                    ApiIO.writeJson(response, HttpServletResponse.SC_OK, result);
                    return;
                }
                state = TrialStore.requirePlaying(userId.intValue());
            } else {
                state = TrialStore.requirePlaying(userId.intValue());
            }

            if (body.has("heroHp")) {
                state.heroHp = TrialStore.clampHp(ApiIO.jsonInt(body, "heroHp", state.heroHp));
            }
            if (body.has("devilHp")) {
                state.devilHp = TrialStore.clampHp(ApiIO.jsonInt(body, "devilHp", state.devilHp));
            }
            if (body.has("currentLevel")) {
                int level = ApiIO.jsonInt(body, "currentLevel", state.currentLevel);
                if (level >= 1 && level <= TrialStore.MAX_LEVEL) {
                    state.currentLevel = level;
                }
            }
            if (body.has("totalTimeTaken")) {
                state.totalTimeTaken = Math.max(0, ApiIO.jsonInt(body, "totalTimeTaken", state.totalTimeTaken));
            }

            if (victory || "WON".equals(incomingStatus) || state.devilHp <= 0) {
                state.status = "WON";
                state.devilHp = 0;
                TrialStore.save(state);
                TrialStore.recordVictoryScore(userId.intValue(), state.heroHp);
            } else if ("FAILED".equals(incomingStatus) || state.heroHp <= 0) {
                state.status = "FAILED";
                state.heroHp = 0;
                TrialStore.save(state);
            } else {
                state.status = "PLAYING";
                TrialStore.save(state);
            }

            JsonObject result = ApiIO.ok();
            result.add("session", TrialStore.toJson(state));
            if ("WON".equals(state.status)) {
                result.addProperty("score", state.heroHp * 10);
            }
            ApiIO.writeJson(response, HttpServletResponse.SC_OK, result);
        } catch (SQLException e) {
            ApiIO.writeJson(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, ApiIO.error("Unable to save progress."));
        }
    }

    private static void abandonPlaying(int userId) throws SQLException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "UPDATE game_sessions SET status = 'FAILED', ended_at = CURRENT_TIMESTAMP "
                            + "WHERE user_id = ? AND status = 'PLAYING'");
            statement.setInt(1, userId);
            statement.executeUpdate();
            statement.close();
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }
}
