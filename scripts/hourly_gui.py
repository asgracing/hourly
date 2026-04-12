import copy
import json
import os
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk

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
SCHEDULE_PATH = DATA_ROOT_DIR / "schedule.json"
ANNOUNCEMENT_PATH = DATA_ROOT_DIR / "announcement.json"
LOG_FILE_PATH = APP_ROOT_DIR / "logs" / "orchestrator.log"
ORCHESTRATOR_PATH = SCRIPT_DIR / "orchestrator.py"


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
        return copy.deepcopy(default)
    encodings = [detect_text_encoding(raw), "utf-16-le", "utf-8-sig", "utf-8", "cp1251", "latin-1"]
    last_error = None
    for encoding in encodings:
        try:
            return json.loads(raw.decode(encoding).replace("\ufeff", "").replace("\x00", ""))
        except Exception as exc:
            last_error = exc
    raise ValueError(f"Failed to read JSON from {path}: {last_error}")


def save_json_with_backup(path: Path, data):
    if path.exists():
        backup_dir = path.parent / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"{path.stem}.{stamp}{path.suffix}"
        backup_path.write_bytes(path.read_bytes())
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def format_json(data) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


class JsonEditor(ttk.Frame):
    def __init__(self, master, label: str, path: Path, on_saved):
        super().__init__(master, padding=8)
        self.path = path
        self.on_saved = on_saved

        header = ttk.Frame(self)
        header.pack(fill="x")
        ttk.Label(header, text=f"{label}: {path}").pack(side="left", fill="x", expand=True)
        ttk.Button(header, text="Reload", command=self.load).pack(side="right", padx=(4, 0))
        ttk.Button(header, text="Save", command=self.save).pack(side="right")

        self.text = scrolledtext.ScrolledText(self, height=24, wrap="none")
        self.text.pack(fill="both", expand=True, pady=(8, 0))
        self.load()

    def load(self):
        self.text.delete("1.0", "end")
        if self.path.exists():
            try:
                self.text.insert("1.0", format_json(load_json(self.path, default={})) + "\n")
            except Exception as exc:
                self.text.insert("1.0", f"Failed to load {self.path}:\n{exc}\n")
        else:
            self.text.insert("1.0", "{}\n")

    def save(self):
        try:
            data = json.loads(self.text.get("1.0", "end"))
            save_json_with_backup(self.path, data)
            self.text.delete("1.0", "end")
            self.text.insert("1.0", format_json(data) + "\n")
        except Exception as exc:
            messagebox.showerror("Save failed", str(exc))
            return
        self.on_saved()
        messagebox.showinfo("Saved", f"Saved with backup:\n{self.path}")


class HourlyGui(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("ASG Hourly Control")
        self.geometry("1120x760")
        self.minsize(960, 620)

        self.schedule_config = {}
        self.rotation_state = {}
        self.runtime_state = {}
        self.command_running = False

        self.create_widgets()
        self.refresh_all()

    def create_widgets(self):
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True)

        self.dashboard_tab = ttk.Frame(self.notebook, padding=10)
        self.launch_tab = ttk.Frame(self.notebook, padding=10)
        self.schedule_tab = ttk.Frame(self.notebook, padding=10)
        self.config_tab = ttk.Frame(self.notebook, padding=0)
        self.logs_tab = ttk.Frame(self.notebook, padding=10)

        self.notebook.add(self.dashboard_tab, text="Status")
        self.notebook.add(self.launch_tab, text="Run")
        self.notebook.add(self.schedule_tab, text="Schedule")
        self.notebook.add(self.config_tab, text="Config")
        self.notebook.add(self.logs_tab, text="Logs")

        self.build_dashboard_tab()
        self.build_launch_tab()
        self.build_schedule_tab()
        self.build_config_tab()
        self.build_logs_tab()

    def build_dashboard_tab(self):
        top = ttk.Frame(self.dashboard_tab)
        top.pack(fill="x")
        ttk.Button(top, text="Refresh", command=self.refresh_all).pack(side="left")
        ttk.Button(top, text="Rebuild hourly-data", command=self.rebuild_hourly_data).pack(side="left", padx=(8, 0))
        ttk.Button(top, text="Graceful stop + publish", command=self.request_graceful_stop).pack(side="left", padx=(8, 0))
        ttk.Button(top, text="Emergency kill PID", command=self.stop_server_pid).pack(side="left", padx=(8, 0))

        self.status_text = scrolledtext.ScrolledText(self.dashboard_tab, height=28, wrap="word")
        self.status_text.pack(fill="both", expand=True, pady=(10, 0))

    def build_launch_tab(self):
        form = ttk.Frame(self.launch_tab)
        form.pack(fill="x", anchor="n")

        self.launch_mode = tk.StringVar(value="auto")
        self.run_mode = tk.StringVar(value="test")
        self.duration_seconds = tk.StringVar(value="")
        self.track_code = tk.StringVar(value="")
        self.weather_profile_id = tk.StringVar(value="")
        self.consume_queue = tk.BooleanVar(value=False)
        self.git_publish = tk.BooleanVar(value=True)

        ttk.Label(form, text="Launch mode").grid(row=0, column=0, sticky="w", pady=4)
        ttk.Radiobutton(form, text="Auto schedule", variable=self.launch_mode, value="auto", command=self.update_launch_defaults).grid(row=0, column=1, sticky="w")
        ttk.Radiobutton(form, text="Manual", variable=self.launch_mode, value="manual", command=self.update_launch_defaults).grid(row=0, column=2, sticky="w")

        ttk.Label(form, text="Run mode").grid(row=1, column=0, sticky="w", pady=4)
        ttk.Combobox(form, textvariable=self.run_mode, values=["test", "normal"], state="readonly", width=16).grid(row=1, column=1, sticky="w")
        ttk.Label(form, text="Duration override, sec").grid(row=1, column=2, sticky="e", padx=(16, 4))
        ttk.Entry(form, textvariable=self.duration_seconds, width=12).grid(row=1, column=3, sticky="w")

        ttk.Label(form, text="Track").grid(row=2, column=0, sticky="w", pady=4)
        self.track_combo = ttk.Combobox(form, textvariable=self.track_code, values=[], width=24)
        self.track_combo.grid(row=2, column=1, sticky="w")

        ttk.Label(form, text="Weather profile").grid(row=2, column=2, sticky="e", padx=(16, 4))
        self.weather_combo = ttk.Combobox(form, textvariable=self.weather_profile_id, values=[], width=20)
        self.weather_combo.grid(row=2, column=3, sticky="w")

        ttk.Checkbutton(form, text="Consume queue", variable=self.consume_queue).grid(row=3, column=1, sticky="w", pady=4)
        ttk.Checkbutton(form, text="Git publish after run", variable=self.git_publish).grid(row=3, column=2, sticky="w", pady=4)

        button_row = ttk.Frame(self.launch_tab)
        button_row.pack(fill="x", pady=(12, 4))
        ttk.Button(button_row, text="Start run", command=self.start_run).pack(side="left")
        ttk.Button(button_row, text="Rebuild / publish only", command=self.rebuild_hourly_data).pack(side="left", padx=(8, 0))
        ttk.Button(button_row, text="Graceful stop + publish", command=self.request_graceful_stop).pack(side="left", padx=(8, 0))

        self.command_output = scrolledtext.ScrolledText(self.launch_tab, height=25, wrap="word")
        self.command_output.pack(fill="both", expand=True, pady=(8, 0))
        self.update_launch_defaults()

    def build_schedule_tab(self):
        buttons = ttk.Frame(self.schedule_tab)
        buttons.pack(fill="x")
        ttk.Button(buttons, text="Refresh schedule", command=self.refresh_schedule).pack(side="left")

        columns = ("date", "time", "track", "weather", "rain", "event")
        self.schedule_tree = ttk.Treeview(self.schedule_tab, columns=columns, show="headings", height=15)
        for column, label, width in [
            ("date", "Date", 100),
            ("time", "Time", 70),
            ("track", "Track", 150),
            ("weather", "Weather", 120),
            ("rain", "Rain", 70),
            ("event", "Event ID", 360),
        ]:
            self.schedule_tree.heading(column, text=label)
            self.schedule_tree.column(column, width=width, anchor="w")
        self.schedule_tree.pack(fill="both", expand=True, pady=(8, 0))

        self.announcement_text = scrolledtext.ScrolledText(self.schedule_tab, height=9, wrap="word")
        self.announcement_text.pack(fill="both", expand=False, pady=(8, 0))

    def build_config_tab(self):
        config_notebook = ttk.Notebook(self.config_tab)
        config_notebook.pack(fill="both", expand=True)
        config_notebook.add(JsonEditor(config_notebook, "schedule_config", SCHEDULE_CONFIG_PATH, self.refresh_all), text="schedule_config")
        config_notebook.add(JsonEditor(config_notebook, "rotation_state", ROTATION_STATE_PATH, self.refresh_all), text="rotation_state")
        config_notebook.add(JsonEditor(config_notebook, "runtime_state", RUNTIME_STATE_PATH, self.refresh_all), text="runtime_state")

    def build_logs_tab(self):
        top = ttk.Frame(self.logs_tab)
        top.pack(fill="x")
        ttk.Button(top, text="Refresh logs", command=self.refresh_logs).pack(side="left")
        self.logs_text = scrolledtext.ScrolledText(self.logs_tab, wrap="word")
        self.logs_text.pack(fill="both", expand=True, pady=(8, 0))

    def refresh_all(self):
        self.schedule_config = load_json(SCHEDULE_CONFIG_PATH, default={}) or {}
        self.rotation_state = load_json(ROTATION_STATE_PATH, default={}) or {}
        self.runtime_state = load_json(RUNTIME_STATE_PATH, default={}) or {}
        self.refresh_dashboard()
        self.refresh_launch_options()
        self.refresh_schedule()
        self.refresh_logs()

    def refresh_dashboard(self):
        self.status_text.delete("1.0", "end")
        lines = [
            f"App root: {APP_ROOT_DIR}",
            f"Data root: {DATA_ROOT_DIR}",
            f"Config: {SCHEDULE_CONFIG_PATH}",
            "",
            "Runtime state:",
            format_json(self.runtime_state),
            "",
            "Rotation state:",
            format_json(self.rotation_state),
            "",
            "Git status hourly-data:",
            self.read_git_status(DATA_ROOT_DIR),
        ]
        self.status_text.insert("1.0", "\n".join(lines))

    def refresh_launch_options(self):
        tracks = self.schedule_config.get("tracks") or []
        track_values = [track.get("code") for track in tracks if isinstance(track, dict) and track.get("code")]
        self.track_combo.configure(values=track_values)
        if track_values and self.track_code.get() not in track_values:
            self.track_code.set(track_values[0])

        try:
            profiles = planning.get_weather_planning_config(self.schedule_config).get("profiles") or []
        except Exception:
            profiles = []
        weather_values = [
            f"{profile.get('id')} {profile.get('summary_key') or ''}".strip()
            for profile in profiles
            if profile.get("id") is not None
        ]
        self.weather_combo.configure(values=weather_values)
        if weather_values and not self.weather_profile_id.get():
            self.weather_profile_id.set(weather_values[0])

    def refresh_schedule(self):
        for item in self.schedule_tree.get_children():
            self.schedule_tree.delete(item)

        schedule_data = load_json(SCHEDULE_PATH, default=None)
        if not schedule_data:
            try:
                schedule_items = planning.build_schedule_slots(copy.deepcopy(self.schedule_config), copy.deepcopy(self.rotation_state))
                _, schedule_items = planning.ensure_planned_weather(copy.deepcopy(self.runtime_state), schedule_items, self.schedule_config)
                schedule_data = {"items": schedule_items, "updated_at": "preview"}
            except Exception:
                schedule_data = {"items": []}

        for item in schedule_data.get("items") or []:
            weather = item.get("weather") or {}
            self.schedule_tree.insert(
                "",
                "end",
                values=(
                    item.get("date"),
                    item.get("start_time_local"),
                    item.get("track_name") or item.get("track_code"),
                    weather.get("summary_key"),
                    weather.get("rain_level"),
                    item.get("event_id"),
                ),
            )

        announcement = load_json(ANNOUNCEMENT_PATH, default={}) or {}
        self.announcement_text.delete("1.0", "end")
        self.announcement_text.insert("1.0", format_json(announcement))

    def refresh_logs(self):
        self.logs_text.delete("1.0", "end")
        if not LOG_FILE_PATH.exists():
            self.logs_text.insert("1.0", f"Log file not found: {LOG_FILE_PATH}")
            return
        lines = LOG_FILE_PATH.read_text(encoding="utf-8", errors="replace").splitlines()
        self.logs_text.insert("1.0", "\n".join(lines[-300:]))
        self.logs_text.see("end")

    def update_launch_defaults(self):
        if self.launch_mode.get() == "manual":
            self.consume_queue.set(False)
        else:
            self.consume_queue.set(True)

    def build_orchestrator_command(self, publish_only=False):
        command = [sys.executable, str(ORCHESTRATOR_PATH)]
        command.extend(["--launch-mode", self.launch_mode.get()])
        command.extend(["--run-mode", self.run_mode.get()])

        duration = self.duration_seconds.get().strip()
        if duration:
            command.extend(["--duration-seconds", duration])

        if self.launch_mode.get() == "manual":
            if self.track_code.get().strip():
                command.extend(["--track-code", self.track_code.get().strip()])
            profile_id = self.weather_profile_id.get().strip().split(" ", 1)[0]
            if profile_id:
                command.extend(["--weather-profile-id", profile_id])

        command.extend(["--consume-queue", "yes" if self.consume_queue.get() else "no"])
        if publish_only:
            command.append("--publish-only")
        if not self.git_publish.get():
            command.append("--no-git-publish")
        return command

    def start_run(self):
        if self.launch_mode.get() == "manual" and self.consume_queue.get():
            if not messagebox.askyesno("Manual run", "Manual run is set to consume the schedule queue. Continue?"):
                return
        self.run_command(self.build_orchestrator_command(publish_only=False))

    def rebuild_hourly_data(self):
        command = [sys.executable, str(ORCHESTRATOR_PATH), "--publish-only"]
        if not self.git_publish.get():
            command.append("--no-git-publish")
        self.run_command(command)

    def run_command(self, command: list[str]):
        if self.command_running:
            messagebox.showwarning("Busy", "A command is already running.")
            return
        self.command_running = True
        self.command_output.insert("end", f"\n> {' '.join(command)}\n")
        self.command_output.see("end")

        def worker():
            creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            try:
                process = subprocess.Popen(
                    command,
                    cwd=str(APP_ROOT_DIR),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    creationflags=creationflags,
                )
                assert process.stdout is not None
                for line in process.stdout:
                    self.after(0, self.append_command_output, line)
                return_code = process.wait()
                self.after(0, self.append_command_output, f"\nCommand exited with code {return_code}\n")
            except Exception as exc:
                self.after(0, self.append_command_output, f"\nCommand failed: {exc}\n")
            finally:
                self.after(0, self.command_finished)

        threading.Thread(target=worker, daemon=True).start()

    def append_command_output(self, text: str):
        self.command_output.insert("end", text)
        self.command_output.see("end")

    def command_finished(self):
        self.command_running = False
        self.refresh_all()

    def request_graceful_stop(self):
        pid = self.runtime_state.get("server_pid")
        if not pid:
            if not messagebox.askyesno(
                "Graceful stop",
                "No server_pid in runtime_state.json. Write a stop request anyway?",
            ):
                return
        else:
            if not messagebox.askyesno(
                "Graceful stop",
                f"Ask orchestrator to stop PID {pid}, process results, and publish?",
            ):
                return

        payload = {
            "requested_at": datetime.now().isoformat(timespec="seconds"),
            "requested_by": "hourly_gui",
            "server_pid": pid,
            "action": "stop_after_current_tick_and_publish",
        }
        STOP_REQUEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        STOP_REQUEST_PATH.write_text(format_json(payload) + "\n", encoding="utf-8")
        self.append_command_output(f"\nStop request written: {STOP_REQUEST_PATH}\n")
        self.refresh_all()

    def stop_server_pid(self):
        pid = self.runtime_state.get("server_pid")
        if not pid:
            messagebox.showinfo("Stop server", "No server_pid in runtime_state.json.")
            return
        if not messagebox.askyesno(
            "Emergency kill",
            f"Emergency kill ACC server process PID {pid}?\n\nThis does not let orchestrator process results unless it is still running.",
        ):
            return
        self.run_command(["taskkill", "/PID", str(pid), "/F"])

    def read_git_status(self, path: Path) -> str:
        if not (path / ".git").exists():
            return "No git repository found."
        try:
            result = subprocess.run(
                ["git", "status", "--short"],
                cwd=str(path),
                capture_output=True,
                text=True,
                timeout=10,
            )
        except Exception as exc:
            return str(exc)
        output = (result.stdout or result.stderr).strip()
        return output or "Clean"


if __name__ == "__main__":
    HourlyGui().mainloop()
