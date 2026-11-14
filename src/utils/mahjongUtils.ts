import { Tile, Suit, MeldInfo, MeldFrom, MeldType, MeldOption } from '../types/mahjong';

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

/**
 * 手牌の理牌：
 * 門前なら14枚（13枚理牌 + ツモ牌1枚）
 * 1副露なら11枚（10枚理牌 + ツモ牌1枚）
 * 2副露なら8枚（7枚理牌 + ツモ牌1枚）
 * 3副露なら5枚（4枚理牌 + ツモ牌1枚）
 * 4副露なら2枚（1枚理牌 + ツモ牌1枚）
 * 最後の1枚をツモ牌として保持する
 */
export function sortHandWithTsumo(hand: string[]): string[] {
  if (hand.length <= 1) return [...hand];

  // ツモ牌を持つ手牌枚数のパターン (14, 11, 8, 5, 2)
  const tsumoCounts = [14, 11, 8, 5, 2];
  if (tsumoCounts.includes(hand.length)) {
    const mainHand = hand.slice(0, hand.length - 1);
    const tsumo = hand[hand.length - 1];
    return [...sortTiles(mainHand), tsumo];
  }

  return sortTiles(hand);
}

/**
 * 副露数に応じた純手牌の必要枚数を計算
 * 0副露: 14枚
 * 1副露: 11枚
 * 2副露: 8枚
 * 3副露: 5枚
 * 4副露: 2枚
 */
export function getRequiredHandCount(meldCount: number): number {
  return Math.max(2, 14 - meldCount * 3);
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

// 特定の牌IDそのものの枚数をカウント
export function countExactTile(tileList: string[], targetTileId: string): number {
  return tileList.filter((t) => t === targetTileId).length;
}

// 牌を追加可能かどうかの判定（ドラ表示牌を含め最大4枚、赤牌は最大1枚）
export function canAddTileValidation(
  existingTiles: string[], // 手牌 + ドラ + 副露牌など
  tileToAdd: string
): { canAdd: boolean; reason?: string } {
  const isRed = tileToAdd === '0m' || tileToAdd === '0p' || tileToAdd === '0s';

  if (isRed && countExactTile(existingTiles, tileToAdd) >= 1) {
    return { canAdd: false, reason: '赤ドラ（赤5）は各スートに1枚しか存在しません。' };
  }

  const sameCount = countSameTileType(existingTiles, tileToAdd);
  if (sameCount >= 4) {
    return { canAdd: false, reason: '同じ牌はドラ表示牌を含め最大4枚までしか使えません。' };
  }

  return { canAdd: true };
}

export interface FormattedMeld {
  label: string;
  type: MeldType;
  from: MeldFrom;
  tiles: Array<{
    tileId: string;
    isReach: boolean; // 誰から鳴いたかによって横向きにする
  }>;
}

/**
 * 鳴き牌（副露）をパースし、誰から鳴いたかに基づいて横向き牌を正確に計算
 *
 * 麻雀の公式表示ルール：
 * - 上家（左）から鳴いた：左端（index 0）を横にする
 * - 対面（前）から鳴いた：中央（index 1）を横にする
 * - 下家（右）から鳴いた：右端（チー・ポンなら index 2、カンなら index 3）を横にする
 * - 暗槓：両端裏（または全開）
 */
export function parseMeldDisplay(meld: string | MeldInfo): FormattedMeld {
  // オブジェクト形式の MeldInfo の場合
  if (typeof meld === 'object' && meld !== null && 'tiles' in meld) {
    const info = meld as MeldInfo;
    const tilesList = [...info.tiles];
    const from = info.from || 'kami';
    const type = info.type || (tilesList.length === 4 ? 'daiminkan' : 'pon');

    let horizontalIndex = -1;
    if (from === 'kami') {
      horizontalIndex = 0; // 左端
    } else if (from === 'toimen') {
      horizontalIndex = 1; // 中央
    } else if (from === 'shimo') {
      horizontalIndex = tilesList.length - 1; // 右端
    }

    const formattedTiles = tilesList.map((tid, idx) => ({
      tileId: tid,
      isReach: idx === horizontalIndex,
    }));

    const fromLabelMap: Record<MeldFrom, string> = {
      kami: '上家',
      toimen: '対面',
      shimo: '下家',
      self: '暗槓',
    };

    const typeLabelMap: Record<MeldType, string> = {
      chi: 'チー',
      pon: 'ポン',
      daiminkan: '大明槓',
      ankan: '暗槓',
      kakan: '加槓',
    };

    const label = info.label || (from === 'self' ? '暗槓' : `${fromLabelMap[from]}から${typeLabelMap[type]}`);

    return {
      label,
      type,
      from,
      tiles: formattedTiles,
    };
  }

  // 文字列形式の場合（後方互換性）
  const s = String(meld || '').trim();
  const { tileIds, label: fallbackLabel } = parseMeldTiles(s);

  // 文字列内のキーワードから「誰から」「種類」を推定
  let from: MeldFrom = 'kami';
  if (s.includes('対面') || s.includes('toimen')) from = 'toimen';
  else if (s.includes('下家') || s.includes('shimo')) from = 'shimo';
  else if (s.includes('暗槓') || s.includes('ankan')) from = 'self';

  let type: MeldType = tileIds.length === 4 ? (from === 'self' ? 'ankan' : 'daiminkan') : 'pon';
  if (s.includes('チー') || s.includes('chi')) type = 'chi';

  let horizontalIndex = -1;
  if (from === 'kami') horizontalIndex = 0;
  else if (from === 'toimen') horizontalIndex = 1;
  else if (from === 'shimo') horizontalIndex = tileIds.length - 1;

  const formattedTiles = tileIds.map((tid, idx) => ({
    tileId: tid,
    isReach: idx === horizontalIndex,
  }));

  return {
    label: fallbackLabel || `${type === 'chi' ? 'チー' : type === 'pon' ? 'ポン' : 'カン'}`,
    type,
    from,
    tiles: formattedTiles,
  };
}

/**
 * 鳴き牌（副露）文字列から牌ID配列と表示ラベルを解析（旧互換ヘルパー）
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

  // 2. 連続牌パターン: 例 "123m", "234p", "789s", "777z", "1111p"
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

/**
 * ドラ表示牌（最大5枚）を安全に配列として取得するヘルパー
 */
export function getDoraTiles(context?: { dora?: string; doras?: string[] } | null): string[] {
  if (!context) return ['5p'];
  if (context.doras && Array.isArray(context.doras) && context.doras.length > 0) {
    return context.doras.slice(0, 5);
  }
  if (context.dora) {
    if (context.dora.includes(',')) {
      return context.dora.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5);
    }
    return [context.dora];
  }
  return ['5p'];
}

/**
 * 鳴くか問題用：手牌と他家の捨て牌から可能な鳴き選択肢を自動算出
 */
export function calculateAvailableMeldOptions(
  hand: string[],
  targetTileId: string,
  fromWind: string,
  selfWind: string
): MeldOption[] {
  const options: MeldOption[] = [];
  const target = parseTileId(targetTileId);

  // 席関係（上家かどうか）
  const winds = ['東家', '南家', '西家', '北家'];
  const selfIdx = winds.indexOf(selfWind);
  const fromIdx = winds.indexOf(fromWind);
  const isKami = (selfIdx + 3) % 4 === fromIdx;

  // 1. ポン判定（同種牌が2枚以上手牌にあるか）
  const sameCount = hand.filter((t) => isSameTileType(t, targetTileId)).length;
  if (sameCount >= 2) {
    options.push({
      id: `pon-${targetTileId}`,
      action: 'pon',
      label: `ポン`,
    });
  }

  // 2. カン（大明槓）判定（同種牌が3枚手牌にあるか）
  if (sameCount >= 3) {
    options.push({
      id: `kan-${targetTileId}`,
      action: 'kan',
      label: `カン（大明槓）`,
    });
  }

  // 3. チー判定（上家からの打牌 かつ 数牌）
  if (isKami && target.suit !== 'z') {
    const val = target.value;
    const suit = target.suit;

    // パターンA: target が左端 (val, val+1, val+2) -> 手牌に val+1, val+2
    if (val <= 7) {
      const has1 = hand.some((t) => parseTileId(t).suit === suit && parseTileId(t).value === val + 1);
      const has2 = hand.some((t) => parseTileId(t).suit === suit && parseTileId(t).value === val + 2);
      if (has1 && has2) {
        options.push({
          id: `chi-${val}${val + 1}${val + 2}${suit}`,
          action: 'chi',
          label: `チー (${val}-${val + 1}-${val + 2}${suit})`,
        });
      }
    }

    // パターンB: target が中央 (val-1, val, val+1) -> 手牌に val-1, val+1
    if (val >= 2 && val <= 8) {
      const hasPrev = hand.some((t) => parseTileId(t).suit === suit && parseTileId(t).value === val - 1);
      const hasNext = hand.some((t) => parseTileId(t).suit === suit && parseTileId(t).value === val + 1);
      if (hasPrev && hasNext) {
        options.push({
          id: `chi-${val - 1}${val}${val + 1}${suit}`,
          action: 'chi',
          label: `カンチャンチー (${val - 1}-${val}-${val + 1}${suit})`,
        });
      }
    }

    // パターンC: target が右端 (val-2, val-1, val) -> 手牌に val-2, val-1
    if (val >= 3) {
      const has1 = hand.some((t) => parseTileId(t).suit === suit && parseTileId(t).value === val - 2);
      const has2 = hand.some((t) => parseTileId(t).suit === suit && parseTileId(t).value === val - 1);
      if (has1 && has2) {
        options.push({
          id: `chi-${val - 2}${val - 1}${val}${suit}`,
          action: 'chi',
          label: `チー (${val - 2}-${val - 1}-${val}${suit})`,
        });
      }
    }
  }

  // 4. スルー（鳴かない）は常に追加
  options.push({
    id: 'pass',
    action: 'pass',
    label: 'スルー（鳴かない）',
  });

  return options;
}
