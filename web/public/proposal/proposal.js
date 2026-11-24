// PointHub proposal page: renders the data in proposal-data.js, draws the workflow diagrams, and keeps
// discussion notes and decisions in this browser's localStorage (nothing is sent to a server).
(() => {
  'use strict';
  const DATA = window.PROPOSAL;
  const STORE = 'pointhub.proposal.v1';
  const SVG = 'http://www.w3.org/2000/svg';

  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
    }
    node.append(...children.filter((child) => child != null));
    return node;
  };
  const svg = (tag, attrs = {}, text) => {
    const node = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text != null) node.textContent = text;
    return node;
  };

  // ---- State ------------------------------------------------------------------------------------

  /** @type {{ author: string, notes: {id:string, section:string, sectionTitle:string, text:string, author:string, createdAt:string, done:boolean}[], decisions: Record<string, {choice:string|null, note:string, updatedAt:string}> }} */
  let state = { author: '', notes: [], decisions: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (saved && Array.isArray(saved.notes)) state = { author: saved.author ?? '', notes: saved.notes, decisions: saved.decisions ?? {} };
  } catch { /* unreadable or blocked storage: start empty */ }

  let storageWorks = true;
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch { storageWorks = false; announce('這個瀏覽器封鎖了本機儲存空間，關閉頁面後筆記將會遺失。離開前請先匯出。'); }
  };
  const announce = (message) => { document.getElementById('note-status').textContent = message; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  const when = (iso) => new Date(iso).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });

  // ---- Table of contents and per-section note buttons --------------------------------------------

  const sections = [...document.querySelectorAll('main > section')];
  const toc = document.getElementById('toc');
  for (const section of sections) {
    const title = section.dataset.title;
    toc.append(el('li', {}, el('a', { href: `#${section.id}`, text: title }, el('span', { class: 'count', 'data-count-for': section.id, hidden: true }))));
    if (section.id === 'feedback') continue;
    const heading = section.querySelector('h1, h2');
    const bar = el('div', { class: 'section-notes' });
    const list = el('ul', { class: 'notes inline', 'data-notes-for': section.id });
    const form = el('form', { class: 'note-form', hidden: true },
      el('label', { class: 'sr', for: `note-${section.id}`, text: `「${title}」的筆記` }),
      el('textarea', { id: `note-${section.id}`, rows: 3, placeholder: `關於「${title}」討論了什麼？`, required: true }),
      el('div', { class: 'row' }, el('button', { class: 'btn primary', type: 'submit', text: '儲存筆記' }), el('button', { class: 'btn ghost', type: 'button', text: '取消', onclick: () => { form.hidden = true; } })));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const area = form.querySelector('textarea');
      addNote(section.id, title, area.value);
      area.value = '';
      form.hidden = true;
    });
    const button = el('button', { class: 'btn small', type: 'button', text: '新增筆記', onclick: () => { form.hidden = !form.hidden; if (!form.hidden) form.querySelector('textarea').focus(); } });
    bar.append(button, form, list);
    heading.after(bar);
  }

  // Highlight the section in view.
  const links = new Map([...toc.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
  const inView = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      links.forEach((a) => a.removeAttribute('aria-current'));
      links.get(entry.target.id)?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach((section) => inView.observe(section));

  // ---- Notes -------------------------------------------------------------------------------------

  function addNote(section, sectionTitle, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    state.notes.unshift({ id: uid(), section, sectionTitle, text: trimmed, author: state.author.trim(), createdAt: new Date().toISOString(), done: false });
    save();
    renderNotes();
    announce(`已儲存「${sectionTitle}」的筆記。`);
  }

  function noteItem(note, showSection) {
    const meta = [showSection ? note.sectionTitle : null, note.author || null, when(note.createdAt)].filter(Boolean).join(' · ');
    const toggle = el('input', { type: 'checkbox', 'aria-label': '已處理', onchange: () => { note.done = toggle.checked; save(); renderNotes(); } });
    toggle.checked = note.done;
    return el('li', { class: note.done ? 'note done' : 'note' },
      toggle,
      el('div', { class: 'note-body' }, el('p', { text: note.text }), el('small', { text: meta })),
      el('button', { class: 'btn ghost small', type: 'button', text: '刪除', 'aria-label': '刪除筆記', onclick: () => { state.notes = state.notes.filter((n) => n.id !== note.id); save(); renderNotes(); } }));
  }

  function renderNotes() {
    const open = state.notes.filter((note) => !note.done).length;
    document.getElementById('notes-count').textContent = String(open);
    for (const list of document.querySelectorAll('[data-notes-for]')) {
      const mine = state.notes.filter((note) => note.section === list.dataset.notesFor);
      list.replaceChildren(...mine.map((note) => noteItem(note, false)));
    }
    for (const badge of document.querySelectorAll('[data-count-for]')) {
      const count = state.notes.filter((note) => note.section === badge.dataset.countFor && !note.done).length;
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
    for (const id of ['all-notes', 'panel-notes']) {
      const list = document.getElementById(id);
      list.replaceChildren(...(state.notes.length
        ? state.notes.map((note) => noteItem(note, true))
        : [el('li', { class: 'empty', text: '目前沒有筆記。請在任一章節標題下方按「新增筆記」。' })]));
    }
  }

  const author = document.getElementById('author');
  author.value = state.author;
  author.addEventListener('input', () => { state.author = author.value; save(); });

  const panel = document.getElementById('notes-panel');
  document.getElementById('open-notes').addEventListener('click', () => { panel.hidden = !panel.hidden; });
  document.getElementById('close-notes').addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('panel-all').addEventListener('click', () => { panel.hidden = true; });

  // ---- Export / import -----------------------------------------------------------------------------

  function toMarkdown() {
    const lines = [`# PointHub 設計提案——討論紀錄`, '', `匯出時間：${when(new Date().toISOString())}${state.author ? `　記錄人：${state.author}` : ''}`, ''];
    const decided = DATA.decisions.filter((d) => state.decisions[d.id]?.choice || state.decisions[d.id]?.note);
    if (decided.length) {
      lines.push('## 決定事項', '');
      for (const d of decided) {
        const answer = state.decisions[d.id];
        lines.push(`- **${d.title}** – ${answer.choice ?? '（未選擇方案）'}${answer.note ? ` — ${answer.note}` : ''}`);
      }
      lines.push('');
    }
    const bySection = new Map();
    for (const note of [...state.notes].reverse()) bySection.set(note.sectionTitle, [...(bySection.get(note.sectionTitle) ?? []), note]);
    if (bySection.size) lines.push('## 筆記', '');
    for (const [title, notes] of bySection) {
      lines.push(`### ${title}`, '');
      for (const note of notes) lines.push(`- [${note.done ? 'x' : ' '}] ${note.text.replace(/\n+/g, ' ')}${note.author ? ` _(${note.author})_` : ''}`);
      lines.push('');
    }
    if (!decided.length && !bySection.size) lines.push('_尚無任何紀錄。_');
    return lines.join('\n');
  }

  document.getElementById('export-md').addEventListener('click', async () => {
    const markdown = toMarkdown();
    try { await navigator.clipboard.writeText(markdown); announce('已複製為 Markdown。'); }
    catch { download('pointhub-proposal-notes.md', markdown, 'text/markdown'); announce('這裡無法使用剪貼簿，已改為下載 Markdown 檔案。'); }
  });
  document.getElementById('export-json').addEventListener('click', () => {
    download('pointhub-proposal-notes.json', JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2), 'application/json');
    announce('已下載。');
  });
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    el('a', { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.getElementById('import-json').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      if (!Array.isArray(incoming.notes)) throw new Error('not a notes file');
      const known = new Set(state.notes.map((note) => note.id));
      const fresh = incoming.notes.filter((note) => note && typeof note.text === 'string' && typeof note.section === 'string' && !known.has(note.id))
        .map((note) => ({ id: String(note.id ?? uid()), section: note.section, sectionTitle: String(note.sectionTitle ?? note.section), text: note.text, author: String(note.author ?? ''), createdAt: note.createdAt ?? new Date().toISOString(), done: Boolean(note.done) }));
      state.notes = [...state.notes, ...fresh].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      // Someone else's file fills in decisions you have not made; it never overwrites yours.
      for (const [id, answer] of Object.entries(incoming.decisions ?? {})) if (!state.decisions[id] && answer && typeof answer === 'object') state.decisions[id] = { choice: answer.choice ?? null, note: String(answer.note ?? ''), updatedAt: answer.updatedAt ?? new Date().toISOString() };
      save(); renderNotes(); renderDecisions();
      announce(`已匯入 ${fresh.length} 則新筆記。`);
    } catch { announce('這不是 PointHub 筆記的匯出檔。'); }
  });

  document.getElementById('clear-all').addEventListener('click', () => {
    if (!state.notes.length && !Object.keys(state.decisions).length) return;
    if (!confirm('要刪除存在這個瀏覽器中的所有筆記與決定嗎？此動作無法復原。如有需要請先匯出。')) return;
    state = { author: state.author, notes: [], decisions: {} };
    save(); renderNotes(); renderDecisions();
    announce('已清除。');
  });

  // ---- Roles, themes --------------------------------------------------------------------------------

  const marks = { y: ['yes', '可以'], o: ['own', '自己的活動'], '-': ['no', '—'] };
  document.querySelector('#role-matrix tbody').append(...DATA.roleMatrix.map(([capability, ...cells]) =>
    el('tr', {}, el('th', { scope: 'row', text: capability }), ...cells.map((cell) => el('td', { class: marks[cell][0] }, el('span', { text: marks[cell][1] }))))));

  document.querySelector('#theme-table tbody').append(...DATA.themes.filter((t) => t.key !== 'default').map((t) =>
    el('tr', {}, el('th', { scope: 'row' }, t.name, el('span', { class: 'zh', lang: 'en', text: ` ${t.en}` })), el('td', { text: t.date }), el('td', { text: t.shows }), el('td', { text: t.next }))));

  document.getElementById('theme-gallery').append(...DATA.themes.map((t) => {
    const figure = el('figure', { class: 'shot', 'data-shot': `theme-${t.key}`, 'data-caption': `${t.name}　${t.en}` });
    return figure;
  }));

  // ---- Screenshots ------------------------------------------------------------------------------------

  const lightbox = document.getElementById('lightbox');
  for (const figure of document.querySelectorAll('figure.shot')) {
    const caption = figure.dataset.caption;
    const src = `screenshots/${figure.dataset.shot}.png`;
    const image = el('img', { src, alt: caption, loading: 'lazy', decoding: 'async' });
    const button = el('button', { type: 'button', class: 'shot-button', 'aria-label': `放大：${caption}`, onclick: () => {
      lightbox.querySelector('img').src = src; lightbox.querySelector('img').alt = caption; lightbox.querySelector('p').textContent = caption; lightbox.showModal();
    } }, image);
    image.addEventListener('error', () => { button.replaceWith(el('div', { class: 'shot-missing', text: '尚未擷取畫面' })); });
    figure.append(button, el('figcaption', { text: caption }));
  }
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });

  // ---- Workflow diagrams (sequence diagrams drawn as SVG) -----------------------------------------------

  // Width in "half-width units": a CJK character is about twice as wide as a Latin letter.
  const isWide = (char) => /[⺀-鿿豈-﫿＀-￯　-〿]/.test(char);
  const units = (text) => [...text].reduce((sum, char) => sum + (isWide(char) ? 2 : 1), 0);
  // Characters that must not start a line (closing punctuation), so a break never strands them.
  const noLineStart = '，。、；：！？）」』》〉…—';

  /** Wraps mixed Chinese / Latin text: Chinese breaks between any two characters, Latin words stay whole. */
  function wrap(text, max) {
    const tokens = text.match(/[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/g) ?? [];
    const lines = [''];
    for (const token of tokens) {
      const current = lines[lines.length - 1];
      if (/^\s+$/.test(token)) { if (current) lines[lines.length - 1] = current + ' '; continue; }
      if (current.trim() && units(current.trimEnd() + token) > max && !noLineStart.includes(token)) lines.push(token);
      else lines[lines.length - 1] = current + token;
    }
    return lines.map((line) => line.trimEnd());
  }

  function drawFlow(flow, index) {
    const lane = 210, pad = 24, top = 62, lineHeight = 16;
    const width = pad * 2 + lane * flow.actors.length;
    const x = (actor) => pad + lane * actor + lane / 2;
    const root = svg('svg', { role: 'img', 'aria-labelledby': `${flow.id}-t` });
    root.append(svg('title', { id: `${flow.id}-t` }, `${flow.title}：循序圖`));
    const marker = `arrow-${index}`;
    const defs = svg('defs');
    const head = svg('marker', { id: marker, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    head.append(svg('path', { d: 'M0 0L10 5L0 10z', class: 'dg-head' }));
    defs.append(head); root.append(defs);

    let y = top + 18;
    const body = svg('g');
    for (const step of flow.steps) {
      if (Array.isArray(step)) {
        const [from, to, text, kind] = step;
        const lines = wrap(text, Math.max(22, Math.abs(to - from) * 30 - 4));
        y += lines.length * lineHeight + 8;
        const [x1, x2] = [x(from), x(to)];
        const mid = (x1 + x2) / 2;
        lines.forEach((line, i) => body.append(svg('text', { x: mid, y: y - 8 - (lines.length - 1 - i) * lineHeight, class: 'dg-label' }, line)));
        body.append(svg('line', { x1, y1: y, x2: x2 + (x2 > x1 ? -2 : 2), y2: y, class: kind === 'reply' ? 'dg-arrow reply' : 'dg-arrow', 'marker-end': `url(#${marker})` }));
        y += 14;
      } else {
        const [first, last] = step.over;
        const left = x(first) - lane / 2 + 10, right = x(last) + lane / 2 - 10;
        const lines = wrap(step.note, Math.floor((right - left) / 6.6));
        const height = lines.length * lineHeight + 14;
        y += 6;
        body.append(svg('rect', { x: left, y, width: right - left, height, rx: 8, class: 'dg-note' }));
        lines.forEach((line, i) => body.append(svg('text', { x: (left + right) / 2, y: y + 19 + i * lineHeight, class: 'dg-note-text' }, line)));
        y += height + 10;
      }
    }
    const bottom = y + 16;
    flow.actors.forEach((actor, i) => {
      root.append(svg('line', { x1: x(i), y1: top, x2: x(i), y2: bottom, class: 'dg-life' }));
      root.append(svg('rect', { x: x(i) - 84, y: 18, width: 168, height: 40, rx: 10, class: 'dg-actor' }));
      root.append(svg('text', { x: x(i), y: 43, class: 'dg-actor-text' }, actor));
    });
    root.append(body);
    root.setAttribute('viewBox', `0 0 ${width} ${bottom + 8}`);
    root.style.minWidth = `${Math.min(width, 560)}px`;
    return root;
  }

  document.getElementById('flows').append(...DATA.flows.map((flow, index) => {
    const steps = el('ol', {}, ...flow.steps.map((step) => Array.isArray(step)
      ? el('li', { text: `${flow.actors[step[0]]} → ${flow.actors[step[1]]}：${step[2]}` })
      : el('li', { class: 'as-note', text: step.note })));
    return el('article', { class: 'flow', id: flow.id },
      el('h3', { text: flow.title }), el('p', { text: flow.intro }),
      el('div', { class: 'diagram scroll' }, drawFlow(flow, index)),
      el('details', {}, el('summary', { text: '以文字顯示步驟' }), steps));
  }));

  // ---- Open decisions --------------------------------------------------------------------------------------

  let filter = 'all';
  for (const chip of document.querySelectorAll('.decision-filter .chip')) chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    document.querySelectorAll('.decision-filter .chip').forEach((c) => c.classList.toggle('on', c === chip));
    renderDecisions();
  });

  function renderDecisions() {
    const list = document.getElementById('decision-list');
    const isDecided = (d) => Boolean(state.decisions[d.id]?.choice);
    const visible = DATA.decisions.filter((d) => filter === 'all' || (filter === 'decided') === isDecided(d));
    const groups = [...new Set(visible.map((d) => d.group))];
    list.replaceChildren(...groups.flatMap((group) => [
      el('h3', { class: 'group', text: group }),
      ...visible.filter((d) => d.group === group).map((d) => {
        const answer = state.decisions[d.id] ?? { choice: null, note: '' };
        const set = (patch) => { state.decisions[d.id] = { ...answer, ...patch, updatedAt: new Date().toISOString() }; save(); };
        const options = el('div', { class: 'options', role: 'radiogroup', 'aria-label': d.title }, ...d.options.map((option) => {
          const input = el('input', { type: 'radio', name: d.id, value: option });
          input.checked = answer.choice === option;
          input.addEventListener('change', () => { set({ choice: option }); renderDecisions(); });
          return el('label', { class: 'option' }, input, el('span', { text: option }));
        }));
        const note = el('input', { type: 'text', value: answer.note, placeholder: '結論、負責人、日期…', 'aria-label': `「${d.title}」的結論` });
        note.addEventListener('change', () => { set({ choice: state.decisions[d.id]?.choice ?? answer.choice, note: note.value.trim() }); });
        const clear = answer.choice ? el('button', { class: 'btn ghost small', type: 'button', text: '清除', onclick: () => { delete state.decisions[d.id]; save(); renderDecisions(); } }) : null;
        return el('article', { class: isDecided(d) ? 'decision decided' : 'decision', id: d.id },
          el('header', {}, el('h4', { text: d.title }), el('span', { class: 'tag', text: isDecided(d) ? '已在此決定' : '待決定' })),
          el('p', { class: 'q', text: d.question }), el('p', { class: 'context', text: d.context }),
          options, el('div', { class: 'row' }, note, clear));
      }),
    ]));
    if (!visible.length) list.append(el('p', { class: 'empty', text: filter === 'decided' ? '這一頁還沒有做出任何決定。' : '所有事項都已有結論。' }));
  }

  renderNotes();
  renderDecisions();
  if (!storageWorks) announce('無法使用本機儲存空間；關閉頁面後筆記不會保留。');
})();
