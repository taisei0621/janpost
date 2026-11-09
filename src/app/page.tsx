'use client';

import React, { useState, useEffect } from 'react';
import { Problem, ProblemLevel, VoteComment } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { ProblemCard } from '../components/ProblemCard';
import { PostProblemModal } from '../components/PostProblemModal';
import { getProblems, createProblem, submitVote } from '../utils/problemService';
import { isSupabaseConfigured } from '../utils/supabaseClient';

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>(INITIAL_PROBLEMS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | ProblemLevel | 'user'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase (またはローカル) から問題一覧をロード
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getProblems();
      if (data && data.length > 0) {
        setProblems(data);
      }
    } catch (e) {
      console.error('Failed to load problems:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 新規問題の追加
  const handleAddProblem = async (newProblem: Problem) => {
    // 画面に即座に反映（楽観的UI更新）
    setProblems((prev) => [newProblem, ...prev]);
    // Supabase に非同期で保存
    await createProblem(newProblem);
  };

  // 投票集計（コメント対応）
  const handleVote = async (problemId: string, tileId: string, comment?: string) => {
    // 画面の集計を即座に+1 ＆ コメントがあれば追加
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id === problemId) {
          const updatedComments: VoteComment[] = comment
            ? [
                {
                  id: `c-local-${Date.now()}`,
                  problemId,
                  tileId,
                  comment,
                  createdAt: 'たった今',
                },
                ...(p.comments || []),
              ]
            : p.comments || [];

          return {
            ...p,
            stats: {
              ...p.stats,
              [tileId]: (p.stats[tileId] || 0) + 1,
            },
            comments: updatedComments,
          };
        }
        return p;
      })
    );
    // Supabase に非同期で投票を記録
    await submitVote(problemId, tileId, comment);
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
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center font-black text-sm select-none">
              雀
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                雀ポスト
                <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                  JanPost
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSupabaseConfigured && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-850">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>クラウド同期中</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold px-3.5 py-1.5 rounded-md shadow-sm transition-all cursor-pointer"
            >
              <span>+</span>
              <span>問題を作成</span>
            </button>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="bg-white dark:bg-zinc-900 py-8 px-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto text-center space-y-2">
          <h2 className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            迷った一打を問う。雀士の統計で解く。
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
            手牌14枚から打牌を選択し、全国の雀士の選択割合・打牌理由・戦術解説を確認できます。
          </p>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* レベル切り替えタブ */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            すべて ({problems.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('beginner')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === 'beginner'
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            初級（基本の受け入れ）
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('intermediate')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === 'intermediate'
                ? 'bg-blue-700 text-white'
                : 'bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            中級（打点とスピード）
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('advanced')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === 'advanced'
                ? 'bg-purple-700 text-white'
                : 'bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            上級（押し引きと状況判断）
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('user')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === 'user'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
            }`}
          >
            ユーザー投稿
          </button>
        </div>

        {/* 問題一覧 */}
        <div className="space-y-8 flex flex-col items-center">
          {isLoading ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-500">クラウドデータベースから問題を読み込み中...</p>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-3">
              <span className="text-4xl">🀆</span>
              <p className="text-sm">該当する問題がまだありません。</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 underline font-bold cursor-pointer"
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
