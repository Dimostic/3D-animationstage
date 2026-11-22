(function() {
    'use strict';

    const EXAMPLES = {
        basics: 'Plan, Do, Check, Act',
        process: 'Step 1: Research -> Step 2: Build -> Step 3: Ship',
        numeric: 'Nigeria-234, South Africa-34, Uganda-100, USA-90',
        table: [
            '| Country | Value |',
            '| --- | ---: |',
            '| Nigeria | 234 |',
            '| South Africa | 34 |',
            '| Uganda | 100 |',
            '| USA | 90 |'
        ].join('\n'),
        timeline: [
            'Milestone',
            'Start Day',
            'End Day',
            'Research',
            '1',
            '5',
            'Prototype',
            '6',
            '12',
            'Launch',
            '13',
            '20'
        ].join('\n'),
        aiProcess: 'Create a 5-step process: Discover, Design, Build, Test, Launch',
        aiStyle: 'Keep the current labels and use arctic palette with fade-in animation'
    };

    function captureSmartArtAiMessageCount(runner) {
        runner.context.smartArtAiMessageCount = window.saAI?.messages?.length || 0;
    }

    async function waitForSmartArtAiReply(runner, timeoutMs = 4000) {
        const initialCount = runner.context?.smartArtAiMessageCount || 0;
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const messages = Array.isArray(window.saAI?.messages) ? window.saAI.messages : [];
            const lastMessage = messages[messages.length - 1] || null;
            if (messages.length > initialCount && lastMessage?.role === 'assistant') return;
            await runner._wait(120);
        }
    }

    function getSmartArtAppliedState() {
        const items = Array.isArray(window.saManager?.items) ? window.saManager.items : [];
        return {
            templateId: window.saManager?.currentTemplateId || '',
            itemCount: items.length,
            itemSignature: items.map(item => [item?.text || '', item?.subtext || '', item?.value ?? ''].join('::')).join('|')
        };
    }

    function captureSmartArtAppliedState(runner) {
        runner.context.smartArtAppliedState = getSmartArtAppliedState();
    }

    async function waitForSmartArtApply(runner, timeoutMs = 3000) {
        const initialState = runner.context?.smartArtAppliedState || getSmartArtAppliedState();
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const currentState = getSmartArtAppliedState();
            const generatedObjects = window.saManager?.generatedLayout?.objects?.length || 0;
            const renderedTextItems = document.querySelectorAll('#sa-text-list .sa-text-item').length;
            const changed = currentState.templateId !== initialState.templateId
                || currentState.itemCount !== initialState.itemCount
                || currentState.itemSignature !== initialState.itemSignature;
            const ready = Boolean(currentState.templateId && currentState.itemCount > 0 && generatedObjects > 0 && renderedTextItems > 0);
            if (changed && ready) return;
            await runner._wait(120);
        }
    }

    async function waitForSmartArtPlayback(runner, timeoutMs = 5000) {
        const deadline = Date.now() + timeoutMs;
        let sawPlaybackStart = false;
        while (Date.now() < deadline) {
            const manager = window.saManager;
            const isPlaying = Boolean(manager?.isPlaying);
            if (isPlaying) sawPlaybackStart = true;
            if (sawPlaybackStart && !isPlaying) return;
            await runner._wait(120);
        }
    }

    window.SMARTART_TUTORIAL_PACK = {
        id: 'smartart',
        title: 'SmartArt Tutorials',
        tutorials: [
            {
                id: 'smartart-import-basics',
                title: 'SmartArt Import Basics',
                description: 'Shows how pasted text becomes cycle and process layouts without manual positioning.',
                path: {
                    id: 'smartart-workflow',
                    title: 'SmartArt Workflow',
                    summary: 'Move from imported structure to data-driven layouts, AI-assisted drafting, and final style or export polish in one sequential SmartArt path.',
                    order: 1
                },
                format: 'Tool Family',
                audience: 'SmartArt users',
                nextTutorialId: 'smartart-import-data',
                toolCoverage: ['Import tab', 'Suggest detection', 'Cycle suggestions', 'Process suggestions', 'Preview'],
                intro: {
                    subject: 'SmartArt Import Basics',
                    kind: 'tool',
                    purpose: 'turn pasted lists into cycle and process diagrams automatically',
                    importance: 'it helps users move from rough notes to a clean visual quickly',
                    demonstration: 'Plan, Do, Check, Act, followed by a short process example'
                },
                outro: {
                    subject: 'SmartArt Import Basics',
                    outcome: 'convert simple pasted text into cycle and process diagrams',
                    nextUse: 'turn raw notes into structured SmartArt with less manual setup'
                },
                defaultPace: 'slow',
                voiceoverScript: 'Open the Import tab and begin with a simple text example such as Plan, Do, Check, Act. Select Suggest so SmartArt Import can detect the structure and recommend suitable layouts. Apply a cycle-style result and preview the animation. Then clear the example, paste a short process sequence, detect the structure again, choose a process layout, and preview the updated SmartArt.',
                beforeStart: 'ensureRightPanelOpen',
                steps: [
                    {
                        action: 'click',
                        selector: '.sa-right-tab[data-pane="sa-pane-import"]',
                        tip: 'Open the Import tab to turn pasted text into SmartArt suggestions.',
                        waitAfter: 450
                    },
                    {
                        action: 'input',
                        selector: '#sa-import-input',
                        value: EXAMPLES.basics,
                        tip: 'Paste a plain list. The importer now splits simple comma-separated ideas correctly.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-detect',
                        tip: 'Ask SmartArt Import to detect the structure and suggest matching templates.',
                        waitAfter: 650
                    },
                    {
                        action: 'waitFor',
                        selector: '#sa-import-suggestions .sa-import-card',
                        timeout: 4000
                    },
                    {
                        action: 'scroll',
                        selector: '#sa-import-suggestions',
                        tip: 'The suggestions area updates with layouts that match the pasted structure.',
                        waitAfter: 350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAppliedState(runner);
                        }
                    },
                    {
                        action: 'clickMatching',
                        selector: '#sa-import-suggestions .sa-import-card',
                        textMatch: 'cycle',
                        tip: 'Pick a cycle-style result for the Plan, Do, Check, Act example.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtApply(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Play the SmartArt animation to preview the imported layout in motion.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-reset-btn',
                        tip: 'Reset the animation before moving to the next example.',
                        waitAfter: 500
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-clear',
                        tip: 'Clear the previous example and suggestions with one click.',
                        waitAfter: 450
                    },
                    {
                        action: 'input',
                        selector: '#sa-import-input',
                        value: EXAMPLES.process,
                        tip: 'Now paste a sequential process example.',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-detect',
                        tip: 'Detect again to switch the suggestions from a cycle to a process flow.',
                        waitAfter: 650
                    },
                    {
                        action: 'waitFor',
                        selector: '#sa-import-suggestions .sa-import-card',
                        timeout: 4000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAppliedState(runner);
                        }
                    },
                    {
                        action: 'clickMatching',
                        selector: '#sa-import-suggestions .sa-import-card',
                        textMatch: 'process',
                        tip: 'Choose a process layout for step-by-step text.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtApply(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Play again to show the imported process animation.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    }
                ]
            },
            {
                id: 'smartart-import-data',
                title: 'SmartArt Import for Data',
                description: 'Walks through numeric lists, Markdown tables, and flattened milestone pastes so chart and timeline suggestions appear automatically.',
                path: {
                    id: 'smartart-workflow',
                    title: 'SmartArt Workflow',
                    summary: 'Move from imported structure to data-driven layouts, AI-assisted drafting, and final style or export polish in one sequential SmartArt path.',
                    order: 1
                },
                format: 'Deep Dive',
                audience: 'SmartArt users',
                nextTutorialId: 'smartart-ai-assistant',
                toolCoverage: ['Inline numeric import', 'Markdown table import', 'Flattened timeline import', 'Force template', 'Chart suggestions'],
                intro: {
                    subject: 'SmartArt Import for Data',
                    kind: 'tool',
                    purpose: 'read numeric lists, tables, and schedules, then suggest matching charts and timelines',
                    importance: 'it converts spreadsheet-style content into a clear visual quickly',
                    demonstration: 'inline values, a Markdown table, and a milestone schedule'
                },
                outro: {
                    subject: 'SmartArt Import for Data',
                    outcome: 'turn numeric and tabular content into charts and timeline layouts',
                    nextUse: 'present spreadsheet-style information as a clearer visual summary'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Open the Import tab and begin with a single-line numeric example. Paste the label-value pairs, detect the structure, and apply one of the suggested chart layouts. Preview the result, then use Force template to apply a different chart to the same data without entering it again. Next, clear the input, paste a Markdown table, detect the structure again, and apply another chart. Finally, paste a flattened milestone schedule so the importer can rebuild the data and recommend a timeline-style layout.',
                beforeStart: 'ensureRightPanelOpen',
                steps: [
                    {
                        action: 'click',
                        selector: '.sa-right-tab[data-pane="sa-pane-import"]',
                        tip: 'Open Import and start with a single-line numeric example.',
                        waitAfter: 450
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-clear',
                        tip: 'Start from a clean input box.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-import-input',
                        value: EXAMPLES.numeric,
                        tip: 'Paste label-value pairs in one line. The parser now preserves the first numeric label correctly.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-detect',
                        tip: 'Detect the data to surface chart-friendly templates.',
                        waitAfter: 700
                    },
                    {
                        action: 'waitFor',
                        selector: '#sa-import-suggestions .sa-import-card',
                        timeout: 4000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAppliedState(runner);
                        }
                    },
                    {
                        action: 'clickMatching',
                        selector: '#sa-import-suggestions .sa-import-card',
                        textMatch: 'bar',
                        tip: 'Choose a chart suggestion from the detected numeric data.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtApply(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Preview the imported chart animation.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-reset-btn',
                        tip: 'Reset the animation so the next import action is easy to compare on screen.',
                        waitAfter: 500
                    },
                    {
                        action: 'input',
                        selector: '#sa-import-template',
                        value: 'donut-chart',
                        tip: 'If you want a specific layout instead of the top suggestion, use Force template and pick a chart directly from the dropdown.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAppliedState(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-apply-forced',
                        tip: 'Apply the forced template to reuse the same numeric data in a different visual layout.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtApply(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Preview the forced donut chart before moving to the table example.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-reset-btn',
                        tip: 'Reset again before loading the Markdown table example.',
                        waitAfter: 500
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-clear',
                        tip: 'Clear the inline data.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-import-input',
                        value: EXAMPLES.table,
                        tip: 'Paste a Markdown table to drive chart suggestions from rows and columns.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-detect',
                        tip: 'The importer recognizes table headers and numeric cells automatically.',
                        waitAfter: 700
                    },
                    {
                        action: 'waitFor',
                        selector: '#sa-import-suggestions .sa-import-card',
                        timeout: 4000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAppliedState(runner);
                        }
                    },
                    {
                        action: 'clickMatching',
                        selector: '#sa-import-suggestions .sa-import-card',
                        textMatch: 'bar',
                        tip: 'Apply another chart suggestion, this time from the table structure.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtApply(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Play the chart built from table data.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-reset-btn',
                        tip: 'Reset again before the final timeline example.',
                        waitAfter: 500
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-clear',
                        tip: 'Clear the table and load the milestone schedule example.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-import-input',
                        value: EXAMPLES.timeline,
                        tip: 'Paste a flattened spreadsheet export. The importer rebuilds it into real table data.',
                        readingWeight: 'extra-long',
                        waitAfter: 350
                    },
                    {
                        action: 'click',
                        selector: '#sa-import-detect',
                        tip: 'Detect the schedule so timeline and milestone layouts rise to the top.',
                        waitAfter: 700
                    },
                    {
                        action: 'waitFor',
                        selector: '#sa-import-suggestions .sa-import-card',
                        timeout: 4000
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAppliedState(runner);
                        }
                    },
                    {
                        action: 'clickMatching',
                        selector: '#sa-import-suggestions .sa-import-card',
                        textMatch: 'timeline',
                        tip: 'Choose a timeline suggestion produced from the flattened milestone paste.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtApply(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Finish by previewing the imported milestone timeline animation.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    }
                ]
            },
            {
                id: 'smartart-ai-assistant',
                title: 'SmartArt AI Assistant',
                description: 'Shows how the AI assistant can create a first draft from one prompt, then refine palette and animation with short follow-up prompts.',
                path: {
                    id: 'smartart-workflow',
                    title: 'SmartArt Workflow',
                    summary: 'Move from imported structure to data-driven layouts, AI-assisted drafting, and final style or export polish in one sequential SmartArt path.',
                    order: 1
                },
                format: 'Workflow',
                audience: 'SmartArt users',
                nextTutorialId: 'smartart-templates-style-export',
                toolCoverage: ['AI tab', 'Quick prompt chips', 'Prompt input', 'AI message history', 'Preview after refinement'],
                intro: {
                    subject: 'the SmartArt AI Assistant',
                    kind: 'tool',
                    purpose: 'create a first draft from a plain-language prompt and refine layout, color, and animation',
                    importance: 'it helps users move from an idea to a polished diagram quickly',
                    demonstration: 'a quick prompt, a more specific prompt, and a style update'
                },
                outro: {
                    subject: 'the SmartArt AI Assistant',
                    outcome: 'generate and refine a SmartArt draft through short prompts',
                    nextUse: 'develop polished diagram concepts faster from simple written instructions'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Open the AI tab and begin with a quick prompt to generate an immediate first draft. Review both the response and the resulting layout on the canvas. Then replace the starter example with a more specific process prompt that supplies the exact workflow steps you want to present. Once the structure is correct, send a short follow-up prompt that keeps the current labels and only refines the palette and animation. Conclude by previewing the refined SmartArt so the audience can see the completed prompt-and-refine workflow.',
                beforeStart: 'prepareAIAssistantTutorial',
                steps: [
                    {
                        action: 'click',
                        selector: '.sa-right-tab[data-pane="sa-pane-ai"]',
                        tip: 'Open the AI tab to keep the prompt history and the SmartArt canvas visible together.',
                        waitAfter: 450
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAiMessageCount(runner);
                        }
                    },
                    {
                        action: 'clickMatching',
                        selector: '.sa-ai-dock-chip, .sa-ai-quick-btn',
                        textMatch: '5-step process',
                        tip: 'Start with a quick prompt chip when you want an instant first draft without typing a full request.',
                        waitAfter: 200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtAiReply(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#sa-canvas',
                        tip: 'The stage updates immediately, so the tutorial can show the generated layout before any manual refinement.',
                        ms: 1000
                    },
                    {
                        action: 'tip',
                        selector: '#sa-ai-messages',
                        tip: 'The assistant explains what it changed, which makes the prompt and the resulting SmartArt easy to narrate together.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'input',
                        selector: '#sa-ai-input',
                        value: EXAMPLES.aiProcess,
                        tip: 'Now type a more specific prompt with the exact steps you want on stage, so the result feels real instead of generic.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAiMessageCount(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-ai-send',
                        tip: 'Send the prompt to replace the starter example with a process that uses clear, named workflow steps.',
                        waitAfter: 200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtAiReply(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#sa-canvas',
                        tip: 'This is the key AI workflow: first generate the structure, then check that the stage content is actually the story you want to show.',
                        readingWeight: 'long',
                        ms: 1200
                    },
                    {
                        action: 'input',
                        selector: '#sa-ai-input',
                        value: EXAMPLES.aiStyle,
                        tip: 'Use a short follow-up prompt that says to keep the current labels, so the assistant only restyles the same SmartArt instead of replacing its content.',
                        readingWeight: 'long',
                        waitAfter: 350
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            captureSmartArtAiMessageCount(runner);
                        }
                    },
                    {
                        action: 'click',
                        selector: '#sa-ai-send',
                        tip: 'Send the style prompt to keep the current labels in place while improving readability and applying a cleaner presentation.',
                        waitAfter: 200
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtAiReply(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#sa-ai-messages',
                        tip: 'The second reply confirms that the palette and animation changed while the current labels stayed intact, which keeps the tutorial truthful.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Play the result to finish with the refined SmartArt, not the rough first draft.',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    }
                ]
            },
            {
                id: 'smartart-templates-style-export',
                title: 'Templates, Palettes, and Export',
                description: 'Shows a practical workflow for choosing a template, replacing placeholder content, adapting the layout, polishing the style, and preparing the result for export or stage handoff.',
                path: {
                    id: 'smartart-workflow',
                    title: 'SmartArt Workflow',
                    summary: 'Move from imported structure to data-driven layouts, AI-assisted drafting, and final style or export polish in one sequential SmartArt path.',
                    order: 1
                },
                format: 'Deep Dive',
                audience: 'SmartArt users',
                toolCoverage: ['Template search', 'Text pane', 'Direction controls', 'Palette and style polish', 'Export or stage handoff'],
                intro: {
                    subject: 'SmartArt templates, palettes, and export',
                    kind: 'toolset',
                    purpose: 'provide a ready-made starting point, support content and style edits, and prepare the final result',
                    importance: 'it enables users to produce a presentation-ready visual without building everything from scratch',
                    demonstration: 'a milestone timeline template being turned into a finished roadmap'
                },
                outro: {
                    subject: 'SmartArt templates, palettes, and export',
                    outcome: 'select a template, refine its content and styling, and prepare it for delivery',
                    nextUse: 'build presentation-ready SmartArt faster and hand it off with confidence'
                },
                defaultPace: 'very-slow',
                voiceoverScript: 'Search for the template that best matches the message you need to present, then apply the milestone timeline to the canvas. Open the Text tab and replace the placeholder labels with real milestones such as Discovery, Prototype, Pilot, Launch, and Review. Once the content is in place, adapt the layout by switching to a vertical direction, fit it to the window, and make a few finishing adjustments such as increasing the font scale and applying a built-in palette. Preview the finished SmartArt, then conclude by showing the two delivery paths: export it as a PNG or send it back to the main stage.',
                beforeStart: 'ensureSmartArtPanelsOpen',
                afterFinish: 'clearTemplateSearch',
                steps: [
                    {
                        action: 'input',
                        selector: '#sa-search',
                        value: 'milestone',
                        tip: 'Start with search so you can jump straight to the template that matches the story you need to present.',
                        waitAfter: 500
                    },
                    {
                        action: 'clickMatching',
                        selector: '.sa-template-card',
                        textMatch: 'milestone timeline',
                        tip: 'Choose a milestone timeline when you need a simple project, launch, or roadmap visual instead of a generic SmartArt block list.',
                        waitAfter: 900
                    },
                    {
                        action: 'waitFor',
                        selector: '#sa-text-list .sa-text-item:nth-child(6) input',
                        timeout: 4000
                    },
                    {
                        action: 'click',
                        selector: '.sa-right-tab[data-pane="sa-pane-text"]',
                        tip: 'Open the Text tab so the tutorial shows the most practical step first: replacing placeholder labels with your real content.',
                        waitAfter: 450
                    },
                    {
                        action: 'tip',
                        selector: '#sa-text-list',
                        tip: 'This editor is where templates become useful. Swap the defaults for the milestones, phases, or checkpoints you actually need to communicate.',
                        readingWeight: 'long',
                        ms: 1100
                    },
                    {
                        action: 'input',
                        selector: '#sa-text-list .sa-text-item:nth-child(2) input',
                        value: 'Discovery',
                        tip: 'Replace the first placeholder with a real starting milestone.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-text-list .sa-text-item:nth-child(3) input',
                        value: 'Prototype',
                        tip: 'Continue with the next key milestone so the structure reads like a real delivery sequence.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-text-list .sa-text-item:nth-child(4) input',
                        value: 'Pilot',
                        tip: 'Short milestone names keep the timeline clear and readable on stage.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-text-list .sa-text-item:nth-child(5) input',
                        value: 'Launch',
                        tip: 'Use the text list to finish the core sequence without dragging any objects manually.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-text-list .sa-text-item:nth-child(6) input',
                        value: 'Review',
                        tip: 'Finish with an outcome or review milestone so the timeline feels complete instead of template-like.',
                        waitAfter: 350
                    },
                    {
                        action: 'input',
                        selector: '#sa-flow-direction',
                        value: 'vertical',
                        tip: 'Switch the direction when the same content needs to fit a taller page, portrait video, or narrow presentation area.',
                        readingWeight: 'long',
                        waitAfter: 650
                    },
                    {
                        action: 'click',
                        selector: '#sa-fit-window',
                        tip: 'Fit the updated layout so the tutorial shows the full composition after the content and direction change.',
                        waitAfter: 500
                    },
                    {
                        action: 'input',
                        selector: '#sa-font-scale',
                        value: '1.1',
                        tip: 'A small font-size adjustment can make milestone labels more presentation-ready without rebuilding the template.',
                        waitAfter: 450
                    },
                    {
                        action: 'click',
                        selector: '#sa-palette-row .sa-palette-chip:nth-child(2)',
                        tip: 'Then apply a palette chip to quickly move from placeholder styling to something cleaner and more deliberate.',
                        waitAfter: 500
                    },
                    {
                        action: 'click',
                        selector: '#sa-play-btn',
                        tip: 'Preview the result after the content, layout, and style updates so you can judge the full presentation, not just the static frame.',
                        readingWeight: 'long',
                        waitAfter: 150
                    },
                    {
                        action: 'call',
                        run: async runner => {
                            await waitForSmartArtPlayback(runner);
                        }
                    },
                    {
                        action: 'tip',
                        selector: '#sa-export-png',
                        tip: 'Use PNG when you need a clean still graphic for slides, reports, one-pagers, or documentation.',
                        ms: 1200
                    },
                    {
                        action: 'tip',
                        selector: '#sa-send-to-stage',
                        tip: 'Use Send to Stage when this SmartArt should become part of a larger animation scene instead of a standalone export.',
                        readingWeight: 'long',
                        ms: 1400
                    }
                ]
            }
        ]
    };
})();