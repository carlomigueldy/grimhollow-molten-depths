# Grimhollow: Molten Depths Implementation Plan

> Adapted for a visual/interactive Three.js game: verification is done via a
> runtime debug API (`window.__GRIMHOLLOW__`) driven headlessly through Chromium
> screenshots + evaluated JS assertions, not unit-test-per-function TDD — this
> matches the proven pattern already used in the sibling projects
> `emberfall-lowpoly-arpg` and `stratholme-inspired-threejs`. Executed inline,
> autonomously, in this session (user explicitly opted out of the
> subagent-driven/interactive-approval flow).

**Goal:** Ship a playable, deployed, WoW-inspired Three.js ARPG dungeon crawler using
Meshy.AI-generated rigged/animated hero assets (Death Knight player, Molten Colossus boss).

**Architecture:** Vite + TypeScript entry (`src/main.ts`) wires a renderer/scene module, a dungeon
environment builder, a GLTF-loaded entity layer (player/enemies/boss) with a shared animation
state-machine helper, a combat/AI update loop, and a DOM HUD overlay. All game state lives in
plain TS objects updated each `requestAnimationFrame` tick; no framework/state library.

**Tech Stack:** Three.js (latest 0.181.x), TypeScript strict, Vite, pnpm, Vercel.

## Global Constraints

- Node.js 22+, pnpm 11+ (matches sibling projects).
- No Blizzard/WoW trademarked names, textures, or extracted assets.
- Desktop keyboard/mouse only (no touch controls — see spec §8).
- Must expose `window.__GRIMHOLLOW__` for headless verification.
- `pnpm run build` (`tsc && vite build`) must pass with zero errors before commit.

---

## File Structure

```
grimhollow-molten-depths/
├── public/assets/models/
│   ├── death-knight.glb        # rigged player (walk/run/idle/slash)
│   ├── molten-colossus.glb     # rigged boss (walk/run/idle/stomp)
│   ├── treasure-chest.glb
│   └── brazier-torch.glb
├── src/
│   ├── main.ts                 # boot: renderer, loop, wires everything
│   ├── style.css
│   ├── core/
│   │   ├── scene.ts             # renderer, camera, lights, fog, postproc
│   │   └── input.ts             # keyboard state
│   ├── world/
│   │   └── dungeon.ts           # procedural geometry: hall, chambers, arena, props
│   ├── entities/
│   │   ├── loadModel.ts         # GLTF load + AnimationMixer + clip lookup helper
│   │   ├── player.ts            # Death Knight controller
│   │   ├── spawnling.ts         # scaled/tinted Molten Colossus reuse, trash mob AI
│   │   └── boss.ts              # Molten Colossus boss AI + stomp AoE
│   ├── combat/
│   │   └── combat.ts            # damage resolution, XP/gold, death/respawn
│   ├── ui/
│   │   └── hud.ts               # DOM HUD: bars, toast, boss bar, victory/death screens
│   └── debug/
│       └── api.ts               # window.__GRIMHOLLOW__
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── README.md
```

**Interfaces (so later tasks know exact names):**

- `core/scene.ts` exports `createScene(): { scene, camera, renderer, composer, clock }` and
  `resizeHandler(...)`.
- `entities/loadModel.ts` exports `async function loadRiggedModel(url: string): Promise<RiggedModel>`
  where `RiggedModel = { root: THREE.Group, mixer: THREE.AnimationMixer, clips: Record<string, THREE.AnimationClip>, skeleton: THREE.Skeleton }`.
- `entities/player.ts` exports `class Player { object: THREE.Group; hp: number; maxHp: number; mana: number; level: number; xp: number; gold: number; update(dt, input, world): void; takeDamage(n): void; attack(): void }`.
- `entities/boss.ts` exports `class Boss { object: THREE.Group; hp: number; maxHp: number; phase: 'idle'|'aggro'|'stomp'|'dead'; update(dt, playerPos): void; takeDamage(n): void }`.
- `entities/spawnling.ts` exports `class Spawnling { object; hp; alive; update(dt, playerPos): void; takeDamage(n): void }`.
- `combat/combat.ts` exports `resolveMeleeHit(attackerPos, attackerFacing, targets, range, arcDeg, damage): Target[]`.
- `ui/hud.ts` exports `class Hud { mount(): void; update(state: HudState): void; toast(msg): void; showVictory(): void; showDeath(): void }`.
- `debug/api.ts` exports `installDebugApi(game: GameHandle): void` attaching `window.__GRIMHOLLOW__`.

---

### Task 1: Project scaffold

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/style.css`, `.gitignore`, `vercel.json`.

- [ ] Init pnpm project with `three`, `@types/three`, `typescript`, `vite` (versions matching sibling projects' latest working set).
- [ ] `index.html` with `#app` canvas mount + `#hud` root + loading overlay.
- [ ] `vercel.json`: `{ "framework": "vite", "installCommand": "pnpm install --frozen-lockfile", "buildCommand": "pnpm run build", "outputDirectory": "dist" }`.
- [ ] Verify: `pnpm install && pnpm run build` succeeds (empty scene is fine at this point).
- [ ] Commit: `feat: scaffold vite/typescript/three.js project`.

### Task 2: Core scene + camera + lighting

**Files:** Create `src/core/scene.ts`, `src/core/input.ts`, wire into `src/main.ts`.

- [ ] `createScene()` sets up `PerspectiveCamera`, `WebGLRenderer` (ACES tone mapping, sRGB output, shadow map), `FogExp2`, hemisphere + directional key light, `EffectComposer` with bloom.
- [ ] `input.ts` tracks held keys via `keydown`/`keyup` into a `Set<string>`.
- [ ] `main.ts` renders an empty lit floor plane to confirm the pipeline.
- [ ] Verify: `pnpm run dev`, headless-screenshot shows a lit gray floor, no console errors.
- [ ] Commit: `feat: add renderer, camera, lighting pipeline`.

### Task 3: Dungeon environment geometry

**Files:** Create `src/world/dungeon.ts`.

- [ ] Build entrance hall, two side chambers, brazier-lit corridor, raised octagonal boss arena with lava-moat shader-lit plane, using `BoxGeometry`/`CylinderGeometry`/`ExtrudeGeometry` instancing, matching the warm gothic-stone palette from `stratholme-inspired-threejs` (new layout, not copied).
- [ ] Return walkable bounds + blocker list for collision (rects/circles, same approach as sibling project).
- [ ] Verify: screenshot shows full dungeon layout from a debug top-down camera.
- [ ] Commit: `feat: build gothic dungeon environment geometry`.

### Task 4: Load rigged Meshy models

**Files:** Create `src/entities/loadModel.ts`.

- [ ] `loadRiggedModel` uses `GLTFLoader`, finds the `SkinnedMesh`, builds a clip name→`AnimationClip` map from `gltf.animations`, returns `{ root, mixer, clips, skeleton }`.
- [ ] Verify: load `death-knight.glb` in a throwaway debug scene, confirm `clips` contains `Walking`, `Running`, `Idle`, and the custom slash clip names logged from the actual Meshy output (names are read at runtime, not hardcoded, since Meshy's exact clip naming is confirmed only after the asset finishes generating).
- [ ] Commit: `feat: add rigged GLTF loader with animation clip map`.

### Task 5: Player controller + locomotion state machine

**Files:** Create `src/entities/player.ts`.

- [ ] WASD movement with delta-time, collision against dungeon bounds, model rotates to face movement vector (same technique as `stratholme-inspired-threejs`).
- [ ] Crossfade between `Idle` / `Walking` / `Running` (Shift = run) using `AnimationAction.crossFadeTo`.
- [ ] Space/click triggers the slash one-shot clip (`AnimationAction.setLoop(THREE.LoopOnce)`), returns to locomotion state on `finished` event; exposes an attack damage window via callback.
- [ ] Verify: headless run, `__GRIMHOLLOW__.hold('KeyW', true)` + step moves the player and switches to `Walking`; releasing returns to `Idle`.
- [ ] Commit: `feat: add player controller with animation state machine`.

### Task 6: Combat resolution + spawnling trash mobs

**Files:** Create `src/combat/combat.ts`, `src/entities/spawnling.ts`.

- [ ] `resolveMeleeHit` does an arc/range check against target positions.
- [ ] `Spawnling` reuses the boss GLB scaled 0.45x with a darker emissive-tinted material clone, simple chase-when-in-radius AI, 2–3 hit kill, gold drop.
- [ ] Verify: spawn 4 spawnlings, attack kills them, gold counter increments, XP/level updates.
- [ ] Commit: `feat: add combat resolution and molten spawnling enemies`.

### Task 7: Boss AI

**Files:** Create `src/entities/boss.ts`.

- [ ] State machine: `idle` (outside arena trigger) → `aggro` (player enters arena) → alternates melee swing / telegraphed `Angry_Ground_Stomp` AoE (damages player if within radius during the stomp window) → `dead` when HP ≤ 0 (plays death/idle-freeze, disables collision).
- [ ] Verify: scripted damage via debug API brings boss HP to 0, boss enters `dead` state, victory HUD fires.
- [ ] Commit: `feat: add Molten Colossus boss AI and stomp attack`.

### Task 8: HUD + win/lose flow

**Files:** Create `src/ui/hud.ts`.

- [ ] Player HP/mana/level/gold bars, boss health bar (visible on aggro), objective toast on load, victory banner, death→respawn-at-entrance-with-gold-penalty flow (same convention as `emberfall-lowpoly-arpg`).
- [ ] Verify: full playthrough in headless browser — move, kill spawnlings, engage boss, win.
- [ ] Commit: `feat: add HUD and win/lose flow`.

### Task 9: Debug API + final polish pass

**Files:** Create `src/debug/api.ts`; touch `src/main.ts`.

- [ ] `window.__GRIMHOLLOW__` exposes `state()`, `hold(key, bool)`, `step(key, frames)`, `cast('attack')`, `teleport(x,z)`, `errors`.
- [ ] Add `?smoke=1` to skip intro toast for automated tests, same as Emberfall.
- [ ] Full self-review pass against the spec: dungeon reads as WoW-inspired, both hero assets are visibly rigged/animated, combat feels responsive, no console errors.
- [ ] Commit: `feat: add debug API and smoke-test flag`.

### Task 10: Deploy

- [ ] `gh repo create grimhollow-molten-depths --public --source=. --remote=origin`, push.
- [ ] `vercel link` (new project), `vercel deploy --prod`, capture the production URL.
- [ ] Write final README (features, controls, asset attribution, production URL) and set GitHub About description/topics.
- [ ] Commit: `docs: add production deployment README`.
- [ ] Notify user on Telegram via `hermes send --to telegram:1497989243` with the production URL.

---

## Self-review

- **Spec coverage:** environment (Task 3), player+boss+spawnling assets (Tasks 4–7), combat loop
  (Task 6–7), HUD/win-lose (Task 8), debug API (Task 9 — spec §5), deployment/README/Telegram
  (Task 10 — spec §7) all covered. No touch controls per spec §8 (intentionally omitted).
- **Placeholder scan:** none — every task has concrete verification and commit steps.
- **Type consistency:** `RiggedModel`, `Player`, `Boss`, `Spawnling`, `Hud` shapes declared once in
  the Interfaces block and reused verbatim across tasks.
