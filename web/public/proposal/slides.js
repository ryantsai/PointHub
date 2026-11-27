// PointHub presentation: slide navigation (keys, swipe, dots, #hash), autoplay, fullscreen,
// and the few animations that need script (counters, the rotating QR code, the theme carousel).
(() => {
  'use strict';
  const DATA = window.PROPOSAL ?? { themes: [], decisions: [] };
  const deck = document.getElementById('deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const dots = document.getElementById('dots');
  const counter = document.getElementById('counter');
  const live = document.getElementById('live');
  const autoButton = document.getElementById('auto');
  const fullButton = document.getElementById('full');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const AUTO_MS = 9000;
  deck.style.setProperty('--auto-ms', `${AUTO_MS}ms`);

  let index = -1;
  let autoplay = false;
  let autoTimer = 0;
  let hookStop = null;

  // Where the two background lights sit on each slide, so the room shifts a little as you advance.
  const lights = [[0, 0, 0, 0], [20, 10, -10, 0], [40, 30, -30, -10], [10, 40, -20, -30], [-5, 20, 0, -40],
    [30, 0, -40, 10], [50, 20, -10, -20], [0, 50, -40, -10], [35, 35, -20, 0], [15, 5, -35, -25], [45, 10, 0, -15], [25, 25, -25, -25]];

  slides.forEach((slide, i) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', '投影片');
    slide.setAttribute('aria-label', `${i + 1} / ${slides.length}：${slide.dataset.title}`);
    slide.inert = true;
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.title = slide.dataset.title;
    dot.setAttribute('aria-label', `第 ${i + 1} 張：${slide.dataset.title}`);
    dot.addEventListener('click', () => go(i));
    dots.append(dot);
  });

  function go(target) {
    const n = Math.max(0, Math.min(slides.length - 1, target));
    if (n === index) return;
    const dir = n > index ? 1 : -1;
    const prev = slides[index];
    const next = slides[n];

    if (prev) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      prev.style.transform = `translateX(${-dir * 4}%) scale(.98)`;
      prev.inert = true;
      clearTimeout(prev.leaveTimer);
      prev.leaveTimer = setTimeout(() => { prev.classList.remove('is-leaving'); prev.style.transform = ''; }, 900);
    }
    // Start the incoming slide on the side it comes from, then let it glide in.
    clearTimeout(next.leaveTimer);
    next.classList.remove('is-leaving');
    next.style.transition = 'none';
    next.style.transform = `translateX(${dir * 4}%) scale(.98)`;
    void next.offsetWidth;
    next.style.transition = '';
    next.style.transform = '';
    next.classList.add('is-active');
    next.inert = false;
    index = n;

    const [bx, by, cx, cy] = lights[n % lights.length];
    deck.style.setProperty('--bx', `${bx}%`); deck.style.setProperty('--by', `${by}%`);
    deck.style.setProperty('--cx', `${cx}%`); deck.style.setProperty('--cy', `${cy}%`);
    deck.style.setProperty('--progress', `${((n + 1) / slides.length) * 100}%`);
    [...dots.children].forEach((dot, i) => (i === n ? dot.setAttribute('aria-current', 'step') : dot.removeAttribute('aria-current')));
    counter.textContent = `${n + 1} / ${slides.length}`;
    live.textContent = `第 ${n + 1} 張，共 ${slides.length} 張：${next.dataset.title}`;
    document.title = `${next.dataset.title}・PointHub 簡報`;
    history.replaceState(null, '', `#${n + 1}`);

    next.querySelectorAll('[data-count]').forEach(countUp);
    hookStop?.();
    hookStop = hooks[next.dataset.hook]?.(next) ?? null;
    scheduleAuto();
  }
  const step = (delta) => go(index + delta);

  // ---- Counters --------------------------------------------------------------------------------------
  const format = (value) => value.toLocaleString('zh-TW');
  function countUp(node) {
    const target = Number(node.dataset.count);
    if (reduceMotion.matches) { node.textContent = format(target); return; }
    const slide = node.closest('.slide');
    const start = performance.now() + Number(node.dataset.delay ?? 400);
    const duration = 1500;
    node.textContent = format(0);
    const frame = (now) => {
      if (!slide.classList.contains('is-active')) return;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      node.textContent = format(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ---- Per-slide animations that need script. Each returns a function that stops it. ------------------
  const hooks = {
    qr(slide) {
      const svg = slide.querySelector('.qr');
      const path = svg.querySelector('.qr-mods');
      const ring = slide.querySelector('.cd-fill');
      const number = slide.querySelector('.countdown b');
      let seed = Math.floor(Math.random() * 1e9);
      let left = 30;
      const draw = () => { path.setAttribute('d', qrPath(seed++)); };
      draw();
      // One "second" every 150 ms: the real code changes every 30 seconds, this is sped up to show it.
      const timer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          left = 30;
          svg.classList.add('flip');
          setTimeout(() => { draw(); svg.classList.remove('flip'); }, 250);
        }
        number.textContent = String(left);
        ring.style.strokeDashoffset = String(100 - (left / 30) * 100);
      }, 150);
      return () => clearInterval(timer);
    },
    // A live check-in board: arrivals from every channel land in one list and the totals move with them.
    tally(slide) {
      const feed = slide.querySelector('.feed');
      const field = (name) => slide.querySelector(`[data-tally="${name}"]`);
      const ROSTER = 140, POINTS = 50;
      let approved = 96, pending = 3, rosterApproved = 92;
      const methods = { qr: ['m-qr', 'QR Code'], card: ['m-card', '員工證'], manual: ['m-manual', '人工輸入'] };
      // [name, method, waits for approval, on the roster]
      const arrivals = [
        ['林怡君', 'card', false, true], ['陳志豪', 'qr', true, true], ['Taylor Staff', 'manual', false, true],
        ['張雅婷', 'card', false, true], ['吳佩珊', 'qr', true, false], ['黃建宏', 'card', false, true],
        ['周雅琪', 'qr', false, true], ['李宗翰', 'card', false, true], ['Kenji Sato', 'qr', true, true],
      ];
      const bump = (node, value) => { node.textContent = String(value); node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); };
      const paint = () => {
        const pct = Math.round((rosterApproved / ROSTER) * 100);
        field('bar').style.width = `${pct}%`;
        field('pct').textContent = `${pct}%`;
      };
      const row = ([name, method, waits, onRoster]) => {
        const li = document.createElement('li');
        const [cls, label] = methods[method];
        const tag = document.createElement('em'); tag.className = cls; tag.textContent = label;
        const who = document.createElement('span'); who.textContent = name;
        if (!onRoster) { const note = document.createElement('small'); note.textContent = '現場報名'; who.append(note); }
        const result = document.createElement('b');
        result.textContent = waits ? '待審核' : `+${POINTS}`;
        if (waits) result.className = 'wait';
        li.append(tag, who, result);
        return li;
      };
      feed.replaceChildren(...arrivals.slice(-3).reverse().map(row));
      field('approved').textContent = String(approved);
      field('pending').textContent = String(pending);
      paint();
      let at = 0;
      const tick = () => {
        // Every fourth beat the host approves one waiting check-in from the review list.
        if (at % 4 === 3 && pending > 0) {
          pending -= 1; approved += 1; rosterApproved += 1;
          bump(field('pending'), pending); bump(field('approved'), approved); paint();
          at += 1;
          return;
        }
        const arrival = arrivals[at % arrivals.length];
        at += 1;
        feed.prepend(row(arrival));
        while (feed.children.length > 4) feed.lastElementChild.remove();
        if (arrival[2]) { pending += 1; bump(field('pending'), pending); }
        else {
          approved += 1; if (arrival[3]) rosterApproved = Math.min(ROSTER, rosterApproved + 1);
          bump(field('approved'), approved); paint();
        }
      };
      let timer = 0;
      const start = setTimeout(() => { tick(); timer = setInterval(tick, 1400); }, 1600);
      return () => { clearTimeout(start); clearInterval(timer); };
    },
    themes(slide) {
      const images = [...slide.querySelectorAll('.theme-stack img')];
      const chips = [...slide.querySelectorAll('.festivals li')];
      const label = slide.querySelector('.theme-name');
      if (!images.length) return null;
      let at = 0;
      const show = (i) => {
        images.forEach((img, k) => img.classList.toggle('on', k === i));
        chips.forEach((chip) => chip.classList.toggle('on', chip.dataset.key === images[i].dataset.key));
        label.textContent = images[i].dataset.label;
      };
      show(at);
      const timer = setInterval(() => { at = (at + 1) % images.length; show(at); }, 2200);
      return () => clearInterval(timer);
    },
  };

  /** A QR-looking pattern (not a readable code): three finder squares and seeded random modules. */
  function qrPath(seed) {
    let s = seed >>> 0;
    const random = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const size = 25;
    const finder = (x, y) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
    const reserved = (x, y) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    let d = finder(0, 0) + finder(size - 7, 0) + finder(0, size - 7);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!reserved(x, y) && random() < 0.48) d += `M${x} ${y}h1v1h-1z`;
    return d;
  }

  // Theme carousel and festival chips come from the proposal's own theme list.
  const themeStack = deck.querySelector('.theme-stack');
  const festivals = deck.querySelector('.festivals');
  for (const theme of DATA.themes) {
    const img = document.createElement('img');
    img.src = `screenshots/theme-${theme.key}.png`;
    img.alt = `${theme.name}主題`;
    img.dataset.key = theme.key;
    img.dataset.label = `${theme.name}　${theme.en}`;
    img.decoding = 'async';
    img.addEventListener('error', () => img.remove());
    themeStack.append(img);
    if (theme.key !== 'default') {
      const chip = document.createElement('li');
      chip.textContent = theme.name;
      chip.dataset.key = theme.key;
      festivals.append(chip);
    }
  }
  deck.querySelectorAll('[data-decisions]').forEach((node) => { node.textContent = String(DATA.decisions.length || node.textContent); });

  // ---- Autoplay ---------------------------------------------------------------------------------------
  function scheduleAuto() {
    clearTimeout(autoTimer);
    deck.classList.remove('autoplay');
    if (!autoplay || document.hidden) return;
    void deck.offsetWidth; // restart the progress bar animation
    deck.classList.add('autoplay');
    autoTimer = setTimeout(() => go(index === slides.length - 1 ? 0 : index + 1), AUTO_MS);
  }
  function setAutoplay(on) {
    autoplay = on;
    autoButton.setAttribute('aria-pressed', String(on));
    autoButton.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play');
    autoButton.title = on ? '暫停自動播放（P）' : '自動播放（P）';
    scheduleAuto();
  }
  autoButton.addEventListener('click', () => setAutoplay(!autoplay));
  document.addEventListener('visibilitychange', scheduleAuto);

  // ---- Fullscreen --------------------------------------------------------------------------------------
  const canFullscreen = Boolean(document.documentElement.requestFullscreen);
  if (!canFullscreen) fullButton.hidden = true;
  function toggleFullscreen() {
    if (!canFullscreen) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  fullButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const on = Boolean(document.fullscreenElement);
    fullButton.querySelector('use').setAttribute('href', on ? '#i-shrink' : '#i-expand');
    fullButton.title = on ? '離開全螢幕（F）' : '全螢幕（F）';
  });

  // ---- Input -------------------------------------------------------------------------------------------
  document.getElementById('prev').addEventListener('click', () => step(-1));
  document.getElementById('next').addEventListener('click', () => step(1));

  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const onControl = event.target.closest?.('button, a');
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': step(1); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': step(-1); break;
      case ' ': case 'Enter': if (onControl) return; event.shiftKey ? step(-1) : step(1); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'p': case 'P': setAutoplay(!autoplay); break;
      default: return;
    }
    event.preventDefault();
    wake();
  });

  let touch = null;
  deck.addEventListener('pointerdown', (event) => { if (event.pointerType !== 'mouse') touch = { x: event.clientX, y: event.clientY }; });
  deck.addEventListener('pointerup', (event) => {
    if (!touch) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
  });
  deck.addEventListener('pointercancel', () => { touch = null; });

  // Hide the controls and cursor while presenting; any movement brings them back.
  let idleTimer = 0;
  const controls = document.querySelector('.controls');
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!controls.matches(':hover, :focus-within')) document.body.classList.add('idle'); }, 2800);
  }
  ['pointermove', 'pointerdown', 'touchstart'].forEach((type) => document.addEventListener(type, wake, { passive: true }));

  const fromHash = () => { const n = Number.parseInt(location.hash.slice(1), 10); return Number.isFinite(n) ? n - 1 : 0; };
  window.addEventListener('hashchange', () => go(fromHash()));

  go(fromHash());
  deck.focus({ preventScroll: true });
  wake();
})();
