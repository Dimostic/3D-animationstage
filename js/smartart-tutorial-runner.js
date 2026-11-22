(function() {
    'use strict';

    function runWhenReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }
        callback();
    }

    function openPanelIfCollapsed(panelSelector, buttonId) {
        const panel = document.querySelector(panelSelector);
        if (panel?.classList.contains('is-collapsed')) {
            document.getElementById(buttonId)?.click();
        }
    }

    const hooks = {
        ensureRightPanelOpen: async runner => {
            openPanelIfCollapsed('.sa-panel-right', 'sa-collapse-right');
            await runner._wait(250);
        },
        ensureSmartArtPanelsOpen: async runner => {
            openPanelIfCollapsed('.sa-panel-left', 'sa-collapse-left');
            openPanelIfCollapsed('.sa-panel-right', 'sa-collapse-right');
            await runner._wait(250);
        },
        clearTemplateSearch: async runner => {
            const input = document.getElementById('sa-search');
            if (!input) return;
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await runner._wait(250);
        },
        prepareAIAssistantTutorial: async runner => {
            openPanelIfCollapsed('.sa-panel-right', 'sa-collapse-right');
            try { window.saManager?.resetAnimation?.(); } catch (_) {}
            try { window.saAI?.resetConversation?.(); } catch (_) {}
            const input = document.getElementById('sa-ai-input');
            if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            await runner._wait(250);
        }
    };

    function collapseLeftTemplatePanel(runner) {
        const leftPanel = document.querySelector('.sa-panel-left');
        const overlay = document.getElementById('sa-mobile-overlay');
        if (!leftPanel) return;

        runner._smartArtLeftPanelWasCollapsed = leftPanel.classList.contains('is-collapsed');
        if (!runner._smartArtLeftPanelWasCollapsed) {
            document.getElementById('sa-collapse-left')?.click();
        }

        leftPanel.classList.remove('mobile-open');
        overlay?.classList.remove('visible');
    }

    function restoreLeftTemplatePanel(runner) {
        const leftPanel = document.querySelector('.sa-panel-left');
        if (!leftPanel) return;

        const shouldRestoreOpen = runner._smartArtLeftPanelWasCollapsed === false;
        runner._smartArtLeftPanelWasCollapsed = null;
        if (shouldRestoreOpen && leftPanel.classList.contains('is-collapsed')) {
            document.getElementById('sa-collapse-left')?.click();
        }
    }

    runWhenReady(() => {
        if (!window.DomTutorialRunner || !window.TutorialSchema || !window.SMARTART_TUTORIAL_PACK) return;

        const container = document.querySelector('.sa-topbar-actions');
        if (!container) return;

        const runner = new window.DomTutorialRunner({
            appName: 'SmartArt Tutorials',
            buttonLabel: 'Tutorials',
            buttonId: 'sa-open-tutorials',
            panelId: 'sa-tutorial-panel',
            panelTitle: 'SmartArt Tutorials',
            warmAllTtsTutorialsOnOpen: true
        });

        runner.registerTutorials(window.TutorialSchema.compileTutorialPack(window.SMARTART_TUTORIAL_PACK, { hooks }));
        runner.mountControls({ container });

        const originalPlay = runner.play.bind(runner);
        runner.play = async function(id) {
            collapseLeftTemplatePanel(runner);
            try {
                return await originalPlay(id);
            } finally {
                restoreLeftTemplatePanel(runner);
            }
        };

        const originalStop = runner.stop.bind(runner);
        runner.stop = function(options = {}) {
            const result = originalStop(options);
            restoreLeftTemplatePanel(runner);
            return result;
        };

        window.smartArtTutorialRunner = runner;
    });
})();
