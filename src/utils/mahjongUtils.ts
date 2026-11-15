import { Tile, Suit, MeldInfo, MeldFrom, MeldType, MeldOption, UkeireResult, EffectiveTile } from '../types/mahjong';
export type { UkeireResult, EffectiveTile };

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
    isHorizontal: boolean; // 誰から鳴いたかによって横向きにする（立直ではない）
    isReach?: boolean;     // 互換性用（常にfalse）
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
      isHorizontal: idx === horizontalIndex,
      isReach: false,
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
    isHorizontal: idx === horizontalIndex,
    isReach: false,
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
 * 鳴くか問題用：手牌と他家の捨て牌から可能な鳴き選択肢（どういう形で鳴くか、スルーするか）を精密に自動算出
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
  const matchingInHand = hand.filter((t) => isSameTileType(t, targetTileId));
  if (matchingInHand.length >= 2) {
    const hasRedInHand = matchingInHand.some((t) => parseTileId(t).isRed);
    const nonRedCount = matchingInHand.filter((t) => !parseTileId(t).isRed).length;
    const redCount = matchingInHand.filter((t) => parseTileId(t).isRed).length;

    // 赤牌と黒牌の組み合わせが複数ある場合（例: 5m, 5m, 0m）
    if (hasRedInHand && nonRedCount >= 2 && redCount >= 1) {
      // 選択肢A: 黒牌2枚でポン（赤ドラを手牌に残す）
      const blackTiles = matchingInHand.filter((t) => !parseTileId(t).isRed).slice(0, 2);
      options.push({
        id: `pon-${blackTiles.join('-')}`,
        action: 'pon',
        label: `黒牌でポン（赤ドラを手牌に残す）`,
        consumedTiles: blackTiles,
        formedTiles: [...blackTiles, targetTileId],
        calledTile: targetTileId,
      });

      // 選択肢B: 赤ドラを使ってポン
      const red = matchingInHand.find((t) => parseTileId(t).isRed)!;
      const black = matchingInHand.find((t) => !parseTileId(t).isRed)!;
      options.push({
        id: `pon-${black}-${red}`,
        action: 'pon',
        label: `赤ドラを使ってポン`,
        consumedTiles: [black, red],
        formedTiles: [black, red, targetTileId],
        calledTile: targetTileId,
      });
    } else {
      // 通常のポン
      const consumed = matchingInHand.slice(0, 2);
      const isRedUsed = consumed.some((t) => parseTileId(t).isRed);
      const isTargetRed = target.isRed;
      const label = (isRedUsed || isTargetRed)
        ? `ポン（赤ドラ含む）`
        : `ポン`;
      options.push({
        id: `pon-${consumed.join('-')}`,
        action: 'pon',
        label,
        consumedTiles: consumed,
        formedTiles: [...consumed, targetTileId],
        calledTile: targetTileId,
      });
    }
  }

  // 2. カン（大明槓）判定（同種牌が3枚手牌にあるか）
  if (matchingInHand.length >= 3) {
    const consumed = matchingInHand.slice(0, 3);
    options.push({
      id: `kan-${consumed.join('-')}`,
      action: 'kan',
      label: `カン（大明槓）`,
      consumedTiles: consumed,
      formedTiles: [...consumed, targetTileId],
      calledTile: targetTileId,
    });
  }

  // 3. チー判定（上家からの打牌 かつ 数牌）
  if (isKami && target.suit !== 'z') {
    const val = target.value;
    const suit = target.suit;

    // 可能な3連続の数字パターン
    const patterns: Array<{
      type: 'penchan' | 'kanchan' | 'ryanmen' | 'jun';
      runValues: [number, number, number];
      reqValues: [number, number];
    }> = [];

    // パターンA: targetが左端 (val, val+1, val+2) -> 手牌に val+1, val+2
    if (val <= 7) {
      patterns.push({
        type: val === 7 ? 'penchan' : 'ryanmen',
        runValues: [val, val + 1, val + 2],
        reqValues: [val + 1, val + 2],
      });
    }

    // パターンB: targetが中央 (val-1, val, val+1) -> 手牌に val-1, val+1
    if (val >= 2 && val <= 8) {
      patterns.push({
        type: 'kanchan',
        runValues: [val - 1, val, val + 1],
        reqValues: [val - 1, val + 1],
      });
    }

    // パターンC: targetが右端 (val-2, val-1, val) -> 手牌に val-2, val-1
    if (val >= 3) {
      patterns.push({
        type: val === 3 ? 'penchan' : 'ryanmen',
        runValues: [val - 2, val - 1, val],
        reqValues: [val - 2, val - 1],
      });
    }

    for (const pat of patterns) {
      const [vA, vB] = pat.reqValues;
      const matchA = hand.filter((t) => parseTileId(t).suit === suit && parseTileId(t).value === vA);
      const matchB = hand.filter((t) => parseTileId(t).suit === suit && parseTileId(t).value === vB);

      // 手牌に両方の数字があるか
      if (matchA.length > 0 && matchB.length > 0) {
        // 赤牌と通常牌のバリエーションを展開
        const uniqueA = Array.from(new Set(matchA));
        const uniqueB = Array.from(new Set(matchB));

        for (const tA of uniqueA) {
          for (const tB of uniqueB) {
            const consumed = sortTiles([tA, tB]);
            const formed = sortTiles([tA, tB, targetTileId]);

            const suitName = suit === 'm' ? 'm' : suit === 'p' ? 'p' : 's';
            const aText = parseTileId(consumed[0]).isRed ? '赤5' : parseTileId(consumed[0]).value;
            const bText = parseTileId(consumed[1]).isRed ? '赤5' : parseTileId(consumed[1]).value;
            const consumedStr = `${aText}${bText}${suitName}`;

            const formedStr = formed
              .map((t) => (parseTileId(t).isRed ? '赤5' : parseTileId(t).value))
              .join('') + suitName;

            let typeName = '';
            if (pat.type === 'kanchan') {
              typeName = 'カンチャン';
            }

            const label = `${consumedStr}で${typeName}チー (${formedStr})`;

            options.push({
              id: `chi-${consumed.join('-')}`,
              action: 'chi',
              label,
              consumedTiles: consumed,
              formedTiles: formed,
              calledTile: targetTileId,
            });
          }
        }
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

// -------------------------------------------------------------
// シャンテン数・有効牌（受け入れ枚数）計算エンジン
// -------------------------------------------------------------

export const SHANTEN_TILE_INDEX: Record<string, number> = {};
const SHANTEN_INDEX_TILE: string[] = [];

(() => {
  let idx = 0;
  for (const s of ['m', 'p', 's'] as const) {
    for (let n = 1; n <= 9; n++) {
      const id = `${n}${s}`;
      SHANTEN_TILE_INDEX[id] = idx++;
      SHANTEN_INDEX_TILE.push(id);
    }
  }
  for (let n = 1; n <= 7; n++) {
    const id = `${n}z`;
    SHANTEN_TILE_INDEX[id] = idx++;
    SHANTEN_INDEX_TILE.push(id);
  }
})();

export function normalizeTileId(tileId: string): string {
  if (tileId === '0m') return '5m';
  if (tileId === '0p') return '5p';
  if (tileId === '0s') return '5s';
  return tileId;
}

/**
 * 手牌のシャンテン数を算出
 * (-1: アガリ, 0: 聴牌, 1: 一向聴, 2: 二向聴...)
 */
export function calculateShanten(tiles: string[], numMelds: number = 0): number {
  const counts = new Array<number>(34).fill(0);
  for (const t of tiles) {
    const norm = normalizeTileId(t);
    const i = SHANTEN_TILE_INDEX[norm];
    if (i !== undefined) counts[i]++;
  }

  const maxSets = 4 - numMelds;
  let minShanten = 8 - 2 * numMelds;

  // 1. 一般手 (面子手: 順子/刻子 + 雀頭)
  function search(tileIdx: number, sets: number, taatsu: number, hasHead: boolean): void {
    const effectiveTaatsu = Math.min(taatsu, maxSets - sets);
    const currentShanten = 2 * (maxSets - sets) - effectiveTaatsu - (hasHead ? 1 : 0);
    if (currentShanten < minShanten) {
      minShanten = currentShanten;
    }

    if (tileIdx >= 34) return;

    if (counts[tileIdx] === 0) {
      search(tileIdx + 1, sets, taatsu, hasHead);
      return;
    }

    // 刻子
    if (counts[tileIdx] >= 3) {
      counts[tileIdx] -= 3;
      search(tileIdx, sets + 1, taatsu, hasHead);
      counts[tileIdx] += 3;
    }

    // 順子 (萬子・筒子・索子のみ)
    if (tileIdx < 27 && tileIdx % 9 <= 6) {
      if (counts[tileIdx] >= 1 && counts[tileIdx + 1] >= 1 && counts[tileIdx + 2] >= 1) {
        counts[tileIdx]--;
        counts[tileIdx + 1]--;
        counts[tileIdx + 2]--;
        search(tileIdx, sets + 1, taatsu, hasHead);
        counts[tileIdx]++;
        counts[tileIdx + 1]++;
        counts[tileIdx + 2]++;
      }
    }

    // 雀頭
    if (counts[tileIdx] >= 2 && !hasHead) {
      counts[tileIdx] -= 2;
      search(tileIdx, sets, taatsu, true);
      counts[tileIdx] += 2;
    }

    // 対子を塔子として利用
    if (counts[tileIdx] >= 2 && sets + taatsu < maxSets) {
      counts[tileIdx] -= 2;
      search(tileIdx, sets, taatsu + 1, hasHead);
      counts[tileIdx] += 2;
    }

    // 両面・辺張塔子
    if (tileIdx < 27 && tileIdx % 9 <= 7 && sets + taatsu < maxSets) {
      if (counts[tileIdx] >= 1 && counts[tileIdx + 1] >= 1) {
        counts[tileIdx]--;
        counts[tileIdx + 1]--;
        search(tileIdx, sets, taatsu + 1, hasHead);
        counts[tileIdx]++;
        counts[tileIdx + 1]++;
      }
    }

    // 嵌張塔子
    if (tileIdx < 27 && tileIdx % 9 <= 6 && sets + taatsu < maxSets) {
      if (counts[tileIdx] >= 1 && counts[tileIdx + 2] >= 1) {
        counts[tileIdx]--;
        counts[tileIdx + 2]--;
        search(tileIdx, sets, taatsu + 1, hasHead);
        counts[tileIdx]++;
        counts[tileIdx + 2]++;
      }
    }

    // この牌を単騎・孤立牌としてスキップ
    search(tileIdx + 1, sets, taatsu, hasHead);
  }

  search(0, 0, 0, false);

  // 2. 七対子 (門前かつ純手牌13-14枚の場合のみ)
  if (numMelds === 0 && (tiles.length === 13 || tiles.length === 14)) {
    let pairs = 0;
    let kinds = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] >= 2) pairs++;
      if (counts[i] >= 1) kinds++;
    }
    const chiitoiShanten = 6 - pairs + Math.max(0, 7 - kinds);
    if (chiitoiShanten < minShanten) {
      minShanten = chiitoiShanten;
    }
  }

  // 3. 国士無双 (門前かつ純手牌13-14枚の場合のみ)
  if (numMelds === 0 && (tiles.length === 13 || tiles.length === 14)) {
    const kokushiIndices = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    let uniqueYao = 0;
    let hasPair = 0;
    for (const i of kokushiIndices) {
      if (counts[i] >= 1) uniqueYao++;
      if (counts[i] >= 2) hasPair = 1;
    }
    const kokushiShanten = 13 - uniqueYao - hasPair;
    if (kokushiShanten < minShanten) {
      minShanten = kokushiShanten;
    }
  }

  return minShanten;
}

/**
 * シャンテン数からラベルテキストを返却
 */
export function getShantenLabel(shanten: number): string {
  if (shanten === -1) return '和了 (アガリ)';
  if (shanten === 0) return '聴牌 (テンパイ)';
  if (shanten === 1) return '一向聴 (イーシャンテン)';
  if (shanten === 2) return '二向聴 (リャンシャンテン)';
  if (shanten === 3) return '三向聴 (サンシャンテン)';
  return `${shanten}向聴`;
}

/**
 * 特定の打牌後のシャンテン数と有効牌（受け入れ枚数）を精密計算
 * @param hand 現在の手牌（通常14枚、または副露時は3*(4-M)+2枚）
 * @param discardTile 切る牌
 * @param numMelds 成立している副露数 (0〜4)
 * @param visibleTiles 卓上で見えている牌（ドラ表示牌、河の捨て牌、他家の鳴き牌など）
 */
export function calculateUkeire(
  hand: string[],
  discardTile: string,
  numMelds: number = 0,
  visibleTiles: string[] = []
): UkeireResult {
  const normDiscard = normalizeTileId(discardTile);
  const handAfterDiscard = [...hand];
  const discardIdx = handAfterDiscard.findIndex((t) => normalizeTileId(t) === normDiscard);
  if (discardIdx !== -1) {
    handAfterDiscard.splice(discardIdx, 1);
  }

  const currentShanten = calculateShanten(handAfterDiscard, numMelds);

  // 見えている牌の集計 (自分の手牌 + 卓上の牌)
  const visibleCounts = new Array<number>(34).fill(0);
  for (const t of hand) {
    const i = SHANTEN_TILE_INDEX[normalizeTileId(t)];
    if (i !== undefined) visibleCounts[i]++;
  }
  for (const t of visibleTiles) {
    const i = SHANTEN_TILE_INDEX[normalizeTileId(t)];
    if (i !== undefined) visibleCounts[i]++;
  }

  const effectiveTiles: EffectiveTile[] = [];
  let totalCount = 0;

  // 34種の牌をツモったときにシャンテン数が進むか（減るか）チェック
  for (let i = 0; i < 34; i++) {
    const tileName = SHANTEN_INDEX_TILE[i];
    const testHand = [...handAfterDiscard, tileName];
    const newShanten = calculateShanten(testHand, numMelds);

    if (newShanten < currentShanten) {
      const remaining = Math.max(0, 4 - visibleCounts[i]);
      effectiveTiles.push({ tile: tileName, remaining });
      totalCount += remaining;
    }
  }

  // 有効牌を残枚数の多い順にソート（同数なら牌番号順）
  effectiveTiles.sort((a, b) => {
    if (b.remaining !== a.remaining) return b.remaining - a.remaining;
    return (SHANTEN_TILE_INDEX[a.tile] || 0) - (SHANTEN_TILE_INDEX[b.tile] || 0);
  });

  return {
    shanten: currentShanten,
    shantenLabel: getShantenLabel(currentShanten),
    effectiveTiles,
    totalCount,
  };
}
