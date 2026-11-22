/* Photo pixels stay in this worker; only measurements return to the designer. */
let tasks;
let segmenter;
function analysisImage(bitmap, opaque = false) {
    if (!bitmap?.width || !bitmap?.height) throw new Error('The photo has no image pixels.');
    if (bitmap.width % 4 === 0 && !opaque) return bitmap;
    // MediaPipe 0.10.32 aborts when copying float masks with padded rows.
    // Resample only the inference copy to a four-pixel width boundary. Normalized
    // landmarks and masks still map to the unchanged source photo without offsets.
    const canvas = new OffscreenCanvas(Math.ceil(bitmap.width / 4) * 4, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo analysis could not create its image buffer.');
    if (opaque) { context.fillStyle = '#bfbfbf'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function focusedFace(model, input, pose) {
    // Locate the dominant body's head without cropping the user's full-body image.
    const points = (pose || []).slice(0, 11).filter(p => p.visibility > .7 && Number.isFinite(p.x) && Number.isFinite(p.y));
    if (points.length < 7) return null;
    const xs = points.map(p => p.x * input.width), ys = points.map(p => p.y * input.height);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const size = Math.max(48, (right - left) * 3.4, (bottom - top) * 4.8);
    const x = (left + right - size) / 2, y = (top + bottom - size) / 2 - size * .08;
    const crop = new OffscreenCanvas(512, 512), ctx = crop.getContext('2d');
    ctx.fillStyle = '#bfbfbf'; ctx.fillRect(0, 0, 512, 512);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(input, -x * 512 / size, -y * 512 / size, input.width * 512 / size, input.height * 512 / size);
    const detected = model.detect(crop).faceLandmarks || [];
    crop.width = crop.height = 1;
    // Never select one face out of several in the focused crop.
    if (!detected.length) return null;
    return detected.map(face => face.map(p => ({ ...p, x: (x + p.x * size) / input.width, y: (y + p.y * size) / input.height, z: p.z * size / input.width })));
}
async function getSegmenter(base) {
    if (!segmenter) {
        segmenter = (async () => {
            const { FilesetResolver, ImageSegmenter } = await import(base + 'vision_bundle.js');
            const files = await FilesetResolver.forVisionTasks(base + 'wasm');
            return ImageSegmenter.createFromOptions(files, {
                baseOptions: { modelAssetPath: base + 'selfie_segmenter.tflite', delegate: 'CPU' },
                runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false
            });
        })().catch(error => { segmenter = null; throw error; });
    }
    return segmenter;
}
async function getTasks(base) {
    if (!tasks) {
        tasks = (async () => {
            const { FilesetResolver, FaceLandmarker, PoseLandmarker } = await import(base + 'vision_bundle.js');
            const files = await FilesetResolver.forVisionTasks(base + 'wasm');
            const face = await FaceLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: base + 'face_landmarker.task', delegate: 'CPU' },
                runningMode: 'IMAGE', numFaces: 2, outputFaceBlendshapes: false
            });
            const pose = await PoseLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: base + 'pose_landmarker_lite.task', delegate: 'CPU' },
                runningMode: 'IMAGE', numPoses: 1, outputSegmentationMasks: true
            });
            return { face, pose };
        })().catch(error => { tasks = null; throw error; });
    }
    return tasks;
}
self.onmessage = async ({ data }) => {
    const { id, bitmap, base, operation } = data;
    let input;
    try {
        input = analysisImage(bitmap, operation !== 'segment');
        if (operation === 'segment') {
            const model = await getSegmenter(base);
            const segmented = model.segment(input);
            try {
                // The pinned binary SelfieSegmenter exposes one person-confidence
                // channel. Models exposing both classes identify person by label.
                const index = segmented.confidenceMasks?.length === 1 ? 0 : model.getLabels().indexOf('person');
                const person = segmented.confidenceMasks?.[index];
                if (!person) throw new Error('Person segmentation output is unavailable.');
                const mask = { width: person.width, height: person.height, values: person.getAsFloat32Array().slice() };
                self.postMessage({ id, result: { mask } }, [mask.values.buffer]);
            } finally { segmented.close(); }
            return;
        }
        const { face, pose } = await getTasks(base);
        const faces = face.detect(input);
        const body = pose.detect(input);
        let landmarks = faces.faceLandmarks || [], faceDetection = 'full-image';
        if (!landmarks.length) {
            const focused = focusedFace(face, input, body.landmarks?.[0]);
            if (focused?.length) { landmarks = focused; faceDetection = 'focused-head'; }
        }
        let mask = null;
        const firstMask = body.segmentationMasks?.[0];
        if (firstMask) mask = { width: firstMask.width, height: firstMask.height, values: firstMask.getAsFloat32Array().slice() };
        const result = { faces: landmarks, pose: body.landmarks?.[0] || [], mask, faceDetection };
        body.segmentationMasks?.forEach(item => item.close());
        self.postMessage({ id, result }, mask ? [mask.values.buffer] : []);
    } catch (error) {
        self.postMessage({ id, error: error.message || 'Photo analysis failed' });
    } finally {
        if (input && input !== bitmap) { input.width = 1; input.height = 1; }
        bitmap?.close();
    }
};
