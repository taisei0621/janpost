'use client';

import React, { useState } from 'react';
import { parseTileId, getTileImagePath, getTileDisplay } from '../utils/mahjongUtils';

interface MahjongTileProps {
  tileId: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isTsumo?: boolean;
  disabled?: boolean;
  isUnavailable?: boolean; // 上限達成などで選択不可（薄暗くする）
  badge?: string;
  showTsumoLabel?: boolean;
  isTsumogiri?: boolean; // true = ツモ切り（薄暗く表示）
  isReach?: boolean;     // true = リーチ宣言牌（横向き）
}

export const MahjongTile: React.FC<MahjongTileProps> = ({
  tileId,
  selected = false,
  onClick,
  size = 'md',
  isTsumo = false,
  disabled = false,
  isUnavailable = false,
  badge,
  showTsumoLabel = false,
  isTsumogiri = false,
  isReach = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const tile = parseTileId(tileId);
  const display = getTileDisplay(tileId);

  // 画像サイズの選択（河や極小は 's'、手牌や大表示は 'l'）
  const imageSize = size === 'xs' || size === 'sm' ? 's' : 'l';
  const imageSrc = getTileImagePath(tileId, {
    size: imageSize,
    isReach,
    emb: true,
  });

  const isClickable = !disabled && Boolean(onClick);

  // サイズ別クラス（幅・高さ）
  // 縦向き比率: 66x90 (1:1.364)
  // 横向き比率: 90x66 (1.364:1)
  const sizeClasses = {
    xs: isReach
      ? 'w-[22px] h-[16px] sm:w-[33px] sm:h-[24px]'
      : 'w-[16px] h-[22px] sm:w-[24px] sm:h-[33px]',
    sm: isReach
      ? 'w-[42px] h-[31px]'
      : 'w-[31px] h-[42px]',
    md: isReach
      ? 'w-[45px] h-[33px] sm:w-[52px] sm:h-[38px]'
      : 'w-[25px] h-[34px] xs:w-[28px] xs:h-[38px] sm:w-[38px] sm:h-[52px]',
    lg: isReach
      ? 'w-[68px] h-[50px] sm:w-[82px] sm:h-[60px]'
      : 'w-[50px] h-[68px] sm:w-[60px] sm:h-[82px]',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform ${
        size === 'xs' ? 'pt-1' : 'pt-3'
      } ${
        isTsumo ? 'ml-2 sm:ml-4' : ''
      }`}
    >
      {/* バッジ表示（正解・残り枚数など） */}
      {badge && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shadow-md animate-bounce ring-1 ring-white/80 pointer-events-none">
          {badge}
        </span>
      )}

      {/* ツモラベル（見切れ防止でトップ余白内に確実に配置） */}
      {showTsumoLabel && isTsumo && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-1.5 py-0.2 text-[9px] font-black rounded-full bg-blue-600 text-white shadow-sm ring-1 ring-white/80 pointer-events-none tracking-wider">
          ツモ
        </span>
      )}

      {/* リーチ宣言ラベル */}
      {isReach && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-0.5 sm:px-1 text-[6px] sm:text-[7px] font-bold rounded bg-red-600 text-white shadow-xs pointer-events-none">
          立直
        </span>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`
          ${sizeClasses[size]}
          relative flex items-center justify-center p-0
          transition-all duration-150 select-none
          rounded-[3px] overflow-hidden
          ${
            isClickable
              ? 'cursor-pointer hover:-translate-y-2 hover:drop-shadow-[0_8px_12px_rgba(0,0,0,0.28)] active:translate-y-0'
              : 'cursor-default'
          }
          ${
            selected
              ? '-translate-y-2.5 ring-2 ring-blue-500 ring-offset-1 drop-shadow-[0_8px_16px_rgba(37,99,235,0.45)]'
              : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]'
          }
          ${isUnavailable ? 'opacity-30 grayscale cursor-not-allowed' : ''}
          ${
            isTsumogiri
              ? 'brightness-60 contrast-90 opacity-70 filter'
              : ''
          }
        `}
      >
        {!imgError ? (
          <img
            src={imageSrc}
            alt={tileId}
            draggable={false}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          /* 画像ロード失敗時のSVG/テキストフォールバック */
          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 border border-amber-300 rounded text-xs font-bold text-gray-900">
            <span>{display.topText}</span>
            <span className={display.suitColor}>{display.bottomText}</span>
          </div>
        )}
      </button>
    </div>
  );
};
