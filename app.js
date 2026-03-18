const announcementUrl = "./announcement.json";
const recentRacesUrl = "./recent_races.json";
const scheduleUrl = "./schedule.json";

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

function formatDate(isoDate) {
  if (!isoDate) return "--";

  const date = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(date);
}

function renderAnnouncement(data) {
  document.getElementById("announcement-title").textContent = data.title || "Часовая гонка";
  document.getElementById("announcement-status").textContent = data.status || "--";
  document.getElementById("announcement-date").textContent = formatDate(data.date);
  document.getElementById("announcement-time").textContent = data.start_time_local || "--";
  document.getElementById("announcement-track").textContent = data.track_name || "--";
  document.getElementById("announcement-duration").textContent = data.server_window || "--";
}

function renderSchedule(rows) {
  const container = document.getElementById("schedule-list");
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="empty">Нет данных.</div>';
    return;
  }

  container.innerHTML = rows.map(row => `
    <article class="list-item">
      <div>
        <div class="item-title">${row.track_name || "--"}</div>
        <div class="item-meta">${formatDate(row.date)} · ${row.start_time_local || "--"} · ${row.timezone || "UTC+3"}</div>
      </div>
      <div class="item-side">${row.slot_label || "--"}</div>
    </article>
  `).join("");
}

function renderRecentRaces(rows) {
  const container = document.getElementById("recent-races-list");
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="empty">Пока нет завершенных заездов.</div>';
    return;
  }

  container.innerHTML = rows.map(row => `
    <article class="list-item">
      <div>
        <div class="item-title">${row.track_name || "--"}</div>
        <div class="item-meta">${row.started_at_local || "--"} - ${row.finished_at_local || "--"}</div>
      </div>
      <div class="item-side">${row.status || "--"}</div>
    </article>
  `).join("");
}

async function init() {
  try {
    const [announcement, schedule, recentRaces] = await Promise.all([
      loadJson(announcementUrl),
      loadJson(scheduleUrl),
      loadJson(recentRacesUrl)
    ]);

    renderAnnouncement(announcement || {});
    renderSchedule(Array.isArray(schedule?.items) ? schedule.items : []);
    renderRecentRaces(Array.isArray(recentRaces?.items) ? recentRaces.items : []);
  } catch (error) {
    console.error(error);
    document.getElementById("schedule-list").innerHTML = '<div class="empty">Ошибка загрузки.</div>';
    document.getElementById("recent-races-list").innerHTML = '<div class="empty">Ошибка загрузки.</div>';
    document.getElementById("announcement-title").textContent = "Ошибка загрузки";
  }
}

document.addEventListener("DOMContentLoaded", init);
