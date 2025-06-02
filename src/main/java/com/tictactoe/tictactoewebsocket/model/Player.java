package com.tictactoe.tictactoewebsocket.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "players")
public class Player {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(name = "total_games")
    private int totalGames;
    
    @Column(name = "games_won")
    private int gamesWon;
    
    @Column(name = "games_lost")
    private int gamesLost;
    
    @Column(name = "games_tied")
    private int gamesTied;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "last_active")
    private LocalDateTime lastActive;
    
    // Constructors
    public Player() {
        this.createdAt = LocalDateTime.now();
        this.lastActive = LocalDateTime.now();
        this.totalGames = 0;
        this.gamesWon = 0;
        this.gamesLost = 0;
        this.gamesTied = 0;
    }
    
    public Player(String username) {
        this();
        this.username = username;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public int getTotalGames() {
        return totalGames;
    }
    
    public void setTotalGames(int totalGames) {
        this.totalGames = totalGames;
    }
    
    public int getGamesWon() {
        return gamesWon;
    }
    
    public void setGamesWon(int gamesWon) {
        this.gamesWon = gamesWon;
    }
    
    public int getGamesLost() {
        return gamesLost;
    }
    
    public void setGamesLost(int gamesLost) {
        this.gamesLost = gamesLost;
    }
    
    public int getGamesTied() {
        return gamesTied;
    }
    
    public void setGamesTied(int gamesTied) {
        this.gamesTied = gamesTied;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getLastActive() {
        return lastActive;
    }
    
    public void setLastActive(LocalDateTime lastActive) {
        this.lastActive = lastActive;
    }
    
    // Helper methods
    public void incrementGamesWon() {
        this.gamesWon++;
        this.totalGames++;
        this.lastActive = LocalDateTime.now();
    }
    
    public void incrementGamesLost() {
        this.gamesLost++;
        this.totalGames++;
        this.lastActive = LocalDateTime.now();
    }
    
    public void incrementGamesTied() {
        this.gamesTied++;
        this.totalGames++;
        this.lastActive = LocalDateTime.now();
    }
    
    public double getWinRate() {
        if (totalGames == 0) return 0.0;
        return (double) gamesWon / totalGames * 100;
    }
    
    @Override
    public String toString() {
        return "Player{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", totalGames=" + totalGames +
                ", gamesWon=" + gamesWon +
                ", gamesLost=" + gamesLost +
                ", gamesTied=" + gamesTied +
                ", winRate=" + String.format("%.1f", getWinRate()) + "%" +
                '}';
    }
}
