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

Repository layout:
- `index.html`, `app.js`, `styles.css` - public hourly page
- `announcement.json` - next scheduled race for the main site and hourly page
- `recent_races.json` - latest completed hourly races
- `schedule.json` - public upcoming schedule
- `event.json` - local reference sample of ACC `cfg/event.json`
- `config/` - schedule and local state
- `scripts/` - orchestration and parsing entry points

Suggested workflow:
1. Copy this folder into the dedicated server workspace.
2. Initialize it as a separate git repository.
3. Point orchestration scripts to the local ACC server config and results folders.
4. Add Windows Task Scheduler jobs that start the orchestrator at the desired slots.

Track switching flow:
1. Orchestrator loads `config/schedule_config.json`.
2. It chooses the next track using `config/rotation_state.json`.
3. It opens the real ACC config at `server/cfg/event.json`.
4. It rewrites the `track` field there.
5. Only after that it starts `accServer.exe`.
