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

  // フィルタリング ＆ ソート
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
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [problems, selectedFilter, sortOrder]);

  const totalVotesAcrossAll = useMemo(() => {
    return problems.reduce((total, p) => {
      return total + Object.values(p.stats || {}).reduce((a, b) => a + b, 0);
    }, 0);
  }, [problems]);

  return (
    <div className="min-h-screen bg-[#EAE4D7] text-[#262422]">
      {/* 最上部：エアメール風のアクセントライン */}
      <div className="w-full h-1.5 airmail-stripe border-b border-[#D5CEBE]" />

      {/* レトロモダンヘッダー */}
      <header className="sticky top-0 z-40 bg-[#FBF9F4] border-b-2 border-[#C82C26] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* 看板風ロゴ */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-[#C82C26] text-white flex items-center justify-center font-black text-lg shadow-sm border border-[#961E1A] select-none">
              <span className="font-serif">雀</span>
              <span className="absolute -bottom-1 -right-1 text-[9px] bg-[#1E3A5F] text-[#FBF9F4] w-4 h-4 rounded-full flex items-center justify-center font-sans font-bold border border-white">
                〒
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-[#262422] font-serif flex items-center gap-1.5">
                  雀ポスト
                  <span className="text-[11px] font-mono tracking-widest text-[#C82C26] uppercase font-bold">
                    JANPOST
                  </span>
                </h1>
              </div>
              <p className="text-[10px] text-[#7A7265] hidden sm:block tracking-wider font-medium">
                麻雀「何切る」投稿・投票プラットフォーム
              </p>
            </div>
          </div>

          {/* ヘッダー右側アクション */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSupabaseConfigured && (
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#1E3A5F] bg-[#E8EFF7] px-2.5 py-1 rounded-full border border-[#1E3A5F]/30 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F] animate-pulse" />
                <span className="text-[11px] font-sans tracking-tight">クラウド同期中</span>
              </div>
            )}

            {/* 管理者モード切り替え */}
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-[#F5EEDB] text-[#8C6420] text-xs px-2.5 py-1 rounded-lg border border-[#D5C29A] shadow-xs">
                <span className="text-[11px] font-bold">🛡️ 管理者</span>
                <button
                  type="button"
                  onClick={handleAdminAuth}
                  className="text-[#C82C26] hover:underline ml-1 font-bold cursor-pointer text-[11px]"
                  title="管理者モードを解除"
                >
                  解除
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdminAuth}
                className="flex items-center gap-1 text-[#7A7265] hover:text-[#262422] text-xs px-2 py-1.5 rounded-lg hover:bg-[#EAE4D7] transition-colors cursor-pointer border border-[#D5CEBE]"
                title="管理者ログイン"
              >
                <span className="text-xs">🔑</span>
                <span className="text-[11px] font-medium">管理者</span>
              </button>
            )}

            {/* 投函する（問題を作成）ボタン */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-postbox inline-flex items-center gap-1.5 text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl cursor-pointer select-none"
            >
              <span className="text-sm">📮</span>
              <span>問題を投函する</span>
            </button>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden py-9 sm:py-11 px-4 border-b border-[#D5CEBE] bg-[#F4EFE6]">
        {/* 背景の消印スタンプ装飾 */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full border-2 border-[#1E3A5F]/15 flex items-center justify-center pointer-events-none rotate-12">
          <div className="w-28 h-28 rounded-full border border-[#1E3A5F]/15 flex flex-col items-center justify-center text-[10px] text-[#1E3A5F]/20 font-mono">
            <span>JANPOST</span>
            <span>2026.11.13</span>
            <span>TOKYO</span>
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF9F4] border border-[#D5CEBE] text-[11px] font-medium text-[#7A7265] shadow-xs">
            <span className="text-xs text-[#C82C26]">🀄</span>
            <span className="tracking-wide">麻雀「何切る」戦術分析・投票プラットフォーム</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#262422] tracking-tight font-serif leading-tight">
            迷った一打を投函する。<br className="hidden sm:inline" />
            雀士の統計で解く。
          </h2>

          <p className="text-xs sm:text-sm text-[#5C5549] max-w-xl mx-auto leading-relaxed">
            手牌14枚から打牌を選択し、全国の雀士の選択割合・打牌理由・戦術解説を確認できます。
          </p>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-medium text-[#7A7265] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[#C82C26] font-bold tabular-nums text-sm">
                {problems.length}
              </span>
              <span>問登録</span>
            </div>
            <span className="text-[#D5CEBE]">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#1E3A5F] font-bold tabular-nums text-sm">
                {totalVotesAcrossAll.toLocaleString()}
              </span>
              <span>回答集計</span>
            </div>
          </div>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* レベル切り替えタブ */}
        <div className="w-full flex justify-center mb-6">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#DCD5C6] border border-[#C5BDAA] overflow-x-auto max-w-full shadow-inner gap-1">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'all'
                  ? 'bg-[#FBF9F4] text-[#262422] shadow-sm border border-[#D5CEBE]'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              <span>すべて</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#EAE4D7] text-[#5C5549]">
                {problems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('beginner')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'beginner'
                  ? 'bg-[#124D27] text-white shadow-sm'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>初級</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('intermediate')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'intermediate'
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-300" />
              <span>中級</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('advanced')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'advanced'
                  ? 'bg-[#5B2C6F] text-white shadow-sm'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <span>上級</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('user')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'user'
                  ? 'bg-[#C82C26] text-white shadow-sm'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              <span>ユーザー投稿</span>
            </button>
          </div>
        </div>

        {/* 並び替えコントローラー & 件数 */}
        <div className="flex items-center justify-between gap-3 mb-6 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C82C26]" />
            <span className="font-bold text-[#262422] font-mono tabular-nums">
              {processedProblems.length}
            </span>
            <span className="text-[#7A7265]">件の問題を表示中</span>
          </div>

          <div className="inline-flex items-center bg-[#DCD5C6] p-0.5 rounded-xl border border-[#C5BDAA]">
            <button
              type="button"
              onClick={() => setSortOrder('newest')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sortOrder === 'newest'
                  ? 'bg-[#FBF9F4] text-[#262422] shadow-xs'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              新着順
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('popular')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sortOrder === 'popular'
                  ? 'bg-[#FBF9F4] text-[#262422] shadow-xs'
                  : 'text-[#5C5549] hover:text-[#262422]'
              }`}
            >
              人気順
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('votes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sortOrder === 'votes'
                  ? 'bg-[#FBF9F4] text-[#262422] shadow-xs'
                  : 'text-[#5C5549] hover:text-[#262422]'
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
              <div className="w-9 h-9 border-3 border-[#C82C26] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#5C5549] font-medium">クラウドデータベースから読み込み中...</p>
            </div>
          ) : processedProblems.length === 0 ? (
            <div className="text-center py-16 px-6 postcard-paper rounded-2xl max-w-md w-full space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EAE4D7] flex items-center justify-center text-3xl mx-auto border border-[#D5CEBE]">
                🀆
              </div>
              <p className="text-sm font-bold text-[#262422] font-serif">
                該当する問題がまだありません
              </p>
              <p className="text-xs text-[#7A7265]">
                あなたが最初の問題を投函してみませんか？
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-postbox mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                <span>📮</span>
                <span>問題を投函する</span>
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
      <footer className="mt-16 bg-[#F4EFE6] border-t-2 border-[#C82C26] py-10 text-center text-xs text-[#5C5549] space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded bg-[#C82C26] text-white flex items-center justify-center font-bold text-[10px] font-serif">
            雀
          </div>
          <p className="font-bold text-[#262422] font-serif">
            雀ポスト (JanPost) - 麻雀何切る投稿・投票プラットフォーム
          </p>
        </div>
        <p className="text-[11px] text-[#7A7265]">
          迷った一打を投函し、雀士たちの統計と考察が集まる場所
        </p>
        <p className="text-[#7A7265] pt-1 font-mono text-[11px]">
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

        {/* 管理者認証中 */}
        {isAdmin && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 bg-[#F5EEDB] text-[#8C6420] px-3 py-1 rounded-full text-[11px] border border-[#D5C29A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#124D27]" />
              <span>管理者端末として認証中（全問題の削除権限あり）</span>
              <button
                type="button"
                onClick={handleAdminAuth}
                className="text-[#C82C26] hover:underline ml-1 font-bold cursor-pointer"
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
