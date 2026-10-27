// Reflex games: react fast and accurately.
(() => {
  const { register, W, H, U, D } = PU;

  const ARROW_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const DIRS = ['up', 'down', 'left', 'right'];

  function arrow(ctx, x, y, size, dir, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ARROW_ANGLE[dir]);
    ctx.beginPath();
    ctx.moveTo(size * 0.55, 0);
    ctx.lineTo(0, -size * 0.45); ctx.lineTo(0, -size * 0.18);
    ctx.lineTo(-size * 0.5, -size * 0.18); ctx.lineTo(-size * 0.5, size * 0.18);
    ctx.lineTo(0, size * 0.18); ctx.lineTo(0, size * 0.45);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ Reaction Grid
  register({
    id: 'reaction-grid', name: 'Reaction Grid', emoji: '🟩', cat: 'Reflex',
    desc: 'Tap the squares as they light up, before they go dark again.',
    how: [
      'Squares light up green. Tap them before they go dark.',
      "Don't tap the red squares, and don't tap empty ones.",
      'Green = +1 · Red or empty = −1.',
    ],
    create(api) {
      const N = 4, S = 86, G = 8, X0 = (W - (N * S + (N - 1) * G)) / 2, Y0 = 150;
      const cells = Array.from({ length: N * N }, () => ({ on: 0, kind: 'go', flash: 0 }));
      let spawn = 0.4;
      const cellAt = (x, y) => {
        const c = Math.floor((x - X0) / (S + G)), r = Math.floor((y - Y0) / (S + G));
        if (c < 0 || r < 0 || c >= N || r >= N) return -1;
        if ((x - X0) % (S + G) > S || (y - Y0) % (S + G) > S) return -1;
        return r * N + c;
      };
      return {
        update(dt) {
          const e = api.elapsed;
          spawn -= dt;
          if (spawn <= 0) {
            spawn = Math.max(0.28, 0.85 - e * 0.011);
            const free = cells.map((c, i) => (c.on > 0 ? -1 : i)).filter((i) => i >= 0);
            if (free.length) {
              const c = cells[U.pick(free)];
              c.kind = e > 10 && Math.random() < 0.2 ? 'stop' : 'go';
              c.on = c.kind === 'go' ? Math.max(0.65, 1.35 - e * 0.011) : 1.2;
            }
          }
          for (const c of cells) { if (c.on > 0) c.on -= dt; if (c.flash > 0) c.flash -= dt; }
        },
        onDown(x, y) {
          const i = cellAt(x, y); if (i < 0) return;
          const c = cells[i];
          const cx = X0 + (i % N) * (S + G) + S / 2, cy = Y0 + Math.floor(i / N) * (S + G) + S / 2;
          if (c.on > 0 && c.kind === 'go') { c.on = 0; c.flash = 0.15; c.fk = 'good'; api.add(1, cx, cy - 30); api.sfx('tap'); }
          else { c.on = 0; c.flash = 0.25; c.fk = 'bad'; api.add(-1, cx, cy - 30); api.sfx('bad'); }
        },
        draw(ctx) {
          D.bg(ctx, '#132a24', '#07120f');
          cells.forEach((c, i) => {
            const x = X0 + (i % N) * (S + G), y = Y0 + Math.floor(i / N) * (S + G);
            let col = 'rgba(255,255,255,.07)';
            if (c.on > 0) col = c.kind === 'go' ? '#5cf2a5' : '#ff6b8a';
            if (c.flash > 0) col = c.fk === 'good' ? '#c9ffe4' : '#ff2d55';
            D.rect(ctx, x, y, S, S, col, 14);
          });
          D.text(ctx, 'Tap green · avoid red', W / 2, 100, 18, 'rgba(255,255,255,.5)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Swipe Fast
  register({
    id: 'swipe-fast', name: 'Swipe Fast', emoji: '👆', cat: 'Reflex',
    desc: 'Swipe the way the arrow points. If it is red, swipe the opposite way.',
    how: [
      'A green arrow means swipe the way it points.',
      'A red arrow means swipe the OPPOSITE way.',
      'Be quick, because the timer gets shorter. On a computer you can use the arrow keys.',
    ],
    swipeEarly: true,
    create(api) {
      let cur, lives = 3, fb = null;
      const next = () => {
        const limit = Math.max(0.65, 1.9 - api.score * 0.045);
        cur = { dir: U.pick(DIRS), red: api.score >= 3 && Math.random() < 0.4, t: limit, limit };
      };
      next();
      const fail = (msg) => {
        lives--; fb = { ok: false, t: 0.35 }; api.sfx('bad'); api.float(msg, W / 2, 470, '#ff6b8a', 24);
        if (lives <= 0) api.end('Out of lives!'); else next();
      };
      return {
        update(dt) {
          if (fb && (fb.t -= dt) <= 0) fb = null;
          cur.t -= dt;
          if (cur.t <= 0) fail('Too slow!');
        },
        onSwipe(d) {
          const want = cur.red ? OPPOSITE[cur.dir] : cur.dir;
          if (d === want) { api.add(1); api.sfx('tap'); fb = { ok: true, t: 0.2 }; next(); }
          else fail('Wrong way!');
        },
        draw(ctx) {
          D.bg(ctx, fb ? (fb.ok ? '#123d2c' : '#4a1020') : '#1b1840', '#0b0920');
          const k = cur.t / cur.limit;
          D.ring(ctx, W / 2, 300, 130, 'rgba(255,255,255,.08)', 10);
          ctx.beginPath(); ctx.arc(W / 2, 300, 130, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
          ctx.strokeStyle = k < 0.3 ? '#ff6b8a' : '#ffcc3d'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
          arrow(ctx, W / 2, 300, 150, cur.dir, cur.red ? '#ff6b8a' : '#5cf2a5');
          D.text(ctx, cur.red ? 'OPPOSITE' : 'SAME WAY', W / 2, 120, 22, cur.red ? '#ff6b8a' : '#5cf2a5');
          D.lives(ctx, lives);
        },
      };
    },
  });

  // ------------------------------------------------------------------ Arrow Wall
  register({
    id: 'arrow-wall', name: 'Arrow Wall', emoji: '⬆️', cat: 'Reflex', guess: true,
    desc: 'Clear the bottom arrow of a growing wall before it reaches the top.',
    how: [
      'Arrows keep stacking up into a wall.',
      'Swipe, or press an arrow key, the way the BOTTOM arrow points to clear it.',
      'A wrong swipe adds 2 arrows. If the wall reaches the top, the game ends.',
    ],
    swipeEarly: true,
    create(api) {
      const MAX = 9, TH = 56;
      const stack = [];
      const push = () => stack.push(U.pick(DIRS));
      for (let i = 0; i < 4; i++) push();
      let spawn = 1, shake = 0;
      return {
        update(dt) {
          spawn -= dt;
          if (spawn <= 0) { spawn = Math.max(0.32, 1.0 - api.elapsed * 0.012); push(); }
          if (shake > 0) shake -= dt;
          if (stack.length > MAX) api.end('The wall reached the top!');
        },
        onSwipe(d) {
          if (!stack.length) return;
          if (stack[0] === d) { stack.shift(); api.add(1); api.tone(500 + Math.min(600, api.score * 6), 0.05, 'triangle'); }
          else { push(); push(); shake = 0.25; api.sfx('bad'); }
        },
        draw(ctx) {
          D.bg(ctx, '#1a2246', '#0b0f24');
          const top = H - 40 - MAX * (TH + 4);
          D.rect(ctx, 90, top - 6, W - 180, 4, '#ff6b8a');
          D.text(ctx, 'DANGER', W / 2, top - 22, 13, '#ff6b8a');
          const ox = shake > 0 ? Math.sin(shake * 80) * 6 : 0;
          stack.slice(0, MAX + 1).forEach((d, i) => {
            const y = H - 40 - (i + 1) * (TH + 4);
            const first = i === 0;
            D.rect(ctx, 110 + ox, y, W - 220, TH, first ? '#ffcc3d' : 'rgba(255,255,255,.12)', 12);
            arrow(ctx, W / 2 + ox, y + TH / 2, 44, d, first ? '#241a00' : '#fff');
          });
        },
      };
    },
  });

  // ------------------------------------------------------------------ Piano
  register({
    id: 'piano', name: 'Piano', emoji: '🎹', cat: 'Reflex',
    desc: 'Tap the black tiles as they scroll down. Never tap the white ones.',
    how: [
      'Tap every black tile before it scrolls off the bottom of the screen.',
      'If you tap a white space or let a tile slip past, the game ends.',
      'On a keyboard, use D F J K for the four lanes.',
    ],
    create(api) {
      const LW = W / 4, TH = 150;
      const melody = [523, 587, 659, 523, 659, 698, 784, 659, 587, 523, 494, 523, 587, 659, 587, 523];
      let rows = [], speed = 360, noteI = 0, failCell = null;
      for (let i = 0; i < 6; i++) rows.push({ lane: U.randi(0, 3), y: H - 2 * TH - i * TH, hit: false });
      const hitRow = (row, lane) => {
        if (row.lane === lane && !row.hit) {
          row.hit = true; api.add(1);
          api.tone(melody[noteI++ % melody.length], 0.18, 'triangle', 0.12);
          return;
        }
        if (row.lane !== lane) { failCell = { lane, y: row.y }; api.sfx('bad'); api.end('Wrong tile!'); }
      };
      return {
        update(dt) {
          speed = Math.min(900, 360 + api.elapsed * 9);
          for (const r of rows) r.y += speed * dt;
          const missed = rows.find((r) => !r.hit && r.y > H - TH * 0.25);
          if (missed) { failCell = { lane: missed.lane, y: missed.y, miss: true }; api.sfx('bad'); api.end('Missed a tile!'); return; }
          rows = rows.filter((r) => r.y < H);
          while (rows.length < 7) rows.push({ lane: U.randi(0, 3), y: rows[rows.length - 1].y - TH, hit: false });
        },
        onDown(x, y) {
          const lane = U.clamp(Math.floor(x / LW), 0, 3);
          const row = rows.find((r) => y >= r.y && y < r.y + TH);
          if (row) hitRow(row, lane);
        },
        onKey(k) {
          const lane = { d: 0, f: 1, j: 2, k: 3 }[k.toLowerCase()];
          if (lane == null) return;
          const row = rows.filter((r) => !r.hit && r.y > -TH).sort((a, b) => b.y - a.y)[0];
          if (row) hitRow(row, lane);
        },
        draw(ctx) {
          D.rect(ctx, 0, 0, W, H, '#f6f4ff');
          for (let i = 1; i < 4; i++) D.rect(ctx, i * LW - 1, 0, 2, H, '#d8d4ee');
          for (const r of rows) D.rect(ctx, r.lane * LW + 2, r.y + 2, LW - 4, TH - 4, r.hit ? 'rgba(30,25,60,.18)' : '#1d1838', 6);
          if (failCell) D.rect(ctx, failCell.lane * LW + 2, failCell.y + 2, LW - 4, TH - 4, failCell.miss ? '#ff6b8a' : 'rgba(255,60,90,.75)', 6);
        },
      };
    },
  });

  // ------------------------------------------------------------------ Ninja Chop
  register({
    id: 'ninja-chop', name: 'Ninja Chop', emoji: '🥷', cat: 'Reflex',
    desc: 'Swipe to slice the flying fruit, but stay away from the bombs.',
    how: [
      'Fruit gets tossed up. Swipe across it to slice it.',
      'If you slice a bomb, the game ends.',
      'If you miss 3 fruits, the game also ends. Slice several in one swipe for a bonus.',
    ],
    create(api) {
      const FRUIT = ['🍉', '🍊', '🍎', '🍍', '🥝', '🍋', '🍑', '🍇'];
      let items = [], halves = [], trail = [], spawn = 0.6, misses = 0, swipeCount = 0;
      const toss = () => {
        const n = U.randi(1, Math.min(4, 1 + Math.floor(api.elapsed / 12)));
        for (let i = 0; i < n; i++) {
          const x = U.rand(70, W - 70);
          const bomb = Math.random() < Math.min(0.28, 0.1 + api.elapsed * 0.004);
          items.push({ x, y: H + 40, vx: (W / 2 - x) * U.rand(0.4, 0.9), vy: -U.rand(700, 860), r: 32, bomb, e: bomb ? '💣' : U.pick(FRUIT), rot: 0, spin: U.rand(-3, 3) });
        }
      };
      return {
        update(dt) {
          spawn -= dt;
          if (spawn <= 0) { toss(); spawn = Math.max(0.6, 1.4 - api.elapsed * 0.012); }
          for (const o of items.concat(halves)) { o.vy += 900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.spin * dt; }
          for (const o of items) {
            if (o.y > H + 60 && o.vy > 0) {
              o.gone = true;
              if (!o.bomb) { misses++; api.float('Missed', U.clamp(o.x, 40, W - 40), H - 40, '#ff6b8a', 20); if (misses >= 3) api.end('3 fruits dropped!'); }
            }
          }
          items = items.filter((o) => !o.gone);
          halves = halves.filter((o) => o.y < H + 80);
          const now = performance.now();
          trail = trail.filter((p) => now - p.t < 140);
        },
        onDown(x, y) { trail = [{ x, y, t: performance.now() }]; swipeCount = 0; },
        onMove(x, y, px, py) {
          if (!api.pointer.down) return;
          trail.push({ x, y, t: performance.now() });
          for (const o of items) {
            if (o.cut || U.distToSeg(o.x, o.y, px, py, x, y) > o.r) continue;
            o.cut = true;
            if (o.bomb) { api.sfx('bad'); api.end('💥 You hit a bomb!'); return; }
            swipeCount++;
            api.add(1, o.x, o.y - 30); api.sfx('tap');
            halves.push({ ...o, vx: o.vx - 120, vy: o.vy * 0.4, spin: -5, side: -1 }, { ...o, vx: o.vx + 120, vy: o.vy * 0.4, spin: 5, side: 1 });
            if (swipeCount === 3) api.add(2, o.x, o.y - 60, 'Combo +2');
          }
          items = items.filter((o) => !o.cut);
        },
        draw(ctx) {
          D.bg(ctx, '#3a2414', '#1a0f08');
          for (let i = 0; i < 8; i++) D.rect(ctx, 0, i * 80 + 38, W, 3, 'rgba(0,0,0,.18)');
          for (const o of halves) {
            ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.rect(o.side < 0 ? -o.r : 0, -o.r, o.r, o.r * 2); ctx.clip();
            D.emoji(ctx, o.e, 0, 0, o.r * 1.9); ctx.restore();
          }
          for (const o of items) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); D.emoji(ctx, o.e, 0, 0, o.r * 1.9); ctx.restore(); }
          if (trail.length > 1) {
            ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
            for (const p of trail) ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
          }
          for (let i = 0; i < 3; i++) D.text(ctx, '✕', W - 24 - i * 26, 26, 22, i < misses ? '#ff6b8a' : 'rgba(255,255,255,.25)');
        },
      };
    },
  });
})();
