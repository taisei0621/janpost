'use client';

import React from 'react';
import { parseTileId } from '../utils/mahjongUtils';

interface MahjongTileProps {
  tileId: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isTsumo?: boolean;
  disabled?: boolean;
  badge?: string;
}

// 萬子の漢字マップ
const KANJI_MAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// ピンズの丸パーツ
const Dot = ({ color = 'blue', size = 'normal' }: { color?: 'blue' | 'red'; size?: 'small' | 'normal' | 'large' }) => {
  const isRed = color === 'red';
  const sizeClass = size === 'large' ? 'w-5 h-5 sm:w-6 sm:h-6' : size === 'small' ? 'w-2 h-2 sm:w-2.5 sm:h-2.5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3';

  return (
    <div className={`relative ${sizeClass} flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-xs">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={isRed ? '#dc2626' : '#2563eb'}
          stroke={isRed ? '#991b1b' : '#1d4ed8'}
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12" r="5" fill="#ffffff" />
        <circle cx="12" cy="12" r="2.5" fill={isRed ? '#dc2626' : '#2563eb'} />
      </svg>
    </div>
  );
};

// 1筒（特大の車輪・花丸）
const Pin1 = ({ isRed = false }: { isRed?: boolean }) => (
  <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex items-center justify-center">
    <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow">
      <circle cx="18" cy="18" r="16" fill={isRed ? '#dc2626' : '#dc2626'} stroke="#991b1b" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="11" fill="#fff7ed" stroke="#b45309" strokeWidth="1" strokeDasharray="3,1" />
      <circle cx="18" cy="18" r="6" fill="#2563eb" />
      <circle cx="18" cy="18" r="2.5" fill="#fef08a" />
    </svg>
  </div>
);

// 索子の竹スティックパーツ
const Stick = ({ color = 'green', isRed = false, vertical = true }: { color?: 'green' | 'red'; isRed?: boolean; vertical?: boolean }) => {
  const fill = isRed || color === 'red' ? '#dc2626' : '#15803d';
  return (
    <div className={`flex items-center justify-center ${vertical ? 'w-1.5 h-4 sm:w-2 sm:h-4.5' : 'w-4 h-1.5 sm:w-4.5 sm:h-2'}`}>
      <svg viewBox="0 0 10 24" className="w-full h-full">
        <rect x="2" y="1" width="6" height="22" rx="2" fill={fill} />
        <line x1="2" y1="12" x2="8" y2="12" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="5" cy="5" r="1" fill="#ffffff" />
        <circle cx="5" cy="19" r="1" fill="#ffffff" />
      </svg>
    </div>
  );
};

// 1索（孔雀・鳥）
const Sou1 = () => (
  <div className="w-7 h-8 sm:w-8 sm:h-9 flex items-center justify-center">
    <svg viewBox="0 0 32 36" className="w-full h-full">
      {/* 尾羽 */}
      <path d="M16 2 C10 8, 4 12, 6 22 C10 16, 14 12, 16 8" fill="#16a34a" />
      <path d="M16 2 C22 8, 28 12, 26 22 C22 16, 18 12, 16 8" fill="#15803d" />
      <circle cx="8" cy="16" r="2.5" fill="#dc2626" />
      <circle cx="24" cy="16" r="2.5" fill="#2563eb" />
      {/* 胴体と頭 */}
      <ellipse cx="16" cy="20" rx="4.5" ry="7" fill="#15803d" />
      <circle cx="16" cy="11" r="3.5" fill="#16a34a" />
      <path d="M16 11 L19 13 L16 14 Z" fill="#eab308" />
      <circle cx="15" cy="10" r="0.8" fill="#000" />
      {/* 止まり木 */}
      <rect x="8" y="27" width="16" height="3" rx="1.5" fill="#b45309" />
    </svg>
  </div>
);

export const MahjongTile: React.FC<MahjongTileProps> = ({
  tileId,
  selected = false,
  onClick,
  size = 'md',
  isTsumo = false,
  disabled = false,
  badge,
}) => {
  const tile = parseTileId(tileId);

  // 比率：実物の麻雀牌に近い黄金比（幅 : 高さ ≒ 1 : 1.35）
  const sizeClasses = {
    sm: 'w-7 h-10 rounded-sm',
    md: 'w-10 h-14 sm:w-11 sm:h-15 rounded',
    lg: 'w-12 h-17 sm:w-14 sm:h-19 rounded-md',
  };

  const isClickable = !disabled && Boolean(onClick);

  // 牌面のコンテンツレンダラー
  const renderTileFace = () => {
    // 1. 萬子（マンズ）
    if (tile.suit === 'm') {
      return (
        <div className="flex flex-col items-center justify-center leading-none select-none">
          <span
            className={`font-serif text-sm sm:text-base font-black tracking-tight ${
              tile.isRed ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {KANJI_MAN[tile.value]}
          </span>
          <span
            className={`font-serif text-xs sm:text-sm font-black mt-0.5 ${
              tile.isRed ? 'text-red-600' : 'text-red-700'
            }`}
          >
            萬
          </span>
        </div>
      );
    }

    // 2. 筒子（ピンズ）
    if (tile.suit === 'p') {
      if (tile.value === 1) {
        return <Pin1 isRed={tile.isRed} />;
      }
      if (tile.value === 2) {
        return (
          <div className="flex flex-col gap-1 items-center">
            <Dot color={tile.isRed ? 'red' : 'blue'} />
            <Dot color="blue" />
          </div>
        );
      }
      if (tile.value === 3) {
        return (
          <div className="flex items-center justify-center -space-x-1">
            <div className="-translate-y-2"><Dot color={tile.isRed ? 'red' : 'blue'} /></div>
            <div><Dot color="red" /></div>
            <div className="translate-y-2"><Dot color="blue" /></div>
          </div>
        );
      }
      if (tile.value === 4) {
        return (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            <Dot color={tile.isRed ? 'red' : 'blue'} />
            <Dot color="blue" />
            <Dot color="blue" />
            <Dot color="blue" />
          </div>
        );
      }
      if (tile.value === 5) {
        return (
          <div className="relative w-7 h-9 flex items-center justify-center">
            <div className="absolute top-0 left-0"><Dot color={tile.isRed ? 'red' : 'blue'} /></div>
            <div className="absolute top-0 right-0"><Dot color="blue" /></div>
            <div className="absolute"><Dot color="red" /></div>
            <div className="absolute bottom-0 left-0"><Dot color="blue" /></div>
            <div className="absolute bottom-0 right-0"><Dot color="blue" /></div>
          </div>
        );
      }
      if (tile.value === 6) {
        return (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Dot color="blue" />
            <Dot color="blue" />
            <Dot color="red" />
            <Dot color="red" />
            <Dot color="red" />
            <Dot color="red" />
          </div>
        );
      }
      if (tile.value === 7) {
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex -space-x-0.5 -translate-y-0.5">
              <div className="-translate-y-1"><Dot color="blue" size="small" /></div>
              <div><Dot color="red" size="small" /></div>
              <div className="translate-y-1"><Dot color="blue" size="small" /></div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-0.5">
              <Dot color="red" size="small" />
              <Dot color="red" size="small" />
              <Dot color="red" size="small" />
              <Dot color="red" size="small" />
            </div>
          </div>
        );
      }
      if (tile.value === 8) {
        return (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
          </div>
        );
      }
      if (tile.value === 9) {
        return (
          <div className="grid grid-cols-3 gap-1">
            <Dot color="blue" size="small" /><Dot color="red" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="red" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="red" size="small" /><Dot color="blue" size="small" />
          </div>
        );
      }
    }

    // 3. 索子（ソーズ）
    if (tile.suit === 's') {
      if (tile.value === 1) {
        return <Sou1 />;
      }
      if (tile.value === 2) {
        return (
          <div className="flex flex-col gap-1 items-center">
            <Stick color="green" />
            <Stick color="green" />
          </div>
        );
      }
      if (tile.value === 3) {
        return (
          <div className="flex flex-col items-center">
            <Stick color="green" />
            <div className="flex gap-2">
              <Stick color="green" />
              <Stick color="green" />
            </div>
          </div>
        );
      }
      if (tile.value === 4) {
        return (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <Stick color="green" /><Stick color="green" />
            <Stick color="green" /><Stick color="green" />
          </div>
        );
      }
      if (tile.value === 5) {
        return (
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute top-0 left-1"><Stick color="green" /></div>
            <div className="absolute top-0 right-1"><Stick color="green" /></div>
            <div className="absolute"><Stick color="red" isRed={tile.isRed} /></div>
            <div className="absolute bottom-0 left-1"><Stick color="green" /></div>
            <div className="absolute bottom-0 right-1"><Stick color="green" /></div>
          </div>
        );
      }
      if (tile.value === 6) {
        return (
          <div className="grid grid-cols-3 gap-x-1 gap-y-1">
            <Stick color="green" /><Stick color="green" /><Stick color="green" />
            <Stick color="green" /><Stick color="green" /><Stick color="green" />
          </div>
        );
      }
      if (tile.value === 7) {
        return (
          <div className="flex flex-col items-center">
            <Stick color="red" />
            <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 mt-0.5">
              <Stick color="green" /><Stick color="green" /><Stick color="green" />
              <Stick color="green" /><Stick color="green" /><Stick color="green" />
            </div>
          </div>
        );
      }
      if (tile.value === 8) {
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <div className="grid grid-cols-4 gap-0.5">
              <Stick color="green" /><Stick color="green" /><Stick color="green" /><Stick color="green" />
            </div>
            <div className="grid grid-cols-4 gap-0.5">
              <Stick color="green" /><Stick color="green" /><Stick color="green" /><Stick color="green" />
            </div>
          </div>
        );
      }
      if (tile.value === 9) {
        return (
          <div className="grid grid-cols-3 gap-0.5">
            <Stick color="green" /><Stick color="red" /><Stick color="green" />
            <Stick color="green" /><Stick color="red" /><Stick color="green" />
            <Stick color="green" /><Stick color="red" /><Stick color="green" />
          </div>
        );
      }
    }

    // 4. 字牌（東南西北白發中）
    if (tile.suit === 'z') {
      const ziNames = ['', '東', '南', '西', '北', '白', '發', '中'];
      const char = ziNames[tile.value];

      if (tile.value === 5) {
        // 白（純白または水色枠）
        return (
          <div className="w-5 h-7 sm:w-6 sm:h-8 border-2 border-blue-400/80 rounded-sm bg-white" />
        );
      }

      let color = 'text-gray-900';
      if (tile.value === 6) color = 'text-emerald-700'; // 發 (緑)
      if (tile.value === 7) color = 'text-red-600';     // 中 (赤)

      return (
        <span className={`font-serif text-lg sm:text-2xl font-black ${color} select-none drop-shadow-xs`}>
          {char}
        </span>
      );
    }

    return <span>{tileId}</span>;
  };

  return (
    <div className={`relative inline-block ${isTsumo ? 'ml-3 sm:ml-5' : ''}`}>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white shadow-md animate-bounce">
          {badge}
        </span>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`
          ${sizeClasses[size]}
          relative flex items-center justify-center
          /* 本物の牌の質感：象牙調のツヤ + 竹背のアンダーレイヤー */
          bg-gradient-to-b from-amber-50/95 via-white to-amber-50/90
          border border-amber-200/80
          shadow-[0_2px_4px_rgba(0,0,0,0.12),0_4px_0_#d97706]
          transition-all duration-150 select-none overflow-hidden
          ${isClickable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_6px_12px_rgba(0,0,0,0.2),0_4px_0_#b45309] active:translate-y-0' : 'cursor-default'}
          ${selected ? '-translate-y-3.5 ring-4 ring-blue-500 ring-offset-2 shadow-[0_8px_16px_rgba(37,99,235,0.3),0_4px_0_#1d4ed8] border-blue-400' : ''}
          ${disabled ? 'opacity-95' : ''}
        `}
      >
        {/* 牌の表面ハイライト光沢 */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />

        {/* 牌面コンテンツ */}
        <div className="relative z-10 flex items-center justify-center">
          {renderTileFace()}
        </div>

        {/* 赤ドラの印（赤ポッチ） */}
        {tile.isRed && (
          <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-red-600 shadow-sm ring-1 ring-white" />
        )}

        {/* 底面の竹背（リアルな黄色い竹の層） */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500/90 border-t border-amber-600/30 pointer-events-none" />
      </button>
    </div>
  );
};
