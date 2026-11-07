import { mountBots } from './bot.js';
import { initControl } from './dial.js';
import { initGift } from './hero.js';
import { initJoin } from './join.js';
import { WHATSAPP_COMMUNITY_URL } from './config.js';

const root = document.documentElement;
root.classList.add('js');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mqMobile = matchMedia('(max-width: 760px)');
const mqStack = matchMedia('(max-width: 980px)');

mountBots();
// every WhatsApp community button takes its address from config.js
$$('[data-wa]').forEach((a) => { a.href = WHATSAPP_COMMUNITY_URL; });

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (!reduced) {
  import('lenis')
    .then(({ default: Lenis }) => {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
      window.__lenis = lenis;
    })
    .catch(() => {});
}
function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -84, duration: 1.4 });
  else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
$$('a[href^="#"]:not([data-join]):not([data-wa])').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const t = id === '#top' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(t);
    // move keyboard focus with the scroll, as a normal anchor jump would
    const focusEl = t === 0 ? $('#main') : t;
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
    focusEl.focus({ preventScroll: true });
    if (t !== 0) history.replaceState(null, '', id);
  });
});

/* ---------------- nav + menu ---------------- */
const nav = $('[data-nav]');
const burger = $('[data-burger]');
const sheet = $('[data-menu]');
const sheetBot = $('[data-sheet-bot]');
const isMenuOpen = () => root.classList.contains('menu-open');
function greeting() {
  const d = new Date();
  const h = d.getHours();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const line = h < 5 ? 'Still up? Let the agent take the night shift'
    : h < 12 ? 'Good morning. New roles came in overnight'
      : h < 17 ? 'Good afternoon. Your agent is on the job'
        : h < 21 ? 'Good evening. The night shift starts soon'
          : 'Still up? Let the agent take the night shift';
  return `${time} · ${line}`;
}
function openMenu() {
  const r = burger.getBoundingClientRect();
  sheet.style.setProperty('--x', `${(r.left + r.right) / 2}px`);
  sheet.style.setProperty('--y', `${(r.top + r.bottom) / 2}px`);
  $('[data-hello]', sheet).textContent = greeting();
  sheet.inert = false;
  sheet.setAttribute('aria-hidden', 'false');
  root.classList.add('menu-open');
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Close menu');
  if (lenis) lenis.stop();
  requestAnimationFrame(() => sheet.classList.add('is-open'));
}
function closeMenu(returnFocus = false) {
  if (!isMenuOpen()) return;
  sheet.classList.remove('is-open');
  root.classList.remove('menu-open');
  sheet.inert = true;
  sheet.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Open menu');
  if (lenis) lenis.start();
  if (returnFocus) burger.focus();
}
burger.addEventListener('click', () => (isMenuOpen() ? closeMenu() : openMenu()));
// the menu's join button opens the waitlist form, so the menu gets out of the way first
$$('[data-join]', sheet).forEach((a) => a.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', (e) => {
  if (!isMenuOpen()) return;
  if (e.key === 'Escape') { closeMenu(true); return; }
  // keep Tab inside the open menu (the close button plus the menu's own links)
  if (e.key === 'Tab') {
    const items = [burger, ...$$('a, button', sheet)];
    const i = items.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
    e.preventDefault();
    items[next].focus();
  }
});
// the bot leans towards whichever link you point at
$$('.msheet__links a').forEach((a, i, all) => {
  const look = () => { sheetBot.dataset.mood = 'happy'; sheetBot.classList.add('is-looking'); sheetBot.style.setProperty('--tilt', `${-6 - i * 4}deg`); };
  const away = () => { sheetBot.dataset.mood = 'cool'; sheetBot.style.setProperty('--tilt', '0deg'); };
  a.addEventListener('pointerenter', look);
  a.addEventListener('focus', look);
  a.addEventListener('pointerleave', away);
  a.addEventListener('blur', away);
  a.addEventListener('pointerdown', () => a.classList.add('is-pressed'));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => a.addEventListener(ev, () => a.classList.remove('is-pressed')));
});
matchMedia('(min-width: 981px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });

/* ---------------- live meadow ---------------- */
let meadow = null;
const sceneEl = $('[data-scene]');
const frontEl = $('[data-front]');
const hasWebGL = 'WebGL2RenderingContext' in window || 'WebGLRenderingContext' in window;
function loadMeadow() {
  import('./meadow.js')
    .then(async ({ createMeadow }) => {
      const m = await createMeadow({
        back: $('[data-back]'), front: frontEl, reduced,
        onLost: (l) => root.classList.toggle('no-webgl', l),
        onReady: () => { root.classList.add('meadow-ready'); root.dataset.meadow = 'ready'; },
      });
      meadow = m;
      meadow.setMood(1, true);
      lastY = -1;
    })
    .catch(() => root.classList.add('no-webgl'));
}
// only the closing section uses the meadow now, so it loads when that section gets near
if (hasWebGL) {
  const near = new IntersectionObserver(([en]) => { if (en.isIntersecting) { near.disconnect(); loadMeadow(); } }, { rootMargin: '250% 0px' });
  near.observe($('[data-final]'));
}
else root.classList.add('no-webgl');

/* ---------------- hero + product window ---------------- */
const hero = $('[data-hero]');
const showcase = $('[data-showcase]');
const app = $('[data-app]');
const finalSec = $('[data-final]');
initGift({
  reduced,
  // on phones the opened box grows; scroll to where the ticket will settle while it rises
  onOpen: (el) => {
    lastY = -1; // redraw now, so the nav turns dark over the dimmed hero
    const cs = getComputedStyle(el);
    const ticket = $('.ticket', el);
    const top = el.getBoundingClientRect().top + parseFloat(cs.getPropertyValue('--gh')) * (parseFloat(cs.getPropertyValue('--by')) / 100)
      - parseFloat(cs.getPropertyValue('--h')) * 0.46 - ticket.offsetHeight;
    if (top > 84 && top + ticket.offsetHeight + 60 < window.innerHeight) return;
    const y = window.scrollY + top - 92;
    if (lenis) lenis.scrollTo(y, { duration: 1.0 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  },
});
initJoin({ reduced, getLenis: () => lenis });

let vw = window.innerWidth;
let vh = window.innerHeight;
// Layout is read once here, never inside the scroll loop: reading it there forces the browser
// to recalculate the page every frame, which is what makes scrolling stutter.
const L = { steps: [] };
const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;
function measure() {
  vw = window.innerWidth;
  // keep the stage steady while mobile browser bars slide in and out
  const h = window.innerHeight;
  if (Math.abs(h - vh) > 120 || !mqMobile.matches) vh = h;
  L.heroTop = pageTop(hero); L.heroH = hero.offsetHeight;
  L.showTop = pageTop(showcase); L.showH = showcase.offsetHeight;
  L.finalTop = pageTop(finalSec);
  L.dayTop = pageTop(daySec); L.dayH = daySec.offsetHeight;
  L.artTop = pageTop(resumeArt); L.artH = resumeArt.offsetHeight;
  L.steps = steps.map((s) => ({ top: pageTop(s), h: s.offsetHeight }));
  buildHills();
  lastY = -1;
}
let measureQueued = false;
const queueMeasure = () => {
  if (measureQueued) return;
  measureQueued = true;
  requestAnimationFrame(() => { measureQueued = false; measure(); });
};
window.addEventListener('resize', queueMeasure);
// content can change height (fonts arriving, FAQ answers opening, the gift box opening), so re-measure when it does
new ResizeObserver(queueMeasure).observe(document.querySelector('main'));
document.fonts?.ready.then(queueMeasure);

let showOn = false;
let heroSy = -1;
// only the layers that drift read the scroll value, so the rest of the hero is not restyled every frame
const heroLayers = [$('[data-field]'), $('.hero__bg')];
function updateTop(y) {
  const heroBottom = L.heroTop + L.heroH - y;
  nav.classList.toggle('is-solid', heroBottom < 90);

  // the poster's layers drift apart as it scrolls away: near cards fastest, the sun slowest
  const sy = reduced ? 0 : Math.round(clamp(y / Math.max(1, L.heroH)) * 1000) / 1000;
  if (sy !== heroSy && heroBottom > -40) { heroSy = sy; heroLayers.forEach((el) => el.style.setProperty('--sy', String(sy))); }

  // the product window tips up to face you as it scrolls in
  const top = L.showTop - y;
  showOn = top < vh && top + L.showH > 0;
  if (showOn && !reduced) {
    const t = clamp((vh - top) / (vh * 0.85));
    const e = 1 - Math.pow(1 - t, 3);
    app.style.transform = `perspective(2000px) translate3d(0, ${lerp(70, 0, e).toFixed(1)}px, 0) rotateX(${lerp(22, 0, e).toFixed(2)}deg) scale(${lerp(0.9, 1, e).toFixed(4)})`;
  }

  // the golden meadow behind the closing section
  const fr = L.finalTop - y;
  const on = fr < vh + 40;
  sceneEl.classList.toggle('is-off', !on);
  frontEl.classList.toggle('is-off', !on);
  if (meadow) {
    meadow.setActive(on);
    if (on) meadow.setProgress(lerp(0.55, 0, easeInOut(clamp(1 - fr / vh))));
  }
}

/* product window: small signs of life while the hero is on screen */
{
  const statuses = $$('.job .status');
  const count = $('[data-agent-count]');
  const bar = $('[data-agent-bar]');
  const swiggy = statuses[1];
  const phonepe = statuses[2];
  const done = '<svg width="11" height="11"><use href="#i-check"/></svg>Applied';
  const work = '<span class="spin"></span>Tailoring resume';
  let n = 14;
  let step = 0;
  setInterval(() => {
    if (!showOn || document.hidden || reduced) return;
    step = (step + 1) % 4;
    if (step === 1) { swiggy.className = 'status status--done'; swiggy.innerHTML = done; n = n >= 24 ? 14 : n + 1; }
    else if (step === 2) { phonepe.className = 'status status--work'; phonepe.innerHTML = work; }
    else if (step === 3) { phonepe.className = 'status status--done'; phonepe.innerHTML = done; n = n >= 24 ? 14 : n + 1; }
    else {
      swiggy.className = 'status status--work'; swiggy.innerHTML = work;
      phonepe.className = 'status status--wait'; phonepe.textContent = 'Needs approval';
    }
    count.textContent = String(n);
    bar.style.width = `${(n / 25) * 100}%`;
  }, 2400);
}

/* ---------------- how it works ---------------- */
const steps = $$('.step');
const device = $('[data-device]');
const howDots = $$('.how__dots i');
let howActive = -1;
// a screen plays its scene when it turns on; the ATS score counts up with its ring
function setScreen(scr, on) {
  if (scr.classList.contains('is-on') === on) return;
  scr.classList.toggle('is-on', on);
  const num = on && $('[data-ats]', scr);
  if (!num) return;
  const to = +(num.dataset.to ||= num.textContent);
  const run = (num.run = (num.run || 0) + 1);
  if (reduced) { num.textContent = String(to); return; }
  const t0 = performance.now();
  const tick = (now) => {
    if (num.run !== run) return;
    const k = Math.min(1, (now - t0) / 1400);
    num.textContent = String(Math.round(to * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const deviceScreens = $$('[data-screen]', device);
function setHow(i) {
  if (i === howActive) return;
  howActive = i;
  device.dataset.active = String(i);
  deviceScreens.forEach((s, k) => setScreen(s, k === i));
  steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  howDots.forEach((d, k) => d.classList.toggle('is-on', k === i));
}
setHow(0);
// stacked layout: every step gets its own copy of its screen
steps.forEach((s, i) => {
  const wrap = document.createElement('div');
  wrap.className = `device device--inline device--t${i}`;
  wrap.setAttribute('aria-hidden', 'true');
  const scr = $(`[data-screen="${i}"]`, device).cloneNode(true);
  scr.classList.remove('is-on');
  wrap.appendChild(scr);
  s.appendChild(wrap);
});
// each card plays once it is well on screen, and again whenever it comes back
const inlineIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    const scr = en.target.querySelector('.screen');
    if (en.intersectionRatio >= 0.45) setScreen(scr, true);
    else if (!en.isIntersecting) setScreen(scr, false);
  });
}, { threshold: [0, 0.45] });
$$('.device--inline').forEach((d) => inlineIO.observe(d));

function updateHow(y) {
  if (mqStack.matches) return;
  let best = 0;
  let bestD = Infinity;
  L.steps.forEach((s, i) => {
    const d = Math.abs(s.top - y + s.h / 2 - vh * 0.5);
    if (d < bestD) { bestD = d; best = i; }
  });
  setHow(best);
}

/* ---------------- resume builder ---------------- */
const resumeArt = $('[data-resume]');
const resumeFloats = $$('.float', resumeArt);
{
  const typeEl = $('[data-type]', resumeArt);
  const ring = $('[data-ring]', resumeArt);
  const ringNum = $('[data-ring-num]', resumeArt);
  const text = typeEl.dataset.type;
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    if (reduced) { typeEl.textContent = text; ring.style.setProperty('--p', 91); ringNum.textContent = '91'; return; }
    setTimeout(() => {
      resumeArt.classList.add('is-typing');
      let i = 0;
      const tick = () => {
        typeEl.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 28 + Math.random() * 40);
        else setTimeout(() => typeEl.classList.add('is-done'), 1600);
      };
      tick();
      const t0 = performance.now();
      const run = (t) => {
        const k = clamp((t - t0) / 1800);
        const v = Math.round(lerp(58, 91, easeInOut(k)));
        ring.style.setProperty('--p', v);
        ringNum.textContent = String(v);
        if (k < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, 500);
  }, { threshold: 0.45 });
  io.observe(resumeArt);
}
function updateResume(y) {
  if (reduced) return;
  const r = { top: L.artTop - y, bottom: L.artTop + L.artH - y, height: L.artH };
  if (r.bottom < 0 || r.top > vh) return;
  const k = (r.top + r.height / 2 - vh / 2) / vh;
  resumeFloats.forEach((el, i) => { el.style.transform = `translate3d(0, ${(k * (i % 2 ? 36 : -28)).toFixed(1)}px, 0)`; });
}

/* ---------------- 24 hours with your agent ---------------- */
const daySec = $('[data-day]');
const dayEvents = $$('[data-ev]');
const notes = $$('[data-note]');
const clockEl = $('[data-clock]');
const ampmEl = $('[data-ampm]');
const sunEl = $('[data-sun]');
const moonEl = $('[data-moon]');
const trackEl = $('[data-track]');
const dayBot = $('[data-day-bot]');
const dockEl = $('[data-dock]');
const daySky = $('.day__sky');
const dayStars = $('.day__stars');
const dayHills = ['1', '2', '3'].map((n) => $(`[data-hill="${n}"]`));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
// hour -> sky top, sky middle, horizon, near hill, middle hill, far hill (all from the brand palette)
const SKY = [
  [5.0, '#0b2a2e', '#1f5f63', '#c98a4a', '#0d241c', '#163a30', '#2a5248'],
  [6.6, '#14474d', '#3c9aa0', '#f3c66b', '#24502f', '#3a7048', '#5f907a'],
  [9.0, '#5d9ed8', '#a6cdec', '#e2ecea', '#3f7a2c', '#6a9a55', '#a3b99e'],
  [13.0, '#4f95d6', '#9cc9ee', '#e6f0ee', '#447f2b', '#6e9f56', '#a9c0a2'],
  [16.5, '#5a98cf', '#b4d2e2', '#f3e3bf', '#4a782c', '#77965a', '#adb894'],
  [18.8, '#1b4a50', '#c9853a', '#f2b542', '#2c3e22', '#4b5a34', '#8a7a4c'],
  [20.4, '#0d2c30', '#2f5a55', '#b8742f', '#11241c', '#1c3530', '#344a44'],
  [22.0, '#071a1c', '#0b2427', '#12393d', '#071c18', '#0c2a26', '#123634'],
  [26.0, '#051416', '#0a2124', '#0f3034', '#061714', '#0a2521', '#10302e'],
  [29.2, '#0b2a2e', '#1f5f63', '#c98a4a', '#0d241c', '#163a30', '#2a5248'],
  [31.5, '#4f8fc7', '#a9cfe0', '#f4dfae', '#3d7530', '#68965a', '#a2b8a0'],
].map(([h, ...c]) => [h, c.map(hex)]);
const EV_HOURS = [6, 11, 15, 20, 26, 31.5];
let dayEv = -1;
let dayMood = '';

// grass-edged hill silhouettes so this section matches the meadow
function grassRidge(base, amp, freq, phase, blade, step, seed) {
  let r = seed;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const ridge = (x) => base - amp * (0.55 * Math.sin(x * freq + phase) + 0.3 * Math.sin(x * freq * 2.3 + phase * 1.7) + 0.15 * Math.sin(x * freq * 5.1));
  let d = `M0 360 L0 ${ridge(0).toFixed(1)}`;
  for (let x = 0; x <= 1440; x += step) {
    const y = ridge(x);
    if (blade > 0) {
      const tip = y - blade * (0.45 + rnd() * 0.9);
      d += ` L${(x + step * 0.35).toFixed(1)} ${tip.toFixed(1)} L${(x + step * 0.7).toFixed(1)} ${(y + 1).toFixed(1)}`;
    } else d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L1440 360 Z`;
}
function buildHills() {
  // the SVG stretches to the screen width, so phones get fewer, wider blades
  const fine = vw < 760 ? 2.4 : 1;
  $('[data-hill="3"]').setAttribute('d', grassRidge(150, 40, 0.004, 1.2, 0, 24, 11));
  $('[data-hill="2"]').setAttribute('d', grassRidge(214, 34, 0.005, 3.1, 6, 6 * fine, 23));
  $('[data-hill="1"]').setAttribute('d', grassRidge(286, 30, 0.0042, 0.4, 13, 5 * fine, 37));
}

function updateDay(y) {
  const r = { top: L.dayTop - y, bottom: L.dayTop + L.dayH - y, height: L.dayH };
  if (r.bottom < 0 || r.top > vh) { nav.classList.remove('is-dark'); dockEl.classList.remove('is-dark'); return; }
  const t = clamp(-r.top / (r.height - vh));
  const seg = t * (EV_HOURS.length - 1);
  const i = Math.min(EV_HOURS.length - 2, Math.floor(seg));
  // linger on each event, then move on
  const f = smooth(clamp((seg - i - 0.2) / 0.6));
  const hour = lerp(EV_HOURS[i], EV_HOURS[i + 1], f);

  let k = 0;
  while (k < SKY.length - 2 && hour > SKY[k + 1][0]) k++;
  const a = SKY[k];
  const b = SKY[k + 1];
  const u = clamp((hour - a[0]) / (b[0] - a[0]));
  const col = a[1].map((c, j) => mix(c, b[1][j], u));
  const skyCss = `linear-gradient(180deg, ${col[0]} 0%, ${col[1]} 58%, ${col[2]} 100%)`;
  if (skyCss !== daySky.dataset.v) { daySky.dataset.v = skyCss; daySky.style.background = skyCss; }
  dayHills.forEach((pth, j) => { if (pth.dataset.v !== col[3 + j]) { pth.dataset.v = col[3 + j]; pth.style.fill = col[3 + j]; } });
  dayStars.style.opacity = (clamp((hour - 20.4) / 1.4) * (1 - clamp((hour - 28.2) / 1.2))).toFixed(3);
  const dark = hour < 7.6 || (hour > 18.4 && hour < 30.2);
  daySec.classList.toggle('is-dark', dark);
  nav.classList.toggle('is-dark', dark && r.top <= 0 && r.bottom > 60);
  dockEl.classList.toggle('is-dark', dark && r.top < vh && r.bottom > vh - 80);

  // the sun and moon arc through the open sky above the hills
  const mobile = mqMobile.matches;
  const horizon = vh * (mobile ? 0.8 : 0.8);
  const lift = vh * (mobile ? 0.2 : 0.17);
  const sunH = hour > 24 ? hour - 24 : hour;
  const sunT = (sunH - 5.4) / 14;
  const sunOn = sunT > -0.04 && sunT < 1.04;
  sunEl.style.opacity = sunOn ? '1' : '0';
  if (sunOn) sunEl.style.transform = `translate3d(${(vw * (0.06 + 0.88 * sunT)).toFixed(0)}px, ${(horizon - Math.sin(Math.PI * clamp(sunT)) * lift).toFixed(0)}px, 0)`;
  const moonT = (hour - 19.4) / 10;
  const moonOn = moonT > 0 && moonT < 1;
  moonEl.style.opacity = moonOn ? String(Math.min(1, Math.sin(Math.PI * moonT) * 3)) : '0';
  if (moonOn) moonEl.style.transform = `translate3d(${(vw * (0.08 + 0.84 * moonT)).toFixed(0)}px, ${(horizon - Math.sin(Math.PI * moonT) * lift * 0.92).toFixed(0)}px, 0)`;

  const h24 = ((hour % 24) + 24) % 24;
  let hh = Math.floor(h24);
  let mm = Math.round(((h24 - hh) * 60) / 5) * 5;
  if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
  // only touch text when it changes: rewriting text forces a layout pass
  const clock = `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')}`;
  if (clockEl.textContent !== clock) clockEl.textContent = clock;
  const ampm = hh < 12 ? 'AM' : 'PM';
  if (ampmEl.textContent !== ampm) ampmEl.textContent = ampm;
  trackEl.style.transform = `scaleX(${t.toFixed(4)})`;

  // the caption follows the clock: whichever event time is nearest
  // the caption and feed show what has already happened by the clock's time
  const ev = EV_HOURS.reduce((n, h, j) => (hour >= h - 0.05 ? j : n), 0);
  if (ev !== dayEv) {
    dayEv = ev;
    dayEvents.forEach((li, j) => li.classList.toggle('is-on', j === ev));
    notes.forEach((n, j) => { n.classList.toggle('is-in', j <= ev); n.classList.toggle('is-new', j === ev); n.classList.toggle('is-old', j < ev - 1); });
  }
  const mood = ev === EV_HOURS.length - 1 ? 'happy' : dark ? 'night' : 'cool';
  if (mood !== dayMood) { dayMood = mood; dayBot.dataset.mood = mood; }
}

/* ---------------- control dial ---------------- */
initControl({ reduced });

/* ---------------- phones: a sticky join button once no other join button is on screen ---------------- */
{
  const dock = $('[data-dock]');
  const watched = $$('[data-join]').filter((a) => !a.closest('.dock, .nav, .msheet, dialog, [data-ticket]')).concat($('.foot')); // the ticket's button hides inside the closed box
  const visible = new Set();
  const sync = () => dock.classList.toggle('is-on', visible.size === 0 && window.scrollY > vh * 0.5);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
    sync();
  });
  watched.forEach((el) => io.observe(el));
  window.addEventListener('scroll', sync, { passive: true });
}

/* ---------------- frame loop: only does work when something moved ---------------- */
let lastY = -1;
function frame(time) {
  if (lenis) lenis.raf(time);
  const y = lenis ? lenis.animatedScroll : window.scrollY;
  if (y !== lastY) {
    lastY = y;
    updateTop(y);
    updateHow(y);
    updateResume(y);
    updateDay(y);
    if (hero.classList.contains('is-gift-open') && L.heroTop + L.heroH - y > 60) nav.classList.add('is-dark');
  }
  requestAnimationFrame(frame);
}
measure();
requestAnimationFrame(frame);
