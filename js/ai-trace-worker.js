/* Worker for Auto Trace color-region segmentation. Keep this file standalone. */

self.onmessage = (event) => {
    const message = event.data || {};
    if (message.type !== 'trace-regions') return;
    try {
        const width = message.width | 0;
        const height = message.height | 0;
        const pixels = new Uint8ClampedArray(message.buffer);
        const opts = message.opts || {};
        const limits = opts.limits || {};
        const detail = Math.max(0, Math.min(2, Number(opts.detail ?? 1)));
        const sensitivity = normalizeSensitivity(opts.sensitivity);
        const colorCount = Math.max(2, Math.min(Number(limits.maxColors || 28), Number(opts.colorCount || 12)));
        const minRegion = Math.max(Number(opts.minRegion || 200), Math.ceil(width * height * Number(limits.minRegionRatio || 0.00045)));
        const maxRegions = Math.max(4, Math.min(48, Number(limits.maxRegions || 28)));
        const maxPoints = Math.max(48, Math.min(700, Number(limits.maxPointsPerShape || [220, 360, 520][detail])));
        const smooth = opts.smooth !== false;

        postProgress('palette', 0.16, 'Finding main colors...');
        const palette = medianCut(pixels, colorCount);
        postProgress('classify', 0.34, 'Grouping matching pixels...');
        const labels = classifyPixels(pixels, palette, width, height);
        postProgress('components', 0.5, 'Finding connected regions...');
        const { components, componentColors } = labelComponents(labels, width, height, palette);

        const regionSizes = countRegions(components);
        postProgress('merge', 0.62, 'Cleaning tiny regions...');
        mergeSmallRegions(components, regionSizes, width, height, minRegion);
        const finalSizes = countRegions(components);

        const bgColor = sampleEdgeBackground(pixels, width, height);
        const bgSkipThresholdSq = Math.max(8, Number(opts.bgTolerance ?? 30)) ** 2 * 4;
        const candidates = Object.keys(finalSizes)
            .map(Number)
            .filter(id => (finalSizes[id] || 0) >= minRegion)
            .filter(id => {
                const color = componentColors[id] || [128, 128, 128];
                const area = finalSizes[id] || 0;
                const dr = color[0] - bgColor[0];
                const dg = color[1] - bgColor[1];
                const db = color[2] - bgColor[2];
                const colorDistSq = dr * dr + dg * dg + db * db;
                return opts.preserveBackground === true || !(area > width * height * 0.72 && colorDistSq <= bgSkipThresholdSq);
            })
            .sort((a, b) => (finalSizes[b] || 0) - (finalSizes[a] || 0));
        const selectedRegions = candidates.slice(0, maxRegions);

        const shapes = [];
        for (let r = 0; r < selectedRegions.length; r++) {
            const regionId = selectedRegions[r];
            postProgress('trace', 0.72 + (0.2 * (r / Math.max(1, selectedRegions.length))), `Tracing region ${r + 1} of ${selectedRegions.length}...`);
            const mask = new Uint8Array(width * height);
            for (let i = 0; i < components.length; i++) {
                if (components[i] === regionId) mask[i] = 1;
            }
            const points = traceMaskToPath(mask, width, height, { detail, sensitivity, smooth, maxPoints });
            if (!points || points.length < 3) continue;
            const color = componentColors[regionId] || [128, 128, 128];
            shapes.push({
                points,
                color: `rgb(${color[0]},${color[1]},${color[2]})`,
                hex: rgbToHex(color[0], color[1], color[2]),
                area: finalSizes[regionId] || 0
            });
        }

        if (!shapes.length) {
            throw new Error('Could not isolate any traceable regions.');
        }

        shapes.sort((a, b) => b.area - a.area);
        const previewBuffer = buildPreviewBuffer(components, componentColors, selectedRegions, width, height);
        postProgress('done', 1, 'Trace preview ready.');
        self.postMessage({
            type: 'result',
            shapes,
            previewBuffer,
            meta: {
                maxRegions,
                keptRegions: selectedRegions.length,
                skippedRegions: Math.max(0, candidates.length - selectedRegions.length)
            }
        }, [previewBuffer]);
    } catch (err) {
        self.postMessage({ type: 'error', message: err?.message || String(err) });
    }
};

function postProgress(phase, progress, message) {
    self.postMessage({ type: 'progress', phase, progress, message });
}

function normalizeSensitivity(value) {
    return Math.max(1, Math.min(100, Number(value ?? 60)));
}

function medianCut(pixels, colorCount) {
    const colors = [];
    const step = Math.max(1, Math.floor(pixels.length / 4 / 24000));
    for (let i = 0; i < pixels.length; i += 4 * step) {
        if (pixels[i + 3] < 12) continue;
        colors.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
    if (!colors.length) return [[128, 128, 128]];
    let buckets = [colors];
    while (buckets.length < colorCount) {
        let bucketIndex = -1;
        let maxRange = -1;
        for (let i = 0; i < buckets.length; i++) {
            const range = colorRange(buckets[i]);
            const largest = Math.max(range[0], range[1], range[2]);
            if (largest > maxRange && buckets[i].length > 1) {
                maxRange = largest;
                bucketIndex = i;
            }
        }
        if (bucketIndex === -1) break;
        const bucket = buckets.splice(bucketIndex, 1)[0];
        const range = colorRange(bucket);
        const channel = range.indexOf(Math.max(range[0], range[1], range[2]));
        bucket.sort((a, b) => a[channel] - b[channel]);
        const mid = Math.floor(bucket.length / 2);
        buckets.push(bucket.slice(0, mid), bucket.slice(mid));
    }
    return buckets.map(bucket => {
        const sum = bucket.reduce((acc, color) => {
            acc[0] += color[0];
            acc[1] += color[1];
            acc[2] += color[2];
            return acc;
        }, [0, 0, 0]);
        const n = Math.max(1, bucket.length);
        return [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)];
    });
}

function colorRange(colors) {
    let minR = 255, minG = 255, minB = 255;
    let maxR = 0, maxG = 0, maxB = 0;
    for (const c of colors) {
        if (c[0] < minR) minR = c[0];
        if (c[1] < minG) minG = c[1];
        if (c[2] < minB) minB = c[2];
        if (c[0] > maxR) maxR = c[0];
        if (c[1] > maxG) maxG = c[1];
        if (c[2] > maxB) maxB = c[2];
    }
    return [maxR - minR, maxG - minG, maxB - minB];
}

function classifyPixels(pixels, palette, width, height) {
    const labels = new Uint16Array(width * height);
    labels.fill(65535);
    for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
        if (pixels[i + 3] < 12) continue;
        let best = 0;
        let bestDist = Infinity;
        for (let c = 0; c < palette.length; c++) {
            const color = palette[c];
            const dr = pixels[i] - color[0];
            const dg = pixels[i + 1] - color[1];
            const db = pixels[i + 2] - color[2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                best = c;
            }
        }
        labels[p] = best;
    }
    return labels;
}

function labelComponents(labels, width, height, palette) {
    const total = width * height;
    const components = new Int32Array(total);
    components.fill(-1);
    const componentColors = {};
    let nextId = 0;
    const queue = new Int32Array(total);
    for (let i = 0; i < total; i++) {
        if (components[i] !== -1 || labels[i] === 65535) continue;
        const color = labels[i];
        const id = nextId++;
        componentColors[id] = palette[color];
        let head = 0;
        let tail = 0;
        queue[tail++] = i;
        components[i] = id;
        while (head < tail) {
            const pos = queue[head++];
            const x = pos % width;
            const y = (pos - x) / width;
            if (x > 0 && components[pos - 1] === -1 && labels[pos - 1] === color) {
                components[pos - 1] = id;
                queue[tail++] = pos - 1;
            }
            if (x + 1 < width && components[pos + 1] === -1 && labels[pos + 1] === color) {
                components[pos + 1] = id;
                queue[tail++] = pos + 1;
            }
            if (y > 0 && components[pos - width] === -1 && labels[pos - width] === color) {
                components[pos - width] = id;
                queue[tail++] = pos - width;
            }
            if (y + 1 < height && components[pos + width] === -1 && labels[pos + width] === color) {
                components[pos + width] = id;
                queue[tail++] = pos + width;
            }
        }
    }
    return { components, componentColors };
}

function countRegions(components) {
    const sizes = {};
    for (let i = 0; i < components.length; i++) {
        const id = components[i];
        if (id >= 0) sizes[id] = (sizes[id] || 0) + 1;
    }
    return sizes;
}

function mergeSmallRegions(components, regionSizes, width, height, minSize) {
    const smallIds = new Set();
    for (const [id, size] of Object.entries(regionSizes)) {
        if (size < minSize) smallIds.add(Number(id));
    }
    if (!smallIds.size) return;

    const neighborCounts = new Map();
    const addNeighbor = (smallId, neighborId) => {
        if (neighborId < 0 || neighborId === smallId || smallIds.has(neighborId)) return;
        let counts = neighborCounts.get(smallId);
        if (!counts) {
            counts = new Map();
            neighborCounts.set(smallId, counts);
        }
        counts.set(neighborId, (counts.get(neighborId) || 0) + 1);
    };

    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
            const idx = row + x;
            const id = components[idx];
            if (x + 1 < width) {
                const right = components[idx + 1];
                if (id !== right) {
                    if (smallIds.has(id)) addNeighbor(id, right);
                    if (smallIds.has(right)) addNeighbor(right, id);
                }
            }
            if (y + 1 < height) {
                const down = components[idx + width];
                if (id !== down) {
                    if (smallIds.has(id)) addNeighbor(id, down);
                    if (smallIds.has(down)) addNeighbor(down, id);
                }
            }
        }
    }

    const replacements = new Map();
    neighborCounts.forEach((counts, smallId) => {
        let bestNeighbor = -1;
        let bestCount = 0;
        counts.forEach((count, neighborId) => {
            if (count > bestCount) {
                bestCount = count;
                bestNeighbor = neighborId;
            }
        });
        if (bestNeighbor >= 0) replacements.set(smallId, bestNeighbor);
    });
    if (!replacements.size) return;
    for (let i = 0; i < components.length; i++) {
        const next = replacements.get(components[i]);
        if (next !== undefined) components[i] = next;
    }
}

function traceMaskToPath(mask, width, height, opts = {}) {
    const contour = traceBoundaryPixels(mask, width, height);
    if (!contour || contour.length < 4) return [];
    const detail = opts.detail ?? 1;
    const sensitivity = normalizeSensitivity(opts.sensitivity);
    const baseTolerance = [3.4, 1.8, 0.8][detail] || 1.8;
    const tolerance = Math.max(0.35, baseTolerance * ((115 - sensitivity) / 100));
    let simplified = douglasPeucker(contour, tolerance);
    simplified = capPathPoints(contour, simplified, opts.maxPoints || 0, tolerance);
    if (!simplified || simplified.length < 3) return [];
    const finalPath = opts.smooth !== false ? smoothPath(simplified) : simplified;
    return capPathPoints(finalPath, finalPath, opts.maxPoints || 0, tolerance);
}

function traceBoundaryPixels(mask, width, height) {
    const paddedWidth = width + 2;
    const paddedHeight = height + 2;
    const padded = new Uint8Array(paddedWidth * paddedHeight);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            padded[(y + 1) * paddedWidth + (x + 1)] = mask[y * width + x];
        }
    }
    const get = (x, y) => padded[y * paddedWidth + x];
    const isBoundary = (x, y) => get(x, y) === 1 && (!get(x - 1, y) || !get(x + 1, y) || !get(x, y - 1) || !get(x, y + 1));
    let start = null;
    for (let y = 1; y < paddedHeight - 1 && !start; y++) {
        for (let x = 1; x < paddedWidth - 1; x++) {
            if (isBoundary(x, y)) {
                start = { x, y };
                break;
            }
        }
    }
    if (!start) return [];
    const dirs = [
        { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
        { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }
    ];
    const dirIndexFor = (from, to) => dirs.findIndex(d => from.x + d.x === to.x && from.y + d.y === to.y);
    const contour = [];
    const maxSteps = width * height * 8;
    const visited = new Map();
    let current = start;
    let previous = { x: start.x - 1, y: start.y };
    const startPrevious = { ...previous };
    let steps = 0;
    do {
        const prevIndex = dirIndexFor(current, previous);
        const state = (current.y * paddedWidth + current.x) * 9 + prevIndex + 1;
        if (visited.has(state)) { contour.splice(0, visited.get(state)); break; }
        visited.set(state, contour.length);
        contour.push({ x: current.x - 1.5, y: current.y - 1.5 });
        let next = null;
        let nextPrevious = null;
        for (let offset = 1; offset <= 8; offset++) {
            const idx = (prevIndex + offset + 8) % 8;
            const probe = { x: current.x + dirs[idx].x, y: current.y + dirs[idx].y };
            if (get(probe.x, probe.y) === 1) {
                next = probe;
                const backIdx = (idx + 7) % 8;
                nextPrevious = { x: current.x + dirs[backIdx].x, y: current.y + dirs[backIdx].y };
                break;
            }
        }
        if (!next) break;
        previous = nextPrevious;
        current = next;
        steps++;
    } while (
        steps < maxSteps &&
        !(current.x === start.x && current.y === start.y && previous.x === startPrevious.x && previous.y === startPrevious.y)
    );
    if (contour.length > 1) {
        const first = contour[0];
        const last = contour[contour.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) < 0.5) contour.pop();
    }
    return contour;
}

function douglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let maxIdx = 0;
    const start = points[0];
    const end = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
        const d = pointToLineDist(points[i], start, end);
        if (d > maxDist) {
            maxDist = d;
            maxIdx = i;
        }
    }
    if (maxDist > epsilon) {
        const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
        const right = douglasPeucker(points.slice(maxIdx), epsilon);
        return left.slice(0, -1).concat(right);
    }
    return [start, end];
}

function pointToLineDist(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
}

function capPathPoints(sourcePoints, points, maxPoints, tolerance = 1) {
    if (!maxPoints || !points || points.length <= maxPoints) return points;
    let epsilon = Math.max(0.75, tolerance * 1.35);
    let simplified = points;
    for (let i = 0; i < 7 && simplified.length > maxPoints; i++) {
        simplified = douglasPeucker(sourcePoints, epsilon);
        epsilon *= 1.65;
    }
    if (simplified.length <= maxPoints) return simplified;
    const sampled = [];
    const step = simplified.length / maxPoints;
    for (let i = 0; i < maxPoints; i++) sampled.push(simplified[Math.floor(i * step)]);
    return sampled;
}

function smoothPath(points) {
    if (points.length < 3) return points;
    const n = points.length;
    const cornerCosThreshold = Math.cos(Math.PI * 50 / 180);
    const isCorner = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n];
        const curr = points[i];
        const next = points[(i + 1) % n];
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;
        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);
        if (len1 < 0.5 || len2 < 0.5) continue;
        const cos = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
        isCorner[i] = cos < cornerCosThreshold;
    }
    const result = [];
    for (let i = 0; i < n; i++) {
        const curr = points[i];
        const next = points[(i + 1) % n];
        const nextIsCorner = isCorner[(i + 1) % n];
        if (isCorner[i]) {
            result.push({ x: curr.x, y: curr.y });
            if (!nextIsCorner) result.push({ x: curr.x * 0.25 + next.x * 0.75, y: curr.y * 0.25 + next.y * 0.75 });
        } else {
            result.push({ x: curr.x * 0.75 + next.x * 0.25, y: curr.y * 0.75 + next.y * 0.25 });
            if (!nextIsCorner) result.push({ x: curr.x * 0.25 + next.x * 0.75, y: curr.y * 0.25 + next.y * 0.75 });
        }
    }
    return result;
}

function sampleEdgeBackground(data, width, height) {
    const colors = [];
    const step = Math.max(1, Math.floor(Math.max(width, height) / 32));
    for (let x = 0; x < width; x += step) {
        pushColor(colors, data, x, 0, width);
        pushColor(colors, data, x, height - 1, width);
    }
    for (let y = 0; y < height; y += step) {
        pushColor(colors, data, 0, y, width);
        pushColor(colors, data, width - 1, y, width);
    }
    if (!colors.length) return [255, 255, 255];
    const sum = colors.reduce((acc, c) => {
        acc[0] += c[0];
        acc[1] += c[1];
        acc[2] += c[2];
        return acc;
    }, [0, 0, 0]);
    return [Math.round(sum[0] / colors.length), Math.round(sum[1] / colors.length), Math.round(sum[2] / colors.length)];
}

function pushColor(colors, data, x, y, width) {
    const idx = (y * width + x) * 4;
    if (data[idx + 3] >= 12) colors.push([data[idx], data[idx + 1], data[idx + 2]]);
}

function buildPreviewBuffer(components, componentColors, validRegions, width, height) {
    const validSet = new Set(validRegions);
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < components.length; i++) {
        const id = components[i];
        if (!validSet.has(id) || !componentColors[id]) continue;
        const color = componentColors[id];
        const pi = i * 4;
        data[pi] = color[0];
        data[pi + 1] = color[1];
        data[pi + 2] = color[2];
        data[pi + 3] = 255;
    }
    return data.buffer;
}

function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
