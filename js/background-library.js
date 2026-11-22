/* =======================================================================
 * Background Library — inline panel, live click-to-apply
 * -----------------------------------------------------------------------
 * Renders a curated set of stage backgrounds inside the Stage tab. Three
 * sources are merged:
 *   1. ~40 procedural SVG generators built into this file (always
 *      available, zero deploy weight)
 *   2. Bundled manifest at assets/backgrounds/manifest.json — drop your
 *      own WebP/JPG/PNG/SVG files in and add an entry
 *   3. Optional remote manifest URL the user pastes into the Advanced
 *      section (persisted in localStorage)
 *
 * Click a thumbnail → applies immediately. The stage updates live so the
 * user sees the new background in place; clicking another swaps it.
 *
 * The renderer, preview window and export pipeline already handle
 * `stage.bgType = 'image'` + `stage.bgImageSrc`, so library backgrounds
 * travel automatically into exports and the in-editor preview window.
 * ===================================================================== */

(function (global) {
    'use strict';

    const LOCAL_MANIFEST_URL = 'assets/backgrounds/manifest.json';
    const REMOTE_URL_KEY = 'bg-library-remote-url';
    const RECENT_KEY = 'bg-library-recent';
    const COLLAPSED_KEY = 'bg-library-collapsed';
    const MAX_RECENT = 10;

    /* ─── small helpers ───────────────────────────────────────────── */

    function svgDataUrl(svg) {
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    function buildSvg(inner, w, h) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
    }

    // Deterministic PRNG for stable layouts (stars, particles, etc.)
    function makeRng(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /* ─── procedural generators ──────────────────────────────────── */

    function gradient(stops, angle, w, h) {
        const a = (angle ?? 0) * Math.PI / 180;
        const x1 = (0.5 - Math.cos(a) * 0.5).toFixed(4);
        const y1 = (0.5 - Math.sin(a) * 0.5).toFixed(4);
        const x2 = (0.5 + Math.cos(a) * 0.5).toFixed(4);
        const y2 = (0.5 + Math.sin(a) * 0.5).toFixed(4);
        const list = stops.map((s, i) => `<stop offset="${s.o ?? (i / (stops.length - 1))}" stop-color="${s.c}"${s.a != null ? ` stop-opacity="${s.a}"` : ''}/>`).join('');
        return buildSvg(`<defs><linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${list}</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`, w, h);
    }

    function radial(stops, cx, cy, r, w, h, fillBg) {
        const list = stops.map((s, i) => `<stop offset="${s.o ?? (i / (stops.length - 1))}" stop-color="${s.c}"${s.a != null ? ` stop-opacity="${s.a}"` : ''}/>`).join('');
        const bg = fillBg ? `<rect width="${w}" height="${h}" fill="${fillBg}"/>` : '';
        return buildSvg(`<defs><radialGradient id="g" cx="${cx}" cy="${cy}" r="${r}">${list}</radialGradient></defs>${bg}<rect width="${w}" height="${h}" fill="url(#g)"/>`, w, h);
    }

    const PROCEDURAL = [
        // ── GRADIENTS (8) ─────────────────────────────────────────
        { id: 'grad-sunset',   category: 'gradient', name: 'Sunset Glow',   tags: ['warm','sunset','orange'],
          generate: (w, h) => gradient([{c:'#1e1b4b'},{c:'#7c3aed',o:0.45},{c:'#f97316',o:0.75},{c:'#fde68a'}], 90, w, h) },
        { id: 'grad-ocean',    category: 'gradient', name: 'Deep Ocean',    tags: ['cool','blue','sea'],
          generate: (w, h) => gradient([{c:'#0b1d3a'},{c:'#0e7490',o:0.5},{c:'#22d3ee'}], 90, w, h) },
        { id: 'grad-aurora',   category: 'gradient', name: 'Aurora',        tags: ['neon','green','purple'],
          generate: (w, h) => gradient([{c:'#0f172a'},{c:'#0ea5e9',o:0.4},{c:'#22c55e',o:0.7},{c:'#a855f7'}], 135, w, h) },
        { id: 'grad-pastel',   category: 'gradient', name: 'Pastel Sky',    tags: ['soft','pink'],
          generate: (w, h) => gradient([{c:'#fbcfe8'},{c:'#bae6fd',o:0.5},{c:'#fef3c7'}], 90, w, h) },
        { id: 'grad-fire',     category: 'gradient', name: 'Ember',         tags: ['fire','red','warm'],
          generate: (w, h) => gradient([{c:'#1c1917'},{c:'#7f1d1d',o:0.4},{c:'#dc2626',o:0.75},{c:'#fbbf24'}], 90, w, h) },
        { id: 'grad-mint',     category: 'gradient', name: 'Mint Breeze',   tags: ['fresh','green'],
          generate: (w, h) => gradient([{c:'#022c22'},{c:'#10b981',o:0.55},{c:'#a7f3d0'}], 90, w, h) },
        { id: 'grad-mono-dark',category: 'gradient', name: 'Charcoal',      tags: ['mono','dark','minimal'],
          generate: (w, h) => gradient([{c:'#0f172a'},{c:'#1e293b'},{c:'#334155'}], 135, w, h) },
        { id: 'grad-mono-light',category:'gradient', name: 'Pearl',         tags: ['mono','light','minimal'],
          generate: (w, h) => gradient([{c:'#f8fafc'},{c:'#e2e8f0'},{c:'#cbd5e1'}], 135, w, h) },

        // ── PATTERNS (6) ─────────────────────────────────────────
        { id: 'pat-grid',       category: 'pattern', name: 'Soft Grid',     tags: ['grid','clean'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#1e293b"/><defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" stroke="#334155" stroke-width="1" fill="none"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>`, w, h) },
        { id: 'pat-dots',       category: 'pattern', name: 'Soft Dots',     tags: ['dots','minimal'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#1e293b"/><defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="2" fill="#475569"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>`, w, h) },
        { id: 'pat-diagonals',  category: 'pattern', name: 'Diagonals',     tags: ['stripes','energy'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#3730a3"/></linearGradient><pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="60" height="60" fill="url(#g)"/><rect x="0" width="30" height="60" fill="#4338ca" opacity="0.35"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>`, w, h) },
        { id: 'pat-iso',        category: 'pattern', name: 'Isometric',     tags: ['3d','geometric'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#0f172a"/><defs><pattern id="p" width="60" height="104" patternUnits="userSpaceOnUse"><polygon points="30,0 60,17 60,52 30,69 0,52 0,17" fill="none" stroke="#334155" stroke-width="1"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>`, w, h) },
        { id: 'pat-hex',        category: 'pattern', name: 'Honeycomb',     tags: ['hex','geometric'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#1f2937"/><defs><pattern id="p" width="56" height="48" patternUnits="userSpaceOnUse"><polygon points="14,0 42,0 56,24 42,48 14,48 0,24" fill="none" stroke="#374151" stroke-width="1.2"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>`, w, h) },
        { id: 'pat-triangles',  category: 'pattern', name: 'Triangles',     tags: ['triangles','retro'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#0f172a"/><defs><pattern id="p" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,0 60,52 0,52" fill="#1e3a8a" opacity="0.55"/><polygon points="0,0 60,0 30,52" fill="#3730a3" opacity="0.35"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>`, w, h) },

        // ── ABSTRACT (6) ─────────────────────────────────────────
        { id: 'abs-blobs',      category: 'abstract', name: 'Soft Blobs',   tags: ['organic','colorful'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#0f172a"/><defs><radialGradient id="b1"><stop offset="0" stop-color="#f472b6" stop-opacity="0.7"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient><radialGradient id="b2"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.7"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient><radialGradient id="b3"><stop offset="0" stop-color="#fde68a" stop-opacity="0.45"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs><circle cx="${w*0.25}" cy="${h*0.3}" r="${w*0.35}" fill="url(#b1)"/><circle cx="${w*0.75}" cy="${h*0.7}" r="${w*0.4}" fill="url(#b2)"/><circle cx="${w*0.5}" cy="${h*0.55}" r="${w*0.25}" fill="url(#b3)"/>`, w, h) },
        { id: 'abs-mesh',       category: 'abstract', name: 'Color Mesh',   tags: ['mesh','vibrant'],
          generate: (w, h) => buildSvg(
              `<defs><radialGradient id="r1" cx="0.2" cy="0.3" r="0.6"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></radialGradient><radialGradient id="r2" cx="0.85" cy="0.2" r="0.5"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient><radialGradient id="r3" cx="0.7" cy="0.8" r="0.6"><stop offset="0" stop-color="#06b6d4"/><stop offset="1" stop-color="#06b6d4" stop-opacity="0"/></radialGradient><radialGradient id="r4" cx="0.15" cy="0.85" r="0.5"><stop offset="0" stop-color="#ec4899"/><stop offset="1" stop-color="#ec4899" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#0f172a"/><rect width="${w}" height="${h}" fill="url(#r1)"/><rect width="${w}" height="${h}" fill="url(#r2)"/><rect width="${w}" height="${h}" fill="url(#r3)"/><rect width="${w}" height="${h}" fill="url(#r4)"/>`, w, h) },
        { id: 'abs-waves',      category: 'abstract', name: 'Waves',        tags: ['wavy','smooth'],
          generate: (w, h) => {
              let path = '';
              for (let i = 0; i < 6; i++) {
                  const y = h * (0.4 + i * 0.12);
                  const a = 30 + i * 10;
                  path += `<path d="M0,${y} Q${w*0.25},${y - a} ${w*0.5},${y} T${w},${y} L${w},${h} L0,${h} Z" fill="hsl(${(220 + i*15)},65%,${30 + i*5}%)" opacity="${0.55 - i*0.06}"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#0f172a"/>${path}`, w, h);
          } },
        { id: 'abs-ripples',    category: 'abstract', name: 'Ripples',      tags: ['concentric'],
          generate: (w, h) => {
              const cx = w / 2, cy = h * 0.55;
              let circles = '';
              for (let i = 12; i > 0; i--) {
                  circles += `<circle cx="${cx}" cy="${cy}" r="${i * Math.min(w, h) * 0.06}" fill="none" stroke="hsl(${200 + i*8},80%,${40 + i*3}%)" stroke-width="2" opacity="${0.3 + i*0.04}"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#020617"/>${circles}`, w, h);
          } },
        { id: 'abs-spiral',     category: 'abstract', name: 'Spiral',       tags: ['spiral','motion'],
          generate: (w, h) => {
              const cx = w/2, cy = h/2;
              let pts = '';
              for (let t = 0; t < 30; t += 0.05) {
                  const r = t * Math.min(w, h) * 0.012;
                  const x = cx + Math.cos(t) * r;
                  const y = cy + Math.sin(t) * r;
                  pts += `${x.toFixed(1)},${y.toFixed(1)} `;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#1e1b4b"/><polyline points="${pts}" fill="none" stroke="#a855f7" stroke-width="2" opacity="0.7"/>`, w, h);
          } },
        { id: 'abs-noise',      category: 'abstract', name: 'Soft Noise',   tags: ['noise','grain'],
          generate: (w, h) => {
              const rng = makeRng(8421);
              let dots = '';
              const n = 800;
              for (let i = 0; i < n; i++) {
                  const x = (rng() * w).toFixed(0);
                  const y = (rng() * h).toFixed(0);
                  const a = (rng() * 0.4 + 0.05).toFixed(2);
                  dots += `<rect x="${x}" y="${y}" width="2" height="2" fill="#ffffff" opacity="${a}"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#1f2937"/>${dots}`, w, h);
          } },

        // ── TECH (3) ─────────────────────────────────────────────
        { id: 'tech-grid',      category: 'tech',     name: 'Tech Grid',    tags: ['grid','blueprint'],
          generate: (w, h) => buildSvg(
              `<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#0b1220"/><path d="M40 0H0V40" stroke="#1e3a8a" stroke-width="1" fill="none"/></pattern><radialGradient id="g" cx="0.5" cy="0.5" r="0.7"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.3"/><stop offset="1" stop-color="#0b1220" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#p)"/><rect width="${w}" height="${h}" fill="url(#g)"/>`, w, h) },
        { id: 'tech-circuit',   category: 'tech',     name: 'Circuit',      tags: ['circuit','traces'],
          generate: (w, h) => {
              const rng = makeRng(2025);
              let traces = '';
              for (let i = 0; i < 30; i++) {
                  const x1 = (rng() * w).toFixed(0), y1 = (rng() * h).toFixed(0);
                  const dir = rng() > 0.5 ? 'h' : 'v';
                  const len = 60 + Math.floor(rng() * 200);
                  const x2 = dir === 'h' ? Math.min(w, +x1 + len) : x1;
                  const y2 = dir === 'v' ? Math.min(h, +y1 + len) : y1;
                  traces += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#22d3ee" stroke-width="1.5" opacity="0.6"/><circle cx="${x1}" cy="${y1}" r="2.5" fill="#22d3ee" opacity="0.85"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#020617"/>${traces}`, w, h);
          } },
        { id: 'tech-matrix',    category: 'tech',     name: 'Matrix Rain',  tags: ['matrix','green'],
          generate: (w, h) => {
              const rng = makeRng(7);
              let cols = '';
              const cols2 = Math.floor(w / 22);
              for (let c = 0; c < cols2; c++) {
                  const x = c * 22 + 6;
                  const len = 4 + Math.floor(rng() * 12);
                  const startY = rng() * h;
                  for (let r = 0; r < len; r++) {
                      const y = (startY + r * 22) % h;
                      const ch = Math.floor(rng() * 16).toString(16);
                      const op = (1 - r / len * 0.85).toFixed(2);
                      cols += `<text x="${x}" y="${y}" fill="#22c55e" opacity="${op}" font-family="monospace" font-size="14">${ch}</text>`;
                  }
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#020617"/>${cols}`, w, h);
          } },

        // ── SPACE (3) ────────────────────────────────────────────
        { id: 'space-stars',    category: 'space',    name: 'Starfield',    tags: ['stars','night'],
          generate: (w, h) => {
              const rng = makeRng(1337);
              let stars = '';
              for (let i = 0; i < 220; i++) {
                  stars += `<circle cx="${Math.round(rng()*w)}" cy="${Math.round(rng()*h)}" r="${(rng()*1.6+0.3).toFixed(2)}" fill="#ffffff" opacity="${(rng()*0.6+0.4).toFixed(2)}"/>`;
              }
              return buildSvg(`<defs><radialGradient id="bg" cx="0.5" cy="0.4" r="0.9"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#020617"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/>${stars}`, w, h);
          } },
        { id: 'space-galaxy',   category: 'space',    name: 'Galaxy',       tags: ['galaxy','nebula'],
          generate: (w, h) => buildSvg(
              `<defs><radialGradient id="g1" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#a855f7" stop-opacity="0.7"/><stop offset="0.5" stop-color="#7c3aed" stop-opacity="0.3"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx="0.3" cy="0.7" r="0.5"><stop offset="0" stop-color="#06b6d4" stop-opacity="0.5"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#020617"/><rect width="${w}" height="${h}" fill="url(#g1)"/><rect width="${w}" height="${h}" fill="url(#g2)"/>`, w, h) },
        { id: 'space-nebula',   category: 'space',    name: 'Nebula',       tags: ['nebula','pink'],
          generate: (w, h) => buildSvg(
              `<defs><radialGradient id="n1" cx="0.65" cy="0.4" r="0.6"><stop offset="0" stop-color="#ec4899" stop-opacity="0.65"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient><radialGradient id="n2" cx="0.25" cy="0.55" r="0.55"><stop offset="0" stop-color="#3b82f6" stop-opacity="0.6"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient><radialGradient id="n3" cx="0.5" cy="0.85" r="0.4"><stop offset="0" stop-color="#facc15" stop-opacity="0.4"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#020617"/><rect width="${w}" height="${h}" fill="url(#n1)"/><rect width="${w}" height="${h}" fill="url(#n2)"/><rect width="${w}" height="${h}" fill="url(#n3)"/>`, w, h) },

        // ── STUDIO (3) ───────────────────────────────────────────
        { id: 'studio-spot',    category: 'studio',   name: 'Spotlight',    tags: ['spotlight','stage'],
          generate: (w, h) => buildSvg(
              `<defs><radialGradient id="sp" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#fef3c7" stop-opacity="0.85"/><stop offset="0.4" stop-color="#f59e0b" stop-opacity="0.4"/><stop offset="1" stop-color="#1c1917" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#0c0a09"/><rect width="${w}" height="${h}" fill="url(#sp)"/><rect y="${h*0.78}" width="${w}" height="${h*0.22}" fill="#1c1917"/>`, w, h) },
        { id: 'studio-cyc',     category: 'studio',   name: 'Cyclorama',    tags: ['cyc','seamless'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#475569"/><stop offset="0.6" stop-color="#1e293b"/><stop offset="0.62" stop-color="#0f172a"/><stop offset="1" stop-color="#020617"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`, w, h) },
        { id: 'studio-curtain', category: 'studio',   name: 'Theater Curtain', tags: ['curtain','red'],
          generate: (w, h) => {
              let fold = '';
              const cols = 14;
              const cw = w / cols;
              for (let i = 0; i < cols; i++) {
                  const dark = i % 2 === 0;
                  fold += `<rect x="${i*cw}" y="0" width="${cw}" height="${h}" fill="${dark ? '#7f1d1d' : '#991b1b'}"/>`;
                  fold += `<rect x="${i*cw}" y="0" width="${cw*0.18}" height="${h}" fill="#450a0a" opacity="0.55"/>`;
              }
              fold += `<rect width="${w}" height="${h*0.05}" fill="#fbbf24"/>`;
              return buildSvg(`<rect width="${w}" height="${h}" fill="#7f1d1d"/>${fold}`, w, h);
          } },

        // ── NATURE (5) ───────────────────────────────────────────
        { id: 'nature-mountains', category: 'nature', name: 'Mountains',    tags: ['mountain','sunrise'],
          generate: (w, h) => {
              const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="0.55" stop-color="#fb923c"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="${w}" height="${h*0.7}" fill="url(#sky)"/>`;
              const sun = `<circle cx="${w*0.7}" cy="${h*0.45}" r="${h*0.08}" fill="#fff7d6"/>`;
              const m1 = `<polygon points="0,${h*0.7} ${w*0.25},${h*0.4} ${w*0.45},${h*0.6} ${w*0.6},${h*0.45} ${w*0.85},${h*0.65} ${w},${h*0.55} ${w},${h*0.7}" fill="#1e293b"/>`;
              const m2 = `<polygon points="0,${h*0.78} ${w*0.18},${h*0.55} ${w*0.4},${h*0.7} ${w*0.65},${h*0.55} ${w*0.85},${h*0.7} ${w},${h*0.62} ${w},${h*0.78}" fill="#0f172a" opacity="0.85"/>`;
              const ground = `<rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#020617"/>`;
              return buildSvg(`${sky}${sun}${m1}${m2}${ground}`, w, h);
          } },
        { id: 'nature-forest',  category: 'nature',   name: 'Forest',       tags: ['forest','trees'],
          generate: (w, h) => {
              const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#86efac"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
              const rng = makeRng(99);
              let trees = '';
              for (let i = 0; i < 14; i++) {
                  const x = (i + rng() * 0.6) * w / 14;
                  const ty = h * 0.55 + rng() * h * 0.08;
                  const th = h * 0.4 + rng() * h * 0.1;
                  const col = `hsl(${110 + rng()*30},45%,${20 + rng()*15}%)`;
                  trees += `<polygon points="${x},${ty} ${x-th*0.25},${ty+th} ${x+th*0.25},${ty+th}" fill="${col}"/>`;
              }
              return buildSvg(`${sky}${trees}<rect y="${h*0.92}" width="${w}" height="${h*0.08}" fill="#1e3a1e"/>`, w, h);
          } },
        { id: 'nature-sky',     category: 'nature',   name: 'Cloud Sky',    tags: ['sky','clouds'],
          generate: (w, h) => {
              const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#bae6fd"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
              const rng = makeRng(303);
              let clouds = '';
              for (let i = 0; i < 6; i++) {
                  const cx = rng() * w;
                  const cy = rng() * h * 0.6 + h * 0.05;
                  const r = h * 0.06 + rng() * h * 0.05;
                  clouds += `<ellipse cx="${cx}" cy="${cy}" rx="${r*2}" ry="${r}" fill="#ffffff" opacity="0.85"/>`;
                  clouds += `<ellipse cx="${cx-r}" cy="${cy+r*0.3}" rx="${r*1.4}" ry="${r*0.8}" fill="#ffffff" opacity="0.75"/>`;
                  clouds += `<ellipse cx="${cx+r}" cy="${cy+r*0.3}" rx="${r*1.4}" ry="${r*0.8}" fill="#ffffff" opacity="0.75"/>`;
              }
              return buildSvg(`${sky}${clouds}`, w, h);
          } },
        { id: 'nature-sea',     category: 'nature',   name: 'Sea Horizon',  tags: ['sea','beach'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#fb923c"/></linearGradient><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0c4a6e"/></linearGradient></defs><rect width="${w}" height="${h*0.55}" fill="url(#sky)"/><rect y="${h*0.55}" width="${w}" height="${h*0.45}" fill="url(#sea)"/><circle cx="${w*0.5}" cy="${h*0.45}" r="${h*0.06}" fill="#fff7d6"/>`, w, h) },
        { id: 'nature-sunset',  category: 'nature',   name: 'Beach Sunset', tags: ['sunset','beach'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fb7185"/><stop offset="0.45" stop-color="#fbbf24"/><stop offset="0.5" stop-color="#fbbf24"/><stop offset="0.51" stop-color="#7f1d1d"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${h*0.08}" fill="#fff7d6"/>`, w, h) },

        // ── CITY (3) ─────────────────────────────────────────────
        { id: 'city-night',     category: 'city',     name: 'City Night',   tags: ['city','skyline','night'],
          generate: (w, h) => {
              const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#312e81"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
              const rng = makeRng(42);
              let towers = '';
              let x = 0;
              while (x < w) {
                  const tw = 30 + Math.floor(rng() * 70);
                  const th = h * (0.25 + rng() * 0.45);
                  const ty = h - th;
                  towers += `<rect x="${x}" y="${ty}" width="${tw}" height="${th}" fill="#0f172a"/>`;
                  // windows
                  for (let wy = ty + 8; wy < h - 8; wy += 14) {
                      for (let wx = x + 4; wx < x + tw - 4; wx += 10) {
                          if (rng() > 0.55) {
                              towers += `<rect x="${wx}" y="${wy}" width="4" height="6" fill="#fde68a" opacity="${(rng()*0.6+0.4).toFixed(2)}"/>`;
                          }
                      }
                  }
                  x += tw + 2;
              }
              return buildSvg(`${sky}${towers}`, w, h);
          } },
        { id: 'city-day',       category: 'city',     name: 'City Day',     tags: ['city','skyline','day'],
          generate: (w, h) => {
              const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
              const rng = makeRng(11);
              let towers = '';
              let x = 0;
              while (x < w) {
                  const tw = 30 + Math.floor(rng() * 80);
                  const th = h * (0.2 + rng() * 0.5);
                  const ty = h - th;
                  const shade = 30 + Math.floor(rng() * 40);
                  towers += `<rect x="${x}" y="${ty}" width="${tw}" height="${th}" fill="hsl(220,15%,${shade}%)"/>`;
                  x += tw + 2;
              }
              return buildSvg(`${sky}${towers}`, w, h);
          } },
        { id: 'city-neon',      category: 'city',     name: 'Neon Street',  tags: ['neon','cyberpunk'],
          generate: (w, h) => {
              const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#831843"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
              // perspective road
              const road = `<polygon points="${w*0.5},${h*0.5} ${w*0.3},${h} ${w*0.7},${h}" fill="#1f2937"/>`;
              const stripes = `<polygon points="${w*0.5},${h*0.5} ${w*0.49},${h*0.55} ${w*0.51},${h*0.55}" fill="#fbbf24"/><polygon points="${w*0.495},${h*0.6} ${w*0.485},${h*0.7} ${w*0.515},${h*0.7} ${w*0.505},${h*0.6}" fill="#fbbf24"/><polygon points="${w*0.488},${h*0.78} ${w*0.475},${h*0.92} ${w*0.525},${h*0.92} ${w*0.512},${h*0.78}" fill="#fbbf24"/>`;
              const buildings = `<rect x="0" y="${h*0.35}" width="${w*0.3}" height="${h*0.65}" fill="#0f172a"/><rect x="${w*0.7}" y="${h*0.35}" width="${w*0.3}" height="${h*0.65}" fill="#0f172a"/>`;
              const neon = `<rect x="${w*0.05}" y="${h*0.42}" width="${w*0.2}" height="${h*0.04}" fill="#ec4899"/><rect x="${w*0.05}" y="${h*0.55}" width="${w*0.2}" height="${h*0.03}" fill="#22d3ee"/><rect x="${w*0.75}" y="${h*0.45}" width="${w*0.2}" height="${h*0.03}" fill="#a855f7"/><rect x="${w*0.75}" y="${h*0.6}" width="${w*0.2}" height="${h*0.04}" fill="#fbbf24"/>`;
              return buildSvg(`${sky}${buildings}${road}${stripes}${neon}`, w, h);
          } },

        // ── THEMED (4) ───────────────────────────────────────────
        { id: 'themed-chalk',   category: 'themed',   name: 'Chalkboard',   tags: ['chalk','school'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#1f2937"/><rect x="20" y="20" width="${w-40}" height="${h-40}" fill="none" stroke="#92400e" stroke-width="14"/><rect x="32" y="32" width="${w-64}" height="${h-64}" fill="#0f3a2e"/>`, w, h) },
        { id: 'themed-paper',   category: 'themed',   name: 'Notebook',     tags: ['paper','notes'],
          generate: (w, h) => {
              let lines = '';
              for (let y = 60; y < h; y += 32) lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#bfdbfe" stroke-width="1"/>`;
              return buildSvg(`<rect width="${w}" height="${h}" fill="#fefce8"/>${lines}<line x1="${w*0.1}" y1="0" x2="${w*0.1}" y2="${h}" stroke="#fca5a5" stroke-width="1.5"/>`, w, h);
          } },
        { id: 'themed-comic',   category: 'themed',   name: 'Comic Burst',  tags: ['comic','radial'],
          generate: (w, h) => {
              const cx = w/2, cy = h/2;
              let rays = '';
              for (let i = 0; i < 24; i++) {
                  const a1 = (i * 15) * Math.PI / 180;
                  const a2 = ((i * 15) + 7.5) * Math.PI / 180;
                  const r = Math.max(w, h);
                  rays += `<polygon points="${cx},${cy} ${cx+Math.cos(a1)*r},${cy+Math.sin(a1)*r} ${cx+Math.cos(a2)*r},${cy+Math.sin(a2)*r}" fill="${i % 2 === 0 ? '#fde68a' : '#fbbf24'}"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#fde68a"/>${rays}<circle cx="${cx}" cy="${cy}" r="${Math.min(w,h)*0.18}" fill="#fef3c7"/>`, w, h);
          } },
        { id: 'themed-retro',   category: 'themed',   name: 'Retro Stripes', tags: ['retro','sunset'],
          generate: (w, h) => {
              const sky = gradient([{c:'#7c3aed'},{c:'#ec4899'},{c:'#fbbf24'}], 90, w, h);
              // Strip the closing svg, append stripes
              const inner = sky.replace(/<\/svg>$/, '');
              let bars = '';
              for (let i = 0; i < 8; i++) {
                  const y = h*0.55 + i * h * 0.06;
                  bars += `<rect y="${y}" width="${w}" height="${h*0.04}" fill="#0f172a" opacity="${0.85 - i*0.08}"/>`;
              }
              return inner + bars + '</svg>';
          } },

        // ── PRESENTATION (7) ─────────────────────────────────────
        { id: 'presentation-clean-light', category: 'presentation', name: 'Clean Light', tags: ['slides','title','minimal','white'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w*0.88}" cy="${h*0.16}" r="${Math.min(w,h)*0.22}" fill="#dbeafe" opacity="0.75"/><circle cx="${w*0.1}" cy="${h*0.9}" r="${Math.min(w,h)*0.2}" fill="#fef3c7" opacity="0.8"/><rect x="${w*0.055}" y="${h*0.08}" width="${w*0.006}" height="${h*0.24}" rx="4" fill="#2563eb"/>`, w, h) },
        { id: 'presentation-clean-dark', category: 'presentation', name: 'Clean Dark', tags: ['slides','title','dark','minimal'],
          generate: (w, h) => buildSvg(
              `<defs><radialGradient id="r" cx="0.78" cy="0.16" r="0.7"><stop offset="0" stop-color="#2563eb" stop-opacity="0.42"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#020617"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/><path d="M${w*0.08},${h*0.82} H${w*0.92}" stroke="#38bdf8" stroke-width="2" opacity="0.45"/>`, w, h) },
        { id: 'presentation-title-band', category: 'presentation', name: 'Title Band', tags: ['slides','title','banner','corporate'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#f8fafc"/><rect x="0" y="0" width="${w}" height="${h*0.28}" fill="#0f172a"/><path d="M0,${h*0.28} C${w*0.25},${h*0.38} ${w*0.68},${h*0.18} ${w},${h*0.31}" fill="#2563eb" opacity="0.9"/><circle cx="${w*0.84}" cy="${h*0.18}" r="${h*0.12}" fill="#60a5fa" opacity="0.45"/>`, w, h) },
        { id: 'presentation-sidebar', category: 'presentation', name: 'Sidebar Focus', tags: ['slides','sidebar','agenda','clean'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#f1f5f9"/><rect width="${w*0.27}" height="${h}" fill="#1e293b"/><rect x="${w*0.27}" width="${w*0.008}" height="${h}" fill="#38bdf8"/><circle cx="${w*0.08}" cy="${h*0.16}" r="${h*0.045}" fill="#38bdf8"/><circle cx="${w*0.14}" cy="${h*0.16}" r="${h*0.045}" fill="#a78bfa"/><circle cx="${w*0.2}" cy="${h*0.16}" r="${h*0.045}" fill="#facc15"/>`, w, h) },
        { id: 'presentation-data-blueprint', category: 'presentation', name: 'Data Blueprint', tags: ['slides','data','grid','chart'],
          generate: (w, h) => buildSvg(
              `<defs><pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#1d4ed8" stroke-width="1" opacity="0.45"/></pattern><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#p)"/><path d="M${w*0.08},${h*0.75} L${w*0.28},${h*0.58} L${w*0.45},${h*0.64} L${w*0.65},${h*0.36} L${w*0.9},${h*0.48}" fill="none" stroke="#38bdf8" stroke-width="5" opacity="0.65"/>`, w, h) },
        { id: 'presentation-card-stack', category: 'presentation', name: 'Card Stack', tags: ['slides','cards','workshop'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#e2e8f0"/><rect x="${w*0.1}" y="${h*0.17}" width="${w*0.34}" height="${h*0.28}" rx="18" fill="#ffffff" opacity="0.92"/><rect x="${w*0.54}" y="${h*0.17}" width="${w*0.34}" height="${h*0.28}" rx="18" fill="#ffffff" opacity="0.92"/><rect x="${w*0.1}" y="${h*0.56}" width="${w*0.78}" height="${h*0.25}" rx="18" fill="#ffffff" opacity="0.92"/><rect x="${w*0.1}" y="${h*0.17}" width="${w*0.34}" height="${h*0.035}" rx="18" fill="#38bdf8"/><rect x="${w*0.54}" y="${h*0.17}" width="${w*0.34}" height="${h*0.035}" rx="18" fill="#a78bfa"/><rect x="${w*0.1}" y="${h*0.56}" width="${w*0.78}" height="${h*0.035}" rx="18" fill="#f59e0b"/>`, w, h) },
        { id: 'presentation-safe-center', category: 'presentation', name: 'Safe Center', tags: ['slides','video','safe area','frame'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#111827"/><rect x="${w*0.08}" y="${h*0.1}" width="${w*0.84}" height="${h*0.8}" rx="26" fill="#1f2937" stroke="#374151" stroke-width="3"/><rect x="${w*0.15}" y="${h*0.2}" width="${w*0.7}" height="${h*0.6}" rx="20" fill="#0f172a" stroke="#38bdf8" stroke-width="2" opacity="0.85"/>`, w, h) },

        // ── ENVIRONMENTS (5) — scene backdrops for prop libraries ─
        { id: 'env-classroom', category: 'environment', name: 'Classroom', tags: ['classroom','school','indoor','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#dbe7f2"/><rect y="${h*0.68}" width="${w}" height="${h*0.32}" fill="#c98d51"/><rect y="${h*0.665}" width="${w}" height="${h*0.02}" fill="#a86b34"/><rect x="${w*0.08}" y="${h*0.14}" width="${w*0.24}" height="${h*0.32}" rx="8" fill="#eef4fa"/><rect x="${w*0.68}" y="${h*0.14}" width="${w*0.24}" height="${h*0.32}" rx="8" fill="#eef4fa"/><path d="M${w*0.2} ${h*0.14} V${h*0.46} M${w*0.08} ${h*0.30} H${w*0.32}" stroke="#c7d8e8" stroke-width="4"/><path d="M${w*0.8} ${h*0.14} V${h*0.46} M${w*0.68} ${h*0.30} H${w*0.92}" stroke="#c7d8e8" stroke-width="4"/>`, w, h) },
        { id: 'env-office', category: 'environment', name: 'Office', tags: ['office','work','indoor','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#e8edf3"/><rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#9aa4ad"/><rect y="${h*0.685}" width="${w}" height="${h*0.02}" fill="#7d8894"/><rect x="${w*0.55}" y="${h*0.1}" width="${w*0.34}" height="${h*0.42}" rx="4" fill="#bcd6ef"/><path d="M${w*0.72} ${h*0.1} V${h*0.52} M${w*0.55} ${h*0.31} H${w*0.89}" stroke="#e8edf3" stroke-width="6"/>`, w, h) },
        { id: 'env-hospital', category: 'environment', name: 'Hospital Ward', tags: ['hospital','ward','medical','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#e7f2ee"/><rect y="${h*0.72}" width="${w}" height="${h*0.28}" fill="#d6e0e4"/><rect y="${h*0.58}" width="${w}" height="${h*0.015}" fill="#9fc4b5"/><rect x="${w*0.08}" y="${h*0.18}" width="${w*0.16}" height="${h*0.22}" rx="8" fill="#cfe8de"/>`, w, h) },
        { id: 'env-farm', category: 'environment', name: 'Farm Field', tags: ['farm','field','outdoor','scene'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ed6ef"/><stop offset="1" stop-color="#d9f0f7"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#fsky)"/><circle cx="${w*0.82}" cy="${h*0.2}" r="${h*0.09}" fill="#f4c04e"/><rect y="${h*0.64}" width="${w}" height="${h*0.36}" fill="#7fbf5a"/><path d="M0 ${h*0.64} q${w*0.25} -${h*0.05} ${w*0.5} 0 t${w*0.5} 0 v${h*0.05} H0 z" fill="#6faf4a"/>`, w, h) },
        { id: 'env-street', category: 'environment', name: 'Street', tags: ['street','city','road','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#cfe3f0"/><rect x="${w*0.05}" y="${h*0.24}" width="${w*0.14}" height="${h*0.36}" fill="#9aa4ad"/><rect x="${w*0.24}" y="${h*0.16}" width="${w*0.16}" height="${h*0.44}" fill="#8a97a6"/><rect x="${w*0.72}" y="${h*0.2}" width="${w*0.17}" height="${h*0.4}" fill="#9aa4ad"/><rect y="${h*0.6}" width="${w}" height="${h*0.13}" fill="#b8c1cb"/><rect y="${h*0.73}" width="${w}" height="${h*0.27}" fill="#6b7580"/><rect y="${h*0.85}" width="${w}" height="${h*0.012}" fill="#f4c04e"/>`, w, h) },
        { id: 'env-bedroom', category: 'environment', name: 'Bedroom', tags: ['bedroom','home','indoor','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#edf3f8"/><rect y="${h*0.74}" width="${w}" height="${h*0.26}" fill="#d9e2ec"/><rect x="${w*0.11}" y="${h*0.28}" width="${w*0.36}" height="${w*0.24}" rx="12" fill="#f8fafc"/><rect x="${w*0.52}" y="${h*0.18}" width="${w*0.18}" height="${h*0.28}" rx="8" fill="#dfeaf7"/><path d="M${w*0.11} ${h*0.42} H${w*0.47} M${w*0.52} ${h*0.42} H${w*0.7} M${w*0.58} ${h*0.18} V${h*0.46}" stroke="#bfd8ea" stroke-width="5"/>`, w, h) },
        { id: 'env-kitchen', category: 'environment', name: 'Kitchen', tags: ['kitchen','home','indoor','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#f6f4ef"/><rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#d8cec3"/><rect x="${w*0.12}" y="${h*0.2}" width="${w*0.26}" height="${h*0.28}" rx="10" fill="#d9ecf4"/><rect x="${w*0.52}" y="${h*0.22}" width="${w*0.2}" height="${h*0.28}" rx="10" fill="#f2d3b3"/><path d="M${w*0.25} ${h*0.2} V${h*0.48} M${w*0.62} ${h*0.22} V${h*0.5} M${w*0.12} ${h*0.34} H${w*0.38} M${w*0.52} ${h*0.34} H${w*0.72}" stroke="#c7b7a8" stroke-width="6"/>`, w, h) },
        { id: 'env-garden', category: 'environment', name: 'Garden', tags: ['garden','park','outdoor','scene'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9f0f7"/><stop offset="1" stop-color="#c4e9c3"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#gsky)"/><circle cx="${w*0.78}" cy="${h*0.2}" r="${h*0.08}" fill="#f4d35e"/><rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#70b86d"/><path d="M0 ${h*0.7} q${w*0.2} -${h*0.05} ${w*0.4} 0 t${w*0.4} 0 v${h*0.08} H0 z" fill="#5da860"/><path d="M${w*0.18} ${h*0.7} L${w*0.18} ${h*0.36} M${w*0.7} ${h*0.7} L${w*0.7} ${h*0.28}" stroke="#3e7b45" stroke-width="8"/><circle cx="${w*0.18}" cy="${h*0.31}" r="${w*0.075}" fill="#67b86b"/><circle cx="${w*0.7}" cy="${h*0.23}" r="${w*0.085}" fill="#5fa95d"/>`, w, h) },
        { id: 'env-lab', category: 'environment', name: 'Science Lab', tags: ['lab','science','indoor','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#edf6f5"/><rect y="${h*0.72}" width="${w}" height="${h*0.28}" fill="#d4dfe3"/><rect x="${w*0.08}" y="${h*0.18}" width="${w*0.24}" height="${h*0.28}" rx="10" fill="#d7eff6"/><rect x="${w*0.62}" y="${h*0.18}" width="${w*0.24}" height="${h*0.28}" rx="10" fill="#d7eff6"/><path d="M${w*0.16} ${h*0.18} V${h*0.46} M${w*0.74} ${h*0.18} V${h*0.46} M${w*0.08} ${h*0.34} H${w*0.32} M${w*0.62} ${h*0.34} H${w*0.86}" stroke="#b9d6e5" stroke-width="6"/><circle cx="${w*0.49}" cy="${h*0.42}" r="${w*0.08}" fill="#a5d7d1"/>`, w, h) },
        { id: 'env-beach', category: 'environment', name: 'Beach', tags: ['beach','coast','outdoor','scene'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="beachsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7eafd"/><stop offset="0.56" stop-color="#f7d58a"/><stop offset="1" stop-color="#f4a261"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#beachsky)"/><circle cx="${w*0.76}" cy="${h*0.22}" r="${h*0.08}" fill="#fff6d6"/><rect y="${h*0.58}" width="${w}" height="${h*0.42}" fill="#f4d7a8"/><rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#59a6d9"/><path d="M0 ${h*0.62} q${w*0.17} -${h*0.04} ${w*0.32} 0 t${w*0.32} 0 t${w*0.2} 0" stroke="#f9f2d7" stroke-width="4" fill="none" opacity="0.8"/>`, w, h) },
        { id: 'env-market', category: 'environment', name: 'Market Stall', tags: ['market','street','vendor','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#f5e1bf"/><rect y="${h*0.66}" width="${w}" height="${h*0.34}" fill="#d9a868"/><rect x="${w*0.18}" y="${h*0.24}" width="${w*0.22}" height="${h*0.23}" fill="#d86c49"/><rect x="${w*0.54}" y="${h*0.22}" width="${w*0.2}" height="${h*0.25}" fill="#7ca771"/><path d="M${w*0.18} ${h*0.24} H${w*0.4} V${h*0.47} H${w*0.18} Z M${w*0.54} ${h*0.22} H${w*0.74} V${h*0.47} H${w*0.54} Z" stroke="#7b4b36" stroke-width="5" fill="none"/>`, w, h) },
        { id: 'env-village', category: 'environment', name: 'Village', tags: ['village','rural','community','developing-country','scene'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfeec9"/><stop offset="1" stop-color="#c5d8a7"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#vsky)"/><circle cx="${w*0.82}" cy="${h*0.2}" r="${h*0.08}" fill="#f7e7a1"/><rect y="${h*0.72}" width="${w}" height="${h*0.28}" fill="#b6cc84"/><path d="M0 ${h*0.72} q${w*0.14} -${h*0.04} ${w*0.28} 0 t${w*0.28} 0 t${w*0.3} 0 v${h*0.04} H0 z" fill="#98b96d"/><rect x="${w*0.12}" y="${h*0.34}" width="${w*0.14}" height="${h*0.24}" fill="#b0895d"/><rect x="${w*0.3}" y="${h*0.28}" width="${w*0.18}" height="${h*0.3}" fill="#c99562"/><rect x="${w*0.62}" y="${h*0.36}" width="${w*0.16}" height="${h*0.22}" fill="#b88952"/><path d="M${w*0.18} ${h*0.34} L${w*0.18} ${h*0.12} M${w*0.38} ${h*0.28} L${w*0.38} ${h*0.1} M${w*0.7} ${h*0.36} L${w*0.7} ${h*0.18}" stroke="#7d5a39" stroke-width="7"/>`, w, h) },
        { id: 'env-rural-clinic', category: 'environment', name: 'Rural Clinic', tags: ['clinic','healthcare','community','developing-country','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#eaf3f3"/><rect y="${h*0.72}" width="${w}" height="${h*0.28}" fill="#d0d9d6"/><rect x="${w*0.18}" y="${h*0.2}" width="${w*0.24}" height="${h*0.28}" rx="10" fill="#dfeef1"/><rect x="${w*0.56}" y="${h*0.18}" width="${w*0.2}" height="${h*0.3}" rx="10" fill="#dfeef1"/><path d="M${w*0.29} ${h*0.2} V${h*0.48} M${w*0.18} ${h*0.34} H${w*0.42} M${w*0.66} ${h*0.18} V${h*0.48} M${w*0.56} ${h*0.34} H${w*0.76}" stroke="#bcd7d5" stroke-width="6"/><rect x="${w*0.44}" y="${h*0.44}" width="${w*0.1}" height="${w*0.08}" fill="#e2574c"/>`, w, h) },
        { id: 'env-rural-school', category: 'environment', name: 'Rural School', tags: ['school','village','community','developing-country','scene'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#edf0d5"/><rect y="${h*0.68}" width="${w}" height="${h*0.32}" fill="#c7b88d"/><rect x="${w*0.14}" y="${h*0.18}" width="${w*0.26}" height="${h*0.28}" fill="#d2b86f"/><rect x="${w*0.54}" y="${h*0.2}" width="${w*0.22}" height="${h*0.26}" fill="#d7c188"/><path d="M${w*0.14} ${h*0.18} L${w*0.4} ${h*0.18} L${w*0.27} ${h*0.04} Z M${w*0.54} ${h*0.2} L${w*0.76} ${h*0.2} L${w*0.65} ${h*0.08} Z" fill="#c28955"/><path d="M${w*0.2} ${h*0.26} H${w*0.34} M${w*0.21} ${h*0.34} H${w*0.34} M${w*0.62} ${h*0.3} H${w*0.7}" stroke="#f9f1d8" stroke-width="4"/>`, w, h) },

        // ── SOCIAL / VIDEO (6) ───────────────────────────────────
        { id: 'social-reel-gradient', category: 'social', name: 'Reel Gradient', tags: ['reels','shorts','portrait','social'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset="0.45" stop-color="#8b5cf6"/><stop offset="1" stop-color="#06b6d4"/></linearGradient><radialGradient id="r" cx="0.75" cy="0.2" r="0.6"><stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/><rect x="${w*0.09}" y="${h*0.08}" width="${w*0.82}" height="${h*0.84}" rx="32" fill="#ffffff" opacity="0.08" stroke="#ffffff" stroke-width="3"/>`, w, h) },
        { id: 'social-lower-third', category: 'social', name: 'Lower Third', tags: ['video','caption','lower third'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#0f172a"/><defs><radialGradient id="r" cx="0.82" cy="0.25" r="0.65"><stop offset="0" stop-color="#2563eb" stop-opacity="0.45"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#r)"/><rect x="${w*0.06}" y="${h*0.72}" width="${w*0.72}" height="${h*0.12}" rx="18" fill="#020617" opacity="0.76"/><rect x="${w*0.06}" y="${h*0.72}" width="${w*0.02}" height="${h*0.12}" rx="18" fill="#38bdf8"/>`, w, h) },
        { id: 'social-podcast', category: 'social', name: 'Podcast Waves', tags: ['podcast','audio','video'],
          generate: (w, h) => {
              let bars = '';
              for (let i = 0; i < 42; i++) {
                  const x = w * 0.08 + i * w * 0.02;
                  const bh = h * (0.06 + (Math.sin(i * 1.7) + 1) * 0.055);
                  bars += `<rect x="${x}" y="${h*0.5 - bh/2}" width="${w*0.008}" height="${bh}" rx="8" fill="#38bdf8" opacity="${0.35 + (i % 5) * 0.1}"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#111827"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.22}" fill="#1e293b"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.1}" fill="#0f172a"/>${bars}`, w, h);
          } },
        { id: 'social-story-frame', category: 'social', name: 'Story Frame', tags: ['story','portrait','frame'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf2f8"/><stop offset="1" stop-color="#dbeafe"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect x="${w*0.06}" y="${h*0.06}" width="${w*0.88}" height="${h*0.88}" rx="42" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.85"/><rect x="${w*0.12}" y="${h*0.8}" width="${w*0.76}" height="${h*0.08}" rx="22" fill="#ffffff" opacity="0.62"/>`, w, h) },
        { id: 'social-countdown', category: 'social', name: 'Countdown', tags: ['countdown','timer','launch'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#020617"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.28}" fill="none" stroke="#334155" stroke-width="12"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${Math.min(w,h)*0.28}" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="420 180" transform="rotate(-90 ${w*0.5} ${h*0.5})"/><path d="M${w*0.5},${h*0.16} L${w*0.5},${h*0.84} M${w*0.16},${h*0.5} L${w*0.84},${h*0.5}" stroke="#1e293b" stroke-width="2"/>`, w, h) },
        { id: 'social-confetti', category: 'social', name: 'Confetti', tags: ['celebration','party','launch'],
          generate: (w, h) => {
              const rng = makeRng(808);
              const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
              let pieces = '';
              for (let i = 0; i < 160; i++) {
                  pieces += `<rect x="${rng()*w}" y="${rng()*h}" width="${6 + rng()*12}" height="${3 + rng()*8}" fill="${colors[i % colors.length]}" opacity="${0.45 + rng()*0.45}" transform="rotate(${rng()*180} ${rng()*w} ${rng()*h})"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#f8fafc"/>${pieces}<rect x="${w*0.12}" y="${h*0.22}" width="${w*0.76}" height="${h*0.56}" rx="32" fill="#ffffff" opacity="0.75"/>`, w, h);
          } },

        // ── PRODUCT / SURFACES (6) ───────────────────────────────
        { id: 'product-light-sweep', category: 'product', name: 'Light Product Sweep', tags: ['product','clean','surface'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.68" stop-color="#f1f5f9"/><stop offset="0.69" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><radialGradient id="r" cx="0.5" cy="0.7" r="0.45"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><ellipse cx="${w*0.5}" cy="${h*0.72}" rx="${w*0.28}" ry="${h*0.08}" fill="url(#r)"/>`, w, h) },
        { id: 'product-dark-sweep', category: 'product', name: 'Dark Product Sweep', tags: ['product','dark','surface'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2937"/><stop offset="0.65" stop-color="#111827"/><stop offset="0.66" stop-color="#020617"/><stop offset="1" stop-color="#0f172a"/></linearGradient><radialGradient id="r" cx="0.5" cy="0.66" r="0.55"><stop offset="0" stop-color="#64748b" stop-opacity="0.55"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/>`, w, h) },
        { id: 'product-marble', category: 'product', name: 'Soft Marble', tags: ['product','marble','luxury'],
          generate: (w, h) => {
              let veins = '';
              for (let i = 0; i < 12; i++) {
                  const y = h * (i / 12);
                  veins += `<path d="M0,${y} C${w*0.25},${y + 80*Math.sin(i)} ${w*0.55},${y - 80*Math.cos(i)} ${w},${y + 40*Math.sin(i*2)}" fill="none" stroke="#cbd5e1" stroke-width="${1 + (i % 3)}" opacity="0.42"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#f8fafc"/>${veins}`, w, h);
          } },
        { id: 'product-wood', category: 'product', name: 'Warm Wood', tags: ['product','wood','desk'],
          generate: (w, h) => {
              let grain = '';
              for (let i = 0; i < 26; i++) {
                  const y = h * (i / 26);
                  grain += `<path d="M0,${y} C${w*0.25},${y + 18*Math.sin(i)} ${w*0.65},${y - 18*Math.cos(i)} ${w},${y + 12*Math.sin(i*2)}" fill="none" stroke="#92400e" stroke-width="2" opacity="0.34"/>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#b45309"/>${grain}<rect width="${w}" height="${h}" fill="#f59e0b" opacity="0.16"/>`, w, h);
          } },
        { id: 'product-fabric', category: 'product', name: 'Fabric Texture', tags: ['product','fabric','texture'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#334155"/><defs><pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6H12 M6 0V12" stroke="#475569" stroke-width="1" opacity="0.8"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/><rect width="${w}" height="${h}" fill="#0f172a" opacity="0.18"/>`, w, h) },
        { id: 'product-shelf', category: 'product', name: 'Display Shelf', tags: ['product','shelf','showcase'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/><rect x="${w*0.12}" y="${h*0.66}" width="${w*0.76}" height="${h*0.06}" rx="10" fill="#f8fafc"/><ellipse cx="${w*0.5}" cy="${h*0.73}" rx="${w*0.32}" ry="${h*0.06}" fill="#64748b" opacity="0.25"/>`, w, h) },

        // ── FINANCE / NEWS (4) ───────────────────────────────────
        { id: 'finance-chart-dark', category: 'finance', name: 'Market Chart', tags: ['finance','chart','business'],
          generate: (w, h) => {
              const bars = Array.from({length: 18}, (_, i) => {
                  const x = w*0.08 + i*w*0.045;
                  const bh = h*(0.12 + ((i*37)%9)/20);
                  return `<rect x="${x}" y="${h*0.78-bh}" width="${w*0.025}" height="${bh}" fill="${i%3===0?'#22c55e':'#38bdf8'}" opacity="0.75"/>`;
              }).join('');
              return buildSvg(`<rect width="${w}" height="${h}" fill="#020617"/><defs><pattern id="p" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" stroke="#1e293b" stroke-width="1" fill="none"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/>${bars}<path d="M${w*0.08},${h*0.62} L${w*0.2},${h*0.56} L${w*0.32},${h*0.59} L${w*0.44},${h*0.4} L${w*0.6},${h*0.48} L${w*0.75},${h*0.29} L${w*0.9},${h*0.34}" fill="none" stroke="#facc15" stroke-width="5"/>`, w, h);
          } },
        { id: 'finance-clean-report', category: 'finance', name: 'Clean Report', tags: ['finance','report','business','white'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#f8fafc"/><rect x="${w*0.07}" y="${h*0.1}" width="${w*0.86}" height="${h*0.78}" rx="22" fill="#ffffff" stroke="#e2e8f0"/><rect x="${w*0.12}" y="${h*0.18}" width="${w*0.24}" height="${h*0.12}" rx="12" fill="#dbeafe"/><rect x="${w*0.4}" y="${h*0.18}" width="${w*0.24}" height="${h*0.12}" rx="12" fill="#dcfce7"/><rect x="${w*0.68}" y="${h*0.18}" width="${w*0.18}" height="${h*0.12}" rx="12" fill="#fef3c7"/><path d="M${w*0.12},${h*0.7} L${w*0.28},${h*0.58} L${w*0.42},${h*0.64} L${w*0.58},${h*0.42} L${w*0.82},${h*0.5}" fill="none" stroke="#2563eb" stroke-width="5"/>`, w, h) },
        { id: 'finance-news-desk', category: 'finance', name: 'News Desk', tags: ['news','business','desk'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#020617"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/><rect x="0" y="${h*0.72}" width="${w}" height="${h*0.28}" fill="#0f172a"/><rect x="${w*0.18}" y="${h*0.68}" width="${w*0.64}" height="${h*0.12}" rx="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/><circle cx="${w*0.5}" cy="${h*0.36}" r="${h*0.2}" fill="none" stroke="#60a5fa" stroke-width="3" opacity="0.35"/>`, w, h) },
        { id: 'finance-ticker', category: 'finance', name: 'Ticker Tape', tags: ['ticker','market','news'],
          generate: (w, h) => {
              let ticks = '';
              for (let i = 0; i < 14; i++) {
                  const x = w*0.04 + i*w*0.07;
                  const up = i % 4 !== 0;
                  ticks += `<text x="${x}" y="${h*0.82}" fill="${up ? '#22c55e' : '#ef4444'}" font-size="${h*0.035}" font-family="monospace">${up ? '▲' : '▼'} ${10+i}.${i}</text>`;
              }
              return buildSvg(`<rect width="${w}" height="${h}" fill="#111827"/><rect x="0" y="${h*0.75}" width="${w}" height="${h*0.12}" fill="#020617"/><path d="M${w*0.08},${h*0.55} L${w*0.2},${h*0.48} L${w*0.36},${h*0.52} L${w*0.52},${h*0.32} L${w*0.7},${h*0.41} L${w*0.9},${h*0.24}" fill="none" stroke="#22c55e" stroke-width="4" opacity="0.75"/>${ticks}`, w, h);
          } },

        // ── OFFICE (3) ───────────────────────────────────────────
        { id: 'office-wall',    category: 'office',   name: 'Office Wall',  tags: ['office','minimal'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="${w}" height="${h*0.7}" fill="url(#w)"/><rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#94a3b8"/><rect y="${h*0.69}" width="${w}" height="3" fill="#64748b"/>`, w, h) },
        { id: 'office-board',   category: 'office',   name: 'Whiteboard',   tags: ['whiteboard','meeting'],
          generate: (w, h) => buildSvg(
              `<rect width="${w}" height="${h}" fill="#94a3b8"/><rect x="${w*0.05}" y="${h*0.08}" width="${w*0.9}" height="${h*0.78}" fill="#f8fafc" stroke="#475569" stroke-width="6"/>`, w, h) },
        { id: 'office-meeting', category: 'office',   name: 'Meeting Room', tags: ['meeting','table'],
          generate: (w, h) => buildSvg(
              `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#475569"/><stop offset="0.6" stop-color="#334155"/><stop offset="0.61" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#w)"/><ellipse cx="${w*0.5}" cy="${h*0.78}" rx="${w*0.45}" ry="${h*0.08}" fill="#1c1917"/>`, w, h) }
    ];

    /* ─── Library class ──────────────────────────────────────────── */

    class BackgroundLibrary {
        constructor(stage) {
            this.stage = stage;
            this.catalog = [];
            this.localManifest = null;
            this.remoteManifest = null;
            this.selectedCategory = 'all';
            this.searchTerm = '';
            this._panelEl = null;
            this._gridEl = null;
            this._catsEl = null;
            this._countEl = null;
            this._searchEl = null;

            this._loadCatalog().then(() => this._renderAll());
        }

        async _loadCatalog() {
            const generation = this._catalogGeneration = (this._catalogGeneration || 0) + 1;
            const presets = [...PROCEDURAL, ...(global.BUILTIN_PROP_LIBRARY?.environments || [])];
            this.catalog = presets.map(p => ({
                id: p.id, category: p.category, name: p.name, tags: p.tags || [],
                source: 'procedural', _generate: p.generate
            }));
            this._renderAll();
            try {
                const r = await fetch(LOCAL_MANIFEST_URL, { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
                if (r.ok) {
                    const data = await r.json();
                    if (generation !== this._catalogGeneration) return;
                    this.localManifest = data;
                    this._mergeManifest(data, 'local', document.baseURI);
                }
            } catch (_) { /* optional */ }
            if (generation !== this._catalogGeneration) return;
            const remote = this._getRemoteUrl();
            if (remote) {
                try {
                    const url = new URL(remote);
                    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS manifest URL.');
                    const r = await fetch(url.href, { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
                    if (!r.ok) throw new Error(`Library request failed (${r.status}).`);
                    const data = await r.json();
                    if (generation !== this._catalogGeneration) return;
                    if (!data || !Array.isArray(data.backgrounds)) throw new Error('Invalid background manifest.');
                    this.remoteManifest = data;
                    this._mergeManifest(data, 'remote', r.url || url.href);
                    return true;
                } catch (e) {
                    if (generation === this._catalogGeneration) global.Utils?.showToast(`Background library: ${e.message}`, 'warning');
                    return false;
                }
            }
            return true;
        }

        _mergeManifest(data, source, baseUrl = document.baseURI) {
            if (!data || !Array.isArray(data.backgrounds)) return;
            const seen = new Set(this.catalog.map(bg => bg.id));
            const imageUrl = value => {
                if (typeof value !== 'string') return null;
                try {
                    const url = new URL(value, baseUrl);
                    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
                } catch (_) { return null; }
            };
            data.backgrounds.slice(0, 500).forEach(bg => {
                if (!bg || typeof bg.id !== 'string' || !bg.id || seen.has(bg.id)) return;
                const src = imageUrl(bg.src); if (!src) return;
                seen.add(bg.id);
                this.catalog.push({
                    id: bg.id, category: String(bg.category || 'misc'), name: String(bg.name || bg.id),
                    tags: Array.isArray(bg.tags) ? bg.tags.map(String) : String(bg.tags || '').split(/\s+/),
                    thumb: imageUrl(bg.thumb) || src, src,
                    credit: String(bg.credit || ''), source
                });
            });
        }

        getCategories() {
            const declared = [
                ...(Array.isArray(this.localManifest?.categories) ? this.localManifest.categories : []),
                ...(Array.isArray(this.remoteManifest?.categories) ? this.remoteManifest.categories : [])
            ];
            const map = new Map();
            const titleCase = s => String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            declared.forEach(c => { if (c && c.id) map.set(c.id, c); });
            this.catalog.forEach(b => {
                if (!map.has(b.category)) map.set(b.category, { id: b.category, name: titleCase(b.category) });
            });
            map.set('environment', { id: 'environment', name: 'Environments' });
            return Array.from(map.values()).filter(cat => this.catalog.some(bg => bg.category === cat.id));
        }

        _getRemoteUrl() { try { return localStorage.getItem(REMOTE_URL_KEY) || ''; } catch (_) { return ''; } }
        _setRemoteUrl(url) { try { url ? localStorage.setItem(REMOTE_URL_KEY, url) : localStorage.removeItem(REMOTE_URL_KEY); } catch (_) {} }
        _getRecent() { try { const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(list) ? list.filter(id => typeof id === 'string').slice(0, MAX_RECENT) : []; } catch (_) { return []; } }
        _pushRecent(id) {
            try {
                const list = this._getRecent().filter(x => x !== id);
                list.unshift(id);
                localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
            } catch (_) {}
        }
        _isCollapsed() { try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch (_) { return false; } }
        _setCollapsed(v) { try { localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0'); } catch (_) {} }

        getImageSrc(entry) {
            if (!entry) return null;
            if (entry.source === 'procedural' && typeof entry._generate === 'function') {
                const w = (this.stage && this.stage.width) || 1920;
                const h = (this.stage && this.stage.height) || 1080;
                return svgDataUrl(entry._generate(w, h, this._designOptions()));
            }
            return entry.src || null;
        }
        getThumbSrc(entry) {
            if (!entry) return '';
            if (entry.thumb) return entry.thumb;
            if (entry.source === 'procedural' && typeof entry._generate === 'function') {
                const options = this._designOptions();
                const portrait = options.layout === 'portrait' || (options.layout === 'auto' && this.stage.height > this.stage.width);
                return svgDataUrl(entry._generate(portrait ? 180 : 320, portrait ? 320 : 180, options));
            }
            return entry.src || '';
        }

        // ── DOM rendering ───────────────────────────────────────────
        _designOptions() {
            return { layout: document.getElementById('bg-set-layout')?.value || 'auto', time: document.getElementById('bg-set-time')?.value || 'day' };
        }
        _bind() {
            if (this._panelEl) return;
            this._panelEl = document.querySelector('.bg-library-inline');
            if (!this._panelEl) return;
            this._gridEl = this._panelEl.querySelector('#bg-library-grid');
            this._catsEl = this._panelEl.querySelector('#bg-library-cats');
            this._countEl = this._panelEl.querySelector('#bg-library-count');
            this._searchEl = this._panelEl.querySelector('#bg-library-search');
            this._statusEl = document.createElement('div');
            this._statusEl.className = 'prop-lib-count';
            this._statusEl.setAttribute('role', 'status');
            this._gridEl?.before(this._statusEl);
            const options = document.createElement('div'); options.className = 'bg-set-options';
            options.innerHTML = '<label>Set layout <select id="bg-set-layout"><option value="auto">Stage orientation</option><option value="wide">Wide</option><option value="portrait">Portrait</option></select></label><label>Set lighting <select id="bg-set-time"><option value="day">Day</option><option value="night">Night</option></select></label><label><input type="checkbox" id="bg-embed-image"> Embed external images</label><label><input type="checkbox" id="bg-embed-permission"> I have permission to store these images</label>';
            this._gridEl?.before(options);
            options.querySelectorAll('select').forEach(input => input.addEventListener('change', () => this._renderGrid()));
            const bodyEl = this._panelEl.querySelector('#bg-library-body');
            const toggle = this._panelEl.querySelector('#bg-library-toggle');
            const headerLabel = this._panelEl.querySelector('.bg-library-title');

            if (this._isCollapsed()) {
                this._panelEl.classList.add('is-collapsed');
            }
            toggle?.setAttribute('aria-expanded', String(!this._isCollapsed()));
            toggle?.setAttribute('aria-controls', 'bg-library-body');

            const onToggle = () => {
                const next = !this._panelEl.classList.contains('is-collapsed');
                this._panelEl.classList.toggle('is-collapsed', next);
                this._setCollapsed(next);
                toggle?.setAttribute('aria-expanded', String(!next));
            };
            if (toggle) toggle.addEventListener('click', onToggle);
            // Header is also clickable to toggle
            if (headerLabel) headerLabel.addEventListener('click', onToggle);

            if (this._searchEl) {
                this._searchEl.addEventListener('input', () => {
                    this.searchTerm = this._searchEl.value.trim().toLowerCase();
                    this._renderGrid();
                });
            }

            // Upload + Clear inline buttons
            const upload = document.getElementById('btn-stage-bg-upload-inline');
            const clearBtn = document.getElementById('btn-stage-bg-clear-inline');
            if (upload && !upload._bgLibBound) {
                upload._bgLibBound = true;
                upload.addEventListener('click', () => document.getElementById('stage-bg-file')?.click());
            }
            if (clearBtn && !clearBtn._bgLibBound) {
                clearBtn._bgLibBound = true;
                clearBtn.addEventListener('click', () => {
                    if (!this.stage) return;
                    this._applyGeneration = (this._applyGeneration || 0) + 1;
                    this._gridEl?.removeAttribute('aria-busy');
                    if (this._statusEl) this._statusEl.textContent = '';
                    this.stage.bgImageSrc = null;
                    this.stage.bgLibraryAsset = null;
                    this.stage.bgImageElement = null;
                    this.stage.bgType = 'solid';
                    const type = document.getElementById('stage-bg-type'); if (type) type.value = 'solid';
                    this.stage._updateBgControlVisibility?.();
                    this._renderGrid();
                    this.stage.needsRender = true;
                    if (typeof this.stage.requestRender === 'function') this.stage.requestRender();
                    if (window.eventBus && eventBus.emit) eventBus.emit('history:push');
                });
            }

            // Remote URL controls
            const remoteInput = this._panelEl.querySelector('#bg-library-remote-url');
            const remoteBtn = this._panelEl.querySelector('#bg-library-remote-apply');
            if (remoteInput) remoteInput.value = this._getRemoteUrl();
            if (remoteBtn) {
                remoteBtn.addEventListener('click', async () => {
                    const url = remoteInput ? remoteInput.value.trim() : '';
                    if (url) {
                        try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error(); }
                        catch (_) { global.Utils?.showToast('Enter a valid HTTP or HTTPS manifest URL.', 'warning'); return; }
                    }
                    this._setRemoteUrl(url);
                    remoteBtn.disabled = true;
                    this.catalog = [];
                    this.localManifest = null;
                    this.remoteManifest = null;
                    const loaded = await this._loadCatalog();
                    this._renderAll();
                    remoteBtn.disabled = false;
                    if (loaded) global.Utils?.showToast(url ? 'Remote library loaded' : 'Remote library cleared', 'success');
                });
            }
        }

        _renderAll() {
            this._bind();
            this._renderCats();
            this._renderGrid();
        }

        _renderCats() {
            if (!this._catsEl) return;
            const cats = this.getCategories();
            const recent = this._getRecent();
            const entries = [{ id: 'all', name: 'All' }, ...(recent.length ? [{ id: 'recent', name: 'Recent' }] : []), ...cats];
            if (!entries.some(c => c.id === this.selectedCategory)) this.selectedCategory = 'all';
            this._catsEl.replaceChildren();
            entries.forEach(cat => {
                const btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'bg-cat-btn'; btn.dataset.cat = cat.id;
                btn.textContent = String(cat.name || cat.id);
                btn.classList.toggle('is-active', cat.id === this.selectedCategory);
                btn.setAttribute('aria-pressed', String(cat.id === this.selectedCategory));
                this._catsEl.append(btn);
                btn.addEventListener('click', () => {
                    this._catsEl.querySelectorAll('.bg-cat-btn').forEach(b => {
                        b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn));
                    });
                    this.selectedCategory = btn.dataset.cat;
                    this._renderGrid();
                });
            });
        }

        _renderGrid() {
            if (!this._gridEl) return;
            let list = this.catalog.slice();
            if (this.selectedCategory === 'recent') {
                const byId = new Map(list.map(b => [b.id, b]));
                list = this._getRecent().map(id => byId.get(id)).filter(Boolean);
            } else if (this.selectedCategory && this.selectedCategory !== 'all') {
                list = list.filter(b => b.category === this.selectedCategory);
            }
            if (this.searchTerm) {
                const terms = this.searchTerm.split(/\s+/).filter(Boolean);
                list = list.filter(b => terms.every(term => `${b.name} ${b.category} ${b.tags.join(' ')}`.toLowerCase().includes(term)));
            }
            if (this._countEl) this._countEl.textContent = String(list.length);

            if (list.length === 0) {
                this._gridEl.innerHTML = `<div class="bg-empty">No backgrounds match.</div>`;
                return;
            }
            const currentSrc = this.stage && this.stage.bgImageSrc;
            const saved = this.stage?.bgLibraryAsset;
            const embeddedId = saved?.embedded && saved.hash === global.SceneDesign?.sourceHash(currentSrc) ? saved.id : null;
            this._gridEl.replaceChildren();
            list.forEach(bg => {
                const btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'bg-thumb'; btn.dataset.bgId = bg.id;
                btn.title = `${bg.name}${bg.credit ? ' - ' + bg.credit : ''}`;
                btn.setAttribute('aria-label', `Apply ${bg.name}`);
                const active = this.stage?.bgType === 'image' && !!currentSrc && (currentSrc === this.getImageSrc(bg) || embeddedId === bg.id);
                btn.classList.toggle('is-active', active); btn.setAttribute('aria-pressed', String(active));
                const img = document.createElement('img'); img.loading = 'lazy'; img.alt = ''; img.src = this.getThumbSrc(bg);
                img.onerror = () => { img.hidden = true; btn.classList.add('image-unavailable'); };
                const label = document.createElement('span'); label.className = 'bg-thumb-label'; label.textContent = bg.name;
                btn.append(img, label); this._gridEl.append(btn);
                btn.addEventListener('click', () => this.apply(bg));
            });
        }

        // ── Apply (live preview) ────────────────────────────────────
        async apply(entry) {
            const stage = this.stage;
            if (!stage) return;
            let src = this.getImageSrc(entry);
            if (!src) return;

            const generation = this._applyGeneration = (this._applyGeneration || 0) + 1;
            const previousSrc = stage.bgImageSrc, previousType = stage.bgType;
            const scene = global.app?.currentSceneIndex;
            this._gridEl?.setAttribute('aria-busy', 'true');
            if (this._statusEl) this._statusEl.textContent = `Loading ${entry.name || 'background'}...`;
            if (entry.source !== 'procedural' && document.getElementById('bg-embed-image')?.checked) {
                try {
                    if (!document.getElementById('bg-embed-permission')?.checked) throw new Error('Confirm permission to store this background first.');
                    src = await global.SceneDesign.embedImage(src);
                } catch (error) {
                    if (generation === this._applyGeneration) {
                        this._gridEl?.removeAttribute('aria-busy');
                        if (this._statusEl) this._statusEl.textContent = error.message;
                        global.Utils?.showToast(error.message, 'warning');
                    }
                    return false;
                }
                if (generation !== this._applyGeneration) return false;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const loaded = await new Promise(resolve => {
                const timer = setTimeout(() => { img.onload = img.onerror = null; resolve(false); }, 15000);
                img.onload = () => { clearTimeout(timer); resolve(true); };
                img.onerror = () => { clearTimeout(timer); resolve(false); };
                img.src = src;
            });
            if (generation !== this._applyGeneration) return false;
            this._gridEl?.removeAttribute('aria-busy');
            if (this._statusEl) this._statusEl.textContent = '';
            if (!loaded) { global.Utils?.showToast('Background could not be loaded. The previous background was kept.', 'warning'); return false; }
            if (stage.bgImageSrc !== previousSrc || stage.bgType !== previousType || global.app?.currentSceneIndex !== scene) return false;
            if (global.eventBus?.emit) global.eventBus.emit('history:flush');
            stage.bgType = 'image'; stage.bgImageSrc = src; stage.bgImageElement = img;
            stage.bgLibraryAsset = { id: entry.id, embedded: src !== this.getImageSrc(entry), hash: global.SceneDesign?.sourceHash(src), source: entry.src || null, credit: entry.credit || '', design: this._designOptions() };
            if (entry.source !== 'procedural' && !stage.bgLibraryAsset.embedded && this._statusEl) this._statusEl.textContent = 'Linked image: export requires its original host.';
            stage.needsRender = true; stage.requestRender?.();

            // Sync the BG Type select
            const typeSel = document.getElementById('stage-bg-type');
            if (typeSel) {
                typeSel.value = 'image';
                if (typeof stage._updateBgControlVisibility === 'function') stage._updateBgControlVisibility();
            }

            this._pushRecent(entry.id);
            // Update active highlight + recent tab
            if (this._gridEl) {
                this._gridEl.querySelectorAll('.bg-thumb').forEach(b => b.classList.remove('is-active'));
                const el = [...this._gridEl.querySelectorAll('[data-bg-id]')].find(b => b.dataset.bgId === entry.id);
                if (el) el.classList.add('is-active');
                this._gridEl.querySelectorAll('.bg-thumb').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
            }
            // Re-render cats so a fresh "Recent" tab appears if needed
            this._renderCats();
            if (window.eventBus && eventBus.emit) eventBus.emit('history:push');
            return true;
        }
    }

    global.BackgroundLibrary = BackgroundLibrary;
})(typeof window !== 'undefined' ? window : this);
