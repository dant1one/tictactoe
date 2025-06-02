package com.tictactoe.tictactoewebsocket.service;

import com.tictactoe.tictactoewebsocket.model.Player;
import com.tictactoe.tictactoewebsocket.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PlayerService {
    
    @Autowired
    private PlayerRepository playerRepository;
    
    public Player createOrGetPlayer(String username) {
        Optional<Player> existingPlayer = playerRepository.findByUsername(username);
        if (existingPlayer.isPresent()) {
            Player player = existingPlayer.get();
            player.setLastActive(LocalDateTime.now());
            return playerRepository.save(player);
        } else {
            Player newPlayer = new Player(username);
            return playerRepository.save(newPlayer);
        }
    }
    
    public Optional<Player> findByUsername(String username) {
        return playerRepository.findByUsername(username);
    }
    
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }
    
    public List<Player> getTopPlayersByWins() {
        return playerRepository.findTopPlayersByWins();
    }
    
    public List<Player> getTopPlayersByWinRate() {
        return playerRepository.findTopPlayersByWinRate();
    }
    
    public List<Player> getRecentlyActivePlayers() {
        return playerRepository.findRecentlyActive();
    }
    
    public void recordGameResult(String player1Name, String player2Name, String winner) {
        Optional<Player> player1Opt = playerRepository.findByUsername(player1Name);
        Optional<Player> player2Opt = playerRepository.findByUsername(player2Name);
        
        if (player1Opt.isPresent() && player2Opt.isPresent()) {
            Player player1 = player1Opt.get();
            Player player2 = player2Opt.get();
            
            if (winner == null) {
                // Tie game
                player1.incrementGamesTied();
                player2.incrementGamesTied();
            } else if (winner.equals(player1Name)) {
                // Player 1 wins
                player1.incrementGamesWon();
                player2.incrementGamesLost();
            } else if (winner.equals(player2Name)) {
                // Player 2 wins
                player2.incrementGamesWon();
                player1.incrementGamesLost();
            }
            
            playerRepository.save(player1);
            playerRepository.save(player2);
        }
    }
    
    public boolean playerExists(String username) {
        return playerRepository.existsByUsername(username);
    }
    
    public Player savePlayer(Player player) {
        return playerRepository.save(player);
    }
}
