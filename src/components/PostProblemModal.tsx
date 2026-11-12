'use client';

import React, { useState, useRef } from 'react';
import { Problem, ProblemLevel, RecommendedDiscard, DiscardTile, PlayerSituation } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { MahjongRiver } from './MahjongRiver';
import { compressImage } from '../utils/imageUtils';
import {
  getTileDisplay,
  sortTiles,
  canAddTileValidation,
  countSameTileType,
  countExactTile,
} from '../utils/mahjongUtils';

interface PostProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (newProblem: Problem) => void;
}

// 牌グループ定義（赤5萬・赤5筒・赤5索）
const MAN_TILES = ['1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m'];
const PIN_TILES = ['1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p'];
const SOU_TILES = ['1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s'];
const ZI_TILES = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];

const ALL_TILES = [...MAN_TILES, ...PIN_TILES, ...SOU_TILES, ...ZI_TILES];
const WINDS: Array<'東家' | '南家' | '西家' | '北家'> = ['東家', '南家', '西家', '北家'];

export const PostProblemModal: React.FC<PostProblemModalProps> = ({
  isOpen,
  onClose,
  onAddProblem,
}) => {
  // 投稿モード: 手牌パレットで作成 or 写真・スクショで作成
  const [postMode, setPostMode] = useState<'tiles' | 'photo'>('tiles');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<ProblemLevel>('intermediate');
  const [round, setRound] = useState('東1局');
  const [honba, setHonba] = useState<number>(0);
  const [turn, setTurn] = useState(6);
  const [wind, setWind] = useState<'東家' | '南家' | '西家' | '北家'>('南家');
  const [doraList, setDoraList] = useState<string[]>(['5m']);
  const [author, setAuthor] = useState('');

  // 手牌
  const [hand, setHand] = useState<string[]>([]);
  const [bestDiscard, setBestDiscard] = useState('');
  const [bestReason, setBestReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [autoSort, setAutoSort] = useState(true);

  // 詳細戦況（アコーディオン）
  const [showAdvancedContext, setShowAdvancedContext] = useState(false);
  const [activeContextSubTab, setActiveContextSubTab] = useState<'scores' | 'river' | 'note'>('scores');

  // 点数状況（各家タブ管理）
  const [scores, setScores] = useState<Record<'東家' | '南家' | '西家' | '北家', number>>({
    東家: 25000,
    南家: 25000,
    西家: 25000,
    北家: 25000,
  });

  // 捨て牌・鳴き・リーチ（各家タブ管理）
  const [activeRiverWind, setActiveRiverWind] = useState<'東家' | '南家' | '西家' | '北家'>('東家');
  const [riverDiscards, setRiverDiscards] = useState<Record<'東家' | '南家' | '西家' | '北家', DiscardTile[]>>({
    東家: [],
    南家: [],
    西家: [],
    北家: [],
  });
  const [riverMelds, setRiverMelds] = useState<Record<'東家' | '南家' | '西家' | '北家', string[]>>({
    東家: [],
    南家: [],
    西家: [],
    北家: [],
  });
  const [riverReach, setRiverReach] = useState<Record<'東家' | '南家' | '西家' | '北家', boolean>>({
    東家: false,
    南家: false,
    西家: false,
    北家: false,
  });
  const [discardMode, setDiscardMode] = useState<'tedashi' | 'tsumogiri'>('tsumogiri');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  // 写真選択ハンドラー（自動圧縮）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      setUploadedImage(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('写真の読み込みに失敗しました。別の形式の画像を試してください。');
    } finally {
      setIsCompressing(false);
    }
  };

  // 使用済み牌の全体リスト（ドラ最大5枚 + 手牌）
  const usedTilesInHandAndDora = [...doraList, ...hand];

  // パレットの各牌が使用可能か判定（ドラ含め4枚制限、赤牌1枚制限）
  const checkTileAvailability = (tileId: string) => {
    return canAddTileValidation(usedTilesInHandAndDora, tileId);
  };

  // 手牌に牌を追加（4枚制限バリデーション付き）
  const handleAddTile = (tileId: string) => {
    if (hand.length >= 14) return;

    const validation = checkTileAvailability(tileId);
    if (!validation.canAdd) {
      alert(validation.reason || 'この牌はこれ以上追加できません。');
      return;
    }

    const newHand = [...hand, tileId];
    setHand(autoSort ? sortTiles(newHand) : newHand);
  };

  // 手牌から牌を削除
  const handleRemoveTile = (indexToRemove: number) => {
    setHand((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // 手動理牌
  const handleSort = () => {
    setHand(sortTiles(hand));
  };

  // 点数のクイック増減
  const handleAdjustScore = (w: '東家' | '南家' | '西家' | '北家', delta: number) => {
    setScores((prev) => ({
      ...prev,
      [w]: Math.max(0, prev[w] + delta),
    }));
  };

  // 捨て牌を追加
  const handleAddDiscardToRiver = (tileId: string) => {
    const isTsumogiri = discardMode === 'tsumogiri';
    const newTile: DiscardTile = {
      tileId,
      isTsumogiri,
    };
    setRiverDiscards((prev) => ({
      ...prev,
      [activeRiverWind]: [...prev[activeRiverWind], newTile],
    }));
  };

  // 捨て牌のツモ切り/手出しトグル
  const handleToggleDiscardTsumogiri = (index: number) => {
    setRiverDiscards((prev) => {
      const list = [...prev[activeRiverWind]];
      list[index] = {
        ...list[index],
        isTsumogiri: !list[index].isTsumogiri,
      };
      return { ...prev, [activeRiverWind]: list };
    });
  };

  // 捨て牌のリーチ宣言牌トグル
  const handleToggleDiscardReach = (index: number) => {
    setRiverDiscards((prev) => {
      const list = [...prev[activeRiverWind]];
      list[index] = {
        ...list[index],
        isReach: !list[index].isReach,
      };
      return { ...prev, [activeRiverWind]: list };
    });
  };

  // 捨て牌を1枚削除
  const handleRemoveDiscard = (index: number) => {
    setRiverDiscards((prev) => ({
      ...prev,
      [activeRiverWind]: prev[activeRiverWind].filter((_, i) => i !== index),
    }));
  };

  // 鳴きを追加
  const handleAddMeld = (windKey: '東家' | '南家' | '西家' | '北家') => {
    const promptVal = prompt('鳴いた牌を入力してください（例: 7z-7z-7z, 1m-2m-3m, 發ポン, 123p）:');
    if (promptVal && promptVal.trim()) {
      setRiverMelds((prev) => ({
        ...prev,
        [windKey]: [...prev[windKey], promptVal.trim()],
      }));
    }
  };

  // プリセットから鳴きを追加
  const handleAddPresetMeld = (windKey: '東家' | '南家' | '西家' | '北家', meldCode: string) => {
    setRiverMelds((prev) => ({
      ...prev,
      [windKey]: [...prev[windKey], meldCode],
    }));
  };

  // 鳴きを削除
  const handleRemoveMeld = (windKey: '東家' | '南家' | '西家' | '北家', index: number) => {
    setRiverMelds((prev) => ({
      ...prev,
      [windKey]: prev[windKey].filter((_, i) => i !== index),
    }));
  };

  // 送信処理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (postMode === 'tiles') {
      if (hand.length !== 14) {
        alert(`手牌はツモ牌を含めてちょうど14枚選んでください！（現在 ${hand.length}枚）`);
        return;
      }
    } else {
      if (!uploadedImage) {
        alert('対局のスクリーンショットや手牌の写真をアップロードしてください！');
        return;
      }
    }

    if (!bestDiscard) {
      alert('正解（本命の打牌）を選択してください！');
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

    const scoreInfoText = WINDS.map((w) => `${w}${w === wind ? '(自分)' : ''}: ${scores[w].toLocaleString()}`).join(' / ');

    const reachPlayers = WINDS.filter((w) => riverReach[w]);
    let discardsInfoSummary = '';
    if (reachPlayers.length > 0) {
      discardsInfoSummary += reachPlayers.map((w) => `${w}からリーチ中`).join('、') + '。';
    }
    const meldPlayers = WINDS.filter((w) => riverMelds[w].length > 0);
    if (meldPlayers.length > 0) {
      discardsInfoSummary += meldPlayers.map((w) => `${w}副露: [${riverMelds[w].join(', ')}]`).join('、') + '。';
    }

    const playersMap: Record<string, PlayerSituation> = {};
    for (const w of WINDS) {
      playersMap[w] = {
        wind: w,
        score: scores[w],
        discards: riverDiscards[w],
        melds: riverMelds[w],
        isReach: riverReach[w],
      };
    }

    const newProblem: Problem = {
      id: `prob-user-${Date.now()}`,
      title: title || `【${level === 'beginner' ? '初級' : level === 'intermediate' ? '中級' : '上級'}】迷った一打`,
      level,
      imageUrl: postMode === 'photo' && uploadedImage ? uploadedImage : undefined,
      context: {
        round,
        honba: Number(honba) || 0,
        turn: Number(turn),
        wind,
        dora: doraList[0] || '5m',
        doras: doraList,
        score: scores[wind],
        scores,
        players: playersMap,
        scoreInfo: scoreInfoText,
        discardsInfo: (discardsInfoSummary + ' ' + note).trim() || undefined,
        note: note.trim() || undefined,
      },
      hand: postMode === 'tiles' ? sortTiles(hand) : hand,
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

  // 各牌の残り枚数（ドラ含め4枚中、あと何枚使えるか）
  const getRemainingCount = (tileId: string) => {
    const isRed = tileId === '0m' || tileId === '0p' || tileId === '0s';
    if (isRed) {
      return 1 - countExactTile(usedTilesInHandAndDora, tileId);
    }
    const sameUsed = countSameTileType(usedTilesInHandAndDora, tileId);
    return Math.max(0, 4 - sameUsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 my-6 max-h-[92vh] overflow-y-auto">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b pb-3.5 mb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs">
              +
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              何切る問題を投稿する
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-2xl font-bold leading-none cursor-pointer p-1"
          >
            &times;
          </button>
        </div>

        {/* 投稿モード切り替えタブ */}
        <div className="inline-flex w-full p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl mb-4 gap-1 border border-slate-200/80 dark:border-zinc-700/60">
          <button
            type="button"
            onClick={() => setPostMode('tiles')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              postMode === 'tiles'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <span>🀄 牌パレット入力</span>
          </button>
          <button
            type="button"
            onClick={() => setPostMode('photo')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              postMode === 'photo'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <span>📷 写真・スクショ投稿</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 写真投稿モード時の画像アップロードUI */}
          {postMode === 'photo' && (
            <div className="p-5 bg-blue-50/40 dark:bg-blue-950/20 border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-2xl text-center space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploadedImage ? (
                <div className="space-y-2">
                  <div className="relative max-h-64 overflow-hidden rounded-xl border border-slate-300 dark:border-zinc-700 mx-auto inline-block shadow-md">
                    <img
                      src={uploadedImage}
                      alt="投稿写真プレビュー"
                      className="max-h-64 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors shadow-sm"
                    >
                      写真を変更
                    </button>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ 写真の読み込みが完了しました（自動軽量化済み）
                  </p>
                </div>
              ) : (
                <div className="py-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xl mx-auto">
                    📷
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    対局画面のスクリーンショットや手牌の写真をアップロード
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                    雀魂、天鳳、Mリーグ、雀荘での写真など、1枚の画像で即座に出題できます
                  </p>
                  <button
                    type="button"
                    disabled={isCompressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {isCompressing ? '写真を圧縮中...' : '写真・画像を選択する'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* タイトルと難易度 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                問題タイトル
              </label>
              <input
                type="text"
                placeholder="例: オーラスの逆転手：打点 vs スピード"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                対象難易度
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProblemLevel)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="beginner">初級（基本牌効率）</option>
                <option value="intermediate">中級（手役・点差）</option>
                <option value="advanced">上級（押し引き・状況判断）</option>
              </select>
            </div>
          </div>

          {/* 局況設定 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">局</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="東1局"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">本場</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={honba}
                  onChange={(e) => setHonba(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold text-center font-mono"
                />
                <span className="text-xs text-slate-500 shrink-0 font-medium">本場</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">巡目</label>
              <input
                type="number"
                min={1}
                max={18}
                value={turn}
                onChange={(e) => setTurn(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold text-center font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">自家（自分）</label>
              <select
                value={wind}
                onChange={(e) => setWind(e.target.value as any)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold"
              >
                <option value="東家">東家（親）</option>
                <option value="南家">南家</option>
                <option value="西家">西家</option>
                <option value="北家">北家</option>
              </select>
            </div>
          </div>

          {/* ドラ表示牌（最大5枚：表ドラ ＋ 槓ドラ） */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>🀄 ドラ表示牌</span>
                <span className="text-[10px] font-normal text-slate-400">（最大5枚・槓ドラ対応）</span>
              </span>
              {doraList.length < 5 && (
                <button
                  type="button"
                  onClick={() => setDoraList((prev) => [...prev, '1m'])}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>+</span>
                  <span>ドラ追加（{doraList.length}/5）</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {doraList.map((dt, idx) => (
                <div
                  key={`dora-slot-${idx}`}
                  className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs"
                >
                  <MahjongTile tileId={dt} size="sm" disabled />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500 font-bold">
                      {idx === 0 ? '表ドラ' : `槓ドラ${idx}`}
                    </span>
                    <select
                      value={dt}
                      onChange={(e) => {
                        const updated = [...doraList];
                        updated[idx] = e.target.value;
                        setDoraList(updated);
                      }}
                      className="text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                    >
                      {ALL_TILES.map((t) => (
                        <option key={`dora-opt-${idx}-${t}`} value={t}>
                          {getTileDisplay(t).topText}
                          {getTileDisplay(t).bottomText} ({t})
                        </option>
                      ))}
                    </select>
                  </div>
                  {doraList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDoraList((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 p-1 text-xs font-bold cursor-pointer transition-colors"
                      title="このドラ表示牌を削除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 実戦状況の精密設定（点数状況タブ ＆ 河タブ） */}
          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-800/30">
            <button
              type="button"
              onClick={() => setShowAdvancedContext(!showAdvancedContext)}
              className="w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="text-slate-900 dark:text-zinc-100">
                  実戦状況の精密設定（各家の点数・河・鳴き）
                </span>
                <span className="text-[10px] text-slate-400 font-normal">（任意）</span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {showAdvancedContext ? '▲ 閉じる' : '▼ 各家の点数・河を設定する'}
              </span>
            </button>

            {showAdvancedContext && (
              <div className="p-3.5 space-y-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80">
                {/* サブタブ切替 */}
                <div className="flex border-b border-slate-200 dark:border-zinc-800 pb-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveContextSubTab('scores')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeContextSubTab === 'scores'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    📊 各家の点数状況
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveContextSubTab('river')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeContextSubTab === 'river'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    🀁 各家の河（6枚×3段）・鳴き
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveContextSubTab('note')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeContextSubTab === 'note'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    📝 戦況補足メモ
                  </button>
                </div>

                {/* 1. 各家の点数状況設定 */}
                {activeContextSubTab === 'scores' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-500">
                      各家の持ち点を設定してください。自分の順位や点差が自動計算されます。
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {WINDS.map((w) => {
                        const isSelf = w === wind;
                        const scoreDiff = scores[w] - scores[wind];
                        return (
                          <div
                            key={`score-${w}`}
                            className={`p-2.5 rounded-xl border ${
                              isSelf
                                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                {w} {isSelf && <span className="text-[10px] text-blue-600 font-bold">(自分)</span>}
                              </span>
                              {!isSelf && (
                                <span className={`text-[10px] font-mono ${scoreDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {scoreDiff >= 0 ? `+${scoreDiff.toLocaleString()}` : scoreDiff.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              step={100}
                              value={scores[w]}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [w]: Number(e.target.value) || 0,
                                }))
                              }
                              className="w-full text-xs font-mono font-bold p-1.5 rounded border border-slate-300 dark:border-zinc-600 dark:bg-zinc-800"
                            />
                            <div className="flex gap-1 mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleAdjustScore(w, 1000)}
                                className="flex-1 text-[10px] bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 py-0.5 rounded cursor-pointer"
                              >
                                +1k
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustScore(w, -1000)}
                                className="flex-1 text-[10px] bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 py-0.5 rounded cursor-pointer"
                              >
                                -1k
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. 各家の捨て牌（6枚×3段の河）・鳴き設定 */}
                {activeContextSubTab === 'river' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex gap-1.5">
                        {WINDS.map((w) => (
                          <button
                            key={`river-tab-${w}`}
                            type="button"
                            onClick={() => setActiveRiverWind(w)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              activeRiverWind === w
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                            }`}
                          >
                            {w} {w === wind ? '(自分)' : ''}
                            {riverReach[w] && <span className="ml-1 text-[9px] text-rose-500 font-bold">立直</span>}
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-rose-600">
                        <input
                          type="checkbox"
                          checked={riverReach[activeRiverWind]}
                          onChange={(e) =>
                            setRiverReach((prev) => ({
                              ...prev,
                              [activeRiverWind]: e.target.checked,
                            }))
                          }
                          className="rounded text-rose-600"
                        />
                        この家がリーチ中
                      </label>
                    </div>

                    {/* 捨て牌モード切替 */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-lg text-xs">
                      <span className="text-slate-500 font-bold">打牌の属性:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDiscardMode('tedashi')}
                          className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                            discardMode === 'tedashi'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                          }`}
                        >
                          ✋ 手出し
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscardMode('tsumogiri')}
                          className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                            discardMode === 'tsumogiri'
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                          }`}
                        >
                          🔄 ツモ切り
                        </button>
                      </div>
                    </div>

                    {/* 河コンポーネント */}
                    <MahjongRiver
                      discards={riverDiscards[activeRiverWind]}
                      melds={riverMelds[activeRiverWind]}
                      windLabel={activeRiverWind}
                      isReach={riverReach[activeRiverWind]}
                      interactive
                      onToggleTsumogiri={handleToggleDiscardTsumogiri}
                      onRemoveTile={handleRemoveDiscard}
                      onToggleReach={handleToggleDiscardReach}
                      onRemoveMeld={(mIdx) => handleRemoveMeld(activeRiverWind, mIdx)}
                    />

                    {/* 鳴き牌（副露）設定 */}
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-750 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                            鳴き牌（副露）:
                          </span>
                          {riverMelds[activeRiverWind].length === 0 ? (
                            <span className="text-xs text-slate-400">なし（門前）</span>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                              {riverMelds[activeRiverWind].length}件登録中
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddMeld(activeRiverWind)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          + 自由入力で追加
                        </button>
                      </div>

                      {/* クイック役牌ポン・チーボタン */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-700/50">
                        <span className="text-[10px] text-slate-500 font-medium">クイック追加:</span>
                        {[
                          { label: '中ポン', code: '7z-7z-7z' },
                          { label: '發ポン', code: '6z-6z-6z' },
                          { label: '白ポン', code: '5z-5z-5z' },
                          { label: '東ポン', code: '1z-1z-1z' },
                          { label: '南ポン', code: '2z-2z-2z' },
                          { label: '123mチー', code: '1m-2m-3m' },
                          { label: '789pチー', code: '7p-8p-9p' },
                        ].map((m) => (
                          <button
                            key={`quick-meld-${m.label}`}
                            type="button"
                            onClick={() => handleAddPresetMeld(activeRiverWind, m.code)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                          >
                            + {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 河用クイック追加パレット */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-500 mb-1 block">
                        河に追加する牌をタップ（{discardMode === 'tsumogiri' ? '🔄 ツモ切り' : '✋ 手出し'}）:
                      </span>
                      <div className="flex flex-wrap gap-1 p-2 bg-slate-50 dark:bg-zinc-800/40 rounded-lg max-h-24 overflow-y-auto">
                        {ALL_TILES.map((t) => (
                          <button
                            key={`quick-river-${t}`}
                            type="button"
                            onClick={() => handleAddDiscardToRiver(t)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded hover:border-blue-500 cursor-pointer"
                          >
                            {getTileDisplay(t).topText}{getTileDisplay(t).bottomText}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 戦況補足メモ */}
                {activeContextSubTab === 'note' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                      戦況メモ（例: 対面が早めの萬子染め手、上家は安牌を手出し中）
                    </label>
                    <textarea
                      rows={2}
                      placeholder="特筆すべき他家の動きや場の警戒事項を入力してください"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 手牌パレット作成モード時の手牌表示 */}
          {postMode === 'tiles' && (
            <>
              {/* 現在選択中の手牌 (14枚) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      選択した手牌 ({hand.length} / 14枚)
                    </label>
                    <span className="text-[10px] text-slate-400">※タップで削除</span>
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
                        className="text-xs text-rose-500 hover:underline cursor-pointer"
                      >
                        全消去
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-16 pt-3 pb-2.5 px-3 bg-slate-100/80 dark:bg-zinc-800 rounded-xl flex items-center justify-start gap-1 overflow-x-auto border-2 border-dashed border-slate-300 dark:border-zinc-700">
                  {hand.length === 0 ? (
                    <span className="text-xs text-slate-400 mx-auto py-3">
                      下のパレットから牌をタップして14枚選んでください（ドラ含め同牌4枚まで）
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

              {/* 牌パレット */}
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      牌パレット（クリックで手牌に追加）
                    </span>
                    <span className="text-[10px] text-slate-400">※ドラ表示牌を含め最大4枚まで</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
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
                    <span className="text-[10px] font-bold text-rose-600 w-5 shrink-0">萬</span>
                    <div className="flex gap-1">
                      {MAN_TILES.map((t) => {
                        const remaining = getRemainingCount(t);
                        const isDisabled = remaining <= 0;
                        return (
                          <div key={`pal-${t}`} className="relative">
                            <MahjongTile
                              tileId={t}
                              size="xs"
                              disabled={isDisabled}
                              isUnavailable={isDisabled}
                              onClick={() => handleAddTile(t)}
                            />
                            {remaining <= 1 && (
                              <span
                                className={`absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded-full ${
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-500 text-white'
                                }`}
                              >
                                残{remaining}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 筒子 */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    <span className="text-[10px] font-bold text-blue-600 w-5 shrink-0">筒</span>
                    <div className="flex gap-1">
                      {PIN_TILES.map((t) => {
                        const remaining = getRemainingCount(t);
                        const isDisabled = remaining <= 0;
                        return (
                          <div key={`pal-${t}`} className="relative">
                            <MahjongTile
                              tileId={t}
                              size="xs"
                              disabled={isDisabled}
                              isUnavailable={isDisabled}
                              onClick={() => handleAddTile(t)}
                            />
                            {remaining <= 1 && (
                              <span
                                className={`absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded-full ${
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-500 text-white'
                                }`}
                              >
                                残{remaining}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 索子 */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    <span className="text-[10px] font-bold text-emerald-600 w-5 shrink-0">索</span>
                    <div className="flex gap-1">
                      {SOU_TILES.map((t) => {
                        const remaining = getRemainingCount(t);
                        const isDisabled = remaining <= 0;
                        return (
                          <div key={`pal-${t}`} className="relative">
                            <MahjongTile
                              tileId={t}
                              size="xs"
                              disabled={isDisabled}
                              isUnavailable={isDisabled}
                              onClick={() => handleAddTile(t)}
                            />
                            {remaining <= 1 && (
                              <span
                                className={`absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded-full ${
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-500 text-white'
                                }`}
                              >
                                残{remaining}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 字牌 */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 w-5 shrink-0">字</span>
                    <div className="flex gap-1">
                      {ZI_TILES.map((t) => {
                        const remaining = getRemainingCount(t);
                        const isDisabled = remaining <= 0;
                        return (
                          <div key={`pal-${t}`} className="relative">
                            <MahjongTile
                              tileId={t}
                              size="xs"
                              disabled={isDisabled}
                              isUnavailable={isDisabled}
                              onClick={() => handleAddTile(t)}
                            />
                            {remaining <= 1 && (
                              <span
                                className={`absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded-full ${
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-500 text-white'
                                }`}
                              >
                                残{remaining}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 正解の打牌設定 */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
              正解（出題者が推奨する本命打牌）
            </label>

            {postMode === 'tiles' ? (
              hand.length === 0 ? (
                <p className="text-xs text-slate-400">
                  先に上のパレットから手牌を選んでください
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {Array.from(new Set(hand)).map((tId) => {
                    const isSelected = bestDiscard === tId;
                    const disp = getTileDisplay(tId);
                    return (
                      <button
                        key={`best-${tId}`}
                        type="button"
                        onClick={() => setBestDiscard(tId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-105'
                            : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-emerald-400'
                        }`}
                      >
                        <span className={disp.suitColor}>{disp.topText}</span>
                        <span>{disp.bottomText}</span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  写真の中の手牌から、正解とする打牌を選択してください:
                </p>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700">
                  {ALL_TILES.map((tId) => {
                    const isSelected = bestDiscard === tId;
                    const disp = getTileDisplay(tId);
                    return (
                      <button
                        key={`photo-best-${tId}`}
                        type="button"
                        onClick={() => setBestDiscard(tId)}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 scale-105 shadow-2xs'
                            : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        <span className={disp.suitColor}>{disp.topText}</span>
                        <span>{disp.bottomText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                本命打牌のひとこと理由
              </label>
              <input
                type="text"
                placeholder="例: 最大受け入れの28枚、手変わりでピンフ一盃口"
                value={bestReason}
                onChange={(e) => setBestReason(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 解説と出題者名 */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                詳しい戦術解説
              </label>
              <textarea
                rows={3}
                placeholder="他の打牌との比較や、巡目・点差を踏まえた戦術的な解説を入力してください"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                出題者のお名前（ペンネーム）
              </label>
              <input
                type="text"
                placeholder="名無しの雀士"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* フッターアクションボタン */}
          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              この内容で問題を公開する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
