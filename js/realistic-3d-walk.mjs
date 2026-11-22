import { launchBody, launchFoot, launchPelvis, referenceLeg, referenceSeconds, referenceStep,
    steadyBody, steadyFeet, steadyPelvis } from './realistic-3d-gait-reference.mjs';

// Shared clock for baked stage translation and the renderer's foot targets.
export const WALK_PITCH = Math.PI / 15;
export const VIEW_HEIGHT = 21.5;
export const VIEW_ASPECT = 0.72;

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const smooth = n => n * n * (3 - 2 * n);
const ramp = (n, start, end) => smooth(clamp((n - start) / (end - start)));
export const WALK_STEP_SECONDS = referenceSeconds;
export const GAITS = Object.freeze({
    walk: Object.freeze({ progress: 'realistic3DWalk', route: 'realistic3DRouteProgress', cadence: referenceSeconds,
        stride: 1, arm: 14, lift: 1, twist: 1 }),
    stroll: Object.freeze({ progress: 'realistic3DStroll', route: 'realistic3DStrollRoute', cadence: 0.70,
        stride: 0.95, arm: 20, lift: 1.15, twist: 1.08 }),
    strut: Object.freeze({ progress: 'realistic3DStrut', route: 'realistic3DStrutRoute', cadence: 0.53,
        stride: 1.06, arm: 26, lift: 1.24, twist: 1.22 }),
    natural: Object.freeze({ progress: 'realistic3DNaturalWalk', route: 'realistic3DNaturalRoute', cadence: 0.50,
        stride: 1.09, arm: 24, lift: 1.35, twist: 1.08 }),
    jog: Object.freeze({ progress: 'realistic3DJog', route: 'realistic3DJogRoute', cadence: 0.40,
        stride: 1.15, arm: 29, lift: 1.5, twist: 1.12 })
});
// Keep a little reach in reserve for the character's rig and rigid shoes.
export const stepLength = (legLength, style = GAITS.walk) => legLength * referenceStep * 0.75 * style.stride;
export const walkBlend = (beat, steps) => smooth(clamp(Math.min(beat, steps - beat)));

// One two-step angular envelope per leg: toe-off, swing peak, extension,
// heel loading, midstance, then release. Match the tangent across toe-off.
const walkingKnee = [27,35,40,42,30,16,10,13,9,8,11,18,27];
const strutKnee = [26,32,42,46,33,17,10,13,9,8,11,18,26];
const energeticKnee = [30,39,48,53,38,19,11,13,9,8,12,20,30];
const joggingKnee = [46,56,65,60,40,23,17,22,25,19,20,33,46];
export function walkingKneeDegrees(beat, side, style) {
    const phase = ((beat + side) % 2) / 2;
    const keys = style === GAITS.jog ? joggingKnee : style === GAITS.natural ? energeticKnee : style === GAITS.strut ? strutKnee : walkingKnee;
    return gaitChannel(keys, phase, null, true);
}

function cubic(a, b, left, right, t) {
    const slope = (before, after) => before * after > 0 ? 2 * before * after / (before + after) : 0;
    const incoming = slope(a - left, b - a), outgoing = slope(b - a, right - b);
    return a + (b - a) * smooth(t) + t * (1 - t) * ((1 - t) * incoming - t * outgoing);
}

function gaitChannel(rows, phase, column, cyclic = false) {
    const end = rows.length - 1;
    const frame = clamp(phase) * end;
    const i = Math.min(end - 1, Math.floor(frame));
    const at = index => column === null ? rows[index] : rows[index][column];
    return cubic(at(i), at(i + 1), at(i ? i - 1 : cyclic ? end - 1 : 0),
        at(i + 2 <= end ? i + 2 : cyclic ? 1 : end), frame - i);
}

function bodyChannel(beat, steps, column, mirror = 0) {
    const rows = column === null ? steadyPelvis : steadyBody;
    let steady = gaitChannel(rows, (beat % 2) / 2, column, true);
    if (mirror) steady = (steady + mirror * gaitChannel(rows, ((beat + 1) % 2) / 2, column, true)) / 2;
    const end = ramp(steps - beat, 0, 1);
    if (beat >= 1) return steady * end;
    const first = gaitChannel(column === null ? launchPelvis : launchBody, beat, column);
    const mix = ramp(beat, 0.62, 1);
    return (first + (steady - first) * mix) * end;
}

export function gaitSway(beat, steps, legLength, strideWeight) {
    // Shift toward the support foot, without amplifying lateral motion for the
    // more expressive arm/stride styles.
    return bodyChannel(beat, steps, 0, -1) * legLength / referenceLeg * 0.48 * strideWeight;
}

export function gaitBody(beat, steps, strideWeight, style = GAITS.walk) {
    const channel = (i, scale) => bodyChannel(beat, steps, i) * scale * strideWeight;
    const finish = ramp(steps - beat, 0, 1);
    // The right arm leads with the first left step. The launch joins the
    // alternating cycle at its peak with the same (zero) angular velocity.
    const swing = (beat < 1 ? smooth(beat) : -Math.cos(Math.PI * beat)) * strideWeight * finish;
    const lean = style === GAITS.jog ? 7 * walkBlend(beat, steps) * strideWeight : 0;
    return {
        yaw: channel(2, 0.80 * style.twist), roll: channel(3, 0.74),
        lean, pitch: channel(4, beat < 1 ? 0.34 + 0.18 * ramp(beat, 0.62, 1) : 0.52),
        headPitch: channel(5, 0.33) - .65 * lean,
        arms: [[-swing * style.arm * 0.96, -swing * 4.6], [swing * style.arm, swing * 4.6]]
    };
}

export function gaitHipDrop(beat, steps, strideWeight) {
    return -bodyChannel(beat, steps, 1, 1) * 0.22 * strideWeight;
}

export function gaitPelvisYaw(beat, steps, strideWeight) {
    return 0.78 * bodyChannel(beat, steps, null, -1) * strideWeight * Math.PI / 180;
}

export function walkCenter(phase, steps) {
    // Ease into the first step and out of the last, with continuous velocity.
    const t = clamp(phase) * steps;
    const ramp = t < 1 ? t * t / 2 : t > steps - 1 ? steps - 1 - (steps - t) ** 2 / 2 : t - 0.5;
    return ramp / (steps - 1);
}

const balancedFoot = steadyFeet[0].map((row, i) => row.map((v, j) => (v + steadyFeet[1][i][j]) / 2));
// Toe release to heel contact: forward travel, clearance, extra knee fold.
// Keep the heel behind the knee during recovery, then unfold to reach.
const energeticSwing = [
    [0, 0, 0], [.03, .30, 18], [.11, .83, 39], [.24, 1, 47], [.43, .86, 40],
    [.65, .59, 28], [.84, .31, 14], [.96, .08, 4], [1, 0, 0]
];

// For a jog the trailing sole releases before the opposite heel lands. The
// swing straddles a step boundary; its footprint, velocity and pitch do not reset there.
function jogFoot(beat, steps, distance, side, weight) {
    const stride=distance/(steps-1);
    const index=Math.min(steps-1,Math.floor(beat));
    const step=beat-index;
    const swinging=index%2===side;
    // Flight starts before the next landing. Plant closer to the hip so
    // late stance actually drives behind it rather than reaching out in front.
    // The opening and closing footprints still coincide with the idle pose.
    const contact=i=>i<=0 ? 0 : i>=steps-1 ? distance : (i-.22)*stride;
    const track=i=>i>0 && i<steps-1 ? weight : 0;
    if (!swinging && (step<=.78 || index===steps-1)) {
        const roll=index>0 ? -9*(1-ramp(step,0,.20)) : 0;
        const push=index<steps-1 ? 13*ramp(step,.48,.78) : 0;
        return {travel:contact(index),track:track(index),lift:0,pitch:(roll+push)*weight,knee:17};
    }
    const flight=swinging?index:index+1;
    const begin=flight===0?0:flight-.22;
    const p=clamp((beat-begin)/(flight+1-begin));
    const from=contact(flight-1), to=contact(flight+1);
    // Recover the heel while it is still behind the hip, then drive the
    // thigh through and unfold toward the same fixed landing footprint.
    const arch = Math.sin(Math.PI*p)**2;
    const reach = smooth(p - .045*arch*(1 - Math.tanh(6*(p-.55))));
    const arc = Math.sin(Math.PI*(p + .035*arch))**2;
    return {travel:from+(to-from)*reach, takeoffDistance:from,landingDistance:to,
        track:track(flight-1)+(track(flight+1)-track(flight-1))*reach,
        lift:Math.min(2.55,(to-from)*.54)*arc*walkBlend(beat,steps),
        // Roll off the planted forefoot, then finish pointing the toe in
        // early flight. A full toe point on the floor folds the support knee prematurely.
        pitch:weight*((flight ? 13+9*ramp(p,0,.15) : 0)*(1-ramp(p,.15,.63))-(flight===steps-1?0:9)*ramp(p,.6,1)),
        swing:p,knee:17,swingFold:43*arc*walkBlend(beat,steps)};
}

export function footTarget(phase, steps, distance, side, strideWeight = 1, style = GAITS.walk) {
    const beat = clamp(phase) * steps;
    if (style === GAITS.jog) return jogFoot(beat,steps,distance,side,strideWeight);
    const index = Math.min(steps - 1, Math.floor(beat));
    const step = beat - index;
    const stride = distance / (steps - 1);
    const swing = index % 2 === side;
    const previous = clamp((index - (swing ? 1 : 0)) * stride, 0, distance);
    // Both feet bookend the clip in their standing tracks. Only an airborne
    // foot can enter or leave the narrower walking tracks.
    const walkingTrack = contact => contact > 0 && contact < steps - 1 ? strideWeight : 0;
    const fromTrack = walkingTrack(index - (swing ? 1 : 0));
    const landing = i => i === steps - 1 ? 0 : i === 0 ? -8 : i === steps - 2 ? -9 : -12;
    const energetic = style === GAITS.natural;
    const pushOff = i => i === 0 ? 10 : i === steps - 1 ? 11 : energetic ? 24 : 19;
    const toeEntry = i => i === 0 ? 0 : 0.52;
    if (!swing) {
        // Heel rocker, flat stance, and forefoot rocker. The other foot is
        // still on the floor early in this step (double support).
        const heel = index > 0 ? landing(index - 1) * (1 - ramp(step, 0, 0.23)) : 0;
        const toe = index < steps - 1 ? pushOff(index + 1) * toeEntry(index + 1) * ramp(step, 0.51, 1) : 0;
        const knee = index === 0 ? 7 : 7 + 3 * (1 - ramp(step, 0.08, 0.27));
        return { travel: previous, track: fromTrack, lift: 0, pitch: strideWeight * (heel + toe), knee };
    }
    const takeoff = index === 0 ? 0.24 : energetic ? 0.14 : 0.18;
    const next = clamp((index + 1) * stride, 0, distance);
    const p = clamp((step - takeoff) / (1 - takeoff));
    const push = pushOff(index);
    const profile = index === 0 ? launchFoot : balancedFoot;
    const curvePitch = gaitChannel(profile, p, 2);
    const tiltBias = curvePitch - profile.at(-1)[2] * p - profile[0][2] * (1 - p);
    const pitchEase = Math.sin(Math.PI * p) ** 2;
    const pitch = step <= takeoff
        ? push * (toeEntry(index) + (1 - toeEntry(index)) * ramp(step, 0, takeoff))
        : push * (1 - ramp(p, 0, 0.57)) + landing(index) * ramp(p, 0.56, 1)
            + clamp(tiltBias * 0.11, -4, 4) * pitchEase;
    // Like the SVG side gait, clearance peaks early and lowers gradually
    // through terminal swing. The sole leaves and meets the floor gently.
    const arc = (19683 / 64) * p ** 3 * (1 - p) ** 6;
    // The raw forefoot height includes shoe rotation and a little marker
    // noise; keep a clean floor-clearance arc when retargeting to boots.
    const measuredHeight = gaitChannel(profile, p, 1);
    const clearance = Math.min(0.40 * style.lift, 0.17 * (next - previous)) * (energetic ? gaitChannel(energeticSwing, p, 1) : index === 0 ? arc : 0.74 * arc + 0.26 * measuredHeight * pitchEase);
    // Lag the first few frames and round out the touchdown velocity before
    // switching to a planted footprint. Retargeting is not a hard splice.
    const reach = gaitChannel(energetic ? energeticSwing : profile, p, 0) * ramp(p, 0, 0.07);
    const travel = (index === 0 || index === steps - 1) ? reach + (1 - reach) * ramp(p, 0.88, 1) : reach;
    const knee = 7 + (index === steps - 1 ? 0 : 3 * ramp(p, 0.72, 1));
    return { travel: previous + (next - previous) * travel, takeoffDistance: previous, landingDistance: next,
        track: fromTrack + (walkingTrack(index + 1) - fromTrack) * smooth(p), lift: clearance,
        pitch: pitch * strideWeight, swing: p, knee,
        swingFold: energetic ? gaitChannel(energeticSwing, p, 2) * walkBlend(beat, steps) : undefined };
}

export const SUPPORT_SAMPLES_PER_STEP = 48;

function filterSupport(values, i, spacing = 1) {
    const at = j => values[clamp(j, 0, values.length - 1)];
    return (at(i - 5 * spacing) + 5 * at(i - 3 * spacing) + 10 * at(i - spacing)
        + 10 * at(i + spacing) + 5 * at(i + 3 * spacing) + at(i + 5 * spacing)) / 32;
}

export function steadyTorsoHeight(heights, smoothing = 0.82) {
    // Average a complete footfall: retain a little weight shift without
    // copying the short heel/toe reach corrections into the upper body.
    const radius = SUPPORT_SAMPLES_PER_STEP / 2;
    const sums = new Float64Array(heights.length + 1);
    heights.forEach((height, i) => { sums[i + 1] = sums[i] + height; });
    return heights.map((value, i) => {
        const a = Math.max(0, i - radius), b = Math.min(heights.length - 1, i + radius);
        const average = (sums[b + 1] - sums[a]) / (b - a + 1);
        const steady = clamp(Math.min(i, heights.length - 1 - i) / SUPPORT_SAMPLES_PER_STEP);
        return value + (average - value) * smoothing * smooth(steady);
    });
}

export function smoothWeightShift(shifts) {
    return shifts.map((_, i) => {
        const bookend = smooth(clamp(Math.min(i, shifts.length - 1 - i) / 9));
        return filterSupport(shifts, i) * bookend;
    });
}

export function smoothSupportHeight(required) {
    const ceiling = new Float64Array(required.length);
    const heights = new Float64Array(required.length);
    // Look ahead to the next contact, then smooth within the look-ahead
    // window. Each sample still clears the local planted-leg requirement.
    for (let i = 0; i < required.length; i++) {
        for (let j = Math.max(0, i - 6); j <= Math.min(required.length - 1, i + 6); j++) {
            ceiling[i] = Math.max(ceiling[i], required[j]);
        }
    }
    for (let i = 0; i < required.length; i++) {
        const bookend = smooth(clamp(Math.min(i, required.length - 1 - i) / 7));
        const smoothed = Math.max(required[i], filterSupport(ceiling, i) + 0.003);
        heights[i] = required[i] + (smoothed - required[i]) * bookend;
    }
    return heights;
}

export function supportHeightAt(heights, beat) {
    const frame = beat * SUPPORT_SAMPLES_PER_STEP;
    const i = Math.min(heights.length - 2, Math.floor(frame));
    const t = frame - i;
    const from = heights[i], to = heights[i + 1];
    return cubic(from, to, heights[i - 1] ?? from, heights[i + 2] ?? to, t);
}

export function routeTracks(plan) {
    const { from, to, distance, steps, turnTime, seconds, yawFrom, yawTo } = plan;
    const begin = turnTime / seconds;
    const points = [{ t: 0, value: 0 }];
    if (begin > 0) points.push({ t: begin, value: 0 });
    // Sample the eased start/stop. Keep position and foot offset on identical tracks.
    for (let i = 1; i <= 12; i++) {
        const p = i / (12 * steps);
        points.push({ t: begin + (1 - begin) * p, value: walkCenter(p, steps) });
    }
    for (let i = 0; i <= 12; i++) {
        const p = (steps - 1 + i / 12) / steps;
        const t = begin + (1 - begin) * p;
        if (t > points.at(-1).t) points.push({ t, value: walkCenter(p, steps) });
    }
    const tracks = {};
    const map = (a, b) => points.map(({ t, value }) => ({ t, value: a + (b - a) * value }));
    tracks.x = map(from.x, to.x);
    tracks.y = map(from.y, to.y);
    tracks[(GAITS[plan.gait] || GAITS.walk).route] = begin > 0
        ? [{ t: 0, value: 0 }, { t: begin, value: 0 }, { t: 1, value: 1 }]
        : [{ t: 0, value: 0 }, { t: 1, value: 1 }];
    tracks.realistic3DRouteOffset = map(0, distance);
    tracks.realistic3DRouteDistance = [{ t: 0, value: distance }, { t: 1, value: distance }];
    tracks.realistic3DRouteSteps = [{ t: 0, value: steps }, { t: 1, value: steps }];
    tracks.realistic3DTurn = begin > 0 ? Array.from({ length: 9 }, (_, i) => ({ t: begin * i / 8, value: yawFrom + (yawTo - yawFrom) * smooth(i / 8) }))
        : [{ t: 0, value: yawTo }];
    tracks.realistic3DTurn.push({ t: 1, value: yawTo });
    return tracks;
}
