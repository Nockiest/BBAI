// scripts/fetch-data.js
// Runs at build time:
//   1. Fetches Candidates + Regions tabs from the published Google Sheet
//   2. Writes data.json with { constituencies, candidates } — `constituencies`
//      here means "regions" (kraje); the field name is kept for continuity with
//      the `constituency` field used throughout the rest of this pipeline.
//
// Unlike the original UK version of this build script, there is no "one MP per
// seat" baseline to fetch: the Chamber of Deputies is elected by party-list PR
// across 14 multi-member regions (kraje), so a region can have several sitting
// deputies. The Google Sheet's CurrentMP='C' marker is therefore the ONLY source
// of "who currently holds a seat" — mark every sitting deputy for a region with
// 'C', not just one.
//
// In Google Sheets: File → Share → Publish to web → publish each tab as CSV.
// The published-to-web URLs are committed as defaults below so the build always
// has them (non-sensitive URLs, and this repo is private). Set the matching
// GOOGLE_SHEET_*_URL env vars to override — e.g. to point the build at a test
// sheet. They are intentionally NOT Cloudflare dashboard vars/secrets: secrets
// aren't exposed at build time, and a wrangler.toml [vars] copy collides with
// the Function's runtime bindings on deploy.

import { readFileSync, writeFileSync } from 'fs';

// Convenience for local builds: fill in any vars not already in the environment
// from .dev.vars (the same file wrangler uses for `npm run dev`). Existing
// environment variables always win, so CI/Cloudflare builds are unaffected.
function loadDevVars() {
  let raw;
  try { raw = readFileSync('.dev.vars', 'utf8'); } catch { return; }
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq === -1) continue;
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
loadDevVars();

const CANDIDATES_URL    = process.env.GOOGLE_SHEET_CANDIDATES_URL;
const CONSTITUENCIES_URL = process.env.GOOGLE_SHEET_CONSTITUENCIES_URL;

if (!CANDIDATES_URL || !CONSTITUENCIES_URL) {
  console.error(
    'Error: GOOGLE_SHEET_CANDIDATES_URL and GOOGLE_SHEET_CONSTITUENCIES_URL must both be set.'
  );
  process.exit(1);
}

// ── CSV parser (handles quoted fields containing commas or newlines) ───────────
function parseCSV(raw) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch   = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')             { inQuotes = false; }
      else                             { field += ch; }
    } else {
      if      (ch === '"')  { inQuotes = true; }
      else if (ch === ',')  { row.push(field); field = ''; }
      else if (ch === '\r' && next === '\n') {
        row.push(field); field = '';
        rows.push(row);  row = []; i++;
      }
      else if (ch === '\n' || ch === '\r') {
        row.push(field); field = '';
        rows.push(row);  row = [];
      }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchCSV(url, label) {
  const res = await fetch(url);
  if (!res.ok) {
    await res.arrayBuffer().catch(() => {});
    throw new Error(`Failed to fetch ${label} (${res.status} ${res.statusText})`);
  }
  // Decode the body explicitly as UTF-8. Some build runtimes decode a
  // charset-less CSV response as Latin-1, which double-encodes accented names
  // (e.g. "Vysočina" → "VysoÄina"); reading the raw bytes and decoding UTF-8
  // ourselves keeps names correct regardless of the runtime's default.
  const buf = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(new Uint8Array(buf));
}

// Repairs UTF-8-decoded-as-Latin-1 mojibake that an upstream export can bake
// into its text. Only rewrites a string that is made entirely of Latin-1
// characters, contains a high one, and decodes as clean UTF-8 when read back as
// bytes — so a correctly-encoded name is left untouched.
function fixMojibake(s) {
  if (!s) return s;
  if (![...s].every(c => c.charCodeAt(0) <= 0xFF)) return s;
  if (!s.split('').some(c => c.charCodeAt(0) >= 0x80)) return s;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(s, 'latin1'));
  } catch {
    return s;   // reading it back as bytes isn't valid UTF-8 → it wasn't mojibake
  }
}

// Normalise a name or region for fuzzy matching (includes Czech diacritics, on
// top of the base Latin ones, so "Vysočina" / "Vysocina" still match).
function normName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêëě]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûüů]/g, 'u')
    .replace(/[ý]/g, 'y')
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[ř]/g, 'r')
    .replace(/[ď]/g, 'd')
    .replace(/[ť]/g, 't')
    .replace(/[ň]/g, 'n')
    .replace(/[''`]/g, "'")
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strip common academic/professional titles before name comparison, so e.g.
// "Ing. Jana Příkladová" and "Jana Příkladová" still match.
function stripHonorifics(s) {
  return (s || '')
    .replace(/^(Ing\.?|Mgr\.?|JUDr\.?|MUDr\.?|MVDr\.?|PhDr\.?|RNDr\.?|Bc\.?|BcA\.?|MgA\.?|Dr\.?|doc\.?|prof\.?)\s+(arch\.?\s+)?/i, '')
    .trim();
}

// ── Fetch everything ───────────────────────────────────────────────────────────
// Failures are reported via process.exitCode, never process.exit() or a throw:
// on Node 24 / Windows, any forced exit after fetch() has opened sockets crashes
// with "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" and hides the
// real error. allSettled so both fetches finish and both errors get printed.
const fetched = await Promise.allSettled([
  fetchCSV(CANDIDATES_URL,     'Candidates'),
  fetchCSV(CONSTITUENCIES_URL, 'Regions'),
]);
const fetchErrors = fetched.filter(r => r.status === 'rejected');
if (fetchErrors.length) {
  for (const r of fetchErrors) console.error(`Error: ${r.reason.message}`);
  process.exitCode = 1;
} else {
  const [candidatesText, constituenciesText] = fetched.map(r => r.value);

  // ── Confirmed BBAI ratings from Supabase (optional overlay) ───────────────────
  // If SUPABASE_URL + SUPABASE_ANON_KEY are set at build time, confirmed ratings
  // produced by the rating agent (see docs/mp-rating-agent.md) override the sheet
  // grade for the matching (region, deputy) pair, and supply their bullets and
  // evidence. Without these vars the build behaves exactly as before (sheet only),
  // so the overlay can be adopted incrementally. The anon key is sufficient —
  // mp_ratings grants public SELECT (grades are public) and nothing else.
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  async function fetchConfirmedRatings() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Supabase ratings overlay: skipped (SUPABASE_URL / SUPABASE_ANON_KEY not set)');
      return [];
    }
    try {
      const base = SUPABASE_URL.replace(/\/$/, '');
      const res  = await fetch(
        `${base}/rest/v1/mp_ratings?select=constituency,mp_name,grade,bullets,sources,updated_at`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (!res.ok) {
        console.warn(`Supabase ratings overlay: fetch failed (${res.status} ${res.statusText}) — using sheet grades only`);
        return [];
      }
      const rows = await res.json();
      console.log(`Supabase ratings overlay: ${Array.isArray(rows) ? rows.length : 0} confirmed rating(s) fetched`);
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn(`Supabase ratings overlay: ${e.message} — using sheet grades only`);
      return [];
    }
  }

  const confirmedRatings = await fetchConfirmedRatings();

  // ── Parse Regions tab ──────────────────────────────────────────────────────────
  // Kept as `constituencies` in code/JSON (matching the unchanged `constituency`
  // field used everywhere else in this pipeline and in Supabase) even though the
  // sheet tab and CSV template now say "Region" — only the human-facing wording
  // changed, not the wire format.
  const [_conHeader, ...conRows] = parseCSV(constituenciesText);
  const constituencies = conRows
    .map(row => (row[0] || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'cs'))
    .map(name => ({ name }));

  // ── Parse Candidates tab ──────────────────────────────────────────────────────
  const [candHeaderRow, ...candRows] = parseCSV(candidatesText);

  // Find key columns by header name so the sheet column order doesn't matter
  const hdr = candHeaderRow.map(h => (h || '').trim().toLowerCase());

  // Return the first header column matching any of the given strings/regexes/predicates,
  // or `fallback` if none match. Lets columns be inserted without breaking the mapping.
  function findCol(fallback, ...matchers) {
    for (const m of matchers) {
      const idx = hdr.findIndex(h => {
        if (m instanceof RegExp)      return m.test(h);
        if (typeof m === 'function')  return m(h);
        return h === m;
      });
      if (idx >= 0) return idx;
    }
    return fallback;
  }

  // The leading block (region … evidence 3 URL) has a stable position.
  const COL = {
    region: 0,
    name:   1,
    party:  2,
    grade:  3,
    b1: 4, b2: 5, b3: 6, b4: 7, b5: 8,
    ev1: 9, ev1url: 10, ev2: 11, ev2url: 12, ev3: 13, ev3url: 14,
  };
  // Fourth evidence column + its URL — added later, so locate it by header (with the
  // most likely inserted-after-ev3url positions as a fallback).
  COL.ev4    = findCol(15, 'evidence4', 'evidence 4', h => /evidence\s*4\b/.test(h) && !/(url|link)/.test(h));
  COL.ev4url = findCol(16, 'evidence4url', 'evidence 4 url', 'evidence4 url', h => /evidence\s*4\b/.test(h) && /(url|link)/.test(h));
  // Everything after the evidence block shifts when columns are inserted, so detect by
  // header and fall back to positions relative to the last evidence column.
  COL.lastUpdated = findCol(Math.max(COL.ev4url, 14) + 1, /last\s*updated/, /date\s*updated/, /^updated$/);
  COL.currentMp   = findCol(COL.lastUpdated + 1, 'currentmp', 'current_mp', 'current mp');

  console.log(`Candidates CSV: ev4 col=${COL.ev4}, ev4url col=${COL.ev4url}, lastUpdated col=${COL.lastUpdated}, currentMp col=${COL.currentMp}`);

  const candidatesMap = {};

  for (const row of candRows) {
    const region        = (row[COL.region]        || '').trim();
    const name          = fixMojibake((row[COL.name] || '').trim());
    const party         = (row[COL.party]         || '').trim();
    const rawGrade      = (row[COL.grade]         || '?').trim().toUpperCase();
    const GRADE_NORM    = { 'NO RESPONSE': 'DNR', 'NO_RESPONSE': 'DNR', 'DID NOT RESPOND': 'DNR', 'NOT SCORED': '?', 'NOT_SCORED': '?' };
    const grade         = GRADE_NORM[rawGrade] ?? rawGrade;
    const b1            = (row[COL.b1]            || '').trim();
    const b2            = (row[COL.b2]            || '').trim();
    const b3            = (row[COL.b3]            || '').trim();
    const b4            = (row[COL.b4]            || '').trim();
    const b5            = (row[COL.b5]            || '').trim();
    const ev1           = (row[COL.ev1]           || '').trim();
    const ev1url        = (row[COL.ev1url]        || '').trim();
    const ev2           = (row[COL.ev2]           || '').trim();
    const ev2url        = (row[COL.ev2url]        || '').trim();
    const ev3           = (row[COL.ev3]           || '').trim();
    const ev3url        = (row[COL.ev3url]        || '').trim();
    const ev4           = (row[COL.ev4]           || '').trim();
    const ev4url        = (row[COL.ev4url]        || '').trim();
    const lastUpdated   = (row[COL.lastUpdated]   || '').trim();
    const currentMp     = (row[COL.currentMp]     || '').trim();

    if (!region || !name) continue;

    if (!candidatesMap[region]) candidatesMap[region] = [];
    candidatesMap[region].push({
      name,
      party,
      grade,
      current_mp:   currentMp.toUpperCase() === 'C',
      bullet1:      b1,
      bullet2:      b2,
      bullet3:      b3,
      bullet4:      b4,
      bullet5:      b5,
      evidence1:    ev1,
      evidence1_url: ev1url,
      evidence2:    ev2,
      evidence2_url: ev2url,
      evidence3:    ev3,
      evidence3_url: ev3url,
      evidence4:    ev4,
      evidence4_url: ev4url,
      last_updated: lastUpdated,
    });
  }

  let noDeputyCount = 0;
  for (const region of constituencies) {
    const list = candidatesMap[region.name] || [];
    if (!list.some(c => c.current_mp)) {
      noDeputyCount++;
      console.warn(`  [NO DEPUTY] "${region.name}" — no candidate marked CurrentMP='C'`);
    }
  }
  if (noDeputyCount) console.warn(`${noDeputyCount} region(s) had no sitting deputy marked`);

  // ── Apply the confirmed-ratings overlay ───────────────────────────────────────
  // A confirmed rating overrides the matching (region, deputy) row's sheet grade
  // and supplies that deputy's bullets + evidence. Matched by region name + deputy
  // name (normalised, honorifics stripped) — NOT by region alone, since a region
  // can carry several confirmed ratings. If the sheet has no row for that deputy
  // yet, a new current-deputy row is added so the rating still surfaces.
  if (confirmedRatings.length) {
    let applied = 0, unmatchedRegion = 0;
    for (const r of confirmedRatings) {
      const list = candidatesMap[r.constituency];
      if (!list) { unmatchedRegion++; console.warn(`  [RATING NO REGION] "${r.constituency}" — no matching region`); continue; }

      const targetNorm = normName(stripHonorifics(r.mp_name || ''));
      const cand = list.find(c => normName(stripHonorifics(c.name)) === targetNorm);

      const bullets = Array.isArray(r.bullets) ? r.bullets : [];
      const sources = Array.isArray(r.sources) ? r.sources : [];
      const fields = {
        grade: r.grade,
        current_mp: true,
        bullet1: bullets[0] || '', bullet2: bullets[1] || '', bullet3: bullets[2] || '',
        bullet4: bullets[3] || '', bullet5: bullets[4] || '',
        evidence1: sources[0]?.title || '', evidence1_url: sources[0]?.url || '',
        evidence2: sources[1]?.title || '', evidence2_url: sources[1]?.url || '',
        evidence3: sources[2]?.title || '', evidence3_url: sources[2]?.url || '',
        evidence4: sources[3]?.title || '', evidence4_url: sources[3]?.url || '',
        last_updated: (r.updated_at || '').slice(0, 10),
      };

      if (cand) {
        Object.assign(cand, fields);
      } else {
        list.push({ name: r.mp_name || '', party: '', ...fields });
      }
      applied++;
    }
    console.log(`Supabase ratings overlay: applied to ${applied} rating(s)${unmatchedRegion ? `, ${unmatchedRegion} unmatched region(s)` : ''}`);
  }

  // ── Write output ──────────────────────────────────────────────────────────────
  writeFileSync('data.json', JSON.stringify({ constituencies, candidates: candidatesMap }));

  const total = Object.values(candidatesMap).reduce((n, c) => n + c.length, 0);
  console.log(
    `data.json written: ${constituencies.length} regions, ${total} candidates`
  );
}
