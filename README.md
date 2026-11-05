# Autoplaced landing page

This is the landing page for Autoplaced, an AI job-search agent for job seekers in India.
The page is static HTML, CSS and JavaScript. A small build step bundles and compresses the files into `dist/`.

Live preview: https://autoplaced-redesign.vercel.app

## Run the page on your computer

You need Node.js 18 or later and Python 3.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4417. This serves the source files directly, with no build step.

## Make a production build

```bash
npm run build
```

The build writes the finished site to `dist/`. It also writes `robots.txt` and `sitemap.xml`.

## Deploy

Vercel runs `npm run build` and serves `dist/`. The settings are in `vercel.json`.

- Set `SITE_URL` (for example `https://www.autoplaced.ai`) in the Vercel project when the site moves to the real domain. Share links and the sitemap use this address.
- The page reads the live seat count from `/api/seats`. Vercel sends this request to `https://www.autoplaced.ai/api/seats`.

## Folders

| Path | Contents |
| --- | --- |
| `index.html` | The page |
| `css/styles.css` | All styles and colour tokens |
| `js/main.js` | Start point: scrolling, menu, motion |
| `js/bot.js` | The robot mascot |
| `js/dial.js` | The autopilot dial and needle |
| `js/meadow.js` | The 3D night scene (three.js) |
| `assets/` | Icons, share image and company logos |
| `fonts/` | Geist and Instrument Serif (SIL Open Font License) |
| `og.html` | Source for the share image `assets/og.jpg` |
| `build.mjs` | The production build |
