package com.tictactoe.tictactoewebsocket.model.dto;

public interface Message {
    String getType();
    String getGameId();
    String getContent();
}
