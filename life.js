// Conway's Game of Life background animation
const canvas = document.getElementById('life-bg');
const ctx = canvas.getContext('2d');
let width, height, cols, rows, cellSize = 13;
let grid, next;
let lastChange = 0;
let stillFrames = 0;
const MAX_STILL = 120; // ~6 seconds at 20fps
let prevHash = '';
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
canvas.addEventListener('mousedown', () => { mouse.down = true; });
canvas.addEventListener('mouseup', () => { mouse.down = false; });

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
      // Mouse interaction: if mouse is near, randomly spawn or kill cells
      if (mouse.x >= 0 && mouse.y >= 0) {
        let px = Math.floor(mouse.x / cellSize);
        let py = Math.floor(mouse.y / cellSize);
        let dist = Math.hypot(px - x, py - y);
        if (dist < 6) {
          if (mouse.down) {
            next[y][x] = 1; // Draw live cells on click
          } else if (Math.random() < 0.03) {
            next[y][x] = 1;
          }
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
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
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
  draw();
  let hash = hashGrid();
  if (hash !== prevHash) {
    stillFrames = 0;
    prevHash = hash;
  } else {
    stillFrames++;
  }
  if (stillFrames > MAX_STILL) {
    resize();
    stillFrames = 0;
    prevHash = '';
  }
  setTimeout(animate, 50); // ~20fps (slower)
}

window.addEventListener('resize', resize);
resize();
animate();

// ──── Blog System ────────────────────────────────────────────────────
class BlogSystem {
  constructor() {
    this.blogs = [];
    this.updatingHash = false;
    this.init();
  }

  async init() {
    this.setupNavigation();
    await this.loadBlogIndex();
    this.restoreStateFromUrl();
    window.addEventListener('hashchange', () => this.restoreStateFromUrl());
  }

  restoreStateFromUrl() {
    if (this.updatingHash) return; // Prevent conflicts
    
    const hash = window.location.hash.slice(1); // Remove #
    
    if (hash.startsWith('blog-')) {
      const blogIndex = parseInt(hash.split('-')[1]);
      if (!isNaN(blogIndex) && blogIndex < this.blogs.length) {
        this.showSection('blogs');
        setTimeout(() => {
          const card = document.querySelector(`[data-index="${blogIndex}"]`);
          if (card && !card.classList.contains('expanded')) {
            this.toggleBlog(card, blogIndex);
          }
        }, 100);
      }
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

  async loadBlogIndex() {
    this.blogs = [];
    
    // GitHub raw content URL base
    const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/SO9010/so9010.github.io/main/blogs';
    
    // EASY TO UPDATE: Just add your blog filenames here! TODO UPDATE ME HERE BLOGS
    const blogFiles = [
      '#1-My-First-Blog-Welome.md',
    ];
    
    for (const filename of blogFiles) {
      try {
        const rawUrl = `${GITHUB_RAW_URL}/${filename}`;
        const response = await fetch(rawUrl);
        if (response.ok) {
          // Get last modified from GitHub API
          const apiUrl = `https://api.github.com/repos/SO9010/so9010.github.io/commits?path=blogs/${filename}&per_page=1`;
          let dateStr = 'Unknown';
          let lastModified = null;
          
          try {
            const apiResponse = await fetch(apiUrl);
            if (apiResponse.ok) {
              const commits = await apiResponse.json();
              if (commits.length > 0) {
                lastModified = new Date(commits[0].commit.committer.date);
                dateStr = lastModified.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              }
            }
          } catch (e) {
            console.log(`Failed to get date from GitHub API for ${filename}:`, e);
          }
          
          this.blogs.push({
            filename: filename,
            path: rawUrl,
            title: filename.replace('.md', '').replace(/#/g, '').replace(/-/g, ' '),
            dateStr: dateStr,
            lastModified: lastModified
          });
        }
      } catch (e) {
        console.log(`Failed to load ${filename}:`, e);
      }
    }
    
    // Sort by date (newest first)
    this.blogs.sort((a, b) => {
      if (a.lastModified && b.lastModified) {
        return b.lastModified - a.lastModified;
      }
      return b.filename.localeCompare(a.filename);
    });
    
    this.displayBlogList();
  }

  displayBlogList() {
    const blogList = document.getElementById('blog-list');
    const blogView = document.getElementById('blog-view');
    
    if (this.blogs.length === 0) {
      blogList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted);">No blogs yet. Add markdown files to the blogs/ folder.</p>';
      return;
    }

    blogList.innerHTML = this.blogs.map((blog, index) => `
      <div class="blog-card" data-index="${index}">
        <div class="blog-card-header">
          <div>
            <h3>${blog.title}</h3>
            <div class="date">${blog.dateStr || blog.filename}</div>
          </div>
          <span class="expand-icon">▼</span>
        </div>
        <div class="blog-card-content"></div>
      </div>
    `).join('');

    blogList.querySelectorAll('.blog-card').forEach(card => {
      const header = card.querySelector('.blog-card-header');
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = card.dataset.index;
        this.toggleBlog(card, index);
      });
    });
  }

  async toggleBlog(card, index) {
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
      const blog = this.blogs[index];
      const contentDiv = card.querySelector('.blog-card-content');
      
      try {
        const response = await fetch(blog.path);
        const markdown = await response.text();
        const html = this.markdownToHtml(markdown);
        contentDiv.innerHTML = html;
      } catch (error) {
        contentDiv.innerHTML = `<p>Error loading blog: ${error.message}</p>`;
      }
      
      card.classList.add('expanded');
      this.updatingHash = true;
      window.location.hash = `#blog-${index}`;
      setTimeout(() => { this.updatingHash = false; }, 100);
    }
  }

  async displayBlog(index) {
    const blog = this.blogs[index];
    const blogView = document.getElementById('blog-view');
    
    try {
      const response = await fetch(blog.path);
      const markdown = await response.text();
      const html = this.markdownToHtml(markdown);
      
      blogView.innerHTML = `
        <button class="back-to-blogs">← Back to Blogs</button>
        <div>
          <h1>${blog.title}</h1>
          <div class="blog-date">${blog.filename}</div>
          <div class="blog-content">
            ${html}
          </div>
        </div>
      `;
      
      blogView.querySelector('.back-to-blogs').addEventListener('click', () => {
        blogView.classList.remove('active');
      });
      
      blogView.classList.add('active');
      blogView.scrollTop = 0;
    } catch (error) {
      blogView.innerHTML = `<p>Error loading blog: ${error.message}</p>`;
      blogView.classList.add('active');
    }
  }

  markdownToHtml(markdown) {
    let html = markdown;

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Headers (must be before paragraphs)
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\n<ul>/g, '');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Split into lines and process paragraphs
    const lines = html.split('\n');
    let result = [];
    let inBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a block element
      if (line.match(/^<(h[1-3]|ul|ol|pre|li|code)/) || line === '') {
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
