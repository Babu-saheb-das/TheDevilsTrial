package com.devilstrial.auth;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import com.devilstrial.db.ApiIO;
import com.devilstrial.db.DBConnection;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class GoogleAuthServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        JsonObject body = ApiIO.readJson(request);
        String idToken = ApiIO.jsonString(body, "idToken", "");
        if (idToken.isEmpty()) {
            idToken = ApiIO.jsonString(body, "credential", "");
        }
        if (idToken.isEmpty()) {
            ApiIO.writeJson(response, HttpServletResponse.SC_BAD_REQUEST, ApiIO.error("Missing Google ID token."));
            return;
        }

        JsonObject payload;
        try {
            payload = verifyGoogleIdToken(idToken);
        } catch (IOException e) {
            ApiIO.writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, ApiIO.error("Google token verification failed."));
            return;
        }

        String clientId = getServletContext().getInitParameter("google.clientId");
        String audience = stringValue(payload, "aud");
        if (clientId != null && !clientId.isEmpty() && !"YOUR_GOOGLE_CLIENT_ID".equals(clientId)
                && !clientId.equals(audience)) {
            ApiIO.writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, ApiIO.error("Token audience mismatch."));
            return;
        }

        String verified = stringValue(payload, "email_verified");
        if ("false".equalsIgnoreCase(verified)) {
            ApiIO.writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, ApiIO.error("Google email is not verified."));
            return;
        }

        String googleId = stringValue(payload, "sub");
        String email = stringValue(payload, "email");
        String name = stringValue(payload, "name");
        String picture = stringValue(payload, "picture");
        if (googleId.isEmpty() || email.isEmpty()) {
            ApiIO.writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, ApiIO.error("Token is missing subject or email."));
            return;
        }
        if (name.isEmpty()) {
            name = email;
        }

        Integer userId;
        try {
            userId = upsertUser(googleId, name, email);
        } catch (Exception e) {
            ApiIO.writeJson(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, ApiIO.error("Unable to persist user."));
            return;
        }

        HttpSession session = request.getSession(true);
        session.setAttribute(ApiIO.SESSION_USER_ID, userId);
        session.setAttribute(ApiIO.SESSION_USER_NAME, name);

        try {
            ensurePlayingSession(userId.intValue());
        } catch (Exception ignored) {
            // Progress can be created on first save/validate.
        }

        JsonObject result = ApiIO.ok();
        result.addProperty("user_id", userId);
        result.addProperty("name", name);
        result.addProperty("email", email);
        result.addProperty("picture", picture);
        ApiIO.writeJson(response, HttpServletResponse.SC_OK, result);
    }

    private JsonObject verifyGoogleIdToken(String idToken) throws IOException {
        String endpoint = "https://oauth2.googleapis.com/tokeninfo?id_token="
                + URLEncoder.encode(idToken, StandardCharsets.UTF_8.name());
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        int status = connection.getResponseCode();
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                status >= 400 ? connection.getErrorStream() : connection.getInputStream(),
                StandardCharsets.UTF_8));
        StringBuilder raw = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            raw.append(line);
        }
        reader.close();
        if (status != 200) {
            throw new IOException("tokeninfo status " + status);
        }
        return JsonParser.parseString(raw.toString()).getAsJsonObject();
    }

    private Integer upsertUser(String googleId, String name, String email) throws Exception {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement select = connection.prepareStatement(
                    "SELECT id FROM users WHERE google_id = ? LIMIT 1");
            select.setString(1, googleId);
            ResultSet existing = select.executeQuery();
            if (existing.next()) {
                int id = existing.getInt("id");
                existing.close();
                select.close();
                PreparedStatement update = connection.prepareStatement(
                        "UPDATE users SET name = ?, email = ? WHERE id = ?");
                update.setString(1, name);
                update.setString(2, email);
                update.setInt(3, id);
                update.executeUpdate();
                update.close();
                return Integer.valueOf(id);
            }
            existing.close();
            select.close();

            PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            insert.setString(1, name);
            insert.setString(2, email);
            insert.setString(3, googleId);
            insert.executeUpdate();
            ResultSet keys = insert.getGeneratedKeys();
            if (!keys.next()) {
                keys.close();
                insert.close();
                throw new IllegalStateException("No user id generated.");
            }
            int id = keys.getInt(1);
            keys.close();
            insert.close();
            return Integer.valueOf(id);
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    private void ensurePlayingSession(int userId) throws Exception {
        Connection connection = null;
        try {
            connection = DBConnection.getConnection();
            PreparedStatement select = connection.prepareStatement(
                    "SELECT session_id FROM game_sessions WHERE user_id = ? AND status = 'PLAYING' LIMIT 1");
            select.setInt(1, userId);
            ResultSet rows = select.executeQuery();
            boolean exists = rows.next();
            rows.close();
            select.close();
            if (exists) {
                return;
            }
            PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO game_sessions (user_id, current_level, hero_hp, devil_hp, status) "
                            + "VALUES (?, 1, 100, 100, 'PLAYING')");
            insert.setInt(1, userId);
            insert.executeUpdate();
            insert.close();
        } finally {
            DBConnection.releaseConnection(connection);
        }
    }

    private static String stringValue(JsonObject object, String key) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return "";
        }
        return object.get(key).getAsString().trim();
    }
}
