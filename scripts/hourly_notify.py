import json
import os
import sys
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from urllib import error, parse, request


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ANNOUNCEMENT_URL = "https://asgracing.github.io/hourly-data/announcement.json"
DEFAULT_STATE_FILE = REPO_ROOT / ".github" / "hourly_notify_state.json"
DEFAULT_WINDOW_MINUTES = 20
DEFAULT_FINAL_WINDOW_MINUTES = 3
DEFAULT_TIMEOUT_SECONDS = 20
DEFAULT_VOTES_API_BASE = "https://hourly-votes.asgracing.workers.dev"
SITE_BASE_URL = "https://asgracing.github.io"
HOURLY_PAGE_URL = f"{SITE_BASE_URL}/hourly/"
TRACK_IMAGE_BASE_URL = f"{HOURLY_PAGE_URL}assets/tracks"
SUPPORTED_TRACK_IMAGES = {"spa", "monza", "silverstone", "nurburgring"}


def normalize_event_id(value):
    raw = str(value or "").strip().lower()
    chars = []
    last_was_sep = False
    for char in raw:
        is_allowed = ("a" <= char <= "z") or ("0" <= char <= "9") or char in "._-"
        if is_allowed:
            chars.append(char)
            last_was_sep = False
            continue
        if not last_was_sep:
            chars.append("_")
            last_was_sep = True
    return "".join(chars).strip("_")


def read_env(name, default_value):
    value = os.getenv(name)
    if value is None:
        return default_value
    value = value.strip()
    return value or default_value


def load_remote_json(url):
    with request.urlopen(url, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def load_votes_summary(votes_api_base, event_id):
    if not votes_api_base or not event_id:
        return {}
    url = f"{votes_api_base.rstrip('/')}/votes?event_ids={parse.quote(event_id)}&voter_id=notify-bot"
    req = request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Origin": SITE_BASE_URL,
            "User-Agent": "hourly-notifier",
        },
        method="GET",
    )
    with request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        return {}
    items = payload.get("items")
    if not isinstance(items, dict):
        return {}
    summary = items.get(event_id)
    return summary if isinstance(summary, dict) else {}


def load_state(state_file):
    if not state_file.exists():
        return {"events": {}}
    try:
        state = json.loads(state_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        state = {}
    state.setdefault("events", {})
    return state


def save_state(state_file, state):
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_event_id(item):
    explicit_id = normalize_event_id(item.get("event_id"))
    if explicit_id:
        return explicit_id

    date_str = str(item.get("date") or "").strip()
    time_str = str(item.get("start_time_local") or "").strip().replace(":", "")
    track_code = normalize_event_id(item.get("track_code") or item.get("track_name") or "slot")
    return normalize_event_id(f"hourly_{date_str}_{time_str}_{track_code}")


def build_details_url(item):
    details_url = str(item.get("details_url") or "").strip()
    if not details_url:
        return HOURLY_PAGE_URL
    if details_url.startswith(("http://", "https://")):
        return details_url
    if details_url.startswith("/"):
        return f"{SITE_BASE_URL}{details_url}"
    return f"{HOURLY_PAGE_URL}{details_url.lstrip('./')}"


def build_track_image_url(item):
    track_code = normalize_event_id(item.get("track_code") or item.get("track_name"))
    if track_code not in SUPPORTED_TRACK_IMAGES:
        return ""
    return f"{TRACK_IMAGE_BASE_URL}/{track_code}.jpg"


def parse_timezone_offset(value):
    raw = str(value or "").strip().upper()
    if not raw or raw in {"UTC", "GMT"}:
        return timezone.utc
    if raw in {"MSK", "UTC+3", "UTC+03:00"}:
        return timezone(timedelta(hours=3))
    if raw == "UTC-3":
        return timezone(-timedelta(hours=3))

    normalized = raw.replace("UTC", "").replace("GMT", "").strip()
    if not normalized:
        return timezone.utc

    sign = 1
    if normalized.startswith("+"):
        normalized = normalized[1:]
    elif normalized.startswith("-"):
        sign = -1
        normalized = normalized[1:]

    parts = normalized.split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return timezone(sign * timedelta(hours=hours, minutes=minutes))


def parse_event_start(item):
    for key in ("start_at", "start_datetime", "starts_at", "datetime"):
        candidate = str(item.get(key) or "").strip()
        if not candidate:
            continue
        try:
            return datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        except ValueError:
            continue

    date_str = str(item.get("date") or "").strip()
    time_str = str(item.get("start_time_local") or "").strip()
    if not date_str or not time_str:
        raise ValueError("announcement.json has no parsable event start")

    tzinfo = parse_timezone_offset(item.get("timezone"))
    return datetime.fromisoformat(f"{date_str}T{time_str}:00").replace(tzinfo=tzinfo)


def format_display_date(value):
    raw = str(value or "").strip()
    if not raw:
        return "--"
    for candidate in (raw, f"{raw}T00:00:00"):
        try:
            return datetime.fromisoformat(candidate.replace("Z", "+00:00")).strftime("%d.%m.%Y")
        except ValueError:
            continue
    return raw


def build_windows(window_minutes, final_window_minutes):
    standard_tolerance = timedelta(minutes=window_minutes)
    final_tolerance = timedelta(minutes=final_window_minutes)
    return {
        "24h": {"delta": timedelta(hours=24), "tolerance": standard_tolerance},
        "4h": {"delta": timedelta(hours=4), "tolerance": standard_tolerance},
        "5m": {"delta": timedelta(minutes=5), "tolerance": final_tolerance},
    }


def is_due(time_until_start, target_delta, tolerance):
    return target_delta - tolerance <= time_until_start <= target_delta + tolerance


def get_trigger_label(trigger_key):
    if trigger_key == "24h":
        return "24 hours"
    if trigger_key == "4h":
        return "4 hours"
    if trigger_key == "5m":
        return "5 minutes"
    return "test"


def build_notification_title(item, trigger_key):
    lead = get_trigger_label(trigger_key)
    track_name = item.get("track_name") or "Unknown track"
    if trigger_key == "5m":
        return f"Last call for {track_name} in {lead}"
    if trigger_key == "test":
        return f"ASG Racing test alert for {track_name}"
    return f"{track_name} starts in {lead}"


def build_hype_line(trigger_key):
    if trigger_key == "24h":
        return "Lock in your plan, warm up, and get ready for the next hourly battle."
    if trigger_key == "4h":
        return "Time to pick the setup, check the fuel, and get on the grid."
    if trigger_key == "5m":
        return "Server is about to go live. Join now if you want to make the start."
    return "Quick delivery check for the hourly notifier."


def build_plain_message(item, trigger_key):
    track_name = item.get("track_name") or "Unknown track"
    start_time_local = str(item.get("start_time_local") or "--").strip()
    timezone_label = str(item.get("timezone") or "UTC").strip()
    date_str = format_display_date(item.get("date"))
    registrations = item.get("registrations")
    details_url = build_details_url(item)

    lines = [
        build_notification_title(item, trigger_key),
        build_hype_line(trigger_key),
        f"Track: {track_name}",
        f"Date: {date_str}",
        f"Start: {start_time_local} {timezone_label}".strip(),
    ]

    if registrations not in (None, ""):
        lines.append(f"Registered drivers: {registrations}")

    description = str(item.get("description") or "").strip()
    if description:
        lines.append(description)

    lines.append(f"Race page: {details_url}")
    return "\n".join(lines)


def build_photo_caption(item, trigger_key):
    track_name = escape(str(item.get("track_name") or "Unknown track"))
    date_str = escape(format_display_date(item.get("date")))
    start_time_local = escape(str(item.get("start_time_local") or "--").strip())
    timezone_label = escape(str(item.get("timezone") or "UTC").strip())
    title = escape(build_notification_title(item, trigger_key))
    hype_line = escape(build_hype_line(trigger_key))
    details_url = escape(build_details_url(item))
    registrations = item.get("registrations")

    lines = [
        f"🏁 <b>{title}</b>",
        "",
        f"🔥 {hype_line}",
        f"📍 <b>Track:</b> {track_name}",
        f"📅 <b>Date:</b> {date_str}",
        f"⏰ <b>Start:</b> {start_time_local} {timezone_label}".strip(),
    ]

    if registrations not in (None, ""):
        lines.append(f"👥 <b>Registered drivers:</b> {escape(str(registrations))}")

    lines.extend(
        [
            "",
            f"👉 <a href=\"{details_url}\">Open race page</a>",
        ]
    )
    return "\n".join(lines)


def send_telegram_message(message):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not bot_token or not chat_id:
        return False

    payload = parse.urlencode(
        {
            "chat_id": chat_id,
            "text": message,
            "disable_web_page_preview": "false",
        }
    ).encode("utf-8")
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    req = request.Request(url, data=payload, method="POST")
    with request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        response.read()
    return True


def send_telegram_photo(caption, image_url):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not bot_token or not chat_id or not image_url:
        return False

    payload = parse.urlencode(
        {
            "chat_id": chat_id,
            "photo": image_url,
            "caption": caption,
            "parse_mode": "HTML",
        }
    ).encode("utf-8")
    url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
    req = request.Request(url, data=payload, method="POST")
    with request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        response.read()
    return True


def dispatch(item, trigger_key):
    track_image_url = build_track_image_url(item)
    if track_image_url:
        try:
            if send_telegram_photo(build_photo_caption(item, trigger_key), track_image_url):
                return
        except error.HTTPError as exc:
            print(f"telegram photo failed: {exc.code} {exc.reason}; fallback to text")
        except Exception as exc:
            print(f"telegram photo failed: {exc}; fallback to text")

    if send_telegram_message(build_plain_message(item, trigger_key)):
        return
    raise RuntimeError("Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")


def cleanup_state(state, active_event_id):
    events = state.get("events") or {}
    state["events"] = {
        event_id: payload
        for event_id, payload in events.items()
        if event_id == active_event_id or (payload.get("sent") if isinstance(payload, dict) else None)
    }


def run():
    announcement_url = read_env("HOURLY_ANNOUNCEMENT_URL", DEFAULT_ANNOUNCEMENT_URL)
    votes_api_base = read_env("HOURLY_VOTES_API_BASE", DEFAULT_VOTES_API_BASE)
    state_file = Path(read_env("HOURLY_NOTIFY_STATE_FILE", str(DEFAULT_STATE_FILE))).resolve()
    dry_run = os.getenv("HOURLY_NOTIFY_DRY_RUN", "").strip().lower() in {"1", "true", "yes"}
    window_minutes = int(read_env("HOURLY_NOTIFY_WINDOW_MINUTES", str(DEFAULT_WINDOW_MINUTES)))
    final_window_minutes = int(read_env("HOURLY_NOTIFY_FINAL_WINDOW_MINUTES", str(DEFAULT_FINAL_WINDOW_MINUTES)))
    force_send = os.getenv("HOURLY_NOTIFY_FORCE_SEND", "").strip().lower() in {"1", "true", "yes"}

    announcement = load_remote_json(announcement_url)
    if not isinstance(announcement, dict):
        raise ValueError("announcement.json must be an object")

    event_id = build_event_id(announcement)
    if not event_id:
        raise ValueError("Could not build event_id for announcement")

    try:
        votes_summary = load_votes_summary(votes_api_base, event_id)
    except error.HTTPError as exc:
        votes_summary = {}
        print(f"votes api failed: {exc.code} {exc.reason}; continue without registration count")
    except Exception as exc:
        votes_summary = {}
        print(f"votes api failed: {exc}; continue without registration count")

    if votes_summary and "votes" in votes_summary:
        announcement["registrations"] = votes_summary.get("votes")

    event_start = parse_event_start(announcement)
    now = datetime.now(event_start.tzinfo or timezone.utc)
    time_until_start = event_start - now

    state = load_state(state_file)
    event_state = state["events"].setdefault(event_id, {"sent": {}})
    sent_now = []

    if force_send:
        message = build_plain_message(announcement, "test")
        if dry_run:
            print(f"[dry-run] would send test notification for {event_id}")
            print(message)
        else:
            dispatch(announcement, "test")
            print(f"test notification sent for {event_id}")
        state["last_event_id"] = event_id
        cleanup_state(state, event_id)
        save_state(state_file, state)
        return

    triggers = build_windows(window_minutes, final_window_minutes)
    for trigger_key, trigger_config in triggers.items():
        if event_state["sent"].get(trigger_key):
            continue
        if not is_due(time_until_start, trigger_config["delta"], trigger_config["tolerance"]):
            continue

        message = build_plain_message(announcement, trigger_key)
        if dry_run:
            print(f"[dry-run] would send {trigger_key} for {event_id}")
            print(message)
        else:
            dispatch(announcement, trigger_key)

        event_state["sent"][trigger_key] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        sent_now.append(trigger_key)

    state["last_event_id"] = event_id
    cleanup_state(state, event_id)
    save_state(state_file, state)

    if sent_now:
        print(f"sent: {event_id} -> {', '.join(sent_now)}")
    else:
        print(f"no notifications due for {event_id}; time until start: {time_until_start}")


if __name__ == "__main__":
    try:
        run()
    except error.HTTPError as exc:
        print(f"http error: {exc.code} {exc.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"notifier failed: {exc}", file=sys.stderr)
        sys.exit(1)
