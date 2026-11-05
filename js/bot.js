// The Autoplaced bot, redrawn as SVG so it stays sharp and can change expression.
// Usage: <span data-bot="cool"></span>  moods: cool | skeptic | happy | night
let uid = 0;

export function botMarkup() {
  const id = `bot${uid++}`;
  return `
<svg class="bot" viewBox="0 0 400 384" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6fd5db"/><stop offset=".55" stop-color="#4cc0c8"/><stop offset="1" stop-color="#36a8b1"/>
    </linearGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16393d"/><stop offset="1" stop-color="#0b2528"/>
    </linearGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8cd6a"/><stop offset="1" stop-color="#eea52c"/>
    </linearGradient>
    <radialGradient id="${id}g" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#ffd978" stop-opacity=".9"/><stop offset="1" stop-color="#ffd978" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g class="bot__antenna">
    <path d="M204 96 L232 40" stroke="#3fb3bb" stroke-width="12" stroke-linecap="round"/>
    <circle class="bot__halo" cx="234" cy="28" r="44" fill="url(#${id}g)"/>
    <circle class="bot__bulb" cx="234" cy="28" r="21" fill="#f2b542"/>
    <circle cx="227" cy="21" r="6" fill="#fff" opacity=".55"/>
  </g>
  <rect x="2" y="198" width="36" height="76" rx="15" fill="#0a4f57"/>
  <rect x="362" y="198" width="36" height="76" rx="15" fill="#0a4f57"/>
  <rect x="28" y="88" width="344" height="292" rx="76" fill="url(#${id}h)"/>
  <path d="M84 110 Q128 98 176 100" stroke="#fff" stroke-opacity=".38" stroke-width="9" stroke-linecap="round" fill="none"/>
  <rect x="70" y="130" width="260" height="206" rx="50" fill="url(#${id}f)"/>
  <rect x="70" y="130" width="260" height="206" rx="50" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="4"/>

  <g class="bot__face bot__face--cool">
    <path d="M86 188 H182 Q190 188 189 196 L184 230 Q180 252 158 252 H112 Q90 252 86 230 L81 196 Q80 188 86 188 Z" fill="url(#${id}l)"/>
    <path d="M218 188 H314 Q320 188 319 196 L315 230 Q311 252 288 252 H242 Q220 252 216 230 L211 196 Q210 188 218 188 Z" fill="url(#${id}l)"/>
    <rect x="182" y="194" width="36" height="12" rx="5" fill="#eea52c"/>
    <path d="M100 205 L128 199" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>
    <path d="M236 205 L262 199" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>
    <path d="M140 292 Q178 306 222 282" stroke="#e8efed" stroke-width="12" stroke-linecap="round" fill="none"/>
  </g>

  <g class="bot__face bot__face--skeptic">
    <path d="M104 166 Q134 158 166 168" stroke="#e8efed" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M236 160 Q262 140 294 154" stroke="#e8efed" stroke-width="9" stroke-linecap="round" fill="none"/>
    <g class="bot__eyes">
      <circle cx="138" cy="208" r="17" fill="#f4f7f6"/><circle cx="143" cy="211" r="8.5" fill="#0b2528"/>
      <circle cx="266" cy="203" r="21" fill="#f4f7f6"/><circle cx="261" cy="208" r="10" fill="#0b2528"/>
    </g>
    <path d="M84 238 H184 L178 268 Q175 284 156 284 H112 Q92 284 88 268 Z" fill="url(#${id}l)"/>
    <path d="M216 238 H316 L312 268 Q309 284 290 284 H244 Q224 284 220 268 Z" fill="url(#${id}l)"/>
    <rect x="182" y="242" width="36" height="11" rx="5" fill="#eea52c"/>
    <path d="M98 250 L124 246" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/>
    <path d="M178 312 Q208 318 236 302" stroke="#e8efed" stroke-width="10" stroke-linecap="round" fill="none"/>
  </g>

  <g class="bot__face bot__face--happy">
    <path d="M110 226 Q138 194 166 226" stroke="#f2b542" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M234 226 Q262 194 290 226" stroke="#f2b542" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M150 272 Q200 312 250 272" stroke="#e8efed" stroke-width="12" stroke-linecap="round" fill="none"/>
    <circle cx="112" cy="268" r="13" fill="#f2b542" opacity=".28"/><circle cx="288" cy="268" r="13" fill="#f2b542" opacity=".28"/>
  </g>
</svg>`;
}

export function mountBots(root = document) {
  root.querySelectorAll('[data-bot]').forEach((el) => {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    el.classList.add('botwrap');
    if (!el.dataset.mood) el.dataset.mood = el.dataset.bot || 'cool';
    el.insertAdjacentHTML('afterbegin', botMarkup());
  });
}
