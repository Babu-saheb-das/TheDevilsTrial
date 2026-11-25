package com.devilstrial.db;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Pure Java SE JDBC access for The Devil's Trial.
 * Credentials: environment variables, then classpath/WEB-INF db.properties, then constants.
 */
public final class DBConnection {

    public static final String DB_HOST = "localhost";
    public static final int DB_PORT = 3306;
    public static final String DB_NAME = "devils_trial";
    public static final String DB_USER = "root";
    public static final String DB_PASSWORD = "password";

    public static final String JDBC_URL =
            "jdbc:mysql://" + DB_HOST + ":" + DB_PORT + "/" + DB_NAME
                    + "?useSSL=false"
                    + "&allowPublicKeyRetrieval=true"
                    + "&serverTimezone=UTC"
                    + "&characterEncoding=UTF-8";

    private static final String JDBC_DRIVER = "com.mysql.cj.jdbc.Driver";
    private static final int POOL_SIZE = 8;
    private static final long BORROW_TIMEOUT_SECONDS = 8L;

    private final BlockingQueue<Connection> pool;
    private final String jdbcUrl;
    private final String jdbcUser;
    private final String jdbcPassword;

    private static final class Holder {
        private static final DBConnection INSTANCE = new DBConnection();
    }

    private DBConnection() {
        try {
            Class.forName(JDBC_DRIVER);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("MySQL JDBC driver not found on the classpath: " + JDBC_DRIVER, e);
        }

        Properties properties = loadProperties();
        jdbcUrl = firstNonBlank(
                System.getenv("DB_URL"),
                properties.getProperty("db.url"),
                JDBC_URL);
        jdbcUser = firstNonBlank(
                System.getenv("DB_USER"),
                properties.getProperty("db.user"),
                DB_USER);
        jdbcPassword = firstNonBlank(
                System.getenv("DB_PASS"),
                System.getenv("DB_PASSWORD"),
                properties.getProperty("db.password"),
                DB_PASSWORD);
        pool = new ArrayBlockingQueue<Connection>(POOL_SIZE);
    }

    public static DBConnection getInstance() {
        return Holder.INSTANCE;
    }

    public static Connection getConnection() throws SQLException {
        return getInstance().borrowConnection();
    }

    public static void releaseConnection(Connection connection) {
        getInstance().returnConnection(connection);
    }

    private Connection borrowConnection() throws SQLException {
        try {
            Connection connection = pool.poll(BORROW_TIMEOUT_SECONDS, TimeUnit.MILLISECONDS);
            if (connection == null) {
                return openPhysicalConnection();
            }
            if (!isHealthy(connection)) {
                silentlyClose(connection);
                return openPhysicalConnection();
            }
            return connection;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SQLException("Interrupted while borrowing a JDBC connection", e);
        }
    }

    private void returnConnection(Connection connection) {
        if (connection == null) {
            return;
        }
        if (!isHealthy(connection) || !pool.offer(connection)) {
            silentlyClose(connection);
        }
    }

    private Connection openPhysicalConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, jdbcUser, jdbcPassword);
    }

    private static boolean isHealthy(Connection connection) {
        try {
            return connection != null && !connection.isClosed() && connection.isValid(2);
        } catch (SQLException e) {
            return false;
        }
    }

    private static void silentlyClose(Connection connection) {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
            }
        } catch (SQLException ignored) {
            // Pool replacement already handles a dead connection.
        }
    }

    private static Properties loadProperties() {
        Properties properties = new Properties();
        String[] classpathNames = { "db.properties", "/db.properties" };
        for (int i = 0; i < classpathNames.length; i++) {
            InputStream stream = DBConnection.class.getClassLoader().getResourceAsStream(classpathNames[i]);
            if (stream == null) {
                stream = DBConnection.class.getResourceAsStream(classpathNames[i]);
            }
            if (stream != null) {
                try {
                    properties.load(stream);
                    stream.close();
                    return properties;
                } catch (Exception ignored) {
                    silentlyCloseStream(stream);
                }
            }
        }

        String[] files = {
                "WEB-INF/db.properties",
                "backend/src/db.properties",
                "src/db.properties",
                "db.properties"
        };
        for (int i = 0; i < files.length; i++) {
            File file = new File(files[i]);
            if (!file.isFile()) {
                continue;
            }
            FileInputStream stream = null;
            try {
                stream = new FileInputStream(file);
                properties.load(stream);
                return properties;
            } catch (Exception ignored) {
                // try next path
            } finally {
                silentlyCloseStream(stream);
            }
        }
        return properties;
    }

    private static void silentlyCloseStream(InputStream stream) {
        if (stream == null) {
            return;
        }
        try {
            stream.close();
        } catch (Exception ignored) {
            // ignore
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (int i = 0; i < values.length; i++) {
            if (values[i] != null && !values[i].trim().isEmpty()) {
                return values[i].trim();
            }
        }
        return "";
    }
}
