/**
 * Prop & Scene Library — procedural SVG props for building environment scenes.
 * Each item is a standalone SVG illustration inserted as an 'image' StageObject,
 * except a few flat "icon accents" (iconPath) inserted as recolorable 'icon' objects.
 * Exposed as window.BUILTIN_PROP_LIBRARY = { categories:[...], items:{ catId:[...] } }.
 */
(function (global) {
    'use strict';

    // Shared flat palette (kept inline per-SVG so each prop is self-contained).
    const C = {
        woodL: '#c98d51', wood: '#a86b34', woodD: '#7d4d22',
        metalL: '#c3cbd3', metal: '#9aa4ad', metalD: '#6b7580',
        blue: '#4a90d9', blueD: '#2f6bb0', red: '#e2574c', redD: '#b83f36',
        green: '#5bb56a', greenD: '#3d8a4c', leaf: '#4caf50', leafD: '#2f7d3a',
        yellow: '#f4c04e', yellowD: '#d69e2e', white: '#f7fafc', paper: '#eef2f6',
        dark: '#3a4552', gray: '#cbd5e0', grayD: '#8a97a6', black: '#2b333d',
        skin: '#e8b98f', glass: '#bcd6ef', brick: '#c56a4a', brickD: '#a4543a',
        sky: '#bfe3f2'
    };

    // Explicit width/height (from the viewBox) give the SVG a definite intrinsic size so it
    // rasterizes reliably as an <img> on first decode instead of drawing black.
    const svg = (vb, body) => {
        const [w, h] = String(vb).split(/\s+/);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vb}">${body}</svg>`;
    };

    // ---- Furniture -------------------------------------------------------
    const furniture = [
        { id: 'chair', name: 'Wooden Chair', tags: 'seat furniture wood', w: 80, h: 110,
          svg: svg('80 110', `<rect x="18" y="8" width="44" height="46" rx="4" fill="${C.wood}"/><rect x="18" y="8" width="44" height="10" rx="4" fill="${C.woodL}"/><rect x="16" y="52" width="48" height="12" rx="3" fill="${C.woodD}"/><rect x="20" y="64" width="7" height="42" fill="${C.wood}"/><rect x="53" y="64" width="7" height="42" fill="${C.wood}"/><rect x="18" y="14" width="6" height="42" fill="${C.woodD}"/><rect x="56" y="14" width="6" height="42" fill="${C.woodD}"/>`) },
        { id: 'table', name: 'Table', tags: 'desk furniture wood', w: 130, h: 90,
          svg: svg('130 90', `<rect x="8" y="26" width="114" height="14" rx="3" fill="${C.wood}"/><rect x="8" y="26" width="114" height="6" rx="3" fill="${C.woodL}"/><rect x="18" y="40" width="9" height="44" fill="${C.woodD}"/><rect x="103" y="40" width="9" height="44" fill="${C.woodD}"/>`) },
        { id: 'stool', name: 'Stool', tags: 'seat furniture', w: 70, h: 90,
          svg: svg('70 90', `<ellipse cx="35" cy="26" rx="26" ry="9" fill="${C.wood}"/><ellipse cx="35" cy="23" rx="26" ry="9" fill="${C.woodL}"/><rect x="16" y="30" width="6" height="52" fill="${C.woodD}"/><rect x="48" y="30" width="6" height="52" fill="${C.woodD}"/><rect x="19" y="52" width="32" height="5" fill="${C.wood}"/>`) },
        { id: 'sofa', name: 'Sofa', tags: 'couch seat furniture', w: 150, h: 90,
          svg: svg('150 90', `<rect x="10" y="30" width="130" height="42" rx="10" fill="${C.blue}"/><rect x="6" y="26" width="24" height="46" rx="9" fill="${C.blueD}"/><rect x="120" y="26" width="24" height="46" rx="9" fill="${C.blueD}"/><rect x="30" y="20" width="90" height="28" rx="8" fill="${C.blueD}"/><rect x="34" y="46" width="40" height="20" rx="6" fill="${C.white}" opacity=".25"/><rect x="78" y="46" width="40" height="20" rx="6" fill="${C.white}" opacity=".25"/><rect x="22" y="72" width="8" height="12" fill="${C.woodD}"/><rect x="120" y="72" width="8" height="12" fill="${C.woodD}"/>`) },
        { id: 'bookshelf', name: 'Bookshelf', tags: 'shelf storage books', w: 100, h: 140,
          svg: svg('100 140', `<rect x="12" y="8" width="76" height="126" rx="4" fill="${C.woodD}"/><rect x="18" y="14" width="64" height="34" fill="${C.paper}"/><rect x="18" y="52" width="64" height="34" fill="${C.paper}"/><rect x="18" y="90" width="64" height="34" fill="${C.paper}"/><rect x="22" y="16" width="7" height="30" fill="${C.red}"/><rect x="30" y="16" width="7" height="30" fill="${C.blue}"/><rect x="38" y="16" width="7" height="30" fill="${C.green}"/><rect x="46" y="18" width="7" height="28" fill="${C.yellow}"/><rect x="24" y="54" width="7" height="30" fill="${C.blue}"/><rect x="32" y="54" width="7" height="30" fill="${C.red}"/><rect x="40" y="56" width="7" height="28" fill="${C.yellow}"/><rect x="60" y="92" width="18" height="30" fill="${C.green}"/>`) },
        { id: 'lamp', name: 'Floor Lamp', tags: 'light furniture', w: 60, h: 150,
          svg: svg('60 150', `<path d="M14 44 L46 44 L40 18 L20 18 Z" fill="${C.yellow}"/><path d="M20 18 L40 18 L38 12 L22 12 Z" fill="${C.yellowD}"/><rect x="28" y="44" width="4" height="86" fill="${C.metalD}"/><ellipse cx="30" cy="134" rx="18" ry="6" fill="${C.dark}"/>`) },
        { id: 'bed', name: 'Bed', tags: 'home bedroom sleep furniture', w: 160, h: 110,
          svg: svg('160 110', `<rect x="12" y="30" width="136" height="42" rx="8" fill="${C.white}"/><rect x="18" y="28" width="124" height="12" rx="6" fill="${C.paper}"/><rect x="18" y="72" width="18" height="24" fill="${C.woodD}"/><rect x="124" y="72" width="18" height="24" fill="${C.woodD}"/><rect x="26" y="42" width="30" height="18" fill="${C.blue}" opacity=".55"/><rect x="62" y="42" width="30" height="18" fill="${C.blue}" opacity=".4"/><rect x="98" y="42" width="30" height="18" fill="${C.blue}" opacity=".55"/>`) },
        { id: 'coffeemaker', name: 'Coffee Maker', tags: 'kitchen home cafe appliance', w: 80, h: 100,
          svg: svg('80 100', `<rect x="20" y="22" width="40" height="40" rx="8" fill="${C.woodD}"/><rect x="26" y="16" width="28" height="12" rx="3" fill="${C.metalL}"/><rect x="22" y="58" width="36" height="18" rx="4" fill="${C.woodL}"/><rect x="33" y="52" width="14" height="14" fill="${C.blue}" opacity=".35"/><path d="M30 70 h20" stroke="${C.dark}" stroke-width="2" stroke-linecap="round"/>`) },
    ];

    // ---- Classroom -------------------------------------------------------
    const classroom = [
        { id: 'blackboard', name: 'Blackboard', tags: 'board chalk teach school', w: 150, h: 100,
          svg: svg('150 100', `<rect x="8" y="8" width="134" height="78" rx="4" fill="${C.woodD}"/><rect x="16" y="16" width="118" height="62" rx="2" fill="#2f4a3a"/><path d="M30 34 H92 M30 46 H110 M30 58 H80" stroke="${C.white}" stroke-width="2.5" stroke-linecap="round" opacity=".8"/><rect x="24" y="80" width="102" height="8" rx="2" fill="${C.wood}"/><rect x="60" y="82" width="16" height="4" fill="${C.white}"/>`) },
        { id: 'school-desk', name: 'School Desk', tags: 'desk table student', w: 110, h: 100,
          svg: svg('110 100', `<rect x="14" y="30" width="82" height="12" rx="3" fill="${C.woodL}"/><rect x="14" y="30" width="82" height="5" rx="3" fill="#e3c39a"/><rect x="22" y="42" width="8" height="46" fill="${C.metalD}"/><rect x="80" y="42" width="8" height="46" fill="${C.metalD}"/><rect x="18" y="60" width="74" height="8" rx="3" fill="${C.metal}"/><rect x="30" y="18" width="52" height="12" rx="3" fill="${C.wood}"/>`) },
        { id: 'globe', name: 'Globe', tags: 'geography world map', w: 80, h: 100,
          svg: svg('80 100', `<circle cx="40" cy="40" r="30" fill="${C.blue}"/><path d="M18 30 C34 26 46 34 62 30 M14 44 C30 50 50 40 66 46 M40 10 v60" stroke="${C.green}" stroke-width="3" fill="none" opacity=".85"/><path d="M40 10 A30 30 0 0 1 40 70" stroke="${C.blueD}" stroke-width="2" fill="none"/><rect x="36" y="70" width="8" height="12" fill="${C.woodD}"/><path d="M26 82 h28 l-4 8 h-20 z" fill="${C.wood}"/><path d="M40 8 a34 20 0 0 0 22 32" stroke="${C.metalD}" stroke-width="3" fill="none"/>`) },
        { id: 'book-stack', name: 'Book Stack', tags: 'books read library', w: 90, h: 70,
          svg: svg('90 70', `<rect x="14" y="46" width="62" height="12" rx="2" fill="${C.red}"/><rect x="14" y="46" width="8" height="12" fill="${C.redD}"/><rect x="20" y="34" width="58" height="12" rx="2" fill="${C.blue}"/><rect x="20" y="34" width="8" height="12" fill="${C.blueD}"/><rect x="16" y="22" width="60" height="12" rx="2" fill="${C.green}"/><rect x="16" y="22" width="8" height="12" fill="${C.greenD}"/>`) },
        { id: 'backpack', name: 'Backpack', tags: 'bag school student', w: 80, h: 100,
          svg: svg('80 100', `<rect x="18" y="26" width="44" height="58" rx="14" fill="${C.red}"/><rect x="18" y="52" width="44" height="26" rx="8" fill="${C.redD}"/><rect x="30" y="56" width="20" height="16" rx="4" fill="${C.yellow}"/><path d="M26 30 C26 14 54 14 54 30" stroke="${C.redD}" stroke-width="6" fill="none"/><rect x="34" y="20" width="12" height="10" rx="3" fill="${C.redD}"/>`) },
        { id: 'pencil', name: 'Pencil', tags: 'write stationery', w: 40, h: 140,
          svg: svg('40 140', `<rect x="14" y="24" width="12" height="86" fill="${C.yellow}"/><rect x="14" y="24" width="4" height="86" fill="${C.yellowD}"/><path d="M14 110 L26 110 L20 128 Z" fill="${C.woodL}"/><path d="M17 119 L23 119 L20 128 Z" fill="${C.dark}"/><rect x="14" y="14" width="12" height="10" fill="${C.red}"/><rect x="13" y="20" width="14" height="4" fill="${C.metal}"/>`) },
    ];

    // ---- Office ----------------------------------------------------------
    const office = [
        { id: 'office-desk', name: 'Office Desk', tags: 'desk work table', w: 150, h: 100,
          svg: svg('150 100', `<rect x="10" y="34" width="130" height="12" rx="2" fill="${C.woodL}"/><rect x="10" y="34" width="130" height="5" rx="2" fill="#e3c39a"/><rect x="18" y="46" width="40" height="44" fill="${C.wood}"/><rect x="24" y="54" width="28" height="6" rx="2" fill="${C.woodD}"/><rect x="24" y="66" width="28" height="6" rx="2" fill="${C.woodD}"/><rect x="128" y="46" width="8" height="44" fill="${C.woodD}"/>`) },
        { id: 'office-chair', name: 'Office Chair', tags: 'seat swivel work', w: 90, h: 130,
          svg: svg('90 130', `<rect x="26" y="10" width="40" height="44" rx="10" fill="${C.dark}"/><rect x="24" y="50" width="44" height="16" rx="6" fill="${C.black}"/><rect x="43" y="66" width="6" height="26" fill="${C.metalD}"/><path d="M24 108 L66 108 L60 94 L30 94 Z" fill="${C.metal}"/><circle cx="28" cy="112" r="6" fill="${C.metalD}"/><circle cx="62" cy="112" r="6" fill="${C.metalD}"/><circle cx="45" cy="114" r="6" fill="${C.metalD}"/>`) },
        { id: 'monitor', name: 'Computer Monitor', tags: 'screen pc desktop tech', w: 110, h: 100,
          svg: svg('110 100', `<rect x="14" y="12" width="82" height="54" rx="4" fill="${C.dark}"/><rect x="20" y="18" width="70" height="42" rx="2" fill="${C.glass}"/><path d="M28 52 L44 34 L54 44 L66 26 L82 52 Z" fill="${C.blue}" opacity=".7"/><rect x="50" y="66" width="10" height="14" fill="${C.metalD}"/><rect x="36" y="80" width="38" height="7" rx="3" fill="${C.metal}"/>`) },
        { id: 'filing-cabinet', name: 'Filing Cabinet', tags: 'storage drawer office', w: 80, h: 130,
          svg: svg('80 130', `<rect x="18" y="10" width="44" height="112" rx="3" fill="${C.metal}"/><rect x="22" y="16" width="36" height="30" rx="2" fill="${C.metalL}"/><rect x="22" y="50" width="36" height="30" rx="2" fill="${C.metalL}"/><rect x="22" y="84" width="36" height="30" rx="2" fill="${C.metalL}"/><rect x="34" y="28" width="12" height="4" fill="${C.metalD}"/><rect x="34" y="62" width="12" height="4" fill="${C.metalD}"/><rect x="34" y="96" width="12" height="4" fill="${C.metalD}"/>`) },
        { id: 'water-cooler', name: 'Water Cooler', tags: 'drink office break', w: 60, h: 140,
          svg: svg('60 140', `<path d="M20 30 h20 l-3 18 h-14 z" fill="${C.glass}"/><ellipse cx="30" cy="30" rx="10" ry="4" fill="${C.blue}" opacity=".6"/><rect x="16" y="48" width="28" height="72" rx="4" fill="${C.metalL}"/><rect x="24" y="66" width="12" height="10" rx="2" fill="${C.blue}"/><rect x="22" y="118" width="16" height="8" fill="${C.metalD}"/>`) },
        { id: 'printer', name: 'Printer', tags: 'office print paper', w: 100, h: 90,
          svg: svg('100 90', `<rect x="16" y="34" width="68" height="40" rx="5" fill="${C.gray}"/><rect x="24" y="20" width="52" height="18" rx="3" fill="${C.grayD}"/><rect x="30" y="14" width="40" height="10" fill="${C.paper}"/><rect x="26" y="44" width="48" height="8" rx="2" fill="${C.dark}"/><rect x="30" y="70" width="40" height="10" rx="2" fill="${C.paper}"/><circle cx="70" cy="60" r="3" fill="${C.green}"/>`) },
    ];

    // ---- Hospital --------------------------------------------------------
    const hospital = [
        { id: 'hospital-bed', name: 'Hospital Bed', tags: 'bed patient ward medical', w: 160, h: 90,
          svg: svg('160 90', `<rect x="14" y="44" width="132" height="16" rx="4" fill="${C.blue}"/><rect x="20" y="34" width="40" height="14" rx="4" fill="${C.white}"/><rect x="10" y="30" width="8" height="46" fill="${C.metalD}"/><rect x="142" y="38" width="8" height="38" fill="${C.metalD}"/><rect x="10" y="30" width="8" height="24" rx="3" fill="${C.metal}"/><rect x="24" y="60" width="10" height="18" fill="${C.metalD}"/><rect x="126" y="60" width="10" height="18" fill="${C.metalD}"/>`) },
        { id: 'iv-stand', name: 'IV Stand', tags: 'drip medical hospital', w: 50, h: 160,
          svg: svg('50 160', `<rect x="23" y="46" width="4" height="94" fill="${C.metal}"/><path d="M18 22 h14 v20 a7 7 0 0 1 -14 0 z" fill="${C.glass}"/><rect x="18" y="22" width="14" height="8" fill="${C.blue}" opacity=".5"/><path d="M25 42 v18" stroke="${C.dark}" stroke-width="1.5"/><path d="M13 140 L37 140 M18 140 L14 150 M32 140 L36 150" stroke="${C.metalD}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M25 12 v10 M20 16 h10" stroke="${C.metalD}" stroke-width="3" stroke-linecap="round"/>`) },
        { id: 'wheelchair', name: 'Wheelchair', tags: 'chair mobility medical', w: 110, h: 120,
          svg: svg('110 120', `<circle cx="40" cy="86" r="24" fill="none" stroke="${C.dark}" stroke-width="5"/><circle cx="40" cy="86" r="4" fill="${C.metalD}"/><path d="M22 86 L40 86 M40 86 L54 70 M28 74 L52 98 M52 74 L28 98" stroke="${C.metal}" stroke-width="2"/><circle cx="82" cy="98" r="10" fill="none" stroke="${C.dark}" stroke-width="4"/><rect x="40" y="40" width="34" height="10" rx="3" fill="${C.blue}"/><rect x="40" y="40" width="8" height="36" fill="${C.blue}"/><rect x="40" y="50" width="34" height="8" fill="${C.blueD}"/><path d="M40 40 L34 24" stroke="${C.metalD}" stroke-width="4" stroke-linecap="round"/>`) },
        { id: 'stretcher', name: 'Stretcher', tags: 'gurney trolley medical', w: 150, h: 90,
          svg: svg('150 90', `<rect x="16" y="40" width="118" height="12" rx="4" fill="${C.green}"/><rect x="20" y="34" width="34" height="10" rx="3" fill="${C.white}"/><rect x="24" y="52" width="8" height="22" fill="${C.metalD}"/><rect x="118" y="52" width="8" height="22" fill="${C.metalD}"/><circle cx="28" cy="80" r="7" fill="${C.dark}"/><circle cx="122" cy="80" r="7" fill="${C.dark}"/>`) },
        { id: 'first-aid', name: 'First Aid Box', tags: 'medical kit emergency', w: 90, h: 80,
          svg: svg('90 80', `<rect x="16" y="20" width="58" height="46" rx="6" fill="${C.white}"/><rect x="16" y="20" width="58" height="12" rx="6" fill="${C.paper}"/><rect x="38" y="34" width="14" height="26" fill="${C.red}"/><rect x="32" y="40" width="26" height="14" fill="${C.red}"/><rect x="36" y="14" width="18" height="8" rx="3" fill="${C.grayD}"/>`) },
    ];

    // ---- Farm ------------------------------------------------------------
    const farm = [
        { id: 'tractor', name: 'Tractor', tags: 'farm vehicle machine', w: 150, h: 110,
          svg: svg('150 110', `<circle cx="42" cy="78" r="26" fill="${C.dark}"/><circle cx="42" cy="78" r="12" fill="${C.metalL}"/><circle cx="110" cy="82" r="16" fill="${C.dark}"/><circle cx="110" cy="82" r="7" fill="${C.metalL}"/><rect x="70" y="44" width="48" height="30" rx="4" fill="${C.red}"/><rect x="78" y="26" width="30" height="22" rx="3" fill="${C.redD}"/><rect x="82" y="30" width="22" height="15" fill="${C.glass}"/><rect x="30" y="56" width="44" height="20" rx="3" fill="${C.red}"/><rect x="112" y="52" width="12" height="8" fill="${C.metalD}"/>`) },
        { id: 'barn', name: 'Barn', tags: 'farm building shed', w: 150, h: 130,
          svg: svg('150 130', `<path d="M20 54 L75 20 L130 54 Z" fill="${C.redD}"/><rect x="26" y="54" width="98" height="66" fill="${C.red}"/><rect x="60" y="72" width="30" height="48" fill="${C.woodD}"/><path d="M75 72 v48 M60 84 h30 M60 96 h30" stroke="${C.woodL}" stroke-width="2"/><path d="M64 30 L86 30 L86 46 L75 40 L64 46 Z" fill="${C.paper}"/><rect x="30" y="56" width="90" height="6" fill="${C.woodL}" opacity=".5"/>`) },
        { id: 'haystack', name: 'Haystack', tags: 'farm hay straw', w: 110, h: 90,
          svg: svg('110 90', `<ellipse cx="55" cy="60" rx="46" ry="26" fill="${C.yellow}"/><path d="M12 60 a46 26 0 0 1 86 0" fill="${C.yellowD}"/><path d="M20 54 h70 M16 62 h78 M24 70 h62" stroke="${C.woodD}" stroke-width="2" opacity=".4"/><ellipse cx="55" cy="82" rx="46" ry="6" fill="${C.woodD}" opacity=".3"/>`) },
        { id: 'fence', name: 'Fence', tags: 'farm wood barrier', w: 150, h: 80,
          svg: svg('150 80', `<rect x="18" y="30" width="8" height="44" fill="${C.woodL}"/><rect x="58" y="30" width="8" height="44" fill="${C.woodL}"/><rect x="98" y="30" width="8" height="44" fill="${C.woodL}"/><rect x="128" y="30" width="8" height="44" fill="${C.woodL}"/><rect x="12" y="38" width="128" height="7" fill="${C.wood}"/><rect x="12" y="56" width="128" height="7" fill="${C.wood}"/><path d="M18 30 l4 -6 4 6 M58 30 l4 -6 4 6 M98 30 l4 -6 4 6 M128 30 l4 -6 4 6" fill="${C.woodD}"/>`) },
        { id: 'tree', name: 'Tree', tags: 'farm nature plant', w: 110, h: 140,
          svg: svg('110 140', `<rect x="48" y="86" width="14" height="42" fill="${C.woodD}"/><circle cx="55" cy="56" r="36" fill="${C.leaf}"/><circle cx="34" cy="66" r="22" fill="${C.leafD}"/><circle cx="78" cy="64" r="24" fill="${C.green}"/><circle cx="55" cy="44" r="22" fill="${C.green}"/><ellipse cx="55" cy="128" rx="32" ry="6" fill="${C.woodD}" opacity=".3"/>`) },
        { id: 'well', name: 'Water Well', tags: 'farm water stone', w: 100, h: 120,
          svg: svg('100 120', `<path d="M18 40 L82 40 L74 20 L26 20 Z" fill="${C.woodD}"/><rect x="14" y="40" width="8" height="16" fill="${C.wood}"/><rect x="78" y="40" width="8" height="16" fill="${C.wood}"/><ellipse cx="50" cy="92" rx="34" ry="12" fill="${C.brickD}"/><path d="M16 60 a34 12 0 0 0 68 0 v32 a34 12 0 0 1 -68 0 z" fill="${C.brick}"/><path d="M24 74 h52 M20 84 h60" stroke="${C.brickD}" stroke-width="2" opacity=".6"/><ellipse cx="50" cy="60" rx="34" ry="12" fill="${C.dark}"/><rect x="30" y="30" width="40" height="6" rx="2" fill="${C.woodL}"/>`) },
    ];

    // ---- Street ----------------------------------------------------------
    const street = [
        { id: 'streetlight', name: 'Street Light', tags: 'lamp city road light', w: 60, h: 160,
          svg: svg('60 160', `<rect x="26" y="30" width="6" height="108" fill="${C.metalD}"/><path d="M29 30 q0 -16 18 -16" stroke="${C.metalD}" stroke-width="6" fill="none"/><path d="M40 14 h16 l-3 12 h-10 z" fill="${C.yellow}"/><ellipse cx="48" cy="30" rx="9" ry="4" fill="${C.yellow}" opacity=".5"/><rect x="18" y="136" width="22" height="8" rx="2" fill="${C.dark}"/>`) },
        { id: 'bench', name: 'Park Bench', tags: 'seat street park', w: 130, h: 80,
          svg: svg('130 80', `<rect x="16" y="40" width="98" height="8" rx="2" fill="${C.wood}"/><rect x="16" y="26" width="98" height="7" rx="2" fill="${C.wood}"/><rect x="16" y="34" width="98" height="6" rx="2" fill="${C.woodD}"/><rect x="22" y="48" width="8" height="24" fill="${C.metalD}"/><rect x="100" y="48" width="8" height="24" fill="${C.metalD}"/><rect x="18" y="24" width="6" height="26" fill="${C.metalD}"/><rect x="106" y="24" width="6" height="26" fill="${C.metalD}"/>`) },
        { id: 'traffic-light', name: 'Traffic Light', tags: 'signal road city', w: 50, h: 150,
          svg: svg('50 150', `<rect x="21" y="70" width="6" height="70" fill="${C.dark}"/><rect x="12" y="14" width="26" height="60" rx="6" fill="${C.black}"/><circle cx="25" cy="28" r="8" fill="${C.red}"/><circle cx="25" cy="44" r="8" fill="${C.yellow}"/><circle cx="25" cy="60" r="8" fill="${C.green}"/>`) },
        { id: 'fire-hydrant', name: 'Fire Hydrant', tags: 'street city water', w: 60, h: 100,
          svg: svg('60 100', `<rect x="24" y="82" width="12" height="10" fill="${C.redD}"/><rect x="18" y="76" width="24" height="8" rx="2" fill="${C.red}"/><rect x="22" y="32" width="16" height="46" rx="6" fill="${C.red}"/><path d="M22 40 q8 -8 16 0" fill="${C.redD}"/><circle cx="30" cy="30" r="9" fill="${C.red}"/><circle cx="30" cy="30" r="4" fill="${C.redD}"/><rect x="12" y="50" width="8" height="8" rx="2" fill="${C.redD}"/><rect x="40" y="50" width="8" height="8" rx="2" fill="${C.redD}"/>`) },
        { id: 'trash-bin', name: 'Trash Bin', tags: 'street city waste', w: 70, h: 100,
          svg: svg('70 100', `<rect x="18" y="30" width="34" height="14" rx="3" fill="${C.greenD}"/><path d="M20 44 L50 44 L46 88 L24 88 Z" fill="${C.green}"/><path d="M28 50 v32 M35 50 v32 M42 50 v32" stroke="${C.greenD}" stroke-width="2"/><rect x="30" y="24" width="10" height="8" rx="2" fill="${C.greenD}"/>`) },
        { id: 'mailbox', name: 'Mailbox', tags: 'street post mail', w: 60, h: 120,
          svg: svg('60 120', `<rect x="26" y="60" width="6" height="48" fill="${C.metalD}"/><path d="M14 40 h30 a8 8 0 0 1 0 24 h-30 z" fill="${C.blue}"/><rect x="14" y="40" width="30" height="24" fill="${C.blueD}" opacity=".3"/><rect x="18" y="48" width="18" height="4" rx="2" fill="${C.white}"/><rect x="44" y="46" width="4" height="10" fill="${C.red}"/>`) },
    ];

    // ---- Icon accents (recolorable native 'icon' objects) ----------------
    // These use iconPath (| = multiple subpaths) + viewBox and are inserted as 'icon' type.
    const accents = [
        { id: 'medical-cross', name: 'Medical Cross', category: 'hospital', tags: 'plus health symbol', iconPath: 'M40 12 h20 v28 h28 v20 h-28 v28 h-20 v-28 h-28 v-20 h28 z', viewBox: '0 0 100 100', fill: '#e2574c' },
        { id: 'road-arrow', name: 'Direction Sign', tags: 'street arrow direction', category: 'street', iconPath: 'M16 38 h44 v-16 l24 28 l-24 28 v-16 h-44 z', viewBox: '0 0 100 100', fill: '#4a90d9' },
        { id: 'potted-plant', name: 'Potted Plant', tags: 'office plant green decor', category: 'office', iconPath: 'M38 62 h24 l-4 30 h-16 z|M50 62 C40 42 24 46 30 26 C46 30 46 46 50 56 C54 46 54 30 70 26 C76 46 60 42 50 62 Z', viewBox: '0 0 100 100', fill: '#4caf50' },
    ];

    const categories = [
        { id: 'classroom', name: 'Classroom', icon: '🏫' },
        { id: 'office', name: 'Office', icon: '🏢' },
        { id: 'hospital', name: 'Hospital', icon: '🏥' },
        { id: 'farm', name: 'Farm', icon: '🚜' },
        { id: 'street', name: 'Street', icon: '🏙️' },
        { id: 'furniture', name: 'Furniture', icon: '🪑' },
        { id: 'home', name: 'Home', icon: '🏡' },
        { id: 'village', name: 'Village', icon: '🏡' },
    ];

    const village = [
        { id: 'mud-house', name: 'Mud House', tags: 'village house rural home community', w: 180, h: 140,
          svg: svg('180 140', `<rect x="20" y="52" width="140" height="72" fill="${C.brick}"/><path d="M16 52 L90 16 L164 52 Z" fill="${C.brickD}"/><rect x="48" y="74" width="28" height="30" fill="#d9d5b7"/><rect x="102" y="74" width="28" height="30" fill="#d9d5b7"/><rect x="70" y="58" width="16" height="18" fill="#d9d5b7"/><rect x="94" y="58" width="16" height="18" fill="#d9d5b7"/><path d="M48 104 h72" stroke="#7b4b36" stroke-width="4"/>`) },
        { id: 'village-well', name: 'Village Well', tags: 'village water well community', w: 110, h: 130,
          svg: svg('110 130', `<path d="M23 32 V94 M87 32 V94" stroke="${C.wood}" stroke-width="7"/><path d="M8 35 L55 7 L102 35Z" fill="${C.brickD}"/><path d="M25 51 H91 M91 45 V61" stroke="${C.woodD}" stroke-width="5"/><path d="M55 51 V81" stroke="${C.dark}" stroke-width="2"/><path d="M12 88 Q55 73 98 88 V116 Q55 132 12 116Z" fill="${C.metal}"/><ellipse cx="55" cy="88" rx="43" ry="13" fill="${C.metalL}"/><ellipse cx="55" cy="88" rx="32" ry="7" fill="${C.dark}"/><path d="M48 80 H64 L61 91 H51Z" fill="${C.woodL}"/><path d="M13 105 H97 M33 95 V103 M72 95 V103 M54 106 V122" stroke="${C.metalD}" stroke-width="2"/>`) },
        { id: 'roadside-stand', name: 'Roadside Stand', tags: 'market village cart vendor', w: 120, h: 110,
          svg: svg('120 110', `<rect x="18" y="44" width="84" height="26" fill="#d46d4e"/><rect x="30" y="28" width="60" height="18" fill="#e8b675"/><path d="M22 68 h76" stroke="#7b4b36" stroke-width="4"/><rect x="28" y="70" width="8" height="20" fill="#7d4d22"/><rect x="84" y="70" width="8" height="20" fill="#7d4d22"/><rect x="50" y="18" width="20" height="12" fill="#7d4d22"/>`) },
        { id: 'solar-panel', name: 'Solar Panel', tags: 'solar energy village renewable', w: 130, h: 100,
          svg: svg('130 100', `<path d="M32 51 V91 M98 51 V91 M22 92 H42 M88 92 H108" stroke="${C.metalD}" stroke-width="5"/><path d="M22 16 H107 L119 66 H10Z" fill="#365c87" stroke="${C.metalL}" stroke-width="4"/><path d="M40 17 L34 65 M63 17 V65 M85 17 L92 65 M19 32 H111 M15 48 H115" stroke="#91badc" stroke-width="2"/>`) },
        { id: 'bicycle', name: 'Bicycle', tags: 'transport village travel bike', w: 130, h: 90,
          svg: svg('130 90', `<g fill="none" stroke="${C.dark}" stroke-width="4"><circle cx="28" cy="60" r="23"/><circle cx="102" cy="60" r="23"/></g><path d="M28 60 L47 31 L65 60 H28 M47 31 H87 L65 60 M87 31 L102 60" fill="none" stroke="${C.blue}" stroke-width="4" stroke-linejoin="round"/><path d="M47 31 L43 22 M35 22 H52 M87 31 L83 15 H98 M65 60 L73 68 H81" fill="none" stroke="${C.dark}" stroke-width="3" stroke-linecap="round"/><circle cx="65" cy="60" r="5" fill="${C.metalD}"/>`) },
        { id: 'clinic-sign', name: 'Clinic Sign', tags: 'healthcare clinic community village', w: 90, h: 90,
          svg: svg('90 90', `<rect x="16" y="16" width="58" height="54" rx="8" fill="#e5f5f4"/><rect x="18" y="18" width="54" height="10" rx="6" fill="#d7efeb"/><rect x="38" y="32" width="14" height="24" fill="#e2574c"/><rect x="30" y="40" width="30" height="14" fill="#e2574c"/><rect x="30" y="64" width="30" height="4" fill="#7d4d22"/>`) },
    ];

    const home = [
        { id: 'bedside-table', name: 'Bedside Table', tags: 'home bedroom nightstand furniture', w: 80, h: 80,
          svg: svg('80 80', `<rect x="18" y="24" width="44" height="36" rx="4" fill="${C.wood}"/><rect x="22" y="18" width="36" height="10" rx="3" fill="${C.woodL}"/><rect x="22" y="58" width="36" height="8" rx="2" fill="${C.woodD}"/><circle cx="30" cy="30" r="4" fill="${C.metalD}"/><circle cx="48" cy="30" r="4" fill="${C.metalD}"/>`) },
        { id: 'plant-pot', name: 'Plant Pot', tags: 'home plant decor green', w: 90, h: 100,
          svg: svg('90 100', `<ellipse cx="45" cy="76" rx="26" ry="12" fill="${C.woodD}"/><path d="M34 72 h22 v12 H34 z" fill="${C.wood}"/><path d="M42 16 C35 28 34 42 45 48 C52 40 55 26 50 18 C48 14 45 10 42 16 Z" fill="${C.green}"/><path d="M49 18 C56 27 58 41 51 47 C46 40 42 31 43 22 C44 18 46 14 49 18 Z" fill="${C.leafD}"/><path d="M46 48 L46 72" stroke="${C.woodD}" stroke-width="4" stroke-linecap="round"/>`) },
        { id: 'kitchen-table', name: 'Kitchen Table', tags: 'home kitchen dining table', w: 140, h: 100,
          svg: svg('140 100', `<rect x="12" y="34" width="116" height="14" rx="3" fill="${C.wood}"/><rect x="12" y="34" width="116" height="5" rx="3" fill="${C.woodL}"/><rect x="22" y="48" width="8" height="32" fill="${C.woodD}"/><rect x="110" y="48" width="8" height="32" fill="${C.woodD}"/><rect x="40" y="22" width="60" height="10" rx="3" fill="${C.woodD}"/>`) },
    ];

    const items = { classroom, office, hospital, farm, street, furniture, home, village };
    // Fold icon accents into their categories (marked with iconType for the inserter).
    accents.forEach(a => {
        const bucket = items[a.category] || furniture;
        bucket.push({ ...a, iconType: true });
    });

    // ---- One-click Scenes (backdrop + prop pieces, auto-grouped) ---------
    // pieces reference props by propId; { ground:true } sits the prop on the floor line.
    const scenes = [
        { id: 'scene-classroom', name: 'Classroom', category: 'classroom', icon: '🏫', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#dbe7f2"/><rect y="360" width="900" height="160" fill="${C.woodL}"/><rect y="354" width="900" height="8" fill="${C.wood}"/><rect x="70" y="60" width="230" height="150" rx="6" fill="#eef4fa"/><path d="M185 60 v150 M70 135 h230" stroke="#c7d8e8" stroke-width="5"/><rect x="600" y="60" width="230" height="150" rx="6" fill="#eef4fa"/><path d="M715 60 v150 M600 135 h230" stroke="#c7d8e8" stroke-width="5"/>`),
          pieces: [
            { propId: 'blackboard', oX: 0, oY: -74, w: 300, h: 200, z: 1 },
            { propId: 'school-desk', oX: -185, ground: true, w: 150, h: 136, z: 3 },
            { propId: 'school-desk', oX: 30, ground: true, w: 150, h: 136, z: 3 },
            { propId: 'school-desk', oX: 250, ground: true, w: 140, h: 127, z: 3 },
            { propId: 'globe', oX: 250, oY: 17, w: 88, h: 110, z: 4 },
            { propId: 'backpack', oX: 185, ground: true, w: 80, h: 100, z: 4 }
          ] },
        { id: 'scene-office', name: 'Office', category: 'office', icon: '🏢', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#e8edf3"/><rect y="360" width="900" height="160" fill="${C.metal}"/><rect y="354" width="900" height="8" fill="${C.metalD}"/><rect x="560" y="50" width="280" height="190" rx="4" fill="${C.glass}"/><path d="M560 145 h280 M700 50 v190" stroke="#e8edf3" stroke-width="7"/>`),
          pieces: [
            { propId: 'filing-cabinet', oX: 210, ground: true, w: 100, h: 162, z: 2 },
            { propId: 'office-chair', oX: -195, ground: true, w: 120, h: 173, z: 2 },
            { propId: 'office-desk', oX: -50, ground: true, w: 220, h: 146, z: 3 },
            { propId: 'monitor', oX: -50, oY: 30, w: 150, h: 136, z: 4 },
            { propId: 'potted-plant', oX: 300, ground: true, w: 90, h: 90, z: 3 }
          ] },
        { id: 'scene-hospital', name: 'Hospital Ward', category: 'hospital', icon: '🏥', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="370" fill="#e7f2ee"/><rect y="370" width="900" height="150" fill="#d6e0e4"/><rect y="300" width="900" height="7" fill="#9fc4b5"/><rect x="70" y="90" width="150" height="110" rx="6" fill="#cfe8de"/>`),
          pieces: [
            { propId: 'medical-cross', oX: 250, oY: -96, w: 90, h: 90, z: 1 },
            { propId: 'hospital-bed', oX: -40, ground: true, w: 240, h: 135, z: 2 },
            { propId: 'iv-stand', oX: -195, ground: true, w: 60, h: 190, z: 3 },
            { propId: 'first-aid', oX: 230, ground: true, w: 90, h: 80, z: 3 }
          ] },
        { id: 'scene-farm', name: 'Farm', category: 'farm', icon: '🚜', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="340" fill="${C.sky}"/><circle cx="760" cy="86" r="44" fill="${C.yellow}"/><rect y="330" width="900" height="190" fill="${C.green}"/><path d="M0 330 q225 -26 450 0 t450 0 v14 H0 z" fill="${C.greenD}"/>`),
          pieces: [
            { propId: 'barn', oX: -200, ground: true, w: 200, h: 173, z: 2 },
            { propId: 'tree', oX: 250, ground: true, w: 140, h: 178, z: 2 },
            { propId: 'fence', oX: -40, ground: true, w: 200, h: 106, z: 2 },
            { propId: 'tractor', oX: 60, ground: true, w: 210, h: 154, z: 3 },
            { propId: 'haystack', oX: 210, ground: true, w: 120, h: 98, z: 3 }
          ] },
        { id: 'scene-street', name: 'Street', category: 'street', icon: '🏙️', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="300" fill="#cfe3f0"/><rect x="50" y="120" width="120" height="180" fill="${C.metal}"/><rect x="210" y="80" width="140" height="220" fill="${C.grayD}"/><rect x="650" y="100" width="150" height="200" fill="${C.metal}"/><rect y="300" width="900" height="70" fill="#b8c1cb"/><rect y="370" width="900" height="150" fill="${C.metalD}"/><rect y="410" width="900" height="6" fill="${C.yellow}"/>`),
          pieces: [
            { propId: 'streetlight', oX: -230, ground: true, w: 70, h: 186, z: 2 },
            { propId: 'traffic-light', oX: 240, ground: true, w: 60, h: 180, z: 2 },
            { propId: 'bench', oX: 0, ground: true, w: 160, h: 98, z: 3 },
            { propId: 'fire-hydrant', oX: -120, ground: true, w: 60, h: 100, z: 3 },
            { propId: 'trash-bin', oX: 130, ground: true, w: 70, h: 100, z: 3 }
          ] },
        { id: 'scene-bedroom', name: 'Bedroom', category: 'home', icon: '🛏️', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#edf3f8"/><rect y="360" width="900" height="160" fill="#d1dbe5"/><rect y="354" width="900" height="8" fill="#afbfcf"/><rect x="660" y="80" width="150" height="180" rx="8" fill="#dfeaf7"/><rect x="700" y="118" width="72" height="100" rx="6" fill="#bcd6ef"/><path d="M700 160 H772 M700 140 H772" stroke="#edf3f8" stroke-width="6"/>`),
          pieces: [
            { propId: 'bed', oX: -40, ground: true, w: 230, h: 150, z: 2 },
            { propId: 'bedside-table', oX: -200, ground: true, w: 90, h: 90, z: 3 },
            { propId: 'plant-pot', oX: 230, ground: true, w: 90, h: 100, z: 3 }
          ] },
        { id: 'scene-park', name: 'Park', category: 'farm', icon: '🌳', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#d9f0f7"/><circle cx="720" cy="90" r="48" fill="#f4c04e"/><rect y="360" width="900" height="160" fill="#7fbf5a"/><path d="M0 360 q110 -16 220 0 t220 0 t220 0 t220 0 v18 H0 z" fill="#6faf4a"/>`),
          pieces: [
            { propId: 'tree', oX: -240, ground: true, w: 140, h: 178, z: 2 },
            { propId: 'tree', oX: 220, ground: true, w: 140, h: 178, z: 2 },
            { propId: 'bench', oX: 0, ground: true, w: 160, h: 98, z: 3 },
            { propId: 'plant-pot', oX: 120, ground: true, w: 90, h: 100, z: 3 }
          ] },
        { id: 'scene-village', name: 'Village', category: 'village', icon: '🏡', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#dceeb6"/><rect y="360" width="900" height="160" fill="#b4cc7d"/><path d="M0 360 q130 -16 260 0 t260 0 t260 0 v18 H0 z" fill="#93b46a"/><circle cx="735" cy="92" r="46" fill="#f7d98a"/>`),
          pieces: [
            { propId: 'mud-house', oX: -180, ground: true, w: 190, h: 150, z: 2 },
            { propId: 'village-well', oX: 0, ground: true, w: 120, h: 144, z: 3 },
            { propId: 'roadside-stand', oX: 210, ground: true, w: 140, h: 130, z: 3 },
            { propId: 'solar-panel', oX: 330, ground: true, w: 150, h: 120, z: 1 }
          ] },
        { id: 'scene-rural-clinic', name: 'Rural Clinic', category: 'village', icon: '🩺', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#ebf4f0"/><rect y="360" width="900" height="160" fill="#d3ddd8"/><rect x="160" y="80" width="200" height="130" fill="#dceef2"/><rect x="520" y="90" width="180" height="120" fill="#dceef2"/><path d="M210 90 V210 M160 150 H360 M580 90 V210 M520 150 H700" stroke="#bad8d5" stroke-width="8"/>`),
          pieces: [
            { propId: 'clinic-sign', oX: 0, oY: -130, w: 80, h: 80, z: 1 },
            { propId: 'hospital-bed', oX: -160, ground: true, w: 260, h: 146, z: 2 },
            { propId: 'medical-cart', oX: 75, ground: true, w: 110, h: 140, z: 3 },
            { propId: 'waiting-seats', oX: 265, ground: true, w: 180, h: 100, z: 2 }
          ] },
        { id: 'scene-rural-market', name: 'Rural Market', category: 'village', icon: '🧺', groundY: 150,
          backdrop: svg('900 520', `<rect width="900" height="360" fill="#f4dfb2"/><rect y="360" width="900" height="160" fill="#d5b66e"/><path d="M0 360 q120 -18 240 0 t240 0 t240 0 v18 H0 z" fill="#c59546"/>`),
          pieces: [
            { propId: 'roadside-stand', oX: -170, ground: true, w: 150, h: 130, z: 2 },
            { propId: 'roadside-stand', oX: 100, ground: true, w: 150, h: 130, z: 2 },
            { propId: 'bicycle', oX: 260, ground: true, w: 130, h: 90, z: 3 },
            { propId: 'solar-panel', oX: -320, ground: true, w: 110, h: 85, z: 1 }
          ] }
    ];

    // Shared artwork keeps the editable scene and its flattened environment identical.
    const prop = (id, name, tags, w, h, body) => ({ id, name, tags, w, h, svg: svg(`${w} ${h}`, body) });
    const additions = {
        office: [
            prop('laptop', 'Laptop', 'computer remote work keyboard technology', 120, 84, `<rect x="18" y="6" width="84" height="56" rx="4" fill="${C.dark}"/><rect x="24" y="12" width="72" height="43" fill="${C.glass}"/><path d="M6 72 L18 62 H102 L114 72 V78 H6Z" fill="${C.metalL}"/><path d="M43 72 H77" stroke="${C.metalD}" stroke-width="3"/>`),
            prop('meeting-table', 'Meeting Table', 'conference boardroom teamwork furniture', 240, 115, `<rect x="35" y="48" width="12" height="60" fill="${C.metalD}"/><rect x="193" y="48" width="12" height="60" fill="${C.metalD}"/><rect x="8" y="23" width="224" height="30" rx="14" fill="${C.woodD}"/><rect x="8" y="17" width="224" height="28" rx="14" fill="${C.woodL}"/>`),
            prop('presentation-screen', 'Presentation Screen', 'training meeting projector conference', 170, 155, `<path d="M85 101 V142 M85 125 L48 150 M85 125 L122 150" stroke="${C.metalD}" stroke-width="6"/><rect x="8" y="10" width="154" height="96" rx="3" fill="${C.dark}"/><rect x="14" y="16" width="142" height="82" fill="${C.white}"/><path d="M35 77 H132 M35 77 V36" stroke="${C.grayD}" stroke-width="2"/><path d="M49 69 V55 M73 69 V42 M97 69 V30 M121 69 V47" stroke="${C.blue}" stroke-width="13"/>`)
        ],
        classroom: [
            prop('open-book', 'Open Book', 'reading study library textbook', 110, 75, `<path d="M55 17 Q31 4 7 13 V63 Q32 54 55 69 Q78 54 103 63 V13 Q79 4 55 17Z" fill="${C.paper}" stroke="${C.blueD}" stroke-width="3"/><path d="M55 18 V67 M18 25 Q33 22 46 29 M18 36 Q33 33 46 40 M65 29 Q79 22 93 25 M65 40 Q79 33 93 36" fill="none" stroke="${C.grayD}" stroke-width="2"/>`),
            prop('microscope', 'Microscope', 'science laboratory research biology', 100, 125, `<path d="M65 39 Q103 66 66 96" fill="none" stroke="${C.metalD}" stroke-width="14"/><path d="M34 12 L57 4 L75 47 L52 56Z" fill="${C.blue}"/><path d="M47 8 L62 44" stroke="${C.blueD}" stroke-width="7"/><rect x="26" y="70" width="52" height="8" rx="2" fill="${C.dark}"/><circle cx="74" cy="62" r="9" fill="${C.dark}"/><path d="M52 79 V106 M22 114 H86" stroke="${C.metalD}" stroke-width="12" stroke-linecap="round"/>`),
            prop('lab-bench', 'Laboratory Bench', 'science laboratory counter experiment', 190, 115, `<rect x="16" y="41" width="158" height="68" fill="${C.gray}"/><path d="M68 46 V104 M122 46 V104" stroke="${C.grayD}" stroke-width="2"/><path d="M38 56 H49 M86 56 H102 M140 56 H155" stroke="${C.dark}" stroke-width="4"/><rect x="7" y="30" width="176" height="13" rx="3" fill="${C.dark}"/><path d="M143 30 V14 Q143 5 154 10 V20" fill="none" stroke="${C.metalD}" stroke-width="5"/>`)
        ],
        hospital: [
            prop('exam-couch', 'Examination Couch', 'clinic doctor patient consultation', 190, 105, `<path d="M28 57 V98 M161 57 V98" stroke="${C.metalD}" stroke-width="8"/><path d="M16 40 L66 57 H174 V72 H55 L10 54Z" fill="${C.blueD}"/><path d="M17 30 L68 49 H177 V61 H64 L11 43Z" fill="${C.glass}"/><rect x="29" y="34" width="30" height="8" rx="4" transform="rotate(20 29 34)" fill="${C.white}"/>`),
            prop('privacy-screen', 'Privacy Screen', 'medical clinic hospital partition', 120, 150, `<path d="M12 10 V143 M108 10 V143 M8 142 H22 M99 142 H113" stroke="${C.metalD}" stroke-width="5"/><rect x="15" y="16" width="90" height="112" rx="3" fill="#8bcbbb"/><path d="M30 19 V124 M50 19 V124 M70 19 V124 M90 19 V124" stroke="#65a998" stroke-width="3"/>`),
            prop('medical-cart', 'Medical Cart', 'hospital clinic supplies trolley', 90, 115, `<path d="M17 20 V97 M73 20 V97" stroke="${C.metalD}" stroke-width="5"/><rect x="10" y="32" width="70" height="8" fill="${C.metalL}"/><rect x="10" y="77" width="70" height="8" fill="${C.metalL}"/><rect x="24" y="12" width="17" height="20" rx="3" fill="${C.blue}"/><rect x="52" y="7" width="15" height="25" rx="3" fill="${C.white}"/><rect x="25" y="59" width="37" height="18" rx="3" fill="#8bcbbb"/><circle cx="17" cy="102" r="7" fill="${C.dark}"/><circle cx="73" cy="102" r="7" fill="${C.dark}"/>`)
        ],
        home: [
            prop('kitchen-counter', 'Kitchen Counter', 'cooking sink cabinets home restaurant', 200, 120, `<rect x="12" y="42" width="176" height="69" fill="#82b5a7"/><path d="M69 48 V106 M128 48 V106" stroke="#568779" stroke-width="2"/><path d="M42 53 H54 M84 53 H112 M143 53 H156" stroke="${C.dark}" stroke-width="4"/><rect x="5" y="31" width="190" height="13" fill="${C.paper}"/><ellipse cx="135" cy="32" rx="31" ry="6" fill="${C.metal}"/><path d="M140 30 V12 Q140 2 151 10 V19" fill="none" stroke="${C.metalD}" stroke-width="5"/>`),
            prop('refrigerator', 'Refrigerator', 'fridge kitchen home food appliance', 85, 150, `<rect x="13" y="5" width="59" height="138" rx="7" fill="${C.metalL}"/><path d="M14 50 H71" stroke="${C.metalD}" stroke-width="3"/><path d="M61 20 V37 M61 65 V97" stroke="${C.dark}" stroke-width="4" stroke-linecap="round"/><path d="M24 144 V149 M60 144 V149" stroke="${C.dark}" stroke-width="5"/>`),
            prop('cooking-pot', 'Cooking Pot', 'kitchen food cooking saucepan', 100, 70, `<path d="M21 26 H79 V45 Q79 59 65 59 H35 Q21 59 21 45Z" fill="${C.metal}"/><path d="M21 31 H7 V42 H21 M79 31 H93 V42 H79" fill="none" stroke="${C.dark}" stroke-width="5"/><path d="M17 24 Q50 1 83 24Z" fill="${C.metalL}"/><rect x="43" y="5" width="14" height="7" rx="3" fill="${C.dark}"/>`)
        ],
        events: [
            prop('lectern', 'Lectern', 'podium speech lecture conference graduation worship', 100, 140, `<path d="M29 29 H73 L66 120 H36Z" fill="${C.wood}"/><path d="M14 20 L81 10 L90 27 L20 37Z" fill="${C.woodD}"/><rect x="20" y="120" width="64" height="10" rx="3" fill="${C.woodD}"/><path d="M57 15 V6 Q59 1 68 3" fill="none" stroke="${C.dark}" stroke-width="3"/>`),
            prop('microphone-stand', 'Microphone Stand', 'speech concert music stage performance', 70, 170, `<path d="M35 52 V151 M35 145 L10 165 M35 145 L61 165" stroke="${C.dark}" stroke-width="4"/><path d="M35 56 L52 22" stroke="${C.metalD}" stroke-width="4"/><rect x="44" y="7" width="13" height="28" rx="6" transform="rotate(24 50 21)" fill="${C.dark}"/><circle cx="35" cy="61" r="6" fill="${C.metal}"/>`),
            prop('stage-speaker', 'Stage Speaker', 'audio sound music concert pa', 80, 120, `<rect x="12" y="8" width="56" height="105" rx="5" fill="${C.dark}"/><circle cx="40" cy="77" r="23" fill="${C.black}"/><circle cx="40" cy="77" r="13" fill="${C.metalD}"/><circle cx="40" cy="33" r="13" fill="${C.black}"/><circle cx="40" cy="33" r="6" fill="${C.metalD}"/>`),
            prop('camera-tripod', 'Camera on Tripod', 'studio filming video media production', 110, 155, `<path d="M55 64 V140 M55 74 L23 148 M55 74 L89 148" stroke="${C.metalD}" stroke-width="5"/><rect x="20" y="21" width="65" height="43" rx="5" fill="${C.dark}"/><path d="M85 30 L104 23 V61 L85 54Z" fill="${C.black}"/><rect x="34" y="11" width="25" height="12" rx="3" fill="${C.metalD}"/><rect x="27" y="30" width="26" height="18" rx="2" fill="${C.glass}"/>`)
        ],
        travel: [
            prop('suitcase', 'Rolling Suitcase', 'airport travel luggage baggage', 75, 115, `<path d="M25 28 V7 H50 V28" fill="none" stroke="${C.metalD}" stroke-width="5"/><rect x="12" y="27" width="51" height="72" rx="8" fill="${C.blue}"/><path d="M26 39 V87 M38 39 V87 M50 39 V87" stroke="${C.blueD}" stroke-width="4"/><circle cx="22" cy="104" r="6" fill="${C.dark}"/><circle cx="54" cy="104" r="6" fill="${C.dark}"/>`),
            prop('waiting-seats', 'Waiting Seats', 'airport station clinic waiting bench', 190, 105, `<path d="M24 73 V99 M165 73 V99 M16 75 H176" stroke="${C.metalD}" stroke-width="6"/><g fill="${C.blueD}"><rect x="9" y="12" width="49" height="49" rx="7"/><rect x="70" y="12" width="49" height="49" rx="7"/><rect x="131" y="12" width="49" height="49" rx="7"/></g><g fill="${C.blue}"><rect x="7" y="58" width="53" height="13" rx="4"/><rect x="68" y="58" width="53" height="13" rx="4"/><rect x="129" y="58" width="53" height="13" rx="4"/></g>`),
            prop('bus-stop', 'Bus Stop Sign', 'transport commute station public bus', 80, 160, `<path d="M40 75 V151" stroke="${C.metalD}" stroke-width="7"/><rect x="13" y="6" width="54" height="76" rx="6" fill="${C.blueD}"/><rect x="24" y="21" width="32" height="39" rx="6" fill="${C.white}"/><rect x="28" y="26" width="24" height="18" rx="2" fill="${C.glass}"/><circle cx="30" cy="53" r="3" fill="${C.blueD}"/><circle cx="50" cy="53" r="3" fill="${C.blueD}"/><path d="M27 60 V66 M53 60 V66" stroke="${C.white}" stroke-width="5"/>`)
        ],
        sport: [
            prop('football-goal', 'Football Goal', 'soccer sports field pitch net', 190, 130, `<path d="M11 117 L29 29 H162 L180 117Z" fill="#ffffff" fill-opacity=".12" stroke="${C.grayD}" stroke-width="3"/><path d="M30 31 V115 M54 31 V115 M78 31 V115 M102 31 V115 M126 31 V115 M150 31 V115 M24 54 H168 M19 77 H172 M15 99 H177" stroke="${C.white}" stroke-width="2"/><path d="M11 118 V12 H180 V118" fill="none" stroke="${C.white}" stroke-width="7"/>`),
            prop('basketball-hoop', 'Basketball Hoop', 'sports court basketball net', 105, 175, `<path d="M54 39 V162 M29 166 H81" stroke="${C.metalD}" stroke-width="7"/><rect x="8" y="9" width="88" height="58" rx="3" fill="${C.white}" stroke="${C.grayD}" stroke-width="3"/><rect x="37" y="34" width="34" height="25" fill="none" stroke="${C.red}" stroke-width="3"/><path d="M33 65 L41 92 H69 L77 65 M43 67 L65 92 M68 67 L46 92" fill="none" stroke="${C.grayD}" stroke-width="2"/><ellipse cx="55" cy="64" rx="24" ry="5" fill="none" stroke="${C.red}" stroke-width="4"/>`),
            prop('training-cone', 'Training Cone', 'sport safety construction practice traffic', 65, 80, `<path d="M11 63 L27 9 H38 L54 63Z" fill="#ec713b"/><path d="M23 23 H42 L46 37 H19Z" fill="${C.white}"/><rect x="4" y="62" width="57" height="11" rx="3" fill="#b74724"/>`)
        ],
        construction: [
            prop('toolbox', 'Toolbox', 'workshop repair engineer construction tools', 110, 80, `<path d="M36 23 V11 H74 V23" fill="none" stroke="${C.dark}" stroke-width="6"/><rect x="9" y="22" width="92" height="48" rx="5" fill="${C.red}"/><path d="M9 40 H101" stroke="${C.redD}" stroke-width="4"/><rect x="46" y="34" width="18" height="16" rx="2" fill="${C.metalL}"/>`),
            prop('workbench', 'Workbench', 'workshop repair maker table engineering', 190, 130, `<path d="M26 47 V120 M164 47 V120 M26 94 H164" stroke="${C.dark}" stroke-width="10"/><rect x="6" y="31" width="178" height="18" rx="3" fill="${C.woodL}"/><path d="M122 23 H153 V58 H133 V31" fill="${C.metalD}"/><path d="M157 44 H179 M174 34 V56" stroke="${C.dark}" stroke-width="4"/>`),
            prop('safety-barrier', 'Safety Barrier', 'construction work zone road safety', 155, 110, `<path d="M23 23 V99 M132 23 V99 M9 102 H37 M118 102 H146" stroke="${C.dark}" stroke-width="6"/><rect x="8" y="25" width="139" height="41" rx="3" fill="${C.yellow}"/><path d="M15 61 L44 30 M54 61 L83 30 M93 61 L122 30" stroke="${C.dark}" stroke-width="11"/>`)
        ]
    };
    for (const [id, name] of [['events', 'Events & Media'], ['travel', 'Travel'], ['sport', 'Sport'], ['construction', 'Workshop & Safety']]) {
        categories.push({ id, name });
    }
    Object.entries(additions).forEach(([key, list]) => { (items[key] ||= []).push(...list); });

    const communityProps = {
        farm: [
            prop('crop-bed', 'Vegetable Bed', 'farmer agriculture seedlings cultivation garden rural', 280, 130, `<path d="M30 78 H249 L279 114 L251 130 H23 L1 113Z" fill="#71544b"/><path d="M30 78 H249 L279 114 H1Z" fill="#967260"/><path d="M25 108 H253 M36 90 H242" stroke="#b38c70" stroke-width="4"/>${[52, 110, 168, 226].map(x => `<path d="M${x} 100 V42" stroke="#3a764a" stroke-width="4"/><path d="M${x} 67 Q${x - 35} 62 ${x - 26} 34 Q${x - 4} 35 ${x} 67 M${x} 79 Q${x + 36} 69 ${x + 28} 46 Q${x + 7} 48 ${x} 79 M${x} 51 Q${x - 15} 26 ${x + 6} 12 Q${x + 19} 36 ${x} 51" fill="#4e9562"/>`).join('')}`),
            prop('farm-store', 'Farm Store Shed', 'farmer storage harvest cooperative agriculture rural', 230, 220, `<path d="M22 65 H208 V220 H22Z" fill="#dce5df"/><path d="M22 180 H208 V220 H22Z" fill="#87a897"/><path d="M8 68 L48 18 H188 L224 68Z" fill="#537d83"/><path d="M26 61 L57 26 M60 61 L81 26 M95 61 L107 26 M129 61 L132 26 M163 61 L157 26 M198 61 L182 26" stroke="#789da0" stroke-width="4"/><rect x="44" y="102" width="75" height="118" fill="#41606a"/><path d="M53 112 V212 M66 112 V212 M79 112 V212 M92 112 V212 M105 112 V212" stroke="#587883" stroke-width="3"/><rect x="141" y="99" width="45" height="48" fill="#b9dfed" stroke="#f7fafc" stroke-width="6"/><path d="M163 99 V147" stroke="#f7fafc" stroke-width="4"/><circle cx="105" cy="165" r="3" fill="#e2dfc3"/>`)
        ],
        village: [
            prop('market-canopy', 'Market Canopy Stall', 'market trader vendor produce food shop rural', 270, 270, `<path d="M25 58 V270 M245 58 V270" stroke="#68787d" stroke-width="8"/><path d="M14 52 L48 8 H222 L256 52Z" fill="#287d80"/><path d="M71 52 L88 8 H122 L116 52 M159 52 L155 8 H188 L204 52" fill="#d5e9dc"/><path d="M14 52 H256 V72 Q239 88 222 72 Q204 88 187 72 Q170 88 153 72 Q135 88 118 72 Q100 88 83 72 Q65 88 48 72 Q31 88 14 72Z" fill="#429296"/><path d="M31 183 H239 V250 H31Z" fill="#be8054"/><path d="M37 198 H233 M37 223 H233" stroke="#975e40" stroke-width="3"/><path d="M18 171 H252 V184 H18Z" fill="#e0b57c"/><path d="M47 251 V270 M223 251 V270" stroke="#786250" stroke-width="8"/>`),
            prop('market-scale', 'Produce Weighing Scale', 'market trader food vendor balance weighing', 100, 100, `<path d="M17 89 H83 V100 H17Z" fill="#456f76"/><path d="M27 38 H73 L80 89 H20Z" fill="#699ba0"/><circle cx="50" cy="66" r="20" fill="#f4f6ef" stroke="#36555d" stroke-width="3"/><path d="M36 65 L39 57 M48 50 V56 M60 56 L64 61 M38 76 L42 72" stroke="#8b989d" stroke-width="2"/><path d="M50 67 L60 55" stroke="#cb5548" stroke-width="3"/><circle cx="50" cy="67" r="3" fill="#36555d"/><path d="M50 38 V25" stroke="#657782" stroke-width="7"/><path d="M4 11 H96 L84 28 H16Z" fill="#becdd1"/><path d="M8 12 H92" stroke="#edf3f4" stroke-width="3"/>`),
            prop('grain-sacks', 'Grain Sacks', 'farmer market storage harvest rice maize produce', 140, 110, `<path d="M30 29 L23 8 Q48 0 71 9 L63 29 C82 47 92 96 70 106 H23 C5 92 12 49 30 29Z" fill="#d8c795"/><path d="M29 27 Q47 33 65 27 M25 72 Q46 78 69 71" fill="none" stroke="#a98e58" stroke-width="3"/><path d="M87 43 L79 23 Q103 14 127 24 L119 43 C138 64 146 97 123 110 H80 C65 96 71 63 87 43Z" fill="#b7c8ba"/><path d="M86 42 Q102 48 120 42 M81 82 H126" fill="none" stroke="#729783" stroke-width="3"/>`),
            prop('courtyard-bench', 'Courtyard Bench', 'village community meeting seating bench public', 210, 125, `<path d="M30 65 V125 M180 65 V125" stroke="#546b71" stroke-width="11"/><path d="M22 7 H188 V29 H22Z M22 37 H188 V59 H22Z" fill="#aa7454"/><path d="M33 6 V89 M177 6 V89" stroke="#546b71" stroke-width="6"/><path d="M12 76 H198 V91 H12Z" fill="#c38b64"/><path d="M25 104 H184" stroke="#657e82" stroke-width="6"/>`),
            prop('community-noticeboard', 'Community Noticeboard', 'village community announcements information meeting', 155, 190, `<path d="M26 91 V190 M129 91 V190" stroke="#536d6a" stroke-width="9"/><rect x="8" y="17" width="139" height="108" rx="3" fill="#527c70" stroke="#d2dfd5" stroke-width="7"/><path d="M3 14 L17 3 H140 L152 14Z" fill="#40655f"/><rect x="24" y="37" width="42" height="60" fill="#f3edd5"/><rect x="80" y="34" width="46" height="31" fill="#c5e1ed"/><rect x="80" y="75" width="39" height="32" fill="#e3bdab"/><path d="M32 51 H57 M32 62 H57 M32 74 H50 M88 45 H117 M88 54 H108 M88 87 H110" stroke="#82938f" stroke-width="3"/>`)
        ],
        construction: [
            prop('repair-car', 'Car with Open Bonnet', 'mechanic automobile vehicle repair garage workshop hood', 380, 200, `<path d="M30 101 L59 41 Q67 30 85 30 H183 L228 94 L333 101 Q355 106 359 123 L366 164 H13 V122 Q13 108 30 101Z" fill="#4e8ca3"/><path d="M56 93 L78 42 H117 V93Z M127 42 H178 L210 93Z" fill="#c4e2e8"/><path d="M242 98 L267 15 L283 9 L260 99Z" fill="#367286" stroke="#285567" stroke-width="3"/><path d="M259 99 H333 L345 119 H251Z" fill="#34494e"/><path d="M267 106 H298 V118 H267Z" fill="#8a9c9d"/><path d="M15 149 H362 V162 H15Z" fill="#386d84"/><path d="M122 100 V148 M216 103 V148 M136 108 H151" stroke="#285567" stroke-width="3"/><path d="M330 123 H358 V135 H330Z" fill="#f4e8ba"/><rect x="15" y="122" width="13" height="17" fill="#bd514a"/><path d="M9 159 H367 V172 H9Z" fill="#adbfc5"/>${[79, 296].map(x => `<circle cx="${x}" cy="165" r="35" fill="#29363e"/><circle cx="${x}" cy="165" r="21" fill="#afc1c7"/><circle cx="${x}" cy="165" r="10" fill="#627d87"/>`).join('')}`),
            prop('tyre-stack', 'Tyre Stack', 'mechanic garage repair tires tyres vehicle wheels', 112, 125, `${[83, 48, 13].map(y => `<path d="M6 ${y} H106 V${y + 22} C106 ${y + 46} 6 ${y + 46} 6 ${y + 22}Z" fill="#35434b"/><path d="M16 ${y + 20} V${y + 30} M33 ${y + 25} V${y + 37} M56 ${y + 27} V${y + 40} M79 ${y + 25} V${y + 37} M97 ${y + 20} V${y + 30}" stroke="#52636c" stroke-width="4"/><ellipse cx="56" cy="${y}" rx="50" ry="13" fill="#596b73"/><ellipse cx="56" cy="${y}" rx="25" ry="6" fill="#24323a"/>`).join('')}`)
        ]
    };
    Object.entries(communityProps).forEach(([key, list]) => items[key].push(...list));

    // Separate stage objects can use Attach to Armature; tools are never baked into skin/clothes.
    categories.push({ id: 'livelihood-tools', name: 'Livelihood & Cultural Tools' });
    const basket = (contents = '') => `${contents}<path d="M12 53 H88 L77 88 H23Z" fill="${C.wood}"/><path d="M17 63 H83 M20 74 H80 M30 55 L35 86 M50 55 V88 M70 55 L65 86" stroke="${C.woodL}" stroke-width="3"/><path d="M26 53 C26 18 74 18 74 53" fill="none" stroke="${C.woodD}" stroke-width="5"/>`;
    const leaves = '<g fill="#478358"><path d="M25 51 Q4 14 37 28 L43 51Z M46 49 Q45 7 62 18 L58 50Z M62 51 Q87 9 90 38 L73 53Z"/></g>';
    const tool = (id, name, tags, body, w = 100, h = 100) => ({ ...prop(id, name, tags, w, h, body), attachable: true });
    items['livelihood-tools'] = [
        tool('notebook', 'Pocket Notebook', 'community leader officer notes', `<rect x="17" y="9" width="64" height="82" rx="4" fill="${C.blueD}"/><path d="M27 9 V91" stroke="${C.dark}" stroke-width="4"/><rect x="37" y="24" width="32" height="20" rx="2" fill="${C.paper}"/><path d="M78 14 V86" stroke="${C.paper}" stroke-width="3"/>`),
        tool('produce-crate', 'Produce Crate', 'market trader harvest vegetables', `<g fill="${C.greenD}"><circle cx="27" cy="37" r="17"/><circle cx="61" cy="28" r="19"/></g><g fill="${C.red}"><circle cx="45" cy="42" r="13"/><circle cx="79" cy="43" r="11"/></g><path d="M9 47 H91 V88 H9Z" fill="${C.wood}"/><path d="M9 59 H91 M9 75 H91" stroke="${C.woodD}" stroke-width="4"/><path d="M16 48 V88 M84 48 V88" stroke="${C.woodL}" stroke-width="7"/>`),
        tool('farm-hoe', 'Farm Hoe', 'farmer agriculture garden cultivation', `<path d="M30 10 L67 141" stroke="${C.wood}" stroke-width="7" stroke-linecap="round"/><path d="M22 17 L60 9 L72 24 L28 35Z" fill="${C.metalD}"/><path d="M29 33 L69 24" stroke="${C.metalL}" stroke-width="3"/>`, 90, 150),
        tool('harvest-basket', 'Harvest Basket', 'farmer harvest agriculture produce', basket('<g fill="#729b50"><ellipse cx="31" cy="43" rx="13" ry="16"/><ellipse cx="62" cy="42" rx="15" ry="18"/></g><circle cx="49" cy="49" r="12" fill="#bf6143"/>')),
        tool('market-basket', 'Market Basket', 'trader village shopping basket', basket()),
        tool('fish-basket', 'Fish Basket', 'fish trader fisher fishing', basket(`<path d="M19 43 Q41 26 68 43 L84 31 V55 L68 45 Q41 61 19 43Z" fill="${C.metalL}"/><circle cx="30" cy="41" r="2" fill="${C.dark}"/>`)),
        tool('herb-basket', 'Herb Basket', 'herbalist plants traditional practitioner', basket(leaves)),
        tool('spanner', 'Spanner', 'mechanic repair wrench workshop', `<path d="M27 10 L23 31 L39 40 L53 28 L50 9 C75 24 65 51 50 53 L44 126 Q33 145 23 128 L32 50 C9 40 10 20 27 10Z" fill="${C.metal}" stroke="${C.metalD}" stroke-width="2"/>`, 80, 145),
        tool('pipe-wrench', 'Pipe Wrench', 'plumber pipe repair tool', `<path d="M25 16 H65 V44 H48 V136 H28 V40 H15 V28 H45 V16Z" fill="${C.red}"/><path d="M15 13 H63 V23 H15 M17 37 H47 V49 H17" fill="${C.metalD}"/><path d="M29 60 H46" stroke="${C.dark}" stroke-width="5"/>`, 80, 145),
        tool('hammer', 'Hammer', 'carpenter mason builder', `<path d="M42 31 H54 V132 H42Z" fill="${C.wood}"/><path d="M16 14 H67 L79 30 L64 26 L54 39 H17Z" fill="${C.metalD}"/><path d="M17 14 H28 V39 H17Z" fill="${C.metalL}"/>`, 90, 140),
        tool('hand-saw', 'Hand Saw', 'carpenter furniture wood saw', `<path d="M28 29 L93 37 L74 82 L67 76 L61 81 L54 74 L48 79 L41 72 L34 77 L25 68Z" fill="${C.metalL}"/><path d="M8 20 H35 L31 67 H7Z M15 29 V55 H23 L26 29Z" fill="${C.wood}" fill-rule="evenodd"/>`),
        tool('brick-trowel', 'Brick Trowel', 'mason construction cement tool', `<path d="M49 9 L16 75 Q48 89 82 75Z" fill="${C.metalL}" stroke="${C.metalD}" stroke-width="2"/><path d="M49 56 V95" stroke="${C.metalD}" stroke-width="5"/><rect x="41" y="88" width="16" height="45" rx="7" fill="${C.wood}"/>`, 100, 140),
        tool('pliers', 'Pliers', 'electrician wire repair', `<path d="M24 7 L42 31 L53 31 L71 7 L70 36 L56 52 L73 125 M43 52 L24 125" fill="none" stroke="${C.metalD}" stroke-width="10" stroke-linejoin="round"/><path d="M34 75 L22 125 M63 75 L75 125" stroke="${C.red}" stroke-width="12" stroke-linecap="round"/><circle cx="49" cy="43" r="6" fill="${C.metalL}"/>`, 95, 140),
        tool('fishing-net', 'Fishing Net', 'fisher fishing landing net', `<ellipse cx="50" cy="40" rx="36" ry="29" fill="${C.glass}" fill-opacity=".25" stroke="${C.wood}" stroke-width="5"/><path d="M27 20 L73 60 M22 35 L59 65 M40 13 L81 47 M25 59 L72 19 M20 43 L55 14 M43 67 L82 32" stroke="${C.metalL}" stroke-width="1.5"/><path d="M50 70 V147" stroke="${C.wood}" stroke-width="7"/>`, 100, 155),
        tool('walking-stick', 'Walking Stick', 'elder cane walking support', `<path d="M25 22 C25 2 57 2 57 23 V144" fill="none" stroke="${C.woodD}" stroke-width="8" stroke-linecap="round"/><path d="M57 136 V148" stroke="${C.dark}" stroke-width="9"/>`, 80, 155),
        tool('ceremonial-staff', 'Ceremonial Staff', 'traditional ruler royal community leader', `<path d="M40 38 V153" stroke="${C.woodD}" stroke-width="7"/><path d="M40 5 L57 23 L40 42 L23 23Z" fill="${C.yellow}"/><path d="M34 64 H46 M34 78 H46 M34 92 H46" stroke="${C.yellow}" stroke-width="4"/>`, 80, 160),
        tool('ceremonial-fan', 'Ceremonial Fan', 'royal traditional ruler regalia', `<path d="M49 64 V98" stroke="${C.woodD}" stroke-width="7"/><path d="M48 67 Q-2 50 17 15 Q49 -6 82 18 Q101 53 48 67Z" fill="#eee6d2" stroke="${C.yellowD}" stroke-width="3"/><path d="M49 65 L22 21 M49 65 L49 10 M49 65 L76 23" stroke="${C.woodL}" stroke-width="2"/>`),
        tool('mortar-pestle', 'Mortar & Pestle', 'herbalist food vendor preparation', `<path d="M56 4 L70 11 L52 56 L42 52Z" fill="${C.woodD}"/><path d="M14 40 Q50 30 86 40 L75 77 Q50 91 25 77Z" fill="${C.wood}"/><ellipse cx="50" cy="40" rx="36" ry="10" fill="${C.woodD}"/><path d="M54 31 L48 48" stroke="${C.woodL}" stroke-width="13"/>`),
        tool('talking-drum', 'Talking Drum', 'yoruba musician drummer hourglass drum', `<path d="M16 20 Q61 27 104 20 Q72 65 104 109 Q60 101 16 109 Q48 65 16 20Z" fill="${C.wood}"/><path d="M23 23 L97 107 M39 24 L81 106 M80 24 L40 106 M97 23 L23 107" stroke="${C.paper}" stroke-width="2"/><ellipse cx="60" cy="19" rx="46" ry="11" fill="#e9d7ac" stroke="${C.woodD}" stroke-width="4"/><ellipse cx="60" cy="110" rx="46" ry="10" fill="#e9d7ac" stroke="${C.woodD}" stroke-width="4"/>`, 120, 125),
        tool('frame-drum', 'Frame Drum', 'musician percussion drum', `<circle cx="50" cy="50" r="44" fill="${C.wood}"/><circle cx="50" cy="47" r="38" fill="#e8d7b6"/><path d="M19 81 L24 90 M40 89 V98 M65 87 L69 94 M82 75 L89 79" stroke="${C.paper}" stroke-width="3"/>`),
        tool('hand-shaker', 'Hand Shaker', 'dancer musician percussion', `<path d="M46 62 V96" stroke="${C.woodD}" stroke-width="9"/><ellipse cx="47" cy="34" rx="25" ry="32" fill="${C.woodL}"/><path d="M28 16 L64 51 M25 36 L58 11 M30 59 L69 30" stroke="${C.paper}" stroke-width="3"/>`),
        tool('tailor-scissors', 'Scissors', 'tailor dressmaker hairdresser salon', `<path d="M44 54 L78 6 L60 59 L45 69 L20 9 L49 51Z" fill="${C.metalL}" stroke="${C.metalD}" stroke-width="2"/><circle cx="49" cy="58" r="4" fill="${C.dark}"/><ellipse cx="31" cy="79" rx="12" ry="15" fill="none" stroke="${C.red}" stroke-width="7"/><ellipse cx="64" cy="79" rx="12" ry="15" fill="none" stroke="${C.red}" stroke-width="7"/>`),
        tool('measuring-tape', 'Measuring Tape', 'tailor dressmaker measurement', `<path d="M14 20 C64 -5 96 28 71 53 C53 69 20 51 25 80 H84" fill="none" stroke="${C.yellow}" stroke-width="13"/><path d="M14 20 C64 -5 96 28 71 53 C53 69 20 51 25 80 H84" fill="none" stroke="${C.dark}" stroke-width="5" stroke-dasharray="1 9"/>`),
        tool('salon-comb', 'Salon Comb', 'barber hairdresser hair comb', `<path d="M17 12 H83 V27 H17Z" fill="${C.dark}"/><path d="M20 25 V79 M29 25 V79 M38 25 V79 M47 25 V79 M56 25 V79 M65 25 V79 M74 25 V79 M82 25 V79" stroke="${C.dark}" stroke-width="4"/>`),
        tool('hair-clipper', 'Hair Clipper', 'barber haircut salon', `<path d="M31 25 H66 L70 77 Q48 104 28 77Z" fill="${C.dark}"/><rect x="29" y="10" width="39" height="19" fill="${C.metalL}"/><path d="M32 10 V20 M39 10 V20 M46 10 V20 M53 10 V20 M60 10 V20 M67 10 V20" stroke="${C.metalD}" stroke-width="2"/><rect x="43" y="43" width="12" height="19" rx="3" fill="${C.red}"/>`),
        tool('welding-shield', 'Welding Shield', 'welder protective hand shield metalworker', `<path d="M22 10 Q50 -2 78 10 L82 65 Q50 94 18 65Z" fill="${C.dark}"/><rect x="31" y="24" width="38" height="22" rx="2" fill="#293a38" stroke="${C.metal}" stroke-width="4"/><path d="M51 82 V104" stroke="${C.woodD}" stroke-width="9"/>`, 100, 112),
        tool('serving-tray', 'Serving Tray', 'food vendor caterer service', `<ellipse cx="50" cy="57" rx="45" ry="17" fill="${C.metalD}"/><ellipse cx="50" cy="53" rx="45" ry="16" fill="${C.metalL}"/><path d="M12 45 Q16 7 50 7 Q84 7 88 45Z" fill="${C.gray}"/><rect x="43" y="1" width="14" height="7" rx="3" fill="${C.dark}"/>`),
        tool('vehicle-keys', 'Vehicle Keys', 'bus taxi motorcycle driver keys', `<circle cx="43" cy="24" r="18" fill="none" stroke="${C.metal}" stroke-width="5"/><path d="M36 37 V89 H53 V80 H46 V72 H55 V64 H46 V37Z" fill="${C.metalL}"/><rect x="53" y="36" width="28" height="40" rx="6" fill="${C.dark}"/><circle cx="67" cy="52" r="5" fill="${C.gray}"/>`),
        tool('cleaning-broom', 'Cleaning Broom', 'cleaner sanitation sweeping', `<path d="M43 4 V99" stroke="${C.wood}" stroke-width="6"/><path d="M28 91 H58 L73 145 H13Z" fill="${C.yellowD}"/><path d="M28 107 H59 M26 119 H63" stroke="${C.woodD}" stroke-width="3"/><path d="M28 130 L25 146 M40 130 V146 M52 130 L57 146" stroke="${C.woodL}" stroke-width="3"/>`, 85, 152),
        tool('cleaning-mop', 'Cleaning Mop', 'cleaner sanitation mopping floor', `<path d="M42 4 V112" stroke="${C.metal}" stroke-width="6"/><path d="M42 5 V25" stroke="${C.blueD}" stroke-width="8" stroke-linecap="round"/><path d="M32 111 H52 V122 H32Z" fill="${C.blue}"/><path d="M34 120 Q22 128 17 146 M38 120 Q30 137 29 148 M42 120 V148 M46 120 Q54 136 55 148 M50 120 Q62 130 67 146" fill="none" stroke="${C.gray}" stroke-width="8" stroke-linecap="round"/><path d="M36 122 L25 146 M44 122 L47 147 M49 123 L60 145" stroke="${C.white}" stroke-width="3" stroke-linecap="round"/>`, 84, 156),
        tool('cleaning-bucket', 'Cleaning Bucket', 'cleaner water sanitation', `<path d="M16 35 H84 L74 88 Q50 96 26 88Z" fill="${C.blue}"/><ellipse cx="50" cy="35" rx="34" ry="10" fill="${C.blueD}"/><path d="M19 41 C14 -2 87 -2 81 41" fill="none" stroke="${C.metalD}" stroke-width="4"/>`),
        tool('riding-helmet', 'Motorcycle Helmet', 'motorcycle rider safety helmet handheld', `<path d="M12 56 C5 5 80 -8 91 42 L79 45 L77 64 L88 72 L71 89 H23Z" fill="${C.red}"/><path d="M48 36 L88 40 L78 64 H49Z" fill="${C.glass}" stroke="${C.dark}" stroke-width="3"/><path d="M25 87 L28 97 H58" fill="none" stroke="${C.dark}" stroke-width="4"/>`)
    ];

    const handGrips = {
        toolbox: [.50, .16, .45], suitcase: [.50, 7 / 115, .45], 'farm-hoe': [.57, .61, .85], spanner: [.45, .67, .36],
        'pipe-wrench': [.46, .70, .40], hammer: [.53, .70, .42],
        'hand-saw': [.20, .43, .38], 'brick-trowel': [.49, .80, .35],
        pliers: [.37, .70, .30], 'fishing-net': [.50, .65, .85],
        'walking-stick': [.51, .08, 1.1], 'ceremonial-staff': [.50, .46, 1.0],
        'ceremonial-fan': [.49, .86, .45], 'hand-shaker': [.46, .80, .30],
        'tailor-scissors': [.32, .79, .24], 'salon-comb': [.50, .20, .25],
        'hair-clipper': [.48, .68, .24], 'welding-shield': [.51, .86, .52],
        'serving-tray': [.50, .66, .42], 'vehicle-keys': [.43, .13, .19],
        'cleaning-broom': [.50, .50, .90], 'cleaning-mop': [.50, .50, .90], 'cleaning-bucket': [.50, .09, .43],
        'harvest-basket': [.50, .27, .42], 'market-basket': [.50, .27, .42],
        'fish-basket': [.50, .27, .42], 'herb-basket': [.50, .27, .42],
        'riding-helmet': [.55, .88, .45]
    };
    for (const item of Object.values(items).flat().filter(item => item.attachable || handGrips[item.id])) {
        const [x, y, armLengthRatio] = handGrips[item.id] || [.5, .5, .32];
        item.handGrip = { x, y, armLengthRatio };
    }

    const room = (wall, floor, feature = '') => svg('900 520', `<rect width="900" height="520" fill="${wall}"/>${feature}<rect y="350" width="900" height="170" fill="${floor}"/><path d="M0 350 H900" stroke="${C.grayD}" stroke-width="5"/>`);
    const windows = `<rect x="75" y="48" width="230" height="165" rx="3" fill="#b9dfed"/><rect x="595" y="48" width="230" height="165" rx="3" fill="#b9dfed"/><path d="M190 48 V213 M710 48 V213 M75 131 H305 M595 131 H825" stroke="${C.white}" stroke-width="7"/>`;
    const piece = (propId, oX, w, h, z = 2, oY) => ({ propId, oX, w, h, z, ...(oY == null ? { ground: true } : { oY }) });
    const kits = [
        { id: 'scene-boardroom', name: 'Meeting Room', category: 'office', tags: 'business conference teamwork', backdrop: room('#e9eef2', '#acbcc2', windows), pieces: [piece('presentation-screen', 260, 160, 146), piece('office-chair', -230, 90, 130), piece('office-chair', 80, 90, 130), piece('meeting-table', -60, 350, 168, 3), piece('laptop', -60, 96, 67, 4, 8)] },
        { id: 'scene-library', name: 'Library', category: 'classroom', tags: 'reading books study education', backdrop: room('#edf1e7', '#b9c3b2', windows), pieces: [piece('bookshelf', -300, 130, 230), piece('bookshelf', 300, 130, 230), piece('table', -60, 210, 145, 3), piece('chair', 120, 90, 124, 2), piece('open-book', -60, 88, 60, 4, 52)] },
        { id: 'scene-science-lab', name: 'Science Laboratory', category: 'classroom', tags: 'research laboratory experiment', backdrop: room('#e7efef', '#b7cbce', windows), pieces: [piece('lab-bench', -210, 255, 155, 3), piece('lab-bench', 180, 255, 155, 3), piece('microscope', -240, 70, 88, 4, 25), piece('stool', 25, 75, 97)] },
        { id: 'scene-consultation', name: 'Consultation Room', category: 'hospital', tags: 'doctor clinic medical healthcare', backdrop: room('#edf4ef', '#bccdcc', windows), pieces: [piece('privacy-screen', -240, 150, 235), piece('exam-couch', -130, 285, 158, 3), piece('medical-cart', 190, 108, 138, 3), piece('office-chair', 300, 90, 130)] },
        { id: 'scene-kitchen', name: 'Kitchen', category: 'home', tags: 'cooking food chef home', backdrop: room('#f2eee7', '#bac6be', windows), pieces: [piece('refrigerator', -300, 110, 224), piece('kitchen-counter', 100, 360, 216, 3), piece('cooking-pot', 8, 82, 57, 4, 0)] },
        { id: 'scene-living-room', name: 'Living Room', category: 'home', tags: 'family home conversation', backdrop: room('#eee9ef', '#bec9c4', windows), pieces: [piece('sofa', 0, 310, 186, 2), piece('lamp', -265, 75, 210), piece('bookshelf', 290, 110, 192), piece('plant-pot', -180, 70, 78, 3)] },
        { id: 'scene-auditorium', name: 'Auditorium', category: 'events', tags: 'speech graduation conference performance', backdrop: room('#e3e8ee', '#9dabb6', `<path d="M0 0 H115 V345 H0Z M785 0 H900 V345 H785Z" fill="#943f56"/><rect x="255" y="45" width="390" height="205" rx="4" fill="#f5f7f9"/>`), pieces: [piece('lectern', -160, 130, 200, 3), piece('microphone-stand', 90, 70, 200, 3), piece('stage-speaker', -340, 90, 135), piece('stage-speaker', 340, 90, 135)] },
        { id: 'scene-studio', name: 'Interview Studio', category: 'events', tags: 'media podcast interview filming', backdrop: room('#dfe6ec', '#a5b6bb', `<rect x="215" y="38" width="470" height="195" rx="6" fill="#447784"/><path d="M240 200 L350 90 L460 200 L570 90 L660 180" stroke="#79bdb6" stroke-width="14" fill="none"/>`), pieces: [piece('office-chair', -100, 100, 145), piece('office-chair', 110, 100, 145), piece('camera-tripod', -300, 120, 205, 4), piece('plant-pot', 300, 85, 120)] },
        { id: 'scene-terminal', name: 'Travel Terminal', category: 'travel', tags: 'airport station departure transport waiting', backdrop: room('#e4edf1', '#b9c3cd', windows), pieces: [piece('waiting-seats', -140, 300, 166), piece('waiting-seats', 220, 240, 133), piece('suitcase', 60, 80, 125, 3)] },
        { id: 'scene-workshop', name: 'Workshop', category: 'construction', tags: 'repair engineering maker tools', backdrop: room('#e5e7e5', '#adb9b8', `<rect x="165" y="45" width="570" height="175" rx="3" fill="#aec3c3"/><path d="M195 88 H705 M195 130 H705 M195 172 H705" stroke="#91a9a9" stroke-width="3"/>`), pieces: [piece('workbench', -180, 265, 181, 3), piece('toolbox', -235, 90, 65, 4, 18), piece('safety-barrier', 240, 200, 142), piece('training-cone', 70, 60, 74, 4)] },
        { id: 'scene-sports-field', name: 'Sports Field', category: 'sport', tags: 'football soccer training exercise', backdrop: svg('900 520', `<rect width="900" height="520" fill="#cbe9ed"/><path d="M0 250 Q200 140 450 260 Q710 150 900 230 V350 H0Z" fill="#74ad86"/><rect y="330" width="900" height="190" fill="#46996d"/><path d="M30 475 H870 L720 355 H180Z" fill="none" stroke="#d7f1df" stroke-width="3"/>`), pieces: [piece('football-goal', -180, 260, 178), piece('training-cone', 160, 50, 62, 3), piece('training-cone', 270, 50, 62, 3)] }
    ];
    kits.push(
        { id: 'scene-produce-farm', name: 'Produce Farm', category: 'farm', tags: 'farmer crops vegetables agriculture harvest rural community',
          backdrop: room('#d7edf0', '#bbcbb0', `<path d="M0 284 Q160 212 325 278 T650 259 T900 270 V350 H0Z" fill="#85b299"/><path d="M0 313 Q200 274 430 318 T900 300 V350 H0Z" fill="#6d9d80"/>`),
          pieces: [piece('farm-store', -250, 230, 220), piece('crop-bed', 240, 280, 130, 3), piece('grain-sacks', -110, 91, 72, 3), piece('harvest-basket', 80, 70, 70, 4)] },
        { id: 'scene-produce-market', name: 'Village Produce Market', category: 'village', tags: 'trader vendor vegetables produce market community rural',
          backdrop: room('#dfebed', '#c8d0c6', `<path d="M0 310 V180 H150 V310 M680 310 V155 H900 V310" fill="#b0c5bd"/><path d="M0 180 L74 135 L161 180 M668 155 L780 105 L900 155" fill="#7c9b9c"/><path d="M0 350 H900 V310 H0Z" fill="#90aea1"/>`),
          pieces: [piece('market-canopy', -240, 270, 270), piece('market-canopy', 240, 270, 270), piece('produce-crate', -295, 70, 70, 4, 54.4), piece('market-scale', -185, 66, 66, 4, 48), piece('produce-crate', 240, 100, 100, 4, 43), piece('grain-sacks', 350, 90, 71, 4), piece('market-basket', -85, 65, 65, 4)] },
        { id: 'scene-mechanic-yard', name: 'Mechanic Repair Yard', category: 'construction', tags: 'mechanic automobile garage car vehicle repair workshop community',
          backdrop: room('#e0e8e9', '#aebebd', `<rect x="55" y="105" width="540" height="245" fill="#c1d0d1"/><path d="M42 105 L68 75 H587 L610 105Z" fill="#5e7c83"/><rect x="92" y="139" width="241" height="211" fill="#769093"/><path d="M102 152 H322 M102 169 H322 M102 186 H322" stroke="#a8bbbc" stroke-width="4"/><rect x="370" y="153" width="180" height="114" fill="#a0b5b3"/><path d="M384 180 H536 M384 211 H536 M384 242 H536" stroke="#859f9e" stroke-width="3"/>`),
          pieces: [piece('repair-car', -210, 380, 200, 3), piece('workbench', 240, 190, 130), piece('toolbox', 230, 77, 56, 4, 60.2), piece('tyre-stack', 370, 85, 95, 3), piece('training-cone', 65, 50, 62, 4)] },
        { id: 'scene-community-courtyard', name: 'Community Courtyard', category: 'village', tags: 'village resident elder community gathering meeting courtyard public',
          backdrop: room('#dcecf0', '#c5cfc6', `<path d="M140 155 H720 V340 H140Z" fill="#edf0df"/><path d="M140 296 H720 V340 H140Z" fill="#7caaa2"/><path d="M116 155 L191 92 H670 L745 155Z" fill="#647f8a"/><path d="M198 103 H664 M171 126 H696" stroke="#8ba1aa" stroke-width="4"/><rect x="380" y="205" width="92" height="135" fill="#5b7c7d"/><rect x="205" y="195" width="95" height="65" fill="#b9dfed" stroke="#fbfcf5" stroke-width="7"/><rect x="550" y="195" width="95" height="65" fill="#b9dfed" stroke="#fbfcf5" stroke-width="7"/><path d="M252 195 V260 M597 195 V260" stroke="#fbfcf5" stroke-width="5"/>`),
          pieces: [piece('courtyard-bench', -230, 210, 125), piece('courtyard-bench', 225, 210, 125), piece('community-noticeboard', -360, 105, 129, 1), piece('plant-pot', 365, 70, 90, 3)] }
    );
    kits.forEach(kit => scenes.push({ groundY: 180, ...kit }));
    const byId = new Map(Object.values(items).flat().map(item => [item.id, item]));
    function sceneSvg(scene) {
        const w = scene.backdropW || 900, h = scene.backdropH || 520;
        const image = (markup, x, y, width, height) => {
            // Inline vector subtrees also render in Firefox's SVG-as-image context.
            const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
            const root = doc.documentElement;
            Object.entries({ x, y, width, height }).forEach(([key, value]) => root.setAttribute(key, value));
            return new XMLSerializer().serializeToString(root);
        };
        let body = scene.backdrop ? image(scene.backdrop, 0, 0, w, h) : '';
        [...scene.pieces].sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(p => {
            const item = byId.get(p.propId);
            if (!item) return;
            const pw = p.w || item.w || 120, ph = p.h || item.h || 120;
            const markup = item.svg || `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="${item.viewBox || '0 0 100 100'}">${item.iconPath.split('|').map(d => `<path fill="${item.fill}" d="${d}"/>`).join('')}</svg>`;
            body += image(markup, w / 2 + (p.oX || 0) - pw / 2, h / 2 + (p.ground ? (scene.groundY ?? 150) - ph : (p.oY || 0) - ph / 2), pw, ph);
        });
        return svg(`${w} ${h}`, body);
    }
    global.BUILTIN_PROP_LIBRARY = { categories, items, scenes, sceneSvg, environments: kits.map(kit => ({
        id: `env-set-${kit.id.slice(6)}`, name: `${kit.name} Set`, category: 'environment', tags: kit.tags.split(' '),
        generate: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#e5edef"/><rect y="${h / 2}" width="${w}" height="${h / 2}" fill="#aebfba"/><svg width="${w}" height="${h}" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid meet">${sceneSvg({ groundY: 180, ...kit }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></svg>`
    })) };
})(typeof window !== 'undefined' ? window : this);
