// ===== NAVIGATION =====
function go(page) {
    window.location.href = page;
}

// ===== ACTIVE SIDEBAR =====
window.onload = function () {
    const path = window.location.pathname;

    const routes = {
        index: "nav-dashboard",
        trips: "nav-trips",
        saved: "nav-saved",
        explore: "nav-explore",
        login: "nav-login"
    };

    Object.keys(routes).forEach(route => {
        if (path.includes(route)) {
            document.getElementById(routes[route])?.classList.add("active");
        }
    });
};

// ===== GENERATE TRIP =====
function generateTrip() {
    const result = document.getElementById("result");

    const destination = document.getElementById("destination").value;
    const budget = document.getElementById("budget").value;
    const days = document.getElementById("days").value;

    // ✅ Validation
    if (!destination || !budget || !days) {
        result.innerHTML = "⚠️ Please fill all fields";
        return;
    }

    result.innerHTML = "⏳ Generating your trip...";

    fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            destination,
            budget,
            days
        })
    })
    .then(res => res.json())
    .then(data => {
        // Save latest trip (for details page)
        localStorage.setItem("latestTrip", JSON.stringify(data));

        result.innerHTML = `
            <div class="trip-card horizontal" onclick="viewDetails()">
                <img src="https://source.unsplash.com/600x300/?${data.destination}">
                <div class="trip-info">
                    <h2>${data.destination}</h2>
                    <p>💰 ₹${data.total_cost}</p>
                    <p>📍 ${data.distance} km</p>
                    <p>📅 ${data.itinerary?.length || days} days</p>
                </div>
            </div>
        `;
    })
    .catch(() => {
        result.innerHTML = "❌ Error fetching trip";
    });
}

// ===== VIEW DETAILS =====
function viewDetails() {
    window.location.href = "details.html";
}