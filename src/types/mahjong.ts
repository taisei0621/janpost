export type Suit = 'm' | 'p' | 's' | 'z';

export interface Tile {
  id: string; // e.g. "1m", "5p", "7z", "0m"(赤)
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

export interface Problem {
  id: string;
  title: string;
  level: ProblemLevel;
  context: {
    round: string; // e.g. "東1局"
    turn: number;  // 巡目 e.g. 6
    wind: string;  // 自家 e.g. "南家"
    dora: string;  // ドラ表示牌 or ドラ e.g. "5p"
    score?: number; // 点数状況 (持ち点数値)
    scoreInfo?: string; // 詳細な点数・順位状況 (e.g. "東家 36000 / 南家(自分) 24000 / 西家 20000 / 北家 20000")
    discardsInfo?: string; // 捨て牌・他家状況 (e.g. "対面の親から6巡目リーチ、河に1m・8p・発")
    note?: string;  // 状況補足
  };
  hand: string[]; // 14枚のTileId配列 (最後がツモ牌)
  discards: RecommendedDiscard[];
  explanation: string;
  author: string;
  createdAt: string;
  stats: Record<string, number>; // 各TileIdの投票数
  comments?: VoteComment[]; // 回答者の打牌理由一覧
}
