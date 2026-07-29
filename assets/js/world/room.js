// ============================================================
// STEP 4: THE ROOM
// ============================================================
// Everything here is PROCEDURAL — no downloaded models. Two big
// techniques to learn in this file:
//
//   CANVAS TEXTURES — we draw poster art with the 2D <canvas> API
//     (text, borders, colors) and use the result as a 3D texture.
//     This is how the room stays in sync with your blog: the
//     "art" is generated from post data at load time.
//
//   HOTSPOTS — any mesh we want to be interactive gets pushed into
//     a `hotspots` array with a `userData.action` describing what
//     it does. The raycaster in interact.js only tests those.
// ============================================================

import * as THREE from 'three';

// Room dimensions in meters. One place to change, everything follows.
export const ROOM = { width: 18, depth: 12, height: 4 };

// The accent color, exported for other modules (interact.js uses it for
// the hover glow). Three.js wants numbers (0x...), canvas wants CSS
// strings ('#...') — same color, two notations. The DOM overlays have
// their own copy as --accent in world.css.
export const ACCENT = 0xb388ff;
export const ACCENT_CSS = '#b388ff';

// The site's palette, as 3D colors.
const COLORS = {
  floor: 0x15151d,
  walls: 0x1b1b26,
  ceiling: 0x14141c,
  frame: 0x2d2d3a,
};

// ---------- Canvas texture helper ----------
// Draw with the familiar 2D canvas API, get back a Three.js texture.
// SRGBColorSpace matters: without it, colors render washed out because
// the renderer assumes the texture is in linear color space.
function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4; // keeps texture crisp when viewed at an angle
  return tex;
}

// Word-wrap for canvas text (the 2D API has no built-in wrapping).
// Standard technique: add words one at a time, measure, break when too wide.
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---------- Poster art ----------
function drawPosterTexture(post) {
  return canvasTexture(512, 680, (ctx, w, h) => {
    // card background
    ctx.fillStyle = '#191922';
    ctx.fillRect(0, 0, w, h);

    // double border, retro arcade style
    ctx.strokeStyle = ACCENT_CSS;
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    // category tag
    const cat = (post.categories && post.categories[1]) || (post.categories && post.categories[0]) || 'post';
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— ' + cat.toUpperCase() + ' —', w / 2, 92);

    // title, wrapped
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px monospace';
    const lines = wrapText(ctx, post.title, w - 110);
    const startY = 180;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * 54));

    // date
    ctx.fillStyle = ACCENT_CSS;
    ctx.font = '24px monospace';
    ctx.fillText(post.date, w / 2, startY + lines.length * 54 + 40);

    // call to action at the bottom
    ctx.fillStyle = ACCENT_CSS;
    ctx.font = 'bold 26px monospace';
    ctx.fillText('▶ READ', w / 2, h - 60);
  });
}

// Simple sign texture: glowing text on transparency (used unlit, so it
// reads like neon regardless of room lighting).
function drawSignTexture(text) {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = 'bold 110px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = ACCENT_CSS;
    ctx.shadowBlur = 40; // the shadow IS the neon glow
    ctx.fillStyle = ACCENT_CSS;
    ctx.fillText(text, w / 2, h / 2);
    ctx.fillText(text, w / 2, h / 2); // draw twice = stronger glow
  });
}

// ---------- Builders ----------

// A framed poster on a wall: dark frame box + textured front plane.
// `wall` decides orientation. Returns the interactive front plane.
function makePoster(scene, hotspots, { texture, position, rotationY = 0, width = 1.5, height = 2, action }) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotationY;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.07),
    new THREE.MeshStandardMaterial({ color: COLORS.frame, roughness: 0.6 })
  );
  group.add(frame);

  // MeshBasicMaterial ignores lighting — the poster is always readable,
  // like a backlit display. (Standard material would go murky in shadow.)
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  face.position.z = 0.041; // just in front of the frame, avoids z-fighting
  group.add(face);

  scene.add(group);

  // Register interactivity on the face; interact.js will find `action`
  // here and the highlight target (the frame we make glow on hover).
  face.userData.action = action;
  face.userData.highlightMesh = frame;
  hotspots.push(face);
  return group;
}

function makeSign(scene, text, position, rotationY = 0, scale = 1) {
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3 * scale, 0.75 * scale),
    new THREE.MeshBasicMaterial({ map: drawSignTexture(text), transparent: true })
  );
  sign.position.copy(position);
  sign.rotation.y = rotationY;
  scene.add(sign);
  return sign;
}

// ---------- The main build ----------
// Takes the posts from posts.json, returns the hotspot list for the raycaster.
export function buildRoom(scene, posts) {
  const hotspots = [];
  const { width: W, depth: D, height: H } = ROOM;

  // --- Shell: one box, drawn inside-out ---
  // side: BackSide flips the faces so we see the box's INTERIOR.
  // A box takes 6 materials (one per face) in the order +x,-x,+y,-y,+z,-z —
  // which lets the ceiling and walls differ without separate meshes.
  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.walls, roughness: 0.9, side: THREE.BackSide });
  const ceilMat = new THREE.MeshStandardMaterial({ color: COLORS.ceiling, roughness: 0.9, side: THREE.BackSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.8, side: THREE.BackSide });
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, D),
    [wallMat, wallMat, ceilMat, floorMat, wallMat, wallMat]
  );
  shell.position.y = H / 2;
  scene.add(shell);

  // Retro grid on the floor, sized to the room.
  const grid = new THREE.GridHelper(Math.max(W, D), Math.max(W, D), 0x3a3a4a, 0x232330);
  grid.position.y = 0.01; // a hair above the floor to avoid z-fighting
  scene.add(grid);

  // --- Lighting: warm and directional enough to feel like a place ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const hemi = new THREE.HemisphereLight(0x35354a, 0x121212, 0.6); // cool sky, dark ground
  scene.add(hemi);

  // One accent light per feature wall. Point lights are cheap at this count.
  const north = new THREE.PointLight(ACCENT, 30, 14);
  north.position.set(0, 3.2, -D / 2 + 2);
  scene.add(north);
  const east = new THREE.PointLight(0xcfc4ff, 15, 10); // softer lavender for the sides
  east.position.set(W / 2 - 2, 3, 0);
  scene.add(east);
  const west = new THREE.PointLight(0xcfc4ff, 15, 10);
  west.position.set(-W / 2 + 2, 3, 0);
  scene.add(west);

  // --- North wall: the blog gallery ---
  // SCALABILITY: walls don't scale, lists do. The wall features only the
  // newest posts; the ARCHIVE poster at the end of the row opens a
  // scrollable list of everything (see ui.openArchive). This works the
  // same at 3 posts or 300.
  makeSign(scene, 'BLOG', new THREE.Vector3(0, 3.3, -D / 2 + 0.05));
  const featured = posts.slice(0, 5);
  const slots = featured.length + 1; // +1 for the archive poster
  const slotX = (i) => (i - (slots - 1) / 2) * 2.3; // centered row, 2.3m apart

  featured.forEach((post, i) => {
    makePoster(scene, hotspots, {
      texture: drawPosterTexture(post),
      position: new THREE.Vector3(slotX(i), 1.9, -D / 2 + 0.06),
      action: { type: 'post', post, label: 'read “' + post.title + '”' },
    });
  });

  makePoster(scene, hotspots, {
    texture: canvasTexture(512, 680, (ctx, w, h) => {
      ctx.fillStyle = '#191922';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ACCENT_CSS;
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.textAlign = 'center';
      // stack of "cards" to suggest a pile of posts
      ctx.strokeStyle = '#3a3a4a';
      ctx.lineWidth = 3;
      ctx.strokeRect(150, 160, 212, 130);
      ctx.strokeRect(130, 200, 252, 130);
      ctx.strokeRect(110, 240, 292, 130);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px monospace';
      ctx.fillText('ARCHIVE', w / 2, 470);
      ctx.fillStyle = '#a0a0a0';
      ctx.font = '26px monospace';
      ctx.fillText(posts.length + ' posts and counting', w / 2, 520);
      ctx.fillStyle = ACCENT_CSS;
      ctx.font = 'bold 26px monospace';
      ctx.fillText('▶ BROWSE ALL', w / 2, h - 60);
    }),
    position: new THREE.Vector3(slotX(featured.length), 1.9, -D / 2 + 0.06),
    action: { type: 'archive', label: 'browse all ' + posts.length + ' posts' },
  });

  // --- East wall: Mike's corner ---
  // Nothing on the wall here — the avatar standing at his desk IS the
  // about section (walk up and talk to him).

  // --- West wall: the lounge ---
  // No poster — the radio on the coffee table is the contact hotspot.
  // The neon sign above the sofa points people at it.
  makeSign(scene, 'CONTACT', new THREE.Vector3(-W / 2 + 0.05, 3.3, 1.9), Math.PI / 2, 0.8);

  // --- South wall: the exit door back to the classic site ---
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x232330, roughness: 0.5 })
  );
  door.position.set(0, 1.3, D / 2 - 0.06);
  scene.add(door);
  makeSign(scene, 'EXIT', new THREE.Vector3(0, 3, D / 2 - 0.05), Math.PI, 0.7);
  door.userData.action = { type: 'link', href: '/classic/', label: 'leave to the classic site' };
  door.userData.highlightMesh = door;
  hotspots.push(door);

  return { hotspots };
}
