const params = new URLSearchParams(window.location.search);

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

const isAsgPublicSite = /(^|\.)asgracing\.ru$/i.test(window.location.hostname);
const isLocalDevHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
const defaultDataBase = isAsgPublicSite
  ? "https://data.asgracing.ru/hourly-data"
  : isLocalDevHost
    ? "https://data.asgracing.ru/hourly-data"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/hourly-data"
    : "/hourly-data";
const dataBase = normalizeBaseUrl(params.get("hourlyApiBase")) || defaultDataBase;
const githubDataBase = "https://asgracing.github.io/hourly-data";
const hourlyAssetBase = "https://asgracing.github.io/hourly/assets";
const votesApiBase = "https://hourly-votes.asgracing.workers.dev";
const VOTE_STATE_STORAGE_KEY = "hourlyVoteStateByEventId";
const VOTE_STATE_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let currentLang = localStorage.getItem("asgLang") || (((navigator.language || "").toLowerCase().startsWith("ru")) ? "ru" : "en");

const translations = {
  en: {
    locale: "en-GB",
    navHourly: "Hourly Race",
    navChampionship: "Championship",
    navStandings: "Standings",
    navPastRaces: "Past races",
    navMore: "More",
    navMoreAriaLabel: "Open extra navigation",
    championship: "Championship",
    championshipEvent: "Championship Event",
    activeChampionship: "Active ASG Racing championship.",
    loadError: "Failed to load championship data.",
    upcomingEyebrow: "Upcoming",
    upcomingTitle: "Upcoming races",
    winnersTitle: "Winners",
    winnersEyebrow: "Final top 3",
    noUpcoming: "No upcoming championship races yet.",
    noResults: "No championship results yet.",
    noRaceResults: "No completed championship races yet.",
    noPrizes: "Prize images are not uploaded yet.",
    prizesEyebrow: "Prizes",
    prizesTitle: "Rewards",
    standingsEyebrow: "Standings",
    standingsTitle: "Championship results",
    raceResultsEyebrow: "Archive",
    raceResultsTitle: "Championship race results",
    completed: "completed races",
    upcoming: "upcoming races",
    drivers: "drivers scored",
    status: "status",
    dateTime: "Date & time",
    track: "Track",
    weather: "Weather",
    format: "Format",
    conditions: "Conditions",
    closeLabel: "Close",
    position: "Position",
    driver: "Full name",
    total: "Total points",
    points: "points",
    winner: "Winner",
    bestLap: "Best lap",
    participants: "Drivers",
    weatherClear: "Clear",
    weatherMixed: "Mixed clouds",
    weatherCloudy: "Cloudy",
    weatherWet: "Wet risk",
    weatherTemp: "{value}C",
    weatherTempHintTitle: "Ambient temperature",
    weatherTempHintBody: "Air temperature around the session start: {value}C. It affects tyre warm-up and overall grip.",
    weatherCloudsHintTitle: "Cloud cover",
    weatherCloudsHintBody: "{value}% cloud cover expected for this slot. More clouds usually mean a cooler, flatter track.",
    weatherRainHintTitle: "Rain chance",
    weatherRainHintBody: "{value}% rain probability for this slot. Higher values mean a greater chance of wet conditions.",
    weatherRandomHintTitle: "Weather randomness",
    weatherRandomHintBody: "Randomness level {value}. Higher values make the weather less predictable during the event.",
    heroServerLabel: "Server",
    heroPasswordLabel: "Password",
    heroPitstopLabel: "Pitstop",
    heroRefuelLabel: "Refuel",
    heroTyresLabel: "Tyres",
    labelDate: "Date",
    labelTime: "Time",
    entrySlots: "{value} slots",
    entrySafety: "SA {value}+",
    entryTrackMedals: "Track medals {value}",
    entryRacecraft: "RC {value}+",
    pitWindow: "window {value}m",
    pitNone: "No mandatory pitstop",
    pitMandatory: "{value} mandatory",
    pitRefuelAllowed: "refuelling allowed",
    pitRefuelFixed: "fixed refuel time",
    refuelMandatory: "mandatory refuel",
    refuelNone: "no refuel rules",
    tyresMandatory: "mandatory tyre change",
    tyresSets: "{value} sets",
    tyresNone: "no tyre rules",
    passwordNone: "No password",
    eventDetailsLink: "Open event details",
    voteButton: "I want to race!",
    voteButtonDone: "You're in",
    voteCountZero: "No votes yet",
    voteCountOne: "{value} wants to race",
    voteCountMany: "{value} want to race",
    voteSoon: "Voting soon",
    voteSending: "Saving...",
    voteFailed: "Try again",
    unvoteButton: "Remove vote",
    unknown: "--"
  },
  ru: {
    locale: "ru-RU",
    navHourly: "Часовая гонка",
    navChampionship: "Чемпионат",
    navStandings: "Таблица",
    navPastRaces: "Прошедшие гонки",
    navMore: "Еще",
    navMoreAriaLabel: "Открыть дополнительную навигацию",
    championship: "Чемпионат",
    championshipEvent: "Событие чемпионата",
    activeChampionship: "Активный чемпионат ASG Racing.",
    loadError: "Не удалось загрузить данные чемпионата.",
    upcomingEyebrow: "Календарь",
    upcomingTitle: "Предстоящие гонки",
    winnersTitle: "Победители",
    winnersEyebrow: "Итоговый топ 3",
    noUpcoming: "Ближайшие гонки чемпионата пока не опубликованы.",
    noResults: "Результатов чемпионата пока нет.",
    noRaceResults: "Завершенных гонок чемпионата пока нет.",
    noPrizes: "Картинки призов пока не загружены.",
    prizesEyebrow: "Призы",
    prizesTitle: "Награды",
    standingsEyebrow: "Таблица",
    standingsTitle: "Результаты чемпионата",
    raceResultsEyebrow: "Архив",
    raceResultsTitle: "Результаты гонок чемпионата",
    completed: "гонок завершено",
    upcoming: "гонок впереди",
    drivers: "пилотов в таблице",
    status: "статус",
    dateTime: "Дата и время",
    track: "Трасса",
    weather: "Погода",
    format: "Формат",
    conditions: "Условия",
    closeLabel: "Закрыть",
    position: "Позиция",
    driver: "Имя фамилия",
    total: "Итого очков",
    points: "очков",
    winner: "Победитель",
    bestLap: "Лучший круг",
    participants: "Пилоты",
    weatherClear: "Ясно",
    weatherMixed: "Переменная облачность",
    weatherCloudy: "Облачно",
    weatherWet: "Есть риск дождя",
    weatherTemp: "{value}C",
    weatherTempHintTitle: "Температура воздуха",
    weatherTempHintBody: "Температура воздуха к началу сессии: {value}C. Она влияет на прогрев шин и общий уровень сцепления.",
    weatherCloudsHintTitle: "Облачность",
    weatherCloudsHintBody: "Ожидаемая облачность для этого слота: {value}%. Чем ее больше, тем прохладнее и ровнее покрытие.",
    weatherRainHintTitle: "Вероятность дождя",
    weatherRainHintBody: "Вероятность дождя для этого слота: {value}%. Чем выше значение, тем больше шанс влажной трассы.",
    weatherRandomHintTitle: "Рандомность погоды",
    weatherRandomHintBody: "Уровень рандомности: {value}. Чем он выше, тем менее предсказуемой будет погода по ходу ивента.",
    heroServerLabel: "Сервер",
    heroPasswordLabel: "Пароль",
    heroPitstopLabel: "Пит-стоп",
    heroRefuelLabel: "Заправка",
    heroTyresLabel: "Шины",
    labelDate: "Дата",
    labelTime: "Время",
    entrySlots: "{value} слотов",
    entrySafety: "SA {value}+",
    entryTrackMedals: "Медали трассы {value}",
    entryRacecraft: "RC {value}+",
    pitWindow: "окно {value}м",
    pitNone: "Без обязательного пит-стопа",
    pitMandatory: "{value} обязат.",
    pitRefuelAllowed: "дозаправка разрешена",
    pitRefuelFixed: "фикс. время дозаправки",
    refuelMandatory: "обязат. дозаправка",
    refuelNone: "без правил по заправке",
    tyresMandatory: "обязат. смена шин",
    tyresSets: "{value} компл.",
    tyresNone: "без правил по шинам",
    passwordNone: "Без пароля",
    eventDetailsLink: "Открыть детали события",
    unknown: "--"
  }
};

const TRACK_BACKGROUNDS = {
  monza: `${hourlyAssetBase}/tracks/monza.jpg`,
  monzatg: `${hourlyAssetBase}/tracks/monzaTG.jpg`,
  "monza-tg": `${hourlyAssetBase}/tracks/monzaTG.jpg`,
  silverstone: `${hourlyAssetBase}/tracks/silverstone.jpg`,
  spa: `${hourlyAssetBase}/tracks/spa.jpg`,
  nurburgring: `${hourlyAssetBase}/tracks/nurburgring.jpg`
};
const WEATHER_ICON_PATHS = {
  clouds: `${hourlyAssetBase}/weather/cloudness.png`,
  rain: `${hourlyAssetBase}/weather/rain.png`,
  random: `${hourlyAssetBase}/weather/random.png`
};
let championshipAnnouncementData = {};
let championshipUpcomingItems = [];
let selectedScheduleItem = null;
let votesLoaded = false;
let voteStateByEventId = loadStoredVoteState();
const pendingVoteEventIds = new Set();

const ruVoteTranslations = {
  voteButton: "\u042f \u0445\u043e\u0447\u0443 \u043f\u043e\u0435\u0445\u0430\u0442\u044c!",
  voteButtonDone: "\u0422\u044b \u0432 \u0441\u043f\u0438\u0441\u043a\u0435",
  voteCountZero: "\u041f\u043e\u043a\u0430 \u043d\u0438\u043a\u0442\u043e \u043d\u0435 \u043e\u0442\u043c\u0435\u0442\u0438\u043b\u0441\u044f",
  voteCountOne: "{value} \u0445\u043e\u0447\u0435\u0442 \u043f\u043e\u0435\u0445\u0430\u0442\u044c",
  voteCountMany: "{value} \u0445\u043e\u0442\u044f\u0442 \u043f\u043e\u0435\u0445\u0430\u0442\u044c",
  voteSoon: "\u041e\u043f\u0440\u043e\u0441 \u0441\u043a\u043e\u0440\u043e",
  voteSending: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...",
  voteFailed: "\u041f\u043e\u0432\u0442\u043e\u0440\u0438 \u043f\u043e\u0437\u0436\u0435",
  unvoteButton: "\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u0433\u043e\u043b\u043e\u0441"
};

function t(key) {
  if (currentLang === "ru" && ruVoteTranslations[key]) return ruVoteTranslations[key];
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

function tf(key, replacements = {}) {
  return Object.entries(replacements).reduce((text, [name, value]) => (
    text.replaceAll(`{${name}}`, String(value))
  ), t(key));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function normalizeEventId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalizeSlotEventId(value) {
  const normalized = normalizeEventId(value);
  const match = normalized.match(/^hourly_(\d{4}-\d{2}-\d{2})_(\d{4})(?:_.+)?$/);
  return match ? `hourly_${match[1]}_${match[2]}` : normalized;
}

function buildSlotEventId(item) {
  const explicitId = canonicalizeSlotEventId(item?.event_id);
  if (explicitId) return explicitId;
  const date = String(item?.date || "").trim();
  const time = String(item?.start_time_local || "").trim().replace(/[^0-9]/g, "");
  if (!date || !time) return "";
  return normalizeEventId(`hourly_${date}_${time}`);
}

function getBrowserVoterId() {
  const storageKey = "hourlyVoteVoterId";
  const existing = localStorage.getItem(storageKey);
  const now = Date.now();
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed.value === "string" && parsed.value.trim()) {
        if (!parsed.expiresAt || Number(parsed.expiresAt) > now) {
          return parsed.value.trim();
        }
      }
    } catch {
      if (existing.trim()) {
        localStorage.setItem(storageKey, JSON.stringify({
          value: existing.trim(),
          createdAt: now,
          expiresAt: now + 365 * 24 * 60 * 60 * 1000
        }));
        return existing.trim();
      }
    }
  }
  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(storageKey, JSON.stringify({
    value: next,
    createdAt: now,
    expiresAt: now + 365 * 24 * 60 * 60 * 1000
  }));
  return next;
}

function loadStoredVoteState() {
  try {
    const rawValue = localStorage.getItem(VOTE_STATE_STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return {};
    if (parsed.expiresAt && Number(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(VOTE_STATE_STORAGE_KEY);
      return {};
    }
    return parsed.items && typeof parsed.items === "object" ? parsed.items : {};
  } catch {
    return {};
  }
}

function normalizeVoteStateItems(items) {
  return Object.fromEntries(
    Object.entries(items || {})
      .filter(([eventId, state]) => eventId && state && typeof state === "object")
      .map(([eventId, state]) => [
        eventId,
        {
          event_id: state.event_id || eventId,
          votes: typeof state.votes === "number" ? state.votes : 0,
          already_voted: Boolean(state.already_voted)
        }
      ])
  );
}

function saveStoredVoteState(state) {
  try {
    localStorage.setItem(
      VOTE_STATE_STORAGE_KEY,
      JSON.stringify({
        items: normalizeVoteStateItems(state),
        updatedAt: Date.now(),
        expiresAt: Date.now() + VOTE_STATE_STORAGE_TTL_MS
      })
    );
  } catch {
    // Ignore storage quota/privacy mode failures; the worker remains the source of truth.
  }
}

function mergeVoteStateItems(items) {
  voteStateByEventId = {
    ...voteStateByEventId,
    ...normalizeVoteStateItems(items)
  };
  saveStoredVoteState(voteStateByEventId);
}

function syncVoteStateFromStorage() {
  voteStateByEventId = loadStoredVoteState();
  if (Array.isArray(championshipUpcomingItems) && championshipUpcomingItems.length) {
    renderUpcoming(championshipUpcomingItems, []);
  }
  if (selectedScheduleItem && typeof renderScheduleModal === "function") {
    renderScheduleModal();
  }
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

function isVotingDisabledForItem(item) {
  return Boolean(item?.voting_disabled);
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadJsonOrNull(url) {
  try {
    return await loadJson(url);
  } catch (error) {
    return null;
  }
}

async function loadVotesForSchedule(items) {
  const eventIds = items.filter(item => !isVotingDisabledForItem(item)).map(buildSlotEventId).filter(Boolean);
  if (!eventIds.length) return;
  try {
    const url = new URL("/votes", votesApiBase);
    url.searchParams.set("event_ids", [...new Set(eventIds)].join(","));
    url.searchParams.set("voter_id", getBrowserVoterId());
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.items && typeof payload.items === "object") {
      mergeVoteStateItems(payload.items);
      votesLoaded = true;
    }
  } catch (error) {
    console.warn("championship votes are unavailable.", error);
  }
}

async function submitVote(item) {
  const eventId = buildSlotEventId(item);
  if (!eventId || pendingVoteEventIds.has(eventId) || isVotingDisabledForItem(item)) return;
  pendingVoteEventIds.add(eventId);
  renderUpcoming(championshipUpcomingItems, []);
  try {
    const voteState = voteStateByEventId[eventId] || {};
    const endpoint = voteState.already_voted ? "/unvote" : "/vote";
    const body = voteState.already_voted
      ? {
          event_id: eventId,
          voter_id: getBrowserVoterId()
        }
      : {
          event_id: eventId,
          track: getLocalizedField(item, "track_name", item?.track_name || item?.track_code || "-"),
          date: item?.date || "",
          time: item?.start_time_local || "",
          voter_id: getBrowserVoterId()
        };
    const response = await fetch(new URL(endpoint, votesApiBase), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    voteStateByEventId[eventId] = {
      event_id: eventId,
      votes: typeof payload?.votes === "number" ? payload.votes : 0,
      already_voted: Boolean(payload?.already_voted)
    };
    mergeVoteStateItems({ [eventId]: voteStateByEventId[eventId] });
  } catch (error) {
    console.warn("championship vote failed.", error);
    voteStateByEventId[eventId] = {
      ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false }),
      failed: true
    };
  } finally {
    pendingVoteEventIds.delete(eventId);
    renderUpcoming(championshipUpcomingItems, []);
  }
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

function getLocalizedDescription(...sources) {
  for (const source of sources) {
    const value = getLocalizedField(source, "description", "");
    if (value && value !== "--") return value;
    const i18n = source?.description_i18n || source?.description_localized || source?.descriptions;
    if (i18n && typeof i18n === "object") {
      const localized = i18n[currentLang] ?? i18n.en ?? i18n.ru;
      if (typeof localized === "string" && localized.trim()) return localized.trim();
    }
  }
  return "";
}

function resolveHourlyAssetUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (/^(https?:)?\/\//i.test(rawValue)) return rawValue;
  if (rawValue.startsWith("/hourly/assets/")) return `https://asgracing.github.io${rawValue}`;
  if (rawValue.startsWith("/")) return rawValue;
  const assetPath = rawValue.replace(/^(\.\.\/|\.\/)?assets\//, "").replace(/^\.?\//, "");
  return `${hourlyAssetBase}/${assetPath}`;
}

function resolveTrackBackground(item) {
  const directValue = item?.track_image || item?.track_photo || item?.background_image || item?.image;
  if (directValue) return resolveHourlyAssetUrl(directValue);
  const trackCode = String(item?.track_code || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return TRACK_BACKGROUNDS[trackCode] || TRACK_BACKGROUNDS[trackCode.replace(/-/g, "")] || "";
}

function isChampionshipEvent(item) {
  return String(item?.event_type || item?.type || "").trim().toLowerCase() === "championship";
}

function formatDate(isoDate) {
  if (!isoDate) return t("unknown");
  const date = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(t("locale"), { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(date);
}

function formatSlotDateTime(item) {
  const startTime = getLocalizedField(item, "start_time_local", item?.start_time_local || t("unknown"));
  const timezone = getLocalizedField(item, "timezone", item?.timezone || "UTC+3");
  return `${formatDate(item?.date)} · ${startTime} ${timezone}`;
}

function percentValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const normalized = value <= 1 ? value * 100 : value;
  return Math.round(normalized);
}

function weatherLabel(weather) {
  const state = String(weather?.summary_key || "").trim().toLowerCase();
  const stateLabel = state === "clear" ? t("weatherClear")
    : state === "mixed" ? t("weatherMixed")
      : state === "cloudy" ? t("weatherCloudy")
        : state === "wet" ? t("weatherWet")
          : "";
  const rain = percentValue(weather?.rain_level);
  if (stateLabel && rain !== null) return `${stateLabel} · ${rain}%`;
  return stateLabel || (rain !== null ? `${rain}%` : t("unknown"));
}

function raceEventId(race, index) {
  return race?.event_id || `race_${index + 1}`;
}

function normalizeRaces(data) {
  return (Array.isArray(data?.races) ? data.races : []).slice().sort((a, b) => String(a.finished_at || a.date || "").localeCompare(String(b.finished_at || b.date || "")));
}

function normalizeStandings(data) {
  return (Array.isArray(data?.standings) ? data.standings : []).slice().sort((a, b) => {
    const pointsDelta = Number(b.points || 0) - Number(a.points || 0);
    if (pointsDelta) return pointsDelta;
    return String(a.driver || a.public_id || "").localeCompare(String(b.driver || b.public_id || ""));
  });
}

function normalizeUpcoming(data, schedule, slug) {
  const source = Array.isArray(data?.upcoming_races) && data.upcoming_races.length
    ? data.upcoming_races
    : (Array.isArray(schedule?.items) ? schedule.items : []);
  const scheduleByEventId = new Map(
    (Array.isArray(schedule?.items) ? schedule.items : [])
      .filter(item => item?.event_id)
      .map(item => [item.event_id, item])
  );
  return source
    .filter(isChampionshipEvent)
    .filter(item => !slug || !item?.championship_slug || item.championship_slug === slug)
    .map(item => {
      const scheduleItem = item?.event_id ? scheduleByEventId.get(item.event_id) : null;
      return scheduleItem ? { ...item, ...scheduleItem } : item;
    })
    .slice(0, 6);
}

function compactJoin(values, separator = " · ") {
  return values.filter(value => value !== null && value !== undefined && String(value).trim()).join(separator);
}

function buildWeatherDetails(weather) {
  const rain = percentValue(weather?.rain_level);
  const clouds = percentValue(weather?.cloud_level);
  const temp = typeof weather?.ambient_temp_c === "number" ? `${Math.round(weather.ambient_temp_c)}C` : "";
  const randomness = weather?.weather_randomness != null ? `${weather.weather_randomness}` : "";
  return compactJoin([
    weatherLabel(weather || {}),
    temp,
    clouds !== null ? `${clouds}% clouds` : "",
    rain !== null ? `${rain}% rain` : "",
    randomness ? `random ${randomness}` : ""
  ]);
}

function createHeroToken(label, tone = "default", icon = "", tooltipTitle = "", tooltipBody = "") {
  return { label, tone, icon, tooltipTitle, tooltipBody };
}

function renderHeroTokenGroups(groups) {
  const tokens = (groups || []).flatMap(group => (group || []).filter(token => token && token.label));
  const normalizedTokens = tokens.length ? tokens : [createHeroToken(t("unknown"), "muted")];
  return `<div class="hero-token-list">${normalizedTokens.map(token => {
    const hasTooltip = token.tooltipTitle || token.tooltipBody;
    return `<span class="hero-token hero-token-${esc(token.tone || "default")}${hasTooltip ? " hero-token-has-tooltip" : ""}"${hasTooltip ? ' tabindex="0"' : ""}>${token.icon ? `<img class="hero-token-icon" src="${esc(token.icon)}" alt="" aria-hidden="true" />` : ""}<span class="hero-token-text">${esc(token.label)}</span>${hasTooltip ? `<span class="hero-token-tooltip" role="tooltip">${token.icon ? `<img class="hero-token-tooltip-icon" src="${esc(token.icon)}" alt="" aria-hidden="true" />` : ""}<span class="hero-token-tooltip-copy"><span class="hero-token-tooltip-title">${esc(token.tooltipTitle || token.label)}</span>${token.tooltipBody ? `<span class="hero-token-tooltip-body">${esc(token.tooltipBody)}</span>` : ""}</span></span>` : ""}</span>`;
  }).join("")}</div>`;
}

function formatMandatoryPitstopCount(value) {
  const count = Number(value || 0);
  return count > 0 ? tf("pitMandatory", { value: count }) : t("pitNone");
}

function buildEntryTokenGroups(server) {
  if (!server || typeof server !== "object") return [];
  const tokens = [];
  if (server.car_group) tokens.push(createHeroToken(server.car_group, "primary"));
  if (typeof server.max_car_slots === "number" && server.max_car_slots > 0) tokens.push(createHeroToken(tf("entrySlots", { value: server.max_car_slots }), "default"));
  if (typeof server.safety_rating_requirement === "number" && server.safety_rating_requirement > 0) tokens.push(createHeroToken(tf("entrySafety", { value: server.safety_rating_requirement }), "muted"));
  if (typeof server.track_medals_requirement === "number" && server.track_medals_requirement > 0) tokens.push(createHeroToken(tf("entryTrackMedals", { value: server.track_medals_requirement }), "muted"));
  if (typeof server.racecraft_rating_requirement === "number" && server.racecraft_rating_requirement > 0) tokens.push(createHeroToken(tf("entryRacecraft", { value: server.racecraft_rating_requirement }), "muted"));
  return [tokens];
}

function buildRaceFormatTokenGroups(session) {
  if (!session || typeof session !== "object") return [];
  const primary = [];
  if (typeof session.qualifying_duration_minutes === "number" && session.qualifying_duration_minutes > 0) primary.push(createHeroToken(`Q ${session.qualifying_duration_minutes}m`, "primary"));
  if (typeof session.race_duration_minutes === "number" && session.race_duration_minutes > 0) primary.push(createHeroToken(`R ${session.race_duration_minutes}m`, "primary"));
  if (!primary.length && session.format_label) {
    session.format_label.split(" + ").map(part => part.trim()).filter(Boolean).forEach(part => primary.push(createHeroToken(part, "primary")));
  }
  return [primary];
}

function buildPitstopTokenGroups(rules) {
  if (!rules || typeof rules !== "object") return [];
  const primary = [createHeroToken(formatMandatoryPitstopCount(rules.mandatory_pitstop_count), rules.mandatory_pitstop_count > 0 ? "primary" : "muted")];
  const secondary = [];
  if (typeof rules.pit_window_length_minutes === "number" && rules.pit_window_length_minutes > 0) secondary.push(createHeroToken(tf("pitWindow", { value: rules.pit_window_length_minutes }), "default"));
  return [primary, secondary];
}

function buildRefuelTokenGroups(rules) {
  if (!rules || typeof rules !== "object") return [];
  const primary = [];
  if (rules.refuelling_allowed_in_race) primary.push(createHeroToken(t("pitRefuelAllowed"), "default"));
  if (rules.refuelling_time_fixed) primary.push(createHeroToken(t("pitRefuelFixed"), "muted"));
  if (rules.mandatory_pitstop_refuelling_required) primary.push(createHeroToken(t("refuelMandatory"), "primary"));
  if (!primary.length) primary.push(createHeroToken(t("refuelNone"), "muted"));
  return [primary];
}

function buildTyreTokenGroups(rules) {
  if (!rules || typeof rules !== "object") return [];
  const primary = [];
  if (rules.mandatory_pitstop_tyre_change_required) primary.push(createHeroToken(t("tyresMandatory"), "primary"));
  if (typeof rules.tyre_set_count === "number" && rules.tyre_set_count > 0) primary.push(createHeroToken(tf("tyresSets", { value: rules.tyre_set_count }), "muted"));
  if (!primary.length) primary.push(createHeroToken(t("tyresNone"), "muted"));
  return [primary];
}

function buildWeatherTokenGroups(weather) {
  if (!weather || typeof weather !== "object") return [];
  const primary = [];
  const secondary = [];
  if (typeof weather.ambient_temp_c === "number") {
    primary.push(createHeroToken(
      tf("weatherTemp", { value: weather.ambient_temp_c }),
      "default",
      "",
      t("weatherTempHintTitle"),
      tf("weatherTempHintBody", { value: weather.ambient_temp_c })
    ));
  }
  const cloudPercent = percentValue(weather.cloud_level);
  if (cloudPercent !== null) {
    secondary.push(createHeroToken(
      `${cloudPercent}%`,
      "muted",
      WEATHER_ICON_PATHS.clouds,
      t("weatherCloudsHintTitle"),
      tf("weatherCloudsHintBody", { value: cloudPercent })
    ));
  }
  const rainPercent = percentValue(weather.rain_level);
  if (rainPercent !== null) {
    secondary.push(createHeroToken(
      `${rainPercent}%`,
      rainPercent > 15 ? "primary" : "muted",
      WEATHER_ICON_PATHS.rain,
      t("weatherRainHintTitle"),
      tf("weatherRainHintBody", { value: rainPercent })
    ));
  }
  if (weather.weather_randomness !== null && weather.weather_randomness !== undefined) {
    secondary.push(createHeroToken(
      String(weather.weather_randomness),
      "muted",
      WEATHER_ICON_PATHS.random,
      t("weatherRandomHintTitle"),
      tf("weatherRandomHintBody", { value: weather.weather_randomness })
    ));
  }
  return [primary, secondary];
}

function renderProgress(data, races, upcoming, standings) {
  const root = document.getElementById("championship-progress");
  if (!root) return;
  const cards = [
    [races.length, t("completed")],
    [upcoming.length, t("upcoming")],
    [standings.length, t("drivers")],
    [data?.status || "active", t("status")]
  ];
  root.innerHTML = cards.map(([value, label]) => `
    <div class="championship-progress-card">
      <div class="championship-progress-value">${esc(value)}</div>
      <div class="championship-progress-label">${esc(label)}</div>
    </div>
  `).join("");
}

function renderWinners(standings) {
  const root = document.getElementById("championship-upcoming");
  if (!root) return;
  const winners = standings.slice(0, 3);
  if (!winners.length) {
    root.innerHTML = `<div class="championship-empty">${esc(t("noResults"))}</div>`;
    return;
  }
  const medals = ["gold", "silver", "bronze"];
  root.innerHTML = winners.map((row, index) => `
    <article class="championship-winner-card is-${medals[index]}">
      <div class="championship-winner-medal">${index + 1}</div>
      <div class="championship-winner-name">${esc(row.driver || row.public_id || "-")}</div>
      <div class="championship-winner-points">${esc(row.points || 0)} ${esc(t("points"))}</div>
    </article>
  `).join("");
}

function renderVoteControl(item) {
  if (isVotingDisabledForItem(item)) return "";
  const voteState = getVoteState(item);
  const voteCountLabel = voteState.failed
    ? t("voteFailed")
    : voteState.pending
      ? t("voteSending")
      : votesLoaded || voteStateByEventId[voteState.eventId]
        ? getVoteLabel(voteState.votes)
        : t("voteSoon");
  return `
    <div class="schedule-event-vote">
      <div class="schedule-event-vote-actions">
        <button
          class="schedule-event-vote-btn${voteState.already_voted ? " is-voted" : ""}"
          type="button"
          data-vote-event-id="${esc(voteState.eventId)}"
          ${voteState.pending ? "disabled" : ""}
        >
          <span class="schedule-event-vote-icon" aria-hidden="true">+</span>
          <span>${esc(voteState.already_voted ? t("voteButtonDone") : t("voteButton"))}</span>
        </button>
        ${
          voteState.already_voted
            ? `<button
                class="schedule-event-vote-cancel"
                type="button"
                data-vote-event-id="${esc(voteState.eventId)}"
                aria-label="${esc(t("unvoteButton"))}"
                ${voteState.pending ? "disabled" : ""}
              >x</button>`
            : ""
        }
      </div>
      <div class="schedule-event-vote-meta">${esc(voteCountLabel)}</div>
    </div>
  `;
}

function renderUpcoming(items, standings) {
  const root = document.getElementById("championship-upcoming");
  const title = document.getElementById("championship-upcoming-title");
  const eyebrow = document.getElementById("championship-upcoming-eyebrow");
  if (!root) return;
  if (!items.length && standings.length) {
    if (title) title.textContent = t("winnersTitle");
    if (eyebrow) eyebrow.textContent = t("winnersEyebrow");
    renderWinners(standings);
    return;
  }
  if (title) title.textContent = t("upcomingTitle");
  if (eyebrow) eyebrow.textContent = t("upcomingEyebrow");
  const upcoming = items.slice(0, 3);
  if (!upcoming.length) {
    root.innerHTML = `<div class="championship-empty">${esc(t("noUpcoming"))}</div>`;
    return;
  }
  championshipUpcomingItems = upcoming;
  root.innerHTML = upcoming.map((item, index) => {
    const backgroundUrl = resolveTrackBackground(item);
    return `
      <article
        class="schedule-event-card is-championship-event is-interactive-row"
        data-schedule-index="${index}"
        tabindex="0"
        role="button"
        aria-label="${esc(`${t("championshipEvent")}: ${getLocalizedField(item, "track_name", item.track_code || t("unknown"))}`)}"
        style="--schedule-track-photo: ${backgroundUrl ? `url('${esc(backgroundUrl)}')` : "none"};"
      >
        <div class="schedule-event-card-inner">
          <div class="event-type-badge">${esc(t("championshipEvent"))}</div>
          <div class="schedule-event-time">${esc(formatSlotDateTime(item))}</div>
          <div class="schedule-event-track">${esc(getLocalizedField(item, "track_name", item.track_code || "--"))}</div>
          <div class="schedule-event-weather"><span>${esc(weatherLabel(item.weather || {}))}</span><img src="${esc(WEATHER_ICON_PATHS.rain)}" alt="" /></div>
          ${renderVoteControl(item)}
        </div>
      </article>
    `;
  }).join("");
  root.querySelectorAll("[data-vote-event-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const eventId = button.dataset.voteEventId;
      const item = championshipUpcomingItems.find(row => buildSlotEventId(row) === eventId);
      if (item) void submitVote(item);
    });
  });
  root.querySelectorAll(".schedule-event-card[data-schedule-index]").forEach(card => {
    const openCard = () => openScheduleModal(championshipUpcomingItems[Number(card.dataset.scheduleIndex)] || null);
    card.addEventListener("click", openCard);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard();
      }
    });
  });
}

function buildScheduleModalDetails(item) {
  const server = championshipAnnouncementData?.server || {};
  const session = championshipAnnouncementData?.session || {};
  const rules = championshipAnnouncementData?.rules || {};
  const weather = item?.weather || championshipAnnouncementData?.weather || {};
  const detailsUrl = item?.details_url ? String(item.details_url) : "";
  return `
    <div class="schedule-modal-hero">
      <section class="hero-server-card schedule-modal-hero-pane">
        <div class="hero-server-stack">
          <div class="hero-server-grid hero-server-grid-rules">
            <div class="hero-server-item">
              <div class="label">${esc(t("heroPitstopLabel"))}</div>
              <div class="value">${renderHeroTokenGroups(buildPitstopTokenGroups(rules))}</div>
            </div>
            <div class="hero-server-item">
              <div class="label">${esc(t("heroRefuelLabel"))}</div>
              <div class="value">${renderHeroTokenGroups(buildRefuelTokenGroups(rules))}</div>
            </div>
            <div class="hero-server-item">
              <div class="label">${esc(t("heroTyresLabel"))}</div>
              <div class="value">${renderHeroTokenGroups(buildTyreTokenGroups(rules))}</div>
            </div>
          </div>
        </div>
      </section>
      <aside class="hero-announcement-card schedule-modal-hero-pane">
        <div class="hero-announcement-inline-meta">
          <div class="stat hero-announcement-inline-stat hero-announcement-inline-stat-combined">
            <div class="value">${renderHeroTokenGroups(buildEntryTokenGroups(server))}</div>
            <div class="hero-announcement-inline-divider" aria-hidden="true"></div>
            <div class="value">${renderHeroTokenGroups(buildRaceFormatTokenGroups(session))}</div>
          </div>
        </div>
        <div class="hero-announcement-weather has-token-value">
          <div class="label">${esc(t("weather"))}</div>
          <div class="value">${renderHeroTokenGroups(buildWeatherTokenGroups(weather))}</div>
        </div>
      </aside>
      ${detailsUrl ? `<a class="event-details-link" href="${esc(detailsUrl)}">${esc(t("eventDetailsLink"))}</a>` : ""}
    </div>
  `;
}

function applyScheduleModalTrackBackground(itemOrTrackCode) {
  const modalCard = document.querySelector("#schedule-modal .modal-card-slot");
  if (!modalCard) return;
  const backgroundUrl = itemOrTrackCode && typeof itemOrTrackCode === "object"
    ? resolveTrackBackground(itemOrTrackCode)
    : TRACK_BACKGROUNDS[String(itemOrTrackCode || "").trim().toLowerCase()];
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
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
    detailsEl.innerHTML = "";
    return;
  }
  applyScheduleModalTrackBackground(selectedScheduleItem);
  titleEl.textContent = getLocalizedField(selectedScheduleItem, "track_name", selectedScheduleItem.track_code || t("unknown"));
  const server = championshipAnnouncementData?.server || {};
  const startTime = getLocalizedField(selectedScheduleItem, "start_time_local", selectedScheduleItem?.start_time_local || "--");
  const timezone = getLocalizedField(selectedScheduleItem, "timezone", selectedScheduleItem?.timezone || "UTC+3");
  subtitleEl.innerHTML = `
    <span class="schedule-modal-subtitle-grid">
      <span class="schedule-modal-subtitle-card">
        <span class="schedule-modal-subtitle-label">${esc(t("heroServerLabel"))}</span>
        <span class="schedule-modal-subtitle-value">${esc(server.name || server.full_name || t("unknown"))}</span>
      </span>
      <span class="schedule-modal-subtitle-card">
        <span class="schedule-modal-subtitle-label">${esc(t("heroPasswordLabel"))}</span>
        <span class="schedule-modal-subtitle-value">${esc(server.password || t("passwordNone"))}</span>
      </span>
      <span class="schedule-modal-subtitle-card">
        <span class="schedule-modal-subtitle-label">${esc(`${t("labelDate")} + ${t("labelTime")}`)}</span>
        <span class="schedule-modal-subtitle-value">${esc(formatSlotDateTime(selectedScheduleItem)).replace(" · ", "<br>")}</span>
      </span>
    </span>
  `;
  detailsEl.innerHTML = buildScheduleModalDetails(selectedScheduleItem);
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

function closeScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  selectedScheduleItem = null;
  applyScheduleModalTrackBackground("");
}

function normalizePrizeItems(prizes) {
  if (!prizes) return [];
  if (Array.isArray(prizes)) return prizes;
  return ["prize1", "prize2", "prize3"].map((key, index) => {
    const value = prizes[key];
    if (!value) return null;
    if (typeof value === "string") return { src: value, title: `P${index + 1}` };
    return { src: value.src || value.url || value.path, title: value.title || value.alt || `P${index + 1}`, alt: value.alt };
  }).filter(Boolean);
}

function normalizeAssetUrl(path, slug, assetBase = dataBase) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return value;
  if (value.startsWith("./") || value.startsWith("../")) return value;
  if (value.startsWith("events/") || value.startsWith("assets/")) return `${assetBase}/${value}`;
  return `${assetBase}/events/${encodeURIComponent(slug || "championship")}/${value}`;
}

function renderPrizes(prizes, slug, assetBase = dataBase) {
  const root = document.getElementById("championship-prizes-grid");
  if (!root) return;
  const items = normalizePrizeItems(prizes);
  if (!items.length) {
    root.innerHTML = `<div class="championship-empty">${esc(t("noPrizes"))}</div>`;
    return;
  }
  root.innerHTML = items.map((item, index) => {
    const src = normalizeAssetUrl(item.src, slug, assetBase);
    const title = item.title || `P${index + 1}`;
    const alt = item.alt || title;
    return `
      <button class="championship-prize-thumb" type="button" data-full-src="${esc(src)}" data-alt="${esc(alt)}">
        <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" />
        <span>${esc(title)}</span>
      </button>
    `;
  }).join("");
}

function renderStandings(data, races) {
  const root = document.getElementById("championship-standings");
  const standings = normalizeStandings(data);
  if (!root) return;
  if (!standings.length) {
    root.innerHTML = `<div class="championship-empty">${esc(t("noResults"))}</div>`;
    return;
  }
  const raceColumns = Array.from({ length: 4 }, (_, index) => races[index] || { event_id: `R${index + 1}` });
  root.innerHTML = `
    <table class="championship-standings-table">
      <thead>
        <tr>
          <th>${esc(t("position"))}</th>
          <th>${esc(t("driver"))}</th>
          ${raceColumns.map((_, index) => `<th>R${index + 1}</th>`).join("")}
          <th>${esc(t("total"))}</th>
        </tr>
      </thead>
      <tbody>
        ${standings.map((row, index) => `
          <tr>
            <td>${esc(index + 1)}</td>
            <td>${esc(row.driver || row.public_id || "-")}</td>
            ${raceColumns.map((race, raceIndex) => {
              const value = row.race_points?.[raceEventId(race, raceIndex)];
              return `<td>${esc(value ?? "-")}</td>`;
            }).join("")}
            <td><strong>${esc(row.points || 0)}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderRaceResults(races) {
  const root = document.getElementById("championship-race-results");
  if (!root) return;
  if (!races.length) {
    root.innerHTML = `<div class="championship-empty">${esc(t("noRaceResults"))}</div>`;
    return;
  }
  root.innerHTML = races.map((race, index) => {
    const results = Array.isArray(race.results) ? race.results.slice(0, 12) : [];
    return `
      <article class="championship-race-card">
        <div class="championship-race-card-head">
          <div>
            <div class="event-type-badge">${esc(`R${index + 1}`)}</div>
            <h3>${esc(race.track_name || race.track || race.track_code || "-")}</h3>
            <p>${esc(race.finished_at_local || formatDate(race.date))}</p>
          </div>
          <div class="championship-race-summary">
            <span>${esc(t("winner"))}: ${esc(race.winner || "-")}</span>
            <span>${esc(t("bestLap"))}: ${esc(race.best_lap || "-")}</span>
            <span>${esc(t("participants"))}: ${esc(race.participants_count || results.length || "-")}</span>
          </div>
        </div>
        ${
          results.length
            ? `<div class="table-card table-card-compact">
                <div class="table-wrap">
                  <table class="championship-race-table">
                    <thead><tr><th>#</th><th>${esc(t("driver"))}</th><th>${esc(t("points"))}</th><th>${esc(t("bestLap"))}</th></tr></thead>
                    <tbody>
                      ${results.map(result => `
                        <tr>
                          <td>${esc(result.position || "-")}</td>
                          <td>${esc(result.driver || result.public_id || "-")}</td>
                          <td>${esc(result.points ?? "-")}</td>
                          <td>${esc(result.best_lap || "-")}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </div>`
            : `<div class="championship-empty">${esc(t("noResults"))}</div>`
        }
      </article>
    `;
  }).join("");
}

async function loadRaceDetails(data, slug, assetBase = dataBase) {
  const races = normalizeRaces(data);
  const detailed = await Promise.all(races.map(async race => {
    if (Array.isArray(race.results)) return race;
    const detailsPath = race.details_path || `races/${race.event_id}.json`;
    const detail = await loadJsonOrNull(`${assetBase}/events/${encodeURIComponent(slug)}/${detailsPath}`);
    return detail ? { ...race, ...detail } : race;
  }));
  return detailed;
}

async function loadChampionshipData(slug) {
  const primaryUrl = `${dataBase}/events/${encodeURIComponent(slug)}/index.json`;
  const primaryData = await loadJsonOrNull(primaryUrl);
  if (primaryData) return { data: primaryData, assetBase: dataBase };

  if (dataBase !== githubDataBase) {
    const githubUrl = `${githubDataBase}/events/${encodeURIComponent(slug)}/index.json`;
    const githubData = await loadJsonOrNull(githubUrl);
    if (githubData) return { data: githubData, assetBase: githubDataBase };
  }

  return { data: null, assetBase: dataBase };
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll(".lang-btn").forEach(button => {
    const active = button.dataset.lang === currentLang;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  document.getElementById("top-nav-more")?.rebuildOverflowMenu?.();
}

function bindTopNavMoreMenu() {
  const root = document.getElementById("top-nav-more");
  const toggle = document.getElementById("top-nav-more-toggle");
  const menu = document.getElementById("top-nav-more-menu");
  const navMenu = document.querySelector(".top-nav-menu");
  const items = navMenu ? [...navMenu.querySelectorAll("[data-nav-item='true']")] : [];
  if (!root || !toggle || !menu || !navMenu || !items.length || root.dataset.bound === "true") return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    root.classList.remove("is-open");
  };

  const rebuildOverflowMenu = () => {
    menu.innerHTML = "";
    items.forEach(item => {
      item.hidden = false;
    });
    root.classList.remove("is-visible");
    root.hidden = true;
    closeMenu();

    if (window.innerWidth > 980) return;

    root.hidden = false;
    root.classList.add("is-visible");
    const toggleWidth = root.offsetWidth || 96;
    const navRect = navMenu.getBoundingClientRect();
    const maxVisibleRight = navRect.width - toggleWidth - 10;
    items.forEach(item => {
      const itemRightEdge = item.offsetLeft + item.offsetWidth;
      if (itemRightEdge > maxVisibleRight) item.hidden = true;
    });

    const hiddenItems = items.filter(item => item.hidden);
    if (!hiddenItems.length) {
      root.classList.remove("is-visible");
      root.hidden = true;
      return;
    }

    hiddenItems.forEach(item => {
      const clone = item.cloneNode(true);
      clone.className = item.classList.contains("championship-nav-link")
        ? "top-nav-more-link top-nav-more-link-championship"
        : "top-nav-more-link";
      clone.hidden = false;
      clone.removeAttribute("data-nav-item");
      menu.appendChild(clone);
    });
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    root.classList.add("is-open");
  };

  toggle.addEventListener("click", event => {
    event.preventDefault();
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  document.addEventListener("click", event => {
    if (!root.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });
  menu.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });
  window.addEventListener("resize", rebuildOverflowMenu);

  requestAnimationFrame(rebuildOverflowMenu);
  window.addEventListener("load", rebuildOverflowMenu, { once: true });
  root.rebuildOverflowMenu = rebuildOverflowMenu;
  root.dataset.bound = "true";
}

function bindLightbox() {
  const modal = document.getElementById("championship-lightbox");
  const image = document.getElementById("championship-lightbox-image");
  const close = document.getElementById("championship-lightbox-close");
  document.addEventListener("click", event => {
    const thumb = event.target.closest(".championship-prize-thumb");
    if (!thumb || !modal || !image) return;
    image.src = thumb.dataset.fullSrc || "";
    image.alt = thumb.dataset.alt || "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  });
  const closeLightbox = () => {
    if (!modal || !image) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    image.src = "";
  };
  close?.addEventListener("click", closeLightbox);
  modal?.addEventListener("click", event => {
    if (event.target === modal) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeLightbox();
  });
}

function bindScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  const closeButton = document.getElementById("schedule-modal-close");
  closeButton?.addEventListener("click", closeScheduleModal);
  modal?.addEventListener("click", event => {
    if (event.target === modal) closeScheduleModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeScheduleModal();
  });
}

async function init() {
  window.addEventListener("storage", event => {
    if (event.key === VOTE_STATE_STORAGE_KEY) {
      syncVoteStateFromStorage();
    }
  });
  applyTranslations();
  bindTopNavMoreMenu();
  document.querySelectorAll(".lang-btn").forEach(button => {
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
    championshipAnnouncementData = announcement || {};
    const firstChampionship = (schedule?.items || []).find(isChampionshipEvent);
    const slug = params.get("slug")
      || announcement?.championship_slug
      || announcement?.championship?.slug
      || firstChampionship?.championship_slug
      || "championship";
    const loaded = await loadChampionshipData(slug);
    const loadedData = loaded.data;
    const assetBase = loaded.assetBase;
    const data = loadedData || {
      slug,
      title: announcement?.championship_title || announcement?.championship?.title || firstChampionship?.championship_title || "ASG Racing June 2026",
      status: announcement?.championship?.status || "active",
      period: announcement?.championship?.period,
      description: getLocalizedDescription(announcement?.championship, firstChampionship),
      prizes: announcement?.championship?.prizes,
      upcoming_races: normalizeUpcoming({}, schedule, slug),
      standings: [],
      races: []
    };
    if (!data.prizes && announcement?.championship?.prizes) {
      data.prizes = announcement.championship.prizes;
    }
    const upcoming = normalizeUpcoming(data, schedule, slug);
    const races = await loadRaceDetails(data, slug, assetBase);
    const standings = normalizeStandings(data);
    await loadVotesForSchedule(upcoming.slice(0, 3));

    document.getElementById("championship-title").textContent = data.title || announcement?.championship_title || firstChampionship?.championship_title || "ASG Racing June 2026";
    document.getElementById("championship-status").textContent = [data.period, data.status].filter(Boolean).join(" · ") || t("championship");
    document.getElementById("championship-description").textContent = getLocalizedDescription(data, announcement?.championship, firstChampionship) || t("activeChampionship");

    renderProgress(data, races, upcoming, standings);
    renderUpcoming(upcoming, standings);
    renderPrizes(data.prizes, slug, assetBase);
    renderStandings(data, races);
    renderRaceResults(races);
  } catch (error) {
    console.error(error);
    document.getElementById("championship-description").textContent = t("loadError");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindLightbox();
  bindScheduleModal();
  init();
});
