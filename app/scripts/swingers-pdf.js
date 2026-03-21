#!/usr/bin/env node
/**
 * Generate Swingers of the Week PDF for March 2026 CBB season.
 * Usage: node scripts/swingers-pdf.js [baseUrl]
 * Produces an HTML file, then converts to PDF via weasyprint.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:4000';

// March 2026 weeks (Mon–Sun)
const WEEKS = [
  { start: '2026-03-02', end: '2026-03-08', date: '20260302' },
  { start: '2026-03-09', end: '2026-03-15', date: '20260309' },
  { start: '2026-03-16', end: '2026-03-22', date: '20260316' },
];

async function fetchWeek(dateStr) {
  const res = await fetch(`${BASE}/api/analysis/swingers-of-the-week?date=${dateStr}`);
  return res.json();
}

function rankBadge(i) {
  if (i === 0) return '<span class="rank gold">1</span>';
  if (i === 1) return '<span class="rank silver">2</span>';
  return '<span class="rank bronze">3</span>';
}

function tierLabel(impact) {
  if (impact >= 305) return '<span class="tier tier-elite">Elite</span>';
  if (impact >= 255) return '<span class="tier tier-excellent">Excellent</span>';
  if (impact >= 215) return '<span class="tier tier-above">Above Avg</span>';
  if (impact >= 175) return '<span class="tier tier-avg">Average</span>';
  return '<span class="tier tier-below">Below Avg</span>';
}

function playerRow(p, i) {
  const jersey = p.jersey ? `#${p.jersey}` : '';
  const clutch = p.clutchGames > 0 ? '<span class="clutch">CLUTCH</span>' : '';
  const cs = p.confStrength != null ? p.confStrength : 1;
  const raw = p.rawAvgWeightedImpact || p.avgWeightedImpact;
  return `
    <tr>
      <td class="rank-cell">${rankBadge(i)}</td>
      <td class="player-cell">
        <span class="player-name">${p.player}</span>
        <span class="player-meta">${jersey} &middot; ${p.team}</span>
        ${clutch}
        ${tierLabel(p.avgWeightedImpact)}
      </td>
      <td class="stat">${p.avgWeightedImpact}</td>
      <td class="stat-small">${raw !== p.avgWeightedImpact ? raw + ' &times;' + cs : '–'}</td>
      <td class="stat">${p.avgEfficiency}%</td>
      <td class="stat">${p.gamesPlayed}</td>
    </tr>`;
}

function conferenceSection(confName, players) {
  if (!players || players.length === 0) return '';
  return `
    <div class="conference">
      <h3>${confName}</h3>
      <table>
        <thead>
          <tr>
            <th style="width:30px"></th>
            <th class="left">Player</th>
            <th>Adj Impact</th>
            <th>Raw &times; Conf</th>
            <th>Efficiency</th>
            <th>Games</th>
          </tr>
        </thead>
        <tbody>
          ${players.map((p, i) => playerRow(p, i)).join('')}
        </tbody>
      </table>
    </div>`;
}

function weekSection(weekData, weekLabel) {
  const confs = weekData.conferences || {};
  const confNames = Object.keys(confs).sort();
  if (confNames.length === 0) return '';

  return `
    <div class="week-section">
      <h2>${weekLabel}</h2>
      <p class="week-dates">${weekData.week.start} &mdash; ${weekData.week.end}</p>
      <div class="conferences-grid">
        ${confNames.map((c) => conferenceSection(c, confs[c])).join('')}
      </div>
    </div>`;
}

async function main() {
  console.log('Fetching swingers data for March 2026...');
  const weeks = [];
  for (const w of WEEKS) {
    const data = await fetchWeek(w.date);
    const confCount = Object.keys(data.conferences || {}).length;
    console.log(`  Week ${w.start}: ${confCount} conferences`);
    if (confCount > 0) weeks.push({ data, label: `Week of ${w.start}` });
  }

  if (weeks.length === 0) {
    console.error('No data found. Run backfill first.');
    process.exit(1);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: letter;
    margin: 0.6in 0.5in;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9px;
      color: #8494a7;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #222;
    font-size: 11px;
    line-height: 1.4;
  }
  .cover {
    text-align: center;
    padding: 2in 0.5in 1in;
    page-break-after: always;
  }
  .cover h1 {
    font-size: 36px;
    color: #001c55;
    margin-bottom: 8px;
    letter-spacing: 2px;
  }
  .cover .subtitle {
    font-size: 18px;
    color: #1493ff;
    font-weight: 600;
    margin-bottom: 40px;
  }
  .cover .season {
    font-size: 14px;
    color: #6b7c93;
    margin-bottom: 6px;
  }
  .cover .description {
    font-size: 11px;
    color: #8494a7;
    max-width: 400px;
    margin: 30px auto 0;
    line-height: 1.6;
  }
  .week-section {
    page-break-before: always;
  }
  .week-section:first-of-type {
    page-break-before: avoid;
  }
  h2 {
    font-size: 18px;
    color: #001c55;
    border-bottom: 2px solid #1493ff;
    padding-bottom: 4px;
    margin-bottom: 2px;
  }
  .week-dates {
    font-size: 11px;
    color: #6b7c93;
    margin-bottom: 14px;
  }
  .conferences-grid {
    columns: 2;
    column-gap: 20px;
  }
  .conference {
    break-inside: avoid;
    margin-bottom: 14px;
  }
  .conference h3 {
    font-size: 11px;
    font-weight: 800;
    color: #001c55;
    background: #eaf0f6;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    letter-spacing: 0.3px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  thead th {
    font-size: 8px;
    text-transform: uppercase;
    color: #8494a7;
    font-weight: 700;
    padding: 2px 4px;
    text-align: center;
    letter-spacing: 0.5px;
  }
  thead th.left { text-align: left; }
  tbody td {
    padding: 3px 4px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }
  .rank-cell { text-align: center; width: 24px; }
  .rank {
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 800;
    color: #fff;
  }
  .gold { background: #FFD700; color: #333; }
  .silver { background: #aab7c4; }
  .bronze { background: #cd7f32; }
  .player-cell { text-align: left; }
  .player-name {
    font-weight: 700;
    font-size: 11px;
    color: #222;
  }
  .player-meta {
    font-size: 9px;
    color: #6b7c93;
    margin-left: 4px;
  }
  .clutch {
    font-size: 7px;
    font-weight: 800;
    color: #C0392B;
    border: 1px solid #C0392B;
    border-radius: 2px;
    padding: 0 2px;
    margin-left: 4px;
    vertical-align: middle;
  }
  .stat {
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    font-weight: 600;
    color: #333;
  }
  .stat-small {
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 8px;
    color: #8494a7;
  }
  .tier {
    font-size: 7px;
    font-weight: 800;
    border-radius: 2px;
    padding: 0 3px;
    margin-left: 4px;
    vertical-align: middle;
    border: 1px solid;
  }
  .tier-elite { color: #C0392B; border-color: #C0392B; }
  .tier-excellent { color: #E67E22; border-color: #E67E22; }
  .tier-above { color: #1493ff; border-color: #1493ff; }
  .tier-avg { color: #6b7c93; border-color: #6b7c93; }
  .tier-below { color: #8494a7; border-color: #8494a7; }
  .footer-note {
    margin-top: 30px;
    text-align: center;
    font-size: 9px;
    color: #8494a7;
  }
</style>
</head>
<body>

<div class="cover">
  <h1>THE SWING</h1>
  <div class="subtitle">Swingers of the Week</div>
  <div class="season">NCAA Division I Men's Basketball</div>
  <div class="season">March 2026</div>
  <div class="description">
    The top 3 momentum-shifting players per conference each week,
    ranked by average magnitude-weighted swing impact per game.
    Players earn the CLUTCH badge for driving momentum shifts in
    the final 5 minutes with the score within 12 points.
  </div>
</div>

${weeks.map((w) => weekSection(w.data, w.label)).join('')}

<div class="footer-note">
  Generated by The Swing &middot; ${new Date().toISOString().slice(0, 10)}
</div>

</body>
</html>`;

  const htmlPath = path.join(__dirname, '..', 'swingers-of-the-week-march-2026.html');
  const pdfPath = path.join(__dirname, '..', 'swingers-of-the-week-march-2026.pdf');

  fs.writeFileSync(htmlPath, html);
  console.log(`HTML written to ${htmlPath}`);

  console.log('Converting to PDF with weasyprint...');
  execSync(`weasyprint "${htmlPath}" "${pdfPath}"`, { stdio: 'inherit' });
  console.log(`PDF generated: ${pdfPath}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
