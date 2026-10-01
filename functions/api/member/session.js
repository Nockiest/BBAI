// functions/api/member/session.js
// GET /api/member/session[?constituency=&mp_name=]
// Returns the current member session, if any: { authenticated: false } when
// there's no valid session (the scorecard page uses this to decide whether to
// show the login step or the edit form). When BOTH `constituency` and `mp_name`
// are given (a region can hold several deputies, so constituency alone doesn't
// identify one) and the member already has a pending submission for that
// deputy, it's returned too — so resubmitting (which replaces the pending row,
// see member-submissions/create.js) can prefill the form with what they last
// proposed instead of the live rating.

import { requireMember, makeSupabase, json } from '../../../lib/member-auth.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const member = await requireMember(context);
  if (!member) return json({ authenticated: false });

  const result = {
    authenticated: true,
    first_name:    member.first_name,
    constituency:  member.constituency,
  };

  const url = new URL(context.request.url);
  const constituency = (url.searchParams.get('constituency') || '').trim();
  const mpName       = (url.searchParams.get('mp_name') || '').trim();
  if (constituency && mpName) {
    const supabase = makeSupabase(context.env);
    if (supabase) {
      const { data: pending } = await supabase
        .from('member_submissions')
        .select('id, proposed_grade, bullets, sources, note, created_at')
        .eq('member_id', member.id)
        .eq('constituency', constituency)
        .eq('mp_name', mpName)
        .eq('status', 'pending')
        .maybeSingle();
      if (pending) result.pending_submission = pending;
    }
  }

  return json(result, 200, { 'Cache-Control': 'no-store' });
}
