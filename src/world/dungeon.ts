import * as THREE from "three";

export interface RectBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CircleBlocker {
  type: "circle";
  x: number;
  z: number;
  radius: number;
}

export interface RectBlocker extends RectBounds {
  type: "rect";
}

export type Blocker = CircleBlocker | RectBlocker;

export interface DungeonData {
  group: THREE.Group;
  walkable: RectBounds[];
  blockers: Blocker[];
  torchPositions: THREE.Vector3[];
  chestPosition: THREE.Vector3;
  entrancePosition: THREE.Vector3;
  spawnPoints: THREE.Vector3[];
  arenaCenter: THREE.Vector3;
  arenaRadius: number;
  arenaTriggerRadius: number;
}

const STONE = new THREE.MeshStandardMaterial({ color: 0x746355, roughness: 0.92, metalness: 0.05 });
const STONE_DARK = new THREE.MeshStandardMaterial({ color: 0x4a3f36, roughness: 0.95, metalness: 0.04 });
const WALL = new THREE.MeshStandardMaterial({ color: 0x5b4c3f, roughness: 0.9, metalness: 0.05 });
const ARENA_FLOOR = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.85, metalness: 0.1 });
const LAVA = new THREE.MeshStandardMaterial({
  color: 0xff5a1a,
  emissive: 0xff3300,
  emissiveIntensity: 2.2,
  roughness: 0.4,
});

function floorSlab(group: THREE.Group, cx: number, cz: number, w: number, d: number, material = STONE): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), material);
  mesh.position.set(cx, -0.25, cz);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function wallSegment(
  group: THREE.Group,
  blockers: Blocker[],
  cx: number,
  cz: number,
  w: number,
  d: number,
  h = 4.2,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), WALL);
  mesh.position.set(cx, h / 2, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  blockers.push({ type: "rect", minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

function pillar(group: THREE.Group, blockers: Blocker[], x: number, z: number, radius = 0.55, height = 4.4): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, height, 10), STONE_DARK);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.3, radius * 1.3, 0.3, 10), STONE_DARK);
  cap.position.set(x, height + 0.15, z);
  group.add(cap);
  blockers.push({ type: "circle", x, z, radius: radius + 0.15 });
}

function rubble(group: THREE.Group, x: number, z: number): void {
  for (let i = 0; i < 3; i++) {
    const s = 0.3 + Math.random() * 0.5;
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), STONE_DARK);
    mesh.position.set(x + (Math.random() - 0.5) * 1.6, s * 0.4, z + (Math.random() - 0.5) * 1.6);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

export function buildDungeon(): DungeonData {
  const group = new THREE.Group();
  const walkable: RectBounds[] = [];
  const blockers: Blocker[] = [];
  const torchPositions: THREE.Vector3[] = [];

  // --- Entrance hall ---
  floorSlab(group, 0, 15, 12, 10);
  walkable.push({ minX: -6, maxX: 6, minZ: 10, maxZ: 20 });
  wallSegment(group, blockers, -6.25, 15, 0.5, 10);
  wallSegment(group, blockers, 6.25, 15, 0.5, 10);
  wallSegment(group, blockers, -4, 20.25, 4.5, 0.5);
  wallSegment(group, blockers, 4, 20.25, 4.5, 0.5);
  pillar(group, blockers, -4.5, 12, 0.5, 4.2);
  pillar(group, blockers, 4.5, 12, 0.5, 4.2);
  torchPositions.push(new THREE.Vector3(-5.6, 2.6, 15), new THREE.Vector3(5.6, 2.6, 15));

  // --- Main corridor (entrance -> cloister) ---
  floorSlab(group, 0, 4, 5, 12);
  walkable.push({ minX: -2.5, maxX: 2.5, minZ: -2, maxZ: 10 });
  wallSegment(group, blockers, -2.75, 6, 0.5, 10);
  wallSegment(group, blockers, 2.75, 6, 0.5, 10);
  torchPositions.push(new THREE.Vector3(-2.55, 2.4, 6), new THREE.Vector3(2.55, 2.4, 2));

  // --- Cloister / central gallery hub ---
  floorSlab(group, 0, -3, 20, 10);
  walkable.push({ minX: -9, maxX: 9, minZ: -8, maxZ: 2 });
  wallSegment(group, blockers, 0, 2.25, 22, 0.5); // north wall with corridor gap handled by wider walkable
  wallSegment(group, blockers, -9.25, -3, 0.5, 10);
  wallSegment(group, blockers, 9.25, -3, 0.5, 10);
  pillar(group, blockers, -5, -2, 0.55, 4.6);
  pillar(group, blockers, 5, -2, 0.55, 4.6);
  pillar(group, blockers, -5, -6, 0.55, 4.6);
  pillar(group, blockers, 5, -6, 0.55, 4.6);
  rubble(group, -2, -6.5);
  rubble(group, 2.5, -1);
  torchPositions.push(new THREE.Vector3(-8.7, 2.6, -3), new THREE.Vector3(8.7, 2.6, -3));

  // --- Left chamber: molten spawnling den ---
  floorSlab(group, -17, -4, 14, 10, STONE_DARK);
  walkable.push({ minX: -24, maxX: -10, minZ: -9, maxZ: 1 });
  wallSegment(group, blockers, -24.25, -4, 0.5, 10);
  wallSegment(group, blockers, -17, -9.25, 14, 0.5);
  wallSegment(group, blockers, -17, 1.25, 5, 0.5);
  wallSegment(group, blockers, -22, 1.25, 3.5, 0.5);
  pillar(group, blockers, -17, -4, 0.6, 4.8);
  rubble(group, -20, -6);
  rubble(group, -14, -2);
  torchPositions.push(new THREE.Vector3(-23.5, 2.6, -4));
  const spawnPoints = [
    new THREE.Vector3(-20, 0, -6),
    new THREE.Vector3(-14, 0, -6),
    new THREE.Vector3(-20, 0, -2),
    new THREE.Vector3(-14, 0, -2),
  ];

  // --- Right chamber: treasure room ---
  floorSlab(group, 17, -4, 14, 10, STONE_DARK);
  walkable.push({ minX: 10, maxX: 24, minZ: -9, maxZ: 1 });
  wallSegment(group, blockers, 24.25, -4, 0.5, 10);
  wallSegment(group, blockers, 17, -9.25, 14, 0.5);
  wallSegment(group, blockers, 17, 1.25, 5, 0.5);
  wallSegment(group, blockers, 22, 1.25, 3.5, 0.5);
  torchPositions.push(new THREE.Vector3(23.5, 2.6, -4));
  const chestPosition = new THREE.Vector3(17, 0, -4);

  // --- Brazier corridor (cloister -> boss arena) ---
  floorSlab(group, 0, -13, 6, 12);
  walkable.push({ minX: -3, maxX: 3, minZ: -19, maxZ: -7 });
  wallSegment(group, blockers, -3.25, -13, 0.5, 12);
  wallSegment(group, blockers, 3.25, -13, 0.5, 12);
  torchPositions.push(
    new THREE.Vector3(-2.9, 2.4, -10),
    new THREE.Vector3(2.9, 2.4, -10),
    new THREE.Vector3(-2.9, 2.4, -16),
    new THREE.Vector3(2.9, 2.4, -16),
  );

  // --- Boss arena (raised octagon with lava moat) ---
  const arenaCenter = new THREE.Vector3(0, 0, -30);
  const arenaRadius = 10;
  const arenaSegments = 8;
  const arenaFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(arenaRadius, arenaRadius, 0.6, arenaSegments),
    ARENA_FLOOR,
  );
  arenaFloor.position.set(arenaCenter.x, -0.3, arenaCenter.z);
  arenaFloor.receiveShadow = true;
  group.add(arenaFloor);
  walkable.push({
    minX: arenaCenter.x - arenaRadius,
    maxX: arenaCenter.x + arenaRadius,
    minZ: arenaCenter.z - arenaRadius,
    maxZ: arenaCenter.z + arenaRadius,
  });

  const moat = new THREE.Mesh(new THREE.RingGeometry(arenaRadius + 0.4, arenaRadius + 2.6, arenaSegments * 2), LAVA);
  moat.rotation.x = -Math.PI / 2;
  moat.position.set(arenaCenter.x, 0.02, arenaCenter.z);
  group.add(moat);

  const moatLight = new THREE.PointLight(0xff4a12, 3.2, 26, 2);
  moatLight.position.set(arenaCenter.x, 1.2, arenaCenter.z);
  group.add(moatLight);

  for (let i = 0; i < arenaSegments; i++) {
    const angle = (i / arenaSegments) * Math.PI * 2 + Math.PI / arenaSegments;
    if (Math.abs(((angle + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.35) continue; // leave the entrance gap open
    const px = arenaCenter.x + Math.sin(angle) * (arenaRadius - 0.6);
    const pz = arenaCenter.z + Math.cos(angle) * (arenaRadius - 0.6);
    pillar(group, blockers, px, pz, 0.5, 5.2);
    if (i % 2 === 0) torchPositions.push(new THREE.Vector3(px, 3, pz));
  }

  const entrancePosition = new THREE.Vector3(0, 0, 17);

  return {
    group,
    walkable,
    blockers,
    torchPositions,
    chestPosition,
    entrancePosition,
    spawnPoints,
    arenaCenter,
    arenaRadius,
    arenaTriggerRadius: arenaRadius + 3,
  };
}

export function isInsideWalkable(walkable: RectBounds[], x: number, z: number): boolean {
  for (const rect of walkable) {
    if (x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ) return true;
  }
  return false;
}

export function collidesBlocker(blockers: Blocker[], x: number, z: number, radius: number): boolean {
  for (const b of blockers) {
    if (b.type === "circle") {
      const dx = x - b.x;
      const dz = z - b.z;
      if (Math.sqrt(dx * dx + dz * dz) < b.radius + radius) return true;
    } else {
      if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) return true;
    }
  }
  return false;
}

export function canStandAt(dungeon: DungeonData, x: number, z: number, radius = 0.35): boolean {
  return isInsideWalkable(dungeon.walkable, x, z) && !collidesBlocker(dungeon.blockers, x, z, radius);
}
