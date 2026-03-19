import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


APP_ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_ROOT_DIR = APP_ROOT_DIR.parent / "hourly-data"
CONFIG_DIR = DATA_ROOT_DIR / "config"
SCHEDULE_CONFIG_PATH = CONFIG_DIR / "schedule_config.json"
ROTATION_STATE_PATH = CONFIG_DIR / "rotation_state.json"
RUNTIME_STATE_PATH = CONFIG_DIR / "runtime_state.json"
SCHEDULE_PATH = DATA_ROOT_DIR / "schedule.json"
ANNOUNCEMENT_PATH = DATA_ROOT_DIR / "announcement.json"
RECENT_RACES_PATH = DATA_ROOT_DIR / "recent_races.json"
UTC_PLUS_3 = timezone(timedelta(hours=3))
SCHEDULE_LOOKAHEAD_SLOTS = 3


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


def resolve_server_path(schedule_config: dict, configured_path: str | None, default_relative_path: str) -> Path:
    if configured_path:
        configured = Path(configured_path)
        if configured.is_absolute():
            return configured

    server_root_value = schedule_config.get("server_root")
    if server_root_value:
        server_root = Path(server_root_value)
        if configured_path:
            return server_root / Path(configured_path)
        return server_root / Path(default_relative_path)

    if configured_path:
        return DATA_ROOT_DIR / Path(configured_path)

    return DATA_ROOT_DIR / Path(default_relative_path)


def resolve_event_config_path(schedule_config: dict) -> Path:
    return resolve_server_path(schedule_config, schedule_config.get("event_config_path"), "cfg/event.json")


def resolve_event_rules_path(schedule_config: dict) -> Path:
    return resolve_server_path(schedule_config, schedule_config.get("event_rules_path"), "cfg/eventRules.json")


def resolve_settings_path(schedule_config: dict) -> Path:
    return resolve_server_path(schedule_config, schedule_config.get("settings_path"), "cfg/settings.json")


def parse_slot_datetime(item: dict):
    date_value = item.get("date")
    time_value = item.get("start_time_local")
    if not date_value or not time_value:
        return None

    try:
        return datetime.strptime(f"{date_value} {time_value}", "%Y-%m-%d %H:%M").replace(tzinfo=UTC_PLUS_3)
    except ValueError:
        return None


def clean_server_name(value):
    if not value:
        return None

    text = str(value).strip()
    lower_text = text.lower()

    markers = [" пароль", " password", " http", " https", " discord.gg", " t.me/"]
    cut_index = len(text)

    for marker in markers:
        found_index = lower_text.find(marker)
        if found_index > 0:
            cut_index = min(cut_index, found_index)

    text = text[:cut_index].strip(" ,|-")
    return text or str(value).strip()


def find_session(event_config: dict, session_type: str):
    sessions = event_config.get("sessions")
    if not isinstance(sessions, list):
        return {}

    for session in sessions:
        if isinstance(session, dict) and session.get("sessionType") == session_type:
            return session

    return {}


def build_server_info(settings_data: dict):
    return {
        "name": clean_server_name(settings_data.get("serverName")),
        "full_name": settings_data.get("serverName"),
        "password": settings_data.get("password"),
        "car_group": settings_data.get("carGroup"),
        "max_car_slots": settings_data.get("maxCarSlots"),
        "safety_rating_requirement": settings_data.get("safetyRatingRequirement"),
        "track_medals_requirement": settings_data.get("trackMedalsRequirement"),
        "racecraft_rating_requirement": settings_data.get("racecraftRatingRequirement"),
        "is_race_locked": bool(settings_data.get("isRaceLocked")),
    }


def build_session_info(event_config: dict):
    qualify_session = find_session(event_config, "Q")
    race_session = find_session(event_config, "R")

    qualifying_duration = qualify_session.get("sessionDurationMinutes")
    race_duration = race_session.get("sessionDurationMinutes")

    format_parts = []
    if isinstance(qualifying_duration, int) and qualifying_duration > 0:
        format_parts.append(f"Q {qualifying_duration}m")
    if isinstance(race_duration, int) and race_duration > 0:
        format_parts.append(f"R {race_duration}m")

    return {
        "format_label": " + ".join(format_parts) if format_parts else None,
        "qualifying_duration_minutes": qualifying_duration,
        "race_duration_minutes": race_duration,
        "pre_race_waiting_time_seconds": event_config.get("preRaceWaitingTimeSeconds"),
        "session_over_time_seconds": event_config.get("sessionOverTimeSeconds"),
        "time_multiplier": race_session.get("timeMultiplier") or qualify_session.get("timeMultiplier"),
    }


def build_rules_info(event_rules: dict):
    pit_window_length_sec = event_rules.get("pitWindowLengthSec")
    pit_window_minutes = None
    if isinstance(pit_window_length_sec, int) and pit_window_length_sec >= 0:
        pit_window_minutes = pit_window_length_sec // 60

    return {
        "mandatory_pitstop_count": event_rules.get("mandatoryPitstopCount"),
        "pit_window_length_minutes": pit_window_minutes,
        "refuelling_allowed_in_race": event_rules.get("isRefuellingAllowedInRace"),
        "refuelling_time_fixed": event_rules.get("isRefuellingTimeFixed"),
        "mandatory_pitstop_refuelling_required": event_rules.get("isMandatoryPitstopRefuellingRequired"),
        "mandatory_pitstop_tyre_change_required": event_rules.get("isMandatoryPitstopTyreChangeRequired"),
        "mandatory_pitstop_swap_driver_required": event_rules.get("isMandatoryPitstopSwapDriverRequired"),
        "max_drivers_count": event_rules.get("maxDriversCount"),
        "tyre_set_count": event_rules.get("tyreSetCount"),
    }


def build_weather_info(event_config: dict):
    cloud_level = event_config.get("cloudLevel")
    rain_level = event_config.get("rain")

    if isinstance(rain_level, (int, float)) and rain_level >= 0.2:
        summary_key = "wet"
    elif isinstance(cloud_level, (int, float)) and cloud_level >= 0.65:
        summary_key = "cloudy"
    elif isinstance(cloud_level, (int, float)) and cloud_level >= 0.3:
        summary_key = "mixed"
    else:
        summary_key = "clear"

    return {
        "ambient_temp_c": event_config.get("ambientTemp"),
        "cloud_level": cloud_level,
        "rain_level": rain_level,
        "weather_randomness": event_config.get("weatherRandomness"),
        "summary_key": summary_key,
    }


def build_accessory_info(settings_data: dict, event_config: dict, event_rules: dict):
    return {
        "server": build_server_info(settings_data),
        "session": build_session_info(event_config),
        "rules": build_rules_info(event_rules),
        "weather": build_weather_info(event_config),
    }


def parse_launch_times(schedule_config: dict):
    launch_times = schedule_config.get("launch_times_local") or []
    parsed = []

    for value in launch_times:
        try:
            parsed.append(datetime.strptime(value, "%H:%M").time())
        except (TypeError, ValueError):
            continue

    parsed.sort()
    return parsed


def determine_slot_label(slot_time):
    if slot_time.hour < 17:
        return "Afternoon Slot"
    return "Evening Slot"


def build_track_lookup(schedule_config: dict):
    tracks = schedule_config.get("tracks") or []
    return {track.get("code"): track for track in tracks if isinstance(track, dict) and track.get("code")}


def matches_slot(entry: dict, slot_date: str, slot_time: str):
    if not isinstance(entry, dict):
        return False
    return entry.get("date") == slot_date and entry.get("start_time_local") == slot_time


def find_override(schedule_config: dict, slot_date: str, slot_time: str):
    for entry in schedule_config.get("overrides") or []:
        if matches_slot(entry, slot_date, slot_time):
            return entry
    return None


def is_exception(schedule_config: dict, slot_date: str, slot_time: str):
    for entry in schedule_config.get("exceptions") or []:
        if matches_slot(entry, slot_date, slot_time):
            return True
    return False


def build_schedule(schedule_config: dict, rotation_state: dict):
    timezone_label = schedule_config.get("timezone", "UTC+3")
    launch_times = parse_launch_times(schedule_config)
    tracks = schedule_config.get("tracks") or []
    track_lookup = build_track_lookup(schedule_config)

    if not launch_times or not tracks:
        return {"items": [], "updated_at": now_local_iso()}

    next_track_index = rotation_state.get("next_track_index", 0)
    if not isinstance(next_track_index, int):
        next_track_index = 0

    items = []
    current_time = now_local()
    current_date = current_time.date()
    track_cursor = next_track_index % len(tracks)
    day_offset = 0

    while len(items) < SCHEDULE_LOOKAHEAD_SLOTS and day_offset < 30:
        slot_date = current_date + timedelta(days=day_offset)

        for launch_time in launch_times:
            slot_dt = datetime.combine(slot_date, launch_time, tzinfo=UTC_PLUS_3)
            if slot_dt < current_time:
                continue

            slot_date_str = slot_dt.strftime("%Y-%m-%d")
            slot_time_str = slot_dt.strftime("%H:%M")

            if is_exception(schedule_config, slot_date_str, slot_time_str):
                continue

            override = find_override(schedule_config, slot_date_str, slot_time_str)
            selected_track = tracks[track_cursor]
            if override and override.get("track_code"):
                selected_track = track_lookup.get(override["track_code"], selected_track)

            items.append(
                {
                    "date": slot_date_str,
                    "start_time_local": slot_time_str,
                    "timezone": timezone_label,
                    "track_code": selected_track.get("code"),
                    "track_name": override.get("track_name") if override else None,
                    "slot_label": (override or {}).get("slot_label") or determine_slot_label(launch_time),
                    "status": (override or {}).get("status", "scheduled"),
                }
            )

            if not items[-1]["track_name"]:
                items[-1]["track_name"] = selected_track.get("name") or normalize_track_name(selected_track.get("code"))

            track_cursor = (track_cursor + 1) % len(tracks)

            if len(items) >= SCHEDULE_LOOKAHEAD_SLOTS:
                break

        day_offset += 1

    return {
        "items": items,
        "updated_at": now_local_iso(),
    }


def build_announcement(schedule_data: dict, schedule_config: dict, settings_data: dict, event_config: dict, event_rules: dict):
    items = schedule_data.get("items") if isinstance(schedule_data, dict) else []
    now_value = now_local()
    accessory_info = build_accessory_info(settings_data, event_config, event_rules)

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
            **accessory_info,
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
        **accessory_info,
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
    rotation_state = load_json(ROTATION_STATE_PATH, default={}) or {}
    runtime_state = load_json(RUNTIME_STATE_PATH, default={}) or {}
    settings_data = load_json(resolve_settings_path(schedule_config), default={}) or {}
    event_config = load_json(resolve_event_config_path(schedule_config), default={}) or {}
    event_rules = load_json(resolve_event_rules_path(schedule_config), default={}) or {}
    results_dir_path = resolve_results_dir_path(schedule_config)

    schedule_data = build_schedule(schedule_config, rotation_state)
    announcement = build_announcement(schedule_data, schedule_config, settings_data, event_config, event_rules)
    recent_races = build_recent_races(results_dir_path, schedule_config, runtime_state)

    save_json(SCHEDULE_PATH, schedule_data)
    save_json(ANNOUNCEMENT_PATH, announcement)
    save_json(RECENT_RACES_PATH, recent_races)

    print("publisher.py completed successfully.")
    print(f"schedule.json updated: {SCHEDULE_PATH}")
    print(f"announcement.json updated: {ANNOUNCEMENT_PATH}")
    print(f"recent_races.json updated: {RECENT_RACES_PATH}")


if __name__ == "__main__":
    main()
