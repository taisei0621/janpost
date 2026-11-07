'use client';

import React, { useState, useEffect } from 'react';
import { Problem, ProblemLevel } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { ProblemCard } from '../components/ProblemCard';
import { PostProblemModal } from '../components/PostProblemModal';

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>(INITIAL_PROBLEMS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | ProblemLevel | 'user'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ローカルストレージからユーザー投稿や投票データをロード
  useEffect(() => {
    try {
      const savedProblems = localStorage.getItem('janpost_problems');
      if (savedProblems) {
        setProblems(JSON.parse(savedProblems));
      }
    } catch (e) {
      console.error('Failed to load problems from localStorage', e);
    }
  }, []);

  // 新規問題の追加
  const handleAddProblem = (newProblem: Problem) => {
    const updated = [newProblem, ...problems];
    setProblems(updated);
    try {
      localStorage.setItem('janpost_problems', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save problems to localStorage', e);
    }
  };

  // 投票集計の保存
  const handleVote = (problemId: string, tileId: string) => {
    setProblems((prev) => {
      const updated = prev.map((p) => {
        if (p.id === problemId) {
          return {
            ...p,
            stats: {
              ...p.stats,
              [tileId]: (p.stats[tileId] || 0) + 1,
            },
          };
        }
        return p;
      });
      try {
        localStorage.setItem('janpost_problems', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save votes to localStorage', e);
      }
      return updated;
    });
  };

  // フィルタリング処理
  const filteredProblems = problems.filter((p) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'user') return p.author !== '公式' && !p.author.includes('公式');
    return p.level === selectedFilter;
  });

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🀄</span>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-1.5">
                雀ポスト <span className="text-xs font-mono font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">JanPost</span>
              </h1>
              <p className="text-[10px] text-zinc-500 hidden sm:block">
                何切る問題を投稿・回答して雀士の集合知を集めるプラットフォーム
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-md transition-all cursor-pointer"
          >
            <span>+</span>
            <span>問題を投稿する</span>
          </button>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="bg-gradient-to-b from-blue-50/50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 py-10 px-4 border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            迷った一打を問う。雀士の統計で解く。
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            手牌14枚から1タップで直感的に打牌を選択。回答するとリアルタイムに全員の選択割合と戦術解説が表示されます。初級から上級までステップアップして実力を磨きましょう。
          </p>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* レベル切り替えタブ */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow'
                : 'bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            すべて ({problems.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('beginner')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedFilter === 'beginner'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-white text-emerald-700 dark:bg-zinc-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
            }`}
          >
            🌱 初級編（基本の受け入れ）
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('intermediate')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedFilter === 'intermediate'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-blue-700 dark:bg-zinc-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50'
            }`}
          >
            ⚔️ 中級編（打点とスピード）
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('advanced')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedFilter === 'advanced'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-white text-purple-700 dark:bg-zinc-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-50'
            }`}
          >
            🔥 上級編（状況判断・押し引き）
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('user')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedFilter === 'user'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-white text-amber-700 dark:bg-zinc-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-50'
            }`}
          >
            👥 ユーザー投稿
          </button>
        </div>

        {/* 問題一覧 */}
        <div className="flex flex-col items-center">
          {filteredProblems.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-3">
              <span className="text-4xl">🀆</span>
              <p className="text-sm">該当する問題がまだありません。</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 underline font-bold"
              >
                あなたが最初の問題を投稿してみませんか？
              </button>
            </div>
          ) : (
            filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onVote={handleVote}
              />
            ))
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-xs text-zinc-500 space-y-1">
        <p className="font-bold text-zinc-700 dark:text-zinc-300">
          雀ポスト (JanPost) - 麻雀何切る投稿・投票プラットフォーム
        </p>
        <p className="text-zinc-400">© 2026 JanPost. All rights reserved.</p>
      </footer>

      {/* 投稿モーダル */}
      <PostProblemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProblem={handleAddProblem}
      />
    </div>
  );
}
