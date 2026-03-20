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
    { "id": 1, "weight": 14, "cloud_range": [0.25, 0.35], "rain_range": [0.2, 0.2], "randomness_range": [5, 7], "summary_key": "mixed" },
    { "id": 2, "weight": 18, "cloud_range": [0.45, 0.6], "rain_range": [0.0, 0.0], "randomness_range": [5, 7], "summary_key": "mixed" },
    { "id": 3, "weight": 16, "cloud_range": [0.6, 1.0], "rain_range": [0.0, 0.0], "randomness_range": [1, 3], "summary_key": "cloudy" },
    { "id": 4, "weight": 24, "cloud_range": [0.0, 0.4], "rain_range": [0.0, 0.0], "randomness_range": [1, 3], "summary_key": "clear" },
    { "id": 5, "weight": 14, "cloud_range": [0.6, 0.9], "rain_range": [0.0, 0.0], "randomness_range": [4, 7], "summary_key": "cloudy" },
    { "id": 6, "weight": 9, "cloud_range": [0.6, 0.8], "rain_range": [0.1, 0.3], "randomness_range": [1, 3], "summary_key": "wet" },
    { "id": 7, "weight": 5, "cloud_range": [0.6, 1.0], "rain_range": [0.45, 0.8], "randomness_range": [1, 3], "summary_key": "wet" }
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
- sends reminders when the start time is within the `24h`, `2h`, or `15m` window
- stores sent-state in `.github/hourly_notify_state.json` so the same event is not announced twice

Required GitHub secrets:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `DISCORD_WEBHOOK_URL`

Optional GitHub repository variables:
- `HOURLY_ANNOUNCEMENT_URL`
- `HOURLY_SCHEDULE_URL`
- `HOURLY_VOTES_API_BASE`
- `HOURLY_NOTIFY_WINDOW_MINUTES`
- `HOURLY_NOTIFY_FINAL_WINDOW_MINUTES`

Notes:
- `workflow_dispatch` can be used for a dry run from the Actions tab
- `workflow_dispatch` also supports `force_send=true` for an immediate test message without waiting for the notification window
- scheduled workflows on GitHub only run from the default branch, so this branch can be tested manually but must be merged into the default branch before cron notifications will start
