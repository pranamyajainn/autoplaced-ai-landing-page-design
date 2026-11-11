import { mountBots } from './bot.js';
import { initGift } from './hero.js';
import { WHATSAPP_COMMUNITY_URL, VIDEOS } from './config.js';

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
// a friend's invite link may land here (/?ref=CODE): keep the code for when this person joins on /join
{
  const ref = (new URLSearchParams(location.search).get('ref') || '').trim();
  if (/^[A-Za-z0-9_-]{4,40}$/.test(ref)) { try { localStorage.setItem('ap-ref', ref); } catch { /* storage blocked */ } }
}

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
function scrollToY(y) {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
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
    const card = stepCards.indexOf(t);
    if (card >= 0) scrollToY(L.dayTop + ((card + 0.1) / (EV_HOURS.length - 1)) * (L.dayH - vh));
    else scrollToTarget(t);
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
// phones: the Features row opens to show its links
const sheetFeat = $('[data-sheet-feat]');
const sheetFeats = $('#msheet-feats');
function showSheetFeats(v) { sheetFeat.setAttribute('aria-expanded', String(v)); sheetFeats.hidden = !v; }
sheetFeat.addEventListener('click', () => showSheetFeats(sheetFeats.hidden));
function closeMenu(returnFocus = false) {
  if (!isMenuOpen()) return;
  showSheetFeats(false);
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
$$('.msheet__links > li > a, [data-sheet-feat]').forEach((a, i) => {
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

/* ---------------- Features menu in the nav (wide screens) ---------------- */
{
  const feat = $('[data-feat]');
  const btn = $('[data-feat-btn]');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  let timer = 0;
  const isOpen = () => feat.classList.contains('is-open');
  const setOpen = (v) => { clearTimeout(timer); feat.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); };
  // a mouse opens it by pointing at it; a click, a tap or the keyboard opens and closes it
  btn.addEventListener('click', (e) => setOpen(e.detail > 0 && mouse.matches ? true : !isOpen()));
  feat.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mouse.matches) setOpen(true); });
  feat.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') timer = setTimeout(() => setOpen(false), 200); });
  feat.addEventListener('focusout', (e) => { if (!feat.contains(e.relatedTarget)) setOpen(false); });
  document.addEventListener('click', (e) => { if (isOpen() && !feat.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); } });
  $$('a', feat).forEach((a) => a.addEventListener('click', () => setOpen(false)));
}

/* ---------------- live meadow ----------------
   The meadow is on screen from the first paint as still frames of the 3D scene. The live scene is then built
   out of sight, drawn hidden for a moment while the page measures its frame rate, and faded in over the stills
   only if the page stays smooth. Phones that should not run it at all keep the stills and never download it. */
let meadow = null;
const sceneEl = $('[data-scene]');
const frontEl = $('[data-front]');
const frontStill = $('[data-front-still]');
const hasWebGL = 'WebGL2RenderingContext' in window || 'WebGLRenderingContext' in window;
const conn = navigator.connection || {};
// ?meadow=still shows what those phones see, for checking
const stillsOnly = new URLSearchParams(location.search).get('meadow') === 'still' || !hasWebGL || reduced || conn.saveData === true || /2g|3g/.test(conn.effectiveType || '') || (navigator.deviceMemory || 8) <= 2;
// the golden stills behind the closing section load later, and only where the live scene is not running
let goldenLoaded = false;
function loadGoldenStills() {
  if (goldenLoaded) return;
  goldenLoaded = true;
  $$('[data-golden] source').forEach((s) => { s.srcset = s.dataset.srcset; });
  $$('[data-golden] img').forEach((i) => { i.src = i.dataset.src; });
}
function useStills(reason) {
  root.classList.remove('meadow-ready');
  root.dataset.meadow = reason;
  loadGoldenStills();
}
// the frame-rate check, in rounds of one second with the scene on screen: smooth (about 50 fps or more) shows the
// live scene; clearly too slow (under 25 fps) gives up at once; in between, up to three rounds while it lowers its resolution
const gate = { on: false, frames: [], tries: 0, last: 0, start: 0 };
function gateTick(t) {
  if (!gate.on) return;
  if (sceneEl.classList.contains('is-off') || document.hidden) { gate.last = 0; gate.start = 0; gate.frames = []; return; }
  if (!gate.start) gate.start = t;
  if (gate.last && t - gate.start > 200) gate.frames.push(t - gate.last); // the first frames after a change are always uneven
  gate.last = t;
  if (t - gate.start < 1200 || gate.frames.length < 20) return;
  const f = gate.frames;
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  const slow = f.filter((ms) => ms > 34).length / f.length;
  gate.frames = [];
  gate.start = 0;
  if (avg <= 21 && slow <= 0.08) {
    gate.on = false;
    root.classList.add('meadow-ready');
    root.dataset.meadow = 'ready';
  } else if (avg > 40 || ++gate.tries >= 3) {
    gate.on = false;
    meadow?.destroy();
    meadow = null;
    useStills('still-slow');
  }
}
function loadMeadow() {
  import('./meadow.js')
    .then(async ({ createMeadow }) => {
      const m = await createMeadow({
        back: $('[data-back]'), front: frontEl, reduced,
        onLost: (l) => { if (l && meadow) useStills('still-lost'); },
        onReady: () => { gate.on = true; },
      });
      meadow = m;
      sceneMode = '';
      lastY = -1;
    })
    .catch(() => useStills('still-error'));
}
// the day starts in the morning meadow behind the gift box and ends in the golden one behind the closing section
const MORNING = 0.16; // how far the meadow's light leans from midday towards golden hour
let sceneMode = '';
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 400));
const afterLoad = (fn) => (document.readyState === 'complete' ? whenIdle(fn) : window.addEventListener('load', () => whenIdle(fn), { once: true }));
if (stillsOnly) { root.dataset.meadow = 'still'; afterLoad(loadGoldenStills); }
else afterLoad(loadMeadow);

/* ---------------- hero ---------------- */
const hero = $('[data-hero]');
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

let vw = window.innerWidth;
let vh = window.innerHeight;
// Layout is read once here, never inside the scroll loop: reading it there forces the browser
// to recalculate the page every frame, which is what makes scrolling stutter.
const L = {};
const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;
function measure() {
  vw = window.innerWidth;
  // keep the stage steady while mobile browser bars slide in and out
  const h = window.innerHeight;
  if (Math.abs(h - vh) > 120 || !mqMobile.matches) vh = h;
  L.heroTop = pageTop(hero); L.heroH = hero.offsetHeight;
  L.finalTop = pageTop(finalSec);
  L.dayTop = pageTop(daySec); L.dayH = daySec.offsetHeight;
  // where each step card starts; on phones the cards are as tall as their content, so the steps differ
  L.stepTops = stepCards.map((c) => c.offsetTop - stepCards[0].offsetTop);
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

let heroSy = -1;
// only the layers that drift read the scroll value, so the rest of the hero is not restyled every frame
const heroLayers = [$('[data-field]'), $('.hero__bg')];
function updateTop(y) {
  const heroBottom = L.heroTop + L.heroH - y;
  nav.classList.toggle('is-solid', heroBottom < 90);

  // the poster's layers drift apart as it scrolls away: near cards fastest, the sun slowest
  const sy = reduced ? 0 : Math.round(clamp(y / Math.max(1, L.heroH)) * 1000) / 1000;
  if (sy !== heroSy && heroBottom > -40) { heroSy = sy; heroLayers.forEach((el) => el.style.setProperty('--sy', String(sy))); }

  // the meadow: morning behind the hero, golden hour behind the closing section, off in between
  const fr = L.finalTop - y;
  const heroOn = heroBottom > -40;
  const finalOn = fr < vh + 40;
  const on = heroOn || finalOn;
  sceneEl.classList.toggle('is-off', !on);
  frontEl.classList.toggle('is-off', !on);
  frontStill.classList.toggle('is-off', !on);
  const mode = heroOn ? 'hero' : finalOn ? 'final' : 'off';
  if (mode !== sceneMode && mode !== 'off') {
    sceneMode = mode;
    sceneEl.classList.toggle('is-golden', mode === 'final');
    sceneEl.classList.toggle('is-morning', mode === 'hero');
    frontStill.classList.toggle('is-golden', mode === 'final');
    if (meadow) meadow.setMood(mode === 'final' ? 1 : MORNING, true);
  }
  if (meadow) {
    meadow.setActive(on);
    if (mode === 'hero') meadow.setProgress(lerp(0, 0.16, sy));
    else if (finalOn) meadow.setProgress(lerp(0.55, 0, easeInOut(clamp(1 - fr / vh))));
  }
}

/* ---------------- the two videos: a real player once the file is set in config.js ---------------- */
$$('[data-video]').forEach((frame) => {
  const v = VIDEOS[frame.dataset.video];
  if (!v || !v.src) return;
  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'none';
  if (v.poster) video.poster = v.poster;
  video.src = v.src;
  frame.replaceChildren(video);
});

/* ---------------- the moving strip of job sites: a Pause button, and it rests while off screen ---------------- */
{
  const sites = $('[data-sites]');
  const btn = $('[data-sites-pause]', sites);
  btn.addEventListener('click', () => {
    const paused = sites.classList.toggle('is-paused');
    btn.textContent = paused ? 'Play' : 'Pause';
  });
  new IntersectionObserver(([en]) => sites.classList.toggle('is-away', !en.isIntersecting)).observe(sites);
}

/* ---------------- how it works: 24 hours with your agent ----------------
   Scrolling through the section moves the clock from 6 AM to 2 AM in four parts. In each part one step card
   slides into view (Find, Tailor, Apply, Follow up), and the agent's alerts stack up as the clock reaches them. */
const daySec = $('[data-day]');
const dayEvents = $$('[data-ev]');
const notes = $$('.feed .note').map((el) => ({ el, hour: Number(el.dataset.hour), rank: '' }));
const stepTrack = $('[data-steps]');
const stepCards = $$('.stepc', stepTrack);
const railEl = $('[data-rail]');
const hintEl = $('[data-day-hint]');
let stepY = -1;
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
// the clock stops at each of these hours: 6 AM, 11 AM, 3 PM, 9 PM and 2 AM (26 is 2 AM the next day)
const EV_HOURS = [6, 11, 15, 21, 26];
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
  // the step cards move with the clock: Find at 6 AM, Tailor at 11 AM, Apply at 3 PM, Follow up from 9 PM
  const pos = Math.min(stepCards.length - 1, i + f);
  const at = Math.floor(pos);
  const sy = Math.round(lerp(L.stepTops[at], L.stepTops[Math.min(stepCards.length - 1, at + 1)], pos - at));
  if (sy !== stepY) { stepY = sy; stepTrack.style.transform = `translate3d(0, ${-sy}px, 0)`; }
  railEl.style.transform = `scaleY(${t.toFixed(4)})`;
  hintEl.classList.toggle('is-gone', t > 0.02);

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

  // the caption shows what has already happened by the clock's time
  const ev = EV_HOURS.reduce((n, h, j) => (hour >= h - 0.05 ? j : n), 0);
  if (ev !== dayEv) {
    dayEv = ev;
    dayEvents.forEach((li, j) => li.classList.toggle('is-on', j === ev));
  }
  // the alerts stack up: the newest on top, the two before it fading below, older ones gone
  const reached = notes.reduce((n, x) => (x.hour <= hour + 0.05 ? n + 1 : n), 0);
  notes.forEach((x, j) => {
    const k = reached - 1 - j;
    const rank = k < 0 ? 'next' : k > 2 ? 'old' : String(k);
    if (rank !== x.rank) { x.rank = rank; x.el.dataset.rank = rank; }
  });
  const mood = dark ? 'night' : 'cool';
  if (mood !== dayMood) { dayMood = mood; dayBot.dataset.mood = mood; }
}

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
  gateTick(time);
  const y = lenis ? lenis.animatedScroll : window.scrollY;
  if (y !== lastY) {
    lastY = y;
    updateTop(y);
    updateDay(y);
    // over the dark stage the header stays light paper, so it stands apart from the stage
    nav.classList.toggle('is-stage', hero.classList.contains('is-gift-open') && L.heroTop + L.heroH - y > 60);
  }
  requestAnimationFrame(frame);
}
measure();
requestAnimationFrame(frame);
