# Hourly Votes Worker

This Cloudflare Worker stores slot votes in GitHub Issues.

## Endpoints

- `GET /votes?event_ids=id1,id2,id3&voter_id=browser-token`
- `POST /vote`

Example POST body:

```json
{
  "event_id": "hourly_2026-03-19_1400_monza",
  "track": "Monza",
  "date": "2026-03-19",
  "time": "14:00",
  "voter_id": "browser-local-token"
}
```

## Required secrets

```bash
wrangler secret put GITHUB_TOKEN
```

The token needs GitHub Issues read/write access for the target repository.
If the GitHub PAT is regenerated, run the same command again from this
`votes-worker/` directory and paste the new token. Wrangler updates the Worker
secret without committing the token to git.

## Required vars

Set in `wrangler.toml` or with `wrangler secret/vars`:

- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `ALLOWED_ORIGIN`

Recommended target repo: a small technical repo like `asgracing/hourly-votes`.

## Deploy

```bash
wrangler deploy
```

After deploy, put the Worker URL into:

```html
<meta name="hourly-votes-api" content="https://your-worker.workers.dev" />
```

inside [index.html](c:/Python/asgracing/hourly/index.html).
