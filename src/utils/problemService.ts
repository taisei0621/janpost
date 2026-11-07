import { Problem, VoteComment } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'janpost_problems';
const LOCAL_STORAGE_VOTES_KEY = 'janpost_votes';

// 問題一覧の取得（Supabase ＋ 投票数集計 ＋ コメント一覧）
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

    // 2. votes テーブルから投票全件（コメント付き）取得して集計
    let votesData: any[] | null = null;
    const { data: vData, error: voteError } = await supabase
      .from('votes')
      .select('id, problem_id, tile_id, comment, created_at')
      .order('created_at', { ascending: false });

    if (!voteError) {
      votesData = vData;
    } else {
      // comment カラムがまだない旧スキーマの場合のフォールバック
      const { data: fallbackData } = await supabase
        .from('votes')
        .select('problem_id, tile_id');
      votesData = fallbackData;
    }

    const votesMap: Record<string, Record<string, number>> = {};
    const commentsMap: Record<string, VoteComment[]> = {};

    if (votesData) {
      for (const v of votesData) {
        // 集計
        if (!votesMap[v.problem_id]) {
          votesMap[v.problem_id] = {};
        }
        votesMap[v.problem_id][v.tile_id] = (votesMap[v.problem_id][v.tile_id] || 0) + 1;

        // コメント
        if (v.comment && typeof v.comment === 'string' && v.comment.trim() !== '') {
          if (!commentsMap[v.problem_id]) {
            commentsMap[v.problem_id] = [];
          }
          commentsMap[v.problem_id].push({
            id: v.id || `${v.problem_id}-${Math.random()}`,
            problemId: v.problem_id,
            tileId: v.tile_id,
            comment: v.comment,
            createdAt: v.created_at ? v.created_at.replace('T', ' ').substring(0, 16) : '直近',
          });
        }
      }
    }

    // 初期問題のプリセットコメントもマージ
    const initialCommentsMap: Record<string, VoteComment[]> = {};
    for (const initProb of INITIAL_PROBLEMS) {
      if (initProb.comments) {
        initialCommentsMap[initProb.id] = initProb.comments;
      }
    }

    // 3. Problem 型に整形
    return problemsData.map((row: any) => {
      const mergedComments = [
        ...(commentsMap[row.id] || []),
        ...(initialCommentsMap[row.id] || []),
      ];

      return {
        id: row.id,
        title: row.title,
        level: row.level,
        context: {
          round: row.round,
          turn: row.turn,
          wind: row.wind,
          dora: row.dora,
          score: row.score,
          scoreInfo: row.score_info || row.scoreInfo || undefined,
          discardsInfo: row.discards_info || row.discardsInfo || undefined,
          note: row.note,
        },
        hand: Array.isArray(row.hand) ? row.hand : JSON.parse(row.hand || '[]'),
        discards: Array.isArray(row.discards) ? row.discards : JSON.parse(row.discards || '[]'),
        explanation: row.explanation,
        author: row.author,
        createdAt: row.created_at ? row.created_at.split('T')[0] : '',
        stats: votesMap[row.id] || {},
        comments: mergedComments,
      };
    });
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
    const payload: any = {
      id: newProblem.id,
      title: newProblem.title,
      level: newProblem.level,
      round: newProblem.context.round,
      turn: newProblem.context.turn,
      wind: newProblem.context.wind,
      dora: newProblem.context.dora,
      score: newProblem.context.score || 25000,
      score_info: newProblem.context.scoreInfo || null,
      discards_info: newProblem.context.discardsInfo || null,
      note: newProblem.context.note || null,
      hand: newProblem.hand,
      discards: newProblem.discards,
      explanation: newProblem.explanation,
      author: newProblem.author,
    };

    const { error } = await supabase.from('problems').insert([payload]);

    if (error) {
      console.warn('First insert attempt failed, trying fallback without new columns:', error);
      // 新カラム（score_info, discards_info）がまだDBに追加されていない場合の自動フォールバック
      delete payload.score_info;
      delete payload.discards_info;
      const { error: fallbackErr } = await supabase.from('problems').insert([payload]);
      if (fallbackErr) {
        console.error('Failed to insert problem to Supabase:', fallbackErr);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Supabase insert exception:', err);
    return false;
  }
}

// 投票の記録（理由コメント対応）
export async function submitVote(
  problemId: string,
  tileId: string,
  comment?: string
): Promise<boolean> {
  // ローカルストレージにも保存
  saveLocalVote(problemId, tileId, comment);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const payload: any = {
      problem_id: problemId,
      tile_id: tileId,
    };

    if (comment && comment.trim()) {
      payload.comment = comment.trim();
    }

    const { error } = await supabase.from('votes').insert([payload]);

    if (error) {
      console.warn('Vote insert with comment failed, retrying without comment:', error);
      // comment カラムがまだDBに追加されていない場合の自動フォールバック
      delete payload.comment;
      const { error: fallbackErr } = await supabase.from('votes').insert([payload]);
      if (fallbackErr) {
        console.error('Failed to submit vote to Supabase:', fallbackErr);
        return false;
      }
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

function saveLocalVote(problemId: string, tileId: string, comment?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_VOTES_KEY);
    const votes: any[] = saved ? JSON.parse(saved) : [];
    votes.push({
      id: `local-${Date.now()}`,
      problem_id: problemId,
      tile_id: tileId,
      comment: comment || null,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_STORAGE_VOTES_KEY, JSON.stringify(votes));
  } catch (e) {
    console.error('LocalStorage vote write error:', e);
  }
}
