# 2026 NCAA Tournament Bracket — MVIX + MRVI + Head-to-Head Predictions

## Predicted Champion: (6) UNC defeats (3) GONZ, 81-78

## Final Four: OSU, GONZ, UNC, MICH

## Methodology

Predictions combine four signals:

| Signal | Weight | Description |
|---|---|---|
| **MRVI** (Rolling 5-game) | 2x | Direction of volatility — higher = trending favorably (61.1% CBB accuracy) |
| **H2H** (2026 season) | 2x | Head-to-head results — most recent game weighted 2x |
| **MVIX** (Rolling 10-game) | 1x | Magnitude of volatility — lower = calmer/more controlled |
| **Seed** | 1-2x | Stronger weight for large seed gaps (8+ = 2x, 4-7 = 1x) |

H2H data: 204 games between 143 pairs of tournament teams.

**Close-metrics rule:** When the combined MVIX + MRVI difference between two teams is less than 6, the higher-seeded team receives a 2x weight bonus. This prevents the model from picking upsets based on negligible metric differences.

---

## Round of 64 (First Round)

| Region | Matchup | MVIX | MRVI | MVIX | MRVI | Pick | Signal |
|---|---|---|---|---|---|---|---|
| EAST | (1) DUKE vs (16) SIE | 50 | 50 | 46 | 52 | **SIE** | MRVI SIE, MVIX SIE, seed (1v16) |
| EAST | (2) CONN vs (15) FUR | 50 | 47 | 67 | 51 | **CONN** | MRVI FUR, MVIX CONN, seed (2v15) |
| EAST | (3) MSU vs (14) NDSU | 58 | 47 | 43 | 50 | **NDSU** | MRVI NDSU, MVIX NDSU, seed (3v14) |
| EAST | (4) KU vs (13) CBU | 49 | 46 | 54 | 53 | **KU** | MRVI CBU, MVIX KU, seed (4v13) |
| EAST | (5) SJU vs (12) UNI | 47 | 50 | 46 | 54 | **SJU** | MRVI UNI, MVIX UNI, seed (5v12), close metrics, seed favor (5), seed tiebreak |
| EAST | (6) LOU vs (11) USF | 60 | 52 | 48 | 54 | **USF** | MRVI USF, MVIX USF, seed (6v11) |
| EAST | (7) UCLA vs (10) UCF | 48 | 48 | 56 | 43 | **UCLA** | MRVI UCLA, MVIX UCLA |
| EAST | (8) OSU vs (9) TCU | 56 | 54 | 53 | 47 | **OSU** | MRVI OSU, MVIX TCU |
| WEST | (1) ARIZ vs (16) LIU | 68 | 43 | 56 | 49 | **LIU** | MRVI LIU, MVIX LIU, seed (1v16) |
| WEST | (2) PUR vs (15) QUC | 56 | 47 | 60 | 52 | **PUR** | MRVI QUC, MVIX PUR, seed (2v15) |
| WEST | (3) GONZ vs (14) KENN | 50 | 53 | 67 | 47 | **GONZ** | MRVI GONZ, MVIX GONZ, seed (3v14) |
| WEST | (4) ARK vs (13) HAW | 50 | 53 | 56 | 51 | **ARK** | MRVI ARK, MVIX ARK, seed (4v13) |
| WEST | (5) WIS vs (12) HPU | 50 | 53 | 54 | 51 | **WIS** | MRVI WIS, MVIX WIS, seed (5v12), close metrics, seed favor (5) |
| WEST | (6) BYU vs (11) SMU | 58 | 53 | 54 | 52 | **BYU** | MRVI BYU, MVIX SMU, seed (6v11), close metrics, seed favor (6) |
| WEST | (7) MIA vs (10) MIZ | 55 | 52 | 50 | 43 | **MIA** | MRVI MIA, MVIX MIZ |
| WEST | (8) VILL vs (9) USU | 57 | 46 | 66 | 53 | **USU** | MRVI USU, MVIX VILL |
| SOUTH | (1) FLA vs (16) HOW | 49 | 50 | 60 | 46 | **FLA** | MRVI FLA, MVIX FLA, seed (1v16) |
| SOUTH | (2) HOU vs (15) IDHO | 52 | 51 | 59 | 50 | **HOU** | MRVI HOU, MVIX HOU, seed (2v15) |
| SOUTH | (3) ILL vs (14) PENN | 61 | 47 | 57 | 50 | **PENN** | MRVI PENN, MVIX PENN, seed (3v14) |
| SOUTH | (4) NEB vs (13) TROY | 45 | 48 | 45 | 51 | **NEB** | MRVI TROY, MVIX NEB, seed (4v13), close metrics, seed favor (4) |
| SOUTH | (5) VAN vs (12) MCN | 62 | 53 | 53 | 48 | **VAN** | MRVI VAN, MVIX MCN, seed (5v12) |
| SOUTH | (6) UNC vs (11) VCU | 40 | 57 | 54 | 51 | **UNC** | MRVI UNC, MVIX UNC, seed (6v11) |
| SOUTH | (7) SMC vs (10) TA&M | 47 | 54 | 50 | 46 | **SMC** | MRVI SMC, MVIX SMC |
| SOUTH | (8) CLEM vs (9) IOWA | 58 | 46 | 62 | 42 | **CLEM** | MRVI CLEM, MVIX CLEM |
| MIDWEST | (1) MICH vs (16) UMBC | 49 | 50 | 48 | 51 | **MICH** | MRVI UMBC, MVIX UMBC, seed (1v16), close metrics, seed favor (1) |
| MIDWEST | (2) ISU vs (15) TNST | 49 | 53 | 61 | 46 | **ISU** | MRVI ISU, MVIX ISU, seed (2v15) |
| MIDWEST | (3) UVA vs (14) WRST | 58 | 51 | 65 | 47 | **UVA** | MRVI UVA, MVIX UVA, seed (3v14) |
| MIDWEST | (4) ALA vs (13) HOF | 68 | 50 | 58 | 52 | **HOF** | MRVI HOF, MVIX HOF, seed (4v13) |
| MIDWEST | (5) TTU vs (12) AKR | 66 | 47 | 50 | 54 | **AKR** | MRVI AKR, MVIX AKR, seed (5v12) |
| MIDWEST | (6) TENN vs (11) TEX | 50 | 52 | 55 | 46 | **TENN** | MRVI TENN, MVIX TENN, H2H TENN (1-0), seed (6v11) |
| MIDWEST | (7) UK vs (10) SCU | 61 | 50 | 48 | 47 | **UK** | MRVI UK, MVIX SCU |
| MIDWEST | (8) UGA vs (9) SLU | 56 | 46 | 53 | 57 | **SLU** | MRVI SLU, MVIX SLU |

### First Round Upsets Predicted

| Pick | Seed | Over Seed |
|---|---|---|
| **SIE** | 16 | 1 |
| **NDSU** | 14 | 3 |
| **USF** | 11 | 6 |
| **LIU** | 16 | 1 |
| **USU** | 9 | 8 |
| **PENN** | 14 | 3 |
| **HOF** | 13 | 4 |
| **AKR** | 12 | 5 |
| **SLU** | 9 | 8 |


---

## Round of 32 (Second Round)

| Region | Matchup | MVIX | MRVI | MVIX | MRVI | Pick | Signal |
|---|---|---|---|---|---|---|---|
| EAST | (16) SIE vs (8) OSU | 46 | 52 | 56 | 54 | **OSU** | MRVI OSU, MVIX SIE, seed (8v16) |
| EAST | (4) KU vs (5) SJU | 49 | 46 | 47 | 50 | **SJU** | MRVI SJU, MVIX SJU |
| EAST | (14) NDSU vs (11) USF | 43 | 50 | 48 | 54 | **USF** | MRVI USF, MVIX NDSU |
| EAST | (2) CONN vs (7) UCLA | 50 | 47 | 48 | 48 | **CONN** | MRVI UCLA, MVIX UCLA, seed (2v7), close metrics, seed favor (2), seed tiebreak |
| WEST | (16) LIU vs (9) USU | 56 | 49 | 66 | 53 | **USU** | MRVI USU, MVIX LIU, seed (9v16) |
| WEST | (4) ARK vs (5) WIS | 50 | 53 | 50 | 53 | **ARK** | MVIX ARK, close metrics, seed favor (4) |
| WEST | (3) GONZ vs (6) BYU | 50 | 53 | 58 | 53 | **GONZ** | MVIX GONZ |
| WEST | (2) PUR vs (7) MIA | 56 | 47 | 55 | 52 | **PUR** | MRVI MIA, MVIX MIA, seed (2v7), close metrics, seed favor (2), seed tiebreak |
| SOUTH | (1) FLA vs (8) CLEM | 49 | 50 | 58 | 46 | **FLA** | MRVI FLA, MVIX FLA, seed (1v8) |
| SOUTH | (4) NEB vs (5) VAN | 45 | 48 | 62 | 53 | **VAN** | MRVI VAN, MVIX NEB |
| SOUTH | (14) PENN vs (6) UNC | 57 | 50 | 40 | 57 | **UNC** | MRVI UNC, MVIX UNC, seed (6v14) |
| SOUTH | (2) HOU vs (7) SMC | 52 | 51 | 47 | 54 | **SMC** | MRVI SMC, MVIX SMC, seed (2v7) |
| MIDWEST | (1) MICH vs (9) SLU | 49 | 50 | 53 | 57 | **MICH** | MRVI SLU, MVIX MICH, seed (1v9) |
| MIDWEST | (13) HOF vs (12) AKR | 58 | 52 | 50 | 54 | **AKR** | MRVI AKR, MVIX AKR |
| MIDWEST | (3) UVA vs (6) TENN | 58 | 51 | 50 | 52 | **TENN** | MRVI TENN, MVIX TENN |
| MIDWEST | (2) ISU vs (7) UK | 49 | 53 | 61 | 50 | **ISU** | MRVI ISU, MVIX ISU, seed (2v7) |

---

## Sweet 16

| Region | Matchup | MVIX | MRVI | MVIX | MRVI | Pick | Signal |
|---|---|---|---|---|---|---|---|
| EAST | (8) OSU vs (5) SJU | 56 | 54 | 47 | 50 | **OSU** | MRVI OSU, MVIX SJU |
| EAST | (11) USF vs (2) CONN | 48 | 54 | 50 | 47 | **USF** | MRVI USF, MVIX USF, seed (2v11) |
| WEST | (9) USU vs (4) ARK | 66 | 53 | 50 | 53 | **ARK** | MRVI ARK, MVIX ARK, seed (4v9) |
| WEST | (3) GONZ vs (2) PUR | 50 | 53 | 56 | 47 | **GONZ** | MRVI GONZ, MVIX GONZ |
| SOUTH | (1) FLA vs (5) VAN | 49 | 50 | 62 | 53 | **VAN** | MRVI VAN, MVIX FLA, H2H VAN (1-1), seed (1v5) |
| SOUTH | (6) UNC vs (7) SMC | 40 | 57 | 47 | 54 | **UNC** | MRVI UNC, MVIX UNC |
| MIDWEST | (1) MICH vs (12) AKR | 49 | 50 | 50 | 54 | **MICH** | MRVI AKR, MVIX MICH, seed (1v12), close metrics, seed favor (1) |
| MIDWEST | (6) TENN vs (2) ISU | 50 | 52 | 49 | 53 | **ISU** | MRVI ISU, MVIX ISU, seed (2v6), close metrics, seed favor (2) |

---

## Elite 8 (Regional Finals)

| Region | Matchup | MVIX | MRVI | MVIX | MRVI | Pick | Signal |
|---|---|---|---|---|---|---|---|
| EAST | (8) OSU vs (11) USF | 56 | 54 | 48 | 54 | **OSU** | MRVI OSU, MVIX USF |
| WEST | (4) ARK vs (3) GONZ | 50 | 53 | 50 | 53 | **GONZ** | MRVI GONZ, close metrics, seed favor (3) |
| SOUTH | (5) VAN vs (6) UNC | 62 | 53 | 40 | 57 | **UNC** | MRVI UNC, MVIX UNC |
| MIDWEST | (1) MICH vs (2) ISU | 49 | 50 | 49 | 53 | **MICH** | MRVI ISU, MVIX MICH, close metrics, seed favor (1) |

### Regional Champions

| Region | Champion | Seed | MVIX | MRVI |
|---|---|---|---|---|
| EAST | **OSU** | 8 | 56 | 54 |
| WEST | **GONZ** | 3 | 50 | 53 |
| SOUTH | **UNC** | 6 | 40 | 57 |
| MIDWEST | **MICH** | 1 | 49 | 50 |


---

## Final Four

| Region | Matchup | MVIX | MRVI | MVIX | MRVI | Pick | Signal |
|---|---|---|---|---|---|---|---|
| FF | (8) OSU vs (3) GONZ | 56 | 54 | 50 | 53 | **GONZ** | MRVI OSU, MVIX GONZ, seed (3v8), seed tiebreak |
| FF | (6) UNC vs (1) MICH | 40 | 57 | 49 | 50 | **UNC** | MRVI UNC, MVIX UNC, seed (1v6) |

---

## National Championship

| Region | Matchup | MVIX | MRVI | MVIX | MRVI | Pick | Signal |
|---|---|---|---|---|---|---|---|
| CHAMP | (3) GONZ vs (6) UNC | 50 | 53 | 40 | 57 | **UNC** | MRVI UNC, MVIX UNC |

### Predicted Final: (6) UNC 81, (3) GONZ 78

---

## Analysis generated March 16, 2026 using full 90-day MVIX/MRVI backfill (7,946 CBB records, 100% MRVI coverage)

## Disclaimer

These predictions are based on momentum volatility metrics derived from play-by-play data. They do not account for injuries, venue, travel, or external team quality ratings. Use as one analytical signal among many.
