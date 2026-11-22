/* =======================================================================
 * Slide Layouts — PowerPoint-style slide templates with live preview
 * -----------------------------------------------------------------------
 * 12 ready-made slide layouts (Title Slide, Title + Content, Comparison,
 * Two Content, Title Only, Section Header, Picture with Caption, Content
 * with Caption, Quote, Big Statement, Closing Slide, Blank). Each layout
 * is sized to the current stage and uses real StageObject text/rectangle
 * objects so users can edit immediately.
 *
 * UX (mirrors Background Library):
 *   - Inline collapsible panel in the Stage tab.
 *   - Click a thumbnail → applies LIVE to the current scene (replacing
 *     any layout-created objects from a previous click). Click another
 *     to swap immediately, just like switching backgrounds.
 *   - "Keep" pin button promotes the live preview so it sticks and a
 *     fresh click starts a new layered layout.
 *   - Original (pre-layout) objects are untouched.
 *
 * Layout sizing mirrors PowerPoint placeholders: title bands are ~10% of
 * stage height, the main content placeholder uses ~92% width × 76%
 * height where applicable, etc.
 * ===================================================================== */

(function (global) {
    'use strict';

    const COLLAPSED_KEY = 'slide-layouts-collapsed';
    const PREVIEW_TAG = '_layoutPreviewObjectId';

    const PALETTE = {
        accent: '#6366f1',
        accentAlt: '#22d3ee',
        text: '#f8fafc',
        textMuted: '#cbd5e1',
        placeholderBg: 'rgba(148, 163, 184, 0.18)',
        placeholderBorder: '#475569',
        divider: '#475569'
    };

    function mkText(opts) {
        if (typeof StageObject !== 'function') return null;
        return new StageObject('text', Object.assign({
            text: '',
            fontSize: 24,
            fontFamily: 'Inter',
            fontWeight: '400',
            fontStyle: 'normal',
            textColor: PALETTE.text,
            fill: PALETTE.text,
            textAlign: 'left',
            textVerticalAlign: 'top',
            lineHeight: 1.35,
            listStyle: 'none',
            opacity: 1
        }, opts));
    }
    function bulletText(lines) {
        const defaults = Array.isArray(lines) && lines.length ? lines : [
            'Add the first key point',
            'Add supporting detail',
            'Add final takeaway'
        ];
        return defaults.join('\n');
    }
    function mkBulletText(opts) {
        return mkText(Object.assign({
            text: bulletText(),
            listStyle: 'bullet',
            listIndent: 26,
            lineHeight: 1.35,
            textAlign: 'left',
            textVerticalAlign: 'top'
        }, opts));
    }
    function mkRect(opts) {
        if (typeof StageObject !== 'function') return null;
        return new StageObject('rectangle', Object.assign({
            fill: PALETTE.placeholderBg,
            stroke: PALETTE.placeholderBorder,
            strokeWidth: 2,
            borderRadius: 6,
            opacity: 1
        }, opts));
    }
    function mkBar(opts) {
        if (typeof StageObject !== 'function') return null;
        return new StageObject('rectangle', Object.assign({
            fill: PALETTE.accent,
            stroke: 'transparent',
            strokeWidth: 0,
            borderRadius: 2,
            opacity: 1
        }, opts));
    }

    /* ─── 12 layouts ────────────────────────────────────────────────
     * All coords are scaled to stage (w, h). Sizes mirror PowerPoint's
     * default 16:9 master:
     *   • Outer padding ~ 4% of W on each side  ⇒ usable area = 92% × 90%
     *   • Title band  = top 12% of usable area
     *   • Content placeholder = the remaining ~76% of stage height
     */
    const LAYOUTS = [
        {
            id: 'title-slide',
            name: 'Title Slide',
            description: 'Big centered title + subtitle.',
            generate(w, h) {
                return [
                    mkBar({ name: 'Title Underline', x: w * 0.43, y: h * 0.56, width: w * 0.14, height: 4 }),
                    mkText({
                        name: 'Slide Title',
                        x: w * 0.06, y: h * 0.3, width: w * 0.88, height: h * 0.24,
                        text: 'Click to add title',
                        fontSize: Math.round(h * 0.09), fontWeight: '700',
                        textAlign: 'center', textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Subtitle',
                        x: w * 0.12, y: h * 0.62, width: w * 0.76, height: h * 0.1,
                        text: 'Click to add subtitle',
                        fontSize: Math.round(h * 0.035), textColor: PALETTE.textMuted,
                        textAlign: 'center'
                    })
                ];
            }
        },
        {
            id: 'title-content',
            name: 'Title + Content',
            description: 'Title bar at top, large content placeholder filling the rest.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Title',
                        x: w * 0.04, y: h * 0.04, width: w * 0.92, height: h * 0.11,
                        text: 'Click to add title',
                        fontSize: Math.round(h * 0.062), fontWeight: '700', textAlign: 'left',
                        textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Title Divider', x: w * 0.04, y: h * 0.17, width: w * 0.08, height: 3 }),
                    mkBulletText({
                        name: 'Content',
                        x: w * 0.04, y: h * 0.2, width: w * 0.92, height: h * 0.76,
                        text: bulletText(['Add first key point', 'Add supporting detail', 'Add next action']),
                        fontSize: Math.round(h * 0.038)
                    })
                ];
            }
        },
        {
            id: 'two-content',
            name: 'Two Content',
            description: 'Title plus two side-by-side text columns.',
            generate(w, h) {
                const gap = w * 0.03;
                const colW = (w * 0.92 - gap) / 2;
                return [
                    mkText({
                        name: 'Title',
                        x: w * 0.04, y: h * 0.04, width: w * 0.92, height: h * 0.11,
                        text: 'Click to add title',
                        fontSize: Math.round(h * 0.062), fontWeight: '700', textAlign: 'left',
                        textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Title Divider', x: w * 0.04, y: h * 0.17, width: w * 0.08, height: 3 }),
                    mkBulletText({
                        name: 'Left Content',
                        x: w * 0.04, y: h * 0.2, width: colW, height: h * 0.76,
                        text: bulletText(['Add first point', 'Add second point', 'Add third point']),
                        fontSize: Math.round(h * 0.034)
                    }),
                    mkBulletText({
                        name: 'Right Content',
                        x: w * 0.04 + colW + gap, y: h * 0.2, width: colW, height: h * 0.76,
                        text: bulletText(['Add first point', 'Add second point', 'Add third point']),
                        fontSize: Math.round(h * 0.034)
                    })
                ];
            }
        },
        {
            id: 'comparison',
            name: 'Comparison',
            description: 'Title plus two columns with their own coloured headings.',
            generate(w, h) {
                const gap = w * 0.03;
                const colW = (w * 0.92 - gap) / 2;
                const leftX = w * 0.04;
                const rightX = leftX + colW + gap;
                return [
                    mkText({
                        name: 'Title',
                        x: w * 0.04, y: h * 0.04, width: w * 0.92, height: h * 0.1,
                        text: 'Click to add title',
                        fontSize: Math.round(h * 0.055), fontWeight: '700', textAlign: 'left',
                        textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Left Heading',
                        x: leftX, y: h * 0.18, width: colW, height: h * 0.08,
                        text: 'Option A',
                        fontSize: Math.round(h * 0.042), fontWeight: '700',
                        textColor: PALETTE.accent, fill: PALETTE.accent, textAlign: 'left'
                    }),
                    mkText({
                        name: 'Right Heading',
                        x: rightX, y: h * 0.18, width: colW, height: h * 0.08,
                        text: 'Option B',
                        fontSize: Math.round(h * 0.042), fontWeight: '700',
                        textColor: PALETTE.accentAlt, fill: PALETTE.accentAlt, textAlign: 'left'
                    }),
                    mkRect({
                        name: 'Center Divider',
                        x: w * 0.5 - 1, y: h * 0.18, width: 2, height: h * 0.78,
                        fill: PALETTE.divider, stroke: 'transparent', strokeWidth: 0, borderRadius: 0
                    }),
                    mkBulletText({
                        name: 'Left Body',
                        x: leftX, y: h * 0.28, width: colW, height: h * 0.68,
                        text: bulletText(['Key strength', 'Supporting fact', 'Notable detail']),
                        fontSize: Math.round(h * 0.032)
                    }),
                    mkBulletText({
                        name: 'Right Body',
                        x: rightX, y: h * 0.28, width: colW, height: h * 0.68,
                        text: bulletText(['Key strength', 'Supporting fact', 'Notable detail']),
                        fontSize: Math.round(h * 0.032)
                    })
                ];
            }
        },
        {
            id: 'title-only',
            name: 'Title Only',
            description: 'Just a clean title bar — the rest of the stage is yours.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Title',
                        x: w * 0.04, y: h * 0.06, width: w * 0.92, height: h * 0.18,
                        text: 'Click to add title',
                        fontSize: Math.round(h * 0.075), fontWeight: '700',
                        textAlign: 'left', textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Title Underline', x: w * 0.04, y: h * 0.26, width: w * 0.1, height: 4 })
                ];
            }
        },
        {
            id: 'section-header',
            name: 'Section Header',
            description: 'Big section number with heading and subtitle.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Section Number',
                        x: w * 0.08, y: h * 0.18, width: w * 0.4, height: h * 0.4,
                        text: '01',
                        fontSize: Math.round(h * 0.38), fontWeight: '700',
                        textColor: PALETTE.accent, fill: PALETTE.accent,
                        textAlign: 'left', textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Vertical Bar', x: w * 0.52, y: h * 0.2, width: 4, height: h * 0.55 }),
                    mkText({
                        name: 'Section Title',
                        x: w * 0.55, y: h * 0.32, width: w * 0.4, height: h * 0.15,
                        text: 'Section Title',
                        fontSize: Math.round(h * 0.06), fontWeight: '700', textAlign: 'left',
                        textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Section Subtitle',
                        x: w * 0.55, y: h * 0.5, width: w * 0.4, height: h * 0.12,
                        text: 'A short description of what comes next',
                        fontSize: Math.round(h * 0.03),
                        textColor: PALETTE.textMuted, textAlign: 'left', textVerticalAlign: 'top'
                    })
                ];
            }
        },
        {
            id: 'picture-caption',
            name: 'Picture with Caption',
            description: 'Large image area with a caption below.',
            generate(w, h) {
                return [
                    mkRect({
                        name: 'Picture Placeholder',
                        x: w * 0.14, y: h * 0.08, width: w * 0.72, height: h * 0.66
                    }),
                    mkText({
                        name: 'Picture Hint',
                        x: w * 0.14, y: h * 0.36, width: w * 0.72, height: h * 0.1,
                        text: '🖼  Drop an image here',
                        fontSize: Math.round(h * 0.03),
                        textColor: PALETTE.textMuted, textAlign: 'center', textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Caption Title',
                        x: w * 0.14, y: h * 0.78, width: w * 0.72, height: h * 0.08,
                        text: 'Caption headline',
                        fontSize: Math.round(h * 0.04), fontWeight: '700',
                        textAlign: 'center', textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Caption Body',
                        x: w * 0.14, y: h * 0.87, width: w * 0.72, height: h * 0.1,
                        text: 'Describe what the picture shows',
                        fontSize: Math.round(h * 0.025),
                        textColor: PALETTE.textMuted, textAlign: 'center', textVerticalAlign: 'top'
                    })
                ];
            }
        },
        {
            id: 'content-caption',
            name: 'Content with Caption',
            description: 'Text content on one side, image with caption on the other.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Title',
                        x: w * 0.04, y: h * 0.04, width: w * 0.92, height: h * 0.1,
                        text: 'Click to add title',
                        fontSize: Math.round(h * 0.055), fontWeight: '700', textAlign: 'left',
                        textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Title Divider', x: w * 0.04, y: h * 0.16, width: w * 0.06, height: 3 }),
                    mkBulletText({
                        name: 'Body Content',
                        x: w * 0.04, y: h * 0.22, width: w * 0.44, height: h * 0.74,
                        text: bulletText(['Key point', 'Supporting detail', 'Additional note']),
                        fontSize: Math.round(h * 0.034)
                    }),
                    mkRect({
                        name: 'Picture Placeholder',
                        x: w * 0.52, y: h * 0.22, width: w * 0.44, height: h * 0.55
                    }),
                    mkText({
                        name: 'Picture Hint',
                        x: w * 0.52, y: h * 0.46, width: w * 0.44, height: h * 0.08,
                        text: '🖼  Drop an image',
                        fontSize: Math.round(h * 0.026),
                        textColor: PALETTE.textMuted, textAlign: 'center', textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Caption',
                        x: w * 0.52, y: h * 0.8, width: w * 0.44, height: h * 0.14,
                        text: 'Image caption',
                        fontSize: Math.round(h * 0.026),
                        textColor: PALETTE.textMuted, textAlign: 'center', textVerticalAlign: 'top'
                    })
                ];
            }
        },
        {
            id: 'quote',
            name: 'Quote',
            description: 'Large quotation with attribution.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Quote Mark',
                        x: w * 0.06, y: h * 0.08, width: w * 0.15, height: h * 0.3,
                        text: '“',
                        fontSize: Math.round(h * 0.32), fontWeight: '700',
                        textColor: PALETTE.accent, fill: PALETTE.accent,
                        textAlign: 'left', textVerticalAlign: 'middle'
                    }),
                    mkText({
                        name: 'Quote Body',
                        x: w * 0.1, y: h * 0.3, width: w * 0.8, height: h * 0.4,
                        text: 'Click to add a memorable quote that anchors this slide.',
                        fontSize: Math.round(h * 0.05), fontStyle: 'italic',
                        textAlign: 'center', textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Author Divider', x: w * 0.43, y: h * 0.74, width: w * 0.14, height: 3 }),
                    mkText({
                        name: 'Author',
                        x: w * 0.2, y: h * 0.78, width: w * 0.6, height: h * 0.08,
                        text: '— Author Name',
                        fontSize: Math.round(h * 0.03),
                        textColor: PALETTE.textMuted, textAlign: 'center', textVerticalAlign: 'top'
                    })
                ];
            }
        },
        {
            id: 'big-statement',
            name: 'Big Statement',
            description: 'One huge sentence for impact slides.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Big Statement',
                        x: w * 0.04, y: h * 0.2, width: w * 0.92, height: h * 0.6,
                        text: 'Your big idea goes here.',
                        fontSize: Math.round(h * 0.11), fontWeight: '700',
                        textAlign: 'center', textVerticalAlign: 'middle',
                        lineHeight: 1.15
                    }),
                    mkBar({ name: 'Bottom Bar', x: w * 0.45, y: h * 0.84, width: w * 0.1, height: 4 })
                ];
            }
        },
        {
            id: 'closing-slide',
            name: 'Closing',
            description: '"Thank you" with Q&A or contact line.',
            generate(w, h) {
                return [
                    mkText({
                        name: 'Closing Headline',
                        x: w * 0.04, y: h * 0.28, width: w * 0.92, height: h * 0.22,
                        text: 'Thank you',
                        fontSize: Math.round(h * 0.14), fontWeight: '700',
                        textAlign: 'center', textVerticalAlign: 'middle'
                    }),
                    mkBar({ name: 'Divider', x: w * 0.4, y: h * 0.56, width: w * 0.2, height: 4 }),
                    mkText({
                        name: 'Contact Line',
                        x: w * 0.04, y: h * 0.62, width: w * 0.92, height: h * 0.1,
                        text: 'Questions?  |  yourname@example.com',
                        fontSize: Math.round(h * 0.035),
                        textColor: PALETTE.textMuted, textAlign: 'center', textVerticalAlign: 'top'
                    })
                ];
            }
        },
        {
            id: 'blank',
            name: 'Blank',
            description: 'No content — clean slate.',
            generate() { return []; }
        }
    ];

    /* ─── SVG preview ───────────────────────────────────────────── */
    function renderPreviewSvg(layout, stageW, stageH) {
        const pw = 240, ph = 135;
        const sx = pw / stageW, sy = ph / stageH;
        let objs = [];
        try { objs = layout.generate(stageW, stageH) || []; } catch (_) {}
        const shapes = objs.map(o => {
            if (!o) return '';
            const x = (o.x || 0) * sx;
            const y = (o.y || 0) * sy;
            const w = (o.width || 0) * sx;
            const h = (o.height || 0) * sy;
            if (o.type === 'text') {
                let txt = String(o.text || '').replace(/\n.*/s, '').slice(0, 30);
                if (o.listStyle && o.listStyle !== 'none') {
                    const m = o.listStyle === 'bullet' ? '• ' : (o.listStyle === 'number' ? '1. ' : (o.listStyle === 'dash' ? '– ' : (o.listStyle === 'check' ? '✓ ' : '➤ ')));
                    txt = m + txt.replace(/^[•–✓➤\d.\s]+/, '');
                }
                txt = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                const fs = Math.max(6, Math.round((o.fontSize || 16) * sy * 0.85));
                const fill = o.textColor || o.fill || '#fff';
                const anchor = o.textAlign === 'right' ? 'end' : (o.textAlign === 'left' ? 'start' : 'middle');
                let tx = x + w / 2;
                if (anchor === 'start') tx = x + 2;
                if (anchor === 'end') tx = x + w - 2;
                const ty = y + h / 2 + fs * 0.32;
                return `<text x="${tx}" y="${ty}" font-family="Inter,Arial" font-size="${fs}" font-weight="${o.fontWeight || '400'}" fill="${fill}" text-anchor="${anchor}">${txt}</text>`;
            }
            if (o.type === 'rectangle') {
                return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill || PALETTE.accent}" stroke="${o.stroke || 'transparent'}" stroke-width="${(o.strokeWidth || 0) * sy}" rx="${(o.borderRadius || 0) * sy}"/>`;
            }
            return '';
        }).join('');
        return `<svg viewBox="0 0 ${pw} ${ph}" xmlns="http://www.w3.org/2000/svg"><rect width="${pw}" height="${ph}" fill="#1e293b"/>${shapes}</svg>`;
    }

    /* ─── SlideLayouts class ────────────────────────────────────── */
    class SlideLayouts {
        constructor(app) {
            this.app = app;
            this.layouts = LAYOUTS;
            this._panelEl = null;
            this._gridEl = null;
            this._activeLayoutId = null;
            this._previewObjectIds = []; // ids placed by the current live preview
            this._tryBind();
        }

        _tryBind() {
            if (this._panelEl) return;
            const panel = document.querySelector('.slide-layouts-inline');
            if (!panel) {
                setTimeout(() => this._tryBind(), 300);
                return;
            }
            this._panelEl = panel;
            this._gridEl = panel.querySelector('#slide-layouts-grid-inline');
            const toggle = panel.querySelector('#slide-layouts-toggle');
            const headerLabel = panel.querySelector('.slide-layouts-title');
            const keepBtn = panel.querySelector('#slide-layouts-keep');
            const clearBtn = panel.querySelector('#slide-layouts-clear');

            if (this._isCollapsed()) panel.classList.add('is-collapsed');
            const onToggle = () => {
                const next = !panel.classList.contains('is-collapsed');
                panel.classList.toggle('is-collapsed', next);
                this._setCollapsed(next);
            };
            if (toggle) toggle.addEventListener('click', onToggle);
            if (headerLabel) headerLabel.addEventListener('click', onToggle);
            if (keepBtn) keepBtn.addEventListener('click', () => this.keepPreview());
            if (clearBtn) clearBtn.addEventListener('click', () => this.clearPreview());

            this._renderGrid();
        }

        _isCollapsed() { try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch (_) { return false; } }
        _setCollapsed(v) { try { localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0'); } catch (_) {} }

        _renderGrid() {
            if (!this._gridEl) return;
            const stage = this.app && this.app.stage;
            const sw = (stage && stage.width) || 1280;
            const sh = (stage && stage.height) || 720;
            this._gridEl.innerHTML = this.layouts.map(l => `
                <button type="button" class="slide-thumb${this._activeLayoutId === l.id ? ' is-active' : ''}" data-layout-id="${l.id}" title="${l.name} — ${l.description}">
                    <span class="slide-thumb-preview">${renderPreviewSvg(l, sw, sh)}</span>
                    <span class="slide-thumb-label">${l.name}</span>
                </button>
            `).join('');
            this._gridEl.querySelectorAll('.slide-thumb').forEach(btn => {
                btn.addEventListener('click', () => this.apply(btn.dataset.layoutId));
            });
        }

        // ── Live preview application ─────────────────────────────
        apply(layoutId) {
            const layout = this.layouts.find(l => l.id === layoutId);
            if (!layout) return;
            const objects = this.app && this.app.objects;
            const stage = this.app && this.app.stage;
            if (!objects || !stage) return;

            // Remove only objects added by the last preview — leave user's
            // own work alone.
            this._removePreviewObjects();

            const w = stage.width || 1280;
            const h = stage.height || 720;
            const list = layout.generate(w, h) || [];
            const wasSuppressed = !!objects._suppressHistory;
            objects._suppressHistory = true;
            const created = [];
            try {
                list.forEach(obj => {
                    if (!obj) return;
                    obj[PREVIEW_TAG] = true; // mark so we can roll it back
                    try {
                        objects.addObject(obj);
                        created.push(obj.id);
                    } catch (e) { /* ignore */ }
                });
            } finally {
                objects._suppressHistory = wasSuppressed;
            }
            this._previewObjectIds = created;
            this._activeLayoutId = layoutId;
            if (typeof objects.select === 'function' && created.length) objects.select(created);
            if (typeof objects.updateObjectList === 'function') objects.updateObjectList();
            if (typeof objects.updateProperties === 'function') objects.updateProperties();
            if (typeof stage.requestRender === 'function') stage.requestRender();
            if (window.eventBus && eventBus.emit) eventBus.emit('history:push');
            this._highlightActive();
            this._updateActionState();
            if (window.Utils && Utils.showToast) Utils.showToast(`${layout.name}: previewing`, 'info');
        }

        keepPreview() {
            if (!this._previewObjectIds.length) return;
            const objects = this.app && this.app.objects;
            (this._previewObjectIds || []).forEach(id => {
                const obj = objects && typeof objects.getObjectById === 'function' && objects.getObjectById(id);
                if (obj) delete obj[PREVIEW_TAG];
            });
            this._previewObjectIds = [];
            this._activeLayoutId = null;
            this._highlightActive();
            this._updateActionState();
            if (window.Utils && Utils.showToast) Utils.showToast('Layout pinned — click another to add a new one', 'success');
        }

        clearPreview() {
            this._removePreviewObjects();
            this._activeLayoutId = null;
            this._highlightActive();
            this._updateActionState();
            const stage = this.app && this.app.stage;
            if (stage && typeof stage.requestRender === 'function') stage.requestRender();
            if (window.Utils && Utils.showToast) Utils.showToast('Layout cleared', 'info');
        }

        _removePreviewObjects() {
            const objects = this.app && this.app.objects;
            if (!objects || !this._previewObjectIds.length) {
                this._previewObjectIds = [];
                return;
            }
            const ids = this._previewObjectIds.slice();
            const wasSuppressed = !!objects._suppressHistory;
            objects._suppressHistory = true;
            try {
                ids.forEach(id => {
                    try {
                        if (typeof objects.removeObject === 'function') objects.removeObject(id);
                    } catch (_) { /* ignore */ }
                });
            } finally {
                objects._suppressHistory = wasSuppressed;
            }
            this._previewObjectIds = [];
            if (typeof objects.updateObjectList === 'function') objects.updateObjectList();
        }

        _highlightActive() {
            if (!this._gridEl) return;
            this._gridEl.querySelectorAll('.slide-thumb').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.layoutId === this._activeLayoutId);
            });
        }

        _updateActionState() {
            if (!this._panelEl) return;
            const has = this._previewObjectIds.length > 0;
            this._panelEl.classList.toggle('has-preview', has);
        }
    }

    global.SlideLayouts = SlideLayouts;
})(typeof window !== 'undefined' ? window : this);
