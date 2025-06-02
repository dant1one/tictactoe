let stompClient = null;
let game = null;
let player = null;

/**
 * Sends a message to the server using the STOMP client.
 * @param {Object} message - The message to be sent. Must contain at least a "type" field.
 */
const sendMessage = (message) => {
  stompClient.send(`/app/${message.type}`, {}, JSON.stringify(message));
};

/**
 * Sends a move message to the server.
 * @param {Number} move - The index of the cell where the move should be made.
 */
const makeMove = (move) => {
  sendMessage({
    type: "game.move",
    move: move,
    turn: game.turn,
    sender: player,
    gameId: game.gameId,
  });
};

// Variable to track if winner has already been shown to prevent duplicates
let winnerShown = false;

/**
 * An object containing functions to handle each type of message received from the server.
 */
const messagesTypes = {
  "game.join": (message) => {
    updateGame(message);
    // Когда второй игрок присоединяется к существующей игре
    if (message.player2 && player !== message.player2) {
      toastr.clear(); // Убираем предыдущие уведомления
      toastr.success(
        `🎯 ${message.player2} joined your game! Get ready!`,
        "Opponent Found!",
        {
          timeOut: 4000,
          progressBar: true,
        }
      );
    }
  },
  "game.gameOver": (message) => {
    updateGame(message);
    if (!winnerShown) {
      if (message.gameState === "TIE") {
        toastr.success(`Game over! It's a tie!`);
      } else if (message.winner) {
        showWinner(message.winner);
      }
      winnerShown = true;
    }
  },
  "game.joined": (message) => {
    if (game !== null && game.gameId !== message.gameId) return;
    player = localStorage.getItem("playerName");
    updateGame(message);

    // Reset winner shown flag for new game
    winnerShown = false;

    const socket = new SockJS("/ws");
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
      stompClient.subscribe(
        `/topic/game.${message.gameId}`,
        function (message) {
          handleMessage(JSON.parse(message.body));
        }
      );
    });

    // Показываем разные уведомления в зависимости от состояния игры
    if (message.player2) {
      toastr.clear(); // Убираем все предыдущие уведомления
      toastr.success(
        `🎉 Player ${message.player2} joined the game! Let's play!`,
        "Game Ready!",
        {
          timeOut: 2000,
          progressBar: false,
        }
      );
    } else {
      // Игрок создал новую игру и ждет оппонента
      toastr.info(`⏳ Waiting for another player to join...`, "Game Created!", {
        timeOut: 0, // Не убираем автоматически
        progressBar: false,
      });
    }
  },
  "game.move": (message) => {
    // Просто обновляем игру без уведомления
    updateGame(message);
  },
  "game.left": (message) => {
    updateGame(message);
    // Show winner only if not already shown and there's a winner
    if (!winnerShown && message.winner) {
      showWinner(message.winner);
      winnerShown = true;
    }
    // If a player left but no winner was declared, show appropriate message
    else if (!message.winner && message.player1 && message.player2) {
      toastr.info(`🚪 A player has left the game.`, "Game Ended", {
        timeOut: 4000,
        progressBar: true,
      });
    }
  },
  error: (message) => {
    toastr.error(message.content);
  },
};

/**
 * Handles a message received from the server.
 * @param {Object} message - The message received.
 */
const handleMessage = (message) => {
  if (messagesTypes[message.type]) messagesTypes[message.type](message);
};

/**
 * Converts a message received from the server into a game object.
 * @param {Object} message - The message received.
 * @returns {Object} The game object.
 */
const messageToGame = (message) => {
  return {
    gameId: message.gameId,
    board: message.board,
    turn: message.turn,
    player1: message.player1,
    player2: message.player2,
    gameState: message.gameState,
    winner: message.winner,
  };
};

/**
 * Displays a success message with the name of the winning player.
 * @param {String} winner - The name of the winning player.
 */
const showWinner = (winner) => {
  toastr.success(`The winner is ${winner}!`);
  const winningPositions = getWinnerPositions(game.board);
  if (winningPositions && winningPositions.length === 3) {
    // Меняем фон всей карточки на полупрозрачный желтый
    const cardElement = document.querySelector(".card");
    cardElement.classList.add("winner-bg");

    // Подсвечиваем выигрышные позиции
    winningPositions.forEach((position) => {
      const row = Math.floor(position / 3);
      const cell = position % 3;
      // Стилизуем всю ячейку, а не только текст
      let cellElement = document.querySelector(`.row-${row} .cell-${cell}`);
      // Устанавливаем желтый фон для победных ячеек
      cellElement.style.backgroundColor = "rgba(255, 215, 0, 0.3)";
      cellElement.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.5)";
      cellElement.style.animation = "pulse 1.5s infinite";

      // Также улучшим стиль для текста
      const spanElement = cellElement.querySelector("span");
      if (spanElement) {
        spanElement.style.fontWeight = "bold";
        spanElement.style.textShadow = "0 0 5px rgba(255, 215, 0, 0.7)";
      }
    });
  }
};

/**
 * Starts the process of joining a game. Asks the player to enter their name and sends a message to the server requesting to join the game.
 */
const joinGame = () => {
  // Создаем модальное окно с улучшенным дизайном
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
        <div class="modal-content">
            <div class="decoration-dots"></div>
            <h2>Welcome to Tic-Tac-Toe!</h2>
            <p class="welcome-subtitle">Get ready for an epic battle!</p>
            <p>Please enter your name to join the game:</p>
            <input type="text" id="playerNameInput" placeholder="Enter your name..." maxlength="15">
            <button id="joinGameBtn">
                <span class="btn-text">Join Game</span>
            </button>
        </div>
    `;
  document.body.appendChild(modal);

  const input = document.getElementById("playerNameInput");
  const joinButton = document.getElementById("joinGameBtn");

  // Автофокус на поле ввода
  setTimeout(() => input.focus(), 100);

  // Обработчик для кнопки
  joinButton.addEventListener("click", () => {
    submitName();
  });

  // Обработчик для Enter
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitName();
    }
  });

  function submitName() {
    const playerName = input.value.trim();
    if (playerName) {
      // Добавляем анимацию загрузки
      joinButton.innerHTML = '<span class="btn-text">Joining...</span>';
      joinButton.disabled = true;
      joinButton.style.opacity = "0.7";

      localStorage.setItem("playerName", playerName);

      // Добавляем небольшую задержку для плавности
      setTimeout(() => {
        document.body.removeChild(modal);
        sendMessage({
          type: "game.join",
          player: playerName,
        });
      }, 300);
    } else {
      // Улучшенная валидация с анимацией
      input.style.transform = "translateX(-5px)";
      input.style.boxShadow = "0 0 0 3px rgba(244, 67, 54, 0.6)";
      input.style.borderColor = "rgba(244, 67, 54, 0.8)";

      // Добавляем тряску
      setTimeout(() => {
        input.style.transform = "translateX(5px)";
      }, 100);
      setTimeout(() => {
        input.style.transform = "translateX(0)";
      }, 200);

      // Возвращаем исходный стиль
      setTimeout(() => {
        input.style.boxShadow = "";
        input.style.borderColor = "";
      }, 1500);

      // Фокусируемся на поле ввода
      input.focus();
    }
  }
};

/**
 * Connects the STOMP client to the server and subscribes to the "/topic/game.state" topic.
 */
const connect = () => {
  const socket = new SockJS("/ws");
  stompClient = Stomp.over(socket);
  stompClient.connect({}, function (frame) {
    stompClient.subscribe("/topic/game.state", function (message) {
      handleMessage(JSON.parse(message.body));
    });
    loadGame();
  });
};

/**
 * Attempts to load a game by joining with the player's previously stored name, or prompts the player to enter their name if no name is stored.
 */
const loadGame = () => {
  const playerName = localStorage.getItem("playerName");
  if (playerName) {
    sendMessage({
      type: "game.join",
      player: playerName,
    });
  } else {
    joinGame();
  }
};

/**
 * Updates the game state with the information received from the server.
 * @param {Object} message - The message received from the server.
 */
const updateGame = (message) => {
  game = messageToGame(message);
  updateBoard(message.board);
  document.getElementById("player1").innerHTML = game.player1;

  // Улучшенное отображение состояния второго игрока
  const player2Element = document.getElementById("player2");
  if (game.player2) {
    player2Element.innerHTML = game.player2;
    player2Element.parentNode.style.opacity = "1";
  } else {
    if (game.winner) {
      player2Element.innerHTML = "-";
    } else {
      player2Element.innerHTML = "⏳ Waiting for player...";
      player2Element.parentNode.style.opacity = "0.7";
      player2Element.style.fontStyle = "italic";
      player2Element.style.animation = "pulse 2s infinite";
    }
  }

  document.getElementById("turn").innerHTML = game.turn || "Waiting...";
  document.getElementById("winner").innerHTML = game.winner || "-";

  // Highlight active player
  const player1Element = document.getElementById("player1").parentNode;
  const player2ParentElement = document.getElementById("player2").parentNode;
  const cardElement = document.querySelector(".card");

  // Сбрасываем все возможные классы фона
  cardElement.classList.remove("x-turn", "o-turn", "winner-bg");

  if (game.winner) {
    // Если есть победитель, меняем фон на полупрозрачный желтый
    cardElement.classList.add("winner-bg");
    // Убираем анимацию ожидания
    player2Element.style.animation = "";
    player2Element.style.fontStyle = "";
    player2ParentElement.style.opacity = "1";
  } else if (game.player2 && game.turn === game.player1) {
    // Крестики (первый игрок) - зеленый полупрозрачный фон
    player1Element.style.borderLeft = "4px solid #32CD32";
    player1Element.style.paddingLeft = "10px";
    player2ParentElement.style.borderLeft = "none";
    player2ParentElement.style.paddingLeft = "0";
    cardElement.classList.add("x-turn");
    // Убираем анимацию ожидания
    player2Element.style.animation = "";
    player2Element.style.fontStyle = "";
    player2ParentElement.style.opacity = "1";
  } else if (game.player2 && game.turn === game.player2) {
    // Нолики (второй игрок) - красный полупрозрачный фон
    player2ParentElement.style.borderLeft = "4px solid #FF0000";
    player2ParentElement.style.paddingLeft = "10px";
    player1Element.style.borderLeft = "none";
    player1Element.style.paddingLeft = "0";
    cardElement.classList.add("o-turn");
    // Убираем анимацию ожидания
    player2Element.style.animation = "";
    player2Element.style.fontStyle = "";
    player2ParentElement.style.opacity = "1";
  } else {
    // Сбрасываем подсветку если игра не началась
    player1Element.style.borderLeft = "none";
    player1Element.style.paddingLeft = "0";
    player2ParentElement.style.borderLeft = "none";
    player2ParentElement.style.paddingLeft = "0";
  }
};

/**
 * Updates the game board with the information received from the server.
 * @param {Array} board - The board received from the server.
 */
const updateBoard = (board) => {
  let counter = 0;
  board.forEach((row, rowIndex) => {
    row.forEach((cell, cellIndex) => {
      const cellElement = document.querySelector(
        `.row-${rowIndex} .cell-${cellIndex}`
      );

      // Сброс классов ячейки
      cellElement.classList.remove("cell-x", "cell-o");

      if (cell === " ") {
        // Проверяем, можно ли делать ход (есть ли второй игрок)
        if (game && game.player2) {
          cellElement.innerHTML =
            '<button onclick="makeMove(' + counter + ')"> </button>';
        } else {
          // Если второго игрока нет, показываем заблокированную кнопку
          cellElement.innerHTML =
            '<button disabled style="opacity: 0.5; cursor: not-allowed;"> </button>';
        }
      } else {
        // Применяем разные стили для X и O
        const symbolClass = cell === "X" ? "symbol-x" : "symbol-o";
        const cellClass = cell === "X" ? "cell-x" : "cell-o";

        // Добавляем класс для фона ячейки
        cellElement.classList.add(cellClass);

        cellElement.innerHTML = `<span class="cell-item ${symbolClass}">${cell}</span>`;

        // Добавляем анимацию появления для новых символов
        const span = cellElement.querySelector("span");
        span.style.animation = "fadeIn 0.3s ease-in-out";
        // Цвет устанавливается через CSS-классы
      }
      counter++;
    });
  });

  // Добавляем визуальное состояние ожидания для доски
  const boardElement = document.getElementById("board");
  if (game && !game.player2 && !game.winner) {
    boardElement.classList.add("waiting-for-player");
  } else {
    boardElement.classList.remove("waiting-for-player");
  }
};

// Добавляем CSS анимацию в начало документа
document.addEventListener("DOMContentLoaded", function () {
  const style = document.createElement("style");
  style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
  document.head.appendChild(style);
});

/**
 * Get the winner positions from the board.
 * @param {Array} board - The board received from the server.
 */
const getWinnerPositions = (board) => {
  const winnerPositions = [];

  for (let i = 0; i < 3; i++) {
    if (
      board[i][0] === board[i][1] &&
      board[i][1] === board[i][2] &&
      board[i][0] !== " "
    ) {
      winnerPositions.push(i * 3);
      winnerPositions.push(i * 3 + 1);
      winnerPositions.push(i * 3 + 2);
    }
  }

  for (let i = 0; i < 3; i++) {
    if (
      board[0][i] === board[1][i] &&
      board[1][i] === board[2][i] &&
      board[0][i] !== " "
    ) {
      winnerPositions.push(i);
      winnerPositions.push(i + 3);
      winnerPositions.push(i + 6);
    }
  }

  if (
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2] &&
    board[0][0] !== " "
  ) {
    winnerPositions.push(0);
    winnerPositions.push(4);
    winnerPositions.push(8);
  }

  return winnerPositions;
};

/**
 * Starts a new game by resetting the game state and attempting to join a new game.
 */
const startNewGame = () => {
  // Reset winner shown flag
  winnerShown = false;

  // Получаем кнопку и временно меняем её состояние
  const newGameBtn = document.querySelector(".new-game-btn");
  const originalText = newGameBtn.innerHTML;

  newGameBtn.innerHTML = '<span class="btn-text">🎮 Creating Game...</span>';
  newGameBtn.disabled = true;
  newGameBtn.style.opacity = "0.7";
  newGameBtn.style.cursor = "not-allowed";

  // Reset game state
  game = null;

  // Clear the board visually
  const cardElement = document.querySelector(".card");
  if (cardElement) {
    cardElement.classList.remove("x-turn", "o-turn", "winner-bg");
  }

  // Reset player highlighting
  const player1Element = document.getElementById("player1").parentNode;
  const player2Element = document.getElementById("player2").parentNode;
  if (player1Element) {
    player1Element.style.borderLeft = "none";
    player1Element.style.paddingLeft = "0";
  }
  if (player2Element) {
    player2Element.style.borderLeft = "none";
    player2Element.style.paddingLeft = "0";
  }

  // Reset cell styles
  const allCells = document.querySelectorAll(".cell");
  allCells.forEach((cell) => {
    cell.classList.remove("cell-x", "cell-o");
    cell.style.backgroundColor = "";
    cell.style.boxShadow = "";
    cell.style.animation = "";
    const span = cell.querySelector("span");
    if (span) {
      span.style.fontWeight = "";
      span.style.textShadow = "";
    }
  });

  // Reset game info display
  document.getElementById("player1").innerHTML = "";
  document.getElementById("player2").innerHTML = "";
  document.getElementById("turn").innerHTML = "";
  document.getElementById("winner").innerHTML = "-";

  // Show loading message with better styling
  toastr.info("🎮 Creating a new game...", "Looking for an opponent!", {
    timeOut: 5000,
    progressBar: true,
  });

  // Try to join a new game with the stored player name
  const playerName = localStorage.getItem("playerName");
  if (playerName) {
    sendMessage({
      type: "game.join",
      player: playerName,
    });
  } else {
    // If no player name is stored, prompt for it
    joinGame();
  }

  // Восстанавливаем кнопку через некоторое время
  setTimeout(() => {
    newGameBtn.innerHTML = originalText;
    newGameBtn.disabled = false;
    newGameBtn.style.opacity = "1";
    newGameBtn.style.cursor = "pointer";
  }, 2000);
};

window.onload = function () {
  connect();
};
