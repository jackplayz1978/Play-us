// Timing games: tap at exactly the right moment.
(() => {
  const { register, W, H, U, D } = PU;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ Time's Up
  register({
    id: 'times-up', name: "Time's Up", emoji: '⏱️', cat: 'Timing',
    desc: 'A bar fills and vanishes halfway. Tap when it would hit the line.',
    how: [
      'A bar fills toward the finish line, then turns invisible partway.',
      'Keep its speed in your head and tap when it would hit the line.',
      'Perfect = 10 · Great = 7 · Good = 4 · OK = 1.',
    ],
    create(api) {
      let r;
      const next = () => {
        const dur = U.rand(1.4, 3.0);
        r = { dur, t: -0.5, hideAt: dur * U.rand(0.3, 0.55), done: false, wait: 0, res: null };
      };
      next();
      const judge = () => {
        const ms = Math.round(Math.abs(r.t - r.dur) * 1000);
        const tiers = [[35, 10, 'Perfect!'], [90, 7, 'Great'], [170, 4, 'Good'], [300, 1, 'OK']];
        const hit = tiers.find((x) => ms <= x[0]) || [0, 0, 'Miss'];
        r.done = true; r.wait = 1.2;
        r.res = { ms, early: r.t < r.dur, pts: hit[1], label: hit[2], fill: U.clamp(r.t / r.dur, 0, 1.15) };
        if (hit[1]) api.add(hit[1], W / 2, 210);
        api.sfx(hit[1] >= 7 ? 'great' : hit[1] ? 'good' : 'bad');
      };
      return {
        update(dt) {
          if (!r.done) { r.t += dt; if (r.t > r.dur + 0.5) judge(); }
          else if ((r.wait -= dt) <= 0) next();
        },
        onTap() { if (!r.done && r.t > 0) judge(); },
        draw(ctx) {
          D.bg(ctx, '#1d1b4a', '#0d0b24');
          const x = 40, y = 290, w = 320, h = 44;
          D.rect(ctx, x, y, w, h, 'rgba(255,255,255,.08)', 12);
          D.line(ctx, x + w, y - 24, x + w, y + h + 24, '#ffcc3d', 4);
          D.text(ctx, 'FINISH', x + w, y - 38, 13, '#ffcc3d');
          const p = U.clamp(r.t / r.dur, 0, 1);
          if (r.t < 0) D.text(ctx, 'Get ready…', W / 2, y + h + 70, 22, '#a9a3d1');
          else if (!r.done && r.t < r.hideAt) D.rect(ctx, x, y, Math.max(12, w * p), h, '#5cf2a5', 12);
          else if (!r.done) {
            D.rect(ctx, x, y, w * (r.hideAt / r.dur), h, 'rgba(92,242,165,.18)', 12);
            D.text(ctx, '?', W / 2, y + h / 2, 30, '#fff');
            D.text(ctx, 'Tap when it reaches the line', W / 2, y + h + 70, 20, '#a9a3d1');
          } else {
            const f = Math.min(1, r.res.fill);
            D.rect(ctx, x, y, Math.max(12, w * f), h, r.res.pts ? '#5cf2a5' : '#ff6b8a', 12);
            D.text(ctx, r.res.label, W / 2, y + h + 60, 34, r.res.pts ? '#5cf2a5' : '#ff6b8a');
            D.text(ctx, `${r.res.ms} ms ${r.res.early ? 'early' : 'late'}`, W / 2, y + h + 100, 20, '#a9a3d1');
          }
          D.text(ctx, 'Tap anywhere', W / 2, 560, 16, 'rgba(255,255,255,.35)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Tower Stack
  register({
    id: 'tower-stack', name: 'Tower Stack', emoji: '🏗️', cat: 'Timing',
    desc: 'Drop sliding blocks to build the tallest tower you can.',
    how: [
      'A block slides back and forth above your tower.',
      'Tap to drop it. Any part that overhangs gets cut off.',
      'Land it exactly on top for a Perfect bonus. If you miss the tower completely, the game ends.',
    ],
    create(api) {
      const BH = 30, BASE = H - 70;
      const blocks = [{ x: 100, w: 200, lvl: 0 }];
      const falling = [];
      let cur, dir = 1, speed, cam = 0, perfectRun = 0;
      const lvlY = (l) => BASE - l * BH;
      const color = (l) => `hsl(${(200 + l * 9) % 360} 80% 62%)`;
      const spawn = () => {
        const top = blocks[blocks.length - 1];
        speed = Math.min(420, 170 + blocks.length * 9);
        dir = Math.random() < 0.5 ? 1 : -1;
        cur = { x: dir > 0 ? -top.w * 0.6 : W - top.w * 0.4, w: top.w, lvl: blocks.length };
      };
      spawn();
      return {
        update(dt) {
          if (cur) {
            cur.x += dir * speed * dt;
            if (cur.x > W - cur.w * 0.35) dir = -1;
            if (cur.x < -cur.w * 0.65) dir = 1;
          }
          cam = U.lerp(cam, Math.max(0, (blocks.length - 11) * BH), Math.min(1, dt * 6));
          for (const f of falling) { f.vy += 1500 * dt; f.y += f.vy * dt; f.x += f.vx * dt; }
        },
        onTap() {
          if (!cur) return;
          const top = blocks[blocks.length - 1];
          let l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w);
          if (r - l <= 0) {
            falling.push({ ...cur, y: lvlY(cur.lvl), vy: 0, vx: dir * 60 });
            cur = null; api.sfx('bad'); api.end('Missed the tower!');
            return;
          }
          if (Math.abs(cur.x - top.x) <= 5) {
            l = top.x; r = top.x + top.w; perfectRun++;
            const bonus = perfectRun >= 3 ? 2 : 1;
            api.add(bonus, W / 2, lvlY(cur.lvl) + cam - 30, 'Perfect!');
            api.sfx('great');
          } else {
            perfectRun = 0;
            const cutX = cur.x < top.x ? cur.x : r;
            falling.push({ x: cutX, w: cur.w - (r - l), lvl: cur.lvl, y: lvlY(cur.lvl), vy: 0, vx: cur.x < top.x ? -60 : 60 });
            api.sfx('tap');
          }
          blocks.push({ x: l, w: r - l, lvl: cur.lvl });
          api.add(1);
          spawn();
        },
        draw(ctx) {
          D.bg(ctx, '#2a1f6b', '#0f0c26');
          D.rect(ctx, 0, BASE + BH + cam, W, H, '#16123a');
          for (const b of blocks) {
            const y = lvlY(b.lvl) + cam;
            if (y > H || y < -BH) continue;
            D.rect(ctx, b.x, y, b.w, BH - 2, color(b.lvl), 4);
          }
          for (const f of falling) D.rect(ctx, f.x, f.y + cam, f.w, BH - 2, color(f.lvl), 4);
          if (cur) D.rect(ctx, cur.x, lvlY(cur.lvl) + cam, cur.w, BH - 2, color(cur.lvl), 4);
          D.text(ctx, String(blocks.length - 1), W / 2, 60, 56, 'rgba(255,255,255,.25)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Knife Throw
  register({
    id: 'knife-throw', name: 'Knife Throw', emoji: '🔪', cat: 'Timing',
    desc: 'Throw knives into the spinning log without hitting the others.',
    how: [
      'Tap to throw a knife into the spinning log.',
      'If it hits a knife that is already stuck there, you lose.',
      'Use up all your knives to break the log. Each new log spins in a trickier way.',
    ],
    create(api) {
      const LX = W / 2, LY = 200, LR = 72, KNIFE_Y = H - 90;
      let angle = 0, t = 0, level = 0, log, flying = null, bounce = null, breakT = 0;
      const newLog = () => {
        level++;
        const pre = [];
        const nPre = level === 1 ? 0 : Math.min(4, U.randi(1, 1 + Math.floor(level / 2)));
        for (let i = 0; i < nPre; i++) pre.push(U.rand(0, TAU));
        log = {
          stuck: pre, need: Math.min(10, 5 + level),
          base: U.rand(1.6, 2.4) + level * 0.18,
          dir: Math.random() < 0.5 ? 1 : -1,
          wobble: level >= 3 ? U.rand(0.5, 1.3) : 0,
          wfreq: U.rand(0.6, 1.4),
          thrown: 0,
        };
      };
      newLog();
      const angDiff = (a, b) => { const d = ((a - b) % TAU + TAU) % TAU; return Math.min(d, TAU - d); };
      return {
        update(dt) {
          t += dt;
          if (breakT > 0) { breakT -= dt; if (breakT <= 0) newLog(); return; }
          const speed = log.base * (1 + log.wobble * Math.sin(t * log.wfreq * TAU));
          angle += log.dir * speed * dt;
          if (bounce) { bounce.y += bounce.vy * dt; bounce.vy += 2000 * dt; bounce.r += 12 * dt; }
          if (flying) {
            flying.y -= 1700 * dt;
            if (flying.y <= LY + LR) {
              const local = Math.PI / 2 - angle;
              const clash = log.stuck.some((s) => angDiff(s, local) < 0.2);
              if (clash) {
                bounce = { y: LY + LR, vy: 300, r: 0 };
                flying = null; api.sfx('bad'); api.end('Hit another knife!');
                return;
              }
              log.stuck.push(local); log.thrown++;
              flying = null; api.add(1); api.sfx('tap');
              if (log.thrown >= log.need) { breakT = 0.6; api.add(2, LX, LY - 110, 'Log broken! +2'); api.sfx('great'); }
            }
          }
        },
        onTap() { if (!flying && breakT <= 0 && !api.over) flying = { y: KNIFE_Y }; },
        draw(ctx) {
          D.bg(ctx, '#2b1d4f', '#120c24');
          const knife = (len) => {
            D.rect(ctx, -4, 0, 8, 34, '#dfe6f0', 2);         // blade
            D.rect(ctx, -6, 32, 12, 4, '#9aa3b3');           // guard
            D.rect(ctx, -5, 36, 10, len - 36, '#7a4a2a', 3); // handle
          };
          ctx.save(); ctx.translate(LX, LY);
          if (breakT > 0) ctx.globalAlpha = breakT / 0.6;
          for (const s of log.stuck) {
            ctx.save(); ctx.rotate(s + angle - Math.PI / 2); ctx.translate(0, LR - 18); knife(64); ctx.restore();
          }
          ctx.rotate(angle);
          D.circle(ctx, 0, 0, LR, '#b9783f');
          D.ring(ctx, 0, 0, LR - 14, '#9a5f2e', 4);
          D.ring(ctx, 0, 0, LR - 34, '#9a5f2e', 3);
          D.circle(ctx, 0, 0, 10, '#8a522a');
          D.line(ctx, 0, 0, LR - 6, 0, '#a46633', 3);
          ctx.restore(); ctx.globalAlpha = 1;
          if (bounce) { ctx.save(); ctx.translate(LX, bounce.y); ctx.rotate(bounce.r); knife(64); ctx.restore(); }
          if (flying) { ctx.save(); ctx.translate(LX, flying.y); knife(64); ctx.restore(); }
          else if (breakT <= 0 && !api.over) { ctx.save(); ctx.translate(LX, KNIFE_Y); knife(64); ctx.restore(); }
          const left = log.need - log.thrown;
          for (let i = 0; i < log.need; i++) D.rect(ctx, 22, H - 40 - i * 22, 8, 16, i < left ? '#dfe6f0' : 'rgba(255,255,255,.15)', 2);
          D.text(ctx, `Log ${level}`, W - 20, 30, 18, '#a9a3d1', 'right');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Rope Jump
  register({
    id: 'rope-jump', name: 'Rope Jump', emoji: '🪢', cat: 'Timing',
    desc: 'Jump the rope as it swings faster and changes speed.',
    how: [
      'Tap to jump just before the rope reaches your feet.',
      'The rope speeds up and slows down without warning. Watch the shrinking circle at your feet.',
      'If the rope catches you, the game ends.',
    ],
    create(api) {
      const GY = 470, PX = W / 2, HX1 = 55, HX2 = W - 55, HY = 360, A = 112, G = 2600;
      let phase = Math.PI, omega = TAU / 1.5, target = omega, py = 0, vy = 0, passes = 0;
      return {
        update(dt) {
          omega = U.lerp(omega, target, Math.min(1, dt * 3));
          const before = Math.floor(phase / TAU);
          phase += omega * dt;
          if (py < 0 || vy < 0) { vy += G * dt; py += vy * dt; if (py >= 0) { py = 0; vy = 0; } }
          if (Math.floor(phase / TAU) > before) {
            if (py < -10) {
              passes++; api.add(1); api.sfx('tap');
              const period = Math.max(0.62, 1.45 - passes * 0.025) * U.rand(0.8, 1.25);
              target = TAU / Math.max(0.62, period);
            } else {
              api.sfx('bad'); api.end('Tripped on the rope!');
            }
          }
        },
        onTap() { if (py === 0 && vy === 0) { vy = -Math.sqrt(2 * G * 72); py = -0.01; } },
        draw(ctx) {
          D.bg(ctx, '#1a3a5c', '#0c1a2c');
          D.rect(ctx, 0, GY + 6, W, H, '#14283f');
          const front = Math.sin(phase) > 0;
          const ropeY = HY + A * Math.cos(phase);
          const rope = () => {
            ctx.beginPath(); ctx.moveTo(HX1, HY);
            ctx.quadraticCurveTo(PX, 2 * ropeY - HY, HX2, HY);
            ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 5; ctx.stroke();
          };
          if (!front) rope();
          // timing ring: shrinks to nothing as the rope reaches the feet
          const toFeet = ((TAU - (phase % TAU)) % TAU) / omega;
          if (toFeet < 0.6) D.ring(ctx, PX, GY + 6, 8 + toFeet * 90, 'rgba(255,204,61,.7)', 3);
          // jumper
          const y = GY + py;
          D.circle(ctx, PX, GY + 8, 18 * (1 + py / 300), 'rgba(0,0,0,.3)');
          D.rect(ctx, PX - 14, y - 52, 28, 46, '#ffcc3d', 10);
          D.circle(ctx, PX, y - 66, 15, '#ffe1b0');
          D.rect(ctx, PX - 12, y - 8, 9, 10, '#333', 3); D.rect(ctx, PX + 3, y - 8, 9, 10, '#333', 3);
          if (front) rope();
          // holders
          for (const hx of [HX1, HX2]) { D.circle(ctx, hx, HY, 10, '#fff'); D.rect(ctx, hx - 4, HY, 8, GY - HY, 'rgba(255,255,255,.25)'); }
          D.text(ctx, String(passes), W / 2, 90, 64, 'rgba(255,255,255,.25)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Park It
  register({
    id: 'park-it', name: 'Park It', emoji: '🅿️', cat: 'Timing', guess: true,
    desc: 'Hit the brakes so the car stops right inside the parking spot.',
    how: [
      'The car drives toward the parking spot. Tap to brake.',
      "It won't stop straight away, so brake early. Check how strong the brakes are each round.",
      'Perfect stop = 10 · Good = 5 · OK = 2. If you miss the spot you lose a life, and you have 3.',
    ],
    create(api) {
      const CL = 60, CW = 34, X = W / 2;
      let r, lives = 3;
      const BRAKES = [['Strong', 980], ['Normal', 760], ['Weak', 560]];
      const next = () => {
        const b = U.pick(BRAKES);
        r = {
          y: H + 40, v: U.rand(300, 430) + Math.min(80, api.score * 1.5), braking: false,
          decel: b[1], brakeName: b[0], spot: U.rand(130, 290), spotH: 74, done: false, wait: 0, msg: '',
        };
      };
      next();
      const judge = () => {
        const d = Math.abs(r.y - r.spot);
        const slack = (r.spotH - CL) / 2;
        let pts = 0, msg = 'Missed!';
        if (d <= slack) { pts = 10; msg = 'Perfect!'; }
        else if (d <= slack + 14) { pts = 5; msg = 'Good'; }
        else if (d <= slack + 28) { pts = 2; msg = 'OK'; }
        r.done = true; r.wait = 1.1; r.msg = msg; r.pts = pts;
        if (pts) { api.add(pts, X, r.spot - 70); api.sfx(pts === 10 ? 'great' : 'good'); }
        else { lives--; api.sfx('bad'); if (lives <= 0) api.end('Out of cars!'); }
      };
      return {
        update(dt) {
          if (r.done) { if ((r.wait -= dt) <= 0) next(); return; }
          if (r.braking) r.v = Math.max(0, r.v - r.decel * dt);
          r.y -= r.v * dt;
          if (r.braking && r.v === 0) judge();
          else if (r.y < -CL) judge();
        },
        onTap() { if (!r.done && !r.braking && r.y < H) { r.braking = true; api.sfx('tap'); } },
        draw(ctx) {
          D.bg(ctx, '#3a3d4a', '#2a2c36');
          for (let i = 0; i < 6; i++) { D.rect(ctx, 40, 60 + i * 90, 6, 60, 'rgba(255,255,255,.2)'); D.rect(ctx, W - 46, 60 + i * 90, 6, 60, 'rgba(255,255,255,.2)'); }
          const sy = r.spot - r.spotH / 2;
          ctx.strokeStyle = r.done ? (r.pts ? '#5cf2a5' : '#ff6b8a') : '#fff';
          ctx.lineWidth = 4; ctx.strokeRect(X - 32, sy, 64, r.spotH);
          D.text(ctx, 'P', X + 60, r.spot, 26, 'rgba(255,255,255,.6)');
          // car
          const y = r.y - CL / 2;
          D.rect(ctx, X - CW / 2, y, CW, CL, '#ff5fa2', 8);
          D.rect(ctx, X - CW / 2 + 5, y + 10, CW - 10, 14, '#2b2140', 4);
          D.rect(ctx, X - CW / 2 + 5, y + 38, CW - 10, 10, '#2b2140', 3);
          D.rect(ctx, X - CW / 2 + 3, y + 2, 7, 4, '#fff6b0'); D.rect(ctx, X + CW / 2 - 10, y + 2, 7, 4, '#fff6b0');
          if (r.braking) { D.rect(ctx, X - CW / 2 + 2, y + CL - 5, 9, 5, '#ff2a2a'); D.rect(ctx, X + CW / 2 - 11, y + CL - 5, 9, 5, '#ff2a2a'); }
          D.lives(ctx, lives);
          D.text(ctx, `Brakes: ${r.brakeName}`, W - 16, 26, 16, '#ffcc3d', 'right');
          if (r.done) D.text(ctx, r.msg, X, 440, 36, r.pts ? '#5cf2a5' : '#ff6b8a');
          else if (!r.braking) D.text(ctx, 'Tap to brake', X, 560, 16, 'rgba(255,255,255,.4)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Dice Roll
  register({
    id: 'dice-roll', name: 'Dice Roll', emoji: '🎲', cat: 'Timing', guess: true,
    desc: 'Stop the spinning dice so they add up to the target.',
    how: [
      'Each die counts 1 → 6 over and over. Tap to stop it.',
      'Stop both dice so they add up to the target number.',
      'Each hit scores +1 and makes the dice spin faster.',
    ],
    create(api) {
      let r;
      const next = () => {
        r = { target: U.randi(3, 11), dice: [U.randi(1, 6), U.randi(1, 6)], stopped: 0, acc: 0, done: false, wait: 0, ok: false };
      };
      next();
      const interval = () => Math.max(0.075, 0.2 - api.score * 0.008);
      const face = (ctx, x, y, n, active) => {
        D.rect(ctx, x - 55, y - 55, 110, 110, active ? '#fff' : '#e5e2f5', 20);
        const p = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
          5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
        for (const [dx, dy] of p) D.circle(ctx, x + dx * 28, y + dy * 28, 10, '#1d1640');
      };
      return {
        update(dt) {
          if (r.done) { if ((r.wait -= dt) <= 0) next(); return; }
          r.acc += dt;
          if (r.acc >= interval()) {
            r.acc = 0;
            const i = r.stopped;
            r.dice[i] = r.dice[i] % 6 + 1;
          }
        },
        onTap() {
          if (r.done) return;
          r.stopped++; r.acc = 0; api.sfx('tap');
          if (r.stopped === 1) {
            if (r.target - r.dice[0] < 1 || r.target - r.dice[0] > 6) { r.done = true; r.ok = false; r.wait = 1; r.msg = 'Impossible now!'; api.sfx('bad'); }
          } else {
            r.done = true; r.wait = 0.9; r.ok = r.dice[0] + r.dice[1] === r.target;
            r.msg = r.ok ? 'Hit!' : `Made ${r.dice[0] + r.dice[1]}`;
            if (r.ok) { api.add(1, W / 2, 420); api.sfx('good'); } else api.sfx('bad');
          }
        },
        draw(ctx) {
          D.bg(ctx, '#0f4d3a', '#08261d');
          D.text(ctx, 'TARGET', W / 2, 110, 18, '#a7f3d0');
          D.text(ctx, String(r.target), W / 2, 165, 80, '#fff');
          face(ctx, 125, 320, r.dice[0], r.stopped === 0);
          face(ctx, 275, 320, r.dice[1], r.stopped === 1);
          if (r.stopped >= 1) D.text(ctx, '✓', 125, 400, 26, '#5cf2a5');
          if (r.stopped >= 2) D.text(ctx, '✓', 275, 400, 26, '#5cf2a5');
          if (r.done) D.text(ctx, r.msg, W / 2, 470, 34, r.ok ? '#5cf2a5' : '#ff6b8a');
          else D.text(ctx, r.stopped === 0 ? 'Tap to stop die 1' : `Need a ${r.target - r.dice[0]}`, W / 2, 470, 22, 'rgba(255,255,255,.7)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Rhythm
  register({
    id: 'rhythm', name: 'Rhythm', emoji: '🥁', cat: 'Timing',
    desc: 'Tap each circle on the beat, just as the ring closes in.',
    how: [
      'Circles appear on the beat with a ring closing in on them.',
      'Tap the circle just as the ring touches its edge.',
      'Perfect = 3 · Good = 1. The tempo speeds up as you go.',
    ],
    create(api) {
      const R = 36;
      let t = 0, bpm = 92, nextBeat = 1.6, beats = 0, notes = [], combo = 0, lastPos = { x: W / 2, y: H / 2 };
      const spb = () => 60 / bpm;
      const approach = () => spb() * 2;
      return {
        update(dt) {
          t += dt;
          while (nextBeat - approach() <= t) {
            beats++;
            if (beats % 8 === 0) bpm = Math.min(150, bpm + 5);
            if (Math.random() > 0.15 || beats < 3) {
              let x, y, tries = 0;
              do { x = U.rand(60, W - 60); y = U.rand(110, H - 70); tries++; } while (U.dist(x, y, lastPos.x, lastPos.y) < 110 && tries < 20);
              lastPos = { x, y };
              notes.push({ x, y, at: nextBeat, state: 'live' });
            }
            nextBeat += spb();
          }
          for (const n of notes) {
            if (n.state === 'live' && t > n.at + 0.16) { n.state = 'miss'; n.fade = 0.4; combo = 0; api.float('Miss', n.x, n.y, '#ff6b8a', 20); }
            if (n.state !== 'live') n.fade -= dt;
          }
          notes = notes.filter((n) => n.state === 'live' || n.fade > 0);
        },
        onDown(x, y) {
          const n = notes.filter((k) => k.state === 'live' && U.dist(x, y, k.x, k.y) < R + 16).sort((a, b) => a.at - b.at)[0];
          if (!n) return;
          const e = Math.abs(t - n.at);
          if (e <= 0.06) { combo++; api.add(3, n.x, n.y - 50, 'Perfect +3'); api.tone(880, 0.08, 'triangle'); n.state = 'hit'; }
          else if (e <= 0.13) { combo++; api.add(1, n.x, n.y - 50, 'Good +1'); api.tone(660, 0.08, 'triangle'); n.state = 'hit'; }
          else { combo = 0; api.float(t < n.at ? 'Too early' : 'Too late', n.x, n.y - 50, '#ff6b8a', 18); api.sfx('bad'); n.state = 'miss'; }
          n.fade = 0.3;
        },
        draw(ctx) {
          D.bg(ctx, '#3b0f4a', '#140520');
          const beatPhase = ((t - (nextBeat - spb())) / spb());
          D.circle(ctx, W / 2, H / 2, 160 + 10 * Math.max(0, 1 - beatPhase * 3), 'rgba(255,95,162,.06)');
          for (const n of notes) {
            const a = n.state === 'live' ? 1 : Math.max(0, n.fade / 0.4);
            ctx.globalAlpha = a;
            const col = n.state === 'hit' ? '#5cf2a5' : n.state === 'miss' ? '#ff6b8a' : '#ff5fa2';
            D.circle(ctx, n.x, n.y, R, col);
            D.ring(ctx, n.x, n.y, R, '#fff', 4);
            if (n.state === 'live') {
              const k = (n.at - t) / approach();
              D.ring(ctx, n.x, n.y, R + Math.max(0, k) * 110, 'rgba(255,255,255,.85)', 3);
            }
          }
          ctx.globalAlpha = 1;
          D.text(ctx, `${bpm} BPM`, W - 16, 26, 16, '#a9a3d1', 'right');
          if (combo >= 3) D.text(ctx, `${combo} combo`, 16, 26, 16, '#ffcc3d', 'left');
        },
      };
    },
  });
})();
