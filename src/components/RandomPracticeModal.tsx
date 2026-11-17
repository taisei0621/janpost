'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Problem } from '../types/mahjong';
import { ProblemCard } from './ProblemCard';

interface RandomPracticeModalProps {
  problems: Problem[];
  isOpen: boolean;
  onClose: () => void;
  onVote?: (problemId: string, tileId: string, comment?: string) => void;
  onLike?: (problemId: string, increment: boolean) => void;
}

const QUESTION_TIME_LIMIT = 15; // 1問あたりの制限時間（秒）

export const RandomPracticeModal: React.FC<RandomPracticeModalProps> = ({
  problems,
  isOpen,
  onClose,
  onVote,
  onLike,
}) => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [roundCount, setRoundCount] = useState<number>(1);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalSolvedInSession, setTotalSolvedInSession] = useState<number>(0);
  const [correctCountInSession, setCorrectCountInSession] = useState<number>(0);
  const [timeUpCount, setTimeUpCount] = useState<number>(0);

  // 15秒タイマー関連
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME_LIMIT);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [isAnsweredCurrent, setIsAnsweredCurrent] = useState<boolean>(false);

  // リザルト画面（終了時）表示フラグ
  const [showResultModal, setShowResultModal] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 出題対象プール（全問題）
  const targetPool = useMemo(() => {
    return problems.length > 0 ? problems : [];
  }, [problems]);

  // 新しい問題をランダムに1問選定
  const pickNextProblem = () => {
    if (targetPool.length === 0) return;
    let nextIdx = Math.floor(Math.random() * targetPool.length);
    if (targetPool.length > 1 && nextIdx === currentIdx) {
      nextIdx = (currentIdx + 1) % targetPool.length;
    }
    setCurrentIdx(nextIdx);
    setRoundCount((prev) => prev + 1);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setIsTimeUp(false);
    setIsAnsweredCurrent(false);
  };

  // セッション全体のリセット（最初からやり直す）
  const handleRestartSession = () => {
    setStreak(0);
    setMaxStreak(0);
    setTotalSolvedInSession(0);
    setCorrectCountInSession(0);
    setTimeUpCount(0);
    setShowResultModal(false);
    pickNextProblem();
  };

  // モーダルオープン時の初期化
  useEffect(() => {
    if (isOpen) {
      setShowResultModal(false);
      setStreak(0);
      setMaxStreak(0);
      setTotalSolvedInSession(0);
      setCorrectCountInSession(0);
      setTimeUpCount(0);
      setRoundCount(1);
      setTimeLeft(QUESTION_TIME_LIMIT);
      setIsTimeUp(false);
      setIsAnsweredCurrent(false);
      if (targetPool.length > 0) {
        setCurrentIdx(Math.floor(Math.random() * targetPool.length));
      }
    }
  }, [isOpen, targetPool.length]);

  // 15秒カウントダウンタイマー
  useEffect(() => {
    if (!isOpen || showResultModal || isAnsweredCurrent || isTimeUp) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // 時間切れ処理
          setIsTimeUp(true);
          setIsAnsweredCurrent(true);
          setTimeUpCount((c) => c + 1);
          setTotalSolvedInSession((s) => s + 1);
          setStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, showResultModal, isAnsweredCurrent, isTimeUp, roundCount]);

  if (!isOpen || targetPool.length === 0) return null;

  const currentProblem = targetPool[currentIdx] || targetPool[0];

  // ユーザーが回答を選択した時のハンドラー
  const handleProblemVote = (problemId: string, tileId: string, comment?: string) => {
    if (isAnsweredCurrent || isTimeUp) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnsweredCurrent(true);
    setTotalSolvedInSession((prev) => prev + 1);

    // 正解判定チェック
    const isBest = currentProblem.discards?.find((d) => d.tileId === tileId)?.rank === 'best';

    if (isBest) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((prev) => Math.max(prev, nextStreak));
      setCorrectCountInSession((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    if (onVote) {
      onVote(problemId, tileId, comment);
    }
  };

  // 終了ボタン（×または「特訓を終了」）が押された時の処理
  const handleRequestClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // 1問でも解いている、または時間切れがあればリザルト画面を表示
    if (totalSolvedInSession > 0) {
      setShowResultModal(true);
    } else {
      onClose();
    }
  };

  const accuracy =
    totalSolvedInSession > 0
      ? Math.round((correctCountInSession / totalSolvedInSession) * 100)
      : 0;

  // 雀力称号の判定
  const getRankBadge = (acc: number, total: number) => {
    if (total === 0) return { title: '未計測', color: 'text-zinc-500', desc: 'まずは1問挑戦してみましょう！' };
    if (acc === 100 && total >= 3)
      return { title: '🏆 雀聖級（神速・全問正解）', color: 'text-amber-700 bg-amber-100 border-amber-400', desc: '15秒以内の超速判断でノーミス！圧倒的な牌理力です！' };
    if (acc >= 80)
      return { title: '🀄 特級雀士（速攻・高精度）', color: 'text-emerald-800 bg-emerald-100 border-emerald-400', desc: '素晴らしい打牌判断力！Mリーグでも通用するレベルです！' };
    if (acc >= 60)
      return { title: '🌟 上級雀士（安定の牌理）', color: 'text-sky-800 bg-sky-100 border-sky-400', desc: '大半の問題で好形を選べています。この調子でノックを続けましょう！' };
    if (acc >= 40)
      return { title: '📮 中級雀士（発展途上）', color: 'text-amber-800 bg-amber-50 border-amber-300', desc: '受け入れ枚数や牌の形を意識すると一気に勝率が跳ね上がります！' };
    return { title: '🌱 見習い雀士（特訓あるのみ）', color: 'text-rose-800 bg-rose-50 border-rose-300', desc: '15秒の焦りに負けず、完全イーシャンテンの基本形を復習しましょう！' };
  };

  const rankInfo = getRankBadge(accuracy, totalSolvedInSession);
  const timeProgressPercent = Math.max(0, Math.min(100, (timeLeft / QUESTION_TIME_LIMIT) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#EAE4D7] rounded-3xl border-2 border-[#D5CEBE] w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto relative">
        {/* モーダルヘッダー */}
        <div className="bg-[#F8F5EC] p-3 sm:p-4 border-b border-[#D5CEBE] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#C82C26] text-white flex items-center justify-center font-bold text-sm font-serif shadow-xs">
              🎲
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#262422] font-serif">
                  何切るノック（1問15秒特訓）
                </h3>
                <span className="text-[10px] bg-[#1E3A5F] text-white px-2 py-0.5 rounded-full font-bold font-mono">
                  第 {roundCount} 問
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#7A7265] font-serif">
                1問15秒以内の即断即決トレーニング！解いた問題も毎回フレッシュに出題されます
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 特訓終了ボタン */}
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-3 py-1.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] hover:bg-[#FDF2F2] hover:text-[#C82C26] text-xs font-bold font-serif transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <span>🏁</span>
              <span>終了して結果を見る</span>
            </button>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-[#7A7265] hover:text-[#C82C26] text-2xl font-bold leading-none p-1 cursor-pointer"
              title="終了"
            >
              &times;
            </button>
          </div>
        </div>

        {/* ⏱️ 15秒カウントダウン・プログレスバー */}
        <div className="w-full bg-[#D5CEBE] h-2 relative overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              timeLeft > 7
                ? 'bg-[#124D27]'
                : timeLeft > 3
                ? 'bg-amber-500'
                : 'bg-[#C82C26] animate-pulse'
            }`}
            style={{ width: `${timeProgressPercent}%` }}
          />
        </div>

        {/* タイマーステータス ＆ セッション成績バー */}
        <div className="bg-[#FBF9F4] px-4 py-2 border-b border-[#D5CEBE] flex items-center justify-between text-xs font-serif flex-wrap gap-2">
          {/* 左側：タイマー表示 */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-xs border ${
                isTimeUp
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : isAnsweredCurrent
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : timeLeft <= 3
                  ? 'bg-rose-100 text-rose-700 border-rose-400 animate-bounce'
                  : timeLeft <= 7
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-[#E8EFF7] text-[#1E3A5F] border-[#1E3A5F]/30'
              }`}
            >
              <span>⏱️</span>
              {isTimeUp ? (
                <span className="font-serif">時間切れ！</span>
              ) : isAnsweredCurrent ? (
                <span className="font-serif">回答完了</span>
              ) : (
                <span>残り {timeLeft} 秒</span>
              )}
            </span>

            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 bg-[#FDF2F2] border border-[#C82C26] text-[#C82C26] px-2 py-0.5 rounded-full text-[11px] font-bold animate-pulse">
                <span>🔥</span>
                <span>{streak}連続正解中！</span>
              </span>
            )}
          </div>

          {/* 右側：成績と次の問題へボタン */}
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[#262422]">
              成績: <strong className="text-[#1E3A5F]">{totalSolvedInSession}問中 {correctCountInSession}問正解</strong> ({accuracy}%)
            </span>

            <button
              type="button"
              onClick={pickNextProblem}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isAnsweredCurrent || isTimeUp
                  ? 'btn-postbox text-white scale-105 animate-pulse'
                  : 'bg-[#EAE4D7] hover:bg-[#DCD5C6] text-[#262422] border border-[#D5CEBE]'
              }`}
            >
              <span>{isAnsweredCurrent || isTimeUp ? '次へ進む ➔' : 'スキップ ⏭️'}</span>
            </button>
          </div>
        </div>

        {/* 時間切れ通知バナー（未選択で15秒経過した場合） */}
        {isTimeUp && (
          <div className="bg-[#FDF2F2] border-b-2 border-[#C82C26] px-4 py-2 text-xs text-[#C82C26] font-bold font-serif flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⏰</span>
              <span>15秒の制限時間が経過しました！正解と解説を確認して「次へ進む」を押してください。</span>
            </div>
            <button
              type="button"
              onClick={pickNextProblem}
              className="text-xs underline hover:text-black cursor-pointer font-bold shrink-0"
            >
              次の問題へ ➔
            </button>
          </div>
        )}

        {/* 問題カード表示エリア（※毎回フレッシュに回答できるよう ignoreSavedAnswer=true を指定） */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1">
          <div className="max-w-3xl mx-auto">
            <ProblemCard
              key={`knock-${currentProblem.id}-${roundCount}`}
              problem={currentProblem}
              onVote={handleProblemVote}
              onLike={onLike}
              ignoreSavedAnswer={true}
              isTimeUp={isTimeUp}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🏆 特訓修了リザルト画面モーダル（途中で終わっても必ず表示） */}
        {/* ========================================================= */}
        {showResultModal && (
          <div className="absolute inset-0 z-60 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#FBF9F4] rounded-3xl border-4 border-[#C82C26] w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-4">
              <div className="absolute top-0 left-0 right-0 h-2 airmail-stripe rounded-t-2xl" />

              {/* 郵便風修了証ヘッダー */}
              <div className="text-center pt-2 pb-1 border-b border-[#D5CEBE]">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#C82C26] text-white text-2xl mb-1 shadow-md">
                  🀄
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#262422] font-serif">
                  何切るノック 特訓修了証
                </h3>
                <p className="text-xs text-[#7A7265] font-serif mt-0.5">
                  15秒の極限状況での判断力・牌理分析結果
                </p>
              </div>

              {/* 正答率ドカン表示 */}
              <div className="bg-[#F8F5EC] p-4 rounded-2xl border-2 border-[#1E3A5F] text-center space-y-1">
                <span className="text-xs font-bold text-[#5C5549] font-serif block">
                  今回の正答率
                </span>
                <div className="text-4xl sm:text-5xl font-extrabold text-[#C82C26] font-mono tracking-tight">
                  {accuracy}
                  <span className="text-2xl font-serif ml-0.5">%</span>
                </div>
                <p className="text-xs font-bold text-[#1E3A5F] font-serif">
                  全 {totalSolvedInSession} 問中 {correctCountInSession} 問正解！
                </p>
              </div>

              {/* 成績内訳グリッド */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-[#EAF2EC] rounded-xl border border-[#124D27]/30">
                  <span className="text-[10px] text-[#124D27] font-bold block font-serif">正解</span>
                  <span className="text-lg font-bold font-mono text-[#124D27]">
                    {correctCountInSession}
                  </span>
                  <span className="text-[10px] text-[#124D27] block">問</span>
                </div>
                <div className="p-2.5 bg-[#FDF4E7] rounded-xl border border-amber-300">
                  <span className="text-[10px] text-amber-800 font-bold block font-serif">不正解</span>
                  <span className="text-lg font-bold font-mono text-amber-900">
                    {Math.max(0, totalSolvedInSession - correctCountInSession - timeUpCount)}
                  </span>
                  <span className="text-[10px] text-amber-800 block">問</span>
                </div>
                <div className="p-2.5 bg-[#FDF2F2] rounded-xl border border-rose-300">
                  <span className="text-[10px] text-rose-800 font-bold block font-serif">時間切れ</span>
                  <span className="text-lg font-bold font-mono text-rose-900">
                    {timeUpCount}
                  </span>
                  <span className="text-[10px] text-rose-800 block">問</span>
                </div>
              </div>

              {/* 称号＆評価 */}
              <div className={`p-3 rounded-xl border text-center ${rankInfo.color}`}>
                <span className="text-xs font-bold block font-serif mb-0.5">
                  認定称号: {rankInfo.title}
                </span>
                <p className="text-[11px] opacity-90 font-serif">
                  {rankInfo.desc}
                </p>
                {maxStreak >= 2 && (
                  <div className="mt-1.5 text-[11px] font-bold text-[#C82C26] font-mono">
                    🔥 最高連続正解記録: {maxStreak} 連続！
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#D5CEBE]">
                <button
                  type="button"
                  onClick={handleRestartSession}
                  className="btn-ink flex-1 py-2.5 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>🔄</span>
                  <span>もう一度特訓する</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-postbox flex-1 py-2.5 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>📮</span>
                  <span>ホームに戻る</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
