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
  const [scoreInfo, setScoreInfo] = useState('');
  const [discardsInfo, setDiscardsInfo] = useState('');
  const [showAdvancedContext, setShowAdvancedContext] = useState(false);
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
        scoreInfo: scoreInfo.trim() || undefined,
        discardsInfo: discardsInfo.trim() || undefined,
      },
      hand: sortTiles(hand), // 投稿時に自動理牌
      discards,
      explanation: explanation || '投稿者による解説はありません。',
      author: author || '名無しの雀士',
      createdAt: new Date().toISOString().split('T')[0],
      stats: {
        [bestDiscard]: 1,
      },
      comments: [],
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
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl font-bold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトルと難易度 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                問題タイトル
              </label>
              <input
                type="text"
                placeholder="例: オーラスの逆転手：打点 vs スピード"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                対象難易度
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProblemLevel)}
                className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
              >
                <option value="beginner">🌱 初級（基本牌効率）</option>
                <option value="intermediate">⚔️ 中級（手役・点差）</option>
                <option value="advanced">👑 上級（押し引き・ベタオリ）</option>
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

          {/* 実戦状況の詳細（点数・捨牌・リーチ等）アコーディオン（任意） */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-800/30">
            <button
              type="button"
              onClick={() => setShowAdvancedContext(!showAdvancedContext)}
              className="w-full px-3 py-2 text-xs font-bold flex items-center justify-between text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span>📋</span>
                <span>詳細な戦況（点数状況・捨て牌・リーチ等）を追加</span>
                <span className="text-[10px] text-zinc-400 font-normal">（任意）</span>
                {(scoreInfo || discardsInfo) && (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
              <span className="text-zinc-400 text-xs">
                {showAdvancedContext ? '▲ 閉じる' : '▼ 入力する'}
              </span>
            </button>

            {showAdvancedContext && (
              <div className="p-3 pt-2 space-y-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    📊 点数状況・順位
                  </label>
                  <input
                    type="text"
                    placeholder="例: 東家 36,000 / 南家(自分) 24,000 / 西家 20,000 / 北家 20,000（2着目）"
                    value={scoreInfo}
                    onChange={(e) => setScoreInfo(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    🀁 捨て牌・他家の動向
                  </label>
                  <textarea
                    rows={2}
                    placeholder="例: 対面の親が6巡目に早めリーチ、河に1m・8p・発。上家から安牌手出しあり。自分は好形一向聴。"
                    value={discardsInfo}
                    onChange={(e) => setDiscardsInfo(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
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

          {/* 牌パレット (4段整列) */}
          <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                牌パレット（クリックで手牌に追加）
              </span>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSort}
                  onChange={(e) => setAutoSort(e.target.checked)}
                  className="rounded text-blue-600"
                />
                自動理牌
              </label>
            </div>

            <div className="space-y-1.5">
              {/* 萬子 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-red-600 w-5 shrink-0">萬</span>
                <div className="flex gap-1">
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

              {/* 筒子 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-blue-600 w-5 shrink-0">筒</span>
                <div className="flex gap-1">
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

              {/* 索子 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-emerald-600 w-5 shrink-0">索</span>
                <div className="flex gap-1">
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

              {/* 字牌 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-purple-600 w-5 shrink-0">字</span>
                <div className="flex gap-1">
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
          </div>

          {/* 正解打牌の選択（手牌14枚から選択） */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-2">
            <label className="block text-xs font-bold text-blue-900 dark:text-blue-300">
              正解（本命の打牌）を選択してください
            </label>
            {hand.length === 0 ? (
              <span className="text-[11px] text-zinc-400">まず手牌を選んでください</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 items-center">
                {Array.from(new Set(hand)).map((tileId) => {
                  const isSelected = bestDiscard === tileId;
                  const display = getTileDisplay(tileId);
                  return (
                    <button
                      key={`sel-${tileId}`}
                      type="button"
                      onClick={() => setBestDiscard(tileId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                          : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-400'
                      }`}
                    >
                      <span className={display.suitColor}>{display.topText}</span>
                      <span>{display.bottomText}</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1 mt-2">
                本命打牌の狙い・理由
              </label>
              <input
                type="text"
                placeholder="例: 受け入れ枚数最大（28枚）かつ平和・タンヤオへの変化が最多"
                value={bestReason}
                onChange={(e) => setBestReason(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 戦術解説と投稿者名 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                全体の戦術解説（任意）
              </label>
              <textarea
                rows={2}
                placeholder="例: 序盤の孤立牌比較。オタ風よりも端牌のくっつきを優先するのが現代牌効率の基本です。"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                投稿者名（任意）
              </label>
              <input
                type="text"
                placeholder="名無しの雀士"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-md transition-all cursor-pointer"
            >
              問題を投稿する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
