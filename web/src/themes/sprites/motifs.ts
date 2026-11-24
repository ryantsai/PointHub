// The theme motifs: one 16 × 16 sprite per theme (some have a companion), all with the INK outline ('k').
// Colours are fixed hex values taken from each theme's palette so the canvas can draw them too.
import { sprite } from './types';

/** Standard: a trophy in the company blue with a green base. */
export const trophy = sprite({ b: '#199ecf', l: '#8fd6f0', w: '#ffffff', g: '#75b42b', G: '#5a9120' }, [
  '................',
  '...kkkkkkkkkk...',
  '.kkkbbbbbbbbkkk.',
  'kbbkblbbbbbbkbbk',
  'kb.kblbbwbbbk.bk',
  'kb.kblbwwwbbk.bk',
  'kbbkblbbwbbbkbbk',
  '.kkkbbbbbbbbkkk.',
  '...kbbbbbbbbk...',
  '....kkbbbbkk....',
  '......kbbk......',
  '......kbbk......',
  '....kkkggkkk....',
  '...kggggggggk...',
  '...kgGGGGGGgk...',
  '...kkkkkkkkkk...',
]);

/** New Year's Day: the first sunrise of the year over the mountains. */
export const sunrise = sprite({ y: '#ffc53d', l: '#fff0b3', i: '#5b4bdb' }, [
  '................',
  '.......yy.......',
  '.......yy.......',
  '..y....yy....y..',
  '...y........y...',
  '....y.kkkk.y....',
  '.....kyyyyk.....',
  '....kyylyyyk....',
  '...kyyllyyyyk...',
  'yy.kyylyyyyyk.yy',
  '...kyyyyyyyyk...',
  '..kkkyyyyyykkk..',
  '.kiikkkyykkkiik.',
  'kiiiiikkkkiiiiik',
  'kiiiiiiiiiiiiiik',
  'kkkkkkkkkkkkkkkk',
]);

/** Lunar New Year: a red envelope with a gold seal. */
export const redEnvelope = sprite({ r: '#e53935', R: '#b71c1c', g: '#f5b301', y: '#ffe08a' }, [
  '................',
  '...kkkkkkkkkk...',
  '..krrrrrrrrrrk..',
  '..kRrrrrrrrrRk..',
  '..krRRrrrrRRrk..',
  '..krrrRggRrrrk..',
  '..krrrgyygrrrk..',
  '..krrrgyygrrrk..',
  '..krrrrggrrrrk..',
  '..krrrrrrrrrrk..',
  '..krrrrrrrrrrk..',
  '..krrggggggrrk..',
  '..krrrrrrrrrrk..',
  '..krrrrrrrrrrk..',
  '...kkkkkkkkkk...',
  '................',
]);

/** Lantern Festival: a paper sky lantern, lit from inside. */
export const skyLantern = sprite({ o: '#f0792e', l: '#ffb27a', y: '#ffe08a', d: '#b8501a' }, [
  '................',
  '....kkkkkkkk....',
  '..kkooooooookk..',
  '.kolloooooooook.',
  '.kolooooooooook.',
  '.kooooyyyyooook.',
  '.koooyyyyyyoook.',
  '..kooyyyyyyook..',
  '..koooyyyyoook..',
  '...kooooooook...',
  '...kooooooook...',
  '....kooooook....',
  '....kddddddk....',
  '....kkkkkkkk....',
  '......kyyk......',
  '.......kk.......',
]);

/** Qingming: a spring kite with a ribbon tail. */
export const kite = sprite({ g: '#3aa77b', l: '#bfe07a', w: '#f4fbe6', y: '#8fd3f4', p: '#ff9a8b' }, [
  '.......kk.......',
  '......kggk......',
  '.....kglggk.....',
  '....kglggggk....',
  '...kglggggggk...',
  '..kwwwwwwwwwwk..',
  '...kyyyyyyyyk...',
  '....kyyyyyyk....',
  '.....kyyyyk.....',
  '......kyyk......',
  '.......kk.......',
  '........p.......',
  '.......pp.......',
  '......p.........',
  '......pp........',
  '........p.......',
]);

/** Dragon Boat Festival: a dragon boat with three paddlers. */
export const dragonBoat = sprite({ g: '#4f9d3a', w: '#ffffff', r: '#e5484d', y: '#f2a93b', b: '#5bb4d8' }, [
  '................',
  '................',
  '................',
  '.kk.............',
  'kggk.........kk.',
  'kgwgk.......kyyk',
  'kgggk.r.r.r.kyk.',
  '.kggkkrkrkrkkgk.',
  '..kgggggggggggk.',
  '..kyyyyyyyyyyk..',
  '...kkkkkkkkkk...',
  '.b..b..b..b..b..',
  'b.bb.bb.bb.bb.b.',
  '................',
  '................',
  '................',
]);

/** Dragon Boat Festival: a zongzi tied with string. */
export const zongzi = sprite({ g: '#5c8f2f', l: '#9ccc65', t: '#f2d9a0' }, [
  '................',
  '.......kk.......',
  '......kggk......',
  '.....kglggk.....',
  '.....kglggk.....',
  '....kgglgggk....',
  '....kttttttk....',
  '...kggglggggk...',
  '...kgggglgggk...',
  '..kgggggglgggk..',
  '..kttttttttttk..',
  '.kggggggggglggk.',
  '.kggggggggggggk.',
  '.kkggggggggggkk.',
  '...kkkkkkkkkk...',
  '................',
]);

/** Qixi: a magpie under a star. */
export const magpie = sprite({ d: '#3b3560', w: '#ffffff', b: '#6c8cff', y: '#ffd166' }, [
  '..........y.....',
  '.........yyy....',
  '..........y.....',
  '....kkkk........',
  '...kddddk.......',
  '..kdwdddk.......',
  'yykddddddkk.....',
  '..kdddddddddk...',
  '...kwwdddbbddk..',
  '...kwwwddbbbddk.',
  '....kwwwddbbbdkk',
  '.....kkwwdddkkdk',
  '.......kkkkk..kk',
  '.......y..y.....',
  '................',
  '................',
]);

/** Ghost Festival: a paper water lantern on its raft. */
export const waterLantern = sprite({ a: '#c98a2b', w: '#fff3d6', y: '#ffd98a', f: '#ff9f43', t: '#8d6b4a', b: '#7f9be0' }, [
  '................',
  '.......kk.......',
  '......kkkk......',
  '.....kaaaak.....',
  '....kaaaaaak....',
  '...kkkkkkkkkk...',
  '...kwwwyywwwk...',
  '...kwwyyyywwk...',
  '...kwwyffywwk...',
  '...kwwyffywwk...',
  '...kwwwyywwwk...',
  '..kkkkkkkkkkkk..',
  '..kttttttttttk..',
  'b..kkkkkkkkkk..b',
  '.bb..bbbbbb..bb.',
  '................',
]);

/** Mid-Autumn: the moon rabbit. */
export const rabbit = sprite({ w: '#ffffff', p: '#ffb3c1' }, [
  '...kk......kk...',
  '..kwwk....kwwk..',
  '..kwpk....kpwk..',
  '..kwpk....kpwk..',
  '..kwpkkkkkkpwk..',
  '..kwwwwwwwwwwk..',
  '.kwwwwwwwwwwwwk.',
  '.kwwkwwwwwwkwwk.',
  '.kwwkwwwwwwkwwk.',
  '.kwpwwwkkwwwpwk.',
  '.kwwwwwwwwwwwwk.',
  '..kwwwwwwwwwwk..',
  '..kwwwwwwwwwwk..',
  '.kwwwkwwwwkwwwk.',
  '.kkkkkkkkkkkkkk.',
  '................',
]);

/** Mid-Autumn: a mooncake. */
export const mooncake = sprite({ c: '#e0913a', l: '#ffd28a', d: '#b56a1f' }, [
  '................',
  '................',
  '....kkkkkkkk....',
  '..kkcccccccckk..',
  '.kcccllllllccck.',
  '.kcclcccccclcck.',
  '.kcclccllcclcck.',
  '.kcclccllcclcck.',
  '.kcclcccccclcck.',
  '.kcccllllllccck.',
  '.kddccccccccddk.',
  '.kddddddddddddk.',
  '..kkddddddddkk..',
  '....kkkkkkkk....',
  '................',
  '................',
]);

/** Mid-Autumn: the full moon (pinned in the sky by the ambient layer). */
export const moon = sprite({ y: '#ffe08a', l: '#fff6cf', d: '#f0c05a' }, [
  '.....kkkkkk.....',
  '...kkyyyyyykk...',
  '..kyylllyyyyyk..',
  '.kyyllyyyyddyyk.',
  '.kyllyyyyyddyyk.',
  'kyylyyyyyyyyyyyk',
  'kyylyyddyyyyyyyk',
  'kyyyyydddyyyyyyk',
  'kyyyyyddyyyyyyyk',
  'kyyyyyyyyyydyyyk',
  'kyyyyyyyyyyddyyk',
  '.kyyydyyyyyyyyk.',
  '.kyyyyyyyyyyyyk.',
  '..kyyyyyyyyyyk..',
  '...kkyyyyyykk...',
  '.....kkkkkk.....',
]);

/** National Day: a red, white and blue firework burst. */
export const firework = sprite({ r: '#ef4444', b: '#3b6fe0', w: '#c9d4f5', y: '#ffd166' }, [
  '.......rr.......',
  '.b.....rr.....b.',
  '..b..........b..',
  '...b...ww...b...',
  '.......ww.......',
  '.....w....w.....',
  '................',
  'rr.ww..yy..ww.rr',
  'rr.ww..yy..ww.rr',
  '................',
  '.....w....w.....',
  '.......ww.......',
  '...b...ww...b...',
  '..b..........b..',
  '.b.....rr.....b.',
  '.......rr.......',
]);

/** Double Ninth: a chrysanthemum. */
export const chrysanthemum = sprite({ y: '#ffd54a', o: '#f29f05', g: '#5c8f2f' }, [
  '......kkkk......',
  '....kkyyyykk....',
  '..kkyykyykyykk..',
  '.kyyykyyyykyyyk.',
  '.kyyyyooooyyyyk.',
  '.kkkyooooooykkk.',
  '.kyyyooooooyyyk.',
  '.kyyyyooooyyyyk.',
  '..kyykyyyykyyk..',
  '...kkyykkyykk...',
  '.....kkggkk.....',
  '.kggk..gg.......',
  '.kgggkkgg.......',
  '..kkgggggk......',
  '....kkkggk......',
  '.......kk.......',
]);

/** Winter Solstice: a warm bowl of tangyuan. */
export const tangyuanBowl = sprite({ p: '#ffb3c1', q: '#ffe3e8', w: '#ffffff', g: '#ece3e6', c: '#b24c63', d: '#8f3a4f', s: '#d9c2c8' }, [
  '.....s....s.....',
  '....s....s......',
  '.....s....s.....',
  '..kkk.kkkk.kkk..',
  '.kpppkwwwwkpppk.',
  '.kpqpkwwgwkpqpk.',
  '.kpppkwwwwkpppk.',
  'kkkkkkkkkkkkkkkk',
  'kcccccccccccccck',
  'kcddcddcddcddcck',
  '.kcccccccccccck.',
  '.kcccccccccccck.',
  '..kcccccccccck..',
  '...kkcccccckk...',
  '....kddddddk....',
  '....kkkkkkkk....',
]);

/** Christmas: a decorated tree. */
export const tree = sprite({ g: '#1f9d61', y: '#ffcf4d', r: '#ff7468', t: '#8d5a3b' }, [
  '.......yy.......',
  '......kyyk......',
  '......kggk......',
  '.....kggggk.....',
  '....kgrggggk....',
  '...kkggggggkk...',
  '....kggggygk....',
  '...kggggggggk...',
  '..kggyggggrggk..',
  '.kkkggggggggkkk.',
  '..kggggrgggggk..',
  '.kggyggggggyggk.',
  '.kkkkkkttkkkkkk.',
  '......kttk......',
  '......kttk......',
  '......kkkk......',
]);

/** Christmas: a wrapped present. */
export const present = sprite({ r: '#e5484d', R: '#b9323a', y: '#ffcf4d' }, [
  '................',
  '...kkk....kkk...',
  '..kyyyk..kyyyk..',
  '..kyyyykkyyyyk..',
  '...kkkyyyykkk...',
  '.kkkkkkyykkkkkk.',
  '.krrrrkyykrrrrk.',
  '.kkkkkkyykkkkkk.',
  '..krrrkyykrrrk..',
  '..krRrkyykrrrk..',
  '..krRrkyykrrrk..',
  '..krrrkyykrrrk..',
  '..krrrkyykrrrk..',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
]);
