'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Problem, VoteComment, DiscardTile, PlayerSituation } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { MahjongTableView } from './MahjongTableView';
import { getTileDisplay, sortHandWithTsumo, getDoraTiles } from '../utils/mahjongUtils';
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
  // 手牌13枚を自動理牌し、14枚目をツモ牌として保持
  const sortedHand = useMemo(() => {
    return sortHandWithTsumo(problem.hand || []);
  }, [problem.hand]);

  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [photoSelectedTile, setPhotoSelectedTile] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userReason, setUserReason] = useState('');
  const [stats, setStats] = useState<Record<string, number>>(problem.stats);
  const [comments, setComments] = useState<VoteComment[]>(problem.comments || []);
  const [filterCommentTile, setFilterCommentTile] = useState<string>('all');
  const [additionalComment, setAdditionalComment] = useState('');

  // いいね機能
  const [isLiked, setIsLiked] = useState<boolean>(() => isProblemLikedByMe(problem.id));
  const [likeCount, setLikeCount] = useState<number>(problem.likes || 0);

  // propsのlikes・いいね状態の同期
  useEffect(() => {
    if (problem.likes !== undefined) {
      setLikeCount(problem.likes);
    }
  }, [problem.likes]);

  useEffect(() => {
    setIsLiked(isProblemLikedByMe(problem.id));
  }, [problem.id]);

  // 削除権限判定（管理者端末または投稿者端末）
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

  // 写真拡大モーダル
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // 対局盤面ビューワー（各家の河・鳴き）
  const [showRiverViewer, setShowRiverViewer] = useState(false);

  // 写真モードか手牌モードかの判定
  const isPhotoMode = Boolean(problem.imageUrl || (!problem.hand || problem.hand.length === 0));

  // 河（捨て牌や鳴き）が登録されているか集計
  const riverStats = useMemo(() => {
    if (!problem.context.players) return { totalDiscards: 0, totalMelds: 0, hasRiver: false };
    let totalDiscards = 0;
    let totalMelds = 0;
    const playersObj = typeof problem.context.players === 'string'
      ? (() => { try { return JSON.parse(problem.context.players); } catch { return {}; } })()
      : problem.context.players;

    if (playersObj && typeof playersObj === 'object') {
      for (const p of Object.values(playersObj) as PlayerSituation[]) {
        if (p?.discards && Array.isArray(p.discards)) totalDiscards += p.discards.length;
        if (p?.melds && Array.isArray(p.melds)) totalMelds += p.melds.length;
      }
    }
    return {
      totalDiscards,
      totalMelds,
      hasRiver: totalDiscards > 0 || totalMelds > 0,
    };
  }, [problem.context.players]);

  // ドラ表示牌（最大5枚）
  const doraTiles = getDoraTiles(problem.context);

  // 選択中の牌
  const selectedTile = isPhotoMode
    ? photoSelectedTile
    : selectedTileIndex !== null
    ? sortedHand[selectedTileIndex]
    : null;

  const levelBadges = {
    beginner: {
      text: '初級',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
    },
    intermediate: {
      text: '中級',
      badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      dotClass: 'bg-sky-500',
    },
    advanced: {
      text: '上級',
      badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dotClass: 'bg-indigo-500',
    },
  };

  const handleSelectTile = (index: number) => {
    if (hasAnswered) return;
    setSelectedTileIndex(index);
  };

  // 投票実行（コメント付き）
  const handleSubmit = (withComment: boolean = true) => {
    if (!selectedTile || hasAnswered) return;

    const finalComment = withComment && userReason.trim() ? userReason.trim() : '';

    setStats((prev) => ({
      ...prev,
      [selectedTile]: (prev[selectedTile] || 0) + 1,
    }));

    if (finalComment) {
      const newComment: VoteComment = {
        id: `c-user-${Date.now()}`,
        problemId: problem.id,
        tileId: selectedTile,
        comment: finalComment,
        createdAt: 'たった今',
      };
      setComments((prev) => [newComment, ...prev]);
    }

    setHasAnswered(true);

    if (onVote) {
      onVote(problem.id, selectedTile, finalComment || undefined);
    }
  };

  // 回答後の追加コメント投稿
  const handleAddPostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalComment.trim() || !selectedTile) return;

    const newComment: VoteComment = {
      id: `c-user-${Date.now()}`,
      problemId: problem.id,
      tileId: selectedTile,
      comment: additionalComment.trim(),
      createdAt: 'たった今',
    };
    setComments((prev) => [newComment, ...prev]);

    if (onVote) {
      onVote(problem.id, selectedTile, additionalComment.trim());
    }
    setAdditionalComment('');
  };

  const handleReset = () => {
    setHasAnswered(false);
    setSelectedTileIndex(null);
    setPhotoSelectedTile(null);
    setUserReason('');
  };

  const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0);
  const selectedDiscardInfo = problem.discards.find((d) => d.tileId === selectedTile);
  const bestDiscard = problem.discards.find((d) => d.rank === 'best');

  const filteredComments = comments.filter((c) =>
    filterCommentTile === 'all' ? true : c.tileId === filterCommentTile
  );

  const scores = problem.context.scores;
  const hasDetailedBoard = true;

  return (
    <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-200 mb-8">
      {/* 写真全画面拡大モーダル */}
      {isPhotoModalOpen && problem.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] overflow-auto">
            <img
              src={problem.imageUrl}
              alt="拡大写真"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl mx-auto"
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

      {/* ヘッダー部：問題情報 & メタ情報 */}
      <div className="p-4 sm:p-6 bg-slate-50/70 dark:bg-zinc-850/50 border-b border-slate-200/80 dark:border-zinc-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border shadow-2xs ${
                levelBadges[problem.level].badgeClass
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${levelBadges[problem.level].dotClass}`} />
              <span>{levelBadges[problem.level].text}</span>
            </span>

            {problem.imageUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                <svg className="w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>実戦写真</span>
              </span>
            )}

            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              出題: {problem.author}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* いいねボタン */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                isLiked
                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-rose-500' : 'fill-none text-slate-400'}`}
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

            {/* 削除ボタン（権限あり端末のみ表示） */}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="この問題を削除"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            )}

            <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
              {problem.createdAt}
            </span>
          </div>
        </div>

        {/* 問題タイトル */}
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 mb-3">
          {problem.title}
        </h3>

        {/* 局況HUDダッシュボード */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 border border-slate-200/80 dark:border-zinc-800 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            {/* 局況ステータス */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md font-bold text-slate-800 dark:text-zinc-200">
                <span>{problem.context.round}</span>
                {problem.context.honba && problem.context.honba > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    <img src="/pai-images/tennbou-000.png" alt="本場" className="h-1.5 w-auto rotate-90 inline" />
                    <span>{problem.context.honba}本場</span>
                  </span>
                ) : null}
              </div>

              <span className="text-slate-300 dark:text-zinc-700">/</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                {problem.context.turn}巡目
              </span>

              <span className="text-slate-300 dark:text-zinc-700">/</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                自家: <strong className="text-slate-900 dark:text-zinc-100">{problem.context.wind}</strong>
              </span>

              {riverStats.hasRiver && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span>🀄</span>
                  <span>河データあり</span>
                </span>
              )}
            </div>

            {/* ドラ表示牌（最大5枚対応） */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                ドラ表示牌{doraTiles.length > 1 ? ` (${doraTiles.length})` : ''}:
              </span>
              <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80">
                {doraTiles.map((dt, idx) => (
                  <MahjongTile key={`card-dora-${dt}-${idx}`} tileId={dt} size="sm" disabled />
                ))}
              </div>
            </div>
          </div>

          {/* 各家の点数チップ（4家） */}
          {scores && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
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
                        ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 shadow-2xs ring-1 ring-blue-400/30'
                        : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                        {w}
                        {isSelf && (
                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950">
                            自分
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                        {sc?.toLocaleString()}
                      </span>
                    </div>
                    {!isSelf && sc !== undefined && (
                      <div className="text-right text-[10px] font-mono leading-none pt-0.5">
                        <span className={diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
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
            <div className="flex items-start gap-2 text-xs bg-slate-50 dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700">
              <span className="font-bold shrink-0">📊 点数状況:</span>
              <span>{problem.context.scoreInfo}</span>
            </div>
          )}

          {/* 捨て牌・他家状況テキスト */}
          {problem.context.discardsInfo && (
            <div className="text-xs bg-slate-50 dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-zinc-100 mr-1.5">状況メモ:</span>
              <span className="whitespace-pre-line">{problem.context.discardsInfo}</span>
            </div>
          )}

          {/* 全員の河（卓俯瞰ビュー）ビューワー開閉ボタン */}
          {hasDetailedBoard && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRiverViewer(!showRiverViewer)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer ${
                  riverStats.hasRiver
                    ? 'bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <span>対局盤面（各家の河・点数状況）</span>
                  {riverStats.hasRiver && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                      捨て牌 {riverStats.totalDiscards}枚
                      {riverStats.totalMelds > 0 ? ` / 副露 ${riverStats.totalMelds}` : ''}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-bold ${riverStats.hasRiver ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                  {showRiverViewer ? '▲ 盤面を閉じる' : '▼ 盤面を展開'}
                </span>
              </button>

              {/* 盤面展開エリア */}
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
              className="relative inline-block max-w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700 shadow-md group cursor-zoom-in"
              onClick={() => setIsPhotoModalOpen(true)}
            >
              <img
                src={problem.imageUrl}
                alt="問題の対局写真"
                className="max-h-72 sm:max-h-96 w-auto object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span>拡大表示</span>
              </div>
            </div>
          </div>
        )}

        {/* 手牌トレイ（フェルトマット質感のプロフェッショナルなトレイ） */}
        {sortedHand.length > 0 && (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-2.5 px-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-300">
                {hasAnswered
                  ? '回答結果と雀士たちの集合知'
                  : '手牌14枚から切る牌をタップしてください'}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                手牌 {sortedHand.length}枚
              </span>
            </div>

            {/* 高級麻雀マット風の手牌トレイコンテナ */}
            <div className="w-full rounded-2xl p-2 sm:p-3 bg-[#114624] border border-[#0d3b1e] shadow-inner">
              <div className="w-full overflow-x-auto pb-2 pt-2 px-1 flex justify-center items-end bg-[#14532b] rounded-xl border border-emerald-600/30">
                <div className="flex items-end flex-nowrap">
                  {sortedHand.map((tileId, index) => {
                    const isTsumo = index === sortedHand.length - 1;
                    const isSelected = selectedTileIndex === index;
                    const isBestTile = hasAnswered && bestDiscard?.tileId === tileId;

                    return (
                      <MahjongTile
                        key={`hand-${tileId}-${index}`}
                        tileId={tileId}
                        size="md"
                        isTsumo={isTsumo}
                        showTsumoLabel={isTsumo}
                        selected={isSelected}
                        disabled={hasAnswered}
                        onClick={() => handleSelectTile(index)}
                        badge={isBestTile ? '正解' : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 写真投稿モードで手牌がない場合の打牌選択パレット */}
        {isPhotoMode && !hasAnswered && (
          <div className="w-full max-w-lg mt-3 p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
              写真を見て、何を切るか下の牌から選択してください:
            </span>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700">
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
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400'
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

        {/* 回答前の決定 ＆ 理由入力エリア */}
        {!hasAnswered && (
          <div className="mt-5 w-full max-w-md flex flex-col items-center gap-3">
            {selectedTile ? (
              <div className="w-full bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-3 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                      選択中の打牌:
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-sm bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200">
                      <span>{getTileDisplay(selectedTile).topText}</span>
                      <span>{getTileDisplay(selectedTile).bottomText}</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">理由入力は任意</span>
                </div>

                {/* 理由入力フォーム */}
                <input
                  type="text"
                  placeholder="打牌理由を一言（例: 筒子の受け入れ最大、親リーチの現物）"
                  value={userReason}
                  onChange={(e) => setUserReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(true);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {userReason.trim() ? '💬 理由を添えて投票' : 'この牌を切る'}
                  </button>
                  {userReason.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      className="py-2.5 px-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      理由なしで即投票
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-2">
                {isPhotoMode ? '上のパレットから切りたい牌を選んでください' : '上の手牌から切りたい牌をタップしてください'}
              </p>
            )}
          </div>
        )}

        {/* 回答後の解説 ＆ 統計 ＆ 理由一覧エリア */}
        {hasAnswered && (
          <div className="w-full mt-6 space-y-6 animate-fade-in">
            {/* あなたの選択判定カード */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border shadow-2xs ${
                selectedDiscardInfo?.rank === 'best'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : selectedDiscardInfo?.rank === 'good'
                  ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300/80 dark:border-sky-800 text-sky-950 dark:text-sky-100'
                  : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-800 text-amber-950 dark:text-amber-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base sm:text-lg mb-1.5">
                {selectedDiscardInfo?.rank === 'best' && '🎉 素晴らしい！本命の正解打牌です'}
                {selectedDiscardInfo?.rank === 'good' && '🤔 妥協手・別ルートの打牌です'}
                {(!selectedDiscardInfo || selectedDiscardInfo.rank === 'bad') && '⚠️ 悪手、または推奨されない打牌です'}
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                あなたの選択:{' '}
                <span className="font-bold underline">
                  {selectedTile ? `${getTileDisplay(selectedTile).topText}${getTileDisplay(selectedTile).bottomText}` : ''}
                </span>{' '}
                — {selectedDiscardInfo?.reason || '受け入れ枚数や守備面で大きな損失があります。'}
              </p>
              {userReason.trim() && (
                <div className="mt-2.5 text-xs bg-white/70 dark:bg-black/20 p-2.5 rounded-lg border border-black/5 dark:border-white/10">
                  <span className="font-bold">あなたの回答理由:</span> 「{userReason}」
                </div>
              )}
            </div>

            {/* みんなの打牌統計 (バーチャート) */}
            <div className="bg-slate-50/80 dark:bg-zinc-850/60 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>📊 全員の打牌分布</span>
                  <span className="text-xs font-mono font-normal text-slate-500 bg-slate-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
                    総投票数: {totalVotes}票
                  </span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">リアルタイム</span>
              </div>

              <div className="space-y-3">
                {Object.entries(stats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tileId, count]) => {
                    const percentage = Math.round((count / totalVotes) * 100) || 0;
                    const isUserChoice = selectedTile === tileId;
                    const isBest = bestDiscard?.tileId === tileId;

                    return (
                      <div key={tileId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <MahjongTile tileId={tileId} size="xs" disabled />
                            <span className="text-slate-800 dark:text-zinc-200">
                              {getTileDisplay(tileId).topText}
                              {getTileDisplay(tileId).bottomText}
                            </span>
                            {isBest && (
                              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                正解
                              </span>
                            )}
                            {isUserChoice && (
                              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                あなたの選択
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 dark:text-zinc-400 font-mono tabular-nums">
                            {count}票 ({percentage}%)
                          </span>
                        </div>

                        {/* プログレスバー */}
                        <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isBest
                                ? 'bg-emerald-500'
                                : isUserChoice
                                ? 'bg-blue-500'
                                : 'bg-slate-400 dark:bg-zinc-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 詳細解説 */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 shadow-2xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>📖 戦術解説</span>
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-zinc-300 whitespace-pre-line">
                {problem.explanation}
              </p>
            </div>

            {/* 雀士たちの打牌理由・考察一覧 */}
            <div className="bg-slate-50/80 dark:bg-zinc-850/60 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>💬 打牌理由・考察</span>
                  <span className="text-xs font-mono font-normal text-slate-500 bg-slate-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
                    {comments.length}件
                  </span>
                </h4>
              </div>

              {/* 打牌別フィルター */}
              {comments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setFilterCommentTile('all')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                      filterCommentTile === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    すべて ({comments.length})
                  </button>
                  {Array.from(new Set(comments.map((c) => c.tileId))).map((tId) => {
                    const count = comments.filter((c) => c.tileId === tId).length;
                    const disp = getTileDisplay(tId);
                    return (
                      <button
                        key={`tab-${tId}`}
                        type="button"
                        onClick={() => setFilterCommentTile(tId)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                          filterCommentTile === tId
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        <span>{disp.topText}{disp.bottomText}</span>
                        <span className="opacity-75 font-mono text-[10px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* コメント一覧リスト */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredComments.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
                    まだこの打牌についての理由・考察はありません
                  </p>
                ) : (
                  filteredComments.map((comment) => {
                    const disp = getTileDisplay(comment.tileId);
                    const isBest = bestDiscard?.tileId === comment.tileId;
                    return (
                      <div
                        key={comment.id}
                        className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MahjongTile tileId={comment.tileId} size="xs" disabled />
                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                              【{disp.topText}{disp.bottomText}】を切る理由
                            </span>
                            {isBest && (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                正解
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{comment.createdAt}</span>
                        </div>
                        <p className="text-slate-700 dark:text-zinc-300 leading-relaxed pl-1">
                          {comment.comment}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 追加コメント投稿フォーム */}
              <form onSubmit={handleAddPostComment} className="pt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="追加で考察や理由を投稿..."
                  value={additionalComment}
                  onChange={(e) => setAdditionalComment(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!additionalComment.trim()}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                    additionalComment.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
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
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 underline cursor-pointer"
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
