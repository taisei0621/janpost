import { Tile, Suit } from '../types/mahjong';

const ZI_NAMES: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
  5: '白',
  6: '發',
  7: '中',
};

const KANJI_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function parseTileId(tileId: string): Tile {
  let isRed = false;
  let rawValue = tileId.slice(0, -1);
  const suit = tileId.slice(-1) as Suit;

  if (rawValue === '0') {
    isRed = true;
    rawValue = '5';
  }

  const value = parseInt(rawValue, 10);
  return {
    id: tileId,
    suit,
    value,
    isRed,
  };
}

export function getTileDisplay(tileId: string): {
  topText: string;
  bottomText: string;
  suitColor: string;
  isZi: boolean;
} {
  const tile = parseTileId(tileId);

  if (tile.suit === 'z') {
    const ziChar = ZI_NAMES[tile.value] || '?';
    let suitColor = 'text-gray-900 dark:text-gray-900';
    if (tile.value === 6) suitColor = 'text-emerald-700'; // 發 (緑)
    if (tile.value === 7) suitColor = 'text-red-600';     // 中 (赤)
    if (tile.value === 5) suitColor = 'text-blue-500';    // 白 (青枠など)

    return {
      topText: '',
      bottomText: ziChar,
      suitColor,
      isZi: true,
    };
  }

  const topText = tile.isRed ? '赤' : KANJI_NUMBERS[tile.value];
  let bottomText = '';
  let suitColor = 'text-gray-900';

  if (tile.suit === 'm') {
    bottomText = '萬';
    suitColor = tile.isRed ? 'text-red-600' : 'text-red-700';
  } else if (tile.suit === 'p') {
    bottomText = '筒';
    suitColor = tile.isRed ? 'text-red-600' : 'text-blue-600';
  } else if (tile.suit === 's') {
    bottomText = '索';
    suitColor = tile.isRed ? 'text-red-600' : 'text-emerald-700';
  }

  return {
    topText,
    bottomText,
    suitColor,
    isZi: false,
  };
}

// 牌の並び順（理牌）
export function sortTiles(tileIds: string[]): string[] {
  const suitOrder: Record<Suit, number> = { m: 1, p: 2, s: 3, z: 4 };

  return [...tileIds].sort((a, b) => {
    const tA = parseTileId(a);
    const tB = parseTileId(b);

    if (suitOrder[tA.suit] !== suitOrder[tB.suit]) {
      return suitOrder[tA.suit] - suitOrder[tB.suit];
    }
    return tA.value - tB.value;
  });
}
