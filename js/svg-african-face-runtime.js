/**
 * View-aware facial playback for SVG African premium character heads.
 * The factory is serializable so HTML preview/export can use this exact runtime.
 */
(function (global) {
    'use strict';

    function createSvgAfricanFaceRuntime() {
        const DEFAULT_STATE = Object.freeze({
            blink: 0,
            mouthOpen: 0.08,
            mouthWide: 0,
            mouthRound: 0,
            lipPress: 0,
            jawOpen: 0,
            mouthOpeningGain: 1,
            teethVisibility: 0.6,
            upperLipLift: 0,
            lowerLipDrop: 0,
            smile: 0.22,
            gazeX: 0,
            gazeY: 0,
            browRaise: 0,
            headNod: 0,
            headTilt: 0,
            headTurn: 0,
            frontHeadYaw: 0,
            rearFaceReveal: 0,
            listening: 0
        });

        function clamp(value, min, max, fallback = 0) {
            const numeric = Number(value);
            return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
        }

        function normalizeState(state = {}) {
            return {
                blink: clamp(state.blink, 0, 1, DEFAULT_STATE.blink),
                mouthOpen: clamp(state.mouthOpen, 0, 1, DEFAULT_STATE.mouthOpen),
                mouthWide: clamp(state.mouthWide, -1, 1, DEFAULT_STATE.mouthWide),
                mouthRound: clamp(state.mouthRound, 0, 1, DEFAULT_STATE.mouthRound),
                lipPress: clamp(state.lipPress, 0, 1, DEFAULT_STATE.lipPress),
                jawOpen: clamp(state.jawOpen, 0, 1, DEFAULT_STATE.jawOpen),
                mouthOpeningGain: clamp(state.mouthOpeningGain, 0.75, 3.2, DEFAULT_STATE.mouthOpeningGain),
                teethVisibility: clamp(state.teethVisibility, 0, 1, DEFAULT_STATE.teethVisibility),
                upperLipLift: clamp(state.upperLipLift, -1, 1, DEFAULT_STATE.upperLipLift),
                lowerLipDrop: clamp(state.lowerLipDrop, -1, 1, DEFAULT_STATE.lowerLipDrop),
                smile: clamp(state.smile, -1, 1, DEFAULT_STATE.smile),
                gazeX: clamp(state.gazeX, -8, 8, DEFAULT_STATE.gazeX),
                gazeY: clamp(state.gazeY, -5, 5, DEFAULT_STATE.gazeY),
                browRaise: clamp(state.browRaise, -6, 6, DEFAULT_STATE.browRaise),
                headNod: clamp(state.headNod, -8, 8, DEFAULT_STATE.headNod),
                headTilt: clamp(state.headTilt, -8, 8, DEFAULT_STATE.headTilt),
                headTurn: clamp(state.headTurn, -1, 1, DEFAULT_STATE.headTurn),
                frontHeadYaw: clamp(state.frontHeadYaw, -3, 3, 0),
                rearFaceReveal: clamp(state.rearFaceReveal, 0, 1, DEFAULT_STATE.rearFaceReveal),
                listening: clamp(state.listening, 0, 1, DEFAULT_STATE.listening)
            };
        }

        function queryById(root, id) {
            if (!root || !id || typeof root.querySelector !== 'function') return null;
            try {
                return root.querySelector(`[id="${id}"]`) || root.querySelector(`[id$="-${id}"]`);
            } catch (_) {
                return null;
            }
        }

        function queryByRole(root, role) {
            if (!root || !role || typeof root.querySelector !== 'function') return null;
            try {
                return root.querySelector(`[data-svg-african-role~="${role}"]`);
            } catch (_) {
                return null;
            }
        }

        function createMouthElement(root, parent, before, tagName, id, attributes = {}) {
            const documentRef = root?.ownerDocument;
            if (!documentRef?.createElementNS || !parent?.insertBefore) return null;
            const element = documentRef.createElementNS('http://www.w3.org/2000/svg', tagName);
            element.setAttribute('id', `svg-african-runtime-${id}`);
            Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
            parent.insertBefore(element, before || null);
            return element;
        }

        function ensureFrontMouthDetails(root) {
            const upper = queryById(root, 'mouth-upper');
            const parent = upper?.parentNode || queryById(root, 'mouth');
            if (!parent) return;
            if (!queryById(root, 'mouth-opening')) {
                createMouthElement(root, parent, upper, 'path', 'mouth-opening', {
                    'data-svg-african-role': 'mouth-opening oral-cavity',
                    d: 'M38.2 92.7 C43.2 91.8 56.8 91.8 61.8 92.7 C58.2 95.2 41.8 95.2 38.2 92.7 Z',
                    fill: '#21080c',
                    opacity: '0'
                });
            }
            if (!queryById(root, 'mouth-teeth')) {
                createMouthElement(root, parent, upper, 'path', 'mouth-teeth', {
                    'data-svg-african-role': 'mouth-teeth teeth',
                    d: 'M39.4 92.7 Q50 94.2 60.6 92.7 Q50 96.0 39.4 92.7 Z',
                    fill: '#fffaf2',
                    opacity: '0'
                });
            }
            if (!queryById(root, 'mouth-tongue')) {
                createMouthElement(root, parent, upper, 'ellipse', 'mouth-tongue', {
                    'data-svg-african-role': 'mouth-tongue tongue',
                    cx: '50',
                    cy: '95.8',
                    rx: '5.8',
                    ry: '1.25',
                    fill: '#c96f72',
                    opacity: '0'
                });
            }
            const opening = queryById(root, 'mouth-opening');
            const teeth = queryById(root, 'mouth-teeth');
            const tongue = queryById(root, 'mouth-tongue');
            const lower = queryById(root, 'mouth-lower');
            [opening, teeth, tongue].filter(Boolean).forEach(element => parent.insertBefore(element, upper));
            if (lower && lower !== upper) parent.insertBefore(lower, upper.nextSibling);
        }

        function ensureSideMouthDetails(root) {
            const upper = queryById(root, 'side-mouth-upper');
            const parent = upper?.parentNode;
            if (!parent) return;
            if (!queryById(root, 'side-mouth-fill')) {
                createMouthElement(root, parent, upper, 'path', 'side-mouth-fill', {
                    'data-svg-african-role': 'mouth-fill mouth-opening oral-cavity side-view-premium',
                    d: 'M66 91.3 C71 90 75 90.5 77 91.6 C76 94 71 94.3 66.5 93.1 Z',
                    fill: '#351014',
                    opacity: '0'
                });
            }
            if (!queryById(root, 'side-mouth-teeth')) {
                createMouthElement(root, parent, upper, 'path', 'side-mouth-teeth', {
                    'data-svg-african-role': 'mouth-teeth teeth side-view-premium',
                    d: 'M67.4 91.4 C71.2 90.7 74.6 91.0 76.2 91.8 C73.5 92.7 70.1 92.7 67.4 91.4 Z',
                    fill: '#fffaf2',
                    opacity: '0'
                });
            }
            if (!queryById(root, 'side-mouth-tongue')) {
                createMouthElement(root, parent, upper, 'ellipse', 'side-mouth-tongue', {
                    'data-svg-african-role': 'mouth-tongue tongue side-view-premium',
                    cx: '72.5',
                    cy: '94.0',
                    rx: '2.9',
                    ry: '.72',
                    fill: '#c96f72',
                    opacity: '0'
                });
            }
        }

        function getMouthVisibility(state) {
            const effectiveOpen = clamp(state.mouthOpen + state.jawOpen * 0.42 - state.lipPress * 0.22, 0, 1, 0);
            const openVisibility = clamp((effectiveOpen - 0.025) * 4.4, 0, 1, 0);
            const teethCue = openVisibility * .7 + Math.max(0, state.mouthWide) * 0.45
                + Math.max(0, state.upperLipLift) * 2
                + state.lipPress * 0.9 * openVisibility;
            return {
                effectiveOpen,
                cavityOpacity: clamp((effectiveOpen - 0.01) * 1.45, 0, 0.99, 0) * (1 - state.lipPress * 0.72),
                teethOpacity: state.teethVisibility * openVisibility * clamp(teethCue * (1 - state.lipPress) * (1 - state.jawOpen * 0.35) * Math.pow(1 - state.mouthRound * 0.95,2), 0, 1, 0),
                tongueOpacity: clamp((effectiveOpen - 0.1) * 1.65 * Math.pow(Math.max(0, 1 - state.jawOpen * 0.92), 1.4)
                    * (1 - Math.abs(state.mouthWide) * 0.72) * (1 - state.mouthRound * 0.88)
                    * (1 - Math.max(0, state.lowerLipDrop) * 0.58), 0, 0.36, 0)
            };
        }

        function detectView(root) {
            const declared = String(root?.getAttribute?.('data-svg-african-view') || '').trim().toLowerCase();
            if (declared) return declared;
            if (queryById(root, 'side-facing-root') || queryById(root, 'side-eye')) return 'side-right';
            if (queryById(root, 'back-head') || queryByRole(root, 'back-view-premium')) return 'back';
            return 'front';
        }

        function readEmbeddedState(root) {
            const encoded = root?.getAttribute?.('data-svg-african-face-state') || '';
            if (!encoded) return { ...DEFAULT_STATE };
            try {
                return normalizeState(JSON.parse(decodeURIComponent(encoded)));
            } catch (_) {
                return { ...DEFAULT_STATE };
            }
        }

        function getOriginState(root) {
            const saved = root?.getAttribute?.('data-svg-african-runtime-origin-state') || '';
            if (saved) {
                try {
                    return normalizeState(JSON.parse(decodeURIComponent(saved)));
                } catch (_) {}
            }
            const origin = readEmbeddedState(root);
            root?.setAttribute?.('data-svg-african-runtime-origin-state', encodeURIComponent(JSON.stringify(origin)));
            return origin;
        }

        function rememberTransform(element) {
            if (!element?.getAttribute || !element?.setAttribute) return '';
            const key = 'data-svg-african-runtime-base-transform';
            if (!element.hasAttribute(key)) element.setAttribute(key, element.getAttribute('transform') || '');
            return element.getAttribute(key) || '';
        }

        function setAdditiveTransform(element, transform) {
            if (!element?.setAttribute) return false;
            const base = rememberTransform(element);
            element.setAttribute('transform', [base, transform].filter(Boolean).join(' ').trim());
            return true;
        }

        function rememberPath(element) {
            if (!element?.getAttribute || !element?.setAttribute) return '';
            const key = 'data-svg-african-runtime-base-d';
            if (!element.hasAttribute(key)) {
                const authoredBase = element.getAttribute('data-svg-african-mouth-base-d');
                element.setAttribute(key, authoredBase || element.getAttribute('d') || '');
            }
            return element.getAttribute(key) || '';
        }

        // Bend interior lip points while keeping both mouth corners attached.
        function deformMouthPath(pathData, travel) {
            const source = String(pathData || '');
            const amount = Number(travel) || 0;
            if (!source || Math.abs(amount) < 0.0001) return source;
            const expression = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
            const values = [...source.matchAll(expression)].map(match => Number(match[0]));
            if (values.length < 4 || values.length % 2 !== 0 || values.some(value => !Number.isFinite(value))) return source;
            const xs = values.filter((_, index) => index % 2 === 0);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const width = maxX - minX;
            if (!(width > 0.001)) return source;
            let index = 0;
            return source.replace(expression, () => {
                let value = values[index];
                if (index % 2 === 1) {
                    const x = values[index - 1];
                    const progress = clamp((x - minX) / width, 0, 1, 0);
                    value += amount * Math.sin(progress * Math.PI);
                }
                index++;
                return Number(value.toFixed(3)).toString();
            });
        }

        function setDeformedMouthPath(element, travel) {
            if (!element?.setAttribute) return false;
            const base = rememberPath(element);
            if (!base) return false;
            element.setAttribute('d', deformMouthPath(base, travel));
            return true;
        }

        function pathNumbers(pathData) {
            return (String(pathData || '').match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || [])
                .map(value => Number(value));
        }

        function interpolatePath(basePath, targetPath, amount) {
            const base = pathNumbers(basePath);
            const target = pathNumbers(targetPath);
            const blend = clamp(amount, 0, 1, 0);
            if (!base.length || base.length !== target.length || base.some(value => !Number.isFinite(value))) {
                return targetPath;
            }
            let index = 0;
            return String(targetPath).replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi, () => {
                const value = base[index] + (target[index] - base[index]) * blend;
                index++;
                return Number(value.toFixed(3)).toString();
            });
        }

        function setBlendedMouthPath(element, targetPath, amount) {
            if (!element?.setAttribute) return false;
            const base = rememberPath(element);
            if (!base) return false;
            element.setAttribute('d', interpolatePath(base, targetPath, amount));
            return true;
        }

        function applyNaturalFrontMouth(root, origin, state, values) {
            const upperElement = queryById(root, 'mouth-upper');
            const lowerElement = queryById(root, 'mouth-lower');
            const upperBase = rememberPath(upperElement);
            const lowerBase = rememberPath(lowerElement);
            const upper = pathNumbers(upperBase);
            const lower = pathNumbers(lowerBase);
            if (upper.length < 14 || lower.length < 14 || upper.length % 2 || lower.length % 2) return false;
            const allX = upper.filter((_, index) => index % 2 === 0);
            const upperY = upper.filter((_, index) => index % 2 === 1);
            const lowerY = lower.filter((_, index) => index % 2 === 1);
            const minX = Math.min(...allX);
            const maxX = Math.max(...allX);
            const centerX = (minX + maxX) / 2;
            const baseHalfWidth = Math.max(5, (maxX - minX) / 2);
            const cornerY = upper[1] - values.smileDelta * 0.35;
            const upperFullness = clamp(cornerY - Math.min(...upperY), 1.2, 3.2, 1.8);
            const lowerFullness = clamp(Math.max(...lowerY) - cornerY, 1.6, 3.4, 2.4);
            const widthScale = clamp(1 + values.wideDelta * 0.18 - values.roundDelta * 0.28 - values.pressDelta * 0.03, 0.62, 1.24, 1);
            const cornerScale = clamp(1 + values.wideDelta * 0.1 - values.roundDelta * 0.24 - values.pressDelta * 0.02, 0.7, 1.14, 1);
            const halfWidth = baseHalfWidth * cornerScale;
            const controlHalfWidth = baseHalfWidth * widthScale;
            const left = centerX - halfWidth;
            const right = centerX + halfWidth;
            const upperOuter = cornerY - upperFullness - values.upperTravel * 0.86;
            const upperInner = cornerY + clamp(0.2 + values.effectiveOpen * 0.14 - Math.max(0, values.pressDelta) * 0.22, 0.04, 0.55, 0.2);
            const lowerOuter = cornerY + lowerFullness + values.lowerTravel * 1.22;
            const lowerInner = cornerY + clamp(0.52 + values.effectiveOpen * 1.7
                + Math.max(0, values.lowerTravel) * 0.48
                + Math.max(0, values.roundDelta) * 0.75
                - Math.max(0, values.pressDelta) * 0.28, 0.16, 4.25, 0.52);
            const upperTarget = `M${left.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX - controlHalfWidth * 0.48).toFixed(3)} ${upperOuter.toFixed(3)} ${(centerX + controlHalfWidth * 0.42).toFixed(3)} ${upperOuter.toFixed(3)} ${right.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX + controlHalfWidth * 0.5).toFixed(3)} ${upperInner.toFixed(3)} ${(centerX - controlHalfWidth * 0.5).toFixed(3)} ${upperInner.toFixed(3)} ${left.toFixed(3)} ${cornerY.toFixed(3)} Z`;
            const lowerTarget = `M${left.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX - controlHalfWidth * 0.46).toFixed(3)} ${lowerOuter.toFixed(3)} ${(centerX + controlHalfWidth * 0.46).toFixed(3)} ${lowerOuter.toFixed(3)} ${right.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX + controlHalfWidth * 0.52).toFixed(3)} ${lowerInner.toFixed(3)} ${(centerX - controlHalfWidth * 0.52).toFixed(3)} ${lowerInner.toFixed(3)} ${left.toFixed(3)} ${cornerY.toFixed(3)} Z`;
            const innerHalf = halfWidth * clamp(0.78 * widthScale, 0.44, 0.9, 0.78);
            const cavityTop = cornerY - Math.max(0.18, values.upperTravel * 0.82
                + values.effectiveOpen * 0.32 + Math.max(0, values.roundDelta) * 0.32);
            const cavityBottom = Math.max(
                lowerInner + 0.42,
                cornerY + 0.5 + values.lowerTravel * 1.45 + values.effectiveOpen * 2.15
            );
            const openingTarget = `M${(centerX - innerHalf).toFixed(3)} ${(cornerY + 0.02).toFixed(3)} C${(centerX - innerHalf * 0.36).toFixed(3)} ${cavityTop.toFixed(3)} ${(centerX + innerHalf * 0.36).toFixed(3)} ${cavityTop.toFixed(3)} ${(centerX + innerHalf).toFixed(3)} ${(cornerY + 0.02).toFixed(3)} C${(centerX + innerHalf * 0.4).toFixed(3)} ${cavityBottom.toFixed(3)} ${(centerX - innerHalf * 0.4).toFixed(3)} ${cavityBottom.toFixed(3)} ${(centerX - innerHalf).toFixed(3)} ${(cornerY + 0.02).toFixed(3)} Z`;
            const teethHalf = innerHalf * 0.84;
            const teethTop = cavityTop + 0.12;
            const teethBottom = Math.min(cornerY + 0.95 + values.effectiveOpen * 0.25, cavityBottom - 0.3);
            const teethTarget = `M${(centerX - teethHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Q${centerX.toFixed(3)} ${teethTop.toFixed(3)} ${(centerX + teethHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Q${centerX.toFixed(3)} ${teethBottom.toFixed(3)} ${(centerX - teethHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Z`;

            let changed = setBlendedMouthPath(upperElement, upperTarget, values.activity);
            changed = setBlendedMouthPath(lowerElement, lowerTarget, values.activity) || changed;
            changed = setBlendedMouthPath(queryById(root, 'mouth-opening'), openingTarget, values.activity) || changed;
            const teeth = queryById(root, 'mouth-teeth');
            if (teeth?.setAttribute) {
                teeth.setAttribute('d', teethTarget);
                changed = true;
            }
            const tongue = queryById(root, 'mouth-tongue');
            if (tongue?.setAttribute) {
                tongue.setAttribute('cx', centerX.toFixed(3));
                tongue.setAttribute('cy', Math.max(cornerY + 0.8, cavityBottom - 0.55).toFixed(3));
                tongue.setAttribute('rx', Math.max(1.6, innerHalf * 0.52).toFixed(3));
                tongue.setAttribute('ry', Math.max(0.45, values.effectiveOpen * 0.82).toFixed(3));
                changed = true;
            }
            return changed;
        }

        function applyNaturalSideMouth(root, state) {
            const upper = queryById(root, 'side-mouth-upper');
            const lower = queryById(root, 'side-mouth-lower');
            const opening = queryById(root, 'side-mouth-fill');
            const teeth = queryById(root, 'side-mouth-teeth');
            const tongue = queryById(root, 'side-mouth-tongue');
            if (!upper?.setAttribute || !lower?.setAttribute || !opening?.setAttribute) return false;
            const lipColor = (element, fallback) => {
                const fill = element.getAttribute('fill');
                if (fill && fill !== 'none') return fill;
                const stroke = element.getAttribute('stroke');
                return stroke && stroke !== 'none' ? stroke : fallback;
            };
            const upperColor = lipColor(upper, '#793b35');
            const lowerColor = lipColor(lower, '#c96f72');
            const source = pathNumbers(rememberPath(upper));
            const sourceX = source.filter((_, index) => index % 2 === 0);
            const fallbackBack = sourceX.length ? Math.min(...sourceX) : 66;
            const fallbackFront = sourceX.length ? Math.max(...sourceX) : 77;
            const readMetric = (name, fallback) => {
                const attribute = upper.getAttribute(name);
                if (attribute === null || attribute.trim() === '') return fallback;
                const value = Number(attribute);
                return Number.isFinite(value) ? value : fallback;
            };
            const baseBack = readMetric('data-svg-african-side-mouth-back-x', fallbackBack);
            const baseFront = readMetric('data-svg-african-side-mouth-front-x', fallbackFront);
            const baseY = readMetric('data-svg-african-side-mouth-center-y', source[1] || 92);
            const fullnessScale = clamp(readMetric('data-svg-african-side-mouth-fullness',
                readMetric('data-svg-african-profile-lip-fullness', 1)), 0.68, 1.55, 1);
            const visibility = getMouthVisibility(state);
            const effectiveOpen = visibility.effectiveOpen;
            const open = clamp((effectiveOpen - 0.08) / 0.585, 0, 1);
            const wide = clamp(state.mouthWide, -1, 1, 0);
            const round = clamp(state.mouthRound, 0, 1, 0);
            const press = clamp(state.lipPress, 0, 1, 0);
            const jaw = clamp(state.jawOpen, 0, 1, 0);
            const openingGain = clamp(state.mouthOpeningGain, 0.75, 3.2, 1);
            const apertureScale = clamp(0.62 + openingGain * 0.38, 0.9, 1.84, 1);
            const upperLift = clamp(state.upperLipLift, -1, 1, 0);
            const lowerDrop = clamp(state.lowerLipDrop, -1, 1, 0);
            const smile = clamp(state.smile, -1, 1, 0);
            const neutralLength = Math.max(6.2, baseFront - baseBack);
            const backX = baseBack - Math.max(0, wide) * neutralLength * 0.1
                + round * neutralLength * 0.17;
            const frontX = baseFront + round * neutralLength * 0.025
                + Math.max(0, wide) * neutralLength * 0.015;
            const length = Math.max(5.6, frontX - backX);
            const seamY = baseY - smile * 0.18;
            const upperFullness = clamp((1.35 + press * 0.28 - upperLift * 0.18) * fullnessScale, 0.9, 2.4);
            const lowerFullness = clamp((1.5 + round * 0.18) * fullnessScale, 1, 2.6);
            const upperTipY = seamY - (open * 1.05 + upperLift * 0.22) * apertureScale;
            const lowerTipY = seamY + Math.min(length * 0.78,
                (open * 4.8 + jaw + Math.max(0, lowerDrop) * 0.7) * apertureScale);
            const lowerFrontX = frontX - open * apertureScale;
            // The cavity shares the inner lip curves; opening the jaw never inflates it past the profile.
            const point = (x, y) => `${x.toFixed(3)} ${y.toFixed(3)}`;
            const corner = point(backX, seamY);
            const upperTip = point(frontX, upperTipY);
            const lowerTip = point(lowerFrontX, lowerTipY);
            const upperInnerA = point(backX + length * 0.34, seamY - open * 0.35);
            const upperInnerB = point(frontX - length * 0.2, upperTipY);
            const lowerInnerY = seamY + (lowerTipY - seamY) * 0.3;
            const lowerInnerA = point(backX + length * 0.4, lowerInnerY);
            const lowerInnerB = point(lowerFrontX - length * 0.2, lowerTipY + open * 0.15);
            const upperPath = `M${corner} C${point(backX + length * 0.34, seamY - open * 0.35 - upperFullness)} ${point(frontX - length * 0.14, upperTipY - upperFullness * 0.9)} ${upperTip} C${upperInnerB} ${upperInnerA} ${corner} Z`;
            const lowerPath = `M${corner} C${lowerInnerA} ${lowerInnerB} ${lowerTip} C${point(lowerFrontX - length * 0.2, lowerTipY + open * 0.15 + lowerFullness)} ${point(backX + length * 0.4, lowerInnerY + lowerFullness * 0.8)} ${corner} Z`;
            const openingPath = `M${corner} C${upperInnerA} ${upperInnerB} ${upperTip} L${lowerTip} C${lowerInnerB} ${lowerInnerA} ${corner} Z`;
            const innerBack = backX + length * 0.1;
            const innerFront = lowerFrontX - length * (0.06 + round * 0.02);
            const cavityTop = seamY;
            const cavityBottom = lowerTipY;
            const cavityFrontX = frontX;
            const cavityFrontTop = upperTipY;
            const cavityFrontBottom = lowerTipY;
            const teethBottom = Math.min(cavityBottom - 0.12, seamY + 0.42 + open * 0.54);
            const teethPath = `M${(innerBack + length * 0.04).toFixed(3)} ${(cavityTop + 0.02).toFixed(3)} C${(backX + length * 0.48).toFixed(3)} ${(seamY - open * 0.14).toFixed(3)} ${(frontX - length * 0.15).toFixed(3)} ${(seamY - open * 0.06).toFixed(3)} ${(innerFront - length * 0.03).toFixed(3)} ${(cavityTop + 0.04).toFixed(3)} C${(frontX - length * 0.24).toFixed(3)} ${teethBottom.toFixed(3)} ${(backX + length * 0.38).toFixed(3)} ${teethBottom.toFixed(3)} ${(innerBack + length * 0.04).toFixed(3)} ${(cavityTop + 0.02).toFixed(3)} Z`;

            upper.setAttribute('d', upperPath);
            upper.setAttribute('data-svg-african-role', 'mouth-upper upper-lip side-view-premium natural-profile-lips natural-side-mouth refined-side-mouth profile-lips-chin profile-face-refined');
            upper.setAttribute('fill', upperColor);
            upper.setAttribute('stroke', 'none');
            upper.setAttribute('opacity', '.98');
            upper.setAttribute('data-svg-african-side-mouth-front-y', upperTipY.toFixed(3));
            upper.setAttribute('data-svg-african-side-mouth-active-front-x', frontX.toFixed(3));
            lower.setAttribute('d', lowerPath);
            lower.setAttribute('data-svg-african-role', 'mouth-lower lower-lip side-view-premium natural-profile-lips natural-side-mouth refined-side-mouth profile-lips-chin profile-face-refined');
            lower.setAttribute('fill', lowerColor);
            lower.setAttribute('stroke', 'none');
            lower.setAttribute('opacity', '.96');
            lower.setAttribute('data-svg-african-side-mouth-front-y', lowerTipY.toFixed(3));
            lower.setAttribute('data-svg-african-side-mouth-active-front-x', lowerFrontX.toFixed(3));
            opening.setAttribute('d', openingPath);
            opening.setAttribute('data-svg-african-role', 'mouth-fill mouth-opening oral-cavity side-view-premium');
            opening.setAttribute('fill', '#21080c');
            opening.setAttribute('opacity', clamp(Math.pow(open, 0.62) * 1.18
                * (1 - press * 0.76), 0, 0.98, 0).toFixed(2));
            opening.setAttribute('data-svg-african-side-mouth-aperture-x', cavityFrontX.toFixed(3));
            opening.setAttribute('data-svg-african-side-mouth-aperture-top', cavityFrontTop.toFixed(3));
            opening.setAttribute('data-svg-african-side-mouth-aperture-bottom', cavityFrontBottom.toFixed(3));
            setAdditiveTransform(upper, '');
            setAdditiveTransform(lower, '');
            setAdditiveTransform(opening, '');
            if (teeth?.setAttribute) {
                teeth.setAttribute('d', teethPath);
                teeth.setAttribute('opacity', (visibility.teethOpacity * clamp(open * 3.2, 0, 1, 0)).toFixed(2));
                setAdditiveTransform(teeth, '');
            }
            if (tongue?.setAttribute) {
                tongue.setAttribute('cx', (backX + length * 0.65).toFixed(3));
                tongue.setAttribute('cy', (seamY + (cavityBottom - seamY) * 0.48).toFixed(3));
                tongue.setAttribute('rx', (length * 0.16).toFixed(3));
                tongue.setAttribute('ry', (open * 0.3).toFixed(3));
                tongue.setAttribute('opacity', (visibility.tongueOpacity * clamp(open * 2.4, 0, 1, 0)).toFixed(2));
                setAdditiveTransform(tongue, '');
            }
            return true;
        }

        function readOriginNumber(element, attribute, fallback = 0) {
            if (!element?.getAttribute || !element?.setAttribute) return fallback;
            const key = `data-svg-african-runtime-base-${attribute}`;
            if (!element.hasAttribute(key)) element.setAttribute(key, element.getAttribute(attribute) || String(fallback));
            const value = Number(element.getAttribute(key));
            return Number.isFinite(value) ? value : fallback;
        }

        function setScaledEye(element, centerY, ratio, minimum = 0.12) {
            if (!element) return false;
            return setAdditiveTransform(
                element,
                `translate(0 ${centerY.toFixed(2)}) scale(1 ${Math.max(minimum, ratio).toFixed(4)}) translate(0 ${(-centerY).toFixed(2)})`
            );
        }

        function setPupilState(element, origin, state, options = {}) {
            if (!element?.setAttribute) return false;
            const isCircle = String(element.nodeName || '').toLowerCase() === 'circle';
            const baseX = readOriginNumber(element, 'cx');
            const baseY = readOriginNumber(element, 'cy');
            const dx = (state.gazeX - origin.gazeX) * (options.gazeScaleX || 0.23);
            const dy = (state.gazeY - origin.gazeY) * (options.gazeScaleY || 0.18);
            element.setAttribute('cx', (baseX + dx).toFixed(2));
            element.setAttribute('cy', (baseY + dy).toFixed(2));
            if (isCircle) {
                const baseR = readOriginNumber(element, 'r', 1);
                const originScale = Math.max(0.18, 1 - origin.blink * 0.72);
                const targetScale = Math.max(0.18, 1 - state.blink * 0.72);
                element.setAttribute('r', Math.max(0.2, baseR * targetScale / originScale).toFixed(2));
            } else {
                const baseRy = readOriginNumber(element, 'ry', 1);
                const originScale = Math.max(0.16, 1 - origin.blink * 0.75);
                const targetScale = Math.max(0.16, 1 - state.blink * 0.75);
                element.setAttribute('ry', Math.max(0.25, baseRy * targetScale / originScale).toFixed(2));
            }
            return true;
        }

        function applyHeadMotion(root, view, state) {
            const head = queryById(root, 'head-motion') || queryByRole(root, 'head-motion');
            if (!head?.setAttribute) return false;
            const authoredFrontThreeQuarter = view.startsWith('front-3q-')
                && root?.getAttribute?.('data-svg-african-projection') === 'authored-3q';
            if (root.getAttribute('data-photo-face') === 'v1') {
                head.setAttribute('transform', `translate(0 ${-state.headNod * .18}) rotate(${state.headTilt * .45} 50 130)`);
            } else if (authoredFrontThreeQuarter) {
                head.setAttribute('transform', `translate(0 ${(-state.headNod * 0.22).toFixed(2)}) rotate(${(state.headTilt * 0.45).toFixed(2)} 52 132)`);
            } else if (view.startsWith('back-3q-') && root?.getAttribute?.('data-svg-african-projection') === 'authored-3q') {
                head.setAttribute('transform', `translate(0 ${(-state.headNod * 0.22).toFixed(2)}) rotate(${(state.headTilt * 0.45).toFixed(2)} 52 142)`);
            } else if (view.startsWith('side-')) {
                head.setAttribute('transform', `translate(50 76) rotate(${state.headTilt.toFixed(2)}) translate(-50 -76) translate(0 ${(state.headNod * 0.18).toFixed(2)})`);
            } else if (view === 'back' || view.startsWith('back-3q-')) {
                head.setAttribute('transform', `translate(49 72) rotate(${state.headTilt.toFixed(2)}) translate(-49 -72) translate(0 ${(state.headNod * 0.16).toFixed(2)})`);
            } else {
                head.setAttribute('transform', `translate(0 ${(-state.headNod * 0.22).toFixed(2)}) rotate(${(state.headTilt * 0.45).toFixed(2)} 49 74)`);
            }
            return true;
        }

        function applyAttention(root, state) {
            const ring = queryById(root, 'attention-ring');
            if (!ring?.setAttribute) return false;
            ring.setAttribute('opacity', String(state.listening > 0.05 ? Math.min(0.75, state.listening).toFixed(2) : 0));
            return true;
        }

        function applyFrontFace(root, origin, state) {
            const pupils = [queryById(root, 'pupil-left'), queryById(root, 'pupil-right')].filter(Boolean);
            const irises = [queryById(root, 'iris-left'), queryById(root, 'iris-right')].filter(Boolean);
            const eyeCenter = pupils[0] || irises[0];
            const eyeCenterY = eyeCenter ? readOriginNumber(eyeCenter, 'cy', 66) : 66;
            const originOpen = Math.max(0.18, 1 - origin.blink * 0.82);
            const targetOpen = Math.max(0.18, 1 - state.blink * 0.82);
            const eyeRatio = targetOpen / originOpen;
            let changed = false;
            ['eye-left', 'eye-right', 'eyelid-left', 'eyelid-right'].forEach(id => {
                changed = setScaledEye(queryById(root, id), eyeCenterY, eyeRatio) || changed;
            });
            [...irises, ...pupils].forEach(eyeDetail => {
                changed = setPupilState(eyeDetail, origin, state) || changed;
            });
            [['pupil-left', 'eye-highlight-left'], ['pupil-right', 'eye-highlight-right']].forEach(([, highlightId]) => {
                const highlight = queryById(root, highlightId);
                if (!highlight) return;
                changed = setPupilState(highlight, origin, state) || changed;
                highlight.setAttribute('opacity', state.blink > 0.82 ? '0' : '.75');
            });
            ['brow-left', 'brow-right'].forEach(id => {
                changed = setAdditiveTransform(queryById(root, id), `translate(0 ${(-(state.browRaise - origin.browRaise)).toFixed(2)})`) || changed;
            });
            ensureFrontMouthDetails(root);
            const mouth = queryById(root, 'mouth');
            const mouthVisibility = getMouthVisibility(state);
            const originMouthVisibility = getMouthVisibility(origin);
            const effectiveOpen = mouthVisibility.effectiveOpen;
            const mouthDelta = effectiveOpen - originMouthVisibility.effectiveOpen;
            const openingGain = clamp(state.mouthOpeningGain, 0.75, 3.2, 1);
            const apertureScale = clamp(0.72 + openingGain * 0.28, 0.93, 1.62, 1);
            const smileDelta = state.smile - origin.smile;
            const wideDelta = state.mouthWide - origin.mouthWide;
            const roundDelta = state.mouthRound - origin.mouthRound;
            const pressDelta = state.lipPress - origin.lipPress;
            const upperTravel = (mouthDelta * 0.38
                + (state.upperLipLift - origin.upperLipLift) * 0.92
                + roundDelta * 0.08
                - pressDelta * 0.1) * apertureScale;
            const lowerTravel = (mouthDelta * 0.94
                + (state.jawOpen - origin.jawOpen) * 0.5
                + (state.lowerLipDrop - origin.lowerLipDrop) * 0.68
                - pressDelta * 0.13) * apertureScale;
            const mouthScaleY = clamp(1
                + (Math.max(0, mouthDelta) * 0.34
                    + Math.max(0, state.jawOpen - origin.jawOpen) * 0.12
                    + Math.max(0, state.lowerLipDrop - origin.lowerLipDrop) * 0.07) * openingGain,
            0.86, 2.55, 1);
            changed = setAdditiveTransform(
                mouth,
                `translate(50 92) scale(${Math.max(0.72, 1 + smileDelta * 0.08).toFixed(4)} ${mouthScaleY.toFixed(4)}) translate(-50 -92)`
            ) || changed;
            const upper = queryById(root, 'mouth-upper');
            const lower = queryById(root, 'mouth-lower');
            changed = applyNaturalFrontMouth(root, origin, state, {
                activity: 1,
                effectiveOpen,
                smileDelta,
                wideDelta,
                roundDelta,
                pressDelta,
                upperTravel,
                lowerTravel
            }) || changed;
            changed = setAdditiveTransform(upper, '') || changed;
            changed = setAdditiveTransform(lower, '') || changed;
            const opening = queryById(root, 'mouth-opening');
            if (opening?.setAttribute) {
                setAdditiveTransform(opening, '');
                opening.setAttribute('data-svg-african-role', 'mouth-opening oral-cavity');
                opening.setAttribute('fill', '#351014');
                opening.setAttribute('opacity', mouthVisibility.cavityOpacity.toFixed(2));
                changed = true;
            }
            const teeth = queryById(root, 'mouth-teeth');
            if (teeth?.setAttribute) {
                teeth.setAttribute('opacity', mouthVisibility.teethOpacity.toFixed(2));
                setAdditiveTransform(teeth, '');
                changed = true;
            }
            const tongue = queryById(root, 'mouth-tongue');
            if (tongue?.setAttribute) {
                tongue.setAttribute('opacity', mouthVisibility.tongueOpacity.toFixed(2));
                setAdditiveTransform(tongue, '');
                changed = true;
            }
            const highlight = queryById(root, 'mouth-highlight') || queryByRole(root, 'lip-highlight');
            if (highlight?.setAttribute) {
                const highlightOpacity = clamp(0.58
                    * Math.max(0, 1 - mouthVisibility.effectiveOpen * 2.2)
                    * Math.max(0, 1 - Math.max(0, state.mouthRound) * 1.45), 0, 0.58, 0);
                highlight.setAttribute('opacity', highlightOpacity.toFixed(2));
                changed = true;
            }
            return changed;
        }

        // These offsets address the absolute cubic paths authored by the drawn
        // 3/4 renderer. Always start at the saved path, never the previous frame.
        function setAuthoredPathOffsets(element, offsets = {}) {
            if (!element?.setAttribute) return false;
            const base = rememberPath(element);
            if (!base) return false;
            let index = 0;
            element.setAttribute('d', base.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi, value => {
                const offset = Number(offsets[index++]) || 0;
                return offset ? Number((Number(value) + offset).toFixed(3)).toString() : value;
            }));
            return true;
        }

        function applyDrawnThreeQuarterFace(root, view, origin, state) {
            let changed = false;
            for (const [side, role, clipId, gazeScale, irisRx, irisRy, pupilR, minRy, minR] of [
                ['left', 'near', 'nearEyeClip3q', 1, 2.15, 2.25, 1.08, .3, .22],
                ['right', 'far', 'farEyeClip3q', .65, 1.8, 1.9, .9, .28, .2]
            ]) {
                const eye = queryById(root, `eye-${side}`);
                const eyePath = pathNumbers(rememberPath(eye));
                const centerY = eyePath[1];
                if (!Number.isFinite(centerY)) continue;
                const neutralHeight = Number(eye.getAttribute('data-svg-african-eye-half-height'))
                    || Math.abs(centerY - eyePath[3]) / Math.max(.1, 1 - origin.blink * .9);
                const originHeight = Math.max(.3, neutralHeight * (1 - origin.blink * .9));
                const targetHeight = Math.max(.3, neutralHeight * (1 - state.blink * .9));
                const blinkRatio = targetHeight / originHeight;
                changed = setScaledEye(eye, centerY, blinkRatio, .01) || changed;
                changed = setScaledEye(queryById(root, clipId)?.querySelector('path'), centerY, blinkRatio, .01) || changed;
                changed = setAuthoredPathOffsets(queryByRole(root, `${role}-eyelid`), {
                    3: originHeight - targetHeight, 5: originHeight - targetHeight
                }) || changed;
                const iris = queryById(root, `pupil-${side}`);
                const core = queryByRole(root, `${role}-pupil-core`);
                const highlight = queryByRole(root, `${role}-eye-highlight`);
                const scale = readOriginNumber(iris, 'rx', irisRx) / irisRx;
                const dx = (state.gazeX - origin.gazeX) * (view.endsWith('left') ? -.16 : .16) * gazeScale;
                const dy = (clamp(state.gazeY, -5, 5, 0) - clamp(origin.gazeY, -5, 5, 0)) * .16;
                for (const detail of [iris, core, highlight]) {
                    if (!detail?.setAttribute) continue;
                    detail.setAttribute('cx', (readOriginNumber(detail, 'cx') + dx).toFixed(2));
                    detail.setAttribute('cy', (readOriginNumber(detail, 'cy') + dy).toFixed(2));
                    changed = true;
                }
                iris?.setAttribute('ry', Math.max(minRy, irisRy * scale * (1 - state.blink * .84)).toFixed(2));
                core?.setAttribute('r', Math.max(minR, pupilR * scale * (1 - state.blink * .8)).toFixed(2));
                highlight?.setAttribute('opacity', state.blink > .82 ? '0' : (role === 'near' ? '.86' : '.82'));
                changed = setAdditiveTransform(queryById(root, `brow-${side}`), `translate(0 ${(-(state.browRaise - origin.browRaise)).toFixed(2)})`) || changed;
            }

            const valuesFor = value => {
                const open = getMouthVisibility(value).effectiveOpen;
                const aperture = clamp(.72 + value.mouthOpeningGain * .28, .93, 1.62, 1);
                return {
                    upper: (open * 1.4 + value.upperLipLift * .84 + value.mouthRound * .08 - value.lipPress * .09) * aperture,
                    lower: (open * 5.8 + value.jawOpen * 1.8 + value.lowerLipDrop * 1.2 - value.lipPress * .12) * aperture,
                    smile: clamp(value.smile + .08, -1, 1, 0)
                };
            };
            const from = valuesFor(origin), to = valuesFor(state);
            const upperDelta = to.upper - from.upper, smileDelta = to.smile - from.smile;
            const lowerDelta = to.lower - from.lower + smileDelta * .5;
            changed = setAuthoredPathOffsets(queryById(root, 'mouth-upper'), {
                3: -upperDelta - smileDelta, 5: -upperDelta - smileDelta, 7: -upperDelta,
                9: -upperDelta - smileDelta, 11: -upperDelta - smileDelta
            }) || changed;
            changed = setAuthoredPathOffsets(queryById(root, 'mouth-lower'), {
                1: smileDelta * .2, 3: lowerDelta, 5: lowerDelta, 7: smileDelta * .2,
                9: lowerDelta, 11: lowerDelta, 13: smileDelta * .2
            }) || changed;
            changed = setAuthoredPathOffsets(queryById(root, 'mouth-opening'), {
                3: -upperDelta, 5: -upperDelta, 9: lowerDelta, 11: lowerDelta
            }) || changed;
            changed = setAuthoredPathOffsets(queryById(root, 'mouth-teeth'), { 3: -upperDelta * .45, 5: -upperDelta * .45 }) || changed;
            const tongue = queryById(root, 'mouth-tongue');
            tongue?.setAttribute('cy', (readOriginNumber(tongue, 'cy') + lowerDelta).toFixed(2));
            const head = queryByRole(root, 'head-motion');
            const upperBase = pathNumbers(rememberPath(queryById(root, 'mouth-upper')));
            // Matched heads morph the lip geometry independently of legacy
            // landmark metadata. Scale speech around the current cupid's bow,
            // not the original front-facing mouth position (also repairs saves).
            const centerX = Number.isFinite(upperBase[6]) ? upperBase[6]
                : Number(head?.getAttribute('data-svg-african-mouth-center-x')) || 60;
            const centerY = upperBase[1] || 96;
            const mouth = queryById(root, 'mouth');
            mouth?.setAttribute('transform', `translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) scale(${clamp(1 + state.mouthWide * .2 - state.mouthRound * .32, .52, 1.24, 1).toFixed(4)} 1) translate(${-centerX} ${-centerY})`);
            const visibility = getMouthVisibility(state);
            const cavityOpacity = clamp((visibility.effectiveOpen - .015) * 1.18, 0, .98, 0) * (1 - state.lipPress * .72);
            queryById(root, 'mouth-opening')?.setAttribute('opacity', cavityOpacity.toFixed(2));
            queryById(root, 'mouth-teeth')?.setAttribute('opacity', visibility.teethOpacity.toFixed(2));
            tongue?.setAttribute('opacity', visibility.tongueOpacity.toFixed(2));
            return changed;
        }

        function applySideFace(root, origin, state) {
            const iris = queryById(root, 'side-iris');
            const pupil = queryById(root, 'side-pupil');
            const highlight = queryById(root, 'side-eye-highlight');
            const eyeCenterY = readOriginNumber(iris || pupil, 'cy', 68);
            const originOpen = Math.max(0.18, 1 - origin.blink * 0.82);
            const targetOpen = Math.max(0.18, 1 - state.blink * 0.82);
            const eyeRatio = targetOpen / originOpen;
            let changed = setScaledEye(queryById(root, 'side-eye'), eyeCenterY, eyeRatio);
            changed = setScaledEye(queryById(root, 'side-upper-eyelid'), eyeCenterY, eyeRatio) || changed;
            changed = setPupilState(iris, origin, state, { gazeScaleX: 0.2, gazeScaleY: 0.16 }) || changed;
            changed = setPupilState(pupil, origin, state, { gazeScaleX: 0.2, gazeScaleY: 0.16 }) || changed;
            if (highlight) {
                changed = setPupilState(highlight, origin, state, { gazeScaleX: 0.2, gazeScaleY: 0.16 }) || changed;
                highlight.setAttribute('opacity', state.blink > 0.82 ? '0' : '.9');
            }
            changed = setAdditiveTransform(queryById(root, 'side-brow'), `translate(0 ${(-(state.browRaise - origin.browRaise)).toFixed(2)})`) || changed;
            ensureSideMouthDetails(root);
            changed = applyNaturalSideMouth(root, state) || changed;
            return changed;
        }

        function applySideHeadTurn(root, state) {
            const amount = Math.max(0, Math.min(1, state.frontHeadYaw));
            const cx = Number(root.getAttribute('data-side-turn-eye-x')) || 66;
            const cy = Number(root.getAttribute('data-side-turn-eye-y')) || 67;
            const edge = Number(root.getAttribute('data-side-turn-outline-x')) + 5;
            const near = root.querySelector('[data-side-turn-part="near-eye"]');
            const far = root.querySelector('[data-side-turn-part="far-eye"]');
            near.setAttribute('transform', `translate(${-9*amount} 0) translate(${cx} 0) scale(${1+.12*amount} 1) translate(${-cx} 0)`);
            // Clone the current expression, not a second independently animated face.
            for (const node of far.querySelectorAll('[data-side-turn-source]')) {
                const source = queryById(root, node.getAttribute('data-side-turn-source'));
                for (const attr of source.attributes) if (attr.name !== 'id' && !attr.name.startsWith('data-')) node.setAttribute(attr.name, attr.value);
            }
            far.setAttribute('transform', `translate(${Math.min(cx+5,edge-5)} ${cy}) scale(${.65*amount} ${1-.12*amount}) translate(${-cx} ${-cy})`);
            far.setAttribute('visibility', amount > .001 ? 'visible' : 'hidden');
            root.querySelector('[data-side-turn-part="mouth"]').setAttribute('transform', `translate(${-8*amount} 0)`);
            root.querySelector('[data-side-turn-part="nose"]').setAttribute('transform', `translate(${-7*amount} 0)`);
            root.querySelector('[data-side-turn-nose-bridge]')?.setAttribute('opacity', String(amount*.5));
            const face = queryById(root, 'side-face');
            const contour = face.getAttribute('d');
            let command = 0;
            // The profile contour is authored as M + cubic Beziers. Replace the
            // nose/lip silhouette with the far cheek as the face turns inward.
            face.setAttribute('d', contour.replace(/([MC])([^MCZ]*)/gi, (whole, op, data) => {
                const segment = command++;
                if (segment < 4 || segment > 9) return whole;
                const coordinates = data.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi).map(Number);
                let index = 0;
                return op + data.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi, token => {
                    const value = Number(token);
                    const i = index++;
                    const cheek = edge - .009*Math.pow(coordinates[i+1]-74,2);
                    return i % 2 ? token : String(value + (cheek-value)*amount);
                });
            }));
            root.querySelector('[data-side-turn-clip] path')?.setAttribute('d', face.getAttribute('d'));
            root.setAttribute('data-active-head-view', amount > .5 ? 'viewer-three-quarter' : detectView(root));
        }

        function applyBackThreeQuarterFace(root, view, origin, state) {
            const reveal = queryById(root, 'back-3q-face-reveal') || queryByRole(root, 'back-3q-face-reveal');
            if (!reveal) return false;
            const revealScale = value => Math.max(0.58, Math.min(0.86, 0.58 + Math.max(0, value) * 0.28));
            const revealOpacity = value => {
                const progress = Math.max(0, Math.min(1, (Math.max(0, value) - 0.16) / 0.44));
                return progress * progress * (3 - 2 * progress);
            };
            // New movement tracks use rearFaceReveal. Taking the maximum with
            // headTurn preserves older recorded projects without coupling new
            // visibility changes to neck or head rotation.
            const talkingProfile = queryById(root, 'back-3q-face-side')?.getAttribute('data-svg-african-talking-profile') === 'experimental';
            const originReveal = talkingProfile ? 1 : Math.max(origin.rearFaceReveal, Math.max(0, origin.headTurn));
            const targetReveal = talkingProfile ? 1 : Math.max(state.rearFaceReveal, Math.max(0, state.headTurn));
            const originScale = revealScale(originReveal);
            const targetScale = revealScale(targetReveal);
            const targetOpacity = revealOpacity(targetReveal);
            let changed = setAdditiveTransform(
                reveal,
                `translate(88 0) scale(${(targetScale / originScale).toFixed(4)} 1) translate(-88 0)`
            );
            reveal.setAttribute('data-svg-african-head-turn', state.headTurn.toFixed(3));
            reveal.setAttribute('data-svg-african-rear-face-reveal', targetReveal.toFixed(3));
            reveal.setAttribute('opacity', targetOpacity.toFixed(3));
            reveal.setAttribute('visibility', targetOpacity > 0.001 ? 'visible' : 'hidden');

            const iris = queryById(root, 'back-3q-iris');
            const pupil = queryById(root, 'back-3q-pupil');
            const highlight = queryById(root, 'back-3q-eye-highlight');
            const eyeCenterY = readOriginNumber(iris || pupil, 'cy', 66.4);
            const originOpen = Math.max(0.14, 1 - origin.blink * 0.82);
            const targetOpen = Math.max(0.14, 1 - state.blink * 0.82);
            changed = setScaledEye(queryById(root, 'back-3q-eye'), eyeCenterY, targetOpen / originOpen) || changed;
            const gazeScaleX = view.endsWith('-left') ? -0.16 : 0.16;
            changed = setPupilState(iris, origin, state, { gazeScaleX, gazeScaleY: 0.14 }) || changed;
            changed = setPupilState(pupil, origin, state, { gazeScaleX, gazeScaleY: 0.14 }) || changed;
            if (highlight) {
                changed = setPupilState(highlight, origin, state, { gazeScaleX, gazeScaleY: 0.14 }) || changed;
                highlight.setAttribute('opacity', state.blink > 0.82 ? '0' : '.82');
            }
            changed = setAdditiveTransform(
                queryById(root, 'back-3q-brow'),
                `translate(0 ${(-(state.browRaise - origin.browRaise)).toFixed(2)})`
            ) || changed;
            const mouthVisibility = getMouthVisibility(state);
            const originMouthVisibility = getMouthVisibility(origin);
            const effectiveOpen = mouthVisibility.effectiveOpen;
            const mouthDelta = effectiveOpen - originMouthVisibility.effectiveOpen;
            const openingGain = clamp(state.mouthOpeningGain, 0.75, 3.2, 1);
            const smileDelta = state.smile - origin.smile;
            const widthDelta = (state.mouthWide - origin.mouthWide) * 0.18 - (state.mouthRound - origin.mouthRound) * 0.26;
            changed = setAdditiveTransform(
                queryById(root, 'back-3q-mouth'),
                `translate(83 87) scale(${Math.max(0.62, 1 + smileDelta * 0.08 + widthDelta).toFixed(4)} ${clamp(1 + mouthDelta * 0.62 * openingGain, 0.72, 2.55, 1).toFixed(4)}) translate(-83 -87) translate(0 ${(-smileDelta * 0.55).toFixed(2)})`
            ) || changed;
            const opening = queryById(root, 'back-3q-mouth-opening');
            if (opening?.setAttribute) {
                opening.setAttribute('fill', '#351014');
                opening.setAttribute('stroke', '#351014');
                opening.setAttribute('opacity', mouthVisibility.cavityOpacity.toFixed(2));
                changed = true;
            }
            const upperTravel = (mouthDelta * 0.3 + (state.upperLipLift - origin.upperLipLift) * 0.58) * openingGain;
            const lowerTravel = (mouthDelta * 0.72
                + (state.jawOpen - origin.jawOpen) * 0.38
                + (state.lowerLipDrop - origin.lowerLipDrop) * 0.52) * openingGain;
            changed = setDeformedMouthPath(queryById(root, 'back-3q-mouth-upper'), -upperTravel) || changed;
            changed = setDeformedMouthPath(queryById(root, 'back-3q-mouth-lower'), lowerTravel) || changed;
            const teeth = queryById(root, 'back-3q-mouth-teeth');
            if (teeth?.setAttribute) {
                teeth.setAttribute('opacity', mouthVisibility.teethOpacity.toFixed(2));
                changed = true;
            }
            const tongue = queryById(root, 'back-3q-mouth-tongue');
            if (tongue?.setAttribute) {
                tongue.setAttribute('opacity', mouthVisibility.tongueOpacity.toFixed(2));
                changed = true;
            }
            return changed;
        }

        function applyVectorPhotoMouth(root, state, x, y, width, travel, sx, opening) {
            const p = (x, y) => `${x.toFixed(3)} ${y.toFixed(3)}`;
            const half = width * sx / 2, left = x - half, right = x + half;
            const corner = y - state.smile * width * .075;
            const profile = root.getAttribute('data-photo-profile') === 'true';
            const upperCorner = profile ? corner - travel * .35 : corner;
            const lowerCorner = profile ? corner + travel * .65 : corner;
            const top = y - travel * .52 * (1 + state.upperLipLift * .35);
            const bottom = y + travel * .98 * (1 + state.lowerLipDrop * .35);
            const thickness = clamp(root.getAttribute('data-photo-lip-height'), .5, 4.5, 1.5) * .65 * (1 - state.lipPress * .65);
            // Both lips share the cavity's corners and inner curves. Regenerate from
            // the saved rest geometry so scrubbing cannot accumulate deformation.
            const upperCurve = `C${p(left + half * .6, top)} ${p(right - half * .6, top)} ${p(right, upperCorner)}`;
            const lowerCurve = `C${p(right - half * .5, bottom)} ${p(left + half * .5, bottom)} ${p(left, corner)}`;
            const cavity = `M${p(left, corner)} ${upperCurve} ${profile ? `L${p(right, lowerCorner)}` : ''} ${lowerCurve}Z`;
            root.querySelector('[data-photo-cavity]')?.setAttribute('d', cavity);
            root.querySelector('[data-photo-mouth-clip]')?.setAttribute('d', cavity);
            const upper = root.querySelector('[data-photo-lip="upper"]'), lower = root.querySelector('[data-photo-lip="lower"]');
            upper?.setAttribute('transform', 'translate(0 0)'); lower?.setAttribute('transform', 'translate(0 0)');
            const upperHeight = thickness * (1 + state.upperLipLift * .3), lowerHeight = thickness * (1 + state.lowerLipDrop * .3);
            upper?.querySelector('path')?.setAttribute('d', `M${p(left, corner)} ${upperCurve} C${p(right - half * .5, top - upperHeight)} ${p(x + half * .2, top - upperHeight * 1.5)} ${p(x, top - upperHeight * .8)} C${p(x - half * .2, top - upperHeight * 1.5)} ${p(left + half * .5, top - upperHeight)} ${p(left, corner)}Z`);
            lower?.querySelector('path')?.setAttribute('d', `M${p(right, lowerCorner)} ${lowerCurve} C${p(left + half * .5, bottom + lowerHeight * 1.5)} ${p(right - half * .5, bottom + lowerHeight * 1.5)} ${p(right, lowerCorner)}Z`);
            const teeth = root.querySelector('[data-photo-teeth]'), tongue = root.querySelector('[data-photo-tongue]');
            const toothY = top + Math.max(.2, travel * .12), toothHeight = Math.min(1.8, travel * .3);
            teeth?.setAttribute('d', `M${p(left + half * .3, toothY)} Q${p(x, toothY - .3)} ${p(right - half * .3, toothY)} L${p(right - half * .35, toothY + toothHeight)} Q${p(x, toothY + toothHeight + .3)} ${p(left + half * .35, toothY + toothHeight)}Z`);
            teeth?.setAttribute('opacity', String(clamp(opening * 1.5, 0, 1) * (1 - state.mouthRound * .8)));
            tongue?.setAttribute('d', `M${p(x - half * .4, bottom)} Q${p(x, bottom - travel * .25)} ${p(x + half * .4, bottom)}Z`);
            tongue?.setAttribute('opacity', String(clamp((opening - .2) * 1.3, 0, .8)));
        }

        function applyPhotoFace(root, state) {
            if (root.getAttribute('data-realistic-face') === 'true'
                && root.getAttribute('data-realistic-regions') === 'v1') return applyLocalizedPhotoFace(root, state);
            if (root.getAttribute('data-realistic-face') === 'true') {
                const active = state.mouthOpen > .015 || state.jawOpen > .015 || state.blink > .015 || Math.abs(state.gazeX) + Math.abs(state.gazeY) > .015;
                const regions = root.getAttribute('data-realistic-regions') === 'v1';
                root.querySelector('[data-realistic-rest]')?.setAttribute('opacity', regions || !active ? '1' : '0');
                root.querySelector('[data-realistic-animated]')?.setAttribute('opacity', active ? '1' : '0');
                if (regions) {
                    // Keep speech from replacing the eyes, and blinks from replacing the mouth.
                    const mouth = (state.mouthOpen*.82+state.jawOpen*.18)*state.mouthOpeningGain*(1-state.lipPress);
                    root.querySelector('[data-realistic-region="mouth"]')?.setAttribute('opacity', String(clamp(mouth/.08,0,1)));
                    const eye = Math.max(state.blink,Math.abs(state.gazeX),Math.abs(state.gazeY));
                    for(const node of root.querySelectorAll('[data-realistic-region="eye"]')) node.setAttribute('opacity',String(clamp(eye/.08,0,1)));
                }
            }
            const width = clamp(root.getAttribute('data-photo-mouth-width'), 1, 70, 20);
            const x = clamp(root.getAttribute('data-photo-mouth-x'), 0, 100, 50);
            const y = clamp(root.getAttribute('data-photo-mouth-y'), 0, 150, 90);
            const opening = clamp((state.mouthOpen * .82 + state.jawOpen * .18) * state.mouthOpeningGain * (1 - state.lipPress), 0, 2);
            const travel = opening * width * .20;
            const sx = clamp(1 + state.mouthWide * .15 - state.mouthRound * .24, .7, 1.2);
            for (const side of ['upper', 'lower']) {
                const node = root.querySelector(`[data-photo-lip="${side}"]`);
                const shift = side === 'upper' ? -travel * .3 : travel * .7;
                node?.setAttribute('transform', `translate(${x} ${y + shift}) scale(${sx} 1) translate(${-x} ${-y})`);
            }
            const cavity = root.querySelector('[data-photo-cavity]');
            cavity?.setAttribute('ry', String(Math.max(.1, travel * .65)));
            cavity?.setAttribute('rx', String(width * .46 * sx));
            cavity?.setAttribute('cy', String(y + travel * .2));
            cavity?.setAttribute('opacity', opening > .015 ? '1' : '0');
            if (root.getAttribute('data-photo-vector') === 'v1') applyVectorPhotoMouth(root, state, x, y, width, travel, sx, opening);
            for (const eye of root.querySelectorAll('[data-photo-eye]')) {
                const cx = Number(eye.getAttribute('data-cx')), cy = Number(eye.getAttribute('data-cy'));
                eye.setAttribute('transform', `translate(${cx} ${cy}) scale(1 ${Math.max(.04, 1 - state.blink)}) translate(${-cx} ${-cy})`);
            }
            for (const pupil of root.querySelectorAll('[data-photo-pupil]')) pupil.setAttribute('transform', `translate(${state.gazeX * .14} ${state.gazeY * .10})`);
            for (const brow of root.querySelectorAll('[data-photo-brow]')) brow.setAttribute('transform', `translate(0 ${-state.browRaise * .35})`);
            return true;
        }

        function applyLocalizedPhotoFace(root, state) {
            const width = clamp(root.getAttribute('data-photo-mouth-width'), 1, 70, 20);
            const x = clamp(root.getAttribute('data-photo-mouth-x'), 0, 100, 50);
            const y = clamp(root.getAttribute('data-photo-mouth-y'), 0, 150, 90);
            const eyes = [...root.querySelectorAll('[data-photo-eye]')];
            const profile = root.getAttribute('data-photo-profile') === 'true'
                || detectView(root).startsWith('side-') || eyes.length === 1;
            const release = 1 - state.lipPress;
            const opening = clamp((state.mouthOpen * .82 + state.jawOpen * .18)
                * state.mouthOpeningGain * release, 0, 1.25);
            const travel = opening * width * (profile ? .16 : .20);
            // Small breaths fade in continuously; the repair and crop stay together.
            const fade = value => { const t = clamp(value / .08, 0, 1); return t * t * (3 - 2 * t); };
            const articulation = Math.max(Math.abs(state.upperLipLift), Math.abs(state.lowerLipDrop)) * release;
            const mouthAlpha = fade(Math.max(opening, articulation * .16,
                Math.abs(state.mouthWide) * .08, state.mouthRound * .08));
            const eyeAlpha = fade(Math.max(state.blink, Math.abs(state.gazeX), Math.abs(state.gazeY)));
            root.querySelector('[data-realistic-rest]')?.setAttribute('opacity', '1');
            root.querySelector('[data-realistic-animated]')?.setAttribute('opacity', '1');
            root.querySelector('[data-realistic-region="mouth"]')?.setAttribute('opacity', String(mouthAlpha));
            for (const node of root.querySelectorAll('[data-realistic-region="eye"]')) node.setAttribute('opacity', String(eyeAlpha));
            const sx = clamp(1 + (state.mouthWide * .15 - state.mouthRound * .24) * (profile ? .45 : 1), .7, 1.2);
            const upper = -travel * .3 - state.upperLipLift * width * .025 * release;
            const lower = travel * .7 + state.lowerLipDrop * width * .035 * release;
            for (const [side, shift] of [['upper', upper], ['lower', lower]]) {
                const lip=root.querySelector(`[data-photo-lip="${side}"]`);
                const strips=lip?.querySelectorAll('[data-photo-lip-strip]');
                if (strips?.length) {
                    lip.setAttribute('transform', `translate(${x} ${y}) scale(${sx} 1) translate(${-x} ${-y})`);
                    const weight=px=>Math.sqrt(Math.max(0,1-Math.pow(clamp((px-x)/(width*.5),-1,1),2)));
                    for(const strip of strips) {
                        const start=Number(strip.getAttribute('data-start')),end=Number(strip.getAttribute('data-end'));
                        const a=shift*weight(start),b=shift*weight(end),slope=(b-a)/(end-start || 1);
                        strip.setAttribute('transform',`matrix(1 ${slope} 0 1 0 ${a-slope*start})`);
                    }
                } else lip?.setAttribute('transform',
                    `translate(${x} ${y + shift}) scale(${sx} 1) translate(${-x} ${-y})`);
            }
            const cavity = root.querySelector('[data-photo-cavity]');
            // Keep the dark opening inside the displaced lip edges, including closure cues.
            const gap = Math.max(0, lower - upper);
            cavity?.setAttribute('ry', String(Math.max(.01, gap * .5)));
            cavity?.setAttribute('rx', String(width * .46 * sx));
            cavity?.setAttribute('cy', String(y + (upper + lower) * .5));
            cavity?.setAttribute('opacity', String(fade(gap / width)));
            const tongue=root.querySelector('[data-photo-tongue]');
            tongue?.setAttribute('cx',String(x));tongue?.setAttribute('cy',String(y+(upper+lower)*.5+gap*.22));
            tongue?.setAttribute('rx',String(width*.20*sx));tongue?.setAttribute('ry',String(gap*.12));
            tongue?.setAttribute('opacity',String(fade(gap/width)*.24));
            for (const eye of eyes) {
                const cx = Number(eye.getAttribute('data-cx')), cy = Number(eye.getAttribute('data-cy'));
                const lidDrop=(Number(eye.getAttribute('data-height'))||0)*.3*state.blink;
                eye.setAttribute('transform', `translate(${cx} ${cy+lidDrop}) scale(1 ${Math.max(.04, 1 - state.blink)}) translate(${-cx} ${-cy})`);
            }
            for (const pupil of root.querySelectorAll('[data-photo-pupil]')) pupil.setAttribute('transform',
                `translate(${state.gazeX * (profile ? .07 : .14)} ${state.gazeY * .10})`);
            return true;
        }

        let teethClipSerial=0;
        function clipTeeth(root) {
            for(const [teethId,openingId] of [['mouth-teeth','mouth-opening'],['side-mouth-teeth','side-mouth-fill'],['back-3q-mouth-teeth','back-3q-mouth-opening']]) {
                const teeth=queryById(root,teethId),opening=queryById(root,openingId);
                if(!teeth||!opening||!opening.getAttribute('d'))continue;
                let clip=teeth.parentNode.querySelector(`[data-teeth-clip="${teethId}"]`);
                if(!clip){clip=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','clipPath');clip.id=`speech-teeth-clip-${++teethClipSerial}`;clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.setAttribute('data-teeth-clip',teethId);teeth.parentNode.appendChild(clip);}
                const shape=opening.cloneNode(false);shape.removeAttribute('id');shape.removeAttribute('opacity');shape.removeAttribute('style');shape.setAttribute('fill','#fff');clip.replaceChildren(shape);
                teeth.setAttribute('clip-path',`url(#${clip.id})`);teeth.setAttribute('fill','#fff5df');
            }
        }
        function applyState(root, requestedState = {}) {
            if (!root || typeof root.querySelector !== 'function') return null;
            // Compact older saved photographic SVGs as well as freshly generated artwork.
            if(!root.hasAttribute('data-photo-textures-shared') && (root.getAttribute('data-realistic-head-pack')==='true'||root.getAttribute('data-realistic-face')==='true')) {
                const images=[...root.querySelectorAll('[data-photo-lip-strip] image')];
                if(images.length) {
                    const ns='http://www.w3.org/2000/svg',defs=root.ownerDocument.createElementNS(ns,'defs'),shared=new Map();
                    root.insertBefore(defs,root.firstChild);
                    for(const image of images) {
                        const key=image.outerHTML;let id=shared.get(key);
                        if(!id){let index=shared.size;do{id=`runtime-photo-lip-${index++}`;}while(root.querySelector(`[id="${id}"]`));const texture=image.cloneNode(true);texture.setAttribute('id',id);defs.appendChild(texture);shared.set(key,id);}
                        const use=root.ownerDocument.createElementNS(ns,'use');use.setAttribute('href','#'+id);image.replaceWith(use);
                    }
                }
                root.setAttribute('data-photo-textures-shared','true');
            }
            if(root.getAttribute('data-realistic-head-pack')==='true') {
                const state=normalizeState({mouthOpen:0,...requestedState}),base=root.getAttribute('data-head-turn-base')||'front';
                const angles={front:0,'front-3q-right':35,'side-right':90,'back-3q-right':145,back:180,'back-3q-left':-145,'side-left':-90,'front-3q-left':-35};
                const yaw=state.frontHeadYaw,sign=base.endsWith('left')?-1:1;
                const target=base.startsWith('side')?angles[base]-sign*Math.max(0,yaw)*30:base.startsWith('front-3q')?angles[base]*(1-Math.min(1,Math.abs(yaw))):base.startsWith('back-3q')?angles[base]-sign*yaw*35:base==='back'?180-yaw*35:yaw*30;
                let active=null,best=Infinity;
                for(const node of root.querySelectorAll(':scope > [data-realistic-head-view]')) {
                    const angle=angles[node.getAttribute('data-realistic-head-view')],delta=Math.abs(((angle-target+540)%360)-180);
                    if(delta<best){best=delta;active=node;}
                    node.setAttribute('display','none');
                }
                if(active){active.setAttribute('display','inline');applyState(active,{...state,frontHeadYaw:0,headTurn:0});root.setAttribute('data-active-head-view',active.getAttribute('data-realistic-head-view'));}
                return {...state,view:base,faceApplied:!!active};
            }
            if (root.getAttribute('data-independent-head-turn') === 'true') {
                const state = normalizeState(requestedState), amount = Math.min(1, Math.abs(state.frontHeadYaw));
                const base = root.getAttribute('data-head-turn-base') || 'front';
                const threeQuarter = /^front-3q-(left|right)$/.test(base);
                const rearThreeQuarter = /^back-3q-(left|right)$/.test(base);
                const side = base.startsWith('side-') ? state.frontHeadYaw<.5?base:state.frontHeadYaw>2.5?'front':'viewer-three-quarter' : amount < .5 ? base : rearThreeQuarter ? state.frontHeadYaw > 0 ? 'profile' : 'back' : threeQuarter ? 'viewer' : state.frontHeadYaw < 0 ? 'left' : 'right';
                const blink = state.blink;
                const matched = root.getAttribute('data-head-turn-construction') === 'matched';
                for (const node of root.querySelectorAll(':scope > [data-head-turn-view]')) {
                    const active = matched || node.getAttribute('data-head-turn-view') === side;
                    node.setAttribute('display', active ? 'inline' : 'none');
                    if (active) {
                        if (matched) {
                            node.setAttribute('data-head-turn-view', side);
                            const yaw = base.startsWith('side-') ? (base.endsWith('left')?-1:1)*(3-Math.max(0,Math.min(3,state.frontHeadYaw))) : rearThreeQuarter ? (base.endsWith('left') ? -1 : 1) * (1 + Math.max(-1, Math.min(1, state.frontHeadYaw))) : threeQuarter ? (base.endsWith('left') ? -1 : 1) * (1 - amount) : state.frontHeadYaw;
                            const numeric = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
                            for (const element of node.querySelectorAll('*')) {
                                // Expression transforms are reapplied to the newly interpolated
                                // geometry, never accumulated from the previous rendered frame.
                                for (const attr of [...element.attributes]) if (attr.name.startsWith('data-svg-african-runtime-')) element.removeAttribute(attr.name);
                                const encoded = element.getAttribute('data-head-turn-geometry');
                                if (!encoded) continue;
                                const geometry = JSON.parse(encoded);
                                for (const [name, values] of Object.entries(geometry)) {
                                    const limit = (values.length-1)/2;
                                    const position = Math.max(-limit, Math.min(limit, yaw)) + limit;
                                    const segment = Math.min(values.length - 2, Math.floor(position)), weight = position - segment;
                                    const a = values[segment].match(numeric)?.map(Number) || [], b = values[segment + 1].match(numeric)?.map(Number) || [];
                                    let index = 0;
                                    element.setAttribute(name, values[segment].replace(numeric, () => { const value = a[index] + (b[index] - a[index]) * weight; index++; return String(Math.round(value * 10000) / 10000); }));
                                }
                            }
                            node.setAttribute('data-head-turn-yaw', yaw);
                            node.querySelector('[data-svg-african-yaw-degrees]')?.setAttribute('data-svg-african-yaw-degrees', String(Math.abs(yaw)<=2?yaw*28:Math.sign(yaw)*(56+(Math.abs(yaw)-2)*34)));
                        }
                        const width = Number(root.getAttribute('width')) || 94;
                        const scale = matched ? 1 : side === base ? 1 - amount * .12 : .94 + (amount - .5) * .12;
                        node.setAttribute('transform', `translate(${width / 2} 0) scale(${scale} 1) translate(${-width / 2} 0)`);
                        applyState(node, base.startsWith('back') ? { ...state, blink, rearFaceReveal: 0, headTurn: 0 } : { ...state, blink });
                        for (const mouth of node.querySelectorAll('[data-shoulder-mouth]')) {
                            const opening = state.mouthOpen * 2;
                            const y = Number(mouth.getAttribute('data-mouth-y') || 88);
                            const width = Number(mouth.getAttribute('data-mouth-width') || 4);
                            const x = Number(mouth.getAttribute('data-mouth-x') || 97);
                            mouth.setAttribute('d', `M${x} ${y} Q${x+2} ${y-opening*.3} ${x+width} ${y+1} Q${x+2} ${y+1+opening} ${x} ${y} Z`);
                        }
                        for (const eye of node.querySelectorAll('[data-shoulder-eye]')) {
                            const x = Number(eye.getAttribute('data-eye-x') || 94);
                            eye.setAttribute('transform', `translate(${x} 70.5) scale(1 ${Math.max(.04, 1-state.blink)}) translate(${-x} -70.5)`);
                            const pupil = eye.querySelector('[data-shoulder-pupil]');
                            const direction = Number(eye.closest('[data-shoulder-profile]')?.getAttribute('data-shoulder-profile')) || 1;
                            pupil?.setAttribute('transform', `translate(${Math.max(-.6,Math.min(.6,state.gazeX*.15*direction))} ${Math.max(-.4,Math.min(.4,state.gazeY*.1))})`);
                        }
                    }
                }
                root.setAttribute('data-active-head-view', side);
                return { ...state, view: base, faceApplied: base === 'front' || threeQuarter || base.startsWith('side-') };
            }
            const view = detectView(root);
            const origin = getOriginState(root);
            const state = normalizeState(root.getAttribute('data-realistic-face') === 'true'
                ? {mouthOpen:0,...requestedState} : requestedState);
            const headMotionApplied = applyHeadMotion(root, view, state);
            const attentionApplied = applyAttention(root, state);
            let faceApplied = false;
            if (root.getAttribute('data-photo-face') === 'v1') faceApplied = applyPhotoFace(root, state);
            else if (view.startsWith('side-')) {
                const face = queryById(root, 'side-face');
                if (root.getAttribute('data-side-head-turn') === 'true' && face) {
                    if (!face.hasAttribute('data-side-turn-original')) face.setAttribute('data-side-turn-original', face.getAttribute('d'));
                    face.setAttribute('d', face.getAttribute('data-side-turn-original'));
                }
                faceApplied = applySideFace(root, origin, state);
                if (root.getAttribute('data-side-head-turn') === 'true') applySideHeadTurn(root, state);
            }
            else if (view.startsWith('back-3q-')) faceApplied = applyBackThreeQuarterFace(root, view, origin, state);
            else if (view.startsWith('front-3q-') && root.getAttribute('data-svg-african-projection') === 'authored-3q') {
                faceApplied = applyDrawnThreeQuarterFace(root, view, origin, state);
            } else if (view !== 'back') faceApplied = applyFrontFace(root, origin, state);
            if(root.getAttribute('data-photo-face')!=='v1')clipTeeth(root);
            root.setAttribute('data-svg-african-runtime-state', encodeURIComponent(JSON.stringify(state)));
            return { ...state, view, faceApplied, headMotionApplied, attentionApplied };
        }

        function getStandaloneSource() {
            return `(function(g){g.SvgAfricanFaceRuntime=(${createSvgAfricanFaceRuntime.toString()})();})(window);`;
        }

        return Object.freeze({
            version: 10,
            defaultState: DEFAULT_STATE,
            normalizeState,
            detectView,
            applyState,
            getStandaloneSource
        });
    }

    const api = createSvgAfricanFaceRuntime();
    global.SvgAfricanFaceRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
