// Production build: bundles and minifies the scripts (three.js trimmed to what the meadow uses),
// minifies the CSS, fingerprints every file name so browsers can cache it forever, and writes dist/.
// Run: npm run build   (Vercel runs this automatically on deploy)
import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'dist';
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const js = await esbuild.build({
  entryPoints: ['js/main.js'],
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: ['es2020', 'safari15'],
  outdir: `${OUT}/js`,
  entryNames: '[name]-[hash]',
  chunkNames: 'c-[hash]',
  legalComments: 'none',
  sourcemap: true,
  metafile: true,
});

const css = await esbuild.build({
  entryPoints: ['css/styles.css'],
  bundle: true,
  minify: true,
  outdir: `${OUT}/css`,
  entryNames: '[name]-[hash]',
  assetNames: '../fonts/[name]-[hash]',
  loader: { '.woff2': 'file' },
  metafile: true,
});

const rel = (p) => path.relative(OUT, p).split(path.sep).join('/');
const jsOut = Object.entries(js.metafile.outputs);
const mainJs = rel(jsOut.find(([, o]) => o.entryPoint === 'js/main.js')[0]);
// the meadow and three.js load right after the page: start fetching them in parallel
const meadowChunks = jsOut
  .filter(([file, o]) => file.endsWith('.js') && o.entryPoint !== 'js/main.js' && (o.entryPoint === 'js/meadow.js' || Object.keys(o.inputs).some((i) => i.includes('node_modules/three'))))
  .map(([file]) => rel(file));
const cssOut = Object.keys(css.metafile.outputs);
const mainCss = rel(cssOut.find((f) => f.endsWith('.css')));
const font = (name) => rel(cssOut.find((f) => new RegExp(`^${name}-[A-Z0-9]{8}\\.woff2$`).test(path.basename(f))));

let html = await fs.readFile('index.html', 'utf8');
html = html
  .replace(/<!-- dev only:[^>]*-->\s*<script type="importmap">[\s\S]*?<\/script>\s*/, '')
  .replace('href="css/styles.css"', `href="${mainCss}"`)
  .replace('href="fonts/geist-latin.woff2"', `href="${font('geist-latin')}"`)
  .replace('<script type="module" src="js/main.js"></script>', `<script type="module" src="${mainJs}"></script>`)
  ;
// note: the 3D bundle is not preloaded on purpose; fetching it early slowed the stylesheet and first paint
void meadowChunks;
// The public address of the site. Set SITE_URL (for example https://www.autoplaced.ai) in the
// Vercel project's environment when it moves to the real domain; share links and the sitemap follow it.
const SITE = (process.env.SITE_URL || 'https://autoplaced-redesign.vercel.app').replace(/\/$/, '');
html = html.replaceAll('https://autoplaced-redesign.vercel.app', SITE);
await fs.writeFile(`${OUT}/index.html`, html);
await fs.writeFile(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await fs.writeFile(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
await fs.writeFile(`${OUT}/404.html`, (await fs.readFile('404.html', 'utf8')).replace('__CSS__', mainCss));
await fs.copyFile('site.webmanifest', `${OUT}/site.webmanifest`);

await fs.mkdir(`${OUT}/assets/logos`, { recursive: true });
for (const f of ['icon.svg', 'icon-32.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'og.jpg', 'bot.png']) await fs.copyFile(`assets/${f}`, `${OUT}/assets/${f}`);
for (const f of await fs.readdir('assets/logos')) await fs.copyFile(`assets/logos/${f}`, `${OUT}/assets/logos/${f}`);

const sizes = Object.entries({ ...js.metafile.outputs, ...css.metafile.outputs }).map(([f, o]) => `${rel(f)} ${(o.bytes / 1024).toFixed(1)}KB`);
console.log(sizes.join('\n'));
