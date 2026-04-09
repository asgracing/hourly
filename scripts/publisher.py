import hashlib
import json
import math
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import hourly_planning as planning

APP_ROOT_DIR = Path(__file__).resolve().parents[1]
SERVER_ROOT_DIR = APP_ROOT_DIR.parent
DATA_ROOT_DIR = SERVER_ROOT_DIR / "hourly-data"
CONFIG_DIR = DATA_ROOT_DIR / "config"
SCHEDULE_CONFIG_PATH = CONFIG_DIR / "schedule_config.json"
ROTATION_STATE_PATH = CONFIG_DIR / "rotation_state.json"
RUNTIME_STATE_PATH = CONFIG_DIR / "runtime_state.json"
SCHEDULE_PATH = DATA_ROOT_DIR / "schedule.json"
ANNOUNCEMENT_PATH = DATA_ROOT_DIR / "announcement.json"
RECENT_RACES_PATH = DATA_ROOT_DIR / "recent_races.json"
RACES_DIR = DATA_ROOT_DIR / "races"
RACES_INDEX_PATH = RACES_DIR / "races.json"
UTC_PLUS_3 = timezone(timedelta(hours=3))
SCHEDULE_LOOKAHEAD_SLOTS = 3
RECENT_RACES_LIMIT = 12
INVALID_LAP_VALUES = {0, -1, 2147483647, 4294967295}
HOURLY_POINTS_MAP = {position: 26 - position for position in range(1, 26)}
BEST_LAP_BONUS = 1
HOURLY_POINTS_MULTIPLIER = 5
SCORING_BASE_MAX_POINTS = HOURLY_POINTS_MAP[1]
CAR_MODEL_NAMES = {
    0: "Porsche 991 GT3 R", 1: "Mercedes-AMG GT3", 2: "Ferrari 488 GT3", 3: "Audi R8 LMS",
    4: "Lamborghini Huracan GT3", 5: "McLaren 650S GT3", 6: "Nissan GT-R Nismo GT3 2018",
    7: "BMW M6 GT3", 8: "Bentley Continental GT3 2018", 9: "Porsche 991II GT3 Cup",
    10: "Nissan GT-R Nismo GT3 2017", 11: "Bentley Continental GT3 2016",
    12: "Aston Martin V12 Vantage GT3", 13: "Lamborghini Gallardo R-EX", 14: "Jaguar G3",
    15: "Lexus RC F GT3", 16: "Lamborghini Huracan Evo (2019)", 17: "Honda NSX GT3",
    18: "Lamborghini Huracan SuperTrofeo", 19: "Audi R8 LMS Evo (2019)",
    20: "AMR V8 Vantage (2019)", 21: "Honda NSX Evo (2019)", 22: "McLaren 720S GT3 (2019)",
    23: "Porsche 911II GT3 R (2019)", 24: "Ferrari 488 GT3 Evo 2020", 25: "Mercedes-AMG GT3 2020",
    26: "Ferrari 488 Challenge Evo", 27: "BMW M2 CS Racing", 28: "Porsche 911 GT3 Cup (Type 992)",
    29: "Lamborghini Huracan Super Trofeo EVO2", 30: "BMW M4 GT3", 31: "Audi R8 LMS GT3 evo II",
    32: "Ferrari 296 GT3", 33: "Lamborghini Huracan Evo2", 34: "Porsche 992 GT3 R",
    35: "McLaren 720S GT3 Evo 2023", 36: "Ford Mustang GT3",
}


def detect_text_encoding(raw: bytes) -> str:
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return "utf-16"
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    return "utf-8"


def normalize_points_value(value):
    if value is None:
        return 0

    floor_value = math.floor(value)
    fraction = value - floor_value

    if fraction >= 0.6:
        return floor_value + 1
    return floor_value


def resolve_max_points_for_participants(participant_count: int):
    if participant_count >= 25:
        return 25
    if participant_count >= 20:
        return 20
    if participant_count >= 15:
        return 15
    if participant_count >= 10:
        return 10
    if participant_count >= 5:
        return 5
    return max(participant_count, 0)


def calculate_scaled_points(base_points, participant_count: int):
    if base_points <= 0 or participant_count <= 0:
        return 0

    max_points = resolve_max_points_for_participants(participant_count)
    scale = max_points / SCORING_BASE_MAX_POINTS
    return normalize_points_value(base_points * scale)


def calculate_race_points(position: int, participant_count: int, has_best_lap: bool = False):
    points = calculate_scaled_points(HOURLY_POINTS_MAP.get(position, 0), participant_count)
    if has_best_lap:
        points = normalize_points_value(points + BEST_LAP_BONUS)
    return points


def apply_points_multiplier(points: int, multiplier: int = HOURLY_POINTS_MULTIPLIER) -> int:
    if not isinstance(multiplier, int) or multiplier <= 1:
        return points
    return normalize_points_value(points * multiplier)


def load_json(path: Path, default=None):
    try:
        raw = path.read_bytes()
    except FileNotFoundError:
        return default
    encodings = [detect_text_encoding(raw), "utf-16-le", "utf-8-sig", "utf-8", "cp1251", "latin-1"]
    last_error = None
    for encoding in encodings:
        try:
            return json.loads(raw.decode(encoding).replace("\ufeff", "").replace("\x00", ""))
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


def resolve_server_root_path(schedule_config: dict) -> Path:
    configured_value = str(schedule_config.get("server_root") or "").strip()
    if not configured_value:
        return SERVER_ROOT_DIR

    configured_path = Path(configured_value).expanduser()
    if configured_path.is_absolute():
        return configured_path

    return SERVER_ROOT_DIR / configured_path


def resolve_results_dir_path(schedule_config: dict) -> Path:
    server_root = resolve_server_root_path(schedule_config)
    results_dir = Path(schedule_config.get("results_dir") or "results")
    if results_dir.is_absolute():
        return results_dir
    return server_root / results_dir


def resolve_server_path(schedule_config: dict, configured_path: str | None, default_relative_path: str) -> Path:
    if configured_path:
        configured = Path(configured_path)
        if configured.is_absolute():
            return configured
    server_root = resolve_server_root_path(schedule_config)
    if server_root:
        return server_root / Path(configured_path or default_relative_path)
    return DATA_ROOT_DIR / Path(configured_path or default_relative_path)


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
    cut_index = len(text)
    for marker in [" пароль", " password", " http", " https", " discord.gg", " t.me/"]:
        found_index = lower_text.find(marker)
        if found_index > 0:
            cut_index = min(cut_index, found_index)
    text = text[:cut_index].strip(" ,|-")
    return text or str(value).strip()


def find_session(event_config: dict, session_type: str):
    for session in event_config.get("sessions") or []:
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
    pit_window_minutes = pit_window_length_sec // 60 if isinstance(pit_window_length_sec, int) and pit_window_length_sec >= 0 else None
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
    parsed = []
    for value in schedule_config.get("launch_times_local") or []:
        try:
            parsed.append(datetime.strptime(value, "%H:%M").time())
        except (TypeError, ValueError):
            continue
    parsed.sort()
    return parsed


def determine_slot_label(slot_time):
    return "Afternoon Slot" if slot_time.hour < 17 else "Evening Slot"


def build_track_lookup(schedule_config: dict):
    tracks = schedule_config.get("tracks") or []
    return {track.get("code"): track for track in tracks if isinstance(track, dict) and track.get("code")}


def matches_slot(entry: dict, slot_date: str, slot_time: str):
    return isinstance(entry, dict) and entry.get("date") == slot_date and entry.get("start_time_local") == slot_time


def find_override(schedule_config: dict, slot_date: str, slot_time: str):
    for entry in schedule_config.get("overrides") or []:
        if matches_slot(entry, slot_date, slot_time):
            return entry
    return None


def is_exception(schedule_config: dict, slot_date: str, slot_time: str):
    return any(matches_slot(entry, slot_date, slot_time) for entry in schedule_config.get("exceptions") or [])


def build_schedule(schedule_config: dict, rotation_state: dict, event_config: dict):
    timezone_label = schedule_config.get("timezone", "UTC+3")
    launch_times = parse_launch_times(schedule_config)
    tracks = schedule_config.get("tracks") or []
    track_lookup = build_track_lookup(schedule_config)
    weather_info = build_weather_info(event_config)
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
            item = {
                "date": slot_date_str,
                "start_time_local": slot_time_str,
                "timezone": timezone_label,
                "track_code": selected_track.get("code"),
                "track_name": override.get("track_name") if override else None,
                "slot_label": (override or {}).get("slot_label") or determine_slot_label(launch_time),
                "status": (override or {}).get("status", "scheduled"),
                "rain_level": weather_info.get("rain_level"),
            }
            item["track_name"] = item["track_name"] or selected_track.get("name") or normalize_track_name(selected_track.get("code"))
            items.append(item)
            track_cursor = (track_cursor + 1) % len(tracks)
            if len(items) >= SCHEDULE_LOOKAHEAD_SLOTS:
                break
        day_offset += 1
    return {"items": items, "updated_at": now_local_iso()}


def build_announcement(schedule_data: dict, schedule_config: dict, settings_data: dict, event_config: dict, event_rules: dict):
    items = schedule_data.get("items") if isinstance(schedule_data, dict) else []
    accessory_info = build_accessory_info(settings_data, event_config, event_rules)
    future_items = []
    for item in items or []:
        slot_dt = planning.parse_slot_datetime(item)
        if slot_dt and slot_dt >= now_local():
            future_items.append((slot_dt, item))
    future_items.sort(key=lambda pair: pair[0])
    next_item = future_items[0][1] if future_items else None
    planned_weather = next_item.get("weather") if isinstance(next_item, dict) else None
    if not isinstance(planned_weather, dict):
        planned_weather = accessory_info.get("weather")
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
            "weather": planned_weather,
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
        "weather": planned_weather,
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
        "barcelona": "Barcelona", "brands_hatch": "Brands Hatch", "hungaroring": "Hungaroring",
        "imola": "Imola", "kyalami": "Kyalami", "laguna_seca": "Laguna Seca", "misano": "Misano",
        "monza": "Monza", "mount_panorama": "Mount Panorama", "nurburgring": "Nurburgring",
        "oulton_park": "Oulton Park", "paul_ricard": "Paul Ricard", "red_bull_ring": "Red Bull Ring",
        "silverstone": "Silverstone", "snetterton": "Snetterton", "spa": "Spa", "suzuka": "Suzuka",
        "valencia": "Valencia", "watkins_glen": "Watkins Glen", "zandvoort": "Zandvoort", "zolder": "Zolder",
    }
    return mapping.get(track_code, str(track_code).replace("_", " ").replace("-", " ").title())


def make_public_driver_id(player_id):
    if not player_id:
        return None
    digest = hashlib.sha1(str(player_id).encode("utf-8")).hexdigest()
    return f"drv_{digest[:12]}"


def normalize_car_name(name: str):
    if not name:
        return None
    text = str(name).strip()
    text = re.sub(r"\s*\(\s*(?:19|20)\d{2}\s*\)\s*$", "", text)
    text = re.sub(r"\s+(?:19|20)\d{2}\s*$", "", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def get_car_info(car_model):
    if car_model is None:
        return {"car_model_id": None, "car_name_raw": None, "car_name": None}
    car_name_raw = CAR_MODEL_NAMES.get(car_model) or f"Car model {car_model}"
    return {
        "car_model_id": car_model,
        "car_name_raw": car_name_raw,
        "car_name": normalize_car_name(car_name_raw),
    }


def extract_driver_name(driver: dict) -> str:
    first_name = (driver or {}).get("firstName", "") or ""
    last_name = (driver or {}).get("lastName", "") or ""
    full_name = f"{first_name} {last_name}".strip()
    if full_name:
        return full_name
    short_name = (driver or {}).get("shortName", "") or ""
    if short_name:
        return short_name
    return "Unknown Driver"


def extract_driver_id_and_name(line: dict):
    current_driver = line.get("currentDriver") or {}
    car = line.get("car") or {}
    drivers = car.get("drivers") or []
    player_id = current_driver.get("playerId")
    display_name = extract_driver_name(current_driver)
    if not player_id and drivers:
        first_driver = drivers[0] or {}
        player_id = first_driver.get("playerId")
        if display_name == "Unknown Driver":
            display_name = extract_driver_name(first_driver)
    return player_id, display_name


def ms_to_lap_str(ms):
    if ms is None or ms in INVALID_LAP_VALUES or ms <= 0:
        return None
    minutes = ms // 60000
    seconds = (ms % 60000) // 1000
    millis = ms % 1000
    return f"{minutes}:{seconds:02d}.{millis:03d}"


def is_valid_lap(ms):
    return isinstance(ms, int) and ms > 0 and ms not in INVALID_LAP_VALUES


def extract_best_lap(line: dict):
    best_lap = (line.get("timing") or {}).get("bestLap")
    return best_lap if is_valid_lap(best_lap) else None


def extract_lap_count(line: dict):
    lap_count = (line.get("timing") or {}).get("lapCount", 0)
    return lap_count if isinstance(lap_count, int) else 0


def extract_total_time(line: dict):
    total_time = (line.get("timing") or {}).get("totalTime")
    if isinstance(total_time, int) and total_time >= 0 and total_time not in INVALID_LAP_VALUES:
        return total_time
    return None


def is_counted_race_result(line: dict):
    return extract_lap_count(line) > 0 and extract_total_time(line) is not None


def normalize_result_lines(lines: list):
    normalized = []
    best_lap_driver_id = None
    best_lap_ms = None
    for line in lines or []:
        player_id, display_name = extract_driver_id_and_name(line)
        line_best_lap = extract_best_lap(line)
        normalized.append({"line": line, "player_id": player_id, "display_name": display_name, "best_lap": line_best_lap})
        if player_id and line_best_lap is not None and (best_lap_ms is None or line_best_lap < best_lap_ms):
            best_lap_ms = line_best_lap
            best_lap_driver_id = player_id
    return normalized, best_lap_driver_id


def build_race_order(lines: list):
    prepared = []
    for index, line in enumerate(lines, start=1):
        total_time = extract_total_time(line)
        prepared.append(
            {
                "original_index": index,
                "line": line,
                "lap_count": extract_lap_count(line),
                "total_time": total_time if total_time is not None else 10**15,
            }
        )
    prepared.sort(key=lambda item: (-item["lap_count"], item["total_time"], item["original_index"]))
    return prepared


def dedupe_race_entries(race_order: list, normalized_lines: list):
    line_by_id = {id(item["line"]): item for item in normalized_lines}
    best_lap_by_player = {}

    for item in normalized_lines:
        player_id = item.get("player_id")
        best_lap = item.get("best_lap")
        if not player_id or best_lap is None:
            continue

        current_best = best_lap_by_player.get(player_id)
        if current_best is None or best_lap < current_best:
            best_lap_by_player[player_id] = best_lap

    selected_by_player = {}
    for ordered in race_order:
        item = line_by_id.get(id(ordered["line"]))
        if not item or not item.get("player_id"):
            continue

        player_id = item["player_id"]
        current_counted = is_counted_race_result(ordered["line"])
        existing = selected_by_player.get(player_id)
        if existing is None or (current_counted and not existing["counted"]):
            selected_by_player[player_id] = {
                "ordered": ordered,
                "counted": current_counted,
            }

    selected_line_ids = {
        id(entry["ordered"]["line"])
        for entry in selected_by_player.values()
    }

    deduped_normalized_lines = []
    for item in normalized_lines:
        line_id = id(item["line"])
        if line_id not in selected_line_ids:
            continue

        deduped_item = dict(item)
        player_id = deduped_item.get("player_id")
        if player_id in best_lap_by_player:
            deduped_item["best_lap"] = best_lap_by_player[player_id]
        deduped_normalized_lines.append(deduped_item)

    deduped_line_ids = {id(item["line"]) for item in deduped_normalized_lines}
    deduped_race_order = []
    emitted_line_ids = set()
    for ordered in race_order:
        line_id = id(ordered["line"])
        if line_id not in deduped_line_ids or line_id in emitted_line_ids:
            continue
        deduped_race_order.append(ordered)
        emitted_line_ids.add(line_id)

    best_lap_driver_id = None
    best_lap_ms = None
    for item in deduped_normalized_lines:
        player_id = item.get("player_id")
        best_lap = item.get("best_lap")
        if not player_id or best_lap is None:
            continue
        if best_lap_ms is None or best_lap < best_lap_ms:
            best_lap_ms = best_lap
            best_lap_driver_id = player_id

    return deduped_race_order, deduped_normalized_lines, best_lap_driver_id


def build_session_link_key(data: dict) -> str:
    return "|".join(
        [
            str((data or {}).get("serverName") or "").strip().lower(),
            str((data or {}).get("trackName") or "").strip().lower(),
            str((data or {}).get("raceWeekendIndex") or ""),
            str((data or {}).get("metaData") or "").strip().lower(),
        ]
    )


def build_qualifying_snapshot(data: dict, lines: list):
    normalized_lines, _ = normalize_result_lines(lines)
    line_by_id = {id(item["line"]): item for item in normalized_lines}
    positions_by_car_id = {}
    positions_by_player_id = {}
    for position, line in enumerate(lines, start=1):
        item = line_by_id.get(id(line))
        if not item or not item["player_id"]:
            continue
        car = line.get("car") or {}
        car_id = car.get("carId")
        entry = {
            "position": position,
            "player_id": item["player_id"],
            "driver": item["display_name"],
            "car_id": car_id,
            "race_number": car.get("raceNumber"),
        }
        if car_id is not None and car_id not in positions_by_car_id:
            positions_by_car_id[str(car_id)] = entry
        if item["player_id"] not in positions_by_player_id:
            positions_by_player_id[item["player_id"]] = entry
    return {
        "session_key": build_session_link_key(data),
        "positions_by_car_id": positions_by_car_id,
        "positions_by_player_id": positions_by_player_id,
    }


def queue_qualifying_snapshot(snapshot_queues: dict, snapshot: dict):
    session_key = snapshot.get("session_key")
    if session_key:
        snapshot_queues.setdefault(session_key, []).append(snapshot)


def pop_qualifying_snapshot(snapshot_queues: dict, data: dict):
    queue = snapshot_queues.get(build_session_link_key(data)) or []
    if not queue:
        return None
    snapshot = queue.pop()
    if not queue:
        snapshot_queues.pop(build_session_link_key(data), None)
    return snapshot


def resolve_start_position(line: dict, player_id, qualifying_snapshot: dict):
    if not qualifying_snapshot or not player_id:
        return None
    car = line.get("car") or {}
    car_id = car.get("carId")
    positions_by_car_id = qualifying_snapshot.get("positions_by_car_id") or {}
    positions_by_player_id = qualifying_snapshot.get("positions_by_player_id") or {}
    if car_id is not None:
        car_entry = positions_by_car_id.get(str(car_id))
        if car_entry and isinstance(car_entry.get("position"), int):
            return car_entry["position"]
    player_entry = positions_by_player_id.get(player_id)
    if player_entry and isinstance(player_entry.get("position"), int):
        return player_entry["position"]
    return None


def build_penalty_lookup(data: dict):
    penalty_lookup = {}
    for bucket_name in ("penalties", "post_race_penalties"):
        for item in data.get(bucket_name) or []:
            if not isinstance(item, dict):
                continue
            car_id = item.get("carId")
            if car_id is None:
                continue
            penalty_type = item.get("penalty") or "Unknown"
            if str(penalty_type).strip().lower() == "postracetime":
                continue
            key = (car_id, item.get("driverIndex", 0))
            entry = penalty_lookup.setdefault(key, {"count": 0, "penalty_points": 0, "items": []})
            penalty_value = item.get("penaltyValue", 0)
            entry["count"] += 1
            if isinstance(penalty_value, (int, float)):
                entry["penalty_points"] += penalty_value
            entry["items"].append(
                {
                    "type": penalty_type,
                    "reason": item.get("reason") or "Unknown",
                    "value": penalty_value if isinstance(penalty_value, (int, float)) else 0,
                    "bucket": bucket_name,
                }
            )
    return penalty_lookup


def format_total_time(ms):
    if ms is None or not isinstance(ms, int) or ms < 0:
        return None
    total_seconds, millis = divmod(ms, 1000)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}.{millis:03d}"
    return f"{minutes}:{seconds:02d}.{millis:03d}"


def extract_finished_at_local(result_data: dict, source_file: Path):
    candidate = (result_data.get("sessionResult") or {}).get("finishTime")
    if isinstance(candidate, str) and candidate:
        try:
            return datetime.fromisoformat(candidate).astimezone(UTC_PLUS_3).isoformat(timespec="seconds")
        except ValueError:
            return candidate
    try:
        return datetime.fromtimestamp(source_file.stat().st_mtime, tz=UTC_PLUS_3).isoformat(timespec="seconds")
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


def build_race_detail(path: Path, data: dict, qualifying_snapshot: dict):
    lines = (((data or {}).get("sessionResult") or {}).get("leaderBoardLines") or [])
    if not isinstance(lines, list) or not lines:
        return None
    race_order = build_race_order(lines)
    normalized_lines, _ = normalize_result_lines(lines)
    race_order, normalized_lines, best_lap_driver_id = dedupe_race_entries(race_order, normalized_lines)
    line_by_id = {id(item["line"]): item for item in normalized_lines}
    penalty_lookup = build_penalty_lookup(data)
    track_code = str(data.get("trackName") or data.get("metaData") or "unknown").strip().lower()
    track_name = normalize_track_name(track_code)
    finished_at = extract_finished_at_local(data, path)
    participants = []
    winner_name = None
    winner_public_id = None
    race_best_lap = None
    race_best_lap_driver = None
    race_best_lap_public_id = None
    winner_total_time_ms = None
    scoring_participants_count = sum(
        1
        for ordered in race_order
        if (line_by_id.get(id(ordered["line"])) or {}).get("player_id") and is_counted_race_result(ordered["line"])
    )
    for position, ordered in enumerate(race_order, start=1):
        line = ordered["line"]
        item = line_by_id.get(id(line))
        if not item or not item["player_id"]:
            continue
        car = line.get("car") or {}
        car_id = car.get("carId")
        car_info = get_car_info(car.get("carModel"))
        penalty_data = penalty_lookup.get((car_id, 0), {"count": 0, "penalty_points": 0, "items": []})
        total_time_ms = extract_total_time(line)
        counted_for_stats = is_counted_race_result(line)
        best_lap_ms = item["best_lap"]
        start_position = resolve_start_position(line, item["player_id"], qualifying_snapshot)
        positions_delta = start_position - position if isinstance(start_position, int) else None
        had_best_lap = best_lap_driver_id == item["player_id"]
        points = apply_points_multiplier(
            calculate_race_points(position, scoring_participants_count, had_best_lap),
            HOURLY_POINTS_MULTIPLIER,
        )
        if position == 1:
            winner_name = item["display_name"]
            winner_public_id = make_public_driver_id(item["player_id"])
            winner_total_time_ms = total_time_ms
        if had_best_lap:
            race_best_lap = ms_to_lap_str(best_lap_ms)
            race_best_lap_driver = item["display_name"]
            race_best_lap_public_id = make_public_driver_id(item["player_id"])
        gap_ms = None
        if winner_total_time_ms is not None and total_time_ms is not None and position > 1:
            gap_ms = max(0, total_time_ms - winner_total_time_ms)
        participants.append(
            {
                "position": position,
                "start_position": start_position,
                "positions_delta": positions_delta,
                "player_id": item["player_id"],
                "public_id": make_public_driver_id(item["player_id"]),
                "driver": item["display_name"],
                "car_id": car_id,
                "car_model": car.get("carModel"),
                "car_model_id": car_info["car_model_id"],
                "car_name_raw": car_info["car_name_raw"],
                "car_name": car_info["car_name"],
                "race_number": car.get("raceNumber"),
                "lap_count": extract_lap_count(line),
                "best_lap_ms": best_lap_ms,
                "best_lap": ms_to_lap_str(best_lap_ms),
                "total_time_ms": total_time_ms,
                "total_time": format_total_time(total_time_ms),
                "gap_ms": gap_ms,
                "gap": format_total_time(gap_ms) if gap_ms is not None else None,
                "counted_for_stats": counted_for_stats,
                "counted_for_points": True,
                "points": points,
                "had_best_lap": had_best_lap,
                "penalty_count": penalty_data["count"],
                "penalty_points": penalty_data["penalty_points"],
                "penalties": penalty_data["items"],
            }
        )
    if not participants:
        return None
    event_id = build_event_id(finished_at[:10] if finished_at else None, finished_at[11:16] if finished_at else None, track_code)
    return {
        "event_id": event_id,
        "race_id": path.name,
        "source_file": path.name,
        "details_path": f"races/{event_id}.json",
        "date": finished_at[:10] if finished_at else None,
        "finished_at": finished_at,
        "finished_at_local": format_local_time(finished_at),
        "track": track_code,
        "track_code": track_code,
        "track_name": track_name,
        "session_type": str(data.get("sessionType", "")).upper().strip(),
        "server_name": data.get("serverName"),
        "meta_data": data.get("metaData"),
        "participants_count": len(participants),
        "scoring_participants_count": scoring_participants_count,
        "points_multiplier": HOURLY_POINTS_MULTIPLIER,
        "points_rule": "scaled_25_to_1_by_classified_x5_all_participants",
        "winner": winner_name,
        "winner_public_id": winner_public_id,
        "best_lap": race_best_lap,
        "best_lap_driver": race_best_lap_driver,
        "best_lap_public_id": race_best_lap_public_id,
        "status": "finished",
        "results": participants,
        "total_penalties": sum(item["penalty_count"] for item in participants),
    }


def build_recent_races(results_dir_path: Path):
    if not results_dir_path.exists():
        empty_payload = {"items": [], "updated_at": now_local_iso()}
        return empty_payload, empty_payload
    result_paths = sorted(results_dir_path.glob("*.json"), key=lambda path: path.stat().st_mtime)
    qualifying_snapshots = {}
    race_details = []
    for path in result_paths:
        data = load_json(path, default={}) or {}
        suffix = path.stem.upper()
        lines = (((data or {}).get("sessionResult") or {}).get("leaderBoardLines") or [])
        if suffix.endswith("_Q"):
            queue_qualifying_snapshot(qualifying_snapshots, build_qualifying_snapshot(data, lines))
            continue
        if not suffix.endswith("_R"):
            continue
        race_detail = build_race_detail(path, data, pop_qualifying_snapshot(qualifying_snapshots, data))
        if race_detail:
            race_details.append(race_detail)
    race_details.sort(key=lambda item: item.get("finished_at") or "", reverse=True)
    race_details = race_details[:RECENT_RACES_LIMIT]
    race_summaries = []
    for detail in race_details:
        race_summaries.append(
            {
                "event_id": detail["event_id"],
                "title": "Hourly Race",
                "track": detail["track"],
                "track_code": detail["track_code"],
                "track_name": detail["track_name"],
                "finished_at": detail["finished_at"],
                "finished_at_local": detail["finished_at_local"],
                "participants_count": detail["participants_count"],
                "scoring_participants_count": detail["scoring_participants_count"],
                "points_multiplier": detail["points_multiplier"],
                "points_rule": detail["points_rule"],
                "winner": detail["winner"],
                "winner_public_id": detail["winner_public_id"],
                "best_lap": detail["best_lap"],
                "best_lap_driver": detail["best_lap_driver"],
                "best_lap_public_id": detail["best_lap_public_id"],
                "status": detail["status"],
                "details_path": detail["details_path"],
                "results_repo_path": detail["source_file"],
            }
        )
    summary_payload = {"items": race_summaries, "updated_at": now_local_iso()}
    details_payload = {"items": race_details, "updated_at": now_local_iso()}
    return summary_payload, details_payload


def save_race_details(race_details_payload: dict):
    RACES_DIR.mkdir(parents=True, exist_ok=True)
    expected_files = {RACES_INDEX_PATH.name}
    for detail in race_details_payload.get("items") or []:
        path = RACES_DIR / f"{detail['event_id']}.json"
        save_json(path, detail)
        expected_files.add(path.name)
    for path in RACES_DIR.glob("*.json"):
        if path.name not in expected_files:
            path.unlink(missing_ok=True)


def main():
    schedule_config = load_json(SCHEDULE_CONFIG_PATH, default={}) or {}
    rotation_state = load_json(ROTATION_STATE_PATH, default={}) or {}
    runtime_state = load_json(RUNTIME_STATE_PATH, default={}) or {}
    settings_data = load_json(resolve_settings_path(schedule_config), default={}) or {}
    event_config = load_json(resolve_event_config_path(schedule_config), default={}) or {}
    event_rules = load_json(resolve_event_rules_path(schedule_config), default={}) or {}
    results_dir_path = resolve_results_dir_path(schedule_config)
    schedule_items = planning.build_schedule_slots(schedule_config, rotation_state)
    runtime_state, schedule_items = planning.ensure_planned_weather(runtime_state, schedule_items, schedule_config)
    schedule_data = {"items": schedule_items, "updated_at": now_local_iso()}
    announcement = build_announcement(schedule_data, schedule_config, settings_data, event_config, event_rules)
    recent_races_summary, recent_races_details = build_recent_races(results_dir_path)
    save_json(ROTATION_STATE_PATH, rotation_state)
    save_json(RUNTIME_STATE_PATH, runtime_state)
    save_json(SCHEDULE_PATH, schedule_data)
    save_json(ANNOUNCEMENT_PATH, announcement)
    save_json(RECENT_RACES_PATH, recent_races_summary)
    save_json(RACES_INDEX_PATH, recent_races_summary)
    save_race_details(recent_races_details)
    print("publisher.py completed successfully.")
    print(f"schedule.json updated: {SCHEDULE_PATH}")
    print(f"announcement.json updated: {ANNOUNCEMENT_PATH}")
    print(f"recent_races.json updated: {RECENT_RACES_PATH}")
    print(f"races index updated: {RACES_INDEX_PATH}")


if __name__ == "__main__":
    main()
