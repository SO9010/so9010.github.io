// Conway's Game of Life background animation
let canvas = document.getElementById('life-bg');

if (!canvas) {
  console.error('Canvas not found! Waiting for DOM...');
  document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('life-bg');
    initGameOfLife();
  });
} else {
  initGameOfLife();
}

function initGameOfLife() {
  const ctx = canvas.getContext('2d');
let width, height, cols, rows, cellSize = 13;
let grid, next;
let lastChange = 0;
let stillFrames = 0;
const MAX_STILL = 60; // ~3 seconds at 20fps before adding chaos
let prevHashes = []; // Track multiple hashes to detect cycles
let mouse = { x: -1, y: -1, down: false };

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mouseleave', () => {
  mouse.x = -1;
  mouse.y = -1;
});
canvas.addEventListener('mousedown', () => { 
  mouse.down = true; 
});
canvas.addEventListener('mouseup', () => { 
  mouse.down = false; 
});

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  cols = Math.floor(width / cellSize);
  rows = Math.floor(height / cellSize);
  grid = Array.from({length: rows}, () => Array(cols).fill(0));
  next = Array.from({length: rows}, () => Array(cols).fill(0));
  // Randomize initial state
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      grid[y][x] = Math.random() > 0.7 ? 1 : 0;
}

function step() {
  let changed = false;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          let ny = (y + dy + rows) % rows;
          let nx = (x + dx + cols) % cols;
          count += grid[ny][nx];
        }
      }
      let newVal = (grid[y][x] && (count === 2 || count === 3)) || (!grid[y][x] && count === 3) ? 1 : 0;
      if (next[y][x] !== newVal) changed = true;
      next[y][x] = newVal;
    }
  }
  [grid, next] = [next, grid];
  return changed;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) {
        ctx.fillStyle = '#665c54'; // Gruvbox dark fg
        // Draw circle instead of square
        const radius = cellSize / 2.5;
        ctx.beginPath();
        ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function hashGrid() {
  // Simple hash: join all rows
  return grid.map(row => row.join('')).join('');
}

function animate() {
  let changed = step();
  
  // Add random noise where mouse is hovering
  if (mouse.x >= 0 && mouse.y >= 0) {
    let px = Math.floor(mouse.x / cellSize);
    let py = Math.floor(mouse.y / cellSize);
    const radius = 4; // Radius in cells
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Only add cells within a circular area
        if (dx * dx + dy * dy <= radius * radius) {
          if (Math.random() < 0.3) { // 30% chance to add cell
            let ny = (py + dy + rows) % rows;
            let nx = (px + dx + cols) % cols;
            grid[ny][nx] = 1; // Set cell to alive
          }
        }
      }
    }
  }
  
  draw();
  let hash = hashGrid();
  
  // Track last few hashes to detect stuck patterns
  prevHashes.push(hash);
  if (prevHashes.length > 4) prevHashes.shift();
  
  // Check if stuck (same pattern or oscillating between 2 patterns)
  let isStuck = false;
  if (prevHashes.length > 2) {
    // If any of the last 4 states match current, we're in a loop/stuck
    const allButLast = prevHashes.slice(0, -1);
    if (allButLast.includes(hash)) {
      isStuck = true;
      stillFrames++;
    } else {
      stillFrames = 0;
    }
  } else {
    stillFrames = 0;
  }
  
  // If stuck too long, randomize to break the pattern
  if (stillFrames > MAX_STILL || isStuck) {
    // Add random noise to break stable patterns
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (Math.random() < 0.08) { // 8% chance to flip
          grid[y][x] = grid[y][x] ? 0 : 1;
        }
      }
    }
    stillFrames = 0;
    prevHashes = [];
  }
  
  setTimeout(animate, 50); // ~20fps (slower)
}

window.addEventListener('resize', resize);
resize();
animate();
}

// ──── Blog System ────────────────────────────────────────────────────
class BlogSystem {
  constructor() {
    this.blogs = []; // populated from blogs.json, which is generated from the markdown files
    this.updatingHash = false;
    this.init();
  }

  async init() {
    await this.loadBlogs();
    this.setupNavigation();
    this.restoreStateFromUrl();
    window.addEventListener('hashchange', () => this.restoreStateFromUrl());
  }

  // Load the blog list from blogs.json, which the updater generates from the
  // markdown files in the repo. This is the only source of blog content; if it
  // can't be loaded the list stays empty (displayBlogList shows a message).
  async loadBlogs() {
    try {
      const res = await fetch('./blogs.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) &&
          data.every(b => b && typeof b.title === 'string' && typeof b.content === 'string')) {
        this.blogs = data;
      }
    } catch (e) {
      // Leave this.blogs empty; the page renders the "no blogs" message.
    }
  }

  // Stable per-post identity for deep links. Uses the generated slug when
  // present, otherwise derives one from the filename (matches generate-blogs.js).
  slugFor(blog) {
    if (blog.slug) return blog.slug;
    return (blog.filename || blog.title || '')
      .replace(/\.md$/i, '')
      .replace(/^#\d+[-\s]*/, '')
      .replace(/^#/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  restoreStateFromUrl() {
    if (this.updatingHash) return; // Prevent conflicts
    
    const hash = window.location.hash.slice(1); // Remove #
    
    if (hash.startsWith('blog-')) {
      const rest = hash.slice('blog-'.length);
      this.showSection('blogs');
      setTimeout(() => {
        let card = null;
        const asIndex = parseInt(rest, 10);
        if (String(asIndex) === rest && asIndex >= 0 && asIndex < this.blogs.length) {
          card = document.querySelector(`[data-index="${asIndex}"]`); // legacy index link
        } else {
          card = document.querySelector(`[data-slug="${CSS.escape(rest)}"]`); // stable slug link
        }
        if (card && !card.classList.contains('expanded')) {
          this.toggleBlog(card, card.dataset.index);
        }
      }, 100);
    } else if (hash === 'blogs') {
      this.showSection('blogs');
    } else {
      this.showSection('about');
    }
  }

  setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        this.showSection(section);
      });
    });
  }

  showSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Show selected section
    document.getElementById(section).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update URL
    this.updatingHash = true;
    if (section === 'blogs') {
      window.location.hash = '#blogs';
    } else {
      window.location.hash = '';
    }
    setTimeout(() => { this.updatingHash = false; }, 100);

    if (section === 'blogs') {
      this.displayBlogList();
    }
  }

  displayBlogList() {
    const blogList = document.getElementById('blog-list');
    
    if (this.blogs.length === 0) {
      blogList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted);">No blogs yet. Add markdown files to the blogs/ folder.</p>';
      return;
    }

    blogList.innerHTML = this.blogs.map((blog, index) => `
      <div class="blog-card" data-index="${index}" data-slug="${this.slugFor(blog)}">
        <div class="blog-card-header">
          <div>
            <h3>${blog.title}</h3>
          </div>
          <span class="expand-icon">▼</span>
        </div>
        <div class="blog-card-content">${this.markdownToHtml(blog.content)}</div>
      </div>
    `).join('');

    blogList.querySelectorAll('.blog-card').forEach(card => {
      // Whole card is the click target (incl. padding) so collapsed cards are
      // easy to hit. When expanded, ignore clicks inside the content and on
      // links so reading/selecting/link-following doesn't collapse the card.
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        if (card.classList.contains('expanded') && e.target.closest('.blog-card-content')) return;
        this.toggleBlog(card, card.dataset.index);
      });
    });
  }

  toggleBlog(card, index) {
    const isExpanded = card.classList.contains('expanded');
    
    // Collapse all other cards
    document.querySelectorAll('.blog-card.expanded').forEach(c => {
      if (c !== card) {
        c.classList.remove('expanded');
      }
    });

    if (isExpanded) {
      card.classList.remove('expanded');
      this.updatingHash = true;
      window.location.hash = '#blogs';
      setTimeout(() => { this.updatingHash = false; }, 100);
    } else {
      card.classList.add('expanded');
      this.updatingHash = true;
      window.location.hash = `#blog-${card.dataset.slug || index}`;
      setTimeout(() => { this.updatingHash = false; }, 100);
    }
  }

  markdownToHtml(markdown) {
    // Escape HTML first so raw <tags> in the source render as inert text and
    // can't inject. The formatting rules below add their own tags afterwards.
    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Headers (must be before paragraphs)
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^ {0,3}-{3,}\s*$/gm, '<hr>');

    // Lists
    html = html.replace(/^ *\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^ *- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[^\n]*<\/li>(\n<li>[^\n]*<\/li>)*)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\n<ul>/g, '');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links — only allow http(s)/mailto or relative/anchor URLs; reject
    // javascript:, data:, etc. Bare "www." links are promoted to https.
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (m, text, url) => {
      const trimmed = url.trim();
      const scheme = (trimmed.match(/^([a-z][a-z0-9+.-]*):/i) || [])[1];
      if (scheme && !['http', 'https', 'mailto'].includes(scheme.toLowerCase())) {
        return text; // drop unsafe scheme, keep the link text
      }
      const href = /^www\./i.test(trimmed) ? 'https://' + trimmed : trimmed;
      return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
    });

    // Split into lines and process paragraphs
    const lines = html.split('\n');
    let result = [];
    let inBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a block element
      if (line.match(/^<(h[1-3]|ul|ol|pre|li|code|hr)/) || line === '') {
        if (inBlock && result.length > 0) {
          result[result.length - 1] = '<p>' + result[result.length - 1] + '</p>';
          inBlock = false;
        }
        if (line !== '') result.push(line);
      } else {
        if (!inBlock) {
          result.push(line);
          inBlock = true;
        } else {
          result[result.length - 1] += ' ' + line;
        }
      }
    }
    
    if (inBlock && result.length > 0) {
      result[result.length - 1] = '<p>' + result[result.length - 1] + '</p>';
    }

    return result.join('\n');
  }
}

// Initialize blog system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new BlogSystem();
  });
} else {
  new BlogSystem();
}
