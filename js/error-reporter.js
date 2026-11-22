/**
 * Error Reporter
 *
 * Captures uncaught errors and unhandled promise rejections and forwards them
 * to /api/log-error.php with client-side rate limiting + dedup. Designed to
 * be silent under normal conditions and never to throw itself.
 *
 * Activated automatically on load. Set window.__ERROR_REPORTER_DISABLED = true
 * before this script loads to opt out (e.g. for E2E test harnesses).
 */
(function () {
    'use strict';

    if (window.__ERROR_REPORTER_DISABLED) return;
    if (window.AnimStageErrorReporter) return; // double-include guard

    var MAX_PER_MINUTE = 10;       // never POST more than this in a rolling 60s window
    var DEDUP_WINDOW_MS = 60000;   // suppress identical messages within this window
    var sentTimestamps = [];
    var seenSignatures = new Map(); // signature -> last-sent ms

    var sessionId = (function () {
        try {
            var key = 'animstage_err_session';
            var cached = sessionStorage.getItem(key);
            if (cached) return cached;
            var s = 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
            sessionStorage.setItem(key, s);
            return s;
        } catch (_) {
            return 's_unknown';
        }
    })();

    function getAppVersion() {
        try {
            var meta = document.querySelector('meta[name="app-version"]');
            if (meta && meta.content) return meta.content;
        } catch (_) {}
        try {
            return (window.__APP_VERSION__ || '').toString();
        } catch (_) {}
        return '';
    }

    function getCsrfToken() {
        try {
            return (window.__STAGE_USER && window.__STAGE_USER.csrf_token) || '';
        } catch (_) { return ''; }
    }

    function withinRateLimit() {
        var now = Date.now();
        sentTimestamps = sentTimestamps.filter(function (t) { return now - t < 60000; });
        if (sentTimestamps.length >= MAX_PER_MINUTE) return false;
        sentTimestamps.push(now);
        return true;
    }

    function isDuplicate(sig) {
        var now = Date.now();
        var last = seenSignatures.get(sig);
        if (last && now - last < DEDUP_WINDOW_MS) return true;
        seenSignatures.set(sig, now);
        // Cap map size
        if (seenSignatures.size > 50) {
            var firstKey = seenSignatures.keys().next().value;
            seenSignatures.delete(firstKey);
        }
        return false;
    }

    function send(payload) {
        try {
            if (!navigator.onLine) return;
            var token = getCsrfToken();
            if (!token) return;
            var body = JSON.stringify(payload);
            var url = new URL('api/log-error.php', document.baseURI).href;
            // Use fetch first because the API's CSRF guard expects a request
            // header; sendBeacon cannot set custom headers and causes 403 noise.
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                body: body,
                keepalive: true,
                credentials: 'same-origin'
            }).catch(function () { /* swallow */ });
        } catch (_) { /* swallow — never throw from here */ }
    }

    function report(payload) {
        try {
            if (!payload || typeof payload !== 'object') return;
            var sig = (payload.kind || 'error') + '|' + (payload.message || '') + '|' + (payload.lineno || 0);
            if (isDuplicate(sig)) return;
            if (!withinRateLimit()) return;
            payload.sessionId = sessionId;
            payload.appVersion = getAppVersion();
            payload.url = String(location.href || '');
            payload.userAgent = String(navigator.userAgent || '');
            send(payload);
        } catch (_) { /* never throw */ }
    }

    window.addEventListener('error', function (e) {
        try {
            // Filter out resource load errors (img/script/link 404s) — too noisy.
            if (e && e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) return;
            var err = e && e.error;
            report({
                kind: 'error',
                message: (err && err.message) || (e && e.message) || 'Unknown error',
                stack: (err && err.stack) || '',
                source: (e && e.filename) || '',
                lineno: e && e.lineno,
                colno: e && e.colno
            });
        } catch (_) {}
    }, true);

    window.addEventListener('unhandledrejection', function (e) {
        try {
            var reason = e && e.reason;
            var message = '';
            var stack = '';
            if (reason instanceof Error) { message = reason.message; stack = reason.stack || ''; }
            else if (typeof reason === 'string') { message = reason; }
            else { try { message = JSON.stringify(reason); } catch (_) { message = '[unserializable rejection]'; } }
            report({
                kind: 'rejection',
                message: message || 'Unhandled promise rejection',
                stack: stack
            });
        } catch (_) {}
    });

    window.AnimStageErrorReporter = {
        report: report,
        sessionId: sessionId
    };
})();
