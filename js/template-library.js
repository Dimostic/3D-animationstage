/* ============================================
   Animation Stage - Template Library
   Pre-built animation sequences and component templates
   ============================================ */

class TemplateLibrary {
    constructor(objectManager, animationEngine) {
        this.objects = objectManager;
        this.animations = animationEngine;

        this.templates = this.buildTemplates();
        this.init();
    }

    init() {
        this.bindEvents();
        this.populateGrid();
    }

    buildTemplates() {
        return [
            {
                id: 'logo-reveal',
                name: 'Logo Reveal',
                icon: 'fa-crown',
                desc: 'Scale up + fade in with bounce',
                animations: [
                    { type: 'fade-in', params: { duration: 0.6, easing: 'easeOut' } },
                    { type: 'grow', params: { scale: 1.2, duration: 0.8, easing: 'bounce' } }
                ]
            },
            {
                id: 'slide-deck',
                name: 'Slide Deck',
                icon: 'fa-presentation-screen',
                desc: 'Slide in from right with stagger',
                animations: [
                    { type: 'slide-in', params: { direction: 'right', duration: 0.6, easing: 'easeOut' } }
                ],
                stagger: 200
            },
            {
                id: 'attention-pulse',
                name: 'Attention Pulse',
                icon: 'fa-bullseye',
                desc: 'Scale pulse to grab attention',
                animations: [
                    { type: 'pulse', params: { scale: 1.15, duration: 0.5, easing: 'easeInOut', repeat: '3' } }
                ]
            },
            {
                id: 'cinematic-entry',
                name: 'Cinematic Entry',
                icon: 'fa-clapperboard',
                desc: 'Fade + move up + slight rotation',
                animations: [
                    { type: 'fade-in', params: { duration: 1.2, easing: 'easeOut' } },
                    { type: 'linear-move', params: { direction: 'up', distance: 60, duration: 1.2, easing: 'easeOut' } },
                    { type: 'wobble', params: { degrees: 3, duration: 0.8, easing: 'easeInOut' } }
                ]
            },
            {
                id: 'typewriter-intro',
                name: 'Typewriter Intro',
                icon: 'fa-keyboard',
                desc: 'Typewriter effect for text objects',
                animations: [
                    { type: 'typewriter', params: { cps: 12, duration: 2 } }
                ],
                textOnly: true
            },
            {
                id: 'bounce-in',
                name: 'Bounce In',
                icon: 'fa-basketball-ball',
                desc: 'Enter from above with bounce',
                animations: [
                    { type: 'slide-in', params: { direction: 'up', duration: 0.8, easing: 'bounce' } }
                ]
            },
            {
                id: 'spin-grow',
                name: 'Spin & Grow',
                icon: 'fa-atom',
                desc: 'Rotate 360° while scaling up',
                animations: [
                    { type: 'spin-cw', params: { degrees: 360, duration: 1, easing: 'easeInOut' } },
                    { type: 'grow', params: { scale: 1.5, duration: 1, easing: 'easeOut' } }
                ]
            },
            {
                id: 'wave-sequence',
                name: 'Wave Sequence',
                icon: 'fa-water',
                desc: 'Staggered wave motion across objects',
                animations: [
                    { type: 'bounce', params: { distance: 80, direction: 'up', duration: 0.6, easing: 'easeInOut' } }
                ],
                stagger: 150
            },
            {
                id: 'fade-cascade',
                name: 'Fade Cascade',
                icon: 'fa-bars-staggered',
                desc: 'Sequential fade-in for multiple objects',
                animations: [
                    { type: 'fade-in', params: { duration: 0.8, easing: 'easeIn' } }
                ],
                stagger: 300
            },
            {
                id: 'elastic-pop',
                name: 'Elastic Pop',
                icon: 'fa-expand',
                desc: 'Pop in with elastic overshoot',
                animations: [
                    { type: 'grow', params: { scale: 1.3, duration: 0.8, easing: 'elastic' } },
                    { type: 'fade-in', params: { duration: 0.4, easing: 'easeOut' } }
                ]
            },
            {
                id: 'pendulum-swing',
                name: 'Pendulum Swing',
                icon: 'fa-clock',
                desc: 'Continuous pendulum motion',
                animations: [
                    { type: 'pendulum', params: { distance: 120, duration: 2, easing: 'easeInOut', repeat: '-1' } }
                ]
            },
            {
                id: 'exit-dissolve',
                name: 'Exit Dissolve',
                icon: 'fa-ghost',
                desc: 'Shrink + fade out + slide down',
                animations: [
                    { type: 'fade-out', params: { duration: 0.8, easing: 'easeIn' } },
                    { type: 'shrink', params: { scale: 0.5, duration: 0.8, easing: 'easeIn' } },
                    { type: 'linear-move', params: { direction: 'down', distance: 30, duration: 0.8, easing: 'easeIn' } }
                ]
            }
        ];
    }

    bindEvents() {
        // Open template library modal
        document.getElementById('btn-templates')?.addEventListener('click', () => {
            document.getElementById('template-library-modal')?.classList.remove('hidden');
        });

        // Close modal
        document.getElementById('template-library-modal')?.querySelector('.modal-close')?.addEventListener('click', () => {
            document.getElementById('template-library-modal')?.classList.add('hidden');
        });
    }

    populateGrid() {
        const grid = document.getElementById('template-library-grid');
        if (!grid) return;

        grid.innerHTML = this.templates.map(t => `
            <div class="template-card" data-template-id="${t.id}">
                <div class="template-preview-area"><div class="template-preview-dot"></div></div>
                <i class="fas ${t.icon}"></i>
                <div class="template-name">${t.name}</div>
                <div class="template-desc">${t.desc}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                this.applyTemplate(card.dataset.templateId);
            });
            // Hover preview — run a CSS animation matching the template
            card.addEventListener('mouseenter', () => {
                const dot = card.querySelector('.template-preview-dot');
                if (dot) {
                    const tpl = this.templates.find(t => t.id === card.dataset.templateId);
                    dot.className = 'template-preview-dot';
                    void dot.offsetWidth; // force reflow
                    dot.classList.add('preview-' + (tpl?.id || 'default'));
                }
            });
            card.addEventListener('mouseleave', () => {
                const dot = card.querySelector('.template-preview-dot');
                if (dot) dot.className = 'template-preview-dot';
            });
        });
    }

    applyTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const selected = this.objects.getSelectedObjects();
        if (selected.length === 0) {
            Utils.showToast('Select objects first to apply a template', 'warning');
            return;
        }

        // Check text-only templates
        if (template.textOnly) {
            const textObjs = selected.filter(o => o.type === 'text');
            if (textObjs.length === 0) {
                Utils.showToast('This template requires text objects', 'warning');
                return;
            }
        }

        let appliedCount = 0;
        const targets = template.textOnly ? selected.filter(o => o.type === 'text') : selected;

        targets.forEach((obj, index) => {
            const staggerDelay = template.stagger ? (index * template.stagger) / 1000 : 0;

            template.animations.forEach(animConfig => {
                const def = this.animations.library[animConfig.type];
                if (!def) return;

                const params = { ...def.params, ...animConfig.params };
                params.delay = (params.delay || 0) + staggerDelay;

                const animData = {
                    id: Utils.generateId('anim'),
                    type: animConfig.type,
                    name: `${template.name}: ${def.name}`,
                    params: params,
                    delay: params.delay * 1000,
                    repeat: params.repeat || '1',
                    trigger: 'onLoad',
                    generated: def.generate(obj, params)
                };

                obj.animations.push(animData);
                appliedCount++;
            });
        });

        eventBus.emit('animation:applied', { type: 'template', objects: targets });
        eventBus.emit('timeline:update');
        this.animations.updateAppliedAnimationsList();
        this.animations.updateCodeOutput();

        Utils.showToast(`Applied "${template.name}" to ${targets.length} object(s) (${appliedCount} animations)`, 'success');
        document.getElementById('template-library-modal')?.classList.add('hidden');
    }
}
