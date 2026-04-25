import argparse
import json
import logging
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone, timedelta
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
STOP_REQUEST_PATH = CONFIG_DIR / "stop_request.json"
REFERENCE_EVENT_PATH = APP_ROOT_DIR / "event.json"
PUBLISHER_PATH = APP_ROOT_DIR / "scripts" / "publisher.py"
LOGS_DIR = APP_ROOT_DIR / "logs"
LOG_FILE_PATH = LOGS_DIR / "orchestrator.log"
SERVER_OUTPUT_LOG_PATH = LOGS_DIR / "acc_server_stdout.log"
COMMIT_MESSAGE_PREFIX = "Hourly site update"
UTC_PLUS_3 = timezone(timedelta(hours=3))
STOP_POLL_SECONDS = 5
PROCESS_STOP_TIMEOUT_SECONDS = 30
RUN_MODE_VALUES = {"prompt", "test", "normal"}
LAUNCH_MODE_VALUES = {"auto", "manual"}
CONSUME_QUEUE_VALUES = {"auto", "yes", "no"}


def detect_text_encoding(raw: bytes) -> str:
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return "utf-16"
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    return "utf-8"


def load_json(path: Path):
    raw = path.read_bytes()
    encoding = detect_text_encoding(raw)
    text = raw.decode(encoding)
    return json.loads(text)


def load_json_with_encoding(path: Path):
    raw = path.read_bytes()
    encoding = detect_text_encoding(raw)
    text = raw.decode(encoding)
    return json.loads(text), encoding


def save_json(path: Path, data, encoding: str = "utf-8"):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding=encoding, newline="\n") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")


def now_local_iso():
    return datetime.now(UTC_PLUS_3).isoformat(timespec="seconds")


def clear_stop_request():
    try:
        STOP_REQUEST_PATH.unlink(missing_ok=True)
    except OSError as exc:
        logging.warning("Failed to clear stop request %s: %s", STOP_REQUEST_PATH, exc)


def read_stop_request():
    if not STOP_REQUEST_PATH.exists():
        return None
    try:
        return load_json(STOP_REQUEST_PATH)
    except Exception as exc:
        return {"error": str(exc)}


def wait_for_run_window(run_duration_seconds: int, process: subprocess.Popen) -> str:
    deadline = time.monotonic() + max(0, run_duration_seconds)
    while True:
        if process.poll() is not None:
            return "process_exited"
        stop_request = read_stop_request()
        if stop_request is not None:
            logging.info("Stop request detected: %s", stop_request)
            return "stop_requested"
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return "duration_elapsed"
        time.sleep(min(STOP_POLL_SECONDS, remaining))


def normalize_choice(value: str | None, allowed_values: set[str], default: str) -> str:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in allowed_values else default


def parse_args(argv: list[str] | None = None):
    parser = argparse.ArgumentParser(description="Run or publish the hourly ACC scheduler.")
    parser.add_argument(
        "legacy_mode",
        nargs="?",
        choices=["publish-only"],
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--launch-mode",
        choices=sorted(LAUNCH_MODE_VALUES),
        default=normalize_choice(os.getenv("HOURLY_LAUNCH_MODE"), LAUNCH_MODE_VALUES, "auto"),
        help="auto consumes the next scheduled slot; manual can run without moving the schedule queue.",
    )
    parser.add_argument(
        "--run-mode",
        choices=sorted(RUN_MODE_VALUES),
        default=normalize_choice(os.getenv("HOURLY_RUN_MODE"), RUN_MODE_VALUES, "prompt"),
        help="prompt keeps the old interactive question, test uses a short duration, normal uses server_window_minutes.",
    )
    parser.add_argument(
        "--duration-seconds",
        type=int,
        default=None,
        help="Override the run duration in seconds.",
    )
    parser.add_argument(
        "--track-code",
        default=os.getenv("HOURLY_TRACK_CODE"),
        help="Track code for manual runs. Defaults to the next queued track.",
    )
    parser.add_argument(
        "--weather-profile-id",
        type=int,
        default=None,
        help="Weather profile id for manual runs. Defaults to a weighted random profile.",
    )
    parser.add_argument(
        "--publish-only",
        action="store_true",
        help="Refresh hourly-data without launching the ACC server.",
    )
    parser.add_argument(
        "--consume-queue",
        choices=sorted(CONSUME_QUEUE_VALUES),
        default=normalize_choice(os.getenv("HOURLY_CONSUME_QUEUE"), CONSUME_QUEUE_VALUES, "auto"),
        help="auto consumes only scheduled auto runs. Use no for manual runs that should not move the schedule.",
    )
    parser.add_argument(
        "--no-git-publish",
        action="store_true",
        help="Skip git add/commit/push after publisher.py.",
    )
    args = parser.parse_args(argv)
    if args.legacy_mode == "publish-only":
        args.publish_only = True
    return args


def configure_logging():
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(LOG_FILE_PATH, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def resolve_server_root(schedule_config: dict) -> Path:
    configured_value = str(schedule_config.get("server_root") or "").strip()
    if not configured_value:
        return SERVER_ROOT_DIR

    configured_path = Path(configured_value).expanduser()
    if configured_path.is_absolute():
        return configured_path

    return SERVER_ROOT_DIR / configured_path


def resolve_event_config_path(schedule_config: dict) -> Path:
    server_root = resolve_server_root(schedule_config)
    event_config_path = schedule_config.get("event_config_path")

    if event_config_path:
        configured_path = Path(event_config_path)
        if configured_path.is_absolute():
            return configured_path
        return server_root / configured_path

    cfg_dir = schedule_config.get("cfg_dir", "cfg")
    return server_root / cfg_dir / "event.json"


def resolve_server_exe_path(schedule_config: dict) -> Path:
    server_root = resolve_server_root(schedule_config)
    server_exe = schedule_config.get("server_exe") or "accServer.exe"
    server_exe_path = Path(server_exe)
    if server_exe_path.is_absolute():
        return server_exe_path
    return server_root / server_exe_path


def resolve_results_dir_path(schedule_config: dict) -> Path:
    server_root = resolve_server_root(schedule_config)
    results_dir = schedule_config.get("results_dir") or "results"
    results_dir_path = Path(results_dir)
    if results_dir_path.is_absolute():
        return results_dir_path
    return server_root / results_dir_path


def resolve_python_executable() -> str:
    return sys.executable or "python"


def resolve_creationflags() -> int:
    return subprocess.CREATE_NO_WINDOW if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW") else 0


def start_acc_server_process(server_exe_path: Path) -> tuple[subprocess.Popen, Path]:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    with SERVER_OUTPUT_LOG_PATH.open("a", encoding="utf-8", newline="") as output_file:
        output_file.write(f"\n===== {now_local_iso()} ACC server launch =====\n")
        output_file.flush()
        process = subprocess.Popen(
            [str(server_exe_path)],
            cwd=str(server_exe_path.parent),
            stdin=subprocess.DEVNULL,
            stdout=output_file,
            stderr=subprocess.STDOUT,
            creationflags=resolve_creationflags(),
        )
    return process, SERVER_OUTPUT_LOG_PATH


def stop_acc_server_process(process: subprocess.Popen):
    logging.info("Stopping ACC server process with PID: %s", process.pid)
    stop_result = subprocess.run(
        ["taskkill", "/PID", str(process.pid), "/T", "/F"],
        check=False,
        capture_output=True,
        text=True,
    )
    if stop_result.stdout.strip():
        logging.info("taskkill stdout:\n%s", stop_result.stdout.strip())
    if stop_result.stderr.strip():
        logging.warning("taskkill stderr:\n%s", stop_result.stderr.strip())
    if stop_result.returncode != 0:
        logging.warning("taskkill failed with code %s", stop_result.returncode)
        return
    try:
        process.wait(timeout=PROCESS_STOP_TIMEOUT_SECONDS)
        logging.info("ACC server process exited with code: %s", process.returncode)
    except subprocess.TimeoutExpired:
        logging.warning(
            "ACC server process PID %s did not exit within %s seconds after taskkill.",
            process.pid,
            PROCESS_STOP_TIMEOUT_SECONDS,
        )


def run_git(args: list[str]):
    result = subprocess.run(
        ["git"] + args,
        cwd=str(DATA_ROOT_DIR),
        capture_output=True,
        text=True,
    )
    if result.stdout.strip():
        logging.info("git %s stdout:\n%s", " ".join(args), result.stdout.strip())
    if result.stderr.strip():
        logging.warning("git %s stderr:\n%s", " ".join(args), result.stderr.strip())
    return result


def get_run_duration_seconds(schedule_config: dict) -> int:
    test_run_seconds = schedule_config.get("test_run_seconds")
    if isinstance(test_run_seconds, int) and test_run_seconds > 0:
        return test_run_seconds

    server_window_minutes = schedule_config.get("server_window_minutes", 120)
    if not isinstance(server_window_minutes, int) or server_window_minutes <= 0:
        server_window_minutes = 120

    return server_window_minutes * 60


def prompt_with_timeout(prompt_text: str, timeout_seconds: int) -> str | None:
    if not sys.stdin or not sys.stdin.isatty():
        return None

    result = {"value": None}

    def read_input():
        try:
            result["value"] = input(prompt_text)
        except EOFError:
            result["value"] = None

    worker = threading.Thread(target=read_input, daemon=True)
    worker.start()
    worker.join(timeout_seconds)

    if worker.is_alive():
        return None

    return result["value"]


def resolve_run_mode(schedule_config: dict, args=None) -> tuple[int, str]:
    default_duration = get_run_duration_seconds(schedule_config)
    if args and isinstance(args.duration_seconds, int) and args.duration_seconds > 0:
        return args.duration_seconds, f"{args.run_mode}_custom" if args.run_mode != "prompt" else "custom"

    run_mode = getattr(args, "run_mode", "prompt") if args else "prompt"
    if run_mode == "test":
        test_run_seconds = schedule_config.get("test_run_seconds")
        if not isinstance(test_run_seconds, int) or test_run_seconds <= 0:
            test_run_seconds = 60
        return test_run_seconds, "test"
    if run_mode == "normal":
        return default_duration, "normal"

    answer = prompt_with_timeout("Is this a test run? Type yes or no within 20 seconds: ", 20)

    if answer and answer.strip().lower() == "yes":
        return 60, "test"

    return default_duration, "normal"


def resolve_publish_only_mode(args=None) -> bool:
    if args and args.publish_only:
        return True

    env_value = os.getenv("HOURLY_PUBLISH_ONLY", "").strip().lower()
    return env_value in {"1", "true", "yes", "on"}


def should_consume_queue(args, publish_only_mode: bool) -> bool:
    if args.consume_queue == "yes":
        return True
    if args.consume_queue == "no":
        return False
    return args.launch_mode == "auto" and not publish_only_mode


def get_track_key(schedule_config: dict) -> str:
    return schedule_config.get("event_track_key") or "track"


def choose_next_track(schedule_config: dict, rotation_state: dict) -> tuple[dict, int]:
    tracks = schedule_config.get("tracks") or []
    if not tracks:
        raise ValueError("No tracks configured in schedule_config.json")

    queued_codes = [
        code
        for code in (rotation_state.get("track_queue_codes") or [])
        if isinstance(code, str)
    ]
    if queued_codes:
        first_code = queued_codes[0]
        for index, track in enumerate(tracks):
            if track.get("code") == first_code:
                return track, index

    next_index = rotation_state.get("next_track_index", 0)
    if not isinstance(next_index, int):
        next_index = 0

    normalized_index = next_index % len(tracks)
    return tracks[normalized_index], normalized_index


def find_track_by_code(schedule_config: dict, track_code: str | None):
    tracks = schedule_config.get("tracks") or []
    if not tracks:
        raise ValueError("No tracks configured in schedule_config.json")
    if track_code:
        for index, track in enumerate(tracks):
            if track.get("code") == track_code:
                return track, index
        raise ValueError(f"Track code not found in schedule_config.json: {track_code}")
    return None, None


def build_manual_slot(selected_track: dict):
    started_at = datetime.now(UTC_PLUS_3)
    slot_date = started_at.strftime("%Y-%m-%d")
    slot_time = started_at.strftime("%H:%M")
    track_code = selected_track.get("code") or "unknown-track"
    return {
        "event_id": f"manual_{slot_date}_{started_at.strftime('%H%M%S')}_{track_code}",
        "date": slot_date,
        "start_time_local": slot_time,
        "timezone": "UTC+3",
        "track_code": track_code,
        "track_name": selected_track.get("name") or planning.normalize_track_name(track_code),
        "slot_label": "Manual Run",
        "status": "manual",
    }


def generate_weather_for_profile_id(schedule_config: dict, profile_id: int):
    weather_config = planning.get_weather_planning_config(schedule_config)
    selected_profile = None
    for profile in weather_config.get("profiles") or []:
        if profile.get("id") == profile_id:
            selected_profile = profile
            break
    if not selected_profile:
        raise ValueError(f"Weather profile id not found: {profile_id}")

    cloud_level = planning.random_float(selected_profile["cloud_range"])
    rain_level = planning.random_float(selected_profile["rain_range"])
    weather_randomness = planning.random_int(selected_profile["randomness_range"])
    ambient_temp_c = int(round(planning.random_float(selected_profile["ambient_temp_range_c"])))
    summary_key = selected_profile.get("summary_key") or planning.build_weather_summary_key(cloud_level, rain_level)
    return {
        "profile_id": selected_profile.get("id"),
        "ambient_temp_c": ambient_temp_c,
        "cloud_level": cloud_level,
        "rain_level": rain_level,
        "weather_randomness": weather_randomness,
        "summary_key": summary_key,
        "created_at": planning.now_local_iso(),
    }


def update_rotation_state(rotation_state: dict, selected_track: dict, selected_index: int, tracks: list[dict]):
    tracks_count = len(tracks)
    track_index_lookup = {
        track.get("code"): index
        for index, track in enumerate(tracks)
        if isinstance(track, dict) and track.get("code")
    }
    queue_codes = [
        code
        for code in (rotation_state.get("track_queue_codes") or [])
        if isinstance(code, str)
    ]
    if queue_codes and queue_codes[0] == selected_track.get("code"):
        queue_codes = queue_codes[1:]
    rotation_state["track_queue_codes"] = queue_codes
    rotation_state["last_track_code"] = selected_track.get("code")
    rotation_state["last_rotation_at"] = now_local_iso()
    if queue_codes:
        rotation_state["next_track_index"] = track_index_lookup.get(queue_codes[0], (selected_index + 1) % tracks_count)
    else:
        rotation_state["next_track_index"] = (selected_index + 1) % tracks_count
    return rotation_state


def update_runtime_state(runtime_state: dict, event_config_path: Path, selected_track: dict, selected_slot: dict, planned_weather: dict):
    runtime_state["last_track_code"] = selected_track.get("code")
    runtime_state["last_event_config_path"] = str(event_config_path)
    runtime_state["active_event_id"] = selected_slot.get("event_id")
    runtime_state["last_planned_start_local"] = (
        f"{selected_slot.get('date')}T{selected_slot.get('start_time_local')}:00+03:00"
        if selected_slot.get("date") and selected_slot.get("start_time_local")
        else None
    )
    runtime_state["last_planned_weather"] = planned_weather
    runtime_state["last_status"] = "track_selected"
    runtime_state["last_error"] = None
    runtime_state["updated_at"] = now_local_iso()
    return runtime_state


def update_runtime_state_with_process(runtime_state: dict, process: subprocess.Popen):
    runtime_state["server_pid"] = process.pid
    runtime_state["last_actual_start_local"] = now_local_iso()
    runtime_state["last_status"] = "server_started"
    runtime_state["last_error"] = None
    runtime_state["updated_at"] = now_local_iso()
    return runtime_state


def update_runtime_state_after_stop(runtime_state: dict):
    runtime_state["last_actual_stop_local"] = now_local_iso()
    runtime_state["last_status"] = "server_stopped"
    runtime_state["server_pid"] = None
    runtime_state["active_event_id"] = None
    runtime_state["last_error"] = None
    runtime_state["updated_at"] = now_local_iso()
    return runtime_state


def update_runtime_state_publish_only(runtime_state: dict, event_config_path: Path, selected_track: dict, selected_slot: dict, planned_weather: dict):
    runtime_state["last_track_code"] = selected_track.get("code")
    runtime_state["last_event_config_path"] = str(event_config_path)
    runtime_state["active_event_id"] = selected_slot.get("event_id")
    runtime_state["last_planned_start_local"] = (
        f"{selected_slot.get('date')}T{selected_slot.get('start_time_local')}:00+03:00"
        if selected_slot.get("date") and selected_slot.get("start_time_local")
        else None
    )
    runtime_state["last_planned_weather"] = planned_weather
    runtime_state["last_status"] = "publish_only_completed"
    runtime_state["last_error"] = None
    runtime_state["updated_at"] = now_local_iso()
    return runtime_state


def apply_planned_weather(event_config: dict, planned_weather: dict):
    if not isinstance(planned_weather, dict):
        return event_config
    if planned_weather.get("ambient_temp_c") is not None:
        event_config["ambientTemp"] = planned_weather.get("ambient_temp_c")
    if planned_weather.get("cloud_level") is not None:
        event_config["cloudLevel"] = planned_weather.get("cloud_level")
    if planned_weather.get("rain_level") is not None:
        event_config["rain"] = planned_weather.get("rain_level")
    if planned_weather.get("weather_randomness") is not None:
        event_config["weatherRandomness"] = planned_weather.get("weather_randomness")
    return event_config


def collect_result_file_names(results_dir_path: Path) -> set[str]:
    if not results_dir_path.exists():
        return set()
    return {path.name for path in results_dir_path.glob("*.json") if path.is_file()}


def classify_new_result_files(file_names: set[str]) -> tuple[list[str], list[str]]:
    q_files = sorted(name for name in file_names if name.upper().endswith("_Q.JSON"))
    r_files = sorted(name for name in file_names if name.upper().endswith("_R.JSON"))
    return q_files, r_files


def update_runtime_state_with_results(runtime_state: dict, q_files: list[str], r_files: list[str]):
    runtime_state["last_result_q_files"] = q_files
    runtime_state["last_result_r_files"] = r_files
    runtime_state["last_result_check_at"] = now_local_iso()

    if q_files and r_files:
        runtime_state["last_status"] = "results_verified"
        runtime_state["last_error"] = None
    else:
        missing_parts = []
        if not q_files:
            missing_parts.append("Q")
        if not r_files:
            missing_parts.append("R")
        runtime_state["last_status"] = "results_incomplete"
        runtime_state["last_error"] = f"Missing result files: {', '.join(missing_parts)}"

    runtime_state["updated_at"] = now_local_iso()
    return runtime_state


def publish_git_if_needed(selected_track: dict):
    add_result = run_git(["add", "."])
    if add_result.returncode != 0:
        raise RuntimeError(f"git add failed: {add_result.stderr.strip() or add_result.stdout.strip()}")

    status_result = run_git(["status", "--porcelain"])
    if status_result.returncode != 0:
        raise RuntimeError(f"git status failed: {status_result.stderr.strip() or status_result.stdout.strip()}")

    if not status_result.stdout.strip():
        logging.info("Git publish skipped: no changes to commit.")
        return

    commit_message = (
        f"{COMMIT_MESSAGE_PREFIX} {selected_track['code']} "
        f"{datetime.now(UTC_PLUS_3).strftime('%Y-%m-%d %H:%M:%S')}"
    )
    commit_result = run_git(["commit", "-m", commit_message])
    if commit_result.returncode != 0:
        combined = (commit_result.stdout + "\n" + commit_result.stderr).lower()
        if "nothing to commit" in combined:
            logging.info("Git commit skipped: nothing to commit.")
            return
        raise RuntimeError(f"git commit failed: {commit_result.stderr.strip() or commit_result.stdout.strip()}")

    push_result = run_git(["push"])
    if push_result.returncode != 0:
        raise RuntimeError(f"git push failed: {push_result.stderr.strip() or push_result.stdout.strip()}")

    logging.info("Git publish completed successfully.")


def run_publisher():
    if not PUBLISHER_PATH.exists():
        logging.warning("publisher.py not found at: %s", PUBLISHER_PATH)
        return

    logging.info("Running publisher: %s", PUBLISHER_PATH)
    publisher_result = subprocess.run(
        [resolve_python_executable(), str(PUBLISHER_PATH)],
        cwd=str(APP_ROOT_DIR),
        capture_output=True,
        text=True,
    )
    if publisher_result.stdout.strip():
        logging.info("Publisher stdout:\n%s", publisher_result.stdout.strip())
    if publisher_result.stderr.strip():
        logging.warning("Publisher stderr:\n%s", publisher_result.stderr.strip())
    if publisher_result.returncode != 0:
        raise RuntimeError(f"publisher.py failed with exit code {publisher_result.returncode}")


def main(argv: list[str] | None = None):
    configure_logging()
    args = parse_args(argv)

    try:
        logging.info("Hourly orchestrator started.")
        schedule_config = load_json(SCHEDULE_CONFIG_PATH)
        rotation_state = load_json(ROTATION_STATE_PATH)
        runtime_state = load_json(RUNTIME_STATE_PATH)
        publish_only_mode = resolve_publish_only_mode(args)
        if publish_only_mode:
            run_duration_seconds, run_mode = 0, "publish_only"
        else:
            run_duration_seconds, run_mode = resolve_run_mode(schedule_config, args)
        consume_queue = should_consume_queue(args, publish_only_mode)

        schedule_items = planning.build_schedule_slots(schedule_config, rotation_state)
        runtime_state, schedule_items = planning.ensure_planned_weather(runtime_state, schedule_items, schedule_config)

        if args.launch_mode == "auto" and not schedule_items:
            raise RuntimeError("No upcoming hourly slots available for launch.")

        if args.launch_mode == "manual":
            selected_track, selected_index = find_track_by_code(schedule_config, args.track_code)
            if not selected_track:
                selected_track, selected_index = choose_next_track(schedule_config, rotation_state)
            selected_slot = build_manual_slot(selected_track)
            if args.weather_profile_id is not None:
                planned_weather = generate_weather_for_profile_id(schedule_config, args.weather_profile_id)
            else:
                planned_weather = planning.generate_planned_weather(schedule_config)
        else:
            selected_slot = schedule_items[0]
            selected_track, selected_index = find_track_by_code(schedule_config, selected_slot.get("track_code"))
            planned_weather = (
                selected_slot.get("weather")
                or planning.get_planned_weather_for_slot(runtime_state, selected_slot.get("event_id"))
            )

        event_config_path = resolve_event_config_path(schedule_config)
        server_exe_path = resolve_server_exe_path(schedule_config)
        results_dir_path = resolve_results_dir_path(schedule_config)
        track_key = get_track_key(schedule_config)

        logging.info("Launch mode: %s", args.launch_mode)
        logging.info("Consume queue: %s", consume_queue)
        logging.info("Selected track candidate: %s", selected_track["code"])
        logging.info("Resolved slot event id: %s", selected_slot.get("event_id"))
        logging.info("Resolved ACC event config path: %s", event_config_path)
        logging.info("Resolved server exe path: %s", server_exe_path)
        logging.info("Resolved results dir path: %s", results_dir_path)

        if publish_only_mode:
            logging.info("Publish-only mode enabled. Refreshing public schedule only.")
            clear_stop_request()
            run_publisher()
            if args.no_git_publish:
                logging.info("Git publish skipped by --no-git-publish.")
            else:
                publish_git_if_needed(selected_track)
            logging.info("Hourly orchestrator completed successfully in publish-only mode.")
            return

        if not event_config_path.exists():
            raise FileNotFoundError(f"ACC event config not found: {event_config_path}")
        if not server_exe_path.exists():
            raise FileNotFoundError(f"ACC server executable not found: {server_exe_path}")
        if not results_dir_path.exists():
            raise FileNotFoundError(f"ACC results directory not found: {results_dir_path}")

        existing_result_files = collect_result_file_names(results_dir_path)
        logging.info("Existing result files before run: %s", len(existing_result_files))

        event_config, event_encoding = load_json_with_encoding(event_config_path)
        previous_track = event_config.get(track_key)
        event_config[track_key] = selected_track["code"]
        event_config = apply_planned_weather(event_config, planned_weather)
        logging.info("Previous track: %s", previous_track)
        logging.info("Writing new track '%s' into key '%s'", selected_track["code"], track_key)
        if planned_weather:
            logging.info(
                "Applying planned weather: temp=%s cloud=%s rain=%s randomness=%s",
                planned_weather.get("ambient_temp_c"),
                planned_weather.get("cloud_level"),
                planned_weather.get("rain_level"),
                planned_weather.get("weather_randomness"),
            )

        save_json(event_config_path, event_config, encoding=event_encoding)
        if consume_queue:
            save_json(
                ROTATION_STATE_PATH,
                update_rotation_state(rotation_state, selected_track, selected_index, schedule_config["tracks"])
            )
        else:
            logging.info("Rotation state left unchanged for this run.")
        runtime_state = update_runtime_state(runtime_state, event_config_path, selected_track, selected_slot, planned_weather)
        runtime_state["launch_mode"] = args.launch_mode
        runtime_state["run_mode"] = run_mode
        runtime_state["consume_queue"] = consume_queue
        save_json(RUNTIME_STATE_PATH, runtime_state)
        clear_stop_request()

        process, server_output_log_path = start_acc_server_process(server_exe_path)
        logging.info("Started ACC server process with PID: %s", process.pid)
        logging.info("ACC server stdout/stderr redirected to: %s", server_output_log_path)

        runtime_state = update_runtime_state_with_process(runtime_state, process)
        save_json(RUNTIME_STATE_PATH, runtime_state)
        logging.info("Run mode: %s", run_mode)
        logging.info("Run duration: %s seconds", run_duration_seconds)
        logging.info("Waiting for test/full run window to finish.")

        stop_reason = wait_for_run_window(run_duration_seconds, process)
        logging.info("Run window ended: %s", stop_reason)
        if process.poll() is None:
            stop_acc_server_process(process)
        else:
            logging.info("ACC server process already exited with code: %s", process.returncode)
        clear_stop_request()

        runtime_state = update_runtime_state_after_stop(runtime_state)
        runtime_state["stop_reason"] = stop_reason
        save_json(RUNTIME_STATE_PATH, runtime_state)

        time.sleep(2)
        current_result_files = collect_result_file_names(results_dir_path)
        new_result_files = current_result_files - existing_result_files
        q_files, r_files = classify_new_result_files(new_result_files)
        logging.info("New result files detected: %s", len(new_result_files))
        logging.info("New Q files: %s", q_files if q_files else "none")
        logging.info("New R files: %s", r_files if r_files else "none")

        runtime_state = update_runtime_state_with_results(runtime_state, q_files, r_files)
        save_json(RUNTIME_STATE_PATH, runtime_state)

        run_publisher()

        logging.info("Reference event config: %s", REFERENCE_EVENT_PATH)
        logging.info("ACC event config: %s", event_config_path)
        logging.info("ACC server executable: %s", server_exe_path)
        logging.info("ACC results dir: %s", results_dir_path)
        logging.info("Track key: %s", track_key)
        logging.info(
            "Selected track: %s (%s)",
            selected_track["code"],
            selected_track.get("name", selected_track["code"]),
        )
        if q_files and r_files:
            logging.info("Hourly orchestrator verified Q and R result files successfully.")
        else:
            logging.warning(
                "Hourly orchestrator finished with incomplete result files. "
                "Publishing schedule and announcement updates anyway."
            )

        if args.no_git_publish:
            logging.info("Git publish skipped by --no-git-publish.")
        else:
            publish_git_if_needed(selected_track)
        logging.info("Hourly orchestrator completed successfully.")
    except Exception as exc:
        try:
            runtime_state = load_json(RUNTIME_STATE_PATH)
        except Exception:
            runtime_state = {}

        runtime_state["last_status"] = "error"
        runtime_state["last_error"] = str(exc)
        runtime_state["updated_at"] = now_local_iso()

        try:
            save_json(RUNTIME_STATE_PATH, runtime_state)
        except Exception:
            pass

        logging.exception("Hourly orchestrator failed: %s", exc)
        raise


if __name__ == "__main__":
    main()
