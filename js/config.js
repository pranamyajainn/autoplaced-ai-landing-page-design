// Everything the client may want to change without touching the page code.

// The WhatsApp community link. Every "WhatsApp community" button on the page uses this one value.
export const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/GgEHnv7hqaL8yybgLZDFUe';

// Where the waitlist form sends its data as JSON (POST):
//   { name, countryCode, phone, phoneE164, email, source, utm_* }
// The backend team owns this endpoint. Use a same-site path such as '/api/waitlist': the page's
// security policy only lets the browser send data to this site.
// While it is empty, the form only works as a preview on localhost and *.vercel.app (it shows the
// "You're in" screen and sends nothing). On any other address it shows an error, so no sign-up is lost silently.
export const WAITLIST_ENDPOINT = '';

// How many taps open the gift box in the hero.
export const TAPS_TO_OPEN = 3;

// The gifts people unlock by joining, in order. Shown on the ticket in the hero box and on the "You're in" screen.
export const GIFTS = [
  'Resume review with an industry expert',
  '1:1 mock interview with an industry expert',
  'Up to 3 free resume builds',
  '20+ free job applications',
  // A promise to the visitor: confirm the wording with the client before launch.
  'A referral to your dream company',
];
