/**
 * Accessibility helpers
 *
 * Provides:
 *   1. aria-live on the toast container so screen readers announce toasts.
 *   2. Global Escape key handler that closes the topmost visible modal.
 *   3. Tab focus trap within visible modals (Tab and Shift+Tab cycle within
 *      the modal, never leaking focus to the page underneath).
 *   4. Auto-applied aria-label for icon-only buttons that have a title but
 *      no accessible name.
 *
 * Designed to be additive and never block existing handlers. Loaded once
 * on DOMContentLoaded.
 */
(function () {
    'use strict';

    var FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function isVisible(el) {
        if (!el) return false;
        if (el.classList && el.classList.contains('hidden')) return false;
        var style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    }

    function topmostVisibleModal() {
        var modals = document.querySelectorAll('.modal[role="dialog"], .modal-overlay[role="dialog"]');
        var visible = [];
        modals.forEach(function (m) { if (isVisible(m)) visible.push(m); });
        if (visible.length === 0) return null;
        // Pick the one with the highest computed z-index, fall back to last in DOM.
        visible.sort(function (a, b) {
            var za = parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
            var zb = parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
            return zb - za;
        });
        return visible[0];
    }

    function focusableWithin(container) {
        if (!container) return [];
        var nodes = container.querySelectorAll(FOCUSABLE_SELECTOR);
        var out = [];
        for (var i = 0; i < nodes.length; i++) {
            if (isVisible(nodes[i]) && !nodes[i].closest('[inert]')) out.push(nodes[i]);
        }
        return out;
    }

    function closeModal(modal) {
        if (!modal) return false;
        // Prefer a .modal-close button click — preserves existing close logic.
        var btn = modal.querySelector('.modal-close, [data-close-modal]');
        if (btn) {
            try { btn.click(); return true; } catch (_) {}
        }
        // Fallback: just hide the modal.
        modal.classList.add('hidden');
        return true;
    }

    function onKeyDown(e) {
        var modal = topmostVisibleModal();
        if (!modal) return;

        if (e.key === 'Escape' || e.key === 'Esc') {
            // Don't close if user is typing inside a textarea — they may want
            // to clear instead. Inputs still close.
            var target = e.target;
            if (target && target.tagName === 'TEXTAREA' && target.value && target.value.length > 0) {
                return;
            }
            if (!modal.dispatchEvent(new CustomEvent('modal:escape', { cancelable: true }))) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (closeModal(modal)) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }

        if (e.key === 'Tab') {
            var nodes = focusableWithin(modal);
            if (nodes.length === 0) return;
            var first = nodes[0];
            var last = nodes[nodes.length - 1];
            var active = document.activeElement;
            if (e.shiftKey) {
                if (active === first || !modal.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last || !modal.contains(active)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }

    function ensureAriaLiveOnToasts() {
        var toast = document.getElementById('toast-container');
        if (toast && !toast.getAttribute('aria-live')) {
            toast.setAttribute('aria-live', 'polite');
            toast.setAttribute('aria-atomic', 'true');
            toast.setAttribute('role', 'status');
        }
    }

    function labelIconButtons() {
        // For buttons whose visible content is only an <i> icon, copy the
        // title attribute (or aria-label off a child) up so screen readers
        // announce something meaningful.
        var btns = document.querySelectorAll('button:not([aria-label])');
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            var text = (b.textContent || '').replace(/\s+/g, '').trim();
            if (text.length > 0) continue; // already has text
            var title = b.getAttribute('title');
            if (title) b.setAttribute('aria-label', title);
        }
    }

    function init() {
        ensureAriaLiveOnToasts();
        labelIconButtons();
        document.addEventListener('keydown', onKeyDown, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    window.AnimStageA11y = {
        labelIconButtons: labelIconButtons,
        topmostVisibleModal: topmostVisibleModal
    };
})();
