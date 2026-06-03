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
    unknown: "--"
  }
};

const TRACK_BACKGROUNDS = {
  monza: "../assets/tracks/monza.jpg",
  monzatg: "../assets/tracks/monzaTG.jpg",
  "monza-tg": "../assets/tracks/monzaTG.jpg",
  silverstone: "../assets/tracks/silverstone.jpg",
  spa: "../assets/tracks/spa.jpg",
  nurburgring: "../assets/tracks/nurburgring.jpg"
};

function t(key) {
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
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

function resolveTrackBackground(item) {
  const directValue = item?.track_image || item?.track_photo || item?.background_image || item?.image;
  if (directValue) {
    const value = String(directValue).trim();
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("/") || value.startsWith("../")) return value;
    return `../${value.replace(/^\.?\//, "")}`;
  }
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
  return source
    .filter(isChampionshipEvent)
    .filter(item => !slug || !item?.championship_slug || item.championship_slug === slug)
    .slice(0, 6);
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
  root.innerHTML = upcoming.map(item => {
    const backgroundUrl = resolveTrackBackground(item);
    return `
      <article
        class="schedule-event-card is-championship-event"
        style="--schedule-track-photo: ${backgroundUrl ? `url('${esc(backgroundUrl)}')` : "none"};"
      >
        <div class="schedule-event-card-inner">
          <div class="event-type-badge">${esc(t("championshipEvent"))}</div>
          <div class="schedule-event-time">${esc(formatSlotDateTime(item))}</div>
          <div class="schedule-event-track">${esc(getLocalizedField(item, "track_name", item.track_code || "--"))}</div>
          <div class="schedule-event-weather"><span>${esc(weatherLabel(item.weather || {}))}</span><img src="../assets/weather/rain.png" alt="" /></div>
        </div>
      </article>
    `;
  }).join("");
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

function normalizeAssetUrl(path, slug) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return value;
  if (value.startsWith("./") || value.startsWith("../")) return value;
  if (value.startsWith("events/") || value.startsWith("assets/")) return `${dataBase}/${value}`;
  return `${dataBase}/events/${encodeURIComponent(slug || "championship")}/${value}`;
}

function renderPrizes(prizes, slug) {
  const root = document.getElementById("championship-prizes-grid");
  if (!root) return;
  const items = normalizePrizeItems(prizes);
  if (!items.length) {
    root.innerHTML = `<div class="championship-empty">${esc(t("noPrizes"))}</div>`;
    return;
  }
  root.innerHTML = items.map((item, index) => {
    const src = normalizeAssetUrl(item.src, slug);
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

async function loadRaceDetails(data, slug) {
  const races = normalizeRaces(data);
  const detailed = await Promise.all(races.map(async race => {
    if (Array.isArray(race.results)) return race;
    const detailsPath = race.details_path || `races/${race.event_id}.json`;
    const detail = await loadJsonOrNull(`${dataBase}/events/${encodeURIComponent(slug)}/${detailsPath}`);
    return detail ? { ...race, ...detail } : race;
  }));
  return detailed;
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

async function init() {
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
    const firstChampionship = (schedule?.items || []).find(isChampionshipEvent);
    const slug = params.get("slug")
      || announcement?.championship_slug
      || announcement?.championship?.slug
      || firstChampionship?.championship_slug
      || "championship";
    const loadedData = await loadJsonOrNull(`${dataBase}/events/${encodeURIComponent(slug)}/index.json`);
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
    const races = await loadRaceDetails(data, slug);
    const standings = normalizeStandings(data);

    document.getElementById("championship-title").textContent = data.title || announcement?.championship_title || firstChampionship?.championship_title || "ASG Racing June 2026";
    document.getElementById("championship-status").textContent = [data.period, data.status].filter(Boolean).join(" · ") || t("championship");
    document.getElementById("championship-description").textContent = getLocalizedDescription(data, announcement?.championship, firstChampionship) || t("activeChampionship");

    renderProgress(data, races, upcoming, standings);
    renderUpcoming(upcoming, standings);
    renderPrizes(data.prizes, slug);
    renderStandings(data, races);
    renderRaceResults(races);
  } catch (error) {
    console.error(error);
    document.getElementById("championship-description").textContent = t("loadError");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindLightbox();
  init();
});
