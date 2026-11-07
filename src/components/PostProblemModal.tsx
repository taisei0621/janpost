'use client';

import React, { useState } from 'react';
import { Problem, ProblemLevel, RecommendedDiscard } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { getTileDisplay, sortTiles } from '../utils/mahjongUtils';

interface PostProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (newProblem: Problem) => void;
}

// 牌グループ定義
const MAN_TILES = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'];
const PIN_TILES = ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'];
const SOU_TILES = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'];
const ZI_TILES = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];

const ALL_TILES = [...MAN_TILES, ...PIN_TILES, ...SOU_TILES, ...ZI_TILES];

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
  const [autoSort, setAutoSort] = useState(true);

  if (!isOpen) return null;

  // 牌を追加
  const handleAddTile = (tileId: string) => {
    if (hand.length >= 14) return;
    const newHand = [...hand, tileId];
    // 自動理牌がONならソート
    setHand(autoSort ? sortTiles(newHand) : newHand);
  };

  // 牌を削除
  const handleRemoveTile = (indexToRemove: number) => {
    setHand((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // 手動理牌
  const handleSort = () => {
    setHand(sortTiles(hand));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hand.length !== 14) {
      alert(`手牌はツモ牌を含めてちょうど14枚選んでください！（現在 ${hand.length}枚）`);
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
      hand: sortTiles(hand), // 投稿時に自動理牌
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 my-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-zinc-800">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            🀄 何切る問題を投稿する
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: オーラス逆転の何切る"
                className="w-full text-xs sm:text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                難易度
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProblemLevel)}
                className="w-full text-xs sm:text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="beginner">初級編（基本の受け入れ）</option>
                <option value="intermediate">中級編（打点とスピード）</option>
                <option value="advanced">上級編（状況判断・押し引き）</option>
              </select>
            </div>
          </div>

          {/* 局況 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">局</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full text-xs p-1.5 rounded border dark:bg-zinc-800 dark:border-zinc-700"
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
                className="w-full text-xs p-1.5 rounded border dark:bg-zinc-800 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">自家</label>
              <select
                value={wind}
                onChange={(e) => setWind(e.target.value)}
                className="w-full text-xs p-1.5 rounded border dark:bg-zinc-800 dark:border-zinc-700"
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
                className="w-full text-xs p-1.5 rounded border dark:bg-zinc-800 dark:border-zinc-700 font-mono"
              >
                {ALL_TILES.map((t) => (
                  <option key={`dora-${t}`} value={t}>
                    {getTileDisplay(t).topText}
                    {getTileDisplay(t).bottomText} ({t})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 現在選択中の手牌 (14枚) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  選択した手牌 ({hand.length} / 14枚)
                </label>
                <span className="text-[10px] text-zinc-400">※タップで削除</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSort}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  🔄 理牌する
                </button>
                {hand.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHand([])}
                    className="text-xs text-red-500 hover:underline cursor-pointer"
                  >
                    全消去
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-14 p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-start gap-1 overflow-x-auto border-2 border-dashed border-zinc-300 dark:border-zinc-700">
              {hand.length === 0 ? (
                <span className="text-xs text-zinc-400 mx-auto py-2">
                  下のパレットから牌をタップして14枚選んでください
                </span>
              ) : (
                hand.map((tileId, idx) => (
                  <MahjongTile
                    key={`chosen-${tileId}-${idx}`}
                    tileId={tileId}
                    size="sm"
                    isTsumo={idx === 13}
                    showTsumoLabel={idx === 13}
                    onClick={() => handleRemoveTile(idx)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ★ 牌パレット：極小サイズでスッキリ整列（萬子・筒子・索子・字牌の4段） */}
          <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                牌パレット（タップして手牌に追加）
              </span>
              <label className="text-[11px] text-zinc-500 flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSort}
                  onChange={(e) => setAutoSort(e.target.checked)}
                  className="rounded text-blue-600"
                />
                追加時に自動理牌
              </label>
            </div>

            {/* 萬子 (1m〜9m) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-red-700 w-6">萬子</span>
              <div className="flex gap-1 flex-1 overflow-x-auto pb-0.5">
                {MAN_TILES.map((t) => (
                  <MahjongTile
                    key={`pal-${t}`}
                    tileId={t}
                    size="xs"
                    onClick={() => handleAddTile(t)}
                  />
                ))}
              </div>
            </div>

            {/* 筒子 (1p〜9p) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-blue-700 w-6">筒子</span>
              <div className="flex gap-1 flex-1 overflow-x-auto pb-0.5">
                {PIN_TILES.map((t) => (
                  <MahjongTile
                    key={`pal-${t}`}
                    tileId={t}
                    size="xs"
                    onClick={() => handleAddTile(t)}
                  />
                ))}
              </div>
            </div>

            {/* 索子 (1s〜9s) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-emerald-700 w-6">索子</span>
              <div className="flex gap-1 flex-1 overflow-x-auto pb-0.5">
                {SOU_TILES.map((t) => (
                  <MahjongTile
                    key={`pal-${t}`}
                    tileId={t}
                    size="xs"
                    onClick={() => handleAddTile(t)}
                  />
                ))}
              </div>
            </div>

            {/* 字牌 (東南西北白發中) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 w-6">字牌</span>
              <div className="flex gap-1 flex-1 overflow-x-auto pb-0.5">
                {ZI_TILES.map((t) => (
                  <MahjongTile
                    key={`pal-${t}`}
                    tileId={t}
                    size="xs"
                    onClick={() => handleAddTile(t)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 正解の打牌選択 */}
          {hand.length === 14 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
              <div>
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                  正解（本命の打牌）
                </label>
                <select
                  value={bestDiscard}
                  onChange={(e) => setBestDiscard(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2 rounded border dark:bg-zinc-800"
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
                  className="w-full text-xs sm:text-sm p-2 rounded border dark:bg-zinc-800"
                />
              </div>
            </div>
          )}

          {/* 解説 ＆ 出題者名 */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                詳しい戦術解説
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="なぜその牌を切るべきか、他の選択肢との比較などを書いてください。"
                className="w-full text-xs sm:text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
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
                className="w-full text-xs sm:text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs sm:text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer"
            >
              問題を投稿する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
