document.addEventListener('DOMContentLoaded', () => {
    // ── Password visibility toggle (CSP-safe replacement for inline onclick)
    // Buttons mark themselves with `class="password-toggle" data-target="ID"`.
    document.addEventListener('click', (event) => {
        const btn = event.target.closest('.password-toggle[data-target]');
        if (!btn) return;
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon && icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon && icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });

    let deferredInstallPrompt = null;
    const installButtons = Array.from(document.querySelectorAll('[data-install-pwa]'));

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(window.__appAssetVersion || Date.now())}`).catch(() => {});
    }

    const hideInstallButtons = () => {
        installButtons.forEach((button) => button.classList.add('hidden'));
    };

    const showInstallButtons = () => {
        installButtons.forEach((button) => button.classList.remove('hidden'));
    };

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        showInstallButtons();
    });

    installButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            if (!deferredInstallPrompt) {
                window.alert('Use your browser menu and choose "Install Animation Stage" or "Add to Home Screen".');
                return;
            }

            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice.catch(() => null);
            deferredInstallPrompt = null;
            hideInstallButtons();
        });
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        hideInstallButtons();
    });

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        hideInstallButtons();
    }

    const forms = document.querySelectorAll('[data-portal-form]');
    forms.forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const status = form.querySelector('.form-status');
            const submitButton = form.querySelector('button[type="submit"]');
            if (status) {
                status.textContent = 'Sending...';
                status.className = 'form-status';
            }
            if (submitButton) {
                submitButton.disabled = true;
            }

            try {
                const response = await fetch('api/feedback/submit.php', {
                    method: 'POST',
                    body: new FormData(form),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const payload = await response.json();
                if (!response.ok || !payload.ok) {
                    throw new Error(payload.error || 'Submission failed');
                }

                if (status) {
                    status.textContent = form.dataset.successMessage || 'Submitted successfully.';
                    status.className = 'form-status is-success';
                }
                form.reset();
            } catch (error) {
                if (status) {
                    status.textContent = error.message || 'Could not submit the form.';
                    status.className = 'form-status is-error';
                }
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    });

    class PortalHomeAssistant {
        constructor() {
            this.messagesEl = document.getElementById('home-assistant-messages');
            this.inputEl = document.getElementById('home-assistant-input');
            this.sendBtn = document.getElementById('home-assistant-send');
            this.clearBtn = document.getElementById('home-assistant-clear');
            this.suggestionsEl = document.getElementById('home-assistant-suggestions');
            this.history = [];

            if (!this.messagesEl || !this.inputEl || typeof HelpKnowledgeEngine === 'undefined') {
                return;
            }

            this.engine = new HelpKnowledgeEngine({
                knowledge: typeof TEACH_ME_KNOWLEDGE !== 'undefined' ? TEACH_ME_KNOWLEDGE : [],
                persona: 'Animation Stage Assistant',
                roleDescription: 'the public-facing product assistant',
                appOverview: 'Animation Stage is a browser-based 2D animation studio for scene design, character workflows, SmartArt diagrams, AI-assisted creation, reusable assets, timeline editing, and export.'
            });

            this.bindEvents();
            this.renderWelcome();
        }

        bindEvents() {
            this.sendBtn?.addEventListener('click', () => this.send());
            this.clearBtn?.addEventListener('click', () => this.clear());

            this.inputEl?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.send();
                }
            });

            this.inputEl?.addEventListener('input', () => {
                this.inputEl.style.height = 'auto';
                this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 140) + 'px';
            });

            this.suggestionsEl?.addEventListener('click', (event) => {
                const chip = event.target.closest('.assistant-chip');
                if (!chip) return;
                this.inputEl.value = chip.dataset.q || '';
                this.send();
            });
        }

        renderWelcome() {
            this.messagesEl.innerHTML = '';
            this.addAssistantMessage(`<p><strong>Ask me about Animation Stage.</strong> I can explain what the app does, which workflows fit your project, and which tools to use for characters, AI Mode, SmartArt, export, templates, and more.</p><div class="tip-box">Try asking <strong>"Which workflow should I use for one full character image?"</strong> or <strong>"Is this app good for animated explainers?"</strong></div>`, this.getFollowUps('getting started help tutorial learn the app'));
        }

        clear() {
            this.inputEl.value = '';
            this.inputEl.style.height = 'auto';
            this.history = [];
            this.renderWelcome();
            if (this.suggestionsEl) {
                this.suggestionsEl.style.display = '';
            }
        }

        send() {
            const question = (this.inputEl.value || '').trim();
            if (!question) return;

            try {
                this.addUserMessage(question);
                const result = this.engine.answerBuiltInDetailed(question, { history: this.history });
                this.pushHistory(question, result.contextualQuestion, result.answer, result.matchedTopics);
                this.addAssistantMessage(result.answer, this.getFollowUps(result.contextualQuestion));
                this.inputEl.value = '';
                this.inputEl.style.height = 'auto';

                if (this.suggestionsEl) {
                    this.suggestionsEl.style.display = 'none';
                }
            } catch (error) {
                console.error('PortalHomeAssistant.send failed', error);
                const fallbackAnswer = this.engine?.buildGenericAnswer(question, []) || '<p>Sorry, I could not answer that just now. Please try again.</p>';
                this.addAssistantMessage(fallbackAnswer, this.getFollowUps(question));
            }
        }

        pushHistory(question, contextualQuestion, answer, matchedTopics = []) {
            this.history.push({
                question,
                contextualQuestion,
                answer,
                matchedTopics
            });

            if (this.history.length > 6) {
                this.history.shift();
            }
        }

        addUserMessage(text) {
            const el = document.createElement('div');
            el.className = 'assistant-message assistant-message-user';
            el.innerHTML = `<div class="assistant-avatar"><i class="fas fa-user"></i></div><div class="assistant-bubble">${this.escapeHtml(text)}</div>`;
            this.messagesEl.appendChild(el);
            this.scrollToBottom();
        }

        addAssistantMessage(html, actions = []) {
            const el = document.createElement('div');
            el.className = 'assistant-message assistant-message-bot';
            const actionsMarkup = actions.length ? this.buildActionsMarkup(actions) : '';
            el.innerHTML = `<div class="assistant-avatar"><i class="fas fa-robot"></i></div><div class="assistant-bubble">${html}${actionsMarkup}</div>`;
            this.messagesEl.appendChild(el);
            this.scrollToBottom();
        }

        buildActionsMarkup(actions) {
            const items = actions.map((action) => {
                const safeLabel = this.escapeHtml(action.label);
                const safeDescription = this.escapeHtml(action.description);
                const safeHref = this.escapeAttribute(action.href);
                return `<a class="assistant-action-card" href="${safeHref}"><strong>${safeLabel}</strong><span>${safeDescription}</span></a>`;
            }).join('');

            return `<div class="assistant-next-steps"><div class="assistant-next-steps-title">Recommended next step</div><div class="assistant-action-grid">${items}</div></div>`;
        }

        getFollowUps(question) {
            const normalized = (question || '').toLowerCase();
            const actionMap = [
                {
                    pattern: /(sign up|signup|register|account|start using|try the app|get started)/,
                    actions: [
                        { href: 'register.php', label: 'Create an account', description: 'Start with a portal account so you can open the studio and save work.' },
                        { href: 'tutorial.php', label: 'Open the Tutorial Hub', description: 'Use the guided walkthroughs before your first full project.' }
                    ]
                },
                {
                    pattern: /(learn|tutorial|manual|help|how do i start|beginner|guide)/,
                    actions: [
                        { href: 'tutorial.php', label: 'Open the Tutorial Hub', description: 'See practical walkthroughs for common tasks and first projects.' },
                        { href: 'manual.php', label: 'Read the manual', description: 'Use the full reference when you want broader feature coverage.' }
                    ]
                },
                {
                    pattern: /(ai mode|prompt|natural language|generate with ai|assistant)/,
                    actions: [
                        { href: 'tutorial.php#ai-mode', label: 'Review AI Mode tutorials', description: 'See prompt patterns and practical AI workflows.' },
                        { href: 'register.php', label: 'Open the studio', description: 'Create an account to try AI Mode inside the editor.' }
                    ]
                },
                {
                    pattern: /(character|body stencil|smart cut|guided assembly|joint assembly|image deform|rig|pose|walk cycle|joints)/,
                    actions: [
                        { href: 'tutorial.php#character-workflows', label: 'Open character tutorials', description: 'Go straight to the workflow guides for rigging and character setup.' },
                        { href: 'manual.php#character-animation', label: 'Read the character reference', description: 'Compare Body Stencil, Smart Cut, joints, and deform tools.' }
                    ]
                },
                {
                    pattern: /(smartart|diagram|org chart|process flow|explainer|presentation)/,
                    actions: [
                        { href: 'tutorial.php#smartart', label: 'Open SmartArt tutorials', description: 'See how to build animated diagrams and presentation visuals.' },
                        { href: 'register.php', label: 'Try SmartArt in the studio', description: 'Create an account and start building diagram-based scenes.' }
                    ]
                },
                {
                    pattern: /(export|mp4|webm|gif|html5|python|javascript|render|preview)/,
                    actions: [
                        { href: 'manual.php#export-options', label: 'Read export options', description: 'Compare output formats and choose the best delivery format.' },
                        { href: 'register.php', label: 'Open the studio', description: 'Create an account to test export from a real scene.' }
                    ]
                },
                {
                    pattern: /(team|business|company|collaboration|classroom|school|training|marketing|product demo|use case)/,
                    actions: [
                        { href: '#feedback', label: 'Request access for your team', description: 'Use the contact section to discuss team rollout or supported workflows.' },
                        { href: 'tutorial.php', label: 'Review sample workflows', description: 'Check example use cases before adopting the app for a team or class.' }
                    ]
                }
            ];

            const matchedGroup = actionMap.find((entry) => entry.pattern.test(normalized));
            if (matchedGroup) {
                return matchedGroup.actions;
            }

            return [
                { href: 'register.php', label: 'Create an account', description: 'Start using the studio and try the recommended workflow directly.' },
                { href: 'tutorial.php', label: 'Open the Tutorial Hub', description: 'Browse guided walkthroughs if you want structured next steps.' }
            ];
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        escapeAttribute(text) {
            return this.escapeHtml(text).replace(/"/g, '&quot;');
        }

        scrollToBottom() {
            requestAnimationFrame(() => {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            });
        }
    }

    new PortalHomeAssistant();
});
