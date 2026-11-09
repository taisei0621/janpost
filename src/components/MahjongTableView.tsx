'use client';

import React, { useState } from 'react';
import { Problem, PlayerSituation, DiscardTile } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';
import { MahjongRiver } from './MahjongRiver';

interface MahjongTableViewProps {
  problem: Problem;
}

const WIND_ORDER = ['東家', '南家', '西家', '北家'] as const;
type WindType = typeof WIND_ORDER[number];

export const MahjongTableView: React.FC<MahjongTableViewProps> = ({ problem }) => {
  const [viewMode, setViewMode] = useState<'table' | 'all' | 'focus'>('table');
  const [focusWind, setFocusWind] = useState<WindType>('東家');

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

  // リーチ者がいるか判定（供託リーチ棒の表示）
  const reachCount = Object.values(players).filter((p) => p?.isReach).length;

  // 1家分の河ミニプレイヤー情報ブロック
  const renderPlayerHeader = (seat: { wind: WindType; label: string; isSelf: boolean }) => {
    const p = players[seat.wind];
    const sc = scores?.[seat.wind];
    const selfScore = scores?.[selfWind] || 25000;
    const diff = sc !== undefined ? sc - selfScore : 0;

    return (
      <div className="flex items-center justify-between text-xs px-2 py-1 bg-black/40 rounded border border-emerald-800/60 text-emerald-100">
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
            seat.isSelf ? 'bg-blue-600 text-white' : 'bg-emerald-800/80 text-emerald-200'
          }`}>
            {seat.wind} ({seat.label})
          </span>
          {p?.isReach && (
            <span className="inline-flex items-center gap-0.5 bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">
              <img src="/pai-images/tennbou-001.png" alt="立直" className="h-2 w-auto rotate-90" />
              立直
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {p?.melds && p.melds.length > 0 && (
            <span className="text-[10px] text-amber-300 font-medium">
              副露: {p.melds.join(' ')}
            </span>
          )}
          {sc !== undefined && (
            <div className="font-mono text-right">
              <span className="font-bold">{sc.toLocaleString()}</span>
              {!seat.isSelf && (
                <span className={`ml-1 text-[9px] ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {diff >= 0 ? `+${diff}` : diff}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0a2f1c] rounded-2xl border-2 border-[#1b5e39] shadow-2xl p-3 sm:p-5 text-zinc-100 space-y-4">
      {/* 盤面ヘッダー＆ビュー切り替え */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1b5e39]/80">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">🀄</span>
          <div>
            <h4 className="font-black text-sm sm:text-base text-emerald-100 tracking-wide flex items-center gap-2">
              <span>全対局盤面（真上からの卓俯瞰ビュー）</span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-800/80 text-emerald-200 rounded-full font-mono">
                {problem.context.round} {problem.context.turn}巡目
              </span>
            </h4>
            <p className="text-[11px] text-emerald-300/80">
              ※薄暗い牌 = ツモ切り / 通常 = 手出し / 横向き牌 = リーチ宣言
            </p>
          </div>
        </div>

        {/* 視点切り替えボタン */}
        <div className="flex items-center bg-black/50 p-1 rounded-lg border border-emerald-800/60 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            🀄 雀卓俯瞰
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            📋 4家一括リスト
          </button>
          <button
            type="button"
            onClick={() => setViewMode('focus')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'focus'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            📑 個別フォーカス
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 視点 1: 🀄 雀卓俯瞰ビュー（真上から卓を見下ろす実戦視点） */}
      {/* ========================================================= */}
      {viewMode === 'table' && (
        <div className="relative w-full bg-radial from-[#0e4429] to-[#061d11] rounded-xl border border-emerald-700/60 p-3 sm:p-4 overflow-x-auto">
          <div className="min-w-[340px] max-w-2xl mx-auto space-y-3">
            {/* 1. 対面（上） */}
            <div className="bg-black/30 p-2 sm:p-2.5 rounded-lg border border-emerald-800/50 space-y-1.5">
              {renderPlayerHeader(seats.toimen)}
              <MahjongRiver
                discards={players[seats.toimen.wind]?.discards || []}
                isReach={players[seats.toimen.wind]?.isReach}
                interactive={false}
              />
            </div>

            {/* 2. 中央部（上家・センターボックス・下家） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 上家（左） */}
              <div className="bg-black/30 p-2 sm:p-2.5 rounded-lg border border-emerald-800/50 space-y-1.5">
                {renderPlayerHeader(seats.kami)}
                <MahjongRiver
                  discards={players[seats.kami.wind]?.discards || []}
                  isReach={players[seats.kami.wind]?.isReach}
                  interactive={false}
                />
              </div>

              {/* 下家（右） */}
              <div className="bg-black/30 p-2 sm:p-2.5 rounded-lg border border-emerald-800/50 space-y-1.5">
                {renderPlayerHeader(seats.shimo)}
                <MahjongRiver
                  discards={players[seats.shimo.wind]?.discards || []}
                  isReach={players[seats.shimo.wind]?.isReach}
                  interactive={false}
                />
              </div>
            </div>

            {/* 卓の中央サイコロボックス（センターインフォ） */}
            <div className="py-2 px-4 bg-black/60 rounded-xl border border-amber-500/40 flex flex-wrap items-center justify-around gap-3 text-xs shadow-inner">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">場況:</span>
                <span className="font-black text-white px-2 py-0.5 bg-emerald-900 rounded border border-emerald-700">
                  {problem.context.round} ({problem.context.turn}巡目)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-amber-300">ドラ表示牌:</span>
                <MahjongTile tileId={problem.context.dora} size="xs" disabled />
              </div>

              {reachCount > 0 && (
                <div className="flex items-center gap-1.5 bg-red-950/80 px-2 py-0.5 rounded border border-red-700/80 text-red-200 font-bold">
                  <img src="/pai-images/tennbou-001.png" alt="供託" className="h-3 w-auto rotate-90" />
                  <span>供託: {reachCount * 1000}点</span>
                </div>
              )}
            </div>

            {/* 3. 自家（下・手前） */}
            <div className="bg-blue-950/30 p-2 sm:p-2.5 rounded-lg border-2 border-blue-500/50 space-y-1.5 shadow-md">
              {renderPlayerHeader(seats.self)}
              <MahjongRiver
                discards={players[seats.self.wind]?.discards || []}
                isReach={players[seats.self.wind]?.isReach}
                interactive={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 視点 2: 📋 4家一括リスト（全員分の河を縦に並べて一度に見る） */}
      {/* ========================================================= */}
      {viewMode === 'all' && (
        <div className="space-y-4 animate-fade-in">
          {WIND_ORDER.map((w) => {
            const isSelf = w === selfWind;
            const seatLabel = isSelf ? '自家（あなた）' : w === seats.toimen.wind ? '対面' : w === seats.shimo.wind ? '下家' : '上家';
            const p = players[w];
            if (!p) return null;

            return (
              <div
                key={`all-river-${w}`}
                className={`p-3 rounded-xl border ${
                  isSelf
                    ? 'bg-blue-950/20 border-blue-500/40'
                    : 'bg-black/20 border-emerald-800/40'
                } space-y-2`}
              >
                {renderPlayerHeader({ wind: w, label: seatLabel, isSelf })}
                <MahjongRiver
                  discards={p.discards}
                  isReach={p.isReach}
                  interactive={false}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 視点 3: 📑 個別フォーカス（特定の1人をじっくり拡大） */}
      {/* ========================================================= */}
      {viewMode === 'focus' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-lg border border-emerald-800/60 overflow-x-auto">
            {WIND_ORDER.map((w) => {
              const isSelf = w === selfWind;
              const p = players[w];
              return (
                <button
                  key={`focus-tab-${w}`}
                  type="button"
                  onClick={() => setFocusWind(w)}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer ${
                    focusWind === w
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-black/20 text-emerald-300 hover:text-white'
                  }`}
                >
                  <span>{w}</span>
                  {isSelf && <span className="ml-1 text-[10px] text-amber-300">(自家)</span>}
                  {p?.isReach && <span className="ml-1 text-[9px] text-red-400">立直</span>}
                </button>
              );
            })}
          </div>

          {players[focusWind] && (
            <div className="space-y-2">
              {renderPlayerHeader({
                wind: focusWind,
                label: focusWind === selfWind ? '自家' : '他家',
                isSelf: focusWind === selfWind,
              })}
              <MahjongRiver
                discards={players[focusWind].discards}
                windLabel={focusWind}
                isReach={players[focusWind].isReach}
                interactive={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
