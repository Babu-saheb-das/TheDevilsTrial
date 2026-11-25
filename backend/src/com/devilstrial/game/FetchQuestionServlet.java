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

public class FetchQuestionServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        Integer userId = ApiIO.userId(request);
        int requestedLevel = parseLevel(request.getParameter("level"));
        if (requestedLevel <= 0) {
            requestedLevel = parseLevel(request.getParameter("chamber"));
        }

        try {
            if (userId != null) {
                SessionState state = TrialStore.requirePlaying(userId.intValue());
                if (requestedLevel <= 0) {
                    requestedLevel = state.currentLevel;
                }
            }
            if (requestedLevel <= 0) {
                requestedLevel = 1;
            }

            JsonObject level = TrialStore.loadLevelPublic(requestedLevel);
            if (level == null) {
                ApiIO.writeJson(response, HttpServletResponse.SC_NOT_FOUND, ApiIO.error("Chamber not found."));
                return;
            }
            if (userId != null) {
                SessionState state = TrialStore.requirePlaying(userId.intValue());
                level.add("session", TrialStore.toJson(state));
            }
            level.addProperty("ok", true);
            ApiIO.writeJson(response, HttpServletResponse.SC_OK, level);
        } catch (SQLException e) {
            ApiIO.writeJson(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, ApiIO.error("Unable to load chamber."));
        }
    }

    private static int parseLevel(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return -1;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
