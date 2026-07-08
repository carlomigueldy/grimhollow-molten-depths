import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./style.css";
import { createScene, addTorchLight, updateTorchFlicker } from "./core/scene";
import { Input } from "./core/input";
import { buildDungeon } from "./world/dungeon";
import { loadRiggedModel, cloneRiggedModel } from "./entities/loadModel";
import { Player } from "./entities/player";
import { Boss } from "./entities/boss";
import { Spawnling, SPAWNLING_XP_REWARD, SPAWNLING_GOLD_REWARD, CONTACT_DAMAGE } from "./entities/spawnling";
import { resolveMeleeHit, isWithinRadius, type MeleeTarget } from "./combat/combat";
import { Hud } from "./ui/hud";
import { installDebugApi } from "./debug/api";

const SMOKE_MODE = new URLSearchParams(window.location.search).has("smoke");

const ASSET_URLS = {
  player: "/assets/models/death-knight.glb",
  playerClips: [
    "/assets/models/death-knight-walk.glb",
    "/assets/models/death-knight-run.glb",
    "/assets/models/death-knight-idle.glb",
    "/assets/models/death-knight-slash.glb",
  ],
  boss: "/assets/models/molten-colossus.glb",
  bossClips: [
    "/assets/models/molten-colossus-walk.glb",
    "/assets/models/molten-colossus-run.glb",
    "/assets/models/molten-colossus-idle.glb",
    "/assets/models/molten-colossus-stomp.glb",
  ],
  chest: "/assets/models/treasure-chest.glb",
  torch: "/assets/models/brazier-torch.glb",
};

function setLoadingProgress(pct: number, label: string): void {
  const fill = document.getElementById("loading-fill");
  const text = document.getElementById("loading-label");
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = label;
}

function hideLoading(): void {
  document.getElementById("loading")?.classList.add("is-hidden");
}

async function loadStaticProp(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  gltf.scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return gltf.scene;
}

async function main(): Promise<void> {
  const appEl = document.getElementById("app");
  const hudEl = document.getElementById("hud");
  if (!appEl || !hudEl) throw new Error("Missing #app or #hud mount point");

  const { scene, camera, renderer, clock } = createScene(appEl);
  const input = new Input();
  const hud = new Hud(hudEl);

  const dungeon = buildDungeon();
  scene.add(dungeon.group);

  const torchLights = dungeon.torchPositions.map((pos) => addTorchLight(scene, pos));

  setLoadingProgress(15, "Raising the dungeon walls...");

  const [playerModel, bossModel, chestProp, torchProp] = await Promise.all([
    loadRiggedModel(ASSET_URLS.player, ASSET_URLS.playerClips),
    loadRiggedModel(ASSET_URLS.boss, ASSET_URLS.bossClips),
    loadStaticProp(ASSET_URLS.chest),
    loadStaticProp(ASSET_URLS.torch),
  ]);

  setLoadingProgress(70, "Summoning the Molten Colossus...");

  // Static props
  chestProp.position.copy(dungeon.chestPosition);
  chestProp.scale.setScalar(1.1);
  scene.add(chestProp);

  for (const pos of dungeon.torchPositions) {
    const torch = torchProp.clone(true);
    torch.position.copy(pos).setY(0);
    torch.scale.setScalar(1.3);
    scene.add(torch);
  }

  // Player
  const player = new Player(playerModel, dungeon.entrancePosition.clone());
  scene.add(player.object);

  // Boss
  const bossSpawn = dungeon.arenaCenter.clone().add(new THREE.Vector3(0, 0, -4));
  const boss = new Boss(bossModel, bossSpawn, dungeon.arenaCenter);
  scene.add(boss.object);

  // Spawnlings (clones of the boss rig, scaled down + tinted)
  const spawnlings: Spawnling[] = dungeon.spawnPoints.map((pos) => {
    const clone = cloneRiggedModel(bossModel);
    const spawnling = new Spawnling(clone, pos);
    scene.add(spawnling.object);
    return spawnling;
  });

  setLoadingProgress(100, "The depths await.");
  hideLoading();
  hud.mount(() => {
    if (player.isDead) player.respawn(dungeon.entrancePosition);
  });
  if (!SMOKE_MODE) {
    hud.toast("Descend into Grimhollow. Slay the molten spawn. Defeat the Colossus.");
  }

  let bossAwakened = false;
  let victoryShown = false;
  let deathShown = false;

  const cameraTarget = new THREE.Vector3().copy(player.position);
  const cameraDesired = new THREE.Vector3();
  const errors: string[] = [];

  function collectTargets(): MeleeTarget[] {
    const targets: MeleeTarget[] = [];
    spawnlings.forEach((s, idx) => {
      if (s.alive) targets.push({ id: `s${idx}`, position: s.position, radius: 0.6 });
    });
    if (boss.phase !== "dormant" && boss.phase !== "dead") {
      targets.push({ id: "boss", position: boss.position, radius: 1.8 });
    }
    return targets;
  }

  function worldToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const projected = pos.clone().project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function handleAttack(): void {
    const started = player.tryAttack(() => {
      const targets = collectTargets();
      const hitIds = resolveMeleeHit(player.position, player.facing, targets, 2.3, 120);
      for (const id of hitIds) {
        if (id === "boss") {
          boss.takeDamage(18);
          const screen = worldToScreen(boss.position.clone().add(new THREE.Vector3(0, 2, 0)));
          hud.spawnFloatingText(screen.x, screen.y, "18");
        } else {
          const idx = Number(id.slice(1));
          const s = spawnlings[idx];
          if (!s || !s.alive) continue;
          const killed = s.takeDamage(16);
          const screen = worldToScreen(s.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
          hud.spawnFloatingText(screen.x, screen.y, killed ? "Slain!" : "16");
          if (killed) {
            scene.remove(s.object);
            player.grantKillReward(SPAWNLING_XP_REWARD, SPAWNLING_GOLD_REWARD);
          }
        }
      }
    });
    if (!started) return;
  }

  function stompHit(center: THREE.Vector3, radius: number): void {
    if (isWithinRadius(player.position, center, radius)) {
      player.takeDamage(32);
      const screen = worldToScreen(player.position.clone().add(new THREE.Vector3(0, 1.6, 0)));
      hud.spawnFloatingText(screen.x, screen.y, "-32");
    }
  }

  function update(dt: number): void {
    if (input.consumeAttack()) handleAttack();

    player.update(dt, input, dungeon);

    for (const s of spawnlings) {
      if (!s.alive) continue;
      s.update(dt, player.position, () => {
        if (player.takeDamage(CONTACT_DAMAGE)) {
          const screen = worldToScreen(player.position.clone().add(new THREE.Vector3(0, 1.6, 0)));
          hud.spawnFloatingText(screen.x, screen.y, `-${CONTACT_DAMAGE}`);
        }
      });
    }

    if (!bossAwakened && player.position.distanceTo(dungeon.arenaCenter) < dungeon.arenaTriggerRadius) {
      bossAwakened = true;
      boss.wake();
      hud.toast("The Molten Colossus awakens!");
    }
    boss.update(dt, player.position, stompHit);

    if (boss.phase === "dead" && !victoryShown) {
      victoryShown = true;
      hud.showVictory();
    }
    if (player.isDead && !deathShown) {
      deathShown = true;
      hud.showDeath();
    }
    if (!player.isDead) deathShown = false;

    // Camera: smooth chase cam behind the player's facing direction.
    const forward = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
    cameraDesired.copy(player.position).addScaledVector(forward, -7.2).add(new THREE.Vector3(0, 5.6, 0));
    camera.position.lerp(cameraDesired, 1 - Math.exp(-dt * 4.5));
    cameraTarget.copy(player.position).addScaledVector(forward, 2.4).add(new THREE.Vector3(0, 1.4, 0));
    const lookTarget = camera.userData.lookTarget instanceof THREE.Vector3 ? camera.userData.lookTarget : cameraTarget.clone();
    lookTarget.lerp(cameraTarget, 1 - Math.exp(-dt * 6));
    camera.userData.lookTarget = lookTarget;
    camera.lookAt(lookTarget);

    updateTorchFlicker(torchLights, clock.elapsedTime);

    hud.update({
      hp: player.stats.hp,
      maxHp: player.stats.maxHp,
      mana: player.stats.mana,
      maxMana: player.stats.maxMana,
      level: player.stats.level,
      xp: player.stats.xp,
      xpToNext: player.stats.xpToNext,
      gold: player.stats.gold,
      boss: boss.phase === "dormant" ? null : { name: boss.name, hp: boss.hp, maxHp: boss.maxHp },
    });
  }

  installDebugApi({
    player,
    boss,
    spawnlings,
    input,
    errors,
    step: (dt, frames) => {
      for (let i = 0; i < frames; i++) update(dt);
    },
  });

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    update(dt);
    renderer.render(scene, camera);
  });
}

main().catch((err) => {
  console.error(err);
  setLoadingProgress(100, "Failed to load — check console.");
});
