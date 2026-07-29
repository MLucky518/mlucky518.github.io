// ============================================================
// STEP 4: THE READER PANEL (DOM overlay)
// ============================================================
// Key architecture decision: we do NOT render text in 3D. Reading
// happens in a plain HTML overlay on top of the canvas — browsers
// are excellent at text (crisp fonts, scrolling, selection, zoom,
// screen readers) and 3D engines are terrible at it. The world is
// for atmosphere; the DOM is for reading. Best of both.
// ============================================================

export class WorldUI {
  constructor() {
    this.panel = document.getElementById('reader-panel');
    this.content = document.getElementById('reader-content');
    this.prompt = document.getElementById('interact-prompt');
    this.promptLabel = document.getElementById('prompt-label');
    this.onClose = () => { };

    // Dialogue state (see openDialogue below)
    this.dialogueBox = document.getElementById('dialogue-box');
    this.dialogueText = document.getElementById('dialogue-text');
    this.dialogueOptions = document.getElementById('dialogue-options');
    this.dialogue = null;         // the tree currently being walked
    this.currentOptions = [];     // live options, for number-key selection
    this.onDialogueStart = () => { };
    this.onDialogueEnd = () => { };

    // Number keys pick dialogue choices — pointer lock never releases,
    // which is why talking feels seamless instead of menu-like.
    window.addEventListener('keydown', (e) => {
      if (!this.isDialogueOpen) return;
      const n = Number(e.code.replace('Digit', ''));
      if (n >= 1 && n <= this.currentOptions.length) this.choose(this.currentOptions[n - 1]);
    });

    document.getElementById('reader-close').addEventListener('click', () => this.close());
    // Clicking the dark backdrop (but not the card itself) also closes.
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.close();
    });
  }

  get isOpen() {
    return !this.panel.hidden;
  }

  get isDialogueOpen() {
    return !this.dialogueBox.hidden;
  }

  // ---------- Dialogue (the avatar's speech) ----------
  // Walks the node graph in dialogue.js: show text, render choices,
  // follow `next` pointers until an option with `close` ends it.
  openDialogue(tree) {
    this.dialogue = tree;
    this.dialogueBox.hidden = false;
    this.setPrompt(null);
    this.onDialogueStart();
    this.#showNode(tree.start);
  }

  #showNode(id) {
    const node = this.dialogue.nodes[id];
    this.dialogueText.textContent = node.text;
    this.currentOptions = node.options;
    this.dialogueOptions.innerHTML = '';
    node.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-option';
      btn.innerHTML = `<span class="dialogue-key">${i + 1}</span><span>${opt.label}</span>`;
      btn.addEventListener('click', () => this.choose(opt));
      this.dialogueOptions.appendChild(btn);
    });
  }

  choose(opt) {
    if (opt.close) this.closeDialogue();
    else if (opt.next) this.#showNode(opt.next);
  }

  closeDialogue() {
    this.dialogueBox.hidden = true;
    this.dialogue = null;
    this.onDialogueEnd();
  }

  // The "press E" hint. Passing null hides it.
  setPrompt(action) {
    if (action) {
      this.promptLabel.textContent = action.label;
      this.prompt.hidden = false;
    } else {
      this.prompt.hidden = true;
    }
  }

  openPost(post) {
    // post.content is HTML that Jekyll already rendered from markdown —
    // same content as the real blog page, same origin, safe to inject.
    this.#open(`
      <p class="reader-kicker">${post.date}</p>
      <h1>${post.title}</h1>
      ${post.content}
      <p class="reader-footer"><a href="${post.url}">open as a normal page ↗</a></p>
    `);
  }

  // The scalable half of the blog gallery: the wall shows the newest
  // posts, this list shows ALL of them. A DOM list scrolls forever;
  // a wall of 3D posters doesn't.
  openArchive(posts) {
    const items = posts.map((p, i) => `
      <button class="archive-item" data-index="${i}">
        <span class="archive-title">${p.title}</span>
        <span class="archive-date">${p.date}</span>
      </button>
    `).join('');
    this.#open(`
      <p class="reader-kicker">ARCHIVE</p>
      <h1>All posts</h1>
      <div class="archive-list">${items}</div>
    `);
    // Wire each row AFTER injecting the HTML (innerHTML gives us inert
    // markup — listeners have to be attached to the live elements).
    this.content.querySelectorAll('.archive-item').forEach((btn) => {
      btn.addEventListener('click', () => this.openPost(posts[Number(btn.dataset.index)]));
    });
  }

  // The laptop on the desk. Projects come LIVE from the GitHub API —
  // nothing to maintain: push a repo, it shows up. (Unauthenticated API
  // calls are rate-limited to 60/hour per visitor IP — plenty for a
  // portfolio page; we also fail soft with a link to the profile.)
  async openProjects() {
    this.#open(`
      <p class="reader-kicker">PROJECTS</p>
      <h1>What I'm building</h1>
      <p class="reader-tagline">loading from GitHub…</p>
    `);
    try {
      const res = await fetch('https://api.github.com/users/mlucky518/repos?sort=updated&per_page=10');
      if (!res.ok) throw new Error('GitHub API ' + res.status);
      const repos = (await res.json()).filter((r) => !r.fork);
      const items = repos.map((r) => `
        <a class="archive-item" href="${r.html_url}" target="_blank" rel="noopener">
          <span class="archive-title">${r.name}${r.stargazers_count ? ' ★' + r.stargazers_count : ''}</span>
          <span class="archive-date">${r.language ?? ''}</span>
        </a>
      `).join('');
      this.content.innerHTML = `
        <p class="reader-kicker">PROJECTS</p>
        <h1>What I'm building</h1>
        <div class="archive-list">${items}</div>
        <p class="reader-footer"><a href="https://github.com/mlucky518" target="_blank" rel="noopener">everything on GitHub ↗</a></p>
      `;
    } catch (err) {
      this.content.innerHTML = `
        <p class="reader-kicker">PROJECTS</p>
        <h1>What I'm building</h1>
        <p>Couldn't reach GitHub right now — see
        <a href="https://github.com/mlucky518" target="_blank" rel="noopener">github.com/mlucky518 ↗</a></p>
      `;
    }
  }

  openAbout() {
    this.#open(`
      <p class="reader-kicker">ABOUT</p>
      <h1>Michael Luck</h1>
      <p class="reader-tagline">Seeker of Knowledge · Full-Stack Developer · Level 35</p>
      <p>I've had an on and off relationship with hope throughout my life. Growing up wasn't
      easy — poverty, hardship, and a lot of reasons to give up. But I was always a smart kid,
      and that gave me hope for a future that was different.</p>
      <p>Then I discovered programming. Sleepless nights, frustration, self doubt — but I kept
      going, and finished a coding bootcamp while recovering from surgery. That hard work got
      me my start in tech. Still going. Still learning. Still seeking knowledge every day.</p>
      <p><strong>What I do:</strong> full-stack web, Python &amp; Ruby, React &amp; JavaScript,
      AWS, AI/ML, MySQL &amp; PostgreSQL.</p>
      <p class="reader-footer"><a href="/about/">the full story ↗</a></p>
    `);
  }

  openContact() {
    this.#open(`
      <p class="reader-kicker">CONTACT</p>
      <h1>Say hello</h1>
      <p>Questions, collaborations, or just want to talk tech? I'd love to hear from you.</p>
      <p>
        <a href="/contact/">contact page ↗</a><br>
        <a href="https://github.com/mlucky518" target="_blank" rel="noopener">github.com/mlucky518 ↗</a><br>
        <a href="https://twitter.com/mlucky518" target="_blank" rel="noopener">@mlucky518 ↗</a>
      </p>
    `);
  }

  close() {
    this.panel.hidden = true;
    this.onClose(); // main.js uses this to re-grab pointer lock
  }

  #open(html) {
    this.content.innerHTML = html;
    this.content.scrollTop = 0;
    this.panel.hidden = false;
    this.setPrompt(null);
  }
}
