/* Interstitium Labs — shared app shell.
   Renders header/nav + footer into #il-header / #il-footer on every page,
   loads data/catalog.json with a graceful offline state, and provides
   DOM + catalog helpers. No frameworks. No network calls besides the
   catalog fetch and same-origin assets. */
(function () {
  'use strict';

  var IL = (window.IL = window.IL || {});

  /* ---------- small DOM helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function fmtHours(h) {
    if (h == null || isNaN(h)) return '—';
    return Number(h).toLocaleString('en-US') + ' h';
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  IL.esc = esc;
  IL.el = el;
  IL.fmtHours = fmtHours;
  IL.qs = qs;

  /* ---------- fallback academy index (verified against the live site 2026-09-30;
       used only when data/catalog.json cannot be loaded) ---------- */
  var FALLBACK_ACADEMIES = [
    { code: 'IL-01', name: 'Esoteric Traditions & Digital Hermetica', hours: 420, tagline: 'Not a ritual school.', blurb: 'Source-critical study of Enochian records and neighboring esoteric corpora — manuscripts, reception, and method.' },
    { code: 'IL-02', name: 'Mathematical Maturity Engine', hours: 680, tagline: 'Not a worksheet mill.', blurb: 'Adaptive knowledge space — CIDR, nines, HPA, ALE, chmod — bound to certs and career tracks.' },
    { code: 'IL-03', name: 'Programming Language Forge', hours: 860, tagline: 'Code is a sitting you can fail.', blurb: 'Python, Java, C++, TypeScript, and systems languages as instruments — semantics, memory, and inspectable programs.' },
    { code: 'IL-04', name: 'Systems, Linux, Windows & Networks', hours: 740, tagline: 'Engineering is inspectable.', blurb: 'Operating systems, performance-based Linux, PowerShell, TCP/IP, and the machines certifications actually examine.' },
    { code: 'IL-05', name: 'Cloud, DevSecOps, Platform & SRE', hours: 910, tagline: 'Honesty over fleet wallpaper.', blurb: 'Azure, AWS, GCP, Kubernetes, identity, and reliability engineering as one platform practice.' },
    { code: 'IL-06', name: 'Cybersecurity & Secure Engineering', hours: 980, tagline: 'Evidence, not dumps.', blurb: 'SOC, pentest, appsec, identity, and architecture — defensive and offensive paths with evidence, not dumps.' },
    { code: 'IL-07', name: 'SQL, Data Engineering, Analytics & AI', hours: 720, tagline: 'Blueprints, not trivia.', blurb: 'Relational models, warehouses, analytics, and the statistical floor of machine learning.' },
    { code: 'IL-08', name: 'Algorithms, Compilers, Distributed & Formal', hours: 640, tagline: 'The proofs that keep systems honest.', blurb: 'Data structures, language implementation, consensus, and the proofs that keep systems honest.' },
    { code: 'IL-09', name: 'Adaptive Certification Command', hours: 1100, tagline: 'Blueprints, not trivia.', blurb: 'Computer-adaptive prep for CompTIA, Microsoft, Azure, Oracle Java, Red Hat, Python Institute, and vendor families.' },
    { code: 'IL-10', name: 'Portfolio, Career & Professional Practice', hours: 280, tagline: 'The work is the record.', blurb: 'Inspectable evidence: labs, writeups, interviews, and the public work that outlives a badge.' }
  ];

  /* ---------- catalog loader (graceful: never throws into page code) ---------- */
  var catalogState = { data: null, error: null, offline: false };

  function emptyCatalog() {
    return { academies: [], paths: [], _empty: true };
  }

  function loadCatalog() {
    return fetch('data/catalog.json', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        json = json || {};
        catalogState.data = {
          academies: Array.isArray(json.academies) ? json.academies : [],
          paths: Array.isArray(json.paths) ? json.paths : [],
          _empty: false
        };
        // Fall back to the verified academy index only if the catalog ships none.
        if (!catalogState.data.academies.length) {
          catalogState.data.academies = FALLBACK_ACADEMIES.slice();
          catalogState.data._academiesFallback = true;
        }
        document.dispatchEvent(new CustomEvent('il:catalog', { detail: catalogState.data }));
        return catalogState.data;
      })
      .catch(function (err) {
        catalogState.error = err;
        catalogState.offline = true;
        catalogState.data = emptyCatalog();
        catalogState.data.academies = FALLBACK_ACADEMIES.slice();
        catalogState.data._academiesFallback = true;
        document.dispatchEvent(new CustomEvent('il:catalog', { detail: catalogState.data }));
        return catalogState.data;
      });
  }

  IL.ready = loadCatalog();
  IL.catalogState = catalogState;
  IL.getCatalog = function () { return catalogState.data || emptyCatalog(); };
  IL.isCatalogOffline = function () { return catalogState.offline; };
  IL.onCatalog = function (fn) {
    if (catalogState.data) fn(catalogState.data);
    else document.addEventListener('il:catalog', function h(e) {
      document.removeEventListener('il:catalog', h);
      fn(e.detail);
    });
  };

  /* ---------- catalog accessors (all null-safe) ---------- */
  IL.academies = function () { return IL.getCatalog().academies || []; };
  IL.paths = function () { return IL.getCatalog().paths || []; };

  IL.academyByCode = function (code) {
    return IL.academies().find(function (a) { return a.code === code; }) || null;
  };

  IL.pathById = function (id) {
    return IL.paths().find(function (p) { return p.id === id; }) || null;
  };

  IL.pathsForAcademy = function (code) {
    return IL.paths().filter(function (p) { return p.academy === code; });
  };

  IL.assessments = function () {
    var out = [];
    IL.paths().forEach(function (p) {
      (p.assessments || []).forEach(function (a) {
        out.push(Object.assign({ pathId: p.id, pathTitle: p.title }, a));
      });
    });
    return out;
  };

  IL.assessmentById = function (id) {
    return IL.assessments().find(function (a) { return a.id === id; }) || null;
  };

  IL.totalHours = function () {
    return IL.academies().reduce(function (s, a) { return s + (Number(a.hours) || 0); }, 0);
  };

  IL.allTags = function () {
    var set = {};
    IL.paths().forEach(function (p) { (p.tags || []).forEach(function (t) { set[t] = 1; }); });
    return Object.keys(set).sort();
  };

  /* ---------- path filtering: role/skill/cert/time ---------- */
  // f = { q, type, tag, maxHours }
  IL.filterPaths = function (paths, f) {
    f = f || {};
    var q = (f.q || '').trim().toLowerCase();
    return (paths || []).filter(function (p) {
      if (f.type && p.type !== f.type) return false;
      if (f.tag && (p.tags || []).indexOf(f.tag) === -1) return false;
      if (f.maxHours && Number(p.hours) > Number(f.maxHours)) return false;
      if (q) {
        var hay = [p.title, p.subtitle, p.id, (p.tags || []).join(' '), p.academy]
          .join(' ').toLowerCase();
        // every query token must appear somewhere (skill/role/cert free text)
        var ok = q.split(/\s+/).every(function (tok) { return hay.indexOf(tok) !== -1; });
        if (!ok) return false;
      }
      return true;
    });
  };

  /* ---------- shared header ---------- */
  var NAV = [
    ['index.html', 'Pantheon'],
    ['paths.html', 'Paths'],
    ['assess.html', 'Assessments'],
    ['courses.html', 'My Courses'],
    ['enroll.html', 'Enroll'],
    ['honesty.html', 'Honesty'],
    ['about.html', 'About']
  ];

  function currentPage() {
    var p = window.location.pathname.split('/').pop() || 'index.html';
    return p.split('?')[0].split('#')[0] || 'index.html';
  }

  function renderHeader() {
    var host = document.getElementById('il-header');
    if (!host) return;
    var page = currentPage();
    var header = el('div', { 'class': 'site-header' }, [
      el('div', { 'class': 'wrap' }, [
        el('a', { 'class': 'brand', href: 'index.html', 'aria-label': 'Interstitium Labs — home' }, [
          el('img', { src: 'assets/sigil.svg', alt: '', width: 30, height: 30 }),
          el('span', { 'class': 'wordmark' }, [
            'Interstitium Labs',
            el('small', { text: 'LEARNING UNIVERSITY' })
          ])
        ]),
        el('nav', { 'class': 'site-nav', 'aria-label': 'Primary' },
          NAV.map(function (item) {
            var a = el('a', { href: item[0], text: item[1] });
            if (item[0] === page) a.setAttribute('aria-current', 'page');
            return a;
          })
        )
      ])
    ]);
    host.appendChild(header);
  }

  /* ---------- shared footer ---------- */
  function renderFooter() {
    var host = document.getElementById('il-footer');
    if (!host) return;
    var year = new Date().getFullYear();
    var foot = el('footer', { 'class': 'site-footer' }, [
      el('div', { 'class': 'wrap' }, [
        el('div', { 'class': 'seal' }, [
          el('img', { src: 'assets/sigil.svg', alt: 'Interstitium Labs sigil', width: 44, height: 44 }),
          el('div', {}, [
            el('div', { 'class': 'latin', text: 'SCIENTIA OMNIA VINCIT' }),
            el('div', { 'class': 'quatrain', text: 'Quaerere · Intelligere · Liberare · Transcendere' })
          ])
        ]),
        el('nav', { 'class': 'footer-nav', 'aria-label': 'Footer' },
          NAV.map(function (item) { return el('a', { href: item[0], text: item[1] }); })
        ),
        el('p', { 'class': 'footer-note' }, [
          'A plant, not a video LMS. Mastery lives in your browser — no fake API keys, no faked cloud fleet. ',
          'Checkout is offline on purpose until Payment Links are live. ',
          '© ' + year + ' Interstitium Labs. Founded by Enmanuel D. Mejia — the work is the record.'
        ])
      ])
    ]);
    host.appendChild(foot);
  }

  /* ---------- graceful catalog-offline notice ---------- */
  function renderOfflineNotices() {
    if (!catalogState.offline) return;
    document.querySelectorAll('[data-catalog-slot]').forEach(function (slot) {
      if (slot.dataset.offlineRendered) return;
      slot.dataset.offlineRendered = '1';
      var n = el('div', { 'class': 'notice', role: 'status' });
      n.innerHTML = '<strong>Catalog offline.</strong> The curriculum data could not be loaded ' +
        '(it is still being published). What you see below is the standing academy index. ' +
        'Retry by reloading the page — nothing here is fabricated.';
      slot.insertBefore(n, slot.firstChild);
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    renderHeader();
    renderFooter();
    IL.ready.then(renderOfflineNotices);
    // Re-run page render hooks when the catalog arrives.
    document.addEventListener('il:catalog', function () {
      if (typeof IL.renderPage === 'function') {
        try { IL.renderPage(); } catch (e) { /* page-level errors must not break chrome */ }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
