// The moment someone joins: gold paper pieces and sparkles burst from their ticket and drift down.
// The sky, clouds and the bot are CSS (see .join.is-done in styles.css); this draws only the burst.

const COLORS = ['#f2b542', '#f8d27a', '#fde8a8', '#e59f22', '#4cc0c8', '#fbf7ec'];

export function celebrate({ canvas, from, reduced }) {
  try { navigator.vibrate?.([14, 70, 20, 70, 34]); } catch { /* not supported */ }
  if (reduced || !canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const r = from.getBoundingClientRect();
  const ox = r.left + r.width / 2;
  const oy = r.top + r.height * 0.42;
  const small = W < 600;
  const parts = [];
  const add = (p) => parts.push({ rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.3, flip: Math.random() * Math.PI, life: 0, ...p });
  // a burst out of the ticket
  for (let i = 0; i < (small ? 70 : 110); i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = 7 + Math.random() * (small ? 9 : 12);
    add({ x: ox + (Math.random() - 0.5) * 60, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: COLORS[(Math.random() * COLORS.length) | 0], star: Math.random() < 0.16, delay: 0 });
  }
  // then a soft fall from the top
  for (let i = 0; i < (small ? 30 : 50); i++) {
    add({ x: Math.random() * W, y: -20 - Math.random() * 120, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2, w: 6 + Math.random() * 5, h: 3 + Math.random() * 3, c: COLORS[(Math.random() * COLORS.length) | 0], star: Math.random() < 0.2, delay: 260 + Math.random() * 500 });
  }

  const t0 = performance.now();
  let last = t0;
  function star(x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 ? s * 0.32 : s;
      const a = (i * Math.PI) / 4;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }
  function frame(now) {
    const k = Math.min(3, (now - last) / 16.7);
    last = now;
    const age = now - t0;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of parts) {
      if (age < p.delay) { alive++; continue; }
      p.life += k;
      p.vx *= Math.pow(0.985, k);
      p.vy = p.vy * Math.pow(0.985, k) + 0.24 * k;
      p.x += p.vx * k + Math.sin((p.life + p.flip * 20) / 14) * 0.6 * k;
      p.y += p.vy * k;
      p.rot += p.spin * k;
      p.flip += 0.12 * k;
      const fade = Math.min(1, Math.max(0, (220 - p.life) / 60));
      if (p.y > H + 30 || fade <= 0) continue;
      alive++;
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.c;
      if (p.star) { star(p.x, p.y, 5 + (Math.sin(p.life / 6) + 1) * 1.5); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip)); // paper turning over as it falls
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (alive) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}
