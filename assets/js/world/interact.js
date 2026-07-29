// ============================================================
// STEP 4: RAYCASTING — "what am I aiming at?"
// ============================================================
// A raycaster shoots an invisible line from the camera through the
// center of the screen and reports which meshes it pierces, nearest
// first. Every FPS "press E to interact" prompt ever is this exact
// pattern:
//
//   each frame:  ray from camera → nearest hotspot within reach?
//                yes → remember it, glow it, show the prompt
//                no  → clear all that
//   on E/click:  run the remembered hotspot's action
// ============================================================

import * as THREE from 'three';
import { ACCENT } from './room.js';

export class Interactions {
  constructor(camera, hotspots, { reach = 4.5, onTargetChange, onActivate }) {
    this.camera = camera;
    this.hotspots = hotspots;
    this.reach = reach;              // how close you must be, in meters
    this.onTargetChange = onTargetChange; // UI callback: show/hide the prompt
    this.onActivate = onActivate;    // fires the action (open panel, follow link)

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = reach;      // ignore anything beyond arm's-ish length
    this.target = null;              // the hotspot currently under the reticle
  }

  // Called every frame from the render loop.
  update() {
    // (0,0) in "normalized device coordinates" = the exact screen center,
    // which is where the reticle sits. So: cast through the reticle.
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // false = don't recurse into children; our hotspots are flat meshes.
    const hits = this.raycaster.intersectObjects(this.hotspots, false);
    const next = hits.length > 0 ? hits[0].object : null;

    if (next !== this.target) {
      this.#setHighlight(this.target, false);
      this.#setHighlight(next, true);
      this.target = next;
      this.onTargetChange(next ? next.userData.action : null);
    }
  }

  // Fire the current target's action (bound to E / click in main.js).
  activate() {
    if (this.target) this.onActivate(this.target.userData.action);
  }

  // Hover feedback: push the frame's emissive color toward the accent.
  // "Emissive" = light the material emits by itself — it glows even
  // where no light reaches, perfect for a selection effect.
  #setHighlight(mesh, on) {
    const frame = mesh?.userData.highlightMesh;
    if (frame?.material?.emissive) {
      frame.material.emissive.setHex(on ? ACCENT : 0x000000);
      frame.material.emissiveIntensity = on ? 0.35 : 0;
    }
  }
}
