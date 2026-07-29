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

    document.getElementById('reader-close').addEventListener('click', () => this.close());
    // Clicking the dark backdrop (but not the card itself) also closes.
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.close();
    });
  }

  get isOpen() {
    return !this.panel.hidden;
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

  openAbout() {
    this.#open(`
      <p class="reader-kicker">ABOUT</p>
      <h1>Michael Luck</h1>
      <p class="reader-tagline">Seeker of Knowledge · Full-Stack Developer · Level 34</p>
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
