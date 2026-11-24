// Small sprites for the ambient layer and for sparkle. No outline at this size, except where the shape needs one.
import { recolor, sprite } from './types';

export const snowflake = sprite({ w: '#ffffff' }, [
  '...w...',
  '.w.w.w.',
  '..www..',
  'wwwwwww',
  '..www..',
  '.w.w.w.',
  '...w...',
]);
/** White does not show on the light page background, so the light scheme uses an ice blue. */
export const snowflakeOnLight = recolor(snowflake, { w: '#8fb8e0' });

export const sparkle = sprite({ y: '#ffd166', w: '#fff6cf' }, [
  '...y...',
  '...y...',
  '..yyy..',
  'yyywyyy',
  '..yyy..',
  '...y...',
  '...y...',
]);
export const sparkleSmall = sprite({ y: '#ffd166' }, ['.y.', 'yyy', '.y.']);
export const sparkleLilac = recolor(sparkle, { y: '#c4a7ff', w: '#f3ecff' });

export const petal = sprite({ y: '#ffd54a', o: '#f29f05' }, [
  '..y..',
  '.yyy.',
  '.yoy.',
  '.yoy.',
  '.yyy.',
  '..y..',
]);

export const willowLeaf = sprite({ g: '#3aa77b', l: '#bfe07a' }, [
  '.....gg',
  '....ggl',
  '...ggl.',
  '..ggl..',
  '.ggl...',
  'gg.....',
]);
export const bambooLeaf = recolor(willowLeaf, { g: '#4f9d3a', l: '#9ccc65' });

export const tangyuanPink = sprite({ p: '#ffb3c1', l: '#ffe3e8' }, [
  '.kkkk.',
  'kplppk',
  'klpppk',
  'kppppk',
  'kppppk',
  '.kkkk.',
]);
export const tangyuanWhite = recolor(tangyuanPink, { p: '#ffffff', l: '#f1e9ec' });

export const firecracker = sprite({ r: '#e53935', y: '#f5b301', t: '#8d6b4a' }, [
  '..t..',
  '.t...',
  'kkkkk',
  'kyyyk',
  'krrrk',
  'krrrk',
  'krrrk',
  'kyyyk',
  'kkkkk',
]);

export const lanternSmall = sprite({ o: '#f0792e', l: '#ffb27a', y: '#ffe08a' }, [
  '.kkkkkk.',
  'kooooook',
  'kolooook',
  'kooyyook',
  'kooyyook',
  '.kooook.',
  '.kooook.',
  '..kkkk..',
  '...yy...',
]);
