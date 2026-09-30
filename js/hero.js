/* Interstitium Labs — AI Pantheon battle sequence.
   Two original AI-entity constructs (SENTINEL-9, NULLWEAVER) duel by opening
   terminals and running commands. Everything is drawn procedurally in code —
   no hotlinked art, no footage, no audio files. Audio is an opt-in WebAudio
   synth, muted by default, created only on user gesture. */
(function () {
  'use strict';

  var IL = (window.IL = window.IL || {});
  var hero = {};
  IL.hero = hero;

  var GOLD = '#c9a227', GOLD_B = '#e3bd45', CYAN = '#62d8e9', CYAN_D = '#2fa9bd';

  /* ================= quality / capability ================= */
  function detectQuality() {
    var hc = navigator.hardwareConcurrency || 4;
    var dm = navigator.deviceMemory || 4;
    var score = Math.min(hc / 8, 1) * 0.6 + Math.min(dm / 8, 1) * 0.4;
    return {
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      maxTerms: score > 0.7 ? 42 : score > 0.4 ? 26 : 14,
      maxParts: score > 0.7 ? 120 : score > 0.4 ? 70 : 34,
      maxGlyphs: score > 0.7 ? 80 : 44,
      glow: score > 0.35,
      level: score > 0.7 ? 'high' : score > 0.4 ? 'mid' : 'low'
    };
  }

  function reducedMotionWanted() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ================= procedural command corpus ================= */
  var CMDS = [
    'nmap -sS -T4 --top-ports 1000 10.8.4.0/24',
    'kubectl rollout status deploy/sentinel-core -n pantheon',
    'python3 volley.py --target 10.8.4.12 --lhost 10.8.4.2',
    'SELECT entity, ops FROM pantheon WHERE mastery < 0.7 ORDER BY gap DESC;',
    'git push origin feat/pantheon-volley --force-with-lease',
    'terraform apply -target=module.nullweaver -auto-approve',
    'openssl s_client -connect vault.internal:443 -tls1_3',
    'kubectl exec -it nullweaver-0 -- sh -c "cat /proc/self/maps"',
    'hydra -l operator -P /usr/share/wordlists/pantheon.txt ssh://10.8.4.20',
    'nuclei -u https://relay.internal -t cves/ -severity critical',
    'ssh -i ~/.ssh/pantheon forge@10.8.4.30 "uptime; who"',
    'psql -h db.internal -U analyst -c "\\dt+"',
    'docker buildx build -t il/pantheon:latest --push .',
    'jq \'.entities[] | select(.ops > 9000)\' /var/lib/pantheon/state.json',
    'tshark -i eth0 -Y "tcp.port==443" -T fields -e tls.handshake.extensions_server_name',
    'ansible-playbook volley.yml -i inventory/pantheon --forks 50',
    'hashcat -m 22000 capture.hc22000 wordlists/pantheon.txt --status',
    'kubectl top pods -n pantheon --sort-by=cpu --no-headers | head -8',
    'cargo build --release --features pantheon',
    'go test ./internal/pantheon/... -race -count=1',
    'node --inspect relay.js & disown',
    'rsync -aPhz /srv/corpus/ forge@10.8.4.31:/srv/corpus/',
    'wg show pantheon0 latest-handshakes',
    'kustomize build overlays/volley | kubectl apply -f -',
    'sqlite3 fringe.db "SELECT topic, mastery FROM topics WHERE due < date(\'now\');"',
    'strace -f -e trace=network ./sentinel-9 2>&1 | head -40',
    'ip route add 10.9.0.0/16 via 10.8.4.1 dev pantheon0',
    'systemctl --user restart pantheon-relay',
    'find /srv -type f -name "*.cap" -mmin -30 | xargs -I{} cp {} /tmp/volley/',
    'awk \'{s+=$3} END {print s/NR}\' /var/log/pantheon/ops.log',
    'xxd -l 64 -p /dev/urandom | tr -d "\\n"',
    'curl -s https://relay.internal/healthz | jq .entities',
    'chmod 600 ~/.ssh/pantheon && ssh-add -l',
    'make -C ~/superlab kind-up ARGS="--volley"',
    'pandoc brief.md -o brief.pdf --pdf-engine=xelatex',
    'ffmpeg -f x11grab -i :0 -t 5 /tmp/keyframe.mp4 -y 2>/dev/null'
  ];
  var TITLES = ['bash', 'zsh', 'psql', 'python3', 'kubectl', 'nmap', 'sh', 'irb'];

  function pick(a, r) { return a[(r() * a.length) | 0]; }

  /* mulberry32 — deterministic per-session rng so the keyframe is stable */
  function rng32(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================= entities ================= */
  function makeEntity(name, color, core, side) {
    return {
      name: name, color: color, core: core, side: side, // side: -1 left, +1 right
      flare: 0, shake: 0, surge: 0, wob: Math.random() * 6.28,
      ops: 4000 + ((Math.random() * 3000) | 0)
    };
  }

  function poly(ctx, cx, cy, r, n, rot) {
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var a = rot + (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /* Original angular mecha-sigil construct. Faceted nucleus, orbit rings,
     orbiting shards, crest chevron — drawn fresh every frame from code. */
  function drawEntity(ctx, e, x, y, s, t, q) {
    var shakeX = e.shake > 0 ? (Math.random() - 0.5) * 10 * e.shake : 0;
    var shakeY = e.shake > 0 ? (Math.random() - 0.5) * 8 * e.shake : 0;
    x += shakeX; y += shakeY + Math.sin(t * 0.9 + e.wob) * 10 * s;
    var flare = e.flare;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * e.side, s); // mirror so each faces its rival

    var glow = q.glow ? 18 + flare * 40 : 0;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = glow;

    // orbit rings
    ctx.strokeStyle = e.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4;
    ctx.save(); ctx.rotate(-0.42 + Math.sin(t * 0.25) * 0.06);
    ctx.beginPath(); ctx.ellipse(0, 0, 118, 44, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.globalAlpha = 0.28;
    ctx.save(); ctx.rotate(0.5 - t * 0.08);
    ctx.beginPath(); ctx.ellipse(0, 0, 96, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

    // orbiting shards (angular mecha plating)
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#0a0e15';
    ctx.strokeStyle = e.color; ctx.lineWidth = 1.6;
    for (var i = 0; i < 7; i++) {
      var a = t * (0.22 + i * 0.017) + (i / 7) * Math.PI * 2;
      var rr = 128 + Math.sin(t * 0.7 + i * 2.1) * 10;
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.42;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + 0.6);
      ctx.beginPath();
      ctx.moveTo(0, -13); ctx.lineTo(9, 4); ctx.lineTo(0, 11); ctx.lineTo(-9, 4);
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // crest chevron (head-like crown facing the rival)
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#0a0e15';
    ctx.beginPath();
    ctx.moveTo(34, -58); ctx.lineTo(78, -30); ctx.lineTo(52, -22); ctx.lineTo(70, -6);
    ctx.lineTo(30, -30); ctx.closePath(); ctx.fill(); ctx.stroke();

    // nucleus: faceted hexagon core
    ctx.globalAlpha = 1;
    poly(ctx, 0, 0, 46, 6, t * 0.12);
    ctx.fillStyle = '#070a10'; ctx.fill();
    ctx.strokeStyle = e.color; ctx.lineWidth = 2.2; ctx.stroke();
    poly(ctx, 0, 0, 30, 6, -t * 0.2);
    ctx.strokeStyle = e.core; ctx.lineWidth = 1.4; ctx.stroke();
    var pulse = 0.72 + 0.28 * Math.sin(t * 2.4) + flare * 0.5;
    ctx.fillStyle = e.core; ctx.globalAlpha = Math.min(1, pulse);
    ctx.beginPath(); ctx.arc(0, 0, 11 + flare * 6, 0, Math.PI * 2); ctx.fill();

    // flare ring when a volley lands
    if (flare > 0.01) {
      ctx.globalAlpha = flare * 0.9;
      ctx.strokeStyle = e.core; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 60 + (1 - flare) * 130, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = flare * 0.35;
      ctx.beginPath(); ctx.arc(0, 0, 90 + (1 - flare) * 170, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /* ================= terminals ================= */
  function spawnTerminal(st, e, r, opts) {
    opts = opts || {};
    if (st.terms.length >= st.q.maxTerms) st.terms.shift();
    var dir = -e.side; // terminals fly toward the rival
    var w = st.w, h = st.h;
    var depth = opts.depth != null ? opts.depth : r();
    var scale = 0.55 + (1 - depth) * 0.75;
    var speed = (60 + r() * 90) * (0.5 + (1 - depth) * 0.9) * (opts.fast ? 1.8 : 1);
    var lines = [];
    var n = 2 + ((r() * 3) | 0);
    for (var i = 0; i < n; i++) lines.push(pick(CMDS, r));
    st.terms.push({
      x: opts.x != null ? opts.x : w / 2 + e.side * w * 0.26 + (r() - 0.5) * w * 0.1,
      y: opts.y != null ? opts.y : h * 0.42 + (r() - 0.5) * h * 0.3,
      vx: dir * speed * (0.7 + r() * 0.6),
      vy: (r() - 0.5) * 26,
      scale: scale, depth: depth,
      owner: e, color: e.color, core: e.core,
      lines: lines, shown: 0, title: e.name.toLowerCase() + ' — ' + pick(TITLES, r),
      age: 0, life: 9 + r() * 7, spawnedChild: false,
      w: 210 + r() * 90, h: 96 + n * 15
    });
  }

  function drawTerminal(ctx, tm, t, q) {
    var w = tm.w * tm.scale, h = tm.h * tm.scale;
    var alpha = Math.min(1, tm.age * 2) * (0.35 + (1 - tm.depth) * 0.65);
    if (tm.age > tm.life - 1.5) alpha *= Math.max(0, (tm.life - tm.age) / 1.5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(tm.x, tm.y);
    if (q.glow) { ctx.shadowColor = tm.color; ctx.shadowBlur = 10 * (1 - tm.depth * 0.6); }
    // body
    ctx.fillStyle = 'rgba(7,10,16,0.92)';
    ctx.strokeStyle = tm.color; ctx.lineWidth = 1.1;
    roundRect(ctx, -w / 2, -h / 2, w, h, 6 * tm.scale);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // title bar
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(-w / 2, -h / 2, w, 15 * tm.scale);
    ctx.fillStyle = tm.color; ctx.globalAlpha = Math.max(0, alpha) * 0.9;
    ctx.font = (8.5 * tm.scale + 3) + 'px ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(tm.title.slice(0, 30), -w / 2 + 6 * tm.scale, -h / 2 + 8 * tm.scale);
    // streaming lines
    var fs = (8.5 * tm.scale + 2.5);
    ctx.font = fs + 'px ui-monospace, Menlo, monospace';
    var lh = fs * 1.5, ly = -h / 2 + 15 * tm.scale + lh * 0.8;
    var chars = tm.shown | 0;
    for (var i = 0; i < tm.lines.length && chars > 0; i++) {
      var line = tm.lines[i];
      var take = Math.min(line.length, chars);
      chars -= line.length;
      ctx.fillStyle = i === 0 ? tm.core : tm.color;
      ctx.globalAlpha = Math.max(0, alpha) * (i === 0 ? 1 : 0.75);
      var prompt = (i === 0 ? '$ ' : '  ');
      ctx.fillText(prompt + line.slice(0, take), -w / 2 + 6 * tm.scale, ly);
      if (take < line.length) { // block cursor
        var cw = ctx.measureText(prompt + line.slice(0, take)).width;
        ctx.fillStyle = tm.core;
        ctx.fillRect(-w / 2 + 6 * tm.scale + cw + 2, ly - fs * 0.42, fs * 0.55, fs * 0.85);
      }
      ly += lh;
      if (ly > h / 2 - 4 * tm.scale) break;
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ================= particles: code rain + embers ================= */
  var GLYPHS = '$#>_01{}[]/\\|;:=+*'.split('');
  function spawnParticle(st, r) {
    if (st.parts.length >= st.q.maxParts) return;
    var gold = r() < 0.5;
    st.parts.push({
      x: r() * st.w, y: -20 - r() * 60,
      vy: 40 + r() * 120, vx: (r() - 0.5) * 24,
      g: pick(GLYPHS, r), color: gold ? GOLD : CYAN,
      size: 9 + r() * 8, alpha: 0.12 + r() * 0.3, life: 6 + r() * 6, age: 0
    });
  }

  /* ================= battle state ================= */
  function createScene(canvas, opts) {
    opts = opts || {};
    var q = detectQuality();
    var ctx = canvas.getContext('2d');
    var r = opts.rng || Math.random;
    var st = {
      canvas: canvas, ctx: ctx, q: q, r: r,
      w: 0, h: 0,
      terms: [], parts: [], glyphs: [],
      gold: makeEntity('SENTINEL-9', GOLD, GOLD_B, -1),
      cyan: makeEntity('NULLWEAVER', CYAN, CYAN, 1),
      t: opts.t0 || 0,
      volleyIn: 2.5, volley: null,
      running: false, raf: 0, last: 0,
      visible: true, skipped: false,
      plates: opts.plates || null
    };
    // ambient glyph field
    for (var i = 0; i < q.maxGlyphs; i++) {
      st.glyphs.push({ x: r(), y: r(), s: 8 + r() * 10, c: r() < 0.5 ? GOLD : CYAN, a: 0.05 + r() * 0.1, tw: r() * 6.28 });
    }
    resize(st);
    return st;
  }

  function resize(st) {
    var c = st.canvas;
    var rect = c.getBoundingClientRect();
    var w = Math.max(320, rect.width), h = Math.max(420, rect.height);
    st.w = w; st.h = h;
    c.width = Math.round(w * st.q.dpr);
    c.height = Math.round(h * st.q.dpr);
    st.ctx.setTransform(st.q.dpr, 0, 0, st.q.dpr, 0, 0);
  }

  function director(st, dt) {
    var r = st.r;
    st.volleyIn -= dt;
    if (st.volleyIn <= 0 && !st.volley) {
      // a volley begins: pick attacker (mild alternation so the duel reads)
      var attacker = st.volleyLast === st.gold ? st.cyan : (st.volleyLast === st.cyan && r() < 0.7 ? st.gold : (r() < 0.5 ? st.gold : st.cyan));
      var defender = attacker === st.gold ? st.cyan : st.gold;
      st.volley = { attacker: attacker, defender: defender, t: 0, dur: 2.2 + r() * 1.4 };
      st.volleyLast = attacker;
      attacker.flare = 1;
      attacker.surge = 1;
      defender.shake = 1;
      st.volleyIn = 3.5 + r() * 4;
      // burst of terminals across the midline — the cascade overwhelms
      var n = 7 + ((r() * 6) | 0);
      for (var i = 0; i < n; i++) {
        spawnTerminal(st, attacker, r, {
          depth: r() * 0.5, fast: true,
          x: st.w / 2 + attacker.side * st.w * 0.2 + (r() - 0.5) * 120,
          y: st.h * 0.4 + (r() - 0.5) * st.h * 0.34
        });
      }
      attacker.ops += 900 + ((r() * 2200) | 0);
    }
    if (st.volley) {
      st.volley.t += dt;
      var v = st.volley;
      // during a volley the attacker's cascade spawns freely, defender is suppressed
      if (r() < dt * 6) spawnTerminal(st, v.attacker, r, { depth: r() * 0.6 });
      v.attacker.ops += dt * 900;
      v.defender.ops += dt * 220; // defender still computes, but is losing
      if (v.t >= v.dur) {
        v.attacker.surge = 0;
        st.volley = null;
      }
    }
    // decay
    [st.gold, st.cyan].forEach(function (e) {
      e.flare = Math.max(0, e.flare - dt * 0.7);
      e.shake = Math.max(0, e.shake - dt * 1.4);
    });
    // baseline spawn pressure: each side keeps a standing cascade
    if (r() < dt * (st.volley ? 1.2 : 3.2)) spawnTerminal(st, st.gold, r);
    if (r() < dt * (st.volley ? 1.2 : 3.2)) spawnTerminal(st, st.cyan, r);
    if (!st.volley) { st.gold.ops += dt * 320; st.cyan.ops += dt * 320; }
    if (r() < dt * 8) spawnParticle(st, r);
  }

  function step(st, dt) {
    st.t += dt;
    director(st, dt);
    var r = st.r;
    // terminals
    for (var i = st.terms.length - 1; i >= 0; i--) {
      var tm = st.terms[i];
      tm.age += dt;
      tm.x += tm.vx * dt;
      tm.y += tm.vy * dt + Math.sin(st.t * 2 + i) * 6 * dt;
      tm.shown += dt * 46;
      // recursive opening: a terminal occasionally births a child terminal
      if (!tm.spawnedChild && tm.age > 1.2 && r() < dt * 0.5 && st.terms.length < st.q.maxTerms) {
        tm.spawnedChild = true;
        spawnTerminal(st, tm.owner, r, {
          depth: Math.min(1, tm.depth + 0.25),
          x: tm.x + (r() - 0.5) * 160, y: tm.y + (r() - 0.5) * 120
        });
      }
      if (tm.age > tm.life || tm.x < -320 || tm.x > st.w + 320) st.terms.splice(i, 1);
    }
    // particles
    for (var j = st.parts.length - 1; j >= 0; j--) {
      var p = st.parts[j];
      p.age += dt; p.y += p.vy * dt; p.x += p.vx * dt;
      if (p.age > p.life || p.y > st.h + 30) st.parts.splice(j, 1);
    }
  }

  function paint(st) {
    var ctx = st.ctx, w = st.w, h = st.h, t = st.t, q = st.q;
    // cinematic grade: near-black with vignette
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04060a'); g.addColorStop(0.55, '#060a12'); g.addColorStop(1, '#030509');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // faint battlefield grid
    ctx.strokeStyle = 'rgba(98,216,233,0.045)'; ctx.lineWidth = 1;
    var gs = 64;
    ctx.beginPath();
    for (var gx = (w / 2) % gs; gx < w; gx += gs) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
    for (var gy = 0; gy < h; gy += gs) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
    ctx.stroke();

    // ambient glyph field
    ctx.textBaseline = 'middle';
    st.glyphs.forEach(function (gl, i) {
      var yy = ((gl.y + t * 0.008 * (1 + (i % 3) * 0.4)) % 1) * h;
      ctx.globalAlpha = gl.a * (0.6 + 0.4 * Math.sin(t * 1.4 + gl.tw));
      ctx.fillStyle = gl.c;
      ctx.font = gl.s + 'px ui-monospace, Menlo, monospace';
      ctx.fillText(GLYPHS[(i + ((t * 2) | 0)) % GLYPHS.length], gl.x * w, yy);
    });
    ctx.globalAlpha = 1;

    // midline shimmer — the contested boundary between the two cascades
    var mid = w / 2 + Math.sin(t * 0.7) * 24;
    var mg = ctx.createLinearGradient(mid - 90, 0, mid + 90, 0);
    mg.addColorStop(0, 'rgba(0,0,0,0)');
    mg.addColorStop(0.5, st.volley ? hexA(st.volley.attacker.color, 0.16) : 'rgba(120,130,150,0.07)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.fillRect(mid - 90, 0, 180, h);

    // terminals far -> near
    var sorted = st.terms.slice().sort(function (a, b) { return b.depth - a.depth; });
    sorted.forEach(function (tm) { drawTerminal(ctx, tm, t, q); });

    // entities (near layer, above the far terminals)
    var s = Math.min(w, h) / 560;
    s = Math.max(0.55, Math.min(1.25, s));
    drawEntity(ctx, st.gold, w * 0.16, h * 0.40, s, t, q);
    drawEntity(ctx, st.cyan, w * 0.84, h * 0.40, s, t + 2.1, q);

    // particles
    st.parts.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.alpha * (1 - p.age / p.life));
      ctx.fillStyle = p.color;
      ctx.font = p.size + 'px ui-monospace, Menlo, monospace';
      ctx.fillText(p.g, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    // vignette
    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function updatePlates(st) {
    if (!st.plates) return;
    st.plates.goldOps.textContent = fmtOps(st.gold.ops) + ' OPS';
    st.plates.cyanOps.textContent = fmtOps(st.cyan.ops) + ' OPS';
  }
  function fmtOps(n) { return Math.floor(n).toLocaleString('en-US'); }

  /* ================= main loop ================= */
  function loop(st, now) {
    if (!st.running) return;
    var dt = Math.min((now - st.last) / 1000, 0.05); // delta clamp
    st.last = now;
    if (st.visible && !st.skipped) {
      step(st, dt);
      paint(st);
      st.frame = (st.frame || 0) + 1;
      if (st.frame % 15 === 0) updatePlates(st);
    }
    st.raf = requestAnimationFrame(function (n) { loop(st, n); });
  }

  function start(st) {
    if (st.running) return;
    st.running = true;
    st.last = performance.now();
    st.raf = requestAnimationFrame(function (n) { loop(st, n); });
  }
  function stop(st) {
    st.running = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
  }

  /* Static cinematic keyframe: one composed frame, no loop. */
  function renderKeyframe(st) {
    stop(st);
    st.terms = []; st.parts = [];
    var r = rng32(20260930);
    st.r = r; st.t = 9.4;
    // compose a mid-volley moment deterministically
    st.gold.flare = 0.85; st.cyan.shake = 0.6;
    for (var i = 0; i < Math.min(30, st.q.maxTerms); i++) {
      var owner = r() < 0.62 ? st.gold : st.cyan;
      spawnTerminal(st, owner, r, { depth: r(), x: r() * st.w, y: r() * st.h });
    }
    st.terms.forEach(function (tm) { tm.shown = 40 + r() * 120; tm.age = 2 + r() * 4; });
    st.gold.ops = 48210; st.cyan.ops = 41770;
    paint(st);
    updatePlates(st);
  }

  /* ================= WebAudio synth (opt-in only) ================= */
  var audio = null;
  function ensureAudio() {
    if (audio) return audio;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // low cinematic drone: two detuned sines through a lowpass
    var droneGain = ctx.createGain(); droneGain.gain.value = 0.05;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    [55, 55.6, 110.4].forEach(function (f) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      o.connect(lp); o.start();
    });
    lp.connect(droneGain); droneGain.connect(master);
    // keystroke blips, scheduled sparsely
    var blipTimer = 0;
    function blip() {
      var t0 = ctx.currentTime;
      var o = ctx.createOscillator(); o.type = 'square';
      o.frequency.value = 1400 + Math.random() * 1800;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.028, t0);
      g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.045);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 0.06);
    }
    audio = {
      ctx: ctx, master: master,
      on: false, blipTimer: 0,
      setOn: function (on) {
        this.on = on;
        if (on) {
          ctx.resume();
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.6);
          this.blipTimer = setInterval(function () {
            if (audio.on && Math.random() < 0.7) blip();
          }, 420);
        } else {
          master.gain.setTargetAtTime(0.0, ctx.currentTime, 0.25);
          clearInterval(this.blipTimer);
          setTimeout(function () { if (!audio.on) ctx.suspend(); }, 900);
        }
      }
    };
    return audio;
  }

  /* ================= init on index.html ================= */
  hero.init = function () {
    var section = document.querySelector('.pantheon');
    if (!section) return null;
    var canvas = document.getElementById('pantheon-canvas');
    if (!canvas) return null;

    var plates = {
      goldOps: document.getElementById('plate-gold-ops'),
      cyanOps: document.getElementById('plate-cyan-ops')
    };
    if (!plates.goldOps || !plates.cyanOps) plates = null;

    var st = createScene(canvas, { plates: plates });
    hero.scene = st;

    var btnSkip = document.getElementById('pantheon-skip');
    var btnMotion = document.getElementById('pantheon-motion');
    var btnSound = document.getElementById('pantheon-sound');
    var summary = document.getElementById('pantheon-summary');

    var motionReduced = reducedMotionWanted();
    var skipped = false;

    function applyMotionState() {
      if (motionReduced || skipped) {
        renderKeyframe(st);
        if (btnMotion) { btnMotion.setAttribute('aria-pressed', 'true'); btnMotion.textContent = 'Motion: reduced'; }
        if (summary) summary.hidden = false;
        // sound off when the scene is stilled
        setSound(false);
      } else {
        if (btnMotion) { btnMotion.setAttribute('aria-pressed', 'false'); btnMotion.textContent = 'Reduce motion'; }
        if (summary) summary.hidden = true;
        start(st);
      }
    }

    function setSound(on) {
      var a = ensureAudio();
      if (!a) { // WebAudio unavailable: the toggle must not pretend
        if (btnSound) { btnSound.disabled = true; btnSound.textContent = 'Sound unavailable'; }
        return;
      }
      a.setOn(on);
      if (btnSound) {
        btnSound.setAttribute('aria-pressed', String(on));
        btnSound.textContent = on ? 'Sound: on' : 'Sound: off';
      }
    }

    if (btnSkip) btnSkip.addEventListener('click', function () {
      skipped = true;
      applyMotionState();
      var main = document.getElementById('il-main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
      if (main) main.scrollIntoView({ behavior: motionReduced ? 'auto' : 'smooth', block: 'start' });
    });

    if (btnMotion) btnMotion.addEventListener('click', function () {
      motionReduced = !motionReduced;
      skipped = false;
      applyMotionState();
    });

    if (btnSound) btnSound.addEventListener('click', function () {
      var a = ensureAudio();
      var on = !(a && a.on);
      setSound(on);
    });

    // pause when offscreen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          st.visible = e.isIntersecting;
          if (st.visible && !motionReduced && !skipped) start(st);
        });
      }, { threshold: 0.05 }).observe(section);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { st.visible = false; }
      else { st.visible = true; if (!motionReduced && !skipped) start(st); }
    });
    window.addEventListener('resize', function () { resize(st); if (motionReduced || skipped) renderKeyframe(st); });

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onChange = function (e) { motionReduced = e.matches; skipped = false; applyMotionState(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    applyMotionState();
    return st;
  };

  /* ================= .terminal-storm subtle variant =================
     Reuses the cascade motif at low density for section transitions. */
  hero.attachStorm = function (root) {
    if (!root || reducedMotionWanted()) return;
    var canvas = root.querySelector('canvas');
    if (!canvas) return;
    var q = detectQuality();
    q.maxTerms = 5; q.maxParts = 12; q.glow = false;
    var ctx = canvas.getContext('2d');
    var r = Math.random;
    var W = 0, H = 120;
    function size() {
      var rect = root.getBoundingClientRect();
      W = Math.max(300, rect.width); H = 120;
      canvas.width = W * q.dpr; canvas.height = H * q.dpr;
      ctx.setTransform(q.dpr, 0, 0, q.dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);
    var terms = [];
    var t = 0, last = performance.now(), running = true, raf = 0;
    var vis = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0 }).observe(root);
    }
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!vis) return;
      var dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
      if (r() < dt * 1.4 && terms.length < q.maxTerms) {
        var gold = r() < 0.5;
        terms.push({
          x: r() * W, y: H + 20, vy: -(30 + r() * 40),
          w: 150 + r() * 70, h: 54, age: 0, life: 4 + r() * 3,
          color: gold ? GOLD : CYAN, core: gold ? GOLD_B : CYAN,
          line: pick(CMDS, r), shown: 0
        });
      }
      ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, W, H);
      for (var i = terms.length - 1; i >= 0; i--) {
        var tm = terms[i];
        tm.age += dt; tm.y += tm.vy * dt; tm.shown += dt * 40;
        var a = Math.min(1, tm.age * 2) * 0.5;
        if (tm.age > tm.life - 1) a *= Math.max(0, tm.life - tm.age);
        if (tm.age >= tm.life || tm.y < -90) { terms.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = 'rgba(7,10,16,0.9)';
        ctx.strokeStyle = tm.color; ctx.lineWidth = 1;
        roundRect(ctx, tm.x - tm.w / 2, tm.y - tm.h / 2, tm.w, tm.h, 5);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = tm.core;
        ctx.font = '10px ui-monospace, Menlo, monospace';
        ctx.fillText('$ ' + tm.line.slice(0, Math.min(tm.line.length, tm.shown | 0)).slice(0, 34), tm.x - tm.w / 2 + 8, tm.y - 6);
        ctx.restore();
      }
      // sparse rising glyphs
      ctx.font = '11px ui-monospace, Menlo, monospace';
      for (var k = 0; k < 14; k++) {
        var gy = H - ((t * (18 + k * 3) + k * 97) % (H + 40));
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = k % 2 ? CYAN : GOLD;
        ctx.fillText(GLYPHS[(k + ((t * 3) | 0)) % GLYPHS.length], (k * 173) % W, gy);
      }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
    return { stop: function () { running = false; cancelAnimationFrame(raf); } };
  };

  // auto-attach to any .terminal-storm blocks present at load
  function bootStorms() {
    document.querySelectorAll('.terminal-storm').forEach(function (s) { hero.attachStorm(s); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootStorms);
  else bootStorms();
})();
