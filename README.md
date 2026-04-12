# Hourly

This folder is a standalone scaffold for the future `hourly` repository.

Purpose:
- run a separate ACC dedicated server for scheduled 1-hour race sessions;
- rotate tracks outside ACC config memory;
- publish public JSON for the main website and the hourly section page;
- update `cfg/event.json` before each launch so the server starts on the selected track.

Planned runtime environment:
- server root: `I:\SteamLibrary\steamapps\common\Assetto Corsa Competizione Dedicated Server Race\server`
- timezone: `UTC+3`
- launch slots: `14:00` and `20:00`
- server uptime per slot: `2 hours`

Recommended config paths in `schedule_config.json`:
- `event_config_path`: `cfg\\event.json`
- `event_rules_path`: `cfg\\eventRules.json`
- `settings_path`: `cfg\\settings.json`

Optional planned weather config in `schedule_config.json`:
- `weather_planning.slots_ahead`: how many future slots keep a locked weather plan for; default `3`
- `weather_planning.ambient_temp_range_c`: global ambient temperature range, for example `[14, 24]`
- `weather_planning.profiles`: weighted scenario list used only when a slot gets weather for the first time

Example `weather_planning` block:
```json
"weather_planning": {
  "slots_ahead": 3,
  "ambient_temp_range_c": [14, 24],
  "profiles": [
    { "id": 1, "weight": 25, "cloud_range": [0.0, 0.15], "rain_range": [0.0, 0.0], "randomness_range": [0, 2], "summary_key": "clear" },
    { "id": 2, "weight": 25, "cloud_range": [0.65, 0.9], "rain_range": [0.0, 0.0], "randomness_range": [1, 3], "summary_key": "cloudy" },
    { "id": 3, "weight": 25, "cloud_range": [0.35, 0.7], "rain_range": [0.0, 0.12], "randomness_range": [4, 7], "summary_key": "mixed" },
    { "id": 4, "weight": 25, "cloud_range": [0.7, 0.95], "rain_range": [0.22, 0.35], "randomness_range": [2, 5], "summary_key": "wet" }
  ]
}
```

Runtime behavior:
- publisher builds the next `3` slots, creates missing planned weather once, and stores it in `config/runtime_state.json`
- announcement and schedule JSON are published from that planned weather
- orchestrator reads the planned weather for the active slot and writes it into ACC `cfg/event.json` before server launch

Repository layout:
- `index.html`, `app.js`, `styles.css` - public hourly page
- `../hourly-data/announcement.json` - next scheduled race for the main site and hourly page
- `../hourly-data/recent_races.json` - latest completed hourly races
- `../hourly-data/schedule.json` - public upcoming schedule
- `event.json` - local reference sample of ACC `cfg/event.json`
- `config/` - schedule and local state
- `scripts/` - orchestration and parsing entry points

Suggested workflow:
1. Copy this folder into the dedicated server workspace.
2. Initialize it as a separate git repository.
3. Point orchestration scripts to the local ACC server config and results folders.
4. Add Windows Task Scheduler jobs that start the orchestrator at the desired slots.

Slot vote MVP:
- the public page can show a `I want to race!` vote CTA on upcoming slots
- frontend reads the Worker base URL from `<meta name="hourly-votes-api" content="...">` in `index.html`
- if the Worker URL is empty or unavailable, voting stays disabled and the page falls back to a passive `Voting soon` label
- the Cloudflare Worker source lives in `votes-worker/`
- the Worker stores votes in GitHub Issues, one issue per slot `event_id`
- each browser gets a local `voter_id` in `localStorage`, so the same browser can vote only once per slot in the UI flow

Track switching flow:
1. Orchestrator loads `config/schedule_config.json`.
2. It chooses the next track using `config/rotation_state.json`.
3. It opens the real ACC config at `server/cfg/event.json`.
4. It rewrites the `track` field there.
5. Only after that it starts `accServer.exe`.

## GitHub notifications

The repository includes `scripts/hourly_notify.py` and `.github/workflows/hourly-notify.yml` for Telegram and Discord reminders about the nearest hourly event.

What it does:
- loads the next event from `https://asgracing.github.io/hourly-data/announcement.json`
- sends reminders in the `3h` and `1h` windows before the start
- stores sent-state in `.github/hourly_notify_state.json` so the same event is not announced twice

Required GitHub secrets:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `DISCORD_WEBHOOK_URL`

Optional GitHub repository variables:
- `HOURLY_ANNOUNCEMENT_URL`
- `HOURLY_SCHEDULE_URL`
- `HOURLY_VOTES_API_BASE`
- `HOURLY_NOTIFY_3H_WINDOW_START_MINUTES` - default `195`
- `HOURLY_NOTIFY_3H_WINDOW_END_MINUTES` - default `125`
- `HOURLY_NOTIFY_1H_WINDOW_START_MINUTES` - default `75`
- `HOURLY_NOTIFY_1H_WINDOW_END_MINUTES` - default `5`

Notes:
- `workflow_dispatch` can be used for a dry run from the Actions tab
- `workflow_dispatch` also supports `force_send=true` for an immediate test message without waiting for the notification window
- by default the `3h` reminder window is from `3h15m` to `2h05m` before the scheduled start
- by default the `1h` reminder window is from `1h15m` to `5m` before the scheduled start
- the scheduled workflow wakes up every 15 minutes across the configured daytime/evening hours; `.github/hourly_notify_state.json` prevents duplicates
- scheduled workflows on GitHub only run from the default branch, so this branch can be tested manually but must be merged into the default branch before cron notifications will start

## Local control GUI

Run the lightweight local control panel on the server with:

```powershell
python scripts\hourly_gui.py
```

The GUI reads and edits `../hourly-data/config/*.json`, shows schedule/runtime/logs,
and starts `scripts/orchestrator.py` with explicit options. Auto schedule runs
consume the next queued slot by default. Manual runs default to leaving the
schedule queue unchanged, so extra ad-hoc races do not steal tomorrow's slot.
Use `Graceful stop + publish` for early session stops: it writes
`../hourly-data/config/stop_request.json`, then the running orchestrator stops
ACC, checks Q/R result files, rebuilds hourly data, and publishes normally.
`Emergency kill PID` is only a fallback when the orchestrator is not responding.

The same controls are also available from CLI, for example:

```powershell
python scripts\orchestrator.py --launch-mode manual --run-mode test --track-code monza --weather-profile-id 1 --consume-queue no
```
