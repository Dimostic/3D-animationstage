let model, poseCount;
self.onmessage = async ({ data }) => {
    try {
        const requested=data.multiple?4:1;
        if (!model) {
            const { FilesetResolver, PoseLandmarker } = await import(data.base + 'vision_bundle.js');
            model = await PoseLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(data.base + 'wasm'), {
                baseOptions: { modelAssetPath: data.base + 'pose_landmarker_lite.task', delegate: 'CPU' },
                runningMode: 'IMAGE', numPoses: requested
            });
            poseCount=requested;
        }
        if(poseCount!==requested){await model.setOptions({numPoses:requested});poseCount=requested;}
        const result = model.detect(data.bitmap);
        self.postMessage({ id: data.id, points: result.landmarks?.[0] || [], poses:result.landmarks||[] });
    } catch (error) { self.postMessage({ id: data.id, error: error.message || 'Tracking failed' }); }
    finally { data.bitmap?.close(); }
};
