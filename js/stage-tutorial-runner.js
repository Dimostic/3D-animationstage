(function() {
    'use strict';

    function runWhenReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }
        callback();
    }

    function includesAny(value, tokens) {
        return tokens.some(token => value.includes(token));
    }

    async function fitStageViewportForTutorial(runner) {
        const stage = window.app?.stage;
        if (!stage || runner?.context?.stageTutorialViewportLocked === true) return;
        stage.resizeCanvas?.();
        stage.centerStage?.();
        stage.requestRender?.();
        await runner._wait(180);
    }

    async function openStagePanelIfCollapsed(panelId, toggleId, runner) {
        if (!document.getElementById(panelId)?.classList.contains('collapsed')) return;
        document.getElementById(toggleId)?.click();
        await runner._wait(260);
        await fitStageViewportForTutorial(runner);
    }

    async function switchLeftPanelTab(tab, runner) {
        if (!tab || window.app?.activeLeftTab === tab) return;
        if (typeof window.app?.switchLeftTab === 'function') {
            window.app.switchLeftTab(tab);
        } else {
            document.querySelector(`#left-panel .panel-tab[data-tab="${tab}"]`)?.click();
        }
        await runner._wait(180);
    }

    async function switchRightPanelTab(tab, runner) {
        if (!tab || window.app?.activeRightTab === tab) return;
        if (typeof window.app?.switchRightTab === 'function') {
            window.app.switchRightTab(tab);
        } else {
            document.querySelector(`#right-panel .panel-tab[data-tab="${tab}"]`)?.click();
        }
        await runner._wait(220);
    }

    async function switchAnimationSubtab(subtab, runner) {
        if (!subtab) return;
        const button = document.querySelector(`.anim-subtab[data-subtab="${subtab}"]`);
        if (!button || button.classList.contains('active')) return;
        button.click();
        await runner._wait(180);
    }

    async function openCollapsedStageSectionBody(sectionBody, runner) {
        if (!sectionBody?.classList?.contains('collapsed')) return;
        const header = sectionBody.previousElementSibling;
        if (!header?.classList?.contains('section-toggle') && !header?.classList?.contains('joint-group-toggle')) return;
        header.click();
        await runner._wait(180);
    }

    async function ensureStageSectionExpanded(selector, runner) {
        if (!selector) return;

        let element = null;
        try {
            element = document.querySelector(selector);
        } catch (error) {
            return;
        }
        if (!element) return;

        const collapsedBodies = [];
        let current = element;
        while (current && current !== document.body) {
            if ((current.classList?.contains('section-body') || current.classList?.contains('joint-group-body'))
                && current.classList.contains('collapsed')) {
                collapsedBodies.push(current);
            }
            current = current.parentElement;
        }

        const sectionContainer = element.closest?.('.tool-group, .prop-section, .anim-category, .tag-section, .code-section, .joint-group');
        if (sectionContainer) {
            const ownCollapsedBody = Array.from(sectionContainer.children).find(child => (
                (child.classList?.contains('section-body') || child.classList?.contains('joint-group-body'))
                && child.classList.contains('collapsed')
            ));
            if (ownCollapsedBody && !collapsedBodies.includes(ownCollapsedBody)) {
                collapsedBodies.push(ownCollapsedBody);
            }
        }

        for (const sectionBody of collapsedBodies.reverse()) {
            await openCollapsedStageSectionBody(sectionBody, runner);
        }
    }

    function resolveStageDropdownTarget(selector) {
        if (!selector || selector.includes('.tbr-dd-btn[data-target=')) return '';
        if (selector.includes('#tbr-drop-file')) return 'tbr-drop-file';
        if (includesAny(selector, ['#tbr-drop-go', '#btn-smartart'])) return 'tbr-drop-go';
        if (selector.includes('#tbr-drop-edit')) return 'tbr-drop-edit';
        if (selector.includes('#tbr-drop-stage')) return 'tbr-drop-stage';
        if (includesAny(selector, ['#tbr-drop-output', '#btn-export', '#btn-assets', '#btn-templates'])) return 'tbr-drop-output';
        if (includesAny(selector, ['#tbr-drop-tools', '#btn-demo-tour', '#btn-layout-menu', '#layout-dropdown', '#btn-animate-stage-camera', '#btn-teach-me'])) {
            return 'tbr-drop-tools';
        }
        return '';
    }

    async function ensureStageDropdownOpen(target, runner) {
        if (!target) return;
        const panel = document.getElementById(target);
        if (panel?.classList.contains('open')) return;
        document.querySelector(`.tbr-dd-btn[data-target="${target}"]`)?.click();
        await runner._wait(200);
    }

    async function ensureLayoutDropdownOpen(runner) {
        await ensureStageDropdownOpen('tbr-drop-tools', runner);
        if (document.getElementById('layout-dropdown')?.classList.contains('open')) return;
        document.getElementById('btn-layout-menu')?.click();
        await runner._wait(180);
    }

    function resolveStageLeftTab(selector) {
        if (!selector) return '';
        if (includesAny(selector, ['#tab-objects', '#objects-panel', '#object-list', '#objects-search'])) return 'objects';
        if (includesAny(selector, ['#tab-layers', '#layers-panel', '#layer-list'])) return 'layers';
        if (includesAny(selector, ['#tab-tools', '.tool-btn'])) return 'tools';
        return '';
    }

    function resolveStageRightTab(selector) {
        if (!selector) return '';
        if (includesAny(selector, ['#tab-tags', '#position-tags', '#object-tags', '#zone-tags'])) return 'tags';
        if (includesAny(selector, ['#tab-code', '#code-output', '#code-templates'])) return 'code';
        if (includesAny(selector, [
            '#tab-properties',
            '#armature-',
            '#image-properties',
            '#joints-section',
            '#rig-path-',
            '#btn-image-',
            '#btn-face-rig',
            '#face-rig-',
            '#btn-rig-image',
            '#btn-universal-char',
            '#btn-joint-',
            '#flex-properties',
            '#btn-flex-mode',
            '#btn-flex-rig-mode',
            '#flex-controls',
            '#flex-rig-controls',
            '#flex-rig-channel-',
            '#flex-rig-joint-list',
            '#btn-flex-rig-',
            '#joint-movement-picker',
            '#joint-pose-panel',
            '#joint-body-tags-panel',
            '#joint-contact-target-panel',
            '#armature-panel',
            '.ja-move-',
            '.jpl-',
            '#body-tags-',
            '.ct-',
            '.armature-'
        ])) {
            return 'properties';
        }
        if (includesAny(selector, ['#tab-animations', '.anim-subtab', '.anim-category', '.anim-btn', '#applied-anim', '#param-', '#btn-apply-anim', '#reapply-banner', '#path-', '#path-anim-builder', '#btn-pick-path-', '#btn-preview-path-anim', '#btn-apply-path-anim', '#ai-prompt', '#btn-ai-', '#ai-action-plan', '#ai-code-output', '#ai-prompt-guide', '.ai-awareness', '.ai-cache'])) {
            return 'animations';
        }
        return '';
    }

    function resolveAnimationSubtabFromDom(selector) {
        if (!selector) return '';

        try {
            const element = document.querySelector(selector);
            return element?.closest?.('.anim-subtab-content')?.getAttribute('data-subtab-content') || '';
        } catch (error) {
            return '';
        }
    }

    function resolveStageAnimationSubtab(selector) {
        if (!selector) return '';
        const explicitMatch = selector.match(/data-subtab-content=["']([^"']+)["']/);
        if (explicitMatch?.[1]) {
            return explicitMatch[1];
        }

        const domResolvedSubtab = resolveAnimationSubtabFromDom(selector);
        if (domResolvedSubtab) {
            return domResolvedSubtab;
        }

        if (includesAny(selector, ['.anim-category[data-category="path-anim"]', '#path-', '#path-anim-builder', '#btn-pick-path-', '#btn-preview-path-anim', '#btn-apply-path-anim'])) {
            return 'advanced';
        }
        return '';
    }

    function selectorTargetsTimeline(selector) {
        return includesAny(selector, ['#scene-bar', '#timeline-panel', '#timeline-ruler', '#tl-']);
    }

    function selectorTargetsTeachMe(selector) {
        return includesAny(selector, ['#teach-me-panel', '#teach-me-messages', '#teach-me-input', '#btn-teach-me-send']);
    }

    function selectorTargetsPromptGuide(selector) {
        return selector.includes('#ai-prompt-guide');
    }

    function selectorTargetsStageCamera(selector) {
        return selector.includes('.stage-camera-panel');
    }

    function selectorTargetsJointBuild(selector) {
        return includesAny(selector, ['#joint-build', '#btn-joint-']);
    }

    function selectorTargetsCharacterImageWorkflow(selector) {
        return includesAny(selector, [
            '#image-properties',
            '#btn-image-',
            '#btn-face-rig',
            '#face-rig-',
            '#btn-rig-image',
            '#btn-universal-char',
            '#joints-section',
            '#rig-path-',
            '#btn-joint-'
        ]);
    }

    function selectorTargetsPoseArmatureWorkflow(selector) {
        return includesAny(selector, [
            '#armature-',
            '#btn-joint-armature',
            '#btn-joint-armature-front-dummy',
            '#btn-joint-armature-side-dummy',
            '#btn-joint-armature-side-dual-dummy',
            '#armature-panel',
            '#armature-place-overlay',
            '#armature-fit-select',
            '#armature-body-tags',
            '.armature-pose-',
            '.armature-move-',
            '.armature-face-',
            '.armature-contact-btn'
        ]);
    }

    function selectorTargetsFlexRigWorkflow(selector) {
        return includesAny(selector, [
            '#flex-properties',
            '#btn-flex-rig-mode',
            '#flex-rig-controls',
            '#flex-rig-channel-',
            '#flex-rig-joint-list',
            '#btn-flex-rig-'
        ]);
    }

    function selectorTargetsAssembledCharacterWorkflow(selector) {
        return includesAny(selector, [
            '#btn-joint-movements',
            '#btn-joint-poses',
            '#btn-joint-body-tags',
            '#joint-movement-picker',
            '#joint-pose-panel',
            '#joint-body-tags-panel',
            '#joint-contact-target-panel',
            '.ja-move-',
            '.jpl-',
            '#body-tags-',
            '.ct-'
        ]);
    }

    function getValidTutorialSelectionIds(objects, ids = []) {
        if (!objects?.getObjectById || !Array.isArray(ids)) return [];
        return ids.filter(id => objects.getObjectById(id));
    }

    async function ensureTutorialSelection(runner, contextKey) {
        const objects = window.app?.objects;
        const state = runner?.context?.[contextKey];
        const targetIds = getValidTutorialSelectionIds(objects, state?.targetSelectionIds || state?.demoObjectIds || []);
        if (!objects || !targetIds.length) return;

        const selectedIds = Array.isArray(objects.selectedIds) ? objects.selectedIds : [];
        const alreadySelected = selectedIds.length === targetIds.length
            && targetIds.every(id => selectedIds.includes(id));
        if (!alreadySelected) {
            const previousSuppressHistory = Boolean(objects._suppressHistory);
            objects._suppressHistory = true;
            try {
                objects.select(targetIds);
            } finally {
                objects._suppressHistory = previousSuppressHistory;
            }
            await runner._wait(120);
        }

        objects.updateProperties?.();
        await runner._wait(60);
    }

    async function ensureCharacterWorkflowDemoSelection(runner) {
        await ensureTutorialSelection(runner, 'stageCharacterWorkflowState');
    }

    async function ensurePoseArmatureWorkflowDemoSelection(runner) {
        await ensureTutorialSelection(runner, 'stagePoseArmatureWorkflowState');
    }

    async function ensureAssembledCharacterWorkflowDemoSelection(runner) {
        await ensureTutorialSelection(runner, 'stageAssembledCharacterWorkflowState');
    }

    async function prepareStageTutorialStep(runner, tutorial, step) {
        const selector = String(step?.selector || '').trim();
        if (!selector) return;

        if (selector.includes('#layout-dropdown')) {
            await ensureLayoutDropdownOpen(runner);
        } else {
            await ensureStageDropdownOpen(resolveStageDropdownTarget(selector), runner);
        }

        if (selectorTargetsTimeline(selector)) {
            await openStagePanelIfCollapsed('timeline-panel', 'collapse-timeline', runner);
        }

        const leftTab = resolveStageLeftTab(selector);
        if (leftTab) {
            await openStagePanelIfCollapsed('left-panel', 'collapse-left', runner);
            await switchLeftPanelTab(leftTab, runner);
        }

        const rightTab = resolveStageRightTab(selector);
        if (rightTab) {
            await openStagePanelIfCollapsed('right-panel', 'collapse-right', runner);
            await switchRightPanelTab(rightTab, runner);
        }

        const animationSubtab = resolveStageAnimationSubtab(selector);
        if (animationSubtab) {
            await openStagePanelIfCollapsed('right-panel', 'collapse-right', runner);
            await switchRightPanelTab('animations', runner);
            await switchAnimationSubtab(animationSubtab, runner);
        }

        if (runner?.context?.stageCharacterWorkflowState && selectorTargetsCharacterImageWorkflow(selector)) {
            await openStagePanelIfCollapsed('right-panel', 'collapse-right', runner);
            await switchRightPanelTab('properties', runner);
            await ensureCharacterWorkflowDemoSelection(runner);

            const imagePropertiesVisible = !document.getElementById('image-properties')?.classList.contains('hidden');
            if (imagePropertiesVisible && includesAny(selector, ['#btn-face-rig', '#face-rig-'])) {
                const faceRigPanelHidden = document.getElementById('face-rig-controls')?.classList.contains('hidden');
                if (faceRigPanelHidden) {
                    document.getElementById('btn-face-rig')?.click();
                    await runner._wait(260);
                }
            }
        }

        if (runner?.context?.stagePoseArmatureWorkflowState
            && (selectorTargetsPoseArmatureWorkflow(selector) || selectorTargetsFlexRigWorkflow(selector))) {
            await openStagePanelIfCollapsed('right-panel', 'collapse-right', runner);
            await switchRightPanelTab('properties', runner);
            await ensurePoseArmatureWorkflowDemoSelection(runner);
        }

        if (runner?.context?.stageAssembledCharacterWorkflowState && selectorTargetsAssembledCharacterWorkflow(selector)) {
            await openStagePanelIfCollapsed('right-panel', 'collapse-right', runner);
            await switchRightPanelTab('properties', runner);
            await ensureAssembledCharacterWorkflowDemoSelection(runner);
        }

        await ensureStageSectionExpanded(selector, runner);

        const promptGuide = document.getElementById('ai-prompt-guide');
        if (selectorTargetsPromptGuide(selector) && promptGuide?.classList.contains('hidden')) {
            document.getElementById('btn-ai-help-toggle')?.click();
            await runner._wait(200);
        }

        const teachMePanel = document.getElementById('teach-me-panel');
        if (selectorTargetsTeachMe(selector) && teachMePanel?.classList.contains('hidden')) {
            await ensureStageDropdownOpen('tbr-drop-tools', runner);
            document.getElementById('btn-teach-me')?.click();
            await runner._wait(260);
        }

        const stageCameraReady = document.querySelector('.stage-camera-panel') && window.app?.stageCamera?._editMode;
        if (selectorTargetsStageCamera(selector) && !stageCameraReady) {
            await ensureStageDropdownOpen('tbr-drop-tools', runner);
            document.getElementById('btn-animate-stage-camera')?.click();
            await runner._wait(260);
        }

        const jointBuildGroup = document.getElementById('joint-build');
        if (selectorTargetsJointBuild(selector) && jointBuildGroup?.classList.contains('collapsed')) {
            document.querySelector('.joint-group-toggle[data-group="joint-build"]')?.click();
            await runner._wait(180);
        }
    }

    const prepareStageTutorialHook = async runner => {
            runner.context = runner.context || {};
            runner.context.stageTutorialViewportLocked = false;
            document.querySelectorAll('#export-modal:not(.hidden) .modal-close, #template-library-modal:not(.hidden) .modal-close, #asset-library-modal:not(.hidden) .modal-close').forEach(button => {
                button.click();
            });
            document.querySelectorAll('#dope-sheet-modal:not(.hidden) #dope-sheet-close, #symbols-modal:not(.hidden) #symbols-panel-close, #easing-editor-modal:not(.hidden) .modal-close').forEach(button => {
                button.click();
            });
            document.querySelectorAll('.tbr-dd-panel.open').forEach(panel => {
                panel.classList.remove('open');
            });
            document.querySelectorAll('.tbr-dd-btn.open').forEach(button => {
                button.classList.remove('open');
            });
            document.getElementById('layout-dropdown')?.classList.remove('open');
            document.getElementById('onion-skin-popover')?.remove();
            if (!document.getElementById('teach-me-panel')?.classList.contains('hidden')) {
                document.getElementById('btn-teach-me-close')?.click();
            }
            if (!document.getElementById('ai-prompt-guide')?.classList.contains('hidden')) {
                document.getElementById('btn-ai-guide-close')?.click();
            }
            window.app?.animations?._clearReapplyMode?.();
            window.app?.animations?.cancelPickingDestination?.();
            if (window.app?.stageCamera?._editMode) {
                window.app.stageCamera.exit(false);
            }
            window.app?.pathAnimation?.cancelSnapPick?.();
            window.app?.pathAnimation?.cancelPick?.();
            await runner._wait(300);
                await fitStageViewportForTutorial(runner);
    };

    const prepareStageTutorialWithPreviewWindowHook = async runner => {
        runner.context = runner.context || {};

        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || null;
        if (fullscreenElement) {
            try {
                if (typeof document.exitFullscreen === 'function') {
                    void document.exitFullscreen();
                } else if (typeof document.webkitExitFullscreen === 'function') {
                    document.webkitExitFullscreen();
                }
            } catch (_) {}
        }

        const stageWidth = window.app?.stage?.width || window.app?.stage?.canvas?.width || 1280;
        const stageHeight = window.app?.stage?.height || window.app?.stage?.canvas?.height || 720;
        const targetName = 'animstage_tutorial_preview_' + Date.now();
        const winW = Math.min(Math.max(640, stageWidth + 80), Math.max(680, screen.availWidth - 100));
        const winH = Math.min(Math.max(480, stageHeight + 120), Math.max(520, screen.availHeight - 100));

        let previewWindow = null;
        try {
            previewWindow = window.open('', targetName, `width=${winW},height=${winH}`);
            if (previewWindow && !previewWindow.closed) {
                previewWindow.document.open();
                previewWindow.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Tutorial Preview</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0f172a;color:#e2e8f0;font:16px/1.5 'Segoe UI',Arial,sans-serif;}main{max-width:420px;text-align:center;}h1{margin:0 0 12px;font-size:22px;}p{margin:0;color:#cbd5e1;}</style></head><body><main><h1>Preview Window Reserved</h1><p>The tutorial will load the animated preview here in a moment so the playback controls stay visible.</p></main></body></html>`);
                previewWindow.document.close();
            }
        } catch (_) {
            previewWindow = null;
        }

        runner.context.tutorialPreviewWindow = previewWindow;
        runner.context.tutorialPreviewWindowTargetName = targetName;
        await prepareStageTutorialHook(runner);
        if (fullscreenElement) {
            await runner._wait(260);
        }
    };

    const hooks = {
        prepareStageTutorial: prepareStageTutorialHook,
        prepareStageTutorialWithPreviewWindow: prepareStageTutorialWithPreviewWindowHook
    };

    runWhenReady(() => {
        if (!window.DomTutorialRunner || !window.TutorialSchema || !window.STAGE_TUTORIAL_PACK) return;

        const container = document.querySelector('.toolbar-fixed-right');
        if (!container) return;

        const runner = new window.DomTutorialRunner({
            appName: 'Stage Tutorials',
            buttonLabel: 'Tutorials',
            buttonId: 'btn-stage-tutorials',
            buttonClassName: 'tbr-quick-btn',
            panelId: 'stage-tutorial-panel',
            panelTitle: 'Stage Tutorials',
            panelTop: '78px',
            panelRight: '16px',
            enableTtsMaker: false,
            enableGoogleTts: false,
            warmAllTtsTutorialsOnOpen: false,
            autoWarmAllTtsTutorialsOnMount: false,
            defaultPathFilter: 'recommended',
            virtualPaths: [
                {
                    id: 'recommended',
                    title: 'Recommended',
                    summary: 'A curated learning path: start with the first-time tour and overview, then the core workflows most users need next.',
                    order: -0.5,
                    tutorialIds: [
                        'stage-first-time-demo-tour',
                        'stage-app-overview',
                        'stage-howto-object-animation',
                        'stage-timeline-preview-export',
                        'stage-help-and-smartart',
                        'stage-howto-universal-character-walk',
                        'stage-current-svg-builder',
                        'stage-current-recording-kits',
                        'stage-current-conversations',
                        'stage-current-voices',
                        'stage-current-audio-lip-sync',
                        'stage-current-captions-transcription',
                        'stage-current-photo-designer',
                        'stage-current-realistic-workspace',
                        'stage-current-cross-view-natural-gait',
                        'stage-current-ai-scene-camera',
                        'stage-howto-image-single-smart-cut',
                        'stage-assets-media-workflow',
                        'stage-ai-mode-prompt-output',
                        'stage-howto-add-soundtrack',
                        'stage-power-feature-easing-editor',
                        'stage-output-and-templates'
                    ]
                }
            ]
        });

        const tutorials = window.TutorialSchema.compileTutorialPack(window.STAGE_TUTORIAL_PACK, { hooks }).map(tutorial => ({
            ...tutorial,
            beforeStep: tutorial.beforeStep || prepareStageTutorialStep
        }));

        runner.registerTutorials(tutorials);
        runner.mountControls({ container });
        window.stageTutorialRunner = runner;
    });
})();
