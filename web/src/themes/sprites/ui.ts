// Sprites that stand in for missing artwork. Their colours are Chakra tokens, so they follow the active
// theme and colour scheme. SVG only: `var()` colours cannot be drawn on the ambient canvas.
import { sprite } from './types';

const brand = 'var(--chakra-colors-brand-500)';
const brandLight = 'var(--chakra-colors-brand-300)';
const accent = 'var(--chakra-colors-accent-400)';
const paper = '#ffffff';

/** A gift without a picture. */
export const giftBox = sprite({ b: brand, l: brandLight, a: accent }, [
  '................',
  '...kkk....kkk...',
  '..kaaak..kaaak..',
  '..kaaaakkaaaak..',
  '...kkkaaaakkk...',
  '.kkkkkkaakkkkkk.',
  '.kbbbbkaakbbbbk.',
  '.kkkkkkaakkkkkk.',
  '..kbbbkaakbbbk..',
  '..kblbkaakbbbk..',
  '..kblbkaakbbbk..',
  '..kbbbkaakbbbk..',
  '..kbbbkaakbbbk..',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
]);

/** An event: a calendar page with a star on it. */
export const eventCalendar = sprite({ b: brand, w: paper, a: accent }, [
  '................',
  '................',
  '...kk......kk...',
  '.kkkkkkkkkkkkkk.',
  '.kbbkbbbbbbkbbk.',
  '.kbbbbbbbbbbbbk.',
  '.kkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwwk.',
  '.kwwwwwaawwwwwk.',
  '.kwwaaaaaaaawwk.',
  '.kwwwaaaaaawwwk.',
  '.kwwwaawwaawwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kkkkkkkkkkkkkk.',
  '................',
  '................',
]);

/** A ticket stub, for empty event lists. */
export const ticket = sprite({ b: brand, l: brandLight, a: accent }, [
  '................',
  '................',
  '................',
  '.kkkkkkkkkkkkkk.',
  'kbbbbbbbbbkbbbbk',
  'kblllllbbb.baabk',
  'kbbbbbbbbbkbaabk',
  '.kbllllbbb.bbbk.',
  '.kbbbbbbbbkbbbk.',
  'kblllllbbb.baabk',
  'kbbbbbbbbbkbaabk',
  'kbbbbbbbbb.bbbbk',
  '.kkkkkkkkkkkkkk.',
  '................',
  '................',
  '................',
]);
