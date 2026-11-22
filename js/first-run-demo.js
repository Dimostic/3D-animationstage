/**
 * First-Run Interactive Demo
 * Prefers the Stage tutorial runner onboarding tour and falls back to the
 * legacy rectangle-spin demo if the runner is not available yet.
 *
 * Triggered once on first visit. Can be replayed via the Tools menu or
 *   window.firstRunDemo.showWelcome()  /  window.firstRunDemo.start()
 */
(function () {
  'use strict';

  const FIRST_RUN_TUTORIAL_ID = 'stage-first-time-demo-tour';
  const FIRST_RUN_FINISHED_EVENT = 'animstage:first-run-tour-finished';
  const FIRST_RUN_SOURCE_AUTO = 'auto';
  const FIRST_RUN_SOURCE_TOOLS = 'tools-menu';

  // Curated welcome-modal cards. Tier 1 shows on first entry; Tier 2 shows
  // after the first guided tour completes (post-tour phase).
  const TIER_1_TUTORIAL_CARDS = [
    {
      id: 'stage-first-time-demo-tour',
      title: 'Watch the First Demo',
      copy: 'A guided live walkthrough of menus, Teach Me, scenes, timeline, and image tools.',
      primary: true
    },
    {
      id: 'stage-app-overview',
      title: 'Animation Stage Overview',
      copy: 'See the workspace, modes, AI mode, and SmartArt handoff in one orientation tour.'
    },
    {
      id: 'stage-howto-object-animation',
      title: 'How to Animate an Object',
      copy: 'Pick a shape, apply a Zoom In entry, preview, and review the timeline result.'
    },
    {
      id: 'stage-timeline-preview-export',
      title: 'Timeline, Preview, and Export',
      copy: 'Scrub the timeline, preview playback, then export your animation as video.'
    },
    {
      id: 'stage-help-and-smartart',
      title: 'Help and SmartArt Handoff',
      copy: 'Find in-app help and learn how SmartArt diagrams flow back into the stage.'
    }
  ];
  const TIER_2_TUTORIAL_CARDS = [
    {
      id: 'stage-howto-universal-character-walk',
      title: 'Animate a Walking Character',
      copy: 'Drop in the universal character rig and trigger a walk cycle on the timeline.',
      primary: true
    },
    {
      id: 'stage-howto-image-single-smart-cut',
      title: 'Rig a Character Image (Smart Cut)',
      copy: 'Take one character image and turn it into a posable rig with one click.'
    },
    {
      id: 'stage-howto-add-soundtrack',
      title: 'Add a Soundtrack',
      copy: 'Place voiceover or music onto the audio timeline and sync it to the scene.'
    },
    {
      id: 'stage-power-feature-easing-editor',
      title: 'Custom Easing Curves',
      copy: 'Author signature bezier timing curves that preset easings cannot produce.'
    }
  ];

  let activeOnboardingFlow = null;

  // ─── Demo Engine ────────────────────────────────────────────────────────────
  class FirstRunDemo {
    constructor() {
      this._aborted = false;
      this._nodes   = [];   // all DOM nodes we create, for teardown
    }

    // ── Public API ─────────────────────────────────────────────────────────
    start() {
      this._aborted = false;
      this._buildShell();
      this._run().catch(() => {});
    }

    abort() {
      this._aborted = true;
      this._nodes.forEach(n => n.remove());
      this._nodes = [];
    }

    // ── DOM Construction ───────────────────────────────────────────────────
    _mk(tag, styles, attrs) {
      const el = document.createElement(tag);
      if (styles) el.style.cssText = styles;
      if (attrs)  Object.assign(el, attrs);
      document.body.appendChild(el);
      this._nodes.push(el);
      return el;
    }

    _buildShell() {
      // Spotlight: transparent box whose box-shadow darkens everything outside it
      this._spot = this._mk('div', `
        position:fixed;z-index:9991;pointer-events:none;
        border:2.5px solid #4af;border-radius:8px;
        box-shadow:0 0 0 9999px rgba(10,14,28,0.62);
        transition:left 0.45s cubic-bezier(0.4,0,0.2,1),
                   top  0.45s cubic-bezier(0.4,0,0.2,1),
                   width 0.45s cubic-bezier(0.4,0,0.2,1),
                   height 0.45s cubic-bezier(0.4,0,0.2,1),
                   opacity 0.3s;
        opacity:0;background:transparent;
      `);

      // Cursor element
      this._cur = this._mk('div', `
        position:fixed;z-index:9995;pointer-events:none;
        will-change:transform;
        transition:transform 0.7s cubic-bezier(0.4,0,0.2,1);
        transform:translate(-9999px,-9999px);
      `);
      this._cur.innerHTML = `
        <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <filter id="frd-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
          </filter>
          <path d="M3 3L3 30L9.5 23.5L15 35L19.5 33L14 21.5L24 21.5Z"
                fill="white" stroke="#1a2035" stroke-width="1.8"
                filter="url(#frd-shadow)"/>
          <circle cx="3" cy="3" r="2.5" fill="#4aaeff"/>
        </svg>`;

      // Tooltip
      this._tip = this._mk('div', `
        position:fixed;z-index:9994;pointer-events:none;
        background:#111827;color:#e2e8f0;
        border:1.5px solid rgba(74,174,255,0.5);
        border-radius:12px;padding:14px 18px;max-width:290px;
        font-family:'Manrope',system-ui,sans-serif;font-size:13.5px;line-height:1.55;
        box-shadow:0 12px 40px rgba(0,0,0,0.55);
        transition:opacity 0.3s,transform 0.3s;
        opacity:0;transform:translateY(10px);
      `);

      // Step badge inside tooltip
      this._badge = document.createElement('div');
      this._badge.style.cssText = `
        font-size:11px;font-weight:700;color:#4aaeff;
        letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;
      `;
      this._tipText = document.createElement('div');
      this._tip.appendChild(this._badge);
      this._tip.appendChild(this._tipText);

      // Draw-box overlay shown during drag simulation
      this._drawBox = this._mk('div', `
        position:fixed;z-index:9992;pointer-events:none;
        border:2px dashed #4aaeff;border-radius:2px;
        background:rgba(74,174,255,0.08);opacity:0;
        transition:opacity 0.15s;
      `);

      // Skip button
      this._skipBtn = this._mk('button', `
        position:fixed;top:12px;right:12px;z-index:9996;
        background:rgba(17,24,39,0.92);color:#6b8aad;
        border:1px solid rgba(74,174,255,0.25);border-radius:7px;
        padding:7px 15px;font-size:12.5px;cursor:pointer;pointer-events:auto;
        font-family:'Manrope',system-ui,sans-serif;
        transition:color 0.2s,border-color 0.2s;
      `);
      this._skipBtn.textContent = '✕  Skip Demo';
      this._skipBtn.onmouseenter = () => {
        this._skipBtn.style.color = '#fff';
        this._skipBtn.style.borderColor = '#4aaeff';
      };
      this._skipBtn.onmouseleave = () => {
        this._skipBtn.style.color = '#6b8aad';
        this._skipBtn.style.borderColor = 'rgba(74,174,255,0.25)';
      };
      this._skipBtn.onclick = () => this.abort();
    }

    // ── Utilities ──────────────────────────────────────────────────────────
    _wait(ms) {
      return new Promise((res, rej) => {
        if (this._aborted) { rej(new Error('aborted')); return; }
        const id = setTimeout(() => {
          if (this._aborted) rej(new Error('aborted'));
          else res();
        }, ms);
        // Store so abort can cancel
        this._lastTimer = id;
      });
    }

    _check() {
      if (this._aborted) throw new Error('aborted');
    }

    _moveCursor(el) {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width  * 0.5 - 4;
      const y = r.top  + r.height * 0.5 - 4;
      this._cur.style.transform = `translate(${x}px,${y}px)`;
    }

    _moveCursorXY(x, y) {
      this._cur.style.transform = `translate(${x - 4}px,${y - 4}px)`;
    }

    _spotlightEl(el, pad = 8) {
      const r = el.getBoundingClientRect();
      this._spot.style.left   = (r.left   - pad) + 'px';
      this._spot.style.top    = (r.top    - pad) + 'px';
      this._spot.style.width  = (r.width  + pad * 2) + 'px';
      this._spot.style.height = (r.height + pad * 2) + 'px';
      this._spot.style.opacity = '1';
    }

    _spotlightRect(x, y, w, h, pad = 0) {
      this._spot.style.left   = (x - pad) + 'px';
      this._spot.style.top    = (y - pad) + 'px';
      this._spot.style.width  = (w + pad * 2) + 'px';
      this._spot.style.height = (h + pad * 2) + 'px';
      this._spot.style.opacity = '1';
    }

    _hideSpotlight() {
      this._spot.style.opacity = '0';
    }

    _showTip(stepNum, totalSteps, text, anchorEl) {
      this._check();
      this._badge.textContent = stepNum ? `Step ${stepNum} / ${totalSteps}` : 'Animation Stage';
      this._tipText.textContent = text;

      const r  = anchorEl.getBoundingClientRect();
      const tw = 290, th = 100;
      const margin = 16;

      // Try right of element, then left, then below
      let left = r.right + margin;
      let top  = r.top;

      if (left + tw > window.innerWidth - margin) {
        left = r.left - tw - margin;
      }
      if (left < margin) {
        left = r.left;
        top  = r.bottom + margin;
      }
      if (top + th > window.innerHeight - margin) {
        top = r.top - th - margin;
      }
      top  = Math.max(margin, top);
      left = Math.max(margin, left);

      this._tip.style.left      = left + 'px';
      this._tip.style.top       = top  + 'px';
      this._tip.style.opacity   = '1';
      this._tip.style.transform = 'translateY(0)';
    }

    _hideTip() {
      this._tip.style.opacity   = '0';
      this._tip.style.transform = 'translateY(10px)';
    }

    _flash(el) {
      const old = el.style.cssText;
      el.style.outline         = '3px solid #4aaeff';
      el.style.outlineOffset   = '2px';
      el.style.transition      = 'outline 0.4s,outline-offset 0.4s';
      setTimeout(() => {
        el.style.outline       = old.includes('outline') ? '' : 'none';
        el.style.outlineOffset = '';
      }, 600);
    }

    _pulseEl(el) {
      el.dataset._frdPulse = '1';
      if (!document.getElementById('frd-pulse-style')) {
        const s = document.createElement('style');
        s.id = 'frd-pulse-style';
        s.textContent = `
          @keyframes frd-pulse {
            0%,100% { box-shadow:0 0 0 0 rgba(74,174,255,0.7); }
            50%      { box-shadow:0 0 0 8px rgba(74,174,255,0); }
          }
          [data-_frd-pulse="1"] { animation:frd-pulse 1.1s ease-in-out infinite !important; }
        `;
        document.head.appendChild(s);
      }
      el.style.animation = 'frd-pulse 1.1s ease-in-out infinite';
    }

    _clearPulse(el) {
      delete el.dataset._frdPulse;
      el.style.animation = '';
    }

    _waitForClick(el, timeout = 20000) {
      return new Promise((res, rej) => {
        if (this._aborted) { rej(new Error('aborted')); return; }
        const onAbortCheck = setInterval(() => {
          if (this._aborted) {
            cleanup();
            rej(new Error('aborted'));
          }
        }, 200);
        const tid = setTimeout(() => {
          cleanup();
          res();
        }, timeout);
        const handler = () => { cleanup(); res(); };
        el.addEventListener('click', handler, { once: true });
        function cleanup() {
          clearTimeout(tid);
          clearInterval(onAbortCheck);
          el.removeEventListener('click', handler);
        }
      });
    }

    /**
     * Show a Continue button inside the tooltip and wait for the user to click it.
     * Used after steps that open popups/windows we can't close programmatically.
     */
    _waitForContinue(message, anchorEl) {
      return new Promise((res, rej) => {
        if (this._aborted) { rej(new Error('aborted')); return; }

        // Build continue button inside tooltip
        this._badge.textContent = 'Waiting for you…';
        this._tipText.innerHTML = `
          <span>${message}</span>
          <br><br>
          <button id="frd-continue-btn" style="
            background:linear-gradient(135deg,#2563eb,#7c3aed);
            color:#fff;border:none;border-radius:8px;
            padding:9px 20px;font-size:13px;font-weight:700;
            cursor:pointer;pointer-events:auto;
            box-shadow:0 3px 12px rgba(37,99,235,0.4);
            transition:opacity 0.2s;
          ">Continue →</button>`;
        this._tip.style.pointerEvents = 'auto';
        this._tip.style.opacity = '1';
        this._tip.style.transform = 'translateY(0)';

        // Reposition to be clearly visible
        if (anchorEl) {
          const r = anchorEl.getBoundingClientRect();
          let left = r.left;
          let top  = r.bottom + 14;
          if (top + 120 > window.innerHeight - 16) top = r.top - 130;
          this._tip.style.left = Math.max(16, left) + 'px';
          this._tip.style.top  = Math.max(16, top)  + 'px';
        }

        const onAbortCheck = setInterval(() => {
          if (this._aborted) { cleanup(); rej(new Error('aborted')); }
        }, 200);

        const btn = document.getElementById('frd-continue-btn');
        const handler = () => { cleanup(); this._tip.style.pointerEvents = ''; res(); };
        if (btn) btn.addEventListener('click', handler, { once: true });

        function cleanup() {
          clearInterval(onAbortCheck);
          const b = document.getElementById('frd-continue-btn');
          if (b) b.removeEventListener('click', handler);
        }
      });
    }

    _click(el) {
      ['mousedown','mouseup','click'].forEach(type => {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      });
    }

    // ── Preview-window helpers ─────────────────────────────────────────────
    _showPreviewBanner() {
      if (this._banner) return;
      this._banner = document.createElement('div');
      this._banner.id = 'frd-preview-banner';
      this._banner.style.cssText = `
        position:fixed;top:0;left:0;right:0;z-index:99999;
        background:linear-gradient(90deg,#1e3a5f,#1a2035);
        border-bottom:2px solid #4aaeff;
        color:#e2e8f0;font-family:'Manrope',system-ui,sans-serif;
        font-size:14px;padding:12px 20px;
        display:flex;align-items:center;gap:16px;
        box-shadow:0 4px 20px rgba(0,0,0,0.5);
        pointer-events:auto;
      `;
      this._banner.innerHTML = `
        <span style="font-size:20px">🎬</span>
        <span style="flex:1">
          <strong style="color:#4aaeff">Demo Step 5/6 — Preview:</strong>
          Your rectangle is spinning in the preview window!
          <em style="color:#94a3b8;font-size:12px;margin-left:8px;">Close the preview window when done to auto-continue.</em>
        </span>
        <button id="frd-banner-close" style="
          background:rgba(74,174,255,0.15);color:#4aaeff;
          border:1px solid #4aaeff;border-radius:6px;
          padding:6px 14px;font-size:12.5px;font-weight:700;cursor:pointer;
        ">Skip & Continue →</button>
      `;
      document.body.appendChild(this._banner);
      this._nodes.push(this._banner);
      this._bannerSkipped = false;
      this._banner.querySelector('#frd-banner-close').addEventListener('click', () => {
        this._bannerSkipped = true;
        if (this._previewWin && !this._previewWin.closed) {
          try { this._previewWin.close(); } catch (e) {}
        }
      });
    }

    _hidePreviewBanner() {
      if (this._banner) {
        this._banner.remove();
        this._banner = null;
      }
    }

    /**
     * Polls until the preview window is closed (user closed it or skip clicked).
     * Resolves automatically — no user button needed in the main UI.
     */
    _waitForPreviewClose() {
      return new Promise((res, rej) => {
        const tick = setInterval(() => {
          if (this._aborted) {
            clearInterval(tick);
            rej(new Error('aborted'));
            return;
          }
          const closed = !this._previewWin || this._previewWin.closed || this._bannerSkipped;
          if (closed) {
            clearInterval(tick);
            // Auto-close if still open (skip button path)
            if (this._previewWin && !this._previewWin.closed) {
              try { this._previewWin.close(); } catch (e) {}
            }
            res();
          }
        }, 400);
      });
    }

    _waitForExportModalClose() {
      return new Promise((res, rej) => {
        const tick = setInterval(() => {
          if (this._aborted) {
            clearInterval(tick);
            rej(new Error('aborted'));
            return;
          }
          const modal = document.getElementById('export-modal');
          const closed = !modal || modal.classList.contains('hidden');
          if (closed) {
            clearInterval(tick);
            res();
          }
        }, 300);
      });
    }

    async _dragOnViewport(vp, x1, y1, x2, y2, steps = 14) {
      const fire = (type, cx, cy) => {
        vp.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true,
          clientX: cx, clientY: cy,
          button: 0, buttons: type === 'mouseup' ? 0 : 1
        }));
      };

      // Animate draw-box during drag
      const bx = Math.min(x1, x2), by = Math.min(y1, y2);
      const bw = Math.abs(x2 - x1), bh = Math.abs(y2 - y1);

      fire('mousedown', x1, y1);
      await this._wait(60);

      for (let i = 1; i <= steps; i++) {
        this._check();
        const t  = i / steps;
        const cx = x1 + (x2 - x1) * t;
        const cy = y1 + (y2 - y1) * t;
        fire('mousemove', cx, cy);

        // Animate cursor & draw-box
        this._moveCursorXY(cx, cy);
        const pw = Math.abs(cx - x1), ph = Math.abs(cy - y1);
        this._drawBox.style.left    = Math.min(x1, cx) + 'px';
        this._drawBox.style.top     = Math.min(y1, cy) + 'px';
        this._drawBox.style.width   = pw + 'px';
        this._drawBox.style.height  = ph + 'px';
        this._drawBox.style.opacity = '1';

        await this._wait(42);
      }

      fire('mouseup', x2, y2);
      await this._wait(100);
      this._drawBox.style.opacity = '0';

      // Spotlight the drawn rect area
      this._spotlightRect(bx, by, bw, bh, 10);
    }

    // ── Main Step Runner ───────────────────────────────────────────────────
    async _run() {
      const T = 6; // total steps

      await this._wait(300);

      // ── Resolve viewport ───────────────────────────────────────────────
      const vp = document.getElementById('stage-viewport') ||
                 document.getElementById('stage-canvas');
      if (!vp) { this.abort(); return; }
      const vpR = vp.getBoundingClientRect();

      // Draw target: centre of canvas
      const cx  = vpR.left + vpR.width  * 0.45;
      const cy  = vpR.top  + vpR.height * 0.40;
      const dx  = Math.min(160, vpR.width  * 0.25);
      const dy  = Math.min(110, vpR.height * 0.22);

      // ═══════════════════════════════════════════════════════════════════
      // Step 1 — Select Rectangle tool
      // ═══════════════════════════════════════════════════════════════════
      {
        const btn = document.querySelector('.tool-btn[data-tool="rectangle"]');
        if (!btn) { this.abort(); return; }

        this._moveCursor(btn);
        await this._wait(750);
        this._check();

        this._spotlightEl(btn, 10);
        this._showTip(1, T, 'First, select the Rectangle tool from the Tools panel on the left.', btn);
        await this._wait(2200);
        this._check();

        this._flash(btn);
        this._click(btn);
        await this._wait(450);
      }

      // ═══════════════════════════════════════════════════════════════════
      // Step 2 — Draw shape on canvas
      // ═══════════════════════════════════════════════════════════════════
      {
        this._check();
        this._moveCursorXY(cx - dx, cy - dy);
        this._hideSpotlight();
        this._hideTip();
        await this._wait(750);
        this._check();

        this._spotlightRect(vpR.left, vpR.top, vpR.width, vpR.height, 0);
        this._showTip(2, T, 'Click and drag on the canvas to draw your rectangle.', vp);
        await this._wait(1600);
        this._check();
        this._hideTip();

        await this._dragOnViewport(vp, cx - dx, cy - dy, cx + dx, cy + dy);

        await this._wait(350);
        this._check();

        this._showTip(2, T, 'Shape created! Now select it so we can apply an animation.', vp);
        await this._wait(1400);
        this._hideTip();

        // Switch back to Select tool and click the shape to ensure it is selected
        const selBtn = document.querySelector('.tool-btn[data-tool="select"]');
        if (selBtn) this._click(selBtn);
        await this._wait(200);
        vp.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true, cancelable: true,
          clientX: cx, clientY: cy, button: 0, buttons: 1
        }));
        vp.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true, cancelable: true,
          clientX: cx, clientY: cy, button: 0, buttons: 0
        }));
        vp.dispatchEvent(new MouseEvent('click', {
          bubbles: true, cancelable: true,
          clientX: cx, clientY: cy
        }));
        await this._wait(400);
      }

      // ═══════════════════════════════════════════════════════════════════
      // Step 3 — Open Animate tab in right panel
      // ═══════════════════════════════════════════════════════════════════
      {
        this._check();

        // ── Force right panel open (bypasses CSS transitions / width issues) ──
        const rightPanel      = document.getElementById('right-panel');
        const collapsedRtBar  = document.getElementById('collapsed-right-bar');
        const btnRight        = document.getElementById('collapse-right');

        if (rightPanel) {
          // 1. Remove layout-hidden (some layouts hide the whole panel)
          rightPanel.classList.remove('layout-hidden');

          // 2. Remove collapsed class and restore width directly
          if (rightPanel.classList.contains('collapsed')) {
            rightPanel.classList.remove('collapsed');
            // Restore saved width from app, or fall back to CSS variable / 280px
            const savedW = window.app?.panelWidths?.right || 280;
            rightPanel.style.width    = savedW + 'px';
            rightPanel.style.minWidth = savedW + 'px';

            // Update the toggle button icon and state
            if (btnRight) {
              btnRight.classList.remove('is-collapsed');
              const icon = btnRight.querySelector('i');
              if (icon) icon.className = 'fas fa-chevron-right';
            }
            // Hide the collapsed vertical bar
            if (collapsedRtBar) {
              collapsedRtBar.classList.add('hidden');
              collapsedRtBar.classList.remove('minimized');
            }
          }
          await this._wait(300);

          // 3. Trigger a stage resize so the canvas reflows
          if (window.app?.stage) {
            window.app.stage.resizeCanvas();
          }
          await this._wait(200);
        }

        // Switch to Animations tab via the app API
        if (window.app && typeof window.app.switchRightTab === 'function') {
          window.app.switchRightTab('animations');
        }

        const animTab = document.querySelector('#right-panel .panel-tab[data-tab="animations"]');
        if (!animTab) { this.abort(); return; }

        this._moveCursor(animTab);
        await this._wait(700);
        this._check();

        this._spotlightEl(animTab, 8);
        this._showTip(3, T, 'The Animate panel is now open — here you can add motion to your shape.', animTab);
        await this._wait(2200);
        this._hideTip();
      }

      // ═══════════════════════════════════════════════════════════════════
      // Step 4 — Apply Spin Clockwise (rotation) animation
      // ═══════════════════════════════════════════════════════════════════
      {
        this._check();

        // Switch to Properties subtab (where Rotation lives)
        const propSubtab = document.querySelector('.anim-subtab[data-subtab="properties"]');
        if (propSubtab) {
          this._click(propSubtab);
          await this._wait(400);
        }

        // Scroll the spin-cw button into view
        const spinBtn = document.querySelector('.anim-btn[data-anim="spin-cw"]');
        if (!spinBtn) { this.abort(); return; }

        spinBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await this._wait(500);

        this._moveCursor(spinBtn);
        await this._wait(750);
        this._check();

        this._spotlightEl(spinBtn, 8);
        this._showTip(4, T,
          'Click "Spin Clockwise" — this adds a continuous rotation animation to your shape.',
          spinBtn);
        await this._wait(2200);
        this._check();

        this._flash(spinBtn);
        this._click(spinBtn);
        await this._wait(500);
        this._check();

        // Set repeat = infinite + smooth-cycle so export shows continuous spinning
        const repeatSel = document.getElementById('param-repeat');
        const repeatModeSel = document.getElementById('param-repeat-mode');
        if (repeatSel) repeatSel.value = '-1';
        if (repeatModeSel) repeatModeSel.value = 'cycle';

        // Re-select the drawn object so Apply has a target (switching tabs can deselect)
        if (window.app?.objects?.objects?.length > 0) {
          const lastObj = window.app.objects.objects[window.app.objects.objects.length - 1];
          if (typeof window.app.objects.select === 'function') {
            window.app.objects.select([lastObj.id]); // must pass an array
          }
          await this._wait(150);
        }

        // Click the Apply button to actually attach the animation to the object
        const applyBtn = document.getElementById('btn-apply-anim');
        if (applyBtn) {
          this._flash(applyBtn);
          this._click(applyBtn);
          await this._wait(400);
        }
        this._check();

        this._showTip(4, T,
          'Rotation animation applied! You can see the keyframe in the timeline below.',
          spinBtn);
        await this._wait(1800);
        this._hideTip();
      }

      // ═══════════════════════════════════════════════════════════════════
      // Step 5 — Preview  (user must click — window.open needs a real gesture)
      // ═══════════════════════════════════════════════════════════════════
      {
        this._check();

        const previewBtn = document.getElementById('btn-preview');
        if (!previewBtn) { this.abort(); return; }

        this._moveCursor(previewBtn);
        await this._wait(750);
        this._check();

        this._spotlightEl(previewBtn, 8);
        this._showTip(5, T,
          '👆 Your turn! Click Preview to watch your shape spin in real time.', previewBtn);
        this._skipBtn.style.display = 'none'; // hide so it doesn't cover the preview button
        this._pulseEl(previewBtn);

        // Intercept window.open to capture the preview window reference
        this._previewWin = null;
        const _origOpen = window.open;
        window.open = (...args) => {
          const w = _origOpen.apply(window, args);
          this._previewWin = w;
          window.open = _origOpen;
          return w;
        };

        await this._waitForClick(previewBtn, 30000);
        window.open = _origOpen; // safety restore
        this._skipBtn.style.display = ''; // restore skip button
        this._clearPulse(previewBtn);
        this._hideTip();

        await this._wait(1400); // let the preview window open and render

        // Enable looping in preview window so animation keeps spinning
        if (this._previewWin && !this._previewWin.closed) {
          try {
            const pw = this._previewWin;
            const loopBtn  = pw.document.getElementById('btnLoop');
            const resetBtn = pw.document.getElementById('btnReset');
            const playBtn  = pw.document.getElementById('btnPlay');
            if (loopBtn  && !loopBtn.classList.contains('active')) loopBtn.click();
            if (resetBtn) resetBtn.click();
            if (playBtn)  playBtn.click();
          } catch (e) { /* cross-origin or closed */ }
        }

        await this._wait(500);
        this._check();

        // Show a persistent floating banner at the TOP of the main window
        // (visible even when preview covers the stage) and wait for preview to close
        this._showPreviewBanner();
        await this._waitForPreviewClose();
        this._hidePreviewBanner();

        await this._wait(400);
      }

      // ═══════════════════════════════════════════════════════════════════
      // Step 6 — Export
      // ═══════════════════════════════════════════════════════════════════
      {
        this._check();

        const exportBtn = document.getElementById('btn-export');
        if (!exportBtn) { this.abort(); return; }

        this._moveCursor(exportBtn);
        await this._wait(750);
        this._check();

        this._spotlightEl(exportBtn, 8);
        this._showTip(6, T,
          '👆 Your turn! Click Export to save your animation as GIF, MP4, WebM, and more.',
          exportBtn);
        this._pulseEl(exportBtn);

        // Stop pulse after 15 s whether or not user clicked
        const _exportPulseTid = setTimeout(() => this._clearPulse(exportBtn), 15000);
        await this._waitForClick(exportBtn, 30000);
        clearTimeout(_exportPulseTid);
        this._clearPulse(exportBtn);

        // Clean up demo chrome immediately so the export modal is fully usable
        this._hideSpotlight();
        this._hideTip();
        this._skipBtn.style.display = 'none';

        // Wait for the export modal to close before showing the Done card
        // (the modal has z-index 1000; the Done card is 9996 — showing it
        // immediately would cover and freeze the export modal)
        await this._waitForExportModalClose();
      }

      // ═══════════════════════════════════════════════════════════════════
      // Done!
      // ═══════════════════════════════════════════════════════════════════
      this._check();
      await this._wait(300);
      this._showDoneCard();
    }

    // ── Done Card ──────────────────────────────────────────────────────────
    _showDoneCard() {
      this._cur.style.opacity = '0';

      const card = this._mk('div', `
        position:fixed;inset:0;z-index:9996;
        display:flex;align-items:center;justify-content:center;
        pointer-events:auto;
        animation:frd-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
      `);
      card.innerHTML = `
        <style>
          @keyframes frd-pop {
            from { opacity:0; transform:scale(0.88); }
            to   { opacity:1; transform:scale(1); }
          }
        </style>
        <div style="
          background:#0f172a;border:1.5px solid #4aaeff;
          border-radius:20px;padding:44px 52px;text-align:center;
          max-width:440px;width:90%;
          box-shadow:0 24px 70px rgba(0,0,0,0.7);
          font-family:'Manrope',system-ui,sans-serif;
        ">
          <div style="font-size:52px;margin-bottom:14px;">🎉</div>
          <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 12px;font-weight:800;">
            You're ready to create!
          </h2>
          <p style="color:#94a3b8;font-size:14px;line-height:1.65;margin:0 0 30px;">
            You just drew a shape, applied a Spin&nbsp;Clockwise animation,
            previewed and exported it — the complete Animation Stage
            workflow in under a minute!
          </p>
          <button id="frd-done-btn" style="
            background:linear-gradient(135deg,#2563eb,#7c3aed);
            color:#fff;border:none;border-radius:10px;
            padding:13px 30px;font-size:15px;font-weight:700;
            cursor:pointer;letter-spacing:0.2px;
            box-shadow:0 4px 20px rgba(37,99,235,0.4);
            transition:opacity 0.2s;
          ">Start Creating →</button>
        </div>`;

      card.querySelector('#frd-done-btn').addEventListener('click', () => {
        localStorage.setItem('frd-done', '1');
        this.abort();
      });
    }
  }

  function normalizeOnboardingSource(source) {
    return source === FIRST_RUN_SOURCE_TOOLS ? FIRST_RUN_SOURCE_TOOLS : FIRST_RUN_SOURCE_AUTO;
  }

  function markFirstRunHandled() {
    try {
      localStorage.setItem('frd-done', '1');
    } catch (_) {}
  }

  function openTutorialLibrary() {
    markFirstRunHandled();
    const runner = window.stageTutorialRunner;
    if (runner && typeof runner.togglePanel === 'function') {
      window.setTimeout(() => {
        runner.togglePanel(true);
      }, 0);
      return;
    }
    window.setTimeout(() => {
      document.getElementById('btn-stage-tutorials')?.click();
    }, 0);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTutorialCards(cards) {
    return cards.map(card => `
          <button data-tutorial-id="${escapeHtml(card.id)}" class="frd-action frd-tutorial-card${card.primary ? ' frd-action-primary' : ''}" type="button">
            <span class="frd-action-title">${escapeHtml(card.title)}</span>
            <span class="frd-action-copy">${escapeHtml(card.copy)}</span>
          </button>`).join('');
  }

  function buildWelcomeModalContent(options = {}) {
    const phase = options.phase === 'post-tour' ? 'post-tour' : 'entry';
    const source = normalizeOnboardingSource(options.source);
    const isPostTour = phase === 'post-tour';
    const eyebrow = isPostTour
      ? 'What to learn next'
      : (source === FIRST_RUN_SOURCE_TOOLS ? 'Demo Tour' : 'Start here');
    const title = isPostTour
      ? 'Pick your next tutorial'
      : 'Choose a tutorial to begin';
    const body = isPostTour
      ? 'Nice work finishing the first demo. Here are the next workflows most users explore — pick one to keep learning, or jump back into the editor.'
      : 'These short guided tutorials cover the essentials of Animation Stage. Pick one to watch live, or skip straight into the editor.';
    const cards = isPostTour ? TIER_2_TUTORIAL_CARDS : TIER_1_TUTORIAL_CARDS;
    const tutorialCards = renderTutorialCards(cards);

    return `
      <style>
        @keyframes frd-fadein {
          from { opacity:0; transform:scale(0.97); }
          to { opacity:1; transform:scale(1); }
        }
        #frd-welcome {
          position:fixed;
          inset:0;
          z-index:9999;
          display:flex;
          align-items:flex-start;
          justify-content:center;
          padding:24px;
          overflow-y:auto;
          -webkit-overflow-scrolling:touch;
          background:radial-gradient(circle at top, rgba(37,99,235,0.18), transparent 42%), rgba(2,6,23,0.8);
          pointer-events:auto;
          animation:frd-fadein 0.35s ease both;
        }
        #frd-welcome .frd-modal {
          width:min(560px, 100%);
          box-sizing:border-box;
          border:1px solid rgba(96,165,250,0.28);
          border-radius:26px;
          padding:32px;
          background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94));
          box-shadow:0 28px 90px rgba(0,0,0,0.56);
          font-family:'Manrope',system-ui,sans-serif;
          color:#e2e8f0;
          margin:auto;
          resize:both;
          overflow:auto;
          min-width:280px;
          min-height:240px;
          max-width:100%;
        }
        @media (max-width: 600px) {
          #frd-welcome { padding:12px; }
          #frd-welcome .frd-modal {
            padding:20px 18px;
            border-radius:18px;
            resize:none;
          }
          #frd-welcome .frd-title { font-size:22px; margin:14px 0 8px; }
          #frd-welcome .frd-copy { font-size:13px; }
          #frd-welcome .frd-grid { margin-top:16px; gap:10px; }
        }
        @media (max-height: 640px) {
          #frd-welcome { align-items:flex-start; padding-top:16px; padding-bottom:16px; }
          #frd-welcome .frd-modal { margin:0 auto; }
        }
        #frd-welcome .frd-badge {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:999px;
          background:rgba(37,99,235,0.16);
          color:#93c5fd;
          font-size:11px;
          font-weight:800;
          letter-spacing:0.14em;
          text-transform:uppercase;
        }
        #frd-welcome .frd-title {
          margin:18px 0 10px;
          font-size:29px;
          line-height:1.15;
          color:#f8fafc;
        }
        #frd-welcome .frd-copy {
          margin:0;
          font-size:14px;
          line-height:1.7;
          color:#94a3b8;
        }
        #frd-welcome .frd-grid {
          display:grid;
          gap:12px;
          margin-top:24px;
        }
        #frd-welcome .frd-action {
          width:100%;
          box-sizing:border-box;
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:6px;
          padding:18px 20px;
          border-radius:18px;
          border:1px solid rgba(148,163,184,0.18);
          background:rgba(15,23,42,0.72);
          color:#e2e8f0;
          text-align:left;
          cursor:pointer;
          transition:transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        #frd-welcome .frd-action:hover {
          transform:translateY(-1px);
          border-color:rgba(125,211,252,0.36);
          background:rgba(15,23,42,0.94);
        }
        #frd-welcome .frd-action-primary {
          background:linear-gradient(135deg, rgba(37,99,235,0.96), rgba(124,58,237,0.92));
          border-color:rgba(147,197,253,0.32);
          box-shadow:0 18px 40px rgba(37,99,235,0.22);
        }
        #frd-welcome .frd-action-primary:hover {
          border-color:rgba(191,219,254,0.56);
          background:linear-gradient(135deg, rgba(37,99,235,1), rgba(124,58,237,0.96));
        }
        #frd-welcome .frd-action-muted {
          background:rgba(15,23,42,0.6);
          border-style:dashed;
        }
        #frd-welcome .frd-action-title {
          display:block;
          width:100%;
          font-size:15px;
          font-weight:800;
          color:#f8fafc;
          white-space:normal;
          overflow-wrap:anywhere;
        }
        #frd-welcome .frd-action-copy {
          display:block;
          width:100%;
          font-size:13px;
          line-height:1.55;
          color:rgba(226,232,240,0.82);
          white-space:normal;
          overflow-wrap:anywhere;
        }
      </style>
      <div class="frd-modal" role="dialog" aria-modal="true" aria-labelledby="frd-modal-title">
        <div class="frd-badge">${eyebrow}</div>
        <h2 id="frd-modal-title" class="frd-title">${title}</h2>
        <p class="frd-copy">${body}</p>
        <div class="frd-grid">
${tutorialCards}
          <button id="frd-explore-btn" class="frd-action" type="button">
            <span class="frd-action-title">Explore Other Tutorials</span>
            <span class="frd-action-copy">Open the full tutorial library and choose a workflow that fits what you want to build next.</span>
          </button>
          <button id="frd-start-btn" class="frd-action frd-action-muted" type="button">
            <span class="frd-action-title">Start Animating</span>
            <span class="frd-action-copy">Close this guide and continue working directly in the editor.</span>
          </button>
        </div>
      </div>`;
  }

  async function startStageOnboardingTour(tutorialId = FIRST_RUN_TUTORIAL_ID) {
    const runner = window.stageTutorialRunner;
    const targetId = tutorialId || FIRST_RUN_TUTORIAL_ID;
    const tutorial = typeof runner?._getTutorialById === 'function'
      ? runner._getTutorialById(targetId)
      : null;

    if (runner && tutorial && typeof runner.play === 'function') {
      await runner.play(tutorial.id);
      return true;
    }

    return false;
  }

  function startLegacyFirstRunDemo() {
    const demo = new FirstRunDemo();
    window._currentFirstRunDemo = demo;
    demo.start();
  }

  async function startFirstRunExperience(options = {}) {
    const flow = {
      source: normalizeOnboardingSource(options.source),
      showPostTourPrompt: options.showPostTourPrompt !== false,
      tutorialId: options.tutorialId || FIRST_RUN_TUTORIAL_ID,
      completed: false
    };
    const isFirstRunTutorial = flow.tutorialId === FIRST_RUN_TUTORIAL_ID;
    activeOnboardingFlow = isFirstRunTutorial ? flow : null;

    try {
      const startedTutorial = await startStageOnboardingTour(flow.tutorialId);
      if (startedTutorial) {
        if (isFirstRunTutorial && flow.completed && flow.showPostTourPrompt) {
          showWelcomeModal({ source: flow.source, phase: 'post-tour' });
        }
        return;
      }
    } catch (error) {
      console.warn('Stage onboarding tour failed, using legacy demo instead.', error);
    } finally {
      if (activeOnboardingFlow === flow) {
        activeOnboardingFlow = null;
      }
    }

    if (isFirstRunTutorial) {
      startLegacyFirstRunDemo();
    }
  }

  // ─── Welcome Modal ───────────────────────────────────────────────────────────
  function showWelcomeModal(options = {}) {
    if (document.getElementById('frd-welcome')) return;

    const modal = document.createElement('div');
    modal.id = 'frd-welcome';
    modal.innerHTML = buildWelcomeModalContent(options);

    document.body.appendChild(modal);

    modal.querySelectorAll('.frd-tutorial-card[data-tutorial-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tutorialId = btn.getAttribute('data-tutorial-id') || FIRST_RUN_TUTORIAL_ID;
        markFirstRunHandled();
        modal.remove();
        startFirstRunExperience({
          source: options.source,
          tutorialId,
          showPostTourPrompt: tutorialId === FIRST_RUN_TUTORIAL_ID
        });
      });
    });

    modal.querySelector('#frd-explore-btn')?.addEventListener('click', () => {
      modal.remove();
      openTutorialLibrary();
    });

    modal.querySelector('#frd-start-btn')?.addEventListener('click', () => {
      markFirstRunHandled();
      modal.remove();
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────
  function boot() {
    // Don't show if already completed / skipped
    if (localStorage.getItem('frd-done')) return;
    // Skip in preview/export contexts
    if (window.__stagePreviewMode) return;

    const loader = document.getElementById('studio-loader');
    if (!loader) {
      // App hasn't started building the DOM yet; retry
      setTimeout(boot, 600);
      return;
    }

    // Wait for loader to hide (app init complete)
    if (loader.classList.contains('is-hidden')) {
      // Already hidden (fast load or cached)
      setTimeout(() => showWelcomeModal({ source: FIRST_RUN_SOURCE_AUTO, phase: 'entry' }), 700);
      return;
    }

    const obs = new MutationObserver(() => {
      if (loader.classList.contains('is-hidden')) {
        obs.disconnect();
        setTimeout(() => showWelcomeModal({ source: FIRST_RUN_SOURCE_AUTO, phase: 'entry' }), 800);
      }
    });
    obs.observe(loader, { attributes: true, attributeFilter: ['class'] });
  }

  window.addEventListener(FIRST_RUN_FINISHED_EVENT, () => {
    if (!activeOnboardingFlow) return;
    activeOnboardingFlow.completed = true;
  });

  // ─── Public API ──────────────────────────────────────────────────────────────
  window.firstRunDemo = {
    /** Show the welcome modal (even if already dismissed once). */
    showWelcome(options = {}) {
      showWelcomeModal({
        source: options.source || FIRST_RUN_SOURCE_TOOLS,
        phase: options.phase || 'entry'
      });
    },
    /** Start the demo immediately, skipping the welcome modal. */
    start(options = {}) {
      markFirstRunHandled();
      startFirstRunExperience({
        source: options.source || FIRST_RUN_SOURCE_TOOLS,
        showPostTourPrompt: options.showPostTourPrompt !== false
      });
    },
    /** Abort any running demo. */
    stop() {
      if (window._currentFirstRunDemo) {
        window._currentFirstRunDemo.abort();
      }
      window.stageTutorialRunner?.stop({ silent: true });
    }
  };

  // ─── Init ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
