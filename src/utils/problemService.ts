import { Problem } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'janpost_problems';

// 問題一覧の取得（Supabase ＋ 投票数集計）
export async function getProblems(): Promise<Problem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalProblems();
  }

  try {
    // 1. problems テーブルから全件取得
    const { data: problemsData, error: probError } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (probError || !problemsData || problemsData.length === 0) {
      console.warn('Supabase problems fetch fallback to local:', probError);
      return getLocalProblems();
    }

    // 2. votes テーブルから投票全件取得して集計
    const { data: votesData, error: voteError } = await supabase
      .from('votes')
      .select('problem_id, tile_id');

    const votesMap: Record<string, Record<string, number>> = {};
    if (!voteError && votesData) {
      for (const v of votesData) {
        if (!votesMap[v.problem_id]) {
          votesMap[v.problem_id] = {};
        }
        votesMap[v.problem_id][v.tile_id] = (votesMap[v.problem_id][v.tile_id] || 0) + 1;
      }
    }

    // 3. Problem 型に整形
    return problemsData.map((row: any) => ({
      id: row.id,
      title: row.title,
      level: row.level,
      context: {
        round: row.round,
        turn: row.turn,
        wind: row.wind,
        dora: row.dora,
        score: row.score,
        note: row.note,
      },
      hand: Array.isArray(row.hand) ? row.hand : JSON.parse(row.hand || '[]'),
      discards: Array.isArray(row.discards) ? row.discards : JSON.parse(row.discards || '[]'),
      explanation: row.explanation,
      author: row.author,
      createdAt: row.created_at ? row.created_at.split('T')[0] : '',
      stats: votesMap[row.id] || {},
    }));
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return getLocalProblems();
  }
}

// 新規問題の作成・保存
export async function createProblem(newProblem: Problem): Promise<boolean> {
  // ローカルに即座にバックアップ
  saveLocalProblem(newProblem);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const { error } = await supabase.from('problems').insert([
      {
        id: newProblem.id,
        title: newProblem.title,
        level: newProblem.level,
        round: newProblem.context.round,
        turn: newProblem.context.turn,
        wind: newProblem.context.wind,
        dora: newProblem.context.dora,
        score: newProblem.context.score || 25000,
        note: newProblem.context.note || null,
        hand: newProblem.hand,
        discards: newProblem.discards,
        explanation: newProblem.explanation,
        author: newProblem.author,
      },
    ]);

    if (error) {
      console.error('Failed to insert problem to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase insert exception:', err);
    return false;
  }
}

// 投票の記録
export async function submitVote(problemId: string, tileId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const { error } = await supabase.from('votes').insert([
      {
        problem_id: problemId,
        tile_id: tileId,
      },
    ]);

    if (error) {
      console.error('Failed to submit vote to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase vote exception:', err);
    return false;
  }
}

// ローカルストレージ用ヘルパー
function getLocalProblems(): Problem[] {
  if (typeof window === 'undefined') return INITIAL_PROBLEMS;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('LocalStorage read error:', e);
  }
  return INITIAL_PROBLEMS;
}

function saveLocalProblem(newProblem: Problem): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalProblems();
    const updated = [newProblem, ...current.filter((p) => p.id !== newProblem.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}
