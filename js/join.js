// "Join the waitlist": every join button opens this dialog. Name, phone and email,
// then a "You're in" ticket with the gifts, an invite link that unlocks the locked gifts, and the WhatsApp community pass.
// Sending is the backend team's endpoint (WAITLIST_ENDPOINT in config.js); this file only collects and checks.
// Counting friends who joined with an invite link is the backend's job too: this page sends both codes along.
import { WAITLIST_ENDPOINT, INVITE_GIFTS } from './config.js';
import { renderGifts } from './hero.js';
import { celebrate } from './celebrate.js';

const CODE = /^[A-Za-z0-9_-]{4,40}$/;

// every visitor gets their own invite code; their invite link is this page with ?ref=<code>
function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, so a code read aloud is not misheard
  return Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => chars[b % chars.length]).join('');
}
// the code of the friend whose invite link brought this visitor here (kept for the visit, in case they move around first)
function friendCode() {
  const ref = (new URLSearchParams(location.search).get('ref') || '').trim();
  const ok = CODE.test(ref) ? ref : '';
  try {
    if (ok) sessionStorage.setItem('ap-ref', ok);
    return ok || sessionStorage.getItem('ap-ref') || '';
  } catch { return ok; }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// with no endpoint set, the form may only pretend to send on a preview address
const PREVIEW = !WAITLIST_ENDPOINT && /^(localhost|127\.0\.0\.1)$|\.vercel\.app$/.test(location.hostname);

// People type numbers many ways: "+91 98765 43210", "0091-98765-43210", "098765 43210", "(+44) 07700 900123".
// Keep the national number only: drop an international prefix, the country code if repeated, and a trunk 0.
function national(raw, cc) {
  let d = raw.replace(/\D/g, '');
  const code = cc.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (raw.trim().startsWith('+') || raw.trim().startsWith('00') || d.length > (cc === '+91' || cc === '+1' ? 10 : 11)) {
    if (d.startsWith(code)) d = d.slice(code.length);
  }
  return d.replace(/^0/, '');
}

function check(f) {
  const name = f.name.value.trim().replace(/\s+/g, ' ');
  const cc = f.countryCode.value;
  const phone = national(f.phone.value, cc);
  const email = f.email.value.trim();
  const err = {};
  if (name.length < 2) err.name = 'Please enter your full name.';
  if (!phone) err.phone = 'Please enter your phone number.';
  else if (cc === '+91' && !/^[6-9]\d{9}$/.test(phone)) err.phone = 'Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.';
  else if (cc !== '+91' && (phone.length < 6 || phone.length > 12)) err.phone = 'Please check your phone number.';
  if (!email) err.email = 'Please enter your email.';
  else if (!EMAIL.test(email)) err.email = 'That email doesn’t look right.';
  return { data: { name, countryCode: cc, phone, phoneE164: cc + phone, email }, err };
}

export function initJoin({ reduced, getLenis }) {
  const dlg = document.querySelector('[data-join-dialog]');
  if (!dlg) return;
  const $ = (s) => dlg.querySelector(s);
  const $$ = (s) => [...dlg.querySelectorAll(s)];
  const form = $('[data-join-form]');
  const done = $('[data-join-done]');
  const alertEl = $('[data-join-alert]');
  const submit = $('[data-join-submit]');
  const label = $('[data-join-label]');
  const pass = $('[data-pass]');
  const passName = $('[data-pass-name]');
  const passLabel = $('[data-pass-label]');
  const root = document.documentElement;
  renderGifts($('[data-gifts]'));
  const referredBy = friendCode();
  let inviteCode = newCode();
  $('[data-invite-title]').textContent = `Unlock ${INVITE_GIFTS.length} more gift${INVITE_GIFTS.length > 1 ? 's' : ''}`;
  $('[data-invite-gifts]').innerHTML = INVITE_GIFTS.map((g) => `<li><em>${g.friends} friend${g.friends > 1 ? 's' : ''}</em><span></span></li>`).join('');
  $$('[data-invite-gifts] span').forEach((sp, i) => { sp.textContent = INVITE_GIFTS[i].gift; });
  $('[data-pass-date]').textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  let source = 'hero';
  let opener = null;
  function openDialog(from, trigger) {
    source = from || 'page';
    opener = trigger;
    if (dlg.open) return;
    dlg.showModal();
    root.classList.add('join-open');
    getLenis()?.stop();
    if (!dlg.classList.contains('is-done')) setTimeout(() => form.name.focus(), reduced ? 0 : 60);
  }
  dlg.addEventListener('close', () => {
    root.classList.remove('join-open');
    getLenis()?.start();
    opener?.focus({ preventScroll: true });
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-join]');
    if (!a) return;
    e.preventDefault();
    openDialog(a.dataset.join, a);
  });
  dlg.querySelectorAll('[data-join-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  // a click on the dimmed page around the card closes it
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  // the name prints onto the ticket as it is typed
  const stripName = $('[data-strip-name]');
  form.name.addEventListener('input', () => {
    const v = form.name.value.trim();
    passName.textContent = v || 'Your name here';
    stripName.textContent = v || 'Your name here';
    pass.classList.toggle('has-name', !!v);
    stripName.parentElement.classList.toggle('has-name', !!v);
  });
  // on phones the keyboard takes half the screen: keep the field being typed in visible
  form.addEventListener('focusin', (e) => {
    if (!matchMedia('(max-width: 760px)').matches) return;
    setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }), 300);
  });

  // the community pass: tearing it off opens WhatsApp (the link itself opens the new tab, so nothing blocks it)
  const tear = $('[data-tear]');
  tear.addEventListener('click', () => {
    if (tear.classList.contains('is-torn')) return;
    tear.classList.add('is-torn');
    pass.classList.add('is-torn');
    try { navigator.vibrate?.([10, 30, 22]); } catch { /* not supported */ }
    $('[data-next-hint]').hidden = true;
    $('[data-next-done]').hidden = false;
    setTimeout(() => { tear.hidden = true; }, reduced ? 0 : 950);
  });

  let tried = false;
  function show(err) {
    ['name', 'phone', 'email'].forEach((k) => {
      const fld = $(`[data-fld="${k}"]`);
      fld.classList.toggle('is-bad', !!err[k]);
      form[k].setAttribute('aria-invalid', err[k] ? 'true' : 'false');
      $(`#jn-${k}-err`).textContent = err[k] || '';
    });
  }
  form.addEventListener('input', () => { if (tried) show(check(form).err); });
  form.countryCode.addEventListener('change', () => { if (tried) show(check(form).err); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-busy')) return;
    tried = true;
    alertEl.textContent = '';
    const { data, err } = check(form);
    show(err);
    const bad = ['name', 'phone', 'email'].find((k) => err[k]);
    if (bad) { form[bad].focus(); return; }

    form.classList.add('is-busy');
    submit.setAttribute('aria-busy', 'true');
    label.textContent = 'Saving your spot…';
    try {
      if (WAITLIST_ENDPOINT) {
        const utm = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => k.startsWith('utm_')));
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source, inviteCode, referredBy, ...utm }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.status === 409) {
          show({ email: 'This email is already on the waitlist.' });
          form.email.focus();
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        // the backend may hand out its own invite code
        const out = await res.json().catch(() => null);
        if (out && typeof out.inviteCode === 'string' && CODE.test(out.inviteCode)) inviteCode = out.inviteCode;
      } else if (PREVIEW) {
        // preview: nothing is sent
        await new Promise((r) => setTimeout(r, reduced ? 0 : 700));
      } else {
        throw new Error('no endpoint');
      }
      success(data);
    } catch {
      alertEl.textContent = 'We couldn’t save your details. Nothing was sent. Please check your connection and try again.';
    } finally {
      form.classList.remove('is-busy');
      submit.removeAttribute('aria-busy');
      label.textContent = 'Join the waitlist';
    }
  });

  // the invite: the phone's own share sheet where there is one, otherwise WhatsApp with the message ready
  const share = $('[data-invite-share]');
  const copy = $('[data-invite-copy]');
  const linkEl = $('[data-invite-link]');
  let inviteUrl = '';
  const inviteText = 'I just joined the Autoplaced waitlist. It finds jobs that fit you, tailors your resume for each one and applies for you. Free to join, with free gifts for joining. Join with my link:';
  function setInvite() {
    inviteUrl = `${location.origin}${location.pathname}?ref=${encodeURIComponent(inviteCode)}`;
    linkEl.textContent = inviteUrl.replace(/^https?:\/\//, '');
    share.href = `https://wa.me/?text=${encodeURIComponent(`${inviteText} ${inviteUrl}`)}`;
  }
  share.addEventListener('click', async (e) => {
    if (!navigator.share) return; // the link itself opens WhatsApp
    e.preventDefault();
    try { await navigator.share({ title: 'Autoplaced', text: inviteText, url: inviteUrl }); } catch { /* closed without sharing */ }
  });
  let copyTimer = 0;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      copy.textContent = 'Copied';
    } catch {
      // no clipboard access: select the link so it can be copied by hand
      const range = document.createRange();
      range.selectNodeContents(linkEl);
      const sel = getSelection();
      sel.empty();
      sel.addRange(range);
      copy.textContent = 'Link selected';
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copy.textContent = 'Copy link'; }, 2400);
  });

  function success(data) {
    setInvite();
    const first = data.name.split(' ')[0];
    passName.textContent = data.name;
    pass.classList.add('has-name');
    passLabel.textContent = 'Unlocked';
    $('[data-done-name]').textContent = `${first}.`;
    form.hidden = true;
    done.hidden = false;
    dlg.classList.add('is-done');
    // the ticket prints its tear-off community pass
    tear.hidden = false;
    pass.classList.add('has-tear');
    $('[data-done-title]').focus();
    // the ticket lifts into the sky, and the moment is celebrated
    setTimeout(() => celebrate({ canvas: dlg.querySelector('[data-confetti]'), from: pass, reduced }), reduced ? 0 : 420);
  }
}
