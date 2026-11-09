'use client';

import React, { useState } from 'react';
import { Problem, PlayerSituation, DiscardTile } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';

interface MahjongTableViewProps {
  problem: Problem;
}

const WIND_ORDER = ['東家', '南家', '西家', '北家'] as const;
type WindType = typeof WIND_ORDER[number];

export const MahjongTableView: React.FC<MahjongTableViewProps> = ({ problem }) => {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  const players = problem.context.players;
  const scores = problem.context.scores;
  const selfWind = (problem.context.wind as WindType) || '南家';

  if (!players || Object.keys(players).length === 0) {
    return null;
  }

  // 自家を基準とした相対席の計算
  const selfIdx = WIND_ORDER.indexOf(selfWind);
  const shimoIdx = (selfIdx + 1) % 4;   // 下家（右）
  const toimenIdx = (selfIdx + 2) % 4;  // 対面（上）
  const kamiIdx = (selfIdx + 3) % 4;    // 上家（左）

  const seats = {
    self: { wind: WIND_ORDER[selfIdx], label: '自家', isSelf: true },
    shimo: { wind: WIND_ORDER[shimoIdx], label: '下家', isSelf: false },
    toimen: { wind: WIND_ORDER[toimenIdx], label: '対面', isSelf: false },
    kami: { wind: WIND_ORDER[kamiIdx], label: '上家', isSelf: false },
  };

  const reachCount = Object.values(players).filter((p) => p?.isReach).length;

  // 卓内・6枚×3段の一体型河
  const renderBoardRiver = (seat: { wind: WindType; label: string; isSelf: boolean }) => {
    const p = players[seat.wind];
    const discards = p?.discards || [];
    const sc = scores?.[seat.wind];
    const selfScore = scores?.[selfWind] || 25000;
    const diff = sc !== undefined ? sc - selfScore : 0;

    const rows: DiscardTile[][] = [
      discards.slice(0, 6),
      discards.slice(6, 12),
      discards.slice(12, 18),
    ];
    if (discards.length > 18) {
      rows.push(discards.slice(18));
    }

    return (
      <div className="flex flex-col items-center">
        {/* プレイヤー情報 */}
        <div className="mb-1.5 flex items-center gap-2 text-xs text-white">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${
              seat.isSelf
                ? 'bg-blue-600 text-white'
                : 'bg-black/50 text-zinc-200'
            }`}
          >
            {seat.wind}（{seat.label}）
          </span>

          {p?.isReach && (
            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
              <img src="/pai-images/tennbou-001.png" alt="立直" className="h-2 w-auto rotate-90" />
              立直
            </span>
          )}

          {sc !== undefined && (
            <span className="font-mono text-[11px] text-zinc-200">
              {sc.toLocaleString()}点
              {!seat.isSelf && (
                <span className={`ml-1 text-[10px] ${diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {diff >= 0 ? `+${diff}` : diff}
                </span>
              )}
            </span>
          )}
        </div>

        {/* 鳴き（副露） */}
        {p?.melds && p.melds.length > 0 && (
          <div className="mb-1 text-[10px] bg-amber-500/90 text-amber-950 font-semibold px-2 py-0.5 rounded">
            副露: {p.melds.join(' ')}
          </div>
        )}

        {/* 6枚×3段の河 */}
        <div className="p-1 rounded bg-[#165630] border border-emerald-600/40">
          <div className="flex flex-col gap-1">
            {rows.map((rowTiles, rIdx) => (
              <div key={`row-${seat.wind}-${rIdx}`} className="flex items-center gap-1 justify-center">
                {rowTiles.map((t, cIdx) => {
                  const globalIdx = rIdx * 6 + cIdx;
                  const isTileReach = t.isReach || (p?.isReach && globalIdx === discards.length - 1);
                  return (
                    <MahjongTile
                      key={`t-${seat.wind}-${globalIdx}`}
                      tileId={t.tileId}
                      size="xs"
                      isTsumogiri={t.isTsumogiri}
                      isReach={isTileReach}
                    />
                  );
                })}
                {/* 空きスロット */}
                {Array.from({ length: Math.max(0, 6 - rowTiles.length) }).map((_, slotIdx) => (
                  <div
                    key={`slot-${seat.wind}-${rIdx}-${slotIdx}`}
                    className="w-[24px] h-[33px] border border-dashed border-emerald-500/30 rounded-[2px] flex items-center justify-center text-[9px] text-emerald-300/40 select-none"
                  >
                    {rowTiles.length + slotIdx + 1}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      {/* 盤面ヘッダー */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            対局盤面
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {problem.context.round} {problem.context.turn}巡目
          </span>
        </div>

        {/* 表示モード切替 */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded text-xs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            卓上配置
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            一覧表示
          </button>
        </div>
      </div>

      {/* 1. 卓上配置（実戦の麻雀卓全景） */}
      {viewMode === 'table' && (
        <div className="w-full overflow-x-auto pb-1 flex justify-center">
          <div className="min-w-[560px] max-w-[640px] w-full rounded-xl p-4 bg-[#1a6639] border border-[#134d2b] shadow-inner">
            <div className="relative rounded-lg p-3 bg-[#1e7542] border border-emerald-500/20 flex flex-col items-center gap-3">
              {/* 対面（上） */}
              <div className="w-full flex justify-center">
                {renderBoardRiver(seats.toimen)}
              </div>

              {/* 中央段（上家・中央ボックス・下家） */}
              <div className="w-full flex items-center justify-between gap-2">
                {/* 上家（左） */}
                <div className="flex-1 flex justify-center">
                  {renderBoardRiver(seats.kami)}
                </div>

                {/* センターボックス（サイコロ部） */}
                <div className="shrink-0 w-36 p-2 rounded-lg bg-[#14532d] border border-amber-500/50 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm text-white">
                  <div className="px-2 py-0.5 bg-black/40 rounded text-[11px] font-semibold tracking-wide">
                    {problem.context.round} {problem.context.turn}巡目
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-zinc-300">ドラ表示牌</span>
                    <MahjongTile tileId={problem.context.dora} size="xs" disabled />
                  </div>

                  {reachCount > 0 ? (
                    <div className="flex items-center gap-1 bg-red-600/90 text-white px-2 py-0.5 rounded text-[9px] font-semibold">
                      <img
                        src="/pai-images/tennbou-001.png"
                        alt="供託"
                        className="h-2 w-auto rotate-90"
                      />
                      <span>供託 {reachCount * 1000}点</span>
                    </div>
                  ) : (
                    <span className="text-[8px] text-zinc-400">供託なし</span>
                  )}
                </div>

                {/* 下家（右） */}
                <div className="flex-1 flex justify-center">
                  {renderBoardRiver(seats.shimo)}
                </div>
              </div>

              {/* 自家（下） */}
              <div className="w-full flex justify-center">
                {renderBoardRiver(seats.self)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 一覧表示（4家縦並び） */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {[seats.self, seats.kami, seats.toimen, seats.shimo].map((seat) => (
            <div
              key={`list-${seat.wind}`}
              className={`p-3 rounded-lg border ${
                seat.isSelf
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                  : 'bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {renderBoardRiver(seat)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
