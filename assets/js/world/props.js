// ============================================================
// STEP 5: PROPS — real 3D models (Kenney Furniture Kit, CC0)
// ============================================================
// New concepts in this file:
//
//   GLTF/GLB — the standard 3D model format of the web ("the JPEG
//     of 3D"). A .glb packs geometry + materials + textures into
//     one binary file. GLTFLoader parses it into a Three.js scene
//     graph we can position like any other object.
//
//   AUTO-COLLIDERS — instead of hand-authoring collision boxes,
//     we compute each model's bounding box AFTER placing it
//     (Box3.setFromObject), inflate it by the player's radius,
//     and hand the list to the movement code. Place furniture,
//     collision follows automatically.
//
//   INTERACTIVE PROPS — furniture can be a hotspot too: items with
//     an `interact` entry register every mesh of the model with the
//     raycaster (the laptop opens projects, the radio opens contact).
//
// All models: kenney.nl Furniture Kit, CC0 (see LICENSE.txt in
// the models folder). ~200KB for the whole room.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODELS_PATH = '/assets/models/furniture/';

// Kenney furniture is authored at realistic size (~0.75m desks), but
// against our 4m walls and 2m posters it reads doll-sized. Scaling
// everything up makes the props feel chunky and stylized instead.
// One knob for the whole room.
const PROP_SCALE = 2.2;

// The set dressing plan: one line per prop.
// x/z are floor positions in world meters. Items with `on: 'desk'` are
// rested on that model's MEASURED top surface — never guess a magic
// height for someone else's model; compute it from its bounding box.
// (`name` gives an item an id that `on` can refer to.)
const LAYOUT = [
  // The workstation, Mike's corner (east wall).
  // GOTCHA discovered by measuring: Kenney models have their origin at a
  // CORNER, not the center — this desk extends toward +x/+z from where
  // you place it. All coordinates below account for that (at 2.2 scale
  // the desk footprint is roughly x: +0.87, z: +1.6 from its origin).
  // (All numbers below were derived by measuring each model's world
  // bounding box in the live scene — see the session's tidy pass.)
  { file: 'desk', name: 'desk', x: 8.2, z: -0.8, rot: -90, collide: true },  // flush to east wall, centered on z=0
  { file: 'chairDesk', x: 7.9, z: 0.35, rot: 90, collide: true },            // tucked in, centered on the desk
  {
    file: 'laptop', x: 8.4, z: -0.3, rot: -90, on: 'desk',
    interact: { type: 'projects', label: 'open my projects' },
  },
  { file: 'books', x: 8.7, z: 0.55, rot: 15, on: 'desk' },

  // Library corner (north-east), flush to the north wall
  { file: 'bookcaseOpen', x: 7.0, z: -5.95, rot: 180, collide: true },

  // Lounge / contact corner (west wall)
  { file: 'loungeSofa', x: -8.1, z: 2.6, rot: 90, collide: true },           // back flush to west wall
  { file: 'tableCoffee', name: 'tableCoffee', x: -6.6, z: 1.4, rot: 90, collide: true }, // centered in front of sofa
  {
    file: 'radio', x: -6.7, z: 2.0, rot: 100, on: 'tableCoffee',
    interact: { type: 'contact', label: 'get in touch' },
  },
  { file: 'lampRoundFloor', x: -8.55, z: 0.05, rot: 90, collide: true, glow: true }, // against the wall, by the sofa's end
];

// Load everything in LAYOUT, add to the scene, return collision boxes.
// `hotspots` is the same array the raycaster watches — interactive props
// push into it as they arrive (works fine after Interactions is created,
// because arrays are shared by reference).
export async function decorateRoom(scene, hotspots) {
  const loader = new GLTFLoader();
  const colliders = [];

  // PHASE 1: download all models IN PARALLEL — Promise.all fires every
  // request at once instead of waiting for each before starting the next.
  const models = await Promise.all(
    LAYOUT.map((item) => loader.loadAsync(MODELS_PATH + item.file + '.glb'))
  );

  // PHASE 2: place them IN ORDER, so an item can sit on a surface that
  // was measured just before it (the `on:` mechanic).
  const surfaces = {}; // name → world-space top height (box.max.y)

  LAYOUT.forEach((item, i) => {
    const model = models[i].scene;

    const s = PROP_SCALE * (item.scale ?? 1);
    model.scale.setScalar(s);
    // Rest on a named surface if requested, else on the floor.
    model.position.set(item.x, item.on ? surfaces[item.on] : 0, item.z);
    model.rotation.y = THREE.MathUtils.degToRad(item.rot ?? 0);

    scene.add(model);

    // Bounding box in WORLD space, after position/rotation/scale applied.
    // updateMatrixWorld first: the transform we just set isn't propagated
    // to children until a render (or this call) happens.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);

    if (item.name) surfaces[item.name] = box.max.y; // e.g. the desk's top

    // Props marked `glow` get a real light at their measured top — the
    // floor lamp actually lights the lounge instead of just posing.
    if (item.glow) {
      const bulb = new THREE.PointLight(0xffe2b8, 14, 9);
      bulb.position.set(item.x, box.max.y - 0.2, item.z);
      scene.add(bulb);
    }

    if (item.collide) {
      const grown = box.clone().expandByScalar(0.3); // player radius: stop AT it, not IN it
      colliders.push({ minX: grown.min.x, maxX: grown.max.x, minZ: grown.min.z, maxZ: grown.max.z });
    }

    if (item.interact) {
      // A GLB is a tree of meshes — register every mesh so the ray can
      // hit any part, and highlight them all together on hover.
      const meshes = [];
      model.traverse((child) => { if (child.isMesh) meshes.push(child); });
      for (const mesh of meshes) {
        mesh.userData.action = item.interact;
        mesh.userData.highlightMeshes = meshes;
        hotspots.push(mesh);
      }
    }
  });

  return { colliders };
}
