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
    let suitColor = 'text-gray-900';
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

// 牌の並び順（理牌: 萬子 → 筒子 → 索子 → 字牌）
export function sortTiles(tileIds: string[]): string[] {
  const suitOrder: Record<Suit, number> = { m: 1, p: 2, s: 3, z: 4 };

  return [...tileIds].sort((a, b) => {
    const tA = parseTileId(a);
    const tB = parseTileId(b);

    if (suitOrder[tA.suit] !== suitOrder[tB.suit]) {
      return suitOrder[tA.suit] - suitOrder[tB.suit];
    }
    if (tA.value !== tB.value) {
      return tA.value - tB.value;
    }
    // 赤ドラの順序（赤5は通常5より前）
    return (tA.isRed ? 0 : 1) - (tB.isRed ? 0 : 1);
  });
}

// 手牌の理牌：14枚の場合は最初の13枚を理牌し、最後の1枚をツモ牌として保持する
export function sortHandWithTsumo(hand: string[]): string[] {
  if (hand.length <= 1) return [...hand];
  if (hand.length === 14) {
    const mainHand = hand.slice(0, 13);
    const tsumo = hand[13];
    return [...sortTiles(mainHand), tsumo];
  }
  return sortTiles(hand);
}

// 2つの牌が同種（同位牌）かどうか判定（例: 5m と 0m は同種）
export function isSameTileType(a: string, b: string): boolean {
  if (a === b) return true;
  const tA = parseTileId(a);
  const tB = parseTileId(b);
  return tA.suit === tB.suit && tA.value === tB.value;
}

// 配列内の同種牌の枚数をカウント
export function countSameTileType(tileList: string[], targetTileId: string): number {
  return tileList.filter((t) => isSameTileType(t, targetTileId)).length;
}

// 特定の牌IDそのものの枚数をカウント（赤牌が既に1枚使われていないか等）
export function countExactTile(tileList: string[], targetTileId: string): number {
  return tileList.filter((t) => t === targetTileId).length;
}

// 牌を追加可能かどうかの判定（ドラ表示牌を含め最大4枚、赤牌は最大1枚）
export function canAddTileValidation(
  existingTiles: string[], // 手牌 + ドラ + (各家の捨牌など)
  tileToAdd: string
): { canAdd: boolean; reason?: string } {
  const isRed = tileToAdd === '0m' || tileToAdd === '0p' || tileToAdd === '0s';

  // 赤牌は各スート1枚のみ
  if (isRed && countExactTile(existingTiles, tileToAdd) >= 1) {
    return { canAdd: false, reason: '赤ドラ（赤5）は各スートに1枚しか存在しません。' };
  }

  // 同種牌はドラを含めて最大4枚
  const sameCount = countSameTileType(existingTiles, tileToAdd);
  if (sameCount >= 4) {
    return { canAdd: false, reason: '同じ牌はドラ表示牌を含め最大4枚までしか使えません。' };
  }

  return { canAdd: true };
}
