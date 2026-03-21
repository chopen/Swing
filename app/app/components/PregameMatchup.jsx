'use client';

import { useState } from 'react';

function mvixColor(v) {
  if (v < 40) return '#00C853';
  if (v > 65) return '#C0392B';
  return '#FFD700';
}

function mrviColor(v) {
  if (v > 55) return '#00C853';
  if (v < 45) return '#C0392B';
  return '#FFD700';
}

function StatRow({ label, awayVal, homeVal, colorFn }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '2px 0' }}>
      <span className="font-mono text-xs font-bold" style={{ color: colorFn ? colorFn(awayVal) : '#555', minWidth: '32px' }}>
        {awayVal}
      </span>
      <span className="text-xs text-[#8494a7] flex-1 text-center">{label}</span>
      <span className="font-mono text-xs font-bold text-right" style={{ color: colorFn ? colorFn(homeVal) : '#555', minWidth: '32px' }}>
        {homeVal}
      </span>
    </div>
  );
}

export default function PregameMatchup({ rolling3Away, rolling3Home, awayAbbr, homeAbbr, awayColor, homeColor }) {
  const [open, setOpen] = useState(false);

  const hasAway = rolling3Away && (rolling3Away.mvix != null || rolling3Away.mrvi != null);
  const hasHome = rolling3Home && (rolling3Home.mvix != null || rolling3Home.mrvi != null);
  if (!hasAway && !hasHome) return null;

  const awayGames = rolling3Away?.games || 0;
  const homeGames = rolling3Home?.games || 0;
  const gamesLabel = awayGames === homeGames ? `Last ${awayGames}gm` : 'Recent';

  return (
    <>
      <div
        className="flex items-center justify-between py-3 border-t border-[#f0f0f0] cursor-pointer select-none transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-[#6b7c93]">
          {open ? '\u25BE' : '\u25B8'} Pregame Matchup
        </span>
        <span
          className="text-sm text-[#8494a7] inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#x25BE;
        </span>
      </div>
      {open && (
        <div style={{ paddingBottom: '4px' }}>
          {/* Team header row */}
          <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
            <span className="text-xs font-bold tracking-wide" style={{ color: awayColor }}>{awayAbbr}</span>
            <span className="text-xs text-[#8494a7]">{gamesLabel}</span>
            <span className="text-xs font-bold tracking-wide" style={{ color: homeColor }}>{homeAbbr}</span>
          </div>
          {/* MVIX */}
          {(rolling3Away?.mvix != null || rolling3Home?.mvix != null) && (
            <StatRow
              label="MVIX"
              awayVal={rolling3Away?.mvix ?? '–'}
              homeVal={rolling3Home?.mvix ?? '–'}
              colorFn={(v) => v === '–' ? '#8494a7' : mvixColor(v)}
            />
          )}
          {/* MRVI */}
          {(rolling3Away?.mrvi != null || rolling3Home?.mrvi != null) && (
            <StatRow
              label="MRVI"
              awayVal={rolling3Away?.mrvi != null ? Math.round(rolling3Away.mrvi) : '–'}
              homeVal={rolling3Home?.mrvi != null ? Math.round(rolling3Home.mrvi) : '–'}
              colorFn={(v) => v === '–' ? '#8494a7' : mrviColor(v)}
            />
          )}
        </div>
      )}
    </>
  );
}
