package com.devilstrial.game;

import com.devilstrial.db.DBConnection;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class SaveProgressServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        int userId = Integer.parseInt(request.getParameter("userId"));
        int level = Integer.parseInt(request.getParameter("level"));
        int heroHp = Integer.parseInt(request.getParameter("heroHp"));
        int devilHp = Integer.parseInt(request.getParameter("devilHp"));
        String status = request.getParameter("status"); // 'IN_PROGRESS', 'VICTORIOUS', 'FAILED'

        try {
            Connection conn = DBConnection.getConnection();
            
            // Check if progress exists, update; else insert
            String sql = "INSERT INTO game_progress (user_id, current_level, user_hp, devil_hp, status) " +
                         "VALUES (?, ?, ?, ?, ?) " +
                         "ON DUPLICATE KEY UPDATE current_level=?, user_hp=?, devil_hp=?, status=?";
            
            PreparedStatement pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, userId);
            pstmt.setInt(2, level);
            pstmt.setInt(3, heroHp);
            pstmt.setInt(4, devilHp);
            pstmt.setString(5, status);
            
            // For Update Clause
            pstmt.setInt(6, level);
            pstmt.setInt(7, heroHp);
            pstmt.setInt(8, devilHp);
            pstmt.setString(9, status);

            pstmt.executeUpdate();
            
            // If Victorious, save to Leaderboard
            if ("VICTORIOUS".equals(status)) {
                String lbSql = "INSERT INTO leaderboard (user_id, score) VALUES (?, ?)";
                PreparedStatement lbPstmt = conn.prepareStatement(lbSql);
                lbPstmt.setInt(1, userId);
                lbPstmt.setInt(2, heroHp * 10); // Score based on remaining Hero HP
                lbPstmt.executeUpdate();
            }

            response.setStatus(200);

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(500);
        }
    }
}