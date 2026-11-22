/**
 * Rigging System — Bone & Pin deformation for images
 * 
 * Provides mesh-based image deformation using pins (control points) and bones
 * (parent-child joint hierarchy). Integrates with the animation engine for
 * pose keyframing and playback.
 */

// ── Static utilities for mesh operations (used during both editing and playback) ──

class RiggingUtils {

    static _getDeformationMode(rigging) {
        return rigging?.deformationMode === 'mesh' ? 'mesh' : 'skeletal';
    }

    /** Ensure a mesh grid exists and weights are computed for the given rigging data */
    static ensureMesh(rigging) {
        if (!rigging || !rigging.pins) return null;

        const density = rigging.meshDensity || 8;
        let mesh = rigging._meshCache;

        // Rebuild if density changed or mesh doesn't exist
        if (!mesh || mesh._density !== density) {
            mesh = RiggingUtils._buildGrid(density);
            rigging._meshCache = mesh;
        }

        // Rebuild weights if pins or bones changed
        const pinHash = rigging.pins.map(p => `${p.id}:${p.restX.toFixed(5)},${p.restY.toFixed(5)}`).join('|');
        const boneHash = (rigging.bones || []).map(b => `${b.parentPinId}-${b.childPinId}`).join('|');
        const fullHash = pinHash + '||' + boneHash + '||' + RiggingUtils._getDeformationMode(rigging);
        if (mesh._pinHash !== fullHash) {
            RiggingUtils._computeWeights(mesh, rigging.pins, rigging.bones || [], RiggingUtils._getDeformationMode(rigging));
            mesh._pinHash = fullHash;
        }

        return mesh;
    }

    /** Build a regular grid mesh in normalized [0,1] space */
    static _buildGrid(density) {
        const cols = density, rows = density;
        const vertices = [];
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                vertices.push({
                    origX: c / cols,
                    origY: r / rows,
                    x: c / cols,
                    y: r / rows,
                    weights: []
                });
            }
        }
        const triangles = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tl = r * (cols + 1) + c;
                const tr = tl + 1;
                const bl = (r + 1) * (cols + 1) + c;
                const br = bl + 1;
                triangles.push([tl, tr, bl]);
                triangles.push([tr, br, bl]);
            }
        }
        return { vertices, triangles, _density: density, _pinHash: null };
    }

    /**
     * Compute vertex weights using bone-aware skinning (if bones exist)
     * or improved distance-based falloff (if no bones).
     * 
     * With bones: each vertex is influenced primarily by nearby bone segments,
     * using Gaussian falloff from the bone's line segment. Weight is distributed
     * between a bone's parent and child pins based on projection position.
     * Without bones: sharper inverse-distance falloff (power=4) for more locality.
     */
    static _computeWeights(mesh, pins, bones, mode) {
        mesh.vertices.forEach(v => {
            v.binding = null;
            if (pins.length === 0) { v.weights = []; return; }
            if (pins.length === 1) {
                v.weights = [{ pinId: pins[0].id, weight: 1 }];
                return;
            }

            if (mode === 'skeletal' && bones && bones.length > 0) {
                RiggingUtils._computeSkeletalBinding(v, pins, bones);
                return;
            }

            const rawWeights = {};
            pins.forEach(p => { rawWeights[p.id] = 0; });

            if (bones && bones.length > 0) {
                RiggingUtils._computeBoneSkinWeights(v, pins, bones, rawWeights);
            } else {
                RiggingUtils._computeDistanceSkinWeights(v, pins, rawWeights);
            }

            // Normalize and filter negligible weights
            let total = 0;
            for (const id in rawWeights) total += rawWeights[id];

            v.weights = [];
            if (total > 0) {
                for (const id in rawWeights) {
                    const w = rawWeights[id] / total;
                    if (w > 0.001) v.weights.push({ pinId: id, weight: w });
                }
            } else {
                // Fallback: nearest pin gets full weight
                let nearest = pins[0], minDist = Infinity;
                pins.forEach(p => {
                    const d = Math.hypot(v.origX - p.restX, v.origY - p.restY);
                    if (d < minDist) { minDist = d; nearest = p; }
                });
                v.weights = [{ pinId: nearest.id, weight: 1 }];
            }
        });
    }

    static _computeSkeletalBinding(v, pins, bones) {
        const pinMap = {};
        pins.forEach(pin => { pinMap[pin.id] = pin; });

        // Build bone-chain depth map: spine/head bones get depth 0 (root chain),
        // limb bones get higher depth. Used to break ties in favour of core bones.
        const childToBone = {};
        bones.forEach(b => { childToBone[b.childPinId] = b; });
        const boneDepthCache = new Map();
        const getBoneChainDepth = (bone) => {
            if (boneDepthCache.has(bone)) return boneDepthCache.get(bone);
            // Count how many branches from the root spine this bone is
            const parentBone = childToBone[bone.parentPinId];
            let depth = parentBone ? getBoneChainDepth(parentBone) : 0;
            // Bones that branch off the spine (clavicles, hip joints) start a new limb
            const parentIsSpineChild = parentBone && !childToBone[parentBone.parentPinId];
            const parentHasMultipleChildren = bones.filter(b => b.parentPinId === bone.parentPinId).length > 1;
            if (parentHasMultipleChildren && depth === 0) depth = 1;
            else if (depth > 0) depth++;
            boneDepthCache.set(bone, depth);
            return depth;
        };
        bones.forEach(b => getBoneChainDepth(b));

        let bestBinding = null;
        let bestScore = Infinity;

        bones.forEach(bone => {
            const parentPin = pinMap[bone.parentPinId];
            const childPin = pinMap[bone.childPinId];
            if (!parentPin || !childPin) return;

            const boneDx = childPin.restX - parentPin.restX;
            const boneDy = childPin.restY - parentPin.restY;
            const restLength = Math.hypot(boneDx, boneDy);
            if (restLength < 1e-6) return;

            const unitX = boneDx / restLength;
            const unitY = boneDy / restLength;
            const perpX = -unitY;
            const perpY = unitX;
            const localX = v.origX - parentPin.restX;
            const localY = v.origY - parentPin.restY;
            const localAlong = localX * unitX + localY * unitY;

            // Perpendicular distance to the bone segment (clamped projection)
            const clampedAlong = Math.max(0, Math.min(restLength, localAlong));
            const closestX = parentPin.restX + unitX * clampedAlong;
            const closestY = parentPin.restY + unitY * clampedAlong;
            const perpDistSq = (v.origX - closestX) ** 2 + (v.origY - closestY) ** 2;

            // Penalise limb bones: add 15% distance penalty per depth level.
            // This makes spine/head bones (depth 0) win over clavicles/arms (depth 1+)
            // when the perpendicular distances are close.
            const depth = boneDepthCache.get(bone) || 0;
            const score = perpDistSq * (1 + depth * 0.15);

            if (score < bestScore) {
                bestScore = score;
                bestBinding = {
                    type: 'bone',
                    parentPinId: bone.parentPinId,
                    childPinId: bone.childPinId,
                    localAlong,
                    localPerp: localX * perpX + localY * perpY,
                    unitX,
                    unitY
                };
            }
        });

        if (!bestBinding) {
            let nearest = pins[0];
            let minDistSq = Infinity;
            pins.forEach(pin => {
                const distSq = (v.origX - pin.restX) ** 2 + (v.origY - pin.restY) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearest = pin;
                }
            });
            v.binding = { type: 'pin', pinId: nearest.id };
            v.weights = [{ pinId: nearest.id, weight: 1 }];
            return;
        }

        v.binding = bestBinding;
        v.weights = [];
    }

    /**
     * Bone-segment-aware skinning: for each bone, project the vertex onto the
     * bone's line segment, compute Gaussian falloff from that projection, and
     * distribute influence between the bone's parent and child pins based on
     * the projection position (t) along the bone.
     */
    static _computeBoneSkinWeights(v, pins, bones, rawWeights) {
        const pinMap = {};
        pins.forEach(p => { pinMap[p.id] = p; });

        // Compute average bone length for Gaussian sigma
        let totalBoneLen = 0, validBones = 0;
        bones.forEach(bone => {
            const p1 = pinMap[bone.parentPinId], p2 = pinMap[bone.childPinId];
            if (p1 && p2) {
                totalBoneLen += Math.hypot(p2.restX - p1.restX, p2.restY - p1.restY);
                validBones++;
            }
        });
        const avgBoneLen = validBones > 0 ? totalBoneLen / validBones : 0.2;
        // Sigma controls locality — smaller = tighter influence zones
        const sigma = Math.max(avgBoneLen * 0.25, 0.04);
        const invTwoSigma2 = 1 / (2 * sigma * sigma);

        bones.forEach(bone => {
            const p1 = pinMap[bone.parentPinId], p2 = pinMap[bone.childPinId];
            if (!p1 || !p2) return;

            // Project vertex onto the bone line segment
            const bx = p2.restX - p1.restX, by = p2.restY - p1.restY;
            const bLen2 = bx * bx + by * by;
            let t = 0.5;
            if (bLen2 > 1e-8) {
                t = ((v.origX - p1.restX) * bx + (v.origY - p1.restY) * by) / bLen2;
                t = Math.max(0, Math.min(1, t));
            }

            // Distance from vertex to closest point on bone segment
            const cx = p1.restX + t * bx, cy = p1.restY + t * by;
            const dist2 = (v.origX - cx) ** 2 + (v.origY - cy) ** 2;

            // Gaussian falloff — drops off sharply with distance from bone
            const influence = Math.exp(-dist2 * invTwoSigma2);
            if (influence < 0.001) return;

            // Distribute between parent (1-t) and child (t) based on bone position
            rawWeights[bone.parentPinId] += influence * (1 - t);
            rawWeights[bone.childPinId] += influence * t;
        });

        // Pins not connected to any bone get direct distance-based influence
        const connected = new Set();
        bones.forEach(b => { connected.add(b.parentPinId); connected.add(b.childPinId); });
        pins.forEach(pin => {
            if (connected.has(pin.id)) return;
            const dist2 = (v.origX - pin.restX) ** 2 + (v.origY - pin.restY) ** 2;
            rawWeights[pin.id] += Math.exp(-dist2 * invTwoSigma2);
        });
    }

    /** Distance-based skinning with sharper falloff (power=4, up from 2.5) */
    static _computeDistanceSkinWeights(v, pins, rawWeights) {
        const power = 4;
        pins.forEach(pin => {
            const dx = v.origX - pin.restX, dy = v.origY - pin.restY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            rawWeights[pin.id] = 1 / Math.pow(dist + 0.0001, power);
        });
    }

    /** Deform mesh vertices based on current pin displacements from rest */
    static deformMesh(rigging) {
        const mesh = RiggingUtils.ensureMesh(rigging);
        if (!mesh) return null;

        const pins = rigging.pins;
        if (pins.length === 0) return mesh;

        if (RiggingUtils._getDeformationMode(rigging) === 'skeletal' && (rigging.bones || []).length > 0) {
            return RiggingUtils._deformMeshSkeletal(mesh, rigging);
        }

        return RiggingUtils._deformMeshSmooth(mesh, rigging);
    }

    static _deformMeshSmooth(mesh, rigging) {
        const pins = rigging.pins;

        // Build displacement map
        const disp = {};
        pins.forEach(p => { disp[p.id] = { dx: p.x - p.restX, dy: p.y - p.restY }; });

        mesh.vertices.forEach(v => {
            let dx = 0, dy = 0;
            v.weights.forEach(w => {
                const d = disp[w.pinId];
                if (d) { dx += d.dx * w.weight; dy += d.dy * w.weight; }
            });
            v.x = v.origX + dx;
            v.y = v.origY + dy;
        });
        return mesh;
    }

    static _deformMeshSkeletal(mesh, rigging) {
        const pinMap = {};
        rigging.pins.forEach(pin => { pinMap[pin.id] = pin; });

        mesh.vertices.forEach(v => {
            const binding = v.binding;
            if (!binding) {
                v.x = v.origX;
                v.y = v.origY;
                return;
            }

            if (binding.type === 'pin') {
                const pin = pinMap[binding.pinId];
                if (!pin) {
                    v.x = v.origX;
                    v.y = v.origY;
                    return;
                }
                v.x = v.origX + (pin.x - pin.restX);
                v.y = v.origY + (pin.y - pin.restY);
                return;
            }

            const parentPin = pinMap[binding.parentPinId];
            const childPin = pinMap[binding.childPinId];
            if (!parentPin || !childPin) {
                v.x = v.origX;
                v.y = v.origY;
                return;
            }

            const boneDx = childPin.x - parentPin.x;
            const boneDy = childPin.y - parentPin.y;
            const boneLen = Math.hypot(boneDx, boneDy);
            const unitX = boneLen > 1e-6 ? boneDx / boneLen : binding.unitX;
            const unitY = boneLen > 1e-6 ? boneDy / boneLen : binding.unitY;
            const perpX = -unitY;
            const perpY = unitX;

            v.x = parentPin.x + unitX * binding.localAlong + perpX * binding.localPerp;
            v.y = parentPin.y + unitY * binding.localAlong + perpY * binding.localPerp;
        });

        return mesh;
    }

    /**
     * Render an image using mesh-deformed textured triangles.
     * Returns true if deformation was applied, false if not needed.
     */
    static renderDeformedImage(ctx, obj) {
        const rig = obj.rigging;
        if (!rig || !rig.pins || rig.pins.length === 0) return false;

        // Check if any pin has moved from rest
        const hasMoved = rig.pins.some(p =>
            Math.abs(p.x - p.restX) > 0.0005 || Math.abs(p.y - p.restY) > 0.0005
        );
        if (!hasMoved) return false;

        const mesh = RiggingUtils.deformMesh(rig);
        if (!mesh) return false;

        const imgSource = obj._eraserCanvas || obj.imageElement;
        if (!imgSource) return false;

        const imgW = imgSource.naturalWidth || imgSource.width;
        const imgH = imgSource.naturalHeight || imgSource.height;

        ctx.save();

        if (obj.borderRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(obj.x, obj.y, obj.width, obj.height, obj.borderRadius);
            ctx.clip();
        } else {
            ctx.beginPath();
            ctx.rect(obj.x, obj.y, obj.width, obj.height);
            ctx.clip();
        }

        // Apply image filters
        const filters = [];
        if (obj.imgBrightness) filters.push(`brightness(${1 + obj.imgBrightness / 100})`);
        if (obj.imgContrast) filters.push(`contrast(${1 + obj.imgContrast / 100})`);
        if (obj.imgSaturation) filters.push(`saturate(${1 + obj.imgSaturation / 100})`);
        if (obj.imgHue) filters.push(`hue-rotate(${obj.imgHue}deg)`);
        if (obj.imgBlur) filters.push(`blur(${obj.imgBlur}px)`);
        if (obj.imgGrayscale) filters.push(`grayscale(${obj.imgGrayscale}%)`);
        if (obj.imgSepia) filters.push(`sepia(${obj.imgSepia}%)`);
        if (obj.imgInvert) filters.push(`invert(${obj.imgInvert}%)`);
        if (filters.length > 0) ctx.filter = filters.join(' ');

        mesh.triangles.forEach(tri => {
            const v0 = mesh.vertices[tri[0]];
            const v1 = mesh.vertices[tri[1]];
            const v2 = mesh.vertices[tri[2]];

            // Source: original vertex positions → image pixel coords
            const s0x = v0.origX * imgW, s0y = v0.origY * imgH;
            const s1x = v1.origX * imgW, s1y = v1.origY * imgH;
            const s2x = v2.origX * imgW, s2y = v2.origY * imgH;

            // Dest: deformed vertex positions → stage coords
            const d0x = obj.x + v0.x * obj.width,  d0y = obj.y + v0.y * obj.height;
            const d1x = obj.x + v1.x * obj.width,  d1y = obj.y + v1.y * obj.height;
            const d2x = obj.x + v2.x * obj.width,  d2y = obj.y + v2.y * obj.height;

            RiggingUtils._drawTexturedTriangle(ctx, imgSource,
                s0x, s0y, s1x, s1y, s2x, s2y,
                d0x, d0y, d1x, d1y, d2x, d2y);
        });

        ctx.filter = 'none';

        // Tint overlay
        if (obj.imgTintAmount > 0) {
            ctx.globalAlpha = obj.imgTintAmount / 100;
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = obj.imgTintColor;
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = obj.opacity;
        }

        ctx.restore();
        return true;
    }

    /** Draw one textured triangle mapping source→dest via affine transform */
    static _drawTexturedTriangle(ctx, img, s0x, s0y, s1x, s1y, s2x, s2y, d0x, d0y, d1x, d1y, d2x, d2y) {
        const denom = s0x * (s1y - s2y) + s1x * (s2y - s0y) + s2x * (s0y - s1y);
        if (Math.abs(denom) < 1e-10) return;

        ctx.save();

        // Clip to destination triangle (in current coordinate space, respects rotation/scale)
        ctx.beginPath();
        ctx.moveTo(d0x, d0y);
        ctx.lineTo(d1x, d1y);
        ctx.lineTo(d2x, d2y);
        ctx.closePath();
        ctx.clip();

        // Compute affine mapping: source image pixels → destination object coords
        const a  = (d0x * (s1y - s2y) + d1x * (s2y - s0y) + d2x * (s0y - s1y)) / denom;
        const b  = (d0x * (s2x - s1x) + d1x * (s0x - s2x) + d2x * (s1x - s0x)) / denom;
        const tx = d0x - a * s0x - b * s0y;
        const c  = (d0y * (s1y - s2y) + d1y * (s2y - s0y) + d2y * (s0y - s1y)) / denom;
        const d  = (d0y * (s2x - s1x) + d1y * (s0x - s2x) + d2y * (s1x - s0x)) / denom;
        const ty = d0y - c * s0x - d * s0y;

        // Compose with existing transform (rotation/scale from render())
        ctx.transform(a, c, b, d, tx, ty);
        ctx.drawImage(img, 0, 0);

        ctx.restore();
    }

    /** Interpolate between two pose snapshots: { pinId: {x,y}, ... } */
    static interpolatePoses(pose1, pose2, t) {
        const result = {};
        const allKeys = new Set([...Object.keys(pose1 || {}), ...Object.keys(pose2 || {})]);
        allKeys.forEach(pinId => {
            const p1 = pose1?.[pinId];
            const p2 = pose2?.[pinId];
            if (p1 && p2) {
                result[pinId] = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
            } else if (p1) {
                result[pinId] = { x: p1.x, y: p1.y };
            } else if (p2) {
                result[pinId] = { x: p2.x, y: p2.y };
            }
        });
        return result;
    }

    /**
     * Given an array of keyframes [ { t: 0..1, pose: {...} }, ... ]
     * and a progress value 0..1, return the interpolated pose.
     */
    static interpolateKeyframePoses(keyframes, progress) {
        if (!keyframes || keyframes.length === 0) return {};
        if (keyframes.length === 1) return keyframes[0].pose;

        // Clamp
        if (progress <= keyframes[0].t) return keyframes[0].pose;
        if (progress >= keyframes[keyframes.length - 1].t) return keyframes[keyframes.length - 1].pose;

        // Find surrounding keyframes
        let k0 = keyframes[0], k1 = keyframes[keyframes.length - 1];
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (progress >= keyframes[i].t && progress <= keyframes[i + 1].t) {
                k0 = keyframes[i];
                k1 = keyframes[i + 1];
                break;
            }
        }

        const range = k1.t - k0.t;
        const localT = range > 0 ? (progress - k0.t) / range : 0;
        return RiggingUtils.interpolatePoses(k0.pose, k1.pose, localT);
    }

    /** Apply a pose snapshot to an object's rigging pins.
     *  Respects pin.anchor — anchored pins are never moved by animations.
     */
    static applyPoseToObject(obj, pose) {
        if (!obj.rigging || !pose) return;
        obj.rigging.pins.forEach(pin => {
            if (pin.anchor) return;          // anchored pins are immovable
            if (pose[pin.id]) {
                pin.x = pose[pin.id].x;
                pin.y = pose[pin.id].y;
            }
        });
    }
}


// ── Rig Presets — Pre-built skeleton configurations ──

class RigPresets {
    /**
     * Get all available rig presets.
     * Each preset contains pins (in normalized 0–1 space) and bones with constraints.
     */
    static getAll() {
        return [
            this.humanFront(),
            this.humanSide(),
            this.quadruped(),
            this.simpleUpperBody(),
            this.bird(),
            this.spider(),
            this.fish(),
            this.facialRig(),
            this.centaur(),
            this.biped()
        ];
    }

    static getByKey(key) {
        return this.getAll().find(p => p.key === key) || null;
    }

    /**
     * Front-facing human — full body skeleton with anatomical joints.
     * 7.5 head proportions, symmetrical, with rotation constraints.
     * Pin positions in normalized [0,1] space (0,0 = top-left of image).
     */
    static humanFront() {
        const pins = [
            // Spine & head (center axis)
            { id: 'pin-0',  restX: 0.50, restY: 0.06, label: 'Head Top' },
            { id: 'pin-1',  restX: 0.50, restY: 0.13, label: 'Head Center' },
            { id: 'pin-2',  restX: 0.50, restY: 0.20, label: 'Neck' },
            { id: 'pin-3',  restX: 0.50, restY: 0.31, label: 'Chest' },
            { id: 'pin-4',  restX: 0.50, restY: 0.43, label: 'Waist' },
            { id: 'pin-5',  restX: 0.50, restY: 0.50, label: 'Hip Center' },

            // Right arm (viewer's left side of image)
            { id: 'pin-6',  restX: 0.35, restY: 0.26, label: 'R Shoulder' },
            { id: 'pin-7',  restX: 0.26, restY: 0.30, label: 'R Upper Arm' },
            { id: 'pin-8',  restX: 0.20, restY: 0.40, label: 'R Elbow' },
            { id: 'pin-9',  restX: 0.13, restY: 0.53, label: 'R Wrist' },
            { id: 'pin-10', restX: 0.10, restY: 0.58, label: 'R Hand' },

            // Left arm (viewer's right side of image)
            { id: 'pin-11', restX: 0.65, restY: 0.26, label: 'L Shoulder' },
            { id: 'pin-12', restX: 0.74, restY: 0.30, label: 'L Upper Arm' },
            { id: 'pin-13', restX: 0.80, restY: 0.40, label: 'L Elbow' },
            { id: 'pin-14', restX: 0.87, restY: 0.53, label: 'L Wrist' },
            { id: 'pin-15', restX: 0.90, restY: 0.58, label: 'L Hand' },

            // Right leg
            { id: 'pin-16', restX: 0.43, restY: 0.53, label: 'R Hip' },
            { id: 'pin-17', restX: 0.41, restY: 0.68, label: 'R Knee' },
            { id: 'pin-18', restX: 0.40, restY: 0.84, label: 'R Ankle' },
            { id: 'pin-19', restX: 0.37, restY: 0.92, label: 'R Foot' },

            // Left leg
            { id: 'pin-20', restX: 0.57, restY: 0.53, label: 'L Hip' },
            { id: 'pin-21', restX: 0.59, restY: 0.68, label: 'L Knee' },
            { id: 'pin-22', restX: 0.60, restY: 0.84, label: 'L Ankle' },
            { id: 'pin-23', restX: 0.63, restY: 0.92, label: 'L Foot' }
        ];

        const bones = [
            // Spine chain: hip → waist → chest → neck → head center → head top
            { parentPinId: 'pin-5',  childPinId: 'pin-4',  name: 'Lower Spine',  stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-4',  childPinId: 'pin-3',  name: 'Upper Spine',  stiffness: 0.85, minAngle: -25, maxAngle: 25 },
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Neck',         stiffness: 0.8, minAngle: -45, maxAngle: 45 },
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Head',         stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Head Top',     stiffness: 1.0, minAngle: null, maxAngle: null },

            // Right arm: chest → R shoulder → R elbow → R wrist → R hand
            { parentPinId: 'pin-3',  childPinId: 'pin-6',  name: 'R Clavicle',   stiffness: 0.9, minAngle: -30, maxAngle: 45 },
            { parentPinId: 'pin-6',  childPinId: 'pin-7',  name: 'R Shoulder',   stiffness: 0.88, minAngle: -55, maxAngle: 55 },
            { parentPinId: 'pin-7',  childPinId: 'pin-8',  name: 'R Upper Arm',  stiffness: 0.82, minAngle: -150, maxAngle: 20 },
            { parentPinId: 'pin-8',  childPinId: 'pin-9',  name: 'R Forearm',    stiffness: 0.8, minAngle: -80, maxAngle: 80 },
            { parentPinId: 'pin-9',  childPinId: 'pin-10', name: 'R Hand',       stiffness: 0.7, minAngle: -60, maxAngle: 60 },

            // Left arm: chest → L shoulder → L elbow → L wrist → L hand
            { parentPinId: 'pin-3',  childPinId: 'pin-11', name: 'L Clavicle',   stiffness: 0.9, minAngle: -45, maxAngle: 30 },
            { parentPinId: 'pin-11', childPinId: 'pin-12', name: 'L Shoulder',   stiffness: 0.88, minAngle: -55, maxAngle: 55 },
            { parentPinId: 'pin-12', childPinId: 'pin-13', name: 'L Upper Arm',  stiffness: 0.82, minAngle: -20, maxAngle: 150 },
            { parentPinId: 'pin-13', childPinId: 'pin-14', name: 'L Forearm',    stiffness: 0.8, minAngle: -80, maxAngle: 80 },
            { parentPinId: 'pin-14', childPinId: 'pin-15', name: 'L Hand',       stiffness: 0.7, minAngle: -60, maxAngle: 60 },

            // Right leg: hip center → R hip → R knee → R ankle → R foot
            { parentPinId: 'pin-5',  childPinId: 'pin-16', name: 'R Hip Joint',  stiffness: 0.9, minAngle: -120, maxAngle: 45 },
            { parentPinId: 'pin-16', childPinId: 'pin-17', name: 'R Thigh',      stiffness: 0.85, minAngle: -140, maxAngle: -5 },
            { parentPinId: 'pin-17', childPinId: 'pin-18', name: 'R Shin',       stiffness: 0.8, minAngle: -10, maxAngle: 130 },
            { parentPinId: 'pin-18', childPinId: 'pin-19', name: 'R Foot',       stiffness: 0.7, minAngle: -45, maxAngle: 45 },

            // Left leg: hip center → L hip → L knee → L ankle → L foot
            { parentPinId: 'pin-5',  childPinId: 'pin-20', name: 'L Hip Joint',  stiffness: 0.9, minAngle: -45, maxAngle: 120 },
            { parentPinId: 'pin-20', childPinId: 'pin-21', name: 'L Thigh',      stiffness: 0.85, minAngle: 5, maxAngle: 140 },
            { parentPinId: 'pin-21', childPinId: 'pin-22', name: 'L Shin',       stiffness: 0.8, minAngle: -130, maxAngle: 10 },
            { parentPinId: 'pin-22', childPinId: 'pin-23', name: 'L Foot',       stiffness: 0.7, minAngle: -45, maxAngle: 45 }
        ];

        return {
            key: 'human-front',
            name: 'Human (Front)',
            icon: 'fa-male',
            description: 'Full-body front-facing skeleton — 24 pins, 23 bones. Spine, arms, and legs with shoulder, elbow, wrist, knee, and ankle joints.',
            pins,
            bones,
            meshDensity: 10,
            deformationMode: 'skeletal'
        };
    }

    /**
     * Side-facing human — profile view skeleton.
     * All pins along a side profile plane.
     */
    static humanSide() {
        const pins = [
            // Spine & head
            { id: 'pin-0',  restX: 0.45, restY: 0.04, label: 'Head Top' },
            { id: 'pin-1',  restX: 0.48, restY: 0.10, label: 'Head Center' },
            { id: 'pin-2',  restX: 0.45, restY: 0.18, label: 'Neck' },
            { id: 'pin-3',  restX: 0.42, restY: 0.28, label: 'Chest' },
            { id: 'pin-4',  restX: 0.44, restY: 0.42, label: 'Waist' },
            { id: 'pin-5',  restX: 0.46, restY: 0.48, label: 'Hip' },

            // Arm (visible side)
            { id: 'pin-6',  restX: 0.42, restY: 0.23, label: 'Shoulder' },
            { id: 'pin-7',  restX: 0.36, restY: 0.36, label: 'Elbow' },
            { id: 'pin-8',  restX: 0.30, restY: 0.48, label: 'Wrist' },
            { id: 'pin-9',  restX: 0.26, restY: 0.52, label: 'Hand' },

            // Front leg
            { id: 'pin-10', restX: 0.42, restY: 0.50, label: 'Front Hip' },
            { id: 'pin-11', restX: 0.38, restY: 0.66, label: 'Front Knee' },
            { id: 'pin-12', restX: 0.40, restY: 0.84, label: 'Front Ankle' },
            { id: 'pin-13', restX: 0.36, restY: 0.92, label: 'Front Foot' },

            // Back leg
            { id: 'pin-14', restX: 0.52, restY: 0.50, label: 'Back Hip' },
            { id: 'pin-15', restX: 0.56, restY: 0.66, label: 'Back Knee' },
            { id: 'pin-16', restX: 0.54, restY: 0.84, label: 'Back Ankle' },
            { id: 'pin-17', restX: 0.50, restY: 0.92, label: 'Back Foot' }
        ];

        const bones = [
            // Spine
            { parentPinId: 'pin-5',  childPinId: 'pin-4',  name: 'Lower Spine',  stiffness: 0.9, minAngle: -25, maxAngle: 25 },
            { parentPinId: 'pin-4',  childPinId: 'pin-3',  name: 'Upper Spine',  stiffness: 0.85, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Neck',         stiffness: 0.8, minAngle: -40, maxAngle: 40 },
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Head',         stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Head Top',     stiffness: 1.0, minAngle: null, maxAngle: null },

            // Arm
            { parentPinId: 'pin-3',  childPinId: 'pin-6',  name: 'Shoulder',   stiffness: 0.9, minAngle: -60, maxAngle: 160 },
            { parentPinId: 'pin-6',  childPinId: 'pin-7',  name: 'Upper Arm',  stiffness: 0.8, minAngle: -145, maxAngle: -10 },
            { parentPinId: 'pin-7',  childPinId: 'pin-8',  name: 'Forearm',    stiffness: 0.8, minAngle: -70, maxAngle: 70 },
            { parentPinId: 'pin-8',  childPinId: 'pin-9',  name: 'Hand',       stiffness: 0.7, minAngle: -60, maxAngle: 60 },

            // Front leg
            { parentPinId: 'pin-5',  childPinId: 'pin-10', name: 'Front Hip',  stiffness: 0.9, minAngle: -90, maxAngle: 30 },
            { parentPinId: 'pin-10', childPinId: 'pin-11', name: 'Front Thigh',stiffness: 0.85, minAngle: -140, maxAngle: -5 },
            { parentPinId: 'pin-11', childPinId: 'pin-12', name: 'Front Shin', stiffness: 0.8, minAngle: 5, maxAngle: 130 },
            { parentPinId: 'pin-12', childPinId: 'pin-13', name: 'Front Foot', stiffness: 0.7, minAngle: -45, maxAngle: 45 },

            // Back leg
            { parentPinId: 'pin-5',  childPinId: 'pin-14', name: 'Back Hip',   stiffness: 0.9, minAngle: -30, maxAngle: 90 },
            { parentPinId: 'pin-14', childPinId: 'pin-15', name: 'Back Thigh', stiffness: 0.85, minAngle: 5, maxAngle: 140 },
            { parentPinId: 'pin-15', childPinId: 'pin-16', name: 'Back Shin',  stiffness: 0.8, minAngle: -130, maxAngle: -5 },
            { parentPinId: 'pin-16', childPinId: 'pin-17', name: 'Back Foot',  stiffness: 0.7, minAngle: -45, maxAngle: 45 }
        ];

        return {
            key: 'human-side',
            name: 'Human (Side)',
            icon: 'fa-walking',
            description: 'Side-view profile skeleton — 18 pins, 17 bones. Ideal for walk/run cycles.',
            pins,
            bones,
            meshDensity: 10,
            deformationMode: 'skeletal'
        };
    }

    /**
     * Quadruped — four-legged animal (dog, cat, horse, etc.)
     */
    static quadruped() {
        const pins = [
            // Spine
            { id: 'pin-0',  restX: 0.15, restY: 0.30, label: 'Head' },
            { id: 'pin-1',  restX: 0.22, restY: 0.32, label: 'Neck' },
            { id: 'pin-2',  restX: 0.35, restY: 0.33, label: 'Shoulder' },
            { id: 'pin-3',  restX: 0.55, restY: 0.33, label: 'Mid Spine' },
            { id: 'pin-4',  restX: 0.72, restY: 0.32, label: 'Hip' },
            { id: 'pin-5',  restX: 0.88, restY: 0.28, label: 'Tail Base' },
            { id: 'pin-6',  restX: 0.95, restY: 0.20, label: 'Tail Tip' },

            // Front left leg
            { id: 'pin-7',  restX: 0.32, restY: 0.50, label: 'FL Upper' },
            { id: 'pin-8',  restX: 0.30, restY: 0.70, label: 'FL Knee' },
            { id: 'pin-9',  restX: 0.31, restY: 0.88, label: 'FL Paw' },

            // Front right leg
            { id: 'pin-10', restX: 0.38, restY: 0.50, label: 'FR Upper' },
            { id: 'pin-11', restX: 0.40, restY: 0.70, label: 'FR Knee' },
            { id: 'pin-12', restX: 0.39, restY: 0.88, label: 'FR Paw' },

            // Rear left leg
            { id: 'pin-13', restX: 0.68, restY: 0.50, label: 'RL Upper' },
            { id: 'pin-14', restX: 0.66, restY: 0.70, label: 'RL Knee' },
            { id: 'pin-15', restX: 0.67, restY: 0.88, label: 'RL Paw' },

            // Rear right leg
            { id: 'pin-16', restX: 0.76, restY: 0.50, label: 'RR Upper' },
            { id: 'pin-17', restX: 0.78, restY: 0.70, label: 'RR Knee' },
            { id: 'pin-18', restX: 0.77, restY: 0.88, label: 'RR Paw' }
        ];

        const bones = [
            // Spine chain
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Neck',       stiffness: 0.8, minAngle: -50, maxAngle: 50 },
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Head',       stiffness: 0.7, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-2',  childPinId: 'pin-3',  name: 'Front Spine',stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-3',  childPinId: 'pin-4',  name: 'Rear Spine', stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-4',  childPinId: 'pin-5',  name: 'Tail Base',  stiffness: 0.6, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-5',  childPinId: 'pin-6',  name: 'Tail Tip',   stiffness: 0.4, minAngle: -90, maxAngle: 90 },

            // Front left leg
            { parentPinId: 'pin-2',  childPinId: 'pin-7',  name: 'FL Shoulder', stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-7',  childPinId: 'pin-8',  name: 'FL Upper',    stiffness: 0.8, minAngle: -120, maxAngle: -5 },
            { parentPinId: 'pin-8',  childPinId: 'pin-9',  name: 'FL Lower',    stiffness: 0.8, minAngle: 5, maxAngle: 120 },

            // Front right leg
            { parentPinId: 'pin-2',  childPinId: 'pin-10', name: 'FR Shoulder', stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-10', childPinId: 'pin-11', name: 'FR Upper',    stiffness: 0.8, minAngle: -120, maxAngle: -5 },
            { parentPinId: 'pin-11', childPinId: 'pin-12', name: 'FR Lower',    stiffness: 0.8, minAngle: 5, maxAngle: 120 },

            // Rear left leg
            { parentPinId: 'pin-4',  childPinId: 'pin-13', name: 'RL Hip',      stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-13', childPinId: 'pin-14', name: 'RL Upper',    stiffness: 0.8, minAngle: -130, maxAngle: -5 },
            { parentPinId: 'pin-14', childPinId: 'pin-15', name: 'RL Lower',    stiffness: 0.8, minAngle: 5, maxAngle: 130 },

            // Rear right leg
            { parentPinId: 'pin-4',  childPinId: 'pin-16', name: 'RR Hip',      stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-16', childPinId: 'pin-17', name: 'RR Upper',    stiffness: 0.8, minAngle: -130, maxAngle: -5 },
            { parentPinId: 'pin-17', childPinId: 'pin-18', name: 'RR Lower',    stiffness: 0.8, minAngle: 5, maxAngle: 130 }
        ];

        return {
            key: 'quadruped',
            name: 'Quadruped (Animal)',
            icon: 'fa-dog',
            description: 'Four-legged animal — 19 pins, 18 bones. Spine, tail, 4 legs with joints.',
            pins,
            bones,
            meshDensity: 10,
            deformationMode: 'skeletal'
        };
    }

    /**
     * Simple upper body — head, neck, torso, two arms.
     * Fewer pins for simpler characters / busts.
     */
    static simpleUpperBody() {
        const pins = [
            { id: 'pin-0',  restX: 0.50, restY: 0.06, label: 'Head Top' },
            { id: 'pin-1',  restX: 0.50, restY: 0.15, label: 'Head' },
            { id: 'pin-2',  restX: 0.50, restY: 0.25, label: 'Neck' },
            { id: 'pin-3',  restX: 0.50, restY: 0.45, label: 'Chest' },
            { id: 'pin-4',  restX: 0.50, restY: 0.70, label: 'Waist' },

            // Right arm (viewer's left)
            { id: 'pin-5',  restX: 0.32, restY: 0.28, label: 'R Shoulder' },
            { id: 'pin-6',  restX: 0.15, restY: 0.45, label: 'R Elbow' },
            { id: 'pin-7',  restX: 0.08, restY: 0.62, label: 'R Hand' },

            // Left arm (viewer's right)
            { id: 'pin-8',  restX: 0.68, restY: 0.28, label: 'L Shoulder' },
            { id: 'pin-9',  restX: 0.85, restY: 0.45, label: 'L Elbow' },
            { id: 'pin-10', restX: 0.92, restY: 0.62, label: 'L Hand' }
        ];

        const bones = [
            { parentPinId: 'pin-4',  childPinId: 'pin-3',  name: 'Torso',      stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Neck',       stiffness: 0.8, minAngle: -45, maxAngle: 45 },
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Head',       stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Head Top',   stiffness: 1.0, minAngle: null, maxAngle: null },

            { parentPinId: 'pin-3',  childPinId: 'pin-5',  name: 'R Shoulder', stiffness: 0.85, minAngle: -160, maxAngle: 160 },
            { parentPinId: 'pin-5',  childPinId: 'pin-6',  name: 'R Upper Arm',stiffness: 0.8, minAngle: -145, maxAngle: -10 },
            { parentPinId: 'pin-6',  childPinId: 'pin-7',  name: 'R Forearm',  stiffness: 0.8, minAngle: -70, maxAngle: 70 },

            { parentPinId: 'pin-3',  childPinId: 'pin-8',  name: 'L Shoulder', stiffness: 0.85, minAngle: -160, maxAngle: 160 },
            { parentPinId: 'pin-8',  childPinId: 'pin-9',  name: 'L Upper Arm',stiffness: 0.8, minAngle: 10, maxAngle: 145 },
            { parentPinId: 'pin-9',  childPinId: 'pin-10', name: 'L Forearm',  stiffness: 0.8, minAngle: -70, maxAngle: 70 }
        ];

        return {
            key: 'upper-body',
            name: 'Upper Body',
            icon: 'fa-user',
            description: 'Head, torso & arms — 11 pins, 10 bones. For busts and upper-body shots.',
            pins,
            bones,
            meshDensity: 10,
            deformationMode: 'skeletal'
        };
    }

    /**
     * Bird — wings, body, tail, legs. Good for parrots, eagles, etc.
     */
    static bird() {
        const pins = [
            { id: 'pin-0',  restX: 0.18, restY: 0.30, label: 'Head' },
            { id: 'pin-1',  restX: 0.12, restY: 0.32, label: 'Beak Tip' },
            { id: 'pin-2',  restX: 0.28, restY: 0.34, label: 'Neck' },
            { id: 'pin-3',  restX: 0.42, restY: 0.38, label: 'Chest' },
            { id: 'pin-4',  restX: 0.60, restY: 0.36, label: 'Mid Body' },
            { id: 'pin-5',  restX: 0.78, restY: 0.34, label: 'Tail Base' },
            { id: 'pin-6',  restX: 0.90, restY: 0.30, label: 'Tail Tip' },
            // Left wing
            { id: 'pin-7',  restX: 0.42, restY: 0.26, label: 'L Wing Root' },
            { id: 'pin-8',  restX: 0.36, restY: 0.14, label: 'L Wing Mid' },
            { id: 'pin-9',  restX: 0.28, restY: 0.06, label: 'L Wing Tip' },
            // Right wing
            { id: 'pin-10', restX: 0.42, restY: 0.50, label: 'R Wing Root' },
            { id: 'pin-11', restX: 0.36, restY: 0.62, label: 'R Wing Mid' },
            { id: 'pin-12', restX: 0.28, restY: 0.70, label: 'R Wing Tip' },
            // Legs
            { id: 'pin-13', restX: 0.50, restY: 0.54, label: 'L Leg' },
            { id: 'pin-14', restX: 0.50, restY: 0.68, label: 'L Foot' },
            { id: 'pin-15', restX: 0.56, restY: 0.54, label: 'R Leg' },
            { id: 'pin-16', restX: 0.56, restY: 0.68, label: 'R Foot' }
        ];
        const bones = [
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Neck',       stiffness: 0.8, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-2',  childPinId: 'pin-0',  name: 'Head',       stiffness: 0.7, minAngle: -50, maxAngle: 50 },
            { parentPinId: 'pin-0',  childPinId: 'pin-1',  name: 'Beak',       stiffness: 0.9, minAngle: -20, maxAngle: 30 },
            { parentPinId: 'pin-3',  childPinId: 'pin-4',  name: 'Body',       stiffness: 0.95, minAngle: -15, maxAngle: 15 },
            { parentPinId: 'pin-4',  childPinId: 'pin-5',  name: 'Rump',       stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-5',  childPinId: 'pin-6',  name: 'Tail',       stiffness: 0.6, minAngle: -40, maxAngle: 40 },
            // Wings
            { parentPinId: 'pin-3',  childPinId: 'pin-7',  name: 'L Wing Root',stiffness: 0.85, minAngle: -90, maxAngle: 90 },
            { parentPinId: 'pin-7',  childPinId: 'pin-8',  name: 'L Wing Mid', stiffness: 0.8, minAngle: -120, maxAngle: 30 },
            { parentPinId: 'pin-8',  childPinId: 'pin-9',  name: 'L Wing Tip', stiffness: 0.7, minAngle: -90, maxAngle: 45 },
            { parentPinId: 'pin-3',  childPinId: 'pin-10', name: 'R Wing Root',stiffness: 0.85, minAngle: -90, maxAngle: 90 },
            { parentPinId: 'pin-10', childPinId: 'pin-11', name: 'R Wing Mid', stiffness: 0.8, minAngle: -30, maxAngle: 120 },
            { parentPinId: 'pin-11', childPinId: 'pin-12', name: 'R Wing Tip', stiffness: 0.7, minAngle: -45, maxAngle: 90 },
            // Legs
            { parentPinId: 'pin-4',  childPinId: 'pin-13', name: 'L Leg',      stiffness: 0.8, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-13', childPinId: 'pin-14', name: 'L Foot',     stiffness: 0.7, minAngle: -45, maxAngle: 45 },
            { parentPinId: 'pin-4',  childPinId: 'pin-15', name: 'R Leg',      stiffness: 0.8, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-15', childPinId: 'pin-16', name: 'R Foot',     stiffness: 0.7, minAngle: -45, maxAngle: 45 }
        ];
        return {
            key: 'bird', name: 'Bird',
            icon: 'fa-dove',
            description: 'Winged creature — 17 pins, 16 bones. Wings, body, tail, legs.',
            pins, bones, meshDensity: 10, deformationMode: 'skeletal'
        };
    }

    /**
     * Spider / Insect — central body with 8 legs radiating outward.
     */
    static spider() {
        const pins = [
            // Body
            { id: 'pin-0',  restX: 0.36, restY: 0.48, label: 'Head' },
            { id: 'pin-1',  restX: 0.50, restY: 0.50, label: 'Thorax' },
            { id: 'pin-2',  restX: 0.68, restY: 0.50, label: 'Abdomen' },
            // Leg 1 (front-left)
            { id: 'pin-3',  restX: 0.38, restY: 0.34, label: 'L1 Joint' },
            { id: 'pin-4',  restX: 0.26, restY: 0.20, label: 'L1 Tip' },
            // Leg 2 (mid-front-left)
            { id: 'pin-5',  restX: 0.44, restY: 0.32, label: 'L2 Joint' },
            { id: 'pin-6',  restX: 0.36, restY: 0.16, label: 'L2 Tip' },
            // Leg 3 (mid-rear-left)
            { id: 'pin-7',  restX: 0.54, restY: 0.32, label: 'L3 Joint' },
            { id: 'pin-8',  restX: 0.50, restY: 0.16, label: 'L3 Tip' },
            // Leg 4 (rear-left)
            { id: 'pin-9',  restX: 0.62, restY: 0.34, label: 'L4 Joint' },
            { id: 'pin-10', restX: 0.64, restY: 0.18, label: 'L4 Tip' },
            // Leg 1 (front-right)
            { id: 'pin-11', restX: 0.38, restY: 0.66, label: 'R1 Joint' },
            { id: 'pin-12', restX: 0.26, restY: 0.80, label: 'R1 Tip' },
            // Leg 2 (mid-front-right)
            { id: 'pin-13', restX: 0.44, restY: 0.68, label: 'R2 Joint' },
            { id: 'pin-14', restX: 0.36, restY: 0.84, label: 'R2 Tip' },
            // Leg 3 (mid-rear-right)
            { id: 'pin-15', restX: 0.54, restY: 0.68, label: 'R3 Joint' },
            { id: 'pin-16', restX: 0.50, restY: 0.84, label: 'R3 Tip' },
            // Leg 4 (rear-right)
            { id: 'pin-17', restX: 0.62, restY: 0.66, label: 'R4 Joint' },
            { id: 'pin-18', restX: 0.64, restY: 0.82, label: 'R4 Tip' }
        ];
        const legs = [];
        // Generate 8 leg bones from thorax
        const legPairs = [
            ['pin-3','pin-4','L1'], ['pin-5','pin-6','L2'], ['pin-7','pin-8','L3'], ['pin-9','pin-10','L4'],
            ['pin-11','pin-12','R1'], ['pin-13','pin-14','R2'], ['pin-15','pin-16','R3'], ['pin-17','pin-18','R4']
        ];
        legPairs.forEach(([joint, tip, name]) => {
            legs.push({ parentPinId: 'pin-1', childPinId: joint, name: `${name} Shoulder`, stiffness: 0.85, minAngle: -60, maxAngle: 60 });
            legs.push({ parentPinId: joint, childPinId: tip, name: `${name} Leg`, stiffness: 0.8, minAngle: -90, maxAngle: 90 });
        });
        const bones = [
            { parentPinId: 'pin-1', childPinId: 'pin-0', name: 'Head', stiffness: 0.8, minAngle: -40, maxAngle: 40 },
            { parentPinId: 'pin-1', childPinId: 'pin-2', name: 'Abdomen', stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            ...legs
        ];
        return {
            key: 'spider', name: 'Spider / Insect',
            icon: 'fa-spider',
            description: 'Eight-legged creature — 19 pins, 18 bones. Radial leg layout.',
            pins, bones, meshDensity: 10, deformationMode: 'skeletal'
        };
    }

    /**
     * Fish — streamlined body with fins and tail.
     */
    static fish() {
        const pins = [
            { id: 'pin-0',  restX: 0.10, restY: 0.48, label: 'Mouth' },
            { id: 'pin-1',  restX: 0.22, restY: 0.46, label: 'Head' },
            { id: 'pin-2',  restX: 0.38, restY: 0.46, label: 'Front Body' },
            { id: 'pin-3',  restX: 0.55, restY: 0.46, label: 'Mid Body' },
            { id: 'pin-4',  restX: 0.72, restY: 0.46, label: 'Rear Body' },
            { id: 'pin-5',  restX: 0.86, restY: 0.44, label: 'Tail Base' },
            { id: 'pin-6',  restX: 0.94, restY: 0.38, label: 'Tail Top' },
            { id: 'pin-7',  restX: 0.94, restY: 0.54, label: 'Tail Bottom' },
            // Dorsal fin
            { id: 'pin-8',  restX: 0.42, restY: 0.28, label: 'Dorsal Fin' },
            // Pectoral fins
            { id: 'pin-9',  restX: 0.30, restY: 0.60, label: 'L Pectoral' },
            { id: 'pin-10', restX: 0.30, restY: 0.34, label: 'R Pectoral' },
            // Ventral fin
            { id: 'pin-11', restX: 0.56, restY: 0.60, label: 'Ventral Fin' }
        ];
        const bones = [
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Jaw',          stiffness: 0.8, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Head',         stiffness: 0.9, minAngle: -25, maxAngle: 25 },
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Front Spine',  stiffness: 0.9, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-4',  childPinId: 'pin-3',  name: 'Mid Spine',    stiffness: 0.85, minAngle: -25, maxAngle: 25 },
            { parentPinId: 'pin-5',  childPinId: 'pin-4',  name: 'Rear Spine',   stiffness: 0.8, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-5',  childPinId: 'pin-6',  name: 'Tail Upper',   stiffness: 0.6, minAngle: -50, maxAngle: 50 },
            { parentPinId: 'pin-5',  childPinId: 'pin-7',  name: 'Tail Lower',   stiffness: 0.6, minAngle: -50, maxAngle: 50 },
            { parentPinId: 'pin-2',  childPinId: 'pin-8',  name: 'Dorsal',       stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-2',  childPinId: 'pin-9',  name: 'L Pectoral',   stiffness: 0.7, minAngle: -45, maxAngle: 45 },
            { parentPinId: 'pin-2',  childPinId: 'pin-10', name: 'R Pectoral',   stiffness: 0.7, minAngle: -45, maxAngle: 45 },
            { parentPinId: 'pin-3',  childPinId: 'pin-11', name: 'Ventral',      stiffness: 0.7, minAngle: -30, maxAngle: 30 }
        ];
        return {
            key: 'fish', name: 'Fish',
            icon: 'fa-fish',
            description: 'Streamlined body — 12 pins, 11 bones. Spine, tail, fins.',
            pins, bones, meshDensity: 10, deformationMode: 'skeletal'
        };
    }

    /**
     * Facial rig — close-up face with eyebrows, eyes, mouth.
     * For facial expression animation on portrait/bust images.
     */
    static facialRig() {
        const pins = [
            // Head outline anchors
            { id: 'pin-0',  restX: 0.50, restY: 0.08, label: 'Forehead' },
            { id: 'pin-1',  restX: 0.50, restY: 0.92, label: 'Chin' },
            // Eyebrows
            { id: 'pin-2',  restX: 0.32, restY: 0.30, label: 'R Brow Inner' },
            { id: 'pin-3',  restX: 0.22, restY: 0.28, label: 'R Brow Outer' },
            { id: 'pin-4',  restX: 0.68, restY: 0.30, label: 'L Brow Inner' },
            { id: 'pin-5',  restX: 0.78, restY: 0.28, label: 'L Brow Outer' },
            // Eyes
            { id: 'pin-6',  restX: 0.30, restY: 0.40, label: 'R Eye' },
            { id: 'pin-7',  restX: 0.70, restY: 0.40, label: 'L Eye' },
            // Nose
            { id: 'pin-8',  restX: 0.50, restY: 0.54, label: 'Nose Tip' },
            // Mouth
            { id: 'pin-9',  restX: 0.38, restY: 0.70, label: 'Mouth R' },
            { id: 'pin-10', restX: 0.50, restY: 0.68, label: 'Upper Lip' },
            { id: 'pin-11', restX: 0.62, restY: 0.70, label: 'Mouth L' },
            { id: 'pin-12', restX: 0.50, restY: 0.74, label: 'Lower Lip' },
            // Cheeks
            { id: 'pin-13', restX: 0.18, restY: 0.52, label: 'R Cheek' },
            { id: 'pin-14', restX: 0.82, restY: 0.52, label: 'L Cheek' }
        ];
        const bones = [
            // Brows from forehead
            { parentPinId: 'pin-0',  childPinId: 'pin-2',  name: 'R Brow Inner', stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-2',  childPinId: 'pin-3',  name: 'R Brow Outer', stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-0',  childPinId: 'pin-4',  name: 'L Brow Inner', stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-4',  childPinId: 'pin-5',  name: 'L Brow Outer', stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            // Eyes from brows
            { parentPinId: 'pin-2',  childPinId: 'pin-6',  name: 'R Eye',        stiffness: 0.8, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-4',  childPinId: 'pin-7',  name: 'L Eye',        stiffness: 0.8, minAngle: -20, maxAngle: 20 },
            // Nose from forehead
            { parentPinId: 'pin-0',  childPinId: 'pin-8',  name: 'Nose',         stiffness: 0.95, minAngle: -10, maxAngle: 10 },
            // Mouth from nose
            { parentPinId: 'pin-8',  childPinId: 'pin-10', name: 'Upper Lip',    stiffness: 0.8, minAngle: -15, maxAngle: 15 },
            { parentPinId: 'pin-10', childPinId: 'pin-9',  name: 'Mouth R',      stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-10', childPinId: 'pin-11', name: 'Mouth L',      stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-10', childPinId: 'pin-12', name: 'Lower Lip',    stiffness: 0.7, minAngle: -20, maxAngle: 20 },
            // Chin from lower lip
            { parentPinId: 'pin-12', childPinId: 'pin-1',  name: 'Chin',         stiffness: 0.85, minAngle: -15, maxAngle: 15 },
            // Cheeks from nose (independent)
            { parentPinId: 'pin-8',  childPinId: 'pin-13', name: 'R Cheek',      stiffness: 0.8, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-8',  childPinId: 'pin-14', name: 'L Cheek',      stiffness: 0.8, minAngle: -20, maxAngle: 20 }
        ];
        return {
            key: 'face', name: 'Facial Rig',
            icon: 'fa-smile',
            description: 'Face close-up — 15 pins, 14 bones. Brows, eyes, mouth, cheeks for expressions.',
            pins, bones, meshDensity: 12, deformationMode: 'mesh'
        };
    }

    /**
     * Centaur / Horse-rider hybrid — human upper body + quadruped lower body.
     */
    static centaur() {
        const pins = [
            // Human upper body
            { id: 'pin-0',  restX: 0.20, restY: 0.06, label: 'Head Top' },
            { id: 'pin-1',  restX: 0.22, restY: 0.12, label: 'Head' },
            { id: 'pin-2',  restX: 0.24, restY: 0.20, label: 'Neck' },
            { id: 'pin-3',  restX: 0.26, restY: 0.30, label: 'Chest' },
            // Arms
            { id: 'pin-4',  restX: 0.18, restY: 0.26, label: 'L Shoulder' },
            { id: 'pin-5',  restX: 0.12, restY: 0.36, label: 'L Elbow' },
            { id: 'pin-6',  restX: 0.08, restY: 0.44, label: 'L Hand' },
            { id: 'pin-7',  restX: 0.32, restY: 0.26, label: 'R Shoulder' },
            { id: 'pin-8',  restX: 0.38, restY: 0.36, label: 'R Elbow' },
            { id: 'pin-9',  restX: 0.40, restY: 0.44, label: 'R Hand' },
            // Horse body
            { id: 'pin-10', restX: 0.30, restY: 0.42, label: 'Front Withers' },
            { id: 'pin-11', restX: 0.50, restY: 0.40, label: 'Mid Back' },
            { id: 'pin-12', restX: 0.70, restY: 0.40, label: 'Hip' },
            { id: 'pin-13', restX: 0.84, restY: 0.38, label: 'Tail Base' },
            { id: 'pin-14', restX: 0.92, restY: 0.32, label: 'Tail Tip' },
            // Front legs
            { id: 'pin-15', restX: 0.30, restY: 0.58, label: 'FL Upper' },
            { id: 'pin-16', restX: 0.28, restY: 0.74, label: 'FL Knee' },
            { id: 'pin-17', restX: 0.29, restY: 0.90, label: 'FL Hoof' },
            { id: 'pin-18', restX: 0.36, restY: 0.58, label: 'FR Upper' },
            { id: 'pin-19', restX: 0.38, restY: 0.74, label: 'FR Knee' },
            { id: 'pin-20', restX: 0.37, restY: 0.90, label: 'FR Hoof' },
            // Rear legs
            { id: 'pin-21', restX: 0.66, restY: 0.56, label: 'RL Upper' },
            { id: 'pin-22', restX: 0.64, restY: 0.74, label: 'RL Knee' },
            { id: 'pin-23', restX: 0.65, restY: 0.90, label: 'RL Hoof' },
            { id: 'pin-24', restX: 0.74, restY: 0.56, label: 'RR Upper' },
            { id: 'pin-25', restX: 0.76, restY: 0.74, label: 'RR Knee' },
            { id: 'pin-26', restX: 0.75, restY: 0.90, label: 'RR Hoof' }
        ];
        const bones = [
            // Human upper
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Neck',        stiffness: 0.8, minAngle: -40, maxAngle: 40 },
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Head',        stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Head Top',    stiffness: 1.0, minAngle: null, maxAngle: null },
            { parentPinId: 'pin-3',  childPinId: 'pin-4',  name: 'L Shoulder',  stiffness: 0.85, minAngle: -160, maxAngle: 160 },
            { parentPinId: 'pin-4',  childPinId: 'pin-5',  name: 'L Upper Arm', stiffness: 0.8, minAngle: -145, maxAngle: -10 },
            { parentPinId: 'pin-5',  childPinId: 'pin-6',  name: 'L Forearm',   stiffness: 0.8, minAngle: -70, maxAngle: 70 },
            { parentPinId: 'pin-3',  childPinId: 'pin-7',  name: 'R Shoulder',  stiffness: 0.85, minAngle: -160, maxAngle: 160 },
            { parentPinId: 'pin-7',  childPinId: 'pin-8',  name: 'R Upper Arm', stiffness: 0.8, minAngle: 10, maxAngle: 145 },
            { parentPinId: 'pin-8',  childPinId: 'pin-9',  name: 'R Forearm',   stiffness: 0.8, minAngle: -70, maxAngle: 70 },
            // Horse body
            { parentPinId: 'pin-3',  childPinId: 'pin-10', name: 'Withers',     stiffness: 0.95, minAngle: -20, maxAngle: 20 },
            { parentPinId: 'pin-10', childPinId: 'pin-11', name: 'Front Spine', stiffness: 0.9, minAngle: -15, maxAngle: 15 },
            { parentPinId: 'pin-11', childPinId: 'pin-12', name: 'Rear Spine',  stiffness: 0.9, minAngle: -15, maxAngle: 15 },
            { parentPinId: 'pin-12', childPinId: 'pin-13', name: 'Tail Base',   stiffness: 0.7, minAngle: -40, maxAngle: 40 },
            { parentPinId: 'pin-13', childPinId: 'pin-14', name: 'Tail Tip',    stiffness: 0.5, minAngle: -60, maxAngle: 60 },
            // Front legs
            { parentPinId: 'pin-10', childPinId: 'pin-15', name: 'FL Upper',    stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-15', childPinId: 'pin-16', name: 'FL Lower',    stiffness: 0.8, minAngle: -120, maxAngle: -5 },
            { parentPinId: 'pin-16', childPinId: 'pin-17', name: 'FL Hoof',     stiffness: 0.8, minAngle: 5, maxAngle: 120 },
            { parentPinId: 'pin-10', childPinId: 'pin-18', name: 'FR Upper',    stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-18', childPinId: 'pin-19', name: 'FR Lower',    stiffness: 0.8, minAngle: -120, maxAngle: -5 },
            { parentPinId: 'pin-19', childPinId: 'pin-20', name: 'FR Hoof',     stiffness: 0.8, minAngle: 5, maxAngle: 120 },
            // Rear legs
            { parentPinId: 'pin-12', childPinId: 'pin-21', name: 'RL Upper',    stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-21', childPinId: 'pin-22', name: 'RL Lower',    stiffness: 0.8, minAngle: -130, maxAngle: -5 },
            { parentPinId: 'pin-22', childPinId: 'pin-23', name: 'RL Hoof',     stiffness: 0.8, minAngle: 5, maxAngle: 130 },
            { parentPinId: 'pin-12', childPinId: 'pin-24', name: 'RR Upper',    stiffness: 0.85, minAngle: -60, maxAngle: 60 },
            { parentPinId: 'pin-24', childPinId: 'pin-25', name: 'RR Lower',    stiffness: 0.8, minAngle: -130, maxAngle: -5 },
            { parentPinId: 'pin-25', childPinId: 'pin-26', name: 'RR Hoof',     stiffness: 0.8, minAngle: 5, maxAngle: 130 }
        ];
        return {
            key: 'centaur', name: 'Centaur / Horse-Rider',
            icon: 'fa-horse',
            description: 'Human torso + quadruped body — 27 pins, 26 bones. Arms, 4 legs, tail.',
            pins, bones, meshDensity: 10, deformationMode: 'skeletal'
        };
    }

    /**
     * Generic biped — simplified 2-leg creature (robot, dinosaur, penguin, etc.)
     * Fewer pins than full human, more universal layout.
     */
    static biped() {
        const pins = [
            { id: 'pin-0',  restX: 0.50, restY: 0.08, label: 'Head Top' },
            { id: 'pin-1',  restX: 0.50, restY: 0.16, label: 'Head' },
            { id: 'pin-2',  restX: 0.50, restY: 0.26, label: 'Neck' },
            { id: 'pin-3',  restX: 0.50, restY: 0.40, label: 'Body' },
            { id: 'pin-4',  restX: 0.50, restY: 0.52, label: 'Hip' },
            // Arms / wings / appendages
            { id: 'pin-5',  restX: 0.30, restY: 0.30, label: 'R Arm Root' },
            { id: 'pin-6',  restX: 0.16, restY: 0.42, label: 'R Arm Tip' },
            { id: 'pin-7',  restX: 0.70, restY: 0.30, label: 'L Arm Root' },
            { id: 'pin-8',  restX: 0.84, restY: 0.42, label: 'L Arm Tip' },
            // Legs
            { id: 'pin-9',  restX: 0.40, restY: 0.56, label: 'R Hip' },
            { id: 'pin-10', restX: 0.38, restY: 0.72, label: 'R Knee' },
            { id: 'pin-11', restX: 0.38, restY: 0.88, label: 'R Foot' },
            { id: 'pin-12', restX: 0.60, restY: 0.56, label: 'L Hip' },
            { id: 'pin-13', restX: 0.62, restY: 0.72, label: 'L Knee' },
            { id: 'pin-14', restX: 0.62, restY: 0.88, label: 'L Foot' },
            // Tail (optional — drag off if not needed)
            { id: 'pin-15', restX: 0.50, restY: 0.58, label: 'Tail Base' },
            { id: 'pin-16', restX: 0.50, restY: 0.70, label: 'Tail Tip' }
        ];
        const bones = [
            { parentPinId: 'pin-4',  childPinId: 'pin-3',  name: 'Torso',       stiffness: 0.9, minAngle: -25, maxAngle: 25 },
            { parentPinId: 'pin-3',  childPinId: 'pin-2',  name: 'Neck',        stiffness: 0.8, minAngle: -45, maxAngle: 45 },
            { parentPinId: 'pin-2',  childPinId: 'pin-1',  name: 'Head',        stiffness: 0.7, minAngle: -30, maxAngle: 30 },
            { parentPinId: 'pin-1',  childPinId: 'pin-0',  name: 'Head Top',    stiffness: 1.0, minAngle: null, maxAngle: null },
            // Arms
            { parentPinId: 'pin-3',  childPinId: 'pin-5',  name: 'R Arm Root',  stiffness: 0.85, minAngle: -120, maxAngle: 120 },
            { parentPinId: 'pin-5',  childPinId: 'pin-6',  name: 'R Arm',       stiffness: 0.8, minAngle: -120, maxAngle: 30 },
            { parentPinId: 'pin-3',  childPinId: 'pin-7',  name: 'L Arm Root',  stiffness: 0.85, minAngle: -120, maxAngle: 120 },
            { parentPinId: 'pin-7',  childPinId: 'pin-8',  name: 'L Arm',       stiffness: 0.8, minAngle: -30, maxAngle: 120 },
            // Legs
            { parentPinId: 'pin-4',  childPinId: 'pin-9',  name: 'R Hip',       stiffness: 0.9, minAngle: -90, maxAngle: 45 },
            { parentPinId: 'pin-9',  childPinId: 'pin-10', name: 'R Thigh',     stiffness: 0.85, minAngle: -130, maxAngle: -5 },
            { parentPinId: 'pin-10', childPinId: 'pin-11', name: 'R Shin',      stiffness: 0.8, minAngle: 5, maxAngle: 130 },
            { parentPinId: 'pin-4',  childPinId: 'pin-12', name: 'L Hip',       stiffness: 0.9, minAngle: -45, maxAngle: 90 },
            { parentPinId: 'pin-12', childPinId: 'pin-13', name: 'L Thigh',     stiffness: 0.85, minAngle: 5, maxAngle: 130 },
            { parentPinId: 'pin-13', childPinId: 'pin-14', name: 'L Shin',      stiffness: 0.8, minAngle: -130, maxAngle: -5 },
            // Tail
            { parentPinId: 'pin-4',  childPinId: 'pin-15', name: 'Tail Base',   stiffness: 0.7, minAngle: -50, maxAngle: 50 },
            { parentPinId: 'pin-15', childPinId: 'pin-16', name: 'Tail Tip',    stiffness: 0.5, minAngle: -70, maxAngle: 70 }
        ];
        return {
            key: 'biped', name: 'Generic Biped',
            icon: 'fa-robot',
            description: 'Two-legged creature — 17 pins, 16 bones. Robot, dino, penguin, etc.',
            pins, bones, meshDensity: 10, deformationMode: 'skeletal'
        };
    }
}


// ── Interactive Rigging Manager (handles rig-mode editing) ──

class RiggingManager {
    constructor(objectManager, stageManager) {
        this.objects = objectManager;
        this.stage = stageManager;

        // Rig mode state
        this._rigMode = false;
        this._rigObj = null;
        this._rigTool = 'pin';       // 'pin' | 'bone' | 'bone-select' | 'skeleton' | 'deform'
        this._selectedPinId = null;
        this._selectedBoneId = null;
        this._draggingPinId = null;
        this._draggingConstraintHandle = null;
        this._constraintDragModifiers = null;
        this._draggingBoneListId = null;
        this._draggingBoneListPlacement = 'before';
        this._dragPrevPos = null;     // previous pin position (for FK)
        this._boneStartPinId = null;  // first pin when creating bone
        this._cursorPos = null;       // last known cursor stage position
        this._recordPoseSnapshot = null; // pose snapshot for recording

        this._nextPinId = 0;
        this._nextBoneId = 0;

        this._setupUI();
    }

    // ── Mode management ──

    _isLegacyHumanFrontRig(rig) {
        if (!rig || rig.pins?.length !== 22 || rig.bones?.length !== 21) return false;
        const labels = new Set((rig.pins || []).map(pin => pin.label));
        return labels.has('Head Top') &&
            labels.has('Head Center') &&
            labels.has('Chest') &&
            labels.has('Hip Center') &&
            labels.has('R Shoulder') &&
            labels.has('R Elbow') &&
            labels.has('L Shoulder') &&
            labels.has('L Elbow') &&
            !labels.has('R Upper Arm') &&
            !labels.has('L Upper Arm');
    }

    _upgradeLegacyHumanFrontRig(rig) {
        if (!this._isLegacyHumanFrontRig(rig)) return false;

        const pinById = new Map(rig.pins.map(pin => [pin.id, pin]));
        const makeMidPin = (id, label, startId, endId) => {
            const start = pinById.get(startId);
            const end = pinById.get(endId);
            if (!start || !end) return null;
            const startX = typeof start.x === 'number' ? start.x : start.restX;
            const startY = typeof start.y === 'number' ? start.y : start.restY;
            const endX = typeof end.x === 'number' ? end.x : end.restX;
            const endY = typeof end.y === 'number' ? end.y : end.restY;
            return {
                id,
                label,
                restX: start.restX + (end.restX - start.restX) * 0.5,
                restY: start.restY + (end.restY - start.restY) * 0.5,
                x: startX + (endX - startX) * 0.5,
                y: startY + (endY - startY) * 0.5,
                anchor: false
            };
        };

        const rUpperArm = makeMidPin('pin-7', 'R Upper Arm', 'pin-6', 'pin-8');
        const lUpperArm = makeMidPin('pin-12', 'L Upper Arm', 'pin-11', 'pin-13');
        if (!rUpperArm || !lUpperArm) return false;

        const insertPinAfter = (afterId, newPin) => {
            const index = rig.pins.findIndex(pin => pin.id === afterId);
            if (index === -1) rig.pins.push(newPin);
            else rig.pins.splice(index + 1, 0, newPin);
            pinById.set(newPin.id, newPin);
        };
        insertPinAfter('pin-6', rUpperArm);
        insertPinAfter('pin-11', lUpperArm);

        let nextBoneIndex = rig.bones.reduce((mx, bone, index) => {
            const raw = typeof bone.id === 'string' ? parseInt(bone.id.replace('bone-', ''), 10) : index;
            return isNaN(raw) ? mx : Math.max(mx, raw + 1);
        }, rig.bones.length);

        const cloneBone = (bone, overrides = {}) => ({
            ...bone,
            id: overrides.id || `bone-${nextBoneIndex++}`,
            parentPinId: overrides.parentPinId ?? bone.parentPinId,
            childPinId: overrides.childPinId ?? bone.childPinId,
            name: overrides.name ?? bone.name,
            stiffness: typeof (overrides.stiffness ?? bone.stiffness) === 'number' ? (overrides.stiffness ?? bone.stiffness) : 1,
            ikLocked: overrides.ikLocked ?? (bone.ikLocked === true),
            minAngle: overrides.minAngle ?? bone.minAngle ?? null,
            maxAngle: overrides.maxAngle ?? bone.maxAngle ?? null
        });

        const rebuiltBones = [];
        rig.bones.forEach((bone) => {
            if (bone.parentPinId === 'pin-6' && bone.childPinId === 'pin-8') {
                rebuiltBones.push(cloneBone(bone, {
                    childPinId: 'pin-7',
                    name: 'R Shoulder',
                    stiffness: 0.88,
                    minAngle: -55,
                    maxAngle: 55
                }));
                rebuiltBones.push(cloneBone(bone, {
                    parentPinId: 'pin-7',
                    childPinId: 'pin-8',
                    name: bone.name || 'R Upper Arm'
                }));
                return;
            }
            if (bone.parentPinId === 'pin-11' && bone.childPinId === 'pin-13') {
                rebuiltBones.push(cloneBone(bone, {
                    childPinId: 'pin-12',
                    name: 'L Shoulder',
                    stiffness: 0.88,
                    minAngle: -55,
                    maxAngle: 55
                }));
                rebuiltBones.push(cloneBone(bone, {
                    parentPinId: 'pin-12',
                    childPinId: 'pin-13',
                    name: bone.name || 'L Upper Arm'
                }));
                return;
            }
            rebuiltBones.push({
                ...bone,
                id: bone.id || `bone-${nextBoneIndex++}`
            });
        });

        rig.bones = rebuiltBones;
        return true;
    }

    enterRigMode(obj) {
        if (!obj || obj.type !== 'image' || !obj.imageElement) {
            Utils.showToast('Select an image to rig', 'warning');
            return false;
        }

        // Clear any conflicting interactive modes
        if (this.objects._cropMode) this.objects.cancelCrop?.();
        if (this.objects._eraserMode) this.objects.exitEraserMode?.();

        this._rigMode = true;
        this._rigObj = obj;
        this._selectedPinId = null;
        this._selectedBoneId = null;
        this._draggingPinId = null;
        this._draggingConstraintHandle = null;
        this._constraintDragModifiers = null;
        this._draggingBoneListId = null;
        this._draggingBoneListPlacement = 'before';
        this._boneStartPinId = null;

        // Initialise rigging data if absent
        if (!obj.rigging) {
            obj.rigging = { pins: [], bones: [], meshDensity: 8, deformationMode: 'skeletal', showBoneLabels: true };
        }
        const upgradedLegacyRig = this._upgradeLegacyHumanFrontRig(obj.rigging);
        obj.rigging.deformationMode = obj.rigging.deformationMode || 'skeletal';
        obj.rigging.showBoneLabels = obj.rigging.showBoneLabels !== false;
        obj.rigging.bones = (obj.rigging.bones || []).map(bone => ({
            ...bone,
            name: typeof bone.name === 'string' ? bone.name : '',
            stiffness: typeof bone.stiffness === 'number' ? bone.stiffness : 1,
            ikLocked: bone.ikLocked === true,
            minAngle: typeof bone.minAngle === 'number' ? bone.minAngle : null,
            maxAngle: typeof bone.maxAngle === 'number' ? bone.maxAngle : null
        }));
        obj.rigging.bones.forEach((bone, index) => {
            bone.name = this._normalizeBoneName(bone.name, index);
        });

        // Seed ID counters from existing data
        const maxPin = obj.rigging.pins.reduce((mx, p) => {
            const n = parseInt(p.id.replace('pin-', ''), 10);
            return isNaN(n) ? mx : Math.max(mx, n + 1);
        }, 0);
        const maxBone = obj.rigging.bones.reduce((mx, b) => {
            const n = parseInt(b.id.replace('bone-', ''), 10);
            return isNaN(n) ? mx : Math.max(mx, n + 1);
        }, 0);
        this._nextPinId = maxPin;
        this._nextBoneId = maxBone;

        // Ensure mesh
        const initialTool = obj.rigging.pins.length > 0 ? 'deform' : 'pin';
        if (initialTool === 'deform') {
            obj.rigging.deformationMode = 'mesh';
            if (obj.rigging._meshCache) obj.rigging._meshCache._pinHash = null;
        }
        RiggingUtils.ensureMesh(obj.rigging);
        this._rigTool = initialTool;

        // Show UI
        document.getElementById('rigging-controls')?.classList.remove('hidden');
        this._updateToolButtons();
        this._updateDensitySlider();
        this._updateRigModeUI();
        this._renderBoneListUI();

        this.stage.requestRender();
        if (upgradedLegacyRig) {
            Utils.showToast('Updated legacy human-front rig to the current shoulder-aware preset', 'info');
        }
        Utils.showToast(
            obj.rigging.pins.length > 0
                ? 'Image Deform mode — drag pins to warp the image mesh'
                : 'Image Deform mode — click anywhere on the image to place a deform pin',
            'info'
        );
        return true;
    }

    exitRigMode() {
        if (!this._rigMode) return;

        // Restore cursor
        const vp = this.stage.viewport;
        if (vp) vp.style.cursor = '';

        // Stop pose recording if active
        if (this._isRecording) {
            this.objects._isRecording = false;
            eventBus.emit('recording:stop');
        }
        this._recordPoseSnapshot = null;

        this._rigMode = false;
        this._rigObj = null;
        this._selectedPinId = null;
        this._selectedBoneId = null;
        this._draggingPinId = null;
        this._draggingConstraintHandle = null;
        this._constraintDragModifiers = null;
        this._draggingBoneListId = null;
        this._draggingBoneListPlacement = 'before';
        this._boneStartPinId = null;

        document.getElementById('rigging-controls')?.classList.add('hidden');
        this._updateRecordingUI();
        this.stage.requestRender();
    }

    get isActive() { return this._rigMode; }

    // ── Pin management ──

    addPin(normX, normY) {
        const rig = this._rigObj?.rigging;
        if (!rig) return null;

        const id = 'pin-' + (this._nextPinId++);
        const pin = { id, restX: normX, restY: normY, x: normX, y: normY };
        rig.pins.push(pin);
        this._selectedPinId = id;
        this._selectedBoneId = null;

        // Rebuild weights for the new pin set
        RiggingUtils.ensureMesh(rig);
        this._updateBoneSelectionUI();
        this._renderBoneListUI();
        this.stage.requestRender();
        return pin;
    }

    _activateDeformAfterPinPlacement(pin) {
        const rig = this._rigObj?.rigging;
        if (!rig || !pin) return;

        rig.deformationMode = 'mesh';
        if (rig._meshCache) rig._meshCache._pinHash = null;
        RiggingUtils.ensureMesh(rig);

        this._rigTool = 'deform';
        this._draggingPinId = null;
        this._dragPrevPos = null;
        this._boneStartPinId = null;
        this._selectedPinId = pin.id;

        this._updateToolButtons();
        this._updateBoneSelectionUI();
        this._updateRigModeUI();
        this.stage.requestRender();
        Utils.showToast('Deform pin placed — drag the pin to warp the image, or choose Deform Pin to add more pins', 'info');
    }

    removePin(pinId) {
        const rig = this._rigObj?.rigging;
        if (!rig) return;

        rig.pins = rig.pins.filter(p => p.id !== pinId);
        rig.bones = rig.bones.filter(b => b.parentPinId !== pinId && b.childPinId !== pinId);

        if (this._selectedPinId === pinId) this._selectedPinId = null;
        if (this._selectedBoneId && !rig.bones.some(b => b.id === this._selectedBoneId)) this._selectedBoneId = null;
        RiggingUtils.ensureMesh(rig);  // rebuild weights
        this._updateBoneSelectionUI();
        this._renderBoneListUI();
        this.stage.requestRender();
    }

    /** Toggle anchor state on a pin. Anchored pins are never moved by animations. */
    togglePinAnchor(pinId) {
        const rig = this._rigObj?.rigging;
        if (!rig) return;
        const pin = rig.pins.find(p => p.id === pinId);
        if (!pin) return;
        pin.anchor = !pin.anchor;
        this.stage.requestRender();
        eventBus.emit('history:push');
        const label = pin.label || pinId;
        Utils.showToast(pin.anchor ? `📌 ${label} anchored — won't move during animation` : `${label} unanchored`, 'info');
    }

    /** Update the visual state of the Lock Pin toolbar button. */
    _updateLockPinUI() {
        const btn = document.getElementById('rig-lock-pin');
        if (!btn) return;
        const pin = this._rigObj?.rigging?.pins.find(p => p.id === this._selectedPinId);
        const isLocked = !!pin?.anchor;
        btn.classList.toggle('active', isLocked);
        const icon = btn.querySelector('i');
        if (icon) icon.className = isLocked ? 'fas fa-lock' : 'fas fa-lock-open';
        btn.title = isLocked
            ? 'Unlock selected pin — allow this area to move during deform (Alt+click also works)'
            : 'Lock selected pin — stabilizes this area so it won\'t move during deform (Alt+click also works)';
        btn.style.opacity = this._selectedPinId ? '' : '0.45';
    }

    // ── Bone management ──

    addBone(parentPinId, childPinId) {
        const rig = this._rigObj?.rigging;
        if (!rig) return null;

        // Prevent duplicates or self-bonds
        if (parentPinId === childPinId) return null;
        const exists = rig.bones.some(b =>
            (b.parentPinId === parentPinId && b.childPinId === childPinId) ||
            (b.parentPinId === childPinId && b.childPinId === parentPinId));
        if (exists) return null;

        // Prevent child from having multiple parents (tree structure)
        const childAlreadyParented = rig.bones.some(b => b.childPinId === childPinId);
        if (childAlreadyParented) {
            Utils.showToast('Pin already has a parent bone', 'warning');
            return null;
        }

        if (this._wouldCreateCycle(parentPinId, childPinId)) {
            Utils.showToast('Bones must form a hierarchy, not a loop', 'warning');
            return null;
        }

        const id = 'bone-' + (this._nextBoneId++);
        const bone = {
            id,
            parentPinId,
            childPinId,
            name: `Bone ${this._nextBoneId}`,
            stiffness: 1,
            ikLocked: false,
            minAngle: null,
            maxAngle: null
        };
        rig.bones.push(bone);
        this._selectedBoneId = id;
        this._selectedPinId = null;
        RiggingUtils.ensureMesh(rig);
        this._updateBoneSelectionUI();
        this.stage.requestRender();
        return bone;
    }

    removeBone(boneId) {
        const rig = this._rigObj?.rigging;
        if (!rig) return;
        rig.bones = rig.bones.filter(b => b.id !== boneId);
        if (this._selectedBoneId === boneId) this._selectedBoneId = null;
        // Invalidate mesh cache so weights rebuild with updated bone topology
        if (rig._meshCache) rig._meshCache._pinHash = null;
        RiggingUtils.ensureMesh(rig);
        this._updateBoneSelectionUI();
        this.stage.requestRender();
    }

    // ── Rig Presets ──

    /**
     * Show the preset picker as a floating draggable panel.
     */
    showPresetPicker() {
        // Remove existing picker
        document.getElementById('rig-preset-picker')?.remove();

        const presets = RigPresets.getAll();
        const container = document.createElement('div');
        container.id = 'rig-preset-picker';
        container.className = 'rig-preset-picker rig-floating-panel';

        container.innerHTML = `
            <div class="rig-floating-panel-header" data-drag-handle>
                <span><i class="fas fa-bone"></i> Rig Presets</span>
                <button class="rig-floating-panel-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="rig-preset-picker-hint">Select a skeleton to apply. Drag pins afterwards to fine-tune.</div>
            <div class="rig-preset-search-row">
                <input type="text" class="rig-preset-search" placeholder="Search presets..." />
            </div>
            <div class="rig-preset-picker-list">
                ${presets.map(p => `
                    <div class="rig-preset-card" data-preset="${p.key}" data-search="${p.name.toLowerCase()} ${p.description.toLowerCase()}">
                        <div class="rig-preset-card-icon"><i class="fas ${p.icon}"></i></div>
                        <div class="rig-preset-card-info">
                            <div class="rig-preset-card-name">${p.name}</div>
                            <div class="rig-preset-card-desc">${p.description}</div>
                            <div class="rig-preset-card-counts"><i class="fas fa-map-pin"></i> ${p.pins.length} pins &middot; <i class="fas fa-bone"></i> ${p.bones.length} bones</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="rig-preset-picker-warn">
                <i class="fas fa-exclamation-triangle"></i>
                This replaces all current pins &amp; bones on this image.
            </div>
        `;

        document.body.appendChild(container);
        this._makePanelDraggable(container);
        Utils.makePanelResizable(container);

        // Search filter
        const searchInput = container.querySelector('.rig-preset-search');
        searchInput?.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            container.querySelectorAll('.rig-preset-card').forEach(card => {
                card.style.display = (!q || card.dataset.search.includes(q)) ? '' : 'none';
            });
        });

        // Close
        container.querySelector('.rig-floating-panel-close')?.addEventListener('click', () => container.remove());

        // Apply on card click
        container.querySelectorAll('.rig-preset-card').forEach(card => {
            card.addEventListener('click', async () => {
                const key = card.dataset.preset;
                const hasExisting = this._rigObj?.rigging?.pins?.length > 0;
                if (hasExisting && !await Utils.showConfirm('This will replace all existing pins and bones. Continue?')) return;
                this.applyPreset(key);
                container.remove();
            });
        });
    }

    /**
     * Apply a rig preset to the current rigged object.
     * Replaces all pins and bones with the preset's configuration.
     */
    applyPreset(presetKey) {
        const preset = RigPresets.getByKey(presetKey);
        if (!preset) {
            Utils.showToast('Rig preset not found', 'error');
            return;
        }

        const obj = this._rigObj;
        if (!obj) {
            Utils.showToast('No object in rig mode', 'warning');
            return;
        }

        // Clear existing rig data
        obj.rigging.pins = [];
        obj.rigging.bones = [];
        if (obj.rigging._meshCache) obj.rigging._meshCache._pinHash = null;

        // Apply mesh settings
        obj.rigging.meshDensity = preset.meshDensity || 8;
        obj.rigging.deformationMode = preset.deformationMode || 'skeletal';

        // Add all pins (preserving label and anchor from preset)
        preset.pins.forEach(p => {
            obj.rigging.pins.push({
                id: p.id,
                restX: p.restX,
                restY: p.restY,
                x: p.restX,
                y: p.restY,
                label: p.label || '',
                anchor: p.anchor || false
            });
        });

        // Add all bones with labels and constraints
        let boneIndex = 0;
        preset.bones.forEach(b => {
            obj.rigging.bones.push({
                id: 'bone-' + boneIndex++,
                parentPinId: b.parentPinId,
                childPinId: b.childPinId,
                name: b.name || `Bone ${boneIndex}`,
                stiffness: typeof b.stiffness === 'number' ? b.stiffness : 1,
                ikLocked: b.ikLocked || false,
                minAngle: b.minAngle ?? null,
                maxAngle: b.maxAngle ?? null
            });
        });

        // Update ID counters
        this._nextPinId = preset.pins.length;
        this._nextBoneId = boneIndex;

        // Rebuild mesh
        RiggingUtils.ensureMesh(obj.rigging);

        // Update UI
        this._updateDensitySlider();
        this._updateBoneSelectionUI();
        this._renderBoneListUI();
        this._updateRigModeUI();
        this.stage.requestRender();
        eventBus.emit('history:push');

        Utils.showToast(`Applied "${preset.name}" preset — ${preset.pins.length} pins, ${preset.bones.length} bones. Drag pins to match your image.`, 'success');
    }

    // ── Movement Library ────────────────────────────────

    /**
     * Show the movement picker as a floating draggable panel with speed control.
     */
    showMovementPicker() {
        document.getElementById('rig-movement-picker')?.remove();

        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) {
            if (this._handoffToJointSystem('showMovementPicker')) return;
            Utils.showToast('Rig an image with pins first', 'warning');
            return;
        }

        const presetType = this._detectPresetType();
        const movements = RigMovements.getAll(presetType);

        if (movements.length === 0) {
            Utils.showToast(presetType
                ? `No movements for "${presetType}" rig type`
                : 'Could not detect rig type — apply a preset first', 'info');
            return;
        }

        // Group by category
        const categories = {};
        movements.forEach(m => {
            const cat = m.category || 'General';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(m);
        });

        const friendlyType = presetType ? presetType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';

        const container = document.createElement('div');
        container.id = 'rig-movement-picker';
        container.className = 'rig-movement-picker rig-floating-panel';

        let html = `
            <div class="rig-floating-panel-header" data-drag-handle>
                <span><i class="fas fa-running"></i> Movements <span class="rig-movement-type-badge">${friendlyType}</span></span>
                <button class="rig-floating-panel-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="rig-movement-picker-hint">Click a movement to apply it as a bone animation.</div>
            <div class="rig-movement-speed-row">
                <label><i class="fas fa-tachometer-alt"></i> Speed</label>
                <input type="range" class="rig-movement-speed" min="25" max="400" value="100" step="25">
                <span class="rig-movement-speed-val">1×</span>
            </div>
            <div class="rig-movement-search-row">
                <input type="text" class="rig-movement-search" placeholder="Search movements..." />
            </div>
        `;

        for (const [catName, items] of Object.entries(categories)) {
            html += `<div class="rig-movement-category" data-cat>${catName}</div>`;
            html += `<div class="rig-movement-list">`;
            items.forEach(m => {
                html += `
                    <div class="rig-movement-card" data-movement="${m.key}" data-search="${m.name.toLowerCase()} ${m.category.toLowerCase()} ${m.description.toLowerCase()}" title="${m.description}">
                        <div class="rig-movement-card-icon"><i class="fas ${m.icon}"></i></div>
                        <div class="rig-movement-card-info">
                            <div class="rig-movement-card-name">${m.name}</div>
                            <div class="rig-movement-card-meta">${(m.duration / 1000).toFixed(1)}s &middot; ${m.keyframes.length} poses &middot; &times;${m.repeat > 100 ? '∞' : m.repeat}</div>
                        </div>
                        <button class="rig-movement-preview-btn" data-movement="${m.key}" title="Preview"><i class="fas fa-play"></i></button>
                    </div>`;
            });
            html += `</div>`;
        }

        html += `<div class="rig-movement-picker-warn"><i class="fas fa-info-circle"></i> Replaces existing bone animation on this object.</div>`;
        container.innerHTML = html;

        document.body.appendChild(container);
        this._makePanelDraggable(container);
        Utils.makePanelResizable(container);

        // Speed slider
        const speedSlider = container.querySelector('.rig-movement-speed');
        const speedVal = container.querySelector('.rig-movement-speed-val');
        this._movementSpeedMultiplier = 1;
        speedSlider?.addEventListener('input', () => {
            const pct = parseInt(speedSlider.value);
            this._movementSpeedMultiplier = pct / 100;
            speedVal.textContent = pct >= 100 ? `${pct / 100}×` : `${pct / 100}×`;
        });

        // Search filter
        const searchInput = container.querySelector('.rig-movement-search');
        searchInput?.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            container.querySelectorAll('.rig-movement-card').forEach(card => {
                card.style.display = (!q || card.dataset.search.includes(q)) ? '' : 'none';
            });
            // Show/hide category headers
            container.querySelectorAll('.rig-movement-category').forEach(header => {
                const list = header.nextElementSibling;
                if (list) {
                    const visible = list.querySelectorAll('.rig-movement-card:not([style*="display: none"])');
                    header.style.display = visible.length ? '' : 'none';
                }
            });
        });

        // Close
        container.querySelector('.rig-floating-panel-close')?.addEventListener('click', () => container.remove());

        // Apply on card click (with speed multiplier)
        container.querySelectorAll('.rig-movement-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.rig-movement-preview-btn')) return;
                const key = card.dataset.movement;
                this.applyMovement(key, this._movementSpeedMultiplier);
                container.remove();
            });
        });

        // Preview button
        container.querySelectorAll('.rig-movement-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewMovement(btn.dataset.movement, this._movementSpeedMultiplier);
            });
        });
    }

    /**
     * Apply a movement from the library as a bone-pose animation.
     * Converts delta-based keyframes to absolute positions using current rest positions.
     * @param {string} movementKey
     * @param {number} [speedMultiplier=1]
     */
    applyMovement(movementKey, speedMultiplier = 1) {
        const movement = RigMovements.getByKey(movementKey);
        if (!movement) { Utils.showToast('Movement not found', 'error'); return; }

        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) { Utils.showToast('No rigged object', 'warning'); return; }

        // Convert delta keyframes → absolute pose keyframes.
        // Only include pins that actually have deltas — leaving other pins
        // untouched prevents head/face jitter from floating-point interpolation
        // and respects any user pin adjustments.
        const keyframes = movement.keyframes.map(kf => {
            const pose = {};
            obj.rigging.pins.forEach(pin => {
                if (pin.anchor) return;  // never animate anchored pins
                const d = kf.deltas[pin.id];
                if (d) {
                    pose[pin.id] = {
                        x: pin.restX + d.dx,
                        y: pin.restY + d.dy
                    };
                }
            });
            return { t: kf.t, pose };
        });

        const totalDuration = (movement.duration || 3000) / Math.max(0.1, speedMultiplier);

        // Remove existing bone-pose animation
        const existIdx = obj.animations.findIndex(a => a.generated?.type === 'bone-pose');
        if (existIdx >= 0) obj.animations.splice(existIdx, 1);

        // Create new bone-pose animation
        obj.animations.push({
            id: Utils.generateId('anim'),
            type: 'bone-pose',
            name: movement.name,
            params: {
                duration: totalDuration / 1000,
                easing: movement.easing || 'easeInOut'
            },
            delay: 0,
            repeat: String(movement.repeat || 1),
            trigger: 'onLoad',
            startMode: 'from-start',
            generated: {
                type: 'bone-pose',
                duration: totalDuration,
                easing: movement.easing || 'easeInOut',
                keyframes
            }
        });

        eventBus.emit('animations:changed');
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');

        Utils.showToast(`Applied "${movement.name}" — ${keyframes.length} keyframes, ${(totalDuration / 1000).toFixed(1)}s`, 'success');
    }

    /**
     * Preview a movement in-place without committing it to the timeline.
     * Plays one cycle then restores the original pin positions.
     * @param {string} movementKey
     * @param {number} [speedMultiplier=1]
     */
    previewMovement(movementKey, speedMultiplier = 1) {
        const movement = RigMovements.getByKey(movementKey);
        if (!movement || !this._rigObj?.rigging?.pins) return;

        if (this._previewRAF) { cancelAnimationFrame(this._previewRAF); this._previewRAF = null; }

        // Snapshot current pin positions
        const saved = {};
        this._rigObj.rigging.pins.forEach(p => { saved[p.id] = { x: p.x, y: p.y }; });

        const previewDuration = Math.min(movement.duration, 2000) / Math.max(0.1, speedMultiplier);
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / previewDuration, 1);

            const pose = this._buildPoseFromDeltas(movement, progress);
            RiggingUtils.applyPoseToObject(this._rigObj, pose);
            this.stage.requestRender();

            if (progress < 1) {
                this._previewRAF = requestAnimationFrame(animate);
            } else {
                this._previewRAF = null;
                RiggingUtils.applyPoseToObject(this._rigObj, saved);
                this.stage.requestRender();
            }
        };
        this._previewRAF = requestAnimationFrame(animate);
    }

    /**
     * Build an interpolated absolute pose from a movement's delta keyframes
     * at the given progress (0–1).
     */
    _buildPoseFromDeltas(movement, progress) {
        const obj = this._rigObj;
        if (!obj?.rigging?.pins) return {};

        const keyframes = movement.keyframes.map(kf => {
            const pose = {};
            obj.rigging.pins.forEach(pin => {
                if (pin.anchor) return;
                const d = kf.deltas[pin.id];
                if (d) {
                    pose[pin.id] = {
                        x: pin.restX + d.dx,
                        y: pin.restY + d.dy
                    };
                }
            });
            return { t: kf.t, pose };
        });

        return RiggingUtils.interpolateKeyframePoses(keyframes, progress);
    }

    /**
     * Detect which preset type was used based on pin/bone count + bone name heuristics.
     */
    _detectPresetType() {
        const rig = this._rigObj?.rigging;
        if (!rig) return null;
        const pc = rig.pins.length;
        const bc = rig.bones.length;
        // Exact count matches
        if (pc === 24 && bc === 23) return 'human-front';
        if (pc === 22 && bc === 21 && this._isLegacyHumanFrontRig(rig)) return 'human-front';
        if (pc === 18 && bc === 17) return 'human-side';
        if (pc === 11 && bc === 10) return 'upper-body';
        if (pc === 17 && bc === 16 && rig.bones.some(b => /wing/i.test(b.name))) return 'bird';
        if (pc === 17 && bc === 16) return 'biped';
        if (pc === 19 && bc === 18 && rig.bones.some(b => /L1 Shoulder|L2 Shoulder/i.test(b.name))) return 'spider';
        if (pc === 19 && bc === 18) return 'quadruped';
        if (pc === 12 && bc === 11) return 'fish';
        if (pc === 15 && bc === 14) return 'face';
        if (pc === 27 && bc === 26) return 'centaur';

        // Fuzzy fallback: check bone names for clues
        const names = rig.bones.map(b => (b.name || '').toLowerCase()).join(' ');
        if (/wing/i.test(names) && pc >= 14 && pc <= 20) return 'bird';
        if (/jaw|eyebrow|nose/i.test(names)) return 'face';
        if (/tail fin|dorsal/i.test(names)) return 'fish';
        if (/hind|foreleg|haunch/i.test(names)) return 'quadruped';
        if (/l1 shoulder|l2 shoulder|l3 shoulder/i.test(names)) return 'spider';
        if (/centaur|torso rear/i.test(names)) return 'centaur';
        if (/hip|shoulder|spine/i.test(names) && pc >= 20) return 'human-front';
        if (/hip|shoulder|spine/i.test(names) && pc >= 15) return 'human-side';
        if (/hip|knee|ankle/i.test(names)) return 'biped';
        return null;
    }

    // ── Floating Panel Draggable Helper ──

    _makePanelDraggable(panel) {
        // Auto-dock into right panel instead of floating over the stage
        Utils.dockPanel(panel);

        const handle = panel.querySelector('[data-drag-handle]');
        if (!handle) return;
        let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
        // Position in center after layout (only if undocked)
        requestAnimationFrame(() => {
            if (panel.dataset.docked === 'true') return;
            const rect = panel.getBoundingClientRect();
            panel.style.left = `${(window.innerWidth - rect.width) / 2}px`;
            panel.style.top = `${Math.max(60, (window.innerHeight - rect.height) / 3)}px`;
        });

        handle.addEventListener('mousedown', (e) => {
            if (panel.dataset.docked === 'true') return; // skip drag when docked
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const r = panel.getBoundingClientRect();
            origLeft = r.left;
            origTop = r.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.left = `${origLeft + (e.clientX - startX)}px`;
            panel.style.top = `${origTop + (e.clientY - startY)}px`;
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    }

    _handoffToJointSystem(methodName) {
        const jointSystem = window.app?.jointSystem;
        if (!jointSystem || typeof jointSystem[methodName] !== 'function') return false;
        const hasAssembledPreset = typeof jointSystem._detectAssembledPreset === 'function'
            ? jointSystem._detectAssembledPreset()
            : null;
        if (!hasAssembledPreset) return false;
        jointSystem[methodName]();
        return true;
    }

    // ── Rig Pose Library ──

    showPoseLibrary() {
        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) {
            if (this._handoffToJointSystem('showPoseLibrary')) return;
            Utils.showToast('Rig an image first', 'warning');
            return;
        }
        document.getElementById('rig-pose-library')?.remove();

        const panel = document.createElement('div');
        panel.id = 'rig-pose-library';
        panel.className = 'rig-floating-panel rig-pose-library';

        const presetType = this._detectPresetType() || 'custom';
        const saved = this._getSavedPoses(presetType);

        panel.innerHTML = `
            <div class="rig-floating-panel-header" data-drag-handle>
                <span><i class="fas fa-archive"></i> Pose Library</span>
                <button class="rig-floating-panel-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="rig-pose-lib-actions">
                <input type="text" class="rig-pose-name-input" placeholder="Pose name..." maxlength="40" />
                <button class="rig-pose-save-btn btn-primary btn-sm" title="Save current pose"><i class="fas fa-save"></i> Save</button>
            </div>
            <div class="rig-pose-lib-hint">Save pin positions as reusable poses. Click to apply, blend to mix.</div>
            <div class="rig-pose-lib-blend-row hidden">
                <label><i class="fas fa-sliders-h"></i> Blend</label>
                <input type="range" class="rig-pose-blend-slider" min="0" max="100" value="100" step="1">
                <span class="rig-pose-blend-val">100%</span>
            </div>
            <div class="rig-pose-lib-list">${this._renderPoseList(saved)}</div>
        `;

        document.body.appendChild(panel);
        this._makePanelDraggable(panel);
        Utils.makePanelResizable(panel);

        // Close
        panel.querySelector('.rig-floating-panel-close')?.addEventListener('click', () => panel.remove());

        // Save
        panel.querySelector('.rig-pose-save-btn')?.addEventListener('click', () => {
            const nameInput = panel.querySelector('.rig-pose-name-input');
            const name = (nameInput?.value || '').trim() || `Pose ${Date.now() % 10000}`;
            this._saveCurrentPose(presetType, name);
            nameInput.value = '';
            const list = panel.querySelector('.rig-pose-lib-list');
            if (list) list.innerHTML = this._renderPoseList(this._getSavedPoses(presetType));
            this._bindPoseListEvents(panel, presetType);
            Utils.showToast(`Pose "${name}" saved`, 'success');
        });

        this._bindPoseListEvents(panel, presetType);
    }

    _renderPoseList(saved) {
        if (!saved.length) return '<div class="rig-pose-lib-empty">No poses saved yet.</div>';
        return saved.map((p, i) => `
            <div class="rig-pose-lib-item" data-idx="${i}">
                <span class="rig-pose-lib-item-name"><i class="fas fa-bookmark"></i> ${p.name}</span>
                <span class="rig-pose-lib-item-meta">${Object.keys(p.pose).length} pins</span>
                <button class="rig-pose-apply-btn btn-sm" data-idx="${i}" title="Apply"><i class="fas fa-check"></i></button>
                <button class="rig-pose-delete-btn btn-sm" data-idx="${i}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }

    _bindPoseListEvents(panel, presetType) {
        const blendRow = panel.querySelector('.rig-pose-lib-blend-row');
        const blendSlider = panel.querySelector('.rig-pose-blend-slider');
        const blendVal = panel.querySelector('.rig-pose-blend-val');

        // Apply
        panel.querySelectorAll('.rig-pose-apply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const poses = this._getSavedPoses(presetType);
                if (!poses[idx]) return;
                // Snapshot before apply for blend
                this._blendBasePose = this._snapshotPose();
                this._blendTargetPose = poses[idx].pose;
                RiggingUtils.applyPoseToObject(this._rigObj, poses[idx].pose);
                this.stage.requestRender();
                eventBus.emit('history:push');
                // Show blend slider
                blendRow?.classList.remove('hidden');
                if (blendSlider) blendSlider.value = 100;
                if (blendVal) blendVal.textContent = '100%';
            });
        });

        // Blend slider
        blendSlider?.addEventListener('input', () => {
            if (!this._blendBasePose || !this._blendTargetPose) return;
            const t = parseInt(blendSlider.value) / 100;
            if (blendVal) blendVal.textContent = `${Math.round(t * 100)}%`;
            const blended = RiggingUtils.interpolatePoses(this._blendBasePose, this._blendTargetPose, t);
            RiggingUtils.applyPoseToObject(this._rigObj, blended);
            this.stage.requestRender();
        });

        // Delete
        panel.querySelectorAll('.rig-pose-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                this._deleteSavedPose(presetType, idx);
                const list = panel.querySelector('.rig-pose-lib-list');
                if (list) list.innerHTML = this._renderPoseList(this._getSavedPoses(presetType));
                this._bindPoseListEvents(panel, presetType);
            });
        });
    }

    _snapshotPose() {
        const pose = {};
        this._rigObj?.rigging?.pins?.forEach(p => { pose[p.id] = { x: p.x, y: p.y }; });
        return pose;
    }

    _getSavedPoses(presetType) {
        try {
            return JSON.parse(localStorage.getItem(`rig-poses-${presetType}`) || '[]');
        } catch { return []; }
    }

    _saveCurrentPose(presetType, name) {
        const pose = this._snapshotPose();
        const saved = this._getSavedPoses(presetType);
        saved.push({ name, pose, timestamp: Date.now() });
        localStorage.setItem(`rig-poses-${presetType}`, JSON.stringify(saved));
    }

    _deleteSavedPose(presetType, index) {
        const saved = this._getSavedPoses(presetType);
        saved.splice(index, 1);
        localStorage.setItem(`rig-poses-${presetType}`, JSON.stringify(saved));
    }

    // ── Mirror Rig Pose (L↔R) ──

    mirrorRigPose() {
        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) {
            if (this._handoffToJointSystem('mirrorPose')) return;
            Utils.showToast('Rig an image first', 'warning');
            return;
        }

        const pins = obj.rigging.pins;
        const bones = obj.rigging.bones;

        // Build name → pin mapping via bones
        const pinNameMap = {};
        bones.forEach(b => {
            if (b.name) {
                pinNameMap[b.childPinId] = b.name;
            }
        });

        // Find L/R pairs
        const swapPairs = [];
        const processed = new Set();
        pins.forEach(pin => {
            if (processed.has(pin.id)) return;
            const name = pinNameMap[pin.id] || '';
            let counterpart = null;
            if (/^L[\s_-]/i.test(name) || /\bLeft\b/i.test(name)) {
                const rName = name.replace(/^L([\s_-])/i, 'R$1').replace(/\bLeft\b/i, 'Right');
                const rPinId = Object.keys(pinNameMap).find(id => pinNameMap[id] === rName);
                if (rPinId) counterpart = pins.find(p => p.id === rPinId);
            } else if (/^R[\s_-]/i.test(name) || /\bRight\b/i.test(name)) {
                const lName = name.replace(/^R([\s_-])/i, 'L$1').replace(/\bRight\b/i, 'Left');
                const lPinId = Object.keys(pinNameMap).find(id => pinNameMap[id] === lName);
                if (lPinId) counterpart = pins.find(p => p.id === lPinId);
            }

            if (counterpart) {
                swapPairs.push([pin, counterpart]);
                processed.add(pin.id);
                processed.add(counterpart.id);
            }
        });

        if (swapPairs.length === 0) {
            // Fallback: mirror all pins across x=0.5
            pins.forEach(pin => {
                pin.x = 1 - pin.x;
            });
            Utils.showToast('Mirrored all pins across center', 'info');
        } else {
            swapPairs.forEach(([a, b]) => {
                const tmpX = a.x, tmpY = a.y;
                a.x = b.x; a.y = b.y;
                b.x = tmpX; b.y = tmpY;
            });
            // Also mirror unpaired center pins across x=0.5
            pins.forEach(pin => {
                if (!processed.has(pin.id)) {
                    pin.x = 1 - pin.x;
                }
            });
            Utils.showToast(`Mirrored ${swapPairs.length} L↔R pairs`, 'success');
        }

        this.stage.requestRender();
        eventBus.emit('history:push');
    }

    // ── Ragdoll Gravity Drop ──

    ragdollDrop() {
        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) {
            Utils.showToast('Rig an image first', 'warning');
            return;
        }

        if (this._ragdollRAF) { cancelAnimationFrame(this._ragdollRAF); this._ragdollRAF = null; }

        const pins = obj.rigging.pins;
        const bones = obj.rigging.bones;

        // Find root pin (parent of topmost bone, not a child of any bone)
        const childPins = new Set(bones.map(b => b.childPinId));
        const rootPin = pins.find(p => !childPins.has(p.id)) || pins[0];

        // Velocity per pin
        const vel = {};
        pins.forEach(p => { vel[p.id] = { vx: 0, vy: 0 }; });

        const gravity = 0.0004; // normalized units per frame²
        const damping = 0.92;
        const bounceFriction = 0.4;
        const startTime = performance.now();
        const maxDuration = 3000;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed > maxDuration) {
                this._ragdollRAF = null;
                return;
            }

            pins.forEach(p => {
                if (p.id === rootPin.id) return; // anchor root

                vel[p.id].vy += gravity;
                vel[p.id].vx *= damping;
                vel[p.id].vy *= damping;

                p.x += vel[p.id].vx;
                p.y += vel[p.id].vy;

                // Ground bounce at y=1.0
                if (p.y > 0.98) {
                    p.y = 0.98;
                    vel[p.id].vy *= -bounceFriction;
                }
                // Keep in bounds
                p.x = Math.max(0.02, Math.min(0.98, p.x));
                p.y = Math.max(0.02, Math.min(0.98, p.y));
            });

            // Enforce bone length constraints (relaxation)
            for (let iter = 0; iter < 3; iter++) {
                bones.forEach(bone => {
                    const parent = pins.find(p => p.id === bone.parentPinId);
                    const child = pins.find(p => p.id === bone.childPinId);
                    if (!parent || !child) return;
                    const restParent = { x: parent.restX, y: parent.restY };
                    const restChild = { x: child.restX, y: child.restY };
                    const targetDist = Math.hypot(restChild.x - restParent.x, restChild.y - restParent.y);
                    const dx = child.x - parent.x;
                    const dy = child.y - parent.y;
                    const dist = Math.hypot(dx, dy) || 0.001;
                    const diff = (dist - targetDist) / dist * 0.5;
                    if (parent.id !== rootPin.id) {
                        parent.x += dx * diff;
                        parent.y += dy * diff;
                    }
                    child.x -= dx * diff;
                    child.y -= dy * diff;
                });
            }

            this.stage.requestRender();
            this._ragdollRAF = requestAnimationFrame(animate);
        };
        this._ragdollRAF = requestAnimationFrame(animate);
        Utils.showToast('Ragdoll drop!', 'info');
    }

    // ── Randomize Rig Pose ──

    randomizeRigPose() {
        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) {
            Utils.showToast('Rig an image first', 'warning');
            return;
        }

        obj.rigging.pins.forEach(pin => {
            pin.x = pin.restX + (Math.random() - 0.5) * 0.08;
            pin.y = pin.restY + (Math.random() - 0.5) * 0.08;
            pin.x = Math.max(0.02, Math.min(0.98, pin.x));
            pin.y = Math.max(0.02, Math.min(0.98, pin.y));
        });

        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Randomized pose', 'info');
    }

    // ── Reset to Rest Pose ──

    resetToRestPose() {
        const obj = this._rigObj;
        if (!obj?.rigging?.pins?.length) {
            Utils.showToast('Rig an image first', 'warning');
            return;
        }

        obj.rigging.pins.forEach(pin => {
            pin.x = pin.restX;
            pin.y = pin.restY;
        });

        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Reset to rest pose', 'info');
    }

    _wouldCreateCycle(parentPinId, childPinId) {
        const rig = this._rigObj?.rigging;
        if (!rig) return false;

        const stack = [childPinId];
        const seen = new Set();
        while (stack.length) {
            const current = stack.pop();
            if (current === parentPinId) return true;
            if (seen.has(current)) continue;
            seen.add(current);
            rig.bones.forEach(bone => {
                if (bone.parentPinId === current) stack.push(bone.childPinId);
            });
        }
        return false;
    }

    _isPoseTool(tool = this._rigTool) {
        return tool === 'skeleton' || tool === 'deform';
    }

    _getParentBone(pinId) {
        return this._rigObj?.rigging?.bones.find(bone => bone.childPinId === pinId) || null;
    }

    _getChildBones(pinId) {
        return this._rigObj?.rigging?.bones.filter(bone => bone.parentPinId === pinId) || [];
    }

    _getConnectedBones(pinId) {
        const parentBone = this._getParentBone(pinId);
        const childBones = this._getChildBones(pinId);
        return [parentBone, ...childBones].filter(Boolean);
    }

    _getBoneById(boneId) {
        return this._rigObj?.rigging?.bones.find(bone => bone.id === boneId) || null;
    }

    _normalizeBoneName(name, index) {
        const trimmed = typeof name === 'string' ? name.trim() : '';
        return trimmed || `Bone ${index + 1}`;
    }

    _getBoneDisplayName(bone) {
        if (!bone) return '';
        const rigBones = this._rigObj?.rigging?.bones || [];
        const index = Math.max(0, rigBones.findIndex(item => item.id === bone.id));
        return this._normalizeBoneName(bone.name, index);
    }

    _formatConstraintDegrees(value) {
        const rounded = Math.round(value);
        return `${rounded}${String.fromCharCode(176)}`;
    }

    _snapConstraintAngle(value) {
        const step = this._constraintDragModifiers?.shiftKey ? 1 : 5;
        return Math.max(-180, Math.min(180, Math.round(value / step) * step));
    }

    _selectBone(boneId, options = {}) {
        this._selectedBoneId = boneId;
        this._selectedPinId = null;
        this._updateBoneSelectionUI(options.renderList !== false);
        this.stage.requestRender();
    }

    _selectConnectedBoneFromPin(pinId, pos) {
        const rig = this._rigObj?.rigging;
        const obj = this._rigObj;
        if (!rig || !obj) return false;

        const connectedBones = this._getConnectedBones(pinId);
        if (connectedBones.length === 0) return false;
        if (connectedBones.length === 1) {
            this._selectBone(connectedBones[0].id);
            return true;
        }

        const pin = rig.pins.find(item => item.id === pinId);
        if (!pin) return false;

        const pinX = obj.x + pin.x * obj.width;
        const pinY = obj.y + pin.y * obj.height;
        const pointerDx = pos.x - pinX;
        const pointerDy = pos.y - pinY;
        const pointerLen = Math.hypot(pointerDx, pointerDy);

        let selectedBone = null;
        if (pointerLen > 3 / Math.max(0.001, this.stage.zoom || 1)) {
            const pointerAngle = Math.atan2(pointerDy, pointerDx);
            let bestScore = Infinity;
            connectedBones.forEach((bone) => {
                const otherPinId = bone.parentPinId === pinId ? bone.childPinId : bone.parentPinId;
                const otherPin = rig.pins.find(item => item.id === otherPinId);
                if (!otherPin) return;
                const otherX = obj.x + otherPin.x * obj.width;
                const otherY = obj.y + otherPin.y * obj.height;
                const boneAngle = Math.atan2(otherY - pinY, otherX - pinX);
                let diff = Math.abs(pointerAngle - boneAngle);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < bestScore) {
                    bestScore = diff;
                    selectedBone = bone;
                }
            });
        }

        if (!selectedBone) {
            const currentIndex = connectedBones.findIndex(bone => bone.id === this._selectedBoneId);
            selectedBone = connectedBones[(currentIndex + 1 + connectedBones.length) % connectedBones.length];
        }

        if (!selectedBone) return false;
        this._selectBone(selectedBone.id);
        return true;
    }

    _getPinDisplayName(pinId) {
        const rigPins = this._rigObj?.rigging?.pins || [];
        const index = Math.max(0, rigPins.findIndex(item => item.id === pinId));
        return `Pin ${index + 1}`;
    }

    _toggleBoneIkLockById(boneId) {
        const bone = this._getBoneById(boneId);
        if (!bone) return;
        bone.ikLocked = !bone.ikLocked;
        this._updateBoneSelectionUI();
        this.stage.requestRender();
        eventBus.emit('history:push');
    }

    async _deleteBoneById(boneId) {
        const bone = this._getBoneById(boneId);
        if (!bone) return;
        const label = this._getBoneDisplayName(bone);
        if (!await Utils.showConfirm(`Delete ${label}?`)) return;
        this.removeBone(boneId);
        eventBus.emit('history:push');
    }

    _moveBoneById(boneId, direction) {
        const rig = this._rigObj?.rigging;
        if (!rig?.bones?.length) return;
        const index = rig.bones.findIndex(bone => bone.id === boneId);
        if (index < 0) return;
        const targetIndex = index + direction;
        this._moveBoneToIndex(boneId, targetIndex);
    }

    _moveBoneToIndex(boneId, targetIndex) {
        const rig = this._rigObj?.rigging;
        if (!rig?.bones?.length) return;
        const currentIndex = rig.bones.findIndex(bone => bone.id === boneId);
        if (currentIndex < 0) return;
        const clampedIndex = Math.max(0, Math.min(rig.bones.length - 1, targetIndex));
        if (currentIndex === clampedIndex) return;
        const [bone] = rig.bones.splice(currentIndex, 1);
        rig.bones.splice(clampedIndex, 0, bone);
        this._renderBoneListUI();
        this.stage.requestRender();
        eventBus.emit('history:push');
        this._focusBoneListRow(boneId);
    }

    _reorderBoneById(boneId, targetBoneId, placement = 'before') {
        const rig = this._rigObj?.rigging;
        if (!rig?.bones?.length || boneId === targetBoneId) return;
        const fromIndex = rig.bones.findIndex(bone => bone.id === boneId);
        const toIndex = rig.bones.findIndex(bone => bone.id === targetBoneId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
        const [bone] = rig.bones.splice(fromIndex, 1);
        let insertIndex = toIndex + (placement === 'after' ? 1 : 0);
        if (fromIndex < insertIndex) insertIndex -= 1;
        rig.bones.splice(insertIndex, 0, bone);
        this._renderBoneListUI();
        this.stage.requestRender();
        eventBus.emit('history:push');
        this._focusBoneListRow(boneId);
    }

    _focusBoneListRow(boneId) {
        requestAnimationFrame(() => {
            const row = document.querySelector(`.rig-bone-list-item[data-bone-id="${boneId}"]`);
            if (row) row.focus();
        });
    }

    _clearBoneListDropTargets(container) {
        if (!container) return;
        container.querySelectorAll('.rig-bone-list-item').forEach((item) => {
            item.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
        });
    }

    _getBoneListNeighborId(boneId, direction) {
        const bones = this._rigObj?.rigging?.bones || [];
        const index = bones.findIndex(bone => bone.id === boneId);
        if (index < 0) return null;
        return bones[index + direction]?.id || null;
    }

    _renderBoneListUI() {
        const container = document.getElementById('rig-bone-list');
        const rig = this._rigObj?.rigging;
        if (!container) return;
        container.innerHTML = '';
        if (!rig || !rig.bones || rig.bones.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'rig-bone-list-empty';
            empty.textContent = 'No bones yet. Connect two pins to build the skeleton.';
            container.appendChild(empty);
            return;
        }
        rig.bones.forEach((bone, index) => {
            const row = document.createElement('div');
            row.className = 'rig-bone-list-item';
            row.tabIndex = 0;
            row.setAttribute('role', 'button');
            row.draggable = true;
            row.dataset.boneId = bone.id;
            if (bone.id === this._selectedBoneId) row.classList.add('is-selected');

            const main = document.createElement('div');
            main.className = 'rig-bone-list-main';

            const dragHandle = document.createElement('span');
            dragHandle.className = 'rig-bone-drag-handle';
            dragHandle.innerHTML = '<i class="fas fa-grip-vertical" aria-hidden="true"></i>';
            dragHandle.title = 'Drag to reorder';

            const name = document.createElement('span');
            name.className = 'rig-bone-list-name';
            name.textContent = this._getBoneDisplayName(bone);

            const meta = document.createElement('span');
            meta.className = 'rig-bone-list-meta';
            meta.textContent = `${this._getPinDisplayName(bone.parentPinId)} -> ${this._getPinDisplayName(bone.childPinId)}`;

            const state = document.createElement('span');
            state.className = 'rig-bone-list-state';
            state.textContent = bone.ikLocked ? 'IK lock' : `${Math.round((typeof bone.stiffness === 'number' ? bone.stiffness : 1) * 100)}%`;

            const actions = document.createElement('div');
            actions.className = 'rig-bone-list-actions';

            const selectBtn = document.createElement('button');
            selectBtn.type = 'button';
            selectBtn.className = 'rig-bone-action-btn';
            selectBtn.innerHTML = '<i class="fas fa-crosshairs" aria-hidden="true"></i>';
            selectBtn.title = 'Select this bone';
            selectBtn.setAttribute('aria-label', 'Select this bone');
            selectBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this._selectBone(bone.id);
            });

            const lockBtn = document.createElement('button');
            lockBtn.type = 'button';
            lockBtn.className = 'rig-bone-action-btn';
            if (bone.ikLocked) lockBtn.classList.add('is-active');
            lockBtn.innerHTML = `<i class="fas ${bone.ikLocked ? 'fa-lock-open' : 'fa-lock'}" aria-hidden="true"></i>`;
            lockBtn.title = bone.ikLocked ? 'Unlock this bone for IK solving' : 'Lock this bone during IK solving';
            lockBtn.setAttribute('aria-label', bone.ikLocked ? 'Unlock this bone for IK solving' : 'Lock this bone during IK solving');
            lockBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this._toggleBoneIkLockById(bone.id);
            });

            const moveUpBtn = document.createElement('button');
            moveUpBtn.type = 'button';
            moveUpBtn.className = 'rig-bone-action-btn';
            moveUpBtn.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i>';
            moveUpBtn.title = 'Move this bone up in the list';
            moveUpBtn.setAttribute('aria-label', 'Move this bone up in the list');
            moveUpBtn.disabled = index === 0;
            moveUpBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this._moveBoneById(bone.id, -1);
            });

            const moveDownBtn = document.createElement('button');
            moveDownBtn.type = 'button';
            moveDownBtn.className = 'rig-bone-action-btn';
            moveDownBtn.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i>';
            moveDownBtn.title = 'Move this bone down in the list';
            moveDownBtn.setAttribute('aria-label', 'Move this bone down in the list');
            moveDownBtn.disabled = index === rig.bones.length - 1;
            moveDownBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this._moveBoneById(bone.id, 1);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'rig-bone-action-btn is-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
            deleteBtn.title = 'Delete this bone';
            deleteBtn.setAttribute('aria-label', 'Delete this bone');
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this._deleteBoneById(bone.id);
            });

            main.appendChild(dragHandle);
            main.appendChild(name);
            main.appendChild(meta);
            actions.appendChild(selectBtn);
            actions.appendChild(lockBtn);
            actions.appendChild(moveUpBtn);
            actions.appendChild(moveDownBtn);
            actions.appendChild(deleteBtn);
            row.appendChild(main);
            row.appendChild(state);
            row.appendChild(actions);
            row.addEventListener('dragstart', (event) => {
                this._draggingBoneListId = bone.id;
                this._draggingBoneListPlacement = 'before';
                row.classList.add('is-dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', bone.id);
            });
            row.addEventListener('dragend', () => {
                this._draggingBoneListId = null;
                this._draggingBoneListPlacement = 'before';
                row.classList.remove('is-dragging');
                this._clearBoneListDropTargets(container);
            });
            row.addEventListener('dragover', (event) => {
                if (!this._draggingBoneListId || this._draggingBoneListId === bone.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                const bounds = row.getBoundingClientRect();
                const placement = (event.clientY - bounds.top) < (bounds.height / 2) ? 'before' : 'after';
                this._draggingBoneListPlacement = placement;
                this._clearBoneListDropTargets(container);
                row.classList.add('is-drop-target', placement === 'before' ? 'is-drop-before' : 'is-drop-after');
            });
            row.addEventListener('dragleave', () => {
                row.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
            });
            row.addEventListener('drop', (event) => {
                event.preventDefault();
                const draggedBoneId = this._draggingBoneListId || event.dataTransfer.getData('text/plain');
                const placement = this._draggingBoneListPlacement || 'before';
                this._clearBoneListDropTargets(container);
                if (draggedBoneId) this._reorderBoneById(draggedBoneId, bone.id, placement);
            });
            row.addEventListener('click', () => this._selectBone(bone.id));
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this._selectBone(bone.id);
                    return;
                }
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    const direction = event.key === 'ArrowUp' ? -1 : 1;
                    if (event.altKey) {
                        this._moveBoneById(bone.id, direction);
                        return;
                    }
                    const neighborId = this._getBoneListNeighborId(bone.id, direction);
                    if (!neighborId) return;
                    this._selectBone(neighborId);
                    this._focusBoneListRow(neighborId);
                }
            });
            container.appendChild(row);
        });
    }

    _updateBoneSelectionUI(renderList = true) {
        const group = document.getElementById('rig-bone-stiffness-group');
        const nameInput = document.getElementById('rig-bone-name');
        const slider = document.getElementById('rig-bone-stiffness');
        const valueEl = document.getElementById('rig-bone-stiffness-val');
        const constraintsGroup = document.getElementById('rig-bone-constraints-group');
        const lockInput = document.getElementById('rig-bone-lock-ik');
        const minInput = document.getElementById('rig-bone-min-angle');
        const maxInput = document.getElementById('rig-bone-max-angle');
        const labelToggle = document.getElementById('rig-show-bone-labels');
        const contourToggle = document.getElementById('rig-contours');
        const bone = this._getBoneById(this._selectedBoneId);
        if (!group || !nameInput || !slider || !valueEl || !constraintsGroup || !lockInput || !minInput || !maxInput || !labelToggle) return;
        labelToggle.checked = this._rigObj?.rigging?.showBoneLabels !== false;
        if (contourToggle) contourToggle.checked = !!this._rigObj?.rigContours;
        // Rig contour options panel
        const rigContourOpts = document.getElementById('rig-contour-opts');
        if (rigContourOpts) {
            rigContourOpts.classList.toggle('hidden', !this._rigObj?.rigContours);
            const sizeSlider = document.getElementById('rig-contour-size');
            const sizeVal = document.getElementById('rig-contour-size-val');
            if (sizeSlider) sizeSlider.value = this._rigObj?.contourSize ?? 1;
            if (sizeVal) sizeVal.textContent = (this._rigObj?.contourSize ?? 1).toFixed(1);
            const colorPicker = document.getElementById('rig-contour-color');
            const autoCheck = document.getElementById('rig-contour-auto-color');
            const hasExplicit = !!this._rigObj?.contourColor;
            if (autoCheck) autoCheck.checked = !hasExplicit;
            if (colorPicker) {
                colorPicker.disabled = !hasExplicit;
                colorPicker.value = this._rigObj?.contourColor || '#888888';
            }
        }
        if (!bone) {
            group.classList.add('hidden');
            constraintsGroup.classList.add('hidden');
            if (renderList) this._renderBoneListUI();
            this._updateLockPinUI();
            return;
        }
        group.classList.remove('hidden');
        constraintsGroup.classList.remove('hidden');
        const displayName = this._getBoneDisplayName(bone);
        bone.name = displayName;
        nameInput.value = displayName;
        const percent = Math.round((typeof bone.stiffness === 'number' ? bone.stiffness : 1) * 100);
        slider.value = percent;
        valueEl.textContent = `${percent}%`;
        lockInput.checked = bone.ikLocked === true;
        minInput.value = typeof bone.minAngle === 'number' ? bone.minAngle : '';
        maxInput.value = typeof bone.maxAngle === 'number' ? bone.maxAngle : '';
        if (renderList) this._renderBoneListUI();
        this._updateLockPinUI();
    }

    _updateSelectedBoneConstraintInputs() {
        const bone = this._getBoneById(this._selectedBoneId);
        const minInput = document.getElementById('rig-bone-min-angle');
        const maxInput = document.getElementById('rig-bone-max-angle');
        if (!bone || !minInput || !maxInput) return;
        minInput.value = typeof bone.minAngle === 'number' ? bone.minAngle : '';
        maxInput.value = typeof bone.maxAngle === 'number' ? bone.maxAngle : '';
    }

    _applyConstraintPreset(presetName) {
        const bone = this._getBoneById(this._selectedBoneId);
        if (!bone) return;

        switch (presetName) {
            case 'left-elbow':
                bone.minAngle = -145;
                bone.maxAngle = -10;
                break;
            case 'right-elbow':
                bone.minAngle = 10;
                bone.maxAngle = 145;
                break;
            case 'left-knee':
                bone.minAngle = -140;
                bone.maxAngle = -5;
                break;
            case 'right-knee':
                bone.minAngle = 5;
                bone.maxAngle = 140;
                break;
            case 'neck':
                bone.minAngle = -45;
                bone.maxAngle = 45;
                break;
            case 'wrist':
                bone.minAngle = -70;
                bone.maxAngle = 70;
                break;
            default:
                return;
        }

        this._updateBoneSelectionUI();
        this._enforceAllBoneConstraints();
        this.stage.requestRender();
        eventBus.emit('history:push');
    }

    _getSelectedBoneGuideData(obj = this._rigObj, rig = this._rigObj?.rigging, zoom = this.stage.zoom) {
        const bone = this._getBoneById(this._selectedBoneId);
        if (!bone || !obj || !rig) return null;
        const parentPin = rig.pins.find(p => p.id === bone.parentPinId);
        const childPin = rig.pins.find(p => p.id === bone.childPinId);
        if (!parentPin || !childPin) return null;
        const parentX = obj.x + parentPin.x * obj.width;
        const parentY = obj.y + parentPin.y * obj.height;
        const childX = obj.x + childPin.x * obj.width;
        const childY = obj.y + childPin.y * obj.height;
        const currentAngle = Math.atan2(childY - parentY, childX - parentX);
        const referenceAngle = this._getBoneGuideReferenceAngle(obj, rig, bone);
        const radius = 26 / Math.max(0.001, zoom || 1);
        return { bone, parentPin, childPin, parentX, parentY, currentAngle, referenceAngle, radius };
    }

    _getConstraintHandlePoint(guide, handleType) {
        if (!guide) return null;
        const angleDeg = handleType === 'min' ? guide.bone.minAngle : guide.bone.maxAngle;
        if (typeof angleDeg !== 'number') return null;
        const angle = guide.referenceAngle + angleDeg * Math.PI / 180;
        return {
            x: guide.parentX + Math.cos(angle) * guide.radius,
            y: guide.parentY + Math.sin(angle) * guide.radius,
            angle
        };
    }

    _hitTestConstraintHandle(sx, sy) {
        const guide = this._getSelectedBoneGuideData();
        if (!guide) return null;
        const threshold = 9 / Math.max(0.001, this.stage.zoom || 1);
        for (const handleType of ['min', 'max']) {
            const point = this._getConstraintHandlePoint(guide, handleType);
            if (!point) continue;
            if (Math.hypot(sx - point.x, sy - point.y) <= threshold) {
                return { type: handleType, guide };
            }
        }
        return null;
    }

    _setConstraintFromPointer(handleType, pos) {
        const guide = this._getSelectedBoneGuideData();
        if (!guide) return;
        const pointerAngle = Math.atan2(pos.y - guide.parentY, pos.x - guide.parentX);
        const localDeg = this._snapConstraintAngle(this._normalizeDegrees((pointerAngle - guide.referenceAngle) * 180 / Math.PI));
        if (handleType === 'min') {
            guide.bone.minAngle = localDeg;
            if (typeof guide.bone.maxAngle === 'number' && guide.bone.minAngle > guide.bone.maxAngle) {
                guide.bone.maxAngle = guide.bone.minAngle;
            }
        } else {
            guide.bone.maxAngle = localDeg;
            if (typeof guide.bone.minAngle === 'number' && guide.bone.maxAngle < guide.bone.minAngle) {
                guide.bone.minAngle = guide.bone.maxAngle;
            }
        }
        this._updateSelectedBoneConstraintInputs();
        this._enforceAllBoneConstraints();
    }

    _applyToolPose(pin, norm, prevX, prevY) {
        const clamped = this._clampNormPoint(norm);
        if (this._rigTool === 'skeleton') {
            if (this._solveIKForPin(pin, clamped)) return;
            this._movePinSkeletally(pin, clamped, prevX, prevY);
            return;
        }

        pin.x = clamped.x;
        pin.y = clamped.y;
        this._applyFK(pin.id, prevX, prevY);
    }

    _movePinSkeletally(pin, norm, prevX, prevY) {
        const parentBone = this._getParentBone(pin.id);
        if (!parentBone) {
            pin.x = norm.x;
            pin.y = norm.y;
            this._applyFK(pin.id, prevX, prevY);
            this._enforceAllBoneConstraints();
            return;
        }

        const rig = this._rigObj?.rigging;
        const parentPin = rig?.pins.find(p => p.id === parentBone.parentPinId);
        if (!parentPin) {
            pin.x = norm.x;
            pin.y = norm.y;
            this._applyFK(pin.id, prevX, prevY);
            return;
        }

        const restLen = Math.hypot(pin.restX - parentPin.restX, pin.restY - parentPin.restY);
        const dx = norm.x - parentPin.x;
        const dy = norm.y - parentPin.y;
        const dragLen = Math.hypot(dx, dy);

        if (dragLen < 1e-6) {
            const restDx = pin.restX - parentPin.restX;
            const restDy = pin.restY - parentPin.restY;
            const restDirLen = Math.hypot(restDx, restDy) || 1;
            pin.x = parentPin.x + (restDx / restDirLen) * restLen;
            pin.y = parentPin.y + (restDy / restDirLen) * restLen;
        } else {
            pin.x = parentPin.x + (dx / dragLen) * restLen;
            pin.y = parentPin.y + (dy / dragLen) * restLen;
        }

        this._applyFK(pin.id, prevX, prevY);
        this._enforceAllBoneConstraints();
    }

    _solveIKForPin(pin, target) {
        if (this._rigTool !== 'skeleton') return false;
        if (this._getChildBones(pin.id).length > 0) return false;

        const chain = this._getChainToRoot(pin.id);
        if (chain.pins.length < 3) return false;

        const oldPositions = {};
        chain.pins.forEach(chainPin => {
            oldPositions[chainPin.id] = { x: chainPin.x, y: chainPin.y };
        });

        const endPin = chain.pins[chain.pins.length - 1];
        for (let iteration = 0; iteration < 8; iteration++) {
            for (let index = chain.pins.length - 2; index >= 0; index--) {
                const pivot = chain.pins[index];
                const effector = chain.pins[chain.pins.length - 1];
                const currentAngle = Math.atan2(effector.y - pivot.y, effector.x - pivot.x);
                const targetAngle = Math.atan2(target.y - pivot.y, target.x - pivot.x);
                let deltaAngle = targetAngle - currentAngle;
                if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                else if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
                const bone = chain.bones[index];
                if (bone?.ikLocked) continue;
                const stiffness = bone ? (typeof bone.stiffness === 'number' ? bone.stiffness : 1) : 1;
                deltaAngle *= stiffness;
                if (Math.abs(deltaAngle) < 1e-5) continue;

                const cosA = Math.cos(deltaAngle);
                const sinA = Math.sin(deltaAngle);
                for (let jointIndex = index + 1; jointIndex < chain.pins.length; jointIndex++) {
                    const joint = chain.pins[jointIndex];
                    const dx = joint.x - pivot.x;
                    const dy = joint.y - pivot.y;
                    joint.x = pivot.x + dx * cosA - dy * sinA;
                    joint.y = pivot.y + dx * sinA + dy * cosA;
                }
                this._enforceConstraintsOnBones(chain.bones);
            }

            if (Math.hypot(endPin.x - target.x, endPin.y - target.y) < 0.0025) break;
        }

        for (let index = 0; index < chain.bones.length; index++) {
            const parentPin = chain.pins[index];
            const childPin = chain.pins[index + 1];
            const oldParent = oldPositions[parentPin.id];
            const oldChild = oldPositions[childPin.id];
            if (!oldParent || !oldChild) continue;
            const oldAngle = Math.atan2(oldChild.y - oldParent.y, oldChild.x - oldParent.x);
            const newAngle = Math.atan2(childPin.y - parentPin.y, childPin.x - parentPin.x);
            let deltaAngle = newAngle - oldAngle;
            if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            else if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
            const nextChainPinId = chain.pins[index + 2]?.id || null;
            this._rotateChildrenSelective(childPin.id, childPin.x, childPin.y, deltaAngle, nextChainPinId);
        }

        this._enforceAllBoneConstraints();

        return true;
    }

    _getChainToRoot(pinId) {
        const rig = this._rigObj?.rigging;
        if (!rig) return { pins: [], bones: [] };

        const pins = [];
        const bones = [];
        let currentPin = rig.pins.find(pin => pin.id === pinId) || null;
        while (currentPin) {
            pins.unshift(currentPin);
            const parentBone = rig.bones.find(bone => bone.childPinId === currentPin.id);
            if (!parentBone) break;
            bones.unshift(parentBone);
            const parentPin = rig.pins.find(pin => pin.id === parentBone.parentPinId) || null;
            if (!parentPin) break;

            // Stop at branching points — pins that are parents of multiple bones.
            // Without this, IK chains can span the entire skeleton (e.g. hand → spine → hip),
            // causing wild whole-body distortion when dragging a single limb endpoint.
            const childBoneCount = rig.bones.filter(b => b.parentPinId === parentPin.id).length;
            if (childBoneCount > 1) {
                pins.unshift(parentPin);   // include the branch point as the chain root (fixed anchor)
                break;
            }

            currentPin = parentPin;
        }
        return { pins, bones };
    }

    _normalizeRadians(angle) {
        if (angle > Math.PI) return angle - Math.PI * 2;
        if (angle < -Math.PI) return angle + Math.PI * 2;
        return angle;
    }

    _normalizeDegrees(angle) {
        if (angle > 180) return angle - 360;
        if (angle < -180) return angle + 360;
        return angle;
    }

    _getBoneDirectionAngle(bone, useRest = false) {
        const rig = this._rigObj?.rigging;
        if (!rig) return 0;
        const parentPin = rig.pins.find(p => p.id === bone.parentPinId);
        const childPin = rig.pins.find(p => p.id === bone.childPinId);
        if (!parentPin || !childPin) return 0;
        const x1 = useRest ? parentPin.restX : parentPin.x;
        const y1 = useRest ? parentPin.restY : parentPin.y;
        const x2 = useRest ? childPin.restX : childPin.x;
        const y2 = useRest ? childPin.restY : childPin.y;
        return Math.atan2(y2 - y1, x2 - x1);
    }

    _getBoneReferenceAngle(bone) {
        const parentBone = this._getParentBone(bone.parentPinId);
        return parentBone ? this._getBoneDirectionAngle(parentBone, false) : this._getBoneDirectionAngle(bone, true);
    }

    _getBoneLocalAngleDegrees(bone) {
        const current = this._getBoneDirectionAngle(bone, false);
        const reference = this._getBoneReferenceAngle(bone);
        return this._normalizeDegrees((current - reference) * 180 / Math.PI);
    }

    _rotateBoneSubtree(bone, deltaAngle) {
        const rig = this._rigObj?.rigging;
        if (!rig || Math.abs(deltaAngle) < 1e-6) return;
        const parentPin = rig.pins.find(p => p.id === bone.parentPinId);
        const childPin = rig.pins.find(p => p.id === bone.childPinId);
        if (!parentPin || !childPin) return;

        const cosA = Math.cos(deltaAngle);
        const sinA = Math.sin(deltaAngle);
        const rotateRecursive = (pinId) => {
            const pin = rig.pins.find(p => p.id === pinId);
            if (!pin) return;
            const dx = pin.x - parentPin.x;
            const dy = pin.y - parentPin.y;
            pin.x = parentPin.x + dx * cosA - dy * sinA;
            pin.y = parentPin.y + dx * sinA + dy * cosA;
            rig.bones.filter(childBone => childBone.parentPinId === pinId).forEach(childBone => rotateRecursive(childBone.childPinId));
        };

        rotateRecursive(childPin.id);
    }

    _getBonesByDepth() {
        const rig = this._rigObj?.rigging;
        if (!rig) return [];
        const depthMap = new Map();
        const getDepth = (bone) => {
            if (depthMap.has(bone.id)) return depthMap.get(bone.id);
            const parentBone = this._getParentBone(bone.parentPinId);
            const depth = parentBone ? getDepth(parentBone) + 1 : 0;
            depthMap.set(bone.id, depth);
            return depth;
        };
        return [...rig.bones].sort((a, b) => getDepth(a) - getDepth(b));
    }

    _enforceBoneConstraint(bone) {
        if (!bone) return;
        const hasMin = typeof bone.minAngle === 'number';
        const hasMax = typeof bone.maxAngle === 'number';
        if (!hasMin && !hasMax) return;

        const currentAngle = this._getBoneLocalAngleDegrees(bone);
        let targetAngle = currentAngle;
        if (hasMin) targetAngle = Math.max(targetAngle, bone.minAngle);
        if (hasMax) targetAngle = Math.min(targetAngle, bone.maxAngle);
        if (Math.abs(targetAngle - currentAngle) < 0.001) return;

        this._rotateBoneSubtree(bone, (targetAngle - currentAngle) * Math.PI / 180);
    }

    _enforceConstraintsOnBones(bones) {
        bones.forEach(bone => this._enforceBoneConstraint(bone));
    }

    _enforceAllBoneConstraints() {
        this._enforceConstraintsOnBones(this._getBonesByDepth());
    }

    _updateRigModeUI() {
        const rig = this._rigObj?.rigging;
        const badge = document.getElementById('rig-mode-badge');
        const meshLabel = document.getElementById('rig-mesh-density-label');
        const meshSlider = document.getElementById('rig-mesh-density');
        const modeDescription = document.getElementById('rig-mode-description');
        const isDeform = (rig?.deformationMode || 'skeletal') === 'mesh';

        if (badge) {
            badge.textContent = isDeform ? 'Image Deform' : 'Legacy Skeleton';
            badge.classList.toggle('is-deform', isDeform);
        }
        const ikHint = document.getElementById('rig-ik-hint');
        if (ikHint) {
            ikHint.classList.toggle('hidden', isDeform);
            if (!isDeform) {
                ikHint.textContent = 'Legacy single-image skeleton mode is still available, but character animation should use Cutout Joints & Assembly.';
            }
        }
        if (meshLabel) meshLabel.textContent = isDeform ? 'Deform Mesh Density' : 'Mesh Density (used by deform mode)';
        if (meshSlider) meshSlider.disabled = !isDeform;
        if (modeDescription) {
            modeDescription.textContent = isDeform
                ? 'Advanced single-image mesh warp for squash, stretch, and localized distortion.'
                : 'Legacy single-image skeleton posing. For characters, use Body Stencil, Smart Cut, and Cutout Joints & Assembly.';
        }
    }

    // ── Forward Kinematics ──

    /**
     * When a pin is moved in pose mode, propagate to child bones.
     * If the pin is the child-end of a bone, compute the rotation delta and
     * rotate all downstream children. Otherwise just translate children.
     */
    _applyFK(movedPinId, prevX, prevY) {
        const rig = this._rigObj?.rigging;
        if (!rig || rig.bones.length === 0) return;

        const movedPin = rig.pins.find(p => p.id === movedPinId);
        if (!movedPin) return;

        // Is this pin the child end of a bone? → rotation FK
        const parentBone = rig.bones.find(b => b.childPinId === movedPinId);
        if (parentBone) {
            const parentPin = rig.pins.find(p => p.id === parentBone.parentPinId);
            if (parentPin) {
                const oldAngle = Math.atan2(prevY - parentPin.y, prevX - parentPin.x);
                const newAngle = Math.atan2(movedPin.y - parentPin.y, movedPin.x - parentPin.x);
                let dAngle = newAngle - oldAngle;
                if (dAngle > Math.PI) dAngle -= Math.PI * 2;
                else if (dAngle < -Math.PI) dAngle += Math.PI * 2;
                this._rotateChildren(movedPinId, movedPin.x, movedPin.y, dAngle);
                return;
            }
        }

        // Otherwise just translate children
        const dx = movedPin.x - prevX;
        const dy = movedPin.y - prevY;
        this._translateChildren(movedPinId, dx, dy);

        if (this._rigTool === 'skeleton') {
            this._enforceAllBoneConstraints();
        }
    }

    _rotateChildren(parentPinId, cx, cy, angle) {
        const rig = this._rigObj.rigging;

        rig.bones.filter(b => b.parentPinId === parentPinId).forEach(bone => {
            const child = rig.pins.find(p => p.id === bone.childPinId);
            if (!child) return;
            const weightedAngle = this._rigTool === 'skeleton'
                ? angle
                : angle * (typeof bone.stiffness === 'number' ? bone.stiffness : 1);
            const cosA = Math.cos(weightedAngle), sinA = Math.sin(weightedAngle);
            const dx = child.x - cx, dy = child.y - cy;
            child.x = cx + dx * cosA - dy * sinA;
            child.y = cy + dx * sinA + dy * cosA;
            this._rotateChildren(child.id, child.x, child.y, weightedAngle);
        });
    }

    _rotateChildrenSelective(parentPinId, cx, cy, angle, excludedChildId = null) {
        const rig = this._rigObj.rigging;
        rig.bones.filter(b => b.parentPinId === parentPinId && b.childPinId !== excludedChildId).forEach(bone => {
            const child = rig.pins.find(p => p.id === bone.childPinId);
            if (!child) return;
            const weightedAngle = this._rigTool === 'skeleton'
                ? angle
                : angle * (typeof bone.stiffness === 'number' ? bone.stiffness : 1);
            const cosA = Math.cos(weightedAngle), sinA = Math.sin(weightedAngle);
            const dx = child.x - cx, dy = child.y - cy;
            child.x = cx + dx * cosA - dy * sinA;
            child.y = cy + dx * sinA + dy * cosA;
            this._rotateChildrenSelective(child.id, child.x, child.y, weightedAngle, null);
        });
    }

    _translateChildren(parentPinId, dx, dy) {
        const rig = this._rigObj.rigging;
        rig.bones.filter(b => b.parentPinId === parentPinId).forEach(bone => {
            const child = rig.pins.find(p => p.id === bone.childPinId);
            if (!child) return;
            child.x += dx;
            child.y += dy;
            this._translateChildren(child.id, dx, dy);
        });
    }

    // ── Pose helpers ──

    resetPose() {
        const rig = this._rigObj?.rigging;
        if (!rig) return;
        rig.pins.forEach(p => { p.x = p.restX; p.y = p.restY; });
        this.stage.requestRender();
    }

    /** Revert to rest pose and record it as a keyframe if recording is active */
    revertToRestAndRecord() {
        const rig = this._rigObj?.rigging;
        if (!rig) return;

        const beforePose = this.getCurrentPose();

        // Reset pins to rest
        rig.pins.forEach(p => { p.x = p.restX; p.y = p.restY; });
        this.stage.requestRender();

        if (this._isRecording) {
            const restPose = this.getCurrentPose();
            this._commitRecordedPose(beforePose, restPose);
            Utils.showToast('Rest pose keyframe recorded', 'success');
        } else {
            Utils.showToast('Pose reverted to rest', 'info');
        }
    }

    getCurrentPose() {
        const rig = this._rigObj?.rigging;
        if (!rig) return null;
        const pose = {};
        rig.pins.forEach(p => { pose[p.id] = { x: p.x, y: p.y }; });
        return pose;
    }

    /** Get the rest pose (all pins at rest positions) */
    getRestPose() {
        const rig = this._rigObj?.rigging;
        if (!rig) return null;
        const pose = {};
        rig.pins.forEach(p => { pose[p.id] = { x: p.restX, y: p.restY }; });
        return pose;
    }

    // ── Recording integration ──

    /** Check if recording is active (from ObjectManager) */
    get _isRecording() {
        return this.objects._isRecording === true;
    }

    /** Snapshot the current pose before a recording drag starts */
    _snapshotPoseForRecording() {
        this._recordPoseSnapshot = this.getCurrentPose();
    }

    /** After a pose drag, check if anything changed and auto-record */
    _checkPoseRecording() {
        if (!this._recordPoseSnapshot) return;
        // Skip one-shot pose recording during continuous recording
        if (this.objects?._contRec?.active) { this._recordPoseSnapshot = null; return; }
        const currentPose = this.getCurrentPose();
        if (!currentPose) { this._recordPoseSnapshot = null; return; }

        // Check if any pin moved significantly
        let hasMoved = false;
        for (const pinId of Object.keys(currentPose)) {
            const before = this._recordPoseSnapshot[pinId];
            const after = currentPose[pinId];
            if (!before || !after) continue;
            if (Math.abs(before.x - after.x) > 0.001 || Math.abs(before.y - after.y) > 0.001) {
                hasMoved = true;
                break;
            }
        }

        if (!hasMoved) {
            this._recordPoseSnapshot = null;
            return;
        }

        // Auto-commit: record keyframe immediately, pose stays deformed
        this._commitRecordedPose(this._recordPoseSnapshot, currentPose);
        this._recordPoseSnapshot = null;
    }

    /** Apply a pose snapshot to the current rig object's pins */
    _applyPose(pose) {
        const rig = this._rigObj?.rigging;
        if (!rig || !pose) return;
        rig.pins.forEach(pin => {
            if (pose[pin.id]) {
                pin.x = pose[pin.id].x;
                pin.y = pose[pin.id].y;
            }
        });
    }

    /** Commit recorded pose as keyframes on the bone-pose animation */
    _commitRecordedPose(beforePose, afterPose) {
        if (!this._rigObj || !this._rigObj.rigging) return;
        const animEngine = this.objects.animations;
        if (!animEngine) return;

        const obj = this._rigObj;
        const totalDuration = animEngine.totalDuration || 5000;
        const currentTime = animEngine.currentTime || 0;
        const t = Math.max(0, Math.min(currentTime / totalDuration, 1));

        // Find or create bone-pose animation
        let boneAnim = obj.animations.find(a => a.generated?.type === 'bone-pose');

        if (!boneAnim) {
            // Create new bone-pose animation with rest pose at t=0 and recorded pose at playhead
            const restPose = this.getRestPose();
            const keyframes = [];

            // If playhead is not at the start, add a rest (or before) keyframe at t=0
            if (t > 0.01) {
                keyframes.push({ t: 0, pose: beforePose });
            }
            keyframes.push({ t: Math.max(t, 0.01), pose: afterPose });

            boneAnim = {
                id: Utils.generateId('anim'),
                type: 'bone-pose',
                name: 'Bone Animation',
                params: { duration: totalDuration / 1000, easing: 'easeInOut' },
                delay: 0,
                repeat: '1',
                trigger: 'onLoad',
                startMode: 'from-start',
                generated: {
                    type: 'bone-pose',
                    duration: totalDuration,
                    easing: 'easeInOut',
                    keyframes: keyframes
                }
            };
            obj.animations.push(boneAnim);
        } else {
            // Update existing animation — merge keyframe at current time
            this._normalizeBonePoseAnimation(boneAnim);
            const kfs = boneAnim.generated.keyframes;
            const existIdx = kfs.findIndex(kf => Math.abs(kf.t - t) < 0.005);
            if (existIdx >= 0) {
                kfs[existIdx].pose = afterPose;
            } else {
                kfs.push({ t, pose: afterPose });
                kfs.sort((a, b) => a.t - b.t);
            }
            boneAnim.generated.duration = totalDuration;
            boneAnim.params.duration = totalDuration / 1000;
        }

        this._normalizeBonePoseAnimation(boneAnim);

        // Keep the deformed pose visible — do NOT revert
        this.stage.requestRender();

        eventBus.emit('animations:changed');
        eventBus.emit('timeline:update');
        Utils.showToast(`Pose keyframe recorded at ${(t * 100).toFixed(0)}%`, 'success');
    }

    _normalizeBonePoseAnimation(anim) {
        if (!anim) return anim;
        if (!anim.generated || anim.generated.type !== 'bone-pose') {
            anim.generated = {
                type: 'bone-pose',
                duration: Number(anim.duration || anim.params?.duration * 1000) || 5000,
                easing: anim.easing || anim.params?.easing || 'easeInOut',
                keyframes: Array.isArray(anim.keyframes) ? anim.keyframes : []
            };
        }
        const generated = anim.generated;
        generated.keyframes = Array.isArray(generated.keyframes) ? generated.keyframes : [];
        generated.keyframes.sort((a, b) => Number(a.t || 0) - Number(b.t || 0));
        generated.duration = Math.max(100, Number(generated.duration || anim.duration || (anim.params?.duration || 5) * 1000) || 5000);
        generated.easing = generated.easing || anim.easing || anim.params?.easing || 'easeInOut';

        anim.type = 'bone-pose';
        anim.name = anim.name || 'Image Deform Animation';
        anim.duration = generated.duration;
        anim.easing = generated.easing;
        anim.keyframes = generated.keyframes;
        anim.params = {
            ...(anim.params || {}),
            duration: generated.duration / 1000,
            easing: generated.easing,
            delay: Number(anim.delay || anim.params?.delay || 0) / 1000 || 0,
            repeat: anim.repeat ?? anim.params?.repeat ?? '1',
            repeatMode: anim.repeatMode || anim.params?.repeatMode || 'restart',
            startMode: anim.startMode || anim.params?.startMode || 'from-start'
        };
        anim.delay = Number(anim.delay || 0);
        anim.repeat = anim.repeat ?? '1';
        anim.repeatMode = anim.repeatMode || 'restart';
        anim.trigger = anim.trigger || 'onLoad';
        anim.startMode = anim.startMode || 'from-start';
        return anim;
    }

    /**
     * Save the current pose as a keyframe at the current timeline position.
     * Creates or updates a bone-pose animation on the object.
     */
    addPoseKeyframe() {
        if (!this._rigObj || !this._rigObj.rigging) return;
        const animEngine = this.objects.animations;
        if (!animEngine) return;

        const obj = this._rigObj;
        const pose = this.getCurrentPose();
        if (!pose || Object.keys(pose).length === 0) {
            Utils.showToast('Add pins before creating keyframes', 'warning');
            return;
        }

        const totalDuration = animEngine.totalDuration || 5000;
        const currentTime = animEngine.currentTime || 0;
        const t = Math.max(0, Math.min(currentTime / totalDuration, 1));

        // Find existing bone-pose animation
        let boneAnim = obj.animations.find(a => a.generated?.type === 'bone-pose');

        if (!boneAnim) {
            const restPose = this.getRestPose();
            const keyframes = t > 0.01
                ? [{ t: 0, pose: restPose }, { t, pose }]
                : [{ t: 0, pose }];
            boneAnim = {
                id: Utils.generateId('anim'),
                type: 'bone-pose',
                name: 'Image Deform Animation',
                params: { duration: totalDuration / 1000, easing: 'easeInOut' },
                delay: 0,
                repeat: '1',
                trigger: 'onLoad',
                startMode: 'from-start',
                generated: {
                    type: 'bone-pose',
                    duration: totalDuration,
                    easing: 'easeInOut',
                    keyframes
                }
            };
            obj.animations.push(boneAnim);
        } else {
            this._normalizeBonePoseAnimation(boneAnim);
            const kfs = boneAnim.generated.keyframes;
            const existIdx = kfs.findIndex(kf => Math.abs(kf.t - t) < 0.005);
            if (existIdx >= 0) {
                kfs[existIdx].pose = pose;
            } else {
                kfs.push({ t, pose });
                kfs.sort((a, b) => a.t - b.t);
            }
            boneAnim.generated.duration = totalDuration;
            boneAnim.params.duration = totalDuration / 1000;
        }
        this._normalizeBonePoseAnimation(boneAnim);

        eventBus.emit('animations:changed');
        eventBus.emit('timeline:update');
        Utils.showToast(`Pose keyframe added at ${(t * 100).toFixed(0)}%`, 'success');
    }

    // ── Mesh density ──

    setMeshDensity(density) {
        const rig = this._rigObj?.rigging;
        if (!rig) return;
        rig.meshDensity = density;
        // Invalidate cache so it rebuilds
        rig._meshCache = null;
        RiggingUtils.ensureMesh(rig);
        this.stage.requestRender();
    }

    // ── Hit testing ──

    _clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }

    _clampNormPoint(point) {
        return {
            x: this._clamp01(point?.x ?? 0.5),
            y: this._clamp01(point?.y ?? 0.5)
        };
    }

    _stageToNorm(sx, sy) {
        const obj = this._rigObj;
        return { x: (sx - obj.x) / obj.width, y: (sy - obj.y) / obj.height };
    }

    _hitTestPin(sx, sy) {
        const obj = this._rigObj;
        const rig = obj?.rigging;
        if (!rig) return null;
        const r = 12 / this.stage.zoom;
        for (let i = rig.pins.length - 1; i >= 0; i--) {
            const pin = rig.pins[i];
            const px = obj.x + pin.x * obj.width;
            const py = obj.y + pin.y * obj.height;
            if ((sx - px) ** 2 + (sy - py) ** 2 <= r * r) return pin;
        }
        return null;
    }

    _hitTestBone(sx, sy) {
        const obj = this._rigObj;
        const rig = obj?.rigging;
        if (!rig) return null;
        const threshold = 6 / this.stage.zoom;
        for (const bone of rig.bones) {
            const p1 = rig.pins.find(p => p.id === bone.parentPinId);
            const p2 = rig.pins.find(p => p.id === bone.childPinId);
            if (!p1 || !p2) continue;
            const x1 = obj.x + p1.x * obj.width, y1 = obj.y + p1.y * obj.height;
            const x2 = obj.x + p2.x * obj.width, y2 = obj.y + p2.y * obj.height;
            const dist = this._pointToSegmentDist(sx, sy, x1, y1, x2, y2);
            if (dist <= threshold) return bone;
        }
        return null;
    }

    _pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    // ── Mouse event handlers (called from ObjectManager) ──

    handleMouseDown(pos, event) {
        if (!this._rigMode || !this._rigObj) return false;

        const hitConstraintHandle = this._hitTestConstraintHandle(pos.x, pos.y);
        if (hitConstraintHandle) {
            this._draggingConstraintHandle = hitConstraintHandle.type;
            this._constraintDragModifiers = event || null;
            this.stage.requestRender();
            return true;
        }

        const hitPin = this._hitTestPin(pos.x, pos.y);
        const hitBone = hitPin ? null : this._hitTestBone(pos.x, pos.y);
        if (this._rigTool === 'pin') {
            if (hitPin) {
                // Alt+click toggles anchor on a pin
                if (event?.altKey) {
                    this.togglePinAnchor(hitPin.id);
                    return true;
                }
                this._selectedPinId = hitPin.id;
                this._selectedBoneId = null;
                this._draggingPinId = hitPin.id;
                this._dragPrevPos = { x: hitPin.x, y: hitPin.y };
                this._updateBoneSelectionUI();
            } else if (hitBone) {
                this._selectedPinId = null;
                this._selectedBoneId = null;
                this._updateBoneSelectionUI();
                this._selectBone(hitBone.id);
            } else {
                // Left-click on empty space inside image — add a pin
                const norm = this._stageToNorm(pos.x, pos.y);
                if (norm.x >= 0 && norm.x <= 1 && norm.y >= 0 && norm.y <= 1) {
                    const pin = this.addPin(norm.x, norm.y);
                    eventBus.emit('history:push');
                    this._activateDeformAfterPinPlacement(pin);
                } else {
                    // Outside image — just deselect
                    this._selectedPinId = null;
                    this._selectedBoneId = null;
                    this._updateBoneSelectionUI();
                }
            }
        } else if (this._rigTool === 'bone') {
            if (hitPin) {
                if (!this._boneStartPinId) {
                    this._boneStartPinId = hitPin.id;
                    this._selectedPinId = hitPin.id;
                    this._selectedBoneId = null;
                    this._updateBoneSelectionUI();
                    Utils.showToast('First pin selected — click a second pin to create bone', 'info');
                } else if (hitPin.id !== this._boneStartPinId) {
                    const bone = this.addBone(this._boneStartPinId, hitPin.id);
                    this._boneStartPinId = null;
                    if (bone) Utils.showToast('Bone created', 'success');
                }
            } else if (hitBone) {
                this._boneStartPinId = null;
                this._selectBone(hitBone.id);
            } else {
                this._boneStartPinId = null;
            }
        } else if (this._rigTool === 'bone-select') {
            if (hitBone) {
                this._selectBone(hitBone.id);
            } else if (hitPin) {
                this._selectConnectedBoneFromPin(hitPin.id, pos);
            }
        } else if (this._isPoseTool()) {
            if (hitPin) {
                this._selectedPinId = hitPin.id;
                this._selectedBoneId = null;
                if (event?.altKey) {
                    // Alt+click in deform mode toggles anchor (same as in pin mode)
                    this.togglePinAnchor(hitPin.id);
                    this._updateLockPinUI();
                    this.stage.requestRender();
                    return true;
                }
                if (hitPin.anchor) {
                    Utils.showToast('Pin is anchored — click Lock Pin button or Alt+click to unlock', 'info');
                } else {
                    this._draggingPinId = hitPin.id;
                    this._dragPrevPos = { x: hitPin.x, y: hitPin.y };
                }
                this._updateBoneSelectionUI();
                // Snapshot for recording
                if (this._isRecording) {
                    this._snapshotPoseForRecording();
                    // Also snapshot objects for one-shot recording (captures jointBaseAngle etc.)
                    this.objects._snapshotForRecording(true);
                }
            } else if (hitBone) {
                this._selectBone(hitBone.id);
            }
        }

        this.stage.requestRender();
        return true;
    }

    handleContextMenu(pos) {
        if (!this._rigMode || !this._rigObj) return false;
        if (this._rigTool === 'pin') {
            const norm = this._stageToNorm(pos.x, pos.y);
            if (norm.x >= 0 && norm.x <= 1 && norm.y >= 0 && norm.y <= 1) {
                const pin = this.addPin(norm.x, norm.y);
                this._activateDeformAfterPinPlacement(pin);
                this.stage.requestRender();
                return true;
            }
        }
        return false;
    }

    handleMouseMove(pos, event) {
        if (!this._rigMode || !this._rigObj) return false;
        this._cursorPos = pos;

        if (this._draggingConstraintHandle) {
            this._constraintDragModifiers = event || null;
            this._setConstraintFromPointer(this._draggingConstraintHandle, pos);
            this.stage.requestRender();
            return true;
        }

        if (this._draggingPinId && (this._rigTool === 'pin' || this._isPoseTool())) {
            const rig = this._rigObj.rigging;
            const pin = rig.pins.find(p => p.id === this._draggingPinId);
            if (pin) {
                const norm = this._clampNormPoint(this._stageToNorm(pos.x, pos.y));
                const prevX = pin.x, prevY = pin.y;

                if (this._rigTool === 'pin') {
                    // In pin mode, move rest + current (repositioning)
                    pin.restX = norm.x;
                    pin.restY = norm.y;
                    pin.x = pin.restX;
                    pin.y = pin.restY;
                    // Rebuild weights since rest changed
                    if (rig._meshCache) rig._meshCache._pinHash = null;
                    RiggingUtils.ensureMesh(rig);
                } else {
                    this._applyToolPose(pin, norm, prevX, prevY);
                }
                this.stage.requestRender();
            }
            return true;
        }

        // Bone creation preview line needs render
        if (this._rigTool === 'bone' && this._boneStartPinId) {
            this.stage.requestRender();
            return true;
        }

        return true; // consume mouse in rig mode
    }

    handleMouseUp(pos, event) {
        if (!this._rigMode) return false;
        if (this._draggingConstraintHandle) {
            this._draggingConstraintHandle = null;
            this._constraintDragModifiers = null;
            eventBus.emit('history:push');
            return true;
        }
        const wasDraggingPose = this._draggingPinId && this._isPoseTool();
        this._draggingPinId = null;
        this._dragPrevPos = null;

        // If recording is active and we just finished a pose drag, show confirm
        if (wasDraggingPose && this._isRecording && this._recordPoseSnapshot) {
            this._checkPoseRecording();
            // Also trigger one-shot object recording confirm (captures jointBaseAngle, x, y etc.)
            if (this.objects._recordSnapshots) {
                this.objects._showRecordingConfirm();
            }
        } else if (wasDraggingPose) {
            eventBus.emit('history:push');
        }
        return true;
    }

    // ── Delete selected ──

    deleteSelected() {
        if (this._selectedPinId) {
            this.removePin(this._selectedPinId);
        } else if (this._selectedBoneId) {
            this.removeBone(this._selectedBoneId);
        }
    }

    deleteAllPins() {
        const rig = this._rigObj?.rigging;
        if (!rig || rig.pins.length === 0) {
            Utils.showToast('No pins to delete', 'info');
            return;
        }
        rig.pins = [];
        rig.bones = [];
        this._selectedPinId = null;
        this._selectedBoneId = null;
        RiggingUtils.ensureMesh(rig);
        this._updateBoneSelectionUI();
        this._renderBoneListUI();
        this.stage.requestRender();
        Utils.showToast('All pins and bones deleted', 'success');
    }

    // ── Rendering overlay (bones, pins, mesh wireframe) ──

    renderOverlay(ctx) {
        if (!this._rigMode || !this._rigObj) return;

        const obj = this._rigObj;
        const rig = obj.rigging;
        if (!rig) return;

        const zoom = Math.max(0.001, this.stage.zoom);

        // Semi-transparent border around the image
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.setLineDash([]);
        ctx.restore();

        // Mesh wireframe (faint)
        if (rig.pins.length > 0 && rig.deformationMode === 'mesh') {
            const mesh = RiggingUtils.deformMesh(rig);
            if (mesh) {
                ctx.save();
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.12)';
                ctx.lineWidth = 0.5 / zoom;
                mesh.triangles.forEach(tri => {
                    const v0 = mesh.vertices[tri[0]], v1 = mesh.vertices[tri[1]], v2 = mesh.vertices[tri[2]];
                    ctx.beginPath();
                    ctx.moveTo(obj.x + v0.x * obj.width, obj.y + v0.y * obj.height);
                    ctx.lineTo(obj.x + v1.x * obj.width, obj.y + v1.y * obj.height);
                    ctx.lineTo(obj.x + v2.x * obj.width, obj.y + v2.y * obj.height);
                    ctx.closePath();
                    ctx.stroke();
                });
                ctx.restore();
            }
        }

        // Bones (tapered shape)
        rig.bones.forEach(bone => {
            const p1 = rig.pins.find(p => p.id === bone.parentPinId);
            const p2 = rig.pins.find(p => p.id === bone.childPinId);
            if (!p1 || !p2) return;
            const x1 = obj.x + p1.x * obj.width, y1 = obj.y + p1.y * obj.height;
            const x2 = obj.x + p2.x * obj.width, y2 = obj.y + p2.y * obj.height;
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const bw = Math.min(8 / zoom, Math.max(3 / zoom, len * 0.12));

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(
                x1 + Math.cos(angle + Math.PI / 2) * bw + Math.cos(angle) * len * 0.2,
                y1 + Math.sin(angle + Math.PI / 2) * bw + Math.sin(angle) * len * 0.2
            );
            ctx.lineTo(x2, y2);
            ctx.lineTo(
                x1 + Math.cos(angle - Math.PI / 2) * bw + Math.cos(angle) * len * 0.2,
                y1 + Math.sin(angle - Math.PI / 2) * bw + Math.sin(angle) * len * 0.2
            );
            ctx.closePath();
            const isSelected = bone.id === this._selectedBoneId;
            const hasConstraints = typeof bone.minAngle === 'number' || typeof bone.maxAngle === 'number';
            const fillStyle = isSelected
                ? 'rgba(0, 200, 255, 0.28)'
                : bone.ikLocked
                    ? 'rgba(255, 134, 82, 0.32)'
                    : hasConstraints
                        ? 'rgba(120, 220, 160, 0.28)'
                        : 'rgba(255, 200, 50, 0.35)';
            const strokeStyle = isSelected
                ? 'rgba(0, 200, 255, 0.95)'
                : bone.ikLocked
                    ? 'rgba(255, 134, 82, 0.95)'
                    : hasConstraints
                        ? 'rgba(120, 220, 160, 0.95)'
                        : 'rgba(255, 200, 50, 0.8)';
            ctx.fillStyle = fillStyle;
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 1.5 / zoom;
            ctx.fill();
            ctx.stroke();
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            if (rig.showBoneLabels !== false) {
                ctx.fillStyle = isSelected ? 'rgba(0, 200, 255, 0.95)' : strokeStyle;
                ctx.font = `${10 / zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(this._getBoneDisplayName(bone), midX, midY - 16 / zoom);
                const lockMark = bone.ikLocked ? ' lock' : '';
                ctx.fillText(`${Math.round((typeof bone.stiffness === 'number' ? bone.stiffness : 1) * 100)}%${lockMark}`, midX, midY - 6 / zoom);
            }
            ctx.restore();
        });

        this._renderSelectedBoneGuide(ctx, obj, rig, zoom);

        // Pins
        const pinR = 6 / zoom;
        rig.pins.forEach(pin => {
            const px = obj.x + pin.x * obj.width;
            const py = obj.y + pin.y * obj.height;

            ctx.beginPath();
            ctx.arc(px, py, pinR, 0, Math.PI * 2);
            if (pin.id === this._selectedPinId) {
                ctx.fillStyle = '#ff6b35';
                ctx.strokeStyle = '#fff';
            } else if (pin.anchor) {
                ctx.fillStyle = '#10b981';          // green for anchored
                ctx.strokeStyle = '#fff';
            } else {
                ctx.fillStyle = '#4a90d9';
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            }
            ctx.lineWidth = 1.5 / zoom;
            ctx.fill();
            ctx.stroke();

            // Centre dot — anchor icon (square) vs normal (circle)
            if (pin.anchor) {
                const sq = 2.5 / zoom;
                ctx.fillStyle = '#fff';
                ctx.fillRect(px - sq, py - sq, sq * 2, sq * 2);
            } else {
                ctx.beginPath();
                ctx.arc(px, py, 2 / zoom, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }
        });

        // Bone-creation preview line
        if (this._rigTool === 'bone' && this._boneStartPinId && this._cursorPos) {
            const sp = rig.pins.find(p => p.id === this._boneStartPinId);
            if (sp) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash([4 / zoom, 4 / zoom]);
                ctx.beginPath();
                ctx.moveTo(obj.x + sp.x * obj.width, obj.y + sp.y * obj.height);
                ctx.lineTo(this._cursorPos.x, this._cursorPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // Recording indicator (red dot + "REC" near top-right of image)
        if (this._isRecording && this._isPoseTool()) {
            const rx = obj.x + obj.width - 8 / zoom;
            const ry = obj.y + 8 / zoom;
            ctx.save();
            ctx.beginPath();
            ctx.arc(rx, ry, 4 / zoom, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4444';
            ctx.fill();
            ctx.font = `bold ${10 / zoom}px sans-serif`;
            ctx.fillStyle = '#ff4444';
            ctx.textAlign = 'right';
            ctx.fillText('REC', rx - 7 / zoom, ry + 3.5 / zoom);
            ctx.restore();
        }
    }

    _renderSelectedBoneGuide(ctx, obj, rig, zoom) {
        const guide = this._getSelectedBoneGuideData(obj, rig, zoom);
        if (!guide) return;

        ctx.save();
        ctx.lineWidth = 1.5 / zoom;

        const hasMin = typeof guide.bone.minAngle === 'number';
        const hasMax = typeof guide.bone.maxAngle === 'number';
        if (hasMin || hasMax) {
            const minAngle = guide.referenceAngle + ((hasMin ? guide.bone.minAngle : -180) * Math.PI / 180);
            const maxAngle = guide.referenceAngle + ((hasMax ? guide.bone.maxAngle : 180) * Math.PI / 180);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.55)';
            ctx.arc(guide.parentX, guide.parentY, guide.radius, minAngle, maxAngle, false);
            ctx.stroke();
            if (hasMin) this._drawGuideRay(ctx, guide.parentX, guide.parentY, minAngle, guide.radius, 'rgba(255, 180, 80, 0.9)', zoom);
            if (hasMax) this._drawGuideRay(ctx, guide.parentX, guide.parentY, maxAngle, guide.radius, 'rgba(255, 180, 80, 0.9)', zoom);
            this._drawConstraintHandle(ctx, this._getConstraintHandlePoint(guide, 'min'), 'rgba(255, 180, 80, 1)', zoom, this._draggingConstraintHandle === 'min');
            this._drawConstraintHandle(ctx, this._getConstraintHandlePoint(guide, 'max'), 'rgba(255, 180, 80, 1)', zoom, this._draggingConstraintHandle === 'max');
            if (hasMin) {
                this._drawConstraintLabel(
                    ctx,
                    this._getConstraintHandlePoint(guide, 'min'),
                    `Min ${this._formatConstraintDegrees(guide.bone.minAngle)}`,
                    zoom,
                    this._draggingConstraintHandle === 'min'
                );
            }
            if (hasMax) {
                this._drawConstraintLabel(
                    ctx,
                    this._getConstraintHandlePoint(guide, 'max'),
                    `Max ${this._formatConstraintDegrees(guide.bone.maxAngle)}`,
                    zoom,
                    this._draggingConstraintHandle === 'max'
                );
            }
        }

        this._drawGuideRay(ctx, guide.parentX, guide.parentY, guide.currentAngle, guide.radius + 8 / zoom, 'rgba(0, 200, 255, 1)', zoom);

        if (guide.bone.ikLocked) {
            ctx.fillStyle = 'rgba(255, 180, 80, 0.95)';
            ctx.font = `${11 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('IK lock', guide.parentX, guide.parentY - guide.radius - 6 / zoom);
        }

        ctx.restore();
    }

    _drawConstraintHandle(ctx, point, color, zoom, isActive) {
        if (!point) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, (isActive ? 5 : 4) / zoom, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.2 / zoom;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _drawConstraintLabel(ctx, point, text, zoom, isActive) {
        if (!point || !isActive) return;
        const paddingX = 5 / zoom;
        const labelX = point.x + 10 / zoom;
        const labelY = point.y - 10 / zoom;
        ctx.save();
        ctx.font = `${10 / zoom}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(text).width;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = 16 / zoom;
        ctx.fillStyle = 'rgba(18, 24, 38, 0.92)';
        ctx.strokeStyle = 'rgba(255, 180, 80, 0.9)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.rect(labelX, labelY - boxHeight / 2, boxWidth, boxHeight);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 240, 210, 0.98)';
        ctx.fillText(text, labelX + paddingX, labelY);
        ctx.restore();
    }

    _drawGuideRay(ctx, x, y, angle, length, color, zoom) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
        ctx.restore();
    }

    _getBoneGuideReferenceAngle(obj, rig, bone) {
        const parentBone = this._getParentBone(bone.parentPinId);
        if (parentBone) {
            const p0 = rig.pins.find(p => p.id === parentBone.parentPinId);
            const p1 = rig.pins.find(p => p.id === parentBone.childPinId);
            if (p0 && p1) {
                return Math.atan2((p1.y - p0.y) * obj.height, (p1.x - p0.x) * obj.width);
            }
        }

        const parentPin = rig.pins.find(p => p.id === bone.parentPinId);
        const childPin = rig.pins.find(p => p.id === bone.childPinId);
        if (!parentPin || !childPin) return 0;
        return Math.atan2((childPin.restY - parentPin.restY) * obj.height, (childPin.restX - parentPin.restX) * obj.width);
    }

    // ── UI wiring ──

    _setupUI() {
        // Tool sub-buttons
        document.getElementById('rig-tool-pin')?.addEventListener('click', () => this.setTool('pin'));
        document.getElementById('rig-tool-bone')?.addEventListener('click', () => this.setTool('bone'));
        document.getElementById('rig-tool-bone-select')?.addEventListener('click', () => this.setTool('bone-select'));
        document.getElementById('rig-tool-skeleton')?.addEventListener('click', () => this.setTool('skeleton'));
        document.getElementById('rig-tool-deform')?.addEventListener('click', () => this.setTool('deform'));
        document.getElementById('rig-load-preset')?.addEventListener('click', () => this.showPresetPicker());
        document.getElementById('rig-load-movement')?.addEventListener('click', () => this.showMovementPicker());

        // New feature buttons
        document.getElementById('rig-tool-poses')?.addEventListener('click', () => this.showPoseLibrary());
        document.getElementById('rig-tool-mirror')?.addEventListener('click', () => this.mirrorRigPose());
        document.getElementById('rig-tool-ragdoll')?.addEventListener('click', () => this.ragdollDrop());
        document.getElementById('rig-tool-randomize')?.addEventListener('click', () => this.randomizeRigPose());
        document.getElementById('rig-tool-rest')?.addEventListener('click', () => this.resetToRestPose());

        // Action buttons
        document.getElementById('btn-rig-add-keyframe')?.addEventListener('click', () => this.addPoseKeyframe());
        document.getElementById('btn-rig-reset-pose')?.addEventListener('click', () => this.resetPose());
        document.getElementById('btn-rig-revert-rest')?.addEventListener('click', () => this.revertToRestAndRecord());
        document.getElementById('btn-rig-done')?.addEventListener('click', () => this.exitRigMode());
        document.getElementById('btn-rig-delete-pin')?.addEventListener('click', () => this.deleteSelected());
        document.getElementById('btn-rig-delete-all')?.addEventListener('click', () => this.deleteAllPins());

        // Lock Pin toggle button
        document.getElementById('rig-lock-pin')?.addEventListener('click', () => {
            if (this._selectedPinId) {
                this.togglePinAnchor(this._selectedPinId);
                this._updateLockPinUI();
            } else {
                Utils.showToast('Select a pin first, then click Lock Pin', 'info');
            }
        });

        // Record Pose toggle button
        document.getElementById('btn-rig-record-pose')?.addEventListener('click', () => {
            this._togglePoseRecording();
        });

        // Listen for global recording events from the timeline
        eventBus.on('recording:start', () => this._updateRecordingUI());
        eventBus.on('recording:stop', () => this._updateRecordingUI());

        // Mesh density slider
        document.getElementById('rig-mesh-density')?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 8;
            const valEl = document.getElementById('rig-mesh-density-val');
            if (valEl) valEl.textContent = val;
            this.setMeshDensity(val);
        });

        document.getElementById('rig-bone-stiffness')?.addEventListener('input', (e) => {
            const bone = this._getBoneById(this._selectedBoneId);
            if (!bone) return;
            const value = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
            bone.stiffness = value / 100;
            const valueEl = document.getElementById('rig-bone-stiffness-val');
            if (valueEl) valueEl.textContent = `${value}%`;
            this._renderBoneListUI();
            this.stage.requestRender();
        });
        document.getElementById('rig-bone-stiffness')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });

        document.getElementById('rig-bone-name')?.addEventListener('input', (e) => {
            const bone = this._getBoneById(this._selectedBoneId);
            if (!bone) return;
            bone.name = (e.target.value || '').slice(0, 40);
            this._renderBoneListUI();
            this.stage.requestRender();
        });
        document.getElementById('rig-bone-name')?.addEventListener('change', (e) => {
            const bone = this._getBoneById(this._selectedBoneId);
            if (!bone) return;
            const index = Math.max(0, this._rigObj?.rigging?.bones.findIndex(item => item.id === bone.id) ?? 0);
            bone.name = this._normalizeBoneName(e.target.value, index);
            e.target.value = bone.name;
            this._renderBoneListUI();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        document.getElementById('rig-show-bone-labels')?.addEventListener('change', (e) => {
            const rig = this._rigObj?.rigging;
            if (!rig) return;
            rig.showBoneLabels = e.target.checked;
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        document.getElementById('rig-contours')?.addEventListener('change', (e) => {
            if (!this._rigObj) return;
            this._rigObj.rigContours = e.target.checked;
            this._rigObj._cachedRigContourColor = null;  // reset color cache
            const opts = document.getElementById('rig-contour-opts');
            if (opts) opts.classList.toggle('hidden', !e.target.checked);
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('rig-contour-size')?.addEventListener('input', (e) => {
            if (!this._rigObj) return;
            const val = parseFloat(e.target.value);
            document.getElementById('rig-contour-size-val').textContent = val.toFixed(1);
            this._rigObj.contourSize = val;
            this.stage.requestRender();
        });
        document.getElementById('rig-contour-size')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('rig-contour-color')?.addEventListener('input', (e) => {
            if (!this._rigObj) return;
            this._rigObj.contourColor = e.target.value;
            this._rigObj._cachedRigContourColor = null;
            this.stage.requestRender();
        });
        document.getElementById('rig-contour-color')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('rig-contour-auto-color')?.addEventListener('change', (e) => {
            if (!this._rigObj) return;
            const colorPicker = document.getElementById('rig-contour-color');
            if (e.target.checked) {
                this._rigObj.contourColor = null;
                this._rigObj._cachedRigContourColor = null;
                if (colorPicker) colorPicker.disabled = true;
            } else {
                const color = colorPicker ? colorPicker.value : '#888888';
                this._rigObj.contourColor = color;
                this._rigObj._cachedRigContourColor = null;
                if (colorPicker) colorPicker.disabled = false;
            }
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        document.getElementById('rig-bone-lock-ik')?.addEventListener('change', (e) => {
            const bone = this._getBoneById(this._selectedBoneId);
            if (!bone) return;
            bone.ikLocked = e.target.checked;
            this._renderBoneListUI();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        const handleConstraintInput = (field, value) => {
            const bone = this._getBoneById(this._selectedBoneId);
            if (!bone) return;
            bone[field] = value === '' ? null : Math.max(-180, Math.min(180, parseFloat(value)));
            if (typeof bone.minAngle === 'number' && typeof bone.maxAngle === 'number' && bone.minAngle > bone.maxAngle) {
                if (field === 'minAngle') bone.maxAngle = bone.minAngle;
                else bone.minAngle = bone.maxAngle;
            }
            this._updateBoneSelectionUI();
            this._enforceAllBoneConstraints();
            this.stage.requestRender();
        };
        document.getElementById('rig-bone-min-angle')?.addEventListener('input', (e) => handleConstraintInput('minAngle', e.target.value));
        document.getElementById('rig-bone-max-angle')?.addEventListener('input', (e) => handleConstraintInput('maxAngle', e.target.value));
        document.getElementById('rig-bone-min-angle')?.addEventListener('change', () => eventBus.emit('history:push'));
        document.getElementById('rig-bone-max-angle')?.addEventListener('change', () => eventBus.emit('history:push'));
        document.querySelectorAll('.rig-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this._applyConstraintPreset(btn.dataset.rigPreset));
        });

        // Auto-Rig button
        document.getElementById('rig-auto-rig')?.addEventListener('click', () => this.showAutoRigWizard());
    }

    /** Toggle pose recording from the rig panel button */
    _togglePoseRecording() {
        if (this._isRecording) {
            // Stop recording — use the ObjectManager's flag
            this.objects._isRecording = false;
            eventBus.emit('recording:stop');
        } else {
            // Start recording — switch to the skeletal tool by default
            if (!this._isPoseTool()) this.setTool('skeleton');
            this.objects._isRecording = true;
            eventBus.emit('recording:start');
        }
        this._updateRecordingUI();
    }

    /** Update recording UI state (hint banner + button style) */
    _updateRecordingUI() {
        const hint = document.getElementById('rig-recording-hint');
        const btn = document.getElementById('btn-rig-record-pose');
        if (this._isRecording) {
            hint?.classList.remove('hidden');
            btn?.classList.add('recording-active');
        } else {
            hint?.classList.add('hidden');
            btn?.classList.remove('recording-active');
        }
        this.stage.requestRender();
    }

    setTool(tool) {
        const rig = this._rigObj?.rigging;
        if (tool === 'deform' && (!rig || !rig.pins?.length)) {
            tool = 'pin';
            Utils.showToast('Place a deform pin first, then drag it to warp the image', 'info');
        }
        this._rigTool = tool;
        // Crosshair cursor signals "pin placement" mode to the user
        const vp = this.stage.viewport;
        if (vp) vp.style.cursor = tool === 'pin' ? 'crosshair' : '';
        if (tool === 'skeleton' || tool === 'deform') {
            if (rig) {
                rig.deformationMode = tool === 'deform' ? 'mesh' : 'skeletal';
                if (rig._meshCache) rig._meshCache._pinHash = null;
                RiggingUtils.ensureMesh(rig);
            }
        }
        this._boneStartPinId = null;
        this._draggingPinId = null;
        this._dragPrevPos = null;
        this._selectedPinId = null;
        this._updateToolButtons();
        this._updateBoneSelectionUI();
        this._updateRigModeUI();
        this.stage.requestRender();
    }

    // ══════════════════════════════════════════════════════════════
    //  AUTO-RIG WIZARD — Trace contour, identify parts, place pins
    // ══════════════════════════════════════════════════════════════

    /**
     * Show the Auto-Rig wizard panel.
     * Step 1: Choose character type
     * Step 2: BG removal + autocrop
     * Step 3: Trace → identify → place pins & bones
     */
    showAutoRigWizard() {
        const obj = this._rigObj;
        if (!obj || obj.type !== 'image') {
            Utils.showToast('Select an image in rig mode first', 'warning');
            return;
        }
        if (!obj.imageSrc && !obj._imgEl) {
            Utils.showToast('Image not loaded', 'warning');
            return;
        }

        // Remove existing panel
        document.getElementById('autorig-wizard')?.remove();

        // Store original image data for non-destructive re-processing
        this._arObj = obj;
        this._arOriginalSrc = obj.imageSrc || obj._imgEl?.src;
        this._arOriginalX = obj.x;
        this._arOriginalY = obj.y;
        this._arOriginalW = obj.width;
        this._arOriginalH = obj.height;
        this._arContour = null;
        this._arBodyParts = null;

        this._arShowStep1();
    }

    /** Step 1 — Character type selection */
    _arShowStep1() {
        document.getElementById('autorig-wizard')?.remove();

        const types = [
            { key: 'human-front', name: 'Human (Front)', icon: 'fa-male', desc: 'Front-facing human character' },
            { key: 'human-side',  name: 'Human (Side)',  icon: 'fa-walking', desc: 'Side-profile human character' },
            { key: 'quadruped',   name: 'Quadruped',     icon: 'fa-dog', desc: 'Four-legged animal (dog, cat, horse)' },
            { key: 'bird',        name: 'Bird',          icon: 'fa-dove', desc: 'Flying or standing bird' },
            { key: 'fish',        name: 'Fish',          icon: 'fa-fish', desc: 'Fish or aquatic creature' },
            { key: 'biped',       name: 'Biped',         icon: 'fa-robot', desc: 'Generic two-legged creature' },
        ];

        const panel = document.createElement('div');
        panel.id = 'autorig-wizard';
        panel.className = 'rig-floating-panel autorig-wizard';
        panel.innerHTML = `
            <div class="rig-floating-panel-header" data-drag-handle>
                <span><i class="fas fa-hat-wizard"></i> Auto-Rig — Step 1: Character Type</span>
                <button class="rig-floating-panel-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="autorig-hint">Select the character type so the system knows how to identify body parts from the contour.</div>
            <div class="autorig-type-grid">
                ${types.map(t => `
                    <div class="autorig-type-card" data-type="${t.key}">
                        <i class="fas ${t.icon} autorig-type-icon"></i>
                        <div class="autorig-type-name">${t.name}</div>
                        <div class="autorig-type-desc">${t.desc}</div>
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(panel);
        this._makePanelDraggable(panel);

        panel.querySelector('.rig-floating-panel-close').addEventListener('click', () => {
            this._arCleanup();
            panel.remove();
        });

        panel.querySelectorAll('.autorig-type-card').forEach(card => {
            card.addEventListener('click', () => {
                this._arCharType = card.dataset.type;
                this._arShowStep2();
            });
        });
    }

    /** Step 2 — Background removal + autocrop */
    _arShowStep2() {
        document.getElementById('autorig-wizard')?.remove();
        this._arReady = false;

        const panel = document.createElement('div');
        panel.id = 'autorig-wizard';
        panel.className = 'rig-floating-panel autorig-wizard';
        panel.innerHTML = `
            <div class="rig-floating-panel-header" data-drag-handle>
                <span><i class="fas fa-hat-wizard"></i> Auto-Rig — Step 2: Prepare Image</span>
                <button class="rig-floating-panel-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="autorig-hint">Remove background and crop to isolate the character. Adjust sliders as needed.</div>
            <div class="autorig-prep-section">
                <label>BG Removal Tolerance <span id="ar-tol-val">30</span></label>
                <input type="range" id="ar-bg-tolerance" min="0" max="80" value="30">
                <label>Crop Padding <span id="ar-pad-val">5</span>px</label>
                <input type="range" id="ar-crop-padding" min="0" max="80" value="5">
            </div>
            <div class="autorig-btn-row">
                <button id="ar-back-step1" class="rig-tool-btn"><i class="fas fa-arrow-left"></i> Back</button>
                <button id="ar-process" class="rig-tool-btn active"><i class="fas fa-magic"></i> Process Image</button>
                <button id="ar-next-step3" class="rig-tool-btn" disabled style="opacity:0.5"><i class="fas fa-arrow-right"></i> Trace & Rig</button>
            </div>
            <div id="ar-status" class="autorig-hint" style="color:#f59e0b"><i class="fas fa-spinner fa-spin"></i> Processing image...</div>
            <div id="ar-preview-area" class="autorig-preview"></div>
        `;

        document.body.appendChild(panel);
        this._makePanelDraggable(panel);

        const tolSlider = panel.querySelector('#ar-bg-tolerance');
        const padSlider = panel.querySelector('#ar-crop-padding');
        const tolVal = panel.querySelector('#ar-tol-val');
        const padVal = panel.querySelector('#ar-pad-val');

        tolSlider.addEventListener('input', () => { tolVal.textContent = tolSlider.value; });
        padSlider.addEventListener('input', () => { padVal.textContent = padSlider.value; });

        panel.querySelector('.rig-floating-panel-close').addEventListener('click', () => {
            // Keep the processed image — user can Undo if needed
            this._arCleanup();
            panel.remove();
        });
        panel.querySelector('#ar-back-step1').addEventListener('click', () => {
            // Going back restores original so user can re-process
            this._arRestoreOriginal();
            this._arShowStep1();
        });
        panel.querySelector('#ar-process').addEventListener('click', () => {
            this._arProcessImage(panel);
        });
        panel.querySelector('#ar-next-step3').addEventListener('click', () => {
            if (!this._arReady) {
                Utils.showToast('Please wait — image is still processing', 'warning');
                return;
            }
            this._arTraceAndRig(panel);
        });

        // Auto-process on open
        this._arProcessImage(panel);
    }

    /** Process image: BG removal + autocrop (non-destructive) */
    _arProcessImage(panel) {
        const obj = this._arObj;
        if (!obj || !this._arOriginalSrc) return;

        this._arReady = false;
        const nextBtn = panel.querySelector('#ar-next-step3');
        const statusEl = panel.querySelector('#ar-status');
        if (nextBtn) { nextBtn.disabled = true; nextBtn.style.opacity = '0.5'; }
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing image...'; statusEl.style.display = ''; }

        const tolerance = parseInt(panel.querySelector('#ar-bg-tolerance')?.value ?? 30);
        const padding = parseInt(panel.querySelector('#ar-crop-padding')?.value ?? 5);

        const img = new Image();
        img.onload = () => {
            try {
                const natW = img.naturalWidth;
                const natH = img.naturalHeight;
                const canvas = document.createElement('canvas');
                canvas.width = natW;
                canvas.height = natH;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);

                // BG removal
                if (tolerance > 0) {
                    const imageData = ctx.getImageData(0, 0, natW, natH);
                    const d = imageData.data;
                    const corners = [[0, 0], [natW - 1, 0], [0, natH - 1], [natW - 1, natH - 1]];
                    let bgR = 0, bgG = 0, bgB = 0, count = 0;
                    corners.forEach(([sx, sy]) => {
                        const idx = (sy * natW + sx) * 4;
                        if (d[idx + 3] > 128) { bgR += d[idx]; bgG += d[idx + 1]; bgB += d[idx + 2]; count++; }
                    });
                    if (count > 0) {
                        bgR = Math.round(bgR / count); bgG = Math.round(bgG / count); bgB = Math.round(bgB / count);
                        const tolSq = tolerance * tolerance * 3;
                        for (let i = 0; i < d.length; i += 4) {
                            const dr = d[i] - bgR, dg = d[i + 1] - bgG, db = d[i + 2] - bgB;
                            if (dr * dr + dg * dg + db * db < tolSq) d[i + 3] = 0;
                        }
                        ctx.putImageData(imageData, 0, 0);
                    }
                }

                // Autocrop
                const alphaData = ctx.getImageData(0, 0, natW, natH).data;
                let minX = natW, minY = natH, maxX = 0, maxY = 0;
                for (let y = 0; y < natH; y++) {
                    for (let x = 0; x < natW; x++) {
                        if (alphaData[(y * natW + x) * 4 + 3] > 10) {
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX < minX || maxY < minY) {
                    Utils.showToast('No visible content after BG removal — try lower tolerance', 'warning');
                    if (statusEl) { statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No content — adjust tolerance'; }
                    return;
                }

                const pad = Math.max(0, padding);
                minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
                maxX = Math.min(natW - 1, maxX + pad); maxY = Math.min(natH - 1, maxY + pad);
                const cropW = maxX - minX + 1, cropH = maxY - minY + 1;

                const cropped = document.createElement('canvas');
                cropped.width = cropW; cropped.height = cropH;
                cropped.getContext('2d', { willReadFrequently: true }).drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

                // Store processed canvas FIRST (before any async ops)
                this._arProcessedCanvas = cropped;

                const newSrc = cropped.toDataURL('image/png');

                // Update stage object
                const scaleX = this._arOriginalW / natW;
                const scaleY = this._arOriginalH / natH;
                obj.x = this._arOriginalX + minX * scaleX;
                obj.y = this._arOriginalY + minY * scaleY;
                obj.width = cropW * scaleX;
                obj.height = cropH * scaleY;
                obj.imageSrc = newSrc;
                obj.loadImage(newSrc);

                // Mark ready — enable Trace & Rig
                this._arReady = true;
                if (nextBtn) { nextBtn.disabled = false; nextBtn.removeAttribute('disabled'); nextBtn.style.opacity = ''; }
                if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check" style="color:#10b981"></i> Ready — click <b>Trace &amp; Rig</b> to continue'; }

                this.stage.requestRender();
                eventBus.emit('history:push');

                // Show preview thumbnail
                const previewArea = panel.querySelector('#ar-preview-area');
                if (previewArea) {
                    previewArea.innerHTML = `<img src="${newSrc}" class="autorig-preview-img">`;
                }
            } catch (err) {
                console.error('Auto-Rig process error:', err);
                Utils.showToast('Image processing failed: ' + err.message, 'error');
                if (statusEl) { statusEl.innerHTML = '<i class="fas fa-times" style="color:#ef4444"></i> Processing failed'; }
            }
        };
        img.onerror = () => {
            Utils.showToast('Failed to load image for processing', 'error');
            if (statusEl) { statusEl.innerHTML = '<i class="fas fa-times" style="color:#ef4444"></i> Image load failed'; }
        };
        img.src = this._arOriginalSrc;
    }

    /** Restore original image if user cancels */
    _arRestoreOriginal() {
        const obj = this._arObj;
        if (!obj || !this._arOriginalSrc) return;
        obj.x = this._arOriginalX;
        obj.y = this._arOriginalY;
        obj.width = this._arOriginalW;
        obj.height = this._arOriginalH;
        obj.imageSrc = this._arOriginalSrc;
        obj.loadImage(this._arOriginalSrc);
        this.stage.requestRender();
    }

    /** Cleanup auto-rig state */
    _arCleanup() {
        this._arObj = null;
        this._arOriginalSrc = null;
        this._arProcessedCanvas = null;
        this._arContour = null;
        this._arBodyParts = null;
        this._arCharType = null;
        this._arReady = false;
    }

    /**
     * Step 3 — Trace contour, identify body parts, place pins & bones.
     * This is the core intelligence of Auto-Rig.
     */
    _arTraceAndRig(panel) {
        const obj = this._arObj;
        if (!obj) {
            Utils.showToast('No object selected for auto-rig', 'warning');
            return;
        }

        const canvas = this._arProcessedCanvas;
        if (!canvas) {
            Utils.showToast('Process the image first — click "Process Image"', 'warning');
            return;
        }

        const charType = this._arCharType;
        if (!charType) {
            Utils.showToast('Character type not set — go back and select one', 'warning');
            return;
        }

        try {
            Utils.showToast('Tracing contour and identifying body parts...', 'info');

            // 1. Trace the outer contour
            const contour = this._arTraceContour(canvas);
            if (!contour || contour.length < 10) {
                Utils.showToast('Could not trace a clear contour — try adjusting BG tolerance', 'warning');
                return;
            }
            this._arContour = contour;

            // 2. Compute the bounding box and silhouette analysis
            const analysis = this._arAnalyzeSilhouette(canvas, contour, charType);

            // 3. Map body part landmarks to pin positions
            const pinMap = this._arMapLandmarks(analysis, charType, canvas.width, canvas.height);

            // 4. Get the matching preset for bones/constraints
            const preset = RigPresets.getByKey(charType);
            if (!preset) {
                Utils.showToast('No preset found for character type: ' + charType, 'error');
                return;
            }

            // 5. Apply the adapted pins + preset bones
            this._arApplyRig(obj, pinMap, preset);

            // Done — close wizard
            document.getElementById('autorig-wizard')?.remove();
            this._arCleanup();

            this.stage.requestRender();
            eventBus.emit('history:push');
            Utils.showToast(`Auto-Rig complete! ${obj.rigging.pins.length} pins, ${obj.rigging.bones.length} bones placed. Drag pins to fine-tune.`, 'success');
        } catch (err) {
            console.error('Auto-Rig error:', err);
            Utils.showToast('Auto-Rig failed: ' + (err.message || err), 'error');
        }
    }

    /**
     * Trace the outer contour of the visible (non-transparent) region.
     * Uses a simple boundary-following algorithm on the alpha channel.
     * Returns an array of {x, y} in pixel coordinates.
     */
    _arTraceContour(canvas) {
        const w = canvas.width, h = canvas.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, w, h).data;
        const alphaThreshold = 20;

        // Build binary grid: 1 = opaque, 0 = transparent
        const grid = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
            grid[i] = data[i * 4 + 3] > alphaThreshold ? 1 : 0;
        }

        // Find starting point: first opaque pixel scanning top-to-bottom, left-to-right
        let startX = -1, startY = -1;
        outer: for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (grid[y * w + x] === 1) {
                    startX = x; startY = y;
                    break outer;
                }
            }
        }
        if (startX < 0) return null;

        // Moore boundary tracing
        const contour = [];
        const directions = [
            [0, -1], [1, -1], [1, 0], [1, 1],
            [0, 1], [-1, 1], [-1, 0], [-1, -1]
        ];

        let cx = startX, cy = startY;
        // dir = 2 (right) because we found start by scanning left-to-right,
        // so the backtrack pixel is to the left. (dir+5)%8 = 7 starts search from NW clockwise.
        let dir = 2;
        const maxSteps = w * h * 2;
        let steps = 0;

        do {
            contour.push({ x: cx, y: cy });
            // Search clockwise from (dir+5)%8
            let searchDir = (dir + 5) % 8;
            let found = false;
            for (let i = 0; i < 8; i++) {
                const d = (searchDir + i) % 8;
                const nx = cx + directions[d][0];
                const ny = cy + directions[d][1];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny * w + nx] === 1) {
                    dir = d;
                    cx = nx;
                    cy = ny;
                    found = true;
                    break;
                }
            }
            if (!found) break;
            steps++;
            // Require at least 8 steps before allowing return-to-start termination
        } while ((steps < 8 || cx !== startX || cy !== startY) && steps < maxSteps);

        // Simplify — keep every Nth point for a cleaner contour
        if (contour.length > 200) {
            const step = Math.floor(contour.length / 150);
            const simplified = [];
            for (let i = 0; i < contour.length; i += step) simplified.push(contour[i]);
            return simplified;
        }
        return contour;
    }

    /**
     * Analyze the silhouette to find body-part landmarks.
     * Uses horizontal slice analysis (row occupancy) and contour extremes.
     * Returns a rich analysis object with landmarks in normalized [0-1] coords.
     */
    _arAnalyzeSilhouette(canvas, contour, charType) {
        const w = canvas.width, h = canvas.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, w, h).data;
        const alphaThreshold = 20;

        // Build row profiles: for each row, find leftmost and rightmost opaque pixel + width
        const rows = [];
        for (let y = 0; y < h; y++) {
            let left = -1, right = -1;
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
                    if (left < 0) left = x;
                    right = x;
                }
            }
            rows.push({ left, right, width: left >= 0 ? right - left + 1 : 0, centerX: left >= 0 ? (left + right) / 2 : w / 2 });
        }

        // Build column profiles: for each column, find topmost and bottommost
        const cols = [];
        for (let x = 0; x < w; x++) {
            let top = -1, bottom = -1;
            for (let y = 0; y < h; y++) {
                if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
                    if (top < 0) top = y;
                    bottom = y;
                }
            }
            cols.push({ top, bottom, height: top >= 0 ? bottom - top + 1 : 0 });
        }

        // Find bounding box of content
        let bbMinX = w, bbMinY = h, bbMaxX = 0, bbMaxY = 0;
        for (let y = 0; y < h; y++) {
            if (rows[y].width > 0) {
                if (y < bbMinY) bbMinY = y;
                if (y > bbMaxY) bbMaxY = y;
                if (rows[y].left < bbMinX) bbMinX = rows[y].left;
                if (rows[y].right > bbMaxX) bbMaxX = rows[y].right;
            }
        }
        const contentH = bbMaxY - bbMinY + 1;
        const contentW = bbMaxX - bbMinX + 1;

        // Compute center of mass
        let comX = 0, comY = 0, comCount = 0;
        for (let y = bbMinY; y <= bbMaxY; y++) {
            if (rows[y].width > 0) {
                comX += rows[y].centerX;
                comY += y;
                comCount++;
            }
        }
        comX = comCount > 0 ? comX / comCount : w / 2;
        comY = comCount > 0 ? comY / comCount : h / 2;

        // Width profile: width at each height fraction (0-1)
        // Used to detect head, shoulders, waist, hips
        const widthProfile = [];
        for (let i = 0; i < 100; i++) {
            const y = Math.min(h - 1, Math.max(0, Math.round(bbMinY + (i / 99) * (contentH - 1))));
            const row = rows[y];
            widthProfile.push({
                t: i / 99,
                y: y,
                width: row ? row.width : 0,
                centerX: row && row.width > 0 ? row.centerX : comX,
                left: row && row.left >= 0 ? row.left : bbMinX,
                right: row && row.right >= 0 ? row.right : bbMaxX
            });
        }

        // Find key transitions using width changes
        const smoothWidth = this._arSmoothArray(widthProfile.map(p => p.width), 5);

        // Detect head-to-shoulder transition: first significant width increase
        let neckY = 0.15; // default
        let shoulderY = 0.22;
        let maxWidthIncrease = 0;
        for (let i = 5; i < 40; i++) {
            const increase = smoothWidth[i] - smoothWidth[i - 4];
            if (increase > maxWidthIncrease) {
                maxWidthIncrease = increase;
                neckY = (i - 2) / 99;
                shoulderY = i / 99;
            }
        }

        // Detect waist: narrowest point between 30%-60% from top
        let waistY = 0.42;
        let minWaistWidth = Infinity;
        for (let i = 30; i < 60; i++) {
            if (smoothWidth[i] > 0 && smoothWidth[i] < minWaistWidth) {
                minWaistWidth = smoothWidth[i];
                waistY = i / 99;
            }
        }

        // Detect hip/crotch: widest point then split between 40%-60%
        let hipY = 0.48;
        let maxHipWidth = 0;
        for (let i = 40; i < 65; i++) {
            if (smoothWidth[i] > maxHipWidth) {
                maxHipWidth = smoothWidth[i];
                hipY = i / 99;
            }
        }

        // Detect crotch (leg split): where the silhouette splits into two parts
        let crotchY = hipY + 0.02;
        for (let i = Math.round(hipY * 99); i < 80; i++) {
            const y = Math.min(h - 1, Math.max(0, Math.round(bbMinY + (i / 99) * (contentH - 1))));
            const rowLeft = rows[y]?.left ?? -1;
            const rowRight = rows[y]?.right ?? -1;
            if (rowLeft >= 0 && rowRight > rowLeft && this._arHasGap(data, w, y, rowLeft, rowRight, alphaThreshold)) {
                crotchY = i / 99;
                break;
            }
        }

        // Head top and center
        const headTopY = 0;
        const headCenterY = neckY * 0.5;

        // Shoulder width at shoulder height
        const shIdx = Math.round(shoulderY * 99);
        const shoulderLeft = (widthProfile[shIdx]?.left ?? bbMinX);
        const shoulderRight = (widthProfile[shIdx]?.right ?? bbMaxX);
        const shoulderCenterX = (shoulderLeft + shoulderRight) / 2;

        return {
            w, h,
            bbMinX, bbMinY, bbMaxX, bbMaxY,
            contentW, contentH,
            comX, comY,
            rows, cols, widthProfile, smoothWidth,
            neckY, shoulderY, waistY, hipY, crotchY,
            headTopY, headCenterY,
            shoulderLeft, shoulderRight, shoulderCenterX
        };
    }

    /** Smooth an array using a simple moving average */
    _arSmoothArray(arr, radius) {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - radius); j <= Math.min(arr.length - 1, i + radius); j++) {
                sum += arr[j]; count++;
            }
            result.push(sum / count);
        }
        return result;
    }

    /** Check if a row has a transparent gap between two opaque regions (leg split) */
    _arHasGap(data, w, y, left, right, threshold) {
        if (left < 0 || right <= left) return false;
        let inOpaque = false, gapFound = false, exitedGap = false;
        for (let x = left; x <= right; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a > threshold) {
                if (gapFound) { exitedGap = true; break; }
                inOpaque = true;
            } else {
                if (inOpaque) gapFound = true;
            }
        }
        return exitedGap;
    }

    /**
     * Map the analyzed silhouette landmarks to normalized pin positions.
     * Uses the character type's anatomical knowledge to place pins accurately.
     */
    _arMapLandmarks(analysis, charType, imgW, imgH) {
        const a = analysis;

        // Helper: convert from content-relative fractional coords to image-normalized [0,1]
        const toNorm = (fracX, fracY) => ({
            x: Math.max(0, Math.min(1, (a.bbMinX + fracX * a.contentW) / a.w)),
            y: Math.max(0, Math.min(1, (a.bbMinY + fracY * a.contentH) / a.h))
        });

        // Helper: get the silhouette center-x at a given height fraction
        const centerAt = (fracY) => {
            const idx = Math.round(Math.max(0, Math.min(99, fracY * 99)));
            return (a.widthProfile[idx]?.centerX ?? a.comX) / a.w;
        };

        // Helper: get left/right edges at height fraction (in normalized 0-1)
        const edgesAt = (fracY) => {
            const idx = Math.round(Math.max(0, Math.min(99, fracY * 99)));
            return {
                left: (a.widthProfile[idx]?.left ?? a.bbMinX) / a.w,
                right: (a.widthProfile[idx]?.right ?? a.bbMaxX) / a.w
            };
        };

        const preset = RigPresets.getByKey(charType);
        if (!preset) return {};

        // Build adaptive pin positions using silhouette analysis
        const pinMap = {};

        if (charType === 'human-front') {
            const se = edgesAt(a.shoulderY);
            const he = edgesAt(a.hipY);
            const shoulderW = se.right - se.left;
            const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
            const lerp = (start, end, t) => start + (end - start) * t;
            const average = (values, fallback = 0.5) => {
                const valid = values.filter(value => Number.isFinite(value));
                if (!valid.length) return fallback;
                return valid.reduce((sum, value) => sum + value, 0) / valid.length;
            };
            const presetPoint = (label) => {
                const pin = preset.pins.find(p => p.label === label);
                if (!pin) return { x: 0.5, y: 0.5 };
                return {
                    x: clamp((a.bbMinX + pin.restX * a.contentW) / a.w),
                    y: clamp((a.bbMinY + pin.restY * a.contentH) / a.h)
                };
            };
            const normYToFrac = (normY) => clamp(((normY * a.h) - a.bbMinY) / Math.max(1, a.contentH));
            const edgesAtNormY = (normY) => edgesAt(normYToFrac(normY));
            const constrainRightChain = (values, gap = 0.015) => {
                const result = [...values];
                for (let i = 1; i < result.length; i++) {
                    result[i] = Math.min(result[i], result[i - 1] - gap);
                }
                return result.map(value => clamp(value));
            };
            const constrainLeftChain = (values, gap = 0.015) => {
                const result = [...values];
                for (let i = 1; i < result.length; i++) {
                    result[i] = Math.max(result[i], result[i - 1] + gap);
                }
                return result.map(value => clamp(value));
            };

            const headTopBase = presetPoint('Head Top');
            const headCenterBase = presetPoint('Head Center');
            const neckBase = presetPoint('Neck');
            const chestBase = presetPoint('Chest');
            const waistBase = presetPoint('Waist');
            const hipCenterBase = presetPoint('Hip Center');
            const rShoulderBase = presetPoint('R Shoulder');
            const rElbowBase = presetPoint('R Elbow');
            const rWristBase = presetPoint('R Wrist');
            const rHandBase = presetPoint('R Hand');
            const lShoulderBase = presetPoint('L Shoulder');
            const lElbowBase = presetPoint('L Elbow');
            const lWristBase = presetPoint('L Wrist');
            const lHandBase = presetPoint('L Hand');
            const rHipBase = presetPoint('R Hip');
            const rKneeBase = presetPoint('R Knee');
            const rAnkleBase = presetPoint('R Ankle');
            const rFootBase = presetPoint('R Foot');
            const lHipBase = presetPoint('L Hip');
            const lKneeBase = presetPoint('L Knee');
            const lAnkleBase = presetPoint('L Ankle');
            const lFootBase = presetPoint('L Foot');

            const torsoCenterX = clamp(average([
                centerAt(a.headCenterY),
                centerAt((a.neckY + a.waistY) * 0.5),
                centerAt(a.waistY),
                centerAt(a.hipY),
                (se.left + se.right) * 0.5
            ]), se.left + shoulderW * 0.25, se.right - shoulderW * 0.25);

            pinMap['pin-0'] = { x: torsoCenterX, y: headTopBase.y };
            pinMap['pin-1'] = { x: torsoCenterX, y: headCenterBase.y };
            pinMap['pin-2'] = { x: torsoCenterX, y: neckBase.y };
            pinMap['pin-3'] = { x: torsoCenterX, y: chestBase.y };
            pinMap['pin-4'] = { x: torsoCenterX, y: waistBase.y };
            pinMap['pin-5'] = { x: torsoCenterX, y: hipCenterBase.y };

            const shoulderInset = clamp(shoulderW * 0.18, 0.04, shoulderW * 0.32);
            const rightShoulderX = lerp(rShoulderBase.x, clamp(se.left + shoulderInset, se.left + 0.01, torsoCenterX - 0.04), 0.6);
            const leftShoulderX = lerp(lShoulderBase.x, clamp(se.right - shoulderInset, torsoCenterX + 0.04, se.right - 0.01), 0.6);

            const rElbowEdges = edgesAtNormY(rElbowBase.y);
            const rWristEdges = edgesAtNormY(rWristBase.y);
            const rHandEdges = edgesAtNormY(rHandBase.y);
            let rightElbowX = lerp(rElbowBase.x, clamp(rElbowEdges.left + shoulderW * 0.08, 0.02, torsoCenterX - 0.07), 0.45);
            let rightWristX = lerp(rWristBase.x, clamp(rWristEdges.left + shoulderW * 0.04, 0.01, torsoCenterX - 0.09), 0.35);
            let rightHandX = lerp(rHandBase.x, clamp(rHandEdges.left + shoulderW * 0.02, 0.01, torsoCenterX - 0.11), 0.25);
            let rightUpperArmX = lerp(rightShoulderX, rightElbowX, 0.5);
            const [resolvedRightShoulderX, resolvedRightUpperArmX, resolvedRightElbowX, resolvedRightWristX, resolvedRightHandX] = constrainRightChain([
                rightShoulderX,
                rightUpperArmX,
                rightElbowX,
                rightWristX,
                rightHandX
            ], 0.016);
            pinMap['pin-6'] = { x: resolvedRightShoulderX, y: rShoulderBase.y };
            pinMap['pin-7'] = { x: resolvedRightUpperArmX, y: lerp(rShoulderBase.y, rElbowBase.y, 0.5) };
            pinMap['pin-8'] = { x: resolvedRightElbowX, y: rElbowBase.y };
            pinMap['pin-9'] = { x: resolvedRightWristX, y: rWristBase.y };
            pinMap['pin-10'] = { x: resolvedRightHandX, y: rHandBase.y };

            const lElbowEdges = edgesAtNormY(lElbowBase.y);
            const lWristEdges = edgesAtNormY(lWristBase.y);
            const lHandEdges = edgesAtNormY(lHandBase.y);
            let leftElbowX = lerp(lElbowBase.x, clamp(lElbowEdges.right - shoulderW * 0.08, torsoCenterX + 0.07, 0.98), 0.45);
            let leftWristX = lerp(lWristBase.x, clamp(lWristEdges.right - shoulderW * 0.04, torsoCenterX + 0.09, 0.99), 0.35);
            let leftHandX = lerp(lHandBase.x, clamp(lHandEdges.right - shoulderW * 0.02, torsoCenterX + 0.11, 0.99), 0.25);
            let leftUpperArmX = lerp(leftShoulderX, leftElbowX, 0.5);
            const [resolvedLeftShoulderX, resolvedLeftUpperArmX, resolvedLeftElbowX, resolvedLeftWristX, resolvedLeftHandX] = constrainLeftChain([
                leftShoulderX,
                leftUpperArmX,
                leftElbowX,
                leftWristX,
                leftHandX
            ], 0.016);
            pinMap['pin-11'] = { x: resolvedLeftShoulderX, y: lShoulderBase.y };
            pinMap['pin-12'] = { x: resolvedLeftUpperArmX, y: lerp(lShoulderBase.y, lElbowBase.y, 0.5) };
            pinMap['pin-13'] = { x: resolvedLeftElbowX, y: lElbowBase.y };
            pinMap['pin-14'] = { x: resolvedLeftWristX, y: lWristBase.y };
            pinMap['pin-15'] = { x: resolvedLeftHandX, y: lHandBase.y };

            const hipSpread = clamp((he.right - he.left) * 0.16, 0.04, 0.12);
            const rightHipX = lerp(rHipBase.x, torsoCenterX - hipSpread, 0.55);
            const leftHipX = lerp(lHipBase.x, torsoCenterX + hipSpread, 0.55);

            const rKneeEdges = edgesAtNormY(rKneeBase.y);
            const rAnkleEdges = edgesAtNormY(rAnkleBase.y);
            const rFootEdges = edgesAtNormY(rFootBase.y);
            let rightKneeX = lerp(rKneeBase.x, clamp(rKneeEdges.left + hipSpread * 0.8, 0.02, torsoCenterX - 0.05), 0.4);
            let rightAnkleX = lerp(rAnkleBase.x, clamp(rAnkleEdges.left + hipSpread * 0.7, 0.02, torsoCenterX - 0.05), 0.35);
            let rightFootX = lerp(rFootBase.x, clamp(rFootEdges.left + hipSpread * 0.45, 0.01, torsoCenterX - 0.06), 0.3);
            const [resolvedRightHipX, resolvedRightKneeX, resolvedRightAnkleX, resolvedRightFootX] = constrainRightChain([
                rightHipX,
                rightKneeX,
                rightAnkleX,
                rightFootX
            ], 0.01);
            pinMap['pin-16'] = { x: resolvedRightHipX, y: rHipBase.y };
            pinMap['pin-17'] = { x: resolvedRightKneeX, y: rKneeBase.y };
            pinMap['pin-18'] = { x: resolvedRightAnkleX, y: rAnkleBase.y };
            pinMap['pin-19'] = { x: resolvedRightFootX, y: rFootBase.y };

            const lKneeEdges = edgesAtNormY(lKneeBase.y);
            const lAnkleEdges = edgesAtNormY(lAnkleBase.y);
            const lFootEdges = edgesAtNormY(lFootBase.y);
            let leftKneeX = lerp(lKneeBase.x, clamp(lKneeEdges.right - hipSpread * 0.8, torsoCenterX + 0.05, 0.98), 0.4);
            let leftAnkleX = lerp(lAnkleBase.x, clamp(lAnkleEdges.right - hipSpread * 0.7, torsoCenterX + 0.05, 0.98), 0.35);
            let leftFootX = lerp(lFootBase.x, clamp(lFootEdges.right - hipSpread * 0.45, torsoCenterX + 0.06, 0.99), 0.3);
            const [resolvedLeftHipX, resolvedLeftKneeX, resolvedLeftAnkleX, resolvedLeftFootX] = constrainLeftChain([
                leftHipX,
                leftKneeX,
                leftAnkleX,
                leftFootX
            ], 0.01);
            pinMap['pin-20'] = { x: resolvedLeftHipX, y: lHipBase.y };
            pinMap['pin-21'] = { x: resolvedLeftKneeX, y: lKneeBase.y };
            pinMap['pin-22'] = { x: resolvedLeftAnkleX, y: lAnkleBase.y };
            pinMap['pin-23'] = { x: resolvedLeftFootX, y: lFootBase.y };

        } else if (charType === 'human-side') {
            const cx = centerAt(a.neckY);
            const headCx = centerAt(a.headCenterY);
            const se = edgesAt(a.shoulderY);

            pinMap['pin-0'] = { x: headCx, y: toNorm(0, a.headTopY).y };
            pinMap['pin-1'] = { x: headCx, y: toNorm(0, a.headCenterY).y };
            pinMap['pin-2'] = { x: cx, y: toNorm(0, a.neckY).y };
            const chestY = (a.neckY + a.waistY) / 2;
            pinMap['pin-3'] = { x: centerAt(chestY), y: toNorm(0, chestY).y };
            pinMap['pin-4'] = { x: centerAt(a.waistY), y: toNorm(0, a.waistY).y };
            pinMap['pin-5'] = { x: centerAt(a.hipY), y: toNorm(0, a.hipY).y };

            // Arm (single visible arm — front of body)
            const armStartX = se.left;
            pinMap['pin-6'] = { x: (cx + armStartX) / 2, y: toNorm(0, a.shoulderY - 0.01).y };
            const elbowY = (a.shoulderY + a.waistY) / 2 + 0.05;
            pinMap['pin-7'] = { x: armStartX, y: toNorm(0, elbowY).y };
            const wristY = a.hipY + 0.02;
            pinMap['pin-8'] = { x: armStartX - 0.02, y: toNorm(0, wristY).y };
            pinMap['pin-9'] = { x: armStartX - 0.03, y: toNorm(0, wristY + 0.04).y };

            // Front leg
            const crotchNY = toNorm(0, a.crotchY).y;
            const legCx = centerAt(a.crotchY);
            pinMap['pin-10'] = { x: legCx - 0.04, y: crotchNY };
            const kneeY = a.crotchY + (1.0 - a.crotchY) * 0.4;
            pinMap['pin-11'] = { x: legCx - 0.06, y: toNorm(0, kneeY).y };
            const ankleY = a.crotchY + (1.0 - a.crotchY) * 0.82;
            pinMap['pin-12'] = { x: legCx - 0.04, y: toNorm(0, ankleY).y };
            pinMap['pin-13'] = { x: legCx - 0.08, y: toNorm(0, Math.min(0.98, ankleY + 0.08)).y };

            // Back leg
            pinMap['pin-14'] = { x: legCx + 0.04, y: crotchNY };
            pinMap['pin-15'] = { x: legCx + 0.06, y: pinMap['pin-11'].y };
            pinMap['pin-16'] = { x: legCx + 0.04, y: pinMap['pin-12'].y };
            pinMap['pin-17'] = { x: legCx + 0.02, y: pinMap['pin-13'].y };

        } else if (charType === 'quadruped') {
            // Quadruped: typically wider than tall, head at left
            const cx = centerAt(0.33);
            const topEdges = edgesAt(0.1);
            const bodyTop = 0.12;
            const bodyBottom = 0.50;
            const bodyLeft = topEdges.left;
            const bodyRight = topEdges.right;
            const bodyW = bodyRight - bodyLeft;

            // Spine runs horizontally
            pinMap['pin-0'] = { x: bodyLeft + bodyW * 0.05, y: toNorm(0, 0.25).y }; // Head
            pinMap['pin-1'] = { x: bodyLeft + bodyW * 0.15, y: toNorm(0, 0.27).y }; // Neck
            pinMap['pin-2'] = { x: bodyLeft + bodyW * 0.30, y: toNorm(0, 0.28).y }; // Shoulder
            pinMap['pin-3'] = { x: bodyLeft + bodyW * 0.50, y: toNorm(0, 0.28).y }; // Mid Spine
            pinMap['pin-4'] = { x: bodyLeft + bodyW * 0.70, y: toNorm(0, 0.27).y }; // Hip
            pinMap['pin-5'] = { x: bodyLeft + bodyW * 0.85, y: toNorm(0, 0.22).y }; // Tail Base
            pinMap['pin-6'] = { x: bodyLeft + bodyW * 0.95, y: toNorm(0, 0.15).y }; // Tail Tip

            // Front left leg
            const legTop = 0.45;
            const legKnee = 0.65;
            const legPaw = 0.88;
            pinMap['pin-7'] = { x: bodyLeft + bodyW * 0.27, y: toNorm(0, legTop).y };
            pinMap['pin-8'] = { x: bodyLeft + bodyW * 0.25, y: toNorm(0, legKnee).y };
            pinMap['pin-9'] = { x: bodyLeft + bodyW * 0.26, y: toNorm(0, legPaw).y };

            // Front right leg
            pinMap['pin-10'] = { x: bodyLeft + bodyW * 0.33, y: toNorm(0, legTop).y };
            pinMap['pin-11'] = { x: bodyLeft + bodyW * 0.35, y: toNorm(0, legKnee).y };
            pinMap['pin-12'] = { x: bodyLeft + bodyW * 0.34, y: toNorm(0, legPaw).y };

            // Rear left leg
            pinMap['pin-13'] = { x: bodyLeft + bodyW * 0.65, y: toNorm(0, legTop).y };
            pinMap['pin-14'] = { x: bodyLeft + bodyW * 0.63, y: toNorm(0, legKnee).y };
            pinMap['pin-15'] = { x: bodyLeft + bodyW * 0.64, y: toNorm(0, legPaw).y };

            // Rear right leg
            pinMap['pin-16'] = { x: bodyLeft + bodyW * 0.73, y: toNorm(0, legTop).y };
            pinMap['pin-17'] = { x: bodyLeft + bodyW * 0.75, y: toNorm(0, legKnee).y };
            pinMap['pin-18'] = { x: bodyLeft + bodyW * 0.74, y: toNorm(0, legPaw).y };

        } else {
            // Fallback: use preset default positions directly
            preset.pins.forEach(p => {
                pinMap[p.id] = { x: p.restX, y: p.restY };
            });
        }

        return pinMap;
    }

    /**
     * Apply the computed pin positions and preset bones to the rigged object.
     * Pins are placed from the auto-detected landmarks; bones/labels/constraints
     * come from the matching preset.
     */
    _arApplyRig(obj, pinMap, preset) {
        // Initialize rigging if needed
        if (!obj.rigging) {
            obj.rigging = { pins: [], bones: [], meshDensity: 8, deformationMode: 'skeletal', showBoneLabels: true };
        }

        // Clear existing
        obj.rigging.pins = [];
        obj.rigging.bones = [];
        if (obj.rigging._meshCache) obj.rigging._meshCache._pinHash = null;

        obj.rigging.meshDensity = preset.meshDensity || 10;
        obj.rigging.deformationMode = preset.deformationMode || 'skeletal';

        // Add pins from the mapped landmarks (or fall back to preset positions)
        preset.pins.forEach(p => {
            const mapped = pinMap[p.id];
            const rx = mapped ? mapped.x : p.restX;
            const ry = mapped ? mapped.y : p.restY;
            obj.rigging.pins.push({
                id: p.id,
                restX: rx,
                restY: ry,
                x: rx,
                y: ry,
                label: p.label || '',
                anchor: p.anchor || false
            });
        });

        // Add bones with all constraints from preset
        let boneIdx = 0;
        preset.bones.forEach(b => {
            obj.rigging.bones.push({
                id: 'bone-' + boneIdx++,
                parentPinId: b.parentPinId,
                childPinId: b.childPinId,
                name: b.name || `Bone ${boneIdx}`,
                stiffness: typeof b.stiffness === 'number' ? b.stiffness : 1,
                ikLocked: b.ikLocked || false,
                minAngle: b.minAngle ?? null,
                maxAngle: b.maxAngle ?? null
            });
        });

        // Update counters
        this._nextPinId = preset.pins.length;
        this._nextBoneId = boneIdx;

        // Rebuild mesh
        RiggingUtils.ensureMesh(obj.rigging);

        // Update UI
        this._updateDensitySlider();
        this._updateBoneSelectionUI();
        this._renderBoneListUI();
        this.setTool('skeleton');
    }

    _updateToolButtons() {
        ['pin', 'bone', 'bone-select', 'skeleton', 'deform'].forEach(t => {
            const btn = document.getElementById('rig-tool-' + t);
            if (btn) btn.classList.toggle('active', this._rigTool === t);
        });
    }

    _updateDensitySlider() {
        const rig = this._rigObj?.rigging;
        if (!rig) return;
        const slider = document.getElementById('rig-mesh-density');
        const label = document.getElementById('rig-mesh-density-val');
        if (slider) slider.value = rig.meshDensity || 8;
        if (label) label.textContent = rig.meshDensity || 8;
        this._updateRigModeUI();
    }
}
