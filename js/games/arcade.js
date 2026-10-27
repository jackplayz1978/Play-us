// Arcade games: classic one-minute action.
(() => {
  const { register, W, H, U, D } = PU;

  // ------------------------------------------------------------------ Snake
  register({
    id: 'snake', name: 'Snake', emoji: '🐍', cat: 'Arcade',
    desc: 'Eat the apples to grow. Avoid the walls and your own tail.',
    how: [
      'Swipe, or use the arrow keys, to turn.',
      'Each apple is +1. The snake grows longer and moves faster.',
      'If you hit a wall or your own body, the game ends.',
    ],
    create(api) {
      const C = 20, COLS = 20, ROWS = 27, Y0 = 52;
      let snake = [{ x: 10, y: 18 }, { x: 10, y: 19 }, { x: 10, y: 20 }];
      let dir = { x: 0, y: -1 }, queue = [], acc = 0, food, dead = false;
      const placeFood = () => {
        do { food = { x: U.randi(0, COLS - 1), y: U.randi(0, ROWS - 1) }; }
        while (snake.some((s) => s.x === food.x && s.y === food.y));
      };
      placeFood();
      const V = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      return {
        update(dt) {
          acc += dt;
          const step = Math.max(0.065, 0.15 - api.score * 0.004);
          while (acc >= step && !dead) {
            acc -= step;
            if (queue.length) dir = queue.shift();
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            const eats = head.x === food.x && head.y === food.y;
            const body = eats ? snake : snake.slice(0, -1);
            if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || body.some((s) => s.x === head.x && s.y === head.y)) {
              dead = true; api.sfx('bad'); api.end(head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ? 'Hit the wall!' : 'Bit your tail!');
              return;
            }
            snake.unshift(head);
            if (eats) { api.add(1); api.sfx('tap'); placeFood(); } else snake.pop();
          }
        },
        onSwipe(d) {
          const v = V[d], last = queue[queue.length - 1] || dir;
          if (v.x === -last.x && v.y === -last.y) return;
          if (v.x === last.x && v.y === last.y) return;
          if (queue.length < 2) queue.push(v);
        },
        draw(ctx) {
          D.bg(ctx, '#123524', '#0b2016');
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2) D.rect(ctx, x * C, Y0 + y * C, C, C, 'rgba(255,255,255,.025)');
          ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.strokeRect(1, Y0, W - 2, ROWS * C);
          D.emoji(ctx, '🍎', food.x * C + C / 2, Y0 + food.y * C + C / 2 + 1, 18);
          snake.forEach((s, i) => D.rect(ctx, s.x * C + 1, Y0 + s.y * C + 1, C - 2, C - 2, i === 0 ? '#a3f7bf' : `hsl(145 70% ${55 - Math.min(25, i)}%)`, 5));
          const h = snake[0];
          D.circle(ctx, h.x * C + C / 2 + dir.x * 4 - dir.y * 4, Y0 + h.y * C + C / 2 + dir.y * 4 - dir.x * 4, 2.5, '#123524');
          D.circle(ctx, h.x * C + C / 2 + dir.x * 4 + dir.y * 4, Y0 + h.y * C + C / 2 + dir.y * 4 + dir.x * 4, 2.5, '#123524');
          D.text(ctx, 'Swipe to turn', W / 2, 26, 15, 'rgba(255,255,255,.4)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Brick
  register({
    id: 'brick', name: 'Brick', emoji: '🧱', cat: 'Arcade',
    desc: 'Bounce the ball off your paddle to smash every brick.',
    how: [
      'Drag to move the paddle. Tap to launch the ball.',
      'Each brick is +1. Clear the whole wall for a bonus and a faster ball.',
      'You have 3 balls.',
    ],
    create(api) {
      const PW = 84, PH = 12, PY = 545, R = 7, COLS = 7, BW = 50, BH = 20, GAP = 4;
      let px = W / 2, lives = 3, speed = 380, wall = 0, bricks, ball;
      const build = () => {
        wall++;
        bricks = [];
        const x0 = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
        for (let r = 0; r < 6; r++) for (let c = 0; c < COLS; c++) bricks.push({ x: x0 + c * (BW + GAP), y: 80 + r * (BH + GAP), hue: 330 - r * 30, alive: true });
      };
      const stick = () => { ball = { x: px, y: PY - R - 1, vx: 0, vy: 0, stuck: true }; };
      build(); stick();
      return {
        update(dt) {
          if (api.keys.has('ArrowLeft')) px -= 480 * dt;
          if (api.keys.has('ArrowRight')) px += 480 * dt;
          px = U.clamp(px, PW / 2, W - PW / 2);
          if (ball.stuck) { ball.x = px; return; }
          const steps = Math.ceil((speed * dt) / 4);
          for (let s = 0; s < steps; s++) {
            const h = dt / steps;
            ball.x += ball.vx * h; ball.y += ball.vy * h;
            if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
            if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
            if (ball.y < 50 + R) { ball.y = 50 + R; ball.vy = Math.abs(ball.vy); }
            if (ball.vy > 0 && ball.y + R >= PY && ball.y + R <= PY + PH + 6 && Math.abs(ball.x - px) <= PW / 2 + R) {
              const k = U.clamp((ball.x - px) / (PW / 2), -1, 1);
              const a = k * 1.05;
              ball.vx = speed * Math.sin(a); ball.vy = -speed * Math.cos(a); ball.y = PY - R;
              api.tone(330, 0.04, 'square', 0.04);
            }
            for (const b of bricks) {
              if (!b.alive) continue;
              if (U.bounceRect(ball, R, b.x, b.y, BW, BH, 1)) {
                b.alive = false; api.add(1); api.tone(500 + (6 - (b.y - 80) / 24) * 60, 0.05, 'triangle', 0.08);
                const sp = Math.hypot(ball.vx, ball.vy) || 1; ball.vx *= speed / sp; ball.vy *= speed / sp;
                break;
              }
            }
          }
          if (bricks.every((b) => !b.alive)) { api.add(5, W / 2, 300, 'Wall cleared +5'); speed += 50; build(); stick(); }
          if (ball.y > H + 20) {
            lives--; api.sfx('bad');
            if (lives <= 0) api.end('Out of balls!'); else stick();
          }
        },
        onDown(x) {
          px = x;
          if (ball.stuck) { ball.stuck = false; const a = U.rand(-0.4, 0.4); ball.vx = speed * Math.sin(a); ball.vy = -speed * Math.cos(a); }
        },
        onMove(x) { if (api.pointer.down) px = x; },
        onKey(k) { if (k === ' ' || k === 'ArrowUp') this.onDown(px); },
        draw(ctx) {
          D.bg(ctx, '#171339', '#0a0820');
          for (const b of bricks) if (b.alive) D.rect(ctx, b.x, b.y, BW, BH, `hsl(${b.hue} 85% 62%)`, 4);
          D.rect(ctx, px - PW / 2, PY, PW, PH, '#fff', 6);
          D.circle(ctx, ball.x, ball.y, R, '#ffcc3d');
          D.lives(ctx, lives);
          if (ball.stuck) D.text(ctx, 'Tap to launch', W / 2, 470, 20, 'rgba(255,255,255,.6)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Jumpy
  register({
    id: 'jumpy', name: 'Jumpy', emoji: '🐸', cat: 'Arcade', guess: true,
    desc: 'Bounce from platform to platform and climb as high as you can.',
    how: [
      'You bounce automatically. Hold the left or right side of the screen (or use the arrow keys) to steer.',
      'Going off one side of the screen brings you back on the other.',
      'Watch out for moving and crumbling platforms. If you fall off the bottom, the game ends.',
    ],
    create(api) {
      const PWD = 72, PHT = 12, G = 1500, JUMP = 800, SZ = 34;
      const p = { x: W / 2, y: 480, vy: -JUMP };
      let plats = [{ x: W / 2 - PWD / 2, y: 520, kind: 'n', vx: 0 }], cam = 0, topY = 520, best = 0;
      const addPlat = () => {
        const height = -topY;
        const gap = U.clamp(70 + height / 60, 70, 175);
        topY -= U.rand(gap * 0.6, gap);
        let kind = 'n';
        if (height > 1500 && Math.random() < 0.25) kind = 'm';
        if (height > 3000 && Math.random() < 0.18) kind = 'b';
        plats.push({ x: U.rand(10, W - PWD - 10), y: topY, kind, vx: kind === 'm' ? U.pick([-1, 1]) * U.rand(60, 130) : 0 });
        if (kind === 'b') addPlat(); // a crumbling one never stands alone
      };
      while (topY > -H) addPlat();
      return {
        update(dt) {
          let dir = 0;
          if (api.keys.has('ArrowLeft')) dir -= 1;
          if (api.keys.has('ArrowRight')) dir += 1;
          if (api.pointer.down) dir = api.pointer.x < W / 2 ? -1 : 1;
          p.x += dir * 330 * dt;
          if (p.x < -SZ / 2) p.x += W; if (p.x > W + SZ / 2) p.x -= W;
          const prevBottom = p.y + SZ / 2;
          p.vy += G * dt; p.y += p.vy * dt;
          for (const pl of plats) {
            if (pl.kind === 'm') { pl.x += pl.vx * dt; if (pl.x < 0 || pl.x > W - PWD) pl.vx *= -1; }
            if (pl.broken) { pl.y += 400 * dt; continue; }
            const bottom = p.y + SZ / 2;
            if (p.vy > 0 && prevBottom <= pl.y && bottom >= pl.y && p.x + SZ * 0.35 > pl.x && p.x - SZ * 0.35 < pl.x + PWD) {
              if (pl.kind === 'b') { pl.broken = true; api.sfx('bad'); continue; }
              p.y = pl.y - SZ / 2; p.vy = -JUMP; api.tone(420, 0.05, 'triangle', 0.06);
            }
          }
          if (p.y - cam < 240) cam = p.y - 240;
          while (topY > cam - 100) addPlat();
          plats = plats.filter((pl) => pl.y < cam + H + 50);
          const h = Math.floor((520 - p.y) / 10);
          if (h > best) { best = h; api.set(best); }
          if (p.y - cam > H + 40) { api.sfx('bad'); api.end('You fell!'); }
        },
        draw(ctx) {
          D.bg(ctx, '#bde8ff', '#eaf7ff');
          ctx.save(); ctx.translate(0, -cam);
          for (const pl of plats) {
            const col = pl.kind === 'm' ? '#3b82f6' : pl.kind === 'b' ? '#b07a4a' : '#43b05c';
            D.rect(ctx, pl.x, pl.y, PWD, PHT, col, 6);
            if (pl.kind === 'b') D.line(ctx, pl.x + PWD / 2, pl.y, pl.x + PWD / 2 + 5, pl.y + PHT, '#5a3a1a', 2);
          }
          for (const ox of [0, p.x < SZ ? W : p.x > W - SZ ? -W : null]) {
            if (ox === null) continue;
            D.emoji(ctx, '🐸', p.x + ox, p.y, SZ);
          }
          ctx.restore();
          D.text(ctx, '◀ hold', 40, H - 22, 14, 'rgba(0,0,0,.25)');
          D.text(ctx, 'hold ▶', W - 40, H - 22, 14, 'rgba(0,0,0,.25)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Keep Up
  register({
    id: 'keep-up', name: 'Keep Up', emoji: '⚽', cat: 'Arcade',
    desc: "Tap the ball to keep it in the air. Don't let it touch the ground.",
    how: [
      'Tap the ball to kick it upward.',
      'Where you tap matters: tapping the left side sends it to the right, and the other way round.',
      'Each kick is +1. The ball gets heavier over time.',
    ],
    create(api) {
      const R = 36, FLOOR = H - 30;
      const b = { x: W / 2, y: 260, vx: 0, vy: -200, rot: 0, spin: 0 };
      return {
        update(dt) {
          const g = 1150 + api.elapsed * 12;
          b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt;
          b.vx *= Math.exp(-0.25 * dt);
          if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * 0.8; }
          if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx) * 0.8; }
          if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * 0.5; }
          if (b.y > FLOOR - R) { b.y = FLOOR - R; api.sfx('bad'); api.end('The ball dropped!'); }
        },
        onDown(x, y) {
          if (U.dist(x, y, b.x, b.y) > R + 22) return;
          b.vy = -Math.max(640, 560 + api.elapsed * 3);
          b.vx = U.clamp(b.vx * 0.3 + (b.x - x) * 7, -360, 360);
          b.spin = (b.x - x) * 0.2;
          api.add(1); api.tone(300, 0.06, 'triangle', 0.1);
        },
        draw(ctx) {
          D.bg(ctx, '#7cc7ff', '#d7f0ff');
          D.rect(ctx, 0, FLOOR, W, H - FLOOR, '#4caf50');
          const sh = U.clamp(1 - (FLOOR - b.y) / 600, 0.25, 1);
          ctx.globalAlpha = 0.25; D.circle(ctx, b.x, FLOOR + 4, R * sh, '#000'); ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); D.emoji(ctx, '⚽', 0, 3, R * 2.1); ctx.restore();
          D.text(ctx, String(api.score), W / 2, 120, 72, 'rgba(255,255,255,.6)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Ballracer
  register({
    id: 'ballracer', name: 'Ballracer', emoji: '🏎️', cat: 'Arcade', guess: true,
    desc: 'Steer the speeding ball through the gaps and grab the gems.',
    how: [
      'Drag left and right, or use the arrow keys, to steer.',
      'Get through the gap in each wall. Hitting a wall ends the game.',
      'Each wall is +1 and each gem 💎 is +3. The ball keeps speeding up.',
    ],
    create(api) {
      const R = 12, BY = 470, EDGE = 22;
      let bx = W / 2, target = W / 2, speed = 240, walls = [], gems = [], offset = 0;
      const addWall = (y) => {
        const gap = U.clamp(150 - api.elapsed * 1.3, 86, 150);
        const gx = U.rand(EDGE + 10, W - EDGE - gap - 10);
        const moving = api.elapsed > 20 && Math.random() < 0.35;
        walls.push({ y, gx, gap, vx: moving ? U.pick([-1, 1]) * U.rand(40, 90) : 0, passed: false });
        if (Math.random() < 0.45) gems.push({ x: gx + gap / 2, y: y - 90 });
      };
      for (let y = 120; y > -H; y -= 210) addWall(y);
      return {
        update(dt) {
          speed = Math.min(560, 240 + api.elapsed * 6);
          if (api.keys.has('ArrowLeft')) target -= 420 * dt;
          if (api.keys.has('ArrowRight')) target += 420 * dt;
          target = U.clamp(target, EDGE + R, W - EDGE - R);
          bx = U.lerp(bx, target, Math.min(1, dt * 14));
          const dy = speed * dt;
          offset += dy;
          for (const w of walls) {
            w.y += dy;
            if (w.vx) { w.gx += w.vx * dt; if (w.gx < EDGE + 5 || w.gx + w.gap > W - EDGE - 5) w.vx *= -1; }
            if (w.y + 8 > BY - R && w.y - 8 < BY + R && (bx - R < w.gx || bx + R > w.gx + w.gap)) { api.sfx('bad'); api.end('Crashed into a wall!'); return; }
            if (!w.passed && w.y - 8 > BY + R) { w.passed = true; api.add(1); }
          }
          for (const g of gems) {
            g.y += dy;
            if (!g.got && U.dist(bx, BY, g.x, g.y) < R + 14) { g.got = true; api.add(3, g.x, g.y - 20); api.sfx('good'); }
          }
          walls = walls.filter((w) => w.y < H + 20);
          gems = gems.filter((g) => g.y < H + 20 && !g.got);
          const spacing = U.clamp(220 - api.elapsed, 170, 220);
          while (walls[walls.length - 1].y > -40) addWall(walls[walls.length - 1].y - spacing);
        },
        onDown(x) { target = x; },
        onMove(x) { if (api.pointer.down) target = x; },
        draw(ctx) {
          D.bg(ctx, '#2b2b3a', '#1c1c28');
          D.rect(ctx, 0, 0, EDGE, H, '#ff5fa2'); D.rect(ctx, W - EDGE, 0, EDGE, H, '#ff5fa2');
          for (let i = -1; i < 9; i++) { const y = ((offset % 80) + i * 80); D.rect(ctx, W / 2 - 2, y, 4, 40, 'rgba(255,255,255,.12)'); }
          for (const w of walls) {
            D.rect(ctx, EDGE, w.y - 8, w.gx - EDGE, 16, '#ffcc3d', 4);
            D.rect(ctx, w.gx + w.gap, w.y - 8, W - EDGE - (w.gx + w.gap), 16, '#ffcc3d', 4);
          }
          for (const g of gems) D.emoji(ctx, '💎', g.x, g.y, 24);
          D.circle(ctx, bx, BY, R, '#fff');
          D.circle(ctx, bx - 4, BY - 4, 4, 'rgba(255,255,255,.6)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Zig
  register({
    id: 'zig', name: 'Zig', emoji: '〰️', cat: 'Arcade',
    desc: 'Tap to switch direction and keep the ball on the zig-zag path.',
    how: [
      'The ball rolls diagonally up the path on its own.',
      'Tap to switch between left and right at every corner.',
      'Each successful turn is +1. If the ball rolls off the path, the game ends.',
    ],
    create(api) {
      const HW = 22, SQ = Math.SQRT1_2;
      let pts = [{ x: W / 2, y: 520 }], segDir = Math.random() < 0.5 ? 1 : -1, d = segDir;
      const b = { x: W / 2, y: 520 }, firstDir = segDir;
      let cam = 0, speed = 150, falling = 0;
      const extend = () => {
        const last = pts[pts.length - 1];
        let L = U.rand(40, 140);
        const lim = segDir > 0 ? (W - 50 - last.x) : (last.x - 50);
        L = Math.min(L, lim);
        if (L < 25) { segDir *= -1; return; }
        pts.push({ x: last.x + segDir * L, y: last.y - L });
        segDir *= -1;
      };
      while (pts[pts.length - 1].y > -200) extend();
      d = firstDir;
      const onPath = () => {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], c = pts[i];
          if (Math.min(a.y, c.y) - HW > b.y || Math.max(a.y, c.y) + HW < b.y) continue;
          if (U.distToSeg(b.x, b.y, a.x, a.y, c.x, c.y) <= HW) return true;
        }
        return false;
      };
      return {
        update(dt) {
          if (falling) { falling += dt; return; }
          speed = Math.min(330, 150 + api.elapsed * 3.2);
          b.x += d * speed * SQ * dt; b.y -= speed * SQ * dt;
          cam = b.y - 420;
          while (pts[pts.length - 1].y > cam - 120) extend();
          while (pts.length > 3 && pts[1].y > cam + H + 60) pts.shift();
          if (!onPath()) { falling = 0.001; api.sfx('bad'); api.end('Fell off the path!'); }
        },
        onTap() { if (!falling && !api.over) { d *= -1; api.add(1); api.tone(600, 0.04, 'triangle', 0.06); } },
        draw(ctx) {
          D.bg(ctx, '#5ad1c7', '#2c8f9c');
          ctx.save(); ctx.translate(0, -cam);
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y + 8);
          for (const p of pts) ctx.lineTo(p.x, p.y + 8);
          ctx.strokeStyle = '#1f6a74'; ctx.lineWidth = HW * 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (const p of pts) ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = '#f7f3e8'; ctx.stroke();
          const r = falling ? Math.max(0, 9 * (1 - falling * 2)) : 9;
          D.circle(ctx, b.x, b.y, r, '#ff5fa2');
          ctx.restore();
        },
      };
    },
  });

  // ------------------------------------------------------------------ Anchors
  register({
    id: 'anchors', name: 'Anchors', emoji: '⚓', cat: 'Arcade', guess: true,
    desc: 'Swing around each anchor and let go at the right moment to reach the next one.',
    how: [
      'Your ball circles the anchor it is attached to.',
      'Tap to let go. It flies off in a straight line, and if it passes close to another anchor it latches on.',
      'Which side you arrive on sets which way you spin next. If you miss and fly off the screen, the game ends.',
    ],
    create(api) {
      const OR = 44, CAP = 46, BALL = 9;
      let anchors = [{ x: W / 2, y: 430 }], cur = 0, theta = Math.PI, omega = 3.2, ball = { x: 0, y: 0, vx: 0, vy: 0 }, flying = false, cam = 0, trail = [];
      const addAnchor = () => {
        const last = anchors[anchors.length - 1];
        let x;
        do { x = U.rand(70, W - 70); } while (Math.abs(x - last.x) < 60);
        anchors.push({ x, y: last.y - U.rand(120, 175) });
      };
      for (let i = 0; i < 8; i++) addAnchor();
      const place = () => { const a = anchors[cur]; ball.x = a.x + OR * Math.cos(theta); ball.y = a.y + OR * Math.sin(theta); };
      place();
      return {
        update(dt) {
          if (!flying) { theta += omega * dt; place(); }
          else {
            ball.x += ball.vx * dt; ball.y += ball.vy * dt;
            for (let i = cur + 1; i < anchors.length; i++) {
              const a = anchors[i];
              const dx = ball.x - a.x, dy = ball.y - a.y;
              if (Math.hypot(dx, dy) <= CAP) {
                const cross = dx * ball.vy - dy * ball.vx;
                const gained = i - cur;
                cur = i; flying = false; theta = Math.atan2(dy, dx);
                omega = Math.sign(cross || 1) * Math.min(5.2, 3.2 + api.score * 0.06);
                api.add(gained, a.x, a.y - 40); api.sfx('tap');
                break;
              }
            }
            if (flying && (ball.x < -BALL || ball.x > W + BALL || ball.y - cam > H + BALL || ball.y - cam < -BALL)) { api.sfx('bad'); api.end('Lost in the sea!'); }
          }
          trail.push({ x: ball.x, y: ball.y }); if (trail.length > 14) trail.shift();
          cam = U.lerp(cam, anchors[cur].y - 430, Math.min(1, dt * 4));
          while (anchors[anchors.length - 1].y > cam - 200) addAnchor();
        },
        onTap() {
          if (flying || api.over) return;
          flying = true;
          const s = 470, sgn = Math.sign(omega);
          ball.vx = -Math.sin(theta) * s * sgn; ball.vy = Math.cos(theta) * s * sgn;
        },
        draw(ctx) {
          D.bg(ctx, '#0b3d6b', '#04182b');
          ctx.save(); ctx.translate(0, -cam);
          anchors.forEach((a, i) => {
            if (i < cur) return;
            D.ring(ctx, a.x, a.y, CAP, i === cur ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.08)', 2);
            D.circle(ctx, a.x, a.y, 10, i === cur ? '#ffcc3d' : '#9ec9ff');
          });
          if (!flying) D.line(ctx, anchors[cur].x, anchors[cur].y, ball.x, ball.y, 'rgba(255,255,255,.6)', 2);
          trail.forEach((p, i) => { ctx.globalAlpha = i / trail.length * 0.5; D.circle(ctx, p.x, p.y, BALL * i / trail.length, '#ff5fa2'); });
          ctx.globalAlpha = 1;
          D.circle(ctx, ball.x, ball.y, BALL, '#ff5fa2');
          ctx.restore();
        },
      };
    },
  });
})();
