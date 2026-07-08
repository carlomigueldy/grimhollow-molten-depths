import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export interface RiggedModel {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clips: Record<string, THREE.AnimationClip>;
  skeleton: THREE.Skeleton | null;
}

const loader = new GLTFLoader();

/**
 * Loads the base mesh/skeleton from `url`, then loads each of `extraClipUrls` purely to harvest
 * their AnimationClips (Meshy exports each custom animation as its own full "_withSkin" GLB sharing
 * the same skeleton, so clips retarget cleanly by bone name onto the base mesh).
 */
export async function loadRiggedModel(url: string, extraClipUrls: string[] = []): Promise<RiggedModel> {
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const clips: Record<string, THREE.AnimationClip> = {};
  for (const clip of gltf.animations) {
    clips[clip.name] = clip;
  }

  const extraGltfs = await Promise.all(extraClipUrls.map((u) => loader.loadAsync(u)));
  for (const extra of extraGltfs) {
    for (const clip of extra.animations) {
      clips[clip.name] = clip;
    }
  }

  const mixer = new THREE.AnimationMixer(root);

  let skeleton: THREE.Skeleton | null = null;
  root.traverse((child) => {
    if (!skeleton && (child as THREE.SkinnedMesh).isSkinnedMesh) {
      skeleton = (child as THREE.SkinnedMesh).skeleton;
    }
  });

  return { root, mixer, clips, skeleton };
}

/** Finds a clip by trying several likely names (Meshy naming varies by run). */
export function findClip(clips: Record<string, THREE.AnimationClip>, candidates: string[]): THREE.AnimationClip | null {
  for (const name of candidates) {
    if (clips[name]) return clips[name];
  }
  const lower = candidates.map((c) => c.toLowerCase());
  for (const key of Object.keys(clips)) {
    if (lower.some((c) => key.toLowerCase().includes(c))) return clips[key];
  }
  return null;
}

export function cloneRiggedModel(model: RiggedModel): RiggedModel {
  const root = SkeletonUtils.clone(model.root) as THREE.Group;
  const mixer = new THREE.AnimationMixer(root);
  return { root, mixer, clips: model.clips, skeleton: null };
}
