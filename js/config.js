// Everything the client may want to change without touching the page code.

// The WhatsApp community link. Every "WhatsApp community" button on the page uses this one value.
export const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/GgEHnv7hqaL8yybgLZDFUe';

// Where the waitlist form sends its data as JSON (POST):
//   { name, countryCode, phone, phoneE164, email, source, inviteCode, referredBy, utm_* }
// inviteCode: this person's own invite code (their invite link is the site address + ?ref=<inviteCode>).
//   The page makes one up; if the endpoint answers with JSON { "inviteCode": "..." }, the page uses that one instead.
// referredBy: the invite code of the friend whose link brought this person here (empty if none).
// The backend counts how many friends joined with each invite code and unlocks INVITE_GIFTS.
// The backend team owns this endpoint. Use a same-site path such as '/api/waitlist': the page's
// security policy only lets the browser send data to this site.
// While it is empty, the form only works as a preview on localhost and *.vercel.app (it shows the
// "You're in" screen and sends nothing). On any other address it shows an error, so no sign-up is lost silently.
export const WAITLIST_ENDPOINT = '';

// The gifts inside the hero box, in order. Each tap brings one out; the last tap opens the box.
// So the box takes as many taps to open as there are gifts here.
export const TAP_GIFTS = [
  '20+ free job applications',
  'Up to 3 free resume builds',
  'Resume review with an industry expert',
];
export const TAPS_TO_OPEN = TAP_GIFTS.length;

// The locked gifts: shown with a lock, and unlocked when this many friends join with the person's invite link.
// The page only shows them; the backend counts the friends. Confirm the gifts and the numbers with the client.
export const INVITE_GIFTS = [
  { gift: '1:1 mock interview with an industry expert', friends: 1 },
  // A promise to the visitor: confirm the wording with the client before launch.
  { gift: 'A referral to your dream company', friends: 3 },
];
