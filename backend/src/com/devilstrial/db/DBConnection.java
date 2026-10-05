package com.devilstrial.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Pure Java SE JDBC access for The Devil's Trial.
 * Initialization-on-demand holder singleton plus a small connection pool
 * so servlets can borrow/return connections without Spring or a third-party pool.
 *
 * Edit the constants below to match the local MySQL install.
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

    private static final class Holder {
        private static final DBConnection INSTANCE = new DBConnection();
    }

    private DBConnection() {
        try {
            Class.forName(JDBC_DRIVER);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("MySQL JDBC driver not found on the classpath: " + JDBC_DRIVER, e);
        }

        pool = new ArrayBlockingQueue<>(POOL_SIZE);
        for (int i = 0; i < POOL_SIZE; i++) {
            pool.offer(openPhysicalConnection());
        }
    }

    public static DBConnection getInstance() {
        return Holder.INSTANCE;
    }

    /**
     * Borrow a pooled connection. Call {@link #releaseConnection(Connection)} when finished.
     */
    public static Connection getConnection() throws SQLException {
        return getInstance().borrowConnection();
    }

    public static void releaseConnection(Connection connection) {
        getInstance().returnConnection(connection);
    }

    private Connection borrowConnection() throws SQLException {
        try {
            Connection connection = pool.poll(BORROW_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (connection == null) {
                throw new SQLException("Timed out waiting for a free JDBC connection to " + DB_NAME);
            }
            if (!isHealthy(connection)) {
                silentlyClose(connection);
                connection = openPhysicalConnection();
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

    private Connection openPhysicalConnection() {
        try {
            return DriverManager.getConnection(JDBC_URL, DB_USER, DB_PASSWORD);
        } catch (SQLException e) {
            throw new IllegalStateException(
                    "Failed to connect to MySQL database '" + DB_NAME + "' at " + JDBC_URL, e);
        }
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
}
