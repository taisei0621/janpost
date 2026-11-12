'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Problem, ProblemLevel, VoteComment } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { ProblemCard } from '../components/ProblemCard';
import { PostProblemModal } from '../components/PostProblemModal';
import {
  getProblems,
  createProblem,
  submitVote,
  deleteProblem,
  toggleProblemLike,
  isDeviceAdmin,
  verifyAndSetAdmin,
  revokeAdmin,
} from '../utils/problemService';
import { isSupabaseConfigured } from '../utils/supabaseClient';

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>(INITIAL_PROBLEMS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | ProblemLevel | 'user'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'popular' | 'votes'>('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

    // URLシークレットパラメータによる管理者認証チェック (?admin=janpost777 または ?secret=janpost777)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const secret = params.get('admin') || params.get('secret');
      if (secret) {
        if (verifyAndSetAdmin(secret)) {
          setIsAdmin(true);
          alert('管理者端末として認証されました。この端末限定で問題の削除が可能です。');
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          alert('認証キーが一致しませんでした。');
        }
      } else {
        setIsAdmin(isDeviceAdmin());
      }
    }
  }, []);

  // 新規問題の追加
  const handleAddProblem = async (newProblem: Problem) => {
    setProblems((prev) => [newProblem, ...prev]);
    await createProblem(newProblem);
  };

  // 問題の削除（この端末限定）
  const handleDeleteProblem = async (problemId: string) => {
    setProblems((prev) => prev.filter((p) => p.id !== problemId));
    await deleteProblem(problemId);
  };

  // いいねの切り替え
  const handleToggleLike = async (problemId: string, increment: boolean) => {
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id === problemId) {
          return {
            ...p,
            likes: Math.max(0, (p.likes || 0) + (increment ? 1 : -1)),
          };
        }
        return p;
      })
    );
    await toggleProblemLike(problemId, increment);
  };

  // 投票集計（コメント対応）
  const handleVote = async (problemId: string, tileId: string, comment?: string) => {
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
    await submitVote(problemId, tileId, comment);
  };

  // 管理者パスワード認証・解除
  const handleAdminAuth = () => {
    if (isAdmin) {
      if (window.confirm('管理者端末の認証を解除しますか？\n（解除すると削除ボタンが非表示になります）')) {
        revokeAdmin();
        setIsAdmin(false);
      }
      return;
    }
    const input = window.prompt('管理者パスワードを入力してください:');
    if (input !== null) {
      if (verifyAndSetAdmin(input)) {
        setIsAdmin(true);
        alert('管理者認証に成功しました。この端末限定で問題の削除が可能です。');
      } else {
        alert('パスワードが違います。');
      }
    }
  };

  // フィルタリング ＆ ソート（新着順・人気順・回答数順）
  const processedProblems = useMemo(() => {
    const filtered = problems.filter((p) => {
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'user') return p.author !== '公式' && !p.author.includes('公式');
      return p.level === selectedFilter;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'popular') {
        const diff = (b.likes || 0) - (a.likes || 0);
        if (diff !== 0) return diff;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortOrder === 'votes') {
        const countA = Object.values(a.stats || {}).reduce((s, c) => s + c, 0);
        const countB = Object.values(b.stats || {}).reduce((s, c) => s + c, 0);
        const diff = countB - countA;
        if (diff !== 0) return diff;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      // デフォルト: 新着順
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [problems, selectedFilter, sortOrder]);

  // 全体の総投票数を集計（ヘッダー等の表示用）
  const totalVotesAcrossAll = useMemo(() => {
    return problems.reduce((total, p) => {
      return total + Object.values(p.stats || {}).reduce((a, b) => a + b, 0);
    }, 0);
  }, [problems]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-slate-200 dark:selection:bg-zinc-800">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-black text-base shadow-sm ring-1 ring-slate-900/10 dark:ring-white/20 select-none">
              雀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                  雀ポスト
                </h1>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 dark:text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
                  JANPOST
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isSupabaseConfigured && (
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium tracking-tight">クラウド同期</span>
              </div>
            )}

            {/* 管理者モード切り替え */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 rounded-lg border border-amber-200/80 dark:border-amber-800/80 shadow-xs">
                <span className="text-[11px] font-bold">🛡️ 管理者</span>
                <button
                  type="button"
                  onClick={handleAdminAuth}
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 ml-1 font-medium cursor-pointer text-[11px]"
                  title="管理者モードを解除"
                >
                  解除
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdminAuth}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
                title="管理者ログイン"
              >
                <span className="text-xs opacity-75">🔑</span>
                <span className="text-[11px] font-medium">管理者</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>問題を作成</span>
            </button>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-900/60 border-b border-slate-200/80 dark:border-zinc-800/80 py-10 sm:py-12 px-4">
        {/* 背景の微細な装飾 */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-60" />

        <div className="relative max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
            <span className="text-xs">🀄</span>
            <span>麻雀「何切る」戦術分析プラットフォーム</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-zinc-50 tracking-tight leading-tight">
            迷った一打を問う。<br className="hidden sm:inline" />
            雀士の統計で解く。
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            手牌や盤面状況から打牌を選択。全国の雀士による選択割合・打牌理由・実戦解説から最善手を見つけ出せます。
          </p>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-500 dark:text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 dark:text-zinc-100 font-bold tabular-nums text-sm">
                {problems.length}
              </span>
              <span>問登録</span>
            </div>
            <span className="text-slate-300 dark:text-zinc-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900 dark:text-zinc-100 font-bold tabular-nums text-sm">
                {totalVotesAcrossAll.toLocaleString()}
              </span>
              <span>回答集計</span>
            </div>
          </div>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* レベル切り替えタブ（セグメントコントロール風デザイン） */}
        <div className="w-full flex justify-center mb-6">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/60 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-50 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span>すべて</span>
              <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                {problems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('beginner')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'beginner'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>初級 (受け入れ)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('intermediate')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'intermediate'
                  ? 'bg-white dark:bg-zinc-700 text-sky-700 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>中級 (打点/速度)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('advanced')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'advanced'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>上級 (状況判断)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('user')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'user'
                  ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>ユーザー投稿</span>
            </button>
          </div>
        </div>

        {/* 並び替えコントローラー & 検索件数 */}
        <div className="flex items-center justify-between gap-3 mb-6 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono tabular-nums">
              {processedProblems.length}
            </span>
            <span className="text-slate-500 dark:text-zinc-400">件を表示中</span>
          </div>

          <div className="inline-flex items-center bg-slate-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setSortOrder('newest')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                sortOrder === 'newest'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              新着順
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('popular')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                sortOrder === 'popular'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              人気順
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('votes')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                sortOrder === 'votes'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              回答数順
            </button>
          </div>
        </div>

        {/* 問題一覧 */}
        <div className="space-y-8 flex flex-col items-center">
          {isLoading ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-8 h-8 border-2 border-slate-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">問題データを読み込み中...</p>
            </div>
          ) : processedProblems.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 max-w-md w-full space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-2xl mx-auto">
                🀆
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                該当する問題がまだありません
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                新しい何切る問題を投稿してみませんか？
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>+</span>
                <span>問題を作成する</span>
              </button>
            </div>
          ) : (
            processedProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onVote={handleVote}
                onLike={handleToggleLike}
                onDelete={handleDeleteProblem}
                canDelete={isAdmin ? true : undefined}
              />
            ))
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-16 bg-white dark:bg-zinc-950 border-t border-slate-200/80 dark:border-zinc-800/80 py-10 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="w-5 h-5 rounded bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-[10px]">
            雀
          </span>
          <p className="font-bold text-slate-800 dark:text-zinc-200">
            雀ポスト (JanPost)
          </p>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
          麻雀の何切る問題・戦術検討プラットフォーム
        </p>
        <p className="text-slate-400 dark:text-zinc-600 pt-1">
          <button
            type="button"
            onClick={handleAdminAuth}
            className="hover:underline cursor-pointer"
            title="管理者ログイン"
          >
            © 2026 JanPost.
          </button>{' '}
          All rights reserved.
        </p>

        {/* 管理者端末認証中のみ表示 */}
        {isAdmin && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-[11px] border border-amber-200/80 dark:border-amber-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>管理者端末として認証中（全問題の削除が可能）</span>
              <button
                type="button"
                onClick={handleAdminAuth}
                className="text-rose-600 hover:text-rose-700 ml-1 font-semibold underline cursor-pointer"
              >
                ログアウト
              </button>
            </span>
          </div>
        )}
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
