'use client';

import React, { useState } from 'react';
import { Problem, PlayerSituation, DiscardTile } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { parseMeldDisplay, getDoraTiles } from '../utils/mahjongUtils';

interface MahjongTableViewProps {
  problem: Problem;
}

const WIND_ORDER = ['東家', '南家', '西家', '北家'] as const;
type WindType = typeof WIND_ORDER[number];

export const MahjongTableView: React.FC<MahjongTableViewProps> = ({ problem }) => {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  const doraTiles = getDoraTiles(problem.context);

  const rawScores = problem.context.scores;
  const scores: Record<string, number> | undefined = typeof rawScores === 'string'
    ? (() => { try { return JSON.parse(rawScores); } catch { return undefined; } })()
    : rawScores;

  const selfWind = (problem.context.wind as WindType) || '南家';

  // プレイヤーデータ（未設定時は各家25,000点の空河としてフォールバック）
  const fallbackPlayers: Record<string, PlayerSituation> = {
    東家: { wind: '東家', score: scores?.['東家'] ?? 25000, discards: [], melds: [], isReach: false },
    南家: { wind: '南家', score: scores?.['南家'] ?? 25000, discards: [], melds: [], isReach: false },
    西家: { wind: '西家', score: scores?.['西家'] ?? 25000, discards: [], melds: [], isReach: false },
    北家: { wind: '北家', score: scores?.['北家'] ?? 25000, discards: [], melds: [], isReach: false },
  };

  const rawPlayers = problem.context.players;
  const parsedPlayers: Record<string, PlayerSituation> | undefined = typeof rawPlayers === 'string'
    ? (() => { try { return JSON.parse(rawPlayers); } catch { return undefined; } })()
    : rawPlayers;

  const players = (parsedPlayers && typeof parsedPlayers === 'object' && Object.keys(parsedPlayers).length > 0)
    ? parsedPlayers
    : fallbackPlayers;

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
    const rawDiscards = p?.discards;
    const discards: DiscardTile[] = Array.isArray(rawDiscards)
      ? rawDiscards
      : (typeof rawDiscards === 'string' ? (() => { try { return JSON.parse(rawDiscards); } catch { return []; } })() : []);

    const rawMelds = p?.melds;
    const melds: string[] = Array.isArray(rawMelds)
      ? rawMelds
      : (typeof rawMelds === 'string' ? (() => { try { return JSON.parse(rawMelds); } catch { return []; } })() : []);

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
        {/* プレイヤー情報バッジ */}
        <div className="mb-1 flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-xs text-white">
          <span
            className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold tracking-tight shadow-2xs ${
              seat.isSelf
                ? 'bg-blue-600 text-white ring-1 ring-blue-300/40'
                : 'bg-black/60 text-zinc-200'
            }`}
          >
            {seat.wind}（{seat.label}）
          </span>

          {p?.isReach && (
            <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold shadow-2xs">
              <img src="/pai-images/tennbou-001.png" alt="立直" className="h-1.5 sm:h-2 w-auto rotate-90" />
              立直
            </span>
          )}

          {sc !== undefined && (
            <span className="font-mono text-[10px] sm:text-[11px] text-zinc-200 font-semibold tabular-nums">
              {sc.toLocaleString()}点
              {!seat.isSelf && (
                <span className={`ml-1 text-[9px] sm:text-[10px] ${diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                </span>
              )}
            </span>
          )}
        </div>

        {/* 鳴き牌（副露） */}
        {melds.length > 0 && (
          <div className="mb-1 flex flex-wrap items-center justify-center gap-1">
            {melds.map((meldItem, mIdx) => {
              const formatted = parseMeldDisplay(meldItem);
              return (
                <div
                  key={`meld-${seat.wind}-${mIdx}`}
                  className="inline-flex items-center gap-0.5 bg-[#0f3d20] px-1.5 py-0.5 rounded border border-amber-400/40 shadow-xs"
                >
                  {formatted.label && (
                    <span className="text-[7px] sm:text-[8px] text-amber-300 font-bold px-0.5">
                      {formatted.label}
                    </span>
                  )}
                  {formatted.tiles.length > 0 ? (
                    <div className="flex items-center gap-0.5">
                      {formatted.tiles.map((t, tIdx) => (
                        <MahjongTile
                          key={`mt-${seat.wind}-${mIdx}-${tIdx}`}
                          tileId={t.tileId}
                          size="xs"
                          isReach={t.isReach}
                          disabled
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] text-amber-200 font-semibold px-0.5">
                      {String(meldItem)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 6枚×3段の河 */}
        <div className="p-1 sm:p-1.5 rounded-lg bg-[#114624] border border-emerald-600/40 shadow-inner">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            {rows.map((rowTiles, rIdx) => (
              <div key={`row-${seat.wind}-${rIdx}`} className="flex items-center gap-0.5 sm:gap-1 justify-center">
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
                    className="w-[16px] h-[22px] sm:w-[24px] sm:h-[33px] border border-dashed border-emerald-500/25 rounded-[2px] flex items-center justify-center text-[7px] sm:text-[9px] text-emerald-300/40 select-none font-mono"
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
    <div className="w-full bg-[#FBF9F4] rounded-xl border border-[#D5CEBE] p-2 sm:p-4 space-y-3 shadow-xs">
      {/* 盤面ヘッダー */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#262422] font-serif">
            対局盤面
          </span>
          <span className="text-[11px] text-[#5C5549] font-mono">
            {problem.context.round}
            {problem.context.honba && problem.context.honba > 0 ? ` ${problem.context.honba}本場` : ''}
            {' '}{problem.context.turn}巡目
          </span>
        </div>

        {/* 表示モード切替 */}
        <div className="inline-flex bg-[#EAE4D7] p-0.5 rounded-lg text-xs border border-[#D5CEBE]">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
              viewMode === 'table'
                ? 'bg-[#FBF9F4] text-[#262422] shadow-xs'
                : 'text-[#5C5549] hover:text-[#262422]'
            }`}
          >
            卓上配置
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
              viewMode === 'list'
                ? 'bg-[#FBF9F4] text-[#262422] shadow-xs'
                : 'text-[#5C5549] hover:text-[#262422]'
            }`}
          >
            一覧表示
          </button>
        </div>
      </div>

      {/* 1. 卓上配置（実戦の麻雀卓全景） */}
      {viewMode === 'table' && (
        <div className="w-full overflow-x-auto pb-1 flex justify-start sm:justify-center">
          <div className="w-full max-w-[640px] rounded-2xl p-2 sm:p-4 bg-[#0e3b1c] border border-[#0a2c15] shadow-inner">
            <div className="relative rounded-xl p-2 sm:p-3 bg-[#135028] border border-emerald-500/25 flex flex-col items-center gap-2 sm:gap-3 shadow-inner">
              {/* 対面（上） */}
              <div className="w-full flex justify-center">
                {renderBoardRiver(seats.toimen)}
              </div>

              {/* 中央段（上家・中央ボックス・下家） */}
              <div className="w-full flex items-center justify-between gap-1 sm:gap-2">
                {/* 上家（左） */}
                <div className="flex-1 flex justify-center">
                  {renderBoardRiver(seats.kami)}
                </div>

                {/* センターボックス（サイコロ部・王牌・供託） */}
                <div className="shrink-0 w-24 sm:w-36 p-1.5 sm:p-2 rounded-xl bg-[#0b3318] border border-amber-500/50 flex flex-col items-center justify-center text-center gap-1 sm:gap-1.5 shadow-md text-white">
                  <div className="px-2 py-0.5 bg-black/50 rounded text-[9px] sm:text-[11px] font-bold tracking-tight">
                    {problem.context.round}
                    {problem.context.honba && problem.context.honba > 0 ? ` ${problem.context.honba}本場` : ''}
                    {' '}{problem.context.turn}巡目
                  </div>

                  {/* ドラ表示牌（最大5枚対応） */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] sm:text-[9px] text-zinc-300 font-medium">
                      ドラ表示牌{doraTiles.length > 1 ? ` (${doraTiles.length})` : ''}
                    </span>
                    <div className="flex items-center gap-0.5 justify-center flex-wrap max-w-full">
                      {doraTiles.map((dt, idx) => (
                        <MahjongTile key={`tv-dora-${dt}-${idx}`} tileId={dt} size="xs" disabled />
                      ))}
                    </div>
                  </div>

                  {/* 本場（積み棒）表示 */}
                  {problem.context.honba && problem.context.honba > 0 ? (
                    <div className="flex items-center gap-1 bg-amber-600/95 text-white px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shadow-2xs">
                      <img src="/pai-images/tennbou-000.png" alt="本場" className="h-1.5 sm:h-2 w-auto rotate-90" />
                      <span>{problem.context.honba}本場 (+{problem.context.honba * 300})</span>
                    </div>
                  ) : null}

                  {reachCount > 0 ? (
                    <div className="flex items-center gap-1 bg-rose-600/95 text-white px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shadow-2xs">
                      <img
                        src="/pai-images/tennbou-001.png"
                        alt="供託"
                        className="h-1.5 sm:h-2 w-auto rotate-90"
                      />
                      <span>供託 {reachCount * 1000}点</span>
                    </div>
                  ) : (
                    <span className="text-[7px] sm:text-[8px] text-zinc-400">供託なし</span>
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
              className={`p-3 rounded-xl border ${
                seat.isSelf
                  ? 'bg-[#E8EFF7] border-[#1E3A5F] shadow-xs'
                  : 'bg-[#F8F5EC] border-[#D5CEBE]'
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
