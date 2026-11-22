/* ============================================
   Animation Stage - Utility Functions
   ============================================ */

const Utils = {

    async runOperation(title, task) {
        const dialog=document.createElement('dialog'),heading=document.createElement('h3'),status=document.createElement('p'),progress=document.createElement('progress'),cancel=document.createElement('button');
        dialog.className='app-operation-dialog';heading.textContent=title;heading.id=this.generateId('operation-title');dialog.setAttribute('aria-labelledby',heading.id);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
        progress.setAttribute('aria-label',title);cancel.textContent='Cancel';cancel.type='button';
        const controller=new AbortController();let cancellable=true;
        const abort=()=>{if(cancellable){controller.abort();status.textContent='Cancelling...';cancel.disabled=true;}};
        cancel.onclick=abort;dialog.addEventListener('cancel',e=>{e.preventDefault();abort();});
        dialog.append(heading,status,progress,cancel);document.body.append(dialog);dialog.showModal();
        try{return await task({signal:controller.signal,report:message=>{status.textContent=message;},commit:()=>{controller.signal.throwIfAborted();cancellable=false;cancel.disabled=true;}});}
        finally{dialog.close();dialog.remove();}
    },

    normalizeAudioSource(dataUrl, mimeType = '') {
        const source = String(dataUrl || '');
        const comma = source.indexOf(',');
        const header = comma >= 0 ? source.slice(0, comma) : '';
        const declared = /^data:([^;,]*)/i.exec(header)?.[1] || '';
        // Some servers return WAV samples as octet-stream. Inspect only the RIFF header;
        // changing the media label must not re-encode audio or alter its timing.
        if (/^data:/i.test(header) && /;base64$/i.test(header)) {
            try {
                const bytes = atob(source.slice(comma + 1, comma + 17));
                if (bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE') {
                    return { dataUrl: source.replace(/^data:[^;,]*/i, 'data:audio/wav'), mimeType: 'audio/wav' };
                }
            } catch (_) {}
        }
        return { dataUrl: source, mimeType: mimeType || declared };
    },

    // ── Normalize a value against a set of valid values, applying an alias map ──
    normalizeWithAliases(value, validValues, aliases, defaultValue) {
        const normalized = String(value || '').toLowerCase().trim();
        const aliased = aliases[normalized] || normalized;
        return validValues.includes(aliased) ? aliased : defaultValue;
    },

    // ── HTML escape for safe innerHTML interpolation of user-controlled strings ──
    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Escape a string for use inside an HTML attribute (alias of escapeHtml; kept for clarity at call sites).
    escapeAttr(value) {
        return Utils.escapeHtml(value);
    },

    // ── Floating panel safety and window controls ──

    getFloatingPanelSafeTop() {
        if (window.innerWidth <= 768) return 12;
        const candidates = [
            '#top-toolbar',
            '#main-header',
            '#app-header',
            '.top-toolbar',
            '.app-header',
            '.top-menu',
            'header'
        ];
        let safeTop = 72;
        candidates.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => {
                const style = getComputedStyle(el);
                if (!['fixed', 'sticky'].includes(style.position)) return;
                const rect = el.getBoundingClientRect();
                if (rect.top > 8 || rect.bottom <= 0 || rect.bottom > 180) return;
                safeTop = Math.max(safeTop, Math.ceil(rect.bottom + 8));
            });
        });
        return safeTop;
    },

    _findFloatingPanelHeader(panel) {
        return panel?.querySelector?.(
            '[data-floating-panel-header], [data-draggable], [data-drag-handle], .ja-header, .rig-floating-panel-header, .teach-me-header, .app-search-header'
        ) || null;
    },

    clampFloatingPanel(panel, opts = {}) {
        if (!panel || panel.dataset.docked === 'true' || !panel.isConnected) return;
        const style = getComputedStyle(panel);
        if (!['fixed', 'absolute'].includes(style.position)) return;
        const rect = panel.getBoundingClientRect();
        const margin = opts.margin ?? 8;
        const safeTop = opts.safeTop ?? this.getFloatingPanelSafeTop();
        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxTop = Math.max(safeTop, window.innerHeight - rect.height - margin);
        const left = Number.isFinite(rect.left) ? rect.left : margin;
        const top = Number.isFinite(rect.top) ? rect.top : safeTop;

        panel.style.transform = 'none';
        panel.style.left = Math.min(Math.max(margin, left), maxLeft) + 'px';
        panel.style.top = Math.min(Math.max(safeTop, top), maxTop) + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    },

    ensureFloatingPanelControls(panel) {
        if (!panel) return;
        const header = this._findFloatingPanelHeader(panel);
        if (!header) return;
        // A panel may keep its DOM node while replacing its entire header.
        if (header.dataset.floatingPanelControlsBound === 'true') return;
        header.dataset.floatingPanelControlsBound = 'true';
        panel.dataset.floatingPanelControlsBound = 'true';
        header.dataset.floatingPanelHeader = 'true';

        let controls = header.querySelector(':scope > .floating-panel-controls');
        if (!controls) {
            controls = document.createElement('span');
            controls.className = 'floating-panel-controls';
            const closeBtn = header.querySelector(':scope > .ja-close, :scope > .teach-me-close, :scope > .rig-floating-panel-close, :scope > [title*="Close"], :scope > [aria-label*="Close"]');
            if (closeBtn) {
                header.insertBefore(controls, closeBtn);
            } else {
                header.appendChild(controls);
            }
        }

        const makeBtn = (className, title, iconClass) => {
            let btn = controls.querySelector(`.${className}`);
            if (btn) return btn;
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `floating-panel-control-btn ${className}`;
            btn.title = title;
            btn.setAttribute('aria-label', title);
            btn.innerHTML = `<i class="${iconClass}"></i>`;
            controls.appendChild(btn);
            return btn;
        };

        const minBtn = makeBtn('floating-panel-minimize-btn', 'Minimize panel', 'fas fa-window-minimize');
        const maxBtn = makeBtn('floating-panel-maximize-btn', 'Maximize panel', 'fas fa-expand');

        const setMinimizedIcon = () => {
            const minimized = panel.classList.contains('floating-panel-minimized');
            minBtn.title = minimized ? 'Restore panel' : 'Minimize panel';
            minBtn.setAttribute('aria-label', minBtn.title);
            minBtn.innerHTML = minimized ? '<i class="fas fa-window-restore"></i>' : '<i class="fas fa-window-minimize"></i>';
        };
        const setMaximizedIcon = () => {
            const maximized = panel.classList.contains('floating-panel-maximized');
            maxBtn.title = maximized ? 'Restore panel size' : 'Maximize panel';
            maxBtn.setAttribute('aria-label', maxBtn.title);
            maxBtn.innerHTML = maximized ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
        };

        minBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (panel.classList.contains('floating-panel-maximized')) {
                this._restoreFloatingPanel(panel);
                setMaximizedIcon();
            }
            panel.classList.toggle('floating-panel-minimized');
            setMinimizedIcon();
            requestAnimationFrame(() => this.clampFloatingPanel(panel));
        });

        maxBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (panel.dataset.docked === 'true') this.undockPanel(panel);
            if (panel.classList.contains('floating-panel-minimized')) {
                panel.classList.remove('floating-panel-minimized');
                setMinimizedIcon();
            }
            if (panel.classList.contains('floating-panel-maximized')) {
                this._restoreFloatingPanel(panel);
            } else {
                this._maximizeFloatingPanel(panel);
            }
            setMaximizedIcon();
        });

        setMinimizedIcon();
        setMaximizedIcon();
        this._bindFloatingPanelDrag(panel, header);
        requestAnimationFrame(() => this.clampFloatingPanel(panel));
    },

    _maximizeFloatingPanel(panel) {
        if (!panel || panel.classList.contains('floating-panel-maximized')) return;
        panel.dataset.floatingPanelRestoreStyle = panel.getAttribute('style') || '';
        const safeTop = this.getFloatingPanelSafeTop();
        const margin = 12;
        panel.classList.add('floating-panel-maximized');
        panel.style.position = 'fixed';
        panel.style.transform = 'none';
        panel.style.left = margin + 'px';
        panel.style.top = safeTop + 'px';
        panel.style.right = margin + 'px';
        panel.style.bottom = margin + 'px';
        panel.style.width = `calc(100vw - ${margin * 2}px)`;
        panel.style.height = `calc(100vh - ${safeTop + margin}px)`;
        panel.style.maxWidth = 'none';
        panel.style.maxHeight = `calc(100vh - ${safeTop + margin}px)`;
        panel.style.zIndex = '12050';
    },

    _restoreFloatingPanel(panel) {
        if (!panel) return;
        const restoreStyle = panel.dataset.floatingPanelRestoreStyle;
        panel.classList.remove('floating-panel-maximized');
        if (restoreStyle !== undefined) {
            panel.setAttribute('style', restoreStyle);
            delete panel.dataset.floatingPanelRestoreStyle;
        }
        requestAnimationFrame(() => this.clampFloatingPanel(panel));
    },

    // ── Panel Resize (drag any edge/corner) ──

    makePanelResizable(panel, opts = {}) {
        this.ensureFloatingPanelControls(panel);
        this._bindFloatingPanelDrag(panel, this._findFloatingPanelHeader(panel));
        const EDGE = 7;
        const minW = opts.minWidth  || parseInt(getComputedStyle(panel).minWidth)  || 200;
        const minH = opts.minHeight || parseInt(getComputedStyle(panel).minHeight) || 150;
        let resizing = false, edge = null, startX, startY, startRect;

        const cursors = {
            n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize',
            ne:'nesw-resize', sw:'nesw-resize', nw:'nwse-resize', se:'nwse-resize'
        };

        function detectEdge(e, rect) {
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            const t = y < EDGE, b = y > rect.height - EDGE;
            const l = x < EDGE, r = x > rect.width - EDGE;
            if (t && l) return 'nw'; if (t && r) return 'ne';
            if (b && l) return 'sw'; if (b && r) return 'se';
            if (t) return 'n';  if (b) return 's';
            if (l) return 'w';  if (r) return 'e';
            return null;
        }

        panel.addEventListener('mousemove', (e) => {
            if (resizing) return;
            const d = detectEdge(e, panel.getBoundingClientRect());
            panel.style.cursor = d ? cursors[d] : '';
        });

        panel.addEventListener('mousedown', (e) => {
            const rect = panel.getBoundingClientRect();
            const d = detectEdge(e, rect);
            if (!d) return;
            resizing = true; edge = d;
            startX = e.clientX; startY = e.clientY;
            startRect = rect;
            e.preventDefault(); e.stopPropagation();
        });

        const onMove = (e) => {
            if (!resizing) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            let l = startRect.left, t = startRect.top;
            let w = startRect.width, h = startRect.height;

            if (edge.includes('e')) w = Math.max(minW, w + dx);
            if (edge.includes('w')) { const nw = Math.max(minW, w - dx); l += w - nw; w = nw; }
            if (edge.includes('s')) h = Math.max(minH, h + dy);
            if (edge.includes('n')) { const nh = Math.max(minH, h - dy); t += h - nh; h = nh; }

            panel.style.left = l + 'px';
            panel.style.top  = t + 'px';
            panel.style.width  = w + 'px';
            panel.style.height = h + 'px';
            panel.style.transform = 'none';
            panel.style.bottom = 'auto';
            panel.style.right  = 'auto';
            Utils.clampFloatingPanel(panel);
        };

        const onUp = () => { if (resizing) { resizing = false; edge = null; } };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        requestAnimationFrame(() => this.clampFloatingPanel(panel));
        return () => {
            dragging = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        // Return cleanup function
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    },

    // ── Panel Dock System ──
    // Moves floating panels into the right panel dock so they don't cover the stage.

    _dockContainer: null,

    _ensureDockContainer() {
        if (this._dockContainer && this._dockContainer.isConnected) return this._dockContainer;
        const rightPanel = document.getElementById('right-panel');
        if (!rightPanel) return null;
        let dock = document.getElementById('panel-dock');
        if (!dock) {
            dock = document.createElement('div');
            dock.id = 'panel-dock';
            dock.className = 'panel-dock';
            // Insert before the first panel-content
            const firstContent = rightPanel.querySelector('.panel-content');
            if (firstContent) {
                rightPanel.insertBefore(dock, firstContent);
            } else {
                rightPanel.appendChild(dock);
            }
            // Watch for child removals to hide empty dock
            new MutationObserver(() => {
                if (dock.querySelectorAll('.docked-panel').length === 0) {
                    dock.classList.remove('has-panels');
                }
            }).observe(dock, { childList: true });
        }
        this._dockContainer = dock;
        return dock;
    },

    dockPanel(panel) {
        if (!panel) return;
        const dock = this._ensureDockContainer();
        if (!dock) return;
        this.ensureFloatingPanelControls(panel);

        // Save original parent and styles so we can undock
        if (panel.dataset.docked !== 'true') {
            panel._undockParent = panel.parentElement;
            panel._undockStyles = {
                position: panel.style.position,
                top: panel.style.top,
                left: panel.style.left,
                right: panel.style.right,
                bottom: panel.style.bottom,
                transform: panel.style.transform,
                width: panel.style.width,
                height: panel.style.height,
                zIndex: panel.style.zIndex,
                maxHeight: panel.style.maxHeight,
            };

            panel.dataset.docked = 'true';
            // Clear inline positioning.
            panel.style.position = '';
            panel.style.top = '';
            panel.style.left = '';
            panel.style.right = '';
            panel.style.bottom = '';
            panel.style.transform = '';
            panel.style.width = '';
            panel.style.height = '';
            panel.style.zIndex = '';
            panel.style.maxHeight = '';
        }
        panel.classList.add('docked-panel');
        if (panel.parentElement !== dock) dock.appendChild(panel);
        dock.classList.add('has-panels');

        // Add undock button if not present
        if (!panel.querySelector('.dock-undock-btn')) {
            const header = panel.querySelector('[data-draggable], [data-drag-handle], .ja-header, .rig-floating-panel-header, .teach-me-header');
            if (header) {
                const btn = document.createElement('button');
                btn.className = 'dock-undock-btn';
                btn.title = 'Pop out to floating window';
                btn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Utils.undockPanel(panel);
                });
                // Insert before the close button if present
                const closeBtn = header.querySelector('.ja-close, .teach-me-close, [title*="Close"]');
                if (closeBtn) {
                    closeBtn.parentNode.insertBefore(btn, closeBtn);
                } else {
                    header.appendChild(btn);
                }
            }
        }
    },

    undockPanel(panel) {
        if (!panel || panel.dataset.docked !== 'true') return;

        panel.dataset.docked = 'false';
        panel.classList.remove('docked-panel');

        // Restore to body
        document.body.appendChild(panel);
        const styles = panel._undockStyles || {};
        panel.style.position = 'fixed';
        panel.style.transform = styles.transform || 'none';
        panel.style.width = styles.width || '';
        panel.style.height = styles.height || '';
        panel.style.zIndex = styles.zIndex || '12000';
        panel.style.maxHeight = styles.maxHeight || '';

        // Convert to explicit left/top so dragging works (no competing right)
        const rect = panel.getBoundingClientRect();
        const fallbackLeft = Math.max(0, window.innerWidth - rect.width - 16);
        const safeTop = this.getFloatingPanelSafeTop();
        panel.style.left = styles.left || (fallbackLeft + 'px');
        panel.style.top = styles.top || (safeTop + 'px');
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        requestAnimationFrame(() => this.clampFloatingPanel(panel, { safeTop }));

        // Hide dock container if empty
        const dock = this._dockContainer;
        if (dock && dock.querySelectorAll('.docked-panel').length === 0) {
            dock.classList.remove('has-panels');
        }
    },

    // ── Panel Drag (by header handle) ──

    makePanelDraggable(panel, handleSelector) {
        this.ensureFloatingPanelControls(panel);
        const handle = panel.querySelector(handleSelector);
        this._bindFloatingPanelDrag(panel, handle);
    },

    _bindFloatingPanelDrag(panel, handle) {
        if (!handle) return;
        if (handle.dataset.floatingPanelDragBound === 'true') return;
        handle.dataset.floatingPanelDragBound = 'true';
        let dragging = false, offsetX = 0, offsetY = 0;
        handle.style.cursor = 'grab';

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            if (panel.classList.contains('floating-panel-maximized')) return;
            if (panel.dataset.docked === 'true') return;
            dragging = true;
            handle.style.cursor = 'grabbing';
            const rect = panel.getBoundingClientRect();
            const safeTop = Utils.getFloatingPanelSafeTop();
            panel.style.transform = 'none';
            panel.style.left = rect.left + 'px';
            panel.style.top  = Math.max(safeTop, rect.top) + 'px';
            panel.style.bottom = 'auto';
            panel.style.right  = 'auto';
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - Math.max(safeTop, rect.top);
            e.preventDefault();
        });

        const onMove = (e) => {
            if (!dragging) return;
            const rect = panel.getBoundingClientRect();
            const margin = 8;
            const safeTop = Utils.getFloatingPanelSafeTop();
            const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
            const maxTop = Math.max(safeTop, window.innerHeight - rect.height - margin);
            panel.style.left = Math.min(Math.max(margin, e.clientX - offsetX), maxLeft) + 'px';
            panel.style.top  = Math.min(Math.max(safeTop, e.clientY - offsetY), maxTop) + 'px';
        };

        const onUp = () => { if (dragging) { dragging = false; handle.style.cursor = 'grab'; } };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        requestAnimationFrame(() => this.clampFloatingPanel(panel));
    },

    // Generate unique IDs
    generateId(prefix = 'obj') {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    },

    // Clamp a value between min and max
    clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
    },

    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Degrees to radians
    degToRad(deg) {
        return deg * (Math.PI / 180);
    },

    // Radians to degrees
    radToDeg(rad) {
        return rad * (180 / Math.PI);
    },

    // Check if point is inside rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Check if point is inside circle
    pointInCircle(px, py, cx, cy, r) {
        return this.distance(px, py, cx, cy) <= r;
    },

    // Check if point is inside rotated rectangle (rotates around pivot if provided)
    pointInRotatedRect(px, py, rect) {
        const pvNormX = rect.pivotX ?? 0.5;
        const pvNormY = rect.pivotY ?? 0.5;
        const cx = rect.x + rect.width * pvNormX;
        const cy = rect.y + rect.height * pvNormY;
        const angle = -this.degToRad(rect.rotation || 0);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = px - cx;
        const dy = py - cy;
        const rotX = cos * dx - sin * dy + cx;
        const rotY = sin * dx + cos * dy + cy;
        return this.pointInRect(rotX, rotY, rect.x, rect.y, rect.width, rect.height);
    },

    // Color utilities
    hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
        hex = hex.replace('#', '');
        // Handle shorthand hex (#fff → ffffff)
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
    },

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v =>
            Math.round(v).toString(16).padStart(2, '0')
        ).join('');
    },

    // Deep clone (preserves Infinity, NaN, undefined — unlike JSON round-trip)
    deepClone(obj) {
        try {
            return structuredClone(obj);
        } catch {
            return JSON.parse(JSON.stringify(obj));
        }
    },

    // Snapshot plain project data without serializing large immutable image/view strings.
    // Containers remain independent, so editing a snapshot cannot mutate live state.
    cloneProjectState(value, seen = new Map()) {
        if (!value || typeof value !== 'object') return value;
        if (seen.has(value)) return seen.get(value);
        const proto = Object.getPrototypeOf(value);
        if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) return this.deepClone(value);
        const copy = Array.isArray(value) ? new Array(value.length) : Object.create(proto);
        seen.set(value, copy);
        for (const key of Object.keys(value)) {
            Object.defineProperty(copy, key, { value: this.cloneProjectState(value[key], seen),
                writable: true, enumerable: true, configurable: true });
        }
        return copy;
    },

    // Snap to grid
    snapToGrid(value, gridSize) {
        return Math.round(value / gridSize) * gridSize;
    },

    // Format time
    formatTime(ms) {
        const totalSeconds = ms / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.floor(ms % 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    },

    // Easing functions
    easings: {
        linear: t => t,
        easeIn: t => t * t * t,
        easeOut: t => 1 - Math.pow(1 - t, 3),
        easeInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        bounce: t => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        },
        elastic: t => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 :
                -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
        },
        back: t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return c3 * t * t * t - c1 * t * t;
        }
    },

    // Get easing function by name (or by `cubic-bezier(x1,y1,x2,y2)` string)
    _bezierCache: {},
    _makeCubicBezier(x1, y1, x2, y2) {
        // Newton's method approximation, mirrors EasingEditor.createCubicBezier
        const sampleX = t => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t + 3 * x1 * t;
        const sampleY = t => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t + 3 * y1 * t;
        const sampleDX = t => 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1;
        const solveX = x => {
            let t = x;
            for (let i = 0; i < 8; i++) {
                const cx = sampleX(t) - x;
                const slope = sampleDX(t);
                if (Math.abs(slope) < 1e-6) break;
                t -= cx / slope;
            }
            return Math.max(0, Math.min(1, t));
        };
        return x => x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x));
    },
    getEasing(name) {
        if (typeof name === 'string' && name.startsWith('cubic-bezier(')) {
            const cached = this._bezierCache[name];
            if (cached) return cached;
            const m = name.match(/cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
            if (m) {
                const fn = this._makeCubicBezier(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4]));
                this._bezierCache[name] = fn;
                return fn;
            }
        }
        return this.easings[name] || this.easings.linear;
    },

    // Toast notification
    _toastQueue: [],
    _toastFlushTimer: null,

    showToast(message, type = 'info', duration = 3000) {
        // Armature preparation creates temporary helper parts; its own status reports the transaction.
        if (globalThis.app?.jointSystem?._armatureRecordingBusy) return;
        const container = document.getElementById('toast-container');
        if (!container) { console.warn('[Toast]', type, message); return; }

        // Batch same-type toasts within 300ms
        this._toastQueue.push({ message, type, duration });
        clearTimeout(this._toastFlushTimer);
        this._toastFlushTimer = setTimeout(() => this._flushToasts(), 300);
    },

    _flushToasts() {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const queue = this._toastQueue.splice(0);
        if (queue.length === 0) return;

        // Group by type
        const groups = {};
        for (const t of queue) {
            if (!groups[t.type]) groups[t.type] = [];
            groups[t.type].push(t);
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        for (const [type, items] of Object.entries(groups)) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const iconHtml = `<i class="fas ${icons[type]}"></i>`;
            // Build the text node safely; supports <br> only as a layout separator,
            // never raw HTML from the caller.
            const span = document.createElement('span');
            if (items.length === 1) {
                span.textContent = String(items[0].message ?? '');
            } else {
                items.forEach((it, idx) => {
                    if (idx > 0) span.appendChild(document.createElement('br'));
                    span.appendChild(document.createTextNode(String(it.message ?? '')));
                });
            }
            toast.innerHTML = iconHtml;
            toast.appendChild(span);
            container.appendChild(toast);
            const dur = Math.max(...items.map(i => i.duration));
            setTimeout(() => {
                toast.style.animation = 'toastOut 300ms ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, dur);
        }
    },

    /**
     * Styled confirm modal — replaces browser confirm().
     * Returns a Promise<boolean>.
     */
    showConfirm(message, title = 'Confirm') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-modal-overlay';
            const safeTitle = Utils.escapeHtml(title);
            const safeMessage = Utils.escapeHtml(message);
            overlay.innerHTML = `
                <div class="confirm-modal-box">
                    <h3>${safeTitle}</h3>
                    <p>${safeMessage}</p>
                    <div class="confirm-modal-actions">
                        <button class="confirm-modal-cancel">Cancel</button>
                        <button class="confirm-modal-confirm">Confirm</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            const cleanup = (result) => {
                overlay.remove();
                resolve(result);
            };

            overlay.querySelector('.confirm-modal-cancel').addEventListener('click', () => cleanup(false));
            overlay.querySelector('.confirm-modal-confirm').addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });

            // Focus confirm button
            overlay.querySelector('.confirm-modal-confirm').focus();
        });
    },

    // Throttle function
    throttle(fn, delay) {
        let last = 0;
        return function(...args) {
            const now = Date.now();
            if (now - last >= delay) {
                last = now;
                return fn.apply(this, args);
            }
        };
    },

    // Debounce function
    debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // Get color name from hex (approximate)
    getColorName(hex) {
        const colors = {
            '#ff0000': 'red', '#00ff00': 'green', '#0000ff': 'blue',
            '#ffff00': 'yellow', '#ff00ff': 'magenta', '#00ffff': 'cyan',
            '#ffffff': 'white', '#000000': 'black', '#ff8c00': 'orange',
            '#800080': 'purple', '#ffc0cb': 'pink', '#808080': 'gray'
        };
        
        hex = hex.toLowerCase();
        if (colors[hex]) return colors[hex];
        
        const rgb = this.hexToRgb(hex);
        let closest = 'unknown';
        let minDist = Infinity;
        
        for (const [h, name] of Object.entries(colors)) {
            const c = this.hexToRgb(h);
            const d = Math.sqrt(
                Math.pow(rgb.r - c.r, 2) +
                Math.pow(rgb.g - c.g, 2) +
                Math.pow(rgb.b - c.b, 2)
            );
            if (d < minDist) {
                minDist = d;
                closest = name;
            }
        }
        return closest;
    }
};

// Event Bus for cross-module communication
class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, ...args) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(...args));
    }
}

// Undo/Redo History Manager (action-based)
class HistoryManager {
    constructor(maxSteps = 50) {
        this.states = [];
        this.currentIndex = -1;
        this.maxSteps = maxSteps;
        this.onUndo = null; // callback(entry)
        this.onRedo = null; // callback(entry)
        this._batchTimeout = null;
        this._pendingSnapshotFn = null;
        this._lastPushTime = 0;
    }

    push(state) {
        // Remove any states after current index (branching)
        this.states = this.states.slice(0, this.currentIndex + 1);
        this.states.push(Utils.cloneProjectState(state));
        
        if (this.states.length > this.maxSteps) {
            this.states.shift();
        } else {
            this.currentIndex++;
        }
        this._lastPushTime = Date.now();
        this._updateButtons();
    }

    /** Push a full scene snapshot for property changes (debounced) */
    pushSnapshot(snapshotFn, debounceMs = 50) {
        clearTimeout(this._batchTimeout);
        this._pendingSnapshotFn = snapshotFn;
        this._batchTimeout = setTimeout(() => {
            this._pendingSnapshotFn = null;
            this._batchTimeout = null;
            this.push(snapshotFn());
        }, debounceMs);
    }

    /** Flush any pending debounced snapshot immediately */
    flushPending() {
        if (this._batchTimeout && this._pendingSnapshotFn) {
            clearTimeout(this._batchTimeout);
            const fn = this._pendingSnapshotFn;
            this._pendingSnapshotFn = null;
            this._batchTimeout = null;
            this.push(fn());
        }
    }

    undo() {
        // Flush any pending snapshot so current state is saved
        this.flushPending();
        // Navigate to PREVIOUS state (must keep baseline at index 0)
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const entry = Utils.cloneProjectState(this.states[this.currentIndex]);
            if (this.onUndo) this.onUndo(entry);
            this._updateButtons();
            return entry;
        }
        return null;
    }

    getUndoCount() {
        this.flushPending();
        return Math.max(0, this.currentIndex);
    }

    undoMany(count = 1) {
        this.flushPending();
        const requested = Math.max(0, Math.floor(Number(count) || 0));
        const available = Math.max(0, this.currentIndex);
        const steps = Math.min(requested, available);
        if (steps <= 0) return null;

        this.currentIndex -= steps;
        const entry = Utils.cloneProjectState(this.states[this.currentIndex]);
        if (this.onUndo) this.onUndo(entry);
        this._updateButtons();
        return { entry, steps, requested };
    }

    undoAll() {
        return this.undoMany(this.getUndoCount());
    }

    redo() {
        // Flush any pending snapshot
        this.flushPending();
        if (this.currentIndex < this.states.length - 1) {
            this.currentIndex++;
            const entry = Utils.cloneProjectState(this.states[this.currentIndex]);
            if (this.onRedo) this.onRedo(entry);
            this._updateButtons();
            return entry;
        }
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.states.length - 1;
    }

    clear() {
        clearTimeout(this._batchTimeout);
        this._batchTimeout = null;
        this._pendingSnapshotFn = null;
        this.states = [];
        this.currentIndex = -1;
        this._updateButtons();
    }

    _updateButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        const tlUndoBtn = document.getElementById('tl-undo');
        const tlRedoBtn = document.getElementById('tl-redo');
        if (undoBtn) undoBtn.disabled = !this.canUndo();
        if (redoBtn) redoBtn.disabled = !this.canRedo();
        if (tlUndoBtn) tlUndoBtn.disabled = !this.canUndo();
        if (tlRedoBtn) tlRedoBtn.disabled = !this.canRedo();
    }
}

// Global event bus instance
const eventBus = new EventBus();


// ──────────────────────────────────────────────
//  GIF Decoder – extracts frames from animated GIFs
// ──────────────────────────────────────────────
class GIFDecoder {
    /**
     * Decode a GIF ArrayBuffer into individual frame canvases.
     * @param {ArrayBuffer} arrayBuffer - raw GIF bytes
     * @returns {{ width:number, height:number, frames:{canvas:HTMLCanvasElement, delay:number}[] }}
     */
    static decode(arrayBuffer, limits = null) {
        const data = new Uint8Array(arrayBuffer);
        let pos = 0;

        const requireBytes = n => { if (limits && pos + n > data.length) throw new Error('Incomplete GIF data.'); };
        const readByte  = () => { requireBytes(1); return data[pos++]; };
        const readU16   = () => { requireBytes(2); const v = data[pos] | (data[pos + 1] << 8); pos += 2; return v; };
        const readBytes = (n) => { requireBytes(n); const s = data.subarray(pos, pos + n); pos += n; return s; };

        // ── Header ──
        const sig = String.fromCharCode(...readBytes(6));
        if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('Not a GIF');

        // ── Logical Screen Descriptor ──
        const width  = readU16();
        const height = readU16();
        if(limits&&(!width||!height||width*height>limits.maxFramePixels))throw new Error('GIF resolution is too large. Resize the GIF before importing.');
        const packed = readByte();
        const bgIndex = readByte();
        readByte(); // pixel-aspect-ratio

        const gctFlag = (packed >> 7) & 1;
        const gctLen  = gctFlag ? (1 << ((packed & 7) + 1)) : 0;

        let gct = null;
        if (gctLen) {
            gct = new Array(gctLen);
            for (let i = 0; i < gctLen; i++) gct[i] = [readByte(), readByte(), readByte()];
        }

        // ── Composite canvas ──
        const comp = document.createElement('canvas');
        comp.width = width; comp.height = height;
        const cCtx = comp.getContext('2d', { willReadFrequently: true });

        let prevData = null;
        const frames = [];
        let gce = { delay: 100, disposal: 0, transIdx: -1 };

        while (pos < data.length) {
            const block = readByte();
            if (block === 0x3B) break; // Trailer

            if (block === 0x21) {
                // ── Extension ──
                const label = readByte();
                if (label === 0xF9) {
                    // Graphic Control Extension
                    readByte(); // block size = 4
                    const p = readByte();
                    const delay = readU16();
                    const ti = readByte();
                    readByte(); // terminator
                    gce = {
                        disposal: (p >> 2) & 7,
                        transIdx: (p & 1) ? ti : -1,
                        delay: delay * 10 || 100
                    };
                } else {
                    // Skip unknown extensions
                    while (true) { const sz = readByte(); if (!sz) break; requireBytes(sz); pos += sz; }
                }
            } else if (block === 0x2C) {
                // ── Image Descriptor ──
                const fX = readU16(), fY = readU16(), fW = readU16(), fH = readU16();
                if(limits){
                    if(!fW||!fH||fX+fW>width||fY+fH>height)throw new Error('Invalid GIF frame bounds.');
                    if(frames.length>=limits.maxFrames||(frames.length+1)*width*height>limits.maxTotalPixels)throw new Error('GIF has too many decoded pixels. Shorten or resize it before importing.');
                    if(!frames.length&&gce.transIdx<0&&gct?.[bgIndex]){cCtx.fillStyle=`rgb(${gct[bgIndex].join(',')})`;cCtx.fillRect(0,0,width,height);}
                }
                const ip = readByte();
                const lctFlag = (ip >> 7) & 1;
                const interlace = (ip >> 6) & 1;
                const lctLen = lctFlag ? (1 << ((ip & 7) + 1)) : 0;

                let ct = gct;
                if (lctLen) {
                    ct = new Array(lctLen);
                    for (let i = 0; i < lctLen; i++) ct[i] = [readByte(), readByte(), readByte()];
                }

                // Save for disposal 3 (restore to previous)
                if (gce.disposal === 3) prevData = cCtx.getImageData(0, 0, width, height);

                // ── Read LZW sub-blocks ──
                const minCode = readByte();
                if(limits&&(minCode<2||minCode>8))throw new Error('Invalid GIF compression data.');
                const lzwBytes = [];
                while (true) {
                    const sz = readByte();
                    if (!sz) break;
                    requireBytes(sz);for (let i = 0; i < sz; i++) lzwBytes.push(data[pos++]);
                }

                // Decompress
                let pixels;
                try{pixels = GIFDecoder._lzw(minCode, lzwBytes, fW * fH);}
                catch(error){if(limits)throw new Error('Invalid GIF frame encoding.');throw error;}
                if(limits&&pixels.length!==fW*fH)throw new Error('Incomplete GIF frame pixels.');
                const ordered = interlace ? GIFDecoder._deinterlace(pixels, fW, fH) : pixels;

                // Composite frame pixels
                const imgData = cCtx.getImageData(fX, fY, fW, fH);
                const d = imgData.data;
                for (let i = 0; i < ordered.length; i++) {
                    const ci = ordered[i];
                    if (ci === gce.transIdx) continue;
                    if (ct && ci < ct.length) {
                        const off = i * 4;
                        d[off]     = ct[ci][0];
                        d[off + 1] = ct[ci][1];
                        d[off + 2] = ct[ci][2];
                        d[off + 3] = 255;
                    }
                }
                cCtx.putImageData(imgData, fX, fY);

                // Snapshot composited frame
                const fc = document.createElement('canvas');
                fc.width = width; fc.height = height;
                fc.getContext('2d').drawImage(comp, 0, 0);
                frames.push({ canvas: fc, delay: gce.delay });

                // Disposal
                if (gce.disposal === 2) {
                    cCtx.clearRect(fX, fY, fW, fH);
                    if(limits&&gce.transIdx<0&&gct?.[bgIndex]){cCtx.fillStyle=`rgb(${gct[bgIndex].join(',')})`;cCtx.fillRect(fX,fY,fW,fH);}
                }
                else if (gce.disposal === 3 && prevData) cCtx.putImageData(prevData, 0, 0);

                gce = { delay: 100, disposal: 0, transIdx: -1 };
            } else {
                if(limits)throw new Error('Invalid GIF block.');
                break; // Unknown block type
            }
        }

        return { width, height, frames };
    }

    /** LZW decompression */
    static _lzw(minCodeSize, data, pixelCount) {
        const clear = 1 << minCodeSize;
        const eoi   = clear + 1;
        let codeSize = minCodeSize + 1;
        let mask     = (1 << codeSize) - 1;

        // Init table
        let table = [];
        for (let i = 0; i < clear; i++) table.push([i]);
        table.push([]); // clear
        table.push([]); // eoi
        let next = eoi + 1;

        // Bit reader
        let bPos = 0, datum = 0, bits = 0;
        const readCode = () => {
            while (bits < codeSize) {
                if (bPos >= data.length) return -1;
                datum |= data[bPos++] << bits;
                bits += 8;
            }
            const c = datum & mask;
            datum >>= codeSize;
            bits -= codeSize;
            return c;
        };

        const out = [];
        let code = readCode();
        if (code !== clear) return out;

        code = readCode();
        if (code === eoi || code < 0) return out;
        out.push(...table[code]);
        let prev = code;

        while (out.length < pixelCount) {
            code = readCode();
            if (code < 0 || code === eoi) break;

            if (code === clear) {
                table = [];
                for (let i = 0; i < clear; i++) table.push([i]);
                table.push([]); table.push([]);
                next = eoi + 1;
                codeSize = minCodeSize + 1;
                mask = (1 << codeSize) - 1;
                code = readCode();
                if (code === eoi || code < 0) break;
                out.push(...table[code]);
                prev = code;
                continue;
            }

            let entry;
            if (code < next) {
                entry = table[code];
            } else if (code === next) {
                entry = [...table[prev], table[prev][0]];
            } else {
                break;
            }
            out.push(...entry);

            if (next < 4096) {
                table.push([...table[prev], entry[0]]);
                next++;
                if (next > mask && codeSize < 12) {
                    codeSize++;
                    mask = (1 << codeSize) - 1;
                }
            }
            prev = code;
        }
        return out;
    }

    /** De-interlace GIF rows (4-pass Adam7-style) */
    static _deinterlace(pixels, w, h) {
        const result = new Array(pixels.length);
        const passes = [
            { start: 0, step: 8 },
            { start: 4, step: 8 },
            { start: 2, step: 4 },
            { start: 1, step: 2 }
        ];
        let srcRow = 0;
        for (const { start, step } of passes) {
            for (let y = start; y < h; y += step) {
                for (let x = 0; x < w; x++) result[y * w + x] = pixels[srcRow * w + x];
                srcRow++;
            }
        }
        return result;
    }

    /**
     * Convenience: convert a data-URL to an ArrayBuffer, decode, return frames.
     * @param {string} dataUrl - "data:image/gif;base64,..."
     * @returns {{ width, height, frames }}
     */
    static decodeDataUrl(dataUrl) {
        const b64  = dataUrl.split(',')[1];
        const bin  = atob(b64);
        const buf  = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return GIFDecoder.decode(buf.buffer);
    }
}
