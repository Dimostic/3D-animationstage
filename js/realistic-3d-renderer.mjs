import { ACESFilmicToneMapping, AmbientLight, Box3, BoxGeometry, DirectionalLight, Group, HemisphereLight, MathUtils, Matrix4, Mesh, MeshStandardMaterial, OrthographicCamera, Quaternion, Scene, TextureLoader, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { groundPath, MAX_WAYPOINTS } from './realistic-3d-path.mjs';
import {prepareHandSurface,measuredGrip} from './realistic-3d-grip.mjs';
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

export function prepare(id, worldOnly = false) {
    if (!Object.hasOwn(identities, id)) return Promise.reject(new Error('Unknown 3D character'));
    if (models.has(id)) return models.get(id);
    const url = entryUrl.searchParams.get('file') === 'renderer' ? new URL(entryUrl) : new URL(`${id}.glb`, assetDirectory);
    if (url.searchParams.has('file')) url.searchParams.set('file', id);
    else url.search = entryUrl.search;
    const task = Promise.resolve().then(() => {
        if (!worldOnly) getSurface();
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
const chairMeasurements = new Map();
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
        for (const owned of [old.document, old.chair]) if (owned) {
            const geometry = new Set(), materials = new Set();
            owned.traverse(node => { if (node.isMesh) { geometry.add(node.geometry); materials.add(node.material); } });
            geometry.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
        }
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
        points.push([vertex.y, vertex.z, i]);
    }
    // Measure the tread in ankle space, rather than using the ankle as the
    // pivot. Use the actual shoe shape to keep the sole above the floor.
    const low = Math.min(...points.map(([y]) => y));
    const tread = points.filter(([y]) => y < low + 0.18);
    leg.sole = points.filter(([y]) => y < low + 0.6);
    leg.soleIndices = leg.sole.map(point => point[2]);
    leg.soleY = low;
    const restWidth = Math.abs(leg.restAnkle.x);
    const available = Math.max(0, restWidth - shoeInward - 0.06);
    leg.standardShift = -sign * Math.min(0.42 * restWidth, available);
    leg.narrowShift = -sign * Math.min(0.49 * restWidth, available);
    // Seated shoes stay side by side with clearance measured from their mesh.
    leg.seatedShift = sign * (shoeInward + .06) - leg.restAnkle.x;
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

function aimLeg(leg, actorTarget, pitch, hipLift, heading, reachScale, kneeTarget=null, kneeWeight=0) {
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
    if(kneeTarget&&kneeWeight){const wanted=kneeTarget.clone().sub(leg.pelvisCenter);wanted.y-=hipLift;wanted.applyQuaternion(inversePelvis).sub(leg.hipFromPelvis);wanted.addScaledVector(axis,-wanted.dot(axis));if(wanted.lengthSq()>1e-8)pole.lerp(wanted.normalize(),kneeWeight).normalize();}
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
function paperContact(arm){
    const index=arm.index.localToWorld(arm.fingers[1][1].position.clone().multiplyScalar(.3));
    const thumb=arm.fingers[0][2],pad=thumb.localToWorld(thumb.position.clone().multiplyScalar(.6));
    return {index,thumb:pad};
}
function pinchPaper(arm,desiredTarget=null){
    // Close the thumb onto the index finger instead of attaching paper to an
    // open palm. CCD affects only the thumb; the wrist/arm remain independent.
    arm.wrist.updateWorldMatrix(true,true);
    const contact=paperContact(arm),normal=arm.palm.clone().applyQuaternion(arm.wrist.getWorldQuaternion(new Quaternion())),target=desiredTarget||contact.index.clone().addScaledVector(normal,-.035);
    const joints=arm.fingers[0],rest=joints.map(b=>b.quaternion.clone());
    for(let pass=0;pass<10;pass++)for(let i=2;i>=0;i--){const bone=joints[i],origin=bone.getWorldPosition(new Vector3()),from=paperContact(arm).thumb.sub(origin),to=target.clone().sub(origin);if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)continue;const turn=new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),world=bone.getWorldQuaternion(new Quaternion()),parent=bone.parent.getWorldQuaternion(new Quaternion()).invert(),wanted=parent.multiply(turn.multiply(world));const angle=rest[i].angleTo(wanted);if(angle>1.4){const limited=wanted.clone();wanted.copy(rest[i]).slerp(limited,1.4/angle);}bone.quaternion.copy(wanted);bone.updateWorldMatrix(false,true);}
}

function poseArm(arm, motion, strideWeight, sitting, waveSwing, raise, build, jogging=false, speechLift=0, holding=false, waveHand='R') {
    const { side, shoulder, elbow, wrist, middle, index, pinky } = arm;
    if (!shoulder || !elbow || !wrist || !middle || !index || !pinky) return;
    const dir = side === 'L' ? 1 : -1;
    const waveAmount = side === waveHand && !holding ? raise : 0;
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
    const flexion = radians(holding ? 112 : MathUtils.lerp(MathUtils.lerp(restingBend, 29, sitting)+speechLift*32,
        94 + waveSwing * 7, waveAmount));
    const abduction = radians(holding ? 9 : MathUtils.lerp(7.5 + Math.max(0, build) * 2.5 + 2 * sitting, 61, waveAmount));
    const pitch = radians(holding ? 22 : MathUtils.lerp((motion?.[0] || 0) + 15 * sitting + 1 + speechLift*16, 12, waveAmount));
    const upper = new Vector3(dir * Math.sin(abduction) * Math.cos(pitch), -Math.cos(abduction) * Math.cos(pitch), Math.sin(pitch));
    const bend = new Vector3(-0.23 * sitting * dir, 0, 1).lerp(new Vector3(dir, 0, 0.16), waveAmount);
    bend.addScaledVector(upper, -bend.dot(upper)).normalize();
    const lower = upper.clone().multiplyScalar(Math.cos(flexion)).addScaledVector(bend, Math.sin(flexion));
    if (motion && !waveAmount && !sitting && !holding) {
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
    const targetPalm = holding ? new Vector3(0, .2, -1) : new Vector3(-dir, 0, -0.05).lerp(new Vector3(0, 0, 1), waveAmount);
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
    if(holding&&!arm.nativeGrip)pinchPaper(arm);
}

function documentOwner(config) {
    return config.heldProp === 'documentLeft' ? 'L' : config.heldProp === 'documentRight' ? 'R' : null;
}

function seatContact(state, outfit) {
    const points = state.legs.map(leg => sampleSeat(state, leg, outfit)).filter(Boolean);
    if (!points.length) return state.legs.reduce((p, leg) => p.add(leg.hip.getWorldPosition(new Vector3())), new Vector3()).multiplyScalar(.5).add(new Vector3(0, -.45, -.4));
    return points.reduce((p, value) => p.add(new Vector3().fromArray(value)), new Vector3()).divideScalar(points.length);
}

function createChair() {
    const group = new Group(); group.name = 'ContactChair';
    const wood = new MeshStandardMaterial({ color: 0x785542, roughness: .85 });
    const frame = new MeshStandardMaterial({ color: 0x343b42, roughness: .7 });
    const box = (name, w, h, d, x, y, z, material) => {
        const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.name = name; mesh.position.set(x, y, z); group.add(mesh); return mesh;
    };
    box('Seat', 3.5, .22, 3.4, 0, 0, 0, wood);
    for (const x of [-1.48, 1.48]) for (const z of [-1.35, 1.35]) box('Leg', .22, 1, .22, x, 0, z, frame);
    for (const x of [-1.48, 1.48]) box('BackPost', .22, 3.4, .22, x, 0, -1.45, frame);
    box('Back', 2.85, 2.2, .18, 0, 0, -1.45, wood);
    return group;
}

function chairFrame(state, obj) {
    calibrateLegs(state);
    const advance = state.legs.reduce((n, leg) => n + leg.a, 0) / 2 * .88;
    const center = state.legs.reduce((p, leg) => p.add(leg.restAnkle), new Vector3()).multiplyScalar(.5);
    if(state.externalSeatFrame){const {point,height,yaw}=state.externalSeatFrame;return {point:point.clone(),height,yaw,advance,center,rotation:new Quaternion().setFromAxisAngle(yawAxis,yaw)};}
    const projection = layout(obj), ground = state.ground;
    if (!(projection.xUnit > 1e-8 && projection.yUnit > 1e-8)) return null;
    const yaw = radians(bounded(obj.realistic3D.chairYaw, -180, 180));
    const point = new Vector3((obj.realistic3D.chairX - projection.x) / projection.xUnit, ground,
        ((obj.realistic3D.chairY - projection.y) / projection.yUnit + ground * Math.cos(WALK_PITCH)) / Math.sin(WALK_PITCH));
    const height = state.legs.reduce((n, leg) => n + leg.b - leg.soleY, 0) / 2 * bounded(obj.realistic3D.chairHeight, .9, 1.1, 1);
    return { point, height, advance, center, yaw, rotation: new Quaternion().setFromAxisAngle(yawAxis, yaw) };
}

export function chairPlacement(obj) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) throw Error('Wait for the character to load.');
    const build = bounded(obj.realistic3D.build, -1, 1), measureKey = `${obj.realistic3D.id}:${build}`;
    let measured = chairMeasurements.get(measureKey);
    if (!measured) {
        const state = instanceFor(obj, template); fitBuild(state.build, build); calibrateLegs(state);
        measured = { center: state.legs.reduce((p, leg) => p.add(leg.restAnkle), new Vector3()).multiplyScalar(.5),
            advance: state.legs.reduce((n, leg) => n + leg.a, 0) / 2 * .88, ground: state.ground };
        chairMeasurements.set(measureKey, measured);
        if (chairMeasurements.size > 16) chairMeasurements.delete(chairMeasurements.keys().next().value);
    }
    const projection = layout(obj), yaw = (obj.realistic3D.yaw || 0) + (obj.realistic3DTurn || 0);
    if (!(projection.xUnit > 1e-8 && projection.yUnit > 1e-8)) throw Error('Chair contact needs a visible character with positive scale.');
    const center = measured.center.clone();
    center.z -= measured.advance;
    center.applyAxisAngle(yawAxis, radians(yaw));
    return { chair: 'standard', chairX: projection.x + center.x * projection.xUnit,
        chairY: projection.y + (center.z * Math.sin(WALK_PITCH) - measured.ground * Math.cos(WALK_PITCH)) * projection.yUnit,
        chairYaw: ((yaw + 540) % 360) - 180, chairHeight: 1 };
}

function poseChair(state, obj, sitting) {
    if (state.measuringSeat) return;
    if (obj.realistic3D.chair !== 'standard') {
        if(state.id==='amaka'&&sitting>1e-8){
            calibrateLegs(state);state.actor.updateMatrixWorld(true);
            const targets=state.legs.map(leg=>{const foot=state.actor.worldToLocal(leg.ankle.getWorldPosition(new Vector3())),knee=state.actor.worldToLocal(leg.knee.getWorldPosition(new Vector3())),x=leg.restAnkle.x+leg.seatedShift;foot.x=MathUtils.lerp(foot.x,x,sitting);knee.x=MathUtils.lerp(knee.x,x,sitting);return {foot,knee};});
            state.legs.forEach((leg,i)=>aimLeg(leg,targets[i].foot,0,0,0,1,targets[i].knee,1));
        }
        if (state.chair) state.chair.visible = false; state.seatCheck = null; return;
    }
    const frame = chairFrame(state, obj);
    if (!frame) { if (state.chair) state.chair.visible = false; state.seatCheck = null; return; }
    if(!state.externalSeatFrame){
    const chair = state.chair ||= createChair(); chair.visible = true;
    chair.position.copy(frame.point); chair.quaternion.copy(frame.rotation);
    for (const mesh of chair.children) {
        if (mesh.name === 'Seat') mesh.position.y = frame.height - .11;
        else if (mesh.name === 'Leg') { mesh.scale.y = frame.height - .22; mesh.position.y = (frame.height - .22) / 2; }
        else if (mesh.name === 'BackPost') mesh.position.y = frame.height + 1.5;
        else mesh.position.y = frame.height + 1.6;
    }
    chair.updateMatrixWorld(true);
    }
    if (sitting < 1e-8) { state.seatCheck = { sitting, frame }; return; }
    state.seatRest ||= new Map();
    const key = `${state.build.value}:${obj.realistic3D.outfit}`;
    if (!state.seatRest.has(key)) {
        const neutral = { ...obj, realistic3DSit: 0, realistic3DPathPhase: 0, realistic3DRouteSteps: 0, _realistic3DSpeech: null,
            realistic3D: { ...obj.realistic3D, chair: 'none' } };
        for (const gait of gaitChoices) neutral[gait.progress] = neutral[gait.route] = 0;
        state.measuringSeat = true;
        try {
            pose(state, neutral); state.actor.updateMatrixWorld(true);
            state.seatRest.set(key, state.actor.worldToLocal(seatContact(state, obj.realistic3D.outfit)));
            pose(state, obj);
        } finally { state.measuringSeat = false; }
    }
    const originalYaw = state.actor.rotation.y;
    const turn = Math.atan2(Math.sin(frame.yaw - originalYaw), Math.cos(frame.yaw - originalYaw));
    state.actor.rotation.y = originalYaw + turn * sitting;
    const rest = state.seatRest.get(key).clone().applyAxisAngle(yawAxis, originalYaw);
    const target = rest.lerp(frame.point.clone().add(new Vector3(0, frame.height, 0)), sitting);
    const poseKey = JSON.stringify([sitting, originalYaw, frame.point.toArray(), frame.height, frame.yaw, key,
        state.nodes.get('spine01').rotation.toArray(), state.nodes.get('spine05').rotation.toArray()]);
    if (state.seatedPose?.key === poseKey) {
        state.actor.position.copy(state.seatedPose.position);
        state.legs.forEach((leg, i) => {
            const saved = state.seatedPose.legs[i];
            leg.hip.quaternion.copy(saved.hip); leg.knee.quaternion.copy(saved.knee); leg.ankle.quaternion.copy(saved.ankle);
            leg.target = saved.target.clone(); leg.pitch = 0;
        });
        state.seatCheck = state.seatedPose.check;
        return;
    }
    const together=state.id==='amaka';
    const knees=[];
    const feet = state.legs.map(leg => {
        const start = leg.restAnkle.clone().applyAxisAngle(yawAxis, originalYaw);
        const x=leg.restAnkle.x+(together?leg.seatedShift:0)-frame.center.x;
        if(together)knees.push(new Vector3(x,frame.height-.35,frame.advance+leg.restAnkle.z-frame.center.z+1).applyQuaternion(frame.rotation).add(frame.point));
        const end = new Vector3(x, 0, frame.advance + leg.restAnkle.z - frame.center.z)
            .applyQuaternion(frame.rotation).add(frame.point);
        const foot = start.lerp(end, sitting); foot.y = frame.point.y - leg.soleY;
        return foot;
    });
    const solveFeet = () => {
        state.actor.updateMatrixWorld(true);
        state.legs.forEach((leg, i) => {
            const point = state.actor.worldToLocal(feet[i].clone());
            leg.pitch = 0; leg.target = point;
            aimLeg(leg, point, 0, 0, frame.yaw - state.actor.rotation.y, 1,together?state.actor.worldToLocal(knees[i].clone()):null,together?sitting:0);
        });
        state.actor.updateMatrixWorld(true);
    };
    for (let pass = 0; pass < 4; pass++) {
        for (let i = 0; i < 24; i++) {
            solveFeet();
            const error = target.clone().sub(seatContact(state, obj.realistic3D.outfit));
            if (error.length() < 1e-5) break;
            state.actor.position.add(error.multiplyScalar(.8));
        }
        solveFeet();
        const shoes = state.nodes.get('Shoes'), vertex = new Vector3();
        const errors = state.legs.map(leg => Math.min(...leg.soleIndices.map(index => shoes.getVertexPosition(index, vertex).applyMatrix4(shoes.matrixWorld).y)) - frame.point.y);
        if (Math.max(...errors.map(Math.abs)) < 1e-5 || pass === 3) break;
        feet.forEach((foot, i) => { foot.y -= errors[i]; });
    }
    state.seatCheck = { sitting, frame, target, contact: seatContact(state, obj.realistic3D.outfit), feet };
    state.seatedPose = { key: poseKey, position: state.actor.position.clone(), check: state.seatCheck,
        legs: state.legs.map(leg => ({ hip: leg.hip.quaternion.clone(), knee: leg.knee.quaternion.clone(), ankle: leg.ankle.quaternion.clone(), target: leg.target.clone() })) };
}

// A pilot prop authored in rig units, parented at the hand's grip rather than
// projected into screen coordinates. It shares the actor's depth and lighting.
function poseDocument(state, owner) {
    if(state.externalDocument)return;
    if (!owner) { if (state.document) state.document.visible = false; return; }
    const arm = state.arms.find(value => value.side === owner);
    if (!state.document) {
        const group = state.document = new Group(); group.name = 'HeldDocument';
        const paper = new MeshStandardMaterial({ color: 0xf8f5e9, roughness: .9 });
        const ink = new MeshStandardMaterial({ color: 0x3e5368, roughness: 1 });
        group.add(new Mesh(new BoxGeometry(1.7, 2.4, .025), paper));
        for (const z of [-.019, .019]) for (let i = 0; i < 5; i++) {
            const line = new Mesh(new BoxGeometry(i ? 1.2 : .9, .035, .008), ink);
            line.position.set(0, .72 - i * .29, z); group.add(line);
        }
    }
    const group = state.document, direction = owner === 'L' ? 1 : -1;
    group.visible = true; group.userData.owner = owner;
    if (group.parent !== arm.wrist) arm.wrist.add(group);
    state.actor.updateMatrixWorld(true);
    const grip = arm.middle.getWorldPosition(new Vector3()).add(arm.index.getWorldPosition(new Vector3())).multiplyScalar(.5);
    group.position.copy(arm.wrist.worldToLocal(grip));
    const y = arm.hand.clone(), x = new Vector3().crossVectors(y, arm.palm).normalize(), z = new Vector3().crossVectors(x, y).normalize();
    group.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
    // The same lower edge is held from either side; never mirror the actor rig.
    for (const [i, mesh] of group.children.entries()) {
        mesh.position.x = direction * .72;
        mesh.position.y = (i ? .72 - (i - 1) % 5 * .29 : 0) + 1;
    }
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

function pose(state, obj, sceneObjects = [], origin = obj, namedGaze = true) {
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
    const owner = documentOwner(config), waveHand = owner === 'R' ? 'L' : 'R';
    state.arms.forEach((arm, i) => poseArm(arm, gait?.arms[i], weight, sitting, waveSwing, raise, state.build.value, style===GAITS.jog,
        arm.side === owner ? 0 : speechWeight*bounded(i?voice?.handB:voice?.handA,0,1.5), arm.side === owner, waveHand));
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
    poseChair(state, obj, sitting);
    poseDocument(state, owner);
    state.gazeCheck = null;
    if (namedGaze) poseNamedGaze(state, obj, sceneObjects, origin);
}

function poseNamedGaze(state, obj, sceneObjects, origin) {
    const config = obj.realistic3D, mode = config.gaze;
    if (!['camera', 'document', 'character'].includes(mode)) return;
    const amount = bounded(config.gazeStrength ?? 1, 0, 1) * bounded(obj.realistic3DGazeBlend ?? 1, 0, 1);
    if (!amount) return;
    const head = state.nodes.get('head'), point = new Vector3();
    state.actor.updateMatrixWorld(true);
    const eye = head.getWorldPosition(new Vector3());
    if (mode === 'camera') point.copy(eye).add(new Vector3(0, Math.sin(WALK_PITCH), Math.cos(WALK_PITCH)).multiplyScalar(100));
    else if (mode === 'document') {
        if (!state.document?.visible) return;
        state.document.children[0].getWorldPosition(point);
    } else {
        const target = sceneObjects.find(other => other !== obj && other.id !== origin.id && other.id === config.gazeTarget && other.realistic3D && other.visible !== false);
        const template = target && templates.get(target.realistic3D.id);
        if (!template || !(origin.width > 0 && origin.height > 0 && (origin.scaleX ?? 1) > 0 && (origin.scaleY ?? 1) > 0 && (target.scaleX ?? 1) > 0 && (target.scaleY ?? 1) > 0)) return;
        const other = instanceFor(target, template);
        // Resolve the target's physical pose without following its gaze: mutual
        // looks must not recurse or depend on which actor renders first.
        pose(other, target, [], target, false);
        other.actor.updateMatrixWorld(true);
        other.nodes.get('head').getWorldPosition(point);
        const a = layout(origin), b = layout(target), af = groundAnchor(a, state.ground), bf = groundAnchor(b, other.ground);
        point.set((b.x-a.x)/a.xUnit + point.x*b.xUnit/a.xUnit,
            state.ground + (point.y-other.ground)*b.yUnit/a.yUnit,
            (bf.y-af.y)/(Math.sin(WALK_PITCH)*a.yUnit) + point.z*b.yUnit/a.yUnit);
    }
    const direction = point.clone().sub(eye);
    if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 1e-8) return;
    direction.applyQuaternion(head.parent.getWorldQuaternion(new Quaternion()).invert()).normalize();
    const yaw = Math.atan2(direction.x, direction.z) * 180 / Math.PI;
    const pitch = -Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) * 180 / Math.PI;
    const headYaw = bounded(yaw * .72, -60, 60), headPitch = bounded(pitch * .72, -25, 25);
    const base = {yaw:head.rotation.y, pitch:head.rotation.x};
    head.rotation.y = MathUtils.lerp(base.yaw, radians(headYaw), amount);
    head.rotation.x = MathUtils.lerp(base.pitch, radians(bounded(headPitch + bounded(obj._realistic3DSpeech?.nod, -1, 1)*3, -25, 25)), amount);
    const eyeYaw = bounded(yaw-headYaw, -22, 22), eyePitch = bounded(pitch-headPitch, -12, 12);
    for (const side of ['L', 'R']) {
        const bone = state.nodes.get('eye_'+side);
        bone.rotation.y = MathUtils.lerp(bone.rotation.y, radians(eyeYaw), amount);
        bone.rotation.x = MathUtils.lerp(bone.rotation.x, radians(eyePitch), amount);
    }
    state.actor.updateMatrixWorld(true);
    state.gazeCheck = { mode, targetId:mode === 'character' ? config.gazeTarget : null, amount,
        target:point.toArray(), origin:eye.toArray(), desiredYaw:yaw, desiredPitch:pitch,
        headYaw:head.rotation.y*180/Math.PI, headPitch:head.rotation.x*180/Math.PI,
        eyeYaw, eyePitch, limited:Math.abs(yaw)>82 || Math.abs(pitch)>37 };
}

export function sampleGaze(obj, sceneObjects = []) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) throw Error('Wait for the character to load.');
    const state = instanceFor(obj, template);
    pose(state, obj, sceneObjects);
    return state.gazeCheck;
}

const templates = new Map();
const loading = new Set();

export async function preload(ids) {
    await Promise.all([...new Set(ids)].map(async id => {
        if (!templates.has(id)) templates.set(id, await prepare(id));
    }));
}

// Native workspace adapter: expose actual scene nodes rather than rasterizing
// each character. This instance has an explicit lifetime, outside the 2D LRU.
export async function createWorldActor(id) {
    if (!Object.hasOwn(identities, id)) throw Error('Unknown character');
    if (!templates.has(id)) templates.set(id, await prepare(id, true));
    const state = createInstance(templates.get(id));
    state.id = id; state.trunk = rigTrunks[id] ?? defaultTrunk;
    state.arms.forEach(arm=>arm.nativeGrip=true);
    const group = new Group(), floor = new Group();
    floor.position.y = -state.ground; floor.add(state.actor); group.add(floor);
    group.scale.setScalar(.1);
    const object = {x:0,y:0,width:VIEW_HEIGHT*VIEW_ASPECT,height:VIEW_HEIGHT,scaleX:1,scaleY:1,realistic3D:{id}};
    return {
        group,
        pose(config = {}, channels = {}, seat = null, speech = null) {
            state.externalDocument=true;
            group.updateWorldMatrix(true,true);
            state.externalSeatFrame=null;
            if(seat){const point=floor.worldToLocal(seat.floor.clone()),top=floor.worldToLocal(seat.top.clone()),forward=seat.forward.clone().transformDirection(floor.matrixWorld.clone().invert());state.externalSeatFrame={point,height:top.y-point.y,yaw:Math.atan2(forward.x,forward.z)};}
            object.realistic3D = {id, ...config, chair:seat?'standard':'none', gaze:'manual'};
            for (const key of Object.keys(object)) if (key.startsWith('realistic3D') && key !== 'realistic3D') delete object[key];
            Object.assign(object, channels);
            object._realistic3DSpeech=speech;
            state.actor.removeFromParent();
            try {pose(state, object);const owner=documentOwner(config);if(owner){const arm=state.arms.find(a=>a.side===owner);prepareHandSurface(state,arm,config.holdStyle||'palm',config.outfit||0,pinchPaper);}} finally { floor.add(state.actor); }
            group.updateMatrixWorld(true);
        },
        grip(hand) {
            group.updateWorldMatrix(true,true);
            const arm=state.arms.find(a=>a.side===(hand==='left'?'L':'R'));
            const frame=measuredGrip(arm),contact=paperContact(arm);return {...frame,index:contact.index,thumb:contact.thumb,distance:contact.index.distanceTo(contact.thumb)};
        },
        contact() {
            group.updateWorldMatrix(true,true);
            const c=state.seatCheck;if(!c?.contact)return null;
            const target=floor.localToWorld(c.target.clone()),point=floor.localToWorld(c.contact.clone()),ground=floor.localToWorld(c.frame.point.clone());
            const shoes=state.nodes.get('Shoes'),vertex=new Vector3();
            const soles=state.legs.map(leg=>Math.min(...leg.soleIndices.map(i=>shoes.getVertexPosition(i,vertex).applyMatrix4(shoes.matrixWorld).y)));
            return {sitting:c.sitting,point:point.toArray(),target:target.toArray(),error:point.distanceTo(target),floor:ground.y,soles};
        },
        aim(point) {
            group.updateWorldMatrix(true,true);
            const head=state.nodes.get('head'), direction=point.clone().sub(head.getWorldPosition(new Vector3()));
            if(direction.lengthSq()<1e-8)return;
            direction.applyQuaternion(head.parent.getWorldQuaternion(new Quaternion()).invert()).normalize();
            const yaw=Math.atan2(direction.x,direction.z)*180/Math.PI, pitch=-Math.atan2(direction.y,Math.hypot(direction.x,direction.z))*180/Math.PI;
            const hy=bounded(yaw*.72,-60,60), hp=bounded(pitch*.72,-25,25);
            head.rotation.y=radians(hy);head.rotation.x=radians(hp);
            for(const side of ['L','R'])state.nodes.get('eye_'+side).rotation.set(radians(bounded(pitch-hp,-12,12)),radians(bounded(yaw-hy,-22,22)),0);
        },
        bone(name) { return state.nodes.get(name); },
        dispose() {
            for (const skeleton of shaders.get(state.root) || []) skeleton.dispose();
            new Set([state.skin,state.otherSkin,state.hair]).forEach(material=>material?.dispose());
            group.removeFromParent();
        }
    };
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

export function sampleHeldProp(obj) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) return null;
    const state = instanceFor(obj, template); pose(state, obj); state.actor.updateMatrixWorld(true);
    const owner = documentOwner(obj.realistic3D);
    if (!owner) return null;
    const arm = state.arms.find(value => value.side === owner);
    const grip = arm.middle.getWorldPosition(new Vector3()).add(arm.index.getWorldPosition(new Vector3())).multiplyScalar(.5);
    const anchor = state.document.getWorldPosition(new Vector3());
    return { owner, grip: grip.toArray(), anchor: anchor.toArray(), drift: grip.distanceTo(anchor),
        waveHand: owner === 'R' ? 'L' : 'R', activeInstances: active.size };
}

export function sampleChairContact(obj) {
    const template = templates.get(obj.realistic3D?.id);
    if (!template) return null;
    const state = instanceFor(obj, template); pose(state, obj); state.actor.updateMatrixWorld(true);
    const check = state.seatCheck;
    if (!check) return null;
    const projection = layout(obj), point = state.chair.getWorldPosition(new Vector3());
    return { sitting: check.sitting, floor: state.ground, seatTop: check.frame.point.y + check.frame.height,
        clothingSamples: state.legs.map(leg => leg.seatSamples?.get(state.nodes.get(obj.realistic3D.outfit === 1 ? 'Outfit1' : 'Outfit0'))?.length || 0),
        stageAnchor: { x: projection.x + point.x * projection.xUnit, y: projection.y + (point.z * Math.sin(WALK_PITCH) - point.y * Math.cos(WALK_PITCH)) * projection.yUnit },
        seat: check.contact?.toArray(), target: check.target?.toArray(), error: check.contact ? check.contact.distanceTo(check.target) : 0,
        chair: check.frame.point.toArray(), feet: check.feet?.map(v => v.toArray()) };
}

export function draw(ctx, obj, ready, x = obj.x, y = obj.y, sceneObjects = [], gazeOrigin = obj) {
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
    pose(model, obj, sceneObjects, gazeOrigin);
    const left = -VIEW_HEIGHT * VIEW_ASPECT / 2, top = VIEW_HEIGHT / 2;
    let minX = left, maxX = -left, minY = -top, maxY = top;
    let minDepth = -60, maxDepth = 18;
    if (model.chair?.visible) {
        const actorY = model.actor.position.y * Math.cos(WALK_PITCH) - model.actor.position.z * Math.sin(WALK_PITCH);
        minX = Math.min(minX, left + model.actor.position.x); maxX = Math.max(maxX, -left + model.actor.position.x);
        minY = Math.min(minY, -top + actorY); maxY = Math.max(maxY, top + actorY);
        const actorDepth = model.actor.position.y * Math.sin(WALK_PITCH) + model.actor.position.z * Math.cos(WALK_PITCH);
        minDepth = Math.min(minDepth, actorDepth - 18); maxDepth = Math.max(maxDepth, actorDepth + 18);
        const box = new Box3().setFromObject(model.chair);
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            const cy = y * Math.cos(WALK_PITCH) - z * Math.sin(WALK_PITCH);
            minX = Math.min(minX, x - .3); maxX = Math.max(maxX, x + .3); minY = Math.min(minY, cy - .3); maxY = Math.max(maxY, cy + .3);
            const depth = y * Math.sin(WALK_PITCH) + z * Math.cos(WALK_PITCH);
            minDepth = Math.min(minDepth, depth); maxDepth = Math.max(maxDepth, depth);
        }
        minX = left - Math.ceil((left - minX) / 2) * 2; maxX = -left + Math.ceil((maxX + left) / 2) * 2;
        minY = -top - Math.ceil((-top - minY) / 2) * 2; maxY = top + Math.ceil((maxY - top) / 2) * 2;
    }
    const cameraDistance = model.chair?.visible ? Math.max(38, maxDepth + 20) : 38;
    camera.position.set(0, cameraDistance * Math.sin(WALK_PITCH), cameraDistance * Math.cos(WALK_PITCH)); camera.lookAt(0, 0, 0);
    camera.far = model.chair?.visible ? Math.max(110, cameraDistance - minDepth + 20) : 110;
    camera.left = minX; camera.right = maxX; camera.bottom = minY; camera.top = maxY; camera.updateProjectionMatrix();
    const units = tier * 128 / VIEW_HEIGHT, limit = Math.min(1, 2048 / ((maxX - minX) * units), 2048 / ((maxY - minY) * units));
    const height = model.chair?.visible ? Math.max(1, Math.ceil((maxY - minY) * units * limit)) : tier * 128;
    const width = model.chair?.visible ? Math.max(1, Math.ceil((maxX - minX) * units * limit)) : Math.min(1024, Math.ceil(height * VIEW_ASPECT));
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) renderer.setSize(width, height, false);
    scene.add(model.actor);
    if (model.chair?.visible) scene.add(model.chair);
    try {
        renderer.render(scene, camera);
        if (model.chair?.visible) ctx.drawImage(renderer.domElement, x + (minX - left) * obj.width / (VIEW_HEIGHT * VIEW_ASPECT), y + (top - maxY) * obj.height / VIEW_HEIGHT,
            (maxX - minX) * obj.width / (VIEW_HEIGHT * VIEW_ASPECT), (maxY - minY) * obj.height / VIEW_HEIGHT);
        else ctx.drawImage(renderer.domElement, x, y, obj.width, obj.height);
    } finally {
        scene.remove(model.actor);
        if (model.chair) scene.remove(model.chair);
    }
    return true;
}
