// ============================================================
// THE WORLD — entry point
// ============================================================
// The three essentials of every Three.js app (from Step 2):
//   1. A Scene  — the container holding everything (meshes, lights, fog)
//   2. A Camera — the viewpoint the world is drawn from
//   3. A Renderer — draws the scene from the camera's view onto a <canvas>, every frame
//
// This file is the conductor: it creates those three, then wires the
// modules together — room.js (the set), controls.js (the player),
// interact.js (the raycaster), ui.js (the DOM overlays).
// ============================================================

import * as THREE from 'three';
import { PlayerControls } from './controls.js';
import { buildRoom, ROOM } from './room.js';
import { decorateRoom } from './props.js';
import { loadAvatar } from './avatar.js';
import { DIALOGUE } from './dialogue.js';
import { Interactions } from './interact.js';
import { WorldUI } from './ui.js';

// ---------- Renderer ----------
const canvas = document.getElementById('world-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Cap pixel ratio at 2: on retina/phone screens, rendering at full native
// resolution burns GPU for almost no visible gain.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212); // matches the site's dark theme
// Fog fades distant objects into the background color — cheap depth + atmosphere.
// Tuned gently: the room is only ~18m across, we just want the far wall moody.
scene.fog = new THREE.Fog(0x121212, 10, 26);

// ---------- Camera ----------
// PerspectiveCamera(fieldOfView, aspectRatio, nearClip, farClip)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
// 1.6 = human eye height in meters (Three.js units = meters by convention).
// Start near the south end, facing the blog wall (cameras look down -Z).
camera.position.set(0, 1.6, 3.5);

// ---------- Boot ----------
// Async because we fetch posts.json first — the room is BUILT FROM your
// blog data (Jekyll generates /posts.json at build time; see posts.json).
async function boot() {
  let posts = [];
  try {
    const res = await fetch('/posts.json');
    posts = (await res.json()).posts;
  } catch (err) {
    console.warn('posts.json unavailable — the gallery wall will be empty', err);
  }

  // The set: walls, lights, posters. Returns the interactive meshes.
  const { hotspots } = buildRoom(scene, posts);

  // The furniture (async — GLB files download in parallel). The world is
  // walkable immediately; props pop in when ready and bring their
  // collision boxes with them. Interactive props (laptop, radio) push
  // themselves into the shared `hotspots` array as they arrive.
  const propsReady = decorateRoom(scene, hotspots);

  // The player. Bounds = room minus a margin so you stop AT walls, not in them.
  const controls = new PlayerControls(camera, canvas, {
    bounds: {
      minX: -(ROOM.width / 2 - 0.7), maxX: ROOM.width / 2 - 0.7,
      minZ: -(ROOM.depth / 2 - 0.7), maxZ: ROOM.depth / 2 - 0.7,
    },
  });

  propsReady.then(({ colliders }) => { controls.colliders.push(...colliders); })
    .catch((err) => console.warn('props failed to load — room stays minimal', err));

  // 3D Mike (12MB of FBX — loads in the background, pops in when ready).
  // `avatar.update` gets called every frame once he exists.
  let avatar = null;
  loadAvatar(scene, hotspots).then((a) => {
    avatar = a;
    controls.colliders.push(a.collider);
  }).catch((err) => console.warn('avatar failed to load', err));

  const ui = new WorldUI();
  // Talking freezes walking (you stay planted mid-conversation) but the
  // mouse stays locked — choices are picked with number keys.
  ui.onDialogueStart = () => { controls.frozen = true; };
  ui.onDialogueEnd = () => { controls.frozen = false; };

  // The raycaster, wired to the UI prompt and to real actions.
  const interactions = new Interactions(camera, hotspots, {
    onTargetChange: (action) => ui.setPrompt(action),
    onActivate: (action) => {
      if (action.type === 'post') ui.openPost(action.post);
      else if (action.type === 'archive') ui.openArchive(posts);
      else if (action.type === 'projects') ui.openProjects();
      else if (action.type === 'about') ui.openAbout();
      else if (action.type === 'contact') ui.openContact();
      else if (action.type === 'link') { window.location.href = action.href; return; }
      else if (action.type === 'talk') { ui.openDialogue(DIALOGUE); return; } // keeps pointer lock!
      // Reading uses the mouse (scrolling, links), so give the cursor back.
      // ui.isOpen is already true here, which tells onUnlock below NOT to
      // treat this as "pause" — that's the whole panel/pause dance.
      document.exitPointerLock();
    },
  });

  // --- The pointer-lock / overlay / panel dance ---
  // Pointer lock can end three ways: Esc (pause), opening a panel (reading),
  // or a failed re-lock. Only the first should show the pause overlay.
  const overlay = document.getElementById('intro-overlay');
  const reticle = document.getElementById('reticle');
  document.getElementById('enter-btn').addEventListener('click', () => controls.lock());

  controls.onLock = () => {
    overlay.classList.add('hidden');
    reticle.hidden = false;
  };
  controls.onUnlock = () => {
    reticle.hidden = true;
    ui.setPrompt(null);
    if (ui.isDialogueOpen) ui.closeDialogue(); // Esc mid-conversation = walk away
    if (!ui.isOpen) overlay.classList.remove('hidden'); // pause, not reading
  };
  // Closing the reader re-grabs the pointer (the close click is the
  // user gesture browsers require). If the grab fails, controls.lock()
  // falls back to showing the pause overlay.
  ui.onClose = () => controls.lock();

  // --- Activation inputs: E or click, only while walking ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && controls.isLocked && !ui.isDialogueOpen) interactions.activate();
    // Esc with the reader open: close it (browser Esc-unlock already
    // happened when the reader opened, so this is our job).
    if (e.code === 'Escape' && ui.isOpen) ui.close();
  });
  canvas.addEventListener('click', () => {
    if (controls.isLocked) interactions.activate();
  });

  // Dev helper: poke at the world from the browser console.
  window.__world = { scene, camera, controls, renderer, interactions, ui };

  // ---------- The render loop ----------
  // The heartbeat: runs ~60x/second. Each frame: update the world, then draw it.
  // The clock gives us delta time (seconds since last frame) so motion is
  // framerate-independent.
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    controls.update(dt);      // move the player...
    interactions.update();    // ...check what they're aiming at...
    if (avatar) avatar.update(dt, camera); // ...let Mike notice them...
    renderer.render(scene, camera); // ...draw the frame
  });
}

// ---------- Resize handling ----------
// The camera's aspect ratio and the renderer's size must track the window,
// or the image stretches. Changing camera settings requires updateProjectionMatrix().
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

boot();
