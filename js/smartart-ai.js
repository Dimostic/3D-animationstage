/* ============================================
   SmartArt AI Assistant
   Pattern-based NLP for SmartArt suggestions,
   template picking, text population, palette &
   animation selection.
   ============================================ */

class SmartArtAI {
    constructor(manager) {
        this.manager = manager;
        this.messages = [];
        this.elMessages = document.getElementById('sa-ai-messages');
        this.elInput = document.getElementById('sa-ai-input');
        this.elSendBtn = document.getElementById('sa-ai-send');

        this._bindEvents();
        this.resetConversation();
    }

    _getIntroMessage() {
        return (
            "Hi! I can help you build SmartArt from plain language. For the best results, tell me:\n" +
            "• the layout you want\n" +
            "• the exact steps or labels to place on stage\n" +
            "• any optional style changes such as palette or animation\n\n" +
            "Try prompts like:\n" +
            "• \"Create a 5-step process: Discover, Design, Build, Test, Launch\"\n" +
            "• \"Create a hierarchy: CEO, Operations, Product, Sales\"\n" +
            "• \"Use arctic palette and fade-in animation\"\n" +
            "• \"Bar chart of Nigeria-234, South Africa-34, Uganda-100, USA-90\""
        );
    }

    _getFallbackHelpMessage() {
        return (
            "I can help you in three simple ways:\n" +
            "• Create a layout: \"create a process\", \"make a hierarchy\"\n" +
            "• Fill it with content: \"5 steps: Research, Design, Build, Test, Launch\"\n" +
            "• Refine the style: \"use arctic palette\", \"add fade-in animation\"\n" +
            "• Build data visuals: paste a table, or say \"bar chart of Peru 70%, USA 40%, UK 35%\""
        );
    }

    resetConversation(options = {}) {
        this.messages = [];
        if (this.elMessages) this.elMessages.innerHTML = '';
        if (!options.preserveInput && this.elInput) this.elInput.value = '';
        this._addAssistantMessage(this._getIntroMessage());
    }

    _bindEvents() {
        this.elSendBtn?.addEventListener('click', () => this._handleSend());
        this.elInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleSend();
        });
    }

    _handleSend() {
        const text = this.elInput?.value?.trim();
        if (!text) return;
        this._addUserMessage(text);
        this.elInput.value = '';
        this._processPrompt(text);
    }

    // Public API for quick action buttons
    send(text) {
        if (!text) return;
        this._addUserMessage(text);
        this._processPrompt(text);
    }

    _addUserMessage(text) {
        this.messages.push({ role: 'user', text });
        if (!this.elMessages) return;
        const div = document.createElement('div');
        div.className = 'sa-ai-msg user';
        div.textContent = text;
        this.elMessages.appendChild(div);
        this.elMessages.scrollTop = this.elMessages.scrollHeight;
    }

    _addAssistantMessage(text) {
        this.messages.push({ role: 'assistant', text });
        if (!this.elMessages) return;
        const div = document.createElement('div');
        div.className = 'sa-ai-msg assistant';
        div.textContent = text;
        this.elMessages.appendChild(div);
        this.elMessages.scrollTop = this.elMessages.scrollHeight;
    }

    /* ===========================
       Prompt Processing Engine
       =========================== */

    _processPrompt(prompt) {
        const lower = prompt.toLowerCase();
        const paletteMatch = this._detectPalette(lower);
        const animMatch = this._detectAnimation(lower);
        const countMatch = lower.match(/(\d+)\s*(steps?|items?|nodes?|points?|stages?|levels?|parts?)/);
        const addMoreItems = /\b(add|more|extra|another)\s+items?\b/.test(lower);
        const playRequested = /\b(play|preview|animate|run)\b/.test(lower);

        // ---- Quantitative-data path: delegate to SmartArtImport ----
        // Triggered when the prompt contains structured data signals (newlines + numbers,
        // markdown table pipes, multiple "Name-value"/"Name (value)" segments, etc.) — or
        // when the user explicitly asks for a chart/data visual.
        const importBridge = window.saImport;
        if (importBridge && this._looksLikeData(prompt)) {
            const dataPayload = this._extractDataPayload(prompt);
            const forcedId = this._detectForcedTemplateFromPrompt(lower);
            const result = importBridge.applyFromText(dataPayload, forcedId);
            if (result && result.items && result.items.length) {
                const tpl = this.manager.templates.getTemplate(result.templateId);
                const palAnim = [];
                if (paletteMatch) { this.manager._selectPalette(paletteMatch); palAnim.push(`palette "${paletteMatch}"`); }
                if (animMatch) { this.manager.setAnimationType(animMatch); palAnim.push(`animation "${animMatch}"`); }
                const altNames = result.suggestions.slice(1, 4).map(s => {
                    const t = this.manager.templates.getTemplate(s.templateId);
                    return t ? t.name : null;
                }).filter(Boolean);
                let msg = `Detected ${result.items.length} data points and applied "${tpl ? tpl.name : result.templateId}".`;
                if (palAnim.length) msg += ` Updated ${palAnim.join(' · ')}.`;
                if (altNames.length) msg += `\nAlternatives: ${altNames.join(' · ')} (open the Import tab to switch).`;
                this._addAssistantMessage(msg);
                return;
            }
        }

        const templateResult = this._shouldPreserveCurrentSmartArt({
            lower,
            prompt,
            paletteMatch,
            animMatch,
            countMatch,
            addMoreItems,
            playRequested
        })
            ? null
            : this._detectTemplate(lower, prompt);

        let applied = false;
        const updates = [];

        if (templateResult) {
            const { templateId, items } = templateResult;
            this.manager.applyTemplate(templateId, items);
            const tpl = this.manager.templates.getTemplate(templateId);
            updates.push(`template "${tpl.name}"`);
            if (items && items.length) {
                updates.push(`items ${items.map(item => item.text).join(', ')}`);
            }
            applied = true;
        }

        const activeTemplateId = templateResult?.templateId || this.manager.currentTemplateId;
        const activeTemplate = activeTemplateId ? this.manager.templates.getTemplate(activeTemplateId) : null;

        if ((countMatch || addMoreItems) && activeTemplate) {
            const requestedCount = countMatch
                ? parseInt(countMatch[1], 10)
                : Math.min(activeTemplate.maxItems, this.manager.items.length + 1);
            if (requestedCount >= activeTemplate.minItems && requestedCount <= activeTemplate.maxItems) {
                while (this.manager.items.length < requestedCount) {
                    this.manager.items.push({ text: `Item ${this.manager.items.length + 1}`, subtext: '' });
                }
                while (this.manager.items.length > requestedCount) {
                    this.manager.items.pop();
                }
                this.manager._regenerate();
                this.manager._renderTextEditor();
                this.manager._scheduleWorkspacePersist();
                updates.push(`${requestedCount} items`);
                applied = true;
            }
        }

        if (paletteMatch) {
            this.manager._selectPalette(paletteMatch);
            updates.push(`palette "${paletteMatch}"`);
            applied = true;
        }

        if (animMatch) {
            this.manager.setAnimationType(animMatch);
            updates.push(`animation "${animMatch}"`);
            applied = true;
        }

        if (playRequested) {
            this.manager.playAnimation();
            updates.push('preview playback');
            applied = true;
        }

        if (applied) {
            this._addAssistantMessage(`Updated ${updates.join(' · ')}.`);
            return;
        }

        this._addAssistantMessage(this._getFallbackHelpMessage());
    }

    _hasActiveSmartArt() {
        return Boolean(this.manager?.currentTemplateId && Array.isArray(this.manager?.items) && this.manager.items.length);
    }

    _shouldPreserveCurrentSmartArt({ lower, prompt, paletteMatch, animMatch, countMatch, addMoreItems, playRequested }) {
        if (!this._hasActiveSmartArt()) return false;

        const hasPreserveIntent = /\b(current|existing|same|keep|retain|preserve)\b/.test(lower);
        const hasStyleIntent = Boolean(
            paletteMatch ||
            animMatch ||
            /\b(color|colour|palette|style|theme|animation|animate|motion)\b/.test(lower)
        );
        const hasIncrementalIntent = hasPreserveIntent || hasStyleIntent || Boolean(countMatch) || addMoreItems || playRequested;
        if (!hasIncrementalIntent) return false;
        if (this._extractItems(prompt).length > 0) return false;

        const hasExplicitRebuildIntent =
            /\b(create|make|build|generate|replace|swap|switch|convert)\b/.test(lower) ||
            /\bnew\s+(?:smartart|diagram|layout|template|chart|process|hierarchy|cycle|matrix|pyramid|timeline|funnel)\b/.test(lower);
        if (hasExplicitRebuildIntent) return false;

        const hasLayoutSwitchIntent =
            /\b(?:layout|template|chart|diagram|smartart|process|hierarchy|cycle|matrix|pyramid|timeline|funnel|org(?:anization)?\s+chart|checklist)\b/.test(lower) &&
            !hasStyleIntent &&
            !countMatch &&
            !addMoreItems &&
            !playRequested &&
            !hasPreserveIntent;

        return !hasLayoutSwitchIntent;
    }

    /* ===========================
       Detection Helpers
       =========================== */

    _detectPalette(lower) {
        const palettes = Object.keys(SmartArtTemplates.PALETTES);
        for (const p of palettes) {
            if (lower.includes(p)) return p;
        }
        // Aliases
        if (/\b(blue|ocean|sea|water)\b/.test(lower)) return 'ocean';
        if (/\b(red|warm|sunset|fire)\b/.test(lower)) return 'sunset';
        if (/\b(green|forest|nature|leaf)\b/.test(lower)) return 'forest';
        if (/\b(purple|modern|neon|vibrant)\b/.test(lower)) return 'modern';
        if (/\b(gray|grey|mono|monochrome|neutral)\b/.test(lower)) return 'monochrome';
        if (/\b(soft|pastel|light)\b/.test(lower)) return 'pastel';
        if (/\b(dark|night|midnight)\b/.test(lower)) return 'dark';
        if (/\b(corporate|business|professional)\b/.test(lower)) return 'corporate';
        return null;
    }

    _detectAnimation(lower) {
        if (/\b(fade[\s-]?in|fade)\b/.test(lower)) return 'fade-in';
        if (/\b(scale[\s-]?up|scale|zoom|grow)\b/.test(lower)) return 'scale-up';
        if (/\b(slide[\s-]?left|slide[\s-]?in)\b/.test(lower)) return 'slide-left';
        if (/\b(slide[\s-]?up|rise|fly[\s-]?up)\b/.test(lower)) return 'slide-up';
        if (/\b(wipe)\b/.test(lower)) return 'wipe';
        if (/\b(bounce|bouncy)\b/.test(lower)) return 'bounce';
        if (/\b(rotate|spin|twist)\b/.test(lower)) return 'rotate';
        if (/\b(flip|card[\s-]?flip)\b/.test(lower)) return 'flip';
        if (/\b(pop|pop[\s-]?in|spring)\b/.test(lower)) return 'pop';
        return null;
    }

    _detectTemplate(lower, original) {
        let items = this._extractItems(original);
        const matchedTemplate = this.manager.templates.findBestTemplateMatch(lower);
        const templateId = matchedTemplate?.id || null;
        if (!templateId) return null;

        const tpl = this.manager.templates.getTemplate(templateId);
        if (tpl && items.length > 0) {
            if (items.length < tpl.minItems) {
                while (items.length < tpl.minItems) items.push({ text: `Item ${items.length + 1}` });
            }
            if (items.length > tpl.maxItems) {
                items = items.slice(0, tpl.maxItems);
            }
        }

        return { templateId, items };
    }

    _extractItems(text) {
        // Try "with|for|:  X, Y, Z"
        const colonMatch = text.match(/(?:with|for|:|steps?|items?)\s*[:\-]?\s*(.+)/i);
        const source = colonMatch ? colonMatch[1] : text;

        // Try comma-separated
        if (source.includes(',')) {
            return source.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ text: s }));
        }

        // Try numbered list "1. X 2. Y"
        const numbered = source.match(/\d+\.\s*([^0-9]+)/g);
        if (numbered && numbered.length >= 2) {
            return numbered.map(m => {
                const clean = m.replace(/^\d+\.\s*/, '').trim();
                return { text: clean };
            });
        }

        return [];
    }

    /* ===========================
       Quantitative-data Bridge
       =========================== */

    // Heuristic: does the prompt contain enough structure to be parsed as data?
    _looksLikeData(prompt) {
        const p = String(prompt || '');
        if (!p) return false;
        // Markdown table
        if (/^\s*\|.+\|\s*$/m.test(p) && /\|[\s:\-|]+\|/.test(p)) return true;
        // Multi-line block with numbers (≥ 2 lines, ≥ 50% have a digit)
        const lines = p.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
            const bulletLines = lines.filter(line => /^(?:(?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)]|[-–—*+•·●○◦▪▫■□‣⁃▶►➤✓✔☑✅☐☒✗✘])\s*/.test(line)).length;
            if (bulletLines >= 2 && bulletLines / lines.length >= 0.5) return true;
            const withNum = lines.filter(l => /\d/.test(l)).length;
            if (withNum / lines.length >= 0.5) return true;
            // Indented hierarchy — multiple lines with leading whitespace
            const indented = p.split(/\r?\n/).filter(l => /^\s+\S/.test(l)).length;
            if (indented >= 2) return true;
        }
        // Inline "Name-value, Name-value, …" (3+ comma segments and ≥ 2 numbers)
        const segs = p.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        if (segs.length >= 3) {
            const numericSegs = segs.filter(s => /\d/.test(s)).length;
            if (numericSegs >= 2) return true;
        }
        // Tab-separated row data
        if (/\t/.test(p) && lines.length >= 2) return true;
        return false;
    }

    // Strip prose lead-ins like "create a bar chart of " / "use the following data: "
    // so the parser only sees the data portion. Keep the rest for forced-template detection.
    _extractDataPayload(prompt) {
        const p = String(prompt || '');
        // Pull out content after a colon/dash if a clear data preamble is present
        const m = p.match(/^(?:.*?\b(?:data|values?|numbers?|chart|plot|graph|following|using|with)\b[^:\-]*[:\-])\s*([\s\S]+)$/i);
        if (m && m[1] && (/\d/.test(m[1]) || /(?:^|\n)\s*[-–—*+•·●○◦▪▫■□‣⁃▶►➤✓✔☑✅☐☒✗✘]\s*/.test(m[1]))) return m[1].trim();
        return p.trim();
    }

    _detectForcedTemplateFromPrompt(lower) {
        // Map common chart/visual phrases to template ids the import-bridge can apply.
        if (/\b(combo\s*chart|bar\s*\+\s*line|line\s*\+\s*bar|dual\s*axis)\b/.test(lower)) return 'combo-chart';
        if (/\b(multi[\s-]*line|multiple\s*lines)\b/.test(lower)) return 'multi-line-chart';
        if (/\bline\s*chart\b/.test(lower)) return 'line-chart';
        if (/\b(stacked\s*bar|stacked\s*chart|stack\s*chart)\b/.test(lower)) return 'stacked-bar-chart';
        if (/\b(clustered|grouped)\s*bar\b/.test(lower)) return 'clustered-bar-chart';
        if (/\b(bar\s*chart|bars|column\s*chart)\b/.test(lower)) return 'bar-chart';
        if (/\bhorizontal\s*bar(s|\s*chart)?\b/.test(lower)) return 'horizontal-bar-chart';
        if (/\b(donut|doughnut|pie\s*chart|pie)\b/.test(lower)) return 'donut-chart';
        if (/\bheat\s*map\b/.test(lower)) return 'heat-map';
        if (/\btree\s*map\b/.test(lower)) return 'treemap';
        if (/\bbubble\s*chart\b/.test(lower)) return 'bubble-chart';
        if (/\bprogress\s*bars?\b/.test(lower)) return 'progress-bars';
        if (/\bradial\s*progress\b/.test(lower)) return 'radial-progress';
        if (/\b(funnel)\b/.test(lower)) return 'funnel-process';
        if (/\b(pyramid)\b/.test(lower)) return 'basic-pyramid';
        if (/\bhierarchy|org(anization)?\s*chart\b/.test(lower)) return 'org-chart';
        if (/\bswot\b/.test(lower)) return 'swot-matrix';
        if (/\b(timeline|milestones?)\b/.test(lower)) return 'timeline-process';
        if (/\b(cycle|loop)\b/.test(lower)) return 'basic-cycle';
        if (/\b(checklist)\b/.test(lower)) return 'checklist';
        if (/\b(matrix|2x2|quadrant)\b/.test(lower)) return 'basic-matrix';
        if (/\b(process|flow|steps?)\b/.test(lower)) return 'basic-process';
        return null; // let the import-bridge pick the best suggestion
    }
}
