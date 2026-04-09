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
REFERENCE_EVENT_PATH = APP_ROOT_DIR / "event.json"
PUBLISHER_PATH = APP_ROOT_DIR / "scripts" / "publisher.py"
LOGS_DIR = APP_ROOT_DIR / "logs"
LOG_FILE_PATH = LOGS_DIR / "orchestrator.log"
COMMIT_MESSAGE_PREFIX = "Hourly site update"
UTC_PLUS_3 = timezone(timedelta(hours=3))


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


def resolve_run_mode(schedule_config: dict) -> tuple[int, str]:
    default_duration = get_run_duration_seconds(schedule_config)
    answer = prompt_with_timeout("Is this a test run? Type yes or no within 20 seconds: ", 20)

    if answer and answer.strip().lower() == "yes":
        return 60, "test"

    return default_duration, "normal"


def resolve_publish_only_mode() -> bool:
    cli_args = {arg.strip().lower() for arg in sys.argv[1:] if isinstance(arg, str)}
    if "--publish-only" in cli_args or "publish-only" in cli_args:
        return True

    env_value = os.getenv("HOURLY_PUBLISH_ONLY", "").strip().lower()
    return env_value in {"1", "true", "yes", "on"}


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


def main():
    configure_logging()

    try:
        logging.info("Hourly orchestrator started.")
        schedule_config = load_json(SCHEDULE_CONFIG_PATH)
        rotation_state = load_json(ROTATION_STATE_PATH)
        runtime_state = load_json(RUNTIME_STATE_PATH)
        publish_only_mode = resolve_publish_only_mode()
        run_duration_seconds, run_mode = resolve_run_mode(schedule_config)
        if publish_only_mode:
            run_mode = "publish_only"

        _, selected_index = choose_next_track(schedule_config, rotation_state)
        schedule_items = planning.build_schedule_slots(schedule_config, rotation_state)
        runtime_state, schedule_items = planning.ensure_planned_weather(runtime_state, schedule_items, schedule_config)
        if not schedule_items:
            raise RuntimeError("No upcoming hourly slots available for launch.")
        selected_slot = schedule_items[0]
        selected_track = {
            "code": selected_slot.get("track_code"),
            "name": selected_slot.get("track_name"),
        }
        planned_weather = selected_slot.get("weather") or planning.get_planned_weather_for_slot(runtime_state, selected_slot.get("event_id"))
        event_config_path = resolve_event_config_path(schedule_config)
        server_exe_path = resolve_server_exe_path(schedule_config)
        results_dir_path = resolve_results_dir_path(schedule_config)
        track_key = get_track_key(schedule_config)
        logging.info("Selected track candidate: %s", selected_track["code"])
        logging.info("Resolved slot event id: %s", selected_slot.get("event_id"))
        logging.info("Resolved ACC event config path: %s", event_config_path)
        logging.info("Resolved server exe path: %s", server_exe_path)
        logging.info("Resolved results dir path: %s", results_dir_path)

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
        save_json(
            ROTATION_STATE_PATH,
            update_rotation_state(rotation_state, selected_track, selected_index, schedule_config["tracks"])
        )
        runtime_state = update_runtime_state(runtime_state, event_config_path, selected_track, selected_slot, planned_weather)
        save_json(RUNTIME_STATE_PATH, runtime_state)

        if publish_only_mode:
            logging.info("Publish-only mode enabled. Skipping server launch and refreshing public schedule only.")
            save_json(
                ROTATION_STATE_PATH,
                update_rotation_state(rotation_state, selected_track, selected_index, schedule_config["tracks"])
            )
            runtime_state = update_runtime_state_publish_only(
                runtime_state,
                event_config_path,
                selected_track,
                selected_slot,
                planned_weather,
            )
            save_json(RUNTIME_STATE_PATH, runtime_state)
            run_publisher()
            publish_git_if_needed(selected_track)
            logging.info("Hourly orchestrator completed successfully in publish-only mode.")
            return

        process = subprocess.Popen(
            [str(server_exe_path)],
            cwd=str(server_exe_path.parent),
        )
        logging.info("Started ACC server process with PID: %s", process.pid)

        runtime_state = update_runtime_state_with_process(runtime_state, process)
        save_json(RUNTIME_STATE_PATH, runtime_state)
        logging.info("Run mode: %s", run_mode)
        logging.info("Run duration: %s seconds", run_duration_seconds)
        logging.info("Waiting for test/full run window to finish.")

        time.sleep(run_duration_seconds)
        logging.info("Stopping ACC server process with PID: %s", process.pid)
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/F"],
            check=True,
            capture_output=True,
            text=True,
        )

        runtime_state = update_runtime_state_after_stop(runtime_state)
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
