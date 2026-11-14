# The orbit section: "Where it applies"

This folder has the "Where it applies" section: the robot in the centre, with three turning rings of job-site logos (ATS portals, job boards and company career pages).

The section was on the landing page until 11 November 2026. The sitemap for the final page did not include it, so the page does not show it now. This folder keeps the section as a page of its own, so that you can use it again.

## See the section

The page needs a local server, because browsers do not load its script from a `file://` address. In the project folder:

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:4417/extras/orbit/

## Files

| File | Contents |
| --- | --- |
| `index.html` | The section |
| `orbit.css` | The styles for the section: colours, fonts, headings, the button, the robot and the orbit. They are copied from `css/styles.css` as it was in commit `77d4596`. |
| `orbit.js` | Draws the robot in the centre. Stops the rings when the section is off screen. |

The page uses the logos in `assets/logos/`, the fonts in `fonts/` and the robot script `js/bot.js`. Keep this folder at `extras/orbit/` so that these paths work.

The production build (`npm run build`) does not include this folder, so it is not on the live site.

## Put the section back on the landing page

1. Copy the `<section class="reach">` block from `index.html` into the main `index.html`, at the place where you want it. In the copied block, change the logo paths from `../../assets/logos/` to `assets/logos/`.
2. Copy these rules from `orbit.css` into `css/styles.css`: the rules that start with `.reach` or `.orbit` (also the ones inside the `@media` blocks), and `@keyframes orbit`. The other rules are in `css/styles.css` already.
3. Copy the last two lines of `orbit.js` into `js/main.js`. They stop the rings when the section is off screen.

To see the whole page as it was with the section, run `git show 77d4596:index.html`.
