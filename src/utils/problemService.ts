import { Problem, VoteComment } from '../types/mahjong';
import { INITIAL_PROBLEMS } from '../data/initialProblems';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'janpost_problems';
const LOCAL_STORAGE_VOTES_KEY = 'janpost_votes';
const LOCAL_STORAGE_DELETED_KEY = 'janpost_deleted_problem_ids';
const LOCAL_STORAGE_LIKES_KEY = 'janpost_liked_problem_ids';
const LOCAL_STORAGE_LIKES_MAP_KEY = 'janpost_likes_count_map';
const LOCAL_STORAGE_MY_PROBLEMS_KEY = 'janpost_my_created_problem_ids';
const LOCAL_STORAGE_ADMIN_TOKEN_KEY = 'janpost_admin_authenticated';
export const ADMIN_SECRET = 'janpost777';

// note カラムに imageUrl, honba, doras を埋め込む/復元するヘルパー
// （Supabase の problems テーブルに専用カラムが存在しない環境でも確実に写真や追加メタデータが全端末同期されます）
export function encodeNoteWithImage(
  note?: string,
  imageUrl?: string,
  extra?: { honba?: number; doras?: string[] }
): string | null {
  const hasExtra = Boolean(extra?.honba || (extra?.doras && extra.doras.length > 1));
  if (!imageUrl && !note && !hasExtra) return null;
  if (!imageUrl && !hasExtra) return note || null;
  return JSON.stringify({
    note: note || '',
    imageUrl: imageUrl || undefined,
    honba: extra?.honba || undefined,
    doras: extra?.doras || undefined,
  });
}

export function decodeNoteWithImage(rawNote?: string | null): {
  note?: string;
  imageUrl?: string;
  honba?: number;
  doras?: string[];
} {
  if (!rawNote || typeof rawNote !== 'string') return {};
  if (
    rawNote.startsWith('{') &&
    (rawNote.includes('"imageUrl"') || rawNote.includes('"honba"') || rawNote.includes('"doras"'))
  ) {
    try {
      const parsed = JSON.parse(rawNote);
      return {
        note: parsed.note || undefined,
        imageUrl: parsed.imageUrl || undefined,
        honba: typeof parsed.honba === 'number' ? parsed.honba : undefined,
        doras: Array.isArray(parsed.doras) ? parsed.doras : undefined,
      };
    } catch {
      return { note: rawNote };
    }
  }
  return { note: rawNote };
}

// 問題一覧の取得（Supabase ＋ 投票数集計 ＋ コメント一覧 ＋ いいね数 ＋ 削除除外）
export async function getProblems(): Promise<Problem[]> {
  const localDeletedIds = getDeletedProblemIds();

  // 初期問題のプリセットコメント・いいね数マップ
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

  if (!isSupabaseConfigured || !supabase) {
    return getLocalProblems()
      .filter((p) => !localDeletedIds.includes(p.id))
      .map((p) => ({
        ...p,
        likes: getLocalLikesCount(p.id) || p.likes || initialLikesMap[p.id] || 0,
      }));
  }

  try {
    // 1. problems テーブルから全件取得
    const { data: problemsData, error: probError } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (probError || !problemsData || problemsData.length === 0) {
      console.warn('Supabase problems fetch fallback to local:', probError);
      return getLocalProblems()
        .filter((p) => !localDeletedIds.includes(p.id))
        .map((p) => ({
          ...p,
          likes: getLocalLikesCount(p.id) || p.likes || initialLikesMap[p.id] || 0,
        }));
    }

    // 2. votes テーブルから全レコード（投票・コメント・いいね・削除マーカー）を取得
    let votesData: any[] | null = null;
    const { data: vData, error: voteError } = await supabase
      .from('votes')
      .select('id, problem_id, tile_id, comment, created_at')
      .order('created_at', { ascending: true }); // 昇順で処理

    if (!voteError) {
      votesData = vData;
    } else {
      const { data: fallbackData } = await supabase
        .from('votes')
        .select('problem_id, tile_id');
      votesData = fallbackData;
    }

    const votesMap: Record<string, Record<string, number>> = {};
    const commentsMap: Record<string, VoteComment[]> = {};
    const cloudLikesMap: Record<string, number> = {};
    const globallyDeletedIds = new Set<string>();
    const cloudProblemOverrides: Record<string, any> = {};

    if (votesData) {
      for (const v of votesData) {
        // クラウドデータ同期（全端末への河・点数・写真の共有）
        if (v.tile_id === '__sync_problem_data__') {
          try {
            const syncObj = JSON.parse(v.comment);
            cloudProblemOverrides[v.problem_id] = {
              ...(cloudProblemOverrides[v.problem_id] || {}),
              ...syncObj,
            };
          } catch {}
          continue;
        }

        // グローバル削除マーカー
        if (v.tile_id === '__deleted__') {
          globallyDeletedIds.add(v.problem_id);
          continue;
        }

        // 復元マーカー
        if (v.tile_id === '__undelete__') {
          globallyDeletedIds.delete(v.problem_id);
          continue;
        }

        // いいねアクションの集計（RLS環境でも確実に全端末でいいね数を同期）
        if (v.tile_id === '__like__') {
          const current = cloudLikesMap[v.problem_id] || 0;
          if (v.comment === 'unlike') {
            cloudLikesMap[v.problem_id] = Math.max(0, current - 1);
          } else {
            cloudLikesMap[v.problem_id] = current + 1;
          }
          continue;
        }

        // 通常の打牌投票
        if (!votesMap[v.problem_id]) {
          votesMap[v.problem_id] = {};
        }
        votesMap[v.problem_id][v.tile_id] = (votesMap[v.problem_id][v.tile_id] || 0) + 1;

        // コメント（特殊アクション以外）
        if (v.comment && typeof v.comment === 'string' && v.comment.trim() !== '' && !v.comment.startsWith('cleanup_')) {
          if (!commentsMap[v.problem_id]) {
            commentsMap[v.problem_id] = [];
          }
          commentsMap[v.problem_id].unshift({
            id: v.id || `${v.problem_id}-${Math.random()}`,
            problemId: v.problem_id,
            tileId: v.tile_id,
            comment: v.comment,
            createdAt: v.created_at ? v.created_at.replace('T', ' ').substring(0, 16) : '直近',
          });
        }
      }
    }

    // 3. Problem 型に整形（ローカル削除・グローバル削除の両方を除外、ローカル画像バックアップもマージ）
    const localProblems = getLocalProblems();
    const localMap = new Map(localProblems.map((p) => [p.id, p]));

    return problemsData
      .filter((row: any) => !localDeletedIds.includes(row.id) && !globallyDeletedIds.has(row.id))
      .map((row: any) => {
        const mergedComments = [
          ...(commentsMap[row.id] || []),
          ...(initialCommentsMap[row.id] || []),
        ];

        const { note: decodedNote, imageUrl: decodedImageUrl, honba: decodedHonba, doras: decodedDoras } = decodeNoteWithImage(row.note);
        const cloudOverride = cloudProblemOverrides[row.id];
        const localProblem = localMap.get(row.id);
        const resolvedImageUrl =
          row.image_url ||
          row.imageUrl ||
          decodedImageUrl ||
          cloudOverride?.imageUrl ||
          localProblem?.imageUrl ||
          undefined;

        // いいね数の算出: 初期値 + クラウド同期値とローカルキャッシュの最大値
        const baseLikes = initialLikesMap[row.id] !== undefined ? initialLikesMap[row.id] : (row.likes || 0);
        const netLikesFromCloud = cloudLikesMap[row.id] || 0;
        const localCount = getLocalLikesCount(row.id);
        const totalLikes = Math.max(0, baseLikes + netLikesFromCloud);
        const resolvedLikes = Math.max(totalLikes, localCount);

        const rawPlayers = row.players || cloudOverride?.players || localProblem?.context?.players;
        const parsedPlayers = typeof rawPlayers === 'string' ? (() => { try { return JSON.parse(rawPlayers); } catch { return undefined; } })() : rawPlayers;

        const rawScores = row.scores || cloudOverride?.scores || localProblem?.context?.scores;
        const parsedScores = typeof rawScores === 'string' ? (() => { try { return JSON.parse(rawScores); } catch { return undefined; } })() : rawScores;

        const resolvedHonba = row.honba ?? cloudOverride?.honba ?? decodedHonba ?? localProblem?.context?.honba ?? 0;
        const resolvedDoras = cloudOverride?.doras || decodedDoras || (Array.isArray(row.doras) ? row.doras : undefined) || localProblem?.context?.doras;

        // 自動クラウド同期: ローカルに河や点数があり、クラウドにまだない場合、自動ブロードキャスト（全端末で閲覧可能にする）
        if (
          typeof window !== 'undefined' &&
          supabase &&
          localProblem?.context?.players &&
          !row.players &&
          !cloudProblemOverrides[row.id]
        ) {
          supabase.from('votes').insert([{
            problem_id: row.id,
            tile_id: '__sync_problem_data__',
            comment: JSON.stringify({
              players: localProblem.context.players,
              scores: localProblem.context.scores,
              discardsInfo: localProblem.context.discardsInfo,
              scoreInfo: localProblem.context.scoreInfo,
              imageUrl: localProblem.imageUrl,
              honba: localProblem.context.honba,
              doras: localProblem.context.doras,
            }),
          }]).then(() => {
            console.log('Auto-synced problem data to cloud for all devices:', row.id);
          });
        }

        return {
          id: row.id,
          title: row.title,
          level: row.level,
          imageUrl: resolvedImageUrl,
          context: {
            round: row.round,
            honba: resolvedHonba,
            turn: row.turn,
            wind: row.wind,
            dora: row.dora,
            doras: resolvedDoras,
            score: row.score,
            scores: parsedScores || undefined,
            players: parsedPlayers || undefined,
            scoreInfo: row.score_info || row.scoreInfo || localProblem?.context?.scoreInfo || undefined,
            discardsInfo: row.discards_info || row.discardsInfo || localProblem?.context?.discardsInfo || undefined,
            note: decodedNote || localProblem?.context?.note || undefined,
          },
          hand: Array.isArray(row.hand) ? row.hand : JSON.parse(row.hand || '[]'),
          discards: Array.isArray(row.discards) ? row.discards : JSON.parse(row.discards || '[]'),
          explanation: row.explanation,
          author: row.author,
          createdAt: row.created_at ? row.created_at.split('T')[0] : '',
          stats: votesMap[row.id] || {},
          likes: resolvedLikes,
          comments: mergedComments,
        };
      });
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return getLocalProblems()
      .filter((p) => !localDeletedIds.includes(p.id))
      .map((p) => ({
        ...p,
        likes: getLocalLikesCount(p.id) || p.likes || initialLikesMap[p.id] || 0,
      }));
  }
}

// 新規問題の作成・保存
export async function createProblem(newProblem: Problem): Promise<boolean> {
  // この端末で作成された問題としてIDを記録（方式①: 投稿端末での自動削除用）
  recordMyCreatedProblem(newProblem.id);

  // ローカルに即座にバックアップ
  saveLocalProblem(newProblem);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const encodedNote = encodeNoteWithImage(
      newProblem.context.note,
      newProblem.imageUrl,
      {
        honba: newProblem.context.honba,
        doras: newProblem.context.doras,
      }
    );

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
      note: encodedNote,
      hand: newProblem.hand,
      discards: newProblem.discards,
      explanation: newProblem.explanation,
      author: newProblem.author,
      likes: newProblem.likes || 0,
    };

    const { error } = await supabase.from('problems').insert([payload]);

    if (error) {
      console.warn('Initial insert attempt failed, checking fallback:', error);
      // カラム未定義エラーの場合のみ新カラムを除外して再試行
      if (error.message && (error.message.includes('column') || error.message.includes('schema'))) {
        delete payload.score_info;
        delete payload.discards_info;
        delete payload.scores;
        delete payload.players;
        delete payload.likes;
        const { error: fallbackErr } = await supabase.from('problems').insert([payload]);
        if (fallbackErr) {
          console.error('Failed to insert problem to Supabase (fallback):', fallbackErr);
          return false;
        }
      } else {
        console.error('Failed to insert problem to Supabase:', error);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Supabase insert exception:', err);
    return false;
  }
}

// 問題の削除（方式①: 管理者端末またはこの端末で投稿した本人のみ実行可能）
export async function deleteProblem(problemId: string): Promise<boolean> {
  // 権限チェック（管理者または投稿者本人の端末）
  if (!canDeleteProblem(problemId)) {
    console.warn('Unauthorized delete attempt blocked.');
    return false;
  }

  // 1. 端末ローカルから即時削除
  addDeletedProblemId(problemId);
  deleteLocalProblem(problemId);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // 2. votes テーブルに __deleted__ マーカーを挿入（RLS環境でも確実に全ユーザーから即時非表示にする）
    await supabase.from('votes').insert([{
      problem_id: problemId,
      tile_id: '__deleted__',
      comment: isDeviceAdmin() ? 'deleted_by_admin' : 'deleted_by_author',
    }]);

    // 3. 可能であれば Supabase の problems テーブルからも削除を試みる
    await supabase.from('problems').delete().eq('id', problemId);
    return true;
  } catch (err) {
    console.error('Supabase delete exception:', err);
    return true; // ローカルとマーカーで削除済み
  }
}

// いいねの切り替え（クラウド＆ローカル完全永続化）
export async function toggleProblemLike(problemId: string, increment: boolean): Promise<boolean> {
  // 1. ローカルキャッシュの更新
  updateLocalProblemLike(problemId, increment);
  updateLocalLikesCount(problemId, increment);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // 2. votes テーブルに __like__ アクションを挿入（RLSによるUPDATE拒否を回避し確実に全端末へ同期）
    const action = increment ? 'like' : 'unlike';
    await supabase.from('votes').insert([{
      problem_id: problemId,
      tile_id: '__like__',
      comment: action,
    }]);
    return true;
  } catch (err) {
    console.warn('Supabase like sync error:', err);
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
// 権限管理ヘルパー（方式①: 管理者 ＋ 投稿者端末）
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

// この端末で作成された問題か判定
export function isProblemCreatedOnThisDevice(problemId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 公式初期問題は投稿者本人ではないため除外
    if (
      problemId.startsWith('prob-beginner') ||
      problemId.startsWith('prob-intermediate') ||
      problemId.startsWith('prob-advanced')
    ) {
      return false;
    }

    // 1. 新設キー (janpost_my_created_problem_ids) をチェック
    const list: string[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_MY_PROBLEMS_KEY) || '[]');
    if (list.includes(problemId)) return true;

    // 2. この端末のローカルキャッシュ (janpost_problems) をチェック（過去バージョンで作成された全問題を救済）
    const localProblems: Problem[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const isMine = localProblems.some((p) => p && p.id === problemId);
    if (isMine) {
      // 次回以降のために新設キーにも自動保存
      if (!list.includes(problemId)) {
        list.push(problemId);
        localStorage.setItem(LOCAL_STORAGE_MY_PROBLEMS_KEY, JSON.stringify(list));
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// 作成した問題IDをこの端末に記録
export function recordMyCreatedProblem(problemId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list: string[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_MY_PROBLEMS_KEY) || '[]');
    if (!list.includes(problemId)) {
      list.push(problemId);
      localStorage.setItem(LOCAL_STORAGE_MY_PROBLEMS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error(e);
  }
}

// 削除権限の判定（方式①: 管理者端末なら全問題OK、一般端末なら本人が投稿した問題のみOK）
export function canDeleteProblem(problemId: string): boolean {
  return isDeviceAdmin() || isProblemCreatedOnThisDevice(problemId);
}

// ==========================================
// いいね状態のローカル永続化
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

function getLocalLikesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_LIKES_MAP_KEY) || '{}');
  } catch {
    return {};
  }
}

function getLocalLikesCount(problemId: string): number {
  return getLocalLikesMap()[problemId] || 0;
}

function updateLocalLikesCount(problemId: string, increment: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getLocalLikesMap();
    const current = map[problemId] !== undefined ? map[problemId] : 0;
    map[problemId] = Math.max(0, current + (increment ? 1 : -1));
    localStorage.setItem(LOCAL_STORAGE_LIKES_MAP_KEY, JSON.stringify(map));
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
