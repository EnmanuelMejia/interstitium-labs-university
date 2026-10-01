/* Interstitium Labs — command palette (Ctrl/⌘+K).
   Searches academies, paths, assessments, and chrome actions.
   Enhancement-only: never throws into page code. */
(function () {
  'use strict';

  var IL = window.IL || {};
  var open = false, items = [], sel = 0, input = null, listEl = null, veil = null;

  var ACTIONS = [
    { kind: 'go', title: 'Pantheon (home)', sub: 'Cinematic index', href: 'index.html' },
    { kind: 'go', title: 'All paths', sub: 'Filter by role · skill · cert · time', href: 'paths.html' },
    { kind: 'go', title: 'Assessments', sub: 'Diagnostics, gates, timed sittings', href: 'assess.html' },
    { kind: 'go', title: 'My courses', sub: 'Local mastery ledger', href: 'courses.html' },
    { kind: 'go', title: 'Enroll', sub: 'Tiers and enrollment', href: 'enroll.html' },
    { kind: 'go', title: 'Honesty ledger', sub: 'What is real, offline, or soon', href: 'honesty.html' },
    { kind: 'go', title: 'About', sub: 'Doctrine and the founder', href: 'about.html' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function buildIndex() {
    var idx = ACTIONS.slice();
    try {
      (IL.academies ? IL.academies() : []).forEach(function (a) {
        idx.push({
          kind: 'academy', title: a.name, sub: (a.code || '') + ' · ' + IL.fmtHours(a.hours),
          href: 'academy.html?id=' + encodeURIComponent(a.code), hay: (a.code + ' ' + a.name + ' ' + (a.tagline || '')).toLowerCase()
        });
      });
      (IL.paths ? IL.paths() : []).forEach(function (p) {
        idx.push({
          kind: 'path', title: p.title, sub: (p.academy || '') + ' · ' + (p.difficulty || p.type || ''),
          href: 'path.html?id=' + encodeURIComponent(p.id), hay: (p.id + ' ' + p.title + ' ' + (p.subtitle || '') + ' ' + (p.tags || []).join(' ')).toLowerCase()
        });
      });
      (IL.assessments ? IL.assessments() : []).forEach(function (a) {
        idx.push({
          kind: 'assess', title: a.title || a.id, sub: (a.kind || 'assessment') + ' · ' + (a.pathTitle || ''),
          href: 'assess.html?a=' + encodeURIComponent(a.id), hay: ((a.id || '') + ' ' + (a.title || '') + ' ' + (a.kind || '')).toLowerCase()
        });
      });
    } catch (e) { /* index degrades to actions */ }
    idx.forEach(function (it) { if (!it.hay) it.hay = (it.title + ' ' + it.sub).toLowerCase(); });
    return idx;
  }

  function score(it, toks) {
    var s = 0;
    toks.forEach(function (t) {
      var i = it.hay.indexOf(t);
      if (i === -1) { s = -1e9; return; }
      s += (i === 0 ? 3 : 1) + (it.title.toLowerCase().indexOf(t) === 0 ? 2 : 0);
    });
    return s;
  }

  function filter(q) {
    var idx = buildIndex();
    var toks = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return idx.slice(0, 9);
    return idx
      .map(function (it) { return { it: it, s: score(it, toks) }; })
      .filter(function (r) { return r.s > -1e8; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 9)
      .map(function (r) { return r.it; });
  }

  function render() {
    listEl.innerHTML = '';
    if (!items.length) {
      listEl.innerHTML = '<div class="il-pal-empty">No matches. Try an academy code (IL-04), a skill (CIDR), or a cert (AZ-104).</div>';
      return;
    }
    items.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'il-pal-item';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      b.innerHTML = '<span class="kind">' + esc(it.kind) + '</span>' +
        '<span><span>' + esc(it.title) + '</span>' +
        (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + '</span>' +
        '<span class="go" aria-hidden="true">→</span>';
      b.addEventListener('click', function () { go(it); });
      b.addEventListener('mousemove', function () { if (sel !== i) { sel = i; paintSel(); } });
      listEl.appendChild(b);
    });
  }

  function paintSel() {
    Array.prototype.forEach.call(listEl.children, function (c, i) {
      if (c.classList) c.setAttribute('aria-selected', i === sel ? 'true' : 'false');
    });
    var active = listEl.children[sel];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  function go(it) {
    close();
    window.location.href = it.href;
  }

  function openPal() {
    if (open) return;
    open = true; sel = 0;
    veil = document.createElement('div');
    veil.className = 'il-pal-veil';
    veil.innerHTML =
      '<div class="il-pal" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<div class="il-pal-inputrow"><span class="glyph" aria-hidden="true">◈</span>' +
      '<input class="il-pal-input" type="text" placeholder="Search academies, paths, assessments…" aria-label="Search the curriculum" autocomplete="off" spellcheck="false">' +
      '<kbd>esc</kbd></div>' +
      '<div class="il-pal-list" role="listbox" aria-label="Results"></div>' +
      '<div class="il-pal-foot"><span><b>↑↓</b> move</span><span><b>↵</b> open</span><span><b>esc</b> close</span></div>' +
      '</div>';
    document.body.appendChild(veil);
    input = veil.querySelector('.il-pal-input');
    listEl = veil.querySelector('.il-pal-list');
    items = filter('');
    render();
    requestAnimationFrame(function () { veil.classList.add('open'); });
    input.addEventListener('input', function () { sel = 0; items = filter(input.value); render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { sel = Math.min(sel + 1, items.length - 1); paintSel(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { sel = Math.max(sel - 1, 0); paintSel(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) go(items[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    veil.addEventListener('mousedown', function (e) { if (e.target === veil) close(); });
    setTimeout(function () { if (input) input.focus(); }, 30);
  }

  function close() {
    if (!open) return;
    open = false;
    if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
    veil = null; input = null; listEl = null;
  }

  document.addEventListener('keydown', function (e) {
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't hijack typing
      e.preventDefault();
      if (open) close(); else openPal();
    } else if (e.key === 'Escape' && open) {
      close();
    }
  });
  document.addEventListener('il:palette-open', openPal);
  // Rebuild the index when the catalog lands.
  document.addEventListener('il:catalog', function () { if (open && input) { items = filter(input.value); render(); } });
})();
