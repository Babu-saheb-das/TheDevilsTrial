package com.devilstrial.db;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public final class ApiIO {

    public static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();

    public static final String SESSION_USER_ID = "userId";
    public static final String SESSION_USER_NAME = "userName";

    private ApiIO() {
    }

    public static void applyCors(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (origin == null || origin.isEmpty()) {
            origin = "*";
        }
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }

    public static JsonObject readJson(HttpServletRequest request) throws IOException {
        JsonElement element = JsonParser.parseReader(
                new InputStreamReader(request.getInputStream(), StandardCharsets.UTF_8));
        if (element == null || !element.isJsonObject()) {
            return new JsonObject();
        }
        return element.getAsJsonObject();
    }

    public static void writeJson(HttpServletResponse response, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(GSON.toJson(body));
    }

    public static JsonObject error(String message) {
        JsonObject object = new JsonObject();
        object.addProperty("ok", false);
        object.addProperty("error", message);
        return object;
    }

    public static JsonObject ok() {
        JsonObject object = new JsonObject();
        object.addProperty("ok", true);
        return object;
    }

    public static Integer userId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }
        Object value = session.getAttribute(SESSION_USER_ID);
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof Number) {
            return Integer.valueOf(((Number) value).intValue());
        }
        return null;
    }

    public static String jsonString(JsonObject object, String key, String fallback) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return fallback;
        }
        try {
            return object.get(key).getAsString();
        } catch (RuntimeException e) {
            return fallback;
        }
    }

    public static int jsonInt(JsonObject object, String key, int fallback) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return fallback;
        }
        try {
            return object.get(key).getAsInt();
        } catch (RuntimeException e) {
            return fallback;
        }
    }
}
