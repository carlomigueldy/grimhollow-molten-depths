import * as THREE from "three";
import type { RiggedModel } from "./loadModel";
import { findClip } from "./loadModel";
import { AnimationController } from "./animController";
import type { DungeonData } from "../world/dungeon";
import { canStandAt } from "../world/dungeon";
import type { Input } from "../core/input";

const MOVE_SPEED = 3.4;
const RUN_SPEED = 6.2;
const ATTACK_COOLDOWN = 0.55;
const ATTACK_WINDUP = 0.18;
const PLAYER_RADIUS = 0.4;

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
}

export class Player {
  readonly object: THREE.Group;
  readonly stats: PlayerStats;
  facing = Math.PI;
  isDead = false;

  private anim: AnimationController;
  private attackClip: THREE.AnimationClip | null;
  private attackCooldownTimer = 0;
  private attackWindupTimer = 0;
  private pendingHitResolve: (() => void) | null = null;
  private invulnTimer = 0;

  constructor(model: RiggedModel, spawnPosition: THREE.Vector3) {
    this.object = model.root;
    this.object.position.copy(spawnPosition);
    this.object.scale.setScalar(1.0);
    this.object.rotation.y = this.facing;

    this.anim = new AnimationController(model, {
      idle: ["Idle", "idle"],
      walk: ["Walking", "Walk", "walk"],
      run: ["Running", "Run", "run"],
    });
    this.attackClip = findClip(model.clips, ["Right_Hand_Sword_Slash", "Sword_Slash", "Slash", "Attack"]);

    this.stats = { hp: 100, maxHp: 100, mana: 50, maxMana: 50, level: 1, xp: 0, xpToNext: 40, gold: 0 };
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  get debugInfo(): { isBusy: boolean; cooldown: number; attackClipDuration: number | null } {
    return {
      isBusy: this.anim.isBusy,
      cooldown: this.attackCooldownTimer,
      attackClipDuration: this.attackClip?.duration ?? null,
    };
  }

  /** Attempts to start an attack. Calls onHit when the strike lands (mid-swing). Returns true if the attack started. */
  tryAttack(onHit: () => void): boolean {
    if (this.isDead || this.attackCooldownTimer > 0 || this.anim.isBusy) return false;
    this.anim.playOneShot(this.attackClip);
    this.attackCooldownTimer = ATTACK_COOLDOWN;
    this.attackWindupTimer = ATTACK_WINDUP;
    this.pendingHitResolve = onHit;
    return true;
  }

  takeDamage(amount: number): boolean {
    if (this.isDead || this.invulnTimer > 0) return false;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invulnTimer = 0.4;
    if (this.stats.hp <= 0) {
      this.isDead = true;
    }
    return true;
  }

  grantKillReward(xp: number, gold: number): void {
    this.stats.xp += xp;
    this.stats.gold += gold;
    while (this.stats.xp >= this.stats.xpToNext) {
      this.stats.xp -= this.stats.xpToNext;
      this.stats.level += 1;
      this.stats.xpToNext = Math.round(this.stats.xpToNext * 1.35);
      this.stats.maxHp += 20;
      this.stats.maxMana += 8;
      this.stats.hp = this.stats.maxHp;
      this.stats.mana = this.stats.maxMana;
    }
  }

  respawn(position: THREE.Vector3): void {
    this.isDead = false;
    this.stats.hp = this.stats.maxHp;
    this.stats.mana = this.stats.maxMana;
    this.stats.gold = Math.max(0, this.stats.gold - Math.round(this.stats.gold * 0.15));
    this.object.position.copy(position);
    this.invulnTimer = 1.0;
  }

  update(dt: number, input: Input, dungeon: DungeonData): void {
    this.anim.update(dt);
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    if (this.attackWindupTimer > 0) {
      this.attackWindupTimer -= dt;
      if (this.attackWindupTimer <= 0 && this.pendingHitResolve) {
        const resolve = this.pendingHitResolve;
        this.pendingHitResolve = null;
        resolve();
      }
    }

    if (this.isDead) return;

    const move = input.moveVector();
    const moving = move.x !== 0 || move.z !== 0;
    const running = input.isRunning() && moving;

    if (moving && !this.anim.isBusy) {
      const len = Math.hypot(move.x, move.z) || 1;
      const dx = move.x / len;
      const dz = move.z / len;
      const speed = running ? RUN_SPEED : MOVE_SPEED;
      const nx = this.object.position.x + dx * speed * dt;
      const nz = this.object.position.z + dz * speed * dt;

      if (canStandAt(dungeon, nx, this.object.position.z, PLAYER_RADIUS)) this.object.position.x = nx;
      if (canStandAt(dungeon, this.object.position.x, nz, PLAYER_RADIUS)) this.object.position.z = nz;

      const targetFacing = Math.atan2(dx, dz);
      this.facing = smoothAngle(this.facing, targetFacing, dt);
      this.object.rotation.y = this.facing;
    }

    if (!this.anim.isBusy) {
      this.anim.setLocomotion(moving ? (running ? "run" : "walk") : "idle");
    }
  }
}

function smoothAngle(current: number, target: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const rate = Math.min(1, dt * 12);
  return current + diff * rate;
}
