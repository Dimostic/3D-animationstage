/**
 * Animatable SVG advisor avatars.
 *
 * Two gender-aware portraits with consistent named groups so the same
 * driver code in advisor.js can animate either one:
 *
 *   #avHead         — head + neck (subtle nod / tilt while listening)
 *   #avEyes         — both eyes, with #avLidL / #avLidR for blinks
 *   #avPupils       — pupils (independent transform for gaze drift)
 *   #avMouth        — mouth path (lip-sync openness + smile/frown shape)
 *   #avBrows        — both brows (#avBrowL / #avBrowR — for raise / furrow)
 *   #avTorso        — coat/dress (breath/sway during speaking)
 *   #avHandL/R      — hands (small motion when emphasising)
 *
 * The mouth uses a single <path> instead of an ellipse so we can morph
 * between flat / open / smile / frown by recomputing the d= attribute.
 * That gives genuine expressive range without bringing in a 200 KB Lottie.
 */
(function () {
    'use strict';

    // ---- shared palette -------------------------------------------------
    const SKIN_F = '#a07150'; // warmer brown (female advisor)
    const SKIN_F_DARK = '#7a5236';
    const SKIN_M = '#8a5a3a'; // slightly darker / cooler (male advisor)
    const SKIN_M_DARK = '#5e3b22';
    const HAIR = '#1d1612';
    const HAIR_MALE = '#0f0906';
    const HAIR_EDGE = '#0b0705';
    const EYE_WHITE = '#f3e7da';
    const IRIS_F = '#37504c';
    const IRIS_M = '#25322f';
    const COAT = '#ffffff';
    const COAT_SHADOW = '#dfe7e9';
    const SUIT = '#143638';      // BMU teal
    const TIE  = '#23b6a5';
    const SCRUB = '#0f3d3e';

    /** Build the female advisor — head wrap, hoop earrings, white coat,
     *  warm smile. */
    function femaleAvatarSVG() {
        return `
        <svg id="avatarSvg" width="220" height="280" viewBox="0 0 220 280" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <radialGradient id="bgGlowF" cx="50%" cy="40%" r="60%">
                    <stop offset="0%"  stop-color="#7bdcb5" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="#0f3d3e" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="skinF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${SKIN_F}"/>
                    <stop offset="100%" stop-color="${SKIN_F_DARK}"/>
                </linearGradient>
                <linearGradient id="coatF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${COAT}"/>
                    <stop offset="100%" stop-color="${COAT_SHADOW}"/>
                </linearGradient>
                <linearGradient id="wrapF" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#3a1c4a"/>
                    <stop offset="50%" stop-color="#7b2e58"/>
                    <stop offset="100%" stop-color="#c64a73"/>
                </linearGradient>
            </defs>

            <!-- soft glow halo -->
            <!-- transparent background: no backdrop so presenter avatars crop/export cleanly -->

            <!-- ============= TORSO (coat) ============= -->
            <g id="avTorso">
                <!-- shoulders / coat -->
                <path d="M9 280 Q20 212 58 184 Q84 166 110 170 Q136 166 162 184 Q200 212 211 280 Z"
                      fill="url(#coatF)" stroke="#b9c3c6" stroke-width="1.2"/>
                <!-- inner blouse -->
                <path d="M75 190 Q92 204 110 205 Q128 204 145 190 L134 280 L86 280 Z" fill="${TIE}"/>
                <!-- coat lapels -->
                <path d="M51 198 L82 280 L105 238 L80 184 Z" fill="${COAT_SHADOW}" stroke="#b9c3c6"/>
                <path d="M169 198 L138 280 L115 238 L140 184 Z" fill="${COAT_SHADOW}" stroke="#b9c3c6"/>
                <!-- BMU teal collar pin -->
                <circle cx="93" cy="219" r="2.5" fill="${TIE}"/>
                <!-- name badge -->
                <rect x="145" y="242" width="32" height="14" rx="2" fill="${TIE}"/>
                <text x="161" y="252" text-anchor="middle"
                      font-family="Inter, sans-serif" font-size="8"
                      font-weight="700" fill="#fff">BMU</text>

                <g id="avArmL" transform="translate(0 0)">
                    <path d="M54 196 Q29 225 25 268" fill="none" stroke="url(#coatF)" stroke-width="23" stroke-linecap="round"/>
                    <path d="M25 258 Q34 262 43 259" fill="none" stroke="#eef3f4" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avArmR" transform="translate(0 0)">
                    <path d="M166 196 Q191 225 195 268" fill="none" stroke="url(#coatF)" stroke-width="23" stroke-linecap="round"/>
                    <path d="M195 258 Q186 262 177 259" fill="none" stroke="#eef3f4" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avHandL" transform="translate(29 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinF)"/>
                </g>
                <g id="avHandR" transform="translate(191 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinF)"/>
                </g>
            </g>

            <!-- ============= HEAD (animatable as a unit) ============= -->
            <g id="avHead" transform="translate(0 0) rotate(0 110 130)">
                <!-- neck -->
                <rect x="94" y="178" width="32" height="28" fill="url(#skinF)"/>
                <path d="M94 200 Q110 210 126 200 L126 210 L94 210 Z" fill="${SKIN_F_DARK}"/>

                <!-- earrings -->
                <circle cx="62" cy="138" r="4" fill="#e7c64e" stroke="#a98c1c"/>
                <circle cx="158" cy="138" r="4" fill="#e7c64e" stroke="#a98c1c"/>

                <!-- head outline (oval) -->
                <ellipse cx="110" cy="128" rx="48" ry="58" fill="url(#skinF)"/>

                <!-- head-wrap (gele-style, soft folds) -->
                <path d="M58 115 Q70 55 110 50 Q150 55 162 115 Q155 95 110 92 Q65 95 58 115 Z"
                        fill="url(#wrapF)" stroke="#2a1632" stroke-width="1.2"/>
                <path d="M58 100 Q90 70 130 75 Q150 80 162 110"
                      fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
                <path d="M70 88 Q110 60 150 88" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>

                <!-- ============= BROWS ============= -->
                <g id="avBrows" stroke="${HAIR_EDGE}" stroke-width="3.5" fill="none" stroke-linecap="round">
                    <path id="avBrowL" d="M82 118 Q92 113 102 118"/>
                    <path id="avBrowR" d="M118 118 Q128 113 138 118"/>
                </g>

                <!-- ============= EYES ============= -->
                <g id="avEyes">
                    <ellipse class="eye-white" cx="92"  cy="130" rx="9" ry="7" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <ellipse class="eye-white" cx="128" cy="130" rx="9" ry="7" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <g id="avPupils">
                        <circle id="avIrisL" cx="92"  cy="131" r="5.1" fill="${IRIS_F}" opacity=".96"/>
                        <circle id="avIrisR" cx="128" cy="131" r="5.1" fill="${IRIS_F}" opacity=".96"/>
                        <circle cx="92"  cy="131" r="4.6" fill="${IRIS_F}" opacity=".92"/>
                        <circle cx="128" cy="131" r="4.6" fill="${IRIS_F}" opacity=".92"/>
                        <circle id="avPupilL" cx="92"  cy="131" r="3.4" fill="${HAIR}"/>
                        <circle id="avPupilR" cx="128" cy="131" r="3.4" fill="${HAIR}"/>
                        <circle cx="93"  cy="129.5" r="1" fill="#fff" opacity=".9"/>
                        <circle cx="129" cy="129.5" r="1" fill="#fff" opacity=".9"/>
                    </g>
                    <!-- eyelids — slide down on blink -->
                    <rect id="avLidL" x="83" y="115" width="18" height="0" fill="url(#skinF)"/>
                    <rect id="avLidR" x="119" y="115" width="18" height="0" fill="url(#skinF)"/>
                    <!-- eyelashes (subtle) -->
                    <path d="M83 124 Q92 121 101 124" stroke="${HAIR}" stroke-width="1.5" fill="none"/>
                    <path d="M119 124 Q128 121 137 124" stroke="${HAIR}" stroke-width="1.5" fill="none"/>
                </g>

                <!-- nose -->
                <path d="M110 135 Q108 148 105 152 Q110 156 115 152 Q112 148 110 135 Z"
                      fill="${SKIN_F_DARK}" opacity=".35"/>

                <!-- ============= MOUTH (path-driven) =============
                     Built from four parts so the lip-sync is genuinely
                     visible: dark cavity at the back, off-white teeth
                     strip in front of it, then upper-lip + lower-lip
                     paths on top. The driver code in advisor.js
                     re-computes all four d= attributes each frame; at
                     rest it forms a closed smile, while speaking the
                     upper lip lifts and the lower lip drops to expose
                     the cavity. -->
                <g id="avMouthGroup" transform="translate(110 167)">
                    <!-- back cavity (visible when mouth is open) -->
                    <path id="avMouthCavity"
                          d="M -16 0 Q 0 0 16 0 Q 0 0 -16 0 Z"
                          fill="#2a0d05"/>
                    <!-- teeth strip in front of the cavity -->
                    <path id="avMouthTeeth"
                          d="M -14 -1 Q 0 -1 14 -1 Q 0 -1 -14 -1 Z"
                          fill="#f7ecd9" opacity="0"/>
                    <!-- upper lip -->
                    <path id="avMouthUpper"
                          d="M -16 0 Q -8 -2 0 -2 Q 8 -2 16 0 Q 8 0 0 0 Q -8 0 -16 0 Z"
                          fill="#7a2f29" stroke="#552220" stroke-width=".6"/>
                    <!-- lower lip -->
                    <path id="avMouthLower"
                          d="M -16 0 Q -8 4 0 4 Q 8 4 16 0 Q 8 0 0 0 Q -8 0 -16 0 Z"
                          fill="#8a3a32" stroke="#552220" stroke-width=".6"/>
                    <!-- legacy id retained so older code paths still find it -->
                    <path id="avMouth" d="M -14 0 Q 0 0 14 0" stroke="none" fill="none"/>
                    <path id="avMouthInner" d="M -10 0 Q 0 0 10 0 Z" fill="none" opacity="0"/>
                </g>

                <!-- subtle blush -->
                <ellipse cx="78" cy="148" rx="6" ry="3" fill="#cf6a78" opacity=".25"/>
                <ellipse cx="142" cy="148" rx="6" ry="3" fill="#cf6a78" opacity=".25"/>
            </g>

            <!-- listening halo — JS toggles opacity -->
            <circle id="listenRing" cx="110" cy="130" r="108" fill="none"
                    stroke="#7bdcb5" stroke-width="3" stroke-dasharray="6 8" opacity="0"/>
        </svg>`;
    }

    /** Build the Dr. Tari medical-academic advisor — inspired by the
     *  selected concept: braided hair, academic teal/gold stole and a
     *  subtle stethoscope. Same animation ids as the existing avatars. */
    function medicalAvatarSVG() {
        return `
        <svg id="avatarSvg" width="220" height="280" viewBox="0 0 220 280" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <radialGradient id="bgGlowT" cx="50%" cy="40%" r="60%">
                    <stop offset="0%"  stop-color="#7bdcb5" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="#0f3d3e" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="skinT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#a86f4d"/>
                    <stop offset="100%" stop-color="#7a4a2e"/>
                </linearGradient>
                <linearGradient id="blazerT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#1b2740"/>
                    <stop offset="100%" stop-color="#111827"/>
                </linearGradient>
                <linearGradient id="stoleT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#0b6f73"/>
                    <stop offset="100%" stop-color="#074e55"/>
                </linearGradient>
            </defs>

            <!-- transparent background: no backdrop so presenter avatars crop/export cleanly -->

            <g id="avTorso">
                <path d="M8 280 Q19 211 58 183 Q84 166 110 170 Q136 166 162 183 Q201 211 212 280 Z"
                      fill="url(#blazerT)" stroke="#0b1220" stroke-width="1.2"/>
                <path d="M75 190 Q92 204 110 205 Q128 204 145 190 L134 280 L86 280 Z" fill="#ffffff"/>
                <path d="M69 211 L93 280 L107 234 L94 196 Z" fill="url(#stoleT)" stroke="#d8b657" stroke-width="1.2"/>
                <path d="M151 211 L127 280 L113 234 L126 196 Z" fill="url(#stoleT)" stroke="#d8b657" stroke-width="1.2"/>
                <path d="M86 245 L101 245 M119 245 L134 245" stroke="#d8b657" stroke-width="2" stroke-linecap="round" opacity=".85"/>
                <path d="M78 222 Q59 238 61 256 Q61 271 75 273" fill="none" stroke="#1f2937" stroke-width="2.4"/>
                <path d="M142 222 Q161 238 159 256 Q159 271 145 273" fill="none" stroke="#1f2937" stroke-width="2.4"/>
                <circle cx="75" cy="273" r="4.5" fill="#d8b657" stroke="#6b5a22"/>
                <circle cx="145" cy="273" r="4.5" fill="#d8b657" stroke="#6b5a22"/>
                <g id="avArmL" transform="translate(0 0)">
                    <path d="M54 196 Q29 225 25 268" fill="none" stroke="url(#blazerT)" stroke-width="23" stroke-linecap="round"/>
                    <path d="M25 258 Q34 262 43 259" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avArmR" transform="translate(0 0)">
                    <path d="M166 196 Q191 225 195 268" fill="none" stroke="url(#blazerT)" stroke-width="23" stroke-linecap="round"/>
                    <path d="M195 258 Q186 262 177 259" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avHandL" transform="translate(29 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinT)"/>
                </g>
                <g id="avHandR" transform="translate(191 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinT)"/>
                </g>
            </g>

            <g id="avHead" transform="translate(0 0) rotate(0 110 130)">
                <rect x="94" y="178" width="32" height="28" fill="url(#skinT)"/>
                <path d="M94 200 Q110 210 126 200 L126 210 L94 210 Z" fill="#6b3f27"/>

                <path id="avHair" d="M58 122 Q60 62 108 54 Q157 61 164 122 Q151 91 110 91 Q70 92 58 122 Z"
                      fill="#1b1513" stroke="#0b0705" stroke-width="1.3"/>
                <g stroke="#30231e" stroke-width="3.2" stroke-linecap="round" opacity=".95">
                    <path d="M73 91 Q93 61 121 58"/>
                    <path d="M82 84 Q106 60 137 70"/>
                    <path d="M65 108 Q89 82 125 80"/>
                    <path d="M140 80 Q154 99 154 128"/>
                    <path d="M61 126 Q67 159 82 180"/>
                </g>
                <path id="avHairLine" d="M70 106 Q91 90 110 91 Q132 91 151 106"
                      fill="none" stroke="#080504" stroke-width="2" stroke-opacity=".5"/>

                <ellipse cx="110" cy="130" rx="47" ry="57" fill="url(#skinT)"/>
                <circle cx="62" cy="142" r="4" fill="#e7c64e" stroke="#a98c1c"/>
                <circle cx="158" cy="142" r="4" fill="#e7c64e" stroke="#a98c1c"/>

                <g stroke="#4b2f2a" stroke-width="2.2" fill="none">
                    <rect x="79"  y="121" width="24" height="17" rx="5"/>
                    <rect x="117" y="121" width="24" height="17" rx="5"/>
                    <line x1="103" y1="129" x2="117" y2="129"/>
                </g>

                <g id="avBrows" stroke="#22160f" stroke-width="3.7" fill="none" stroke-linecap="round">
                    <path id="avBrowL" d="M81 118 Q92 113 103 118"/>
                    <path id="avBrowR" d="M117 118 Q128 113 139 118"/>
                </g>

                <g id="avEyes">
                    <ellipse class="eye-white" cx="92"  cy="130" rx="8.5" ry="6.5" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <ellipse class="eye-white" cx="128" cy="130" rx="8.5" ry="6.5" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <g id="avPupils">
                        <circle id="avIrisL" cx="92"  cy="131" r="5.1" fill="${IRIS_F}" opacity=".96"/>
                        <circle id="avIrisR" cx="128" cy="131" r="5.1" fill="${IRIS_F}" opacity=".96"/>
                        <circle id="avPupilL" cx="92"  cy="131" r="3.2" fill="${HAIR}"/>
                        <circle id="avPupilR" cx="128" cy="131" r="3.2" fill="${HAIR}"/>
                        <circle cx="93"  cy="129.5" r="1" fill="#fff" opacity=".9"/>
                        <circle cx="129" cy="129.5" r="1" fill="#fff" opacity=".9"/>
                    </g>
                    <rect id="avLidL" x="83" y="115" width="18" height="0" fill="url(#skinT)"/>
                    <rect id="avLidR" x="119" y="115" width="18" height="0" fill="url(#skinT)"/>
                </g>

                <path d="M110 135 Q108 148 105 152 Q110 156 115 152 Q112 148 110 135 Z"
                      fill="#6b3f27" opacity=".35"/>

                <g id="avMouthGroup" transform="translate(110 168)">
                    <path id="avMouthCavity" d="M -16 0 Q 0 0 16 0 Q 0 0 -16 0 Z" fill="#2a0d05"/>
                    <path id="avMouthTeeth" d="M -14 -1 Q 0 -1 14 -1 Q 0 -1 -14 -1 Z" fill="#f7ecd9" opacity="0"/>
                    <path id="avMouthUpper" d="M -16 0 Q -8 -2 0 -2 Q 8 -2 16 0 Q 8 0 0 0 Q -8 0 -16 0 Z"
                          fill="#7a2f29" stroke="#552220" stroke-width=".6"/>
                    <path id="avMouthLower" d="M -16 0 Q -8 4 0 4 Q 8 4 16 0 Q 8 0 0 0 Q -8 0 -16 0 Z"
                          fill="#8a3a32" stroke="#552220" stroke-width=".6"/>
                    <path id="avMouth" d="M -14 0 Q 0 0 14 0" stroke="none" fill="none"/>
                    <path id="avMouthInner" d="M -10 0 Q 0 0 10 0 Z" fill="none" opacity="0"/>
                </g>
            </g>

            <circle id="listenRing" cx="110" cy="130" r="108" fill="none"
                    stroke="#7bdcb5" stroke-width="3" stroke-dasharray="6 8" opacity="0"/>
        </svg>`;
    }

    /** Build a Nigerian academic male advisor — bowler hat, glasses,
     *  professorly blazer and teal/gold accents. Same animation ids as
     *  every other full avatar. */
    function academicMaleAvatarSVG() {
        return `
        <svg id="avatarSvg" width="220" height="280" viewBox="0 0 220 280" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <radialGradient id="bgGlowA" cx="50%" cy="40%" r="60%">
                    <stop offset="0%"  stop-color="#7bdcb5" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="#0f3d3e" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="skinA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8f5d3c"/>
                    <stop offset="100%" stop-color="#5e3b22"/>
                </linearGradient>
                <linearGradient id="suitA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#222b3f"/>
                    <stop offset="100%" stop-color="#111827"/>
                </linearGradient>
                <linearGradient id="hatA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#26212a"/>
                    <stop offset="100%" stop-color="#111018"/>
                </linearGradient>
            </defs>

            <!-- transparent background: no backdrop so presenter avatars crop/export cleanly -->

            <g id="avTorso">
                <path d="M8 280 Q19 211 58 183 Q84 166 110 170 Q136 166 162 183 Q201 211 212 280 Z"
                      fill="url(#suitA)" stroke="#0b1220" stroke-width="1.2"/>
                <path d="M75 190 Q92 204 110 205 Q128 204 145 190 L134 280 L86 280 Z" fill="#f8fafc"/>
                <path d="M101 211 L110 234 L119 211 Z" fill="#0b6f73"/>
                <rect x="104" y="231" width="12" height="49" rx="2" fill="#0b6f73"/>
                <path d="M50 198 L81 280 L105 238 L80 184 Z" fill="#263247" stroke="#334155"/>
                <path d="M170 198 L139 280 L115 238 L140 184 Z" fill="#263247" stroke="#334155"/>
                <path d="M143 242 h30 v14 h-30 z" fill="#0b6f73" opacity=".9"/>
                <path d="M147 246 h21" stroke="#d8b657" stroke-width="1.5"/>
                <g id="avArmL" transform="translate(0 0)">
                    <path d="M53 195 Q28 224 24 268" fill="none" stroke="#263247" stroke-width="23" stroke-linecap="round"/>
                    <path d="M24 258 Q33 262 42 259" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avArmR" transform="translate(0 0)">
                    <path d="M167 195 Q192 224 196 268" fill="none" stroke="#263247" stroke-width="23" stroke-linecap="round"/>
                    <path d="M196 258 Q187 262 178 259" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avHandL" transform="translate(28 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinA)"/>
                </g>
                <g id="avHandR" transform="translate(192 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinA)"/>
                </g>
            </g>

            <g id="avHead" transform="translate(0 0) rotate(0 110 130)">
                <rect x="94" y="178" width="32" height="28" fill="url(#skinA)"/>
                <path d="M94 200 Q110 210 126 200 L126 210 L94 210 Z" fill="#4d2f1d"/>

                <ellipse cx="62" cy="138" rx="6" ry="9" fill="url(#skinA)"/>
                <ellipse cx="158" cy="138" rx="6" ry="9" fill="url(#skinA)"/>
                <ellipse cx="110" cy="128" rx="46" ry="56" fill="url(#skinA)"/>

                <path id="avHair" d="M60 109 Q71 76 110 73 Q149 76 160 109 Q145 119 110 119 Q75 119 60 109 Z"
                      fill="url(#hatA)" stroke="#0c0a0f" stroke-width="1.4"/>
                <path id="avHairLine" d="M67 108 Q88 114 110 114 Q132 114 153 108"
                      fill="none" stroke="#0c0a0f" stroke-opacity=".85" stroke-width="2.2"/>
                <path d="M64 101 Q74 71 110 68 Q146 71 156 101 Q145 111 110 112 Q75 111 64 101 Z"
                      fill="url(#hatA)" stroke="#0c0a0f" stroke-width="1.5"/>
                <ellipse cx="110" cy="72" rx="39" ry="19" fill="url(#hatA)" stroke="#0c0a0f" stroke-width="1.5"/>
                <path d="M57 106 Q75 98 110 99 Q145 98 163 106 Q150 116 110 117 Q70 116 57 106 Z"
                      fill="#15121a" stroke="#0c0a0f" stroke-width="1.4"/>
                <path d="M76 103 Q110 112 144 103" fill="none" stroke="#d8b657" stroke-width="2.1" opacity=".92"/>
                <path d="M82 96 Q110 104 138 96" fill="none" stroke="#0b6f73" stroke-width="2.5" opacity=".95"/>

                <g id="avBrows" stroke="${HAIR_MALE}" stroke-width="4.2" fill="none" stroke-linecap="round">
                    <path id="avBrowL" d="M78 119 Q90 114 102 117"/>
                    <path id="avBrowR" d="M118 117 Q130 114 142 119"/>
                </g>

                <g id="avEyes">
                    <ellipse class="eye-white" cx="89"  cy="129" rx="8.4" ry="5.1" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <ellipse class="eye-white" cx="131" cy="129" rx="8.4" ry="5.1" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <g id="avPupils">
                        <circle id="avIrisL" cx="89"  cy="129" r="4.5" fill="${IRIS_M}" opacity=".98"/>
                        <circle id="avIrisR" cx="131" cy="129" r="4.5" fill="${IRIS_M}" opacity=".98"/>
                        <circle id="avPupilL" cx="89"  cy="129" r="2.8" fill="${HAIR}"/>
                        <circle id="avPupilR" cx="131" cy="129" r="2.8" fill="${HAIR}"/>
                        <circle cx="90"  cy="127.4" r=".85" fill="#fff" opacity=".9"/>
                        <circle cx="132" cy="127.4" r=".85" fill="#fff" opacity=".9"/>
                    </g>
                    <rect id="avLidL" x="81" y="116" width="16" height="0" fill="url(#skinA)"/>
                    <rect id="avLidR" x="123" y="116" width="16" height="0" fill="url(#skinA)"/>
                </g>

                <path d="M111 134 Q106 148 102 154 Q110 160 119 154 Q114 148 111 134 Z"
                      fill="#4d2f1d" opacity=".38"/>
                <path d="M91 159 Q102 154 110 160 Q118 154 130 159 Q122 166 110 166 Q99 166 91 159 Z"
                      fill="#21130c" opacity=".9"/>

                <g id="avMouthGroup" transform="translate(110 170)">
                    <path id="avMouthCavity" d="M -15 0 Q 0 0 15 0 Q 0 0 -15 0 Z" fill="#2a0d05"/>
                    <path id="avMouthTeeth" d="M -13 -1 Q 0 -1 13 -1 Q 0 -1 -13 -1 Z" fill="#f7ecd9" opacity="0"/>
                    <path id="avMouthUpper" d="M -15 0 Q -7 -2 0 -2 Q 7 -2 15 0 Q 7 0 0 0 Q -7 0 -15 0 Z"
                          fill="#5a2a1f" stroke="#3a1f12" stroke-width=".6"/>
                    <path id="avMouthLower" d="M -15 0 Q -7 4 0 4 Q 7 4 15 0 Q 7 0 0 0 Q -7 0 -15 0 Z"
                          fill="#6a3225" stroke="#3a1f12" stroke-width=".6"/>
                    <path id="avMouth" d="M -13 0 Q 0 0 13 0" stroke="none" fill="none"/>
                    <path id="avMouthInner" d="M -10 0 Q 0 0 10 0 Z" fill="none" opacity="0"/>
                </g>
            </g>

            <circle id="listenRing" cx="110" cy="130" r="108" fill="none"
                    stroke="#7bdcb5" stroke-width="3" stroke-dasharray="6 8" opacity="0"/>
        </svg>`;
    }

    /** Build the male advisor — short hair, glasses, white coat over teal
     *  shirt. Same group ids so the same driver code animates it. */
    function maleAvatarSVG() {
        return `
        <svg id="avatarSvg" width="220" height="280" viewBox="0 0 220 280" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <radialGradient id="bgGlowM" cx="50%" cy="40%" r="60%">
                    <stop offset="0%"  stop-color="#7bdcb5" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="#0f3d3e" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="skinM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${SKIN_M}"/>
                    <stop offset="100%" stop-color="${SKIN_M_DARK}"/>
                </linearGradient>
                <linearGradient id="coatM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${COAT}"/>
                    <stop offset="100%" stop-color="${COAT_SHADOW}"/>
                </linearGradient>
            </defs>

            <!-- transparent background: no backdrop so presenter avatars crop/export cleanly -->

            <g id="avTorso">
                <!-- shoulders / coat -->
                <path d="M9 280 Q20 212 58 184 Q84 166 110 170 Q136 166 162 184 Q200 212 211 280 Z"
                      fill="url(#coatM)" stroke="#b9c3c6" stroke-width="1.2"/>
                <!-- shirt + tie -->
                <path d="M75 190 Q92 204 110 205 Q128 204 145 190 L134 280 L86 280 Z" fill="${TIE}"/>
                <rect x="103" y="216" width="14" height="50" fill="${SUIT}" rx="2"/>
                <polygon points="103,216 110,232 117,216" fill="${SUIT}"/>
                <!-- coat lapels -->
                <path d="M51 198 L82 280 L105 238 L80 184 Z" fill="${COAT_SHADOW}" stroke="#b9c3c6"/>
                <path d="M169 198 L138 280 L115 238 L140 184 Z" fill="${COAT_SHADOW}" stroke="#b9c3c6"/>
                <!-- BMU pocket badge -->
                <rect x="145" y="242" width="32" height="14" rx="2" fill="${TIE}"/>
                <text x="161" y="252" text-anchor="middle"
                      font-family="Inter, sans-serif" font-size="8"
                      font-weight="700" fill="#fff">BMU</text>

                <g id="avArmL" transform="translate(0 0)">
                    <path d="M54 196 Q29 225 25 268" fill="none" stroke="url(#coatM)" stroke-width="23" stroke-linecap="round"/>
                    <path d="M25 258 Q34 262 43 259" fill="none" stroke="#eef3f4" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avArmR" transform="translate(0 0)">
                    <path d="M166 196 Q191 225 195 268" fill="none" stroke="url(#coatM)" stroke-width="23" stroke-linecap="round"/>
                    <path d="M195 258 Q186 262 177 259" fill="none" stroke="#eef3f4" stroke-width="8" stroke-linecap="round"/>
                </g>
                <g id="avHandL" transform="translate(29 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinM)"/>
                </g>
                <g id="avHandR" transform="translate(191 268) rotate(0)">
                    <ellipse cx="0" cy="0" rx="11" ry="7" fill="url(#skinM)"/>
                </g>
            </g>

            <g id="avHead" transform="translate(0 0) rotate(0 110 130)">
                <!-- neck -->
                <rect x="94" y="178" width="32" height="28" fill="url(#skinM)"/>
                <path d="M94 200 Q110 210 126 200 L126 210 L94 210 Z" fill="${SKIN_M_DARK}"/>

                <!-- ears -->
                <ellipse cx="62" cy="138" rx="6" ry="9" fill="url(#skinM)"/>
                <ellipse cx="158" cy="138" rx="6" ry="9" fill="url(#skinM)"/>

                <!-- head outline -->
                <ellipse cx="110" cy="128" rx="46" ry="56" fill="url(#skinM)"/>

                <!-- short hair (low fade with side part) -->
                    <path id="avHair" d="M60 112 Q70 58 110 56 Q150 58 160 112 Q152 94 110 92 Q68 94 60 112 Z"
                        fill="${HAIR_MALE}" stroke="${HAIR_EDGE}" stroke-width="1.4"/>
                        <path id="avHairLine" d="M66 100 Q88 84 110 86 Q132 88 154 100"
                        fill="none" stroke="#000" stroke-opacity=".38" stroke-width="2.4"/>

                <!-- glasses frames -->
                <g stroke="${SCRUB}" stroke-width="2.4" fill="none">
                    <rect x="78"  y="120" width="20" height="16" rx="3"/>
                    <rect x="122" y="120" width="20" height="16" rx="3"/>
                    <line x1="98" y1="128" x2="122" y2="128"/>
                </g>

                <!-- BROWS -->
                <g id="avBrows" stroke="${HAIR_MALE}" stroke-width="4.4" fill="none" stroke-linecap="round">
                    <path id="avBrowL" d="M80 116 Q90 112 100 116"/>
                    <path id="avBrowR" d="M120 116 Q130 112 140 116"/>
                </g>

                <!-- EYES -->
                <g id="avEyes">
                    <ellipse class="eye-white" cx="90"  cy="128" rx="7" ry="5.5" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <ellipse class="eye-white" cx="130" cy="128" rx="7" ry="5.5" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <g id="avPupils">
                        <circle id="avIrisL" cx="90"  cy="129" r="4.7" fill="${IRIS_M}" opacity=".98"/>
                        <circle id="avIrisR" cx="130" cy="129" r="4.7" fill="${IRIS_M}" opacity=".98"/>
                        <circle cx="90"  cy="129" r="4.1" fill="${IRIS_M}" opacity=".94"/>
                        <circle cx="130" cy="129" r="4.1" fill="${IRIS_M}" opacity=".94"/>
                        <circle id="avPupilL" cx="90"  cy="129" r="3" fill="${HAIR}"/>
                        <circle id="avPupilR" cx="130" cy="129" r="3" fill="${HAIR}"/>
                        <circle cx="91"  cy="127.5" r=".9" fill="#fff" opacity=".9"/>
                        <circle cx="131" cy="127.5" r=".9" fill="#fff" opacity=".9"/>
                    </g>
                    <rect id="avLidL" x="83" y="115" width="14" height="0" fill="url(#skinM)"/>
                    <rect id="avLidR" x="123" y="115" width="14" height="0" fill="url(#skinM)"/>
                </g>

                <!-- nose -->
                <path d="M110 134 Q107 150 104 154 Q110 158 116 154 Q113 150 110 134 Z"
                      fill="${SKIN_M_DARK}" opacity=".4"/>

                <!-- moustache (subtle) -->
                <path d="M96 162 Q110 158 124 162" stroke="${HAIR}" stroke-width="2" fill="none"/>

                <!-- ============= MOUTH (path-driven) =============
                     Same shape as the female avatar's mouth so the
                     driver code in advisor.js works for both. -->
                <g id="avMouthGroup" transform="translate(110 170)">
                    <path id="avMouthCavity"
                          d="M -15 0 Q 0 0 15 0 Q 0 0 -15 0 Z"
                          fill="#2a0d05"/>
                    <path id="avMouthTeeth"
                          d="M -13 -1 Q 0 -1 13 -1 Q 0 -1 -13 -1 Z"
                          fill="#f7ecd9" opacity="0"/>
                    <path id="avMouthUpper"
                          d="M -15 0 Q -7 -2 0 -2 Q 7 -2 15 0 Q 7 0 0 0 Q -7 0 -15 0 Z"
                          fill="#5a2a1f" stroke="#3a1f12" stroke-width=".6"/>
                    <path id="avMouthLower"
                          d="M -15 0 Q -7 4 0 4 Q 7 4 15 0 Q 7 0 0 0 Q -7 0 -15 0 Z"
                          fill="#6a3225" stroke="#3a1f12" stroke-width=".6"/>
                    <path id="avMouth" d="M -13 0 Q 0 0 13 0" stroke="none" fill="none"/>
                    <path id="avMouthInner" d="M -10 0 Q 0 0 10 0 Z" fill="none" opacity="0"/>
                </g>

                <!-- chin shadow -->
                <ellipse cx="110" cy="180" rx="22" ry="4" fill="${SKIN_M_DARK}" opacity=".25"/>
            </g>

            <circle id="listenRing" cx="110" cy="130" r="108" fill="none"
                    stroke="#7bdcb5" stroke-width="3" stroke-dasharray="6 8" opacity="0"/>
        </svg>`;
    }

    function gesturingPresenterAvatarSVG() {
        return `
        <svg id="avatarSvg" width="220" height="280" viewBox="0 0 220 280" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <radialGradient id="bgGlowG" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stop-color="#7bdcb5" stop-opacity="0.16"/>
                    <stop offset="100%" stop-color="#0f3d3e" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#9b6745"/>
                    <stop offset="100%" stop-color="#6d442b"/>
                </linearGradient>
                <linearGradient id="jacketG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#223048"/>
                    <stop offset="100%" stop-color="#101827"/>
                </linearGradient>
                <linearGradient id="shirtG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f8fafc"/>
                    <stop offset="100%" stop-color="#dfe7e9"/>
                </linearGradient>
            </defs>

            <!-- transparent background: no backdrop so presenter avatars crop/export cleanly -->

            <g id="avTorso">
                <path d="M8 280 Q19 210 60 181 Q84 166 110 169 Q136 166 160 181 Q201 210 212 280 Z"
                      fill="url(#jacketG)" stroke="#0b1220" stroke-width="1.3"/>
                <path d="M74 186 Q92 202 110 203 Q128 202 146 186 L133 280 L87 280 Z"
                      fill="url(#shirtG)"/>
                <path d="M100 207 L110 234 L120 207 Z" fill="#1fae9f"/>
                <rect x="104" y="231" width="12" height="49" rx="2.5" fill="#147a73"/>
                <path d="M50 194 L78 280 L105 239 L78 179 Z" fill="#29384f" stroke="#334155"/>
                <path d="M170 194 L142 280 L115 239 L142 179 Z" fill="#29384f" stroke="#334155"/>

                <g id="avArmL" transform="translate(0 0)">
                    <path d="M53 195 Q27 224 24 268" fill="none" stroke="#29384f" stroke-width="23" stroke-linecap="round"/>
                    <path d="M25 257 Q33 261 42 259" fill="none" stroke="#dfe7e9" stroke-width="9" stroke-linecap="round"/>
                </g>
                <g id="avArmR" transform="translate(0 0)">
                    <path d="M167 195 Q193 224 196 268" fill="none" stroke="#29384f" stroke-width="23" stroke-linecap="round"/>
                    <path d="M195 257 Q187 261 178 259" fill="none" stroke="#dfe7e9" stroke-width="9" stroke-linecap="round"/>
                </g>
                <g id="avHandL" transform="translate(28 267) rotate(0)">
                    <ellipse cx="0" cy="0" rx="12" ry="8" fill="url(#skinG)"/>
                    <path d="M-7 1 Q0 6 8 1" fill="none" stroke="#5e3b22" stroke-width="1" opacity=".35"/>
                </g>
                <g id="avHandR" transform="translate(192 267) rotate(0)">
                    <ellipse cx="0" cy="0" rx="12" ry="8" fill="url(#skinG)"/>
                    <path d="M-8 1 Q0 6 7 1" fill="none" stroke="#5e3b22" stroke-width="1" opacity=".35"/>
                </g>
            </g>

            <g id="avHead" transform="translate(0 0) rotate(0 110 130)">
                <rect x="95" y="169" width="30" height="28" fill="url(#skinG)"/>
                <path d="M95 190 Q110 199 125 190 L125 202 L95 202 Z" fill="#5e3b22"/>
                <ellipse cx="66" cy="135" rx="5" ry="8" fill="url(#skinG)"/>
                <ellipse cx="154" cy="135" rx="5" ry="8" fill="url(#skinG)"/>
                <ellipse cx="110" cy="126" rx="41" ry="50" fill="url(#skinG)"/>
                <path d="M65 111 Q71 67 110 63 Q149 67 155 111 Q144 97 110 95 Q76 97 65 111 Z"
                      fill="${HAIR_MALE}" stroke="${HAIR_EDGE}" stroke-width="1.4"/>
                <path d="M72 101 Q91 86 112 87 Q133 88 149 101"
                      fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2.4"/>

                <g id="avBrows" stroke="${HAIR_MALE}" stroke-width="4" fill="none" stroke-linecap="round">
                    <path id="avBrowL" d="M82 116 Q92 112 102 116"/>
                    <path id="avBrowR" d="M118 116 Q128 112 138 116"/>
                </g>

                <g id="avEyes">
                    <ellipse cx="91" cy="128" rx="7.2" ry="5.2" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <ellipse cx="129" cy="128" rx="7.2" ry="5.2" fill="${EYE_WHITE}" stroke="#b79d84" stroke-width=".7"/>
                    <g id="avPupils">
                        <circle cx="91" cy="129" r="4" fill="${IRIS_M}"/>
                        <circle cx="129" cy="129" r="4" fill="${IRIS_M}"/>
                        <circle cx="91" cy="129" r="2.5" fill="${HAIR}"/>
                        <circle cx="129" cy="129" r="2.5" fill="${HAIR}"/>
                        <circle cx="92" cy="127.5" r=".8" fill="#fff" opacity=".9"/>
                        <circle cx="130" cy="127.5" r=".8" fill="#fff" opacity=".9"/>
                    </g>
                    <rect id="avLidL" x="82" y="116" width="16" height="0" fill="url(#skinG)"/>
                    <rect id="avLidR" x="122" y="116" width="16" height="0" fill="url(#skinG)"/>
                </g>

                <path d="M110 132 Q108 146 105 150 Q110 154 115 150 Q112 146 110 132 Z"
                      fill="#5e3b22" opacity=".38"/>
                <g id="avMouthGroup" transform="translate(110 164)">
                    <path id="avMouthCavity" d="M -15 0 Q 0 0 15 0 Q 0 0 -15 0 Z" fill="#2a0d05"/>
                    <path id="avMouthTeeth" d="M -13 -1 Q 0 -1 13 -1 Q 0 -1 -13 -1 Z" fill="#f7ecd9" opacity="0"/>
                    <path id="avMouthUpper" d="M -15 0 Q -7 -2 0 -2 Q 7 -2 15 0 Q 7 0 0 0 Q -7 0 -15 0 Z"
                          fill="#5a2a1f" stroke="#3a1f12" stroke-width=".6"/>
                    <path id="avMouthLower" d="M -15 0 Q -7 4 0 4 Q 7 4 15 0 Q 7 0 0 0 Q -7 0 -15 0 Z"
                          fill="#6a3225" stroke="#3a1f12" stroke-width=".6"/>
                    <path id="avMouth" d="M -13 0 Q 0 0 13 0" stroke="none" fill="none"/>
                    <path id="avMouthInner" d="M -10 0 Q 0 0 10 0 Z" fill="none" opacity="0"/>
                </g>
                <ellipse cx="110" cy="174" rx="19" ry="3.5" fill="#5e3b22" opacity=".23"/>
            </g>

            <circle id="listenRing" cx="110" cy="130" r="108" fill="none"
                    stroke="#7bdcb5" stroke-width="3" stroke-dasharray="6 8" opacity="0"/>
        </svg>`;
    }

    const PRESETS = Object.freeze({
        female: Object.freeze({
            id: 'female',
            label: 'Female Presenter',
            gender: 'female',
            kind: 'presenter-avatar',
            build: femaleAvatarSVG
        }),
        male: Object.freeze({
            id: 'male',
            label: 'Male Presenter',
            gender: 'male',
            kind: 'presenter-avatar',
            build: maleAvatarSVG
        }),
        'gesturing-presenter': Object.freeze({
            id: 'gesturing-presenter',
            label: 'Gesturing Presenter',
            gender: 'male',
            kind: 'presenter-avatar',
            build: gesturingPresenterAvatarSVG
        }),
        medical: Object.freeze({
            id: 'medical',
            label: 'Medical Academic Presenter',
            gender: 'female',
            kind: 'presenter-avatar',
            build: medicalAvatarSVG
        }),
        'academic-male': Object.freeze({
            id: 'academic-male',
            label: 'Academic Male Presenter',
            gender: 'male',
            kind: 'presenter-avatar',
            build: academicMaleAvatarSVG
        })
    });

    const ANIMATABLE_ROLES = Object.freeze([
        'avatarSvg',
        'avTorso',
        'avHead',
        'avEyes',
        'avPupils',
        'avLidL',
        'avLidR',
        'avBrows',
        'avBrowL',
        'avBrowR',
        'avMouthGroup',
        'avMouthCavity',
        'avMouthTeeth',
        'avMouthUpper',
        'avMouthLower',
        'avMouth',
        'avMouthInner',
        'avArmL',
        'avArmR',
        'avHandL',
        'avHandR',
        'listenRing',
        'thumbEyes',
        'thumbEyeFlashL',
        'thumbEyeFlashR',
        'thumbMouth'
    ]);
    const ANIMATABLE_ROLE_SET = new Set(ANIMATABLE_ROLES);

    const PRESENTER_PROPERTIES = Object.freeze({
        blink: Object.freeze({ min: 0, max: 1, defaultValue: 0 }),
        gazeX: Object.freeze({ min: -8, max: 8, defaultValue: 0 }),
        gazeY: Object.freeze({ min: -5, max: 5, defaultValue: 0 }),
        browRaise: Object.freeze({ min: -6, max: 6, defaultValue: 0 }),
        mouthOpen: Object.freeze({ min: 0, max: 1, defaultValue: 0 }),
        smile: Object.freeze({ min: -1, max: 1, defaultValue: 0.25 }),
        headNod: Object.freeze({ min: -8, max: 8, defaultValue: 0 }),
        headTilt: Object.freeze({ min: -8, max: 8, defaultValue: 0 }),
        torsoSway: Object.freeze({ min: -5, max: 5, defaultValue: 0 }),
        handEmphasis: Object.freeze({ min: 0, max: 1, defaultValue: 0 }),
        listening: Object.freeze({ min: 0, max: 1, defaultValue: 0 })
    });

    const PRESENTER_TIMELINES = Object.freeze({
        blink: Object.freeze([
            Object.freeze({ t: 0, blink: 0 }),
            Object.freeze({ t: 0.08, blink: 1 }),
            Object.freeze({ t: 0.16, blink: 0 })
        ]),
        listening: Object.freeze([
            Object.freeze({ t: 0, listening: 0.15, headNod: 0 }),
            Object.freeze({ t: 0.5, listening: 0.65, headNod: 2 }),
            Object.freeze({ t: 1, listening: 0.15, headNod: 0 })
        ]),
        speaking: Object.freeze([
            Object.freeze({ t: 0, mouthOpen: 0.08, smile: 0.24, browRaise: 0, headNod: 0 }),
            Object.freeze({ t: 0.22, mouthOpen: 0.52, smile: 0.20, browRaise: 0.45, headNod: 0.35 }),
            Object.freeze({ t: 0.48, mouthOpen: 0.18, smile: 0.27, browRaise: 0.1, headNod: -0.15 }),
            Object.freeze({ t: 0.72, mouthOpen: 0.58, smile: 0.21, browRaise: 0.35, headNod: 0.25 }),
            Object.freeze({ t: 1, mouthOpen: 0.08, smile: 0.24, browRaise: 0, headNod: 0 })
        ])
    });

    let avatarInstanceCounter = 0;

    function normalizePresetId(presetId) {
        const key = String(presetId || 'female').trim().toLowerCase();
        if (key === 'doctor' || key === 'academic-medical') return 'medical';
        if (key === 'academic' || key === 'professor' || key === 'academicmale') return 'academic-male';
        if (key === 'gesture' || key === 'gesturing' || key === 'hands' || key === 'presenter-hands') return 'gesturing-presenter';
        if (key === 'man') return 'male';
        if (key === 'woman') return 'female';
        return PRESETS[key] ? key : 'female';
    }

    function makeInstanceId(presetId, requested) {
        const raw = requested || `svg-avatar-${presetId}-${++avatarInstanceCounter}`;
        return String(raw)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '') || `svg-avatar-${++avatarInstanceCounter}`;
    }

    function namespaceSvg(svg, instanceId, presetId, options = {}) {
        const idMap = {};
        let output = String(svg || '').replace(/\bid="([^"]+)"/g, (match, id) => {
            const namespaced = `${instanceId}-${id}`;
            idMap[id] = namespaced;
            const role = ANIMATABLE_ROLE_SET.has(id) ? ` data-avatar-role="${id}"` : '';
            return `id="${namespaced}"${role}`;
        });

        Object.entries(idMap).forEach(([oldId, newId]) => {
            const escapedOldId = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            output = output
                .replace(new RegExp(`url\\(#${escapedOldId}\\)`, 'g'), `url(#${newId})`)
                .replace(new RegExp(`href="#${escapedOldId}"`, 'g'), `href="#${newId}"`)
                .replace(new RegExp(`xlink:href="#${escapedOldId}"`, 'g'), `xlink:href="#${newId}"`);
        });

        const label = options.label || PRESETS[presetId]?.label || presetId;
        output = output.replace(
            /<svg\b/,
            `<svg data-avatar-instance="${instanceId}" data-avatar-preset="${presetId}" data-avatar-kind="presenter-avatar" aria-label="${String(label).replace(/"/g, '&quot;')}"`
        );
        return { svg: output, idMap };
    }

    function roleSelectors(idMap) {
        const selectors = {};
        ANIMATABLE_ROLES.forEach(role => {
            selectors[role] = idMap?.[role] ? `#${idMap[role]}` : `[data-avatar-role="${role}"]`;
        });
        return selectors;
    }

    function buildFullAvatar(presetId, options = {}) {
        const normalized = normalizePresetId(presetId);
        const preset = PRESETS[normalized];
        const rawSvg = preset.build();
        const shouldNamespace = options.namespace !== false;
        const instanceId = shouldNamespace
            ? makeInstanceId(normalized, options.instanceId || options.id)
            : '';
        const namespaced = shouldNamespace
            ? namespaceSvg(rawSvg, instanceId, normalized, options)
            : { svg: rawSvg, idMap: {} };
        return {
            presetId: normalized,
            label: preset.label,
            gender: preset.gender,
            kind: preset.kind,
            instanceId,
            svg: namespaced.svg,
            idMap: namespaced.idMap,
            selectors: roleSelectors(namespaced.idMap),
            roles: ANIMATABLE_ROLES.slice(),
            transparentBackground: true,
            vectorSource: true,
            cropSafe: true,
            presenterProperties: PRESENTER_PROPERTIES,
            animations: PRESENTER_TIMELINES
        };
    }

    function clamp(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.max(min, Math.min(max, number));
    }

    function setPath(el, path) {
        if (el && path) el.setAttribute('d', path);
    }

    function applyPresenterState(root, state = {}) {
        if (!root || typeof root.querySelector !== 'function') return null;
        const byRole = role => root.querySelector(`[data-avatar-role="${role}"]`) || root.querySelector(`#${role}`);
        const head = byRole('avHead');
        const pupils = byRole('avPupils');
        const lidL = byRole('avLidL');
        const lidR = byRole('avLidR');
        const brows = byRole('avBrows');
        const torso = byRole('avTorso');
        const armL = byRole('avArmL');
        const armR = byRole('avArmR');
        const handL = byRole('avHandL');
        const handR = byRole('avHandR');
        const ring = byRole('listenRing');

        const blink = clamp(state.blink ?? 0, 0, 1);
        const gazeX = clamp(state.gazeX ?? 0, -8, 8);
        const gazeY = clamp(state.gazeY ?? 0, -5, 5);
        const browRaise = clamp(state.browRaise ?? 0, -6, 6);
        const mouthOpen = clamp(state.mouthOpen ?? 0, 0, 1);
        const smile = clamp(state.smile ?? 0.25, -1, 1);
        const headNod = clamp(state.headNod ?? 0, -8, 8);
        const headTilt = clamp(state.headTilt ?? 0, -8, 8);
        const torsoSway = clamp(state.torsoSway ?? 0, -5, 5);
        const handEmphasis = clamp(state.handEmphasis ?? 0, 0, 1);
        const listening = clamp(state.listening ?? 0, 0, 1);

        if (head) head.setAttribute('transform', `translate(0 ${headNod}) rotate(${headTilt} 110 130)`);
        if (pupils) pupils.setAttribute('transform', `translate(${gazeX} ${gazeY})`);
        if (lidL) lidL.setAttribute('height', String(Math.round(blink * 17)));
        if (lidR) lidR.setAttribute('height', String(Math.round(blink * 17)));
        if (brows) brows.setAttribute('transform', `translate(0 ${-browRaise})`);
        if (torso) torso.setAttribute('transform', `translate(0 0) rotate(${torsoSway} 110 238)`);
        if (armL) armL.setAttribute('transform', `translate(${-handEmphasis * 4} ${-handEmphasis * 5}) rotate(${-handEmphasis * 4.5} 53 226)`);
        if (armR) armR.setAttribute('transform', `translate(${handEmphasis * 4} ${-handEmphasis * 5}) rotate(${handEmphasis * 4.5} 167 226)`);
        if (handL) handL.setAttribute('transform', `translate(${29 - handEmphasis * 7} ${268 - handEmphasis * 9}) rotate(${-handEmphasis * 12})`);
        if (handR) handR.setAttribute('transform', `translate(${191 + handEmphasis * 7} ${268 - handEmphasis * 9}) rotate(${handEmphasis * 12})`);
        if (ring) ring.setAttribute('opacity', String(listening));

        const open = mouthOpen * 11;
        const curve = smile * 5;
        setPath(byRole('avMouthCavity'), `M -16 ${-open * 0.25} Q 0 ${-open} 16 ${-open * 0.25} Q 0 ${open} -16 ${-open * 0.25} Z`);
        setPath(byRole('avMouthTeeth'), `M -13 ${-open * 0.35} Q 0 ${-open * 0.65} 13 ${-open * 0.35} Q 0 ${-open * 0.1} -13 ${-open * 0.35} Z`);
        setPath(byRole('avMouthUpper'), `M -16 0 Q -8 ${-2 - open * 0.25} 0 ${-2 - open * 0.32} Q 8 ${-2 - open * 0.25} 16 0 Q 8 ${curve * 0.2} 0 ${curve * 0.15} Q -8 ${curve * 0.2} -16 0 Z`);
        setPath(byRole('avMouthLower'), `M -16 0 Q -8 ${4 + open * 0.55 + curve} 0 ${4 + open * 0.65 + curve} Q 8 ${4 + open * 0.55 + curve} 16 0 Q 8 ${curve * 0.1} 0 ${curve * 0.05} Q -8 ${curve * 0.1} -16 0 Z`);
        setPath(byRole('avMouth'), `M -14 0 Q 0 ${curve + open * 0.35} 14 0`);
        const inner = byRole('avMouthInner');
        if (inner) inner.setAttribute('opacity', String(mouthOpen > 0.2 ? Math.min(0.9, mouthOpen) : 0));

        return {
            blink,
            gazeX,
            gazeY,
            browRaise,
            mouthOpen,
            smile,
            headNod,
            headTilt,
            torsoSway,
            handEmphasis,
            listening
        };
    }

    function thumbnailSvg(presetId) {
        const normalized = normalizePresetId(presetId);
        const gender = PRESETS[normalized]?.gender || normalized;
        const skin = gender === 'male' ? SKIN_M : SKIN_F;
            if (normalized === 'male') {
                return `
                <svg width="110" height="110" viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="thumbBgM" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#143638"/>
                            <stop offset="100%" stop-color="#0a2528"/>
                        </linearGradient>
                    </defs>
                    <!-- transparent thumbnail background -->
                    <!-- coat -->
                    <path d="M10 110 Q55 75 100 110 L100 110 Z" fill="${COAT}"/>
                    <path d="M40 95 L55 110 L70 95 Z" fill="${TIE}"/>
                    <!-- neck + head -->
                    <rect x="48" y="68" width="14" height="14" fill="${skin}"/>
                    <ellipse cx="55" cy="52" rx="22" ry="26" fill="${skin}"/>
                    <!-- hair -->
                    <path d="M33 44 Q38 20 55 18 Q72 20 77 44 Q72 33 55 32 Q38 33 33 44 Z" fill="${HAIR}"/>
                    <!-- glasses -->
                    <g stroke="${SCRUB}" stroke-width="1.6" fill="none">
                        <rect x="38" y="48" width="11" height="9" rx="2"/>
                        <rect x="61" y="48" width="11" height="9" rx="2"/>
                        <line x1="49" y1="52" x2="61" y2="52"/>
                    </g>
                    <!-- eyes -->
                    <g id="thumbEyes">
                        <circle id="thumbEyeFlashL" class="thumb-eye-flash" cx="44" cy="53" r="4.8" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.45" opacity="0"/>
                        <circle id="thumbEyeFlashR" class="thumb-eye-flash" cx="66" cy="53" r="4.8" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.45" opacity="0"/>
                        <circle cx="44" cy="53" r="1.5" fill="${HAIR}"/>
                        <circle cx="66" cy="53" r="1.5" fill="${HAIR}"/>
                    </g>
                    <!-- mouth (smile) -->
                    <path id="thumbMouth" d="M46 64 Q55 68 64 64" fill="none" stroke="#3a1f12" stroke-width="1.6" stroke-linecap="round"/>
                </svg>`;
            }
            if (normalized === 'medical') {
                return `
                <svg width="110" height="110" viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="thumbBgT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#12393f"/>
                            <stop offset="100%" stop-color="#0a2528"/>
                        </linearGradient>
                    </defs>
                    <!-- transparent thumbnail background -->
                    <path d="M10 110 Q55 76 100 110 L100 110 Z" fill="#1b2740"/>
                    <path d="M39 94 L50 110 L55 92 L48 83 Z" fill="#0b6f73" stroke="#d8b657" stroke-width=".8"/>
                    <path d="M71 94 L60 110 L55 92 L62 83 Z" fill="#0b6f73" stroke="#d8b657" stroke-width=".8"/>
                    <rect x="48" y="69" width="14" height="14" fill="${SKIN_F}"/>
                    <path d="M31 48 Q35 19 55 15 Q77 18 80 48 Q72 31 55 31 Q38 31 31 48 Z" fill="#1b1513"/>
                    <g stroke="#30231e" stroke-width="2" stroke-linecap="round">
                        <path d="M37 41 Q48 21 64 18"/>
                        <path d="M45 35 Q59 20 73 29"/>
                        <path d="M32 55 Q42 72 47 80"/>
                    </g>
                    <ellipse cx="55" cy="53" rx="22" ry="26" fill="${SKIN_F}"/>
                    <g stroke="#4b2f2a" stroke-width="1.4" fill="none">
                        <rect x="38" y="49" width="12" height="9" rx="2"/>
                        <rect x="60" y="49" width="12" height="9" rx="2"/>
                        <line x1="50" y1="53" x2="60" y2="53"/>
                    </g>
                    <g id="thumbEyes">
                        <circle id="thumbEyeFlashL" class="thumb-eye-flash" cx="45" cy="54" r="5" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.55" opacity="0"/>
                        <circle id="thumbEyeFlashR" class="thumb-eye-flash" cx="65" cy="54" r="5" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.55" opacity="0"/>
                        <circle cx="45" cy="54" r="1.7" fill="${HAIR}"/>
                        <circle cx="65" cy="54" r="1.7" fill="${HAIR}"/>
                    </g>
                    <path id="thumbMouth" d="M46 65 Q55 69 64 65" fill="none" stroke="#552220" stroke-width="1.8" stroke-linecap="round"/>
                    <path d="M33 84 Q28 96 39 100 M77 84 Q82 96 71 100" fill="none" stroke="#1f2937" stroke-width="1.5"/>
                </svg>`;
            }
            if (normalized === 'gesturing-presenter') {
                return `
                <svg width="110" height="110" viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="thumbBgG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#143638"/>
                            <stop offset="100%" stop-color="#0a2528"/>
                        </linearGradient>
                    </defs>
                    <!-- transparent thumbnail background -->
                    <path d="M18 110 Q28 78 45 76 L55 101 L65 76 Q82 78 92 110 Z" fill="#223048"/>
                    <path d="M44 79 L55 104 L66 79 Q60 84 55 84 Q50 84 44 79 Z" fill="#f8fafc"/>
                    <path d="M31 82 Q22 91 20 105" fill="none" stroke="#29384f" stroke-width="9" stroke-linecap="round"/>
                    <path d="M79 82 Q88 91 90 105" fill="none" stroke="#29384f" stroke-width="9" stroke-linecap="round"/>
                    <ellipse cx="20" cy="104" rx="6" ry="4" fill="${SKIN_M}"/>
                    <ellipse cx="90" cy="104" rx="6" ry="4" fill="${SKIN_M}"/>
                    <rect x="48" y="68" width="14" height="14" fill="${SKIN_M}"/>
                    <ellipse cx="55" cy="52" rx="22" ry="26" fill="${SKIN_M}"/>
                    <path d="M31 45 Q36 20 55 18 Q74 20 79 45 Q72 34 55 33 Q38 34 31 45 Z" fill="${HAIR}"/>
                    <g id="thumbEyes">
                        <circle id="thumbEyeFlashL" class="thumb-eye-flash" cx="45" cy="54" r="4.8" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.45" opacity="0"/>
                        <circle id="thumbEyeFlashR" class="thumb-eye-flash" cx="65" cy="54" r="4.8" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.45" opacity="0"/>
                        <circle cx="45" cy="54" r="1.7" fill="${HAIR}"/>
                        <circle cx="65" cy="54" r="1.7" fill="${HAIR}"/>
                    </g>
                    <path id="thumbMouth" d="M46 64 Q55 68 64 64" fill="none" stroke="#3a1f12" stroke-width="1.7" stroke-linecap="round"/>
                </svg>`;
            }
            if (normalized === 'academic-male') {
                return `
                <svg width="110" height="110" viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="thumbBgA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#143638"/>
                            <stop offset="100%" stop-color="#0a2528"/>
                        </linearGradient>
                    </defs>
                    <!-- transparent thumbnail background -->
                    <path d="M10 110 Q55 76 100 110 L100 110 Z" fill="#222b3f"/>
                    <path d="M40 95 L55 110 L70 95 Z" fill="#0b6f73"/>
                    <rect x="48" y="69" width="14" height="14" fill="${SKIN_M}"/>
                    <ellipse cx="55" cy="53" rx="22" ry="26" fill="${SKIN_M}"/>
                    <path d="M30 45 Q36 28 55 27 Q74 28 80 45 Q70 52 55 52 Q40 52 30 45 Z" fill="#15121a"/>
                    <ellipse cx="55" cy="31" rx="25" ry="12" fill="#15121a"/>
                    <path d="M28 45 Q38 40 55 41 Q72 40 82 45 Q73 53 55 53 Q37 53 28 45 Z" fill="#111018"/>
                    <path d="M37 44 Q55 49 73 44" fill="none" stroke="#d8b657" stroke-width="1.6"/>
                    <path d="M40 39 Q55 43 70 39" fill="none" stroke="#0b6f73" stroke-width="1.7"/>
                    <g id="thumbEyes">
                        <circle id="thumbEyeFlashL" class="thumb-eye-flash" cx="45" cy="54" r="4.8" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.45" opacity="0"/>
                        <circle id="thumbEyeFlashR" class="thumb-eye-flash" cx="65" cy="54" r="4.8" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.45" opacity="0"/>
                        <ellipse cx="45" cy="54" rx="2.1" ry="1.45" fill="${HAIR}"/>
                        <ellipse cx="65" cy="54" rx="2.1" ry="1.45" fill="${HAIR}"/>
                    </g>
                    <path d="M46 62 Q53 59 55 62 Q57 59 64 62 Q60 65 55 65 Q50 65 46 62 Z" fill="${HAIR}" opacity=".9"/>
                    <path id="thumbMouth" d="M46 66 Q55 70 64 66" fill="none" stroke="#3a1f12" stroke-width="1.6" stroke-linecap="round"/>
                </svg>`;
            }
            return `
                <svg width="110" height="110" viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet" style="background:transparent" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="thumbBgF" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#143638"/>
                            <stop offset="100%" stop-color="#0a2528"/>
                        </linearGradient>
                        <linearGradient id="thumbWrapF" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#3a1c4a"/>
                            <stop offset="50%" stop-color="#7b2e58"/>
                            <stop offset="100%" stop-color="#c64a73"/>
                        </linearGradient>
                    </defs>
                    <!-- transparent thumbnail background -->
                    <!-- coat -->
                    <path d="M10 110 Q55 75 100 110 L100 110 Z" fill="${COAT}"/>
                    <path d="M40 95 L55 110 L70 95 Z" fill="${TIE}"/>
                    <!-- neck + head -->
                    <rect x="48" y="68" width="14" height="14" fill="${skin}"/>
                    <ellipse cx="55" cy="52" rx="22" ry="26" fill="${skin}"/>
                    <!-- gele wrap -->
                    <path d="M29 44 Q38 14 55 12 Q72 14 81 44 Q76 30 55 30 Q34 30 29 44 Z"
                          fill="url(#thumbWrapF)"/>
                    <!-- earrings -->
                    <circle cx="33" cy="58" r="2" fill="#e7c64e" stroke="#a98c1c"/>
                    <circle cx="77" cy="58" r="2" fill="#e7c64e" stroke="#a98c1c"/>
                    <!-- eyes -->
                    <g id="thumbEyes">
                        <circle id="thumbEyeFlashL" class="thumb-eye-flash" cx="46" cy="54" r="5" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.55" opacity="0"/>
                        <circle id="thumbEyeFlashR" class="thumb-eye-flash" cx="64" cy="54" r="5" fill="#7bdcb5" fill-opacity=".12" stroke="#cffff0" stroke-width="1.55" opacity="0"/>
                        <circle cx="46" cy="54" r="1.7" fill="${HAIR}"/>
                        <circle cx="64" cy="54" r="1.7" fill="${HAIR}"/>
                    </g>
                    <!-- mouth (smile) -->
                    <path id="thumbMouth" d="M46 64 Q55 69 64 64" fill="none" stroke="#552220" stroke-width="1.8" stroke-linecap="round"/>
                </svg>`;
    }

    function createThumb(presetId, options = {}) {
        const normalized = normalizePresetId(presetId);
        const rawSvg = thumbnailSvg(normalized);
        if (options.namespace === false) return rawSvg;
        const instanceId = makeInstanceId(`${normalized}-thumb`, options.instanceId || options.id);
        return namespaceSvg(rawSvg, instanceId, normalized, {
            ...options,
            label: options.label || `${PRESETS[normalized]?.label || normalized} Thumbnail`
        }).svg;
    }

    const SvgAvatarCatalog = Object.freeze({
        version: 1,
        presets: PRESETS,
        presenterProperties: PRESENTER_PROPERTIES,
        presenterTimelines: PRESENTER_TIMELINES,
        list() {
            return Object.values(PRESETS).map(({ id, label, gender, kind }) => {
                const gestureReady = id === 'gesturing-presenter';
                return {
                    id,
                    label,
                    gender,
                    kind,
                    category: gestureReady ? 'gesture-ready' : 'portrait',
                    capabilities: gestureReady
                        ? ['visible hands', 'hand emphasis', 'lip sync', 'blink', 'gaze']
                        : ['portrait', 'lip sync', 'blink', 'gaze']
                };
            });
        },
        normalizePresetId,
        create(presetId = 'female', options = {}) {
            return buildFullAvatar(presetId, options).svg;
        },
        createInstance(presetId = 'female', options = {}) {
            return buildFullAvatar(presetId, options);
        },
        thumb(presetId = 'female', options = {}) {
            return createThumb(presetId, options);
        },
        applyPresenterState,
        animations: PRESENTER_TIMELINES
    });

    window.SvgAvatarCatalog = SvgAvatarCatalog;

    // Backward compatibility for older login/register/advisor code.
    window.BMUAvatars = {
        svg(presetId, options) {
            return SvgAvatarCatalog.create(presetId, options);
        },
        thumb(presetId, options) {
            return SvgAvatarCatalog.thumb(presetId, options);
        }
    };
})();
