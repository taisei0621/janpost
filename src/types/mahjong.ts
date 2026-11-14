export type Suit = 'm' | 'p' | 's' | 'z';

export interface Tile {
  id: string; // e.g. "1m", "5p", "7z", "0m"(赤5m)
  suit: Suit;
  value: number; // 1-9 for m, p, s; 1-7 for z
  isRed?: boolean;
}

export type ProblemLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProblemType = 'discard' | 'meld'; // 何切る問題 | 鳴くか問題

export type MeldType = 'chi' | 'pon' | 'daiminkan' | 'ankan' | 'kakan';
export type MeldFrom = 'kami' | 'toimen' | 'shimo' | 'self'; // 上家、対面、下家、自分(暗槓)

export interface MeldInfo {
  type: MeldType;
  from: MeldFrom;
  tiles: string[]; // 牌ID配列 e.g. ["1m", "2m", "3m"], ["7z", "7z", "7z", "7z"]
  calledTile?: string; // 相手から鳴いた牌（横向きにする牌）
  label?: string; // e.g. "上家からチー", "対面からポン"
}

export interface RecommendedDiscard {
  tileId: string;
  rank: 'best' | 'good' | 'bad';
  label: string; // e.g. "本命（受け入れ最大）", "打点重視", "安全策"
  reason: string;
}

export interface VoteComment {
  id: string;
  problemId: string;
  tileId: string;
  comment: string;
  createdAt: string;
}

// 捨て牌（1牌）の情報：手出し・ツモ切り・リーチ宣言
export interface DiscardTile {
  tileId: string;
  isTsumogiri: boolean; // true = ツモ切り (薄暗く表示), false = 手出し (通常)
  isReach?: boolean;    // リーチ宣言牌（横向き）
}

// 各家の戦況（点数、河、鳴き牌、リーチ）
export interface PlayerSituation {
  wind: '東家' | '南家' | '西家' | '北家';
  score: number;
  discards: DiscardTile[];
  melds: Array<string | MeldInfo>; // 文字列または詳細MeldInfo
  isReach?: boolean;
}

// 鳴くか問題の対象牌情報
export interface MeldTarget {
  fromWind: '東家' | '南家' | '西家' | '北家'; // 牌を捨てた家
  tileId: string; // 捨てられた牌
}

// 鳴くか問題の選択肢（例: "chi-123m", "pon", "pass"）
export interface MeldOption {
  id: string; // 選択肢キー (tileIdとしてstatsやcommentsに記録)
  action: 'chi' | 'pon' | 'kan' | 'pass';
  label: string; // e.g. "チー (123m)", "ポン (白)", "スルー (鳴かない)"
  consumedTiles?: string[]; // 鳴きに使う自分の手牌
}

export interface Problem {
  id: string;
  title: string;
  level: ProblemLevel;
  problemType?: ProblemType; // デフォルトは 'discard' (何切る)
  meldTarget?: MeldTarget;    // 鳴くか問題の場合の対象牌
  meldOptions?: MeldOption[]; // 鳴くか問題の場合の選択肢
  imageUrl?: string; // 写真・スクショ投稿時の画像URL (Base64)
  context: {
    round: string; // e.g. "東1局"
    honba?: number; // 本場数 e.g. 0, 1, 2
    turn: number;  // 巡目 e.g. 6
    wind: string;  // 自家 e.g. "南家"
    dora: string;  // ドラ表示牌（1枚目） e.g. "5p", "0m"
    doras?: string[]; // ドラ表示牌（最大5枚：表ドラ＋槓ドラ）
    score?: number; // 点数状況 (持ち点数値)
    scores?: Record<'東家' | '南家' | '西家' | '北家', number>; // 各家の点数
    players?: Record<string, PlayerSituation>; // 各家の捨て牌・鳴き・リーチ状況
    scoreInfo?: string; // テキスト要約
    discardsInfo?: string; // テキスト要約
    note?: string;  // 状況補足
  };
  hand: string[]; // 手牌のTileId配列 (門前なら14枚、1副露なら11枚、2副露なら8枚、3副露なら5枚、4副露なら2枚)
  discards: RecommendedDiscard[];
  explanation: string;
  author: string;
  createdAt: string;
  stats: Record<string, number>; // 各TileIdまたはMeldOptionIdの投票数
  likes?: number; // いいね数
  comments?: VoteComment[]; // 回答者の打牌/判断理由一覧
}
