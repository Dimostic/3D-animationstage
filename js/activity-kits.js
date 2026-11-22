/* Activity props are baked into ordinary timeline tracks for preview/export parity. */
(function (global) {
    'use strict';
    const library = global.BUILTIN_PROP_LIBRARY;
    const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
    const asset = (id, name, w, h, body, handGrip) => ({ id, name, w, h, tags: 'activity kit handheld work', svg: svg(w, h, body), handGrip });
    const additions = [
        asset('activity-muzzle-flash', 'Stylized Muzzle Flash', 60, 60, '<path d="M30 2 L37 20 L55 10 L43 27 L59 36 L39 38 L43 57 L29 43 L12 56 L18 37 L1 29 L21 23Z" fill="#ffc94a"/><path d="M30 15 L36 26 L45 31 L34 36 L27 46 L23 34 L14 28 L26 25Z" fill="#fff4c1"/>'),
        asset('activity-handgun-front', 'Handgun (Front Aim)', 42, 68, '<path d="M13 30 H29 L31 63 Q21 69 11 63Z" fill="#35414a"/><path d="M7 9 Q21 2 35 9 L33 35 H9Z" fill="#64727c" stroke="#26323a" stroke-width="3"/><rect x="11" y="12" width="20" height="16" rx="4" fill="#26323a"/><circle cx="21" cy="20" r="5" fill="#11191e"/><path d="M18 7 V3 H24 V7 M15 43 H27 M15 49 H27 M15 55 H27" fill="none" stroke="#96a3ac" stroke-width="2"/>', { x: .5, y: .7, armLengthRatio: .2 }),
        asset('activity-folding-cloth', 'Folding Cloth', 100, 40, '<rect x="0" y="0" width="100" height="40" rx="2" fill="#4b9f9a"/><path d="M5 5 H95 V35 H5Z" fill="none" stroke="#c6e6dc" stroke-width="2"/><path d="M17 1 V39 M23 1 V39" stroke="#d5eee5" stroke-width="3"/>'),
        asset('activity-wash-basin', 'Wash Basin', 140, 90, '<path d="M106 47 V12 Q106 4 96 4 H80 V14" fill="none" stroke="#788d9a" stroke-width="8" stroke-linecap="round"/><path d="M80 17 V56" stroke="#80c9df" stroke-width="4" opacity=".65"/><path d="M6 48 H134 L119 83 H21Z" fill="#b8d1da"/><ellipse cx="70" cy="48" rx="64" ry="20" fill="#edf5f6" stroke="#93acb7" stroke-width="3"/><ellipse cx="70" cy="50" rx="49" ry="13" fill="#87c6d3"/><path d="M80 17 V48" stroke="#bcf0f5" stroke-width="3"/><path d="M57 53 Q70 58 85 52" fill="none" stroke="#d4f5f5" stroke-width="2"/>'),
        asset('activity-cart', 'Utility Cart', 120, 130, '<path d="M20 12 H100 M25 12 V112 M95 12 V112" fill="none" stroke="#536775" stroke-width="6" stroke-linecap="round"/><path d="M14 42 H106 L99 92 H21Z" fill="#729caa"/><path d="M24 55 H96 M26 69 H94 M29 83 H91" stroke="#b5d3dc" stroke-width="3"/><circle cx="27" cy="120" r="8" fill="#34434c"/><circle cx="93" cy="120" r="8" fill="#34434c"/>', { x: .25, y: 12 / 130 }),
        asset('activity-shelf', 'Wall Shelf', 120, 100, '<path d="M19 65 V95 L49 65 M101 65 V95 L71 65" fill="none" stroke="#536775" stroke-width="5"/><rect x="4" y="60" width="112" height="10" rx="2" fill="#a77646"/><path d="M7 62 H113" stroke="#dfb887" stroke-width="3"/>'),
        asset('activity-folder', 'Document Folder', 90, 110, '<path d="M6 9 H40 L48 17 H84 V105 H6Z" fill="#397f9a"/><path d="M14 6 H76 V89 H14Z" fill="#f5f7f8"/><path d="M23 21 H66 M23 32 H61 M23 43 H66" stroke="#a0b0b8" stroke-width="3"/><path d="M6 32 H84 V105 H6Z" fill="#519fb4"/>', { x: .5, y: .87 }),
        asset('activity-marker', 'Board Marker', 100, 20, '<path d="M5 10 L15 4 H78 V16 H15Z" fill="#f4f6f7" stroke="#71818d"/><path d="M5 10 L15 4 V16Z" fill="#293942"/><rect x="77" y="3" width="20" height="14" rx="3" fill="#347a91"/>', { x: .63, y: .5 }),
        asset('stirring-spoon', 'Stirring Spoon', 30, 120, '<path d="M15 5 V88" stroke="#a97848" stroke-width="7" stroke-linecap="round"/><ellipse cx="15" cy="101" rx="11" ry="16" fill="#a97848"/><ellipse cx="15" cy="102" rx="6" ry="10" fill="#855b35"/>', { x: .5, y: .25 }),
        asset('activity-open-pot', 'Open Cooking Pot', 120, 76, '<path d="M20 24 H100 V52 Q100 69 81 69 H39 Q20 69 20 52Z" fill="#718795"/><path d="M20 32 H5 V46 H20 M100 32 H115 V46 H100" fill="none" stroke="#394d58" stroke-width="6"/><ellipse cx="60" cy="24" rx="40" ry="13" fill="#34434a" stroke="#abbcc5" stroke-width="4"/><ellipse cx="60" cy="27" rx="31" ry="7" fill="#c49759"/><path d="M31 40 V51" stroke="#b8cbd5" stroke-width="4"/>'),
        asset('head-basket', 'Head Carry Basket', 140, 70, '<path d="M5 12 H135 L113 65 Q70 72 27 65Z" fill="#ae774b"/><path d="M14 27 H127 M20 43 H121 M26 59 H114 M35 16 L44 65 M57 16 L60 68 M80 16 L79 68 M104 16 L98 65" fill="none" stroke="#e0b780" stroke-width="4"/><ellipse cx="70" cy="12" rx="65" ry="10" fill="#765138" stroke="#d1a26f" stroke-width="5"/>'),
        asset('head-basin', 'Head Carry Basin', 140, 65, '<path d="M5 12 H135 L114 59 Q70 68 26 59Z" fill="#439b9e"/><path d="M27 24 L38 53" stroke="#95d7d3" stroke-width="5" stroke-linecap="round"/><ellipse cx="70" cy="12" rx="65" ry="10" fill="#28686c" stroke="#80c9c6" stroke-width="5"/>'),
        asset('head-tray', 'Head Carry Tray', 150, 32, '<path d="M3 13 Q8 29 75 30 Q142 29 147 13Z" fill="#677c88"/><ellipse cx="75" cy="12" rx="72" ry="10" fill="#c9d9df" stroke="#718f9b" stroke-width="3"/><ellipse cx="75" cy="12" rx="60" ry="6" fill="#adbec7"/>'),
        asset('activity-spoon', 'Eating Spoon', 100, 24, '<path d="M32 12 H94" stroke="#7c8e99" stroke-width="8" stroke-linecap="round"/><ellipse cx="18" cy="12" rx="16" ry="10" fill="#cbd7de" stroke="#788c98" stroke-width="2"/>', { x: .8, y: .5 }),
        asset('activity-spoon-food', 'Spoon Food Portion', 100, 24, '<g data-spoon-food="true"><path d="M6 11 Q7 5 12 6 Q15 1 20 5 Q26 3 29 10 Q24 16 15 15Z" fill="#e6ac54"/><path d="M11 9 L15 7 M19 8 L22 10 M15 12 L18 11" stroke="#fff0bd" stroke-width="2" stroke-linecap="round"/></g>', { x: .8, y: .5 }),
        asset('activity-plate', 'Food Plate', 120, 36, '<path d="M3 16 Q8 34 60 34 Q112 34 117 16" fill="#90abb3"/><ellipse cx="60" cy="15" rx="57" ry="13" fill="#edf4f5" stroke="#90abb3" stroke-width="2"/><ellipse cx="60" cy="14" rx="39" ry="8" fill="#d4b875"/><path d="M40 12 Q53 5 65 13 M70 13 L83 12" fill="none" stroke="#619a63" stroke-width="5" stroke-linecap="round"/>'),
        asset('activity-parcel', 'Parcel', 100, 80, '<path d="M1 12 L50 1 L99 12 V79 H1Z" fill="#bc8755"/><path d="M1 12 H99 M50 1 V12" fill="none" stroke="#805532" stroke-width="2"/><path d="M41 3 L59 3 V79 H41Z" fill="#e3c79e"/><rect x="66" y="27" width="24" height="17" rx="1" fill="#f3eee5"/>', { x: .12, y: .2 }),
        asset('activity-phone', 'Mobile Phone', 40, 76, '<rect x="4" y="2" width="32" height="72" rx="5" fill="#29343d"/><rect x="7" y="10" width="26" height="53" rx="2" fill="#8fc5d3"/><path d="M16 6 H24" stroke="#adbcc3" stroke-width="2"/><circle cx="20" cy="68" r="2" fill="#adbcc3"/>', { x: .5, y: .65 }),
        asset('activity-bag', 'Carry Bag', 80, 90, '<path d="M25 29 V18 C25 1 55 1 55 18 V29" fill="none" stroke="#263d4a" stroke-width="6"/><path d="M12 25 H68 L75 83 Q40 91 5 83Z" fill="#438b87"/><path d="M19 32 L16 77 M62 32 L66 77" stroke="#2e6b68" stroke-width="3"/>', { x: .5, y: .09 }),
        asset('hand-microphone', 'Handheld Microphone', 36, 100, '<rect x="11" y="29" width="14" height="65" rx="6" fill="#39434b"/><ellipse cx="18" cy="22" rx="16" ry="20" fill="#7d8990"/><path d="M6 15 H30 M3 23 H33 M6 31 H30" stroke="#434e57" stroke-width="2"/><rect x="15" y="54" width="6" height="11" rx="2" fill="#b2c6cf"/>', { x: .5, y: .68, armLengthRatio: .28 }),
        asset('drinking-cup', 'Drinking Cup', 75, 80, '<path d="M52 22 C82 15 82 59 53 56" fill="none" stroke="#408b9c" stroke-width="9"/><path d="M8 15 H57 L53 70 Q32 80 12 70Z" fill="#58a6b3"/><ellipse cx="32" cy="15" rx="25" ry="8" fill="#284c55"/><path d="M18 26 V59" stroke="#a6d9dd" stroke-width="4" stroke-linecap="round"/>', { x: .82, y: .5, armLengthRatio: .23 }),
        asset('writing-paper', 'Writing Paper', 120, 65, '<path d="M15 5 H113 L100 59 H3Z" fill="#fafafa" stroke="#b9c4c7" stroke-width="2"/><path d="M27 17 H92 M24 27 H89 M21 37 H85 M18 47 H68" stroke="#a9bbc4" stroke-width="2"/>'),
        asset('typewriter', 'Typewriter', 120, 100, '<rect x="30" y="3" width="64" height="46" fill="#f7fafc" stroke="#9daeb5" stroke-width="2"/><path d="M40 15 H82 M40 24 H75" stroke="#73858e" stroke-width="2"/><rect x="9" y="39" width="104" height="12" rx="4" fill="#343d46"/><path d="M20 46 H102 L117 85 V95 H4 V85Z" fill="#577985"/><path d="M28 59 H93 M24 69 H99 M18 80 H104" stroke="#d4dde1" stroke-width="7" stroke-dasharray="6 5"/><path d="M36 89 H86" stroke="#28383e" stroke-width="5"/>')
    ];
    library.categories.push({ id: 'activity-kits', name: 'Activity Tools' });
    library.items['activity-kits'] = additions;
    const cloth = additions.find(item => item.id === 'activity-folding-cloth');
    const clothDoc = new DOMParser().parseFromString(cloth.svg, 'image/svg+xml');
    clothDoc.documentElement.setAttribute('preserveAspectRatio', 'none');
    cloth.svg = new XMLSerializer().serializeToString(clothDoc);
    const phone = additions.find(item => item.id === 'activity-phone');
    phone.views = {
        front: phone.svg,
        'call-edge': svg(40, 76, '<rect x="16" y="2" width="8" height="72" rx="3" fill="#29343d"/><path d="M19 9 V66" stroke="#677785" stroke-width="2"/><path d="M24 22 V33" stroke="#a4b1bb" stroke-width="2"/>'),
        'call-back': svg(40, 76, '<rect x="4" y="2" width="32" height="72" rx="5" fill="#29343d"/><rect x="8" y="7" width="11" height="17" rx="4" fill="#101820"/><circle cx="13.5" cy="12" r="3" fill="#71818e"/><circle cx="13.5" cy="19" r="2" fill="#71818e"/>'),
        'photo-side-right': svg(40, 76, '<rect x="15" y="2" width="10" height="72" rx="3" fill="#29343d"/><path d="M16 11 V61" stroke="#8fc5d3" stroke-width="3"/><circle cx="16" cy="7" r="1.5" fill="#c5d6dc"/>'),
        'photo-side-left': svg(40, 76, '<rect x="15" y="2" width="10" height="72" rx="3" fill="#29343d"/><path d="M24 11 V61" stroke="#8fc5d3" stroke-width="3"/><circle cx="24" cy="7" r="1.5" fill="#c5d6dc"/>')
    };
    const book = Object.values(library.items).flat().find(p => p.id === 'open-book');
    const typewriter = additions.find(p => p.id === 'typewriter');
    const authored = (item, right, quarter) => {
        item.views ||= { front: item.svg };
        for (const [key, body] of [['side', right], ['three-quarter', quarter]]) {
            item.views[`${key}-right`] = svg(item.w, item.h, body);
            item.views[`${key}-left`] = svg(item.w, item.h, `<g transform="translate(${item.w} 0) scale(-1 1)">${body}</g>`);
        }
    };
    const addQuarterArtwork = (item, support = null) => {
        const w = item.w, h = item.h;
        const project = (p, left) => ({ x: left ? 1 - (.78 * p.x + .08 * h / w * p.y + .08) : .78 * p.x + .08 * h / w * p.y + .08,
            y: -.1 * w / h * p.x + .9 * p.y + .07 + .1 * w / h });
        item.viewGrips = {}; item.viewSupport = {};
        for (const rear of [false, true]) for (const left of [false, true]) {
            const key = `${rear ? 'back-' : ''}three-quarter-${left ? 'left' : 'right'}`;
            const markup = new DOMParser().parseFromString(rear ? item.views.back || item.svg : item.views.front || item.svg, 'image/svg+xml').documentElement.innerHTML;
            const projected = `<g transform="matrix(.78 -.1 .08 .9 ${w * .08} ${h * .07 + w * .1})">${markup}</g>`;
            item.views[key] = svg(w, h, left ? `<g transform="translate(${w} 0) scale(-1 1)">${projected}</g>` : projected);
            const grip = item.handGrip || { x: .5, y: .65 };
            item.viewGrips[key] = project({ x: rear && support ? 1 - grip.x : grip.x, y: grip.y }, left);
            if (support) item.viewSupport[key] = project({ x: rear ? 1 - support.x : support.x, y: support.y }, left);
        }
    };
    const handgun = additions.find(item => item.id === 'activity-handgun-front');
    const lifeProps = [
        ['life-remote','Remote Control',42,100,'<rect x="6" y="2" width="30" height="96" rx="8" fill="#354a54"/><circle cx="21" cy="16" r="5" fill="#d07a64"/><circle cx="21" cy="41" r="12" fill="#8aa5ae"/><circle cx="21" cy="41" r="5" fill="#354a54"/><path d="M14 65 H28 M14 76 H28 M14 87 H28" stroke="#a9bec5" stroke-width="5" stroke-dasharray="5 4"/>',.28],
        ['life-passport','Passport',64,88,'<rect x="4" y="3" width="56" height="82" rx="3" fill="#326b59" stroke="#214a40" stroke-width="2"/><circle cx="32" cy="44" r="17" fill="none" stroke="#e0ca8b" stroke-width="2"/><ellipse cx="32" cy="44" rx="8" ry="17" fill="none" stroke="#e0ca8b"/><path d="M15 44 H49 M17 34 H47 M17 54 H47 M16 16 H48 M20 73 H44" stroke="#e0ca8b" stroke-width="2"/>',.3],
        ['life-wrench','Workshop Wrench',44,110,'<path d="M10 3 L17 20 H28 L35 3 Q48 25 31 35 L29 88 Q39 102 28 108 Q12 115 9 101 Q7 93 15 87 L13 35 Q-2 25 10 3Z" fill="#94a9b3" stroke="#526d7a" stroke-width="2"/><circle cx="21" cy="99" r="5" fill="#455b65"/><path d="M21 41 V80" stroke="#c8d8df" stroke-width="4"/>',.37],
        ['life-seed-packet','Seed Packet',64,86,'<path d="M4 3 H60 V82 H4Z" fill="#ecdfb4" stroke="#a99d76" stroke-width="2"/><rect x="10" y="10" width="44" height="58" fill="#a1c59b"/><path d="M32 58 V32 M32 46 Q9 43 17 27 Q33 28 32 46 M32 39 Q33 17 49 19 Q53 34 32 39" fill="#4f8c59" stroke="#3a7047" stroke-width="2"/><path d="M15 75 H49" stroke="#8f835e" stroke-width="3"/>',.3],
        ['life-gift-box','Wrapped Gift Box',100,80,'<rect x="7" y="24" width="86" height="52" fill="#6b99b0"/><rect x="3" y="17" width="94" height="13" rx="2" fill="#8db6c9"/><path d="M43 18 H57 V76 H43Z" fill="#f0ce79"/><path d="M50 18 Q12 19 22 4 Q38 -5 50 18 Q65 -5 80 5 Q87 21 50 18Z" fill="#f0ce79" stroke="#c29e50" stroke-width="2"/>',.35],
        ['life-flower','Gift Flower',64,110,'<path d="M32 31 V106 M32 72 Q7 72 12 55 Q30 55 32 72 M32 88 Q55 83 53 68 Q33 70 32 88" fill="#5d985c" stroke="#39754b" stroke-width="3"/><g fill="#d8778e"><ellipse cx="32" cy="14" rx="10" ry="13"/><ellipse cx="17" cy="25" rx="13" ry="10"/><ellipse cx="47" cy="25" rx="13" ry="10"/><ellipse cx="24" cy="39" rx="10" ry="13"/><ellipse cx="40" cy="39" rx="10" ry="13"/></g><circle cx="32" cy="27" r="9" fill="#e8c96d"/>',.43],
        ['life-clipboard','Checklist Clipboard',76,100,'<rect x="3" y="8" width="70" height="88" rx="4" fill="#6e8994"/><rect x="10" y="17" width="56" height="72" fill="#f4f7f7"/><rect x="24" y="3" width="28" height="19" rx="4" fill="#b9c8ce"/><path d="M17 35 L21 39 L28 30 M17 53 L21 57 L28 48 M17 71 L21 75 L28 66" fill="none" stroke="#4a9279" stroke-width="3"/><path d="M35 35 H58 M35 53 H58 M35 71 H54" stroke="#91a4ab" stroke-width="3"/>',.39],
        ['life-map','Folded Map',112,76,'<path d="M3 9 L37 3 L75 10 L109 4 V67 L75 73 L37 66 L3 72Z" fill="#d9e8d5" stroke="#8da596" stroke-width="2"/><path d="M37 3 V66 M75 10 V73" stroke="#a9bcb1" stroke-width="2"/><path d="M9 23 L30 35 L50 23 L70 43 L99 27 M17 61 L33 44 L56 55 L83 44 L101 58" fill="none" stroke="#f3f6ee" stroke-width="7"/><path d="M16 15 Q45 65 96 63" fill="none" stroke="#79b7c4" stroke-width="5"/><circle cx="66" cy="42" r="5" fill="#cb7a68"/>',.34],
        ['life-produce','Fresh Tomato',64,64,'<path d="M17 17 Q4 17 4 35 Q3 59 31 60 Q61 59 60 35 Q59 17 46 17Z" fill="#d64e42"/><path d="M30 22 L17 12 L29 15 L32 3 L36 15 L50 12 L39 24Z" fill="#48845a"/><path d="M14 29 Q9 38 15 44" fill="none" stroke="#f58b78" stroke-width="4"/>',.25],
        ['life-price-sign','Market Price Sign',90,72,'<path d="M40 43 H50 V70 H40Z" fill="#aa7c49"/><rect x="3" y="3" width="84" height="47" rx="3" fill="#eff5ed" stroke="#527665" stroke-width="3"/><text x="45" y="23" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#30564a">PRICE</text><path d="M20 35 H70" stroke="#527665" stroke-width="3"/>',.35],
        ['life-receipt','Printed Receipt',48,86,'<path d="M4 2 H44 V82 L38 78 L32 83 L26 78 L20 83 L14 78 L4 83Z" fill="#f6f7f3" stroke="#a0afb4"/><path d="M10 14 H38 M10 25 H30 M10 36 H38 M10 47 H35 M10 61 H38" stroke="#6f8790" stroke-width="3"/>',.28],
        ['life-ticket','Travel Ticket',90,42,'<path d="M3 3 H87 V15 Q77 21 87 27 V39 H3 V27 Q13 21 3 15Z" fill="#b5dcd7" stroke="#498c86" stroke-width="2"/><path d="M61 5 V37" stroke="#498c86" stroke-dasharray="3 3"/><path d="M18 12 H51 M18 21 H43 M18 30 H51" stroke="#426d79" stroke-width="3"/>',.22],
        ['life-id-badge','ID Badge',58,84,'<path d="M19 3 H39 V14 H19Z" fill="#667b86"/><rect x="3" y="12" width="52" height="69" rx="4" fill="#f4f7f8" stroke="#6c919e" stroke-width="2"/><rect x="8" y="18" width="42" height="10" fill="#478694"/><circle cx="29" cy="42" r="8" fill="#9bb5c0"/><path d="M15 61 Q16 49 29 49 Q42 49 43 61 M12 71 H46" fill="#9bb5c0" stroke="#9bb5c0" stroke-width="3"/>',.29],
        ['life-envelope','Envelope',100,64,'<rect x="3" y="3" width="94" height="58" rx="2" fill="#e9edf5" stroke="#8c9fac" stroke-width="2"/><path d="M4 4 L50 37 L96 4 M4 60 L36 30 M96 60 L64 30" fill="none" stroke="#8c9fac" stroke-width="2"/>',.28],
        ['life-keys','Key Ring',52,80,'<circle cx="25" cy="16" r="12" fill="none" stroke="#aab8bf" stroke-width="5"/><path d="M20 28 V69 H30 V61 H37 V53 H30 V28Z" fill="#d0b96d" stroke="#8c7c49" stroke-width="2"/><path d="M14 28 L6 65 L15 68 L18 60 L23 61 L26 52 L20 50 L25 31Z" fill="#a6b7c0"/>',.24],
        ['life-water-bottle','Water Bottle',48,100,'<rect x="17" y="2" width="14" height="10" rx="2" fill="#468aab"/><path d="M16 13 H32 V23 Q42 30 42 39 V91 Q42 98 24 98 Q6 98 6 91 V39 Q6 30 16 23Z" fill="#a8d9e3" stroke="#5e9eb1" stroke-width="2"/><path d="M10 57 H38 V78 H10Z" fill="#edf5f6"/><path d="M14 33 V49" stroke="#eefbff" stroke-width="4"/>',.36],
        ['life-medicine-box','Medicine Package',86,64,'<rect x="3" y="3" width="80" height="58" rx="2" fill="#f4f7f8" stroke="#9aaeb8" stroke-width="2"/><path d="M3 40 H83 V61 H3Z" fill="#63a6a1"/><path d="M18 15 V33 M9 24 H27" stroke="#63a6a1" stroke-width="6"/><path d="M38 17 H72 M38 27 H67" stroke="#8197a1" stroke-width="3"/>',.25],
        ['life-sample','Sealed Sample Container',48,68,'<rect x="6" y="15" width="36" height="50" rx="5" fill="#c8e3e8" stroke="#739ba8" stroke-width="2"/><rect x="4" y="3" width="40" height="14" rx="3" fill="#4e9da5"/><rect x="10" y="30" width="28" height="23" fill="#f4f7f8"/><path d="M15 38 H33 M15 45 H28" stroke="#839da5" stroke-width="2"/>',.25],
        ['life-learning-card','Learning Card',80,84,'<rect x="3" y="3" width="74" height="78" rx="3" fill="#fff4ca" stroke="#d3ad5a" stroke-width="3"/><text x="40" y="56" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="48" fill="#448594">A</text><path d="M20 69 H60" stroke="#df8767" stroke-width="4"/>',.38],
        ['life-signal-flag','Signal Flag',90,100,'<path d="M18 4 V97" stroke="#82969c" stroke-width="5" stroke-linecap="round"/><path d="M21 6 Q51 -1 83 11 V51 Q54 39 21 48Z" fill="#e7b63c"/><path d="M25 12 Q49 7 76 15" fill="none" stroke="#ffdd75" stroke-width="3"/>',.55],
        ['life-trophy','Trophy',90,106,'<path d="M21 13 H5 V29 Q5 48 28 46 M69 13 H85 V29 Q85 48 62 46" fill="none" stroke="#bf973b" stroke-width="7"/><path d="M20 5 H70 V35 Q70 59 45 64 Q20 59 20 35Z" fill="#dfbd53"/><path d="M40 61 H50 V85 H40Z M26 82 H64 V91 H26Z" fill="#bf973b"/><rect x="17" y="91" width="56" height="12" rx="2" fill="#425462"/><path d="M29 14 V33" stroke="#fff0aa" stroke-width="5"/>',.47],
        ['life-handbell','Handbell',64,88,'<rect x="25" y="3" width="14" height="33" rx="5" fill="#4e655e"/><path d="M18 37 Q32 23 46 37 L52 65 L60 76 H4 L12 65Z" fill="#cfb358" stroke="#9d843e" stroke-width="2"/><ellipse cx="32" cy="76" rx="28" ry="7" fill="#a88c3e"/><circle cx="32" cy="80" r="5" fill="#675734"/>',.34],
        ['life-calabash','Decorated Calabash',110,62,'<path d="M4 19 H106 Q98 59 55 59 Q12 59 4 19Z" fill="#bd8650"/><ellipse cx="55" cy="19" rx="51" ry="15" fill="#745a3a" stroke="#d7a66c" stroke-width="4"/><path d="M18 34 L28 44 L38 34 L48 44 L58 34 L68 44 L78 34 L88 44 L98 34" fill="none" stroke="#efce93" stroke-width="3"/>',.32],
        ['life-woven-basket','Woven Market Basket',110,82,'<path d="M26 28 Q26 1 55 1 Q84 1 84 28" fill="none" stroke="#a47a4b" stroke-width="6"/><path d="M4 26 H106 L92 77 Q55 84 18 77Z" fill="#bf9563"/><path d="M10 39 H101 M14 53 H97 M17 67 H93 M28 27 L36 79 M50 27 V81 M74 27 L68 80 M94 27 L83 78" stroke="#ead0a1" stroke-width="3"/><path d="M5 26 H105" stroke="#8c643e" stroke-width="6"/>',.36]
    ];
    const flatLifeProps = new Set(['life-passport', 'life-seed-packet', 'life-clipboard', 'life-map', 'life-price-sign', 'life-receipt', 'life-ticket', 'life-id-badge', 'life-envelope', 'life-medicine-box', 'life-learning-card']);
    for (const [id, name, w, h, markup, ratio] of lifeProps) {
        const scenario = JointSystem.lifeScenarios.find(entry => entry.prop === id);
        const grip = scenario.twoHands ? { x: .3, y: .65 } : id === 'life-keys' ? { x: .48, y: .2 }
            : id === 'life-signal-flag' ? { x: .2, y: .85 } : id === 'life-handbell' ? { x: .5, y: .22 }
            : { x: .5, y: .78 };
        const item = asset(id, name, w, h, markup, { ...grip, armLengthRatio: ratio });
        item.tags += ` ${scenario.name.toLowerCase()}`;
        additions.push(item);
        const edge = flatLifeProps.has(id) ? `<path d="M${w * .44} 3 L${w * .56} 6 V${h - 3} L${w * .44} ${h - 6}Z" fill="#d8e2e5" stroke="#879ca6" stroke-width="2"/>` : markup;
        authored(item, edge, markup);
        item.views.back = flatLifeProps.has(id) ? svg(w, h, `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="2" fill="#dae4e4" stroke="#879ca6" stroke-width="2"/>`) : item.svg;
        addQuarterArtwork(item, scenario.twoHands ? { x: .7, y: .65 } : null);
    }
    const documentProp = asset('activity-display-document', 'Display Document', 72, 96,
        '<rect x="4" y="2" width="64" height="91" rx="2" fill="#f5f7f8" stroke="#a6b6bf" stroke-width="2"/><rect x="13" y="12" width="46" height="17" fill="#4a91a0"/><path d="M14 40 H57 M14 50 H53 M14 60 H57 M14 70 H43" stroke="#6e8794" stroke-width="3"/>', { x: .5, y: .87, armLengthRatio: .42 });
    const tablet = asset('activity-tablet', 'Tablet', 100, 74,
        '<rect x="2" y="2" width="96" height="70" rx="6" fill="#34464f"/><rect x="9" y="9" width="82" height="54" rx="2" fill="#b7dce0"/><rect x="16" y="16" width="31" height="31" fill="#538e9c"/><path d="M54 20 H83 M54 29 H79 M54 38 H83 M16 55 H82" stroke="#668590" stroke-width="3"/><circle cx="50" cy="67" r="2" fill="#a3b4bc"/>', { x: .18, y: .84, armLengthRatio: .32 });
    const flashlight = asset('activity-flashlight', 'Inspection Flashlight', 90, 36,
        '<rect x="5" y="10" width="56" height="18" rx="5" fill="#bfa331"/><path d="M53 9 L72 2 H85 V34 H72 L53 27Z" fill="#44565f"/><ellipse cx="82" cy="18" rx="6" ry="13" fill="#e4f0cc"/><path d="M17 12 V25 M24 12 V25 M31 12 V25" stroke="#82752f" stroke-width="2"/>', { x: .28, y: .55, armLengthRatio: .18 });
    additions.push(documentProp, tablet, flashlight);
    const body = item => new DOMParser().parseFromString(item.svg, 'image/svg+xml').documentElement.innerHTML;
    authored(documentProp, '<path d="M32 3 L45 7 V91 L32 87Z" fill="#f5f7f8" stroke="#a6b6bf" stroke-width="2"/>', '<path d="M13 8 L63 2 V88 L13 94Z" fill="#f5f7f8" stroke="#a6b6bf" stroke-width="2"/><path d="M23 25 L54 21 M23 40 L54 36 M23 55 L50 51" stroke="#6e8794" stroke-width="3"/>');
    documentProp.views.back = svg(72, 96, '<rect x="4" y="2" width="64" height="91" rx="2" fill="#e4ebee" stroke="#a6b6bf" stroke-width="2"/>');
    authored(tablet, '<path d="M20 14 L86 40 L82 49 L16 23Z" fill="#34464f"/><path d="M23 17 L79 39" stroke="#b7dce0" stroke-width="4"/>', body(tablet));
    tablet.views.back = svg(100, 74, '<rect x="2" y="2" width="96" height="70" rx="6" fill="#34464f"/><circle cx="50" cy="36" r="7" fill="#667b85"/>');
    authored(flashlight, body(flashlight), body(flashlight));
    flashlight.views.front = svg(90, 36, '<path d="M36 16 H54 V34 H36Z" fill="#bfa331"/><circle cx="45" cy="14" r="12" fill="#44565f"/><circle cx="45" cy="14" r="8" fill="#e4f0cc"/>');
    flashlight.views.back = svg(90, 36, '<rect x="36" y="6" width="18" height="28" rx="6" fill="#bfa331"/><ellipse cx="45" cy="26" rx="8" ry="6" fill="#44565f"/>');
    const rifle = asset('activity-rifle', 'Rifle', 160, 64,
        '<path d="M66 30 H94 L98 60 H62Z" fill="#39464b"/><path d="M68 12 H92 V42 H68Z" fill="#65757a" stroke="#253238" stroke-width="3"/><circle cx="80" cy="18" r="10" fill="#39464b" stroke="#93a0a4" stroke-width="3"/><circle cx="80" cy="18" r="5" fill="#172226"/><path d="M74 43 V56 M86 43 V56" stroke="#859397" stroke-width="2"/>', { x: .5, y: .72, armLengthRatio: .3 });
    additions.push(rifle);
    const rifleSide = '<path d="M3 22 H31 L43 30 L36 48 H4Z" fill="#566453"/><path d="M31 20 H105 V35 H31Z" fill="#47565c"/><path d="M68 19 H112 V32 H68Z" fill="#697764"/><path d="M107 21 H157 V28 H107Z" fill="#303d42"/><path d="M43 33 H55 L51 55 H40Z M58 34 H75 L78 53 H62Z" fill="#35434a"/><path d="M38 17 H65 M142 21 V14" stroke="#253238" stroke-width="4"/><path d="M77 23 H102" stroke="#a6afa1" stroke-width="2"/>';
    const rifleQuarter = '<path d="M28 31 L54 23 L67 30 L55 49 L29 54Z" fill="#566453"/><path d="M52 23 L111 10 L120 24 L62 40Z" fill="#58666c"/><path d="M87 17 L116 10 L119 23 L92 30Z" fill="#697764"/><path d="M116 12 L151 5 L155 14 L119 24Z" fill="#303d42"/><ellipse cx="151" cy="10" rx="4" ry="6" fill="#182328"/><path d="M64 36 L76 33 L73 56 L62 59Z M81 32 L94 29 L100 49 L87 52Z" fill="#35434a"/>';
    authored(rifle, rifleSide, rifleQuarter);
    rifle.views.back = svg(160, 64, '<path d="M65 12 H95 L101 60 H59Z" fill="#566453" stroke="#293738" stroke-width="3"/><path d="M71 18 H89 V53 H71Z" fill="#35434a"/><path d="M75 7 H85 V19 H75Z" fill="#65757a"/>');
    for (const facing of ['right', 'left']) {
        const body = rifleQuarter.replace('<ellipse cx="151" cy="10" rx="4" ry="6" fill="#182328"/>', '');
        rifle.views[`back-three-quarter-${facing}`] = svg(160, 64, facing === 'left' ? `<g transform="translate(160 0) scale(-1 1)">${body}</g>` : body);
    }
    authored(handgun,
        '<path d="M12 25 H24 L22 64 H10Z" fill="#35414a"/><path d="M5 10 H40 V26 H5Z" fill="#64727c" stroke="#26323a" stroke-width="2"/><path d="M39 12 V24 M15 32 H27 V44 H23" fill="none" stroke="#26323a" stroke-width="3"/>',
        '<path d="M14 27 H27 L24 64 H11Z" fill="#35414a"/><path d="M6 13 L28 7 L40 13 V27 L17 33 L6 27Z" fill="#64727c" stroke="#26323a" stroke-width="2"/><ellipse cx="35" cy="19" rx="4" ry="6" fill="#14212a"/>');
    handgun.views.back = svg(42, 68, '<path d="M12 28 H30 L29 64 H13Z" fill="#35414a"/><rect x="9" y="9" width="24" height="25" rx="3" fill="#64727c" stroke="#26323a" stroke-width="2"/><path d="M15 17 H27 M17 11 V6 H25 V11" fill="none" stroke="#26323a" stroke-width="3"/>');
    const rearGun = '<path d="M12 29 H27 L24 64 H11Z" fill="#35414a"/><path d="M5 15 L28 8 L39 13 V29 L16 35 L5 29Z" fill="#64727c" stroke="#26323a" stroke-width="2"/><path d="M9 18 L17 21 V30 L9 27Z" fill="#35414a"/><path d="M13 15 V10" stroke="#26323a" stroke-width="3"/>';
    handgun.views['back-three-quarter-right'] = svg(42, 68, rearGun);
    handgun.views['back-three-quarter-left'] = svg(42, 68, `<g transform="translate(42 0) scale(-1 1)">${rearGun}</g>`);
    authored(book,
        '<path d="M10 51 L47 60 L98 23 L101 31 L47 68 L8 58Z" fill="#34618c"/><path d="M10 46 L47 55 L98 17 L98 24 L47 62 L10 53Z" fill="#f5f7f8" stroke="#9caeb8" stroke-width="2"/>',
        '<path d="M9 21 L53 34 L102 13 V58 L53 74 L9 58Z" fill="#34618c"/><path d="M10 15 Q36 16 53 29 Q76 7 102 8 V51 Q77 48 53 66 Q36 54 10 52Z" fill="#f5f7f8" stroke="#a2b4bf" stroke-width="2"/><path d="M53 30 V65 M20 29 L42 35 M20 38 L42 44 M63 30 L92 20 M63 39 L92 29" stroke="#a2b4bf" stroke-width="2"/>');
    authored(typewriter,
        '<path d="M73 6 L87 48 L75 51 L61 9Z" fill="#f5f7f8"/><path d="M59 44 H93 V60 L113 80 V92 H7 V82 L49 65Z" fill="#577985"/><path d="M12 81 L55 65" stroke="#d4dde1" stroke-width="6" stroke-dasharray="5 3"/><circle cx="85" cy="53" r="10" fill="#343d46"/>',
        '<path d="M39 9 L87 2 L99 39 L48 49Z" fill="#f5f7f8" stroke="#9daeb5"/><path d="M22 48 L94 33 L114 72 L40 94 L7 79Z" fill="#577985"/><path d="M27 60 L85 47 M29 69 L93 55 M34 78 L101 64" stroke="#d4dde1" stroke-width="5" stroke-dasharray="5 3"/><path d="M7 79 L40 94 L114 72 V82 L40 100 L7 87Z" fill="#343d46"/>');
    typewriter.views.back = svg(120, 100, '<path d="M10 46 H110 L116 91 H4Z" fill="#577985"/><rect x="25" y="5" width="70" height="53" fill="#f5f7f8" stroke="#9daeb5"/><path d="M7 59 H113" stroke="#343d46" stroke-width="12"/><path d="M26 76 H94 M26 84 H94" stroke="#344951" stroke-width="3"/>');
    const chairArt = (w, h, seat, view) => {
        const side = view.startsWith('side'), quarter = view.startsWith('three-quarter'), rear = view === 'back';
        const x = side ? w * .18 : w * .14, right = w * .84, backHeight = Math.min(seat - 6, w * .8);
        const top = seat - backHeight, thickness = Math.max(5, w * .055);
        const board = side ? `<rect x="${x}" y="${top}" width="${thickness}" height="${backHeight}" rx="3" fill="#a86b34"/>`
            : `<path d="M${x} ${top + (quarter ? w * .16 : 0)} L${right} ${top} V${seat} H${x}Z" fill="#a86b34"/><path d="M${x + 4} ${top + (quarter ? w * .16 : 0) + 6} L${right - 4} ${top + 6}" stroke="#c98d51" stroke-width="5"/>`;
        const body = `<path d="M${x + thickness / 2} ${seat} V${h - thickness / 2} M${right - thickness / 2} ${seat} V${h - thickness / 2}" stroke="#7d4d22" stroke-width="${thickness}" stroke-linecap="round"/>${rear ? '' : board}<rect data-activity-chair-seat="true" x="${x - 5}" y="${seat}" width="${right - x + 10}" height="${thickness}" rx="3" fill="#c98d51"/>${rear ? board : ''}`;
        return svg(w, h, view.endsWith('left') ? `<g transform="translate(${w} 0) scale(-1 1)">${body}</g>` : body);
    };
    const basin = additions.find(item => item.id === 'activity-wash-basin');
    const basinBody = new DOMParser().parseFromString(basin.svg, 'image/svg+xml').documentElement.innerHTML;
    basin.views = { front: basin.svg, 'side-right': basin.svg,
        'side-left': svg(basin.w, basin.h, `<g transform="translate(${basin.w} 0) scale(-1 1)">${basinBody}</g>`) };
    addQuarterArtwork(documentProp);
    addQuarterArtwork(tablet, { x: .8, y: .84 });
    addQuarterArtwork(flashlight);
    const kits = {
        displayDocument: { name: 'Show Document', match: /^Show Document$/i, props: ['activity-display-document'], followHand: true, quarter: true },
        tablet: { name: 'Review Tablet', match: /^Review Tablet$/i, props: ['activity-tablet'], followHand: true, twoHands: true, quarter: true },
        flashlight: { name: 'Inspect With Flashlight', match: /^Inspect With Flashlight$/i, props: ['activity-flashlight'], followHand: true, quarter: true },
        rifle: { name: 'Forward Rifle', match: /^(Aim|Shoot) Rifle Forward$/i, props: ['activity-rifle'], followHand: true, twoHands: true },
        shooting: { name: 'Forward Handgun', match: /^(Aim|Shoot) Handgun Forward$/i, props: ['activity-handgun-front'], followHand: true },
        overhead: { name: 'Overhead Carry', match: /carry[- ]load/i, props: ['head-basket', 'head-basin', 'head-tray'], twoHands: true },
        read: { name: 'Read', match: /\bread(?:ing)?\b/i, props: ['open-book'], twoHands: true },
        board: { name: 'Write Board', match: /\bwrite[- ]board\b|\bwriting (?:on (?:a |the )?)?board\b/i, props: ['activity-marker'] },
        write: { name: 'Write', match: /\bwrit(?:e|ing)\b/i, props: ['pencil'], desk: true },
        document: { name: 'Carry File', match: /\bcarry[- ]file\b/i, props: ['activity-folder'], followHand: true },
        box: { name: 'Carry Box', match: /\bcarry(?:ing)?[- ](?:box|object)\b/i, props: ['activity-parcel'], twoHands: true },
        tray: { name: 'Carry Tray', match: /\bcarry[- ]tray\b/i, props: ['head-tray', 'serving-tray'], twoHands: true },
        cook: { name: 'Cook / Stir Pot', match: /\bcook\b|\bstir[- ]pot\b/i, props: ['stirring-spoon'], desk: true, twoHands: true },
        place: { name: 'Place on Table', match: /\bplace[- ]on[- ]table\b/i, props: ['activity-parcel'], desk: true },
        luggage: { name: 'Pull Suitcase', match: /\bpull[- ]suitcase\b/i, props: ['suitcase'] },
        cart: { name: 'Push Cart', match: /\bpush[- ]cart\b/i, props: ['activity-cart'], twoHands: true },
        shelf: { name: 'Pick From Shelf', match: /\bpick[- ]from[- ]shelf\b/i, props: ['activity-parcel'] },
        fold: { name: 'Fold Clothes', match: /\bfold[- ]clothes\b/i, props: ['activity-folding-cloth'], desk: true, twoHands: true },
        wash: { name: 'Wash Hands', match: /\bwash[- ]hands\b/i, props: ['activity-wash-basin'], desk: true, twoHands: true },
        type: { name: 'Type', match: /\btyp(?:e|ing)\b/i, props: ['laptop', 'typewriter'], desk: true, twoHands: true },
        sweep: { name: 'Sweep', match: /\bsweep(?:ing)?\b/i, props: ['cleaning-broom'], twoHands: true },
        mop: { name: 'Mop', match: /\bmop(?:ping)?\b/i, props: ['cleaning-mop'], twoHands: true },
        drink: { name: 'Drink', match: /\bdrink(?:ing)?\b/i, props: ['drinking-cup'] },
        eat: { name: 'Eat', match: /\beat(?:ing)?\b/i, props: ['activity-spoon'] },
        pickup: { name: 'Pick Up / Drop', match: /^Pick Up (Center|Left|Right) \/ Drop Object$/i, props: ['activity-parcel'] },
        microphone: { name: 'Microphone', match: /microphone/i, props: ['hand-microphone'] },
        phone: { name: 'Phone Call', match: /\bphone[- ]call\b/i, props: ['activity-phone'], followHand: true },
        selfie: { name: 'Photo / Selfie', match: /\bselfie\b|taking[- ]photo/i, props: ['activity-phone'], followHand: true },
        carry: { name: 'Carry Bag', match: /\bcarry[- ]bag\b/i, props: ['activity-bag', 'toolbox', 'cleaning-bucket', 'suitcase'], followHand: true },
        fan: { name: 'Fan Self', match: /\bfan(?:ning)?[- ]self\b/i, props: ['ceremonial-fan'], followHand: true },
        shaker: { name: 'Hand Shaker', match: /\bhand[- ]shaker\b/i, props: ['hand-shaker'], followHand: true }
    };
    for (const scenario of JointSystem.lifeScenarios) {
        kits[`life-${scenario.id}`] = { name: scenario.name, match: new RegExp(`^${scenario.name}$`, 'i'), props: [scenario.prop],
            followHand: true, lifeScenario: true, quarter: true, twoHands: scenario.twoHands === true, swing: scenario.swing || 0,
            support: scenario.twoHands ? { x: .7, sideX: .55, y: .65 } : null };
    }
    const defaults = { enabled: false, muzzleFlash: false, recoilStrength: 1, prop: '', hand: 'auto', furniture: true, keep: true, scale: 1,
        offsetX: 0, offsetY: 0, rotation: 0, mode: 'auto', existing: '', chair: '', desk: '', emoji: '', cueStart: .15, cueEnd: .8, lidOpacity: .45, boardOpacity: .22, handleLength: 1, propReplacements: {} };
    const finite = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
    const clean = input => ({ ...defaults, enabled: input?.enabled === true, muzzleFlash: input?.muzzleFlash === true, furniture: input?.furniture !== false, keep: input?.keep !== false,
        propReplacements: input?.propReplacements && typeof input.propReplacements === 'object' && !Array.isArray(input.propReplacements) ? Utils.deepClone(input.propReplacements) : {},
        hand: ['auto', 'primary', 'other'].includes(input?.hand) ? input.hand : 'auto',
        mode: input?.mode === 'overhead' ? 'overhead' : 'auto', rotation: finite(input?.rotation, 0, -90, 90),
        ...Object.fromEntries(['prop', 'existing', 'chair', 'desk', 'emoji'].map(k => [k, typeof input?.[k] === 'string' ? input[k].slice(0, 120) : ''])),
        scale: finite(input?.scale, 1, .5, 1.8), offsetX: finite(input?.offsetX, 0, -50, 50), offsetY: finite(input?.offsetY, 0, -50, 50),
        lidOpacity: finite(input?.lidOpacity, .45, .15, 1),
        boardOpacity: finite(input?.boardOpacity, .22, 0, 1), handleLength: finite(input?.handleLength, 1, .5, 1.5),
        recoilStrength: finite(input?.recoilStrength, 1, 0, 2),
        cueStart: finite(input?.cueStart, .15, 0, .95), cueEnd: finite(input?.cueEnd, .8, .05, 1) });
    const url = markup => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    const fitKeys = ['prop', 'hand', 'furniture', 'scale', 'offsetX', 'offsetY', 'rotation', 'lidOpacity', 'boardOpacity', 'handleLength', 'propReplacements'];
    const fitFor = (input, kind) => {
        const settings = clean(input);
        if (settings.prop && !kits[kind]?.props.includes(settings.prop)) settings.prop = '';
        return Object.fromEntries(fitKeys.map(key => [key, settings[key]]));
    };
    const savedFits = input => Object.fromEntries(Object.keys(kits)
        .filter(key => input && Object.hasOwn(input, key) && input[key] && typeof input[key] === 'object')
        .map(key => [key, fitFor(input[key], key)]));
    const seatedActivity = (spec, kind) => /seat|sitting|writing\s*\/\s*typing/i.test(spec?.name || '')
        || kind === 'eat' && ['eat', 'eat-side', 'sit-eating'].includes(spec?.key);
    const svgFeatureAnchor = (source, feature = 'mouth') => {
        if (!source?.startsWith('data:image/svg+xml')) return null;
        let root;
        try {
            const comma = source.indexOf(',');
            const markup = source.slice(0, comma).includes(';base64') ? atob(source.slice(comma + 1)) : decodeURIComponent(source.slice(comma + 1));
            const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
            const photo = parsed.documentElement;
            if (feature === 'mouth' && photo.getAttribute('data-realistic-face') === 'true') {
                const x = Number(photo.getAttribute('data-photo-mouth-x')) / 100, y = Number(photo.getAttribute('data-photo-mouth-y')) / 170;
                if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1) return { x, y };
            }
            const selector = feature === 'ear' ? '[id$="side-ear"]' : feature === 'eye' ? '[id$="side-pupil"]'
                : '[data-photo-lip="upper"], [data-svg-african-role~="upper-lip"], [id$="-mouth-upper"]';
            const mouth = parsed.querySelector(selector);
            if (!mouth || !['path', 'ellipse', 'rect', 'circle'].includes(mouth.localName)) return null;
            const ns = 'http://www.w3.org/2000/svg';
            root = document.createElementNS(ns, 'svg');
            root.setAttribute('viewBox', parsed.documentElement.getAttribute('viewBox'));
            const box = root.viewBox.baseVal;
            if (!box.width || !box.height) return null;
            root.setAttribute('width', box.width); root.setAttribute('height', box.height);
            root.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none';
            // Measure only inert geometry, never insert source scripts, styles or image resources.
            const parents = []; let parent = mouth.parentElement;
            while (parent && parent !== parsed.documentElement) { parents.unshift(parent); parent = parent.parentElement; }
            let holder = root;
            for (const ancestor of parents) {
                const group = document.createElementNS(ns, 'g');
                if (ancestor.hasAttribute('transform')) group.setAttribute('transform', ancestor.getAttribute('transform'));
                holder.append(group); holder = group;
            }
            const shape = document.createElementNS(ns, mouth.localName);
            for (const attr of ['d', 'x', 'y', 'cx', 'cy', 'rx', 'ry', 'r', 'width', 'height', 'transform']) {
                if (mouth.hasAttribute(attr)) shape.setAttribute(attr, mouth.getAttribute(attr));
            }
            holder.append(shape); document.body.append(root);
            const bounds = shape.getBBox(), matrix = root.getCTM().inverse().multiply(shape.getCTM());
            const p = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2).matrixTransform(matrix);
            return { x: (p.x - box.x) / box.width, y: (p.y - box.y) / box.height };
        } catch (_) { return null; } finally { root?.remove(); }
    };
    const track = (name, duration, keyframes) => ({ id: Utils.generateId('anim'), type: 'continuous', name,
        params: { duration: duration / 1000, afterPlayback: 'keep' }, afterPlayback: 'keep', trigger: 'onLoad', repeat: '1', delay: 0,
        generated: { type: 'continuous', duration, properties: Object.keys(keyframes[0].values), keyframes, segmentEasing: 'linear' } });

    Object.assign(JointSystem.prototype, {
        _recordActivityEatingFace(rig, duration, frames) {
            const adapter = this._getArmatureFaceAdapter(rig, { readOnly: true });
            if (!adapter?.supportsFacialFeatures || !frames.length) return;
            const head = adapter.headObj;
            if (adapter.kind === 'svg-african-native') {
                const generated = this.animations._generateSvgAfricanFaceMotion(head, { duration: duration / 1000, easing: 'linear' }, {
                    mouthOpen: frames.map(f => [f.t, f.open]),
                    jawOpen: frames.map(f => [f.t, f.open * .65]),
                    lipPress: frames.map(f => [f.t, 0])
                });
                if (generated.length) head.animations.push({ ...track('Eating: bite mouth', duration, [{ t: 0, values: {} }]), generated });
                return;
            }
            const mouth = this.objects.getObjectById(head._facialFeatures?.mouth);
            const lip = global.app?.audioLipSync;
            if (!mouth || !lip) return;
            const target = { objectId: mouth.id, headId: head.id };
            const keyframes = [];
            const cache = new Map([[0, mouth.imageSrc]]);
            for (const frame of frames) {
                const opening = Math.round(frame.open * 20) / 20;
                if (!cache.has(opening)) cache.set(opening, lip._renderUniversalMouthFrameSource(target, {
                    viseme: 'A', strength: 1, channels: { mouthOpen: opening, jawOpen: opening * .65,
                        upperLipLift: opening * .2, lowerLipDrop: opening * .7, mouthWide: .08, lipPress: 0 }
                }, 1.6));
                const value = cache.get(opening);
                if (value && (value !== keyframes.at(-1)?.value || frame.t === 1)) keyframes.push({ t: frame.t, value });
            }
            if (keyframes.length > 1) mouth.animations.push(track('Eating: bite mouth', duration,
                keyframes.map(frame => ({ t: frame.t, values: { imageSrc: frame.value } }))));
        },
        _activityChairArtwork(width, height, seat, view, bench = false) {
            const art = chairArt(width, height, seat, view);
            if (!bench) return art;
            const doc = new DOMParser().parseFromString(art, 'image/svg+xml');
            // A bench keeps the seat and legs, without a backrest.
            const group = doc.documentElement.querySelector('g') || doc.documentElement;
            [...group.children].filter(node => node.getAttribute('fill') === '#a86b34' || node.getAttribute('stroke') === '#c98d51').forEach(node => node.remove());
            return new XMLSerializer().serializeToString(doc);
        },
        _activityFaceAnchor(head, feature) { return svgFeatureAnchor(head?.imageSrc, feature); },
        _activityKitFor(spec) {
            if (!['pose', 'movement'].includes(spec?.kind)) return null;
            if (/^(aim|shoot)-rifle-(front|back|side)$/.test(spec.key || '')) return 'rifle';
            if (/^(aim|shoot)-handgun-(front|back|side)$/.test(spec.key || '')) return 'shooting';
            if (/3q|three-quarter/.test(spec.view || '')) return Object.entries(kits).find(([, kit]) => kit.quarter && kit.match.test(spec.name || spec.key))?.[0] || null;
            if (this._activityKitSettings(spec.rootId).mode === 'overhead') return 'overhead';
            if (spec.kind === 'movement' && spec.key === 'pick-up-drop-side') return 'pickup';
            if (/^Pick Up (Center|Left|Right) \/ Drop Object$/i.test(spec.name || '')) {
                return spec.kind === 'movement' && /^pick-up-drop(?:-left|-right)?$/.test(spec.key)
                    && /^(front|back)(?:-3q-(?:left|right))?$/.test((spec.view || '').replace(':', '-')) ? 'pickup' : null;
            }
            return Object.entries(kits).find(([, kit]) => kit.match.test(spec.name || spec.key))?.[0] || null;
        },
        _activityKitSettings(rootId) {
            this._activityKitChoices ||= new Map();
            this._activityKitOwners ||= new Map();
            const root = this.objects.getObjectById(rootId);
            if (!this._activityKitChoices.has(rootId) || this._activityKitOwners.get(rootId) !== root) {
                this._activityKitChoices.set(rootId, clean(root?.activityKitSettings));
                this._activityKitOwners.set(rootId, root);
                this._activityKitFitContexts?.delete(rootId);
            }
            return this._activityKitChoices.get(rootId);
        },
        _activateActivityKitFit(spec) {
            if (!spec?.rootId) return;
            const settings = this._activityKitSettings(spec.rootId), kind = this._activityKitFor(spec);
            this._activityKitFitContexts ||= new Map();
            let context = this._activityKitFitContexts.get(spec.rootId);
            if (!context) {
                context = { kind: null, drafts: new Map(), initialized: false };
                this._activityKitFitContexts.set(spec.rootId, context);
            }
            if (context.kind === kind) return;
            if (context.kind) context.drafts.set(context.kind, fitFor(settings, context.kind));
            if (kind) {
                const stored = this.objects.getObjectById(spec.rootId)?.activityKitSettings;
                const fits = savedFits(stored?.fits);
                // Legacy projects have one fit. Use it for the first activity only.
                const fit = context.drafts.get(kind) || fits[kind]
                    || fitFor(context.initialized || stored?.fits ? defaults : settings, kind);
                Object.assign(settings, fit, { existing: '', chair: '', desk: '' });
                context.initialized = true;
            }
            context.kind = kind;
        },
        _activityPoint(obj, x, y) {
            const dir = StageObject.getJointDirectionMeta(obj.jointDirection), ratio = dir.isVertical ? y : x;
            return this._getArmatureContactPointWorldPosition(obj, {
                position: dir.isReverse ? 1 - ratio : ratio, crossOffset: dir.isVertical ? x : y
            });
        },
        _activityHeadCarryAnchor(head, point = (o, x, y) => this._activityPoint(o, x, y)) {
            const image = head._crossViewImages?.get(head.imageSrc)
                || (head.imageElement?.src === head.imageSrc ? head.imageElement : null);
            let top = .025;
            if (image?.complete && image.naturalWidth) {
                this._activityHeadTops ||= new Map();
                if (!this._activityHeadTops.has(head.imageSrc)) {
                    try {
                        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(image, 0, 0, 128, 128);
                        const pixels = ctx.getImageData(0, 0, 128, 128).data;
                        outer: for (let y = 0; y < 100; y++) for (let x = 48; x < 80; x++) {
                            if (pixels[(y * 128 + x) * 4 + 3] > 160) { top = y / 128; break outer; }
                        }
                    } catch (_) { /* Cross-origin artwork uses the head's standard crown anchor. */ }
                    if (this._activityHeadTops.size > 100) this._activityHeadTops.clear();
                    this._activityHeadTops.set(head.imageSrc, top);
                }
                top = this._activityHeadTops.get(head.imageSrc);
            }
            top = this._activityHeadTops?.get(head.imageSrc) ?? top;
            return point(head, .5, top);
        },
        async _compileActivityKitContinuity(rig, spec, snapshot, token) {
            const manager = this.objects, engine = this.animations;
            const held = manager.objects.filter(obj => {
                const before = snapshot.states.get(obj.id)?.json, asset = before?.sceneAsset;
                return before?.visible !== false && asset?.activityRootId === rig.root.id
                    && !['place', 'luggage', 'cart'].includes(asset.activityKit)
                    && (asset.activityAttachment === 'head' || asset.activityHandId || asset.characterTool && before.pinnedTo);
            });
            if (!held.length) return;
            const old = new Map(), beforeIds = new Map([...snapshot.states].map(([id, s]) => [id, new Set(s.json.animations?.map(a => a.id))]));
            let duration = 0;
            manager.objects.forEach(obj => {
                old.set(obj.id, obj.animations);
                obj.animations = obj.animations.filter(a => !beforeIds.get(obj.id)?.has(a.id));
                obj.animations.forEach(a => { duration = Math.max(duration, (Number(a.delay) || 0) + this._armatureTrackDuration(a)); });
            });
            const original = engine.originalStates, frames = new Map(held.map(o => [o.id, []])), arms = new Map(), supports = new Map();
            engine.originalStates = new Map([...snapshot.states].map(([id, s]) => [id, Utils.deepClone(original.get(id) || s.json)]));
            const items = new Map(Object.values(library.items).flat().map(item => [item.id, item]));
            const layer = obj => Number.isFinite(obj._armatureDrawLayer) ? obj._armatureDrawLayer : manager.objects.indexOf(obj);
            const count = Math.max(24, Math.min(600, Math.ceil(duration / 25)));
            try {
                for (let i = 0; duration && i <= count; i++) {
                    if (i % 12 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (token.cancelled) throw new Error('Action cancelled. No animation was added.'); }
                    const t = i / count;
                    engine.applyAnimationsAtTime(duration * t, { timelinePreview: true, finalPose: false }); manager._resolvePins();
                    const live = this._refreshDetectedArmatureReference(rig), head = live.parts['head-neck']?.obj;
                    const sources = Object.values(this._getArmatureContactSourceMap(live)).filter(s => /hand$/.test(s.key));
                    const view = this._getUniversalCharacterCurrentViewSwitchKey(live).replace(':', '-');
                    for (const obj of held) {
                        const base = snapshot.states.get(obj.id).json, fit = clean(base.sceneAsset.activityFit);
                        Object.assign(obj, { width: base.width, height: base.height, pivotX: base.pivotX, pivotY: base.pivotY,
                            rotation: base.rotation || 0, pinnedTo: null, pinJointId: null, pinJointName: null,
                            activityRootId: rig.root.id, sceneAsset: Utils.deepClone(base.sceneAsset), visible: true });
                        if (base.sceneAsset.activityAttachment === 'head' && head) {
                            const anchor = this._activityHeadCarryAnchor(head), unit = live.root.height;
                            obj.x = anchor.x - obj.width * .5 + unit * fit.offsetX / 100;
                            obj.y = anchor.y - obj.height + unit * fit.offsetY / 100;
                            const ordered = this._activityOverheadHands(sources, view);
                            for (const [n, source] of ordered.entries()) {
                                const target = this._activityPoint(obj, n === 0 ? .28 : .72, .98);
                                this._activitySupportOverhead(source, target, supports, n === 0 ? -1 : 1);
                                if (!arms.has(source.obj.id)) arms.set(source.obj.id, []);
                                arms.get(source.obj.id).push({ t, values: Object.fromEntries([...source.obj.joints].sort((a, b) => a.position - b.position).flatMap((j, k) => [[`jointAngle_${k}`, j.angle || 0], [`jointTiltX_${k}`, 0], [`jointTiltY_${k}`, 0]])) });
                            }
                            obj._armatureDrawLayer = Math.max(layer(head), ...sources.map(s => layer(s.obj))) + .01;
                        } else {
                            const source = sources.find(s => s.obj.id === (base.sceneAsset.activityHandId || base.pinnedTo));
                            if (!source) throw new Error('The held prop could not be matched to a hand in this view.');
                            const wrist = source.joints.find(j => /wrist/.test(j.name));
                            const grip = Number.isFinite(base.sceneAsset.activityGripRatio) ? base.sceneAsset.activityGripRatio : .45;
                            const hand = this._getArmatureEndEffectorWorldPosition({ ...source,
                                endPosition: wrist.position + (1 - wrist.position) * grip, endCrossOffset: wrist.crossOffset ?? .5 });
                            obj.x = hand.x - obj.width * obj.pivotX; obj.y = hand.y - obj.height * obj.pivotY;
                            obj.sceneAsset.activityHandId = source.obj.id;
                            const kind = base.sceneAsset.activityKit;
                            obj._armatureDrawLayer = view.startsWith('back') && ['phone', 'microphone', 'read', 'write', 'document', 'box', 'tray', 'cook', 'board'].includes(kind)
                                ? Math.min(...Object.values(live.parts).map(p => layer(p.obj))) - .1
                                : ['drink', 'eat', 'write', 'phone', 'document', 'box', 'tray', 'cook', 'board'].includes(kind) || view.startsWith('side') && kind === 'microphone' ? layer(source.obj) - .01 : layer(source.obj) + .01;
                            if (i === count && spec.kind === 'cross') {
                                obj.pinnedTo = source.obj.id; obj.pinTargetType = 'joint';
                                obj.pinJointId = wrist.id; obj.pinJointName = wrist.name;
                                obj.pinRotationMode = 'static'; obj.pinInheritRotation = false;
                                const offset = manager._getPinOffsetForChildTarget(source.obj, obj, hand.x, hand.y);
                                obj.pinOffsetX = offset.x; obj.pinOffsetY = offset.y;
                            }
                        }
                        const item = items.get(base.sceneAsset.propId), variants = base.sceneAsset.activityArtworks || item?.views;
                        const face = base.sceneAsset.activityKit === 'phone' ? (view.startsWith('side') ? 'call-back' : 'call-edge')
                            : base.sceneAsset.activityKit === 'selfie' && view.startsWith('side') ? `photo-${view}`
                            : view.startsWith('back') ? 'back' : view.replace('front-3q', 'three-quarter');
                        obj.sceneAsset.view = variants?.[face] ? face : 'front';
                        obj.imageSrc = base.sceneAsset.sequenceCustomArtwork || (variants ? url(variants[obj.sceneAsset.view] || item.svg) : base.imageSrc);
                        frames.get(obj.id).push({ t, values: { armatureViewState: ArmatureViewState.capture(obj), activityRootId: rig.root.id } });
                    }
                }
                arms.forEach((values, id) => manager.getObjectById(id).animations.push(track(`${spec.name}: overhead support`, duration, values)));
                for (const obj of held) if (frames.get(obj.id).length) {
                    obj.animations.push(track(`${spec.name}: held ${obj.name}`, duration, frames.get(obj.id)));
                    if (!original.has(obj.id)) original.set(obj.id, Utils.deepClone(snapshot.states.get(obj.id).json));
                }
            } finally {
                manager.objects.forEach(obj => { obj.animations = [...(old.get(obj.id) || []).filter(a => beforeIds.get(obj.id)?.has(a.id)), ...obj.animations]; });
                engine.originalStates = original;
                this._currentArmature = rig;
            }
        },
        _activityOverheadHands(sources, view) {
            if (view.startsWith('side')) {
                const left = view.endsWith('left') ? 'front-hand' : 'back-hand';
                return [...sources].sort((a, b) => Number(b.key === left) - Number(a.key === left));
            }
            return [...sources].sort((a, b) => a.obj.getJointWorldPosition(a.joints[0]).x - b.obj.getJointWorldPosition(b.joints[0]).x);
        },
        _activitySupportOverhead(source, target, cache, outward) {
            // Supporting a load replaces the gait's depth swing as well as its arm angles.
            source.joints.forEach(j => { j.tiltX = 0; j.tiltY = 0; });
            const wrist = source.joints.find(j => /wrist/.test(j.name));
            const arm = { ...source, endPosition: wrist.position + (1 - wrist.position) * .45,
                endCrossOffset: wrist.crossOffset ?? .5, joints: source.joints.filter(j => !/wrist/.test(j.name)) };
            const previous = cache?.get(source.obj.id);
            const seeds = [...(previous ? [previous] : []), [140, 70, 0], [-140, -70, 0], [140, -70, 0], [-140, 70, 0],
                [110, -70, 0], [-110, 70, 0], [110, 70, 0], [-110, -70, 0]];
            const shoulder = arm.joints[0], limits = { min: shoulder.minAngle, max: shoulder.maxAngle };
            const elbow = arm.joints.find(j => /elbow/.test(j.name));
            const origin = this._getArmatureContactPointWorldPosition(source.obj, shoulder);
            outward ||= Math.sign(origin.x - target.x) || -1;
            // A raised arm may pass vertical as the torso tilts. Keep the same angle branch.
            shoulder.minAngle ??= -270; shoulder.maxAngle ??= 270;
            let best = null, error = Infinity;
            for (const seed of seeds) {
                source.joints.forEach((j, i) => { j.angle = seed[i] || 0; });
                this._solveArmatureContactIK(arm, target.x, target.y, 96, { keepElbowDown: false, preserveBend: true, shoulderLimit: 270, elbowLimit: 145 });
                const hand = this._getArmatureEndEffectorWorldPosition(arm), distance = Math.hypot(target.x - hand.x, target.y - hand.y);
                const bend = this._getArmatureContactPointWorldPosition(source.obj, elbow);
                const boundary = outward < 0 ? Math.min(origin.x, target.x) : Math.max(origin.x, target.x);
                const inward = Math.max(0, (boundary - bend.x) * outward);
                // A correct wrist contact is not enough: keep the elbow outside the head.
                const score = distance + inward * 8;
                if (score < error) { error = score; best = source.joints.map(j => j.angle); }
                if (seed === previous && inward < .5) break;
            }
            if (previous) best = best.map((angle, i) => previous[i] + ((angle - previous[i] + 180) % 360 + 360) % 360 - 180);
            source.joints.forEach((j, i) => { j.angle = best[i]; });
            if (limits.min === undefined) delete shoulder.minAngle; else shoulder.minAngle = limits.min;
            if (limits.max === undefined) delete shoulder.maxAngle; else shoulder.maxAngle = limits.max;
            cache?.set(source.obj.id, best);
        },
        _saveActivityKitFit(rig, settings) {
            const spec = this._armatureSelectedAction;
            const kind = spec?.rootId === rig.root.id ? this._activityKitFor(spec)
                : this._activityKitFitContexts?.get(rig.root.id)?.kind || (settings.mode === 'overhead' ? 'overhead' : null);
            const fits = savedFits(rig.root.activityKitSettings?.fits);
            if (kind) fits[kind] = fitFor(settings, kind);
            rig.root.activityKitSettings = { ...clean(settings), existing: '', chair: '', desk: '', fits };
            eventBus.emit('history:push'); eventBus.emit('objects:updated');
        },
        _mountActivityKitControls(host, rig) {
            if (/3q|three-quarter/.test(this._getUniversalCharacterCurrentViewSwitchKey(rig)) && !this._activityKitFor(this._armatureSelectedAction)) return;
            const settings = this._activityKitSettings(rig.root.id), escape = text => this._escapeHtml(String(text));
            const details = document.createElement('details');
            details.className = 'activity-kit-controls';
            details.dataset.rootId = rig.root.id;
            details.innerHTML = `<summary><i class="fas fa-toolbox"></i> Activity Kit</summary>
                <label class="armature-recording-check"><input type="checkbox" data-kit="enabled">Include activity props</label>
                <output data-kit="match" aria-live="polite"></output>
                <div data-kit-replacement></div>
                <label>Kit<select data-kit="mode"><option value="auto">Automatic</option><option value="overhead">Overhead Carry</option></select></label>
                <label>Prop<select data-kit="prop"><option value="">Automatic</option>${[...new Set(Object.values(kits).flatMap(k => k.props))].map(id => {
                    const p = Object.values(library.items).flat().find(p => p.id === id); return `<option value="${id}">${escape(p.name)}</option>`;
                }).join('')}</select></label>
                <label>Hand<select data-kit="hand"><option value="auto">Automatic</option><option value="primary">Right / front hand</option><option value="other">Left / back hand</option></select></label>
                <label>Existing prop<select data-kit="existing"></select></label>
                <label class="armature-recording-check"><input type="checkbox" data-kit="furniture">Include furniture</label>
                <div class="activity-kit-grid"><label>Chair<select data-kit="chair"></select></label><label>Desk<select data-kit="desk"></select></label></div>
                <label>Prop size<input type="range" data-kit="scale" min="0.5" max="1.8" step="0.05"></label>
                <label>Prop rotation<input type="range" data-kit="rotation" min="-90" max="90" step="1"></label>
                <label data-kit-lid>Laptop window opacity<input type="range" data-kit="lidOpacity" min="0.15" max="1" step="0.05"></label>
                <label>Board window opacity<input type="range" data-kit="boardOpacity" min="0" max="1" step="0.05"></label>
                <label>Handle extension<input type="range" data-kit="handleLength" min="0.5" max="1.5" step="0.05"></label>
                <div class="activity-kit-grid"><label>Grip X (%)<input type="number" data-kit="offsetX" min="-50" max="50" step="1"></label><label>Grip Y (%)<input type="number" data-kit="offsetY" min="-50" max="50" step="1"></label></div>
                <div class="activity-kit-save activity-kit-fit-actions"><button type="button" class="btn-small" data-kit="save-fit" title="Save this activity's fit with the character"><i class="fas fa-save"></i> Save activity fit</button><button type="button" class="btn-small" data-kit="reset-fit" title="Reset size, grip and rotation" aria-label="Reset fit"><i class="fas fa-undo"></i></button></div>
                <label class="armature-recording-check"><input type="checkbox" data-kit="keep">Keep props after action</label>
                <label class="armature-recording-check"><input type="checkbox" data-kit="muzzleFlash">Muzzle flash</label>
                <label>Recoil strength<input type="range" data-kit="recoilStrength" min="0" max="2" step="0.1"></label>
                <label>Emoji cue<select data-kit="emoji"><option value="">None</option>${['thinking', 'light-bulb', 'party-face', 'heart-eyes', 'thumbs-up'].map(id => {
                    const item = global.EmojiLibraryData?.items.find(e => e.id === id); return item ? `<option value="${id}">${escape(item.name)}</option>` : '';
                }).join('')}</select></label>
                <div class="activity-kit-grid"><label>Cue start (%)<input type="number" data-kit="cueStart" min="0" max="95" step="5"></label><label>Cue end (%)<input type="number" data-kit="cueEnd" min="5" max="100" step="5"></label></div>
                <label>Saved kit<select data-kit="saved"><option value="">Custom</option></select></label>
                <div class="activity-kit-save"><input type="text" data-kit="name" maxlength="60" aria-label="Kit name" placeholder="Kit name"><button type="button" class="btn-small" data-kit="save" title="Save kit settings in this browser" aria-label="Save kit"><i class="fas fa-save"></i></button><button type="button" class="btn-small" data-kit="delete" title="Delete saved kit" aria-label="Delete saved kit"><i class="fas fa-trash"></i></button></div>`;
            host.append(details);
            const select = key => details.querySelector(`[data-kit="${key}"]`);
            const editable = this.objects.objects.filter(o => o.sceneAsset && !o.locked && !o.pinnedTo && !o.animations?.length && !o._svgCharacterConfig && !o._ucRole);
            for (const key of ['existing', 'chair', 'desk']) {
                select(key).add(new Option('Add new', ''));
                for (const obj of editable) {
                    if (key === 'chair' && obj.sceneAsset.propId !== 'chair') continue;
                    if (key === 'desk' && obj.sceneAsset.propId !== 'table') continue;
                    const option = new Option(obj.name || obj.id, obj.id);
                    option.dataset.propId = obj.sceneAsset.propId;
                    select(key).add(option);
                }
                if (key !== 'existing') select(key).title = 'Fit this furniture to the selected activity';
            }
            const sync = () => {
                for (const [key, value] of Object.entries(settings)) {
                    const el = select(key); if (!el) continue;
                    if (el.type === 'checkbox') el.checked = value;
                    else el.value = key.startsWith('cue') ? Math.round(value * 100) : value;
                }
            };
            const storageKey = 'animationstage.activity-kits.v1';
            let saved = {};
            try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch (_) {}
            const refreshSaved = () => {
                select('saved').replaceChildren(new Option('Custom', ''));
                Object.keys(saved).slice(0, 50).forEach(name => select('saved').add(new Option(name, name)));
            };
            const prepare = () => { this._stopArmatureClipPreview(); this._armaturePreparedAction = null;
                if (this._armatureSelectedAction) this._prepareSelectedArmatureAction(); };
            details.addEventListener('change', e => {
                const key = e.target.dataset.kit;
                if (key === 'saved') {
                    if (Object.hasOwn(saved, e.target.value)) {
                        const selected = clean(saved[e.target.value]);
                        settings.mode = selected.mode;
                        this._activateActivityKitFit(this._armatureSelectedAction);
                        Object.assign(settings, selected, { existing: '', chair: '', desk: '' });
                    }
                    sync(); this._refreshActivityKitControls(); prepare(); return;
                }
                if (!Object.hasOwn(defaults, key)) return;
                if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
                settings[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' || e.target.type === 'range'
                    ? Number(e.target.value) / (key.startsWith('cue') ? 100 : 1) : e.target.value;
                Object.assign(settings, clean(settings));
                this._refreshActivityKitControls();
                prepare();
            });
            details.addEventListener('click', e => {
                const key = e.target.closest('button')?.dataset.kit;
                if (key === 'save-fit') { this._saveActivityKitFit(rig, settings); Utils.showToast('Activity fit saved with character.', 'success'); return; }
                if (key === 'reset-fit') { Object.assign(settings, { scale: 1, offsetX: 0, offsetY: 0, rotation: 0, lidOpacity: .45, boardOpacity: .22, handleLength: 1 }); sync(); prepare(); return; }
                if (!['save', 'delete'].includes(key)) return;
                const name = key === 'save' ? select('name').value.trim() : select('saved').value;
                if (!name || ['__proto__', 'constructor', 'prototype'].includes(name)) return;
                if (key === 'save') saved[name] = { ...settings, existing: '', chair: '', desk: '' }; else delete saved[name];
                try { localStorage.setItem(storageKey, JSON.stringify(saved)); refreshSaved(); select('saved').value = key === 'save' ? name : ''; }
                catch (_) { Utils.showToast('Kit settings could not be saved in this browser.', 'warning'); }
            });
            refreshSaved(); sync(); this._refreshActivityKitControls();
        },
        _refreshActivityKitControls() {
            this._activateActivityKitFit(this._armatureSelectedAction);
            const host = document.querySelector('.activity-kit-controls'); if (!host) return;
            const spec = this._armatureSelectedAction?.rootId === host.dataset.rootId ? this._armatureSelectedAction : null;
            const settings = this._activityKitSettings(host.dataset.rootId);
            const kit = this._activityKitFor(spec);
            for (const [key, value] of Object.entries(settings)) {
                const el = host.querySelector(`[data-kit="${key}"]`); if (!el) continue;
                if (el.type === 'checkbox') el.checked = value;
                else el.value = key.startsWith('cue') ? Math.round(value * 100) : value;
            }
            host.querySelector('[data-kit="match"]').textContent = kit ? kits[kit].name : spec?.kind === 'cross' ? 'Held prop continuity' : 'No matching prop kit';
            const prop = host.querySelector('[data-kit="prop"]');
            for (const option of prop.options) option.hidden = !!option.value && (!kit || !kits[kit].props.includes(option.value));
            if (prop.selectedOptions[0]?.hidden) {
                prop.value = '';
                if (kit) settings.prop = '';
            }
            const existing = host.querySelector('[data-kit="existing"]');
            host.querySelector('[data-kit-lid]').hidden = kit !== 'type' || !!prop.value && prop.value !== 'laptop';
            for (const option of existing.options) option.hidden = !!option.value && (!kit || option.dataset.propId !== (prop.value || kits[kit].props[0]));
            if (existing.selectedOptions[0]?.hidden) {
                existing.value = '';
                if (kit) settings.existing = '';
            }
            const show = (key, visible) => { host.querySelector(`[data-kit="${key}"]`).closest('label').hidden = !visible; };
            const tools = settings.enabled && !!kit, seated = seatedActivity(spec, kit);
            this._refreshActivityKitReplacementControls?.(host, settings, tools);
            show('muzzleFlash', tools && ['shooting', 'rifle'].includes(kit) && spec.kind === 'movement');
            show('recoilStrength', ['shooting', 'rifle'].includes(kit) && spec.kind === 'movement');
            for (const key of ['prop', 'existing', 'scale', 'rotation', 'offsetX', 'offsetY', 'keep']) show(key, tools);
            if (kit === 'fold' || kit === 'wash') for (const key of ['rotation', 'offsetX', 'offsetY']) show(key, false);
            show('mode', settings.enabled);
            show('hand', tools && !['overhead', 'type', 'wash'].includes(kit));
            show('furniture', tools && (seated || kits[kit]?.desk || ['board', 'shelf'].includes(kit)));
            show('boardOpacity', tools && kit === 'board' && spec?.view === 'front');
            show('handleLength', tools && kit === 'luggage' && spec?.view?.startsWith('side'));
            show('chair', tools && settings.furniture && seated);
            show('desk', tools && settings.furniture && !!kits[kit]?.desk);
            show('emoji', settings.enabled);
            for (const key of ['cueStart', 'cueEnd']) show(key, settings.enabled && !!settings.emoji);
            host.querySelector('[data-kit-lid]').hidden ||= !tools;
            host.querySelector('.activity-kit-fit-actions').hidden = !tools;
            host.querySelector('[data-kit="save-fit"]').disabled = !tools;
            for (const group of host.querySelectorAll('.activity-kit-grid')) {
                group.hidden = [...group.children].every(child => child.hidden);
            }
        },
        async _compileActivityKit(rig, spec, snapshot, token) {
            if (/3q|three-quarter/.test(this._getUniversalCharacterCurrentViewSwitchKey(rig)) && !this._activityKitFor(spec)) return;
            if (spec.kind === 'cross') return this._compileActivityKitContinuity(rig, spec, snapshot, token);
            const settings = clean(this._activityKitSettings(rig.root.id)), kind = this._activityKitFor(spec);
            if (['movement', 'pose'].includes(spec.kind) && !kind) await this._compileActivityKitContinuity(rig, spec, snapshot, token);
            if (!settings.enabled || (!kind && !settings.emoji)) return;
            if (settings.emoji && settings.cueEnd <= settings.cueStart) throw new Error('Emoji cue end must be after its start.');
            const kit = kits[kind], manager = this.objects, engine = this.animations;
            const items = new Map(Object.values(library.items).flat().map(p => [p.id, p]));
            if (kit && settings.prop && !kit.props.includes(settings.prop)) throw new Error(`Choose a compatible ${kit.name.toLowerCase()} prop or Automatic.`);
            const oldTracks = new Map(), beforeIds = new Map([...snapshot.states].map(([id, state]) => [id, new Set(state.json.animations?.map(a => a.id))]));
            let duration = 0;
            manager.objects.forEach(o => {
                oldTracks.set(o.id, o.animations);
                o.animations = o.animations.filter(a => !beforeIds.get(o.id)?.has(a.id));
                o.animations.forEach(a => { duration = Math.max(duration, (Number(a.delay) || 0) + this._armatureTrackDuration(a)); });
            });
            if (!duration) { oldTracks.forEach((tracks, id) => { manager.getObjectById(id).animations = tracks; }); return; }
            const originalMap = engine.originalStates;
            engine.originalStates = new Map([...snapshot.states].map(([id, state]) => [id, Utils.deepClone(state.json)]));
            const props = [], captures = new Map(), armFrames = new Map(), reused = new Set();
            const sample = time => { engine.applyAnimationsAtTime(time, { timelinePreview: true, finalPose: false }); manager._resolvePins(); };
            const point = (o, x, y) => {
                const dir = StageObject.getJointDirectionMeta(o.jointDirection);
                const ratio = dir.isVertical ? y : x;
                return this._getArmatureContactPointWorldPosition(o, { position: dir.isReverse ? 1 - ratio : ratio, crossOffset: dir.isVertical ? x : y });
            };
            const makeProp = (id, existing = '', role = id) => {
                if (settings.propReplacements[role]) existing = '';
                let obj = existing ? manager.getObjectById(existing) : null;
                if (existing && (!obj || obj.locked || obj.pinnedTo || oldTracks.get(existing)?.length || obj.sceneAsset?.propId !== id || reused.has(existing))) throw new Error(`Choose an unlocked, unanimated ${items.get(id)?.name || id}, or Add new.`);
                if (obj) reused.add(existing);
                const item = items.get(id); if (!item) throw new Error(`Missing activity prop: ${id}`);
                if (!obj) {
                    obj = new StageObject('image', { name: `${item.name} (${spec.name})`, width: item.w, height: item.h,
                        imageSrc: url(item.svg), strokeWidth: 0, visible: false, lockAspectRatio: true,
                        sceneAsset: { ...(global.SceneDesign?.metadata(id) || {}), activityKit: kind || 'emoji', activityRootId: rig.root.id, activityRole: role } });
                    manager.objects.push(obj);
                }
                props.push({ obj, item, existing: !!existing, role }); captures.set(obj.id, []);
                if (!engine.originalStates.has(obj.id)) engine.originalStates.set(obj.id, Utils.deepClone(obj.toJSON()));
                return obj;
            };
            try {
                sample(duration * .55);
                const torso = rig.parts.torso?.obj || rig.root, head = rig.parts['head-neck']?.obj;
                const mouthAnchor = ['drink', 'eat', 'microphone'].includes(kind) ? svgFeatureAnchor(head?.imageSrc) : null;
                const view = this._getUniversalCharacterCurrentViewSwitchKey(rig).replace(':', '-'), side = view.startsWith('side'), rear = view.startsWith('back');
                const direction = /left/.test(view) ? -1 : 1;
                const floorTool = kind === 'sweep' || kind === 'mop';
                const earAnchor = side && kind === 'phone' ? svgFeatureAnchor(head?.imageSrc, 'ear') : null;
                const eyeAnchor = side && kind === 'selfie' ? svgFeatureAnchor(head?.imageSrc, 'eye') : null;
                let sources = Object.values(this._getArmatureContactSourceMap(rig)).filter(s => /hand$/.test(s.key));
                if (kit && !sources.length) throw new Error('This character needs wrist joints for Activity Kits.');
                if (kit) for (const source of sources) {
                    for (const joint of ['shoulder', 'elbow', 'wrist']) {
                        if (!source.joints?.some(item => String(item.name).includes(joint) && Number.isFinite(item.position))) {
                            throw new Error(`${source.key} needs a valid ${joint} joint for Activity Kits.`);
                        }
                    }
                }
                let primary = sources.find(s => s.key === (side ? 'front-hand' : 'right-hand')) || sources[0];
                let secondary = sources.find(s => s !== primary);
                if (settings.hand === 'other' && secondary) [primary, secondary] = [secondary, primary];
                if (kind === 'pickup' && settings.hand === 'auto' && spec.key.endsWith('-left') && secondary) [primary, secondary] = [secondary, primary];
                const primaryKey = primary?.key, secondaryKey = secondary?.key;
                const handSide = primary ? Math.sign(primary.obj.getJointWorldPosition(primary.joints[0]).x - (torso.x + torso.width / 2)) || -1 : -1;
                if (kit?.twoHands && !secondary) throw new Error('This activity needs two mapped arms.');
                if (kind === 'overhead' && !head) throw new Error('Overhead carrying needs a mapped head.');
                const unit = Math.max(30, torso.height), torsoCenter = point(torso, .5, .65);
                const grounds = Object.values(this._getArmatureContactSourceMap(rig)).filter(s => /foot$/.test(s.key)).map(s => this._getArmatureFootSole(s)?.y).filter(Number.isFinite);
                const bounds = Object.values(rig.parts).map(p => p.obj.getBounds());
                const ground = grounds.length ? Math.max(...grounds) : Math.max(...bounds.map(b => b.y + b.height));
                const surfaceActivity = kind === 'fold' || kind === 'wash';
                const deskY = torsoCenter.y + unit * (kind === 'cook' && !side ? .32 : surfaceActivity ? .12 : kind === 'place' ? (side ? .18 : .28) : .08);
                const deskX = side ? torsoCenter.x + direction * unit * (surfaceActivity ? .26 : kind === 'place' ? .44 : .56) : torsoCenter.x;
                const seated = seatedActivity(spec, kind);
                const drawLayer = obj => Number.isFinite(obj._armatureDrawLayer) ? obj._armatureDrawLayer : manager.objects.indexOf(obj);
                const floorLayers = Object.values(rig.parts).map(p => drawLayer(p.obj));
                const minLayer = Math.min(...floorLayers), maxLayer = Math.max(...floorLayers);
                const furniture = [];
                const artworkY = (item, y) => {
                    const fit = Math.min(item.w / 200, item.h / 180);
                    return ((item.h - 180 * fit) / 2 + y * fit) / item.h;
                };
                if (kit && settings.furniture && seated) {
                    const chair = makeProp('chair', settings.chair, 'chair');
                    const item = items.get('chair');
                    const legs = Object.values(this._getArmatureContactSourceMap(rig)).filter(source => /foot$/.test(source.key));
                    const supports = legs.map(source => {
                        const hip = this._getArmatureContactPointWorldPosition(source.obj, source.joints.find(j => /hip/.test(j.name)));
                        const knee = this._getArmatureContactPointWorldPosition(source.obj, source.joints.find(j => /knee/.test(j.name)));
                        // The seat supports the underside of the thigh, not the shirt hem.
                        return { x: hip.x, y: hip.y + Math.max(0, knee.y - hip.y) * .65 + source.obj.width * Math.abs(source.obj.scaleX ?? 1) * .3 };
                    });
                    const seat = supports.length ? { x: supports.reduce((sum, p) => sum + p.x, 0) / supports.length,
                        y: supports.reduce((sum, p) => sum + p.y, 0) / supports.length } : point(torso, .5, .98);
                    const ratio = side ? artworkY(item, 96) : !rear && view.includes('3q') ? artworkY(item, 118) : 52 / 110;
                    const bottom = side || (!rear && view.includes('3q')) ? artworkY(item, 168) : 106 / 110;
                    chair.height = Math.max(unit * .65, (ground - seat.y) / (bottom - ratio));
                    chair.width = side ? unit * .85 : unit * .9;
                    chair.x = seat.x - chair.width * (side ? (direction > 0 ? .53 : .47) : .5);
                    chair.y = ground - chair.height * bottom;
                    chair._armatureDrawLayer = rear ? maxLayer + 1 : minLayer - 2;
                    if (!settings.chair) {
                        const back = unit * .64;
                        chair.y = seat.y - back;
                        chair.height = ground - chair.y;
                        chair.sceneAsset.activityArtworks = Object.fromEntries(['front', 'back', 'side-right', 'side-left', 'three-quarter-right', 'three-quarter-left'].map(v => [v, chairArt(chair.width, chair.height, back, v)]));
                    }
                    furniture.push(chair);
                }
                if (kit?.desk && settings.furniture) {
                    const desk = makeProp('table', settings.desk, 'desk');
                    const item = items.get('table');
                    const ratio = global.SceneDesign.surfaceRatio({ sceneAsset: global.SceneDesign.metadata('table', { view: rear ? 'back' : view }) });
                    const bottom = side || (!rear && view.includes('3q')) ? artworkY(item, 168) : 84 / 90;
                    desk.height = Math.max(unit * .75, (ground - deskY) / (bottom - ratio)); desk.width = unit * (side ? (kind === 'fold' ? 1.6 : surfaceActivity ? 1.2 : 2.1) : 1.8);
                    desk.x = deskX + (side ? direction * unit * .25 : 0) - desk.width * .5; desk.y = deskY - desk.height * ratio;
                    desk._armatureDrawLayer = rear ? minLayer - 2 : drawLayer(torso) + .4;
                    furniture.push(desk);
                }
                const main = kit ? makeProp(settings.prop || kit.props[0], settings.existing, 'tool') : null;
                const flash = ['shooting', 'rifle'].includes(kind) && settings.muzzleFlash && spec.kind === 'movement' ? makeProp('activity-muzzle-flash', '', 'flash') : null;
                const clothBase = kind === 'fold' ? makeProp('activity-folding-cloth', '', 'cloth-base') : null;
                const foldDirection = side ? direction : -handSide;
                const foldHalf = unit * (side ? .34 : .46) * settings.scale;
                let foldGrip = .55;
                const clothHeight = unit * (side ? .09 : .18) * settings.scale;
                if (clothBase) {
                    // Grip inside the cloth edge so larger fabric does not overextend either arm.
                    for (const source of [primary, secondary]) {
                        const shoulder = this._getArmatureContactPointWorldPosition(source.obj, source.joints[0]);
                        const elbow = this._getArmatureContactPointWorldPosition(source.obj, source.joints.find(j => /elbow/.test(j.name)));
                        const wrist = source.joints.find(j => /wrist/.test(j.name));
                        const tip = this._getArmatureEndEffectorWorldPosition({ ...source, endPosition: wrist.position + (1 - wrist.position) * .45, endCrossOffset: wrist.crossOffset ?? .5 });
                        const reach = (Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y) + Math.hypot(tip.x - elbow.x, tip.y - elbow.y)) * .97;
                        const dy = deskY - clothHeight * .6 - shoulder.y;
                        const span = Math.sqrt(Math.max(0, reach * reach - dy * dy)) - Math.abs(deskX - shoulder.x);
                        foldGrip = Math.max(.01, Math.min(foldGrip, span / foldHalf));
                    }
                    main.sceneAsset.activityFoldGripRatio = foldGrip;
                    main.sceneAsset.activitySurfaceHandIds = [primary.obj.id, secondary.obj.id];
                    clothBase.width = foldHalf; clothBase.height = clothHeight;
                    clothBase.x = deskX + (foldDirection < 0 ? -foldHalf : 0); clothBase.y = deskY - clothHeight;
                    clothBase._armatureDrawLayer = rear ? minLayer - 1 : maxLayer + 1;
                    furniture.push(clothBase);
                }
                const plate = kind === 'eat' ? makeProp('activity-plate', '', 'plate') : null;
                const food = kind === 'eat' && main?.sceneAsset?.propId === 'activity-spoon'
                    ? makeProp('activity-spoon-food', '', 'food') : null;
                const biteFrames = [];
                if (plate) { plate.width = unit * .45 * settings.scale; plate.height = plate.width * .3; }
                const pot = kind === 'cook' ? makeProp('activity-open-pot', '', 'pot') : null;
                if (pot) {
                    pot.width = unit * .66 * settings.scale; pot.height = pot.width * 76 / 120;
                    pot.x = deskX - pot.width / 2; pot.y = deskY + (side ? 0 : unit * .025) - pot.height * 69 / 76;
                    pot._armatureDrawLayer = rear ? minLayer - 1 : drawLayer(torso) + .6;
                    furniture.push(pot);
                }
                const board = kind === 'board' && settings.furniture ? makeProp('blackboard', '', 'board') : null;
                const boardContact = { x: torsoCenter.x + (side ? direction * unit * .65 : 0), y: torso.y + unit * (side ? .12 : .6) };
                if (board) {
                    board.width = unit * (side ? .65 : 1.15); board.height = unit * (side ? 1.05 : .72);
                    board.x = boardContact.x - board.width * .5; board.y = boardContact.y - board.height * .5;
                    board._armatureDrawLayer = rear || side ? minLayer - 1 : maxLayer + 1;
                    if (!rear && !side) board.sceneAsset.activityArtworks = {
                        front: svg(150, 100, `<path d="M8 8 H142 V86 H8Z M16 16 V78 H134 V16Z" fill="#704827" fill-rule="evenodd"/><path d="M16 16 H134 V78 H16Z M28 29 V69 H122 V29Z" fill="#2f4a3a" fill-rule="evenodd"/><rect data-activity-board-window="true" x="28" y="29" width="94" height="40" fill="#2f4a3a" opacity="${settings.boardOpacity}"/><path d="M34 39 H100 M34 54 H87" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/><rect x="24" y="80" width="102" height="8" rx="2" fill="#a86b34"/>`)
                    };
                    furniture.push(board);
                }
                const shelfContact = { x: torsoCenter.x + (side ? direction : handSide) * unit * .5, y: torso.y + unit * .38 };
                const shelf = kind === 'shelf' && settings.furniture ? makeProp('activity-shelf', '', 'shelf') : null;
                if (shelf) {
                    shelf.width = unit * .7; shelf.height = unit * .38;
                    shelf.x = shelfContact.x - shelf.width / 2; shelf.y = shelfContact.y - shelf.height * .6;
                    shelf._armatureDrawLayer = minLayer - 1; furniture.push(shelf);
                }
                let paper = null;
                if (kind === 'write') {
                    paper = makeProp('writing-paper'); paper.width = unit * .6;
                    paper.height = unit * (side ? .018 : .065);
                    paper.x = deskX - paper.width / 2; paper.y = deskY - (side ? paper.height * .8 : 0);
                    paper._armatureDrawLayer = rear ? minLayer - 1.5 : drawLayer(torso) + .6; furniture.push(paper);
                }
                const cupDirection = side ? direction : handSide;
                if (main) {
                    const item = props.find(p => p.obj === main).item;
                    main.height = unit * (floorTool ? 1.9 : kind === 'read' ? .36 : kind === 'type' ? (side ? .78 : .48) : kind === 'write' ? .28 : .3) * settings.scale;
                    if (kind === 'fan') main.height = unit * .48 * settings.scale;
                    if (kind === 'shaker') main.height = unit * .3 * settings.scale;
                    if (kind === 'drink') main.height = Math.min(unit * .17, (head?.height || unit) * .27) * settings.scale;
                    if (kind === 'microphone') main.height = unit * .24 * settings.scale;
                    if (kind === 'phone' || kind === 'selfie') main.height = Math.min(unit * .22, (head?.height || unit) * .48) * settings.scale;
                    if (kind === 'carry') main.height = unit * .4 * settings.scale;
                    if (kind === 'document') main.height = unit * .43 * settings.scale;
                    if (kind === 'board') main.height = unit * .034 * settings.scale;
                    if (kind === 'cook') main.height = unit * .32 * settings.scale;
                    if (kind === 'place') main.height = unit * .24 * settings.scale;
                    if (kind === 'luggage') main.height = unit * 1.55 * settings.scale;
                    if (kind === 'shelf') main.height = unit * .22 * settings.scale;
                    if (kind === 'cart') main.height = (ground - torsoCenter.y - unit * .12) / (116 / 130);
                    if (kind === 'eat') main.height = unit * .048 * settings.scale;
                    if (kind === 'pickup') main.height = unit * (side ? .25 : .42) * settings.scale;
                    main.width = main.height * item.w / item.h;
                    if (kind === 'cart') main.width = unit * (side ? 1.05 : 1.2) * settings.scale;
                    if (kind === 'fold') { main.width = foldHalf; main.height = clothHeight; }
                    if (kind === 'wash') { main.width = unit * .8 * settings.scale; main.height = unit * .32 * settings.scale; }
                    if (kind === 'tray' || kind === 'box') {
                        main.width = unit * (kind === 'tray' ? .8 : .65) * settings.scale;
                        main.height = main.width * item.h / item.w;
                    }
                    if (kind === 'overhead') { main.width = unit * .92 * settings.scale; main.height = main.width * item.h / item.w; }
                    const grip = kind === 'cart' ? { x: side ? (direction > 0 ? .15 : .85) : (handSide < 0 ? .25 : .75), y: 12 / 130 }
                        : kind === 'shelf' ? { x: .5, y: .65 }
                        : kind === 'read' ? { x: side ? (direction > 0 ? .3 : .7) : (handSide < 0 ? .12 : .88), y: side ? .76 : .72 }
                        : kind === 'box' || kind === 'tray' ? { x: side ? (direction > 0 ? .35 : .65) : (handSide < 0 ? .12 : .88), y: .9 }
                        : floorTool ? { x: kind === 'sweep' ? 43 / 85 : .5, y: .25 } : kind === 'write' && side ? { x: .5, y: .78 }
                        : kind === 'phone' && side ? { x: .5, y: .86 }
                        : kind === 'drink' ? { x: cupDirection < 0 ? .18 : .82, y: .5 } : item.handGrip || { x: .5, y: .65 };
                    main.pivotX = Math.max(0, Math.min(1, grip.x + settings.offsetX / 100));
                    main.pivotY = Math.max(0, Math.min(1, grip.y + settings.offsetY / 100));
                    if (kit.support && (rear || side && direction < 0)) main.pivotX = 1 - main.pivotX;
                    if (kind === 'flashlight') main.pivotX = side ? (direction > 0 ? .28 : .72) : .5;
                    if (kind === 'tablet' && side) { main.pivotX = direction > 0 ? .25 : .75; main.pivotY = .3; }
                    if (kind === 'rifle') {
                        const quarter = /3q|three-quarter/.test(view);
                        const x = side ? .30 : quarter ? .43 : .5;
                        main.pivotX = (direction < 0 && (side || quarter) ? 1 - x : x) + settings.offsetX / 100;
                    }
                    if (kind === 'eat' && cupDirection < 0) main.pivotX = 1 - main.pivotX;
                    if (kind === 'pickup' && handSide > 0) main.pivotX = 1 - main.pivotX;
                    if (kind === 'overhead') { main.pivotX = .5; main.pivotY = 1; }
                    if (floorTool) {
                        main.height = Math.max(unit * 1.6, (ground - torsoCenter.y - unit * .09) / Math.max(.2, .95 - main.pivotY)) * settings.scale;
                        main.width = main.height * .22;
                    }
                    if (!['type', 'pickup', 'overhead', 'place', 'luggage', 'cart', 'shelf', 'fold', 'wash'].includes(kind) && !settings.existing) {
                        const wrist = primary.joints.find(j => /wrist/.test(j.name));
                        main.pinnedTo = primary.obj.id; main.pinTargetType = 'joint'; main.pinJointId = wrist.id; main.pinJointName = wrist.name;
                        main.pinRotationMode = 'static'; main.pinInheritRotation = false; main.pinOffsetX = 0; main.pinOffsetY = 0;
                        main.sceneAsset.characterTool = true;
                        manager.objects.splice(manager.objects.indexOf(main), 1); manager.objects.splice(manager.objects.indexOf(primary.obj) + 1, 0, main);
                    }
                    main.sceneAsset.activityAttachment = kind === 'overhead' ? 'head' : main.pinnedTo ? 'hand' : null;
                    if (main.pinnedTo || ['place', 'luggage', 'cart', 'shelf'].includes(kind)) main.sceneAsset.activityHandId = primary.obj.id;
                    main.sceneAsset.activityGripRatio = kind === 'write' && side ? .80 : .45;
                    main.sceneAsset.activityFit = { ...settings, existing: '', chair: '', desk: '' };
                }
                if (food) {
                    // Save the attachment before originalStates captures the playback baseline.
                    for (const key of ['x', 'y', 'width', 'height', 'pivotX', 'pivotY', 'rotation', 'pinnedTo', 'pinTargetType', 'pinJointId', 'pinJointName', 'pinRotationMode', 'pinInheritRotation', 'pinOffsetX', 'pinOffsetY']) food[key] = main[key];
                    for (const key of ['characterTool', 'activityAttachment', 'activityHandId', 'activityGripRatio', 'activityFit']) food.sceneAsset[key] = main.sceneAsset[key];
                }
                let emoji = null;
                const emojiItem = global.EmojiLibraryData?.items.find(e => e.id === settings.emoji);
                if (emojiItem) {
                    emoji = new StageObject('image', { name: `Cue: ${emojiItem.name}`, width: unit * .4, height: unit * .4,
                        imageSrc: url(global.EmojiLibraryData.renderSvg(emojiItem)), visible: false, strokeWidth: 0,
                        sceneAsset: { activityRootId: rig.root.id, activityRole: 'emoji', activityKit: kind || 'emoji' } });
                    manager.objects.push(emoji); props.push({ obj: emoji, role: 'emoji' }); captures.set(emoji.id, []);
                }
                const selectedView = view.replace('front-3q', 'three-quarter').replace('back-3q', 'three-quarter');
                for (const entry of props) {
                    const obj = entry.obj;
                    if (entry.item && !entry.existing) {
                        if (entry.item.id === 'laptop') {
                            obj.sceneAsset.activityArtworks = { ...entry.item.views };
                            for (const face of ['front', 'back']) {
                                // Only the lower window is translucent; the casing and base stay solid.
                                const shell = '<path data-activity-laptop-frame="true" fill="#647482" fill-rule="evenodd" d="M22 20 H98 Q102 20 102 24 V70 H18 V24 Q18 20 22 20Z M25 44 V66 H95 V44Z"/>';
                                const upper = face === 'front' ? '<rect x="25" y="26" width="70" height="16" rx="2" fill="#bcd6ef"/>' : '<path d="M55 32 H65" stroke="#c3cbd3" stroke-width="3" stroke-linecap="round"/>';
                                const panel = `<g data-activity-laptop-lid="${face}" opacity="${settings.lidOpacity}"><rect x="25" y="44" width="70" height="22" fill="${face === 'front' ? '#bcd6ef' : '#647482'}"/></g>`;
                                const base = '<path d="M18 70 H102 L114 75 V78 H6 V75Z" fill="#3a4552"/><path d="M25 73 H95" stroke="#a9b8c4" stroke-width="2"/>';
                                obj.sceneAsset.activityArtworks[face] = svg(entry.item.w, entry.item.h, shell + upper + panel + base);
                            }
                            for (const facing of ['left', 'right']) {
                                const body = `<path d="M83 121 H167 V131 H83Z" fill="#3a4552"/><path d="M93 123 H161" stroke="#c3cbd3" stroke-width="3"/><path data-activity-laptop-frame="true" d="M63 48 L91 121 H83 L55 51Z" fill="#647482"/><g data-activity-laptop-lid="side-${facing}" opacity="${settings.lidOpacity}"><path d="M65 59 L86 116" stroke="#bcd6ef" stroke-width="3"/></g>`;
                                obj.sceneAsset.activityArtworks[`side-${facing}`] = `<svg xmlns="http://www.w3.org/2000/svg" width="${entry.item.w}" height="${entry.item.h}" viewBox="0 0 200 180"><g transform="${facing === 'left' ? 'translate(200 0) scale(-1 1)' : 'translate(0 0)'}">${body}</g></svg>`;
                            }
                        }
                        if (kind === 'luggage' && side && entry.role === 'tool') {
                            const top = 48 + (settings.handleLength - 1) * 25;
                            const compact = svg(75, 115, `<path d="M25 ${top + 2} V7 H50 V${top + 2}" fill="none" stroke="#566572" stroke-width="4"/><path d="M25 7 H50" stroke="#303d48" stroke-width="6" stroke-linecap="round"/><rect data-activity-compact-case="true" x="18" y="${top}" width="39" height="${99 - top}" rx="6" fill="#458bca"/><path d="M28 ${top + 9} V89 M38 ${top + 9} V89 M48 ${top + 9} V89" stroke="#2f6494" stroke-width="3"/><circle cx="22" cy="104" r="6" fill="#35444f"/><circle cx="54" cy="104" r="6" fill="#35444f"/>`);
                            obj.sceneAsset.activityArtworks = { 'side-left': compact, 'side-right': compact };
                        }
                        if (kind === 'cart' && side && entry.role === 'tool') {
                            const body = '<path d="M18 12 V103 H104" fill="none" stroke="#536775" stroke-width="6"/><path d="M12 12 H29" stroke="#34434c" stroke-width="7" stroke-linecap="round"/><path d="M24 43 H111 L102 92 H32Z" fill="#729caa"/><path d="M35 55 H102 M38 70 H99 M40 83 H97" stroke="#b5d3dc" stroke-width="3"/><circle cx="28" cy="120" r="8" fill="#34434c"/><circle cx="98" cy="120" r="8" fill="#34434c"/>';
                            obj.sceneAsset.activityArtworks = { 'side-right': svg(120, 130, body), 'side-left': svg(120, 130, `<g transform="translate(120 0) scale(-1 1)">${body}</g>`) };
                        }
                        const variants = obj.sceneAsset.activityArtworks || entry.item.views;
                        obj.sceneAsset.view = variants?.[rear ? 'back' : selectedView] ? (rear ? 'back' : selectedView) : 'front';
                        if ((['shooting', 'rifle'].includes(kind) || kit.quarter) && entry.role === 'tool' && /3q|three-quarter/.test(view)) {
                            obj.sceneAsset.view = `${rear ? 'back-' : ''}three-quarter-${/left/.test(view) ? 'left' : 'right'}`;
                            const grip = entry.item.viewGrips?.[obj.sceneAsset.view];
                            if (grip) { obj.pivotX = grip.x + settings.offsetX / 100; obj.pivotY = grip.y + settings.offsetY / 100; }
                        }
                        if (kind === 'type' && entry.role === 'tool') {
                            obj.sceneAsset.view = side ? `side-${direction > 0 ? 'left' : 'right'}` : rear ? 'front' : 'back';
                        }
                        if (kind === 'phone' && entry.role === 'tool') obj.sceneAsset.view = side ? 'call-back' : 'call-edge';
                        if (kind === 'selfie' && side && entry.role === 'tool') obj.sceneAsset.view = `photo-${view}`;
                        obj.imageSrc = url(variants?.[obj.sceneAsset.view] || entry.item.svg);
                        if (['drink', 'eat'].includes(kind) && ['tool', 'food'].includes(entry.role) && cupDirection < 0) {
                            const doc = new DOMParser().parseFromString(entry.item.svg, 'image/svg+xml');
                            const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
                            group.setAttribute('transform', `translate(${entry.item.w} 0) scale(-1 1)`);
                            group.append(...doc.documentElement.childNodes); doc.documentElement.append(group);
                            obj.imageSrc = url(new XMLSerializer().serializeToString(doc));
                        }
                        obj.loadImage(obj.imageSrc, { preserveDimensions: true });
                    }
                    engine.originalStates.set(obj.id, Utils.deepClone(obj.toJSON()));
                }
                const fixed = new Map(furniture.map(o => [o.id, { x: o.x, y: o.y, width: o.width, height: o.height, _armatureDrawLayer: o._armatureDrawLayer }]));
                const desktopBox = kind === 'type' ? global.SceneDesign.visualBox(main) : null;
                const keyboardScale = kind === 'type' && side && main.sceneAsset.propId === 'laptop'
                    ? Math.min(main.width / 200, main.height / 180) : 0;
                const keyboard = keyboardScale ? {
                    x: deskX + (direction > 0 ? -27 : 27) * keyboardScale,
                    y: deskY - 8 * keyboardScale
                } : null;
                const cycles = Math.max(1, ...manager.objects.flatMap(o => o.animations.map(a => Number(a.repeat) || 1)).filter(Number.isFinite));
                // Contact motion must repeat with the recorded action, regardless of tempo.
                const drinkCycles = cycles;
                const count = Math.max(24, Math.min(360, Math.ceil(duration / 33)),
                    ['eat', 'drink'].includes(kind) && spec.kind !== 'pose' ? Math.min(100, drinkCycles) * 96 : 0);
                let drinkPoses = null, supportAngles = null;
                let containerAngles = null, containerBend = null;
                const overheadSupports = new Map();
                const surfaceArmAngles = new Map();
                const gripRatio = s => kind === 'type' && side ? .95 : kind === 'write' && side && s.key === primaryKey ? .80 : .45;
                const palm = s => { const wrist = s.joints.find(j => /wrist/.test(j.name));
                    return this._getArmatureEndEffectorWorldPosition({ ...s, endPosition: wrist.position + (1 - wrist.position) * gripRatio(s), endCrossOffset: wrist.crossOffset ?? .5 }); };
                const ease = n => { const p = Math.max(0, Math.min(1, n)); return p * p * p * (p * (p * 6 - 15) + 10); };
                const placement = kind === 'place' ? {
                    start: { x: torsoCenter.x + (side ? direction * .2 : handSide * .3) * unit, y: torsoCenter.y - unit * .1 },
                    end: { x: deskX, y: deskY - main.height * (79 / 80 - main.pivotY) },
                    contact: .58, release: .68
                } : null;
                const retrieval = kind === 'shelf' ? {
                    start: palm(primary),
                    contact: { x: shelfContact.x, y: shelfContact.y - main.height * (79 / 80 - main.pivotY) },
                    held: { x: torsoCenter.x + (side ? direction * .28 : handSide * .24) * unit, y: torsoCenter.y + unit * .02 },
                    take: .35, lift: .47, withdraw: .64, hold: .88
                } : null;
                let parcel = null;
                const pickupTiming = side || rear ? { reach: .36, contact: .52, release: .82, end: 1 } : { reach: .44, contact: .54, release: .8, end: .96 };
                if (kind === 'pickup') {
                    sample(duration * pickupTiming.contact);
                    const source = this._getArmatureContactSourceMap(rig)[primaryKey], reach = palm(source);
                    const wrist = source.joints.find(j => /wrist/.test(j.name));
                    const raw = Object.fromEntries(source.joints.map(j => [j.name, j.angle || 0]));
                    const rotation = settings.rotation * Math.PI / 180, aspect = main.width / main.height;
                    const floorOffset = Math.max(.05, ...[0, 1].map(x => (x - main.pivotX) * aspect * Math.sin(rotation) + (1 - main.pivotY) * Math.cos(rotation)));
                    this._solveArmatureContactIK({ ...source, endPosition: wrist.position + (1 - wrist.position) * .45,
                        endCrossOffset: wrist.crossOffset ?? .5, joints: source.joints.filter(j => !/wrist/.test(j.name)) },
                    reach.x, ground - main.height * floorOffset, 60, { keepElbowDown: true, shoulderLimit: 180, elbowLimit: 145 });
                    const grip = palm(source), contact = Object.fromEntries(source.joints.map(j => [j.name, j.angle || 0]));
                    // Keep a hand-sized parcel; reach errors must not inflate the prop.
                    main.height = Math.max(unit * (side ? .1 : .15), Math.min(side ? unit * .28 * settings.scale : Infinity, (ground - grip.y) / floorOffset));
                    main.width = main.height * items.get('activity-parcel').w / items.get('activity-parcel').h;
                    Object.assign(engine.originalStates.get(main.id), { width: main.width, height: main.height });
                    parcel = { x: grip.x, y: ground - main.height * floorOffset, grip, raw, contact, release: null, timing: pickupTiming };
                }
                // Include contact/release boundaries exactly, independent of recording duration.
                const times = [...new Set([...Array.from({ length: count + 1 }, (_, i) => i / count), ...(parcel ? Object.values(pickupTiming) : []), ...(placement ? [placement.contact, placement.release] : []), ...(retrieval ? [retrieval.take, retrieval.lift, retrieval.withdraw, retrieval.hold] : [])])].sort((a, b) => a - b);
                for (let i = 0; i < times.length; i++) {
                    if (i % 12 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (token.cancelled) throw new Error('Action cancelled. No animation was added.'); }
                    const t = times[i]; sample(t * duration);
                    // Timeline restoration replaces joint arrays on every sample.
                    sources = Object.values(this._getArmatureContactSourceMap(rig)).filter(s => /hand$/.test(s.key));
                    primary = sources.find(s => s.key === primaryKey); secondary = sources.find(s => s.key === secondaryKey);
                    if (kit?.followHand && settings.hand === 'other' && secondary) {
                        const first = primary.joints.map(j => j.angle), second = secondary.joints.map(j => j.angle), sign = side ? 1 : -1;
                        primary.joints.forEach((j, n) => { j.angle = (second[n] || 0) * sign; });
                        secondary.joints.forEach((j, n) => { j.angle = (first[n] || 0) * sign; });
                    }
                    const phase = spec.kind === 'pose' ? 0 : t * Math.PI * 2 * cycles;
                    const wave = Math.sin(phase), center = point(torso, .5, .64);
                    const gripPoint = s => { const wrist = s.joints.find(j => /wrist/.test(j.name));
                        return { ...s, endPosition: wrist.position + (1 - wrist.position) * gripRatio(s), endCrossOffset: wrist.crossOffset ?? .5 }; };
                    if (surfaceActivity || ['drink', 'eat', 'phone', 'read', 'write', 'cook', 'board', 'box', 'tray', 'place', 'luggage', 'cart', 'shelf'].includes(kind) || side && kind === 'selfie') primary.joints.filter(j => /wrist/.test(j.name)).forEach(j => { j.angle = 0; });
                    if ((surfaceActivity || ['read', 'write', 'cook', 'box', 'tray', 'cart'].includes(kind)) && secondary) secondary.joints.filter(j => /wrist/.test(j.name)).forEach(j => { j.angle = 0; });
                    if (['drink', 'eat'].includes(kind) && spec.kind !== 'pose') {
                        primary.joints.forEach(j => {
                            j.angle = /wrist/.test(j.name) ? 0 : (/shoulder/.test(j.name) ? (side ? -direction : -handSide) * 12 : /elbow/.test(j.name) ? (side ? -direction : handSide) * 120 : 0);
                        });
                        if (secondary) {
                            const idle = snapshot.states.get(secondary.obj.id)?.json.joints || [];
                            secondary.joints.forEach(j => { j.angle = idle.find(v => v.name === j.name)?.angle || 0; });
                        }
                    }
                    const solve = (s, x, y, fullContact = false) => {
                        const source = gripPoint(s), start = this._getArmatureEndEffectorWorldPosition(source);
                        if (surfaceActivity || floorTool || ['drink', 'eat', 'pickup', 'read', 'write', 'type', 'phone', 'microphone', 'selfie', 'cook', 'board', 'box', 'tray', 'place', 'luggage', 'cart', 'shelf'].includes(kind)) source.joints = source.joints.filter(j => !/wrist/.test(j.name));
                        const progress = spec.kind === 'pose' && !fullContact ? Math.min(1, t * duration / Math.max(1, this._armaturePoseTransition * 1000)) : 1;
                        const weight = progress * progress * (3 - 2 * progress);
                        const eating = ['drink', 'eat'].includes(kind);
                        const mouthReach = eating || kind === 'microphone' || ['rifle', 'tablet'].includes(kind) && !side;
                        const targetX = start.x + (x - start.x) * weight, targetY = start.y + (y - start.y) * weight;
                        if (![targetX, targetY].every(Number.isFinite)) throw new Error('Activity contact target is not finite.');
                        const preferredBend = Math.sign(source.joints.find(j => /elbow/.test(j.name))?.angle || 0);
                        const options = { mouthReach, keepElbowDown: kind !== 'phone', preserveBend: eating || kind === 'shelf' || !!kit.support, shoulderLimit: eating ? 75 : kind === 'phone' && side ? 175 : 180, wristLimit: eating ? 12 : 28, elbowLimit: kind === 'phone' ? 175 : eating || kit.support ? 165 : 145 };
                        this._solveArmatureContactIK(source, targetX, targetY, kit.support ? 64 : kind === 'phone' || kind === 'luggage' ? 64 : eating || parcel ? 40 : 24, options);
                        if (kit.support) {
                            const residual = () => { const p = this._getArmatureEndEffectorWorldPosition(source); return Math.hypot(p.x - targetX, p.y - targetY); };
                            let bestError = residual(), best = source.joints.map(j => j.angle);
                            // Retry missed container contacts without reversing the authored elbow bend.
                            if (bestError > 5) for (const [shoulder, elbow] of [[-15, -90], [15, 90], [-30, -120], [30, 120]]) {
                                if (preferredBend && Math.sign(elbow) !== preferredBend) continue;
                                source.joints.forEach(j => { j.angle = /shoulder/.test(j.name) ? shoulder : /elbow/.test(j.name) ? elbow : 0; });
                                this._solveArmatureContactIK(source, targetX, targetY, 64, options);
                                const error = residual();
                                if (error < bestError) { bestError = error; best = source.joints.map(j => j.angle); }
                                if (bestError < 3) break;
                            }
                            source.joints.forEach((j, n) => { j.angle = best[n]; });
                        }
                        const actual = this._getArmatureEndEffectorWorldPosition(source);
                        const error = Math.hypot(actual.x - targetX, actual.y - targetY);
                        if (!Number.isFinite(error) || source.joints.some(j => !Number.isFinite(j.angle ?? 0))) throw new Error('Activity contact solver produced invalid geometry.');
                        const diagnostics = token.contactDiagnostics ||= { samples: 0, maxResidualPx: 0, unresolvedSamples: 0, tolerancePx: unit * .05 };
                        diagnostics.samples++;
                        diagnostics.maxResidualPx = Math.max(diagnostics.maxResidualPx, error);
                        if (error > diagnostics.tolerancePx) diagnostics.unresolvedSamples++;
                    };
                    const gripForContact = (x, y, localX, localY, rotation) => {
                        const r = rotation * Math.PI / 180, dx = (localX - main.pivotX) * main.width, dy = (localY - main.pivotY) * main.height;
                        return { x: x - dx * Math.cos(r) + dy * Math.sin(r), y: y - dx * Math.sin(r) - dy * Math.cos(r) };
                    };
                    let angle = 0;
                    if (kit) {
                        if (surfaceActivity) {
                            // Surface props are world-anchored; both hands follow their contact points.
                            let targets;
                            if (kind === 'fold') {
                                const progress = spec.kind === 'pose' ? 1 : ease((t - .12) / .7);
                                const edge = deskX - foldDirection * foldHalf * Math.cos(progress * Math.PI);
                                const lift = Math.sin(progress * Math.PI) * unit * .05;
                                main.width = Math.max(.01, Math.abs(edge - deskX)); main.height = clothHeight + lift;
                                main.x = Math.min(edge, deskX); main.y = deskY - main.height;
                                targets = [{ x: deskX + (edge - deskX) * foldGrip, y: main.y + main.height * .4 },
                                    { x: deskX + foldDirection * foldHalf * foldGrip * .85, y: deskY - clothHeight * .5 }];
                            } else {
                                main.x = deskX - main.width / 2; main.y = deskY - main.height * 83 / 90;
                                const rub = spec.kind === 'pose' ? 0 : Math.sin(phase) * unit * .018;
                                targets = [{ x: deskX - unit * .018 + rub, y: main.y + main.height * .49 },
                                    { x: deskX + unit * .018 - rub, y: main.y + main.height * .53 }];
                            }
                            [primary, secondary].forEach((source, index) => {
                                const previous = surfaceArmAngles.get(source.key);
                                if (previous) source.joints.forEach((j, n) => { j.angle = previous[n]; });
                                solve(source, targets[index].x, targets[index].y);
                                surfaceArmAngles.set(source.key, source.joints.map(j => j.angle));
                            });
                        } else if (kind === 'overhead') {
                            const anchor = this._activityHeadCarryAnchor(head, point);
                            main.x = anchor.x - main.width * .5 + unit * settings.offsetX / 100;
                            main.y = anchor.y - main.height + unit * settings.offsetY / 100;
                            main.rotation = settings.rotation;
                            const left = point(main, .28, .98), right = point(main, .72, .98);
                            const ordered = this._activityOverheadHands([primary, secondary], view);
                            ordered.forEach((source, index) => this._activitySupportOverhead(source, index ? right : left, overheadSupports, index ? 1 : -1));
                            main._armatureDrawLayer = Math.max(drawLayer(head), ...sources.map(s => drawLayer(s.obj))) + .01;
                        } else if (kind === 'cart') {
                            const handleX = center.x + (side ? direction * (.32 + .015 * wave) * unit : handSide * main.width * .25);
                            main.x = handleX - main.width * main.pivotX;
                            main.y = ground - main.height * 128 / 130;
                            const a = point(main, main.pivotX, main.pivotY);
                            const b = point(main, side ? main.pivotX + direction * .055 : 1 - main.pivotX, main.pivotY);
                            solve(primary, a.x, a.y); solve(secondary, b.x, b.y);
                        } else if (kind === 'shelf') {
                            if (retrieval.angles) primary.joints.forEach((j, n) => { j.angle = retrieval.angles[n]; });
                            const elbow = primary.joints.find(j => /elbow/.test(j.name));
                            retrieval.bendSign ||= Math.sign(elbow.angle) || (side ? -direction : handSide);
                            if (Math.abs(elbow.angle) < .5) elbow.angle = retrieval.bendSign * .5;
                            const reach = ease(t / retrieval.take);
                            const contact = retrieval.contact, held = retrieval.held;
                            const liftedY = contact.y - unit * .12;
                            let target = held;
                            if (spec.kind !== 'pose') {
                                if (t < retrieval.take) target = { x: retrieval.start.x + (contact.x - retrieval.start.x) * reach, y: retrieval.start.y + (contact.y - retrieval.start.y) * reach };
                                else if (t < retrieval.lift) target = { x: contact.x, y: contact.y + (liftedY - contact.y) * ease((t - retrieval.take) / (retrieval.lift - retrieval.take)) };
                                else if (t < retrieval.withdraw) target = { x: contact.x + (held.x - contact.x) * ease((t - retrieval.lift) / (retrieval.withdraw - retrieval.lift)), y: liftedY };
                                else target = { x: held.x, y: liftedY + (held.y - liftedY) * ease((t - retrieval.withdraw) / (retrieval.hold - retrieval.withdraw)) };
                            }
                            solve(primary, target.x, target.y);
                            retrieval.angles = primary.joints.map(j => j.angle);
                        } else if (kind === 'place') {
                            const progress = spec.kind === 'pose' ? 1 : ease(t / placement.contact);
                            const release = spec.kind === 'pose' ? 0 : ease((t - placement.release) / (1 - placement.release));
                            const x = placement.start.x + (placement.end.x - placement.start.x) * progress;
                            const y = placement.start.y + (placement.end.y - placement.start.y) * progress;
                            solve(primary, x + (placement.start.x - x) * release, y + (placement.start.y - y) * release);
                        } else if (kind === 'luggage' && side) {
                            primary.joints.forEach(j => {
                                j.angle = /shoulder/.test(j.name) ? direction * 25 : 0;
                            });
                        } else if (kind === 'luggage') {
                            const x = center.x + handSide * .55 * unit;
                            const y = ground - main.height * (110 / 115 - main.pivotY);
                            solve(primary, x, y);
                            let best = primary.joints.map(j => j.angle), error = Math.hypot(palm(primary).x - x, palm(primary).y - y);
                            // A straight elbow can trap CCD at a local minimum when the handle is close.
                            for (const bend of [-60, 60, -110, 110]) {
                                if (error < 3) break;
                                primary.joints.forEach((j, n) => { j.angle = /elbow/.test(j.name) ? bend : best[n]; });
                                solve(primary, x, y);
                                const hand = palm(primary), distance = Math.hypot(hand.x - x, hand.y - y);
                                if (distance < error) { error = distance; best = primary.joints.map(j => j.angle); }
                            }
                            primary.joints.forEach((j, n) => { j.angle = best[n]; });
                        } else if (kind === 'box' || kind === 'tray') {
                            const x = center.x + (side ? direction * unit * (kind === 'tray' ? .24 : .28) : handSide * main.width * .38);
                            solve(primary, x, center.y + unit * (.035 + .01 * wave));
                        } else if (kind === 'cook') {
                            angle = 8 * wave;
                            const target = gripForContact(pot.x + pot.width * (.5 + .16 * wave), pot.y + pot.height * (.36 + .05 * Math.cos(phase)), .5, .85, angle);
                            solve(primary, target.x, target.y);
                            const support = point(pot, side ? (direction > 0 ? .12 : .88) : (handSide > 0 ? .06 : .94), .48);
                            solve(secondary, support.x, support.y);
                        } else if (kind === 'board') {
                            angle = (side ? direction : handSide) > 0 ? 180 : 0;
                            const target = gripForContact(boardContact.x + unit * .06 * wave, boardContact.y + unit * .04 * Math.sin(phase * 2), .05, .5, angle);
                            solve(primary, target.x, target.y);
                        } else if (kind === 'read') {
                            const x = center.x + (side ? direction * unit * .36 : handSide * unit * .22), y = center.y - unit * .14 + unit * .015 * wave;
                            solve(primary, x, y);
                        } else if (floorTool) {
                            angle = direction * (kind === 'mop' ? 12 + 10 * wave : 10 + 14 * wave);
                            solve(primary, center.x + unit * (side ? direction * (.28 + .13 * wave) : .08 * wave), ground - main.height * (.95 - main.pivotY) * Math.cos(angle * Math.PI / 180));
                        } else if (kind === 'type') {
                            const x = keyboard ? keyboard.x - direction * unit * .05 : deskX + (side ? -direction * unit * .15 : handSide * unit * .18);
                            const clearance = side ? .08 : .035;
                            const keyY = keyboard ? keyboard.y - unit * .015 : deskY - unit * clearance;
                            solve(primary, x, keyY - unit * .012 * (1 + Math.sin(phase * 4)));
                            if (secondary) solve(secondary, keyboard ? keyboard.x + direction * unit * .05 : deskX + unit * (side ? -direction * .04 : -handSide * .18), keyY - unit * .012 * (1 - Math.sin(phase * 4)));
                        } else if (kind === 'write') {
                            angle = (side ? direction : -handSide) * 25;
                            const target = gripForContact(deskX + unit * .04 * wave, paper.y + paper.height * (.5 + .12 * Math.sin(phase * 3)), .5, 128 / 140, angle);
                            solve(primary, target.x, target.y);
                            if (secondary) {
                                if (supportAngles && spec.kind !== 'pose' && !side) secondary.joints.forEach(j => { j.angle = supportAngles[j.name]; });
                                else {
                                    solve(secondary, deskX + unit * (side ? direction * .18 : -handSide * .24), deskY - unit * (side ? .06 : .025));
                                    supportAngles = Object.fromEntries(secondary.joints.map(j => [j.name, j.angle]));
                                }
                            }
                        } else if (kind === 'pickup') {
                            const weight = t <= pickupTiming.contact ? ease(t / pickupTiming.reach) : 1 - ease((t - pickupTiming.contact) / .2);
                            primary.joints.forEach(j => { j.angle = (j.angle || 0) + (parcel.contact[j.name] - parcel.raw[j.name]) * weight; });
                        } else if (kind === 'eat') {
                            if (!secondary) throw new Error('Eating with a plate needs two mapped arms.');
                            solve(secondary, center.x + (side ? direction * .35 : -handSide * .22) * unit, center.y + unit * .12);
                            const support = palm(secondary);
                            plate.x = support.x - plate.width * .5; plate.y = support.y - plate.height;
                            plate._armatureDrawLayer = drawLayer(secondary.obj) + .01;
                            const mouth = mouthAnchor ? point(head, mouthAnchor.x, mouthAnchor.y) : this._resolveArmatureContactTarget(rig, { tag: 'mouth' });
                            const rest = gripForContact(support.x, plate.y + plate.height * .35, cupDirection < 0 ? .82 : .18, .5, 0);
                            const bite = gripForContact(mouth.x + (side ? direction * unit * .045 : 0), mouth.y + unit * .015,
                                side ? (cupDirection < 0 ? .98 : .02) : (cupDirection < 0 ? .82 : .18), .5, 0);
                            if (spec.kind === 'pose') solve(primary, bite.x, bite.y);
                            else {
                                if (!drinkPoses) {
                                    solve(primary, rest.x, rest.y);
                                    const low = Object.fromEntries(primary.joints.map(j => [j.name, j.angle]));
                                    const restDepth = primary.obj.armatureReachDepth;
                                    solve(primary, bite.x, bite.y);
                                    drinkPoses = { rest: low, sip: Object.fromEntries(primary.joints.map(j => [j.name, j.angle])),
                                        restDepth, sipDepth: primary.obj.armatureReachDepth };
                                }
                                const beat = (t * drinkCycles) % 1, lift = beat < .45 ? ease((beat - .12) / .33) : 1 - ease((beat - .58) / .34);
                                primary.joints.forEach(j => { j.angle = drinkPoses.rest[j.name] + (drinkPoses.sip[j.name] - drinkPoses.rest[j.name]) * lift; });
                                primary.obj.armatureReachDepth = drinkPoses.restDepth + (drinkPoses.sipDepth - drinkPoses.restDepth) * lift;
                                primary.joints[0].tiltX = -(side ? direction : handSide) * primary.obj.armatureReachDepth * 24;
                            }
                        } else if (kind === 'phone') {
                            const ear = earAnchor ? point(head, earAnchor.x, earAnchor.y)
                                : this._resolveArmatureContactTarget(rig, { tag: side ? 'ear' : primary.key === 'left-hand' ? 'l-ear' : 'r-ear' });
                            angle = (side ? direction : handSide) * 6;
                            if (ear) {
                                const target = gripForContact(ear.x, ear.y, .5, .18, angle);
                                let best = primary.joints.map(j => j.angle), error = Infinity;
                                for (const seed of [best, [100, 130, 0], [-100, -130, 0], [35, 145, 0], [-35, -145, 0]]) {
                                    primary.joints.forEach((j, n) => { j.angle = seed[n]; });
                                    solve(primary, target.x, target.y, true);
                                    const hand = palm(primary), elbow = this._getArmatureContactPointWorldPosition(primary.obj, primary.joints.find(j => /elbow/.test(j.name)));
                                    const shoulder = this._getArmatureContactPointWorldPosition(primary.obj, primary.joints[0]);
                                    // Keep the elbow in front of the shoulder and below the ear.
                                    const inward = side ? Math.max(0, (shoulder.x - elbow.x) * direction)
                                        : Math.max(0, (shoulder.x - elbow.x) * handSide);
                                    const distance = Math.hypot(hand.x - target.x, hand.y - target.y) + inward * 8
                                        + (side ? Math.max(0, ear.y + unit * .06 - elbow.y) * 8 : 0);
                                    if (distance < error) { error = distance; best = primary.joints.map(j => j.angle); }
                                    if (error < 3) break;
                                }
                                const progress = spec.kind === 'pose' ? ease(t * duration / Math.max(1, this._armaturePoseTransition * 1000)) : 1;
                                const initial = snapshot.states.get(primary.obj.id)?.json.joints || [];
                                primary.joints.forEach((j, n) => {
                                    const start = initial.find(v => v.name === j.name)?.angle || 0;
                                    j.angle = start + (best[n] - start) * progress;
                                });
                            }
                        } else if (kind === 'selfie' && side) {
                            angle = -direction * 4;
                            const eye = eyeAnchor ? point(head, eyeAnchor.x, eyeAnchor.y)
                                : this._resolveArmatureContactTarget(rig, { tag: 'eye' }) || point(head, .5, .35);
                            const shoulder = this._getArmatureContactPointWorldPosition(primary.obj, primary.joints[0]);
                            const target = gripForContact(shoulder.x + direction * unit * .52, eye.y, .5, .12, angle);
                            solve(primary, target.x, target.y);
                        } else if (kit.followHand) {
                            // Keep the authored arm action; the prop follows the palm without replacing it.
                            angle = kit.lifeScenario ? (side ? direction : handSide) * kit.swing * wave
                                : ['carry', 'document', 'displayDocument', 'tablet', 'shooting', 'rifle'].includes(kind) ? 0 : kind === 'flashlight' ? (side ? direction : handSide) * 10 * wave : kind === 'fan' ? direction * (10 + 18 * wave)
                                : kind === 'shaker' ? direction * (8 + 12 * wave) : (side ? direction : handSide) * 6;
                        } else {
                            const mouth = mouthAnchor ? point(head, mouthAnchor.x, mouthAnchor.y) : this._resolveArmatureContactTarget(rig, { tag: 'mouth' }) || (head ? point(head, side ? (direction > 0 ? .88 : .12) : .53, .59) : center);
                            const sipTime = (t * drinkCycles) % 1;
                            const ease = n => { const p = Math.max(0, Math.min(1, n)); return p * p * p * (p * (p * 6 - 15) + 10); };
                            const lift = kind === 'drink' && spec.kind !== 'pose' ? (sipTime < .42 ? ease((sipTime - .12) / .3) : 1 - ease((sipTime - .62) / .3)) : 1;
                            angle = kind === 'drink' ? -cupDirection * 8 * lift : -(side ? direction : -handSide) * 10;
                            if (kind === 'drink') {
                                const target = gripForContact(mouth.x, mouth.y, cupDirection < 0 ? .8 : .2, .19, angle);
                                const restX = center.x + cupDirection * unit * .32;
                                if (spec.kind === 'pose') solve(primary, target.x, target.y);
                                else {
                                    if (!drinkPoses) {
                                        solve(primary, restX, center.y + unit * .18);
                                        const rest = Object.fromEntries(primary.joints.map(j => [j.name, j.angle]));
                                        const restDepth = primary.obj.armatureReachDepth;
                                        const sip = gripForContact(mouth.x, mouth.y, cupDirection < 0 ? .8 : .2, .19, -cupDirection * 8);
                                        solve(primary, sip.x, sip.y);
                                        drinkPoses = { rest, sip: Object.fromEntries(primary.joints.map(j => [j.name, j.angle])),
                                            restDepth, sipDepth: primary.obj.armatureReachDepth };
                                    }
                                    primary.joints.forEach(j => { j.angle = drinkPoses.rest[j.name] + (drinkPoses.sip[j.name] - drinkPoses.rest[j.name]) * lift; });
                                    primary.obj.armatureReachDepth = drinkPoses.restDepth + (drinkPoses.sipDepth - drinkPoses.restDepth) * lift;
                                    primary.joints[0].tiltX = -(side ? direction : handSide) * primary.obj.armatureReachDepth * 24;
                                }
                            } else {
                                const target = gripForContact(mouth.x + (side ? direction * unit * .10 : 0), mouth.y + unit * .045, .5, .02, angle);
                                solve(primary, target.x, target.y);
                            }
                        }
                        manager._resolvePins();
                        const hand = this._getArmatureEndEffectorWorldPosition(gripPoint(primary));
                        if (main.pinnedTo) {
                            const offset = manager._getPinOffsetForChildTarget(primary.obj, main, hand.x, hand.y);
                            main.pinOffsetX = offset.x; main.pinOffsetY = offset.y;
                        }
                        if (kind !== 'overhead') main.rotation = angle + settings.rotation;
                        if (surfaceActivity) {
                            main.rotation = 0;
                            if (kind === 'fold' && !rear) {
                                main._armatureDrawLayer = maxLayer + 2;
                                // Character layers are integer-valued during playback.
                                [secondary, primary].forEach((source, index) => { source.obj._armatureDrawLayer = Math.ceil(maxLayer) + 3 + index; });
                            } else main._armatureDrawLayer = rear ? minLayer - .5 : Math.min(...sources.map(s => drawLayer(s.obj))) - .01;
                        } else if (kind === 'overhead') {
                            // Placement is head-supported, not wrist-pinned.
                        } else if (kind === 'cart') {
                            main._armatureDrawLayer = rear ? minLayer - .1 : drawLayer(primary.obj) - .01;
                        } else if (kind === 'shelf') {
                            const grip = t < retrieval.take && spec.kind !== 'pose' ? retrieval.contact : hand;
                            main.x = grip.x - main.width * main.pivotX; main.y = grip.y - main.height * main.pivotY;
                            main._armatureDrawLayer = rear ? minLayer - .1 : drawLayer(primary.obj) - .01;
                        } else if (kind === 'place') {
                            const progress = spec.kind === 'pose' ? 1 : ease(t / placement.contact);
                            main.x = placement.start.x + (placement.end.x - placement.start.x) * progress - main.width * main.pivotX;
                            main.y = placement.start.y + (placement.end.y - placement.start.y) * progress - main.height * main.pivotY;
                            main._armatureDrawLayer = rear ? minLayer - .1 : drawLayer(primary.obj) - .01;
                        } else if (kind === 'luggage') {
                            if (side) {
                                // Fit the rolling case below a straight trailing arm, not the arm to a tall case.
                                main.height = Math.max(1, (ground - hand.y) / (110 / 115 - main.pivotY));
                                main.width = main.height * items.get('suitcase').w / items.get('suitcase').h;
                            }
                            main.x = (side ? hand.x : center.x + handSide * .55 * unit) - main.width * main.pivotX;
                            main.y = ground - main.height * 110 / 115;
                            main._armatureDrawLayer = drawLayer(primary.obj) - .01;
                        } else if (kind === 'type') {
                            main.x = deskX - main.width / 2;
                            main.y = deskY - main.height * (desktopBox.y + desktopBox.height);
                            main._armatureDrawLayer = rear ? minLayer - 1.5 : Math.max(drawLayer(torso), ...sources.map(s => drawLayer(s.obj))) + .1;
                        }
                        else if (parcel) {
                            let position = { x: parcel.x, y: parcel.y };
                            if (t >= pickupTiming.contact && t <= pickupTiming.release) {
                                // Blend out the residual IK/size-clamp offset instead of snapping on pickup.
                                const settling = 1 - ease((t - pickupTiming.contact) / .1);
                                position = { x: hand.x + (parcel.x - parcel.grip.x) * settling,
                                    y: hand.y + (parcel.y - parcel.grip.y) * settling };
                            }
                            if (t === pickupTiming.release) parcel.release = { ...hand };
                            if (t > pickupTiming.release) {
                                const fall = Math.min(1, (t - pickupTiming.release) / (pickupTiming.end - pickupTiming.release));
                                position = { x: parcel.release.x, y: parcel.release.y + (parcel.y - parcel.release.y) * fall * fall };
                            }
                            main.x = position.x - main.width * main.pivotX; main.y = position.y - main.height * main.pivotY;
                            main._armatureDrawLayer = rear ? minLayer - .1 : drawLayer(primary.obj) - .01;
                            if (spec.key === 'pick-up-drop' && secondary) {
                                const raw = palm(secondary), contact = ease(t / pickupTiming.reach) * (1 - ease((t - pickupTiming.release) / (pickupTiming.end - pickupTiming.release)));
                                const target = point(main, 1 - main.pivotX, main.pivotY);
                                solve(secondary, raw.x + (target.x - raw.x) * contact, raw.y + (target.y - raw.y) * contact);
                            }
                        } else {
                            main.x = hand.x - main.width * main.pivotX; main.y = hand.y - main.height * main.pivotY;
                            main._armatureDrawLayer = rear && (kit.lifeScenario || ['displayDocument', 'tablet', 'flashlight', 'shooting', 'rifle', 'microphone', 'phone', 'read', 'write', 'box', 'tray', 'cook', 'document', 'board'].includes(kind)) ? minLayer - .1
                                : kit.quarter && /3q|three-quarter/.test(view) ? Math.max(drawLayer(torso) + .1, ...sources.map(s => drawLayer(s.obj) - .01))
                                : kit.lifeScenario ? drawLayer(primary.obj) - .01
                                : ['drink', 'eat', 'write', 'phone', 'box', 'tray', 'cook', 'document', 'board'].includes(kind) || side && kind === 'microphone' ? drawLayer(primary.obj) - .01
                                : Math.max(drawLayer(primary.obj), kind === 'microphone' && head ? drawLayer(head) : -Infinity) + .01;
                        }
                        if ((['rifle', 'tablet'].includes(kind) || kit.support) && secondary) {
                            const quarter = /3q|three-quarter/.test(view);
                            const x = (side ? kit.support?.sideX : kit.support?.x) ?? (kind === 'tablet' ? .8 : side ? .61 : quarter ? .64 : .55);
                            const viewSupport = items.get(main.sceneAsset.propId)?.viewSupport?.[main.sceneAsset.view];
                            const target = viewSupport ? point(main, viewSupport.x, viewSupport.y)
                                : point(main, kit.support && rear || direction < 0 && (side || quarter) ? 1 - x : x, kit.support?.y ?? (kind === 'tablet' ? (side ? .6 : .84) : .48));
                            const rest = this._getArmatureEndEffectorWorldPosition(gripPoint(secondary));
                            const weight = spec.kind === 'pose' ? 1 : ease(Math.min(t / .3, (1 - t) / .25));
                            if (weight > 0) {
                                const authoredAngles = secondary.joints.map(joint => joint.angle || 0);
                                // A wide container needs full support-arm reach, not the chest-contact foreshortening.
                                if (kit.support) {
                                    secondary.obj.armatureReachDepth = (secondary.obj.armatureReachDepth || 0) * (1 - weight);
                                    secondary.joints.forEach(joint => { joint.tiltX = (joint.tiltX || 0) * (1 - weight); joint.tiltY = (joint.tiltY || 0) * (1 - weight); });
                                }
                                if (kit.support) {
                                    // Keep one bend branch while blending into and out of the container grip.
                                    const bend = containerBend ??= Math.sign(secondary.joints.find(joint => /elbow/.test(joint.name))?.angle || 0) || 1;
                                    secondary.joints.forEach((joint, index) => { joint.angle = containerAngles?.[index] ?? (/shoulder/.test(joint.name) ? 15 * bend : /elbow/.test(joint.name) ? 90 * bend : 0); });
                                    solve(secondary, target.x, target.y);
                                    // Seed each baked sample from its predecessor and bound angular velocity.
                                    const maxDelta = 360 * duration / count / 1000;
                                    containerAngles = secondary.joints.map((joint, index) => containerAngles
                                        ? containerAngles[index] + Math.max(-maxDelta, Math.min(maxDelta, joint.angle - containerAngles[index])) : joint.angle);
                                    secondary.joints.forEach((joint, index) => { joint.angle = containerAngles[index]; });
                                    secondary.joints.forEach((joint, index) => { joint.angle = authoredAngles[index] + (joint.angle - authoredAngles[index]) * weight; });
                                } else solve(secondary, rest.x + (target.x - rest.x) * weight, rest.y + (target.y - rest.y) * weight);
                            }
                        } else if (kit.twoHands && !surfaceActivity && !['type', 'overhead', 'cook', 'cart'].includes(kind)) {
                            const carried = kind === 'box' || kind === 'tray';
                            const dx = floorTool ? 0 : main.width * (carried ? 1 - 2 * main.pivotX : side ? .3 * direction : -.72 * handSide);
                            const dy = floorTool ? -main.height * .14 : side && !carried ? -main.height * .1 : 0;
                            const r = main.rotation * Math.PI / 180;
                            solve(secondary, hand.x + dx * Math.cos(r) - dy * Math.sin(r), hand.y + dx * Math.sin(r) + dy * Math.cos(r));
                        }
                        for (const s of sources) {
                            const values = Object.fromEntries([...s.obj.joints].sort((a, b) => a.position - b.position).map((j, n) => [`jointAngle_${n}`, j.angle || 0]));
                            if (kit.lifeScenario || ['eat', 'drink', 'microphone', 'rifle', 'tablet'].includes(kind)) {
                                values.armatureReachDepth = s.obj.armatureReachDepth || 0;
                                [...s.obj.joints].sort((a, b) => a.position - b.position).forEach((j, n) => {
                                    values[`jointTiltX_${n}`] = j.tiltX || 0; values[`jointTiltY_${n}`] = j.tiltY || 0;
                                });
                            }
                            if (kind === 'fold' && !rear) values._armatureDrawLayer = s.obj._armatureDrawLayer;
                            if (kind === 'shelf') {
                                const previous = armFrames.get(s.obj.id)?.at(-1)?.values;
                                if (previous) for (const key of Object.keys(values)) {
                                    values[key] += 360 * Math.round((previous[key] - values[key]) / 360);
                                }
                            }
                            if (kind === 'overhead') [...s.obj.joints].sort((a, b) => a.position - b.position).forEach((j, n) => {
                                values[`jointTiltX_${n}`] = 0; values[`jointTiltY_${n}`] = 0;
                            });
                            if (!armFrames.has(s.obj.id)) armFrames.set(s.obj.id, []);
                            armFrames.get(s.obj.id).push({ t, values });
                        }
                    }
                    fixed.forEach((state, id) => Object.assign(manager.getObjectById(id), state));
                    // Use the same phase as the spoon lift: bite at the top, empty on return.
                    const bitePhase = (t * drinkCycles) % 1;
                    if (kind === 'eat' && spec.kind !== 'pose') {
                        const open = t === 1 ? 0 : .85 * ease((bitePhase - .29) / .13) * (1 - ease((bitePhase - .51) / .09));
                        biteFrames.push({ t, open });
                    }
                    if (food) {
                        for (const key of ['x', 'y', 'width', 'height', 'pivotX', 'pivotY', 'rotation']) food[key] = main[key];
                        for (const key of ['pinnedTo', 'pinTargetType', 'pinJointId', 'pinJointName', 'pinRotationMode', 'pinInheritRotation', 'pinOffsetX', 'pinOffsetY']) food[key] = main[key];
                        food._armatureDrawLayer = main._armatureDrawLayer + .001;
                    }
                    if (flash) {
                        const quarter = /3q|three-quarter/.test(view);
                        const muzzle = kind === 'rifle' ? point(main, side || quarter ? (direction > 0 ? .95 : .05) : .5, side ? .38 : quarter ? .16 : .28)
                            : point(main, side ? (direction > 0 ? .95 : .05) : .5, 20 / 68);
                        flash.width = main.width * (kind === 'rifle' ? .24 : 1.25); flash.height = flash.width;
                        flash.x = muzzle.x - flash.width / 2; flash.y = muzzle.y - flash.height / 2;
                        flash._armatureDrawLayer = main._armatureDrawLayer + .01;
                    }
                    if (emoji) { const p = head ? point(head, .5, 0) : center;
                        emoji.x = p.x - emoji.width / 2; emoji.y = p.y - emoji.height * 1.2 - unit * .06 * Math.sin(Math.PI * Math.max(0, Math.min(1, (t - settings.cueStart) / (settings.cueEnd - settings.cueStart)))); emoji._armatureDrawLayer = maxLayer + 2; }
                    manager._resolvePins();
                    for (const { obj, role, existing } of props) {
                        const visible = role === 'emoji' ? t >= settings.cueStart && t < settings.cueEnd
                            : role === 'flash' ? t >= .49 && t < .54
                            : role === 'food' ? spec.kind !== 'pose' && t < 1 && bitePhase >= .08 && bitePhase < .52
                            : (t < 1 || settings.keep || existing);
                        captures.get(obj.id).push({ t, values: { x: obj.x, y: obj.y, width: obj.width, height: obj.height, pivotX: obj.pivotX, pivotY: obj.pivotY, pinOffsetX: obj.pinOffsetX || 0, pinOffsetY: obj.pinOffsetY || 0, rotation: obj.rotation || 0, _armatureDrawLayer: obj._armatureDrawLayer, visible, activityRootId: rig.root.id } });
                    }
                }
                armFrames.forEach((frames, id) => {
                    const obj = manager.getObjectById(id);
                    for (const a of obj.animations) {
                        const replaced = p => /^jointAngle_/.test(p) || ['eat', 'drink', 'microphone'].includes(kind) && /^(jointTilt[XY]_|armatureReachDepth$)/.test(p);
                        if (a.generated?.properties) a.generated.properties = a.generated.properties.filter(p => !replaced(p));
                        else if (Array.isArray(a.generated)) a.generated = a.generated.filter(c => !replaced(c.property));
                    }
                    obj.animations.push(track(`${spec.name}: hand contacts`, duration, frames));
                });
                if (biteFrames.length) this._recordActivityEatingFace(rig, duration, biteFrames);
                for (const { obj } of props) {
                    obj.animations.push(track(`${spec.name}: ${obj.name}`, duration, captures.get(obj.id)));
                    const image = obj.imageElement; if (image?.decode) await image.decode().catch(() => {});
                    originalMap.set(obj.id, Utils.deepClone(snapshot.states.get(obj.id)?.json || engine.originalStates.get(obj.id) || obj.toJSON()));
                }
            } finally {
                manager.objects.forEach(obj => { const before = oldTracks.get(obj.id); if (before) obj.animations = [...before.filter(a => beforeIds.get(obj.id)?.has(a.id)), ...obj.animations]; });
                engine.originalStates = originalMap;
            }
        }
    });
})(globalThis);
