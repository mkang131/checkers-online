const os = require("os");
const { WebSocketServer } = require("ws");

let wss;
const rooms = new Map();

function localAddresses(port) {
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

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(room, message, except) {
  for (const player of room.players) {
    if (player.socket !== except) send(player.socket, message);
  }
}

function removePlayer(socket) {
  for (const [code, room] of rooms) {
    const index = room.players.findIndex((player) => player.socket === socket);
    if (index === -1) continue;

    const [player] = room.players.splice(index, 1);
    broadcast(room, { type: "peer-left", color: player.color });

    if (room.players.length === 0) rooms.delete(code);
    return;
  }
}

function startServer(port = 8787) {
  if (wss) {
    return { ok: true, port: wss.options.port, addresses: localAddresses(wss.options.port) };
  }

  wss = new WebSocketServer({ port });

  wss.on("connection", (socket) => {
    socket.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        send(socket, { type: "error", message: "Bad message format." });
        return;
      }

      if (message.type === "create-room") {
        let code = makeRoomCode();
        while (rooms.has(code)) code = makeRoomCode();

        const room = {
          code,
          state: message.state,
          players: [{ socket, color: "red" }]
        };
        rooms.set(code, room);
        send(socket, { type: "room-created", code, color: "red", state: room.state });
        return;
      }

      if (message.type === "join-room") {
        const code = String(message.code || "").trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          send(socket, { type: "error", message: "Room not found." });
          return;
        }
        if (room.players.length >= 2) {
          send(socket, { type: "error", message: "Room is full." });
          return;
        }

        room.players.push({ socket, color: "black" });
        send(socket, { type: "room-joined", code, color: "black", state: room.state });
        broadcast(room, { type: "peer-joined", color: "black" }, socket);
        return;
      }

      if (message.type === "state-update") {
        const room = rooms.get(String(message.code || "").toUpperCase());
        if (!room) return;
        room.state = message.state;
        broadcast(room, { type: "state-update", state: room.state }, socket);
      }
    });

    socket.on("close", () => removePlayer(socket));
    socket.on("error", () => removePlayer(socket));
  });

  return new Promise((resolve, reject) => {
    wss.once("listening", () => {
      resolve({ ok: true, port, addresses: localAddresses(port) });
    });
    wss.once("error", (error) => {
      wss = undefined;
      reject(error);
    });
  });
}

function stopServer() {
  if (!wss) return { ok: true };

  for (const room of rooms.values()) {
    broadcast(room, { type: "server-stopped" });
  }
  rooms.clear();
  wss.close();
  wss = undefined;
  return { ok: true };
}

if (require.main === module) {
  startServer(Number(process.env.PORT) || 8787).then((info) => {
    console.log(`Checkers server running on port ${info.port}`);
    console.log(info.addresses.join("\n") || "No LAN address found.");
  });
}

module.exports = { startServer, stopServer };
