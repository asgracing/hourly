const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8"
};

function getAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get("origin") || "";
  const configuredOrigins = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const fallbackOrigins = [
    "https://asgracing.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
  ];
  const allowList = new Set([...configuredOrigins, ...fallbackOrigins]);
  if (requestOrigin && allowList.has(requestOrigin)) return requestOrigin;
  return configuredOrigins[0] || fallbackOrigins[0];
}

function withCors(headers, origin) {
  headers["access-control-allow-origin"] = origin || "*";
  headers["access-control-allow-methods"] = "GET,POST,OPTIONS";
  headers["access-control-allow-headers"] = "content-type";
  headers["vary"] = "origin";
  return headers;
}

function jsonResponse(payload, status = 200, origin = "*") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: withCors({ ...JSON_HEADERS }, origin)
  });
}

function normalizeEventId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function issueTitle(eventId) {
  return `Vote: ${normalizeEventId(eventId)}`;
}

function buildIssueBody(slot) {
  return [
    `event_id: ${normalizeEventId(slot.event_id)}`,
    `track: ${slot.track || "-"}`,
    `date: ${slot.date || "-"}`,
    `time: ${slot.time || "-"}`,
    "",
    "This issue stores vote comments for an hourly race slot."
  ].join("\n");
}

function parseVoteComment(commentBody) {
  const text = String(commentBody || "").trim();
  if (!text.startsWith("vote:")) return null;
  const voterId = text.slice(5).trim();
  return voterId || null;
}

async function githubFetch(env, path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "user-agent": "hourly-votes-worker",
      ...init.headers
    }
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub API ${response.status}: ${details}`);
  }
  return response;
}

async function findIssue(env, eventId) {
  const owner = env.GITHUB_REPO_OWNER;
  const repo = env.GITHUB_REPO_NAME;
  const query = encodeURIComponent(`repo:${owner}/${repo} is:issue in:title "${issueTitle(eventId)}"`);
  const response = await githubFetch(env, `/search/issues?q=${query}`);
  const data = await response.json();
  return Array.isArray(data.items) && data.items.length ? data.items[0] : null;
}

async function ensureIssue(env, slot) {
  const existing = await findIssue(env, slot.event_id);
  if (existing) return existing;
  const response = await githubFetch(
    env,
    `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues`,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        title: issueTitle(slot.event_id),
        labels: ["hourly-vote", "slot-vote"],
        body: buildIssueBody(slot)
      })
    }
  );
  return response.json();
}

async function listVoteComments(env, issueNumber) {
  const response = await githubFetch(
    env,
    `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues/${issueNumber}/comments?per_page=100`
  );
  const comments = await response.json();
  return Array.isArray(comments) ? comments : [];
}

function findVoteCommentByVoterId(comments, voterId) {
  return comments.find(comment => parseVoteComment(comment?.body) === voterId) || null;
}

function summarizeVotes(eventId, comments, voterId = "") {
  const uniqueVoters = new Set();
  comments.forEach(comment => {
    const parsed = parseVoteComment(comment?.body);
    if (parsed) uniqueVoters.add(parsed);
  });
  return {
    event_id: normalizeEventId(eventId),
    votes: uniqueVoters.size,
    already_voted: voterId ? uniqueVoters.has(voterId) : false
  };
}

async function handleGetVotes(request, env, origin) {
  const url = new URL(request.url);
  const eventIds = String(url.searchParams.get("event_ids") || "")
    .split(",")
    .map(normalizeEventId)
    .filter(Boolean);
  const voterId = String(url.searchParams.get("voter_id") || "").trim();
  if (!eventIds.length) {
    return jsonResponse({ ok: false, error: "event_ids query parameter is required" }, 400, origin);
  }
  const results = {};
  for (const eventId of eventIds) {
    const issue = await findIssue(env, eventId);
    if (!issue?.number) {
      results[eventId] = { event_id: eventId, votes: 0, already_voted: false };
      continue;
    }
    const comments = await listVoteComments(env, issue.number);
    results[eventId] = summarizeVotes(eventId, comments, voterId);
  }
  return jsonResponse({ ok: true, items: results }, 200, origin);
}

async function handlePostVote(request, env, origin) {
  const payload = await request.json().catch(() => null);
  const eventId = normalizeEventId(payload?.event_id);
  const voterId = String(payload?.voter_id || "").trim();
  if (!eventId || !voterId) {
    return jsonResponse({ ok: false, error: "event_id and voter_id are required" }, 400, origin);
  }
  const issue = await ensureIssue(env, {
    event_id: eventId,
    track: payload?.track,
    date: payload?.date,
    time: payload?.time
  });
  const comments = await listVoteComments(env, issue.number);
  const summary = summarizeVotes(eventId, comments, voterId);
  if (!summary.already_voted) {
    await githubFetch(
      env,
      `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues/${issue.number}/comments`,
      {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ body: `vote:${voterId}` })
      }
    );
    const updatedComments = await listVoteComments(env, issue.number);
    return jsonResponse({ ok: true, ...summarizeVotes(eventId, updatedComments, voterId) }, 200, origin);
  }
  return jsonResponse({ ok: true, ...summary }, 200, origin);
}

async function handlePostUnvote(request, env, origin) {
  const payload = await request.json().catch(() => null);
  const eventId = normalizeEventId(payload?.event_id);
  const voterId = String(payload?.voter_id || "").trim();
  if (!eventId || !voterId) {
    return jsonResponse({ ok: false, error: "event_id and voter_id are required" }, 400, origin);
  }
  const issue = await findIssue(env, eventId);
  if (!issue?.number) {
    return jsonResponse({ ok: true, event_id: eventId, votes: 0, already_voted: false }, 200, origin);
  }
  const comments = await listVoteComments(env, issue.number);
  const voteComment = findVoteCommentByVoterId(comments, voterId);
  if (voteComment?.id) {
    await githubFetch(
      env,
      `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues/comments/${voteComment.id}`,
      { method: "DELETE" }
    );
  }
  const updatedComments = await listVoteComments(env, issue.number);
  return jsonResponse({ ok: true, ...summarizeVotes(eventId, updatedComments, voterId) }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = getAllowedOrigin(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: withCors({}, origin) });
    }
    try {
      const url = new URL(request.url);
      if (url.pathname === "/votes" && request.method === "GET") {
        return await handleGetVotes(request, env, origin);
      }
      if (url.pathname === "/vote" && request.method === "POST") {
        return await handlePostVote(request, env, origin);
      }
      if (url.pathname === "/unvote" && request.method === "POST") {
        return await handlePostUnvote(request, env, origin);
      }
      return jsonResponse({ ok: false, error: "Not found" }, 404, origin);
    } catch (error) {
      return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500, origin);
    }
  }
};
