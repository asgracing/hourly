import json
from datetime import datetime, timezone, timedelta
from pathlib import Path


APP_ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_ROOT_DIR = APP_ROOT_DIR.parent / "hourly-data"
CONFIG_DIR = DATA_ROOT_DIR / "config"
SCHEDULE_CONFIG_PATH = CONFIG_DIR / "schedule_config.json"
RUNTIME_STATE_PATH = CONFIG_DIR / "runtime_state.json"
SCHEDULE_PATH = DATA_ROOT_DIR / "schedule.json"
ANNOUNCEMENT_PATH = DATA_ROOT_DIR / "announcement.json"
RECENT_RACES_PATH = DATA_ROOT_DIR / "recent_races.json"
UTC_PLUS_3 = timezone(timedelta(hours=3))


def detect_text_encoding(raw: bytes) -> str:
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return "utf-16"
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    return "utf-8"


def load_json(path: Path, default=None):
    try:
        raw = path.read_bytes()
    except FileNotFoundError:
        return default

    encodings = [detect_text_encoding(raw), "utf-16-le", "utf-8-sig", "utf-8", "cp1251", "latin-1"]
    last_error = None

    for encoding in encodings:
        try:
            text = raw.decode(encoding)
            text = text.replace("\ufeff", "").replace("\x00", "")
            return json.loads(text)
        except Exception as exc:
            last_error = exc

    if default is not None:
        return default

    raise ValueError(f"Failed to read JSON from {path}: {last_error}")


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")


def now_local():
    return datetime.now(UTC_PLUS_3)


def now_local_iso():
    return now_local().isoformat(timespec="seconds")


def resolve_results_dir_path(schedule_config: dict) -> Path:
    server_root = Path(schedule_config["server_root"])
    results_dir = schedule_config.get("results_dir") or "results"
    return server_root / results_dir


def parse_slot_datetime(item: dict):
    date_value = item.get("date")
    time_value = item.get("start_time_local")
    if not date_value or not time_value:
        return None

    try:
        return datetime.strptime(f"{date_value} {time_value}", "%Y-%m-%d %H:%M").replace(tzinfo=UTC_PLUS_3)
    except ValueError:
        return None


def build_announcement(schedule_data: dict, schedule_config: dict):
    items = schedule_data.get("items") if isinstance(schedule_data, dict) else []
    now_value = now_local()

    future_items = []
    for item in items or []:
        slot_dt = parse_slot_datetime(item)
        if slot_dt and slot_dt >= now_value:
            future_items.append((slot_dt, item))

    future_items.sort(key=lambda pair: pair[0])
    next_item = future_items[0][1] if future_items else None

    if not next_item:
        return {
            "title": schedule_config.get("title", "Часовая гонка"),
            "status": "unscheduled",
            "date": None,
            "start_time_local": None,
            "timezone": schedule_config.get("timezone", "UTC+3"),
            "track_code": None,
            "track_name": None,
            "server_window": f"{schedule_config.get('server_window_minutes', 120) // 60}h",
            "session_label": None,
            "details_url": "/hourly/",
            "updated_at": now_local_iso(),
        }

    return {
        "title": schedule_config.get("title", "Часовая гонка"),
        "status": next_item.get("status", "scheduled"),
        "date": next_item.get("date"),
        "start_time_local": next_item.get("start_time_local"),
        "timezone": next_item.get("timezone") or schedule_config.get("timezone", "UTC+3"),
        "track_code": next_item.get("track_code"),
        "track_name": next_item.get("track_name"),
        "server_window": f"{schedule_config.get('server_window_minutes', 120) // 60}h",
        "session_label": next_item.get("slot_label"),
        "details_url": "/hourly/",
        "updated_at": now_local_iso(),
    }


def build_event_id(date_value, time_value, track_code):
    safe_date = date_value or "unknown-date"
    safe_time = (time_value or "0000").replace(":", "")
    safe_track = track_code or "unknown-track"
    return f"hourly_{safe_date}_{safe_time}_{safe_track}"


def normalize_track_name(track_code: str):
    if not track_code:
        return "Unknown"

    mapping = {
        "monza": "Monza",
        "silverstone": "Silverstone",
        "nurburgring": "Nurburgring",
        "spa": "Spa",
    }
    return mapping.get(track_code, track_code.replace("_", " ").title())


def extract_finished_at_local(result_data: dict, source_file: Path):
    candidates = [
        result_data.get("sessionResult", {}).get("finishTime"),
        result_data.get("raceWeekendIndex"),
    ]

    for value in candidates:
        if isinstance(value, str) and value:
            return value

    try:
        modified = datetime.fromtimestamp(source_file.stat().st_mtime, tz=UTC_PLUS_3)
        return modified.strftime("%Y-%m-%d %H:%M:%S")
    except OSError:
        return None


def format_local_time(value):
    if not value:
        return None

    if "T" in value:
        try:
            dt = datetime.fromisoformat(value)
            return dt.astimezone(UTC_PLUS_3).strftime("%Y-%m-%d %H:%M")
        except ValueError:
            return value.replace("T", " ")[:16]

    return value[:16]


def build_recent_races(results_dir_path: Path, schedule_config: dict, runtime_state: dict):
    if not results_dir_path.exists():
        return {"items": [], "updated_at": now_local_iso()}

    result_files = sorted(results_dir_path.glob("*_R.json"), key=lambda path: path.stat().st_mtime, reverse=True)
    items = []

    for path in result_files[:12]:
        result_data = load_json(path, default={}) or {}
        track_code = result_data.get("trackName") or result_data.get("metaData") or runtime_state.get("last_track_code")
        track_name = normalize_track_name(track_code)
        finished_at_local = format_local_time(extract_finished_at_local(result_data, path))

        started_at_local = runtime_state.get("last_actual_start_local")
        if finished_at_local and runtime_state.get("last_track_code") != track_code:
            started_at_local = None

        items.append(
            {
                "event_id": build_event_id(
                    finished_at_local[:10] if finished_at_local else None,
                    finished_at_local[11:16] if finished_at_local else None,
                    track_code,
                ),
                "title": schedule_config.get("title", "Часовая гонка"),
                "track_code": track_code,
                "track_name": track_name,
                "started_at_local": format_local_time(started_at_local) if started_at_local else None,
                "finished_at_local": finished_at_local,
                "status": "finished",
                "results_repo_path": path.name,
            }
        )

    return {
        "items": items,
        "updated_at": now_local_iso(),
    }


def main():
    schedule_config = load_json(SCHEDULE_CONFIG_PATH, default={}) or {}
    runtime_state = load_json(RUNTIME_STATE_PATH, default={}) or {}
    schedule_data = load_json(SCHEDULE_PATH, default={"items": []}) or {"items": []}
    results_dir_path = resolve_results_dir_path(schedule_config)

    announcement = build_announcement(schedule_data, schedule_config)
    recent_races = build_recent_races(results_dir_path, schedule_config, runtime_state)

    save_json(ANNOUNCEMENT_PATH, announcement)
    save_json(RECENT_RACES_PATH, recent_races)

    print("publisher.py completed successfully.")
    print(f"announcement.json updated: {ANNOUNCEMENT_PATH}")
    print(f"recent_races.json updated: {RECENT_RACES_PATH}")


if __name__ == "__main__":
    main()
