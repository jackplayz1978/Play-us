// Skill games: aim, physics and fine control.
(() => {
  const { register, W, H, U, D } = PU;

  // ------------------------------------------------------------------ Speedgolf
  register({
    id: 'speedgolf', name: 'Speedgolf', emoji: '⛳', cat: 'Skill',
    desc: 'Sink as many mini-golf holes as you can in one minute.',
    how: [
      'Drag back from anywhere, like a slingshot, then let go to putt.',
      'The longer you drag, the harder the shot. The ball bounces off walls.',
      'Each hole is +1, and a hole-in-one gets a bonus.',
    ],
    create(api) {
      const BR = 7, HR = 12, X0 = 20, Y0 = 60, X1 = W - 20, Y1 = H - 20;
      let ball, hole, obs, strokes, sinking = 0, aim = null, holes = 0;
      const overlaps = (r, x, y, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
      const layout = () => {
        holes++;
        ball = { x: U.rand(80, W - 80), y: Y1 - 60, vx: 0, vy: 0 };
        hole = { x: U.rand(70, W - 70), y: U.rand(Y0 + 50, 260) };
        obs = [];
        const n = Math.min(4, 1 + Math.floor(holes / 2));
        for (let tries = 0; obs.length < n && tries < 80; tries++) {
          const horiz = Math.random() < 0.6;
          const r = horiz ? { x: U.rand(X0, X1 - 160), y: U.rand(150, 440), w: U.rand(90, 170), h: 16 } : { x: U.rand(X0 + 30, X1 - 46), y: U.rand(150, 380), w: 16, h: U.rand(70, 140) };
          if (overlaps(r, hole.x, hole.y, 34) || overlaps(r, ball.x, ball.y, 40)) continue;
          obs.push(r);
        }
        strokes = 0;
      };
      layout();
      const still = () => Math.hypot(ball.vx, ball.vy) < 6;
      return {
        update(dt) {
          if (sinking > 0) { sinking -= dt; if (sinking <= 0) layout(); return; }
          const steps = 4;
          for (let s = 0; s < steps; s++) {
            const h = dt / steps;
            ball.x += ball.vx * h; ball.y += ball.vy * h;
            if (ball.x < X0 + BR) { ball.x = X0 + BR; ball.vx = Math.abs(ball.vx) * 0.8; }
            if (ball.x > X1 - BR) { ball.x = X1 - BR; ball.vx = -Math.abs(ball.vx) * 0.8; }
            if (ball.y < Y0 + BR) { ball.y = Y0 + BR; ball.vy = Math.abs(ball.vy) * 0.8; }
            if (ball.y > Y1 - BR) { ball.y = Y1 - BR; ball.vy = -Math.abs(ball.vy) * 0.8; }
            for (const r of obs) U.bounceRect(ball, BR, r.x, r.y, r.w, r.h, 0.8);
          }
          const sp = Math.hypot(ball.vx, ball.vy);
          if (sp > 0) {
            const ns = Math.max(0, sp * Math.exp(-1.1 * dt) - 70 * dt);
            ball.vx *= ns / sp; ball.vy *= ns / sp;
          }
          const dh = U.dist(ball.x, ball.y, hole.x, hole.y);
          if (dh < HR && sp < 560) {
            sinking = 0.6; ball.vx = ball.vy = 0;
            const ace = strokes === 1;
            api.add(ace ? 2 : 1, hole.x, hole.y - 30, ace ? 'Hole in one! +2' : '+1');
            api.sfx(ace ? 'great' : 'good');
          } else if (dh < HR + 10 && sp < 300) {
            // gentle pull toward the cup
            ball.vx += (hole.x - ball.x) * 6 * dt; ball.vy += (hole.y - ball.y) * 6 * dt;
          }
        },
        onDown(x, y) { if (still() && sinking <= 0) aim = { sx: x, sy: y, x, y }; },
        onMove(x, y) { if (aim) { aim.x = x; aim.y = y; } },
        onUp() {
          if (!aim) return;
          const dx = aim.sx - aim.x, dy = aim.sy - aim.y, len = Math.hypot(dx, dy);
          aim = null;
          if (len < 8) return;
          const p = Math.min(900, len * 5);
          ball.vx = (dx / len) * p; ball.vy = (dy / len) * p;
          strokes++; api.tone(250, 0.05, 'triangle', 0.1);
        },
        draw(ctx) {
          D.bg(ctx, '#1f4d2b');
          D.rect(ctx, X0, Y0, X1 - X0, Y1 - Y0, '#3fa14f', 16);
          for (let i = 0; i < 8; i++) D.rect(ctx, X0, Y0 + i * 66, X1 - X0, 33, 'rgba(255,255,255,.03)');
          for (const r of obs) D.rect(ctx, r.x, r.y, r.w, r.h, '#8b5a2b', 4);
          D.circle(ctx, hole.x, hole.y, HR, '#0e2414');
          D.line(ctx, hole.x, hole.y, hole.x, hole.y - 46, '#eee', 2);
          ctx.beginPath(); ctx.moveTo(hole.x, hole.y - 46); ctx.lineTo(hole.x + 22, hole.y - 39); ctx.lineTo(hole.x, hole.y - 32); ctx.fillStyle = '#ff5fa2'; ctx.fill();
          if (aim) {
            const dx = aim.sx - aim.x, dy = aim.sy - aim.y, len = Math.hypot(dx, dy) || 1;
            const p = Math.min(1, len * 5 / 900), L = 40 + p * 140;
            ctx.setLineDash([6, 8]);
            D.line(ctx, ball.x, ball.y, ball.x + (dx / len) * L, ball.y + (dy / len) * L, `hsl(${120 - p * 120} 90% 60%)`, 4);
            ctx.setLineDash([]);
          }
          if (sinking <= 0) D.circle(ctx, ball.x, ball.y, BR, '#fff');
          D.text(ctx, `Hole ${holes} · Strokes ${strokes}`, W / 2, 32, 17, 'rgba(255,255,255,.8)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Hole Rush
  register({
    id: 'hole-rush', name: 'Hole Rush', emoji: '🏌️', cat: 'Skill', guess: true,
    desc: 'Lock in the angle and power, allow for the wind, and land next to the flag.',
    how: [
      'Tap once to lock the angle, then tap again to lock the power.',
      'Check the wind before each shot. It pushes the ball sideways while it is in the air.',
      'Landing in the cup is +100, and landing close is up to +60.',
    ],
    create(api) {
      const GY = 500, TX = 40, G = 720;
      let r;
      const next = () => {
        r = { flag: U.rand(170, 370), wind: Math.round(U.rand(-10, 10)), stage: 'angle', t: 0, angle: 0, power: 0, ball: null, trail: [], wait: 0, msg: '' };
      };
      next();
      const tri = (t, period) => { const p = (t % period) / period; return p < 0.5 ? p * 2 : 2 - p * 2; };
      return {
        update(dt) {
          r.t += dt;
          if (r.stage === 'angle') r.angle = 15 + tri(r.t, 1.3) * 60;
          if (r.stage === 'power') r.power = tri(r.t, 1.1);
          if (r.stage === 'fly') {
            const b = r.ball;
            for (let i = 0; i < 3; i++) {
              const h = dt / 3;
              b.vx += r.wind * 14 * h; b.vy += G * h;
              b.x += b.vx * h; b.y += b.vy * h;
              if (b.y >= GY) {
                b.y = GY;
                const d = Math.abs(b.x - r.flag);
                let pts, msg;
                if (b.x > W + 10 || b.x < 0) { pts = 0; msg = 'Out of bounds'; }
                else if (d <= 9) { pts = 100; msg = 'In the cup!'; }
                else { pts = Math.max(0, Math.round(60 - d * 0.7)); msg = `${Math.round(d / 4)} m away`; }
                r.stage = 'done'; r.wait = 1.3; r.msg = msg; r.pts = pts;
                if (pts) api.add(pts, U.clamp(b.x, 40, W - 40), GY - 60); api.sfx(pts >= 100 ? 'great' : pts >= 30 ? 'good' : 'bad');
                break;
              }
            }
            r.trail.push({ x: b.x, y: b.y });
          }
          if (r.stage === 'done' && (r.wait -= dt) <= 0) next();
        },
        onTap() {
          if (r.stage === 'angle') { r.stage = 'power'; r.t = 0; api.sfx('tap'); }
          else if (r.stage === 'power') {
            const v = 160 + r.power * 400, a = r.angle * Math.PI / 180;
            r.ball = { x: TX, y: GY - 6, vx: v * Math.cos(a), vy: -v * Math.sin(a) };
            r.stage = 'fly'; api.tone(300, 0.08, 'triangle', 0.12);
          }
        },
        draw(ctx) {
          D.bg(ctx, '#8fd3ff', '#e6f6ff');
          D.rect(ctx, 0, GY, W, H - GY, '#4caf50');
          D.rect(ctx, 0, GY, W, 6, '#3d8f41');
          D.rect(ctx, r.flag - 10, GY - 1, 20, 5, '#1b3b1d', 2);
          D.line(ctx, r.flag, GY, r.flag, GY - 70, '#fff', 3);
          ctx.beginPath(); ctx.moveTo(r.flag, GY - 70); ctx.lineTo(r.flag + (r.wind >= 0 ? 26 : -26), GY - 62); ctx.lineTo(r.flag, GY - 54); ctx.fillStyle = '#ff5fa2'; ctx.fill();
          // wind
          D.rect(ctx, W / 2 - 80, 20, 160, 38, 'rgba(0,0,0,.25)', 12);
          D.text(ctx, r.wind === 0 ? 'No wind' : `${r.wind > 0 ? '→' : '←'} Wind ${Math.abs(r.wind)} km/h`, W / 2, 39, 17, '#fff');
          // golfer + aim
          D.rect(ctx, TX - 10, GY - 44, 12, 34, '#2b2140', 4); D.circle(ctx, TX - 4, GY - 52, 9, '#ffe1b0');
          if (r.stage === 'angle' || r.stage === 'power') {
            const a = r.angle * Math.PI / 180;
            D.line(ctx, TX, GY - 6, TX + Math.cos(a) * 70, GY - 6 - Math.sin(a) * 70, r.stage === 'angle' ? '#ffcc3d' : 'rgba(255,255,255,.7)', 4);
            D.text(ctx, `${Math.round(r.angle)}°`, TX + 90, GY - 80, 16, '#1d3557');
          }
          D.rect(ctx, 20, 90, 22, 200, 'rgba(0,0,0,.2)', 8);
          if (r.stage !== 'angle') { const p = r.stage === 'power' ? r.power : r.power; D.rect(ctx, 20, 90 + 200 * (1 - p), 22, 200 * p, `hsl(${120 - p * 120} 85% 50%)`, 8); }
          D.text(ctx, 'POWER', 31, 304, 11, '#1d3557');
          for (let i = 0; i < r.trail.length; i += 3) D.circle(ctx, r.trail[i].x, r.trail[i].y, 2, 'rgba(255,255,255,.8)');
          if (r.ball) D.circle(ctx, r.ball.x, r.ball.y, 6, '#fff');
          else D.circle(ctx, TX, GY - 6, 6, '#fff');
          const prompt = { angle: 'Tap to set angle', power: 'Tap to set power', fly: '', done: r.msg }[r.stage];
          D.text(ctx, prompt, W / 2, 545, 22, r.stage === 'done' ? (r.pts ? '#fff' : '#ffd6de') : '#fff');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Sword Balance
  register({
    id: 'sword-balance', name: 'Sword Balance', emoji: '🗡️', cat: 'Skill',
    desc: 'Keep the sword balanced on your fingertip for as long as you can.',
    how: [
      'The sword is balanced point-down on your finger.',
      'Drag left and right, or use the arrow keys, to move under it as it leans.',
      'Your score goes up every tenth of a second it stays up. Gusts of wind will knock it.',
    ],
    create(api) {
      const BY = 500, L = 190;
      let bx = W / 2, bv = 0, target = W / 2, th = U.rand(-0.04, 0.04), om = 0, gust = 1.5, gustShow = 0, gustDir = 0, fallen = false;
      return {
        update(dt) {
          if (api.keys.has('ArrowLeft')) target -= 520 * dt;
          if (api.keys.has('ArrowRight')) target += 520 * dt;
          target = U.clamp(target, 30, W - 30);
          const steps = 4;
          for (let s = 0; s < steps; s++) {
            const h = dt / steps;
            const a = 140 * (target - bx) - 22 * bv;
            bv += a * h; bx += bv * h;
            if (bx < 20 || bx > W - 20) { bx = U.clamp(bx, 20, W - 20); bv = 0; }
            const k = 3.4 + api.elapsed * 0.05;
            const alpha = k * Math.sin(th) - (a / L) * Math.cos(th);
            om += alpha * h; th += om * h;
          }
          gust -= dt;
          if (gust <= 0) { gust = U.rand(1.2, 2.6); gustDir = U.pick([-1, 1]); om += gustDir * U.rand(0.25, 0.45 + api.elapsed * 0.006); gustShow = 0.6; }
          if (gustShow > 0) gustShow -= dt;
          api.set(api.elapsed * 10);
          if (Math.abs(th) > 1.25 && !fallen) { fallen = true; api.sfx('bad'); api.end('The sword fell!'); }
        },
        onDown(x) { target = x; },
        onMove(x) { if (api.pointer.down) target = x; },
        draw(ctx) {
          D.bg(ctx, '#3d2a5c', '#160f24');
          if (gustShow > 0) D.text(ctx, gustDir > 0 ? '💨 →' : '← 💨', W / 2, 120, 30, `rgba(255,255,255,${gustShow / 0.6})`);
          ctx.save(); ctx.translate(bx, BY); ctx.rotate(th);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -18); ctx.lineTo(-7, -L + 40); ctx.lineTo(7, -L + 40); ctx.lineTo(7, -18); ctx.closePath();
          ctx.fillStyle = '#dfe6f0'; ctx.fill();
          D.line(ctx, 0, -10, 0, -L + 42, '#aab4c4', 2);
          D.rect(ctx, -26, -L + 32, 52, 10, '#c9a227', 4);
          D.rect(ctx, -5, -L, 10, 32, '#6b3b1f', 3);
          D.circle(ctx, 0, -L - 4, 8, '#c9a227');
          ctx.restore();
          // hand
          D.rect(ctx, bx - 9, BY, 18, 80, '#ffd6a8', 9);
          D.rect(ctx, bx - 26, BY + 46, 52, 70, '#ffd6a8', 18);
          const lean = Math.abs(th) / 1.25;
          D.rect(ctx, 60, 560, 280, 8, 'rgba(255,255,255,.1)', 4);
          D.rect(ctx, 200 + U.clamp(th / 1.25, -1, 1) * 140 - 6, 556, 12, 16, `hsl(${120 - lean * 120} 85% 55%)`, 4);
          D.text(ctx, (api.elapsed).toFixed(1) + 's', W / 2, 60, 30, 'rgba(255,255,255,.6)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Tilt Lab
  register({
    id: 'tilt-lab', name: 'Tilt Lab', emoji: '🧪', cat: 'Skill', guess: true,
    desc: 'Tilt to roll the ball around the holes and into the goal.',
    how: [
      'On a phone, tilt the device to roll the ball. Anywhere else, drag or use the arrow keys.',
      'Steer around the holes, because falling in sends you back to the start.',
      'Each goal is +1, and every new board has more holes.',
    ],
    create(api) {
      const X0 = 20, Y0 = 70, X1 = W - 20, Y1 = H - 20, BR = 12, HR = 17, GR = 22;
      let level = 0, ball, start, goal, holes, walls, tilt = { x: 0, y: 0 }, orient = null, base = null, drag = null, fall = 0;
      const build = () => {
        level++;
        const flip = Math.random() < 0.5;
        start = { x: flip ? X1 - 45 : X0 + 45, y: Y1 - 45 };
        goal = { x: flip ? U.rand(X0 + 40, W / 2) : U.rand(W / 2, X1 - 40), y: Y0 + 45 };
        walls = [];
        const nw = Math.min(2, Math.floor(level / 2));
        for (let i = 0; i < nw; i++) {
          const y = Y0 + 140 + i * 150 + U.rand(-20, 20);
          const left = Math.random() < 0.5;
          walls.push(left ? { x: X0, y, w: U.rand(180, 250), h: 14 } : { x: X1 - U.rand(180, 250), y, w: 0, h: 14 });
          const wl = walls[walls.length - 1]; if (!left) wl.w = X1 - wl.x;
        }
        holes = [];
        const n = Math.min(14, 3 + level * 2);
        for (let tries = 0; holes.length < n && tries < 400; tries++) {
          const h = { x: U.rand(X0 + HR, X1 - HR), y: U.rand(Y0 + HR, Y1 - HR) };
          if (U.dist(h.x, h.y, start.x, start.y) < 70 || U.dist(h.x, h.y, goal.x, goal.y) < 70) continue;
          if (holes.some((o) => U.dist(o.x, o.y, h.x, h.y) < HR * 2 + 34)) continue;
          if (walls.some((w) => h.x > w.x - HR - 20 && h.x < w.x + w.w + HR + 20 && h.y > w.y - HR - 20 && h.y < w.y + w.h + HR + 20)) continue;
          holes.push(h);
        }
        ball = { x: start.x, y: start.y, vx: 0, vy: 0 };
      };
      build();
      const onOrient = (e) => {
        if (e.gamma == null) return;
        if (!base) base = { g: e.gamma, b: e.beta };
        orient = { x: U.clamp((e.gamma - base.g) / 22, -1, 1), y: U.clamp((e.beta - base.b) / 22, -1, 1) };
      };
      const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      if (coarse && window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => {});
        } else addEventListener('deviceorientation', onOrient);
      }
      return {
        update(dt) {
          if (fall > 0) { fall -= dt; if (fall <= 0) ball = { x: start.x, y: start.y, vx: 0, vy: 0 }; return; }
          let tx = 0, ty = 0;
          if (api.keys.has('ArrowLeft')) tx -= 1; if (api.keys.has('ArrowRight')) tx += 1;
          if (api.keys.has('ArrowUp')) ty -= 1; if (api.keys.has('ArrowDown')) ty += 1;
          if (drag && api.pointer.down) { tx = U.clamp((api.pointer.x - drag.x) / 70, -1, 1); ty = U.clamp((api.pointer.y - drag.y) / 70, -1, 1); }
          else if (!tx && !ty && orient) { tx = orient.x; ty = orient.y; }
          tilt = { x: tx, y: ty };
          ball.vx += tx * 950 * dt; ball.vy += ty * 950 * dt;
          ball.vx *= Math.exp(-0.9 * dt); ball.vy *= Math.exp(-0.9 * dt);
          for (let s = 0; s < 3; s++) {
            ball.x += ball.vx * dt / 3; ball.y += ball.vy * dt / 3;
            if (ball.x < X0 + BR) { ball.x = X0 + BR; ball.vx = Math.abs(ball.vx) * 0.4; }
            if (ball.x > X1 - BR) { ball.x = X1 - BR; ball.vx = -Math.abs(ball.vx) * 0.4; }
            if (ball.y < Y0 + BR) { ball.y = Y0 + BR; ball.vy = Math.abs(ball.vy) * 0.4; }
            if (ball.y > Y1 - BR) { ball.y = Y1 - BR; ball.vy = -Math.abs(ball.vy) * 0.4; }
            for (const w of walls) U.bounceRect(ball, BR, w.x, w.y, w.w, w.h, 0.4);
          }
          if (holes.some((h) => U.dist(ball.x, ball.y, h.x, h.y) < HR - 3)) { fall = 0.5; api.sfx('bad'); return; }
          if (U.dist(ball.x, ball.y, goal.x, goal.y) < GR - 4) { api.add(1, goal.x, goal.y - 30); api.sfx('good'); build(); }
        },
        onDown(x, y) { drag = { x, y }; },
        onUp() { drag = null; },
        destroy() { removeEventListener('deviceorientation', onOrient); },
        draw(ctx) {
          D.bg(ctx, '#20304a', '#0f1726');
          D.rect(ctx, X0, Y0, X1 - X0, Y1 - Y0, '#c9a87a', 12);
          for (let i = 0; i < 12; i++) D.rect(ctx, X0, Y0 + i * 44, X1 - X0, 2, 'rgba(0,0,0,.06)');
          for (const w of walls) D.rect(ctx, w.x, w.y, w.w, w.h, '#6b4a2b', 4);
          for (const h of holes) { D.circle(ctx, h.x, h.y, HR, '#1b1206'); D.ring(ctx, h.x, h.y, HR, 'rgba(0,0,0,.35)', 3); }
          D.circle(ctx, goal.x, goal.y, GR, '#5cf2a5'); D.ring(ctx, goal.x, goal.y, GR, '#1f9d63', 4);
          D.text(ctx, '★', goal.x, goal.y + 1, 20, '#0d5a35');
          D.circle(ctx, start.x, start.y, 16, 'rgba(255,255,255,.18)');
          const s = fall > 0 ? fall / 0.5 : 1;
          D.circle(ctx, ball.x + 3, ball.y + 4, BR * s, 'rgba(0,0,0,.25)');
          D.circle(ctx, ball.x, ball.y, BR * s, '#e8eef7');
          D.circle(ctx, ball.x - 4, ball.y - 4, 4 * s, '#fff');
          D.text(ctx, `Board ${level}`, 22, 40, 17, 'rgba(255,255,255,.75)', 'left');
          // tilt indicator
          D.ring(ctx, W - 50, 40, 20, 'rgba(255,255,255,.3)', 2);
          D.circle(ctx, W - 50 + tilt.x * 14, 40 + tilt.y * 14, 6, '#ffcc3d');
          if (drag && api.pointer.down) { D.ring(ctx, drag.x, drag.y, 70, 'rgba(255,255,255,.15)', 2); D.line(ctx, drag.x, drag.y, api.pointer.x, api.pointer.y, 'rgba(255,255,255,.4)', 3); }
        },
      };
    },
  });
})();
