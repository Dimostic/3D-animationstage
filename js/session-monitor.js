/**
 * js/session-monitor.js
 *
 * Polls /api/session-check.php every few minutes to detect when the user's
 * PHP session has expired (default idle limit: 8 hours, defined server-side).
 * On expiry, replaces silent failures (broken Preview windows, lost saves,
 * 302 redirects to login) with a clear modal: "Your session has expired.
 * Please log in again."
 *
 * Exposes window.SessionMonitor.checkNow() so other modules (e.g. export.js
 * before opening a Preview popup) can do a synchronous-feeling pre-flight
 * auth check and abort with the same modal rather than open a dead window.
 *
 * Safe to load anywhere — only activates if window.__STAGE_USER is present
 * (i.e. on the authenticated stage app, not the login/marketing pages).
 */
(function () {
    'use strict';

    if (!window.__STAGE_USER || !window.__STAGE_USER.email) {
        // Not on an authenticated page — nothing to monitor.
        return;
    }

    var POLL_INTERVAL_MS = 5 * 60 * 1000;      // 5 minutes
    var ACTIVITY_WINDOW_MS = 6 * 60 * 1000;    // count as "active" if input seen within this much wall-clock time
    var ENDPOINT         = 'api/session-check.php';

    var expiredModalShown = false;
    var pollTimer         = null;
    var inFlight          = null;
    var lastActivityAt    = Date.now();

    // Track real user activity in the browser so a heavily-used canvas
    // session (which rarely hits the server) doesn't get timed out as if
    // it were idle. Passive listeners — no UI interference.
    var ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'wheel', 'pointerdown'];
    ACTIVITY_EVENTS.forEach(function (evt) {
        window.addEventListener(evt, function () { lastActivityAt = Date.now(); }, { passive: true, capture: true });
    });

    function showExpiredModal(opts) {
        if (expiredModalShown) return;
        expiredModalShown = true;

        // Stop polling — no point hammering the endpoint after we know.
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

        var reason = opts && opts.reason;
        var heading = 'Session expired';
        var idleHours = Number(opts && opts.idle_seconds_max) / 3600;
        var body = reason === 'idle_timeout'
            ? 'You have been signed out due to inactivity' + (idleHours > 0 && Number.isFinite(idleHours) ? ' (' + idleHours + ' hours)' : '') + '.'
            : 'Your sign-in session is no longer available. This does not necessarily mean you were inactive.';
        body += ' Please log in again to continue. Any unsaved work in this tab will remain until you reload or leave this page.';

        var overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay session-expired-overlay';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'session-expired-title');

        // Use the existing confirm-modal styles for visual consistency, plus a
        // bit of inline styling so the overlay sits above every other UI layer.
        overlay.style.zIndex = '2147483647';

        var safeHeading = escapeHtml(heading);
        var safeBody    = escapeHtml(body);

        overlay.innerHTML =
            '<div class="confirm-modal-box" style="max-width:440px;">' +
                '<h3 id="session-expired-title">' + safeHeading + '</h3>' +
                '<p>' + safeBody + '</p>' +
                '<div class="confirm-modal-actions">' +
                    '<button type="button" class="confirm-modal-cancel" data-action="dismiss">Dismiss</button>' +
                    '<button type="button" class="confirm-modal-confirm" data-action="login">Log in again</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            var action = e.target && e.target.getAttribute && e.target.getAttribute('data-action');
            if (action === 'login') {
                // Preserve return path so the user lands back on the stage.
                window.location.href = 'login.php?next=stage';
            } else if (action === 'dismiss' || e.target === overlay) {
                overlay.remove();
                // Reset so a later checkNow() can re-prompt if still expired.
                expiredModalShown = false;
            }
        });

        // Focus the login button for keyboard users.
        var btn = overlay.querySelector('[data-action="login"]');
        if (btn && btn.focus) btn.focus();
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Fetch /api/session-check.php. Resolves to { authenticated: bool, ... }
     * or { authenticated: false, error: true } on network failure.
     *
     * If real user activity was observed since the last call, pass active=1
     * so the server treats this as a heartbeat that extends the idle window.
     * Otherwise the call is fully passive and lets the 8 h idle timer run.
     *
     * Concurrent calls share the same in-flight promise.
     */
    function checkNow() {
        if (inFlight) return inFlight;
        var isActive = (Date.now() - lastActivityAt) < ACTIVITY_WINDOW_MS;
        var url = ENDPOINT + (isActive ? '?active=1' : '');
        inFlight = fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        }).then(function (res) {
            if (!res.ok) {
                return { authenticated: false, error: true };
            }
            return res.json().catch(function () {
                return { authenticated: false, error: true };
            });
        }).catch(function () {
            // Network error — don't false-alarm the user; treat as unknown
            // but still report unauthenticated=false so callers can decide.
            return { authenticated: false, error: true };
        }).then(function (data) {
            inFlight = null;
            // Only fire the modal on a confirmed authenticated:false from the
            // server (not on transient network errors).
            if (data && data.authenticated === false && !data.error) {
                showExpiredModal(data);
            }
            return data;
        });
        return inFlight;
    }

    function startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(function () {
            // Skip the poll when the tab is hidden — there's no UI to update,
            // and we'll re-check on visibilitychange when it comes back.
            if (document.visibilityState === 'hidden') return;
            checkNow();
        }, POLL_INTERVAL_MS);
    }

    // Re-check immediately when the tab regains focus after being hidden —
    // catches the common case of "user came back after lunch, session is dead".
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && !expiredModalShown) {
            checkNow();
        }
    });

    // Public API for pre-flight checks from other modules.
    window.SessionMonitor = {
        checkNow: checkNow,
        showExpiredModal: showExpiredModal,
        isExpired: function () { return expiredModalShown; }
    };

    // Kick off polling once the DOM is ready (so any toast/modal styles
    // referenced in css/styles.css are available).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPolling, { once: true });
    } else {
        startPolling();
    }
})();
