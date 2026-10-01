// functions/api/research/queue.js
// GET /api/research/queue?limit=N
// Authorization: Bearer <AGENT_INGEST_SECRET>
//
// Returns the next batch of current deputies to research, so the research skill
// can work through all 200 Chamber of Deputies seats a batch at a time.
//
// Ordering & priority:
//   • There is no single-seat "majority"/marginality concept under party-list PR
//     (unlike the original UK single-member-seat version this endpoint came
//     from), so seats are ordered by region then name — a placeholder ordering.
//     Replace with a better Czech-specific priority (e.g. list position, party
//     seat share) if one becomes useful.
//   • Two phases. Phase "unscored" returns deputies that have NO real grade yet
//     (grade '?' / blank and no live rating). Only once every unscored deputy has
//     been worked through does phase "refresh" begin, re-checking already-scored
//     deputies so ratings can be kept current.
//   • A (region, deputy) pair with a PENDING draft awaiting review is always
//     skipped (in progress).
//
// A deputy counts as already scored when data.json shows a real grade (A–F or
// DNR, from the sheet or a previously-confirmed rating) or they have a live
// mp_ratings row (covers ratings confirmed since the last build). No seeding
// step required.
//
// The full deputy list comes from the built /data.json (the same file the site
// serves), so this needs no separate copy of the region roster.

import { makeSupabase, agentSecretOk, json } from '../../../lib/admin-auth.js';

// Grades that count as "already assessed". Mirrors REAL_GRADES in
// scripts/import-ratings.js.
const SCORED_GRADES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'DNR']);

function bySeat(a, b) {
  return a.constituency.localeCompare(b.constituency, 'cs') || a.mp_name.localeCompare(b.mp_name, 'cs');
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (!agentSecretOk(context)) return json({ error: 'Unauthorized' }, 401);

  const supabase = makeSupabase(context.env);
  if (!supabase) return json({ error: 'Server not configured' }, 500);

  const url   = new URL(context.request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 1), 100);

  // Pull the current-deputy roster from the deployed data.json. (The field is
  // still named `constituencies` in data.json — see scripts/fetch-data.js —
  // even though it now means "regions".)
  let constituencies, candidates;
  try {
    const res = await fetch(`${url.origin}/data.json`);
    if (!res.ok) throw new Error(`data.json ${res.status}`);
    ({ constituencies, candidates } = await res.json());
  } catch (e) {
    console.error('research queue: could not load data.json:', e.message || e);
    return json({ error: 'Could not load deputy list' }, 502);
  }

  const currentMps = [];
  for (const region of constituencies || []) {
    for (const c of (candidates || {})[region.name] || []) {
      if (!c.current_mp || !c.name) continue;
      currentMps.push({
        constituency: region.name,
        mp_name:      c.name,
        party:        c.party || null,
        sheetScored:  SCORED_GRADES.has(String(c.grade || '').trim().toUpperCase()),
      });
    }
  }

  // Supabase state: pending drafts (in progress) and live ratings (scored).
  const [pendingRes, ratingsRes] = await Promise.all([
    supabase.from('mp_recommendations').select('constituency, mp_name').eq('status', 'pending'),
    supabase.from('mp_ratings').select('constituency, mp_name'),
  ]);
  if (pendingRes.error || ratingsRes.error) {
    console.error('research queue state error:', (pendingRes.error || ratingsRes.error)?.message);
    return json({ error: 'Failed to read review state' }, 500);
  }
  const seatKey    = m => `${m.constituency}\u0000${m.mp_name}`;
  const pendingSet = new Set((pendingRes.data || []).map(seatKey));
  const ratingSet  = new Set((ratingsRes.data || []).map(seatKey));

  const isScored = m => m.sheetScored || ratingSet.has(seatKey(m));

  // Pending-draft seats are always excluded; everything else splits into the two
  // phases.
  const available = currentMps.filter(m => !pendingSet.has(seatKey(m)));
  const unscored  = available.filter(m => !isScored(m)).sort(bySeat);
  const refresh   = available.filter(m =>  isScored(m)).sort(bySeat);

  // Refresh scored seats only once no unscored seats remain.
  const phase = unscored.length ? 'unscored' : 'refresh';
  const pool  = unscored.length ? unscored : refresh;
  const batch = pool.slice(0, limit).map(m => ({
    constituency: m.constituency, mp_name: m.mp_name, party: m.party,
  }));

  return json({
    total_mps:          currentMps.length,
    phase,                                 // 'unscored' (initial sweep) or 'refresh'
    unscored_remaining: unscored.length,
    refresh_remaining:  refresh.length,
    pending_review:     pendingSet.size,   // awaiting Confirm/Reject, not re-queued
    remaining:          pool.length,       // remaining in the current phase
    returned:           batch.length,
    mps:                batch,             // ordered by region then name
  });
}
