// "You set the dial": a gauge you can drag, and a lane of job cards that shows what each mode does.
const MODES = [
  {
    title: 'You click, it does the rest',
    text: 'The agent finds and scores roles and prepares tailored resumes. You choose what to send, one click each.',
    best: 'Exploring the market quietly',
    angle: -60, big: '1 click', cap: 'for each application', gate: 'Waits for your click', note: 'You send each one',
  },
  {
    title: 'Review a daily batch, approve in bulk',
    text: 'Every application is prepared and waits for your thumbs-up. Only roles above your score threshold make the list.',
    best: 'Employed and open to the right role',
    angle: 0, big: '1 tap', cap: 'approves the whole batch', gate: 'Approve all', note: 'Batched for your OK',
  },
  {
    title: 'Hands-off, within your limits',
    text: 'Applies automatically above your score threshold, up to your daily cap. Anything uncertain still comes to you.',
    best: 'Between roles or serving notice',
    angle: 60, big: '0 taps', cap: 'within your daily cap', gate: '70+ goes through', note: 'Unsure ones wait',
  },
];
const LOGOS = [
  { img: 'cred.png', bg: '#000', cred: true }, { img: 'swiggy.svg', bg: '#fc8019' },
  { img: 'phonepe.svg', bg: '#5f259f' }, { img: 'razorpay.svg', bg: '#0c2451' },
];
const SCORES = [92, 88, 84, 78, 81, 90, 86];
const AUTOPLAY_MS = 6000;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initControl({ reduced }) {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = $('[data-control]');
  const face = $('[data-dial-face]', root);
  const svg = $('svg', face);
  const needle = $('[data-needle]', root);
  const fill = $('[data-dial-fill]', root);
  const ticksG = $('[data-ticks]', root);
  const picks = $$('[data-dial-pick]', root);
  const readout = $('[data-readout]', root);
  const tabs = $$('[role="tab"][data-mode]', root);
  const panel = $('[data-mode-panel]', root);
  const glide = $('[data-glide]', root);
  const progress = $('[data-progress]', root);

  // ticks every 10 degrees; each remembers its angle so it can light up as the needle passes
  const ticks = [];
  for (let d = 0; d <= 180; d += 10) {
    const rad = (Math.PI * (180 - d)) / 180;
    const r1 = d % 30 === 0 ? 104 : 108;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', (160 + Math.cos(rad) * r1).toFixed(1));
    line.setAttribute('y1', (180 - Math.sin(rad) * r1).toFixed(1));
    line.setAttribute('x2', (160 + Math.cos(rad) * 114).toFixed(1));
    line.setAttribute('y2', (180 - Math.sin(rad) * 114).toFixed(1));
    ticksG.appendChild(line);
    ticks.push({ el: line, a: d - 90 });
  }

  let angle = -90;
  function setNeedle(a, animate = true) {
    const from = angle;
    angle = a;
    face.classList.toggle('is-instant', !animate);
    needle.style.transform = `rotate(${a}deg)`;
    fill.style.strokeDashoffset = String(409 * (1 - (a + 90) / 180));
    const span = Math.abs(a - from) || 1;
    ticks.forEach((t) => {
      const lit = t.a <= a + 0.5;
      // light the ticks in the order the needle sweeps past them
      t.el.style.transitionDelay = animate ? `${(Math.abs(t.a - from) / span) * 0.55}s` : '0s';
      t.el.classList.toggle('is-lit', lit);
    });
  }

  const lane = createLane($('[data-lane]', root), reduced);
  let mode = 1;

  function select(i, { focus = false, user = false } = {}) {
    mode = i;
    const m = MODES[i];
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    if (focus) tabs[i].focus();
    picks.forEach((p, k) => p.classList.toggle('is-on', k === i));
    panel.setAttribute('aria-labelledby', tabs[i].id);
    $('[data-mode-title]', panel).textContent = m.title;
    $('[data-mode-text]', panel).textContent = m.text;
    $('[data-mode-best]', panel).textContent = m.best;
    $('b', readout).textContent = m.big;
    $('span', readout).textContent = m.cap;
    for (const el of [panel, readout]) {
      el.classList.remove('is-swap');
      void el.offsetWidth;
      el.classList.add('is-swap');
    }
    glide.style.transform = `translateX(${i * 100}%)`;
    if (started) setNeedle(m.angle);
    lane.setMode(i, m);
    elapsed = 0;
    if (user) stopAutoplay();
  }

  /* ---- autoplay: the dial demonstrates itself until someone touches it ---- */
  let auto = !reduced;
  let elapsed = 0;
  let hovering = false;
  let inView = false;
  let started = false;
  function stopAutoplay() {
    auto = false;
    root.classList.add('is-manual');
  }
  root.addEventListener('pointerenter', () => { hovering = true; });
  root.addEventListener('pointerleave', () => { hovering = false; });
  root.addEventListener('focusin', () => { hovering = true; });
  root.addEventListener('focusout', () => { hovering = false; });

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, { user: true }));
    t.addEventListener('keydown', (e) => {
      const to = { ArrowRight: (i + 1) % 3, ArrowLeft: (i + 2) % 3, Home: 0, End: 2 }[e.key];
      if (to !== undefined) { e.preventDefault(); select(to, { focus: true, user: true }); }
    });
  });
  picks.forEach((p) => p.addEventListener('click', () => select(+p.dataset.dialPick, { user: true })));

  /* ---- drag the needle; it snaps to the nearest mode ---- */
  let dragging = false;
  function angleFrom(e) {
    const r = svg.getBoundingClientRect();
    const cx = r.left + (160 / 320) * r.width;
    const cy = r.top + (180 / 200) * r.height;
    return clamp((Math.atan2(e.clientX - cx, cy - e.clientY) * 180) / Math.PI, -90, 90);
  }
  face.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-dial-pick]')) return;
    dragging = true;
    face.setPointerCapture(e.pointerId);
    face.classList.add('is-dragging');
    stopAutoplay();
    setNeedle(angleFrom(e), false);
  });
  face.addEventListener('pointermove', (e) => { if (dragging) setNeedle(angleFrom(e), false); });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    face.classList.remove('is-dragging');
    select(angle < -30 ? 0 : angle > 30 ? 2 : 1, { user: true });
  };
  face.addEventListener('pointerup', release);
  face.addEventListener('pointercancel', release);

  /* ---- timing: only runs while the section is on screen ---- */
  let last = 0;
  function tick(t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    if (inView) {
      lane.update(dt);
      if (auto && started && !hovering) {
        elapsed += dt * 1000;
        if (elapsed >= AUTOPLAY_MS) { elapsed = 0; select((mode + 1) % 3); }
      }
      progress.style.transform = `scaleX(${auto ? elapsed / AUTOPLAY_MS : 0})`;
      raf = requestAnimationFrame(tick);
    } else raf = 0;
  }
  let raf = 0;
  new IntersectionObserver(([en]) => {
    inView = en.isIntersecting;
    root.classList.toggle('is-live', inView);
    if (inView && !started) {
      started = true;
      // first sight: the needle sweeps in from Manual's far end and settles on the current mode
      setTimeout(() => setNeedle(MODES[mode].angle), reduced ? 0 : 250);
    }
    if (inView && !raf && !reduced) { last = 0; raf = requestAnimationFrame(tick); }
  }, { threshold: 0.3 }).observe(root);

  setNeedle(-90, false);
  if (reduced) { started = true; setNeedle(MODES[1].angle, false); }
  select(1);
}

/* A short road of job cards. The gate in the middle behaves like the chosen mode. */
function createLane(laneEl, reduced) {
  const track = laneEl.querySelector('[data-lane-track]');
  const gate = laneEl.querySelector('[data-gate]');
  const gateLabel = laneEl.querySelector('[data-gate-label]');
  const note = laneEl.querySelector('[data-lane-note]');
  const sentEl = laneEl.querySelector('[data-lane-sent]');
  let chips = [];
  let mode = 1;
  let serial = 0;
  let spawnT = 0;
  let actT = 0;
  let releasing = false;
  let sent = 0;
  let W = track.clientWidth || 400;
  new ResizeObserver(() => { W = track.clientWidth; }).observe(track);
  const gateX = () => W * 0.6;
  const CHIP = 68;

  function make(kind) {
    const L = LOGOS[serial % LOGOS.length];
    const score = kind === 'low' ? 58 : kind === 'ask' ? 74 : SCORES[serial % SCORES.length];
    serial++;
    const el = document.createElement('span');
    el.className = `chip chip--${kind}`;
    el.innerHTML = `<i style="--c:${L.bg}"${L.cred ? ' class="is-cred"' : ''}><img src="assets/logos/${L.img}" alt="" width="14" height="14"></i><b>${score}</b>`;
    track.appendChild(el);
    const c = { el, x: -CHIP - 10, y: 0, o: 0, s: 1, kind, state: 'in', q: 0 };
    chips.push(c);
    return c;
  }
  function kindFor() {
    if (mode !== 2) return 'ok';
    const n = serial % 6;
    return n === 3 ? 'ask' : n === 5 ? 'low' : 'ok';
  }
  const queue = () => chips.filter((c) => c.state === 'in' || c.state === 'wait');

  function setMode(i, m) {
    mode = i;
    laneEl.dataset.laneMode = String(i);
    gateLabel.textContent = m.gate;
    note.textContent = m.note;
    chips.forEach((c) => { c.state = 'out'; });
    sent = 0;
    sentEl.textContent = '0';
    spawnT = 0.2;
    actT = 0;
    releasing = false;
    if (reduced) staticLayout();
  }

  function pass(c, delay = 0) {
    setTimeout(() => { c.state = 'go'; }, delay);
  }
  function tap() {
    gate.classList.remove('is-tap');
    void gate.offsetWidth;
    gate.classList.add('is-tap');
  }

  function update(dt) {
    spawnT -= dt;
    actT += dt;
    const waiting = queue();
    const limit = mode === 0 ? 3 : mode === 1 ? 4 : 99;
    const every = mode === 0 ? 1.3 : mode === 1 ? 0.75 : 0.7;
    if (spawnT <= 0 && waiting.length < limit && !releasing) {
      make(kindFor());
      spawnT = every;
    }

    // manual: one click releases the front card; approve-first: a full batch goes together
    if (mode === 0 && actT > 2.1) {
      const front = waiting.find((c) => c.state === 'wait');
      if (front) { tap(); pass(front); actT = 0; }
    }
    if (mode === 1 && !releasing && waiting.filter((c) => c.state === 'wait').length >= 4) {
      releasing = true;
      gate.classList.add('is-ready');
      setTimeout(() => {
        tap();
        gate.classList.remove('is-ready');
        queue().forEach((c, k) => pass(c, k * 110));
        setTimeout(() => { releasing = false; }, 600);
      }, 900);
    }

    const gx = gateX();
    let qi = 0;
    for (const c of chips) {
      if (c.state === 'in' || c.state === 'wait') {
        if (mode === 2) {
          c.x += 150 * dt;
          if (c.x + CHIP / 2 >= gx) {
            if (c.kind === 'low') c.state = 'drop';
            else if (c.kind === 'ask') c.state = 'aside';
            else c.state = 'go';
          }
        } else {
          // queue up at the gate, newest at the back, like a small stack of cards
          const target = gx - CHIP - 8 - qi * 16;
          c.x += (target - c.x) * Math.min(1, dt * 5);
          c.y += (-qi * 2 - c.y) * Math.min(1, dt * 6);
          c.s += (1 - qi * 0.04 - c.s) * Math.min(1, dt * 6);
          if (Math.abs(target - c.x) < 2) c.state = 'wait';
          // the card nearest the gate sits on top; the ones behind peek out with their logos
          c.el.style.zIndex = String(20 - qi);
          qi++;
        }
        c.o = Math.min(1, c.o + dt * 4);
      } else if (c.state === 'go') {
        c.el.style.zIndex = '30';
        c.x += 210 * dt;
        c.y += (0 - c.y) * Math.min(1, dt * 8);
        c.s += (1 - c.s) * Math.min(1, dt * 8);
        if (c.x > W - CHIP - 6) {
          c.o -= dt * 4;
          if (!c.counted) { c.counted = true; sent++; sentEl.textContent = String(sent); }
        }
      } else if (c.state === 'drop') {
        c.y += 40 * dt;
        c.o -= dt * 2.2;
      } else if (c.state === 'aside') {
        c.x += (gx + 14 - c.x) * Math.min(1, dt * 5);
        c.y += (40 - c.y) * Math.min(1, dt * 5);
        const aside = chips.filter((k) => k.state === 'aside');
        if (aside.length > 2) aside[0].state = 'drop';
      } else if (c.state === 'out') {
        c.o -= dt * 5;
      }
      c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) scale(${c.s.toFixed(3)})`;
      c.el.style.opacity = String(clamp(c.o, 0, 1).toFixed(3));
    }
    chips = chips.filter((c) => {
      if (c.o <= 0 && c.state !== 'in') { c.el.remove(); return false; }
      return true;
    });
  }

  // reduced motion: a still picture of the same idea
  function staticLayout() {
    chips.forEach((c) => c.el.remove());
    chips = [];
    const gx = gateX();
    const n = mode === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const c = make(mode === 2 && i === 2 ? 'ask' : 'ok');
      c.o = 1;
      if (mode === 2) { c.x = i === 2 ? gx + 14 : i < 2 ? 20 + i * 90 : W - CHIP - 10; c.y = i === 2 ? 40 : 0; } else { c.x = gx - CHIP - 8 - i * 16; c.y = -i * 2; }
      c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      c.el.style.opacity = '1';
    }
  }

  return { setMode, update };
}
