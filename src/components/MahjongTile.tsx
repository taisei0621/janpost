'use client';

import React from 'react';
import { getTileDisplay, parseTileId } from '../utils/mahjongUtils';

interface MahjongTileProps {
  tileId: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isTsumo?: boolean; // ツモ牌（少し隙間を空けて右に置く牌）
  disabled?: boolean;
  badge?: string; // 例: "本命", "正解"
}

export const MahjongTile: React.FC<MahjongTileProps> = ({
  tileId,
  selected = false,
  onClick,
  size = 'md',
  isTsumo = false,
  disabled = false,
  badge,
}) => {
  const display = getTileDisplay(tileId);
  const tile = parseTileId(tileId);

  // サイズ定義
  const sizeClasses = {
    sm: 'w-7 h-10 text-xs rounded-sm',
    md: 'w-9 h-13 text-sm rounded',
    lg: 'w-11 h-16 text-base rounded-md',
  };

  const isClickable = !disabled && Boolean(onClick);

  return (
    <div className={`relative inline-block ${isTsumo ? 'ml-3 sm:ml-4' : ''}`}>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white shadow">
          {badge}
        </span>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`
          ${sizeClasses[size]}
          relative flex flex-col items-center justify-center font-bold tracking-tight
          bg-gradient-to-b from-amber-50 via-white to-amber-100/80 text-gray-900
          border-2 border-amber-200/90 shadow-md transition-all duration-150 select-none
          ${isClickable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-lg active:translate-y-0' : 'cursor-default'}
          ${selected ? '-translate-y-3 ring-4 ring-blue-500 ring-offset-2 border-blue-400 shadow-xl' : ''}
          ${disabled ? 'opacity-90' : ''}
        `}
      >
        {/* 麻雀牌の立体感を出す上部ハイライト */}
        <div className="absolute top-0.5 inset-x-1 h-1 bg-white/80 rounded-t-sm pointer-events-none" />

        {display.isZi ? (
          // 字牌
          <span
            className={`font-serif text-lg sm:text-xl font-black ${display.suitColor} ${
              tile.value === 5 ? 'border-2 border-blue-400 px-1 rounded-sm' : ''
            }`}
          >
            {display.bottomText}
          </span>
        ) : (
          // 数牌 (萬子・筒子・索子)
          <div className="flex flex-col items-center leading-none">
            <span className={`font-mono text-xs sm:text-sm ${tile.isRed ? 'text-red-600 font-black' : 'text-gray-800'}`}>
              {tile.isRed ? '5' : tile.value}
            </span>
            <span className={`text-[11px] sm:text-xs font-serif font-black ${display.suitColor}`}>
              {display.bottomText}
            </span>
          </div>
        )}

        {/* 赤ドラの印 */}
        {tile.isRed && (
          <span className="absolute bottom-0.5 right-1 w-1.5 h-1.5 rounded-full bg-red-600 shadow-sm" />
        )}
      </button>
    </div>
  );
};
