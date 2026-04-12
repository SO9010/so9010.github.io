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