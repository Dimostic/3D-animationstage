class HelpKnowledgeEngine {
    constructor(options = {}) {
        this.knowledge = options.knowledge || (typeof TEACH_ME_KNOWLEDGE !== 'undefined' ? TEACH_ME_KNOWLEDGE : []);
        this.appName = options.appName || 'Animation Stage';
        this.persona = options.persona || 'Teach Me';
        this.roleDescription = options.roleDescription || 'the built-in help assistant';
        this.appOverview = options.appOverview || `${this.appName} is a browser-based 2D animation studio with a stage canvas, left panel tools, right-side properties, and a bottom timeline.`;
    }

    buildSystemPrompt(extraInstructions = '') {
        const categories = {};
        for (const entry of this.knowledge) {
            const category = entry.category || 'general';
            if (!categories[category]) categories[category] = [];
            categories[category].push(`- ${entry.title}: ${entry.summary}`);
        }

        let knowledgeBlock = '';
        for (const [category, items] of Object.entries(categories)) {
            knowledgeBlock += `\n${category.toUpperCase()}:\n${items.join('\n')}\n`;
        }

        return `You are "${this.persona}", ${this.roleDescription} for ${this.appName}.

Your role: answer questions about what the app does, which workflows fit a task, and how to use features step by step.

APP OVERVIEW:
${this.appOverview}

FEATURES & KNOWLEDGE:
${knowledgeBlock}
RESPONSE FORMAT RULES:
- Use HTML formatting in your responses
- Use <strong> for emphasis, <code> for shortcuts or property names
- Use <ol> with <li> for workflows and decision steps
- Use <h4> for short section headings
- Mention relevant panels, menus, and tools when they matter
- Be concise but practical
${extraInstructions}`;
    }

    answerBuiltIn(question, options = {}) {
        return this.answerBuiltInDetailed(question, options).answer;
    }

    answerBuiltInDetailed(question, options = {}) {
        try {
            const contextualQuestion = this.buildContextualQuestion(question, options);
            const comparisonAnswer = this.buildComparisonAnswer(question, options);
            if (comparisonAnswer) {
                return {
                    answer: comparisonAnswer,
                    contextualQuestion,
                    matches: [],
                    matchedTopics: this._extractPriorTopics(options.history || [])
                };
            }

            const matches = this.findMatches(contextualQuestion, 3);
            if (matches.length && matches[0].score >= 2) {
                return {
                    answer: matches[0].entry.answer,
                    contextualQuestion,
                    matches,
                    matchedTopics: matches.map((match) => match.entry.title)
                };
            }

            return {
                answer: this.buildGenericAnswer(contextualQuestion, matches),
                contextualQuestion,
                matches,
                matchedTopics: matches.map((match) => match.entry.title)
            };
        } catch (error) {
            console.error('HelpKnowledgeEngine.answerBuiltInDetailed failed', error);
            return {
                answer: this.buildGenericAnswer(question, []),
                contextualQuestion: question,
                matches: [],
                matchedTopics: []
            };
        }
    }

    buildContextualQuestion(question, options = {}) {
        const normalizedQuestion = this._normalize(question);
        const priorQuestion = this._extractPriorQuestion(options.history || []);
        const directMatches = this.findMatches(question, 1);

        if (!priorQuestion || !this._isAmbiguousFollowUp(normalizedQuestion)) {
            return question;
        }

        if (directMatches.length && directMatches[0].score >= 2) {
            return question;
        }

        return `${question} Context from previous question: ${priorQuestion}`;
    }

    findMatches(question, limit = 3) {
        const normalizedQuestion = this._normalize(question);
        const results = [];

        for (const entry of this.knowledge) {
            const score = this._scoreEntry(normalizedQuestion, entry);
            if (score > 0) {
                results.push({ entry, score });
            }
        }

        results.sort((left, right) => right.score - left.score);
        return results.slice(0, limit);
    }

    buildGenericAnswer(question, matches = []) {
        const normalizedQuestion = this._normalize(question);
        const topics = [
            { keys: ['animate', 'animation', 'timeline'], response: 'Try the <strong>Animate tab</strong> and the <strong>timeline</strong>. Select an object first, then browse or search animations and adjust timing at the bottom of the stage.' },
            { keys: ['create', 'add', 'make', 'draw', 'object'], response: 'Use the <strong>Tools tab</strong> on the left for shapes, text, images, and icons. You can also switch to <strong>AI Mode</strong> to describe what you want in plain language.' },
            { keys: ['universal character', 'character builder', 'pinned clothing', 'headwear', 'hat', 'eye color'], response: 'Use <strong>Universal Character</strong> for generated rigged characters. It includes human-like body/head options, front/side/back views, eye color, separate hair and headwear controls, and a <strong>Pinned Parts</strong> clothing mode for garment layers that follow torso, arm, and leg parts.' },
            { keys: ['face rig', 'facial rig', 'landmarks', 'record talk', 'record expression'], response: 'Use <strong>Face Rig</strong> from Image Tools on a selected face image: Auto Fit landmarks, apply or assign parts, preview expression/talk, then record to timeline. On already-rigged faces, use <strong>Replace Style</strong> only when you intentionally want regenerated generated parts.' },
            { keys: ['flex rig', 'z tilt', 'pose armature'], response: '<strong>Flex Rig Mode</strong> lives in the Flex section and poses existing Pose Armature joints with handles for Angle, Z Tilt X, and Z Tilt Y. It does not replace Tune Joints, joint contours, animations, preview, or export.' },
            { keys: ['compression', 'compression rig', 'pair rig', 'mouth compression', 'blink compression', 'lip', 'eyelid'], response: 'Use <strong>Compression Rig</strong> for edge-aware squeeze controls. Single compression is for one object, while pair rig is for linked closure pairs like lips and eyelids. Presets such as Mouth and Blink speed up setup, and keyframe capture lets you animate closure timing.' },
            { keys: ['shoulder contour', 'joint contour', 'guided motion contour', 'hip contour'], response: 'Shoulder contours are supported in both stage and new-window preview paths. Select the correct assembled/pinned chain root in <strong>Joints</strong>, then adjust contour visibility, size, and fill mode. Shoulder contour edits should now display the same way as hips.' },
            { keys: ['export', 'save', 'download', 'preview'], response: 'Use <strong>Preview</strong> in the top toolbar to inspect the animation, then <strong>Export</strong> to download HTML5, video, GIF, JavaScript, Python, or the native project file. Preview/export uses the current stage settings, including transparent or semi-transparent backgrounds, and text styling controls (curve, spacing, vertical align, shadow, outline, and label backgrounds).' },
            { keys: ['use case', 'good for', 'best for', 'suitable', 'who is it for'], response: 'Animation Stage is strong for explainers, character animation, animated diagrams, product demos, training content, and marketing videos. Ask about your specific use case and I can suggest the best workflow.' },
            { keys: ['help', 'learn', 'tutorial', 'manual', 'guide'], response: 'Use the <strong>Tutorial Hub</strong>, the <strong>manual</strong>, the in-app <strong>Teach Me</strong> panel, the <strong>home-page assistant</strong>, or ask me a specific workflow question and I will point you to the right tool.' }
        ];

        for (const topic of topics) {
            if (topic.keys.some((key) => normalizedQuestion.includes(key))) {
                return `<p>${topic.response}</p><div class="tip-box">Ask a narrower question like <strong>"Which character workflow should I use?"</strong> or <strong>"How do I export transparent video?"</strong> for a more exact answer.</div>`;
            }
        }

        const suggestionsSource = matches.length ? matches.map((match) => match.entry) : this.knowledge.slice(0, 8);
        const suggestions = suggestionsSource.slice(0, 6).map((entry) => `<li><strong>"How do I use ${entry.title}?"</strong></li>`).join('\n');

        return `<p>I’m not sure which part of the app you mean yet. Here are some questions I can answer:</p>
<ul>
${suggestions}
</ul>`;
    }

    buildComparisonAnswer(question, options = {}) {
        const normalizedQuestion = this._normalize(question);
        if (!this._isComparisonFollowUp(normalizedQuestion)) {
            return '';
        }

        const priorTopics = this._extractPriorTopics(options.history || []);
        if (priorTopics.length < 2) {
            return '';
        }

        const entries = priorTopics
            .slice(0, 2)
            .map((title) => this._findEntryByTitle(title))
            .filter(Boolean);

        if (entries.length < 2) {
            return '';
        }

        const [first, second] = entries;
        const pairSpecificAnswer = this._buildPairSpecificComparison(first, second);
        if (pairSpecificAnswer) {
            return pairSpecificAnswer;
        }

        return `<h4>Comparing ${first.title} and ${second.title}</h4>
<p><strong>${first.title}</strong> is best when ${this._lowercaseFirst(first.summary || 'it fits the task')}.</p>
<p><strong>${second.title}</strong> is better when ${this._lowercaseFirst(second.summary || 'it fits a different need')}.</p>
<ol>
<li>Choose <strong>${first.title}</strong> if your priority matches its workflow or use case.</li>
<li>Choose <strong>${second.title}</strong> if its workflow better matches your input assets or final output.</li>
<li>If you want, ask me <strong>"when should I choose ${first.title} over ${second.title}?"</strong> and I can give a more specific recommendation.</li>
</ol>`;
    }

    formatAnswer(text) {
        let html = text;
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');
        html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        html = html.replace(/<\/ol>\s*<ol>/g, '');
        return html;
    }

    _scoreEntry(normalizedQuestion, entry) {
        let score = 0;
        const title = this._normalize(entry.title || '');
        const summary = this._normalize(entry.summary || '');
        const category = this._normalize(entry.category || '');
        const aliases = this._getEntryAliases(entry);

        if (title && normalizedQuestion.includes(title)) score += 5;
        if (category && normalizedQuestion.includes(category)) score += 2;

        for (const alias of aliases) {
            if (!alias) continue;
            if (normalizedQuestion === alias) {
                score += 6;
                continue;
            }
            if (normalizedQuestion.includes(alias)) {
                score += 4;
            }
        }

        for (const keyword of entry.keywords || []) {
            if (keyword.includes('.*')) {
                const parts = keyword.split('.*').map((part) => this._normalize(part)).filter(Boolean);
                if (parts.length && parts.every((part) => normalizedQuestion.includes(part))) {
                    score += 3;
                }
            } else if (normalizedQuestion.includes(this._normalize(keyword))) {
                score += 2;
            }
        }

        const questionTokens = normalizedQuestion.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
        for (const token of questionTokens) {
            if (title.includes(token)) score += 1;
            if (summary.includes(token)) score += 0.5;
        }

        return score;
    }

    _extractPriorQuestion(history) {
        if (!Array.isArray(history) || !history.length) {
            return '';
        }

        for (let index = history.length - 1; index >= 0; index -= 1) {
            const item = history[index];
            if (!item) continue;

            if (typeof item === 'string') {
                const normalized = this._normalize(item);
                if (normalized) return item;
                continue;
            }

            if (item.role && item.role !== 'user') {
                continue;
            }

            const candidate = item.contextualQuestion || item.question || item.content || '';
            if (this._normalize(candidate)) {
                return candidate;
            }
        }

        return '';
    }

    _extractPriorTopics(history) {
        if (!Array.isArray(history) || !history.length) {
            return [];
        }

        for (let index = history.length - 1; index >= 0; index -= 1) {
            const item = history[index];
            if (!item || item.role === 'user') {
                continue;
            }

            const topics = Array.isArray(item.matchedTopics) ? item.matchedTopics.filter((topic) => this._normalize(topic)) : [];
            if (topics.length) {
                return topics;
            }
        }

        return [];
    }

    _isAmbiguousFollowUp(normalizedQuestion) {
        if (!normalizedQuestion) {
            return false;
        }

        if (/^(what is|what are|how do i use|how does|tell me about|explain|define)\s+/.test(normalizedQuestion)) {
            return false;
        }

        if (/^(what about|how about|and |also |can it|does it|do they|that|those|them|it |this |which one|which of those|what if|what then|tell me more|more on|more about)/.test(normalizedQuestion)) {
            return true;
        }

        return normalizedQuestion.split(/\s+/).filter(Boolean).length <= 6;
    }

    _isComparisonFollowUp(normalizedQuestion) {
        if (!normalizedQuestion) {
            return false;
        }

        return /(compare|comparison|difference|different|vs\b|versus|which one|which is better|better one|better option|those two|these two|between them)/.test(normalizedQuestion);
    }

    _findEntryByTitle(title) {
        const normalizedTitle = this._normalize(title);
        return this.knowledge.find((entry) => this._normalize(entry.title) === normalizedTitle) || null;
    }

    _buildPairSpecificComparison(first, second) {
        const firstTitle = this._normalize(first.title);
        const secondTitle = this._normalize(second.title);
        const pairKey = [firstTitle, secondTitle].sort().join('::');

        const comparisons = {
            'body stencil (pre-traced character cutting)::smart cut (trace & cut body parts)': `<h4>Body Stencil vs Smart Cut</h4>
<p><strong>Body Stencil</strong> is faster when you already have a clear <strong>front or side human image</strong> and want to fit a ready-made body map, adjust it, and cut everything in one guided pass.</p>
<p><strong>Smart Cut</strong> is better when you need <strong>more control over the part boundaries</strong> on a single image, especially if the character shape is less standard or you want to trace and label parts more precisely.</p>
<ol>
<li>Choose <strong>Body Stencil</strong> if speed and a guided human preset matter more than tracing precision.</li>
<li>Choose <strong>Smart Cut</strong> if the image needs custom traced regions or the preset body map does not fit cleanly.</li>
<li>If your source is already separated into parts, skip both and use <strong>Assemble Selected Parts</strong> for the fastest path, or <strong>Guided Assembly</strong> when you want a step-by-step wizard.</li>
</ol>`,
            'guided assembly::smart cut (trace & cut body parts)': `<h4>Guided Assembly vs Smart Cut</h4>
<p><strong>Guided Assembly</strong> is for <strong>already separated body parts</strong> on the stage. It helps you rig them into a character without cutting them from one source image.</p>
<p><strong>Smart Cut</strong> is for <strong>one full character image</strong> that still needs to be traced, cut into regions, and assembled.</p>
<ol>
<li>Use <strong>Assemble Selected Parts</strong> first when your arms, legs, head, and torso are already separate objects or layers and you want a fast label-and-animate flow.</li>
<li>Use <strong>Guided Assembly</strong> when those separated parts need a more guided setup path.</li>
<li>Use <strong>Smart Cut</strong> when you need to create those parts from one flat source image first.</li>
<li>If you want the fastest human-specific cut path from one image, compare <strong>Smart Cut</strong> with <strong>Body Stencil</strong>.</li>
</ol>`,
            'body stencil (pre-traced character cutting)::guided assembly': `<h4>Body Stencil vs Guided Assembly</h4>
<p><strong>Body Stencil</strong> starts from <strong>one full human image</strong> and cuts it into pinned parts using a fitted preset stencil.</p>
<p><strong>Guided Assembly</strong> starts after the cutting stage, when you already have <strong>separate body parts</strong> ready to rig.</p>
<ol>
<li>Choose <strong>Body Stencil</strong> if you still need to extract parts from a single human image.</li>
<li>Choose <strong>Assemble Selected Parts</strong> if the character parts already exist separately and you just need the fastest label-and-animate workflow.</li>
<li>Choose <strong>Guided Assembly</strong> if the separated parts need a more guided setup.</li>
<li>For a single image that needs more custom tracing than a preset stencil allows, consider <strong>Smart Cut</strong>.</li>
</ol>`,
            'assemble selected parts::guided assembly': `<h4>Assemble Selected Parts vs Guided Assembly</h4>
<p><strong>Assemble Selected Parts</strong> is the faster mapper for parts that are already on the stage. Select the objects, label each part, assemble, then apply compatible movements.</p>
<p><strong>Guided Assembly</strong> is the slower but more guided wizard for separated body parts when users want step-by-step setup.</p>
<ol>
<li>Choose <strong>Assemble Selected Parts</strong> for already cut/imported parts, incomplete bodies, head/neck only rigs, or upper-body-only rigs.</li>
<li>Choose <strong>Guided Assembly</strong> when the user needs more walkthrough support for a full separated character.</li>
<li>Both create joint-ready parts, but Assemble Selected Parts filters movement options by the parts that actually exist.</li>
</ol>`,
            'assemble selected parts::smart cut (trace & cut body parts)': `<h4>Assemble Selected Parts vs Smart Cut</h4>
<p><strong>Smart Cut</strong> creates body parts from one full image by tracing and cutting regions.</p>
<p><strong>Assemble Selected Parts</strong> starts after the parts already exist as separate objects.</p>
<ol>
<li>Use <strong>Smart Cut</strong> when you still need to extract parts from one image.</li>
<li>Use <strong>Assemble Selected Parts</strong> when the parts were already cut, cloned, sliced, imported, or manually separated.</li>
<li>For partial characters, Assemble Selected Parts is usually clearer because it allows missing parts and shows only compatible movement presets.</li>
</ol>`,
            'assemble selected parts::body stencil (pre-traced character cutting)': `<h4>Assemble Selected Parts vs Body Stencil</h4>
<p><strong>Body Stencil</strong> is a guided cut workflow for one full human image.</p>
<p><strong>Assemble Selected Parts</strong> is a rigging workflow for separate objects that already represent body parts.</p>
<ol>
<li>Use <strong>Body Stencil</strong> when the user starts with one full body image and wants a fitted human stencil.</li>
<li>Use <strong>Assemble Selected Parts</strong> when the user already has separate parts or only wants to animate a partial body.</li>
<li>After Body Stencil creates parts, Assemble Selected Parts can still be useful for relabeling or rebuilding a partial rig from selected pieces.</li>
</ol>`
        };

        return comparisons[pairKey] || '';
    }

    _lowercaseFirst(text) {
        const normalizedText = String(text || '').trim();
        if (!normalizedText) {
            return 'it fits the task';
        }

        return normalizedText.charAt(0).toLowerCase() + normalizedText.slice(1);
    }

    _getEntryAliases(entry) {
        const values = new Set();
        const title = String(entry?.title || '').trim();

        if (title) {
            values.add(this._normalize(title));
            values.add(this._normalize(title.replace(/\s*\([^)]*\)/g, '')));
            values.add(this._normalize(title.replace(/[&/]/g, ' ').replace(/\s+/g, ' ')));
            values.add(this._normalize(title.split('—')[0]));
            values.add(this._normalize(title.split('->')[0]));
        }

        for (const alias of entry?.aliases || []) {
            values.add(this._normalize(alias));
        }

        return Array.from(values).filter(Boolean);
    }

    _normalize(value) {
        return String(value || '').toLowerCase().trim();
    }
}

window.HelpKnowledgeEngine = HelpKnowledgeEngine;
