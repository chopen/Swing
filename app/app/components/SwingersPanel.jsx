'use client';

import { useState, useRef, useCallback } from 'react';

function ImpactBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(Math.abs(value) / max * 100, 100) : 0;
  return (
    <div className="bg-[#ebebeb] rounded-full overflow-hidden" style={{ height: '4px', width: '100%' }}>
      <div
        className="rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: color, height: '100%' }}
      />
    </div>
  );
}

function PlayerRow({ player, maxImpact, color }) {
  const isClutch = player.clutchAppearances > 0;
  const [showTip, setShowTip] = useState(false);
  const timerRef = useRef(null);

  const openTip = useCallback(() => {
    setShowTip(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowTip(false), 3000);
  }, []);

  const closeTip = useCallback(() => {
    clearTimeout(timerRef.current);
    setShowTip(false);
  }, []);

  const jerseyLabel = player.jersey ? `#${player.jersey}` : '';
  const tipText = [player.player, jerseyLabel].filter(Boolean).join(' · ');

  return (
    <div style={{ padding: '4px 0', position: 'relative' }}>
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-sm font-semibold text-[#333] truncate cursor-pointer"
          onClick={openTip}
          onMouseEnter={openTip}
          onMouseLeave={closeTip}
        >
          {player.player}
        </span>
        {isClutch && (
          <span
            title={`${player.clutchPositive}/${player.clutchAppearances} clutch swing plays`}
            className="shrink-0"
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: '#C0392B',
              border: '1.5px solid #C0392B',
              borderRadius: '3px',
              padding: '0 3px',
              lineHeight: '14px',
            }}
          >
            CLUTCH
          </span>
        )}
        <span className="font-mono text-xs text-[#555] shrink-0 ml-auto" title="Efficiency: positive plays / swing appearances">
          {player.weightedImpact > 0 ? '+' : ''}{player.weightedImpact} · {player.efficiency}%
        </span>
      </div>
      {showTip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: '4px',
            backgroundColor: '#001c55',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          {tipText}
        </div>
      )}
      <ImpactBar value={player.weightedImpact} max={maxImpact} color={color} />
    </div>
  );
}

export default function SwingersPanel({ swingers, awayAbbr, homeAbbr, awayColor, homeColor }) {
  const [open, setOpen] = useState(false);

  if (!swingers?.away?.length && !swingers?.home?.length) return null;

  const awayPlayers = swingers.away || [];
  const homePlayers = swingers.home || [];
  const allImpacts = [...awayPlayers, ...homePlayers].map((p) => Math.abs(p.weightedImpact));
  const maxImpact = Math.max(...allImpacts, 1);
  const totalCount = awayPlayers.length + homePlayers.length;

  return (
    <>
      <div
        className="flex items-center justify-between py-3 border-t border-[#f0f0f0] cursor-pointer select-none transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-[#1493ff]">
          {open ? '\u25BE' : '\u25B8'} Swingers - Live In Game{' '}<span className="text-[#8494a7]">({totalCount})</span>
        </span>
        <span
          className="text-sm text-[#8494a7] inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#x25BE;
        </span>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-3 pb-2" style={{ borderLeft: '2px solid #dce6f0', paddingLeft: '10px', marginBottom: '2px', background: '#f8fafc', borderRadius: '0 0 6px 6px' }}>
          {/* Away swingers */}
          <div>
            <div
              className="text-xs font-bold tracking-wide mb-1"
              style={{ color: awayColor }}
            >
              {awayAbbr}
            </div>
            {awayPlayers.length > 0 ? (
              awayPlayers.map((p, i) => (
                <PlayerRow key={i} player={p} maxImpact={maxImpact} color={awayColor} />
              ))
            ) : (
              <span className="text-xs text-[#8494a7]">No swing plays</span>
            )}
          </div>
          {/* Home swingers */}
          <div>
            <div
              className="text-xs font-bold tracking-wide mb-1 text-right"
              style={{ color: homeColor }}
            >
              {homeAbbr}
            </div>
            {homePlayers.length > 0 ? (
              homePlayers.map((p, i) => (
                <PlayerRow key={i} player={p} maxImpact={maxImpact} color={homeColor} />
              ))
            ) : (
              <span className="text-xs text-[#8494a7]">No swing plays</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
