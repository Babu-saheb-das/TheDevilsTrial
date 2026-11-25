package com.devilstrial.game;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.devilstrial.db.ApiIO;
import com.devilstrial.db.DBConnection;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class FetchLeaderboardServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(
                    "SELECT u.name AS player_name, l.score, l.hero_hp, l.created_at "
                            + "FROM leaderboard l "
                            + "INNER JOIN users u ON u.id = l.user_id "
                            + "ORDER BY l.score DESC, l.created_at ASC "
                            + "LIMIT 5");
            ResultSet rows = statement.executeQuery();
            JsonArray entries = new JsonArray();
            int rank = 1;
            while (rows.next()) {
                JsonObject row = new JsonObject();
                row.addProperty("rank", rank);
                row.addProperty("name", rows.getString("player_name"));
                row.addProperty("score", rows.getInt("score"));
                row.addProperty("hero_hp", rows.getInt("hero_hp"));
                row.addProperty("created_at", rows.getTimestamp("created_at").toString());
                entries.add(row);
                rank += 1;
            }
            rows.close();
            statement.close();

            JsonObject result = ApiIO.ok();
            result.add("leaders", entries);
            ApiIO.writeJson(response, HttpServletResponse.SC_OK, result);
        } catch (SQLException e) {
            ApiIO.writeJson(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, ApiIO.error("Unable to load leaderboard."));
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }
}
