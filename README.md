# Autoplaced landing page

This is the landing page for Autoplaced, an AI job-search agent for job seekers in India.
The page is static HTML, CSS and JavaScript. A small build step bundles and compresses the files into `dist/`.

Live preview: https://autoplaced-v2-morning.vercel.app

The site has three pages:

| Address | File | Contents |
| --- | --- | --- |
| `/` | `index.html` | The landing page |
| `/join` | `join.html` | Join the waitlist: the founding pass and the six gift boxes |
| `/blog` | `blog.html` | The blog. It has no posts yet. |

## Run the page on your computer

You need Node.js 18 or later and Python 3.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4417. This serves the source files directly, with no build step. On this server, open the join page as `/join.html` and the blog as `/blog.html`. Vercel serves them as `/join` and `/blog`.

## Make a production build

```bash
npm run build
```

The build writes the finished site to `dist/`. It also writes `robots.txt` and `sitemap.xml`.

## Deploy

Vercel runs `npm run build` and serves `dist/`. The settings are in `vercel.json`.

- Set `SITE_URL` (for example `https://www.autoplaced.ai`) in the Vercel project when the site moves to the real domain. Share links and the sitemap use this address.
## Joining: what the backend team must supply

Every "Join the waitlist" button and the hero gift box (after two taps) open `/join`. The flow is:

form (name, phone, dream role, dream company) → save the form → Google sign-in → back to `/join` → the page shows the founding pass and the gift boxes

Set these three addresses in `js/config.js`:

1. `WAITLIST_ENDPOINT`: the page sends the form here (POST, JSON): `{ name, countryCode, phone, phoneE164, dreamRole, dreamCompany, source, referredBy, utm_* }`. Send back `{ "signupId": "..." }`. Send back status 409 if the phone number already joined.
2. `GOOGLE_SIGNIN_URL`: the page then opens `GOOGLE_SIGNIN_URL?signup=<signupId>&next=/join`. The backend signs the person in with Google, links the Google email to the saved form, sets a session cookie and sends the person back to `/join`.
3. `STATE_ENDPOINT`: the page reads the person's state here (GET, with the cookie). Send back `{ name, memberNo, inviteCode, friends, joinedAt, dreamRole, dreamCompany, waitlistCount }`. Send back 401 if the person is not signed in. Because of this call, a page refresh keeps the pass.

Use same-site paths (for example `/api/waitlist`). The security policy in `vercel.json` lets the page send data only to its own address. A Vercel rewrite can pass the calls to the backend.

Invites: each person's invite link is `/join?ref=<inviteCode>`. The form sends `referredBy` (the code of the friend whose link brought this person). The backend counts the friends for each code. `friends` opens the boxes in `GIFT_BOXES` (box 2 at 1 friend, then 3, 5, 7 and 10).

While `WAITLIST_ENDPOINT` is empty, `/join` is a preview on localhost and `*.vercel.app` addresses. It shows the Google step but sends nothing, keeps the pass in the browser, and shows "Preview controls" to add a friend or start again. On any other address it shows an error, so no sign-up is lost without a warning.

Other values in `js/config.js`: `OFFER_ENDS` (when the boxes stop opening; the countdowns use it), `GIFT_BOXES` (the six rewards) and `VIDEOS` (the two homepage videos; put the files in `assets/video/`).

## Folders

| Path | Contents |
| --- | --- |
| `index.html` | The landing page |
| `join.html` | The join page |
| `blog.html` | The blog page |
| `css/styles.css` | All styles and colour tokens, for all three pages |
| `js/config.js` | Values the client can change: WhatsApp community link, the three backend addresses, the offer end date, the six gift boxes, the taps to open the hero box, the two videos |
| `js/main.js` | Start point of the landing page: scrolling, menu, motion, videos |
| `js/hero.js` | The hero gift box (two taps, then `/join`) and the floating job cards |
| `js/join-page.js` | The join page: form, Google step, founding pass, gift boxes, sharing, pass download |
| `js/blog.js` | Start point of the blog page |
| `js/celebrate.js` | The burst of gold paper when the pass is issued |
| `js/bot.js` | The robot mascot |
| `js/dial.js` | The autopilot dial and needle |
| `js/meadow.js` | The 3D meadow behind the closing section (three.js) |
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
