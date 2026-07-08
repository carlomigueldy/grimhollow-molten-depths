import type { Player } from "../entities/player";
import type { Boss } from "../entities/boss";
import type { Spawnling } from "../entities/spawnling";
import type { Input } from "../core/input";

export interface DebugHandle {
  player: Player;
  boss: Boss;
  spawnlings: Spawnling[];
  input: Input;
  step: (dt: number, frames: number) => void;
  errors: string[];
}

declare global {
  interface Window {
    __GRIMHOLLOW__?: unknown;
  }
}

export function installDebugApi(handle: DebugHandle): void {
  window.addEventListener("error", (e) => handle.errors.push(e.message));

  window.__GRIMHOLLOW__ = {
    state: () => ({
      hp: handle.player.stats.hp,
      maxHp: handle.player.stats.maxHp,
      mana: handle.player.stats.mana,
      level: handle.player.stats.level,
      gold: handle.player.stats.gold,
      xp: handle.player.stats.xp,
      isDead: handle.player.isDead,
      position: handle.player.position.toArray(),
      bossHp: handle.boss.hp,
      bossPhase: handle.boss.phase,
      facing: handle.player.facing,
      playerDebug: handle.player.debugInfo,
      spawnlingsAlive: handle.spawnlings.filter((s) => s.alive).length,
      spawnlings: handle.spawnlings.map((s) => ({ alive: s.alive, hp: s.hp, position: s.position.toArray() })),
    }),
    hold: (code: string, down: boolean) => handle.input.set(code, down),
    step: (code: string, frames = 1) => {
      handle.input.set(code, true);
      handle.step(1 / 60, frames);
    },
    cast: (action: "attack") => {
      if (action === "attack") handle.input.queueAttack();
    },
    teleport: (x: number, z: number) => {
      handle.player.position.set(x, 0, z);
    },
    damageBoss: (amount: number) => handle.boss.takeDamage(amount),
    wakeBoss: () => handle.boss.wake(),
    get errors() {
      return handle.errors;
    },
  };
}
