import * as THREE from "three";

export interface MeleeTarget {
  id: string;
  position: THREE.Vector3;
  radius: number;
}

const _toTarget = new THREE.Vector3();

/** Returns the ids of targets within `range` and within `arcDeg` of the attacker's facing direction. */
export function resolveMeleeHit(
  attackerPos: THREE.Vector3,
  facingRad: number,
  targets: MeleeTarget[],
  range: number,
  arcDeg: number,
): string[] {
  const hits: string[] = [];
  const halfArc = THREE.MathUtils.degToRad(arcDeg / 2);
  const facingDir = new THREE.Vector3(Math.sin(facingRad), 0, Math.cos(facingRad));

  for (const target of targets) {
    _toTarget.subVectors(target.position, attackerPos);
    _toTarget.y = 0;
    const dist = _toTarget.length();
    if (dist > range + target.radius) continue;
    if (dist < 0.001) {
      hits.push(target.id);
      continue;
    }
    _toTarget.normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(facingDir.dot(_toTarget), -1, 1));
    if (angle <= halfArc) hits.push(target.id);
  }

  return hits;
}

export function isWithinRadius(a: THREE.Vector3, b: THREE.Vector3, radius: number): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz <= radius * radius;
}
