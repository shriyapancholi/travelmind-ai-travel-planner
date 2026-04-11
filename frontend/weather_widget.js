// ── LIVE WEATHER WIDGET ──────────────────────────────────────
// Uses Open-Meteo API (free, no key needed)
const GEOCODE_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

async function fetchLiveWeather(destination) {
    try {
        // Step 1: geocode city name → lat/lon
        const geoRes = await fetch(`${GEOCODE_API}?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results || !geoData.results.length) return null;

        const { latitude, longitude, name, country } = geoData.results[0];

        // Step 2: fetch weather
        const wRes = await fetch(`${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`);
        const wData = await wRes.json();

        const cur = wData.current;
        const daily = wData.daily;

        const weatherCodes = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 61: "Slight rain",
            63: "Moderate rain", 65: "Heavy rain", 71: "Slight snow", 80: "Rain showers",
            95: "Thunderstorm", 96: "Thunderstorm with hail"
        };

        const weatherEmojis = {
            0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️", 45: "🌫", 48: "🌫",
            51: "🌦", 61: "🌧", 63: "🌧", 65: "🌧", 71: "❄️", 80: "🌦", 95: "⛈", 96: "⛈"
        };

        const code = cur.weather_code;
        return {
            city: name, country,
            temp: Math.round(cur.temperature_2m),
            humidity: cur.relative_humidity_2m,
            wind: Math.round(cur.wind_speed_10m),
            condition: weatherCodes[code] || "Unknown",
            emoji: weatherEmojis[code] || "🌡",
            max: Math.round(daily.temperature_2m_max[0]),
            min: Math.round(daily.temperature_2m_min[0]),
            rain_chance: daily.precipitation_probability_max[0],
            forecast: [0, 1, 2].map(i => ({
                date: new Date(daily.time[i]).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
                max: Math.round(daily.temperature_2m_max[i]),
                min: Math.round(daily.temperature_2m_min[i]),
                rain: daily.precipitation_probability_max[i],
                emoji: weatherEmojis[code] || "🌡"
            }))
        };
    } catch (e) {
        console.error("Weather fetch error:", e);
        return null;
    }
}

function renderLiveWeather(data, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!data) { el.style.display = "none"; return; }

    el.innerHTML = `
        <div class="section-header"><h2>🌤 Live Weather — ${esc(data.city)}, ${esc(data.country)}</h2></div>
        <div class="weather-current">
            <div class="weather-big-temp">${data.emoji} ${data.temp}°C</div>
            <div class="weather-details">
                <div class="weather-condition">${esc(data.condition)}</div>
                <div class="weather-meta">
                    <span>⬆ ${data.max}° ⬇ ${data.min}°</span>
                    <span>💧 ${data.humidity}% humidity</span>
                    <span>💨 ${data.wind} km/h</span>
                    <span>🌧 ${data.rain_chance}% rain chance</span>
                </div>
            </div>
        </div>
        <div class="weather-forecast">
            ${data.forecast.map(f => `
                <div class="forecast-day">
                    <div class="forecast-date">${esc(f.date)}</div>
                    <div class="forecast-emoji">${f.emoji}</div>
                    <div class="forecast-temp">${f.max}° / ${f.min}°</div>
                    <div class="forecast-rain">🌧 ${f.rain}%</div>
                </div>
            `).join("")}
        </div>
    `;
}