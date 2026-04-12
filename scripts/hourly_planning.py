import random
from copy import deepcopy
from datetime import datetime, timedelta, timezone


UTC_PLUS_3 = timezone(timedelta(hours=3))
DEFAULT_LOOKAHEAD_SLOTS = 3
DEFAULT_VISIBLE_SLOTS = 3
DEFAULT_WEATHER_PROFILES = [
    {
        "id": 1,
        "weight": 25,
        "cloud_range": [0.0, 0.15],
        "rain_range": [0.0, 0.0],
        "randomness_range": [0, 2],
        "summary_key": "clear",
    },
    {
        "id": 2,
        "weight": 25,
        "cloud_range": [0.65, 0.9],
        "rain_range": [0.0, 0.0],
        "randomness_range": [1, 3],
        "summary_key": "cloudy",
    },
    {
        "id": 3,
        "weight": 25,
        "cloud_range": [0.35, 0.7],
        "rain_range": [0.0, 0.12],
        "randomness_range": [4, 7],
        "summary_key": "mixed",
    },
    {
        "id": 4,
        "weight": 25,
        "cloud_range": [0.7, 0.95],
        "rain_range": [0.22, 0.35],
        "randomness_range": [2, 5],
        "summary_key": "wet",
    },
]


def now_local():
    return datetime.now(UTC_PLUS_3)


def now_local_iso():
    return now_local().isoformat(timespec="seconds")


def build_event_id(date_value, time_value, track_code):
    safe_date = date_value or "unknown-date"
    safe_time = (time_value or "0000").replace(":", "")
    safe_track = track_code or "unknown-track"
    return f"hourly_{safe_date}_{safe_time}_{safe_track}"


def parse_slot_datetime(item: dict):
    date_value = item.get("date")
    time_value = item.get("start_time_local")
    if not date_value or not time_value:
        return None
    try:
        return datetime.strptime(f"{date_value} {time_value}", "%Y-%m-%d %H:%M").replace(tzinfo=UTC_PLUS_3)
    except ValueError:
        return None


def determine_slot_label(slot_time):
    return "Afternoon Slot" if slot_time.hour < 17 else "Evening Slot"


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


def build_weather_summary_key(cloud_level, rain_level):
    if isinstance(rain_level, (int, float)) and rain_level >= 0.2:
        return "wet"
    if isinstance(cloud_level, (int, float)) and cloud_level >= 0.65:
        return "cloudy"
    if isinstance(cloud_level, (int, float)) and cloud_level >= 0.3:
        return "mixed"
    return "clear"


def normalize_number_range(value, default_min, default_max, minimum=None, maximum=None):
    min_value = default_min
    max_value = default_max
    if isinstance(value, (int, float)):
        min_value = float(value)
        max_value = float(value)
    elif isinstance(value, (list, tuple)) and len(value) >= 2:
        first = value[0]
        second = value[1]
        if isinstance(first, (int, float)):
            min_value = float(first)
        if isinstance(second, (int, float)):
            max_value = float(second)
    if min_value > max_value:
        min_value, max_value = max_value, min_value
    if minimum is not None:
        min_value = max(minimum, min_value)
        max_value = max(minimum, max_value)
    if maximum is not None:
        min_value = min(maximum, min_value)
        max_value = min(maximum, max_value)
    return [min_value, max_value]


def normalize_int_range(value, default_min, default_max, minimum=None, maximum=None):
    numeric_range = normalize_number_range(value, default_min, default_max, minimum, maximum)
    return [int(round(numeric_range[0])), int(round(numeric_range[1]))]


def build_track_lookup(schedule_config: dict):
    tracks = schedule_config.get("tracks") or []
    return {track.get("code"): track for track in tracks if isinstance(track, dict) and track.get("code")}


def build_track_index_lookup(schedule_config: dict):
    tracks = schedule_config.get("tracks") or []
    return {
        track.get("code"): index
        for index, track in enumerate(tracks)
        if isinstance(track, dict) and track.get("code")
    }


def matches_slot(entry: dict, slot_date: str, slot_time: str):
    return isinstance(entry, dict) and entry.get("date") == slot_date and entry.get("start_time_local") == slot_time


def find_override(schedule_config: dict, slot_date: str, slot_time: str):
    for entry in schedule_config.get("overrides") or []:
        if matches_slot(entry, slot_date, slot_time):
            return entry
    return None


def is_exception(schedule_config: dict, slot_date: str, slot_time: str):
    return any(matches_slot(entry, slot_date, slot_time) for entry in schedule_config.get("exceptions") or [])


def parse_launch_times(schedule_config: dict):
    parsed = []
    for value in schedule_config.get("launch_times_local") or []:
        try:
            parsed.append(datetime.strptime(value, "%H:%M").time())
        except (TypeError, ValueError):
            continue
    parsed.sort()
    return parsed


def get_weather_planning_config(schedule_config: dict):
    planning = deepcopy(schedule_config.get("weather_planning") or {})
    slots_ahead = planning.get("slots_ahead", DEFAULT_LOOKAHEAD_SLOTS)
    if not isinstance(slots_ahead, int) or slots_ahead <= 0:
        slots_ahead = DEFAULT_LOOKAHEAD_SLOTS

    ambient_temp_range = normalize_number_range(
        planning.get("ambient_temp_range_c"),
        14,
        24,
        minimum=-20,
        maximum=60,
    )

    raw_profiles = planning.get("profiles") or DEFAULT_WEATHER_PROFILES
    normalized_profiles = []
    for index, profile in enumerate(raw_profiles, start=1):
        if not isinstance(profile, dict):
            continue
        normalized_profiles.append(
            {
                "id": profile.get("id", index),
                "weight": profile.get("weight", 1) if isinstance(profile.get("weight", 1), (int, float)) else 1,
                "cloud_range": normalize_number_range(
                    profile.get("cloud_range", profile.get("cloudLevel")),
                    0.0,
                    0.4,
                    minimum=0.0,
                    maximum=1.0,
                ),
                "rain_range": normalize_number_range(
                    profile.get("rain_range", profile.get("rain")),
                    0.0,
                    0.0,
                    minimum=0.0,
                    maximum=1.0,
                ),
                "randomness_range": normalize_int_range(
                    profile.get("randomness_range", profile.get("weatherRandomness")),
                    1,
                    3,
                    minimum=0,
                    maximum=10,
                ),
                "ambient_temp_range_c": normalize_number_range(
                    profile.get("ambient_temp_range_c", profile.get("ambientTemp")),
                    ambient_temp_range[0],
                    ambient_temp_range[1],
                    minimum=-20,
                    maximum=60,
                ),
                "summary_key": profile.get("summary_key"),
            }
        )

    if not normalized_profiles:
        normalized_profiles = deepcopy(DEFAULT_WEATHER_PROFILES)

    return {
        "slots_ahead": slots_ahead,
        "ambient_temp_range_c": ambient_temp_range,
        "profiles": normalized_profiles,
    }


def choose_weighted_profile(profiles):
    weights = []
    for profile in profiles:
        weight = profile.get("weight", 1)
        if not isinstance(weight, (int, float)) or weight <= 0:
            weight = 1
        weights.append(weight)
    return random.choices(profiles, weights=weights, k=1)[0]


def random_float(number_range):
    min_value, max_value = number_range
    if min_value == max_value:
        return round(min_value, 2)
    return round(random.uniform(min_value, max_value), 2)


def random_int(number_range):
    min_value, max_value = number_range
    if min_value > max_value:
        min_value, max_value = max_value, min_value
    return random.randint(int(min_value), int(max_value))


def generate_planned_weather(schedule_config: dict):
    planning = get_weather_planning_config(schedule_config)
    profile = choose_weighted_profile(planning["profiles"])
    cloud_level = random_float(profile["cloud_range"])
    rain_level = random_float(profile["rain_range"])
    weather_randomness = random_int(profile["randomness_range"])
    ambient_temp_c = int(round(random_float(profile["ambient_temp_range_c"])))
    summary_key = profile.get("summary_key") or build_weather_summary_key(cloud_level, rain_level)
    return {
        "profile_id": profile.get("id"),
        "ambient_temp_c": ambient_temp_c,
        "cloud_level": cloud_level,
        "rain_level": rain_level,
        "weather_randomness": weather_randomness,
        "summary_key": summary_key,
        "created_at": now_local_iso(),
    }


def build_schedule_slots(schedule_config: dict, rotation_state: dict, current_time=None):
    timezone_label = schedule_config.get("timezone", "UTC+3")
    launch_times = parse_launch_times(schedule_config)
    tracks = schedule_config.get("tracks") or []
    track_lookup = build_track_lookup(schedule_config)
    track_index_lookup = build_track_index_lookup(schedule_config)
    planning = get_weather_planning_config(schedule_config)
    if not launch_times or not tracks:
        return []
    next_track_index = rotation_state.get("next_track_index", 0)
    if not isinstance(next_track_index, int):
        next_track_index = 0
    queue_length = max(planning["slots_ahead"], DEFAULT_VISIBLE_SLOTS + 1)
    track_queue_codes = [
        code
        for code in (rotation_state.get("track_queue_codes") or [])
        if isinstance(code, str) and code in track_lookup
    ]
    expected_first_code = tracks[next_track_index % len(tracks)].get("code")
    if not track_queue_codes or track_queue_codes[0] != expected_first_code:
        track_queue_codes = []

    cursor = next_track_index % len(tracks)
    while len(track_queue_codes) < min(DEFAULT_VISIBLE_SLOTS, queue_length):
        track_queue_codes.append(tracks[cursor].get("code"))
        cursor = (cursor + 1) % len(tracks)

    if len(track_queue_codes) == DEFAULT_VISIBLE_SLOTS and queue_length > DEFAULT_VISIBLE_SLOTS:
        hidden_candidates = [
            track.get("code")
            for track in tracks
            if isinstance(track, dict)
            and track.get("code")
            and track.get("code") not in set(track_queue_codes)
        ]
        if not hidden_candidates:
            hidden_candidates = [
                track.get("code")
                for track in tracks
                if isinstance(track, dict) and track.get("code") and track.get("code") != track_queue_codes[-1]
            ]
        if not hidden_candidates:
            hidden_candidates = [
                track.get("code")
                for track in tracks
                if isinstance(track, dict) and track.get("code")
            ]
        random_hidden_code = random.choice(hidden_candidates)
        track_queue_codes.append(random_hidden_code)
        cursor = (track_index_lookup.get(random_hidden_code, cursor) + 1) % len(tracks)

    while len(track_queue_codes) < queue_length:
        track_queue_codes.append(tracks[cursor].get("code"))
        cursor = (cursor + 1) % len(tracks)

    rotation_state["track_queue_codes"] = track_queue_codes
    items = []
    current_time = current_time or now_local()
    current_date = current_time.date()
    day_offset = 0
    while len(items) < planning["slots_ahead"] and day_offset < 30:
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
            queue_track_code = track_queue_codes[len(items)] if len(items) < len(track_queue_codes) else None
            selected_track = track_lookup.get(queue_track_code) or tracks[next_track_index % len(tracks)]
            if override and override.get("track_code"):
                selected_track = track_lookup.get(override["track_code"], selected_track)
            item = {
                "event_id": build_event_id(slot_date_str, slot_time_str, selected_track.get("code")),
                "date": slot_date_str,
                "start_time_local": slot_time_str,
                "timezone": timezone_label,
                "track_code": selected_track.get("code"),
                "track_name": override.get("track_name") if override else None,
                "slot_label": (override or {}).get("slot_label") or determine_slot_label(launch_time),
                "status": (override or {}).get("status", "scheduled"),
            }
            item["track_name"] = item["track_name"] or selected_track.get("name") or normalize_track_name(selected_track.get("code"))
            items.append(item)
            if len(items) >= planning["slots_ahead"]:
                break
        day_offset += 1
    return items


def ensure_planned_weather(runtime_state: dict, schedule_items: list[dict], schedule_config: dict):
    runtime_state = runtime_state or {}
    planned_weather = runtime_state.get("planned_weather")
    if not isinstance(planned_weather, dict):
        planned_weather = {}

    active_event_id = runtime_state.get("active_event_id")
    valid_event_ids = {
        item.get("event_id")
        for item in schedule_items
        if isinstance(item, dict) and item.get("event_id")
    }
    if isinstance(active_event_id, str) and active_event_id:
        valid_event_ids.add(active_event_id)

    cleaned_planned_weather = {}
    for event_id, weather in planned_weather.items():
        if event_id in valid_event_ids and isinstance(weather, dict):
            cleaned_planned_weather[event_id] = weather

    planned_weather = cleaned_planned_weather

    for item in schedule_items:
        event_id = item.get("event_id")
        if not event_id:
            continue
        weather = planned_weather.get(event_id)
        if not isinstance(weather, dict):
            weather = generate_planned_weather(schedule_config)
            planned_weather[event_id] = weather
        item_weather = {
            "profile_id": weather.get("profile_id"),
            "ambient_temp_c": weather.get("ambient_temp_c"),
            "cloud_level": weather.get("cloud_level"),
            "rain_level": weather.get("rain_level"),
            "weather_randomness": weather.get("weather_randomness"),
            "summary_key": weather.get("summary_key") or build_weather_summary_key(
                weather.get("cloud_level"),
                weather.get("rain_level"),
            ),
        }
        item["weather"] = item_weather
        item["rain_level"] = item_weather.get("rain_level")

    runtime_state["planned_weather"] = planned_weather
    runtime_state["updated_at"] = now_local_iso()
    return runtime_state, schedule_items


def get_planned_weather_for_slot(runtime_state: dict, event_id: str):
    planned_weather = (runtime_state or {}).get("planned_weather") or {}
    weather = planned_weather.get(event_id)
    return weather if isinstance(weather, dict) else None
