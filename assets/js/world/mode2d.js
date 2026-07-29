// ============================================================
// STEP 7: TOP-DOWN 2D MODE — same room, RPG overworld style
// ============================================================
// The whole 3D world re-rendered as a 2D game: you play a cat
// exploring Mike's room. Three ideas to learn here:
//
//   ONE WORLD, TWO VIEWS — this module draws from the SAME data
//     as the 3D room (same coordinates, same furniture footprints,
//     same actions). The reader panel, dialogue, projects — all
//     the DOM UI is reused untouched. Only the rendering differs.
//
//   CANVAS 2D GAME LOOP — no Three.js here; just the 2D canvas
//     API: clear, draw world, draw sprites, repeat. This is how
//     every 2D game works under the hood.
//
//   SPRITE SHEETS — Mike is drawn from a sheet of frames (4 walk
//     frames x 5 directions). Animation = picking which cell to
//     draw each tick. The cat is drawn procedurally instead: a
//     rotated vector kitty, no asset required.
// ============================================================

import { ROOM, ACCENT_CSS } from './room.js';

const MIKE_SPRITE_URL = '/assets/images/sprites/mike-topdown.png';
const MIKE_SPOT = { x: 7.6, z: 1.7 };  // must match avatar.js SPOT

// Sprite sheet layout: 4 columns (walk cycle) x 5 rows (directions).
const SHEET = { cols: 4, rows: 5, row: { down: 0, left: 1, right: 2, upleft: 3, up: 4 } };

// Furniture footprints in world meters — the measured boxes from the 3D
// tidy pass. Each doubles as a collider and a drawing rect.
const FURNITURE = [
  { x: [8.2, 9.0], z: [-0.8, 0.8], color: '#c9a178', label: 'desk' },
  { x: [7.2, 7.9], z: [0.0, 0.7], color: '#c76f6f', label: 'chair' },
  { x: [6.1, 7.0], z: [-5.95, -5.45], color: '#c9a178', label: 'bookcase' },
  { x: [-9.0, -8.1], z: [0.4, 2.6], color: '#c76f6f', label: 'sofa' },
  { x: [-7.3, -6.4], z: [1.0, 2.4], color: '#c9a178', label: 'table' },
  { x: [-8.85, -8.45], z: [-0.25, 0.15], color: '#8f86ad', label: 'lamp' },
];

// ---------- Background keying ----------
// The sprite sheet was exported with an opaque background. Rather than
// require a clean export, we remove it ourselves: flood-fill from the
// image borders, erasing any pixel whose color is close to the pixel it
// was reached FROM. Neighbor-relative comparison lets the fill follow a
// gradient background, while the character's dark outline stops it dead.
// (The white shirt is enclosed by outline, so the fill never reaches it.)
function keyOutBackground(img, tolerance = 32) {
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, cv.width, cv.height);
  const px = image.data;
  const W = cv.width, H = cv.height;

  // Already transparent (a clean export)? Nothing to do.
  if (px[3] === 0 && px[(W * H - 1) * 4 + 3] === 0) return img;

  const visited = new Uint8Array(W * H);
  const stack = [];
  const seed = (x, y) => { const i = y * W + x; if (!visited[i]) { visited[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }

  while (stack.length) {
    const i = stack.pop();
    const o = i * 4;
    const r = px[o], g = px[o + 1], b = px[o + 2];
    px[o + 3] = 0; // erase
    const x = i % W, y = (i / W) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (visited[ni]) continue;
      const no = ni * 4;
      const diff = Math.abs(px[no] - r) + Math.abs(px[no + 1] - g) + Math.abs(px[no + 2] - b);
      if (diff < tolerance * 3) { visited[ni] = 1; stack.push(ni); }
    }
  }

  ctx.putImageData(image, 0, 0);
  return cv; // a canvas works anywhere an image does (drawImage accepts both)
}

export class WorldMap2D {
  // `onAction` is the SAME action dispatcher the 3D raycaster uses —
  // that's the "one world" part. `ui` gives us the prompt + panels.
  constructor({ canvas, posts, ui, onAction }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.onAction = onAction;
    this.active = false;

    // The player cat.
    this.cat = { x: 0, z: 3.5, angle: Math.PI, speed: 4.2, moving: false, phase: 0 };
    this.keys = new Set();
    this.tapTarget = null;    // where a touch told the cat to walk
    this.pendingAction = null;

    // Mike's sheet (loads lazily; placeholder until the file exists).
    // On load we key out the export's opaque background — see above.
    this.mikeImg = new Image();
    this.mikeReady = false;
    this.mikeImg.onload = () => {
      this.mikeSheet = keyOutBackground(this.mikeImg);
      this.mikeReady = true;
    };
    this.mikeImg.src = MIKE_SPRITE_URL;

    // Interactive spots: same action objects the 3D hotspots use.
    this.hotspots = [];
    const featured = posts.slice(0, 5);
    const slots = featured.length + 1;
    featured.forEach((post, i) => {
      this.hotspots.push({
        x: (i - (slots - 1) / 2) * 2.3, z: -5.4, r: 1.1,
        action: { type: 'post', post, label: 'read “' + post.title + '”' },
      });
    });
    this.hotspots.push(
      { x: (featured.length - (slots - 1) / 2) * 2.3, z: -5.4, r: 1.1, action: { type: 'archive', label: 'browse all ' + posts.length + ' posts' } },
      { x: 8.5, z: -0.1, r: 1.4, action: { type: 'projects', label: 'open my projects' } },
      { x: -6.8, z: 1.7, r: 1.4, action: { type: 'contact', label: 'get in touch' } },
      { x: MIKE_SPOT.x, z: MIKE_SPOT.z, r: 1.5, action: { type: 'talk', label: 'talk to Mike' } },
      { x: 0, z: 5.6, r: 1.3, action: { type: 'link', href: '/classic/', label: 'leave to the classic site' } },
    );

    window.addEventListener('keydown', (e) => { if (this.active) this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // Touch/click-to-move: walk to the tap; if the tap was on a hotspot,
    // activate it on arrival. This IS the mobile control scheme.
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      const world = this.#screenToWorld(e.clientX, e.clientY);
      this.tapTarget = world;
      this.pendingAction = this.hotspots.find(
        (h) => (h.x - world.x) ** 2 + (h.z - world.z) ** 2 < (h.r * 1.2) ** 2
      ) ?? null;
    });

    window.addEventListener('resize', () => this.#resize());
    this.#resize();
  }

  setActive(on) {
    this.active = on;
    this.canvas.hidden = !on;
    if (!on) { this.keys.clear(); this.ui.setPrompt(null); }
  }

  // The E key (wired in main.js) fires whatever the cat is standing near.
  activate() {
    if (this.near) this.onAction(this.near.action);
  }

  // ---------- Coordinate mapping ----------
  // World meters → screen pixels. The whole room fits on screen, centered,
  // with a margin. One scale factor `s` converts distances.
  #resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.s = Math.min(
      this.canvas.width / (ROOM.width + 3),
      this.canvas.height / (ROOM.depth + 3)
    );
    this.cx = this.canvas.width / 2;
    this.cy = this.canvas.height / 2;
  }

  #toScreen(x, z) { return [this.cx + x * this.s, this.cy + z * this.s]; }
  #screenToWorld(px, py) { return { x: (px - this.cx) / this.s, z: (py - this.cy) / this.s }; }

  // ---------- Per-frame: update then draw ----------
  update(dt) {
    if (!this.active) return;
    const c = this.cat;

    // Freeze while reading/talking, same rule as the 3D mode.
    const uiBusy = this.ui.isOpen || this.ui.isDialogueOpen;

    // Input: keys beat taps.
    let vx = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
             (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let vz = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) -
             (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    if (vx || vz) this.tapTarget = null;
    // Tapped a hotspot? Fire as soon as we're within its radius — some
    // hotspots (the laptop, the radio) sit ON furniture, so walking to
    // their exact center is physically impossible.
    if (this.tapTarget && this.pendingAction) {
      const h = this.pendingAction;
      if ((h.x - c.x) ** 2 + (h.z - c.z) ** 2 < (h.r * 0.9) ** 2) {
        this.tapTarget = null;
        this.pendingAction = null;
        this.onAction(h.action);
      }
    }
    if (this.tapTarget) {
      const dx = this.tapTarget.x - c.x, dz = this.tapTarget.z - c.z;
      const dist = Math.hypot(dx, dz);
      // Arrive when close OR when this frame's step would overshoot —
      // otherwise a fast cat hops back and forth over the target forever.
      if (dist <= Math.max(0.15, c.speed * dt)) {
        c.x = this.tapTarget.x; c.z = this.tapTarget.z; // snap (collision below pushes out if needed)
        this.tapTarget = null;
        if (this.pendingAction) { this.onAction(this.pendingAction.action); this.pendingAction = null; }
      } else { vx = dx / dist; vz = dz / dist; }
    }

    c.moving = !uiBusy && (vx !== 0 || vz !== 0);
    if (c.moving) {
      const len = Math.hypot(vx, vz);
      c.angle = Math.atan2(vx, -vz); // 0 = facing up (north), for the rotated cat
      c.x += (vx / len) * c.speed * dt;
      c.z += (vz / len) * c.speed * dt;
      c.phase += dt * 10; // drives the paw shuffle + tail sway

      // Collide with walls...
      const m = 0.45;
      c.x = Math.max(-ROOM.width / 2 + m, Math.min(ROOM.width / 2 - m, c.x));
      c.z = Math.max(-ROOM.depth / 2 + m, Math.min(ROOM.depth / 2 - m, c.z));
      // ...and furniture (same push-out resolve as the 3D controls).
      for (const f of FURNITURE) {
        if (c.x > f.x[0] - m && c.x < f.x[1] + m && c.z > f.z[0] - m && c.z < f.z[1] + m) {
          const push = Math.min(c.x - (f.x[0] - m), (f.x[1] + m) - c.x, c.z - (f.z[0] - m), (f.z[1] + m) - c.z);
          if (push === c.x - (f.x[0] - m)) c.x = f.x[0] - m;
          else if (push === (f.x[1] + m) - c.x) c.x = f.x[1] + m;
          else if (push === c.z - (f.z[0] - m)) c.z = f.z[0] - m;
          else c.z = f.z[1] + m;
        }
      }
    }

    // Proximity prompt — reuses the exact same DOM chip as 3D mode.
    const near = this.hotspots.find((h) => (h.x - c.x) ** 2 + (h.z - c.z) ** 2 < h.r * h.r) ?? null;
    if (near !== this.near) {
      this.near = near;
      if (!uiBusy) this.ui.setPrompt(near ? near.action : null);
    }

    this.#draw();
  }

  // ---------- Drawing ----------
  #draw() {
    const { ctx } = this;
    const s = this.s;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Floor
    const [fx, fy] = this.#toScreen(-ROOM.width / 2, -ROOM.depth / 2);
    const fw = ROOM.width * s, fh = ROOM.depth * s;
    ctx.fillStyle = '#15151d';
    ctx.fillRect(fx, fy, fw, fh);

    // Grid (1m cells) — the synthwave floor, from above
    ctx.strokeStyle = '#232330';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -ROOM.width / 2; gx <= ROOM.width / 2; gx += 1) {
      const [px] = this.#toScreen(gx, 0);
      ctx.moveTo(px, fy); ctx.lineTo(px, fy + fh);
    }
    for (let gz = -ROOM.depth / 2; gz <= ROOM.depth / 2; gz += 1) {
      const [, py] = this.#toScreen(0, gz);
      ctx.moveTo(fx, py); ctx.lineTo(fx + fw, py);
    }
    ctx.stroke();

    // Walls
    ctx.strokeStyle = '#2d2d3a';
    ctx.lineWidth = Math.max(4, s * 0.3);
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.strokeStyle = ACCENT_CSS + '44'; // faint neon inner edge
    ctx.lineWidth = 2;
    ctx.strokeRect(fx + 2, fy + 2, fw - 4, fh - 4);

    // Furniture
    for (const f of FURNITURE) {
      const [px, py] = this.#toScreen(f.x[0], f.z[0]);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.roundRect(px, py, (f.x[1] - f.x[0]) * s, (f.z[1] - f.z[0]) * s, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Hotspot markers: soft pulsing accent rings
    const t = performance.now() / 1000;
    for (const h of this.hotspots) {
      const [px, py] = this.#toScreen(h.x, h.z);
      ctx.strokeStyle = ACCENT_CSS + (h === this.near ? 'ff' : '55');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, (0.34 + Math.sin(t * 2.5) * 0.05) * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Neon labels
    ctx.textAlign = 'center';
    ctx.fillStyle = ACCENT_CSS;
    ctx.font = `${Math.max(9, s * 0.5)}px 'Press Start 2P', monospace`;
    ctx.shadowColor = ACCENT_CSS; ctx.shadowBlur = 8;
    ctx.fillText('BLOG', ...this.#toScreen(0, -ROOM.depth / 2 - 0.55));
    ctx.fillText('EXIT', ...this.#toScreen(0, ROOM.depth / 2 + 0.9));
    ctx.save();
    ctx.translate(...this.#toScreen(-ROOM.width / 2 - 0.55, 1.5)); ctx.rotate(-Math.PI / 2);
    ctx.fillText('CONTACT', 0, 0); ctx.restore();
    ctx.save();
    ctx.translate(...this.#toScreen(ROOM.width / 2 + 0.55, 0.5)); ctx.rotate(Math.PI / 2);
    ctx.fillText('MIKE', 0, 0); ctx.restore();
    ctx.shadowBlur = 0;

    this.#drawMike();
    this.#drawCat();
  }

  // Mike from the sprite sheet: pick the row that faces the cat.
  #drawMike() {
    const [px, py] = this.#toScreen(MIKE_SPOT.x, MIKE_SPOT.z);
    const size = this.s * 1.5;
    this.#shadow(px, py + size * 0.32, size * 0.34);
    if (this.mikeReady) {
      const dx = this.cat.x - MIKE_SPOT.x, dz = this.cat.z - MIKE_SPOT.z;
      let row = SHEET.row.down;
      if (Math.abs(dx) > Math.abs(dz)) row = dx < 0 ? SHEET.row.left : SHEET.row.right;
      else if (dz < 0) row = SHEET.row.up;
      const fw = this.mikeSheet.width / SHEET.cols;
      const fh = this.mikeSheet.height / SHEET.rows;
      const h = size * (fh / fw);
      this.ctx.drawImage(this.mikeSheet, 0, row * fh, fw, fh, px - size / 2, py - h * 0.62, size, h);
    } else {
      // Placeholder until mike-topdown.png exists
      this.ctx.fillStyle = ACCENT_CSS;
      this.ctx.beginPath();
      this.ctx.arc(px, py, this.s * 0.42, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#121212';
      this.ctx.font = `bold ${this.s * 0.5}px monospace`;
      this.ctx.fillText('M', px, py + this.s * 0.18);
    }
  }

  // The procedural cat: drawn facing north, then rotated to its heading.
  // Top-down characters are great for this trick — no sheet needed.
  #drawCat() {
    const { ctx } = this;
    const c = this.cat;
    const [px, py] = this.#toScreen(c.x, c.z);
    const u = this.s * 0.11; // one "cat unit"
    this.#shadow(px, py + u, u * 4.4);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(c.angle);
    const sway = c.moving ? Math.sin(c.phase) : Math.sin(performance.now() / 400) * 0.4;

    // tail (behind = +y after rotation)
    ctx.strokeStyle = '#c2691e';
    ctx.lineWidth = u * 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, u * 3);
    ctx.quadraticCurveTo(sway * u * 2.4, u * 5.4, sway * u * 3.6, u * 6.6);
    ctx.stroke();

    // paws shuffle when walking
    if (c.moving) {
      const step = Math.sin(c.phase) * u * 1.1;
      ctx.fillStyle = '#a8551a';
      [[-1.9, -2.2 + step], [1.9, -2.2 - step], [-1.9, 2.0 - step], [1.9, 2.0 + step]]
        .forEach(([ox, oy]) => {
          ctx.beginPath();
          ctx.arc(ox * u, oy * u, u * 0.85, 0, Math.PI * 2);
          ctx.fill();
        });
    }

    // body
    ctx.fillStyle = '#e8944f';
    ctx.beginPath();
    ctx.ellipse(0, u * 0.6, u * 2.6, u * 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // head + ears (front = -y)
    ctx.beginPath();
    ctx.arc(0, -u * 3.1, u * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-u * 2.0, -u * 4.0); ctx.lineTo(-u * 1.4, -u * 5.9); ctx.lineTo(-u * 0.5, -u * 4.7);
    ctx.moveTo(u * 2.0, -u * 4.0); ctx.lineTo(u * 1.4, -u * 5.9); ctx.lineTo(u * 0.5, -u * 4.7);
    ctx.fill();
    // inner ears
    ctx.fillStyle = ACCENT_CSS;
    ctx.beginPath();
    ctx.moveTo(-u * 1.7, -u * 4.35); ctx.lineTo(-u * 1.4, -u * 5.3); ctx.lineTo(-u * 0.9, -u * 4.6);
    ctx.moveTo(u * 1.7, -u * 4.35); ctx.lineTo(u * 1.4, -u * 5.3); ctx.lineTo(u * 0.9, -u * 4.6);
    ctx.fill();
    // stripe
    ctx.strokeStyle = '#c2691e';
    ctx.lineWidth = u * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -u * 1.6); ctx.lineTo(0, u * 2.6);
    ctx.stroke();

    ctx.restore();
  }

  #shadow(px, py, r) {
    this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.ctx.beginPath();
    this.ctx.ellipse(px, py, r, r * 0.45, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
