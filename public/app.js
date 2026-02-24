const socket = io();

const joinDiv = document.getElementById("join");
const chatDiv = document.getElementById("chat");

const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("joinBtn");
const joinErr = document.getElementById("joinErr");

const me = document.getElementById("me");
const online = document.getElementById("online");

const msgs = document.getElementById("msgs");
const form = document.getElementById("form");
const text = document.getElementById("text");
const msgErr = document.getElementById("msgErr");
const leaveBtn = document.getElementById("leaveBtn");

let myName = "";

function esc(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function time(ms) {
  const d = new Date(ms || Date.now());
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addSystemLine(t, createdAt) {
  const div = document.createElement("div");
  div.className = "system";
  div.textContent = `${t} • ${time(createdAt)}`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addMsg(m) {
  const wrap = document.createElement("div");
  wrap.className = "msg" + (m.userName === myName ? " me" : "");

  const head = document.createElement("div");
  head.className = "msgHead";
  head.innerHTML = `<span><b>${esc(m.userName)}</b></span><span>${time(m.createdAt)}</span>`;

  const body = document.createElement("div");
  body.className = "msgText";
  body.innerHTML = esc(m.text);

  wrap.appendChild(head);
  wrap.appendChild(body);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function doJoin() {
  joinErr.textContent = "";
  msgErr.textContent = "";

  const name = nameInput.value.trim();

  socket.emit("join", { name }, (res) => {
    if (!res || !res.ok) {
      joinErr.textContent = (res && res.error) || "Join failed";
      return;
    }

    myName = res.name;
    me.textContent = myName;

    msgs.innerHTML = "";
    (res.messages || []).forEach(addMsg);
    addSystemLine("Connected", Date.now());

    joinDiv.classList.add("hidden");
    chatDiv.classList.remove("hidden");
    text.focus();
  });
}

joinBtn.onclick = doJoin;
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doJoin();
});

leaveBtn.onclick = () => location.reload();

socket.on("onlineCount", (d) => {
  online.textContent = String(d.count ?? 0);
});

socket.on("newMessage", (m) => addMsg(m));

socket.on("system", (s) => {
  if (s && s.text) addSystemLine(s.text, s.createdAt);
});

form.onsubmit = (e) => {
  e.preventDefault();
  msgErr.textContent = "";

  const message = text.value.trim();
  if (!message) return;

  socket.emit("sendMessage", { text: message }, (res) => {
    if (!res || !res.ok) {
      msgErr.textContent = (res && res.error) || "Send failed";
      return;
    }
    text.value = "";
    text.focus();
  });
};
