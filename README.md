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
- The waitlist form sends its data to `WAITLIST_ENDPOINT` in `js/config.js`. The backend team owns that endpoint. While it is empty, the form shows the "You're in" screen and sends nothing.

## Folders

| Path | Contents |
| --- | --- |
| `index.html` | The page |
| `css/styles.css` | All styles and colour tokens |
| `js/config.js` | Values the client can change: WhatsApp community link, waitlist endpoint, taps to open the box, the gift list |
| `js/main.js` | Start point: scrolling, menu, motion |
| `js/hero.js` | The hero gift box |
| `js/join.js` | The "Join the waitlist" form and the "You're in" screen |
| `js/celebrate.js` | The burst of gold paper when someone joins |
| `js/bot.js` | The robot mascot |
| `js/dial.js` | The autopilot dial and needle |
| `js/meadow.js` | The 3D meadow behind the closing section (three.js) |
| `js/dawn.js` | The hero's sunrise field, seen from grass height (three.js, reuses the meadow's grass) |
| `assets/` | Icons, share image and company logos |
| `fonts/` | Geist and Instrument Serif (SIL Open Font License) |
| `og.html` | Source for the share image `assets/og.jpg` |
| `build.mjs` | The production build |
| `brand/logo-options/` | Six logo directions: SVG and PNG files, plus one board image for each direction. These files are not part of the site build or the Vercel upload. |

## Logo options

There are six directions. None is final yet.

| No. | Name | Idea |
| --- | --- | --- |
| 01 | Buddy | The robot mascot, redrawn on a strict grid |
| 02 | Shades | A capital A that wears the robot's sunglasses |
| 03 | Autopilot | A lowercase a with a dial inside, needle at full |
| 04 | Night Shift | A moon that holds a tick: you sleep, it applies |
| 05 | Signature | "auto" in Geist and "placed" in Instrument Serif italic |
| 06 | Seal | A placement-cell stamp with the robot in the centre |

Each direction has these files in `svg/` and `png/`:

- `mark` and `mark-white`: the symbol alone, for light and dark backgrounds
- `lockup` and `lockup-white`: the symbol with the name, for light and dark backgrounds
- `icon`: the app icon

The text in the name versions is converted to shapes, so the files work with no fonts installed.
