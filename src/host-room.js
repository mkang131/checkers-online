const os = require("os");
const { WebSocketServer } = require("ws");

const port = Number(process.env.PORT) || 8787;
const code = (process.env.ROOM_CODE || "ROOM1").toUpperCase();

const initialState = {
  turn: "red",
  winner: "",
  pieces: []
};

for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 8; col += 1) {
    if ((row + col) % 2 === 1) initialState.pieces.push({ row, col, color: "black", king: false });
  }
}
for (let row = 5; row < 8; row += 1) {
  for (let col = 0; col < 8; col += 1) {
    if ((row + col) % 2 === 1) initialState.pieces.push({ row, col, color: "red", king: false });
  }
}

const room = {
  code,
  state: initialState,
  players: []
};

function localAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(`ws://${entry.address}:${port}`);
      }
    }
  }
  return addresses;
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(message, except) {
  for (const player of room.players) {
    if (player.socket !== except) send(player.socket, message);
  }
}

const server = new WebSocketServer({ port });

server.on("connection", (socket) => {
  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: "error", message: "Bad message format." });
      return;
    }

    if (message.type === "create-room") {
      send(socket, { type: "room-created", code, color: "red", state: room.state });
      return;
    }

    if (message.type === "join-room") {
      if (String(message.code || "").trim().toUpperCase() !== code) {
        send(socket, { type: "error", message: "Room not found." });
        return;
      }
      if (room.players.length >= 2) {
        send(socket, { type: "error", message: "Room is full." });
        return;
      }

      const color = room.players.length === 0 ? "red" : "black";
      room.players.push({ socket, color });
      send(socket, { type: "room-joined", code, color, state: room.state });
      broadcast({ type: "peer-joined", color }, socket);
      return;
    }

    if (message.type === "state-update") {
      if (String(message.code || "").trim().toUpperCase() !== code) return;
      room.state = message.state;
      broadcast({ type: "state-update", state: room.state }, socket);
    }
  });

  socket.on("close", () => {
    const index = room.players.findIndex((player) => player.socket === socket);
    if (index >= 0) {
      const [player] = room.players.splice(index, 1);
      broadcast({ type: "peer-left", color: player.color });
    }
  });
});

server.on("listening", () => {
  console.log(`Room ${code} is ready.`);
  console.log(localAddresses().join("\n"));
});
