'use client';

import React from 'react';
import { DiscardTile, MeldInfo } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { parseMeldDisplay } from '../utils/mahjongUtils';

interface MahjongRiverProps {
  discards: DiscardTile[];
  melds?: Array<string | MeldInfo>;
  windLabel?: string;
  isReach?: boolean;
  interactive?: boolean; // 作成時（トグル・削除可能）
  onToggleTsumogiri?: (index: number) => void;
  onRemoveTile?: (index: number) => void;
  onToggleReach?: (index: number) => void;
  onRemoveMeld?: (index: number) => void;
}

export const MahjongRiver: React.FC<MahjongRiverProps> = ({
  discards,
  melds,
  windLabel,
  isReach = false,
  interactive = false,
  onToggleTsumogiri,
  onRemoveTile,
  onToggleReach,
  onRemoveMeld,
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

      {/* 鳴き牌（副露）の表示 */}
      {melds && melds.length > 0 && (
        <div className="mb-2.5 p-2 bg-emerald-950/40 rounded-lg border border-emerald-700/40 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
            <span>鳴き (副露):</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {melds.map((meldItem, mIdx) => {
              const formatted = parseMeldDisplay(meldItem);
              return (
                <div
                  key={`river-meld-${mIdx}`}
                  className="inline-flex items-center gap-1 bg-[#104323] px-2 py-1 rounded-md border border-amber-400/50 shadow-sm"
                >
                  {formatted.label && (
                    <span className="text-[10px] text-amber-300 font-bold px-1">
                      {formatted.label}
                    </span>
                  )}
                  {formatted.tiles.length > 0 ? (
                    <div className="flex items-center gap-0.5">
                      {formatted.tiles.map((t, tIdx) => (
                        <MahjongTile
                          key={`rm-${mIdx}-${tIdx}`}
                          tileId={t.tileId}
                          size="xs"
                          isHorizontal={t.isHorizontal}
                          showReachLabel={false}
                          disabled
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-200 font-bold px-1">
                      {String(meldItem)}
                    </span>
                  )}
                  {interactive && onRemoveMeld && (
                    <button
                      type="button"
                      onClick={() => onRemoveMeld(mIdx)}
                      title="この鳴きを削除"
                      className="ml-1 text-amber-300 hover:text-red-400 font-bold text-xs cursor-pointer"
                    >
                      &times;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6枚×3段の河グリッド */}
      <div className="space-y-2">
        {discards.length === 0 ? (
          <div className="text-center py-4 text-xs text-emerald-800/60 dark:text-emerald-300/50 font-bold">
            捨て牌はまだありません
          </div>
        ) : (
          rows.map((rowTiles, rIdx) => (
            <div key={`row-${rIdx}`} className="space-y-0.5">
              <div className="text-[10px] font-mono text-emerald-800/80 dark:text-emerald-400/70">
                {rowLabels[rIdx] || `${rIdx + 1}段目`}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {rowTiles.map((tile, cIdx) => {
                  const globalIdx = rIdx * 6 + cIdx;
                  return (
                    <div
                      key={`d-${globalIdx}-${tile.tileId}`}
                      className="relative group flex flex-col items-center"
                    >
                      <MahjongTile
                        tileId={tile.tileId}
                        size="xs"
                        isTsumogiri={tile.isTsumogiri}
                        isReach={tile.isReach}
                      />

                      {/* 作成時（interactiveモード）のトグル操作コントロール */}
                      {interactive && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {onToggleTsumogiri && (
                            <button
                              type="button"
                              onClick={() => onToggleTsumogiri(globalIdx)}
                              title={tile.isTsumogiri ? '手出しに変更' : 'ツモ切りに変更'}
                              className={`text-[8px] px-1 py-0.2 rounded font-bold transition-colors cursor-pointer ${
                                tile.isTsumogiri
                                  ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                  : 'bg-emerald-700 text-white hover:bg-emerald-600'
                              }`}
                            >
                              {tile.isTsumogiri ? 'ツモ' : '手出'}
                            </button>
                          )}
                          {onToggleReach && (
                            <button
                              type="button"
                              onClick={() => onToggleReach(globalIdx)}
                              title={tile.isReach ? '通常牌に戻す' : 'リーチ宣言牌（横向き）にする'}
                              className={`text-[8px] px-1 py-0.2 rounded font-bold transition-colors cursor-pointer ${
                                tile.isReach
                                  ? 'bg-red-600 text-white hover:bg-red-700 ring-1 ring-white'
                                  : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500'
                              }`}
                            >
                              立直
                            </button>
                          )}
                          {onRemoveTile && (
                            <button
                              type="button"
                              onClick={() => onRemoveTile(globalIdx)}
                              title="この牌を削除"
                              className="text-[9px] text-red-400 hover:text-red-300 px-0.5 font-bold cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
