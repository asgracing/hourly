import re
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path


# ===== НАСТРОЙКИ =====
SERVER_EXE = Path(r"I:\SteamLibrary\steamapps\common\Assetto Corsa Competizione Dedicated Server Race\server\accServer.exe")
RAW_LOG_PATH = Path(r"I:\SteamLibrary\steamapps\common\Assetto Corsa Competizione Dedicated Server Race\server\hourly\logs\simple_capture_raw.log")


# ===== REGEX =====
RE_CLIENTS_ONLINE = re.compile(r"(\d+)\s+client\(s\)\s+online", re.IGNORECASE)
RE_NEW_CONNECTION = re.compile(
    r"New connection request:\s+id\s+(\d+)\s+(.+?)\s+(S\d+)\s+on car model\s+(\d+)",
    re.IGNORECASE,
)
RE_CREATE_CAR = re.compile(
    r"Creating new car connection:\s+carId\s+(\d+),\s+carModel\s+(\d+),\s+raceNumber\s+#?(\d+)",
    re.IGNORECASE,
)
RE_SESSION_CHANGED = re.compile(r"Session changed:\s+(.+?)\s+->\s+(.+)", re.IGNORECASE)
RE_SESSION_PHASE = re.compile(r"Detected sessionPhase\s+<(.+?)>\s+->\s+<(.+?)>\s+\((.+?)\)", re.IGNORECASE)
RE_SPLIT = re.compile(r"CarID\s+(\d+)\s+:\s+new split on sector\s+(\d+)\s+\((\d+)\)", re.IGNORECASE)
RE_LAP_CLOSED = re.compile(r"CarID\s+(\d+)\s+:\s+lap closed\s+\((\d+)\)", re.IGNORECASE)
RE_CHAT = re.compile(r"CHAT\s+(.+?):\s+(.*)", re.IGNORECASE)
RE_UPDATED_LEADERBOARD = re.compile(r"Updated leaderboard for\s+(\d+)\s+clients\s+\((.+)\)", re.IGNORECASE)
RE_DISCONNECT = re.compile(r"Client\s+(\d+)\s+closed the connection\s+\((\d+)\)", re.IGNORECASE)


state = {
    "clients_online": 0,
    "session_type": None,
    "session_phase": None,
    "best_laps": {},
}


def ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def print_event(kind: str, message: str):
    print(f"[{ts()}] [{kind}] {message}")


def handle_line(line: str):
    stripped = line.rstrip("\r\n")
    if not stripped:
        return

    m = RE_CLIENTS_ONLINE.search(stripped)
    if m:
        state["clients_online"] = int(m.group(1))
        print_event("ONLINE", f"{state['clients_online']} client(s) online")
        return

    m = RE_NEW_CONNECTION.search(stripped)
    if m:
        conn_id, driver_name, steam_id, car_model = m.groups()
        print_event("CONNECT", f"conn={conn_id} driver='{driver_name.strip()}' steam={steam_id} car_model={car_model}")
        return

    m = RE_CREATE_CAR.search(stripped)
    if m:
        car_id, car_model, race_number = m.groups()
        print_event("CAR", f"car_id={car_id} model={car_model} race_number=#{race_number}")
        return

    m = RE_SESSION_CHANGED.search(stripped)
    if m:
        old_sess, new_sess = m.groups()
        state["session_type"] = new_sess.strip()
        print_event("SESSION", f"{old_sess.strip()} -> {new_sess.strip()}")
        return

    m = RE_SESSION_PHASE.search(stripped)
    if m:
        old_phase, new_phase, sess_type = m.groups()
        state["session_phase"] = new_phase.strip()
        state["session_type"] = sess_type.strip()
        print_event("PHASE", f"{sess_type.strip()}: <{old_phase}> -> <{new_phase}>")
        return

    m = RE_SPLIT.search(stripped)
    if m:
        car_id, sector, split_ms = m.groups()
        print_event("SPLIT", f"car={car_id} sector={int(sector)+1} split_ms={split_ms}")
        return

    m = RE_LAP_CLOSED.search(stripped)
    if m:
        car_id, lap_ms = m.groups()
        lap_ms = int(lap_ms)
        prev_best = state["best_laps"].get(car_id)
        is_pb = prev_best is None or lap_ms < prev_best
        if is_pb:
            state["best_laps"][car_id] = lap_ms
        suffix = " PB" if is_pb else ""
        print_event("LAP", f"car={car_id} lap_ms={lap_ms}{suffix}")
        return

    m = RE_UPDATED_LEADERBOARD.search(stripped)
    if m:
        clients, label = m.groups()
        print_event("BOARD", f"clients={clients} label={label}")
        return

    m = RE_CHAT.search(stripped)
    if m:
        driver_name, message = m.groups()
        print_event("CHAT", f"{driver_name.strip()}: {message.strip()}")
        return

    m = RE_DISCONNECT.search(stripped)
    if m:
        conn_id, code = m.groups()
        print_event("DISCONNECT", f"conn={conn_id} code={code}")
        return


def read_stream(pipe, raw_log_file):
    try:
        for line in iter(pipe.readline, ""):
            raw_log_file.write(line)
            raw_log_file.flush()
            handle_line(line)
    finally:
        try:
            pipe.close()
        except Exception:
            pass


def main():
    print(f"[{ts()}] server exe: {SERVER_EXE}")

    if not SERVER_EXE.exists():
        raise FileNotFoundError(f"ACC server executable not found: {SERVER_EXE}")

    RAW_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    with RAW_LOG_PATH.open("w", encoding="utf-8", newline="") as raw_log_file:
        process = subprocess.Popen(
            [str(SERVER_EXE)],
            cwd=str(SERVER_EXE.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )

        print(f"[{ts()}] started PID={process.pid}")
        print(f"[{ts()}] raw log: {RAW_LOG_PATH}")
        print(f"[{ts()}] press Ctrl+C to stop\n")

        if process.stdout is None:
            raise RuntimeError("stdout pipe is not available")

        reader = threading.Thread(
            target=read_stream,
            args=(process.stdout, raw_log_file),
            daemon=True,
        )
        reader.start()

        try:
            while True:
                rc = process.poll()
                if rc is not None:
                    print(f"[{ts()}] process exited with code {rc}")
                    break
                time.sleep(1)
        except KeyboardInterrupt:
            print(f"\n[{ts()}] stopping PID={process.pid}")
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/F"],
                capture_output=True,
                text=True,
            )
            print(f"[{ts()}] stopped")


if __name__ == "__main__":
    main()