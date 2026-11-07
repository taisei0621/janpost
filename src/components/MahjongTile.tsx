'use client';

import React from 'react';
import { parseTileId } from '../utils/mahjongUtils';

interface MahjongTileProps {
  tileId: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isTsumo?: boolean;
  disabled?: boolean;
  badge?: string;
  showTsumoLabel?: boolean;
  isTsumogiri?: boolean; // true = ツモ切り（薄暗く表示）
  isReach?: boolean;     // true = リーチ宣言牌（横向き）
}

// 萬子の漢字マップ
const KANJI_MAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// ピンズの丸パーツ
const Dot = ({
  color = 'blue',
  size = 'normal',
}: {
  color?: 'blue' | 'red';
  size?: 'micro' | 'small' | 'normal' | 'large';
}) => {
  const isRed = color === 'red';
  const sizeClass =
    size === 'large'
      ? 'w-4 h-4 sm:w-5 sm:h-5'
      : size === 'micro'
      ? 'w-1.5 h-1.5'
      : size === 'small'
      ? 'w-2 h-2 sm:w-2.5 sm:h-2.5'
      : 'w-2.5 h-2.5 sm:w-3 sm:h-3';

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
  <div className="w-5 h-5 sm:w-7 sm:h-7 relative flex items-center justify-center">
    <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow">
      <circle cx="18" cy="18" r="16" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="11" fill="#fff7ed" stroke="#b45309" strokeWidth="1" strokeDasharray="3,1" />
      <circle cx="18" cy="18" r="6" fill={isRed ? '#dc2626' : '#2563eb'} />
      <circle cx="18" cy="18" r="2.5" fill="#fef08a" />
    </svg>
  </div>
);

// 索子の竹スティックパーツ
const Stick = ({
  color = 'green',
  isRed = false,
  vertical = true,
  rotate = 0,
}: {
  color?: 'green' | 'red';
  isRed?: boolean;
  vertical?: boolean;
  rotate?: number;
}) => {
  const fill = isRed || color === 'red' ? '#dc2626' : '#15803d';
  return (
    <div
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
      className={`flex items-center justify-center transition-transform ${
        vertical ? 'w-1 h-3 sm:w-1.5 sm:h-3.5' : 'w-3 h-1 sm:w-3.5 sm:h-1.5'
      }`}
    >
      <svg viewBox="0 0 10 24" className="w-full h-full">
        <rect x="2" y="1" width="6" height="22" rx="2" fill={fill} />
        <line x1="2" y1="12" stroke="#ffffff" strokeWidth="1.5" x2="8" y2="12" />
        <circle cx="5" cy="5" r="1" fill="#ffffff" />
        <circle cx="5" cy="19" r="1" fill="#ffffff" />
      </svg>
    </div>
  );
};

// 1索（孔雀・鳥）
const Sou1 = () => (
  <div className="w-5 h-6 sm:w-7 sm:h-8 flex items-center justify-center">
    <svg viewBox="0 0 32 38" className="w-full h-full drop-shadow-xs">
      <ellipse cx="16" cy="22" rx="8" ry="11" fill="#15803d" />
      <ellipse cx="16" cy="21" rx="5" ry="7" fill="#86efac" />
      <circle cx="16" cy="10" r="5" fill="#15803d" />
      <circle cx="18" cy="9" r="1.2" fill="#ffffff" />
      <circle cx="18" cy="9" r="0.6" fill="#000000" />
      <polygon points="21,10 25,12 21,13" fill="#dc2626" />
      <path d="M 12 7 Q 10 3 14 2 Q 13 5 15 6" fill="#dc2626" />
      <path d="M 14 6 Q 16 1 18 3 Q 17 5 17 6" fill="#2563eb" />
      <path d="M 10 26 Q 5 32 8 36 Q 11 31 12 27" fill="#15803d" />
      <path d="M 16 28 Q 16 36 17 37 Q 18 36 18 28" fill="#dc2626" />
      <path d="M 22 26 Q 27 32 24 36 Q 21 31 20 27" fill="#15803d" />
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
  showTsumoLabel = false,
  isTsumogiri = false,
  isReach = false,
}) => {
  const tile = parseTileId(tileId);

  // サイズ別クラス
  const sizeClasses = {
    xs: 'w-6 h-8 sm:w-6.5 sm:h-9 rounded-xs', // パレット用極小
    sm: 'w-7 h-10 rounded-xs',                // 小サイズ・捨て牌用
    md: 'w-7.5 h-11 sm:w-9 sm:h-13 rounded', // 手牌14枚用
    lg: 'w-11 h-15 sm:w-13 sm:h-18 rounded-md', // 大サイズ
  };

  const isClickable = !disabled && Boolean(onClick);

  // 牌面のコンテンツレンダラー
  const renderTileFace = () => {
    // 1. 萬子（マンズ）
    if (tile.suit === 'm') {
      return (
        <div className="flex flex-col items-center justify-center leading-none select-none">
          <span
            className={`font-serif text-xs sm:text-sm font-black tracking-tight ${
              tile.isRed ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {KANJI_MAN[tile.value]}
          </span>
          <span
            className={`font-serif text-[10px] sm:text-xs font-black mt-0.5 ${
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
          <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
            <Dot color={tile.isRed ? 'red' : 'blue'} />
            <Dot color={tile.isRed ? 'red' : 'blue'} />
          </div>
        );
      }
      if (tile.value === 3) {
        return (
          <div className="flex items-center justify-center -space-x-1">
            <div className="-translate-y-1.5"><Dot color={tile.isRed ? 'red' : 'blue'} /></div>
            <div><Dot color="red" /></div>
            <div className="translate-y-1.5"><Dot color={tile.isRed ? 'red' : 'blue'} /></div>
          </div>
        );
      }
      if (tile.value === 4) {
        return (
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
            <Dot color={tile.isRed ? 'red' : 'blue'} />
            <Dot color={tile.isRed ? 'red' : 'blue'} />
            <Dot color={tile.isRed ? 'red' : 'blue'} />
            <Dot color={tile.isRed ? 'red' : 'blue'} />
          </div>
        );
      }
      // ★ 5筒（赤5筒の場合は全5つの丸が赤！）
      if (tile.value === 5) {
        const dotColor = tile.isRed ? 'red' : 'blue';
        return (
          <div className="relative w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center">
            <div className="absolute top-0 left-0"><Dot color={dotColor} size="small" /></div>
            <div className="absolute top-0 right-0"><Dot color={dotColor} size="small" /></div>
            <div className="absolute"><Dot color="red" size="small" /></div>
            <div className="absolute bottom-0 left-0"><Dot color={dotColor} size="small" /></div>
            <div className="absolute bottom-0 right-0"><Dot color={dotColor} size="small" /></div>
          </div>
        );
      }
      if (tile.value === 6) {
        return (
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="red" size="small" /><Dot color="red" size="small" />
            <Dot color="red" size="small" /><Dot color="red" size="small" />
          </div>
        );
      }
      if (tile.value === 7) {
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex -space-x-0.5">
              <div className="-translate-y-1"><Dot color="red" size="micro" /></div>
              <div><Dot color="red" size="micro" /></div>
              <div className="translate-y-1"><Dot color="red" size="micro" /></div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Dot color="blue" size="small" /><Dot color="blue" size="small" />
              <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            </div>
          </div>
        );
      }
      if (tile.value === 8) {
        return (
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
            <Dot color="blue" size="small" /><Dot color="blue" size="small" />
          </div>
        );
      }
      if (tile.value === 9) {
        return (
          <div className="grid grid-cols-3 gap-0.5">
            <Dot color="blue" size="micro" /><Dot color="red" size="micro" /><Dot color="blue" size="micro" />
            <Dot color="blue" size="micro" /><Dot color="red" size="micro" /><Dot color="blue" size="micro" />
            <Dot color="blue" size="micro" /><Dot color="red" size="micro" /><Dot color="blue" size="micro" />
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
          <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
            <Stick color="green" />
            <Stick color="green" />
          </div>
        );
      }
      if (tile.value === 3) {
        return (
          <div className="flex flex-col items-center">
            <Stick color="green" />
            <div className="flex gap-1">
              <Stick color="green" />
              <Stick color="green" />
            </div>
          </div>
        );
      }
      if (tile.value === 4) {
        return (
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
            <Stick color="green" /><Stick color="green" />
            <Stick color="green" /><Stick color="green" />
          </div>
        );
      }
      // ★ 5索（赤5索の場合は全パーツ赤！）
      if (tile.value === 5) {
        const stickColor = tile.isRed ? 'red' : 'green';
        return (
          <div className="relative w-6 h-7 flex items-center justify-center">
            <div className="absolute top-0 left-0.5"><Stick color={stickColor} /></div>
            <div className="absolute top-0 right-0.5"><Stick color={stickColor} /></div>
            <div className="absolute"><Stick color="red" /></div>
            <div className="absolute bottom-0 left-0.5"><Stick color={stickColor} /></div>
            <div className="absolute bottom-0 right-0.5"><Stick color={stickColor} /></div>
          </div>
        );
      }
      if (tile.value === 6) {
        return (
          <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
            <Stick color="green" /><Stick color="green" /><Stick color="green" />
            <Stick color="green" /><Stick color="green" /><Stick color="green" />
          </div>
        );
      }
      if (tile.value === 7) {
        return (
          <div className="flex flex-col items-center">
            <Stick color="red" />
            <div className="grid grid-cols-3 gap-x-0.5 gap-y-0.5 mt-0.5">
              <Stick color="green" /><Stick color="green" /><Stick color="green" />
              <Stick color="green" /><Stick color="green" /><Stick color="green" />
            </div>
          </div>
        );
      }
      if (tile.value === 8) {
        return (
          <div className="flex flex-col gap-0.5 items-center select-none">
            <div className="flex gap-0.5 sm:gap-1 items-center">
              <div className="flex gap-0.5">
                <Stick color="green" rotate={20} />
                <Stick color="green" rotate={-20} />
              </div>
              <div className="flex gap-0.5">
                <Stick color="green" rotate={20} />
                <Stick color="green" rotate={-20} />
              </div>
            </div>
            <div className="flex gap-0.5 sm:gap-1 items-center -mt-0.5">
              <div className="flex gap-0.5">
                <Stick color="green" rotate={-20} />
                <Stick color="green" rotate={20} />
              </div>
              <div className="flex gap-0.5">
                <Stick color="green" rotate={-20} />
                <Stick color="green" rotate={20} />
              </div>
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
        return (
          <div className="w-4 h-6 sm:w-5 sm:h-7 border-2 border-blue-400/80 rounded-xs bg-white" />
        );
      }

      let color = 'text-gray-900';
      if (tile.value === 6) color = 'text-emerald-700';
      if (tile.value === 7) color = 'text-red-600';

      return (
        <span className={`font-serif text-base sm:text-xl font-black ${color} select-none drop-shadow-xs`}>
          {char}
        </span>
      );
    }

    return <span>{tileId}</span>;
  };

  return (
    <div
      className={`relative inline-block transition-transform ${isTsumo ? 'ml-2.5 sm:ml-4' : ''} ${
        isReach ? '-rotate-90 origin-center mx-1 my-0.5' : ''
      }`}
    >
      {badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-1 py-0.5 text-[9px] font-bold rounded bg-amber-500 text-white shadow-md animate-bounce">
          {badge}
        </span>
      )}
      {showTsumoLabel && isTsumo && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-1 py-0.2 text-[8px] font-bold rounded bg-blue-600 text-white shadow-xs">
          ツモ
        </span>
      )}
      {isReach && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-1 text-[7px] font-bold rounded bg-red-600 text-white shadow-xs">
          立直
        </span>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`
          ${sizeClasses[size]}
          relative flex items-center justify-center
          bg-gradient-to-b from-amber-50/95 via-white to-amber-50/90
          border border-amber-200/80
          shadow-[0_2px_4px_rgba(0,0,0,0.12),0_3px_0_#d97706]
          transition-all duration-150 select-none overflow-hidden
          ${isClickable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_6px_10px_rgba(0,0,0,0.2),0_3px_0_#b45309] active:translate-y-0' : 'cursor-default'}
          ${selected ? '-translate-y-3 ring-3 ring-blue-500 ring-offset-1 shadow-[0_6px_14px_rgba(37,99,235,0.3),0_3px_0_#1d4ed8] border-blue-400' : ''}
          ${disabled ? 'opacity-95' : ''}
          ${isTsumogiri ? 'opacity-55 brightness-90 saturate-75 bg-amber-100/70 border-zinc-400 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_1.5px_0_#b45309]' : ''}
        `}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center justify-center">
          {renderTileFace()}
        </div>
        {tile.isRed && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-600 shadow-sm ring-1 ring-white" />
        )}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500/90 border-t border-amber-600/30 pointer-events-none" />
      </button>
    </div>
  );
};
