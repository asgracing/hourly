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
    "https://asgracing.ru",
    "https://www.asgracing.ru",
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

function normalizeSlotTime(value) {
  const raw = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
  return raw;
}

function parseSlotFromEventId(value) {
  const normalized = normalizeEventId(value);
  const match = normalized.match(/^hourly_(\d{4}-\d{2}-\d{2})_(\d{4})(?:_.+)?$/);
  if (!match) return null;
  return {
    event_id: `hourly_${match[1]}_${match[2]}`,
    date: match[1],
    time: normalizeSlotTime(match[2])
  };
}

function canonicalizeEventId(value) {
  const normalized = normalizeEventId(value);
  const slot = parseSlotFromEventId(normalized);
  return slot?.event_id || normalized;
}

function buildSlotMetadata(slot) {
  const eventId = canonicalizeEventId(slot?.event_id);
  const parsedSlot = parseSlotFromEventId(eventId);
  return {
    event_id: eventId,
    track: String(slot?.track || "-").trim() || "-",
    date: String(slot?.date || parsedSlot?.date || "").trim(),
    time: normalizeSlotTime(slot?.time || parsedSlot?.time || "")
  };
}

function parseIssueMetadata(issueBody) {
  const metadata = {};
  String(issueBody || "")
    .split(/\r?\n/)
    .forEach(line => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) return;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      metadata[key] = value;
    });
  const slotFromEventId = parseSlotFromEventId(metadata.event_id);
  return {
    event_id: canonicalizeEventId(metadata.event_id),
    date: String(metadata.date || slotFromEventId?.date || "").trim(),
    time: normalizeSlotTime(metadata.time || slotFromEventId?.time || "")
  };
}

function slotMetadataMatches(left, right) {
  return Boolean(left?.date && left?.time && right?.date && right?.time && left.date === right.date && left.time === right.time);
}

function issueTitle(eventId) {
  return `Vote: ${canonicalizeEventId(eventId)}`;
}

function buildIssueBody(slot) {
  const metadata = buildSlotMetadata(slot);
  return [
    `event_id: ${metadata.event_id}`,
    `track: ${metadata.track}`,
    `date: ${metadata.date || "-"}`,
    `time: ${metadata.time || "-"}`,
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

async function searchIssues(env, query) {
  const response = await githubFetch(env, `/search/issues?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

function dedupeIssues(issues) {
  const seen = new Map();
  for (const issue of issues || []) {
    if (!issue?.number) continue;
    seen.set(issue.number, issue);
  }
  return [...seen.values()];
}

function chooseCanonicalIssue(issues, eventId) {
  const targetTitle = issueTitle(eventId);
  return [...(issues || [])].sort((left, right) => {
    const leftExact = left?.title === targetTitle ? 1 : 0;
    const rightExact = right?.title === targetTitle ? 1 : 0;
    if (leftExact !== rightExact) return rightExact - leftExact;

    const leftComments = Number(left?.comments || 0);
    const rightComments = Number(right?.comments || 0);
    if (leftComments !== rightComments) return rightComments - leftComments;

    return Date.parse(left?.created_at || 0) - Date.parse(right?.created_at || 0);
  })[0] || null;
}

async function findIssues(env, eventId, slotHint = null) {
  const canonicalEventId = canonicalizeEventId(eventId);
  const titleMatches = await searchIssues(
    env,
    `repo:${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME} is:issue label:hourly-vote in:title "${issueTitle(canonicalEventId)}"`
  );
  const slotMetadata = buildSlotMetadata({ event_id: canonicalEventId, date: slotHint?.date, time: slotHint?.time });
  if (!slotMetadata.date || !slotMetadata.time) {
    return dedupeIssues(titleMatches);
  }
  const slotMatches = await searchIssues(
    env,
    `repo:${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME} is:issue label:hourly-vote "date: ${slotMetadata.date}" "time: ${slotMetadata.time}"`
  );
  return dedupeIssues(
    [...titleMatches, ...slotMatches].filter(issue => {
      if (issue?.title === issueTitle(canonicalEventId)) return true;
      return slotMetadataMatches(parseIssueMetadata(issue?.body), slotMetadata);
    })
  );
}

async function findIssue(env, eventId, slotHint = null) {
  return chooseCanonicalIssue(await findIssues(env, eventId, slotHint), eventId);
}

async function createIssue(env, slot) {
  const metadata = buildSlotMetadata(slot);
  const owner = env.GITHUB_REPO_OWNER;
  const repo = env.GITHUB_REPO_NAME;
  const response = await githubFetch(
    env,
    `/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        title: issueTitle(metadata.event_id),
        labels: ["hourly-vote", "slot-vote"],
        body: buildIssueBody(metadata)
      })
    }
  );
  return response.json();
}

async function ensureIssue(env, slot, issues = []) {
  const existing = chooseCanonicalIssue(issues, slot.event_id);
  if (existing) return existing;
  return createIssue(env, slot);
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

function findVoteCommentsByVoterId(comments, voterId) {
  return comments.filter(comment => parseVoteComment(comment?.body) === voterId);
}

async function listVoteCommentsForIssues(env, issues) {
  const commentGroups = await Promise.all(
    (issues || [])
      .filter(issue => issue?.number)
      .map(issue => listVoteComments(env, issue.number))
  );
  return commentGroups.flat();
}

function summarizeVotes(eventId, comments, voterId = "") {
  const uniqueVoters = new Set();
  comments.forEach(comment => {
    const parsed = parseVoteComment(comment?.body);
    if (parsed) uniqueVoters.add(parsed);
  });
  return {
    event_id: canonicalizeEventId(eventId),
    votes: uniqueVoters.size,
    already_voted: voterId ? uniqueVoters.has(voterId) : false
  };
}

async function handleGetVotes(request, env, origin) {
  const url = new URL(request.url);
  const eventIds = [...new Set(String(url.searchParams.get("event_ids") || "")
    .split(",")
    .map(canonicalizeEventId)
    .filter(Boolean))];
  const voterId = String(url.searchParams.get("voter_id") || "").trim();
  if (!eventIds.length) {
    return jsonResponse({ ok: false, error: "event_ids query parameter is required" }, 400, origin);
  }
  const results = {};
  for (const eventId of eventIds) {
    const issues = await findIssues(env, eventId);
    if (!issues.length) {
      results[eventId] = { event_id: eventId, votes: 0, already_voted: false };
      continue;
    }
    const comments = await listVoteCommentsForIssues(env, issues);
    results[eventId] = summarizeVotes(eventId, comments, voterId);
  }
  return jsonResponse({ ok: true, items: results }, 200, origin);
}

async function handlePostVote(request, env, origin) {
  const payload = await request.json().catch(() => null);
  const eventId = canonicalizeEventId(payload?.event_id);
  const voterId = String(payload?.voter_id || "").trim();
  if (!eventId || !voterId) {
    return jsonResponse({ ok: false, error: "event_id and voter_id are required" }, 400, origin);
  }
  const slot = buildSlotMetadata({
    event_id: eventId,
    track: payload?.track,
    date: payload?.date,
    time: payload?.time
  });
  const issues = await findIssues(env, eventId, slot);
  const comments = await listVoteCommentsForIssues(env, issues);
  const summary = summarizeVotes(eventId, comments, voterId);
  if (!summary.already_voted) {
    const issue = await ensureIssue(env, slot, issues);
    await githubFetch(
      env,
      `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues/${issue.number}/comments`,
      {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ body: `vote:${voterId}` })
      }
    );
    const updatedComments = await listVoteCommentsForIssues(env, dedupeIssues([...issues, issue]));
    return jsonResponse({ ok: true, ...summarizeVotes(eventId, updatedComments, voterId) }, 200, origin);
  }
  return jsonResponse({ ok: true, ...summary }, 200, origin);
}

async function handlePostUnvote(request, env, origin) {
  const payload = await request.json().catch(() => null);
  const eventId = canonicalizeEventId(payload?.event_id);
  const voterId = String(payload?.voter_id || "").trim();
  if (!eventId || !voterId) {
    return jsonResponse({ ok: false, error: "event_id and voter_id are required" }, 400, origin);
  }
  const issues = await findIssues(env, eventId);
  if (!issues.length) {
    return jsonResponse({ ok: true, event_id: eventId, votes: 0, already_voted: false }, 200, origin);
  }
  for (const issue of issues) {
    const comments = await listVoteComments(env, issue.number);
    const voteComments = findVoteCommentsByVoterId(comments, voterId);
    for (const voteComment of voteComments) {
      if (!voteComment?.id) continue;
      await githubFetch(
        env,
        `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues/comments/${voteComment.id}`,
        { method: "DELETE" }
      );
    }
  }
  const updatedComments = await listVoteCommentsForIssues(env, issues);
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
