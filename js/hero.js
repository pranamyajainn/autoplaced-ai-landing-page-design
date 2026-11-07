// Hero gift box: tap it a few times (or skip) and it opens to show the gifts for joining.
// The box tilts towards the mouse; on touch screens it sways by itself (a CSS animation).
import { GIFTS, TAPS_TO_OPEN } from './config.js';

const clamp = (v, a = -1, b = 1) => Math.min(b, Math.max(a, v));
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderGifts(ul) {
  ul.innerHTML = GIFTS.map((g, i) => `<li style="--i:${i}"><span class="gn" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${esc(g)}</span></li>`).join('');
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
  for (let i = 0; i < 22; i++) {
    const m = document.createElement('i');
    m.style.cssText = `left:${(8 + Math.random() * 84).toFixed(1)}%;top:${(6 + Math.random() * 70).toFixed(1)}%;--z:${(0.3 + Math.random()).toFixed(2)};--dur:${(9 + Math.random() * 10).toFixed(1)}s;--del:-${(Math.random() * 18).toFixed(1)}s`;
    dust.appendChild(m);
  }

  let taps = 0;
  let opened = false;
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
    live.textContent = 'The box is open. Your gifts are listed below.';
    if (!reduced) ripple();
    // the box button goes away, so focus moves to what came out of it
    title.focus({ preventScroll: true });
    hit.hidden = true;
    // the bot climbs out over the near glass, so it is drawn in front of it from here on
    setTimeout(() => { gbox.appendChild(bot); void bot.offsetWidth; el.classList.add('is-out'); }, reduced ? 0 : 750);
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
    if (!reduced) { shake('is-shake', 0.6 + taps * 0.4); ripple(); }
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
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; kick(); }).observe(hero);

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
