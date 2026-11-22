/* ============================================
   Teach Me — AI Chat Assistant for Animation Stage
   ============================================
   Reads from TEACH_ME_KNOWLEDGE (teach-me-knowledge.js).
   To add knowledge: edit teach-me-knowledge.js — this file
   auto-generates the LLM prompt and built-in matcher.
   ============================================ */

class TeachMe {
    constructor(aiMode) {
        this.ai = aiMode;
        this.isOpen = false;
        this.messages = [];
        this.isGenerating = false;
        this.pendingBuiltInMeta = null;
        this.knowledge = typeof TEACH_ME_KNOWLEDGE !== 'undefined' ? TEACH_ME_KNOWLEDGE : [];
        this.engine = typeof HelpKnowledgeEngine !== 'undefined'
            ? new HelpKnowledgeEngine({
                knowledge: this.knowledge,
                persona: 'Teach Me',
                roleDescription: 'the built-in help assistant',
                appOverview: 'Animation Stage is a browser-based 2D animation studio with a stage canvas, left-side tools, right-side properties, a bottom timeline, AI Mode, SmartArt, export tools, and character workflows.'
            })
            : null;
        this.init();
    }

    init() {
        this.panel = document.getElementById('teach-me-panel');
        this.messagesEl = document.getElementById('teach-me-messages');
        this.inputEl = document.getElementById('teach-me-input');
        this.suggestionsEl = document.getElementById('teach-me-suggestions');
        this.bindEvents();
        if (this.panel) {
            Utils.makePanelDraggable(this.panel, '.teach-me-header');
            Utils.makePanelResizable(this.panel);
        }
    }

    bindEvents() {
        document.getElementById('btn-teach-me')?.addEventListener('click', () => this.toggle());
        document.getElementById('btn-teach-me-close')?.addEventListener('click', () => this.close());
        document.getElementById('btn-teach-me-clear')?.addEventListener('click', () => this.clearChat());
        document.getElementById('btn-teach-me-send')?.addEventListener('click', () => this.send());

        this.inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.send();
            }
        });

        this.inputEl?.addEventListener('input', () => {
            this.inputEl.style.height = 'auto';
            this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 100) + 'px';
        });

        this.suggestionsEl?.addEventListener('click', (e) => {
            const chip = e.target.closest('.teach-me-chip');
            if (chip) {
                const q = chip.dataset.q;
                if (q) {
                    this.inputEl.value = q;
                    this.send();
                }
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.panel.classList.remove('hidden');
        // Ensure right panel is expanded (teach-me docks into it)
        const rightPanel = document.getElementById('right-panel');
        if (rightPanel && rightPanel.classList.contains('collapsed')) {
            document.getElementById('collapse-right')?.click();
        }
        Utils.dockPanel(this.panel);
        document.getElementById('btn-teach-me')?.classList.add('active');
        this.inputEl?.focus();
    }

    close() {
        this.isOpen = false;
        this.panel.classList.add('hidden');
        // Remove from dock when closed
        if (this.panel.dataset.docked === 'true') {
            this.panel.dataset.docked = 'false';
            this.panel.classList.remove('docked-panel');
            document.body.appendChild(this.panel);
            const dock = Utils._dockContainer;
            if (dock && dock.querySelectorAll('.docked-panel').length === 0) {
                dock.classList.remove('has-panels');
            }
        }
        document.getElementById('btn-teach-me')?.classList.remove('active');
    }

    clearChat() {
        this.messages = [];
        this.messagesEl.innerHTML = '';
        this.addAIMessage("Chat cleared! Ask me anything about Animation Stage — how to create animations, use tools, apply effects, export projects, and more.");
        if (this.suggestionsEl) this.suggestionsEl.style.display = '';
    }

    async send() {
        const text = (this.inputEl?.value || '').trim();
        if (!text || this.isGenerating) return;

        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';

        if (this.suggestionsEl) this.suggestionsEl.style.display = 'none';

        this.addUserMessage(text);
        this.messages.push({ role: 'user', content: text });

        this.isGenerating = true;
        const typingEl = this.showTyping();

        try {
            const answer = await this.generateAnswer(text);
            typingEl.remove();
            this.addAIMessage(answer);
            this.messages.push({
                role: 'assistant',
                content: answer,
                matchedTopics: this.pendingBuiltInMeta?.matchedTopics || []
            });
            this.pendingBuiltInMeta = null;
        } catch (err) {
            typingEl.remove();
            this.pendingBuiltInMeta = null;
            this.addAIMessage("Sorry, I couldn't generate an answer right now. Please try again.");
        }

        this.isGenerating = false;
    }

    addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'teach-me-msg teach-me-msg-user';
        div.innerHTML = `
            <div class="teach-me-msg-avatar"><i class="fas fa-user"></i></div>
            <div class="teach-me-msg-body">${this.escapeHtml(text)}</div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    }

    addAIMessage(html) {
        const div = document.createElement('div');
        div.className = 'teach-me-msg teach-me-msg-ai';
        div.innerHTML = `
            <div class="teach-me-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="teach-me-msg-body">${html}</div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    }

    showTyping() {
        const div = document.createElement('div');
        div.className = 'teach-me-msg teach-me-msg-ai';
        div.innerHTML = `
            <div class="teach-me-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="teach-me-msg-body">
                <div class="teach-me-typing"><span></span><span></span><span></span></div>
            </div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
        return div;
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        });
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ========== Answer Generation ==========

    async generateAnswer(question) {
        if (this.ai && this.ai.apiProvider !== 'builtin' && this.ai.apiKey) {
            try {
                return await this.generateFromLLM(question);
            } catch (e) {
                // Fall through to built-in
            }
        }
        return this.generateFromBuiltIn(question);
    }

    async generateFromLLM(question) {
        const systemPrompt = this.buildTeachMeSystemPrompt();

        const contextMessages = this.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));

        const messages = [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
            { role: 'user', content: question }
        ];

        // Route all LLM calls through the server-side proxy so the API key
        // never touches the browser network log, quotas are enforced, and
        // usage is audited per user. Mirrors AIMode.generateFromLLM.
        let model;
        if (this.ai.apiProvider === 'deepseek') {
            model = 'deepseek-chat';
        } else if (this.ai.apiProvider === 'openai') {
            model = 'gpt-4o-mini';
        } else if (this.ai.apiProvider === 'custom') {
            if (!this.ai.apiEndpoint) throw new Error('No endpoint');
            model = 'default';
        } else {
            throw new Error('No LLM provider');
        }

        const csrfToken = (window.__STAGE_USER && window.__STAGE_USER.csrf_token) || '';
        const response = await fetch('/api/ai/proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                provider: this.ai.apiProvider,
                apiKey:   this.ai.apiKey,
                endpoint: this.ai.apiEndpoint || '',
                payload:  { model, messages, temperature: 0.7, max_tokens: 1500 }
            })
        });
        if (!response.ok) throw new Error(`API error ${response.status}`);

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error('Empty response');

        return this.formatAnswer(content);
    }

    // Auto-generate the LLM system prompt from TEACH_ME_KNOWLEDGE
    buildTeachMeSystemPrompt() {
        if (this.engine) {
            return this.engine.buildSystemPrompt();
        }

        return `You are "Teach Me", the built-in help assistant for Animation Stage.`;
    }

    // ========== Built-in Knowledge Base (reads from TEACH_ME_KNOWLEDGE) ==========

    generateFromBuiltIn(question) {
        if (this.engine) {
            const result = this.engine.answerBuiltInDetailed(question, { history: this.messages });
            this.pendingBuiltInMeta = { matchedTopics: result.matchedTopics };
            return result.answer;
        }

        return this.buildGenericAnswer(question);
    }

    buildGenericAnswer(question) {
        const q = question.toLowerCase();

        const topics = [
            { keys: ['animate', 'animation'], response: 'Try the <strong>Animate tab</strong> in the left panel. Select an object first, then browse or search animations.' },
            { keys: ['create', 'add', 'make', 'new'], response: 'Use the <strong>shape tools</strong> in the left toolbar (R, C, T, S, L, P, D, X) or the <strong>Objects panel</strong> for icons and images.' },
            { keys: ['export', 'save', 'download'], response: 'Click <strong>Export</strong> in the top toolbar. Choose HTML5, Video (MP4/WebM/GIF), JavaScript, Python, or .animstage project format.' },
            { keys: ['help', 'learn', 'tutorial'], response: 'I\'m here to help! Ask me about specific features like "How do I animate an object?", "How do I add icons?", or "How do I export as video?"' }
        ];

        for (const topic of topics) {
            if (topic.response && topic.keys.some(k => q.includes(k))) {
                return `<p>${topic.response}</p><div class="tip-box">💡 Ask me a more specific question and I'll give you step-by-step instructions!</div>`;
            }
        }

        // Build topic list from knowledge for the fallback
        const suggestions = this.knowledge.slice(0, 8).map(e => `<li><strong>"How do I use ${e.title}?"</strong></li>`).join('\n    ');

        return `<p>I'm not sure about that specific topic. Here are some things you can ask me:</p>
<ul>
    ${suggestions}
</ul>`;
    }

    formatAnswer(text) {
        if (this.engine) {
            return this.engine.formatAnswer(text);
        }

        return text;
    }
}
