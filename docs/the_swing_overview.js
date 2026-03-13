const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak
} = require('docx');
const fs = require('fs');

// ── BRAND COLORS ──────────────────────────────────────────────────────────────
const RED      = 'C0392B';
const ORANGE   = 'E67E22';
const YELLOW   = 'F1C40F';
const DARK_RED = '8B0000';
const DARK     = '1A1A1A';
const MED      = '444444';
const GRAY     = '666666';
const WHITE    = 'FFFFFF';
const LIGHT_BG = 'FEF0E7';
const WARM_BG  = 'FFF8F0';

// ── BORDER HELPERS ────────────────────────────────────────────────────────────
const noBorder  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const solidBorder = (c, sz=8) => ({ style: BorderStyle.SINGLE, size: sz, color: c });

// ── LAYOUT HELPERS ────────────────────────────────────────────────────────────
function spacer(after = 160) {
  return new Paragraph({ spacing: { before: 0, after }, children: [] });
}

function rule(color = ORANGE, size = 10) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    spacing: { before: 0, after: 160 },
    children: []
  });
}

function eyebrow(text) {
  return new Paragraph({
    spacing: { before: 320, after: 60 },
    children: [new TextRun({
      text: text.toUpperCase(),
      font: 'Arial', size: 17, bold: true,
      color: ORANGE, characterSpacing: 100
    })]
  });
}

function sectionTitle(text, color = DARK_RED) {
  return new Paragraph({
    spacing: { before: 40, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 42, bold: true, color })]
  });
}

function body(runs, after = 160) {
  return new Paragraph({
    spacing: { before: 0, after },
    children: runs.map(r => new TextRun({ font: 'Arial', size: 22, color: MED, ...r }))
  });
}

function bold(boldText, rest = '', after = 160) {
  return body([{ text: boldText, bold: true, color: DARK }, { text: rest }], after);
}

// ── CALLOUT BOX ───────────────────────────────────────────────────────────────
function callout(title, bodyText, bg = LIGHT_BG, accent = ORANGE) {
  const b = solidBorder(accent, 8);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: b, bottom: b, left: b, right: b },
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 180, bottom: 180, left: 220, right: 220 },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: title, font: 'Arial', size: 23, bold: true, color: accent })]
        }),
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: bodyText, font: 'Arial', size: 21, color: DARK })]
        })
      ]
    })]})],
  });
}

// ── QUOTE BLOCK ───────────────────────────────────────────────────────────────
function quoteBlock(quote, subtext) {
  const leftBar = solidBorder(YELLOW, 20);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: noBorder, bottom: noBorder, left: leftBar, right: noBorder },
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: WARM_BG, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 280, right: 160 },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 100 },
          children: [new TextRun({ text: quote, font: 'Arial', size: 26, bold: true, color: DARK_RED, italics: true })]
        }),
        ...(subtext ? [new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: subtext, font: 'Arial', size: 19, color: GRAY })]
        })] : [])
      ]
    })]})],
  });
}

// ── THREE COLUMN TABLE ────────────────────────────────────────────────────────
function threeCol(cols) {
  const cw = 2980; const gap = 210;
  const totalW = cw * 3 + gap * 2;
  const b = solidBorder(RED, 6);
  const borders = { top: b, bottom: b, left: b, right: b };
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: [cw, gap, cw, gap, cw],
    rows: [new TableRow({ children: cols.flatMap((col, i) => {
      const cells = [];
      if (i > 0) cells.push(new TableCell({
        borders: noBorders,
        width: { size: gap, type: WidthType.DXA },
        shading: { fill: WHITE, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [] })]
      }));
      cells.push(new TableCell({
        borders,
        width: { size: cw, type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 180, right: 180 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 80 },
            children: [new TextRun({ text: col.label, font: 'Arial', size: 21, bold: true, color: RED })]
          }),
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: col.body, font: 'Arial', size: 20, color: DARK })]
          })
        ]
      }));
      return cells;
    })})]
  });
}

// ── TWO COLUMN TABLE ──────────────────────────────────────────────────────────
function twoCol(left, right) {
  const hw = 4540; const gap = 280;
  const bL = solidBorder(ORANGE, 6);
  const bR = solidBorder(RED, 6);
  const bordersL = { top: bL, bottom: bL, left: bL, right: bL };
  const bordersR = { top: bR, bottom: bR, left: bR, right: bR };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [hw, gap, hw],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: bordersL,
        width: { size: hw, type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 180, right: 180 },
        children: [
          new Paragraph({ spacing: { before: 0, after: 80 },
            children: [new TextRun({ text: left.label, font: 'Arial', size: 21, bold: true, color: ORANGE })] }),
          new Paragraph({ spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: left.body, font: 'Arial', size: 20, color: DARK })] })
        ]
      }),
      new TableCell({
        borders: noBorders,
        width: { size: gap, type: WidthType.DXA },
        shading: { fill: WHITE, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [] })]
      }),
      new TableCell({
        borders: bordersR,
        width: { size: hw, type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 180, right: 180 },
        children: [
          new Paragraph({ spacing: { before: 0, after: 80 },
            children: [new TextRun({ text: right.label, font: 'Arial', size: 21, bold: true, color: RED })] }),
          new Paragraph({ spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: right.body, font: 'Arial', size: 20, color: DARK })] })
        ]
      })
    ]})]
  });
}

// ── COVER HEADER ──────────────────────────────────────────────────────────────
function coverHeader() {
  const bottomBar = { style: BorderStyle.SINGLE, size: 36, color: YELLOW };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: noBorder, bottom: bottomBar, left: noBorder, right: noBorder },
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: DARK, type: ShadingType.CLEAR },
      margins: { top: 420, bottom: 380, left: 380, right: 380 },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 100 },
          children: [
            new TextRun({ text: 'THE SWING', font: 'Arial', size: 80, bold: true, color: YELLOW }),
            new TextRun({ text: '   //   PRODUCT OVERVIEW', font: 'Arial', size: 34, bold: false, color: ORANGE }),
          ]
        }),
        new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [new TextRun({
            text: 'Real-Time Momentum Intelligence for Live Sports Betting, Broadcast & Fan Engagement',
            font: 'Arial', size: 22, color: WHITE, italics: true
          })]
        }),
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [new TextRun({
            text: 'The score is just a hand of cards. We show you who\'s holding the better ones.',
            font: 'Arial', size: 20, color: ORANGE, bold: true
          })]
        }),
      ]
    })]})],
  });
}

// ── BULLET ────────────────────────────────────────────────────────────────────
function bullet(text, after = 100) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 0, after },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: DARK })]
  });
}

// ── DOCUMENT ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '\u25CF',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 560, hanging: 360 } },
          run: { font: 'Arial', size: 20, color: ORANGE }
        }
      }]
    }]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 }
      }
    },
    children: [

      // ── COVER ───────────────────────────────────────────────────────────────
      coverHeader(),
      spacer(300),

      // ── SECTION 1: WHAT IS MOMENTUM ─────────────────────────────────────────
      eyebrow('The Foundation'),
      sectionTitle('What Is Momentum in Sports?'),
      rule(RED),

      body([{ text: 'Every sports fan has felt it. A team that was down ten points suddenly cannot miss. The crowd rises. The opposing coach burns a timeout. Something has shifted — and everyone in the building knows it before the scoreboard does. That feeling has a name. It has always had a name. What it has never had, until now, is a number.' }]),

      body([{ text: 'Coaches have managed momentum for as long as organized sports have existed. They call timeouts to stop runs. They change lineups to disrupt rhythm. They draw up plays designed not just to score, but to change the emotional temperature of a game. The entire science of in-game adjustments is built on the premise that momentum is real, measurable in feel if not in data, and worth spending resources to control.' }]),

      body([{ text: 'The analytics revolution in sports introduced win probability models as the first serious attempt to quantify game state in real time. But win probability answers a different question. It asks who is likely to win. Momentum asks something more immediate, more honest, and more useful in the live moment: ' }, { text: 'which team is actually playing better right now?', bold: true, color: DARK }, { text: ' Those are not the same question. And the gap between them is exactly where The Swing lives.' }]),

      spacer(80),
      quoteBlock(
        '"The score is just a hand of cards. The Swing shows you who\'s holding the better ones."',
        'The founding principle of The Swing'
      ),
      spacer(220),

      // ── SECTION 2: THE BLUFF ────────────────────────────────────────────────
      eyebrow('The Core Insight'),
      sectionTitle('The Score Is Bluffing'),
      rule(ORANGE),

      body([{ text: 'In poker, a bluff is not a lie — it is a survival technique. A player dealt a bad hand does not fold. They act like the hand is strong because the alternative is worse. The bluff buys time. It holds the pot. It dares the other side to call.' }]),

      body([{ text: 'Sports works exactly the same way. A team that is winning but getting outplayed does not suddenly concede the game. They play through it. They act like the better team because the scoreboard gives them permission to. The lead is their bluff. They are daring the trailing team to call it — to keep playing harder, to keep pushing, to refuse to accept that the score reflects reality.' }]),

      body([{ text: 'Sometimes the bluff holds. The leading team weathers the storm, the run never materializes, and the final whistle arrives before the scoreboard has to answer for itself. Sometimes it does not. The trailing team calls the bluff, the momentum picture that was building for six minutes finally breaks through, and the game changes.' }]),

      body([{ text: 'The Swing is the tool that sees the bluff forming. It measures the process of the game — not the outcome — in real time, on every possession. When momentum and scoreboard tell different stories, The Swing surfaces that tension before the market, the broadcast, or the crowd has fully processed it.' }]),

      spacer(100),
      callout(
        'What "The Score Is Bluffing" Means in Practice',
        'A team leads by 8 at halftime but has been outplayed for the last six minutes. Their lead is real. Their momentum is not. The Swing shows both — and the gap between them is where the most valuable information in live sports betting lives.',
        LIGHT_BG, RED
      ),
      spacer(220),

      // ── SECTION 3: THE PRODUCT ──────────────────────────────────────────────
      eyebrow('The Product'),
      sectionTitle('How The Swing Works'),
      rule(RED),

      body([{ text: 'The Swing is a real-time momentum intelligence platform that computes an independent momentum score for each team on every possession of a live game. The output is intentionally simple: two bars, one per team, updated continuously. The intelligence behind those bars is anything but.' }]),

      body([{ text: 'The algorithm synthesizes a weighted composite of the process signals that actually drive momentum — recent scoring efficiency, turnover differential, free throw pressure, transition frequency, and game-state context. Each signal is time-decayed, meaning what happened two minutes ago carries less weight than what is happening right now. The result is a live, breathing picture of which team is seizing control of the game at this exact moment.' }]),

      body([{ text: 'The critical design decision — the one that makes The Swing different from every other live analytics tool on the market — is that momentum is computed ', bold: false }, { text: 'independently of the score.', bold: true, color: DARK }, { text: ' The bars do not know who is winning. They only know who is playing better. That independence is what allows The Swing to detect a bluff. If momentum were derived from the score, it could never diverge from it.' }]),

      spacer(120),
      twoCol(
        { label: 'What The Swing Measures', body: 'Process quality: shooting efficiency trends, turnover differential, free throw rate, transition frequency, and foul pressure — weighted, time-decayed, and updated every possession in real time.' },
        { label: 'What Makes It Proprietary', body: 'Momentum computed independently of the scoreline. Two bars that can — and do — tell a different story than the scoreboard. That divergence is the signal no other product surfaces.' }
      ),
      spacer(220),

      // ── SECTION 4: THE DATA ─────────────────────────────────────────────────
      eyebrow('The Validation'),
      sectionTitle('What the Data Tells Us'),
      rule(ORANGE),

      body([{ text: 'The Swing\'s algorithm has been tested against over 145 real games from the 2025-26 NBA and NCAA Division I seasons, processing hundreds of thousands of individual play-by-play events. The findings validate the core premise and establish clear, defensible performance benchmarks across both target markets.' }]),

      spacer(120),
      threeCol([
        { label: 'Early-Game Edge', body: 'In the first quarter of NBA games, The Swing\'s momentum leader correctly identifies the eventual game winner nearly three out of four times — outperforming the score leader at the same point in the game.' },
        { label: 'The Bluff Exposed', body: 'In college basketball, momentum accuracy climbs to 78% in the final stretch of games. When The Swing identifies a team playing better than the scoreboard reflects, that signal is right more than three quarters of the time.' },
        { label: 'Advance Warning', body: 'On average, The Swing detects an incoming scoring run more than ten plays before the scoreboard reflects it — a live window of roughly two minutes of actionable intelligence ahead of the market.' }
      ]),
      spacer(180),

      body([{ text: 'The most commercially significant finding is the live spread signal. When a trailing team leads momentum at halftime in a moderate deficit situation — the exact scenario where the score is most likely to be bluffing — that team wins the second half at a rate that consistently outperforms market baseline. The bluff gets called, and The Swing saw it coming.' }]),

      spacer(80),
      callout(
        'The Key Number for Live Betting Partners',
        'When The Swing flags a score bluff at the end of the third quarter in NBA games, the momentum-leading team outscores their opponent in the fourth quarter at a rate that exceeds the control group by more than 30 percentage points. That is an actionable signal, measured on real games, in the current season.',
        LIGHT_BG, ORANGE
      ),
      spacer(200),

      // ── PAGE 2 ──────────────────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ── SECTION 5: BROADCAST ────────────────────────────────────────────────
      eyebrow('Market One'),
      sectionTitle('Broadcast Value'),
      rule(ORANGE),

      body([{ text: 'Live sports television is in a constant search for proprietary data layers that create visual moments, drive engagement, and give analysts something to say that no one else can say. The Swing is built for this environment — and the bluff narrative is built for broadcast.' }]),

      spacer(80),
      bullet('The graphic is intuitive at a glance. Two bars. One per team. No explanation required. An audience understands immediately who has the momentum — and when the bars say something the score does not, that is a produced moment.'),
      bullet('The language writes itself on air. "The Swing is showing us the score is bluffing here — they\'ve been outplayed for six minutes and this lead is on borrowed time." That is a quotable, clip-worthy broadcast line that invites debate and keeps audiences watching.'),
      bullet('It is analytically defensible. The Swing does not predict outcomes — it describes the process of the game in real time. That is a claim any broadcast analyst can make with confidence, because it is true regardless of what happens next.'),
      bullet('It works in every game situation. A blowout where the trailing team is genuinely being outplayed. A tight game where momentum is swinging back and forth. A comeback building in real time. The Swing has something to say in every scenario.', 140),

      spacer(100),
      quoteBlock(
        '"The Swing is showing us the score is bluffing.\u00A0 This lead is not as safe as it looks."',
        'Sample broadcast line — works in basketball, football, baseball, any sport where The Swing operates'
      ),
      spacer(220),

      // ── SECTION 6: LIVE BETTING ─────────────────────────────────────────────
      eyebrow('Market Two'),
      sectionTitle('Live Betting Value'),
      rule(RED),

      body([{ text: 'Live sports betting is the fastest-growing segment of the legal wagering market, and it is a market built entirely on information asymmetry. Sportsbooks adjust live spreads reactively — they move lines based on score and elapsed time, but they are inherently slow to price a momentum shift that has not yet shown up in the box score. That lag is where The Swing creates value.' }]),

      body([{ text: 'When a team is trailing by eight points at halftime but has completely controlled the process of the game for the preceding six minutes, The Swing\'s bars reflect that. The live spread still shows minus-eight. That gap — between what the score says and what the process says — is a bluff the market has not yet called. The Swing surfaces it. The bettor decides what to do with it.' }]),

      body([{ text: 'This is the critical framing. The Swing does not tell anyone to bet. It shows the hand that is being played. A bettor who sees The Swing flagging a score bluff at halftime has more information than the market has priced in. What they do with that information is their decision. The Swing just makes sure they are not betting blind.' }]),

      spacer(120),
      twoCol(
        { label: 'For the Live Bettor', body: 'Real-time visibility into whether the trailing team\'s momentum picture justifies the current live spread. Informed bettors engage more, bet more, and stay longer. The Swing turns passive viewers into active participants.' },
        { label: 'For the Sportsbook', body: 'A proprietary intelligence layer that drives live betting handle, increases session duration, and differentiates the product experience. One integration. A better-informed, more engaged customer base.' }
      ),
      spacer(220),

      // ── SECTION 7: EXECUTION ────────────────────────────────────────────────
      eyebrow('The Plan'),
      sectionTitle('How We Execute'),
      rule(ORANGE),

      body([{ text: 'The Swing is built to reach users wherever they are watching the game. The execution roadmap is built around three surfaces — each designed to deliver the same core intelligence in the format that fits the moment.' }]),

      spacer(120),
      threeCol([
        { label: 'Web Platform', body: 'A live dashboard showing The Swing\'s momentum picture for every game in progress. Real-time bars, score bluff alerts, and the full process picture — available across NBA, NCAA, and NFL as the platform expands.' },
        { label: 'Mobile App', body: 'The full experience in your pocket, built for the second-screen moment. Running alongside a broadcast, a sportsbook app, or both. Clean, fast, and designed around the live game — not the final score.' },
        { label: 'Push Notifications', body: 'The sharpest edge. When The Swing detects a significant momentum shift — a score bluff forming, the bars separating from the scoreline — a push alert fires. The right information at exactly the right moment.' }
      ]),

      spacer(180),

      body([{ text: 'The push notification is where the bluff narrative becomes most powerful as a product experience. An alert that reads ', bold: false },
           { text: '"Duke\'s score is bluffing. Momentum has shifted."', bold: true, color: DARK_RED },
           { text: ' is not a bet recommendation. It is a signal. It tells the user that something is changing before the scoreboard admits it. What they do next is up to them. The Swing just made sure they did not miss it.' }]),

      spacer(120),
      callout(
        'Phase One Target',
        'Broadcast partnership or fan-facing app launch first — establishing The Swing as the language of live game momentum. Sportsbook licensing follows once the signal is live and validated in a public environment. The data already proves the concept. A live product proves the business.',
        LIGHT_BG, RED
      ),
      spacer(220),

      // ── SECTION 8: CLOSING ──────────────────────────────────────────────────
      eyebrow('The Bottom Line'),
      sectionTitle('Why The Swing. Why Now.'),
      rule(RED),

      body([{ text: 'Scoreboard bluffs have always existed in sports. Every coach has seen one. Every fan has felt one. Every bettor has been burned by one — a lead that looked safe, a spread that looked wrong, a game that looked over before it was. What has never existed is a product that sees the bluff forming in real time, names it, and puts that intelligence in the hands of the people watching.' }]),

      body([{ text: 'The Swing is that product. Built on a proprietary algorithm validated across two sports and a full season of real games. Designed for three markets — broadcast, betting, and fans — with a unified language that works in every context. And anchored to a narrative that is simple, honest, and true: sometimes the score is bluffing, and now you can know when.' }]),

      body([{ text: 'Calling the bluff does not guarantee the pot. That is sports. That is betting. That is what makes the live game worth watching. The Swing does not promise outcomes. It promises you will never again be the last one in the room to see the hand that is actually being played.' }]),

      spacer(100),
      quoteBlock(
        '"Calling the bluff doesn\'t guarantee the pot. It just means the game isn\'t over."',
        'The Swing — the score tells you what happened. The Swing tells you what\'s happening.'
      ),
      spacer(160),

      // ── FOOTER RULE ─────────────────────────────────────────────────────────
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: YELLOW, space: 1 } },
        spacing: { before: 0, after: 120 },
        children: []
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({
          text: 'THE SWING   //   CONFIDENTIAL   //   2025-26',
          font: 'Arial', size: 18, color: ORANGE,
          bold: true, characterSpacing: 80
        })]
      }),

    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/home/claude/the_swing_overview.docx', buf);
  console.log('Done.');
});
