// ============================================================
// TravelMind — script.js  (v2.0 final)
// ============================================================
const API_BASE = "http://127.0.0.1:5001/api";

// ───── SECURITY ──────────────────────────────────────────────
function esc(s) {
    const d = document.createElement("div");
    d.textContent = (s == null) ? "" : String(s);
    return d.innerHTML;
}

// ───── AUTH HELPERS ───────────────────────────────────────────
const getToken = () => localStorage.getItem("token");
const getName = () => localStorage.getItem("userName") || "Traveller";
const authHdr = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });
const isLoggedIn = () => !!getToken();

function requireAuth() {
    if (!getToken()) { window.location.href = "login.html"; return false; }
    return true;
}

// ───── NAVIGATION ─────────────────────────────────────────────
function go(page) { window.location.href = page; }

// ───── INLINE MESSAGES ────────────────────────────────────────
function showMsg(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `inline-msg ${type}`;
    el.style.display = "block";
}
const showError = (id, m) => showMsg(id, m, "error");
const showSuccess = (id, m) => showMsg(id, m, "success");
function clearMsg(id) {
    const e = document.getElementById(id);
    if (e) { e.textContent = ""; e.style.display = "none"; }
}

// ───── IMAGES ─────────────────────────────────────────────────
function destImage(dest) {
    const seed = encodeURIComponent((dest || "travel").toLowerCase().replace(/\s+/g, "-"));
    return `https://picsum.photos/seed/${seed}/600/400`;
}

// ───── FORMAT HELPERS ─────────────────────────────────────────
function fmtINR(n) { return Number(n || 0).toLocaleString("en-IN"); }
function fmtDate(d) {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
}

// ───── INIT ───────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    _setupNavLogin();
    _setupDates();
    _fillDestFromExplore();

    // Page-specific
    if (document.getElementById("tripHero")) { requireAuth() && loadDetailsPage(); }
    if (document.getElementById("tripsContainer")) { requireAuth() && loadTripsPage(); }
});

function _setupNavLogin() {
    const el = document.getElementById("nav-login");
    if (!el) return;
    if (isLoggedIn()) {
        el.innerHTML = `<span>👤</span> <span>${esc(getName())}</span>`;
        el.title = "Click to logout";
        el.onclick = () => {
            if (confirm("Log out of TravelMind?")) {
                localStorage.clear();
                go("login.html");
            }
        };
    } else {
        el.innerHTML = `<span>🔐</span> <span>Login</span>`;
        el.onclick = () => go("login.html");
    }
}

function _setupDates() {
    const today = new Date().toISOString().split("T")[0];
    const depEl = document.getElementById("departure_date");
    const retEl = document.getElementById("return_date");
    if (depEl) {
        depEl.min = today;
        depEl.addEventListener("change", () => {
            if (retEl) {
                retEl.min = depEl.value;
                if (retEl.value && retEl.value < depEl.value) retEl.value = "";
            }
            _syncDays();
        });
    }
    if (retEl) {
        retEl.min = today;
        retEl.addEventListener("change", _syncDays);
    }
}

function _syncDays() {
    const d = document.getElementById("departure_date")?.value;
    const r = document.getElementById("return_date")?.value;
    const el = document.getElementById("days");
    if (d && r && el) {
        const diff = Math.round((new Date(r) - new Date(d)) / 86400000);
        if (diff > 0) el.value = diff;
    }
}

function _fillDestFromExplore() {
    const sel = localStorage.getItem("selectedDestination");
    if (sel && document.getElementById("destination")) {
        document.getElementById("destination").value = sel;
        localStorage.removeItem("selectedDestination");
    }
}

// ───── QUICK DEST FILL ────────────────────────────────────────
function fillDest(name) {
    const el = document.getElementById("destination");
    if (el) { el.value = name; el.focus(); }
}

function selectDestination(place) {
    localStorage.setItem("selectedDestination", place);
    go("index.html");
}

// ───── GENERATE TRIP ──────────────────────────────────────────
async function generateTrip() {
    if (!requireAuth()) return;

    const destination = document.getElementById("destination")?.value?.trim() || "";
    const origin = document.getElementById("origin")?.value?.trim() || "Delhi";
    const budget = parseInt(document.getElementById("budget")?.value || 0);
    const days = parseInt(document.getElementById("days")?.value || 0);
    const departure_date = document.getElementById("departure_date")?.value || "";
    const return_date = document.getElementById("return_date")?.value || "";
    const travelers = parseInt(document.getElementById("travelers")?.value || 1);
    const trip_type = document.getElementById("trip_type")?.value || "leisure";

    clearMsg("form-error");

    if (!destination) return showError("form-error", "Please enter a destination city.");
    if (!origin) return showError("form-error", "Please enter your departure city.");
    if (budget < 500) return showError("form-error", "Budget must be at least ₹500.");
    if (days < 1) return showError("form-error", "Trip must be at least 1 day.");
    if (!departure_date) return showError("form-error", "Please select a departure date.");
    if (!return_date) return showError("form-error", "Please select a return date.");
    if (new Date(return_date) <= new Date(departure_date))
        return showError("form-error", "Return date must be after departure date.");

    const btn = document.getElementById("generateBtn");
    const setBtnState = (loading) => {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? "✨ Generating your trip... (15-30 sec)" : "✨ Generate My Trip Plan";
    };
    setBtnState(true);

    try {
        const res = await fetch(`${API_BASE}/generate/`, {
            method: "POST",
            headers: authHdr(),
            body: JSON.stringify({ destination, origin, budget, days, departure_date, return_date, travelers, trip_type }),
        });

        if (res.status === 401) { localStorage.removeItem("token"); go("login.html"); return; }

        const json = await res.json();
        if (!json.data) throw new Error(json.error || "Unexpected server response.");

        localStorage.setItem("latestTrip", JSON.stringify(json.data));
        go("details.html");

    } catch (err) {
        showError("form-error", err.message || "Failed to generate. Please try again.");
        setBtnState(false);
    }
}

// ───── SAVE TRIP (explicit, deduplication) ────────────────────
async function saveCurrentTrip() {
    if (!requireAuth()) return;
    const trip = JSON.parse(localStorage.getItem("latestTrip") || "null");
    if (!trip) return;

    const btn = document.getElementById("saveBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

    try {
        const res = await fetch(`${API_BASE}/trips/save`, {
            method: "POST",
            headers: authHdr(),
            body: JSON.stringify(trip),
        });
        const data = await res.json();
        if (res.ok) showSuccess("save-msg", "✅ Trip saved to My Trips!");
        else showError("save-msg", data.error || "Save failed.");
    } catch {
        showError("save-msg", "Network error. Try again.");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "💾 Save Trip"; }
    }
}

// ───── SHARE TRIP ─────────────────────────────────────────────
function shareTrip() {
    const trip = JSON.parse(localStorage.getItem("latestTrip") || "null");
    if (!trip) return;
    const text = `🌍 Check out my ${trip.days}-day trip to ${trip.destination}!\n🛫 ${trip.departure_date} → ${trip.return_date}\n💰 Budget: ₹${fmtINR(trip.budget)}\nGenerated by TravelMind ✈️`;
    if (navigator.share) {
        navigator.share({ title: `Trip to ${trip.destination}`, text });
    } else {
        navigator.clipboard.writeText(text).then(() => showSuccess("save-msg", "📋 Trip details copied to clipboard!"));
    }
}

// ───── DETAILS PAGE ───────────────────────────────────────────
function loadDetailsPage() {
    if (!requireAuth()) return;
    const trip = JSON.parse(localStorage.getItem("latestTrip") || "null");

    if (!trip) {
        document.getElementById("tripHero").innerHTML =
            `<div class="empty-state"><h2>No trip found</h2><p><a href="index.html">Plan a new trip →</a></p></div>`;
        return;
    }

    _renderHero(trip);
    _renderStatsBar(trip);
    _renderFlights(trip);
    _renderReturnFlights(trip);
    _renderHotels(trip);
    _renderBudget(trip);
    _renderWeather(trip);
    _renderTransport(trip);
    _renderItinerary(trip);
    _renderTips(trip);
    _renderEmergency(trip);
    _renderRecommendation(trip);

    // ── NEW FEATURES ──
    // Live weather
    if (typeof fetchLiveWeather !== 'undefined') {
        fetchLiveWeather(trip.destination).then(w => {
            renderLiveWeather(w, 'weather');
        });
    }

    // Currency converter
    if (typeof renderCurrencyConverter !== 'undefined') {
        renderCurrencyConverter(trip.budget, 'currency');
    }

    // Packing checklist section
    const packEl = document.getElementById('packing-section');
    if (packEl) {
        packEl.innerHTML = `
            <div class='section-header'><h2>🎒 Packing Checklist</h2><span class='section-sub'>AI-generated for ${esc(trip.destination)}</span></div>
            <button id='packing-btn' class='btn-primary' onclick='generatePackingList(JSON.parse(localStorage.getItem("latestTrip")))' style='margin-bottom:14px;'>✨ Generate Packing List</button>
            <div id='packing-list'><p class='empty-note'>Click above to generate your personalised packing list</p></div>
        `;
    }

    // Trip notes
    if (typeof renderTripNotes !== 'undefined') renderTripNotes(trip);

    // Email section
    if (typeof renderEmailSection !== 'undefined') renderEmailSection(trip);
}


// ── Hero ──────────────────────────────────────────────────────
function _renderHero(trip) {
    const el = document.getElementById("tripHero");
    if (!el) return;
    const typeLabel = (trip.trip_type || "leisure").charAt(0).toUpperCase() + (trip.trip_type || "leisure").slice(1);
    el.innerHTML = `
        <div class="hero-img-wrap">
            <img src="${destImage(trip.destination)}" alt="${esc(trip.destination)}"
                 onerror="this.src='https://picsum.photos/seed/travel/600/400'">
            <div class="hero-overlay"></div>
        </div>
        <div class="hero-content">
            <div class="hero-tags">
                <span class="hero-tag">${esc(typeLabel)}</span>
                ${trip.travelers > 1 ? `<span class="hero-tag">${esc(trip.travelers)} Travelers</span>` : ""}
            </div>
            <h1 class="hero-dest">${esc(trip.destination)}</h1>
            <p class="hero-sub">From <strong>${esc(trip.origin || "India")}</strong></p>
            <div class="hero-dates">
                <span class="hero-date-item">
                    <span class="hd-label">Departure</span>
                    <span class="hd-val">${esc(fmtDate(trip.departure_date))}</span>
                </span>
                <span class="hd-arrow">✈</span>
                <span class="hero-date-item">
                    <span class="hd-label">Return</span>
                    <span class="hd-val">${esc(fmtDate(trip.return_date))}</span>
                </span>
                <span class="hero-date-item">
                    <span class="hd-label">Duration</span>
                    <span class="hd-val">${esc(trip.days)} Nights</span>
                </span>
            </div>
        </div>`;
}

// ── Stats Bar ─────────────────────────────────────────────────
function _calcEstimate(trip) {
    const bs = trip.budget_split || {};
    const total = trip.budget || 1;
    const hotels = trip.hotels || [];
    const flights = trip.flights || [];
    const retFlights = trip.return_flights || [];
    const cheapestHotel = hotels.length ? Math.min(...hotels.map(h => Number(h.total_price) || 0).filter(v => v > 0)) : 0;
    const cheapestOut = flights.length ? Math.min(...flights.map(f => Number(f.price) || 0).filter(v => v > 0)) : 0;
    const cheapestRet = retFlights.length ? Math.min(...retFlights.map(f => Number(f.price) || 0).filter(v => v > 0)) : 0;
    const flightVal = (cheapestOut + cheapestRet) || bs.flights || Math.round(total * 0.30);
    const hotelVal = cheapestHotel || bs.hotels || Math.round(total * 0.40);
    const foodVal = bs.food_and_local || Math.round(total * 0.20);
    const miscVal = bs.miscellaneous || Math.round(total * 0.10);
    return flightVal + hotelVal + foodVal + miscVal;
}

function _renderStatsBar(trip) {
    const el = document.getElementById("statsBar");
    if (!el) return;
    const estimated = _calcEstimate(trip);
    const savings = (trip.budget || 0) - estimated;
    const pctUsed = trip.budget ? Math.round(estimated / trip.budget * 100) : 0;

    el.innerHTML = [
        { label: "Your Budget", val: `₹${fmtINR(trip.budget)}`, cls: "" },
        { label: "Estimated Cost", val: `₹${fmtINR(estimated)}`, cls: estimated > trip.budget ? "sp-over" : "sp-ok" },
        { label: "Savings / Buffer", val: `₹${fmtINR(Math.abs(savings))}`, cls: savings >= 0 ? "sp-ok" : "sp-over" },
        { label: "Budget Used", val: `${pctUsed}%`, cls: pctUsed > 100 ? "sp-over" : "" },
        { label: "Hotels Listed", val: (trip.hotels || []).length, cls: "" },
        { label: "Flights Listed", val: (trip.flights || []).length + (trip.return_flights || []).length, cls: "" },
    ].map(s => `
        <div class="stat-pill">
            <div class="sp-label">${s.label}</div>
            <div class="sp-val ${s.cls}">${s.val}</div>
        </div>`).join("");
}

// ── Flight helper ─────────────────────────────────────────────
function _flightCard(f) {
    const depTime = (f.departure_time || "").split(" ")[1] || f.departure_time || "-";
    const arrTime = (f.arrival_time || "").split(" ")[1] || f.arrival_time || "-";
    const depDate = (f.departure_time || "").split(" ")[0] || "";
    const cls = f.class === "Business" ? "cls-biz" : f.class === "Premium Economy" ? "cls-prem" : "cls-eco";
    return `
    <div class="flight-card">
        <div class="fc-left">
            <div class="fc-airline">${esc(f.airline)}</div>
            <div class="fc-num">${esc(f.flight_number || "")}</div>
        </div>
        <div class="fc-center">
            <div class="fc-timeblock">
                <div class="fc-time">${esc(depTime)}</div>
                ${depDate ? `<div class="fc-date">${esc(depDate)}</div>` : ""}
            </div>
            <div class="fc-route-line">
                <div class="fc-dot"></div>
                <div class="fc-dash">
                    <span class="fc-stops-lbl">${esc(f.stops || "Non-stop")}</span>
                </div>
                <div class="fc-dot"></div>
            </div>
            <div class="fc-timeblock fc-timeblock-right">
                <div class="fc-time">${esc(arrTime)}</div>
                ${f.duration ? `<div class="fc-date">${esc(f.duration)}</div>` : ""}
            </div>
        </div>
        <div class="fc-right">
            <div class="fc-cls ${cls}">${esc(f.class || "Economy")}</div>
            <div class="fc-price">₹${fmtINR(f.price)}</div>
        </div>
    </div>`;
}

function _renderFlights(trip) {
    const el = document.getElementById("flights");
    if (!el) return;
    const flights = trip.flights || [];
    el.innerHTML = `
        <div class="section-header">
            <h2>✈️ Outbound Flights</h2>
            <span class="section-sub">${esc(trip.origin)} → ${esc(trip.destination)}</span>
        </div>
        <div class="flights-note">Prices are per person, one-way. Select your preferred option.</div>
        ${flights.length ? flights.map(_flightCard).join("") : "<p class='empty-note'>No outbound flight data.</p>"}`;
}

function _renderReturnFlights(trip) {
    const el = document.getElementById("return_flights");
    if (!el) return;
    const rf = trip.return_flights || [];
    el.innerHTML = `
        <div class="section-header">
            <h2>🔄 Return Flights</h2>
            <span class="section-sub">${esc(trip.destination)} → ${esc(trip.origin)}</span>
        </div>
        ${rf.length ? rf.map(_flightCard).join("") : "<p class='empty-note'>No return flight data.</p>"}`;
}

// ── Hotels ────────────────────────────────────────────────────
function _renderHotels(trip) {
    const el = document.getElementById("hotels");
    if (!el) return;
    const hotels = trip.hotels || [];
    const tagCls = { "Budget Pick": "tag-budget", "Most Popular": "tag-popular", "Luxury": "tag-luxury" };

    el.innerHTML = `
        <div class="section-header">
            <h2>🏨 Hotel Options</h2>
            <span class="section-sub">${hotels.length} options · ${esc(trip.days)} nights</span>
        </div>
        ${hotels.map((h, i) => {
        const filled = "★".repeat(h.stars || 3);
        const empty = "☆".repeat(5 - (h.stars || 3));
        const tc = tagCls[h.tag] || "tag-budget";
        return `
            <div class="hotel-card ${i === 1 ? "hotel-featured" : ""}">
                <div class="hotel-top">
                    <div>
                        <div class="hotel-name">${esc(h.name)}</div>
                        <div class="hotel-area">📍 ${esc(h.area)}</div>
                    </div>
                    ${h.tag ? `<span class="hotel-tag ${tc}">${esc(h.tag)}</span>` : ""}
                </div>
                <div class="hotel-stars">${filled}${empty}
                    ${h.rating ? `<span class="hotel-rating">&nbsp;${esc(h.rating)}/5</span>` : ""}
                </div>
                <div class="hotel-amenities">
                    ${(h.amenities || []).map(a => `<span class="pill">${esc(a)}</span>`).join("")}
                </div>
                ${h.reason ? `<div class="hotel-reason">"${esc(h.reason)}"</div>` : ""}
                <div class="hotel-price-row">
                    <span class="hotel-ppn">₹${fmtINR(h.price_per_night)}<small>/night</small></span>
                    <span class="hotel-total">₹${fmtINR(h.total_price)} total</span>
                </div>
            </div>`;
    }).join("") || "<p class='empty-note'>No hotel data.</p>"}`;
}

// ── Budget ────────────────────────────────────────────────────
function _renderBudget(trip) {
    const el = document.getElementById("budget");
    if (!el) return;
    const bs = trip.budget_split || {};
    const total = trip.budget || 1;

    // Use cheapest hotel total_price (budget pick)
    const hotels = trip.hotels || [];
    const cheapestHotel = hotels.length
        ? Math.min(...hotels.map(h => Number(h.total_price) || 0).filter(v => v > 0))
        : 0;

    // Cheapest outbound + return flight
    const flights = trip.flights || [];
    const retFlights = trip.return_flights || [];
    const cheapestOut = flights.length ? Math.min(...flights.map(f => Number(f.price) || 0).filter(v => v > 0)) : 0;
    const cheapestRet = retFlights.length ? Math.min(...retFlights.map(f => Number(f.price) || 0).filter(v => v > 0)) : 0;

    const flightVal = (cheapestOut + cheapestRet) || bs.flights || Math.round(total * 0.30);
    const hotelVal = cheapestHotel || bs.hotels || Math.round(total * 0.40);
    const foodVal = bs.food_and_local || Math.round(total * 0.20);
    const miscVal = bs.miscellaneous || Math.round(total * 0.10);

    const items = [
        { icon: "✈️", label: "Flights (cheapest option)", val: flightVal },
        { icon: "🏨", label: "Hotels (budget pick total)", val: hotelVal },
        { icon: "🍜", label: "Food & Local", val: foodVal },
        { icon: "🎒", label: "Miscellaneous", val: miscVal },
    ];
    const estimated = items.reduce((s, i) => s + i.val, 0);

    el.innerHTML = `
        <div class="section-header"><h2>💰 Budget Breakdown</h2></div>
        ${items.map(b => `
            <div class="budget-row">
                <span class="budget-label">${b.icon} ${b.label}</span>
                <div class="bbar-wrap">
                    <div class="bbar-fill" style="width:${Math.min(100, Math.round(b.val / total * 100))}%"></div>
                </div>
                <span class="budget-amt">₹${fmtINR(b.val)}</span>
                <span class="budget-pct">${Math.round(b.val / total * 100)}%</span>
            </div>`).join("")}
        <div class="budget-summary">
            <div class="bsum-row">
                <span>Total Estimated</span>
                <strong class="${estimated > total ? "over-budget" : "under-budget"}">₹${fmtINR(estimated)}</strong>
            </div>
            <div class="bsum-row">
                <span>Your Budget</span>
                <strong>₹${fmtINR(total)}</strong>
            </div>
            <div class="bsum-row">
                <span>${estimated <= total ? "💚 You're within budget!" : "⚠️ Over budget by"}</span>
                <strong class="${estimated > total ? "over-budget" : "under-budget"}">
                    ₹${fmtINR(Math.abs(estimated - total))}
                </strong>
            </div>
        </div>`;
}

// ── Weather ───────────────────────────────────────────────────
function _renderWeather(trip) {
    const el = document.getElementById("weather");
    if (!el) return;
    const w = trip.weather || {};
    if (!Object.keys(w).length) { el.style.display = "none"; return; }
    el.innerHTML = `
        <div class="section-header"><h2>🌤 Weather Info</h2></div>
        <div class="weather-row">
            <div class="weather-chip">🌡 High: <strong>${esc(w.temp_high || "-")}</strong></div>
            <div class="weather-chip">🌡 Low: <strong>${esc(w.temp_low || "-")}</strong></div>
            <div class="weather-chip">⛅ ${esc(w.condition || "")}</div>
        </div>
        ${w.best_time_note ? `<div class="weather-tip">💡 ${esc(w.best_time_note)}</div>` : ""}`;
}

// ── Transport ─────────────────────────────────────────────────
function _renderTransport(trip) {
    const el = document.getElementById("transport");
    if (!el) return;
    const lt = trip.local_transport || [];
    if (!lt.length) { el.style.display = "none"; return; }
    el.innerHTML = `
        <div class="section-header"><h2>🚌 Getting Around</h2></div>
        <div class="transport-grid">
            ${lt.map(t => `<div class="transport-chip">🔹 ${esc(t)}</div>`).join("")}
        </div>`;
}

// ── Itinerary ─────────────────────────────────────────────────
function _renderItinerary(trip) {
    const el = document.getElementById("itinerary");
    if (!el) return;
    const itin = trip.itinerary || [];
    el.innerHTML = `
        <div class="section-header">
            <h2>📅 Day-by-Day Itinerary</h2>
            <span class="section-sub">${itin.length} days planned</span>
        </div>
        ${itin.map((d, i) => {
        if (typeof d === "string") return `
                <div class="day-card">
                    <div class="day-badge">Day ${i + 1}</div>
                    <p class="day-desc">${esc(d)}</p>
                </div>`;
        return `
                <div class="day-card">
                    <div class="day-card-header">
                        <div class="day-badge">Day ${esc(d.day || i + 1)}</div>
                        <div class="day-title">${esc(d.title || "")}</div>
                    </div>
                    <div class="day-timeline">
                        ${d.morning ? `<div class="tl-item"><span class="tl-icon">🌅</span><div><strong>Morning</strong><p>${esc(d.morning)}</p></div></div>` : ""}
                        ${d.afternoon ? `<div class="tl-item"><span class="tl-icon">🌇</span><div><strong>Afternoon</strong><p>${esc(d.afternoon)}</p></div></div>` : ""}
                        ${d.evening ? `<div class="tl-item"><span class="tl-icon">🌙</span><div><strong>Evening</strong><p>${esc(d.evening)}</p></div></div>` : ""}
                    </div>
                </div>`;
    }).join("")}`;
}

// ── Tips ──────────────────────────────────────────────────────
function _renderTips(trip) {
    const el = document.getElementById("tips");
    if (!el) return;
    const tips = trip.tips || [];
    el.innerHTML = `
        <div class="section-header"><h2>💡 Travel Tips</h2></div>
        <ul class="tips-list">
            ${tips.map(t => `<li>${esc(t)}</li>`).join("")}
        </ul>`;
}

// ── Emergency ─────────────────────────────────────────────────
function _renderEmergency(trip) {
    const el = document.getElementById("emergency");
    if (!el) return;
    const ec = trip.emergency_contacts || {};
    if (!Object.keys(ec).length) { el.style.display = "none"; return; }
    const labels = { police: "🚓 Police", ambulance: "🚑 Ambulance", tourist_helpline: "📞 Tourist Helpline", local_emergency: "🆘 Emergency" };
    el.innerHTML = `
        <div class="section-header"><h2>🆘 Emergency Contacts</h2></div>
        <div class="emergency-grid">
            ${Object.entries(ec).map(([k, v]) => `
                <div class="ec-card">
                    <div class="ec-label">${labels[k] || esc(k)}</div>
                    <a class="ec-num" href="tel:${esc(v)}">${esc(v)}</a>
                </div>`).join("")}
        </div>`;
}

// ── Recommendation ────────────────────────────────────────────
function _renderRecommendation(trip) {
    const el = document.getElementById("recommendation");
    if (!el) return;
    el.innerHTML = `
        <div class="section-header"><h2>⭐ Expert Recommendation</h2></div>
        <blockquote class="rec-quote">${esc(trip.recommendation || "")}</blockquote>
        <div class="rec-actions">
            <button class="btn-share" onclick="shareTrip()">📤 Share This Trip</button>
        </div>`;
}

// ───── TRIPS PAGE ─────────────────────────────────────────────
async function loadTripsPage() {
    const c = document.getElementById("tripsContainer");
    if (!c) return;
    c.innerHTML = "<p class='loading-msg'>⏳ Loading your trips...</p>";
    try {
        const res = await fetch(`${API_BASE}/trips/`, { headers: authHdr() });
        if (res.status === 401) { go("login.html"); return; }
        const trips = await res.json();
        window._allTrips = Array.isArray(trips) ? trips : [];
        renderTrips(window._allTrips);
    } catch {
        c.innerHTML = "<p class='loading-msg'>❌ Failed to load trips. Check your connection.</p>";
    }
}

function renderTrips(trips) {
    const c = document.getElementById("tripsContainer");
    if (!c) return;
    if (!trips || !trips.length) {
        c.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🗺️</div>
                <h3>No trips yet</h3>
                <p>You haven't planned any trips. Let's change that!</p>
                <a href="index.html" class="btn-cta">Plan Your First Trip →</a>
            </div>`;
        return;
    }
    const typeEmoji = { leisure: "🏖", adventure: "🏔", business: "💼", honeymoon: "💑", family: "👨‍👩‍👧", pilgrimage: "🙏", backpacking: "🎒" };

    window._displayedTrips = trips.slice().reverse();
    c.innerHTML = window._displayedTrips.map((t, i) => `
        <div class="trip-card">
            <div class="tc-img-wrap">
                <img src="${destImage(t.destination)}" alt="${esc(t.destination)}" loading="lazy"
                     onerror="this.src='https://picsum.photos/seed/travel/400/300'">
                <span class="tc-badge">${typeEmoji[t.trip_type] || "✈"} ${esc(t.trip_type || "Leisure")}</span>
                ${(function () {
            if (typeof getTripStatus !== 'undefined' && t.departure_date) {
                const s = getTripStatus(t.departure_date, t.return_date);
                return '<span class="tc-status ' + s.cls + '">' + s.emoji + ' ' + s.label + '</span>';
            }
            return '';
        })()} 
            </div>
            <div class="tc-body">
                <h3 class="tc-dest">${esc(t.destination)}</h3>
                <p class="tc-origin">📍 From ${esc(t.origin || "India")}</p>
                <p class="tc-dates">
                    🛫 ${esc(fmtDate(t.departure_date))} &nbsp;→&nbsp; 🛬 ${esc(fmtDate(t.return_date))}
                </p>
                <div class="tc-stats">
                    <span>📅 ${esc(t.days)} days</span>
                    <span>💰 ₹${fmtINR(t.budget)}</span>
                    <span>👥 ${esc(t.travelers || 1)}</span>
                </div>
                <div class="tc-actions">
                    <button class="tc-btn-view" onclick="viewTripByIndex(${i})">View Details</button>
                    ${t._id ? `<button class="tc-btn-del" onclick="deleteTrip('${esc(t._id)}')">🗑 Delete</button>` : ""}
                </div>
            </div>
        </div>`).join("");
}

function viewTripByIndex(i) {
    const trip = (window._displayedTrips || [])[i];
    if (!trip) { console.error('Trip not found at index', i); return; }
    localStorage.setItem('latestTrip', JSON.stringify(trip));
    go('details.html');
}
function viewTrip(serialized) {
    try { const t = JSON.parse(serialized); localStorage.setItem('latestTrip', JSON.stringify(t)); go('details.html'); } catch (e) { }
}

async function deleteTrip(id) {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
        const res = await fetch(`${API_BASE}/trips/${id}`, { method: "DELETE", headers: authHdr() });
        if (res.ok) {
            window._allTrips = (window._allTrips || []).filter(t => t._id !== id);
            renderTrips(window._allTrips);
        } else {
            alert("Delete failed. Try again.");
        }
    } catch { alert("Network error."); }
}

function filterTrips(val) {
    const q = val.toLowerCase();
    renderTrips((window._allTrips || []).filter(t =>
        (t.destination || "").toLowerCase().includes(q) ||
        (t.origin || "").toLowerCase().includes(q) ||
        (t.trip_type || "").toLowerCase().includes(q)
    ));
}

// ───── AUTH ───────────────────────────────────────────────────
function toggleAuthMode() {
    const isLogin = document.getElementById("auth-title").dataset.mode !== "register";
    const nameRow = document.getElementById("name-row");
    const btn = document.getElementById("auth-submit");
    const toggle = document.getElementById("auth-toggle-btn");
    const title = document.getElementById("auth-title");
    const sub = document.getElementById("auth-sub");
    clearMsg("auth-error");

    if (isLogin) {
        title.textContent = "Create Account"; title.dataset.mode = "register";
        if (sub) sub.textContent = "Join TravelMind — it's free";
        nameRow.style.display = "block";
        btn.textContent = "Create Account";
        btn.onclick = registerUser;
        toggle.innerHTML = 'Already have an account? <a onclick="toggleAuthMode()">Sign In</a>';
    } else {
        title.textContent = "Welcome back 👋"; title.dataset.mode = "login";
        if (sub) sub.textContent = "Sign in to your account";
        nameRow.style.display = "none";
        btn.textContent = "Sign In";
        btn.onclick = loginUser;
        toggle.innerHTML = "Don't have an account? <a onclick=\"toggleAuthMode()\">Register</a>";
    }
}

async function registerUser() {
    const name = document.getElementById("name")?.value?.trim() || "";
    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value || "";

    clearMsg("auth-error");
    if (!name) return showError("auth-error", "Please enter your name.");
    if (!email) return showError("auth-error", "Please enter your email address.");
    if (password.length < 6) return showError("auth-error", "Password must be at least 6 characters.");

    const btn = document.getElementById("auth-submit");
    btn.disabled = true; btn.textContent = "Creating account...";

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            showSuccess("auth-error", "✅ Account created! Please sign in.");
            setTimeout(toggleAuthMode, 1000);
        } else {
            showError("auth-error", data.error || "Registration failed.");
        }
    } catch { showError("auth-error", "Network error. Please try again."); }
    finally { btn.disabled = false; btn.textContent = "Create Account"; }
}

async function loginUser() {
    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value || "";

    clearMsg("auth-error");
    if (!email) return showError("auth-error", "Please enter your email address.");
    if (!password) return showError("auth-error", "Please enter your password.");

    const btn = document.getElementById("auth-submit");
    btn.disabled = true; btn.textContent = "Signing in...";

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userName", data.name || email.split("@")[0]);
            go("index.html");
        } else {
            showError("auth-error", data.error || "Login failed.");
        }
    } catch { showError("auth-error", "Network error. Please try again."); }
    finally { btn.disabled = false; btn.textContent = "Sign In"; }
}