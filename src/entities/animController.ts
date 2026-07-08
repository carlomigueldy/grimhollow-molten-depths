import * as THREE from "three";
import type { RiggedModel } from "./loadModel";
import { findClip } from "./loadModel";

export type LocomotionState = "idle" | "walk" | "run";

/** Crossfades a small locomotion set (idle/walk/run) and layers one-shot action clips on top. */
export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Partial<Record<LocomotionState, THREE.AnimationAction>> = {};
  private current: LocomotionState = "idle";
  private oneShot: THREE.AnimationAction | null = null;
  private onOneShotDone: (() => void) | null = null;

  constructor(model: RiggedModel, clipNames: { idle: string[]; walk: string[]; run: string[] }) {
    this.mixer = model.mixer;
    const idleClip = findClip(model.clips, clipNames.idle);
    const walkClip = findClip(model.clips, clipNames.walk);
    const runClip = findClip(model.clips, clipNames.run);

    if (idleClip) this.actions.idle = this.mixer.clipAction(idleClip);
    if (walkClip) this.actions.walk = this.mixer.clipAction(walkClip);
    if (runClip) this.actions.run = this.mixer.clipAction(runClip);

    const first = this.actions.idle ?? this.actions.walk ?? this.actions.run;
    first?.play();
  }

  setLocomotion(state: LocomotionState): void {
    if (state === this.current || this.oneShot) return;
    const next = this.actions[state] ?? this.actions.idle;
    const prev = this.actions[this.current];
    if (!next) return;
    next.reset().setEffectiveWeight(1).fadeIn(0.25).play();
    if (prev && prev !== next) prev.fadeOut(0.25);
    this.current = state;
  }

  /** Plays a one-shot clip (e.g. attack) and returns to locomotion when it finishes. */
  playOneShot(clip: THREE.AnimationClip | null, onDone?: () => void, timeScale = 1.35): void {
    if (!clip) {
      onDone?.();
      return;
    }
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = timeScale;
    action.fadeIn(0.05);
    action.play();
    this.oneShot = action;
    this.onOneShotDone = onDone ?? null;

    const handler = (e: THREE.AnimationMixerEventMap["finished"]) => {
      if (e.action !== action) return;
      this.mixer.removeEventListener("finished", handler);
      action.fadeOut(0.15);
      this.oneShot = null;
      this.current = "idle";
      const cb = this.onOneShotDone;
      this.onOneShotDone = null;
      cb?.();
    };
    this.mixer.addEventListener("finished", handler);
  }

  get isBusy(): boolean {
    return this.oneShot !== null;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}
