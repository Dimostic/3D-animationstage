(function() {
    'use strict';

    function closeStageTransientUi() {
        document.querySelectorAll('.tbr-dd-panel.open').forEach(panel => {
            panel.classList.remove('open');
        });
        document.querySelectorAll('.tbr-dd-btn.open').forEach(button => {
            button.classList.remove('open');
        });
        document.getElementById('layout-dropdown')?.classList.remove('open');
        document.getElementById('onion-skin-popover')?.remove();
        if (!document.getElementById('symbols-modal')?.classList.contains('hidden')) {
            document.getElementById('symbols-panel-close')?.click();
        }
        if (!document.getElementById('dope-sheet-modal')?.classList.contains('hidden')) {
            document.getElementById('dope-sheet-close')?.click();
        }
        document.getElementById('expressions-editor')?.remove();
        document.querySelector('#easing-editor-modal:not(.hidden) .modal-close')?.click();
        window.appSearch?.close?.();
        window.app?.animations?._clearReapplyMode?.();
        window.app?.animations?.cancelPickingDestination?.();
    }

    async function waitForTeachMeResponse(runner, options = {}) {
        const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 20000;
        const pollMs = Number.isFinite(options.pollMs) ? options.pollMs : 200;
        const start = Date.now();
        const messagesEl = document.getElementById('teach-me-messages');
        while (Date.now() - start < timeoutMs) {
            const teachMe = window.app?.teachMe;
            const generating = teachMe?.isGenerating === true;
            const typingPresent = !!messagesEl?.querySelector('.teach-me-typing');
            const aiMessages = messagesEl?.querySelectorAll('.teach-me-msg-ai') || [];
            const lastAi = aiMessages[aiMessages.length - 1];
            const lastAiHasContent = lastAi
                && !lastAi.querySelector('.teach-me-typing')
                && (lastAi.textContent || '').trim().length > 0;
            if (!generating && !typingPresent && lastAiHasContent) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }
        return false;
    }

    async function scrollTeachMeToLatestAnswerStart(runner) {
        const messagesEl = document.getElementById('teach-me-messages');
        if (!messagesEl) return;
        const aiMessages = messagesEl.querySelectorAll('.teach-me-msg-ai');
        const last = aiMessages[aiMessages.length - 1];
        if (!last) return;
        try {
            const containerTop = messagesEl.getBoundingClientRect().top;
            const targetTop = last.getBoundingClientRect().top;
            const delta = targetTop - containerTop;
            messagesEl.scrollTop = Math.max(0, messagesEl.scrollTop + delta - 8);
        } catch (_) {
            try { last.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (__) {}
        }
        await new Promise(resolve => setTimeout(resolve, 120));
    }

    async function closeTeachMeDiscussion(runner) {
        const panel = document.getElementById('teach-me-panel');
        if (panel && !panel.classList.contains('hidden')) {
            const closeBtn = document.getElementById('btn-teach-me-close');
            if (closeBtn) {
                try { closeBtn.click(); } catch (_) {}
            } else {
                panel.classList.add('hidden');
            }
        }
        // Brief pause so close animation/state settles before the next step.
        if (runner && typeof runner._wait === 'function') {
            await runner._wait(180);
        } else {
            await new Promise(resolve => setTimeout(resolve, 180));
        }
    }

    async function ensureInterfaceTourWorkspace(runner) {
        // Make the workspace fully visible so every menu/tab/panel referenced by the
        // interface mapping tour is reachable. Restore state runs in afterFinish.
        closeStageTransientUi();
        await setStagePanelCollapsed('left-panel', 'collapse-left', false, runner);
        await setStagePanelCollapsed('right-panel', 'collapse-right', false, runner);
        await setStagePanelCollapsed('timeline-panel', 'collapse-timeline', false, runner);
        await fitStageViewportForTutorial(runner);
        if (runner && typeof runner._wait === 'function') {
            await runner._wait(150);
        }
    }

    async function waitForStageAiPlan(runner, options = {}) {
        const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 25000;
        const pollMs = Number.isFinite(options.pollMs) ? options.pollMs : 220;
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const aiMode = window.app?.aiMode;
            const generating = aiMode?._isGenerating === true;
            const planBody = document.getElementById('ai-action-plan-body');
            const planPanel = document.getElementById('ai-action-plan');
            const visible = planPanel && !planPanel.classList.contains('hidden');
            const hasContent = planBody && (planBody.textContent || '').trim().length > 0;
            if (!generating && visible && hasContent) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }
        return false;
    }

    async function fitStageViewportForTutorial(runner) {
        const stage = window.app?.stage;
        if (!stage || runner?.context?.stageTutorialViewportLocked === true) return false;
        stage.resizeCanvas?.();
        stage.centerStage?.();
        stage.requestRender?.();
        await runner._wait(180);
        return true;
    }

    async function setStageMode(mode, runner) {
        const nextMode = String(mode || '').trim().toLowerCase();
        const modeSelect = document.getElementById('mode-select');
        if (!modeSelect) return false;

        if (modeSelect.value !== nextMode) {
            modeSelect.value = nextMode;
            modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (window.app) {
            window.app.mode = nextMode;
            window.app._lastStageMode = nextMode === 'ai' ? 'ai' : 'basic';
            window.app.applyMode?.();
        }

        await runner._wait(nextMode === 'ai' ? 260 : 220);
        return true;
    }

    async function setStagePanelCollapsed(panelId, toggleId, collapsed, runner) {
        const panel = document.getElementById(panelId);
        const toggle = document.getElementById(toggleId);
        if (!panel || !toggle) return false;

        const shouldCollapse = collapsed === true;
        const isCollapsed = panel.classList.contains('collapsed');
        if (isCollapsed === shouldCollapse) return true;

        toggle.click();
        await runner._wait(260);

        if (!collapsed) {
            await fitStageViewportForTutorial(runner);
        }
        return true;
    }

    async function switchLeftPanelTab(tab, runner) {
        if (!tab || window.app?.activeLeftTab === tab) return false;
        if (typeof window.app?.switchLeftTab === 'function') {
            window.app.switchLeftTab(tab);
        } else {
            document.querySelector(`#left-panel .panel-tab[data-tab="${tab}"]`)?.click();
        }
        await runner._wait(180);
        return true;
    }

    async function switchRightPanelTab(tab, runner) {
        if (!tab || window.app?.activeRightTab === tab) return false;
        if (typeof window.app?.switchRightTab === 'function') {
            window.app.switchRightTab(tab);
        } else {
            document.querySelector(`#right-panel .panel-tab[data-tab="${tab}"]`)?.click();
        }
        await runner._wait(220);
        return true;
    }

    async function switchAnimationSubtab(subtab, runner) {
        if (!subtab) return false;
        const button = document.querySelector(`.anim-subtab[data-subtab="${subtab}"]`);
        if (!button || button.classList.contains('active')) return false;
        button.click();
        await runner._wait(180);
        return true;
    }

    async function setStageProjectName(name, runner) {
        const projectName = String(name || '').trim() || 'Untitled Animation';
        const display = document.getElementById('project-name-display');
        if (display) {
            display.textContent = projectName;
        }
        if (window.app?.exporter) {
            window.app.exporter.projectName = projectName;
        }
        await runner._wait(120);
        return true;
    }

    function captureStageInterfaceState() {
        const app = window.app || {};
        return {
            mode: document.getElementById('mode-select')?.value || app.mode || 'basic',
            activeLeftTab: app.activeLeftTab || null,
            activeRightTab: app.activeRightTab || null,
            leftCollapsed: document.getElementById('left-panel')?.classList.contains('collapsed') || false,
            rightCollapsed: document.getElementById('right-panel')?.classList.contains('collapsed') || false,
            timelineCollapsed: document.getElementById('timeline-panel')?.classList.contains('collapsed') || false
        };
    }

    async function restoreStageInterfaceState(runner) {
        closeStageTransientUi();
        const state = runner?.context?.stageFirstTimeTourState?.interfaceState
            || runner?.context?.stageInterfaceTourState
            || null;
        if (!state) return;

        if (state.mode) {
            await setStageMode(state.mode, runner);
        }
        if (state.activeLeftTab) {
            await switchLeftPanelTab(state.activeLeftTab, runner);
        }
        if (state.activeRightTab) {
            await switchRightPanelTab(state.activeRightTab, runner);
        }
        await setStagePanelCollapsed('left-panel', 'collapse-left', !!state.leftCollapsed, runner);
        await setStagePanelCollapsed('right-panel', 'collapse-right', !!state.rightCollapsed, runner);
        await setStagePanelCollapsed('timeline-panel', 'collapse-timeline', !!state.timelineCollapsed, runner);
    }

    async function prepareStageFirstTimeTour(runner) {
        runner.context = runner.context || {};
        const state = runner.context.stageFirstTimeTourState || {};
        if (!state.interfaceState) {
            state.interfaceState = captureStageInterfaceState();
        }
        if (!state.projectName) {
            const display = document.getElementById('project-name-display');
            const current = (display?.textContent || window.app?.exporter?.projectName || '').trim();
            state.projectName = current || 'Untitled Animation';
        }
        runner.context.stageFirstTimeTourState = state;
        await ensureStageFirstTimeDemoObjects(runner);
    }

    async function restoreStageFirstTimeTour(runner) {
        await restoreStageFirstTimeTourState(runner);
    }

    async function restoreStageFirstTimeTourState(runner) {
        const state = runner.context?.stageFirstTimeTourState;
        document.getElementById('btn-teach-me-close')?.click();
        closeStageTransientUi();

        if (state?.projectName) {
            await setStageProjectName(state.projectName, runner);
        }

        await restoreStageFirstTimeDemoObjects(runner);

        await restoreStageInterfaceState(runner);
        delete runner.context.stageFirstTimeTourState;
    }

    function notifyStageFirstTimeTourFinished() {
        window.dispatchEvent(new CustomEvent('animstage:first-run-tour-finished', {
            detail: {
                tutorialId: 'stage-first-time-demo-tour'
            }
        }));
    }

    async function ensureStageFirstTimeDemoObjects(runner) {
        const objects = window.app?.objects;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !StageObjectCtor) {
            return { shapeObject: null, imageObject: null };
        }

        runner.context = runner.context || {};
        const state = runner.context.stageFirstTimeTourState || {};
        if (!Array.isArray(state.priorSelectionIds)) {
            state.priorSelectionIds = Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [];
        }
        runner.context.stageFirstTimeTourState = state;

        let shapeObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-first-time-demo-shape') || null;
        let imageObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-first-time-demo-image') || null;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;

            if (!shapeObject) {
                shapeObject = new StageObjectCtor('rectangle', {
                    x: Math.round(stageWidth * 0.55),
                    y: Math.round(stageHeight * 0.22),
                    width: 220,
                    height: 150,
                    fill: '#2563eb',
                    stroke: '#0f172a',
                    strokeWidth: 4,
                    opacity: 1,
                    rotation: -8,
                    name: 'Tutorial Shape Demo'
                });
                shapeObject._tutorialDemoKind = 'stage-first-time-demo-shape';
                objects.addObject(shapeObject);
            }

            if (!imageObject) {
                const demoSrc = getStageCharacterWorkflowDemoSrc();
                imageObject = new StageObjectCtor('image', {
                    x: Math.round(stageWidth * 0.19),
                    y: Math.round(stageHeight * 0.14),
                    width: 220,
                    height: 360,
                    name: 'Tutorial Character Demo',
                    imageSrc: demoSrc,
                    opacity: 1
                });
                imageObject._tutorialDemoKind = 'stage-first-time-demo-image';
                objects.addObject(imageObject);
                if (typeof imageObject.loadImage === 'function') {
                    imageObject.loadImage(demoSrc);
                }
            }

            state.demoShapeObjectId = shapeObject?.id || null;
            state.demoImageObjectId = imageObject?.id || null;
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();

        return { shapeObject, imageObject };
    }

    async function selectStageFirstTimeDemoShape(runner) {
        const objects = window.app?.objects;
        if (!objects) return null;

        const { shapeObject } = await ensureStageFirstTimeDemoObjects(runner);
        if (!shapeObject) return null;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            objects.select([shapeObject.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        await runner._wait(120);
        return shapeObject;
    }

    async function selectStageFirstTimeDemoImage(runner) {
        const objects = window.app?.objects;
        if (!objects) return null;

        const { imageObject } = await ensureStageFirstTimeDemoObjects(runner);
        if (!imageObject) return null;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            objects.select([imageObject.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        await waitForSelectedStageImage(runner);
        return imageObject;
    }

    async function restoreStageFirstTimeDemoObjects(runner) {
        const objects = window.app?.objects;
        const state = runner.context?.stageFirstTimeTourState;
        if (!objects || !state) return;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-first-time-demo-shape' || obj?._tutorialDemoKind === 'stage-first-time-demo-image')
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        delete state.demoShapeObjectId;
        delete state.demoImageObjectId;
    }

    async function scrollStageToolbarForTour(runner) {
        const toolbar = document.getElementById('stage-toolbar');
        if (!toolbar) return;

        const maxScroll = Math.max(0, toolbar.scrollWidth - toolbar.clientWidth);
        if (maxScroll < 24) return;

        toolbar.scrollTo({ left: maxScroll, behavior: 'smooth' });
        await runner._wait(500);
        toolbar.scrollTo({ left: Math.round(maxScroll * 0.45), behavior: 'smooth' });
        await runner._wait(380);
        toolbar.scrollTo({ left: 0, behavior: 'smooth' });
        await runner._wait(260);
    }

    function getFirstVisibleStageElement(selector, textMatch = null) {
        if (!selector) return null;
        const normalizedText = typeof textMatch === 'string'
            ? textMatch.trim().toLowerCase()
            : null;
        return Array.from(document.querySelectorAll(selector)).find(element => {
            if (!element) return false;
            const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
                return false;
            }
            if (!(element.offsetWidth || element.offsetHeight || element.getClientRects?.().length)) {
                return false;
            }
            if (textMatch instanceof RegExp) {
                const haystack = [element.textContent || '', element.getAttribute?.('title') || ''].join(' ').trim();
                return textMatch.test(haystack);
            }
            if (normalizedText) {
                const haystack = [element.textContent || '', element.getAttribute?.('title') || '']
                    .join(' ')
                    .trim()
                    .toLowerCase();
                return haystack.includes(normalizedText);
            }
            return true;
        }) || null;
    }

    async function clickFirstVisibleStageElement(selector, runner, waitAfterMs = 220) {
        const element = getFirstVisibleStageElement(selector);
        if (!element) return false;
        element.click();
        await runner._wait(waitAfterMs);
        return true;
    }

    async function scrollStageTutorialElementIntoView(selector, runner, options = {}) {
        const element = getFirstVisibleStageElement(selector, options.textMatch || null);
        if (!element) return false;

        element.scrollIntoView({
            behavior: 'smooth',
            block: options.block || 'center',
            inline: options.inline || 'nearest'
        });
        await runner._wait(options.waitAfterMs || 260);
        return true;
    }

    async function scrollStageTutorialPanel(panelSelector, runner) {
        const panel = document.querySelector(panelSelector);
        if (!panel) return;

        const scroller = panel.querySelector('.ja-body')
            || panel.querySelector('.body-tags-body')
            || panel;
        const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        if (maxScroll < 28) return;

        scroller.scrollTo({ top: Math.round(maxScroll * 0.55), behavior: 'smooth' });
        await runner._wait(520);

        if (maxScroll > 160) {
            scroller.scrollTo({ top: maxScroll, behavior: 'smooth' });
            await runner._wait(420);
        }

        scroller.scrollTo({ top: 0, behavior: 'smooth' });
        await runner._wait(260);
    }

    async function stopStageArmatureMovementPreview(runner) {
        const jointSystem = window.app?.jointSystem;
        const armature = jointSystem?._currentArmature
            || jointSystem?._detectSelectedArmature?.()
            || jointSystem?._detectArmature?.();

        jointSystem?._stopArmatureMovement?.(armature);
        jointSystem?._updateArmaturePanelPlayState?.(armature);
        await runner._wait(180);
    }

    async function applyStageFlexRigTutorialChange(runner, channel, value) {
        const objects = window.app?.objects;
        if (!objects?._setFlexRigChannel || !objects?._getFlexRigEntries || !objects?._applyFlexRigValue) {
            return false;
        }

        const entry = objects._getFlexRigEntries()[0];
        if (!entry?.key) return false;

        objects._setFlexRigChannel(channel);
        objects._applyFlexRigValue(entry.key, channel, value, { pushHistory: false });
        await runner._wait(180);
        return true;
    }

    async function resetStageFlexRigTutorialPose(runner) {
        const objects = window.app?.objects;
        if (typeof objects?.resetFlexRigJointValues === 'function') {
            objects.resetFlexRigJointValues();
            await runner._wait(180);
            return true;
        }

        return clickFirstVisibleStageElement('#btn-flex-rig-reset', runner, 180);
    }

    async function closeStageBodyTagsPanel(runner) {
        const jointSystem = window.app?.jointSystem;
        if (jointSystem?._bodyTagActive) {
            jointSystem._exitBodyTagMode?.(true);
            await runner._wait(220);
            return true;
        }

        document.getElementById('joint-body-tags-panel')?.remove();
        await runner._wait(120);
        return false;
    }

    async function previewStagePoseBlend(runner, value = 35) {
        const slider = document.getElementById('jpl-blend-slider');
        if (!slider) return false;

        slider.value = String(value);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        await runner._wait(220);
        return true;
    }

    const TUTORIAL_POPUP_OPEN_TIMEOUT_MS = 900;
    const TUTORIAL_POPUP_READY_TIMEOUT_MS = 2200;
    const TUTORIAL_POPUP_VISIBLE_MS = 2800;
    const TUTORIAL_POPUP_POLL_MS = 120;

    async function waitForTutorialPopupWindow(runner, getPopupWindow, options = {}) {
        const openDeadline = Date.now() + (options.openTimeoutMs || TUTORIAL_POPUP_OPEN_TIMEOUT_MS);
        let popupWindow = getPopupWindow();

        while ((!popupWindow || popupWindow.closed) && Date.now() < openDeadline) {
            await runner._wait(TUTORIAL_POPUP_POLL_MS);
            popupWindow = getPopupWindow();
        }

        if (!popupWindow || popupWindow.closed) return null;

        try {
            popupWindow.focus?.();
        } catch (error) {
        }

        const readyDeadline = Date.now() + (options.readyTimeoutMs || TUTORIAL_POPUP_READY_TIMEOUT_MS);
        while (!popupWindow.closed && Date.now() < readyDeadline) {
            let hasLoadedPage = false;
            try {
                const href = String(popupWindow.location?.href || '');
                const body = popupWindow.document?.body;
                const hasDocumentContent = Boolean(
                    body && (body.childElementCount > 0 || String(body.textContent || '').trim().length > 0)
                );
                hasLoadedPage = (href && href !== 'about:blank') || hasDocumentContent;
            } catch (error) {
                hasLoadedPage = true;
            }

            if (hasLoadedPage) break;
            await runner._wait(TUTORIAL_POPUP_POLL_MS);
        }

        if (!popupWindow.closed) {
            await runner._wait(options.visibleMs || TUTORIAL_POPUP_VISIBLE_MS);
        }

        return popupWindow;
    }

    async function closeTutorialPopupWindow(runner, popupWindow, closeTimeoutMs = 1400) {
        if (!popupWindow) return;

        const closeDeadline = Date.now() + closeTimeoutMs;
        while (!popupWindow.closed && Date.now() < closeDeadline) {
            try {
                popupWindow.close();
            } catch (error) {
                break;
            }

            if (popupWindow.closed) break;
            await runner._wait(TUTORIAL_POPUP_POLL_MS);
        }
    }

    async function previewCurrentStageProject(runner, options = {}) {
        const previewButton = document.getElementById('btn-preview');
        const exporter = window.app?.exporter;
        const reservedPreviewWindow = options.previewWindow || runner?.context?.tutorialPreviewWindow || null;
        const reservedPreviewTargetName = String(options.targetName || runner?.context?.tutorialPreviewWindowTargetName || '').trim();
        if (!previewButton && (!exporter || !reservedPreviewTargetName) && !reservedPreviewWindow) return false;

        let previewWindow = reservedPreviewWindow && !reservedPreviewWindow.closed ? reservedPreviewWindow : null;

        if (previewWindow || reservedPreviewTargetName) {
            const opened = exporter?.exportHTML5?.({
                includeControls: true,
                autoplay: true,
                loop: false,
                responsive: true,
                openInWindow: true,
                showJointContours: true,
                forceCurrentScene: true,
                documentTitle: `Preview — ${exporter?.projectName || 'Animation Stage'}`,
                previewTargetName: reservedPreviewTargetName,
                previewWindow
            });
            if (!opened) return false;
        } else {
            if (!previewButton) return false;

            const originalWindowOpen = window.open;
            window.open = function(...args) {
                previewWindow = originalWindowOpen.apply(window, args);
                return previewWindow;
            };

            try {
                previewButton.click();
            } finally {
                window.open = originalWindowOpen;
            }
        }

        const openedPreviewWindow = await waitForTutorialPopupWindow(runner, () => {
            const currentReservedWindow = runner?.context?.tutorialPreviewWindow;
            if (currentReservedWindow && !currentReservedWindow.closed) {
                return currentReservedWindow;
            }
            return previewWindow;
        }, options);
        if (openedPreviewWindow && runner?.context) {
            runner.context.tutorialPreviewWindow = openedPreviewWindow;
        }
        await closeTutorialPopupWindow(runner, openedPreviewWindow);
        closeStageTransientUi();
        await runner._wait(120);
        return true;
    }

    async function closeReservedStagePreviewWindow(runner) {
        const previewWindow = runner?.context?.tutorialPreviewWindow || null;
        await closeTutorialPopupWindow(runner, previewWindow);
        if (runner?.context) {
            delete runner.context.tutorialPreviewWindow;
            delete runner.context.tutorialPreviewWindowTargetName;
        }
    }

    async function previewStageFirstTimeProject(runner) {
        await ensureStageFirstTimeDemoObjects(runner);
        await previewCurrentStageProject(runner);
    }

    async function previewStageSmartArtWorkspace(runner) {
        const modeSelect = document.getElementById('mode-select');
        const previousMode = modeSelect?.value || 'basic';
        const smartArtHref = document.getElementById('btn-smartart')?.getAttribute('href') || 'smartart.html';
        let smartArtPreviewHref = smartArtHref;

        try {
            const smartArtUrl = new URL(smartArtHref, window.location.href);
            smartArtUrl.searchParams.set('tutorialAutoCloseMs', String(TUTORIAL_POPUP_VISIBLE_MS));
            smartArtPreviewHref = smartArtUrl.toString();
        } catch (error) {
        }

        if (modeSelect) {
            modeSelect.value = 'smartart';
        }

        let smartArtWindow = null;
        try {
            smartArtWindow = window.open(smartArtPreviewHref, 'animation-stage-smartart-tour', 'width=1280,height=820');
            smartArtWindow?.focus?.();
        } catch (error) {
        }

        const openedSmartArtWindow = await waitForTutorialPopupWindow(runner, () => smartArtWindow);
        await closeTutorialPopupWindow(runner, openedSmartArtWindow);

        if (modeSelect) {
            modeSelect.value = previousMode;
        }
        try {
            window.focus?.();
        } catch (error) {
        }
        await runner._wait(140);

        closeStageTransientUi();
        await runner._wait(260);
    }

    async function toggleToolbarMenu(targetId, runner) {
        document.querySelector(`.tbr-dd-btn[data-target="${targetId}"]`)?.click();
        await runner._wait(220);
    }

    function getStageCharacterWorkflowDemoSrc() {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="360" viewBox="0 0 220 360">' +
                '<rect width="220" height="360" rx="28" fill="#f3efe4"/>' +
                '<circle cx="110" cy="58" r="34" fill="#f0c7a3"/>' +
                '<rect x="84" y="92" width="52" height="42" rx="18" fill="#f0c7a3"/>' +
                '<rect x="66" y="130" width="88" height="106" rx="30" fill="#2f6f5e"/>' +
                '<rect x="40" y="138" width="30" height="96" rx="15" fill="#f0c7a3"/>' +
                '<rect x="150" y="138" width="30" height="96" rx="15" fill="#f0c7a3"/>' +
                '<rect x="78" y="228" width="24" height="92" rx="12" fill="#243846"/>' +
                '<rect x="118" y="228" width="24" height="92" rx="12" fill="#243846"/>' +
                '<rect x="72" y="314" width="34" height="18" rx="9" fill="#0f172a"/>' +
                '<rect x="114" y="314" width="34" height="18" rx="9" fill="#0f172a"/>' +
            '</svg>'
        );
    }

    function getStageFaceRigWorkflowDemoSrc() {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="360" viewBox="0 0 320 360">' +
                '<rect width="320" height="360" rx="32" fill="#f4efe8"/>' +
                '<ellipse cx="160" cy="185" rx="100" ry="120" fill="#efc39f"/>' +
                '<path d="M70 150 C90 78 132 52 160 52 C188 52 230 78 250 150 C240 110 215 88 160 88 C105 88 80 110 70 150 Z" fill="#2f2a28"/>' +
                '<ellipse cx="105" cy="195" rx="11" ry="8" fill="#2d2623"/>' +
                '<ellipse cx="215" cy="195" rx="11" ry="8" fill="#2d2623"/>' +
                '<path d="M120 165 Q160 148 200 165" stroke="#3b322f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
                '<path d="M160 205 Q170 238 158 250" stroke="#d59b78" stroke-width="5" fill="none" stroke-linecap="round"/>' +
                '<path d="M124 272 Q160 295 196 272" stroke="#9b4f55" stroke-width="8" fill="none" stroke-linecap="round"/>' +
                '<ellipse cx="72" cy="194" rx="16" ry="25" fill="#e8ba96"/>' +
                '<ellipse cx="248" cy="194" rx="16" ry="25" fill="#e8ba96"/>' +
            '</svg>'
        );
    }

    async function waitForSelectedStageImage(runner, timeoutMs = 2500) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const objects = window.app?.objects;
            const selected = objects?.getSelectedObjects?.() || [];
            const imagePropsVisible = !document.getElementById('image-properties')?.classList.contains('hidden');
            const jointsVisible = !document.getElementById('joints-section')?.classList.contains('hidden');
            if (selected.length === 1 && selected[0]?.type === 'image' && imagePropsVisible && jointsVisible) return;
            await runner._wait(120);
        }
    }

    async function ensureFaceRigMode(mode, runner) {
        const modeSelect = document.getElementById('face-rig-mode-select');
        const nextMode = String(mode || '').trim().toLowerCase();
        if (!modeSelect || !nextMode) return;
        if (modeSelect.value !== nextMode) {
            modeSelect.value = nextMode;
            modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await runner._wait(220);
    }

    async function ensureStageCharacterWorkflowDemo(runner) {
        const objects = window.app?.objects;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        const state = runner.context.stageCharacterWorkflowState || {};
        state.priorSelectionIds = Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [];
        state.jointBuildCollapsed = document.getElementById('joint-build')?.classList.contains('collapsed') ?? true;
        runner.context.stageCharacterWorkflowState = state;

        const existingDemo = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-character-image-workflow') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            if (existingDemo) {
                state.demoObjectId = existingDemo.id;
                objects.select([existingDemo.id]);
                await waitForSelectedStageImage(runner);
                return existingDemo;
            }

            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const demoSrc = getStageCharacterWorkflowDemoSrc();
            const demoObject = new StageObjectCtor('image', {
                x: Math.round(stageWidth * 0.2),
                y: Math.round(stageHeight * 0.14),
                width: 220,
                height: 360,
                name: 'Tutorial Character Demo',
                imageSrc: demoSrc,
                opacity: 1
            });
            demoObject._tutorialDemoKind = 'stage-character-image-workflow';
            objects.addObject(demoObject);
            if (typeof demoObject.loadImage === 'function') {
                demoObject.loadImage(demoSrc);
            }
            objects.select([demoObject.id]);
            state.demoObjectId = demoObject.id;
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        state.initialObjectIds = (objects.objects || []).map(obj => obj?.id).filter(Boolean);
        await waitForSelectedStageImage(runner);
        return state.demoObjectId ? objects.getObjectById(state.demoObjectId) : null;
    }

    async function ensureStageFaceRigWorkflowDemo(runner) {
        const objects = window.app?.objects;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        const state = runner.context.stageCharacterWorkflowState || {};
        state.priorSelectionIds = Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [];
        state.jointBuildCollapsed = document.getElementById('joint-build')?.classList.contains('collapsed') ?? true;
        runner.context.stageCharacterWorkflowState = state;

        const existingDemo = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-face-rig-workflow') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            if (existingDemo) {
                state.demoObjectId = existingDemo.id;
                objects.select([existingDemo.id]);
                await waitForSelectedStageImage(runner);
                return existingDemo;
            }

            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const demoSrc = getStageFaceRigWorkflowDemoSrc();
            const demoObject = new StageObjectCtor('image', {
                x: Math.round(stageWidth * 0.28),
                y: Math.round(stageHeight * 0.14),
                width: 320,
                height: 360,
                name: 'Tutorial Face Demo',
                imageSrc: demoSrc,
                opacity: 1
            });
            demoObject._tutorialDemoKind = 'stage-face-rig-workflow';
            objects.addObject(demoObject);
            if (typeof demoObject.loadImage === 'function') {
                demoObject.loadImage(demoSrc);
            }
            objects.select([demoObject.id]);
            state.demoObjectId = demoObject.id;
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        state.initialObjectIds = (objects.objects || []).map(obj => obj?.id).filter(Boolean);
        await waitForSelectedStageImage(runner);
        return state.demoObjectId ? objects.getObjectById(state.demoObjectId) : null;
    }

    async function restoreStageCharacterWorkflowState(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const state = runner.context?.stageCharacterWorkflowState;
        if (!objects || !state) return;

        if (jointSystem?._smartCutActive) {
            jointSystem._exitSmartCut?.();
        }
        if (jointSystem?._bsActive) {
            jointSystem._exitBodyStencil?.();
        }
        document.getElementById('smart-cut-panel')?.remove();
        document.getElementById('body-stencil-panel')?.remove();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            const initialObjectIds = new Set(state.initialObjectIds || []);
            (objects.objects || [])
                .filter(obj => obj?.id && !initialObjectIds.has(obj.id))
                .forEach(obj => objects.removeObject(obj.id));

            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-character-image-workflow' || obj?._tutorialDemoKind === 'stage-face-rig-workflow')
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        const jointBuildBody = document.getElementById('joint-build');
        if (jointBuildBody) {
            const shouldBeCollapsed = state.jointBuildCollapsed !== false;
            const isCollapsed = jointBuildBody.classList.contains('collapsed');
            if (shouldBeCollapsed !== isCollapsed) {
                document.querySelector('.joint-group-toggle[data-group="joint-build"]')?.click();
                await runner._wait(180);
            }
        }

        delete runner.context.stageCharacterWorkflowState;
    }

    async function waitForStageNewObjects(runner, knownIds, timeoutMs = 5000) {
        const baseline = new Set(Array.isArray(knownIds) ? knownIds : []);
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const currentIds = (window.app?.objects?.objects || []).map(obj => obj?.id).filter(Boolean);
            if (currentIds.some(id => !baseline.has(id))) return;
            await runner._wait(120);
        }
    }

    function getStageJointPresetsApi() {
        return window.JointPresets || (typeof JointPresets !== 'undefined' ? JointPresets : null);
    }

    function isStageElementVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
        if (!style) return !element.classList?.contains('hidden');
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    async function waitForStageElement(selector, runner, timeoutMs = 2500) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            let element = null;
            try {
                element = document.querySelector(selector);
            } catch (error) {
                return null;
            }
            if (isStageElementVisible(element)) return element;
            await runner._wait(120);
        }
        return null;
    }

    function getStageTutorialReferenceObject(priorSelectionIds = []) {
        const objects = window.app?.objects;
        if (!objects?.getObjectById || !Array.isArray(priorSelectionIds) || priorSelectionIds.length !== 1) return null;
        return objects.getObjectById(priorSelectionIds[0]) || null;
    }

    async function selectStageObjectIdsForTutorial(objectIds, runner) {
        const objects = window.app?.objects;
        if (!objects?.getObjectById || !Array.isArray(objectIds)) return [];

        const validIds = objectIds.filter(id => objects.getObjectById(id));
        if (!validIds.length) return [];

        const selectedIds = Array.isArray(objects.selectedIds) ? objects.selectedIds : [];
        const alreadySelected = selectedIds.length === validIds.length
            && validIds.every(id => selectedIds.includes(id));
        if (!alreadySelected) {
            const previousSuppressHistory = Boolean(objects._suppressHistory);
            objects._suppressHistory = true;
            try {
                objects.select(validIds);
            } finally {
                objects._suppressHistory = previousSuppressHistory;
            }
            await runner._wait(120);
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        return validIds;
    }

    function buildStagePoseArmatureTutorialObjects(jointSystem, reference = null) {
        if (!jointSystem?._createDummyFreeformPart
            || !jointSystem?._dummyTorsoFrontPoints
            || !jointSystem?._dummyEllipsePoints
            || !jointSystem?._dummyTaperedLimbPoints
            || !jointSystem?._getDummyArmatureStyle
            || !jointSystem?._buildArmatureJointSpec
            || !jointSystem?._configureDummyArmatureJointPin
            || !jointSystem?._configureDummyArmaturePin) {
            return [];
        }

        const canvasWidth = jointSystem.stage?.canvas?.width || 1280;
        const canvasHeight = jointSystem.stage?.canvas?.height || 720;

        const refWidth = Math.max(220, Math.abs(reference?.width || 300));
        const refHeight = Math.max(480, Math.abs(reference?.height || 620));
        const centerX = reference
            ? (reference.x + (reference.width * (reference.pivotX ?? 0.5)))
            : canvasWidth * 0.5;
        const topY = reference
            ? reference.y
            : Math.max(40, canvasHeight * 0.12);

        const torsoWidth = Math.round(refWidth * 0.36);
        const torsoHeight = Math.round(refHeight * 0.34);
        const headWidth = Math.round(refWidth * 0.30);
        const headHeight = Math.round(refHeight * 0.24);
        const armWidth = Math.round(refWidth * 0.13);
        const armHeight = Math.round(refHeight * 0.40);
        const legWidth = Math.round(refWidth * 0.14);
        const legHeight = Math.round(refHeight * 0.44);

        const torsoX = Math.round(centerX - torsoWidth * 0.5);
        const torsoY = Math.round(topY + refHeight * 0.22);
        const headX = Math.round(centerX - headWidth * 0.5);
        const headY = Math.round(topY);
        const rightArmX = Math.round(torsoX - armWidth * 0.88);
        const leftArmX = Math.round(torsoX + torsoWidth - armWidth * 0.12);
        const armsY = Math.round(torsoY + torsoHeight * 0.04);
        const rightLegX = Math.round(centerX - legWidth * 1.05);
        const leftLegX = Math.round(centerX + legWidth * 0.05);
        const legsY = Math.round(torsoY + torsoHeight * 0.80);

        const torso = jointSystem._createDummyFreeformPart(
            jointSystem._dummyTorsoFrontPoints(torsoX, torsoY, torsoWidth, torsoHeight),
            {
                name: 'Tutorial Armature Torso',
                x: torsoX,
                y: torsoY,
                width: torsoWidth,
                height: torsoHeight,
                ...jointSystem._getDummyArmatureStyle('#37c7be'),
                pivotX: 0.5,
                pivotY: 0.5,
                jointDirection: 'vertical-bt',
                joints: [jointSystem._buildArmatureJointSpec('waist', 0.30, 0.50)]
            }
        );

        const headNeck = jointSystem._createDummyFreeformPart(
            jointSystem._dummyEllipsePoints(headX + headWidth * 0.5, headY + headHeight * 0.38, headWidth * 0.48, headHeight * 0.38, 14),
            {
                name: 'Tutorial Armature Head Neck',
                x: headX,
                y: headY,
                width: headWidth,
                height: headHeight,
                ...jointSystem._getDummyArmatureStyle('#5a93d8'),
                pivotX: 0.5,
                pivotY: 0.5,
                jointDirection: 'vertical-tb',
                joints: [jointSystem._buildArmatureJointSpec('neck', 0.80, 0.5)]
            }
        );

        const rightArm = jointSystem._createDummyFreeformPart(
            jointSystem._dummyTaperedLimbPoints(rightArmX, armsY, armWidth, armHeight, 1.0, 0.60),
            {
                name: 'Tutorial Armature Right Arm',
                x: rightArmX,
                y: armsY,
                width: armWidth,
                height: armHeight,
                ...jointSystem._getDummyArmatureStyle('#5a93d8'),
                pivotX: 0.5,
                pivotY: 0.5,
                jointDirection: 'vertical-tb',
                joints: [
                    jointSystem._buildArmatureJointSpec('right-shoulder', 0.06, 0.5),
                    jointSystem._buildArmatureJointSpec('right-elbow', 0.47, 0.5),
                    jointSystem._buildArmatureJointSpec('right-wrist', 0.84, 0.5)
                ]
            }
        );

        const leftArm = jointSystem._createDummyFreeformPart(
            jointSystem._dummyTaperedLimbPoints(leftArmX, armsY, armWidth, armHeight, 1.0, 0.60),
            {
                name: 'Tutorial Armature Left Arm',
                x: leftArmX,
                y: armsY,
                width: armWidth,
                height: armHeight,
                ...jointSystem._getDummyArmatureStyle('#5a93d8'),
                pivotX: 0.5,
                pivotY: 0.5,
                jointDirection: 'vertical-tb',
                joints: [
                    jointSystem._buildArmatureJointSpec('left-shoulder', 0.06, 0.5),
                    jointSystem._buildArmatureJointSpec('left-elbow', 0.47, 0.5),
                    jointSystem._buildArmatureJointSpec('left-wrist', 0.84, 0.5)
                ]
            }
        );

        const rightLeg = jointSystem._createDummyFreeformPart(
            jointSystem._dummyTaperedLimbPoints(rightLegX, legsY, legWidth, legHeight, 1.0, 0.55),
            {
                name: 'Tutorial Armature Right Leg',
                x: rightLegX,
                y: legsY,
                width: legWidth,
                height: legHeight,
                ...jointSystem._getDummyArmatureStyle('#d84f72'),
                pivotX: 0.5,
                pivotY: 0.5,
                jointDirection: 'vertical-tb',
                joints: [
                    jointSystem._buildArmatureJointSpec('right-hip', 0.06, 0.5),
                    jointSystem._buildArmatureJointSpec('right-knee', 0.49, 0.5),
                    jointSystem._buildArmatureJointSpec('right-ankle', 0.85, 0.5)
                ]
            }
        );

        const leftLeg = jointSystem._createDummyFreeformPart(
            jointSystem._dummyTaperedLimbPoints(leftLegX, legsY, legWidth, legHeight, 1.0, 0.55),
            {
                name: 'Tutorial Armature Left Leg',
                x: leftLegX,
                y: legsY,
                width: legWidth,
                height: legHeight,
                ...jointSystem._getDummyArmatureStyle('#52d65a'),
                pivotX: 0.5,
                pivotY: 0.5,
                jointDirection: 'vertical-tb',
                joints: [
                    jointSystem._buildArmatureJointSpec('left-hip', 0.06, 0.5),
                    jointSystem._buildArmatureJointSpec('left-knee', 0.49, 0.5),
                    jointSystem._buildArmatureJointSpec('left-ankle', 0.85, 0.5)
                ]
            }
        );

        jointSystem._configureDummyArmatureJointPin(headNeck, torso, 'waist', 'inherit');
        jointSystem._configureDummyArmatureJointPin(rightArm, torso, 'waist', 'inherit');
        jointSystem._configureDummyArmatureJointPin(leftArm, torso, 'waist', 'inherit');
        jointSystem._configureDummyArmaturePin(rightLeg, torso, 0.36, 0.84, 'inherit');
        jointSystem._configureDummyArmaturePin(leftLeg, torso, 0.64, 0.84, 'inherit');
        torso._armatureFrontBackFacing = 'front';

        return [torso, headNeck, rightArm, leftArm, rightLeg, leftLeg];
    }

    async function ensureStagePoseArmatureWorkflowDemo(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        if (!objects || !jointSystem) return null;

        runner.context = runner.context || {};
        const state = runner.context.stagePoseArmatureWorkflowState || {};
        if (!state.initialized) {
            state.initialized = true;
            state.priorSelectionIds = Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [];
            state.armaturePanelWasOpen = Boolean(document.getElementById('armature-panel'));
        }
        runner.context.stagePoseArmatureWorkflowState = state;

        const existingDemoObjects = (objects.objects || []).filter(obj => obj?._tutorialDemoKind === 'stage-pose-armature-workflow');
        if (existingDemoObjects.length >= 6) {
            state.demoObjectIds = existingDemoObjects.map(obj => obj.id);
            state.targetSelectionIds = [...state.demoObjectIds];
            await selectStageObjectIdsForTutorial(state.targetSelectionIds, runner);
            jointSystem.openArmaturePanel?.();
            await waitForStageElement('#armature-panel', runner);
            return jointSystem._currentArmature || jointSystem._detectSelectedArmature?.() || jointSystem._detectArmature?.();
        }

        const reference = getStageTutorialReferenceObject(state.priorSelectionIds);
        const demoObjects = buildStagePoseArmatureTutorialObjects(jointSystem, reference);
        if (!demoObjects.length) return null;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            demoObjects.forEach(obj => {
                obj._tutorialDemoKind = 'stage-pose-armature-workflow';
                objects.addObject(obj);
            });
            objects._resolvePins?.();
            state.demoObjectIds = demoObjects.map(obj => obj.id);
            state.targetSelectionIds = [...state.demoObjectIds];
            objects.select(state.targetSelectionIds);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        jointSystem.openArmaturePanel?.();
        await waitForStageElement('#armature-panel', runner);
        return jointSystem._currentArmature || jointSystem._detectSelectedArmature?.() || jointSystem._detectArmature?.();
    }

    async function restoreStagePoseArmatureWorkflowState(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const state = runner.context?.stagePoseArmatureWorkflowState;
        if (!objects || !state) return;

        objects.exitFlexRigMode?.();
        jointSystem?._stopArmatureMovement?.(jointSystem?._currentArmature);
        jointSystem?._stopArmatureFacialMovement?.(jointSystem?._currentArmature);
        if (jointSystem?._bodyTagActive) {
            jointSystem._exitBodyTagMode?.(true);
        }
        jointSystem._contactTargetEditorState = null;
        document.getElementById('joint-contact-target-panel')?.remove();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (state.demoObjectIds || []).forEach(id => {
                if (objects.getObjectById(id)) objects.removeObject(id);
            });
            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();

        if (state.armaturePanelWasOpen) {
            jointSystem.openArmaturePanel?.();
            await runner._wait(180);
        } else {
            jointSystem?._teardownArmaturePanelState?.();
            document.getElementById('armature-panel')?.remove();
        }

        delete runner.context.stagePoseArmatureWorkflowState;
    }

    function getStageUniversalCharacterHowToState(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const stage = window.app?.stage;
        runner.context = runner.context || {};
        const state = runner.context.stageUniversalCharacterHowToState || {};
        if (!state.initialized) {
            state.initialized = true;
            state.priorSelectionIds = Array.isArray(objects?.selectedIds) ? [...objects.selectedIds] : [];
            state.armaturePanelWasOpen = Boolean(document.getElementById('armature-panel'));
            state.currentTime = window.app?.animations?.currentTime || 0;
            state.armatureRecordMode = Boolean(jointSystem?._armatureRecordMode);
            state.viewportState = {
                zoom: Number.isFinite(stage?.zoom) ? stage.zoom : 1,
                panX: Number.isFinite(stage?.panX) ? stage.panX : 0,
                panY: Number.isFinite(stage?.panY) ? stage.panY : 0,
                userZoomed: Boolean(stage?._userZoomed)
            };
        }
        if (!Array.isArray(state.demoObjectIds)) {
            state.demoObjectIds = [];
        }
        runner.context.stageUniversalCharacterHowToState = state;
        return state;
    }

    function getStageTutorialBoundsFromObjects(objects = []) {
        const validObjects = (objects || []).filter(obj => obj && typeof obj.getBounds === 'function');
        if (!validObjects.length) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        validObjects.forEach(obj => {
            const bounds = obj.getBounds?.();
            if (!bounds) return;
            const right = Number.isFinite(bounds.right) ? bounds.right : (Number(bounds.x) || 0) + (Number(bounds.width) || 0);
            const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : (Number(bounds.y) || 0) + (Number(bounds.height) || 0);
            minX = Math.min(minX, Number(bounds.x) || 0);
            minY = Math.min(minY, Number(bounds.y) || 0);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return null;
        }

        return {
            x: minX,
            y: minY,
            width: Math.max(0, maxX - minX),
            height: Math.max(0, maxY - minY)
        };
    }

    function getStageUniversalCharacterHowToLiveArmature(runner, armature = null) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem) return null;

        const state = runner?.context?.stageUniversalCharacterHowToState || {};
        const selectedDemoObjects = (state.targetSelectionIds || [])
            .map(id => objects?.getObjectById(id))
            .filter(Boolean);

        return armature
            || jointSystem._currentArmature
            || jointSystem._detectArmatureFromPool?.(selectedDemoObjects)
            || jointSystem._detectArmature?.()
            || null;
    }

    function getStageUniversalCharacterHowToPartObject(runner, partKey, armature = null) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const normalizedKey = String(partKey || '').trim().toLowerCase();
        if (!normalizedKey) return null;

        const state = runner?.context?.stageUniversalCharacterHowToState || {};
        const candidateIds = Array.from(new Set([...(state.targetSelectionIds || []), ...(state.demoObjectIds || [])]));
        const demoObjects = candidateIds.map(id => objects?.getObjectById(id)).filter(Boolean);
        const matchesPartKey = obj => String(
            obj?._armatureRoleKey || obj?._armaturePartKey || obj?.bodyPartData?.partKey || ''
        ).trim().toLowerCase() === normalizedKey;

        const demoMatch = demoObjects.find(matchesPartKey);
        if (demoMatch) return demoMatch;

        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, armature);
        const armaturePart = liveArmature?.parts?.[normalizedKey]?.obj || null;
        if (armaturePart) return armaturePart;

        const partMap = jointSystem?._getPartObjectMap?.() || {};
        return partMap[normalizedKey] || null;
    }

    function createStageUniversalCharacterIkGesture(runner, options = {}) {
        const stage = window.app?.stage;
        const jointSystem = window.app?.jointSystem;
        const requestedPartKey = String(options.partKey || 'r-hand').trim().toLowerCase();
        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, options.armature || null);
        const endEffector = getStageUniversalCharacterHowToPartObject(runner, requestedPartKey, liveArmature);
        if (!stage?.stageToScreen) {
            return null;
        }

        const anchor = getStageUniversalCharacterHowToAnchor(liveArmature);
        if (!anchor) return null;

        const actualPartKey = String(
            endEffector?._armatureRoleKey || endEffector?._armaturePartKey || endEffector?.bodyPartData?.partKey || ''
        ).trim().toLowerCase();
        const supportsLiveIk = Boolean(
            typeof jointSystem?.solveIK === 'function'
            && endEffector?.getPivotPoint
            && actualPartKey === requestedPartKey
        );

        const startPivot = supportsLiveIk
            ? endEffector.getPivotPoint()
            : (typeof options.resolveStart === 'function'
                ? options.resolveStart({
                    anchor,
                    armature: liveArmature,
                    part: endEffector,
                    runner,
                    stage,
                    jointSystem
                })
                : {
                    x: Math.round(anchor.centerX + anchor.width * 0.36),
                    y: Math.round(anchor.topY + anchor.height * 0.42)
                });
        if (!Number.isFinite(startPivot?.x) || !Number.isFinite(startPivot?.y)) {
            return null;
        }

        const target = typeof options.resolveTarget === 'function'
            ? options.resolveTarget({
                anchor,
                armature: liveArmature,
                part: endEffector,
                runner,
                stage,
                jointSystem,
                start: startPivot
            })
            : options.target;

        if (!Number.isFinite(target?.x) || !Number.isFinite(target?.y)) {
            return null;
        }

        const startScreen = stage.stageToScreen(startPivot.x, startPivot.y);
        const endScreen = stage.stageToScreen(target.x, target.y);
        const iterations = Math.max(4, Number(options.iterations) || 8);

        return {
            points: [startScreen, endScreen],
            durationMs: Math.max(480, Number(options.durationMs) || 960),
            holdMs: Math.max(0, Number(options.holdMs) || 220),
            cursorMode: options.cursorMode || 'drag',
            showTrail: options.showTrail !== false,
            startClick: options.startClick !== false,
            endClick: options.endClick !== false,
            onStart: () => {
                jointSystem._stopArmatureMovement?.(liveArmature);
                jointSystem._stopArmatureFacialMovement?.(liveArmature);
            },
            onProgress: progress => {
                if (!supportsLiveIk) return;
                const stageX = startPivot.x + (target.x - startPivot.x) * progress;
                const stageY = startPivot.y + (target.y - startPivot.y) * progress;
                jointSystem.solveIK(endEffector, stageX, stageY, iterations, true);
                stage.requestRender?.();
            },
            onComplete: async () => {
                if (supportsLiveIk) {
                    jointSystem.solveIK(endEffector, target.x, target.y, iterations + 2, true);
                }
                if (options.poseSelector) {
                    document.querySelector(options.poseSelector)?.click();
                }
                stage.requestRender?.();
            }
        };
    }

    function getStageUniversalCharacterFaceFocusBounds(jointSystem, armature) {
        if (!jointSystem || !armature) return null;

        const headObject = jointSystem._getArmatureFacialHead?.(armature)
            || armature?.parts?.head?.obj
            || armature?.parts?.['head-neck']?.obj
            || null;
        const facialObjects = (jointSystem._getArmatureFacialObjects?.(armature) || []).filter(Boolean);
        const facialBounds = getStageTutorialBoundsFromObjects(facialObjects);
        const headBounds = getStageTutorialBoundsFromObjects(headObject ? [headObject] : []);

        if (headBounds) {
            const faceBounds = {
                x: headBounds.x + (headBounds.width * 0.16),
                y: headBounds.y + (headBounds.height * 0.06),
                width: Math.max(36, headBounds.width * 0.68),
                height: Math.max(36, headBounds.height * 0.54)
            };

            if (!facialBounds) return faceBounds;

            const padX = Math.max(10, headBounds.width * 0.06);
            const padY = Math.max(10, headBounds.height * 0.06);
            const minX = Math.min(faceBounds.x, facialBounds.x - padX);
            const minY = Math.min(faceBounds.y, facialBounds.y - padY);
            const maxX = Math.max(faceBounds.x + faceBounds.width, facialBounds.x + facialBounds.width + padX);
            const maxY = Math.max(faceBounds.y + faceBounds.height, facialBounds.y + facialBounds.height + padY);
            return {
                x: minX,
                y: minY,
                width: Math.max(0, maxX - minX),
                height: Math.max(0, maxY - minY)
            };
        }

        return facialBounds;
    }

    function getStageUniversalCharacterFullFocusBounds(jointSystem, armature) {
        const objects = window.app?.objects;
        if (!jointSystem || !objects || !armature) return null;

        const armatureObjects = getStageUniversalCharacterHowToObjectIds(jointSystem, armature)
            .map(id => objects.getObjectById?.(id))
            .filter(Boolean);
        return getStageTutorialBoundsFromObjects(armatureObjects);
    }

    async function focusStageViewportOnBounds(bounds, runner, options = {}) {
        const stage = window.app?.stage;
        if (!stage || !bounds) return false;

        runner.context = runner.context || {};
        runner.context.stageTutorialViewportLocked = true;

        stage.resizeCanvas?.();

        const width = Math.max(10, Number(bounds.width) || 0);
        const height = Math.max(10, Number(bounds.height) || 0);
        const centerX = (Number(bounds.x) || 0) + (width / 2);
        const centerY = (Number(bounds.y) || 0) + (height / 2);
        const fillRatio = Math.max(0.2, Math.min(0.9, Number(options.fillRatio) || 0.58));
        const rawMultiplier = Number(options.minZoomMultiplier);
        const minZoomMultiplier = Number.isFinite(rawMultiplier) ? Math.max(0, rawMultiplier) : 1.2;
        const minZoom = Number.isFinite(Number(options.minZoom)) ? Math.max(0.1, Number(options.minZoom)) : 0.5;
        const clamp = typeof Utils !== 'undefined' && typeof Utils.clamp === 'function'
            ? Utils.clamp
            : ((value, min, max) => Math.max(min, Math.min(max, value)));

        const zoomX = ((stage.viewportWidth || 1) * fillRatio) / width;
        const zoomY = ((stage.viewportHeight || 1) * fillRatio) / height;
        let targetZoom = Math.min(zoomX, zoomY);
        if (minZoomMultiplier >= 1 && Number.isFinite(stage.zoom) && stage.zoom > 0) {
            targetZoom = Math.max(targetZoom, stage.zoom * minZoomMultiplier);
        }

        stage.zoom = clamp(targetZoom, minZoom, Number(options.maxZoom) || 10);
        stage.panX = (stage.viewportWidth || 0) / 2 - centerX * stage.zoom;
        stage.panY = (stage.viewportHeight || 0) / 2 - centerY * stage.zoom;
        stage._userZoomed = true;
        stage.updateZoomDisplay?.();
        stage.needsRender = true;
        stage.requestRender?.();
        await runner._wait(180);
        return true;
    }

    async function focusStageViewportOnUniversalCharacterFace(runner, armature = null, options = {}) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem) return false;

        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, armature);
        const bounds = getStageUniversalCharacterFaceFocusBounds(jointSystem, liveArmature);
        if (!bounds) return false;

        return focusStageViewportOnBounds(bounds, runner, options);
    }

    async function focusStageViewportOnUniversalCharacter(runner, armature = null, options = {}) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem) return false;

        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, armature);
        const bounds = getStageUniversalCharacterFullFocusBounds(jointSystem, liveArmature);
        if (!bounds) return false;

        return focusStageViewportOnBounds(bounds, runner, options);
    }

    async function ensureStageUniversalCharacterMovementActive(runner, moveKey, armature = null) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem || !moveKey) return false;
        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, armature);
        if (!liveArmature?.root) return false;
        const playingKey = jointSystem._getArmaturePlayingKey?.(liveArmature) || liveArmature.root._poseArmaturePlayingKey || null;
        if (playingKey === moveKey) return true;
        try {
            jointSystem._captureArmatureStageBasePosition?.(liveArmature);
            jointSystem._playArmatureMovement?.(liveArmature, moveKey);
            jointSystem._updateArmaturePanelPlayState?.(liveArmature);
        } catch (_err) {
            return false;
        }
        return true;
    }

    async function focusStageViewportOnStageCorridor(runner, armature = null, options = {}) {
        const stage = window.app?.stage;
        const jointSystem = window.app?.jointSystem;
        if (!stage) return false;

        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, armature);
        const characterBounds = getStageUniversalCharacterFullFocusBounds(jointSystem, liveArmature);
        const stageWidth = stage.width || stage.canvas?.width || 1280;
        const stageHeight = stage.height || stage.canvas?.height || 720;

        const padX = Number.isFinite(options.paddingX) ? options.paddingX : 24;
        const verticalFill = Number.isFinite(options.verticalFillRatio) ? options.verticalFillRatio : 0.9;

        const corridorY = characterBounds ? characterBounds.y : Math.round(stageHeight * 0.1);
        const corridorHeight = characterBounds
            ? Math.max(characterBounds.height, stageHeight * verticalFill)
            : Math.round(stageHeight * verticalFill);

        const bounds = {
            x: Math.max(0, -padX),
            y: corridorY,
            width: stageWidth + (padX * 2),
            height: corridorHeight
        };

        return focusStageViewportOnBounds(bounds, runner, {
            fillRatio: Number.isFinite(options.fillRatio) ? options.fillRatio : 0.94,
            minZoomMultiplier: 0,
            minZoom: Number.isFinite(options.minZoom) ? options.minZoom : 0.3,
            maxZoom: Number.isFinite(options.maxZoom) ? options.maxZoom : 2.4
        });
    }

    async function setStageUniversalCharacterBasePosition(runner, armature = null, options = {}) {
        const jointSystem = window.app?.jointSystem;
        const stage = window.app?.stage;
        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, armature);
        if (!jointSystem || !liveArmature?.root) return false;

        const basePosition = jointSystem._captureArmatureStageBasePosition?.(liveArmature)
            || jointSystem._getArmatureBasePosition?.(liveArmature, { initialize: true })
            || {
                x: Number.isFinite(liveArmature.root.x) ? liveArmature.root.x : 0,
                y: Number.isFinite(liveArmature.root.y) ? liveArmature.root.y : 0
            };
        const baseX = Number.isFinite(options.baseX) ? options.baseX : basePosition.x;
        const baseY = Number.isFinite(options.baseY) ? options.baseY : basePosition.y;

        jointSystem._setArmatureBasePosition?.(liveArmature, baseX, baseY);
        jointSystem._setArmatureRootPosition?.(liveArmature, baseX, baseY);
        if (stage) {
            stage.needsRender = true;
            stage.requestRender?.();
        }
        await runner._wait(Number.isFinite(options.waitMs) ? options.waitMs : 120);
        return true;
    }

    async function animateStageUniversalCharacterTravel(runner, options = {}) {
        const jointSystem = window.app?.jointSystem;
        const stage = window.app?.stage;
        const liveArmature = getStageUniversalCharacterHowToLiveArmature(runner, options.armature || null);
        if (!jointSystem || !stage || !liveArmature?.root) return false;

        const basePosition = jointSystem._captureArmatureStageBasePosition?.(liveArmature)
            || jointSystem._getArmatureBasePosition?.(liveArmature, { initialize: true })
            || {
                x: Number.isFinite(liveArmature.root.x) ? liveArmature.root.x : 0,
                y: Number.isFinite(liveArmature.root.y) ? liveArmature.root.y : 0
            };
        const startX = Number.isFinite(basePosition?.x) ? basePosition.x : 0;
        const startY = Number.isFinite(basePosition?.y) ? basePosition.y : 0;
        const targetX = Number.isFinite(options.baseX) ? options.baseX : startX;
        const targetY = Number.isFinite(options.baseY) ? options.baseY : startY;
        const durationMs = Math.max(1, Number(options.durationMs) || 1200);
        const settleMs = Math.max(0, Number(options.settleMs) || 80);

        if (Math.abs(targetX - startX) <= 0.5 && Math.abs(targetY - startY) <= 0.5) {
            return true;
        }

        // Camera-follow setup: pan the viewport horizontally so the character stays visible
        // even when the stage is zoomed in past the point where the full corridor fits in view.
        const followCamera = options.followCamera !== false;
        const viewportWidth = stage.viewportWidth || 0;
        const startPanX = Number.isFinite(stage.panX) ? stage.panX : 0;
        const zoom = Number.isFinite(stage.zoom) && stage.zoom > 0 ? stage.zoom : 1;
        // Bias the focus a little left of viewport centre so the character clears the right-side
        // properties panel even when it would otherwise sit at the very edge of the canvas area.
        const followBiasRatio = Number.isFinite(options.followBiasRatio)
            ? options.followBiasRatio
            : 0.42;
        const focusViewportX = viewportWidth * followBiasRatio;
        const computeFollowPan = (characterX) => {
            const armatureWidth = Math.abs(liveArmature.root.width || 120);
            const focusStageX = characterX + (armatureWidth / 2);
            // Keep the character at the biased focus point throughout travel — no stage-edge clamp,
            // so the exit beat keeps panning right and never tucks the character under the panel.
            return focusViewportX - (focusStageX * zoom);
        };
        // Silence unused-warning while preserving original capture in case future work needs it.
        void startPanX;

        // Optional linked objects: anchor arbitrary stage objects to the moving character base so
        // props (briefcase, ball, etc.) travel with it in lockstep. Each entry uses its initial
        // offset from the character base unless an explicit offset is supplied.
        const objectsApi = window.app?.objects;
        const linkedObjectRefs = Array.isArray(options.linkedObjects)
            ? options.linkedObjects.map(entry => {
                if (!entry) return null;
                const obj = objectsApi?.getObjectById?.(entry.id);
                if (!obj) return null;
                const offsetX = Number.isFinite(entry.offsetX) ? entry.offsetX : ((obj.x || 0) - startX);
                const offsetY = Number.isFinite(entry.offsetY) ? entry.offsetY : ((obj.y || 0) - startY);
                return { obj, offsetX, offsetY };
            }).filter(Boolean)
            : [];

        const applyLinkedObjects = (baseX, baseY) => {
            linkedObjectRefs.forEach(ref => {
                ref.obj.x = baseX + ref.offsetX;
                ref.obj.y = baseY + ref.offsetY;
            });
        };

        await new Promise(resolve => {
            const startTime = performance.now();

            const step = now => {
                const elapsed = Math.max(0, now - startTime);
                const t = Math.min(1, elapsed / durationMs);
                const eased = t < 0.5
                    ? 2 * t * t
                    : 1 - Math.pow(-2 * t + 2, 2) / 2;
                const nextBaseX = startX + ((targetX - startX) * eased);
                const nextBaseY = startY + ((targetY - startY) * eased);

                jointSystem._setArmatureBasePosition?.(liveArmature, nextBaseX, nextBaseY);
                if (!liveArmature.root?._poseArmatureAnim) {
                    jointSystem._setArmatureRootPosition?.(liveArmature, nextBaseX, nextBaseY);
                }

                applyLinkedObjects(nextBaseX, nextBaseY);

                if (followCamera) {
                    stage.panX = computeFollowPan(nextBaseX);
                    stage._userZoomed = true;
                    if (runner?.context) runner.context.stageTutorialViewportLocked = true;
                }

                stage.needsRender = true;
                stage.requestRender?.();

                if (t >= 1) {
                    jointSystem._setArmatureBasePosition?.(liveArmature, targetX, targetY);
                    if (!liveArmature.root?._poseArmatureAnim) {
                        jointSystem._setArmatureRootPosition?.(liveArmature, targetX, targetY);
                    }
                    applyLinkedObjects(targetX, targetY);
                    if (followCamera) {
                        stage.panX = computeFollowPan(targetX);
                    }
                    resolve();
                    return;
                }

                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });

        stage.needsRender = true;
        stage.requestRender?.();
        await runner._wait(settleMs);
        return true;
    }

    function getStageUniversalCharacterHowToObjectIds(jointSystem, armature) {
        const ids = new Set();
        const addObjects = items => {
            (items || []).forEach(obj => {
                if (obj?.id) ids.add(obj.id);
            });
        };

        if (armature?.root?.id) ids.add(armature.root.id);
        addObjects(jointSystem?._getArmatureObjects?.(armature));
        addObjects(jointSystem?._getArmatureFacialObjects?.(armature));
        addObjects(jointSystem?._getUniversalCharacterGarmentObjects?.(armature));
        addObjects(jointSystem?._getUniversalCharacterBackViewHelperObjects?.(armature));
        return [...ids];
    }

    function getStageUniversalCharacterHowToSelectionIds(jointSystem, armature) {
        return (jointSystem?._getArmatureObjects?.(armature) || [])
            .map(obj => obj?.id)
            .filter(Boolean);
    }

    function rememberStageUniversalCharacterHowToObject(state, object, objectKey = '') {
        if (!state || !object?.id) return;
        object._tutorialDemoKind = 'stage-universal-character-howto';
        if (objectKey) object._tutorialDemoKey = objectKey;
        if (!Array.isArray(state.demoObjectIds)) {
            state.demoObjectIds = [];
        }
        if (!state.demoObjectIds.includes(object.id)) {
            state.demoObjectIds.push(object.id);
        }
    }

    function findStageUniversalCharacterHowToObject(objectKey) {
        const objects = window.app?.objects;
        if (!objects || !objectKey) return null;
        return (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-universal-character-howto' && obj?._tutorialDemoKey === objectKey) || null;
    }

    async function clearStageUniversalCharacterHowToSelection(runner) {
        const objects = window.app?.objects;
        if (!objects) return;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            objects.select([]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        await runner._wait(120);
    }

    async function ensureStageUniversalCharacterHowToDemo(runner, options = {}) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        if (!objects || !jointSystem) return null;

        const state = getStageUniversalCharacterHowToState(runner);
        const desiredView = String(options?.view || '').toLowerCase() === 'side' ? 'side' : 'front';
        const desiredSideFacing = desiredView === 'side' && String(options?.sideFacing || '').toLowerCase() === 'left'
            ? 'left'
            : 'right';
        closeStageTransientUi();
        setStagePlayheadTime(0);

        const existingDemoObjects = (objects.objects || []).filter(obj => obj?._tutorialDemoKind === 'stage-universal-character-howto');
        let armature = jointSystem._detectArmatureFromPool?.(existingDemoObjects)
            || jointSystem._detectSelectedArmature?.()
            || jointSystem._detectArmature?.();

        const canReuseExistingDemo = Boolean(
            existingDemoObjects.length
            && armature?.root
            && state.demoView === desiredView
            && (desiredView !== 'side' || state.demoSideFacing === desiredSideFacing)
        );

        if (!canReuseExistingDemo && existingDemoObjects.length) {
            const previousSuppressHistory = Boolean(objects._suppressHistory);
            objects._suppressHistory = true;
            try {
                existingDemoObjects.forEach(obj => {
                    if (obj?.id && objects.getObjectById(obj.id)) objects.removeObject(obj.id);
                });
                state.demoObjectIds = [];
                state.targetSelectionIds = [];
            } finally {
                objects._suppressHistory = previousSuppressHistory;
            }
            objects.updateObjectList?.();
            objects.updateProperties?.();
            window.app?.stage?.requestRender?.();
            armature = null;
        }

        if (!armature?.root || !canReuseExistingDemo) {
            const reference = getStageTutorialReferenceObject(state.priorSelectionIds);
            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const stageX = reference
                ? Math.round(reference.x + (reference.width * (reference.pivotX ?? 0.5)))
                : Math.round(stageWidth * 0.28);
            const stageY = reference
                ? Math.round(Math.max(36, reference.y))
                : Math.round(Math.max(42, stageHeight * 0.12));
            const referenceHeight = Math.abs(reference?.height || 0);
            const height = Math.max(440, Math.min(620, Math.round(referenceHeight || (stageHeight * 0.68))));

            armature = jointSystem.createUniversalCharacter?.({
                gender: 'neutral',
                bodyType: 'normal',
                ageGroup: 'adult',
                view: desiredView,
                sideFacing: desiredView === 'side' ? desiredSideFacing : undefined,
                height,
                stageX,
                stageY,
                _ucInternal: {
                    openPanel: false,
                    pushHistory: false,
                    toast: false,
                    compactArmaturePanel: true
                }
            }) || null;
        }

        if (!armature?.root) return null;

        state.demoView = desiredView;
        state.demoSideFacing = desiredSideFacing;

        getStageUniversalCharacterHowToObjectIds(jointSystem, armature).forEach(id => {
            const obj = objects.getObjectById(id);
            if (obj) rememberStageUniversalCharacterHowToObject(state, obj);
        });

        state.targetSelectionIds = getStageUniversalCharacterHowToSelectionIds(jointSystem, armature);
        await selectStageObjectIdsForTutorial(state.targetSelectionIds, runner);
        jointSystem?._stopArmatureMovement?.(armature);
        jointSystem?._stopArmatureFacialMovement?.(armature);
        jointSystem.openArmaturePanel?.(armature, { compactMode: true });
        await waitForStageElement('#armature-panel', runner);
        if (options.clearSelection !== false) {
            await clearStageUniversalCharacterHowToSelection(runner);
        }
        return armature;
    }

    function getStageUniversalCharacterHowToAnchor(armature) {
        const root = armature?.root || null;
        const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
        const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
        const width = Math.abs(root?.width || Math.round(stageWidth * 0.16));
        const height = Math.abs(root?.height || Math.round(stageHeight * 0.36));
        const centerX = root
            ? Math.round(root.x + (root.width * (root.pivotX ?? 0.5)))
            : Math.round(stageWidth * 0.28);
        const topY = root ? Math.round(root.y) : Math.round(stageHeight * 0.14);
        return { stageWidth, stageHeight, width, height, centerX, topY };
    }

    async function ensureStageUniversalCharacterPointTargetDemo(runner) {
        const objects = window.app?.objects;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !StageObjectCtor) return null;

        const armature = await ensureStageUniversalCharacterHowToDemo(runner);
        const state = getStageUniversalCharacterHowToState(runner);
        if (!armature?.root) return null;

        const existingTarget = findStageUniversalCharacterHowToObject('point-target');
        if (existingTarget) {
            return existingTarget;
        }

        const anchor = getStageUniversalCharacterHowToAnchor(armature);
        const targetWidth = Math.round(Math.max(110, anchor.width * 0.58));
        const targetHeight = Math.round(Math.max(110, anchor.width * 0.58));
        const targetX = Math.min(
            anchor.stageWidth - targetWidth - 42,
            Math.round(anchor.centerX + (anchor.width * 0.92))
        );
        const targetY = Math.max(52, Math.round(anchor.topY + (anchor.height * 0.42)));

        const target = new StageObjectCtor('rectangle', {
            x: targetX,
            y: targetY,
            width: targetWidth,
            height: targetHeight,
            borderRadius: 24,
            name: 'Tutorial Target',
            fill: '#f8fafc',
            stroke: '#0f172a',
            strokeWidth: 3,
            opacity: 1
        });

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            objects.addObject(target);
            rememberStageUniversalCharacterHowToObject(state, target, 'point-target');
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        return target;
    }

    async function restoreStageUniversalCharacterHowToState(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const state = runner.context?.stageUniversalCharacterHowToState;
        if (!objects || !state) return;

        closeStageTransientUi();
        jointSystem?._stopPreview?.();
        jointSystem?._stopArmatureMovement?.(jointSystem?._currentArmature);
        jointSystem?._stopArmatureFacialMovement?.(jointSystem?._currentArmature);
        jointSystem._armatureRecordMode = Boolean(state.armatureRecordMode);
        if (jointSystem?._bodyTagActive) {
            jointSystem._exitBodyTagMode?.(true);
        }
        jointSystem._contactTargetEditorState = null;
        document.getElementById('joint-movement-picker')?.remove();
        document.getElementById('joint-pose-panel')?.remove();
        document.getElementById('joint-contact-target-panel')?.remove();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            const removableIds = new Set(state.demoObjectIds || []);
            (objects.objects || []).forEach(obj => {
                if (obj?._tutorialDemoKind === 'stage-universal-character-howto' && obj?.id) {
                    removableIds.add(obj.id);
                }
            });
            removableIds.forEach(id => {
                if (objects.getObjectById(id)) objects.removeObject(id);
            });
            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        setStagePlayheadTime(state.currentTime ?? 0);

        const viewportState = state.viewportState || null;
        if (viewportState && window.app?.stage) {
            const stage = window.app.stage;
            stage.zoom = Number.isFinite(viewportState.zoom) ? viewportState.zoom : stage.zoom;
            stage.panX = Number.isFinite(viewportState.panX) ? viewportState.panX : stage.panX;
            stage.panY = Number.isFinite(viewportState.panY) ? viewportState.panY : stage.panY;
            stage._userZoomed = viewportState.userZoomed === true;
            stage.updateZoomDisplay?.();
            stage.needsRender = true;
            stage.requestRender?.();
        }

        if (state.armaturePanelWasOpen) {
            jointSystem.openArmaturePanel?.();
            await runner._wait(180);
        } else {
            jointSystem?._teardownArmaturePanelState?.();
            document.getElementById('armature-panel')?.remove();
        }

        delete runner.context.stageUniversalCharacterHowToState;
    }

    function getStageAssembledCharacterPartBlueprint(partKey, refWidth, refHeight, label) {
        const skin = { fill: '#f0c7a3', stroke: '#8b5e3c' };
        const shirt = { fill: '#216869', stroke: '#0f4c4d' };
        const pants = { fill: '#334155', stroke: '#0f172a' };
        const shoe = { fill: '#111827', stroke: '#020617' };

        switch (partKey) {
            case 'torso':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.34), height: Math.round(refHeight * 0.32), fill: shirt.fill, stroke: shirt.stroke, strokeWidth: 2, borderRadius: 24 };
            case 'neck':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.10), height: Math.round(refHeight * 0.08), fill: skin.fill, stroke: skin.stroke, strokeWidth: 2, borderRadius: 12 };
            case 'head':
                return { type: 'circle', name: label, width: Math.round(refWidth * 0.24), height: Math.round(refHeight * 0.18), fill: skin.fill, stroke: skin.stroke, strokeWidth: 2 };
            case 'l-upper-arm':
            case 'r-upper-arm':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.10), height: Math.round(refHeight * 0.18), fill: skin.fill, stroke: skin.stroke, strokeWidth: 2, borderRadius: 16 };
            case 'l-forearm':
            case 'r-forearm':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.09), height: Math.round(refHeight * 0.18), fill: skin.fill, stroke: skin.stroke, strokeWidth: 2, borderRadius: 14 };
            case 'l-hand':
            case 'r-hand':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.10), height: Math.round(refHeight * 0.08), fill: skin.fill, stroke: skin.stroke, strokeWidth: 2, borderRadius: 14 };
            case 'l-upper-leg':
            case 'r-upper-leg':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.11), height: Math.round(refHeight * 0.20), fill: pants.fill, stroke: pants.stroke, strokeWidth: 2, borderRadius: 14 };
            case 'l-lower-leg':
            case 'r-lower-leg':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.10), height: Math.round(refHeight * 0.20), fill: pants.fill, stroke: pants.stroke, strokeWidth: 2, borderRadius: 12 };
            case 'l-foot':
            case 'r-foot':
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.12), height: Math.round(refHeight * 0.08), fill: shoe.fill, stroke: shoe.stroke, strokeWidth: 2, borderRadius: 12 };
            default:
                return { type: 'rectangle', name: label, width: Math.round(refWidth * 0.10), height: Math.round(refHeight * 0.12), fill: '#94a3b8', stroke: '#334155', strokeWidth: 2, borderRadius: 12 };
        }
    }

    function createStageAssembledTutorialPart(StageObjectCtor, blueprint, x, y) {
        const options = {
            x,
            y,
            width: blueprint.width,
            height: blueprint.height,
            name: blueprint.name,
            fill: blueprint.fill,
            stroke: blueprint.stroke,
            strokeWidth: blueprint.strokeWidth,
            opacity: 1
        };
        if (Number.isFinite(blueprint.borderRadius)) {
            options.borderRadius = blueprint.borderRadius;
        }
        return new StageObjectCtor(blueprint.type, options);
    }

    async function ensureStageAssembledCharacterWorkflowDemo(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        const JointPresetsApi = getStageJointPresetsApi();
        if (!objects || !jointSystem || !StageObjectCtor || !JointPresetsApi) return null;

        runner.context = runner.context || {};
        const state = runner.context.stageAssembledCharacterWorkflowState || {};
        if (!state.initialized) {
            state.initialized = true;
            state.priorSelectionIds = Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [];
        }
        runner.context.stageAssembledCharacterWorkflowState = state;

        const existingDemoObjects = (objects.objects || []).filter(obj => obj?._tutorialDemoKind === 'stage-assembled-character-workflow');
        if (existingDemoObjects.length >= 10) {
            state.demoObjectIds = existingDemoObjects.map(obj => obj.id);
            state.targetSelectionIds = [...state.demoObjectIds];
            await selectStageObjectIdsForTutorial(state.targetSelectionIds, runner);
            return existingDemoObjects;
        }

        const preset = JointPresetsApi.getAll().find(candidate => candidate.key === 'human-front');
        if (!preset) return null;

        const reference = getStageTutorialReferenceObject(state.priorSelectionIds);
        const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
        const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
        const refWidth = Math.max(240, Math.abs(reference?.width || 280));
        const refHeight = Math.max(500, Math.abs(reference?.height || 560));
        const centerX = reference
            ? (reference.x + (reference.width * (reference.pivotX ?? 0.5)))
            : stageWidth * 0.26;
        const topY = reference
            ? reference.y
            : Math.max(48, stageHeight * 0.12);

        const partObjects = {};
        const orderedObjects = [];
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            preset.parts.forEach(part => {
                const blueprint = getStageAssembledCharacterPartBlueprint(part.partKey, refWidth, refHeight, `Tutorial ${part.name}`);
                let x = 0;
                let y = 0;

                if (!part.parentPartKey) {
                    x = Math.round(centerX - (blueprint.width * 0.5));
                    y = Math.round(topY + (refHeight * 0.24));
                } else {
                    const parentObj = partObjects[part.parentPartKey];
                    if (!parentObj) return;
                    x = Math.round(parentObj.x + (parentObj.width * part.anchorOnParent.x) - (blueprint.width * part.pivotOnSelf.x));
                    y = Math.round(parentObj.y + (parentObj.height * part.anchorOnParent.y) - (blueprint.height * part.pivotOnSelf.y));
                }

                const obj = createStageAssembledTutorialPart(StageObjectCtor, blueprint, x, y);
                obj._tutorialDemoKind = 'stage-assembled-character-workflow';
                obj.pivotX = part.pivotOnSelf.x;
                obj.pivotY = part.pivotOnSelf.y;
                obj.bodyPartData = jointSystem._applyGlobalJointLimits
                    ? jointSystem._applyGlobalJointLimits({
                        partKey: part.partKey,
                        charType: preset.key,
                        jointName: part.name,
                        defaultAngle: part.defaultAngle
                    })
                    : {
                        partKey: part.partKey,
                        charType: preset.key,
                        jointName: part.name,
                        defaultAngle: part.defaultAngle
                    };
                jointSystem._normalizeAssemblyPartToIdleDown?.(obj, part, preset.key);

                if (part.parentPartKey) {
                    const parentObj = partObjects[part.parentPartKey];
                    obj.pinnedTo = parentObj.id;
                    obj.pinAnchorX = part.anchorOnParent?.x ?? 0.5;
                    obj.pinAnchorY = part.anchorOnParent?.y ?? 0.5;
                    obj.pinOffsetX = 0;
                    obj.pinOffsetY = 0;
                    obj.pinRotationMode = 'joint';
                    obj.pinInheritRotation = false;
                    obj.jointBaseAngle = part.defaultAngle;
                    obj.pinContour = false;
                } else {
                    obj.pinnedTo = null;
                    obj.pinRotationMode = 'static';
                    obj.jointBaseAngle = 0;
                }

                objects.addObject(obj);
                partObjects[part.partKey] = obj;
                orderedObjects.push(obj);
            });

            objects._resolvePins?.();
            const selectionOrder = ['torso', 'neck', 'head', 'r-upper-arm', 'r-forearm', 'r-hand', 'l-upper-arm', 'l-forearm', 'l-hand', 'r-upper-leg', 'r-lower-leg', 'r-foot', 'l-upper-leg', 'l-lower-leg', 'l-foot']
                .map(partKey => partObjects[partKey]?.id)
                .filter(Boolean);
            state.demoObjectIds = selectionOrder;
            state.targetSelectionIds = [...selectionOrder];
            objects.select(selectionOrder);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        const context = jointSystem._buildBodyTagContextFromObjects?.(orderedObjects);
        if (context?.objects?.length) {
            jointSystem._ensureBodyTagsForContext?.(context, preset.key, { pushHistory: false, silent: true });
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        await selectStageObjectIdsForTutorial(state.targetSelectionIds, runner);
        return orderedObjects;
    }

    async function restoreStageAssembledCharacterWorkflowState(runner) {
        const objects = window.app?.objects;
        const jointSystem = window.app?.jointSystem;
        const state = runner.context?.stageAssembledCharacterWorkflowState;
        if (!objects || !state) return;

        jointSystem?._stopPreview?.();
        if (jointSystem?._bodyTagActive) {
            jointSystem._exitBodyTagMode?.(true);
        }
        jointSystem._contactTargetEditorState = null;
        document.getElementById('joint-movement-picker')?.remove();
        document.getElementById('joint-pose-panel')?.remove();
        document.getElementById('joint-contact-target-panel')?.remove();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (state.demoObjectIds || []).forEach(id => {
                if (objects.getObjectById(id)) objects.removeObject(id);
            });
            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        objects.updateObjectList?.();
        objects.updateProperties?.();
        window.app?.stage?.requestRender?.();
        delete runner.context.stageAssembledCharacterWorkflowState;
    }

    async function expandStageJointGroup(groupId, runner) {
        const groupBody = document.getElementById(groupId);
        if (!groupBody || !groupBody.classList.contains('collapsed')) return;
        document.querySelector(`.joint-group-toggle[data-group="${groupId}"]`)?.click();
        await runner._wait(180);
    }

    function getStageTutorialEventBus() {
        return window.eventBus || (typeof eventBus !== 'undefined' ? eventBus : null);
    }

    function setStagePlayheadTime(timeMs) {
        const safeTime = Math.max(0, Number(timeMs) || 0);
        if (window.app?.animations) {
            window.app.animations.currentTime = safeTime;
        }
        const bus = getStageTutorialEventBus();
        bus?.emit?.('timeline:scrub', safeTime);
        bus?.emit?.('timeline:time', safeTime);
        window.app?.stage?.requestRender?.();
    }

    async function waitForStageCameraPanel(runner, timeoutMs = 2500) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const panel = document.querySelector('.stage-camera-panel');
            const stageCamera = window.app?.stageCamera;
            if (panel && stageCamera?._editMode) return;
            await runner._wait(120);
        }
    }

    async function prepareStageCameraWorkflowDemo(runner) {
        const app=window.app;
        app.animations.pause?.();
        runner.context = runner.context || {};
        if (!runner.context.stageCameraWorkflowState) {
            runner.context.stageCameraWorkflowState = {
                cameraKeyframes: JSON.parse(JSON.stringify(window.app?.stage?.cameraKeyframes || [])),
                cameraEnabled: window.app?.stage?.cameraEnabled !== false,
                currentTime: app.animations.currentTime || 0,
                objects: app.objects.objects,
                selection: [...app.objects.selectedIds],
                duration: app.animations.totalDuration,
                autosave: app._scheduleAutosave,
                restoring: app._isRestoringSnapshot,
                audioSync: app.audioTimeline?._syncPlaybackAt,
                suppressHistory: app.objects._suppressHistory,
                cameraTab: app.stageCamera._cameraTab,
                lastShot: app.stageCamera._lastCharacterShotId
            };
        }

        if (window.app?.stageCamera?._editMode) {
            window.app.stageCamera.exit(false);
            await runner._wait(180);
        }

        closeStageTransientUi();
        app._scheduleAutosave=()=>{};
        app._isRestoringSnapshot=true;
        if(app.audioTimeline)app.audioTimeline._syncPlaybackAt=()=>{};
        app.objects._suppressHistory=true;
        app.objects.objects=[];
        app.objects.selectedIds=[];
        app.stage.cameraKeyframes=[];
        app.animations.totalDuration=6000;
        const rig=app.jointSystem.createUniversalCharacter({view:'front',height:Math.min(360,app.stage.height*.7),linkedViews:[]});
        runner.context.stageCameraWorkflowState.subject=rig.root.id;
        app.objects.select([rig.root.id]);
        setStagePlayheadTime(0);
    }

    async function waitForCameraTutorialShot(runner) {
        const camera=window.app.stageCamera;
        const deadline=Date.now()+10000;
        while(camera._shotBusy&&Date.now()<deadline)await runner._wait(50);
        if(camera._shotBusy||!camera._characterShotEntries().length)throw Error('The tutorial camera shot could not be generated.');
    }

    async function highlightCameraTutorial(runner, tutorial, step) {
        if(step.selector&&!document.querySelector(step.selector))throw Error('Camera tutorial control is unavailable: '+step.selector);
        if(runner._shell)runner._shell.style.zIndex='21000';
        if(runner._spotlight){runner._spotlight.style.border='3px solid #38bdf8';runner._spotlight.style.borderRadius='6px';runner._spotlight.style.boxShadow='0 0 0 9999px rgba(0,0,0,.35)';}
    }

    function cameraTutorialDrag(kind) {
        const camera=window.app.stageCamera,stage=window.app.stage,frame=camera._currentEditFrame();
        const from=kind==='zoom'?{x:frame.x+frame.w,y:frame.y+frame.h}:{x:frame.x+frame.w*.35,y:frame.y+frame.h*.4};
        const to=kind==='zoom'?{x:frame.x+frame.w*.65,y:frame.y+frame.h*.65}:{x:from.x+stage.width*.15,y:from.y};
        const a=stage.stageToScreen(from.x,from.y),b=stage.stageToScreen(to.x,to.y);
        const event=(x,y)=>({clientX:x,clientY:y,button:0,preventDefault(){},stopPropagation(){}});
        return {from:a,to:b,durationMs:1200,onStart:()=>camera._onMouseDown(event(a.x,a.y)),onProgress:t=>camera._onMouseMove(event(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)),onComplete:()=>camera._onMouseUp(event(b.x,b.y))};
    }

    async function restoreStageCameraWorkflowState(runner) {
        const state = runner.context?.stageCameraWorkflowState;
        const stage = window.app?.stage;
        if (!state || !stage) return;
        window.app.animations.pause?.();
        if(window.app.stageCamera._shotBusy)await waitForCameraTutorialShot(runner);

        if (window.app?.stageCamera?._editMode) {
            window.app.stageCamera.exit(false);
            await runner._wait(120);
        }

        stage.cameraKeyframes = JSON.parse(JSON.stringify(state.cameraKeyframes || []));
        stage.cameraEnabled = state.cameraEnabled !== false;
        const app=window.app;
        app.objects.objects=state.objects;
        app.objects.select(state.selection);
        app.objects._suppressHistory=state.suppressHistory;
        app.animations.totalDuration=state.duration;
        app.stageCamera._cameraTab=state.cameraTab;
        app.stageCamera._lastCharacterShotId=state.lastShot;
        app.objects.updateObjectList?.();
        getStageTutorialEventBus()?.emit?.('camera:keyframes-changed');
        setStagePlayheadTime(state.currentTime ?? 0);
        app._scheduleAutosave=state.autosave;
        app._isRestoringSnapshot=state.restoring;
        if(app.audioTimeline)app.audioTimeline._syncPlaybackAt=state.audioSync;
        delete runner.context.stageCameraWorkflowState;
    }

    function setStagePathAnimationFieldValue(fieldId, value) {
        const element = document.getElementById(fieldId);
        if (!element) return;
        if (element.type === 'checkbox') {
            element.checked = Boolean(value);
            return;
        }
        element.value = value;
    }

    function syncStagePathAnimationRangeLabels() {
        const startValue = document.getElementById('path-start-pct')?.value || '0';
        const endValue = document.getElementById('path-end-pct')?.value || '100';
        const startLabel = document.getElementById('path-start-val');
        const endLabel = document.getElementById('path-end-val');
        if (startLabel) startLabel.textContent = `${startValue}%`;
        if (endLabel) endLabel.textContent = `${endValue}%`;
    }

    async function waitForStagePathAnimationTargets(runner, timeoutMs = 2500) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const builder = document.getElementById('path-anim-builder');
            const pathTag = document.getElementById('path-shape-name');
            const moverTag = document.getElementById('path-mover-name');
            const builderVisible = Boolean(builder && builder.offsetParent !== null);
            const pathReady = Boolean(pathTag && !pathTag.classList.contains('hidden'));
            const moverReady = Boolean(moverTag && !moverTag.classList.contains('hidden'));
            if (builderVisible && pathReady && moverReady) return;
            await runner._wait(120);
        }
    }

    async function ensureStagePathAnimationWorkflowDemo(runner) {
        const objects = window.app?.objects;
        const pathAnimation = window.app?.pathAnimation;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !pathAnimation || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stagePathAnimationWorkflowState) {
            runner.context.stagePathAnimationWorkflowState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                pathShapeId: pathAnimation.pathShapeId || null,
                moverId: pathAnimation.moverId || null,
                startPct: document.getElementById('path-start-pct')?.value || '0',
                endPct: document.getElementById('path-end-pct')?.value || '100',
                duration: document.getElementById('path-duration')?.value || '2',
                speed: document.getElementById('path-speed')?.value || '1',
                easing: document.getElementById('path-easing')?.value || 'easeInOut',
                alignRotation: document.getElementById('path-align-rotation')?.checked || false,
                reverseDirection: document.getElementById('path-reverse-direction')?.checked || false,
                timelineStart: document.getElementById('path-timeline-start')?.value || 'after-previous',
                timelineDelay: document.getElementById('path-timeline-delay')?.value || '0',
                timelineBegin: document.getElementById('path-timeline-begin')?.value || '',
                timelineEnd: document.getElementById('path-timeline-end')?.value || '',
                referenceObjectId: document.getElementById('path-timeline-reference-object')?.value || '',
                referenceRelation: document.getElementById('path-timeline-reference-relation')?.value || 'after-reference'
            };
        }

        let pathObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-path-animation-workflow-path') || null;
        let moverObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-path-animation-workflow-mover') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;

        try {
            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;

            if (!pathObject) {
                pathObject = new StageObjectCtor('circle', {
                    x: Math.round(stageWidth * 0.18),
                    y: Math.round(stageHeight * 0.2),
                    width: Math.round(stageWidth * 0.26),
                    height: Math.round(stageHeight * 0.22),
                    name: 'Tutorial Motion Path',
                    fill: 'rgba(16, 185, 129, 0.12)',
                    stroke: '#10b981',
                    strokeWidth: 3,
                    opacity: 1
                });
                pathObject._tutorialDemoKind = 'stage-path-animation-workflow-path';
                objects.addObject(pathObject);
            }

            if (!moverObject) {
                moverObject = new StageObjectCtor('rectangle', {
                    x: pathObject.x + pathObject.width - 36,
                    y: pathObject.y + Math.round(pathObject.height * 0.48),
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    name: 'Tutorial Mover',
                    fill: '#f59e0b',
                    stroke: '#7c2d12',
                    strokeWidth: 2,
                    opacity: 1
                });
                moverObject._tutorialDemoKind = 'stage-path-animation-workflow-mover';
                objects.addObject(moverObject);
            }

            objects.select([moverObject.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        pathAnimation.cancelSnapPick?.();
        pathAnimation.cancelPick?.();
        pathAnimation.pathShapeId = pathObject?.id || null;
        pathAnimation.moverId = moverObject?.id || null;
        setStagePathAnimationFieldValue('path-start-pct', '0');
        setStagePathAnimationFieldValue('path-end-pct', '100');
        setStagePathAnimationFieldValue('path-duration', '1.6');
        setStagePathAnimationFieldValue('path-speed', '1');
        setStagePathAnimationFieldValue('path-easing', 'easeInOut');
        setStagePathAnimationFieldValue('path-align-rotation', true);
        setStagePathAnimationFieldValue('path-reverse-direction', false);
        setStagePathAnimationFieldValue('path-timeline-start', 'after-previous');
        setStagePathAnimationFieldValue('path-timeline-delay', '0');
        setStagePathAnimationFieldValue('path-timeline-begin', '');
        setStagePathAnimationFieldValue('path-timeline-end', '');
        setStagePathAnimationFieldValue('path-timeline-reference-object', '');
        setStagePathAnimationFieldValue('path-timeline-reference-relation', 'after-reference');
        syncStagePathAnimationRangeLabels();
        pathAnimation.updateUI?.();
        window.app?.stage?.requestRender?.();

        await waitForStagePathAnimationTargets(runner);
        return { pathObject, moverObject };
    }

    async function restoreStagePathAnimationWorkflowState(runner) {
        const objects = window.app?.objects;
        const pathAnimation = window.app?.pathAnimation;
        const state = runner.context?.stagePathAnimationWorkflowState;
        if (!objects || !pathAnimation || !state) return;

        pathAnimation.cancelSnapPick?.();
        pathAnimation.cancelPick?.();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => ['stage-path-animation-workflow-path', 'stage-path-animation-workflow-mover'].includes(obj?._tutorialDemoKind))
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        pathAnimation.pathShapeId = state.pathShapeId && objects.getObjectById(state.pathShapeId)
            ? state.pathShapeId
            : null;
        pathAnimation.moverId = state.moverId && objects.getObjectById(state.moverId)
            ? state.moverId
            : null;
        setStagePathAnimationFieldValue('path-start-pct', state.startPct || '0');
        setStagePathAnimationFieldValue('path-end-pct', state.endPct || '100');
        setStagePathAnimationFieldValue('path-duration', state.duration || '2');
        setStagePathAnimationFieldValue('path-speed', state.speed || '1');
        setStagePathAnimationFieldValue('path-easing', state.easing || 'easeInOut');
        setStagePathAnimationFieldValue('path-align-rotation', state.alignRotation);
        setStagePathAnimationFieldValue('path-reverse-direction', state.reverseDirection);
        setStagePathAnimationFieldValue('path-timeline-start', state.timelineStart || 'after-previous');
        setStagePathAnimationFieldValue('path-timeline-delay', state.timelineDelay || '0');
        setStagePathAnimationFieldValue('path-timeline-begin', state.timelineBegin || '');
        setStagePathAnimationFieldValue('path-timeline-end', state.timelineEnd || '');
        setStagePathAnimationFieldValue('path-timeline-reference-object', state.referenceObjectId || '');
        setStagePathAnimationFieldValue('path-timeline-reference-relation', state.referenceRelation || 'after-reference');
        syncStagePathAnimationRangeLabels();
        pathAnimation.updateUI?.();
        window.app?.stage?.requestRender?.();
        delete runner.context.stagePathAnimationWorkflowState;
    }

    async function waitForStageAppliedAnimation(runner, timeoutMs = 3000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const selected = window.app?.objects?.getSelectedObjects?.() || [];
            const appliedItem = document.querySelector('#applied-anim-list .applied-anim-item');
            if (selected.length === 1 && (selected[0]?.animations || []).length > 0 && appliedItem) return;
            await runner._wait(120);
        }
    }

    function setStageOnionSkinState(state) {
        const onionSkin = window.app?.onionSkin;
        if (!onionSkin || !state) return;

        onionSkin.enabled = Boolean(state.enabled);
        if (Number.isFinite(state.framesBefore)) onionSkin.framesBefore = state.framesBefore;
        if (Number.isFinite(state.framesAfter)) onionSkin.framesAfter = state.framesAfter;
        if (Number.isFinite(state.stepMs)) onionSkin.stepMs = state.stepMs;
        if (Number.isFinite(state.opacityMax)) onionSkin.opacityMax = state.opacityMax;
        if (typeof state.tintEnabled === 'boolean') onionSkin.tintEnabled = state.tintEnabled;

        onionSkin._save?.();
        onionSkin._syncToggleButton?.();
        window.app?.stage?.requestRender?.();
    }

    async function ensureStagePowerFeaturesWorkflowDemo(runner, options = {}) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const onionSkin = window.app?.onionSkin;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stagePowerFeaturesWorkflowState) {
            runner.context.stagePowerFeaturesWorkflowState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                currentTime: animations.currentTime || 0,
                symbols: window.app?.symbols?.toJSON?.() || null,
                onionSkin: onionSkin ? {
                    enabled: Boolean(onionSkin.enabled),
                    framesBefore: onionSkin.framesBefore,
                    framesAfter: onionSkin.framesAfter,
                    stepMs: onionSkin.stepMs,
                    opacityMax: onionSkin.opacityMax,
                    tintEnabled: Boolean(onionSkin.tintEnabled)
                } : null
            };
        }

        closeStageTransientUi();

        let demoObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-power-features-workflow') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;

        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-power-features-workflow' && obj.id !== demoObject?.id)
                .forEach(obj => objects.removeObject(obj.id));

            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const config = {
                x: Math.round(stageWidth * 0.18),
                y: Math.round(stageHeight * 0.28),
                width: Math.round(stageWidth * 0.18),
                height: 96,
                borderRadius: 22,
                name: 'Tutorial Motion Badge',
                fill: '#0f766e',
                stroke: '#0f172a',
                strokeWidth: 2,
                opacity: 1,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                ...options
            };

            if (!demoObject) {
                demoObject = new StageObjectCtor('rectangle', config);
                demoObject._tutorialDemoKind = 'stage-power-features-workflow';
                objects.addObject(demoObject);
            }

            demoObject.x = config.x;
            demoObject.y = config.y;
            demoObject.width = config.width;
            demoObject.height = config.height;
            demoObject.borderRadius = config.borderRadius;
            demoObject.name = config.name;
            demoObject.fill = config.fill;
            demoObject.stroke = config.stroke;
            demoObject.strokeWidth = config.strokeWidth;
            demoObject.opacity = config.opacity;
            demoObject.rotation = config.rotation;
            demoObject.scaleX = config.scaleX;
            demoObject.scaleY = config.scaleY;
            delete demoObject.expressions;
            demoObject.animations = [];
            objects.select([demoObject.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations._clearReapplyMode?.();
        animations.updateAppliedAnimationsList?.();
        animations.updateCodeOutput?.();
        if (runner.context.stagePowerFeaturesWorkflowState.onionSkin) {
            setStageOnionSkinState({
                ...runner.context.stagePowerFeaturesWorkflowState.onionSkin,
                enabled: false
            });
        }

        const easingField = document.getElementById('param-easing');
        if (easingField && easingField.value !== 'custom') {
            delete easingField.dataset.bezier;
        }

        setStagePlayheadTime(0);
        await runner._wait(180);
        return demoObject;
    }

    async function ensureStagePowerFeaturesAnimatedDemo(runner, options = {}) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations) return null;

        const primary = await ensureStagePowerFeaturesWorkflowDemo(runner, options.primary || {});
        if (!primary) return null;

        const companionKind = 'stage-power-features-workflow-companion';
        let companion = null;
        if (options.includeCompanion && StageObjectCtor) {
            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const companionConfig = {
                x: Math.round(stageWidth * 0.42),
                y: Math.round(stageHeight * 0.48),
                width: 112,
                height: 112,
                borderRadius: 28,
                name: 'Tutorial Timing Badge',
                fill: '#38bdf8',
                stroke: '#0f172a',
                strokeWidth: 3,
                opacity: 1,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                ...(options.companion || {})
            };

            const previousSuppressHistory = Boolean(objects._suppressHistory);
            objects._suppressHistory = true;
            try {
                companion = (objects.objects || []).find(obj => obj?._tutorialDemoKind === companionKind) || null;
                (objects.objects || [])
                    .filter(obj => obj?._tutorialDemoKind === companionKind && obj.id !== companion?.id)
                    .forEach(obj => objects.removeObject(obj.id));

                if (!companion) {
                    companion = new StageObjectCtor('rectangle', companionConfig);
                    companion._tutorialDemoKind = companionKind;
                    objects.addObject(companion);
                }

                companion.x = companionConfig.x;
                companion.y = companionConfig.y;
                companion.width = companionConfig.width;
                companion.height = companionConfig.height;
                companion.borderRadius = companionConfig.borderRadius;
                companion.name = companionConfig.name;
                companion.fill = companionConfig.fill;
                companion.stroke = companionConfig.stroke;
                companion.strokeWidth = companionConfig.strokeWidth;
                companion.opacity = companionConfig.opacity;
                companion.rotation = companionConfig.rotation;
                companion.scaleX = companionConfig.scaleX;
                companion.scaleY = companionConfig.scaleY;
                delete companion.expressions;
                companion.animations = [];
            } finally {
                objects._suppressHistory = previousSuppressHistory;
            }
        } else {
            const previousSuppressHistory = Boolean(objects._suppressHistory);
            objects._suppressHistory = true;
            try {
                (objects.objects || [])
                    .filter(obj => obj?._tutorialDemoKind === companionKind)
                    .forEach(obj => objects.removeObject(obj.id));
            } finally {
                objects._suppressHistory = previousSuppressHistory;
            }
        }

        const selectionIds = [primary.id];
        if (companion?.id) selectionIds.push(companion.id);
        objects.select(selectionIds);
        objects.updateObjectList?.();
        objects.updateProperties?.();

        closeStageTransientUi();
        animations._clearReapplyMode?.();
        animations.selectAnimation?.('linear-move');
        document.querySelectorAll('.anim-btn').forEach(button => button.classList.remove('selected'));
        document.querySelector('.anim-btn[data-anim="linear-move"]')?.classList.add('selected');

        const duration = Number.isFinite(options.duration) ? options.duration : 1.6;
        const durationField = document.getElementById('param-duration');
        if (durationField) {
            durationField.value = String(duration);
            durationField.dispatchEvent(new Event('input', { bubbles: true }));
            durationField.dispatchEvent(new Event('change', { bubbles: true }));
        }

        animations.applySelectedAnimation?.();
        await waitForStageAppliedAnimation(runner);
        setStagePlayheadTime(Number.isFinite(options.previewTimeMs) ? options.previewTimeMs : 800);
        await runner._wait(180);

        return { primary, companion, selectionIds };
    }

    async function ensureStageExpressionsWorkflowDemo(runner) {
        const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
        const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
        const demoObject = await ensureStagePowerFeaturesWorkflowDemo(runner, {
            x: Math.round(stageWidth * 0.2),
            y: Math.round(stageHeight * 0.36),
            width: 132,
            height: 132,
            borderRadius: 999,
            name: 'Tutorial Expression Wheel',
            fill: '#f59e0b',
            stroke: '#0f172a',
            strokeWidth: 4,
            opacity: 1,
            rotation: 0
        });

        window.app?.objects?.updateObjectList?.();
        window.app?.objects?.updateProperties?.();
        window.app?.stage?.requestRender?.();
        return demoObject;
    }

    async function previewStageExpressionsWorkflowDemo(runner, demoObject = null) {
        const stage = window.app?.stage;
        const target = demoObject
            || (window.app?.objects?.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-power-features-workflow')
            || null;
        if (!stage || !target) return null;

        const startX = Number.isFinite(target.x) ? target.x : Math.round((stage.width || 1280) * 0.2);
        const positions = [startX, startX + 130, startX + 250, startX + 80];
        for (const x of positions) {
            target.x = x;
            stage.requestRender?.();
            await runner._wait(220);
        }

        return target;
    }

    async function restoreStagePowerFeaturesWorkflowState(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const symbols = window.app?.symbols;
        const state = runner.context?.stagePowerFeaturesWorkflowState;
        if (!objects || !state) return;

        closeStageTransientUi();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-power-features-workflow' || obj?._tutorialDemoKind === 'stage-power-features-workflow-companion')
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        if (state.symbols && typeof symbols?.fromJSON === 'function') {
            symbols.fromJSON(state.symbols);
        }

        animations?._clearReapplyMode?.();
        animations?.updateAppliedAnimationsList?.();
        animations?.updateCodeOutput?.();
        if (state.onionSkin) {
            setStageOnionSkinState(state.onionSkin);
        }
        setStagePlayheadTime(state.currentTime ?? 0);
        delete runner.context.stagePowerFeaturesWorkflowState;
    }

    async function ensureStageObjectAnimationHowToDemo(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stageObjectAnimationHowToState) {
            runner.context.stageObjectAnimationHowToState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                currentTime: animations.currentTime || 0
            };
        }

        closeStageTransientUi();

        let demoObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-object-animation-howto') || null;
        let companionObject = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-object-animation-howto-companion') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;

        try {
            (objects.objects || [])
                .filter(obj => ['stage-object-animation-howto', 'stage-object-animation-howto-companion'].includes(obj?._tutorialDemoKind)
                    && obj.id !== demoObject?.id
                    && obj.id !== companionObject?.id)
                .forEach(obj => objects.removeObject(obj.id));

            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;

            if (!demoObject) {
                demoObject = new StageObjectCtor('rectangle', {
                    x: Math.round(stageWidth * 0.34),
                    y: Math.round(stageHeight * 0.32),
                    width: 220,
                    height: 140,
                    borderRadius: 20,
                    name: 'Tutorial Entry Demo',
                    fill: '#f97316',
                    stroke: '#7c2d12',
                    strokeWidth: 3,
                    opacity: 1
                });
                demoObject._tutorialDemoKind = 'stage-object-animation-howto';
                objects.addObject(demoObject);
            }

            if (!companionObject) {
                companionObject = new StageObjectCtor('rectangle', {
                    x: Math.round(stageWidth * 0.57),
                    y: Math.round(stageHeight * 0.22),
                    width: 170,
                    height: 104,
                    borderRadius: 18,
                    name: 'Tutorial Supporting Card',
                    fill: '#38bdf8',
                    stroke: '#0f172a',
                    strokeWidth: 3,
                    opacity: 0.92
                });
                companionObject._tutorialDemoKind = 'stage-object-animation-howto-companion';
                objects.addObject(companionObject);
            }

            demoObject.x = Math.round(stageWidth * 0.32);
            demoObject.y = Math.round(stageHeight * 0.34);
            demoObject.width = 220;
            demoObject.height = 140;
            demoObject.borderRadius = 20;
            demoObject.name = 'Tutorial Entry Demo';
            demoObject.fill = '#f97316';
            demoObject.stroke = '#7c2d12';
            demoObject.strokeWidth = 3;
            demoObject.opacity = 1;
            demoObject.animations = [];

            companionObject.x = Math.round(stageWidth * 0.57);
            companionObject.y = Math.round(stageHeight * 0.22);
            companionObject.width = 170;
            companionObject.height = 104;
            companionObject.borderRadius = 18;
            companionObject.name = 'Tutorial Supporting Card';
            companionObject.fill = '#38bdf8';
            companionObject.stroke = '#0f172a';
            companionObject.strokeWidth = 3;
            companionObject.opacity = 0.92;
            companionObject.animations = [];

            const allDemoObjects = [demoObject, companionObject].filter(Boolean);
            const minX = Math.min(...allDemoObjects.map(obj => obj.x)) - 60;
            const minY = Math.min(...allDemoObjects.map(obj => obj.y)) - 60;
            const maxX = Math.max(...allDemoObjects.map(obj => obj.x + obj.width)) + 60;
            const maxY = Math.max(...allDemoObjects.map(obj => obj.y + obj.height)) + 60;
            runner.context.stageObjectAnimationHowToState.focusBounds = {
                x: Math.max(0, minX),
                y: Math.max(0, minY),
                width: Math.max(240, maxX - minX),
                height: Math.max(180, maxY - minY)
            };

            objects.select([demoObject.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations._clearReapplyMode?.();
        animations.updateAppliedAnimationsList?.();
        animations.updateCodeOutput?.();
        setStagePlayheadTime(0);
        window.app?.stage?.requestRender?.();
        await runner._wait(180);
        return demoObject;
    }

    async function ensureStagePreviewWindowHowToDemo(runner) {
        const demoObject = await ensureStageObjectAnimationHowToDemo(runner);
        const animations = window.app?.animations;
        if (!demoObject || !animations) return demoObject;

        closeStageTransientUi();
        animations._clearReapplyMode?.();
        animations.selectAnimation?.('linear-move');
        document.querySelectorAll('.anim-btn').forEach(button => button.classList.remove('selected'));
        document.querySelector('.anim-btn[data-anim="linear-move"]')?.classList.add('selected');

        const durationField = document.getElementById('param-duration');
        if (durationField) {
            durationField.value = '1.4';
            durationField.dispatchEvent(new Event('input', { bubbles: true }));
            durationField.dispatchEvent(new Event('change', { bubbles: true }));
        }

        animations.applySelectedAnimation?.();
        await waitForStageAppliedAnimation(runner);
        animations.updateAppliedAnimationsList?.();
        animations.updateCodeOutput?.();
        setStagePlayheadTime(0);
        window.app?.stage?.requestRender?.();
        await runner._wait(180);
        return demoObject;
    }

    async function restoreStageObjectAnimationHowToState(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const state = runner.context?.stageObjectAnimationHowToState;
        if (!objects || !state) return;

        closeStageTransientUi();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => ['stage-object-animation-howto', 'stage-object-animation-howto-companion'].includes(obj?._tutorialDemoKind))
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations?._clearReapplyMode?.();
        animations?.updateAppliedAnimationsList?.();
        animations?.updateCodeOutput?.();
        setStagePlayheadTime(state.currentTime ?? 0);
        delete runner.context.stageObjectAnimationHowToState;
    }

    // --- Bouncing-ball how-to demo ------------------------------------------------------------
    async function ensureStageBouncingBallHowToDemo(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stageBouncingBallHowToState) {
            runner.context.stageBouncingBallHowToState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                currentTime: animations.currentTime || 0
            };
        }

        closeStageTransientUi();

        let ball = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-bouncing-ball-howto') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-bouncing-ball-howto' && obj.id !== ball?.id)
                .forEach(obj => objects.removeObject(obj.id));

            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const diameter = 120;

            if (!ball) {
                ball = new StageObjectCtor('circle', {
                    x: Math.round(stageWidth * 0.18),
                    y: Math.round(stageHeight * 0.18),
                    width: diameter,
                    height: diameter,
                    name: 'Tutorial Bouncing Ball',
                    fill: '#ef4444',
                    stroke: '#7f1d1d',
                    strokeWidth: 3,
                    opacity: 1
                });
                ball._tutorialDemoKind = 'stage-bouncing-ball-howto';
                objects.addObject(ball);
            }

            ball.animations = [];
            objects.select([ball.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations._clearReapplyMode?.();
        animations.updateAppliedAnimationsList?.();
        animations.updateCodeOutput?.();
        setStagePlayheadTime(0);
        window.app?.stage?.requestRender?.();
        await runner._wait(180);
        return ball;
    }

    async function restoreStageBouncingBallHowToState(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const state = runner.context?.stageBouncingBallHowToState;
        if (!objects || !state) return;

        closeStageTransientUi();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-bouncing-ball-howto')
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations?._clearReapplyMode?.();
        animations?.updateAppliedAnimationsList?.();
        animations?.updateCodeOutput?.();
        setStagePlayheadTime(state.currentTime ?? 0);
        delete runner.context.stageBouncingBallHowToState;
    }

    // --- Kinetic title card how-to demo ------------------------------------------------------
    async function ensureStageKineticTitleHowToDemo(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stageKineticTitleHowToState) {
            runner.context.stageKineticTitleHowToState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                currentTime: animations.currentTime || 0
            };
        }

        closeStageTransientUi();

        let title = (objects.objects || []).find(obj => obj?._tutorialDemoKind === 'stage-kinetic-title-howto') || null;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-kinetic-title-howto' && obj.id !== title?.id)
                .forEach(obj => objects.removeObject(obj.id));

            const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
            const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
            const titleWidth = Math.round(stageWidth * 0.55);
            const titleHeight = 92;

            if (!title) {
                title = new StageObjectCtor('text', {
                    x: Math.round((stageWidth - titleWidth) / 2),
                    y: Math.round(stageHeight * 0.38),
                    width: titleWidth,
                    height: titleHeight,
                    text: 'YOUR BIG IDEA',
                    textColor: '#fafafa',
                    fontSize: 64,
                    fontFamily: 'Inter, Arial, sans-serif',
                    fontWeight: '800',
                    textAlign: 'center',
                    name: 'Tutorial Kinetic Title'
                });
                title._tutorialDemoKind = 'stage-kinetic-title-howto';
                objects.addObject(title);
            }

            title.animations = [];
            objects.select([title.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations._clearReapplyMode?.();
        animations.updateAppliedAnimationsList?.();
        animations.updateCodeOutput?.();
        setStagePlayheadTime(0);
        window.app?.stage?.requestRender?.();
        await runner._wait(180);
        return title;
    }

    async function restoreStageKineticTitleHowToState(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const state = runner.context?.stageKineticTitleHowToState;
        if (!objects || !state) return;

        closeStageTransientUi();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-kinetic-title-howto')
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations?._clearReapplyMode?.();
        animations?.updateAppliedAnimationsList?.();
        animations?.updateCodeOutput?.();
        setStagePlayheadTime(state.currentTime ?? 0);
        delete runner.context.stageKineticTitleHowToState;
    }

    // --- Camera push-in cleanup helper -------------------------------------------------------
    async function resetStageCameraToFullView(runner) {
        const stage = window.app?.stage;
        if (!stage) return;
        try {
            stage.centerStage?.();
        } catch (_err) {
            // centerStage is sometimes flaky on quick teardown; ignore and let next tutorial reset it.
        }
        stage.needsRender = true;
        stage.requestRender?.();
        await runner._wait(160);
    }

    // --- Before/After split-reveal how-to demo -----------------------------------------------
    async function ensureStageBeforeAfterHowToDemo(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const stage = window.app?.stage;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations || !stage || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stageBeforeAfterHowToState) {
            runner.context.stageBeforeAfterHowToState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                currentTime: animations.currentTime || 0
            };
        }

        closeStageTransientUi();

        const stageWidth = stage.width || stage.canvas?.width || 1280;
        const stageHeight = stage.height || stage.canvas?.height || 720;
        const gap = 32;
        const panelWidth = Math.round((stageWidth - gap * 3) / 2);
        const panelHeight = Math.round(stageHeight * 0.55);
        const panelY = Math.round((stageHeight - panelHeight) / 2);
        const labelHeight = 56;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        const panels = {};
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-before-after-howto')
                .forEach(obj => objects.removeObject(obj.id));

            const beforePanel = new StageObjectCtor('rectangle', {
                x: gap,
                y: panelY,
                width: panelWidth,
                height: panelHeight,
                name: 'Tutorial Before Panel',
                fill: '#475569',
                stroke: '#0f172a',
                strokeWidth: 3,
                borderRadius: 18,
                opacity: 1
            });
            beforePanel._tutorialDemoKind = 'stage-before-after-howto';
            beforePanel._tutorialDemoKey = 'before-panel';
            objects.addObject(beforePanel);
            panels.before = beforePanel;

            const beforeLabel = new StageObjectCtor('text', {
                x: gap,
                y: panelY + Math.round(panelHeight / 2) - Math.round(labelHeight / 2),
                width: panelWidth,
                height: labelHeight,
                text: 'BEFORE',
                textColor: '#f8fafc',
                fontSize: 48,
                fontFamily: 'Inter, Arial, sans-serif',
                fontWeight: '800',
                textAlign: 'center',
                name: 'Tutorial Before Label'
            });
            beforeLabel._tutorialDemoKind = 'stage-before-after-howto';
            beforeLabel._tutorialDemoKey = 'before-label';
            objects.addObject(beforeLabel);

            const afterPanel = new StageObjectCtor('rectangle', {
                x: gap * 2 + panelWidth,
                y: panelY,
                width: panelWidth,
                height: panelHeight,
                name: 'Tutorial After Panel',
                fill: '#16a34a',
                stroke: '#14532d',
                strokeWidth: 3,
                borderRadius: 18,
                opacity: 1
            });
            afterPanel._tutorialDemoKind = 'stage-before-after-howto';
            afterPanel._tutorialDemoKey = 'after-panel';
            objects.addObject(afterPanel);
            panels.after = afterPanel;

            const afterLabel = new StageObjectCtor('text', {
                x: gap * 2 + panelWidth,
                y: panelY + Math.round(panelHeight / 2) - Math.round(labelHeight / 2),
                width: panelWidth,
                height: labelHeight,
                text: 'AFTER',
                textColor: '#f8fafc',
                fontSize: 48,
                fontFamily: 'Inter, Arial, sans-serif',
                fontWeight: '800',
                textAlign: 'center',
                name: 'Tutorial After Label'
            });
            afterLabel._tutorialDemoKind = 'stage-before-after-howto';
            afterLabel._tutorialDemoKey = 'after-label';
            objects.addObject(afterLabel);

            [beforePanel, afterPanel].forEach(p => { p.animations = []; });
            objects.select([beforePanel.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations._clearReapplyMode?.();
        animations.updateAppliedAnimationsList?.();
        animations.updateCodeOutput?.();
        setStagePlayheadTime(0);
        stage.requestRender?.();
        await runner._wait(180);
        return panels;
    }

    async function selectStageBeforeAfterPanel(runner, which) {
        const objects = window.app?.objects;
        if (!objects) return;
        const panel = (objects.objects || []).find(obj => obj?._tutorialDemoKey === `${which}-panel`);
        if (!panel) return;
        objects.select([panel.id]);
        await runner._wait(160);
    }

    async function restoreStageBeforeAfterHowToState(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const state = runner.context?.stageBeforeAfterHowToState;
        if (!objects || !state) return;

        closeStageTransientUi();

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-before-after-howto')
                .forEach(obj => objects.removeObject(obj.id));

            const validSelection = (state.priorSelectionIds || []).filter(id => objects.getObjectById(id));
            objects.select(validSelection);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        animations?._clearReapplyMode?.();
        animations?.updateAppliedAnimationsList?.();
        animations?.updateCodeOutput?.();
        setStagePlayheadTime(state.currentTime ?? 0);
        delete runner.context.stageBeforeAfterHowToState;
    }

    // --- Character pose application helper (for sit / crouch / pickup beats) -----------------
    async function applyStageUniversalCharacterPose(runner, poseKey, armatureOverride = null) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem || !poseKey) return false;
        const armature = getStageUniversalCharacterHowToLiveArmature(runner, armatureOverride);
        if (!armature?.root) return false;
        const catalog = jointSystem._getActiveArmaturePoseCatalog?.(armature) || {};
        // Try the requested key first, then common side / front fallbacks so the helper works
        // regardless of which catalog the armature happens to use.
        const candidates = [poseKey, `${poseKey}-side`, poseKey.replace(/-side$/, ''), 'idle'];
        let pose = null;
        for (const key of candidates) {
            if (key && catalog[key]) { pose = catalog[key]; break; }
        }
        if (!pose) return false;
        try {
            jointSystem._stopArmatureMovement?.(armature);
            jointSystem._captureArmatureStageBasePosition?.(armature);
            jointSystem._applyArmaturePose?.(armature, pose);
            jointSystem._updateArmaturePanelPlayState?.(armature);
        } catch (_err) {
            return false;
        }
        window.app?.stage?.requestRender?.();
        await runner._wait(180);
        return true;
    }

    // --- Chair prop helper (for sit-down how-to) ---------------------------------------------
    async function ensureStageChairHowToDemo(runner, options = {}) {
        const objects = window.app?.objects;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !StageObjectCtor) return null;

        const armature = getStageUniversalCharacterHowToLiveArmature(runner);
        if (!armature?.root) return null;

        const baseX = Number.isFinite(armature.root.x) ? armature.root.x : 0;
        const baseY = Number.isFinite(armature.root.y) ? armature.root.y : 0;
        const armWidth = Math.abs(armature.root.width || 120);
        const armHeight = Math.abs(armature.root.height || 240);
        const chairWidth = Math.round(armWidth * 1.05);
        const chairSeatHeight = Math.round(armHeight * 0.10);
        const chairBackHeight = Math.round(armHeight * 0.48);
        const chairOffsetX = Number.isFinite(options.offsetX) ? options.offsetX : Math.round(armWidth * 1.8);
        const seatX = baseX + chairOffsetX;
        // Place the seat near hip height so the seated pose lands convincingly on top of it.
        const seatY = Number.isFinite(options.seatY) ? options.seatY : baseY + Math.round(armHeight * 0.62);
        const backY = seatY - chairBackHeight;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        let seat = null;
        let back = null;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-chair-howto')
                .forEach(obj => objects.removeObject(obj.id));

            back = new StageObjectCtor('rectangle', {
                x: seatX,
                y: backY,
                width: Math.round(chairWidth * 0.22),
                height: chairBackHeight,
                name: 'Tutorial Chair Back',
                fill: '#7c2d12',
                stroke: '#431407',
                strokeWidth: 3,
                borderRadius: 4,
                opacity: 1
            });
            back._tutorialDemoKind = 'stage-chair-howto';
            objects.addObject(back);

            seat = new StageObjectCtor('rectangle', {
                x: seatX,
                y: seatY,
                width: chairWidth,
                height: chairSeatHeight,
                name: 'Tutorial Chair Seat',
                fill: '#9a3412',
                stroke: '#431407',
                strokeWidth: 3,
                borderRadius: 4,
                opacity: 1
            });
            seat._tutorialDemoKind = 'stage-chair-howto';
            objects.addObject(seat);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        window.app?.stage?.requestRender?.();
        await runner._wait(160);
        return { seat, back, chairOffsetX };
    }

    async function restoreStageChairHowToState(runner) {
        const objects = window.app?.objects;
        if (!objects) return;
        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-chair-howto')
                .forEach(obj => objects.removeObject(obj.id));
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }
        window.app?.stage?.requestRender?.();
        await runner._wait(120);
    }

    // --- Rolling-ball helper (for roll-across-stage how-to) ----------------------------------
    async function ensureStageRollingBallHowToDemo(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        const stage = window.app?.stage;
        const StageObjectCtor = window.StageObject || (typeof StageObject !== 'undefined' ? StageObject : null);
        if (!objects || !animations || !stage || !StageObjectCtor) return null;

        runner.context = runner.context || {};
        if (!runner.context.stageRollingBallHowToState) {
            runner.context.stageRollingBallHowToState = {
                priorSelectionIds: Array.isArray(objects.selectedIds) ? [...objects.selectedIds] : [],
                currentTime: animations.currentTime || 0
            };
        }

        closeStageTransientUi();

        const stageWidth = stage.width || stage.canvas?.width || 1280;
        const stageHeight = stage.height || stage.canvas?.height || 720;
        const ballSize = Math.round(Math.min(stageWidth, stageHeight) * 0.10);
        const ballX = Math.round(stageWidth * 0.12);
        const ballY = Math.round(stageHeight * 0.62);

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        let ball = null;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-rolling-ball-howto')
                .forEach(obj => objects.removeObject(obj.id));

            ball = new StageObjectCtor('circle', {
                x: ballX,
                y: ballY,
                width: ballSize,
                height: ballSize,
                name: 'Rolling Ball',
                fill: '#ef4444',
                stroke: '#7f1d1d',
                strokeWidth: 3,
                opacity: 1
            });
            ball._tutorialDemoKind = 'stage-rolling-ball-howto';
            objects.addObject(ball);
            objects.select([ball.id]);
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        window.app?.stage?.requestRender?.();
        await runner._wait(180);
        return ball;
    }

    async function restoreStageRollingBallHowToState(runner) {
        const objects = window.app?.objects;
        const animations = window.app?.animations;
        if (!objects) return;
        const state = runner.context?.stageRollingBallHowToState || null;

        const previousSuppressHistory = Boolean(objects._suppressHistory);
        objects._suppressHistory = true;
        try {
            (objects.objects || [])
                .filter(obj => obj?._tutorialDemoKind === 'stage-rolling-ball-howto')
                .forEach(obj => objects.removeObject(obj.id));
        } finally {
            objects._suppressHistory = previousSuppressHistory;
        }

        if (state) {
            objects.select(state.priorSelectionIds || []);
            animations?._clearReapplyMode?.();
            animations?.updateAppliedAnimationsList?.();
            animations?.updateCodeOutput?.();
            setStagePlayheadTime(state.currentTime ?? 0);
            delete runner.context.stageRollingBallHowToState;
        }
        window.app?.stage?.requestRender?.();
        await runner._wait(120);
    }

    function buildStageDemoBeatWavFile(durationSec, frequency) {
        const sampleRate = 22050;
        const totalSamples = Math.max(1, Math.floor(sampleRate * (durationSec || 4)));
        const dataBytes = totalSamples * 2;
        const buffer = new ArrayBuffer(44 + dataBytes);
        const view = new DataView(buffer);
        const writeStr = (off, s) => {
            for (let i = 0; i < s.length; i += 1) view.setUint8(off + i, s.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataBytes, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, dataBytes, true);

        const beatInterval = 0.5;
        const freq = frequency || 220;
        for (let i = 0; i < totalSamples; i += 1) {
            const t = i / sampleRate;
            const phase = (t % beatInterval) / beatInterval;
            const env = Math.exp(-phase * 6);
            const tone = Math.sin(2 * Math.PI * freq * t);
            const sample = Math.max(-1, Math.min(1, tone * env * 0.55));
            view.setInt16(44 + i * 2, Math.round(sample * 0x7FFF), true);
        }
        return new File([buffer], 'tutorial-beat.wav', { type: 'audio/wav' });
    }

    async function seedStageDemoSoundtrack(runner, options) {
        const audioTimeline = window.app?.audioTimeline;
        if (!audioTimeline || typeof audioTimeline.loadAudioFile !== 'function') return false;
        runner.context = runner.context || {};
        runner.context.stageAudioHowToState = runner.context.stageAudioHowToState || {
            seeded: true
        };
        const file = buildStageDemoBeatWavFile(options?.durationSec || 4, options?.frequency || 220);
        try {
            await audioTimeline.loadAudioFile(file);
        } catch (err) {
            return false;
        }
        await runner._wait(220);
        return true;
    }

    async function restoreStageDemoSoundtrack(runner) {
        const audioTimeline = window.app?.audioTimeline;
        if (audioTimeline && typeof audioTimeline.removeAudio === 'function' && audioTimeline.isLoaded) {
            try { audioTimeline.removeAudio(); } catch (_) { /* ignore */ }
        }
        if (runner.context) delete runner.context.stageAudioHowToState;
        await runner._wait(120);
    }

    async function openStageContextMenuForSelectedObject(runner) {
        const objects = window.app?.objects;
        const selected = objects?.getSelectedObjects?.() || [];
        const object = selected[0];
        if (!objects || !object || typeof objects.showContextMenu !== 'function') return false;

        closeStageTransientUi();

        const stagePos = {
            x: Math.round((object.x || 0) + (object.width || 0) * 0.5),
            y: Math.round((object.y || 0) + (object.height || 0) * 0.5)
        };
        const viewport = document.getElementById('stage-viewport') || document.getElementById('stage-canvas');
        const rect = viewport?.getBoundingClientRect?.() || { left: 0, top: 0 };

        objects.showContextMenu(rect.left + stagePos.x, rect.top + stagePos.y, stagePos);
        await runner._wait(200);
        return true;
    }

    window.STAGE_TUTORIAL_PACK = {
        id: 'stage',
        title: 'Animation Stage Tutorials',
        tutorials: [
            {
                id: 'stage-first-time-demo-tour',
                title: 'First-Time Demo Tour',
                description: 'A practical guided tour for new users that opens the live menus, demonstrates Teach Me, and maps the stage, scenes, timeline, and image-only tools with real clicks.',
                path: {
                    id: 'start-here',
                    title: 'Start Here',
                    summary: 'Begin with the overview, map the live workspace, then learn the built-in support and handoff surfaces before moving into deeper task tutorials.',
                    order: 0
                },
                format: 'Guided Demo',
                audience: 'New users',
                nextTutorialId: 'stage-app-overview',
                toolCoverage: ['Top toolbar', 'Teach Me', 'Project name', 'Mode selector', 'Scene bar', 'Timeline', 'Image Tools'],
                intro: {
                    subject: 'the first-time Animation Stage tour',
                    kind: 'guided demo',
                    purpose: 'show new users where the real controls live and what to click first',
                    importance: 'it removes guesswork by walking through the current interface with live menu openings and one practical support demo',
                    demonstration: 'top-bar menus, Teach Me, project naming, mode switching, scenes, the timeline, and image-only tools'
                },
                outro: {
                    subject: 'the first-time Animation Stage tour',
                    outcome: 'know where to ask questions, rename a project, switch modes, manage scenes, review the timeline, and find image-only tools',
                    nextUse: 'start building with less hesitation and move into deeper workflow tutorials when you need more detail'
                },
                defaultPace: 'slow',
                observedDurationMs: 480000,
                voiceoverScript: 'Start with the real top toolbar so a new user can see the live menu structure instead of memorizing disconnected labels. Open File, Go, Edit, Stage, Output, and Tools in sequence, then stop on Teach Me and ask a real workflow question so the audience sees that help is already inside the editor. After that, move through project naming, the workspace status pill, and the mode selector so Basic Mode and AI Mode are easy to understand. Continue through the left tabs, the stage toolbar, the scene bar, and the timeline. Finish on the right panel by selecting a demo image and showing the Image Tools section that only appears for selected images, then sweep Animate, Tags, Code, and the SmartArt handoff.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageFirstTimeTour(runner);
                    notifyStageFirstTimeTourFinished();
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await prepareStageFirstTimeTour(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#top-toolbar',
                        tip: 'This top toolbar is the main navigation strip. On smaller screens it can scroll horizontally, so swipe or trackpad-scroll to reveal every control.',
                        surfaceLabel: 'TOP TOOLBAR',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-file"]',
                        tip: 'Open File first so new users can see where projects are created, saved, and loaded.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-file',
                        tip: 'File is the project menu. Use New Project, Save, Save As, and Load here.',
                        surfaceLabel: 'FILE MENU',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-go"]',
                        tip: 'Go is the navigation menu for moving to SmartArt, the Portal, or Logout.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-go',
                        tip: 'Go is the page handoff area for the editor, with SmartArt, Portal, and Logout grouped together.',
                        surfaceLabel: 'GO MENU',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-edit"]',
                        tip: 'Edit groups the quick recovery commands used during day-to-day work.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-edit',
                        tip: 'Use Edit for Undo, Redo, and Refresh.',
                        surfaceLabel: 'EDIT MENU',
                        ms: 950
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-stage"]',
                        tip: 'Stage holds the stage-wide reset actions.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-stage',
                        tip: 'Use Stage for Clear Stage and Restart when the working canvas itself needs a reset.',
                        surfaceLabel: 'STAGE MENU',
                        ms: 950
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-output"]',
                        tip: 'Output is the delivery menu for exports, templates, and reusable assets.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-output',
                        tip: 'Output groups Export, Templates, and Assets, so this is where editing turns into reuse and delivery.',
                        surfaceLabel: 'OUTPUT MENU',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-tools"]',
                        tip: 'Tools gathers guided help and stage utilities in one place.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-tools',
                        tip: 'Tools contains Demo Tour, Layout, Capture Stage, Animate Stage, and Teach Me.',
                        surfaceLabel: 'TOOLS MENU',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#btn-layout-menu',
                        tip: 'Open the Layout submenu to show the quick workspace layouts and panel toggles.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#layout-dropdown',
                        tip: 'Layout can switch the workspace between full editing, stage-and-timeline focus, or timeline-first views without leaving the current project.',
                        surfaceLabel: 'LAYOUT MENU',
                        readingWeight: 'extra-long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-tools"]',
                        tip: 'Reopen Tools for the most important onboarding stop: Teach Me.',
                        waitAfter: 250
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me',
                        tip: 'Teach Me is the built-in assistant for questions while you stay inside the editor.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#teach-me-panel:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'input',
                        selector: '#teach-me-input',
                        value: 'How do I build scenes, adjust the timeline, and export an animation?',
                        tip: 'Ask a real workflow question so new users can see that Teach Me explains tasks in plain language.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me-send',
                        tip: 'Send the question and wait for the answer to appear in the panel.',
                        waitAfter: 250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForTeachMeResponse(runner);
                            await scrollTeachMeToLatestAnswerStart(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#teach-me-messages',
                        tip: 'Teach Me is the fastest support path for new users. Ask feature or workflow questions here any time instead of leaving the app to search elsewhere.',
                        surfaceLabel: 'TEACH ME',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me-close',
                        tip: 'Close Teach Me and continue the guided tour.',
                        waitAfter: 300
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await closeTeachMeDiscussion(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#project-name-display',
                        tip: 'The project title in the center toolbar is editable. Click it whenever you want to rename the current animation.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageProjectName('My First Demo', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#workspace-status-pill',
                        tip: 'The workspace status pill confirms which editing surface is currently active.',
                        ms: 1000
                    },
                    {
                        action: 'tip',
                        selector: '#mode-toggle',
                        tip: 'Use the mode selector to switch between Basic Mode for direct editing and AI Mode for prompt-driven planning.',
                        surfaceLabel: 'WORKSPACE MODES',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('ai', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#ai-prompt',
                        tip: 'AI Mode turns a request into a reviewable plan, which helps users scaffold scenes or motion ideas before manual editing.',
                        surfaceLabel: 'AI MODE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-ai-generate',
                        tip: 'Generate Plan is the review checkpoint before anything is applied to the stage.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            closeStageTransientUi();
                            await setStagePanelCollapsed('right-panel', 'collapse-right', true, runner);
                            await runner._wait(200);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.toolbar-fixed-right',
                        tip: 'The right side of the top bar keeps utility controls together: signed-in user, search, feedback, theme, settings, and tutorials.',
                        surfaceLabel: 'UTILITY TOOLS',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('tools', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-tools',
                        tip: 'Tools is the creation panel. This is where shapes, arrows, images, text, icons, animated parts, and stage helpers enter the project.',
                        surfaceLabel: 'LEFT PANEL',
                        surfaceLabelTop: 16,
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('objects', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-objects',
                        tip: 'Objects lists everything already on the stage, so it is the right place to review names, visibility, locks, and order.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('layers', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-layers',
                        tip: 'Layers keeps larger projects organized by separating objects into reusable scene groups.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStagePanelCollapsed('left-panel', 'collapse-left', true, runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-toolbar',
                        tip: 'The stage toolbar above the canvas holds zoom, pan, order, alignment, distribution, playback, and selected-object readouts.',
                        surfaceLabel: 'STAGE TOOLBAR',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await scrollStageToolbarForTour(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The stage viewport is the main composition surface where scenes are built and edited.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'tip',
                        selector: '#scene-bar',
                        tip: 'The scene bar is the scene manager. Use it to add, duplicate, remove, and switch scenes as your story grows.',
                        surfaceLabel: 'SCENES',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#timeline-panel',
                        tip: 'The timeline is the timing surface for playback, duration, review, and track-level animation control.',
                        surfaceLabel: 'TIMELINE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#timeline-ruler',
                        tip: 'The ruler gives precise timing feedback so you can scrub and place motion accurately.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'tip',
                        selector: '#tl-play',
                        tip: 'Timeline transport controls are grouped here for play, stop, jumping to the start or end, and loop review.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'tip',
                        selector: '#tl-duration',
                        tip: 'The duration label is editable, so users can change project timing directly from the timeline header.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'tip',
                        selector: '#tl-audio-upload',
                        tip: 'Audio upload belongs in the timeline because narration or music often changes how scenes are timed.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStagePanelCollapsed('timeline-panel', 'collapse-timeline', true, runner);
                        }
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageFirstTimeDemoObjects(runner);
                            await switchRightPanelTab('properties', runner);
                            await selectStageFirstTimeDemoShape(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-properties',
                        tip: 'Properties is the main selection-based editor. It exposes transform, styling, text, image, attachment, rigging, and other object-specific controls.',
                        surfaceLabel: 'PROPERTIES',
                        surfaceLabelTop: 16,
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageFirstTimeDemoObjects(runner);
                            await switchRightPanelTab('properties', runner);
                            await selectStageFirstTimeDemoImage(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#image-properties',
                        tip: 'When an image is selected, the Image Tools section appears here. This is the routing surface for image cleanup, cutting, and character setup.',
                        surfaceLabel: 'IMAGE TOOLS',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-image-slicer',
                        tip: 'Body Slicer is the faster coarse-cut option for separating head, torso, arms, and legs.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Preview opens the current project in a separate review window, which is the practical way to test what users will actually see before exporting.',
                        surfaceLabel: 'PREVIEW',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await previewStageFirstTimeProject(runner);
                        }
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-animations',
                        tip: 'Animate is the motion panel for entry, emphasis, movement, path, camera, and other animation builders.',
                        surfaceLabel: 'ANIMATE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('tags', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-tags',
                        tip: 'Tags helps you name positions, objects, and zones so more complex scenes stay understandable.',
                        surfaceLabel: 'TAGS',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('code', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-code',
                        tip: 'Code exposes generated output and templates for teams that want to inspect or reuse animation logic.',
                        surfaceLabel: 'CODE',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-go"]',
                        tip: 'Finish on Go to point back to SmartArt when a project needs a structured diagram such as a timeline, process, org chart, or roadmap.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-smartart',
                        tip: 'Use SmartArt for structured visuals, then return to the stage when the diagram is ready to continue the animation workflow.',
                        surfaceLabel: 'SMARTART',
                        readingWeight: 'extra-long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await previewStageSmartArtWorkspace(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#workspace-status-pill',
                        tip: 'Back in Stage. The tutorial now ends on the main workspace so you can keep working here immediately.',
                        voiceover: false,
                        surfaceLabel: 'BACK IN STAGE',
                        readingWeight: 'extra-long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    }
                ]
            },
            {
                id: 'stage-interface-system-tour',
                title: 'Current Interface System Tour',
                description: 'Systematically maps the current stage interface, menus, tabs, panels, pages, and major tool sections without turning the tour into a workflow lesson.',
                path: {
                    id: 'start-here',
                    title: 'Start Here',
                    summary: 'Begin with the overview, map the live workspace, then learn the built-in support and handoff surfaces before moving into deeper task tutorials.',
                    order: 1
                },
                format: 'System Tour',
                audience: 'All users',
                nextTutorialId: 'stage-help-and-smartart',
                toolCoverage: ['Top toolbar', 'Layout submenu', 'Left tabs', 'Stage viewport', 'Timeline', 'Right tabs', 'AI mode surface'],
                intro: {
                    subject: 'the current Animation Stage interface',
                    kind: 'system tour',
                    purpose: 'map the live structure of the app as it exists now',
                    importance: 'recent interface changes mean the most reliable guide is the actual workspace, not older docs',
                    demonstration: 'menus, submenus, tabs, panels, sections, pages, and the AI surface'
                },
                outro: {
                    subject: 'the current Animation Stage interface',
                    outcome: 'know where every major part of the app lives before diving into deeper workflows',
                    nextUse: 'navigate the workspace faster and choose the right follow-up tutorial with less trial and error'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'This tour is a structural map of the current interface. It names the live menus, panels, tabs, pages, and major tool groupings in the order they appear on screen. It does not stop to teach each feature. Start with the top toolbar and move through File, Go, Edit, Stage, Output, and Tools, including the layout submenu and the utility buttons on the right. Then move through the left workspace tabs, the center stage area, the scene bar, and the timeline. After that, sweep the right-side tabs, including the animation sub-tabs and the AI mode surface. Finish by restoring the workspace so the tour acts as a guided map rather than a disruptive edit session.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageInterfaceState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            runner.context.stageInterfaceTourState = captureStageInterfaceState();
                            await ensureInterfaceTourWorkspace(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#top-toolbar',
                        tip: 'This is the top toolbar, which organizes the stage into grouped menus on the left, workspace state in the middle, and utility controls on the right.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-file"]',
                        tip: 'File is the first menu in the toolbar sequence.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-file',
                        tip: 'The File menu currently contains New Project, Save, Save As, and Load.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-file"]',
                        tip: 'Close File and continue across the toolbar.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-go"]',
                        tip: 'Go is the navigation menu for adjacent app pages and destinations.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-go',
                        tip: 'Go currently lists SmartArt, Portal, and Logout, so this menu is the stage-side page handoff area.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-go"]',
                        tip: 'Close Go and continue to the edit controls.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-edit"]',
                        tip: 'Edit is the compact revision menu in the toolbar flow.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-edit',
                        tip: 'The Edit menu currently groups Undo, Redo, and Refresh.',
                        ms: 950
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-edit"]',
                        tip: 'Close Edit and continue to the stage controls.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-stage"]',
                        tip: 'Stage is the menu dedicated to stage-level actions.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-stage',
                        tip: 'The Stage menu currently contains Clear Stage and Restart.',
                        ms: 900
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-stage"]',
                        tip: 'Close Stage and continue to output.',
                        waitAfter: 180
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Preview sits between grouped menus and the output menu as a dedicated quick-access control.',
                        ms: 950
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-output"]',
                        tip: 'Output is the delivery menu in the top toolbar.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-output',
                        tip: 'The Output menu currently groups Export, Templates, and Assets.',
                        ms: 950
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-output"]',
                        tip: 'Close Output and continue to Tools.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '.tbr-dd-btn[data-target="tbr-drop-tools"]',
                        tip: 'Tools is the final grouped menu on the left side of the toolbar.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#tbr-drop-tools',
                        tip: 'Tools currently includes Demo Tour, the Layout submenu, Capture Stage, Animate Stage, and Teach Me.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'click',
                        selector: '#btn-layout-menu',
                        tip: 'Layout is a submenu inside Tools, so it deserves its own quick stop in this tour.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#layout-dropdown',
                        tip: 'The Layout submenu exposes workspace presets first, then panel-visibility toggles underneath.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            closeStageTransientUi();
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.tbr-title-mid',
                        tip: 'The center toolbar cluster shows the app title, project name, workspace status pill, and the Basic or AI mode selector.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'tip',
                        selector: '.toolbar-fixed-right',
                        tip: 'The right-side utility strip currently groups the user badge, app search, feedback, install, theme, settings, and the tutorial launcher.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('tools', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-tools',
                        tip: 'The Tools panel is organized as visible groupings for Selection, Basic Shapes, More Shapes, Advanced Shapes, Lines and Arrows, Freehand, Content, Icon Library, Stage, and Stage Settings.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('objects', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-objects',
                        tip: 'Objects is the inventory tab on the left, with search, bulk visibility and lock controls, and the stage object list below.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('layers', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-layers',
                        tip: 'Layers is the third left tab, with a compact layer action row above the layer list.',
                        ms: 950
                    },
                    {
                        action: 'tip',
                        selector: '#stage-toolbar',
                        tip: 'The stage toolbar itself is split into zoom controls, alignment controls, stage playback, and live stage info readouts.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The viewport is the center editing surface, containing the canvas, selection overlay, and any temporary on-canvas helpers.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'tip',
                        selector: '#scene-bar',
                        tip: 'Below the workspace, the scene bar is the scene-level strip for adding, duplicating, removing, and browsing scenes.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'tip',
                        selector: '#timeline-panel',
                        tip: 'The bottom timeline is its own major section, with transport controls, edit controls, range tools, time readouts, tracks, and timeline interactions.',
                        readingWeight: 'extra-long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-properties',
                        tip: 'Properties is the first right-side tab. Its visible sections change with selection, but this panel is where the current editor exposes transform, styling, image, joint, attachment, pivot, and recording sections.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('animations', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-animations',
                        tip: 'Animate is the second right-side tab. In Basic Mode it contains search, animation sub-tabs, shared animation settings, and the applied-animation list.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchAnimationSubtab('basic', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-subtab-content[data-subtab-content="basic"]',
                        tip: 'The Basic animation sub-tab is grouped into Entry, Exit, and Emphasis.',
                        ms: 950
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchAnimationSubtab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-subtab-content[data-subtab-content="properties"]',
                        tip: 'The Properties animation sub-tab is grouped into Movement, Rotation, Scale, Opacity, and Text Effects.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchAnimationSubtab('advanced', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-subtab-content[data-subtab-content="advanced"]',
                        tip: 'The Advanced animation sub-tab is grouped into Combos, Custom Animation, Chain Animations, Move Along Shape, and Stage Sequence.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'Applied Animations is the list section that sits beneath the animation builders in Basic Mode.',
                        ms: 900
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('tags', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-tags',
                        tip: 'Tags is grouped into Position Tags, Object Tags, and Zone Tags.',
                        ms: 900
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('code', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-code',
                        tip: 'Code is the fourth right-side tab, with the generated code area at the top and Code Templates underneath.',
                        readingWeight: 'long',
                        ms: 1000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('ai', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#ai-prompt',
                        tip: 'In AI Mode, the animation tab is replaced by the prompt surface, starting with the prompt box and prompt action row.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'click',
                        selector: '#btn-ai-help-toggle',
                        tip: 'Open the prompt guide to include that AI-side section in the system tour.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#ai-prompt-guide',
                        tip: 'The AI prompt guide is a structured accordion section under the prompt box, and it now reflects a much larger surface than older documentation summaries.',
                        readingWeight: 'extra-long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '.ai-awareness',
                        tip: 'Below the guide, AI Mode continues with Stage Awareness, the Action Plan area, and the execution-preview zone.',
                        readingWeight: 'long',
                        ms: 1050
                    },
                    {
                        action: 'tip',
                        selector: '.ai-cache',
                        tip: 'The lower AI section ends with Recent AI Animations, which serves as the current prompt-history surface in the panel.',
                        readingWeight: 'long',
                        ms: 1000
                    }
                ]
            },
            {
                id: 'stage-app-overview',
                title: 'Animation Stage Overview',
                description: 'Introduces the stage workspace, major tools, AI mode, SmartArt handoff, and the core use cases the app supports.',
                path: {
                    id: 'start-here',
                    title: 'Start Here',
                    summary: 'Begin with the overview, map the live workspace, then learn the built-in support and handoff surfaces before moving into deeper task tutorials.',
                    order: 1
                },
                format: 'Orientation',
                audience: 'All users',
                nextTutorialId: 'stage-howto-object-animation',
                toolCoverage: ['Canvas stage', 'Mode selector', 'Preview', 'Output menu', 'Teach Me', 'AI prompt area', 'SmartArt handoff'],
                intro: {
                    subject: 'Animation Stage',
                    kind: 'overview',
                    purpose: 'orient new users to the workspace, major modes, and the tools that turn ideas into animated outputs',
                    importance: 'the app combines manual editing, AI planning, SmartArt diagrams, and delivery workflows in one production flow',
                    demonstration: 'the stage canvas, mode switcher, output tools, Teach Me, AI mode, and SmartArt handoff'
                },
                outro: {
                    subject: 'Animation Stage',
                    outcome: 'understand where to build scenes, ask for help, switch modes, and hand structured visuals into SmartArt',
                    nextUse: 'choose the right workflow faster for explainers, business visuals, product demos, lessons, and social animations'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start on the main stage canvas and introduce Animation Stage as a browser-based animation workspace for explainers, product demos, learning content, business storytelling, and social motion design. Highlight the mode selector to explain that Basic Mode is for direct editing, AI Mode is for prompt-driven planning, and SmartArt is the structured-visual handoff for diagrams and presentation-style layouts. Point out preview and output controls as the delivery path for reviewing and exporting work. Then open Teach Me to show that in-context help is available during production. Switch into AI Mode so the prompt box and Generate Plan control become visible, and explain that AI can scaffold scenes and animation plans while keeping the result editable. Return to Basic Mode, open the Go menu, and finish by highlighting SmartArt as the place for timelines, flowcharts, org charts, and other structured visuals that can be sent back into the stage.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'tip',
                        selector: '#stage-canvas',
                        tip: 'Animation Stage centers everything on the live canvas, where you compose scenes for explainers, promos, lessons, product walkthroughs, and other animated visuals.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#mode-toggle',
                        tip: 'The mode selector is the main workflow switch: stay in Basic Mode for manual editing, move into AI Mode for prompt-driven planning, or hand structured visuals to SmartArt.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Preview is the fast review checkpoint before delivery, which matters when you are building client demos, educational scenes, or social-ready motion.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-output"]',
                        tip: 'Open Output to show where projects move from editing into reusable templates and final exports.',
                        waitAfter: 300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-templates',
                        tip: 'Templates and output tools help teams reuse motion patterns and prepare polished deliverables without rebuilding every sequence from scratch.',
                        readingWeight: 'extra-long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-output"]',
                        tip: 'Close Output and move to the built-in support tools.',
                        waitAfter: 250
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-tools"]',
                        tip: 'Tools gathers helper workflows that support production inside the stage.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me',
                        tip: 'Teach Me is the in-app guide for questions about features, workflows, and editing steps while you work.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#teach-me-panel:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#teach-me-messages',
                        tip: 'This assistant keeps support inside the workspace, so tutorials and everyday production can stay in the same flow.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me-close',
                        tip: 'Close the assistant and move into AI-assisted scene building.',
                        waitAfter: 350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await closeTeachMeDiscussion(runner);
                        }
                    },
                    {
                        action: 'call',
                        run: async (runner) => {
                            const modeSelect = document.getElementById('mode-select');
                            if (!modeSelect) throw new Error('Mode selector not available');
                            modeSelect.value = 'ai';
                            modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            await runner._wait(350);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#ai-prompt',
                        tip: 'AI Mode converts natural-language requests into reviewable execution plans, which is useful for quickly scaffolding scenes, prompt-led animation ideas, and assisted edits.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-ai-generate',
                        tip: 'Generate Plan lets users review the AI workflow before applying it, which keeps prompt-driven work editable and safer to refine.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async (runner) => {
                            const modeSelect = document.getElementById('mode-select');
                            if (!modeSelect) throw new Error('Mode selector not available');
                            modeSelect.value = 'basic';
                            modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            await runner._wait(350);
                        }
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-go"]',
                        tip: 'Open Go to show where the stage hands structured visual work into SmartArt.',
                        waitAfter: 300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-smartart',
                        tip: 'SmartArt handles timelines, roadmaps, flowcharts, org charts, and other presentation-style visuals, then sends the finished result back to the main stage.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-go"]',
                        tip: 'Return to the stage toolbar for the final support checkpoint.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-stage-feedback',
                        tip: 'Feedback stays directly in the workspace, so users can report friction or request improvements while exploring new tools and tutorials.',
                        readingWeight: 'long',
                        ms: 1200
                    }
                ]
            },
            {
                id: 'stage-howto-object-animation',
                title: 'How to Animate an Object',
                description: 'Shows one simple rectangle animation from selection through three access routes, preview, apply, and review.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                nextTutorialId: 'stage-howto-preview-in-new-window',
                toolCoverage: ['Rectangle object', 'Context-menu Animate route', 'Animate tab', 'App Search', 'Preview and Apply', 'Stage and timeline playback'],
                intro: {
                    subject: 'a simple object animation',
                    kind: 'how-to demonstration',
                    purpose: 'show the shortest practical route from a selected shape to a finished entry animation',
                    importance: 'it teaches where animation can be reached from and how to review it before committing it',
                    demonstration: 'one rectangle, the Zoom In entry effect, animation settings, and three review methods'
                },
                outro: {
                    subject: 'a simple object animation',
                    outcome: 'know how to reach the same entry animation from right-click, the Animate panel, or App Search and then review it three ways',
                    nextUse: 'repeat the same pattern on icons, text, images, or grouped stage elements'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start with one selected rectangle so the lesson stays focused on animation rather than drawing. Use the right-click route first because it is the quickest way to discover Animate, Entry, and Zoom In directly from the object. Then point out that the same animation is always available in the Animate tab and discoverable through App Search. Finish by adjusting duration, previewing, applying, and reviewing the result from the stage toolbar, the separate Preview window, and the timeline from the start.',
                beforeStart: 'prepareStageTutorialWithPreviewWindow',
                afterFinish: async runner => {
                    await closeReservedStagePreviewWindow(runner);
                    await restoreStageObjectAnimationHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchLeftPanelTab('tools', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStageObjectAnimationHowToDemo(runner);
                            const bounds = runner.context?.stageObjectAnimationHowToState?.focusBounds;
                            if (bounds) {
                                await focusStageViewportOnBounds(bounds, runner, { fillRatio: 0.9, minZoom: 0.35, maxZoom: 1.8 });
                            }
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.tool-btn[data-tool="rectangle"]',
                        tip: 'Any simple object works for this workflow. This demo seeds a small two-object stage so the animation reads in a real scene instead of on an empty canvas.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Create or select the object you want to animate first, then frame the stage so the full scene is visible while keyframes and playback are added. The orange card is the animated target and the blue card gives the motion some stage context.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1320
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStagePanelCollapsed('left-panel', 'collapse-left', true, runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Collapse the left panel when you want more space to position the object and judge the motion directly on the canvas.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await openStageContextMenuForSelectedObject(runner);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '.context-menu',
                        timeout: 2500
                    },
                    {
                        action: 'tip',
                        selector: '.context-menu-item.has-submenu[data-action="Animate"]',
                        tip: 'Route one is object-first: right-click the selected object and open Animate when you want the fastest direct path into motion.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '.context-menu-item.has-submenu[data-action="Animate"]',
                        tip: 'Open Animate from the object menu so the animation categories appear next.',
                        waitAfter: 250
                    },
                    {
                        action: 'waitFor',
                        selector: '.context-submenu .context-menu-item[data-category="entry"]',
                        timeout: 2500
                    },
                    {
                        action: 'tip',
                        selector: '.context-submenu .context-menu-item[data-category="entry"]',
                        tip: 'Entry is the right category when the object should arrive onto the stage instead of already being visible at time zero.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.context-submenu .context-menu-item[data-category="entry"]',
                        tip: 'Open Entry and continue to Zoom In.',
                        waitAfter: 250
                    },
                    {
                        action: 'waitFor',
                        selector: '.context-submenu-anim .context-menu-item[data-anim-key="entry-zoom"]',
                        timeout: 2500
                    },
                    {
                        action: 'tip',
                        selector: '.context-submenu-anim .context-menu-item[data-anim-key="entry-zoom"]',
                        tip: 'Zoom In is a strong first animation because it is easy to see, easy to preview, and easy to compare after timing changes.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.context-submenu-anim .context-menu-item[data-anim-key="entry-zoom"]',
                        tip: 'Select Zoom In. The app now opens the same right-panel settings you can also reach directly without right-clicking first.',
                        waitAfter: 420
                    },
                    {
                        action: 'tip',
                        selector: '#tab-animations',
                        tip: 'Route two is the Animate tab itself. This is the main motion workspace for the current selection.',
                        surfaceLabel: 'ANIMATE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.anim-subtab-content[data-subtab-content="basic"]',
                        tip: 'Basic is where Entry, Exit, and Emphasis live. If you skip the context menu, this is the surface you open directly.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="entry-zoom"]',
                        tip: 'This is the same Zoom In button the context-menu route selected. Route one and route two both converge on the same control.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-app-search',
                        tip: 'Route three is App Search. Use the toolbar search button, or press Cmd+/ on Mac, when you know the effect you want but not where the control lives.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-app-search',
                        tip: 'Open App Search and look up the animation by name.',
                        waitAfter: 250
                    },
                    {
                        action: 'waitFor',
                        selector: '#app-search-overlay:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'input',
                        selector: '#app-search-input',
                        value: 'zoom in',
                        tip: 'Search for the exact effect name, or try broader terms such as animate or entry animation when you are still narrowing the target.',
                        waitAfter: 260
                    },
                    {
                        action: 'waitFor',
                        selector: '#app-search-results .app-search-result',
                        timeout: 3000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const matches = Array.isArray(window.appSearch?._matches) ? window.appSearch._matches : [];
                            const targetIndex = matches.findIndex(match => match?.el?.matches?.('.anim-btn[data-anim="entry-zoom"]'));
                            const index = targetIndex >= 0 ? targetIndex : 0;
                            window.appSearch?._viewElement?.(index);
                            await runner._wait(220);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#app-search-results .app-search-result.active',
                        tip: 'The active result reveals the matching live control first, which makes App Search useful as both a finder and a navigator.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const matches = Array.isArray(window.appSearch?._matches) ? window.appSearch._matches : [];
                            const targetIndex = matches.findIndex(match => match?.el?.matches?.('.anim-btn[data-anim="entry-zoom"]'));
                            window.appSearch?._activateElement?.(targetIndex >= 0 ? targetIndex : 0);
                            await runner._wait(260);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#param-duration',
                        tip: 'Adjust timing first. Small duration changes are the quickest way to make the motion feel calmer or snappier.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '1.1',
                        tip: 'Set a readable duration so the preview is easy to judge.',
                        waitAfter: 120
                    },
                    {
                        action: 'tip',
                        selector: '#param-easing',
                        tip: 'Easing shapes how the zoom accelerates and settles. Keep the default for a clean first pass, then refine easing after you see the base motion.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview-anim',
                        tip: 'Preview tests the selected animation on the current object without writing it permanently into the scene yet.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('btn-preview-anim')?.click();
                            await runner._wait(900);
                            window.app?.animations?._cancelAllPreviews?.();
                            window.app?.stage?.requestRender?.();
                            await runner._wait(120);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-apply-anim',
                        tip: 'Apply commits the animation to the selected object and sends it into the timeline and applied-animation list.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Zoom In animation so it becomes part of the project.',
                        waitAfter: 240
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'Applied Animations is the confirmation checkpoint. If you want to edit, replace, or re-apply the motion later, start from this list.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#stage-tb-play',
                        tip: 'Review method one is the play button above the stage. Use it for the fastest in-canvas check while you are still arranging the scene.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(900);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Review method two is the separate Preview window. Use it when you want to inspect what the viewer will actually see before export.',
                        surfaceLabel: 'PREVIEW',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await previewCurrentStageProject(runner);
                        }
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await setStagePanelCollapsed('timeline-panel', 'collapse-timeline', false, runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tl-start',
                        tip: 'Review method three is timeline playback. Reset to the start first so the entry animation begins from its authored timing instead of wherever the playhead was left.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#tl-start',
                        tip: 'Return the playhead to the start of the scene before playing from the timeline.',
                        waitAfter: 160
                    },
                    {
                        action: 'tip',
                        selector: '#tl-play',
                        tip: 'Play from the timeline when you want to review the animation in context with its exact timing, delays, and neighboring tracks. This final pass should show the animated stage from the start so the result is clear.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const bounds = runner.context?.stageObjectAnimationHowToState?.focusBounds;
                            if (bounds) {
                                await focusStageViewportOnBounds(bounds, runner, { fillRatio: 0.9, minZoom: 0.35, maxZoom: 1.8 });
                            }
                            setStagePlayheadTime(0);
                            await runner._wait(120);
                            document.getElementById('tl-play')?.click();
                            await runner._wait(1550);
                            window.app?.animations?.stop?.();
                            await runner._wait(140);
                        }
                    }
                ]
            },
            {
                id: 'stage-howto-preview-in-new-window',
                title: 'How to Preview an Animation in a New Window',
                description: 'Uses a simple animated object so the Preview button opens a separate playback window with real motion.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                nextTutorialId: 'stage-howto-universal-character-walk',
                toolCoverage: ['Animated object', 'Applied Animations', 'Stage play button', 'Preview button', 'New window playback'],
                intro: {
                    subject: 'previewing an animation in a new window',
                    kind: 'how-to demonstration',
                    purpose: 'show how to review motion in a separate playback window without the editing interface around it',
                    importance: 'it gives users a practical final-check step before export or sharing',
                    demonstration: 'a seeded animated card scene, the stage play button, and the Preview window'
                },
                outro: {
                    subject: 'previewing an animation in a new window',
                    outcome: 'know how to open a separate autoplay preview and use it to judge the stage output more cleanly',
                    nextUse: 'run Preview after timing, easing, or scene-layout changes when you want to see the audience-facing result'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start with a seeded object animation so Preview has real motion to play immediately. Show the stage play button first, because that is the quick in-canvas review while editing controls are still visible. Then move to the Preview button and explain that it opens a separate autoplay window showing only the stage output, which makes it easier to judge the animation as a viewer would see it. Finish by opening the new window from the start of the scene and letting the animated object play in isolation.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageObjectAnimationHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStagePreviewWindowHowToDemo(runner);
                            const bounds = runner.context?.stageObjectAnimationHowToState?.focusBounds;
                            if (bounds) {
                                await focusStageViewportOnBounds(bounds, runner, { fillRatio: 0.9, minZoom: 0.35, maxZoom: 1.8 });
                            }
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This tutorial seeds a practical example first: the orange card already has a simple move animation and the blue card provides stage context, so the new window will show real motion instead of an empty scene.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1320
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'Applied Animations confirms that the selected object already has motion attached before you open Preview.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'waitFor',
                        selector: '#applied-anim-list .applied-anim-item',
                        timeout: 2500
                    },
                    {
                        action: 'click',
                        selector: '#applied-anim-list .applied-anim-item',
                        tip: 'Click the applied animation row itself so the existing move is visibly confirmed in the list before opening Preview.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#stage-tb-play',
                        tip: 'Use the stage play button first for a quick edit-side check while you are still working inside the full interface.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const bounds = runner.context?.stageObjectAnimationHowToState?.focusBounds;
                            if (bounds) {
                                await focusStageViewportOnBounds(bounds, runner, { fillRatio: 0.9, minZoom: 0.35, maxZoom: 1.8 });
                            }
                            setStagePlayheadTime(0);
                            await runner._wait(120);
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(1200);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Preview opens the current scene in a separate autoplay window, which strips away panels and editing chrome so you can judge the animation more like a finished output.',
                        surfaceLabel: 'PREVIEW',
                        readingWeight: 'extra-long',
                        ms: 1280
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const bounds = runner.context?.stageObjectAnimationHowToState?.focusBounds;
                            if (bounds) {
                                await focusStageViewportOnBounds(bounds, runner, { fillRatio: 0.9, minZoom: 0.35, maxZoom: 1.8 });
                            }
                            setStagePlayheadTime(0);
                            await runner._wait(120);
                            await previewCurrentStageProject(runner, { visibleMs: 4200 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Run Preview again after timing, easing, or scene changes whenever you want the cleanest last check before export.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-howto-universal-character-walk',
                title: 'How to Make a Universal Character Walk',
                description: 'Uses the Universal Character armature panel to block a single walk pose, loop a full walk cycle, and stop it cleanly.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                nextTutorialId: 'stage-howto-universal-character-wave-greet',
                toolCoverage: ['Universal Character', 'Pose Armature panel', 'Quick Poses', 'Animated Movements', 'Add to Timeline', 'Duration and Cycles'],
                intro: {
                    subject: 'a Universal Character walk',
                    kind: 'how-to demonstration',
                    purpose: 'show the shortest route from a generated character to a readable walk cycle',
                    importance: 'it establishes the difference between one blocked pose and a looping body movement',
                    demonstration: 'one seeded Universal Character, one walk pose, the walk-cycle movement, and the stop and record controls'
                },
                outro: {
                    subject: 'a Universal Character walk',
                    outcome: 'know where to block a single step, play the full walk loop, stop it, and then record it when the gait feels right',
                    nextUse: 'repeat the same pattern for runs, marches, or any other locomotion movement in the armature panel'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'bottom-left',
                voiceoverScript: 'Add a Universal Character, then use Quick Poses to check a single walk pose. Move into Animated Movements and preview Walk Cycle. Previewing does not record. Set Duration and Cycles, choose placement, and use Add to Timeline when ready. Use Edit Action and Update Timeline for later changes.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageUniversalCharacterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'To add one manually, right-click any empty part of the stage and choose Universal Character. This walkthrough seeds one next so the lesson can stay on walking.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const armature = await ensureStageUniversalCharacterHowToDemo(runner, { view: 'side', sideFacing: 'right' });
                            await focusStageViewportOnUniversalCharacter(runner, armature, { fillRatio: 0.7, minZoomMultiplier: 0, minZoom: 0.4, maxZoom: 2.4 });
                            await scrollStageTutorialPanel('#armature-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This demo seeds one real Universal Character so the lesson can stay on locomotion instead of character building.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#armature-panel',
                        tip: 'Universal Character motion is controlled from the Pose Armature panel. Static poses and looping movements live together here.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '.armature-pose-btn[data-pose-key="walk-cycle-mid"], .armature-pose-btn[data-pose-key="walk-step-forward"]',
                        tip: 'Start with one walk pose when you want to check silhouette or block a single step before committing to a loop.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-pose-btn[data-pose-key="walk-cycle-mid"], .armature-pose-btn[data-pose-key="walk-step-forward"]',
                        tip: 'Apply one walk pose first so the stance change is easy to read on the stage.',
                        waitAfter: 260
                    },
                    {
                        action: 'tip',
                        selector: '.armature-move-btn[data-move-key="walk-cycle"], .armature-move-btn[data-move-key="walk"]',
                        tip: 'Use Walk Cycle when the character should keep moving. This is the quickest reusable way to get a readable gait.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-move-btn[data-move-key="walk-cycle"], .armature-move-btn[data-move-key="walk"]',
                        tip: 'Play the loop so you can judge stride, arm swing, and timing live on the stage.',
                        waitAfter: 520
                    },
                    {
                        action: 'tip',
                        selector: '#armature-stop-all',
                        tip: 'Stop freezes the body motion cleanly. Use it whenever the walk needs a hold or a transition into another beat.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#armature-stop-all',
                        tip: 'Stop the loop once the gait reads clearly.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#armature-record-row',
                        tip: 'Clicking a movement previews it. Set Duration, Cycles and placement here, then choose Add to Timeline. Use Edit Action on the completed action to revise it and Update Timeline to save the changes.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    }
                ]
            },
            {
                id: 'stage-howto-universal-character-wave-greet',
                title: 'How to Make a Universal Character Wave and Greet',
                description: 'Combines a looping wave with a friendly facial expression so the greeting reads as both body language and character intent.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                nextTutorialId: 'stage-howto-universal-character-talk',
                toolCoverage: ['Universal Character', 'Animated Movements', 'Facial Expressions', 'Stop controls'],
                intro: {
                    subject: 'a Universal Character greeting',
                    kind: 'how-to demonstration',
                    purpose: 'show how to combine a body movement and a facial expression without leaving the armature panel',
                    importance: 'it turns a generic wave into a readable greeting with character intent',
                    demonstration: 'the wave-cycle movement, the face section, and a smile layered over the body motion'
                },
                outro: {
                    subject: 'a Universal Character greeting',
                    outcome: 'know how to start a wave, layer in a smile, and stop the movement once the greeting beat lands',
                    nextUse: 'reuse the same pattern for welcoming, beckoning, cheering, or other expressive character intros'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'bottom-left',
                voiceoverScript: 'Start by adding a Universal Character by right-clicking an empty part of the stage and choosing Universal Character so the greeting has a real rigged performer to work with. Then treat the greeting as a combination of body motion and face, not just an arm pose. Start the built-in wave cycle from Animated Movements, move into the facial section to add a smile, then zoom back out so the full-body greeting can be judged again before stopping the motion.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageUniversalCharacterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'To add one manually, right-click any empty part of the stage and choose Universal Character. This walkthrough seeds one next so the greeting can focus on motion and face.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageUniversalCharacterHowToDemo(runner);
                            await scrollStageTutorialPanel('#armature-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'A convincing greeting usually needs both body motion and facial intent. This walkthrough shows both on the same character.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.armature-move-btn[data-move-key="wave"]',
                        tip: 'Start with the built-in Wave movement so the gesture loops cleanly without hand-keying each arm pose.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-move-btn[data-move-key="wave"]',
                        tip: 'Play the waving motion first so the body greeting is already alive on the stage.',
                        waitAfter: 480
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await scrollStageTutorialPanel('#armature-face-section', runner);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#armature-face-section',
                        timeout: 2500
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageUniversalCharacterMovementActive(runner, 'wave');
                            await focusStageViewportOnUniversalCharacterFace(runner, null, { fillRatio: 0.6, minZoomMultiplier: 1.25, maxZoom: 8 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#armature-face-section',
                        tip: 'The facial section stays independent from body motion, so you can improve the mood of the performance without interrupting the wave.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '.armature-face-btn[data-expression-key="smile"]',
                        tip: 'Add Smile when the gesture should read as a greeting instead of a neutral arm action.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-face-btn[data-expression-key="smile"]',
                        tip: 'Apply the smile while the wave keeps playing.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageUniversalCharacterMovementActive(runner, 'wave');
                            await focusStageViewportOnUniversalCharacter(runner, null, { fillRatio: 0.72, minZoomMultiplier: 0, minZoom: 0.4, maxZoom: 4 });
                            await ensureStageUniversalCharacterMovementActive(runner, 'wave');
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Zoom back out and watch the full character again. The wave is still playing, so now you can judge how the smile changes the whole greeting read.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageUniversalCharacterMovementActive(runner, 'wave');
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#armature-stop-all',
                        tip: 'Stop ends the body loop when the greeting beat is complete. The smile can stay applied afterward as the resting expression.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#armature-stop-all',
                        tip: 'Stop the wave once the greeting reads clearly.',
                        waitAfter: 220
                    }
                ]
            },
            {
                id: 'stage-howto-universal-character-talk',
                title: 'How to Make a Universal Character Talk',
                description: 'Uses the facial section of the armature panel for a speech-shaped expression and the looping talking mouth movement.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                nextTutorialId: 'stage-howto-universal-character-enter-stop-exit',
                toolCoverage: ['Universal Character', 'Facial Expressions', 'Facial Movements', 'Stop Face', 'Audio Lip Sync'],
                intro: {
                    subject: 'a talking Universal Character',
                    kind: 'how-to demonstration',
                    purpose: 'show the fastest route from a neutral face to a reusable speech loop',
                    importance: 'it separates static face choices from looping mouth performance, which makes dialogue blocking far easier',
                    demonstration: 'the talking expression, the talking-loop facial movement, and the face stop and record controls'
                },
                outro: {
                    subject: 'a talking Universal Character',
                    outcome: 'know how to hold a speech mouth shape, start the looping talking motion, and stop or record it when needed',
                    nextUse: 'layer speech over nods, idle breathing, or other body beats once the dialogue rhythm feels right'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'bottom-left',
                voiceoverScript: 'Add a Universal Character and open the facial section. Talking is a speech-ready expression; the Talking movement previews a generic loop. Stop Face ends that preview. For speech synchronized to recorded audio, load a clip and use Audio Lip Sync instead. Mouth only preserves separate body animation; Apply saves the speech clip.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageUniversalCharacterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'To add one manually, right-click any empty part of the stage and choose Universal Character. This walkthrough seeds one next so the lesson can stay on dialogue blocking.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageUniversalCharacterHowToDemo(runner);
                            await scrollStageTutorialPanel('#armature-face-section', runner);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#armature-face-section',
                        timeout: 2500
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await focusStageViewportOnUniversalCharacterFace(runner, null, { fillRatio: 0.62, minZoomMultiplier: 1.3, maxZoom: 8.5 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#armature-face-section',
                        tip: 'Speech setup lives in the facial section. Static expressions and looping mouth movements are separated so you can choose one or use both.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '.armature-face-btn[data-expression-key="talking"]',
                        tip: 'Talking is the quick hold shape for a speech-ready mouth when you need a still frame or a short held beat.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-face-btn[data-expression-key="talking"]',
                        tip: 'Apply the talking expression first so the face shifts out of neutral immediately.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '.armature-face-move-btn[data-face-move-key="talking-loop"]',
                        tip: 'Talking loops the mouth motion continuously. Use this for reusable dialogue beats instead of clicking between still expressions.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '.armature-face-move-btn[data-face-move-key="talking-loop"]',
                        tip: 'Start the talking loop so the face performs live on the stage.',
                        waitAfter: 520
                    },
                    {
                        action: 'tip',
                        selector: '#armature-stop-face',
                        tip: 'Stop Face ends the mouth loop without affecting the body, which is useful when speech should finish before the character fully settles.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#armature-stop-face',
                        tip: 'Stop the facial loop when the speech beat is done.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await focusStageViewportOnUniversalCharacter(runner, null, { fillRatio: 0.72, minZoomMultiplier: 0, minZoom: 0.4, maxZoom: 4 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#armature-panel',
                        tip: 'This facial loop is a preview, not audio-synchronized speech. For recorded dialogue, load audio and open Audio Lip Sync. Choose Mouth only alongside separate body animation, then Apply. See the Audio Lip Sync tutorial for the complete workflow.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    }
                ]
            },
            {
                id: 'stage-howto-universal-character-enter-stop-exit',
                title: 'How to Make a Universal Character Enter, Stop, and Exit a Scene',
                description: 'Blocks a simple three-beat scene rhythm by using walk motion for the entrance and exit and a standing pose for the held middle beat.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                nextTutorialId: 'stage-howto-universal-character-point-object',
                toolCoverage: ['Universal Character', 'Walk Cycle', 'Neutral hold pose', 'Stop controls', 'Add to Timeline'],
                intro: {
                    subject: 'a three-beat character entrance',
                    kind: 'how-to demonstration',
                    purpose: 'show how to think in scene beats instead of one continuous motion',
                    importance: 'enter, hold, and exit beats make staged character action read clearly and stay easy to author',
                    demonstration: 'a walk-in beat, a neutral standing hold, a second walk-out beat, and the record control for baking the pattern later'
                },
                outro: {
                    subject: 'a three-beat character entrance',
                    outcome: 'know how to block enter, stop, and exit with a reusable movement plus one neutral hold pose',
                    nextUse: 'combine the same beat structure with timeline motion, scene camera work, or dialogue once the staging is clearer'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'bottom-left',
                voiceoverScript: 'Add a Universal Character and plan three beats: arrive, hold and leave. Preview stage travel, stop into a readable hold, then preview the exit. Add each selected action to the timeline separately, setting duration and cycles. Place subsequent actions after the previous action, then check the complete sequence.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageUniversalCharacterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'To add one manually, right-click any empty part of the stage and choose Universal Character. This walkthrough seeds one next so the lesson can stay on the three scene beats.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const armature = await ensureStageUniversalCharacterHowToDemo(runner, { view: 'side', sideFacing: 'right' });
                            if (!armature?.root) return;
                            const anchor = getStageUniversalCharacterHowToAnchor(armature);
                            const rootWidth = Math.max(80, Math.abs(armature.root.width || anchor.width));
                            const startX = Math.max(12, Math.round(rootWidth * 0.1));
                            await setStageUniversalCharacterBasePosition(runner, armature, { baseX: startX, baseY: armature.root.y });
                            await focusStageViewportOnStageCorridor(runner, armature, { fillRatio: 0.94, minZoom: 0.3, maxZoom: 2.2 });
                            await scrollStageTutorialPanel('#armature-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'A clean entrance usually has three beats: arrive into frame, hold long enough to read, then clear the frame again.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '.armature-move-btn[data-move-key="walk-cycle"], .armature-move-btn[data-move-key="walk"]',
                        tip: 'Use the walk cycle for the entrance beat so the body language already reads as travel.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-move-btn[data-move-key="walk-cycle"], .armature-move-btn[data-move-key="walk"]',
                        tip: 'Start the walk to represent the character entering the scene.',
                        waitAfter: 420
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const armature = getStageUniversalCharacterHowToLiveArmature(runner);
                            if (!armature?.root) return;
                            const anchor = getStageUniversalCharacterHowToAnchor(armature);
                            const rootWidth = Math.max(80, Math.abs(armature.root.width || anchor.width));
                            // Make sure the walk cycle is actually running so the limbs swing while the body translates.
                            await ensureStageUniversalCharacterMovementActive(runner, 'walk-cycle', armature)
                                || await ensureStageUniversalCharacterMovementActive(runner, 'walk', armature);
                            const holdX = Math.round(anchor.stageWidth * 0.5 - rootWidth * 0.5);
                            // 2800ms = two full 1400ms strides, so the character clearly walks rather than glides.
                            await animateStageUniversalCharacterTravel(runner, { armature, baseX: holdX, baseY: armature.root.y, durationMs: 2800, settleMs: 200 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The entrance beat should really travel across the stage. Let the walk bring the character into the playable area instead of walking in place.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#armature-stop-all',
                        tip: 'Stop the movement when the character reaches the important storytelling beat so the audience has a readable hold.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#armature-stop-all',
                        tip: 'Stop the entrance beat at the moment the character should settle in the scene.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '.armature-pose-btn[data-pose-key="idle"], .armature-pose-btn[data-pose-key="attention-side"]',
                        tip: 'A neutral standing pose is a practical hold when the character needs to pause and own the frame.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-pose-btn[data-pose-key="idle"], .armature-pose-btn[data-pose-key="attention-side"]',
                        tip: 'Apply the held middle beat before the character exits.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '.armature-move-btn[data-move-key="walk-cycle"], .armature-move-btn[data-move-key="walk"]',
                        tip: 'Trigger the walk again for the exit beat when it is time for the character to clear the scene.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-move-btn[data-move-key="walk-cycle"], .armature-move-btn[data-move-key="walk"]',
                        tip: 'Start the exit pass using the same walk cycle.',
                        waitAfter: 420
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const armature = getStageUniversalCharacterHowToLiveArmature(runner);
                            if (!armature?.root) return;
                            const anchor = getStageUniversalCharacterHowToAnchor(armature);
                            const rootWidth = Math.max(80, Math.abs(armature.root.width || anchor.width));
                            await ensureStageUniversalCharacterMovementActive(runner, 'walk-cycle', armature)
                                || await ensureStageUniversalCharacterMovementActive(runner, 'walk', armature);
                            const exitX = Math.max(anchor.stageWidth - rootWidth * 0.1 - 12, anchor.stageWidth - rootWidth - 8);
                            await animateStageUniversalCharacterTravel(runner, { armature, baseX: exitX, baseY: armature.root.y, durationMs: 2800, settleMs: 200 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Use the second walk beat to clear the scene again so the exit reads as a real departure, not just another looping walk pose.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#armature-stop-all',
                        tip: 'Stop the second walk once the exit idea is clear.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#armature-record-row',
                        tip: 'Preview each beat, set its duration and cycles, then Add to Timeline. Place subsequent actions after the previous action. Use Edit Action and Update Timeline to revise an existing beat.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    }
                ]
            },
            {
                id: 'stage-howto-universal-character-point-object',
                title: 'How to Make a Universal Character Point to an Object',
                description: 'Places a simple target prop on stage and uses a built-in point pose to direct the character toward it.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Universal Character', 'Point pose', 'Stage prop placement', 'Add to Timeline'],
                intro: {
                    subject: 'a character pointing interaction',
                    kind: 'how-to demonstration',
                    purpose: 'show how to pair a simple stage prop with a readable pointing pose',
                    importance: 'object interaction starts with clear aiming and staging before deeper contact workflows are needed',
                    demonstration: 'a seeded target prop, the point-right pose, and staging guidance for lining the character up with the object'
                },
                outro: {
                    subject: 'a character pointing interaction',
                    outcome: 'know how to stage a prop, apply a pointing pose, and aim the character toward that object cleanly',
                    nextUse: 'graduate to body tags and contact-aware setups when the scene needs exact pickups or precise hand landings'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'bottom-left',
                voiceoverScript: 'Start by adding a Universal Character by right-clicking an empty part of the stage and choosing Universal Character, then keep the first object interaction simple. Seed one target prop, use a built-in pointing pose so the character clearly directs attention toward it, and only then think about recording it to the timeline. The main lesson is staging first, deeper contact workflows later.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageUniversalCharacterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'To add one manually, right-click any empty part of the stage and choose Universal Character. This walkthrough seeds one next so the lesson can stay on staging and aiming.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureStageUniversalCharacterHowToDemo(runner);
                            await ensureStageUniversalCharacterPointTargetDemo(runner);
                            await scrollStageTutorialPanel('#armature-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This tutorial adds one simple target prop on the stage so the pointing pose has a clear destination to aim at.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.armature-pose-btn[data-pose-key="point-right"]',
                        tip: 'Point Right is the quickest readable interaction pose when the prop sits to the character’s right side on the stage.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-pose-btn[data-pose-key="point-right"]',
                        tip: 'Apply the pointing pose so the character directs attention toward the target prop.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Staging matters as much as the pose. Keep the object in the direction of the extended arm so the interaction reads immediately.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#armature-record-row',
                        tip: 'Preview the pointing pose, set transition and hold time, then Add to Timeline. Previewing alone does not record. Edit Action lets you update the authored beat afterwards.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-howto-bouncing-ball',
                title: 'How to Animate a Bouncing Ball',
                description: 'Seeds a simple circle and uses the Bounce In entry animation to teach pure object motion without any character system.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Circle object', 'Animate tab', 'Entry — Bounce In', 'Emphasis — Pulse', 'Preview and Apply'],
                intro: {
                    subject: 'a bouncing ball animation',
                    kind: 'how-to demonstration',
                    purpose: 'show how pure object animation can carry a scene with no character involved',
                    importance: 'most real explainer beats are still simple shapes, and a confident bounce + pulse pattern reads as energy',
                    demonstration: 'one red circle, Bounce In on entry, Pulse on emphasis, and the standard preview / apply review loop'
                },
                outro: {
                    subject: 'a bouncing ball animation',
                    outcome: 'know how to combine an Entry animation with an Emphasis animation to give any single object a lively feel',
                    nextUse: 'repeat the same pattern on logos, icons, callouts, and product images for short marketing or training beats'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start with one circle so the lesson stays focused on motion rather than drawing. Apply Bounce In so the ball appears with weight instead of just fading in, then layer a Pulse so it keeps a small visual heartbeat after it lands. Finish by previewing the combination and applying it so both animations end up in the Applied Animations list.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageBouncingBallHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStageBouncingBallHowToDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This walkthrough seeds one circle so the lesson can stay focused on motion. Any solid shape can use the same flow.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.anim-subtab-content[data-subtab-content="basic"]',
                        tip: 'Basic is where Entry, Exit, and Emphasis animations live. A bouncing ball usually combines one Entry with one Emphasis.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="entry-bounce"]',
                        tip: 'Bounce In is the right Entry for a ball because the easing already settles like something with weight, instead of fading or flying.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="entry-bounce"]',
                        tip: 'Select Bounce In so the parameter controls switch to its duration and easing.',
                        waitAfter: 260
                    },
                    {
                        action: 'tip',
                        selector: '#param-duration',
                        tip: 'A slightly longer duration sells the weight of the bounce. Around one second usually reads as a real impact.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '1.0',
                        tip: 'Set a one-second bounce so the motion is easy to read on preview.',
                        waitAfter: 140
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview-anim',
                        tip: 'Preview the entry first on its own. Judging it in isolation makes it easier to layer the emphasis after.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('btn-preview-anim')?.click();
                            await runner._wait(1100);
                            window.app?.animations?._cancelAllPreviews?.();
                            window.app?.stage?.requestRender?.();
                            await runner._wait(140);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-apply-anim',
                        tip: 'Apply commits the Bounce In to the Applied Animations list so the next animation layers on top of it instead of replacing it.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Bounce In so it is locked into the scene.',
                        waitAfter: 280
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="emph-pulse"]',
                        tip: 'Pulse is the right Emphasis to pair with a bounce because it keeps the ball feeling alive after it lands without moving it.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="emph-pulse"]',
                        tip: 'Switch the parameter panel to Pulse so the second animation can be tuned independently.',
                        waitAfter: 260
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '0.7',
                        tip: 'A short pulse reads as a heartbeat. Long pulses start to feel like the ball is scaling on purpose.',
                        waitAfter: 140
                    },
                    {
                        action: 'tip',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Pulse so both animations stack in the Applied Animations list for this object.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply Pulse to lock the emphasis beat into the scene.',
                        waitAfter: 280
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'Both animations now live in the Applied Animations list. Editing happens here when the ball needs to be re-timed later.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#stage-tb-play',
                        tip: 'Play from the stage toolbar to review the combined Bounce In and Pulse without leaving the canvas.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(1400);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    }
                ]
            },
            {
                id: 'stage-howto-kinetic-title-card',
                title: 'How to Make a Kinetic Title Card',
                description: 'Seeds a centered headline text object and stacks Zoom In with Pulse to teach the lower-thirds / title-card pattern.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Text object', 'Animate tab', 'Entry — Zoom In', 'Emphasis — Pulse', 'Preview and Apply'],
                intro: {
                    subject: 'a kinetic title card',
                    kind: 'how-to demonstration',
                    purpose: 'show how text and a stacked animation pair can carry an opening or chapter break',
                    importance: 'titles, lower thirds, and chapter markers are the most-reused micro-deliverables in real explainers',
                    demonstration: 'a centered headline, Zoom In for the entrance, and a short Pulse to draw the eye before it settles'
                },
                outro: {
                    subject: 'a kinetic title card',
                    outcome: 'know how to combine a strong text Entry with a subtle Emphasis to make any headline feel intentional',
                    nextUse: 'repeat the same pattern for subtitles, lower thirds, section breaks, and call-outs in any scene'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start with one large centered headline so the lesson stays focused on motion rather than typography choices. Apply Zoom In as the entrance because it reads as a confident arrival, then layer Pulse so the title earns one extra moment of attention before the next scene starts. Finish by reviewing the combined animation from the stage toolbar so the timing is judged in context.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageKineticTitleHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStageKineticTitleHowToDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This walkthrough seeds one centered headline so the focus stays on title-card motion patterns. The same flow works for any text object.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="entry-zoom"]',
                        tip: 'Zoom In is the most reliable Entry for titles because it scales from the centre of the text rather than pushing the layout around.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="entry-zoom"]',
                        tip: 'Select Zoom In so the parameter controls switch to its duration and easing.',
                        waitAfter: 260
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '0.9',
                        tip: 'Slightly longer than the default sells the arrival without feeling slow.',
                        waitAfter: 140
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview-anim',
                        tip: 'Preview the entry first so the duration can be judged before the emphasis is layered on top.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('btn-preview-anim')?.click();
                            await runner._wait(1000);
                            window.app?.animations?._cancelAllPreviews?.();
                            window.app?.stage?.requestRender?.();
                            await runner._wait(140);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Zoom In so the Pulse will stack onto it instead of replacing it.',
                        waitAfter: 280
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="emph-pulse"]',
                        tip: 'Pulse adds a small scale-up beat after the title arrives. It is the cleanest way to draw the eye without moving the layout.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="emph-pulse"]',
                        tip: 'Switch the parameter panel to Pulse so the second animation can be tuned independently.',
                        waitAfter: 260
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '0.6',
                        tip: 'Keep the pulse short. Title cards usually only need a single attention beat before the scene moves on.',
                        waitAfter: 140
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Pulse so both animations stack in the Applied Animations list for the title.',
                        waitAfter: 280
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'Both animations now live on the title. Drag them to reorder if you ever want the pulse before the entrance for a different feel.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#stage-tb-play',
                        tip: 'Play from the stage toolbar to review the title card in context, then refine timing if the pulse feels too eager.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(1400);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    }
                ]
            },
            {
                id: 'stage-howto-before-after-split',
                title: 'How to Build a Before / After Split Reveal',
                description: 'Seeds two side-by-side labelled panels and uses Fly In Left and Fly In Right to teach the comparison-reveal pattern.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Rectangle and text objects', 'Animate tab', 'Entry — Fly In Left / Fly In Right', 'Preview and Apply'],
                intro: {
                    subject: 'a before / after split reveal',
                    kind: 'how-to demonstration',
                    purpose: 'show how two opposing entry animations can frame a comparison without any extra layout work',
                    importance: 'comparison beats — before/after, problem/solution, old/new — are one of the most common explainer patterns',
                    demonstration: 'a grey BEFORE panel that flies in from the left and a green AFTER panel that flies in from the right'
                },
                outro: {
                    subject: 'a before / after split reveal',
                    outcome: 'know how to pair opposing entry animations on two objects so a comparison reads as a single deliberate beat',
                    nextUse: 'reuse the pattern for problem / solution screens, old / new product shots, or two competing approaches'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Comparisons land harder when the two halves arrive from opposite sides. Apply Fly In Left to the BEFORE panel and Fly In Right to the AFTER panel so they meet in the middle, then play the timeline so the reveal reads as one motion. The same pattern works for any two-state comparison.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageBeforeAfterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStageBeforeAfterHowToDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Two panels are seeded side by side. The walkthrough animates each one from its own outer edge so they meet in the middle.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await selectStageBeforeAfterPanel(runner, 'before');
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="entry-fly-left"]',
                        tip: 'Fly In Left is the right entry for the BEFORE panel because it enters from the same side it already lives on.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="entry-fly-left"]',
                        tip: 'Select Fly In Left so the parameter controls switch to its duration and easing.',
                        waitAfter: 260
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '0.9',
                        tip: 'A slightly longer duration sells the arrival without dragging the comparison.',
                        waitAfter: 140
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply Fly In Left so the BEFORE panel has its entry locked in.',
                        waitAfter: 280
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                        }
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await selectStageBeforeAfterPanel(runner, 'after');
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="entry-fly-right"]',
                        tip: 'Fly In Right is the mirror of the BEFORE entry. Pairing opposing directions is what makes the split reveal read as a single beat.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="entry-fly-right"]',
                        tip: 'Select Fly In Right so the parameter controls switch to its duration.',
                        waitAfter: 260
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '0.9',
                        tip: 'Match the BEFORE duration so the two panels meet in the middle at the same moment.',
                        waitAfter: 140
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply Fly In Right so both panels now have their entry animations.',
                        waitAfter: 280
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-tb-play',
                        tip: 'Play from the stage toolbar to review the split reveal. Both panels should arrive together and meet in the middle.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(1800);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    }
                ]
            },
            {
                id: 'stage-howto-character-sit-on-chair',
                title: 'How to Pose a Character on a Chair',
                description: 'Seeds a side-view Universal Character, applies the Sitting Chair pose first, then adds a simple chair prop aligned to the seated result for reference.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Universal Character (side view)', 'Pose Armature panel', 'Sitting Chair pose', 'Optional rectangle chair prop'],
                intro: {
                    subject: 'a seated character on a chair',
                    kind: 'how-to demonstration',
                    purpose: 'show the honest seated workflow the app illustrates well: use the Sitting Chair pose first, then add a simple chair prop only as a visual reference if needed',
                    importance: 'seated characters are common in desk scenes, interviews, waiting-room beats, and classroom setups, but they only read well when the chair height and pose line up',
                    demonstration: 'a side-view character, the Pose Armature panel, the Sitting Chair pose, and a simple chair prop aligned afterward to the seated result'
                },
                outro: {
                    subject: 'a seated character on a chair',
                    outcome: 'know how to apply the Sitting Chair pose first, add a chair reference afterward if needed, and judge whether the seated setup reads cleanly on stage',
                    nextUse: 'reuse the same setup for desk work, table scenes, interview shots, and any stage composition that needs a seated character without pretending there is a full sit-down transition'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Treat this as a seated setup rather than a fully authored sit-down animation. Start with the side-view character and use the Sitting Chair pose from the Pose Armature panel as the reliable seated reference. Once the body lands correctly, add a simple chair prop only if you want a visible support line in the composition. That keeps the tutorial honest: the pose is what does the work, and the chair is only there afterward as a visual check.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageChairHowToState(runner);
                    await restoreStageUniversalCharacterHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            const primary = await ensureStageUniversalCharacterHowToDemo(runner, { view: 'side', sideFacing: 'right' });
                            if (!primary?.root) return;
                            await focusStageViewportOnStageCorridor(runner, primary, { fillRatio: 0.94, minZoom: 0.3, maxZoom: 1.8 });
                            await scrollStageTutorialElementIntoView('.armature-pose-btn', runner, {
                                textMatch: 'Sitting (Chair)'
                            });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Start with an imaginary chair. This tutorial uses the built-in Sitting Chair pose as the honest seated reference first, then adds a simple chair prop afterward only if it helps the composition read more clearly.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#armature-panel',
                        tip: 'The Pose Armature panel is where the seated setup is controlled. Static poses are the practical route here because the app already exposes the seated reference directly.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.armature-pose-btn',
                        textMatch: 'Sitting (Chair)',
                        tip: 'Sitting Chair is the correct built-in pose for this setup. Apply it directly when the goal is a seated composition rather than a fully animated sit-down sequence.',
                        readingWeight: 'extra-long',
                        ms: 1250,
                        pad: 8
                    },
                    {
                        action: 'click',
                        selector: '.armature-pose-btn',
                        textMatch: 'Sitting (Chair)',
                        tip: 'Apply the Sitting Chair pose so the character settles onto the chair.',
                        waitAfter: 320,
                        pad: 8
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const armature = getStageUniversalCharacterHowToLiveArmature(runner);
                            const root = armature?.root || null;
                            const seatY = root
                                ? Math.round(root.y + (Math.abs(root.height || 240) * 0.7))
                                : null;
                            await ensureStageChairHowToDemo(runner, {
                                offsetX: 0,
                                seatY
                            });
                            if (armature) {
                                await focusStageViewportOnStageCorridor(runner, armature, { fillRatio: 0.94, minZoom: 0.3, maxZoom: 1.8 });
                            }
                            await scrollStageTutorialElementIntoView('#armature-record-row', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The chair is added only after the pose lands, so it acts as a visual check instead of fighting the setup. If the overlap still feels off, nudge the chair prop until the seated silhouette reads cleanly.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#armature-record-row',
                        tip: 'Set the pose transition and hold, then Add to Timeline. For compatible views, Activity Kit supplies matching furniture. Use Sit to Stand for rising; this held sitting pose does not include that movement.',
                        readingWeight: 'long',
                        ms: 1150,
                        pad: 8
                    }
                ]
            },
            {
                id: 'stage-howto-roll-ball-across-stage',
                title: 'How to Roll a Ball Across the Stage',
                description: 'Adds a circle, applies the Roll motion preset, and shows how rotation and translation combine into a believable rolling beat.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Circle object', 'Motion preset \u2014 Roll (topple-line)', 'Duration parameter'],
                intro: {
                    subject: 'rolling a ball across the stage',
                    kind: 'how-to demonstration',
                    purpose: 'show how the Roll motion preset combines straight-line travel with rotation so a ball reads as rolling rather than sliding',
                    importance: 'rolling motion is the cleanest demonstration of why an object\u2019s rotation needs to match its travel \u2014 the same principle applies to wheels, gears, and any prop that turns as it moves',
                    demonstration: 'a circle being given the Roll preset, having its duration tuned, and playing back as a rolling ball across the stage'
                },
                outro: {
                    subject: 'rolling a ball across the stage',
                    outcome: 'know how to use the Roll preset, tune its duration, and read the result as a believable rolling motion rather than a sliding shape',
                    nextUse: 'reuse Roll for wheels, gears, cylinders, and any prop where the rotation needs to track the travel distance'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Rolling is what happens when rotation tracks travel distance. The Roll preset bakes that relationship in, so a circle gets the right number of turns for the distance it covers. Tuning the duration changes how fast the ball rolls without breaking that lock between turning and moving.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageRollingBallHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await ensureStageRollingBallHowToDemo(runner);
                            await resetStageCameraToFullView(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'A red ball is on the left side of the stage and already selected. The Roll preset will turn its position change into a rolling beat across the stage.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="topple-line"]',
                        tip: 'Roll is the motion preset that combines straight-line travel with the matching rotation. It is the right choice for any prop that turns as it moves.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="topple-line"]',
                        tip: 'Select Roll so its parameters open in the panel below.',
                        waitAfter: 280
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '2.0',
                        tip: 'A two-second roll lets the ball cover the stage at a readable speed. Shorter durations look frantic; longer ones look like a slow roll-to-stop.',
                        waitAfter: 160
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview-anim',
                        tip: 'Preview the Roll so the rotation and travel can be judged before it is committed to the scene.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('btn-preview-anim')?.click();
                            await runner._wait(2300);
                            window.app?.animations?._cancelAllPreviews?.();
                            window.app?.stage?.requestRender?.();
                            await runner._wait(160);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Roll so it stays on the ball as part of the scene.',
                        waitAfter: 280
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'Roll now sits in the Applied Animations list. Any change to its duration from here will keep the rotation locked to the travel distance.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The same Roll preset works for wheels, gears, cylinders, and any prop where the turn needs to match the travel.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#stage-tb-play',
                        tip: 'Play the stage once at the end so the finished roll reads as real motion, not just as settings in the panel.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            setStagePlayheadTime(0);
                            await runner._wait(120);
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(2300);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    }
                ]
            },
            {
                id: 'stage-howto-add-soundtrack',
                title: 'How to Add a Soundtrack to the Timeline',
                description: 'Loads an audio clip onto the timeline, shows the waveform, and explains how playback stays in sync with the stage.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Timeline audio upload button', 'Audio waveform track', 'Remove audio button'],
                intro: {
                    subject: 'adding a soundtrack to the timeline',
                    kind: 'how-to demonstration',
                    purpose: 'show how to load an audio clip, see its waveform on the timeline, and rely on it as the timing reference for the rest of the scene',
                    importance: 'having the soundtrack on the timeline is what lets the rest of the animation be timed against beats and pacing rather than guessed in isolation',
                    demonstration: 'a short demo clip being loaded onto the audio track and the waveform appearing under the timeline'
                },
                outro: {
                    subject: 'adding a soundtrack to the timeline',
                    outcome: 'know where the audio upload control lives, what the waveform represents, and how to remove the soundtrack when it is no longer needed',
                    nextUse: 'load a voiceover or music bed first whenever the scene\u2019s timing needs to lock to audio rather than be invented from scratch'
                },
                defaultPace: 'slow',
                voiceoverScript: 'A soundtrack on the timeline is the easiest way to lock pacing to something concrete. The audio upload button on the timeline opens a file picker and renders the clip as a waveform under the timeline. Playback stays in sync because the timeline drives the audio element, so scrubbing and playing move both together.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageDemoSoundtrack(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await resetStageCameraToFullView(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tl-audio-upload',
                        tip: 'This music icon adds audio to the timeline. Add voiceover, music, or sound effects as separate tracks; all loaded tracks play together.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '#tl-audio-upload',
                        tip: 'For this walkthrough we will load a short demo beat directly so the waveform appears without you having to pick a file.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await seedStageDemoSoundtrack(runner, { durationSec: 4, frequency: 220 });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.audio-clip-bar',
                        tip: 'Each audio file gets its own timeline row. Drag the clip to set when it starts, or drag either edge to adjust its in and out points.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '.audio-clip-waveform',
                        tip: 'The waveform is drawn inside the clip. Align multiple rows to play together, or stagger their positions to control which sound plays first and by how long.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '.audio-row-remove',
                        tip: 'This remove button deletes only this audio row. The nearby edit button opens exact timing, trim, volume, and character lip-sync controls.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'With a soundtrack loaded, the rest of the timing work becomes about lining animation events up to the waveform you can see.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-howto-time-reveal-to-soundtrack',
                title: 'How to Time a Title Card to the Soundtrack',
                description: 'Loads a demo soundtrack, uses the visible waveform as a guide, and tunes a title card entry until the reveal feels aligned to the beat.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'How-To',
                audience: 'Stage users',
                toolCoverage: ['Audio waveform track', 'Entry \u2014 Zoom In animation', 'Duration parameter', 'Preview button'],
                intro: {
                    subject: 'timing a title card to the soundtrack',
                    kind: 'how-to demonstration',
                    purpose: 'show how the audio waveform on the timeline can guide a title timing pass without pretending the app is doing automatic beat detection',
                    importance: 'when motion and audio feel aligned the scene reads as deliberate, and the waveform gives you a practical timing reference instead of guessing by eye',
                    demonstration: 'a seeded title card, a loaded soundtrack, and a Zoom In duration being adjusted against the visible beat spacing'
                },
                outro: {
                    subject: 'timing a title card to the soundtrack',
                    outcome: 'know how to use the loaded waveform as a timing guide, set an animation duration for a first pass, and preview until the reveal feels scored correctly',
                    nextUse: 'apply the same approach to logo stings, lower-thirds, and any reveal where the audio defines when the visual should land'
                },
                defaultPace: 'slow',
                voiceoverScript: 'When the soundtrack is already loaded, the waveform becomes a practical timing guide for the rest of the scene. Start with the visible beat spacing, set the title card animation to roughly match that spacing, then preview and refine until the visual punch feels aligned with the audio. The app is not auto-snapping to beats here; you are using the waveform as the scoring guide.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageDemoSoundtrack(runner);
                    await restoreStageKineticTitleHowToState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await ensureStageKineticTitleHowToDemo(runner);
                            await seedStageDemoSoundtrack(runner, { durationSec: 4, frequency: 220 });
                            await setStagePanelCollapsed('timeline-panel', 'collapse-timeline', false, runner);
                            await resetStageCameraToFullView(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.audio-clip-bar',
                        tip: 'The demo soundtrack is already on the timeline. The visible beats are roughly half a second apart, which gives us a practical first timing target for the title card.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The title is selected and ready for an entry animation. The goal is for it to land on a beat rather than arrive at a random time.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="entry-zoom"]',
                        tip: 'Zoom In gives the title a punchy, beat-friendly arrival. Its duration is what we will tune to match the audio.',
                        waitAfter: 280
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '0.5',
                        tip: 'Half a second is a good first pass because it roughly matches the visible beat spacing. Apply the reveal next, then play the timeline so the title and soundtrack can be judged together.',
                        waitAfter: 160
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the Zoom In so it stays on the title as part of the scene.',
                        waitAfter: 280
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'The reveal is now in the applied animations list at a duration tuned to the soundtrack. If the audio later changes, this duration is the one to revisit.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '#tl-play',
                        tip: 'Use timeline playback for the real sync check. That is the control that plays the authored stage animation together with the loaded soundtrack.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            setStagePlayheadTime(0);
                            await runner._wait(120);
                            document.getElementById('tl-play')?.click();
                            await runner._wait(1600);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The same pattern \u2014 load audio, read the beat spacing, match a duration to it \u2014 works for logos, lower-thirds, and any reveal that needs to feel scored.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-output-and-templates',
                title: 'Stage Output and Templates',
                description: 'Walks through preview, export settings, and the reusable animation template library on the main stage.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Basic Mode users',
                nextTutorialId: 'stage-power-features-workflow',
                toolCoverage: ['Output menu', 'Template library', 'Export modal', 'Export settings', 'Preview'],
                intro: {
                    subject: 'Stage Output and Templates',
                    kind: 'toolset',
                    purpose: 'preview motion, reuse animation presets, and configure exports from the main stage',
                    importance: 'it shapes how work is reviewed and delivered',
                    demonstration: 'the template library, export settings, and preview'
                },
                outro: {
                    subject: 'Stage Output and Templates',
                    outcome: 'review motion, reuse presets, and prepare stage work for export',
                    nextUse: 'finalize animation output more efficiently from the main stage'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Open the Output menu to review the main delivery and reuse workflow on the stage. First, open the template library to show how preset motion patterns can be applied quickly. Then return to Output, open the export modal, and select a format so the settings panel becomes visible. This is the appropriate moment to explain export choices such as format, resolution, frame rate, and delivery options. Close the export modal and finish by highlighting Preview as the fastest way to review motion before exporting.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-output"]',
                        tip: 'Open the Output menu to access exports and reusable animation templates.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-templates',
                        tip: 'Template presets help you apply a polished motion pattern quickly.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#template-library-modal:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#template-library-grid',
                        tip: 'The template library opens in a dedicated modal, which makes it easy to record curated starter motions.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#template-library-modal .modal-close',
                        tip: 'Close the template library and move on to export options.',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-output"]',
                        tip: 'Open Output again for the export workflow.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-export',
                        tip: 'Export opens the full set of delivery formats for stage projects.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#export-modal:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'click',
                        selector: '#export-modal .export-option[data-format="html5"]',
                        tip: 'Select a format to reveal its settings without starting a download.',
                        waitAfter: 150
                    },
                    {
                        action: 'waitFor',
                        selector: '#export-settings:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#export-settings',
                        tip: 'The export settings panel is where the tutorial can explain resolution, FPS, and format-specific options.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '#export-modal .modal-close',
                        tip: 'Close the export modal and return to the stage workspace.',
                        waitAfter: 350
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Preview opens a live playback window, which is useful for narrating the motion before a full export.',
                        ms: 1200
                    }
                ]
            },
            {
                id: 'stage-power-features-workflow',
                title: 'Power Features — Dope Sheet, Onion Skin, Custom Easing & Symbols',
                description: 'Shows how one real applied motion can be retimed, ghosted, reused, and refined with the Stage power-feature toolset.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Stage users',
                toolCoverage: ['Movement animation', 'Applied Animations list', 'Dope Sheet', 'Onion Skin', 'Symbols Library', 'Easing Curve Editor'],
                intro: {
                    subject: 'the Stage power-features workflow',
                    kind: 'deep dive',
                    purpose: 'show how advanced timing, ghosting, reuse, and easing tools connect back to one real animation already on the stage',
                    importance: 'these controls are most useful after a simple move already exists, because they refine and reuse motion instead of replacing the basic animation flow',
                    demonstration: 'a seeded linear move, the dope sheet, onion skin settings, symbol conversion, and the re-apply custom easing path'
                },
                outro: {
                    subject: 'the Stage power-features workflow',
                    outcome: 'know where to retime motion, inspect in-betweens, prepare reusable components, and refine one animation with a custom curve',
                    nextUse: 'tighten hero shots, repeated UI elements, and polished motion beats without rebuilding the whole animation from scratch'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start with one selected demo object and apply a simple Linear Move so every advanced tool has real motion to inspect. Open the Dope Sheet to show cross-object timing, turn on Onion Skin to expose before-and-after ghost frames, and open Symbols to point out how selected artwork becomes a reusable master. Finish by clicking the applied animation row, switching easing to Custom, and reopening the real Bezier editor so the audience sees that custom curves are edited through re-apply, not through a disconnected mock control.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePowerFeaturesWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStagePowerFeaturesWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-btn[data-anim="linear-move"]',
                        tip: 'A simple Linear Move is enough to make the power-feature lesson truthful, because the later tools are meant to refine a real animation rather than teach motion from an empty state.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="linear-move"]',
                        tip: 'Select Linear Move so the params panel and Applied Animations list have a concrete animation to work with.',
                        waitAfter: 240
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '1.6',
                        tip: 'Set a readable duration so the demo move is long enough for retiming, onion skin, and easing refinement to make sense.',
                        waitAfter: 120
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the move first. The rest of this lesson depends on having one real animation row on the selected object.',
                        waitAfter: 240
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                            setStagePlayheadTime(800);
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#btn-open-dope-sheet',
                        tip: 'Open the Dope Sheet to move from single-object animation setup into the cross-object timing view used for retiming scenes.',
                        waitAfter: 200
                    },
                    {
                        action: 'waitFor',
                        selector: '#dope-sheet-modal:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#dope-sheet-canvas',
                        tip: 'The Dope Sheet turns each animated property into a timing row, which is why it becomes the best place to seek, drag, and retime motion once a scene grows beyond one object.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#dope-sheet-close',
                        tip: 'Close the Dope Sheet and return to the stage so the next power feature can inspect the same motion from a different angle.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '#btn-onion-skin',
                        tip: 'Turn Onion Skin on so the current playhead can show ghosted frames before and after the selected moment.',
                        waitAfter: 180
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const button = document.getElementById('btn-onion-skin');
                            button?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#onion-skin-popover',
                        timeout: 2500
                    },
                    {
                        action: 'tip',
                        selector: '#onion-skin-popover',
                        tip: 'The settings popover is the control point for how many before-and-after frames are shown, how far apart they are, and how strong the overlay should feel.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('onion-skin-popover')?.remove();
                            await runner._wait(120);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#btn-open-symbols',
                        tip: 'Open Symbols next, because reusable components become more valuable once a motion pattern is worth repeating across several stage elements.',
                        waitAfter: 220
                    },
                    {
                        action: 'waitFor',
                        selector: '#symbols-modal:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#symbols-convert-selection',
                        tip: 'Convert Selection to Symbol is the bridge from one edited object into a reusable master-plus-instance workflow, which is why the tutorial keeps a real selected object ready before opening this panel.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#symbols-panel-close',
                        tip: 'Close Symbols and return to the animation inspector, because the final power feature edits the same move through re-apply mode.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '#applied-anim-list .applied-anim-item',
                        tip: 'Click the applied animation row itself. That is the truthful route into re-apply mode and custom easing for a library animation that already exists on the object.',
                        waitAfter: 220
                    },
                    {
                        action: 'waitFor',
                        selector: '#reapply-banner:not(.hidden)',
                        timeout: 2500
                    },
                    {
                        action: 'tip',
                        selector: '#reapply-banner',
                        tip: 'The re-apply banner confirms that the editor is now modifying the existing animation instead of adding a second overlapping move.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const easingField = document.getElementById('param-easing');
                            if (easingField) {
                                easingField.value = 'custom';
                                easingField.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#easing-editor-modal:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#easing-editor-modal .easing-presets',
                        tip: 'The Easing Curve Editor is where custom timing becomes visual. Presets give a fast starting point before the curve is applied back into the selected animation.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '.easing-preset-btn[data-preset="0.68,-0.55,0.27,1.55"]',
                        tip: 'Choose a preset curve so the custom-easing change is visible without asking the tutorial to drag control handles manually.',
                        waitAfter: 160
                    },
                    {
                        action: 'click',
                        selector: '#btn-easing-apply',
                        tip: 'Apply writes the chosen bezier back into the easing field, but the motion is not updated on the object until the main Re-apply button is pressed.',
                        waitAfter: 220
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim.reapply-mode',
                        tip: 'Re-apply commits the new custom curve onto the existing move, which completes the real power-features loop from base motion into refined timing.',
                        waitAfter: 260
                    }
                ]
            },
            {
                id: 'stage-help-and-smartart',
                title: 'Stage Help and SmartArt Handoff',
                description: 'Explains where in-app help lives, how Teach Me answers workflow questions without leaving the stage, and when to hand off to the SmartArt workspace for diagrams.',
                path: {
                    id: 'start-here',
                    title: 'Start Here',
                    summary: 'Begin with the overview, map the live workspace, then learn the built-in support and handoff surfaces before moving into deeper task tutorials.',
                    order: 1
                },
                format: 'Workflow',
                audience: 'All users',
                nextTutorialId: 'stage-basic-mode-workflow',
                toolCoverage: ['Tools menu', 'Demo Tour', 'Teach Me', 'Go menu', 'SmartArt entry point', 'Feedback'],
                intro: {
                    subject: 'Stage help tools and the SmartArt handoff',
                    kind: 'workflow',
                    purpose: 'show where guidance lives inside the editor and when a diagram is better authored in the SmartArt workspace instead of on the main stage',
                    importance: 'most users only discover Teach Me, the Demo Tour, and the SmartArt handoff by accident — this tour makes those entry points deliberate so you reach for them when you are actually stuck',
                    demonstration: 'Demo Tour, Teach Me with a real question and answer, the SmartArt workspace entry, and the feedback channel'
                },
                outro: {
                    subject: 'Stage help tools and the SmartArt handoff',
                    outcome: 'know exactly where to ask the app a question, replay the first-run tour, hand off to SmartArt, or report a problem — without breaking your current edit',
                    nextUse: 'reach for in-app help and SmartArt deliberately instead of guessing or context-switching to external docs'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Before opening any menu, take a moment to frame why this tutorial matters. Most new users never find Teach Me, never replay the Demo Tour, and never realize SmartArt is a separate workspace designed for diagrams. The result is that they fight the main stage to build org charts and process flows when there is a better tool one click away. This tour fixes that. Open the Tools menu and point out the Demo Tour as the replayable first-run experience. Open Teach Me next, type a real question, and let the assistant answer so the audience sees that workflow help is genuinely in-context. Then open the Go menu — this is the bridge into SmartArt, the diagram-focused workspace. Close on the feedback button so users know the team is listening when something breaks.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Most users discover help by accident — this short tour makes the three main support surfaces deliberate so you reach for them when you actually need them, not only when stuck.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-tools"]',
                        tip: 'Open the Tools menu to access guided help and utility workflows.',
                        waitAfter: 300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-demo-tour',
                        tip: 'The Demo Tour is the replayable first-run experience. Use it any time you want a guided tour of the main stage — it never disappears after the first run.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me',
                        tip: 'Teach Me opens the in-app assistant for workflow explanations while you stay in the stage editor.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#teach-me-panel:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#teach-me-messages',
                        tip: 'The assistant panel is in-context, so the answers it gives reference real toolbar buttons, panels, and menus you can see while reading.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'input',
                        selector: '#teach-me-input',
                        value: 'How do I move objects and export an animation?',
                        tip: 'Type a natural-language question to demonstrate the help assistant.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me-send',
                        tip: 'Send the question and wait for the response so the recorded walkthrough stays aligned with what Teach Me actually returns.',
                        waitAfter: 250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForTeachMeResponse(runner);
                            await scrollTeachMeToLatestAnswerStart(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#teach-me-messages',
                        tip: 'Teach Me is most useful for workflow questions like “how do I…” or “where is the…” — for deep feature reference, the dedicated tutorials are still the better source.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'click',
                        selector: '#btn-teach-me-close',
                        tip: 'Close the assistant and return to the main toolbar.',
                        waitAfter: 350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await closeTeachMeDiscussion(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-go"]',
                        tip: 'The Go menu is the handoff point for moving into SmartArt mode.',
                        waitAfter: 300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-smartart',
                        tip: 'SmartArt is a separate workspace built for diagrams — org charts, process flows, timelines, comparisons. When you need a structured visual, author it there and the finished diagram flows back into the main stage.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'tip',
                        selector: '#btn-stage-feedback',
                        tip: 'Feedback stays one click away. If a tutorial step breaks, a workflow feels confusing, or a feature is missing, this is the channel that reaches the team directly.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    }
                ]
            },
            {
                id: 'stage-basic-mode-workflow',
                title: 'Basic Mode Editing Workflow',
                description: 'Shows the direct-edit flow for choosing tools, reviewing objects, adjusting properties, and preparing animations in Basic Mode.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Basic Mode users',
                nextTutorialId: 'stage-ai-mode-prompt-output',
                toolCoverage: ['Basic Mode', 'Tools tab', 'Objects tab', 'Properties tab', 'Animate tab', 'Scene bar'],
                intro: {
                    subject: 'the Basic Mode editing workflow',
                    kind: 'workflow',
                    purpose: 'show the main direct-edit path from tool choice to object review and animation setup',
                    importance: 'it is the fastest way to understand how most manual stage work is built and refined',
                    demonstration: 'tools, object inventory, properties, animation builders, and scene-level context'
                },
                outro: {
                    subject: 'the Basic Mode editing workflow',
                    outcome: 'know where to build, inspect, refine, and animate work without leaving the direct editor',
                    nextUse: 'move into AI-assisted planning or timing workflows with a stronger mental model of the manual stage'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Stay in Basic Mode and walk through the direct editing sequence on the stage. Start with the tool and canvas relationship, then switch to the object list so the inventory view is clear. Move into the properties panel to show where selection-based editing happens, and then open the animation tab so the entry, emphasis, and applied-animation flow is easy to understand. Finish by highlighting the scene bar, because scene structure is the container that makes the rest of the editing workflow meaningful.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchLeftPanelTab('tools', runner);
                            await switchRightPanelTab('properties', runner);
                            await switchAnimationSubtab('basic', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#mode-toggle',
                        tip: 'Basic Mode is the manual editing surface, so this is the right place to start when you want direct control over stage objects and timing.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '#tab-tools',
                        tip: 'The workflow starts in Tools because this panel is where shapes, text, images, icons, and stage-level helpers enter the project.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The center stage is where those tools become visible composition, so the workflow is always a loop between panels and this canvas.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchLeftPanelTab('objects', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-objects',
                        tip: 'Switch to Objects to review what is already on stage, rename items, and keep layered scenes understandable as they grow.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('properties', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#tab-properties',
                        tip: 'Properties is the next stop in the workflow because this is where selected objects are refined with transform, style, image, and other editing controls.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-subtab-content[data-subtab-content="basic"]',
                        tip: 'After the object looks right, the Basic animation builders are the fastest path into entry, exit, and emphasis motion.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'The applied animation list is the checkpoint that tells you what motion is already attached before you move into deeper timing work.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#scene-bar',
                        tip: 'Finish on the scene bar, because every direct-edit workflow eventually scales from one scene into a multi-scene sequence.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-ai-mode-prompt-output',
                title: 'AI Mode Prompt to Plan Workflow',
                description: 'Shows how AI Mode turns a natural-language prompt into a reviewable action plan and execution preview before anything is run.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'AI Mode users',
                nextTutorialId: 'stage-timeline-preview-export',
                toolCoverage: ['AI Mode', 'Prompt box', 'Prompt guide', 'Generate Plan', 'Action Plan', 'Execution Preview'],
                intro: {
                    subject: 'the AI Mode prompt-to-plan workflow',
                    kind: 'workflow',
                    purpose: 'show how prompt-driven work becomes a reviewable plan before it changes the stage',
                    importance: 'it makes AI assistance easier to narrate, review, and trust',
                    demonstration: 'a practical prompt, the guide, the generated plan, and the execution preview'
                },
                outro: {
                    subject: 'the AI Mode prompt-to-plan workflow',
                    outcome: 'understand how to move from prompt writing into plan review without giving up control',
                    nextUse: 'use AI to scaffold app workflows or animation ideas while keeping the result reviewable'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Switch into AI Mode and treat it as a review-first workflow instead of a blind automation button. Open the prompt guide so users can see the built-in writing help, then enter a simple app-action request that does not depend on existing stage objects. Generate the plan, wait for the action plan and execution preview to appear, and explain that the stage has not changed yet because the plan still needs review. Finish by highlighting the Run Plan button as the point where reviewed intent becomes an actual workspace action.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('ai', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#ai-prompt',
                        tip: 'AI Mode starts with the prompt box, where users describe the workflow or motion they want in plain language.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-ai-help-toggle',
                        tip: 'Open the prompt guide first so the tutorial shows that help for writing better prompts is already built into the workflow.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#ai-prompt-guide',
                        tip: 'The guide gives examples, targeting rules, and prompt structure, which makes AI Mode easier to use consistently during real production.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-ai-guide-close',
                        tip: 'Close the guide and move into a real prompt so the next steps stay focused on the review flow.',
                        waitAfter: 220
                    },
                    {
                        action: 'input',
                        selector: '#ai-prompt',
                        value: 'open Teach Me so I can ask for workflow help',
                        tip: 'Use a clear app-action prompt here because it reliably produces a plan without needing existing objects on the stage.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '#btn-ai-generate',
                        tip: 'Generate the plan and wait for the reviewed result instead of assuming the prompt completed instantly.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAiPlan(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#ai-action-plan',
                        tip: 'The action plan explains what AI intends to do before anything is applied, which is the core trust layer in this workflow.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#ai-code-output',
                        tip: 'Execution Preview sits beside the plan so prompt-driven work can still be inspected, narrated, and refined like an editable workflow.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-ai-apply',
                        tip: 'Run Plan is the decision point: review first, then apply only when the plan matches what you actually want the stage to do.',
                        readingWeight: 'long',
                        ms: 1200
                    }
                ]
            },
            {
                id: 'stage-timeline-preview-export',
                title: 'Timeline, Preview, and Export Workflow',
                description: 'Walks through the scene bar, timeline controls, preview checkpoint, and export handoff as one delivery-focused stage workflow.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-assets-media-workflow',
                toolCoverage: ['Scene bar', 'Timeline controls', 'Timeline ruler', 'Audio track', 'Preview', 'Export modal'],
                intro: {
                    subject: 'the timeline, preview, and export workflow',
                    kind: 'workflow',
                    purpose: 'show where sequencing, review, and delivery happen after the core edit work is prepared',
                    importance: 'it connects stage composition to timing and final output',
                    demonstration: 'scene structure, timeline controls, preview, and export settings'
                },
                outro: {
                    subject: 'the timeline, preview, and export workflow',
                    outcome: 'know where to review motion timing and where export preparation starts',
                    nextUse: 'move from editing into timing and delivery with less backtracking'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start with the scene bar to show the sequence container above the timeline. Then move into the timeline controls, ruler, and tracks so playback, duration, and timing layout are clear. Highlight audio upload because sound often changes how timing is reviewed. After that, point to Preview as the fast review checkpoint and finish by opening Export so the user sees where review turns into delivery settings.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            closeStageTransientUi();
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#scene-bar',
                        tip: 'The delivery workflow starts with scenes, because the sequence of scenes shapes everything that will appear in the timeline below.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '#timeline-panel',
                        tip: 'The timeline is the main timing surface for playback, editing, duration control, and animation review across the whole stage.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#timeline-ruler',
                        tip: 'The ruler is where you read timing and navigate precise animation positions instead of relying on rough visual guesses.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#tl-play',
                        tip: 'Playback, stop, and range controls are grouped here because review starts with repeatable transport before export ever happens.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#tl-duration',
                        tip: 'Duration is editable directly in the timeline header, which matters when you need timing changes before your final preview or export.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#tl-audio-upload',
                        tip: 'Audio upload is part of the same workflow because timing against narration or music often changes how motion is refined.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview',
                        tip: 'Preview is the lightweight review checkpoint, so you can inspect motion before opening the heavier export flow.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-output"]',
                        tip: 'Open Output to finish the workflow at the delivery handoff.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-export',
                        tip: 'Export opens the actual delivery modal where review turns into format and settings choices.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#export-modal:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'click',
                        selector: '#export-modal .export-option[data-format="html5"]',
                        tip: 'Choose a format so the export settings panel becomes visible for explanation.',
                        waitAfter: 150
                    },
                    {
                        action: 'waitFor',
                        selector: '#export-settings:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#export-settings',
                        tip: 'This is where delivery settings such as format-specific options, timing, and output choices become concrete.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#export-modal .modal-close',
                        tip: 'Close Export and continue to the supporting media workflow.',
                        waitAfter: 350
                    }
                ]
            },
            {
                id: 'stage-assets-media-workflow',
                title: 'Assets and Media Workflow',
                description: 'Shows how reusable stage media is introduced through tools and the assets library without leaving the main workspace.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                toolCoverage: ['Tools tab', 'Image tool', 'Assets library', 'Asset search', 'Asset preview', 'Asset upload'],
                intro: {
                    subject: 'the assets and media workflow',
                    kind: 'workflow',
                    purpose: 'show how reusable files and visual media enter the stage without breaking the editing flow',
                    importance: 'it reduces rebuild work and keeps stage production consistent across projects',
                    demonstration: 'the image tool and the filesystem-backed assets library'
                },
                outro: {
                    subject: 'the assets and media workflow',
                    outcome: 'know where to find reusable stage assets and where to preview or upload them',
                    nextUse: 'reuse visuals faster instead of rebuilding or reimporting the same material repeatedly'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start in the Tools tab and point out the image tool as one of the most common ways visual media enters the stage. Then move into the Output menu and open the assets library. This is the reusable media workflow: upload, refresh, search, preview, and import from one place. Finish by closing the modal so the stage remains ready for the next handoff tutorial.',
                beforeStart: 'prepareStageTutorial',
                nextTutorialId: 'stage-character-image-workflow',
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchLeftPanelTab('tools', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.tool-btn[data-tool="image"]',
                        tip: 'The image tool is one of the clearest entry points for stage media, so it is the right visual anchor for this workflow.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-output"]',
                        tip: 'Open Output to move from direct placement tools into reusable media management.',
                        waitAfter: 300
                    },
                    {
                        action: 'click',
                        selector: '#btn-assets',
                        tip: 'Assets opens the reusable library for saved visuals, grouped parts, and other importable stage material.',
                        waitAfter: 500
                    },
                    {
                        action: 'waitFor',
                        selector: '#asset-library-modal:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#btn-assets-upload',
                        tip: 'Upload is the top-level entry for adding new files into the reusable library instead of treating every import as one-off work.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#asset-library-search',
                        tip: 'Search matters once the library grows, because reusable media only saves time if it can be found quickly.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#asset-library-grid',
                        tip: 'The asset grid is the browse-and-pick surface for recorded tutorials and real production work alike.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#asset-library-preview',
                        tip: 'Preview keeps imports deliberate, because users can inspect an asset before it enters the current stage composition.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#asset-library-modal .modal-close',
                        tip: 'Close the assets library and continue into the character and image workflow.',
                        waitAfter: 350
                    }
                ]
            },
            {
                id: 'stage-character-image-workflow',
                title: 'Character and Image Workflow',
                description: 'Shows how Stage routes single-image cutouts, separated-part assemblies, and generated characters through the Image Tools and Cutout Joints workflow.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-face-rig-micro-tour',
                toolCoverage: ['Image tool', 'Image Tools', 'Body Stencil', 'Smart Cut', 'Cutout Joints & Assembly', 'Guided Assembly'],
                intro: {
                    subject: 'the character and image workflow',
                    kind: 'workflow',
                    purpose: 'show how one selected image turns into the right cutout, assembly, or generated-character path',
                    importance: 'it prevents users from mixing advanced deform tools with the faster cutout-and-rig routes meant for character animation',
                    demonstration: 'single-image cutting, separated-parts assembly, and the built-in generate-character branch'
                },
                outro: {
                    subject: 'the character and image workflow',
                    outcome: 'know which route to take for one image, pre-cut parts, or a character generated from scratch',
                    nextUse: 'move from source art into riggable character parts with fewer dead ends and less rework'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Treat character rigging on Stage as a routing decision instead of one giant feature. Start with the image tool entry point, then move into the Image Tools section that appears for a selected image. Explain that Body Stencil and Smart Cut are the main single-image cutout routes, Body Slicer is the coarser variant, and Image Deform is only the advanced fallback for warping one flat image. Then move into Cutout Joints and Assembly so the decision tree can separate single-image cutting, separated-part assembly, and Universal Character generation.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchLeftPanelTab('tools', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageCharacterWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.tool-btn[data-tool="image"]',
                        tip: 'The character workflow still starts with an image entering the stage, so the image tool is the correct entry point for imported source art.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#image-properties',
                        tip: 'Once an image is selected, Image Tools becomes the routing surface that decides whether you cut, deform, replace, or generate a character.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-image-stencil',
                        tip: 'Body Stencil is the guided single-image route when you want the app to fit a body guide over a full character image before cutting parts.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-image-smartcut',
                        tip: 'Smart Cut is the more hands-on trace-and-cut path for one image when you want direct control over how body regions are separated.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-image-slicer',
                        tip: 'Body Slicer is the coarse-layout option for broad head, torso, arm, and leg splits when a full manual trace is unnecessary.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-rig-image',
                        tip: 'Image Deform is the advanced fallback. Use it when you need mesh-style warping on one flat image, not when the real goal is articulated cutout character motion.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'When you do not have source art, right-click any empty part of the stage and choose Universal Character to open the generated-character route directly.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#joints-section',
                        tip: 'After cutting or selecting parts, the workflow continues in Cutout Joints and Assembly, which is where rigging decisions become explicit.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#rig-path-single-image',
                        tip: 'Single Image routes users back to Smart Cut, Body Stencil, or Body Slicer, which keeps one-image characters on the right branch.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#rig-path-separate-parts',
                        tip: 'Separate Parts is the branch for body parts that are already cut, so the next step is assembly rather than more image slicing.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#rig-path-generate',
                        tip: 'Generate Character repeats the third branch clearly: when there is no source art to cut, jump straight into the parametric character builder.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await expandStageJointGroup('joint-build', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-guided-rig',
                        tip: 'Guided Assembly is the safer separated-parts starting point because it helps users place expected joints without building everything from scratch.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-assembly',
                        tip: 'Assembly is the faster preset-based option once the body parts are already prepared and you just need them rigged into one character.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-uc',
                        tip: 'Universal Character appears again inside Build and Cut so the generate-character route stays available even after you move deeper into the rigging workflow.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-face-rig-workflow',
                title: 'Face Rig Workflow',
                description: 'Guides the practical Face Rig path: fit landmarks, apply library safely, verify parts, preview expressions, and record to timeline.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-pose-armature-workflow',
                toolCoverage: ['Face Rig button', 'Face Rig mode dropdown', 'Auto Fit', 'Apply Library', 'Check Parts', 'Preview Expression', 'Record Expression', 'Record Talk', 'Replace Style'],
                intro: {
                    subject: 'the Face Rig workflow',
                    kind: 'workflow',
                    purpose: 'show how one selected face image becomes a reusable expression setup without duplicate part spawns',
                    importance: 'face performance usually fails from skipped setup checks, role mismatches, or duplicate generated parts; this flow prevents those issues',
                    demonstration: 'Auto Fit, Apply Library, Check Parts, expression/talk preview, timeline recording, and when to use Replace Style'
                },
                outro: {
                    subject: 'the Face Rig workflow',
                    outcome: 'know how to build, validate, and record a production-safe face rig in a predictable sequence',
                    nextUse: 'reuse the same flow for presenter closeups, character portraits, and narration-driven mouth animation'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Face Rig is most reliable when treated as a sequence: fit, apply, check, preview, then record. Start by selecting a face image and opening Face Rig. Use Auto Fit to place landmarks, apply a library style, and check readiness before recording. Preview expression and talk first, then commit recordings to timeline. On already-rigged faces, Replace Style is the intentional regenerate path for generated parts.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageFaceRigWorkflowDemo(runner);
                            if (document.getElementById('face-rig-controls')?.classList.contains('hidden')) {
                                document.getElementById('btn-face-rig')?.click();
                            }
                            await runner._wait(240);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#face-rig-controls:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'waitFor',
                        selector: '#face-rig-mode-select',
                        timeout: 4000
                    },
                    {
                        action: 'waitFor',
                        selector: '#btn-face-rig-auto-layout',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig',
                        tip: 'Open Face Rig from Image Tools after selecting a face image. That keeps facial setup connected to the selected source object.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#face-rig-mode-select',
                        tip: 'Use Simple for guided setup, Core for daily production controls, and Expert for repair and QA passes.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await ensureFaceRigMode('core', runner);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#btn-face-rig-preview-expression-quick',
                        timeout: 4000
                    },
                    {
                        action: 'waitFor',
                        selector: '#btn-face-rig-record-talk',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-auto-layout',
                        tip: 'Auto Fit is Step 1. It places landmarks and region guides so expression motion has a stable baseline.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-apply-library',
                        tip: 'Apply Library gives you a fast generated setup. On already-rigged faces this should update safely without duplicating generated parts.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-check-parts',
                        tip: 'Check Parts is your readiness gate before recording. Confirm mouth, eyes, and brows are in a valid state.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-preview-expression-quick',
                        tip: 'Preview Expression first so you can adjust profiles and tuning before writing keyframes to timeline.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-record-expression',
                        tip: 'Record Expression commits the chosen pose to timeline. Use this for emotion beats and reaction shots.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-record-talk',
                        tip: 'Record Talk is the speech-focused path for dialogue timing and narration-driven mouth motion.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-library-replace',
                        tip: 'Use Replace Style only when you intentionally want to regenerate generated library parts with a different visual style.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-export-qa',
                        tip: 'Run Face Rig QA before delivery to catch setup issues early, especially after late style or role changes.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-face-rig-micro-tour',
                title: 'Face Rig 60-Second Micro Tour',
                description: 'Auto-opens Face Rig and quickly highlights the six guided workflow buttons in order.',
                path: {
                    id: 'how-to-demonstrations',
                    title: 'How-To Demonstrations',
                    summary: 'Practical task-based demos for common outcomes such as object animation, SmartArt scenes, and character workflows.',
                    order: 1.5
                },
                format: 'Micro Tour',
                audience: 'Stage users',
                nextTutorialId: 'stage-face-rig-workflow',
                toolCoverage: ['Face Rig panel', 'Step 1 Fit Face', 'Step 2 Apply Library', 'Step 3 Cut Part', 'Step 4 Assign + Check', 'Step 5 Preview', 'Step 6 Record'],
                intro: {
                    subject: 'the Face Rig quick-start sequence',
                    kind: 'micro tour',
                    purpose: 'show the exact six workflow buttons users should follow for reliable setup and recording',
                    importance: 'new users often skip readiness checks or record too early; this fixes sequencing fast',
                    demonstration: 'Face Rig panel auto-open and six guided workflow buttons highlighted in order'
                },
                outro: {
                    subject: 'the Face Rig quick-start sequence',
                    outcome: 'know the correct six-button order for fast and stable face rig runs',
                    nextUse: 'run this sequence any time you start a new face image before detailed tuning'
                },
                defaultPace: 'slow',
                voiceoverScript: 'This micro tour opens Face Rig and highlights the exact six workflow buttons in order: fit, apply library, cut part, assign and check, preview, then record. Treat this as the minimum safe sequence before deeper tuning.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageFaceRigWorkflowDemo(runner);
                            if (document.getElementById('face-rig-controls')?.classList.contains('hidden')) {
                                document.getElementById('btn-face-rig')?.click();
                            }
                            await ensureFaceRigMode('core', runner);
                            await runner._wait(240);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#face-rig-controls:not(.hidden)',
                        timeout: 4000
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-step-fit',
                        tip: 'Step 1: Fit Face. Run this first to establish landmarks and region baselines.',
                        readingWeight: 'long',
                        ms: 950
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-step-library',
                        tip: 'Step 2: Apply Library. Start from a style preset for fast setup.',
                        readingWeight: 'long',
                        ms: 900
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-step-cut',
                        tip: 'Step 3: Cut Part. Use this when manual face parts need guided cutting.',
                        readingWeight: 'long',
                        ms: 900
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-step-assign',
                        tip: 'Step 4: Assign + Check. Confirm role mapping and readiness before recording.',
                        readingWeight: 'long',
                        ms: 900
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-step-preview',
                        tip: 'Step 5: Preview. Validate expression or talk behavior first.',
                        readingWeight: 'long',
                        ms: 900
                    },
                    {
                        action: 'click',
                        selector: '#btn-face-rig-step-preview',
                        tip: 'Select the Preview step button in the Face Rig menu so the tutorial follows the intended sequence.',
                        waitAfter: 180
                    },
                    {
                        action: 'tip',
                        selector: '#btn-face-rig-step-record',
                        tip: 'Step 6: Record. Commit to timeline only after preview looks correct.',
                        readingWeight: 'long',
                        ms: 900
                    },
                    {
                        action: 'click',
                        selector: '#btn-face-rig-step-record',
                        tip: 'Select the Record step button in the Face Rig menu to complete the guided flow on the correct control.',
                        waitAfter: 180
                    }
                ]
            },
            {
                id: 'stage-pose-armature-workflow',
                title: 'Pose Armature Workflow',
                description: 'Shows how Pose Armature creates a reusable front-view rig for posing, movement playback, skin fitting, and advanced character setup.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-flex-rig-workflow',
                toolCoverage: ['Cutout Joints', 'Pose Armature', 'Front Dummy', 'Armature panel', 'Armature poses', 'Armature movements'],
                intro: {
                    subject: 'the Pose Armature workflow',
                    kind: 'workflow',
                    purpose: 'show how a reusable rig is created before skinning, posing, and movement playback begin',
                    importance: 'it gives advanced character work a stable structure instead of forcing every pose or skin edit onto loose artwork pieces',
                    demonstration: 'the Pose Armature entry points, the armature panel, fit and overlay controls, and the built-in pose and movement surfaces'
                },
                outro: {
                    subject: 'the Pose Armature workflow',
                    outcome: 'know where to create a front dummy, fit it over artwork, and use the panel for body motion and armature-based posing',
                    nextUse: 'block a character quickly before moving into Flex Rig, linked views, or sampled skins'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Treat Pose Armature as the reusable rig branch, not just another pose picker. Start from the Cutout Joints armature entry, show that Front Dummy seeds a complete front-view rig, then move into the armature panel where fitting, skin sampling, poses, and movements all live together. Finish by pointing out the body-tag button so users understand where contact-aware motion begins.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePoseArmatureWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStagePoseArmatureWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-armature',
                        tip: 'Open Armature is the branch that moves character work from loose cutout parts into a dedicated reusable rig editor.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-armature-front-dummy',
                        tip: 'Front Dummy is the fastest way to seed a full front-view rig when the goal is advanced posing before skinning or linked-view setup.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#armature-panel',
                        tip: 'The armature panel is the main control surface: fitting, skin sampling, poses, movements, and tag-aware rig actions all converge here.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await scrollStageTutorialPanel('#armature-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#armature-place-overlay',
                        tip: 'Place Overlay is the guided way to line art up over the idle armature before sampling it onto the rig parts.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#armature-fit-select',
                        tip: 'Fit Shapes keeps rig editing deliberate by letting one part be resized cleanly while the rest of the dummy stays anchored.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '.armature-pose-btn',
                        tip: 'Armature poses are the static blocking layer: click one to snap the rig into a saved character stance without leaving the panel.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-pose-btn',
                        tip: 'Apply one built-in armature pose so the rig visibly changes on the stage during the walkthrough.',
                        waitAfter: 260
                    },
                    {
                        action: 'tip',
                        selector: '.armature-move-btn',
                        tip: 'Armature movements extend the same rig into looping or one-shot motion, so posing and playback stay on one reusable structure.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.armature-move-btn',
                        tip: 'Start one movement briefly so the tutorial shows that the same rig can also drive live playback.',
                        waitAfter: 360
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await stopStageArmatureMovementPreview(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#armature-body-tags',
                        tip: 'Edit Body Tags is the bridge into contact-aware rig behavior when hands, feet, or other chains need named landing targets on the character.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    }
                ]
            },
            {
                id: 'stage-flex-rig-workflow',
                title: 'Flex Rig Workflow',
                description: 'Shows how Flex Rig Mode overlays direct pose handles on top of an existing Pose Armature without changing the underlying rig system.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-cutout-movement-pose-workflow',
                toolCoverage: ['Flex Tool', 'Flex Rig Mode', 'Angle channel', 'Z Tilt channels', 'Joint list', 'Rig reset'],
                intro: {
                    subject: 'the Flex Rig workflow',
                    kind: 'workflow',
                    purpose: 'show how a Pose Armature can be posed through direct on-stage handles without rebuilding the rig',
                    importance: 'it gives artists a faster posing surface while still writing back to the same joint angle and tilt values used by animation and export',
                    demonstration: 'Flex Rig Mode, channel switching, the live joint list, and reset and exit controls'
                },
                outro: {
                    subject: 'the Flex Rig workflow',
                    outcome: 'know how to enter Flex Rig, switch between angle and depth-style tilt channels, and reset the rig when needed',
                    nextUse: 'rough in expressive poses quickly before saving them or handing the rig to movement playback'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start in the Flex section and frame Flex Rig as a control overlay on a real Pose Armature, not as a separate rig type. Turn the mode on, then explain the difference between Angle, Z Tilt X, and Z Tilt Y so the audience sees how flat rotation and depth-style posing share one panel. Finish on the joint list, reset, and accept controls so the edit loop is clear.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePoseArmatureWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStagePoseArmatureWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#flex-properties',
                        tip: 'The Flex section becomes the fast-pose layer once a Pose Armature is selected, which keeps direct posing close to the normal properties workflow.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-flex-rig-mode',
                        tip: 'Flex Rig Mode is the armature-specific entry point. It overlays drag handles on the existing joints instead of replacing the rig definition.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-flex-rig-mode',
                        tip: 'Enter Flex Rig so the tutorial can move from the mode switch into the live posing controls.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageElement('#flex-rig-controls', runner);
                            await applyStageFlexRigTutorialChange(runner, 'angle', 18);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#flex-rig-channel-angle',
                        tip: 'Angle is the classic rotate-the-joint channel, which is the quickest way to rough in a readable body silhouette.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#flex-rig-channel-tilt-x',
                        tip: 'Z Tilt X pushes limbs toward or away from the camera, which is the depth cue that makes front-facing rigs feel less flat.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await applyStageFlexRigTutorialChange(runner, 'tiltX', 10);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#flex-rig-channel-tilt-y',
                        tip: 'Z Tilt Y adds sideways depth-style rotation, so head turns, shoulder rolls, and hip angles can read with more volume.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await applyStageFlexRigTutorialChange(runner, 'tiltY', -8);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#flex-rig-joint-list',
                        tip: 'The joint list is the precision surface for the same pose data, which means drag handles and typed values stay in sync.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-flex-rig-reset',
                        tip: 'Reset Rig Pose is the safety net when experimentation drifts too far and the rig needs to return to a neutral state quickly.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await resetStageFlexRigTutorialPose(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-flex-rig-exit',
                        tip: 'Accept exits the overlay while keeping the authored armature angles and tilts in place for later posing, playback, or export.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-cutout-movement-pose-workflow',
                title: 'Cutout Movements and Poses',
                description: 'Shows how assembled cutout characters use the Animate and Pose tools to preview, apply, save, and blend reusable body motion.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-body-tags-contact-workflow',
                toolCoverage: ['Animate & Pose', 'Joint Movements', 'Movement preview and apply', 'Pose Library', 'Pose blend'],
                intro: {
                    subject: 'the cutout movement and pose workflow',
                    kind: 'workflow',
                    purpose: 'show how an assembled character moves from reusable motion playback into saved still poses and pose blending',
                    importance: 'it turns a cutout character into a reusable performance system instead of a one-off manual rig edit',
                    demonstration: 'the Animate and Pose buttons, the movement picker, movement preview and apply, and the pose library blend controls'
                },
                outro: {
                    subject: 'the cutout movement and pose workflow',
                    outcome: 'know where to preview a movement, apply it, open the pose library, and blend between saved or built-in poses',
                    nextUse: 'block a cutout performance quickly before refining contacts, timing, or body tags'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Start in Animate and Pose so users see that assembled cutout characters have a dedicated performance section of their own. Open Joint Movements first, explain preview versus apply, then move into Pose Library where saved and built-in poses can be loaded or blended. The goal is to show that reusable motion and reusable still poses are two layers of the same assembled-character workflow.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageAssembledCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageAssembledCharacterWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-movements',
                        tip: 'Movements is the fast playback branch for assembled cutout characters when the goal is testing reusable motion instead of hand-rotating every part.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-joint-movements',
                        tip: 'Open Joint Movements so the tutorial can step through the reusable motion cards directly.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageElement('#joint-movement-picker', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#joint-movement-picker',
                        tip: 'The movement picker groups reusable actions by profile and category so cutout motion stays browseable instead of buried in one long list.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '.ja-move-preview',
                        tip: 'Preview is the audition step. It lets users test motion on the assembled rig before committing that action to the character.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.ja-move-preview',
                        tip: 'Preview one movement so the character actually performs on the stage instead of the panel staying purely descriptive.',
                        waitAfter: 420
                    },
                    {
                        action: 'tip',
                        selector: '.ja-move-apply',
                        tip: 'Apply turns the tested motion into the active rig state, which is the handoff from browsing into actual character posing or timing.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.ja-move-apply',
                        tip: 'Apply the previewed movement so the assembled character keeps that change when the picker closes.',
                        waitAfter: 260
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-poses',
                        tip: 'Poses is the complementary still-frame branch, used when the goal is a named stance rather than a moving action.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#btn-joint-poses',
                        tip: 'Open Pose Library so the tutorial can move from motion playback into saved and built-in pose management.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageElement('#joint-pose-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#joint-pose-panel',
                        tip: 'Pose Library keeps still poses reusable. This is where a cutout character collects named blocking states instead of repeating manual rotations.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await scrollStageTutorialPanel('#joint-pose-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.jpl-load',
                        tip: 'Load applies one selected pose immediately, which is the fastest way to try a built-in stance on the assembled character.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '.jpl-load',
                        tip: 'Load one pose so the character visibly switches to a saved stance during the tutorial.',
                        waitAfter: 260
                    },
                    {
                        action: 'tip',
                        selector: '#jpl-blend-slider',
                        tip: 'Blend Between Poses shows that pose work is not all-or-nothing. Users can interpolate between saved stances to find a new in-between quickly.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await previewStagePoseBlend(runner, 35);
                        }
                    }
                ]
            },
            {
                id: 'stage-body-tags-contact-workflow',
                title: 'Body Tags and Contact Targets',
                description: 'Shows how assembled characters use Body Tags as named landmarks and how poses launch the contact-target editor for hands and feet.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-camera-workflow',
                toolCoverage: ['Body Tags', 'Auto-Tag Parts', 'Character tags list', 'Pose contact targets', 'Contact Targets editor'],
                intro: {
                    subject: 'the Body Tags and Contact Targets workflow',
                    kind: 'workflow',
                    purpose: 'show how named landmarks on the character become stable targets for poses and movements',
                    importance: 'it is what keeps hands, feet, and other end-effectors landing on meaningful body locations instead of floating near them',
                    demonstration: 'the Body Tags panel, auto-tagging, the tag list, pose contact buttons, and the Contact Targets editor'
                },
                outro: {
                    subject: 'the Body Tags and Contact Targets workflow',
                    outcome: 'know where to auto-tag a character and where poses open the editor that binds hands or feet to live body landmarks',
                    nextUse: 'refine hands-on-hips, thinking poses, chest contacts, and other contact-aware blocking without redrawing the character'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Introduce Body Tags as live landmarks on the current character rather than as a separate annotation tool. Open the tags panel, point out the preset context and auto-tag workflow, then move into Pose Library where the location-dot buttons launch Contact Targets. Finish on the contact editor so users understand how a hand or foot chain is bound to a live tag on the same assembled character.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageAssembledCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageAssembledCharacterWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-body-tags',
                        tip: 'Body Tags is the landmark layer for assembled characters. It names meaningful body positions so other workflows can target them consistently.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-joint-body-tags',
                        tip: 'Open Body Tags so the tutorial can move from the button into the actual landmark editor.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageElement('#joint-body-tags-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#joint-body-tags-panel .btags-guide-card',
                        tip: 'The context pills confirm which character and preset the tag layout belongs to, which matters once scenes contain multiple characters.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#body-tags-auto',
                        tip: 'Auto-Tag Parts is the fastest way to seed a usable landmark map before users start refining the individual tag positions by hand.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'click',
                        selector: '#body-tags-auto',
                        tip: 'Run Auto-Tag Parts so the selected character immediately receives usable landmark dots on the stage.',
                        waitAfter: 280
                    },
                    {
                        action: 'tip',
                        selector: '#body-tags-list',
                        tip: 'The tag list is the audit surface for the whole character: every landmark can be selected, centered, deleted, or nudged from here.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await closeStageBodyTagsPanel(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#btn-joint-poses',
                        tip: 'Pose Library is one of the main launch points for contact targets, because still poses often need hands or feet to land on named body points.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#btn-joint-poses',
                        tip: 'Open Pose Library so the tutorial can step into the pose-level contact target controls.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageElement('#joint-pose-panel', runner);
                        }
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await scrollStageTutorialPanel('#joint-pose-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.jpl-targets',
                        tip: 'The location-dot button opens Contact Targets for a pose. The same idea also appears on movement cards so both still poses and motion can reuse live landmarks.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '.jpl-targets',
                        tip: 'Open the Contact Targets editor from a pose so the source-part and target-tag mapping becomes visible.',
                        waitAfter: 220
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageElement('#joint-contact-target-panel', runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#joint-contact-target-panel',
                        tip: 'Contact Targets binds an end-effector chain to a live Body Tag with small offsets and iteration control, which is what makes contact-aware posing practical instead of approximate.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await scrollStageTutorialPanel('#joint-contact-target-panel', runner);
                        }
                    }
                ]
            },
            {
                id: 'stage-camera-keyframes',
                voiceoverId: 'stage-camera-keyframes-v1',
                title: 'Stage Camera: Manual Keyframes',
                description: 'Build and preview a wide-to-close camera move, pan, return to wide, and change its timing using real keyframes.',
                path: { id: 'stage-production-workflows', title: 'Stage Production Workflows', order: 2 },
                nextTutorialId: 'stage-camera-workflow',
                format: 'Workflow', audience: 'Stage users', defaultPace: 'slow',
                beforeStart: 'prepareStageTutorial', afterFinish: restoreStageCameraWorkflowState,
                beforeStep: highlightCameraTutorial,
                steps: [
                    { action: 'call', run: prepareStageCameraWorkflowDemo },
                    { action: 'tip', selector: '#stage-canvas', tip: 'We will make a camera move with manual keyframes: start wide, zoom in, pan sideways, then return to wide. Your original scene is restored afterward.' },
                    { action: 'click', selector: '[data-target="tbr-drop-tools"]', tip: 'Open Tools.' },
                    { action: 'click', selector: '#btn-animate-stage-camera', tip: 'Open Animate Stage to edit the viewport camera.' },
                    { action: 'click', selector: '[data-camera-tab="manual"]', tip: 'Manual keyframes let you place the camera frame yourself at chosen times.' },
                    { action: 'click', selector: '[data-act="reset"]', tip: 'Fill sets a full-stage frame at zero seconds. This is our wide starting shot.' },
                    { action: 'click', selector: '[data-act="step-fwd"]', tip: 'Move the playhead forward one second before setting the next framing.' },
                    { action: 'click', selector: '[data-act="step-fwd"]', tip: 'Move to two seconds. The zoom will have two seconds to travel from the starting frame.' },
                    { action: 'gesture', selector: '#stage-canvas', getGesture:()=>cameraTutorialDrag('zoom'), tip: 'Watch the cursor drag the lower-right camera corner inward. A smaller camera frame creates a closer view. Releasing the drag records the framing at this time.' },
                    { action: 'tip', selector: '[data-kf-list]', tip: 'The list now contains the wide frame at zero and the closer frame at two seconds. Camera timing comes from the gap between keyframes.' },
                    { action: 'click', selector: '[data-act="step-fwd"]', tip: 'Move to three seconds for a sideways pan.' },
                    { action: 'gesture', selector: '#stage-canvas', getGesture:()=>cameraTutorialDrag('pan'), tip: 'Drag inside the frame to move it sideways without changing its size. This pans the camera rather than moving the artwork.' },
                    { action: 'click', selector: '[data-act="step-fwd"]', tip: 'Move to four seconds.' },
                    { action: 'click', selector: '[data-act="add-kf"]', tip: 'Add Keyframe captures this same framing at four seconds, creating a one-second hold after the pan.' },
                    { action: 'click', selector: '[data-act="step-fwd"]', tip: 'Move to five seconds for the return to wide.' },
                    { action: 'click', selector: '[data-act="reset"]', tip: 'Fill records the full-stage view here. The camera will pull back between four and five seconds.' },
                    { action: 'call', run:()=>setStagePlayheadTime(0) },
                    { action: 'click', selector: '[data-act="preview"]', tip: 'Preview the complete zoom, pan, hold and return to wide.' },
                    { action: 'tip', selector: '#stage-canvas', tip: 'Watch the camera travel between the saved frames. The character stays in its original location.', ms: 5500 },
                    { action: 'call', run:()=>{window.app.animations.pause?.();setStagePlayheadTime(0);} },
                    { action: 'input', selector: '.sc-kf-row:nth-child(2) .sc-kf-time-input', value: '2.5', tip: 'Change the second keyframe from two to two and a half seconds. This slows the first zoom and leaves less time for the following pan.' },
                    { action: 'tip', selector: '[data-act="easing"]', tip: 'Default easing controls acceleration for newly added frames. Linear is steady speed; Ease In Out starts and finishes gently. It does not retime existing keyframes.' },
                    { action: 'tip', selector: '.sc-kf-row:nth-child(2) .sc-kf-goto', tip: 'Use this locate button to jump to a keyframe. Edit its time to retime it, or use its delete button to remove only that frame.' },
                    { action: 'tip', selector: '[data-act="new-section"]', tip: 'New Section starts a separate camera section at the playhead. Place it outside existing sections to avoid overlaps. Clear All removes all camera keyframes, so use it carefully.' },
                    { action: 'click', selector: '[data-act="apply"]', tip: 'Apply saves the manual camera sequence. Cancel would discard the current editing session.' },
                    { action: 'call', run:async runner=>{window.app.stageCamera.enter();await runner._wait(250);} },
                    { action: 'tip', selector: '[data-kf-list]', tip: 'Reopening retains your keyframes, including the two-and-a-half-second edit. Next, try Character Shots and Composition for automatic subject framing.' }
                ].map(step=>step.tip?{...step,voiceover:step.tip,readingWeight:'long',pad:8}:step)
            },
            {
                id: 'stage-camera-workflow',
                voiceoverId: 'stage-camera-character-v4',
                title: 'Stage Camera: Character Shots and Composition',
                nextTutorialId: 'stage-camera-keyframes',
                description: 'A narrated practical lesson: frame a character, preview a close-up, slow its transition, apply and reopen the saved shot.',
                path: { id: 'stage-production-workflows', title: 'Stage Production Workflows', order: 2 },
                format: 'Workflow',
                audience: 'Stage users',
                defaultPace: 'slow',
                beforeStart: 'prepareStageTutorial',
                afterFinish: restoreStageCameraWorkflowState,
                beforeStep: async (runner, tutorial, step) => {
                    if(step.selector&&!document.querySelector(step.selector))throw Error('Camera tutorial control is unavailable: '+step.selector);
                    if(runner._shell)runner._shell.style.zIndex='21000';
                    if(runner._spotlight){runner._spotlight.style.border='3px solid #38bdf8';runner._spotlight.style.borderRadius='6px';runner._spotlight.style.boxShadow='0 0 0 9999px rgba(0,0,0,.35)';}
                },
                steps: [
                    { action: 'call', run: prepareStageCameraWorkflowDemo },
                    { action: 'tip', selector: '#stage-canvas', tip: 'This temporary character is our camera subject. We will move from a wide view into a close-up, then slow the same move. Your original scene will be restored when this lesson ends.' },
                    { action: 'click', selector: '[data-target="tbr-drop-tools"]', tip: 'Open Tools to find Animate Stage.' },
                    { action: 'click', selector: '#btn-animate-stage-camera', tip: 'Open Animate Stage. This changes the camera framing, not the size of the character.' },
                    { action: 'click', selector: '.stage-camera-panel [data-camera-tab="characters"]', tip: 'Choose Character shots. These controls generate camera keyframes for a selected character.' },
                    { action: 'click', selector: '.sc-shot-subjects input', tip: 'Select our demonstration character as the camera subject.' },
                    { action: 'tip', selector: '.sc-shot-subjects', tip: 'Our demonstration character is selected here. This checkbox identifies who the camera should frame.' },
                    { action: 'input', selector: '[data-shot-field="name"]', value: 'Tutorial close-up', tip: 'Give the shot a name so we can find it again later.' },
                    { action: 'input', selector: '[data-shot-field="duration"]', value: '6', tip: 'Set Duration to six seconds. This is the total length of the camera shot, including time held on the close-up.' },
                    { action: 'input', selector: '[data-shot-field="framing"]', value: 'close-up', tip: 'Choose Close up. The camera will frame the head rather than the whole body.' },
                    { action: 'input', selector: '[data-shot-field="blend"]', value: '0.5', tip: 'Set Transition to half a second. This controls how quickly the camera moves into that close-up.' },
                    { action: 'click', selector: '[data-save-character-shot]', tip: 'Add shot builds the camera movement. Watch the stage next to see the result.', waitAfter: 400 },
                    { action: 'call', run: async runner => { await waitForCameraTutorialShot(runner); setStagePlayheadTime(0); } },
                    { action: 'click', selector: '.stage-camera-panel [data-act="preview"]', tip: 'Preview the fast version from the start. The camera reaches the close-up in half a second.' },
                    { action: 'tip', selector: '#stage-canvas', tip: 'Watch the framing move towards the face. The character itself has not been resized.', ms: 2200 },
                    { action: 'call', run: () => { window.app.animations.pause?.(); setStagePlayheadTime(0); } },
                    { action: 'input', selector: '[data-shot-field="blend"]', value: '3', tip: 'Now change only Transition to three seconds. The six-second shot duration stays unchanged.' },
                    { action: 'click', selector: '[data-save-character-shot]', tip: 'Update shot rebuilds this same shot with the slower transition. It does not create another shot.', waitAfter: 400 },
                    { action: 'call', run: async runner => { await waitForCameraTutorialShot(runner); setStagePlayheadTime(0); } },
                    { action: 'click', selector: '.stage-camera-panel [data-act="preview"]', tip: 'Preview again from the beginning to compare the slower camera move.' },
                    { action: 'tip', selector: '#stage-canvas', tip: 'The camera now takes three seconds to arrive, then holds the close-up. Transition controls the move; Duration controls the whole shot.', ms: 3500 },
                    { action: 'call', run: () => { window.app.animations.pause?.(); setStagePlayheadTime(0); } },
                    { action: 'input', selector: '[data-shot-field="padding"]', value: '40', tip: 'Increase Margin to forty percent to leave more space around the subject.' },
                    { action: 'click', selector: '.sc-shot-fields details summary', tip: 'Open Composition for control over where the character sits inside the frame.' },
                    { action: 'input', selector: '[data-shot-field="headroom"]', value: '20', tip: 'Headroom adds space above the head. Try twenty percent for a less tightly cropped portrait.' },
                    { action: 'input', selector: '[data-shot-field="offset"]', value: '20', tip: 'Horizontal offset shifts the framing sideways. This can leave room beside a speaker for another person or a caption.' },
                    { action: 'click', selector: '[data-save-character-shot]', tip: 'Update the shot to apply these composition changes.', waitAfter: 400 },
                    { action: 'call', run: async runner => { await waitForCameraTutorialShot(runner); setStagePlayheadTime(0); } },
                    { action: 'click', selector: '.stage-camera-panel [data-act="preview"]', tip: 'Preview the wider, offset composition and compare it with the earlier centered close-up.' },
                    { action: 'tip', selector: '#stage-canvas', tip: 'Notice the extra space around and above the face. Composition changes framing, not the character geometry.', ms: 3500 },
                    { action: 'call', run: () => { window.app.animations.pause?.(); setStagePlayheadTime(0); } },
                    { action: 'tip', selector: '[data-shot-field="tracking"]', tip: 'Track movement follows the selected character over time. Turn it off for a fixed shot. Our stationary example stays still in either mode; moving characters reveal the difference.' },
                    { action: 'click', selector: '.sc-shot-fields details summary', tip: 'Reopen Composition to inspect the tracking controls.' },
                    { action: 'input', selector: '[data-shot-field="lookAhead"]', value: '0.4', tip: 'Travel look ahead anticipates a moving character by four tenths of a second. It does not create movement for a stationary character.' },
                    { action: 'input', selector: '[data-shot-field="smoothing"]', value: '0.5', tip: 'Tracking smoothness softens camera changes as the character moves. It is separate from the initial transition duration.' },
                    { action: 'click', selector: '[data-shot-field="adaptiveZoom"]', tip: 'Enable Adaptive zoom to let tracking adjust the framing scale as the subject changes.' },
                    { action: 'click', selector: '.sc-shot-fields details summary', tip: 'The composition section now includes zoom limits and a change-rate control.' },
                    { action: 'input', selector: '[data-shot-field="minZoom"]', value: '1', tip: 'Minimum zoom limits how far the camera can pull back.' },
                    { action: 'input', selector: '[data-shot-field="maxZoom"]', value: '8', tip: 'Maximum zoom limits how tightly the camera can frame the subject. Keep it above the minimum.' },
                    { action: 'input', selector: '[data-shot-field="zoomSpeed"]', value: '0.3', tip: 'Zoom change rate limits how quickly adaptive zoom changes. Lower rates make scale changes more gradual.' },
                    { action: 'tip', selector: '[data-shot-field="mode"]', tip: 'Selected characters frames the checked subjects together. Follow linked speakers and Group, speaker and listener use audio linked to those characters in this time range. Full stage returns to a wide view. Speech modes need linked audio; they are not automatic speech generation.' },
                    { action: 'tip', selector: '[data-shot-field="start"]', tip: 'Start places the shot on the scene timeline. To add another shot, choose New character shot and use a non-overlapping start time. For example, start a second shot at six seconds after this six-second shot.' },
                    { action: 'click', selector: '.stage-camera-panel [data-act="apply"]', tip: 'Apply saves our composition and tracking edits and closes the editor. In your project, do this before opening a separate preview window.' },
                    { action: 'call', run: async runner => { window.app.stageCamera.enter(); await runner._wait(250); } },
                    { action: 'tip', selector: '[aria-label="Saved character camera shots"]', tip: 'We have reopened the editor. The saved Tutorial close-up shot is selected, not a new blank shot. Select your character before opening the editor to restore its shot.' },
                    { action: 'tip', selector: '[data-shot-field="blend"]', tip: 'The saved transition is still three seconds. If there are several shots for a character, the shot at the playhead takes priority. Choose another from the saved-shot list when needed.' },
                    { action: 'tip', selector: '.stage-camera-panel [data-act="apply"]', tip: 'Your workflow is: select the character, choose its saved shot, edit, update, preview from the shot start, and apply. Cancel discards the current editing session. This lesson will now restore your original scene.' }
                ].map(step => step.tip ? { ...step, voiceover: step.tip, readingWeight: 'long', pad: 8 } : step)
            },
            {
                id: 'stage-path-animation-workflow',
                title: 'Path Animation Workflow',
                description: 'Shows how Move Along Shape pairs a path object, mover object, range controls, and timeline timing in one motion workflow.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage users',
                nextTutorialId: 'stage-smartart-handoff-deep-dive',
                toolCoverage: ['Animate tab', 'Advanced subtab', 'Move Along Shape', 'Path range controls', 'Timeline alignment', 'Preview and Apply'],
                intro: {
                    subject: 'the Path Animation workflow',
                    kind: 'workflow',
                    purpose: 'show how one object becomes the path and another becomes the mover inside the dedicated motion-path builder',
                    importance: 'it keeps custom travel motion structured instead of forcing users to fake curved movement with many small manual keyframes',
                    demonstration: 'path selection, mover selection, range controls, timing options, and the preview/apply handoff'
                },
                outro: {
                    subject: 'the Path Animation workflow',
                    outcome: 'know how to pair a mover with a path, shape the travel range, and place the motion on the timeline deliberately',
                    nextUse: 'drive icons, characters, or labels along curves, loops, and diagram outlines with less manual retiming'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Move into the Animate tab and open the Advanced sub-tab so the dedicated Move Along Shape builder is visible. Use a tutorial path object and mover object so the path tag and mover tag can appear immediately, then explain that the workflow always pairs those two roles before timing matters. Finish by pointing out the range sliders, timeline alignment controls, Preview, and Apply so the audience understands where geometric travel becomes a real stage animation.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePathAnimationWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('advanced', runner);
                            await ensureStagePathAnimationWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.anim-category[data-category="path-anim"]',
                        tip: 'Move Along Shape lives in the Advanced animation group because it coordinates geometry, timing, and playback instead of applying one canned effect.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#path-anim-builder .path-anim-row:nth-of-type(1)',
                        tip: 'The first role is always the path shape row: a circle, path, or other outline that defines where motion will travel.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#path-shape-name',
                        tip: 'Once the path is chosen, the tag confirms exactly which stage object is driving the travel path, which is critical in busy scenes.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#path-anim-builder .path-anim-row:nth-of-type(2)',
                        tip: 'The second role is the mover row. That separation keeps path geometry and animated content distinct, so either can be swapped later.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#path-mover-name',
                        tip: 'The mover tag is the checkpoint that confirms which object will actually follow the path during preview and playback.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#path-start-pct',
                        tip: 'Start and End percentages let the workflow use only part of a path, which is useful when a diagram edge or orbit should cover just one segment of the shape.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#path-align-rotation',
                        tip: 'Align to path rotates the mover to follow travel direction, which matters for arrows, vehicles, and characters that should face along the route.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#path-timeline-start',
                        tip: 'Timeline Start decides how this motion joins the rest of the scene, so path animation stays part of the same editorial timeline as every other effect.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '#path-timeline-reference-object',
                        tip: 'Relative To Object is the advanced scheduling option for lining this path move up against another object instead of eyeballing offsets manually.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#btn-preview-path-anim',
                        tip: 'Preview lets users test the route before committing it, which is especially useful when the path shape is dense or the range sliders have been trimmed.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'tip',
                        selector: '#btn-apply-path-anim',
                        tip: 'Apply writes the configured motion onto the mover object, which is the handoff point from path design into normal timeline editing and review.',
                        readingWeight: 'long',
                        ms: 1150
                    }
                ]
            },
            {
                id: 'stage-smartart-handoff-deep-dive',
                title: 'SmartArt Handoff Deep Dive',
                description: 'Explains the stage-side handoff into SmartArt, when to use it, and where linked workspace context is surfaced when you return.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'Workflow',
                audience: 'Stage and SmartArt users',
                nextTutorialId: 'stage-output-and-templates',
                toolCoverage: ['Workspace status pill', 'Project identity', 'Mode selector', 'Go menu', 'SmartArt entry point'],
                intro: {
                    subject: 'the SmartArt handoff workflow',
                    kind: 'workflow',
                    purpose: 'show when to leave the stage for structured visuals and how the current workspace context travels with that handoff',
                    importance: 'it keeps diagrams, timelines, and roadmap visuals connected to the main stage instead of becoming separate disconnected work',
                    demonstration: 'workspace status, project identity, and the SmartArt entry point'
                },
                outro: {
                    subject: 'the SmartArt handoff workflow',
                    outcome: 'know when to move into SmartArt and what stage context is preserved around that trip',
                    nextUse: 'handoff structured visuals more intentionally and return to the stage with less confusion'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Treat SmartArt as a deliberate handoff, not just another page link. Start with the workspace status and project name so the audience understands that the current stage context matters. Then open the Go menu and highlight SmartArt as the structured-visual workspace for timelines, diagrams, and roadmap layouts. Finish by returning attention to the mode selector and workspace status area, because that is where the relationship between the stage and SmartArt becomes understandable after a round-trip.',
                beforeStart: 'prepareStageTutorial',
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            closeStageTransientUi();
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#workspace-status-pill',
                        tip: 'The workspace status pill is the first place to read the state of the current stage workspace before or after a SmartArt round-trip.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'tip',
                        selector: '#project-name-display',
                        tip: 'Project identity matters here because SmartArt is most useful when it feels connected to the same production flow rather than a detached diagram editor.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-go"]',
                        tip: 'Open Go to reach the handoff surface into SmartArt.',
                        waitAfter: 300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-smartart',
                        tip: 'Use SmartArt when the stage needs a structured diagram such as a timeline, process, org chart, roadmap, or comparison layout.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '[data-target="tbr-drop-go"]',
                        tip: 'Close Go and return to the stage workspace indicators.',
                        waitAfter: 220
                    },
                    {
                        action: 'tip',
                        selector: '#mode-toggle',
                        tip: 'The mode selector and workspace indicators help users understand that SmartArt is a connected workflow beside Basic and AI work, not a disconnected detour.',
                        readingWeight: 'extra-long',
                        ms: 1250
                    }
                ]
            },

            {
                id: 'stage-power-feature-expressions',
                title: 'Power Feature — Expressions (Scripting Properties)',
                description: 'Shows how the Expressions panel lets you drive one property from another with a small JavaScript snippet, AE-style.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Advanced users',
                toolCoverage: ['Expressions panel', 'Scripting / Expressions toolbar', 'Property drivers'],
                intro: {
                    subject: 'the Expressions power feature',
                    kind: 'deep dive',
                    purpose: 'show how a small script can drive one stage property from another, eliminating tedious keyframe parity work',
                    importance: 'expressions create relationships between properties — when one moves, the other follows — which keyframes cannot do efficiently',
                    demonstration: 'opening the Scripting panel, picking a target property, writing a one-line expression, and seeing the relationship update live'
                },
                outro: {
                    subject: 'the Expressions power feature',
                    outcome: 'understand when to reach for a property expression instead of stacking keyframes',
                    nextUse: 'tie related properties together — rotation following position, opacity following time — with one expression instead of dozens of keyframes'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'corner-top-right',
                voiceoverScript: 'Expressions are the scripting layer of Stage. Start with a selected object on stage so the lesson shows a real result instead of a blank panel. Open the Scripting panel from the toolbar. Inside, attach a small JavaScript snippet to the objects rotation so it is driven by the objects X position. When the object shifts horizontally, it now spins automatically. That is the practical value of expressions: one property can stay in sync with another without hand-authoring extra keyframes. The editor runs in a safe sandbox, and if an expression errors the property falls back to its normal keyed value. Finish by closing the panel and noting that expressions and keyframes coexist — keyframes remain the source, expressions transform the result.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePowerFeaturesWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('properties', runner);
                            const demoObject = await ensureStageExpressionsWorkflowDemo(runner);
                            if (demoObject) {
                                await focusStageViewportOnBounds({
                                    x: demoObject.x,
                                    y: demoObject.y,
                                    width: Math.max(80, Math.abs(demoObject.width || 132)),
                                    height: Math.max(80, Math.abs(demoObject.height || 132))
                                }, runner, { fillRatio: 0.86, minZoom: 0.35, maxZoom: 1.7 });
                            }
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This lesson starts with a selected demo object on stage so the expression has something real to drive. The wheel is already selected and ready for the scripting panel.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-expressions',
                        tip: 'The Scripting button on the toolbar opens the Expressions panel. The keyboard shortcut is Ctrl+Shift+E for quick access during editing.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-expressions',
                        tip: 'Open the Expressions panel so the editor and target-property selection are visible.',
                        waitAfter: 400
                    },
                    {
                        action: 'tip',
                        selector: '#expressions-editor',
                        tip: 'Expressions are always attached to the selected object. This panel now reflects the wheel on stage, so the script you add here will immediately affect that object.',
                        readingWeight: 'extra-long',
                        ms: 1350
                    },
                    {
                        action: 'input',
                        selector: '#expressions-editor .expr-add-prop',
                        value: 'rotation',
                        tip: 'Pick Rotation as the property to drive. Expressions work best when one property should stay mechanically tied to another.',
                        waitAfter: 180
                    },
                    {
                        action: 'click',
                        selector: '#expressions-editor .expr-add-btn',
                        tip: 'Add the expression row for Rotation so the code editor is created for the selected object.',
                        waitAfter: 220
                    },
                    {
                        action: 'input',
                        selector: '#expressions-editor .expr-row[data-prop="rotation"] .expr-code',
                        value: 'x * 0.12',
                        tip: 'Use a simple relationship like `x * 0.12`. Now the object rotation is computed from its horizontal position, so moving it sideways also turns it.',
                        waitAfter: 320
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await runner._wait(260);
                            await previewStageExpressionsWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Watch the wheel as its X position changes: the expression turns it automatically. This is the practical win of expressions — one property stays linked to another without extra rotation keyframes.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1450
                    },
                    {
                        action: 'tip',
                        selector: '#expressions-editor .expr-row[data-prop="rotation"] .expr-code',
                        tip: 'Expressions run in a sandboxed environment with access to the objects own properties, time, and helper functions. If an expression errors, the property falls back to its normal keyed value so the scene does not break.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '#btn-expressions',
                        tip: 'Close the panel when finished. Expressions stay attached to the object — open the panel again to edit or remove them later.',
                        readingWeight: 'long',
                        ms: 1150,
                        waitAfter: 220
                    }
                ]
            },
            {
                id: 'stage-power-feature-dope-sheet',
                title: 'Power Feature — Dope Sheet for Multi-Object Retiming',
                description: 'Focused walkthrough of the Dope Sheet, the cross-object keyframe grid where you retime, shift, and align animations across the whole scene.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Stage users',
                toolCoverage: ['Dope Sheet', 'Keyframe grid', 'Timing rows', 'Multi-object selection'],
                intro: {
                    subject: 'the Dope Sheet power feature',
                    kind: 'deep dive',
                    purpose: 'show how to retime animations across multiple objects from a single keyframe grid',
                    importance: 'the timeline is great for one object at a time, but the dope sheet is where multi-object timing comparisons and adjustments actually happen',
                    demonstration: 'opening the dope sheet, identifying timing rows, dragging a keyframe, and using the grid for cross-object alignment'
                },
                outro: {
                    subject: 'the Dope Sheet power feature',
                    outcome: 'know where to compare and adjust the timing of every animated object on the stage from one view',
                    nextUse: 'retime entire scenes — slow down a beat, tighten a sequence, align two motions — without opening each object individually'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'corner-top-right',
                voiceoverScript: 'The Dope Sheet is the multi-object timing view. Open it from the toolbar and notice that every animated property gets a row. Each keyframe is a dot on that row, and you can drag dots to retime. The key advantage is alignment — when two objects should hit a pose at the same moment, the dope sheet shows you instantly whether they do or not. Drag a keyframe to demonstrate the retiming, then close the panel and note that all changes commit back to the main timeline.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePowerFeaturesWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStagePowerFeaturesAnimatedDemo(runner, { includeCompanion: true });
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Two animated demo objects are already on stage so the Dope Sheet opens onto real timing rows instead of an empty grid. That makes the timing comparison honest from the first step.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-open-dope-sheet',
                        tip: 'The Dope Sheet button is in the toolbar. Open it whenever you need to compare or adjust the timing of more than one animated object at once.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-open-dope-sheet',
                        tip: 'Open the Dope Sheet so the keyframe grid is visible.',
                        waitAfter: 400
                    },
                    {
                        action: 'waitFor',
                        selector: '#dope-sheet-modal:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#dope-sheet-canvas',
                        tip: 'Each row is one animated property — position, rotation, opacity. Each dot is a keyframe. The horizontal axis is time, the vertical axis is which object or property you are looking at.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'tip',
                        selector: '#dope-sheet-canvas',
                        tip: 'Drag a keyframe horizontally to retime it. Select multiple keyframes and drag together to shift a whole sequence — the dope sheet is built for these batch timing moves.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'tip',
                        selector: '#dope-sheet-canvas',
                        tip: 'When two objects should hit a pose simultaneously, line up their keyframe dots in the same column. The dope sheet makes that alignment visual instead of guess-and-check.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '#dope-sheet-close',
                        tip: 'Close the Dope Sheet. All retiming changes are committed to the main timeline automatically.',
                        waitAfter: 200
                    }
                ]
            },
            {
                id: 'stage-power-feature-onion-skin',
                title: 'Power Feature — Onion Skin for Motion Analysis',
                description: 'Focused walkthrough of Onion Skin, the ghost-frame overlay that shows where animated objects were before and after the current moment.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Stage users',
                toolCoverage: ['Onion Skin', 'Ghost frames', 'Motion overlay', 'Onion Skin settings'],
                intro: {
                    subject: 'the Onion Skin power feature',
                    kind: 'deep dive',
                    purpose: 'show how ghost frames before and after the current time make motion timing easier to judge',
                    importance: 'onion skin is the traditional animator tool for seeing spacing and arcs without scrubbing the timeline',
                    demonstration: 'toggling onion skin, opening the settings popover, adjusting before/after frame counts, and reading the ghosted result'
                },
                outro: {
                    subject: 'the Onion Skin power feature',
                    outcome: 'know how to use ghost frames to evaluate the spacing and arc of an animation without playback',
                    nextUse: 'refine eased moves, fix arcs that feel mechanical, and judge timing of cuts and entries with a single visual overlay'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'corner-top-right',
                voiceoverScript: 'Onion Skin shows your animated object as a stack of semi-transparent ghosts — past frames in one color, future frames in another. Toggle it from the toolbar. Shift+click or right-click opens the settings popover where you control how many before and after frames are drawn and how strong the overlay looks. The classic use is checking motion arcs: a believable motion forms a curve, not a straight line. Onion skin makes that arc visible without scrubbing.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePowerFeaturesWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStagePowerFeaturesAnimatedDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This lesson starts with a moving demo object already on stage so the ghost frames have a real arc to reveal instead of an empty canvas.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1280
                    },
                    {
                        action: 'tip',
                        selector: '#btn-onion-skin',
                        tip: 'Onion Skin is on the toolbar with the keyboard shortcut O. Click to toggle the overlay, Shift+click or right-click to open the settings popover.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-onion-skin',
                        tip: 'Turn Onion Skin on. Ghost frames of the animated object now appear before and after the current playhead position.',
                        waitAfter: 250
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Past frames typically show in one tint and future frames in another. The closer a ghost is to the current frame, the more solid it appears.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const button = document.getElementById('btn-onion-skin');
                            button?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#onion-skin-popover',
                        tip: 'The settings popover controls before/after frame counts, frame spacing, and overlay strength. Lower spacing reveals fine timing detail, higher spacing reveals broad arcs.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'Read the ghost trail like a flipbook: a smooth curve means good arc, a straight line means mechanical motion, and uneven spacing means the easing needs work.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            document.getElementById('onion-skin-popover')?.remove();
                            await runner._wait(120);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#btn-onion-skin',
                        tip: 'Toggle Onion Skin off when you are done analyzing. It is a review tool — leave it off during normal editing to keep the canvas clean.',
                        waitAfter: 200
                    }
                ]
            },
            {
                id: 'stage-power-feature-symbols',
                title: 'Power Feature — Symbols for Reusable Components',
                description: 'Focused walkthrough of Symbols, the master-instance system that turns one edited object into a reusable component you can drop into any scene.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Stage users',
                toolCoverage: ['Symbols Library', 'Convert Selection to Symbol', 'Master-instance relationship'],
                intro: {
                    subject: 'the Symbols power feature',
                    kind: 'deep dive',
                    purpose: 'show how to turn an edited object into a reusable master and place instances of it across the stage',
                    importance: 'symbols eliminate copy-paste by giving every instance a live link to the same master — edit the master once, every instance updates',
                    demonstration: 'opening the symbols library, converting a selection to a symbol, dropping an instance, and editing the master to update all instances'
                },
                outro: {
                    subject: 'the Symbols power feature',
                    outcome: 'know how to convert any object into a reusable component and propagate changes through every instance',
                    nextUse: 'build branded callouts, repeating UI elements, and animated badges once — then place instances everywhere without duplicating work'
                },
                defaultPace: 'slow',
                tooltipPlacement: 'corner-top-right',
                voiceoverScript: 'Symbols are the reusable-component system. Open the Symbols Library from the toolbar. The key move is Convert Selection to Symbol — whatever is selected on stage becomes a master, and the selection on stage becomes the first instance. Place more instances anywhere you want them. The magic happens when you edit the master: every instance updates immediately. Demonstrate one master edit propagating to several instances, then explain that you can break a single instance free of the master when you need a one-off variation.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePowerFeaturesWorkflowState(runner);
                    delete runner.context?.stagePowerFeaturesSymbolId;
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStagePowerFeaturesAnimatedDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This lesson starts with a selected animated demo object on stage so Symbols has a real piece of artwork to convert and reuse instead of an abstract explanation.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#btn-open-symbols',
                        tip: 'The Symbols Library button is in the toolbar. Open it whenever you have an object worth reusing across multiple scenes.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-open-symbols',
                        tip: 'Open the Symbols Library so the master list and conversion controls are visible.',
                        waitAfter: 400
                    },
                    {
                        action: 'waitFor',
                        selector: '#symbols-modal:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#symbols-convert-selection',
                        tip: 'Convert Selection to Symbol is the bridge from a live stage object into a reusable master. The tutorial keeps a real animated badge selected so this control has an honest job to do.',
                        readingWeight: 'extra-long',
                        ms: 1320
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const originalPrompt = window.prompt;
                            try {
                                window.prompt = () => 'Tutorial Motion Symbol';
                                document.getElementById('symbols-convert-selection')?.click();
                            } finally {
                                window.prompt = originalPrompt;
                            }
                            runner.context = runner.context || {};
                            runner.context.stagePowerFeaturesSymbolId = Object.keys(window.app?.symbols?.library || {}).find(id => window.app?.symbols?.library?.[id]?.name === 'Tutorial Motion Symbol') || null;
                            await runner._wait(240);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#symbols-list .symbol-row',
                        tip: 'The selected stage object is now a real symbol master with its first instance already on stage. The library row is the reusable source for every next copy.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '#symbols-list button[data-act="place"]',
                        tip: 'Place one more instance from the library. This keeps the tutorial truthful by showing the reusable copy appear on stage immediately.',
                        waitAfter: 240
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'There are now multiple instances on stage from the same master. Edit the master once and every linked instance updates, which is why Symbols beats copy-paste for repeated elements.',
                        surfaceLabel: 'STAGE',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'tip',
                        selector: '#symbols-modal',
                        tip: 'To break one instance free of its master — for a one-off variation — use the unlink option on the instance. The unlinked copy becomes an independent object.',
                        readingWeight: 'long',
                        ms: 1250
                    },
                    {
                        action: 'click',
                        selector: '#symbols-panel-close',
                        tip: 'Close the Symbols Library. Your masters persist with the project and are available next time you open the library.',
                        waitAfter: 200
                    }
                ]
            },
            {
                id: 'stage-power-feature-easing-editor',
                title: 'Power Feature — Custom Easing Curve Editor',
                description: 'Focused walkthrough of the Easing Editor, where you craft custom bezier curves for one-of-a-kind motion timing.',
                path: {
                    id: 'delivery-and-reuse',
                    title: 'Delivery and Reuse',
                    summary: 'Review reusable templates, export preparation, and higher-control motion tools after the stage basics are already familiar.',
                    order: 3
                },
                format: 'Deep Dive',
                audience: 'Stage users',
                tooltipPlacement: 'corner-top-right',
                toolCoverage: ['Easing Editor', 'Bezier curve handles', 'Easing presets', 'Re-apply animation'],
                intro: {
                    subject: 'the custom easing curve editor',
                    kind: 'deep dive',
                    purpose: 'show how to author and apply a custom bezier easing curve that is not in the preset list',
                    importance: 'preset easings cover most cases, but signature brand motion, exaggerated overshoot, and unique anticipation curves need a custom bezier',
                    demonstration: 'selecting an applied animation, switching its easing to Custom, opening the editor, picking a preset bezier, applying it, and re-applying the animation'
                },
                outro: {
                    subject: 'the custom easing curve editor',
                    outcome: 'know how to author a custom bezier curve and write it back into an existing animation',
                    nextUse: 'craft signature motion — branded bounces, dramatic overshoots, sharp anticipation — that preset easings cannot produce'
                },
                defaultPace: 'slow',
                voiceoverScript: 'The Easing Editor handles custom bezier timing curves. The path in is non-obvious: you click the applied animation row, switch its easing dropdown to Custom, and the editor opens. Inside, you have control handles that shape the curve. Preset bezier shapes are listed at the top — overshoot, anticipation, ease-out-back — and these are usually the fastest starting point. After picking a preset or shaping the curve yourself, click Apply, then Re-apply the animation. The custom curve is now written into that animations easing.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStagePowerFeaturesWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchRightPanelTab('animations', runner);
                            await switchAnimationSubtab('basic', runner);
                            await ensureStagePowerFeaturesWorkflowDemo(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'This lesson starts with a real demo object on stage so the easing editor can refine actual motion instead of pointing at an empty panel.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'click',
                        selector: '.anim-btn[data-anim="linear-move"]',
                        tip: 'Apply one simple Linear Move first. The easing editor becomes meaningful only when there is already a live animation row to edit.',
                        waitAfter: 240
                    },
                    {
                        action: 'input',
                        selector: '#param-duration',
                        value: '1.6',
                        tip: 'Use a readable duration so the object motion and the easing change are easy to inspect.',
                        waitAfter: 120
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim',
                        tip: 'Apply the move now so the selected object has real motion on stage and a matching row in Applied Animations.',
                        waitAfter: 240
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForStageAppliedAnimation(runner);
                            setStagePlayheadTime(800);
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#applied-animations',
                        tip: 'The editor opens from inside an applied animation. Click the animation row in the Applied Animations list to enter re-apply mode.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'click',
                        selector: '#applied-anim-list .applied-anim-item',
                        tip: 'Select the live animation row itself. That is the real route into re-apply mode for a move that already exists on the object.',
                        waitAfter: 220
                    },
                    {
                        action: 'waitFor',
                        selector: '#reapply-banner:not(.hidden)',
                        timeout: 2500
                    },
                    {
                        action: 'tip',
                        selector: '#reapply-banner',
                        tip: 'Re-apply mode confirms that you are modifying the existing move instead of stacking a second animation on top of it.',
                        readingWeight: 'long',
                        ms: 1150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const easingField = document.getElementById('param-easing');
                            if (easingField) {
                                easingField.value = 'custom';
                                easingField.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            await runner._wait(180);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#easing-editor-modal:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#param-easing',
                        tip: 'Changing the easing dropdown to Custom opens the Easing Curve Editor with the current move loaded and ready for refinement.',
                        readingWeight: 'extra-long',
                        ms: 1350
                    },
                    {
                        action: 'tip',
                        selector: '#easing-editor-modal .easing-presets',
                        tip: 'The editor has a curve preview, control handles for shaping it, and a row of preset bezier shapes. Presets are the fastest entry point — pick one, then refine.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '.easing-preset-btn[data-preset="0.68,-0.55,0.27,1.55"]',
                        tip: 'Pick a preset curve so the tutorial demonstrates a visible custom-easing change without asking the cursor to drag handles manually.',
                        waitAfter: 160
                    },
                    {
                        action: 'tip',
                        selector: '#btn-easing-preview',
                        tip: 'Preview animates the curve in isolation so you can feel its timing before committing. Use it whenever you tweak a handle.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#btn-easing-apply',
                        tip: 'Apply writes the curve back into the animations easing field. The animation on the canvas is not yet updated — that needs the next step.',
                        waitAfter: 220
                    },
                    {
                        action: 'click',
                        selector: '#btn-apply-anim.reapply-mode',
                        tip: 'Press the Re-apply button on the animation row to commit the new custom curve. Your motion now uses the bezier you authored.',
                        waitAfter: 260
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        surfaceLabel: 'STAGE',
                        tip: 'With the custom curve committed, play the move once so the audience can see the updated timing on the actual object instead of only reading the settings panels.',
                        readingWeight: 'extra-long',
                        ms: 1350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            setStagePlayheadTime(0);
                            await runner._wait(120);
                            document.getElementById('stage-tb-play')?.click();
                            await runner._wait(1900);
                            window.app?.animations?.stop?.();
                            setStagePlayheadTime(0);
                            await runner._wait(140);
                        }
                    }
                ]
            },
            {
                id: 'stage-howto-image-single-smart-cut',
                title: 'How to Rig a Single-Image Character with Smart Cut',
                description: 'Seeds a suitable character image automatically, opens Smart Cut, and auto-cuts it into joint-aware parts.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'How-To',
                audience: 'Character animators',
                toolCoverage: ['Smart Cut', 'Image segmentation', 'Joint-aware parts'],
                intro: {
                    subject: 'the Smart Cut path for single-image characters',
                    kind: 'how-to',
                    purpose: 'show how one character image becomes a rigged, movable figure without manual cutting in another tool',
                    importance: 'Smart Cut is the fastest route for a single PNG or JPG character — no separate parts file required',
                    demonstration: 'loading a suitable demo character automatically, opening Smart Cut, choosing the Human Front preset, and auto-cutting it into joint-aware parts'
                },
                outro: {
                    subject: 'the Smart Cut path for single-image characters',
                    outcome: 'know which route to choose when you have a single character image with no pre-cut parts',
                    nextUse: 'rig stock characters and uploaded images in seconds without leaving Stage'
                },
                defaultPace: 'slow',
                voiceoverScript: 'This tutorial seeds a clean front-facing character automatically so Smart Cut runs on a suitable source instead of depending on whatever happens to be on stage. In normal work, the same Image tool is where you bring in your own PNG or JPG. With the image selected, open Smart Cut from the rigging tools, choose Human Front, and let Auto Cut and Assemble generate the parts. That is the fastest route from one character image to a posable rig when the art already matches a readable humanoid silhouette.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchLeftPanelTab('tools', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageCharacterWorkflowDemo(runner);
                            await resetStageCameraToFullView(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.tool-btn[data-tool="image"]',
                        tip: 'This walkthrough already placed a suitable demo character on stage automatically. In real use, this same Image tool is where you would add your own single PNG or JPG before running Smart Cut.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'The seeded demo character is front-facing, cleanly separated from the background, and has readable limbs. That is exactly the kind of source image Smart Cut can process automatically.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '#btn-image-smartcut',
                        tip: 'Open Smart Cut from the image rigging actions. Because the tutorial already selected a suitable source image, the tool can move straight into the rigging workflow.',
                        waitAfter: 260
                    },
                    {
                        action: 'waitFor',
                        selector: '#smart-cut-panel:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#smart-cut-panel .smc-preset-row[data-preset="human-front"]',
                        tip: 'Choose the Human Front preset so Smart Cut knows which body map to use when it traces and labels the seeded character automatically.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#smart-cut-panel .smc-preset-row[data-preset="human-front"]',
                        tip: 'Move from preset selection into the trace step. For a clean tutorial demo, Human Front is the right match for this preloaded character.',
                        waitAfter: 260
                    },
                    {
                        action: 'waitFor',
                        selector: '#smart-cut-panel #sc-step-trace:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#sc-auto-cut',
                        tip: 'Auto Cut and Assemble is the unattended version of this workflow: it traces the seeded figure, labels the parts, and builds the rig without manual drawing.',
                        readingWeight: 'extra-long',
                        ms: 1350
                    },
                    {
                        action: 'click',
                        selector: '#sc-auto-cut',
                        tip: 'Run the automatic cut now so the tutorial finishes with a real rig instead of stopping at panel narration.',
                        waitAfter: 260
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const knownIds = runner.context?.stageCharacterWorkflowState?.initialObjectIds || [];
                            await waitForStageNewObjects(runner, knownIds, 6000);
                            await runner._wait(220);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#left-panel',
                        tip: 'The cut result is now a real rigged character rather than one flat image. From here, the rig can be posed, moved, and refined with the normal character controls.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    }
                ]
            },
            {
                id: 'stage-howto-image-body-stencil',
                title: 'How to Rig a Character with the Body Stencil',
                description: 'Seeds a suitable character image automatically, opens Body Stencil, and captures a guided rig without requiring a manual import first.',
                path: {
                    id: 'stage-production-workflows',
                    title: 'Stage Production Workflows',
                    summary: 'Move from direct editing into AI planning, timeline review, reusable assets, and SmartArt handoff in one practical Stage path.',
                    order: 2
                },
                format: 'How-To',
                audience: 'Character animators',
                toolCoverage: ['Body Stencil', 'Guided rig template', 'Stylized character rigging'],
                intro: {
                    subject: 'the Body Stencil path for stylized characters',
                    kind: 'how-to',
                    purpose: 'show how a guided skeleton template snaps onto a stylized character image to produce a posable rig',
                    importance: 'Smart Cut struggles with stylized art — cartoonish proportions, painted lighting, abstract limbs — and the Body Stencil is the right fallback',
                    demonstration: 'loading a suitable demo character automatically, opening Body Stencil, choosing the front preset, and capturing the assembled rig'
                },
                outro: {
                    subject: 'the Body Stencil path for stylized characters',
                    outcome: 'know which route to take when Smart Cut fails on a stylized or non-standard character image',
                    nextUse: 'rig hand-drawn characters, mascots, and stylized illustrations that automatic detection cannot handle'
                },
                defaultPace: 'slow',
                voiceoverScript: 'The Body Stencil is the guided rigging path for character images that need more help than Smart Cut. This tutorial seeds a suitable character automatically so the lesson does not depend on the user importing art first. In real work, you would still use the Image tool to add your own character, open Body Stencil, choose the front or side preset, adjust the stars if the fit needs refinement, and then capture the assembled rig. For the demo figure used here, the default front stencil is already close enough to show the full path unattended.',
                beforeStart: 'prepareStageTutorial',
                afterFinish: async runner => {
                    await restoreStageCharacterWorkflowState(runner);
                },
                steps: [
                    {
                        action: 'call',
                        run: async runner => {
                            await setStageMode('basic', runner);
                            await switchLeftPanelTab('tools', runner);
                            await switchRightPanelTab('properties', runner);
                            await ensureStageCharacterWorkflowDemo(runner);
                            await resetStageCameraToFullView(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '.tool-btn[data-tool="image"]',
                        tip: 'This walkthrough already added a suitable character image automatically. In normal use, this same Image tool is where you would bring in your own hand-drawn, cartoon, mascot, or painted figure first.',
                        readingWeight: 'extra-long',
                        ms: 1300
                    },
                    {
                        action: 'tip',
                        selector: '#stage-viewport',
                        tip: 'When Smart Cut produces awkward parts on a character image, Body Stencil is the guided fallback. The seeded demo figure gives the tutorial a dependable source image before the stencil is opened.',
                        readingWeight: 'extra-long',
                        ms: 1400
                    },
                    {
                        action: 'click',
                        selector: '#btn-image-stencil',
                        tip: 'Open Body Stencil from the selected image. The tool overlays a guided humanoid stencil on top of the tutorial character.',
                        waitAfter: 260
                    },
                    {
                        action: 'waitFor',
                        selector: '#body-stencil-panel:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#body-stencil-panel .bs-preset-row[data-stencil="human-front"]',
                        tip: 'Choose the front-facing human stencil so the guide matches the seeded character layout before the capture step.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'click',
                        selector: '#body-stencil-panel .bs-preset-row[data-stencil="human-front"]',
                        tip: 'Enter the adjust step with the front-facing stencil. This is the point where real projects would refine the fit if the image needed it.',
                        waitAfter: 320
                    },
                    {
                        action: 'waitFor',
                        selector: '#body-stencil-panel #bs-step-adjust:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#body-stencil-panel .bs-help',
                        tip: 'In normal work you would drag stars and points here until the stencil matches the character exactly. The tutorial demo image already fits well enough that we can capture it without asking the user to do that alignment manually.',
                        readingWeight: 'extra-long',
                        ms: 1450
                    },
                    {
                        action: 'click',
                        selector: '#bs-cut-btn',
                        tip: 'Capture and assemble the rig now so the tutorial ends with a real Body Stencil result on stage.',
                        waitAfter: 260
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            const knownIds = runner.context?.stageCharacterWorkflowState?.initialObjectIds || [];
                            await waitForStageNewObjects(runner, knownIds, 6000);
                            await runner._wait(220);
                        }
                    },
                    {
                        action: 'waitFor',
                        selector: '#body-stencil-panel #bs-step-done:not(.hidden)',
                        timeout: 3000
                    },
                    {
                        action: 'tip',
                        selector: '#left-panel',
                        tip: 'The captured result is now a real rigged character in the stage object list. From here you can pose it directly and keep refining joints with the standard rigging controls.',
                        readingWeight: 'long',
                        ms: 1200
                    }
                ]
            }
        ]
    };

    // These control tours never upload, generate, apply, or save on the user's behalf.
    const currentPath = { id: 'current-workflows', title: 'Current Workflows', order: 0.5,
        summary: 'Characters, speech, conversations and the current recording controls.' };
    const currentTours = [
        ['svg-builder', 'SVG Builder: Presets and Views', 'builder', [
            ['#svg-african-character-modal', 'Choose a preset, then compare front, back, side and 3/4 artwork. Creating a new character and editing an existing character are different operations.'],
            ['#svg-african-character-modal', 'Adjust face, body, clothing, hair, headgear and accessories. Compare views after substantial changes; keep the established 3/4 option available while testing experimental artwork.'],
            ['#btn-svg-african-create', 'Create Character adds a new rig. To edit a stage character, right-click it and choose Edit SVG. Resize the whole character with the stage resize control, not individual limbs.'],
            ['#btn-svg-african-save-config', 'Save Setup preserves a reusable configuration. Save Identity and Save Styling separate the person from clothing. This tutorial does not create or save anything.']
        ]],
        ['photo-designer', 'Photo Designer: Outputs and Personal Presets', 'photo', [
            ['#character-designer-file', 'Upload one clear front-facing person and confirm permission. Readiness checks flag small, tilted or unclear faces before reconstruction. The tour does not upload a photo.'],
            ['#character-designer-photo-output', 'Photo likeness + SVG body retains photo detail. Fully vectorized creates editable vector artwork. Advanced cutting is manual. Preset approximation chooses an existing SVG character; it is not a face clone.'],
            ['[data-command="crop-photo"]', 'Crop first, then remove the background and refine edges. Inspect hair, ears and the neck for fringe or pieces of the original collar.'],
            ['#character-designer-pane', 'Photo landmarks locate facial features and body joints; they are not the cutout outline. Review their placement before reconstruction. Side and back views inferred from one photo are approximations.'],
            ['#character-designer-personal', 'After reconstructing and inspecting the result, open My photo presets, name it, confirm storage consent and Save new preset. Load a preset later to reuse it.']
        ]],
        ['realistic-workspace', 'Realistic Characters: Tools and Attachments', 'realistic', [
            ['.rc-workspace [data-action="load"]', 'Start with Character library or your own permitted image. A paid generated image is optional, not required.'],
            ['.rc-workspace [name="characterMode"]', 'Photographic body uses image parts. Realistic head + SVG body combines a realistic head with editable SVG clothing and limbs.'],
            ['.rc-workspace [data-action="crop"]', 'With an image loaded, Crop displays handles. Drag them, then Apply crop. Wheel scrolling over the image zooms for detailed edge work.'],
            ['.rc-workspace [name="tool"]', 'Erase and Restore edit the mask; Brush sets the visible cursor size. Clone source and Clone brush repair visible textures, not unseen anatomy.'],
            ['.rc-workspace [data-action="analyze"]', 'Fit landmarks estimates joint locations. Use Joint landmarks to adjust them. Part outline controls the pixels included in each body part, not the joint position.'],
            ['.rc-workspace [data-action="fit-attachment"]', 'An attachment must be inside its part outline. Fit attachment or Repair misplaced attachments can help, but inspect the shoulder, hip and neck positions afterwards.'],
            ['.rc-workspace [data-action="quality"]', 'Review every supplied view, check motion and facial regions, then save the preset or add it to stage. Large bends can expose missing photographic detail.']
        ]],
        ['conversations', 'Conversations: Templates and Staging', 'conversations', [
            ['#conversation-dialog [data-action="templates"]', 'Templates include different settings and casts. Review speaking and non-speaking actors, not just the dialogue.'],
            ['#conversation-dialog main', 'Use Preview scenes and dialogue or Customize before Create Conversation. Inspect views, seated characters, movement distances and props for every scene.'],
            ['#conversation-dialog [data-action="staging"]', 'After creating a conversation, Staging adjusts actor placement and supported actions. Check walking distance and furniture contacts in preview.'],
            ['#conversation-dialog [data-action="dialogue"]', 'Dialogue assigns each line to a speaker. Choose each speaker voice, select rows and generate deliberately. Preview all scenes and verify audio links in each scene.']
        ]],
        ['voices', 'Conversations: Voices and Batch Audio', 'voices', [
            ['[data-setting="speechProvider"]', 'Choose the source before choosing voices. Local server creates exportable English audio without provider fees. Browser voices are listen-only, not timeline audio.'],
            ['#conversation-voice-status', 'Read service status and quota notices. TTSMaker, ElevenLabs and Azure are superadmin-only and require configured services. This tutorial makes no speech requests.'],
            ['[data-voice-filter="gender"]', 'Filter voices using supplied gender, age and accent labels. Unspecified metadata does not imply a gender or a child voice. Nigerian English accents are not the same as Hausa, Igbo or Yoruba speech.'],
            ['.conversation-cast', 'Assign and audition a voice for each cast member. An ElevenLabs account may expose only its cloned voices or lack catalogue permissions. Browser voice availability varies by device.'],
            ['#conversation-dialog main', 'Select one or more dialogue rows and the scene scope before generating. Changed audio and selected audio are different batches. Check the cost confirmation, then verify each scene in Preview All Scenes.']
        ]],
        ['audio-lip-sync', 'Audio Lip Sync: Mouth and Performance', 'audio', [
            ['[data-als-field="mouthClarity"]', 'Open lip sync for the intended audio and character in this scene. Mouth opening changes how wide the lips open; strength and smoothing are separate controls.'],
            ['[data-als-field="showTeeth"]', 'SVG teeth add a restrained upper strip inside the mouth. Adjust visibility and inspect front and side speech rather than making teeth permanently visible.'],
            ['[data-als-field="handSpeed"]', 'Use Mouth only with separately authored walking or poses. Full performance adds speech gestures. Hand speed changes tempo; strength changes range and smoothing softens transitions.'],
            ['[data-als-action="add-performance"]', 'Performance cues add timed gesture overrides. Set a cue inside the clip, Apply the updated performance and replay from before the cue. They do not replace the speech audio.'],
            ['[data-als-action="preview"]', 'Preview, then Apply when satisfied. In the audio editor use Disconnect to unlink without deleting audio. Select another character in the same scene and apply again. This tour does not apply changes.']
        ]],
        ['captions-transcription', 'Transcription, Translation and Captions', 'captions', [
            ['.caption-workspace [data-field="audio"]', 'Choose the correct audio row. Caption text, translated text and generated speech are separate outputs.'],
            ['.caption-workspace [data-field="transcriptionLanguage"]', 'Long audio is sectioned. Local recognition has no provider charge when configured; OpenAI is paid. Retry with the same audio/settings to retain completed sections. Automatic detection does not add unsupported languages.'],
            ['.caption-workspace [data-field="translationProvider"]', 'Select local translation when available. English, Hausa, Igbo and Yoruba text still needs human review. Translation does not replace spoken audio.'],
            ['.caption-workspace [data-field="translationScope"]', 'Use selected missing or replace selected to limit changes. Review a translated draft before applying. A failed job is not a completed translation.'],
            ['.caption-workspace [data-field="highlight"]', 'Highlight spoken word uses word timings. Check timing after merging lines. Approximate highlighting is available when exact timings are absent; it is not forced alignment.'],
            ['.caption-workspace [data-field="textProgression"]', 'Choose Full text, Sentence by sentence, One word at a time or Progressive reveal. Scrub the preview below to compare. Full text starts with the cue, not before speech begins. Bilingual pairs stay together until split and reviewed.'],
            ['.caption-workspace [data-timing-quality]', 'Check this timing status while scrubbing. Word-timed means the active caption has word timing coverage; estimated or partial timing needs checking against the audio.'],
            ['.caption-workspace [data-field="seek"]', 'Move the playhead through the beginning, middle and end of speech. Check what appears in the preview, then apply your captions. Sequence Review Timing also lists speech, caption updates and head and body turns.'],
            ['.caption-workspace [data-field="delivery"]', 'Choose visible video captions or selectable captions as appropriate. Preview current and all scenes, then check the exported file. No transcription or translation is submitted by this tour.']
        ]],
        ['animate-navigation', 'Animate: Character and Scene Tools', 'armature', [
            ['#stage-animate', 'Animate above the stage opens animation tools directly. The character is already selected for this tutorial.'],
            ['[data-animate-tool="sequence"]', 'Character Sequence orders actions and speech for one character. Existing Pose Armature shortcuts remain available.'],
            ['[data-animate-tool="choreography"]', 'Scene Choreographer coordinates multiple actors and camera cues. Select multiple characters first to use those actors.'],
            ['[data-animate-tool="head"]', 'Head Turn changes only the head on supported SVG characters. This Universal demo does not support experimental head artwork.'],
            ['[data-animate-tool="body"]', 'Body Turn changes the character view. New smooth turns default to Quick pivot: 0.5 seconds of turning, then a hold for the rest of the step. Choose Gradual turn for a slower transition and adjust Turn duration separately from step duration. Existing saved turns keep their timing until edited. Seated works without experimental smoothing: standing characters turn first, then sit; seated characters stay seated.'],
            ['[data-animate-tool="debugger"]', 'Movement Debugger opens editable frames from the current pose. Reopen saved sequences and choreographies using their timeline Edit command.']
        ]],
        ['custom-pose-movement', 'Custom Pose to Movement: Angles and Tilt', 'armature', [
            ['#armature-new-movement-mode', 'First pose your character using View/Edit Properties: adjust shoulder, elbow and wrist angles and X/Y tilts. You can finish the pose before creating the movement. Choose Idle to Current Pose to keep that pose as the destination.'],
            ['#armature-new-debug-movement', 'New Movement opens three editable key poses: the start, halfway and finish. Idle to Current Pose supplies the idle start automatically; Current Pose to Idle reverses the endpoints. Edit Current Pose Frames retains the existing stationary-frame workflow.'],
            ['#armature-new-debug-movement', 'In the debugger, select the halfway frame and change Joint Angles or Joint Tilts to shape the path, such as bringing an elbow forward before the hand crosses the chest. Endpoint interpolation does not automatically avoid the torso or find a natural route.'],
            ['#armature-new-debug-movement', 'Preview, name the movement and Save Template. Select that template in Pose Armature, set Duration and Cycles, then Add to Timeline. Previewing or saving a template alone does not add a timeline action.'],
            ['#armature-new-movement-mode', 'For direct property recording instead: start in idle, click Stage Batch before editing, adjust the final pose, then click Record Timeline while the batch is active. Apply Batch commits edits but does not itself create a timeline transition. Record Step belongs to property recording.']
        ]],
        ['recording-kits', 'Recording: Timing, Cycles and Activity Kits', 'armature', [
            ['#armature-record-row', 'Click a pose or movement to preview it automatically. Preview does not add a timeline action.'],
            ['[data-record="duration"]', 'For movements set Duration and Cycles. For poses use transition and hold. Check the resulting range before adding.'],
            ['.activity-kit-controls', 'For a compatible action, enable Include activity props. Check grips, scale and furniture placement. Kits are intentionally unavailable in 3/4 views.'],
            ['[data-record="add"]', 'Add to Timeline authors the selected action. Watch progress and completion. Then use Edit Action, revise settings and Update Timeline. This tour only shows the controls.'],
            ['#armature-record-row', 'After deleting an action, select the pose or movement again before changing its kit. Do not confuse a live preview with a saved action.']
        ]],
        ['cross-view-natural-gait', 'Natural Gait and Cross-View Sequences', 'armature', [
            ['#armature-panel', 'Position and resize the character first. Natural walk and run entries use the compatible view; preview the start, steady gait and return to idle.'],
            ['#armature-cross-view', 'Use a cross-view sequence for supported front/side transitions. Ordinary side-view facing changes only left/right.'],
            ['[data-cross="mode"]', 'Choose walk then turn, or turn then walk where offered. Direction is from the viewer perspective.'],
            ['[data-cross="duration"]', 'Turn duration blends the view change; pause controls the stop. Inspect feet, head size and clothing after the turn before recording.'],
            ['#armature-record-row', 'Preview the sequence from the intended starting position. Add to Timeline separately, then inspect both endpoints in the clean preview window.']
        ]],
        ['ai-scene-camera', 'AI Scenes and Speaker Framing', 'ai', [
            ['#ai-prompt', 'Example: Create a classroom conversation with a teacher and two seated students. One student listens silently. Review cast, views, actions, props and dialogue before creating scenes. Generation can use provider credits; this tour does not submit the prompt.'],
            ['#ai-prompt', 'Ask for a wide opening, a three-second close-up while the teacher speaks, then a return to the wide shot. Inspect the resulting plan: a requested instruction is not proof that a camera action was authored.'],
            ['#ai-prompt', 'Create the reviewed scene plan, then assign per-speaker voices in Conversations. Audio stays draft until explicitly generated. Use Stage Camera to inspect or author speaker framing without resizing character parts.'],
            ['#ai-prompt', 'Check current-scene and all-scene preview, including lips, camera timing and captions. See the Camera workflow tutorial for hands-on framing controls.']
        ]]
    ];
    currentTours.forEach(([id, title, kind, rows], index) => {
        window.STAGE_TUTORIAL_PACK.tutorials.push({
            id: `stage-current-${id}`, title, path: currentPath, format: 'Workflow', audience: 'Stage users',
            description: `${title}. Guided control review; no uploads, paid requests or saved project changes.${kind === 'audio' ? ' Load audio and select its character first.' : kind === 'voices' ? ' Create a conversation first.' : ''}`,
            nextTutorialId: currentTours[index + 1] ? `stage-current-${currentTours[index + 1][0]}` : 'stage-camera-workflow',
            defaultPace: 'slow', toolCoverage: [title],
            beforeStart: async runner => {
                if (document.querySelector('dialog[open], .modal:not(.hidden), .als-modal:not(.hidden), .conversation-overlay:not(.hidden)')) {
                    return { prerequisite: 'Close the current editor after saving its draft, then start this tutorial.' };
                }
                const app = window.app;
                if (id === 'custom-pose-movement' && !app.jointSystem._canUseArmatureDebugger()) {
                    return { prerequisite: 'The custom movement debugger requires an admin or superadmin account. View/Edit Properties and Record Timeline remain the direct property-editing workflow.' };
                }
                if (kind === 'voices' && !app.conversations.current()?.conversation) {
                    return { prerequisite: 'Create a conversation first, then run the Voices and Batch Audio tutorial.' };
                }
                if (kind === 'audio') {
                    const audio = app.audioTimeline;
                    if (!audio?.isLoaded || !audio.audioBuffer) {
                        return { prerequisite: 'First import an audio clip into this scene. Select its SVG or Universal Character, then return to Tutorials and start Audio Lip Sync.' };
                    }
                    const characters = audio._getAvailableCharacters?.() || [];
                    const selectedIds = new Set(app.objects.getSelectedObjects().map(object => object.id));
                    const selected = characters.filter(character => app.jointSystem._getArmatureObjects(character.armature)?.some(object => selectedIds.has(object.id)));
                    const linked = characters.find(character => character.id === String(audio.characterId || ''));
                    if (!linked && selected.length !== 1 && characters.length !== 1) {
                        return { prerequisite: 'Select one SVG or Universal Character in this scene, or connect this audio to its character in Edit Audio. Then start the Audio Lip Sync tutorial again.' };
                    }
                }
                const state = { kind, time: app.animations.currentTime, mode: app.mode };
                runner.context.currentWorkflow = state;
                if (kind === 'builder') app.openSvgAfricanCharacterLibrary({ mode: 'create' });
                if (kind === 'photo') app.characterDesigner.open();
                if (kind === 'realistic') await app.realisticCharacters.open(null, { tutorial: true });
                if (kind === 'conversations' || kind === 'voices') {
                    await app.conversations.editor.open();
                    app.conversations.editor.tab = kind === 'voices' ? 'dialogue' : 'templates';
                    app.conversations.editor.render();
                }
                if (kind === 'audio' && !app.audioLipSync.open()) return { prerequisite: 'Connect the selected audio to a character with facial controls in this scene, then start Audio Lip Sync again.' };
                if (kind === 'captions') await window.CaptionWorkspace.open();
                if (kind === 'armature') {
                    const rig = await ensureStageUniversalCharacterHowToDemo(runner);
                    app.jointSystem.openArmaturePanel(rig);
                }
                if (kind === 'ai') await setStageMode('ai', runner);
            },
            beforeStep: async (runner, tutorial, step) => {
                if (step.selector?.startsWith('[data-animate-tool') && document.getElementById('stage-animate-menu')?.classList.contains('hidden')) document.getElementById('stage-animate')?.click();
                if (kind === 'audio' && /handSpeed|add-performance/.test(step.selector)) document.querySelector('[data-als-performance-mode="full"]')?.click();
                if (kind === 'audio' && step.selector.includes('add-performance')) document.querySelector('[data-als-cue-tab="performance"]')?.click();
                const captions = window.CaptionWorkspace;
                if (kind === 'captions') captions.tab(step.selector?.includes('highlight') || step.selector?.includes('delivery') ? 'style' : 'files');
                const element = document.querySelector(step.selector);
                if (!element) throw new Error(`Tutorial control is unavailable: ${step.selector}`);
                const pane = element.closest('[data-armature-workspace-pane]');
                if (pane) document.querySelector(`[data-armature-workspace-tab="${pane.dataset.armatureWorkspacePane}"]`)?.click();
                for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                    if (parent.tagName === 'DETAILS') parent.open = true;
                }
                // Native modal dialogs occupy the top layer: keep tutorial controls inside it.
                const host = element.closest('dialog[open]') || document.body;
                if (runner._shell && runner._shell.parentElement !== host) host.append(runner._shell);
                element.scrollIntoView({ block: 'center', behavior: 'instant' });
            },
            afterFinish: async runner => {
                if (!runner.context.currentWorkflow) return;
                if (runner._shell) document.body.append(runner._shell);
                const app = window.app;
                if (kind === 'builder') document.getElementById('svg-african-character-modal')?.classList.add('hidden');
                if (kind === 'photo') app.characterDesigner.close();
                if (kind === 'realistic') app.realisticCharacters.dialog?.close();
                if (kind === 'conversations' || kind === 'voices') app.conversations.editor.close();
                if (kind === 'audio') app.audioLipSync.close({ force: true });
                if (kind === 'captions') { window.CaptionWorkspace.stop(); window.CaptionWorkspace.modal.close(); }
                if (kind === 'armature') await restoreStageUniversalCharacterHowToState(runner);
                if (!document.getElementById('stage-animate-menu')?.classList.contains('hidden')) document.getElementById('stage-animate')?.click();
                if (kind === 'ai') await setStageMode(runner.context.currentWorkflow.mode || 'basic', runner);
                setStagePlayheadTime(runner.context.currentWorkflow.time);
                delete runner.context.currentWorkflow;
            },
            steps: rows.map(([selector, tip]) => ({ action: 'tip', selector, tip, readingWeight: 'extra-long', ms: 1500 }))
        });
    });
})();
