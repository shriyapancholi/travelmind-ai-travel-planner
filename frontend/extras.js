// ============================================================
// TravelMind — extras.js
// Currency converter, packing checklist, trip notes, email
// ============================================================

// ── CURRENCY CONVERTER ───────────────────────────────────────
const RATES = {
    USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044,
    SGD: 0.016, THB: 0.43, JPY: 1.82, AUD: 0.018,
    CAD: 0.016, MYR: 0.056
};

function renderCurrencyConverter(budget, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const options = Object.entries(RATES).map(([cur, rate]) => {
        const converted = (budget * rate).toLocaleString("en-US", { maximumFractionDigits: 0 });
        const symbols = { USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SGD: "S$", THB: "฿", JPY: "¥", AUD: "A$", CAD: "C$", MYR: "RM" };
        return `<div class="currency-item"><span class="cur-code">${cur}</span><span class="cur-flag">${symbols[cur] || ""}</span><span class="cur-val">${symbols[cur] || ""}${converted}</span></div>`;
    }).join("");

    el.innerHTML = `
        <div class="section-header"><h2>💱 Budget in Other Currencies</h2><span class="section-sub">₹${Number(budget).toLocaleString("en-IN")} =</span></div>
        <div class="currency-grid">${options}</div>
        <div class="currency-note">* Approximate rates. Check live rates before travelling.</div>
    `;
}

// ── PACKING CHECKLIST (AI-generated) ─────────────────────────
async function generatePackingList(trip) {
    const btn = document.getElementById("packing-btn");
    const container = document.getElementById("packing-list");
    if (!container) return;

    if (btn) { btn.disabled = true; btn.textContent = "Generating..."; }
    container.innerHTML = `<div class="packing-loading">✨ AI is creating your personalised packing list...</div>`;

    try {
        const res = await fetch(`${API_BASE}/chat/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    content: `Generate a detailed packing checklist for this trip:
- Destination: ${trip.destination}
- Duration: ${trip.days} days
- Trip Type: ${trip.trip_type || "leisure"}
- Dates: ${trip.departure_date} to ${trip.return_date}

Return ONLY a JSON object like this:
{
  "categories": [
    { "name": "Documents", "emoji": "📄", "items": ["Passport", "Visa", "Travel Insurance"] },
    { "name": "Clothing", "emoji": "👕", "items": ["T-shirts x${trip.days}", "Comfortable shoes"] },
    { "name": "Toiletries", "emoji": "🪥", "items": ["Toothbrush", "Sunscreen SPF 50"] },
    { "name": "Electronics", "emoji": "📱", "items": ["Phone charger", "Power bank"] },
    { "name": "Health & Safety", "emoji": "💊", "items": ["Basic medicines", "Hand sanitizer"] },
    { "name": "Destination Specific", "emoji": "🌍", "items": ["specific items for ${trip.destination}"] }
  ]
}`
                }],
                trip_context: trip
            })
        });

        const data = await res.json();
        let parsed;
        try {
            const cleaned = (data.reply || "{}").replace(/```json|```/g, "").trim();
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = null;
        }

        if (parsed && parsed.categories) {
            // Store checked state
            window._packingChecked = window._packingChecked || {};

            container.innerHTML = `
                <div class="packing-header">
                    <span class="packing-progress" id="packing-progress">0 / ${parsed.categories.reduce((s, c) => s + c.items.length, 0)} packed</span>
                    <button class="packing-reset" onclick="resetPacking()">Reset</button>
                </div>
                ${parsed.categories.map(cat => `
                    <div class="packing-category">
                        <div class="packing-cat-title">${cat.emoji} ${esc(cat.name)}</div>
                        <div class="packing-items">
                            ${cat.items.map((item, i) => {
                const key = `${cat.name}-${i}`;
                return `<label class="packing-item">
                                    <input type="checkbox" onchange="updatePackingProgress()" data-key="${key}" ${window._packingChecked[key] ? "checked" : ""}>
                                    <span>${esc(item)}</span>
                                </label>`;
            }).join("")}
                        </div>
                    </div>
                `).join("")}
            `;
            updatePackingProgress();
        } else {
            container.innerHTML = "<p class='empty-note'>Could not generate packing list. Try again.</p>";
        }
    } catch (e) {
        container.innerHTML = "<p class='empty-note'>Error generating list. Check connection.</p>";
    }

    if (btn) { btn.disabled = false; btn.textContent = "🎒 Regenerate List"; }
}

function updatePackingProgress() {
    const checkboxes = document.querySelectorAll(".packing-item input[type=checkbox]");
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(c => c.checked).length;
    const el = document.getElementById("packing-progress");
    if (el) el.textContent = `${checked} / ${total} packed`;
    // Save state
    checkboxes.forEach(c => { window._packingChecked = window._packingChecked || {}; window._packingChecked[c.dataset.key] = c.checked; });
}

function resetPacking() {
    window._packingChecked = {};
    document.querySelectorAll(".packing-item input[type=checkbox]").forEach(c => c.checked = false);
    updatePackingProgress();
}

// ── TRIP NOTES (multi-note system) ──────────────────────────
function renderTripNotes(trip) {
    const el = document.getElementById('trip-notes');
    if (!el) return;
    window._notesKey = 'notes_' + trip.destination + '_' + trip.departure_date;
    _displayNotes();
}

function _getNotes() {
    try { return JSON.parse(localStorage.getItem(window._notesKey) || '[]'); }
    catch { return []; }
}

function _saveNotes(notes) {
    localStorage.setItem(window._notesKey, JSON.stringify(notes));
}

function _displayNotes() {
    const el = document.getElementById('trip-notes');
    if (!el) return;
    const notes = _getNotes();
    el.innerHTML = `
        <div class="section-header"><h2>📝 Trip Notes</h2><span class="section-sub">${notes.length} note${notes.length !== 1 ? 's' : ''} saved</span></div>
        <div class="notes-input-row">
            <textarea id="notes-new-input" class="trip-notes-area" placeholder="Write a note — places to visit, things to pack, recommendations... (Enter to save)" rows="3"></textarea>
            <button class="btn-notes-add" onclick="addTripNote()">+ Add Note</button>
        </div>
        <div id="notes-list">
            ${notes.length === 0
            ? "<p class='empty-note' style='margin-top:12px;'>No notes yet. Add your first note above!</p>"
            : notes.slice().reverse().map((n, i) => {
                const realIdx = notes.length - 1 - i;
                return '<div class="note-item"><div class="note-meta"><span class="note-time">' + n.time + '</span><button class="note-delete" onclick="deleteTripNote(' + realIdx + ')">🗑 Delete</button></div><div class="note-text">' + esc(n.text) + '</div></div>';
            }).join('')
        }
        </div>
    `;
    const ta = document.getElementById('notes-new-input');
    if (ta) ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTripNote(); } });
}

function addTripNote() {
    const ta = document.getElementById('notes-new-input');
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) return;
    const notes = _getNotes();
    notes.push({ text, time: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });
    _saveNotes(notes);
    ta.value = '';
    _displayNotes();
}

function deleteTripNote(idx) {
    if (!confirm('Delete this note?')) return;
    const notes = _getNotes();
    notes.splice(idx, 1);
    _saveNotes(notes);
    _displayNotes();
}

// ── EMAIL ITINERARY (EmailJS) ─────────────────────────────────
function renderEmailSection(trip) {
    const el = document.getElementById("email-section");
    if (!el) return;
    el.innerHTML = `
        <div class="section-header"><h2>📧 Email Itinerary</h2><span class="section-sub">Send to yourself or share</span></div>
        <div class="email-row">
            <input type="email" id="email-recipient" placeholder="Enter email address" style="flex:1;">
            <button class="btn-primary" onclick="sendItineraryEmail('${esc(trip.destination)}', '${esc(trip.departure_date)}', '${esc(trip.return_date)}', ${trip.days}, ${trip.budget})">📤 Send</button>
        </div>
        <div id="email-status" class="inline-msg" style="display:none; margin-top:8px;"></div>
        <p style="font-size:11px;color:var(--muted);margin-top:8px;">Sends a summary of your trip plan to the provided email address.</p>
    `;
}

async function sendItineraryEmail(destination, dep, ret, days, budget) {
    const email = document.getElementById("email-recipient")?.value?.trim();
    const statusEl = document.getElementById("email-status");

    if (!email || !email.includes("@")) {
        if (statusEl) { statusEl.textContent = "Please enter a valid email."; statusEl.className = "inline-msg error"; statusEl.style.display = "block"; }
        return;
    }

    const trip = JSON.parse(localStorage.getItem("latestTrip") || "null");
    if (!trip) return;

    // Build email body
    const itinText = (trip.itinerary || []).slice(0, 5).map(d =>
        typeof d === "string" ? d : `Day ${d.day}: ${d.morning} | ${d.afternoon} | ${d.evening}`
    ).join("\n");

    const hotels = (trip.hotels || []).map(h => `${h.name} (${h.stars}★) - ₹${h.price_per_night}/night`).join("\n");
    const tips = (trip.tips || []).join("\n");

    const body = `
TravelMind — Your Trip to ${destination}
==========================================
📍 From: ${trip.origin} → ${destination}
📅 Dates: ${dep} to ${ret} (${days} days)
💰 Budget: ₹${Number(budget).toLocaleString("en-IN")}

🏨 HOTEL OPTIONS
${hotels}

📅 ITINERARY HIGHLIGHTS
${itinText}

💡 TRAVEL TIPS
${tips}

🆘 EMERGENCY CONTACTS
Police: 100 | Ambulance: 108 | Tourist Helpline: 1800-11-1363

Generated by TravelMind AI ✈️
    `.trim();

    // Use mailto as fallback (works without backend)
    const subject = encodeURIComponent(`TravelMind: Your ${days}-day trip to ${destination}`);
    const bodyEnc = encodeURIComponent(body);
    window.open(`mailto:${email}?subject=${subject}&body=${bodyEnc}`);

    if (statusEl) {
        statusEl.textContent = "✅ Opening your email client with the itinerary!";
        statusEl.className = "inline-msg success";
        statusEl.style.display = "block";
    }
}

// ── TRIP STATUS TAG ───────────────────────────────────────────
function getTripStatus(departure_date, return_date) {
    const now = new Date();
    const dep = new Date(departure_date);
    const ret = new Date(return_date);
    const diff = Math.ceil((dep - now) / 86400000);

    if (now > ret) return { label: "Completed", cls: "status-past", emoji: "✅" };
    if (now >= dep) return { label: "Ongoing", cls: "status-ongoing", emoji: "✈️" };
    if (diff <= 7) return { label: `In ${diff}d`, cls: "status-soon", emoji: "🔥" };
    if (diff <= 30) return { label: "Upcoming", cls: "status-upcoming", emoji: "📅" };
    return { label: "Planning", cls: "status-planning", emoji: "📋" };
}