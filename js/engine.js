// Shared game engine: home screen, game loop, input, HUD, scores.
// Every game is a plain object passed to PU.register(); see js/games/*.js.
(() => {
  'use strict';

  const W = 400, H = 600;
  const FONT = '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif';
  const games = [];
  const CATS = ['All', 'Timing', 'Reflex', 'Brain', 'Arcade', 'Skill'];

  // ---------- storage (best effort: private mode may block it) ----------
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('playus-practice:' + k); return v == null ? d : JSON.parse(v); }
      catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('playus-practice:' + k, JSON.stringify(v)); } catch { /* ignore */ }
    },
  };

  // ---------- math helpers ----------
  const U = {
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (a) => a[Math.floor(Math.random() * a.length)],
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    distToSeg(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
      let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(x1 + t * dx - px, y1 + t * dy - py);
    },
    // Push a moving circle out of an axis-aligned rect and bounce it. Returns true on contact.
    bounceRect(b, r, rx, ry, rw, rh, restitution = 0.8) {
      const nx = U.clamp(b.x, rx, rx + rw), ny = U.clamp(b.y, ry, ry + rh);
      let dx = b.x - nx, dy = b.y - ny;
      const d = Math.hypot(dx, dy);
      if (d >= r) return false;
      if (d === 0) { // centre inside the rect: push out along the shallowest side
        const pen = [b.x - rx, rx + rw - b.x, b.y - ry, ry + rh - b.y];
        const m = pen.indexOf(Math.min(...pen));
        dx = [-1, 1, 0, 0][m]; dy = [0, 0, -1, 1][m];
        b.x = [rx - r, rx + rw + r, b.x, b.x][m];
        b.y = [b.y, b.y, ry - r, ry + rh + r][m];
      } else {
        dx /= d; dy /= d;
        b.x = nx + dx * r; b.y = ny + dy * r;
      }
      const vn = b.vx * dx + b.vy * dy;
      if (vn < 0) { b.vx -= (1 + restitution) * vn * dx; b.vy -= (1 + restitution) * vn * dy; }
      return true;
    },
  };

  // ---------- drawing helpers ----------
  const D = {
    FONT,
    bg(ctx, top, bottom) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, top); g.addColorStop(1, bottom || top);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    text(ctx, s, x, y, size = 24, color = '#fff', align = 'center', weight = 900) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.fillText(s, x, y);
    },
    circle(ctx, x, y, r, color) {
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    },
    ring(ctx, x, y, r, color, w = 3) {
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    },
    rect(ctx, x, y, w, h, color, r = 0) {
      ctx.fillStyle = color;
      if (r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); } else ctx.fillRect(x, y, w, h);
    },
    line(ctx, x1, y1, x2, y2, color, w = 2) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
    },
    emoji(ctx, e, x, y, size) {
      ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y);
    },
    // Lives as hearts in the top-left corner.
    lives(ctx, n, max = 3) {
      for (let i = 0; i < max; i++) D.text(ctx, i < n ? '♥' : '♡', 22 + i * 24, 26, 24, i < n ? '#ff6b8a' : 'rgba(255,255,255,.3)');
    },
  };

  // ---------- sound ----------
  let actx = null;
  let muted = store.get('muted', false);
  function tone(freq, dur = 0.08, type = 'sine', vol = 0.12) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* audio unavailable */ }
  }
  const SFX = {
    tap: () => tone(520, 0.05, 'triangle', 0.08),
    good: () => { tone(660, 0.07, 'triangle'); setTimeout(() => tone(990, 0.09, 'triangle'), 60); },
    great: () => { tone(660, 0.06, 'triangle'); setTimeout(() => tone(880, 0.06, 'triangle'), 50); setTimeout(() => tone(1320, 0.1, 'triangle'), 100); },
    bad: () => tone(160, 0.22, 'sawtooth', 0.08),
    tick: () => tone(1200, 0.025, 'square', 0.03),
    end: () => { tone(440, 0.12, 'triangle'); setTimeout(() => tone(330, 0.12, 'triangle'), 110); setTimeout(() => tone(262, 0.25, 'triangle'), 220); },
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  let els;
  let stageW = W, stageH = H, dpr = 1;
  let ctx;

  function resize() {
    if (!els) return;
    const bar = els.play.querySelector('.playbar');
    const availH = window.innerHeight - (bar ? bar.offsetHeight : 60) - 90;
    const availW = Math.min(window.innerWidth - 32, 528);
    stageW = Math.max(240, Math.min(availW, availH * W / H));
    stageH = stageW * H / W;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    els.stage.style.width = stageW + 'px';
    els.stage.style.height = stageH + 'px';
    els.stage.style.setProperty('--s', (stageW / W).toFixed(4));
    els.cv.width = Math.round(stageW * dpr);
    els.cv.height = Math.round(stageH * dpr);
    if (!run) drawIdle();
  }

  // ---------- run state ----------
  let current = null; // the selected game definition
  let run = null;     // the round in progress (or just finished)
  let raf = 0, last = 0;
  let floats = [];
  const keys = new Set();
  const pointer = { x: W / 2, y: H / 2, down: false, sx: 0, sy: 0, st: 0 };

  function bestOf(id) { return store.get('best:' + id, null); }
  function playsOf(id) { return store.get('plays:' + id, 0); }

  function makeApi(r) {
    const api = {
      W, H, U, D,
      ui: els.ui,
      pointer, keys,
      get score() { return r.score; },
      get over() { return r.over; },
      get time() { return r.time; },
      get elapsed() { return r.elapsed; },
      add(n = 1, x, y, label) {
        if (r.over) return;
        r.score = Math.max(0, r.score + n);
        hud();
        if (x != null) float(label || (n >= 0 ? '+' + n : String(n)), x, y, n >= 0 ? '#5cf2a5' : '#ff6b8a');
      },
      set(n) { if (r.over) return; r.score = Math.max(0, Math.floor(n)); hud(); },
      float,
      sfx(name) { (SFX[name] || SFX.tap)(); },
      tone,
      end(reason) { finish(reason); },
      keypad(container, onKey) {
        const keysList = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
        container.classList.add('kp');
        container.innerHTML = keysList.map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('');
        container.addEventListener('pointerdown', (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          e.preventDefault();
          onKey(b.dataset.k);
        });
        return container;
      },
    };
    return api;
  }

  function float(text, x, y, color = '#fff', size = 26) {
    floats.push({ text, x, y, color, size, t: 0 });
  }

  function hud() {
    if (!run) { els.hudScore.textContent = '0'; return; }
    els.hudScore.textContent = run.score;
    const timed = run.def.duration !== 0;
    els.hudTimeLabel.textContent = timed ? 'Time' : 'Time';
    const t = timed ? Math.ceil(run.time) : Math.floor(run.elapsed);
    els.hudTime.textContent = t;
    els.hudTime.parentElement.classList.toggle('low', timed && run.time <= 10 && !run.over);
  }

  function startRun() {
    stopRun();
    const def = current;
    els.ui.innerHTML = '';
    els.ui.className = 'ui';
    els.panel.hidden = true;
    floats = [];
    keys.clear();
    pointer.down = false;
    run = { def, score: 0, time: def.duration ?? 60, elapsed: 0, over: false, lastTick: 99 };
    run.api = makeApi(run);
    run.game = def.create(run.api) || {};
    hud();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stopRun() {
    cancelAnimationFrame(raf);
    if (run && run.game && run.game.destroy) { try { run.game.destroy(); } catch (e) { console.error(e); } }
    run = null;
  }

  function finish(reason) {
    if (!run || run.over) return;
    run.over = true;
    const r = run;
    const def = r.def;
    const prev = bestOf(def.id);
    const isBest = prev == null || r.score > prev;
    if (isBest) store.set('best:' + def.id, r.score);
    store.set('plays:' + def.id, playsOf(def.id) + 1);
    SFX.end();
    hud();
    setTimeout(() => {
      if (run !== r) return;
      showPanel(`
        <div class="reason">${esc(reason || "Time's up!")}</div>
        <div class="final">${r.score}</div>
        ${isBest && r.score > 0 ? '<div class="newbest">New personal best!</div>' : `<div class="best">Best: <b>${prev ?? 0}</b></div>`}
        <div class="row">
          <button class="btn primary" data-act="start">Play again</button>
          <button class="btn" data-act="home">All games</button>
        </div>
        <div class="hint">Press Space or Enter to play again</div>`);
    }, 700);
  }

  function frame(t) {
    if (!run) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const g = run.game;
    if (!run.over) {
      run.elapsed += dt;
      if (run.def.duration !== 0) {
        run.time -= dt;
        const whole = Math.ceil(run.time);
        if (whole <= 5 && whole < run.lastTick && whole > 0) SFX.tick();
        run.lastTick = whole;
        if (run.time <= 0) { run.time = 0; g.update && g.update(dt); finish(run.def.timeUpText || "Time's up!"); }
      }
      if (!run.over && g.update) {
        try { g.update(dt); } catch (e) { console.error(e); finish('Something went wrong'); }
      }
      hud();
    }
    ctx.setTransform(stageW / W * dpr, 0, 0, stageH / H * dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (g.draw) { ctx.save(); try { g.draw(ctx); } catch (e) { console.error(e); } ctx.restore(); }
    drawFloats(dt);
    raf = requestAnimationFrame(frame);
  }

  function drawFloats(dt) {
    floats = floats.filter((f) => (f.t += dt) < 0.9);
    for (const f of floats) {
      ctx.globalAlpha = 1 - f.t / 0.9;
      D.text(ctx, f.text, f.x, f.y - f.t * 50, f.size, f.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawIdle() {
    if (!ctx || !current) return;
    ctx.setTransform(stageW / W * dpr, 0, 0, stageH / H * dpr, 0, 0);
    D.bg(ctx, '#211b52', '#0f0c26');
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function showPanel(html) {
    els.panel.innerHTML = html;
    els.panel.hidden = false;
  }

  function showIntro() {
    const def = current;
    const best = bestOf(def.id);
    const timeText = def.duration === 0 ? 'No time limit' : `${def.duration ?? 60} seconds`;
    showPanel(`
      <div class="big-emoji">${def.emoji}</div>
      <h2>${esc(def.name)}</h2>
      <ul>${def.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <div class="best">${timeText} · Best: <b>${best ?? '–'}</b></div>
      <button class="btn primary" data-act="start">Start</button>
      ${def.guess ? '<div class="disclaimer">These rules are a best guess at how the app version plays.</div>' : ''}
      <div class="hint">Press Space or Enter to start</div>`);
  }

  // ---------- screens ----------
  function openGame(id) {
    const def = games.find((g) => g.id === id);
    if (!def) { showHome(); return; }
    stopRun();
    current = def;
    els.home.hidden = true;
    els.play.hidden = false;
    els.gEmoji.textContent = def.emoji;
    els.gName.textContent = def.name;
    els.hudScore.textContent = '0';
    els.hudTime.textContent = def.duration === 0 ? '0' : String(def.duration ?? 60);
    els.hudTime.parentElement.classList.remove('low');
    els.ui.innerHTML = ''; els.ui.className = 'ui';
    document.title = def.name + ' · playus practice';
    window.scrollTo(0, 0);
    resize();
    drawIdle();
    showIntro();
  }

  let filter = 'All';
  function showHome() {
    stopRun();
    current = null;
    els.play.hidden = true;
    els.home.hidden = false;
    document.title = 'playus practice';
    renderGrid();
  }

  function renderFilters() {
    els.filters.innerHTML = CATS.map((c) => `<button class="chip ${c === filter ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('');
  }

  function renderGrid() {
    renderFilters();
    const list = games.filter((g) => filter === 'All' || g.cat === filter);
    els.grid.innerHTML = list.map((g) => {
      const best = bestOf(g.id);
      return `<button class="card" data-id="${g.id}">
        <div class="emoji">${g.emoji}</div>
        <div class="name">${esc(g.name)}</div>
        <div class="desc">${esc(g.desc)}</div>
        <div class="meta"><span class="tag">${g.cat}</span><span>Best <b>${best ?? '–'}</b></span></div>
      </button>`;
    }).join('');
    const daily = dailyGame();
    els.dailyBtn.textContent = `Today's game: ${daily.emoji} ${daily.name}`;
    els.dailyBtn.onclick = () => { location.hash = '#/' + daily.id; };
  }

  function dailyGame() {
    const d = new Date();
    const seed = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
    let h = seed;
    h = ((h >>> 16) ^ h) * 0x45d9f3b; h = ((h >>> 16) ^ h) * 0x45d9f3b; h = (h >>> 16) ^ h;
    return games[Math.abs(h) % games.length];
  }

  function route() {
    const m = location.hash.match(/^#\/([\w-]+)/);
    if (m) openGame(m[1]); else showHome();
  }

  // ---------- input ----------
  function toLocal(e) {
    const r = els.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  function activeGame() { return run && !run.over ? run.game : null; }

  function bindInput() {
    const st = els.stage;
    st.addEventListener('pointerdown', (e) => {
      if (!els.panel.hidden) return;
      const g = activeGame(); if (!g) return;
      if (e.target.closest('.ui.interactive button')) return; // DOM games handle their own buttons
      e.preventDefault();
      try { st.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      const p = toLocal(e);
      Object.assign(pointer, { x: p.x, y: p.y, down: true, sx: p.x, sy: p.y, st: performance.now() });
      g.onDown && g.onDown(p.x, p.y);
      g.onTap && g.onTap(p.x, p.y);
    });
    st.addEventListener('pointermove', (e) => {
      const p = toLocal(e);
      const px = pointer.x, py = pointer.y;
      pointer.x = p.x; pointer.y = p.y;
      const g = activeGame();
      if (g && g.onMove) g.onMove(p.x, p.y, px, py);
    });
    const up = (e) => {
      if (!pointer.down) return;
      pointer.down = false;
      const p = toLocal(e);
      const g = activeGame(); if (!g) return;
      g.onUp && g.onUp(p.x, p.y);
      const dx = p.x - pointer.sx, dy = p.y - pointer.sy;
      if (g.onSwipe && Math.hypot(dx, dy) > 22) {
        g.onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      }
    };
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
    // Swipe as soon as the finger has travelled far enough, so fast swipers don't wait for lift-off.
    st.addEventListener('pointermove', (e) => {
      const g = activeGame();
      if (!g || !g.onSwipe || !g.swipeEarly || !pointer.down) return;
      const dx = pointer.x - pointer.sx, dy = pointer.y - pointer.sy;
      if (Math.hypot(dx, dy) > 40) {
        pointer.down = false;
        g.onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      }
    });

    els.panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'start') startRun();
      if (b.dataset.act === 'home') location.hash = '#';
    });

    const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    window.addEventListener('keydown', (e) => {
      if (els.play.hidden) return;
      if (e.key === 'Escape') { location.hash = '#'; return; }
      if (!els.panel.hidden) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const b = els.panel.querySelector('[data-act="start"]');
          if (b) b.click();
        }
        return;
      }
      const g = activeGame(); if (!g) return;
      if (ARROWS[e.key] || e.key === ' ') e.preventDefault();
      if (e.repeat && keys.has(e.key)) return;
      keys.add(e.key);
      if (ARROWS[e.key] && g.onSwipe) g.onSwipe(ARROWS[e.key]);
      if ((e.key === ' ' || e.key === 'Enter') && g.onTap && g.keyTap !== false) g.onTap(W / 2, H / 2, true);
      g.onKey && g.onKey(e.key);
    });
    window.addEventListener('keyup', (e) => {
      keys.delete(e.key);
      const g = activeGame();
      g && g.onKeyUp && g.onKeyUp(e.key);
    });
    window.addEventListener('blur', () => keys.clear());

    els.filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      filter = b.dataset.cat;
      renderGrid();
    });
    els.grid.addEventListener('click', (e) => {
      const c = e.target.closest('[data-id]');
      if (c) location.hash = '#/' + c.dataset.id;
    });
    els.back.addEventListener('click', () => { location.hash = '#'; });
    els.mute.addEventListener('click', () => {
      muted = !muted; store.set('muted', muted); els.mute.textContent = muted ? '🔇' : '🔊';
      if (!muted) SFX.tap();
    });
  }

  function boot() {
    els = {
      home: $('home'), play: $('play'), grid: $('grid'), filters: $('filters'), dailyBtn: $('dailyBtn'),
      stage: $('stage'), cv: $('cv'), ui: $('ui'), panel: $('panel'),
      hudScore: $('hudScore'), hudTime: $('hudTime'), hudTimeLabel: $('hudTimeLabel'),
      gName: $('gName'), gEmoji: $('gEmoji'), back: $('backBtn'), mute: $('muteBtn'),
    };
    ctx = els.cv.getContext('2d');
    els.mute.textContent = muted ? '🔇' : '🔊';
    games.sort((a, b) => a.name.localeCompare(b.name));
    bindInput();
    window.addEventListener('resize', resize);
    window.addEventListener('hashchange', route);
    resize();
    route();
  }

  window.PU = {
    W, H, U, D,
    register(def) { games.push(def); },
    boot,
    get games() { return games; },
  };
})();
