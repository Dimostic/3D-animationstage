/* Photo likeness and raster-free reconstruction on the existing SVG armature. */
(function () {
    'use strict';
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const png = value => typeof value === 'string' && value.length < 3e6 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value) ? value : '';
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const num = n => Number(n.toFixed(3));
    const fittingControls = Object.freeze({
        irisSize: { label: 'Iris size', min: .6, max: 1.4, defaultValue: 1 },
        frameWidth: { label: 'Frame width', min: .8, max: 1.2, defaultValue: 1 },
        frameHeight: { label: 'Frame height', min: .75, max: 1.4, defaultValue: 1 },
        frameY: { label: 'Frame vertical offset', min: -4, max: 4, defaultValue: 0 },
    });
    function normalizeFitting(value = {}) {
        return { ...Object.fromEntries(Object.entries(fittingControls).map(([key, range]) => [key,
            Number.isFinite(value?.[key]) ? clamp(value[key], range.min, range.max) : range.defaultValue])),
            irisColor: /^#[a-f0-9]{6}$/i.test(value?.irisColor || '') ? value.irisColor : '#4b3425' };
    }

    const vectorControls = Object.freeze({
        faceWidth: { label: 'Face width', min: .85, max: 1.15, defaultValue: 1 },
        jawWidth: { label: 'Jaw width', min: .65, max: 1.15, defaultValue: .88 },
        eyeWidth: { label: 'Eye width', min: .7, max: 1.3, defaultValue: 1 },
        eyeHeight: { label: 'Eye height', min: .65, max: 1.5, defaultValue: 1 },
        eyeSpacing: { label: 'Eye spacing', min: .8, max: 1.2, defaultValue: 1 },
        browHeight: { label: 'Brow height', min: -3, max: 3, defaultValue: 0 },
        mouthWidth: { label: 'Mouth width', min: .7, max: 1.3, defaultValue: 1 },
        mouthY: { label: 'Mouth vertical offset', min: -4, max: 4, defaultValue: 0 },
        lipFullness: { label: 'Lip fullness', min: .5, max: 1.8, defaultValue: 1 },
        noseWidth: { label: 'Nose width', min: .65, max: 1.4, defaultValue: 1 },
        noseLength: { label: 'Nose length', min: .7, max: 1.3, defaultValue: 1 },
        earSize: { label: 'Ear size', min: .6, max: 1.4, defaultValue: 1 },
        hairline: { label: 'Hairline height', min: -6, max: 6, defaultValue: 0 },
        hairVolume: { label: 'Hair volume', min: .7, max: 1.4, defaultValue: 1 },
        cheekWidth: { label: 'Cheek width', min: .8, max: 1.2, defaultValue: 1 },
        chinLength: { label: 'Chin length', min: -4, max: 4, defaultValue: 0 },
        profileDepth: { label: 'Profile depth', min: .8, max: 1.2, defaultValue: 1 },
        browThickness: { label: 'Brow thickness', min: .5, max: 1.8, defaultValue: 1 }
    });
    const hairStyles = Object.freeze(['short', 'long', 'bob', 'curly', 'braids', 'ponytail', 'bald']);
    const facialHairStyles = Object.freeze(['none', 'moustache', 'short-beard', 'full-beard']);
    const headwearStyles = Object.freeze(['none', 'cap', 'wrap', 'mortarboard', 'hardhat', 'chef', 'yoruba-fila', 'hausa-embroidered-cap', 'igbo-red-cap', 'turban', 'niger-delta-bowler', 'fedora', 'wide-brim-hat', 'bucket-hat', 'beanie', 'top-hat', 'pilot-cap', 'security-cap', 'military-beret']);
    const headwearLabels = Object.freeze({ none: 'None', cap: 'Baseball cap', wrap: 'Wrapped gele', mortarboard: 'Academic mortarboard', hardhat: 'Construction helmet', chef: 'Chef hat', 'yoruba-fila': 'Yoruba fila', 'hausa-embroidered-cap': 'Hausa embroidered cap', 'igbo-red-cap': 'Igbo red cap', turban: 'Turban', 'niger-delta-bowler': 'Niger Delta bowler', fedora: 'Fedora', 'wide-brim-hat': 'Wide-brim hat', 'bucket-hat': 'Bucket hat', beanie: 'Beanie', 'top-hat': 'Top hat', 'pilot-cap': 'Pilot cap', 'security-cap': 'Security cap', 'military-beret': 'Military beret' });
    const headwearColors = Object.freeze({ ...Object.fromEntries(headwearStyles.map(style => [style, '#354355'])), chef: '#f4f5f2', hardhat: '#edba38', 'igbo-red-cap': '#ae2535', 'military-beret': '#395746' });
    const catalogHair = Object.freeze({ short: 'low-cut', long: 'long-straight', bob: 'bob', curly: 'afro', braids: 'braids', ponytail: 'ponytail', bald: 'bald' });
    const catalogHeadwear = Object.freeze({ ...Object.fromEntries(headwearStyles.map(style => [style, style])), none: 'none', cap: 'baseball-cap', wrap: 'wrapped-gele', mortarboard: 'academic-cap', hardhat: 'construction-helmet', chef: 'chef-hat' });
    const textureParts = Object.freeze(['right-arm', 'left-arm', 'right-leg', 'left-leg']);
    const vectorParts = Object.freeze(['torso', ...textureParts]);
    function normalizeLayers(value) {
        const result = {};
        for (const part of vectorParts) {
            if (!Array.isArray(value?.[part]) || value[part].length > 48) continue;
            const shapes = value[part].map(shape => {
                if (!/^#[a-f0-9]{6}$/i.test(shape?.fill || '') || !Array.isArray(shape.points)
                    || shape.points.length < 3 || shape.points.length > 700
                    || !shape.points.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))) return null;
                return { fill: shape.fill.toLowerCase(), points: shape.points.map(p => ({
                    x: num(clamp(p.x, 0, 100)), y: num(clamp(p.y, 0, 100)) })) };
            }).filter(Boolean);
            if (shapes.length) result[part] = shapes;
        }
        return result;
    }
    const points = (value, max = 32) => Array.isArray(value) && value.length >= 3 && value.length <= max
        && value.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
        ? value.map(p => ({ x: num(clamp(p.x, 0, 100)), y: num(clamp(p.y, 0, 150)) })) : [];
    const color = (value, fallback) => /^#[a-f0-9]{6}$/i.test(value || '') ? value : fallback;
    function normalizeVector(value) {
        if (!value || !['left', 'right', 'top', 'bottom', 'noseX', 'noseY'].every(k => Number.isFinite(value[k]))) return null;
        return {
            left: clamp(value.left, 10, 40), right: clamp(value.right, 60, 90),
            top: clamp(value.top, 25, 65), bottom: clamp(value.bottom, 100, 132),
            noseX: clamp(value.noseX, 35, 65), noseY: clamp(value.noseY, 65, 115),
            hairStyle: hairStyles.includes(value.hairStyle) ? value.hairStyle : 'short',
            suggestedHair: hairStyles.includes(value.suggestedHair) ? value.suggestedHair : null,
            facialHair: facialHairStyles.includes(value.facialHair) ? value.facialHair : 'none',
            headwear: headwearStyles.includes(value.headwear) ? value.headwear : 'none',
            headwearColor: color(value.headwearColor, '#354355'),
            viewMode: value.viewMode === 'matched' ? 'matched' : 'catalog',
            jawContour: points(value.jawContour), hairContour: points(value.hairContour),
            hairColor: color(value.hairColor, '#29201b'), lipColor: color(value.lipColor, '#975c58'),
            ...Object.fromEntries(Object.entries(vectorControls).map(([key, range]) => [key,
                Number.isFinite(value[key]) ? clamp(value[key], range.min, range.max) : range.defaultValue]))
        };
    }

    function fitVectorFeatures(data) {
        const v = data.vector, features = Object.fromEntries(Object.entries(data.features).map(([key, f]) => [key, { ...f }]));
        const eyes = [features.eyeLeft, features.eyeRight], center = eyes.reduce((n, f) => n + f.x + f.w / 2, 0) / 2;
        const resize = (f, sx, sy, dx = 0, dy = 0) => {
            const x = f.x + f.w / 2 + dx, y = f.y + f.h / 2 + dy;
            f.w *= sx; f.h *= sy; f.x = x - f.w / 2; f.y = y - f.h / 2;
        };
        for (const side of ['Left', 'Right']) {
            const eye = features['eye' + side], dx = (eye.x + eye.w / 2 - center) * (v.eyeSpacing - 1);
            resize(eye, v.eyeWidth, v.eyeHeight, dx);
            resize(features['brow' + side], v.eyeWidth, 1, dx, -v.browHeight);
        }
        for (const key of ['upperLip', 'lowerLip']) resize(features[key], v.mouthWidth, v.lipFullness, 0, v.mouthY);
        return { ...data, features, mouthY: data.mouthY + v.mouthY };
    }

    function clothingAvailability(data) {
        const torso = data?.fullVector ? !!data.vectorLayers?.torso?.length : !!png(data?.torso);
        const limbs = textureParts.some(part => data?.fullVector ? !!data.vectorLayers?.[part]?.length : !!png(data?.textures?.[part]));
        return { editable: true, photo: torso, segments: limbs };
    }

    function normalize(data) {
        if (!data || data.version !== 1 || !/^pc_[a-f0-9]{32}$/.test(data.consentId || '')) return null;
        const vector = data.faceMode === 'vector' ? normalizeVector(data.vector) : null;
        const fullVector = !!vector && data.fullVector === true;
        if (data.faceMode === 'vector' ? !vector : !png(data.head)) return null;
        const features = {};
        for (const key of ['eyeLeft', 'eyeRight', 'browLeft', 'browRight', 'upperLip', 'lowerLip']) {
            const f = data.features?.[key];
            if (!f || !['x', 'y', 'w', 'h'].every(k => Number.isFinite(f[k]))) return null;
            features[key] = { x: clamp(f.x, 0, 100), y: clamp(f.y, 0, 150), w: clamp(f.w, .1, 70), h: clamp(f.h, .1, 35), image: vector ? '' : png(f.image) };
        }
        if (!Number.isFinite(data.mouthY) || !Number.isFinite(data.mouthX)) return null;
        const vectorLayers = fullVector ? normalizeLayers(data.vectorLayers) : {};
        const available = clothingAvailability({ ...data, fullVector, vectorLayers });
        const clothing = ['photo', 'segments'].includes(data.clothing) ? data.clothing : 'editable';
        return {
            version: 1, consentId: data.consentId, sha256: /^[a-f0-9]{64}$/.test(data.sha256 || '') ? data.sha256 : '',
            revision: /^[a-zA-Z0-9-]{1,64}$/.test(data.revision || '') ? data.revision : data.consentId,
            head: vector ? '' : png(data.head), faceMode: vector ? 'vector' : 'hybrid', vector,
            appearance: vector ? null : normalizeVector(data.appearance), features, mouthX: clamp(data.mouthX, 0, 100), mouthY: clamp(data.mouthY, 0, 150),
            skin: /^#[a-f0-9]{6}$/i.test(data.skin || '') ? data.skin : '#a87755',
            glassesMode: ['replace', 'remove'].includes(data.glassesMode) ? data.glassesMode : vector ? 'remove' : 'keep',
            glassesStyle: data.glassesStyle === 'round' ? 'round' : 'rectangular',
            fitting: normalizeFitting(data.fitting),
            fullVector, vectorLayers,
            clothing: available[clothing] ? clothing : clothing === 'segments' && available.photo ? 'photo' : 'editable', torso: fullVector ? '' : png(data.torso),
            textures: fullVector ? {} : Object.fromEntries(textureParts.map(key => [key, png(data.textures?.[key])]).filter(([, value]) => value)),
            measurements: Object.fromEntries(Object.entries(data.measurements || {}).slice(0, 40).filter(([key, value]) => /^[a-zA-Z]+$/.test(key) && Number.isFinite(value) && value > 0 && value < 10000)),
        };
    }

    function appearanceFor(data) {
        if (data.vector || data.appearance) return data.vector || data.appearance;
        const eyes = [data.features.eyeLeft, data.features.eyeRight];
        return normalizeVector({ left: Math.min(...eyes.map(f => f.x)) - 7,
            right: Math.max(...eyes.map(f => f.x + f.w)) + 7,
            top: Math.min(...eyes.map(f => f.y)) - 30, bottom: Math.min(132, data.mouthY + 18),
            noseX: data.mouthX, noseY: data.mouthY - 12 });
    }

    function prepareConfig(config, view) {
        const data = config._photoCharacter;
        const appearance = data?.vector || data?.appearance;
        if (!appearance || view === 'front' || (data.vector && appearance.viewMode === 'matched')) return config;
        return { ...config, identity: { ...config.identity, hair: catalogHair[appearance.hairStyle] || 'low-cut' },
            styling: { ...config.styling, headwear: catalogHeadwear[appearance.headwear] || 'none',
                colorOverrides: { ...config.styling?.colorOverrides, headwear: appearance.headwearColor } },
            premiumAdjustments: { ...config.premiumAdjustments, hairVolume: clamp(appearance.hairVolume - 1, -.35, .42) } };
    }

    function suggestHair(photo, a, mask) {
        const { width: w, height: h, data } = photo.data;
        const fw = Math.abs(a.faceLeft.x - a.faceRight.x) * w, fh = (a.chin.y - a.crown.y) * h;
        const cx = (a.faceLeft.x + a.faceRight.x) * w / 2, crown = a.crown.y * h;
        const skin = sampleColor(photo, cx, (a.nose?.y || a.chin.y - .02) * h, 2, '#a87755');
        const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        const skinRgb = rgb(skin), distance = (p, q) => Math.hypot(...p.map((n, i) => n - q[i]));
        const foreground = (x, y) => data[(y * w + x) * 4 + 3] > 200 && (photo.cutout || (mask?.values && mask.values[Math.min(mask.height - 1, Math.floor(y / h * mask.height)) * mask.width + Math.min(mask.width - 1, Math.floor(x / w * mask.width))] > .75));
        const step = Math.max(1, Math.round(fw / 70)), bins = new Map();
        for (let y = Math.max(0, Math.round(crown - fh * .45)); y < crown; y += step) {
            for (let x = Math.max(0, Math.round(cx - fw * .3)); x < Math.min(w, cx + fw * .3); x += step) {
                if (!foreground(x, y)) continue;
                const pixel = [...data.slice((y * w + x) * 4, (y * w + x) * 4 + 3)];
                if (distance(pixel, skinRgb) < 50) continue;
                const key = pixel.map(n => Math.floor(n / 32)).join(',');
                const bin = bins.get(key) || { count: 0, sum: [0, 0, 0] };
                bin.count++; pixel.forEach((n, i) => bin.sum[i] += n); bins.set(key, bin);
            }
        }
        const dominant = [...bins.values()].sort((a, b) => b.count - a.count)[0];
        if (!dominant || dominant.count < 12) return { suggestedHair: null, hairStyle: 'short', hairColor: '#29201b' };
        const tone = dominant.sum.map(n => Math.round(n / dominant.count));
        let minX = cx, maxX = cx, minY = crown, maxY = crown, count = 0;
        const x0 = Math.max(0, Math.round(cx - fw)), y0 = Math.max(0, Math.round(crown - fh * .6));
        const columns = Math.ceil((Math.min(w, cx + fw) - x0) / step);
        const rows = Math.ceil((Math.min(h, a.chin.y * h + fh * .7) - y0) / step);
        const candidates = new Uint8Array(columns * rows), queue = [];
        // Grow only from crown pixels: disconnected dark clothing is not hair.
        for (let row = 0; row < rows; row++) {
            const y = y0 + row * step;
            for (let col = 0; col < columns; col++) {
                const x = x0 + col * step;
                if (y > crown && Math.abs(x - cx) < fw * .48) continue;
                if (!foreground(x, y)) continue;
                const pixel = [...data.slice((y * w + x) * 4, (y * w + x) * 4 + 3)];
                if (distance(pixel, tone) > 65 || distance(pixel, skinRgb) < 40) continue;
                const i = row * columns + col;
                candidates[i] = 1;
                if (y < crown && Math.abs(x - cx) < fw * .3) { candidates[i] = 2; queue.push(i); }
            }
        }
        for (let q = 0; q < queue.length; q++) {
            const i = queue[q], row = Math.floor(i / columns), col = i % columns, x = x0 + col * step, y = y0 + row * step;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                const nx = col + dx, ny = row + dy, next = ny * columns + nx;
                if (nx >= 0 && nx < columns && ny >= 0 && ny < rows && candidates[next] === 1) { candidates[next] = 2; queue.push(next); }
            }
        }
        const suggestedHair = count < 20 ? null : maxY > a.chin.y * h + fh * .18 ? 'long'
            : maxY > crown + fh * .7 ? 'bob' : maxX - minX > fw * 1.18 && crown - minY > fh * .3 ? 'curly' : 'short';
        return { suggestedHair, hairStyle: suggestedHair || 'short', hairColor: '#' + tone.map(n => n.toString(16).padStart(2, '0')).join('') };
    }

    function measure(photo, a, mask) {
        const w = photo.width, h = photo.height;
        const distance = (p, q) => p && q ? Math.hypot((p.x - q.x) * w, (p.y - q.y) * h) : null;
        const midpoint = (p, q) => p && q ? { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } : null;
        const m = {};
        const put = (key, v) => { if (Number.isFinite(v) && v > 0) m[key] = num(v); };
        put('torsoWidth', distance(a.shoulderLeft, a.shoulderRight));
        put('torsoHeight', distance(midpoint(a.shoulderLeft, a.shoulderRight), midpoint(a.hipLeft, a.hipRight)));
        put('hipWidth', distance(a.hipLeft, a.hipRight));
        // Widths are silhouette cross-sections, not guessed from the bone length.
        const widthAt = (p, q) => {
            if (!mask?.values || !p || !q) return null;
            const mid = midpoint(p, q), dx = (q.x - p.x) * w, dy = (q.y - p.y) * h, length = Math.hypot(dx, dy);
            if (!length) return null;
            const sample = t => {
                const x = Math.round((mid.x + t * dy / length / w) * (mask.width - 1));
                const y = Math.round((mid.y - t * dx / length / h) * (mask.height - 1));
                return x >= 0 && y >= 0 && x < mask.width && y < mask.height && mask.values[y * mask.width + x] > .6;
            };
            if (!sample(0)) return null;
            let left = 0, right = 0, max = Math.min(w * .18, length * .65);
            while (left < max && sample(-left)) left++;
            while (right < max && sample(right)) right++;
            return left < max && right < max ? left + right : null;
        };
        for (const side of ['Left', 'Right']) {
            put('hand' + side + 'Length', distance(a['wrist' + side], a['finger' + side]));
            put('hand' + side + 'Width', distance(a['pinky' + side], a['thumb' + side]));
            for (const [name, start, end] of [['upperArm', 'shoulder', 'elbow'], ['lowerArm', 'elbow', 'wrist'], ['thigh', 'hip', 'knee'], ['lowerLeg', 'knee', 'ankle'], ['foot', 'heel', 'toe']]) {
                put(name + side + 'Length', distance(a[start + side], a[end + side]));
                put(name + side + 'Width', widthAt(a[start + side], a[end + side]));
            }
        }
        return m;
    }

    function assess(photo, a, analysis) {
        const result = (status, code, message, extra = {}) => ({ status, code, message, ...extra });
        if (!photo || !analysis) return result('unchecked', 'unchecked', 'Photo not checked. Analyze the photo before reconstruction.');
        if (!analysis.faces?.length) return result('blocked', 'no-face', 'No face detected. Use a clearer photo with both eyes visible, or crop to the intended person and analyze again.');
        if (analysis.faces.length !== 1) return result('blocked', 'multiple-faces', 'Multiple faces detected. Crop to one person and analyze again.');
        const required = ['faceLeft', 'faceRight', 'crown', 'chin', 'eyeLeft', 'eyeRight', 'eyeLeftInner', 'eyeRightInner', 'upperLip', 'lowerLip', 'mouthLeft', 'mouthRight'];
        if (required.some(key => !Number.isFinite(a?.[key]?.x) || !Number.isFinite(a?.[key]?.y))) return result('blocked', 'incomplete', 'Face landmarks are incomplete. Analyze the cropped photo again.');
        const w = photo.canvas.width, h = photo.canvas.height;
        // Quality uses detected pixels, not the enlarged inference crop or manually widened guides.
        const face = analysis.faces[0], left = face[454] || a.faceLeft, right = face[234] || a.faceRight;
        const crown = face[10] || a.crown, chin = face[152] || a.chin;
        const faceWidth = Math.abs(left.x - right.x) * w, faceHeight = (chin.y - crown.y) * h;
        const metrics = { faceWidth: Math.round(faceWidth), faceHeight: Math.round(faceHeight), focused: analysis.faceDetection === 'focused-head' };
        if (faceWidth < 20 || faceHeight < 25) return result('blocked', 'too-small', 'The face has too few source pixels for editable facial parts. Use the original higher-resolution photo; enlargement cannot restore missing detail.', metrics);
        const center = (a.faceLeft.x + a.faceRight.x) / 2, width = Math.abs(a.faceLeft.x - a.faceRight.x) * w;
        if (width < 20 || (a.chin.y - a.crown.y) * h < 25) return result('blocked', 'guide-fit', 'Face guides are too small. Restore the detected landmarks or use a higher-resolution photo.', metrics);
        if (a.nose && Math.abs(a.nose.x - center) * w > width * .23) return result('blocked', 'turned', 'The face is turned too far sideways. Use a photo showing both eyes and the front of the face.', metrics);
        const angle = Math.atan2(Math.abs(a.eyeLeft.y - a.eyeRight.y) * h, Math.abs(a.eyeLeft.x - a.eyeRight.x) * w) * 180 / Math.PI;
        const warnings = [];
        if (faceWidth < 64 || faceHeight < 80) warnings.push('Limited facial detail. A higher-resolution original is recommended; enlargement cannot recover missing detail.');
        if (angle > 12) warnings.push('The head is tilted. Facial alignment may need correction; a straighter photo is recommended.');
        if (!analysis.pose?.length) warnings.push('Body landmarks were not detected. Body proportions will need review.');
        return result(warnings.length ? 'warning' : 'ready', warnings.length ? 'limited' : 'ready', warnings.length ? warnings.join(' ') : 'Ready for reconstruction.', metrics);
    }

    function sampleColor(photo, x, y, radius, fallback) {
        const { width, height, data } = photo.data, channels = [[], [], []];
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
            const px = Math.round(x + dx), py = Math.round(y + dy);
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            const i = (py * width + px) * 4;
            if (data[i + 3] < 220) continue;
            channels.forEach((list, c) => list.push(data[i + c]));
        }
        if (!channels[0].length) return fallback;
        return '#' + channels.map(list => list.sort((a, b) => a - b)[Math.floor(list.length / 2)].toString(16).padStart(2, '0')).join('');
    }

    function extractLimbTextures(photo, a, measurements) {
        const result = {}, source = photo.data, w = source.width, h = source.height;
        const inTorso = p => p && a.shoulderLeft && a.shoulderRight && a.hipLeft && a.hipRight
            && p.x > Math.min(a.shoulderLeft.x, a.shoulderRight.x) && p.x < Math.max(a.shoulderLeft.x, a.shoulderRight.x)
            && p.y > Math.min(a.shoulderLeft.y, a.shoulderRight.y) && p.y < Math.max(a.hipLeft.y, a.hipRight.y);
        for (const side of ['Left', 'Right']) for (const limb of ['arm', 'leg']) {
            const names = limb === 'arm' ? ['shoulder', 'elbow', 'wrist', 'finger'] : ['hip', 'knee', 'ankle', 'toe'];
            const anchors = names.map(name => a[name + side]);
            if (anchors.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;
            if (limb === 'arm' && (inTorso(anchors[1]) || inTorso(anchors[2]))) continue;
            const widths = (limb === 'arm' ? ['upperArm', 'lowerArm', 'hand'] : ['thigh', 'lowerLeg', 'foot']).map(name => measurements[name + side + 'Width']);
            if (!widths.slice(0, 2).every(value => Number.isFinite(value) && value >= 4)) continue;
            widths[2] ||= widths[1];
            const pts = anchors.map(p => ({ x: p.x * w, y: p.y * h }));
            const lengths = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
            if (lengths.some(length => length < 2)) continue;
            const c = canvas(96, 384), ctx = c.getContext('2d'), image = ctx.createImageData(c.width, c.height);
            // Unroll each visible limb along its measured bones. The output stays
            // a texture clipped by the SVG silhouette, not a new guessed mesh.
            const breaks = limb === 'arm' ? [0, .46, .86, 1] : [0, .48, .90, 1];
            let solid = 0;
            for (let y = 0; y < c.height; y++) {
                const t = y / (c.height - 1), segment = t < breaks[1] ? 0 : t < breaks[2] ? 1 : 2;
                const u = (t - breaks[segment]) / (breaks[segment + 1] - breaks[segment]);
                const p = pts[segment], q = pts[segment + 1], length = lengths[segment];
                const dx = (q.x - p.x) / length, dy = (q.y - p.y) / length;
                for (let x = 0; x < c.width; x++) {
                    const across = (x / (c.width - 1) - .5) * widths[segment] * .92;
                    const sx = Math.round(p.x + (q.x - p.x) * u + dy * across), sy = Math.round(p.y + (q.y - p.y) * u - dx * across);
                    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
                    const i = (sy * w + sx) * 4, j = (y * c.width + x) * 4;
                    image.data.set(source.data.subarray(i, i + 4), j);
                    if (source.data[i + 3] > 220) solid++;
                }
            }
            if (solid < c.width * c.height * .8) continue;
            ctx.putImageData(image, 0, 0);
            result[`${side.toLowerCase()}-${limb}`] = c.toDataURL('image/png');
        }
        return result;
    }

    function build(photo, a, analysis, receipt, clothing = 'editable', glassesMode = 'keep', faceMode = 'hybrid') {
        glassesMode = ['replace', 'remove'].includes(glassesMode) ? glassesMode : 'keep';
        if (!receipt?.id) throw new Error('Record photo consent first.');
        const readiness = assess(photo, a, analysis);
        if (readiness.status === 'unchecked' || readiness.status === 'blocked') throw new Error(readiness.message);
        const source = photo.canvas, w = source.width, h = source.height;
        const faceW = Math.abs(a.faceLeft.x - a.faceRight.x) * w;
        const faceH = (a.chin.y - a.crown.y) * h;
        if (faceW < 20 || faceH < 25) throw new Error('Face guides are too small. Restore the detected landmarks or use a higher-resolution photo.');
        const center = (a.faceLeft.x + a.faceRight.x) / 2;
        const left = clamp(center * w - faceW * .68, 0, w - 1);
        const top = clamp(a.crown.y * h - faceH * .48, 0, h - 1);
        const right = clamp(center * w + faceW * .68, left + 1, w);
        const bottom = clamp(a.chin.y * h + faceH * .06, top + 1, h);
        const scale = Math.min(90 / (right - left), 114 / (bottom - top));
        const offsetX = (100 - (right - left) * scale) / 2, offsetY = 130 - (bottom - top) * scale;
        const point = p => ({ x: offsetX + (p.x * w - left) * scale, y: offsetY + (p.y * h - top) * scale });
        const skinPoint = { x: center * w, y: (a.nose?.y || a.chin.y - .02) * h };
        const pixels = photo.data;
        const at = (clamp(Math.round(skinPoint.y), 0, h - 1) * w + clamp(Math.round(skinPoint.x), 0, w - 1)) * 4;
        const skin = '#' + [...pixels.data.slice(at, at + 3)].map(v => v.toString(16).padStart(2, '0')).join('');
        const base = canvas(400, 680), ctx = base.getContext('2d', { willReadFrequently: true });
        ctx.scale(4, 4);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.moveTo(37, 101); ctx.lineTo(35, 166); ctx.quadraticCurveTo(50, 172, 65, 166); ctx.lineTo(63, 101); ctx.fill();
        ctx.save();
        // Keep the hair/ears, but stop the photo at the jaw rather than importing
        // a shirt collar into the head. Remap the detected jaw to reviewed guides.
        const face = analysis.faces[0];
        const jawIndices = [132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361];
        const valid = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
        let jaw = null;
        if ([10, 152, 234, 454, ...jawIndices].every(i => valid(face[i]))) {
            const fw = face[454].x - face[234].x, fh = face[152].y - face[10].y;
            if (fw > .001 && fh > .001) jaw = jawIndices.map(i => point({
                x: a.faceRight.x + (face[i].x - face[234].x) / fw * (a.faceLeft.x - a.faceRight.x),
                y: a.crown.y + (face[i].y - face[10].y) / fh * (a.chin.y - a.crown.y)
            }));
        }
        const chin = point(a.chin), l = point(a.faceRight), r = point(a.faceLeft);
        ctx.beginPath(); ctx.moveTo(offsetX, offsetY); ctx.lineTo(100 - offsetX, offsetY);
        if (jaw) {
            ctx.lineTo(100 - offsetX, jaw[jaw.length - 1].y);
            for (let i = jaw.length - 1; i >= 0; i--) ctx.lineTo(jaw[i].x, jaw[i].y);
            ctx.lineTo(offsetX, jaw[0].y);
        } else {
            const y = Math.max(l.y, r.y) + (chin.y - Math.max(l.y, r.y)) * .3;
            ctx.lineTo(100 - offsetX, y); ctx.lineTo(r.x, y);
            ctx.bezierCurveTo(r.x, chin.y - 4, chin.x + 8, chin.y, chin.x, chin.y);
            ctx.bezierCurveTo(chin.x - 8, chin.y, l.x, chin.y - 4, l.x, y);
            ctx.lineTo(offsetX, y);
        }
        ctx.closePath(); ctx.clip();
        ctx.drawImage(source, left, top, right - left, bottom - top, offsetX, offsetY, (right - left) * scale, (bottom - top) * scale);
        ctx.restore();
        const features = {};
        // Clone lips/brows before clearing their old position. Feathered nearby
        // skin patches prevent duplicated features when these layers move.
        const feature = (key, x, y, width, height, textured = true) => {
            x = clamp(x, .5, 99); y = clamp(y, .5, 149);
            width = Math.min(width, 100 - x); height = Math.min(height, 150 - y);
            const c = canvas(width * 8, height * 8), cc = c.getContext('2d');
            cc.drawImage(base, x * 4, y * 4, width * 4, height * 4, 0, 0, c.width, c.height);
            features[key] = { x: num(x), y: num(y), w: num(width), h: num(height), image: textured ? c.toDataURL('image/png') : '' };
        };
        for (const side of ['Left', 'Right']) {
            const outer = point(a['eye' + side]), inner = point(a['eye' + side + 'Inner']);
            const width = Math.abs(outer.x - inner.x), x = Math.min(outer.x, inner.x), y = (outer.y + inner.y) / 2;
            const eyeTop = a['eyeTop' + side] ? point(a['eyeTop' + side]).y : y - width * .15;
            const eyeBottom = a['eyeBottom' + side] ? point(a['eyeBottom' + side]).y : y + width * .15;
            feature('eye' + side, x - .5, eyeTop - .4, width + 1, Math.max(1.4, eyeBottom - eyeTop + .8), false);
            const brow = a['brow' + side] ? point(a['brow' + side]) : { x: x + width / 2, y: y - width * .5 };
            feature('brow' + side, x - 1, brow.y - 1.5, width + 2, 3.8, glassesMode === 'keep');
        }
        const ml = point(a.mouthLeft), mr = point(a.mouthRight), upper = point(a.upperLip), lower = point(a.lowerLip);
        const mouthX = (ml.x + mr.x) / 2, mouthY = (upper.y + lower.y) / 2;
        const mouthW = Math.abs(ml.x - mr.x) + 2;
        const upperY = a.upperLipOuter ? point(a.upperLipOuter).y - .8 : mouthY - 2.5;
        const lowerY = a.lowerLipOuter ? point(a.lowerLipOuter).y + .8 : mouthY + 3;
        feature('upperLip', mouthX - mouthW / 2, upperY, mouthW, Math.max(.8, upper.y - upperY));
        feature('lowerLip', mouthX - mouthW / 2, lower.y, mouthW, Math.max(.8, lowerY - lower.y));
        if (glassesMode !== 'keep') {
            // Repair the complete frame/bridge band, not just the eye holes.
            // Hidden skin is approximated from adjacent rows; eyes and brows are
            // redrawn independently so photographed frames cannot blink with them.
            const l = Math.min(point(a.faceLeft).x, point(a.faceRight).x) + .5;
            const r = Math.max(point(a.faceLeft).x, point(a.faceRight).x) - .5;
            const t = Math.max(offsetY, Math.min(features.browLeft.y, features.browRight.y) - 3);
            const b = Math.min(mouthY - 5, Math.max(features.eyeLeft.y + features.eyeLeft.h, features.eyeRight.y + features.eyeRight.h) + Math.max(7, features.eyeLeft.w * .75, features.eyeRight.w * .75));
            if (b <= t + 1 || r <= l + 1) throw new Error('Review eye, eyebrow and mouth landmarks before removing glasses.');
            const repair = canvas((r - l) * 4, (b - t) * 4), rc = repair.getContext('2d');
            const fallback = [1, 3, 5].map(i => parseInt(skin.slice(i, i + 2), 16));
            const sample = (x, y) => {
                const p = ctx.getImageData(clamp(Math.round(x * 4), 0, base.width - 1), clamp(Math.round(y * 4), 0, base.height - 1), 1, 1).data;
                const light = p[0] + p[1] + p[2], skinLight = fallback.reduce((sum, n) => sum + n, 0);
                return p[3] < 200 || light < skinLight * .55 ? fallback : [p[0], p[1], p[2]];
            };
            for (let x = 0; x < repair.width; x++) {
                const sx = l + x / 4, gradient = rc.createLinearGradient(0, 0, 0, repair.height);
                gradient.addColorStop(0, 'rgb(' + sample(sx, t - 1).join(',') + ')');
                gradient.addColorStop(1, 'rgb(' + sample(sx, b + 1).join(',') + ')');
                rc.fillStyle = gradient; rc.fillRect(x, 0, 1, repair.height);
            }
            const mask = canvas(repair.width, repair.height), mc = mask.getContext('2d');
            mc.filter = 'blur(2px)'; mc.fillStyle = 'white'; mc.fillRect(2, 2, mask.width - 4, mask.height - 4);
            rc.globalCompositeOperation = 'destination-in'; rc.drawImage(mask, 0, 0);
            ctx.drawImage(repair, l, t, r - l, b - t);
        }
        const patchRegions = { ...features, mouth: { x: mouthX - mouthW / 2, y: upperY, w: mouthW, h: lowerY - upperY } };
        for (const [key, f] of Object.entries(patchRegions)) {
            if (key === 'upperLip' || key === 'lowerLip') continue;
            const pad = key.startsWith('eye') ? .7 : 1;
            const patch = canvas((f.w + pad * 2) * 4, (f.h + pad * 2) * 4), pc = patch.getContext('2d');
            for (let row = 0; row < patch.height; row++) {
                const sy = clamp(Math.round((f.y - pad) * 4 + row), 0, base.height - 1);
                const rgb = sx => {
                    const v = ctx.getImageData(clamp(Math.round(sx * 4), 0, base.width - 1), sy, 1, 1).data;
                    return `rgb(${v[0]},${v[1]},${v[2]})`;
                };
                const gradient = pc.createLinearGradient(0, 0, patch.width, 0);
                gradient.addColorStop(0, rgb(f.x - 2)); gradient.addColorStop(1, rgb(f.x + f.w + 2));
                pc.fillStyle = gradient; pc.fillRect(0, row, patch.width, 1);
            }
            pc.globalCompositeOperation = 'destination-in';
            const mask = canvas(patch.width, patch.height), mc = mask.getContext('2d');
            mc.filter = 'blur(2px)'; mc.fillStyle = 'white'; mc.fillRect(2, 2, mask.width - 4, mask.height - 4);
            pc.drawImage(mask, 0, 0);
            ctx.drawImage(patch, f.x - pad, f.y - pad, f.w + pad * 2, f.h + pad * 2);
        }
        features.upperLip.y = num(mouthY - features.upperLip.h);
        features.lowerLip.y = num(mouthY);
        let vector = null;
        let appearance;
        {
            const nose = point(a.nose || { x: center, y: (a.upperLip.y + a.eyeLeft.y) / 2 });
            const leftPoint = point(a.faceRight), rightPoint = point(a.faceLeft);
            appearance = { left: Math.min(leftPoint.x, rightPoint.x), right: Math.max(leftPoint.x, rightPoint.x),
                top: point(a.crown).y, bottom: point(a.chin).y, noseX: nose.x, noseY: nose.y,
                jawContour: jaw || [], viewMode: 'matched',
                ...suggestHair(photo, a, analysis.mask),
                lipColor: sampleColor(photo, center * w, (a.lowerLipOuter?.y || a.lowerLip.y) * h, 1, '#975c58') };
            if (photo.cutout) {
                const silhouette = [];
                for (let i = 0; i <= 20; i++) {
                    const x = Math.round(left + (right - left) * i / 20);
                    for (let y = Math.round(top); y < a.crown.y * h; y++) {
                        if (x >= w || photo.data.data[(y * w + x) * 4 + 3] < 220) continue;
                        silhouette.push(point({ x: x / w, y: y / h })); break;
                    }
                }
                if (silhouette.length >= 9) appearance.hairContour = silhouette;
            }
            if (faceMode === 'vector') vector = appearance;
        }
        let torso = '';
        if (a.shoulderLeft && a.shoulderRight && a.hipLeft && a.hipRight) {
            const x = Math.min(a.shoulderLeft.x, a.shoulderRight.x) * w;
            const y = Math.min(a.shoulderLeft.y, a.shoulderRight.y) * h;
            const tw = Math.abs(a.shoulderLeft.x - a.shoulderRight.x) * w;
            const th = (Math.max(a.hipLeft.y, a.hipRight.y) * h) - y;
            const crossed = ['Left', 'Right'].some(side => {
                const wrist = a['wrist' + side];
                return wrist && wrist.x * w > x && wrist.x * w < x + tw && wrist.y * h > y && wrist.y * h < y + th;
            });
            if (tw > 10 && th > 10 && !crossed) {
                const c = canvas(320, 400); c.getContext('2d').drawImage(source, x, y, tw, th, 0, 0, c.width, c.height); torso = c.toDataURL('image/png');
            }
        }
        const measurements = measure(source, a, analysis.mask);
        const textures = extractLimbTextures(photo, a, measurements);
        return normalize({ version: 1, revision: crypto.randomUUID(), consentId: receipt.id, sha256: receipt.sha256, faceMode, vector, appearance, head: faceMode === 'vector' ? '' : base.toDataURL('image/png'), features, mouthX, mouthY, skin, torso, clothing, textures, glassesMode, measurements });
    }

    function smoothLine(list) {
        if (!list.length) return '';
        let d = `M${list[0].x} ${list[0].y}`;
        for (let i = 1; i < list.length - 1; i++) d += ` Q${list[i].x} ${list[i].y} ${(list[i].x + list[i + 1].x) / 2} ${(list[i].y + list[i + 1].y) / 2}`;
        return d + ` L${list[list.length - 1].x} ${list[list.length - 1].y}`;
    }

    async function vectorize(data, { tracer, onProgress, signal } = {}) {
        const normalized = normalize(data);
        if (!normalized?.vector) throw new Error('Build a fitted vector face before vectorizing clothing.');
        if (normalized.fullVector) return normalized;
        if (!tracer?.traceAsync) throw new Error('The image tracing engine is unavailable.');
        const sources = normalized.clothing === 'editable' ? [] : Object.entries({
            torso: normalized.torso, ...(normalized.clothing === 'segments' ? normalized.textures : {})
        }).filter(([, image]) => image);
        const vectorLayers = {};
        const check = () => { if (signal?.aborted) throw new DOMException('Reconstruction cancelled', 'AbortError'); };
        const cancel = () => tracer.cancel();
        signal?.addEventListener('abort', cancel, { once: true });
        try {
            for (const [index, [part, src]] of sources.entries()) {
                check();
                const image = new Image(); image.src = src; await image.decode(); check();
                // Each bone-aligned crop is traced separately so paths retain
                // their rig ownership instead of becoming one flattened figure.
                const result = await tracer.traceAsync({ type: 'image', imageElement: image,
                    x: 0, y: 0, width: 100, height: 100 }, {
                    mode: 'regions', colorCount: 16, detail: 2, minRegion: 12,
                    maxRegions: 48, maxPointsPerShape: 360, smooth: true,
                    preserveBackground: true,
                    onProgress: progress => { check(); onProgress?.({ part, progress: (index + progress.progress) / sources.length }); }
                });
                check();
                vectorLayers[part] = result.shapes.map(shape => ({ fill: shape.hex, points: shape.points }));
            }
            check();
            return normalize({ ...normalized, fullVector: true, vectorLayers,
                revision: crypto.randomUUID(), torso: '', textures: {} });
        } finally { signal?.removeEventListener('abort', cancel); }
    }

    function headwear(data, rear = false) {
        const v = data.vector;
        if (v.headwear === 'none') return '';
        const half = (v.right - v.left) * v.faceWidth / 2, center = (v.left + v.right) / 2;
        const contour = !data.vector || data.faceMode === 'hybrid' ? v.hairContour : [];
        const l = data._profile ? 50 - half * 1.04 - 7 : Math.min(center - half * v.cheekWidth - 6, ...contour.map(p => p.x - 2));
        const r = data._profile ? data._front + 5 : Math.max(center + half * v.cheekWidth + 6, ...contour.map(p => p.x + 2)), cx = (l + r) / 2;
        const y = Math.min(data.features.browLeft.y, data.features.browRight.y) - 5;
        const top = Math.max(2, Math.min(v.top - 22 * v.hairVolume, ...contour.map(p => p.y - 3))), fill = v.headwearColor;
        if (!['cap', 'wrap', 'mortarboard', 'hardhat', 'chef'].includes(v.headwear)) {
            // Fit crown and trim together. All lower edges stay above the brows;
            // profile bills project forward, while rear views omit bills/badges.
            const outlines = {
                'yoruba-fila': 'M-1 1 L-1 .42 Q-.9 -.12 .18 .02 L.9 .22 L.78 .55 L1 1 Q0 1.04 -1 1Z',
                'hausa-embroidered-cap': 'M-1 1 L-1 .25 Q0 -.12 1 .25 L1 1 Q0 1.04 -1 1Z',
                'igbo-red-cap': 'M-1 1 L-.93 .27 Q-.75 -.08 .6 .04 Q.93 .04 .95 .35 L1 1 Q0 1.04 -1 1Z',
                turban: 'M-1 1 Q-1.25 .2 -.55 .08 Q0 -.1 .6 .1 Q1.23 .28 1 1 Q.25 .83 0 .98 Q-.4 1.06 -1 1Z',
                'niger-delta-bowler': 'M-1 1 L-1 .6 C-1 -.2 1 -.2 1 .6 L1 1Z',
                fedora: 'M-1 1 L-.85 .15 Q-.55 -.02 -.12 .18 Q.35 -.05 .8 .08 L1 1Z',
                'wide-brim-hat': 'M-1 1 L-.93 .4 Q-.85 0 0 0 Q.9 0 .94 .4 L1 1Z',
                'bucket-hat': 'M-1 1 L-.8 .12 Q0 -.03 .8 .12 L1 1Z',
                beanie: 'M-1 1 L-1 .57 Q-1 0 0 0 Q1 0 1 .57 L1 1Z',
                'top-hat': 'M-1 1 L-.9 .05 Q0 -.05 .9 .05 L1 1Z',
                'pilot-cap': 'M-1 1 L-1.08 .35 Q0 -.2 1.08 .35 L1 1Z',
                'security-cap': 'M-1 1 L-.97 .45 Q-.83 .02 0 .02 Q.83 .02 .97 .45 L1 1Z',
                'military-beret': 'M-1 1 Q-1.26 .5 -.92 .18 Q-.25 -.12 .84 .12 Q1.35 .25 1.05 .58 L.9 1Z'
            };
            const stroke = 'fill="none" stroke="#15191d" stroke-opacity=".32" stroke-width=".035"';
            let detail = '';
            if (['niger-delta-bowler', 'fedora', 'top-hat', 'wide-brim-hat', 'bucket-hat'].includes(v.headwear)) {
                const brim = v.headwear === 'wide-brim-hat' ? 1.28 : 1.15;
                detail += `<path d="M-1 .82 Q0 .91 1 .82 L1 .99 Q0 1.07 -1 .99Z" fill="#15191d" opacity=".55"/><path d="M-1 .94 Q-${brim} 1 -${brim} .9 Q-1 1.2 0 1.13 Q1 1.2 ${brim} .9 Q${brim} 1 1 .94Z" fill="${fill}" stroke="#15191d" stroke-opacity=".25" stroke-width=".025"/>`;
            }
            if (['hausa-embroidered-cap', 'igbo-red-cap', 'yoruba-fila'].includes(v.headwear)) {
                detail += `<path d="M-1 .83 Q0 .9 1 .83 M-1 .95 Q0 1.02 1 .95" ${stroke}/>`;
                if (v.headwear === 'hausa-embroidered-cap') for (let i = 0; i < 7; i++) {
                    const x = -.85 + i * .28;
                    detail += `<path d="M${x} .35 l.1 .15 -.1 .15 -.1 -.15Z M${x} .72 v.09" fill="none" stroke="#f5dfab" stroke-width=".025"/>`;
                }
                if (v.headwear === 'yoruba-fila') detail += `<path d="M-.9 .42 Q0 .3 .9 .22 M-.5 .67 Q.1 .42 .78 .55" ${stroke}/>`;
                if (v.headwear === 'igbo-red-cap' && !rear) detail += '<path d="M.78 .33 Q1 .2 .94 .7" fill="none" stroke="#15191d" stroke-width=".07"/>';
            }
            if (v.headwear === 'turban') detail += `<path d="M-1 .67 Q-.1 .28 .72 .1 M-.9 .89 Q.05 .44 .96 .29 M-.68 .12 Q.03 .58 1 .83 M-.96 .32 Q-.2 .68 .6 .91" ${stroke}/>`;
            if (v.headwear === 'beanie') detail += `<path d="M-1 .74 Q0 .83 1 .74 L1 1 Q0 1.05 -1 1Z" fill="${fill}" stroke="#15191d" stroke-opacity=".35" stroke-width=".025"/><path d="M-.6 .2 L-.65 .73 M-.2 .05 L-.22 .76 M.2 .05 L.22 .76 M.6 .2 L.65 .73" ${stroke}/>`;
            if (['pilot-cap', 'security-cap', 'military-beret'].includes(v.headwear)) {
                detail += '<path d="M-1 .87 Q0 .94 1 .87 L1 1 Q0 1.04 -1 1Z" fill="#15191d"/>';
                if (!rear) {
                    const badgeX = data._profile ? .58 : .1;
                    detail += `<path d="M${badgeX - .12} .52 Q${badgeX} .43 ${badgeX + .12} .52 L${badgeX + .09} .7 L${badgeX} .76 L${badgeX - .09} .7Z" fill="#d4b666"/>`;
                    if (v.headwear !== 'military-beret') detail += `<path d="${data._profile ? 'M.3 .98 Q.85 1.16 1.25 1.03 L1 .94Z' : 'M-.85 .97 Q0 1.25 .98 .97Z'}" fill="#15191d"/>`;
                }
            }
            const crownTop = Math.max(1, Math.min(top - 10, ...v.hairContour.map(p => (data.faceMode === 'hybrid' ? p.y : v.top + (p.y - v.top) * v.hairVolume) - 12)));
            const sx = (r - l) / 2, sy = Math.max(8, (y - crownTop) / 1.16);
            return `<g data-vector-headwear="${v.headwear}" transform="translate(${cx} ${crownTop}) scale(${sx} ${sy})"><path d="${outlines[v.headwear]}" fill="${fill}"/>${detail}</g>`;
        }
        let path = `M${l} ${y} Q${l - 5} ${top} ${cx} ${top} Q${r + 5} ${top} ${r} ${y} Q${cx} ${y + 3} ${l} ${y}Z`;
        if (v.headwear === 'chef') path = `M${l} ${y} L${l} ${top + 15} C${l - 12} ${top - 3} ${cx - 12} ${top - 10} ${cx} ${top} C${cx + 18} ${top - 10} ${r + 12} ${top} ${r} ${top + 15} L${r} ${y} Q${cx} ${y + 3} ${l} ${y}Z`;
        let s = `<g data-vector-headwear="${v.headwear}"><path d="${path}" fill="${fill}" stroke="#15191d" stroke-opacity=".16" stroke-width=".6"/>`;
        if (v.headwear === 'mortarboard') s += `<path d="M${l - 8} ${top + 6} L${cx} ${Math.max(1, top - 6)} L${r + 8} ${top + 6} L${cx} ${top + 17}Z" fill="${fill}"/><path d="M${cx} ${top + 6} L${r + 3} ${top + 9} L${r + 3} ${y + 14}" fill="none" stroke="#b7a360" stroke-width="1.4"/>`;
        if (v.headwear === 'hardhat') s += `<path d="M${l - 3} ${y} Q${cx} ${y + 5} ${r + 3} ${y} M${cx} ${top + 2} L${cx} ${y - 3}" fill="none" stroke="${fill}" stroke-width="3"/>`;
        if (v.headwear === 'wrap') s += `<path d="M${l + 5} ${y - 3} Q${cx + 8} ${y - 14} ${r - 3} ${top + 10}" fill="none" stroke="#ffffff" stroke-opacity=".24" stroke-width="2"/>`;
        if (v.headwear === 'cap' && !rear) s += `<path d="M${l + 3} ${y} Q${cx + 8} ${y + 9} ${r + 6} ${y}Z" fill="${fill}"/>`;
        return s + '</g>';
    }

    function hairDetails(data, l, r, crown, earY, rear = false) {
        const v = data.vector, cx = (l + r) / 2;
        let s = '';
        if (v.hairStyle === 'braids') for (let i = 0; i < 7; i++) {
            if (!rear && i > 1 && i < 5) continue;
            const x = rear ? l + (r - l) * i / 6 : i < 2 ? l - 4 + i * 4 : r + (i - 5) * 4;
            s += `<path data-vector-braid="true" d="M${x} ${earY - 8} Q${x + (x < cx ? -6 : 6)} 118 ${x} 149" fill="none" stroke="${v.hairColor}" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${earY} Q${x + (x < cx ? -6 : 6)} 119 ${x} 147" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="1" stroke-dasharray="2 3"/>`;
        }
        if (v.hairStyle === 'curly') for (let i = 0; i < 11; i++) {
            const angle = Math.PI + i * Math.PI / 10;
            s += `<circle data-vector-curl="true" cx="${cx + (r - l) * .52 * Math.cos(angle)}" cy="${earY - 11 + (earY - crown - 11) * Math.sin(angle)}" r="5.5" fill="${v.hairColor}"/>`;
        }
        return s;
    }

    function facialHair(data) {
        const v = data.vector, x = data.mouthX, y = data.mouthY, w = data.features.upperLip.w / 2;
        if (v.facialHair === 'none') return '';
        let s = `<path data-vector-facial-hair="moustache" d="M${x - w - 1} ${y - 2} Q${x - w * .3} ${y - 6} ${x} ${y - 3} Q${x + w * .3} ${y - 6} ${x + w + 1} ${y - 2} Q${x} ${y - .8} ${x - w - 1} ${y - 2}Z" fill="${v.hairColor}"/>`;
        if (v.facialHair !== 'moustache') s += `<path data-vector-facial-hair="beard" d="M${v.left + 4} ${y - 5} Q${v.left + 9} ${v.bottom + 4} ${x} ${v.bottom + (v.facialHair === 'full-beard' ? 7 : 1)} Q${v.right - 9} ${v.bottom + 4} ${v.right - 4} ${y - 5} Q${v.right - 10} ${v.bottom - 6} ${x} ${v.bottom - 5} Q${v.left + 10} ${v.bottom - 6} ${v.left + 4} ${y - 5}Z" fill="${v.hairColor}"/>`;
        return s;
    }

    function vectorHead(data) {
        const v = data.vector, cx = (v.left + v.right) / 2, half = (v.right - v.left) * v.faceWidth / 2;
        const l = cx - half * v.cheekWidth, r = cx + half * v.cheekWidth, t = v.top, b = v.bottom + v.chinLength;
        const eyes = [data.features.eyeLeft, data.features.eyeRight], eyeY = eyes.reduce((n, f) => n + f.y + f.h / 2, 0) / 2;
        const earY = eyeY + 5, earH = 9 * v.earSize, earW = 4 * v.earSize;
        const jaw = half * v.jawWidth, browY = Math.min(data.features.browLeft.y, data.features.browRight.y);
        const hairY = Math.min(browY - 3, t + 8 - v.hairline), crown = Math.max(3, t - 19 * v.hairVolume);
        let s = '';
        if (['long', 'bob', 'ponytail'].includes(v.hairStyle)) {
            const end = v.hairStyle === 'bob' ? b + 6 : 148;
            s += `<path data-vector-hair="back" d="M${l - 4} ${earY} Q${l - 13} ${crown} ${cx} ${crown} Q${r + 13} ${crown} ${r + 4} ${earY} L${r + 7} ${end} Q${r} ${end + 8} 65 ${end - 4} L63 ${b - 2} L37 ${b - 2} L35 ${end - 4} Q${l} ${end + 8} ${l - 7} ${end}Z" fill="${v.hairColor}"/>`;
        }
        for (const x of [l, r]) s += `<g data-vector-ear="true"><ellipse cx="${x}" cy="${earY}" rx="${earW}" ry="${earH}" fill="${data.skin}"/><path d="M${x} ${earY - earH * .5} Q${x + (x < cx ? -2 : 2)} ${earY} ${x} ${earY + earH * .4}" fill="none" stroke="#382019" stroke-opacity=".22" stroke-width=".8"/></g>`;
        s += `<path data-vector-contour="true" d="M${cx} ${t - 8} C${l + 6} ${t - 8} ${l - 1} ${t + 6} ${l} ${eyeY} C${l} ${b - 20} ${cx - jaw} ${b - 8} ${cx - jaw * .55} ${b - 2} Q${cx} ${b + 5} ${cx + jaw * .55} ${b - 2} C${cx + jaw} ${b - 8} ${r} ${b - 20} ${r} ${eyeY} C${r + 1} ${t + 6} ${r - 6} ${t - 8} ${cx} ${t - 8}Z" fill="${data.skin}"/>`;
        if (v.jawContour.length) {
            const contour = v.jawContour.map(p => {
                const lower = clamp((p.y - eyeY) / Math.max(1, b - eyeY), 0, 1);
                return { x: cx + (p.x - cx) * v.faceWidth * (v.cheekWidth * (1 - lower) + v.jawWidth / .88 * lower), y: p.y + v.chinLength * lower };
            });
            const d = smoothLine(contour) + ` Q${r + 2} ${t - 12} ${cx} ${t - 8} Q${l - 2} ${t - 12} ${contour[0].x} ${contour[0].y}Z`;
            s = s.replace(/data-vector-contour="true" d="[^"]+"/, `data-vector-contour="true" data-photo-measured-contour="true" d="${d}"`);
        }
        if (v.hairStyle !== 'bald') s += `<path data-vector-hair="front" d="M${l - 1} ${earY + 3} C${l - 9} ${t} ${l - 4} ${crown} ${cx} ${crown} C${r + 2} ${crown} ${r + 9} ${t} ${r + 1} ${earY + 3} L${r - 3} ${eyeY - 4} L${r - 5} ${hairY} Q${cx + half * .15} ${hairY - 8} ${l + 5} ${hairY + 1} L${l + 3} ${eyeY - 4}Z" fill="${v.hairColor}"/>`;
        if (v.hairStyle !== 'bald' && v.hairContour.length) {
            const topLine = v.hairContour.map(p => ({ x: cx + (p.x - cx) * v.faceWidth, y: t + (p.y - t) * v.hairVolume }));
            s += `<path data-photo-measured-hair="true" d="${smoothLine(topLine)} L${r - 5} ${hairY} Q${cx} ${hairY - 8} ${l + 5} ${hairY + 1}Z" fill="${v.hairColor}"/>`;
        }
        s += hairDetails(data, l, r, crown, earY) + facialHair(data) + headwear(data);
        const nx = v.noseX, ny = Math.min(data.mouthY - 5, eyeY + (v.noseY - eyeY) * v.noseLength), nw = half * .14 * v.noseWidth;
        s += `<path data-vector-nose="true" d="M${nx - nw * .3} ${eyeY + 3} Q${nx - nw * .25} ${ny - 4} ${nx - nw} ${ny - 1} Q${nx - nw * 1.2} ${ny + 2} ${nx} ${ny + 2} Q${nx + nw} ${ny + 2} ${nx + nw * .8} ${ny}" fill="none" stroke="#382019" stroke-opacity=".28" stroke-width=".8" stroke-linecap="round"/>`;
        return s;
    }

    function profileData(data) {
        const features = Object.fromEntries(Object.entries(data.features).map(([key, f]) => [key, { ...f }]));
        const v = data.vector, front = 50 + (v.right - v.left) * .49 * v.faceWidth * v.profileDepth;
        const eye = features.eyeLeft, eyeY = (features.eyeLeft.y + features.eyeRight.y) / 2;
        eye.w *= .7; eye.x = front - eye.w - 2; eye.y = eyeY;
        features.browLeft = { ...features.browLeft, x: eye.x - 1, y: Math.min(features.browLeft.y, eyeY - 3), w: eye.w + 2 };
        for (const key of ['upperLip', 'lowerLip']) { features[key].w *= .53; features[key].x = front - features[key].w + 1; }
        return { ...data, features, mouthX: front - features.upperLip.w / 2 + 1, _profile: true, _front: front };
    }

    function quarterData(data) {
        const features = Object.fromEntries(Object.entries(data.features).map(([key, f]) => [key, { ...f }]));
        const v = { ...data.vector }, cx = (v.left + v.right) / 2;
        const project = x => cx + 3 + (x - cx) * (x > cx ? .78 : .95);
        for (const [key, f] of Object.entries(features)) {
            const center = f.x + f.w / 2, scale = /eye|brow/.test(key) && center > cx ? .78 : .95;
            f.w *= scale; f.x = project(center) - f.w / 2;
        }
        v.left = project(v.left); v.right = project(v.right); v.noseX = cx + 7;
        v.jawContour = v.jawContour.map(p => ({ x: project(p.x), y: p.y }));
        v.hairContour = v.hairContour.map(p => ({ x: project(p.x), y: p.y }));
        return { ...data, vector: v, features, mouthX: project(data.mouthX) + 1 };
    }

    function profileHead(data) {
        const v = data.vector, t = v.top, b = v.bottom + v.chinLength, fr = data._front;
        const back = 50 - (v.right - v.left) * .52 * v.faceWidth;
        const eyeY = data.features.eyeLeft.y + data.features.eyeLeft.h / 2;
        const noseY = Math.min(data.mouthY - 5, eyeY + (v.noseY - eyeY) * v.noseLength);
        const noseTip = fr + 4.5 * v.noseWidth, earX = back + (fr - back) * .40, earY = eyeY + 7;
        const crown = Math.max(3, t - 19 * v.hairVolume), hairY = Math.min(data.features.browLeft.y - 4, t + 8 - v.hairline);
        let s = '';
        if (['long', 'bob', 'ponytail'].includes(v.hairStyle)) {
            const end = v.hairStyle === 'bob' ? b + 3 : 148, tail = v.hairStyle === 'ponytail' ? -8 : 0;
            s += `<path data-vector-hair="back" d="M${back + 4} ${earY - 12} Q${back - 13 + tail} ${earY} ${back - 5 + tail} 121 Q${back - 12} ${end} ${back + 8} ${end} Q${earX + 1} ${end - 8} ${earX - 2} ${b} L${earX + 4} ${earY}Z" fill="${v.hairColor}"/>`;
        }
        s += `<path data-vector-contour="true" d="M${earX} ${t - 9} C${fr - 9} ${t - 13} ${fr + 4} ${t + 1} ${fr} ${eyeY - 4} Q${fr - 2} ${eyeY} ${fr + 1} ${eyeY + 5} L${noseTip} ${noseY - 2} Q${noseTip + 2} ${noseY + 2} ${fr} ${noseY + 3} Q${fr - 2} ${data.mouthY - 2} ${fr - 1} ${data.mouthY + 3} Q${fr + 1} ${b - 2} ${fr - 10} ${b} Q${earX + 4} ${b + 2} ${earX - 2} ${b - 10} C${back - 9} ${b - 17} ${back - 11} ${t - 5} ${earX} ${t - 9}Z" fill="${data.skin}"/>`;
        if (v.hairStyle !== 'bald') s += `<path data-vector-hair="front" d="M${back + 6} ${earY + 17} C${back - 15} ${earY} ${back - 11} ${crown} ${earX + 7} ${crown} Q${fr + 9} ${crown + 2} ${fr + 1} ${hairY} Q${fr - 12} ${hairY - 5} ${earX + 9} ${hairY + 5} L${earX + 3} ${earY + 10} L${earX - 5} ${earY + 19}Z" fill="${v.hairColor}"/>`;
        s += hairDetails(data, back + 1, v.hairStyle === 'braids' ? earX - 4 : fr - 3, crown, earY, v.hairStyle === 'braids');
        s += `<g data-vector-ear="true"><ellipse cx="${earX}" cy="${earY}" rx="${5 * v.earSize}" ry="${10 * v.earSize}" fill="${data.skin}"/><path d="M${earX - 2} ${earY - 5} Q${earX + 5} ${earY - 8} ${earX + 2} ${earY + 2} Q${earX - 2} ${earY + 3} ${earX} ${earY + 6}" fill="none" stroke="#382019" stroke-opacity=".28" stroke-width="1"/></g>`;
        if (v.facialHair !== 'none') s += `<path data-vector-facial-hair="true" d="M${fr - 8} ${data.mouthY - 3} Q${fr - 1} ${data.mouthY - 7} ${fr + 1} ${data.mouthY - 2}Z ${v.facialHair !== 'moustache' ? `M${earX + 5} ${earY + 11} Q${earX + 7} ${b + 3} ${fr - 10} ${b + 4} Q${fr + 2} ${b} ${fr - 1} ${data.mouthY + 7} Q${fr - 6} ${b - 2} ${earX + 5} ${earY + 11}Z` : ''}" fill="${v.hairColor}"/>`;
        return s + headwear(data);
    }

    function rearHead(data, view) {
        const v = data.vector, cx = 50, half = (v.right - v.left) * v.faceWidth / 2;
        const l = cx - half, r = cx + half, b = v.bottom + v.chinLength, crown = Math.max(3, v.top - 19 * v.hairVolume);
        const earY = (data.features.eyeLeft.y + data.features.eyeRight.y) / 2 + 7;
        const long = ['long', 'bob', 'braids'].includes(v.hairStyle);
        let s = `<path data-vector-contour="true" d="M50 ${v.top - 8} C${l - 10} ${v.top - 8} ${l - 6} ${b - 12} 37 ${b} L63 ${b} C${r + 6} ${b - 12} ${r + 10} ${v.top - 8} 50 ${v.top - 8}Z" fill="${data.skin}"/>`;
        const ears = view.includes('3q') ? [view.endsWith('left') ? l : r] : [l, r];
        if (!long) for (const x of ears) s += `<ellipse data-vector-ear="true" cx="${x}" cy="${earY}" rx="${4 * v.earSize}" ry="${9 * v.earSize}" fill="${data.skin}"/>`;
        if (v.hairStyle !== 'bald') {
            const end = v.hairStyle === 'long' ? 150 : v.hairStyle === 'bob' ? b + 5 : Math.max(earY + 13, b - 14);
            s += `<path data-vector-hair="back" d="M${l - 2} ${earY} Q${l - 10} ${crown} 50 ${crown} Q${r + 10} ${crown} ${r + 2} ${earY} L${r - 2} ${end - 7} Q50 ${end + 7} ${l + 2} ${end - 7}Z" fill="${v.hairColor}"/>`;
            if (v.hairStyle === 'ponytail') s += `<path data-vector-hair="tail" d="M39 ${earY} Q65 ${earY - 7} 61 ${earY + 22} Q73 140 54 154 Q35 149 43 126 Q33 ${earY + 19} 39 ${earY}Z" fill="${v.hairColor}"/>`;
            s += hairDetails(data, l, r, crown, earY, true);
        }
        s += headwear(data, true);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 170" width="400" height="680" data-photo-inferred="${view}"><path d="M37 111 L35 166 Q50 172 65 166 L63 111Z" fill="${data.skin}"/><g id="head-motion" data-svg-african-role="head-motion">${s}</g></svg>`;
    }

    function renderHead(data, config, view = 'front') {
        if (data.vector) data = fitVectorFeatures(data);
        if (data.vector && view.startsWith('back')) return rearHead(data, view);
        const profile = data.vector && view.startsWith('side-');
        const quarter = data.vector && view.startsWith('front-3q') && config.styling?.threeQuarterArtwork === 'experimental-drawn';
        if (quarter) data = quarterData(data);
        if (profile) data = profileData(data);
        const fit = data.fitting;
        const image = (f, attrs = '') => `<image x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" href="${f.image}" ${attrs}/>`;
        let content = data.vector ? profile ? profileHead(data) : vectorHead(data) : `<image width="100" height="170" href="${data.head}" clip-path="url(#photo-head-crop)"/>`;
        if (!data.vector && data.appearance) content += headwear({ ...data, vector: data.appearance });
        for (const side of profile ? ['Left'] : ['Left', 'Right']) {
            const f = data.features['eye' + side], x = f.x + f.w / 2, y = f.y + f.h / 2;
            const outline = `M${f.x} ${y} Q${x} ${f.y - f.h * .3} ${f.x + f.w} ${y} Q${x} ${f.y + f.h * 1.25} ${f.x} ${y}`;
            content += `<g data-photo-eye="${side}" data-cx="${x}" data-cy="${y}"><defs><clipPath id="photo-eye-clip-${side}"><path d="${outline}"/></clipPath></defs><path d="${outline}" fill="#f5eee7" stroke="#594237" stroke-width=".35"/><g clip-path="url(#photo-eye-clip-${side})"><g data-photo-pupil="${side}"><circle cx="${x}" cy="${y}" r="${f.h * .39 * fit.irisSize}" fill="${fit.irisColor}"/><circle cx="${x}" cy="${y}" r="${f.h * .23 * fit.irisSize}" fill="#17100d"/><circle cx="${x - .4}" cy="${y - .4}" r=".35" fill="white"/></g></g></g>`;
            const brow = data.features['brow' + side];
            content += `<g data-photo-brow="${side}">${brow.image ? image(brow) : `<path d="M${brow.x} ${brow.y + brow.h * .7} Q${brow.x + brow.w * .5} ${brow.y} ${brow.x + brow.w} ${brow.y + brow.h * .65}" fill="none" stroke="${data.vector?.hairColor || '#35251e'}" stroke-width="${1.5 * (data.vector?.browThickness || 1)}" stroke-linecap="round"/>`}</g>`;
        }
        if (data.glassesMode !== 'keep' && config.styling?.accessories?.includes('glasses')) {
            const color = config.styling.colorOverrides?.glasses;
            const stroke = /^#[a-f0-9]{6}$/i.test(color || '') ? color : '#343940';
            const eyes = (profile ? [data.features.eyeLeft] : [data.features.eyeLeft, data.features.eyeRight]).sort((a, b) => a.x - b.x);
            const rim = f => data.glassesStyle === 'round'
                ? `<ellipse cx="${f.x + f.w / 2}" cy="${f.y + f.h / 2}" rx="${f.w / 2 + 1.3}" ry="${f.h / 2 + 1.6}"/>`
                : `<rect x="${f.x - 1.3}" y="${f.y - 1.6}" width="${f.w + 2.6}" height="${f.h + 3.2}" rx="1.4"/>`;
            const last = eyes[eyes.length - 1];
            const y0 = eyes[0].y + eyes[0].h * .4, y1 = last.y + last.h * .4;
            const cx = (eyes[0].x + eyes[0].w / 2 + last.x + last.w / 2) / 2;
            const cy = (y0 + y1) / 2;
            const bridge = profile ? `M${eyes[0].x - 1.3} ${y0} l-16 -3` : `M${eyes[0].x + eyes[0].w + 1.3} ${y0} Q${(eyes[0].x + eyes[0].w + last.x) / 2} ${Math.min(y0, y1) - 1} ${last.x - 1.3} ${y1} M${eyes[0].x - 1.3} ${y0} l-3 -1 M${last.x + last.w + 1.3} ${y1} l3 -1`;
            content += `<g data-photo-glasses="true" transform="translate(${cx} ${cy + fit.frameY}) scale(${fit.frameWidth} ${fit.frameHeight}) translate(${-cx} ${-cy})" fill="none" stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round">${eyes.map(rim).join('')}<path d="${bridge}"/></g>`;
        }
        const f = data.features.upperLip;
        if (!data.vector) content += `<ellipse data-photo-cavity="true" cx="${data.mouthX}" cy="${data.mouthY}" rx="${f.w * .46}" ry=".1" fill="#240c13"/>`;
        if (data.vector) {
            const x = data.mouthX, y = data.mouthY, w = f.w / 2, h = Math.max(1, Math.min(3, f.h));
            const seam = `M${x - w} ${y} Q${x} ${y} ${x + w} ${y} Q${x} ${y} ${x - w} ${y}Z`;
            content += `<defs><clipPath id="photo-vector-mouth-clip"><path data-photo-mouth-clip="true" d="${seam}"/></clipPath></defs><path data-photo-cavity="true" d="${seam}" ry=".1" fill="#240c13" opacity="0"/><g clip-path="url(#photo-vector-mouth-clip)"><path data-photo-teeth="true" fill="#f4e8da" opacity="0"/><path data-photo-tongue="true" fill="#b96a73" opacity="0"/></g>`;
            content += `<g data-photo-lip="upper"><path d="M${x - w} ${y} Q${x - w * .4} ${y - h * 1.8} ${x} ${y - h * .7} Q${x + w * .4} ${y - h * 1.8} ${x + w} ${y} Q${x} ${y + .2} ${x - w} ${y}" fill="${data.vector.lipColor}"/></g><g data-photo-lip="lower"><path d="M${x - w} ${y} Q${x} ${y + .5} ${x + w} ${y} Q${x} ${y + h * 2.4} ${x - w} ${y}" fill="${data.vector.lipColor}"/></g>`;
        } else content += `<g data-photo-lip="upper">${image(f)}</g><g data-photo-lip="lower">${image(data.features.lowerLip)}</g>`;
        const facing = (profile || quarter) && view.endsWith('left') ? 'translate(100 0) scale(-1 1)' : '';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 170" width="400" height="680" data-photo-face="v1" ${profile ? 'data-photo-profile="true"' : ''} ${view !== 'front' ? `data-photo-inferred="${view}"` : ''} ${data.vector ? `data-photo-vector="v1" data-photo-lip-height="${Math.max(.5, Math.min(4.5, f.h))}"` : ''} data-photo-mouth-x="${data.mouthX}" data-photo-mouth-y="${data.mouthY}" data-photo-mouth-width="${f.w}"><defs><clipPath id="photo-head-crop"><rect width="100" height="131"/></clipPath></defs><path d="M37 112 L35 166 Q50 172 65 166 L63 112Z" fill="${data.skin}"/><g id="head-motion" data-svg-african-role="head-motion"><g transform="${facing}">${content}</g></g></svg>`;
    }

    function applyArtwork(raw, part, config, view) {
        const data = normalize(config._photoCharacter);
        if (!data) return raw;
        if (part === 'head-neck') return view === 'front' || (data.vector?.viewMode === 'matched') ? renderHead(data, config, view) : raw;
        if (view !== 'front') return raw;
        const texture = part === 'torso' ? data.torso : data.clothing === 'segments' ? data.textures[part] : '';
        const layers = data.fullVector && (part === 'torso' || data.clothing === 'segments') ? data.vectorLayers[part] : null;
        if (!['photo', 'segments'].includes(data.clothing) || (!texture && !layers?.length)) return raw;
        const doc = new DOMParser().parseFromString(raw, 'image/svg+xml'), svg = doc.documentElement;
        if (svg.localName !== 'svg') return raw;
        const box = (svg.getAttribute('viewBox') || '0 0 100 200').split(/[ ,]+/).map(Number);
        const markup = svg.innerHTML;
        let maskMarkup = markup;
        if (data.clothing === 'segments') {
            const maskSource = svg.cloneNode(true);
            maskSource.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
            maskMarkup = maskSource.innerHTML;
        }
        // The authored silhouette remains the garment mask; no rectangular photo
        // backdrop is allowed to hide the arms or extend beyond the clothing.
        const artwork = layers?.length
            ? `<g data-photo-vector-clothing="${part}" mask="url(#photo-garment)"><g transform="translate(${box[0]} ${box[1]}) scale(${box[2] / 100} ${box[3] / 100})">${layers.map((shape, index) => `<path data-photo-region="${index}" d="M${shape.points.map(p => `${p.x} ${p.y}`).join(' L')} Z" fill="${shape.fill}"/>`).join('')}</g></g>`
            : `<image data-photo-texture="${part}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" href="${texture}" preserveAspectRatio="none" mask="url(#photo-garment)"/>`;
        svg.innerHTML = `<defs><filter id="photo-white"><feFlood flood-color="white"/><feComposite in2="SourceAlpha" operator="in"/></filter><mask id="photo-garment"><g filter="url(#photo-white)">${maskMarkup}</g></mask></defs>${data.clothing === 'segments' || layers?.length ? markup : ''}${artwork}`;
        return new XMLSerializer().serializeToString(svg);
    }

    globalThis.PhotoCharacterRig = Object.freeze({ normalize, clothingAvailability, build, vectorize, assess, measure, applyArtwork, appearanceFor, prepareConfig, suggestHair, fittingControls, normalizeFitting, vectorControls, normalizeVector, hairStyles, facialHairStyles, headwearStyles, headwearLabels, headwearColors });
})();
