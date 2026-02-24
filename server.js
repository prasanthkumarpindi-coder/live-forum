const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// serve frontend
app.use(express.static(path.join(__dirname, "public")));

// database (messages persistence)
const db = new Database(path.join(__dirname, "forum.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userName TEXT NOT NULL,
    text TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
`);

const insertMessage = db.prepare(
  `INSERT INTO messages (userName, text, createdAt) VALUES (?, ?, ?)`
);

const fetchMessages = db.prepare(
  `SELECT id, userName, text, createdAt FROM messages ORDER BY createdAt ASC LIMIT ?`
);

// online tracking (tabs open)
const activeNames = new Set();
const socketToName = new Map();

function broadcastOnline() {
  io.emit("onlineCount", { count: activeNames.size });
}

io.on("connection", (socket) => {
  socket.on("join", ({ name }, ack) => {
    name = (name || "").trim();

    if (name.length < 2 || name.length > 20) {
      return ack?.({ ok: false, error: "Name must be 2–20 characters." });
    }
    if (activeNames.has(name)) {
      return ack?.({ ok: false, error: "Name already taken. Try another." });
    }

    activeNames.add(name);
    socketToName.set(socket.id, name);

    const messages = fetchMessages.all(100);
    ack?.({ ok: true, name, messages });

    broadcastOnline();
  });

  socket.on("sendMessage", ({ text }, ack) => {
    const name = socketToName.get(socket.id);
    if (!name) return ack?.({ ok: false, error: "Join first." });

    text = (text || "").trim();
    if (!text || text.length > 500) {
      return ack?.({ ok: false, error: "Message must be 1–500 characters." });
    }

    const createdAt = Date.now();
    insertMessage.run(name, text, createdAt);

    io.emit("newMessage", { userName: name, text, createdAt });
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const name = socketToName.get(socket.id);
    if (name) {
      socketToName.delete(socket.id);
      activeNames.delete(name);
      broadcastOnline();
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Running on http://localhost:${PORT}`);
});