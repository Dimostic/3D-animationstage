/* Jewelry stays inside each part's SVG, inheriting its transforms and rig depth. */
(function (global) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const role = (root, name) => root.querySelector(`[data-svg-african-role~="${name}"]`);
    const partNode = (root, id) => root.querySelector(`[id="${id}"], [id$="-${id}"]`);
    const n = value => Number(value.toFixed(3));

    function node(doc, name, attributes = {}, parent) {
        const element = doc.createElementNS(NS, name);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
        parent?.appendChild(element);
        return element;
    }

    function bead(doc, parent, x, y, radius, color) {
        node(doc, 'circle', { cx: n(x), cy: n(y), r: n(radius), fill: color, stroke: '#35201c', 'stroke-opacity': .35, 'stroke-width': .55 }, parent);
        node(doc, 'ellipse', { cx: n(x - radius * .25), cy: n(y - radius * .32), rx: n(radius * .36), ry: n(radius * .20), fill: '#ffffff', opacity: .3 }, parent);
    }

    function beadArc(doc, parent, { x, y, rx, depth, skew = 0, size, color, alternating = false }) {
        const count = Math.max(7, Math.min(39, Math.round((rx * 2 + depth * 1.2) / (size * 2.25))));
        const points = Array.from({ length: 49 }, (_, index) => {
            const angle = Math.PI * index / 48;
            return `${n(x - rx * Math.cos(angle) + skew * Math.sin(angle))},${n(y + depth * Math.sin(angle))}`;
        }).join(' ');
        node(doc, 'polyline', { points, fill: 'none', stroke: color, 'stroke-width': .8 }, parent);
        for (let i = 0; i <= count; i++) {
            const a = Math.PI * i / count;
            bead(doc, parent, x - rx * Math.cos(a) + skew * Math.sin(a), y + depth * Math.sin(a), size,
                alternating && i % 4 === 0 ? '#f3e9d7' : color);
        }
    }

    function ring(doc, parent, x, y, rx, height, color) {
        const d = `M${n(x - rx)} ${n(y)} Q${n(x)} ${n(y + 5)} ${n(x + rx)} ${n(y)} L${n(x + rx)} ${n(y + height)} Q${n(x)} ${n(y + height + 5)} ${n(x - rx)} ${n(y + height)} Z`;
        node(doc, 'path', { d, fill: color, stroke: '#58421f', 'stroke-width': .65 }, parent);
        node(doc, 'path', { d: `M${n(x - rx + 1)} ${n(y + 1)} Q${n(x)} ${n(y + 5)} ${n(x + rx - 1)} ${n(y + 1)}`, fill: 'none', stroke: '#fff7cf', 'stroke-width': .8, opacity: .7 }, parent);
    }

    function necklace(doc, group, settings, profile) {
        const { x, y, rx, skew, back, side } = profile;
        const length = settings.necklaceLength;
        const size = 3.5 * settings.beadSize;
        const depth = back ? 7 : (side ? 34 : 31) * length;
        const arc = (offset, extraRadius, beadSize, color, alternating = false) => beadArc(doc, group, {
            x, y: y + offset, rx: rx + extraRadius, depth: back ? 6 : depth + offset * .2,
            skew, size: beadSize, color, alternating
        });
        if (settings.necklace === 'large-beads') arc(0, 0, size, settings.beadColor);
        if (settings.necklace === 'layered-beads') {
            for (let row = 0; row < 3; row++) arc(row * size * 2.4, row * 3, size * .86, settings.beadColor);
        }
        if (settings.necklace === 'beaded-collar') {
            for (let row = 0; row < 5; row++) {
                beadArc(doc, group, { x, y: y + row * 2.5, rx: rx + row * 4,
                    depth: back ? 8 + row * 2 : 12 + row * 5 * length, skew,
                    size: 1.8 * settings.beadSize, color: row % 2 ? settings.metalColor : settings.beadColor, alternating: true });
            }
        }
        if (settings.necklace === 'neck-rings') {
            const rows = back ? 4 : 6;
            for (let row = 0; row < rows; row++) {
                ring(doc, group, x + skew * row / rows, y + row * 4.2 * length, rx * .72 + row * 2.1, 3, settings.metalColor);
            }
        }
        if (settings.necklace === 'pendant') {
            arc(0, 0, Math.max(1, size * .36), settings.metalColor);
            if (!back) {
                const px = x + skew, py = y + depth;
                node(doc, 'ellipse', { cx: n(px), cy: n(py + 3), rx: 2, ry: 3, fill: 'none', stroke: settings.metalColor, 'stroke-width': 1.4 }, group);
                node(doc, 'path', { d: `M${n(px)} ${n(py + 4)} Q${n(px + 12)} ${n(py + 13)} ${n(px)} ${n(py + 24)} Q${n(px - 12)} ${n(py + 13)} ${n(px)} ${n(py + 4)}Z`, fill: settings.metalColor, stroke: '#705427', 'stroke-width': 1 }, group);
                node(doc, 'ellipse', { cx: n(px), cy: n(py + 13), rx: 3.2, ry: 5, fill: settings.beadColor }, group);
            }
        }
        if (back) node(doc, 'rect', { x: n(x - 2), y: n(y + depth - 2), width: 4, height: 5, rx: 1, fill: settings.metalColor }, group);
    }

    function limbOrnament(doc, group, style, settings, { x, y, rx }) {
        if (style === 'beads') {
            beadArc(doc, group, { x, y, rx, depth: 3, size: 2.5 * settings.beadSize, color: settings.beadColor });
        } else if (style === 'stacked') {
            for (let row = 0; row < 3; row++) ring(doc, group, x, y - row * 4.8, rx, 3, settings.metalColor);
        } else {
            const height = style === 'cuff' ? 12 : 4;
            ring(doc, group, x, y - height + 4, rx, height, settings.metalColor);
            if (style === 'cuff') {
                node(doc, 'path', { d: `M${n(x - rx * .6)} ${n(y - 4)} L${n(x)} ${n(y)} L${n(x + rx * .6)} ${n(y - 4)}`, fill: 'none', stroke: settings.beadColor, 'stroke-width': 1.4 }, group);
            }
        }
    }

    function profileFor(root, partKey, config, context) {
        const view = context.view || config.styling?.view || config.view || 'front';
        const side = view.startsWith('side');
        const back = view.startsWith('back');
        const drawn = !!role(root, 'authored-three-quarter-torso') || !!role(root, 'authored-three-quarter-limb');
        const a = context.adjustments || config.premiumAdjustments || {};
        const value = key => Number.isFinite(Number(a[key])) ? Math.max(-.45, Math.min(.55, Number(a[key]))) : 0;
        const basic = context.basic;
        const box = root.getAttribute('viewBox').split(/\s+/).map(Number);
        const w = box[2], h = box[3];
        const parent = role(root, 'premium-part') || root;
        if (partKey === 'torso') {
            if (side && !basic) return { parent: partNode(root, 'side-torso-root') || parent, x: 77, y: 45, rx: 16, skew: 8, side, back };
            if (drawn) return { parent: role(root, 'authored-three-quarter-torso'), x: 68, y: back ? 34 : 27, rx: 22, skew: back ? 0 : 7, side, back };
            return { parent, x: w / 2, y: basic ? h * .19 : 39, rx: (basic ? w * .19 : 24) * (1 + value('torsoWidth') * .3), skew: 0, side, back };
        }
        const arm = partKey.endsWith('arm');
        const left = partKey.startsWith('left');
        const anatomicalSide = side
            ? (partKey.startsWith('front') === (view !== 'side-left') ? 'right' : 'left')
            : (left ? 'left' : 'right');
        if (basic) {
            const mirrored = root.querySelector('g[transform]');
            const version = Number(config.rendererVersion ?? 3);
            const dimensions = version >= 3 ? (arm ? [38, 235, 10] : [39, 260, 12])
                : version >= 2 ? (arm ? [45, 143, 11] : [46, 149, 10])
                    : (arm ? [37, 115, 9] : [40, 109, 15]);
            return { parent: mirrored || root, x: dimensions[0], y: dimensions[1], rx: dimensions[2], anatomicalSide };
        }
        if (side) return { parent: partNode(root, arm ? 'side-arm-root' : 'side-leg-root') || parent,
            x: 29, y: (arm ? 216 : 214) + value(arm ? 'armLength' : 'legLength') * (arm ? 28 : 36),
            rx: (arm ? 10 : 11) + value(arm ? 'armWidth' : 'legWidth') * 1.5, anatomicalSide };
        if (drawn) {
            const shape = role(root, 'authored-three-quarter-limb');
            const near = shape?.getAttribute('data-svg-african-role').includes('near-limb');
            return { parent: shape || parent, x: arm ? (near ? 36 : 34) : (near ? 38 : 19), y: arm ? 217 : 218, rx: arm ? 9 : 8, anatomicalSide };
        }
        if (back) return { parent, x: arm ? (left ? 26.5 : 39.5) : 28, y: (arm ? 220 : 214) + value(arm ? 'armLength' : 'legLength') * (arm ? 28 : 36), rx: arm ? 14 : 15, anatomicalSide };
        return { parent: partNode(root, arm ? 'arm-clothing-shape' : 'leg-body-shape') || parent,
            x: arm ? (left ? 31.5 : 34.5) : (left ? 30 : 26), y: arm ? 211 : 209, rx: 13, anatomicalSide };
    }

    function apply(svg, partKey, config = {}, context = {}) {
        const settings = global.SvgAfricanCharacterCatalog?.normalizeJewelry(config.styling?.jewelry || config.jewelry);
        if (!settings || !['torso', 'left-arm', 'right-arm', 'front-arm', 'back-arm', 'left-leg', 'right-leg', 'front-leg', 'back-leg'].includes(partKey)) return svg;
        const area = partKey === 'torso' ? 'necklace' : partKey.endsWith('arm') ? 'wrists' : 'ankles';
        if (settings[area] === 'none') return svg;
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (doc.querySelector('parsererror')) return svg;
        const root = doc.documentElement;
        root.querySelectorAll('[data-svg-african-jewelry]').forEach(element => element.remove());
        const profile = profileFor(root, partKey, config, context);
        const selectedSide = settings[area === 'wrists' ? 'wristSide' : 'ankleSide'];
        if (area !== 'necklace' && selectedSide !== 'both' && selectedSide !== profile.anatomicalSide) return svg;
        if (area === 'necklace') {
            // Replace the old small bead strand only when a new neck style is chosen.
            root.querySelectorAll('[data-svg-african-role~="beads"]').forEach(element => element.remove());
        }
        const group = node(doc, 'g', { 'data-svg-african-jewelry': area, 'data-svg-african-jewelry-style': settings[area],
            'data-svg-african-role': `accessory jewelry ${area} ${profile.back ? 'rear-fastening' : 'fitted-ornament'}`,
            'data-jewelry-side': profile.anatomicalSide || 'neck', 'pointer-events': 'none' }, profile.parent);
        if (area === 'necklace') necklace(doc, group, settings, profile);
        else limbOrnament(doc, group, settings[area], settings, profile);
        return new XMLSerializer().serializeToString(root);
    }

    global.SvgAfricanJewelry = Object.freeze({ apply });
})(typeof globalThis !== 'undefined' ? globalThis : window);
