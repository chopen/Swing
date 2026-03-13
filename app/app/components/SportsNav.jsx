'use client';

import { useState, useRef } from 'react';

const SPORTS = ['Basketball', 'Baseball', 'Football', 'Soccer', 'Hockey', 'More Sports'];

export default function SportsNav() {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);

  const handleClick = (sport, i) => {
    if (i === 0) return;
    setTooltip(sport);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltip(null), 4000);
  };

  return (
    <div className="sports-nav" style={{
      background: '#001c55',
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      overflow: 'visible',
      scrollbarWidth: 'none',
      borderBottom: '1px solid #0a2a6e',
      padding: '0 24px',
    }}>
      {SPORTS.map((sport, i) => (
        <div key={sport} style={{ position: 'relative' }}>
          <button
            onClick={() => handleClick(sport, i)}
            style={{
              background: i === 0 ? '#1493ff' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: i === 0 ? 700 : 500,
              cursor: i === 0 ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif",
              borderBottom: i === 0 ? '2px solid #fff' : '2px solid transparent',
              opacity: i === 0 ? 1 : 0.7,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { if (i !== 0) e.target.style.opacity = 1; }}
            onMouseLeave={(e) => { if (i !== 0) e.target.style.opacity = 0.7; }}
          >
            {sport}
          </button>
          {tooltip === sport && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1493ff',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              zIndex: 9999,
              marginTop: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Coming Soon
              <div style={{
                position: 'absolute',
                top: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #1493ff',
              }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
