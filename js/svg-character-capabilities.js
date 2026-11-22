/** Character feature contract used to filter UI and movements. */
(function () {
    'use strict';

    const capabilities = Object.freeze({
        'svg-presenter': Object.freeze({
            fullBody: false,
            armature: false,
            locomotion: false,
            contacts: false,
            multiView: false,
            blink: true,
            gaze: true,
            expressions: true,
            lipSync: true,
            headMotion: true
        }),
        'svg-armature': Object.freeze({
            fullBody: true,
            armature: true,
            locomotion: true,
            contacts: true,
            multiView: false,
            blink: false,
            gaze: false,
            expressions: false,
            lipSync: false,
            headMotion: true
        }),
        'svg-armature-premium': Object.freeze({
            fullBody: true,
            armature: true,
            locomotion: true,
            contacts: true,
            multiView: true,
            supportedViews: Object.freeze([
                'front',
                'back',
                'side-right',
                'side-left',
                'front-3q-right',
                'front-3q-left',
                'back-3q-right',
                'back-3q-left'
            ]),
            plannedViews: Object.freeze([]),
            premiumAssets: true,
            blink: true,
            gaze: true,
            expressions: true,
            lipSync: true,
            facialViews: Object.freeze([
                'front',
                'side-right',
                'side-left',
                'front-3q-right',
                'front-3q-left'
            ]),
            headMotionViews: Object.freeze([
                'front',
                'back',
                'side-right',
                'side-left',
                'front-3q-right',
                'front-3q-left',
                'back-3q-right',
                'back-3q-left'
            ]),
            headMotion: true
        }),
        'svg-armature-facial': Object.freeze({
            fullBody: true,
            armature: true,
            locomotion: true,
            contacts: true,
            multiView: false,
            blink: true,
            gaze: true,
            expressions: true,
            lipSync: true,
            headMotion: true
        })
    });

    if (typeof window !== 'undefined') window.SVG_CHARACTER_CAPABILITIES = capabilities;
    if (typeof globalThis !== 'undefined' && !globalThis.SVG_CHARACTER_CAPABILITIES) {
        globalThis.SVG_CHARACTER_CAPABILITIES = capabilities;
    }
})();
