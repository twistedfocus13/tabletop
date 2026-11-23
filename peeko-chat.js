/* ⚡ Peeko chat: GM only. Talks to Peeko on the GM's own computer (her dashboard at http://127.0.0.1:8765).
 * Players never see it (it only shows in the GM view) and can't use it: it needs the GM's private key, which the
 * dashboard hands over when she presses Connect -> Allow. Talk only: Peeko helps with rules, ideas and NPCs from here.
 * It checks for news only while a reply is on its way.
 */
(() => {
  "use strict";
  const DASH = (localStorage.getItem("peekoDash") || "http://127.0.0.1:8765").replace(/\/+$/, "");
  const KEYNAME = "peekoKey";
  let key = localStorage.getItem(KEYNAME) || "";
  let open = false, timer = null, drawn = "", root = null;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const gm = () => document.body.classList.contains("gm") && !document.body.classList.contains("previewing");

  // Peeko's replies use a little **bold** and line breaks: escape everything, then allow just bold.
  const fmt = t => el("div").appendChild(document.createTextNode(t)).parentNode.innerHTML
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  async function call(path, body) {
    const r = await fetch(DASH + "/api/table-chat/" + path, {
      method: body ? "POST" : "GET",
      headers: Object.assign({ "X-Peeko-Key": key }, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined, cache: "no-store"
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { key = ""; localStorage.removeItem(KEYNAME); throw Object.assign(new Error("not connected"), { connect: true }); }
    if (!r.ok) throw new Error(j.error || "Something went wrong.");
    return j;
  }

  function build() {
    root = el("div", "peeko-chat");
    root.hidden = true;
    const btn = el("button", "peeko-fab", "⚡");
    btn.type = "button";
    btn.title = "Chat with Peeko (only you see this)";
    btn.setAttribute("aria-label", "Chat with Peeko");
    const panel = el("section", "peeko-panel");
    panel.hidden = true;
    panel.setAttribute("aria-label", "Peeko chat");
    const head = el("div", "peeko-head");
    const title = el("strong", "", "⚡ Peeko");
    const sub = el("span", "", "only you see this");
    const newBtn = el("button", "", "New chat"); newBtn.type = "button"; newBtn.title = "Start a fresh conversation";
    const close = el("button", "", "✕"); close.type = "button"; close.title = "Close";
    head.append(title, sub, newBtn, close);
    const list = el("div", "peeko-list");
    list.setAttribute("role", "log");
    const connectBox = el("div", "peeko-connect");
    connectBox.append(el("p", "", "Connect once so Peeko can answer here. Your dashboard must be running on this computer."));
    const connectBtn = el("button", "peeko-main", "🔗 Connect to Peeko"); connectBtn.type = "button";
    connectBox.append(connectBtn, el("p", "peeko-small", "A small window opens. Press ✅ Allow there."));
    const form = el("form", "peeko-form");
    const box = el("textarea"); box.rows = 2; box.maxLength = 4000;
    box.placeholder = "Ask Peeko… (rules, NPC names, a quick encounter)";
    const send = el("button", "peeko-main", "Send"); send.type = "submit";
    form.append(box, send);
    const status = el("div", "peeko-small");
    panel.append(head, connectBox, list, form, status);
    root.append(panel, btn);
    document.body.append(root);

    const say = t => { status.textContent = t || ""; };
    const showConnect = () => { const need = !key; connectBox.hidden = !need; list.hidden = need; form.hidden = need; newBtn.hidden = need; };

    function draw(msgs) {
      const k = JSON.stringify(msgs);
      if (k === drawn) return;
      drawn = k;
      list.replaceChildren();
      if (!msgs.length) list.append(el("div", "peeko-small", "Hi Mimi! Ask me anything while you run the game. ⚡"));
      for (const m of msgs) {
        const b = el("div", "peeko-msg " + (m.who === "me" ? "me" : m.who === "note" ? "note" : "bot"));
        if (m.pending) b.textContent = "Peeko is thinking…";
        else if (m.who === "peeko") b.innerHTML = fmt(m.text);
        else b.textContent = m.text;
        list.append(b);
      }
      list.scrollTop = list.scrollHeight;
    }

    async function load() {
      clearTimeout(timer);
      if (!key) { showConnect(); return; }
      try {
        const j = await call("messages");
        showConnect(); say(""); draw(j.messages);
        if (open && j.messages.some(m => m.pending)) timer = setTimeout(() => document.hidden ? (load.later = true) : load(), 3000);
      } catch (e) {
        showConnect();
        say(e.connect ? "" : "Can't reach Peeko. Is your dashboard running on this computer?");
      }
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden && load.later) { load.later = false; load(); } });

    btn.addEventListener("click", () => { open = !open; panel.hidden = !open; if (open) { load(); setTimeout(() => box.focus(), 50); } });
    close.addEventListener("click", () => { open = false; panel.hidden = true; clearTimeout(timer); });
    newBtn.addEventListener("click", async () => { try { await call("new", {}); drawn = ""; load(); } catch (e) { say(e.message); } });
    connectBtn.addEventListener("click", () => {
      const w = window.open(DASH + "/table-chat/connect", "peekoConnect", "width=520,height=430");
      if (!w) say("Your browser blocked the window. Allow pop-ups for this site, then try again.");
    });
    window.addEventListener("message", e => {
      if (e.origin !== new URL(DASH).origin || typeof e.data?.peekoKey !== "string") return;
      key = e.data.peekoKey;
      localStorage.setItem(KEYNAME, key);
      say("Connected! ⚡");
      load();
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const text = box.value.trim();
      if (!text) return;
      send.disabled = true;
      try { await call("send", { text }); box.value = ""; drawn = ""; await load(); }
      catch (err) { say(err.connect ? "Please connect again." : err.message); showConnect(); }
      finally { send.disabled = false; }
    });
    box.addEventListener("keydown", e => {
      e.stopPropagation();                                 // typing here must not trigger tabletop shortcuts
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    box.addEventListener("keyup", e => e.stopPropagation());
    showConnect();
  }

  function sync() {                                        // show only in the GM view (never for players or the test-player preview)
    if (!root) build();
    root.hidden = !gm();
  }
  const start = () => { sync(); new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
