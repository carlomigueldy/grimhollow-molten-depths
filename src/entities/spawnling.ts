import * as THREE from "three";
import type { RiggedModel } from "./loadModel";
import { AnimationController } from "./animController";

const AGGRO_RADIUS = 6.5;
const CHASE_SPEED = 2.6;
const CONTACT_RANGE = 1.1;
const CONTACT_DAMAGE = 6;
const CONTACT_COOLDOWN = 0.9;

let tintedMaterial: THREE.MeshStandardMaterial | null = null;
function getTint(): THREE.MeshStandardMaterial {
  if (!tintedMaterial) {
    tintedMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a1a10,
      emissive: 0xff3300,
      emissiveIntensity: 0.35,
      roughness: 0.8,
    });
  }
  return tintedMaterial;
}

export class Spawnling {
  readonly object: THREE.Group;
  hp = 30;
  alive = true;

  private anim: AnimationController;
  private contactTimer = 0;
  private homePosition: THREE.Vector3;

  constructor(model: RiggedModel, position: THREE.Vector3) {
    this.object = model.root;
    this.object.position.copy(position);
    this.object.scale.setScalar(0.45);
    this.homePosition = position.clone();

    this.object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = getTint();
      }
    });

    this.anim = new AnimationController(model, {
      idle: ["Idle", "idle"],
      walk: ["Walking", "Walk", "walk"],
      run: ["Running", "Run", "run"],
    });
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  update(dt: number, playerPos: THREE.Vector3, onContactHit: () => void): void {
    if (!this.alive) return;
    this.anim.update(dt);
    if (this.contactTimer > 0) this.contactTimer -= dt;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.object.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist < AGGRO_RADIUS && dist > CONTACT_RANGE) {
      toPlayer.normalize();
      this.object.position.addScaledVector(toPlayer, CHASE_SPEED * dt);
      this.object.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      this.anim.setLocomotion("run");
    } else if (dist <= CONTACT_RANGE) {
      this.anim.setLocomotion("idle");
      if (this.contactTimer <= 0) {
        this.contactTimer = CONTACT_COOLDOWN;
        onContactHit();
      }
    } else {
      const toHome = new THREE.Vector3().subVectors(this.homePosition, this.object.position);
      toHome.y = 0;
      if (toHome.length() > 0.3) {
        toHome.normalize();
        this.object.position.addScaledVector(toHome, CHASE_SPEED * 0.5 * dt);
        this.anim.setLocomotion("walk");
      } else {
        this.anim.setLocomotion("idle");
      }
    }
  }
}

export const SPAWNLING_XP_REWARD = 12;
export const SPAWNLING_GOLD_REWARD = 5;
export { CONTACT_DAMAGE };
