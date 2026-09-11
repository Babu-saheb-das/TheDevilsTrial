package com.devilstrial.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {
   
    // Fallback values mein generic placeholders use karein, real password nahi!
    private static final String URL = System.getenv("DB_URL") != null 
            ? System.getenv("DB_URL") 
            : "jdbc:mysql://localhost:3306/devilstrial_db";
            
    private static final String USER = System.getenv("DB_USER") != null 
            ? System.getenv("DB_USER") 
            : "root"; 
            
    private static final String PASSWORD = System.getenv("DB_PASS") != null 
            ? System.getenv("DB_PASS") 
            : ""; // <-- Empty rakhein ya local environment variable set karein

    public static Connection getConnection() {
        Connection connection = null;
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            connection = DriverManager.getConnection(URL, USER, PASSWORD);
        } catch (ClassNotFoundException e) {
            System.err.println("MySQL Driver class nahi mili!");
            e.printStackTrace();
        } catch (SQLException e) {
            System.err.println("Database Connection Fail ho gaya!");
            e.printStackTrace();
        }
        return connection;
    }
}