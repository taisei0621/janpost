'use client';

import React, { useState, useMemo } from 'react';
import { Problem } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { getTileDisplay, sortHandWithTsumo } from '../utils/mahjongUtils';

interface ProblemCardProps {
  problem: Problem;
  onVote?: (problemId: string, tileId: string) => void;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({ problem, onVote }) => {
  // 手牌13枚を自動理牌し、14枚目をツモ牌として保持
  const sortedHand = useMemo(() => {
    return sortHandWithTsumo(problem.hand);
  }, [problem.hand]);

  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>(problem.stats);

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

  const handleSubmit = () => {
    if (selectedTileIndex === null || !selectedTile || hasAnswered) return;

    // 投票集計の更新
    setStats((prev) => ({
      ...prev,
      [selectedTile]: (prev[selectedTile] || 0) + 1,
    }));
    setHasAnswered(true);

    if (onVote) {
      onVote(problem.id, selectedTile);
    }
  };

  const handleReset = () => {
    setHasAnswered(false);
    setSelectedTileIndex(null);
  };

  // 全投票数
  const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0);

  // 選択した牌の評価を探す
  const selectedDiscardInfo = problem.discards.find((d) => d.tileId === selectedTile);
  const bestDiscard = problem.discards.find((d) => d.rank === 'best');

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
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
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
            <span className="text-zinc-500 font-medium">ドラ:</span>
            <MahjongTile tileId={problem.context.dora} size="sm" disabled />
          </div>

          {problem.context.note && (
            <div className="w-full text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              ⚠️ {problem.context.note}
            </div>
          )}
        </div>
      </div>

      {/* 手牌表示エリア (全14枚: 13枚理牌 + 1枚ツモ) */}
      <div className="p-4 sm:p-8 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-3 px-2">
          <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {hasAnswered
              ? '回答結果と打牌統計'
              : '手牌14枚（配牌13枚 ＋ ツモ1枚）から切る牌を1枚選んでください'}
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

        {/* 決定ボタン */}
        {!hasAnswered && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedTileIndex === null}
              className={`
                px-8 py-3 rounded-full font-bold text-sm sm:text-base shadow-lg transition-all
                ${
                  selectedTileIndex !== null && selectedTile
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                }
              `}
            >
              {selectedTileIndex !== null && selectedTile
                ? `【${getTileDisplay(selectedTile).topText}${getTileDisplay(selectedTile).bottomText}】を切る！`
                : '牌を選んでください'}
            </button>
          </div>
        )}

        {/* 回答後の解説 ＆ 統計エリア */}
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
