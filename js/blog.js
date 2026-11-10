// /blog: draws the bot in the header and points the WhatsApp button at the community.
import { mountBots } from './bot.js';
import { WHATSAPP_COMMUNITY_URL } from './config.js';

document.documentElement.classList.add('js');
mountBots();
document.querySelectorAll('[data-wa]').forEach((a) => { a.href = WHATSAPP_COMMUNITY_URL; });
