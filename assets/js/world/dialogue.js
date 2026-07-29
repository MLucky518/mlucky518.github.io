// ============================================================
// STEP 6: THE DIALOGUE TREE
// ============================================================
// Classic RPG dialogue: a graph of nodes, each with NPC text and
// player choices pointing at other nodes. Pure data — no logic
// here. The UI walks the graph (see ui.js).
//
// Why scripted instead of an LLM? GitHub Pages is static hosting —
// there's no server to hide an API key in. A Cloudflare Worker
// proxy can add real AI chat later; this tree costs nothing and
// never breaks. (And honestly, NPCs with canned lines have charm.)
// ============================================================

export const DIALOGUE = {
  start: 'hello',
  nodes: {
    hello: {
      text: "Hey! I'm Mike — well, the 3D version of me. Welcome to my corner of the internet. What do you wanna know?",
      options: [
        { label: "What's your story?", next: 'story1' },
        { label: 'What do you build?', next: 'skills' },
        { label: 'How did you make this place?', next: 'world' },
        { label: 'Later!', close: true },
      ],
    },

    story1: {
      text: "The honest version? Growing up wasn't easy. Poverty, hardship, plenty of reasons to give up. But I was always a smart kid, and that gave me hope for a future that looked different.",
      options: [
        { label: 'Then what?', next: 'story2' },
        { label: 'Back up', next: 'hello' },
      ],
    },

    story2: {
      text: "Then I found programming. Sleepless nights, self-doubt, all of it — I finished a coding bootcamp while recovering from surgery. That grind got me my start in tech, and I haven't stopped learning since. The more I learn, the more I realize how much there is to discover.",
      options: [
        { label: 'What do you build?', next: 'skills' },
        { label: 'Respect. Back to the top', next: 'hello' },
      ],
    },

    skills: {
      text: "Full-stack web, mostly — Python and Ruby, React and JavaScript, AWS, databases. Lately a lot of AI and machine learning. The laptop on my desk has my actual GitHub projects if you want the receipts.",
      options: [
        { label: 'How did you make this place?', next: 'world' },
        { label: "What's your story?", next: 'story1' },
        { label: 'Back', next: 'hello' },
      ],
    },

    world: {
      text: "This room? Jekyll builds the blog into JSON, Three.js draws the world around it — no game engine, no bundler, just the browser. The posters on the wall are my real posts. The radio on the coffee table is how you reach me.",
      options: [
        { label: 'Nice. Back', next: 'hello' },
        { label: 'Later!', close: true },
      ],
    },
  },
};
