import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const source = path.resolve(process.argv[2] || 'tmp/makehuman-authoring/makehuman/data');
const proxies = path.resolve(process.argv[3] || 'tmp/realistic-3d-sources');
const output = path.resolve(process.argv[4] || 'assets/realistic-3d');
const read = file => fs.readFileSync(file, 'utf8');
const lines = file => read(file).split(/\r?\n/);
const vec = arr => new T.Vector3(...arr);
const json = file => JSON.parse(read(path.join(source, 'rigs', file)));
const spec = json('default.mhskel');
const sourceWeights = json('default_weights.mhw').weights;

function obj(file) {
    const points = [], uv = [], faces = [];
    let group = '';
    for (const line of lines(file)) {
        const [key, ...args] = line.trim().split(/\s+/);
        if (key === 'v') points.push(args.slice(0, 3).map(Number));
        if (key === 'vt') uv.push([Number(args[0]), Number(args[1])]);
        if (key === 'g') group = args[0];
        if (key === 'f') faces.push({ group, corners: args.map(arg => arg.split('/').slice(0, 2).map(i => Number(i) - 1)) });
    }
    return { points, uv, faces };
}

function fit(dir, name, points, variants = []) {
    const mesh = obj(path.join(dir, `${name}.obj`));
    const hidden = new Set(), refs = [], scaleRefs = [];
    let section = '';
    for (const line of lines(path.join(dir, `${name}.mhclo`))) {
        const cleaned = line.split('#')[0].trim();
        if (!cleaned) continue;
        const [key, ...rest] = cleaned.split(/\s+/);
        if (/^[xyz]_scale$/.test(key)) {
            const axis = 'xyz'.indexOf(key[0]);
            scaleRefs[axis] = rest.map(Number);
        }
        if (key === 'verts' || key === 'delete_verts' || key === 'weights') section = key;
        else if (/^\d/.test(key) && section === 'verts') {
            const v = [key, ...rest].map(Number);
            refs.push(v.length === 1 ? [v[0], v[0], v[0], 1, 0, 0, 0, 0, 0] : v);
        } else if (/^\d/.test(key) && section === 'delete_verts') {
            for (const m of cleaned.matchAll(/(\d+)(?:\s+-\s+(\d+))?/g)) {
                for (let n = Number(m[1]); n <= Number(m[2] ?? m[1]); n++) hidden.add(n);
            }
        }
    }
    if (refs.length !== mesh.points.length) throw new Error(`Invalid proxy mapping for ${name}: ${refs.length}/${mesh.points.length}`);
    function project(sourcePoints) {
        const scales = [0, 1, 2].map(axis => {
            const ref = scaleRefs[axis];
            return ref ? Math.abs(sourcePoints[ref[0]][axis] - sourcePoints[ref[1]][axis]) / ref[2] : 1;
        });
        return refs.map(r => scales.map((s, i) => sourcePoints[r[0]][i] * r[3] + sourcePoints[r[1]][i] * r[4] + sourcePoints[r[2]][i] * r[5] + s * (r[i + 6] || 0)));
    }
    mesh.points = project(points);
    mesh.variants = variants.map(project);
    const material = read(path.join(dir, `${name}.mhmat`));
    const texture = material.match(/^diffuseTexture\s+(\S+)/m)?.[1];
    return { mesh, refs, hidden, texture: texture && path.join(dir, texture) };
}

const jointCenter = (points, ids) => ids.reduce((sum, i) => sum.add(vec(points[i])), new T.Vector3()).multiplyScalar(1 / ids.length);
const buildNames = ['buildSlender', 'buildFuller'];

function buildSkeleton(points, variants, surfaceIds, minY, maxY) {
    const bones = [], byName = new Map();
    const offsetsByJoint = new Map();
    function offsetsAt(key, ids, center) {
        if (offsetsByJoint.has(key)) return offsetsByJoint.get(key);
        const offsets = variants.map(v => jointCenter(v, ids).sub(center));
        if (center.y > minY && center.y < maxY && offsets.some(offset => offset.lengthSq() < 1e-12)) {
            // Weight targets can leave the hidden joint markers untouched.
            // Infer their shift from the nearby visible surface instead.
            const neighbors = surfaceIds.map(id => [id, vec(points[id]).distanceToSquared(center)])
                .sort((a, b) => a[1] - b[1]).slice(0, 24);
            const fade = T.MathUtils.smoothstep(center.y, minY, minY + 1)
                * (1 - T.MathUtils.smoothstep(center.y, maxY - 0.75, maxY));
            offsets.forEach((offset, i) => {
                if (offset.lengthSq() >= 1e-12) return;
                let weight = 0;
                for (const [id, distance] of neighbors) {
                    const w = 1 / (0.35 + distance);
                    offset.addScaledVector(vec(variants[i][id]).sub(vec(points[id])), w);
                    weight += w;
                }
                offset.multiplyScalar(fade / weight);
                if (Math.abs(center.x) < 0.06) offset.x = 0;
            });
        }
        offsetsByJoint.set(key, offsets);
        return offsets;
    }
    function bone(name) {
        if (byName.has(name)) return byName.get(name);
        const definition = spec.bones[name];
        const parent = definition.parent ? bone(definition.parent) : null;
        const ids = spec.joints[definition.head];
        const center = jointCenter(points, ids);
        const buildOffsets = offsetsAt(definition.head, ids, center);
        const result = new T.Bone();
        result.name = name.replace(/\./g, '_');
        result.position.copy(center);
        if (parent) {
            result.position.sub(parent.center);
            parent.result.add(result);
        }
        result.userData.buildOffsets = buildOffsets.map((offset, i) => offset.clone().sub(parent?.buildOffsets[i] || new T.Vector3()).toArray());
        const record = { center, result, buildOffsets, index: bones.length };
        bones.push(result);
        byName.set(name, record);
        return record;
    }
    Object.keys(spec.bones).forEach(bone);
    const weights = points.map(() => []);
    Object.entries(sourceWeights).forEach(([name, pairs]) => {
        if (byName.has(name)) for (const [i, w] of pairs) if (weights[i]) weights[i].push([byName.get(name).index, w]);
    });
    return { bones, weights, byName };
}

function geometry(mesh, weights, include) {
    const pos = [], tex = [], joint = [], strength = [], indices = [], vertexMap = new Map(), sourceIds = [];
    function vertex([v, u]) {
        const key = `${v}/${u}`;
        if (vertexMap.has(key)) return vertexMap.get(key);
        const index = pos.length / 3;
        vertexMap.set(key, index);
        pos.push(...mesh.points[v]);
        const uv = mesh.uv[u] || [0, 0];
        tex.push(uv[0], 1 - uv[1]);
        const influences = weights[v].slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
        let total = influences.reduce((s, entry) => s + entry[1], 0);
        if (total <= 0) { influences.push([0, 1]); total = 1; }
        for (let i = 0; i < 4; i++) { joint.push(influences[i]?.[0] ?? 0); strength.push((influences[i]?.[1] ?? 0) / total); }
        sourceIds.push(v);
        return index;
    }
    for (const { group, corners } of mesh.faces) {
        if (!include(group, corners)) continue;
        const ids = corners.map(vertex);
        for (let i = 1; i < ids.length - 1; i++) indices.push(ids[0], ids[i], ids[i + 1]);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(tex, 2));
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(joint, 4));
    geo.setAttribute('skinWeight', new T.Float32BufferAttribute(strength, 4));
    geo.setIndex(indices);
    // Smooth normal splits caused only by the UV atlas.
    function smooth(geometry) {
        geometry.computeVertexNormals();
        const normal = geometry.attributes.normal;
        const average = new Map();
        sourceIds.forEach((id, i) => {
            if (!average.has(id)) average.set(id, new T.Vector3());
            average.get(id).add(new T.Vector3().fromBufferAttribute(normal, i));
        });
        average.forEach(n => n.normalize());
        sourceIds.forEach((id, i) => normal.setXYZ(i, ...average.get(id).toArray()));
        return normal;
    }
    const normals = smooth(geo);
    if (mesh.variants?.length) {
        const deltas = (target, baseline, name) => {
            const attr = new T.Float32BufferAttribute(target.array.map((value, i) => value - baseline.array[i]), 3);
            attr.name = name;
            return attr;
        };
        geo.morphTargetsRelative = true;
        geo.morphAttributes.position = [];
        geo.morphAttributes.normal = [];
        mesh.variants.forEach((points, i) => {
            const alternate = new T.BufferGeometry();
            alternate.setIndex(geo.index);
            alternate.setAttribute('position', new T.Float32BufferAttribute(sourceIds.flatMap(id => points[id]), 3));
            geo.morphAttributes.position.push(deltas(alternate.attributes.position, geo.attributes.position, buildNames[i]));
            geo.morphAttributes.normal.push(deltas(smooth(alternate), normals, buildNames[i]));
        });
    }
    return geo;
}

function transfer(refs, weights) {
    return refs.map(r => {
        const result = new Map();
        for (let i = 0; i < 3; i++) for (const [id, w] of weights[r[i]]) result.set(id, (result.get(id) || 0) + w * r[i + 3]);
        return [...result].filter(([, w]) => w > 0);
    });
}

// The Node exporter only needs the asynchronous FileReader subset for GLB buffers.
globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};

function encodeTexture(file, alpha) {
    const args = ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', 'scale=1024:1024:force_original_aspect_ratio=decrease'];
    if (!alpha) args.push('-q:v', '3');
    return execFileSync('ffmpeg', [...args, '-threads', '1', '-f', 'image2pipe', '-vcodec', alpha ? 'png' : 'mjpeg', '-'], { maxBuffer: 8 * 1024 * 1024 });
}

function embedTextures(buffer, images) {
    const size = buffer.readUInt32LE(12);
    const doc = JSON.parse(buffer.toString('utf8', 20, 20 + size));
    const binary = [buffer.subarray(28 + size)];
    let offset = binary[0].length;
    doc.images = [];
    doc.textures = [];
    for (const mat of doc.materials) {
        const entry = images.get(mat.name);
        if (!entry) continue;
        const bytes = encodeTexture(entry.file, entry.alpha);
        const padding = Buffer.alloc((4 - bytes.length % 4) % 4);
        const bufferView = doc.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
        const image = doc.images.push({ bufferView, mimeType: entry.alpha ? 'image/png' : 'image/jpeg' }) - 1;
        mat.pbrMetallicRoughness.baseColorTexture = { index: doc.textures.push({ source: image }) - 1 };
        binary.push(bytes, padding);
        offset += bytes.length + padding.length;
    }
    doc.buffers[0].byteLength = offset;
    const header = Buffer.alloc(20);
    const data = Buffer.from(JSON.stringify(doc));
    const padded = Buffer.concat([data, Buffer.alloc((4 - data.length % 4) % 4, 32)]);
    const chunk = Buffer.alloc(8);
    header.write('glTF', 0); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + padded.length + offset, 8);
    header.writeUInt32LE(padded.length, 12); header.write('JSON', 16);
    chunk.writeUInt32LE(offset, 0); chunk.write('BIN\0', 4);
    return Buffer.concat([header, padded, chunk, ...binary]);
}

async function build({ gender, hair, outfits }) {
    const base = obj(path.join(source, '3dobjs/base.obj'));
    const macro = path.join(source, 'targets/macrodetails');
    const readTarget = name => {
        const result = new Map();
        for (const line of lines(path.join(macro, `${name}.target`))) {
            const [id, ...d] = line.trim().split(/\s+/).map(Number);
            if (d.length === 3 && base.points[id]) result.set(id, d);
        }
        return result;
    };
    const weightTarget = size => readTarget(`universal-${gender}-young-averagemuscle-${size}weight`);
    const averageBuild = weightTarget('average');
    for (const target of [readTarget(`african-${gender}-young`), averageBuild]) {
        for (const [id, d] of target) for (let i = 0; i < 3; i++) base.points[id][i] += d[i];
    }
    const yAt = name => jointCenter(base.points, spec.joints[spec.bones[name].head]).y;
    const head = yAt('head') - 0.15;
    const shoulder = yAt('upperarm01.L');
    const ankle = yAt('foot.L');
    base.variants = ['min', 'max'].map(size => {
        const variant = weightTarget(size);
        return base.points.map(([x, y, z], i) => {
            // Keep facial identity, standing height and shoe contact unchanged.
            const blend = 0.52 * T.MathUtils.smoothstep(y, ankle, ankle + 1.35) * (1 - T.MathUtils.smoothstep(y, shoulder, head));
            const current = averageBuild.get(i) || [0, 0, 0];
            const alternate = variant.get(i) || [0, 0, 0];
            return [x + (alternate[0] - current[0]) * blend, y, z + (alternate[2] - current[2]) * blend];
        });
    });
    const surfaceIds = [...new Set(base.faces.filter(face => face.group === 'body').flatMap(face => face.corners.map(([id]) => id)))];
    const { bones, weights, byName } = buildSkeleton(base.points, base.variants, surfaceIds, ankle, head);
    const group = new T.Group();
    group.add(bones[0]);
    group.updateMatrixWorld(true);
    const skin = new T.Skeleton(bones);
    const textures = new Map();
    const mat = (name, color, file, alpha = false) => {
        if (file) textures.set(name, { file, alpha });
        const result = new T.MeshStandardMaterial({ name, color, roughness: 0.85, side: alpha ? T.DoubleSide : T.FrontSide });
        if (alpha) result.alphaTest = 0.42;
        return result;
    };
    function add(name, geo, material) {
        const piece = new T.SkinnedMesh(geo, material);
        piece.name = name;
        group.add(piece);
        piece.bind(skin, new T.Matrix4());
        return piece;
    }
    const clothing = outfits.map(name => fit(path.join(proxies, 'clothes', name), name, base.points, base.variants));
    const shoes = fit(path.join(proxies, 'clothes/shoes01'), 'shoes01', base.points, base.variants);
    const style = fit(path.join(proxies, 'hair', hair), hair, base.points);
    const skinFile = path.join(proxies, `skins/young_african_${gender}/young_darkskinned_${gender}_diffuse.png`);
    const body = mat('Skin', 0xffffff, skinFile);
    clothing.forEach((outfit, i) => {
        add(`Body${i}`, geometry(base, weights, (tag, corners) => tag === 'body' && !corners.every(([v]) => outfit.hidden.has(v) || shoes.hidden.has(v))), body);
        add(`Outfit${i}`, geometry(outfit.mesh, transfer(outfit.refs, weights), () => true), mat(`Fabric${i}`, 0xffffff, outfit.texture));
    });
    add('Shoes', geometry(shoes.mesh, transfer(shoes.refs, weights), () => true), mat('Shoes', 0xffffff, shoes.texture));
    const headWeights = [[byName.get('head').index, 1]];
    add('Hair', geometry(style.mesh, style.mesh.points.map(() => headWeights), () => true), mat('Hair', 0xffffff, style.texture, true));
    add('Teeth', geometry({ ...base, variants: [] }, weights, tag => /^helper-(upper|lower)-teeth$/.test(tag)), mat('Teeth', 0xb5a091));
    add('Tongue', geometry({ ...base, variants: [] }, weights, tag => tag === 'helper-tongue'), mat('Tongue', 0x673737));
    for (const side of ['L', 'R']) {
        const eye = byName.get(`eye.${side}`).result;
        const socket = base.faces.filter(f => f.group === `helper-${side.toLowerCase()}-eye`);
        const bounds = new T.Box3().setFromPoints(socket.flatMap(f => f.corners.map(([i]) => vec(base.points[i]))));
        const radius = bounds.getSize(new T.Vector3()).multiplyScalar(.5);
        const globe = new T.Mesh(new T.SphereGeometry(1, 24, 16), mat(`Eye${side}`, 0xeaded4));
        globe.scale.copy(radius);
        const center = bounds.getCenter(new T.Vector3()).sub(eye.getWorldPosition(new T.Vector3()));
        globe.position.copy(center);
        const iris = new T.Mesh(new T.SphereGeometry(radius.x * .52, 20, 12), mat(`Iris${side}`, 0x38261c));
        iris.position.copy(center).z += radius.z * .88;
        iris.scale.z = 0.34;
        const pupil = new T.Mesh(new T.SphereGeometry(radius.x * .23, 16, 12), mat(`Pupil${side}`, 0x100d0c));
        pupil.position.copy(center).z += radius.z * 1.035;
        pupil.scale.z = 0.26;
        eye.add(globe, iris, pupil);
    }
    fs.mkdirSync(output, { recursive: true });
    const binary = await new GLTFExporter().parseAsync(group, { binary: true });
    const file = path.join(output, `${gender === 'female' ? 'amaka' : 'tunde'}.glb`);
    fs.writeFileSync(file, embedTextures(Buffer.from(binary), textures));
    console.log(`${path.basename(file)}: ${fs.statSync(file).size} bytes, ${bones.length} bones`);
}

await build({ gender: 'female', hair: 'braid01', outfits: ['female_casualsuit02', 'female_elegantsuit01'] });
await build({ gender: 'male', hair: 'afro01', outfits: ['male_casualsuit04', 'male_elegantsuit01'] });
