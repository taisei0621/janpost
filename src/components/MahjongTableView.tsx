'use client';

import React, { useState } from 'react';
import { Problem, PlayerSituation, DiscardTile } from '../types/mahjong';
import { MahjongTile } from './MahjongTile';

interface MahjongTableViewProps {
  problem: Problem;
}

const WIND_ORDER = ['東家', '南家', '西家', '北家'] as const;
type WindType = typeof WIND_ORDER[number];
type TableTheme = 'green' | 'white' | 'blue';

export const MahjongTableView: React.FC<MahjongTableViewProps> = ({ problem }) => {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  const [theme, setTheme] = useState<TableTheme>('green');

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

  // テーマ別カラー設定（明るく見やすい配色）
  const themeStyles = {
    green: {
      outerBg: 'bg-[#1f7a46]',
      matBg: 'bg-[#22864d]',
      borderColor: 'border-[#145630]',
      innerBorder: 'border-white/25',
      slotBorder: 'border-emerald-200/40 text-emerald-100/50',
      textColor: 'text-white',
      subTextColor: 'text-emerald-100',
      centerBg: 'bg-[#155431] border-amber-400/80 text-amber-100 shadow-xl',
      chipBg: 'bg-black/45 text-white border-white/20',
      riverMatBg: 'bg-[#1a663b]/70 border-emerald-400/30',
    },
    white: {
      outerBg: 'bg-slate-200',
      matBg: 'bg-slate-50',
      borderColor: 'border-slate-300',
      innerBorder: 'border-slate-300',
      slotBorder: 'border-slate-300 text-slate-400',
      textColor: 'text-zinc-900',
      subTextColor: 'text-zinc-600',
      centerBg: 'bg-white border-blue-500/80 text-zinc-900 shadow-md',
      chipBg: 'bg-white text-zinc-800 border-zinc-300 shadow-xs',
      riverMatBg: 'bg-slate-100/90 border-slate-200',
    },
    blue: {
      outerBg: 'bg-[#1e40af]',
      matBg: 'bg-[#1d4ed8]',
      borderColor: 'border-[#1e3a8a]',
      innerBorder: 'border-white/25',
      slotBorder: 'border-blue-200/40 text-blue-100/50',
      textColor: 'text-white',
      subTextColor: 'text-blue-100',
      centerBg: 'bg-[#1e3a8a] border-amber-400/80 text-amber-100 shadow-xl',
      chipBg: 'bg-black/45 text-white border-white/20',
      riverMatBg: 'bg-[#1e3a8a]/70 border-blue-300/30',
    },
  }[theme];

  // 卓内専用・6枚×3段の一体型河コンポーネント
  const renderBoardRiver = (seat: { wind: WindType; label: string; isSelf: boolean }) => {
    const p = players[seat.wind];
    const discards = p?.discards || [];
    const sc = scores?.[seat.wind];
    const selfScore = scores?.[selfWind] || 25000;
    const diff = sc !== undefined ? sc - selfScore : 0;

    // 6枚×3段
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
        <div
          className={`mb-1 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-xs border ${
            seat.isSelf
              ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-300/60'
              : themeStyles.chipBg
          }`}
        >
          <span className="font-black">{seat.wind}</span>
          <span className="text-[10px] opacity-85">({seat.label})</span>
          {p?.isReach && (
            <span className="inline-flex items-center gap-0.5 bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-bold shadow-xs">
              <img src="/pai-images/tennbou-001.png" alt="立直" className="h-2 w-auto rotate-90" />
              立直
            </span>
          )}
          {sc !== undefined && (
            <span className="font-mono ml-0.5">
              {sc.toLocaleString()}
              {!seat.isSelf && (
                <span className={`ml-1 text-[9px] ${diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {diff >= 0 ? `+${diff}` : diff}
                </span>
              )}
            </span>
          )}
        </div>

        {/* 鳴き（副露）表示 */}
        {p?.melds && p.melds.length > 0 && (
          <div className="mb-1 text-[10px] bg-amber-400 text-amber-950 font-bold px-2 py-0.2 rounded-md shadow-xs flex items-center gap-1">
            <span>鳴き:</span>
            <span>{p.melds.join(' ')}</span>
          </div>
        )}

        {/* 6枚×3段の河本体 */}
        <div className={`p-1 rounded-lg border shadow-inner ${themeStyles.riverMatBg}`}>
          <div className="flex flex-col gap-1">
            {rows.map((rowTiles, rIdx) => (
              <div key={`river-row-${seat.wind}-${rIdx}`} className="flex items-center gap-1 justify-center">
                {rowTiles.map((t, cIdx) => {
                  const globalIdx = rIdx * 6 + cIdx;
                  const isTileReach = t.isReach || (p?.isReach && globalIdx === discards.length - 1);
                  return (
                    <MahjongTile
                      key={`bt-${seat.wind}-${globalIdx}`}
                      tileId={t.tileId}
                      size="xs"
                      isTsumogiri={t.isTsumogiri}
                      isReach={isTileReach}
                    />
                  );
                })}
                {/* 6枚に満たない空きスロット（点線枠） */}
                {Array.from({ length: Math.max(0, 6 - rowTiles.length) }).map((_, slotIdx) => (
                  <div
                    key={`slot-${seat.wind}-${rIdx}-${slotIdx}`}
                    className={`w-[24px] h-[33px] border border-dashed rounded-[2px] flex items-center justify-center text-[9px] select-none ${themeStyles.slotBorder}`}
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
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-3 sm:p-5 space-y-4">
      {/* 盤面コントローラー（ヘッダー・テーマ切替・視点切替） */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🀄</span>
            <span>麻雀卓・全景俯瞰ビュー（真上からの対局視点）</span>
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            ※手前に自家、奥に対面、左右に上家・下家が配置された本物の麻雀卓です
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* マットカラー切り替え */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold px-1.5">マット色:</span>
            <button
              type="button"
              onClick={() => setTheme('green')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                theme === 'green'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              🌿 緑卓
            </button>
            <button
              type="button"
              onClick={() => setTheme('white')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                theme === 'white'
                  ? 'bg-zinc-700 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              ⚪ 白卓
            </button>
            <button
              type="button"
              onClick={() => setTheme('blue')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                theme === 'blue'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              🔷 青卓
            </button>
          </div>

          {/* ビュー切り替え */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300'
              }`}
            >
              🀄 雀卓全景
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                viewMode === 'list'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300'
              }`}
            >
              📋 縦スクロール
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. 🀄 雀卓全景俯瞰ビュー（1枚のマットの上に4人の河とセンターボックスが一体化） */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="w-full overflow-x-auto pb-2 flex justify-center">
          {/* 本物の麻雀卓（木目枠・ラシャマット調） */}
          <div
            className={`min-w-[560px] max-w-[660px] w-full rounded-2xl p-4 sm:p-5 shadow-2xl border-4 ${themeStyles.outerBg} ${themeStyles.borderColor} transition-colors duration-200`}
          >
            {/* 卓内の白線フェルトエリア（四方と中央を一体化） */}
            <div
              className={`relative rounded-xl p-3 border-2 ${themeStyles.matBg} ${themeStyles.innerBorder} shadow-inner flex flex-col items-center gap-3`}
            >
              {/* ① 対面（上・奥） */}
              <div className="w-full flex justify-center">
                {renderBoardRiver(seats.toimen)}
              </div>

              {/* ② 中央段（左: 上家 / 中央: サイコロボックス / 右: 下家） */}
              <div className="w-full flex items-center justify-between gap-2">
                {/* 左: 上家 */}
                <div className="flex-1 flex justify-center">
                  {renderBoardRiver(seats.kami)}
                </div>

                {/* 中央: サイコロボックス（場況・巡目・ドラ表示牌・供託） */}
                <div
                  className={`shrink-0 w-36 sm:w-40 p-2.5 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-1.5 select-none ${themeStyles.centerBg}`}
                >
                  {/* 場況 */}
                  <div className="px-2.5 py-0.5 bg-black/50 text-white rounded-md text-[11px] font-black tracking-wide border border-white/10">
                    {problem.context.round}・{problem.context.turn}巡目
                  </div>

                  {/* ドラ表示牌 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold tracking-tight opacity-80">
                      ドラ表示牌
                    </span>
                    <MahjongTile tileId={problem.context.dora} size="xs" disabled />
                  </div>

                  {/* 供託リーチ棒 */}
                  {reachCount > 0 ? (
                    <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs">
                      <img
                        src="/pai-images/tennbou-001.png"
                        alt="供託リーチ棒"
                        className="h-2 w-auto rotate-90"
                      />
                      <span>供託: {reachCount * 1000}点</span>
                    </div>
                  ) : (
                    <span className="text-[8px] opacity-60">供託なし</span>
                  )}
                </div>

                {/* 右: 下家 */}
                <div className="flex-1 flex justify-center">
                  {renderBoardRiver(seats.shimo)}
                </div>
              </div>

              {/* ③ 自家（下・手前・あなた） */}
              <div className="w-full flex justify-center">
                {renderBoardRiver(seats.self)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 📋 縦スクロール一括ビュー（スマホや一覧重視向け） */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-4 animate-fade-in">
          {/* 中央サマリー */}
          <div className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              {problem.context.round} {problem.context.turn}巡目
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-500">ドラ:</span>
              <MahjongTile tileId={problem.context.dora} size="xs" disabled />
            </div>
            {reachCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                供託 {reachCount * 1000}点
              </span>
            )}
          </div>

          {/* 4家縦並び */}
          {[seats.self, seats.kami, seats.toimen, seats.shimo].map((seat) => (
            <div
              key={`list-seat-${seat.wind}`}
              className={`p-3 rounded-xl border ${
                seat.isSelf
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-400'
                  : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'
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
