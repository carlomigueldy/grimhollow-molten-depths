# Grimhollow: Molten Depths — Design Spec

Date: 2026-07-08
Status: Self-brainstormed and approved autonomously per explicit user instruction (no interactive Q&A gate).

## 1. Concept

A production-ready, browser-playable, WoW-inspired ARPG dungeon crawler built with Three.js. The
player controls a Death Knight descending through a gothic stone dungeon, fighting molten stone
spawnlings, and finally facing the Molten Colossus, a giant lava-golem boss, in a dedicated arena
chamber. Single continuous scene, single boss encounter, full combat loop (move, attack, take
damage, heal, level, die/respawn, win).

Originality note: original dark-fantasy setting and names. No Blizzard/WoW trademarked names,
textures, audio, or extracted game data are used — only Meshy.AI-generated 3D assets created from
original text prompts inspired by the general "Warcraft-tagged" and "golem/giant/elemental"
aesthetic the user pointed at.

## 2. Asset sourcing decision (important deviation from literal instruction)

The user asked to "pick" specific community models from two meshy.ai gallery URLs (a boss
collection and a `tags/warcraft` model list) and a general "free game object" search. Investigation
found:

- Both pages are real and browsable (confirmed via headless Chromium — the collection is not
  empty, contrary to a first static fetch). Concrete candidates were identified: **Molten Colossus**
  (jurafjvs, CC0, "colossus/molten/lava/gigantic") from the golem/giant/elemental collection, and
  **WOW Death Knight** (Ghostface, CC0, "warcraft/death/knight/undead/warrior") from the warcraft
  tag list.
- However, meshy.ai does not expose a public, unauthenticated raw GLB/FBX/OBJ download for community
  models — the only fetchable file is a proprietary `MESHY.AI`-signed binary consumed by their own
  in-browser viewer, which the Meshy MCP tools correctly reject as an unsupported format. Downloading
  the real GLB requires being logged into a Meshy account via their web app, which this environment
  does not have credentials for.
- The MCP toolset **does** fully support generating original models via `meshy_text_to_3d` in my own
  workspace and then rigging/animating them via `meshy_rig`/`meshy_animate` — this is the supported,
  documented, credit-metered path.

Resolution: generate original Meshy assets with prompts that reproduce the exact names, tags, and
visual identity of the two chosen community picks (Molten Colossus boss, WOW-Death-Knight-style
player), plus two dungeon props (treasure chest, iron brazier torch) found free-searchable on
Meshy. This satisfies "use free assets from Meshy.AI" and "pick anything from [the collections]"
in spirit (same creative direction, same names/aesthetic) while staying inside what the API can
actually deliver as riggable, animatable GLBs. Credit spend is tracked and reported to the user at
the end; balance was 221 credits before starting, comfortably covering the ~110-credit plan below.

## 3. Assets (Meshy.AI, CC-equivalent, generated in my own workspace)

| Asset | Role | Generation | Rig/Anim |
|---|---|---|---|
| Death Knight | Player character | `meshy-6`, t-pose, ~40k tri | Rig (free walk+run) + custom `Idle` + `Right_Hand_Sword_Slash` attack |
| Molten Colossus | Boss (also reused, scaled down + tinted, as "Molten Spawnling" trash mobs) | `meshy-6`, t-pose, ~60k tri | Rig (free walk+run) + custom `Idle` + `Angry_Ground_Stomp` attack |
| Treasure Chest | Dungeon prop / loot flavor | `meshy-5`, ~15k tri | none (static prop) |
| Iron Brazier Torch | Dungeon prop / lighting flavor | `meshy-5`, ~10k tri | none (static prop, paired with a real Three.js PointLight + fire sprite) |

Trash mobs reuse the boss rig at 0.45x scale with a tinted/darker material variant instead of
spending extra credits on a third character generation — same walk/attack animation clips apply
since it's the same skeleton.

## 4. Environment

Original gothic dungeon built from procedural Three.js geometry (stone floor tiles, ribbed vault
walls, arches, columns, rubble, cracked lava fissures) in the same visual family as the sibling
projects (`emberfall-lowpoly-arpg`, `stratholme-inspired-threejs`) but a new layout: entrance hall →
two side chambers with spawnlings and the treasure chest → a corridor of braziers → a raised
octagonal boss arena with a lava moat. Warm torchlight, fog, bloom, ACES tone mapping.

## 5. Gameplay loop

- **Movement:** WASD/arrows, camera is a smooth angled follow camera behind the player (matching
  the established pattern from sibling projects). Player model rotates to face movement direction.
- **Combat:** Space/click = sword slash (melee arc, short cooldown); the Death Knight's slash
  animation clip drives the swing timing so damage windows sync visually.
- **Enemies:** 4–5 Molten Spawnlings patrol/aggro within detection radius, deal contact damage,
  die in 2–3 hits, drop small gold.
- **Boss:** Molten Colossus has a large HP pool, alternates between melee swings and a
  `Angry_Ground_Stomp` AoE slam (telegraphed, punishes standing still), and a defeated/dead state.
- **Progression:** XP + level on kill, HP/mana growth, gold counter, a couple of potions (heal),
  death → respawn at entrance with a small gold penalty (same convention as sibling projects for
  consistency and because it's a proven, tested loop).
- **HUD:** player HP/mana/level/gold, boss health bar on engage, objective toast, controls legend.
- **Win condition:** boss HP → 0 triggers a victory banner.
- **QA hook:** expose `window.__GRIMHOLLOW__` debug API (state/hold/step/cast/teleport) matching the
  pattern already validated in `emberfall-lowpoly-arpg`, so the build can be smoke-tested headlessly.

## 6. Tech stack

Three.js + TypeScript (strict) + Vite + pnpm + Vercel — identical stack to the sibling ARPG/dungeon
projects in this workspace, for consistency and because it's a proven, fast-to-ship combination.
GLTFLoader + AnimationMixer with a small crossfade locomotion state machine (`Idle` ↔ `Walking`/`Running`
↔ attack one-shots), same technique validated in `stratholme-inspired-threejs`.

## 7. Repo / deployment plan

New public GitHub repo `grimhollow-molten-depths` (name chosen to avoid collision with the two
existing sibling repos). Push, link a new Vercel project, `vercel deploy --prod`, record the
production URL in the README and in the GitHub repo's About description/topics. Notify the user on
Telegram via `hermes send` once live.

## 8. Out of scope (YAGNI)

No multiplayer, no save persistence, no multiple dungeon levels, no inventory/equipment system, no
audio (browser autoplay + no free-licensed WoW-style music readily available — silent/ambient-only
is acceptable for this scope), no mobile touch controls (desktop keyboard/mouse only, unlike
Emberfall which added mobile controls — cut to keep scope focused on the Meshy asset pipeline and a
polished single encounter).
