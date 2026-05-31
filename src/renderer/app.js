const boardEl = document.querySelector("#board");
const statusEl = document.querySelector("#status");
const roomLabel = document.querySelector("#roomLabel");
const playerLabel = document.querySelector("#playerLabel");
const turnLabel = document.querySelector("#turnLabel");
const messageEl = document.querySelector("#message");
const redScore = document.querySelector("#redScore");
const blackScore = document.querySelector("#blackScore");
const serverUrlInput = document.querySelector("#serverUrl");
const roomCodeInput = document.querySelector("#roomCode");
const hostInfo = document.querySelector("#hostInfo");

let socket;
let roomCode = "";
let playerColor = "";
let selected = null;
let legalTargets = [];
let state = initialState();

function initialState() {
  const pieces = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 1) pieces.push({ row, col, color: "black", king: false });
    }
  }
  for (let row = 5; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 1) pieces.push({ row, col, color: "red", king: false });
    }
  }
  return { pieces, turn: "red", winner: "" };
}

function pieceAt(row, col, pieces = state.pieces) {
  return pieces.find((piece) => piece.row === row && piece.col === col);
}

function inside(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function directions(piece) {
  if (piece.king) return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  return piece.color === "red" ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
}

function captureDirections() {
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
}

function movesFor(piece, onlyCaptures = false) {
  const moves = [];

  if (piece.king) {
    for (const [dr, dc] of captureDirections()) {
      let row = piece.row + dr;
      let col = piece.col + dc;
      let captured = null;

      while (inside(row, col)) {
        const current = pieceAt(row, col);
        if (!current && !captured && !onlyCaptures) {
          moves.push({ row, col, capture: null });
        } else if (!current && captured) {
          moves.push({ row, col, capture: { row: captured.row, col: captured.col } });
        } else if (current?.color === piece.color || captured) {
          break;
        } else {
          captured = current;
        }

        row += dr;
        col += dc;
      }
    }
    return moves;
  }

  for (const [dr, dc] of directions(piece)) {
    const row = piece.row + dr;
    const col = piece.col + dc;
    if (!onlyCaptures && inside(row, col) && !pieceAt(row, col)) {
      moves.push({ row, col, capture: null });
    }
  }

  for (const [dr, dc] of captureDirections()) {
    const row = piece.row + dr;
    const col = piece.col + dc;
    const landingRow = piece.row + dr * 2;
    const landingCol = piece.col + dc * 2;
    const neighbor = pieceAt(row, col);

    if (
      inside(landingRow, landingCol) &&
      neighbor &&
      neighbor.color !== piece.color &&
      !pieceAt(landingRow, landingCol)
    ) {
      moves.push({ row: landingRow, col: landingCol, capture: { row, col } });
    }
  }
  return moves;
}

function allMoves(color) {
  const pieces = state.pieces.filter((piece) => piece.color === color);
  const captures = pieces.flatMap((piece) => movesFor(piece, true).map((move) => ({ piece, move })));
  if (captures.length > 0) return captures;
  return pieces.flatMap((piece) => movesFor(piece).map((move) => ({ piece, move })));
}

function canInteractWith(piece) {
  return piece && piece.color === playerColor && state.turn === playerColor && !state.winner;
}

function selectSquare(row, col) {
  const piece = pieceAt(row, col);
  const forced = allMoves(state.turn).some(({ move }) => move.capture);

  if (canInteractWith(piece)) {
    selected = { row, col };
    legalTargets = movesFor(piece, forced);
    render();
    return;
  }

  if (!selected) return;
  const move = legalTargets.find((target) => target.row === row && target.col === col);
  if (!move) return;
  applyMove(selected, move);
}

function applyMove(from, move) {
  const moving = pieceAt(from.row, from.col);
  const nextPieces = state.pieces.filter((piece) => piece !== moving);

  if (move.capture) {
    const captured = pieceAt(move.capture.row, move.capture.col);
    const index = nextPieces.indexOf(captured);
    if (index >= 0) nextPieces.splice(index, 1);
  }

  const promoted = moving.color === "red" ? move.row === 0 : move.row === 7;
  nextPieces.push({ ...moving, row: move.row, col: move.col, king: moving.king || promoted });
  state = { ...state, pieces: nextPieces };

  const movedPiece = pieceAt(move.row, move.col);
  const moreCaptures = move.capture ? movesFor(movedPiece, true) : [];
  if (moreCaptures.length > 0) {
    selected = { row: move.row, col: move.col };
    legalTargets = moreCaptures;
  } else {
    selected = null;
    legalTargets = [];
    state.turn = state.turn === "red" ? "black" : "red";
  }

  const opponentMoves = allMoves(state.turn);
  const opponentPieces = state.pieces.filter((piece) => piece.color === state.turn);
  if (opponentPieces.length === 0 || opponentMoves.length === 0) {
    state.winner = state.turn === "red" ? "black" : "red";
  }

  sendState();
  render();
}

function connect(url) {
  if (socket) socket.close();
  socket = new WebSocket(url);
  statusEl.textContent = "Подключение...";

  socket.addEventListener("open", () => {
    statusEl.textContent = "Онлайн";
  });

  socket.addEventListener("close", () => {
    statusEl.textContent = "Отключено";
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "room-created" || message.type === "room-joined") {
      roomCode = message.code;
      playerColor = message.color;
      state = message.state;
      roomCodeInput.value = roomCode;
      roomLabel.textContent = roomCode;
      playerLabel.textContent = playerColor === "red" ? "Красные" : "Черные";
      messageEl.textContent = message.type === "room-created" ? "Ждем второго игрока" : "Партия началась";
      render();
    }
    if (message.type === "peer-joined") {
      messageEl.textContent = "Партия началась";
      render();
    }
    if (message.type === "peer-left") {
      messageEl.textContent = "Друг отключился";
    }
    if (message.type === "state-update") {
      state = message.state;
      selected = null;
      legalTargets = [];
      render();
    }
    if (message.type === "error") {
      messageEl.textContent = message.message;
    }
  });
}

function sendState() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !roomCode) return;
  socket.send(JSON.stringify({ type: "state-update", code: roomCode, state }));
}

function render() {
  boardEl.innerHTML = "";
  turnLabel.textContent = state.turn === "red" ? "Красные" : "Черные";
  redScore.textContent = state.pieces.filter((piece) => piece.color === "red").length;
  blackScore.textContent = state.pieces.filter((piece) => piece.color === "black").length;

  if (state.winner) {
    messageEl.textContent = `${state.winner === "red" ? "Красные" : "Черные"} победили`;
  } else if (playerColor) {
    messageEl.textContent = state.turn === playerColor ? "Ваш ход" : "Ход друга";
  }

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.setAttribute("aria-label", `${row + 1}:${col + 1}`);
      square.addEventListener("click", () => selectSquare(row, col));

      if (selected && selected.row === row && selected.col === col) {
        square.classList.add("selected");
      }
      if (legalTargets.some((move) => move.row === row && move.col === col)) {
        square.classList.add("legal");
      }

      const piece = pieceAt(row, col);
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.color}${piece.king ? " king" : ""}`;
        square.append(pieceEl);
      }

      boardEl.append(square);
    }
  }
}

document.querySelector("#hostBtn").addEventListener("click", async () => {
  const info = await window.checkersHost.startServer(8787);
  serverUrlInput.value = "ws://localhost:8787";
  hostInfo.textContent = info.addresses.length
    ? `Адрес для друга: ${info.addresses[0]}`
    : "Сервер запущен на этом компьютере.";
  connect(serverUrlInput.value);
});

document.querySelector("#createBtn").addEventListener("click", () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) connect(serverUrlInput.value.trim());
  const create = () => socket.send(JSON.stringify({ type: "create-room", state: initialState() }));
  socket.readyState === WebSocket.OPEN ? create() : socket.addEventListener("open", create, { once: true });
});

document.querySelector("#joinBtn").addEventListener("click", () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) connect(serverUrlInput.value.trim());
  const join = () => socket.send(JSON.stringify({ type: "join-room", code: roomCodeInput.value }));
  socket.readyState === WebSocket.OPEN ? join() : socket.addEventListener("open", join, { once: true });
});

document.querySelector("#newGameBtn").addEventListener("click", () => {
  if (playerColor !== "red") return;
  state = initialState();
  selected = null;
  legalTargets = [];
  sendState();
  render();
});

document.querySelector("#copyBtn").addEventListener("click", async () => {
  const text = `Сервер: ${serverUrlInput.value.trim()}\nКомната: ${roomCode || roomCodeInput.value.trim()}`;
  await navigator.clipboard.writeText(text);
  hostInfo.textContent = "Приглашение скопировано.";
});

render();
