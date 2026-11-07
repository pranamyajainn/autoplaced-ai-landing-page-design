// Hero gift box: tap it a few times (or skip) and it opens to show the gifts for joining.
// The box tilts towards the mouse; on touch screens it sways by itself (a CSS animation).
import { GIFTS, TAPS_TO_OPEN } from './config.js';

const clamp = (v, a = -1, b = 1) => Math.min(b, Math.max(a, v));
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderGifts(ul) {
  ul.innerHTML = GIFTS.map((g, i) => `<li style="--i:${i}"><span class="gn" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${esc(g)}</span></li>`).join('');
}

// The agent at work: sample job cards floating around the poster (the same sample data as the product window).
// x, y: place on desktop, in % of the hero; mx, my: place on phones (no mx: hidden on phones). z: depth, 0 far to 1 near.
const CARDS = [
  { logo: 'cred.png', c: '#000', fill: true, t: 'Product Manager, Rewards', s: 'CRED · Bengaluru · ₹32–48 LPA', st: 'Applied', tone: 'ok', x: 4, y: 26, z: 0.55, r: -5 },
  { logo: 'swiggy.svg', c: '#fc8019', t: 'Senior PM, Instamart', s: 'Swiggy · Bengaluru · Hybrid', st: 'Applied', tone: 'ok', x: 80, y: 22, z: 0.4, r: 4, mx: 80, my: 43, mz: 0.3 },
  { logo: 'razorpay.svg', c: '#0c2451', t: 'Senior PM, Payments', s: 'Razorpay · Bengaluru', st: 'Recruiter replied', tone: 'work', x: 79, y: 52, z: 0.75, r: -4 },
  { kind: 'scan', t: 'Scanning 20+ job sites', s: '1,284 postings today', st: '31 matches', tone: 'work', x: 6, y: 54, z: 0.3, r: 3, mx: -44, my: 49, mz: 0.3 },
];
function cardHTML(k) {
  const icon = k.kind === 'ring' ? `<span class="jc__ring" style="--v:${k.v}"><i>${k.v}</i></span>`
    : k.kind === 'scan' ? '<span class="jc__scan"><i></i></span>'
      : `<span class="jc__logo${k.fill ? ' jc__logo--fill' : ''}" style="--c:${k.c}"><img src="assets/logos/${k.logo}" alt="" width="20" height="20"></span>`;
  return `<div class="jc__push"><div class="jc__in"><div class="jc__card">${icon}<b>${esc(k.t)}</b><small>${esc(k.s)}</small><span class="jc__st${k.tone === 'work' ? ' jc__st--work' : ''}">${k.tone === 'ok' ? '<svg width="11" height="11"><use href="#i-check"/></svg>' : ''}${esc(k.st)}</span></div></div></div>`;
}

// what the bot says, before and after each tap
const LINES = ['I brought you something.', 'Ooh. Yes! Keep going.', 'One more. It’s about to pop!', 'Almost there!'];
const tapsLeft = (n) => (n === TAPS_TO_OPEN ? `Tap ${n} times to open` : `${n} more tap${n > 1 ? 's' : ''}`);

export function initGift({ reduced, onOpen = () => {} }) {
  const el = document.querySelector('[data-gift]');
  if (!el) return;
  const $ = (s) => el.querySelector(s);
  const hero = el.closest('[data-hero]');
  const gbox = $('[data-gbox]');
  const hit = $('[data-gift-hit]');
  const skip = $('[data-gift-skip]');
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

  renderGifts($('[data-gifts]'));
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
      c.hidden = onPhone && k.mx === undefined;
      const z = onPhone ? k.mz : k.z;
      c.style.setProperty('--x', `${onPhone ? k.mx : k.x}%`);
      c.style.setProperty('--y', `${onPhone ? k.my : k.y}%`);
      c.style.setProperty('--z', z);
      c.style.setProperty('--s', (0.6 + z * 0.55).toFixed(3));
    });
  }
  place();
  phone.addEventListener('change', place);
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
  function shake(cls, k) {
    gbox.classList.remove('is-shake', 'is-nudge');
    void gbox.offsetWidth; // restart the animation
    gbox.style.setProperty('--k', String(k));
    gbox.classList.add(cls);
  }
  gbox.addEventListener('animationend', (e) => { if (e.target === gbox) gbox.classList.remove('is-shake', 'is-nudge'); });

  function open(method) {
    if (opened) return;
    opened = true;
    taps = TAPS_TO_OPEN;
    charge();
    clearTimeout(nudgeTimer);
    dots.forEach((d) => d.classList.add('is-on'));
    bot.dataset.mood = 'happy';
    ticket.inert = false;
    el.dataset.method = method;
    // the lid hinges open towards the back, so from now on it is drawn behind the ticket
    backLayer.appendChild(lid);
    void lid.offsetWidth;
    el.classList.add('is-opening', 'is-open');
    hero.classList.add('is-gift-open');
    setTimeout(() => push(2.6), reduced ? 0 : 120);
    live.textContent = 'The box is open. Your gifts are on the ticket.';
    if (!reduced) ripple();
    // the box button goes away, so focus moves to what came out of it
    title.focus({ preventScroll: true });
    hit.hidden = true;
    // the bot climbs out over the near glass, so it is drawn in front of it from here on
    setTimeout(() => { ticket.appendChild(bot); el.classList.add('is-out'); }, reduced ? 0 : 850);
    setTimeout(() => onOpen(el), reduced ? 0 : 450);
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
    if (taps >= TAPS_TO_OPEN) { open('shake'); return; }
    charge();
    if (!reduced) { shake('is-shake', 0.6 + taps * 0.4); ripple(); push(0.6 + taps * 0.35); }
    speak(LINES[Math.min(taps, LINES.length - 1)]);
    const left = TAPS_TO_OPEN - taps;
    count.textContent = tapsLeft(left);
    live.textContent = `${left} more tap${left > 1 ? 's' : ''} to open the box.`;
  });
  skip.addEventListener('click', () => open('skip'));

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
