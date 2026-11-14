// The orbit section on its own: draws the robot in the centre, and the rings turn only while the section is on screen.
import { mountBots } from '../../js/bot.js';

mountBots();
const orbit = document.querySelector('[data-orbit]');
if (orbit) new IntersectionObserver(([en]) => orbit.classList.toggle('is-paused', !en.isIntersecting)).observe(orbit);
