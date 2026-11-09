export type Suit = 'm' | 'p' | 's' | 'z';

export interface Tile {
  id: string; // e.g. "1m", "5p", "7z", "0m"(赤5m)
  suit: Suit;
  value: number; // 1-9 for m, p, s; 1-7 for z
  isRed?: boolean;
}

export type ProblemLevel = 'beginner' | 'intermediate' | 'advanced';

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
  melds: string[]; // 鳴き牌リスト 例: ["1m-2m-3m", "7z-7z-7z"]
  isReach?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  level: ProblemLevel;
  imageUrl?: string; // 写真・スクショ投稿時の画像URL (Base64)
  context: {
    round: string; // e.g. "東1局"
    turn: number;  // 巡目 e.g. 6
    wind: string;  // 自家 e.g. "南家"
    dora: string;  // ドラ表示牌 or ドラ e.g. "5p", "0m"
    score?: number; // 点数状況 (持ち点数値)
    scores?: Record<'東家' | '南家' | '西家' | '北家', number>; // 各家の点数
    players?: Record<string, PlayerSituation>; // 各家の捨て牌・鳴き・リーチ状況
    scoreInfo?: string; // テキスト要約
    discardsInfo?: string; // テキスト要約
    note?: string;  // 状況補足
  };
  hand: string[]; // 14枚のTileId配列 (最後がツモ牌、写真モード時は空配列も可)
  discards: RecommendedDiscard[];
  explanation: string;
  author: string;
  createdAt: string;
  stats: Record<string, number>; // 各TileIdの投票数
  likes?: number; // いいね数
  comments?: VoteComment[]; // 回答者の打牌理由一覧
}
