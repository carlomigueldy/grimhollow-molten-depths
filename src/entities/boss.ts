import * as THREE from "three";
import type { RiggedModel } from "./loadModel";
import { findClip } from "./loadModel";
import { AnimationController } from "./animController";

export type BossPhase = "dormant" | "aggro" | "stomping" | "dead";

const CHASE_SPEED = 2.8;
const MELEE_RANGE = 2.4;
const STOMP_RANGE = 3.6;
const STOMP_COOLDOWN = 3.2;
const STOMP_WINDUP = 0.75;

export class Boss {
  readonly object: THREE.Group;
  maxHp = 620;
  hp = 620;
  phase: BossPhase = "dormant";
  name = "Molten Colossus";

  private anim: AnimationController;
  private stompClip: THREE.AnimationClip | null;
  private stompCooldown = 1.5;
  private stompWindupTimer = 0;
  private pendingStompResolve: (() => void) | null = null;
  private arenaCenter: THREE.Vector3;

  constructor(model: RiggedModel, position: THREE.Vector3, arenaCenter: THREE.Vector3) {
    this.object = model.root;
    this.object.position.copy(position);
    this.object.scale.setScalar(2.0);
    this.arenaCenter = arenaCenter.clone();

    this.anim = new AnimationController(model, {
      idle: ["Idle", "idle"],
      walk: ["Walking", "Walk", "walk"],
      run: ["Running", "Run", "run"],
    });
    this.stompClip = findClip(model.clips, ["Angry_Ground_Stomp", "Ground_Stomp", "Stomp", "Angry_Stomp"]);
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  wake(): void {
    if (this.phase === "dormant") this.phase = "aggro";
  }

  takeDamage(amount: number): void {
    if (this.phase === "dead") return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.phase = "dead";
      this.anim.setLocomotion("idle");
    }
  }

  update(dt: number, playerPos: THREE.Vector3, onStompHit: (center: THREE.Vector3, radius: number) => void): void {
    this.anim.update(dt);
    if (this.stompCooldown > 0) this.stompCooldown -= dt;

    if (this.stompWindupTimer > 0) {
      this.stompWindupTimer -= dt;
      if (this.stompWindupTimer <= 0 && this.pendingStompResolve) {
        onStompHit(this.object.position, STOMP_RANGE);
        this.pendingStompResolve();
        this.pendingStompResolve = null;
      }
    }

    if (this.phase !== "aggro") return;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.object.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist <= STOMP_RANGE && this.stompCooldown <= 0 && !this.anim.isBusy) {
      this.phase = "stomping";
      this.anim.playOneShot(this.stompClip, () => {
        if (this.phase !== "dead") this.phase = "aggro";
      });
      this.stompCooldown = STOMP_COOLDOWN;
      this.stompWindupTimer = STOMP_WINDUP;
      this.pendingStompResolve = () => {};
      return;
    }

    if (dist > MELEE_RANGE && !this.anim.isBusy) {
      toPlayer.normalize();
      const next = this.object.position.clone().addScaledVector(toPlayer, CHASE_SPEED * dt);
      // keep the colossus roughly inside its arena
      if (next.distanceTo(this.arenaCenter) < 11.5) {
        this.object.position.copy(next);
      }
      this.object.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      this.anim.setLocomotion("walk");
    } else if (!this.anim.isBusy) {
      this.anim.setLocomotion("idle");
    }
  }
}
