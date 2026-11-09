import { Problem, VoteComment } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'janpost_problems';
const LOCAL_STORAGE_VOTES_KEY = 'janpost_votes';
const LOCAL_STORAGE_DELETED_KEY = 'janpost_deleted_problem_ids';
const LOCAL_STORAGE_LIKES_KEY = 'janpost_liked_problem_ids';
const LOCAL_STORAGE_ADMIN_TOKEN_KEY = 'janpost_admin_authenticated';
export const ADMIN_SECRET = 'janpost777';

// 問題一覧の取得（Supabase ＋ 投票数集計 ＋ コメント一覧 ＋ いいね数 ＋ 削除除外）
export async function getProblems(): Promise<Problem[]> {
  const deletedIds = getDeletedProblemIds();

  if (!isSupabaseConfigured || !supabase) {
    return getLocalProblems().filter((p) => !deletedIds.includes(p.id));
  }

  try {
    // 1. problems テーブルから全件取得
    const { data: problemsData, error: probError } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (probError || !problemsData || problemsData.length === 0) {
      console.warn('Supabase problems fetch fallback to local:', probError);
      return getLocalProblems().filter((p) => !deletedIds.includes(p.id));
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
        if (!votesMap[v.problem_id]) {
          votesMap[v.problem_id] = {};
        }
        votesMap[v.problem_id][v.tile_id] = (votesMap[v.problem_id][v.tile_id] || 0) + 1;

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

    // 初期問題のプリセットコメント・いいね数もマージ
    const initialCommentsMap: Record<string, VoteComment[]> = {};
    const initialLikesMap: Record<string, number> = {};
    for (const initProb of INITIAL_PROBLEMS) {
      if (initProb.comments) {
        initialCommentsMap[initProb.id] = initProb.comments;
      }
      if (initProb.likes !== undefined) {
        initialLikesMap[initProb.id] = initProb.likes;
      }
    }

    // 3. Problem 型に整形（削除済みIDは除外）
    return problemsData
      .filter((row: any) => !deletedIds.includes(row.id))
      .map((row: any) => {
        const mergedComments = [
          ...(commentsMap[row.id] || []),
          ...(initialCommentsMap[row.id] || []),
        ];

        return {
          id: row.id,
          title: row.title,
          level: row.level,
          imageUrl: row.image_url || row.imageUrl || undefined,
          context: {
            round: row.round,
            turn: row.turn,
            wind: row.wind,
            dora: row.dora,
            score: row.score,
            scores: row.scores || undefined,
            players: row.players || undefined,
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
          likes: row.likes !== undefined && row.likes !== null ? row.likes : initialLikesMap[row.id] || 0,
          comments: mergedComments,
        };
      });
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return getLocalProblems().filter((p) => !deletedIds.includes(p.id));
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
      scores: newProblem.context.scores || null,
      players: newProblem.context.players || null,
      score_info: newProblem.context.scoreInfo || null,
      discards_info: newProblem.context.discardsInfo || null,
      image_url: newProblem.imageUrl || null,
      note: newProblem.context.note || null,
      hand: newProblem.hand,
      discards: newProblem.discards,
      explanation: newProblem.explanation,
      author: newProblem.author,
      likes: newProblem.likes || 0,
    };

    const { error } = await supabase.from('problems').insert([payload]);

    if (error) {
      console.warn('First insert attempt failed, trying fallback without new columns:', error);
      delete payload.score_info;
      delete payload.discards_info;
      delete payload.image_url;
      delete payload.scores;
      delete payload.players;
      delete payload.likes;
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

// 問題の削除（管理者認証された端末からのみ実行可能）
export async function deleteProblem(problemId: string): Promise<boolean> {
  // 管理者認証チェック（一般ユーザーは絶対に削除不可）
  if (!isDeviceAdmin()) {
    console.warn('Unauthorized delete attempt blocked.');
    return false;
  }

  // 削除済みリストに登録（初期問題の場合もリロードで復活させない）
  addDeletedProblemId(problemId);

  // ローカル問題リストから削除
  deleteLocalProblem(problemId);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // Supabaseから投票データと問題データを削除
    await supabase.from('votes').delete().eq('problem_id', problemId);
    const { error } = await supabase.from('problems').delete().eq('id', problemId);
    if (error) {
      console.warn('Supabase delete problem error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete exception:', err);
    return false;
  }
}

// いいねの切り替え
export async function toggleProblemLike(problemId: string, increment: boolean): Promise<boolean> {
  updateLocalProblemLike(problemId, increment);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // 現在のlikesを取得して更新
    const { data } = await supabase
      .from('problems')
      .select('likes')
      .eq('id', problemId)
      .single();

    if (data && data.likes !== undefined) {
      const newCount = Math.max(0, (data.likes || 0) + (increment ? 1 : -1));
      await supabase.from('problems').update({ likes: newCount }).eq('id', problemId);
    }
    return true;
  } catch (err) {
    console.warn('Supabase like update fallback:', err);
    return false;
  }
}

// 投票の記録
export async function submitVote(
  problemId: string,
  tileId: string,
  comment?: string
): Promise<boolean> {
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

// ==========================================
// このデバイス限定の管理者認証ヘルパー
// ==========================================

// 管理者端末として認証されているか判定
export function isDeviceAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LOCAL_STORAGE_ADMIN_TOKEN_KEY) === 'authenticated_admin';
}

// パスワードで管理者認証を実行
export function verifyAndSetAdmin(secretInput: string): boolean {
  if (typeof window === 'undefined') return false;
  if (secretInput.trim() === ADMIN_SECRET) {
    localStorage.setItem(LOCAL_STORAGE_ADMIN_TOKEN_KEY, 'authenticated_admin');
    return true;
  }
  return false;
}

// 管理者認証を解除（一般端末に戻す）
export function revokeAdmin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_ADMIN_TOKEN_KEY);
}

// 削除権限の判定: 管理者として認証された端末のみ TRUE（一般ユーザーは 100% FALSE）
export function canDeleteProblemOnThisDevice(): boolean {
  return isDeviceAdmin();
}

// ==========================================
// いいね済み状態のローカル判定
// ==========================================

export function isProblemLikedByMe(problemId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list: string[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_LIKES_KEY) || '[]');
    return list.includes(problemId);
  } catch {
    return false;
  }
}

export function setProblemLikedByMe(problemId: string, liked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    let list: string[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_LIKES_KEY) || '[]');
    if (liked) {
      if (!list.includes(problemId)) list.push(problemId);
    } else {
      list = list.filter((id) => id !== problemId);
    }
    localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

// ==========================================
// 削除済みIDのローカル永続化
// ==========================================

function getDeletedProblemIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_DELETED_KEY) || '[]');
  } catch {
    return [];
  }
}

function addDeletedProblemId(problemId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getDeletedProblemIds();
    if (!list.includes(problemId)) {
      list.push(problemId);
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error(e);
  }
}

function deleteLocalProblem(problemId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalProblems();
    const filtered = current.filter((p) => p.id !== problemId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error(e);
  }
}

function updateLocalProblemLike(problemId: string, increment: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalProblems();
    const updated = current.map((p) => {
      if (p.id === problemId) {
        return {
          ...p,
          likes: Math.max(0, (p.likes || 0) + (increment ? 1 : -1)),
        };
      }
      return p;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
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
