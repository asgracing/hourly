const params = new URLSearchParams(window.location.search);
function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}
const isAsgPublicSite = /(^|\.)asgracing\.ru$/i.test(window.location.hostname);
const defaultDataBase = isAsgPublicSite
  ? "https://data.asgracing.ru/hourly-data"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/hourly-data"
    : "/hourly-data";
const dataBase = normalizeBaseUrl(params.get("hourlyApiBase")) || defaultDataBase;
let currentLang = localStorage.getItem("asgLang") || (((navigator.language || "").toLowerCase().startsWith("ru")) ? "ru" : "en");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function isChampionshipEvent(item) {
  return String(item?.event_type || item?.type || "").toLowerCase() === "championship";
}

function raceDateLabel(item) {
  const date = item?.date ? new Date(`${item.date}T00:00:00+03:00`) : null;
  const dateText = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(currentLang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(date)
    : item?.date || "--";
  return `${dateText} · ${item?.start_time_local || "--"} ${item?.timezone || "UTC+3"}`;
}

function renderUpcoming(items) {
  const root = document.getElementById("championship-upcoming");
  const upcoming = (items || []).filter(isChampionshipEvent).slice(0, 3);
  if (!upcoming.length) {
    root.innerHTML = `<div class="championship-empty">${currentLang === "ru" ? "Ближайшие гонки чемпионата пока не опубликованы." : "No upcoming championship races yet."}</div>`;
    return;
  }
  root.innerHTML = upcoming.map(item => `
    <article class="schedule-event-card is-championship-event">
      <div class="schedule-event-card-inner">
        <div class="event-type-badge">${currentLang === "ru" ? "Событие чемпионата" : "Championship Event"}</div>
        <div class="schedule-event-time">${esc(raceDateLabel(item))}</div>
        <div class="schedule-event-track">${esc(item.track_name || item.track_code || "--")}</div>
        <div class="schedule-event-weather">${esc(item.weather?.summary_key || "")}</div>
      </div>
    </article>
  `).join("");
}

function renderStandings(data) {
  const root = document.getElementById("championship-standings");
  const standings = Array.isArray(data?.standings) ? data.standings : [];
  const races = Array.isArray(data?.races) ? data.races : [];
  if (!standings.length) {
    root.innerHTML = `<div class="championship-empty">${currentLang === "ru" ? "Результатов пока нет." : "No championship results yet."}</div>`;
    return;
  }
  const raceHeaders = races.map((race, index) => `<th>${esc(race.track_name || race.track || `R${index + 1}`)}</th>`).join("");
  root.innerHTML = `
    <table class="championship-standings-table">
      <thead><tr><th>#</th><th>${currentLang === "ru" ? "Пилот" : "Driver"}</th><th>${currentLang === "ru" ? "Итого" : "Total"}</th>${raceHeaders}</tr></thead>
      <tbody>
        ${standings.map(row => `
          <tr>
            <td>${esc(row.rank)}</td>
            <td>${esc(row.driver || row.public_id || "-")}</td>
            <td><strong>${esc(row.points || 0)}</strong></td>
            ${races.map(race => `<td>${esc(row.race_points?.[race.event_id] ?? "-")}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderProgress(data, schedule) {
  const root = document.getElementById("championship-progress");
  const completed = Array.isArray(data?.races) ? data.races.length : 0;
  const upcoming = (Array.isArray(schedule?.items) ? schedule.items : []).filter(isChampionshipEvent).length;
  const drivers = Array.isArray(data?.standings) ? data.standings.length : 0;
  root.innerHTML = [
    [completed, currentLang === "ru" ? "гонок завершено" : "completed races"],
    [upcoming, currentLang === "ru" ? "гонок впереди" : "upcoming races"],
    [drivers, currentLang === "ru" ? "пилотов в таблице" : "drivers scored"],
    [data?.status || "active", currentLang === "ru" ? "статус" : "status"]
  ].map(([value, label]) => `
    <div class="championship-progress-card">
      <div class="championship-progress-value">${esc(value)}</div>
      <div class="championship-progress-label">${esc(label)}</div>
    </div>
  `).join("");
}

async function init() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll(".lang-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === currentLang);
    button.addEventListener("click", () => {
      currentLang = button.dataset.lang || "en";
      localStorage.setItem("asgLang", currentLang);
      init();
    }, { once: true });
  });
  try {
    const [announcement, schedule] = await Promise.all([
      loadJson(`${dataBase}/announcement.json`),
      loadJson(`${dataBase}/schedule.json`)
    ]);
    const slug = params.get("slug") || announcement?.championship_slug || announcement?.championship?.slug || "championship";
    const data = await loadJson(`${dataBase}/events/${encodeURIComponent(slug)}/index.json`);
    document.getElementById("championship-title").textContent = data.title || announcement?.championship_title || slug;
    document.getElementById("championship-status").textContent = [data.period, data.status].filter(Boolean).join(" · ") || "Championship";
    document.getElementById("championship-description").textContent = data.description || (currentLang === "ru" ? "Активный чемпионат ASG Racing." : "Active ASG Racing championship.");
    renderProgress(data, schedule);
    renderUpcoming(data.upcoming_races?.length ? { items: data.upcoming_races }.items : schedule.items);
    renderStandings(data);
  } catch (error) {
    console.error(error);
    document.getElementById("championship-description").textContent = currentLang === "ru" ? "Не удалось загрузить данные чемпионата." : "Failed to load championship data.";
  }
}

document.addEventListener("DOMContentLoaded", init);
