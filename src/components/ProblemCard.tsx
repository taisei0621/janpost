'use client';

import React, { useState, useMemo } from 'react';
import { Problem, VoteComment, DiscardTile, PlayerSituation } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { getTileDisplay, sortHandWithTsumo } from '../utils/mahjongUtils';

interface ProblemCardProps {
  problem: Problem;
  onVote?: (problemId: string, tileId: string, comment?: string) => void;
}

const WINDS: Array<'東家' | '南家' | '西家' | '北家'> = ['東家', '南家', '西家', '北家'];

export const ProblemCard: React.FC<ProblemCardProps> = ({ problem, onVote }) => {
  // 手牌13枚を自動理牌し、14枚目をツモ牌として保持
  const sortedHand = useMemo(() => {
    return sortHandWithTsumo(problem.hand);
  }, [problem.hand]);

  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userReason, setUserReason] = useState('');
  const [stats, setStats] = useState<Record<string, number>>(problem.stats);
  const [comments, setComments] = useState<VoteComment[]>(problem.comments || []);
  const [filterCommentTile, setFilterCommentTile] = useState<string>('all');
  const [additionalComment, setAdditionalComment] = useState('');

  // 対局盤面ビューワー（各家の河・鳴き）
  const [showRiverViewer, setShowRiverViewer] = useState(false);
  const [selectedRiverWind, setSelectedRiverWind] = useState<'東家' | '南家' | '西家' | '北家'>('東家');

  const selectedTile = selectedTileIndex !== null ? sortedHand[selectedTileIndex] : null;

  const levelBadges = {
    beginner: { text: '初級編', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    intermediate: { text: '中級編', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
    advanced: { text: '上級編', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
  };

  const handleSelectTile = (index: number) => {
    if (hasAnswered) return;
    setSelectedTileIndex(index);
  };

  // 投票実行（コメント付き）
  const handleSubmit = (withComment: boolean = true) => {
    if (selectedTileIndex === null || !selectedTile || hasAnswered) return;

    const finalComment = withComment && userReason.trim() ? userReason.trim() : '';

    // 投票集計の更新
    setStats((prev) => ({
      ...prev,
      [selectedTile]: (prev[selectedTile] || 0) + 1,
    }));

    // コメントがあればローカル一覧に追加
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
    setUserReason('');
  };

  // 全投票数
  const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0);

  // 選択した牌の評価を探す
  const selectedDiscardInfo = problem.discards.find((d) => d.tileId === selectedTile);
  const bestDiscard = problem.discards.find((d) => d.rank === 'best');

  // コメント絞り込み
  const filteredComments = comments.filter((c) =>
    filterCommentTile === 'all' ? true : c.tileId === filterCommentTile
  );

  // プレイヤーデータ
  const players = problem.context.players;
  const scores = problem.context.scores;
  const hasDetailedBoard = Boolean(players && Object.keys(players).length > 0);

  return (
    <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden transition-all mb-8">
      {/* ヘッダー部：問題情報 */}
      <div className="p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                levelBadges[problem.level].bg
              }`}
            >
              {levelBadges[problem.level].text}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              出題: {problem.author}
            </span>
          </div>
          <span className="text-xs text-zinc-400">{problem.createdAt}</span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          {problem.title}
        </h3>

        {/* 局・巡目・ドラ状況 */}
        <div className="space-y-2.5 bg-white dark:bg-zinc-900 p-3 sm:p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-medium">局況:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {problem.context.round}
              </span>
              <span className="text-zinc-400">/</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {problem.context.turn}巡目
              </span>
              <span className="text-zinc-400">/</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {problem.context.wind}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-medium text-xs sm:text-sm">ドラ表示牌:</span>
              <MahjongTile tileId={problem.context.dora} size="sm" disabled />
            </div>
          </div>

          {/* 各家の点数チップ（構造化データがある場合） */}
          {scores && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {WINDS.map((w) => {
                const isSelf = w === problem.context.wind;
                const sc = scores[w];
                const selfScore = scores[problem.context.wind as '東家' | '南家' | '西家' | '北家'] || 25000;
                const diff = sc - selfScore;
                return (
                  <div
                    key={`sc-chip-${w}`}
                    className={`px-2 py-1.5 rounded-lg border text-xs flex items-center justify-between ${
                      isSelf
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                        : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      {w} {isSelf && <span className="text-[10px] text-blue-600 font-bold">(自分)</span>}
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-bold">{sc?.toLocaleString()}</span>
                      {!isSelf && sc !== undefined && (
                        <span className={`block text-[9px] font-mono leading-none ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {diff >= 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 点数テキスト（フォールバック） */}
          {problem.context.scoreInfo && !scores && (
            <div className="flex items-start gap-1.5 text-xs bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 p-2 sm:p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
              <span className="font-bold shrink-0">📊 点数状況:</span>
              <span>{problem.context.scoreInfo}</span>
            </div>
          )}

          {/* 捨て牌・他家状況テキスト */}
          {problem.context.discardsInfo && (
            <div className="flex items-start gap-1.5 text-xs bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 p-2 sm:p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <span className="font-bold shrink-0">🀁 捨て牌・他家:</span>
              <span className="whitespace-pre-line leading-relaxed">{problem.context.discardsInfo}</span>
            </div>
          )}

          {/* 補足メモ */}
          {problem.context.note && !problem.context.discardsInfo && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              ⚠️ {problem.context.note}
            </div>
          )}

          {/* ★ 各家の捨て牌（河）＆鳴き状況ビューワー開閉ボタン */}
          {hasDetailedBoard && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRiverViewer(!showRiverViewer)}
                className="w-full py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span>🀄</span>
                  <span>対局盤面（各家の河・ツモ切り・鳴き状況）を確認</span>
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">
                  {showRiverViewer ? '▲ 閉じる' : '▼ 盤面を展開'}
                </span>
              </button>

              {/* 盤面展開エリア */}
              {showRiverViewer && players && (
                <div className="mt-2 p-3 bg-zinc-100/90 dark:bg-zinc-800/90 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      各家の河（薄暗い牌 = ツモ切り / 通常 = 手出し）
                    </span>
                    <div className="flex gap-1">
                      {WINDS.map((w) => (
                        <button
                          key={`view-tab-${w}`}
                          type="button"
                          onClick={() => setSelectedRiverWind(w)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            selectedRiverWind === w
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          {w}
                          {players[w]?.isReach && <span className="ml-1 text-[9px] text-red-500 font-bold">立直</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 選択された家の河 */}
                  {players[selectedRiverWind] && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {selectedRiverWind}の捨て牌（{players[selectedRiverWind].discards.length}枚）
                        </span>
                        {players[selectedRiverWind].melds && players[selectedRiverWind].melds.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500 text-[11px]">鳴き:</span>
                            {players[selectedRiverWind].melds.map((m, mIdx) => (
                              <span
                                key={`m-${mIdx}`}
                                className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-300"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {players[selectedRiverWind].discards.length === 0 ? (
                        <p className="text-xs text-zinc-400 py-2">捨て牌データはありません</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
                          {players[selectedRiverWind].discards.map((tile, dIdx) => (
                            <MahjongTile
                              key={`v-discard-${dIdx}`}
                              tileId={tile.tileId}
                              size="sm"
                              isTsumogiri={tile.isTsumogiri}
                              isReach={tile.isReach || (players[selectedRiverWind].isReach && dIdx === players[selectedRiverWind].discards.length - 1)}
                              disabled
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 手牌表示エリア (全14枚: 13枚理牌 + 1枚ツモ) */}
      <div className="p-4 sm:p-8 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-3 px-2">
          <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {hasAnswered
              ? '回答結果と雀士たちの集合知'
              : '手牌14枚（配牌13枚 ＋ ツモ1枚）から切る牌をタップしてください'}
          </p>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
            手牌 {sortedHand.length}枚
          </span>
        </div>

        {/* 14枚の手牌コンテナ (自動理牌済み) */}
        <div className="w-full overflow-x-auto pb-4 pt-4 flex justify-center items-end">
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

        {/* 回答前の決定 ＆ 理由入力エリア */}
        {!hasAnswered && (
          <div className="mt-4 w-full max-w-md flex flex-col items-center gap-3">
            {selectedTileIndex !== null && selectedTile ? (
              <div className="w-full bg-blue-50/60 dark:bg-blue-950/30 p-3 sm:p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <span>選択中:</span>
                    <span className="underline font-black text-sm">
                      {getTileDisplay(selectedTile).topText}
                      {getTileDisplay(selectedTile).bottomText}
                    </span>
                  </span>
                  <span className="text-[10px] text-zinc-500">理由の入力は任意です</span>
                </div>

                {/* 理由入力フォーム */}
                <input
                  type="text"
                  placeholder="打牌理由をひとこと（例: 筒子の受け入れ最大、親リーチの現物）"
                  value={userReason}
                  onChange={(e) => setUserReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(true);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-blue-300 dark:border-blue-800 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                  >
                    {userReason.trim() ? '💬 理由を添えて投票！' : '【この牌を切る】'}
                  </button>
                  {userReason.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      className="py-2.5 px-3 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      理由なしで即投票
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 py-2">
                上の手牌から切りたい牌をタップしてください
              </p>
            )}
          </div>
        )}

        {/* 回答後の解説 ＆ 統計 ＆ 理由一覧エリア */}
        {hasAnswered && (
          <div className="w-full mt-6 space-y-6 animate-fade-in">
            {/* あなたの選択判定 */}
            <div
              className={`p-4 rounded-xl border ${
                selectedDiscardInfo?.rank === 'best'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : selectedDiscardInfo?.rank === 'good'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
              }`}
            >
              <div className="flex items-center gap-3 font-bold text-base sm:text-lg mb-1">
                {selectedDiscardInfo?.rank === 'best' && '🎉 素晴らしい！本命の正解打牌です'}
                {selectedDiscardInfo?.rank === 'good' && '🤔 妥協手・別ルートの打牌です'}
                {(!selectedDiscardInfo || selectedDiscardInfo.rank === 'bad') && '⚠️ 悪手、または推奨されない打牌です'}
              </div>
              <p className="text-sm opacity-90">
                あなたの選択:{' '}
                <span className="font-bold underline">
                  {selectedTile ? `${getTileDisplay(selectedTile).topText}${getTileDisplay(selectedTile).bottomText}` : ''}
                </span>{' '}
                - {selectedDiscardInfo?.reason || '受け入れ枚数や守備面で大きな損失があります。'}
              </p>
              {userReason.trim() && (
                <div className="mt-2 text-xs bg-white/70 dark:bg-black/20 p-2 rounded-lg">
                  <span className="font-bold">あなたの回答理由:</span> 「{userReason}」
                </div>
              )}
            </div>

            {/* みんなの打牌統計 (投票分布グラフ) */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  📊 全員の打牌分布（総投票数: {totalVotes}票）
                </h4>
                <span className="text-xs text-zinc-500">リアルタイム集計</span>
              </div>

              <div className="space-y-3">
                {Object.entries(stats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tileId, count]) => {
                    const percentage = Math.round((count / totalVotes) * 100) || 0;
                    const isUserChoice = selectedTile === tileId;
                    const isBest = bestDiscard?.tileId === tileId;

                    return (
                      <div key={tileId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <MahjongTile tileId={tileId} size="xs" disabled />
                            <span className="text-zinc-800 dark:text-zinc-200">
                              {getTileDisplay(tileId).topText}
                              {getTileDisplay(tileId).bottomText}
                            </span>
                            {isBest && (
                              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                正解
                              </span>
                            )}
                            {isUserChoice && (
                              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                あなたの選択
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-600 dark:text-zinc-400 font-mono">
                            {count}票 ({percentage}%)
                          </span>
                        </div>

                        {/* プログレスバー */}
                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isBest
                                ? 'bg-emerald-500'
                                : isUserChoice
                                ? 'bg-blue-500'
                                : 'bg-zinc-400 dark:bg-zinc-500'
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
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                💡 公式戦術解説
              </h4>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                {problem.explanation}
              </p>
            </div>

            {/* 💬 雀士たちの打牌理由・考察一覧（集合知セクション） */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>💬</span>
                  <span>雀士たちの打牌理由・考察</span>
                  <span className="text-xs font-mono font-normal text-zinc-500 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
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
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                      filterCommentTile === 'all'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
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
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                          filterCommentTile === tId
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <span>{disp.topText}{disp.bottomText}</span>
                        <span className="opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* コメント一覧リスト */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredComments.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">
                    まだこの打牌についての理由・考察はありません
                  </p>
                ) : (
                  filteredComments.map((comment) => {
                    const disp = getTileDisplay(comment.tileId);
                    const isBest = bestDiscard?.tileId === comment.tileId;
                    return (
                      <div
                        key={comment.id}
                        className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MahjongTile tileId={comment.tileId} size="xs" disabled />
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              【{disp.topText}{disp.bottomText}】を切る理由
                            </span>
                            {isBest && (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                正解
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400">{comment.createdAt}</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed pl-1">
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
                  className="flex-1 text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!additionalComment.trim()}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                    additionalComment.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  投稿
                </button>
              </form>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
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
