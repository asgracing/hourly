import json
import os
import sys
from html import escape
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib import error, parse, request


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ANNOUNCEMENT_URL = "https://asgracing.github.io/hourly-data/announcement.json"
DEFAULT_STATE_FILE = REPO_ROOT / ".github" / "hourly_notify_state.json"
DEFAULT_WINDOW_MINUTES = 20
DEFAULT_FINAL_WINDOW_MINUTES = 3
DEFAULT_TIMEOUT_SECONDS = 20
SITE_BASE_URL = "https://asgracing.github.io"
HOURLY_PAGE_URL = f"{SITE_BASE_URL}/hourly/"
TRACK_IMAGE_BASE_URL = f"{HOURLY_PAGE_URL}assets/tracks"


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
    if details_url.startswith("http://") or details_url.startswith("https://"):
        return details_url
    if details_url.startswith("/"):
        return f"{SITE_BASE_URL}{details_url}"
    return f"{HOURLY_PAGE_URL}{details_url.lstrip('./')}"


def build_track_image_url(item):
    track_code = normalize_event_id(item.get("track_code") or item.get("track_name"))
    if not track_code:
        return ""
    supported = {"spa", "monza", "silverstone", "nurburgring"}
    if track_code not in supported:
        return ""
    return f"{TRACK_IMAGE_BASE_URL}/{track_code}.jpg"


def load_remote_json(url):
    with request.urlopen(url, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def read_env(name, default_value):
    value = os.getenv(name)
    if value is None:
        return default_value
    value = value.strip()
    return value or default_value


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


def parse_timezone_offset(value):
    raw = str(value or "").strip().upper()
    if not raw:
        return timezone.utc
    if raw in {"UTC", "GMT"}:
        return timezone.utc
    if raw == "MSK":
        return timezone(timedelta(hours=3))
    if raw == "UTC+3":
        return timezone(timedelta(hours=3))
    if raw == "UTC+03:00":
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


def build_plain_message(item, trigger_key, event_start):
    lead = get_trigger_label(trigger_key)
    track_name = item.get("track_name") or "Unknown track"
    start_time_local = str(item.get("start_time_local") or "--").strip()
    timezone_label = str(item.get("timezone") or "UTC").strip()
    date_str = str(item.get("date") or "--").strip()
    registrations = item.get("registrations") or item.get("votes")
    details_url = build_details_url(item)

    lines = [
        f"{build_notification_title(item, trigger_key)}",
        build_hype_line(trigger_key),
        f"Track: {track_name}",
        f"Date: {date_str}",
        f"Start: {start_time_local} {timezone_label}".strip(),
    ]

    if registrations not in (None, ""):
        lines.append(f"Registrations: {registrations}")

    description = str(item.get("description") or "").strip()
    if description:
        lines.append(description)

    lines.append(f"Race page: {details_url}")

    lines.append(f"Event ID: {build_event_id(item)}")
    lines.append(f"Starts at: {event_start.isoformat()}")
    return "\n".join(lines)


def format_html_message(item, trigger_key, event_start):
    track_name = escape(str(item.get("track_name") or "Unknown track"))
    date_str = escape(str(item.get("date") or "--").strip())
    start_time_local = escape(str(item.get("start_time_local") or "--").strip())
    timezone_label = escape(str(item.get("timezone") or "UTC").strip())
    title = escape(build_notification_title(item, trigger_key))
    hype_line = escape(build_hype_line(trigger_key))
    details_url = escape(build_details_url(item))
    event_id = escape(build_event_id(item))
    starts_at = escape(event_start.isoformat())
    registrations = item.get("registrations") or item.get("votes")

    lines = [
        f"🏁 <b>{title}</b>",
        "",
        f"🔥 {hype_line}",
        f"📍 <b>Track:</b> {track_name}",
        f"📅 <b>Date:</b> {date_str}",
        f"⏰ <b>Start:</b> {start_time_local} {timezone_label}".strip(),
    ]

    if registrations not in (None, ""):
        lines.append(f"👥 <b>Registrations:</b> {escape(str(registrations))}")

    lines.extend(
        [
            "",
            f"👉 <a href=\"{details_url}\">Open race page</a>",
            f"🆔 <code>{event_id}</code>",
            f"🕓 <code>{starts_at}</code>",
        ]
    )
    return "\n".join(lines)


def build_discord_payload(item, trigger_key, event_start):
    track_name = str(item.get("track_name") or "Unknown track")
    date_str = str(item.get("date") or "--").strip()
    start_time_local = str(item.get("start_time_local") or "--").strip()
    timezone_label = str(item.get("timezone") or "UTC").strip()
    details_url = build_details_url(item)
    registrations = item.get("registrations") or item.get("votes")

    fields = [
        {"name": "Track", "value": track_name, "inline": True},
        {"name": "Date", "value": date_str, "inline": True},
        {"name": "Start", "value": f"{start_time_local} {timezone_label}".strip(), "inline": True},
    ]
    if registrations not in (None, ""):
        fields.append({"name": "Registrations", "value": str(registrations), "inline": True})

    embed = {
        "title": build_notification_title(item, trigger_key),
        "description": build_hype_line(trigger_key),
        "url": details_url,
        "color": 16748032,
        "fields": fields,
        "footer": {"text": build_event_id(item)},
        "timestamp": event_start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    image_url = build_track_image_url(item)
    if image_url:
        embed["image"] = {"url": image_url}

    return {
        "content": "🏁 Hourly race alert",
        "embeds": [embed],
    }


def format_test_message(item, event_start):
    return build_plain_message(item, "test", event_start)


def send_telegram_message(message):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not bot_token or not chat_id:
        return False

    payload = parse.urlencode(
        {
            "chat_id": chat_id,
            "text": message,
            "disable_web_page_preview": "true",
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


def send_discord_message(payload):
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return False

    payload = json.dumps(payload).encode("utf-8")
    req = request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
        response.read()
    return True


def dispatch(item, trigger_key, event_start):
    sent_any = False
    telegram_html = format_html_message(item, trigger_key, event_start)
    track_image_url = build_track_image_url(item)
    if track_image_url:
        sent_any = send_telegram_photo(telegram_html, track_image_url) or sent_any
    else:
        sent_any = send_telegram_message(build_plain_message(item, trigger_key, event_start)) or sent_any

    sent_any = send_discord_message(build_discord_payload(item, trigger_key, event_start)) or sent_any
    if not sent_any:
        raise RuntimeError("No notification target configured. Set Telegram and/or Discord secrets.")


def cleanup_state(state, active_event_id):
    events = state.get("events") or {}
    state["events"] = {
        event_id: payload
        for event_id, payload in events.items()
        if event_id == active_event_id or (payload.get("sent") if isinstance(payload, dict) else None)
    }


def run():
    announcement_url = read_env("HOURLY_ANNOUNCEMENT_URL", DEFAULT_ANNOUNCEMENT_URL)
    state_file = Path(read_env("HOURLY_NOTIFY_STATE_FILE", str(DEFAULT_STATE_FILE))).resolve()
    dry_run = os.getenv("HOURLY_NOTIFY_DRY_RUN", "").strip().lower() in {"1", "true", "yes"}
    window_minutes = int(read_env("HOURLY_NOTIFY_WINDOW_MINUTES", str(DEFAULT_WINDOW_MINUTES)))
    final_window_minutes = int(
        read_env("HOURLY_NOTIFY_FINAL_WINDOW_MINUTES", str(DEFAULT_FINAL_WINDOW_MINUTES))
    )
    force_send = os.getenv("HOURLY_NOTIFY_FORCE_SEND", "").strip().lower() in {"1", "true", "yes"}

    announcement = load_remote_json(announcement_url)
    if not isinstance(announcement, dict):
        raise ValueError("announcement.json must be an object")

    event_id = build_event_id(announcement)
    if not event_id:
        raise ValueError("Could not build event_id for announcement")

    event_start = parse_event_start(announcement)
    now = datetime.now(event_start.tzinfo or timezone.utc)
    time_until_start = event_start - now

    state = load_state(state_file)
    event_state = state["events"].setdefault(event_id, {"sent": {}})
    sent_now = []

    if force_send:
        message = format_test_message(announcement, event_start)
        if dry_run:
            print(f"[dry-run] would send test notification for {event_id}")
            print(message)
        else:
            dispatch(announcement, "test", event_start)
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

        message = format_message(announcement, trigger_key, event_start)
        if dry_run:
            print(f"[dry-run] would send {trigger_key} for {event_id}")
            print(message)
        else:
            dispatch(announcement, trigger_key, event_start)

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
