'use client';

import React from 'react';
import { DiscardTile } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';

interface MahjongRiverProps {
  discards: DiscardTile[];
  windLabel?: string;
  isReach?: boolean;
  interactive?: boolean; // 作成時（トグル・削除可能）
  onToggleTsumogiri?: (index: number) => void;
  onRemoveTile?: (index: number) => void;
  onToggleReach?: (index: number) => void;
}

export const MahjongRiver: React.FC<MahjongRiverProps> = ({
  discards,
  windLabel,
  isReach = false,
  interactive = false,
  onToggleTsumogiri,
  onRemoveTile,
  onToggleReach,
}) => {
  // 6枚ごとに段を分割（上段: 0-5, 中段: 6-11, 下段: 12-17, 4段目: 18-）
  const rows: DiscardTile[][] = [];
  for (let i = 0; i < discards.length; i += 6) {
    rows.push(discards.slice(i, i + 6));
  }

  const rowLabels = ['上段 (1〜6巡目)', '中段 (7〜12巡目)', '下段 (13〜18巡目)', '延長段 (19巡目〜)'];

  return (
    <div className="w-full bg-emerald-950/20 dark:bg-emerald-950/40 p-3 sm:p-4 rounded-xl border border-emerald-800/40 shadow-inner">
      {windLabel && (
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-800/30">
          <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <span>🀄</span>
            <span>{windLabel}の河（捨て牌: {discards.length}枚）</span>
            {isReach && (
              <span className="inline-flex items-center gap-1 bg-red-600/90 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                <img
                  src="/pai-images/tennbou-001.png"
                  alt="リーチ棒"
                  className="h-3 w-auto rotate-90"
                />
                <span>立直中 (1000点供託)</span>
              </span>
            )}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            ※薄暗い牌 = ツモ切り / 通常 = 手出し
          </span>
        </div>
      )}

      {discards.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-400">
          捨て牌はありません
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((rowTiles, rIdx) => {
            const startIndex = rIdx * 6;
            return (
              <div key={`river-row-${rIdx}`} className="space-y-0.5">
                {/* 段ラベル */}
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1">
                  <span>{rowLabels[rIdx] || `第${rIdx + 1}段`}</span>
                  <span>{rowTiles.length} / 6枚</span>
                </div>

                {/* 6枚の牌スロット */}
                <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-emerald-900/10 dark:bg-black/20 rounded-lg min-h-12 border border-emerald-900/20 overflow-x-auto">
                  {rowTiles.map((tile, i) => {
                    const globalIdx = startIndex + i;
                    const isTileReach = tile.isReach || (isReach && globalIdx === discards.length - 1);

                    return (
                      <div key={`d-${globalIdx}`} className="relative group shrink-0">
                        <MahjongTile
                          tileId={tile.tileId}
                          size="sm"
                          isTsumogiri={tile.isTsumogiri}
                          isReach={isTileReach}
                          onClick={interactive && onToggleTsumogiri ? () => onToggleTsumogiri(globalIdx) : undefined}
                        />

                        {/* 作成時のアクションボタン（ホバーで表示） */}
                        {interactive && (
                          <div className="absolute -top-1.5 -right-1 flex gap-0.5 z-20">
                            {onToggleReach && (
                              <button
                                type="button"
                                title="リーチ宣言牌トグル"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleReach(globalIdx);
                                }}
                                className={`w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center cursor-pointer shadow-xs ${
                                  tile.isReach ? 'bg-red-600 text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-red-500 hover:text-white'
                                }`}
                              >
                                Ｒ
                              </button>
                            )}
                            {onRemoveTile && (
                              <button
                                type="button"
                                title="この牌を削除"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveTile(globalIdx);
                                }}
                                className="w-3.5 h-3.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-[8px] font-bold flex items-center justify-center cursor-pointer shadow-xs"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 空きスロット（6枚枠の視覚化） */}
                  {Array.from({ length: Math.max(0, 6 - rowTiles.length) }).map((_, slotIdx) => (
                    <div
                      key={`empty-slot-${slotIdx}`}
                      className="w-[31px] h-[42px] border border-dashed border-emerald-800/30 rounded-[3px] flex items-center justify-center text-[10px] text-emerald-800/40 select-none shrink-0"
                    >
                      {rowTiles.length + slotIdx + 1}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
