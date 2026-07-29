// ============================================================
// STEP 6: THE AVATAR — 3D Mike (MetaPerson export)
// ============================================================
// Loads the FBX avatar and gives it just enough life to not feel
// like a mannequin:
//
//   NORMALIZED SCALE — never trust a model's units (FBX might be
//     cm, m, or inches). We measure the bounding box and scale to
//     a target height. Works for ANY replacement model.
//
//   BODY TURN — each frame, if the player is nearby, the avatar
//     smoothly rotates to face them. This one cheap trick reads
//     as "he notices you" and does most of the work of feeling
//     alive. (Real skeletal animation can come later.)
// ============================================================

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const AVATAR_URL = '/assets/models/avatar/model.fbx';
const HEIGHT = 2.0;             // meters — a bit larger than life, to match the chunky furniture
const SPOT = { x: 7.6, z: 1.7 } // standing right beside the desk's south end
const FACE_DEFAULT = -1.8;      // idle facing: angled toward the room center
const NOTICE_RADIUS = 5;        // how close you must be before he turns

export async function loadAvatar(scene, hotspots) {
  const fbx = await new FBXLoader().loadAsync(AVATAR_URL);

  // Normalize: measure, then scale so he's exactly HEIGHT meters tall.
  const box = new THREE.Box3().setFromObject(fbx);
  const s = HEIGHT / (box.max.y - box.min.y);
  fbx.scale.setScalar(s);
  // Plant the feet: models don't always have their origin at the floor,
  // so shift down by wherever the (scaled) bounding box bottom landed.
  fbx.position.set(SPOT.x, -box.min.y * s, SPOT.z);
  fbx.rotation.y = FACE_DEFAULT;
  scene.add(fbx);

  // RELAX THE T-POSE: rigs ship with arms straight out (the neutral pose
  // for skinning). Rotating each upper-arm bone drops the arms to the
  // sides. Two hard-won lessons baked in here:
  //  1. This FBX contains DUPLICATE bones with the same names — the real
  //     ones are parented to the shoulders, so we filter by parent.
  //  2. On this rig the upper arm's X axis is the "lower the arm" axis
  //     (found empirically — every rig orients its bones differently).
  fbx.traverse((o) => {
    if (o.isBone && /^(Left|Right)Arm$/.test(o.name) && /Shoulder$/.test(o.parent.name)) {
      o.rotation.x += 1.2;
    }
  });

  // Every mesh of the body is a "talk" hotspot.
  const meshes = [];
  fbx.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      meshes.push(child);
      child.userData.action = { type: 'talk', label: 'talk to Mike' };
      // No highlightMeshes on purpose: a glowing purple human is creepy.
    }
  });
  hotspots.push(...meshes);

  // Don't let the player walk through him.
  const collider = {
    minX: SPOT.x - 0.55, maxX: SPOT.x + 0.55,
    minZ: SPOT.z - 0.55, maxZ: SPOT.z + 0.55,
  };

  return {
    model: fbx,
    collider,
    // Called every frame from the render loop.
    update(dt, camera) {
      const dx = camera.position.x - fbx.position.x;
      const dz = camera.position.z - fbx.position.z;
      const close = dx * dx + dz * dz < NOTICE_RADIUS * NOTICE_RADIUS;

      // atan2(dx, dz) = the yaw that points the model's +z at the player.
      const targetYaw = close ? Math.atan2(dx, dz) : FACE_DEFAULT;

      // Ease toward it. Angles need shortest-path wrapping: without this
      // he'd spin the long way round when the angle crosses ±180°.
      let diff = targetYaw - fbx.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      fbx.rotation.y += diff * Math.min(1, 3 * dt);
    },
  };
}
