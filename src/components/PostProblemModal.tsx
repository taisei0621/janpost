'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Problem,
  ProblemLevel,
  ProblemType,
  RecommendedDiscard,
  DiscardTile,
  PlayerSituation,
  MeldInfo,
  MeldType,
  MeldFrom,
  MeldOption,
} from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { MahjongRiver } from './MahjongRiver';
import { compressImage } from '../utils/imageUtils';
import {
  getTileDisplay,
  sortTiles,
  canAddTileValidation,
  countSameTileType,
  countExactTile,
  parseMeldDisplay,
  calculateAvailableMeldOptions,
} from '../utils/mahjongUtils';

interface PostProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (newProblem: Problem) => void;
}

// 牌グループ定義
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
  // 問題タイプ: 何切る問題 or 鳴くか問題
  const [problemType, setProblemType] = useState<ProblemType>('discard');

  // 投稿方式: 牌パレット入力 or 写真・スクショ
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

  // 鳴くか問題用の設定
  const [meldTargetFrom, setMeldTargetFrom] = useState<'東家' | '南家' | '西家' | '北家'>('東家');
  const [meldTargetTile, setMeldTargetTile] = useState<string>('5m');
  const [meldBestAction, setMeldBestAction] = useState<string>('pass');

  // 詳細戦況（アコーディオン）
  const [showAdvancedContext, setShowAdvancedContext] = useState(false);
  const [activeContextSubTab, setActiveContextSubTab] = useState<'scores' | 'river' | 'note'>('river');

  // 点数状況（各家管理）
  const [scores, setScores] = useState<Record<'東家' | '南家' | '西家' | '北家', number>>({
    東家: 25000,
    南家: 25000,
    西家: 25000,
    北家: 25000,
  });

  // 捨て牌・鳴き・リーチ（各家管理）
  const [activeRiverWind, setActiveRiverWind] = useState<'東家' | '南家' | '西家' | '北家'>('東家');
  const [riverDiscards, setRiverDiscards] = useState<Record<'東家' | '南家' | '西家' | '北家', DiscardTile[]>>({
    東家: [],
    南家: [],
    西家: [],
    北家: [],
  });
  const [riverMelds, setRiverMelds] = useState<Record<'東家' | '南家' | '西家' | '北家', Array<string | MeldInfo>>>({
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

  // 鳴き作成パレット用モーダル・ステート
  const [isMeldBuilderOpen, setIsMeldBuilderOpen] = useState(false);
  const [meldBuilderWind, setMeldBuilderWind] = useState<'東家' | '南家' | '西家' | '北家'>('南家');
  const [meldBuilderType, setMeldBuilderType] = useState<MeldType>('pon');
  const [meldBuilderFrom, setMeldBuilderFrom] = useState<MeldFrom>('kami');
  const [meldBuilderTiles, setMeldBuilderTiles] = useState<string[]>([]);

  // 自家（自分）の副露数
  const myMeldCount = riverMelds[wind]?.length || 0;

  // 手牌の目標枚数の計算
  // 何切る問題: 0副露=14枚, 1副露=11枚, 2副露=8枚, 3副露=5枚, 4副露=2枚
  // 鳴くか問題: 鳴く直前なので1枚少ない (0副露=13枚, 1副露=10枚, 2副露=7枚, 3副露=4枚, 4副露=1枚)
  const targetHandCount = useMemo(() => {
    if (problemType === 'meld') {
      return Math.max(1, 13 - myMeldCount * 3);
    }
    return Math.max(2, 14 - myMeldCount * 3);
  }, [problemType, myMeldCount]);

  // 自家の副露数や手牌枚数が変化した際、上限を超えていれば切り詰める
  useEffect(() => {
    if (postMode === 'tiles' && hand.length > targetHandCount) {
      setHand((prev) => prev.slice(0, targetHandCount));
    }
  }, [targetHandCount, postMode]);

  // 鳴くか問題の可能な選択肢を自動計算
  const calculatedMeldOptions = useMemo(() => {
    if (problemType !== 'meld') return [];
    return calculateAvailableMeldOptions(hand, meldTargetTile, meldTargetFrom, wind);
  }, [problemType, hand, meldTargetTile, meldTargetFrom, wind]);

  // 選択肢が更新されたら、正解選択肢をデフォルト設定
  useEffect(() => {
    if (problemType === 'meld' && calculatedMeldOptions.length > 0) {
      if (!calculatedMeldOptions.some((o) => o.id === meldBestAction)) {
        setMeldBestAction(calculatedMeldOptions[0].id);
      }
    }
  }, [problemType, calculatedMeldOptions, meldBestAction]);

  if (!isOpen) return null;

  // 写真選択ハンドラー
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

  // 全体で使用中の牌（ドラ＋手牌＋各家の副露）
  const allUsedTiles = [
    ...doraList,
    ...hand,
    ...(problemType === 'meld' ? [meldTargetTile] : []),
    ...Object.values(riverMelds).flatMap((mList) =>
      mList.flatMap((m) => {
        if (typeof m === 'object' && m !== null && 'tiles' in m) return m.tiles;
        const parsed = parseMeldDisplay(m);
        return parsed.tiles.map((t) => t.tileId);
      })
    ),
  ];

  const checkTileAvailability = (tileId: string) => {
    return canAddTileValidation(allUsedTiles, tileId);
  };

  const handleAddTile = (tileId: string) => {
    if (hand.length >= targetHandCount) return;

    const validation = checkTileAvailability(tileId);
    if (!validation.canAdd) {
      alert(validation.reason || 'この牌はこれ以上追加できません。');
      return;
    }

    const newHand = [...hand, tileId];
    setHand(autoSort ? sortTiles(newHand) : newHand);
  };

  const handleRemoveTile = (indexToRemove: number) => {
    setHand((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSort = () => {
    setHand(sortTiles(hand));
  };

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

  const handleRemoveDiscard = (index: number) => {
    setRiverDiscards((prev) => ({
      ...prev,
      [activeRiverWind]: prev[activeRiverWind].filter((_, i) => i !== index),
    }));
  };

  // 鳴き作成パレットを開く
  const handleOpenMeldBuilder = (windKey: '東家' | '南家' | '西家' | '北家') => {
    setMeldBuilderWind(windKey);
    setMeldBuilderType('pon');
    setMeldBuilderFrom('kami');
    setMeldBuilderTiles([]);
    setIsMeldBuilderOpen(true);
  };

  // 鳴き作成パレット内で牌をタップ
  const handleMeldBuilderAddTile = (tileId: string) => {
    const maxLen = meldBuilderType === 'ankan' || meldBuilderType === 'daiminkan' ? 4 : 3;
    if (meldBuilderTiles.length >= maxLen) return;

    const validation = checkTileAvailability(tileId);
    if (!validation.canAdd) {
      alert(validation.reason || 'この牌は追加できません。');
      return;
    }
    setMeldBuilderTiles([...meldBuilderTiles, tileId]);
  };

  const handleMeldBuilderRemoveTile = (idx: number) => {
    setMeldBuilderTiles(meldBuilderTiles.filter((_, i) => i !== idx));
  };

  // 鳴きパレットから副露を追加確定
  const handleConfirmMeldBuilder = () => {
    const reqLen = meldBuilderType === 'ankan' || meldBuilderType === 'daiminkan' ? 4 : 3;
    if (meldBuilderTiles.length !== reqLen) {
      alert(`牌を${reqLen}枚選択してください！（現在 ${meldBuilderTiles.length}枚）`);
      return;
    }

    const fromLabel = meldBuilderFrom === 'self' ? '暗槓' : meldBuilderFrom === 'kami' ? '上家から' : meldBuilderFrom === 'toimen' ? '対面から' : '下家から';
    const typeLabel = meldBuilderType === 'chi' ? 'チー' : meldBuilderType === 'pon' ? 'ポン' : 'カン';

    const newMeld: MeldInfo = {
      type: meldBuilderType,
      from: meldBuilderFrom,
      tiles: [...meldBuilderTiles],
      label: `${fromLabel}${typeLabel}`,
    };

    setRiverMelds((prev) => ({
      ...prev,
      [meldBuilderWind]: [...prev[meldBuilderWind], newMeld],
    }));

    setIsMeldBuilderOpen(false);
    setMeldBuilderTiles([]);
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
      if (hand.length !== targetHandCount) {
        alert(
          problemType === 'discard'
            ? `手牌はちょうど ${targetHandCount}枚 選んでください！（副露 ${myMeldCount}回のため。現在 ${hand.length}枚）`
            : `手牌はちょうど ${targetHandCount}枚 選んでください！（他家打牌の直前・副露 ${myMeldCount}回のため。現在 ${hand.length}枚）`
        );
        return;
      }
    } else {
      if (!uploadedImage) {
        alert('対局のスクリーンショットや手牌の写真をアップロードしてください！');
        return;
      }
    }

    // 何切る問題の場合の打牌チェック
    if (problemType === 'discard' && !bestDiscard) {
      alert('正解（本命の打牌）を選択してください！');
      return;
    }

    // 鳴くか問題の場合のアクションチェック
    if (problemType === 'meld' && !meldBestAction) {
      alert('正解（推奨する鳴き・スルー判断）を選択してください！');
      return;
    }

    // おすすめ回答の設定
    const bestActionKey = problemType === 'discard' ? bestDiscard : meldBestAction;
    const selectedOptionObj = calculatedMeldOptions.find((o) => o.id === meldBestAction);
    const bestLabel = problemType === 'discard'
      ? '本命打牌'
      : selectedOptionObj?.label || '本命判断';

    const discards: RecommendedDiscard[] = [
      {
        tileId: bestActionKey,
        rank: 'best',
        label: bestLabel,
        reason: bestReason || (problemType === 'discard' ? '受け入れ枚数最大または最も効率的な一打です。' : '状況に即した最適な鳴き・スルー判断です。'),
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
      discardsInfoSummary += meldPlayers.map((w) => `${w}副露: ${riverMelds[w].length}件`).join('、') + '。';
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

    const defaultTitle = problemType === 'discard'
      ? `【${level === 'beginner' ? '初級' : level === 'intermediate' ? '中級' : '上級'}】迷った一打`
      : `【${level === 'beginner' ? '初級' : level === 'intermediate' ? '中級' : '上級'}】鳴くか判断：${meldTargetFrom}から${getTileDisplay(meldTargetTile).topText}${getTileDisplay(meldTargetTile).bottomText}`;

    const newProblem: Problem = {
      id: `prob-user-${Date.now()}`,
      title: title || defaultTitle,
      level,
      problemType,
      meldTarget: problemType === 'meld' ? { fromWind: meldTargetFrom, tileId: meldTargetTile } : undefined,
      meldOptions: problemType === 'meld' ? calculatedMeldOptions : undefined,
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
      explanation: explanation || '出題者による解説はありません。',
      author: author || '名無しの雀士',
      createdAt: new Date().toISOString().split('T')[0],
      stats: {
        [bestActionKey]: 1,
      },
      comments: [],
    };

    onAddProblem(newProblem);
    onClose();
  };

  const getRemainingCount = (tileId: string) => {
    const isRed = tileId === '0m' || tileId === '0p' || tileId === '0s';
    if (isRed) {
      return 1 - countExactTile(allUsedTiles, tileId);
    }
    const sameUsed = countSameTileType(allUsedTiles, tileId);
    return Math.max(0, 4 - sameUsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FBF9F4] w-full max-w-3xl rounded-2xl shadow-2xl border-2 border-[#C82C26] p-5 sm:p-6 my-6 max-h-[92vh] overflow-y-auto relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 airmail-stripe rounded-t-2xl" />

        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b border-[#D5CEBE] pb-3.5 mb-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#C82C26] text-white flex items-center justify-center font-bold text-sm font-serif shadow-xs">
              〒
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#262422] font-serif">
                何切る問題を投函する
              </h2>
              <p className="text-[10px] text-[#7A7265]">
                手牌や対局写真から何切る問題・鳴くか問題を作成して投函できます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#7A7265] hover:text-[#C82C26] text-2xl font-bold leading-none cursor-pointer p-1"
          >
            &times;
          </button>
        </div>

        {/* 1. 問題タイプの選択（何切る問題 vs 鳴くか問題） */}
        <div className="mb-4 p-2 bg-[#F8F5EC] rounded-xl border border-[#D5CEBE]">
          <span className="block text-xs font-bold text-[#262422] mb-1.5 font-serif">
            問題の形式を選択:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProblemType('discard')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                problemType === 'discard'
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm'
                  : 'bg-[#FBF9F4] text-[#5C5549] border-[#D5CEBE] hover:border-[#1E3A5F]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <span>🀄</span>
                <span>何切る問題</span>
              </div>
              <span className={`text-[10px] ${problemType === 'discard' ? 'text-zinc-200' : 'text-[#7A7265]'}`}>
                手牌から切る牌を選択する定番問題
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProblemType('meld')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                problemType === 'meld'
                  ? 'bg-[#C82C26] text-white border-[#C82C26] shadow-sm'
                  : 'bg-[#FBF9F4] text-[#5C5549] border-[#D5CEBE] hover:border-[#C82C26]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <span>⚡</span>
                <span>鳴くか問題（チー/ポン/スルー）</span>
              </div>
              <span className={`text-[10px] ${problemType === 'meld' ? 'text-zinc-200' : 'text-[#7A7265]'}`}>
                他家の捨て牌を鳴くかスルーするかを問う
              </span>
            </button>
          </div>
        </div>

        {/* 2. 投稿方式切替（牌パレット vs 写真・スクショ） */}
        <div className="inline-flex w-full p-1 bg-[#EAE4D7] rounded-xl mb-4 gap-1 border border-[#D5CEBE]">
          <button
            type="button"
            onClick={() => setPostMode('tiles')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              postMode === 'tiles'
                ? 'bg-[#FBF9F4] text-[#262422] shadow-xs border border-[#D5CEBE]'
                : 'text-[#5C5549] hover:text-[#262422]'
            }`}
          >
            <span>🀄 牌パレット入力</span>
          </button>
          <button
            type="button"
            onClick={() => setPostMode('photo')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              postMode === 'photo'
                ? 'bg-[#FBF9F4] text-[#262422] shadow-xs border border-[#D5CEBE]'
                : 'text-[#5C5549] hover:text-[#262422]'
            }`}
          >
            <span>📷 写真・スクショ投稿</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 写真投稿モード時の画像アップロードUI */}
          {postMode === 'photo' && (
            <div className="p-5 bg-[#F8F5EC] border-2 border-dashed border-[#1E3A5F]/40 rounded-2xl text-center space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploadedImage ? (
                <div className="space-y-2">
                  <div className="relative max-h-64 overflow-hidden rounded-xl border-2 border-[#D5CEBE] mx-auto inline-block shadow-md bg-white p-1">
                    <img
                      src={uploadedImage}
                      alt="投稿写真プレビュー"
                      className="max-h-64 object-contain mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors shadow-sm font-serif"
                    >
                      写真を変更
                    </button>
                  </div>
                  <p className="text-xs text-[#124D27] font-bold font-serif">
                    ✓ 写真の読み込みが完了しました（自動軽量化済み）
                  </p>
                </div>
              ) : (
                <div className="py-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#E8EFF7] text-[#1E3A5F] flex items-center justify-center text-xl mx-auto border border-[#1E3A5F]/20">
                    📷
                  </div>
                  <div className="text-xs font-bold text-[#262422] font-serif">
                    対局画面のスクリーンショットや手牌の写真をアップロード
                  </div>
                  <p className="text-[11px] text-[#7A7265] max-w-sm mx-auto">
                    雀魂、天鳳、Mリーグ、雀荘での写真など、1枚の画像で即座に投函できます
                  </p>
                  <button
                    type="button"
                    disabled={isCompressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-ink mt-2 px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
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
              <label className="block text-xs font-bold text-[#262422] mb-1 font-serif">
                問題タイトル
              </label>
              <input
                type="text"
                placeholder={problemType === 'discard' ? '例: オーラス逆転の一打：打点 vs スピード' : '例: 親リーチへの押し引き：上家の牌をチーするか？'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#262422] mb-1 font-serif">
                対象難易度
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProblemLevel)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
              >
                <option value="beginner">初級</option>
                <option value="intermediate">中級</option>
                <option value="advanced">上級</option>
              </select>
            </div>
          </div>

          {/* 局況設定 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#F8F5EC] p-3 rounded-xl border border-[#D5CEBE]">
            <div>
              <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">局</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="東1局"
                className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] font-bold font-serif text-[#262422]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">本場</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={honba}
                  onChange={(e) => setHonba(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] font-bold text-center font-mono text-[#262422]"
                />
                <span className="text-xs text-[#7A7265] shrink-0 font-medium">本場</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">巡目</label>
              <input
                type="number"
                min={1}
                max={18}
                value={turn}
                onChange={(e) => setTurn(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] font-bold text-center font-mono text-[#262422]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">自家（自分）</label>
              <select
                value={wind}
                onChange={(e) => setWind(e.target.value as any)}
                className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] font-bold font-serif text-[#262422]"
              >
                <option value="東家">東家（親）</option>
                <option value="南家">南家</option>
                <option value="西家">西家</option>
                <option value="北家">北家</option>
              </select>
            </div>
          </div>

          {/* ★ 鳴くか問題専用: 捨てられた牌の設定 */}
          {problemType === 'meld' && (
            <div className="bg-[#FDF4E7] p-3.5 rounded-xl border-2 border-[#C82C26] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C82C26] flex items-center gap-1.5 font-serif">
                  <span>⚡ 鳴き対象牌（他家から出た牌）の設定</span>
                </span>
                <span className="text-[10px] text-[#7A7265]">誰がどの牌を捨てたか</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#5C5549]">捨てた相手:</span>
                  <select
                    value={meldTargetFrom}
                    onChange={(e) => setMeldTargetFrom(e.target.value as any)}
                    className="text-xs p-1.5 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] font-bold text-[#262422]"
                  >
                    {WINDS.filter((w) => w !== wind).map((w) => {
                      const winds = ['東家', '南家', '西家', '北家'];
                      const selfIdx = winds.indexOf(wind);
                      const targetIdx = winds.indexOf(w);
                      const rel = (selfIdx + 3) % 4 === targetIdx ? '上家' : (selfIdx + 2) % 4 === targetIdx ? '対面' : '下家';
                      return (
                        <option key={`mtf-${w}`} value={w}>
                          {w}（{rel}）
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#5C5549]">出た牌:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#D5CEBE] shadow-2xs">
                    <MahjongTile tileId={meldTargetTile} size="sm" disabled />
                    <select
                      value={meldTargetTile}
                      onChange={(e) => setMeldTargetTile(e.target.value)}
                      className="text-xs p-1 rounded border border-[#D5CEBE] bg-[#FBF9F4] font-mono text-[#262422]"
                    >
                      {ALL_TILES.map((t) => (
                        <option key={`mtt-${t}`} value={t}>
                          {getTileDisplay(t).topText}
                          {getTileDisplay(t).bottomText} ({t})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ドラ表示牌（最大5枚：表ドラ ＋ 槓ドラ） */}
          <div className="bg-[#F8F5EC] p-3 rounded-xl border border-[#D5CEBE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#262422] flex items-center gap-1.5 font-serif">
                <span>🀄 ドラ表示牌</span>
                <span className="text-[10px] font-normal text-[#7A7265]">（最大5枚・槓ドラ対応）</span>
              </span>
              {doraList.length < 5 && (
                <button
                  type="button"
                  onClick={() => setDoraList((prev) => [...prev, '1m'])}
                  className="text-xs text-[#1E3A5F] hover:underline font-bold flex items-center gap-1 cursor-pointer font-serif"
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
                  className="flex items-center gap-1.5 bg-[#FBF9F4] p-1.5 rounded-lg border border-[#D5CEBE] shadow-xs"
                >
                  <MahjongTile tileId={dt} size="sm" disabled />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-[#7A7265] font-bold font-serif">
                      {idx === 0 ? '表ドラ' : `槓ドラ${idx}`}
                    </span>
                    <select
                      value={dt}
                      onChange={(e) => {
                        const updated = [...doraList];
                        updated[idx] = e.target.value;
                        setDoraList(updated);
                      }}
                      className="text-xs p-1 rounded border border-[#D5CEBE] bg-[#FBF9F4] font-mono text-[#262422]"
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
                      className="text-[#7A7265] hover:text-[#C82C26] p-1 text-xs font-bold cursor-pointer transition-colors"
                      title="このドラ表示牌を削除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 自家・他家の鳴き牌表示 ＆ 精密戦況設定 */}
          <div className="border border-[#D5CEBE] rounded-xl overflow-hidden bg-[#F8F5EC]">
            <button
              type="button"
              onClick={() => setShowAdvancedContext(!showAdvancedContext)}
              className="w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between text-[#262422] hover:bg-[#EAE4D7] transition-colors cursor-pointer font-serif"
            >
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span>
                  実戦状況の精密設定（各家の点数・河・鳴きパレット作成）
                </span>
                {myMeldCount > 0 && (
                  <span className="text-[10px] bg-[#124D27] text-white px-1.5 py-0.2 rounded font-bold">
                    自分副露: {myMeldCount}回
                  </span>
                )}
              </div>
              <span className="text-xs text-[#1E3A5F] font-bold">
                {showAdvancedContext ? '▲ 閉じる' : '▼ 各家の点数・河・鳴きを設定する'}
              </span>
            </button>

            {showAdvancedContext && (
              <div className="p-3.5 space-y-3.5 border-t border-[#D5CEBE] bg-[#FBF9F4]">
                {/* サブタブ切替 */}
                <div className="flex border-b border-[#D5CEBE] pb-2 gap-2 text-xs font-bold font-serif">
                  <button
                    type="button"
                    onClick={() => setActiveContextSubTab('river')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeContextSubTab === 'river'
                        ? 'bg-[#1E3A5F] text-white'
                        : 'text-[#5C5549] hover:bg-[#EAE4D7]'
                    }`}
                  >
                    🀁 各家の河（6枚×3段）・鳴きパレット
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveContextSubTab('scores')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeContextSubTab === 'scores'
                        ? 'bg-[#1E3A5F] text-white'
                        : 'text-[#5C5549] hover:bg-[#EAE4D7]'
                    }`}
                  >
                    📊 各家の点数状況
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveContextSubTab('note')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeContextSubTab === 'note'
                        ? 'bg-[#1E3A5F] text-white'
                        : 'text-[#5C5549] hover:bg-[#EAE4D7]'
                    }`}
                  >
                    📝 戦況補足メモ
                  </button>
                </div>

                {/* 1. 各家の河 & 鳴きパレット作成 */}
                {activeContextSubTab === 'river' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex gap-1.5">
                        {WINDS.map((w) => (
                          <button
                            key={`river-tab-${w}`}
                            type="button"
                            onClick={() => setActiveRiverWind(w)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer font-serif ${
                              activeRiverWind === w
                                ? 'bg-[#1E3A5F] text-white shadow-xs'
                                : 'bg-[#EAE4D7] text-[#5C5549]'
                            }`}
                          >
                            {w} {w === wind ? '(自分)' : ''}
                            {riverReach[w] && <span className="ml-1 text-[9px] text-[#C82C26] font-bold">立直</span>}
                            {riverMelds[w]?.length > 0 && (
                              <span className="ml-1 text-[9px] bg-amber-600 text-white px-1 rounded-full">
                                {riverMelds[w].length}副露
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-[#C82C26] font-serif">
                        <input
                          type="checkbox"
                          checked={riverReach[activeRiverWind]}
                          onChange={(e) =>
                            setRiverReach((prev) => ({
                              ...prev,
                              [activeRiverWind]: e.target.checked,
                            }))
                          }
                          className="rounded text-[#C82C26]"
                        />
                        この家がリーチ中
                      </label>
                    </div>

                    {/* 鳴き牌（副露）の追加 & パレット起動ボタン */}
                    <div className="p-3 bg-[#F8F5EC] rounded-xl border border-[#D5CEBE] space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#262422] font-serif">
                            {activeRiverWind}の鳴き（副露）:
                          </span>
                          {riverMelds[activeRiverWind].length === 0 ? (
                            <span className="text-xs text-[#7A7265]">門前（なし）</span>
                          ) : (
                            <span className="text-xs text-[#124D27] font-bold font-mono">
                              {riverMelds[activeRiverWind].length}副露中
                              {activeRiverWind === wind ? `（自家の手牌必要枚数は ${targetHandCount}枚 に連動）` : ''}
                            </span>
                          )}
                        </div>

                        {/* ★ パレットで鳴きを作成するボタン */}
                        <button
                          type="button"
                          onClick={() => handleOpenMeldBuilder(activeRiverWind)}
                          className="btn-ink px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span>🀄 パレットで鳴き牌を作成</span>
                        </button>
                      </div>

                      {/* 登録中の鳴き一覧 */}
                      {riverMelds[activeRiverWind].length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {riverMelds[activeRiverWind].map((mItem, mIdx) => {
                            const formatted = parseMeldDisplay(mItem);
                            return (
                              <div
                                key={`m-tag-${mIdx}`}
                                className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-amber-400/60 shadow-2xs"
                              >
                                <span className="text-[10px] font-bold text-amber-800 font-serif">
                                  {formatted.label}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {formatted.tiles.map((t, tIdx) => (
                                    <MahjongTile
                                      key={`mt-tag-${mIdx}-${tIdx}`}
                                      tileId={t.tileId}
                                      size="xs"
                                      isReach={t.isReach}
                                      disabled
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMeld(activeRiverWind, mIdx)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1 cursor-pointer"
                                  title="削除"
                                >
                                  &times;
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 実際の河（捨て牌） */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between bg-[#F8F5EC] p-2 rounded-lg text-xs">
                        <span className="text-[#5C5549] font-bold font-serif">打牌の属性:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDiscardMode('tedashi')}
                            className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                              discardMode === 'tedashi'
                                ? 'bg-[#B8860B] text-white'
                                : 'bg-[#EAE4D7] text-[#5C5549]'
                            }`}
                          >
                            ✋ 手出し
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscardMode('tsumogiri')}
                            className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                              discardMode === 'tsumogiri'
                                ? 'bg-[#1E3A5F] text-white'
                                : 'bg-[#EAE4D7] text-[#5C5549]'
                            }`}
                          >
                            🔄 ツモ切り
                          </button>
                        </div>
                      </div>

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

                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-[#5C5549] mb-1 block font-serif">
                          河に追加する牌をタップ（{discardMode === 'tsumogiri' ? '🔄 ツモ切り' : '✋ 手出し'}）:
                        </span>
                        <div className="flex flex-wrap gap-1 p-2 bg-[#EAE4D7] rounded-lg max-h-20 overflow-y-auto">
                          {ALL_TILES.map((t) => (
                            <button
                              key={`quick-river-${t}`}
                              type="button"
                              onClick={() => handleAddDiscardToRiver(t)}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FBF9F4] border border-[#D5CEBE] rounded hover:border-[#1E3A5F] cursor-pointer"
                            >
                              {getTileDisplay(t).topText}{getTileDisplay(t).bottomText}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 各家の点数設定 */}
                {activeContextSubTab === 'scores' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-[#7A7265] font-serif">
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
                                ? 'bg-[#E8EFF7] border-[#1E3A5F]'
                                : 'bg-[#F8F5EC] border-[#D5CEBE]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-[#262422] font-serif">
                                {w} {isSelf && <span className="text-[10px] text-[#1E3A5F] font-bold">(自分)</span>}
                              </span>
                              {!isSelf && (
                                <span className={`text-[10px] font-mono ${scoreDiff >= 0 ? 'text-[#124D27]' : 'text-[#C82C26]'}`}>
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
                              className="w-full text-xs font-mono font-bold p-1.5 rounded border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422]"
                            />
                            <div className="flex gap-1 mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleAdjustScore(w, 1000)}
                                className="flex-1 text-[10px] bg-[#EAE4D7] hover:bg-[#DCD5C6] py-0.5 rounded cursor-pointer font-mono"
                              >
                                +1k
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustScore(w, -1000)}
                                className="flex-1 text-[10px] bg-[#EAE4D7] hover:bg-[#DCD5C6] py-0.5 rounded cursor-pointer font-mono"
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

                {/* 3. 戦況メモ */}
                {activeContextSubTab === 'note' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">
                      戦況メモ（例: 対面が早めの萬子染め手、上家は安牌を手出し中）
                    </label>
                    <textarea
                      rows={2}
                      placeholder="特筆すべき他家の動きや場の警戒事項を入力してください"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ★ 手牌パレット作成モード時の手牌表示（副露数に応じて必要枚数が 14/11/8/5/2 に連動！） */}
          {postMode === 'tiles' && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#262422] font-serif">
                      選択した手牌 ({hand.length} / {targetHandCount}枚)
                    </label>
                    {myMeldCount > 0 && (
                      <span className="text-[10px] font-bold text-[#124D27] bg-[#EAF2EC] px-1.5 py-0.2 rounded border border-[#124D27]/30">
                        {myMeldCount}副露中 (手牌必要枚数: {targetHandCount}枚)
                      </span>
                    )}
                    <span className="text-[10px] text-[#7A7265]">※タップで削除</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSort}
                      className="text-xs text-[#1E3A5F] font-bold hover:underline cursor-pointer font-serif"
                    >
                      🔄 理牌する
                    </button>
                    {hand.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHand([])}
                        className="text-xs text-[#C82C26] hover:underline cursor-pointer font-serif"
                      >
                        全消去
                      </button>
                    )}
                  </div>
                </div>

                {/* 手牌トレイ */}
                <div className="min-h-16 pt-3 pb-2.5 px-3 bg-[#EAE4D7] rounded-xl flex items-center justify-start gap-1 overflow-x-auto border-2 border-dashed border-[#D5CEBE]">
                  {hand.length === 0 ? (
                    <span className="text-xs text-[#7A7265] mx-auto py-3 font-serif">
                      下のパレットから牌をタップしてちょうど {targetHandCount}枚 選んでください
                      {myMeldCount > 0 ? `（${myMeldCount}副露のため純手牌は${targetHandCount}枚です）` : ''}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {hand.map((tileId, idx) => {
                        const isTsumo = problemType === 'discard' && idx === targetHandCount - 1;
                        return (
                          <MahjongTile
                            key={`chosen-${tileId}-${idx}`}
                            tileId={tileId}
                            size="sm"
                            isTsumo={isTsumo}
                            showTsumoLabel={isTsumo}
                            onClick={() => handleRemoveTile(idx)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 牌パレット */}
              <div className="bg-[#F8F5EC] p-3 rounded-xl border border-[#D5CEBE] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#262422] font-serif">
                      牌パレット（クリックで手牌に追加）
                    </span>
                    <span className="text-[10px] text-[#7A7265]">※ドラ表示牌・副露を含め最大4枚まで</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-[#5C5549] cursor-pointer font-serif">
                    <input
                      type="checkbox"
                      checked={autoSort}
                      onChange={(e) => setAutoSort(e.target.checked)}
                      className="rounded text-[#1E3A5F]"
                    />
                    自動理牌
                  </label>
                </div>

                <div className="space-y-1.5">
                  {/* 萬子 */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    <span className="text-[10px] font-bold text-[#C82C26] w-5 shrink-0 font-serif">萬</span>
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
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-600 text-white'
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
                    <span className="text-[10px] font-bold text-[#1E3A5F] w-5 shrink-0 font-serif">筒</span>
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
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-600 text-white'
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
                    <span className="text-[10px] font-bold text-[#124D27] w-5 shrink-0 font-serif">索</span>
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
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-600 text-white'
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
                    <span className="text-[10px] font-bold text-[#262422] w-5 shrink-0 font-serif">字</span>
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
                                  remaining === 0 ? 'bg-zinc-400 text-white' : 'bg-amber-600 text-white'
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

          {/* ★ 正解の設定（何切る問題なら打牌、鳴くか問題ならアクション） */}
          {problemType === 'discard' ? (
            <div className="bg-[#F8F5EC] p-3.5 rounded-xl border border-[#D5CEBE] space-y-2.5">
              <label className="block text-xs font-bold text-[#262422] font-serif">
                本命の打牌（出題者が推奨する正解）
              </label>

              {postMode === 'tiles' ? (
                hand.length === 0 ? (
                  <p className="text-xs text-[#7A7265] font-serif">
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
                              ? 'bg-[#124D27] text-white border-[#124D27] shadow-xs scale-105'
                              : 'bg-[#FBF9F4] text-[#262422] border-[#D5CEBE] hover:border-[#124D27]'
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
                  <p className="text-[11px] text-[#7A7265] mb-1.5 font-serif">
                    写真の中の手牌から、正解とする打牌を選択してください:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-[#FBF9F4] rounded-lg border border-[#D5CEBE]">
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
                              ? 'bg-[#124D27] text-white border-[#124D27] scale-105 shadow-xs'
                              : 'bg-[#F8F5EC] text-[#262422] border-[#D5CEBE]'
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
                <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">
                  本命打牌のひとこと理由
                </label>
                <input
                  type="text"
                  placeholder="例: 最大受け入れの28枚、手変わりでピンフ一盃口"
                  value={bestReason}
                  onChange={(e) => setBestReason(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
                />
              </div>
            </div>
          ) : (
            /* 鳴くか問題の正解アクション選択 */
            <div className="bg-[#F8F5EC] p-3.5 rounded-xl border-2 border-[#C82C26] space-y-2.5">
              <label className="block text-xs font-bold text-[#C82C26] font-serif">
                本命の判断（出題者が推奨する正解アクション）
              </label>

              <div className="flex flex-wrap gap-2">
                {calculatedMeldOptions.map((opt) => {
                  const isSelected = meldBestAction === opt.id;
                  return (
                    <button
                      key={`mbo-${opt.id}`}
                      type="button"
                      onClick={() => setMeldBestAction(opt.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        isSelected
                          ? 'bg-[#C82C26] text-white border-[#C82C26] scale-105'
                          : 'bg-[#FBF9F4] text-[#262422] border-[#D5CEBE] hover:border-[#C82C26]'
                      }`}
                    >
                      <span>{opt.action === 'pass' ? '🚫' : '🀄'}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">
                  この判断を推奨するひとこと理由
                </label>
                <input
                  type="text"
                  placeholder="例: 打点が高く速度を重視、親の現物を残してスルー"
                  value={bestReason}
                  onChange={(e) => setBestReason(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
                />
              </div>
            </div>
          )}

          {/* 解説と出題者名 */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#262422] mb-1 font-serif">
                戦術解説
              </label>
              <textarea
                rows={3}
                placeholder="他の選択肢との比較や、巡目・点差を踏まえた戦術的な解説文を入力してください"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#262422] mb-1 font-serif">
                出題者のお名前（ペンネーム）
              </label>
              <input
                type="text"
                placeholder="名無しの雀士"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-[#D5CEBE] bg-[#FBF9F4] text-[#262422] placeholder-[#A8A090] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] font-serif"
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="pt-3 border-t border-[#D5CEBE] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[#7A7265] hover:bg-[#EAE4D7] transition-colors cursor-pointer font-serif"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-postbox px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <span>📮</span>
              <span>この内容で問題を投函する</span>
            </button>
          </div>
        </form>

        {/* ★ 鳴き牌パレット作成モーダル */}
        {isMeldBuilderOpen && (
          <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
            <div className="bg-[#FBF9F4] w-full max-w-lg rounded-2xl p-5 border-2 border-[#1E3A5F] shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#D5CEBE] pb-2">
                <h3 className="text-sm font-bold text-[#262422] font-serif flex items-center gap-2">
                  <span>🀄</span>
                  <span>{meldBuilderWind}の鳴き（副露）を作成</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMeldBuilderOpen(false)}
                  className="text-zinc-500 hover:text-black font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              {/* 1. 鳴きの種類 */}
              <div>
                <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">鳴きの種類:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { type: 'pon', label: 'ポン (3枚)' },
                    { type: 'chi', label: 'チー (3枚)' },
                    { type: 'daiminkan', label: '大明槓 (4枚)' },
                    { type: 'ankan', label: '暗槓 (4枚)' },
                  ].map((m) => (
                    <button
                      key={`mb-type-${m.type}`}
                      type="button"
                      onClick={() => {
                        setMeldBuilderType(m.type as MeldType);
                        if (m.type === 'ankan') setMeldBuilderFrom('self');
                        else if (meldBuilderFrom === 'self') setMeldBuilderFrom('kami');
                        setMeldBuilderTiles([]);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        meldBuilderType === m.type
                          ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                          : 'bg-[#F8F5EC] text-[#262422] border-[#D5CEBE]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 誰から鳴いたか（相手の指定） */}
              {meldBuilderType !== 'ankan' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#5C5549] mb-1 font-serif">
                    誰から鳴いたか（鳴いた牌の位置が自動で横向きになります）:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { from: 'kami', label: '上家（左端が横向き）' },
                      { from: 'toimen', label: '対面（中央が横向き）' },
                      { from: 'shimo', label: '下家（右端が横向き）' },
                    ].map((f) => (
                      <button
                        key={`mb-from-${f.from}`}
                        type="button"
                        onClick={() => setMeldBuilderFrom(f.from as MeldFrom)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          meldBuilderFrom === f.from
                            ? 'bg-[#B8860B] text-white border-[#B8860B]'
                            : 'bg-[#F8F5EC] text-[#262422] border-[#D5CEBE]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. 選択中の副露牌プレビュー */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#5C5549] font-serif">
                    副露牌のプレビュー ({meldBuilderTiles.length} / {meldBuilderType === 'ankan' || meldBuilderType === 'daiminkan' ? 4 : 3}枚):
                  </span>
                  {meldBuilderTiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMeldBuilderTiles([])}
                      className="text-xs text-rose-600 underline cursor-pointer"
                    >
                      クリア
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-[#0e3b1c] rounded-xl border border-emerald-600/40 flex items-center justify-center gap-1 min-h-14">
                  {meldBuilderTiles.length === 0 ? (
                    <span className="text-xs text-emerald-300/70 font-mono">
                      下のパレットから牌をタップしてください
                    </span>
                  ) : (
                    meldBuilderTiles.map((tid, idx) => {
                      const isHorizontal =
                        meldBuilderFrom === 'kami'
                          ? idx === 0
                          : meldBuilderFrom === 'toimen'
                          ? idx === 1
                          : meldBuilderFrom === 'shimo'
                          ? idx === meldBuilderTiles.length - 1
                          : false;

                      return (
                        <div key={`mbt-${idx}`} className="relative cursor-pointer" onClick={() => handleMeldBuilderRemoveTile(idx)}>
                          <MahjongTile tileId={tid} size="sm" isReach={isHorizontal} disabled />
                          <span className="absolute -top-1 -right-1 bg-black/80 text-white rounded-full text-[8px] w-3.5 h-3.5 flex items-center justify-center font-bold">
                            &times;
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. 牌選択パレット */}
              <div className="space-y-1 bg-[#F8F5EC] p-2 rounded-xl border border-[#D5CEBE]">
                <span className="text-[10px] font-bold text-[#5C5549] block">
                  牌をタップして追加:
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {/* 萬子 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-[#C82C26] w-4 shrink-0">萬</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {MAN_TILES.map((t) => (
                        <MahjongTile key={`mbt-pal-${t}`} tileId={t} size="xs" onClick={() => handleMeldBuilderAddTile(t)} />
                      ))}
                    </div>
                  </div>
                  {/* 筒子 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-[#1E3A5F] w-4 shrink-0">筒</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {PIN_TILES.map((t) => (
                        <MahjongTile key={`mbt-pal-${t}`} tileId={t} size="xs" onClick={() => handleMeldBuilderAddTile(t)} />
                      ))}
                    </div>
                  </div>
                  {/* 索子 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-[#124D27] w-4 shrink-0">索</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {SOU_TILES.map((t) => (
                        <MahjongTile key={`mbt-pal-${t}`} tileId={t} size="xs" onClick={() => handleMeldBuilderAddTile(t)} />
                      ))}
                    </div>
                  </div>
                  {/* 字牌 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-[#262422] w-4 shrink-0">字</span>
                    <div className="flex gap-0.5 flex-wrap">
                      {ZI_TILES.map((t) => (
                        <MahjongTile key={`mbt-pal-${t}`} tileId={t} size="xs" onClick={() => handleMeldBuilderAddTile(t)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* モーダル下部アクション */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5CEBE]">
                <button
                  type="button"
                  onClick={() => setIsMeldBuilderOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#5C5549] hover:bg-[#EAE4D7]"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMeldBuilder}
                  className="btn-ink px-4 py-2 rounded-xl text-xs font-bold"
                >
                  この副露を確定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
