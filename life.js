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

// ──── Static Blog Data ────────────────────────────────────────────────────
const STATIC_BLOGS = [
  {
    filename: '#3-E-Bikes-My-Obsession-and-Future-Plans.md',
    title: 'E-Bikes, plans and obsession',
    content: `# E-Bikes, plans and obsession

Hello Blog, you guys don't know this yet, but I have been obsessed with E-Bikes for the past few months, starting with buying my first E-Bike on amazon, then that getting stolen (long story short don't use combination locks), then building my own using a kit. 

-----
## Introduction 
I am loving the one that I built my self, it is using a 48V brushless hub motor and has a large 20ah battery which let's me go roughly 80km on one charge with me putting no effort in, its like flying. I have cycled from Cambridge center to St Ives and back on one charge and it had only lost half its charge! However, at the moment the bike is just a generic kit, and I feel there could be many adjustments.

Here is a list of the features that I would like on my bike, but its not mandatory:

 - Regenerative breaking (supported by my gearless, brushless motor) 
 - Phone as information display
 - Phone as controller
 - Nice waterproof LEDs
 - PAS 
 - Indicator
 - Anti theft auto lock motor
 - Front and back lights, the front having 2, one for visibility and the other so I can see in the dark easily

---
## Current rough plan
At the moment it am looking at the Flipsky 75100 Pro V2, which is a DIY hobby motor controller for things such as E-Bikes. I will be adding Julet connectors to it to ensure that it is waterproof and when the whole controller is finished I will be spraying it with a conformal coating to ensure that the PCB its self is waterproof. I want to have it so there is a USB pigtail, near the front of the bike so it has easy charging while connected to the bike's Bluetooth. I will be adding an esp32 to the device to add functionality such as the indicators and the LED lighting. ESP32s are commonly used with Flipsky products and python libraries exist for it.

---
## See you soon
Anyway, that's it for now I am going on holiday for a few weeks where I will be researching this more, if you have any ideas do contact me on LinkedIn or Github. Maybe I will even record this into a YouTube video to document this properly as it is something of high interest to me and I would love to help others achieve a similar result that I hope to achieve. 

Have a good day, thanks for reading!`
  },
  {
    filename: '#2-Expanding-My-Homeserver-Proxmox-and-Ente.md',
    title: 'Expanding My Home Server: Proxmox, Ente, and My First Steps Into Clustering',
    content: `# Expanding My Home Server: Proxmox, Ente, and My First Steps Into Clustering

It's been a few days since my last update, and most of that time has been spent researching, experimenting, and trying to understand how I wanted my home server setup to grow.

I got very lucky during this process: my girlfriend's dad was getting rid of an old workstation from his workplace, and he gave it to me for free. This was a huge upgrade and meant I could finally move beyond my single-machine setup.

With this new hardware, I decided to expand my infrastructure using Proxmox, a hypervisor and VM manager that supports clustering and live migration. I'll be keeping my small Wyse machine as a backup server, while the new workstation becomes the core of the cluster. My end goal is to move towards an Infrastructure as Code (IaC) style setup, so that if something goes wrong with the hardware, I can easily migrate or rebuild the entire environment.

---

## Installing Proxmox

The first step was installing Proxmox Virtual Environment on both machines. I used the graphical installer, which functioned much like installing any other Linux distribution.

During setup, I used Bitwarden to generate a strong, random username and password. Once installation was complete, I connected to the Proxmox web interface through my local network.

One of my first configuration steps was setting up my HDDs as shared storage devices. This allows both machines in the cluster to access the same storage, which is essential for VM migration and future scalability.

---

## Creating the Ubuntu VM

With Proxmox running, I created an Ubuntu virtual machine to host both Ente and Nextcloud.

- Storage: HDD (SSDs were almost full)
- RAM: 4 GB
- CPU: 4 cores

This is more than enough for my current needs, and the beauty of Proxmox is that resources can be easily expanded later if required.

---

## Installing Ente (Self-Hosted)

To install Ente, I followed the official Quickstart – Self-Hosting guide and used their installation script. After running the test command, everything worked correctly on localhost.

However, when testing again across my local network, I ran into an issue: the web app couldn't communicate with the "museum" service (the database).

After some investigation, I realised this was because the services were still trying to communicate via localhost. Once I updated the configuration to use the machine's local IP address instead, everything worked perfectly again — I was able to create an account successfully.

---

## Exposing the Service to the Internet (Safely)

At this point, Ente worked locally, but I wanted access from the public internet. This was the part I was most cautious about, as exposing services directly can introduce serious security risks.

To minimise this risk, I decided to use Caddy as a reverse proxy. This means I only need to expose ports 80 and 443, rather than the application itself.

I followed Ente's recommended reverse proxy setup and then added the necessary second-level domains in my Cloudflare dashboard, allowing DNS to resolve to my public IP address.

Once everything was in place, I opened the required ports on my router…

Success: https://photos.oldham.fyi now works from the open internet.

---

## Fixing Storage Limits (Ente CLI)

Logging in and creating an account worked as expected, but I quickly hit Ente's default 10 GB storage limit.

Since this is my own self-hosted instance, the solution was to use the Ente CLI to promote my account to an admin and remove the storage limit entirely.

After installing the CLI and adjusting my account permissions, I now have effectively unlimited storage.

---

## What's Next?

With Ente up and running securely on the internet, the next step is to:

- Set up my backup Proxmox server
- Continue moving toward a reproducible, Infrastructure-as-Code-style setup

Overall, this has been a challenging but extremely rewarding experience, and I've learned a huge amount about virtualisation, networking, and safely exposing services to the internet.`
  },
  {
    filename: '#1-My-First-Blog-Welome.md',
    title: '1 My Home Lab Journey: Self-Hosting Ente',
    content: `# 1 My Home Lab Journey: Self-Hosting Ente

Hello, this is my first blog, and my journey into my home lab where I want to start it by replacing the services that I am currently paying for, to ones where I am self hosting, while keeping to correct back up rules, and complete security, so I am able to use it not only as a learning project but as one where I can use it as a replacement to commercial products.

## Replacing Ente.com

The first thing I plan to replace is my ente.com subscription. As much as I love my subscription, I am currently only on the base plan, which provides only 50 GB of storage, which is not enough. I am currently at 48 GB! 

I also want to use it for my family so that they can stop using Google Photos, for security's sake [as we can see here how it doesnt use e2ee](www.chriscarley.net/blog/google-photos-e2ee). 

I also want to be able to easily access all my old photos of me as a child, since they are currently on a rarely used hard drive, which also poses risks in case the hard drive fails. I will be consistently backing up my server.

## My Current Hardware and What I Need to Get

Currently I have a Wyse mini computer as my home server with:
- 2 cores
- 4GB of memory
- 512GB SSD (added a while back)

This works ok, however, I would like to be able to run the service for multiple users, which will require better specs. Don't worry, this machine won't go to waste; it will be used as a backup server for all my images and everything.

### The New Setup

I have just bought a new **Dell Optiplex 5050** with:
- 16 GB of DDR4
- i7-6700
- 2TB HDD
- 128 GB SSD

All for **£74** on eBay, not a bad deal!

## What's Next

I will continue this blog when I get the PC, where I will go through my system hardening, then set up Ente, which will now be very easy to do!`
  }
];

// ──── Blog System ────────────────────────────────────────────────────
class BlogSystem {
  constructor() {
    this.blogs = STATIC_BLOGS;
    this.updatingHash = false;
    this.init();
  }

  init() {
    this.setupNavigation();
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

  displayBlogList() {
    const blogList = document.getElementById('blog-list');
    
    if (this.blogs.length === 0) {
      blogList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted);">No blogs yet. Add markdown files to the blogs/ folder.</p>';
      return;
    }

    blogList.innerHTML = this.blogs.map((blog, index) => `
      <div class="blog-card" data-index="${index}">
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
      const header = card.querySelector('.blog-card-header');
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = card.dataset.index;
        this.toggleBlog(card, index);
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
      window.location.hash = `#blog-${index}`;
      setTimeout(() => { this.updatingHash = false; }, 100);
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

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

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
