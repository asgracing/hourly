(function () {
  const CONSENT_STORAGE_KEY = "asgPrivacyConsent";
  const CONSENT_VERSION = "2026-04-30";
  const METRIKA_ID = Number.parseInt(
    document.querySelector('meta[name="yandex-metrika-id"]')?.getAttribute("content") || "",
    10
  );
  const LEGAL_BASE_PATH =
    document.querySelector('meta[name="legal-base-path"]')?.getAttribute("content")?.trim() || "./";
  const PRIVACY_URL = `${LEGAL_BASE_PATH}privacy/`;
  const COOKIES_URL = `${LEGAL_BASE_PATH}cookies/`;
  const METRIKA_SRC = "https://mc.yandex.ru/metrika/tag.js";
  const METRIKA_OPTIONS = {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false
  };
  const METRIKA_COOKIE_NAMES = [
    "_ym_d",
    "_ym_debug",
    "_ym_fa",
    "_ym_hostIndex",
    "_ym_isad",
    "_ym_metrika_enabled",
    "_ym_uid",
    "_ym_visorc_*",
    "_ym_ucs",
    "gdpr",
    "i",
    "is_gdpr",
    "is_gdpr_b",
    "usst",
    "yabs-sid",
    "yandexuid",
    "ymex",
    "yuidss"
  ];
  const texts = {
    ru: {
      bannerTitle: "Настройки cookies и аналитики",
      bannerBody:
        "Сайт использует cookie и Яндекс Метрику для статистики. Подробнее — в Политике ПДн и Cookies.",
      accept: "Разрешить аналитику",
      necessary: "Только необходимые",
      privacy: "Политика ПДн",
      cookies: "Cookies",
      settings: "Настройки cookies",
      footerNote: "",
      miniFooterTitle: "",
      miniFooterNote: ""
    },
    en: {
      bannerTitle: "Cookie and analytics settings",
      bannerBody:
        "This site uses cookies and Yandex Metrica for statistics. See the Privacy Policy and Cookies notice for details.",
      accept: "Allow analytics",
      necessary: "Required only",
      privacy: "Privacy Policy",
      cookies: "Cookies",
      settings: "Cookie settings",
      footerNote: "",
      miniFooterTitle: "",
      miniFooterNote: ""
    }
  };

  let metrikaLoaded = false;

  function getLanguage() {
    const stored = localStorage.getItem("asgLang");
    if (stored === "ru" || stored === "en") return stored;

    const htmlLang = String(document.documentElement.lang || "").trim().toLowerCase();
    if (htmlLang.startsWith("ru")) return "ru";

    const browserLang = String(navigator.language || "").trim().toLowerCase();
    return browserLang.startsWith("ru") ? "ru" : "en";
  }

  function t(key) {
    const lang = getLanguage();
    return texts[lang]?.[key] || texts.en[key] || "";
  }

  function readConsent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || "");
      if (!parsed || parsed.version !== CONSENT_VERSION || typeof parsed.analytics !== "boolean") {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveConsent(analytics) {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        analytics: Boolean(analytics),
        savedAt: new Date().toISOString()
      })
    );
  }

  function createButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  function createAnchor(label, href, className = "asg-legal-link") {
    const anchor = document.createElement("a");
    anchor.className = className;
    anchor.href = href;
    anchor.textContent = label;
    return anchor;
  }

  function appendSettingsButton(container) {
    const button = createButton(t("settings"), "asg-legal-link asg-legal-link-button");
    button.addEventListener("click", () => showBanner(true));
    container.append(button);
  }

  function cookieNameMatches(name) {
    return METRIKA_COOKIE_NAMES.some(pattern => {
      if (pattern.endsWith("*")) return name.startsWith(pattern.slice(0, -1));
      return name === pattern;
    });
  }

  function expireCookie(name, domain, path) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; SameSite=Lax`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax`;
  }

  function clearMetrikaStorage() {
    const hostname = window.location.hostname;
    const hostParts = hostname.split(".").filter(Boolean);
    const cookieDomains = new Set(["", hostname]);

    for (let index = 0; index < hostParts.length - 1; index += 1) {
      cookieDomains.add(`.${hostParts.slice(index).join(".")}`);
    }

    document.cookie
      .split(";")
      .map(item => item.split("=")[0]?.trim())
      .filter(Boolean)
      .forEach(name => {
        if (!cookieNameMatches(name)) return;
        cookieDomains.forEach(domain => {
          expireCookie(name, domain, "/");
        });
      });

    Object.keys(localStorage).forEach(key => {
      if (cookieNameMatches(key) || key.startsWith("_ym")) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (cookieNameMatches(key) || key.startsWith("_ym")) {
        sessionStorage.removeItem(key);
      }
    });
  }

  function initMetrika() {
    if (metrikaLoaded || !METRIKA_ID) return;

    window.ym =
      window.ym ||
      function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
    window.ym.l = Number(new Date());

    if (![...document.scripts].some(script => script.src === METRIKA_SRC)) {
      const metrikaScript = document.createElement("script");
      metrikaScript.async = true;
      metrikaScript.src = METRIKA_SRC;
      document.head.appendChild(metrikaScript);
    }

    window.ym(METRIKA_ID, "init", { ...METRIKA_OPTIONS });
    metrikaLoaded = true;
  }

  function getBanner() {
    let banner = document.querySelector(".asg-legal-banner");
    if (banner) return banner;

    banner = document.createElement("section");
    banner.className = "asg-legal-banner";
    banner.hidden = true;
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner(forceOpen = false) {
    const banner = getBanner();
    const consent = readConsent();
    const shouldShow = forceOpen || !consent;

    banner.innerHTML = "";

    const card = document.createElement("div");
    card.className = "asg-legal-banner-card";

    const title = document.createElement("h2");
    title.className = "asg-legal-banner-title";
    title.textContent = t("bannerTitle");

    const body = document.createElement("p");
    body.className = "asg-legal-banner-body";
    body.textContent = t("bannerBody");

    const links = document.createElement("div");
    links.className = "asg-legal-link-row";
    links.append(
      createAnchor(t("privacy"), PRIVACY_URL),
      createAnchor(t("cookies"), COOKIES_URL)
    );

    const actions = document.createElement("div");
    actions.className = "asg-legal-banner-actions";

    const acceptButton = createButton(t("accept"), "asg-legal-banner-btn asg-legal-banner-btn-primary");
    const necessaryButton = createButton(t("necessary"), "asg-legal-banner-btn asg-legal-banner-btn-secondary");

    acceptButton.addEventListener("click", () => applyConsent(true));
    necessaryButton.addEventListener("click", () => applyConsent(false));

    actions.append(acceptButton, necessaryButton);
    card.append(title, body, links, actions);
    banner.append(card);

    banner.hidden = !shouldShow;
    banner.classList.toggle("is-visible", shouldShow);
  }

  function hideBanner() {
    const banner = getBanner();
    banner.hidden = true;
    banner.classList.remove("is-visible");
  }

  function applyConsent(analytics) {
    const previous = readConsent();
    const hadAnalytics = Boolean(previous?.analytics);

    saveConsent(analytics);

    if (analytics) {
      initMetrika();
      hideBanner();
      return;
    }

    clearMetrikaStorage();
    hideBanner();

    if (hadAnalytics) {
      window.location.reload();
    }
  }

  function renderFooterLinks() {
    const footerLeft = document.querySelector(".footer-left");

    if (footerLeft) {
      let wrapper = footerLeft.querySelector(".asg-legal-footer-links");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "asg-legal-footer-links";
        footerLeft.appendChild(wrapper);
      }

      wrapper.innerHTML = "";

      const row = document.createElement("div");
      row.className = "asg-legal-link-row";
      row.append(
        createAnchor(t("privacy"), PRIVACY_URL),
        createAnchor(t("cookies"), COOKIES_URL)
      );
      appendSettingsButton(row);

      const footerNote = t("footerNote");
      if (footerNote) {
        const note = document.createElement("div");
        note.className = "asg-legal-footer-note";
        note.textContent = footerNote;
        wrapper.append(note);
      }

      wrapper.append(row);
      return;
    }

    let miniFooter = document.querySelector(".asg-legal-mini-footer");
    if (!miniFooter) {
      miniFooter = document.createElement("footer");
      miniFooter.className = "asg-legal-mini-footer";
      miniFooter.innerHTML = `
        <div class="asg-legal-mini-footer-inner">
          <div class="asg-legal-mini-footer-copy">
            <div class="asg-legal-mini-footer-title"></div>
            <div class="asg-legal-mini-footer-note"></div>
          </div>
          <div class="asg-legal-mini-footer-links"></div>
        </div>
      `;

      const mountPoint = document.querySelector("main") || document.querySelector(".container");
      if (mountPoint?.parentElement) {
        mountPoint.parentElement.insertBefore(miniFooter, mountPoint.nextSibling);
      } else {
        document.body.appendChild(miniFooter);
      }
    }

    const titleText = t("miniFooterTitle");
    const noteText = t("miniFooterNote");
    const copy = miniFooter.querySelector(".asg-legal-mini-footer-copy");
    const title = miniFooter.querySelector(".asg-legal-mini-footer-title");
    const note = miniFooter.querySelector(".asg-legal-mini-footer-note");

    title.textContent = titleText;
    note.textContent = noteText;
    copy.hidden = !titleText && !noteText;

    const links = miniFooter.querySelector(".asg-legal-mini-footer-links");
    links.innerHTML = "";
    links.append(
      createAnchor(t("privacy"), PRIVACY_URL),
      createAnchor(t("cookies"), COOKIES_URL)
    );
    appendSettingsButton(links);
  }

  function rerenderUi() {
    renderFooterLinks();
    showBanner(Boolean(document.querySelector(".asg-legal-banner.is-visible")));
  }

  function init() {
    renderFooterLinks();

    const consent = readConsent();
    if (consent?.analytics) {
      initMetrika();
      showBanner(false);
    } else {
      showBanner(true);
    }

    const htmlObserver = new MutationObserver(() => rerenderUi());
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });

    window.addEventListener("storage", event => {
      if (event.key === "asgLang") {
        rerenderUi();
      }
    });
  }

  window.ASGLegal = {
    getUrls() {
      return {
        privacy: PRIVACY_URL,
        cookies: COOKIES_URL
      };
    },
    openSettings() {
      showBanner(true);
    },
    hasAnalyticsConsent() {
      return Boolean(readConsent()?.analytics);
    }
  };

  init();
})();
