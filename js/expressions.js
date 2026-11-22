/* ============================================
   Scripting / Expressions Engine
   --------------------------------------------
   After-Effects-style expressions that drive numeric or string property
   values from a small JS snippet evaluated every frame. Each object can
   carry an `obj.expressions` map of { propertyName: codeString }; the
   engine compiles each snippet into a sandboxed function and runs it
   AFTER the standard animation system has produced the base pose, so
   expressions can read the animated value via `value` and either return
   a replacement or use it as a baseline.

   Built-ins exposed to expressions:
     time, t              — seconds since timeline start
     timeMs, ms           — milliseconds
     frame, fps           — frame number / fps (default 60)
     duration, dur        — total timeline duration in seconds
     value                — current property value (after animations)
     index                — object index in the scene
     obj, self            — proxy to current object's animated props
     layer(name)          — proxy to another object by name (or id)
     wiggle(freq, amp, [seed])   — smooth pseudo-noise additive offset
     noise(x, [seed])            — value noise in [-1,1]
     random(seed?)               — deterministic [0,1) when seeded
     lerp(a,b,t) clamp(x,a,b) smoothstep(a,b,x)
     bounce(t, period=1, amp=1)  — |sin| bounce 0..amp
     pingpong(t, period=1)       — 0..1..0 triangle wave
     loopOut(period=duration)    — wrap timeline mod period
     linear(t, t0, t1, v0, v1)   — remap with clamping
     hsl(h,s,l), rgb(r,g,b)      — colour helpers returning hex
     PI, TAU, sin, cos, tan, asin, acos, atan, atan2,
     abs, min, max, floor, ceil, round, sqrt, pow, exp, log, sign

     Safety: Expressions are parsed into a small AST and walked by an
     in-process interpreter — no `eval`, no `new Function`, so the page
     can ship a CSP without `'unsafe-eval'`. Errors are caught per
     expression — a failing expression is disabled for the rest of the
     frame and surfaced via console + toast.
   ============================================ */

/* ============================================================================
   ExpressionParser — tiny safe expression engine
   ----------------------------------------------------------------------------
   Supports: numeric & string literals, true/false/null/undefined, identifiers,
   member access (a.b, a[expr]), function calls f(a,b), array literals [..],
   unary  - + ! , binary  ** * / %  + -  < <= > >=  == != === !==  && || ,
   ternary  a ? b : c , and parenthesised sub-expressions. Identifiers resolve
   from a single `ctx` object (the sandbox built by `_buildSandbox`). Pure
   data interpreter — no access to globals, no constructor call, no assignment.
   ============================================================================ */
const ExpressionParser = (() => {
    function tokenize(src) {
        const tokens = [];
        const n = src.length;
        let i = 0;
        while (i < n) {
            const c = src[i];
            if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
            if (c === '/' && src[i + 1] === '/') {
                while (i < n && src[i] !== '\n') i++;
                continue;
            }
            if (c === '/' && src[i + 1] === '*') {
                i += 2;
                while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
                i += 2;
                continue;
            }
            // Numeric literal (optionally starting with '.')
            if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
                let j = i;
                while (j < n && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
                if (src[j] === 'e' || src[j] === 'E') {
                    j++;
                    if (src[j] === '+' || src[j] === '-') j++;
                    while (j < n && src[j] >= '0' && src[j] <= '9') j++;
                }
                tokens.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
                i = j;
                continue;
            }
            // String literal
            if (c === '"' || c === "'" || c === '`') {
                const quote = c;
                let j = i + 1;
                let s = '';
                while (j < n && src[j] !== quote) {
                    if (src[j] === '\\' && j + 1 < n) {
                        const next = src[j + 1];
                        s += next === 'n' ? '\n' : next === 't' ? '\t' : next === 'r' ? '\r' : next;
                        j += 2;
                    } else {
                        s += src[j];
                        j++;
                    }
                }
                if (j >= n) throw new Error('Unterminated string');
                tokens.push({ t: 'str', v: s });
                i = j + 1;
                continue;
            }
            // Identifier / keyword
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$') {
                let j = i;
                while (j < n && ((src[j] >= 'a' && src[j] <= 'z') || (src[j] >= 'A' && src[j] <= 'Z') ||
                                 (src[j] >= '0' && src[j] <= '9') || src[j] === '_' || src[j] === '$')) j++;
                const ident = src.slice(i, j);
                if (ident === 'true') tokens.push({ t: 'lit', v: true });
                else if (ident === 'false') tokens.push({ t: 'lit', v: false });
                else if (ident === 'null') tokens.push({ t: 'lit', v: null });
                else if (ident === 'undefined') tokens.push({ t: 'lit', v: undefined });
                else tokens.push({ t: 'ident', v: ident });
                i = j;
                continue;
            }
            // Multi-char operators
            const three = src.substr(i, 3);
            if (three === '===' || three === '!==') { tokens.push({ t: 'op', v: three }); i += 3; continue; }
            const two = src.substr(i, 2);
            if (two === '==' || two === '!=' || two === '<=' || two === '>=' ||
                two === '&&' || two === '||' || two === '**' || two === '??') {
                tokens.push({ t: 'op', v: two });
                i += 2;
                continue;
            }
            if ('+-*/%<>!?:,.()[]'.indexOf(c) !== -1) { tokens.push({ t: 'op', v: c }); i++; continue; }
            throw new Error('Unexpected character "' + c + '" at ' + i);
        }
        return tokens;
    }

    function parse(src) {
        const tokens = tokenize(src);
        let pos = 0;
        const peek = () => tokens[pos];
        const eat = (v) => {
            const tok = tokens[pos];
            if (!tok || tok.v !== v) throw new Error('Expected "' + v + '" got "' + (tok ? tok.v : 'EOF') + '"');
            pos++;
        };

        function parseExpr() { return parseTernary(); }
        function parseTernary() {
            const cond = parseNullish();
            if (peek() && peek().v === '?') {
                pos++;
                const a = parseTernary();
                eat(':');
                const b = parseTernary();
                return { type: 'tern', cond, a, b };
            }
            return cond;
        }
        function parseNullish() {
            let left = parseOr();
            while (peek() && peek().v === '??') {
                pos++;
                left = { type: 'bin', op: '??', l: left, r: parseOr() };
            }
            return left;
        }
        function parseOr() {
            let left = parseAnd();
            while (peek() && peek().v === '||') { pos++; left = { type: 'bin', op: '||', l: left, r: parseAnd() }; }
            return left;
        }
        function parseAnd() {
            let left = parseEq();
            while (peek() && peek().v === '&&') { pos++; left = { type: 'bin', op: '&&', l: left, r: parseEq() }; }
            return left;
        }
        function parseEq() {
            let left = parseRel();
            while (peek() && (peek().v === '==' || peek().v === '!=' || peek().v === '===' || peek().v === '!==')) {
                const op = peek().v; pos++;
                left = { type: 'bin', op, l: left, r: parseRel() };
            }
            return left;
        }
        function parseRel() {
            let left = parseAdd();
            while (peek() && (peek().v === '<' || peek().v === '<=' || peek().v === '>' || peek().v === '>=')) {
                const op = peek().v; pos++;
                left = { type: 'bin', op, l: left, r: parseAdd() };
            }
            return left;
        }
        function parseAdd() {
            let left = parseMul();
            while (peek() && (peek().v === '+' || peek().v === '-')) {
                const op = peek().v; pos++;
                left = { type: 'bin', op, l: left, r: parseMul() };
            }
            return left;
        }
        function parseMul() {
            let left = parsePow();
            while (peek() && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
                const op = peek().v; pos++;
                left = { type: 'bin', op, l: left, r: parsePow() };
            }
            return left;
        }
        function parsePow() {
            const left = parseUnary();
            if (peek() && peek().v === '**') { pos++; return { type: 'bin', op: '**', l: left, r: parsePow() }; }
            return left;
        }
        function parseUnary() {
            const tok = peek();
            if (tok && (tok.v === '-' || tok.v === '+' || tok.v === '!')) {
                pos++;
                return { type: 'un', op: tok.v, x: parseUnary() };
            }
            return parsePostfix();
        }
        function parsePostfix() {
            let node = parsePrimary();
            for (;;) {
                const tok = peek();
                if (!tok) break;
                if (tok.v === '.') {
                    pos++;
                    const name = peek();
                    if (!name || name.t !== 'ident') throw new Error('Expected property name after "."');
                    pos++;
                    node = { type: 'mem', obj: node, prop: { type: 'lit', v: name.v }, computed: false };
                } else if (tok.v === '[') {
                    pos++;
                    const prop = parseExpr();
                    eat(']');
                    node = { type: 'mem', obj: node, prop, computed: true };
                } else if (tok.v === '(') {
                    pos++;
                    const args = [];
                    if (!peek() || peek().v !== ')') {
                        args.push(parseExpr());
                        while (peek() && peek().v === ',') { pos++; args.push(parseExpr()); }
                    }
                    eat(')');
                    node = { type: 'call', callee: node, args };
                } else break;
            }
            return node;
        }
        function parsePrimary() {
            const tok = peek();
            if (!tok) throw new Error('Unexpected end of expression');
            if (tok.t === 'num' || tok.t === 'str' || tok.t === 'lit') { pos++; return { type: 'lit', v: tok.v }; }
            if (tok.t === 'ident') { pos++; return { type: 'ident', v: tok.v }; }
            if (tok.v === '(') { pos++; const e = parseExpr(); eat(')'); return e; }
            if (tok.v === '[') {
                pos++;
                const items = [];
                if (!peek() || peek().v !== ']') {
                    items.push(parseExpr());
                    while (peek() && peek().v === ',') { pos++; items.push(parseExpr()); }
                }
                eat(']');
                return { type: 'arr', items };
            }
            throw new Error('Unexpected token "' + tok.v + '"');
        }

        const ast = parseExpr();
        if (pos < tokens.length) throw new Error('Unexpected trailing token "' + tokens[pos].v + '"');
        return ast;
    }

    // Block access to dangerous prototype-pollution / escape vectors.
    const BLOCKED_KEYS = new Set([
        '__proto__', 'constructor', 'prototype'
    ]);

    function safeGet(obj, key) {
        if (obj == null) throw new Error('Cannot read property "' + key + '" of ' + obj);
        if (BLOCKED_KEYS.has(String(key))) return undefined;
        return obj[key];
    }

    function evaluate(node, ctx) {
        switch (node.type) {
            case 'lit': return node.v;
            case 'arr': return node.items.map((n) => evaluate(n, ctx));
            case 'ident':
                if (ctx && (node.v in ctx)) return ctx[node.v];
                return undefined;
            case 'mem': {
                const o = evaluate(node.obj, ctx);
                const k = node.computed ? evaluate(node.prop, ctx) : node.prop.v;
                return safeGet(o, k);
            }
            case 'call': {
                let thisArg;
                let fn;
                if (node.callee.type === 'mem') {
                    thisArg = evaluate(node.callee.obj, ctx);
                    const k = node.callee.computed ? evaluate(node.callee.prop, ctx) : node.callee.prop.v;
                    fn = safeGet(thisArg, k);
                } else {
                    fn = evaluate(node.callee, ctx);
                }
                if (typeof fn !== 'function') throw new Error('Not a function');
                const args = node.args.map((a) => evaluate(a, ctx));
                return fn.apply(thisArg, args);
            }
            case 'un': {
                const x = evaluate(node.x, ctx);
                if (node.op === '-') return -x;
                if (node.op === '+') return +x;
                if (node.op === '!') return !x;
                throw new Error('Bad unary "' + node.op + '"');
            }
            case 'bin': {
                const op = node.op;
                if (op === '&&') return evaluate(node.l, ctx) && evaluate(node.r, ctx);
                if (op === '||') return evaluate(node.l, ctx) || evaluate(node.r, ctx);
                if (op === '??') { const lv = evaluate(node.l, ctx); return lv == null ? evaluate(node.r, ctx) : lv; }
                const l = evaluate(node.l, ctx);
                const r = evaluate(node.r, ctx);
                switch (op) {
                    case '+':   return l + r;
                    case '-':   return l - r;
                    case '*':   return l * r;
                    case '/':   return l / r;
                    case '%':   return l % r;
                    case '**':  return l ** r;
                    case '==':  return l == r;
                    case '!=':  return l != r;
                    case '===': return l === r;
                    case '!==': return l !== r;
                    case '<':   return l < r;
                    case '<=':  return l <= r;
                    case '>':   return l > r;
                    case '>=':  return l >= r;
                }
                throw new Error('Bad binary "' + op + '"');
            }
            case 'tern':
                return evaluate(node.cond, ctx) ? evaluate(node.a, ctx) : evaluate(node.b, ctx);
        }
        throw new Error('Bad AST node "' + node.type + '"');
    }

    return { parse, evaluate };
})();

if (typeof window !== 'undefined') window.ExpressionParser = ExpressionParser;

class Expressions {
    constructor(stage, objects, animations) {
        this.stage = stage;
        this.objects = objects;
        this.animations = animations;

        // Compiled function cache: codeString → Function
        this._cache = new Map();
        // Per-object error state: key=`${objId}:${prop}` → { time, message }
        this._errors = new Map();
        // Most recent computed values, keyed `${objId}:${prop}` — exposed as
        // `prev` inside the expression so users can write smoothing filters.
        this._prev = new Map();

        // Properties an expression may target. Restricted to renderable
        // properties — anything else is rejected by the editor UI.
        this.SUPPORTED_PROPS = [
            'x', 'y', 'width', 'height',
            'rotation', 'scaleX', 'scaleY', 'opacity',
            'tiltX', 'tiltY', 'depth',
            'pivotX', 'pivotY',
            'fill', 'stroke', 'strokeWidth',
            'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
            'fontSize', 'letterSpacing', 'lineHeight', 'textCurve',
            'text', 'visible'
        ];

        this.fps = 60;
    }

    init() {
        // Re-evaluate when the playhead moves so expressions update live
        // even when nothing else triggered a re-apply.
        eventBus.on('expressions:changed', () => {
            this._cache.clear();
            this.stage.requestRender();
        });
    }

    // ===== Compilation =====
    _compile(code) {
        if (this._cache.has(code)) return this._cache.get(code);
        let fn;
        try {
            // Parse to AST and return an interpreter closure. No `eval`, no
            // `new Function` — works under a CSP that forbids `'unsafe-eval'`.
            const ast = ExpressionParser.parse(code);
            fn = (ctx) => ExpressionParser.evaluate(ast, ctx);
        } catch (err) {
            fn = { __error: err.message };
        }
        this._cache.set(code, fn);
        return fn;
    }

    // ===== Sandbox builders =====
    _makeObjectProxy(obj) {
        // Expose a small, safe surface area — readable properties only.
        return new Proxy({}, {
            get: (_, key) => {
                if (key === 'name') return obj.name;
                if (key === 'id') return obj.id;
                if (key === 'pivotPoint' && typeof obj.getPivotPoint === 'function') {
                    return obj.getPivotPoint();
                }
                if (key in obj) return obj[key];
                return undefined;
            },
            has: () => true
        });
    }

    _seedRandom(seed) {
        // Mulberry32 — small, fast, deterministic for given seed.
        let s = (seed >>> 0) || 1;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    _hash(s) {
        let h = 0;
        s = String(s);
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        return Math.abs(h);
    }

    _wiggle(time, freq, amp, seed) {
        // Smooth multi-octave pseudo-noise. Sum a few sines with detuned
        // frequencies to avoid the obvious sin() shape.
        const rand = this._seedRandom(seed | 0);
        const o1 = rand() * 1000, o2 = rand() * 1000, o3 = rand() * 1000;
        const w = Math.sin(time * freq * 2 * Math.PI + o1) * 0.55
                + Math.sin(time * freq * 1.7 * Math.PI + o2) * 0.30
                + Math.sin(time * freq * 3.3 * Math.PI + o3) * 0.15;
        return w * amp;
    }

    _valueNoise(x, seed) {
        const rand = this._seedRandom((seed | 0) || 1);
        // Pre-build a small permutation by hashing position into rand stream.
        const xi = Math.floor(x);
        const xf = x - xi;
        const a = this._seedRandom(this._hash(xi + ':' + (seed | 0)))();
        const b = this._seedRandom(this._hash((xi + 1) + ':' + (seed | 0)))();
        const t = xf * xf * (3 - 2 * xf); // smoothstep
        return (a + (b - a) * t) * 2 - 1;
    }

    _buildSandbox(obj, prop, value, time, options) {
        const self = this;
        const layer = (name) => {
            if (!name) return null;
            const all = this.objects.objects;
            const target = all.find(o => o.name === name) || all.find(o => o.id === name);
            return target ? this._makeObjectProxy(target) : null;
        };
        const proxy = this._makeObjectProxy(obj);
        const tSec = time / 1000;
        const dur = (this.animations.totalDuration || 0) / 1000;
        const idx = this.objects.objects.indexOf(obj);
        const prevKey = obj.id + ':' + prop;
        const prev = this._prev.get(prevKey);

        const Mwiggle = (freq = 1, amp = 30, seed) =>
            self._wiggle(tSec, freq, amp, seed != null ? seed : self._hash(obj.id + ':' + prop));
        const Mnoise = (x, seed) =>
            self._valueNoise(+x || 0, seed != null ? seed : self._hash(obj.id + ':' + prop));

        return {
            // Time / frame
            time: tSec, t: tSec, timeMs: time, ms: time,
            fps: this.fps, frame: Math.round(tSec * this.fps),
            duration: dur, dur,

            // Object access
            value, prev,
            obj: proxy, self: proxy,
            index: idx,
            layer, comp: layer, // alias

            // Random / noise
            wiggle: Mwiggle, noise: Mnoise,
            random: (seed) => seed == null ? Math.random() : self._seedRandom(self._hash(seed))(),

            // Math helpers (flattened)
            PI: Math.PI, TAU: Math.PI * 2, E: Math.E,
            sin: Math.sin, cos: Math.cos, tan: Math.tan,
            asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
            abs: Math.abs, min: Math.min, max: Math.max,
            floor: Math.floor, ceil: Math.ceil, round: Math.round,
            sqrt: Math.sqrt, pow: Math.pow, exp: Math.exp, log: Math.log, sign: Math.sign,
            Math,

            // Tweening
            lerp: (a, b, k) => a + (b - a) * k,
            clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
            smoothstep: (e0, e1, x) => {
                const u = Math.max(0, Math.min(1, (x - e0) / ((e1 - e0) || 1e-9)));
                return u * u * (3 - 2 * u);
            },
            bounce: (tt, period = 1, amp = 1) =>
                Math.abs(Math.sin((tt / period) * Math.PI)) * amp,
            pingpong: (tt, period = 1) => {
                const p = ((tt % (period * 2)) + period * 2) % (period * 2);
                return p < period ? p / period : (period * 2 - p) / period;
            },
            loopOut: (period) => {
                const per = period > 0 ? period : (dur || 1);
                return ((tSec % per) + per) % per;
            },
            linear: (x, x0, x1, y0, y1) => {
                if (x1 === x0) return y0;
                const k = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
                return y0 + (y1 - y0) * k;
            },

            // Colour helpers — return hex strings
            hsl: (h, s = 80, l = 60) => `hsl(${h}, ${s}%, ${l}%)`,
            rgb: (r, g, b) => {
                const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
                return '#' + c(r) + c(g) + c(b);
            },

            // Playback state
            playing: !!this.animations.isPlaying,
            currentTime: this.animations.currentTime || 0,

            // Options injection (e.g., mouse coords from caller)
            mouseX: options.mouseX || 0,
            mouseY: options.mouseY || 0
        };
    }

    // ===== Per-frame application =====
    applyAll(time, objs, options = {}) {
        if (!objs) return;
        for (let i = 0; i < objs.length; i++) {
            const obj = objs[i];
            const exprs = obj && obj.expressions;
            if (!exprs) continue;
            for (const prop in exprs) {
                if (!Object.prototype.hasOwnProperty.call(exprs, prop)) continue;
                const entry = exprs[prop];
                if (!entry || entry.disabled) continue;
                const code = (typeof entry === 'string') ? entry : entry.code;
                if (!code || !code.trim()) continue;
                this._evaluateOne(obj, prop, code, time, options);
            }
        }
    }

    _evaluateOne(obj, prop, code, time, options) {
        const fn = this._compile(code);
        if (fn && fn.__error) {
            this._errors.set(obj.id + ':' + prop, { message: fn.__error });
            return;
        }
        try {
            const baseValue = obj[prop];
            const ctx = this._buildSandbox(obj, prop, baseValue, time, options);
            const result = fn(ctx);
            if (result === undefined || result === null) return;
            // Apply with light coercion — numeric props get +; visible gets bool.
            if (prop === 'visible') {
                obj.visible = !!result;
            } else if (typeof obj[prop] === 'number') {
                const n = +result;
                if (Number.isFinite(n)) obj[prop] = n;
            } else {
                obj[prop] = result;
            }
            this._prev.set(obj.id + ':' + prop, result);
            this._errors.delete(obj.id + ':' + prop);
        } catch (err) {
            const key = obj.id + ':' + prop;
            const prior = this._errors.get(key);
            if (!prior || prior.message !== err.message) {
                console.warn('[expressions]', obj.name || obj.id, prop, '→', err.message);
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast(`Expression error on ${obj.name || obj.id}.${prop}: ${err.message}`, 'error');
                }
            }
            this._errors.set(key, { message: err.message });
        }
    }

    // ===== Public API used by editor =====
    setExpression(obj, prop, code) {
        if (!obj) return;
        if (!obj.expressions) obj.expressions = {};
        if (!code || !code.trim()) {
            delete obj.expressions[prop];
            if (Object.keys(obj.expressions).length === 0) delete obj.expressions;
        } else {
            obj.expressions[prop] = { code: String(code), disabled: false };
        }
        this._cache.clear();
        eventBus.emit('expressions:changed', { obj, prop });
        this.stage.requestRender();
    }

    toggleExpression(obj, prop, enabled) {
        if (!obj || !obj.expressions || !obj.expressions[prop]) return;
        const e = obj.expressions[prop];
        if (typeof e === 'string') obj.expressions[prop] = { code: e, disabled: !enabled };
        else e.disabled = !enabled;
        eventBus.emit('expressions:changed', { obj, prop });
        this.stage.requestRender();
    }

    removeExpression(obj, prop) { this.setExpression(obj, prop, ''); }

    // ===== UI =====
    bindUI() {
        const btn = document.getElementById('btn-expressions');
        if (btn) {
            btn.addEventListener('click', () => this.openEditor());
        }
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const tag = (e.target && e.target.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
            if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
            if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                this.openEditor();
            }
        });
    }

    openEditor(targetObj) {
        const existing = document.getElementById('expressions-editor');
        if (existing) { existing.remove(); return; }

        const obj = targetObj
            || (this.objects.selectedIds && this.objects.selectedIds.length
                ? this.objects.getObjectById(this.objects.selectedIds[0])
                : null);

        if (!obj) {
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Select an object to edit expressions', 'info');
            }
            return;
        }

        const dlg = document.createElement('div');
        dlg.id = 'expressions-editor';
        dlg.className = 'expressions-editor';
        dlg.innerHTML = this._renderEditorHTML(obj);
        document.body.appendChild(dlg);
        this._wireEditor(dlg, obj);
    }

    _renderEditorHTML(obj) {
        const exprs = obj.expressions || {};
        const propOptions = this.SUPPORTED_PROPS
            .map(p => `<option value="${p}">${p}</option>`).join('');

        const rows = Object.keys(exprs).map(prop => {
            const e = exprs[prop];
            const code = (typeof e === 'string') ? e : (e.code || '');
            const disabled = (typeof e === 'object' && e.disabled);
            const errKey = obj.id + ':' + prop;
            const err = this._errors.get(errKey);
            return `
            <div class="expr-row" data-prop="${prop}">
                <div class="expr-row-head">
                    <label class="expr-toggle" title="Enable / disable">
                        <input type="checkbox" class="expr-enabled" ${disabled ? '' : 'checked'}>
                    </label>
                    <span class="expr-prop">${prop}</span>
                    <button class="expr-remove" title="Remove expression"><i class="fas fa-times"></i></button>
                </div>
                <textarea class="expr-code" spellcheck="false" rows="3">${this._escapeHtml(code)}</textarea>
                ${err ? `<div class="expr-error">⚠ ${this._escapeHtml(err.message)}</div>` : ''}
            </div>`;
        }).join('');

        const presets = [
            { label: 'Wiggle position',  prop: 'x',        code: 'value + wiggle(2, 30)' },
            { label: 'Pulsing scale',    prop: 'scaleX',   code: '1 + 0.1 * sin(time * 4)' },
            { label: 'Constant spin',    prop: 'rotation', code: 'time * 90' },
            { label: 'Rainbow fill',     prop: 'fill',     code: 'hsl((time * 60) % 360)' },
            { label: 'Bounce Y',         prop: 'y',        code: 'value - bounce(time, 0.6, 40)' },
            { label: 'Follow another',   prop: 'x',        code: 'layer("Target") ? layer("Target").x : value' },
            { label: 'Loop on duration', prop: 'rotation', code: 'loopOut() * 360 / duration' }
        ];
        const presetOptions = presets
            .map((p, i) => `<option value="${i}">${this._escapeHtml(p.label)} → ${p.prop}</option>`)
            .join('');

        return `
            <div class="expr-header">
                <i class="fas fa-code"></i>
                <span class="expr-title">Expressions — ${this._escapeHtml(obj.name || obj.type)}</span>
                <button class="expr-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="expr-body">
                <div class="expr-list">${rows || '<div class="expr-empty">No expressions yet — add one below.</div>'}</div>
                <div class="expr-add">
                    <select class="expr-add-prop">${propOptions}</select>
                    <button class="expr-add-btn"><i class="fas fa-plus"></i> Add expression</button>
                </div>
                <div class="expr-presets">
                    <label>Insert preset:</label>
                    <select class="expr-preset-select">
                        <option value="">— choose —</option>
                        ${presetOptions}
                    </select>
                    <button class="expr-preset-btn">Insert</button>
                </div>
                <details class="expr-help">
                    <summary>Reference</summary>
                    <div class="expr-help-body">
                        <p><b>Variables:</b> <code>time</code>, <code>frame</code>, <code>duration</code>, <code>value</code> (current animated value), <code>prev</code>, <code>index</code>, <code>obj</code>, <code>self</code>.</p>
                        <p><b>Lookup:</b> <code>layer("Name")</code> returns another object's animated values (use <code>.x</code>, <code>.y</code>, <code>.rotation</code>, …).</p>
                        <p><b>Helpers:</b> <code>wiggle(freq, amp)</code>, <code>noise(x)</code>, <code>random(seed)</code>, <code>lerp(a,b,t)</code>, <code>clamp(x,a,b)</code>, <code>smoothstep(a,b,x)</code>, <code>bounce(t,period,amp)</code>, <code>pingpong(t,period)</code>, <code>loopOut(period)</code>, <code>linear(x,x0,x1,y0,y1)</code>.</p>
                        <p><b>Colour:</b> <code>hsl(h,s,l)</code>, <code>rgb(r,g,b)</code> return hex strings.</p>
                        <p><b>Math:</b> all <code>Math.*</code> functions exposed bare — <code>sin</code>, <code>cos</code>, <code>abs</code>, <code>min</code>, <code>max</code>, <code>PI</code>, etc.</p>
                        <p>Return <code>undefined</code> to skip this frame; otherwise the returned value replaces the property. <kbd>Ctrl/Cmd+Shift+E</kbd> opens this editor.</p>
                    </div>
                </details>
            </div>
        `;
    }

    _escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    _wireEditor(dlg, obj) {
        const close = () => dlg.remove();
        dlg.querySelector('.expr-close').addEventListener('click', close);

        // Drag header to reposition
        const header = dlg.querySelector('.expr-header');
        let drag = null;
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            const r = dlg.getBoundingClientRect();
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!drag) return;
            dlg.style.left = (e.clientX - drag.dx) + 'px';
            dlg.style.top  = (e.clientY - drag.dy) + 'px';
            dlg.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { drag = null; });

        const refresh = () => {
            // Replace innerHTML and rebind. The drag listeners on document
            // are guarded by a closed-over `drag` variable that becomes
            // unreachable once the editor is removed, so the leak is bounded
            // and harmless for the lifetime of a session.
            dlg.innerHTML = this._renderEditorHTML(obj);
            this._wireEditor(dlg, obj);
        };

        // Per-row wiring
        dlg.querySelectorAll('.expr-row').forEach(row => {
            const prop = row.dataset.prop;
            const ta = row.querySelector('.expr-code');
            const enabled = row.querySelector('.expr-enabled');
            const remove = row.querySelector('.expr-remove');

            let timer = null;
            ta.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    this.setExpression(obj, prop, ta.value);
                    // Update inline error after a tick — re-evaluate has run.
                    const errKey = obj.id + ':' + prop;
                    const err = this._errors.get(errKey);
                    let errEl = row.querySelector('.expr-error');
                    if (err) {
                        const text = '⚠ ' + err.message;
                        if (errEl) errEl.textContent = text;
                        else {
                            errEl = document.createElement('div');
                            errEl.className = 'expr-error';
                            errEl.textContent = text;
                            row.appendChild(errEl);
                        }
                    } else if (errEl) errEl.remove();
                }, 200);
            });

            enabled.addEventListener('change', () => {
                this.toggleExpression(obj, prop, enabled.checked);
            });

            remove.addEventListener('click', () => {
                this.removeExpression(obj, prop);
                row.remove();
                if (!dlg.querySelector('.expr-row')) {
                    const list = dlg.querySelector('.expr-list');
                    if (list) list.innerHTML = '<div class="expr-empty">No expressions yet — add one below.</div>';
                }
            });
        });

        // Add new expression
        const addBtn = dlg.querySelector('.expr-add-btn');
        const addSel = dlg.querySelector('.expr-add-prop');
        addBtn.addEventListener('click', () => {
            const prop = addSel.value;
            if (!prop) return;
            if (!obj.expressions) obj.expressions = {};
            if (obj.expressions[prop]) {
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast(`${prop} already has an expression`, 'info');
                }
                return;
            }
            // Sensible default per property type
            const baseType = typeof obj[prop];
            let starter;
            if (prop === 'rotation')   starter = 'time * 90';
            else if (prop === 'fill')  starter = 'hsl((time * 60) % 360)';
            else if (prop === 'visible') starter = 'sin(time * 4) > 0';
            else if (baseType === 'number') starter = 'value + wiggle(2, 20)';
            else starter = 'value';
            this.setExpression(obj, prop, starter);
            refresh();
        });

        // Preset insert
        const presetSel = dlg.querySelector('.expr-preset-select');
        const presetBtn = dlg.querySelector('.expr-preset-btn');
        const presets = [
            { prop: 'x',        code: 'value + wiggle(2, 30)' },
            { prop: 'scaleX',   code: '1 + 0.1 * sin(time * 4)' },
            { prop: 'rotation', code: 'time * 90' },
            { prop: 'fill',     code: 'hsl((time * 60) % 360)' },
            { prop: 'y',        code: 'value - bounce(time, 0.6, 40)' },
            { prop: 'x',        code: 'layer("Target") ? layer("Target").x : value' },
            { prop: 'rotation', code: 'loopOut() * 360 / duration' }
        ];
        presetBtn.addEventListener('click', () => {
            const idx = parseInt(presetSel.value, 10);
            if (Number.isNaN(idx)) return;
            const p = presets[idx];
            if (!p) return;
            this.setExpression(obj, p.prop, p.code);
            refresh();
        });

        // Initial position
        if (!dlg.style.left && !dlg.style.top) {
            dlg.style.right = '20px';
            dlg.style.top = '120px';
        }
    }
}
