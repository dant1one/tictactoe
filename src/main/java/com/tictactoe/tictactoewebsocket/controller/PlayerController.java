package com.tictactoe.tictactoewebsocket.controller;

import com.tictactoe.tictactoewebsocket.model.Player;
import com.tictactoe.tictactoewebsocket.service.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/players")
public class PlayerController {
    
    @Autowired
    private PlayerService playerService;
    
    @GetMapping
    public List<Player> getAllPlayers() {
        return playerService.getAllPlayers();
    }
    
    @GetMapping("/{username}")
    public ResponseEntity<Player> getPlayer(@PathVariable String username) {
        Optional<Player> player = playerService.findByUsername(username);
        return player.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/top/wins")
    public List<Player> getTopPlayersByWins() {
        return playerService.getTopPlayersByWins();
    }
    
    @GetMapping("/top/winrate")
    public List<Player> getTopPlayersByWinRate() {
        return playerService.getTopPlayersByWinRate();
    }
    
    @GetMapping("/recent")
    public List<Player> getRecentlyActivePlayers() {
        return playerService.getRecentlyActivePlayers();
    }
    
    @PostMapping("/{username}")
    public ResponseEntity<Player> createPlayer(@PathVariable String username) {
        if (playerService.playerExists(username)) {
            return ResponseEntity.badRequest().build();
        }
        Player player = playerService.createOrGetPlayer(username);
        return ResponseEntity.ok(player);
    }
    
    @GetMapping("/exists/{username}")
    public ResponseEntity<Boolean> playerExists(@PathVariable String username) {
        return ResponseEntity.ok(playerService.playerExists(username));
    }
}
