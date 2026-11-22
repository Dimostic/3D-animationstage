// Dedicated 3D configuration. Never inject the 2D site's session or secrets here.
globalThis.STUDIO3D_CONFIG ??= Object.freeze({
    studio2DUrl: 'https://animationstage.com/',
    hostedServices: false
});
if (!globalThis.STUDIO3D_CONFIG.hostedServices) globalThis.__ERROR_REPORTER_DISABLED = true;
