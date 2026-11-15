'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Problem } from '../types/mahjong';
import { ProblemCard } from './ProblemCard';
import { getAllAnsweredProblemIds } from '../utils/problemService';

interface RandomPracticeModalProps {
  problems: Problem[];
  isOpen: boolean;
  onClose: () => void;
  onVote?: (problemId: string, tileId: string, comment?: string) => void;
  onLike?: (problemId: string, increment: boolean) => void;
}

export const RandomPracticeModal: React.FC<RandomPracticeModalProps> = ({
  problems,
  isOpen,
  onClose,
  onVote,
  onLike,
}) => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [onlyUnanswered, setOnlyUnanswered] = useState<boolean>(true);
  const [streak, setStreak] = useState<number>(0);
  const [totalSolvedInSession, setTotalSolvedInSession] = useState<number>(0);
  const [correctCountInSession, setCorrectCountInSession] = useState<number>(0);
  const [answeredMap, setAnsweredMap] = useState<Record<string, boolean>>({});

  // 端末で回答済みの問題ID
  const answeredIds = useMemo(() => {
    return new Set(getAllAnsweredProblemIds());
  }, [isOpen, totalSolvedInSession]);

  // 出題対象プールの算出
  const targetPool = useMemo(() => {
    if (onlyUnanswered) {
      const un = problems.filter((p) => !answeredIds.has(p.id));
      return un.length > 0 ? un : problems; // 未回答がなければ全問フォールバック
    }
    return problems;
  }, [problems, onlyUnanswered, answeredIds]);

  // ランダムに1問選定
  const pickRandomProblem = () => {
    if (targetPool.length === 0) return;
    const nextIdx = Math.floor(Math.random() * targetPool.length);
    setCurrentIdx(nextIdx);
  };

  useEffect(() => {
    if (isOpen) {
      pickRandomProblem();
    }
  }, [isOpen, onlyUnanswered]);

  if (!isOpen || targetPool.length === 0) return null;

  const currentProblem = targetPool[currentIdx] || targetPool[0];
  const isCurrentAnswered = answeredIds.has(currentProblem.id) || answeredMap[currentProblem.id];

  const handleProblemVote = (problemId: string, tileId: string, comment?: string) => {
    setAnsweredMap((prev) => ({ ...prev, [problemId]: true }));
    setTotalSolvedInSession((prev) => prev + 1);

    // 正解判定チェック
    const isBest = currentProblem.discards?.find((d) => d.tileId === tileId)?.rank === 'best';

    if (isBest) {
      setStreak((prev) => prev + 1);
      setCorrectCountInSession((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    if (onVote) {
      onVote(problemId, tileId, comment);
    }
  };

  const accuracy =
    totalSolvedInSession > 0
      ? Math.round((correctCountInSession / totalSolvedInSession) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#EAE4D7] rounded-3xl border-2 border-[#D5CEBE] w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* モーダルヘッダー */}
        <div className="bg-[#F8F5EC] p-3.5 sm:p-4 border-b border-[#D5CEBE] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#C82C26] text-white flex items-center justify-center font-bold text-sm font-serif shadow-xs">
              🎲
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#262422] font-serif">
                  何切るノック（特訓モード）
                </h3>
                <span className="text-[10px] bg-[#1E3A5F] text-white px-2 py-0.5 rounded-full font-bold font-mono">
                  POOL: {targetPool.length}問
                </span>
              </div>
              <p className="text-[11px] text-[#7A7265] font-serif">
                ランダムに1問ずつ集中して解くフラッシュカード特訓
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 未回答限定トグル */}
            <label className="flex items-center gap-1.5 text-xs text-[#5C5549] cursor-pointer font-serif bg-white/70 px-2.5 py-1 rounded-lg border border-[#D5CEBE]">
              <input
                type="checkbox"
                checked={onlyUnanswered}
                onChange={(e) => setOnlyUnanswered(e.target.checked)}
                className="rounded text-[#C82C26]"
              />
              <span>未回答のみ</span>
            </label>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={onClose}
              className="text-[#7A7265] hover:text-[#C82C26] text-2xl font-bold leading-none p-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* 成績ステータスバー */}
        <div className="bg-[#FBF9F4] px-4 py-2 border-b border-[#D5CEBE] flex items-center justify-between text-xs font-serif flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#262422]">
              セッション成績: <strong>{totalSolvedInSession}問中 {correctCountInSession}問正解</strong> ({accuracy}%)
            </span>
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 bg-[#FDF2F2] border border-[#C82C26] text-[#C82C26] px-2 py-0.5 rounded-full text-[11px] font-bold animate-pulse">
                <span>🔥</span>
                <span>{streak}連続正解中！</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={pickRandomProblem}
              className="px-3 py-1 bg-[#EAE4D7] hover:bg-[#DCD5C6] text-[#262422] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-[#D5CEBE]"
            >
              <span>⏭️</span>
              <span>スキップ</span>
            </button>
            <button
              type="button"
              onClick={pickRandomProblem}
              className="btn-postbox px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 text-white"
            >
              <span>🎲</span>
              <span>次の問題 ➔</span>
            </button>
          </div>
        </div>

        {/* 問題カード表示エリア */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1">
          <div className="max-w-3xl mx-auto">
            <ProblemCard
              key={`knock-${currentProblem.id}`}
              problem={currentProblem}
              onVote={handleProblemVote}
              onLike={onLike}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
