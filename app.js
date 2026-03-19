const announcementUrl = "./announcement.json";
const recentRacesUrl = "./recent_races.json";
const scheduleUrl = "./schedule.json";

const translations = {
  en: {
    htmlLang: "en",
    pageTitle: "Hourly Race | ASG Racing",
    metaDescription:
      "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    navLeaderboard: "Leaderboard",
    navLastRaces: "Last Races",
    navCars: "Cars",
    navHourly: "Hourly Race",
    heroTitle: "Hourly Race",
    heroSubtitle:
      "Dedicated ASG Racing server with a fixed schedule, rotating tracks, and a live announcement for the next event.",
    announcementEyebrow: "Next Event",
    scheduleEyebrow: "Schedule",
    archiveEyebrow: "Archive",
    scheduleTitle: "Upcoming Slots",
    recentTitle: "Recent Races",
    labelDate: "Date",
    labelTime: "Time",
    labelTrack: "Track",
    labelWindow: "Server Window",
    loadingShort: "Loading...",
    loadError: "Loading failed.",
    defaultAnnouncementTitle: "Hourly Race",
    scheduleEmpty: "No data.",
    recentEmpty: "No completed races yet.",
    locale: "en-US"
  },
  ru: {
    htmlLang: "ru",
    pageTitle: "Часовая гонка | ASG Racing",
    metaDescription:
      "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    navLeaderboard: "Лидерборд",
    navLastRaces: "Последние гонки",
    navCars: "Машины",
    navHourly: "Часовая гонка",
    heroTitle: "Часовая гонка",
    heroSubtitle:
      "Отдельный сервер ASG Racing с фиксированным расписанием, ротацией трасс и живым анонсом ближайшего события.",
    announcementEyebrow: "Ближайший старт",
    scheduleEyebrow: "План",
    archiveEyebrow: "Архив",
    scheduleTitle: "Ближайшие слоты",
    recentTitle: "Последние заезды",
    labelDate: "Дата",
    labelTime: "Время",
    labelTrack: "Трасса",
    labelWindow: "Длительность окна",
    loadingShort: "Загрузка...",
    loadError: "Ошибка загрузки.",
    defaultAnnouncementTitle: "Часовая гонка",
    scheduleEmpty: "Нет данных.",
    recentEmpty: "Пока нет завершенных заездов.",
    locale: "ru-RU"
  }
};

const dynamicValueMap = {
  en: {
    "Часовая гонка": "Hourly Race",
    "Ближайшая часовая гонка": "Next Hourly Race",
    "Запланировано": "Scheduled",
    "Скоро": "Soon",
    "Скоро старт": "Starting soon",
    "Открыт": "Open",
    "Открыто": "Open",
    "Сервер открыт": "Server is open",
    "Завершено": "Finished",
    "Завершена": "Finished",
    "Отменено": "Cancelled",
    "Дневной слот": "Day slot",
    "Вечерний слот": "Evening slot"
  },
  ru: {
    "Hourly Race": "Часовая гонка",
    "Next Hourly Race": "Ближайшая часовая гонка",
    "Scheduled": "Запланировано",
    "Soon": "Скоро",
    "Starting soon": "Скоро старт",
    "Open": "Открыт",
    "Server is open": "Сервер открыт",
    "Finished": "Завершено",
    "Cancelled": "Отменено",
    "Day slot": "Дневной слот",
    "Evening slot": "Вечерний слот"
  }
};

let currentLang = "en";
let announcementData = {};
let scheduleItems = [];
let recentRaceItems = [];
let hasLoadError = false;

function t(key) {
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

function resolveInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  if (urlLang && translations[urlLang]) return urlLang;

  const storedLang = localStorage.getItem("asgLang");
  if (storedLang && translations[storedLang]) return storedLang;

  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  const preferred = browserLanguages
    .map(value => String(value || "").trim().toLowerCase())
    .find(Boolean);

  return preferred && preferred.startsWith("ru") ? "ru" : "en";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function localizeDynamicValue(value) {
  if (!value || typeof value !== "string") return value;
  return dynamicValueMap[currentLang]?.[value] ?? value;
}

function getLocalizedField(item, key, fallback = "--") {
  if (!item || typeof item !== "object") return fallback;

  const directLocalized =
    item[`${key}_${currentLang}`] ??
    item[`${key}_${currentLang.toUpperCase()}`] ??
    item[`${key}_${currentLang.toLowerCase()}`];

  if (typeof directLocalized === "string" && directLocalized.trim()) {
    return directLocalized;
  }

  const raw = item[key];

  if (typeof raw === "string" && raw.trim()) {
    return localizeDynamicValue(raw);
  }

  if (raw && typeof raw === "object") {
    const nested = raw[currentLang] ?? raw.en ?? raw.ru;
    if (typeof nested === "string" && nested.trim()) return nested;
  }

  return fallback;
}

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

  return new Intl.DateTimeFormat(t("locale"), {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(date);
}

function applyTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = t("pageTitle");

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute("content", t("metaDescription"));
  }

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value !== undefined) el.textContent = value;
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderAnnouncement(data) {
  document.getElementById("announcement-title").textContent =
    getLocalizedField(data, "title", t("defaultAnnouncementTitle"));
  document.getElementById("announcement-status").textContent =
    getLocalizedField(data, "status", "--");
  document.getElementById("announcement-date").textContent = formatDate(data.date);
  document.getElementById("announcement-time").textContent =
    getLocalizedField(data, "start_time_local", data.start_time_local || "--");
  document.getElementById("announcement-track").textContent =
    getLocalizedField(data, "track_name", data.track_name || "--");
  document.getElementById("announcement-duration").textContent =
    getLocalizedField(data, "server_window", data.server_window || "--");
}

function renderSchedule(rows) {
  const container = document.getElementById("schedule-list");
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("scheduleEmpty"))}</div>`;
    return;
  }

  container.innerHTML = rows.map(row => `
    <article class="list-item">
      <div>
        <div class="item-title">${escapeHtml(getLocalizedField(row, "track_name", row.track_name || "--"))}</div>
        <div class="item-meta">${escapeHtml(formatDate(row.date))} · ${escapeHtml(row.start_time_local || "--")} · ${escapeHtml(row.timezone || "UTC+3")}</div>
      </div>
      <div class="item-side">${escapeHtml(getLocalizedField(row, "slot_label", row.slot_label || "--"))}</div>
    </article>
  `).join("");
}

function renderRecentRaces(rows) {
  const container = document.getElementById("recent-races-list");
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("recentEmpty"))}</div>`;
    return;
  }

  container.innerHTML = rows.map(row => `
    <article class="list-item">
      <div>
        <div class="item-title">${escapeHtml(getLocalizedField(row, "track_name", row.track_name || "--"))}</div>
        <div class="item-meta">${escapeHtml(row.started_at_local || "--")} - ${escapeHtml(row.finished_at_local || "--")}</div>
      </div>
      <div class="item-side">${escapeHtml(getLocalizedField(row, "status", row.status || "--"))}</div>
    </article>
  `).join("");
}

function renderErrorState() {
  document.getElementById("schedule-list").innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  document.getElementById("recent-races-list").innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  document.getElementById("announcement-title").textContent = t("loadError");
  document.getElementById("announcement-status").textContent = "--";
  document.getElementById("announcement-date").textContent = "--";
  document.getElementById("announcement-time").textContent = "--";
  document.getElementById("announcement-track").textContent = "--";
  document.getElementById("announcement-duration").textContent = "--";
}

function renderUI() {
  applyTranslations();

  if (hasLoadError) {
    renderErrorState();
    return;
  }

  renderAnnouncement(announcementData || {});
  renderSchedule(scheduleItems);
  renderRecentRaces(recentRaceItems);
}

function bindLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!translations[lang] || lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem("asgLang", currentLang);
      renderUI();
    });
  });
}

async function init() {
  currentLang = resolveInitialLanguage();
  bindLanguageButtons();
  renderUI();

  try {
    const [announcement, schedule, recentRaces] = await Promise.all([
      loadJson(announcementUrl),
      loadJson(scheduleUrl),
      loadJson(recentRacesUrl)
    ]);

    announcementData = announcement || {};
    scheduleItems = Array.isArray(schedule?.items) ? schedule.items : [];
    recentRaceItems = Array.isArray(recentRaces?.items) ? recentRaces.items : [];
    hasLoadError = false;
    renderUI();
  } catch (error) {
    console.error(error);
    hasLoadError = true;
    renderUI();
  }
}

document.addEventListener("DOMContentLoaded", init);
