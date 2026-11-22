/**
 * Data-driven catalog for African/Nigerian SVG characters.
 * Appearance data only; motion remains owned by JointSystem.
 */
(function () {
    'use strict';

    const SKIN_TONES = Object.freeze({
        nightEbony: { id: 'nightEbony', name: 'Night Ebony', color: '#321d17' },
        ebony: { id: 'ebony', name: 'Ebony', color: '#4A2C20' },
        deep: { id: 'deep', name: 'Deep Brown', color: '#5C3827' },
        mahogany: { id: 'mahogany', name: 'Mahogany', color: '#70452F' },
        umber: { id: 'umber', name: 'Umber', color: '#81533A' },
        bronze: { id: 'bronze', name: 'Bronze', color: '#946348' },
        warmBrown: { id: 'warmBrown', name: 'Warm Brown', color: '#A57252' },
        caramel: { id: 'caramel', name: 'Caramel', color: '#B88160' },
        goldenBrown: { id: 'goldenBrown', name: 'Golden Brown', color: '#BC7D4E' },
        honey: { id: 'honey', name: 'Honey Brown', color: '#C58E68' },
        lightBrown: { id: 'lightBrown', name: 'Light Brown', color: '#C28B68' },
        goldenTan: { id: 'goldenTan', name: 'Golden Tan', color: '#D29B75' }
    });

    const FACE_SHAPES = Object.freeze({
        oval: { id: 'oval', name: 'Oval', rx: 34, ry: 42 },
        round: { id: 'round', name: 'Round', rx: 34.4, ry: 41.4 },
        heart: { id: 'heart', name: 'Heart', rx: 34.2, ry: 42.1 },
        square: { id: 'square', name: 'Square', rx: 34.5, ry: 41.7 },
        long: { id: 'long', name: 'Long', rx: 33.4, ry: 42.9 },
        softDiamond: { id: 'soft-diamond', name: 'Soft Diamond', rx: 33.7, ry: 42.4 }
    });

    // Head type controls the cranium; face shape controls cheeks, jaw, and chin.
    // Keeping them separate lets the same identity remain recognizable in every view.
    const HEAD_TYPES = Object.freeze({
        balanced: { id: 'balanced', name: 'Balanced' },
        roundCranium: { id: 'round-cranium', name: 'Round Cranium' },
        longNarrow: { id: 'long-narrow', name: 'Long / Narrow' },
        broadShort: { id: 'broad-short', name: 'Broad / Short' },
        highCrown: { id: 'high-crown', name: 'High Crown' },
        lowCrown: { id: 'low-crown', name: 'Low Crown' }
    });

    const EYE_STYLES = Object.freeze({
        almond: { id: 'almond', name: 'Almond' },
        round: { id: 'round', name: 'Round' },
        hooded: { id: 'hooded', name: 'Hooded' },
        wide: { id: 'wide', name: 'Wide Set' }
    });

    const NOSE_STYLES = Object.freeze({
        soft: { id: 'soft', name: 'Soft Bridge' },
        broad: { id: 'broad', name: 'Broad' },
        narrow: { id: 'narrow', name: 'Narrow' },
        rounded: { id: 'rounded', name: 'Rounded Tip' }
    });

    const LIP_STYLES = Object.freeze({
        natural: { id: 'natural', name: 'Natural' },
        full: { id: 'full', name: 'Full' },
        defined: { id: 'defined', name: 'Defined' },
        subtle: { id: 'subtle', name: 'Subtle' }
    });

    const HAIR_STYLES = Object.freeze({
        buzzCut: { id: 'buzz-cut', name: 'Buzz Cut' },
        lowCut: { id: 'low-cut', name: 'Low Cut' },
        fade: { id: 'fade', name: 'Fade' },
        templeFade: { id: 'temple-fade', name: 'Temple Fade' },
        waves: { id: 'waves', name: 'Waves' },
        highTopFade: { id: 'high-top-fade', name: 'High-Top Fade' },
        quiff: { id: 'quiff', name: 'Quiff' },
        pompadour: { id: 'pompadour', name: 'Pompadour' },
        fauxHawk: { id: 'faux-hawk', name: 'Faux Hawk' },
        spikyTop: { id: 'spiky-top', name: 'Spiky Top' },
        brushUp: { id: 'brush-up', name: 'Brush Up' },
        sidePart: { id: 'side-part', name: 'Side Part' },
        combOver: { id: 'comb-over', name: 'Comb Over' },
        texturedCrop: { id: 'textured-crop', name: 'Textured Crop' },
        caesar: { id: 'caesar', name: 'Caesar Cut' },
        angularFringe: { id: 'angular-fringe', name: 'Angular Fringe' },
        afroShort: { id: 'afro-short', name: 'Short Afro' },
        afro: { id: 'afro', name: 'Afro' },
        afroFull: { id: 'afro-full', name: 'Full Afro' },
        taperedAfro: { id: 'tapered-afro', name: 'Tapered Afro' },
        afroPuff: { id: 'afro-puff', name: 'Afro Puff' },
        twistOut: { id: 'twist-out', name: 'Twist Out' },
        washAndGo: { id: 'wash-and-go', name: 'Wash and Go' },
        braids: { id: 'braids', name: 'Braids' },
        boxBraids: { id: 'box-braids', name: 'Box Braids' },
        ghanaWeaving: { id: 'ghana-weaving', name: 'Ghana Weaving' },
        fulaniBraids: { id: 'fulani-braids', name: 'Fulani Braids' },
        cornrows: { id: 'cornrows', name: 'Cornrows' },
        flatTwist: { id: 'flat-twist', name: 'Flat Twist' },
        twists: { id: 'twists', name: 'Twists' },
        locs: { id: 'locs', name: 'Locs' },
        sisterlocks: { id: 'sisterlocks', name: 'Sisterlocks' },
        goddessLocs: { id: 'goddess-locs', name: 'Goddess Locs' },
        bantuKnots: { id: 'bantu-knots', name: 'Bantu Knots' },
        naturalBun: { id: 'natural-bun', name: 'Natural Hair Bun' },
        pixieCut: { id: 'pixie-cut', name: 'Pixie Cut' },
        bob: { id: 'bob', name: 'Bob' },
        roundBob: { id: 'round-bob', name: 'Round Bob' },
        sidePartBob: { id: 'side-part-bob', name: 'Side-Part Bob' },
        shoulderLength: { id: 'shoulder-length', name: 'Shoulder-Length Hair' },
        longStraight: { id: 'long-straight', name: 'Long Straight Hair' },
        longWaves: { id: 'long-waves', name: 'Long Waves' },
        sideSweptLong: { id: 'side-swept-long', name: 'Side-Swept Long Hair' },
        ponytail: { id: 'ponytail', name: 'Ponytail' },
        lowPonytail: { id: 'low-ponytail', name: 'Low Ponytail' },
        updo: { id: 'updo', name: 'Updo' },
        sideBraid: { id: 'side-braid', name: 'Side Braid' },
        singleBraid: { id: 'single-braid', name: 'Single Braid' },
        bald: { id: 'bald', name: 'Bald' }
    });

    const HAIR_COLORS = Object.freeze({
        naturalBlack: { id: 'natural-black', name: 'Natural Black', color: '#17110e', light: '#3a2520' },
        softBlack: { id: 'soft-black', name: 'Soft Black', color: '#22201d', light: '#484039' },
        blueBlack: { id: 'blue-black', name: 'Blue Black', color: '#101827', light: '#25324f' },
        darkBrown: { id: 'dark-brown', name: 'Dark Brown', color: '#3b2314', light: '#6b3a2a' },
        chestnut: { id: 'chestnut', name: 'Chestnut Brown', color: '#6b3a2a', light: '#a46344' },
        auburn: { id: 'auburn', name: 'Auburn', color: '#8b3f1f', light: '#c06b3b' },
        copper: { id: 'copper', name: 'Copper', color: '#a0522d', light: '#d47a45' },
        blonde: { id: 'blonde', name: 'Warm Blonde', color: '#b9914f', light: '#d9bf7a' },
        silver: { id: 'silver', name: 'Silver Grey', color: '#8b8f94', light: '#c2c7cc' },
        white: { id: 'white', name: 'White', color: '#d9d6cd', light: '#f1eee6' },
        burgundy: { id: 'burgundy', name: 'Burgundy', color: '#5b1424', light: '#9b2f4d' }
    });

    const FACIAL_HAIR = Object.freeze({
        none: { id: 'none', name: 'None' },
        moustache: { id: 'moustache', name: 'Moustache' },
        goatee: { id: 'goatee', name: 'Goatee' },
        beardShort: { id: 'short-beard', name: 'Short Beard' },
        beardFull: { id: 'full-beard', name: 'Full Beard' }
    });

    const BODY_TYPES = Object.freeze({
        slim: { id: 'slim', name: 'Slim', torsoScale: 0.9, shoulderScale: 0.92, limbScale: 0.94 },
        average: { id: 'average', name: 'Average', torsoScale: 1, shoulderScale: 1, limbScale: 1 },
        athletic: { id: 'athletic', name: 'Athletic', torsoScale: 1.08, shoulderScale: 1.12, limbScale: 1.03 },
        full: { id: 'full', name: 'Full Figure', torsoScale: 1.14, shoulderScale: 1.04, limbScale: 1.02 },
        obese: { id: 'obese', name: 'Obese', torsoScale: 1.28, shoulderScale: 1.12, limbScale: 1.08 },
        tallLean: { id: 'tall-lean', name: 'Tall Lean', torsoScale: 0.96, shoulderScale: 1.02, limbScale: 1.08 }
    });

    const HEIGHT_VARIANTS = Object.freeze({
        short: { id: 'short', name: 'Short', scale: 0.92 },
        average: { id: 'average', name: 'Average', scale: 1 },
        tall: { id: 'tall', name: 'Tall', scale: 1.08 },
        veryTall: { id: 'very-tall', name: 'Very Tall', scale: 1.14 }
    });

    const PROFESSIONS = Object.freeze({
        none: { id: 'none', name: 'None' },
        lecturer: { id: 'lecturer', name: 'Lecturer / Academic' },
        doctor: { id: 'doctor', name: 'Doctor' },
        nurse: { id: 'nurse', name: 'Nurse' },
        laboratoryScientist: { id: 'laboratory-scientist', name: 'Laboratory Scientist' },
        pharmacist: { id: 'pharmacist', name: 'Pharmacist' },
        communityHealth: { id: 'community-health', name: 'Community Health Worker' },
        student: { id: 'student', name: 'University Student' },
        administrator: { id: 'administrator', name: 'Administrator' },
        entrepreneur: { id: 'entrepreneur', name: 'Entrepreneur' },
        technology: { id: 'technology', name: 'Technology Worker' },
        businessExecutive: { id: 'business-executive', name: 'Business Executive' },
        lawyer: { id: 'lawyer', name: 'Lawyer / Legal' },
        banker: { id: 'banker', name: 'Banker / Finance' },
        teacher: { id: 'teacher', name: 'Teacher' },
        engineer: { id: 'engineer', name: 'Engineer' },
        scientist: { id: 'scientist', name: 'Scientist / Researcher' },
        mediaPresenter: { id: 'media-presenter', name: 'Media Presenter' },
        chef: { id: 'chef', name: 'Chef' },
        pilot: { id: 'pilot', name: 'Pilot / Cabin Crew' },
        policeOfficer: { id: 'police-officer', name: 'Police Officer' },
        securityOfficer: { id: 'security-officer', name: 'Security Officer' },
        soldier: { id: 'soldier', name: 'Soldier / Military' },
        artisan: { id: 'artisan', name: 'Artisan / Skilled Trade' },
        farmer: { id: 'farmer', name: 'Farmer / Agriculture' },
        athlete: { id: 'athlete', name: 'Athlete / Sports' },
        religiousLeader: { id: 'religious-leader', name: 'Religious Leader' },
        eventHost: { id: 'event-host', name: 'Event Host' },
        ...Object.fromEntries([
            ['mechanic', 'Mechanic'], ['market-trader', 'Market Trader'], ['fisher', 'Fisher'],
            ['fish-trader', 'Fish Trader'], ['herbalist', 'Herbalist / Traditional Practitioner'],
            ['traditional-ruler', 'Traditional Ruler'], ['community-leader', 'Community Leader'],
            ['tailor', 'Tailor / Dressmaker'], ['carpenter', 'Carpenter / Furniture Maker'],
            ['mason', 'Mason'], ['welder', 'Welder / Metalworker'], ['hairdresser', 'Hairdresser'],
            ['barber', 'Barber'], ['food-vendor', 'Food Vendor / Caterer'], ['driver', 'Driver'],
            ['performer', 'Musician / Dancer'], ['shopkeeper', 'Shopkeeper'], ['electrician', 'Electrician'],
            ['plumber', 'Plumber'], ['cleaner', 'Cleaner'], ['sanitation-worker', 'Sanitation Worker'],
            ['agricultural-extension', 'Agricultural Extension Officer'], ['schoolchild', 'Schoolchild'],
            ['caregiver', 'Parent / Caregiver']
        ].map(([id, name]) => [id, { id, name }]))
    });

    const OUTFITS = Object.freeze({
        ...Object.fromEntries([
            ['field-shirt', 'Field Shirt & Trousers'], ['bib-overalls', 'Bib Overalls'],
            ['mechanic-coveralls', 'Mechanic Coveralls'], ['trade-apron', 'Workshop Apron'],
            ['vendor-apron', 'Vendor / Salon Apron'], ['fishing-vest', 'Fishing Vest'],
            ['driver-uniform', 'Driver Shirt & Trousers'], ['clerical-shirt', 'Clerical Shirt']
        ].map(([id, name]) => [id, { id, name, category: 'professional' }])),
        casual: { id: 'casual', name: 'Casual Shirt', category: 'contemporary' },
        smartCasual: { id: 'smart-casual', name: 'Smart Casual', category: 'contemporary' },
        businessSuit: { id: 'business-suit', name: 'Business Suit', category: 'professional' },
        plainBusinessSuit: { id: 'plain-business-suit', name: 'Plain Business Suit', category: 'professional' },
        corporateDress: { id: 'corporate-dress', name: 'Corporate Dress', category: 'professional', presentation: ['female', 'nonbinary'] },
        executiveSuit: { id: 'executive-suit', name: 'Executive Suit', category: 'professional' },
        doubleBreastedSuit: { id: 'double-breasted-suit', name: 'Double-Breasted Suit', category: 'professional' },
        threePieceSuit: { id: 'three-piece-suit', name: 'Three-Piece Suit', category: 'professional' },
        pantSuit: { id: 'pant-suit', name: 'Pant Suit', category: 'professional', presentation: ['female', 'nonbinary'] },
        corporateBlouseSkirt: { id: 'corporate-blouse-skirt', name: 'Corporate Blouse & Skirt', category: 'professional', presentation: ['female', 'nonbinary'] },
        formalShirtTie: { id: 'formal-shirt-tie', name: 'Formal Shirt & Tie', category: 'professional' },
        lawyerBlackSuit: { id: 'lawyer-black-suit', name: 'Lawyer Black Suit', category: 'professional' },
        bankerSuit: { id: 'banker-suit', name: 'Banker Suit', category: 'professional' },
        officeCasual: { id: 'office-casual', name: 'Office Casual', category: 'professional' },
        teacherCardigan: { id: 'teacher-cardigan', name: 'Teacher Cardigan', category: 'education' },
        mediaPresenter: { id: 'media-presenter', name: 'Media Presenter Suit', category: 'professional' },
        engineerField: { id: 'engineer-field', name: 'Engineer Field Wear', category: 'workwear' },
        scientistCoat: { id: 'scientist-coat', name: 'Scientist Coat', category: 'health' },
        chefUniform: { id: 'chef-uniform', name: 'Chef Uniform', category: 'workwear' },
        pilotUniform: { id: 'pilot-uniform', name: 'Pilot / Cabin Crew Uniform', category: 'workwear' },
        securityUniform: { id: 'security-uniform', name: 'Security Uniform', category: 'workwear' },
        militaryFatigues: { id: 'military-fatigues', name: 'Military Fatigues', category: 'workwear' },
        artisanWorkwear: { id: 'artisan-workwear', name: 'Artisan Workwear', category: 'workwear' },
        farmerWorkwear: { id: 'farmer-workwear', name: 'Farmer Workwear', category: 'workwear' },
        tracksuit: { id: 'tracksuit', name: 'Tracksuit', category: 'sports' },
        footballKit: { id: 'football-kit', name: 'Football Kit', category: 'sports' },
        basketballKit: { id: 'basketball-kit', name: 'Basketball Kit', category: 'sports' },
        gymWear: { id: 'gym-wear', name: 'Gym / Fitness Wear', category: 'sports' },
        eventFormal: { id: 'event-formal', name: 'Event Formal Wear', category: 'life-situations' },
        religiousFormal: { id: 'religious-formal', name: 'Religious Formal Wear', category: 'life-situations' },
        lecturer: { id: 'lecturer', name: 'Lecturer / Academic', category: 'professional' },
        academicRobe: { id: 'academic-robe', name: 'Academic Robe', category: 'education', garmentPolicy: 'robe' },
        doctor: { id: 'doctor', name: 'Doctor - White Coat', category: 'health' },
        scrubs: { id: 'scrubs', name: 'Medical Scrubs', category: 'health' },
        nurse: { id: 'nurse', name: 'Nurse', category: 'health' },
        labCoat: { id: 'lab-coat', name: 'Laboratory Coat', category: 'health' },
        student: { id: 'student', name: 'University Student', category: 'education' },
        studentCasual: { id: 'student-casual', name: 'Student Casual', category: 'education' },
        ankaraDress: { id: 'ankara-dress', name: 'Ankara Dress', category: 'nigerian' },
        ankaraShirt: { id: 'ankara-shirt', name: 'Ankara Shirt', category: 'nigerian' },
        ankaraPeplum: { id: 'ankara-peplum', name: 'Ankara Peplum', category: 'nigerian', presentation: ['female', 'nonbinary'] },
        senator: { id: 'senator-wear', name: 'Senator / Kaftan', category: 'nigerian' },
        agbada: { id: 'agbada', name: 'Agbada', category: 'nigerian', garmentPolicy: 'robe' },
        iroBuba: { id: 'iro-buba', name: 'Iro & Buba', category: 'nigerian', garmentPolicy: 'wrapper', presentation: ['female', 'nonbinary'] },
        georgeWrapper: { id: 'george-wrapper', name: 'George Wrapper Style', category: 'nigerian', garmentPolicy: 'wrapper', presentation: ['female', 'nonbinary'] },
        isiAgu: { id: 'isi-agu', name: 'Isi Agu-inspired Formal Wear', category: 'nigerian' },
        babanRiga: { id: 'baban-riga', name: 'Baban Riga-inspired Formal Wear', category: 'nigerian', garmentPolicy: 'robe' },
        dashiki: { id: 'dashiki', name: 'Dashiki / African Tunic', category: 'african' },
        modestDress: { id: 'modest-dress', name: 'Modest Long Dress', category: 'african', garmentPolicy: 'wrapper', presentation: ['female', 'nonbinary'] },
        maasaiWrap: { id: 'maasai-wrap', name: 'Maasai-inspired Wrap', category: 'african', garmentPolicy: 'wrapper', presentation: ['female', 'nonbinary'] },
        sariWrap: { id: 'sari-wrap', name: 'Sari / Draped Wrapper', category: 'world', garmentPolicy: 'wrapper', presentation: ['female', 'nonbinary'] },
        suspenders: { id: 'suspenders', name: 'Suspenders & Shirt', category: 'contemporary', presentation: ['male', 'nonbinary'] },
        mandarinSuit: { id: 'mandarin-suit', name: 'Mandarin Jacket / Tang Suit', category: 'world' },
        cheongsam: { id: 'cheongsam-dress', name: 'Cheongsam / Qipao Dress', category: 'world', garmentPolicy: 'dress', presentation: ['female', 'nonbinary'] },
        kimono: { id: 'kimono-robe', name: 'Kimono-style Robe', category: 'world', garmentPolicy: 'robe' },
        folkVestApron: { id: 'folk-vest-apron', name: 'Folk Vest & Apron', category: 'world' },
        poncho: { id: 'poncho', name: 'Poncho / Serape', category: 'world', garmentPolicy: 'robe' },
        embroideredRobe: { id: 'embroidered-national-robe', name: 'Embroidered National Robe', category: 'world', garmentPolicy: 'robe' },
        linenDrape: { id: 'linen-drape', name: 'Linen Drape / Toga', category: 'world', garmentPolicy: 'robe' }
    });

    const TOP_CLOTHING = Object.freeze({
        ...Object.fromEntries([
            ['field-shirt', 'Field Shirt'], ['bib-overalls', 'Overalls Bib & Shirt'],
            ['mechanic-coveralls', 'Coveralls Top'], ['trade-apron', 'Workshop Apron'],
            ['vendor-apron', 'Vendor / Salon Apron'], ['fishing-vest', 'Fishing Vest'],
            ['driver-uniform', 'Driver Shirt'], ['clerical-shirt', 'Clerical Shirt']
        ].map(([id, name]) => [id, { id, name }])),
        auto: { id: 'auto', name: 'Auto from Outfit' },
        blouse: { id: 'blouse', name: 'Blouse', presentation: ['female', 'nonbinary'] },
        tshirt: { id: 't-shirt', name: 'T-Shirt' },
        shirt: { id: 'shirt', name: 'Shirt' },
        safari: { id: 'safari', name: 'Safari Jacket' },
        blazer: { id: 'blazer', name: 'Blazer / Jacket' },
        suit: { id: 'suit', name: 'Suit Jacket' },
        plainBusinessSuit: { id: 'plain-business-suit', name: 'Plain Business Suit Jacket' },
        executiveSuit: { id: 'executive-suit', name: 'Executive Suit Jacket' },
        doubleBreastedSuit: { id: 'double-breasted-suit', name: 'Double-Breasted Jacket' },
        threePieceSuit: { id: 'three-piece-suit', name: 'Three-Piece Jacket' },
        pantSuit: { id: 'pant-suit', name: 'Pant Suit Jacket', presentation: ['female', 'nonbinary'] },
        formalShirtTie: { id: 'formal-shirt-tie', name: 'Formal Shirt & Tie' },
        lawyerGown: { id: 'lawyer-gown-top', name: 'Lawyer Gown / Legal Top' },
        academicGown: { id: 'academic-gown-top', name: 'Academic Gown Top' },
        bankerJacket: { id: 'banker-jacket', name: 'Banker Jacket' },
        officeBlouse: { id: 'office-blouse', name: 'Office Blouse', presentation: ['female', 'nonbinary'] },
        corporateVest: { id: 'corporate-vest', name: 'Corporate Vest' },
        teacherCardigan: { id: 'teacher-cardigan', name: 'Teacher Cardigan' },
        mediaBlazer: { id: 'media-blazer', name: 'Media Blazer' },
        engineerVest: { id: 'engineer-vest', name: 'Engineer Safety Vest' },
        chefCoat: { id: 'chef-coat', name: 'Chef Coat' },
        pilotJacket: { id: 'pilot-jacket', name: 'Pilot / Cabin Crew Jacket' },
        securityShirt: { id: 'security-shirt', name: 'Security Shirt' },
        militaryFatigue: { id: 'military-fatigue-top', name: 'Military Fatigue Top' },
        workwearShirt: { id: 'workwear-shirt', name: 'Workwear Shirt' },
        tracksuitTop: { id: 'tracksuit-top', name: 'Tracksuit Top' },
        jerseyTop: { id: 'jersey-top', name: 'Sports Jersey' },
        gymTop: { id: 'gym-top', name: 'Gym Top' },
        schoolShirt: { id: 'school-shirt', name: 'School Shirt' },
        eventTop: { id: 'event-top', name: 'Event Top' },
        religiousRobeTop: { id: 'religious-robe-top', name: 'Religious Robe Top' },
        senator: { id: 'senator-top', name: 'Senator / Kaftan Top' },
        agbada: { id: 'agbada-top', name: 'Agbada Top' },
        buba: { id: 'buba', name: 'Buba Top', presentation: ['female', 'nonbinary'] },
        dashiki: { id: 'dashiki-top', name: 'Dashiki / Tunic Top' },
        modest: { id: 'modest-top', name: 'Modest Long Top', presentation: ['female', 'nonbinary'] },
        suspenders: { id: 'suspenders-shirt', name: 'Suspenders Shirt', presentation: ['male', 'nonbinary'] },
        mandarin: { id: 'mandarin-jacket', name: 'Mandarin Jacket' },
        cheongsam: { id: 'cheongsam-top', name: 'Cheongsam / Qipao Top', presentation: ['female', 'nonbinary'] },
        kimono: { id: 'kimono-top', name: 'Kimono Wrap Top' },
        folkVest: { id: 'folk-vest', name: 'Folk Vest & Blouse' },
        poncho: { id: 'poncho-top', name: 'Poncho / Serape Top' },
        embroideredRobe: { id: 'embroidered-robe-top', name: 'Embroidered Robe Top' },
        linenDrape: { id: 'linen-drape-top', name: 'Linen Drape Top' },
        scrubs: { id: 'scrubs-top', name: 'Scrubs Top' },
        labCoat: { id: 'lab-coat', name: 'Lab Coat' }
    });

    const BOTTOM_CLOTHING = Object.freeze({
        auto: { id: 'auto', name: 'Auto from Outfit' },
        trousers: { id: 'trousers', name: 'Trousers' },
        shorts: { id: 'shorts', name: 'Shorts' },
        suitTrousers: { id: 'suit-trousers', name: 'Suit Trousers' },
        plainSuitTrousers: { id: 'plain-suit-trousers', name: 'Plain Suit Trousers' },
        wideLegTrousers: { id: 'wide-leg-trousers', name: 'Wide Leg Trousers', presentation: ['female', 'nonbinary'] },
        pencilSkirt: { id: 'pencil-skirt', name: 'Pencil Skirt', presentation: ['female', 'nonbinary'] },
        tracksuitPants: { id: 'tracksuit-pants', name: 'Tracksuit Pants' },
        footballShorts: { id: 'football-shorts', name: 'Football Shorts' },
        basketballShorts: { id: 'basketball-shorts', name: 'Basketball Shorts' },
        gymLeggings: { id: 'gym-leggings', name: 'Gym Leggings', presentation: ['female', 'nonbinary'] },
        securityTrousers: { id: 'security-trousers', name: 'Security Trousers' },
        militaryFatiguePants: { id: 'military-fatigue-pants', name: 'Military Fatigue Pants' },
        chefTrousers: { id: 'chef-trousers', name: 'Chef Trousers' },
        pilotTrousers: { id: 'pilot-trousers', name: 'Pilot / Cabin Crew Trousers' },
        workwearTrousers: { id: 'workwear-trousers', name: 'Workwear Trousers' },
        schoolSkirt: { id: 'school-skirt', name: 'School Skirt', presentation: ['female', 'nonbinary'] },
        schoolTrousers: { id: 'school-trousers', name: 'School Trousers' },
        eventSkirt: { id: 'event-skirt', name: 'Event Skirt', presentation: ['female', 'nonbinary'] },
        religiousRobeBottom: { id: 'religious-robe-bottom', name: 'Religious Robe Bottom' },
        skirtStraight: { id: 'skirt-straight', name: 'Straight Skirt', presentation: ['female', 'nonbinary'] },
        skirtPleated: { id: 'skirt-pleated', name: 'Pleated Skirt', presentation: ['female', 'nonbinary'] },
        wrapper: { id: 'wrapper', name: 'Wrapper', presentation: ['female', 'nonbinary'] },
        iroWrapper: { id: 'iro-wrapper', name: 'Iro Wrapper', presentation: ['female', 'nonbinary'] },
        georgeWrapper: { id: 'george-wrapper-bottom', name: 'George Wrapper', presentation: ['female', 'nonbinary'] },
        stripedWrapper: { id: 'striped-wrapper', name: 'Striped Wrapper', presentation: ['female', 'nonbinary'] },
        maasaiWrapper: { id: 'maasai-wrapper', name: 'Maasai Plaid Wrapper', presentation: ['female', 'nonbinary'] },
        sariWrapper: { id: 'sari-wrapper', name: 'Sari / Draped Wrapper', presentation: ['female', 'nonbinary'] },
        cheongsamSkirt: { id: 'cheongsam-skirt', name: 'Cheongsam Dress Skirt', presentation: ['female', 'nonbinary'] },
        kimonoRobe: { id: 'kimono-robe-bottom', name: 'Kimono Robe Bottom' },
        apronSkirt: { id: 'apron-skirt', name: 'Folk Apron Skirt', presentation: ['female', 'nonbinary'] },
        robeBottom: { id: 'robe-bottom', name: 'Robe Bottom' },
        academicGownBottom: { id: 'academic-gown-bottom', name: 'Academic Gown Bottom' },
        linenDrapeBottom: { id: 'linen-drape-bottom', name: 'Linen Drape Bottom' },
        senatorTrousers: { id: 'senator-trousers', name: 'Senator Trousers' },
        scrubsPants: { id: 'scrubs-pants', name: 'Scrubs Pants' }
    });

    const TOP_BY_OUTFIT = Object.freeze({
        ...Object.fromEntries(['field-shirt', 'bib-overalls', 'mechanic-coveralls', 'trade-apron', 'vendor-apron', 'fishing-vest', 'driver-uniform', 'clerical-shirt'].map(id => [id, id])),
        casual: 'shirt',
        'smart-casual': 'shirt',
        'business-suit': 'suit',
        'plain-business-suit': 'plain-business-suit',
        'corporate-dress': 'blazer',
        'executive-suit': 'executive-suit',
        'double-breasted-suit': 'double-breasted-suit',
        'three-piece-suit': 'three-piece-suit',
        'pant-suit': 'pant-suit',
        'corporate-blouse-skirt': 'office-blouse',
        'formal-shirt-tie': 'formal-shirt-tie',
        'lawyer-black-suit': 'lawyer-gown-top',
        'banker-suit': 'banker-jacket',
        'office-casual': 'corporate-vest',
        'teacher-cardigan': 'teacher-cardigan',
        'media-presenter': 'media-blazer',
        'engineer-field': 'engineer-vest',
        'scientist-coat': 'lab-coat',
        'chef-uniform': 'chef-coat',
        'pilot-uniform': 'pilot-jacket',
        'security-uniform': 'security-shirt',
        'military-fatigues': 'military-fatigue-top',
        'artisan-workwear': 'workwear-shirt',
        'farmer-workwear': 'workwear-shirt',
        tracksuit: 'tracksuit-top',
        'football-kit': 'jersey-top',
        'basketball-kit': 'jersey-top',
        'gym-wear': 'gym-top',
        'event-formal': 'event-top',
        'religious-formal': 'religious-robe-top',
        lecturer: 'blazer',
        'academic-robe': 'academic-gown-top',
        doctor: 'lab-coat',
        scrubs: 'scrubs-top',
        nurse: 'scrubs-top',
        'lab-coat': 'lab-coat',
        student: 'shirt',
        'student-casual': 't-shirt',
        'ankara-dress': 'blouse',
        'ankara-shirt': 'shirt',
        'ankara-peplum': 'blouse',
        'senator-wear': 'senator-top',
        agbada: 'agbada-top',
        'iro-buba': 'buba',
        'george-wrapper': 'buba',
        'isi-agu': 'shirt',
        'baban-riga': 'agbada-top',
        dashiki: 'dashiki-top',
        'modest-dress': 'modest-top',
        'maasai-wrap': 'dashiki-top',
        'sari-wrap': 'blouse',
        suspenders: 'suspenders-shirt',
        'mandarin-suit': 'mandarin-jacket',
        'cheongsam-dress': 'cheongsam-top',
        'kimono-robe': 'kimono-top',
        'folk-vest-apron': 'folk-vest',
        poncho: 'poncho-top',
        'embroidered-national-robe': 'embroidered-robe-top',
        'linen-drape': 'linen-drape-top'
    });

    const BOTTOM_BY_OUTFIT = Object.freeze({
        ...Object.fromEntries(['field-shirt', 'bib-overalls', 'mechanic-coveralls', 'trade-apron', 'vendor-apron', 'fishing-vest', 'driver-uniform', 'clerical-shirt'].map(id => [id, 'trousers'])),
        casual: 'trousers',
        'smart-casual': 'trousers',
        'business-suit': 'trousers',
        'plain-business-suit': 'plain-suit-trousers',
        'corporate-dress': 'skirt-straight',
        'executive-suit': 'suit-trousers',
        'double-breasted-suit': 'suit-trousers',
        'three-piece-suit': 'suit-trousers',
        'pant-suit': 'wide-leg-trousers',
        'corporate-blouse-skirt': 'pencil-skirt',
        'formal-shirt-tie': 'suit-trousers',
        'lawyer-black-suit': 'suit-trousers',
        'banker-suit': 'suit-trousers',
        'office-casual': 'trousers',
        'teacher-cardigan': 'skirt-straight',
        'media-presenter': 'suit-trousers',
        'engineer-field': 'workwear-trousers',
        'scientist-coat': 'trousers',
        'chef-uniform': 'chef-trousers',
        'pilot-uniform': 'pilot-trousers',
        'security-uniform': 'security-trousers',
        'military-fatigues': 'military-fatigue-pants',
        'artisan-workwear': 'workwear-trousers',
        'farmer-workwear': 'workwear-trousers',
        tracksuit: 'tracksuit-pants',
        'football-kit': 'football-shorts',
        'basketball-kit': 'basketball-shorts',
        'gym-wear': 'gym-leggings',
        'event-formal': 'event-skirt',
        'religious-formal': 'religious-robe-bottom',
        lecturer: 'skirt-straight',
        'academic-robe': 'academic-gown-bottom',
        doctor: 'trousers',
        scrubs: 'scrubs-pants',
        nurse: 'scrubs-pants',
        'lab-coat': 'trousers',
        student: 'skirt-pleated',
        'student-casual': 'trousers',
        'ankara-dress': 'skirt-straight',
        'ankara-shirt': 'trousers',
        'ankara-peplum': 'skirt-straight',
        'senator-wear': 'senator-trousers',
        agbada: 'senator-trousers',
        'iro-buba': 'iro-wrapper',
        'george-wrapper': 'george-wrapper-bottom',
        'isi-agu': 'trousers',
        'baban-riga': 'senator-trousers',
        dashiki: 'trousers',
        'modest-dress': 'skirt-straight',
        'maasai-wrap': 'maasai-wrapper',
        'sari-wrap': 'sari-wrapper',
        suspenders: 'trousers',
        'mandarin-suit': 'trousers',
        'cheongsam-dress': 'cheongsam-skirt',
        'kimono-robe': 'kimono-robe-bottom',
        'folk-vest-apron': 'apron-skirt',
        poncho: 'trousers',
        'embroidered-national-robe': 'robe-bottom',
        'linen-drape': 'linen-drape-bottom'
    });

    const SKIRT_LENGTHS = Object.freeze({
        aboveKnee: { id: 'above-knee', name: 'Above Knee' },
        atKnee: { id: 'at-knee', name: 'At Knee' },
        belowKnee: { id: 'below-knee', name: 'Below Knee' },
        ankle: { id: 'ankle', name: 'Ankle' }
    });

    const SLEEVE_LENGTHS = Object.freeze({
        auto: { id: 'auto', name: 'Auto from Top' },
        sleeveless: { id: 'sleeveless', name: 'Sleeveless' },
        shoulder: { id: 'shoulder', name: 'Shoulder Cap' },
        short: { id: 'short', name: 'Short Sleeve' },
        elbow: { id: 'elbow', name: 'Elbow Length' },
        'three-quarter': { id: 'three-quarter', name: 'Three Quarter' },
        wrist: { id: 'wrist', name: 'Wrist Length' }
    });

    const NECK_TIE_TYPES = Object.freeze({
        auto: { id: 'auto', name: 'Auto from Outfit' },
        standard: { id: 'standard', name: 'Standard Tie' },
        slim: { id: 'slim', name: 'Slim Tie' },
        wide: { id: 'wide', name: 'Wide Tie' },
        bowTie: { id: 'bow-tie', name: 'Bow Tie' },
        none: { id: 'none', name: 'No Tie' }
    });

    const NECK_TIE_DESIGNS = Object.freeze({
        auto: { id: 'auto', name: 'Auto from Outfit' },
        solid: { id: 'solid', name: 'Solid' },
        diagonalStripe: { id: 'diagonal-stripe', name: 'Diagonal Stripe' },
        doubleStripe: { id: 'double-stripe', name: 'Double Stripe' },
        dots: { id: 'dots', name: 'Dots' },
        regimental: { id: 'regimental', name: 'Regimental Stripe' },
        geometricAccent: { id: 'geometric-accent', name: 'Geometric Accent' }
    });

    const CLOTHING_PALETTES = Object.freeze({
        auto: { id: 'auto', name: 'Auto from Outfit' },
        navyGold: { id: 'navy-gold', name: 'Navy & Gold' },
        emeraldCream: { id: 'emerald-cream', name: 'Emerald & Cream' },
        burgundyGold: { id: 'burgundy-gold', name: 'Burgundy & Gold' },
        charcoalIvory: { id: 'charcoal-ivory', name: 'Charcoal & Ivory' },
        tealCoral: { id: 'teal-coral', name: 'Teal & Coral' },
        indigoAmber: { id: 'indigo-amber', name: 'Indigo & Amber' },
        clinicalBlue: { id: 'clinical-blue', name: 'Clinical Blue' },
        whiteClinical: { id: 'white-clinical', name: 'White Clinical' },
        ankaraWarm: { id: 'ankara-warm', name: 'Ankara Warm' },
        ankaraCool: { id: 'ankara-cool', name: 'Ankara Cool' },
        sandRed: { id: 'sand-red', name: 'Sand & Red' },
        greenWhite: { id: 'green-white', name: 'Green & White' },
        redPlaid: { id: 'red-plaid', name: 'Red Plaid' },
        limeRose: { id: 'lime-rose', name: 'Lime & Rose' },
        saffronMagenta: { id: 'saffron-magenta', name: 'Saffron & Magenta' },
        turquoiseIvory: { id: 'turquoise-ivory', name: 'Turquoise & Ivory' },
        vermilionBlack: { id: 'vermilion-black', name: 'Vermilion & Black' },
        oliveCream: { id: 'olive-cream', name: 'Olive & Cream' },
        violetBlue: { id: 'violet-blue', name: 'Violet & Blue' },
        royalWhite: { id: 'royal-white', name: 'Royal & White' },
        charcoalRed: { id: 'charcoal-red', name: 'Charcoal & Red' },
        desertWhite: { id: 'desert-white', name: 'Desert White' },
        corporateNavy: { id: 'corporate-navy', name: 'Corporate Navy' },
        bankerGrey: { id: 'banker-grey', name: 'Banker Grey' },
        lawyerBlack: { id: 'lawyer-black', name: 'Lawyer Black' },
        academicBlack: { id: 'academic-black', name: 'Academic Black & Gold' },
        sportGreen: { id: 'sport-green', name: 'Sport Green' },
        sportRed: { id: 'sport-red', name: 'Sport Red' },
        sportBlue: { id: 'sport-blue', name: 'Sport Blue' },
        militaryOlive: { id: 'military-olive', name: 'Military Olive' },
        securityBlack: { id: 'security-black', name: 'Security Black' },
        chefWhite: { id: 'chef-white', name: 'Chef White' },
        schoolBlue: { id: 'school-blue', name: 'School Blue' },
        safetyOrange: { id: 'safety-orange', name: 'Safety Orange' }
    });

    const FABRIC_DESIGNS = Object.freeze({
        auto: { id: 'auto', name: 'Auto from Outfit' },
        plain: { id: 'plain', name: 'Plain' },
        subtleTrim: { id: 'subtle-trim', name: 'Subtle Trim' },
        pinstripe: { id: 'pinstripe', name: 'Pinstripe' },
        geometric: { id: 'geometric', name: 'Geometric' },
        ankaraMotif: { id: 'ankara-motif', name: 'Ankara Motif' },
        floral: { id: 'floral', name: 'Floral' },
        wovenBands: { id: 'woven-bands', name: 'Woven Bands' },
        dashikiBorder: { id: 'dashiki-border', name: 'Dashiki Border' },
        maasaiPlaid: { id: 'maasai-plaid', name: 'Maasai Plaid' },
        stripedWrapper: { id: 'striped-wrapper', name: 'Striped Wrapper' },
        sariDrape: { id: 'sari-drape', name: 'Sari Drape' },
        circularRobe: { id: 'circular-robe', name: 'Circular Robe Motifs' },
        beadedBands: { id: 'beaded-bands', name: 'Beaded Bands' },
        mandarinFrogs: { id: 'mandarin-frogs', name: 'Mandarin Frog Buttons' },
        kimonoFloral: { id: 'kimono-floral', name: 'Kimono Floral' },
        ponchoStripes: { id: 'poncho-stripes', name: 'Poncho Stripes' },
        folkEmbroidery: { id: 'folk-embroidery', name: 'Folk Embroidery' },
        robeMedallions: { id: 'robe-medallions', name: 'Robe Medallions' },
        linenBorder: { id: 'linen-border', name: 'Linen Border' },
        sportStripes: { id: 'sport-stripes', name: 'Sport Stripes' },
        camouflage: { id: 'camouflage', name: 'Camouflage' },
        reflectiveTape: { id: 'reflective-tape', name: 'Reflective Tape' },
        schoolCheck: { id: 'school-check', name: 'School Check' }
    });

    const HEADWEAR = Object.freeze({
        none: { id: 'none', name: 'None' },
        gele: { id: 'gele', name: 'Gele' },
        wrappedGele: { id: 'wrapped-gele', name: 'Wrapped Gele' },
        fila: { id: 'fila', name: 'Fila' },
        yorubaFila: { id: 'yoruba-fila', name: 'Yoruba Fila Cap' },
        turban: { id: 'turban', name: 'Turban' },
        kufi: { id: 'kufi', name: 'Kufi Cap' },
        crownCap: { id: 'crown-cap', name: 'Beaded Crown Cap' },
        hijab: { id: 'hijab', name: 'Hijab', presentation: ['female', 'nonbinary'] },
        layeredHijab: { id: 'layered-hijab', name: 'Layered Hijab', presentation: ['female', 'nonbinary'] },
        khimar: { id: 'khimar', name: 'Khimar / Shoulder Hijab', presentation: ['female', 'nonbinary'] },
        niqab: { id: 'niqab', name: 'Niqab', presentation: ['female', 'nonbinary'] },
        nigerDeltaHeadTie: { id: 'niger-delta-head-tie', name: 'Niger Delta Head Tie', presentation: ['female', 'nonbinary'] },
        nigerDeltaBowler: { id: 'niger-delta-bowler', name: 'Niger Delta Bowler Hat' },
        nigerDeltaCoralCrown: { id: 'niger-delta-coral-crown', name: 'Niger Delta Coral Crown' },
        edoCoralCap: { id: 'edo-coral-cap', name: 'Edo Coral Cap' },
        igboRedCap: { id: 'igbo-red-cap', name: 'Igbo Red Cap' },
        isiAguCap: { id: 'isi-agu-cap', name: 'Isi Agu Cap' },
        hausaEmbroideredCap: { id: 'hausa-embroidered-cap', name: 'Hausa Embroidered Cap' },
        hausaCap: { id: 'hausa-cap', name: 'Hausa Cap' },
        fulaniHat: { id: 'fulani-hat', name: 'Fulani Conical Hat' },
        abetiAja: { id: 'abeti-aja', name: 'Abeti Aja Cap' },
        academicCap: { id: 'academic-cap', name: 'Academic Mortarboard' },
        fedora: { id: 'fedora', name: 'Fedora' },
        wideBrimHat: { id: 'wide-brim-hat', name: 'Wide Brim Hat' },
        clocheHat: { id: 'cloche-hat', name: 'Cloche Hat', presentation: ['female', 'nonbinary'] },
        bucketHat: { id: 'bucket-hat', name: 'Bucket Hat' },
        baseballCap: { id: 'baseball-cap', name: 'Baseball Cap' },
        beanie: { id: 'beanie', name: 'Beanie' },
        topHat: { id: 'top-hat', name: 'Top Hat' },
        constructionHelmet: { id: 'construction-helmet', name: 'Construction Helmet' },
        chefHat: { id: 'chef-hat', name: 'Chef Hat' },
        pilotCap: { id: 'pilot-cap', name: 'Pilot Cap' },
        securityCap: { id: 'security-cap', name: 'Security Cap' },
        militaryBeret: { id: 'military-beret', name: 'Military Beret' }
    });

    const FOOTWEAR = Object.freeze({
        casual: { id: 'casual', name: 'Casual Shoes' },
        formal: { id: 'formal', name: 'Formal Shoes' },
        loafers: { id: 'loafers', name: 'Loafers' },
        sneakers: { id: 'sneakers', name: 'Sneakers' },
        sandals: { id: 'sandals', name: 'Sandals' },
        clinical: { id: 'clinical', name: 'Clinical Shoes' }
    });

    const ACCESSORIES = Object.freeze({
        glasses: { id: 'glasses', name: 'Glasses' },
        idBadge: { id: 'id-badge', name: 'ID Badge' },
        stethoscope: { id: 'stethoscope', name: 'Stethoscope' },
        beads: { id: 'beads', name: 'Beads' },
        earrings: { id: 'earrings', name: 'Earrings' },
        watch: { id: 'watch', name: 'Watch' },
        notebook: { id: 'notebook', name: 'Notebook' },
        diploma: { id: 'diploma', name: 'Diploma Scroll' },
        backpack: { id: 'backpack', name: 'Backpack' },
        chalk: { id: 'chalk', name: 'Chalk' },
        lapelMic: { id: 'lapel-mic', name: 'Lapel Microphone' },
        toolBelt: { id: 'tool-belt', name: 'Tool Belt' },
        chefTools: { id: 'chef-tools', name: 'Chef Tools' },
        rankBadge: { id: 'rank-badge', name: 'Rank Badge' },
        radio: { id: 'radio', name: 'Radio' },
        whistle: { id: 'whistle', name: 'Whistle' }
    });

    const JEWELRY_OPTIONS = Object.freeze({
        necklace: { none: 'None', 'large-beads': 'Large coral-style beads', 'layered-beads': 'Layered bead strands', 'beaded-collar': 'Broad beaded collar', 'neck-rings': 'Stacked neck rings', 'pendant': 'Pendant necklace' },
        wrists: { none: 'None', beads: 'Bead bracelets', bangle: 'Metal bangles', stacked: 'Stacked bangles', cuff: 'Wide cuffs' },
        ankles: { none: 'None', beads: 'Bead anklets', bangle: 'Metal anklets', stacked: 'Stacked ankle bangles' },
        wristSide: { both: 'Both wrists', left: 'Left wrist', right: 'Right wrist' },
        ankleSide: { both: 'Both ankles', left: 'Left ankle', right: 'Right ankle' }
    });
    const DEFAULT_JEWELRY = Object.freeze({ necklace: 'none', wrists: 'none', ankles: 'none', wristSide: 'both', ankleSide: 'both', beadColor: '#c7553f', metalColor: '#cfaa55', beadSize: 1, necklaceLength: 1 });

    function normalizeJewelry(value = {}) {
        const source = value && typeof value === 'object' ? value : {};
        const result = { ...DEFAULT_JEWELRY };
        Object.entries(JEWELRY_OPTIONS).forEach(([key, options]) => {
            if (Object.prototype.hasOwnProperty.call(options, source[key])) result[key] = source[key];
        });
        ['beadColor', 'metalColor'].forEach(key => { result[key] = normalizeHexColor(source[key]) || result[key]; });
        ['beadSize', 'necklaceLength'].forEach(key => {
            const number = Number(source[key]);
            if (source[key] != null && Number.isFinite(number)) result[key] = Math.max(.65, Math.min(1.6, number));
        });
        return result;
    }

    const CULTURAL_STYLES = Object.freeze({
        contemporary: { id: 'contemporary', name: 'Contemporary' },
        ankara: { id: 'ankara', name: 'Ankara' },
        yoruba: { id: 'yoruba', name: 'Yoruba-inspired' },
        igbo: { id: 'igbo', name: 'Igbo-inspired' },
        hausaFulani: { id: 'hausa-fulani', name: 'Hausa/Fulani-inspired' },
        nigerDelta: { id: 'niger-delta', name: 'Niger Delta-inspired' },
        modest: { id: 'modest', name: 'Modest' },
        eastAfrican: { id: 'east-african', name: 'East African-inspired' },
        southAfrican: { id: 'south-african', name: 'South African-inspired' },
        worldDrape: { id: 'world-drape', name: 'World Draped Styles' },
        eastAsian: { id: 'east-asian', name: 'East Asian-inspired' },
        folkEuropean: { id: 'folk-european', name: 'European Folk-inspired' },
        latinAmerican: { id: 'latin-american', name: 'Latin American-inspired' },
        middleEastern: { id: 'middle-eastern', name: 'Middle Eastern-inspired' },
        ancientMediterranean: { id: 'ancient-mediterranean', name: 'Ancient Mediterranean-inspired' }
    });

    const DEFAULT_IDENTITY = Object.freeze({
        identityId: null,
        presentation: 'female',
        ageGroup: 'adult',
        skinTone: 'warmBrown',
        headType: 'balanced',
        face: 'oval',
        eyes: 'almond',
        nose: 'soft',
        lips: 'natural',
        hair: 'braids',
        hairColor: 'natural-black',
        facialHair: 'none',
        body: 'average',
        height: 'average',
        heightScale: 1
    });

    const DEFAULT_STYLING = Object.freeze({
        profession: 'none',
        outfit: 'smart-casual',
        customPieces: false,
        topClothing: 'auto',
        bottomClothing: 'auto',
        skirtLength: 'at-knee',
        sleeveLength: 'auto',
        clothingPalette: 'auto',
        fabricDesign: 'auto',
        neckTieType: 'auto',
        neckTieDesign: 'auto',
        headwear: 'none',
        footwear: 'formal',
        accessories: [],
        jewelry: DEFAULT_JEWELRY,
        colorOverrides: Object.freeze({}),
        culturalStyle: 'contemporary',
        expression: 'neutral',
        view: 'front',
        sideFacing: 'right',
        // Keep the proven UC-style 3/4 projection as the compatibility default.
        // The drawn renderer is deliberately opt-in per character so artwork R&D
        // can never migrate or decommission an existing 3/4 character silently.
        headArtwork: 'original',
        threeQuarterArtwork: 'projected',
        rearTalkingProfile: 'hidden'
    });

    const THREE_QUARTER_ARTWORK_MODES = Object.freeze({
        projected: Object.freeze({
            id: 'projected',
            name: 'Current projection (Stable)',
            description: 'Uses the established front/back artwork and UC 3/4 view profile.'
        }),
        experimentalDrawn: Object.freeze({
            id: 'experimental-drawn',
            name: 'Drawn 3/4 (Experimental)',
            description: 'Uses separately drawn 3/4 parts while retaining the same Pose Armature.'
        })
    });

    function normalizeThreeQuarterArtwork(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['experimental-drawn', 'authored-3q', 'drawn', 'experimental'].includes(normalized)) {
            return THREE_QUARTER_ARTWORK_MODES.experimentalDrawn.id;
        }
        return THREE_QUARTER_ARTWORK_MODES.projected.id;
    }

    const DEFAULT_CONFIG = Object.freeze({
        engine: 'svg-armature',
        rendererVersion: 3,
        assetCharacterId: null,
        name: 'SVG African Character',
        ...DEFAULT_IDENTITY,
        ...DEFAULT_STYLING,
        identity: DEFAULT_IDENTITY,
        styling: DEFAULT_STYLING
        ,
        premiumAdjustments: {},
        _svgAfricanFaceState: {}
    });

    const FEMALE_WRAPPER_OUTFITS = Object.freeze([
        'ankara-peplum',
        'corporate-dress',
        'iro-buba',
        'george-wrapper',
        'modest-dress',
        'sari-wrap',
        'cheongsam-dress'
    ]);

    function outfitEntryById(outfitId) {
        return Object.values(OUTFITS).find(item => item.id === outfitId) || null;
    }

    function isOutfitCompatibleWithPresentation(outfitId, presentation) {
        const outfit = outfitEntryById(outfitId);
        if (presentation === 'male' && (FEMALE_WRAPPER_OUTFITS.includes(outfitId) || outfit?.garmentPolicy === 'wrapper')) {
            return false;
        }
        if (Array.isArray(outfit?.presentation) && !outfit.presentation.includes(presentation)) {
            return false;
        }
        return true;
    }

    function fallbackOutfitForPresentation(outfitId, presentation, culturalStyle = DEFAULT_STYLING.culturalStyle) {
        if (isOutfitCompatibleWithPresentation(outfitId, presentation)) return outfitId;
        if (presentation === 'male') {
            return ['ankara', 'yoruba', 'igbo', 'hausa-fulani', 'niger-delta', 'modest'].includes(culturalStyle)
                ? OUTFITS.senator.id
                : OUTFITS.businessSuit.id;
        }
        return DEFAULT_STYLING.outfit;
    }

    function topClothingForOutfit(outfitId) {
        return TOP_BY_OUTFIT[outfitId] || DEFAULT_STYLING.topClothing;
    }

    function bottomClothingForOutfit(outfitId, presentation) {
        if (presentation !== 'male' && outfitId === 'student-casual') return BOTTOM_CLOTHING.skirtPleated.id;
        const resolved = BOTTOM_BY_OUTFIT[outfitId] || (presentation === 'male' ? BOTTOM_CLOTHING.trousers.id : BOTTOM_CLOTHING.skirtStraight.id);
        return presentation === 'male' && /skirt|wrapper|iro/.test(resolved) ? BOTTOM_CLOTHING.trousers.id : resolved;
    }

    // Collection presets reuse calibrated anatomy, not the source preset's occupation.
    // Cultural entries are editable inspired combinations, not exact ceremonial regalia.
    const COMMUNITY_ROLES = [
        { id: 'farmer', name: 'Farmer', category: 'Everyday livelihoods', profession: 'farmer', outfit: 'bib-overalls', hat: 'wide-brim-hat', props: ['farm-hoe', 'harvest-basket'], colors: ['#506d42', '#334d39'] },
        { id: 'rural-resident', name: 'Rural Resident - Everyday', category: 'Everyday livelihoods', profession: 'none', outfit: 'casual', props: ['market-basket'], colors: ['#b34e50', '#315960'], tags: ['villager', 'village'] },
        { id: 'rural-traditional', name: 'Rural Resident - Traditional', category: 'Everyday livelihoods', profession: 'none', outfit: 'senator-wear', femaleOutfit: 'iro-buba', culture: 'yoruba', props: ['market-basket'], colors: ['#3e7290', '#3e7290'], tags: ['villager', 'village'] },
        { id: 'mechanic', name: 'Mechanic', category: 'Trades & services', profession: 'mechanic', outfit: 'mechanic-coveralls', props: ['spanner', 'toolbox'], accessories: ['tool-belt'], colors: ['#3f667b', '#3f667b'] },
        { id: 'market-trader', name: 'Market Trader', category: 'Everyday livelihoods', profession: 'market-trader', outfit: 'vendor-apron', props: ['market-basket', 'produce-crate'], colors: ['#9e4057', '#2e6862'] },
        { id: 'fisher', name: 'Fisher', category: 'Everyday livelihoods', profession: 'fisher', outfit: 'fishing-vest', hat: 'bucket-hat', props: ['fishing-net', 'fish-basket'], colors: ['#bd904a', '#365d72'] },
        { id: 'fish-trader', name: 'Fish Trader', category: 'Everyday livelihoods', profession: 'fish-trader', outfit: 'vendor-apron', props: ['fish-basket'], colors: ['#397681', '#34445a'] },
        { id: 'community-elder', name: 'Community Elder', category: 'Community & family', profession: 'none', outfit: 'senator-wear', femaleOutfit: 'iro-buba', age: 'older-adult', props: ['walking-stick'], colors: ['#75758f', '#55566f'] },
        { id: 'herbalist-yoruba', name: 'Herbalist - Yoruba Inspired', category: 'Cultural collections', profession: 'herbalist', outfit: 'dashiki', femaleOutfit: 'iro-buba', culture: 'yoruba', props: ['herb-basket', 'mortar-pestle'], colors: ['#55775c', '#55775c'] },
        { id: 'herbalist-igbo', name: 'Herbalist - Igbo Inspired', category: 'Cultural collections', profession: 'herbalist', outfit: 'senator-wear', femaleOutfit: 'george-wrapper', culture: 'igbo', props: ['herb-basket', 'mortar-pestle'], colors: ['#f0e8de', '#865e78'] },
        { id: 'herbalist-hausa', name: 'Herbalist - Hausa Inspired', category: 'Cultural collections', profession: 'herbalist', outfit: 'baban-riga', femaleOutfit: 'modest-dress', culture: 'hausa-fulani', hat: 'hausa-embroidered-cap', femaleHat: 'hijab', props: ['herb-basket'], colors: ['#73978f', '#73978f'] },
        { id: 'ruler-yoruba', name: 'Royal Attire - Yoruba Inspired', category: 'Cultural collections', profession: 'traditional-ruler', outfit: 'agbada', femaleOutfit: 'iro-buba', culture: 'yoruba', hat: 'crown-cap', femaleHat: 'wrapped-gele', accessories: ['beads'], props: ['ceremonial-staff'], colors: ['#644d81', '#644d81'], tags: ['oba', 'ruler', 'royal'] },
        { id: 'ruler-edo', name: 'Royal Attire - Edo Inspired', category: 'Cultural collections', profession: 'traditional-ruler', outfit: 'senator-wear', femaleOutfit: 'george-wrapper', culture: 'niger-delta', hat: 'edo-coral-cap', femaleHat: 'niger-delta-coral-crown', accessories: ['beads'], props: ['ceremonial-fan'], colors: ['#f1e6df', '#efe1d2'], accent: '#bd503c', tags: ['oba', 'ruler', 'royal'] },
        { id: 'ruler-igbo', name: 'Royal Attire - Igbo Inspired', category: 'Cultural collections', profession: 'traditional-ruler', outfit: 'isi-agu', femaleOutfit: 'george-wrapper', culture: 'igbo', hat: 'igbo-red-cap', femaleHat: 'gele', accessories: ['beads'], props: ['ceremonial-staff'], colors: ['#8e3945', '#673144'], tags: ['eze', 'ruler', 'royal'] },
        { id: 'ruler-hausa', name: 'Royal Attire - Hausa Inspired', category: 'Cultural collections', profession: 'traditional-ruler', outfit: 'baban-riga', femaleOutfit: 'modest-dress', culture: 'hausa-fulani', hat: 'turban', femaleHat: 'layered-hijab', props: ['ceremonial-staff'], colors: ['#e8e5df', '#54746d'], tags: ['emir', 'ruler', 'royal'] },
        { id: 'community-leader', name: 'Community Leader', category: 'Community & family', profession: 'community-leader', outfit: 'senator-wear', femaleOutfit: 'ankara-peplum', props: ['notebook'], colors: ['#39877e', '#355c64'] },
        { id: 'talking-drummer', name: 'Talking Drummer - Yoruba Inspired', category: 'Cultural collections', profession: 'performer', outfit: 'dashiki', femaleOutfit: 'iro-buba', culture: 'yoruba', hat: 'abeti-aja', femaleHat: 'gele', props: ['talking-drum'], colors: ['#ba8651', '#7a455b'] },
        { id: 'igbo-dancer', name: 'Dancer - Igbo Inspired', category: 'Cultural collections', profession: 'performer', outfit: 'isi-agu', femaleOutfit: 'george-wrapper', culture: 'igbo', accessories: ['beads'], props: ['hand-shaker'], colors: ['#aa3946', '#e1c883'] },
        { id: 'hausa-musician', name: 'Musician - Hausa Inspired', category: 'Cultural collections', profession: 'performer', outfit: 'baban-riga', femaleOutfit: 'modest-dress', culture: 'hausa-fulani', hat: 'hausa-cap', femaleHat: 'hijab', props: ['frame-drum'], colors: ['#3e7f93', '#3e7f93'] },
        { id: 'tailor', name: 'Tailor / Dressmaker', category: 'Trades & services', profession: 'tailor', outfit: 'trade-apron', props: ['tailor-scissors', 'measuring-tape'], colors: ['#9c6985', '#3b525e'] },
        { id: 'carpenter', name: 'Carpenter', category: 'Trades & services', profession: 'carpenter', outfit: 'trade-apron', accessories: ['tool-belt'], props: ['hand-saw', 'hammer'], colors: ['#b28b60', '#364d59'] },
        { id: 'mason', name: 'Mason / Construction Worker', category: 'Trades & services', profession: 'mason', outfit: 'engineer-field', hat: 'construction-helmet', props: ['brick-trowel'], colors: ['#d4a444', '#44576b'] },
        { id: 'welder', name: 'Welder / Metalworker', category: 'Trades & services', profession: 'welder', outfit: 'trade-apron', sleeve: 'wrist', props: ['welding-shield'], colors: ['#986a48', '#415364'] },
        { id: 'hairdresser', name: 'Hairdresser', category: 'Trades & services', profession: 'hairdresser', outfit: 'vendor-apron', props: ['salon-comb', 'tailor-scissors'], colors: ['#7e526e', '#373943'] },
        { id: 'barber', name: 'Barber', category: 'Trades & services', profession: 'barber', outfit: 'vendor-apron', props: ['hair-clipper', 'salon-comb'], colors: ['#477677', '#293c45'] },
        { id: 'food-vendor', name: 'Food Vendor / Caterer', category: 'Everyday livelihoods', profession: 'food-vendor', outfit: 'vendor-apron', hat: 'beanie', props: ['serving-tray', 'cooking-pot'], colors: ['#debe61', '#3c6859'] },
        { id: 'bus-driver', name: 'Bus Driver', category: 'Trades & services', profession: 'driver', outfit: 'driver-uniform', props: ['vehicle-keys'], colors: ['#b8cccb', '#365263'] },
        { id: 'taxi-driver', name: 'Taxi Driver', category: 'Trades & services', profession: 'driver', outfit: 'casual', props: ['vehicle-keys'], colors: ['#499a8d', '#3d4c5e'] },
        { id: 'motorcycle-rider', name: 'Motorcycle Rider', category: 'Trades & services', profession: 'driver', outfit: 'tracksuit', props: ['riding-helmet', 'vehicle-keys'], colors: ['#984950', '#344b5a'] },
        { id: 'shopkeeper', name: 'Shopkeeper', category: 'Everyday livelihoods', profession: 'shopkeeper', outfit: 'casual', props: ['market-basket'], colors: ['#627e9c', '#3b425c'] },
        { id: 'electrician', name: 'Electrician', category: 'Trades & services', profession: 'electrician', outfit: 'field-shirt', hat: 'construction-helmet', accessories: ['tool-belt'], props: ['pliers'], colors: ['#71959a', '#3c5260'] },
        { id: 'plumber', name: 'Plumber', category: 'Trades & services', profession: 'plumber', outfit: 'bib-overalls', accessories: ['tool-belt'], props: ['pipe-wrench'], colors: ['#507a91', '#507a91'] },
        { id: 'cleaner', name: 'Cleaner', category: 'Trades & services', profession: 'cleaner', outfit: 'vendor-apron', props: ['cleaning-broom', 'cleaning-bucket'], colors: ['#a572ac', '#4c465f'] },
        { id: 'sanitation-worker', name: 'Sanitation Worker', category: 'Trades & services', profession: 'sanitation-worker', outfit: 'engineer-field', props: ['cleaning-broom'], colors: ['#d4a544', '#324a58'] },
        { id: 'agricultural-extension', name: 'Agricultural Extension Officer', category: 'Everyday livelihoods', profession: 'agricultural-extension', outfit: 'field-shirt', hat: 'wide-brim-hat', accessories: ['id-badge', 'notebook'], props: ['herb-basket'], colors: ['#7eaa86', '#466c54'] },
        { id: 'schoolchild', name: 'Schoolchild', category: 'Community & family', profession: 'schoolchild', outfit: 'smart-casual', top: 'school-shirt', bottom: 'school-trousers', femaleBottom: 'school-skirt', age: 'child', accessories: ['backpack'], props: ['open-book'], colors: ['#e4eaf2', '#49739a'] },
        { id: 'parent-caregiver', name: 'Parent / Caregiver', category: 'Community & family', profession: 'caregiver', outfit: 'smart-casual', props: ['open-book'], colors: ['#9273a1', '#4e5368'] },
        { id: 'christian-clergy', name: 'Christian Clergy', category: 'Faith & community', profession: 'religious-leader', outfit: 'clerical-shirt', props: ['open-book'], colors: ['#343746', '#343746'] },
        { id: 'muslim-community', name: 'Muslim Community Leader', category: 'Faith & community', profession: 'religious-leader', outfit: 'baban-riga', femaleOutfit: 'modest-dress', hat: 'kufi', femaleHat: 'hijab', props: ['open-book'], colors: ['#deddd6', '#74867c'] }
    ];

    function communityPresets() {
        return Object.fromEntries(COMMUNITY_ROLES.flatMap((role, index) => ['male', 'female'].map(presentation => {
            const female = presentation === 'female';
            const id = `${role.id}-${presentation}-premium`;
            const hat = (female && role.femaleHat) || role.hat || 'none';
            const hatColor = /coral/.test(hat) ? '#bd503c' : hat === 'igbo-red-cap' ? '#a92e36' : role.colors[0];
            return [id, {
                id, name: `${role.name} - ${female ? 'Female' : 'Male'}`, category: role.category,
                tags: [...(role.tags || []), role.profession, role.culture || 'contemporary'],
                recommendedProps: role.props || [], engine: 'svg-armature-premium', rendererVersion: 1,
                assetCharacterId: `${id}-front`,
                identity: { presentation, ageGroup: role.age || 'adult', skinTone: ['warmBrown', 'deep', 'goldenBrown'][index % 3], face: female ? 'oval' : 'square', eyes: 'almond', nose: 'soft', lips: female ? 'full' : 'defined', hair: female ? ['braids', 'cornrows', 'afro-puff'][index % 3] : 'low-cut', hairColor: role.age === 'older-adult' ? 'silver' : 'natural-black', facialHair: !female && role.age === 'older-adult' ? 'short-beard' : 'none', body: 'average', height: 'average' },
                styling: { outfit: (female && role.femaleOutfit) || role.outfit, profession: role.profession, headwear: hat, footwear: role.age === 'child' ? 'sneakers' : 'casual', customPieces: !!role.top, topClothing: role.top || 'auto', bottomClothing: (female && role.femaleBottom) || role.bottom || 'auto', sleeveLength: role.sleeve || 'auto', fabricDesign: role.culture || role.outfit === 'engineer-field' ? 'auto' : 'plain', accessories: [...(role.accessories || [])], culturalStyle: role.culture || 'contemporary', view: 'front', colorOverrides: { top: role.colors[0], bottom: role.colors[1], shirt: '#e5e9e6', accent: role.accent || '#d6b45b', headwear: hatColor } },
                premiumAdjustments: {}
            }];
        })));
    }

    const PRESETS = Object.freeze({
        adaLecturerPremium: {
            id: 'ada-lecturer-premium',
            name: 'Ada - Premium Lecturer',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'ada-lecturer-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'warmBrown', face: 'oval', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'braids', body: 'average', height: 'average' },
            styling: { outfit: 'lecturer', profession: 'lecturer', footwear: 'formal', accessories: ['glasses', 'notebook', 'earrings'], culturalStyle: 'contemporary', view: 'front' },
            premiumAdjustments: { hairlineHeight: 0.08, muscleDefinition: -0.02 }
        },
        maleLecturerPremium: {
            id: 'male-lecturer-premium',
            name: 'Male Lecturer - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'male-lecturer-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'oval', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'low-cut', facialHair: 'short-beard', body: 'average', height: 'average' },
            styling: { outfit: 'business-suit', profession: 'lecturer', footwear: 'formal', accessories: ['glasses', 'notebook'], culturalStyle: 'contemporary', view: 'front' },
            premiumAdjustments: { torsoWidth: 0.09, shoulderWidth: 0.12, hipWidth: 0.06, armLength: -0.08, armWidth: 0.07, legLength: 0.04, legWidth: 0.02, muscleDefinition: 0.18, handSize: 0.08, footSize: 0.08, headWidth: 0.03, headHeight: 0.01, browHeight: 0.04, browLength: 0.12 }
        },
        femaleAcademicGownPremium: {
            id: 'female-academic-gown-premium',
            name: 'Female Academic Gown - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'female-academic-gown-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'warmBrown', face: 'oval', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'braids', hairColor: 'natural-black', facialHair: 'none', body: 'average', height: 'average' },
            styling: { outfit: 'academic-robe', profession: 'lecturer', footwear: 'formal', accessories: ['glasses', 'diploma', 'earrings'], culturalStyle: 'contemporary', view: 'front', headwear: 'academic-cap', clothingPalette: 'academic-black', fabricDesign: 'subtle-trim', sleeveLength: 'wrist', skirtLength: 'ankle' },
            premiumAdjustments: { hairlineHeight: 0.08, muscleDefinition: -0.02, armLength: -0.10, legLength: 0.04, shoulderWidth: -0.02, hipWidth: 0.03 }
        },
        maleAcademicGownPremium: {
            id: 'male-academic-gown-premium',
            name: 'Male Academic Gown - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'male-academic-gown-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'oval', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'low-cut', hairColor: 'natural-black', facialHair: 'short-beard', body: 'average', height: 'average' },
            styling: { outfit: 'academic-robe', profession: 'lecturer', footwear: 'formal', accessories: ['glasses', 'diploma'], culturalStyle: 'contemporary', view: 'front', headwear: 'academic-cap', clothingPalette: 'academic-black', fabricDesign: 'subtle-trim', sleeveLength: 'wrist', skirtLength: 'ankle' },
            premiumAdjustments: { torsoWidth: 0.08, shoulderWidth: 0.09, hipWidth: 0.05, armLength: -0.09, armWidth: 0.05, legLength: 0.04, legWidth: 0.01, muscleDefinition: 0.14, handSize: 0.08, footSize: 0.08, headWidth: 0.03, headHeight: 0.01, browHeight: 0.04, browLength: 0.12 }
        },
        femaleDoctorPremium: {
            id: 'female-doctor-premium',
            name: 'Female Doctor - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'female-doctor-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'bronze', face: 'heart', eyes: 'round', nose: 'soft', lips: 'full', hair: 'cornrows', body: 'full', height: 'average' },
            styling: { outfit: 'doctor', profession: 'doctor', footwear: 'clinical', accessories: ['id-badge', 'stethoscope', 'earrings'], culturalStyle: 'contemporary', view: 'front' },
            premiumAdjustments: { torsoWidth: -0.05, torsoLength: 0.04, shoulderWidth: -0.09, hipWidth: 0.16, armLength: -0.09, armWidth: -0.01, legLength: 0.04, legWidth: -0.03, muscleDefinition: -0.04, handSize: 0.09, footSize: 0.05, headWidth: 0.06, headHeight: 0.04, hairVolume: -0.03, hairlineHeight: 0.10, eyeSize: 0.10, browHeight: 0.08, browLength: -0.03, lipFullness: 0.14 }
        },
        maleDoctorPremium: {
            id: 'male-doctor-premium',
            name: 'Male Doctor - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'male-doctor-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'mahogany', face: 'oval', eyes: 'almond', nose: 'rounded', lips: 'natural', hair: 'fade', facialHair: 'goatee', body: 'athletic', height: 'tall' },
            styling: { outfit: 'doctor', profession: 'doctor', footwear: 'clinical', accessories: ['id-badge', 'stethoscope'], culturalStyle: 'contemporary', view: 'front' },
            premiumAdjustments: { torsoWidth: 0.07, torsoLength: 0.05, shoulderWidth: 0.08, hipWidth: 0.04, armLength: -0.06, armWidth: 0.05, legLength: 0.04, legWidth: 0.02, muscleDefinition: 0.22, handSize: 0.08, footSize: 0.06, headWidth: 0.03, headHeight: 0.02, hairlineHeight: 0.09, eyeSize: 0.04, browHeight: 0.04, browLength: 0.08, noseWidth: 0.04, lipFullness: -0.02 }
        },
        nurseFemalePremium: {
            id: 'nurse-female-premium',
            name: 'Female Nurse - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'nurse-female-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'umber', face: 'round', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'cornrows', facialHair: 'none', body: 'average', height: 'average' },
            styling: { outfit: 'nurse', profession: 'nurse', footwear: 'clinical', accessories: ['id-badge', 'earrings'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'short', clothingPalette: 'clinical-blue', fabricDesign: 'subtle-trim' },
            premiumAdjustments: { torsoWidth: -0.03, torsoLength: 0.02, shoulderWidth: -0.06, hipWidth: 0.10, armLength: -0.09, armWidth: -0.02, legLength: 0.04, legWidth: -0.03, muscleDefinition: -0.03, handSize: 0.08, footSize: 0.06, headWidth: 0.05, headHeight: 0.03, hairVolume: -0.02, hairlineHeight: 0.10, eyeSize: 0.08, browHeight: 0.07, browLength: -0.02, lipFullness: 0.08 }
        },
        labScientistPremium: {
            id: 'lab-scientist-premium',
            name: 'Laboratory Scientist - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'lab-scientist-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'ebony', face: 'long', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'low-cut', facialHair: 'none', body: 'slim', height: 'tall' },
            styling: { outfit: 'lab-coat', profession: 'laboratory-scientist', footwear: 'clinical', accessories: ['id-badge', 'glasses'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'white-clinical', fabricDesign: 'subtle-trim' },
            premiumAdjustments: { torsoWidth: 0.02, torsoLength: 0.06, shoulderWidth: 0.04, hipWidth: -0.02, armLength: -0.08, armWidth: 0.01, legLength: 0.04, legWidth: -0.03, muscleDefinition: 0.06, handSize: 0.07, footSize: 0.08, headWidth: 0.02, headHeight: 0.01, hairlineHeight: 0.10, eyeSize: 0.03, browHeight: 0.04, browLength: 0.07, noseWidth: 0.07, lipFullness: -0.04 }
        },
        businessExecutivePremium: {
            id: 'business-executive-premium',
            name: 'Business Executive - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'business-executive-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'square', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'temple-fade', hairColor: 'natural-black', facialHair: 'short-beard', body: 'athletic', height: 'tall' },
            styling: { outfit: 'executive-suit', profession: 'business-executive', footwear: 'formal', accessories: ['glasses', 'watch'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'corporate-navy', fabricDesign: 'pinstripe' },
            premiumAdjustments: { torsoWidth: 0.08, torsoLength: 0.06, shoulderWidth: 0.12, hipWidth: 0.04, armLength: -0.07, armWidth: 0.06, legLength: 0.04, legWidth: 0.02, muscleDefinition: 0.24, handSize: 0.08, footSize: 0.09, headWidth: 0.03, headHeight: 0.02, hairlineHeight: 0.11, eyeSize: 0.03, browHeight: 0.04, browLength: 0.10, noseWidth: 0.05, lipFullness: -0.03 }
        },
        corporateWomanPremium: {
            id: 'corporate-woman-premium',
            name: 'Corporate Woman - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'corporate-woman-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'bronze', face: 'oval', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'side-part-bob', hairColor: 'soft-black', facialHair: 'none', body: 'average', height: 'tall' },
            styling: { outfit: 'pant-suit', profession: 'business-executive', footwear: 'formal', accessories: ['earrings', 'id-badge'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'banker-grey', fabricDesign: 'plain' },
            premiumAdjustments: { torsoWidth: -0.02, torsoLength: 0.05, shoulderWidth: -0.04, hipWidth: 0.11, armLength: -0.08, armWidth: -0.01, legLength: 0.04, legWidth: -0.02, muscleDefinition: 0.02, handSize: 0.08, footSize: 0.07, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.02, hairlineHeight: 0.11, eyeSize: 0.08, browHeight: 0.07, browLength: -0.01, lipFullness: 0.08 }
        },
        lawyerPremium: {
            id: 'lawyer-premium',
            name: 'Lawyer - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'lawyer-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'mahogany', face: 'oval', eyes: 'almond', nose: 'rounded', lips: 'defined', hair: 'low-cut', hairColor: 'natural-black', facialHair: 'goatee', body: 'average', height: 'tall' },
            styling: { outfit: 'lawyer-black-suit', profession: 'lawyer', footwear: 'formal', accessories: ['glasses'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'lawyer-black', fabricDesign: 'plain' },
            premiumAdjustments: { torsoWidth: 0.04, torsoLength: 0.07, shoulderWidth: 0.07, hipWidth: 0.02, armLength: -0.07, armWidth: 0.03, legLength: 0.04, legWidth: -0.01, muscleDefinition: 0.12, handSize: 0.08, footSize: 0.08, headWidth: 0.03, headHeight: 0.02, hairlineHeight: 0.10, eyeSize: 0.04, browHeight: 0.05, browLength: 0.08, noseWidth: 0.04, lipFullness: 0.01 }
        },
        footballAthletePremium: {
            id: 'football-athlete-premium',
            name: 'Football Athlete - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'football-athlete-premium-front',
            identity: { presentation: 'male', ageGroup: 'young-adult', skinTone: 'nightEbony', face: 'oval', eyes: 'almond', nose: 'broad', lips: 'natural', hair: 'fade', hairColor: 'blue-black', facialHair: 'none', body: 'athletic', height: 'tall' },
            styling: { outfit: 'football-kit', profession: 'athlete', footwear: 'sneakers', accessories: [], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'short', clothingPalette: 'sport-green', fabricDesign: 'sport-stripes' },
            premiumAdjustments: { torsoWidth: 0.04, torsoLength: -0.01, shoulderWidth: 0.11, hipWidth: 0.02, armLength: -0.06, armWidth: 0.08, legLength: 0.04, legWidth: 0.07, muscleDefinition: 0.36, handSize: 0.08, footSize: 0.11, headWidth: 0.02, headHeight: 0.01, hairlineHeight: 0.10, eyeSize: 0.04, browHeight: 0.04, browLength: 0.06, noseWidth: 0.06, lipFullness: -0.03 }
        },
        teacherPremium: {
            id: 'teacher-premium',
            name: 'Teacher - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'teacher-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'honey', face: 'oval', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'natural-bun', hairColor: 'soft-black', facialHair: 'none', body: 'average', height: 'average' },
            styling: { outfit: 'teacher-cardigan', profession: 'teacher', footwear: 'formal', accessories: ['glasses', 'notebook', 'earrings', 'chalk'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'school-blue', fabricDesign: 'plain' },
            premiumAdjustments: { torsoWidth: -0.04, torsoLength: 0.02, shoulderWidth: -0.07, hipWidth: 0.09, armLength: -0.09, armWidth: -0.02, legLength: 0.04, legWidth: -0.03, muscleDefinition: -0.03, handSize: 0.08, footSize: 0.07, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.02, hairlineHeight: 0.10, eyeSize: 0.08, browHeight: 0.07, browLength: -0.02, noseWidth: 0.02, lipFullness: 0.07 }
        },
        mediaPresenterPremium: {
            id: 'media-presenter-premium',
            name: 'Media Presenter - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'media-presenter-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'bronze', face: 'heart', eyes: 'wide', nose: 'soft', lips: 'full', hair: 'side-part-bob', hairColor: 'auburn', facialHair: 'none', body: 'average', height: 'tall' },
            styling: { outfit: 'media-presenter', profession: 'media-presenter', footwear: 'formal', accessories: ['earrings', 'lapel-mic'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'burgundy-gold', fabricDesign: 'subtle-trim' },
            premiumAdjustments: { torsoWidth: -0.02, torsoLength: 0.04, shoulderWidth: -0.05, hipWidth: 0.10, armLength: -0.08, armWidth: -0.01, legLength: 0.04, legWidth: -0.02, muscleDefinition: 0.02, handSize: 0.08, footSize: 0.07, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.03, hairlineHeight: 0.11, eyeSize: 0.10, browHeight: 0.08, browLength: -0.01, noseWidth: 0.01, lipFullness: 0.12 }
        },
        engineerFieldPremium: {
            id: 'engineer-field-premium',
            name: 'Field Engineer - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'engineer-field-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'umber', face: 'square', eyes: 'almond', nose: 'broad', lips: 'natural', hair: 'fade', hairColor: 'natural-black', facialHair: 'moustache', body: 'athletic', height: 'tall' },
            styling: { outfit: 'engineer-field', profession: 'engineer', headwear: 'construction-helmet', footwear: 'sneakers', accessories: ['id-badge', 'tool-belt'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'safety-orange', fabricDesign: 'reflective-tape' },
            premiumAdjustments: { torsoWidth: 0.06, torsoLength: 0.05, shoulderWidth: 0.12, hipWidth: 0.03, armLength: -0.06, armWidth: 0.06, legLength: 0.04, legWidth: 0.04, muscleDefinition: 0.28, handSize: 0.09, footSize: 0.10, headWidth: 0.03, headHeight: 0.02, hairlineHeight: 0.10, eyeSize: 0.04, browHeight: 0.04, browLength: 0.08, noseWidth: 0.06, lipFullness: -0.03 }
        },
        chefPremium: {
            id: 'chef-premium',
            name: 'Chef - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'chef-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'goldenBrown', face: 'round', eyes: 'almond', nose: 'rounded', lips: 'defined', hair: 'cornrows', hairColor: 'natural-black', facialHair: 'none', body: 'average', height: 'average' },
            styling: { outfit: 'chef-uniform', profession: 'chef', headwear: 'chef-hat', footwear: 'clinical', accessories: ['id-badge', 'earrings', 'chef-tools'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'chef-white', fabricDesign: 'plain' },
            premiumAdjustments: { torsoWidth: -0.02, torsoLength: 0.03, shoulderWidth: -0.05, hipWidth: 0.10, armLength: -0.08, armWidth: -0.01, legLength: 0.04, legWidth: -0.02, muscleDefinition: 0, handSize: 0.08, footSize: 0.06, headWidth: 0.05, headHeight: 0.03, hairVolume: -0.02, hairlineHeight: 0.10, eyeSize: 0.07, browHeight: 0.06, browLength: -0.02, noseWidth: 0.04, lipFullness: 0.07 }
        },
        pilotPremium: {
            id: 'pilot-premium',
            name: 'Pilot - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'pilot-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'mahogany', face: 'oval', eyes: 'hooded', nose: 'rounded', lips: 'natural', hair: 'low-cut', hairColor: 'natural-black', facialHair: 'goatee', body: 'athletic', height: 'tall' },
            styling: { outfit: 'pilot-uniform', profession: 'pilot', headwear: 'pilot-cap', footwear: 'formal', accessories: ['glasses', 'id-badge', 'rank-badge'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'corporate-navy', fabricDesign: 'pinstripe' },
            premiumAdjustments: { torsoWidth: 0.06, torsoLength: 0.06, shoulderWidth: 0.10, hipWidth: 0.02, armLength: -0.07, armWidth: 0.04, legLength: 0.04, legWidth: 0, muscleDefinition: 0.20, handSize: 0.08, footSize: 0.08, headWidth: 0.03, headHeight: 0.02, hairlineHeight: 0.10, eyeSize: 0.04, browHeight: 0.04, browLength: 0.09, noseWidth: 0.04, lipFullness: -0.03 }
        },
        securityOfficerPremium: {
            id: 'security-officer-premium',
            name: 'Security Officer - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'security-officer-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'square', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'buzz-cut', hairColor: 'natural-black', facialHair: 'none', body: 'athletic', height: 'average' },
            styling: { outfit: 'security-uniform', profession: 'security-officer', headwear: 'security-cap', footwear: 'formal', accessories: ['id-badge', 'radio', 'whistle'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'short', clothingPalette: 'security-black', fabricDesign: 'reflective-tape' },
            premiumAdjustments: { torsoWidth: 0.07, torsoLength: 0.04, shoulderWidth: 0.14, hipWidth: 0.03, armLength: -0.06, armWidth: 0.07, legLength: 0.04, legWidth: 0.04, muscleDefinition: 0.30, handSize: 0.09, footSize: 0.10, headWidth: 0.03, headHeight: 0.01, hairlineHeight: 0.10, eyeSize: 0.03, browHeight: 0.04, browLength: 0.10, noseWidth: 0.07, lipFullness: -0.04 }
        },
        soldierPremium: {
            id: 'soldier-premium',
            name: 'Soldier - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'soldier-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'ebony', face: 'long', eyes: 'almond', nose: 'broad', lips: 'natural', hair: 'low-cut', hairColor: 'blue-black', facialHair: 'none', body: 'athletic', height: 'tall' },
            styling: { outfit: 'military-fatigues', profession: 'soldier', headwear: 'military-beret', footwear: 'formal', accessories: ['rank-badge', 'radio'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'wrist', clothingPalette: 'military-olive', fabricDesign: 'camouflage' },
            premiumAdjustments: { torsoWidth: 0.08, torsoLength: 0.05, shoulderWidth: 0.15, hipWidth: 0.04, armLength: -0.06, armWidth: 0.08, legLength: 0.04, legWidth: 0.05, muscleDefinition: 0.34, handSize: 0.09, footSize: 0.11, headWidth: 0.02, headHeight: 0.01, hairlineHeight: 0.10, eyeSize: 0.03, browHeight: 0.04, browLength: 0.09, noseWidth: 0.07, lipFullness: -0.05 }
        },
        eventHostPremium: {
            id: 'event-host-premium',
            name: 'Event Host - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'event-host-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'caramel', face: 'soft-diamond', eyes: 'wide', nose: 'soft', lips: 'full', hair: 'long-waves', hairColor: 'dark-brown', facialHair: 'none', body: 'average', height: 'tall' },
            styling: { outfit: 'event-formal', profession: 'event-host', headwear: 'turban', footwear: 'formal', accessories: ['earrings', 'beads', 'lapel-mic'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'elbow', skirtLength: 'below-knee', clothingPalette: 'teal-coral', fabricDesign: 'subtle-trim' },
            premiumAdjustments: { torsoWidth: -0.01, torsoLength: 0.06, shoulderWidth: -0.05, hipWidth: 0.12, armLength: -0.08, armWidth: -0.01, legLength: 0.04, legWidth: -0.02, muscleDefinition: 0.02, handSize: 0.09, footSize: 0.08, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.04, hairlineHeight: 0.11, eyeSize: 0.10, browHeight: 0.08, browLength: 0, noseWidth: 0.02, lipFullness: 0.14 }
        },
        femaleStudentPremium: {
            id: 'female-student-premium',
            name: 'Female Student - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'female-student-front',
            identity: { presentation: 'female', ageGroup: 'young-adult', skinTone: 'goldenBrown', face: 'oval', eyes: 'wide', nose: 'soft', lips: 'defined', hair: 'afro-short', body: 'slim', height: 'average' },
            styling: { outfit: 'student-casual', profession: 'student', footwear: 'casual', accessories: ['backpack', 'earrings'], culturalStyle: 'contemporary', view: 'front' },
            premiumAdjustments: { torsoWidth: -0.07, torsoLength: -0.03, shoulderWidth: -0.12, hipWidth: 0.06, armLength: -0.10, armWidth: -0.04, legLength: 0.04, legWidth: -0.05, muscleDefinition: -0.05, handSize: 0.07, footSize: 0.08, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.06, hairlineHeight: 0.10, eyeSize: 0.09, browHeight: 0.08, browLength: -0.02, lipFullness: 0.05 }
        },
        maleStudentPremium: {
            id: 'male-student-premium',
            name: 'Male Student - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'male-student-front',
            identity: { presentation: 'male', ageGroup: 'young-adult', skinTone: 'umber', face: 'oval', eyes: 'almond', nose: 'rounded', lips: 'natural', hair: 'fade', facialHair: 'none', body: 'slim', height: 'average' },
            styling: { outfit: 'student-casual', profession: 'student', footwear: 'sneakers', accessories: ['backpack', 'notebook'], culturalStyle: 'contemporary', view: 'front' },
            premiumAdjustments: { torsoWidth: -0.01, torsoLength: -0.02, shoulderWidth: -0.03, hipWidth: -0.01, armLength: -0.09, armWidth: -0.02, legLength: 0.04, legWidth: -0.03, muscleDefinition: 0.08, handSize: 0.07, footSize: 0.10, headWidth: 0.03, headHeight: 0.01, hairlineHeight: 0.10, eyeSize: 0.05, browHeight: 0.04, browLength: 0.04, noseWidth: 0.03, lipFullness: -0.04 }
        },
        neutralPresenterPremium: {
            id: 'neutral-presenter-premium',
            name: 'Neutral Presenter - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'neutral-presenter-premium-front',
            identity: { presentation: 'nonbinary', ageGroup: 'adult', skinTone: 'umber', face: 'soft-diamond', eyes: 'almond', nose: 'rounded', lips: 'natural', hair: 'twists', hairColor: 'natural-black', facialHair: 'none', body: 'average', height: 'average' },
            styling: { outfit: 'smart-casual', profession: 'entrepreneur', footwear: 'loafers', accessories: ['watch'], culturalStyle: 'contemporary', view: 'front', sleeveLength: 'elbow', clothingPalette: 'auto', fabricDesign: 'plain' },
            premiumAdjustments: { torsoWidth: 0.01, torsoLength: 0.02, shoulderWidth: 0.01, hipWidth: 0.04, armLength: -0.08, armWidth: 0, legLength: 0.04, legWidth: -0.02, muscleDefinition: 0.04, handSize: 0.08, footSize: 0.08, headWidth: 0.04, headHeight: 0.02, hairVolume: 0.02, hairlineHeight: 0.10, eyeSize: 0.06, browHeight: 0.05, browLength: 0.02, noseWidth: 0.03, lipFullness: 0.02 }
        },
        iroBubaPremium: {
            id: 'iro-buba-premium',
            name: 'Iro & Buba Woman - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'iro-buba-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'bronze', face: 'soft-diamond', eyes: 'almond', nose: 'rounded', lips: 'full', hair: 'natural-bun', facialHair: 'none', body: 'full', height: 'average' },
            styling: { outfit: 'iro-buba', profession: 'entrepreneur', headwear: 'gele', footwear: 'sandals', accessories: ['beads', 'earrings'], culturalStyle: 'yoruba', view: 'front' },
            premiumAdjustments: { torsoWidth: 0.03, torsoLength: 0.18, shoulderWidth: -0.08, hipWidth: 0.18, armLength: -0.08, armWidth: -0.02, legLength: 0.04, legWidth: -0.03, muscleDefinition: -0.03, handSize: 0.08, footSize: 0.08, headWidth: 0.06, headHeight: 0.04, neckWidth: 0.02, neckHeight: -0.02, hairVolume: 0.03, hairlineHeight: 0.10, eyeSize: 0.08, browHeight: 0.08, browLength: -0.02, lipFullness: 0.14 }
        },
        ankaraCreativePremium: {
            id: 'ankara-creative-premium',
            name: 'Ankara Creative - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'ankara-creative-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'honey', face: 'heart', eyes: 'wide', nose: 'soft', lips: 'full', hair: 'twists', facialHair: 'none', body: 'average', height: 'average' },
            styling: { outfit: 'ankara-peplum', profession: 'entrepreneur', headwear: 'wrapped-gele', footwear: 'sandals', accessories: ['earrings'], culturalStyle: 'ankara', view: 'front', sleeveLength: 'bell', skirtLength: 'above-knee', clothingPalette: 'ankara-warm', fabricDesign: 'ankara' },
            premiumAdjustments: { torsoWidth: -0.02, torsoLength: 0.04, shoulderWidth: -0.08, hipWidth: 0.13, armLength: -0.09, armWidth: -0.02, legLength: 0.04, legWidth: -0.03, muscleDefinition: -0.03, handSize: 0.08, footSize: 0.08, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.04, hairlineHeight: 0.11, eyeSize: 0.09, browHeight: 0.08, browLength: -0.01, lipFullness: 0.12 }
        },
        senatorWearPremium: {
            id: 'senator-wear-premium',
            name: 'Senator Wear Man - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'senator-wear-premium-front',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'oval', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'fade', facialHair: 'moustache', body: 'athletic', height: 'tall' },
            styling: { outfit: 'senator-wear', profession: 'administrator', headwear: 'igbo-red-cap', footwear: 'loafers', accessories: ['watch'], culturalStyle: 'igbo', view: 'front', sleeveLength: 'wrist', clothingPalette: 'charcoal-red', fabricDesign: 'woven-bands' },
            premiumAdjustments: { torsoWidth: 0.08, torsoLength: 0.10, shoulderWidth: 0.10, hipWidth: 0.04, armLength: -0.07, armWidth: 0.05, legLength: 0.04, legWidth: 0.02, muscleDefinition: 0.20, handSize: 0.08, footSize: 0.09, headWidth: 0.03, headHeight: 0.01, hairlineHeight: 0.10, browHeight: 0.05, browLength: 0.08, noseWidth: 0.04, lipFullness: -0.02 }
        },
        agbadaFormalPremium: {
            id: 'agbada-formal-premium',
            name: 'Agbada Formal - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'agbada-formal-premium-front',
            identity: { presentation: 'male', ageGroup: 'older-adult', skinTone: 'nightEbony', face: 'square', eyes: 'hooded', nose: 'broad', lips: 'defined', hair: 'low-cut', facialHair: 'full-beard', body: 'full', height: 'tall' },
            styling: { outfit: 'agbada', profession: 'administrator', headwear: 'yoruba-fila', footwear: 'loafers', accessories: ['beads', 'watch'], culturalStyle: 'yoruba', view: 'front', sleeveLength: 'wrist', clothingPalette: 'royal-white', fabricDesign: 'woven-bands' },
            premiumAdjustments: { torsoWidth: 0.16, torsoLength: 0.20, shoulderWidth: 0.12, hipWidth: 0.12, armLength: -0.06, armWidth: 0.08, legLength: 0.04, legWidth: 0.02, muscleDefinition: 0.10, handSize: 0.10, footSize: 0.09, headWidth: 0.04, headHeight: 0.02, hairlineHeight: 0.09, browHeight: 0.04, browLength: 0.10, noseWidth: 0.08, lipFullness: 0.02 }
        },
        georgeWrapperPremium: {
            id: 'george-wrapper-premium',
            name: 'George Wrapper Woman - Premium',
            engine: 'svg-armature-premium',
            rendererVersion: 1,
            assetCharacterId: 'george-wrapper-premium-front',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'mahogany', face: 'oval', eyes: 'round', nose: 'soft', lips: 'defined', hair: 'locs', facialHair: 'none', body: 'average', height: 'tall' },
            styling: { outfit: 'george-wrapper', profession: 'administrator', headwear: 'turban', footwear: 'sandals', accessories: ['beads', 'earrings'], culturalStyle: 'niger-delta', view: 'front', sleeveLength: 'elbow', skirtLength: 'ankle', clothingPalette: 'burgundy-gold', fabricDesign: 'woven-bands' },
            premiumAdjustments: { torsoWidth: 0.02, torsoLength: 0.14, shoulderWidth: -0.06, hipWidth: 0.16, armLength: -0.08, armWidth: -0.02, legLength: 0.04, legWidth: -0.02, muscleDefinition: -0.02, handSize: 0.08, footSize: 0.08, headWidth: 0.05, headHeight: 0.03, hairVolume: 0.02, hairlineHeight: 0.10, eyeSize: 0.07, browHeight: 0.07, browLength: -0.01, lipFullness: 0.08 }
        },
        lecturerFemale: {
            id: 'lecturer-female',
            name: 'Female Lecturer',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'warmBrown', face: 'oval', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'braids', body: 'average', height: 'average' },
            styling: { outfit: 'lecturer', profession: 'lecturer', footwear: 'formal', accessories: ['glasses', 'notebook'], culturalStyle: 'contemporary' }
        },
        lecturerMale: {
            id: 'lecturer-male',
            name: 'Male Lecturer',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'square', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'low-cut', facialHair: 'short-beard', body: 'average', height: 'average' },
            styling: { outfit: 'business-suit', profession: 'lecturer', footwear: 'formal', accessories: ['glasses'], culturalStyle: 'contemporary' }
        },
        doctorFemale: {
            id: 'doctor-female',
            name: 'Female Doctor',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'bronze', face: 'soft-diamond', eyes: 'round', nose: 'soft', lips: 'full', hair: 'natural-bun', body: 'average', height: 'average' },
            styling: { outfit: 'doctor', profession: 'doctor', footwear: 'clinical', accessories: ['id-badge', 'stethoscope'], culturalStyle: 'contemporary' }
        },
        doctorMale: {
            id: 'doctor-male',
            name: 'Male Doctor',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'mahogany', face: 'oval', eyes: 'almond', nose: 'rounded', lips: 'natural', hair: 'fade', facialHair: 'goatee', body: 'athletic', height: 'tall' },
            styling: { outfit: 'doctor', profession: 'doctor', footwear: 'clinical', accessories: ['id-badge', 'stethoscope'], culturalStyle: 'contemporary' }
        },
        nurseFemale: {
            id: 'nurse-female',
            name: 'Female Nurse',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'umber', face: 'round', eyes: 'almond', nose: 'soft', lips: 'defined', hair: 'cornrows', body: 'average', height: 'average' },
            styling: { outfit: 'nurse', profession: 'nurse', footwear: 'clinical', accessories: ['id-badge'], culturalStyle: 'contemporary' }
        },
        labScientist: {
            id: 'lab-scientist',
            name: 'Laboratory Scientist',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'ebony', face: 'long', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'low-cut', body: 'slim', height: 'tall' },
            styling: { outfit: 'lab-coat', profession: 'laboratory-scientist', footwear: 'clinical', accessories: ['id-badge', 'glasses'], culturalStyle: 'contemporary' }
        },
        studentFemale: {
            id: 'student-female',
            name: 'Female University Student',
            identity: { presentation: 'female', ageGroup: 'young-adult', skinTone: 'caramel', face: 'round', eyes: 'wide', nose: 'soft', lips: 'natural', hair: 'cornrows', body: 'slim', height: 'average' },
            styling: { outfit: 'student', profession: 'student', footwear: 'sneakers', accessories: ['notebook'], culturalStyle: 'contemporary' }
        },
        studentMale: {
            id: 'student-male',
            name: 'Male University Student',
            identity: { presentation: 'male', ageGroup: 'young-adult', skinTone: 'umber', face: 'oval', eyes: 'almond', nose: 'rounded', lips: 'natural', hair: 'low-cut', body: 'slim', height: 'average' },
            styling: { outfit: 'student', profession: 'student', footwear: 'sneakers', accessories: ['notebook'], culturalStyle: 'contemporary' }
        },
        ankaraCreative: {
            id: 'ankara-creative',
            name: 'Ankara Creative',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'honey', face: 'heart', eyes: 'wide', nose: 'soft', lips: 'full', hair: 'twists', body: 'average', height: 'average' },
            styling: { outfit: 'ankara-peplum', profession: 'entrepreneur', headwear: 'wrapped-gele', footwear: 'sandals', accessories: ['earrings'], culturalStyle: 'ankara' }
        },
        senatorMale: {
            id: 'senator-male',
            name: 'Senator Wear',
            identity: { presentation: 'male', ageGroup: 'adult', skinTone: 'deep', face: 'oval', eyes: 'hooded', nose: 'broad', lips: 'natural', hair: 'fade', facialHair: 'moustache', body: 'average', height: 'tall' },
            styling: { outfit: 'senator-wear', profession: 'administrator', headwear: 'fila', footwear: 'loafers', accessories: ['watch'], culturalStyle: 'yoruba' }
        },
        agbadaChief: {
            id: 'agbada-chief',
            name: 'Agbada Formal',
            identity: { presentation: 'male', ageGroup: 'older-adult', skinTone: 'nightEbony', face: 'square', eyes: 'hooded', nose: 'broad', lips: 'defined', hair: 'low-cut', facialHair: 'full-beard', body: 'full', height: 'tall' },
            styling: { outfit: 'agbada', profession: 'administrator', headwear: 'fila', footwear: 'loafers', accessories: ['beads', 'watch'], culturalStyle: 'yoruba' }
        },
        iroBubaWoman: {
            id: 'iro-buba-woman',
            name: 'Iro & Buba',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'bronze', face: 'soft-diamond', eyes: 'almond', nose: 'rounded', lips: 'full', hair: 'natural-bun', body: 'full', height: 'average' },
            styling: { outfit: 'iro-buba', profession: 'entrepreneur', headwear: 'gele', footwear: 'sandals', accessories: ['beads', 'earrings'], culturalStyle: 'yoruba' }
        },
        georgeWrapperWoman: {
            id: 'george-wrapper-woman',
            name: 'George Wrapper',
            identity: { presentation: 'female', ageGroup: 'adult', skinTone: 'mahogany', face: 'oval', eyes: 'round', nose: 'soft', lips: 'defined', hair: 'locs', body: 'average', height: 'tall' },
            styling: { outfit: 'george-wrapper', profession: 'administrator', headwear: 'turban', footwear: 'sandals', accessories: ['beads'], culturalStyle: 'niger-delta' }
        }
    });

    const COMMUNITY_PRESETS = Object.freeze(communityPresets());
    const ALL_PRESETS = Object.freeze({ ...PRESETS, ...COMMUNITY_PRESETS });

    const LEGACY_PRESET_PREMIUM_UPGRADES = Object.freeze({
        'lecturer-female': 'ada-lecturer-premium',
        'lecturer-male': 'male-lecturer-premium',
        'doctor-female': 'female-doctor-premium',
        'doctor-male': 'male-doctor-premium',
        'nurse-female': 'nurse-female-premium',
        'lab-scientist': 'lab-scientist-premium',
        'student-female': 'female-student-premium',
        'student-male': 'male-student-premium',
        'ankara-creative': 'ankara-creative-premium',
        'senator-male': 'senator-wear-premium',
        'agbada-chief': 'agbada-formal-premium',
        'iro-buba-woman': 'iro-buba-premium',
        'george-wrapper-woman': 'george-wrapper-premium'
    });

    function canUsePremiumPresetUpgrade(config = {}) {
        if (!config || typeof config !== 'object') return true;
        if (config.useBasicSvg === true || config.preferBasicSvg === true || config.disablePremiumPresetUpgrade === true) return false;
        if (config.assetCharacterId) return false;
        if (typeof config.engine === 'string' && config.engine && config.engine !== DEFAULT_CONFIG.engine && config.engine !== 'svg-armature-premium') {
            return false;
        }
        return true;
    }

    function premiumUpgradeForPresetId(presetId, config = {}) {
        const key = String(presetId || '').trim();
        if (!key || !canUsePremiumPresetUpgrade(config)) return null;
        return LEGACY_PRESET_PREMIUM_UPGRADES[key] || null;
    }

    function newIdentityId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return `identity-${crypto.randomUUID()}`;
        return `identity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function clone(value) {
        if (!value || typeof value !== 'object') return value;
        return Array.isArray(value) ? [...value] : { ...value };
    }

    function oneOf(id, source, fallback) {
        const value = String(id || '').trim();
        if (!value) return fallback;
        if (source[value]) return source[value].id || value;
        const found = Object.values(source).find(item => item.id === value);
        return found?.id || fallback;
    }

    function normalizeHexColor(value) {
        const text = String(value || '').trim();
        const match = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!match) return null;
        const body = match[1];
        const expanded = body.length === 3
            ? body.split('').map(ch => ch + ch).join('')
            : body;
        return `#${expanded.toLowerCase()}`;
    }

    function hexToRgb(value) {
        const hex = normalizeHexColor(value);
        if (!hex) return null;
        const raw = hex.slice(1);
        return {
            r: parseInt(raw.slice(0, 2), 16),
            g: parseInt(raw.slice(2, 4), 16),
            b: parseInt(raw.slice(4, 6), 16)
        };
    }

    function rgbToHex({ r, g, b }) {
        const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
        return `#${[r, g, b].map(value => clamp(value).toString(16).padStart(2, '0')).join('')}`;
    }

    function mixColor(color, target, amount) {
        const from = hexToRgb(color);
        const to = hexToRgb(target);
        if (!from || !to) return normalizeHexColor(color) || HAIR_COLORS.naturalBlack.light;
        const t = Math.max(0, Math.min(1, Number(amount) || 0));
        return rgbToHex({
            r: from.r + (to.r - from.r) * t,
            g: from.g + (to.g - from.g) * t,
            b: from.b + (to.b - from.b) * t
        });
    }

    function resolveHairColorSpec(value) {
        const text = String(value || '').trim();
        if (!text) return HAIR_COLORS.naturalBlack;
        const normalizedId = text.replace(/_/g, '-');
        const found = HAIR_COLORS[text] || Object.values(HAIR_COLORS).find(item => item.id === normalizedId);
        if (found) return found;
        const custom = normalizeHexColor(text);
        if (custom) {
            return {
                id: custom,
                name: 'Custom Hair Color',
                color: custom,
                light: mixColor(custom, '#ffffff', 0.24)
            };
        }
        return HAIR_COLORS.naturalBlack;
    }

    function normalizeAccessories(value, fallback = []) {
        const raw = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : fallback);
        return raw
            .map(item => String(item || '').trim())
            .filter(Boolean)
            .map(item => oneOf(item, ACCESSORIES, null))
            .filter(Boolean);
    }

    function normalizeHeightScale(identity) {
        const variant = Object.values(HEIGHT_VARIANTS).find(item => item.id === identity.height);
        const numeric = Number(identity.heightScale);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : (variant?.scale || 1);
    }

    const COLOR_OVERRIDE_KEYS = Object.freeze([
        'top', 'outer', 'jacket',
        'shirt', 'blouse', 'inner',
        'tie', 'necktie',
        'bottom', 'skirt', 'wrapper',
        'shoes', 'shoe', 'footwear',
        'glasses', 'eyeglasses', 'glass',
        'headwear', 'headgear',
        'accent'
    ]);

    function normalizeColorOverrides(value = {}) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return COLOR_OVERRIDE_KEYS.reduce((output, key) => {
            const color = normalizeHexColor(source[key]);
            if (color) output[key] = color;
            return output;
        }, {});
    }

    function flattenConfig(base) {
        const identity = base.identity;
        const styling = base.styling;
        return {
            engine: base.engine || DEFAULT_CONFIG.engine,
            rendererVersion: Number.isFinite(Number(base.rendererVersion)) ? Number(base.rendererVersion) : DEFAULT_CONFIG.rendererVersion,
            assetCharacterId: base.assetCharacterId || DEFAULT_CONFIG.assetCharacterId,
            name: base.name || 'SVG African Character',
            preset: base.preset || null,
            sourcePreset: base.sourcePreset || null,
            upgradedFromPreset: base.upgradedFromPreset || null,
            useBasicSvg: base.useBasicSvg === true,
            preferBasicSvg: base.preferBasicSvg === true,
            disablePremiumPresetUpgrade: base.disablePremiumPresetUpgrade === true,
            identityId: identity.identityId,
            presentation: identity.presentation,
            ageGroup: identity.ageGroup,
            skinTone: identity.skinTone,
            headType: identity.headType,
            face: identity.face,
            eyes: identity.eyes,
            nose: identity.nose,
            lips: identity.lips,
            hair: identity.hair,
            hairColor: identity.hairColor,
            facialHair: identity.facialHair,
            body: identity.body,
            height: identity.height,
            heightScale: identity.heightScale,
            profession: styling.profession,
            outfit: styling.outfit,
            customPieces: styling.customPieces === true,
            topClothing: styling.topClothing,
            bottomClothing: styling.bottomClothing,
            skirtLength: styling.skirtLength,
            sleeveLength: styling.sleeveLength,
            clothingPalette: styling.clothingPalette,
            fabricDesign: styling.fabricDesign,
            neckTieType: styling.neckTieType,
            neckTieDesign: styling.neckTieDesign,
            headwear: styling.headwear,
            footwear: styling.footwear,
            accessories: [...styling.accessories],
            jewelry: clone(styling.jewelry),
            colorOverrides: clone(styling.colorOverrides || {}),
            culturalStyle: styling.culturalStyle,
            expression: styling.expression,
            facePreset: base._svgAfricanFacePreset || base.facePreset || styling.expressionPreset || '',
            view: styling.view,
            sideFacing: styling.sideFacing,
            threeQuarterArtwork: styling.threeQuarterArtwork,
            rearTalkingProfile: styling.rearTalkingProfile,
            premiumAdjustments: clone(base.premiumAdjustments || {}),
            ...(base._photoCharacter ? { _photoCharacter: clone(base._photoCharacter) } : {}),
            ...(base._realisticCharacter ? { _realisticCharacter: clone(base._realisticCharacter) } : {}),
            _svgAfricanFaceState: clone(base._svgAfricanFaceState || base.faceState || {}),
            _svgAfricanFacePreset: base._svgAfricanFacePreset || base.facePreset || styling.expressionPreset || '',
            identity: clone(identity),
            styling: clone(styling)
        };
    }

    class SvgAfricanCharacterCatalog {
        static get skinTones() { return SKIN_TONES; }
        static get faceShapes() { return FACE_SHAPES; }
        static get headTypes() { return HEAD_TYPES; }
        static get eyeStyles() { return EYE_STYLES; }
        static get noseStyles() { return NOSE_STYLES; }
        static get lipStyles() { return LIP_STYLES; }
        static get hairstyles() { return HAIR_STYLES; }
        static get hairColors() { return HAIR_COLORS; }
        static get facialHairStyles() { return FACIAL_HAIR; }
        static get bodyTypes() { return BODY_TYPES; }
        static get heightVariants() { return HEIGHT_VARIANTS; }
        static get professions() { return PROFESSIONS; }
        static get outfits() { return OUTFITS; }
        static get topClothing() { return TOP_CLOTHING; }
        static get bottomClothing() { return BOTTOM_CLOTHING; }
        static get skirtLengths() { return SKIRT_LENGTHS; }
        static get sleeveLengths() { return SLEEVE_LENGTHS; }
        static get neckTieTypes() { return NECK_TIE_TYPES; }
        static get neckTieDesigns() { return NECK_TIE_DESIGNS; }
        static get clothingPalettes() { return CLOTHING_PALETTES; }
        static get fabricDesigns() { return FABRIC_DESIGNS; }
        static get headwear() { return HEADWEAR; }
        static get footwear() { return FOOTWEAR; }
        static get accessories() { return ACCESSORIES; }
        static get jewelryOptions() { return JEWELRY_OPTIONS; }
        static normalizeJewelry(value) { return normalizeJewelry(value); }
        static get culturalStyles() { return CULTURAL_STYLES; }
        static get threeQuarterArtworkModes() { return THREE_QUARTER_ARTWORK_MODES; }
        static get presets() { return ALL_PRESETS; }
        static get defaultConfig() { return DEFAULT_CONFIG; }
        static get femaleWrapperOutfits() { return [...FEMALE_WRAPPER_OUTFITS]; }
        static get legacyPresetPremiumUpgrades() { return LEGACY_PRESET_PREMIUM_UPGRADES; }

        static isOutfitCompatibleWithPresentation(outfitId, presentation) {
            return isOutfitCompatibleWithPresentation(outfitId, presentation);
        }

        static fallbackOutfitForPresentation(outfitId, presentation, culturalStyle) {
            return fallbackOutfitForPresentation(outfitId, presentation, culturalStyle);
        }

        static topClothingForOutfit(outfitId) {
            return topClothingForOutfit(outfitId);
        }

        static bottomClothingForOutfit(outfitId, presentation) {
            return bottomClothingForOutfit(outfitId, presentation);
        }

        static getPreset(id) {
            return Object.values(ALL_PRESETS).find(item => item.id === id) || null;
        }

        static getPremiumUpgradeForPreset(id) {
            return premiumUpgradeForPresetId(id, {});
        }

        static listPresets() {
            return Object.values(ALL_PRESETS).map(item => ({
                ...item,
                premiumUpgradePresetId: LEGACY_PRESET_PREMIUM_UPGRADES[item.id] || null,
                identity: clone(item.identity),
                styling: clone(item.styling)
            }));
        }

        static listBuilderPresets(options = {}) {
            const includeLegacyAliases = options.includeLegacyAliases === true || options.includeLegacy === true;
            const premium = [];
            const legacyAliases = [];
            const basic = [];

            this.listPresets().forEach(item => {
                if (item.engine === 'svg-armature-premium') {
                    premium.push({
                        ...item,
                        builderTier: 'premium',
                        builderName: item.name || item.id
                    });
                    return;
                }

                if (item.premiumUpgradePresetId) {
                    if (includeLegacyAliases) {
                        legacyAliases.push({
                            ...item,
                            builderTier: 'premium-alias',
                            aliasedToPremium: true,
                            builderName: `${item.name || item.id} (Premium alias)`
                        });
                    }
                    return;
                }

                basic.push({
                    ...item,
                    builderTier: 'basic',
                    builderName: `${item.name || item.id} (Basic)`
                });
            });

            return [...premium, ...legacyAliases, ...basic];
        }

        static normalizeConfig(config = {}) {
            const requestedPresetId = config.preset ? String(config.preset) : null;
            const requestedPreset = requestedPresetId ? this.getPreset(requestedPresetId) : null;
            const premiumUpgradePresetId = premiumUpgradeForPresetId(requestedPreset?.id || requestedPresetId, config);
            const upgradedPreset = premiumUpgradePresetId ? this.getPreset(premiumUpgradePresetId) : null;
            const preset = upgradedPreset || requestedPreset;
            const upgradedFromPreset = upgradedPreset ? (requestedPreset?.id || requestedPresetId) : null;
            const rawIdentity = {
                ...DEFAULT_IDENTITY,
                ...(preset?.identity || {}),
                ...(config.identity || {})
            };
            const rawStyling = {
                ...DEFAULT_STYLING,
                ...(preset?.styling || {}),
                ...(config.styling || {})
            };

            Object.keys(DEFAULT_IDENTITY).forEach(key => {
                if (Object.prototype.hasOwnProperty.call(config, key)) rawIdentity[key] = config[key];
            });
            Object.keys(DEFAULT_STYLING).forEach(key => {
                const nestedOwnsKey = Object.prototype.hasOwnProperty.call(config.styling || {}, key);
                if (Object.prototype.hasOwnProperty.call(config, key) && !(['threeQuarterArtwork', 'rearTalkingProfile'].includes(key) && nestedOwnsKey)) {
                    rawStyling[key] = config[key];
                }
            });

            rawIdentity.identityId = rawIdentity.identityId || config.identityId || newIdentityId();
            rawIdentity.presentation = ['female', 'male', 'nonbinary'].includes(rawIdentity.presentation) ? rawIdentity.presentation : DEFAULT_IDENTITY.presentation;
            rawIdentity.ageGroup = oneOf(rawIdentity.ageGroup, {
                child: { id: 'child' },
                teen: { id: 'teen' },
                youngAdult: { id: 'young-adult' },
                adult: { id: 'adult' },
                olderAdult: { id: 'older-adult' }
            }, DEFAULT_IDENTITY.ageGroup);
            rawIdentity.skinTone = oneOf(rawIdentity.skinTone, SKIN_TONES, DEFAULT_IDENTITY.skinTone);
            rawIdentity.headType = oneOf(rawIdentity.headType, HEAD_TYPES, DEFAULT_IDENTITY.headType);
            rawIdentity.face = oneOf(rawIdentity.face, FACE_SHAPES, DEFAULT_IDENTITY.face);
            rawIdentity.eyes = oneOf(rawIdentity.eyes, EYE_STYLES, DEFAULT_IDENTITY.eyes);
            rawIdentity.nose = oneOf(rawIdentity.nose, NOSE_STYLES, DEFAULT_IDENTITY.nose);
            rawIdentity.lips = oneOf(rawIdentity.lips, LIP_STYLES, DEFAULT_IDENTITY.lips);
            rawIdentity.hair = oneOf(rawIdentity.hair, HAIR_STYLES, DEFAULT_IDENTITY.hair);
            rawIdentity.hairColor = resolveHairColorSpec(rawIdentity.hairColor).id;
            rawIdentity.facialHair = oneOf(rawIdentity.facialHair, FACIAL_HAIR, DEFAULT_IDENTITY.facialHair);
            rawIdentity.body = oneOf(rawIdentity.body, BODY_TYPES, DEFAULT_IDENTITY.body);
            rawIdentity.height = oneOf(rawIdentity.height, HEIGHT_VARIANTS, DEFAULT_IDENTITY.height);
            rawIdentity.heightScale = normalizeHeightScale(rawIdentity);

            rawStyling.profession = oneOf(rawStyling.profession, PROFESSIONS, DEFAULT_STYLING.profession);
            rawStyling.outfit = oneOf(rawStyling.outfit, OUTFITS, DEFAULT_STYLING.outfit);
            rawStyling.customPieces = rawStyling.customPieces === true;
            rawStyling.topClothing = oneOf(rawStyling.topClothing, TOP_CLOTHING, DEFAULT_STYLING.topClothing);
            rawStyling.bottomClothing = oneOf(rawStyling.bottomClothing, BOTTOM_CLOTHING, DEFAULT_STYLING.bottomClothing);
            rawStyling.skirtLength = oneOf(rawStyling.skirtLength, SKIRT_LENGTHS, DEFAULT_STYLING.skirtLength);
            rawStyling.sleeveLength = oneOf(rawStyling.sleeveLength, SLEEVE_LENGTHS, DEFAULT_STYLING.sleeveLength);
            rawStyling.clothingPalette = oneOf(rawStyling.clothingPalette, CLOTHING_PALETTES, DEFAULT_STYLING.clothingPalette);
            rawStyling.fabricDesign = oneOf(rawStyling.fabricDesign, FABRIC_DESIGNS, DEFAULT_STYLING.fabricDesign);
            rawStyling.neckTieType = oneOf(rawStyling.neckTieType || rawStyling.tieType || config.tieType, NECK_TIE_TYPES, DEFAULT_STYLING.neckTieType);
            rawStyling.neckTieDesign = oneOf(rawStyling.neckTieDesign || rawStyling.tieDesign || config.neckTieDesign || config.tieDesign, NECK_TIE_DESIGNS, DEFAULT_STYLING.neckTieDesign);
            rawStyling.headwear = oneOf(rawStyling.headwear, HEADWEAR, DEFAULT_STYLING.headwear);
            rawStyling.footwear = oneOf(rawStyling.footwear, FOOTWEAR, DEFAULT_STYLING.footwear);
            rawStyling.accessories = normalizeAccessories(rawStyling.accessories, DEFAULT_STYLING.accessories);
            rawStyling.jewelry = normalizeJewelry(rawStyling.jewelry);
            rawStyling.colorOverrides = normalizeColorOverrides(rawStyling.colorOverrides);
            rawStyling.culturalStyle = oneOf(rawStyling.culturalStyle, CULTURAL_STYLES, DEFAULT_STYLING.culturalStyle);
            rawStyling.outfit = fallbackOutfitForPresentation(rawStyling.outfit, rawIdentity.presentation, rawStyling.culturalStyle);
            if (rawStyling.topClothing === TOP_CLOTHING.auto.id) {
                rawStyling.topClothing = topClothingForOutfit(rawStyling.outfit);
            }
            if (rawStyling.bottomClothing === BOTTOM_CLOTHING.auto.id) {
                rawStyling.bottomClothing = bottomClothingForOutfit(rawStyling.outfit, rawIdentity.presentation);
            }
            rawStyling.view = rawStyling.view || DEFAULT_STYLING.view;
            rawStyling.sideFacing = ['left', 'right'].includes(rawStyling.sideFacing) ? rawStyling.sideFacing : DEFAULT_STYLING.sideFacing;
            rawStyling.headArtwork = rawStyling.headArtwork === 'matched' ? 'matched' : 'original';
            rawStyling.threeQuarterArtwork = normalizeThreeQuarterArtwork(rawStyling.threeQuarterArtwork);
            rawStyling.rearTalkingProfile = rawStyling.rearTalkingProfile === 'experimental' ? 'experimental' : 'hidden';

            return flattenConfig({
                engine: config.engine || preset?.engine || DEFAULT_CONFIG.engine,
                name: config.name || preset?.name || DEFAULT_CONFIG.name,
                rendererVersion: config.rendererVersion ?? preset?.rendererVersion ?? DEFAULT_CONFIG.rendererVersion,
                assetCharacterId: config.assetCharacterId || preset?.assetCharacterId || DEFAULT_CONFIG.assetCharacterId,
                preset: preset?.id || requestedPresetId || null,
                sourcePreset: requestedPresetId,
                upgradedFromPreset,
                useBasicSvg: config.useBasicSvg === true,
                preferBasicSvg: config.preferBasicSvg === true,
                disablePremiumPresetUpgrade: config.disablePremiumPresetUpgrade === true,
                premiumAdjustments: {
                    ...(preset?.premiumAdjustments || {}),
                    ...(config.premiumAdjustments || {}),
                    ...(config._svgAfricanAdjustments || {})
                },
                _svgAfricanFaceState: {
                    ...(preset?._svgAfricanFaceState || {}),
                    ...(config._svgAfricanFaceState || {}),
                    ...(config.faceState || {})
                },
                _svgAfricanFacePreset: config._svgAfricanFacePreset || config.facePreset || '',
                _photoCharacter: globalThis.PhotoCharacterRig?.normalize(config._photoCharacter) || null,
                _realisticCharacter: globalThis.RealisticCharacter?.normalize(config._realisticCharacter) || null,
                identity: rawIdentity,
                styling: rawStyling
            });
        }

        static skinColor(config = {}) {
            const key = config.identity?.skinTone || config.skinTone || DEFAULT_IDENTITY.skinTone;
            return SKIN_TONES[key]?.color || SKIN_TONES.warmBrown.color;
        }

        static hairColorSpec(value) {
            return resolveHairColorSpec(value);
        }

        static hairColor(config = {}) {
            return resolveHairColorSpec(config.identity?.hairColor || config.hairColor).color;
        }
    }

    if (typeof window !== 'undefined') window.SvgAfricanCharacterCatalog = SvgAfricanCharacterCatalog;
    if (typeof globalThis !== 'undefined' && !globalThis.SvgAfricanCharacterCatalog) {
        globalThis.SvgAfricanCharacterCatalog = SvgAfricanCharacterCatalog;
    }
})();
