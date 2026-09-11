package com.devilstrial.game;

import com.devilstrial.db.DBConnection;
import com.google.gson.Gson;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class ValidateAnswerServlet extends HttpServlet {

    class ValidationResult {
        boolean isCorrect;
        int damageDealt;
        String message;
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        int questionId = Integer.parseInt(request.getParameter("questionId"));
        String userAnswer = request.getParameter("answer").trim();

        ValidationResult result = new ValidationResult();

        try {
            Connection conn = DBConnection.getConnection();
            String sql = "SELECT correct_answer FROM questions WHERE question_id = ?";
            PreparedStatement pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, questionId);
            
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                String correctAnswer = rs.getString("correct_answer").trim();

                // Case-insensitive exact match
                if (correctAnswer.equalsIgnoreCase(userAnswer)) {
                    result.isCorrect = true;
                    result.damageDealt = 20; // Devil loses 20 HP
                    result.message = "CRITICAL HIT! Devil took damage!";
                } else {
                    result.isCorrect = false;
                    result.damageDealt = 25; // Hero loses 25 HP
                    result.message = "WRONG ANSWER! Devil attacked you!";
                }
            }

            out.print(new Gson().toJson(result));

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(500);
        }
    }
}