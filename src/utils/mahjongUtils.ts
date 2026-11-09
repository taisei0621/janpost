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

/**
 * 牌IDから対応する画像ファイル名プレフィックス（man1, pin5, aka1, ji1など）を取得
 */
export function getTileKey(tileId: string): string {
  if (tileId === '0p') return 'aka1'; // 赤5筒
  if (tileId === '0s') return 'aka2'; // 赤5索
  if (tileId === '0m') return 'aka3'; // 赤5萬

  const rawVal = tileId.slice(0, -1);
  const suit = tileId.slice(-1);

  if (suit === 'm') return `man${rawVal}`;
  if (suit === 'p') return `pin${rawVal}`;
  if (suit === 's') return `sou${rawVal}`;
  if (suit === 'z') {
    // ji1:東, ji2:南, ji3:西, ji4:北, ji5:發, ji6:白, ji7:中
    const ziMap: Record<string, string> = {
      '1': 'ji1',
      '2': 'ji2',
      '3': 'ji3',
      '4': 'ji4',
      '5': 'ji6', // 白
      '6': 'ji5', // 發
      '7': 'ji7', // 中
    };
    return ziMap[rawVal] || 'ji1';
  }
  return 'man1';
}

/**
 * 麻雀牌画像（66x90 / 32x45）の公開URLパスを返却
 */
export function getTileImagePath(
  tileId: string,
  options?: {
    size?: 's' | 'l';
    isReach?: boolean;
    emb?: boolean;
  }
): string {
  const key = getTileKey(tileId);
  const size = options?.size ?? 'l';
  const isReach = options?.isReach ?? false;
  const emb = options?.emb ?? true;

  const yokoPart = isReach ? '-yoko' : '';
  const embPart = emb ? '-emb' : '';

  return `/pai-images/${key}-66-90-${size}${yokoPart}${embPart}.png`;
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

/**
 * 鳴き牌（副露）文字列から牌ID配列と表示ラベルを解析
 * 例: "7z-7z-7z" -> ["7z", "7z", "7z"]
 * 例: "1m-2m-3m" -> ["1m", "2m", "3m"]
 * 例: "123m" -> ["1m", "2m", "3m"]
 * 例: "中ポン" -> ["7z", "7z", "7z"], label: "中ポン"
 */
export function parseMeldTiles(meldStr: string): { label?: string; tileIds: string[] } {
  if (!meldStr || typeof meldStr !== 'string') return { tileIds: [] };

  const s = meldStr.trim();

  // 1. 日本語役牌ポン・カンパターン
  const kanjiMap: Record<string, string> = {
    '東': '1z', '南': '2z', '西': '3z', '北': '4z',
    '白': '5z', '發': '6z', '中': '7z',
  };

  for (const [char, tid] of Object.entries(kanjiMap)) {
    if (s.includes(char)) {
      if (s.includes('カン') || s.includes('槓')) {
        return { label: `${char}カン`, tileIds: [tid, tid, tid, tid] };
      }
      return { label: s.includes('ポン') ? `${char}ポン` : `${char}`, tileIds: [tid, tid, tid] };
    }
  }

  // 2. 連続牌パターン: 例 "123m", "234p", "789s", "777z"
  const continuousMatch = s.match(/^([0-9]{3,4})([mpsz])$/i);
  if (continuousMatch) {
    const nums = continuousMatch[1];
    const suit = continuousMatch[2].toLowerCase();
    const tileIds = nums.split('').map((n) => `${n}${suit}`);
    return { tileIds };
  }

  // 3. ハイフン・空白・カンマ区切りパターン: 例 "7z-7z-7z", "1m, 2m, 3m", "5p 5p 5p 0p"
  const tileMatches = s.match(/([0-9][mpsz])/gi);
  if (tileMatches && tileMatches.length >= 2) {
    const tileIds = tileMatches.map((t) => t.toLowerCase());
    return { tileIds };
  }

  return { tileIds: [] };
}
