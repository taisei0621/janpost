'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Problem, VoteComment, PlayerSituation, MeldOption } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { MahjongTableView } from './MahjongTableView';
import {
  getTileDisplay,
  sortHandWithTsumo,
  getDoraTiles,
  parseMeldDisplay,
  calculateAvailableMeldOptions,
} from '../utils/mahjongUtils';
import {
  isProblemLikedByMe,
  setProblemLikedByMe,
  canDeleteProblem,
} from '../utils/problemService';

interface ProblemCardProps {
  problem: Problem;
  onVote?: (problemId: string, tileId: string, comment?: string) => void;
  onLike?: (problemId: string, increment: boolean) => void;
  onDelete?: (problemId: string) => void;
  canDelete?: boolean;
}

const WINDS: Array<'東家' | '南家' | '西家' | '北家'> = ['東家', '南家', '西家', '北家'];

// 投票用パレット牌（写真モード時）
const MAN_TILES = ['1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m'];
const PIN_TILES = ['1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p'];
const SOU_TILES = ['1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s'];
const ZI_TILES = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];
const ALL_VOTE_TILES = [...MAN_TILES, ...PIN_TILES, ...SOU_TILES, ...ZI_TILES];

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onVote,
  onLike,
  onDelete,
  canDelete: propCanDelete,
}) => {
  const isMeldProblem = problem.problemType === 'meld';
  const meldTarget = problem.meldTarget;

  // 手牌の理牌（何切るなら最後の1枚をツモ牌分離、鳴くか問題ならそのまま理牌）
  const sortedHand = useMemo(() => {
    return sortHandWithTsumo(problem.hand || []);
  }, [problem.hand]);

  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [photoSelectedTile, setPhotoSelectedTile] = useState<string | null>(null);
  const [selectedMeldOptionId, setSelectedMeldOptionId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userReason, setUserReason] = useState('');
  const [stats, setStats] = useState<Record<string, number>>(problem.stats);
  const [comments, setComments] = useState<VoteComment[]>(problem.comments || []);
  const [filterCommentTile, setFilterCommentTile] = useState<string>('all');
  const [additionalComment, setAdditionalComment] = useState('');

  // プレイヤー情報の安全パース
  const playersObj = useMemo(() => {
    if (!problem.context.players) return undefined;
    if (typeof problem.context.players === 'string') {
      try {
        return JSON.parse(problem.context.players);
      } catch {
        return undefined;
      }
    }
    return problem.context.players;
  }, [problem.context.players]);

  // 自家（自分）の副露（鳴き牌）
  const myMelds = useMemo(() => {
    const selfSit = playersObj ? (playersObj[problem.context.wind] as PlayerSituation | undefined) : undefined;
    return selfSit?.melds || [];
  }, [playersObj, problem.context.wind]);

  // 鳴くか問題の利用可能な選択肢
  const availableMeldOptions = useMemo<MeldOption[]>(() => {
    if (!isMeldProblem) return [];
    if (problem.meldOptions && problem.meldOptions.length > 0) {
      return problem.meldOptions;
    }
    if (meldTarget) {
      return calculateAvailableMeldOptions(
        problem.hand || [],
        meldTarget.tileId,
        meldTarget.fromWind,
        problem.context.wind
      );
    }
    return [
      { id: 'pass', action: 'pass', label: 'スルー（鳴かない）' },
      { id: 'pon', action: 'pon', label: 'ポン' },
      { id: 'chi', action: 'chi', label: 'チー' },
    ];
  }, [isMeldProblem, problem.meldOptions, problem.hand, meldTarget, problem.context.wind]);

  // いいね機能
  const [isLiked, setIsLiked] = useState<boolean>(() => isProblemLikedByMe(problem.id));
  const [likeCount, setLikeCount] = useState<number>(problem.likes || 0);

  useEffect(() => {
    if (problem.likes !== undefined) {
      setLikeCount(problem.likes);
    }
  }, [problem.likes]);

  useEffect(() => {
    setIsLiked(isProblemLikedByMe(problem.id));
  }, [problem.id]);

  const canDelete = propCanDelete !== undefined ? propCanDelete : canDeleteProblem(problem.id);

  const handleToggleLike = () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLikeCount(nextCount);
    setProblemLikedByMe(problem.id, nextLiked);
    if (onLike) {
      onLike(problem.id, nextLiked);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`この問題「${problem.title}」を削除しますか？\n（元に戻せません）`)) {
      if (onDelete) {
        onDelete(problem.id);
      }
    }
  };

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [showRiverViewer, setShowRiverViewer] = useState(false);

  const isPhotoMode = Boolean(problem.imageUrl || (!problem.hand || problem.hand.length === 0));

  const riverStats = useMemo(() => {
    if (!playersObj) return { totalDiscards: 0, totalMelds: 0, hasRiver: false };
    let totalDiscards = 0;
    let totalMelds = 0;

    for (const p of Object.values(playersObj) as PlayerSituation[]) {
      if (p?.discards && Array.isArray(p.discards)) totalDiscards += p.discards.length;
      if (p?.melds && Array.isArray(p.melds)) totalMelds += p.melds.length;
    }
    return {
      totalDiscards,
      totalMelds,
      hasRiver: totalDiscards > 0 || totalMelds > 0,
    };
  }, [playersObj]);

  const doraTiles = getDoraTiles(problem.context);

  const selectedTile = isPhotoMode
    ? photoSelectedTile
    : selectedTileIndex !== null
    ? sortedHand[selectedTileIndex]
    : null;

  // 選択された回答キー（何切るなら牌ID、鳴くか問題ならoption.id）
  const selectedChoice = isMeldProblem ? selectedMeldOptionId : selectedTile;

  // 選択肢キーの表示ラベル変換ヘルパー
  const getChoiceLabel = (key: string) => {
    if (isMeldProblem) {
      const opt = availableMeldOptions.find((o) => o.id === key);
      if (opt) return opt.label;
      if (key === 'pass') return 'スルー（鳴かない）';
      if (key === 'pon') return 'ポン';
      if (key === 'kan') return 'カン';
      if (key.startsWith('chi')) return 'チー';
      return key;
    }
    const tDisp = getTileDisplay(key);
    return `${tDisp.topText}${tDisp.bottomText}`;
  };

  // 切手風の難易度バッジ
  const levelBadges = {
    beginner: {
      text: '初級',
      stampClass: 'border-[#124D27] text-[#124D27] bg-[#EAF2EC]',
      sealText: '初',
    },
    intermediate: {
      text: '中級',
      stampClass: 'border-[#1E3A5F] text-[#1E3A5F] bg-[#E8EFF7]',
      sealText: '中',
    },
    advanced: {
      text: '上級',
      stampClass: 'border-[#5B2C6F] text-[#5B2C6F] bg-[#F3EBF7]',
      sealText: '上',
    },
  };

  const handleSelectTile = (index: number) => {
    if (hasAnswered || isMeldProblem) return;
    setSelectedTileIndex(index);
  };

  const handleSubmit = (withComment: boolean = true) => {
    if (!selectedChoice || hasAnswered) return;

    const finalComment = withComment && userReason.trim() ? userReason.trim() : '';

    setStats((prev) => ({
      ...prev,
      [selectedChoice]: (prev[selectedChoice] || 0) + 1,
    }));

    if (finalComment) {
      const newComment: VoteComment = {
        id: `c-user-${Date.now()}`,
        problemId: problem.id,
        tileId: selectedChoice,
        comment: finalComment,
        createdAt: 'たった今',
      };
      setComments((prev) => [newComment, ...prev]);
    }

    setHasAnswered(true);

    if (onVote) {
      onVote(problem.id, selectedChoice, finalComment || undefined);
    }
  };

  const handleAddPostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalComment.trim() || !selectedChoice) return;

    const newComment: VoteComment = {
      id: `c-user-${Date.now()}`,
      problemId: problem.id,
      tileId: selectedChoice,
      comment: additionalComment.trim(),
      createdAt: 'たった今',
    };
    setComments((prev) => [newComment, ...prev]);

    if (onVote) {
      onVote(problem.id, selectedChoice, additionalComment.trim());
    }
    setAdditionalComment('');
  };

  const handleReset = () => {
    setHasAnswered(false);
    setSelectedTileIndex(null);
    setPhotoSelectedTile(null);
    setSelectedMeldOptionId(null);
    setUserReason('');
  };

  const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0);
  const selectedDiscardInfo = problem.discards.find((d) => d.tileId === selectedChoice);
  const bestDiscard = problem.discards.find((d) => d.rank === 'best');

  const filteredComments = comments.filter((c) =>
    filterCommentTile === 'all' ? true : c.tileId === filterCommentTile
  );

  const scores = problem.context.scores;
  const hasDetailedBoard = true;

  return (
    <div className="w-full max-w-3xl postcard-paper rounded-2xl overflow-hidden transition-all duration-200 mb-8 border border-[#D5CEBE]">
      {/* ハガキ上部：エアメールの細い飾り枠 */}
      <div className="w-full h-1 airmail-stripe border-b border-[#D5CEBE]" />

      {/* 写真全画面拡大モーダル */}
      {isPhotoModalOpen && problem.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs cursor-zoom-out"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] overflow-auto">
            <img
              src={problem.imageUrl}
              alt="拡大写真"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl mx-auto border-4 border-[#FBF9F4]"
            />
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(false)}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-lg font-bold w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* ハガキのヘッダー部（切手・消印・出題者） */}
      <div className="p-4 sm:p-6 bg-[#F8F5EC] border-b border-[#D5CEBE]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          {/* 左側：切手風難易度バッジ ＆ 出題者 */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 切手風バッジ */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-dashed text-xs font-bold font-serif ${levelBadges[problem.level].stampClass}`}>
              <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px]">
                {levelBadges[problem.level].sealText}
              </span>
              <span>{levelBadges[problem.level].text}</span>
            </div>

            {isMeldProblem && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FDF2F2] text-[#C82C26] border border-[#C82C26]/30 font-serif">
                <span>⚡ 鳴くか判断</span>
              </span>
            )}

            {problem.imageUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#EAE4D7] text-[#5C5549] border border-[#D5CEBE]">
                <span>📷 写真あり</span>
              </span>
            )}

            <span className="text-xs text-[#7A7265] font-serif">
              出題: <strong className="text-[#262422]">{problem.author}</strong>
            </span>
          </div>

          {/* 右側：消印スタンプ風メタ情報 & いいねスタンプ */}
          <div className="flex items-center gap-2">
            {/* 消印スタンプ（日付 & 局） */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#1E3A5F]/40 text-[#1E3A5F] text-[10px] font-mono bg-[#E8EFF7]/60">
              <span>〒 JANPOST</span>
              <span>•</span>
              <span>{problem.createdAt}</span>
            </div>

            {/* いいねボタン（ハート） */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer select-none ${
                isLiked
                  ? 'bg-[#FDF2F2] border-[#C82C26] text-[#C82C26] shadow-xs'
                  : 'bg-[#FBF9F4] border-[#D5CEBE] text-[#7A7265] hover:border-[#C82C26] hover:text-[#C82C26]'
              }`}
              title="いいね"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${isLiked ? 'fill-[#C82C26] text-[#C82C26] scale-110' : 'fill-none text-[#7A7265]'}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="font-mono tabular-nums">{likeCount}</span>
            </button>

            {/* 削除ボタン（権限所持時のみ） */}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="この問題を削除"
                className="p-1.5 text-[#7A7265] hover:text-[#C82C26] hover:bg-[#F2E8E7] rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 問題タイトル */}
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#262422] font-serif mb-3">
          {problem.title}
        </h3>

        {/* 局況HUD（消印風スタンプ・ドラ切手トレイ・伝票風点数） */}
        <div className="bg-[#FBF9F4] rounded-xl p-3 sm:p-4 border border-[#D5CEBE] space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            {/* 局況消印バッジ */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 bg-[#1E3A5F] text-white px-2.5 py-1 rounded-md font-bold font-serif text-xs shadow-xs">
                <span>{problem.context.round}</span>
                {problem.context.honba && problem.context.honba > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-amber-300">
                    <img src="/pai-images/tennbou-000.png" alt="本場" className="h-1.5 w-auto rotate-90 inline" />
                    <span>{problem.context.honba}本場</span>
                  </span>
                ) : null}
              </div>

              <span className="text-[#C5BDAA]">/</span>
              <span className="font-semibold text-[#5C5549] font-serif">
                {problem.context.turn}巡目
              </span>

              <span className="text-[#C5BDAA]">/</span>
              <span className="font-semibold text-[#5C5549] font-serif">
                自家: <strong className="text-[#262422]">{problem.context.wind}</strong>
              </span>

              {riverStats.hasRiver && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#124D27] bg-[#EAF2EC] px-2 py-0.5 rounded-full border border-[#124D27]/30">
                  <span>🀄</span>
                  <span>河データあり</span>
                </span>
              )}
            </div>

            {/* ドラ表示牌（切手トレイ風） */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1E3A5F] font-serif">
                ドラ表示牌{doraTiles.length > 1 ? ` (${doraTiles.length})` : ''}:
              </span>
              <div className="flex items-center gap-1 p-1 rounded-md bg-[#EAE4D7] border border-[#D5CEBE]">
                {doraTiles.map((dt, idx) => (
                  <MahjongTile key={`card-dora-${dt}-${idx}`} tileId={dt} size="sm" disabled />
                ))}
              </div>
            </div>
          </div>

          {/* 各家の点数チップ */}
          {scores && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#EAE4D7]">
              {WINDS.map((w) => {
                const isSelf = w === problem.context.wind;
                const sc = scores[w];
                const selfScore = scores[problem.context.wind as '東家' | '南家' | '西家' | '北家'] || 25000;
                const diff = sc - selfScore;
                return (
                  <div
                    key={`sc-chip-${w}`}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      isSelf
                        ? 'bg-[#E8EFF7] border-[#1E3A5F] shadow-xs'
                        : 'bg-[#F8F5EC] border-[#D5CEBE]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#262422] font-serif flex items-center gap-1">
                        {w}
                        {isSelf && (
                          <span className="text-[9px] font-sans font-bold text-[#1E3A5F] px-1 py-0.2 rounded bg-white border border-[#1E3A5F]/30">
                            自分
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-[#262422] tabular-nums">
                        {sc?.toLocaleString()}
                      </span>
                    </div>
                    {!isSelf && sc !== undefined && (
                      <div className="text-right text-[10px] font-mono leading-none pt-0.5">
                        <span className={diff >= 0 ? 'text-[#124D27]' : 'text-[#C82C26]'}>
                          {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 点数テキスト（フォールバック） */}
          {problem.context.scoreInfo && !scores && (
            <div className="flex items-start gap-2 text-xs bg-[#F8F5EC] text-[#5C5549] p-2.5 rounded-lg border border-[#D5CEBE]">
              <span className="font-bold shrink-0 font-serif">📊 点数状況:</span>
              <span>{problem.context.scoreInfo}</span>
            </div>
          )}

          {/* 捨て牌・他家状況テキスト */}
          {problem.context.discardsInfo && (
            <div className="text-xs bg-[#F8F5EC] text-[#5C5549] p-2.5 rounded-lg border border-[#D5CEBE] leading-relaxed">
              <span className="font-bold text-[#262422] mr-1.5 font-serif">状況メモ:</span>
              <span className="whitespace-pre-line">{problem.context.discardsInfo}</span>
            </div>
          )}

          {/* 対局盤面（各家の河）ビューワー開閉ボタン */}
          {hasDetailedBoard && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRiverViewer(!showRiverViewer)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all border cursor-pointer ${
                  riverStats.hasRiver
                    ? 'bg-[#EAF2EC] hover:bg-[#D9EADB] text-[#124D27] border-[#124D27]/40 shadow-xs'
                    : 'bg-[#EAE4D7] hover:bg-[#DCD5C6] text-[#5C5549] border-[#D5CEBE]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🀄 対局盤面（各家の河・点数状況）</span>
                  {riverStats.hasRiver && (
                    <span className="text-[10px] bg-[#124D27] text-white font-bold px-1.5 py-0.5 rounded-full font-mono">
                      捨て牌 {riverStats.totalDiscards}枚
                      {riverStats.totalMelds > 0 ? ` / 副露 ${riverStats.totalMelds}` : ''}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-bold ${riverStats.hasRiver ? 'text-[#124D27]' : 'text-[#7A7265]'}`}>
                  {showRiverViewer ? '▲ 盤面を閉じる' : '▼ 盤面を開く'}
                </span>
              </button>

              {/* 盤面展開エリア（※変更禁止エリア） */}
              {showRiverViewer && (
                <div className="mt-2.5 animate-fade-in">
                  <MahjongTableView problem={problem} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 写真・手牌表示エリア */}
      <div className="p-4 sm:p-6 flex flex-col items-center">
        {/* 写真がある場合の画像表示 */}
        {problem.imageUrl && (
          <div className="w-full mb-4 text-center">
            <div
              className="relative inline-block max-w-full overflow-hidden rounded-xl border-2 border-[#D5CEBE] shadow-md group cursor-zoom-in bg-white p-1"
              onClick={() => setIsPhotoModalOpen(true)}
            >
              <img
                src={problem.imageUrl}
                alt="問題の対局写真"
                className="max-h-72 sm:max-h-96 w-auto object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01] rounded-lg"
              />
              <div className="absolute bottom-3 right-3 bg-[#262422]/80 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm font-serif">
                <span>🔍 拡大表示</span>
              </div>
            </div>
          </div>
        )}

        {/* ★ 鳴くか問題専用：出題対象牌（他家から出た牌） */}
        {isMeldProblem && meldTarget && (
          <div className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-[#FDF4E7] border-2 border-[#C82C26] shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-xl border border-[#C82C26] shadow-xs">
                <MahjongTile tileId={meldTarget.tileId} size="md" disabled />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-[#C82C26] px-2 py-0.5 rounded font-serif shadow-xs">
                    ⚡ 鳴き対象牌
                  </span>
                  <span className="text-xs font-bold text-[#262422] font-serif">
                    【{meldTarget.fromWind}】からの打牌
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#403B33] mt-1 font-serif">
                  <strong>{meldTarget.fromWind}</strong>が打【{getTileDisplay(meldTarget.tileId).topText}{getTileDisplay(meldTarget.tileId).bottomText}】。この牌を鳴きますか？スルーしますか？
                </p>
              </div>
            </div>

            {!hasAnswered && (
              <span className="text-[11px] font-bold text-[#C82C26] bg-white px-2.5 py-1 rounded-full font-serif border border-[#C82C26]/30">
                下のアクションを選択
              </span>
            )}
          </div>
        )}

        {/* 手牌トレイコンテナと牌の並び（純手牌 ＋ 自家の副露牌を一列に配置） */}
        {sortedHand.length > 0 && (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-2.5 px-2">
              <span className="text-xs sm:text-sm font-bold text-[#262422] font-serif">
                {hasAnswered
                  ? '回答結果と雀士たちの統計'
                  : isMeldProblem
                  ? '⚡ 鳴き判断（他家の打牌に対するアクションを選択してください）'
                  : `手牌${sortedHand.length}枚から切る牌を選択してください`}
              </span>
              <div className="flex items-center gap-1.5">
                {myMelds.length > 0 && (
                  <span className="text-[11px] font-bold text-[#124D27] bg-[#EAF2EC] px-2 py-0.5 rounded-md border border-[#124D27]/30">
                    {myMelds.length}副露中
                  </span>
                )}
                <span className="text-[11px] font-mono text-[#5C5549] bg-[#EAE4D7] px-2 py-0.5 rounded-md border border-[#D5CEBE]">
                  純手牌 {sortedHand.length}枚
                </span>
              </div>
            </div>

            {/* 卓コンテナ（※純手牌＋自家の副露を一列に配置） */}
            <div className="w-full rounded-2xl p-2 sm:p-3 bg-[#114624] border border-[#0d3b1e] shadow-inner">
              <div className="w-full overflow-x-auto pb-2 pt-2 px-1 flex justify-center items-end bg-[#14532b] rounded-xl border border-emerald-600/30">
                <div className="flex items-end flex-nowrap gap-2 sm:gap-4">
                  {/* 純手牌 */}
                  <div className="flex items-end flex-nowrap">
                    {sortedHand.map((tileId, index) => {
                      const isTsumo = !isMeldProblem && [14, 11, 8, 5, 2].includes(sortedHand.length) && index === sortedHand.length - 1;
                      const isSelected = !isMeldProblem && selectedTileIndex === index;
                      const isBestTile = hasAnswered && !isMeldProblem && bestDiscard?.tileId === tileId;

                      return (
                        <MahjongTile
                          key={`hand-${tileId}-${index}`}
                          tileId={tileId}
                          size="md"
                          isTsumo={isTsumo}
                          showTsumoLabel={isTsumo}
                          selected={isSelected}
                          disabled={hasAnswered || isMeldProblem}
                          onClick={() => !isMeldProblem && handleSelectTile(index)}
                          badge={isBestTile ? '正解' : undefined}
                        />
                      );
                    })}
                  </div>

                  {/* 自家の副露（鳴き牌）：手牌の右側に並べて表示 */}
                  {myMelds.length > 0 && (
                    <div className="flex items-end gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-3 border-l-2 border-emerald-500/40">
                      {myMelds.map((meldItem, mIdx) => {
                        const parsed = parseMeldDisplay(meldItem);
                        return (
                          <div
                            key={`self-meld-${mIdx}`}
                            className="flex flex-col items-center bg-[#0d3b1e]/80 px-1.5 py-0.5 rounded-lg border border-emerald-500/30 shadow-xs"
                            title={parsed.label}
                          >
                            <span className="text-[9px] text-emerald-200 font-bold mb-0.5 font-serif">
                              {parsed.label}
                            </span>
                            <div className="flex items-end gap-0.5">
                              {parsed.tiles.map((t, tIdx) => (
                                <MahjongTile
                                  key={`self-meld-${mIdx}-${tIdx}`}
                                  tileId={t.tileId}
                                  size="sm"
                                  isReach={t.isReach}
                                  disabled
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 鳴くか問題のアクション選択肢ボタン */}
        {isMeldProblem && !hasAnswered && (
          <div className="w-full max-w-lg mt-4 p-3.5 bg-[#F8F5EC] rounded-xl border border-[#D5CEBE] space-y-2.5">
            <span className="text-xs font-bold text-[#262422] block font-serif">
              この牌に対するあなたのアクションを選択してください:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {availableMeldOptions.map((opt) => {
                const isSelected = selectedMeldOptionId === opt.id;
                const isPass = opt.action === 'pass';
                return (
                  <button
                    key={`opt-${opt.id}`}
                    type="button"
                    onClick={() => setSelectedMeldOptionId(opt.id)}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                      isSelected
                        ? isPass
                          ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm scale-[1.02]'
                          : 'bg-[#C82C26] text-white border-[#C82C26] shadow-sm scale-[1.02]'
                        : 'bg-[#FBF9F4] text-[#262422] border-[#D5CEBE] hover:border-[#C82C26]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{isPass ? '🚫' : '🀄'}</span>
                      <div>
                        <div className="font-serif font-bold text-xs sm:text-sm">{opt.label}</div>
                        {opt.consumedTiles && opt.consumedTiles.length > 0 && (
                          <div className={`text-[10px] ${isSelected ? 'opacity-90' : 'text-[#7A7265]'}`}>
                            使用牌: {opt.consumedTiles.map((t) => `${getTileDisplay(t).topText}${getTileDisplay(t).bottomText}`).join(' ')}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 写真投稿モードで手牌がない場合の打牌選択パレット */}
        {isPhotoMode && !isMeldProblem && !hasAnswered && (
          <div className="w-full max-w-lg mt-3 p-3.5 bg-[#F8F5EC] rounded-xl border border-[#D5CEBE] space-y-2">
            <span className="text-xs font-bold text-[#262422] block font-serif">
              写真を見て、何を切るか下の牌から選択してください:
            </span>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-2 bg-[#FBF9F4] rounded-lg border border-[#D5CEBE]">
              {ALL_VOTE_TILES.map((tileId) => {
                const isSelected = photoSelectedTile === tileId;
                const disp = getTileDisplay(tileId);
                return (
                  <button
                    key={`photo-vote-${tileId}`}
                    type="button"
                    onClick={() => setPhotoSelectedTile(tileId)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm scale-105'
                        : 'bg-[#FBF9F4] text-[#262422] border-[#D5CEBE] hover:border-[#1E3A5F]'
                    }`}
                  >
                    <span className={disp.suitColor}>{disp.topText}</span>
                    <span>{disp.bottomText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 回答前：打牌決定・理由入力エリア（「問題を投函する」ボタン） */}
        {!hasAnswered && (
          <div className="mt-5 w-full max-w-md flex flex-col items-center gap-3">
            {selectedChoice ? (
              <div className="w-full bg-[#F8F5EC] p-4 rounded-2xl border-2 border-[#1E3A5F] space-y-3 animate-fade-in shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1E3A5F] font-serif">
                      {isMeldProblem ? '選択中の判断:' : '選択中の打牌:'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-sm bg-white px-2.5 py-0.5 rounded border border-[#1E3A5F] text-[#1E3A5F] shadow-xs">
                      {isMeldProblem ? (
                        <span>{getChoiceLabel(selectedChoice)}</span>
                      ) : (
                        <>
                          <span>{getTileDisplay(selectedChoice).topText}</span>
                          <span>{getTileDisplay(selectedChoice).bottomText}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#7A7265] font-serif">理由は任意</span>
                </div>

                {/* 理由入力フォーム */}
                <input
                  type="text"
                  placeholder={
                    isMeldProblem
                      ? '判断の理由をひとこと（例: 打点重視で鳴く、親リーの安牌残しでスルー）'
                      : '打牌理由をひとこと（例: 筒子の受け入れ最大、親リーチの現物）'
                  }
                  value={userReason}
                  onChange={(e) => setUserReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(true);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
                />

                <div className="flex items-center gap-2 pt-1">
                  {/* 「問題を投函する」立体ボタン */}
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="btn-postbox flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📮</span>
                    <span>
                      {userReason.trim()
                        ? '理由を添えて投函する'
                        : isMeldProblem
                        ? 'この判断を投函する'
                        : 'この打牌を投函する'}
                    </span>
                  </button>
                  {userReason.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      className="py-2.5 px-3 text-xs text-[#7A7265] hover:text-[#262422] rounded-xl hover:bg-[#EAE4D7] transition-colors cursor-pointer font-serif"
                    >
                      理由なしで即投票
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#7A7265] py-2 font-serif">
                {isMeldProblem
                  ? '上の選択肢から鳴くかスルーするか選んでください'
                  : isPhotoMode
                  ? '上のパレットから切りたい牌を選んでください'
                  : '上の手牌から切りたい牌をタップしてください'}
              </p>
            )}
          </div>
        )}

        {/* 回答後：結果・統計・考察コメント */}
        {hasAnswered && (
          <div className="w-full mt-6 space-y-6 animate-fade-in">
            {/* 正解/妥協/悪手判定カード */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 shadow-xs ${
                selectedDiscardInfo?.rank === 'best'
                  ? 'bg-[#EAF2EC] border-[#124D27] text-[#124D27]'
                  : selectedDiscardInfo?.rank === 'good'
                  ? 'bg-[#E8EFF7] border-[#1E3A5F] text-[#1E3A5F]'
                  : 'bg-[#FDF4E7] border-[#C82C26] text-[#C82C26]'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base sm:text-lg mb-1.5 font-serif">
                {selectedDiscardInfo?.rank === 'best' && (isMeldProblem ? '🎉 素晴らしい！本命の正解判断です' : '🎉 素晴らしい！本命の正解打牌です')}
                {selectedDiscardInfo?.rank === 'good' && (isMeldProblem ? '🤔 妥協手・別ルートの判断です' : '🤔 妥協手・別ルートの打牌です')}
                {(!selectedDiscardInfo || selectedDiscardInfo.rank === 'bad') && (isMeldProblem ? '⚠️ 悪手、または推奨されない判断です' : '⚠️ 悪手、または推奨されない打牌です')}
              </div>
              <p className="text-sm opacity-90 leading-relaxed font-serif">
                あなたの選択:{' '}
                <span className="font-bold underline">
                  {selectedChoice ? getChoiceLabel(selectedChoice) : ''}
                </span>{' '}
                — {selectedDiscardInfo?.reason || (isMeldProblem ? '局面に応じた判断が求められます。' : '受け入れ枚数や守備面で大きな損失があります。')}
              </p>
              {userReason.trim() && (
                <div className="mt-2.5 text-xs bg-white/80 p-2.5 rounded-lg border border-black/10 font-serif">
                  <span className="font-bold">あなたの回答理由:</span> 「{userReason}」
                </div>
              )}
            </div>

            {/* みんなの打牌・鳴き判断分布 */}
            <div className="bg-[#F8F5EC] p-5 rounded-2xl border border-[#D5CEBE] space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#262422] flex items-center gap-2 font-serif">
                  <span>📊 {isMeldProblem ? '全員の鳴き判断分布' : '全員の打牌分布'}</span>
                  <span className="text-xs font-mono font-normal text-[#5C5549] bg-[#EAE4D7] px-2 py-0.5 rounded-full border border-[#D5CEBE]">
                    総投票数: {totalVotes}票
                  </span>
                </h4>
                <span className="text-[11px] text-[#7A7265] font-mono">リアルタイム集計</span>
              </div>

              <div className="space-y-3">
                {Object.entries(stats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count]) => {
                    const percentage = Math.round((count / totalVotes) * 100) || 0;
                    const isUserChoice = selectedChoice === key;
                    const isBest = bestDiscard?.tileId === key;
                    const choiceLabel = getChoiceLabel(key);

                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            {isMeldProblem ? (
                              <span className="text-sm">{key === 'pass' ? '🚫' : '🀄'}</span>
                            ) : (
                              <MahjongTile tileId={key} size="xs" disabled />
                            )}
                            <span className="text-[#262422] font-serif">
                              {choiceLabel}
                            </span>
                            {isBest && (
                              <span className="bg-[#124D27] text-white text-[10px] px-1.5 py-0.5 rounded font-bold font-serif">
                                正解
                              </span>
                            )}
                            {isUserChoice && (
                              <span className="bg-[#C82C26] text-white text-[10px] px-1.5 py-0.5 rounded font-bold font-serif">
                                あなたの選択
                              </span>
                            )}
                          </div>
                          <span className="text-[#5C5549] font-mono tabular-nums">
                            {count}票 ({percentage}%)
                          </span>
                        </div>

                        {/* プログレスバー */}
                        <div className="w-full bg-[#EAE4D7] h-2.5 rounded-full overflow-hidden border border-[#D5CEBE]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isBest
                                ? 'bg-[#124D27]'
                                : isUserChoice
                                ? 'bg-[#C82C26]'
                                : 'bg-[#1E3A5F]/60'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 戦術解説 */}
            <div className="bg-[#FBF9F4] p-5 rounded-2xl border border-[#D5CEBE] space-y-2 shadow-xs">
              <h4 className="font-bold text-sm text-[#262422] flex items-center gap-2 font-serif">
                <span>📖 戦術解説</span>
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-[#403B33] whitespace-pre-line font-serif">
                {problem.explanation}
              </p>
            </div>

            {/* 打牌/判断理由・考察一覧 */}
            <div className="bg-[#F8F5EC] p-5 rounded-2xl border border-[#D5CEBE] space-y-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-[#262422] flex items-center gap-2 font-serif">
                  <span>💬 {isMeldProblem ? '鳴き判断理由・考察' : '打牌理由・考察'}</span>
                  <span className="text-xs font-mono font-normal text-[#5C5549] bg-[#EAE4D7] px-2 py-0.5 rounded-full border border-[#D5CEBE]">
                    {comments.length}件
                  </span>
                </h4>
              </div>

              {/* 選択肢別フィルター */}
              {comments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setFilterCommentTile('all')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer font-serif ${
                      filterCommentTile === 'all'
                        ? 'bg-[#1E3A5F] text-white shadow-xs'
                        : 'bg-[#FBF9F4] text-[#5C5549] border border-[#D5CEBE]'
                    }`}
                  >
                    すべて ({comments.length})
                  </button>
                  {Array.from(new Set(comments.map((c) => c.tileId))).map((cKey) => {
                    const count = comments.filter((c) => c.tileId === cKey).length;
                    const choiceLabel = getChoiceLabel(cKey);
                    return (
                      <button
                        key={`tab-${cKey}`}
                        type="button"
                        onClick={() => setFilterCommentTile(cKey)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer font-serif ${
                          filterCommentTile === cKey
                            ? 'bg-[#C82C26] text-white shadow-xs'
                            : 'bg-[#FBF9F4] text-[#5C5549] border border-[#D5CEBE]'
                        }`}
                      >
                        <span>{choiceLabel}</span>
                        <span className="opacity-80 font-mono text-[10px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* コメント一覧 */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredComments.length === 0 ? (
                  <p className="text-xs text-[#7A7265] py-4 text-center font-serif">
                    まだこの判断についての理由・考察はありません
                  </p>
                ) : (
                  filteredComments.map((comment) => {
                    const choiceLabel = getChoiceLabel(comment.tileId);
                    const isBest = bestDiscard?.tileId === comment.tileId;
                    return (
                      <div
                        key={comment.id}
                        className="bg-[#FBF9F4] p-3.5 rounded-xl border border-[#D5CEBE] space-y-1.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {!isMeldProblem && <MahjongTile tileId={comment.tileId} size="xs" disabled />}
                            <span className="font-bold text-[#262422] font-serif">
                              【{choiceLabel}】{isMeldProblem ? 'の判断理由' : 'を切る理由'}
                            </span>
                            {isBest && (
                              <span className="bg-[#EAF2EC] text-[#124D27] text-[10px] px-1.5 py-0.5 rounded font-bold border border-[#124D27]/30">
                                正解
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#7A7265]">{comment.createdAt}</span>
                        </div>
                        <p className="text-[#403B33] leading-relaxed pl-1 font-serif">
                          {comment.comment}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 追加コメント投稿 */}
              <form onSubmit={handleAddPostComment} className="pt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="追加で考察や理由を投稿..."
                  value={additionalComment}
                  onChange={(e) => setAdditionalComment(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
                />
                <button
                  type="submit"
                  disabled={!additionalComment.trim()}
                  className={`btn-ink px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer ${
                    !additionalComment.trim() ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  投稿
                </button>
              </form>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-[#7A7265] hover:text-[#C82C26] underline cursor-pointer font-serif"
              >
                もう一度解き直す
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
