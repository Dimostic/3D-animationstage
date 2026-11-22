/* ============================================
   Shared Facial Expression Specs
   Canonical expression dictionary for UC + Face Set.
   ============================================ */

(function () {
    const UC_EXPRESSIONS = {
        'neutral': {
            eye: 'open',
            brow: 'neutral',
            mouth: 'neutral'
        },
        'blink': {
            eye: 'closed',
            brow: 'neutral',
            mouth: 'neutral'
        },
        'half-blink': {
            eye: 'half',
            brow: 'neutral',
            mouth: 'neutral'
        },
        'wide-eyes': {
            eye: 'wide',
            brow: 'raised',
            mouth: 'neutral',
            featureOffsets: { brow: { y: -0.08 } }
        },
        'look-left': {
            eye: 'look-left',
            mouth: 'neutral'
        },
        'look-right': {
            eye: 'look-right',
            mouth: 'neutral'
        },
        'look-up': {
            eye: 'look-up',
            brow: 'raised',
            mouth: 'neutral',
            featureOffsets: { brow: { y: -0.04 } }
        },
        'look-down': {
            eye: 'look-down',
            mouth: 'neutral',
            featureOffsets: { brow: { y: 0.02 } }
        },
        'eye-roll': {
            eye: 'roll',
            brow: 'raised',
            mouth: 'neutral',
            featureOffsets: { brow: { y: -0.05 } }
        },
        'smile': {
            eye: 'half',
            brow: 'raised',
            mouth: 'smile',
            featureOffsets: { brow: { y: -0.03 } }
        },
        'happy': {
            eye: 'smile',
            brow: 'raised',
            mouth: 'grin',
            featureOffsets: { brow: { y: -0.05 }, mouth: { y: -0.01 } }
        },
        'sad': {
            eye: 'sad',
            brows: { left: 'sad-left', right: 'sad-right' },
            mouth: 'frown',
            featureOffsets: { brow: { y: 0.04 }, mouth: { y: 0.02 } }
        },
        'angry': {
            eye: 'squint',
            brows: { left: 'angry-left', right: 'angry-right' },
            mouth: 'snarl',
            featureOffsets: { brow: { y: -0.05 }, mouth: { y: -0.01 } }
        },
        'shocked': {
            eye: 'wide',
            brow: 'raised',
            mouth: 'wide-open',
            featureOffsets: { brow: { y: -0.10 }, mouth: { y: 0.02 } }
        },
        'talking': {
            eye: 'open',
            mouth: 'talking'
        },
        'singing': {
            eye: 'half',
            brow: 'raised',
            mouth: 'singing',
            featureOffsets: { mouth: { y: -0.01 } }
        },
        'shouting': {
            eye: 'wide',
            brows: { left: 'angry-left', right: 'angry-right' },
            mouth: 'wide-open',
            featureOffsets: { brow: { y: -0.06 }, mouth: { y: 0.01 } }
        },
        'crying': {
            eye: 'tear',
            brows: { left: 'sad-left', right: 'sad-right' },
            mouth: 'cry',
            featureOffsets: { brow: { y: 0.06 }, mouth: { y: 0.03 } }
        },
        'sleeping': {
            eye: 'closed',
            brow: 'lowered',
            mouth: 'neutral',
            featureOffsets: { brow: { y: 0.04 } }
        },
        'wink-left': {
            eyes: { left: 'closed', right: 'open' },
            brows: { left: 'lowered', right: 'raised' },
            mouth: 'smirk',
            featureOffsets: { 'brow-right': { y: -0.06 }, 'brow-left': { y: 0.02 } }
        },
        'wink-right': {
            eyes: { left: 'open', right: 'closed' },
            brows: { left: 'raised', right: 'lowered' },
            mouth: 'smirk',
            featureOffsets: { 'brow-left': { y: -0.06 }, 'brow-right': { y: 0.02 } }
        },
        'suspicious': {
            eyes: { left: 'half', right: 'open' },
            brows: { left: 'skeptical-high', right: 'skeptical-low' },
            mouth: 'smirk',
            featureOffsets: { 'brow-left': { y: -0.08 }, 'brow-right': { y: 0.04 } }
        },
        'surprised': {
            eye: 'wide',
            brow: 'raised',
            mouth: 'open',
            featureOffsets: { brow: { y: -0.08 }, mouth: { y: 0.01 } }
        },
        'laughing': {
            eye: 'smile',
            brow: 'raised',
            mouth: 'grin',
            featureOffsets: { brow: { y: -0.05 }, mouth: { y: -0.02 } }
        },
        'grimace': {
            eye: 'squint',
            brow: 'raised',
            mouth: 'grimace'
        },
        'pout': {
            eye: 'sad',
            brows: { left: 'sad-left', right: 'sad-right' },
            mouth: 'pout',
            featureOffsets: { mouth: { y: 0.02 } }
        },
        'closed-eyes': {
            eye: 'closed',
            brow: 'neutral',
            mouth: 'neutral'
        },
        'whispering': {
            eye: 'half',
            brow: 'neutral',
            mouth: 'talking',
            featureOffsets: { mouth: { y: 0.01 } }
        },
        'chanting': {
            eye: 'half',
            brow: 'raised',
            mouth: 'singing'
        },
        'breathing': {
            eye: 'open',
            brow: 'neutral',
            mouth: 'neutral'
        },
        'chewing': {
            eye: 'open',
            brow: 'neutral',
            mouth: 'grimace'
        },
        'nervous-blink': {
            eye: 'half',
            brow: 'raised',
            mouth: 'neutral'
        },
        'blink-loop': {
            eye: 'closed',
            brow: 'neutral',
            mouth: 'neutral'
        }
    };

    const FACE_SET_MOTION_TO_CANONICAL_EXPRESSION = {
        neutral: 'neutral',
        smile: 'smile',
        happy: 'happy',
        talk: 'talking',
        talking: 'talking',
        whispering: 'whispering',
        singing: 'singing',
        chanting: 'chanting',
        laugh: 'laughing',
        laughing: 'laughing',
        shout: 'shouting',
        shouting: 'shouting',
        frown: 'sad',
        sad: 'sad',
        angry: 'angry',
        shocked: 'shocked',
        surprised: 'surprised',
        blink: 'blink',
        halfBlink: 'half-blink',
        wideEyes: 'wide-eyes',
        lookLeft: 'look-left',
        lookRight: 'look-right',
        lookUp: 'look-up',
        lookDown: 'look-down',
        eyeRoll: 'eye-roll',
        suspicious: 'suspicious',
        winkLeft: 'wink-left',
        winkRight: 'wink-right',
        blinkLoop: 'blink-loop',
        nervousBlink: 'nervous-blink',
        chew: 'grimace',
        chewing: 'chewing',
        grimace: 'grimace',
        cry: 'crying'
        ,
        crying: 'crying',
        pout: 'pout',
        sleeping: 'sleeping',
        breathing: 'breathing',
        closedEyes: 'closed-eyes'
    };

    const FACE_SET_MOTION_CATALOG = [
        { key: 'neutral', name: 'Neutral / Clear Motion', description: 'Remove Face Set motion tracks from the target set.', category: 'Core' },
        { key: 'smile', name: 'Smile', description: 'Soft smile with lifted lips and relaxed brows.', category: 'Emotion' },
        { key: 'happy', name: 'Happy', description: 'Brighter smile with lifted brows and cheerful eyes.', category: 'Emotion' },
        { key: 'talk', name: 'Talk', description: 'Lip-sync style mouth flaps using upper lip, lower lip, opening, and teeth.', category: 'Speech' },
        { key: 'talking', name: 'Talk - Dialogue', description: 'Conversational mouth rhythm for spoken dialogue.', category: 'Speech' },
        { key: 'whispering', name: 'Whispering', description: 'Soft low-amplitude mouth motion for quiet speech.', category: 'Speech' },
        { key: 'singing', name: 'Singing', description: 'Rounded sustained mouth shapes for vocal delivery.', category: 'Speech' },
        { key: 'chanting', name: 'Chanting', description: 'Steady repetitive vocal pattern with controlled mouth rhythm.', category: 'Speech' },
        { key: 'laugh', name: 'Laugh', description: 'Wide happy mouth, raised brows, and smiling eye lids.', category: 'Emotion' },
        { key: 'laughing', name: 'Laugh - Big', description: 'Energetic open-mouth laugh with bright eye expression.', category: 'Emotion' },
        { key: 'shout', name: 'Shout', description: 'Large open mouth with high brows and clear intensity.', category: 'Speech' },
        { key: 'shouting', name: 'Shout - Big', description: 'Powerful projection with fully open mouth shapes.', category: 'Speech' },
        { key: 'frown', name: 'Frown', description: 'Downturned mouth with tense brows.', category: 'Emotion' },
        { key: 'sad', name: 'Sad', description: 'Lowered mood expression with downturned lips and brows.', category: 'Emotion' },
        { key: 'angry', name: 'Angry', description: 'Sharp tense expression with narrowed eyes and strong brows.', category: 'Emotion' },
        { key: 'shocked', name: 'Shocked', description: 'Strong surprise with wide eyes and open mouth.', category: 'Emotion' },
        { key: 'surprised', name: 'Surprised', description: 'Raised brows, round open mouth, and larger pupils.', category: 'Emotion' },
        { key: 'pout', name: 'Pout', description: 'Compressed lips and soft sad-eye shaping.', category: 'Emotion' },
        { key: 'crying', name: 'Cry - Tremble', description: 'Sad brows and trembling mouth expression.', category: 'Emotion' },
        { key: 'blink', name: 'Blink', description: 'Both eyes close and reopen.', category: 'Eyes + Gaze' },
        { key: 'halfBlink', name: 'Half Blink', description: 'Partial eyelid closure for subtle eye motion.', category: 'Eyes + Gaze' },
        { key: 'wideEyes', name: 'Wide Eyes', description: 'Open eyes wider with lifted brows.', category: 'Eyes + Gaze' },
        { key: 'lookLeft', name: 'Look Left', description: 'Shift gaze direction to the left.', category: 'Eyes + Gaze' },
        { key: 'lookRight', name: 'Look Right', description: 'Shift gaze direction to the right.', category: 'Eyes + Gaze' },
        { key: 'lookUp', name: 'Look Up', description: 'Shift gaze direction upward.', category: 'Eyes + Gaze' },
        { key: 'lookDown', name: 'Look Down', description: 'Shift gaze direction downward.', category: 'Eyes + Gaze' },
        { key: 'eyeRoll', name: 'Eye Roll', description: 'Rolling eye movement with expressive brow lift.', category: 'Eyes + Gaze' },
        { key: 'suspicious', name: 'Suspicious', description: 'Asymmetric eyelids and skeptical brows.', category: 'Eyes + Gaze' },
        { key: 'winkLeft', name: 'Wink Left', description: 'Left eye closes while the mouth smiles.', category: 'Eyes + Gaze' },
        { key: 'winkRight', name: 'Wink Right', description: 'Right eye closes while the mouth smiles.', category: 'Eyes + Gaze' },
        { key: 'closedEyes', name: 'Closed Eyes', description: 'Keeps both eyes closed in a resting state.', category: 'Eyes + Gaze' },
        { key: 'blinkLoop', name: 'Blink Loop', description: 'Repeated blinking pattern for idle eye movement.', category: 'Eyes + Gaze' },
        { key: 'nervousBlink', name: 'Nervous Blink', description: 'Quick irregular blinks for anxious mood.', category: 'Eyes + Gaze' },
        { key: 'chew', name: 'Chew', description: 'Repeated lower-lip and mouth opening movement.', category: 'Other' },
        { key: 'chewing', name: 'Chew - Loop', description: 'Chewing cycle with subtle jaw and lip movement.', category: 'Other' },
        { key: 'grimace', name: 'Grimace', description: 'Tense mouth compression and stressed facial shape.', category: 'Other' },
        { key: 'cry', name: 'Cry', description: 'Sad brows, trembling mouth, and half-closed eyes.', category: 'Emotion' }
        ,
        { key: 'sleeping', name: 'Sleeping', description: 'Closed eyes with calm resting mouth.', category: 'Other' },
        { key: 'breathing', name: 'Breathing', description: 'Subtle idle breathing expression.', category: 'Other' }
    ].map(entry => ({
        ...entry,
        canonicalExpression: FACE_SET_MOTION_TO_CANONICAL_EXPRESSION[entry.key] || 'neutral'
    }));

    function clone(value) {
        return value ? JSON.parse(JSON.stringify(value)) : value;
    }

    const api = {
        getUCExpressionSpec(name) {
            return clone(UC_EXPRESSIONS[name] || UC_EXPRESSIONS.neutral);
        },
        getCanonicalExpressionSpec(name) {
            return clone(UC_EXPRESSIONS[name] || UC_EXPRESSIONS.neutral);
        },
        listUCExpressionKeys() {
            return Object.keys(UC_EXPRESSIONS);
        },
        resolveFaceSetMotionKey(motionKey) {
            return FACE_SET_MOTION_TO_CANONICAL_EXPRESSION[motionKey] || 'neutral';
        },
        getFaceSetMotionCatalog() {
            return clone(FACE_SET_MOTION_CATALOG);
        },
        getFaceSetMotionMeta(key) {
            const found = FACE_SET_MOTION_CATALOG.find(entry => entry.key === key);
            return clone(found || null);
        },
        buildExpressionPickerUI(options) {
            const {
                selectedKey = 'neutral',
                onSelect = () => {},
                onDescriptionChange = () => {},
                mode = 'face-set',
                containerId = null
            } = options || {};

            const usesCatalog = mode === 'face-set';
            const entries = usesCatalog ? FACE_SET_MOTION_CATALOG : [];
            const keys = usesCatalog
                ? entries.map(e => e.key)
                : api.listUCExpressionKeys();

            const selected = selectedKey || 'neutral';
            let currentDesc = '';
            if (usesCatalog) {
                const meta = entries.find(e => e.key === selected);
                currentDesc = meta?.description || '';
            } else {
                const spec = UC_EXPRESSIONS[selected];
                currentDesc = spec ? `UC: ${selected} (eye: ${spec.eye}, brow: ${spec.brow}, mouth: ${spec.mouth})` : '';
            }

            const selectElement = document.createElement('select');
            selectElement.className = 'facial-expression-picker-select';
            keys.forEach(key => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = usesCatalog
                    ? (entries.find(e => e.key === key)?.name || key)
                    : key;
                if (key === selected) opt.selected = true;
                selectElement.appendChild(opt);
            });

            selectElement.addEventListener('change', (evt) => {
                const newKey = evt.target.value;
                onSelect(newKey);
                if (usesCatalog) {
                    const meta = entries.find(e => e.key === newKey);
                    onDescriptionChange(meta?.description || '');
                } else {
                    const spec = UC_EXPRESSIONS[newKey];
                    onDescriptionChange(spec ? `UC: ${newKey} (eye: ${spec.eye}, brow: ${spec.brow}, mouth: ${spec.mouth})` : '');
                }
            });

            const container = document.createElement('div');
            container.className = 'facial-expression-picker-container';
            container.appendChild(selectElement);
            if (currentDesc) {
                const descDiv = document.createElement('div');
                descDiv.className = 'facial-expression-picker-description';
                descDiv.textContent = currentDesc;
                container.appendChild(descDiv);
            }

            return { selectElement, container, setSelected: (key) => { selectElement.value = key; } };
        },
        validateExpressionParity(ucExprName, faceSetMotionKey) {
            const canonicalUC = UC_EXPRESSIONS[ucExprName];
            if (!canonicalUC) return { valid: false, reason: `UC expression '${ucExprName}' not found` };

            const canonicalFS = FACE_SET_MOTION_TO_CANONICAL_EXPRESSION[faceSetMotionKey];
            if (!canonicalFS) return { valid: false, reason: `Face Set motion '${faceSetMotionKey}' not found` };

            const specFS = UC_EXPRESSIONS[canonicalFS];
            if (!specFS) return { valid: false, reason: `Canonical expression '${canonicalFS}' for motion '${faceSetMotionKey}' not found` };

            const identicalMouth = (canonicalUC.mouth || 'neutral') === (specFS.mouth || 'neutral');
            const eyeCompat = (canonicalUC.eye || 'open') === (specFS.eye || 'open') || !specFS.eye;
            return {
                valid: identicalMouth && eyeCompat,
                ucExpression: ucExprName,
                faceSetMotion: faceSetMotionKey,
                canonicalTarget: canonicalFS,
                matchingMouth: identicalMouth,
                eyeCompatible: eyeCompat
            };
        },
        getExpressionHistory(system = 'universal') {
            return {
                system: system,
                timestamp: new Date().toISOString(),
                version: window.__appAssetVersion || 'unknown'
            };
        },
        createExpressionPicker(options = {}) {
            const {
                mode = 'face-set',
                selectedKey = 'neutral',
                onSelect = () => {},
                onDescriptionChange = () => {},
                showParity = false,
                containerClass = 'facial-expression-picker-panel'
            } = options;

            const pickerUI = this.buildExpressionPickerUI({
                selectedKey,
                onSelect,
                onDescriptionChange,
                mode
            });

            const wrapper = document.createElement('div');
            wrapper.className = containerClass;
            wrapper.appendChild(pickerUI.container);

            if (showParity && mode === 'face-set') {
                const parityInfo = document.createElement('div');
                parityInfo.className = 'facial-expression-parity-info';
                parityInfo.style.cssText = 'font-size: 11px; color: #8a8aa8; margin-top: 6px; padding: 4px 6px; background: #0f0f1a; border-radius: 3px;';
                
                const updateParity = (key) => {
                    const canonical = this.resolveFaceSetMotionKey(key);
                    const spec = UC_EXPRESSIONS[canonical];
                    if (spec) {
                        parityInfo.innerHTML = `<strong>Canonical:</strong> ${canonical}<br><strong>Mouth:</strong> ${spec.mouth || 'neutral'} | <strong>Eye:</strong> ${spec.eye || 'neutral'}`;
                    } else {
                        parityInfo.textContent = `${key} → canonical not found`;
                    }
                };

                const originalOnSelect = onSelect;
                pickerUI.selectElement.addEventListener('change', (evt) => {
                    updateParity(evt.target.value);
                    originalOnSelect(evt.target.value);
                });

                updateParity(selectedKey);
                wrapper.appendChild(parityInfo);
            }

            return {
                selectElement: pickerUI.selectElement,
                container: wrapper,
                setSelected: pickerUI.setSelected
            };
        },
        validateAndApplyExpression(applyFn, expressionKey, options = {}) {
            const { fallbackKey = 'neutral', showWarning = true } = options;

            if (typeof applyFn !== 'function') {
                const err = { valid: false, reason: 'applyFn must be a function' };
                if (showWarning) console.warn(err.reason);
                return err;
            }

            const keys = this.listUCExpressionKeys();
            if (!keys.includes(expressionKey)) {
                if (showWarning) console.warn(`Expression '${expressionKey}' not found; using '${fallbackKey}'`);
                expressionKey = fallbackKey;
            }

            try {
                applyFn(expressionKey);
                return { valid: true, appliedKey: expressionKey };
            } catch (err) {
                if (showWarning) console.error(`Failed to apply expression '${expressionKey}':`, err);
                return { valid: false, reason: err.message };
            }
        },
        getParityInfo(faceSetMotionKey) {
            const canonical = this.resolveFaceSetMotionKey(faceSetMotionKey);
            const spec = UC_EXPRESSIONS[canonical];
            if (!spec) {
                return { valid: false, reason: `Canonical expression '${canonical}' not found` };
            }
            return {
                valid: true,
                motion: faceSetMotionKey,
                canonical: canonical,
                mouth: spec.mouth || 'neutral',
                eye: spec.eye || 'neutral',
                brow: spec.brow || 'neutral',
                featureOffsets: spec.featureOffsets || {}
            };
        }
    };

    window.FacialExpressionSpecs = window.FacialExpressionSpecs || api;
})();
