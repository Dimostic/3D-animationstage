/**
 * Theme toggle — dark / light
 * Supports two page conventions:
 *  - App pages  (index.html, smartart.html): dark default, data-theme="light" = light.
 *  - Portal pages (index.php, login.php):    light default, data-theme="dark"  = dark.
 * Pages declare their default via <body data-default-theme="light|dark">.
 * Preference persisted in localStorage under key 'as-theme'.
 * Early-apply script in <head> prevents FOUC.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'as-theme';
    var DARK  = 'dark';
    var LIGHT = 'light';

    /** Return the page's natural default theme (absent any override) */
    function _pageDefault() {
        return (document.body && document.body.getAttribute('data-default-theme')) || DARK;
    }

    /** Return the current active theme ('dark' or 'light') */
    function currentTheme() {
        var attr = document.documentElement.getAttribute('data-theme');
        if (attr === LIGHT || attr === DARK) return attr;
        // No attribute — use page default
        return _pageDefault();
    }

    /** Apply a theme, set the correct data-theme attribute, and persist */
    function applyTheme(theme) {
        var pageDefault = _pageDefault();
        if (theme === pageDefault) {
            // Removing the attribute restores the natural default
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        if (document.body) {
            document.body.classList.toggle('light-mode', theme === LIGHT);
        }
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
        _updateAllButtons(theme);
    }

    /** Update icon + tooltip on every toggle button in the page */
    function _updateAllButtons(theme) {
        var buttons = document.querySelectorAll('#btn-theme-toggle, #sa-theme-toggle, #portal-theme-toggle');
        buttons.forEach(function (btn) {
            var icon = btn.querySelector('i');
            if (theme === LIGHT) {
                if (icon) { icon.className = 'fas fa-sun'; }
                btn.title = 'Switch to Dark Mode';
            } else {
                if (icon) { icon.className = 'fas fa-moon'; }
                btn.title = 'Switch to Light Mode';
            }
        });
    }

    /** Wire up a single toggle button */
    function initButton(btn) {
        if (!btn) return;
        btn.addEventListener('click', function () {
            applyTheme(currentTheme() === DARK ? LIGHT : DARK);
        });
    }

    /** Public init — call once after DOM is ready */
    window.ThemeManager = {
        init: function () {
            initButton(document.getElementById('btn-theme-toggle'));
            initButton(document.getElementById('sa-theme-toggle'));
            initButton(document.getElementById('portal-theme-toggle'));
            _updateAllButtons(currentTheme());
        },
        apply: applyTheme,
        current: currentTheme
    };
})();
