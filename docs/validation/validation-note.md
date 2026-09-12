# Validation note v1: Form's swing pipeline against TrackMan's own segment angles

Generated 2026-09-12 by `scripts/validation-note.ts` from 4 built session file(s). Regenerate with `npm run build:session -- 1 2 3 4 && npm run validation:note`.

## What is compared

For every full swing in a TrackMan hitting export, the pipeline derives eighteen rigid-segment orientations from the 21 tracked body points, poses a generic adult skeleton with them, and reads joint angles and trunk rotation from the posed skeleton. TrackMan's export also carries its own pelvis and torso segment angles (`segmentRotation`, first Euler component) and segment angular velocities. This note reports, per swing, the RMS difference between the pipeline's pelvis and torso rotation about vertical and TrackMan's, both made relative to the same start frame, differences taken modulo 360, with the sign convention allowed to differ. It also reports when each segment reached peak rotation speed relative to contact, from the pipeline and from TrackMan's angular velocities.

What this does and does not show: agreement with TrackMan's own segment angles shows the pipeline reproduces the capture's trunk kinematics; it does not show the capture is right. That needs a marker-based or force-plate reference (protocol in the deal memo, section 2.1). Muscle-path changes are computed from the posed skeleton and have no external reference yet.

## Agreement, per session and hand

| Session | Hand | Swings | Pelvis RMS (°) mean ± sd | Pelvis RMS max | Torso RMS (°) mean ± sd | Torso RMS max |
|---|---|---|---|---|---|---|
| TrackMan session 1 | R | 52 | 5.3 ± 8.2 | 28.5 | 7.4 ± 4.3 | 21.9 |
| TrackMan session 1 | L | 60 | 3.4 ± 3.9 | 17.9 | 8.4 ± 3.0 | 17.1 |
| TrackMan session 2 | R | 74 | 4.2 ± 7.0 | 28.3 | 6.3 ± 3.6 | 16.8 |
| TrackMan session 2 | L | 39 | 6.8 ± 9.5 | 36.3 | 7.8 ± 6.3 | 33.3 |
| TrackMan session 3 | R | 55 | 7.1 ± 7.6 | 29.6 | 10.4 ± 5.4 | 23.5 |
| TrackMan session 3 | L | 20 | 6.3 ± 9.1 | 28.8 | 10.1 ± 6.6 | 21.2 |
| TrackMan session 4 | R | 24 | 4.9 ± 6.5 | 25.8 | 18.4 ± 18.2 | 82.2 |
| TrackMan session 4 | L | 31 | 7.9 ± 7.7 | 27.4 | 13.0 ± 7.3 | 38.3 |

Pooled over 355 swings: pelvis 5.5 ± 7.4° RMS (95th percentile 21.4°); torso 9.2 ± 7.3° RMS (95th percentile 20.6°).

## Kinematic sequence timing, ms relative to contact (negative = before)

| Session | Hand | Pelvis: Form | Pelvis: TrackMan | Torso: Form | Torso: TrackMan | Lead arm: Form | Lead arm: TrackMan |
|---|---|---|---|---|---|---|---|
| TrackMan session 1 | R | -102 ± 60 | -69 ± 124 | -82 ± 17 | -52 ± 104 | -49 ± 46 | -84 ± 14 |
| TrackMan session 1 | L | -86 ± 56 | -84 ± 76 | -85 ± 61 | -85 ± 81 | -48 ± 65 | -95 ± 44 |
| TrackMan session 2 | R | -91 ± 22 | -92 ± 20 | -93 ± 17 | -83 ± 56 | -56 ± 53 | -82 ± 59 |
| TrackMan session 2 | L | -136 ± 187 | -113 ± 216 | -114 ± 60 | -113 ± 72 | -62 ± 84 | -75 ± 77 |
| TrackMan session 3 | R | -114 ± 51 | -80 ± 115 | -117 ± 130 | -91 ± 127 | -89 ± 165 | -61 ± 110 |
| TrackMan session 3 | L | -110 ± 27 | -108 ± 24 | -106 ± 23 | -101 ± 16 | -72 ± 48 | -95 ± 13 |
| TrackMan session 4 | R | -156 ± 51 | -147 ± 50 | -152 ± 151 | -180 ± 208 | -166 ± 249 | -120 ± 71 |
| TrackMan session 4 | L | -104 ± 21 | -91 ± 57 | -100 ± 25 | -96 ± 37 | -44 ± 118 | -75 ± 80 |

The pipeline's peaks are searched up to 25 ms past contact; TrackMan's angular velocities are searched over the whole play, which is why its pelvis and torso spreads are wider. The lead arm differs by definition: the pipeline rates the upper-arm segment's whole orientation; TrackMan's lead-arm velocity is its own construct.

## Headline metrics and their spread

| Session | Hand | Bat speed (mph) mean ± sd | Best | Separation at foot plant (°) | Peak separation (°) | Lead knee extension, plant to contact (°) |
|---|---|---|---|---|---|---|
| TrackMan session 1 | R | 70.2 ± 6.4 | 79.9 | 9 ± 9 | 39 ± 11 | 57 ± 34 |
| TrackMan session 1 | L | 68.1 ± 8.9 | 83.0 | 7 ± 6 | 32 ± 7 | 42 ± 23 |
| TrackMan session 2 | R | 69.1 ± 6.3 | 78.9 | 8 ± 6 | 25 ± 7 | 50 ± 27 |
| TrackMan session 2 | L | 64.3 ± 14.1 | 84.5 | 8 ± 5 | 22 ± 5 | 58 ± 29 |
| TrackMan session 3 | R | 68.5 ± 10.8 | 90.7 | 13 ± 11 | 27 ± 20 | 25 ± 22 |
| TrackMan session 3 | L | 64.2 ± 5.7 | 73.9 | 12 ± 9 | 26 ± 6 | 44 ± 32 |
| TrackMan session 4 | R | 67.3 ± 13.4 | 84.6 | 20 ± 33 | 45 ± 37 | 47 ± 23 |
| TrackMan session 4 | L | 67.3 ± 13.4 | 101.1 | 9 ± 5 | 24 ± 15 | 34 ± 30 |

Bat speed is the peak speed of TrackMan's tracked bat tip after a five-sample moving average; it is not TrackMan's own bat-speed product number, which the sample does not carry. Separation is torso rotation minus pelvis rotation about vertical, from the posed skeleton.

## Swings rejected by the pipeline

- TrackMan session 1: 112 swings passed; the build rejects a swing when more than 2 % of joint-angle frames fall outside physiological range, when its events are out of order, or when the posed skeleton's knee or elbow disagrees with the measured curve by more than 3° RMS.
- TrackMan session 2: 113 swings passed; the build rejects a swing when more than 2 % of joint-angle frames fall outside physiological range, when its events are out of order, or when the posed skeleton's knee or elbow disagrees with the measured curve by more than 3° RMS.
- TrackMan session 3: 75 swings passed; the build rejects a swing when more than 2 % of joint-angle frames fall outside physiological range, when its events are out of order, or when the posed skeleton's knee or elbow disagrees with the measured curve by more than 3° RMS.
- TrackMan session 4: 55 swings passed; the build rejects a swing when more than 2 % of joint-angle frames fall outside physiological range, when its events are out of order, or when the posed skeleton's knee or elbow disagrees with the measured curve by more than 3° RMS.

## Limits

- No hitter identity in the export: a session mixes hitters, so per-hand statistics describe a group.
- Forearm and shin rotation are not observable from 21 points and are held; the shoulder girdle follows a quarter of the arm's rotation; the head is one rigid block.
- Muscle-path changes are straight lines between attachment points on a generic model: no wrapping, tendon or fibre-angle model.
- The generic model's segment lengths differ from the hitter's; retargeting uses orientation only, so joint angles are exact and positions approximate.
