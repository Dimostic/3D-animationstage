/**
 * Shared SVG character helpers.
 * Kept dependency-free so presenter avatars and full-body SVG armatures can use it.
 */
(function () {
    'use strict';

    function makeInstanceId(prefix = 'svgchar') {
        const cryptoObj = (typeof crypto !== 'undefined') ? crypto : null;
        if (cryptoObj?.randomUUID) return `${prefix}-${cryptoObj.randomUUID()}`;
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function escapeXml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function svgToDataUrl(svg) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(svg || ''))}`;
    }

    function namespaceSvg(svg, namespace) {
        svg = String(svg || '');
        namespace = String(namespace || '').replace(/[^a-zA-Z0-9_-]+/g, '-');
        if (!svg || !namespace) return svg;

        const idMap = new Map();
        svg = svg.replace(/\bid=["']([^"']+)["']/g, (match, oldId) => {
            const nextId = `${namespace}-${oldId}`;
            idMap.set(oldId, nextId);
            return `id="${nextId}"`;
        });

        idMap.forEach((nextId, oldId) => {
            const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            svg = svg.replace(new RegExp(`url\\(#${escaped}\\)`, 'g'), `url(#${nextId})`);
            svg = svg.replace(new RegExp(`href=["']#${escaped}["']`, 'g'), `href="#${nextId}"`);
            svg = svg.replace(new RegExp(`xlink:href=["']#${escaped}["']`, 'g'), `xlink:href="#${nextId}"`);
        });

        return svg;
    }

    function assertSafeGeneratedSvg(svg) {
        const text = String(svg || '');
        const unsafe = /<script\b|<foreignObject\b|<iframe\b|javascript\s*:|\son[a-z]+\s*=/i;
        if (unsafe.test(text)) throw new Error('Unsafe SVG markup detected.');
        return true;
    }

    const api = {
        makeInstanceId,
        escapeXml,
        svgToDataUrl,
        namespaceSvg,
        assertSafeGeneratedSvg
    };

    if (typeof window !== 'undefined') window.SvgCharacterUtils = api;
    if (typeof globalThis !== 'undefined' && !globalThis.SvgCharacterUtils) globalThis.SvgCharacterUtils = api;
})();
