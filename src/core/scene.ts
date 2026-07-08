import * as THREE from "three";

export interface SceneRig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
}

export function createScene(mount: HTMLElement): SceneRig {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0503, 0.028);

  const camera = new THREE.PerspectiveCamera(
    52,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.position.set(0, 9, 11);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0x8a6a4a, 0x140a06, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffb37a, 1.1);
  key.position.set(-8, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const rimFill = new THREE.PointLight(0xff5a1a, 0.6, 40, 2);
  rimFill.position.set(0, 3, -18);
  scene.add(rimFill);

  const clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, clock };
}

export function addTorchLight(scene: THREE.Scene, position: THREE.Vector3): THREE.PointLight {
  const light = new THREE.PointLight(0xff8c3a, 2.4, 9, 2.1);
  light.position.copy(position);
  light.castShadow = false;
  light.userData.baseIntensity = 2.4;
  light.userData.phase = Math.random() * Math.PI * 2;
  scene.add(light);
  return light;
}

export function updateTorchFlicker(lights: THREE.PointLight[], elapsed: number): void {
  for (const light of lights) {
    const base = (light.userData.baseIntensity as number) ?? 2.4;
    const phase = (light.userData.phase as number) ?? 0;
    light.intensity = base + Math.sin(elapsed * 9 + phase) * 0.25 + Math.sin(elapsed * 23 + phase) * 0.12;
  }
}
