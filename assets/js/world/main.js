// The three essentials of every Three.js app:
//   1. A Scene  — the container holding everything (meshes, lights, fog)
//   2. A Camera — the viewpoint the world is drawn from
//   3. A Renderer — draws the scene from the camera's view onto a <canvas>, every frame

import * as THREE from 'three';
import { PlayerControls } from './controls.js';

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
scene.fog = new THREE.Fog(0x121212, 8, 30);

// ---------- Camera ----------
// PerspectiveCamera(fieldOfView, aspectRatio, nearClip, farClip)
// Anything closer than `near` or farther than `far` isn't drawn.
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5); // 1.6 = human eye height in meters; Three.js units = meters by convention

// ---------- Lights ----------
// Without lights, standard materials render pure black.
// Ambient = soft fill light from everywhere (no shadows, no direction).
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
// Directional = sun-like parallel rays from a direction.
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(3, 6, 4);
scene.add(sun);

// ---------- Floor ----------
// A retro neon grid, synthwave style — fits the pixel/RPG aesthetic.
const grid = new THREE.GridHelper(60, 60, 0xffd54f, 0x2d2d2d);
scene.add(grid);

// ---------- A test object ----------
// Mesh = Geometry (the shape) + Material (the surface).
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.4, metalness: 0.2 })
);
cube.position.set(0, 1, 0);
scene.add(cube);

// ---------- Controls (Step 3) ----------
// The controls own the camera from here on: mouse sets its rotation,
// WASD moves its position. See controls.js for the full walkthrough.
const controls = new PlayerControls(camera, canvas);

// Overlay wiring: clicking ENTER requests pointer lock; pressing Esc
// releases it and the overlay comes back as a pause screen.
const overlay = document.getElementById('intro-overlay');
const reticle = document.getElementById('reticle');
document.getElementById('enter-btn').addEventListener('click', () => controls.lock());
controls.onLock = () => {
  overlay.classList.add('hidden');
  reticle.hidden = false;
};
controls.onUnlock = () => {
  overlay.classList.remove('hidden');
  reticle.hidden = true;
};

// Dev helper: lets us poke at the world from the browser console,
// e.g. __world.camera.position — handy for debugging.
window.__world = { scene, camera, controls, renderer };

// ---------- Resize handling ----------
// The camera's aspect ratio and the renderer's size must track the window,
// or the image stretches. Changing camera settings requires updateProjectionMatrix().
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- The render loop ----------
// The heartbeat: runs ~60x/second. Each frame: update the world, then draw it.
// The clock gives us delta time (seconds since last frame) so motion is
// framerate-independent — a 120Hz monitor shouldn't spin the cube twice as fast.
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  controls.update(dt); // move the player first...
  cube.rotation.y += dt * 0.8;
  cube.rotation.x += dt * 0.3;
  renderer.render(scene, camera); // ...then draw the frame from the new viewpoint
});
