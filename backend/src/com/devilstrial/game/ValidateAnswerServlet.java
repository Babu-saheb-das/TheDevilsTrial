package com.devilstrial.game;

import java.io.IOException;
import java.sql.SQLException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.devilstrial.db.ApiIO;
import com.devilstrial.game.TrialStore.SessionState;
import com.google.gson.JsonObject;

public class ValidateAnswerServlet extends HttpServlet {

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
        String submitted = ApiIO.jsonString(body, "answer", "");
        int timeTaken = ApiIO.jsonInt(body, "totalTimeTaken", 0);

        try {
            SessionState state = TrialStore.requirePlaying(userId.intValue());
            String expected = TrialStore.loadCorrectAnswer(state.currentLevel);
            if (expected == null) {
                ApiIO.writeJson(response, HttpServletResponse.SC_NOT_FOUND, ApiIO.error("Chamber not found."));
                return;
            }

            boolean hit = normalize(submitted).equals(normalize(expected));
            if (hit) {
                state.devilHp = TrialStore.clampHp(state.devilHp - TrialStore.DEVIL_HIT);
            } else {
                state.heroHp = TrialStore.clampHp(state.heroHp - TrialStore.HERO_HIT);
            }
            state.totalTimeTaken = Math.max(state.totalTimeTaken, timeTaken);

            if (state.devilHp <= 0) {
                state.devilHp = 0;
                state.status = "WON";
                TrialStore.save(state);
                TrialStore.recordVictoryScore(userId.intValue(), state.heroHp);
            } else if (state.heroHp <= 0) {
                state.heroHp = 0;
                state.status = "FAILED";
                TrialStore.save(state);
            } else {
                if (hit && state.currentLevel < TrialStore.MAX_LEVEL) {
                    state.currentLevel += 1;
                }
                TrialStore.save(state);
            }

            JsonObject result = ApiIO.ok();
            result.addProperty("correct", hit);
            result.addProperty("hero_hp", state.heroHp);
            result.addProperty("devil_hp", state.devilHp);
            result.addProperty("current_level", state.currentLevel);
            result.addProperty("status", state.status);
            result.addProperty("score", "WON".equals(state.status) ? state.heroHp * 10 : 0);
            if ("PLAYING".equals(state.status)) {
                JsonObject next = TrialStore.loadLevelPublic(state.currentLevel);
                if (next != null) {
                    result.add("next_level", next);
                }
            }
            ApiIO.writeJson(response, HttpServletResponse.SC_OK, result);
        } catch (SQLException e) {
            ApiIO.writeJson(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, ApiIO.error("Unable to validate answer."));
        }
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("\\s+", " ").toLowerCase();
    }
}
