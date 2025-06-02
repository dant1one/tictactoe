package com.tictactoe.tictactoewebsocket.controller;

import com.tictactoe.tictactoewebsocket.enumeration.GameState;
import com.tictactoe.tictactoewebsocket.manager.TicTacToeManager;
import com.tictactoe.tictactoewebsocket.model.TicTacToe;
import com.tictactoe.tictactoewebsocket.model.dto.JoinMessage;
import com.tictactoe.tictactoewebsocket.model.dto.PlayerMessage;
import com.tictactoe.tictactoewebsocket.model.dto.TicTacToeMessage;
import com.tictactoe.tictactoewebsocket.service.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Controller
public class MessageController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private PlayerService playerService;

    private final TicTacToeManager ticTacToeManager = new TicTacToeManager();

    @MessageMapping("/game.join")
    @SendTo("/topic/game.state")
    public Object joinGame(@Payload JoinMessage message, SimpMessageHeaderAccessor headerAccessor) {
        // Create or get player from database
        playerService.createOrGetPlayer(message.getPlayer());
        
        TicTacToe game = ticTacToeManager.joinGame(message.getPlayer());
        if (game == null) {
            TicTacToeMessage errorMessage = new TicTacToeMessage();
            errorMessage.setType("error");
            errorMessage.setContent("Não foi possível entrar no jogo. Talvez o jogo já esteja cheio ou ocorreu um erro interno.");
            return errorMessage;
        }
        
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put("gameId", game.getGameId());
            sessionAttributes.put("player", message.getPlayer());
        }

        TicTacToeMessage gameMessage = gameToMessage(game);
        gameMessage.setType("game.joined");
        return gameMessage;
    }

    @MessageMapping("/game.leave")
    public void leaveGame(@Payload PlayerMessage message) {
        TicTacToe game = ticTacToeManager.leaveGame(message.getPlayer());
        if (game != null) {
            TicTacToeMessage gameMessage = gameToMessage(game);
            gameMessage.setType("game.left");
            messagingTemplate.convertAndSend("/topic/game." + game.getGameId(), gameMessage);
        }
    }

    @MessageMapping("/game.move")
    public void makeMove(@Payload TicTacToeMessage message) {
        String player = message.getSender();
        String gameId = message.getGameId();
        int move = message.getMove();
        TicTacToe game = ticTacToeManager.getGame(gameId);

        if (game == null || game.isGameOver()) {
            TicTacToeMessage errorMessage = new TicTacToeMessage();
            errorMessage.setType("error");
            errorMessage.setContent("Game not found or is already over.");
            this.messagingTemplate.convertAndSend("/topic/game." + gameId, errorMessage);
            return;
        }

        if (game.getGameState().equals(GameState.WAITING_FOR_PLAYER)) {
            TicTacToeMessage errorMessage = new TicTacToeMessage();
            errorMessage.setType("error");
            errorMessage.setContent("Game is waiting for another player to join.");
            this.messagingTemplate.convertAndSend("/topic/game." + gameId, errorMessage);
            return;
        }

        if (game.getTurn().equals(player)) {
            game.makeMove(player, move);

            TicTacToeMessage gameStateMessage = new TicTacToeMessage(game);
            gameStateMessage.setType("game.move");
            this.messagingTemplate.convertAndSend("/topic/game." + gameId, gameStateMessage);

            if (game.isGameOver()) {
                TicTacToeMessage gameOverMessage = gameToMessage(game);
                gameOverMessage.setType("game.gameOver");
                this.messagingTemplate.convertAndSend("/topic/game." + gameId, gameOverMessage);
                
                // Record game result in database
                if (game.getPlayer1() != null && game.getPlayer2() != null) {
                    playerService.recordGameResult(game.getPlayer1(), game.getPlayer2(), game.getWinner());
                }
                
                ticTacToeManager.removeGame(gameId);
            }
        }
    }

    @EventListener
    public void SessionDisconnectEvent(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return;
        }
        
        Object gameIdObj = sessionAttributes.get("gameId");
        Object playerObj = sessionAttributes.get("player");
        
        if (gameIdObj == null || playerObj == null) {
            return;
        }
        
        String gameId = gameIdObj.toString();
        String player = playerObj.toString();
        TicTacToe game = ticTacToeManager.getGame(gameId);
        
        if (game != null) {
            if (game.getPlayer1() != null && game.getPlayer1().equals(player)) {
                game.setPlayer1(null);
                if (game.getPlayer2() != null) {
                    game.setGameState(GameState.PLAYER2_WON);
                    game.setWinner(game.getPlayer2());
                    
                    // Record game result - player2 wins due to disconnect
                    playerService.recordGameResult(player, game.getPlayer2(), game.getPlayer2());
                } else {
                    ticTacToeManager.removeGame(gameId);
                }
            } else if (game.getPlayer2() != null && game.getPlayer2().equals(player)) {
                game.setPlayer2(null);
                if (game.getPlayer1() != null) {
                    game.setGameState(GameState.PLAYER1_WON);
                    game.setWinner(game.getPlayer1());
                    
                    // Record game result - player1 wins due to disconnect
                    playerService.recordGameResult(game.getPlayer1(), player, game.getPlayer1());
                } else {
                    ticTacToeManager.removeGame(gameId);
                }
            }
            
            if (game.getWinner() != null) {
                TicTacToeMessage gameMessage = gameToMessage(game);
                gameMessage.setType("game.gameOver");
                messagingTemplate.convertAndSend("/topic/game." + gameId, gameMessage);
                ticTacToeManager.removeGame(gameId);
            }
        }
    }

    private TicTacToeMessage gameToMessage(TicTacToe game) {
        TicTacToeMessage message = new TicTacToeMessage();
        message.setGameId(game.getGameId());
        message.setPlayer1(game.getPlayer1());
        message.setPlayer2(game.getPlayer2());
        message.setBoard(game.getBoard());
        message.setTurn(game.getTurn());
        message.setGameState(game.getGameState());
        message.setWinner(game.getWinner());
        return message;
    }
}
