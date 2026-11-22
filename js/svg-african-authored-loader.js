/**
 * Loads authored SVG African artwork one identity family at a time.
 * The lightweight registry is loaded with the app; body-part SVG payloads are
 * requested only for the selected character and cached by the browser.
 */
(function (global) {
    'use strict';

    const DEFAULT_ASSET_ID = 'ada-lecturer-front';
    const BUNDLE_DIRECTORY = 'svg-african-authored-bundles';
    const ownScript = typeof document !== 'undefined' ? document.currentScript : null;
    const ownScriptSrc = ownScript?.src || '';
    const ownScriptNonce = ownScript?.nonce || ownScript?.getAttribute?.('nonce') || '';
    const bundlePromises = new Map();
    const bundleErrors = new Map();
    const requestedSources = new Map();
    const warmFailuresReported = new Set();
    let state = 'idle';
    let lastError = null;
    let allBundlesPromise = null;

    function getRegistry() {
        return global.SvgAfricanAuthoredArtwork || null;
    }

    function hasRegistry() {
        const registry = getRegistry();
        return !!registry?.registerBundle && !!registry?.getBundleForAsset;
    }

    function resolveBundleSrc(bundle) {
        const file = String(bundle?.file || '').trim();
        if (!file) return '';
        if (ownScriptSrc && typeof document !== 'undefined') {
            const sourceUrl = new URL(ownScriptSrc, document.baseURI);
            const bundleUrl = new URL(`${BUNDLE_DIRECTORY}/${file}`, sourceUrl);
            bundleUrl.search = sourceUrl.search;
            return bundleUrl.href;
        }
        const version = String(global.__appAssetVersion || '').trim();
        return `js/${BUNDLE_DIRECTORY}/${file}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
    }

    function isBundleScript(script, bundleId) {
        if (!script) return false;
        if (script.dataset?.svgAfricanAuthoredBundle === bundleId) return true;
        const bundle = getRegistry()?.getBundleInfo?.(bundleId);
        if (!script.src || !bundle?.file) return false;
        try {
            return new URL(script.src, document.baseURI).pathname.endsWith(`/${BUNDLE_DIRECTORY}/${bundle.file}`);
        } catch (_) {
            return String(script.src).includes(`${BUNDLE_DIRECTORY}/${bundle.file}`);
        }
    }

    function findPendingBundleScript(bundleId) {
        if (typeof document === 'undefined') return null;
        return [...document.scripts]
            .reverse()
            .find(script => isBundleScript(script, bundleId) && script.dataset.svgAfricanAuthoredState !== 'error') || null;
    }

    function emitState(reason = '', bundleId = '', assetId = '') {
        if (typeof global.dispatchEvent !== 'function' || typeof global.CustomEvent !== 'function') return;
        const registry = getRegistry();
        global.dispatchEvent(new global.CustomEvent('svg-african-authored-artwork:state', {
            detail: {
                state,
                reason,
                bundleId,
                assetId,
                loadedBundleCount: registry?.listBundles?.().filter(bundle => bundle.loaded).length || 0,
                bundleCount: registry?.listBundles?.().length || 0,
                src: requestedSources.get(bundleId) || '',
                error: lastError ? String(lastError.message || lastError) : ''
            }
        }));
    }

    function setState(nextState, reason = '', error = null, bundleId = '', assetId = '') {
        state = nextState;
        lastError = error;
        emitState(reason, bundleId, assetId);
    }

    function rejectLoad(message, reason = '', bundleId = '', assetId = '') {
        const error = new Error(message);
        setState('error', reason, error, bundleId, assetId);
        return Promise.reject(error);
    }

    function ensureBundle(bundle, options = {}) {
        const registry = getRegistry();
        const bundleId = String(bundle?.id || '').trim();
        const assetId = String(options.assetId || bundle?.requestedAssetId || '').trim();
        const reason = String(options.reason || 'on-demand');
        if (!bundleId) return rejectLoad('Authored SVG artwork bundle could not be resolved.', reason, '', assetId);
        if (registry?.isBundleLoaded?.(bundleId)) {
            setState('ready', reason, null, bundleId, assetId);
            return Promise.resolve(registry);
        }
        if (bundlePromises.has(bundleId)) return bundlePromises.get(bundleId);
        if (typeof document === 'undefined') {
            return rejectLoad('Authored SVG artwork requires a browser document to load.', reason, bundleId, assetId);
        }

        const requestedSrc = resolveBundleSrc(bundle);
        requestedSources.set(bundleId, requestedSrc);
        setState('loading', reason, null, bundleId, assetId);
        const pending = new Promise((resolve, reject) => {
            let script = findPendingBundleScript(bundleId);
            let settled = false;
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) global.clearTimeout?.(timeoutId);
                script?.removeEventListener?.('load', onLoad);
                script?.removeEventListener?.('error', onError);
            };
            const succeed = () => {
                if (settled) return;
                if (!registry?.isBundleLoaded?.(bundleId)) {
                    fail(new Error(`Authored SVG artwork bundle ${bundleId} loaded without registering its packs.`));
                    return;
                }
                settled = true;
                cleanup();
                if (script?.dataset) script.dataset.svgAfricanAuthoredState = 'ready';
                bundlePromises.delete(bundleId);
                bundleErrors.delete(bundleId);
                warmFailuresReported.delete(bundleId);
                setState('ready', reason, null, bundleId, assetId);
                resolve(registry);
            };
            const fail = (error) => {
                if (settled) return;
                settled = true;
                cleanup();
                if (script?.dataset) script.dataset.svgAfricanAuthoredState = 'error';
                const normalized = error instanceof Error
                    ? error
                    : new Error(`Could not load authored SVG artwork from ${requestedSrc}`);
                bundlePromises.delete(bundleId);
                bundleErrors.set(bundleId, normalized);
                setState('error', reason, normalized, bundleId, assetId);
                reject(normalized);
            };
            const onLoad = () => succeed();
            const onError = () => fail(new Error(`Could not load authored SVG artwork from ${requestedSrc}`));

            if (!script) {
                script = document.createElement('script');
                script.src = requestedSrc;
                script.async = true;
                script.dataset.svgAfricanAuthoredBundle = bundleId;
                script.dataset.svgAfricanAuthoredState = 'loading';
                if (ownScriptNonce) script.setAttribute('nonce', ownScriptNonce);
                script.addEventListener('load', onLoad, { once: true });
                script.addEventListener('error', onError, { once: true });
                (document.head || document.body || document.documentElement).appendChild(script);
            } else {
                script.addEventListener('load', onLoad, { once: true });
                script.addEventListener('error', onError, { once: true });
            }

            timeoutId = global.setTimeout?.(() => {
                fail(new Error(`Timed out loading authored SVG artwork from ${requestedSrc}`));
            }, Math.max(5000, Number(options.timeoutMs) || 45000));

            if (registry?.isBundleLoaded?.(bundleId)) succeed();
        });
        bundlePromises.set(bundleId, pending);
        return pending;
    }

    function ensureLoaded(options = {}) {
        const reason = String(options.reason || 'on-demand');
        if (isParametricAsset(options.assetId)) return Promise.resolve(getRegistry());
        if (!hasRegistry()) {
            return rejectLoad('The authored SVG artwork registry is not available.', reason, '', options.assetId || '');
        }
        const assetId = String(options.assetId || '').trim();
        if (!assetId) return ensureAllLoaded(options);
        const bundle = getRegistry().getBundleForAsset(assetId);
        if (!bundle) return rejectLoad(`No authored SVG artwork bundle is indexed for ${assetId}.`, reason, '', assetId);
        return ensureBundle(bundle, { ...options, assetId });
    }

    function ensureAllLoaded(options = {}) {
        const reason = String(options.reason || 'all-artwork');
        if (!hasRegistry()) {
            return rejectLoad('The authored SVG artwork registry is not available.', reason);
        }
        const registry = getRegistry();
        if (registry.areAllPacksLoaded?.()) return Promise.resolve(registry);
        if (allBundlesPromise) return allBundlesPromise;
        const bundles = registry.listBundles?.() || [];
        allBundlesPromise = Promise.all(bundles.map(bundle => ensureBundle(bundle, {
            ...options,
            reason,
            assetId: bundle.assetIds?.[0] || ''
        }))).then(() => {
            setState('ready', reason);
            return registry;
        }).finally(() => {
            allBundlesPromise = null;
        });
        return allBundlesPromise;
    }

    function isPremiumStageObject(obj) {
        return !!obj && (
            obj._characterAppearanceProvider === 'svg-african-premium'
            || obj._svgCharacterEngine === 'svg-armature-premium'
            || obj._svgCharacterPremiumPart === true
            || !!obj._svgAfricanPremiumAssetId
        );
    }

    function getStageObjectAssetId(obj) {
        return String(
            obj?._svgCharacterPremiumAssetId
            || obj?._svgAfricanPremiumAssetId
            || obj?._svgCharacterConfig?.assetCharacterId
            || obj?._svgCharacterConfig?.assetId
            || ''
        ).trim();
    }

    function warmForStageObject(obj) {
        if (!isPremiumStageObject(obj)) return null;
        const assetId = getStageObjectAssetId(obj) || DEFAULT_ASSET_ID;
        const bundleId = getRegistry()?.getBundleForAsset?.(assetId)?.id || assetId;
        return ensureLoaded({ reason: 'premium-stage-object', assetId }).catch((error) => {
            if (!warmFailuresReported.has(bundleId)) {
                warmFailuresReported.add(bundleId);
                console.warn('[SVG African] Authored artwork warm-up failed; saved SVG textures remain available.', error);
            }
            return null;
        });
    }

    function isParametricAsset(assetId) {
        return global.SvgAfricanPremiumAssets?.get?.(assetId)?.artworkFamily === 'community-parametric';
    }

    function isLoaded(assetId = '') {
        // Built-in parametric artwork is already available; it has no lazy bundle.
        if (isParametricAsset(assetId)) return true;
        const registry = getRegistry();
        if (!registry) return false;
        const normalizedAssetId = String(assetId || '').trim();
        return normalizedAssetId
            ? registry.isPackLoaded?.(normalizedAssetId) === true
            : registry.areAllPacksLoaded?.() === true;
    }

    function getBundleId(assetId) {
        return getRegistry()?.getBundleForAsset?.(assetId)?.id || '';
    }

    function getState(assetId = '') {
        const registry = getRegistry();
        const normalizedAssetId = String(assetId || '').trim();
        const bundle = normalizedAssetId ? registry?.getBundleForAsset?.(normalizedAssetId) : null;
        const bundleId = bundle?.id || '';
        const bundles = registry?.listBundles?.() || [];
        const ready = normalizedAssetId ? isLoaded(normalizedAssetId) : isLoaded();
        const loading = bundleId ? bundlePromises.has(bundleId) : bundlePromises.size > 0;
        const error = bundleId ? bundleErrors.get(bundleId) : lastError;
        return Object.freeze({
            state: ready ? 'ready' : (loading ? 'loading' : (error ? 'error' : state)),
            ready,
            loading,
            assetId: normalizedAssetId,
            bundleId,
            loadedBundleCount: bundles.filter(item => item.loaded).length,
            bundleCount: bundles.length,
            src: bundleId ? (requestedSources.get(bundleId) || resolveBundleSrc(bundle)) : '',
            error: error ? String(error.message || error) : ''
        });
    }

    global.SvgAfricanAuthoredArtworkLoader = Object.freeze({
        defaultAssetId: DEFAULT_ASSET_ID,
        bundleDirectory: BUNDLE_DIRECTORY,
        ensureLoaded,
        ensureAllLoaded,
        warmForStageObject,
        isPremiumStageObject,
        isLoaded,
        getBundleId,
        getState
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
