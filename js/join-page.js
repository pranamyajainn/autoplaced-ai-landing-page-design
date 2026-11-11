// The /join page: the form prints a founding pass, box 1 opens, and friends who join with the
// person's invite link open boxes 2 to 6. The backend owns saving, Google sign-in and counting
// friends (see config.js). With no backend set, the page runs as a preview (localhost, *.vercel.app).
import { mountBots } from './bot.js';
import { celebrate } from './celebrate.js';
import { WHATSAPP_COMMUNITY_URL, WAITLIST_ENDPOINT, GOOGLE_SIGNIN_URL, STATE_ENDPOINT, OFFER_ENDS, GIFT_BOXES } from './config.js';

const root = document.documentElement;
root.classList.add('js');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

mountBots();
$$('[data-wa]').forEach((a) => { a.href = WHATSAPP_COMMUNITY_URL; });

// with no backend, the page may only pretend on a preview address
const PREVIEW = !WAITLIST_ENDPOINT && /^(localhost|127\.0\.0\.1)$|\.vercel\.app$/.test(location.hostname);
// buttons to add a friend or start again: hidden, unless a preview address is opened with ?preview=1 (for demos)
const SHOW_DEMO = PREVIEW && new URLSearchParams(location.search).get('preview') === '1';
const CODE = /^[A-Za-z0-9_-]{4,40}$/;
const PASS_KEY = 'ap-pass';
const REF_KEY = 'ap-ref';
const PRINT_KEY = 'ap-print';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};

// the friend whose invite link brought this person here, kept until they join
const q = new URLSearchParams(location.search);
{
  const ref = (q.get('ref') || '').trim();
  if (CODE.test(ref)) { try { localStorage.setItem(REF_KEY, ref); } catch { /* storage blocked */ } }
}
const referredBy = () => { try { const r = localStorage.getItem(REF_KEY) || ''; return CODE.test(r) ? r : ''; } catch { return ''; } };
const source = /^[a-z-]{1,24}$/.test(q.get('from') || '') ? q.get('from') : 'direct';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, so a code read aloud is not misheard
  return Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => chars[b % chars.length]).join('');
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const boxNo = (i) => pad(i + 1);
const openedFor = (friends) => GIFT_BOXES.filter((b) => friends >= b.friends).length;
const fmtDate = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// "an SDE 3 role", "a Product Manager role", "an FDE role"
function article(word) {
  if (/^[aeiou]/i.test(word) && !/^(uni|use|eu)/i.test(word)) return 'an';
  if (/^[A-Z0-9]{2,}\b/.test(word) && /^[AEFHILMNORSX8]/.test(word)) return 'an';
  return 'a';
}
function dreamLine(role, company) {
  if (role && company) return `Manifesting ${article(role)} <i>${esc(role)}</i> role at <i>${esc(company)}</i>`;
  if (role) return `Manifesting ${article(role)} <i>${esc(role)}</i> role`;
  if (company) return `Manifesting a role at <i>${esc(company)}</i>`;
  return '';
}

/* ---------------- elements ---------------- */
const jp = $('[data-jp]');
const form = $('[data-form]');
const f = { name: $('#jp-name'), cc: $('#jp-cc'), phone: $('#jp-phone'), role: $('#jp-role'), co: $('#jp-co') };
const submit = $('[data-submit]');
const submitLabel = $('[data-submit-label]');
const alertEl = $('[data-alert]');
const fpass = $('[data-fpass]');
const card = $('[data-fpass-card]');
const P = {
  name: $('[data-p-name]'), dream: $('[data-p-dream]'), since: $('[data-p-since]'), no: $('[data-p-no]'), code: $('[data-p-code]'),
  bars: $('[data-p-bars]'), perksTitle: $('[data-p-perks-title]'), perks: $('[data-p-perks]'), status: $('[data-p-status]'), boxes: $('[data-p-boxes]'),
};
const boxesWrap = $('[data-boxes-wrap]');
const boxList = $('[data-boxes]');
const toast = $('[data-toast]');

let S = null; // the person once they have joined: { name, memberNo, inviteCode, friends, joinedAt, dreamRole, dreamCompany, waitlistCount }

/* ---------------- the six gift boxes ---------------- */
const LOCK = '<svg width="13" height="13" aria-hidden="true"><use href="#i-lock"/></svg>';
const BOX_ART = `<svg class="gb__svg" viewBox="0 0 64 60" aria-hidden="true">
  <ellipse class="gb__shadow" cx="32" cy="56" rx="23" ry="3.2"/>
  <i></i>
  <rect class="gb__body" x="10" y="25" width="44" height="29" rx="4.5"/>
  <rect class="gb__rib" x="28.5" y="25" width="7" height="29"/>
  <text class="gb__q" x="18.5" y="46">?</text><text class="gb__q gb__q--b" x="44" y="45">?</text>
  <g class="gb__lid">
    <path class="gb__bow" d="M32 16c-4-8-14-11-15-5-.6 4 7 6 15 5zm0 0c4-8 14-11 15-5 .6 4-7 6-15 5z"/>
    <rect class="gb__lidc" x="6.5" y="15.5" width="51" height="11" rx="3.5"/>
    <rect class="gb__rib" x="28.5" y="15.5" width="7" height="11"/>
  </g>
</svg>`.replace('<i></i>', '');
function renderBoxes() {
  const joined = !!S;
  const friends = joined ? S.friends : 0;
  const opened = joined ? openedFor(friends) : 0;
  const next = joined && opened < GIFT_BOXES.length ? opened : -1;
  boxList.innerHTML = GIFT_BOXES.map((b, k) => {
    const isOpen = k < opened;
    const isNext = k === next;
    let kind = 'locked';
    let sub = `Unlocks with ${plural(b.friends, 'friend', 'friends')}`;
    if (isOpen) { kind = 'open'; sub = b.sub; }
    else if (!joined && k === 0) { kind = 'first'; sub = 'Opens when you join'; }
    else if (isNext) { kind = 'next'; const need = b.friends - friends; sub = `Next up · ${plural(need, 'more friend', 'more friends')}`; }
    const title = isOpen || k === 0 ? b.title : 'Mystery reward';
    return `<li class="gb gb--${kind}" style="--i:${k}" data-box="${k}">
      <span class="gb__art">${BOX_ART}${isOpen ? '' : `<span class="gb__lock">${LOCK}</span>`}</span>
      <span class="gb__n">Box ${boxNo(k)}</span>
      <b class="gb__t">${esc(title)}</b>
      <span class="gb__s">${esc(sub)}</span>
      <span class="sr-only">${isOpen ? 'Opened.' : 'Locked.'}</span>
    </li>`;
  }).join('');
  const locked = GIFT_BOXES.length - opened;
  $('[data-locked-pill]').textContent = locked ? `${locked} still locked` : 'All open';
  $('[data-boxes-eyebrow]').textContent = joined ? `Gift boxes opened · ${opened}/${GIFT_BOXES.length}` : `Your gift boxes · 0/${GIFT_BOXES.length} opened`;
}

/* ---------------- the pass ---------------- */
function bars(seed) {
  let r = seed || 1;
  let html = '';
  for (let i = 0; i < 34; i++) { r = (Math.imul(r, 1103515245) + 12345) >>> 0; html += `<i style="--w:${1 + (r % 3)}px;--g:${1 + ((r >> 4) % 3)}px"></i>`; }
  return html;
}
function perksFor(opened) {
  const list = [];
  for (let j = 0; j < Math.max(1, opened); j++) GIFT_BOXES[j].perks.forEach((p) => list.push({ p, from: `From box ${boxNo(j)}` }));
  return list;
}
function paintPass() {
  const joined = !!S;
  const name = joined ? S.name : f.name.value.trim().replace(/\s+/g, ' ');
  const role = joined ? S.dreamRole : f.role.value.trim();
  const co = joined ? S.dreamCompany : f.co.value.trim();
  P.name.textContent = name || 'Your name here';
  fpass.classList.toggle('has-name', !!name);
  const line = dreamLine(role, co);
  P.dream.innerHTML = line;
  P.dream.hidden = !line;
  if (!joined) {
    P.since.textContent = 'Not issued yet';
    P.no.textContent = '#····';
    P.code.textContent = 'AP-FND-····-····';
    P.bars.innerHTML = bars(hash(name || 'autoplaced'));
    P.perksTitle.textContent = 'Unlocks when you join';
    P.status.textContent = 'Not issued';
    P.boxes.textContent = `0/${GIFT_BOXES.length}`;
    card.setAttribute('aria-label', 'Preview of your founding pass');
  } else {
    const no = pad(S.memberNo, 4);
    P.since.textContent = `Member since ${fmtDate(S.joinedAt)}`;
    P.no.textContent = `#${no}`;
    P.code.textContent = `AP-FND-${no}-${S.inviteCode.slice(0, 4).toUpperCase()}`;
    P.bars.innerHTML = bars(hash(S.inviteCode));
    P.perksTitle.textContent = 'On your pass';
    P.status.textContent = 'On the waitlist';
    P.boxes.textContent = `${openedFor(S.friends)}/${GIFT_BOXES.length}`;
    card.setAttribute('aria-label', `Founding pass for ${S.name}, member number ${no}`);
  }
  const perks = perksFor(joined ? openedFor(S.friends) : 1);
  P.perks.innerHTML = perks.map((x, i) => `<li style="--i:${i}"><span class="fpass__tick" aria-hidden="true"></span><span>${esc(x.p)}<small>${x.from}</small></span></li>`).join('');
}

/* ---------------- after joining ---------------- */
const inviteUrl = () => `${location.origin}/join?ref=${encodeURIComponent(S.inviteCode)}`;
function shareText() {
  return `I just got my Autoplaced founding pass (#${pad(S.memberNo, 4)}). It finds jobs that fit you and tailors your resume for each one. Join the waitlist with my link and get your own pass: ${inviteUrl()}`;
}
function paintAfter() {
  const opened = openedFor(S.friends);
  const total = GIFT_BOXES.length;
  const next = opened < total ? opened : -1;
  $('[data-first]').textContent = `${S.name.split(' ')[0]}.`;
  $('[data-member-line]').textContent = `Founding member #${pad(S.memberNo, 4)} · You're on the waitlist`;
  $('[data-left-line]').textContent = next >= 0 ? `Now open ${plural(total - opened, 'more box', 'more boxes')}.` : 'Every box is open. You are a founding legend.';
  $('[data-share-title]').textContent = next >= 0 ? `Share to unlock box ${boxNo(next)}` : `All ${total} boxes are open. Legend.`;

  // progress towards the next box, one segment per friend needed
  const prevNeed = next > 0 ? GIFT_BOXES[next - 1].friends : 0;
  const need = next >= 0 ? GIFT_BOXES[next].friends - prevNeed : 1;
  const have = next >= 0 ? S.friends - prevNeed : 1;
  $('[data-prog-label]').textContent = next >= 0 ? `Friends joined towards box ${boxNo(next)}` : 'Friends joined';
  $('[data-prog-count]').textContent = next >= 0 ? `${have}/${need}` : String(S.friends);
  $('[data-prog-bar]').innerHTML = Array.from({ length: Math.max(1, need) }, (_, i) => `<i class="${i < have ? 'is-on' : ''}"></i>`).join('');

  const url = inviteUrl();
  const text = shareText();
  const enc = encodeURIComponent;
  const links = {
    whatsapp: `https://wa.me/?text=${enc(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    'linkedin-pass': `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    x: `https://twitter.com/intent/tweet?text=${enc(text)}`,
    email: `mailto:?subject=${enc('Get your Autoplaced founding pass')}&body=${enc(text)}`,
  };
  $$('[data-share]').forEach((a) => { a.href = links[a.dataset.share]; });
  $('[data-link]').textContent = url.replace(/^https?:\/\//, '');

  if (S.waitlistCount > 0) {
    $('[data-count-n]').textContent = S.waitlistCount.toLocaleString('en-IN');
    $('[data-count]').hidden = false;
  }
  $('[data-demo]').hidden = !SHOW_DEMO;
}

function showView(state) {
  jp.dataset.state = state;
  $$('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== state; });
  // after joining, the boxes move up into the stage, right under the greeting
  (state === 'pass' ? $('[data-boxslot-top]') : $('[data-boxslot-bottom]')).appendChild(boxesWrap);
}

function paintAll() {
  renderBoxes();
  paintPass();
  if (S) paintAfter();
}

// the finished pass feeds out of a printer slot (CSS: .is-printing), then it is stamped and the ticks land
let printing = false;
function printPass() {
  const onEnd = (e) => { if (e.animationName === 'feed') done(); };
  const done = () => {
    card.removeEventListener('animationend', onEnd);
    if (!printing) return;
    printing = false;
    fpass.classList.add('is-issued');
    setTimeout(() => fpass.classList.remove('is-printing'), 500); // the slot fades away after the stamp
    celebrate({ canvas: $('[data-confetti]'), from: card, reduced });
  };
  printing = true;
  fpass.classList.remove('is-issued');
  if (reduced) { done(); return; }
  fpass.classList.add('is-printing');
  card.addEventListener('animationend', onEnd);
  setTimeout(done, 2600); // in case the animation event never comes
}

function issue(animate) {
  showView('pass');
  paintAll();
  if (animate) {
    // bring the printer into view, so the pass comes out where the person is looking
    const top = fpass.getBoundingClientRect().top + window.scrollY - Math.min(140, window.innerHeight * 0.16);
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    $('[data-pass-h]').focus({ preventScroll: true });
    printPass();
  } else fpass.classList.add('is-issued');
}

// the notches on the pass sit on its tear line, wherever the line falls
const notchAt = () => card.style.setProperty('--notch', `${$('.fpass__no', card).offsetTop}px`);
new ResizeObserver(notchAt).observe(card);

/* ---------------- the form ---------------- */
// People type numbers many ways: "+91 98765 43210", "0091-98765-43210", "098765 43210".
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
function check() {
  const name = f.name.value.trim().replace(/\s+/g, ' ');
  const cc = f.cc.value;
  const phone = national(f.phone.value, cc);
  const err = {};
  if (name.length < 2) err.name = 'Add your name so we can print it on your pass.';
  if (!phone) err.phone = 'Add your phone number.';
  else if (cc === '+91' && !/^[6-9]\d{9}$/.test(phone)) err.phone = 'Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.';
  else if (cc !== '+91' && (phone.length < 6 || phone.length > 12)) err.phone = 'Please check your phone number.';
  const dreamRole = f.role.value.trim().replace(/\s+/g, ' ');
  const dreamCompany = f.co.value.trim().replace(/\s+/g, ' ');
  return { data: { name, countryCode: cc, phone, phoneE164: cc + phone, dreamRole, dreamCompany }, err };
}
let tried = false;
function show(err) {
  ['name', 'phone'].forEach((k) => {
    const fld = $(`[data-fld="${k}"]`);
    fld.classList.toggle('is-bad', !!err[k]);
    f[k].setAttribute('aria-invalid', err[k] ? 'true' : 'false');
    $(`#jp-${k}-err`).textContent = err[k] || '';
  });
}
form.addEventListener('input', () => { if (tried) show(check().err); if (!S) paintPass(); });
f.cc.addEventListener('change', () => { if (tried) show(check().err); });

function googleUrl(signupId) {
  const sep = GOOGLE_SIGNIN_URL.includes('?') ? '&' : '?';
  return `${GOOGLE_SIGNIN_URL}${sep}${signupId ? `signup=${encodeURIComponent(signupId)}&` : ''}next=${encodeURIComponent('/join')}`;
}
function fromBackend(out, fallback = {}) {
  const o = out && typeof out === 'object' ? out : {};
  const joinedAt = Date.parse(o.joinedAt) || Number(o.joinedAt) || Date.now();
  return {
    name: String(o.name || fallback.name || 'Friend').slice(0, 60),
    memberNo: Math.max(1, Number(o.memberNo) || 1),
    inviteCode: CODE.test(o.inviteCode || '') ? o.inviteCode : newCode(),
    friends: Math.max(0, Math.floor(Number(o.friends) || 0)),
    joinedAt,
    dreamRole: String(o.dreamRole ?? fallback.dreamRole ?? '').slice(0, 40),
    dreamCompany: String(o.dreamCompany ?? fallback.dreamCompany ?? '').slice(0, 40),
    waitlistCount: Math.max(0, Number(o.waitlistCount) || 0),
  };
}
function busy(on, label) {
  form.classList.toggle('is-busy', on);
  submit.toggleAttribute('aria-busy', on);
  submitLabel.textContent = on ? label : 'Continue with Google';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.classList.contains('is-busy')) return;
  tried = true;
  alertEl.textContent = '';
  const { data, err } = check();
  show(err);
  const bad = ['name', 'phone'].find((k) => err[k]);
  if (bad) { f[bad].focus(); return; }

  busy(true, 'Connecting to Google…');
  let leaving = false;
  try {
    const utm = Object.fromEntries([...q].filter(([k]) => k.startsWith('utm_')));
    const body = { ...data, source, referredBy: referredBy(), ...utm };
    if (WAITLIST_ENDPOINT) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST', credentials: 'same-origin', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      clearTimeout(timer);
      // already on the list: signing in with Google brings back their pass
      if (res.status === 409 && GOOGLE_SIGNIN_URL) { leaving = true; location.assign(googleUrl('')); return; }
      if (res.status === 409) { show({ phone: 'This number is already on the waitlist.' }); f.phone.focus(); return; }
      if (!res.ok) throw new Error(String(res.status));
      const out = await res.json().catch(() => null);
      if (GOOGLE_SIGNIN_URL) {
        // the backend links the Google account to the saved form, then sends the person back here
        try { sessionStorage.setItem(PRINT_KEY, '1'); } catch { /* storage blocked */ }
        leaving = true;
        location.assign(googleUrl(out?.signupId || ''));
        return;
      }
      S = fromBackend(out, data);
    } else if (PREVIEW) {
      // preview: no data leaves the browser; the Google step is only shown
      await wait(reduced ? 0 : 900);
      S = { ...fromBackend({}, data), memberNo: 100 + (hash(data.name + data.phone) % 900) };
      store.set(PASS_KEY, S);
    } else {
      throw new Error('no endpoint');
    }
    try { localStorage.removeItem(REF_KEY); } catch { /* storage blocked */ }
    issue(true);
  } catch {
    alertEl.textContent = 'We couldn’t save your details. Nothing was sent. Please check your connection and try again.';
  } finally {
    if (!leaving) busy(false);
  }
});

/* ---------------- sharing ---------------- */
{
  const copyBtn = $('[data-copy]');
  const copyLabel = $('[data-copy-label]');
  const linkEl = $('[data-link]');
  let t = 0;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl());
      copyLabel.textContent = 'Copied!';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(linkEl);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copyLabel.textContent = 'Link selected';
    }
    clearTimeout(t);
    t = setTimeout(() => { copyLabel.textContent = 'Copy link'; }, 2400);
  });
  // phones: the share sheet, when there is one, for the WhatsApp button
  $('[data-share="whatsapp"]').addEventListener('click', async (e) => {
    if (!navigator.share || !matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    try { await navigator.share({ title: 'Autoplaced founding pass', text: shareText() }); } catch { /* closed without sharing */ }
  });
}

/* ---------------- a short note when a friend joins or a box opens ---------------- */
let toastTimer = 0;
function say(text) {
  toast.textContent = text;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3600);
}
function friendsChanged(before) {
  const a = openedFor(before);
  const b = openedFor(S.friends);
  paintAll();
  if (b > a) {
    const box = GIFT_BOXES[b - 1];
    say(`Box ${boxNo(b - 1)} opened! ${box.perks[0]} added to your pass.`);
    const li = $(`[data-box="${b - 1}"]`);
    li?.classList.add('is-pop');
  } else if (S.friends > before) {
    const nxt = GIFT_BOXES[b];
    say(nxt ? `A friend joined! ${plural(nxt.friends - S.friends, 'more', 'more')} to open box ${boxNo(b)}.` : 'A friend joined!');
  }
}

/* preview controls, only on preview addresses */
$('[data-demo-friend]').addEventListener('click', () => {
  if (!S) return;
  const before = S.friends;
  S.friends += 1;
  store.set(PASS_KEY, S);
  friendsChanged(before);
});
$('[data-demo-reset]').addEventListener('click', () => {
  store.del(PASS_KEY);
  S = null;
  fpass.classList.remove('is-issued', 'is-printing');
  form.reset();
  tried = false;
  show({});
  showView('form');
  paintAll();
  window.scrollTo({ top: 0, behavior: 'auto' });
  f.name.focus({ preventScroll: true });
});

/* ---------------- download the pass as an image ---------------- */
function loadImg(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fit(ctx, text, max, size, weight, family) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > max && s > 28) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
}
async function downloadPass() {
  if (!S) return;
  try { await document.fonts.ready; } catch { /* fonts API missing */ }
  // the card grows with the perks on it, and the image grows with the card
  const perks = perksFor(openedFor(S.friends));
  const ROW = 46;
  const STUB = 86;
  const lastPerk = 846 + (perks.length - 1) * ROW; // baseline of the last perk, from the card's top
  const x = 120;
  const y = 110;
  const w = 840;
  const h = lastPerk + 50 + STUB;
  const W = 1080;
  const H = y + h + 200;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const SANS = 'Geist, system-ui, sans-serif';
  const MONO = '"Geist Mono", ui-monospace, monospace';
  const SERIF = '"Instrument Serif", Georgia, serif';
  // the stage (painted again inside the notches, so they look cut out of the pass)
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#123a3f');
  bg.addColorStop(1, '#0b2629');
  const glow = c.createRadialGradient(W / 2, 520, 40, W / 2, 520, 620);
  glow.addColorStop(0, 'rgba(242,181,66,.32)');
  glow.addColorStop(1, 'rgba(242,181,66,0)');
  const stage = () => { c.fillStyle = bg; c.fill(); c.fillStyle = glow; c.fill(); };
  c.beginPath();
  c.rect(0, 0, W, H);
  stage();
  // the gold card
  const gold = c.createLinearGradient(x, y, x + w, y + h);
  gold.addColorStop(0, '#fde8a8');
  gold.addColorStop(0.26, '#f6c862');
  gold.addColorStop(0.46, '#e2a63a');
  gold.addColorStop(0.6, '#f8d27a');
  gold.addColorStop(1, '#eaa93a');
  c.save();
  c.shadowColor = 'rgba(0,0,0,.35)';
  c.shadowBlur = 60;
  c.shadowOffsetY = 24;
  rrect(c, x, y, w, h, 36);
  c.fillStyle = gold;
  c.fill();
  c.restore();
  // the stub at the bottom of the card
  c.save();
  rrect(c, x, y, w, h, 36);
  c.clip();
  c.fillStyle = 'rgba(74,48,0,.09)';
  c.fillRect(x, y + h - STUB, w, STUB);
  c.fillStyle = 'rgba(120,72,4,.22)';
  c.fillRect(x, y + h - STUB, w, 2);
  c.restore();
  const ink = '#2b2105';
  const brown = '#6d4a06';
  const bot = await loadImg('assets/bot.png');
  if (bot) c.drawImage(bot, x + 48, y + 44, 64, 60);
  c.fillStyle = ink;
  c.font = `650 40px ${SANS}`;
  c.fillText('autoplaced', x + 126, y + 88);
  c.textAlign = 'right';
  c.font = `500 22px ${MONO}`;
  c.fillStyle = brown;
  c.fillText('FOUNDING PASS · EST. 2026', x + w - 48, y + 84);
  c.textAlign = 'left';
  c.fillText('THIS PASS BELONGS TO', x + 48, y + 200);
  c.fillStyle = ink;
  fit(c, S.name.toUpperCase(), w - 96, 86, 700, SANS);
  c.fillText(S.name.toUpperCase(), x + 48, y + 292);
  let yy = y + 352;
  const dream = dreamLine(S.dreamRole, S.dreamCompany).replace(/<\/?i>/g, '').replace(/&amp;/g, '&');
  if (dream) {
    fit(c, dream, w - 96, 42, 'italic 400', SERIF);
    c.fillStyle = '#3d2c06';
    c.fillText(dream, x + 48, yy);
    yy += 54;
  }
  c.font = `500 26px ${SANS}`;
  c.fillStyle = '#4a3000';
  c.fillText(`Member since ${fmtDate(S.joinedAt)}`, x + 48, yy);
  // the tear line, with a notch at each end
  const tear = y + 470;
  c.strokeStyle = 'rgba(120,72,4,.4)';
  c.setLineDash([12, 10]);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x + 34, tear);
  c.lineTo(x + w - 34, tear);
  c.stroke();
  c.setLineDash([]);
  [x, x + w].forEach((cx) => { c.beginPath(); c.arc(cx, tear, 22, 0, Math.PI * 2); stage(); });
  c.font = `500 22px ${MONO}`;
  c.fillStyle = brown;
  c.fillText('FOUNDING MEMBER NO.', x + 48, y + 540);
  c.fillStyle = ink;
  c.font = `700 120px ${MONO}`;
  c.fillText(`#${pad(S.memberNo, 4)}`, x + 40, y + 660);
  c.font = `500 24px ${MONO}`;
  c.fillStyle = brown;
  c.fillText(P.code.textContent, x + 48, y + 704);
  // barcode
  let bx = x + w - 300;
  let r = hash(S.inviteCode) || 1;
  c.fillStyle = ink;
  while (bx < x + w - 48) { r = (Math.imul(r, 1103515245) + 12345) >>> 0; const bw = 3 + (r % 3) * 2; c.fillRect(bx, y + 560, bw, 140); bx += bw + 3 + ((r >> 4) % 3) * 2; }
  // perks: every one, each kept inside the card
  c.font = `500 22px ${MONO}`;
  c.fillStyle = brown;
  c.fillText('ON YOUR PASS', x + 48, y + 790);
  perks.forEach((pk, i) => {
    const py = y + 846 + i * ROW;
    c.fillStyle = '#0a4f57';
    c.beginPath();
    c.arc(x + 62, py - 9, 13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#fff';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(x + 55, py - 9);
    c.lineTo(x + 60, py - 3);
    c.lineTo(x + 70, py - 15);
    c.stroke();
    c.fillStyle = ink;
    fit(c, pk.p, w - 140, 30, 560, SANS);
    c.fillText(pk.p, x + 92, py);
  });
  // status, in the stub
  const sy = y + h - STUB / 2 + 8;
  c.font = `500 22px ${MONO}`;
  c.fillStyle = '#4a3000';
  c.fillText('STATUS · ', x + 48, sy);
  c.fillStyle = '#0a4f57';
  c.fillText('ON THE WAITLIST', x + 48 + c.measureText('STATUS · ').width, sy);
  c.textAlign = 'right';
  c.fillStyle = '#4a3000';
  c.fillText(`BOXES ${openedFor(S.friends)}/${GIFT_BOXES.length}`, x + w - 48, sy);
  // the invite
  c.textAlign = 'center';
  c.fillStyle = '#e8f2f1';
  c.font = `600 34px ${SANS}`;
  c.fillText(`Get yours: ${location.host}/join`, W / 2, y + h + 112);
  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
  if (!blob) return;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `autoplaced-founding-pass-${pad(S.memberNo, 4)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
$('[data-download]').addEventListener('click', downloadPass);

/* ---------------- countdown to the end of the offer ---------------- */
const END = Date.parse(OFFER_ENDS);
{
  let label = '';
  try { label = new Date(END).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).replace(/^(\w+)\s/, '$1, '); } catch { /* old browser */ }
  $$('[data-ends-date]').forEach((el) => { el.textContent = label; });
}
const tiles = $$('[data-tiles] b');
let lastMinute = -1;
function tick() {
  const left = END - Date.now();
  if (!(left > 0)) {
    $$('[data-ends]').forEach((el) => { el.hidden = true; });
    $('[data-ends-short]').textContent = '';
    return false;
  }
  const D = Math.floor(left / 864e5);
  const Hh = Math.floor(left / 36e5) % 24;
  const M = Math.floor(left / 6e4) % 60;
  const Ss = Math.floor(left / 1e3) % 60;
  [D, Hh, M, Ss].forEach((v, i) => { const t = pad(v); if (tiles[i] && tiles[i].textContent !== t) tiles[i].textContent = t; });
  $('[data-ends-long]').textContent = `${D}d ${pad(Hh)}:${pad(M)}:${pad(Ss)}`;
  if (M !== lastMinute) {
    lastMinute = M;
    $('[data-ends-short]').textContent = `Boxes stop opening in ${D}d ${pad(Hh)}h ${pad(M)}m.`;
    $('[data-ends-sr]').textContent = `Free gifts end in ${plural(D, 'day', 'days')}, ${plural(Hh, 'hour', 'hours')} and ${plural(M, 'minute', 'minutes')}.`;
  }
  return true;
}
if (tick()) {
  const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 1000);
}

/* ---------------- the pass catches the light as the mouse moves over it ---------------- */
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let raf = 0;
  fpass.addEventListener('pointermove', (e) => {
    const r = fpass.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { fpass.style.setProperty('--tx', x.toFixed(3)); fpass.style.setProperty('--ty', y.toFixed(3)); });
  });
  fpass.addEventListener('pointerleave', () => { fpass.style.setProperty('--tx', '0'); fpass.style.setProperty('--ty', '0'); });
}

/* ---------------- start: a returning member sees their pass ---------------- */
async function loadState() {
  if (!STATE_ENDPOINT) return null;
  try {
    const res = await fetch(STATE_ENDPOINT, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return fromBackend(await res.json());
  } catch { return null; }
}
async function boot() {
  showView('form');
  paintAll();
  let print = false;
  try { print = sessionStorage.getItem(PRINT_KEY) === '1'; sessionStorage.removeItem(PRINT_KEY); } catch { /* storage blocked */ }
  if (STATE_ENDPOINT) {
    const st = await loadState();
    if (st) { S = st; issue(print); }
    // back on this tab later: friends may have joined since
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden || !S || printing) return;
      const fresh = await loadState();
      if (!fresh) return;
      const before = S.friends;
      S = fresh;
      friendsChanged(before);
    });
  } else if (PREVIEW) {
    const saved = store.get(PASS_KEY);
    if (saved && saved.name && CODE.test(saved.inviteCode || '')) { S = { ...fromBackend(saved), memberNo: saved.memberNo }; issue(false); }
  }
}
boot();
