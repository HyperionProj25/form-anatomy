# A five-million-dollar TrackMan deal: what it has to contain

12 September 2026. Internal memo for Chase. Not for TrackMan's eyes in this
form; the outward brief comes later, through the investor-materials process.

## 1. What five million buys, from TrackMan's chair

TrackMan does not pay for a demo. It pays for one of three things:

1. **A product line it can sell tomorrow** under its own brand: "the
   understanding layer" bundled with the hitting camera, priced per site or
   per athlete. Five million is then an advance against royalties plus
   development, and they will want exclusivity in baseball and softball.
2. **Time**: a team and a codebase that puts them two years ahead of Hawk-Eye
   and the markerless start-ups on athlete-facing insight. Five million is
   then an acquisition or an acqui-hire with an earn-out.
3. **Credibility with MLB and college programs**: validated biomechanics that
   a team's performance staff will accept. Five million is then a
   co-development contract with milestones, most of the money behind the
   validation gates.

Decide which of the three we are selling before the first meeting, because
the package differs. My recommendation: sell (3) framed as the road to (1):
a milestone contract that ends with an exclusive licence, with an acquisition
option priced now. It is the only structure where we get paid for what
already exists and they get to de-risk before the big cheque.

## 2. The package: what must exist

Ordered by how much it moves the price.

### 2.1 Validation they cannot argue with

- **Agreement with their own numbers, on their own data.** We have the first
  line: pelvis 3 to 5° and torso 7 to 8° RMS against their segment angles
  across 112 swings. Extend it to every session they give us, every metric
  they publish, and print the table.
- **A marker-based reference study.** Ten to twenty swings captured
  simultaneously by TrackMan and an optical system or force plates. Report
  joint-angle error, timing error, and the muscle-path change error against
  a musculoskeletal model (OpenSim) on the same trials. This is the document
  their biomechanist reads first. Cost: a lab day and a biomechanist's time.
- **Metric definitions written down**, with a biomechanist's sign-off, so
  every number in the app has a one-paragraph definition and a citation.

### 2.2 A product, not a lab

- The hero flow finished and polished: session in, swings ranked, one swing
  with skeleton and muscle lines, two side by side, share or export.
  Phone-first for the athlete, desktop for the coach.
- Their identity model: hitter, session, swing, joined to their outcome data
  (exit velocity, launch) so body metrics sit next to results.
- Ingest from their V3 API, not from files. Runs in the cloud on every
  session automatically; report ready before the athlete leaves the cage.
- Pitching. The rig, pipeline and report are motion-agnostic; pitching
  captures need events (foot strike, release) and camera presets. TrackMan's
  pitching business is bigger than hitting. Ship it before the deal closes if
  at all possible; it doubles the addressable product.
- Accessibility, privacy and security that survive a college's procurement
  review: athlete data rights, retention, deletion, SOC 2 roadmap.

### 2.3 Clean IP, or there is no deal

- **The anatomy model.** Z-Anatomy and BodyParts3D are CC BY-SA. Share-alike
  is fine for a free atlas; it is a problem inside a commercial product
  TrackMan owns or licenses exclusively. Before term sheets: license a
  commercially clean musculoskeletal model (Zygote, Anatomography commercial
  terms, or a commissioned rig). This is the same purchase the visual pillar
  needs. Budget it now.
- **The code** is ours and clean (MIT or proprietary dependencies only;
  verify with a licence scan).
- **The data** in the repo today is TrackMan's sample; the deal replaces it
  with their production data under contract. The CMU swing stays only in the
  free atlas.
- **Trademarks.** "Form" needs a clearance search before it appears in a
  contract.

### 2.4 Proof people want it

- Two or three programs (a college, a private facility, one pro affiliate if
  the MLB relationships allow) using it for a month, with usage numbers and
  coach quotes. TrackMan's sales team will ask "who uses it" in the first
  ten minutes.
- One published or presentable case: a hitter's session, the report, what
  the coach did with it, what changed.

### 2.5 The team and the plan

- Named people who will keep building for two years, with retention tied to
  the deal. A buyer pays for the team as much as the code.
- A costed 24-month roadmap: validation, pitching, athlete app, integration,
  languages, support. Five million has to be spent in a way they believe.

## 3. Deal terms to walk in with

| Term | Position | Floor |
|---|---|---|
| Structure | Milestone development contract converting to an exclusive licence, with a purchase option at a pre-agreed price | Non-exclusive licence with a per-camera royalty |
| Exclusivity | Baseball and softball only, three years, renewable on royalty minimums | Field-of-use limited to hitting |
| Milestones (payments follow each) | 1. Validation report accepted · 2. API integration in their staging · 3. Pitching · 4. Athlete app launch · 5. Twelve months of production use | Same, fewer |
| IP | We own; they get a licence; option to buy at a fixed multiple | Joint ownership of integration code only |
| Data | Their captures stay theirs; our derived metrics and models stay ours; anonymised aggregates usable for research with consent | No use of their data outside the product |
| Royalty after the advance | Per active athlete per year, or per camera per year | Per camera |
| Team | Retention bonuses for named engineers; Chase as product lead through launch | Advisory role |
| Support | Defined SLA, one release train per quarter | Best effort |
| Non-compete | Baseball and softball only; free to sell golf, tennis, rehab, education | Sports capture only |

## 4. What we prepare, in order

1. **Validation note v1** (two weeks): every metric against their segment
   data on all four sessions; the marker-study protocol written and costed.
2. **IP audit** (one week): licence scan of dependencies; a quote for a
   commercial musculoskeletal model; trademark search.
3. **The demo** (three weeks): hero flow end to end on a real session, on a
   phone and a laptop, with pitching if it can be reached.
4. **Two pilots** (four to six weeks, in parallel): a college program and a
   facility, with a usage dashboard and coach interviews.
5. **The outward brief**: one-pager, the deck, the validation note, the
   roadmap, and a draft term sheet built through the investor-materials
   process, with a knowledge-transfer review before anything leaves.
6. **The meeting**: a live session captured that morning, reported that
   afternoon, in front of their product and biomechanics leads together.

## 5. The honest gap

Today we have a strong engine, a clean posed skeleton, a report with real
numbers, and a first validation line from their own data. We do not yet
have: a commercially clean model, an outside validation, a single external
user, pitching, or an API integration. Each is weeks, not months. Five
million is a reasonable ask once sections 2.1 to 2.4 exist; before that, the
credible ask is a paid pilot and a milestone contract that funds getting
there.
