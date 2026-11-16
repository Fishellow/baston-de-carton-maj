/* Les pictos du jeu : des tracés simples à l'encre, pas d'emojis. IC('nom') renvoie le SVG. */
const ICONS = {
  play: '<path d="M7 4.5l12.5 7.5L7 19.5z" fill="currentColor"/>',
  friends: '<circle cx="8.5" cy="8" r="3.2"/><path d="M2.5 19c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500"/><circle cx="17" cy="9" r="2.600"/><path d="M16 13.600c3.200-.3 5.500 1.700 5.500 4.900"/>',
  team: '<path d="M4 4l6 6M4 4v4M4 4h4"/><path d="M20 4l-6 6M20 4v4M20 4h-4"/><path d="M4 20l6-6M20 20l-6-6"/><circle cx="12" cy="12" r="2.200"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  cards: '<rect x="4" y="6.5" width="9.5" height="13" rx="2" transform="rotate(-10 8.7 13)"/><rect x="10.5" y="4.5" width="9.5" height="13" rx="2" transform="rotate(8 15.2 11)"/>',
  shop: '<path d="M5 8.5h14l-1 11.5H6z"/><path d="M9 8.5V7a3 3 0 016 0v1.5"/>',
  locker: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.4 9.3l6-.7z"/>',
  music: '<path d="M9 18V5.5l10-2V16"/><circle cx="6.8" cy="18" r="2.4"/><circle cx="16.8" cy="16" r="2.4"/>',
  sound: '<path d="M4 10v4h3.5l5 4V6l-5 4z"/><path d="M16 9a4.2 4.2 0 010 6M18.6 6.4a8 8 0 010 11.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>',
  gift: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="1.5"/><rect x="3.5" y="7" width="17" height="3.5" rx="1"/><path d="M12 7v13M12 7c-1-3-5-3-4.5-.5.3 1 2 .8 4.5.5zm0 0c1-3 5-3 4.5-.5-.3 1-2 .8-4.5.5z"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.8" cy="7" r="1.2" fill="currentColor"/><circle cx="4.8" cy="12" r="1.2" fill="currentColor"/><circle cx="4.8" cy="17" r="1.2" fill="currentColor"/>',
  back: '<path d="M14.5 5l-7 7 7 7"/>',
  bolt: '<path d="M13.5 2.5L5 13.5h5.5l-1 8L18 10.5h-5.5z" fill="currentColor"/>',
  heart: '<path d="M12 20.5C5 15.5 3 12 3 8.8A4.6 4.6 0 0112 6.6a4.6 4.6 0 019 2.2c0 3.200-2 6.700-9 11.700z" fill="currentColor"/>',
  shield: '<path d="M12 3l8 3v5.500c0 5-3.500 8.300-8 9.500-4.500-1.200-8-4.500-8-9.500V6z"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/>',
  sleep: '<path d="M6 6h8l-8 8h8M15 13h5l-5 6h5"/>',
  build: '<path d="M4 11.5L12 4.500l8 7V20H4z"/><path d="M10 20v-5.500h4V20"/>',
  grid4: '<rect x="3.5" y="5" width="3.300" height="14" rx="1"/><rect x="8.100" y="5" width="3.300" height="14" rx="1"/><rect x="12.700" y="5" width="3.300" height="14" rx="1"/><rect x="17.300" y="5" width="3.300" height="14" rx="1"/>',
  grid6: '<rect x="2.500" y="5" width="2.300" height="14" rx=".8"/><rect x="5.900" y="5" width="2.300" height="14" rx=".8"/><rect x="9.300" y="5" width="2.300" height="14" rx=".8"/><rect x="12.700" y="5" width="2.300" height="14" rx=".8"/><rect x="16.100" y="5" width="2.300" height="14" rx=".8"/><rect x="19.500" y="5" width="2.300" height="14" rx=".8"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 5.500H5c0 3 1.200 4.500 3.200 4.800M16 5.500h3c0 3-1.200 4.500-3.200 4.800M12 13v4M8.500 20h7M10 17h4"/>',
  rock: '<path d="M6.500 9.500c1-3 4-4.500 7-4s5 3 5 6.500-2.500 6.500-6.500 6.500-6-2-6.300-5c-.1-1.500.2-2.700.8-4z"/>',
  paper: '<rect x="6" y="3.500" width="12" height="17" rx="1.500"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  scissors: '<circle cx="7" cy="17.500" r="2.700"/><circle cx="17" cy="17.500" r="2.700"/><path d="M8.800 15.500L17 3.500M15.200 15.500L7 3.500"/>',
  gear: '<circle cx="12" cy="12" r="3.200"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/><circle cx="12" cy="12" r="6.500"/>',
  flag: '<path d="M6 21V4M6 5h11l-2.500 3.500L17 12H6"/>',
};
const IC = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
/* la pièce du jeu : un petit rond doré dessiné en CSS */
const COIN = '<i class="coin"></i>';
/* le visage d'un joueur = le portrait 3D d'une créature */
const faceHTML = id => { const p = window.PORT && PORT[id]; return p ? '<img class="fimg" src="' + p + '" alt="">' : ''; };
