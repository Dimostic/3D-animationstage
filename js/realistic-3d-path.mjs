// Ground coordinates: x is stage-right; z projects downstage. Distance,
// rather than a curve parameter, drives both body travel and footprint IK.
export const MAX_WAYPOINTS = 10;
export const wrapYaw = a => Math.atan2(Math.sin(a), Math.cos(a));

export function groundPath(points, stride) {
    if (!Array.isArray(points) || points.length < 2 || points.length > MAX_WAYPOINTS + 1) {
        throw Error(`Choose 1 to ${MAX_WAYPOINTS} waypoints.`);
    }
    if (!Number.isFinite(stride) || stride <= 0 || points.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.z))) {
        throw Error('Invalid 3D route coordinates.');
    }
    const rows = [];
    let stepLimit = stride;
    function append(x, z, yaw) {
        const last = rows.at(-1);
        const ds = last ? Math.hypot(x - last.x, z - last.z) : 0;
        if (last && ds < 1e-9) return;
        rows.push({ x, z, yaw: last ? last.yaw + wrapYaw(yaw - last.yaw) : yaw, s: (last?.s || 0) + ds });
    }
    const legs = points.slice(1).map((p, i) => {
        const dx = p.x - points[i].x, dz = p.z - points[i].z;
        const length = Math.hypot(dx, dz);
        if (!(length > 1e-6)) throw Error('Pick distinct waypoints.');
        return { x: dx / length, z: dz / length, length, yaw: Math.atan2(dx, dz) };
    });
    function arc(a, b, u, v, r) {
        for (let i = 1; i <= 32; i++) {
            const t = i / 32, k = 1 - t;
            const sample = key => a[key] + (b[key] - a[key]) * t*t*(3-2*t) + r*(k*k*t*u[key] - k*t*t*v[key]);
            const tangent = key => (b[key]-a[key])*6*t*k + r*(k*(1-3*t)*u[key] + t*(3*t-2)*v[key]);
            append(sample('x'), sample('z'), Math.atan2(tangent('x'), tangent('z')));
        }
    }
    append(points[0].x, points[0].z, legs[0].yaw);
    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i], a = legs[i-1], b = legs[i];
        const turn = Math.abs(wrapYaw(b.yaw - a.yaw));
        const r = Math.min(2 * stride, a.length * 0.45, b.length * 0.45);
        if (turn > Math.PI * 0.82 || (turn > 0.35 && r < stride * turn * 0.13)) {
            throw Error('Too little room for this walking turn. Use Stop and wait at the corner or space the points farther apart.');
        }
        if (turn > 0.35) stepLimit = Math.min(stepLimit, 2*r/turn);
        const n = Math.hypot(a.x + b.x, a.z + b.z);
        const mid = { x: (a.x + b.x)/n, z: (a.z + b.z)/n };
        const entry = { x: p.x-r*a.x, z: p.z-r*a.z }, exit = { x: p.x+r*b.x, z: p.z+r*b.z };
        append(entry.x, entry.z, a.yaw);
        arc(entry, p, a, mid, r);
        arc(p, exit, mid, b, r);
    }
    append(points.at(-1).x, points.at(-1).z, legs.at(-1).yaw);
    return { distance: rows.at(-1).s, stepLimit, at(s) {
        let lo = 0, hi = rows.length - 1;
        while (hi-lo > 1) {
            const m = (lo+hi) >> 1;
            if (s < rows[m].s) hi = m; else lo = m;
        }
        const a = rows[lo], b = rows[hi], t = Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s)));
        return { x: a.x+(b.x-a.x)*t, z: a.z+(b.z-a.z)*t, yaw: a.yaw+(b.yaw-a.yaw)*t };
    } };
}
