(function() {
    'use strict';

    function resolveHook(name, hooks) {
        if (typeof name === 'function') return name;
        if (typeof name !== 'string' || !name) return null;
        return async function(runner, tutorial, step, index, totalSteps) {
            const hook = hooks?.[name];
            if (typeof hook !== 'function') {
                throw new Error('Tutorial hook not found: ' + name);
            }
            return hook(runner, tutorial, step, index, totalSteps);
        };
    }

    function compileStep(step, hooks) {
        const next = { ...step };
        if (next.action === 'call' && next.call) {
            next.run = resolveHook(next.call, hooks);
        }
        delete next.call;
        return next;
    }

    function buildTutorialIntroText(tutorial) {
        const intro = tutorial?.intro;
        if (!intro) return '';

        const subject = String(intro.subject || tutorial?.title || '').trim();
        const kind = String(intro.kind || 'tool').trim() || 'tool';
        const purpose = String(intro.purpose || '').trim();
        const importance = String(intro.importance || '').trim();
        const demonstration = String(intro.demonstration || '').trim();

        return [
            subject ? 'In this tutorial, you will learn about ' + subject + '.' : '',
            purpose ? 'This ' + kind + ' is used to ' + purpose + '.' : '',
            importance ? 'This is important because ' + importance + '.' : '',
            demonstration ? 'The tutorial then demonstrates ' + demonstration + '.' : ''
        ].filter(Boolean).join(' ');
    }

    function buildIntroStep(tutorial) {
        const introText = buildTutorialIntroText(tutorial);
        if (!introText) return null;

        return {
            action: 'tip',
            tip: introText,
            voiceover: introText,
            readingWeight: 'long',
            ms: Math.max(1300, Number(tutorial?.intro?.ms) || 1700)
        };
    }

    function buildTutorialOutroText(tutorial) {
        const outro = tutorial?.outro;
        if (!outro) return '';

        const subject = String(outro.subject || tutorial?.title || '').trim();
        const outcome = String(outro.outcome || '').trim();
        const nextUse = String(outro.nextUse || '').trim();

        return [
            subject ? 'This concludes the tutorial on ' + subject + '.' : '',
            outcome ? 'You have seen how to ' + outcome + '.' : '',
            nextUse ? 'You can now use this workflow to ' + nextUse + '.' : ''
        ].filter(Boolean).join(' ');
    }

    function buildOutroStep(tutorial) {
        const outroText = buildTutorialOutroText(tutorial);
        if (!outroText) return null;

        return {
            action: 'tip',
            tip: outroText,
            voiceover: outroText,
            readingWeight: 'long',
            ms: Math.max(1200, Number(tutorial?.outro?.ms) || 1600)
        };
    }

    function compileTutorialPack(pack, options = {}) {
        const hooks = options.hooks || {};
        return (pack?.tutorials || []).map(tutorial => {
            const introText = buildTutorialIntroText(tutorial);
            const introStep = buildIntroStep(tutorial);
            const outroText = buildTutorialOutroText(tutorial);
            const outroStep = buildOutroStep(tutorial);
            const steps = (tutorial.steps || []).map(step => compileStep(step, hooks));

            return {
                ...tutorial,
                beforeStart: resolveHook(tutorial.beforeStart, hooks),
                afterFinish: resolveHook(tutorial.afterFinish, hooks),
                voiceoverScript: [introText, String(tutorial.voiceoverScript || '').trim(), outroText].filter(Boolean).join(' '),
                steps: [introStep, ...steps, outroStep].filter(Boolean)
            };
        });
    }

    window.TutorialSchema = {
        compileTutorialPack
    };
})();