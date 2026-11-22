import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, Group, HemisphereLight, MathUtils, Matrix4, OrthographicCamera, Quaternion, Scene, TextureLoader, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { groundPath, MAX_WAYPOINTS } from './realistic-3d-path.mjs';
import { footTarget, gaitBody, gaitHipDrop, gaitPelvisYaw, gaitSway, routeTracks, smooth, smoothSupportHeight, smoothWeightShift, steadyTorsoHeight, stepLength,
    supportHeightAt, walkBlend, walkCenter, walkingKneeDegrees, GAITS, SUPPORT_SAMPLES_PER_STEP, VIEW_ASPECT, VIEW_HEIGHT, WALK_PITCH } from './realistic-3d-walk.mjs';

const identities = Object.freeze({ amaka: 'Amaka', tunde: 'Tunde' });
const defaultTrunk = Object.freeze({ smoothing: 0.82, dropScale: 1 });
const rigTrunks = Object.freeze({ amaka: Object.freeze({ smoothing: 0.91, dropScale: 0.72 }) });
const gaitTuning = Object.freeze({
    foreAftTransfer: 0.60, maxSwingClearanceRatio: 0.035,
    // Uniform upper-leg scaling also changes shin width. Keep this small;
    // inverse scaling at the ankle preserves the size of the shoe.
    reachAllowance: 0.023
});
const shaders = new WeakMap();
const models = new Map();
const instances = new WeakMap();
const loader = new GLTFLoader();
loader.register(parser => {
    // Embedded GLB textures use object URLs. Load them as images (img-src),
    // instead of ImageBitmapLoader's fetch(), which requires connect-src blob:.
    parser.textureLoader = new TextureLoader(parser.options.manager).setCrossOrigin(parser.options.crossOrigin);
    return { name: 'ANIMSTAGE_embedded_texture_loader' };
});
const entryUrl = new URL(import.meta.url);
const assetDirectory = new URL('../../../assets/realistic-3d/', entryUrl);
let surface;

function getSurface() {
    if (surface) return surface;
    let renderer;
    try {
        renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    } catch (cause) {
        const error = new Error('3D characters require WebGL 2. Enable browser graphics acceleration and reload, or try another browser.', { cause });
        error.code = 'webgl-unavailable';
        throw error;
    }
    renderer.setClearColor(0, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    const scene = new Scene();
    const camera = new OrthographicCamera(-VIEW_HEIGHT * VIEW_ASPECT / 2, VIEW_HEIGHT * VIEW_ASPECT / 2, VIEW_HEIGHT / 2, -VIEW_HEIGHT / 2, 0.1, 110);
    camera.position.set(0, 38 * Math.sin(WALK_PITCH), 38 * Math.cos(WALK_PITCH));
    camera.lookAt(0, 0, 0);
    const key = new DirectionalLight(0xffeee2, 2.4);
    key.position.set(6, 12, 7);
    const depth = new DirectionalLight(0xc0e0ff, 1.2);
    depth.position.set(-4, 6, -9);
    scene.add(key, depth, new HemisphereLight(0xffffff, 0xd9b6a3, 1.5), new AmbientLight(0xffffff, 0.2));
    // Three restores its GPU resources before this listener runs. Only
    // canvases that missed a draw need another frame (including paused ones).
    const missed = new Map();
    renderer.domElement.addEventListener('webglcontextrestored', () => {
        const redraws = [...missed.values()];
        missed.clear();
        for (const redraw of redraws) queueMicrotask(redraw);
    });
    surface = { renderer, scene, camera, missed, lastNeeded: new Float64Array(9).fill(-Infinity) };
    return surface;
}

export function prepare(id) {
    if (!Object.hasOwn(identities, id)) return Promise.reject(new Error('Unknown 3D character'));
    if (models.has(id)) return models.get(id);
    const url = entryUrl.searchParams.get('file') === 'renderer' ? new URL(entryUrl) : new URL(`${id}.glb`, assetDirectory);
    if (url.searchParams.has('file')) url.searchParams.set('file', id);
    else url.search = entryUrl.search;
    const task = Promise.resolve().then(() => {
        getSurface();
        return loader.loadAsync(url.href);
    }).then(model => {
        for (const name of ['root', 'head', 'jaw', 'Body0', 'Body1', 'Outfit0', 'Outfit1']) {
            if (!model.scene.getObjectByName(name)) throw new Error(`Incomplete 3D character: ${name}`);
        }
        for (const name of ['Body0', 'Body1', 'Outfit0', 'Outfit1', 'Hair', 'Shoes']) {
            if (!model.scene.getObjectByName(name)?.material?.map?.image) throw new Error(`Missing 3D character texture: ${name}`);
        }
        return model.scene;
    });
    models.set(id, task);
    task.catch(() => { if (models.get(id) === task) models.delete(id); });
    return task;
}

function createInstance(template) {
    const root = clone(template);
    const nodes = new Map();
    const morphs = [], bind = [], joints = new Map();
    root.traverse(node => {
        if (node.name) nodes.set(node.name, node);
        if (node.isMesh) node.frustumCulled = false;
        if (node.isBone && Array.isArray(node.userData.buildOffsets)) {
            const local = node.userData.buildOffsets.map(offset => new Vector3().fromArray(offset));
            joints.set(node, { local, rest: node.position.clone(), world: local.map((offset, i) => {
                const parent = joints.get(node.parent);
                return parent ? offset.clone().add(parent.world[i]) : offset;
            }) });
        }
        const dictionary = node.morphTargetDictionary;
        if (dictionary && 'buildSlender' in dictionary && 'buildFuller' in dictionary) {
            morphs.push({ weights: node.morphTargetInfluences, slender: dictionary.buildSlender, fuller: dictionary.buildFuller });
        }
        if (node.isSkinnedMesh) {
            // update() works with a uniform fallback; textures need explicit
            // disposal once an instance leaves the render queue.
            if (!shaders.has(root)) shaders.set(root, new Set());
            shaders.get(root).add(node.skeleton);
        }
        if (node.material?.name === 'Skin' || node.material?.name === 'Hair') node.material = node.material.clone();
    });
    if (morphs.length) for (const skeleton of shaders.get(root) || []) {
        // SkeletonUtils shares the template's inverse matrices by default.
        const original = skeleton.boneInverses;
        skeleton.boneInverses = original.map(matrix => matrix.clone());
        bind.push({ skeleton, original });
    }
    const actor = new Group();
    actor.add(root);
    const arms = ['L', 'R'].map(side => ({ side,
        shoulder: nodes.get(`upperarm01_${side}`), elbow: nodes.get(`lowerarm01_${side}`),
        wrist: nodes.get(`wrist_${side}`), middle: nodes.get(`finger3-1_${side}`),
        index: nodes.get(`finger2-1_${side}`), pinky: nodes.get(`finger5-1_${side}`),
        fingers: Array.from({ length: 5 }, (_, i) => [1, 2, 3].map(j => nodes.get(`finger${i + 1}-${j}_${side}`))) }));
    const legs = ['L', 'R'].map(side => {
        const pelvis = nodes.get(`pelvis_${side}`);
        return { side, pelvis, pelvisY: pelvis.position.y, hip: nodes.get(`upperleg01_${side}`),
            knee: nodes.get(`lowerleg01_${side}`), ankle: nodes.get(`foot_${side}`) };
    });
    const shoes = nodes.get('Shoes')?.geometry;
    if (shoes && !shoes.boundingBox) shoes.computeBoundingBox();
    const ground = shoes?.boundingBox.min.y ?? -8.15;
    return { actor, root, nodes, arms, legs, shoes, ground, build: { morphs, bind, joints, value: 0 },
        skin: nodes.get('Body0')?.material, otherSkin: nodes.get('Body1')?.material, hair: nodes.get('Hair')?.material };
}

// Keep only a small number of live GPU skeletons; project/history state is JSON only.
const active = new Map();
function instanceFor(obj, template) {
    let current = instances.get(obj);
    if (!current || current.id !== obj.realistic3D.id || !active.has(current)) {
        current = createInstance(template);
        current.id = obj.realistic3D.id;
        current.trunk = rigTrunks[current.id] ?? defaultTrunk;
        instances.set(obj, current);
    }
    active.delete(current);
    active.set(current, true);
    if (active.size > 16) {
        const old = active.keys().next().value;
        for (const skeleton of shaders.get(old.root) || []) skeleton.dispose();
        new Set([old.skin, old.otherSkin, old.hair]).forEach(material => material?.dispose());
        active.delete(old);
    }
    return current;
}

const bounded = (value, lo, hi, fallback = 0) => MathUtils.clamp(Number.isFinite(value) ? value : fallback, lo, hi);
const radians = d => d * Math.PI / 180;
const ease = n => n * n * (3 - 2 * n);

function fitBuild(build, value) {
    if (!build.morphs.length || value === build.value) return;
    build.value = value;
    const index = value < 0 ? 0 : 1;
    const amount = Math.abs(value);
    for (const { weights, slender, fuller } of build.morphs) {
        weights[slender] = Math.max(0, -value);
        weights[fuller] = Math.max(0, value);
    }
    for (const [joint, { rest, local }] of build.joints) {
        joint.position.copy(rest).addScaledVector(local[index], amount);
    }
    // Adjust rest-space bindings before skinning the current action pose.
    const shift = new Matrix4();
    for (const { skeleton, original } of build.bind) skeleton.bones.forEach((bone, i) => {
        const matrix = skeleton.boneInverses[i].copy(original[i]);
        const offset = build.joints.get(bone)?.world[index];
        if (offset && amount) matrix.multiply(shift.makeTranslation(-offset.x * amount, -offset.y * amount, -offset.z * amount));
    });
}

// The pilot assets' bind joints share the same axes; their child offsets give
// the rest directions even after the Build slider moves the joint pivots.
function bindDirection(parent, child) {
    const direction = new Vector3();
    for (let bone = child; bone && bone !== parent; bone = bone.parent) direction.add(bone.position);
    return direction;
}

const rollAxis = new Vector3(0, 0, 1);
const pitchAxis = new Vector3(1, 0, 0);
const yawAxis = new Vector3(0, 1, 0);

function fitSole(model, leg) {
    const position = model.shoes.attributes.position;
    const morph = model.shoes.morphAttributes.position?.[model.build.value < 0 ? 0 : 1];
    const amount = Math.abs(model.build.value);
    const bindAnkle = bindDirection(model.actor, leg.ankle);
    const points = [];
    const sign = leg.side === 'L' ? 1 : -1;
    let shoeInward = 0;
    const vertex = new Vector3(), delta = new Vector3();
    for (let i = 0; i < position.count; i++) {
        if ((position.getX(i) > 0) !== (leg.side === 'L')) continue;
        vertex.fromBufferAttribute(position, i);
        if (morph && amount) {
            const restFactor = model.shoes.morphTargetsRelative ? 1 : 1 - amount;
            vertex.multiplyScalar(restFactor).addScaledVector(delta.fromBufferAttribute(morph, i), amount);
        }
        vertex.sub(bindAnkle).applyQuaternion(leg.restRotation);
        shoeInward = Math.max(shoeInward, -sign * vertex.x);
        points.push([vertex.y, vertex.z]);
    }
    // Measure the tread in ankle space, rather than using the ankle as the
    // pivot. Use the actual shoe shape to keep the sole above the floor.
    const low = Math.min(...points.map(([y]) => y));
    const tread = points.filter(([y]) => y < low + 0.18);
    leg.sole = points.filter(([y]) => y < low + 0.6);
    leg.soleY = low;
    const restWidth = Math.abs(leg.restAnkle.x);
    const available = Math.max(0, restWidth - shoeInward - 0.06);
    leg.standardShift = -sign * Math.min(0.42 * restWidth, available);
    leg.narrowShift = -sign * Math.min(0.49 * restWidth, available);
    leg.heel = Math.min(...tread.map(([, z]) => z));
    leg.toe = Math.max(...tread.map(([, z]) => z));
}

function calibrateLegs(model) {
    for (const leg of model.legs) {
        if (leg.bindBuild === model.build.value) continue;
        leg.pelvis.position.y = leg.pelvisY;
        leg.bindBuild = model.build.value;
        const upper = bindDirection(leg.hip, leg.knee), lower = bindDirection(leg.knee, leg.ankle);
        leg.a = upper.length(); leg.b = lower.length();
        leg.hipCenter = bindDirection(model.actor, leg.hip);
        leg.pelvisCenter = bindDirection(model.actor, leg.pelvis);
        leg.hipFromPelvis = leg.hipCenter.clone().sub(leg.pelvisCenter);
        leg.restRotation = new Quaternion().setFromAxisAngle(rollAxis, radians(leg.side === 'L' ? -4.5 : 4.5));
        leg.restUpper = upper.clone().normalize().applyQuaternion(leg.restRotation);
        const restThigh = upper.clone().applyQuaternion(leg.restRotation);
        const restOffset = upper.clone().add(lower).applyQuaternion(leg.restRotation);
        leg.restAnkle = leg.hipCenter.clone().add(restOffset);
        leg.reach = restOffset.length();
        const restAxis = restOffset.normalize();
        // Use the rig's natural knee plane even at the neutral start and end.
        leg.pole = restThigh.addScaledVector(restAxis, -restThigh.dot(restAxis)).normalize();
        if (leg.pole.lengthSq() < 0.1) leg.pole.set(0, 0, 1);
        leg.lower = lower.normalize();
        fitSole(model, leg);
    }
}

function aimLeg(leg, actorTarget, pitch, hipLift, heading, reachScale) {
    const inversePelvis = leg.pelvis.quaternion.clone().invert();
    // The target arrives in actor space. The hip anchor and knee pole were
    // calibrated in the pelvis bind axes; only the target needs conversion.
    const line = actorTarget.clone().sub(leg.pelvisCenter);
    line.y -= hipLift;
    line.applyQuaternion(inversePelvis).sub(leg.hipFromPelvis);
    line.divideScalar(reachScale);
    const distance = MathUtils.clamp(line.length(), Math.abs(leg.a - leg.b) + 0.00001, leg.a + leg.b - 0.00001);
    const axis = line.normalize();
    const pole = leg.pole.clone().addScaledVector(axis, -leg.pole.dot(axis)).normalize();
    const near = (leg.a ** 2 - leg.b ** 2 + distance ** 2) / (2 * distance);
    const thigh = axis.clone().multiplyScalar(near).addScaledVector(pole, Math.sqrt(Math.max(0, leg.a ** 2 - near ** 2)));
    const calf = axis.clone().multiplyScalar(distance).sub(thigh);
    // Match the authored leg roll at the standing endpoints. Otherwise the
    // same joint positions can still snap the skin to a different twist.
    leg.hip.quaternion.setFromUnitVectors(leg.restUpper, thigh.normalize()).multiply(leg.restRotation);
    calf.normalize().applyQuaternion(leg.hip.quaternion.clone().invert());
    leg.knee.quaternion.setFromUnitVectors(leg.lower, calf);
    const shoe = new Quaternion().setFromAxisAngle(pitchAxis, pitch).multiply(leg.restRotation);
    if (heading) shoe.premultiply(new Quaternion().setFromAxisAngle(yawAxis, heading));
    shoe.premultiply(inversePelvis);
    leg.ankle.quaternion.multiplyQuaternions(leg.hip.quaternion, leg.knee.quaternion).invert().multiply(shoe);
}

function smoothMax(a, b, range) {
    const overlap = Math.max(0, range - Math.abs(a - b));
    return Math.max(a, b) + (range ? overlap ** 2 / (4 * range) : 0);
}

function walkAnkle(leg, foot, offset, sway) {
    const pitch = radians(foot.pitch);
    const sin = Math.sin(pitch), cos = Math.cos(pitch);
    const pivot = pitch > 0 ? leg.toe : leg.heel;
    let soleY = leg.soleY;
    if (pitch) {
        soleY = Infinity;
        for (const [y, z] of leg.sole) soleY = Math.min(soleY, y * cos - z * sin);
    }
    const zCorrection = pivot * (1 - cos) - leg.soleY * sin;
    const ankle = leg.restAnkle.clone();
    ankle.x += leg.trackShift * foot.track;
    ankle.y += foot.lift + leg.soleY - soleY;
    ankle.z += zCorrection;
    if (leg.path) {
        const body = leg.path.at(offset), contact = leg.path.at(foot.travel);
        let shoeYaw = contact.yaw;
        if (foot.swing > 0 && foot.swing < 1) {
            // Orient toward the next footprint over the entire swing, not
            // only during the few frames spent on the tightest part of a bend.
            const from = leg.path.at(foot.takeoffDistance).yaw;
            shoeYaw = from + (leg.path.at(foot.landingDistance).yaw - from) * smooth(foot.swing);
        }
        foot.heading = shoeYaw - body.yaw;
        const x = ankle.x, z = ankle.z, c = Math.cos(foot.heading), s = Math.sin(foot.heading);
        const dx = contact.x - body.x, dz = contact.z - body.z;
        ankle.x = x*c + z*s + dx*Math.cos(body.yaw) - dz*Math.sin(body.yaw);
        ankle.z = z*c - x*s + dx*Math.sin(body.yaw) + dz*Math.cos(body.yaw);
    } else ankle.z += foot.travel - offset;
    ankle.x -= sway;
    return ankle;
}

function reachHeight(leg, ankle, bend, advance = 0, center = leg.hipCenter) {
    const x = ankle.x - center.x, z = ankle.z - center.z - advance;
    const foreLeg = leg.a ** 2 + leg.b ** 2 + 2 * leg.a * leg.b * Math.cos(bend);
    return leg.hipCenter.y - Math.sqrt(Math.max(0, Math.min(leg.reach ** 2, foreLeg) - x ** 2 - z ** 2));
}

function walkHipCenter(leg, pelvicYaw) {
    return leg.hipFromPelvis.clone().applyAxisAngle(yawAxis, pelvicYaw).add(leg.pelvisCenter);
}

function walkSupportProfile(model, steps, distance, strideWeight, legLength, style) {
    const key = `${model.pathKey}:${model.build.value}:${model.legs[0].trackShift}:${steps}:${distance}:${strideWeight}:${style.progress}`;
    if (model.walkSupport?.key === key) return model.walkSupport;
    const count = SUPPORT_SAMPLES_PER_STEP;
    const required = new Float64Array(steps * count + 1);
    const rawShifts = new Float64Array(required.length);
    const supports = [];
    function dropToReach(contacts, advance) {
        let drop = 0;
        for (const { leg, ankle, bend, center } of contacts) drop = Math.max(drop, reachHeight(leg, ankle, bend, advance, center) - ankle.y);
        return drop;
    }
    for (let i = 1; i < required.length - 1; i++) {
        // Interior steps repeat on alternate legs; use the measured geometry
        // for each parity and solve the first and last few steps separately.
        if (!model.legs[0].path && i >= 4 * count && i < (steps - 3) * count) {
            const reference = 2 * count + i % (2 * count);
            supports[i] = supports[reference];
            rawShifts[i] = rawShifts[reference];
            continue;
        }
        const beat = i / count;
        const blend = walkBlend(beat, steps);
        const progress = beat / steps;
        const offset = distance * walkCenter(progress, steps);
        const sway = gaitSway(beat, steps, legLength, strideWeight) * (style===GAITS.jog ? .55 : 1);
        const pelvicYaw = gaitPelvisYaw(beat, steps, strideWeight) * (style===GAITS.jog ? .55 : 1);
        const contacts = model.legs.flatMap((leg, side) => {
            const foot = footTarget(progress, steps, distance, side, strideWeight, style);
            if (foot.swing > 0 && foot.swing < 1) return [];
            return [{ leg, ankle: walkAnkle(leg, foot, offset, sway), bend: radians(foot.knee * blend), center: walkHipCenter(leg, pelvicYaw) }];
        });
        supports[i] = contacts;
        // A small fore-aft weight transfer keeps the support leg long
        // without making the torso dip to accommodate every footfall.
        const limit = 0.32 * blend * strideWeight;
        const cost = z => dropToReach(contacts, z) + 0.13 * (Math.hypot(z, 0.03) - 0.03);
        let low = -limit, high = limit;
        for (let j = 0; j < 15; j++) {
            const a = (2 * low + high) / 3, b = (low + 2 * high) / 3;
            if (cost(a) < cost(b)) high = b;
            else low = a;
        }
        // Share reach between fore-aft transfer and leg articulation instead
        // of letting the whole seat dart forward and back with each rocker.
        rawShifts[i] = (low + high) / 2 * gaitTuning.foreAftTransfer * (style===GAITS.jog ? .6 : 1);
    }
    const shifts = smoothWeightShift(rawShifts);
    for (let i = 1; i < required.length - 1; i++) {
        // Preserve a small amount of travel in the support knee at midstance.
        // This floor fades out completely at the standing bookends.
        const reserve = 0.045 * strideWeight * walkBlend(i / count, steps) + gaitHipDrop(i / count, steps, strideWeight);
        required[i] = Math.max(reserve, dropToReach(supports[i], shifts[i]));
    }
    const heights = smoothSupportHeight(required);
    // Amaka's support corrections read particularly strongly at the shoulders.
    // Keep the full weight transfer in the legs and a smaller rise in the trunk.
    const { smoothing, dropScale } = model.trunk;
    const torso = steadyTorsoHeight(heights, smoothing);
    if (dropScale !== 1) for (let i = 0; i < torso.length; i++) torso[i] *= dropScale;
    model.walkSupport = { key, heights, shifts, torso };
    return model.walkSupport;
}

function walkLegTarget(leg, side, progress, steps, distance, offset, strideWeight, style, sample) {
    const { drop, advance, sway, pelvicYaw } = sample;
    const foot = footTarget(progress, steps, distance, side, strideWeight, style);
    const ankle = walkAnkle(leg, foot, offset, sway);
    const center = walkHipCenter(leg, pelvicYaw);
    ankle.y += drop;
    ankle.z -= advance;
    const swing = foot.swing;
    if (swing > 0 && swing < 1) {
        const phase = Math.sin(Math.PI * swing);
        const earlyBend = (823543 / 12500) * swing ** 2 * (1 - swing) ** 5;
        const fold = foot.swingFold ?? 25 * Math.sqrt(style.lift) * earlyBend;
        const flex = radians(foot.knee * walkBlend(progress * steps, steps) + strideWeight * fold);
        ankle.y = smoothMax(ankle.y, reachHeight(leg, ankle, flex, 0, center), 0.065 * phase ** 2);
    }
    return { foot, ankle, center };
}

function poseWalkLegs(model, progress, steps, distance, offset, strideWeight, legLength, style) {
    const beat = progress * steps;
    // No stride-wide crouch offset: lower only as far as the upcoming
    // support geometry needs. Midstance can rise back over a straight leg.
    const { heights, shifts, torso } = walkSupportProfile(model, steps, distance, strideWeight, legLength, style);
    const current = {
        drop: supportHeightAt(heights, beat), advance: supportHeightAt(shifts, beat),
        sway: gaitSway(beat, steps, legLength, strideWeight) * (style===GAITS.jog ? .55 : 1),
        pelvicYaw: gaitPelvisYaw(beat, steps, strideWeight) * (style===GAITS.jog ? .55 : 1)
    };
    const { drop: stanceDrop, advance, sway, pelvicYaw } = current;
    const yaw = model.actor.rotation.y;
    const bodyDrop = supportHeightAt(torso, beat);
    const bodyLift = stanceDrop - bodyDrop;
    model.actor.position.set(sway * Math.cos(yaw) + advance * Math.sin(yaw), -bodyDrop, -sway * Math.sin(yaw) + advance * Math.cos(yaw));
    const kneeWeight = walkBlend(beat, steps) * strideWeight;
    const { reachAllowance } = gaitTuning;
    const targets = model.legs.map((leg, i) => {
        const target = walkLegTarget(leg, i, progress, steps, distance, offset, strideWeight, style, current);
        const { foot, ankle, center } = target;
        const bend = radians(walkingKneeDegrees(beat, i, style));
        const preferredReach = MathUtils.lerp(leg.reach, Math.sqrt(leg.a ** 2 + leg.b ** 2 + 2 * leg.a * leg.b * Math.cos(bend)), kneeWeight);
        const x = center.x - ankle.x, z = center.z - ankle.z;
        const flat = x ** 2 + z ** 2;
        const vertical = center.y - ankle.y;
        const heightAt = factor => Math.sqrt(Math.max(0, (factor * preferredReach) ** 2 - flat)) - vertical;
        return { leg, foot, ankle, flat, vertical, preferredReach,
            low: heightAt(1 - reachAllowance), high: heightAt(1 + reachAllowance) };
    });
    // One support-driven track for the rigid pelvis, including double support.
    // Allow a small amount of leg reach retargeting rather than translating
    // the thigh sockets independently. Keep the shoes at their original size.
    for (const [i, target] of targets.entries()) {
        const swing = target.foot.swing || 0;
        if (swing <= 0 || swing >= 1) continue;
        // A short final step can ask the airborne leg to fold before its shoe
        // has enough clearance. Ease the correction away at both contacts.
        const clearance = Math.min(Math.max(0, targets[1 - i].low - target.high),
            legLength * gaitTuning.maxSwingClearanceRatio * smooth(Math.min(1, swing / 0.065, (1 - swing) / 0.10)));
        target.ankle.y += clearance;
        target.vertical -= clearance;
        target.high += clearance;
        target.low += clearance;
    }
    // Prefer the filtered trunk height, subject to both legs being able to reach.
    const high = Math.min(targets[0].high, targets[1].high);
    const low = Math.max(targets[0].low, targets[1].low);
    // In a jog there may be no support leg. Do not make the pelvis chase
    // the airborne knee's preferred angle; let the leg solve to its lifted shoe.
    const requested = Math.min(high, Math.max(low, bodyLift)) - bodyLift;
    const correction = style===GAITS.jog ? .045*Math.tanh(requested/.045)-.07*kneeWeight : requested;
    const shared = bodyLift + correction;
    targets.forEach(({ leg, foot, ankle, flat, vertical, preferredReach }) => {
        const jog=style===GAITS.jog;
        const reach=jog ? leg.reach*(1-.009*kneeWeight) : preferredReach;
        const scale = MathUtils.clamp(Math.sqrt(flat + (vertical + shared) ** 2) / reach, jog ? 1 : 1 - reachAllowance, 1 + reachAllowance);
        leg.hip.scale.setScalar(scale);
        leg.ankle.scale.setScalar(1 / scale);
        ankle.y -= bodyLift;
        leg.pelvis.position.y = leg.pelvisY + correction;
        leg.pelvis.quaternion.setFromAxisAngle(yawAxis, pelvicYaw);
        leg.pitch = radians(foot.pitch);
        leg.target = ankle;
        aimLeg(leg, ankle, leg.pitch, correction, foot.heading, scale);
    });
}

function bindFingers(arm) {
    const across = bindDirection(arm.wrist, arm.pinky).sub(bindDirection(arm.wrist, arm.index)).normalize();
    return arm.fingers.map((finger, i) => finger.map((bone, j) => {
        if (!bone) return null;
        const along = finger[j + 1]?.position || bone.position;
        const axis = new Vector3().crossVectors(along, arm.palm).normalize();
        const curl = i === 0 ? [10, 13, 8][j] : [16, 26, 13][j] + (i - 1) * 2;
        const shape = new Quaternion().setFromAxisAngle(axis, radians(curl));
        if (!j && i > 0 && finger[1] && arm.fingers[2][1]) {
            const from = finger[1].position.clone().normalize();
            const to = from.clone().lerp(arm.fingers[2][1].position.clone().normalize(), 0.35)
                .addScaledVector(across, (2.3 - i) * 0.045).normalize();
            shape.multiply(new Quaternion().setFromUnitVectors(from, to));
        }
        return { bone, shape };
    })).flat().filter(Boolean);
}

function poseArm(arm, motion, strideWeight, sitting, waveSwing, raise, build, jogging=false, speechLift=0) {
    const { side, shoulder, elbow, wrist, middle, index, pinky } = arm;
    if (!shoulder || !elbow || !wrist || !middle || !index || !pinky) return;
    const dir = side === 'L' ? 1 : -1;
    const waveAmount = side === 'R' ? raise : 0;
    if (arm.bindBuild !== build) {
        arm.bindBuild = build;
        arm.walkRest = null;
        arm.upper = bindDirection(shoulder, elbow).normalize();
        arm.lower = bindDirection(elbow, wrist).normalize();
        arm.hand = bindDirection(wrist, middle).normalize();
        arm.palm = bindDirection(wrist, pinky).sub(bindDirection(wrist, index)).cross(arm.hand).normalize().multiplyScalar(dir);
        arm.handShape = bindFingers(arm);
    }

    const restingBend = MathUtils.clamp(5 + (jogging ? 57 : 7) * strideWeight + (motion?.[1] || 0), 4, jogging ? 75 : 27);
    const flexion = radians(MathUtils.lerp(MathUtils.lerp(restingBend, 29, sitting)+speechLift*32,
        94 + waveSwing * 7, waveAmount));
    const abduction = radians(MathUtils.lerp(7.5 + Math.max(0, build) * 2.5 + 2 * sitting, 61, waveAmount));
    const pitch = radians(MathUtils.lerp((motion?.[0] || 0) + 15 * sitting + 1 + speechLift*16, 12, waveAmount));
    const upper = new Vector3(dir * Math.sin(abduction) * Math.cos(pitch), -Math.cos(abduction) * Math.cos(pitch), Math.sin(pitch));
    const bend = new Vector3(-0.23 * sitting * dir, 0, 1).lerp(new Vector3(dir, 0, 0.16), waveAmount);
    bend.addScaledVector(upper, -bend.dot(upper)).normalize();
    const lower = upper.clone().multiplyScalar(Math.cos(flexion)).addScaledVector(bend, Math.sin(flexion));
    if (motion && !waveAmount && !sitting) {
        if (!arm.walkRest) {
            poseArm(arm, null, 0, 0, 0, 0, build);
            arm.walkRest = [shoulder, elbow, wrist].map(bone => bone.quaternion.clone());
        }
        const [restShoulder, restElbow, restWrist] = arm.walkRest;
        const swing = new Quaternion();
        shoulder.quaternion.copy(restShoulder).premultiply(swing.setFromUnitVectors(arm.upper.clone().applyQuaternion(restShoulder), upper));
        const localLower = lower.clone().applyQuaternion(shoulder.quaternion.clone().invert());
        elbow.quaternion.copy(restElbow).premultiply(swing.setFromUnitVectors(arm.lower.clone().applyQuaternion(restElbow), localLower));
        wrist.quaternion.copy(restWrist);
        for (const { bone, shape } of arm.handShape) bone.quaternion.copy(shape);
        return;
    }
    const hand = lower.clone().addScaledVector(upper, waveAmount * waveSwing * 0.16).normalize();

    // Aim both bone segments. Applying elbow angles on top of the imported
    // bind bend would leave the hands permanently raised out from the body.
    shoulder.quaternion.setFromUnitVectors(arm.upper, upper);
    const elbowAxis = new Vector3();
    const parent = new Quaternion(), inverse = new Quaternion(), axis = new Vector3();
    function aimElbow() {
        elbowAxis.copy(lower).applyQuaternion(inverse.copy(shoulder.quaternion).invert());
        elbow.quaternion.setFromUnitVectors(arm.lower, elbowAxis);
    }
    function aimWrist() {
        parent.multiplyQuaternions(shoulder.quaternion, elbow.quaternion);
        inverse.copy(parent).invert();
        axis.copy(hand).applyQuaternion(inverse);
        wrist.quaternion.setFromUnitVectors(arm.hand, axis);
    }
    // Turn the palm with the forearm as well as the wrist to avoid a sharp twist at the cuff.
    const targetPalm = new Vector3(-dir, 0, -0.05).lerp(new Vector3(0, 0, 1), waveAmount);
    targetPalm.addScaledVector(hand, -targetPalm.dot(hand)).normalize();
    const actualPalm = new Vector3(), cross = new Vector3();
    function palmError() {
        actualPalm.copy(arm.palm).applyQuaternion(wrist.quaternion).applyQuaternion(parent);
        return Math.atan2(hand.dot(cross.crossVectors(actualPalm, targetPalm)), actualPalm.dot(targetPalm));
    }
    aimElbow();
    aimWrist();
    const twist = new Quaternion();
    const shoulderRoll = MathUtils.clamp(palmError() * 0.32, -radians(39), radians(39)) * (1 - waveAmount);
    shoulder.quaternion.premultiply(twist.setFromAxisAngle(upper, shoulderRoll));
    aimElbow();
    aimWrist();
    const forearmRoll = MathUtils.clamp(palmError() * 0.82, -radians(88), radians(88));
    elbow.quaternion.premultiply(twist.setFromAxisAngle(elbowAxis, forearmRoll));
    aimWrist();
    wrist.quaternion.premultiply(twist.setFromAxisAngle(axis, MathUtils.clamp(palmError(), -radians(27), radians(27))));
    for (const { bone, shape } of arm.handShape) bone.quaternion.identity().slerp(shape, 1 - waveAmount);
}

const gaitChoices = Object.values(GAITS);
const moving = value => value > 0 && value < 1;

function poseFace(state, voice, speak, set) {
    const { nodes, build } = state;
    const shift = (name, x, y, z) => {
        const joint = nodes.get(name), binding = build.joints.get(joint);
        if (!binding) return;
        joint.position.copy(binding.rest).addScaledVector(binding.local[build.value < 0 ? 0 : 1], Math.abs(build.value));
        joint.position.x += x; joint.position.y += y; joint.position.z += z;
    };
    const press = bounded(voice?.press, 0, 1);
    const open = speak * (1 - press);
    const round = bounded(voice?.round, 0, 1), wide = bounded(voice?.wide, -1, 1);
    const upper = bounded(voice?.upper, -1, 1), lower = bounded(voice?.lower, -1, 1);
    const blink = bounded(voice?.blink, 0, 1), brow = bounded(voice?.brow, -1, 1);
    const smile = bounded(voice?.smile, -.35, .42);
    set('jaw', 18 * open, 0, 0);
    shift('oris05', 0, .085 * upper * (1 - press), .05 * round);
    shift('oris01', 0, -.065 * lower * (1 - press), .05 * round);
    const tongue = bounded(voice?.tongue, 0, 1) * (1 - press);
    shift('tongue00', 0, -.075 * open, -.16 + .065 * tongue);
    set('tongue01', 10 * open - 6 * tongue, 0, 0);
    set('tongue03', -19 * tongue, 0, 0);
    for (const side of ['L', 'R']) {
        const sign = side === 'L' ? 1 : -1;
        shift('levator05_' + side, sign * (.012 + .047 * wide - .034 * round), .053 + smile * .085 - .018 * open, .035 * round);
        shift('oris03_' + side, sign * .024 * wide, .055 * upper * (1 - press), .045 * round);
        shift('oris07_' + side, sign * .024 * wide, -.038 * lower * (1 - press), .045 * round);
        shift('oculi01_' + side, 0, .027 + .055 * brow, 0);
        set('orbicularis03_' + side, 32 * blink, 0, 0);
        set('orbicularis04_' + side, -9 * blink, 0, 0);
    }
}

function pose(state, obj) {
    const { actor, nodes, skin, otherSkin, hair } = state;
    const config = obj.realistic3D;
    fitBuild(state.build, bounded(config.build, -1, 1));
    const set = (key, x, y, z) => nodes.get(key)?.rotation.set(radians(x), radians(y), radians(z));
    const routeSteps = Math.round(bounded(obj.realistic3DRouteSteps, 0, 256));
    const routeDistance = bounded(obj.realistic3DRouteDistance, 0, 1000);
    const onPath = moving(obj.realistic3DPathPhase) && Number.isInteger(obj.realistic3DPathCount)
        && obj.realistic3DPathCount >= 2 && obj.realistic3DPathCount <= MAX_WAYPOINTS;
    const route = routeSteps >= 2 && routeDistance > 0 ? (onPath ? gaitChoices[obj.realistic3DPathStyle] : gaitChoices.find(style => moving(obj[style.route]))) : null;
    const travelling = !!route;
    const style = route || gaitChoices.find(style => moving(obj[style.progress])) || GAITS.walk;
    const progress = bounded(obj[onPath ? 'realistic3DPathPhase' : travelling ? style.route : style.progress], 0, 1);
    const wave = bounded(obj.realistic3DWave, 0, 1);
    const waveCycles = bounded(obj.realistic3DWaveCycles,0,300) || 5;
    const waveSwing = Math.sin(wave * 2 * Math.PI * waveCycles);
    const envelope = Math.max(4,waveCycles*.8);
    const raise = ease(Math.min(1, wave * envelope, (1 - wave) * envelope));
    const sitting = ease(bounded(obj.realistic3DSit, 0, 1));
    const voice = obj._realistic3DSpeech;
    const head = bounded(obj.realistic3DHead, -60, 60);
    const speak = bounded(voice?.jaw ?? obj.realistic3DMouth, 0, 1);
    const stand = 1 - sitting;
    const walking = stand > 0.99 && moving(progress);
    const steps = travelling ? routeSteps : Math.max(2,Math.round(bounded(obj.realistic3DCycleSteps,0,512) || 6));
    const beat = steps * progress;
    let weight = walking ? walkBlend(beat, steps) : 0;
    let strideWeight = 1;
    let legLength;
    let distance = routeDistance, offset = bounded(obj.realistic3DRouteOffset, 0, routeDistance);
    if (walking) {
        calibrateLegs(state);
        if (onPath) {
            const points = [{ x: 0, z: 0 }];
            for (let i = 0; i < obj.realistic3DPathCount; i++) points.push({ x: obj['realistic3DPathX'+i], z: obj['realistic3DPathZ'+i] });
            const key = [obj.realistic3DPathStride, ...points.flatMap(p => [p.x,p.z])].join(',');
            if (state.pathKey !== key) {
                // A damaged or hand-edited track must not break stage rendering.
                try { state.path = groundPath(points, obj.realistic3DPathStride); }
                catch { state.path = null; }
                state.pathKey = key;
            }
        } else state.pathKey = '';
        for (const leg of state.legs) leg.path = onPath ? state.path : null;
        for (const leg of state.legs) leg.trackShift = config.walkSpacing === 'narrow' ? leg.narrowShift : leg.standardShift;
        legLength = Math.min(...state.legs.map(leg => leg.a + leg.b));
        const stride = stepLength(legLength, style);
        if (travelling) {
            strideWeight = Math.min(1, distance / ((steps - 1) * stride * 0.78));
            weight *= strideWeight;
        }
        else {
            // In-place walking uses the same footfalls on a virtual treadmill.
            distance = stride * (steps - 1);
            offset = distance * walkCenter(progress, steps);
        }
    }
    const gait = walking ? gaitBody(beat, steps, strideWeight, style) : null;
    actor.rotation.y = radians(((config.yaw || 0) + (Number.isFinite(obj.realistic3DTurn) ? obj.realistic3DTurn : 0)) % 360);
    actor.position.set(0, -2.95 * sitting, 0);
    const speechWeight=(1-weight)*(1-raise)*(1-4*sitting*(1-sitting));
    state.arms.forEach((arm, i) => poseArm(arm, gait?.arms[i], weight, sitting, waveSwing, raise, state.build.value, style===GAITS.jog,
        speechWeight*bounded(i?voice?.handB:voice?.handA,0,1.5)));
    for (const side of ['L', 'R']) {
        const dir = side === 'L' ? 1 : -1;
        if (!walking) {
            set(`pelvis_${side}`, 0, 0, 0);
            set(`upperleg01_${side}`, -83 * sitting, 0, -dir * (4.5 - 2 * sitting));
            set(`lowerleg01_${side}`, 84 * sitting, 0, 0);
            set(`foot_${side}`, 0, 0, 0);
        }
        set(`eye_${side}`, bounded((obj.realistic3DGazeY || 0) + (voice?.gazeY || 0) * 9, -12, 12),
            bounded((obj.realistic3DGazeX || 0) + (voice?.gazeX || 0) * 14, -22, 22), 0);
    }
    if (walking) poseWalkLegs(state, progress, steps, distance, offset, strideWeight, legLength, style);
    if (!walking) for (const leg of state.legs) {
        leg.hip.scale.setScalar(1);
        leg.ankle.scale.setScalar(1);
        leg.pelvis.position.y = leg.pelvisY;
        leg.pitch = 0;
        leg.target = null;
    }
    // Tilt the trunk from its base. The pelvis and planted feet are on a separate branch.
    set('spine05', gait?.lean || 0, 0, 0);
    set('spine01', 3 * sitting + (gait?.pitch || 0)+speechWeight*bounded(voice?.lean,0,1.5)*2,
        gait?.yaw || 0,(gait?.roll || 0)+speechWeight*bounded(voice?.sway,-1.5,1.5)*1.5);
    set('head', bounded((obj.realistic3DHeadPitch || 0) + (voice?.nod || 0) * 8, -25, 25) + (gait?.headPitch || 0),
        head - (gait?.yaw || 0) * 0.35, -(gait?.roll || 0) * 0.48);
    poseFace(state, voice, speak, set);
    const dress = config.outfit === 1 ? 1 : 0;
    for (let i = 0; i < 2; i++) for (const prefix of ['Body', 'Outfit']) nodes.get(`${prefix}${i}`).visible = dress === i;
    const tone = bounded(config.tone, -1, 1);
    for (const material of [skin, otherSkin]) material?.color.setScalar(1 + tone * 0.28);
    hair?.color.set(/^#[0-9a-f]{6}$/i.test(config.hair) ? config.hair : '#ffffff');
}

const templates = new Map();
const loading = new Set();

export async function preload(ids) {
    await Promise.all([...new Set(ids)].map(async id => {
        if (!templates.has(id)) templates.set(id, await prepare(id));
    }));
}

function layout(obj) {
    const px = obj.pivotX ?? 0.5, py = obj.pivotY ?? 0.5;
    const sx = obj.scaleX ?? 1, sy = obj.scaleY ?? 1;
    return {
        x: obj.x + obj.width * (px + (0.5 - px) * sx), y: obj.y + obj.height * (py + (0.5 - py) * sy),
        xUnit: obj.width * sx / (VIEW_HEIGHT * VIEW_ASPECT), yUnit: obj.height * sy / VIEW_HEIGHT
    };
}

function groundAnchor(projection, ground) {
    return { x: projection.x, y: projection.y - ground * Math.cos(WALK_PITCH) * projection.yUnit };
}

export function walkAnchor(obj) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) throw new Error('Wait for the character to load.');
    return groundAnchor(layout(obj), instanceFor(obj, template).ground);
}

// Older projects store curved-route waypoints in ground units, relative to the first foot position.
export function savedWalkPoints(obj, tracks) {
    const track = key => tracks.find(t => t.property === key);
    const base = {...obj, x:track('x').from, y:track('y').from};
    const anchor = walkAnchor(base), projection = layout(base);
    const count = track('realistic3DPathCount')?.from;
    if (!count) return [{x:anchor.x + track('x').to-base.x, y:anchor.y + track('y').to-base.y}];
    if (!Number.isInteger(count) || count < 1 || count > MAX_WAYPOINTS) throw Error('Invalid recorded waypoint count.');
    return Array.from({length:count}, (_,i) => ({
        x:anchor.x + track('realistic3DPathX'+i).from*projection.xUnit,
        y:anchor.y + track('realistic3DPathZ'+i).from*projection.yUnit*Math.sin(WALK_PITCH)
    }));
}

export function planWalk(obj, destination, wantedSeconds, gait = 'walk') {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) throw new Error('Wait for the character to load.');
    if (obj.flipH || obj.flipV || obj.rotation || obj.tiltX || obj.tiltY || obj.depth || obj.scaleX <= 0 || obj.scaleY <= 0) {
        throw new Error('Remove flips, rotation, tilt, or depth from this character before setting a 3D route.');
    }
    const model = instanceFor(obj, template);
    fitBuild(model.build, bounded(obj.realistic3D.build, -1, 1));
    calibrateLegs(model);
    const projection = layout(obj);
    const anchor = groundAnchor(projection, model.ground), groundY = anchor.y;
    const stops = Array.isArray(destination) ? destination : [destination];
    if (!stops.length || stops.length > MAX_WAYPOINTS) throw Error('Choose 1 to 10 waypoints.');
    for (const [i, p] of stops.entries()) {
        const last = stops[i-1] || anchor;
        if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y) || Math.hypot(p.x-last.x,p.y-last.y) < 2) throw Error('Pick waypoints at least two stage pixels apart.');
    }
    const dx = stops.at(-1).x - projection.x, dy = stops.at(-1).y - groundY;
    const forward = dy / (projection.yUnit * Math.sin(WALK_PITCH));
    const across = dx / projection.xUnit;
    const style = GAITS[gait] || GAITS.walk;
    const stride = stepLength(Math.min(...model.legs.map(leg => leg.a + leg.b)), style);
    const zUnit = projection.yUnit * Math.sin(WALK_PITCH);
    const coords = stops.map(p => ({ x: (p.x-anchor.x)/projection.xUnit, z: (p.y-anchor.y)/zUnit }));
    const path = stops.length > 1 ? groundPath([{ x:0, z:0 }, ...coords], stride) : null;
    const distance = path ? path.distance : Math.hypot(across, forward);
    const limit = path?.stepLimit || stride;
    const minSteps = Math.ceil(distance / limit) + 1;
    // Keep the existing reachable stride for fast/older recordings. For a
    // normal travelling jog, use closer footprints rather than long bounds.
    const preferredSteps = style === GAITS.jog
        ? Math.ceil(distance / Math.min(limit, stride * .80)) + 1 : minSteps;
    const yawFrom = obj.realistic3DTurn || 0;
    const angle = (path ? path.at(0).yaw : Math.atan2(across, forward)) * 180 / Math.PI - (obj.realistic3D.yaw || 0);
    const turn = ((angle - yawFrom) % 360 + 540) % 360 - 180;
    const turnTime = Math.abs(turn) < 0.1 ? 0 : Math.max(0.15, Math.abs(turn) / 340);
    const minStepSeconds = .28;
    const minSeconds = Math.ceil((minStepSeconds * minSteps + turnTime) * 10) / 10;
    if (minSteps > 256 || minSeconds > 60) throw new Error('Destination is too far for one walk. Pick a closer point or split the route.');
    const autoSeconds = Math.min(60, Math.ceil((preferredSteps * style.cadence + turnTime) * 10 - (style === GAITS.jog ? 1e-8 : 0)) / 10);
    const seconds = Number.isFinite(wantedSeconds) ? wantedSeconds : autoSeconds;
    if (seconds < minSeconds || seconds > 60) throw new Error(`Use ${minSeconds.toFixed(1)} to 60 seconds for this distance.`);
    let steps = minSteps;
    if (style === GAITS.jog) {
        const movingSeconds = seconds - turnTime;
        const cadenceSteps = Math.round(movingSeconds / style.cadence);
        const maxByLength = Math.ceil(distance / Math.min(limit, stride * .58)) + 1;
        const maxByTime = Math.floor(movingSeconds / minStepSeconds + 1e-8);
        steps = Math.max(minSteps, Math.min(256, maxByTime, maxByLength, Math.max(preferredSteps, cadenceSteps)));
    }
    const plan = { from: { x: obj.x, y: obj.y }, to: { x: obj.x + dx, y: obj.y + dy },
        anchor: { x: projection.x, y: groundY }, distance, steps, turnTime, seconds, minSeconds, yawFrom, yawTo: yawFrom + turn, gait };
    const tracks = routeTracks(plan);
    if (path) {
        const constant = value => [{t:0,value},{t:1,value}];
        tracks.realistic3DPathPhase = tracks[style.route];
        delete tracks[style.route];
        tracks.realistic3DPathCount = constant(coords.length);
        tracks.realistic3DPathStyle = constant(gaitChoices.indexOf(style));
        tracks.realistic3DPathStride = constant(stride);
        coords.forEach(({x,z},i) => {
            tracks['realistic3DPathX'+i] = constant(x);
            tracks['realistic3DPathZ'+i] = constant(z);
        });
        tracks.x = [{t:0,value:obj.x}]; tracks.y = [{t:0,value:obj.y}];
        tracks.realistic3DTurn.pop();
        const begin = turnTime / seconds, initial = path.at(0).yaw;
        for (let i = 0; i <= steps*32; i++) {
            const progress = i/(steps*32), t = begin + (1-begin)*progress;
            const p = path.at(walkCenter(progress,steps)*distance);
            if (t > 0) {
                tracks.x.push({t,value:obj.x+p.x*projection.xUnit});
                tracks.y.push({t,value:obj.y+p.z*zUnit});
            }
            if (i) tracks.realistic3DTurn.push({t,value:plan.yawTo+(p.yaw-initial)*180/Math.PI});
        }
        plan.yawTo = tracks.realistic3DTurn.at(-1).value;
    }
    return { ...plan, tracks };
}

// QA landmarks on the actual skinned clothing, not just the moving leg pivots.
function sampleSeat(model, leg, outfit) {
    const mesh = model.nodes.get(outfit === 1 ? 'Outfit1' : 'Outfit0');
    const samples = leg.seatSamples ||= new Map();
    if (!samples.has(mesh)) {
        const attr = mesh.geometry.attributes.position, indices = [];
        const center = leg.hipCenter, size = leg.a + leg.b;
        for (let i = 0; i < attr.count; i++) {
            if (Math.abs(attr.getX(i) - center.x) < size * .07 &&
                Math.abs(attr.getY(i) - center.y) < size * .07 && attr.getZ(i) < center.z - size * .06) indices.push(i);
        }
        samples.set(mesh, indices);
    }
    const indices = samples.get(mesh), p = new Vector3(), sum = new Vector3();
    for (const i of indices) sum.add(mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld));
    return indices.length ? sum.multiplyScalar(1 / indices.length).toArray() : null;
}

export function sampleWalkPose(obj, sampleClothing = false) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) return null;
    const model = instanceFor(obj, template);
    pose(model, obj);
    model.actor.updateMatrixWorld(true);
    calibrateLegs(model);
    const projection = layout(obj);
    const shoes = model.nodes.get('Shoes');
    const soles = [Infinity, Infinity];
    const p = new Vector3();
    for (let i = 0; i < shoes.geometry.attributes.position.count; i++) {
        const side = shoes.geometry.attributes.position.getX(i) > 0 ? 0 : 1;
        shoes.getVertexPosition(i, p).applyMatrix4(shoes.matrixWorld);
        soles[side] = Math.min(soles[side], p.y);
    }
    const headY = model.nodes.get('head').getWorldPosition(p).y;
    return model.legs.map(({ hip, knee, ankle, pitch, target }, i) => {
        const point = ankle.getWorldPosition(new Vector3());
        const direction = ankle.getWorldDirection(new Vector3());
        const error = target ? model.actor.localToWorld(target.clone()).distanceTo(point) : 0;
        return {
            ankle: [projection.x + point.x * projection.xUnit,
                projection.y + (point.z * Math.sin(WALK_PITCH) - point.y * Math.cos(WALK_PITCH)) * projection.yUnit],
            joints: [hip, knee, ankle].map(joint => joint.getWorldPosition(new Vector3()).toArray()),
            ...(sampleClothing ? {seat:sampleSeat(model, model.legs[i], obj.realistic3D.outfit)} : {}),
            surface: soles[i], pitch, shoeYaw: Math.atan2(direction.x, direction.z), headY, rootY: model.actor.position.y, error
        };
    });
}

export function sampleArmJoints(obj) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) return null;
    const model = instanceFor(obj, template);
    pose(model, obj);
    model.actor.updateMatrixWorld(true);
    return Object.fromEntries(model.arms.map(({ side, shoulder, elbow, wrist, middle, index, pinky, fingers }) => [side,
        [shoulder, elbow, wrist, middle, index, pinky, ...fingers[2].slice(1)].map(bone => bone.getWorldPosition(new Vector3()).toArray())]));
}

export function draw(ctx, obj, ready, x = obj.x, y = obj.y) {
    const id = obj.realistic3D?.id;
    if (!Object.hasOwn(identities, id)) return false;
    if (!templates.has(id)) {
        if (!loading.has(id)) {
            loading.add(id);
            // Do not loop on missing assets or unavailable WebGL.
            preload([id]).then(() => ready?.(), error => console.warn('[3D Characters]', error));
        }
        return false;
    }
    const model = instanceFor(obj, templates.get(id));
    const { renderer, camera, scene, missed, lastNeeded } = getSurface();
    if (renderer.getContext().isContextLost()) {
        if (ready) missed.set(ctx.canvas, ready);
        return false;
    }
    const scale = ctx.getTransform();
    // Retain recently used sizes so interleaved small and large actors share
    // one allocation, but a one-off close-up doesn't set the cost forever.
    const needed = Math.abs(obj.height) * Math.hypot(scale.c, scale.d);
    let tier = Math.min(8, Math.max(2, Math.ceil(needed / 128)));
    const now = performance.now();
    lastNeeded[tier] = now;
    for (let i = 8; i > tier; i--) {
        if (now - lastNeeded[i] < 1500) { tier = i; break; }
    }
    const height = tier * 128;
    const width = Math.max(1, Math.min(1024, Math.ceil(height * VIEW_ASPECT)));
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) renderer.setSize(width, height, false);
    pose(model, obj);
    scene.add(model.actor);
    try {
        renderer.render(scene, camera);
        ctx.drawImage(renderer.domElement, x, y, obj.width, obj.height);
    } finally {
        scene.remove(model.actor);
    }
    return true;
}
