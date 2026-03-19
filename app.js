const announcementUrl = "https://asgracing.github.io/hourly-data/announcement.json";
const scheduleUrl = "https://asgracing.github.io/hourly-data/schedule.json";
const recentRacesUrl = "https://asgracing.github.io/hourly-data/races/races.json";
const recentRaceDetailsBaseUrl = "https://asgracing.github.io/hourly-data/";

const translations = {
  en: {
    htmlLang: "en",
    pageTitle: "Hourly Race | ASG Racing",
    metaDescription: "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    ogTitle: "Hourly Race | ASG Racing",
    ogDescription: "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    twitterTitle: "Hourly Race | ASG Racing",
    twitterDescription: "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    ogLocale: "en_US",
    navLeaderboard: "Leaderboard",
    navLastRaces: "Last Races",
    navCars: "Cars",
    navHourly: "Hourly Race",
    heroServerLabel: "Server",
    heroPasswordLabel: "Password",
    heroEntryLabel: "Entry",
    heroFormatLabel: "Format",
    heroPitstopLabel: "Pitstop",
    heroMandatoryLabel: "Mandatory",
    heroWeatherLabel: "Weather",
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
    defaultAnnouncementTitle: "1-Hour Race",
    scheduleEmpty: "No data.",
    recentEmpty: "No completed races yet.",
    locale: "en-GB",
    entrySlots: "{value} slots",
    entrySafety: "SA {value}+",
    entryTrackMedals: "Track medals {value}",
    entryRacecraft: "RC {value}+",
    preRaceWait: "Prestart {value}m",
    overtime: "Overtime {value}m",
    mandatoryPitstopCount: "{value} mandatory stop",
    mandatoryPitstopCountPlural: "{value} mandatory stops",
    pitWindow: "window {value}m",
    pitNoMandatory: "No mandatory stop",
    pitRefuelAllowed: "refuelling allowed",
    pitRefuelFixed: "fixed refuel time",
    mandatoryRefuel: "refuel",
    mandatoryTyres: "tyre change",
    mandatoryDriverSwap: "driver swap",
    mandatoryNone: "No mandatory service actions",
    passwordNone: "No password",
    weatherClear: "Clear",
    weatherMixed: "Mixed clouds",
    weatherCloudy: "Cloudy",
    weatherWet: "Wet risk",
    weatherTemp: "{value}C",
    weatherClouds: "clouds {value}%",
    weatherRain: "rain {value}%",
    weatherRandomness: "randomness {value}",
    unknownValue: "--",
    racesTableTitle: "Race Results",
    racesTableSubtitle: "Click any row to open the finishing order.",
    racesCols: ["Date", "Track", "Winner", "Drivers", "Best Lap"],
    openRaceDetailsLabel: "Open race details",
    raceModalEyebrow: "Race details",
    raceModalCols: ["Pos", "Start", "Delta", "Driver", "Best Lap", "Car", "Gap", "Pts", "Pen"],
    raceSummaryTrack: "Track",
    raceSummaryWinner: "Winner",
    raceSummaryDrivers: "Drivers",
    raceSummaryBestLap: "Best lap",
    raceBestLapBadge: "Fastest lap",
    notCountedBadge: "Not counted",
    noWinner: "No winner",
    closeLabel: "Close"
  },
  ru: {
    htmlLang: "ru",
    pageTitle: "Часовая гонка | ASG Racing",
    metaDescription: "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    ogTitle: "Часовая гонка | ASG Racing",
    ogDescription: "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    twitterTitle: "Часовая гонка | ASG Racing",
    twitterDescription: "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    ogLocale: "ru_RU",
    navLeaderboard: "Лидерборд",
    navLastRaces: "Последние гонки",
    navCars: "Машины",
    navHourly: "Часовая гонка",
    heroServerLabel: "Сервер",
    heroPasswordLabel: "Пароль",
    heroEntryLabel: "Вход",
    heroFormatLabel: "Формат",
    heroPitstopLabel: "Пит-стоп",
    heroMandatoryLabel: "Обязательно",
    heroWeatherLabel: "Погода",
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
    locale: "ru-RU",
    entrySlots: "{value} слотов",
    entrySafety: "SA {value}+",
    entryTrackMedals: "Медали трассы {value}",
    entryRacecraft: "RC {value}+",
    preRaceWait: "Престарт {value}м",
    overtime: "Овертайм {value}м",
    mandatoryPitstopCount: "{value} обязательный пит-стоп",
    mandatoryPitstopCountPlural: "{value} обязательных пит-стопа",
    pitWindow: "окно {value}м",
    pitNoMandatory: "Без обязательного пит-стопа",
    pitRefuelAllowed: "дозаправка разрешена",
    pitRefuelFixed: "фиксированное время дозаправки",
    mandatoryRefuel: "дозаправка",
    mandatoryTyres: "смена шин",
    mandatoryDriverSwap: "смена пилота",
    mandatoryNone: "Нет обязательных сервисных действий",
    passwordNone: "Без пароля",
    weatherClear: "Ясно",
    weatherMixed: "Переменная облачность",
    weatherCloudy: "Облачно",
    weatherWet: "Есть риск дождя",
    weatherTemp: "{value}C",
    weatherClouds: "облачность {value}%",
    weatherRain: "дождь {value}%",
    weatherRandomness: "рандомность {value}",
    unknownValue: "--",
    racesTableTitle: "Результаты заездов",
    racesTableSubtitle: "Нажми на строку, чтобы открыть финишный протокол.",
    racesCols: ["Дата", "Трасса", "Победитель", "Пилоты", "Лучший круг"],
    openRaceDetailsLabel: "Открыть детали гонки",
    raceModalEyebrow: "Детали гонки",
    raceModalCols: ["Поз", "Старт", "Дельта", "Пилот", "Лучший круг", "Машина", "Отставание", "Очки", "Штр."],
    raceSummaryTrack: "Трасса",
    raceSummaryWinner: "Победитель",
    raceSummaryDrivers: "Пилоты",
    raceSummaryBestLap: "Лучший круг",
    raceBestLapBadge: "Быстрейший круг",
    notCountedBadge: "Не в зачете",
    noWinner: "Нет победителя",
    closeLabel: "Закрыть"
  }
};

let currentLang = "en";
let announcementData = {};
let scheduleItems = [];
let recentRaceItems = [];
let selectedRace = null;
let hasLoadError = false;
const raceDetailsCache = new Map();

function t(key) { return translations[currentLang]?.[key] ?? translations.en[key] ?? key; }
function tf(key, replacements = {}) {
  let value = t(key);
  Object.entries(replacements).forEach(([k, v]) => { value = value.replace(`{${k}}`, String(v)); });
  return value;
}
function resolveInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  if (urlLang && translations[urlLang]) return urlLang;
  const storedLang = localStorage.getItem("asgLang");
  if (storedLang && translations[storedLang]) return storedLang;
  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language];
  const preferred = browserLanguages.map(value => String(value || "").trim().toLowerCase()).find(Boolean);
  return preferred && preferred.startsWith("ru") ? "ru" : "en";
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function getLocalizedField(item, key, fallback = "--") {
  if (!item || typeof item !== "object") return fallback;
  const directLocalized = item[`${key}_${currentLang}`];
  if (typeof directLocalized === "string" && directLocalized.trim()) return directLocalized;
  const raw = item[key];
  if (typeof raw === "string" && raw.trim()) return raw;
  if (raw && typeof raw === "object") {
    const nested = raw[currentLang] ?? raw.en ?? raw.ru;
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return fallback;
}
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || t("unknownValue");
}
function compactJoin(parts) { return parts.filter(Boolean).join(" · "); }
function minutesFromSeconds(value) { return typeof value === "number" && !Number.isNaN(value) ? Math.round(value / 60) : null; }
function percentValue(value) { return typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 100) : null; }
function formatMandatoryPitstopCount(value) {
  if (typeof value !== "number" || value <= 0) return t("pitNoMandatory");
  return value === 1 ? tf("mandatoryPitstopCount", { value }) : tf("mandatoryPitstopCountPlural", { value });
}
function buildEntryRules(server) {
  if (!server || typeof server !== "object") return t("unknownValue");
  const parts = [];
  if (server.car_group) parts.push(server.car_group);
  if (typeof server.max_car_slots === "number" && server.max_car_slots > 0) parts.push(tf("entrySlots", { value: server.max_car_slots }));
  if (typeof server.safety_rating_requirement === "number" && server.safety_rating_requirement > 0) parts.push(tf("entrySafety", { value: server.safety_rating_requirement }));
  if (typeof server.track_medals_requirement === "number" && server.track_medals_requirement > 0) parts.push(tf("entryTrackMedals", { value: server.track_medals_requirement }));
  if (typeof server.racecraft_rating_requirement === "number" && server.racecraft_rating_requirement > 0) parts.push(tf("entryRacecraft", { value: server.racecraft_rating_requirement }));
  return compactJoin(parts) || t("unknownValue");
}
function buildRaceFormat(session) {
  if (!session || typeof session !== "object") return t("unknownValue");
  const parts = [];
  if (session.format_label) parts.push(session.format_label);
  const preRaceMinutes = minutesFromSeconds(session.pre_race_waiting_time_seconds);
  if (preRaceMinutes && preRaceMinutes > 0) parts.push(tf("preRaceWait", { value: preRaceMinutes }));
  const overtimeMinutes = minutesFromSeconds(session.session_over_time_seconds);
  if (overtimeMinutes && overtimeMinutes > 0) parts.push(tf("overtime", { value: overtimeMinutes }));
  return compactJoin(parts) || t("unknownValue");
}
function buildPitstopRules(rules) {
  if (!rules || typeof rules !== "object") return t("unknownValue");
  const parts = [formatMandatoryPitstopCount(rules.mandatory_pitstop_count)];
  if (typeof rules.pit_window_length_minutes === "number" && rules.pit_window_length_minutes > 0) parts.push(tf("pitWindow", { value: rules.pit_window_length_minutes }));
  if (rules.refuelling_allowed_in_race) parts.push(t("pitRefuelAllowed"));
  if (rules.refuelling_time_fixed) parts.push(t("pitRefuelFixed"));
  return compactJoin(parts) || t("unknownValue");
}
function buildMandatoryActions(rules) {
  if (!rules || typeof rules !== "object") return t("unknownValue");
  const actions = [];
  if (rules.mandatory_pitstop_refuelling_required) actions.push(t("mandatoryRefuel"));
  if (rules.mandatory_pitstop_tyre_change_required) actions.push(t("mandatoryTyres"));
  if (rules.mandatory_pitstop_swap_driver_required) actions.push(t("mandatoryDriverSwap"));
  return compactJoin(actions) || t("mandatoryNone");
}
function buildWeatherSummary(weather) {
  if (!weather || typeof weather !== "object") return t("unknownValue");
  const summaryKey = weather.summary_key ? `weather${weather.summary_key[0].toUpperCase()}${weather.summary_key.slice(1)}` : null;
  const parts = [summaryKey ? t(summaryKey) : null];
  if (typeof weather.ambient_temp_c === "number") parts.push(tf("weatherTemp", { value: weather.ambient_temp_c }));
  const cloudPercent = percentValue(weather.cloud_level);
  if (cloudPercent !== null) parts.push(tf("weatherClouds", { value: cloudPercent }));
  const rainPercent = percentValue(weather.rain_level);
  if (rainPercent !== null) parts.push(tf("weatherRain", { value: rainPercent }));
  if (typeof weather.weather_randomness === "number") parts.push(tf("weatherRandomness", { value: weather.weather_randomness }));
  return compactJoin(parts) || t("unknownValue");
}
async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}
function formatDate(isoDate) {
  if (!isoDate) return "--";
  const date = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(t("locale"), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(date);
}
function formatDateTimeLocal(isoString) {
  if (!isoString) return "--";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString).replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat(t("locale"), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }).format(date);
}
function formatPositionsDelta(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value > 0) return `+${value}`;
  return `${value}`;
}
function renderPositionsDelta(value) {
  let cls = "delta-neutral";
  if (typeof value === "number" && value > 0) cls = "delta-positive";
  if (typeof value === "number" && value < 0) cls = "delta-negative";
  return `<span class="positions-delta ${cls}">${escapeHtml(formatPositionsDelta(value))}</span>`;
}
function formatStartPosition(row) { return typeof row?.start_position === "number" ? String(row.start_position) : "-"; }
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function humanizeTrackName(track) {
  if (!track) return "-";
  return String(track).replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function applyTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = t("pageTitle");
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogTitleMeta = document.querySelector('meta[property="og:title"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');
  const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
  const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
  if (descriptionMeta) descriptionMeta.setAttribute("content", t("metaDescription"));
  if (ogTitleMeta) ogTitleMeta.setAttribute("content", t("ogTitle"));
  if (ogDescriptionMeta) ogDescriptionMeta.setAttribute("content", t("ogDescription"));
  if (ogLocaleMeta) ogLocaleMeta.setAttribute("content", t("ogLocale"));
  if (twitterTitleMeta) twitterTitleMeta.setAttribute("content", t("twitterTitle"));
  if (twitterDescriptionMeta) twitterDescriptionMeta.setAttribute("content", t("twitterDescription"));
  document.querySelectorAll("[data-i18n]").forEach(el => { const value = t(el.dataset.i18n); if (value !== undefined) el.textContent = value; });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => { const value = t(el.dataset.i18nAriaLabel); if (value !== undefined) el.setAttribute("aria-label", value); });
  document.querySelectorAll(".lang-btn").forEach(btn => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderAnnouncement(data) {
  const announcementTitle =
    currentLang === "en"
      ? getLocalizedField(
          { title_en: data?.title_en, title: typeof data?.title === "object" ? data.title : undefined },
          "title",
          t("defaultAnnouncementTitle")
        )
      : getLocalizedField(data, "title", t("defaultAnnouncementTitle"));
  const announcementTime = getLocalizedField(
    data,
    "start_time_local",
    data.start_time_local || "--"
  );
  const announcementTimezone = getLocalizedField(
    data,
    "timezone",
    data.timezone || "UTC+3"
  );

  setText("announcement-title", announcementTitle);
  setText("announcement-status", getLocalizedField(data, "status", "--"));
  setText("announcement-date", formatDate(data.date));
  setText(
    "announcement-time",
    announcementTime === "--" ? announcementTime : `${announcementTime} ${announcementTimezone}`
  );
  setText("announcement-track", getLocalizedField(data, "track_name", data.track_name || "--"));
  setText("announcement-duration", getLocalizedField(data, "server_window", data.server_window || "--"));
}
function renderHeroDetails(data) {
  const server = data?.server || {};
  const session = data?.session || {};
  const rules = data?.rules || {};
  const weather = data?.weather || {};
  setText("hero-server-name", server.name || server.full_name || t("unknownValue"));
  setText("hero-server-password", server.password || t("passwordNone"));
  setText("hero-entry-rules", buildEntryRules(server));
  setText("hero-race-format", buildRaceFormat(session));
  setText("hero-pitstop-rules", buildPitstopRules(rules));
  setText("hero-mandatory-actions", buildMandatoryActions(rules));
  setText("hero-weather", buildWeatherSummary(weather));
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
  const container = document.getElementById("recent-races-table");
  if (!container) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("recentEmpty"))}</div>`;
    return;
  }
  const headers = t("racesCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rowsHtml = rows.map((race, index) => `
    <tr class="is-interactive-row" data-race-index="${index}" tabindex="0" role="button" aria-label="${escapeHtml(`${t("openRaceDetailsLabel")}: ${race.track_name || race.track || "-"}`)}">
      <td>${escapeHtml(formatDateTimeLocal(race.finished_at || race.finished_at_local))}</td>
      <td><div class="race-track-cell"><span class="race-track-name">${escapeHtml(race.track_name || humanizeTrackName(race.track))}</span></div></td>
      <td><span class="race-winner">${escapeHtml(race.winner || t("noWinner"))}</span></td>
      <td>${escapeHtml(race.participants_count ?? "-")}</td>
      <td><div>${escapeHtml(race.best_lap || "-")}</div><div class="race-note">${escapeHtml(race.best_lap_driver || "-")}</div></td>
    </tr>
  `).join("");
  container.innerHTML = `<table class="races-table"><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  container.querySelectorAll("tbody tr[data-race-index]").forEach(row => {
    const openRow = () => openRaceResultsModal(recentRaceItems[Number(row.dataset.raceIndex)] || null, row);
    row.addEventListener("click", event => { if (!event.target.closest("a")) openRow(); });
    row.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRow(); } });
  });
}
function renderRaceResultsModal() {
  const titleEl = document.getElementById("race-results-title");
  const subtitleEl = document.getElementById("race-results-subtitle");
  const summaryEl = document.getElementById("race-modal-summary");
  const tableEl = document.getElementById("race-results-table");
  if (!titleEl || !subtitleEl || !summaryEl || !tableEl) return;
  if (!selectedRace) {
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    summaryEl.innerHTML = "";
    tableEl.innerHTML = `<div class="empty">${escapeHtml(t("recentEmpty"))}</div>`;
    return;
  }
  titleEl.textContent = selectedRace.track_name || humanizeTrackName(selectedRace.track);
  subtitleEl.textContent = formatDateTimeLocal(selectedRace.finished_at || selectedRace.finished_at_local);
  summaryEl.innerHTML = `
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryTrack"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.track_name || humanizeTrackName(selectedRace.track))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryWinner"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.winner || t("noWinner"))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryDrivers"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.participants_count ?? "-")}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryBestLap"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.best_lap || "-")}</div></div>
  `;
  const headers = t("raceModalCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = (selectedRace.results || []).map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.position)}">#${escapeHtml(row.position)}</span></td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td><div class="driver-cell"><div class="driver-avatar">${escapeHtml(initials(row.driver))}</div><div class="driver-name-wrap"><div class="driver-name">${escapeHtml(row.driver || "-")}</div><div class="race-note">${escapeHtml(row.race_number != null ? `#${row.race_number}` : "")}</div></div></div></td>
      <td><div>${escapeHtml(row.best_lap || "-")}</div><div class="race-note">${row.had_best_lap ? escapeHtml(t("raceBestLapBadge")) : ""}</div></td>
      <td><div>${escapeHtml(row.car_name || "-")}</div><div class="race-note">${row.counted_for_stats === false ? escapeHtml(t("notCountedBadge")) : ""}</div></td>
      <td>${escapeHtml(row.gap || (row.position === 1 ? "-" : "-"))}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.penalty_count ?? 0)}</td>
    </tr>
  `).join("");
  tableEl.innerHTML = `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}
function openModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderRaceResultsModal();
}
function closeModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  selectedRace = null;
}
async function loadRaceDetails(race) {
  if (!race?.details_path) return race;
  if (raceDetailsCache.has(race.details_path)) return raceDetailsCache.get(race.details_path);
  const details = await loadJson(`${recentRaceDetailsBaseUrl}${race.details_path}`);
  raceDetailsCache.set(race.details_path, details);
  return details;
}
async function openRaceResultsModal(race) {
  if (!race) return;
  selectedRace = {
    track_name: race.track_name,
    track: race.track,
    finished_at: race.finished_at,
    participants_count: race.participants_count,
    winner: race.winner,
    best_lap: race.best_lap,
    results: []
  };
  openModal();
  try {
    selectedRace = await loadRaceDetails(race);
    renderRaceResultsModal();
  } catch (error) {
    console.error(error);
  }
}
function bindRaceModal() {
  const modal = document.getElementById("race-results-modal");
  const closeButton = document.getElementById("race-results-close");
  if (closeButton) closeButton.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.getElementById("race-results-modal")?.classList.contains("is-open")) closeModal();
  });
}
function renderErrorState() {
  document.getElementById("schedule-list").innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  document.getElementById("recent-races-table").innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  setText("announcement-title", t("loadError"));
  setText("announcement-status", "--");
  setText("announcement-date", "--");
  setText("announcement-time", "--");
  setText("announcement-track", "--");
  setText("announcement-duration", "--");
  setText("hero-server-name", "--");
  setText("hero-server-password", "--");
  setText("hero-entry-rules", "--");
  setText("hero-race-format", "--");
  setText("hero-pitstop-rules", "--");
  setText("hero-mandatory-actions", "--");
  setText("hero-weather", "--");
}
function renderUI() {
  applyTranslations();
  if (hasLoadError) {
    renderErrorState();
    return;
  }
  renderAnnouncement(announcementData || {});
  renderHeroDetails(announcementData || {});
  renderSchedule(scheduleItems);
  renderRecentRaces(recentRaceItems);
  renderRaceResultsModal();
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
  bindRaceModal();
  renderUI();
  try {
    const [announcement, schedule, recentRaces] = await Promise.all([loadJson(announcementUrl), loadJson(scheduleUrl), loadJson(recentRacesUrl)]);
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
