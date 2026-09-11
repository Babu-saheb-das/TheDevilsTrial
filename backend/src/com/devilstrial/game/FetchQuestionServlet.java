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

public class FetchQuestionServlet extends HttpServlet {

    // FIX 1: Static inner class banaya taaki GSON easily serialize kar sake
    public static class QuestionResponse {
        int questionId;
        int level;
        String codeSnippet;
        String questionText;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        String levelParam = request.getParameter("level");
        int level = (levelParam != null && !levelParam.isEmpty()) ? Integer.parseInt(levelParam) : 1;
        
        QuestionResponse qResp = new QuestionResponse();

        // FIX 2: Try-with-resources use kiya taaki memory leaks na ho
        String sql = "SELECT question_id, level, code_snippet, question_text FROM questions WHERE level = ? LIMIT 1";

        try {
            Connection conn = DBConnection.getConnection();
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setInt(1, level);
                
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        qResp.questionId = rs.getInt("question_id");
                        qResp.level = rs.getInt("level");
                        qResp.codeSnippet = rs.getString("code_snippet");
                        qResp.questionText = rs.getString("question_text");
                    }
                }
            }

            // Object ko JSON String mein convert karke out stream par print karna
            String jsonOutput = new Gson().toJson(qResp);
            out.print(jsonOutput);
            out.flush();

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            out.print("{\"error\": \"Database operation failed\"}");
        }
    }
}