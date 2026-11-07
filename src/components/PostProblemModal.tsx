'use client';

import React, { useState } from 'react';
import { Problem, ProblemLevel, RecommendedDiscard } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { getTileDisplay } from '../utils/mahjongUtils';

interface PostProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (newProblem: Problem) => void;
}

const ALL_TILES = [
  // 萬子
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
  // 筒子
  '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
  // 索子
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
  // 字牌
  '1z', '2z', '3z', '4z', '5z', '6z', '7z',
];

export const PostProblemModal: React.FC<PostProblemModalProps> = ({
  isOpen,
  onClose,
  onAddProblem,
}) => {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<ProblemLevel>('intermediate');
  const [round, setRound] = useState('東1局');
  const [turn, setTurn] = useState(6);
  const [wind, setWind] = useState('南家');
  const [dora, setDora] = useState('5m');
  const [author, setAuthor] = useState('');
  const [hand, setHand] = useState<string[]>([]);
  const [bestDiscard, setBestDiscard] = useState('');
  const [bestReason, setBestReason] = useState('');
  const [explanation, setExplanation] = useState('');

  if (!isOpen) return null;

  const handleAddTile = (tileId: string) => {
    if (hand.length >= 14) return;
    setHand((prev) => [...prev, tileId]);
  };

  const handleRemoveTile = (indexToRemove: number) => {
    setHand((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hand.length !== 14) {
      alert('手牌はツモ牌を含めてちょうど14枚選んでください！(現在 ' + hand.length + '枚)');
      return;
    }
    if (!bestDiscard) {
      alert('正解（本命打牌）を選択してください！');
      return;
    }

    const discards: RecommendedDiscard[] = [
      {
        tileId: bestDiscard,
        rank: 'best',
        label: '本命打牌',
        reason: bestReason || '受け入れ枚数最大または最も効率的な一打です。',
      },
    ];

    const newProblem: Problem = {
      id: `prob-user-${Date.now()}`,
      title: title || `【${level === 'beginner' ? '初級' : level === 'intermediate' ? '中級' : '上級'}】迷った一打`,
      level,
      context: {
        round,
        turn: Number(turn),
        wind,
        dora,
      },
      hand,
      discards,
      explanation: explanation || '投稿者による解説はありません。',
      author: author || '名無しの雀士',
      createdAt: new Date().toISOString().split('T')[0],
      stats: {
        [bestDiscard]: 1,
      },
    };

    onAddProblem(newProblem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            🀄 何切る問題を投稿する
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: オーラス逆転の何切る"
                className="w-full text-sm p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                難易度
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProblemLevel)}
                className="w-full text-sm p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="beginner">初級編（基本の受け入れ）</option>
                <option value="intermediate">中級編（打点とスピード）</option>
                <option value="advanced">上級編（状況判断・押し引き）</option>
              </select>
            </div>
          </div>

          {/* 局況 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">局</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full text-xs p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">巡目</label>
              <input
                type="number"
                min={1}
                max={18}
                value={turn}
                onChange={(e) => setTurn(Number(e.target.value))}
                className="w-full text-xs p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">自家</label>
              <select
                value={wind}
                onChange={(e) => setWind(e.target.value)}
                className="w-full text-xs p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
              >
                <option value="東家">東家（親）</option>
                <option value="南家">南家</option>
                <option value="西家">西家</option>
                <option value="北家">北家</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">ドラ</label>
              <select
                value={dora}
                onChange={(e) => setDora(e.target.value)}
                className="w-full text-xs p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 font-mono"
              >
                {ALL_TILES.map((t) => (
                  <option key={t} value={t}>
                    {getTileDisplay(t).topText}
                    {getTileDisplay(t).bottomText} ({t})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 現在選択中の手牌 (14枚) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                選択した手牌 ({hand.length} / 14枚) ※タップで削除
              </label>
              {hand.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHand([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  全リセット
                </button>
              )}
            </div>

            <div className="min-h-16 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center gap-1 overflow-x-auto border-2 border-dashed border-zinc-300 dark:border-zinc-700">
              {hand.length === 0 ? (
                <span className="text-xs text-zinc-400 mx-auto">
                  下の牌パレットをタップして14枚選んでください
                </span>
              ) : (
                hand.map((tileId, idx) => (
                  <MahjongTile
                    key={`hand-${tileId}-${idx}`}
                    tileId={tileId}
                    size="sm"
                    isTsumo={idx === 13}
                    onClick={() => handleRemoveTile(idx)}
                  />
                ))
              )}
            </div>
          </div>

          {/* 牌パレット */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500">
              牌パレット（タップして追加）
            </span>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-1 justify-center max-h-40 overflow-y-auto">
              {ALL_TILES.map((tileId) => (
                <MahjongTile
                  key={`palette-${tileId}`}
                  tileId={tileId}
                  size="sm"
                  onClick={() => handleAddTile(tileId)}
                />
              ))}
            </div>
          </div>

          {/* 正解の打牌選択 */}
          {hand.length === 14 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900">
              <div>
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                  正解（本命の打牌）
                </label>
                <select
                  value={bestDiscard}
                  onChange={(e) => setBestDiscard(e.target.value)}
                  className="w-full text-sm p-2 rounded border dark:bg-zinc-800"
                >
                  <option value="">正解牌を選択</option>
                  {Array.from(new Set(hand)).map((t) => (
                    <option key={`opt-${t}`} value={t}>
                      {getTileDisplay(t).topText}
                      {getTileDisplay(t).bottomText} ({t})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                  正解理由の要約
                </label>
                <input
                  type="text"
                  value={bestReason}
                  onChange={(e) => setBestReason(e.target.value)}
                  placeholder="例: 受け入れ枚数最大、三色確定"
                  className="w-full text-sm p-2 rounded border dark:bg-zinc-800"
                />
              </div>
            </div>
          )}

          {/* 解説 ＆ 出題者名 */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                詳しい戦術解説
              </label>
              <textarea
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="なぜその牌を切るべきか、他の選択肢との比較などを書いてください。"
                className="w-full text-sm p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                あなたの名前（ニックネーム）
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="名無しの雀士"
                className="w-full text-sm p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md cursor-pointer"
            >
              問題を投稿する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
