/* Interstitium Labs — shared app shell.
   Renders header/nav + footer into #il-header / #il-footer on every page,
   loads the sharded catalog (data/catalog/index.json + shards) with a graceful offline state, and provides
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
       used only when the sharded catalog (data/catalog/index.json) cannot be loaded) ---------- */
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
    { code: 'IL-10', name: 'Portfolio, Career & Professional Practice', hours: 280, tagline: 'The work is the record.', blurb: 'Inspectable evidence: labs, writeups, interviews, and the public work that outlives a badge.' },
    { code: 'IL-11', name: 'Zero Trust & Endpoint Defense', hours: 360, tagline: 'Never trust, always verify.', blurb: 'Zero Trust doctrine, AD defense, allowlisting and ringfencing, red/blue operations — distilled from the public shape of ThreatLocker\u2019s bootcamp.' }
  ];

  /* ---------- catalog loader (sharded: data/catalog/index.json lists shards;
       merged here; graceful: never throws into page code) ---------- */
  var catalogState = { data: null, error: null, offline: false };

  function emptyCatalog() {
    return { academies: [], paths: [], _empty: true };
  }

  function fetchJson(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return r.json();
    });
  }

  function loadCatalog() {
    return fetchJson('data/catalog/index.json')
      .then(function (manifest) {
        var shards = (manifest && manifest.shards) || [];
        if (!shards.length) throw new Error('empty catalog manifest');
        return Promise.all(shards.map(function (s) { return fetchJson('data/catalog/' + s); }));
      })
      .then(function (parts) {
        var academies = [], paths = [];
        parts.forEach(function (json) {
          json = json || {};
          if (Array.isArray(json.academies)) academies = academies.concat(json.academies);
          if (Array.isArray(json.paths)) paths = paths.concat(json.paths);
        });
        catalogState.data = { academies: academies, paths: paths, _empty: false };
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
    ['about.html', 'About'],
    ['https://interstitiumlabs.dev/', 'Main Site \u2197']
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
        ),
        el('button', {
          'class': 'pal-hint', type: 'button',
          'aria-label': 'Open command palette (Control K)',
          title: 'Search the curriculum (Ctrl/⌘+K)',
          onclick: function () { document.dispatchEvent(new CustomEvent('il:palette-open')); }
        }, [
          el('span', { 'class': 'pal-hint-label', text: 'Search' }),
          el('kbd', { text: 'Ctrl K' })
        ])
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

  /* ---------- scroll reveal (Palantir pass) ---------- */
  /* Explicit user motion choice (il_motion_reduced: '1'/'0') wins over the OS
     preference; with no saved choice the OS preference decides. Read live —
     the hero's motion toggle can change it mid-session. Mirrors hero.js. */
  function userReducedMotion() {
    try {
      var saved = localStorage.getItem('il_motion_reduced');
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch (e) {}
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function syncMotionDataset() {
    try { document.documentElement.dataset.motion = userReducedMotion() ? 'reduced' : 'full'; } catch (e) {}
  }

  function initReveals() {
    document.documentElement.classList.add('js');
    if (userReducedMotion() || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.il-reveal').forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // Live check: a mid-session "Reduce motion" choice stills new reveals.
        if (userReducedMotion()) { e.target.classList.add('in'); io.unobserve(e.target); return; }
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    function tag(scope) {
      var items = (scope || document).querySelectorAll(
        'main#il-main > section.block, .card, .module, .notice, .counters .counter, .terminal-storm'
      );
      items.forEach(function (n) {
        if (n.classList.contains('il-reveal')) return;
        n.classList.add('il-reveal');
        // stagger siblings sharing a parent
        var sibs = n.parentElement ? n.parentElement.querySelectorAll(':scope > .il-reveal') : [];
        var pos = sibs.length ? Array.prototype.indexOf.call(sibs, n) : 0;
        n.style.setProperty('--reveal-delay', String((pos % 6) * 55) + 'ms');
        io.observe(n);
      });
    }
    tag(document);
    // re-tag after dynamic catalog renders
    document.addEventListener('il:catalog', function () { setTimeout(function () { tag(document); }, 30); });
  }

  /* ---------- animated counters ---------- */
  var countUpIO = null;
  var countUpSeen = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
  function watchCountUps(scope) {
    if (!countUpIO) return;
    (scope || document).querySelectorAll('[data-countup]').forEach(function (n) {
      if (countUpSeen && countUpSeen.has(n)) return;
      if (countUpSeen) countUpSeen.add(n);
      countUpIO.observe(n);
    });
  }
  function initCountUp() {
    function animate(n) {
      var raw = (n.getAttribute('data-countup') || n.textContent || '').replace(/[^0-9]/g, '');
      var target = parseInt(raw, 10);
      if (!target || userReducedMotion()) return;
      var t0 = null, dur = 1100;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        n.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    if (!('IntersectionObserver' in window) || !('WeakSet' in window)) return;
    countUpIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); countUpIO.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    watchCountUps(document);
    // counters render when the catalog lands — watch then too
    document.addEventListener('il:catalog', function () { setTimeout(function () { watchCountUps(document); }, 30); });
  }

  /* ---------- page transition veil ---------- */
  function initVeil() {
    var veil = document.createElement('div');
    veil.id = 'il-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
    if (userReducedMotion()) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download')) return;
      var url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      document.body.classList.add('il-leaving');
      setTimeout(function () { window.location.href = url.href; }, 170);
    });
  }

  /* ---------- hero parallax (subtle; pantheon cinematic) ---------- */
  var parallaxOff = null;
  function initParallax() {
    if (userReducedMotion()) return;
    var sigil = document.querySelector('.pantheon-sigil');
    var copy = document.querySelector('.pantheon-copy');
    if (!sigil && !copy) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        if (y < window.innerHeight * 1.2) {
          if (sigil) sigil.style.transform = 'translateY(' + (y * 0.12).toFixed(1) + 'px)';
          if (copy) copy.style.transform = 'translateY(' + (y * 0.06).toFixed(1) + 'px)';
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    parallaxOff = function () { window.removeEventListener('scroll', onScroll); parallaxOff = null; };
  }

  /* ---------- command palette loader ---------- */
  function loadPalette() {
    var s = document.createElement('script');
    s.src = 'js/palette.js';
    s.defer = true;
    s.onerror = function () { /* palette is enhancement-only; never break chrome */ };
    document.body.appendChild(s);
  }

  /* ---------- boot ---------- */
  function boot() {
    renderHeader();
    renderFooter();
    syncMotionDataset(); // pages without hero.js still honor the persisted choice
    initReveals();
    initCountUp();
    initVeil();
    initParallax();
    loadPalette();
    // A mid-session toggle from the hero stills the rest of the page too.
    window.addEventListener('il:motionchange', function () {
      syncMotionDataset();
      if (userReducedMotion() && parallaxOff) parallaxOff();
    });
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
