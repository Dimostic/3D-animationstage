/* =========================================================
   App Search – Spotlight-style UI finder for Animation Stage
   Ctrl+/ (or Cmd+/) or the toolbar button opens the search.
   Indexes every interactive element (buttons, inputs, sections).
   Users can cycle through matches with Next/Prev.
   ========================================================= */

class AppSearch {
    constructor() {
        this._overlay = null;
        this._input = null;
        this._resultsList = null;
        this._counter = null;
        this._matches = [];
        this._currentIdx = -1;
        this._highlightEl = null; // currently-highlighted DOM element
        this._open = false;
        this._buildUI();
        this._bindKeys();
    }

    /* ---------- Build the overlay UI ---------- */
    _buildUI() {
        const overlay = document.createElement('div');
        overlay.id = 'app-search-overlay';
        overlay.className = 'app-search-overlay hidden';
        overlay.innerHTML = `
            <div class="app-search-box">
                <div class="app-search-header">
                    <i class="fas fa-search app-search-icon"></i>
                    <input id="app-search-input" type="text" class="app-search-input"
                              placeholder="Search tools, buttons, panels (e.g. compression rig, joint contours, teach me)..." autocomplete="off" spellcheck="false">
                    <span class="app-search-counter" id="app-search-counter"></span>
                    <button class="app-search-nav-btn" id="app-search-prev" title="Previous (Shift+Enter)"><i class="fas fa-chevron-up"></i></button>
                    <button class="app-search-nav-btn" id="app-search-next" title="Next (Enter)"><i class="fas fa-chevron-down"></i></button>
                    <button class="app-search-close-btn" id="app-search-close" title="Close (Esc)"><i class="fas fa-times"></i></button>
                </div>
                <ul class="app-search-results" id="app-search-results"></ul>
                <div class="app-search-hint">
                    <span><kbd>Enter</kbd> activate</span>
                    <span><kbd>↑↓</kbd> navigate</span>
                    <span><kbd>Esc</kbd> close</span>
                    <span>Try: compression, shoulder contour, preview, export</span>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._searchBox = overlay.querySelector('.app-search-box');
        this._input = overlay.querySelector('#app-search-input');
        this._resultsList = overlay.querySelector('#app-search-results');
        this._counter = overlay.querySelector('#app-search-counter');

        // Make resizable & draggable
        Utils.makePanelResizable(this._searchBox, { minWidth: 300, minHeight: 180 });
        Utils.makePanelDraggable(this._searchBox, '.app-search-header');

        // Close on click outside the search box
        document.addEventListener('mousedown', (e) => {
            if (this._open && !overlay.querySelector('.app-search-box').contains(e.target) &&
                e.target.id !== 'btn-app-search' && !e.target.closest('#btn-app-search')) {
                this.close();
            }
        });

        overlay.querySelector('#app-search-close').addEventListener('click', () => this.close());
        overlay.querySelector('#app-search-next').addEventListener('click', () => this._navigate(1));
        overlay.querySelector('#app-search-prev').addEventListener('click', () => this._navigate(-1));

        this._input.addEventListener('input', () => this._doSearch());
        this._input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                // If a result is focused, activate it; otherwise navigate
                if (this._currentIdx >= 0 && this._matches.length > 0) {
                    this._activateElement(this._currentIdx);
                } else {
                    this._navigate(1);
                }
            }
            else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); this._navigate(-1); }
            else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); this._navigate(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); this._navigate(-1); }
        });
    }

    /* ---------- Keyboard shortcut ---------- */
    _bindKeys() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ or Cmd+/
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /* ---------- Open / Close / Toggle ---------- */
    open() {
        this._overlay.classList.remove('hidden');
        this._open = true;
        this._input.value = '';
        this._resultsList.innerHTML = '';
        this._counter.textContent = '';
        this._matches = [];
        this._currentIdx = -1;
        this._clearHighlight();
        setTimeout(() => this._input.focus(), 50);
    }

    close() {
        this._overlay.classList.add('hidden');
        this._open = false;
        this._clearHighlight();
    }

    toggle() {
        if (this._open) this.close(); else this.open();
    }

    /* ---------- Index all searchable elements ---------- */
    _collectEntries() {
        const entries = [];
        const seen = new Set();
        const add = (el, text, category) => {
            if (!el || seen.has(el)) return;
            const t = (text || '').trim();
            if (!t) return;
            seen.add(el);
            // Also include title attribute as searchable text
            const title = (el.getAttribute('title') || '').trim();
            const searchText = title ? `${t} ${title}` : t;
            entries.push({ el, text: t, searchText: searchText.toLowerCase(), category });
        };

        // Tool buttons (left panel tools)
        document.querySelectorAll('.tool-btn').forEach(b => {
            const tool = b.dataset.tool || '';
            const label = b.textContent.trim() || tool;
            add(b, label, 'Tool');
        });

        // Collapsed vertical bar buttons
        document.querySelectorAll('.cvbar-btn').forEach(b => {
            const tool = b.dataset.tool || '';
            const label = b.getAttribute('title') || b.textContent.trim() || tool;
            add(b, label, 'Tool');
        });

        // Animation buttons
        document.querySelectorAll('.anim-btn').forEach(b => {
            const anim = b.dataset.anim || '';
            const label = b.textContent.trim() || anim;
            add(b, label, 'Animation');
        });

        // Action buttons (boolean ops, image tools, etc.)
        document.querySelectorAll('.action-buttons button, .boolean-ops button, .sub-controls button').forEach(b => {
            const label = b.textContent.trim();
            add(b, label, 'Action');
        });

        // Toolbar buttons
        document.querySelectorAll('#top-toolbar button').forEach(b => {
            const label = b.textContent.trim() || b.getAttribute('title') || '';
            add(b, label, 'Toolbar');
        });

        // Section headers (h4)
        document.querySelectorAll('.tool-group h4, .prop-section h4, .anim-category h4, .panel-content h4').forEach(h => {
            add(h, h.textContent.trim(), 'Section');
        });

        // Panel tabs
        document.querySelectorAll('.panel-tab').forEach(t => {
            add(t, t.textContent.trim(), 'Tab');
        });

        // Sub-tabs (animation sub-tabs, etc.)
        document.querySelectorAll('.sub-tab-btn, .anim-subtab-btn, [data-subtab]').forEach(t => {
            add(t, t.textContent.trim(), 'Tab');
        });

        // Labels (prop labels)
        document.querySelectorAll('.prop-field label').forEach(l => {
            // Skip tiny labels
            const text = l.textContent.trim();
            if (text.length > 1) add(l, text, 'Property');
        });

        // Named inputs
        document.querySelectorAll('input[id], select[id], textarea[id]').forEach(inp => {
            const label = inp.getAttribute('title') || inp.getAttribute('placeholder') || '';
            if (label) add(inp, label, 'Input');
        });

        // Buttons with IDs (catch-all for anything missed)
        document.querySelectorAll('button[id]').forEach(b => {
            if (seen.has(b)) return;
            const label = b.textContent.trim() || b.getAttribute('title') || '';
            add(b, label, 'Button');
        });

        if (typeof TEACH_ME_KNOWLEDGE !== 'undefined') {
            for (const guide of TEACH_ME_KNOWLEDGE.filter(entry => entry.guideId)) {
                entries.push({ guide, text: guide.title, category: 'Guide',
                    searchText: [guide.title, guide.summary, ...guide.keywords].join(' ').toLowerCase() });
            }
        }
        return entries;
    }

    /* ---------- Fuzzy / partial match ---------- */
    _scoreMatch(query, searchText) {
        const q = query.toLowerCase();
        const words = q.split(/\s+/).filter(Boolean);
        // All query words must appear somewhere in the searchText
        let score = 0;
        for (const w of words) {
            const idx = searchText.indexOf(w);
            if (idx === -1) return 0; // no match
            // Bonus for word-boundary match
            if (idx === 0 || /\W/.test(searchText[idx - 1])) score += 10;
            // Bonus for exact word
            const after = idx + w.length;
            if (after >= searchText.length || /\W/.test(searchText[after])) score += 5;
            score += w.length; // longer match = better
        }
        // Bonus for shorter result text (more specific)
        score += Math.max(0, 20 - searchText.length);
        return score;
    }

    /* ---------- Search ---------- */
    _doSearch() {
        const query = this._input.value.trim();
        this._overlay.querySelector('[data-search-guide]')?.remove();
        this._clearHighlight();
        this._currentIdx = -1;

        if (!query) {
            this._matches = [];
            this._resultsList.innerHTML = '';
            this._counter.textContent = '';
            return;
        }

        const entries = this._collectEntries();
        const scored = [];
        for (const entry of entries) {
            const score = this._scoreMatch(query, entry.searchText);
            if (score > 0) scored.push({ ...entry, score });
        }
        scored.sort((a, b) => b.score - a.score);
        this._matches = scored;

        // Render results (max 50)
        this._resultsList.innerHTML = '';
        const display = scored.slice(0, 50);
        for (let i = 0; i < display.length; i++) {
            const m = display[i];
            const li = document.createElement('li');
            li.className = 'app-search-result';
            li.dataset.idx = i;
            li.innerHTML = `<span class="app-search-result-cat">${m.category}</span>
                            <span class="app-search-result-text">${this._highlightText(m.text, query)}</span>
                            <button class="app-search-view-btn" title="View this element in the app"><i class="fas fa-eye"></i> View</button>`;
            li.querySelector('.app-search-view-btn').addEventListener('click', (e) => { e.stopPropagation(); this._viewElement(i); });
            li.addEventListener('click', () => this._viewElement(i));
            this._resultsList.appendChild(li);
        }

        this._updateCounter();

        // Auto-navigate to first match
        if (scored.length > 0) {
            this._currentIdx = 0;
            this._highlightResult(0);
            this._viewElement(0);
        }
    }

    /* ---------- Highlight matching text in result ---------- */
    _highlightText(text, query) {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        let result = text;
        for (const w of words) {
            const regex = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        }
        return result;
    }

    /* ---------- Navigate next/prev ---------- */
    _navigate(dir) {
        if (!this._matches.length) return;
        this._currentIdx += dir;
        if (this._currentIdx >= this._matches.length) this._currentIdx = 0;
        if (this._currentIdx < 0) this._currentIdx = this._matches.length - 1;
        this._highlightResult(this._currentIdx);
        this._viewElement(this._currentIdx);
    }

    /* ---------- Update counter ---------- */
    _updateCounter() {
        if (this._matches.length === 0) {
            this._counter.textContent = 'No results';
        } else {
            this._counter.textContent = `${this._currentIdx + 1} / ${this._matches.length}`;
        }
    }

    /* ---------- Highlight a result in the list ---------- */
    _highlightResult(idx) {
        this._resultsList.querySelectorAll('.app-search-result').forEach(li => li.classList.remove('active'));
        const li = this._resultsList.querySelector(`[data-idx="${idx}"]`);
        if (li) {
            li.classList.add('active');
            li.scrollIntoView({ block: 'nearest' });
        }
        this._updateCounter();
    }

    /* ---------- View a matched element (navigate + highlight, no activation) ---------- */
    _viewElement(idx) {
        const match = this._matches[idx];
        if (!match) return;
        this._currentIdx = idx;
        this._highlightResult(idx);

        this._overlay.querySelector('[data-search-guide]')?.remove();
        if (match.guide) {
            this._clearHighlight();
            const detail = document.createElement('section');
            detail.dataset.searchGuide = 'true';
            detail.style.cssText = 'max-height:40vh;overflow:auto;padding:12px;line-height:1.5;';
            detail.innerHTML = match.guide.answer;
            this._searchBox.append(detail);
            return;
        }
        const el = match.el;
        this._clearHighlight();

        // 1. Reveal the element's panel & tab
        this._revealElement(el);

        // 2. Scroll into view and highlight with pulse (don't close search, don't click)
        setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('app-search-highlight');
            this._highlightEl = el;
        }, 150);
    }

    /* ---------- Reveal hidden parents, switch tabs ---------- */
    _revealElement(el) {
        if (el.closest('#stage-animate-menu')?.classList.contains('hidden')) document.getElementById('stage-animate')?.click();
        // Determine which panel the element is in
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const topToolbar = document.getElementById('top-toolbar');

        // Expand collapsed panels
        if (leftPanel && leftPanel.contains(el) && leftPanel.classList.contains('collapsed')) {
            document.getElementById('collapse-left')?.click();
        }
        if (rightPanel && rightPanel.contains(el) && rightPanel.classList.contains('collapsed')) {
            document.getElementById('collapse-right')?.click();
        }

        // Switch to the correct tab
        if (leftPanel && leftPanel.contains(el)) {
            const tabContent = el.closest('.panel-content');
            if (tabContent) {
                const tabId = tabContent.id; // e.g. "tab-tools"
                const tabName = tabId.replace('tab-', '');
                if (window.app) window.app.switchLeftTab(tabName);
            }
        }

        if (rightPanel && rightPanel.contains(el)) {
            const tabContent = el.closest('.panel-content');
            if (tabContent) {
                const tabId = tabContent.id; // e.g. "tab-animations"
                const tabName = tabId.replace('tab-', '');
                if (window.app) window.app.switchRightTab(tabName);
            }

            // Also switch sub-tab if needed
            const subTabContent = el.closest('[data-subtab-content]');
            if (subTabContent) {
                const subTabName = subTabContent.dataset.subtabContent;
                const subBtn = rightPanel.querySelector(`[data-subtab="${subTabName}"]`);
                if (subBtn) subBtn.click();
            }
        }

        // Unhide parent sections that have .hidden class
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
            if (parent.classList.contains('hidden')) {
                parent.classList.remove('hidden');
                parent.dataset.searchRevealed = 'true'; // mark so we can re-hide later
            }
            // Expand collapsible tool-group
            if (parent.classList.contains('collapsed')) {
                parent.classList.remove('collapsed');
            }
            parent = parent.parentElement;
        }

        // Handle timeline panel
        const timelinePanel = document.getElementById('timeline-panel');
        if (timelinePanel && timelinePanel.contains(el) && timelinePanel.classList.contains('collapsed')) {
            const expandBtn = document.getElementById('btn-timeline-toggle') || document.getElementById('collapse-timeline');
            if (expandBtn) expandBtn.click();
        }
    }

    /* ---------- Clear highlight from previously highlighted element ---------- */
    _clearHighlight() {
        if (this._highlightEl) {
            this._highlightEl.classList.remove('app-search-highlight');
            this._highlightEl = null;
        }
    }

    /* ---------- Activate (click) an element and close search ---------- */
    _activateElement(idx) {
        const match = this._matches[idx];
        if (!match) return;
        const el = match.el;
        this._revealElement(el);
        this.close();
        // Click the element if it's a button, tab, or tool
        if (el.tagName === 'BUTTON' || el.classList.contains('tool-btn') ||
            el.classList.contains('panel-tab') || el.classList.contains('anim-btn')) {
            el.click();
        } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            el.focus();
        } else {
            el.click();
        }
    }

}

/* ------- Initialize (script is loaded deferred, DOM is already ready) ------- */
function _initAppSearch() {
    window.appSearch = new AppSearch();
    // Toolbar button
    document.getElementById('btn-app-search')?.addEventListener('click', () => {
        window.appSearch.toggle();
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initAppSearch);
} else {
    _initAppSearch();
}
