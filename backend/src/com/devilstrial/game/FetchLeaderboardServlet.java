package com.devilstrial.game;

import com.devilstrial.db.DBConnection;
import com.google.gson.Gson;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class FetchLeaderboardServlet extends HttpServlet {

    class LeaderboardEntry {
        String name;
        int score;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        List<LeaderboardEntry> list = new ArrayList<>();

        try {
            Connection conn = DBConnection.getConnection();
            String sql = "SELECT u.name, l.score FROM leaderboard l " +
                         "JOIN users u ON l.user_id = u.user_id " +
                         "ORDER BY l.score DESC LIMIT 5";
            
            PreparedStatement pstmt = conn.prepareStatement(sql);
            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                LeaderboardEntry entry = new LeaderboardEntry();
                entry.name = rs.getString("name");
                entry.score = rs.getInt("score");
                list.add(entry);
            }

            out.print(new Gson().toJson(list));

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(500);
        }
    }
}