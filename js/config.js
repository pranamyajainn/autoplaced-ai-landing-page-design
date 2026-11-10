// Everything the client may want to change without touching the page code.

// The WhatsApp community link. Every "WhatsApp community" button on the site uses this one value.
export const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/GgEHnv7hqaL8yybgLZDFUe';

// ---------------------------------------------------------------------------------------------
// Joining (the /join page). The backend team owns these three addresses.
//
// 1. The form is saved:   POST WAITLIST_ENDPOINT  (JSON)
//      { name, countryCode, phone, phoneE164, dreamRole, dreamCompany, source, referredBy, utm_* }
//      referredBy: the invite code of the friend whose link brought this person here (empty if none).
//      Answer: 200/201 with JSON { "signupId": "..." }. 409 means this phone number already joined.
// 2. Google sign-in:      the browser goes to GOOGLE_SIGNIN_URL?signup=<signupId>&next=/join
//      The backend signs the person in with Google, links the Google email to the saved form,
//      starts a session (a cookie) and sends the person back to /join.
// 3. The person's state:  GET STATE_ENDPOINT  (with the session cookie)
//      Answer: 200 with JSON { name, memberNo, inviteCode, friends, joinedAt, dreamRole, dreamCompany, waitlistCount }
//      friends: how many people joined with this person's invite link. It opens the gift boxes below.
//      401 or 404 means not signed in: the page shows the form.
//
// Use same-site paths such as '/api/waitlist': the site's security policy only lets the browser
// send data to its own address (a Vercel rewrite can pass them on to the backend).
// While WAITLIST_ENDPOINT is empty, the page works as a preview on localhost and *.vercel.app:
// it fakes the Google step, remembers the pass in this browser and shows preview controls.
// On any other address it shows an error instead, so no sign-up is lost silently.
export const WAITLIST_ENDPOINT = '';
export const GOOGLE_SIGNIN_URL = '';
export const STATE_ENDPOINT = '';

// When the gift boxes stop opening (India time). The countdowns on /join count down to this.
// After it passes, the countdowns are hidden. Confirm the date with the client.
export const OFFER_ENDS = '2026-11-15T23:59:59+05:30';

// The six gift boxes on /join. Box 1 opens when someone joins; the others open when this many
// friends have joined with their invite link. Until a box opens it shows as "Mystery reward".
// These rewards come from the client's own prototype; confirm them before launch.
export const GIFT_BOXES = [
  { title: 'Founding pass', sub: 'First access · 5 tailorings · expert session', friends: 0,
    perks: ['First access on 1 December', '5 resume tailorings, free', '1 resume-building session with an expert'] },
  { title: '+10 resume tailorings', sub: 'Added to your pass', friends: 1, perks: ['10 more resume tailorings, free'] },
  { title: 'Referral Finder', sub: 'Early access to find referrers', friends: 3, perks: ['Early access to Referral Finder'] },
  { title: 'Email Outreach', sub: 'Early access to tailored emails', friends: 5, perks: ['Early access to Email Outreach'] },
  { title: 'Expert mock interview', sub: 'One 1:1 session, role-specific', friends: 7, perks: ['1:1 mock interview with an expert'] },
  { title: '3 months of Premium', sub: 'Every feature, free', friends: 10, perks: ['3 months of Premium, free'] },
];

// The hero gift box opens on this many taps, then takes the visitor to /join.
export const TAPS_TO_OPEN = 2;

// The two videos on the homepage. Put the files in assets/video/ and set src (and a poster image).
// While src is empty, each slot shows "Video coming soon".
export const VIDEOS = {
  founder: { src: '', poster: '' }, // Himanshu on why Autoplaced exists
  demo: { src: '', poster: '' }, // the 30-second product demo
};
