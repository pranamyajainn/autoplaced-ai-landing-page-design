// Hero gift box: two taps open it, and the founding pass inside takes the visitor to the /join page.
// The box tilts towards the mouse; on touch screens it sways by itself (a CSS animation).
import { TAPS_TO_OPEN } from './config.js';

const clamp = (v, a = -1, b = 1) => Math.min(b, Math.max(a, v));
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The agent at work: ten sample job cards, from Himanshu's "Hero tiles" sheet. Five on the left and five on the
// right, in the sheet's order from top to bottom, across software, product, analytics, QA and leadership roles.
// x, y: place on desktop, in % of the hero; mx, my: place on phones (no mx: hidden on phones). z: depth, 0 far to 1 near.
// c: the tile colour from the sheet. sz: logo size inside its tile (default 56%).
// tall: on phones, shown only on screens tall enough to fit it above the headline.
const CARDS = [
  // left side
  { logo: 'google.svg', c: '#fff', t: 'Software Engineer III', s: 'Google · Bengaluru · Hybrid', st: 'Applied', tone: 'ok', x: 3, y: 19, z: 0.55, r: -5, mx: 66, my: 40, mz: 0.3 },
  { logo: 'swiggy.svg', c: '#fc8019', t: 'Product Manager', s: 'Swiggy · Bengaluru · Hybrid', st: 'Interview call', tone: 'work', x: 18, y: 33, z: 0.12, r: 2, mx: 3, my: -7, mz: 0.1, tall: true },
  { logo: 'microsoft.svg', c: '#fff', sz: '50%', t: 'SDE II, Azure', s: 'Microsoft · Hyderabad', st: 'Recruiter replied', tone: 'work', x: 6, y: 46, z: 0.3, r: 3, mx: 56, my: -5, mz: 0.1, tall: true },
  { logo: 'jpmorgan.svg', c: '#3b2a1e', sz: '52%', t: 'Business Analyst', s: 'JPMorgan Chase · Mumbai', st: 'Tailoring resume', tone: 'work', x: 12, y: 59, z: 0.16, r: -2, mx: 3, my: 69, mz: 0.2 },
  { logo: 'amazon.svg', c: '#232f3e', t: 'SDE I, Prime Video', s: 'Amazon · Bengaluru · Onsite', st: 'Applied', tone: 'ok', x: 2, y: 71, z: 0.7, r: 3 },
  // right side
  { logo: 'atlassian.svg', c: '#0c66e4', t: 'Senior Backend Engineer', s: 'Atlassian · Bengaluru · Remote', st: 'Interview call', tone: 'work', x: 81, y: 17, z: 0.45, r: 4 },
  { logo: 'browserstack.svg', c: '#e8562a', sz: '62%', t: 'SDET II', s: 'BrowserStack · Mumbai', st: 'Applied', tone: 'ok', x: 70, y: 31, z: 0.1, r: -2 },
  { logo: 'razorpay.svg', c: '#072654', t: 'Backend Engineer, Payments', s: 'Razorpay · Bengaluru', st: 'Tailoring resume', tone: 'work', x: 80, y: 45, z: 0.72, r: -4 },
  { logo: 'salesforce.svg', c: '#00a1e0', sz: '64%', t: 'Engineering Manager', s: 'Salesforce · Hyderabad', st: 'Recruiter replied', tone: 'work', x: 72, y: 59, z: 0.2, r: 2, mx: 54, my: 72, mz: 0.2 },
  { logo: 'fractal.svg', c: '#1d3a8a', sz: '64%', t: 'Product Analyst', s: 'Fractal Analytics · Mumbai', st: 'Applied', tone: 'ok', x: 82, y: 71, z: 0.5, r: -3 },
];
function cardHTML(k) {
  const icon = `<span class="jc__logo${k.fill ? ' jc__logo--fill' : ''}" style="--c:${k.c}${k.sz ? `;--sz:${k.sz}` : ''}"><img src="assets/logos/${k.logo}" alt="" width="20" height="20"></span>`;
  return `<div class="jc__push"><div class="jc__in"><div class="jc__card">${icon}<b>${esc(k.t)}</b><small>${esc(k.s)}</small><span class="jc__st${k.tone === 'work' ? ' jc__st--work' : ''}">${k.tone === 'ok' ? '<svg width="11" height="11"><use href="#i-check"/></svg>' : ''}${esc(k.st)}</span></div></div></div>`;
}

// what the bot says, before and after each tap
const LINES = ['I brought you something.', 'Ooh, it rattles. One more tap!', 'Almost there!'];
const tapsLeft = (n) => (n === TAPS_TO_OPEN ? (n === 2 ? 'Tap twice to open' : `Tap ${n} times to open`) : n === 1 ? 'One more tap!' : `${n} more taps`);

export function initGift({ reduced, onOpen = () => {} }) {
  const el = document.querySelector('[data-gift]');
  if (!el) return;
  const $ = (s) => el.querySelector(s);
  const hero = el.closest('[data-hero]');
  const gbox = $('[data-gbox]');
  const hit = $('[data-gift-hit]');
  const go = $('[data-gift-go]');
  const say = $('[data-gift-say]');
  const bubble = $('[data-gift-bubble]');
  const count = $('[data-gift-count]');
  const live = $('[data-gift-live]');
  const ticket = $('[data-ticket]');
  const title = $('[data-ticket-title]');
  const bot = $('[data-gift-bot]');
  const lid = $('.lid');
  const backLayer = $('.gbox__layer');
  const floor = $('.gbox__floor');

  say.textContent = LINES[0];
  const dotsEl = $('[data-gift-dots]');
  dotsEl.innerHTML = '<i></i>'.repeat(TAPS_TO_OPEN);
  const dots = [...dotsEl.children];
  count.textContent = tapsLeft(TAPS_TO_OPEN);

  // dust drifting in the light above the box
  const dust = $('[data-dust]');
  for (let i = 0; i < 8; i++) {
    const m = document.createElement('i');
    m.style.cssText = `left:${(8 + Math.random() * 84).toFixed(1)}%;top:${(6 + Math.random() * 70).toFixed(1)}%;--z:${(0.3 + Math.random()).toFixed(2)};--dur:${(9 + Math.random() * 10).toFixed(1)}s;--del:-${(Math.random() * 18).toFixed(1)}s`;
    dust.appendChild(m);
  }

  // the floating cards: depth sets size, blur, fade and how far each one moves
  const field = hero.querySelector('[data-field]');
  const phone = matchMedia('(max-width: 760px)');
  const short = matchMedia('(max-height: 759px)');
  const cards = CARDS.map((k, i) => {
    const c = document.createElement('div');
    c.className = 'jc';
    c.innerHTML = cardHTML(k);
    c.style.setProperty('--r', `${k.r}deg`);
    c.querySelector('.jc__in').style.cssText = `--dur:${(5 + (i % 3) * 1.4).toFixed(1)}s;--del:-${(i * 1.7).toFixed(1)}s`;
    field.appendChild(c);
    return { c, k };
  });
  function place() {
    cards.forEach(({ c, k }) => {
      const onPhone = phone.matches;
      c.hidden = onPhone && (k.mx === undefined || (k.tall && short.matches));
      const z = onPhone ? k.mz : k.z;
      c.style.setProperty('--x', `${onPhone ? k.mx : k.x}%`);
      c.style.setProperty('--y', `${onPhone ? k.my : k.y}%`);
      c.style.setProperty('--z', z);
      c.style.setProperty('--s', (0.6 + z * 0.55).toFixed(3));
    });
  }
  place();
  phone.addEventListener('change', place);
  short.addEventListener('change', place);
  // each tap sends a small shock out from the box; opening sends a big one
  function push(strength) {
    if (reduced) return;
    const b = gbox.getBoundingClientRect();
    cards.forEach(({ c }) => {
      if (c.hidden) return;
      const r = c.getBoundingClientRect();
      const dx = r.left + r.width / 2 - b.left;
      const dy = r.top + r.height / 2 - b.top;
      const d = Math.hypot(dx, dy) || 1;
      const k = strength * (16 + 30 * Number(c.style.getPropertyValue('--z')));
      c.style.setProperty('--kx', `${((dx / d) * k).toFixed(1)}px`);
      c.style.setProperty('--ky', `${((dy / d) * k).toFixed(1)}px`);
      c.style.setProperty('--kr', `${((dx > 0 ? 1 : -1) * strength * 3).toFixed(1)}deg`);
      c.classList.add('is-push');
      setTimeout(() => c.classList.remove('is-push'), 360);
    });
  }

  let taps = 0;
  let opened = false;
  if (!reduced) setTimeout(() => { if (!opened) ripple(); }, 1250);
  let swapTimer = 0;
  function speak(text) {
    bubble.classList.add('is-swap');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => { say.textContent = text; bubble.classList.remove('is-swap'); }, 180);
  }
  const charge = () => el.style.setProperty('--charge', (taps / TAPS_TO_OPEN).toFixed(2));
  function ripple() {
    const r = document.createElement('i');
    r.className = 'gbox__ripple';
    r.addEventListener('animationend', () => r.remove());
    floor.appendChild(r);
  }
  // gold sparks jump out of the box when it opens
  const stage = $('.gift__stage');
  function sparks(n) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'gspark';
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const d = 70 + Math.random() * 90;
      s.style.cssText = `--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px;--sz:${(5 + Math.random() * 6).toFixed(1)}px;--dl:${(Math.random() * 90).toFixed(0)}ms`;
      s.addEventListener('animationend', () => s.remove());
      stage.appendChild(s);
    }
  }
  function shake(cls, k) {
    gbox.classList.remove('is-shake', 'is-nudge');
    void gbox.offsetWidth; // restart the animation
    gbox.style.setProperty('--k', String(k));
    gbox.classList.add(cls);
  }
  gbox.addEventListener('animationend', (e) => { if (e.target === gbox) gbox.classList.remove('is-shake', 'is-nudge'); });

  function open() {
    if (opened) return;
    opened = true;
    taps = TAPS_TO_OPEN;
    charge();
    clearTimeout(nudgeTimer);
    dots.forEach((d) => d.classList.add('is-on'));
    bot.dataset.mood = 'happy';
    ticket.inert = false;
    sparks(22);
    // the lid hinges open towards the back, so from now on it is drawn behind the ticket
    backLayer.appendChild(lid);
    void lid.offsetWidth;
    el.classList.add('is-opening', 'is-open');
    hero.classList.add('is-gift-open');
    setTimeout(() => push(2.6), reduced ? 0 : 120);
    live.textContent = 'The box is open. Your founding pass is ready. Taking you to the join page.';
    if (!reduced) ripple();
    // the box button goes away, so focus moves to what came out of it
    title.focus({ preventScroll: true });
    hit.hidden = true;
    // the bot climbs out over the near glass, so it is drawn in front of it from here on
    setTimeout(() => { ticket.appendChild(bot); el.classList.add('is-out'); }, reduced ? 0 : 850);
    setTimeout(() => onOpen(el), reduced ? 0 : 450);
    // a moment to see the pass rise, then straight to the join page
    setTimeout(() => location.assign(go.href), reduced ? 400 : 1700);
  }

  // instant feedback the moment a finger or mouse goes down
  hit.addEventListener('pointerdown', () => { if (!opened) gbox.classList.add('is-press'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => hit.addEventListener(ev, () => gbox.classList.remove('is-press')));

  hit.addEventListener('click', () => {
    if (opened) return;
    gbox.classList.remove('is-press');
    taps += 1;
    dots[taps - 1]?.classList.add('is-on');
    try { navigator.vibrate?.(taps >= TAPS_TO_OPEN ? [18, 40, 28] : 14); } catch { /* not supported */ }
    if (taps >= TAPS_TO_OPEN) { open(); return; }
    charge();
    if (!reduced) { shake('is-shake', 0.6 + taps * 0.4); ripple(); push(0.6 + taps * 0.35); sparks(8); }
    speak(LINES[Math.min(taps, LINES.length - 1)]);
    const left = TAPS_TO_OPEN - taps;
    count.textContent = tapsLeft(left);
    live.textContent = `${left} more tap${left > 1 ? 's' : ''} to open the box.`;
  });

  /* the box follows the mouse: smoothed, and only while the hero is on screen */
  let inView = true;
  let hovering = false;
  hit.addEventListener('pointerenter', () => { hovering = true; });
  hit.addEventListener('pointerleave', () => { hovering = false; });

  // a small wiggle now and then, so it is clear the box wants to be tapped: soon after load, then rarely, three times at most
  let nudges = 0;
  let nudgeTimer = 0;
  const nudge = () => {
    if (opened || taps > 0 || nudges >= 3) return;
    if (!hovering && inView && !document.hidden) { shake('is-nudge', 0.5); nudges += 1; }
    nudgeTimer = setTimeout(nudge, 7000);
  };
  if (!reduced) nudgeTimer = setTimeout(nudge, 2500);
  let kick = () => {};
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; hero.classList.toggle('is-away', !inView); kick(); }).observe(hero);

  if (reduced) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let last = 0;
  function loop(t) {
    raf = 0;
    // the same smoothing at 60 and 120 frames a second
    const k = 1 - Math.exp(-Math.min(64, t - (last || t - 16)) / 110);
    last = t;
    x += (tx - x) * k;
    y += (ty - y) * k;
    hero.style.setProperty('--px', x.toFixed(4));
    hero.style.setProperty('--py', y.toFixed(4));
    if (inView && (Math.abs(tx - x) > 0.0005 || Math.abs(ty - y) > 0.0005)) raf = requestAnimationFrame(loop);
    else last = 0;
  }
  kick = () => { if (!raf && inView && fine.matches) raf = requestAnimationFrame(loop); };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.7));
    ty = clamp((e.clientY - (r.top + r.height * 0.55)) / (r.height * 0.7));
    kick();
  });
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
}
