// ============================================================
// TravelMind AI Chat Widget
// ============================================================
(function () {
    const API_BASE = "http://127.0.0.1:5001/api";
    let chatHistory = [];
    let isOpen = false;
    let isTyping = false;

    function getToken() { return localStorage.getItem("token"); }

    function getTripContext() {
        try {
            const t = JSON.parse(localStorage.getItem("latestTrip") || "null");
            if (!t) return null;
            return { destination: t.destination, origin: t.origin, departure_date: t.departure_date, return_date: t.return_date, days: t.days, budget: t.budget, trip_type: t.trip_type };
        } catch { return null; }
    }

    function escHtml(s) {
        const d = document.createElement("div");
        d.textContent = s == null ? "" : String(s);
        return d.innerHTML;
    }

    function formatMsg(text) {
        return escHtml(text)
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br>");
    }

    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            #tm-chat-btn {
                position: fixed; bottom: 28px; right: 28px; z-index: 9999;
                width: 56px; height: 56px; border-radius: 50%;
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(37,99,235,.45);
                display: flex; align-items: center; justify-content: center;
                font-size: 22px; transition: all .2s; color: white;
            }
            #tm-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(37,99,235,.55); }
            #tm-chat-btn .tm-notif {
                position: absolute; top: -2px; right: -2px; width: 14px; height: 14px;
                background: #4ade80; border-radius: 50%; border: 2px solid #080e1a;
                animation: tm-pulse 2s infinite;
            }
            @keyframes tm-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.2);opacity:.8} }

            #tm-chat-panel {
                position: fixed; bottom: 96px; right: 28px; z-index: 9998;
                width: 360px; height: 520px;
                background: #0c1525; border: 1px solid rgba(255,255,255,.1);
                border-radius: 18px; display: flex; flex-direction: column;
                box-shadow: 0 20px 60px rgba(0,0,0,.6);
                transform: scale(0.95) translateY(10px); opacity: 0;
                transition: all .25s cubic-bezier(.34,1.56,.64,1);
                pointer-events: none; overflow: hidden;
            }
            #tm-chat-panel.open {
                transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
            }
            .tm-chat-header {
                padding: 14px 16px; background: linear-gradient(135deg,#1e3a5f,#0f2240);
                border-bottom: 1px solid rgba(255,255,255,.08);
                display: flex; align-items: center; gap: 10px;
            }
            .tm-chat-avatar {
                width: 34px; height: 34px; border-radius: 50%;
                background: linear-gradient(135deg,#2563eb,#60a5fa);
                display: flex; align-items: center; justify-content: center;
                font-size: 16px; flex-shrink: 0;
            }
            .tm-chat-title { font-size: 14px; font-weight: 600; color: #fff; }
            .tm-chat-sub { font-size: 11px; color: rgba(255,255,255,.5); margin-top: 1px; }
            .tm-chat-close {
                margin-left: auto; background: none; border: none; color: rgba(255,255,255,.5);
                cursor: pointer; font-size: 18px; padding: 2px 6px; border-radius: 6px;
                transition: .15s;
            }
            .tm-chat-close:hover { color: #fff; background: rgba(255,255,255,.1); }

            .tm-chat-messages {
                flex: 1; overflow-y: auto; padding: 14px; display: flex;
                flex-direction: column; gap: 10px;
            }
            .tm-chat-messages::-webkit-scrollbar { width: 3px; }
            .tm-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

            .tm-msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
            .tm-msg.user { flex-direction: row-reverse; }
            .tm-msg-bubble {
                max-width: 78%; padding: 9px 13px; border-radius: 14px;
                font-size: 13px; line-height: 1.5; color: #e2e8f0;
            }
            .tm-msg.bot  .tm-msg-bubble { background: rgba(255,255,255,.07); border-bottom-left-radius: 4px; }
            .tm-msg.user .tm-msg-bubble { background: linear-gradient(135deg,#2563eb,#1d4ed8); color: #fff; border-bottom-right-radius: 4px; }
            .tm-msg-icon { font-size: 18px; flex-shrink: 0; margin-bottom: 2px; }

            .tm-typing { display: flex; gap: 4px; align-items: center; padding: 10px 13px; }
            .tm-typing span {
                width: 7px; height: 7px; background: rgba(255,255,255,.4);
                border-radius: 50%; animation: tm-bounce 1.2s infinite;
            }
            .tm-typing span:nth-child(2) { animation-delay: .2s; }
            .tm-typing span:nth-child(3) { animation-delay: .4s; }
            @keyframes tm-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

            .tm-quick-btns {
                padding: 8px 14px; display: flex; gap: 6px; flex-wrap: wrap;
                border-top: 1px solid rgba(255,255,255,.06);
            }
            .tm-quick-btn {
                font-size: 11px; padding: 5px 10px; border-radius: 20px;
                background: rgba(37,99,235,.2); border: 1px solid rgba(37,99,235,.35);
                color: #93c5fd; cursor: pointer; transition: .15s; white-space: nowrap;
            }
            .tm-quick-btn:hover { background: rgba(37,99,235,.35); }

            .tm-chat-input-row {
                display: flex; gap: 8px; padding: 12px 14px;
                border-top: 1px solid rgba(255,255,255,.08);
                background: rgba(0,0,0,.2);
            }
            #tm-chat-input {
                flex: 1; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12);
                border-radius: 10px; padding: 9px 12px; color: #e2e8f0;
                font-size: 13px; font-family: inherit; outline: none; resize: none;
                max-height: 80px; transition: border .15s;
            }
            #tm-chat-input:focus { border-color: #2563eb; }
            #tm-chat-input::placeholder { color: rgba(255,255,255,.3); }
            #tm-send-btn {
                width: 36px; height: 36px; border-radius: 10px; border: none;
                background: linear-gradient(135deg,#2563eb,#1d4ed8);
                color: #fff; cursor: pointer; font-size: 16px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0; align-self: flex-end; transition: .15s;
            }
            #tm-send-btn:hover { opacity: .85; }
            #tm-send-btn:disabled { opacity: .4; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    }

    function injectHTML() {
        const btn = document.createElement("div");
        btn.id = "tm-chat-btn";
        btn.innerHTML = `✈<div class="tm-notif"></div>`;
        btn.onclick = toggleChat;
        document.body.appendChild(btn);

        const panel = document.createElement("div");
        panel.id = "tm-chat-panel";
        panel.innerHTML = `
            <div class="tm-chat-header">
                <div class="tm-chat-avatar">✈</div>
                <div>
                    <div class="tm-chat-title">TravelMind AI</div>
                    <div class="tm-chat-sub">Your personal travel expert</div>
                </div>
                <button class="tm-chat-close" onclick="window._tmChat.close()">✕</button>
            </div>
            <div class="tm-chat-messages" id="tm-messages">
                <div class="tm-msg bot">
                    <span class="tm-msg-icon">🤖</span>
                    <div class="tm-msg-bubble">
                        Hi! I'm your TravelMind AI assistant. 👋<br><br>
                        Ask me anything about travel — destinations, budgets, visas, packing tips, or advice about your current trip!
                    </div>
                </div>
            </div>
            <div class="tm-quick-btns" id="tm-quick-btns">
                <button class="tm-quick-btn" onclick="window._tmChat.quick('Best time to visit Goa?')">🏖 Best time for Goa</button>
                <button class="tm-quick-btn" onclick="window._tmChat.quick('Budget for Dubai trip from India?')">💰 Dubai budget</button>
                <button class="tm-quick-btn" onclick="window._tmChat.quick('What documents do I need for international travel?')">📄 Travel docs</button>
                <button class="tm-quick-btn" onclick="window._tmChat.quick('Give me packing tips for a beach trip')">🎒 Packing tips</button>
            </div>
            <div class="tm-chat-input-row">
                <textarea id="tm-chat-input" placeholder="Ask anything about travel..." rows="1"></textarea>
                <button id="tm-send-btn" onclick="window._tmChat.send()">➤</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Enter to send, Shift+Enter for newline
        document.getElementById("tm-chat-input").addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                window._tmChat.send();
            }
        });

        // Auto-resize textarea
        document.getElementById("tm-chat-input").addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 80) + "px";
        });
    }

    function toggleChat() {
        isOpen = !isOpen;
        const panel = document.getElementById("tm-chat-panel");
        const btn = document.getElementById("tm-chat-btn");
        if (isOpen) {
            panel.classList.add("open");
            btn.innerHTML = `✕`;
            setTimeout(() => document.getElementById("tm-chat-input")?.focus(), 300);
            // Hide quick buttons after first open if there are messages
            if (chatHistory.length > 0) {
                const qb = document.getElementById("tm-quick-btns");
                if (qb) qb.style.display = "none";
            }
        } else {
            panel.classList.remove("open");
            btn.innerHTML = `✈<div class="tm-notif"></div>`;
        }
    }

    function addMessage(role, text) {
        const container = document.getElementById("tm-messages");
        const div = document.createElement("div");
        div.className = `tm-msg ${role}`;
        div.innerHTML = role === "bot"
            ? `<span class="tm-msg-icon">🤖</span><div class="tm-msg-bubble">${formatMsg(text)}</div>`
            : `<div class="tm-msg-bubble">${formatMsg(text)}</div><span class="tm-msg-icon">👤</span>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    function showTyping() {
        const container = document.getElementById("tm-messages");
        const div = document.createElement("div");
        div.className = "tm-msg bot";
        div.id = "tm-typing-indicator";
        div.innerHTML = `<span class="tm-msg-icon">🤖</span><div class="tm-msg-bubble tm-typing"><span></span><span></span><span></span></div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        document.getElementById("tm-typing-indicator")?.remove();
    }

    async function sendMessage(text) {
        if (!text.trim() || isTyping) return;

        // Hide quick buttons
        const qb = document.getElementById("tm-quick-btns");
        if (qb) qb.style.display = "none";

        // Add to history and UI
        chatHistory.push({ role: "user", content: text });
        addMessage("user", text);

        isTyping = true;
        document.getElementById("tm-send-btn").disabled = true;
        showTyping();

        try {
            const res = await fetch(`${API_BASE}/chat/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    messages: chatHistory,
                    trip_context: getTripContext()
                })
            });

            const data = await res.json();
            hideTyping();

            const reply = data.reply || "Sorry, I couldn't process that. Please try again.";
            chatHistory.push({ role: "assistant", content: reply });
            addMessage("bot", reply);

        } catch (err) {
            hideTyping();
            addMessage("bot", "⚠️ Connection error. Make sure the backend is running.");
        }

        isTyping = false;
        document.getElementById("tm-send-btn").disabled = false;
        document.getElementById("tm-chat-input").focus();
    }

    // Public API
    window._tmChat = {
        send: function () {
            const input = document.getElementById("tm-chat-input");
            const text = input.value.trim();
            if (!text) return;
            input.value = "";
            input.style.height = "auto";
            sendMessage(text);
        },
        quick: function (text) {
            sendMessage(text);
        },
        close: function () {
            if (isOpen) toggleChat();
        }
    };

    // Init
    function init() {
        injectStyles();
        injectHTML();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();