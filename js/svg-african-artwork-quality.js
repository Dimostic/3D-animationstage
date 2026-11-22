(function (global) {
    'use strict';

    const SOURCE = Object.freeze({
        AUTHORED: 'authored-svg-files',
        EXPERIMENTAL_THREE_QUARTER: 'experimental-drawn-three-quarter',
        PROCEDURAL: 'procedural-renderer',
        UNAVAILABLE: 'unavailable'
    });

    function normalizePaths(paths = []) {
        return [...new Set((Array.isArray(paths) ? paths : [])
            .map(path => String(path || '').trim())
            .filter(Boolean))].sort();
    }

    function describe(status = {}, actualSources = []) {
        const sources = [...new Set((Array.isArray(actualSources) ? actualSources : [])
            .map(source => String(source || '').trim())
            .filter(Boolean))];
        const actualSource = sources.length === 1 ? sources[0] : String(status.source || '');
        const changedPaths = normalizePaths(status.changedPaths);

        if (status.experimental === true && changedPaths.includes('threeQuarterRenderer')) {
            return {
                kind: 'fallback',
                label: 'Current projection - fallback',
                detail: 'Drawn 3/4 renderer unavailable',
                title: 'The experimental drawn 3/4 renderer is unavailable, so this character is using the established current projection.',
                changedPaths
            };
        }

        if (status.experimental === true || actualSource === SOURCE.EXPERIMENTAL_THREE_QUARTER) {
            return {
                kind: 'experimental',
                label: 'Drawn 3/4 - Experimental',
                detail: 'Current projection remains available',
                title: 'This character is using the opt-in drawn 3/4 pilot. Choose Current projection to return to the established rendering.',
                changedPaths
            };
        }

        if (status.authoredActive === true && actualSource === SOURCE.AUTHORED) {
            const version = String(status.artworkVersion || '').trim();
            const stage = String(status.qualityStage || '').trim();
            return {
                kind: 'authored',
                label: version ? `Authored SVG - ${version}` : 'Authored SVG',
                detail: stage,
                title: 'This combination is rendered from the curated six-part SVG artwork pack.',
                changedPaths
            };
        }

        if (status.authoredAvailable === true) {
            const reason = changedPaths.length
                ? `Unsupported authored changes: ${changedPaths.join(', ')}`
                : 'The current combination is outside the authored artwork contract.';
            return {
                kind: 'fallback',
                label: 'Procedural fallback',
                detail: reason,
                title: `${reason} The character remains rigged and editable.`,
                changedPaths
            };
        }

        if (actualSource === SOURCE.UNAVAILABLE || status.source === SOURCE.UNAVAILABLE) {
            return {
                kind: 'unavailable',
                label: 'Artwork unavailable',
                detail: '',
                title: 'No compatible SVG artwork source is available.',
                changedPaths
            };
        }

        return {
            kind: 'procedural',
            label: 'Procedural SVG',
            detail: '',
            title: 'This character is rendered by the editable procedural SVG system.',
            changedPaths
        };
    }

    global.SvgAfricanArtworkQuality = Object.freeze({ SOURCE, describe });
})(typeof globalThis !== 'undefined' ? globalThis : window);
