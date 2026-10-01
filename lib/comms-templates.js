// lib/comms-templates.js
// Single source of truth for every transactional email BBAI sends automatically.
//
// Member-facing emails/pages (sign-up confirm, details-update confirm, member
// login, member submission confirmed/rejected, the resubmit screen) are in
// Czech — this is a public voter-pledge site. Admin-facing emails (the admin
// login link, the "new member submission" admin notify) and the partner-export
// feature are left in English for now, matching /goldenpath.html (the admin
// review tool itself), which is still English-only internal tooling.
//
// Both the live senders and the admin "Communications" viewer import from here,
// so the Golden Path preview always shows exactly what actually goes out. To
// change an email, edit its builder below — nothing else needs to change. To add
// a new automatic comm in future, add its builder and a COMMS entry, and it
// appears in the viewer automatically.
//
// Senders that use these:
//   • functions/api/pledge.js        → confirmationEmailHTML, updateEmailHTML
//   • functions/api/admin/login.js   → loginEmailHTML
// Viewer that renders previews from them:
//   • functions/api/admin/comms.js   → COMMS (GET, admin-only)

import { escapeHTML } from './email.js';

// ── Subjects (kept here so the viewer and the senders share one string) ───────
export const SUBJECTS = {
  signupConfirm:     'Potvrďte svůj slib BBAI',
  detailsUpdate:     'Potvrďte aktualizaci svých údajů u BBAI',
  adminLogin:        'Your BBAI review-page login link',
  memberLogin:       'Odkaz pro úpravu hodnocení BBAI',
  memberConfirmed:   'Váš návrh úpravy hodnocení byl zveřejněn',
  memberRejected:    'Aktualizace k vašemu návrhu úpravy hodnocení',
};

// ── Email bodies ──────────────────────────────────────────────────────────────
// Sent immediately after someone signs the pledge (double opt-in). They are not
// counted as a signatory until they click the link.
export function confirmationEmailHTML(firstName, confirmUrl) {
  const name = escapeHTML(firstName);
  const url = escapeHTML(confirmUrl);
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>Dobrý den, ${name},</p>
      <p>potvrďte prosím svou e-mailovou adresu, aby byl váš slib BBAI platný:</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#CC1133;color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Potvrdit e-mail</a>
      </p>
      <p style="font-size:13px;color:#666;">Nebo zkopírujte tento odkaz do prohlížeče:<br>${url}</p>
      <p style="font-size:13px;color:#666;">Pokud jste slib za bezpečnou AI nepodepsal/a, tento e-mail můžete bez obav ignorovat.</p>
    </div>`;
}

// Sent when an already-confirmed signatory re-submits the pledge form with
// changed details. The edit is staged and only applied once this link is clicked.
export function updateEmailHTML(firstName, confirmUrl) {
  const name = escapeHTML(firstName);
  const url = escapeHTML(confirmUrl);
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>Dobrý den, ${name},</p>
      <p>obdrželi jsme aktualizované údaje k vašemu slibu BBAI. Potvrďte prosím změnu, aby se projevila:</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#CC1133;color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Potvrdit aktualizované údaje</a>
      </p>
      <p style="font-size:13px;color:#666;">Nebo zkopírujte tento odkaz do prohlížeče:<br>${url}</p>
      <p style="font-size:13px;color:#666;">Pokud jste o tuto změnu nežádal/a, tento e-mail můžete bez obav ignorovat – vaše údaje zůstanou beze změny.</p>
    </div>`;
}

// Sent to the fixed BBAI admin address when someone requests access to the
// MP-rating review page (Golden Path).
export function loginEmailHTML(verifyUrl) {
  const url = escapeHTML(verifyUrl);
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>Here is your one-time link to open the BBAI MP-rating review page:</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#CC1133;color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Open the review page</a>
      </p>
      <p style="font-size:13px;color:#666;">Or copy this link into your browser:<br>${url}</p>
      <p style="font-size:13px;color:#666;">This link expires in 15 minutes and can only be used once. If you did not request it, you can safely ignore this email.</p>
    </div>`;
}

// ── Member scorecard-edit flow (functions/api/member/*, functions/api/member-submissions/*) ──
// Sent to a confirmed signatory's own inbox when they ask to log in from the
// scorecard to propose an edit to their deputy's rating. Never sent anywhere the
// address doesn't already belong to (see lib/member-auth.js).
export function memberLoginEmailHTML(verifyUrl) {
  const url = escapeHTML(verifyUrl);
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>Zde je váš jednorázový odkaz pro návrh úpravy hodnocení BBAI vašeho poslance či poslankyně:</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#CC1133;color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Pokračovat na formulář úpravy</a>
      </p>
      <p style="font-size:13px;color:#666;">Nebo zkopírujte tento odkaz do prohlížeče:<br>${url}</p>
      <p style="font-size:13px;color:#666;">Odkaz vyprší za 15 minut a lze ho použít jen jednou. Pokud jste o něj nežádal/a, tento e-mail můžete bez obav ignorovat.</p>
    </div>`;
}

// Sent when an admin confirms a signatory's suggested edit on /goldenpath.html.
// `amended` distinguishes "published exactly as you wrote it" from "published,
// but a reviewer changed some of it first" so the signatory isn't surprised to
// see the live card differ from what they submitted.
export function memberSubmissionConfirmedHTML(memberName, mpName, amended) {
  const name = escapeHTML(memberName);
  const mp   = escapeHTML(mpName);
  const body = amended
    ? `Děkujeme za návrh – recenzent ho zveřejnil v hodnocení pro ${mp}, před zveřejněním ho ale ještě mírně upravil.`
    : `Děkujeme za návrh – byl zveřejněn v hodnocení pro ${mp} přesně tak, jak jste ho odeslal/a.`;
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>Dobrý den, ${name},</p>
      <p>${body}</p>
      <p style="font-size:13px;color:#666;">Děkujeme, že pomáháte udržovat hodnocení přesné – další úpravu můžete navrhnout kdykoli, jakmile se něco změní.</p>
    </div>`;
}

// Sent when an admin rejects a signatory's suggested edit. `reason` is an
// optional free-text note the reviewer can add; kept short and non-technical
// since it's shown verbatim to the signatory.
export function memberSubmissionRejectedHTML(memberName, mpName, reason) {
  const name = escapeHTML(memberName);
  const mp   = escapeHTML(mpName);
  const reasonBlock = reason
    ? `<p>Poznámka recenzenta: <em>${escapeHTML(reason)}</em></p>`
    : '';
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>Dobrý den, ${name},</p>
      <p>děkujeme za návrh úpravy hodnocení pro ${mp}. Recenzent se na něj podíval, ale tentokrát se rozhodl ho nezveřejnit.</p>
      ${reasonBlock}
      <p style="font-size:13px;color:#666;">Další úpravu můžete navrhnout kdykoli – například s dalšími zdroji, nebo až se něco změní.</p>
    </div>`;
}

// Sent to the fixed BBAI admin address whenever a member submits (or replaces)
// an edit, so it doesn't sit unseen until someone happens to open Golden Path.
export function newMemberSubmissionSubject(mpName, constituency) {
  return `New member submission — ${mpName} (${constituency})`;
}

export function newMemberSubmissionAdminHTML(memberName, mpName, constituency, reviewUrl) {
  const name = escapeHTML(memberName);
  const mp   = escapeHTML(mpName);
  const cons = escapeHTML(constituency);
  const url  = escapeHTML(reviewUrl);
  return `
    <div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0;text-align:left;">
      <p>${name} suggested an edit to the BBAI scorecard rating for ${mp} (${cons}).</p>
      <p style="margin:28px 0;">
        <a href="${url}" style="background:#CC1133;color:#ffffff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Review on Golden Path</a>
      </p>
    </div>`;
}

// ── Partner newsletter export (functions/api/partners/export.js) ──────────────
// The daily email to configured partner distributions: the new opted-in
// signatories not yet shared, as a readable table plus a copyable CSV, with a
// provenance/consent header. Kept here so both the live sender and the Golden
// Path Communications preview render from this one source. Disabled unless
// PARTNER_EXPORT_EMAILS is set (see .dev.vars.example) — left in English since
// it's an admin/operator-configured feature, not public-facing copy.

// One CSV field, RFC-4180 quoted: wrap in quotes and double any internal quote
// when the value contains a comma, quote or newline.
function csvField(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function partnerExportCsv(members) {
  const lines = ['First name,Last name,Email'];
  for (const m of members) {
    lines.push([csvField(m.first_name), csvField(m.last_name), csvField(m.email)].join(','));
  }
  return lines.join('\n');
}

export function partnerExportSubject(count, dateLabel) {
  return `BBAI — ${count} new signator${count === 1 ? 'y' : 'ies'} — ${dateLabel}`;
}

export function partnerExportHTML(members, dateLabel) {
  const csv = partnerExportCsv(members);
  const rows = members.map(m => `
    <tr>
      <td style="padding:4px 12px 4px 0;">${escapeHTML(m.first_name)} ${escapeHTML(m.last_name)}</td>
      <td style="padding:4px 12px 4px 0;">${escapeHTML(m.email)}</td>
    </tr>`).join('');

  // Provenance / consent header — makes the partner's own GDPR Article 14 duty
  // (telling recipients where their data came from) trivial to meet.
  return `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#111;line-height:1.5;">
  <p><strong>BBAI signatory list — ${escapeHTML(dateLabel)}</strong></p>
  <p style="background:#f4f6fb;border:1px solid #d9e0ef;border-radius:6px;padding:10px 12px;">
    These ${members.length} contact${members.length === 1 ? '' : 's'} were collected by Blok bezpečné AI
    (bbai.pauseai.cz) under explicit opt-in consent to receive AI safety news from this partner
    organisation. Source: BBAI pledge sign-up. Each person has confirmed their email address
    (double opt-in) and can withdraw at any time.
  </p>
  <table style="border-collapse:collapse;margin:12px 0;">
    <thead><tr>
      <th style="text-align:left;padding:4px 12px 4px 0;border-bottom:1px solid #ccc;">Name</th>
      <th style="text-align:left;padding:4px 12px 4px 0;border-bottom:1px solid #ccc;">Email</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:16px;">CSV (select and copy for bulk import):</p>
  <pre style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;padding:12px;overflow:auto;font-size:13px;white-space:pre;">${escapeHTML(csv)}</pre>
</div>`;
}

// ── Resubmission screen (on pledge.html) ──────────────────────────────────────
// The on-page message an already-confirmed signatory sees after re-submitting
// the pledge form with changed details: their edit is staged and a confirm link
// emailed. Mirrors the update-confirmation state of the #successCard on
// pledge.html, rendered self-contained (inline styles) so the preview shows
// correctly in the scriptless Communications iframe without the site stylesheet.
export function resubmitScreenHTML(email) {
  const addr = escapeHTML(email);
  return `<div style="font-family:system-ui,Arial,sans-serif;background:#fbfaf7;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e4dd;border-radius:26px;box-shadow:0 6px 18px rgba(0,0,0,.06);overflow:hidden;">
    <div style="text-align:center;padding:48px 24px;">
      <div style="font-size:56px;margin-bottom:16px;">✉️</div>
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;margin:0 0 10px;color:#1a1a2e;">Už to skoro máte, zkontrolujte e-mail</h2>
      <p style="font-size:18px;color:#6b6b76;margin:0;line-height:1.5;">
        Svůj slib jste už podepsal/a dříve, proto jsme na adresu ${addr} poslali potvrzovací odkaz. Vaše údaje
        aktualizujeme, jakmile na něj kliknete. Pokud e-mail nedorazil, zkontrolujte spam, nebo podepište
        slib znovu a získáte nový odkaz.
      </p>
    </div>
  </div>
</div>`;
}

// ── Sample values for previews ────────────────────────────────────────────────
// The dynamic parts of each email, filled with example data so the viewer can
// render a realistic preview without any real member or token.
export const SAMPLE = {
  firstName:  'Jana',
  email:      'jana.novakova@example.com',
  confirmUrl: 'https://bbai.pauseai.cz/api/confirm?token=EXAMPLE-TOKEN',
  verifyUrl:  'https://bbai.pauseai.cz/api/admin/verify?token=EXAMPLE-TOKEN',
  memberVerifyUrl: 'https://bbai.pauseai.cz/api/member/verify?token=EXAMPLE-TOKEN',
  mpName:     'Petr Svoboda',
  constituency: 'Praha',
  reviewUrl:  'https://bbai.pauseai.cz/goldenpath.html',
  rejectReason: 'Thanks for this — the bullet about the open letter needs a source link before we can publish it.',
  // Example rows for the partner-export preview when nothing is queued.
  partnerMembers: [
    { first_name: 'Jana',  last_name: 'Nováková', email: 'jana.novakova@example.com' },
    { first_name: 'Petr',  last_name: 'Svoboda',  email: 'petr.svoboda@example.com' },
    { first_name: 'Eva',   last_name: 'Dvořáková', email: 'eva.dvorakova@example.com' },
  ],
};

// ── Catalogue used by the admin Communications viewer ─────────────────────────
// Order here is the order shown in the tab. `editPath` names the file to edit
// to change the item permanently — the viewer surfaces it in the source pane.
export const COMMS = [
  {
    id: 'signup-confirm',
    name: 'Sign-up confirmation',
    kind: 'email',
    trigger: 'Sent as soon as someone signs the pledge. They must click the link before they are counted as a member (double opt-in).',
    fields: ['First name', 'Confirmation link'],
    subject: SUBJECTS.signupConfirm,
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => confirmationEmailHTML(s.firstName, s.confirmUrl),
  },
  {
    id: 'details-update',
    name: 'Details-update confirmation',
    kind: 'email',
    trigger: 'Sent when an existing, already-confirmed member re-submits the pledge form with changed details. The edit is only applied once they click the link.',
    fields: ['First name', 'Confirmation link'],
    subject: SUBJECTS.detailsUpdate,
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => updateEmailHTML(s.firstName, s.confirmUrl),
  },
  {
    id: 'resubmit-screen',
    name: 'Resubmission screen',
    kind: 'page',
    trigger: 'Shown on the pledge page when an already-confirmed member re-submits the form with changed details. Their edit is staged and a confirm link emailed (the "Details-update confirmation" above); they see this screen until they click it.',
    fields: ['Email address'],
    editPath: 'pledge.html',
    render: (s = SAMPLE) => resubmitScreenHTML(s.email),
  },
  {
    id: 'admin-login',
    name: 'Admin login link',
    kind: 'email',
    trigger: 'Sent to the fixed BBAI admin address when someone requests access to this review page (Golden Path).',
    fields: ['Login link'],
    subject: SUBJECTS.adminLogin,
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => loginEmailHTML(s.verifyUrl),
  },
  {
    id: 'member-login',
    name: 'Member scorecard-edit login link',
    kind: 'email',
    trigger: 'Sent to a confirmed member\'s own inbox when they ask (from a card on the scorecard) to log in and suggest an edit to their MP\'s rating. Only sent when the typed email matches an existing confirmed member.',
    fields: ['Login link'],
    subject: SUBJECTS.memberLogin,
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => memberLoginEmailHTML(s.memberVerifyUrl),
  },
  {
    id: 'member-submission-confirmed',
    name: 'Member edit — confirmed',
    kind: 'email',
    trigger: 'Sent to the member when an admin confirms their suggested MP-rating edit on Golden Path. Wording differs depending on whether the admin changed anything before publishing.',
    fields: ['First name', 'MP name', 'Amended (yes/no)'],
    subject: SUBJECTS.memberConfirmed,
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => memberSubmissionConfirmedHTML(s.firstName, s.mpName, true),
  },
  {
    id: 'member-submission-rejected',
    name: 'Member edit — rejected',
    kind: 'email',
    trigger: 'Sent to the member when an admin rejects their suggested MP-rating edit on Golden Path, with an optional reviewer note.',
    fields: ['First name', 'MP name', 'Reviewer note (optional)'],
    subject: SUBJECTS.memberRejected,
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => memberSubmissionRejectedHTML(s.firstName, s.mpName, s.rejectReason),
  },
  {
    id: 'member-submission-admin-notify',
    name: 'New member submission (to admin)',
    kind: 'email',
    trigger: 'Sent to the fixed BBAI admin address whenever a member submits or replaces a suggested MP-rating edit, so it doesn\'t sit unseen until Golden Path is next opened.',
    fields: ['Member first name', 'MP name', 'Constituency', 'Golden Path link'],
    subject: newMemberSubmissionSubject(SAMPLE.mpName, SAMPLE.constituency),
    editPath: 'lib/comms-templates.js',
    render: (s = SAMPLE) => newMemberSubmissionAdminHTML(s.firstName, s.mpName, s.constituency, s.reviewUrl),
  },
];

// ── Pages shown alongside the emails ─────────────────────────────────────────
// Not emails, but part of the same confirmation flow: the web page a member
// lands on after clicking a link in one of the emails above. Its content is the
// live .html file itself — the viewer reads that file (via the Pages ASSETS
// binding) so the preview can never drift from what is actually served. Because
// the preview iframe runs no scripts, the page shows in its confirmed
// ("success") state, which is the default markup; the same page also handles
// the invalid- and error-link states via its own script at runtime.
export const PAGES = [
  {
    id: 'confirm-page',
    name: 'Email-confirmation page',
    kind: 'page',
    trigger: 'The page people land on after clicking the confirm link in their sign-up or details-update email. Shown here in its confirmed state; the same page also handles invalid or expired links.',
    fields: ['Constituency scorecard link', 'AI-safety-news line (only when opted in)'],
    // Where the live page is served, and the file to edit to change it.
    path: 'confirmed.html',
    previewUrl: '/confirmed.html?status=ok',
    editPath: 'confirmed.html',
  },
];
