// Brain games: maths, memory and recall.
(() => {
  const { register, W, H, U, D } = PU;

  const PI_DIGITS = '1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679' +
    '8214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196' +
    '4428810975665933446128475648233786783165271201909145648566923460348610454326648213393607260249141273';

  const domBg = (ctx) => D.bg(ctx, '#1d1846', '#0d0b24');

  // ------------------------------------------------------------------ Quick Maths
  register({
    id: 'quick-maths', name: 'Quick Maths', emoji: '➗', cat: 'Brain',
    desc: 'Answer as many sums as you can in a minute.',
    how: [
      'Type the answer on the keypad or your keyboard.',
      'It checks automatically once you have typed enough digits.',
      'The sums get harder as your score goes up.',
    ],
    create(api) {
      const el = api.ui; el.classList.add('interactive');
      el.innerHTML = '<div class="dom-game"><div class="q"></div><div class="answer"></div><div class="sub"></div><div></div></div>';
      const qEl = el.querySelector('.q'), aEl = el.querySelector('.answer'), subEl = el.querySelector('.sub');
      let q, typed = '', streak = 0;
      const gen = () => {
        const s = api.score, m = 1 + Math.floor(s / 5);
        const op = U.pick(s < 4 ? ['+', '−'] : s < 10 ? ['+', '−', '×'] : ['+', '−', '×', '÷']);
        let a, b, ans;
        if (op === '+') { a = U.randi(2, 9 + m * 6); b = U.randi(2, 9 + m * 6); ans = a + b; }
        if (op === '−') { a = U.randi(5, 12 + m * 7); b = U.randi(1, a); ans = a - b; }
        if (op === '×') { a = U.randi(2, 5 + m); b = U.randi(2, 9 + Math.min(m, 3)); ans = a * b; }
        if (op === '÷') { b = U.randi(2, 9); ans = U.randi(2, 5 + m); a = b * ans; }
        q = { text: `${a} ${op} ${b}`, ans: String(ans) };
        qEl.textContent = q.text;
      };
      const render = () => { aEl.textContent = typed || ' '; };
      const press = (k) => {
        if (api.over) return;
        aEl.classList.remove('ok', 'bad');
        if (k === '⌫') typed = typed.slice(0, -1);
        else if (k === 'C') typed = '';
        else if (typed.length < 6) typed += k;
        if (typed === q.ans) {
          streak++; api.add(1); api.sfx('good');
          aEl.classList.add('ok'); subEl.textContent = streak >= 3 ? `${streak} in a row!` : 'Correct';
          typed = ''; gen();
        } else if (typed.length >= q.ans.length && k !== '⌫' && k !== 'C') {
          streak = 0; api.sfx('bad'); void aEl.offsetWidth; aEl.classList.add('bad');
          subEl.textContent = `${q.text} = ${q.ans}`; typed = '';
        }
        render();
      };
      api.keypad(el.querySelector('.dom-game > div:last-child'), press);
      gen(); render();
      return {
        onKey(k) { if (/^[0-9]$/.test(k)) press(k); else if (k === 'Backspace') press('⌫'); },
        draw: domBg,
      };
    },
  });

  // ------------------------------------------------------------------ Telephone
  register({
    id: 'telephone', name: 'Telephone', emoji: '☎️', cat: 'Brain', guess: true,
    desc: 'Memorise the phone number, then dial it back from memory.',
    how: [
      'A phone number flashes up for a few seconds.',
      'Once it disappears, type it back from memory.',
      'Each correct number scores 1 point per digit, and the next one is a digit longer.',
    ],
    create(api) {
      const el = api.ui; el.classList.add('interactive');
      el.innerHTML = '<div class="dom-game"><div class="sub"></div><div class="q digits"></div><div class="bar"><i></i></div><div class="answer digits"></div><div></div></div>';
      const sub = el.querySelector('.sub'), qEl = el.querySelector('.q'), bar = el.querySelector('.bar i'), barWrap = el.querySelector('.bar'), aEl = el.querySelector('.answer');
      const kp = api.keypad(el.querySelector('.dom-game > div:last-child'), (k) => press(k));
      let len = 4, num = '', typed = '', phase = 'show', t = 0, showFor = 0;
      const fmt = (s) => s.replace(/(\d{3})(?=\d{2})/g, '$1 ');
      const next = () => {
        num = ''; for (let i = 0; i < len; i++) num += U.randi(i === 0 ? 1 : 0, 9);
        typed = ''; phase = 'show'; t = 0; showFor = 0.9 + len * 0.42;
        qEl.innerHTML = fmt(num); sub.textContent = `Memorise ${len} digits`;
        barWrap.style.visibility = 'visible'; kp.classList.add('disabled');
        aEl.classList.remove('ok', 'bad'); aEl.textContent = ' ';
      };
      const render = () => {
        aEl.textContent = (typed + '•'.repeat(len - typed.length)).replace(/(.{3})(?=.{2})/g, '$1 ');
      };
      const press = (k) => {
        if (phase !== 'input' || api.over) return;
        if (k === '⌫') typed = typed.slice(0, -1);
        else if (k === 'C') typed = '';
        else typed += k;
        render();
        if (typed.length === len) {
          phase = 'result'; t = 0; kp.classList.add('disabled');
          if (typed === num) {
            api.add(len); api.sfx('good'); aEl.classList.add('ok'); sub.textContent = 'Connected! ✓'; len++;
          } else {
            api.sfx('bad'); aEl.classList.add('bad');
            qEl.innerHTML = [...num].map((d, i) => `<span class="${typed[i] === d ? 'good' : 'bad'}">${d}</span>`).join('');
            sub.textContent = 'Wrong number'; len = Math.max(4, len - 1);
          }
        }
      };
      next();
      return {
        update(dt) {
          t += dt;
          if (phase === 'show') {
            bar.style.width = `${Math.max(0, 100 - (t / showFor) * 100)}%`;
            if (t >= showFor) {
              phase = 'input'; qEl.innerHTML = '&nbsp;'; sub.textContent = 'Dial it back';
              barWrap.style.visibility = 'hidden'; kp.classList.remove('disabled'); render();
            }
          } else if (phase === 'result' && t > 1.3) next();
        },
        onKey(k) { if (/^[0-9]$/.test(k)) press(k); else if (k === 'Backspace') press('⌫'); },
        draw: domBg,
      };
    },
  });

  // ------------------------------------------------------------------ Pi
  register({
    id: 'pi', name: 'Pí', emoji: '🥧', cat: 'Brain',
    desc: 'Type as many digits of π as you can remember.',
    how: [
      'Type the digits of π in order, starting after the "3.".',
      'One wrong digit ends the game, and you get shown the next few digits so you can learn them.',
      'Each correct digit scores +1.',
    ],
    create(api) {
      const el = api.ui; el.classList.add('interactive');
      el.innerHTML = '<div class="dom-game"><div class="sub">π = 3.</div><div class="answer digits"></div><div class="sub hintline"></div><div></div></div>';
      const aEl = el.querySelector('.answer'), hint = el.querySelector('.hintline');
      let i = 0;
      const render = (bad) => {
        const shown = PI_DIGITS.slice(Math.max(0, i - 15), i);
        aEl.innerHTML = `${i > 15 ? '…' : '3.'}${shown}${bad != null ? `<span class="bad">${bad}</span>` : ''}`;
        hint.textContent = i ? `${i} digit${i === 1 ? '' : 's'}` : 'Start with 1';
      };
      const press = (k) => {
        if (api.over || !/^[0-9]$/.test(k)) return;
        if (k === PI_DIGITS[i]) {
          i++; api.add(1); api.tone(400 + (+k) * 60, 0.06, 'triangle');
          if (i >= PI_DIGITS.length) { render(); api.end('You know all 300 digits we have!'); return; }
          render();
        } else {
          render(k); aEl.classList.add('bad'); api.sfx('bad');
          hint.innerHTML = `Next digits were: <b class="digits">${PI_DIGITS.slice(i, i + 10)}</b>`;
          api.end(`Digit ${i + 1} is ${PI_DIGITS[i]}, not ${k}`);
        }
      };
      api.keypad(el.querySelector('.dom-game > div:last-child'), press);
      el.querySelectorAll('.kp [data-k="C"], .kp [data-k="⌫"]').forEach((b) => { b.style.visibility = 'hidden'; });
      render();
      return { onKey: press, draw: domBg };
    },
  });

  // ------------------------------------------------------------------ Memory
  register({
    id: 'memory', name: 'Memory', emoji: '🃏', cat: 'Brain',
    desc: 'Flip cards two at a time and find all the matching pairs.',
    how: [
      'Tap two cards to flip them over.',
      'If they match, they stay face up and you score +1.',
      'Clear the board to get a bigger one.',
    ],
    create(api) {
      const POOL = ['🐶', '🐱', '🦊', '🐸', '🐵', '🦄', '🐙', '🐝', '🍕', '🍩', '⚽', '🎸', '🚀', '🌈', '🍄', '💎'];
      let cards, cols, rows, size, x0, y0, open = [], lock = 0, board = 0;
      const deal = () => {
        board++;
        [cols, rows] = board === 1 ? [3, 4] : board === 2 ? [4, 4] : [4, 5];
        const pairs = (cols * rows) / 2;
        const faces = U.shuffle(POOL.slice()).slice(0, pairs);
        cards = U.shuffle(faces.concat(faces)).map((f) => ({ f, up: false, done: false, flip: 0 }));
        size = Math.min((W - 40 - (cols - 1) * 10) / cols, (H - 140 - (rows - 1) * 10) / rows);
        x0 = (W - (cols * size + (cols - 1) * 10)) / 2;
        y0 = 90 + (H - 110 - (rows * size + (rows - 1) * 10)) / 2;
      };
      deal();
      const pos = (i) => ({ x: x0 + (i % cols) * (size + 10), y: y0 + Math.floor(i / cols) * (size + 10) });
      return {
        update(dt) {
          for (const c of cards) c.flip = U.lerp(c.flip, c.up || c.done ? 1 : 0, Math.min(1, dt * 14));
          if (lock > 0) {
            lock -= dt;
            if (lock <= 0) {
              open.forEach((i) => { cards[i].up = false; });
              open = [];
              if (cards.every((c) => c.done)) deal();
            }
          }
        },
        onDown(x, y) {
          if (lock > 0) return;
          const i = cards.findIndex((c, k) => { const p = pos(k); return x >= p.x && x <= p.x + size && y >= p.y && y <= p.y + size; });
          if (i < 0 || cards[i].up || cards[i].done) return;
          cards[i].up = true; open.push(i); api.sfx('tap');
          if (open.length === 2) {
            const [a, b] = open;
            if (cards[a].f === cards[b].f) {
              cards[a].done = cards[b].done = true;
              const p = pos(b);
              api.add(1, p.x + size / 2, p.y); api.sfx('good');
              open = [];
              if (cards.every((c) => c.done)) { lock = 0.6; api.add(2, W / 2, 70, 'Board cleared +2'); }
            } else lock = 0.7;
          }
        },
        draw(ctx) {
          D.bg(ctx, '#173a5e', '#0a1a2c');
          cards.forEach((c, i) => {
            const p = pos(i), sx = Math.abs(Math.cos(c.flip * Math.PI));
            const faceUp = c.flip > 0.5;
            ctx.save(); ctx.translate(p.x + size / 2, p.y + size / 2); ctx.scale(Math.max(0.04, sx), 1);
            D.rect(ctx, -size / 2, -size / 2, size, size, faceUp ? (c.done ? '#c9ffe4' : '#fff') : '#3b82f6', 14);
            if (faceUp) D.emoji(ctx, c.f, 0, 2, size * 0.55);
            else D.text(ctx, '?', 0, 0, size * 0.4, 'rgba(255,255,255,.5)');
            ctx.restore();
          });
        },
      };
    },
  });

  // ------------------------------------------------------------------ Grid Recall
  register({
    id: 'grid-recall', name: 'Grid Recall', emoji: '🔲', cat: 'Brain',
    desc: 'Remember which squares lit up, then tap them all.',
    how: [
      'Some squares light up for a moment.',
      'Tap every one of them after they go dark.',
      'One wrong tap ends the round. Get it right and the next pattern is bigger.',
    ],
    create(api) {
      let n = 3, k = 3, round, wait = 0;
      const AREA = 340, Y0 = 150;
      const newRound = () => {
        const all = U.shuffle([...Array(n * n).keys()]);
        round = { lit: new Set(all.slice(0, k)), found: new Set(), wrong: -1, phase: 'show', t: 1.1 + k * 0.08 };
      };
      newRound();
      const geom = () => { const g = 8, s = (AREA - (n - 1) * g) / n; return { g, s, x0: (W - AREA) / 2 }; };
      return {
        update(dt) {
          if (round.phase === 'show' && (round.t -= dt) <= 0) round.phase = 'input';
          if (round.phase === 'result' && (wait -= dt) <= 0) newRound();
        },
        onDown(x, y) {
          if (round.phase !== 'input') return;
          const { g, s, x0 } = geom();
          const c = Math.floor((x - x0) / (s + g)), r = Math.floor((y - Y0) / (s + g));
          if (c < 0 || r < 0 || c >= n || r >= n) return;
          const i = r * n + c;
          if (round.found.has(i)) return;
          if (round.lit.has(i)) {
            round.found.add(i); api.sfx('tap');
            if (round.found.size === k) {
              api.add(k, W / 2, 110); api.sfx('good');
              round.phase = 'result'; wait = 0.6; round.ok = true;
              k++;
              if (k > n * n * 0.45 && n < 6) n++;
            }
          } else {
            round.wrong = i; round.phase = 'result'; wait = 1.1; round.ok = false; api.sfx('bad');
            k = Math.max(3, k - 1);
            if (n > 3 && k < (n - 1) * (n - 1) * 0.45) n--;
          }
        },
        draw(ctx) {
          D.bg(ctx, '#2a1a4a', '#100a1f');
          const { g, s, x0 } = geom();
          for (let i = 0; i < n * n; i++) {
            const x = x0 + (i % n) * (s + g), y = Y0 + Math.floor(i / n) * (s + g);
            let col = 'rgba(255,255,255,.1)';
            if (round.phase === 'show' && round.lit.has(i)) col = '#ffcc3d';
            if (round.found.has(i)) col = '#5cf2a5';
            if (round.phase === 'result' && !round.ok && round.lit.has(i) && !round.found.has(i)) col = 'rgba(255,204,61,.45)';
            if (i === round.wrong) col = '#ff6b8a';
            D.rect(ctx, x, y, s, s, col, 10);
          }
          const msg = round.phase === 'show' ? 'Memorise…' : round.phase === 'input' ? `Tap ${k - round.found.size} more` : round.ok ? 'Correct!' : 'Oops!';
          D.text(ctx, msg, W / 2, 110, 24, round.phase === 'result' ? (round.ok ? '#5cf2a5' : '#ff6b8a') : '#fff');
          D.text(ctx, `${k} squares`, W / 2, 530, 16, 'rgba(255,255,255,.45)');
        },
      };
    },
  });

  // ------------------------------------------------------------------ Trace
  register({
    id: 'trace', name: 'Trace', emoji: '✏️', cat: 'Brain', guess: true,
    desc: 'Trace each shape with your finger as accurately as you can.',
    how: [
      'Start at the yellow dot and trace along the whole dotted shape in one stroke.',
      'Lift your finger to submit. The closer and more complete your line, the higher your % score.',
      'Your score is the total of all your percentages.',
    ],
    create(api) {
      const CX = W / 2, CY = 330, R = 120, N = 140;
      const shapes = {
        circle: () => Array.from({ length: 64 }, (_, i) => { const a = -Math.PI / 2 + (i / 63) * Math.PI * 2; return [CX + R * Math.cos(a), CY + R * Math.sin(a)]; }),
        square: () => [[CX - R, CY - R], [CX + R, CY - R], [CX + R, CY + R], [CX - R, CY + R], [CX - R, CY - R]],
        triangle: () => [[CX, CY - R], [CX + R, CY + R * 0.8], [CX - R, CY + R * 0.8], [CX, CY - R]],
        star: () => Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? R * 0.42 : R * 1.05; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }),
        heart: () => Array.from({ length: 80 }, (_, i) => { const t = (i / 79) * Math.PI * 2; return [CX + 7 * 16 * Math.pow(Math.sin(t), 3), CY - 15 - 7 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; }),
        zigzag: () => [[CX - R, CY - R], [CX + R, CY - R * 0.5], [CX - R, CY], [CX + R, CY + R * 0.5], [CX - R, CY + R]],
        spiral: () => Array.from({ length: 90 }, (_, i) => { const t = i / 89, a = t * Math.PI * 5; return [CX + R * t * Math.cos(a), CY + R * t * Math.sin(a)]; }),
        infinity: () => Array.from({ length: 90 }, (_, i) => { const t = (i / 89) * Math.PI * 2; const d = 1 + Math.sin(t) ** 2; return [CX + R * 1.3 * Math.cos(t) / d, CY + R * 1.3 * Math.sin(t) * Math.cos(t) / d]; }),
      };
      const resample = (pts) => {
        const seg = []; let total = 0;
        for (let i = 1; i < pts.length; i++) { const l = U.dist(...pts[i - 1], ...pts[i]); seg.push(l); total += l; }
        const out = []; let si = 0, acc = 0;
        for (let k = 0; k < N; k++) {
          const target = (k / (N - 1)) * total;
          while (si < seg.length - 1 && acc + seg[si] < target) { acc += seg[si]; si++; }
          const t = seg[si] ? (target - acc) / seg[si] : 0;
          out.push({ x: U.lerp(pts[si][0], pts[si + 1][0], U.clamp(t, 0, 1)), y: U.lerp(pts[si][1], pts[si + 1][1], U.clamp(t, 0, 1)), hit: false });
        }
        return out;
      };
      let order = U.shuffle(Object.keys(shapes)), si = 0, path, name, stroke = [], off = 0, res = null, wait = 0;
      const next = () => {
        if (si >= order.length) { order = U.shuffle(Object.keys(shapes)); si = 0; }
        name = order[si++]; path = resample(shapes[name]()); stroke = []; off = 0; res = null;
      };
      next();
      const mark = (x, y) => {
        let near = false;
        for (const p of path) if (U.dist(x, y, p.x, p.y) < 20) { p.hit = true; near = true; }
        if (!near) { const d = Math.min(...path.map((p) => U.dist(x, y, p.x, p.y))); if (d > 28) off++; }
      };
      return {
        update(dt) { if (res && (wait -= dt) <= 0) next(); },
        onDown(x, y) { if (res) return; stroke = [{ x, y }]; off = 0; path.forEach((p) => { p.hit = false; }); mark(x, y); },
        onMove(x, y) {
          if (res || !api.pointer.down || !stroke.length) return;
          const lp = stroke[stroke.length - 1];
          const steps = Math.max(1, Math.ceil(U.dist(lp.x, lp.y, x, y) / 6));
          for (let s = 1; s <= steps; s++) { const ix = U.lerp(lp.x, x, s / steps), iy = U.lerp(lp.y, y, s / steps); stroke.push({ x: ix, y: iy }); mark(ix, iy); }
        },
        onUp() {
          if (res || stroke.length < 5) return;
          const cov = path.filter((p) => p.hit).length / N;
          if (cov < 0.25) { stroke = []; path.forEach((p) => { p.hit = false; }); api.float('Trace the whole shape', W / 2, 140, '#ffcc3d', 20); return; }
          const acc = Math.round(100 * cov * Math.max(0, 1 - off / stroke.length * 1.5));
          res = acc; wait = 1;
          api.add(acc, W / 2, 140, `${acc}%`); api.sfx(acc >= 85 ? 'great' : acc >= 60 ? 'good' : 'bad');
        },
        draw(ctx) {
          D.bg(ctx, '#f5f0e6', '#e8dfcc');
          D.text(ctx, name[0].toUpperCase() + name.slice(1), W / 2, 90, 26, '#3a2f20');
          for (const p of path) D.circle(ctx, p.x, p.y, p.hit ? 5 : 3.5, p.hit ? '#5cbf8a' : 'rgba(58,47,32,.35)');
          D.circle(ctx, path[0].x, path[0].y, 11, '#ffb703');
          if (stroke.length > 1) {
            ctx.beginPath(); ctx.moveTo(stroke[0].x, stroke[0].y);
            for (const p of stroke) ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
          }
          if (res != null) D.text(ctx, `${res}%`, W / 2, 530, 44, res >= 85 ? '#1f9d63' : res >= 60 ? '#c48a00' : '#d6335a');
        },
      };
    },
  });
})();
