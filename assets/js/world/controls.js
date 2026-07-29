// ============================================================
// STEP 3: FIRST-PERSON CONTROLS
// ============================================================
// Two independent systems that combine into "walking around":
//
//   LOOKING — Pointer Lock API. Once locked, the browser hides the
//     cursor and streams raw mouse deltas (e.movementX/Y) forever;
//     you can turn 720° without hitting a screen edge.
//
//   MOVING — we track which keys are held in a Set, turn that into
//     a direction each frame, rotate the direction to match where
//     the player is facing, and integrate over delta time.
// ============================================================

import * as THREE from 'three';

export class PlayerControls {
  constructor(camera, domElement, opts = {}) {
    this.camera = camera;
    this.domElement = domElement;

    // --- Look state ---
    // Yaw = turning left/right (rotation around the vertical Y axis).
    // Pitch = looking up/down (rotation around the sideways X axis).
    // We track them as two plain numbers instead of touching the camera's
    // quaternion directly — much easier to reason about and to clamp.
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = 0.0022; // radians of turn per pixel of mouse movement

    // Rotation order matters! 'YXZ' means: turn the head (Y), THEN tilt it (X).
    // The default 'XYZ' order makes the horizon roll sideways when you look
    // up-and-turn — the classic "drunk camera" bug.
    this.camera.rotation.order = 'YXZ';

    // --- Movement state ---
    this.speed = opts.speed ?? 4;        // walking speed, meters/second
    this.sprintMultiplier = 1.8;         // hold Shift
    this.velocity = new THREE.Vector3(); // current velocity, smoothed
    this.keys = new Set();               // which keys are held right now

    // Keep the player inside this rectangle (a real room comes in Step 4;
    // for now it just stops you walking off into the void).
    this.bounds = opts.bounds ?? { minX: -14, maxX: 14, minZ: -14, maxZ: 14 };

    // Only respond to movement keys while pointer lock is held. Without this
    // gate you could WASD around while the pause overlay is up (the key
    // listeners are on `window`, so they fire regardless). Mobile controls
    // will flip this off later — there's no pointer lock on touch screens.
    this.requiresLock = opts.requiresLock ?? true;

    // Hooks the page can use to show/hide the "click to enter" overlay.
    this.onLock = () => { };
    this.onUnlock = () => { };

    // --- Wire up events ---
    // NOTE: we use e.code ('KeyW') not e.key ('w'). e.code is the PHYSICAL
    // key position, so WASD still works on AZERTY/Dvorak keyboards.
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    document.addEventListener('mousemove', (e) => this.#onMouseMove(e));

    // The browser fires this both when lock is granted AND when the user
    // presses Esc to escape — one event, two meanings.
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.domElement) {
        this.onLock();
      } else {
        this.keys.clear(); // don't keep walking while the pause menu is up
        this.onUnlock();
      }
    });
  }

  get isLocked() {
    return document.pointerLockElement === this.domElement;
  }

  // Must be called from a real user gesture (click) — browsers refuse otherwise.
  // Can also REJECT even with a gesture (e.g. Chrome enforces a ~1.3s cooldown
  // after each unlock). If it does, run onUnlock so the pause overlay appears
  // instead of leaving the player in a dead un-locked state.
  lock() {
    const result = this.domElement.requestPointerLock();
    if (result?.catch) result.catch(() => this.onUnlock());
  }

  #onMouseMove(e) {
    if (!this.isLocked) return;

    // movementX/Y are deltas since the last event — that's the pointer-lock magic.
    this.yaw -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;

    // Clamp pitch to just under straight up/down. At exactly ±90° the "which
    // way is forward" question breaks down (gimbal lock territory).
    const limit = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));

    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  // Called every frame from the render loop. dt = seconds since last frame.
  update(dt) {
    if (this.requiresLock && !this.isLocked) {
      this.velocity.set(0, 0, 0); // hard stop while paused
      return;
    }

    // 1) Build the input direction in "local space" (relative to the player):
    //    forward = -Z by Three.js convention (the camera looks down its own -Z).
    const input = new THREE.Vector3(
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0),
      0,
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) -
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
    );

    // Normalize so diagonal movement isn't faster (W+D would be √2 speed).
    if (input.lengthSq() > 0) input.normalize();

    // 2) Rotate the input by the yaw so "forward" means "where I'm facing".
    //    (Only yaw — pitch shouldn't make you fly when you look up.)
    input.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    // 3) Smooth acceleration: ease current velocity toward the target velocity.
    //    This tiny bit of inertia is what makes movement feel physical
    //    instead of like a spreadsheet cursor.
    const targetSpeed = this.speed * (this.keys.has('ShiftLeft') ? this.sprintMultiplier : 1);
    const target = input.multiplyScalar(targetSpeed);
    // 1 - e^(-k·dt) is a frame-rate-independent lerp factor (a plain
    // `lerp(a, b, 0.1)` would ease faster on faster monitors).
    const ease = 1 - Math.exp(-10 * dt);
    this.velocity.lerp(target, ease);

    // 4) Integrate: position += velocity × time.
    this.camera.position.x += this.velocity.x * dt;
    this.camera.position.z += this.velocity.z * dt;

    // 5) Collision, v1: clamp to the room bounds.
    this.camera.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.camera.position.z));
  }
}
