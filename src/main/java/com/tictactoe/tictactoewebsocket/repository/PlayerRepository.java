package com.tictactoe.tictactoewebsocket.repository;

import com.tictactoe.tictactoewebsocket.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    
    Optional<Player> findByUsername(String username);
    
    boolean existsByUsername(String username);
    
    @Query("SELECT p FROM Player p ORDER BY p.gamesWon DESC, p.totalGames DESC")
    List<Player> findTopPlayersByWins();
    
    @Query("SELECT p FROM Player p WHERE p.totalGames > 0 ORDER BY (p.gamesWon * 1.0 / p.totalGames) DESC, p.totalGames DESC")
    List<Player> findTopPlayersByWinRate();
    
    @Query("SELECT p FROM Player p ORDER BY p.lastActive DESC")
    List<Player> findRecentlyActive();
}
