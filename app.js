const announcementUrl = "https://asgracing.github.io/hourly-data/announcement.json";
const scheduleUrl = "https://asgracing.github.io/hourly-data/schedule.json";
const recentRacesUrl = "https://asgracing.github.io/hourly-data/races/races.json";
const recentRaceDetailsBaseUrl = "https://asgracing.github.io/hourly-data/";
const votesApiBase =
  document.querySelector('meta[name="hourly-votes-api"]')?.getAttribute("content")?.trim() || "";

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
    navLeaderboard: "Back to Public Leaderboard",
    navUpcoming: "Upcoming Slots",
    navRaceResults: "Race Results",
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
    scheduleTableSubtitle: "Click any row to open the slot briefing.",
    scheduleCols: ["Date + UTC", "Track", "Rain"],
    openScheduleDetailsLabel: "Open slot details",
    scheduleModalEyebrow: "Slot details",
    scheduleModalDateTime: "Date & time",
    scheduleModalSlot: "Slot",
    scheduleModalRain: "Rain forecast",
    voteButton: "I want to race!",
    voteButtonDone: "You're in",
    voteCountZero: "No votes yet",
    voteCountOne: "{value} wants to race",
    voteCountMany: "{value} want to race",
    voteSoon: "Voting soon",
    voteSending: "Saving...",
    voteFailed: "Try again",
    unvoteButton: "Remove vote",
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

Object.assign(translations.ru, {
  navLeaderboard: "Назад к Public Leaderboard",
  navUpcoming: "Предстоящие события",
  navRaceResults: "Результаты заездов",
  scheduleTableSubtitle: "Нажми на строку, чтобы открыть детали слота.",
  scheduleCols: ["Дата + UTC", "Трасса", "Дождь"],
  openScheduleDetailsLabel: "Открыть детали слота",
  scheduleModalEyebrow: "Детали слота",
  scheduleModalDateTime: "Дата и время",
  scheduleModalSlot: "Слот",
  scheduleModalRain: "Прогноз дождя"
});

Object.assign(translations.ru, {
  voteButton: "Я хочу поехать!",
  voteButtonDone: "Ты в списке",
  voteCountZero: "Пока никто не отметился",
  voteCountOne: "{value} хочет поехать",
  voteCountMany: "{value} хотят поехать",
  voteSoon: "Опрос скоро",
  voteSending: "Сохраняем...",
  voteFailed: "Повтори позже",
  unvoteButton: "Отменить голос"
});

let currentLang = "en";
let announcementData = {};
let scheduleItems = [];
let recentRaceItems = [];
let selectedScheduleItem = null;
let selectedRace = null;
let hasLoadError = false;
let votesEnabled = Boolean(votesApiBase);
let voteStateByEventId = {};
const raceDetailsCache = new Map();
const HERO_TRACK_BACKGROUNDS = {
  monza: "./assets/tracks/monza.jpg",
  silverstone: "./assets/tracks/silverstone.jpg",
  spa: "./assets/tracks/spa.jpg",
  nurburgring: "./assets/tracks/nurburgring.jpg"
};
const pendingVoteEventIds = new Set();

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
function formatRainForecast(item) {
  const rainLevel =
    item?.weather?.rain_level ??
    item?.rain_level ??
    announcementData?.weather?.rain_level;
  const rainPercent = percentValue(rainLevel);
  return rainPercent !== null ? tf("weatherRain", { value: rainPercent }) : t("unknownValue");
}
function getWeatherStateLabel(weather) {
  const state = String(weather?.summary_key || "").trim().toLowerCase();
  if (state === "clear") return t("weatherClear");
  if (state === "mixed") return t("weatherMixed");
  if (state === "cloudy") return t("weatherCloudy");
  if (state === "wet") return t("weatherWet");
  return t("unknownValue");
}
function formatScheduleCardDateTime(item) {
  const startTime = getLocalizedField(item, "start_time_local", item?.start_time_local || "--");
  const timezone = getLocalizedField(item, "timezone", item?.timezone || "UTC+3");
  if (!item?.date) return `${startTime} ${timezone}`.trim();
  const date = new Date(`${item.date}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return `${item.date} · ${startTime} ${timezone}`;
  const shortDate = new Intl.DateTimeFormat(t("locale"), {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow"
  }).format(date);
  return `${shortDate} · ${startTime} ${timezone}`;
}
function buildScheduleCardWeather(item) {
  const weather = item?.weather || {};
  const state = weather.summary_key ? getWeatherStateLabel(weather) : null;
  const rainLevel = percentValue(weather.rain_level ?? item?.rain_level);
  if (state && rainLevel !== null) return `${state} · ${rainLevel}%`;
  if (state) return state;
  if (rainLevel !== null) return `${rainLevel}%`;
  return t("unknownValue");
}
function formatScheduleDateTime(item) {
  const startTime = getLocalizedField(item, "start_time_local", item?.start_time_local || "--");
  const timezone = getLocalizedField(item, "timezone", item?.timezone || "UTC+3");
  return `${formatDate(item?.date)} · ${startTime} ${timezone}`;
}
function buildScheduleModalSummary(item) {
  return `
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("labelTrack"))}</div><div class="race-summary-value">${escapeHtml(getLocalizedField(item, "track_name", item?.track_name || "--"))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("scheduleModalDateTime"))}</div><div class="race-summary-value">${escapeHtml(formatScheduleDateTime(item))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("scheduleModalSlot"))}</div><div class="race-summary-value">${escapeHtml(getLocalizedField(item, "slot_label", item?.slot_label || "--"))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("scheduleModalRain"))}</div><div class="race-summary-value">${escapeHtml(formatRainForecast(item))}</div></div>
  `;
}
function buildScheduleModalDetails(item) {
  const server = announcementData?.server || {};
  const session = announcementData?.session || {};
  const rules = announcementData?.rules || {};
  const weather = item?.weather || announcementData?.weather || {};
  return `
    <article class="schedule-detail-card schedule-detail-card-strong">
      <div class="schedule-detail-label">${escapeHtml(t("heroServerLabel"))}</div>
      <div class="schedule-detail-value">${escapeHtml(server.name || server.full_name || t("unknownValue"))}</div>
    </article>
    <article class="schedule-detail-card schedule-detail-card-strong">
      <div class="schedule-detail-label">${escapeHtml(t("heroPasswordLabel"))}</div>
      <div class="schedule-detail-value">${escapeHtml(server.password || t("passwordNone"))}</div>
    </article>
    <article class="schedule-detail-card">
      <div class="schedule-detail-label">${escapeHtml(t("heroEntryLabel"))}</div>
      <div class="schedule-detail-copy">${escapeHtml(buildEntryRules(server))}</div>
    </article>
    <article class="schedule-detail-card">
      <div class="schedule-detail-label">${escapeHtml(t("heroFormatLabel"))}</div>
      <div class="schedule-detail-copy">${escapeHtml(buildRaceFormat(session))}</div>
    </article>
    <article class="schedule-detail-card">
      <div class="schedule-detail-label">${escapeHtml(t("heroPitstopLabel"))}</div>
      <div class="schedule-detail-copy">${escapeHtml(buildPitstopRules(rules))}</div>
    </article>
    <article class="schedule-detail-card">
      <div class="schedule-detail-label">${escapeHtml(t("heroMandatoryLabel"))}</div>
      <div class="schedule-detail-copy">${escapeHtml(buildMandatoryActions(rules))}</div>
    </article>
    <article class="schedule-detail-card schedule-detail-card-weather">
      <div class="schedule-detail-label">${escapeHtml(t("heroWeatherLabel"))}</div>
      <div class="schedule-detail-value">${escapeHtml(buildWeatherSummary(weather))}</div>
    </article>
  `;
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
function normalizeEventId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function buildSlotEventId(item) {
  const explicitId = normalizeEventId(item?.event_id);
  if (explicitId) return explicitId;
  const date = String(item?.date || "").trim();
  const time = String(item?.start_time_local || "").trim().replace(":", "");
  const trackCode = normalizeEventId(item?.track_code || item?.track_name || "slot");
  return normalizeEventId(`hourly_${date}_${time}_${trackCode}`);
}
function getBrowserVoterId() {
  const storageKey = "hourlyVoteVoterId";
  let value = localStorage.getItem(storageKey);
  if (!value) {
    value = `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(storageKey, value);
  }
  return value;
}
function getVoteLabel(count) {
  if (typeof count !== "number" || count <= 0) return t("voteCountZero");
  return tf(count === 1 ? "voteCountOne" : "voteCountMany", { value: count });
}
function getVoteState(item) {
  const eventId = buildSlotEventId(item);
  return {
    eventId,
    pending: pendingVoteEventIds.has(eventId),
    ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false })
  };
}
async function loadVotesForSchedule(items) {
  if (!votesApiBase) {
    votesEnabled = false;
    voteStateByEventId = {};
    return;
  }
  const eventIds = items.map(buildSlotEventId).filter(Boolean);
  if (!eventIds.length) return;
  try {
    const url = new URL("/votes", votesApiBase);
    url.searchParams.set("event_ids", eventIds.join(","));
    url.searchParams.set("voter_id", getBrowserVoterId());
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.items && typeof payload.items === "object") {
      voteStateByEventId = payload.items;
      votesEnabled = true;
    }
  } catch (error) {
    console.error(error);
    votesEnabled = false;
    voteStateByEventId = {};
  }
}
async function submitVote(item) {
  if (!votesApiBase) return;
  const eventId = buildSlotEventId(item);
  if (!eventId || pendingVoteEventIds.has(eventId) || voteStateByEventId[eventId]?.already_voted) return;
  pendingVoteEventIds.add(eventId);
  renderScheduleTable(scheduleItems);
  try {
    const response = await fetch(new URL("/vote", votesApiBase), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        event_id: eventId,
        track: getLocalizedField(item, "track_name", item?.track_name || item?.track_code || "-"),
        date: item?.date || "",
        time: item?.start_time_local || "",
        voter_id: getBrowserVoterId()
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    voteStateByEventId[eventId] = {
      event_id: eventId,
      votes: typeof payload?.votes === "number" ? payload.votes : 0,
      already_voted: Boolean(payload?.already_voted)
    };
  } catch (error) {
    console.error(error);
    voteStateByEventId[eventId] = {
      ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false }),
      failed: true
    };
  } finally {
    pendingVoteEventIds.delete(eventId);
    if (selectedScheduleItem && buildSlotEventId(selectedScheduleItem) === eventId) renderScheduleModal();
    renderScheduleTable(scheduleItems);
    renderHeroVote();
  }
}
async function submitUnvote(item) {
  if (!votesApiBase) return;
  const eventId = buildSlotEventId(item);
  if (!eventId || pendingVoteEventIds.has(eventId)) return;
  pendingVoteEventIds.add(eventId);
  renderScheduleTable(scheduleItems);
  renderHeroVote();
  try {
    const response = await fetch(new URL("/unvote", votesApiBase), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        event_id: eventId,
        voter_id: getBrowserVoterId()
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    voteStateByEventId[eventId] = {
      event_id: eventId,
      votes: typeof payload?.votes === "number" ? payload.votes : 0,
      already_voted: Boolean(payload?.already_voted)
    };
  } catch (error) {
    console.error(error);
    voteStateByEventId[eventId] = {
      ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false }),
      failed: true
    };
  } finally {
    pendingVoteEventIds.delete(eventId);
    if (selectedScheduleItem && buildSlotEventId(selectedScheduleItem) === eventId) renderScheduleModal();
    renderScheduleTable(scheduleItems);
    renderHeroVote();
  }
}
function buildVoteControls(item, context = "card") {
  const voteState = getVoteState(item);
  const voteCountLabel = voteState.failed
    ? t("voteFailed")
    : voteState.pending
      ? t("voteSending")
      : votesEnabled
        ? getVoteLabel(voteState.votes)
        : t("voteSoon");
  const baseClass = context === "hero" ? "hero-vote" : "schedule-event-vote";
  return `
    <div class="${baseClass}">
      <div class="${baseClass}-actions">
        <button
          class="${baseClass}-btn${voteState.already_voted ? " is-voted" : ""}"
          type="button"
          data-vote-event-id="${escapeHtml(voteState.eventId)}"
          ${(!votesEnabled || voteState.already_voted || voteState.pending) ? "disabled" : ""}
        >
          <span>${escapeHtml(voteState.already_voted ? t("voteButtonDone") : t("voteButton"))}</span>
          <span class="${baseClass}-icon" aria-hidden="true">♥</span>
        </button>
        ${
          voteState.already_voted
            ? `
              <button
                class="${baseClass}-cancel"
                type="button"
                data-unvote-event-id="${escapeHtml(voteState.eventId)}"
                aria-label="${escapeHtml(t("unvoteButton"))}"
                ${voteState.pending ? "disabled" : ""}
              >×</button>
            `
            : ""
        }
      </div>
      <div class="${baseClass}-meta">${escapeHtml(voteCountLabel)}</div>
    </div>
  `;
}
function bindVoteControls(root = document) {
  root.querySelectorAll("[data-vote-event-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const eventId = button.dataset.voteEventId;
      const item = scheduleItems.find(row => buildSlotEventId(row) === eventId);
      if (item) void submitVote(item);
    });
  });
  root.querySelectorAll("[data-unvote-event-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const eventId = button.dataset.unvoteEventId;
      const item = scheduleItems.find(row => buildSlotEventId(row) === eventId);
      if (item) void submitUnvote(item);
    });
  });
}
function renderHeroVote() {
  const container = document.getElementById("hero-vote");
  if (!container) return;
  const firstSlot = scheduleItems[0] || null;
  if (!firstSlot) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = buildVoteControls(firstSlot, "hero");
  bindVoteControls(container);
}
function applyHeroTrackBackground(trackCode) {
  const heroCard = document.querySelector(".hero-card");
  if (!heroCard) return;
  const backgroundUrl = HERO_TRACK_BACKGROUNDS[String(trackCode || "").trim().toLowerCase()];
  heroCard.style.setProperty("--hero-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}
function applyScheduleModalTrackBackground(trackCode) {
  const modalCard = document.querySelector("#schedule-modal .modal-card-slot");
  if (!modalCard) return;
  const backgroundUrl = HERO_TRACK_BACKGROUNDS[String(trackCode || "").trim().toLowerCase()];
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}
function applyRaceModalTrackBackground(trackCode) {
  const modalCard = document.querySelector("#race-results-modal .modal-card-race");
  if (!modalCard) return;
  const backgroundUrl = HERO_TRACK_BACKGROUNDS[String(trackCode || "").trim().toLowerCase()];
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
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
  applyHeroTrackBackground(data?.track_code);
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
function renderScheduleTable(rows) {
  const container = document.getElementById("schedule-list");
  if (!container) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("scheduleEmpty"))}</div>`;
    return;
  }
  const cardsHtml = rows.slice(0, 3).map((row, index) => {
    const trackCode = String(row?.track_code || "").trim().toLowerCase();
    const backgroundUrl = HERO_TRACK_BACKGROUNDS[trackCode];
    return `
      <article
        class="schedule-event-card is-interactive-row"
        data-schedule-index="${index}"
        tabindex="0"
        role="button"
        aria-label="${escapeHtml(`${t("openScheduleDetailsLabel")}: ${row.track_name || row.track_code || "-"}`)}"
        style="--schedule-track-photo: ${backgroundUrl ? `url('${escapeHtml(backgroundUrl)}')` : "none"};"
      >
        <div class="schedule-event-card-inner">
          <div class="schedule-event-time">${escapeHtml(formatScheduleCardDateTime(row))}</div>
          <div class="schedule-event-track">${escapeHtml(getLocalizedField(row, "track_name", row.track_name || "--"))}</div>
          <div class="schedule-event-weather"><span>${escapeHtml(buildScheduleCardWeather(row))}</span><img src="./assets/weather/rain.png" alt="" /></div>
          ${buildVoteControls(row, "card")}
        </div>
      </article>
    `;
  }).join("");
  container.innerHTML = `<div class="schedule-cards-grid">${cardsHtml}</div>`;
  container.querySelectorAll(".schedule-event-card[data-schedule-index]").forEach(card => {
    const openCard = () => openScheduleModal(scheduleItems[Number(card.dataset.scheduleIndex)] || null);
    card.addEventListener("click", event => { if (!event.target.closest("a")) openCard(); });
    card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCard(); } });
  });
  bindVoteControls(container);
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
    applyRaceModalTrackBackground("");
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    summaryEl.innerHTML = "";
    tableEl.innerHTML = `<div class="empty">${escapeHtml(t("recentEmpty"))}</div>`;
    return;
  }
  applyRaceModalTrackBackground(selectedRace.track);
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
function renderScheduleModal() {
  const titleEl = document.getElementById("schedule-modal-title");
  const subtitleEl = document.getElementById("schedule-modal-subtitle");
  const detailsEl = document.getElementById("schedule-modal-details");
  if (!titleEl || !subtitleEl || !detailsEl) return;
  if (!selectedScheduleItem) {
    applyScheduleModalTrackBackground("");
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    detailsEl.innerHTML = `<div class="empty">${escapeHtml(t("scheduleEmpty"))}</div>`;
    return;
  }
  applyScheduleModalTrackBackground(selectedScheduleItem.track_code);
  titleEl.textContent = getLocalizedField(selectedScheduleItem, "track_name", selectedScheduleItem.track_name || "--");
  subtitleEl.textContent = formatScheduleDateTime(selectedScheduleItem);
  detailsEl.innerHTML = buildScheduleModalDetails(selectedScheduleItem);
}
function openModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderRaceResultsModal();
}
function openScheduleModal(item) {
  const modal = document.getElementById("schedule-modal");
  if (!modal || !item) return;
  selectedScheduleItem = item;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderScheduleModal();
}
function closeModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  selectedRace = null;
  applyRaceModalTrackBackground("");
}
function closeScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  selectedScheduleItem = null;
  applyScheduleModalTrackBackground("");
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
function bindScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  const closeButton = document.getElementById("schedule-modal-close");
  if (closeButton) closeButton.addEventListener("click", closeScheduleModal);
  if (modal) {
    modal.addEventListener("click", event => { if (event.target === modal) closeScheduleModal(); });
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
    if (event.key !== "Escape") return;
    if (document.getElementById("schedule-modal")?.classList.contains("is-open")) closeScheduleModal();
    if (document.getElementById("race-results-modal")?.classList.contains("is-open")) closeModal();
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
  applyHeroTrackBackground("");
}
function renderUI() {
  applyTranslations();
  if (hasLoadError) {
    renderErrorState();
    return;
  }
  renderAnnouncement(announcementData || {});
  renderHeroDetails(announcementData || {});
  renderHeroVote();
  renderScheduleTable(scheduleItems);
  renderRecentRaces(recentRaceItems);
  renderScheduleModal();
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
  bindScheduleModal();
  bindRaceModal();
  renderUI();
  try {
    const [announcement, schedule, recentRaces] = await Promise.all([loadJson(announcementUrl), loadJson(scheduleUrl), loadJson(recentRacesUrl)]);
    announcementData = announcement || {};
    scheduleItems = Array.isArray(schedule?.items) ? schedule.items : [];
    recentRaceItems = Array.isArray(recentRaces?.items) ? recentRaces.items : [];
    await loadVotesForSchedule(scheduleItems.slice(0, 3));
    hasLoadError = false;
    renderUI();
  } catch (error) {
    console.error(error);
    hasLoadError = true;
    renderUI();
  }
}

document.addEventListener("DOMContentLoaded", init);
