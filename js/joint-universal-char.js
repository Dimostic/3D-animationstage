/**
 * Joint System — Universal Character generator
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {

    _getUniversalCharacterTemplateStorageKey() {
        return 'universal-character-style-templates';
    },

    _loadUniversalCharacterStyleTemplates() {
        try {
            return JSON.parse(localStorage.getItem(this._getUniversalCharacterTemplateStorageKey())) || [];
        } catch {
            return [];
        }
    },

    _saveUniversalCharacterStyleTemplates(templates) {
        localStorage.setItem(this._getUniversalCharacterTemplateStorageKey(), JSON.stringify(templates || []));
    },

    _normalizeUniversalCharacterClothing(clothing = {}) {
        const topStyle = ['none', 'tee', 'polo', 'long-sleeve', 'sweater', 'hoodie', 'jacket', 'dress', 'shirt', 'blouse', 'blazer', 'lab-coat', 'scrub-top', 'tunic', 'chef-coat', 'vest', 'hi-vis', 'agbada'].includes(clothing?.topStyle)
            ? clothing.topStyle
            : 'tee';
        let bottomStyle = ['none', 'shorts', 'pants', 'skirt', 'slacks', 'scrub-pants', 'cargo'].includes(clothing?.bottomStyle)
            ? clothing.bottomStyle
            : 'pants';
        const footwearStyle = ['none', 'shoes', 'boots', 'dress-shoes', 'clogs', 'heels'].includes(clothing?.footwearStyle)
            ? clothing.footwearStyle
            : 'shoes';
        const outfitPreset = ['custom', 'casual', 'school', 'teacher', 'business', 'corporate', 'lawyer', 'sports', 'security', 'pilot', 'engineer', 'academic', 'scientist', 'mechanic', 'farmer', 'chief', 'clergy', 'graduate', 'doctor', 'nurse', 'scrubs', 'chef', 'construction', 'hospitality', 'dashiki', 'ankara', 'kaftan', 'agbada', 'agbada2', 'agbada3', 'royal-agbada', 'royal-agbada-painted', 'senator', 'senator2', 'senator3', 'senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'executive-tunic-suit', 'buba-wrapper', 'iro-buba', 'ankara-peplum', 'bubu-gown', 'george-wrapper', 'hybrid-skirt', 'iro-buba-hybrid', 'ankara-peplum-hybrid', 'bubu-gown-hybrid', 'george-wrapper-hybrid', 'adire', 'kente', 'modest'].includes(clothing?.outfitPreset)
            ? clothing.outfitPreset
            : 'custom';
        const garmentMode = ['painted', 'pinned', 'hybrid'].includes(clothing?.garmentMode)
            ? clothing.garmentMode
            : (outfitPreset === 'executive-tunic-suit' ? 'hybrid' : (topStyle === 'agbada' || outfitPreset === 'agbada' || outfitPreset === 'agbada2' || outfitPreset === 'agbada3' || outfitPreset === 'royal-agbada' || outfitPreset === 'senator' || outfitPreset === 'senator2' || outfitPreset === 'senator3' || outfitPreset === 'senator-shirt' || outfitPreset === 'senator-shirt-panel' || outfitPreset === 'senator-shirt-stripe' || outfitPreset === 'chief' ? 'pinned' : 'painted'));
        const agbadaLength = ['shirt', 'short', 'knee', 'long'].includes(clothing?.agbadaLength)
            ? clothing.agbadaLength
            : (outfitPreset === 'senator-shirt' || outfitPreset === 'senator-shirt-panel' || outfitPreset === 'senator-shirt-stripe' || outfitPreset === 'executive-tunic-suit' ? 'shirt' : (outfitPreset === 'agbada3' || outfitPreset === 'senator3' ? 'short' : (outfitPreset === 'agbada2' || outfitPreset === 'senator2' || outfitPreset === 'royal-agbada' || outfitPreset === 'royal-agbada-painted' ? 'long' : 'knee')));
        const robeFit = ['full', 'senator', 'shirt'].includes(clothing?.robeFit)
            ? clothing.robeFit
            : (outfitPreset === 'senator-shirt' || outfitPreset === 'senator-shirt-panel' || outfitPreset === 'senator-shirt-stripe' || outfitPreset === 'executive-tunic-suit' ? 'shirt' : (outfitPreset === 'senator' || outfitPreset === 'senator2' || outfitPreset === 'senator3' ? 'senator' : 'full'));
        const pinnedGarmentStyle = ['robe', 'senator-shirt', 'senator-panel', 'senator-stripe', 'executive-tunic', 'female-skirt', 'female-buba', 'female-peplum', 'female-bubu', 'female-george'].includes(clothing?.pinnedGarmentStyle)
            ? clothing.pinnedGarmentStyle
            : (outfitPreset === 'hybrid-skirt' ? 'female-skirt' : (outfitPreset === 'executive-tunic-suit' ? 'executive-tunic' : (outfitPreset === 'senator-shirt-panel' ? 'senator-panel' : (outfitPreset === 'senator-shirt-stripe' ? 'senator-stripe' : (outfitPreset === 'senator-shirt' ? 'senator-shirt' : 'robe')))));
        const skirtLength = ['mini', 'short', 'knee', 'midi', 'ankle', 'floor'].includes(clothing?.skirtLength)
            ? clothing.skirtLength
            : (outfitPreset === 'bubu-gown' || outfitPreset === 'bubu-gown-hybrid' ? 'floor' : (outfitPreset === 'iro-buba' || outfitPreset === 'iro-buba-hybrid' || outfitPreset === 'george-wrapper' || outfitPreset === 'george-wrapper-hybrid' ? 'ankle' : 'knee'));
        const skirtDesign = ['pencil', 'a-line', 'flared', 'wrapper', 'pleated', 'mermaid'].includes(clothing?.skirtDesign)
            ? clothing.skirtDesign
            : (outfitPreset === 'iro-buba' || outfitPreset === 'iro-buba-hybrid' || outfitPreset === 'george-wrapper' || outfitPreset === 'george-wrapper-hybrid' ? 'wrapper' : (outfitPreset === 'ankara-peplum' || outfitPreset === 'ankara-peplum-hybrid' || outfitPreset === 'bubu-gown' || outfitPreset === 'bubu-gown-hybrid' ? 'flared' : 'a-line'));
        const blouseNeck = ['round', 'v-neck', 'square', 'sweetheart', 'high', 'off-shoulder'].includes(clothing?.blouseNeck)
            ? clothing.blouseNeck
            : (outfitPreset === 'george-wrapper' || outfitPreset === 'george-wrapper-hybrid' ? 'square' : (outfitPreset === 'ankara-peplum' || outfitPreset === 'ankara-peplum-hybrid' ? 'sweetheart' : 'round'));
        const blouseSleeve = ['sleeveless', 'cap', 'short', 'elbow', 'three-quarter', 'long', 'puff', 'bell'].includes(clothing?.blouseSleeve)
            ? clothing.blouseSleeve
            : (outfitPreset === 'iro-buba' || outfitPreset === 'iro-buba-hybrid' ? 'elbow' : (outfitPreset === 'ankara-peplum' || outfitPreset === 'ankara-peplum-hybrid' ? 'puff' : 'short'));
        const blouseBody = ['fitted', 'loose', 'peplum', 'wrap', 'corset', 'crop'].includes(clothing?.blouseBody)
            ? clothing.blouseBody
            : (outfitPreset === 'ankara-peplum' || outfitPreset === 'ankara-peplum-hybrid' ? 'peplum' : (outfitPreset === 'iro-buba' || outfitPreset === 'iro-buba-hybrid' ? 'loose' : 'fitted'));
        const blouseDesign = ['plain', 'ankara-print', 'lace', 'beaded', 'pleated', 'embroidered'].includes(clothing?.blouseDesign)
            ? clothing.blouseDesign
            : (outfitPreset === 'george-wrapper' || outfitPreset === 'george-wrapper-hybrid' ? 'beaded' : (outfitPreset === 'ankara-peplum' || outfitPreset === 'ankara-peplum-hybrid' ? 'ankara-print' : 'plain'));
        return {
            outfitPreset,
            garmentMode,
            agbadaLength,
            robeFit,
            pinnedGarmentStyle,
            topStyle,
            bottomStyle,
            skirtLength,
            skirtDesign,
            blouseNeck,
            blouseSleeve,
            blouseBody,
            blouseDesign,
            footwearStyle,
            topColor: clothing?.topColor || '#5F7C8A',
            bottomColor: clothing?.bottomColor || '#2F4858',
            footwearColor: clothing?.footwearColor || '#5A3420',
            accentColor: clothing?.accentColor || '#DCE7EE'
        };
    },

    _ucGetOutfitPresetDefaults(preset = 'custom') {
        switch (preset) {
            case 'casual':
                return { topStyle: 'polo', bottomStyle: 'pants', footwearStyle: 'shoes', topColor: '#4C7A91', bottomColor: '#2F4858', footwearColor: '#3A3028', accentColor: '#E7F0F4' };
            case 'school':
                return { topStyle: 'shirt', bottomStyle: 'slacks', footwearStyle: 'shoes', topColor: '#EDF2F7', bottomColor: '#263547', footwearColor: '#1F1B19', accentColor: '#8A2432' };
            case 'teacher':
                return { topStyle: 'sweater', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#6B7D59', bottomColor: '#2F3A45', footwearColor: '#2B221C', accentColor: '#E3D8B8' };
            case 'business':
                return { topStyle: 'blazer', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#4A5B6A', bottomColor: '#2D3A45', footwearColor: '#2A211C', accentColor: '#C6D1DA' };
            case 'corporate':
                return { topStyle: 'blazer', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#2E4358', bottomColor: '#24313E', footwearColor: '#1F1B19', accentColor: '#9A3140' };
            case 'lawyer':
                return { topStyle: 'blazer', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#202733', bottomColor: '#1A202A', footwearColor: '#171412', accentColor: '#D8DDE4' };
            case 'sports':
                return { topStyle: 'tee', bottomStyle: 'shorts', footwearStyle: 'shoes', topColor: '#1F6FEB', bottomColor: '#123B7A', footwearColor: '#F2F5F7', accentColor: '#FFFFFF' };
            case 'security':
                return { topStyle: 'shirt', bottomStyle: 'slacks', footwearStyle: 'boots', topColor: '#243247', bottomColor: '#1C2635', footwearColor: '#171412', accentColor: '#D4A72C' };
            case 'pilot':
                return { topStyle: 'shirt', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#F2F5F7', bottomColor: '#24313E', footwearColor: '#171412', accentColor: '#C9A227' };
            case 'engineer':
                return { topStyle: 'vest', bottomStyle: 'cargo', footwearStyle: 'boots', topColor: '#E1A928', bottomColor: '#4D5865', footwearColor: '#3C2C21', accentColor: '#EEF4F7' };
            case 'academic':
                return { topStyle: 'blazer', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#4B5663', bottomColor: '#2E3742', footwearColor: '#211916', accentColor: '#7AA6C2' };
            case 'scientist':
                return { topStyle: 'lab-coat', bottomStyle: 'slacks', footwearStyle: 'clogs', topColor: '#F3F6F8', bottomColor: '#556E7C', footwearColor: '#EEF3F5', accentColor: '#6AA3A8' };
            case 'mechanic':
                return { topStyle: 'long-sleeve', bottomStyle: 'cargo', footwearStyle: 'boots', topColor: '#3B566F', bottomColor: '#25313C', footwearColor: '#2F241B', accentColor: '#E98D3C' };
            case 'farmer':
                return { topStyle: 'shirt', bottomStyle: 'cargo', footwearStyle: 'boots', topColor: '#7E8E56', bottomColor: '#5A4935', footwearColor: '#3E2C1D', accentColor: '#D7B56D' };
            case 'chief':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#F2E1B8', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#B88A36', garmentMode: 'pinned', agbadaLength: 'long', robeFit: 'full' };
            case 'clergy':
                return { topStyle: 'long-sleeve', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#252832', bottomColor: '#1C2028', footwearColor: '#171412', accentColor: '#F3F0E8' };
            case 'graduate':
                return { topStyle: 'blazer', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#20242C', bottomColor: '#1E2631', footwearColor: '#171412', accentColor: '#D2AA3A' };
            case 'doctor':
                return { topStyle: 'lab-coat', bottomStyle: 'slacks', footwearStyle: 'clogs', topColor: '#F2F5F7', bottomColor: '#6C8797', footwearColor: '#F9FBFC', accentColor: '#6CA7BF' };
            case 'nurse':
                return { topStyle: 'tunic', bottomStyle: 'scrub-pants', footwearStyle: 'clogs', topColor: '#8DB7C7', bottomColor: '#6E96A8', footwearColor: '#F4F7F8', accentColor: '#EAF3F7' };
            case 'scrubs':
                return { topStyle: 'scrub-top', bottomStyle: 'scrub-pants', footwearStyle: 'clogs', topColor: '#5F8FA2', bottomColor: '#467082', footwearColor: '#E8EDF0', accentColor: '#D6E6EC' };
            case 'chef':
                return { topStyle: 'chef-coat', bottomStyle: 'pants', footwearStyle: 'clogs', topColor: '#F5F5F0', bottomColor: '#30343A', footwearColor: '#181C1F', accentColor: '#C9D0D4' };
            case 'construction':
                return { topStyle: 'hi-vis', bottomStyle: 'cargo', footwearStyle: 'boots', topColor: '#E0B71A', bottomColor: '#485563', footwearColor: '#4A3728', accentColor: '#E8EEF0' };
            case 'hospitality':
                return { topStyle: 'vest', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#3E3A4A', bottomColor: '#25232C', footwearColor: '#201816', accentColor: '#D5C38F' };
            case 'dashiki':
                return { topStyle: 'tunic', bottomStyle: 'pants', footwearStyle: 'shoes', topColor: '#C46A2D', bottomColor: '#244054', footwearColor: '#3B2A1F', accentColor: '#F2C94C' };
            case 'ankara':
                return { topStyle: 'tunic', bottomStyle: 'pants', footwearStyle: 'shoes', topColor: '#C14B3B', bottomColor: '#1E4F63', footwearColor: '#38261F', accentColor: '#F4B942' };
            case 'kaftan':
                return { topStyle: 'tunic', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#2E5B61', bottomColor: '#213B42', footwearColor: '#2B221C', accentColor: '#D9C27A' };
            case 'agbada':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#F0E5C6', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#B88A36', garmentMode: 'pinned', agbadaLength: 'knee', robeFit: 'full' };
            case 'agbada2':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#EEE1BF', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#9C7430', garmentMode: 'pinned', agbadaLength: 'long', robeFit: 'full' };
            case 'agbada3':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#F3E8CC', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#B88A36', garmentMode: 'pinned', agbadaLength: 'short', robeFit: 'full' };
            case 'royal-agbada':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#102A63', bottomColor: '#101722', footwearColor: '#2B221C', accentColor: '#C99A3A', garmentMode: 'pinned', agbadaLength: 'long', robeFit: 'full' };
            case 'royal-agbada-painted':
                return { topStyle: 'tunic', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#102A63', bottomColor: '#101722', footwearColor: '#2B221C', accentColor: '#C99A3A', garmentMode: 'painted', agbadaLength: 'long', robeFit: 'full' };
            case 'senator':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#6B5A45', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#D9C27A', garmentMode: 'pinned', agbadaLength: 'knee', robeFit: 'senator' };
            case 'senator2':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#5E5141', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#C9A75E', garmentMode: 'pinned', agbadaLength: 'long', robeFit: 'senator' };
            case 'senator3':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#786854', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#D9C27A', garmentMode: 'pinned', agbadaLength: 'short', robeFit: 'senator' };
            case 'senator-shirt':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#786854', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#D9C27A', garmentMode: 'pinned', agbadaLength: 'shirt', robeFit: 'shirt', pinnedGarmentStyle: 'senator-shirt' };
            case 'senator-shirt-panel':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#2E5B61', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#D9C27A', garmentMode: 'pinned', agbadaLength: 'shirt', robeFit: 'shirt', pinnedGarmentStyle: 'senator-panel' };
            case 'senator-shirt-stripe':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#F2E1B8', bottomColor: '#1D2226', footwearColor: '#2B221C', accentColor: '#9C7430', garmentMode: 'pinned', agbadaLength: 'shirt', robeFit: 'shirt', pinnedGarmentStyle: 'senator-stripe' };
            case 'executive-tunic-suit':
                return { topStyle: 'agbada', bottomStyle: 'slacks', footwearStyle: 'dress-shoes', topColor: '#1D2020', bottomColor: '#151719', footwearColor: '#181412', accentColor: '#B4A17C', garmentMode: 'hybrid', agbadaLength: 'shirt', robeFit: 'shirt', pinnedGarmentStyle: 'executive-tunic' };
            case 'buba-wrapper':
                return { topStyle: 'dress', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#8E3F63', bottomColor: '#6E2F58', footwearColor: '#3B2A1F', accentColor: '#E8C66A' };
            case 'iro-buba':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#B73E6B', bottomColor: '#6D315B', footwearColor: '#4A2B20', accentColor: '#F2C85B', garmentMode: 'painted', blouseNeck: 'round', blouseSleeve: 'elbow', blouseBody: 'loose', blouseDesign: 'embroidered' };
            case 'ankara-peplum':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#C1493E', bottomColor: '#193F5A', footwearColor: '#4A2B20', accentColor: '#F5B942', garmentMode: 'painted', blouseNeck: 'sweetheart', blouseSleeve: 'puff', blouseBody: 'peplum', blouseDesign: 'ankara-print' };
            case 'bubu-gown':
                return { topStyle: 'dress', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#245B72', bottomColor: '#245B72', footwearColor: '#4A2B20', accentColor: '#D9C77A', garmentMode: 'painted' };
            case 'george-wrapper':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#6B2E63', bottomColor: '#7A3B73', footwearColor: '#4A2B20', accentColor: '#D9B65F', garmentMode: 'painted', skirtLength: 'ankle', skirtDesign: 'wrapper', blouseNeck: 'square', blouseSleeve: 'cap', blouseBody: 'fitted', blouseDesign: 'beaded' };
            case 'hybrid-skirt':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#7A4E9B', bottomColor: '#243B73', footwearColor: '#4A2B20', accentColor: '#D8B45A', garmentMode: 'hybrid', agbadaLength: 'knee', robeFit: 'senator', pinnedGarmentStyle: 'female-skirt', skirtLength: 'knee', skirtDesign: 'a-line', blouseNeck: 'v-neck', blouseSleeve: 'short', blouseBody: 'fitted', blouseDesign: 'plain' };
            case 'iro-buba-hybrid':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#B73E6B', bottomColor: '#6D315B', footwearColor: '#4A2B20', accentColor: '#F2C85B', garmentMode: 'hybrid', agbadaLength: 'long', robeFit: 'senator', pinnedGarmentStyle: 'female-buba', skirtLength: 'ankle', skirtDesign: 'wrapper', blouseNeck: 'round', blouseSleeve: 'elbow', blouseBody: 'loose', blouseDesign: 'embroidered' };
            case 'ankara-peplum-hybrid':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#C1493E', bottomColor: '#193F5A', footwearColor: '#4A2B20', accentColor: '#F5B942', garmentMode: 'hybrid', agbadaLength: 'short', robeFit: 'senator', pinnedGarmentStyle: 'female-peplum', skirtLength: 'knee', skirtDesign: 'flared', blouseNeck: 'sweetheart', blouseSleeve: 'puff', blouseBody: 'peplum', blouseDesign: 'ankara-print' };
            case 'bubu-gown-hybrid':
                return { topStyle: 'dress', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#245B72', bottomColor: '#245B72', footwearColor: '#4A2B20', accentColor: '#D9C77A', garmentMode: 'hybrid', agbadaLength: 'long', robeFit: 'full', pinnedGarmentStyle: 'female-bubu', skirtLength: 'floor', skirtDesign: 'flared' };
            case 'george-wrapper-hybrid':
                return { topStyle: 'blouse', bottomStyle: 'skirt', footwearStyle: 'heels', topColor: '#6B2E63', bottomColor: '#7A3B73', footwearColor: '#4A2B20', accentColor: '#D9B65F', garmentMode: 'hybrid', agbadaLength: 'long', robeFit: 'senator', pinnedGarmentStyle: 'female-george', skirtLength: 'ankle', skirtDesign: 'wrapper', blouseNeck: 'square', blouseSleeve: 'cap', blouseBody: 'fitted', blouseDesign: 'beaded' };
            case 'adire':
                return { topStyle: 'tunic', bottomStyle: 'pants', footwearStyle: 'shoes', topColor: '#285A86', bottomColor: '#193B5A', footwearColor: '#2B221C', accentColor: '#D6E8F2' };
            case 'kente':
                return { topStyle: 'tunic', bottomStyle: 'pants', footwearStyle: 'dress-shoes', topColor: '#C99218', bottomColor: '#2D2937', footwearColor: '#2B221C', accentColor: '#1B7A4B' };
            case 'modest':
                return { topStyle: 'tunic', bottomStyle: 'slacks', footwearStyle: 'shoes', topColor: '#5E6F7D', bottomColor: '#2F4858', footwearColor: '#2F271F', accentColor: '#D8C9A5' };
            default:
                return null;
        }
    },

    _normalizeUniversalCharacterConfig(opts = {}) {
        const viewInfo = this._ucNormalizeViewSelection(opts.view, opts.viewVariant, opts.bodyAngle || opts.viewAngle || opts.viewPerspective);
        const sideFacing = opts.sideFacing === 'left' ? 'left' : 'right';
        const derivedBW = this._ucBodyTypeToBuildWeight(opts.bodyType);
        const build = this._ucNormalizeBuild(opts.build != null ? opts.build : derivedBW.build);
        const weight = this._ucNormalizeWeight(opts.weight != null ? opts.weight : derivedBW.weight);
        const bodyAngle = this._ucNormalizeBodyAngle(opts.bodyAngle || opts.viewAngle || opts.viewPerspective, viewInfo.view);
        return {
            qualityPreset: ['clean', 'cartoon', 'soft', 'detailed', 'simple', 'human-like', 'refined'].includes(opts.qualityPreset) ? opts.qualityPreset : 'clean',
            characterEngine: this._ucNormalizeCharacterEngine(opts.characterEngine),
            gender: ['male', 'female', 'neutral'].includes(opts.gender) ? opts.gender : 'male',
            build,
            weight,
            muscle: this._ucClampNum(opts.muscle, 0, 100, this._ucDefaultMuscleForBuild(build)),
            partScale: this._ucNormalizePartScale(opts.partScale),
            bust: this._ucClampNum(opts.bust, 0, 100, 50),
            hip: this._ucClampNum(opts.hip, 0, 100, 50),
            shoulder: this._ucClampNum(opts.shoulder, 0, 100, 50),
            belly: this._ucClampNum(opts.belly, 0, 100, 50),
            bodyType: this._ucBuildWeightToBodyType(build, weight),
            ageGroup: ['neonate', 'child', 'adolescent', 'adult', 'elderly'].includes(opts.ageGroup) ? opts.ageGroup : 'adult',
            view: viewInfo.view,
            viewVariant: viewInfo.viewVariant,
            sideFacing,
            frontNoseScale: this._ucClampNum(opts.frontNoseScale, 60, 160, 100),
            frontMouthScale: this._ucClampNum(opts.frontMouthScale, 60, 160, 100),
            sideNoseScale: this._ucClampNum(opts.sideNoseScale, 60, 160, 100),
            sideMouthScale: this._ucClampNum(opts.sideMouthScale, 60, 160, 100),
            eyeScale: this._ucClampNum(opts.eyeScale, 60, 140, 100),
            eyeType: this._ucNormalizeEyeType(opts.eyeType),
            humanLikeStrength: this._ucClampNum(opts.humanLikeStrength, 0, 100, 60),
            jawScale: this._ucClampNum(opts.jawScale, 70, 140, 100),
            chinScale: this._ucClampNum(opts.chinScale, 70, 140, 100),
            cheekScale: this._ucClampNum(opts.cheekScale, 70, 140, 100),
            foreheadScale: this._ucClampNum(opts.foreheadScale, 70, 140, 100),
            lipScale: this._ucClampNum(opts.lipScale, 70, 150, 100),
            noseBridgeScale: this._ucClampNum(opts.noseBridgeScale, 70, 150, 100),
            handPose: this._ucNormalizeHandPose(opts.handPose),
            bodyAngle,
            front3qLean: (opts.front3qLean === 'left' || opts.front3qLean === 'right') ? opts.front3qLean : 'none',
            height: Math.max(300, Math.min(900, Number.isFinite(opts.height) ? opts.height : 700)),
            skinTone: opts.skinTone || '#D2A07A',
            hairColor: opts.hairColor || '#3B2314',
            eyeColor: opts.eyeColor || '#4B3424',
            scleraColor: (opts.scleraColor === 'auto' || /^#[0-9a-f]{6}$/i.test(String(opts.scleraColor || ''))) ? opts.scleraColor : 'auto',
            headNeckStyle: this._ucNormalizeHeadNeckStyle(opts.headNeckStyle),
            hairStyle: this._ucNormalizeHairStyle(this._ucIsHeadwearStyle(opts.hairStyle) ? null : opts.hairStyle, opts.gender),
            headwearStyle: this._ucNormalizeHeadwearStyle(
                Object.prototype.hasOwnProperty.call(opts, 'headwearStyle')
                    ? opts.headwearStyle
                    : (this._ucIsHeadwearStyle(opts.hairStyle) ? opts.hairStyle : 'none')
            ),
            facialHair: this._ucNormalizeFacialHair(opts.facialHair, opts.gender),
            outlineColor: opts.outlineColor || '#4A3728',
            outlineWidth: Number.isFinite(opts.outlineWidth) ? opts.outlineWidth : 1.5,
            clothing: this._normalizeUniversalCharacterClothing(opts.clothing || {})
        };
    },

    _ucNormalizeCharacterEngine(engine) {
        return String(engine || 'advanced').toLowerCase() === 'classic' ? 'classic' : 'advanced';
    },

    _ucNormalizeHandPose(pose) {
        const valid = ['relaxed', 'open', 'fist', 'pointing', 'holding', 'thumbs-up', 'thumbs-down'];
        const normalized = String(pose || 'relaxed').toLowerCase();
        return valid.includes(normalized) ? normalized : 'relaxed';
    },

    _ucNormalizeEyeType(type) {
        const valid = ['almond', 'round', 'narrow', 'wide', 'hooded'];
        return valid.includes(String(type || '').toLowerCase()) ? String(type).toLowerCase() : 'almond';
    },

    _ucGetEyeTypeProfile(type) {
        switch (this._ucNormalizeEyeType(type)) {
            case 'round':
                return { width: 0.96, height: 1.20, upper: 1.05, lower: 1.08, iris: 1.04, lidDrop: 0.00 };
            case 'narrow':
                return { width: 1.08, height: 0.68, upper: 0.72, lower: 0.70, iris: 0.84, lidDrop: 0.08 };
            case 'wide':
                return { width: 1.18, height: 1.10, upper: 1.05, lower: 1.00, iris: 1.06, lidDrop: 0.00 };
            case 'hooded':
                return { width: 1.06, height: 0.88, upper: 0.62, lower: 0.86, iris: 0.92, lidDrop: 0.22 };
            case 'almond':
            default:
                return { width: 1.00, height: 1.00, upper: 1.00, lower: 0.92, iris: 1.00, lidDrop: 0.00 };
        }
    },

    _ucNormalizeBodyType(bodyType) {
        const valid = ['petite', 'slim', 'normal', 'tall', 'athletic', 'muscular', 'curvy', 'stocky', 'plus-size', 'overweight'];
        const aliases = {
            average: 'normal',
            regular: 'normal',
            broad: 'stocky',
            full: 'plus-size',
            'full-figured': 'plus-size',
            plus: 'plus-size',
        };
        return Utils.normalizeWithAliases(bodyType, valid, aliases, 'normal');
    },

    _ucNormalizeViewSelection(view = 'front', viewVariant = null, _legacyBodyAngle = null) {
        const valid = ['front', 'front-3q', 'side', 'back-3q', 'back'];
        const aliases = {
            'frontside': 'front', 'front side': 'front', 'front-side': 'front',
            'front 3/4': 'front-3q', 'front three-quarter': 'front-3q', 'three-quarter-front': 'front-3q',
            'three quarter front': 'front-3q', '3/4-front': 'front-3q', '3/4 front': 'front-3q',
            'front-3/4': 'front-3q',
            'front-3q': 'front-3q', 'front 3q': 'front-3q',
            'front three quarter right': 'front-3q', 'front 3/4 right': 'front-3q',
            'three-quarter-front-right': 'front-3q', '3/4 front right': 'front-3q',
            'front three quarter left': 'front-3q', 'front 3/4 left': 'front-3q',
            'three-quarter-front-left': 'front-3q', '3/4 front left': 'front-3q',
            'backside': 'back', 'back side': 'back', 'back-side': 'back',
            'back 3/4': 'back-3q', 'back three-quarter': 'back-3q', 'three-quarter-back': 'back-3q',
            'three quarter back': 'back-3q', '3/4-back': 'back-3q', '3/4 back': 'back-3q',
            'back-3/4': 'back-3q', 'back-3q': 'back-3q', 'back 3q': 'back-3q',
            'back three quarter right': 'back-3q', 'back 3/4 right': 'back-3q',
            'three-quarter-back-right': 'back-3q', '3/4 back right': 'back-3q',
            'back three quarter left': 'back-3q', 'back 3/4 left': 'back-3q',
            'three-quarter-back-left': 'back-3q', '3/4 back left': 'back-3q'
        };
        const fromVariant = Utils.normalizeWithAliases(viewVariant, valid, aliases, null);
        const fromView = Utils.normalizeWithAliases(view, valid, aliases, 'front');
        const canonical = fromVariant || fromView;
        return { view: canonical, viewVariant: canonical };
    },

    _ucIsThreeQuarterView(view) {
        const normalized = String(view || '').toLowerCase();
        return normalized === 'front-3q' || normalized === 'back-3q';
    },

    _ucIsBackFamilyView(view) {
        const normalized = String(view || '').toLowerCase();
        return normalized === 'back' || normalized === 'back-3q';
    },

    _ucThreeQuarterSign(view, sideFacing = 'right') {
        if (!this._ucIsThreeQuarterView(view)) return 0;
        return sideFacing === 'left' ? -1 : 1;
    },

    _ucGetCanonicalPartOrder(view = 'front', sideFacing = 'right') {
        const normalizedView = String(view || 'front').toLowerCase();
        const facing = sideFacing === 'left' ? 'left' : 'right';
        if (normalizedView === 'side') {
            return ['back-leg', 'back-arm', 'torso', 'head', 'front-leg', 'front-arm'];
        }
        if (normalizedView === 'front-3q') {
            return facing === 'left'
                ? ['r-arm', 'r-leg', 'torso', 'head', 'l-leg', 'l-arm']
                : ['l-arm', 'l-leg', 'torso', 'head', 'r-leg', 'r-arm'];
        }
        if (normalizedView === 'back-3q') {
            return facing === 'left'
                ? ['l-arm', 'l-leg', 'torso', 'head', 'r-leg', 'r-arm']
                : ['r-arm', 'r-leg', 'torso', 'head', 'l-leg', 'l-arm'];
        }
        if (this._ucIsBackFamilyView?.(normalizedView)) {
            return ['r-leg', 'l-leg', 'torso', 'head', 'r-arm', 'l-arm'];
        }
        return ['r-leg', 'l-leg', 'torso', 'head', 'l-arm', 'r-arm'];
    },

    _ucOrderPartEntriesByCanonicalOrder(partEntries, view = 'front', sideFacing = 'right') {
        if (!Array.isArray(partEntries)) return partEntries;
        const order = this._ucGetCanonicalPartOrder(view, sideFacing);
        const rank = new Map(order.map((key, index) => [key, index]));
        return [...partEntries].sort((a, b) => {
            const aKey = Array.isArray(a) ? a[0] : a?.key;
            const bKey = Array.isArray(b) ? b[0] : b?.key;
            return (rank.has(aKey) ? rank.get(aKey) : 999)
                - (rank.has(bKey) ? rank.get(bKey) : 999);
        });
    },

    _ucGetCanonicalArmatureLayerOrder(view = 'front', sideFacing = 'right') {
        const roleMap = {
            torso: 'torso',
            head: 'head-neck',
            'r-arm': this._ucIsBackFamilyView?.(view) ? 'left-arm' : 'right-arm',
            'l-arm': this._ucIsBackFamilyView?.(view) ? 'right-arm' : 'left-arm',
            'r-leg': this._ucIsBackFamilyView?.(view) ? 'left-leg' : 'right-leg',
            'l-leg': this._ucIsBackFamilyView?.(view) ? 'right-leg' : 'left-leg',
            'front-arm': 'front-arm',
            'back-arm': 'back-arm',
            'front-leg': 'front-leg',
            'back-leg': 'back-leg'
        };
        return this._ucGetCanonicalPartOrder(view, sideFacing)
            .map(key => roleMap[key] || key)
            .filter(Boolean);
    },

    _ucClothingSupportsBreastVolume(clothing = {}) {
        const normalized = this._normalizeUniversalCharacterClothing(clothing);
        if (normalized.bottomStyle === 'skirt' && normalized.topStyle === 'none') return false;
        const fittedTopStyles = new Set([
            'blouse', 'tee', 'polo', 'long-sleeve', 'sweater', 'shirt', 'tunic',
            'scrub-top', 'dress', 'ankara-peplum', 'casual-shirt',
            'senator-wear', 'senator2', 'senator3'
        ]);
        const fittedPresets = new Set([
            'iro-buba', 'iro-buba-hybrid', 'ankara-peplum', 'ankara-peplum-hybrid',
            'george-wrapper', 'george-wrapper-hybrid', 'hybrid-skirt',
            'executive-tunic-suit', 'senator-shirt', 'senator-shirt-panel',
            'senator-shirt-stripe'
        ]);
        if (['agbada', 'agbada2', 'royal-agbada', 'royal-agbada-painted', 'chief', 'bubu-gown', 'bubu-gown-hybrid'].includes(normalized.outfitPreset)) {
            return false;
        }
        return fittedTopStyles.has(normalized.topStyle) || fittedPresets.has(normalized.outfitPreset);
    },

    _ucBuildDrawContextFromConfig(config = {}) {
        const normalized = this._normalizeUniversalCharacterConfig(config);
        return {
            skin: normalized.skinTone,
            hair: normalized.hairColor,
            qualityPreset: normalized.qualityPreset,
            eyeColor: normalized.eyeColor,
            scleraColor: normalized.scleraColor,
            outline: normalized.outlineColor,
            ow: normalized.outlineWidth,
            characterEngine: normalized.characterEngine,
            gender: normalized.gender,
            bodyType: normalized.bodyType,
            build: normalized.build,
            weight: normalized.weight,
            muscle: normalized.muscle,
            bust: normalized.bust,
            hip: normalized.hip,
            shoulder: normalized.shoulder,
            belly: normalized.belly,
            partScale: normalized.partScale,
            ageGroup: normalized.ageGroup,
            view: normalized.view,
            viewVariant: normalized.viewVariant,
            sideFacing: normalized.sideFacing,
            frontNoseScale: normalized.frontNoseScale,
            frontMouthScale: normalized.frontMouthScale,
            sideNoseScale: normalized.sideNoseScale,
            sideMouthScale: normalized.sideMouthScale,
            eyeScale: normalized.eyeScale,
            eyeType: normalized.eyeType,
            humanLikeStrength: normalized.humanLikeStrength,
            jawScale: normalized.jawScale,
            chinScale: normalized.chinScale,
            cheekScale: normalized.cheekScale,
            foreheadScale: normalized.foreheadScale,
            lipScale: normalized.lipScale,
            noseBridgeScale: normalized.noseBridgeScale,
            bodyAngle: normalized.bodyAngle,
            headNeckStyle: normalized.headNeckStyle,
            hairStyle: normalized.hairStyle,
            headwearStyle: normalized.headwearStyle,
            facialHair: normalized.facialHair,
            handPose: normalized.handPose,
            clothing: normalized.clothing
        };
    },

    _ucNormalizeBodyAngle(bodyAngle, view = 'front') {
        if (view === 'side') return 'straight';
        const valid = ['straight', 'tilt-left', 'tilt-right'];
        const aliases = {
            none: 'straight', center: 'straight', centred: 'straight', centered: 'straight',
            forward: 'straight', front: 'straight',
            left: 'tilt-left', 'left-tilt': 'tilt-left', 'tilted-left': 'tilt-left',
            'turn-left': 'tilt-left', 'turned-left': 'tilt-left', 'angle-left': 'tilt-left',
            'angled-left': 'tilt-left', 'three-quarter-left': 'tilt-left', 'three-quarter left': 'tilt-left',
            '3/4-left': 'tilt-left', '3/4 left': 'tilt-left',
            right: 'tilt-right', 'right-tilt': 'tilt-right', 'tilted-right': 'tilt-right',
            'turn-right': 'tilt-right', 'turned-right': 'tilt-right', 'angle-right': 'tilt-right',
            'angled-right': 'tilt-right', 'three-quarter-right': 'tilt-right', 'three-quarter right': 'tilt-right',
            '3/4-right': 'tilt-right', '3/4 right': 'tilt-right'
        };
        return Utils.normalizeWithAliases(bodyAngle, valid, aliases, 'straight');
    },

    _ucIsFullerBodyType(src) {
        if (src && typeof src === 'object') {
            if (src.weight != null) return ['soft', 'heavy', 'obese'].includes(this._ucNormalizeWeight(src.weight));
            return ['stocky', 'plus-size', 'overweight'].includes(this._ucNormalizeBodyType(src.bodyType));
        }
        return ['stocky', 'plus-size', 'overweight'].includes(this._ucNormalizeBodyType(src));
    },

    _ucIsMuscularBodyType(src) {
        if (src && typeof src === 'object') {
            if (Number.isFinite(src.muscle)) return src.muscle >= 45;
            if (src.build != null) return ['athletic', 'muscular'].includes(this._ucNormalizeBuild(src.build));
            return ['athletic', 'muscular'].includes(this._ucNormalizeBodyType(src.bodyType));
        }
        return ['athletic', 'muscular'].includes(this._ucNormalizeBodyType(src));
    },

    _ucResolveCharacterEngine(source = null) {
        return this._ucNormalizeCharacterEngine(source?.characterEngine || source?._ucCharacterEngine || null);
    },

    _saveUniversalCharacterStyleTemplate(name = '', config = {}) {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return null;
        const templates = this._loadUniversalCharacterStyleTemplates();
        const template = {
            id: Utils.generateId('ucstyle'),
            name: trimmedName,
            createdAt: Date.now(),
            config: this._normalizeUniversalCharacterConfig(config)
        };
        templates.unshift(template);
        this._saveUniversalCharacterStyleTemplates(templates);
        return template;
    },

    _buildUniversalCharacterVariantSpecs(config = {}, linkedViews = null) {
        const normalized = this._normalizeUniversalCharacterConfig(config);
        const variants = [];
        const seen = new Set();
        const addVariant = (view, sideFacing = 'right', viewVariant = null) => {
            const normalizedFacing = sideFacing === 'left' ? 'left' : 'right';
            const viewInfo = this._ucNormalizeViewSelection(view, viewVariant);
            const normalizedView = viewInfo.view;
            const normalizedVariant = viewInfo.viewVariant;
            const key = normalizedView === 'side' || this._ucIsThreeQuarterView(normalizedView)
                ? `${normalizedVariant}:${normalizedFacing}`
                : normalizedVariant;
            if (seen.has(key)) return;
            seen.add(key);
            variants.push({ view: normalizedView, viewVariant: normalizedVariant, sideFacing: normalizedFacing, variantKey: key });
        };

        if (Array.isArray(linkedViews) && linkedViews.length) {
            linkedViews.forEach(entry => {
                if (!entry) return;
                if (typeof entry === 'string') {
                    if (entry === 'side-left') addVariant('side', 'left');
                    else if (entry === 'side-right') addVariant('side', 'right');
                    else if (entry === 'front-3q-left') addVariant('front-3q', 'left');
                    else if (entry === 'front-3q-right') addVariant('front-3q', 'right');
                    else if (entry === 'back-3q-left') addVariant('back-3q', 'left');
                    else if (entry === 'back-3q-right') addVariant('back-3q', 'right');
                    else addVariant(entry, normalized.sideFacing);
                    return;
                }
                addVariant(entry.view, entry.sideFacing || normalized.sideFacing, entry.viewVariant);
            });
        }

        if (!variants.length) addVariant(normalized.view, normalized.sideFacing, normalized.viewVariant);
        return variants;
    },

    createUniversalCharacterViewSet(opts = {}) {
        const normalized = this._normalizeUniversalCharacterConfig(opts);
        const variants = this._buildUniversalCharacterVariantSpecs(normalized, opts.linkedViews);
        if (!variants.length) return null;

        const sharedInternal = opts?._ucInternal || {};
        const familyId = Utils.generateId('ucfamily');
        const gap = Math.round(normalized.height * 0.42);
        const stageWidth = Number.isFinite(this.stage?.width) ? this.stage.width : 1920;
        const defaultPlacement = this._getUniversalCharacterDefaultPlacement();
        const startX = Number.isFinite(opts.stageX)
            ? opts.stageX
            : ((Number.isFinite(defaultPlacement?.stageX) ? defaultPlacement.stageX : (stageWidth / 2)) - ((variants.length - 1) * gap) / 2);
        const stageY = Number.isFinite(opts.stageY) ? opts.stageY : undefined;
        let lastArmature = null;

        variants.forEach((variant, index) => {
            lastArmature = this.createUniversalCharacter({
                ...normalized,
                view: variant.view,
                viewVariant: variant.viewVariant,
                sideFacing: variant.sideFacing,
                stageX: startX + (index * gap),
                ...(Number.isFinite(stageY) ? { stageY } : {}),
                _ucInternal: {
                    openPanel: index === variants.length - 1,
                    pushHistory: false,
                    toast: false,
                    familyId,
                    variantKey: variant.variantKey,
                    styleConfig: normalized,
                    linkedViews: variants,
                    compactArmaturePanel: sharedInternal.compactArmaturePanel === true
                }
            }) || lastArmature;
        });

        if (lastArmature) {
            eventBus.emit('history:push');
            Utils.showToast(`Created linked Universal Character set (${variants.length} view${variants.length === 1 ? '' : 's'})`, 'success');
        }
        return lastArmature;
    },

    _normalizeUniversalCharacterFamilyState(state = null) {
        const type = ['idle', 'pose', 'movement'].includes(String(state?.type || '').toLowerCase())
            ? String(state.type).toLowerCase()
            : 'idle';
        const key = type === 'idle' ? null : (String(state?.key || '').trim() || null);
        const semanticAction = type === 'idle'
            ? null
            : (String(state?.semanticAction || state?.logicalAction || '').trim() || null);
        const semanticVariant = type === 'idle'
            ? null
            : (String(state?.semanticVariant || state?.variant || '').trim() || null);
        return { type, key, semanticAction, semanticVariant };
    },

    _inferUniversalCharacterFamilySemanticVariant(type = 'movement', key = '', entry = null) {
        const explicit = String(entry?.semanticVariant || entry?.variant || '').trim();
        if (explicit) return explicit;
        const semanticAction = String(entry?.semanticAction || entry?.logicalAction || '').trim();
        const text = `${key || ''} ${entry?.key || ''} ${entry?.name || ''} ${entry?.description || ''}`
            .toLowerCase()
            .replace(/3\/4/g, '3q');
        const parts = [];
        const add = value => {
            if (value && !parts.includes(value)) parts.push(value);
        };

        if (semanticAction === JointSystem.ARMATURE_SEMANTIC_ACTIONS?.PICK_UP_DROP) {
            if (/\bcenter\b/.test(text)) add('center');
            else if (/\bleft\b/.test(text)) add('left');
            else if (/\bright\b/.test(text)) add('right');
        }
        if (/(?:to[- ]point.*(?:and|&) back|point[- ]and[- ]back|turnaround|round[- ]trip|return walk)/.test(text)) {
            add('round-trip');
        } else if (/(?:\bforward\b|\btravel\b)/.test(text)) {
            add('forward');
        } else if (type === 'movement' && /(?:\bcycle\b|\bloop\b|in[- ]place)/.test(text)) {
            add('in-place');
        }
        if (/(?:\bstrong\b|\bpower\b)/.test(text)) add('strong');
        if (/\bfast\b/.test(text)) add('fast');
        if (/\balternate\b/.test(text)) add('alternate');
        if (/(?:pre[- ]contact|pre[- ]ear|pre[- ]mouth|\bprepare\b|\bprep\b)/.test(text)) add('pre-contact');
        if (/(?:carry[- ]load|carry load)/.test(text)) add('carry-load');
        if (/\blimp\b/.test(text)) add('limp');
        if (semanticAction === JointSystem.ARMATURE_SEMANTIC_ACTIONS?.FLIP) add('turn-around');
        return parts.join('+') || 'base';
    },

    _buildUniversalCharacterFamilyCatalogState(type, key, entry = null) {
        return this._normalizeUniversalCharacterFamilyState({
            type,
            key,
            semanticAction: entry?.semanticAction || entry?.logicalAction || null,
            semanticVariant: this._inferUniversalCharacterFamilySemanticVariant(type, key, entry)
        });
    },

    _resolveUniversalCharacterFamilyCatalogKey(catalog = {}, state = null) {
        const normalized = this._normalizeUniversalCharacterFamilyState(state);
        if (normalized.key && catalog?.[normalized.key]) return normalized.key;
        if (!normalized.semanticAction) return null;
        const candidates = Object.entries(catalog || {})
            .filter(([, entry]) => String(entry?.semanticAction || entry?.logicalAction || '').trim() === normalized.semanticAction)
            .map(([key, entry]) => {
                const variant = this._inferUniversalCharacterFamilySemanticVariant(normalized.type, key, entry);
                let score = 0;
                if (normalized.semanticVariant && variant === normalized.semanticVariant) score += 100;
                if (normalized.semanticVariant && variant !== normalized.semanticVariant) score -= 25;
                if (!normalized.semanticVariant && variant === 'base') score += 25;
                if (normalized.key && key === normalized.key) score += 1000;
                return { key, score };
            })
            .sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key));
        return candidates[0]?.key || null;
    },

    _getUniversalCharacterFamilyId(armature) {
        const familyId = String(armature?.root?._ucCharacterFamilyId || '').trim();
        return familyId || null;
    },

    _getUniversalCharacterVariantKey(armature) {
        return String(armature?.root?._ucCharacterVariantKey || '').toLowerCase() || null;
    },

    _isUniversalCharacterArmature(armature) {
        const root = armature?.root;
        if (!root) return false;
        if (root._svgCharacter
            || root._svgCharacterPremiumAssetId
            || root._svgAfricanPremiumAssetId
            || root._characterAppearanceProvider === 'svg-african-premium') {
            return false;
        }
        if (root._ucCharacterStyleConfig || root._ucCharacterFamilyId || root._ucCharacterVariantKey) {
            return true;
        }

        const parts = Object.values(armature.parts || {})
            .map(part => part?.obj)
            .filter(Boolean);
        const hasUniversalArtwork = [root, ...parts].some(obj => (
            obj?._webglMaterialHint?.category === 'universal-character'
            || !!obj?._ucQualityPreset
        ));
        const hasUniversalFace = parts.some(obj => (
            obj?._facialFeatures
            && obj?._facialProportions
            && !obj?._svgCharacterPart
            && !obj?._svgCharacterPremiumPartKey
        ));
        return hasUniversalArtwork || hasUniversalFace;
    },

    _getUniversalCharacterStyleConfig(armature) {
        const rawConfig = armature?.root?._ucCharacterStyleConfig;
        if (!rawConfig || typeof rawConfig !== 'object') return null;
        try {
            return this._normalizeUniversalCharacterConfig(JSON.parse(JSON.stringify(rawConfig)));
        } catch {
            return this._normalizeUniversalCharacterConfig(rawConfig);
        }
    },

    _ucHasValidFacialDrawContext(drawCtx) {
        if (!drawCtx || typeof drawCtx !== 'object') return false;
        const validViews = new Set(['front', 'back', 'side', 'front-3q', 'back-3q']);
        return validViews.has(String(drawCtx.view || '').toLowerCase())
            && typeof drawCtx.skin === 'string'
            && drawCtx.skin.length > 0
            && typeof drawCtx.hair === 'string'
            && drawCtx.hair.length > 0
            && typeof drawCtx.outline === 'string'
            && drawCtx.outline.length > 0
            && Number.isFinite(Number(drawCtx.ow));
    },

    _ucRepairFacialDrawContext(armature, headObj = null) {
        const liveArmature = armature?.root
            ? (this._refreshDetectedArmatureReference?.(armature) || armature)
            : armature;
        const head = headObj || this._getArmatureHeadObject?.(liveArmature) || null;
        if (!head || !this._isUniversalCharacterArmature(liveArmature)) return null;
        if (this._ucHasValidFacialDrawContext(head._facialDrawCtx)) return head._facialDrawCtx;

        const storedStyle = liveArmature.root?._ucCharacterStyleConfig;
        const existing = head._facialDrawCtx && typeof head._facialDrawCtx === 'object'
            ? head._facialDrawCtx
            : {};
        const fallbackFacing = String(
            liveArmature.root?._armatureFacingSide
            || storedStyle?.sideFacing
            || 'right'
        ).toLowerCase() === 'left' ? 'left' : 'right';
        const variantKey = this._getUniversalCharacterVariantKey(liveArmature);
        const variant = variantKey
            ? this._getUniversalCharacterVariantSpecFromKey(variantKey, fallbackFacing)
            : {
                view: head._facialProportions?.isSide ? 'side' : (storedStyle?.view || 'front'),
                viewVariant: head._facialProportions?.isSide ? 'side' : (storedStyle?.viewVariant || storedStyle?.view || 'front'),
                sideFacing: fallbackFacing
            };
        const repairConfig = {
            ...(storedStyle && typeof storedStyle === 'object' ? storedStyle : {}),
            view: variant.view,
            viewVariant: variant.viewVariant,
            sideFacing: variant.sideFacing,
            skinTone: storedStyle?.skinTone || existing.skin,
            hairColor: storedStyle?.hairColor || existing.hair,
            eyeColor: storedStyle?.eyeColor || existing.eyeColor,
            scleraColor: storedStyle?.scleraColor || existing.scleraColor,
            outlineColor: storedStyle?.outlineColor || existing.outline,
            outlineWidth: Number.isFinite(Number(storedStyle?.outlineWidth))
                ? Number(storedStyle.outlineWidth)
                : (Number.isFinite(Number(existing.ow)) ? Number(existing.ow) : undefined)
        };
        const repaired = this._ucBuildDrawContextFromConfig(repairConfig);
        head._facialDrawCtx = repaired;
        if (head._facialProportions && typeof head._facialProportions === 'object') {
            head._facialProportions.isSide = repaired.view === 'side';
        }
        return repaired;
    },

    _getUniversalCharacterPlacement(armature) {
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        const torso = liveArmature?.parts?.torso?.obj || liveArmature?.root || null;
        const armatureObjects = this._getArmatureObjects(liveArmature).filter(Boolean);
        const stageX = torso ? (Number(torso.x) || 0) + ((Number(torso.width) || 0) / 2) : 0;
        const stageY = armatureObjects.length
            ? Math.min(...armatureObjects.map(obj => Number(obj?.y) || 0)) 
            : (Number(torso?.y) || 0);
        return { stageX, stageY };
    },
    
    _getUniversalCharacterDefaultPlacement() {
        const normalizePlacement = (placement) => {
            if (!placement) return null;
            const stageX = Number(placement.stageX);
            const stageY = Number(placement.stageY);
            if (!Number.isFinite(stageX) || !Number.isFinite(stageY)) return null;
            return { stageX, stageY };
        };

        const rememberPlacement = (placement) => {
            const normalized = normalizePlacement(placement);
            if (!normalized) return null;
            this._ucDefaultPlacement = { ...normalized };
            return this._ucDefaultPlacement;
        };

        const selectedArmature = typeof this._detectSelectedArmature === 'function'
            ? this._detectSelectedArmature()
            : null;
        if (this._isUniversalCharacterArmature(selectedArmature)) {
            return rememberPlacement(this._getUniversalCharacterPlacement(selectedArmature));
        }

        const currentArmature = this._currentArmature?.root?.id
            ? (this._refreshDetectedArmatureReference(this._currentArmature) || this._currentArmature)
            : null;
        if (this._isUniversalCharacterArmature(currentArmature)) {
            return rememberPlacement(this._getUniversalCharacterPlacement(currentArmature));
        }

        const cachedPlacement = normalizePlacement(this._ucDefaultPlacement);
        if (cachedPlacement) {
            return cachedPlacement;
        }

        const stageWidth = Number.isFinite(this.stage?.width) ? this.stage.width : 1920;
        const stageHeight = Number.isFinite(this.stage?.height) ? this.stage.height : 1080;
        return rememberPlacement({
            stageX: Math.round(stageWidth * (955 / 1920)),
            stageY: Math.round(stageHeight * (243 / 1080))
        });
    },

    _removeObjectsWithoutHistory(ids = []) {
        if (!this.objects || !Array.isArray(ids) || !ids.length) return;
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        const previousSuppressHistory = this.objects._suppressHistory;
        this.objects._suppressHistory = true;
        try {
            uniqueIds.forEach(id => this.objects.removeObject(id));
        } finally {
            this.objects._suppressHistory = previousSuppressHistory;
        }
    },

    openUniversalCharacterEditor(armature) {
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        if (!this._isUniversalCharacterArmature(liveArmature)) {
            Utils.showToast('No Universal Character found for this selection', 'warning');
            return null;
        }

        const styleConfig = this._getUniversalCharacterStyleConfig(liveArmature);
        if (!styleConfig) {
            Utils.showToast('This Universal Character has no stored style data', 'warning');
            return null;
        }

        this.openUniversalCharacterDialog(styleConfig, {
            editArmature: liveArmature,
            compactArmaturePanel: true
        });
        return liveArmature;
    },

    _editUniversalCharacterArmature(armature, config, options = {}) {
        let liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        if (!this._isUniversalCharacterArmature(liveArmature)) return null;

        const normalized = this._normalizeUniversalCharacterConfig(config);
        const isLinkedFamily = this._isUniversalCharacterLinkedFamily(liveArmature);
        const linkedViews = isLinkedFamily ? this._getUniversalCharacterLinkedViewSpecs(liveArmature) : null;
        const familyId = isLinkedFamily
            ? (this._getUniversalCharacterFamilyId(liveArmature) || Utils.generateId('ucfamily'))
            : null;
        const state = this._getUniversalCharacterCurrentSyncableState(liveArmature);
        const editedVariantKey = this._getUniversalCharacterVariantKey(liveArmature)
            || this._getUniversalCharacterVariantKeyFromConfig(normalized);
        const members = isLinkedFamily
            ? this._getUniversalCharacterFamilyMemberArmatures(liveArmature)
            : [liveArmature];
        const placements = members.map(member => {
            const refreshedMember = this._refreshDetectedArmatureReference(member) || member;
            return {
                armature: refreshedMember,
                variantKey: this._getUniversalCharacterVariantKey(refreshedMember)
                    || this._getUniversalCharacterVariantKeyFromConfig(normalized),
                ...this._getUniversalCharacterPlacement(refreshedMember)
            };
        });

        this._removeObjectsWithoutHistory(
            placements.flatMap(entry => {
                const armatureIds = this._getArmatureObjects(entry.armature).map(obj => obj?.id).filter(Boolean);
                const facialIds = this._getArmatureFacialObjects(entry.armature).map(obj => obj?.id).filter(Boolean);
                const garmentIds = this._getUniversalCharacterGarmentObjects(entry.armature).map(obj => obj?.id).filter(Boolean);
                const helperIds = this._getUniversalCharacterBackViewHelperObjects(entry.armature).map(obj => obj?.id).filter(Boolean);
                return [...armatureIds, ...facialIds, ...garmentIds, ...helperIds];
            })
        );

        let recreatedArmature = null;
        if (linkedViews?.length) {
            placements.forEach(entry => {
                const variant = linkedViews.find(item => item.variantKey === entry.variantKey)
                    || this._getUniversalCharacterVariantSpecFromKey(entry.variantKey, normalized.sideFacing);
                const recreated = this.createUniversalCharacter({
                    ...normalized,
                    view: variant.view,
                    viewVariant: variant.viewVariant,
                    sideFacing: variant.sideFacing,
                    stageX: entry.stageX,
                    stageY: entry.stageY,
                    _ucInternal: {
                        openPanel: false,
                        pushHistory: false,
                        toast: false,
                        select: false,
                        familyId,
                        variantKey: variant.variantKey,
                        styleConfig: normalized,
                        linkedViews,
                        compactArmaturePanel: options.compactArmaturePanel === true
                    }
                });
                if (!recreatedArmature || variant.variantKey === editedVariantKey) {
                    recreatedArmature = recreated;
                }
            });
        } else {
            recreatedArmature = this.createUniversalCharacter({
                ...normalized,
                stageX: placements[0]?.stageX,
                stageY: placements[0]?.stageY,
                _ucInternal: {
                    openPanel: false,
                    pushHistory: false,
                    toast: false,
                    select: false,
                    styleConfig: normalized,
                    compactArmaturePanel: options.compactArmaturePanel === true
                }
            });
        }

        liveArmature = this._refreshDetectedArmatureReference(recreatedArmature) || recreatedArmature;
        if (!liveArmature) return null;

        if (linkedViews?.length) {
            this._storeUniversalCharacterFamilyState(liveArmature, state);
            this._getUniversalCharacterFamilyMemberArmatures(liveArmature).forEach(member => {
                this._applyUniversalCharacterFamilyStateToArmature(member, state, { force: true });
            });
        } else {
            this._applyUniversalCharacterFamilyStateToArmature(liveArmature, state, { force: true });
        }

        this._currentArmature = liveArmature;
        this.objects.select(this._getArmatureObjects(liveArmature).map(obj => obj.id));
        this.openArmaturePanel(liveArmature, {
            compactMode: options.compactArmaturePanel === true
        });
        eventBus.emit('history:push');
        Utils.showToast(linkedViews?.length ? 'Universal Character set updated' : 'Universal Character updated', 'success');
        return liveArmature;
    },

    _isUniversalCharacterLinkedFamily(armature) {
        const familyId = this._getUniversalCharacterFamilyId(armature);
        const linkedViews = Array.isArray(armature?.root?._ucCharacterLinkedViews)
            ? armature.root._ucCharacterLinkedViews
            : [];
        return !!familyId && linkedViews.length > 1;
    },

    _getUniversalCharacterLinkedViewSpecs(armature) {
        const linkedViews = Array.isArray(armature?.root?._ucCharacterLinkedViews)
            ? armature.root._ucCharacterLinkedViews
            : [];
        return linkedViews
            .map(entry => {
                const sideFacing = entry?.sideFacing === 'left' ? 'left' : 'right';
                const viewInfo = this._ucNormalizeViewSelection(entry?.view, entry?.viewVariant);
                return {
                    view: viewInfo.view,
                    viewVariant: viewInfo.viewVariant,
                    sideFacing,
                    variantKey: String(entry?.variantKey || this._getUniversalCharacterVariantKeyFromConfig({
                        view: viewInfo.view,
                        viewVariant: viewInfo.viewVariant,
                        sideFacing
                    })).toLowerCase()
                };
            })
            .filter(entry => !!entry.variantKey);
    },

    _getUniversalCharacterVariantKeyFromConfig(config = {}) {
        const normalized = this._normalizeUniversalCharacterConfig(config);
        if (normalized.view === 'side' || this._ucIsThreeQuarterView(normalized.view)) {
            return `${normalized.viewVariant}:${normalized.sideFacing}`;
        }
        return normalized.viewVariant || normalized.view || 'front';
    },

    _getUniversalCharacterVariantSpecFromKey(variantKey, fallbackSideFacing = 'right') {
        const key = String(variantKey || '').toLowerCase();
        const [rawVariant, rawFacing] = key.split(':');
        const sideFacing = rawFacing === 'left'
            ? 'left'
            : (rawFacing === 'right' ? 'right' : (fallbackSideFacing === 'left' ? 'left' : 'right'));
        const viewInfo = this._ucNormalizeViewSelection(rawVariant || 'front');
        return {
            view: viewInfo.view,
            viewVariant: viewInfo.viewVariant,
            sideFacing,
            variantKey: key || this._getUniversalCharacterVariantKeyFromConfig({
                view: viewInfo.view,
                viewVariant: viewInfo.viewVariant,
                sideFacing
            })
        };
    },

    _getUniversalCharacterVariantLabel(variantKey) {
        switch (String(variantKey || '').toLowerCase()) {
            case 'front': return 'Front';
            case 'front-3q:left': return 'Front 3/4 Left';
            case 'front-3q:right': return 'Front 3/4 Right';
            case 'back': return 'Back';
            case 'back-3q:left': return 'Back 3/4 Left';
            case 'back-3q:right': return 'Back 3/4 Right';
            case 'side:left': return 'Side Left';
            case 'side:right': return 'Side Right';
            default: return String(variantKey || '').replace(/[:_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'View';
        }
    },

    _getUniversalCharacterFamilyMemberArmatures(armature) {
        const familyId = this._getUniversalCharacterFamilyId(armature);
        if (!familyId) return armature?.root ? [armature] : [];

        const pool = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
        const torsoRoots = pool.filter(obj => {
            const sameFamily = String(obj?._ucCharacterFamilyId || '') === familyId;
            const roleKey = String(obj?._armatureRoleKey || obj?._armaturePartKey || '').toLowerCase();
            return sameFamily && roleKey === 'torso';
        });

        const members = [];
        const seen = new Set();
        torsoRoots.forEach(root => {
            const familyPool = pool.filter(obj => obj && (obj.id === root.id || obj.pinnedTo === root.id));
            const detected = this._detectArmatureFromPool(familyPool);
            if (!detected?.root?.id || seen.has(detected.root.id)) return;
            seen.add(detected.root.id);
            members.push(detected);
        });

        if (!members.length && armature?.root?.id) {
            members.push(armature);
        }

        const order = this._getUniversalCharacterLinkedViewSpecs(armature);
        const orderIndex = new Map(order.map((entry, index) => [entry.variantKey, index]));
        members.sort((a, b) => {
            const ai = orderIndex.get(this._getUniversalCharacterVariantKey(a));
            const bi = orderIndex.get(this._getUniversalCharacterVariantKey(b));
            if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
            if (Number.isFinite(ai)) return -1;
            if (Number.isFinite(bi)) return 1;
            return String(a?.root?.id || '').localeCompare(String(b?.root?.id || ''));
        });
        return members;
    },

    _findUniversalCharacterFamilyVariantArmature(armature, variantKey) {
        const targetKey = String(variantKey || '').toLowerCase();
        return this._getUniversalCharacterFamilyMemberArmatures(armature)
            .find(member => this._getUniversalCharacterVariantKey(member) === targetKey) || null;
    },

    _getUniversalCharacterStoredFamilyState(armature) {
        const members = this._getUniversalCharacterFamilyMemberArmatures(armature);
        for (const member of members) {
            if (!member?.root) continue;
            if (member.root._ucCharacterFamilyState) {
                return this._normalizeUniversalCharacterFamilyState(member.root._ucCharacterFamilyState);
            }
            const playingKey = this._getArmaturePlayingKey(member);
            if (playingKey) {
                const catalog = this._getActiveArmatureMovementCatalog(member) || {};
                return this._buildUniversalCharacterFamilyCatalogState('movement', playingKey, catalog[playingKey]);
            }
            const poseKey = String(member.root._ucCharacterActivePoseKey || '').trim();
            if (poseKey) {
                const catalog = this._getActiveArmaturePoseCatalog(member) || {};
                return this._buildUniversalCharacterFamilyCatalogState('pose', poseKey, catalog[poseKey]);
            }
        }
        return { type: 'idle', key: null };
    },

    _getUniversalCharacterCurrentSyncableState(armature) {
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        if (!liveArmature?.root) return { type: 'idle', key: null };

        const movementKey = this._getArmaturePlayingKey(liveArmature);
        if (movementKey) {
            const movementCatalog = this._getActiveArmatureMovementCatalog(liveArmature) || {};
            if (movementCatalog[movementKey]) {
                return this._buildUniversalCharacterFamilyCatalogState('movement', movementKey, movementCatalog[movementKey]);
            }
        }

        const poseKey = String(liveArmature.root._ucCharacterActivePoseKey || '').trim();
        if (poseKey) {
            const poseCatalog = this._getActiveArmaturePoseCatalog(liveArmature) || {};
            if (poseCatalog[poseKey]) {
                return this._buildUniversalCharacterFamilyCatalogState('pose', poseKey, poseCatalog[poseKey]);
            }
        }

        return this._normalizeUniversalCharacterFamilyState(liveArmature.root._ucCharacterFamilyState || { type: 'idle', key: null });
    },

    _storeUniversalCharacterFamilyState(armature, state) {
        let normalized = this._normalizeUniversalCharacterFamilyState(state);
        if (normalized.key && !normalized.semanticAction) {
            const catalog = normalized.type === 'movement'
                ? (this._getActiveArmatureMovementCatalog(armature) || {})
                : (normalized.type === 'pose' ? (this._getActiveArmaturePoseCatalog(armature) || {}) : {});
            normalized = this._buildUniversalCharacterFamilyCatalogState(
                normalized.type,
                normalized.key,
                catalog[normalized.key]
            );
        }
        this._getUniversalCharacterFamilyMemberArmatures(armature).forEach(member => {
            if (!member?.root) return;
            member.root._ucCharacterFamilyState = { ...normalized };
            member.root._ucCharacterActivePoseKey = normalized.type === 'pose' ? normalized.key : null;
        });
        return normalized;
    },

    _applyUniversalCharacterFamilyStateToArmature(armature, state, options = {}) {
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        if (!liveArmature?.root) return false;

        const normalized = this._normalizeUniversalCharacterFamilyState(state);
        const currentState = this._normalizeUniversalCharacterFamilyState(liveArmature.root._ucCharacterFamilyState || {
            type: this._getArmaturePlayingKey(liveArmature)
                ? 'movement'
                : (liveArmature.root._ucCharacterActivePoseKey ? 'pose' : 'idle'),
            key: this._getArmaturePlayingKey(liveArmature) || liveArmature.root._ucCharacterActivePoseKey || null
        });

        if (!options.force && currentState.type === normalized.type && currentState.key === normalized.key) {
            if (normalized.type !== 'movement' || liveArmature.root._poseArmatureAnim) {
                liveArmature.root._ucCharacterFamilyState = { ...normalized };
                return false;
            }
        }

        const poseCatalog = this._getActiveArmaturePoseCatalog(liveArmature) || {};
        const movementCatalog = this._getActiveArmatureMovementCatalog(liveArmature) || {};
        const resolvedMovementKey = normalized.type === 'movement'
            ? this._resolveUniversalCharacterFamilyCatalogKey(movementCatalog, normalized)
            : null;
        const resolvedPoseKey = normalized.type === 'pose'
            ? this._resolveUniversalCharacterFamilyCatalogKey(poseCatalog, normalized)
            : null;
        liveArmature.root._ucCharacterFamilyState = { ...normalized };

        if (normalized.type === 'movement' && resolvedMovementKey) {
            this._stopArmatureMovement(liveArmature);
            this._captureArmatureStageBasePosition(liveArmature);
            this._applyArmaturePose(liveArmature, poseCatalog.idle || { jointAngles: {} });
            liveArmature.root._ucCharacterActivePoseKey = null;
            liveArmature.root._ucCharacterFamilyResolvedKey = resolvedMovementKey;
            this._playArmatureMovement(liveArmature, resolvedMovementKey);
            return true;
        }

        this._stopArmatureMovement(liveArmature);
        if (normalized.type === 'pose' && resolvedPoseKey) {
            this._captureArmatureStageBasePosition(liveArmature);
            this._applyArmaturePose(liveArmature, poseCatalog[resolvedPoseKey]);
            liveArmature.root._ucCharacterActivePoseKey = resolvedPoseKey;
            liveArmature.root._ucCharacterFamilyResolvedKey = resolvedPoseKey;
            return true;
        }

        liveArmature.root._ucCharacterActivePoseKey = null;
        liveArmature.root._ucCharacterFamilyResolvedKey = null;
        this._captureArmatureStageBasePosition(liveArmature);
        this._resetArmatureToActiveCatalogIdle(liveArmature);
        return true;
    },

    _syncUniversalCharacterFamilyState(armature, state, options = {}) {
        if (!this._isUniversalCharacterLinkedFamily(armature)) return false;
        const normalized = this._storeUniversalCharacterFamilyState(armature, state);
        const sourceId = armature?.root?.id || null;
        let changed = false;
        this._getUniversalCharacterFamilyMemberArmatures(armature).forEach(member => {
            if (!member?.root?.id) return;
            if (options.skipSource === true && sourceId && member.root.id === sourceId) return;
            if (this._applyUniversalCharacterFamilyStateToArmature(member, normalized, {
                force: options.force === true
            })) {
                changed = true;
            }
        });
        return changed;
    },

    _detachUniversalCharacterFamilyVariant(armature) {
        const familyId = this._getUniversalCharacterFamilyId(armature);
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        if (!familyId || !liveArmature?.root) return false;

        const members = this._getUniversalCharacterFamilyMemberArmatures(liveArmature);
        const detachedId = liveArmature.root.id;
        const remainingMembers = members.filter(member => member?.root?.id && member.root.id !== detachedId);
        const remainingSpecs = this._getUniversalCharacterLinkedViewSpecs(liveArmature)
            .filter(entry => entry.variantKey !== this._getUniversalCharacterVariantKey(liveArmature));
        const currentState = this._getUniversalCharacterCurrentSyncableState(liveArmature);

        liveArmature.root._ucCharacterFamilyId = null;
        liveArmature.root._ucCharacterLinkedViews = [];
        liveArmature.root._ucCharacterFamilyState = { ...currentState };

        if (remainingMembers.length > 1) {
            remainingMembers.forEach(member => {
                member.root._ucCharacterFamilyId = familyId;
                member.root._ucCharacterLinkedViews = JSON.parse(JSON.stringify(remainingSpecs));
                member.root._ucCharacterFamilyState = { ...currentState };
            });
        } else {
            remainingMembers.forEach(member => {
                member.root._ucCharacterFamilyId = null;
                member.root._ucCharacterLinkedViews = [];
                member.root._ucCharacterFamilyState = { ...currentState };
            });
        }

        if (this._currentArmature?.root?.id === liveArmature.root.id) {
            this._currentArmature = liveArmature;
        }

        this.objects.updateObjectList?.();
        this.objects.updateProperties?.();
        this.stage.requestRender();
        eventBus.emit('history:push');
        return true;
    },

    _ucGetClothing(d) {
        return this._normalizeUniversalCharacterClothing(d?.clothing || {});
    },

    _ucUsePinnedGarments(d) {
        if (d?._forcePaintedGarment === true) return false;
        const clothing = this._ucGetClothing(d);
        if (clothing.bottomStyle === 'skirt' || this._ucIsWaistSkirtGarment?.(clothing)) return true;
        if (clothing.garmentMode === 'painted') return false;
        if (this._ucUseIntegratedGarmentParts?.(d)) return false;
        if (clothing.garmentMode === 'pinned' || clothing.garmentMode === 'hybrid') return true;
        return clothing.topStyle === 'agbada'
            || clothing.outfitPreset === 'agbada'
            || clothing.outfitPreset === 'agbada2'
            || clothing.outfitPreset === 'agbada3'
            || clothing.outfitPreset === 'royal-agbada'
            || clothing.outfitPreset === 'senator'
            || clothing.outfitPreset === 'senator2'
            || clothing.outfitPreset === 'senator3'
            || clothing.outfitPreset === 'senator-shirt'
            || clothing.outfitPreset === 'senator-shirt-panel'
            || clothing.outfitPreset === 'senator-shirt-stripe'
            || clothing.outfitPreset === 'executive-tunic-suit'
            || clothing.outfitPreset === 'chief';
    },

    _ucUseIntegratedGarmentParts(d = {}) {
        if (d?._integratedGarmentParts === true) return true;
        if (d?._forcePinnedSideGarment === true || d?._forcePaintedGarment === true) return false;
        const view = String(d?.view || '').toLowerCase();
        if (!['front', 'back', 'front-3q', 'back-3q', 'side'].includes(view)) return false;
        const clothing = this._ucGetClothing(d);
        if (clothing.garmentMode === 'painted') return false;
        if (!(clothing.garmentMode === 'pinned' || clothing.garmentMode === 'hybrid')) return false;
        if (this._ucIsFemaleNigerianHybridPreset?.(clothing.outfitPreset)) return false;
        return this._ucIsAgbadaGarment({ clothing });
    },

    _ucUseIntegratedSideGarment(d = {}) {
        return String(d?.view || '').toLowerCase() === 'side'
            && this._ucUseIntegratedGarmentParts?.(d);
    },

    _ucUseHybridGarments(d = {}) {
        const clothing = this._ucGetClothing(d);
        return clothing.garmentMode === 'hybrid' && this._ucIsAgbadaGarment({ clothing });
    },

    _ucFemaleNigerianHybridBasePreset(preset = '') {
        switch (String(preset || '').toLowerCase()) {
            case 'hybrid-skirt': return 'custom';
            case 'iro-buba-hybrid': return 'iro-buba';
            case 'ankara-peplum-hybrid': return 'ankara-peplum';
            case 'bubu-gown-hybrid': return 'bubu-gown';
            case 'george-wrapper-hybrid': return 'george-wrapper';
            default: return '';
        }
    },

    _ucIsFemaleNigerianHybridPreset(preset = '') {
        return !!this._ucFemaleNigerianHybridBasePreset(preset);
    },

    _ucIsAgbadaGarment(d = {}) {
        const clothing = this._ucGetClothing(d);
        return clothing.topStyle === 'agbada'
            || clothing.outfitPreset === 'agbada'
            || clothing.outfitPreset === 'agbada2'
            || clothing.outfitPreset === 'agbada3'
            || clothing.outfitPreset === 'royal-agbada'
            || clothing.outfitPreset === 'senator'
            || clothing.outfitPreset === 'senator2'
            || clothing.outfitPreset === 'senator3'
            || clothing.outfitPreset === 'senator-shirt'
            || clothing.outfitPreset === 'senator-shirt-panel'
            || clothing.outfitPreset === 'senator-shirt-stripe'
            || clothing.outfitPreset === 'executive-tunic-suit'
            || clothing.outfitPreset === 'chief'
            || this._ucIsFemaleNigerianHybridPreset?.(clothing.outfitPreset);
    },

    _ucIsSenatorShirtGarment(d = {}) {
        const clothing = this._ucGetClothing(d);
        return clothing.robeFit === 'shirt'
            || clothing.agbadaLength === 'shirt'
            || clothing.pinnedGarmentStyle === 'senator-shirt'
            || clothing.pinnedGarmentStyle === 'senator-panel'
            || clothing.pinnedGarmentStyle === 'senator-stripe'
            || clothing.pinnedGarmentStyle === 'executive-tunic'
            || clothing.outfitPreset === 'senator-shirt'
            || clothing.outfitPreset === 'senator-shirt-panel'
            || clothing.outfitPreset === 'senator-shirt-stripe'
            || clothing.outfitPreset === 'executive-tunic-suit';
    },

    _ucHybridSkirtHemY(length = 'knee', values = {}) {
        const torso = values.torso || {};
        const legTop = Number(values.legTop) || (Number(torso.y) || 0) + (Number(torso.h) || 0);
        const maxLegHeight = Math.max(1, Number(values.maxLegHeight) || Number(values.legLen) || 1);
        const unit = Math.max(1, Number(values.unit) || 1);
        const torsoY = Number(torso.y) || 0;
        const torsoH = Math.max(1, Number(torso.h) || unit * 3);
        switch (String(length || 'knee').toLowerCase()) {
            case 'mini':
                return torsoY + torsoH * 0.84;
            case 'short':
                return torsoY + torsoH * 1.02;
            case 'midi':
                return legTop + Math.max(maxLegHeight * 0.54, unit * 2.45);
            case 'ankle':
                return legTop + Math.max(maxLegHeight * 0.76, unit * 3.45);
            case 'floor':
                return legTop + Math.max(maxLegHeight * 0.90, unit * 4.10);
            case 'knee':
            default:
                return legTop + Math.max(maxLegHeight * 0.36, unit * 1.85);
        }
    },

    _ucGetEyeColor(d = {}) {
        const raw = d?.eyeColor || d?.eye || '#4B3424';
        return /^#[0-9a-f]{6}$/i.test(String(raw)) ? String(raw) : '#4B3424';
    },

    _ucIsHatStyle(style) {
        return ['bowler-hat', 'fedora', 'top-hat', 'sun-hat', 'bucket-hat', 'beanie', 'baseball-cap', 'uniform-cap', 'kufi']
            .includes(String(style || '').toLowerCase());
    },

    _ucIsHeadwearStyle(style) {
        return ['headwrap', 'gele', 'gele-pleated', 'beaded-gele', 'turban-wrap', 'ankara-wrap', 'tall-headwrap', 'hijab', 'bowler-hat', 'fedora', 'top-hat', 'sun-hat', 'bucket-hat', 'beanie', 'baseball-cap', 'uniform-cap', 'kufi']
            .includes(String(style || '').toLowerCase());
    },

    _ucNormalizeHeadwearStyle(style) {
        const normalized = String(style || 'none').toLowerCase();
        return ['none', 'headwrap', 'gele', 'gele-pleated', 'beaded-gele', 'turban-wrap', 'ankara-wrap', 'tall-headwrap', 'hijab', 'bowler-hat', 'fedora', 'top-hat', 'sun-hat', 'bucket-hat', 'beanie', 'baseball-cap', 'uniform-cap', 'kufi']
            .includes(normalized)
            ? normalized
            : 'none';
    },

    _ucGetHeadwearStyleOptions() {
        return [
            { val: 'none', label: 'None' },
            { val: 'headwrap', label: 'Head Wrap' },
            { val: 'gele', label: 'Gele' },
            { val: 'gele-pleated', label: 'Pleated Gele' },
            { val: 'beaded-gele', label: 'Beaded Gele' },
            { val: 'turban-wrap', label: 'Turban Wrap' },
            { val: 'ankara-wrap', label: 'Ankara Wrap' },
            { val: 'tall-headwrap', label: 'Tall Headwrap' },
            { val: 'hijab', label: 'Hijab' },
            { val: 'bowler-hat', label: 'Bowler Hat' },
            { val: 'fedora', label: 'Fedora' },
            { val: 'top-hat', label: 'Top Hat' },
            { val: 'sun-hat', label: 'Sun Hat' },
            { val: 'bucket-hat', label: 'Bucket Hat' },
            { val: 'beanie', label: 'Beanie' },
            { val: 'baseball-cap', label: 'Baseball Cap' },
            { val: 'uniform-cap', label: 'Uniform Cap' },
            { val: 'kufi', label: 'Kufi' }
        ];
    },

    _ucNormalizeHeadNeckStyle(style) {
        const normalized = String(style || '').toLowerCase();
        return ['classic', 'oval', 'round', 'soft', 'defined', 'square', 'heart', 'narrow', 'long-neck'].includes(normalized) ? normalized : 'oval';
    },

    _ucGetHairStyleOptions(gender = 'neutral') {
        const normalizedGender = ['male', 'female', 'neutral'].includes(gender) ? gender : 'neutral';
        if (normalizedGender === 'female') {
            return [
                { val: 'bob', label: 'Bob' },
                { val: 'ponytail', label: 'Ponytail' },
                { val: 'bun', label: 'Bun' },
                { val: 'pixie', label: 'Pixie' },
                { val: 'shoulder-length', label: 'Shoulder Length' },
                { val: 'long-straight', label: 'Long Straight' },
                { val: 'long-curly', label: 'Long Curly' },
                { val: 'braids', label: 'Braids' },
                { val: 'box-braids', label: 'Box Braids' },
                { val: 'side-braid', label: 'Side Braid' },
                { val: 'locs', label: 'Locs' },
                { val: 'dreadlock-bun', label: 'Loc Bun' },
                { val: 'goddess-locs', label: 'Goddess Locs' },
                { val: 'sister-locs', label: 'Sisterlocks' },
                { val: 'bantu-knots', label: 'Bantu Knots' },
                { val: 'flat-twist', label: 'Flat Twist' },
                { val: 'twist-out', label: 'Twist Out' },
                { val: 'finger-waves', label: 'Finger Waves' },
                { val: 'high-puff', label: 'High Puff' },
                { val: 'curly', label: 'Curly' },
                { val: 'coils', label: 'Coils' },
                { val: 'short-afro', label: 'Short Afro' },
                { val: 'afro', label: 'Afro' }
            ];
        }
        if (normalizedGender === 'male') {
            return [
                { val: 'low-cut', label: 'Low Cut' },
                { val: 'short', label: 'Short' },
                { val: 'side-part', label: 'Side Part' },
                { val: 'buzz', label: 'Buzz' },
                { val: 'fade', label: 'Fade' },
                { val: 'high-top', label: 'High Top Fade' },
                { val: 'mohawk', label: 'Mohawk' },
                { val: 'waves', label: 'Waves' },
                { val: 'cornrows', label: 'Cornrows' },
                { val: 'twists', label: 'Twists' },
                { val: 'locs', label: 'Locs' },
                { val: 'dreadlock-bun', label: 'Loc Bun' },
                { val: 'coils', label: 'Coils' },
                { val: 'curly', label: 'Curly' },
                { val: 'short-afro', label: 'Short Afro' },
                { val: 'tapered-afro', label: 'Tapered Afro' },
                { val: 'afro', label: 'Afro' },
                { val: 'bald', label: 'Bald' }
            ];
        }
        return [
            { val: 'low-cut', label: 'Low Cut' },
            { val: 'short', label: 'Short' },
            { val: 'bob', label: 'Bob' },
            { val: 'shoulder-length', label: 'Shoulder Length' },
            { val: 'ponytail', label: 'Ponytail' },
            { val: 'fade', label: 'Fade' },
            { val: 'braids', label: 'Braids' },
            { val: 'box-braids', label: 'Box Braids' },
            { val: 'side-braid', label: 'Side Braid' },
            { val: 'locs', label: 'Locs' },
            { val: 'dreadlock-bun', label: 'Loc Bun' },
            { val: 'twists', label: 'Twists' },
            { val: 'twist-out', label: 'Twist Out' },
            { val: 'high-puff', label: 'High Puff' },
            { val: 'coils', label: 'Coils' },
            { val: 'short-afro', label: 'Short Afro' },
            { val: 'tapered-afro', label: 'Tapered Afro' },
            { val: 'curly', label: 'Curly' },
            { val: 'long-curly', label: 'Long Curly' },
            { val: 'afro', label: 'Afro' },
            { val: 'sister-locs', label: 'Sisterlocks' },
            { val: 'bald', label: 'Bald' }
        ];
    },

    _ucNormalizeHairStyle(style, gender = 'neutral') {
        const normalized = String(style || '').toLowerCase();
        const allStyles = new Set([
            'bald', 'buzz', 'short', 'side-part', 'bob', 'ponytail', 'bun', 'pixie',
            'curly', 'afro', 'waves', 'cornrows', 'braids', 'locs', 'bantu-knots', 'high-puff',
            'fade', 'high-top', 'twists', 'mohawk', 'twist-out', 'box-braids', 'goddess-locs',
            'flat-twist', 'finger-waves', 'long-straight', 'sister-locs', 'coils',
            'low-cut', 'short-afro', 'tapered-afro', 'shoulder-length', 'long-curly', 'side-braid',
            'dreadlock-bun'
        ]);
        if (allStyles.has(normalized)) return normalized;
        return gender === 'female' ? 'bob' : 'short';
    },

    _ucGetHeadNeckProfile(style) {
        switch (this._ucNormalizeHeadNeckStyle(style)) {
            case 'oval':
                return { jawWidthMult: 0.96, chinWidthMult: 0.88, neckWidthMult: 0.98, headWidthMult: 1.02 };
            case 'round':
                return { jawWidthMult: 0.88, chinWidthMult: 0.74, neckWidthMult: 0.96, headWidthMult: 1.08 };
            case 'soft':
                return { jawWidthMult: 0.92, chinWidthMult: 0.82, neckWidthMult: 0.96, headWidthMult: 1.03 };
            case 'defined':
                return { jawWidthMult: 1.08, chinWidthMult: 1.10, neckWidthMult: 1.04, headWidthMult: 0.99 };
            case 'square':
                return { jawWidthMult: 1.12, chinWidthMult: 1.20, neckWidthMult: 1.08, headWidthMult: 1.02 };
            case 'heart':
                return { jawWidthMult: 0.84, chinWidthMult: 0.68, neckWidthMult: 0.94, headWidthMult: 1.08 };
            case 'narrow':
                return { jawWidthMult: 0.90, chinWidthMult: 0.86, neckWidthMult: 0.90, headWidthMult: 0.94 };
            case 'long-neck':
                return { jawWidthMult: 0.97, chinWidthMult: 0.94, neckWidthMult: 0.90, headWidthMult: 1.00 };
            default:
                return { jawWidthMult: 1.00, chinWidthMult: 1.00, neckWidthMult: 1.00, headWidthMult: 1.00 };
        }
    },

    _ucGetSideFaceProfile(d = {}, humanLike = false) {
        const style = this._ucNormalizeHeadNeckStyle(d.headNeckStyle);
        const gender = ['male', 'female', 'neutral'].includes(d.gender) ? d.gender : 'neutral';
        const ageGroup = String(d.ageGroup || 'adult').toLowerCase();
        const profile = {
            foreheadX: 1,
            browX: 1,
            noseTipX: 1,
            lipFrontX: 1,
            chinFrontX: 1,
            jawBackX: 1,
            skullTopY: 1,
            foreheadY: 1,
            eyeY: 1,
            noseTipY: 1,
            mouthY: 1,
            chinY: 1,
            jawAngleY: 1
        };

        const mix = (patch) => Object.assign(profile, Object.fromEntries(
            Object.entries(patch).map(([key, value]) => [key, (profile[key] || 1) * value])
        ));

        if (gender === 'female') {
            mix({ noseTipX: 0.965, lipFrontX: 1.018, chinFrontX: 0.965, jawBackX: 1.025, chinY: 0.980, jawAngleY: 0.985 });
        } else if (gender === 'male') {
            mix({ noseTipX: 1.030, browX: 1.010, chinFrontX: 1.035, jawBackX: 0.970, chinY: 1.020, jawAngleY: 1.030 });
        }

        switch (style) {
            case 'round':
                mix({ foreheadX: 0.985, noseTipX: 0.955, lipFrontX: 0.982, chinFrontX: 0.940, jawBackX: 1.055, skullTopY: 0.965, chinY: 0.960, jawAngleY: 0.955 });
                break;
            case 'soft':
                mix({ noseTipX: 0.975, lipFrontX: 0.992, chinFrontX: 0.965, jawBackX: 1.035, chinY: 0.975, jawAngleY: 0.975 });
                break;
            case 'defined':
                mix({ browX: 1.018, noseTipX: 1.035, lipFrontX: 1.010, chinFrontX: 1.040, jawBackX: 0.960, chinY: 1.025, jawAngleY: 1.030 });
                break;
            case 'square':
                mix({ foreheadX: 1.010, browX: 1.020, noseTipX: 1.020, lipFrontX: 1.004, chinFrontX: 1.055, jawBackX: 0.930, chinY: 1.030, jawAngleY: 1.045 });
                break;
            case 'heart':
                mix({ foreheadX: 1.025, browX: 1.012, noseTipX: 0.990, lipFrontX: 0.994, chinFrontX: 0.930, jawBackX: 1.075, skullTopY: 0.985, chinY: 1.015, jawAngleY: 0.965 });
                break;
            case 'narrow':
                mix({ foreheadX: 0.985, noseTipX: 1.012, lipFrontX: 1.000, chinFrontX: 0.985, jawBackX: 1.035, skullTopY: 0.980, foreheadY: 1.030, chinY: 1.040, jawAngleY: 1.020 });
                break;
            case 'long-neck':
                mix({ noseTipX: 1.006, chinFrontX: 0.990, jawBackX: 1.018, chinY: 1.020, jawAngleY: 0.990 });
                break;
            default:
                break;
        }

        if (ageGroup === 'neonate' || ageGroup === 'child') {
            mix({ foreheadX: 0.980, browX: 0.975, noseTipX: 0.930, lipFrontX: 0.972, chinFrontX: 0.930, jawBackX: 1.070, skullTopY: 0.940, foreheadY: 0.940, eyeY: 0.965, noseTipY: 0.965, mouthY: 0.970, chinY: 0.940, jawAngleY: 0.945 });
        } else if (ageGroup === 'elderly') {
            mix({ foreheadX: 1.015, browX: 1.018, noseTipX: 1.045, lipFrontX: 0.982, chinFrontX: 1.018, jawBackX: 0.985, foreheadY: 1.025, eyeY: 1.010, noseTipY: 1.020, mouthY: 1.012, chinY: 1.030, jawAngleY: 1.025 });
        }

        if (humanLike) {
            mix({
                foreheadX: 0.990,
                browX: 1.018,
                noseTipX: 1.045,
                noseTipY: 1.010,
                lipFrontX: 1.020,
                chinFrontX: 1.030,
                jawBackX: 0.982,
                chinY: 1.018,
                jawAngleY: 1.020
            });
        }

        const noseScale = this._ucClampNum(d.sideNoseScale, 60, 160, 100) / 100;
        const mouthScale = this._ucClampNum(d.sideMouthScale, 60, 160, 100) / 100;
        mix({
            noseTipX: 1 + ((noseScale - 1) * 0.48),
            noseTipY: 1 + ((noseScale - 1) * 0.06),
            lipFrontX: 1 + ((mouthScale - 1) * 0.30),
            chinFrontX: 1 + ((mouthScale - 1) * 0.08),
            mouthY: 1 + ((mouthScale - 1) * 0.04)
        });

        Object.keys(profile).forEach(key => {
            profile[key] = this._ucClampNum(profile[key], 0.84, 1.22, 1);
        });
        return profile;
    },

    _ucGetHairSilhouetteProfile(style = 'short', d = {}) {
        const normalized = this._ucNormalizeHairStyle(style, d.gender);
        const base = {
            volume: 1,
            height: 1,
            frontDrop: 1,
            backDepth: 1,
            partBias: 0
        };
        const presets = {
            buzz: { volume: 0.78, height: 0.78, frontDrop: 0.55, backDepth: 0.82 },
            fade: { volume: 0.82, height: 0.82, frontDrop: 0.62, backDepth: 0.84, partBias: -0.10 },
            'low-cut': { volume: 0.80, height: 0.80, frontDrop: 0.58, backDepth: 0.82 },
            short: { volume: 0.92, height: 0.90, frontDrop: 0.76, backDepth: 0.92 },
            'side-part': { volume: 0.98, height: 0.94, frontDrop: 0.92, backDepth: 0.96, partBias: -0.22 },
            quiff: { volume: 1.12, height: 1.16, frontDrop: 1.02, backDepth: 1.00, partBias: -0.10 },
            afro: { volume: 1.38, height: 1.30, frontDrop: 1.16, backDepth: 1.34 },
            'short-afro': { volume: 1.20, height: 1.12, frontDrop: 1.03, backDepth: 1.16 },
            'tapered-afro': { volume: 1.26, height: 1.24, frontDrop: 1.06, backDepth: 1.14, partBias: 0.08 },
            'high-puff': { volume: 1.22, height: 1.36, frontDrop: 0.92, backDepth: 1.22 },
            'bantu-knots': { volume: 1.16, height: 1.22, frontDrop: 0.86, backDepth: 1.12 },
            cornrows: { volume: 0.94, height: 0.88, frontDrop: 0.78, backDepth: 0.92, partBias: 0.16 },
            waves: { volume: 0.90, height: 0.84, frontDrop: 0.74, backDepth: 0.90, partBias: -0.06 },
            'high-top': { volume: 0.96, height: 1.36, frontDrop: 0.86, backDepth: 0.92 },
            coils: { volume: 1.10, height: 1.04, frontDrop: 1.05, backDepth: 1.08 },
            twists: { volume: 1.12, height: 1.08, frontDrop: 1.18, backDepth: 1.06 },
            'twist-out': { volume: 1.18, height: 1.12, frontDrop: 1.16, backDepth: 1.12 },
            mohawk: { volume: 0.92, height: 1.24, frontDrop: 0.92, backDepth: 0.88 },
            bob: { volume: 1.10, height: 1.02, frontDrop: 1.28, backDepth: 1.18 },
            'long-straight': { volume: 1.16, height: 1.04, frontDrop: 1.36, backDepth: 1.34 },
            'shoulder-length': { volume: 1.13, height: 1.04, frontDrop: 1.30, backDepth: 1.24 },
            'long-curly': { volume: 1.26, height: 1.16, frontDrop: 1.34, backDepth: 1.34 },
            ponytail: { volume: 1.00, height: 0.98, frontDrop: 0.84, backDepth: 1.36, partBias: 0.12 },
            bun: { volume: 1.02, height: 1.08, frontDrop: 0.80, backDepth: 1.24 },
            'dreadlock-bun': { volume: 1.08, height: 1.12, frontDrop: 0.90, backDepth: 1.30 },
            braids: { volume: 1.06, height: 1.00, frontDrop: 1.20, backDepth: 1.20, partBias: -0.08 },
            'box-braids': { volume: 1.10, height: 1.02, frontDrop: 1.30, backDepth: 1.26, partBias: -0.08 },
            'goddess-locs': { volume: 1.18, height: 1.08, frontDrop: 1.36, backDepth: 1.36 },
            'sister-locs': { volume: 1.12, height: 1.06, frontDrop: 1.26, backDepth: 1.28 },
            'flat-twist': { volume: 1.02, height: 0.96, frontDrop: 0.95, backDepth: 1.02, partBias: 0.18 },
            'finger-waves': { volume: 0.98, height: 0.90, frontDrop: 0.86, backDepth: 0.96, partBias: 0.18 },
            'side-braid': { volume: 1.08, height: 1.00, frontDrop: 1.18, backDepth: 1.30, partBias: 0.24 },
            bald: { volume: 0.0, height: 0.0, frontDrop: 0.0, backDepth: 0.0 }
        };
        const profile = { ...base, ...(presets[normalized] || {}) };
        const strength = this._ucClampNum(d.humanLikeStrength, 0, 100, 60) / 100;
        profile.volume = this._ucClampNum(1 + (profile.volume - 1) * (0.65 + strength * 0.45), 0.66, 1.56, 1);
        profile.height = this._ucClampNum(1 + (profile.height - 1) * (0.65 + strength * 0.45), 0.66, 1.52, 1);
        profile.frontDrop = this._ucClampNum(1 + (profile.frontDrop - 1) * (0.65 + strength * 0.45), 0.45, 1.55, 1);
        profile.backDepth = this._ucClampNum(1 + (profile.backDepth - 1) * (0.65 + strength * 0.45), 0.70, 1.60, 1);
        profile.partBias = this._ucClampNum(profile.partBias || 0, -0.32, 0.32, 0);
        return profile;
    },

    _ucApplyBodyAngleToProportions(p, bodyAngle, view, viewVariant, sideFacing) {
        const viewKey = String(viewVariant || view || 'front').toLowerCase();
        const sign = this._ucThreeQuarterSign(viewKey, sideFacing);
        if (!sign) return { ...p, bodyAngleSign: 0, threeQuarterTiltSign: 0 };

        // 3/4 characters keep the stable front/back layout. The turn is a visual
        // tilt/gaze cue, so limbs do not get repositioned away from the torso.
        return {
            ...p,
            bodyAngleSign: 0,
            threeQuarterTiltSign: sign,
            faceScale: p.faceScale || 1
        };
    },

    _ucApplyHeadNeckStyleToProportions(p, style, view) {
        const normalizedStyle = this._ucNormalizeHeadNeckStyle(style);
        const adjusted = { ...p, headNeckStyle: normalizedStyle };
        switch (normalizedStyle) {
            case 'oval':
                adjusted.headW *= view === 'side' ? 1.00 : 1.02;
                adjusted.headH *= 1.03;
                adjusted.neckW *= 0.98;
                break;
            case 'round':
                adjusted.headW *= view === 'side' ? 1.02 : 1.08;
                adjusted.headH *= 0.96;
                adjusted.neckW *= 0.96;
                break;
            case 'soft':
                adjusted.headW *= view === 'side' ? 1.02 : 1.04;
                adjusted.neckW *= 0.96;
                break;
            case 'defined':
                adjusted.headW *= 0.99;
                adjusted.neckW *= 1.04;
                break;
            case 'square':
                adjusted.headW *= view === 'side' ? 1.01 : 1.03;
                adjusted.headH *= 0.99;
                adjusted.neckW *= 1.08;
                break;
            case 'heart':
                adjusted.headW *= view === 'side' ? 1.00 : 1.06;
                adjusted.headH *= 1.02;
                adjusted.neckW *= 0.94;
                break;
            case 'narrow':
                adjusted.headW *= view === 'side' ? 0.96 : 0.92;
                adjusted.headH *= 1.04;
                adjusted.neckW *= 0.90;
                break;
            case 'long-neck':
                adjusted.neckH *= 1.18;
                adjusted.neckW *= 0.90;
                adjusted.headH *= 0.98;
                break;
            default:
                break;
        }
        return adjusted;
    },

    _ucIsHumanLikeQuality(value) {
        return ['human-like', 'refined'].includes(String(value || '').toLowerCase());
    },

    _ucApplyQualityPresetToProportions(p, qualityPreset = 'clean', view = 'front', config = {}) {
        const quality = String(qualityPreset || 'clean').toLowerCase();
        const adjusted = { ...p, qualityPreset: quality };
        if (!this._ucIsHumanLikeQuality(quality)) return adjusted;

        const isSide = view === 'side';
        const ageGroup = String(config.ageGroup || '').toLowerCase();
        const isYoung = ageGroup === 'neonate' || ageGroup === 'child';
        const isAdultish = !isYoung;
        const strength = this._ucClampNum(config.humanLikeStrength, 0, 100, 60) / 100;
        const intensity = 0.25 + strength * 0.75;
        const blendMul = (targetMul) => 1 + ((targetMul - 1) * intensity);
        const limbLengthBoost = blendMul(isAdultish ? 1.035 : 1.015);
        const headScale = blendMul(isYoung ? 0.970 : 0.905);
        const faceScale = blendMul(isYoung ? 0.970 : 0.920);

        adjusted.headW *= isSide ? blendMul(isYoung ? 1.00 : 0.96) : headScale;
        adjusted.headH *= blendMul(isYoung ? 0.980 : 0.955);
        adjusted.neckW *= isSide ? blendMul(1.02) : blendMul(0.920);
        adjusted.neckH *= blendMul(isYoung ? 1.035 : 1.070);
        adjusted.torsoH *= blendMul(isAdultish ? 1.025 : 1.012);
        adjusted.torsoW *= isSide ? blendMul(0.940) : blendMul(0.925);
        adjusted.shoulderW *= isSide ? blendMul(0.965) : blendMul(0.955);
        adjusted.waistW *= isSide ? blendMul(0.940) : blendMul(0.900);
        adjusted.hipW *= isSide ? blendMul(0.940) : blendMul(0.920);
        adjusted.bellyExtra *= blendMul(0.76);

        adjusted.upperArmLen *= limbLengthBoost;
        adjusted.forearmLen *= limbLengthBoost;
        adjusted.handLen *= blendMul(1.045);
        adjusted.armTotalLen = adjusted.upperArmLen + adjusted.forearmLen + adjusted.handLen;
        adjusted.armW *= (isSide ? blendMul(0.875) : blendMul(0.860)) * (1 + (this._ucClampNum(config.muscle, 0, 100, 50) - 50) / 100 * 0.22 * intensity);
        adjusted.armElbowPos = adjusted.upperArmLen / adjusted.armTotalLen;
        adjusted.armWristPos = (adjusted.upperArmLen + adjusted.forearmLen) / adjusted.armTotalLen;

        adjusted.upperLegLen *= blendMul(isAdultish ? 1.025 : 1.012);
        adjusted.lowerLegLen *= blendMul(isAdultish ? 1.035 : 1.018);
        adjusted.footH *= blendMul(1.060);
        adjusted.legTotalLen = adjusted.upperLegLen + adjusted.lowerLegLen + adjusted.footH;
        adjusted.legW *= (isSide ? blendMul(0.895) : blendMul(0.880)) * (1 + (this._ucClampNum(config.muscle, 0, 100, 50) - 50) / 100 * 0.16 * intensity);
        adjusted.legKneePos = adjusted.upperLegLen / adjusted.legTotalLen;
        adjusted.legAnklePos = (adjusted.upperLegLen + adjusted.lowerLegLen) / adjusted.legTotalLen;

        adjusted.faceScale = (adjusted.faceScale || 1) * faceScale;
        adjusted.humanLike = true;
        return adjusted;
    },

    _ucDrawHumanLikeHairTexture(ctx, p, d, cx, headRx, headRy, headCy) {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const style = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        if (style === 'bald' || this._ucIsHeadwearStyle(style)) return;
        const isTextured = new Set([
            'curly', 'coils', 'short-afro', 'tapered-afro', 'afro', 'twist-out',
            'twists', 'locs', 'sister-locs', 'goddess-locs', 'box-braids', 'braids',
            'cornrows', 'long-curly', 'high-puff'
        ]).has(style);
        const hairLight = this._ucShadeColor(d.hair, 0.22);
        const hairMid = this._ucShadeColor(d.hair, -0.10);
        const hairDark = this._ucShadeColor(d.hair, -0.30);
        const drawCurve = (x0, y0, x1, y1, x2, y2, alpha = 0.36, width = 0.5) => {
            ctx.strokeStyle = this._ucWithAlpha(hairDark, alpha);
            ctx.lineWidth = Math.max(0.65, d.ow * width);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo(x1, y1, x2, y2);
            ctx.stroke();
        };
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (style === 'cornrows' || style === 'flat-twist') {
            const rows = style === 'cornrows' ? 7 : 6;
            for (let i = 0; i < rows; i++) {
                const t = rows <= 1 ? 0.5 : i / (rows - 1);
                const x = cx - headRx * 0.72 + headRx * 1.44 * t;
                drawCurve(x, p.headH * 0.105, cx + (x - cx) * 0.42, p.headH * 0.205, cx + (x - cx) * 0.26, p.headH * 0.345, 0.58, 0.58);
                ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.32);
                ctx.lineWidth = Math.max(0.55, d.ow * 0.34);
                for (let y = p.headH * 0.155; y < p.headH * 0.325; y += p.headH * 0.040) {
                    ctx.beginPath();
                    ctx.moveTo(x - headRx * 0.035, y - p.headH * 0.012);
                    ctx.lineTo(x + headRx * 0.035, y + p.headH * 0.012);
                    ctx.stroke();
                }
            }
        } else if (style === 'locs' || style === 'sister-locs' || style === 'goddess-locs') {
            const locs = style === 'sister-locs' ? 16 : (style === 'goddess-locs' ? 11 : 12);
            const drop = style === 'goddess-locs' ? p.headH * 0.70 : p.headH * 0.56;
            for (let i = 0; i < locs; i++) {
                const t = locs <= 1 ? 0.5 : i / (locs - 1);
                const side = t < 0.5 ? -1 : 1;
                const x = cx - headRx * 0.86 + headRx * 1.72 * t;
                const startY = p.headH * (0.18 + 0.035 * Math.sin(i));
                const endY = drop + (i % 4) * p.headH * 0.030;
                if (Math.abs(x - cx) < headRx * 0.28 && style !== 'sister-locs') continue;
                ctx.strokeStyle = this._ucWithAlpha(hairMid, 0.88);
                ctx.lineWidth = Math.max(1.1, d.ow * (style === 'sister-locs' ? 0.55 : 0.88));
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.bezierCurveTo(x + side * headRx * 0.08, p.headH * 0.34, x - side * headRx * 0.04, p.headH * 0.50, x + side * headRx * 0.03, endY);
                ctx.stroke();
                ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.28);
                ctx.lineWidth = Math.max(0.55, d.ow * 0.32);
                ctx.stroke();
            }
        } else if (style === 'box-braids' || style === 'braids' || style === 'side-braid') {
            const braids = style === 'side-braid' ? 7 : 12;
            for (let i = 0; i < braids; i++) {
                const t = braids <= 1 ? 0.5 : i / (braids - 1);
                const sideBias = style === 'side-braid' ? 0.28 : 0;
                const x = cx - headRx * 0.78 + headRx * 1.56 * t + headRx * sideBias;
                if (Math.abs(x - cx) < headRx * 0.22 && style !== 'box-braids') continue;
                const y0 = p.headH * 0.18;
                const y1 = p.headH * (style === 'side-braid' ? 0.76 : 0.62);
                ctx.strokeStyle = this._ucWithAlpha(hairDark, 0.68);
                ctx.lineWidth = Math.max(1, d.ow * 0.72);
                ctx.beginPath();
                ctx.moveTo(x, y0);
                ctx.quadraticCurveTo(x + (style === 'side-braid' ? headRx * 0.28 : Math.sin(i) * headRx * 0.04), p.headH * 0.40, x, y1);
                ctx.stroke();
                ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.38);
                ctx.lineWidth = Math.max(0.55, d.ow * 0.32);
                for (let y = y0 + p.headH * 0.045; y < y1; y += p.headH * 0.055) {
                    ctx.beginPath();
                    ctx.moveTo(x - headRx * 0.035, y - p.headH * 0.012);
                    ctx.lineTo(x + headRx * 0.035, y + p.headH * 0.012);
                    ctx.moveTo(x + headRx * 0.035, y - p.headH * 0.012);
                    ctx.lineTo(x - headRx * 0.035, y + p.headH * 0.012);
                    ctx.stroke();
                }
            }
        } else if (style === 'waves' || style === 'finger-waves') {
            const rows = style === 'finger-waves' ? 5 : 4;
            for (let r = 0; r < rows; r++) {
                const y = p.headH * (0.145 + r * 0.042);
                ctx.strokeStyle = this._ucWithAlpha(hairLight, style === 'finger-waves' ? 0.50 : 0.34);
                ctx.lineWidth = Math.max(0.65, d.ow * 0.38);
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.78, y);
                for (let i = 0; i < 5; i++) {
                    const x1 = cx - headRx * 0.78 + headRx * (i + 0.5) * 0.31;
                    const x2 = cx - headRx * 0.78 + headRx * (i + 1) * 0.31;
                    ctx.quadraticCurveTo(x1, y + (i % 2 ? -1 : 1) * p.headH * 0.020, x2, y);
                }
                ctx.stroke();
            }
        } else if (style === 'high-puff') {
            ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.36);
            ctx.lineWidth = Math.max(0.8, d.ow * 0.58);
            for (let i = 0; i < 26; i++) {
                const a = (Math.PI * 2 * i) / 26;
                const x = cx + Math.cos(a) * headRx * (0.48 + 0.06 * Math.sin(i * 1.7));
                const y = p.headH * 0.010 + Math.sin(a) * headRy * 0.26;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(1.1, p.headH * 0.014), 0, Math.PI * 1.65);
                ctx.stroke();
            }
        } else if (isTextured) {
            ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.34);
            ctx.lineWidth = Math.max(0.8, d.ow * 0.58);
            const loops = style === 'afro' ? 26 : (style === 'short-afro' || style === 'tapered-afro' ? 18 : 15);
            for (let i = 0; i < loops; i++) {
                const t = loops <= 1 ? 0 : i / (loops - 1);
                const a = Math.PI * (0.08 + t * 0.84);
                const rx = headRx * (0.70 + 0.20 * Math.sin(i * 1.7));
                const x = cx + Math.cos(a) * rx;
                const y = headCy - headRy * 0.74 + Math.sin(a) * headRy * 0.35 + (i % 3) * p.headH * 0.012;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(1.2, p.headH * 0.012), 0, Math.PI * 1.6);
                ctx.stroke();
            }
        } else {
            ctx.strokeStyle = this._ucWithAlpha(hairDark, 0.32);
            ctx.lineWidth = Math.max(0.8, d.ow * 0.48);
            for (let i = -4; i <= 4; i++) {
                const x = cx + headRx * i * 0.16;
                ctx.beginPath();
                ctx.moveTo(x, p.headH * (0.09 + Math.abs(i) * 0.008));
                ctx.quadraticCurveTo(x + headRx * i * 0.018, p.headH * 0.21, x - headRx * i * 0.020, p.headH * 0.36);
                ctx.stroke();
            }
            ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.24);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.30);
            ctx.beginPath();
            ctx.ellipse(cx - headRx * 0.12, p.headH * 0.170, headRx * 0.48, headRy * 0.13, -0.08, Math.PI * 1.02, Math.PI * 1.92);
            ctx.stroke();
        }
        this._ucDrawHumanLikeHairDepth(ctx, p, d, cx, headRx, headRy, headCy);
        ctx.restore();
    },

    _ucDrawHumanLikeHairDepth(ctx, p, d, cx, headRx, headRy, headCy) {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const style = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        if (style === 'bald' || this._ucIsHeadwearStyle(style)) return;
        const dark = this._ucShadeColor(d.hair, -0.32);
        const light = this._ucShadeColor(d.hair, 0.26);
        const view = String(d.view || 'front');
        const longStyles = new Set(['bob', 'shoulder-length', 'long-straight', 'long-curly', 'ponytail', 'braids', 'box-braids', 'locs', 'goddess-locs', 'sister-locs']);
        const closeStyles = new Set(['low-cut', 'short', 'side-part', 'buzz', 'fade', 'waves', 'high-top', 'pixie']);
        const texturedStyles = new Set(['curly', 'coils', 'short-afro', 'tapered-afro', 'afro', 'twist-out', 'twists', 'high-puff']);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (longStyles.has(style)) {
            const strandCount = view === 'side' ? 4 : 6;
            const dropBase = p.headH * (style === 'bob' ? 0.54 : style === 'shoulder-length' ? 0.72 : 0.82);
            ctx.strokeStyle = this._ucWithAlpha(dark, 0.50);
            ctx.lineWidth = Math.max(0.75, d.ow * 0.44);
            for (let i = 0; i < strandCount; i++) {
                const t = strandCount <= 1 ? 0.5 : i / (strandCount - 1);
                const side = t < 0.5 ? -1 : 1;
                const x = view === 'side'
                    ? cx + headRx * (-0.44 + t * 0.48)
                    : cx - headRx * 0.78 + headRx * 1.56 * t;
                if (view === 'front' && Math.abs(x - cx) < headRx * 0.28 && !['box-braids', 'sister-locs'].includes(style)) continue;
                const y0 = p.headH * (0.18 + 0.03 * Math.sin(i * 1.3));
                const y1 = dropBase + p.headH * 0.035 * Math.sin(i);
                ctx.beginPath();
                ctx.moveTo(x, y0);
                ctx.bezierCurveTo(x + side * headRx * 0.12, p.headH * 0.38, x - side * headRx * 0.08, p.headH * 0.58, x + side * headRx * 0.03, y1);
                ctx.stroke();
            }
        }

        if (texturedStyles.has(style)) {
            ctx.strokeStyle = this._ucWithAlpha(light, 0.34);
            ctx.lineWidth = Math.max(0.70, d.ow * 0.42);
            const curls = style === 'afro' ? 18 : 12;
            for (let i = 0; i < curls; i++) {
                const t = curls <= 1 ? 0.5 : i / (curls - 1);
                const a = Math.PI * (0.10 + t * 0.80);
                const x = cx + Math.cos(a) * headRx * (style === 'afro' ? 1.00 : 0.78);
                const y = headCy - headRy * 0.70 + Math.sin(a) * headRy * 0.44;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(1, p.headH * 0.010), Math.PI * 0.05, Math.PI * 1.72);
                ctx.stroke();
            }
        }

        if (closeStyles.has(style)) {
            ctx.strokeStyle = this._ucWithAlpha(dark, 0.38);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.34);
            ctx.beginPath();
            if (view === 'back') {
                ctx.moveTo(cx - headRx * 0.74, p.headH * 0.33);
                ctx.quadraticCurveTo(cx - headRx * 0.34, p.headH * 0.43, cx, p.headH * 0.39);
                ctx.quadraticCurveTo(cx + headRx * 0.34, p.headH * 0.43, cx + headRx * 0.74, p.headH * 0.33);
                ctx.moveTo(cx - headRx * 0.42, p.headH * 0.47);
                ctx.quadraticCurveTo(cx, p.headH * 0.53, cx + headRx * 0.42, p.headH * 0.47);
            } else {
                ctx.moveTo(cx - headRx * 0.82, p.headH * 0.28);
                ctx.quadraticCurveTo(cx - headRx * 0.76, p.headH * 0.36, cx - headRx * 0.64, p.headH * 0.43);
                ctx.moveTo(cx + headRx * 0.82, p.headH * 0.28);
                ctx.quadraticCurveTo(cx + headRx * 0.76, p.headH * 0.36, cx + headRx * 0.64, p.headH * 0.43);
            }
            ctx.stroke();
        }

        ctx.strokeStyle = this._ucWithAlpha(light, 0.24);
        ctx.lineWidth = Math.max(0.55, d.ow * 0.30);
        ctx.beginPath();
        if (view === 'back') {
            ctx.moveTo(cx - headRx * 0.58, p.headH * 0.18);
            ctx.quadraticCurveTo(cx, p.headH * 0.09, cx + headRx * 0.58, p.headH * 0.18);
        } else {
            ctx.moveTo(cx - headRx * 0.62, p.headH * 0.18);
            ctx.quadraticCurveTo(cx - headRx * 0.18, p.headH * 0.09, cx + headRx * 0.42, p.headH * 0.20);
        }
        ctx.stroke();
        ctx.restore();
    },

    _ucDrawHumanLikeFaceDetails(ctx, p, d, cx, headRx, eyeY, mouthY) {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const skinShadow = this._ucShadeColor(d.skin, -0.15);
        const skinLight = this._ucShadeColor(d.skin, 0.14);
        const lipColor = this._ucDeriveLipColor(d.skin);
        ctx.save();
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.42);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(0.7, d.ow * 0.56);
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.24);
        ctx.lineWidth = Math.max(0.45, d.ow * 0.34);
        ctx.beginPath();
        ctx.moveTo(cx - headRx * 0.42, eyeY + headRx * 0.16);
        ctx.quadraticCurveTo(cx - headRx * 0.20, eyeY + headRx * 0.24, cx - headRx * 0.04, eyeY + headRx * 0.18);
        ctx.moveTo(cx + headRx * 0.42, eyeY + headRx * 0.16);
        ctx.quadraticCurveTo(cx + headRx * 0.20, eyeY + headRx * 0.24, cx + headRx * 0.04, eyeY + headRx * 0.18);
        ctx.stroke();

        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.34);
        ctx.lineWidth = Math.max(0.55, d.ow * 0.40);
        ctx.beginPath();
        ctx.moveTo(cx + headRx * 0.04, eyeY + headRx * 0.20);
        ctx.quadraticCurveTo(cx + headRx * 0.13, p.headH * 0.55, cx + headRx * 0.04, p.headH * 0.62);
        ctx.stroke();
        ctx.fillStyle = this._ucWithAlpha(skinShadow, 0.38);
        ctx.beginPath();
        ctx.ellipse(cx - headRx * 0.10, p.headH * 0.635, headRx * 0.035, headRx * 0.020, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + headRx * 0.10, p.headH * 0.635, headRx * 0.035, headRx * 0.020, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.42);
        ctx.lineWidth = Math.max(0.7, d.ow * 0.56);
        ctx.beginPath();
        ctx.moveTo(cx - headRx * 0.30, eyeY + p.headH * 0.09);
        ctx.quadraticCurveTo(cx - headRx * 0.18, p.headH * 0.64, cx - headRx * 0.40, mouthY + p.headH * 0.04);
        ctx.moveTo(cx + headRx * 0.30, eyeY + p.headH * 0.09);
        ctx.quadraticCurveTo(cx + headRx * 0.18, p.headH * 0.64, cx + headRx * 0.40, mouthY + p.headH * 0.04);
        ctx.moveTo(cx - headRx * 0.20, eyeY - p.headH * 0.05);
        ctx.quadraticCurveTo(cx, eyeY - p.headH * 0.09, cx + headRx * 0.20, eyeY - p.headH * 0.05);
        ctx.stroke();

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#C96F6F';
        ctx.beginPath();
        ctx.ellipse(cx - headRx * 0.42, p.headH * 0.635, headRx * 0.13, p.headH * 0.030, -0.12, 0, Math.PI * 2);
        ctx.ellipse(cx + headRx * 0.42, p.headH * 0.635, headRx * 0.13, p.headH * 0.030, 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = this._ucWithAlpha(skinLight, 0.55);
        ctx.lineWidth = Math.max(0.55, d.ow * 0.36);
        ctx.beginPath();
        ctx.moveTo(cx - headRx * 0.08, eyeY + p.headH * 0.06);
        ctx.quadraticCurveTo(cx - headRx * 0.03, p.headH * 0.58, cx - headRx * 0.06, p.headH * 0.68);
        ctx.moveTo(cx + headRx * 0.08, eyeY + p.headH * 0.06);
        ctx.quadraticCurveTo(cx + headRx * 0.03, p.headH * 0.58, cx + headRx * 0.06, p.headH * 0.68);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(lipColor, 0.18), 0.34);
        ctx.lineWidth = Math.max(0.45, d.ow * 0.30);
        ctx.beginPath();
        ctx.moveTo(cx - headRx * 0.18, mouthY + p.headH * 0.025);
        ctx.quadraticCurveTo(cx, mouthY + p.headH * 0.045, cx + headRx * 0.18, mouthY + p.headH * 0.025);
        ctx.stroke();
        ctx.restore();
    },

    _ucDrawHumanLikeSideHeadDetails(ctx, p, d, w, h, metrics = {}) {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const hh = p.headH;
        const shadow = this._ucShadeColor(d.skin, -0.16);
        const deepShadow = this._ucShadeColor(d.skin, -0.24);
        const light = this._ucShadeColor(d.skin, 0.14);
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const hasHair = hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle);
        const jawBackX = metrics.jawBackX ?? w * 0.30;
        const jawAngleY = metrics.jawAngleY ?? hh * 0.73;
        const chinFrontX = metrics.chinFrontX ?? w * 0.60;
        const chinY = metrics.chinY ?? hh * 0.86;
        const eyeY = metrics.eyeY ?? hh * 0.42;
        const noseBaseX = metrics.noseBaseX ?? w * 0.57;
        const noseBottomY = metrics.noseBottomY ?? hh * 0.59;
        const mouthY = metrics.mouthY ?? hh * 0.66;
        const lipFrontX = metrics.lipFrontX ?? w * 0.63;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = this._ucWithAlpha(shadow, 0.42);
        ctx.lineWidth = Math.max(0.55, d.ow * 0.42);
        ctx.beginPath();
        ctx.moveTo(w * 0.43, eyeY + hh * 0.05);
        ctx.quadraticCurveTo(w * 0.52, hh * 0.50, w * 0.55, hh * 0.61);
        ctx.moveTo(noseBaseX - w * 0.012, noseBottomY + hh * 0.02);
        ctx.quadraticCurveTo(w * 0.52, mouthY + hh * 0.03, lipFrontX - w * 0.035, mouthY + hh * 0.085);
        ctx.stroke();

        ctx.strokeStyle = this._ucWithAlpha(deepShadow, 0.38);
        ctx.lineWidth = Math.max(0.60, d.ow * 0.46);
        ctx.beginPath();
        ctx.moveTo(chinFrontX - w * 0.02, chinY - hh * 0.025);
        ctx.quadraticCurveTo(w * 0.44, chinY + hh * 0.02, jawBackX, jawAngleY);
        ctx.stroke();

        ctx.strokeStyle = this._ucWithAlpha(light, 0.36);
        ctx.lineWidth = Math.max(0.48, d.ow * 0.32);
        ctx.beginPath();
        ctx.moveTo(w * 0.36, hh * 0.18);
        ctx.quadraticCurveTo(w * 0.48, hh * 0.24, w * 0.54, hh * 0.34);
        ctx.moveTo(w * 0.48, hh * 0.47);
        ctx.quadraticCurveTo(w * 0.57, hh * 0.50, w * 0.58, hh * 0.58);
        ctx.stroke();

        ctx.strokeStyle = this._ucWithAlpha(deepShadow, 0.30);
        ctx.lineWidth = Math.max(0.48, d.ow * 0.32);
        ctx.beginPath();
        ctx.moveTo(jawBackX + w * 0.03, jawAngleY + hh * 0.05);
        ctx.quadraticCurveTo(w * 0.34, hh * 0.86, w * 0.39, h - p.neckH * 0.10);
        ctx.moveTo(w * 0.50, hh * 0.84);
        ctx.quadraticCurveTo(w * 0.54, h - p.neckH * 0.46, w * 0.58, h - p.neckH * 0.08);
        ctx.stroke();

        if (hasHair) {
            ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(d.hair, -0.26), 0.32);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.36);
            ctx.beginPath();
            ctx.moveTo(w * 0.19, hh * 0.30);
            ctx.quadraticCurveTo(w * 0.28, hh * 0.46, w * 0.25, hh * 0.66);
            ctx.moveTo(w * 0.31, hh * 0.12);
            ctx.quadraticCurveTo(w * 0.37, hh * 0.32, w * 0.34, hh * 0.58);
            ctx.stroke();
        }

        ctx.restore();
    },

    _ucDrawHumanLikeBackHeadDetails(ctx, p, d, w, h, cx, headRx, headRy, headCy) {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const hasHair = hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle);
        const shadow = this._ucShadeColor(d.skin, -0.16);
        const light = this._ucShadeColor(d.skin, 0.14);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (hasHair) {
            const hairShadow = this._ucShadeColor(d.hair, -0.28);
            const hairLight = this._ucShadeColor(d.hair, 0.18);
            ctx.strokeStyle = this._ucWithAlpha(hairShadow, 0.36);
            ctx.lineWidth = Math.max(0.60, d.ow * 0.42);
            for (let i = -3; i <= 3; i++) {
                const ox = i * headRx * 0.17;
                ctx.beginPath();
                ctx.moveTo(cx + ox * 0.72, p.headH * 0.12);
                ctx.quadraticCurveTo(cx + ox, headCy * 0.82, cx + ox * 1.05, p.headH * 0.78);
                ctx.stroke();
            }
            ctx.strokeStyle = this._ucWithAlpha(hairLight, 0.28);
            ctx.lineWidth = Math.max(0.50, d.ow * 0.32);
            ctx.beginPath();
            ctx.arc(cx - headRx * 0.10, p.headH * 0.30, headRx * 0.50, Math.PI * 1.10, Math.PI * 1.72);
            ctx.stroke();
            ctx.strokeStyle = this._ucWithAlpha(hairShadow, 0.42);
            ctx.lineWidth = Math.max(0.70, d.ow * 0.48);
            ctx.beginPath();
            ctx.moveTo(cx - p.neckW * 0.62, p.headH * 0.83);
            ctx.quadraticCurveTo(cx, p.headH * 0.78, cx + p.neckW * 0.62, p.headH * 0.83);
            ctx.stroke();
        } else {
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.34);
            ctx.lineWidth = Math.max(0.52, d.ow * 0.34);
            ctx.beginPath();
            ctx.arc(cx, headCy * 0.92, headRx * 0.56, Math.PI * 1.08, Math.PI * 1.92);
            ctx.moveTo(cx - headRx * 0.34, p.headH * 0.32);
            ctx.quadraticCurveTo(cx - headRx * 0.40, p.headH * 0.54, cx - headRx * 0.22, p.headH * 0.72);
            ctx.moveTo(cx + headRx * 0.34, p.headH * 0.32);
            ctx.quadraticCurveTo(cx + headRx * 0.40, p.headH * 0.54, cx + headRx * 0.22, p.headH * 0.72);
            ctx.stroke();
            ctx.strokeStyle = this._ucWithAlpha(light, 0.30);
            ctx.beginPath();
            ctx.arc(cx - headRx * 0.10, p.headH * 0.28, headRx * 0.46, Math.PI * 1.15, Math.PI * 1.62);
            ctx.stroke();
        }

        ctx.strokeStyle = this._ucWithAlpha(shadow, 0.42);
        ctx.lineWidth = Math.max(0.52, d.ow * 0.34);
        [-1, 1].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(cx + s * headRx * 1.00, p.headH * 0.32);
            ctx.quadraticCurveTo(cx + s * headRx * 1.06, p.headH * 0.43, cx + s * headRx * 0.98, p.headH * 0.54);
            ctx.stroke();
        });
        ctx.beginPath();
        ctx.moveTo(cx - p.neckW * 0.34, p.headH * 0.87);
        ctx.quadraticCurveTo(cx - p.neckW * 0.18, h - p.neckH * 0.42, cx - p.neckW * 0.12, h - p.neckH * 0.05);
        ctx.moveTo(cx + p.neckW * 0.34, p.headH * 0.87);
        ctx.quadraticCurveTo(cx + p.neckW * 0.18, h - p.neckH * 0.42, cx + p.neckW * 0.12, h - p.neckH * 0.05);
        ctx.stroke();
        ctx.restore();
    },

    _ucDrawHumanLikeLimbDetails(ctx, p, d, w, h, type = 'arm', view = d?.view || 'front', side = 'front') {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const shadow = this._ucShadeColor(d.skin, -0.20);
        const midShadow = this._ucShadeColor(d.skin, -0.11);
        const light = this._ucShadeColor(d.skin, 0.20);
        const warmLight = this._ucShadeColor(d.skin, 0.12);
        const clothing = this._ucGetClothing(d);
        const isFront = view === 'front';
        const isSide = view === 'side';
        const isBack = view === 'back';
        const muscleLevel = this._ucClampNum(d.muscle, 0, 100, 50) / 100;
        const detailLevel = this._ucClampNum(d.humanLikeStrength, 0, 100, 60) / 100;
        const anatomyAlpha = 0.72 + detailLevel * 0.56;
        const muscleBoost = Math.max(0, (muscleLevel - 0.42) / 0.58);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this._ucWithAlpha(shadow, 0.34 * anatomyAlpha);
        ctx.fillStyle = this._ucWithAlpha(light, 0.34 * anatomyAlpha);
        ctx.lineWidth = Math.max(0.55, d.ow * (0.38 + muscleBoost * 0.12));

        if (type === 'arm') {
            const elbowY = p.upperArmLen;
            const wristY = p.upperArmLen + p.forearmLen;
            const palmY = h - p.handLen * 0.40;
            const shoulderY = Math.max(2, h * 0.035);

            ctx.globalAlpha = 0.42;
            ctx.fillStyle = this._ucWithAlpha(warmLight, 0.32 * anatomyAlpha);
            ctx.beginPath();
            ctx.ellipse(w * 0.50, shoulderY + p.upperArmLen * 0.08, w * 0.22, p.upperArmLen * 0.13, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.38 * anatomyAlpha);
            ctx.lineWidth = Math.max(0.65, d.ow * (0.46 + muscleBoost * 0.18));
            ctx.beginPath();
            ctx.moveTo(w * 0.36, p.upperArmLen * 0.18);
            ctx.quadraticCurveTo(w * 0.30, p.upperArmLen * 0.48, w * 0.39, elbowY - p.upperArmLen * 0.08);
            ctx.moveTo(w * 0.64, p.upperArmLen * 0.18);
            ctx.quadraticCurveTo(w * 0.70, p.upperArmLen * 0.48, w * 0.61, elbowY - p.upperArmLen * 0.08);
            ctx.stroke();

            if (muscleBoost > 0.04) {
                ctx.strokeStyle = this._ucWithAlpha(shadow, 0.18 + muscleBoost * 0.30);
                ctx.lineWidth = Math.max(0.7, d.ow * (0.52 + muscleBoost * 0.30));
                ctx.beginPath();
                ctx.moveTo(w * 0.42, p.upperArmLen * 0.24);
                ctx.quadraticCurveTo(w * (0.34 - muscleBoost * 0.03), p.upperArmLen * 0.46, w * 0.43, elbowY - p.upperArmLen * 0.17);
                ctx.moveTo(w * 0.58, p.upperArmLen * 0.24);
                ctx.quadraticCurveTo(w * (0.66 + muscleBoost * 0.03), p.upperArmLen * 0.46, w * 0.57, elbowY - p.upperArmLen * 0.17);
                ctx.moveTo(w * 0.43, elbowY + p.forearmLen * 0.18);
                ctx.quadraticCurveTo(w * 0.36, elbowY + p.forearmLen * 0.43, w * 0.45, wristY - p.forearmLen * 0.16);
                ctx.moveTo(w * 0.57, elbowY + p.forearmLen * 0.18);
                ctx.quadraticCurveTo(w * 0.64, elbowY + p.forearmLen * 0.43, w * 0.55, wristY - p.forearmLen * 0.16);
                ctx.stroke();
            }

            ctx.strokeStyle = this._ucWithAlpha(light, 0.34 * anatomyAlpha);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.34);
            ctx.beginPath();
            ctx.moveTo(w * 0.48, p.upperArmLen * 0.16);
            ctx.quadraticCurveTo(w * 0.46, p.upperArmLen * 0.46, w * 0.50, elbowY - p.upperArmLen * 0.10);
            ctx.moveTo(w * 0.52, elbowY + p.forearmLen * 0.12);
            ctx.quadraticCurveTo(w * 0.47, elbowY + p.forearmLen * 0.45, w * 0.49, wristY - p.forearmLen * 0.10);
            ctx.stroke();

            ctx.strokeStyle = this._ucWithAlpha(midShadow, 0.44);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.42);
            ctx.beginPath();
            ctx.moveTo(w * 0.30, elbowY);
            ctx.quadraticCurveTo(w * 0.50, elbowY - p.upperArmLen * 0.018, w * 0.70, elbowY);
            ctx.moveTo(w * 0.34, wristY);
            ctx.quadraticCurveTo(w * 0.50, wristY + p.handLen * 0.035, w * 0.66, wristY);
            ctx.stroke();

            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.34);
            ctx.fillStyle = this._ucWithAlpha(light, 0.42);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.38);
            ctx.beginPath();
            ctx.moveTo(w * 0.32, wristY + p.handLen * 0.18);
            ctx.quadraticCurveTo(w * 0.50, palmY, w * 0.68, wristY + p.handLen * 0.18);
            ctx.stroke();

            ctx.strokeStyle = this._ucWithAlpha(midShadow, 0.46);
            ctx.lineWidth = Math.max(0.45, d.ow * 0.30);
            ctx.beginPath();
            ctx.moveTo(w * 0.30, palmY - p.handLen * 0.06);
            ctx.quadraticCurveTo(w * 0.50, palmY - p.handLen * 0.02, w * 0.70, palmY - p.handLen * 0.06);
            ctx.moveTo(w * 0.38, palmY + p.handLen * 0.07);
            ctx.quadraticCurveTo(w * 0.50, palmY + p.handLen * 0.03, w * 0.62, palmY + p.handLen * 0.07);
            ctx.stroke();

            ctx.fillStyle = this._ucWithAlpha(light, 0.40);
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.ellipse(w * (0.5 + i * 0.12), h - p.handLen * 0.045, w * 0.045, p.handLen * 0.022, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.42);
            ctx.lineWidth = Math.max(0.42, d.ow * 0.28);
            for (let i = -2; i <= 2; i++) {
                const x = w * (0.5 + i * 0.075);
                ctx.beginPath();
                ctx.moveTo(x, palmY - p.handLen * 0.12);
                ctx.quadraticCurveTo(x + w * 0.012, palmY + p.handLen * 0.08, x + w * 0.006, h - p.handLen * 0.07);
                ctx.stroke();
            }
            ctx.fillStyle = this._ucWithAlpha(light, 0.48);
            for (let i = -2; i <= 2; i++) {
                const x = w * (0.5 + i * 0.075);
                ctx.beginPath();
                ctx.ellipse(x, h - p.handLen * 0.035, w * 0.028, p.handLen * 0.015, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            const sleeveRatio = this._ucSleeveRatio(clothing.topStyle);
            if (!this._ucUsePinnedGarments(d) && sleeveRatio > 0) {
                const sleeveEnd = Math.min(wristY, Math.max(p.upperArmLen * 0.45, (p.upperArmLen + p.forearmLen) * sleeveRatio));
                const cuffShadow = this._ucShadeColor(clothing.topColor || '#5F7C8A', -0.24);
                const cuffLight = this._ucShadeColor(clothing.topColor || '#5F7C8A', 0.20);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = this._ucWithAlpha(cuffShadow, 0.58);
                ctx.lineWidth = Math.max(0.60, d.ow * 0.42);
                ctx.beginPath();
                ctx.moveTo(w * 0.22, sleeveEnd);
                ctx.quadraticCurveTo(w * 0.50, sleeveEnd + p.hu * 0.012, w * 0.78, sleeveEnd);
                ctx.stroke();

                ctx.strokeStyle = this._ucWithAlpha(cuffLight, 0.42);
                ctx.lineWidth = Math.max(0.46, d.ow * 0.30);
                ctx.beginPath();
                if (isSide) {
                    ctx.moveTo(w * 0.58, p.upperArmLen * 0.12);
                    ctx.quadraticCurveTo(w * 0.66, sleeveEnd * 0.54, w * 0.58, sleeveEnd - p.hu * 0.018);
                } else if (isBack) {
                    ctx.moveTo(w * 0.36, p.upperArmLen * 0.16);
                    ctx.quadraticCurveTo(w * 0.42, sleeveEnd * 0.56, w * 0.38, sleeveEnd - p.hu * 0.016);
                    ctx.moveTo(w * 0.64, p.upperArmLen * 0.16);
                    ctx.quadraticCurveTo(w * 0.58, sleeveEnd * 0.56, w * 0.62, sleeveEnd - p.hu * 0.016);
                } else {
                    const seamX = (side === 'right' || side === 'front') ? w * 0.36 : w * 0.64;
                    ctx.moveTo(seamX, p.upperArmLen * 0.14);
                    ctx.quadraticCurveTo(seamX + (seamX < w * 0.5 ? -w * 0.04 : w * 0.04), sleeveEnd * 0.55, seamX, sleeveEnd - p.hu * 0.018);
                }
                ctx.stroke();
            }

            if (isBack) {
                ctx.strokeStyle = this._ucWithAlpha(midShadow, 0.50);
                ctx.lineWidth = Math.max(0.46, d.ow * 0.30);
                ctx.beginPath();
                ctx.moveTo(w * 0.34, palmY - p.handLen * 0.02);
                ctx.quadraticCurveTo(w * 0.50, palmY - p.handLen * 0.08, w * 0.66, palmY - p.handLen * 0.02);
                ctx.moveTo(w * 0.36, palmY + p.handLen * 0.08);
                ctx.quadraticCurveTo(w * 0.50, palmY + p.handLen * 0.02, w * 0.64, palmY + p.handLen * 0.08);
                ctx.stroke();
            }
        } else {
            const kneeY = p.upperLegLen;
            const ankleY = p.upperLegLen + p.lowerLegLen;

            ctx.globalAlpha = 0.40;
            ctx.fillStyle = this._ucWithAlpha(warmLight, 0.30 * anatomyAlpha);
            ctx.beginPath();
            ctx.ellipse(w * 0.50, p.upperLegLen * 0.26, w * 0.22, p.upperLegLen * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.36 * anatomyAlpha);
            ctx.lineWidth = Math.max(0.65, d.ow * (0.46 + muscleBoost * 0.16));
            ctx.beginPath();
            ctx.moveTo(w * 0.35, p.upperLegLen * 0.12);
            ctx.quadraticCurveTo(w * 0.29, p.upperLegLen * 0.48, w * 0.38, kneeY - p.upperLegLen * 0.08);
            ctx.moveTo(w * 0.65, p.upperLegLen * 0.12);
            ctx.quadraticCurveTo(w * 0.71, p.upperLegLen * 0.48, w * 0.62, kneeY - p.upperLegLen * 0.08);
            ctx.stroke();

            if (muscleBoost > 0.04) {
                ctx.strokeStyle = this._ucWithAlpha(shadow, 0.18 + muscleBoost * 0.28);
                ctx.lineWidth = Math.max(0.7, d.ow * (0.50 + muscleBoost * 0.28));
                ctx.beginPath();
                ctx.moveTo(w * 0.42, p.upperLegLen * 0.18);
                ctx.quadraticCurveTo(w * (0.31 - muscleBoost * 0.02), p.upperLegLen * 0.48, w * 0.42, kneeY - p.upperLegLen * 0.12);
                ctx.moveTo(w * 0.58, p.upperLegLen * 0.18);
                ctx.quadraticCurveTo(w * (0.69 + muscleBoost * 0.02), p.upperLegLen * 0.48, w * 0.58, kneeY - p.upperLegLen * 0.12);
                ctx.moveTo(w * 0.44, kneeY + p.lowerLegLen * 0.18);
                ctx.quadraticCurveTo(w * 0.34, kneeY + p.lowerLegLen * 0.46, w * 0.45, ankleY - p.lowerLegLen * 0.16);
                ctx.moveTo(w * 0.56, kneeY + p.lowerLegLen * 0.18);
                ctx.quadraticCurveTo(w * 0.66, kneeY + p.lowerLegLen * 0.46, w * 0.55, ankleY - p.lowerLegLen * 0.16);
                ctx.stroke();
            }

            ctx.strokeStyle = this._ucWithAlpha(light, 0.32 * anatomyAlpha);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.34);
            ctx.beginPath();
            ctx.moveTo(w * 0.48, p.upperLegLen * 0.12);
            ctx.quadraticCurveTo(w * 0.45, p.upperLegLen * 0.50, w * 0.50, kneeY - p.upperLegLen * 0.12);
            ctx.moveTo(w * 0.52, kneeY + p.lowerLegLen * 0.10);
            ctx.quadraticCurveTo(w * 0.46, kneeY + p.lowerLegLen * 0.43, w * 0.49, ankleY - p.lowerLegLen * 0.12);
            ctx.stroke();

            ctx.strokeStyle = this._ucWithAlpha(midShadow, 0.46);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.42);
            ctx.beginPath();
            ctx.ellipse(w * 0.50, kneeY + p.lowerLegLen * 0.015, w * 0.16, p.lowerLegLen * 0.045, 0, Math.PI * 0.06, Math.PI * 0.94);
            ctx.moveTo(w * 0.35, ankleY);
            ctx.quadraticCurveTo(w * 0.50, ankleY + p.footH * 0.045, w * 0.65, ankleY);
            ctx.stroke();

            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.34);
            ctx.fillStyle = this._ucWithAlpha(light, 0.42);
            ctx.lineWidth = Math.max(0.55, d.ow * 0.38);
            ctx.beginPath();
            ctx.moveTo(w * 0.34, ankleY + p.footH * 0.38);
            ctx.quadraticCurveTo(w * 0.50, h - p.footH * 0.10, w * 0.72, h - p.footH * 0.18);
            ctx.stroke();

            ctx.strokeStyle = this._ucWithAlpha(midShadow, 0.42);
            ctx.lineWidth = Math.max(0.45, d.ow * 0.30);
            for (let i = -1; i <= 1; i++) {
                const x = w * (0.48 + i * 0.10);
                ctx.beginPath();
                ctx.moveTo(x, h - p.footH * 0.15);
                ctx.lineTo(x + w * 0.035, h - p.footH * 0.035);
                ctx.stroke();
            }
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.38);
            ctx.lineWidth = Math.max(0.42, d.ow * 0.28);
            ctx.beginPath();
            ctx.moveTo(w * 0.30, ankleY + p.footH * 0.20);
            ctx.quadraticCurveTo(w * 0.42, ankleY + p.footH * 0.36, w * 0.66, h - p.footH * 0.12);
            ctx.stroke();
            ctx.fillStyle = this._ucWithAlpha(light, 0.42);
            for (let i = 0; i < 5; i++) {
                const x = w * (0.40 + i * 0.065);
                const r = w * (i === 0 ? 0.035 : 0.026);
                ctx.beginPath();
                ctx.ellipse(x, h - p.footH * 0.035, r, p.footH * 0.016, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            if (!this._ucUsePinnedGarments(d)) {
                const bottomCoverage = this._ucBottomCoverage(clothing.bottomStyle);
                const longGarmentCoverage = this._ucLongGarmentCoverage(clothing);
                const bottomEndY = bottomCoverage > 0
                    ? Math.min(ankleY, h * bottomCoverage)
                    : (longGarmentCoverage > 0 ? Math.min(ankleY - p.footH * 0.85, h * longGarmentCoverage) : 0);
                if (bottomEndY > h * 0.12) {
                    const bottomColor = longGarmentCoverage > 0 ? clothing.topColor : clothing.bottomColor;
                    const seamShadow = this._ucShadeColor(bottomColor || '#263746', -0.24);
                    const seamLight = this._ucShadeColor(bottomColor || '#263746', 0.20);
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = this._ucWithAlpha(seamShadow, 0.48);
                    ctx.lineWidth = Math.max(0.55, d.ow * 0.36);
                    ctx.beginPath();
                    if (isSide) {
                        ctx.moveTo(w * 0.60, h * 0.06);
                        ctx.quadraticCurveTo(w * 0.70, kneeY * 0.52, w * 0.58, Math.min(bottomEndY, ankleY - p.footH * 0.15));
                    } else if (isBack) {
                        ctx.moveTo(w * 0.50, h * 0.05);
                        ctx.lineTo(w * 0.50, Math.min(bottomEndY - p.hu * 0.02, ankleY - p.footH * 0.15));
                        ctx.moveTo(w * 0.33, kneeY + p.lowerLegLen * 0.08);
                        ctx.quadraticCurveTo(w * 0.42, kneeY + p.lowerLegLen * 0.36, w * 0.34, ankleY - p.footH * 0.18);
                    } else {
                        ctx.moveTo(w * 0.50, h * 0.05);
                        ctx.lineTo(w * 0.50, Math.min(bottomEndY - p.hu * 0.02, ankleY - p.footH * 0.15));
                        const creaseX = (side === 'right' || side === 'front') ? w * 0.40 : w * 0.60;
                        ctx.moveTo(creaseX, kneeY + p.lowerLegLen * 0.05);
                        ctx.quadraticCurveTo(creaseX + (creaseX < w * 0.5 ? -w * 0.03 : w * 0.03), kneeY + p.lowerLegLen * 0.34, creaseX, ankleY - p.footH * 0.20);
                    }
                    ctx.stroke();

                    ctx.strokeStyle = this._ucWithAlpha(seamLight, 0.36);
                    ctx.lineWidth = Math.max(0.44, d.ow * 0.28);
                    ctx.beginPath();
                    ctx.moveTo(w * 0.22, Math.min(bottomEndY, ankleY - p.footH * 0.12));
                    ctx.quadraticCurveTo(w * 0.50, Math.min(bottomEndY + p.hu * 0.010, ankleY), w * 0.78, Math.min(bottomEndY, ankleY - p.footH * 0.12));
                    ctx.stroke();
                }

                if (clothing.footwearStyle !== 'none') {
                    const shoeShadow = this._ucShadeColor(clothing.footwearColor || '#2F261F', -0.24);
                    const shoeLight = this._ucShadeColor(clothing.footwearColor || '#2F261F', 0.20);
                    ctx.strokeStyle = this._ucWithAlpha(shoeShadow, 0.56);
                    ctx.lineWidth = Math.max(0.50, d.ow * 0.34);
                    ctx.beginPath();
                    if (isSide) {
                        ctx.moveTo(w * 0.30, h - p.footH * 0.12);
                        ctx.quadraticCurveTo(w * 0.54, h - p.footH * 0.01, w * 0.80, h - p.footH * 0.10);
                        ctx.moveTo(w * 0.28, ankleY + p.footH * 0.22);
                        ctx.quadraticCurveTo(w * 0.42, ankleY + p.footH * 0.06, w * 0.62, ankleY + p.footH * 0.18);
                    } else if (isBack) {
                        ctx.moveTo(w * 0.25, h - p.footH * 0.13);
                        ctx.quadraticCurveTo(w * 0.50, h - p.footH * 0.02, w * 0.75, h - p.footH * 0.13);
                        ctx.moveTo(w * 0.33, ankleY + p.footH * 0.18);
                        ctx.quadraticCurveTo(w * 0.50, ankleY + p.footH * 0.28, w * 0.67, ankleY + p.footH * 0.18);
                    } else {
                        ctx.moveTo(w * 0.22, h - p.footH * 0.14);
                        ctx.quadraticCurveTo(w * 0.50, h - p.footH * 0.04, w * 0.78, h - p.footH * 0.14);
                        ctx.moveTo(w * 0.34, ankleY + p.footH * 0.18);
                        ctx.quadraticCurveTo(w * 0.50, ankleY + p.footH * 0.08, w * 0.66, ankleY + p.footH * 0.18);
                    }
                    ctx.stroke();
                    ctx.strokeStyle = this._ucWithAlpha(shoeLight, 0.42);
                    ctx.lineWidth = Math.max(0.42, d.ow * 0.26);
                    ctx.beginPath();
                    ctx.moveTo(w * 0.38, h - p.footH * 0.27);
                    ctx.quadraticCurveTo(w * 0.50, h - p.footH * 0.22, w * 0.64, h - p.footH * 0.25);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    _ucDrawHumanLikeTorsoDetails(ctx, p, d, w, h, view = 'front') {
        if (!this._ucIsHumanLikeQuality(d.qualityPreset)) return;
        const cx = w * 0.5;
        const shadow = this._ucShadeColor(d.skin, -0.17);
        const light = this._ucShadeColor(d.skin, 0.13);
        const clothing = this._ucGetClothing(d);
        const hasTop = clothing.topStyle !== 'none';
        const clothShadow = this._ucShadeColor(clothing.topColor || '#5F7C8A', -0.22);
        const clothLight = this._ucShadeColor(clothing.topColor || '#5F7C8A', 0.18);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this._ucWithAlpha(shadow, 0.42);
        ctx.lineWidth = Math.max(0.75, d.ow * 0.58);
        if (view === 'front') {
            const neckY = h * 0.035;
            const clavicleY = h * 0.145;
            const sternumY = h * 0.34;
            ctx.beginPath();
            ctx.moveTo(cx - p.neckW * 0.48, neckY);
            ctx.quadraticCurveTo(cx - w * 0.18, h * 0.075, cx - w * 0.31, clavicleY);
            ctx.moveTo(cx + p.neckW * 0.48, neckY);
            ctx.quadraticCurveTo(cx + w * 0.18, h * 0.075, cx + w * 0.31, clavicleY);
            ctx.moveTo(cx, h * 0.09);
            ctx.lineTo(cx, sternumY);
            ctx.stroke();

            ctx.globalAlpha = 0.26;
            ctx.strokeStyle = this._ucWithAlpha(light, 0.65);
            ctx.lineWidth = Math.max(0.65, d.ow * 0.42);
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.18, h * 0.22);
            ctx.quadraticCurveTo(cx - w * 0.12, h * 0.40, cx - w * 0.16, h * 0.67);
            ctx.moveTo(cx + w * 0.18, h * 0.22);
            ctx.quadraticCurveTo(cx + w * 0.12, h * 0.40, cx + w * 0.16, h * 0.67);
            ctx.stroke();

            if (hasTop) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = this._ucWithAlpha(clothShadow, 0.42);
                ctx.lineWidth = Math.max(0.60, d.ow * 0.38);
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.36, h * 0.15);
                ctx.quadraticCurveTo(cx - w * 0.26, h * 0.22, cx - w * 0.22, h * 0.42);
                ctx.moveTo(cx + w * 0.36, h * 0.15);
                ctx.quadraticCurveTo(cx + w * 0.26, h * 0.22, cx + w * 0.22, h * 0.42);
                ctx.moveTo(cx - w * 0.28, h * 0.78);
                ctx.quadraticCurveTo(cx, h * 0.82, cx + w * 0.28, h * 0.78);
                ctx.stroke();

                if (['shirt', 'blouse', 'polo', 'jacket', 'blazer', 'lab-coat', 'chef-coat'].includes(clothing.topStyle)) {
                    ctx.strokeStyle = this._ucWithAlpha(clothLight, 0.50);
                    ctx.lineWidth = Math.max(0.55, d.ow * 0.34);
                    ctx.beginPath();
                    ctx.moveTo(cx, h * 0.13);
                    ctx.lineTo(cx, h * 0.72);
                    ctx.stroke();
                    ctx.strokeStyle = this._ucWithAlpha(clothShadow, 0.34);
                    for (let i = 0; i < 3; i++) {
                        const by = h * (0.28 + i * 0.13);
                        ctx.beginPath();
                        ctx.ellipse(cx, by, w * 0.018, w * 0.018, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
        } else if (view === 'side') {
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.10, h * 0.12);
            ctx.quadraticCurveTo(cx - w * 0.22, h * 0.34, cx - w * 0.12, h * 0.62);
            ctx.moveTo(cx + w * 0.18, h * 0.18);
            ctx.quadraticCurveTo(cx + w * 0.26, h * 0.42, cx + w * 0.12, h * 0.72);
            ctx.stroke();
            if (hasTop) {
                ctx.strokeStyle = this._ucWithAlpha(clothShadow, 0.42);
                ctx.lineWidth = Math.max(0.60, d.ow * 0.38);
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.18, h * 0.18);
                ctx.quadraticCurveTo(cx - w * 0.10, h * 0.42, cx - w * 0.18, h * 0.74);
                ctx.moveTo(cx + w * 0.14, h * 0.22);
                ctx.quadraticCurveTo(cx + w * 0.22, h * 0.40, cx + w * 0.16, h * 0.66);
                ctx.stroke();
            }
        } else if (view === 'back') {
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.40);
            ctx.lineWidth = Math.max(0.70, d.ow * 0.50);
            ctx.beginPath();
            ctx.moveTo(cx, h * 0.08);
            ctx.lineTo(cx, h * 0.74);
            ctx.moveTo(cx - w * 0.28, h * 0.22);
            ctx.quadraticCurveTo(cx - w * 0.18, h * 0.36, cx - w * 0.24, h * 0.52);
            ctx.moveTo(cx + w * 0.28, h * 0.22);
            ctx.quadraticCurveTo(cx + w * 0.18, h * 0.36, cx + w * 0.24, h * 0.52);
            ctx.stroke();

            ctx.globalAlpha = 0.26;
            ctx.strokeStyle = this._ucWithAlpha(light, 0.60);
            ctx.lineWidth = Math.max(0.58, d.ow * 0.36);
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.18, h * 0.26);
            ctx.quadraticCurveTo(cx - w * 0.12, h * 0.46, cx - w * 0.18, h * 0.68);
            ctx.moveTo(cx + w * 0.18, h * 0.26);
            ctx.quadraticCurveTo(cx + w * 0.12, h * 0.46, cx + w * 0.18, h * 0.68);
            ctx.stroke();

            if (hasTop) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = this._ucWithAlpha(clothShadow, 0.42);
                ctx.lineWidth = Math.max(0.60, d.ow * 0.38);
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.36, h * 0.16);
                ctx.quadraticCurveTo(cx - w * 0.24, h * 0.28, cx - w * 0.22, h * 0.48);
                ctx.moveTo(cx + w * 0.36, h * 0.16);
                ctx.quadraticCurveTo(cx + w * 0.24, h * 0.28, cx + w * 0.22, h * 0.48);
                ctx.moveTo(cx - w * 0.30, h * 0.78);
                ctx.quadraticCurveTo(cx, h * 0.82, cx + w * 0.30, h * 0.78);
                ctx.stroke();

                if (['jacket', 'blazer', 'lab-coat', 'shirt', 'blouse', 'chef-coat'].includes(clothing.topStyle)) {
                    ctx.strokeStyle = this._ucWithAlpha(clothLight, 0.42);
                    ctx.lineWidth = Math.max(0.50, d.ow * 0.30);
                    ctx.beginPath();
                    ctx.moveTo(cx, h * 0.15);
                    ctx.lineTo(cx, h * 0.72);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    },

    // Soft specular highlight across the upper hair mass — adds gloss/dimension
    // to the smooth base hair behind any style texture. Safe for all styles.
    _ucDrawHairSheen(ctx, p, hairColor, crownX, crownTopY, radius) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = this._ucShadeColor(hairColor, 0.24);
        ctx.lineWidth = Math.max(2, p.headH * 0.022);
        ctx.globalAlpha = 0.26;
        ctx.beginPath();
        ctx.arc(crownX, crownTopY + radius * 0.16, radius * 0.6, Math.PI * 1.12, Math.PI * 1.6);
        ctx.stroke();
        ctx.strokeStyle = this._ucShadeColor(hairColor, 0.38);
        ctx.lineWidth = Math.max(1, p.headH * 0.01);
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        ctx.arc(crownX, crownTopY + radius * 0.16, radius * 0.6, Math.PI * 1.18, Math.PI * 1.48);
        ctx.stroke();
        ctx.restore();
    },

    // Hairline variation for close-cropped front styles: a central widow's-peak
    // point for male/neutral adults, or temple recession for the elderly.
    // hairLineY is the function-local forehead hairline height.
    _ucDrawHairlineVariation(ctx, p, d, cx, headRx, hairLineY) {
        const style = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        if (this._ucIsHeadwearStyle(d.hairStyle) || style === 'bald') return;
        const closeStyles = new Set(['low-cut', 'short', 'side-part', 'buzz', 'fade', 'waves', 'high-top', 'curly', 'coils', 'short-afro', 'tapered-afro']);
        if (!closeStyles.has(style)) return;
        if (d.gender === 'female') return;
        const isChild = d.ageGroup === 'neonate' || d.ageGroup === 'child';
        if (isChild) return;
        const isElderly = d.ageGroup === 'elderly';
        ctx.save();
        if (isElderly) {
            // Receding: carve skin wedges into the temple corners.
            ctx.fillStyle = d.skin;
            [-1, 1].forEach(s => {
                ctx.beginPath();
                ctx.moveTo(cx + s * headRx * 0.94, hairLineY - p.headH * 0.04);
                ctx.quadraticCurveTo(cx + s * headRx * 0.56, hairLineY - p.headH * 0.11, cx + s * headRx * 0.30, hairLineY - p.headH * 0.01);
                ctx.quadraticCurveTo(cx + s * headRx * 0.56, hairLineY - p.headH * 0.02, cx + s * headRx * 0.94, hairLineY + p.headH * 0.02);
                ctx.closePath();
                ctx.fill();
            });
        } else {
            // Widow's peak: a small central hair point dipping onto the forehead.
            ctx.fillStyle = d.hair;
            ctx.beginPath();
            ctx.moveTo(cx - headRx * 0.17, hairLineY - p.headH * 0.005);
            ctx.quadraticCurveTo(cx, hairLineY + p.headH * 0.055, cx + headRx * 0.17, hairLineY - p.headH * 0.005);
            ctx.quadraticCurveTo(cx, hairLineY + p.headH * 0.014, cx - headRx * 0.17, hairLineY - p.headH * 0.005);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    },

    _ucDrawHairStyleAccent(ctx, p, d, w, h, cx, headRx, headRy, headCy) {
        const rawStyle = String(d.hairStyle || '').toLowerCase();
        const hairStyle = this._ucIsHeadwearStyle(rawStyle)
            ? this._ucNormalizeHeadwearStyle(rawStyle)
            : this._ucNormalizeHairStyle(rawStyle, d.gender);
        if (hairStyle === 'bald') return;

        const hairShade = this._ucShadeColor(d.hair, -0.12);
        const view = d.view;

        const drawBehind = (drawFn) => {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            drawFn();
            ctx.restore();
        };

        const drawVisibleHangingStrands = (strands, strandWidth, dropRatio, options = {}) => {
            const dropY = p.headH * dropRatio;
            const alpha = Number.isFinite(options.alpha) ? options.alpha : 0.96;
            ctx.save();
            ctx.fillStyle = d.hair;
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = Math.max(0.5, d.ow * (options.lineScale || 0.48));
            ctx.lineCap = 'round';
            ctx.globalAlpha = alpha;
            strands.forEach(([sx, sy, scale = 1, bend = 0]) => {
                if (view !== 'side' && Number.isFinite(options.minOuter) && Math.abs(sx - cx) < headRx * options.minOuter) return;
                const sw = strandWidth * scale;
                const midY = sy + (dropY - sy) * 0.52;
                ctx.beginPath();
                ctx.moveTo(sx - sw * 0.42, sy);
                ctx.quadraticCurveTo(sx - sw * 0.70 + bend, midY, sx - sw * 0.24, dropY);
                ctx.lineTo(sx + sw * 0.24, dropY);
                ctx.quadraticCurveTo(sx + sw * 0.70 + bend, midY, sx + sw * 0.42, sy);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(sx - sw * 0.14, sy + p.headH * 0.035);
                ctx.quadraticCurveTo(sx + bend * 0.25, midY, sx - sw * 0.08, dropY - p.headH * 0.04);
                ctx.moveTo(sx + sw * 0.14, sy + p.headH * 0.035);
                ctx.quadraticCurveTo(sx + bend * 0.25, midY, sx + sw * 0.08, dropY - p.headH * 0.04);
                if (options.crossMarks) {
                    for (let t = 0.18; t < 0.86; t += 0.14) {
                        const ty = sy + (dropY - sy) * t;
                        ctx.moveTo(sx - sw * 0.25, ty - p.headH * 0.012);
                        ctx.lineTo(sx + sw * 0.25, ty + p.headH * 0.012);
                        ctx.moveTo(sx + sw * 0.25, ty - p.headH * 0.012);
                        ctx.lineTo(sx - sw * 0.25, ty + p.headH * 0.012);
                    }
                }
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
            ctx.restore();
        };

        if (this._ucIsHatStyle(hairStyle)) {
            const hatColor = d.hair;
            const hatShade = this._ucShadeColor(hatColor, -0.22);
            const hatLight = this._ucShadeColor(hatColor, 0.10);
            const hatMid = this._ucShadeColor(hatColor, -0.08);
            const isSide = view === 'side';
            const eyebrowClearY = p.headH * (isSide ? 0.342 : 0.338);
            const brimY = eyebrowClearY - p.headH * 0.040;
            const brimH = p.headH * 0.038;
            const crownTop = p.headH * 0.015;
            const centerX = isSide ? w * 0.42 : cx;
            const sideBaseY = eyebrowClearY - p.headH * 0.018;
            const frontBaseY = eyebrowClearY - p.headH * 0.048;
            const safeBottomY = eyebrowClearY - p.headH * 0.006;
            ctx.save();
            ctx.fillStyle = hatColor;
            ctx.strokeStyle = hatShade;
            ctx.lineWidth = Math.max(1, d.ow * 0.75);
            ctx.lineJoin = 'round';

            const drawCrownShell = (span = 0.96, sideDrop = 0, foreheadLift = 0) => {
                const sideY = Math.min(sideBaseY + sideDrop, eyebrowClearY - p.headH * 0.004);
                const foreheadY = Math.min(frontBaseY - foreheadLift, eyebrowClearY - p.headH * 0.034);
                ctx.beginPath();
                if (isSide) {
                    ctx.moveTo(centerX - headRx * span, sideY);
                    ctx.quadraticCurveTo(
                        centerX - headRx * span * 0.84,
                        crownTop + p.headH * 0.040,
                        centerX - headRx * 0.12,
                        crownTop - p.headH * 0.006
                    );
                    ctx.quadraticCurveTo(
                        centerX + headRx * span * 0.62,
                        crownTop + p.headH * 0.006,
                        centerX + headRx * span,
                        sideY - p.headH * 0.012
                    );
                    ctx.quadraticCurveTo(
                        centerX + headRx * 0.50,
                        foreheadY + p.headH * 0.010,
                        centerX - headRx * span * 0.72,
                        sideY
                    );
                } else {
                    ctx.moveTo(centerX - headRx * span, sideY);
                    ctx.quadraticCurveTo(
                        centerX - headRx * span * 0.78,
                        crownTop + p.headH * 0.030,
                        centerX,
                        crownTop - p.headH * 0.006
                    );
                    ctx.quadraticCurveTo(
                        centerX + headRx * span * 0.78,
                        crownTop + p.headH * 0.030,
                        centerX + headRx * span,
                        sideY
                    );
                    ctx.quadraticCurveTo(centerX + headRx * 0.50, foreheadY, centerX, foreheadY + p.headH * 0.010);
                    ctx.quadraticCurveTo(centerX - headRx * 0.50, foreheadY, centerX - headRx * span, sideY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            };

            const drawBrim = (span = 1.08, tilt = 0, y = brimY, heightScale = 1) => {
                const cappedY = Math.min(y, eyebrowClearY - brimH * heightScale);
                ctx.beginPath();
                ctx.ellipse(centerX, cappedY, headRx * span, brimH * heightScale, tilt, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            };
            const drawBand = (x0, y, bw, bh) => {
                ctx.fillStyle = hatShade;
                ctx.fillRect(x0, y, bw, bh);
                ctx.fillStyle = hatColor;
            };

            if (hairStyle === 'bowler-hat') {
                drawBrim(isSide ? 1.08 : 1.22, isSide ? -0.04 : 0, brimY + p.headH * 0.004, 0.66);
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.96, sideBaseY);
                ctx.quadraticCurveTo(centerX - headRx * 0.86, crownTop + p.headH * 0.030, centerX, crownTop - p.headH * 0.006);
                ctx.quadraticCurveTo(centerX + headRx * 0.86, crownTop + p.headH * 0.030, centerX + headRx * 0.96, sideBaseY);
                ctx.quadraticCurveTo(centerX + headRx * 0.50, frontBaseY, centerX - headRx * 0.96, sideBaseY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                drawBand(centerX - headRx * 0.84, brimY - p.headH * 0.034, headRx * 1.68, p.headH * 0.026);
                ctx.strokeStyle = hatLight;
                ctx.beginPath();
                ctx.arc(centerX - headRx * 0.16, crownTop + p.headH * 0.070, headRx * 0.42, Math.PI * 1.12, Math.PI * 1.72);
                ctx.stroke();
            } else if (hairStyle === 'fedora') {
                drawBrim(isSide ? 1.28 : 1.48, isSide ? -0.08 : 0, brimY, 0.72);
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.96, sideBaseY - p.headH * 0.004);
                ctx.lineTo(centerX - headRx * 0.66, crownTop + p.headH * 0.040);
                ctx.quadraticCurveTo(centerX - headRx * 0.20, crownTop - p.headH * 0.010, centerX, crownTop + p.headH * 0.022);
                ctx.quadraticCurveTo(centerX + headRx * 0.20, crownTop - p.headH * 0.010, centerX + headRx * 0.66, crownTop + p.headH * 0.040);
                ctx.lineTo(centerX + headRx * 0.96, sideBaseY - p.headH * 0.004);
                ctx.quadraticCurveTo(centerX + headRx * 0.52, frontBaseY - p.headH * 0.006, centerX - headRx * 0.96, sideBaseY - p.headH * 0.004);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                drawBand(centerX - headRx * 0.88, brimY - p.headH * 0.044, headRx * 1.76, p.headH * 0.026);
                ctx.strokeStyle = hatLight;
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.32, crownTop + p.headH * 0.048);
                ctx.quadraticCurveTo(centerX, crownTop + p.headH * 0.078, centerX + headRx * 0.32, crownTop + p.headH * 0.048);
                ctx.moveTo(centerX - headRx * 0.28, crownTop + p.headH * 0.040);
                ctx.lineTo(centerX - headRx * 0.42, sideBaseY - p.headH * 0.030);
                ctx.moveTo(centerX + headRx * 0.28, crownTop + p.headH * 0.040);
                ctx.lineTo(centerX + headRx * 0.42, sideBaseY - p.headH * 0.030);
                ctx.stroke();
            } else if (hairStyle === 'top-hat') {
                const topY = Math.max(1, crownTop - p.headH * 0.010);
                const baseY = sideBaseY - p.headH * 0.004;
                drawBrim(isSide ? 1.18 : 1.36, 0, brimY + p.headH * 0.002, 0.62);
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.68, baseY);
                ctx.lineTo(centerX - headRx * 0.54, topY);
                ctx.lineTo(centerX + headRx * 0.54, topY);
                ctx.lineTo(centerX + headRx * 0.68, baseY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(centerX, topY, headRx * 0.55, p.headH * 0.028, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                drawBand(centerX - headRx * 0.66, baseY - p.headH * 0.040, headRx * 1.32, p.headH * 0.032);
                ctx.fillStyle = hatMid;
                ctx.globalAlpha = 0.36;
                ctx.fillRect(centerX + headRx * 0.18, topY + p.headH * 0.012, headRx * 0.22, baseY - topY - p.headH * 0.018);
                ctx.globalAlpha = 1;
                ctx.fillStyle = hatColor;
            } else if (hairStyle === 'sun-hat') {
                drawBrim(isSide ? 1.46 : 1.78, isSide ? -0.05 : 0, brimY + p.headH * 0.006, 0.92);
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.94, brimY - p.headH * 0.004);
                ctx.quadraticCurveTo(centerX - headRx * 0.56, crownTop + p.headH * 0.035, centerX, crownTop + p.headH * 0.018);
                ctx.quadraticCurveTo(centerX + headRx * 0.56, crownTop + p.headH * 0.035, centerX + headRx * 0.94, brimY - p.headH * 0.004);
                ctx.quadraticCurveTo(centerX + headRx * 0.46, frontBaseY - p.headH * 0.012, centerX - headRx * 0.94, brimY - p.headH * 0.004);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = hatLight;
                ctx.globalAlpha = 0.65;
                [1.12, 1.38, 1.64].forEach(span => {
                    ctx.beginPath();
                    ctx.ellipse(centerX, brimY + p.headH * 0.006, headRx * (isSide ? span * 0.82 : span), brimH * 0.42, 0, 0, Math.PI * 2);
                    ctx.stroke();
                });
                ctx.globalAlpha = 1;
            } else if (hairStyle === 'bucket-hat') {
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 1.02, safeBottomY - p.headH * 0.012);
                ctx.lineTo(centerX - headRx * 0.66, crownTop + p.headH * 0.030);
                ctx.quadraticCurveTo(centerX, crownTop + p.headH * 0.004, centerX + headRx * 0.66, crownTop + p.headH * 0.030);
                ctx.lineTo(centerX + headRx * 1.02, safeBottomY - p.headH * 0.012);
                ctx.quadraticCurveTo(centerX + headRx * 0.48, frontBaseY, centerX - headRx * 1.02, safeBottomY - p.headH * 0.012);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(centerX, brimY + p.headH * 0.012, headRx * (isSide ? 1.20 : 1.36), brimH * 0.72, isSide ? -0.04 : 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = hatLight;
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.62, brimY - p.headH * 0.046);
                ctx.lineTo(centerX + headRx * 0.62, brimY - p.headH * 0.046);
                ctx.moveTo(centerX - headRx * 0.70, brimY - p.headH * 0.012);
                ctx.lineTo(centerX + headRx * 0.70, brimY - p.headH * 0.012);
                ctx.stroke();
            } else if (hairStyle === 'beanie') {
                const bandBottomY = eyebrowClearY - p.headH * 0.006;
                const bandTopY = bandBottomY - p.headH * 0.042;
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.96, bandTopY);
                ctx.quadraticCurveTo(centerX - headRx * 0.70, crownTop - p.headH * 0.020, centerX, crownTop - p.headH * 0.020);
                ctx.quadraticCurveTo(centerX + headRx * 0.70, crownTop - p.headH * 0.020, centerX + headRx * 0.96, bandTopY);
                ctx.lineTo(centerX + headRx * 0.86, bandBottomY);
                ctx.quadraticCurveTo(centerX, frontBaseY + p.headH * 0.030, centerX - headRx * 0.86, bandBottomY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                drawBand(centerX - headRx * 0.86, bandTopY, headRx * 1.72, bandBottomY - bandTopY);
                ctx.strokeStyle = hatLight;
                ctx.globalAlpha = 0.52;
                for (let i = -4; i <= 4; i++) {
                    const x = centerX + i * headRx * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(x, bandTopY + p.headH * 0.004);
                    ctx.lineTo(x + headRx * 0.04, bandBottomY - p.headH * 0.004);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else if (hairStyle === 'uniform-cap') {
                const capBandY = Math.min(brimY - p.headH * 0.016, eyebrowClearY - p.headH * 0.070);
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 1.02, safeBottomY - p.headH * 0.028);
                ctx.quadraticCurveTo(centerX - headRx * 0.72, crownTop - p.headH * 0.010, centerX, crownTop - p.headH * 0.002);
                ctx.quadraticCurveTo(centerX + headRx * 0.72, crownTop - p.headH * 0.010, centerX + headRx * 1.02, safeBottomY - p.headH * 0.028);
                ctx.quadraticCurveTo(centerX + headRx * 0.50, capBandY, centerX - headRx * 1.02, safeBottomY - p.headH * 0.028);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = hatShade;
                ctx.globalAlpha = 0.92;
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.88, capBandY);
                ctx.quadraticCurveTo(centerX, capBandY + p.headH * 0.026, centerX + headRx * 0.88, capBandY);
                ctx.lineTo(centerX + headRx * 0.80, capBandY + p.headH * 0.038);
                ctx.quadraticCurveTo(centerX, capBandY + p.headH * 0.066, centerX - headRx * 0.80, capBandY + p.headH * 0.038);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = hatLight;
                ctx.beginPath();
                ctx.moveTo(centerX, capBandY + p.headH * 0.010);
                ctx.lineTo(centerX + headRx * 0.055, capBandY + p.headH * 0.050);
                ctx.lineTo(centerX, capBandY + p.headH * 0.076);
                ctx.lineTo(centerX - headRx * 0.055, capBandY + p.headH * 0.050);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = hatColor;
                ctx.beginPath();
                if (view === 'side') {
                    ctx.moveTo(centerX + headRx * 0.34, brimY + p.headH * 0.002);
                    ctx.quadraticCurveTo(centerX + headRx * 1.42, brimY + p.headH * 0.002, centerX + headRx * 1.24, eyebrowClearY - p.headH * 0.002);
                    ctx.quadraticCurveTo(centerX + headRx * 0.72, eyebrowClearY - p.headH * 0.010, centerX + headRx * 0.24, brimY + p.headH * 0.022);
                } else {
                    ctx.moveTo(centerX - headRx * 0.70, brimY + p.headH * 0.004);
                    ctx.quadraticCurveTo(centerX, eyebrowClearY - p.headH * 0.028, centerX + headRx * 0.70, brimY + p.headH * 0.004);
                    ctx.quadraticCurveTo(centerX + headRx * 0.34, eyebrowClearY - p.headH * 0.002, centerX - headRx * 0.34, eyebrowClearY - p.headH * 0.002);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = hatLight;
                ctx.globalAlpha = 0.48;
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.52, crownTop + p.headH * 0.075);
                ctx.quadraticCurveTo(centerX, crownTop + p.headH * 0.026, centerX + headRx * 0.52, crownTop + p.headH * 0.075);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (hairStyle === 'baseball-cap') {
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 1.02, safeBottomY - p.headH * 0.020);
                ctx.quadraticCurveTo(centerX - headRx * 0.70, crownTop - p.headH * 0.014, centerX, crownTop);
                ctx.quadraticCurveTo(centerX + headRx * 0.76, crownTop + p.headH * 0.004, centerX + headRx * 1.02, safeBottomY - p.headH * 0.020);
                ctx.quadraticCurveTo(centerX + headRx * 0.44, frontBaseY, centerX - headRx * 1.02, safeBottomY - p.headH * 0.020);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                const billDir = view === 'side' ? 1 : 0;
                const visorBottomY = eyebrowClearY - p.headH * 0.004;
                if (view === 'side') {
                    ctx.moveTo(centerX + headRx * 0.38, brimY + p.headH * 0.004);
                    ctx.quadraticCurveTo(centerX + headRx * 1.44, brimY + p.headH * 0.010, centerX + headRx * 1.22, visorBottomY);
                    ctx.quadraticCurveTo(centerX + headRx * 0.62, visorBottomY - p.headH * 0.008, centerX + headRx * 0.20, brimY + p.headH * 0.026);
                } else {
                    ctx.moveTo(centerX - headRx * 0.58, brimY + p.headH * 0.004);
                    ctx.quadraticCurveTo(centerX + headRx * 0.10, visorBottomY - p.headH * 0.006, centerX + headRx * 0.78, brimY + p.headH * 0.012);
                    ctx.quadraticCurveTo(centerX + headRx * 0.34, visorBottomY, centerX - headRx * 0.32, visorBottomY - p.headH * 0.002);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = hatLight;
                ctx.beginPath();
                ctx.moveTo(centerX, crownTop + p.headH * 0.020);
                ctx.lineTo(centerX + headRx * 0.02 + billDir, brimY);
                ctx.moveTo(centerX, crownTop + p.headH * 0.020);
                ctx.quadraticCurveTo(centerX - headRx * 0.48, crownTop + p.headH * 0.090, centerX - headRx * 0.72, safeBottomY - p.headH * 0.022);
                ctx.moveTo(centerX, crownTop + p.headH * 0.020);
                ctx.quadraticCurveTo(centerX + headRx * 0.48, crownTop + p.headH * 0.090, centerX + headRx * 0.72, safeBottomY - p.headH * 0.022);
                ctx.stroke();
                ctx.fillStyle = hatLight;
                ctx.beginPath();
                ctx.arc(centerX, crownTop + p.headH * 0.024, Math.max(1, headRx * 0.045), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hatColor;
            } else if (hairStyle === 'kufi') {
                ctx.beginPath();
                ctx.moveTo(centerX - headRx * 0.94, safeBottomY - p.headH * 0.020);
                ctx.quadraticCurveTo(centerX - headRx * 0.84, crownTop + p.headH * 0.060, centerX, crownTop + p.headH * 0.030);
                ctx.quadraticCurveTo(centerX + headRx * 0.84, crownTop + p.headH * 0.060, centerX + headRx * 0.94, safeBottomY - p.headH * 0.020);
                ctx.quadraticCurveTo(centerX + headRx * 0.44, frontBaseY - p.headH * 0.008, centerX - headRx * 0.94, safeBottomY - p.headH * 0.020);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = hatLight;
                ctx.globalAlpha = 0.58;
                for (let i = -2; i <= 2; i++) {
                    const x = centerX + i * headRx * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(x, crownTop + p.headH * 0.064);
                    ctx.lineTo(x + headRx * 0.08, safeBottomY - p.headH * 0.034);
                    ctx.lineTo(x - headRx * 0.08, safeBottomY - p.headH * 0.034);
                    ctx.closePath();
                    ctx.stroke();
                }
                const hatClothing = this._ucGetClothing(d);
                if (hatClothing.outfitPreset === 'royal-agbada' || hatClothing.outfitPreset === 'royal-agbada-painted') {
                    const capGold = hatClothing.accentColor || '#C99A3A';
                    ctx.globalAlpha = 0.88;
                    ctx.strokeStyle = capGold;
                    ctx.fillStyle = capGold;
                    ctx.lineWidth = Math.max(1, d.ow * 0.62);
                    ctx.beginPath();
                    ctx.moveTo(centerX - headRx * 0.72, safeBottomY - p.headH * 0.030);
                    ctx.quadraticCurveTo(centerX, frontBaseY - p.headH * 0.020, centerX + headRx * 0.72, safeBottomY - p.headH * 0.030);
                    ctx.stroke();
                    ctx.lineWidth = Math.max(0.8, d.ow * 0.42);
                    ctx.beginPath();
                    ctx.moveTo(centerX, crownTop + p.headH * 0.052);
                    ctx.quadraticCurveTo(centerX - headRx * 0.22, crownTop + p.headH * 0.11, centerX, safeBottomY - p.headH * 0.042);
                    ctx.quadraticCurveTo(centerX + headRx * 0.22, crownTop + p.headH * 0.11, centerX, crownTop + p.headH * 0.052);
                    ctx.stroke();
                    for (let i = -2; i <= 2; i++) {
                        ctx.beginPath();
                        ctx.arc(centerX + i * headRx * 0.24, safeBottomY - p.headH * 0.048, Math.max(0.9, headRx * 0.035), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.globalAlpha = 1;
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        if (hairStyle === 'buzz') {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = d.hair;
            if (view === 'side') {
                ctx.beginPath();
                ctx.ellipse(w * 0.42, p.headH * 0.25, headRx * 0.70, headRy * 0.26, 0, Math.PI, 0);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.82, headRx * 0.90, headRy * 0.34, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        if (hairStyle === 'low-cut') {
            ctx.save();
            ctx.fillStyle = d.hair;
            ctx.globalAlpha = 0.62;
            if (view === 'side') {
                ctx.beginPath();
                ctx.ellipse(w * 0.41, p.headH * 0.22, headRx * 0.70, headRy * 0.24, 0, Math.PI, 0);
                ctx.fill();
                ctx.globalAlpha = 0.9;
                ctx.fillRect(w * 0.26, p.headH * 0.24, w * 0.28, p.headH * 0.035);
            } else {
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.82, headRx * 0.92, headRy * 0.30, 0, Math.PI, 0);
                ctx.fill();
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.56, p.headH * 0.30);
                ctx.lineTo(cx + headRx * 0.56, p.headH * 0.30);
                ctx.lineTo(cx + headRx * 0.46, p.headH * 0.34);
                ctx.lineTo(cx - headRx * 0.46, p.headH * 0.34);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        if (hairStyle === 'short') {
            ctx.save();
            ctx.fillStyle = d.hair;
            ctx.strokeStyle = hairShade;
            ctx.lineCap = 'round';
            if (view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.18, p.headH * 0.30);
                ctx.quadraticCurveTo(w * 0.22, p.headH * 0.07, w * 0.42, p.headH * 0.06);
                ctx.quadraticCurveTo(w * 0.62, p.headH * 0.07, w * 0.66, p.headH * 0.30);
                ctx.quadraticCurveTo(w * 0.56, p.headH * 0.24, w * 0.44, p.headH * 0.27);
                ctx.quadraticCurveTo(w * 0.32, p.headH * 0.23, w * 0.18, p.headH * 0.30);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 0.65;
                ctx.lineWidth = d.ow * 0.50;
                for (let i = 0; i < 4; i++) {
                    const sx = w * (0.28 + i * 0.08);
                    ctx.beginPath();
                    ctx.moveTo(sx, p.headH * 0.12 + i * p.headH * 0.012);
                    ctx.quadraticCurveTo(sx + w * 0.025, p.headH * 0.20, sx - w * 0.012, p.headH * 0.29);
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.82, p.headH * 0.31);
                ctx.quadraticCurveTo(cx - headRx * 0.64, p.headH * 0.08, cx - headRx * 0.18, p.headH * 0.08);
                ctx.quadraticCurveTo(cx + headRx * 0.34, p.headH * 0.03, cx + headRx * 0.82, p.headH * 0.29);
                ctx.quadraticCurveTo(cx + headRx * 0.46, p.headH * 0.25, cx + headRx * 0.18, p.headH * 0.33);
                ctx.quadraticCurveTo(cx - headRx * 0.28, p.headH * 0.25, cx - headRx * 0.82, p.headH * 0.31);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 0.62;
                ctx.lineWidth = d.ow * 0.50;
                [-0.48, -0.24, 0, 0.24, 0.48].forEach((offset, index) => {
                    const sx = cx + headRx * offset;
                    ctx.beginPath();
                    ctx.moveTo(sx, p.headH * (0.10 + Math.abs(offset) * 0.05));
                    ctx.quadraticCurveTo(sx + headRx * (offset < 0 ? -0.08 : 0.08), p.headH * 0.20, sx - headRx * offset * 0.12, p.headH * 0.32);
                    ctx.stroke();
                });
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = this._ucShadeColor(d.hair, -0.05);
                ctx.beginPath();
                ctx.ellipse(cx, p.headH * 0.23, headRx * 0.52, headRy * 0.11, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        if (hairStyle === 'waves') {
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.95;
            ctx.lineCap = 'round';
            const rows = view === 'side'
                ? [
                    [w * 0.34, p.headH * 0.17, w * 0.22],
                    [w * 0.40, p.headH * 0.24, w * 0.24],
                    [w * 0.42, p.headH * 0.31, w * 0.24]
                ]
                : [
                    [cx, p.headH * 0.16, headRx * 1.10],
                    [cx, p.headH * 0.24, headRx * 1.00],
                    [cx, p.headH * 0.32, headRx * 0.88]
                ];
            rows.forEach(([midX, midY, span]) => {
                ctx.beginPath();
                ctx.moveTo(midX - span * 0.5, midY);
                ctx.quadraticCurveTo(midX - span * 0.15, midY - p.headH * 0.03, midX, midY);
                ctx.quadraticCurveTo(midX + span * 0.15, midY + p.headH * 0.03, midX + span * 0.5, midY);
                ctx.stroke();
            });
            ctx.restore();
            return;
        }

        if (hairStyle === 'side-part') {
            ctx.fillStyle = d.hair;
            if (view === 'front') {
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.15, p.headH * 0.22);
                ctx.quadraticCurveTo(cx + headRx * 0.34, p.headH * 0.14, cx + headRx * 0.52, p.headH * 0.36);
                ctx.quadraticCurveTo(cx + headRx * 0.18, p.headH * 0.32, cx - headRx * 0.02, p.headH * 0.40);
                ctx.closePath();
                ctx.fill();
            } else if (view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.46, p.headH * 0.16);
                ctx.quadraticCurveTo(w * 0.60, p.headH * 0.18, w * 0.66, p.headH * 0.30);
                ctx.quadraticCurveTo(w * 0.52, p.headH * 0.28, w * 0.42, p.headH * 0.38);
                ctx.closePath();
                ctx.fill();
            }
            return;
        }

        if (hairStyle === 'cornrows') {
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 1.05;
            ctx.lineCap = 'round';
            const rows = view === 'side'
                ? [0.24, 0.34, 0.44, 0.54]
                : [0.22, 0.34, 0.46, 0.58, 0.70];
            rows.forEach(ratio => {
                ctx.beginPath();
                if (view === 'side') {
                    ctx.moveTo(w * ratio, p.headH * 0.14);
                    ctx.quadraticCurveTo(w * (ratio + 0.06), p.headH * 0.22, w * (ratio + 0.02), p.headH * 0.32);
                } else {
                    const startX = cx + headRx * (ratio - 0.46);
                    ctx.moveTo(startX, p.headH * 0.11);
                    ctx.quadraticCurveTo(startX + headRx * 0.05, p.headH * 0.20, startX, p.headH * 0.32);
                }
                ctx.stroke();
            });
            ctx.restore();
            return;
        }

        if (hairStyle === 'bob' || hairStyle === 'pixie') {
            const drop = hairStyle === 'pixie' ? 0.58 : 0.78;
            if (view !== 'back') {
                ctx.fillStyle = d.hair;
                if (view === 'front') {
                    ctx.beginPath();
                    ctx.moveTo(cx - headRx * 0.94, p.headH * 0.34);
                    ctx.quadraticCurveTo(cx - headRx * 1.02, p.headH * 0.54, cx - headRx * 0.78, p.headH * drop);
                    ctx.lineTo(cx - headRx * 0.56, p.headH * drop);
                    ctx.quadraticCurveTo(cx - headRx * 0.72, p.headH * 0.54, cx - headRx * 0.62, p.headH * 0.34);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(cx + headRx * 0.94, p.headH * 0.34);
                    ctx.quadraticCurveTo(cx + headRx * 1.02, p.headH * 0.54, cx + headRx * 0.78, p.headH * drop);
                    ctx.lineTo(cx + headRx * 0.56, p.headH * drop);
                    ctx.quadraticCurveTo(cx + headRx * 0.72, p.headH * 0.54, cx + headRx * 0.62, p.headH * 0.34);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.22, p.headH * 0.30);
                    ctx.quadraticCurveTo(w * 0.12, p.headH * 0.56, w * 0.28, p.headH * drop);
                    ctx.lineTo(w * 0.42, p.headH * drop);
                    ctx.quadraticCurveTo(w * 0.34, p.headH * 0.48, w * 0.26, p.headH * 0.34);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            return;
        }

        if (hairStyle === 'braids' || hairStyle === 'locs') {
            const strandWidth = hairStyle === 'locs' ? headRx * 0.14 : headRx * 0.10;
            const strandDrop = hairStyle === 'locs' ? 0.98 : 0.92;
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const strands = view === 'side'
                    ? [
                        [w * 0.20, p.headH * 0.30, 1.0],
                        [w * 0.28, p.headH * 0.32, 0.9],
                        [w * 0.36, p.headH * 0.36, 0.8]
                    ]
                    : [
                        [cx - headRx * 0.72, p.headH * 0.30, 1.0],
                        [cx - headRx * 0.48, p.headH * 0.32, 0.9],
                        [cx + headRx * 0.48, p.headH * 0.32, 0.9],
                        [cx + headRx * 0.72, p.headH * 0.30, 1.0]
                    ];
                strands.forEach(([sx, sy, scale]) => {
                    const sw = strandWidth * scale;
                    ctx.beginPath();
                    ctx.moveTo(sx - sw * 0.46, sy);
                    ctx.quadraticCurveTo(sx - sw * 0.70, p.headH * 0.58, sx - sw * 0.28, p.headH * strandDrop);
                    ctx.lineTo(sx + sw * 0.28, p.headH * strandDrop);
                    ctx.quadraticCurveTo(sx + sw * 0.70, p.headH * 0.58, sx + sw * 0.46, sy);
                    ctx.closePath();
                    ctx.fill();
                });
                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.55;
                strands.forEach(([sx, sy, scale]) => {
                    const sw = strandWidth * scale;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy + p.headH * 0.02);
                    ctx.lineTo(sx, p.headH * strandDrop - p.headH * 0.03);
                    ctx.moveTo(sx - sw * 0.18, sy + p.headH * 0.05);
                    ctx.lineTo(sx - sw * 0.12, p.headH * strandDrop - p.headH * 0.08);
                    ctx.moveTo(sx + sw * 0.18, sy + p.headH * 0.05);
                    ctx.lineTo(sx + sw * 0.12, p.headH * strandDrop - p.headH * 0.08);
                    ctx.stroke();
                });
            });
            drawVisibleHangingStrands(
                view === 'side'
                    ? [
                        [w * 0.18, p.headH * 0.31, 0.78, -headRx * 0.01],
                        [w * 0.28, p.headH * 0.35, 0.68, -headRx * 0.01]
                    ]
                    : [
                        [cx - headRx * 0.90, p.headH * 0.30, 0.86, -headRx * 0.03],
                        [cx + headRx * 0.90, p.headH * 0.30, 0.86, headRx * 0.03]
                    ],
                strandWidth,
                strandDrop,
                { alpha: 0.88, lineScale: 0.38, minOuter: 0.78 }
            );
            return;
        }

        if (hairStyle === 'side-braid') {
            const braidX = view === 'side' ? w * 0.20 : cx + headRx * 0.72;
            const startY = p.headH * 0.28;
            const endRatio = 1.05;
            const sw = headRx * 0.18;
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const endY = p.headH * endRatio;
                ctx.beginPath();
                ctx.moveTo(braidX - sw * 0.50, startY);
                ctx.quadraticCurveTo(braidX + sw * 0.35, p.headH * 0.55, braidX - sw * 0.12, endY);
                ctx.lineTo(braidX + sw * 0.30, endY);
                ctx.quadraticCurveTo(braidX + sw * 0.72, p.headH * 0.56, braidX + sw * 0.44, startY);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.55;
                for (let t = 0.16; t < 0.86; t += 0.13) {
                    const y = startY + (endY - startY) * t;
                    ctx.beginPath();
                    ctx.moveTo(braidX - sw * 0.28, y - p.headH * 0.025);
                    ctx.lineTo(braidX + sw * 0.28, y + p.headH * 0.025);
                    ctx.moveTo(braidX + sw * 0.28, y - p.headH * 0.025);
                    ctx.lineTo(braidX - sw * 0.28, y + p.headH * 0.025);
                    ctx.stroke();
                }
            });
            drawVisibleHangingStrands(
                [[view === 'side' ? braidX : cx + headRx * 0.94, startY + p.headH * 0.02, 1.05, view === 'side' ? -headRx * 0.04 : headRx * 0.04]],
                sw,
                endRatio,
                { alpha: 0.88, lineScale: 0.38, minOuter: 0.84 }
            );
            return;
        }

        if (hairStyle === 'bantu-knots') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const knots = view === 'side'
                    ? [
                        [w * 0.28, p.headH * 0.12, headRx * 0.18],
                        [w * 0.42, p.headH * 0.08, headRx * 0.20],
                        [w * 0.56, p.headH * 0.14, headRx * 0.17]
                    ]
                    : [
                        [cx - headRx * 0.44, p.headH * 0.12, headRx * 0.17],
                        [cx - headRx * 0.14, p.headH * 0.06, headRx * 0.19],
                        [cx + headRx * 0.18, p.headH * 0.06, headRx * 0.19],
                        [cx + headRx * 0.48, p.headH * 0.12, headRx * 0.17]
                    ];
                knots.forEach(([kx, ky, kr]) => {
                    ctx.beginPath();
                    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.45;
                knots.forEach(([kx, ky, kr]) => {
                    ctx.beginPath();
                    ctx.arc(kx, ky, kr * 0.54, 0, Math.PI * 2);
                    ctx.stroke();
                });
            });
            return;
        }

        if (hairStyle === 'high-puff') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.arc(w * 0.42, p.headH * 0.10, headRx * 0.44, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(cx, p.headH * 0.08, headRx * 0.54, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.fillStyle = d.hair;
            if (view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.30, p.headH * 0.22);
                ctx.quadraticCurveTo(w * 0.38, p.headH * 0.18, w * 0.48, p.headH * 0.24);
                ctx.quadraticCurveTo(w * 0.44, p.headH * 0.34, w * 0.32, p.headH * 0.34);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.48, p.headH * 0.22);
                ctx.quadraticCurveTo(cx, p.headH * 0.14, cx + headRx * 0.48, p.headH * 0.22);
                ctx.quadraticCurveTo(cx + headRx * 0.36, p.headH * 0.34, cx, p.headH * 0.30);
                ctx.quadraticCurveTo(cx - headRx * 0.36, p.headH * 0.34, cx - headRx * 0.48, p.headH * 0.22);
                ctx.closePath();
                ctx.fill();
            }
            return;
        }

        if (hairStyle === 'ponytail' || hairStyle === 'bun') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (hairStyle === 'bun') {
                    const bunX = view === 'side' ? w * 0.22 : cx;
                    const bunY = p.headH * 0.24;
                    ctx.beginPath();
                    ctx.arc(bunX, bunY, headRx * 0.22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = hairShade;
                    ctx.lineWidth = d.ow * 0.55;
                    ctx.stroke();
                    return;
                }
                if (view === 'front') {
                    ctx.beginPath();
                    ctx.moveTo(cx + headRx * 0.50, p.headH * 0.30);
                    ctx.quadraticCurveTo(cx + headRx * 0.98, p.headH * 0.46, cx + headRx * 0.74, p.headH * 0.86);
                    ctx.quadraticCurveTo(cx + headRx * 0.42, p.headH * 0.74, cx + headRx * 0.34, p.headH * 0.48);
                    ctx.closePath();
                    ctx.fill();
                } else if (view === 'side') {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.22, p.headH * 0.32);
                    ctx.quadraticCurveTo(w * 0.06, p.headH * 0.48, w * 0.18, p.headH * 0.84);
                    ctx.quadraticCurveTo(w * 0.28, p.headH * 0.68, w * 0.30, p.headH * 0.46);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(cx, p.headH * 0.28);
                    ctx.quadraticCurveTo(cx + headRx * 0.34, p.headH * 0.46, cx + headRx * 0.12, p.headH * 0.90);
                    ctx.quadraticCurveTo(cx, p.headH * 0.82, cx - headRx * 0.12, p.headH * 0.90);
                    ctx.quadraticCurveTo(cx - headRx * 0.34, p.headH * 0.46, cx, p.headH * 0.28);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.fillStyle = d.hair;
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = Math.max(0.5, d.ow * 0.5);
            if (hairStyle === 'bun') {
                const bunX = view === 'side' ? w * 0.30 : cx;
                const bunY = p.headH * 0.08;
                ctx.beginPath();
                ctx.arc(bunX, bunY, headRx * 0.20, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            if (view !== 'back') {
                ctx.globalAlpha = 0.72;
                ctx.beginPath();
                if (view === 'side') {
                    ctx.ellipse(w * 0.42, p.headH * 0.22, headRx * 0.62, headRy * 0.24, 0, Math.PI, 0);
                } else {
                    ctx.ellipse(cx, p.headH * 0.20, headRx * 0.86, headRy * 0.24, 0, Math.PI, 0);
                }
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            ctx.restore();
            return;
        }

        if (hairStyle === 'dreadlock-bun') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const bunX = view === 'side' ? w * 0.28 : cx;
                const bunY = p.headH * 0.12;
                ctx.beginPath();
                ctx.arc(bunX, bunY, headRx * 0.30, 0, Math.PI * 2);
                ctx.fill();

                const strands = view === 'side'
                    ? [[w * 0.18, p.headH * 0.26], [w * 0.28, p.headH * 0.24], [w * 0.38, p.headH * 0.28]]
                    : [[cx - headRx * 0.64, p.headH * 0.30], [cx - headRx * 0.38, p.headH * 0.28], [cx + headRx * 0.38, p.headH * 0.28], [cx + headRx * 0.64, p.headH * 0.30]];
                const sw = headRx * 0.105;
                strands.forEach(([sx, sy], index) => {
                    const drop = p.headH * (0.72 + (index % 2) * 0.10);
                    ctx.beginPath();
                    ctx.moveTo(sx - sw * 0.42, sy);
                    ctx.quadraticCurveTo(sx - sw * 0.62, (sy + drop) / 2, sx - sw * 0.24, drop);
                    ctx.lineTo(sx + sw * 0.24, drop);
                    ctx.quadraticCurveTo(sx + sw * 0.62, (sy + drop) / 2, sx + sw * 0.42, sy);
                    ctx.closePath();
                    ctx.fill();
                });

                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.50;
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.arc(bunX, bunY, headRx * 0.18, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            });
            drawVisibleHangingStrands(
                view === 'side'
                    ? [[w * 0.20, p.headH * 0.27, 0.72, -headRx * 0.01]]
                    : [[cx - headRx * 0.82, p.headH * 0.30, 0.72, -headRx * 0.02], [cx + headRx * 0.82, p.headH * 0.30, 0.72, headRx * 0.02]],
                headRx * 0.105,
                0.84,
                { alpha: 0.86, lineScale: 0.36, minOuter: 0.76 }
            );
            return;
        }

        // ── Fade ──
        if (hairStyle === 'fade') {
            ctx.save();
            if (view === 'side') {
                const grd = ctx.createLinearGradient(0, p.headH * 0.38, 0, p.headH * 0.14);
                grd.addColorStop(0, 'transparent');
                grd.addColorStop(1, d.hair);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.ellipse(w * 0.42, p.headH * 0.22, headRx * 0.68, headRy * 0.28, 0, Math.PI, 0);
                ctx.fill();
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = d.hair;
                ctx.beginPath();
                ctx.ellipse(w * 0.42, p.headH * 0.14, headRx * 0.50, headRy * 0.12, 0, Math.PI, 0);
                ctx.fill();
            } else {
                const grd = ctx.createLinearGradient(0, p.headH * 0.40, 0, p.headH * 0.14);
                grd.addColorStop(0, 'transparent');
                grd.addColorStop(1, d.hair);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.80, headRx * 0.92, headRy * 0.30, 0, Math.PI, 0);
                ctx.fill();
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = d.hair;
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.72, headRx * 0.62, headRy * 0.16, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        // ── High Top Fade ──
        if (hairStyle === 'high-top') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.28, p.headH * 0.28);
                    ctx.lineTo(w * 0.26, p.headH * -0.04);
                    ctx.lineTo(w * 0.54, p.headH * -0.04);
                    ctx.lineTo(w * 0.56, p.headH * 0.28);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(cx - headRx * 0.56, p.headH * 0.24);
                    ctx.lineTo(cx - headRx * 0.50, p.headH * -0.06);
                    ctx.lineTo(cx + headRx * 0.50, p.headH * -0.06);
                    ctx.lineTo(cx + headRx * 0.56, p.headH * 0.24);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = d.hair;
            if (view === 'side') {
                ctx.beginPath();
                ctx.ellipse(w * 0.42, p.headH * 0.30, headRx * 0.58, headRy * 0.14, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.82, headRx * 0.88, headRy * 0.22, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        // ── Twists (two-strand) ──
        if (hairStyle === 'twists') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const strands = view === 'side'
                    ? [
                        [w * 0.22, p.headH * 0.18, 0.55],
                        [w * 0.30, p.headH * 0.15, 0.60],
                        [w * 0.38, p.headH * 0.14, 0.65],
                        [w * 0.46, p.headH * 0.18, 0.55]
                    ]
                    : [
                        [cx - headRx * 0.68, p.headH * 0.22, 0.50],
                        [cx - headRx * 0.40, p.headH * 0.16, 0.60],
                        [cx - headRx * 0.12, p.headH * 0.14, 0.65],
                        [cx + headRx * 0.16, p.headH * 0.14, 0.65],
                        [cx + headRx * 0.44, p.headH * 0.16, 0.60],
                        [cx + headRx * 0.72, p.headH * 0.22, 0.50]
                    ];
                const sw = headRx * 0.08;
                strands.forEach(([sx, sy, drop]) => {
                    ctx.beginPath();
                    ctx.moveTo(sx - sw, sy);
                    ctx.quadraticCurveTo(sx - sw * 1.3, p.headH * (drop * 0.6), sx - sw * 0.5, p.headH * drop);
                    ctx.lineTo(sx + sw * 0.5, p.headH * drop);
                    ctx.quadraticCurveTo(sx + sw * 1.3, p.headH * (drop * 0.6), sx + sw, sy);
                    ctx.closePath();
                    ctx.fill();
                });
                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.4;
                strands.forEach(([sx, sy, drop]) => {
                    for (let t = 0.15; t < 0.85; t += 0.22) {
                        const ty = sy + (p.headH * drop - sy) * t;
                        ctx.beginPath();
                        ctx.moveTo(sx - sw * 0.4, ty);
                        ctx.lineTo(sx + sw * 0.4, ty + p.headH * 0.015);
                        ctx.stroke();
                    }
                });
            });
            return;
        }

        // ── Mohawk ──
        if (hairStyle === 'mohawk') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.22, p.headH * 0.30);
                    ctx.quadraticCurveTo(w * 0.30, p.headH * -0.06, w * 0.50, p.headH * 0.04);
                    ctx.quadraticCurveTo(w * 0.62, p.headH * 0.16, w * 0.56, p.headH * 0.38);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(cx - headRx * 0.18, p.headH * 0.26);
                    ctx.quadraticCurveTo(cx - headRx * 0.12, p.headH * -0.06, cx, p.headH * -0.08);
                    ctx.quadraticCurveTo(cx + headRx * 0.12, p.headH * -0.06, cx + headRx * 0.18, p.headH * 0.26);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = d.hair;
            if (view !== 'side') {
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.82, headRx * 0.86, headRy * 0.18, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        // ── Twist Out ──
        if (hairStyle === 'twist-out') {
            const puffScale = 1.10;
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const puffs = view === 'side'
                    ? [
                        [w * 0.24, p.headH * 0.14, headRx * 0.30],
                        [w * 0.40, p.headH * 0.08, headRx * 0.34],
                        [w * 0.56, p.headH * 0.16, headRx * 0.28],
                        [w * 0.18, p.headH * 0.34, headRx * 0.24]
                    ]
                    : [
                        [cx - headRx * 0.66, p.headH * 0.18, headRx * 0.30],
                        [cx - headRx * 0.28, p.headH * 0.06, headRx * 0.34],
                        [cx + headRx * 0.22, p.headH * 0.04, headRx * 0.36],
                        [cx + headRx * 0.62, p.headH * 0.18, headRx * 0.30],
                        [cx, p.headH * 0.00, headRx * 0.28]
                    ];
                puffs.forEach(([px, py, pr]) => {
                    ctx.beginPath();
                    ctx.arc(px, py, pr * puffScale, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.5;
            ctx.globalAlpha = 0.4;
            const rows = view === 'side' ? 3 : 4;
            for (let i = 0; i < rows; i++) {
                const y = p.headH * (0.06 + i * 0.08);
                const startX = view === 'side' ? w * 0.22 : cx - headRx * 0.60;
                const endX = view === 'side' ? w * 0.58 : cx + headRx * 0.60;
                ctx.beginPath();
                ctx.moveTo(startX, y);
                for (let x = startX; x < endX; x += headRx * 0.12) {
                    ctx.lineTo(x + headRx * 0.06, y - p.headH * 0.015);
                    ctx.lineTo(x + headRx * 0.12, y + p.headH * 0.015);
                }
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        // ── Box Braids ──
        if (hairStyle === 'box-braids') {
            const strandWidth = headRx * 0.12;
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const strands = view === 'side'
                    ? [
                        [w * 0.16, p.headH * 0.28, 1.0],
                        [w * 0.24, p.headH * 0.26, 0.95],
                        [w * 0.32, p.headH * 0.30, 0.90],
                        [w * 0.40, p.headH * 0.34, 0.85]
                    ]
                    : [
                        [cx - headRx * 0.80, p.headH * 0.28, 1.0],
                        [cx - headRx * 0.56, p.headH * 0.26, 0.95],
                        [cx - headRx * 0.32, p.headH * 0.28, 0.90],
                        [cx + headRx * 0.32, p.headH * 0.28, 0.90],
                        [cx + headRx * 0.56, p.headH * 0.26, 0.95],
                        [cx + headRx * 0.80, p.headH * 0.28, 1.0]
                    ];
                strands.forEach(([sx, sy, scale]) => {
                    const sw = strandWidth * scale;
                    ctx.beginPath();
                    ctx.moveTo(sx - sw * 0.5, sy);
                    ctx.quadraticCurveTo(sx - sw * 0.7, p.headH * 0.62, sx - sw * 0.3, p.headH * 1.05);
                    ctx.lineTo(sx + sw * 0.3, p.headH * 1.05);
                    ctx.quadraticCurveTo(sx + sw * 0.7, p.headH * 0.62, sx + sw * 0.5, sy);
                    ctx.closePath();
                    ctx.fill();
                });
                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.4;
                strands.forEach(([sx, sy, scale]) => {
                    const sw = strandWidth * scale;
                    for (let t = 0.12; t < 0.90; t += 0.10) {
                        const ty = sy + (p.headH * 1.05 - sy) * t;
                        ctx.beginPath();
                        ctx.moveTo(sx - sw * 0.3, ty);
                        ctx.lineTo(sx + sw * 0.3, ty + p.headH * 0.02);
                        ctx.stroke();
                    }
                });
            });
            drawVisibleHangingStrands(
                view === 'side'
                    ? [[w * 0.16, p.headH * 0.27, 0.82, -headRx * 0.01], [w * 0.26, p.headH * 0.31, 0.72, -headRx * 0.01]]
                    : [[cx - headRx * 0.90, p.headH * 0.28, 0.82, -headRx * 0.025], [cx - headRx * 1.06, p.headH * 0.32, 0.74, -headRx * 0.03], [cx + headRx * 0.90, p.headH * 0.28, 0.82, headRx * 0.025], [cx + headRx * 1.06, p.headH * 0.32, 0.74, headRx * 0.03]],
                strandWidth,
                1.05,
                { alpha: 0.86, lineScale: 0.34, minOuter: 0.82 }
            );
            return;
        }

        // ── Goddess Locs ──
        if (hairStyle === 'goddess-locs') {
            const strandWidth = headRx * 0.14;
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const strands = view === 'side'
                    ? [
                        [w * 0.18, p.headH * 0.28, 1.0],
                        [w * 0.28, p.headH * 0.30, 0.90],
                        [w * 0.38, p.headH * 0.34, 0.85]
                    ]
                    : [
                        [cx - headRx * 0.72, p.headH * 0.28, 1.0],
                        [cx - headRx * 0.40, p.headH * 0.30, 0.92],
                        [cx + headRx * 0.40, p.headH * 0.30, 0.92],
                        [cx + headRx * 0.72, p.headH * 0.28, 1.0]
                    ];
                strands.forEach(([sx, sy, scale]) => {
                    const sw = strandWidth * scale;
                    ctx.beginPath();
                    ctx.moveTo(sx - sw * 0.46, sy);
                    ctx.quadraticCurveTo(sx - sw * 0.70, p.headH * 0.58, sx - sw * 0.28, p.headH * 1.0);
                    ctx.lineTo(sx + sw * 0.28, p.headH * 1.0);
                    ctx.quadraticCurveTo(sx + sw * 0.70, p.headH * 0.58, sx + sw * 0.46, sy);
                    ctx.closePath();
                    ctx.fill();
                });
                ctx.strokeStyle = hairShade;
                ctx.lineWidth = d.ow * 0.6;
                ctx.globalAlpha = 0.5;
                strands.forEach(([sx, sy]) => {
                    ctx.beginPath();
                    ctx.moveTo(sx, sy + p.headH * 0.05);
                    for (let t = 0.15; t < 0.80; t += 0.12) {
                        const ty = sy + (p.headH * 1.0 - sy) * t;
                        const xOff = (t % 0.24 < 0.12 ? -1 : 1) * strandWidth * 0.35;
                        ctx.quadraticCurveTo(sx + xOff, ty, sx, ty + p.headH * 0.04);
                    }
                    ctx.stroke();
                });
                ctx.globalAlpha = 1;
            });
            drawVisibleHangingStrands(
                view === 'side'
                    ? [[w * 0.18, p.headH * 0.30, 0.82, -headRx * 0.01], [w * 0.28, p.headH * 0.34, 0.70, -headRx * 0.01]]
                    : [[cx - headRx * 0.88, p.headH * 0.30, 0.82, -headRx * 0.02], [cx + headRx * 0.88, p.headH * 0.30, 0.82, headRx * 0.02]],
                strandWidth,
                1.0,
                { alpha: 0.86, lineScale: 0.44, minOuter: 0.80 }
            );
            return;
        }

        // ── Flat Twist ──
        if (hairStyle === 'flat-twist') {
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 1.3;
            ctx.lineCap = 'round';
            const ftRows = view === 'side'
                ? [0.24, 0.36, 0.48]
                : [0.20, 0.34, 0.48, 0.62, 0.76];
            ftRows.forEach(ratio => {
                ctx.beginPath();
                if (view === 'side') {
                    ctx.moveTo(w * ratio, p.headH * 0.14);
                    ctx.quadraticCurveTo(w * (ratio + 0.08), p.headH * 0.22, w * (ratio + 0.03), p.headH * 0.32);
                } else {
                    const startX = cx + headRx * (ratio - 0.48);
                    ctx.moveTo(startX, p.headH * 0.10);
                    ctx.quadraticCurveTo(startX + headRx * 0.06, p.headH * 0.20, startX, p.headH * 0.32);
                }
                ctx.stroke();
            });
            ctx.lineWidth = d.ow * 0.5;
            ctx.globalAlpha = 0.5;
            ftRows.forEach(ratio => {
                for (let t = 0.16; t < 0.30; t += 0.05) {
                    const y = p.headH * t;
                    const x = view === 'side' ? w * (ratio + 0.02) : cx + headRx * (ratio - 0.46);
                    ctx.beginPath();
                    ctx.moveTo(x - headRx * 0.03, y);
                    ctx.lineTo(x + headRx * 0.03, y + p.headH * 0.02);
                    ctx.stroke();
                }
            });
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        // Fabric headgear: gele, turban, Ankara wrap, and tall ceremonial wraps.
        if (['headwrap', 'gele', 'gele-pleated', 'beaded-gele', 'turban-wrap', 'ankara-wrap', 'tall-headwrap'].includes(hairStyle)) {
            const clothing = this._ucGetClothing(d);
            const primary = d.hair || clothing.accentColor || '#245B72';
            const accent = d.headwearAccentColor || clothing.accentColor || clothing.bottomColor || this._ucShadeColor(primary, 0.22);
            const pattern = d.headwearPatternColor || clothing.bottomColor || this._ucShadeColor(primary, 0.34);
            const shade = this._ucShadeColor(primary, -0.24);
            const light = this._ucShadeColor(primary, 0.22);
            const wrapScale = hairStyle === 'gele' ? 1.14
                : (hairStyle === 'gele-pleated' || hairStyle === 'beaded-gele' ? 1.34
                    : (hairStyle === 'tall-headwrap' ? 1.42 : 1.00));
            const wrapBrowY = p.headH * (view === 'side' ? 0.342 : 0.338);
            const wrapSideY = wrapBrowY - p.headH * 0.006;
            const wrapFrontY = wrapBrowY - p.headH * 0.048;
            const isSide = view === 'side';
            const centerX = isSide ? w * 0.40 : cx;
            const drawPatternBand = (x0, y0, x1, y1, count = 5) => {
                ctx.save();
                ctx.strokeStyle = pattern;
                ctx.fillStyle = accent;
                ctx.lineWidth = Math.max(0.8, d.ow * 0.60);
                ctx.globalAlpha = 0.86;
                for (let i = 0; i < count; i++) {
                    const t0 = i / count;
                    const t1 = (i + 0.5) / count;
                    const sx = x0 + (x1 - x0) * t0;
                    const sy = y0 + (y1 - y0) * t0;
                    const mx = x0 + (x1 - x0) * t1;
                    const my = y0 + (y1 - y0) * t1;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(mx, my);
                    ctx.stroke();
                    if (hairStyle === 'ankara-wrap' || hairStyle === 'tall-headwrap') {
                        ctx.beginPath();
                        ctx.arc(mx, my, Math.max(1, headRx * 0.035), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            };

            drawBehind(() => {
                ctx.fillStyle = primary;
                if (hairStyle === 'tall-headwrap') {
                    ctx.beginPath();
                    if (isSide) {
                        ctx.moveTo(w * 0.14, wrapSideY);
                        ctx.lineTo(w * 0.20, p.headH * -0.26);
                        ctx.quadraticCurveTo(w * 0.46, p.headH * -0.42, w * 0.74, p.headH * -0.16);
                        ctx.lineTo(w * 0.72, wrapSideY + p.headH * 0.010);
                        ctx.quadraticCurveTo(w * 0.44, p.headH * 0.16, w * 0.14, wrapSideY);
                    } else {
                        ctx.moveTo(cx - headRx * 1.22, wrapSideY);
                        ctx.lineTo(cx - headRx * 1.48, p.headH * -0.22);
                        ctx.quadraticCurveTo(cx, p.headH * -0.50, cx + headRx * 1.48, p.headH * -0.22);
                        ctx.lineTo(cx + headRx * 1.22, wrapSideY);
                        ctx.quadraticCurveTo(cx, p.headH * 0.12, cx - headRx * 1.22, wrapSideY);
                    }
                    ctx.closePath();
                    ctx.fill();
                    return;
                }
                if (isSide) {
                    ctx.beginPath();
                    ctx.ellipse(centerX, p.headH * (hairStyle.includes('gele') ? 0.15 : 0.20), headRx * 0.86 * wrapScale, headRy * 0.42 * wrapScale, -0.08, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.ellipse(cx, p.headH * (hairStyle.includes('gele') ? 0.11 : 0.16), headRx * 1.08 * wrapScale, headRy * 0.42 * wrapScale, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.fillStyle = primary;
            ctx.strokeStyle = shade;
            ctx.lineWidth = Math.max(1, d.ow * 0.78);
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            if (isSide) {
                ctx.beginPath();
                ctx.moveTo(w * 0.15, wrapSideY - p.headH * 0.010);
                ctx.quadraticCurveTo(w * 0.36, p.headH * -0.10 * wrapScale, w * 0.70, p.headH * (hairStyle.includes('gele') ? 0.17 : 0.24));
                ctx.quadraticCurveTo(w * 0.60, wrapBrowY - p.headH * 0.002, w * 0.22, wrapSideY);
                ctx.quadraticCurveTo(w * 0.16, wrapSideY - p.headH * 0.002, w * 0.15, wrapSideY - p.headH * 0.010);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(w * (hairStyle === 'turban-wrap' || hairStyle === 'ankara-wrap' ? 0.34 : 0.54), p.headH * 0.045, headRx * 0.18 * wrapScale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 1.04 * wrapScale, wrapSideY);
                ctx.quadraticCurveTo(cx - headRx * 0.66, p.headH * -0.10 * wrapScale, cx, p.headH * -0.01);
                ctx.quadraticCurveTo(cx + headRx * 0.66, p.headH * -0.10 * wrapScale, cx + headRx * 1.04 * wrapScale, wrapSideY);
                ctx.quadraticCurveTo(cx + headRx * 0.50, wrapSideY, cx, wrapFrontY);
                ctx.quadraticCurveTo(cx - headRx * 0.50, wrapSideY, cx - headRx * 1.04 * wrapScale, wrapSideY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                const knotX = hairStyle === 'turban-wrap' || hairStyle === 'ankara-wrap' ? cx - headRx * 0.22 : cx + headRx * 0.32;
                ctx.arc(knotX, p.headH * 0.025, headRx * 0.16 * wrapScale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            if (hairStyle === 'gele-pleated' || hairStyle === 'beaded-gele' || hairStyle === 'gele') {
                ctx.strokeStyle = light;
                ctx.globalAlpha = 0.78;
                for (let i = 0; i < (hairStyle === 'gele' ? 5 : 8); i++) {
                    const inset = i * 0.095;
                    ctx.beginPath();
                    if (isSide) {
                        ctx.ellipse(centerX + headRx * 0.03, p.headH * (0.13 + i * 0.012), headRx * (0.76 * wrapScale - inset), headRy * (0.36 * wrapScale - inset * 0.30), -0.10, Math.PI * 1.08, Math.PI * 1.94);
                    } else {
                        ctx.ellipse(cx, p.headH * (0.12 + i * 0.010), headRx * (1.00 * wrapScale - inset), headRy * (0.36 * wrapScale - inset * 0.28), 0, Math.PI * 1.03, Math.PI * 1.97);
                    }
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else {
                ctx.strokeStyle = light;
                ctx.globalAlpha = 0.76;
                const bandPairs = isSide
                    ? [
                        [w * 0.16, wrapSideY - p.headH * 0.02, w * 0.64, p.headH * 0.08],
                        [w * 0.20, p.headH * 0.13, w * 0.66, wrapSideY - p.headH * 0.01]
                    ]
                    : [
                        [cx - headRx * 0.96, wrapSideY - p.headH * 0.01, cx + headRx * 0.72, p.headH * 0.02],
                        [cx - headRx * 0.70, p.headH * 0.03, cx + headRx * 0.88, wrapSideY - p.headH * 0.02]
                    ];
                bandPairs.forEach(([x0, y0, x1, y1]) => {
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.quadraticCurveTo((x0 + x1) * 0.5, Math.min(y0, y1) - p.headH * 0.045, x1, y1);
                    ctx.stroke();
                });
                ctx.globalAlpha = 1;
            }

            if (hairStyle === 'ankara-wrap' || hairStyle === 'tall-headwrap') {
                drawPatternBand(
                    isSide ? w * 0.18 : cx - headRx * 0.98,
                    wrapSideY - p.headH * 0.030,
                    isSide ? w * 0.68 : cx + headRx * 0.98,
                    wrapFrontY + p.headH * 0.016,
                    7
                );
            }
            if (hairStyle === 'beaded-gele') {
                ctx.save();
                ctx.fillStyle = pattern;
                ctx.strokeStyle = shade;
                ctx.globalAlpha = 0.95;
                const beadX = isSide ? w * 0.60 : cx + headRx * 0.62;
                const beadY = p.headH * 0.09;
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3 - row; col++) {
                        ctx.beginPath();
                        ctx.arc(beadX + col * headRx * 0.12, beadY + row * p.headH * 0.040, Math.max(1.3, headRx * 0.045), 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = shade;
            ctx.lineWidth = d.ow * 1.2;
            ctx.globalAlpha = 0.4;
            if (isSide) {
                ctx.beginPath();
                ctx.moveTo(w * 0.14, wrapSideY);
                ctx.quadraticCurveTo(w * 0.40, wrapBrowY, w * 0.66, wrapFrontY + p.headH * 0.012);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(w * 0.42, p.headH * 0.055, headRx * 0.14 * wrapScale, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 1.02, wrapSideY);
                ctx.quadraticCurveTo(cx, wrapBrowY, cx + headRx * 1.02, wrapSideY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.28, p.headH * 0.20);
                ctx.quadraticCurveTo(cx, p.headH * 0.15, cx + headRx * 0.28, p.headH * 0.20);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, p.headH * 0.01, headRx * 0.16 * wrapScale, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        // ── Hijab / close head covering ──
        if (hairStyle === 'hijab') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.20, p.headH * 0.18);
                    ctx.quadraticCurveTo(w * 0.44, p.headH * -0.02, w * 0.70, p.headH * 0.18);
                    ctx.quadraticCurveTo(w * 0.72, p.headH * 0.54, w * 0.56, p.headH * 1.02);
                    ctx.lineTo(w * 0.20, p.headH * 1.02);
                    ctx.quadraticCurveTo(w * 0.08, p.headH * 0.62, w * 0.20, p.headH * 0.18);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(cx - headRx * 0.98, p.headH * 0.22);
                    ctx.quadraticCurveTo(cx - headRx * 0.72, p.headH * -0.03, cx, p.headH * 0.00);
                    ctx.quadraticCurveTo(cx + headRx * 0.72, p.headH * -0.03, cx + headRx * 0.98, p.headH * 0.22);
                    ctx.quadraticCurveTo(cx + headRx * 1.10, p.headH * 0.64, cx + headRx * 0.58, p.headH * 1.04);
                    ctx.lineTo(cx - headRx * 0.58, p.headH * 1.04);
                    ctx.quadraticCurveTo(cx - headRx * 1.10, p.headH * 0.64, cx - headRx * 0.98, p.headH * 0.22);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.90;
            ctx.globalAlpha = 0.45;
            if (view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.30, p.headH * 0.30);
                ctx.quadraticCurveTo(w * 0.46, p.headH * 0.48, w * 0.50, p.headH * 0.88);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.54, p.headH * 0.32);
                ctx.quadraticCurveTo(cx, p.headH * 0.44, cx + headRx * 0.54, p.headH * 0.32);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        // ── Finger Waves ──
        if (hairStyle === 'finger-waves') {
            ctx.save();
            ctx.fillStyle = d.hair;
            if (view === 'side') {
                ctx.beginPath();
                ctx.ellipse(w * 0.42, p.headH * 0.24, headRx * 0.64, headRy * 0.28, 0, Math.PI, 0);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.ellipse(cx, headCy * 0.80, headRx * 0.90, headRy * 0.32, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.9;
            ctx.lineCap = 'round';
            const waveRows = view === 'side'
                ? [[p.headH * 0.12, w * 0.24, w * 0.58], [p.headH * 0.20, w * 0.20, w * 0.54], [p.headH * 0.28, w * 0.22, w * 0.50]]
                : [[p.headH * 0.10, cx - headRx * 0.72, cx + headRx * 0.72], [p.headH * 0.18, cx - headRx * 0.80, cx + headRx * 0.80], [p.headH * 0.26, cx - headRx * 0.74, cx + headRx * 0.74]];
            waveRows.forEach(([y, x0, x1]) => {
                ctx.beginPath();
                ctx.moveTo(x0, y);
                const segments = 4;
                const segW = (x1 - x0) / segments;
                for (let i = 0; i < segments; i++) {
                    const cpY = y + (i % 2 === 0 ? -1 : 1) * p.headH * 0.02;
                    ctx.quadraticCurveTo(x0 + segW * (i + 0.5), cpY, x0 + segW * (i + 1), y);
                }
                ctx.stroke();
            });
            ctx.restore();
            return;
        }

        // ── Shoulder Length ──
        if (hairStyle === 'shoulder-length') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.22, p.headH * 0.30);
                    ctx.quadraticCurveTo(w * 0.10, p.headH * 0.56, w * 0.16, p.headH * 0.96);
                    ctx.lineTo(w * 0.44, p.headH * 0.96);
                    ctx.quadraticCurveTo(w * 0.38, p.headH * 0.62, w * 0.34, p.headH * 0.38);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    [
                        [cx - headRx * 0.88, cx - headRx * 0.44],
                        [cx + headRx * 0.44, cx + headRx * 0.88]
                    ].forEach(([innerX, outerX]) => {
                        ctx.beginPath();
                        ctx.moveTo(outerX, p.headH * 0.30);
                        ctx.quadraticCurveTo(outerX + (outerX > cx ? 1 : -1) * headRx * 0.18, p.headH * 0.58, outerX, p.headH * 0.94);
                        ctx.lineTo(innerX, p.headH * 0.94);
                        ctx.quadraticCurveTo(innerX + (innerX > cx ? 1 : -1) * headRx * 0.12, p.headH * 0.58, innerX, p.headH * 0.36);
                        ctx.closePath();
                        ctx.fill();
                    });
                }
            });
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.50;
            ctx.globalAlpha = 0.35;
            if (view !== 'side') {
                ctx.beginPath();
                ctx.moveTo(cx, p.headH * 0.08);
                ctx.lineTo(cx, p.headH * 0.30);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        // ── Long Straight ──
        if (hairStyle === 'long-straight') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.22, p.headH * 0.30);
                    ctx.quadraticCurveTo(w * 0.10, p.headH * 0.60, w * 0.14, p.headH * 1.10);
                    ctx.lineTo(w * 0.42, p.headH * 1.10);
                    ctx.quadraticCurveTo(w * 0.38, p.headH * 0.70, w * 0.34, p.headH * 0.38);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(cx - headRx * 0.90, p.headH * 0.30);
                    ctx.quadraticCurveTo(cx - headRx * 1.06, p.headH * 0.64, cx - headRx * 0.88, p.headH * 1.10);
                    ctx.lineTo(cx - headRx * 0.46, p.headH * 1.10);
                    ctx.quadraticCurveTo(cx - headRx * 0.60, p.headH * 0.58, cx - headRx * 0.58, p.headH * 0.34);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(cx + headRx * 0.90, p.headH * 0.30);
                    ctx.quadraticCurveTo(cx + headRx * 1.06, p.headH * 0.64, cx + headRx * 0.88, p.headH * 1.10);
                    ctx.lineTo(cx + headRx * 0.46, p.headH * 1.10);
                    ctx.quadraticCurveTo(cx + headRx * 0.60, p.headH * 0.58, cx + headRx * 0.58, p.headH * 0.34);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.5;
            ctx.globalAlpha = 0.35;
            if (view !== 'side') {
                ctx.beginPath();
                ctx.moveTo(cx, p.headH * 0.08);
                ctx.lineTo(cx, p.headH * 0.32);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        // ── Sisterlocks ──
        if (hairStyle === 'sister-locs') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const sw = headRx * 0.055;
                const strands = view === 'side'
                    ? [
                        [w * 0.18, p.headH * 0.26], [w * 0.24, p.headH * 0.24],
                        [w * 0.30, p.headH * 0.22], [w * 0.36, p.headH * 0.24],
                        [w * 0.42, p.headH * 0.28], [w * 0.48, p.headH * 0.32]
                    ]
                    : [
                        [cx - headRx * 0.78, p.headH * 0.28], [cx - headRx * 0.60, p.headH * 0.24],
                        [cx - headRx * 0.42, p.headH * 0.22], [cx - headRx * 0.22, p.headH * 0.20],
                        [cx, p.headH * 0.20],
                        [cx + headRx * 0.22, p.headH * 0.20], [cx + headRx * 0.42, p.headH * 0.22],
                        [cx + headRx * 0.60, p.headH * 0.24], [cx + headRx * 0.78, p.headH * 0.28]
                    ];
                strands.forEach(([sx, sy]) => {
                    const dropY = p.headH * 0.86;
                    ctx.beginPath();
                    ctx.moveTo(sx - sw, sy);
                    ctx.quadraticCurveTo(sx - sw * 1.2, (sy + dropY) / 2, sx - sw * 0.6, dropY);
                    ctx.lineTo(sx + sw * 0.6, dropY);
                    ctx.quadraticCurveTo(sx + sw * 1.2, (sy + dropY) / 2, sx + sw, sy);
                    ctx.closePath();
                    ctx.fill();
                });
            });
            drawVisibleHangingStrands(
                view === 'side'
                    ? [[w * 0.16, p.headH * 0.25, 0.70, -headRx * 0.01], [w * 0.25, p.headH * 0.25, 0.64, -headRx * 0.01]]
                    : [[cx - headRx * 0.82, p.headH * 0.25, 0.72, -headRx * 0.01], [cx - headRx * 1.00, p.headH * 0.28, 0.62, -headRx * 0.015], [cx + headRx * 0.82, p.headH * 0.25, 0.72, headRx * 0.01], [cx + headRx * 1.00, p.headH * 0.28, 0.62, headRx * 0.015]],
                headRx * 0.085,
                0.86,
                { alpha: 0.84, lineScale: 0.30, minOuter: 0.78 }
            );
            return;
        }

        // ── Coils / Finger Coils ──
        if (hairStyle === 'coils') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                if (view === 'side') {
                    ctx.beginPath();
                    ctx.ellipse(w * 0.40, p.headH * 0.20, headRx * 0.62, headRy * 0.30, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.ellipse(cx, p.headH * 0.16, headRx * 0.94, headRy * 0.34, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.save();
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = d.ow * 0.6;
            ctx.globalAlpha = 0.45;
            const coilPts = view === 'side'
                ? [[w * 0.28, p.headH * 0.14], [w * 0.40, p.headH * 0.10], [w * 0.52, p.headH * 0.16], [w * 0.34, p.headH * 0.26]]
                : [[cx - headRx * 0.54, p.headH * 0.14], [cx - headRx * 0.18, p.headH * 0.08], [cx + headRx * 0.14, p.headH * 0.06], [cx + headRx * 0.50, p.headH * 0.14], [cx, p.headH * 0.18]];
            coilPts.forEach(([cx2, cy2]) => {
                ctx.beginPath();
                ctx.arc(cx2, cy2, headRx * 0.10, 0, Math.PI * 1.5);
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        if (hairStyle === 'long-curly') {
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const puffs = view === 'side'
                    ? [
                        [w * 0.22, p.headH * 0.18, headRx * 0.32],
                        [w * 0.42, p.headH * 0.08, headRx * 0.36],
                        [w * 0.58, p.headH * 0.18, headRx * 0.30],
                        [w * 0.18, p.headH * 0.42, headRx * 0.27],
                        [w * 0.20, p.headH * 0.72, headRx * 0.22]
                    ]
                    : [
                        [cx - headRx * 0.68, p.headH * 0.20, headRx * 0.32],
                        [cx - headRx * 0.28, p.headH * 0.06, headRx * 0.36],
                        [cx + headRx * 0.22, p.headH * 0.05, headRx * 0.36],
                        [cx + headRx * 0.66, p.headH * 0.20, headRx * 0.32],
                        [cx - headRx * 0.84, p.headH * 0.56, headRx * 0.25],
                        [cx + headRx * 0.84, p.headH * 0.56, headRx * 0.25],
                        [cx - headRx * 0.64, p.headH * 0.86, headRx * 0.21],
                        [cx + headRx * 0.64, p.headH * 0.86, headRx * 0.21]
                    ];
                puffs.forEach(([px, py, pr]) => {
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
            ctx.save();
            ctx.fillStyle = d.hair;
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = Math.max(0.5, d.ow * 0.40);
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.82;
            if (view === 'side') {
                ctx.beginPath();
                ctx.ellipse(w * 0.38, p.headH * 0.18, headRx * 0.56, headRy * 0.20, -0.12, Math.PI, 0);
                ctx.fill();
                [[w * 0.18, p.headH * 0.52, headRx * 0.15], [w * 0.18, p.headH * 0.76, headRx * 0.13]].forEach(([px, py, pr]) => {
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(px, py, pr * 0.52, Math.PI * 0.15, Math.PI * 1.65);
                    ctx.stroke();
                });
            } else if (view !== 'back') {
                ctx.beginPath();
                ctx.ellipse(cx, p.headH * 0.18, headRx * 0.90, headRy * 0.18, 0, Math.PI, 0);
                ctx.fill();
                [[cx - headRx * 0.96, p.headH * 0.55, headRx * 0.14], [cx + headRx * 0.96, p.headH * 0.55, headRx * 0.14], [cx - headRx * 0.82, p.headH * 0.84, headRx * 0.12], [cx + headRx * 0.82, p.headH * 0.84, headRx * 0.12]].forEach(([px, py, pr]) => {
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(px, py, pr * 0.52, Math.PI * 0.15, Math.PI * 1.65);
                    ctx.stroke();
                });
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        if (hairStyle === 'curly' || hairStyle === 'afro' || hairStyle === 'short-afro' || hairStyle === 'tapered-afro') {
            const puffScale = hairStyle === 'afro' ? 1.42 : hairStyle === 'short-afro' ? 0.58 : hairStyle === 'tapered-afro' ? 0.92 : 1.04;
            drawBehind(() => {
                ctx.fillStyle = d.hair;
                const puffs = view === 'side'
                    ? [
                        [w * 0.26, p.headH * 0.16, headRx * 0.30],
                        [w * 0.44, p.headH * 0.10, headRx * 0.34],
                        [w * 0.58, p.headH * 0.18, headRx * 0.28],
                        [w * 0.20, p.headH * 0.36, headRx * 0.26]
                    ]
                    : [
                        [cx - headRx * 0.62, p.headH * 0.20, headRx * 0.30],
                        [cx - headRx * 0.24, p.headH * 0.08, headRx * 0.34],
                        [cx + headRx * 0.18, p.headH * 0.06, headRx * 0.36],
                        [cx + headRx * 0.58, p.headH * 0.20, headRx * 0.30],
                        [cx, p.headH * 0.02, headRx * 0.28]
                    ];
                puffs.forEach(([px, py, pr]) => {
                    ctx.beginPath();
                    ctx.arc(px, py, pr * puffScale, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
            ctx.save();
            ctx.fillStyle = d.hair;
            ctx.strokeStyle = hairShade;
            ctx.lineWidth = Math.max(0.5, d.ow * 0.42);
            ctx.globalAlpha = hairStyle === 'short-afro' ? 0.62 : 0.78;
            if (view === 'side') {
                const capRx = hairStyle === 'afro' ? headRx * 0.72 : hairStyle === 'short-afro' ? headRx * 0.42 : headRx * 0.58;
                const capRy = hairStyle === 'afro' ? headRy * 0.28 : hairStyle === 'short-afro' ? headRy * 0.14 : headRy * 0.20;
                ctx.beginPath();
                ctx.ellipse(w * 0.42, p.headH * 0.18, capRx, capRy, 0, Math.PI, 0);
                ctx.fill();
            } else if (view !== 'back') {
                const capRx = hairStyle === 'afro' ? headRx * 1.10 : hairStyle === 'short-afro' ? headRx * 0.62 : headRx * 0.88;
                const capRy = hairStyle === 'afro' ? headRy * 0.30 : hairStyle === 'short-afro' ? headRy * 0.14 : headRy * 0.22;
                ctx.beginPath();
                ctx.ellipse(cx, p.headH * 0.18, capRx, capRy, 0, Math.PI, 0);
                ctx.fill();
            }
            ctx.globalAlpha = 0.42;
            const textureRows = hairStyle === 'short-afro' ? 2 : hairStyle === 'afro' ? 4 : 3;
            for (let i = 0; i < textureRows; i++) {
                const y = p.headH * (0.09 + i * 0.055);
                const span = (hairStyle === 'afro' ? headRx * 1.30 : hairStyle === 'short-afro' ? headRx * 0.58 : headRx * 0.95);
                const x0 = view === 'side' ? w * 0.22 : cx - span * 0.48;
                const x1 = view === 'side' ? w * 0.58 : cx + span * 0.48;
                ctx.beginPath();
                for (let x = x0; x <= x1; x += headRx * 0.16) {
                    ctx.moveTo(x, y);
                    ctx.arc(x + headRx * 0.045, y, headRx * 0.045, Math.PI, 0);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            if (hairStyle === 'tapered-afro') {
                ctx.save();
                ctx.fillStyle = d.hair;
                ctx.globalAlpha = 0.42;
                if (view === 'side') {
                    ctx.fillRect(w * 0.22, p.headH * 0.31, w * 0.28, p.headH * 0.08);
                } else {
                    ctx.beginPath();
                    ctx.ellipse(cx, headCy * 0.88, headRx * 0.86, headRy * 0.18, 0, Math.PI, 0);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
    },

    _ucBuildPaintedGarmentContext(d = {}) {
        return {
            ...d,
            _forcePaintedGarment: true,
            clothing: {
                ...this._ucGetClothing(d),
                garmentMode: 'painted'
            }
        };
    },

    _ucBuildIntegratedGarmentPartsContext(d = {}) {
        const clothing = this._ucGetClothing(d);
        return {
            ...d,
            _forcePaintedGarment: true,
            _integratedGarmentParts: true,
            _integratedSideGarment: String(d?.view || '').toLowerCase() === 'side',
            clothing: {
                ...clothing,
                garmentMode: 'painted'
            }
        };
    },

    _ucBuildIntegratedSideGarmentContext(d = {}) {
        return this._ucBuildIntegratedGarmentPartsContext(d);
    },

    _ucBuildHybridUnderpaintContext(d = {}) {
        const clothing = this._ucGetClothing(d);
        const basePreset = this._ucFemaleNigerianHybridBasePreset?.(clothing.outfitPreset) || clothing.outfitPreset;
        return {
            ...d,
            _forcePaintedGarment: true,
            clothing: {
                ...clothing,
                outfitPreset: basePreset,
                garmentMode: 'painted'
            }
        };
    },

    _ucBuildAgbadaRobeSpec(p, d, layout = {}, view = 'front') {
        if (!p || !layout?.torso) return null;
        const torso = layout.torso;
        const head = layout.head || null;
        const legs = [layout.rLeg, layout.lLeg, layout.frontLeg, layout.backLeg].filter(Boolean);
        const unit = Math.max(1, Number(p.hu) || Math.max(torso.w, torso.h) / 5);
        const topY = Math.min(
            torso.y + torso.h * 0.02,
            head ? head.y + head.h - Math.max(unit * 0.18, p.neckH * 0.58) : torso.y
        );
        const legTop = legs.length ? Math.min(...legs.map(part => part.y)) : torso.y + torso.h * 0.86;
        const legLen = Number(p.legTotalLen) || Number(p.upperLegLen) * 1.9 || torso.h * 1.18;
        const maxLegHeight = legs.length
            ? Math.max(...legs.map(part => Math.max(0, Number(part.h) || 0)))
            : legLen;
        const clothing = this._ucGetClothing(d);
        const isShirtGarment = this._ucIsSenatorShirtGarment({ clothing });
        const femaleHybridPreset = this._ucIsFemaleNigerianHybridPreset?.(clothing.outfitPreset)
            ? clothing.outfitPreset
            : '';
        if (this._ucIsWaistSkirtGarment?.(clothing)) {
            const isSide = String(view || '').toLowerCase() === 'side';
            // The armature "waist" joint is a bend control placed high on the torso.
            // Skirt waistbands need the garment waistline instead, otherwise peplum
            // and wrapper skirts hang from the belly/chest during walk cycles.
            const waistRatio = Math.max(0.54, Math.min(0.68, Number(clothing.skirtWaistRatio) || (isSide ? 0.58 : 0.60)));
            const skirtTopY = torso.y + torso.h * waistRatio;
            const targetHemY = this._ucHybridSkirtHemY?.(clothing.skirtLength, { torso, legTop, maxLegHeight, legLen, unit })
                || (legTop + maxLegHeight * 0.52);
            const minHemY = legTop + unit * 0.55;
            const maxHemY = legTop + maxLegHeight + unit * 0.35;
            const bottomY = Math.max(minHemY, Math.min(targetHemY, maxHemY));
            const waistFullW = Math.max(unit * (isSide ? 0.46 : 0.46), torso.w * (isSide ? 0.62 : 0.52));
            const hipFullW = Math.max(waistFullW * (isSide ? 1.22 : 1.12), torso.w * (isSide ? 0.92 : 0.68));
            const designWidth = {
                'pencil': 0.76,
                'a-line': 1.02,
                'flared': 1.34,
                'wrapper': 1.08,
                'pleated': 1.38,
                'mermaid': 1.18
            }[clothing.skirtDesign] || 1.02;
            const skirtW = Math.max(hipFullW * 1.06, torso.w * designWidth * (isSide ? 0.78 : 1.02));
            const leftX = torso.x + torso.w * 0.5 - skirtW * 0.5;
            const pad = Math.max(2, unit * 0.035);
            const skirtLayout = {
                x: leftX - pad,
                y: skirtTopY - pad,
                w: Math.max(16, skirtW + pad * 2),
                h: Math.max(16, bottomY - skirtTopY + pad * 2)
            };
            return {
                canvas: this._ucDrawAgbadaRobeCanvas(p, d, {
                    view: isSide ? 'side' : String(view || 'front').toLowerCase(),
                    skirtOnly: true,
                    w: skirtLayout.w,
                    h: skirtLayout.h,
                    pad,
                    unit,
                    centerX: torso.x + torso.w * 0.5 - skirtLayout.x,
                    torsoTopY: torso.y - skirtLayout.y,
                    neckY: pad,
                    shoulderY: pad,
                    sleeveEndY: pad,
                    hemY: bottomY - skirtLayout.y,
                    torsoW: torso.w,
                    torsoH: torso.h,
                    waistFullW,
                    hipFullW,
                    waistY: skirtTopY - skirtLayout.y
                }),
                layout: skirtLayout,
                waistAnchor: {
                    parentAnchorX: 0.5,
                    parentAnchorY: waistRatio,
                    worldX: torso.x + torso.w * 0.5,
                    worldY: skirtTopY
                }
            };
        }
        const lengthMode = isShirtGarment
            ? 'shirt'
            : (femaleHybridPreset && (clothing.skirtLength === 'mini' || clothing.skirtLength === 'short'))
            ? 'short'
            : (femaleHybridPreset)
            ? (clothing.skirtLength === 'knee' ? 'knee' : 'long')
            : (clothing.agbadaLength === 'short' || clothing.outfitPreset === 'agbada3' || clothing.outfitPreset === 'senator3')
            ? 'short'
            : (clothing.agbadaLength === 'long' || clothing.outfitPreset === 'agbada2' || clothing.outfitPreset === 'senator2' || clothing.outfitPreset === 'royal-agbada' ? 'long' : 'knee');
        const shirtHemY = torso.y + torso.h * 1.06;
        const shortHemY = torso.y + torso.h * 1.04;
        const kneeHemY = legTop + Math.max(maxLegHeight * 0.52, unit * 2.2);
        const longHemY = legTop + Math.max(maxLegHeight * 0.68, unit * 3.1);
        let targetHemY = lengthMode === 'shirt' ? shirtHemY : (lengthMode === 'short' ? shortHemY : (lengthMode === 'long' ? longHemY : kneeHemY));
        if (femaleHybridPreset) {
            targetHemY = this._ucHybridSkirtHemY(clothing.skirtLength, { torso, legTop, maxLegHeight, legLen, unit });
        }
        const maxHemY = lengthMode === 'shirt'
            ? torso.y + torso.h + unit * 0.95
            : lengthMode === 'short'
            ? torso.y + torso.h + unit * 1.1
            : torso.y + torso.h + unit * (lengthMode === 'long' ? 4.0 : 2.8);
        const femaleMinHemY = femaleHybridPreset
            ? torso.y + torso.h * ({
                mini: 0.82,
                short: 0.96,
                knee: 1.00,
                midi: 1.04,
                ankle: 1.06,
                floor: 1.08
            }[clothing.skirtLength] || 1.00)
            : null;
        const minHemY = Number.isFinite(femaleMinHemY)
            ? femaleMinHemY
            : torso.y + torso.h * (lengthMode === 'shirt' ? 1.00 : (lengthMode === 'short' ? 0.98 : 1.05));
        const bottomY = Math.max(minHemY, Math.min(targetHemY, maxHemY));
        const isSide = String(view || '').toLowerCase() === 'side';
        let leftX;
        let rightX;
        if (femaleHybridPreset) {
            const designWidth = {
                'pencil': 0.72,
                'a-line': 1.00,
                'flared': 1.34,
                'wrapper': 1.14,
                'pleated': 1.24,
                'mermaid': 1.08
            }[clothing.skirtDesign] || 1.00;
            const widthFactor = femaleHybridPreset === 'bubu-gown-hybrid'
                ? (isSide ? 1.16 : 1.22)
                : femaleHybridPreset === 'ankara-peplum-hybrid'
                ? (isSide ? 1.00 : 1.06)
                : femaleHybridPreset === 'hybrid-skirt'
                ? (isSide ? 0.92 : 0.98)
                : (isSide ? 1.06 : 1.12);
            const robeW = torso.w * widthFactor * designWidth;
            leftX = torso.x + torso.w * 0.5 - robeW * 0.5;
            rightX = leftX + robeW;
        } else if (isShirtGarment) {
            const shirtW = torso.w * (isSide ? 1.06 : 1.04);
            leftX = torso.x + torso.w * 0.5 - shirtW * 0.5;
            rightX = leftX + shirtW;
        } else if (clothing.robeFit === 'senator') {
            const robeW = torso.w * (isSide ? 0.94 : 0.90);
            leftX = torso.x + torso.w * 0.5 - robeW * 0.5;
            rightX = leftX + robeW;
        } else if (isSide) {
            leftX = torso.x - torso.w * 0.22;
            rightX = torso.x + torso.w * 1.06;
        } else {
            leftX = torso.x - torso.w * 0.08;
            rightX = torso.x + torso.w * 1.08;
        }
        const pad = isShirtGarment ? Math.max(3, unit * 0.07) : (clothing.robeFit === 'senator' ? 0 : Math.max(4, unit * 0.09));
        const robeLayout = {
            x: leftX - pad,
            y: topY - pad,
            w: Math.max(16, rightX - leftX + pad * 2),
            h: Math.max(16, bottomY - topY + pad * 2)
        };
        const metrics = {
            view: isSide ? 'side' : String(view || 'front').toLowerCase(),
            w: robeLayout.w,
            h: robeLayout.h,
            pad,
            unit,
            centerX: torso.x + torso.w * 0.5 - robeLayout.x,
            torsoTopY: torso.y - robeLayout.y,
            neckY: Math.max(pad, torso.y - robeLayout.y + torso.h * 0.02),
            shoulderY: torso.y - robeLayout.y + torso.h * 0.08,
            sleeveEndY: Math.min(robeLayout.h - pad * 1.25, torso.y + torso.h * 0.78 - robeLayout.y),
            hemY: bottomY - robeLayout.y,
            torsoW: torso.w,
            torsoH: torso.h
        };
        return {
            canvas: this._ucDrawAgbadaRobeCanvas(p, d, metrics),
            layout: robeLayout
        };
    },

    _ucDrawAgbadaRobeCanvas(p, d, metrics) {
        const w = Math.max(16, Math.ceil(metrics.w));
        const h = Math.max(16, Math.ceil(metrics.h));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const clothing = this._ucGetClothing(d);
        const base = clothing.topColor || '#F0E5C6';
        const accent = clothing.accentColor || '#B88A36';
        const outline = this._ucShadeColor(base, -0.28);
        const shadow = this._ucShadeColor(base, -0.16);
        const light = this._ucShadeColor(base, 0.18);
        const cx = Math.max(w * 0.30, Math.min(w * 0.70, metrics.centerX || w * 0.5));
        const unit = Math.max(1, metrics.unit || w * 0.12);
        const shoulderY = Math.max(metrics.pad, metrics.shoulderY || h * 0.12);
        const neckY = Math.max(metrics.pad, metrics.neckY || shoulderY * 0.85);
        const sleeveEndY = Math.max(shoulderY + unit * 0.8, Math.min(h * 0.78, metrics.sleeveEndY || h * 0.68));
        const hemY = Math.max(sleeveEndY + unit * 0.35, Math.min(h - metrics.pad, metrics.hemY || h * 0.95));
        const bodyW = Math.max(unit * 1.4, metrics.torsoW || w * 0.36);
        const isSide = metrics.view === 'side';
        const femaleHybridPreset = this._ucIsFemaleNigerianHybridPreset?.(clothing.outfitPreset)
            ? clothing.outfitPreset
            : '';
        const skirtDesign = femaleHybridPreset ? (clothing.skirtDesign || 'a-line') : '';

        if (metrics.skirtOnly && this._ucPaintIntegratedWaistSkirt) {
            this._ucPaintIntegratedWaistSkirt(ctx, p, d, w, h, clothing, metrics.view || 'front', metrics);
            return canvas;
        }

        if (this._ucIsSenatorShirtGarment({ clothing })) {
            const style = clothing.pinnedGarmentStyle || 'senator-shirt';
            const shoulderHalf = Math.min(w * 0.47, Math.max(bodyW * (isSide ? 0.42 : 0.52), unit * 0.62));
            const chestHalf = Math.min(w * 0.45, Math.max(bodyW * (isSide ? 0.39 : 0.48), unit * 0.58));
            const waistHalf = Math.min(w * 0.42, Math.max(bodyW * (isSide ? 0.32 : 0.40), unit * 0.52));
            const hemHalf = Math.min(w * 0.46, Math.max(bodyW * (isSide ? 0.36 : 0.44), unit * 0.58));
            const topInset = unit * 0.20;
            const shirtPath = new Path2D();
            shirtPath.moveTo(cx - shoulderHalf * 0.40, neckY + topInset * 0.22);
            shirtPath.quadraticCurveTo(cx - shoulderHalf * 0.82, shoulderY + unit * 0.02, cx - shoulderHalf, shoulderY + unit * 0.30);
            shirtPath.bezierCurveTo(cx - chestHalf, shoulderY + unit * 0.85, cx - waistHalf, hemY - unit * 0.86, cx - hemHalf, hemY - unit * 0.18);
            shirtPath.quadraticCurveTo(cx - hemHalf * 0.36, hemY + unit * 0.08, cx, hemY);
            shirtPath.quadraticCurveTo(cx + hemHalf * 0.36, hemY + unit * 0.08, cx + hemHalf, hemY - unit * 0.18);
            shirtPath.bezierCurveTo(cx + waistHalf, hemY - unit * 0.86, cx + chestHalf, shoulderY + unit * 0.85, cx + shoulderHalf, shoulderY + unit * 0.30);
            shirtPath.quadraticCurveTo(cx + shoulderHalf * 0.82, shoulderY + unit * 0.02, cx + shoulderHalf * 0.40, neckY + topInset * 0.22);
            shirtPath.quadraticCurveTo(cx, neckY + unit * 0.28, cx - shoulderHalf * 0.40, neckY + topInset * 0.22);
            shirtPath.closePath();

            const gradient = ctx.createLinearGradient(cx - shoulderHalf, neckY, cx + shoulderHalf, hemY);
            gradient.addColorStop(0, light);
            gradient.addColorStop(0.52, base);
            gradient.addColorStop(1, shadow);
            ctx.fillStyle = gradient;
            ctx.fill(shirtPath);
            ctx.lineJoin = 'round';
            ctx.strokeStyle = this._ucWithAlpha(outline, 0.74);
            ctx.lineWidth = Math.max(1, unit * 0.034);
            ctx.stroke(shirtPath);

            ctx.save();
            ctx.clip(shirtPath);
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.moveTo(cx - shoulderHalf, shoulderY + unit * 0.12);
            ctx.quadraticCurveTo(cx - waistHalf * 1.10, hemY * 0.62, cx - hemHalf * 0.80, hemY);
            ctx.lineTo(cx - hemHalf * 0.42, hemY);
            ctx.quadraticCurveTo(cx - waistHalf * 0.48, hemY * 0.62, cx - shoulderHalf * 0.54, shoulderY + unit * 0.12);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + shoulderHalf, shoulderY + unit * 0.12);
            ctx.quadraticCurveTo(cx + waistHalf * 1.10, hemY * 0.62, cx + hemHalf * 0.80, hemY);
            ctx.lineTo(cx + hemHalf * 0.42, hemY);
            ctx.quadraticCurveTo(cx + waistHalf * 0.48, hemY * 0.62, cx + shoulderHalf * 0.54, shoulderY + unit * 0.12);
            ctx.fill();

            ctx.globalAlpha = 1;
            if (style === 'senator-panel') {
                ctx.fillStyle = this._ucWithAlpha(accent, 0.40);
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.18, neckY + unit * 0.34);
                ctx.lineTo(cx + bodyW * 0.18, neckY + unit * 0.34);
                ctx.lineTo(cx + bodyW * 0.14, hemY - unit * 0.30);
                ctx.quadraticCurveTo(cx, hemY - unit * 0.16, cx - bodyW * 0.14, hemY - unit * 0.30);
                ctx.closePath();
                ctx.fill();
            } else if (style === 'senator-stripe') {
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.58);
                ctx.lineWidth = Math.max(1, unit * 0.026);
                for (let x = cx - shoulderHalf; x < cx + shoulderHalf; x += Math.max(5, unit * 0.20)) {
                    ctx.beginPath();
                    ctx.moveTo(x - unit * 0.65, neckY + unit * 0.26);
                    ctx.lineTo(x + unit * 0.38, hemY - unit * 0.18);
                    ctx.stroke();
                }
            } else if (style === 'executive-tunic') {
                ctx.save();
                ctx.globalAlpha = 0.92;
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.82);
                ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(base, 0.12), 0.82);
                ctx.lineWidth = Math.max(1, unit * 0.030);
                const pocketW = bodyW * 0.26;
                const pocketH = unit * 0.30;
                const pocketY = neckY + unit * 0.98;
                [
                    cx - bodyW * 0.32,
                    cx + bodyW * 0.32
                ].forEach(px => {
                    ctx.beginPath();
                    ctx.roundRect?.(px - pocketW * 0.5, pocketY, pocketW, pocketH, unit * 0.045);
                    if (!ctx.roundRect) {
                        ctx.rect(px - pocketW * 0.5, pocketY, pocketW, pocketH);
                    }
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(px - pocketW * 0.45, pocketY + pocketH * 0.30);
                    ctx.lineTo(px + pocketW * 0.45, pocketY + pocketH * 0.30);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(px, pocketY + pocketH * 0.18, Math.max(1, unit * 0.026), 0, Math.PI * 2);
                    ctx.fillStyle = accent;
                    ctx.fill();
                    ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(base, 0.12), 0.82);
                });
                ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(accent, -0.12), 0.72);
                ctx.lineWidth = Math.max(1, unit * 0.024);
                ctx.beginPath();
                ctx.moveTo(cx - shoulderHalf * 0.58, shoulderY + unit * 0.18);
                ctx.quadraticCurveTo(cx - bodyW * 0.22, neckY + unit * 0.86, cx - bodyW * 0.17, hemY - unit * 0.22);
                ctx.moveTo(cx + shoulderHalf * 0.58, shoulderY + unit * 0.18);
                ctx.quadraticCurveTo(cx + bodyW * 0.22, neckY + unit * 0.86, cx + bodyW * 0.17, hemY - unit * 0.22);
                ctx.stroke();
                ctx.restore();
            }

            ctx.globalAlpha = 0.92;
            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, unit * (style === 'executive-tunic' ? 0.032 : 0.045));
            const placketBottom = style === 'executive-tunic' ? Math.min(hemY - unit * 0.42, neckY + unit * 1.55) : hemY - unit * 0.24;
            ctx.beginPath();
            ctx.moveTo(cx, neckY + unit * 0.25);
            ctx.lineTo(cx, placketBottom);
            ctx.stroke();
            ctx.lineWidth = Math.max(1, unit * 0.032);
            for (let y = neckY + unit * 0.62; y < (style === 'executive-tunic' ? placketBottom : hemY - unit * 0.42); y += unit * 0.42) {
                ctx.beginPath();
                if (style === 'executive-tunic') {
                    ctx.arc(cx, y, Math.max(1, unit * 0.035), 0, Math.PI * 2);
                    ctx.fillStyle = accent;
                    ctx.fill();
                } else {
                    ctx.moveTo(cx - bodyW * 0.10, y);
                    ctx.lineTo(cx + bodyW * 0.10, y);
                    ctx.stroke();
                }
            }
            if (style === 'executive-tunic') {
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.78);
                ctx.lineWidth = Math.max(1, unit * 0.028);
                ctx.beginPath();
                ctx.moveTo(cx - hemHalf * 0.82, hemY - unit * 0.18);
                ctx.quadraticCurveTo(cx - hemHalf * 0.28, hemY + unit * 0.04, cx, hemY - unit * 0.02);
                ctx.quadraticCurveTo(cx + hemHalf * 0.28, hemY + unit * 0.04, cx + hemHalf * 0.82, hemY - unit * 0.18);
                ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.ellipse(cx, neckY + unit * 0.08, Math.max(unit * 0.24, bodyW * 0.17), unit * 0.19, 0, Math.PI * 0.02, Math.PI * 0.98, false);
            ctx.lineTo(cx, neckY + unit * 0.42);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, unit * 0.040);
            ctx.beginPath();
            ctx.ellipse(cx, neckY + unit * 0.08, Math.max(unit * 0.24, bodyW * 0.17), unit * 0.19, 0, Math.PI * 0.02, Math.PI * 0.98, false);
            ctx.lineTo(cx, neckY + unit * 0.42);
            ctx.stroke();
            if (style === 'executive-tunic') {
                ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(base, 0.10), 0.96);
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.78);
                ctx.lineWidth = Math.max(1, unit * 0.030);
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.20, neckY + unit * 0.12);
                ctx.lineTo(cx - bodyW * 0.08, neckY + unit * 0.43);
                ctx.lineTo(cx, neckY + unit * 0.34);
                ctx.lineTo(cx + bodyW * 0.08, neckY + unit * 0.43);
                ctx.lineTo(cx + bodyW * 0.20, neckY + unit * 0.12);
                ctx.stroke();
            }

            ctx.globalAlpha = 0.70;
            ctx.strokeStyle = this._ucWithAlpha(outline, 0.42);
            ctx.lineWidth = Math.max(1, unit * 0.024);
            ctx.beginPath();
            ctx.moveTo(cx - shoulderHalf * 0.88, shoulderY + unit * 0.30);
            ctx.quadraticCurveTo(cx - chestHalf * 0.92, shoulderY + unit * 1.20, cx - waistHalf, hemY - unit * 0.55);
            ctx.moveTo(cx + shoulderHalf * 0.88, shoulderY + unit * 0.30);
            ctx.quadraticCurveTo(cx + chestHalf * 0.92, shoulderY + unit * 1.20, cx + waistHalf, hemY - unit * 0.55);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return canvas;
        }

        const robePath = new Path2D();
        if (isSide) {
            const sideHemScale = femaleHybridPreset
                ? ({ 'pencil': 0.38, 'a-line': 0.58, 'flared': 0.72, 'wrapper': 0.58, 'pleated': 0.66, 'mermaid': 0.76 }[skirtDesign] || 0.58)
                : 0.50;
            const sideWaistScale = femaleHybridPreset && skirtDesign === 'pencil' ? 0.38 : 0.50;
            robePath.moveTo(cx - bodyW * 0.26, neckY);
            robePath.bezierCurveTo(cx - bodyW * 0.76, shoulderY + unit * 0.22, cx - bodyW * 0.86, sleeveEndY * 0.70, cx - bodyW * 0.58, sleeveEndY);
            robePath.bezierCurveTo(cx - bodyW * sideWaistScale, hemY - unit * 0.58, cx - bodyW * sideHemScale, hemY - unit * 0.10, cx - bodyW * sideHemScale, hemY + unit * 0.03);
            robePath.quadraticCurveTo(cx + bodyW * 0.06, hemY + unit * 0.16, cx + bodyW * (sideHemScale + 0.16), hemY - unit * 0.04);
            robePath.bezierCurveTo(cx + bodyW * (sideWaistScale + 0.42), hemY - unit * 0.56, cx + bodyW * 0.82, shoulderY + unit * 0.34, cx + bodyW * 0.50, shoulderY + unit * 0.18);
            robePath.quadraticCurveTo(cx + bodyW * 0.14, neckY - unit * 0.03, cx - bodyW * 0.26, neckY);
            robePath.closePath();
        } else {
            const hemScale = femaleHybridPreset
                ? ({ 'pencil': 0.42, 'a-line': 0.66, 'flared': 0.86, 'wrapper': 0.68, 'pleated': 0.78, 'mermaid': 0.92 }[skirtDesign] || 0.66)
                : 0.66;
            const sleeveScale = femaleHybridPreset
                ? ({ 'pencil': 0.88, 'a-line': 1.04, 'flared': 1.15, 'wrapper': 1.05, 'pleated': 1.12, 'mermaid': 1.00 }[skirtDesign] || 1.04)
                : 1.15;
            robePath.moveTo(cx - bodyW * 0.28, neckY);
            robePath.bezierCurveTo(cx - bodyW * (femaleHybridPreset ? 0.82 : 1.28), shoulderY + unit * 0.02, cx - bodyW * (femaleHybridPreset ? 1.04 : 1.48), sleeveEndY * 0.62, cx - bodyW * sleeveScale, sleeveEndY);
            robePath.bezierCurveTo(cx - bodyW * (hemScale + 0.26), hemY - unit * 0.66, cx - bodyW * (hemScale + 0.14), hemY - unit * 0.12, cx - bodyW * hemScale, hemY + unit * 0.02);
            robePath.quadraticCurveTo(cx - bodyW * 0.30, hemY + unit * 0.16, cx, hemY + unit * 0.04);
            robePath.quadraticCurveTo(cx + bodyW * 0.32, hemY + unit * 0.18, cx + bodyW * hemScale, hemY - unit * 0.02);
            robePath.bezierCurveTo(cx + bodyW * (hemScale + 0.14), hemY - unit * 0.16, cx + bodyW * (hemScale + 0.26), hemY - unit * 0.66, cx + bodyW * sleeveScale, sleeveEndY);
            robePath.bezierCurveTo(cx + bodyW * (femaleHybridPreset ? 1.04 : 1.48), sleeveEndY * 0.62, cx + bodyW * (femaleHybridPreset ? 0.82 : 1.28), shoulderY + unit * 0.02, cx + bodyW * 0.28, neckY);
            robePath.quadraticCurveTo(cx, neckY + unit * 0.16, cx - bodyW * 0.28, neckY);
            robePath.closePath();
        }

        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.moveTo(cx - bodyW * (isSide ? 0.48 : 0.92), shoulderY + unit * 0.16);
        ctx.bezierCurveTo(cx - bodyW * (isSide ? 0.78 : 1.28), sleeveEndY * 0.70, cx - bodyW * 0.82, hemY - unit * 0.22, cx - bodyW * 0.50, hemY + unit * 0.02);
        ctx.quadraticCurveTo(cx - bodyW * 0.30, hemY - unit * 0.06, cx - bodyW * 0.38, sleeveEndY);
        ctx.quadraticCurveTo(cx - bodyW * 0.44, shoulderY + unit * 0.50, cx - bodyW * (isSide ? 0.48 : 0.92), shoulderY + unit * 0.16);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + bodyW * (isSide ? 0.46 : 0.92), shoulderY + unit * 0.16);
        ctx.bezierCurveTo(cx + bodyW * (isSide ? 0.80 : 1.28), sleeveEndY * 0.70, cx + bodyW * 0.82, hemY - unit * 0.22, cx + bodyW * 0.52, hemY + unit * 0.02);
        ctx.quadraticCurveTo(cx + bodyW * 0.32, hemY - unit * 0.06, cx + bodyW * 0.38, sleeveEndY);
        ctx.quadraticCurveTo(cx + bodyW * 0.44, shoulderY + unit * 0.50, cx + bodyW * (isSide ? 0.46 : 0.92), shoulderY + unit * 0.16);
        ctx.fill();
        ctx.restore();

        const gradient = ctx.createLinearGradient(0, neckY, 0, hemY);
        gradient.addColorStop(0, light);
        gradient.addColorStop(0.38, base);
        gradient.addColorStop(1, shadow);
        ctx.fillStyle = gradient;
        ctx.fill(robePath);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this._ucWithAlpha(outline, 0.72);
        ctx.lineWidth = Math.max(1, unit * 0.035);
        ctx.stroke(robePath);

        ctx.save();
        ctx.clip(robePath);
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = this._ucWithAlpha('#000000', 0.22);
        ctx.beginPath();
        ctx.moveTo(cx - bodyW * (isSide ? 0.44 : 1.08), shoulderY);
        ctx.quadraticCurveTo(cx - bodyW * 0.48, hemY * 0.56, cx - bodyW * 0.72, hemY);
        ctx.lineTo(cx - bodyW * 0.96, hemY);
        ctx.quadraticCurveTo(cx - bodyW * 0.58, hemY * 0.58, cx - bodyW * (isSide ? 0.56 : 1.18), shoulderY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + bodyW * (isSide ? 0.38 : 1.08), shoulderY);
        ctx.quadraticCurveTo(cx + bodyW * 0.48, hemY * 0.56, cx + bodyW * 0.72, hemY);
        ctx.lineTo(cx + bodyW * 0.96, hemY);
        ctx.quadraticCurveTo(cx + bodyW * 0.58, hemY * 0.58, cx + bodyW * (isSide ? 0.62 : 1.18), shoulderY);
        ctx.fill();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = this._ucWithAlpha(accent, 0.82);
        ctx.lineWidth = Math.max(1, unit * 0.030);
        for (let i = 0; i < 4; i += 1) {
            const offset = (i - 1.5) * bodyW * (isSide ? 0.12 : 0.18);
            ctx.beginPath();
            ctx.moveTo(cx + offset, neckY + unit * 0.36);
            ctx.quadraticCurveTo(cx + offset * 0.55, hemY * 0.58, cx + offset * 0.75, hemY - unit * 0.28);
            ctx.stroke();
        }
        ctx.globalAlpha = 0.90;
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(1, unit * 0.050);
        ctx.beginPath();
        ctx.moveTo(cx, neckY + unit * 0.22);
        ctx.lineTo(cx, hemY - unit * 0.34);
        ctx.stroke();
        ctx.lineWidth = Math.max(1, unit * 0.035);
        for (let y = neckY + unit * 0.58; y < hemY - unit * 0.55; y += unit * 0.38) {
            ctx.beginPath();
            ctx.moveTo(cx - bodyW * 0.12, y);
            ctx.lineTo(cx + bodyW * 0.12, y);
            ctx.stroke();
        }
        ctx.restore();

        if (femaleHybridPreset) {
            ctx.save();
            ctx.clip(robePath);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const waistY = neckY + (hemY - neckY) * (femaleHybridPreset === 'ankara-peplum-hybrid' ? 0.50 : 0.36);
            const wrapShadow = this._ucWithAlpha(this._ucShadeColor(base, -0.22), 0.48);
            const wrapLight = this._ucWithAlpha(this._ucShadeColor(base, 0.20), 0.36);

            ctx.globalAlpha = 0.72;
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.86);
            ctx.lineWidth = Math.max(1, unit * 0.045);
            ctx.beginPath();
            ctx.moveTo(cx - bodyW * (isSide ? 0.32 : 0.50), waistY);
            ctx.quadraticCurveTo(cx, waistY + unit * 0.10, cx + bodyW * (isSide ? 0.40 : 0.54), waistY);
            ctx.stroke();

            if (femaleHybridPreset === 'ankara-peplum-hybrid' || skirtDesign === 'flared') {
                ctx.fillStyle = this._ucWithAlpha(accent, 0.18);
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.58, waistY - unit * 0.04);
                ctx.quadraticCurveTo(cx - bodyW * 0.70, waistY + unit * 0.48, cx - bodyW * 0.46, hemY - unit * 0.12);
                ctx.quadraticCurveTo(cx, hemY + unit * 0.04, cx + bodyW * 0.46, hemY - unit * 0.12);
                ctx.quadraticCurveTo(cx + bodyW * 0.70, waistY + unit * 0.48, cx + bodyW * 0.58, waistY - unit * 0.04);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.70);
                ctx.lineWidth = Math.max(1, unit * 0.030);
                for (let i = -2; i <= 2; i += 1) {
                    const x = cx + i * bodyW * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(x, waistY + unit * 0.04);
                    ctx.quadraticCurveTo(x + i * unit * 0.03, (waistY + hemY) * 0.5, x + i * unit * 0.08, hemY - unit * 0.18);
                    ctx.stroke();
                }
            } else if (skirtDesign === 'pleated') {
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.72);
                ctx.lineWidth = Math.max(1, unit * 0.026);
                for (let i = -4; i <= 4; i += 1) {
                    const topX = cx + i * bodyW * (isSide ? 0.075 : 0.105);
                    const bottomX = cx + i * bodyW * (isSide ? 0.105 : 0.145);
                    ctx.beginPath();
                    ctx.moveTo(topX, waistY + unit * 0.04);
                    ctx.quadraticCurveTo((topX + bottomX) * 0.5, (waistY + hemY) * 0.56, bottomX, hemY - unit * 0.20);
                    ctx.stroke();
                }
            } else if (skirtDesign === 'pencil') {
                ctx.strokeStyle = wrapShadow;
                ctx.lineWidth = Math.max(1, unit * 0.028);
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.20, waistY + unit * 0.06);
                ctx.quadraticCurveTo(cx - bodyW * 0.16, (waistY + hemY) * 0.58, cx - bodyW * 0.12, hemY - unit * 0.22);
                ctx.moveTo(cx + bodyW * 0.20, waistY + unit * 0.06);
                ctx.quadraticCurveTo(cx + bodyW * 0.16, (waistY + hemY) * 0.58, cx + bodyW * 0.12, hemY - unit * 0.22);
                ctx.stroke();
            } else if (skirtDesign === 'mermaid') {
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.70);
                ctx.lineWidth = Math.max(1, unit * 0.030);
                const flareY = waistY + (hemY - waistY) * 0.70;
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.24, waistY + unit * 0.04);
                ctx.quadraticCurveTo(cx - bodyW * 0.10, (waistY + flareY) * 0.5, cx - bodyW * 0.22, flareY);
                ctx.quadraticCurveTo(cx - bodyW * 0.46, (flareY + hemY) * 0.5, cx - bodyW * 0.68, hemY - unit * 0.16);
                ctx.moveTo(cx + bodyW * 0.24, waistY + unit * 0.04);
                ctx.quadraticCurveTo(cx + bodyW * 0.10, (waistY + flareY) * 0.5, cx + bodyW * 0.22, flareY);
                ctx.quadraticCurveTo(cx + bodyW * 0.46, (flareY + hemY) * 0.5, cx + bodyW * 0.68, hemY - unit * 0.16);
                ctx.stroke();
            } else {
                ctx.strokeStyle = wrapShadow;
                ctx.lineWidth = Math.max(1, unit * 0.034);
                for (let i = -3; i <= 3; i += 1) {
                    const offset = i * bodyW * (isSide ? 0.10 : 0.14);
                    ctx.beginPath();
                    ctx.moveTo(cx + offset, neckY + unit * 0.52);
                    ctx.quadraticCurveTo(cx + offset * 0.70, (neckY + hemY) * 0.55, cx + offset * 0.88, hemY - unit * 0.26);
                    ctx.stroke();
                }
                ctx.strokeStyle = wrapLight;
                ctx.lineWidth = Math.max(1, unit * 0.022);
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.16, neckY + unit * 0.42);
                ctx.quadraticCurveTo(cx - bodyW * 0.10, (neckY + hemY) * 0.58, cx - bodyW * 0.18, hemY - unit * 0.34);
                ctx.moveTo(cx + bodyW * 0.16, neckY + unit * 0.42);
                ctx.quadraticCurveTo(cx + bodyW * 0.10, (neckY + hemY) * 0.58, cx + bodyW * 0.18, hemY - unit * 0.34);
                ctx.stroke();
                if (skirtDesign === 'wrapper') {
                    ctx.strokeStyle = this._ucWithAlpha(accent, 0.82);
                    ctx.lineWidth = Math.max(1, unit * 0.034);
                    ctx.beginPath();
                    ctx.moveTo(cx - bodyW * (isSide ? 0.24 : 0.42), waistY + unit * 0.02);
                    ctx.quadraticCurveTo(cx + bodyW * 0.08, (waistY + hemY) * 0.52, cx + bodyW * (isSide ? 0.32 : 0.48), hemY - unit * 0.26);
                    ctx.stroke();
                }
            }

            if (femaleHybridPreset === 'george-wrapper-hybrid') {
                ctx.globalAlpha = 0.78;
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.78);
                ctx.lineWidth = Math.max(1, unit * 0.026);
                for (let y = neckY + unit * 0.92; y < hemY - unit * 0.46; y += unit * 0.55) {
                    ctx.beginPath();
                    ctx.ellipse(cx, y, bodyW * 0.18, unit * 0.10, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (femaleHybridPreset === 'bubu-gown-hybrid') {
                ctx.globalAlpha = 0.44;
                ctx.fillStyle = this._ucWithAlpha('#000000', 0.18);
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * (isSide ? 0.44 : 1.04), shoulderY + unit * 0.12);
                ctx.quadraticCurveTo(cx - bodyW * 0.88, (shoulderY + hemY) * 0.58, cx - bodyW * 0.58, hemY);
                ctx.lineTo(cx - bodyW * 0.36, hemY);
                ctx.quadraticCurveTo(cx - bodyW * 0.56, (shoulderY + hemY) * 0.58, cx - bodyW * (isSide ? 0.34 : 0.82), shoulderY + unit * 0.18);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + bodyW * (isSide ? 0.46 : 1.04), shoulderY + unit * 0.12);
                ctx.quadraticCurveTo(cx + bodyW * 0.88, (shoulderY + hemY) * 0.58, cx + bodyW * 0.58, hemY);
                ctx.lineTo(cx + bodyW * 0.36, hemY);
                ctx.quadraticCurveTo(cx + bodyW * 0.56, (shoulderY + hemY) * 0.58, cx + bodyW * (isSide ? 0.36 : 0.82), shoulderY + unit * 0.18);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(cx, neckY + unit * 0.08, Math.max(unit * 0.24, bodyW * 0.18), unit * 0.20, 0, Math.PI * 0.02, Math.PI * 0.98, false);
        ctx.lineTo(cx, neckY + unit * 0.43);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(1, unit * 0.045);
        ctx.beginPath();
        ctx.ellipse(cx, neckY + unit * 0.08, Math.max(unit * 0.24, bodyW * 0.18), unit * 0.20, 0, Math.PI * 0.02, Math.PI * 0.98, false);
        ctx.lineTo(cx, neckY + unit * 0.43);
        ctx.stroke();

        ctx.globalAlpha = 0.74;
        ctx.strokeStyle = this._ucWithAlpha(outline, 0.45);
        ctx.lineWidth = Math.max(1, unit * 0.026);
        ctx.beginPath();
        ctx.moveTo(Math.max(2, cx - bodyW * (isSide ? 0.56 : 1.18)), sleeveEndY);
        ctx.quadraticCurveTo(cx - bodyW * 0.55, sleeveEndY + unit * 0.10, cx - bodyW * 0.12, sleeveEndY + unit * 0.03);
        ctx.moveTo(cx + bodyW * 0.12, sleeveEndY + unit * 0.03);
        ctx.quadraticCurveTo(cx + bodyW * 0.55, sleeveEndY + unit * 0.10, Math.min(w - 2, cx + bodyW * (isSide ? 0.66 : 1.18)), sleeveEndY);
        ctx.moveTo(cx - bodyW * 0.62, hemY - unit * 0.01);
        ctx.quadraticCurveTo(cx - bodyW * 0.30, hemY + unit * 0.13, cx, hemY + unit * 0.04);
        ctx.quadraticCurveTo(cx + bodyW * 0.32, hemY + unit * 0.15, cx + bodyW * 0.64, hemY - unit * 0.02);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (clothing.outfitPreset === 'royal-agbada') {
            const coral = '#C7662B';
            const gold = accent || '#C99A3A';
            const deepGold = this._ucShadeColor(gold, -0.22);
            ctx.save();
            ctx.clip(robePath);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.globalAlpha = 0.95;
            ctx.strokeStyle = gold;
            ctx.lineWidth = Math.max(1.4, unit * 0.060);
            const borderInset = Math.max(2, unit * 0.10);
            [
                [cx - bodyW * (isSide ? 0.52 : 1.06), shoulderY + unit * 0.28, cx - bodyW * 0.58, hemY - unit * 0.18],
                [cx + bodyW * (isSide ? 0.52 : 1.06), shoulderY + unit * 0.28, cx + bodyW * 0.58, hemY - unit * 0.18]
            ].forEach(([x0, y0, x1, y1]) => {
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.50, x1, y1);
                ctx.stroke();
            });
            ctx.lineWidth = Math.max(1, unit * 0.035);
            ctx.beginPath();
            ctx.moveTo(Math.max(borderInset, cx - bodyW * (isSide ? 0.54 : 1.22)), sleeveEndY);
            ctx.quadraticCurveTo(cx - bodyW * 0.44, sleeveEndY + unit * 0.18, cx - bodyW * 0.08, sleeveEndY + unit * 0.08);
            ctx.moveTo(cx + bodyW * 0.08, sleeveEndY + unit * 0.08);
            ctx.quadraticCurveTo(cx + bodyW * 0.44, sleeveEndY + unit * 0.18, Math.min(w - borderInset, cx + bodyW * (isSide ? 0.60 : 1.22)), sleeveEndY);
            ctx.stroke();

            ctx.globalAlpha = 0.82;
            ctx.fillStyle = gold;
            const motifTop = neckY + unit * 1.04;
            const motifBottom = Math.min(hemY - unit * 0.66, motifTop + unit * 2.15);
            for (let y = motifTop; y < motifBottom; y += unit * 0.28) {
                const spread = bodyW * (0.06 + (y - motifTop) / Math.max(1, motifBottom - motifTop) * 0.24);
                ctx.beginPath();
                ctx.moveTo(cx, y - unit * 0.06);
                ctx.quadraticCurveTo(cx - spread * 0.70, y + unit * 0.12, cx - spread, y + unit * 0.02);
                ctx.quadraticCurveTo(cx - spread * 0.38, y + unit * 0.20, cx, y + unit * 0.16);
                ctx.quadraticCurveTo(cx + spread * 0.38, y + unit * 0.20, cx + spread, y + unit * 0.02);
                ctx.quadraticCurveTo(cx + spread * 0.70, y + unit * 0.12, cx, y - unit * 0.06);
                ctx.fill();
            }
            ctx.globalAlpha = 0.74;
            ctx.strokeStyle = deepGold;
            ctx.lineWidth = Math.max(1, unit * 0.022);
            for (let i = 0; i < 5; i += 1) {
                const y = motifTop + i * unit * 0.36;
                ctx.beginPath();
                ctx.moveTo(cx - bodyW * 0.23, y);
                ctx.quadraticCurveTo(cx, y + unit * 0.14, cx + bodyW * 0.23, y);
                ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            ctx.lineCap = 'round';
            const drawBeadStrand = (radiusX, dropY, beadRadius, alpha = 1) => {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = coral;
                ctx.strokeStyle = this._ucShadeColor(coral, -0.22);
                ctx.lineWidth = Math.max(0.6, unit * 0.012);
                const start = Math.PI * 0.10;
                const end = Math.PI * 0.90;
                for (let a = start; a <= end + 0.001; a += Math.PI / 13) {
                    const bx = cx + Math.cos(a) * radiusX;
                    const by = neckY + unit * 0.25 + Math.sin(a) * dropY;
                    ctx.beginPath();
                    ctx.ellipse(bx, by, beadRadius * 0.78, beadRadius, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            };
            drawBeadStrand(bodyW * 0.30, unit * 1.15, Math.max(1.4, unit * 0.055), 0.98);
            drawBeadStrand(bodyW * 0.40, unit * 1.55, Math.max(1.2, unit * 0.048), 0.92);
            drawBeadStrand(bodyW * 0.50, unit * 1.95, Math.max(1.0, unit * 0.042), 0.84);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
        return canvas;
    },

    _ucBuildAgbadaSleeveSpec(p, d, armLayout = {}, side = 'right', view = 'front') {
        if (!armLayout || !Number.isFinite(armLayout.x) || !Number.isFinite(armLayout.y)) return null;
        const armW = Math.max(1, Number(armLayout.w) || Number(p.armW) || 24);
        const armH = Math.max(1, Number(armLayout.h) || Number(p.armTotalLen) || 160);
        const unit = Math.max(1, Number(p.hu) || armH / 5);
        const isSide = String(view || '').toLowerCase() === 'side';
        const isShirtGarment = this._ucIsSenatorShirtGarment(d);
        const sleeveW = isShirtGarment
            ? Math.max(armW * (isSide ? 1.35 : 1.45), unit * 0.44)
            : Math.max(armW * (isSide ? 2.05 : 2.35), unit * 0.62);
        const sleeveH = isShirtGarment
            ? Math.max(armH * 0.72, unit * 1.72)
            : Math.max(armH * 0.80, unit * 2.05);
        const layout = {
            x: armLayout.x + armW * 0.5 - sleeveW * 0.5,
            y: armLayout.y - unit * 0.03,
            w: sleeveW,
            h: sleeveH
        };
        return {
            canvas: this._ucDrawAgbadaSleeveCanvas(p, d, {
                w: sleeveW,
                h: sleeveH,
                unit,
                side,
                view: isSide ? 'side' : String(view || 'front').toLowerCase()
            }),
            layout
        };
    },

    _ucDrawAgbadaSleeveCanvas(p, d, metrics) {
        const w = Math.max(12, Math.ceil(metrics.w));
        const h = Math.max(16, Math.ceil(metrics.h));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const clothing = this._ucGetClothing(d);
        const base = clothing.topColor || '#F0E5C6';
        const accent = clothing.accentColor || '#B88A36';
        const outline = this._ucShadeColor(base, -0.26);
        const shadow = this._ucShadeColor(base, -0.15);
        const light = this._ucShadeColor(base, 0.16);
        const unit = Math.max(1, metrics.unit || h / 5);
        const cx = w * 0.5;
        const topY = Math.max(1, unit * 0.03);
        const cuffY = h - Math.max(2, unit * 0.12);
        const isShirtGarment = this._ucIsSenatorShirtGarment({ clothing });
        const topHalf = w * (isShirtGarment ? 0.38 : 0.34);
        const cuffHalf = w * (isShirtGarment ? 0.30 : 0.36);
        const sideSign = String(metrics.side || '').includes('left') ? -1 : 1;

        const path = new Path2D();
        path.moveTo(cx - topHalf, topY + unit * 0.16);
        path.bezierCurveTo(cx - w * (isShirtGarment ? 0.45 : 0.50), h * 0.22, cx - w * (isShirtGarment ? 0.40 : 0.48), h * 0.70, cx - cuffHalf, cuffY);
        path.quadraticCurveTo(cx, h + unit * (isShirtGarment ? 0.00 : 0.02), cx + cuffHalf, cuffY);
        path.bezierCurveTo(cx + w * (isShirtGarment ? 0.40 : 0.48), h * 0.70, cx + w * (isShirtGarment ? 0.45 : 0.50), h * 0.22, cx + topHalf, topY + unit * 0.16);
        path.quadraticCurveTo(cx, topY - unit * 0.02, cx - topHalf, topY + unit * 0.16);
        path.closePath();

        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, shadow);
        gradient.addColorStop(0.45, base);
        gradient.addColorStop(1, light);
        ctx.fillStyle = gradient;
        ctx.fill(path);
        ctx.strokeStyle = this._ucWithAlpha(outline, 0.70);
        ctx.lineWidth = Math.max(1, unit * 0.032);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - topHalf * 0.92, topY + unit * 0.20);
        ctx.bezierCurveTo(cx - w * 0.50, h * 0.22, cx - w * 0.48, h * 0.70, cx - cuffHalf, cuffY);
        ctx.quadraticCurveTo(cx, h + unit * 0.02, cx + cuffHalf, cuffY);
        ctx.bezierCurveTo(cx + w * 0.48, h * 0.70, cx + w * 0.50, h * 0.22, cx + topHalf * 0.92, topY + unit * 0.20);
        ctx.stroke();

        ctx.save();
        ctx.clip(path);
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = this._ucWithAlpha(accent, 0.70);
        ctx.lineWidth = Math.max(1, unit * 0.026);
        for (let i = 0; i < (isShirtGarment ? 2 : 3); i += 1) {
            const offset = (i - 1) * w * 0.16;
            ctx.beginPath();
            ctx.moveTo(cx + offset + sideSign * w * 0.02, topY + unit * 0.18);
            ctx.quadraticCurveTo(cx + offset * 0.45, h * 0.54, cx + offset * 0.74, cuffY - unit * 0.15);
            ctx.stroke();
        }
        if (isShirtGarment) {
            ctx.globalAlpha = 0.86;
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.82);
            ctx.lineWidth = Math.max(1, unit * 0.040);
            ctx.beginPath();
            ctx.moveTo(cx - cuffHalf * 0.84, cuffY - unit * 0.02);
            ctx.quadraticCurveTo(cx, cuffY + unit * 0.08, cx + cuffHalf * 0.84, cuffY - unit * 0.02);
            ctx.stroke();
        }
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(cx - cuffHalf, cuffY);
        ctx.quadraticCurveTo(cx, cuffY + unit * 0.16, cx + cuffHalf, cuffY);
        ctx.lineTo(cx + cuffHalf * 0.86, cuffY + unit * 0.14);
        ctx.quadraticCurveTo(cx, cuffY + unit * 0.30, cx - cuffHalf * 0.86, cuffY + unit * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.globalAlpha = 0.78;
        ctx.strokeStyle = this._ucWithAlpha(outline, 0.52);
        ctx.lineWidth = Math.max(1, unit * 0.028);
        ctx.beginPath();
        ctx.moveTo(cx - cuffHalf * 0.86, cuffY);
        ctx.quadraticCurveTo(cx, cuffY + unit * 0.11, cx + cuffHalf * 0.86, cuffY);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return canvas;
    },

    _ucRenderUniversalCharacterPartCanvas(p, d, roleKey) {
        const key = String(roleKey || '').toLowerCase();
        switch (key) {
            case 'head':
            case 'head-neck':
                return this._ucRenderHeadCanvas(p, d);
            case 'torso':
                return this._ucRenderTorsoCanvas(p, d);
            case 'r-arm':
            case 'right-arm':
                return this._ucRenderArmCanvas(p, d, 'right');
            case 'l-arm':
            case 'left-arm':
                return this._ucRenderArmCanvas(p, d, 'left');
            case 'front-arm':
                return this._ucRenderArmCanvas(p, d, 'front');
            case 'back-arm':
                return this._ucRenderArmCanvas(p, d, 'back');
            case 'r-leg':
            case 'right-leg':
                return this._ucRenderLegCanvas(p, d, 'right');
            case 'l-leg':
            case 'left-leg':
                return this._ucRenderLegCanvas(p, d, 'left');
            case 'front-leg':
                return this._ucRenderLegCanvas(p, d, 'front');
            case 'back-leg':
                return this._ucRenderLegCanvas(p, d, 'back');
            default:
                return null;
        }
    },

    _ucRefreshFrontBackArmaturePartArt(armature, nextFacing = 'front') {
        if (!this._isUniversalCharacterArmature?.(armature) || !armature?.parts) return false;
        const targetFacing = String(nextFacing || '').toLowerCase() === 'back' ? 'back' : 'front';
        const baseConfig = this._getUniversalCharacterStyleConfig?.(armature);
        if (!baseConfig) return false;

        const baseView = String(baseConfig.view || '').toLowerCase();
        const targetView = targetFacing === 'back'
            ? (baseView === 'front-3q' || baseView === 'back-3q' ? 'back-3q' : 'back')
            : (baseView === 'front-3q' || baseView === 'back-3q' ? 'front-3q' : 'front');
        const config = this._normalizeUniversalCharacterConfig({
            ...baseConfig,
            view: targetView,
            viewVariant: targetView
        });
        const ageRatios = this._ucAgeRatios(config.ageGroup);
        const headUnit = config.height / ageRatios.totalHeads;
        const proportions = this._ucApplyBodyAngleToProportions(
            this._ucApplyQualityPresetToProportions(
                this._ucApplyHeadNeckStyleToProportions(
                    this._ucGetProportions(
                        config.gender,
                        config.bodyType,
                        headUnit,
                        ageRatios,
                        targetView,
                        config.build,
                        config.weight,
                        config.muscle,
                        config.partScale,
                        config.hip,
                        config.shoulder,
                        config.belly,
                        config.bust
                    ),
                    config.headNeckStyle,
                    targetView
                ),
                config.qualityPreset,
                targetView,
                config
            ),
            config.bodyAngle,
            targetView,
            config.viewVariant,
            config.sideFacing
        );
        const drawCtx = this._ucBuildDrawContextFromConfig(config);
        const partDrawCtx = this._ucUseIntegratedGarmentParts?.(drawCtx)
            ? (this._ucBuildIntegratedGarmentPartsContext?.(drawCtx) || drawCtx)
            : drawCtx;
        const renderContextFor = (roleKey) => roleKey === 'head-neck' ? drawCtx : partDrawCtx;
        const partMap = {
            'head-neck': 'head-neck',
            torso: 'torso',
            'right-arm': 'right-arm',
            'left-arm': 'left-arm',
            'right-leg': 'right-leg',
            'left-leg': 'left-leg'
        };
        let changed = false;
        Object.entries(partMap).forEach(([partKey, renderKey]) => {
            const obj = armature.parts?.[partKey]?.obj;
            if (!obj?.id) return;
            const canvas = this._ucRenderUniversalCharacterPartCanvas(proportions, renderContextFor(partKey), renderKey);
            if (!canvas) return;
            const dataUrl = canvas.toDataURL('image/png');
            obj.imageSrc = dataUrl;
            obj.imageElement = canvas;
            if (obj._eraserCanvas) obj._eraserCanvas = null;
            obj._tempTrimmedCanvas = canvas;
            obj._ucQualityPreset = config.qualityPreset;
            changed = true;
        });

        const head = armature.parts?.['head-neck']?.obj || null;
        const showFace = targetFacing !== 'back';
        if (head && showFace && (!head._facialFeatures?.mouth || head._facialProportions?.layoutVersion !== 2)) {
            const sy = head.height / (proportions.headH + proportions.neckH);
            this._ucCreateFacialFeatures(head, { ...proportions, neckH: proportions.neckH * sy }, drawCtx);
        }
        if (head?._facialFeatures) {
            const featureIds = new Set(Object.values(head._facialFeatures).filter(Boolean));
            (this.objects?.objects || []).forEach(obj => {
                if (!obj?.id) return;
                if (featureIds.has(obj.id) || obj._facialParentHead === head.id) {
                    if (obj.visible !== showFace) {
                        obj.visible = showFace;
                        changed = true;
                    }
                }
            });
        }

        if (armature.root) {
            armature.root._ucCharacterStyleConfig = JSON.parse(JSON.stringify(config));
            armature.root._ucCharacterVariantKey = targetView;
        }
        return changed;
    },

    _ucExtractGarmentPixels(baseCanvas, paintedCanvas) {
        if (!baseCanvas || !paintedCanvas) return null;
        const width = paintedCanvas.width;
        const height = paintedCanvas.height;
        if (!width || !height) return null;

        const base = document.createElement('canvas');
        base.width = width;
        base.height = height;
        const baseCtx = base.getContext('2d', { willReadFrequently: true });
        baseCtx.drawImage(baseCanvas, 0, 0, width, height);

        const painted = document.createElement('canvas');
        painted.width = width;
        painted.height = height;
        const paintedCtx = painted.getContext('2d', { willReadFrequently: true });
        paintedCtx.drawImage(paintedCanvas, 0, 0, width, height);

        const baseData = baseCtx.getImageData(0, 0, width, height);
        const paintedData = paintedCtx.getImageData(0, 0, width, height);
        const garmentData = paintedCtx.createImageData(width, height);
        let hasVisiblePixels = false;

        for (let i = 0; i < paintedData.data.length; i += 4) {
            const dr = Math.abs(paintedData.data[i] - baseData.data[i]);
            const dg = Math.abs(paintedData.data[i + 1] - baseData.data[i + 1]);
            const db = Math.abs(paintedData.data[i + 2] - baseData.data[i + 2]);
            const da = Math.abs(paintedData.data[i + 3] - baseData.data[i + 3]);
            if ((dr + dg + db + da) <= 3 || paintedData.data[i + 3] <= 1) continue;
            garmentData.data[i] = paintedData.data[i];
            garmentData.data[i + 1] = paintedData.data[i + 1];
            garmentData.data[i + 2] = paintedData.data[i + 2];
            garmentData.data[i + 3] = paintedData.data[i + 3];
            hasVisiblePixels = true;
        }

        if (!hasVisiblePixels) return null;
        const garment = document.createElement('canvas');
        garment.width = width;
        garment.height = height;
        garment.getContext('2d').putImageData(garmentData, 0, 0);
        return garment;
    },

    _ucRenderPinnedGarmentCanvas(p, d, roleKey, baseCanvas = null, options = {}) {
        const base = baseCanvas || this._ucRenderUniversalCharacterPartCanvas(p, d, roleKey);
        if (!base) return null;
        let painted = this._ucRenderUniversalCharacterPartCanvas(p, this._ucBuildPaintedGarmentContext(d), roleKey);
        if (!painted) return null;
        if (options.mirrorSideFacing === true) {
            painted = this._ucMirrorCanvasHorizontally(painted);
        }
        return this._ucExtractGarmentPixels(base, painted);
    },

    _ucPlaceGarmentAfterParent(garment, parent) {
        const list = this.objects?.objects;
        if (!Array.isArray(list) || !garment || !parent) return;
        const garmentIndex = list.indexOf(garment);
        if (garmentIndex >= 0) list.splice(garmentIndex, 1);
        const parentIndex = list.indexOf(parent);
        if (parentIndex >= 0) {
            list.splice(parentIndex + 1, 0, garment);
        } else {
            list.push(garment);
        }
    },

    _ucPlaceGarmentAfterParts(garment, parents = []) {
        const list = this.objects?.objects;
        if (!Array.isArray(list) || !garment) return;
        const garmentIndex = list.indexOf(garment);
        if (garmentIndex >= 0) list.splice(garmentIndex, 1);
        let insertIndex = -1;
        parents.forEach(parent => {
            const idx = list.indexOf(parent);
            if (idx > insertIndex) insertIndex = idx;
        });
        if (insertIndex >= 0) {
            list.splice(insertIndex + 1, 0, garment);
        } else {
            list.push(garment);
        }
    },

    _ucCreateAgbadaPinnedGarment(armature, createdParts, p, drawCtx, options = {}) {
        if (!armature?.root || !createdParts?.torso) return [];
        const hasSideParts = !!(createdParts['front-arm'] || createdParts['back-arm']);
        const isBackView = String(options.frontBackFacing || '').toLowerCase() === 'back';
        const toLayout = (obj) => obj ? {
            x: Number(obj.x) || 0,
            y: Number(obj.y) || 0,
            w: Number(obj.width) || 0,
            h: Number(obj.height) || 0
        } : null;
        const layout = hasSideParts ? {
            torso: toLayout(createdParts.torso),
            head: toLayout(createdParts.head),
            frontArm: toLayout(createdParts['front-arm']),
            backArm: toLayout(createdParts['back-arm']),
            frontLeg: toLayout(createdParts['front-leg']),
            backLeg: toLayout(createdParts['back-leg'])
        } : {
            torso: toLayout(createdParts.torso),
            head: toLayout(createdParts.head),
            rArm: toLayout(createdParts['r-arm']),
            lArm: toLayout(createdParts['l-arm']),
            rLeg: toLayout(createdParts['r-leg']),
            lLeg: toLayout(createdParts['l-leg'])
        };
        const spec = this._ucBuildAgbadaRobeSpec(p, drawCtx, layout, hasSideParts ? 'side' : (isBackView ? 'back' : 'front'));
        if (!spec?.canvas || !spec?.layout) return [];
        const clothing = this._ucGetClothing(drawCtx);
        const isShirtGarment = this._ucIsSenatorShirtGarment({ clothing });
        const isWaistSkirtGarment = clothing.bottomStyle === 'skirt' || this._ucIsWaistSkirtGarment?.(clothing);
        const torso = createdParts.torso;
        const sideFrontArm = hasSideParts ? createdParts['front-arm'] : null;
        const robeLayer = hasSideParts
            ? Math.max(
                (torso.layer || 0) + 0.5,
                Math.min(
                    Number.isFinite(sideFrontArm?.layer) ? sideFrontArm.layer - 0.25 : (torso.layer || 0) + 2.5,
                    (Number.isFinite(createdParts['front-leg']?.layer) ? createdParts['front-leg'].layer : (torso.layer || 0) + 1) + 0.45
                )
            )
            : (torso.layer || 0) + 0.5;

        const parentAnchorX = isWaistSkirtGarment ? (spec.waistAnchor?.parentAnchorX ?? 0.5) : 0.5;
        const parentAnchorY = isWaistSkirtGarment ? (spec.waistAnchor?.parentAnchorY ?? 0.52) : 0.10;
        const anchorWorldX = isWaistSkirtGarment && Number.isFinite(spec.waistAnchor?.worldX)
            ? spec.waistAnchor.worldX
            : torso.x + torso.width * parentAnchorX;
        const anchorWorldY = isWaistSkirtGarment && Number.isFinite(spec.waistAnchor?.worldY)
            ? spec.waistAnchor.worldY
            : torso.y + torso.height * parentAnchorY;
        const pivotX = Math.max(0.05, Math.min(0.95, (anchorWorldX - spec.layout.x) / spec.layout.w));
        const pivotY = Math.max(0.05, Math.min(0.95, (anchorWorldY - spec.layout.y) / spec.layout.h));
        const previousSuppressHistory = this.objects?._suppressHistory;
        if (options.pushHistory === false && this.objects) this.objects._suppressHistory = true;

        const garments = [];
        let garment = null;
        try {
            garment = new StageObject('image', {
                x: spec.layout.x,
                y: spec.layout.y,
                width: spec.layout.w,
                height: spec.layout.h,
                imageSrc: spec.canvas.toDataURL('image/png'),
                name: isWaistSkirtGarment
                    ? (isBackView ? 'Skirt (Back)' : 'Skirt')
                    : (isShirtGarment ? (isBackView ? 'Senator Shirt (Back)' : 'Senator Shirt') : (isBackView ? 'Agbada Robe (Back)' : 'Agbada Robe')),
                layer: robeLayer,
                opacity: 1
            });
            garment.pivotX = pivotX;
            garment.pivotY = pivotY;
            garment.rotation = torso.rotation || 0;
            garment.tiltX = torso.tiltX || 0;
            garment.tiltY = torso.tiltY || 0;
            garment.jointContours = false;
            garment.pinContour = false;
            garment.pinSyncJoints = false;
            garment.pinnedTo = torso.id;
            garment.pinTargetType = 'anchor';
            garment.pinAnchorX = parentAnchorX;
            garment.pinAnchorY = parentAnchorY;
            garment.pinOffsetX = 0;
            garment.pinOffsetY = 0;
            garment.pinRotationMode = 'inherit';
            garment.pinInheritRotation = true;
            garment._ucGarmentLayer = true;
            garment._ucGarmentRootId = armature.root.id;
            garment._ucGarmentForPartId = torso.id;
            garment._ucGarmentPartKey = 'agbada-robe';
            garment._ucGarmentRoleKey = 'agbada-robe';
            garment._ucGarmentFamilyId = armature.root._ucCharacterFamilyId || null;
            garment._ucGarmentVariantKey = armature.root._ucCharacterVariantKey || null;
            garment._ucAgbadaRobeLayer = true;
            garment._ucSideTorsoGarmentLayer = hasSideParts;
            globalThis.ArmatureGarmentPolicies?.applyToObject?.(garment, {
                kind: isWaistSkirtGarment ? 'skirt' : 'robe',
                bottomClothing: clothing.bottomStyle,
                topClothing: clothing.topStyle,
                outfit: clothing.outfitPreset,
                viewFamily: hasSideParts ? 'side' : 'front-back-three-quarter'
            });

            this.objects.addObject(garment);
            const robeLayerAnchors = hasSideParts
                ? [
                    createdParts['back-leg'],
                    createdParts['back-arm'],
                    createdParts.torso,
                    createdParts.head,
                    createdParts['front-leg']
                ]
                : [
                    createdParts['r-leg'],
                    createdParts['l-leg'],
                    createdParts.torso,
                    createdParts['r-arm'],
                    createdParts['l-arm']
                ];
            this._ucPlaceGarmentAfterParts(garment, robeLayerAnchors.filter(Boolean));
            garments.push(garment);

            if (!isWaistSkirtGarment) {
                const viewKey = hasSideParts ? 'side' : (isBackView ? 'back' : 'front');
                const sleeveParents = hasSideParts ? [
                    { key: 'back-arm', side: 'back' },
                    { key: 'front-arm', side: 'front' }
                ] : [
                    { key: 'r-arm', side: isBackView ? 'left' : 'right' },
                    { key: 'l-arm', side: isBackView ? 'right' : 'left' }
                ];
                sleeveParents.forEach(sleeveInfo => {
                    const parent = createdParts[sleeveInfo.key];
                    if (!parent) return;
                    const sleeveSpec = this._ucBuildAgbadaSleeveSpec(p, drawCtx, toLayout(parent), sleeveInfo.side, viewKey);
                    if (!sleeveSpec?.canvas || !sleeveSpec?.layout) return;
                    const parentPivotX = Number.isFinite(parent.pivotX) ? parent.pivotX : 0.5;
                    const parentPivotY = Number.isFinite(parent.pivotY) ? parent.pivotY : 0.02;
                    const parentAnchorX = parent.x + parent.width * parentPivotX;
                    const parentAnchorY = parent.y + parent.height * parentPivotY;
                    const sleevePivotX = Math.max(0.05, Math.min(0.95, (parentAnchorX - sleeveSpec.layout.x) / sleeveSpec.layout.w));
                    const sleevePivotY = Math.max(0.01, Math.min(0.35, (parentAnchorY - sleeveSpec.layout.y) / sleeveSpec.layout.h));
                    const sleeve = new StageObject('image', {
                        x: sleeveSpec.layout.x,
                        y: sleeveSpec.layout.y,
                        width: sleeveSpec.layout.w,
                        height: sleeveSpec.layout.h,
                        imageSrc: sleeveSpec.canvas.toDataURL('image/png'),
                        name: `${parent.name || 'Arm'} ${isShirtGarment ? 'Senator Shirt Sleeve' : 'Agbada Sleeve'}`,
                        layer: (parent.layer || 0) + 0.12,
                        opacity: 1
                    });
                    sleeve.pivotX = sleevePivotX;
                    sleeve.pivotY = sleevePivotY;
                    sleeve.rotation = parent.rotation || 0;
                    sleeve.tiltX = parent.tiltX || 0;
                    sleeve.tiltY = parent.tiltY || 0;
                    sleeve.joints = parent.joints ? JSON.parse(JSON.stringify(parent.joints)) : [];
                    sleeve.jointDirection = parent.jointDirection;
                    sleeve.jointContours = false;
                    sleeve.pinContour = false;
                    sleeve.pinSyncJoints = true;
                    sleeve.pinnedTo = parent.id;
                    sleeve.pinTargetType = 'anchor';
                    sleeve.pinAnchorX = parentPivotX;
                    sleeve.pinAnchorY = parentPivotY;
                    sleeve.pinOffsetX = 0;
                    sleeve.pinOffsetY = 0;
                    sleeve.pinRotationMode = 'inherit';
                    sleeve.pinInheritRotation = true;
                    sleeve._ucGarmentLayer = true;
                    sleeve._ucGarmentRootId = armature.root.id;
                    sleeve._ucGarmentForPartId = parent.id;
                    sleeve._ucGarmentPartKey = `agbada-sleeve-${sleeveInfo.side}`;
                    sleeve._ucGarmentRoleKey = parent._armatureRoleKey || parent._armaturePartKey || sleeveInfo.key;
                    sleeve._ucGarmentFamilyId = armature.root._ucCharacterFamilyId || null;
                    sleeve._ucGarmentVariantKey = armature.root._ucCharacterVariantKey || null;
                    sleeve._ucAgbadaSleeveLayer = true;
                    globalThis.ArmatureGarmentPolicies?.applyToObject?.(sleeve, {
                        kind: 'sleeve',
                        topClothing: clothing.topStyle,
                        outfit: clothing.outfitPreset
                    });

                    this.objects.addObject(sleeve);
                    this._ucPlaceGarmentAfterParent(sleeve, parent);
                    garments.push(sleeve);
                });
            }
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppressHistory;
        }

        if (armature.root) {
            armature.root._ucGarmentIds = garments.map(obj => obj.id);
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        return garments;
    },

    _ucCreatePinnedGarmentSet(armature, createdParts, p, drawCtx, partCanvases = {}, options = {}) {
        if (!this._ucUsePinnedGarments(drawCtx) || !armature?.root) return [];
        if (this._ucIsAgbadaGarment(drawCtx) || this._ucIsWaistSkirtGarment?.(this._ucGetClothing(drawCtx))) {
            return this._ucCreateAgbadaPinnedGarment(armature, createdParts, p, drawCtx, options);
        }
        const hasSideParts = !!(createdParts?.['front-arm'] || createdParts?.['back-arm']);
        const specs = hasSideParts
            ? [
                { partKey: 'back-arm', roleKey: 'back-arm' },
                { partKey: 'back-leg', roleKey: 'back-leg' },
                { partKey: 'torso', roleKey: 'torso' },
                { partKey: 'front-leg', roleKey: 'front-leg' },
                { partKey: 'front-arm', roleKey: 'front-arm' }
            ]
            : String(options.frontBackFacing || '').toLowerCase() === 'back' ? [
                { partKey: 'torso', roleKey: 'torso' },
                { partKey: 'r-arm', roleKey: 'left-arm' },
                { partKey: 'l-arm', roleKey: 'right-arm' },
                { partKey: 'r-leg', roleKey: 'left-leg' },
                { partKey: 'l-leg', roleKey: 'right-leg' }
            ] : [
                { partKey: 'torso', roleKey: 'torso' },
                { partKey: 'r-arm', roleKey: 'right-arm' },
                { partKey: 'l-arm', roleKey: 'left-arm' },
                { partKey: 'r-leg', roleKey: 'right-leg' },
                { partKey: 'l-leg', roleKey: 'left-leg' }
            ];
        const garments = [];
        const previousSuppressHistory = this.objects?._suppressHistory;
        if (options.pushHistory === false && this.objects) this.objects._suppressHistory = true;

        try {
            specs.forEach(spec => {
                const parent = createdParts?.[spec.partKey];
                if (!parent) return;
                const garmentCanvas = this._ucRenderPinnedGarmentCanvas(
                    p,
                    drawCtx,
                    spec.roleKey,
                    partCanvases[spec.partKey] || partCanvases[spec.roleKey] || null,
                    { mirrorSideFacing: options.mirrorSideFacing === true }
                );
                if (!garmentCanvas) return;

                const garment = new StageObject('image', {
                    x: parent.x,
                    y: parent.y,
                    width: parent.width,
                    height: parent.height,
                    imageSrc: garmentCanvas.toDataURL('image/png'),
                    name: `${parent.name || 'Body Part'} Clothing`,
                    layer: (parent.layer || 0) + 0.01,
                    opacity: 1
                });
                garment.pivotX = Number.isFinite(parent.pivotX) ? parent.pivotX : 0.5;
                garment.pivotY = Number.isFinite(parent.pivotY) ? parent.pivotY : 0.5;
                garment.rotation = parent.rotation || 0;
                garment.tiltX = parent.tiltX || 0;
                garment.tiltY = parent.tiltY || 0;
                garment.joints = parent.joints ? JSON.parse(JSON.stringify(parent.joints)) : [];
                garment.jointDirection = parent.jointDirection;
                garment.jointContours = false;
                garment.pinContour = false;
                garment.pinSyncJoints = true;
                garment.pinnedTo = parent.id;
                garment.pinTargetType = 'anchor';
                garment.pinAnchorX = garment.pivotX;
                garment.pinAnchorY = garment.pivotY;
                garment.pinOffsetX = 0;
                garment.pinOffsetY = 0;
                garment.pinRotationMode = 'inherit';
                garment.pinInheritRotation = true;
                garment._ucGarmentLayer = true;
                garment._ucGarmentRootId = armature.root.id;
                garment._ucGarmentForPartId = parent.id;
                garment._ucGarmentPartKey = spec.roleKey;
                garment._ucGarmentFamilyId = armature.root._ucCharacterFamilyId || null;
                garment._ucGarmentVariantKey = armature.root._ucCharacterVariantKey || null;
                globalThis.ArmatureGarmentPolicies?.applyToObject?.(garment, {
                    adapterId: 'overlay',
                    topClothing: this._ucGetClothing(drawCtx)?.topStyle,
                    bottomClothing: this._ucGetClothing(drawCtx)?.bottomStyle,
                    outfit: this._ucGetClothing(drawCtx)?.outfitPreset
                });

                this.objects.addObject(garment);
                this._ucPlaceGarmentAfterParent(garment, parent);
                garments.push(garment);
            });
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppressHistory;
        }

        if (armature.root) {
            armature.root._ucGarmentIds = garments.map(obj => obj.id);
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        return garments;
    },

    _getUniversalCharacterGarmentObjects(armature) {
        if (!armature?.root?.id) return [];
        const armaturePartIds = new Set(this._getArmatureObjects(armature).map(obj => obj?.id).filter(Boolean));
        const rootId = armature.root.id;
        const familyId = armature.root._ucCharacterFamilyId || null;
        const variantKey = armature.root._ucCharacterVariantKey || null;
        const pool = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
        return pool.filter(obj => {
            if (!obj?._ucGarmentLayer) return false;
            if (obj._ucGarmentRootId === rootId) return true;
            if (armaturePartIds.has(obj._ucGarmentForPartId)) return true;
            return !!familyId
                && obj._ucGarmentFamilyId === familyId
                && (!variantKey || !obj._ucGarmentVariantKey || obj._ucGarmentVariantKey === variantKey);
        });
    },

    _getUniversalCharacterBackViewHelperObjects(armature) {
        if (!armature?.root?.id) return [];
        const armaturePartIds = new Set(this._getArmatureObjects(armature).map(obj => obj?.id).filter(Boolean));
        const pool = Array.isArray(this.objects?.objects) ? this.objects.objects : [];
        return pool.filter(obj => {
            if (!obj?.id) return false;
            const isBackHelper = obj._backViewScalpHair
                || obj._backViewTorsoOverlay
                || obj.name === 'Scalp Hair (Back View)'
                || obj.name === 'Torso (Back View)';
            if (!isBackHelper) return false;
            const parentId = obj._backViewScalpHairParentId || obj._backViewTorsoOverlayParentId || obj.pinnedTo;
            return !!parentId && armaturePartIds.has(parentId);
        });
    },

    openUniversalCharacterImageFitPanel() {
        document.getElementById('uc-image-fit-panel')?.remove();
        this._ucCloneState = this._ucCloneState || {};
        const panel = document.createElement('div');
        panel.id = 'uc-image-fit-panel';
        panel.className = 'body-stencil-panel';
        panel.style.width = '390px';
        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-paintbrush"></i> Clone Character
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="bs-body">
                <div class="bs-step-label">Character Skin Transfer</div>
                <div class="bs-tip" style="font-size:11px;color:#cbd5e1;line-height:1.45;margin-bottom:8px;">
                    Capture the source image and dummy separately. They do not need to overlap. Adopt silhouette or pose manually, preview the clone, edit parts, then apply.
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                    <button class="btn-sm btn-secondary" id="uc-clone-capture-source"><i class="fas fa-image"></i> Capture Source</button>
                    <button class="btn-sm btn-secondary" id="uc-clone-capture-dummy"><i class="fas fa-person-rays"></i> Capture Dummy</button>
                </div>
                <div class="bs-prep-section" style="margin-bottom:8px;">
                    <label style="display:block;font-size:10px;color:#94a3b8;margin-bottom:3px;">Fit mode</label>
                    <select id="uc-fit-mode" class="form-control" style="width:100%;margin-bottom:7px;">
                        <option value="height">Fit height and center (best for posed characters)</option>
                        <option value="full">Fit full silhouette bounds</option>
                    </select>
                    <label style="display:block;font-size:10px;color:#94a3b8;margin-bottom:3px;">Transfer mode</label>
                    <select id="uc-fit-transfer-mode" class="form-control" style="width:100%;margin-bottom:7px;">
                        <option value="proportional">Proportional character map (best for idle/front)</option>
                        <option value="auto">Auto source pose regions (experimental)</option>
                        <option value="aligned">Aligned overlay sampling</option>
                    </select>
                    <label class="bs-inline-check"><input type="checkbox" id="uc-fit-adapt-shapes" checked> <span style="font-size:11px;">Adapt body part sizes to source image</span></label>
                    <label class="bs-inline-check"><input type="checkbox" id="uc-fit-hide-source"> <span style="font-size:11px;">Hide source image after transfer</span></label>
                    <label class="bs-inline-check"><input type="checkbox" id="uc-fit-align-face"> <span style="font-size:11px;">Show and align UC face controls after transfer</span></label>
                    <label class="bs-inline-check"><input type="checkbox" id="uc-fit-hide-generated" checked> <span style="font-size:11px;">Hide built-in face/clothing overlays after transfer</span></label>
                </div>
                <div class="bs-actions" style="display:grid;grid-template-columns:1fr;gap:6px;">
                    <button class="btn-sm btn-secondary" id="uc-fit-match-shape"><i class="fas fa-expand-arrows-alt"></i> Match Height / Shape</button>
                    <button class="btn-sm btn-secondary" id="uc-clone-adopt-silhouette"><i class="fas fa-person-booth"></i> Adopt Silhouette</button>
                    <button class="btn-sm btn-secondary" id="uc-clone-match-pose"><i class="fas fa-person-walking"></i> Match Pose Regions</button>
                    <button class="btn-sm btn-secondary" id="uc-clone-preview"><i class="fas fa-eye"></i> Create Clone Preview</button>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                        <button class="btn-primary btn-sm" id="uc-clone-apply-preview"><i class="fas fa-check"></i> Apply Preview</button>
                        <button class="btn-sm btn-secondary" id="uc-clone-cancel-preview"><i class="fas fa-ban"></i> Cancel Preview</button>
                    </div>
                    <button class="btn-sm btn-secondary" id="uc-fit-transfer-look"><i class="fas fa-fill-drip"></i> Transfer Look</button>
                    <button class="btn-primary btn-sm" id="uc-fit-match-transfer"><i class="fas fa-magic"></i> Match + Transfer</button>
                    <button class="btn-sm btn-secondary" id="uc-fit-create-face-parts"><i class="fas fa-face-smile"></i> Create Editable Face Parts</button>
                </div>
                <div class="bs-prep-section" style="margin-top:10px;margin-bottom:8px;">
                    <div class="bs-step-label" style="margin-bottom:6px;">Clone Edit Mode</div>
                    <label style="display:block;font-size:10px;color:#94a3b8;margin-bottom:3px;">Target part</label>
                    <select id="uc-clone-edit-role" class="form-control" style="width:100%;margin-bottom:7px;">
                        ${this._ucBuildCloneRoleOptionsHtml()}
                    </select>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
                        <button class="btn-sm btn-secondary" id="uc-clone-retransfer-part"><i class="fas fa-rotate"></i> Re-transfer Part</button>
                        <button class="btn-sm btn-secondary" id="uc-clone-send-selected"><i class="fas fa-share"></i> Send Patch</button>
                    </div>
                    <div class="bs-prep-section" style="margin:8px 0;padding:8px;border:1px solid rgba(148,163,184,0.22);border-radius:6px;">
                        <div class="bs-step-label" style="margin-bottom:6px;">Correction Mode</div>
                        <div style="font-size:10px;color:#94a3b8;line-height:1.35;margin-bottom:6px;">Make a patch copy, erase everything except misplaced pixels, then send the patch to the correct target part.</div>
                        <button class="btn-sm btn-secondary" id="uc-clone-make-correction-patch" style="width:100%;margin-bottom:6px;"><i class="fas fa-scissors"></i> Make Patch Copy</button>
                        <label class="bs-inline-check"><input type="checkbox" id="uc-clone-erase-original-after-send" checked> <span style="font-size:11px;">Remove sent pixels from original preview</span></label>
                        <label class="bs-inline-check"><input type="checkbox" id="uc-clone-remove-patch-after-send" checked> <span style="font-size:11px;">Remove patch after sending</span></label>
                    </div>
                    <button class="btn-sm btn-secondary" id="uc-clone-brush-selected" style="width:100%;margin-bottom:6px;" title="Use the captured source image to manually paint onto the selected clone preview part"><i class="fas fa-stamp"></i> Paint Selected Preview</button>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
                        <button class="btn-sm btn-secondary" id="uc-clone-blend-selected"><i class="fas fa-water"></i> Blend Selected</button>
                        <button class="btn-sm btn-secondary" id="uc-clone-erase-color"><i class="fas fa-eraser"></i> Erase Color</button>
                    </div>
                    <div class="bs-prep-section" style="margin:8px 0;padding:8px;border:1px solid rgba(148,163,184,0.22);border-radius:6px;">
                        <div class="bs-step-label" style="margin-bottom:6px;">Preview Alignment</div>
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                            <label style="font-size:10px;color:#94a3b8;">Step</label>
                            <input type="number" id="uc-clone-align-step" class="form-control" min="1" max="80" step="1" value="5" style="width:64px;">
                            <span style="font-size:10px;color:#94a3b8;">px / degrees</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">
                            <span></span>
                            <button class="btn-sm btn-secondary" id="uc-clone-nudge-up" title="Move selected preview up"><i class="fas fa-arrow-up"></i></button>
                            <span></span>
                            <button class="btn-sm btn-secondary" id="uc-clone-nudge-left" title="Move selected preview left"><i class="fas fa-arrow-left"></i></button>
                            <button class="btn-sm btn-secondary" id="uc-clone-reset-selected" title="Reset selected preview to generated position"><i class="fas fa-undo"></i></button>
                            <button class="btn-sm btn-secondary" id="uc-clone-nudge-right" title="Move selected preview right"><i class="fas fa-arrow-right"></i></button>
                            <span></span>
                            <button class="btn-sm btn-secondary" id="uc-clone-nudge-down" title="Move selected preview down"><i class="fas fa-arrow-down"></i></button>
                            <span></span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:6px;">
                            <button class="btn-sm btn-secondary" id="uc-clone-resize-smaller"><i class="fas fa-compress"></i> Smaller</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-resize-larger"><i class="fas fa-expand"></i> Larger</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-resize-narrower"><i class="fas fa-arrows-left-right-to-line"></i> Narrower</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-resize-wider"><i class="fas fa-left-right"></i> Wider</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-resize-shorter"><i class="fas fa-arrows-up-down-to-line"></i> Shorter</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-resize-taller"><i class="fas fa-up-down"></i> Taller</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">
                            <button class="btn-sm btn-secondary" id="uc-clone-rotate-left"><i class="fas fa-rotate-left"></i> -</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-rotation-reset"><i class="fas fa-location-arrow"></i> 0</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-rotate-right"><i class="fas fa-rotate-right"></i> +</button>
                        </div>
                        <button class="btn-primary btn-sm" id="uc-clone-apply-selected" style="width:100%;"><i class="fas fa-check-circle"></i> Apply Selected Part Only</button>
                    </div>
                    <div class="bs-prep-section" style="margin:8px 0;padding:8px;border:1px solid rgba(148,163,184,0.22);border-radius:6px;">
                        <div class="bs-step-label" style="margin-bottom:6px;">Preview Mask</div>
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                            <label style="font-size:10px;color:#94a3b8;">Brush</label>
                            <input type="range" id="uc-clone-mask-brush" min="4" max="120" step="1" value="28" style="flex:1;">
                            <span id="uc-clone-mask-brush-val" style="font-size:10px;color:#94a3b8;min-width:28px;">28</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;">
                            <button class="btn-sm btn-secondary" id="uc-clone-mask-erase-brush"><i class="fas fa-eraser"></i> Erase Brush</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-mask-restore-brush"><i class="fas fa-paintbrush"></i> Restore Brush</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
                            <button class="btn-sm btn-secondary" id="uc-clone-mask-feather"><i class="fas fa-water"></i> Feather</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-mask-trim"><i class="fas fa-crop-simple"></i> Trim</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-mask-duplicate"><i class="fas fa-copy"></i> Duplicate</button>
                        </div>
                    </div>
                    <div class="bs-prep-section" style="margin:8px 0;padding:8px;border:1px solid rgba(148,163,184,0.22);border-radius:6px;">
                        <div class="bs-step-label" style="margin-bottom:6px;">Transfer Review</div>
                        <div id="uc-clone-review-summary" style="font-size:10px;color:#94a3b8;line-height:1.35;margin-bottom:6px;">Create a clone preview, then review parts before applying.</div>
                        <div id="uc-clone-review-list" style="max-height:132px;overflow:auto;border:1px solid rgba(148,163,184,0.14);border-radius:5px;padding:4px;margin-bottom:6px;font-size:10px;color:#cbd5e1;"></div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:6px;">
                            <button class="btn-sm btn-secondary" id="uc-clone-review-refresh"><i class="fas fa-list-check"></i> Review</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-review-solo"><i class="fas fa-eye"></i> Solo Selected</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-review-show-all"><i class="fas fa-eye-low-vision"></i> Show All</button>
                            <button class="btn-sm btn-secondary" id="uc-clone-review-rebuild-missing"><i class="fas fa-rotate"></i> Rebuild Missing</button>
                        </div>
                        <button class="btn-primary btn-sm" id="uc-clone-review-apply-ready" style="width:100%;"><i class="fas fa-check-double"></i> Apply Ready Parts</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <input type="color" id="uc-clone-edit-color" value="#ffffff" title="Color to erase from selected preview part">
                        <input type="range" id="uc-clone-edit-tolerance" min="4" max="120" step="1" value="34" style="flex:1;" title="Erase color tolerance">
                        <span id="uc-clone-edit-tolerance-val" style="font-size:10px;color:#94a3b8;min-width:26px;">34</span>
                    </div>
                </div>
                <div id="uc-fit-status" style="font-size:10px;color:#94a3b8;line-height:1.4;margin-top:8px;">
                    Capture source and dummy first. Adopt Silhouette changes the dummy size/outline without requiring overlap; Create Preview shows temporary clone parts before final apply.
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this._makeDraggable?.(panel);
        panel.querySelector('.ja-close')?.addEventListener('click', () => panel.remove());
        const setStatus = (message) => {
            const status = panel.querySelector('#uc-fit-status');
            if (status) status.textContent = message;
        };
        const getOptions = () => ({
            fitMode: panel.querySelector('#uc-fit-mode')?.value || 'height',
            transferMode: panel.querySelector('#uc-fit-transfer-mode')?.value || 'proportional',
            adaptShapes: panel.querySelector('#uc-fit-adapt-shapes')?.checked !== false,
            alignFace: panel.querySelector('#uc-fit-align-face')?.checked !== false,
            hideSource: !!panel.querySelector('#uc-fit-hide-source')?.checked,
            hideGenerated: panel.querySelector('#uc-fit-hide-generated')?.checked !== false
        });
        panel.querySelector('#uc-clone-capture-source')?.addEventListener('click', () => {
            const source = this._ucCaptureCloneSourceFromSelection();
            if (source) setStatus(`Source captured: ${source.name || source.id}. Select the dummy or keep using the captured one.`);
        });
        panel.querySelector('#uc-clone-capture-dummy')?.addEventListener('click', () => {
            const armature = this._ucCaptureCloneArmatureFromSelection();
            if (armature) setStatus(`Dummy captured: ${armature.root?.name || armature.root?.id}. Source and dummy can stay apart.`);
        });
        panel.querySelector('#uc-fit-match-shape')?.addEventListener('click', () => {
            this.matchUniversalCharacterToSelectedImage(getOptions());
        });
        panel.querySelector('#uc-clone-adopt-silhouette')?.addEventListener('click', () => {
            this.adoptSourceSilhouetteForUniversalCharacter(getOptions());
        });
        panel.querySelector('#uc-clone-match-pose')?.addEventListener('click', () => {
            this.matchUniversalCharacterPoseRegions(getOptions());
        });
        const refreshReview = () => this.renderCloneTransferReview(panel);
        panel.querySelector('#uc-clone-preview')?.addEventListener('click', async () => {
            await this.createUniversalCharacterClonePreview(getOptions());
            refreshReview();
        });
        panel.querySelector('#uc-clone-apply-preview')?.addEventListener('click', () => {
            this.applyUniversalCharacterClonePreview(getOptions());
            refreshReview();
        });
        panel.querySelector('#uc-clone-cancel-preview')?.addEventListener('click', () => {
            this.cancelUniversalCharacterClonePreview();
            refreshReview();
        });
        panel.querySelector('#uc-fit-transfer-look')?.addEventListener('click', () => {
            this.transferSelectedImageLookToUniversalCharacter(getOptions());
        });
        panel.querySelector('#uc-fit-match-transfer')?.addEventListener('click', async () => {
            const matched = await this.matchUniversalCharacterToSelectedImage({ ...getOptions(), pushHistory: false, toast: false });
            if (matched) await this.transferSelectedImageLookToUniversalCharacter(getOptions());
        });
        panel.querySelector('#uc-fit-create-face-parts')?.addEventListener('click', () => {
            this.createEditableFacePartsFromSelectedTransfer(getOptions());
        });
        panel.querySelector('#uc-clone-retransfer-part')?.addEventListener('click', () => {
            this.retransferUniversalCharacterClonePreviewPart(panel.querySelector('#uc-clone-edit-role')?.value, getOptions());
        });
        panel.querySelector('#uc-clone-send-selected')?.addEventListener('click', async () => {
            await this.sendSelectedClonePreviewToPart(panel.querySelector('#uc-clone-edit-role')?.value, {
                eraseOriginal: panel.querySelector('#uc-clone-erase-original-after-send')?.checked !== false,
                removePatch: panel.querySelector('#uc-clone-remove-patch-after-send')?.checked !== false
            });
            refreshReview();
        });
        panel.querySelector('#uc-clone-make-correction-patch')?.addEventListener('click', () => {
            this.makeSelectedCloneCorrectionPatch();
        });
        panel.querySelector('#uc-clone-brush-selected')?.addEventListener('click', () => {
            this.paintSelectedClonePreviewWithCloneBrush();
        });
        panel.querySelector('#uc-clone-blend-selected')?.addEventListener('click', () => {
            this.blendSelectedClonePreviewPart();
        });
        panel.querySelector('#uc-clone-erase-color')?.addEventListener('click', () => {
            this.eraseColorFromSelectedClonePreviewPart(
                panel.querySelector('#uc-clone-edit-color')?.value || '#ffffff',
                parseInt(panel.querySelector('#uc-clone-edit-tolerance')?.value || '34', 10)
            );
        });
        const alignStep = () => Math.max(1, Math.min(80, parseFloat(panel.querySelector('#uc-clone-align-step')?.value || '5') || 5));
        panel.querySelector('#uc-clone-nudge-up')?.addEventListener('click', () => this.nudgeSelectedClonePreview(0, -alignStep()));
        panel.querySelector('#uc-clone-nudge-down')?.addEventListener('click', () => this.nudgeSelectedClonePreview(0, alignStep()));
        panel.querySelector('#uc-clone-nudge-left')?.addEventListener('click', () => this.nudgeSelectedClonePreview(-alignStep(), 0));
        panel.querySelector('#uc-clone-nudge-right')?.addEventListener('click', () => this.nudgeSelectedClonePreview(alignStep(), 0));
        panel.querySelector('#uc-clone-resize-smaller')?.addEventListener('click', () => this.resizeSelectedClonePreview(0.92, 0.92));
        panel.querySelector('#uc-clone-resize-larger')?.addEventListener('click', () => this.resizeSelectedClonePreview(1.08, 1.08));
        panel.querySelector('#uc-clone-resize-narrower')?.addEventListener('click', () => this.resizeSelectedClonePreview(0.92, 1));
        panel.querySelector('#uc-clone-resize-wider')?.addEventListener('click', () => this.resizeSelectedClonePreview(1.08, 1));
        panel.querySelector('#uc-clone-resize-shorter')?.addEventListener('click', () => this.resizeSelectedClonePreview(1, 0.92));
        panel.querySelector('#uc-clone-resize-taller')?.addEventListener('click', () => this.resizeSelectedClonePreview(1, 1.08));
        panel.querySelector('#uc-clone-rotate-left')?.addEventListener('click', () => this.rotateSelectedClonePreview(-alignStep()));
        panel.querySelector('#uc-clone-rotate-right')?.addEventListener('click', () => this.rotateSelectedClonePreview(alignStep()));
        panel.querySelector('#uc-clone-rotation-reset')?.addEventListener('click', () => this.rotateSelectedClonePreview(0, { absolute: true }));
        panel.querySelector('#uc-clone-reset-selected')?.addEventListener('click', () => this.resetSelectedClonePreview());
        panel.querySelector('#uc-clone-apply-selected')?.addEventListener('click', () => this.applySelectedClonePreviewPart(getOptions()));
        const maskBrushSize = () => Math.max(4, Math.min(120, parseInt(panel.querySelector('#uc-clone-mask-brush')?.value || '28', 10) || 28));
        panel.querySelector('#uc-clone-mask-erase-brush')?.addEventListener('click', () => this.startSelectedClonePreviewMaskBrush('erase', maskBrushSize()));
        panel.querySelector('#uc-clone-mask-restore-brush')?.addEventListener('click', () => this.startSelectedClonePreviewMaskBrush('restore', maskBrushSize()));
        panel.querySelector('#uc-clone-mask-feather')?.addEventListener('click', () => this.featherSelectedClonePreviewMask(Math.max(0.8, maskBrushSize() / 18)));
        panel.querySelector('#uc-clone-mask-trim')?.addEventListener('click', async () => {
            await this.trimSelectedClonePreviewTransparentBounds();
            refreshReview();
        });
        panel.querySelector('#uc-clone-mask-duplicate')?.addEventListener('click', () => this.duplicateSelectedClonePreviewToRole(panel.querySelector('#uc-clone-edit-role')?.value));
        panel.querySelector('#uc-clone-review-refresh')?.addEventListener('click', refreshReview);
        panel.querySelector('#uc-clone-review-solo')?.addEventListener('click', () => this.soloSelectedClonePreviewPart());
        panel.querySelector('#uc-clone-review-show-all')?.addEventListener('click', () => this.showAllClonePreviewParts());
        panel.querySelector('#uc-clone-review-rebuild-missing')?.addEventListener('click', async () => {
            await this.rebuildMissingClonePreviewParts(getOptions());
            refreshReview();
        });
        panel.querySelector('#uc-clone-review-apply-ready')?.addEventListener('click', async () => {
            await this.applyReadyClonePreviewParts(getOptions());
            refreshReview();
        });
        panel.querySelector('#uc-clone-review-list')?.addEventListener('click', (event) => {
            const row = event.target.closest?.('[data-preview-id]');
            if (!row) return;
            const preview = this.objects?.getObjectById?.(row.getAttribute('data-preview-id'));
            if (preview) {
                this.objects?.select?.([preview.id]);
                const roleSelect = panel.querySelector('#uc-clone-edit-role');
                if (roleSelect && preview._ucClonePreviewRole) roleSelect.value = preview._ucClonePreviewRole;
                this.stage?.requestRender?.();
            }
        });
        panel.querySelector('#uc-clone-mask-brush')?.addEventListener('input', (event) => {
            const val = panel.querySelector('#uc-clone-mask-brush-val');
            if (val) val.textContent = event.target.value;
        });
        panel.querySelector('#uc-clone-edit-tolerance')?.addEventListener('input', (event) => {
            const val = panel.querySelector('#uc-clone-edit-tolerance-val');
            if (val) val.textContent = event.target.value;
        });
        setTimeout(refreshReview, 0);
        return panel;
    },

    _ucBuildCloneRoleOptionsHtml() {
        const roles = [
            ['head-neck', 'Head / Neck'],
            ['torso', 'Torso'],
            ['right-arm', 'Right Arm'],
            ['left-arm', 'Left Arm'],
            ['front-arm', 'Front Arm'],
            ['back-arm', 'Back Arm'],
            ['right-leg', 'Right Leg'],
            ['left-leg', 'Left Leg'],
            ['front-leg', 'Front Leg'],
            ['back-leg', 'Back Leg']
        ];
        return roles.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    },

    _ucFindArmatureByRootId(rootId) {
        if (!rootId || !this.objects?.objects || typeof this._detectArmatureFromPool !== 'function') return null;
        const root = this.objects.getObjectById?.(rootId) || this.objects.objects.find(obj => obj?.id === rootId);
        if (!root) return null;
        const pool = [root, ...this.objects.objects.filter(obj => obj?.pinnedTo === root.id || obj?._ucGarmentRootId === root.id)];
        return this._detectArmatureFromPool(pool);
    },

    _ucCaptureCloneSourceFromSelection() {
        const selected = this.objects?.getSelectedObjects?.().filter(obj => obj && obj.visible !== false) || [];
        let armature = this._detectSelectedArmature?.() || this._currentArmature || null;
        armature = this._refreshDetectedArmatureReference?.(armature) || armature;
        const armatureIds = this._isUniversalCharacterArmature(armature)
            ? new Set([
                ...this._getArmatureObjects(armature).map(obj => obj?.id).filter(Boolean),
                ...this._getArmatureFacialObjects(armature).map(obj => obj?.id).filter(Boolean),
                ...this._getUniversalCharacterGarmentObjects(armature).map(obj => obj?.id).filter(Boolean),
                ...this._getUniversalCharacterBackViewHelperObjects(armature).map(obj => obj?.id).filter(Boolean)
            ])
            : new Set();
        const source = selected.find(obj =>
            obj.type === 'image'
            && !armatureIds.has(obj.id)
            && !obj._ucGarmentLayer
            && !obj._facialFeatureKey
            && !obj._ucClonePreviewLayer
        );
        if (!source) {
            Utils.showToast('Select the original character image, then click Capture Source.', 'warning');
            return null;
        }
        this._ucCloneState = this._ucCloneState || {};
        this._ucCloneState.sourceId = source.id;
        Utils.showToast('Clone source image captured', 'success');
        return source;
    },

    _ucCaptureCloneArmatureFromSelection() {
        let armature = this._detectSelectedArmature?.() || this._currentArmature || null;
        armature = this._refreshDetectedArmatureReference?.(armature) || armature;
        if (!this._isUniversalCharacterArmature(armature)) {
            Utils.showToast('Select any part of the Universal Character dummy, then click Capture Dummy.', 'warning');
            return null;
        }
        this._ucCloneState = this._ucCloneState || {};
        this._ucCloneState.armatureRootId = armature.root.id;
        this._currentArmature = armature;
        Utils.showToast('Clone dummy captured', 'success');
        return armature;
    },

    _ucGetSelectedImageFitTargets() {
        const selected = this.objects?.getSelectedObjects?.().filter(obj => obj && obj.visible !== false) || [];
        let armature = this._detectSelectedArmature?.() || null;
        armature = this._refreshDetectedArmatureReference?.(armature) || armature;
        if (!this._isUniversalCharacterArmature(armature)) {
            armature = this._currentArmature?.root?.id
                ? (this._refreshDetectedArmatureReference(this._currentArmature) || this._currentArmature)
                : null;
        }
        if (!this._isUniversalCharacterArmature(armature) && this._ucCloneState?.armatureRootId) {
            armature = this._ucFindArmatureByRootId(this._ucCloneState.armatureRootId);
            armature = this._refreshDetectedArmatureReference?.(armature) || armature;
        }
        if (!this._isUniversalCharacterArmature(armature)) {
            return { source: null, armature: null, error: 'Select a Universal Character part together with the source image.' };
        }

        const armatureIds = new Set(this._getArmatureObjects(armature).map(obj => obj?.id).filter(Boolean));
        const helperIds = new Set([
            ...this._getArmatureFacialObjects(armature).map(obj => obj?.id).filter(Boolean),
            ...this._getUniversalCharacterGarmentObjects(armature).map(obj => obj?.id).filter(Boolean),
            ...this._getUniversalCharacterBackViewHelperObjects(armature).map(obj => obj?.id).filter(Boolean)
        ]);
        const source = selected.find(obj =>
            obj.type === 'image'
            && !armatureIds.has(obj.id)
            && !helperIds.has(obj.id)
            && !obj._ucGarmentLayer
            && !obj._facialFeatureKey
            && !obj._ucClonePreviewLayer
        ) || (this._ucCloneState?.sourceId ? this.objects.getObjectById?.(this._ucCloneState.sourceId) : null) || null;
        if (!source) {
            return { source: null, armature, error: 'Select the source character image along with the Universal Character.' };
        }
        this._ucCloneState = this._ucCloneState || {};
        this._ucCloneState.sourceId = source.id;
        this._ucCloneState.armatureRootId = armature.root.id;
        return { source, armature, error: null };
    },

    _ucGetImageElementForSampling(obj) {
        return new Promise((resolve) => {
            if (!obj) return resolve(null);
            if (obj._eraserCanvas) return resolve(obj._eraserCanvas);
            const current = obj.imageElement;
            if (current && (current.naturalWidth || current.width)) return resolve(current);
            if (!obj.imageSrc) return resolve(null);
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = obj.imageSrc;
            if (img.complete && (img.naturalWidth || img.width)) resolve(img);
        });
    },

    async _ucGetSourceSilhouetteBounds(sourceObj) {
        const img = await this._ucGetImageElementForSampling(sourceObj);
        if (!img || !sourceObj) return null;
        const iw = Math.max(1, img.naturalWidth || img.width || 1);
        const ih = Math.max(1, img.naturalHeight || img.height || 1);
        let minX = iw, minY = ih, maxX = -1, maxY = -1;
        try {
            const c = document.createElement('canvas');
            c.width = iw;
            c.height = ih;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, iw, ih);
            const data = ctx.getImageData(0, 0, iw, ih).data;
            for (let y = 0; y < ih; y++) {
                for (let x = 0; x < iw; x++) {
                    if (data[(y * iw + x) * 4 + 3] <= 20) continue;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        } catch {
            minX = 0; minY = 0; maxX = iw - 1; maxY = ih - 1;
        }
        if (maxX < minX || maxY < minY) {
            minX = 0; minY = 0; maxX = iw - 1; maxY = ih - 1;
        }
        const sx = Math.min(sourceObj.x, sourceObj.x + sourceObj.width);
        const sy = Math.min(sourceObj.y, sourceObj.y + sourceObj.height);
        const sw = Math.abs(sourceObj.width) || 1;
        const sh = Math.abs(sourceObj.height) || 1;
        return {
            x: sx + (minX / iw) * sw,
            y: sy + (minY / ih) * sh,
            width: Math.max(1, ((maxX - minX + 1) / iw) * sw),
            height: Math.max(1, ((maxY - minY + 1) / ih) * sh)
        };
    },

    _ucGetArmatureVisualObjectsForFit(armature) {
        const base = this._getArmatureObjects(armature).filter(Boolean);
        const facial = this._getArmatureFacialObjects(armature).filter(Boolean);
        const garments = this._getUniversalCharacterGarmentObjects(armature).filter(Boolean);
        const helpers = this._getUniversalCharacterBackViewHelperObjects(armature).filter(Boolean);
        const seen = new Set();
        return [...base, ...facial, ...garments, ...helpers].filter(obj => {
            if (!obj?.id || seen.has(obj.id)) return false;
            seen.add(obj.id);
            return true;
        });
    },

    _ucGetTransferableUniversalCharacterParts(armature) {
        const transferableRoles = new Set(['head-neck', 'head', 'torso', 'right-arm', 'left-arm', 'right-leg', 'left-leg', 'front-arm', 'back-arm', 'front-leg', 'back-leg']);
        const seen = new Set();
        const parts = [];
        const pushObj = (obj, fallbackRole = '') => {
            if (!obj?.id || seen.has(obj.id) || obj.type !== 'image') return;
            const role = String(obj._armatureRoleKey || obj._armaturePartKey || fallbackRole || '').toLowerCase();
            if (!transferableRoles.has(role)) return;
            if (!obj._armatureRoleKey && fallbackRole) obj._armatureRoleKey = fallbackRole;
            if (!obj._armaturePartKey && fallbackRole) obj._armaturePartKey = fallbackRole;
            seen.add(obj.id);
            parts.push(obj);
        };
        pushObj(armature?.root, 'torso');
        Object.entries(armature?.parts || {}).forEach(([key, entry]) => pushObj(entry?.obj, key));
        const headObj = this._getArmatureHeadObject?.(armature);
        pushObj(headObj, headObj === armature?.parts?.head?.obj ? 'head' : 'head-neck');
        return parts;
    },

    _ucEnsureUniversalCharacterBodyVisible(armature) {
        this._ucGetTransferableUniversalCharacterParts(armature).forEach(obj => {
            obj.visible = true;
        });
    },

    _ucGetObjectBounds(objects = []) {
        const valid = objects.filter(obj =>
            obj
            && obj.visible !== false
            && Number.isFinite(obj.x)
            && Number.isFinite(obj.y)
            && Number.isFinite(obj.width)
            && Number.isFinite(obj.height)
        );
        if (!valid.length) return null;
        const left = Math.min(...valid.map(obj => Math.min(obj.x, obj.x + obj.width)));
        const top = Math.min(...valid.map(obj => Math.min(obj.y, obj.y + obj.height)));
        const right = Math.max(...valid.map(obj => Math.max(obj.x, obj.x + obj.width)));
        const bottom = Math.max(...valid.map(obj => Math.max(obj.y, obj.y + obj.height)));
        return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
    },

    _ucRegionToStageRect(profile, region) {
        if (!profile?.stageBounds || !region) return null;
        const imgW = Math.max(1, profile.imageWidth || 1);
        const imgH = Math.max(1, profile.imageHeight || 1);
        return {
            x: profile.stageBounds.x + (region.x / imgW) * profile.stageBounds.width,
            y: profile.stageBounds.y + (region.y / imgH) * profile.stageBounds.height,
            width: Math.max(1, (region.width / imgW) * profile.stageBounds.width),
            height: Math.max(1, (region.height / imgH) * profile.stageBounds.height)
        };
    },

    _ucRecalculatePinOffsetFromCurrentPosition(obj) {
        if (!obj?.pinnedTo || !this.objects?.getObjectById || !this.objects?._getPinOffsetForChildTarget) return;
        const parent = this.objects.getObjectById(obj.pinnedTo);
        if (!parent || typeof obj.getPivotPoint !== 'function') return;
        const pivot = obj.getPivotPoint();
        const offset = this.objects._getPinOffsetForChildTarget(parent, obj, pivot.x, pivot.y);
        if (!offset) return;
        obj.pinOffsetX = Math.round(offset.x * 100) / 100;
        obj.pinOffsetY = Math.round(offset.y * 100) / 100;
    },

    _ucApplyStageRectToPart(partObj, rect, options = {}) {
        if (!partObj || !rect) return false;
        const minSize = options.minSize || 8;
        partObj.x = rect.x;
        partObj.y = rect.y;
        partObj.width = Math.max(minSize, rect.width);
        partObj.height = Math.max(minSize, rect.height);
        this._ucRecalculatePinOffsetFromCurrentPosition(partObj);
        return true;
    },

    _ucAdaptUniversalCharacterPartShapes(armature, profile) {
        if (!armature || !profile?.regions) return 0;
        const parts = this._ucGetTransferableUniversalCharacterParts(armature);
        const partByRole = new Map();
        parts.forEach(part => {
            const role = String(part._armatureRoleKey || part._armaturePartKey || '').toLowerCase();
            if (role && !partByRole.has(role)) partByRole.set(role, part);
        });

        const applyRole = (role, rectAdjust = {}) => {
            const part = partByRole.get(role);
            if (!part) return false;
            const region = this._ucGetProportionalSourceRegionForPart(profile, part, armature);
            const rect = this._ucRegionToStageRect(profile, region);
            if (!rect) return false;
            const sourceBounds = profile.stageSilhouette || profile.stageBounds || rect;
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;
            const widthScale = Number.isFinite(rectAdjust.widthScale) ? rectAdjust.widthScale : 1;
            const heightScale = Number.isFinite(rectAdjust.heightScale) ? rectAdjust.heightScale : 1;
            const maxWidthRatio = Number.isFinite(rectAdjust.maxWidthRatio) ? rectAdjust.maxWidthRatio : 1;
            const maxHeightRatio = Number.isFinite(rectAdjust.maxHeightRatio) ? rectAdjust.maxHeightRatio : 1;
            const nextWidth = Math.min(rect.width * widthScale, sourceBounds.width * maxWidthRatio);
            const nextHeight = Math.min(rect.height * heightScale, sourceBounds.height * maxHeightRatio);
            const next = {
                x: cx - nextWidth / 2 + (rectAdjust.dx || 0),
                y: cy - nextHeight / 2 + (rectAdjust.dy || 0),
                width: nextWidth,
                height: nextHeight
            };
            return this._ucApplyStageRectToPart(part, next, { minSize: rectAdjust.minSize || 10 });
        };

        let changed = 0;
        if (applyRole('head-neck', { heightScale: 1.06, widthScale: 1.08, maxWidthRatio: 0.62, maxHeightRatio: 0.26, minSize: 18 })) changed++;
        if (applyRole('head', { heightScale: 1.06, widthScale: 1.08, maxWidthRatio: 0.62, maxHeightRatio: 0.26, minSize: 18 })) changed++;
        if (applyRole('torso', { widthScale: 0.92, heightScale: 1.02, maxWidthRatio: 0.64, maxHeightRatio: 0.38, minSize: 24 })) changed++;
        ['right-arm', 'left-arm', 'front-arm', 'back-arm'].forEach(role => {
            if (applyRole(role, { widthScale: 0.5, heightScale: 0.86, maxWidthRatio: 0.18, maxHeightRatio: 0.44, minSize: 12 })) changed++;
        });
        ['right-leg', 'left-leg', 'front-leg', 'back-leg'].forEach(role => {
            if (applyRole(role, { widthScale: 0.78, heightScale: 0.98, maxWidthRatio: 0.25, maxHeightRatio: 0.47, minSize: 16 })) changed++;
        });
        return changed;
    },

    _ucProfileWithStageBounds(profile, stageBounds) {
        if (!profile || !stageBounds) return profile;
        return {
            ...profile,
            stageBounds: { ...stageBounds },
            stageSilhouette: { ...stageBounds },
            regions: { ...(profile.regions || {}) }
        };
    },

    _ucAdjustClonePoseRectForRole(role, rect, bounds) {
        if (!rect || !bounds) return rect;
        const lower = String(role || '').toLowerCase();
        const settings = lower.includes('head')
            ? { maxW: 0.68, maxH: 0.34, minW: 0.14, minH: 0.12, pad: 0.02 }
            : lower.includes('torso')
                ? { maxW: 0.76, maxH: 0.52, minW: 0.20, minH: 0.22, pad: 0.015 }
                : lower.includes('arm')
                    ? { maxW: 0.48, maxH: 0.82, minW: 0.07, minH: 0.16, pad: 0.08 }
                    : lower.includes('leg')
                        ? { maxW: 0.42, maxH: 0.66, minW: 0.08, minH: 0.22, pad: 0.04 }
                        : { maxW: 0.7, maxH: 0.7, minW: 0.08, minH: 0.08, pad: 0.03 };
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const width = Math.max(
            bounds.width * settings.minW,
            Math.min(rect.width, bounds.width * settings.maxW)
        );
        const height = Math.max(
            bounds.height * settings.minH,
            Math.min(rect.height, bounds.height * settings.maxH)
        );
        const padX = bounds.width * settings.pad;
        const padY = bounds.height * settings.pad;
        const minX = bounds.x - padX;
        const maxX = bounds.x + bounds.width + padX - width;
        const minY = bounds.y - padY;
        const maxY = bounds.y + bounds.height + padY - height;
        return {
            x: Math.max(minX, Math.min(maxX, cx - width / 2)),
            y: Math.max(minY, Math.min(maxY, cy - height / 2)),
            width,
            height
        };
    },

    async matchUniversalCharacterPoseRegions(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        const armatureBounds = this._ucGetObjectBounds(this._ucGetArmatureVisualObjectsForFit(armature));
        if (!sourceImg || !armatureBounds) {
            Utils.showToast('Could not read the source image or dummy bounds for pose matching.', 'warning');
            return false;
        }
        let profile = await this._ucAnalyzeSourceCharacterRegions(source, sourceImg);
        if (!profile?.regions) {
            profile = await this._ucBuildProportionalSourceProfile(source, sourceImg);
        }
        if (!profile?.regions) {
            Utils.showToast('Could not detect source body regions. Try a clearer character image.', 'warning');
            return false;
        }
        profile = this._ucProfileWithStageBounds(profile, armatureBounds);
        const parts = this._ucGetTransferableUniversalCharacterParts(armature);
        let changed = 0;
        parts.forEach(part => {
            const role = this._ucGetPartVisualRole(part, armature)
                || String(part?._armatureRoleKey || part?._armaturePartKey || '').toLowerCase();
            const region = this._ucGetSourceRegionForPart(profile, part, armature)
                || this._ucGetProportionalSourceRegionForPart(profile, part, armature);
            const rect = this._ucRegionToStageRect(profile, region);
            const adjusted = this._ucAdjustClonePoseRectForRole(role, rect, armatureBounds);
            const minSize = role.includes('head') ? 18 : role.includes('torso') ? 24 : role.includes('leg') ? 16 : 12;
            if (this._ucApplyStageRectToPart(part, adjusted, { minSize })) changed++;
        });
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (changed) {
            this._ucCloneState = this._ucCloneState || {};
            this._ucCloneState.sourceId = source.id;
            this._ucCloneState.armatureRootId = armature.root.id;
            eventBus.emit('history:push');
            Utils.showToast(`Matched ${changed} dummy part${changed === 1 ? '' : 's'} to source pose regions. Create Clone Preview when ready.`, 'success');
            return true;
        }
        Utils.showToast('No dummy parts were matched. Capture the source and dummy, then try again.', 'warning');
        return false;
    },

    async _ucAnalyzeSourceCharacterRegions(sourceObj, sourceImg) {
        if (!sourceObj || !sourceImg) return null;
        const iw = Math.max(1, sourceImg.naturalWidth || sourceImg.width || 1);
        const ih = Math.max(1, sourceImg.naturalHeight || sourceImg.height || 1);
        const canvas = document.createElement('canvas');
        canvas.width = iw;
        canvas.height = ih;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceImg, 0, 0, iw, ih);
        let data = null;
        try {
            data = ctx.getImageData(0, 0, iw, ih).data;
        } catch {
            return null;
        }

        const alphaAt = (x, y) => data[(y * iw + x) * 4 + 3] || 0;
        let minX = iw, minY = ih, maxX = -1, maxY = -1;
        const rows = Array.from({ length: ih }, () => ({ min: iw, max: -1, count: 0, sumX: 0, runs: [] }));
        const cols = Array.from({ length: iw }, () => ({ count: 0, sumY: 0 }));
        for (let y = 0; y < ih; y++) {
            let runStart = -1;
            for (let x = 0; x < iw; x++) {
                const opaque = alphaAt(x, y) > 20;
                if (opaque) {
                    if (runStart < 0) runStart = x;
                    const row = rows[y];
                    row.count++;
                    row.sumX += x;
                    row.min = Math.min(row.min, x);
                    row.max = Math.max(row.max, x);
                    cols[x].count++;
                    cols[x].sumY += y;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                } else if (runStart >= 0) {
                    rows[y].runs.push({ x1: runStart, x2: x - 1 });
                    runStart = -1;
                }
            }
            if (runStart >= 0) rows[y].runs.push({ x1: runStart, x2: iw - 1 });
        }
        if (maxX < minX || maxY < minY) {
            minX = 0; minY = 0; maxX = iw - 1; maxY = ih - 1;
        }
        const bbox = { x: minX, y: minY, width: Math.max(1, maxX - minX + 1), height: Math.max(1, maxY - minY + 1) };
        const relY = pct => Math.round(bbox.y + bbox.height * pct);
        const middleRows = rows.slice(relY(0.32), Math.min(ih, relY(0.72))).filter(row => row.count > 0);
        const bodyCenterX = middleRows.length
            ? middleRows.reduce((sum, row) => sum + row.sumX / row.count, 0) / middleRows.length
            : bbox.x + bbox.width / 2;

        const centralRunForY = (y) => {
            const row = rows[y];
            if (!row?.runs?.length) return null;
            return row.runs
                .map(run => ({ ...run, width: run.x2 - run.x1 + 1, center: (run.x1 + run.x2) / 2 }))
                .sort((a, b) => Math.abs(a.center - bodyCenterX) - Math.abs(b.center - bodyCenterX))[0] || null;
        };

        let headTop = bbox.y;
        for (let y = bbox.y; y <= Math.min(maxY, relY(0.38)); y++) {
            const run = centralRunForY(y);
            if (run && run.width >= Math.max(4, bbox.width * 0.035)) {
                headTop = y;
                break;
            }
        }
        const headRows = [];
        let widestHead = 1;
        let neckCutY = Math.min(maxY, Math.round(headTop + bbox.height * 0.24));
        for (let y = headTop; y <= Math.min(maxY, relY(0.42)); y++) {
            const run = centralRunForY(y);
            if (!run) continue;
            const seenEnoughHead = y > headTop + bbox.height * 0.08;
            if (seenEnoughHead && run.width > Math.max(widestHead * 1.45, bbox.width * 0.28)) {
                neckCutY = Math.max(headTop + 1, y - 1);
                break;
            }
            widestHead = Math.max(widestHead, run.width);
            headRows.push({ y, run });
            neckCutY = y;
        }

        const widthSamples = [];
        for (let y = relY(0.34); y <= Math.min(maxY, relY(0.68)); y += 2) {
            const run = centralRunForY(y);
            if (run) widthSamples.push(run.width);
        }
        widthSamples.sort((a, b) => a - b);
        const medianWidth = widthSamples.length ? widthSamples[Math.floor(widthSamples.length / 2)] : bbox.width * 0.34;
        const torsoHalf = Math.max(bbox.width * 0.12, Math.min(bbox.width * 0.32, medianWidth * 0.62));
        const torsoLeft = Math.max(0, Math.round(bodyCenterX - torsoHalf));
        const torsoRight = Math.min(iw - 1, Math.round(bodyCenterX + torsoHalf));
        const hipY = Math.min(maxY, Math.max(neckCutY + 3, relY(0.66)));
        const pad = Math.max(2, Math.round(Math.min(iw, ih) * 0.012));

        const boundsFromPixels = (predicate, fallback = null, extraPad = pad) => {
            let bx1 = iw, by1 = ih, bx2 = -1, by2 = -1, count = 0;
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (alphaAt(x, y) <= 20 || !predicate(x, y)) continue;
                    bx1 = Math.min(bx1, x);
                    bx2 = Math.max(bx2, x);
                    by1 = Math.min(by1, y);
                    by2 = Math.max(by2, y);
                    count++;
                }
            }
            if (count < 10 || bx2 < bx1 || by2 < by1) return fallback;
            bx1 = Math.max(0, bx1 - extraPad);
            by1 = Math.max(0, by1 - extraPad);
            bx2 = Math.min(iw - 1, bx2 + extraPad);
            by2 = Math.min(ih - 1, by2 + extraPad);
            return { x: bx1, y: by1, width: Math.max(1, bx2 - bx1 + 1), height: Math.max(1, by2 - by1 + 1), count };
        };

        const headFallback = {
            x: Math.max(0, Math.round(bodyCenterX - Math.max(widestHead, bbox.width * 0.18) * 0.65)),
            y: Math.max(0, headTop - pad),
            width: Math.round(Math.max(widestHead, bbox.width * 0.18) * 1.3),
            height: Math.max(1, neckCutY - headTop + pad * 2)
        };
        const sourceBBoxRegion = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
        const regions = {
            head: boundsFromPixels((x, y) => y <= neckCutY + pad && Math.abs(x - bodyCenterX) <= Math.max(widestHead * 0.75, bbox.width * 0.16), headFallback, pad),
            torso: boundsFromPixels((x, y) => y >= neckCutY - pad && y <= hipY + pad && x >= torsoLeft && x <= torsoRight, sourceBBoxRegion, pad),
            leftArm: boundsFromPixels((x, y) => y <= hipY + bbox.height * 0.08 && x < torsoLeft, null, pad),
            rightArm: boundsFromPixels((x, y) => y <= hipY + bbox.height * 0.08 && x > torsoRight, null, pad),
            leftLeg: boundsFromPixels((x, y) => y >= hipY - pad && x <= bodyCenterX, null, pad),
            rightLeg: boundsFromPixels((x, y) => y >= hipY - pad && x >= bodyCenterX, null, pad)
        };
        regions.leftArm = regions.leftArm || boundsFromPixels((x, y) => x < bodyCenterX && y <= hipY + bbox.height * 0.08, sourceBBoxRegion, pad);
        regions.rightArm = regions.rightArm || boundsFromPixels((x, y) => x >= bodyCenterX && y <= hipY + bbox.height * 0.08, sourceBBoxRegion, pad);
        regions.leftLeg = regions.leftLeg || boundsFromPixels((x, y) => x < bodyCenterX && y >= hipY - bbox.height * 0.05, sourceBBoxRegion, pad);
        regions.rightLeg = regions.rightLeg || boundsFromPixels((x, y) => x >= bodyCenterX && y >= hipY - bbox.height * 0.05, sourceBBoxRegion, pad);

        return { imageWidth: iw, imageHeight: ih, bbox, bodyCenterX, neckCutY, hipY, torsoLeft, torsoRight, regions };
    },

    _ucGetSourceRegionForPart(profile, partObj, armature) {
        if (!profile?.regions || !partObj) return null;
        const role = String(partObj._armatureRoleKey || partObj._armaturePartKey || '').toLowerCase();
        if (role === 'head-neck') return profile.regions.head;
        if (role === 'torso') return profile.regions.torso;
        const armatureBounds = this._ucGetObjectBounds(this._getArmatureObjects(armature).filter(Boolean));
        const centerX = armatureBounds ? armatureBounds.x + armatureBounds.width / 2 : 0;
        const partCenterX = Number(partObj.x || 0) + Number(partObj.width || 0) / 2;
        const visualSide = partCenterX < centerX ? 'left' : 'right';
        if (role.includes('arm')) {
            return visualSide === 'left' ? profile.regions.leftArm : profile.regions.rightArm;
        }
        if (role.includes('leg')) {
            return visualSide === 'left' ? profile.regions.leftLeg : profile.regions.rightLeg;
        }
        return profile.regions.torso;
    },

    _ucBuildProportionalSourceProfile(sourceObj, sourceImg) {
        const imgW = Math.max(1, sourceImg?.naturalWidth || sourceImg?.width || 1);
        const imgH = Math.max(1, sourceImg?.naturalHeight || sourceImg?.height || 1);
        const stageBounds = {
            x: Math.min(sourceObj.x, sourceObj.x + sourceObj.width),
            y: Math.min(sourceObj.y, sourceObj.y + sourceObj.height),
            width: Math.abs(sourceObj.width) || 1,
            height: Math.abs(sourceObj.height) || 1
        };
        const silhouettePromise = this._ucGetSourceSilhouetteBounds(sourceObj);
        return Promise.resolve(silhouettePromise).then(stageSilhouette => {
            const sourceStage = stageSilhouette || stageBounds;
            const toImg = (stageValue, axis) => {
                if (axis === 'x') return ((stageValue - stageBounds.x) / stageBounds.width) * imgW;
                return ((stageValue - stageBounds.y) / stageBounds.height) * imgH;
            };
            const bbox = {
                x: Math.max(0, toImg(sourceStage.x, 'x')),
                y: Math.max(0, toImg(sourceStage.y, 'y')),
                width: Math.max(1, (sourceStage.width / stageBounds.width) * imgW),
                height: Math.max(1, (sourceStage.height / stageBounds.height) * imgH)
            };
            const region = (x1, y1, x2, y2) => ({
                x: bbox.x + bbox.width * x1,
                y: bbox.y + bbox.height * y1,
                width: Math.max(1, bbox.width * (x2 - x1)),
                height: Math.max(1, bbox.height * (y2 - y1))
            });
            return {
                imageWidth: imgW,
                imageHeight: imgH,
                bbox,
                bodyCenterX: bbox.x + bbox.width / 2,
                stageBounds,
                stageSilhouette: sourceStage,
                regions: {
                    head: region(0.24, 0.00, 0.76, 0.24),
                    torso: region(0.23, 0.18, 0.77, 0.55),
                    leftArm: region(0.02, 0.205, 0.285, 0.72),
                    rightArm: region(0.715, 0.205, 0.98, 0.72),
                    leftLeg: region(0.285, 0.50, 0.505, 1.00),
                    rightLeg: region(0.495, 0.50, 0.715, 1.00),
                    frontArm: region(0.02, 0.205, 0.34, 0.72),
                    backArm: region(0.66, 0.205, 0.98, 0.72),
                    frontLeg: region(0.285, 0.50, 0.525, 1.00),
                    backLeg: region(0.475, 0.50, 0.715, 1.00)
                }
            };
        });
    },

    _ucGetProportionalSourceRegionForPart(profile, partObj, armature) {
        if (!profile?.regions || !partObj) return null;
        const role = String(partObj._armatureRoleKey || partObj._armaturePartKey || '').toLowerCase();
        if (role === 'head-neck') return profile.regions.head;
        if (role === 'torso') return profile.regions.torso;
        if (role === 'front-arm') return profile.regions.frontArm;
        if (role === 'back-arm') return profile.regions.backArm;
        if (role === 'front-leg') return profile.regions.frontLeg;
        if (role === 'back-leg') return profile.regions.backLeg;
        const armatureBounds = this._ucGetObjectBounds(this._getArmatureObjects(armature).filter(Boolean));
        const centerX = armatureBounds ? armatureBounds.x + armatureBounds.width / 2 : 0;
        const partCenterX = Number(partObj.x || 0) + Number(partObj.width || 0) / 2;
        const visualSide = partCenterX < centerX ? 'left' : 'right';
        if (role.includes('arm')) return visualSide === 'left' ? profile.regions.leftArm : profile.regions.rightArm;
        if (role.includes('leg')) return visualSide === 'left' ? profile.regions.leftLeg : profile.regions.rightLeg;
        return profile.regions.torso;
    },

    _ucClampImageRegion(region, imageWidth, imageHeight) {
        if (!region) return null;
        const iw = Math.max(1, Math.round(imageWidth || 1));
        const ih = Math.max(1, Math.round(imageHeight || 1));
        const x1 = Math.max(0, Math.min(iw - 1, Math.round(region.x || 0)));
        const y1 = Math.max(0, Math.min(ih - 1, Math.round(region.y || 0)));
        const x2 = Math.max(x1 + 1, Math.min(iw, Math.round((region.x || 0) + Math.max(1, region.width || 1))));
        const y2 = Math.max(y1 + 1, Math.min(ih, Math.round((region.y || 0) + Math.max(1, region.height || 1))));
        return { x: x1, y: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) };
    },

    _ucGetPartVisualRole(partObj, armature) {
        const role = String(partObj?._armatureRoleKey || partObj?._armaturePartKey || '').toLowerCase();
        if (!role) return '';
        if (role === 'front-arm' || role === 'back-arm' || role === 'front-leg' || role === 'back-leg') return role;
        if (!/arm|leg/.test(role)) return role;
        const armatureBounds = this._ucGetObjectBounds(this._getArmatureObjects(armature).filter(Boolean));
        const centerX = armatureBounds ? armatureBounds.x + armatureBounds.width / 2 : 0;
        const partCenterX = Number(partObj.x || 0) + Number(partObj.width || 0) / 2;
        return `${partCenterX < centerX ? 'left' : 'right'}-${role.includes('arm') ? 'arm' : 'leg'}`;
    },

    _ucTightenRegionToOpaquePixels(sourceImg, region, options = {}) {
        const safe = this._ucClampImageRegion(region, sourceImg?.naturalWidth || sourceImg?.width, sourceImg?.naturalHeight || sourceImg?.height);
        if (!safe) return null;
        const iw = Math.max(1, sourceImg.naturalWidth || sourceImg.width || 1);
        const ih = Math.max(1, sourceImg.naturalHeight || sourceImg.height || 1);
        const c = document.createElement('canvas');
        c.width = iw;
        c.height = ih;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        try {
            ctx.drawImage(sourceImg, 0, 0, iw, ih);
            const data = ctx.getImageData(0, 0, iw, ih).data;
            let minX = iw, minY = ih, maxX = -1, maxY = -1, count = 0;
            const maxXAllowed = Number.isFinite(options.maxX) ? options.maxX : iw - 1;
            const minXAllowed = Number.isFinite(options.minX) ? options.minX : 0;
            const minYAllowed = Number.isFinite(options.minY) ? options.minY : 0;
            const maxYAllowed = Number.isFinite(options.maxY) ? options.maxY : ih - 1;
            const threshold = Number.isFinite(options.alphaThreshold) ? options.alphaThreshold : 24;
            for (let y = safe.y; y < safe.y + safe.height; y++) {
                if (y < minYAllowed || y > maxYAllowed) continue;
                for (let x = safe.x; x < safe.x + safe.width; x++) {
                    if (x < minXAllowed || x > maxXAllowed) continue;
                    if ((data[(y * iw + x) * 4 + 3] || 0) <= threshold) continue;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                    count++;
                }
            }
            if (count < 8 || maxX < minX || maxY < minY) return safe;
            const pad = Math.max(0, Math.round(options.pad ?? Math.min(iw, ih) * 0.006));
            minX = Math.max(0, minX - pad);
            minY = Math.max(0, minY - pad);
            maxX = Math.min(iw - 1, maxX + pad);
            maxY = Math.min(ih - 1, maxY + pad);
            return { x: minX, y: minY, width: Math.max(1, maxX - minX + 1), height: Math.max(1, maxY - minY + 1) };
        } catch {
            return safe;
        }
    },

    _ucRefineTransferRegionForPart(sourceImg, region, partObj, armature, profile = null) {
        if (!sourceImg || !region || !partObj) return region;
        const role = this._ucGetPartVisualRole(partObj, armature);
        const bbox = profile?.bbox || {
            x: 0,
            y: 0,
            width: sourceImg.naturalWidth || sourceImg.width || 1,
            height: sourceImg.naturalHeight || sourceImg.height || 1
        };
        const bodyCenterX = profile?.bodyCenterX || (bbox.x + bbox.width / 2);
        const isArm = /arm$/.test(role);
        const isLeg = /leg$/.test(role);
        const isHead = role === 'head' || role === 'head-neck';
        const isTorso = role === 'torso';
        const pad = Math.max(1, Math.round(Math.min(bbox.width, bbox.height) * 0.012));
        if (isArm) {
            const side = role.startsWith('left') || role === 'front-arm' ? 'left' : 'right';
            const outerLimit = side === 'left'
                ? { minX: bbox.x, maxX: bodyCenterX - bbox.width * 0.16 }
                : { minX: bodyCenterX + bbox.width * 0.16, maxX: bbox.x + bbox.width };
            const yTop = bbox.y + bbox.height * 0.19;
            const yBottom = bbox.y + bbox.height * 0.76;
            return this._ucTightenRegionToOpaquePixels(sourceImg, region, {
                ...outerLimit,
                minY: yTop,
                maxY: yBottom,
                pad
            }) || region;
        }
        if (isLeg) {
            const side = role.startsWith('left') || role === 'front-leg' ? 'left' : 'right';
            const bounds = side === 'left'
                ? { minX: bbox.x + bbox.width * 0.24, maxX: bodyCenterX + bbox.width * 0.02 }
                : { minX: bodyCenterX - bbox.width * 0.02, maxX: bbox.x + bbox.width * 0.76 };
            return this._ucTightenRegionToOpaquePixels(sourceImg, region, {
                ...bounds,
                minY: bbox.y + bbox.height * 0.48,
                maxY: bbox.y + bbox.height,
                pad
            }) || region;
        }
        if (isHead || isTorso) {
            return this._ucTightenRegionToOpaquePixels(sourceImg, region, {
                pad: isHead ? pad : Math.max(1, Math.round(pad * 0.5))
            }) || region;
        }
        return region;
    },

    _ucAnalyzeFaceAnchorsFromSource(sourceImg, headRegion) {
        const safe = this._ucClampImageRegion(headRegion, sourceImg?.naturalWidth || sourceImg?.width, sourceImg?.naturalHeight || sourceImg?.height);
        if (!sourceImg || !safe) return null;
        const c = document.createElement('canvas');
        c.width = safe.width;
        c.height = safe.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        try {
            ctx.drawImage(sourceImg, safe.x, safe.y, safe.width, safe.height, 0, 0, safe.width, safe.height);
            const img = ctx.getImageData(0, 0, safe.width, safe.height);
            const data = img.data;
            const makeBucket = () => ({ count: 0, x: 0, y: 0, minX: safe.width, minY: safe.height, maxX: -1, maxY: -1 });
            const buckets = {
                leftEye: makeBucket(),
                rightEye: makeBucket(),
                mouth: makeBucket()
            };
            const add = (bucket, x, y) => {
                bucket.count++;
                bucket.x += x;
                bucket.y += y;
                bucket.minX = Math.min(bucket.minX, x);
                bucket.minY = Math.min(bucket.minY, y);
                bucket.maxX = Math.max(bucket.maxX, x);
                bucket.maxY = Math.max(bucket.maxY, y);
            };
            const w = safe.width;
            const h = safe.height;
            for (let y = 0; y < h; y++) {
                const yn = y / Math.max(1, h);
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    if ((data[idx + 3] || 0) <= 30) continue;
                    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                    const lum = r * 0.299 + g * 0.587 + b * 0.114;
                    const redScore = r - Math.max(g, b);
                    const isDarkFeature = lum < 120;
                    const isMouthLike = redScore > 22 && r > 70 && yn > 0.52;
                    if (yn >= 0.38 && yn <= 0.64 && isDarkFeature) {
                        add(x < w / 2 ? buckets.leftEye : buckets.rightEye, x, y);
                    }
                    if (yn >= 0.62 && yn <= 0.88 && (isDarkFeature || isMouthLike)) {
                        add(buckets.mouth, x, y);
                    }
                }
            }
            const centroid = (bucket, fallback) => {
                if (!bucket.count) return fallback;
                const cx = bucket.x / bucket.count;
                const cy = bucket.y / bucket.count;
                const bw = Math.max(4, bucket.maxX - bucket.minX + 1);
                const bh = Math.max(3, bucket.maxY - bucket.minY + 1);
                return { x: cx / w, y: cy / h, w: bw / w, h: bh / h, confidence: bucket.count };
            };
            const leftEye = centroid(buckets.leftEye, { x: 0.34, y: 0.44, w: 0.16, h: 0.08, confidence: 0 });
            const rightEye = centroid(buckets.rightEye, { x: 0.66, y: 0.44, w: 0.16, h: 0.08, confidence: 0 });
            const mouth = centroid(buckets.mouth, { x: 0.50, y: 0.72, w: 0.24, h: 0.08, confidence: 0 });
            const eyeW = Math.max(0.10, Math.min(0.24, Math.max(leftEye.w, rightEye.w) * 1.4));
            const eyeH = Math.max(0.055, Math.min(0.14, Math.max(leftEye.h, rightEye.h) * 1.6));
            const browW = eyeW * 1.18;
            const browH = Math.max(0.035, eyeH * 0.52);
            const glassesX = (leftEye.x + rightEye.x) / 2;
            const glassesW = Math.max(0.34, Math.min(0.62, (rightEye.x - leftEye.x) + eyeW * 1.9));
            const glassesY = (leftEye.y + rightEye.y) / 2;
            return {
                'eye-left': { x: leftEye.x, y: leftEye.y, w: eyeW, h: eyeH },
                'eye-right': { x: rightEye.x, y: rightEye.y, w: eyeW, h: eyeH },
                'brow-left': { x: leftEye.x, y: Math.max(0.18, leftEye.y - 0.12), w: browW, h: browH },
                'brow-right': { x: rightEye.x, y: Math.max(0.18, rightEye.y - 0.12), w: browW, h: browH },
                'mouth': {
                    x: mouth.x,
                    y: mouth.y,
                    w: Math.max(0.18, Math.min(0.42, mouth.w * 1.5)),
                    h: Math.max(0.06, Math.min(0.18, mouth.h * 1.8))
                },
                'glasses': { x: glassesX, y: glassesY, w: glassesW, h: Math.max(eyeH * 2.2, 0.14) }
            };
        } catch {
            return null;
        }
    },

    _ucAlignFacialControlsToTransferredFace(armature, sourceImg, profile) {
        const headObj = this._getArmatureHeadObject?.(armature);
        if (!headObj?._facialFeatures || !profile?.regions?.head || !sourceImg || !this.objects?.getObjectById) return false;
        const anchors = this._ucAnalyzeFaceAnchorsFromSource(sourceImg, profile.regions.head);
        if (!anchors) return false;
        const headH = Math.max(1, (headObj._facialProportions?.headH || headObj.height || 1));
        const headW = Math.max(1, headObj.width || 1);
        let changed = false;
        Object.entries(headObj._facialFeatures).forEach(([key, objId]) => {
            const anchor = anchors[key];
            const featureObj = this.objects.getObjectById(objId);
            if (!anchor || !featureObj) return;
            const width = Math.max(6, headW * anchor.w);
            const height = Math.max(4, headH * anchor.h);
            const localRect = {
                x: headW * anchor.x - width / 2,
                y: headH * anchor.y - height / 2,
                w: width,
                h: height
            };
            featureObj.width = width;
            featureObj.height = height;
            featureObj.x = headObj.x + localRect.x;
            featureObj.y = headObj.y + localRect.y;
            featureObj._facialLocalRect = localRect;
            this._ucConfigureFacialFeaturePin(headObj, featureObj, localRect);
            changed = true;
        });
        if (changed && this.objects?._resolvePins) this.objects._resolvePins();
        return changed;
    },

    _ucFaceAnchorToImageRegion(sourceImg, headRegion, anchor, scaleX = 1.35, scaleY = 1.45) {
        const safeHead = this._ucClampImageRegion(headRegion, sourceImg?.naturalWidth || sourceImg?.width, sourceImg?.naturalHeight || sourceImg?.height);
        if (!safeHead || !anchor) return null;
        const rw = Math.max(3, safeHead.width * Math.max(0.02, anchor.w || 0.1) * scaleX);
        const rh = Math.max(3, safeHead.height * Math.max(0.02, anchor.h || 0.08) * scaleY);
        return this._ucClampImageRegion({
            x: safeHead.x + safeHead.width * (anchor.x || 0.5) - rw / 2,
            y: safeHead.y + safeHead.height * (anchor.y || 0.5) - rh / 2,
            width: rw,
            height: rh
        }, sourceImg?.naturalWidth || sourceImg?.width, sourceImg?.naturalHeight || sourceImg?.height);
    },

    _ucCreateFacePartCropDataUrl(sourceImg, region, mode = 'feature') {
        const safe = this._ucClampImageRegion(region, sourceImg?.naturalWidth || sourceImg?.width, sourceImg?.naturalHeight || sourceImg?.height);
        if (!sourceImg || !safe) return null;
        const out = document.createElement('canvas');
        out.width = Math.max(4, safe.width);
        out.height = Math.max(4, safe.height);
        const ctx = out.getContext('2d', { willReadFrequently: true });
        try {
            ctx.drawImage(sourceImg, safe.x, safe.y, safe.width, safe.height, 0, 0, out.width, out.height);
            const img = ctx.getImageData(0, 0, out.width, out.height);
            const data = img.data;
            let kept = 0;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] || 0;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const lum = r * 0.299 + g * 0.587 + b * 0.114;
                const redScore = r - Math.max(g, b);
                const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                let keep = alpha > 25 && (lum < 145 || saturation > 72);
                if (mode === 'mouth') keep = alpha > 25 && (lum < 135 || (redScore > 18 && r > 70));
                if (mode === 'glasses') keep = alpha > 25 && lum < 155;
                if (!keep) {
                    data[i + 3] = 0;
                } else {
                    kept++;
                }
            }
            if (kept < 6) return null;
            ctx.putImageData(img, 0, 0);
            return out.toDataURL('image/png');
        } catch {
            return null;
        }
    },

    _ucFindExtractedFaceOverlay(headObj, key) {
        if (!headObj || !this.objects?.objects) return null;
        return this.objects.objects.find(obj =>
            obj
            && obj._ucImageExtractedFacePartKey === key
            && (obj._facialParentHead === headObj.id || obj.pinnedTo === headObj.id)
        ) || null;
    },

    _ucApplyExtractedFacePart(headObj, key, dataUrl, anchor, options = {}) {
        if (!headObj || !key || !dataUrl || !anchor) return false;
        const headH = Math.max(1, headObj._facialProportions?.headH || headObj.height || 1);
        const headW = Math.max(1, headObj.width || 1);
        const width = Math.max(options.minWidth || 6, headW * Math.max(0.02, anchor.w || 0.1) * (options.widthScale || 1.35));
        const height = Math.max(options.minHeight || 4, headH * Math.max(0.02, anchor.h || 0.08) * (options.heightScale || 1.45));
        const localRect = {
            x: headW * (anchor.x || 0.5) - width / 2,
            y: headH * (anchor.y || 0.5) - height / 2,
            w: width,
            h: height
        };
        let obj = null;
        const featureId = key !== 'glasses' ? headObj._facialFeatures?.[key] : null;
        if (featureId && this.objects?.getObjectById) obj = this.objects.getObjectById(featureId);
        if (!obj) obj = this._ucFindExtractedFaceOverlay(headObj, key);
        if (!obj) {
            obj = new StageObject('image', {
                x: headObj.x + localRect.x,
                y: headObj.y + localRect.y,
                width,
                height,
                imageSrc: dataUrl,
                name: key === 'glasses' ? 'Face: glasses' : `Face: ${key}`,
                layer: (headObj.layer || 0) + (key === 'glasses' ? 4 : 2),
                opacity: 1
            });
            this.objects.addObject(obj);
        }
        obj.imageSrc = dataUrl;
        obj.x = headObj.x + localRect.x;
        obj.y = headObj.y + localRect.y;
        obj.width = width;
        obj.height = height;
        obj.visible = true;
        obj.opacity = 1;
        obj.name = key === 'glasses' ? 'Face: glasses' : `Face: ${key}`;
        obj._ucImageExtractedFacePart = true;
        obj._ucImageExtractedFacePartKey = key;
        obj._facialParentHead = headObj.id;
        obj._facialLocalRect = localRect;
        if (key !== 'glasses') {
            obj._facialFeatureKey = key;
            headObj._facialFeatures = headObj._facialFeatures || {};
            headObj._facialFeatures[key] = obj.id;
        }
        this._ucConfigureFacialFeaturePin(headObj, obj, localRect);
        obj.loadImage?.(dataUrl);
        return true;
    },

    async createEditableFacePartsFromSelectedTransfer(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        if (!sourceImg) {
            Utils.showToast('Could not read the selected source image.', 'warning');
            return false;
        }
        const sourceProfile = options.transferMode === 'auto'
            ? await this._ucAnalyzeSourceCharacterRegions(source, sourceImg)
            : await this._ucBuildProportionalSourceProfile(source, sourceImg);
        const headObj = this._ensureArmatureFacialFeatures?.(armature, { applyCurrentExpression: false }) || this._getArmatureHeadObject?.(armature);
        if (!headObj || !sourceProfile?.regions?.head) {
            Utils.showToast('Could not find the transferred head to create editable face parts.', 'warning');
            return false;
        }
        const anchors = this._ucAnalyzeFaceAnchorsFromSource(sourceImg, sourceProfile.regions.head);
        if (!anchors) {
            Utils.showToast('Could not detect face parts clearly. Keep the source image selected and try a clearer front face.', 'warning');
            return false;
        }
        const specs = [
            ['eye-left', 'feature', 1.5, 1.7],
            ['eye-right', 'feature', 1.5, 1.7],
            ['brow-left', 'feature', 1.35, 1.6],
            ['brow-right', 'feature', 1.35, 1.6],
            ['mouth', 'mouth', 1.55, 1.8],
            ['glasses', 'glasses', 1.0, 1.0]
        ];
        let created = 0;
        specs.forEach(([key, mode, sx, sy]) => {
            const anchor = anchors[key];
            if (!anchor) return;
            const region = this._ucFaceAnchorToImageRegion(sourceImg, sourceProfile.regions.head, anchor, sx, sy);
            const dataUrl = this._ucCreateFacePartCropDataUrl(sourceImg, region, mode);
            if (!dataUrl) return;
            if (this._ucApplyExtractedFacePart(headObj, key, dataUrl, anchor, {
                widthScale: sx,
                heightScale: sy,
                minWidth: key === 'glasses' ? 14 : 6,
                minHeight: key === 'glasses' ? 7 : 4
            })) {
                created++;
            }
        });
        if (created) {
            if (this.objects?._resolvePins) this.objects._resolvePins();
            this.objects?.updateObjectList?.();
            this.objects?.updateProperties?.();
            this.stage?.requestRender?.();
            eventBus.emit('history:push');
            Utils.showToast(`Created ${created} editable face part${created === 1 ? '' : 's'} from the source image`, 'success');
            return true;
        }
        Utils.showToast('No clear eye, mouth, or glasses pixels were detected.', 'warning');
        return false;
    },

    _ucFindTransferablePartByCloneRole(armature, role) {
        const wanted = String(role || '').toLowerCase();
        if (!wanted) return null;
        const parts = this._ucGetTransferableUniversalCharacterParts(armature);
        return parts.find(part => {
            const rawRole = String(part?._armatureRoleKey || part?._armaturePartKey || '').toLowerCase();
            return rawRole === wanted || this._ucGetPartVisualRole(part, armature) === wanted;
        }) || null;
    },

    _ucGetClonePreviewObjects(armature = null, options = {}) {
        const rootId = armature?.root?.id || this._ucCloneState?.armatureRootId || null;
        return (this.objects?.objects || []).filter(obj =>
            obj?._ucClonePreviewLayer
            && (!rootId || obj._ucClonePreviewRootId === rootId)
            && (options.includeCorrectionPatches === true || !obj._ucCloneCorrectionPatch)
        );
    },

    _ucRemoveClonePreviewObjects(armature = null, options = {}) {
        const previews = this._ucGetClonePreviewObjects(armature);
        if (!previews.length) return 0;
        const previousSuppress = this.objects?._suppressHistory;
        if (this.objects) this.objects._suppressHistory = true;
        try {
            previews.forEach(obj => this.objects.removeObject?.(obj.id));
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppress;
        }
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (options.pushHistory !== false) eventBus.emit('history:push');
        return previews.length;
    },

    async adoptSourceSilhouetteForUniversalCharacter(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        const sourceBounds = await this._ucGetSourceSilhouetteBounds(source);
        const objects = this._ucGetArmatureVisualObjectsForFit(armature);
        const currentBounds = this._ucGetObjectBounds(objects);
        if (!sourceImg || !sourceBounds || !currentBounds) {
            Utils.showToast('Could not read source silhouette or dummy bounds.', 'warning');
            return false;
        }

        const centerX = currentBounds.x + currentBounds.width / 2;
        const centerY = currentBounds.y + currentBounds.height / 2;
        let nextWidth = sourceBounds.width;
        let nextHeight = sourceBounds.height;
        if ((options.fitMode || 'height') === 'height') {
            const scale = sourceBounds.height / currentBounds.height;
            nextWidth = currentBounds.width * scale;
            nextHeight = sourceBounds.height;
        }
        const targetBounds = {
            x: centerX - nextWidth / 2,
            y: centerY - nextHeight / 2,
            width: Math.max(1, nextWidth),
            height: Math.max(1, nextHeight)
        };
        const sx = targetBounds.width / currentBounds.width;
        const sy = targetBounds.height / currentBounds.height;
        objects.forEach(obj => {
            obj.x = targetBounds.x + (obj.x - currentBounds.x) * sx;
            obj.y = targetBounds.y + (obj.y - currentBounds.y) * sy;
            obj.width = Math.max(1, obj.width * sx);
            obj.height = Math.max(1, obj.height * sy);
            if (Number.isFinite(obj.pinOffsetX)) obj.pinOffsetX *= sx;
            if (Number.isFinite(obj.pinOffsetY)) obj.pinOffsetY *= sy;
        });

        const transferMode = options.transferMode || 'proportional';
        const sourceProfile = transferMode === 'auto'
            ? await this._ucAnalyzeSourceCharacterRegions(source, sourceImg)
            : await this._ucBuildProportionalSourceProfile(source, sourceImg);
        if (sourceProfile?.regions) {
            sourceProfile.stageBounds = targetBounds;
            sourceProfile.stageSilhouette = targetBounds;
            this._ucAdaptUniversalCharacterPartShapes(armature, sourceProfile);
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (options.pushHistory !== false) eventBus.emit('history:push');
        Utils.showToast('Dummy adopted the source silhouette while staying in place. Adjust pose if needed, then create a clone preview.', 'success');
        return true;
    },

    async _ucBuildClonePreviewDataUrl(sourceImg, partObj, region, options = {}) {
        if (!sourceImg || !partObj || !region) return null;
        if (!partObj._ucImageFitMaskSrc && !partObj._ucImageFitTexture && partObj.imageSrc) {
            partObj._ucImageFitMaskSrc = partObj.imageSrc;
        }
        const maskSource = partObj._ucImageFitMaskSrc ? { imageSrc: partObj._ucImageFitMaskSrc } : partObj;
        const maskImg = await this._ucGetImageElementForSampling(maskSource);
        if (!maskImg) return null;

        const w = Math.max(12, Math.round(Math.abs(partObj.width) || maskImg.naturalWidth || maskImg.width || 12));
        const h = Math.max(12, Math.round(Math.abs(partObj.height) || maskImg.naturalHeight || maskImg.height || 12));
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, w, h);

        const refinedRegion = this._ucRefineTransferRegionForPart(sourceImg, region, partObj, options.armature, options.profile);
        const safeRegion = this._ucClampImageRegion(refinedRegion, sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
        if (!safeRegion) return null;
        ctx.drawImage(sourceImg, safeRegion.x, safeRegion.y, safeRegion.width, safeRegion.height, 0, 0, w, h);

        const mask = document.createElement('canvas');
        mask.width = w;
        mask.height = h;
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        maskCtx.drawImage(maskImg, 0, 0, w, h);
        const outData = ctx.getImageData(0, 0, w, h);
        const maskData = maskCtx.getImageData(0, 0, w, h).data;
        let opaqueCount = 0;
        let rSum = 0, gSum = 0, bSum = 0, rgbCount = 0;
        const transferRole = this._ucGetPartVisualRole(partObj, options.armature);
        const shouldFillTransparentSample = transferRole === 'head' || transferRole === 'head-neck' || transferRole === 'torso';
        for (let i = 0; i < outData.data.length; i += 4) {
            if (outData.data[i + 3] > 24) {
                rSum += outData.data[i];
                gSum += outData.data[i + 1];
                bSum += outData.data[i + 2];
                rgbCount++;
            }
        }
        const fallbackR = rgbCount ? Math.round(rSum / rgbCount) : 74;
        const fallbackG = rgbCount ? Math.round(gSum / rgbCount) : 144;
        const fallbackB = rgbCount ? Math.round(bSum / rgbCount) : 217;
        for (let i = 0; i < outData.data.length; i += 4) {
            const ma = maskData[i + 3];
            if (shouldFillTransparentSample && outData.data[i + 3] <= 24) {
                outData.data[i] = fallbackR;
                outData.data[i + 1] = fallbackG;
                outData.data[i + 2] = fallbackB;
            }
            outData.data[i + 3] = shouldFillTransparentSample
                ? ma
                : Math.round(outData.data[i + 3] * (ma / 255));
            if (outData.data[i + 3] > 12) opaqueCount++;
        }
        if (opaqueCount < 6) return null;
        ctx.putImageData(outData, 0, 0);
        return out.toDataURL('image/png');
    },

    _ucCreateOrUpdateClonePreviewObject(armature, part, dataUrl) {
        if (!armature?.root?.id || !part?.id || !dataUrl) return null;
        const role = this._ucGetPartVisualRole(part, armature) || String(part._armatureRoleKey || part._armaturePartKey || 'part');
        let preview = (this.objects?.objects || []).find(obj =>
            obj?._ucClonePreviewLayer
            && obj._ucClonePreviewRootId === armature.root.id
            && obj._ucClonePreviewPartId === part.id
        );
        if (!preview) {
            preview = new StageObject('image', {
                x: part.x,
                y: part.y,
                width: part.width,
                height: part.height,
                imageSrc: dataUrl,
                name: `Clone Preview: ${role}`,
                layer: (part.layer || 0) + 20,
                opacity: 0.94
            });
            preview._ucClonePreviewLayer = true;
            preview._ucClonePreviewRootId = armature.root.id;
            preview._ucClonePreviewPartId = part.id;
            preview._ucClonePreviewRole = role;
            this.objects.addObject(preview);
        }
        preview.imageSrc = dataUrl;
        preview.x = part.x;
        preview.y = part.y;
        preview.width = part.width;
        preview.height = part.height;
        preview.visible = true;
        preview.opacity = 0.94;
        preview.layer = Math.max(preview.layer || 0, (part.layer || 0) + 20);
        preview._ucClonePreviewLayer = true;
        preview._ucClonePreviewRootId = armature.root.id;
        preview._ucClonePreviewPartId = part.id;
        preview._ucClonePreviewRole = role;
        preview.pinnedTo = part.id;
        preview.pinTargetType = 'anchor';
        preview.pinAnchorX = Number.isFinite(part.pivotX) ? part.pivotX : 0.5;
        preview.pinAnchorY = Number.isFinite(part.pivotY) ? part.pivotY : 0.5;
        preview.pinOffsetX = 0;
        preview.pinOffsetY = 0;
        preview.pinRotationMode = 'inherit';
        preview.pinInheritRotation = true;
        preview.loadImage?.(dataUrl);
        preview._ucClonePreviewOriginal = {
            imageSrc: dataUrl,
            x: preview.x,
            y: preview.y,
            width: preview.width,
            height: preview.height,
            rotation: Number(preview.rotation || 0),
            pinOffsetX: Number(preview.pinOffsetX || 0),
            pinOffsetY: Number(preview.pinOffsetY || 0)
        };
        return preview;
    },

    async createUniversalCharacterClonePreview(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        if (!sourceImg) {
            Utils.showToast('Could not read the selected source image.', 'warning');
            return false;
        }
        const transferMode = options.transferMode || 'proportional';
        const sourceProfile = transferMode === 'auto'
            ? await this._ucAnalyzeSourceCharacterRegions(source, sourceImg)
            : await this._ucBuildProportionalSourceProfile(source, sourceImg);
        if (!sourceProfile?.regions) {
            Utils.showToast('Could not analyse source regions for clone preview.', 'warning');
            return false;
        }
        this._ucRemoveClonePreviewObjects(armature, { pushHistory: false });
        const armatureBounds = this._ucGetObjectBounds(this._ucGetArmatureVisualObjectsForFit(armature));
        if (armatureBounds) {
            sourceProfile.stageBounds = armatureBounds;
            sourceProfile.stageSilhouette = armatureBounds;
        }
        if (options.adaptShapes !== false) {
            this._ucAdaptUniversalCharacterPartShapes(armature, sourceProfile);
            if (this.objects?._resolvePins) this.objects._resolvePins();
        }
        const parts = this._ucGetTransferableUniversalCharacterParts(armature);
        let created = 0;
        const previousSuppress = this.objects?._suppressHistory;
        if (this.objects) this.objects._suppressHistory = true;
        try {
            for (const part of parts) {
                const region = transferMode === 'auto'
                    ? this._ucGetSourceRegionForPart(sourceProfile, part, armature)
                    : this._ucGetProportionalSourceRegionForPart(sourceProfile, part, armature);
                const dataUrl = await this._ucBuildClonePreviewDataUrl(sourceImg, part, region, { armature, profile: sourceProfile });
                if (this._ucCreateOrUpdateClonePreviewObject(armature, part, dataUrl)) created++;
            }
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppress;
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (created) {
            this._ucCloneState = this._ucCloneState || {};
            this._ucCloneState.sourceId = source.id;
            this._ucCloneState.armatureRootId = armature.root.id;
            eventBus.emit('history:push');
            Utils.showToast(`Created clone preview for ${created} body part${created === 1 ? '' : 's'}. Edit or apply when ready.`, 'success');
            return true;
        }
        Utils.showToast('No clone preview parts were created. Try proportional transfer mode or a clearer source image.', 'warning');
        return false;
    },

    applyUniversalCharacterClonePreview(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const previews = this._ucGetClonePreviewObjects(armature);
        if (!previews.length) {
            Utils.showToast('Create a clone preview first, then apply it.', 'warning');
            return false;
        }
        let applied = 0;
        previews.forEach(preview => {
            if (this._ucApplyClonePreviewObject(preview)) applied++;
        });
        if (options.hideGenerated !== false) {
            [
                ...this._getArmatureFacialObjects(armature).filter(obj => obj?._facialFeatureKey),
                ...this._getUniversalCharacterGarmentObjects(armature)
            ].forEach(obj => {
                if (obj) obj.visible = false;
            });
        }
        if (options.hideSource === true && source) source.visible = false;
        this._ucRemoveClonePreviewObjects(armature, { pushHistory: false });
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (applied) {
            eventBus.emit('history:push');
            Utils.showToast(`Applied clone preview to ${applied} rigged part${applied === 1 ? '' : 's'}`, 'success');
            return true;
        }
        Utils.showToast('No preview pixels were applied.', 'warning');
        return false;
    },

    cancelUniversalCharacterClonePreview() {
        const removed = this._ucRemoveClonePreviewObjects(null);
        Utils.showToast(removed ? 'Clone preview cancelled' : 'No clone preview to cancel', removed ? 'success' : 'info');
        return removed > 0;
    },

    async retransferUniversalCharacterClonePreviewPart(role, options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const part = this._ucFindTransferablePartByCloneRole(armature, role);
        if (!part) {
            Utils.showToast('That body part is not available on this character view.', 'warning');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        const transferMode = options.transferMode || 'proportional';
        const profile = transferMode === 'auto'
            ? await this._ucAnalyzeSourceCharacterRegions(source, sourceImg)
            : await this._ucBuildProportionalSourceProfile(source, sourceImg);
        const region = transferMode === 'auto'
            ? this._ucGetSourceRegionForPart(profile, part, armature)
            : this._ucGetProportionalSourceRegionForPart(profile, part, armature);
        const dataUrl = await this._ucBuildClonePreviewDataUrl(sourceImg, part, region, { armature, profile });
        const preview = this._ucCreateOrUpdateClonePreviewObject(armature, part, dataUrl);
        if (!preview) {
            Utils.showToast('Could not re-transfer this part.', 'warning');
            return false;
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.select?.([preview.id]);
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        Utils.showToast(`Re-transferred ${preview._ucClonePreviewRole || role}`, 'success');
        return true;
    },

    async _ucObjectImageToCanvas(obj, fallbackWidth = 32, fallbackHeight = 32) {
        const img = await this._ucGetImageElementForSampling(obj);
        const w = Math.max(1, Math.round(img?.naturalWidth || img?.width || Math.abs(obj?.width || 0) || fallbackWidth || 32));
        const h = Math.max(1, Math.round(img?.naturalHeight || img?.height || Math.abs(obj?.height || 0) || fallbackHeight || 32));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (img) {
            try {
                ctx.drawImage(img, 0, 0, w, h);
            } catch {
                ctx.clearRect(0, 0, w, h);
            }
        }
        return canvas;
    },

    _ucEnsureClonePreviewForPart(armature, part) {
        if (!armature?.root?.id || !part?.id) return null;
        const existing = this._ucGetClonePreviewObjects(armature).find(preview => preview._ucClonePreviewPartId === part.id);
        if (existing) return existing;
        const w = Math.max(12, Math.round(Math.abs(part.width) || 12));
        const h = Math.max(12, Math.round(Math.abs(part.height) || 12));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const src = part.imageSrc || part._ucImageFitMaskSrc || '';
        if (src) {
            const img = part.imageElement;
            if (img) {
                try {
                    canvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, w, h);
                } catch {
                    canvas.getContext('2d', { willReadFrequently: true }).clearRect(0, 0, w, h);
                }
            }
        }
        const dataUrl = src && part.imageElement ? canvas.toDataURL('image/png') : (src || canvas.toDataURL('image/png'));
        return this._ucCreateOrUpdateClonePreviewObject(armature, part, dataUrl);
    },

    makeSelectedCloneCorrectionPatch() {
        const selectedPreview = this._ucSelectedClonePreviewObject();
        if (!selectedPreview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        if (selectedPreview._ucCloneCorrectionPatch) {
            Utils.showToast('This is already a correction patch. Edit it, then Send Patch.', 'info');
            return false;
        }
        const patch = new StageObject('image', {
            x: selectedPreview.x,
            y: selectedPreview.y,
            width: selectedPreview.width,
            height: selectedPreview.height,
            rotation: Number(selectedPreview.rotation || 0),
            imageSrc: selectedPreview.imageSrc,
            name: `Correction Patch: ${selectedPreview._ucClonePreviewRole || 'part'}`,
            layer: (selectedPreview.layer || 0) + 2,
            opacity: 0.98
        });
        patch._ucClonePreviewLayer = true;
        patch._ucCloneCorrectionPatch = true;
        patch._ucClonePreviewRootId = selectedPreview._ucClonePreviewRootId;
        patch._ucClonePreviewRole = selectedPreview._ucClonePreviewRole;
        patch._ucClonePatchSourcePreviewId = selectedPreview.id;
        patch._ucClonePatchSourcePartId = selectedPreview._ucClonePreviewPartId;
        patch._ucClonePreviewOriginal = {
            imageSrc: selectedPreview.imageSrc,
            x: patch.x,
            y: patch.y,
            width: patch.width,
            height: patch.height,
            rotation: Number(patch.rotation || 0)
        };
        patch.loadImage?.(patch.imageSrc);
        this.objects?.addObject?.(patch);
        this.objects?.select?.([patch.id]);
        this.objects?.updateObjectList?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        Utils.showToast('Patch copy created. Erase everything except the misplaced pixels, then Send Patch.', 'success');
        return true;
    },

    async _ucCompositePatchIntoObjectImage(patchObj, targetObj) {
        if (!patchObj?.imageSrc || !targetObj) return false;
        const patchCanvas = await this._ucObjectImageToCanvas(patchObj);
        const targetCanvas = await this._ucObjectImageToCanvas(targetObj, Math.abs(targetObj.width || 32), Math.abs(targetObj.height || 32));
        const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
        const tx = Number(targetObj.x || 0);
        const ty = Number(targetObj.y || 0);
        const twStage = Math.max(1, Math.abs(Number(targetObj.width || 1)));
        const thStage = Math.max(1, Math.abs(Number(targetObj.height || 1)));
        const dx = ((Number(patchObj.x || 0) - tx) / twStage) * targetCanvas.width;
        const dy = ((Number(patchObj.y || 0) - ty) / thStage) * targetCanvas.height;
        const dw = (Math.abs(Number(patchObj.width || 1)) / twStage) * targetCanvas.width;
        const dh = (Math.abs(Number(patchObj.height || 1)) / thStage) * targetCanvas.height;
        if (dx + dw <= 0 || dy + dh <= 0 || dx >= targetCanvas.width || dy >= targetCanvas.height) {
            Utils.showToast('Patch does not overlap the target part. Move or resize the target/patch first.', 'warning');
            return false;
        }
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'source-over';
        targetCtx.drawImage(patchCanvas, dx, dy, dw, dh);
        targetCtx.restore();
        targetObj.imageSrc = targetCanvas.toDataURL('image/png');
        targetObj.loadImage?.(targetObj.imageSrc);
        return true;
    },

    async _ucErasePatchFromOriginalPreview(patchObj) {
        if (!patchObj?._ucCloneCorrectionPatch || !patchObj._ucClonePatchSourcePreviewId) return false;
        const sourcePreview = this.objects?.getObjectById?.(patchObj._ucClonePatchSourcePreviewId);
        if (!sourcePreview?.imageSrc || sourcePreview.id === patchObj.id) return false;
        const patchCanvas = await this._ucObjectImageToCanvas(patchObj);
        const sourceCanvas = await this._ucObjectImageToCanvas(sourcePreview);
        const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        const sx = Number(sourcePreview.x || 0);
        const sy = Number(sourcePreview.y || 0);
        const swStage = Math.max(1, Math.abs(Number(sourcePreview.width || 1)));
        const shStage = Math.max(1, Math.abs(Number(sourcePreview.height || 1)));
        const dx = ((Number(patchObj.x || 0) - sx) / swStage) * sourceCanvas.width;
        const dy = ((Number(patchObj.y || 0) - sy) / shStage) * sourceCanvas.height;
        const dw = (Math.abs(Number(patchObj.width || 1)) / swStage) * sourceCanvas.width;
        const dh = (Math.abs(Number(patchObj.height || 1)) / shStage) * sourceCanvas.height;
        if (dx + dw <= 0 || dy + dh <= 0 || dx >= sourceCanvas.width || dy >= sourceCanvas.height) return false;
        sourceCtx.save();
        sourceCtx.globalCompositeOperation = 'destination-out';
        sourceCtx.drawImage(patchCanvas, dx, dy, dw, dh);
        sourceCtx.restore();
        sourcePreview.imageSrc = sourceCanvas.toDataURL('image/png');
        sourcePreview.loadImage?.(sourcePreview.imageSrc);
        return true;
    },

    async sendSelectedClonePreviewToPart(role, options = {}) {
        const armature = this._ucGetCloneReviewArmature();
        if (!armature) {
            Utils.showToast('Capture or select a Universal Character dummy first.', 'warning');
            return false;
        }
        const selectedPreview = this.objects?.getSelectedObjects?.().find(obj => obj?._ucClonePreviewLayer && obj.imageSrc);
        if (!selectedPreview) {
            Utils.showToast('Select a clone preview part or correction patch first.', 'warning');
            return false;
        }
        const targetPart = this._ucFindTransferablePartByCloneRole(armature, role);
        if (!targetPart) {
            Utils.showToast('Target part is not available on this character.', 'warning');
            return false;
        }
        const targetPreview = this._ucEnsureClonePreviewForPart(armature, targetPart);
        if (!targetPreview || selectedPreview.id === targetPreview.id) {
            Utils.showToast('Choose a different target body part before sending.', 'warning');
            return false;
        }
        const changedTarget = await this._ucCompositePatchIntoObjectImage(selectedPreview, targetPreview);
        if (!changedTarget) return false;
        const erasedOriginal = options.eraseOriginal !== false
            ? await this._ucErasePatchFromOriginalPreview(selectedPreview)
            : false;
        if (options.removePatch !== false && selectedPreview._ucCloneCorrectionPatch) {
            const previousSuppress = this.objects?._suppressHistory;
            if (this.objects) this.objects._suppressHistory = true;
            try {
                this.objects?.removeObject?.(selectedPreview.id);
            } finally {
                if (this.objects) this.objects._suppressHistory = previousSuppress;
            }
        }
        this.objects?.select?.([targetPreview.id]);
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        Utils.showToast(`Patch sent to ${targetPreview._ucClonePreviewRole || role}${erasedOriginal ? ' and removed from original preview' : ''}.`, 'success');
        return true;
    },

    _ucSelectedClonePreviewObject() {
        return this.objects?.getSelectedObjects?.().find(obj => obj?._ucClonePreviewLayer && obj.imageSrc) || null;
    },

    _ucGetCloneReviewArmature() {
        let armature = this._detectSelectedArmature?.() || null;
        armature = this._refreshDetectedArmatureReference?.(armature) || armature;
        if (!this._isUniversalCharacterArmature(armature)) {
            armature = this._currentArmature?.root?.id
                ? (this._refreshDetectedArmatureReference?.(this._currentArmature) || this._currentArmature)
                : null;
        }
        if (!this._isUniversalCharacterArmature(armature) && this._ucCloneState?.armatureRootId) {
            armature = this._ucFindArmatureByRootId(this._ucCloneState.armatureRootId);
            armature = this._refreshDetectedArmatureReference?.(armature) || armature;
        }
        if (this._isUniversalCharacterArmature(armature)) {
            this._currentArmature = armature;
            this._ucCloneState = this._ucCloneState || {};
            this._ucCloneState.armatureRootId = armature.root.id;
            return armature;
        }
        return null;
    },

    _ucCloneReviewExpectedParts(armature) {
        const seen = new Set();
        return this._ucGetTransferableUniversalCharacterParts(armature).map(part => {
            const role = this._ucGetPartVisualRole(part, armature)
                || String(part?._armatureRoleKey || part?._armaturePartKey || '').toLowerCase();
            return { part, role };
        }).filter(entry => {
            if (!entry.part?.id || !entry.role || seen.has(entry.role)) return false;
            seen.add(entry.role);
            return true;
        });
    },

    async _ucMeasureClonePreviewPixels(preview) {
        const img = await this._ucGetImageElementForSampling(preview);
        if (!img) return null;
        const w = Math.max(1, img.naturalWidth || img.width || 1);
        const h = Math.max(1, img.naturalHeight || img.height || 1);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        try {
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            let visible = 0;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 16) visible++;
            }
            return {
                width: w,
                height: h,
                visible,
                ratio: visible / Math.max(1, w * h)
            };
        } catch {
            return null;
        }
    },

    async getCloneTransferReview() {
        const armature = this._ucGetCloneReviewArmature();
        if (!armature) {
            return { armature: null, rows: [], readyRows: [], summary: 'Capture or select a Universal Character dummy first.' };
        }
        const expected = this._ucCloneReviewExpectedParts(armature);
        const previews = this._ucGetClonePreviewObjects(armature);
        const previewsByPart = new Map();
        const previewsByRole = new Map();
        previews.forEach(preview => {
            if (preview?._ucClonePreviewPartId) previewsByPart.set(preview._ucClonePreviewPartId, preview);
            if (preview?._ucClonePreviewRole) previewsByRole.set(String(preview._ucClonePreviewRole).toLowerCase(), preview);
        });
        const armatureBounds = this._ucGetObjectBounds(this._ucGetArmatureVisualObjectsForFit(armature));
        const sourceCounts = new Map();
        previews.forEach(preview => {
            if (preview?.imageSrc) sourceCounts.set(preview.imageSrc, (sourceCounts.get(preview.imageSrc) || 0) + 1);
        });

        const rows = [];
        for (const entry of expected) {
            const preview = previewsByPart.get(entry.part.id) || previewsByRole.get(entry.role) || null;
            const warnings = [];
            let status = 'missing';
            let ready = false;
            let stats = null;
            if (preview) {
                status = preview.visible === false ? 'hidden preview' : 'preview';
                stats = await this._ucMeasureClonePreviewPixels(preview);
                if (stats?.ratio < 0.03) warnings.push('very transparent');
                else if (stats?.ratio < 0.12) warnings.push('low visible pixels');
                const partArea = Math.max(1, Math.abs(Number(entry.part.width || 1) * Number(entry.part.height || 1)));
                const previewArea = Math.max(1, Math.abs(Number(preview.width || 1) * Number(preview.height || 1)));
                if (previewArea > partArea * 2.25) warnings.push('much larger than target');
                if (armatureBounds) {
                    const previewCx = Number(preview.x || 0) + Number(preview.width || 0) / 2;
                    const previewCy = Number(preview.y || 0) + Number(preview.height || 0) / 2;
                    const outsideX = previewCx < armatureBounds.x - armatureBounds.width * 0.2
                        || previewCx > armatureBounds.x + armatureBounds.width * 1.2;
                    const outsideY = previewCy < armatureBounds.y - armatureBounds.height * 0.2
                        || previewCy > armatureBounds.y + armatureBounds.height * 1.2;
                    if (outsideX || outsideY) warnings.push('outside dummy bounds');
                }
                if (preview.imageSrc && sourceCounts.get(preview.imageSrc) > 1) warnings.push('same pixels as another part');
                ready = !warnings.some(text =>
                    text === 'very transparent'
                    || text === 'much larger than target'
                    || text === 'outside dummy bounds'
                );
            } else if (entry.part._ucImageFitTexture) {
                status = 'already applied';
            } else {
                warnings.push('no preview');
            }
            rows.push({
                role: entry.role,
                part: entry.part,
                preview,
                status,
                warnings,
                ready,
                stats
            });
        }
        const readyRows = rows.filter(row => row.preview && row.ready);
        const warningCount = rows.filter(row => row.warnings.length).length;
        const summary = `${readyRows.length}/${rows.length} ready, ${warningCount} with notes, ${previews.length} preview part${previews.length === 1 ? '' : 's'} on stage.`;
        return { armature, rows, readyRows, summary };
    },

    async renderCloneTransferReview(panelOrElement = document) {
        const root = panelOrElement?.querySelector ? panelOrElement : document;
        const summaryEl = root.querySelector('#uc-clone-review-summary');
        const listEl = root.querySelector('#uc-clone-review-list');
        if (!summaryEl || !listEl) return false;
        summaryEl.textContent = 'Reviewing clone preview parts...';
        const review = await this.getCloneTransferReview();
        summaryEl.textContent = review.summary;
        const esc = (value) => (typeof Utils !== 'undefined' && Utils.escapeHtml)
            ? Utils.escapeHtml(String(value ?? ''))
            : String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        if (!review.rows.length) {
            listEl.innerHTML = '<div style="padding:6px;color:#94a3b8;">No Universal Character parts found for review.</div>';
            return true;
        }
        listEl.innerHTML = review.rows.map(row => {
            const tone = row.ready ? '#22c55e' : row.preview ? '#f59e0b' : row.status === 'already applied' ? '#38bdf8' : '#ef4444';
            const note = row.warnings.length ? row.warnings.join(', ') : (row.ready ? 'ready to apply' : row.status);
            const visible = row.stats ? ` · ${Math.round(row.stats.ratio * 100)}% pixels` : '';
            const previewAttr = row.preview?.id ? ` data-preview-id="${esc(row.preview.id)}"` : '';
            return `
                <div${previewAttr} style="display:grid;grid-template-columns:8px 1fr;gap:6px;align-items:start;padding:5px;border-bottom:1px solid rgba(148,163,184,0.10);cursor:${row.preview ? 'pointer' : 'default'};">
                    <span style="width:7px;height:7px;border-radius:50%;background:${tone};margin-top:4px;"></span>
                    <span>
                        <strong style="display:block;color:#e5e7eb;">${esc(this._ucPrettyRoleLabel(row.role))}</strong>
                        <small style="color:#94a3b8;">${esc(note)}${visible}</small>
                    </span>
                </div>
            `;
        }).join('');
        return true;
    },

    _ucPrettyRoleLabel(role) {
        return String(role || 'part')
            .split('-')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    soloSelectedClonePreviewPart() {
        const armature = this._ucGetCloneReviewArmature();
        const selected = this._ucSelectedClonePreviewObject();
        if (!armature || !selected) {
            Utils.showToast('Select a clone preview part to solo.', 'warning');
            return false;
        }
        this._ucGetClonePreviewObjects(armature).forEach(preview => {
            preview.visible = preview.id === selected.id;
        });
        this.objects?.updateObjectList?.();
        this.stage?.requestRender?.();
        Utils.showToast(`Solo view: ${selected._ucClonePreviewRole || 'selected preview part'}`, 'info');
        return true;
    },

    showAllClonePreviewParts() {
        const armature = this._ucGetCloneReviewArmature();
        if (!armature) {
            Utils.showToast('Capture or select a Universal Character dummy first.', 'warning');
            return false;
        }
        const previews = this._ucGetClonePreviewObjects(armature);
        previews.forEach(preview => { preview.visible = true; });
        this.objects?.updateObjectList?.();
        this.stage?.requestRender?.();
        Utils.showToast(previews.length ? 'All clone preview parts shown' : 'No clone preview parts to show', previews.length ? 'success' : 'info');
        return previews.length > 0;
    },

    async applyReadyClonePreviewParts(options = {}) {
        const review = await this.getCloneTransferReview();
        const armature = review.armature;
        if (!armature) {
            Utils.showToast('Capture or select a Universal Character dummy first.', 'warning');
            return false;
        }
        const ready = review.readyRows.map(row => row.preview).filter(Boolean);
        if (!ready.length) {
            Utils.showToast('No ready preview parts found. Review warnings or edit previews first.', 'warning');
            return false;
        }
        let applied = 0;
        ready.forEach(preview => {
            if (this._ucApplyClonePreviewObject(preview)) applied++;
        });
        if (options.hideGenerated !== false) {
            [
                ...this._getArmatureFacialObjects(armature).filter(obj => obj?._facialFeatureKey),
                ...this._getUniversalCharacterGarmentObjects(armature)
            ].forEach(obj => {
                if (obj) obj.visible = false;
            });
        }
        const source = this._ucCloneState?.sourceId ? this.objects?.getObjectById?.(this._ucCloneState.sourceId) : null;
        if (options.hideSource === true && source) source.visible = false;
        const readyIds = new Set(ready.map(preview => preview.id));
        const previousSuppress = this.objects?._suppressHistory;
        if (this.objects) this.objects._suppressHistory = true;
        try {
            readyIds.forEach(id => this.objects?.removeObject?.(id));
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppress;
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (applied) {
            eventBus.emit('history:push');
            Utils.showToast(`Applied ${applied} ready preview part${applied === 1 ? '' : 's'}.`, 'success');
            return true;
        }
        Utils.showToast('No ready preview pixels were applied.', 'warning');
        return false;
    },

    async rebuildMissingClonePreviewParts(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const review = await this.getCloneTransferReview();
        const missingRows = review.rows.filter(row => !row.preview && !row.part._ucImageFitTexture);
        if (!missingRows.length) {
            Utils.showToast('No missing preview parts to rebuild.', 'info');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        if (!sourceImg) {
            Utils.showToast('Could not read the captured source image.', 'warning');
            return false;
        }
        const transferMode = options.transferMode || 'proportional';
        const profile = transferMode === 'auto'
            ? await this._ucAnalyzeSourceCharacterRegions(source, sourceImg)
            : await this._ucBuildProportionalSourceProfile(source, sourceImg);
        if (!profile?.regions) {
            Utils.showToast('Could not analyse source regions for missing preview parts.', 'warning');
            return false;
        }
        const armatureBounds = this._ucGetObjectBounds(this._ucGetArmatureVisualObjectsForFit(armature));
        if (armatureBounds) {
            profile.stageBounds = armatureBounds;
            profile.stageSilhouette = armatureBounds;
        }
        let created = 0;
        const previousSuppress = this.objects?._suppressHistory;
        if (this.objects) this.objects._suppressHistory = true;
        try {
            for (const row of missingRows) {
                const region = transferMode === 'auto'
                    ? this._ucGetSourceRegionForPart(profile, row.part, armature)
                    : this._ucGetProportionalSourceRegionForPart(profile, row.part, armature);
                const dataUrl = await this._ucBuildClonePreviewDataUrl(sourceImg, row.part, region, { armature, profile });
                if (this._ucCreateOrUpdateClonePreviewObject(armature, row.part, dataUrl)) created++;
            }
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppress;
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (created) {
            eventBus.emit('history:push');
            Utils.showToast(`Rebuilt ${created} missing preview part${created === 1 ? '' : 's'}.`, 'success');
            return true;
        }
        Utils.showToast('No missing preview parts could be rebuilt.', 'warning');
        return false;
    },

    _ucCommitClonePreviewGeometryEdit(preview, message) {
        if (!preview) return false;
        this._ucRecalculatePinOffsetFromCurrentPosition(preview);
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        if (message) Utils.showToast(message, 'success');
        return true;
    },

    nudgeSelectedClonePreview(dx = 0, dy = 0) {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        preview.x = Number(preview.x || 0) + Number(dx || 0);
        preview.y = Number(preview.y || 0) + Number(dy || 0);
        return this._ucCommitClonePreviewGeometryEdit(preview, 'Selected preview part moved');
    },

    resizeSelectedClonePreview(scaleX = 1, scaleY = 1) {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        const sx = Math.max(0.1, Math.min(10, Number(scaleX) || 1));
        const sy = Math.max(0.1, Math.min(10, Number(scaleY) || 1));
        const cx = Number(preview.x || 0) + Number(preview.width || 0) / 2;
        const cy = Number(preview.y || 0) + Number(preview.height || 0) / 2;
        const nextWidth = Math.max(4, Number(preview.width || 0) * sx);
        const nextHeight = Math.max(4, Number(preview.height || 0) * sy);
        preview.width = nextWidth;
        preview.height = nextHeight;
        preview.x = cx - nextWidth / 2;
        preview.y = cy - nextHeight / 2;
        return this._ucCommitClonePreviewGeometryEdit(preview, 'Selected preview part resized');
    },

    rotateSelectedClonePreview(delta = 0, options = {}) {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        preview.rotation = options.absolute
            ? Number(delta || 0)
            : Number(preview.rotation || 0) + Number(delta || 0);
        return this._ucCommitClonePreviewGeometryEdit(preview, 'Selected preview part rotated');
    },

    resetSelectedClonePreview() {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        const original = preview._ucClonePreviewOriginal;
        if (!original) {
            Utils.showToast('This preview part has no stored generated state.', 'warning');
            return false;
        }
        preview.imageSrc = original.imageSrc || preview.imageSrc;
        preview.x = original.x;
        preview.y = original.y;
        preview.width = original.width;
        preview.height = original.height;
        preview.rotation = original.rotation || 0;
        preview.pinOffsetX = Number(original.pinOffsetX || 0);
        preview.pinOffsetY = Number(original.pinOffsetY || 0);
        preview.loadImage?.(preview.imageSrc);
        return this._ucCommitClonePreviewGeometryEdit(preview, 'Selected preview part reset');
    },

    _ucApplyClonePreviewObject(preview) {
        if (!preview?.imageSrc) return false;
        const part = this.objects?.getObjectById?.(preview._ucClonePreviewPartId);
        if (!part) return false;
        if (!part._ucImageFitMaskSrc && !part._ucImageFitTexture && part.imageSrc) {
            part._ucImageFitMaskSrc = part.imageSrc;
        }
        part.x = Number(preview.x || part.x || 0);
        part.y = Number(preview.y || part.y || 0);
        part.width = Math.max(4, Number(preview.width || part.width || 4));
        part.height = Math.max(4, Number(preview.height || part.height || 4));
        part.rotation = Number(preview.rotation || 0);
        part.imageSrc = preview.imageSrc;
        part._ucImageFitTexture = true;
        part._ucImageFitTransferMode = 'clone-preview';
        part.loadImage?.(preview.imageSrc);
        this._ucRecalculatePinOffsetFromCurrentPosition(part);
        return true;
    },

    applySelectedClonePreviewPart(options = {}) {
        const { armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        if (!this._ucApplyClonePreviewObject(preview)) {
            Utils.showToast('Could not apply the selected preview part.', 'warning');
            return false;
        }
        if (options.hideGenerated !== false) {
            [
                ...this._getArmatureFacialObjects(armature).filter(obj => obj?._facialFeatureKey),
                ...this._getUniversalCharacterGarmentObjects(armature)
            ].forEach(obj => {
                if (obj) obj.visible = false;
            });
        }
        const previousSuppress = this.objects?._suppressHistory;
        if (this.objects) this.objects._suppressHistory = true;
        try {
            this.objects?.removeObject?.(preview.id);
        } finally {
            if (this.objects) this.objects._suppressHistory = previousSuppress;
        }
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        Utils.showToast(`Applied ${preview._ucClonePreviewRole || 'selected preview part'}`, 'success');
        return true;
    },

    async startSelectedClonePreviewMaskBrush(mode = 'erase', brushSize = 28) {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        if (!this.objects?.enterEraserMode || !this.objects?.select) {
            Utils.showToast('Image brush tools are not available in this build.', 'warning');
            return false;
        }
        await this._ucGetImageElementForSampling(preview);
        const sizeInput = document.getElementById('eraser-brush-size');
        if (sizeInput) {
            sizeInput.value = String(Math.max(4, Math.min(120, Number(brushSize) || 28)));
            sizeInput.dispatchEvent?.(new Event('input', { bubbles: true }));
        }
        this.objects.select([preview.id]);
        const restoreSrc = preview._ucClonePreviewOriginal?.imageSrc || preview.imageSrc;
        this.objects.enterEraserMode({
            mode: mode === 'restore' ? 'restore' : 'erase',
            restoreFromSrc: restoreSrc
        });
        Utils.showToast(mode === 'restore'
            ? 'Restore Brush ready. Paint pixels back, then Apply Restore.'
            : 'Erase Brush ready. Paint unwanted pixels away, then Apply Erase.', 'info');
        return true;
    },

    async featherSelectedClonePreviewMask(radius = 1.6) {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        const img = await this._ucGetImageElementForSampling(preview);
        if (!img) return false;
        const w = Math.max(1, img.naturalWidth || img.width || 1);
        const h = Math.max(1, img.naturalHeight || img.height || 1);
        const content = document.createElement('canvas');
        content.width = w;
        content.height = h;
        const contentCtx = content.getContext('2d', { willReadFrequently: true });
        contentCtx.drawImage(img, 0, 0, w, h);

        const mask = document.createElement('canvas');
        mask.width = w;
        mask.height = h;
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        maskCtx.filter = `blur(${Math.max(0.5, Math.min(24, Number(radius) || 1.6))}px)`;
        maskCtx.drawImage(content, 0, 0);
        maskCtx.filter = 'none';

        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const outCtx = out.getContext('2d', { willReadFrequently: true });
        outCtx.drawImage(content, 0, 0);
        outCtx.globalCompositeOperation = 'destination-in';
        outCtx.drawImage(mask, 0, 0);
        outCtx.globalCompositeOperation = 'source-over';
        return this._ucUpdatePreviewImageFromCanvas(preview, out, 'Selected preview edge feathered');
    },

    async trimSelectedClonePreviewTransparentBounds() {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part first.', 'warning');
            return false;
        }
        const img = await this._ucGetImageElementForSampling(preview);
        if (!img) return false;
        const w = Math.max(1, img.naturalWidth || img.width || 1);
        const h = Math.max(1, img.naturalHeight || img.height || 1);
        const src = document.createElement('canvas');
        src.width = w;
        src.height = h;
        const ctx = src.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] <= 8) continue;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
        if (maxX < minX || maxY < minY) {
            Utils.showToast('Selected preview part has no visible pixels to trim.', 'info');
            return false;
        }
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        if (cropW === w && cropH === h) {
            Utils.showToast('Selected preview part is already tightly trimmed.', 'info');
            return false;
        }
        const out = document.createElement('canvas');
        out.width = cropW;
        out.height = cropH;
        out.getContext('2d', { willReadFrequently: true }).drawImage(src, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        const oldX = Number(preview.x || 0);
        const oldY = Number(preview.y || 0);
        const oldW = Math.max(1, Number(preview.width || 1));
        const oldH = Math.max(1, Number(preview.height || 1));
        preview.x = oldX + (minX / w) * oldW;
        preview.y = oldY + (minY / h) * oldH;
        preview.width = Math.max(4, (cropW / w) * oldW);
        preview.height = Math.max(4, (cropH / h) * oldH);
        preview.imageSrc = out.toDataURL('image/png');
        preview.loadImage?.(preview.imageSrc);
        return this._ucCommitClonePreviewGeometryEdit(preview, 'Selected preview transparent bounds trimmed');
    },

    duplicateSelectedClonePreviewToRole(role) {
        return this.sendSelectedClonePreviewToPart(role);
    },

    paintSelectedClonePreviewWithCloneBrush() {
        const source = this._ucCloneState?.sourceId ? this.objects?.getObjectById?.(this._ucCloneState.sourceId) : null;
        const preview = this._ucSelectedClonePreviewObject();
        if (!source) {
            Utils.showToast('Capture the source image first.', 'warning');
            return false;
        }
        if (!preview) {
            Utils.showToast('Select a clone preview part first, then click Paint Selected Preview.', 'warning');
            return false;
        }
        if (!this.objects?.startCloneBrushWithSourceTarget) {
            Utils.showToast('Clone Brush is not available in this build.', 'warning');
            return false;
        }
        const started = this.objects.startCloneBrushWithSourceTarget(source, preview, { sourcePoint: 'center' });
        if (started) {
            Utils.showToast('Clone Brush prepared from captured source to selected preview. Paint on the preview, then Apply Clone.', 'success');
        }
        return started;
    },

    _ucUpdatePreviewImageFromCanvas(preview, canvas, successMessage) {
        if (!preview || !canvas) return false;
        const dataUrl = canvas.toDataURL('image/png');
        preview.imageSrc = dataUrl;
        preview.loadImage?.(dataUrl);
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        Utils.showToast(successMessage, 'success');
        return true;
    },

    async blendSelectedClonePreviewPart() {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part to blend.', 'warning');
            return false;
        }
        const img = await this._ucGetImageElementForSampling(preview);
        if (!img) return false;
        const w = Math.max(1, img.naturalWidth || img.width || 1);
        const h = Math.max(1, img.naturalHeight || img.height || 1);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        ctx.globalAlpha = 0.55;
        ctx.filter = 'blur(0.9px)';
        ctx.drawImage(c, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        return this._ucUpdatePreviewImageFromCanvas(preview, c, 'Selected clone preview part blended');
    },

    async eraseColorFromSelectedClonePreviewPart(hexColor = '#ffffff', tolerance = 34) {
        const preview = this._ucSelectedClonePreviewObject();
        if (!preview) {
            Utils.showToast('Select a clone preview part before erasing a color.', 'warning');
            return false;
        }
        const img = await this._ucGetImageElementForSampling(preview);
        if (!img) return false;
        const target = String(hexColor || '#ffffff').replace('#', '');
        const tr = parseInt(target.slice(0, 2), 16);
        const tg = parseInt(target.slice(2, 4), 16);
        const tb = parseInt(target.slice(4, 6), 16);
        if (![tr, tg, tb].every(Number.isFinite)) {
            Utils.showToast('Choose a valid erase color.', 'warning');
            return false;
        }
        const w = Math.max(1, img.naturalWidth || img.width || 1);
        const h = Math.max(1, img.naturalHeight || img.height || 1);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const tol = Math.max(4, Math.min(160, Number(tolerance) || 34));
        let changed = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] <= 0) continue;
            const dist = Math.hypot(data[i] - tr, data[i + 1] - tg, data[i + 2] - tb);
            if (dist > tol) continue;
            data[i + 3] = 0;
            changed++;
        }
        if (!changed) {
            Utils.showToast('No matching color pixels found in selected preview part.', 'info');
            return false;
        }
        ctx.putImageData(imageData, 0, 0);
        return this._ucUpdatePreviewImageFromCanvas(preview, c, `Erased ${changed} matching pixel${changed === 1 ? '' : 's'} from preview`);
    },

    async matchUniversalCharacterToSelectedImage(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const targetBounds = await this._ucGetSourceSilhouetteBounds(source);
        const objects = this._ucGetArmatureVisualObjectsForFit(armature);
        const currentBounds = this._ucGetObjectBounds(objects);
        if (!targetBounds || !currentBounds) {
            Utils.showToast('Could not read the source image or character bounds.', 'warning');
            return false;
        }
        if ((options.fitMode || 'height') === 'height') {
            const scale = targetBounds.height / currentBounds.height;
            const centeredWidth = currentBounds.width * scale;
            targetBounds.x = targetBounds.x + (targetBounds.width - centeredWidth) / 2;
            targetBounds.width = centeredWidth;
        }
        const sx = targetBounds.width / currentBounds.width;
        const sy = targetBounds.height / currentBounds.height;
        const scaleNumber = (value, scale) => Number.isFinite(value) ? value * scale : value;
        objects.forEach(obj => {
            obj.x = targetBounds.x + (obj.x - currentBounds.x) * sx;
            obj.y = targetBounds.y + (obj.y - currentBounds.y) * sy;
            obj.width = scaleNumber(obj.width, sx);
            obj.height = scaleNumber(obj.height, sy);
            if (Number.isFinite(obj.pinOffsetX)) obj.pinOffsetX *= sx;
            if (Number.isFinite(obj.pinOffsetY)) obj.pinOffsetY *= sy;
        });
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (options.pushHistory !== false) eventBus.emit('history:push');
        if (options.toast !== false) Utils.showToast('Universal Character shape matched to source image', 'success');
        return true;
    },

    async transferSelectedImageLookToUniversalCharacter(options = {}) {
        const { source, armature, error } = this._ucGetSelectedImageFitTargets();
        if (error) {
            Utils.showToast(error, 'warning');
            return false;
        }
        const sourceImg = await this._ucGetImageElementForSampling(source);
        if (!sourceImg) {
            Utils.showToast('Could not read the selected source image.', 'warning');
            return false;
        }

        this._ucEnsureUniversalCharacterBodyVisible(armature);
        const parts = this._ucGetTransferableUniversalCharacterParts(armature);
        if (!parts.length) {
            Utils.showToast('No rigged Universal Character body parts found to paint.', 'warning');
            return false;
        }

        const transferMode = options.transferMode || 'proportional';
        const sourceProfile = transferMode === 'aligned'
            ? null
            : transferMode === 'auto'
                ? await this._ucAnalyzeSourceCharacterRegions(source, sourceImg)
                : await this._ucBuildProportionalSourceProfile(source, sourceImg);
        if (options.adaptShapes !== false && transferMode === 'proportional' && sourceProfile) {
            this._ucAdaptUniversalCharacterPartShapes(armature, sourceProfile);
            if (this.objects?._resolvePins) this.objects._resolvePins();
        }
        let changed = 0;
        for (const part of parts) {
            const region = sourceProfile
                ? (transferMode === 'auto'
                    ? this._ucGetSourceRegionForPart(sourceProfile, part, armature)
                    : this._ucGetProportionalSourceRegionForPart(sourceProfile, part, armature))
                : null;
            const ok = region
                ? await this._ucTransferSourceRegionToPart(sourceImg, part, region, { armature, profile: sourceProfile })
                : await this._ucTransferSourcePixelsToPart(source, sourceImg, part);
            if (ok) changed++;
        }

        if (options.alignFace !== false && sourceProfile) {
            this._ucAlignFacialControlsToTransferredFace(armature, sourceImg, sourceProfile);
        }

        if (options.hideGenerated !== false) {
            [
                ...this._getArmatureFacialObjects(armature).filter(obj => obj?._facialFeatureKey),
                ...this._getUniversalCharacterGarmentObjects(armature)
            ].forEach(obj => {
                if (obj) obj.visible = false;
            });
        }
        if (options.hideSource === true && source) source.visible = false;
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        if (changed) {
            eventBus.emit('history:push');
            Utils.showToast(`Transferred source look to ${changed} rigged part${changed === 1 ? '' : 's'}`, 'success');
            return true;
        }
        Utils.showToast('No overlapping source pixels were found. Align the image over the character and try again.', 'warning');
        return false;
    },

    async _ucTransferSourceRegionToPart(sourceImg, partObj, region, options = {}) {
        if (!sourceImg || !partObj || !region) return false;
        if (!partObj._ucImageFitMaskSrc && !partObj._ucImageFitTexture && partObj.imageSrc) {
            partObj._ucImageFitMaskSrc = partObj.imageSrc;
        }
        const maskSource = partObj._ucImageFitMaskSrc ? { imageSrc: partObj._ucImageFitMaskSrc } : partObj;
        const maskImg = await this._ucGetImageElementForSampling(maskSource);
        if (!sourceImg || !partObj || !maskImg || !region) return false;
        const w = Math.max(12, Math.round(Math.abs(partObj.width) || maskImg.naturalWidth || maskImg.width || 12));
        const h = Math.max(12, Math.round(Math.abs(partObj.height) || maskImg.naturalHeight || maskImg.height || 12));
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, w, h);
        const refinedRegion = this._ucRefineTransferRegionForPart(sourceImg, region, partObj, options.armature, options.profile);
        const safeRegion = this._ucClampImageRegion(refinedRegion, sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
        if (!safeRegion) return false;
        const sx = safeRegion.x;
        const sy = safeRegion.y;
        const sw = safeRegion.width;
        const sh = safeRegion.height;
        ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, w, h);

        const mask = document.createElement('canvas');
        mask.width = w;
        mask.height = h;
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        maskCtx.drawImage(maskImg, 0, 0, w, h);
        const outData = ctx.getImageData(0, 0, w, h);
        const maskData = maskCtx.getImageData(0, 0, w, h).data;
        let opaqueCount = 0;
        let rSum = 0, gSum = 0, bSum = 0, rgbCount = 0;
        const transferRole = this._ucGetPartVisualRole(partObj, options.armature);
        const shouldFillTransparentSample = transferRole === 'head' || transferRole === 'head-neck' || transferRole === 'torso';
        for (let i = 0; i < outData.data.length; i += 4) {
            if (outData.data[i + 3] > 24) {
                rSum += outData.data[i];
                gSum += outData.data[i + 1];
                bSum += outData.data[i + 2];
                rgbCount++;
            }
        }
        const fallbackR = rgbCount ? Math.round(rSum / rgbCount) : 74;
        const fallbackG = rgbCount ? Math.round(gSum / rgbCount) : 144;
        const fallbackB = rgbCount ? Math.round(bSum / rgbCount) : 217;
        for (let i = 0; i < outData.data.length; i += 4) {
            const ma = maskData[i + 3];
            if (shouldFillTransparentSample && outData.data[i + 3] <= 24) {
                outData.data[i] = fallbackR;
                outData.data[i + 1] = fallbackG;
                outData.data[i + 2] = fallbackB;
            }
            outData.data[i + 3] = shouldFillTransparentSample
                ? ma
                : Math.round(outData.data[i + 3] * (ma / 255));
            if (outData.data[i + 3] > 12) opaqueCount++;
        }
        if (opaqueCount < 6) return false;
        ctx.putImageData(outData, 0, 0);
        const dataUrl = out.toDataURL('image/png');
        partObj.imageSrc = dataUrl;
        partObj._ucImageFitTexture = true;
        partObj._ucImageFitTransferMode = 'auto-region';
        partObj.loadImage?.(dataUrl);
        return true;
    },

    async _ucTransferSourcePixelsToPart(sourceObj, sourceImg, partObj) {
        if (!partObj?._ucImageFitMaskSrc && !partObj?._ucImageFitTexture && partObj?.imageSrc) {
            partObj._ucImageFitMaskSrc = partObj.imageSrc;
        }
        const maskSource = partObj?._ucImageFitMaskSrc ? { imageSrc: partObj._ucImageFitMaskSrc } : partObj;
        const maskImg = await this._ucGetImageElementForSampling(maskSource);
        if (!sourceObj || !sourceImg || !partObj || !maskImg) return false;
        const w = Math.max(12, Math.round(Math.abs(partObj.width) || maskImg.naturalWidth || maskImg.width || 12));
        const h = Math.max(12, Math.round(Math.abs(partObj.height) || maskImg.naturalHeight || maskImg.height || 12));
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, w, h);

        const partX = Math.min(partObj.x, partObj.x + partObj.width);
        const partY = Math.min(partObj.y, partObj.y + partObj.height);
        const partW = Math.abs(partObj.width) || 1;
        const partH = Math.abs(partObj.height) || 1;
        const srcX = Math.min(sourceObj.x, sourceObj.x + sourceObj.width);
        const srcY = Math.min(sourceObj.y, sourceObj.y + sourceObj.height);
        const srcW = Math.abs(sourceObj.width) || 1;
        const srcH = Math.abs(sourceObj.height) || 1;

        const destX = ((srcX - partX) / partW) * w;
        const destY = ((srcY - partY) / partH) * h;
        const destW = (srcW / partW) * w;
        const destH = (srcH / partH) * h;
        ctx.drawImage(sourceImg, destX, destY, destW, destH);

        const mask = document.createElement('canvas');
        mask.width = w;
        mask.height = h;
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        maskCtx.drawImage(maskImg, 0, 0, w, h);
        const outData = ctx.getImageData(0, 0, w, h);
        const maskData = maskCtx.getImageData(0, 0, w, h).data;
        let opaqueCount = 0;
        for (let i = 0; i < outData.data.length; i += 4) {
            const ma = maskData[i + 3] / 255;
            outData.data[i + 3] = Math.round(outData.data[i + 3] * ma);
            if (outData.data[i + 3] > 12) opaqueCount++;
        }
        if (opaqueCount < 6) return false;
        ctx.putImageData(outData, 0, 0);
        const dataUrl = out.toDataURL('image/png');
        partObj.imageSrc = dataUrl;
        partObj._ucImageFitTexture = true;
        partObj.loadImage?.(dataUrl);
        return true;
    },


    // ═══════════════════════════════════════════════════════════════════════
    //  Universal Character — Parametric Anatomical Character Generator
    //  Supports: front / side / back views, age groups, facial animations
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Create a parametric anatomical character and assemble it as a Pose Armature.
     *
     * @param {object} opts
     * @param {string} opts.gender       - 'male' | 'female' | 'neutral'
     * @param {string} opts.bodyType     - 'petite' | 'slim' | 'normal' | 'tall' | 'athletic' | 'muscular' | 'curvy' | 'stocky' | 'plus-size'
     * @param {string} opts.ageGroup     - 'neonate' | 'child' | 'adolescent' | 'adult' | 'elderly'
     * @param {string} opts.view         - 'front' | 'side' | 'back'
     * @param {number} opts.height       - total pixel height on stage (default 700)
     * @param {string} opts.skinTone     - hex color
     * @param {string} opts.hairColor    - hex color
     * @param {string} opts.outlineColor - hex color
     * @param {number} opts.outlineWidth - px
     * @param {number} opts.stageX       - center X on stage
     * @param {number} opts.stageY       - top Y on stage
     */
    createUniversalCharacter(opts = {}) {
        const config = this._normalizeUniversalCharacterConfig(opts);
        const internal = opts?._ucInternal || {};
        const gender     = config.gender;
        const bodyType   = config.bodyType;
        const ageGroup   = config.ageGroup;
        const view       = config.view;
        const sideFacing = config.sideFacing;
        const totalH     = config.height;
        const skinTone   = config.skinTone;
        const hairColor  = config.hairColor;
        const outline    = config.outlineColor;
        const outlineW   = config.outlineWidth;
        const stageWidth = Number.isFinite(this.stage?.width) ? this.stage.width : 1920;
        const defaultPlacement = this._getUniversalCharacterDefaultPlacement();

        // ── Age-adjusted head-unit ratio ──
        const ageRatios = this._ucAgeRatios(ageGroup);
        const headUnit = totalH / ageRatios.totalHeads;

        // ── Proportion system ──
        const p = this._ucApplyBodyAngleToProportions(
            this._ucApplyQualityPresetToProportions(
                this._ucApplyHeadNeckStyleToProportions(
                    this._ucGetProportions(gender, bodyType, headUnit, ageRatios, view, config.build, config.weight, config.muscle, config.partScale, config.hip, config.shoulder, config.belly, config.bust),
                    config.headNeckStyle,
                    view
                ),
                config.qualityPreset,
                view,
                config
            ),
            config.bodyAngle,
            view,
            config.viewVariant,
            sideFacing
        );
        const stageX     = Number.isFinite(opts.stageX) ? opts.stageX : (Number.isFinite(defaultPlacement?.stageX) ? defaultPlacement.stageX : (stageWidth / 2));
        const stageY     = Number.isFinite(opts.stageY) ? opts.stageY : this._ucGetDefaultTopYForTorsoTop(p, stageX, view);

        // ── Draw all body parts ──
        const drawCtx = this._ucBuildDrawContextFromConfig(config);

        if (view === 'side') {
            return this._ucCreateSideCharacter(p, drawCtx, stageX, stageY, sideFacing, {
                ...internal,
                variantKey: internal.variantKey || this._getUniversalCharacterVariantKeyFromConfig(config),
                styleConfig: internal.styleConfig || config
            });
        }

        // Front or back view — uses bilateral (left/right) armature
        const partDrawCtx = this._ucUseIntegratedGarmentParts?.(drawCtx)
            ? (this._ucBuildIntegratedGarmentPartsContext?.(drawCtx) || drawCtx)
            : drawCtx;
        const canvases = {};
        canvases.head  = this._ucRenderHeadCanvas(p, drawCtx);
        canvases.torso = this._ucRenderTorsoCanvas(p, partDrawCtx);
        canvases.rArm  = this._ucRenderArmCanvas(p, partDrawCtx, 'right');
        canvases.lArm  = this._ucRenderArmCanvas(p, partDrawCtx, 'left');
        canvases.rLeg  = this._ucRenderLegCanvas(p, partDrawCtx, 'right');
        canvases.lLeg  = this._ucRenderLegCanvas(p, partDrawCtx, 'left');

        // ── Compute world positions ──
        const layout = this._ucAdjustThreeQuarterLayoutDepth(
            this._ucComputeLayout(p, stageX, stageY),
            p,
            view,
            sideFacing
        );

        // ── Create StageObjects ──
        const createdParts = {};
        const partMap = {
            torso:   { canvas: canvases.torso, layout: layout.torso, name: 'Torso' },
            head:    { canvas: canvases.head,  layout: layout.head,  name: 'Head Neck' },
            'r-arm': { canvas: canvases.rArm,  layout: layout.rArm,  name: 'Right Arm' },
            'l-arm': { canvas: canvases.lArm,  layout: layout.lArm,  name: 'Left Arm' },
            'r-leg': { canvas: canvases.rLeg,  layout: layout.rLeg,  name: 'Right Leg' },
            'l-leg': { canvas: canvases.lLeg,  layout: layout.lLeg,  name: 'Left Leg' }
        };
        const partEntries = this._ucOrderThreeQuarterPartEntries(Object.entries(partMap), view, sideFacing);

        const _prevSuppressFront = this.objects._suppressHistory;
        this.objects._suppressHistory = true;
        try {
            partEntries.forEach(([slicerKey, info]) => {
                const dataUrl = info.canvas.toDataURL('image/png');
                const obj = new StageObject('image', {
                    x: info.layout.x, y: info.layout.y,
                    width: info.layout.w, height: info.layout.h,
                    imageSrc: dataUrl, name: info.name, layer: 0, opacity: 1
                });
                this.objects.addObject(obj);
                obj._tempTrimmedCanvas = info.canvas;
                obj._ucQualityPreset = config.qualityPreset;
                obj._webglMaterialHint = {
                    category: 'universal-character',
                    qualityPreset: config.qualityPreset,
                    smoothing: this._ucIsHumanLikeQuality(config.qualityPreset) ? 'human-like' : 'standard'
                };
                createdParts[slicerKey] = obj;
            });
        } finally {
            this.objects._suppressHistory = _prevSuppressFront;
        }

        const shoulderPivots = {
            'r-arm': { x: p.armShoulderPivotX, y: p.armShoulderPivotY },
            'l-arm': { x: 1 - p.armShoulderPivotX, y: p.armShoulderPivotY }
        };

        const armature = this._ucAssembleFrontArmature(createdParts, shoulderPivots, view, {
            ...internal,
            openPanel: false,
            toast: false,
            variantKey: internal.variantKey || this._getUniversalCharacterVariantKeyFromConfig(config),
            styleConfig: internal.styleConfig || config
        });

        this._ucCreatePinnedGarmentSet(armature, createdParts, p, drawCtx, {
            torso: canvases.torso,
            'r-arm': canvases.rArm,
            'l-arm': canvases.lArm,
            'r-leg': canvases.rLeg,
            'l-leg': canvases.lLeg
        }, {
            pushHistory: internal.pushHistory,
            frontBackFacing: this._ucIsBackFamilyView(view) ? 'back' : 'front'
        });

        this._ucApplyThreeQuarterBodyTiltPose(createdParts, view, sideFacing);

        // Facial features as sub-objects of head (for animation)
        if (canvases.head && createdParts['head']) {
            this._ucApplyThreeQuarterHeadObjectPose(createdParts['head'], view, sideFacing);
            this._ucCreateFacialFeatures(createdParts['head'], p, drawCtx);
        }

        if ((view === 'front' || this._ucIsBackFamilyView?.(view)) && armature?.root) {
            const canonicalFacing = this._ucIsBackFamilyView?.(view) ? 'back' : 'front';
            this._syncArmatureFrontBackViewLayerOrder?.(
                armature,
                canonicalFacing,
                this._ucGetCanonicalArmatureLayerOrder(view, sideFacing),
                { agbadaArmLayerMode: 'respect-arm-order' }
            );
            this.objects?._resolvePins?.();
            this.objects?.updateObjectList?.();
            this.objects?.updateProperties?.();
            this.stage?.requestRender?.();
        }

        if (this._ucIsThreeQuarterView(view)) {
            this._ucApplyThreeQuarterReferencePosture(createdParts, armature, view, sideFacing);
        }

        if (internal.openPanel !== false) {
            this.openArmaturePanel(armature, {
                compactMode: internal.compactArmaturePanel === true
            });
            if (this._ucIsThreeQuarterView(view)) {
                this._ucApplyThreeQuarterReferencePosture(createdParts, armature, view, sideFacing);
            }
        }
        this._ucDefaultPlacement = this._getUniversalCharacterPlacement(armature);
        return armature;
    },

    // Derive the 3/4 reference posture for any view/facing from the recorded
    // back-3q right pose: left = horizontal mirror; front = depth-inverted back.
    _ucGetThreeQuarterReferenceSpec(view, sideFacing = 'right') {
        const isBack = this._ucIsBackFamilyView?.(view);
        const facing = sideFacing === 'left' ? 'left' : 'right';
        const base = {
            'r-arm': { x: 24.973, y: -15.348 },
            'l-arm': { x: -24.973, y: 15.347 },
            'r-leg': { x: 7.572, y: -4.654 },
            'l-leg': { x: -7.573, y: 4.654 }
        };
        const negateXSwapLR = (o) => ({
            'r-arm': { x: -o['l-arm'].x, y: o['l-arm'].y },
            'l-arm': { x: -o['r-arm'].x, y: o['r-arm'].y },
            'r-leg': { x: -o['l-leg'].x, y: o['l-leg'].y },
            'l-leg': { x: -o['r-leg'].x, y: o['r-leg'].y }
        });
        const swapLR = (o) => ({
            'r-arm': { ...o['l-arm'] },
            'l-arm': { ...o['r-arm'] },
            'r-leg': { ...o['l-leg'] },
            'l-leg': { ...o['r-leg'] }
        });
        if (isBack) {
            return facing === 'right'
                ? { tiltY: -45, offsets: base }
                : { tiltY: 45, offsets: negateXSwapLR(base) };
        }
        const frontRight = { tiltY: 45, offsets: swapLR(base) };
        return facing === 'right'
            ? frontRight
            : { tiltY: -45, offsets: negateXSwapLR(frontRight.offsets) };
    },

    _ucApplyThreeQuarterReferencePosture(createdParts, armature, view, sideFacing = 'right') {
        if (!createdParts || !armature?.root || !this._ucIsThreeQuarterView(view)) return false;
        const facing = sideFacing === 'left' ? 'left' : 'right';
        const isBack = this._ucIsBackFamilyView?.(view);
        const canonicalFacing = isBack ? 'back' : 'front';
        const spec = this._ucGetThreeQuarterReferenceSpec(view, facing);
        const tiltY = spec.tiltY;
        const torso = createdParts.torso || createdParts['torso'] || armature.parts?.torso?.obj || armature.root;
        const head = createdParts.head || createdParts['head'] || armature.parts?.['head-neck']?.obj;
        const bodyParts = [
            createdParts['r-arm'],
            createdParts['l-arm'],
            createdParts['r-leg'],
            createdParts['l-leg'],
            head
        ].filter(Boolean);

        const applyRecordedOffset = (obj, dx = 0, dy = 0) => {
            if (!obj || obj._ucThreeQuarterRefOffsetApplied) return;
            obj.x = (Number(obj.x) || 0) + dx;
            obj.y = (Number(obj.y) || 0) + dy;
            obj._ucThreeQuarterRefOffsetApplied = true;
        };
        ['r-arm', 'l-arm', 'r-leg', 'l-leg'].forEach(key => {
            const off = spec.offsets[key];
            if (off) applyRecordedOffset(createdParts[key], off.x, off.y);
        });

        bodyParts.forEach(obj => {
            obj.tiltX = 0;
            obj.tiltY = tiltY;
            if (obj.pinnedTo && (obj.pinRotationMode === 'inherit' || obj.pinInheritRotation)) {
                obj.pinBaseTiltX = 0;
                obj.pinBaseTiltY = 0;
            }
        });
        if (torso) {
            torso.pivotX = 0.5;
            torso.pivotY = 0.36;
            torso.tiltX = 0;
            torso.tiltY = tiltY;
            torso.rotation = Number(torso.rotation || 0);
            torso._ucThreeQuarterBodyTilt = { view, sideFacing: facing, tiltX: 0, tiltY };
            torso._armatureFrontBackFacing = canonicalFacing;
            torso._armatureFront3qLean = facing;
            torso._armatureFacingSide = facing;
            torso.armatureFacingSide = facing;
            torso._armatureVisualFacingSide = facing;
            torso.armatureVisualFacingSide = facing;
            torso._armatureFacingExplicit = true;
            if (isBack) torso._ucBack3qReferencePosture = facing;
            else delete torso._ucBack3qReferencePosture;
        }
        if (head) {
            head.pivotX = 0.5;
            head.pivotY = 0.92;
            head._ucThreeQuarterHeadTurn = { view, sideFacing: facing, tiltX: 0, tiltY };
        }

        const list = this.objects?.objects || [];
        const scalpHairs = list.filter(obj => {
            const isScalpHair = obj?._backViewScalpHair || obj?.name === 'Scalp Hair (Back View)';
            if (!isScalpHair) return false;
            return !head?.id || obj._backViewScalpHairParentId === head.id || obj.pinnedTo === head.id;
        });
        scalpHairs.forEach(obj => {
            obj.tiltX = 0;
            obj.tiltY = tiltY;
            if (obj.pinnedTo && (obj.pinRotationMode === 'inherit' || obj.pinInheritRotation)) {
                obj.pinBaseTiltX = 0;
                obj.pinBaseTiltY = 0;
            }
        });

        this._syncArmatureFrontBackViewLayerOrder?.(
            armature,
            canonicalFacing,
            this._ucGetCanonicalArmatureLayerOrder(view, facing),
            { agbadaArmLayerMode: 'respect-arm-order' }
        );

        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        return true;
    },

    _ucApplyBack3qRightReferencePosture(createdParts, armature) {
        return this._ucApplyThreeQuarterReferencePosture(createdParts, armature, 'back-3q', 'right');
    },

    /** Create a side-view (dual-arm) character. */
    _ucCreateSideCharacter(p, drawCtx, stageX, stageY, sideFacing = 'right', options = {}) {
        const partDrawCtx = this._ucUseIntegratedSideGarment(drawCtx)
            ? this._ucBuildIntegratedSideGarmentContext(drawCtx)
            : drawCtx;
        const canvases = {};
        canvases.head     = this._ucRenderHeadCanvas(p, drawCtx);
        canvases.torso    = this._ucRenderTorsoCanvas(p, partDrawCtx);
        canvases.frontArm = this._ucRenderArmCanvas(p, partDrawCtx, 'front');
        canvases.backArm  = this._ucRenderArmCanvas(p, partDrawCtx, 'back');
        canvases.frontLeg = this._ucRenderLegCanvas(p, partDrawCtx, 'front');
        canvases.backLeg  = this._ucRenderLegCanvas(p, partDrawCtx, 'back');

        if (sideFacing === 'right') {
            Object.keys(canvases).forEach(key => {
                canvases[key] = this._ucMirrorCanvasHorizontally(canvases[key]);
            });
        }

        const layout = this._ucComputeLayoutSide(p, stageX, stageY);

        const createdParts = {};
        // Draw order: earlier = behind. Back limbs behind torso/head, front limbs on top.
        const partMap = {
            'back-arm':  { canvas: canvases.backArm,  layout: layout.backArm,  name: 'Back Arm' },
            'back-leg':  { canvas: canvases.backLeg,  layout: layout.backLeg,  name: 'Back Leg' },
            'torso':     { canvas: canvases.torso,    layout: layout.torso,    name: 'Torso' },
            'head':      { canvas: canvases.head,     layout: layout.head,     name: 'Head Neck' },
            'front-leg': { canvas: canvases.frontLeg, layout: layout.frontLeg, name: 'Front Leg' },
            'front-arm': { canvas: canvases.frontArm, layout: layout.frontArm, name: 'Front Arm' }
        };
        const sidePartEntries = this._ucOrderPartEntriesByCanonicalOrder(
            Object.entries(partMap),
            'side',
            sideFacing
        );

        const _prevSuppressSide = this.objects._suppressHistory;
        this.objects._suppressHistory = true;
        try {
            sidePartEntries.forEach(([key, info]) => {
                const dataUrl = info.canvas.toDataURL('image/png');
                const obj = new StageObject('image', {
                    x: info.layout.x, y: info.layout.y,
                    width: info.layout.w, height: info.layout.h,
                    imageSrc: dataUrl, name: info.name, layer: 0, opacity: 1
                });
                this.objects.addObject(obj);
                obj._tempTrimmedCanvas = info.canvas;
                obj._ucQualityPreset = drawCtx.qualityPreset;
                obj._webglMaterialHint = {
                    category: 'universal-character',
                    qualityPreset: drawCtx.qualityPreset,
                    smoothing: this._ucIsHumanLikeQuality(drawCtx.qualityPreset) ? 'human-like' : 'standard'
                };
                createdParts[key] = obj;
            });
        } finally {
            this.objects._suppressHistory = _prevSuppressSide;
        }

        let armature = this._ucAssembleSideArmature(createdParts, {
            ...options,
            openPanel: false,
            toast: false
        });
        if (armature && this._markGeneratedUniversalArmatureBaselineReady) {
            this._markGeneratedUniversalArmatureBaselineReady(armature);
        }

        // Side parts are authored in a canonical left-facing pose. For a right-facing
        // character, mirror the source canvases first, then switch the armature facing
        // metadata without applying a second runtime visual flip.
        if (sideFacing === 'right') {
            const torso = createdParts['torso'];
            if (torso) {
                const pool = Object.values(createdParts);
                const detected = this._detectArmatureFromPool(pool);
                if (detected) {
                    this._applyArmatureFacingChoice(detected, 'right', {
                        explicit: true, pushHistory: false, toast: false, flipVisuals: false
                    });
                    if (detected.root) {
                        detected.root._armatureVisualFacingSide = 'right';
                        detected.root._armatureVisualBaseFacingSide = 'right';
                    }
                    armature = this._refreshDetectedArmatureReference(detected) || detected;
                }
            }
        }

        // ── Enforce correct z-order after facing flip may have swapped roles ──
        {
            const pool = Object.values(createdParts);
            const detected = this._detectArmatureFromPool(pool);
            if (detected) {
                armature = detected;
                const bArm = armature.parts?.['back-arm']?.obj;
                const bLeg = armature.parts?.['back-leg']?.obj;
                const tObj = armature.parts?.torso?.obj || armature.root;
                const hObj = armature.parts?.['head-neck']?.obj;
                const fLeg = armature.parts?.['front-leg']?.obj;
                const fArm = armature.parts?.['front-arm']?.obj;
                const ordered = [bArm, bLeg, tObj, hObj, fLeg, fArm].filter(Boolean);
                const list = this.objects.objects;
                const idSet = new Set(ordered.map(o => o.id));
                const indices = ordered.map(o => list.indexOf(o)).filter(i => i >= 0);
                if (indices.length) {
                    const minIdx = Math.min(...indices);
                    const remaining = list.filter(o => !idSet.has(o?.id));
                    remaining.splice(minIdx, 0, ...ordered);
                    this.objects.objects = remaining;
                }
            }
        }

        this._ucCreatePinnedGarmentSet(armature, createdParts, p, drawCtx, {
            torso: canvases.torso,
            'front-arm': canvases.frontArm,
            'back-arm': canvases.backArm,
            'front-leg': canvases.frontLeg,
            'back-leg': canvases.backLeg
        }, {
            pushHistory: options.pushHistory,
            mirrorSideFacing: sideFacing === 'right'
        });

        // Create facial features AFTER facing flip so they're positioned correctly
        if (canvases.head && createdParts['head']) {
            this._ucCreateFacialFeatures(createdParts['head'], p, {
                ...drawCtx,
                sideFacing
            });
        }
        if (options.openPanel !== false) {
            this.openArmaturePanel(armature, {
                compactMode: options.compactArmaturePanel === true
            });
        }
        this._ucDefaultPlacement = this._getUniversalCharacterPlacement(armature);
        return armature;
    },

    _ucMirrorCanvasHorizontally(sourceCanvas) {
        if (!sourceCanvas) return sourceCanvas;
        const mirrored = document.createElement('canvas');
        mirrored.width = sourceCanvas.width;
        mirrored.height = sourceCanvas.height;
        const ctx = mirrored.getContext('2d');
        ctx.translate(mirrored.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sourceCanvas, 0, 0);
        return mirrored;
    },

    // ═══════════════════════════════════════════════════════════════
    //  Assembly: Front/Back Bilateral Armature
    // ═══════════════════════════════════════════════════════════════

    _ucAssembleFrontArmature(createdParts, inferredShoulderPivots, view, options = {}) {
        const torso = createdParts['torso'];
        if (!torso) return;
        const head = createdParts['head'];
        const rArm = createdParts['r-arm'];
        const lArm = createdParts['l-arm'];
        const rLeg = createdParts['r-leg'];
        const lLeg = createdParts['l-leg'];

        const isBackFamilyView = this._ucIsBackFamilyView(view);
        const nameMap = isBackFamilyView
            ? { torso: 'Torso', head: 'Head Neck', 'r-arm': 'Left Arm', 'l-arm': 'Right Arm', 'r-leg': 'Left Leg', 'l-leg': 'Right Leg' }
            : { torso: 'Torso', head: 'Head Neck', 'r-arm': 'Right Arm', 'l-arm': 'Left Arm', 'r-leg': 'Right Leg', 'l-leg': 'Left Leg' };
        const roleMap = isBackFamilyView
            ? { torso: 'torso', head: 'head-neck', 'r-arm': 'left-arm', 'l-arm': 'right-arm', 'r-leg': 'left-leg', 'l-leg': 'right-leg' }
            : { torso: 'torso', head: 'head-neck', 'r-arm': 'right-arm', 'l-arm': 'left-arm', 'r-leg': 'right-leg', 'l-leg': 'left-leg' };

        let headCanvas = null, torsoCanvas = null;
        Object.entries(createdParts).forEach(([key, obj]) => {
            if (nameMap[key]) obj.name = nameMap[key];
            if (roleMap[key]) { obj._armatureRoleKey = roleMap[key]; obj._armaturePartKey = roleMap[key]; }
            const roleKey = roleMap[key];
            if (!roleKey) return;
            const canvas = obj._tempTrimmedCanvas || null;
            if (key === 'head') headCanvas = canvas;
            if (key === 'torso') torsoCanvas = canvas;
            const customSpecs = canvas ? this._bslComputeImageJointCrossOffsets(canvas, roleKey) : null;
            const opts = { allowTorso: true };
            if (customSpecs?.length) opts.customSpecs = customSpecs;
            this._applyArmatureJointChainToObject(obj, roleKey, opts);
            delete obj._tempTrimmedCanvas;
        });

        if (torso) { torso.pivotX = 0.5; torso.pivotY = 0.3; }
        if (head)  { head.pivotX = 0.5;  head.pivotY = 1.0; }
        if (rArm) { const sp = inferredShoulderPivots['r-arm'] || { x: 0.68, y: 0.10 }; rArm.pivotX = sp.x; rArm.pivotY = sp.y; }
        if (lArm) { const sp = inferredShoulderPivots['l-arm'] || { x: 0.32, y: 0.10 }; lArm.pivotX = sp.x; lArm.pivotY = sp.y; }
        if (rLeg) { rLeg.pivotX = 0.5; rLeg.pivotY = 0.0; }
        if (lLeg) { lLeg.pivotX = 0.5; lLeg.pivotY = 0.0; }

        if (head)  this._configureDummyArmatureJointPin(head, torso, 'waist', 'inherit');
        if (rArm)  this._configureDummyArmatureJointPin(rArm, torso, 'waist', 'inherit');
        if (lArm)  this._configureDummyArmatureJointPin(lArm, torso, 'waist', 'inherit');
        if (rLeg)  this._configureDummyArmaturePin(rLeg, torso, 0.36, 0.84, 'inherit');
        if (lLeg)  this._configureDummyArmaturePin(lLeg, torso, 0.64, 0.84, 'inherit');

        torso._armatureFrontBackFacing = isBackFamilyView ? 'back' : 'front';
        torso._bslSkipTorsoAttachmentRig = true;
        const _isThreeQuarterView = view === 'front-3q' || view === 'back-3q';
        const _leanCfg = String(options.styleConfig?.front3qLean || '').toLowerCase();
        const _threeQuarterFacing = String(options.sideFacing || options.styleConfig?.sideFacing || '').toLowerCase();
        if (_isThreeQuarterView && (_leanCfg === 'left' || _leanCfg === 'right')) {
            torso._armatureFront3qLean = _leanCfg;
        } else if (_isThreeQuarterView && (_threeQuarterFacing === 'left' || _threeQuarterFacing === 'right')) {
            torso._armatureFront3qLean = _threeQuarterFacing;
        } else {
            delete torso._armatureFront3qLean;
        }
        torso._ucCharacterFamilyId = options.familyId || null;
        torso._ucCharacterVariantKey = options.variantKey || view;
        torso._ucCharacterStyleConfig = JSON.parse(JSON.stringify(options.styleConfig || {}));
        torso._ucCharacterLinkedViews = JSON.parse(JSON.stringify(options.linkedViews || []));
        torso._ucCharacterFamilyState = { type: 'idle', key: null };
        torso._ucCharacterActivePoseKey = null;

        if (this.objects._resolvePins) this.objects._resolvePins();
        const allIds = Object.values(createdParts).map(o => o.id);
        if (options.select !== false) {
            this.objects.select(allIds);
        }
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.stage.requestRender();
        if (options.pushHistory !== false) {
            eventBus.emit('history:push');
        }

        if (view !== 'back') {
            if (head)  this._generateBackViewScalpHair(head, torso, headCanvas);
        }

        let armature = this._detectArmatureFromPool(Object.values(createdParts));
        if (armature && this._ensureArmatureTorsoAttachmentRig(armature)) {
            this.objects.updateObjectList();
            this.objects.updateProperties();
            this.stage.requestRender();
            armature = this._refreshDetectedArmatureReference(armature) || armature;
        }
        if (armature && this._markGeneratedUniversalArmatureBaselineReady) {
            this._markGeneratedUniversalArmatureBaselineReady(armature);
        }
        if (armature && (view === 'front' || view === 'front-3q' || view === 'back-3q' || view === 'back')) {
            const frontBackFacing = this._ucIsBackFamilyView(view) ? 'back' : 'front';
            armature = this._applyArmatureFrontBackChoice(armature, frontBackFacing, {
                pushHistory: false,
                toast: false,
                rebuildPanel: false,
                enforceLayout: frontBackFacing === 'back'
            }) || armature;
        }
        if (armature?.root) {
            armature.root._armatureFrontBackFacing = this._ucIsBackFamilyView(view) ? 'back' : 'front';
        }
        if (armature && this._applyArmatureFront3qBaselineTilt) {
            this._applyArmatureFront3qBaselineTilt(armature);
        }
        if (options.openPanel !== false) {
            this.openArmaturePanel(armature);
        }
        return armature;
    },

    // ════════════════════════════════════════════════════════════════
    //  Assembly: Side-View Dual-Arm Armature
    // ════════════════════════════════════════════════════════════════

    _ucAssembleSideArmature(createdParts, options = {}) {
        const torso    = createdParts['torso'];
        const head     = createdParts['head'];
        const frontArm = createdParts['front-arm'];
        const backArm  = createdParts['back-arm'];
        const frontLeg = createdParts['front-leg'];
        const backLeg  = createdParts['back-leg'];
        if (!torso) return;

        const nameMap = { 'torso': 'Torso', 'head': 'Head Neck', 'front-arm': 'Front Arm', 'back-arm': 'Back Arm', 'front-leg': 'Front Leg', 'back-leg': 'Back Leg' };
        const roleMap = { 'torso': 'torso', 'head': 'head-neck', 'front-arm': 'front-arm', 'back-arm': 'back-arm', 'front-leg': 'front-leg', 'back-leg': 'back-leg' };

        Object.entries(createdParts).forEach(([key, obj]) => {
            if (nameMap[key]) obj.name = nameMap[key];
            if (roleMap[key]) { obj._armatureRoleKey = roleMap[key]; obj._armaturePartKey = roleMap[key]; }
            const roleKey = roleMap[key];
            if (!roleKey) return;
            const canvas = obj._tempTrimmedCanvas || null;
            const customSpecs = canvas ? this._bslComputeImageJointCrossOffsets(canvas, roleKey) : null;
            const opts = { allowTorso: true };
            if (customSpecs?.length) opts.customSpecs = customSpecs;
            this._applyArmatureJointChainToObject(obj, roleKey, opts);
            delete obj._tempTrimmedCanvas;
        });

        // Pivots — match working reference character conventions.
        // Torso and head use center pivots (0.5, 0.5).
        // Arms pivot near their top (shoulder connection).
        // Legs pivot at their top (hip connection).
        if (torso)    { torso.pivotX = 0.5; torso.pivotY = 0.5; }
        if (head)     { head.pivotX = 0.5;  head.pivotY = 0.5; }
        if (frontArm) { frontArm.pivotX = 0.5; frontArm.pivotY = 0.02; }
        if (backArm)  { backArm.pivotX = 0.5;  backArm.pivotY = 0.02; }
        if (frontLeg) { frontLeg.pivotX = 0.5; frontLeg.pivotY = 0.0; }
        if (backLeg)  { backLeg.pivotX = 0.5;  backLeg.pivotY = 0.0; }

        // Upper-body parts (head, arms) pin to the WAIST JOINT on the torso.
        // This way when the waist bends, the offset vector rotates with the joint
        // angle, making children arc around the waist pivot — both position and
        // rotation track the waist bend naturally.
        // Legs pin to the torso center anchor — they should NOT follow waist bends.
        if (head)     this._configureDummyArmatureJointPin(head,     torso, 'waist', 'inherit');
        if (frontArm) this._configureDummyArmatureJointPin(frontArm, torso, 'waist', 'inherit');
        if (backArm)  this._configureDummyArmatureJointPin(backArm,  torso, 'waist', 'inherit');
        if (frontLeg) this._configureDummyArmaturePin(frontLeg, torso, 0.50, 0.50, 'inherit');
        if (backLeg)  this._configureDummyArmaturePin(backLeg,  torso, 0.50, 0.50, 'inherit');

        torso._armaturePromotedProfile = 'side-dual';
        torso._armatureFacingSide = 'left';
        torso._armatureFacingExplicit = true;
        torso._armatureSkinStrictSideProfile = true;
        torso._bslSkipTorsoAttachmentRig = true;
        torso._ucCharacterFamilyId = options.familyId || null;
        torso._ucCharacterVariantKey = options.variantKey || 'side:left';
        torso._ucCharacterStyleConfig = JSON.parse(JSON.stringify(options.styleConfig || {}));
        torso._ucCharacterLinkedViews = JSON.parse(JSON.stringify(options.linkedViews || []));
        torso._ucCharacterFamilyState = { type: 'idle', key: null };
        torso._ucCharacterActivePoseKey = null;

        if (this.objects._resolvePins) this.objects._resolvePins();
        const allIds = Object.values(createdParts).map(o => o.id);
        if (options.select !== false) {
            this.objects.select(allIds);
        }

        // Layer order: back limbs stay behind the body while front limbs stay on top.
        // Side-view clothing is inserted between the torso/front leg and the front arm,
        // so reaching and eating poses do not disappear under pinned garments.
        let layer = 0;
        if (backArm)  backArm.layer = layer++;
        if (backLeg)  backLeg.layer = layer++;
        if (torso)    torso.layer = layer++;
        if (head)     head.layer = layer++;
        if (frontLeg) frontLeg.layer = layer++;
        if (frontArm) frontArm.layer = layer++;

        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.stage.requestRender();
        if (options.pushHistory !== false) {
            eventBus.emit('history:push');
        }

        const armature = this._detectArmatureFromPool(Object.values(createdParts));
        if (options.openPanel !== false) {
            this.openArmaturePanel();
        }
        return armature;
    },

    // ════════════════════════════════════════════════════════════════
    //  Age Ratio Tables
    // ════════════════════════════════════════════════════════════════

    _ucAgeRatios(ageGroup) {
        // Classical proportion system: total body height measured in head-units.
        // Ratios for each segment expressed relative to that age group's head unit.
        switch (ageGroup) {
            case 'neonate': return {
                totalHeads: 4.0,
                headScale: 1.3,   // larger head relative to body
                torsoRatio: 1.6,  // torso in head-units
                armRatio: 1.2,
                legRatio: 1.1,
                shoulderMult: 0.65,
                hipMult: 0.75,
                neckRatio: 0.10,
                limbWidthMult: 1.2,
                faceScale: 1.15   // rounder face
            };
            case 'child': return {
                totalHeads: 5.5,
                headScale: 1.1,
                torsoRatio: 1.8,
                armRatio: 1.6,
                legRatio: 2.0,
                shoulderMult: 0.75,
                hipMult: 0.70,
                neckRatio: 0.14,
                limbWidthMult: 1.05,
                faceScale: 1.08
            };
            case 'adolescent': return {
                totalHeads: 6.5,
                headScale: 1.0,
                torsoRatio: 2.4,
                armRatio: 2.4,
                legRatio: 3.2,
                shoulderMult: 0.88,
                hipMult: 0.82,
                neckRatio: 0.18,
                limbWidthMult: 0.95,
                faceScale: 1.02
            };
            case 'elderly': return {
                totalHeads: 7.0,
                headScale: 1.0,
                torsoRatio: 2.8,
                armRatio: 2.6,
                legRatio: 3.2,
                shoulderMult: 0.92,
                hipMult: 0.95,
                neckRatio: 0.20,
                limbWidthMult: 1.0,
                faceScale: 1.0
            };
            default: /* adult */ return {
                totalHeads: 7.5,
                headScale: 1.0,
                torsoRatio: 3.0,
                armRatio: 2.85,
                legRatio: 3.65,
                shoulderMult: 1.0,
                hipMult: 1.0,
                neckRatio: 0.22,
                limbWidthMult: 1.0,
                faceScale: 1.0
            };
        }
    },

    // ════════════════════════════════════════════════════════════════
    //  Proportion Calculator
    // ════════════════════════════════════════════════════════════════

    _ucGetProportions(gender, bodyType, hu, age, view, build = null, weight = null, muscle = 50, partScale = null, hip = 50, shoulder = 50, belly = 50, bust = 50) {
        const isMale   = gender === 'male';
        const isFemale = gender === 'female';
        const isSide   = view === 'side';
        const bw = (build != null && weight != null)
            ? { build, weight }
            : this._ucBodyTypeToBuildWeight(bodyType);
        const bodyProfile = this._ucGetComposedBodyProfile(bw.build, bw.weight, gender);
        const muscle01 = this._ucClampNum(muscle, 0, 100, this._ucDefaultMuscleForBuild(bw.build)) / 100;
        const muscleLift = Math.max(0, (muscle01 - 0.35) / 0.65);
        const muscleDrop = Math.max(0, (0.45 - muscle01) / 0.45);
        const hipSlider = 0.78 + this._ucClampNum(hip, 0, 100, 50) / 100 * 0.5;
        const bustDelta = (this._ucClampNum(bust, 0, 100, 50) - 50) / 50;
        const bellyDelta = (this._ucClampNum(belly, 0, 100, 50) - 50) / 50;

        // Body-type width multipliers
        const wm = bodyProfile.widthMult || 1.0;

        // Shoulder / hip / waist widths (front view)
        let shoulderW = hu * (isFemale ? 1.55 : 1.9) * wm * (bodyProfile.shoulderMult || 1) * age.shoulderMult;
        let hipW      = hu * (isFemale ? 1.25 : 1.0) * wm * (bodyProfile.hipMult || 1) * age.hipMult * hipSlider;
        let waistW    = hu * (isFemale ? 0.85 : 1.05) * wm * (bodyProfile.waistMult || 1);
        shoulderW *= (0.94 + muscle01 * 0.26);
        waistW *= (1.02 - muscleLift * 0.12 + muscleDrop * 0.04);

        // Side view: profile depth (front-to-back measurement)
        if (isSide) {
            // A side profile torso is ~55-65% of front shoulder span
            const depthFactor = isFemale ? 0.62 : 0.58;
            shoulderW *= depthFactor;
            hipW *= (isFemale ? 0.65 : 0.60);
            waistW *= (this._ucIsFullerBodyType({ build: bw.build, weight: bw.weight }) ? 0.72 : 0.55);
        }

        // Head — side profile is nearly the same width (skull is round)
        let headW = hu * 0.82 * age.headScale;
        let headH = hu * age.headScale;
        let neckW = hu * 0.35;
        let neckH = hu * age.neckRatio;
        if (isSide) {
            // Side-profile skull depth ≈ head height; needs a much wider canvas
            // so the drawn profile (which uses ~65% of canvas) looks proportionate
            let sideHeadWidthMult = 1.55;
            let sideHeadHeightMult = 1.0;
            let sideNeckWidthMult = 1.20;
            let sideNeckHeightMult = 1.0;
            if (age.totalHeads <= 4.2) {
                sideHeadWidthMult = 1.70;
                sideHeadHeightMult = 1.05;
                sideNeckWidthMult = 1.06;
                sideNeckHeightMult = 0.92;
            } else if (age.totalHeads <= 5.6) {
                sideHeadWidthMult = 1.62;
                sideHeadHeightMult = 1.02;
                sideNeckWidthMult = 1.12;
                sideNeckHeightMult = 0.96;
            } else if (age.totalHeads >= 7.0) {
                sideHeadWidthMult = 1.50;
                sideHeadHeightMult = 0.98;
                sideNeckWidthMult = 1.26;
                sideNeckHeightMult = 1.08;
            }
            headW = hu * sideHeadWidthMult * age.headScale;
            headH *= sideHeadHeightMult;
            neckW *= sideNeckWidthMult;
            neckH *= sideNeckHeightMult;
        }

        // Manual body-shape adjustments. Calculate these before torso canvas
        // sizing so slider-driven silhouettes are not clipped by the bitmap.
        const bellyExtra = hu * (bodyProfile.bellyExtraHeads || 0) + hu * bellyDelta * 0.34;
        const bustExtra = hu * Math.max(0, bustDelta) * (isSide ? (isFemale ? 0.18 : 0.08) : (isFemale ? 0.12 : 0.05));

        // Torso
        const torsoH = hu * age.torsoRatio * (bodyProfile.torsoLengthMult || 1);
        const torsoW = (isSide ?
            Math.max(shoulderW, waistW) + hu * 0.20 + Math.max(0, bellyExtra) * 1.55 + bustExtra :
            Math.max(shoulderW, hipW) + hu * 0.1 + Math.max(0, bellyExtra) * 1.55 + bustExtra);

        // Arms
        const armTotalLen = hu * age.armRatio * (bodyProfile.limbLengthMult || 1);
        const upperArmLen = armTotalLen * 0.45;
        const forearmLen  = armTotalLen * 0.38;
        const handLen     = armTotalLen * 0.17;
        const armW = hu * (isFemale ? 0.33 : 0.38) * (bodyProfile.limbWidthMult || wm) * age.limbWidthMult
            * (0.86 + muscle01 * 0.58);

        // Legs
        const legTotalLen = hu * age.legRatio * (bodyProfile.limbLengthMult || 1);
        const upperLegLen = legTotalLen * 0.49;
        const lowerLegLen = legTotalLen * 0.44;
        const footH = legTotalLen * 0.07;
        const legW = hu * (isFemale ? 0.42 : 0.48) * (bodyProfile.limbWidthMult || wm) * age.limbWidthMult
            * (0.90 + muscle01 * 0.42);

        // Per-part size sliders (percent → multiplier), independent W/H, overall on top.
        const ps = this._ucNormalizePartScale(partScale);
        const ov = ps.overall / 100;
        const shoulderF = 0.82 + this._ucClampNum(shoulder, 0, 100, 50) / 100 * 0.42;
        const hW = (ps.head.w / 100) * ov, hH = (ps.head.h / 100) * ov;
        const nW = (ps.neck.w / 100) * ov, nH = (ps.neck.h / 100) * ov;
        const tW = (ps.torso.w / 100) * ov, tH = (ps.torso.h / 100) * ov;
        const aW = (ps.arms.w / 100) * ov, aH = (ps.arms.h / 100) * ov;
        const lW = (ps.legs.w / 100) * ov, lH = (ps.legs.h / 100) * ov;

        return {
            hu, gender, bodyType, ageGroup: age, view, muscle,
            isMale, isFemale, isSide, wm,
            headW: headW * hW, headH: headH * hH, neckW: neckW * nW, neckH: neckH * nH,
            torsoW: torsoW * tW, torsoH: torsoH * tH, shoulderW: shoulderW * tW * shoulderF, waistW: waistW * tW, hipW: hipW * tW, bellyExtra,
            armW: armW * aW, armTotalLen: armTotalLen * aH, upperArmLen: upperArmLen * aH, forearmLen: forearmLen * aH, handLen: handLen * aH,
            armElbowPos: upperArmLen / armTotalLen,
            armWristPos: (upperArmLen + forearmLen) / armTotalLen,
            armShoulderPivotX: 0.5, armShoulderPivotY: 0.02,
            legW: legW * lW, legTotalLen: legTotalLen * lH, upperLegLen: upperLegLen * lH, lowerLegLen: lowerLegLen * lH, footH: footH * lH,
            legKneePos: upperLegLen / legTotalLen,
            legAnklePos: (upperLegLen + lowerLegLen) / legTotalLen,
            faceScale: age.faceScale || 1.0
        };
    },

    // ════════════════════════════════════════════════════════════════
    //  Layout Calculators
    // ════════════════════════════════════════════════════════════════

    _ucComputeLayout(p, centerX, topY) {
        const bodyAngleSign = Number.isFinite(p.bodyAngleSign) ? p.bodyAngleSign : 0;
        // FS/BS variants removed; bodyAngleSign is always 0 in current builds.
        const limbDepthSign = bodyAngleSign;
        let headX = centerX - p.headW / 2;
        const headY = topY;
        const headBottomY = headY + p.headH + p.neckH;
        const torsoX = centerX - p.torsoW / 2;
        const torsoY = headBottomY - p.neckH * 0.6;
        const shoulderY = torsoY + p.torsoH * 0.06;
        let rArmX = torsoX - p.armW * 0.15;
        let lArmX = torsoX + p.torsoW - p.armW * 0.85;
        let rArmY = shoulderY;
        let lArmY = shoulderY;
        const hipY = torsoY + p.torsoH * 0.84;
        let rLegX = centerX - p.hipW * 0.45 - p.legW * 0.15;
        let lLegX = centerX + p.hipW * 0.45 - p.legW * 0.85;

        if (bodyAngleSign) {
            const nearSign = limbDepthSign;
            const farSign = -nearSign;
            headX += nearSign * p.hu * 0.025;

            const nearArmX = centerX + nearSign * p.torsoW * 0.58 - p.armW * 0.48;
            const farArmX = centerX + farSign * p.torsoW * 0.32 - p.armW * 0.48;
            const nearArmY = shoulderY + p.hu * 0.018;
            const farArmY = shoulderY - p.hu * 0.006;
            const nearLegX = centerX + nearSign * p.hipW * 0.54 - p.legW * 0.48;
            const farLegX = centerX + farSign * p.hipW * 0.30 - p.legW * 0.48;

            if (nearSign > 0) {
                rArmX = nearArmX;
                rArmY = nearArmY;
                rLegX = nearLegX;
                lArmX = farArmX;
                lArmY = farArmY;
                lLegX = farLegX;
            } else {
                lArmX = nearArmX;
                lArmY = nearArmY;
                lLegX = nearLegX;
                rArmX = farArmX;
                rArmY = farArmY;
                rLegX = farLegX;
            }
        }

        return {
            head:  { x: headX,  y: headY, w: p.headW, h: p.headH + p.neckH },
            torso: { x: torsoX, y: torsoY, w: p.torsoW, h: p.torsoH },
            rArm:  { x: rArmX,  y: rArmY, w: p.armW, h: p.armTotalLen },
            lArm:  { x: lArmX,  y: lArmY, w: p.armW, h: p.armTotalLen },
            rLeg:  { x: rLegX,  y: hipY, w: p.legW, h: p.legTotalLen },
            lLeg:  { x: lLegX,  y: hipY, w: p.legW, h: p.legTotalLen }
        };
    },

    _ucAdjustThreeQuarterLayoutDepth(layout, p, view, sideFacing = 'right') {
        const sign = this._ucThreeQuarterSign(view, sideFacing);
        if (!sign || !layout) return layout;
        return Object.fromEntries(
            Object.entries(layout).map(([key, part]) => [key, part ? { ...part } : part])
        );
    },

    _ucOrderThreeQuarterPartEntries(partEntries, view, sideFacing = 'right') {
        return this._ucOrderPartEntriesByCanonicalOrder(partEntries, view, sideFacing);
    },

    _ucApplyThreeQuarterHeadObjectPose(headObj, view, sideFacing = 'right') {
        const sign = this._ucThreeQuarterSign(view, sideFacing);
        if (!headObj || !sign) return false;
        headObj.pivotX = 0.5;
        headObj.pivotY = 0.92;
        headObj.tiltX = 0;
        if (view === 'back-3q' && sideFacing === 'right') {
            headObj.tiltY = -45;
            headObj.rotation = Number(headObj.rotation || 0);
            headObj._ucThreeQuarterHeadTurn = {
                view,
                sideFacing,
                tiltX: 0,
                tiltY: -45
            };
            return true;
        }
        headObj.tiltY = Utils.clamp(sign * 40, -45, 45);
        headObj.rotation = Number(headObj.rotation || 0);
        headObj._ucThreeQuarterHeadTurn = {
            view,
            sideFacing,
            tiltX: headObj.tiltX,
            tiltY: headObj.tiltY
        };
        return true;
    },

    _ucApplyThreeQuarterBodyTiltPose(createdParts, view, sideFacing = 'right') {
        const sign = this._ucThreeQuarterSign(view, sideFacing);
        if (!sign || !createdParts) return false;
        const torso = createdParts.torso || createdParts['torso'];
        const head = createdParts.head || createdParts['head'];
        if (view === 'back-3q' && sideFacing === 'right') {
            if (torso) {
                torso.pivotX = 0.5;
                torso.pivotY = 0.36;
                torso.tiltX = 0;
                torso.tiltY = -45;
                torso.rotation = Number(torso.rotation || 0);
                torso._ucThreeQuarterBodyTilt = {
                    view,
                    sideFacing,
                    tiltX: 0,
                    tiltY: -45
                };
                torso._armatureFrontBackFacing = 'back';
                torso._armatureFront3qLean = 'right';
                torso._ucBack3qReferencePosture = 'right';
            }
            if (head) {
                this._ucApplyThreeQuarterHeadObjectPose(head, view, sideFacing);
            }
            ['r-arm', 'l-arm', 'r-leg', 'l-leg'].forEach(key => {
                const part = createdParts[key];
                if (!part) return;
                part.tiltX = 0;
                part.tiltY = -45;
                if (part.pinnedTo && (part.pinRotationMode === 'inherit' || part.pinInheritRotation)) {
                    part.pinBaseTiltX = 0;
                    part.pinBaseTiltY = 0;
                }
            });
            return true;
        }
        if (torso) {
            torso.pivotX = 0.5;
            torso.pivotY = 0.36;
            torso.tiltX = 0;
            torso.tiltY = Utils.clamp(sign * 24, -45, 45);
            torso.rotation = Number(torso.rotation || 0);
            torso._ucThreeQuarterBodyTilt = {
                view,
                sideFacing,
                tiltX: torso.tiltX,
                tiltY: torso.tiltY
            };
        }
        if (head) {
            this._ucApplyThreeQuarterHeadObjectPose(head, view, sideFacing);
        }
        return true;
    },

    _ucComputeLayoutSide(p, centerX, topY) {
        const headX = centerX - p.headW / 2;
        const headY = topY;
        const headBottomY = headY + p.headH + p.neckH;
        const torsoX = centerX - p.torsoW / 2;
        const torsoY = headBottomY - p.neckH * 0.6;
        const shoulderY = torsoY + p.torsoH * 0.06;
        const hipY = torsoY + p.torsoH * 0.84;

        // Side view: front limbs offset toward the facing direction (lower x for left-facing),
        // back limbs offset away from the facing direction (higher x for left-facing).
        // "Front" = anatomically in front of the body (between body and facing direction).
        // "Back"  = anatomically behind the body (closer to the camera for left-facing).
        const armStagger = p.armW * 0.55;
        const legStagger = p.legW * 0.50;

        return {
            head:     { x: headX,                        y: headY,     w: p.headW, h: p.headH + p.neckH },
            torso:    { x: torsoX,                       y: torsoY,    w: p.torsoW, h: p.torsoH },
            frontArm: { x: centerX - p.armW * 0.5 - armStagger * 0.15, y: shoulderY, w: p.armW, h: p.armTotalLen },
            backArm:  { x: centerX - p.armW * 0.5 + armStagger * 0.15, y: shoulderY, w: p.armW, h: p.armTotalLen },
            frontLeg: { x: centerX - p.legW * 0.5 - legStagger * 0.2,  y: hipY,      w: p.legW, h: p.legTotalLen },
            backLeg:  { x: centerX - p.legW * 0.5 + legStagger * 0.2,  y: hipY,      w: p.legW, h: p.legTotalLen }
        };
    },

    _ucGetDefaultTopYForTorsoTop(p, centerX, view = 'front') {
        const targetTorsoY = 300;
        const layout = view === 'side'
            ? this._ucComputeLayoutSide(p, centerX, 0)
            : this._ucComputeLayout(p, centerX, 0);
        const torso = layout?.torso;
        if (!torso) return 0;
        return Math.round(targetTorsoY - torso.y);
    },

    _ucRenderPreviewCanvas(config = {}, maxWidth = 220, maxHeight = 260, previewOptions = {}) {
        const normalized = this._normalizeUniversalCharacterConfig(config);
        const options = previewOptions && typeof previewOptions === 'object' ? previewOptions : {};
        const previewFocus = options.focus === 'face' ? 'face' : 'full';
        const previewZoomRaw = parseFloat(options.zoom);
        const previewZoom = Math.max(1, Math.min(4, Number.isFinite(previewZoomRaw) ? previewZoomRaw : 1));
        const ageRatios = this._ucAgeRatios(normalized.ageGroup);
        const headUnit = normalized.height / ageRatios.totalHeads;
        const p = this._ucApplyBodyAngleToProportions(
            this._ucApplyQualityPresetToProportions(
                this._ucApplyHeadNeckStyleToProportions(
                    this._ucGetProportions(normalized.gender, normalized.bodyType, headUnit, ageRatios, normalized.view, normalized.build, normalized.weight, normalized.muscle, normalized.partScale, normalized.hip, normalized.shoulder, normalized.belly, normalized.bust),
                    normalized.headNeckStyle,
                    normalized.view
                ),
                normalized.qualityPreset,
                normalized.view,
                normalized
            ),
            normalized.bodyAngle,
            normalized.view,
            normalized.viewVariant,
            normalized.sideFacing
        );
        const drawCtx = this._ucBuildDrawContextFromConfig(normalized);
        drawCtx._ucPreviewStaticFeatures = true;
        const partDrawCtx = this._ucUseIntegratedGarmentParts?.(drawCtx)
            ? (this._ucBuildIntegratedGarmentPartsContext?.(drawCtx) || drawCtx)
            : drawCtx;

        const layout = normalized.view === 'side'
            ? this._ucComputeLayoutSide(p, 0, 0)
            : this._ucAdjustThreeQuarterLayoutDepth(
                this._ucComputeLayout(p, 0, 0),
                p,
                normalized.view,
                normalized.sideFacing
            );
        const frontBackGarmentRole = (rightLeftRole) => {
            if (!this._ucIsBackFamilyView(normalized.view)) return rightLeftRole;
            switch (rightLeftRole) {
                case 'right-arm': return 'left-arm';
                case 'left-arm': return 'right-arm';
                case 'right-leg': return 'left-leg';
                case 'left-leg': return 'right-leg';
                default: return rightLeftRole;
            }
        };
        const makeFrontBackPart = (key, garmentRoleKey) => {
            const layoutKey = key === 'r-arm' ? 'rArm'
                : key === 'l-arm' ? 'lArm'
                    : key === 'r-leg' ? 'rLeg'
                        : key === 'l-leg' ? 'lLeg'
                            : key;
            const canvas = key === 'r-arm' ? this._ucRenderArmCanvas(p, partDrawCtx, 'right')
                : key === 'l-arm' ? this._ucRenderArmCanvas(p, partDrawCtx, 'left')
                    : key === 'r-leg' ? this._ucRenderLegCanvas(p, partDrawCtx, 'right')
                        : key === 'l-leg' ? this._ucRenderLegCanvas(p, partDrawCtx, 'left')
                            : null;
            return {
                canvas,
                layout: layout[layoutKey],
                garmentRoleKey
            };
        };
        let parts = normalized.view === 'side'
            ? [
                { canvas: this._ucRenderLegCanvas(p, partDrawCtx, 'back'), layout: layout.backLeg, garmentRoleKey: 'back-leg' },
                { canvas: this._ucRenderArmCanvas(p, partDrawCtx, 'back'), layout: layout.backArm, garmentRoleKey: 'back-arm' },
                { canvas: this._ucRenderTorsoCanvas(p, partDrawCtx), layout: layout.torso, garmentRoleKey: 'torso' },
                { canvas: this._ucRenderHeadCanvas(p, drawCtx), layout: layout.head },
                { canvas: this._ucRenderLegCanvas(p, partDrawCtx, 'front'), layout: layout.frontLeg, garmentRoleKey: 'front-leg' },
                { canvas: this._ucRenderArmCanvas(p, partDrawCtx, 'front'), layout: layout.frontArm, garmentRoleKey: 'front-arm' }
            ]
            : this._ucOrderThreeQuarterPartEntries([
                ['r-leg', { canvas: this._ucRenderLegCanvas(p, partDrawCtx, 'right'), layout: layout.rLeg, garmentRoleKey: frontBackGarmentRole('right-leg') }],
                ['l-leg', { canvas: this._ucRenderLegCanvas(p, partDrawCtx, 'left'), layout: layout.lLeg, garmentRoleKey: frontBackGarmentRole('left-leg') }],
                ['torso', { canvas: this._ucRenderTorsoCanvas(p, partDrawCtx), layout: layout.torso, garmentRoleKey: 'torso' }],
                ['r-arm', { canvas: this._ucRenderArmCanvas(p, partDrawCtx, 'right'), layout: layout.rArm, garmentRoleKey: frontBackGarmentRole('right-arm') }],
                ['l-arm', { canvas: this._ucRenderArmCanvas(p, partDrawCtx, 'left'), layout: layout.lArm, garmentRoleKey: frontBackGarmentRole('left-arm') }],
                ['head', { canvas: this._ucRenderHeadCanvas(p, drawCtx), layout: layout.head }]
            ], normalized.view, normalized.sideFacing).map(([, part]) => part);
        parts = parts.filter(part => part?.canvas && part?.layout);
        if (this._ucUsePinnedGarments(drawCtx)) {
            if (this._ucIsAgbadaGarment(drawCtx) || this._ucIsWaistSkirtGarment?.(this._ucGetClothing(drawCtx))) {
                const robeSpec = this._ucBuildAgbadaRobeSpec(p, drawCtx, layout, normalized.view);
                if (robeSpec?.canvas && robeSpec?.layout) {
                    const isWaistSkirtPreview = this._ucIsWaistSkirtGarment?.(this._ucGetClothing(drawCtx));
                    const sleeveSpecs = isWaistSkirtPreview ? [] : (normalized.view === 'side'
                        ? [
                            this._ucBuildAgbadaSleeveSpec(p, drawCtx, layout.backArm, 'back', 'side'),
                            this._ucBuildAgbadaSleeveSpec(p, drawCtx, layout.frontArm, 'front', 'side')
                        ]
                        : [
                            this._ucBuildAgbadaSleeveSpec(p, drawCtx, layout.rArm, this._ucIsBackFamilyView(normalized.view) ? 'left' : 'right', normalized.view),
                            this._ucBuildAgbadaSleeveSpec(p, drawCtx, layout.lArm, this._ucIsBackFamilyView(normalized.view) ? 'right' : 'left', normalized.view)
                        ]);
                    const headParts = parts.filter(part => !part.garmentRoleKey);
                    const bodyParts = parts.filter(part => part.garmentRoleKey);
                    parts = [
                        ...bodyParts,
                        { canvas: robeSpec.canvas, layout: robeSpec.layout },
                        ...sleeveSpecs
                            .filter(spec => spec?.canvas && spec?.layout)
                            .map(spec => ({ canvas: spec.canvas, layout: spec.layout })),
                        ...headParts
                    ];
                }
            } else {
                const expanded = [];
                parts.forEach(part => {
                    expanded.push(part);
                    if (!part.garmentRoleKey) return;
                    const garmentCanvas = this._ucRenderPinnedGarmentCanvas(p, drawCtx, part.garmentRoleKey, part.canvas);
                    if (garmentCanvas) expanded.push({ canvas: garmentCanvas, layout: part.layout });
                });
                parts = expanded;
            }
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        parts.forEach(part => {
            minX = Math.min(minX, part.layout.x);
            minY = Math.min(minY, part.layout.y);
            maxX = Math.max(maxX, part.layout.x + part.layout.w);
            maxY = Math.max(maxY, part.layout.y + part.layout.h);
        });

        const out = document.createElement('canvas');
        out.width = maxWidth;
        out.height = maxHeight;
        const ctx = out.getContext('2d');
        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return out;
        }

        let cropMinX = minX;
        let cropMinY = minY;
        let cropMaxX = maxX;
        let cropMaxY = maxY;
        if (previewFocus === 'face' && layout?.head) {
            const head = layout.head;
            const padX = Math.max(head.w * 0.55, p.headW * 0.34, 1);
            const padTop = Math.max(head.h * 0.35, p.headH * 0.20, 1);
            const padBottom = Math.max(head.h * 0.42, p.neckH * 1.35, 1);
            cropMinX = head.x - padX;
            cropMaxX = head.x + head.w + padX;
            cropMinY = head.y - padTop;
            cropMaxY = head.y + head.h + padBottom;
        }
        if (previewZoom > 1) {
            const centerX = (cropMinX + cropMaxX) / 2;
            const centerY = previewFocus === 'face' && layout?.head
                ? layout.head.y + layout.head.h * 0.52
                : (cropMinY + cropMaxY) / 2;
            const zoomW = Math.max(1, (cropMaxX - cropMinX) / previewZoom);
            const zoomH = Math.max(1, (cropMaxY - cropMinY) / previewZoom);
            cropMinX = centerX - zoomW / 2;
            cropMaxX = centerX + zoomW / 2;
            cropMinY = centerY - zoomH / 2;
            cropMaxY = centerY + zoomH / 2;
        }

        minX = cropMinX;
        minY = cropMinY;
        maxX = cropMaxX;
        maxY = cropMaxY;

        const boundsW = Math.max(1, maxX - minX);
        const boundsH = Math.max(1, maxY - minY);
        const padding = 18;
        const scale = Math.min((maxWidth - padding * 2) / boundsW, (maxHeight - padding * 2) / boundsH);
        const finalScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

        const gradient = ctx.createLinearGradient(0, 0, 0, out.height);
        gradient.addColorStop(0, 'rgba(108,159,232,0.14)');
        gradient.addColorStop(1, 'rgba(15,23,42,0.02)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, out.width, out.height);

        ctx.save();
        if (normalized.view === 'side' && normalized.sideFacing === 'right') {
            ctx.translate(out.width, 0);
            ctx.scale(-1, 1);
        }
        const drawWidth = boundsW * finalScale;
        const drawHeight = boundsH * finalScale;
        const offsetX = (out.width - drawWidth) / 2;
        const offsetY = (out.height - drawHeight) / 2;
        ctx.translate(offsetX - minX * finalScale, offsetY - minY * finalScale);
        ctx.scale(finalScale, finalScale);

        if (previewFocus !== 'face') {
            ctx.fillStyle = 'rgba(15,23,42,0.08)';
            ctx.beginPath();
            ctx.ellipse((minX + maxX) / 2, maxY + p.footH * 0.15, boundsW * 0.30, p.footH * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        parts.forEach(part => {
            ctx.drawImage(part.canvas, part.layout.x, part.layout.y, part.layout.w, part.layout.h);
        });
        ctx.restore();

        return out;
    },

    // ════════════════════════════════════════════════════════════════
    //  Canvas Drawing: Head + Neck
    // ════════════════════════════════════════════════════════════════

    _ucRenderHeadCanvas(p, d) {
        const engine = this._ucResolveCharacterEngine(d);
        const drawData = { ...d, view: d?.view === 'back-3q' ? 'back' : d.view,
            _ucSeparateFacialFeatures: !d._ucPreviewStaticFeatures };
        const canvas = engine === 'advanced'
            ? this._ucDrawHeadAdvancedPhase1(p, drawData)
            : this._ucDrawHead(p, drawData);
        return this._ucApplyThreeQuarterHeadCue(canvas, p, d);
    },

    _ucRenderTorsoCanvas(p, d) {
        const engine = this._ucResolveCharacterEngine(d);
        const drawData = d?.view === 'back-3q' ? { ...d, view: 'back' } : d;
        const canvas = engine === 'advanced'
            ? this._ucDrawTorsoAdvancedPhase1(p, drawData)
            : this._ucDrawTorso(p, drawData);
        return this._ucApplyThreeQuarterTorsoCue(canvas, p, d);
    },

    _ucApplyThreeQuarterHeadCue(canvas, p, d) {
        if (!canvas || !this._ucIsThreeQuarterView(d?.view)) return canvas;
        const ctx = canvas.getContext('2d');
        const sign = this._ucThreeQuarterSign(d.view, d.sideFacing);
        const w = canvas.width;
        const headH = Math.max(1, p.headH || canvas.height);
        const source = document.createElement('canvas');
        source.width = w;
        source.height = headH;
        const sctx = source.getContext('2d');
        if (sctx) {
            sctx.drawImage(canvas, 0, 0, w, headH, 0, 0, w, headH);
            ctx.save();
            ctx.clearRect(0, 0, w, headH);
            ctx.translate(w / 2, headH * 0.52);
            ctx.transform(0.94, 0, sign * 0.08, 1, 0, 0);
            ctx.drawImage(source, -w / 2 + sign * w * 0.015, -headH * 0.52, w, headH);
            ctx.restore();
        }
        const farX = sign > 0 ? 0 : w;
        const nearX = sign > 0 ? w : 0;
        const shade = this._ucWithAlpha(this._ucShadeColor(d.skin || '#D2A07A', -0.18), 0.34);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const grad = ctx.createLinearGradient(farX, 0, nearX, 0);
        grad.addColorStop(0, shade);
        grad.addColorStop(0.38, this._ucWithAlpha(this._ucShadeColor(d.skin || '#D2A07A', -0.08), 0.12));
        grad.addColorStop(1, this._ucWithAlpha('#ffffff', 0.05));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, headH);
        ctx.restore();

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(d.skin || '#D2A07A', -0.24), 0.44);
        ctx.lineWidth = Math.max(0.75, (d.ow || 1.5) * 0.55);
        ctx.beginPath();
        const earX = sign > 0 ? w * 0.18 : w * 0.82;
        ctx.ellipse(earX, headH * 0.48, w * 0.055, headH * 0.115, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (d.view === 'front-3q') {
            const noseX = w * 0.5 + sign * w * 0.115;
            ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(d.skin || '#D2A07A', -0.34), 0.62);
            ctx.lineWidth = Math.max(0.9, (d.ow || 1.5) * 0.72);
            ctx.beginPath();
            ctx.moveTo(noseX - sign * w * 0.020, headH * 0.42);
            ctx.quadraticCurveTo(noseX + sign * w * 0.055, headH * 0.52, noseX + sign * w * 0.010, headH * 0.61);
            ctx.stroke();
            ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(d.outline || '#4A3728', -0.10), 0.24);
            ctx.lineWidth = Math.max(0.7, (d.ow || 1.5) * 0.45);
            ctx.beginPath();
            const cheekX = w * 0.5 + sign * w * 0.205;
            ctx.moveTo(cheekX, headH * 0.33);
            ctx.quadraticCurveTo(cheekX + sign * w * 0.070, headH * 0.55, cheekX - sign * w * 0.018, headH * 0.79);
            ctx.stroke();
        }
        ctx.restore();
        return canvas;
    },

    _ucApplyThreeQuarterTorsoCue(canvas, p, d) {
        return canvas;
    },

    _ucRenderArmCanvas(p, d, side) {
        const engine = this._ucResolveCharacterEngine(d);
        return engine === 'advanced'
            ? this._ucDrawArmAdvancedPhase1(p, d, side)
            : this._ucDrawArm(p, d, side);
    },

    _ucRenderLegCanvas(p, d, side) {
        const engine = this._ucResolveCharacterEngine(d);
        return engine === 'advanced'
            ? this._ucDrawLegAdvancedPhase1(p, d, side)
            : this._ucDrawLeg(p, d, side);
    },

    _ucDrawHeadAdvancedPhase1(p, d) {
        const w = Math.ceil(p.headW);
        const h = Math.ceil(p.headH + p.neckH);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        const cx = w / 2;
        const headRx = p.headW * 0.46;
        const headRy = p.headH * 0.44;
        const headCy = p.headH * 0.46;

        if (d.view === 'side') {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            this._ucDrawHeadSideAdvancedPhase2(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawNeckSideAdvancedPhase2(ctx, p, d, w, h, cx);
            ctx.restore();
        } else if (d.view === 'back') {
            this._ucDrawHeadBack(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawNeckBack(ctx, p, d, w, h, cx);
        } else {
            // Front and FS variants render the same head art; FS rotation is applied at the armature level
            this._ucDrawHeadFrontAdvancedPhase2(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawNeckFrontAdvancedPhase2(ctx, p, d, w, h, cx);
        }

        this._ucDrawHeadAccessories(ctx, p, d, w, h, cx);

        return c;
    },

    _ucDrawTorsoAdvancedPhase1(p, d) {
        const w = Math.ceil(p.torsoW);
        const h = Math.ceil(p.torsoH);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        if (d.view === 'side') {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            this._ucDrawTorsoSideAdvancedPhase2(ctx, p, d, w, h);
            ctx.restore();
        } else if (d.view === 'back') {
            this._ucDrawTorsoBack(ctx, p, d, w, h);
        } else {
            this._ucDrawTorsoFrontAdvancedPhase2(ctx, p, d, w, h);
        }
        return c;
    },

    _ucDrawArmAdvancedPhase1(p, d, side) {
        return this._ucDrawArm(p, d, side);
    },

    _ucDrawLegAdvancedPhase1(p, d, side) {
        return this._ucDrawLeg(p, d, side);
    },

    // _ucDrawHeadThreeQuarter removed — FS/BS variants no longer rendered.

    // _ucDrawNeckThreeQuarter removed — FS/BS variants no longer rendered.

    // _ucDrawArmThreeQuarter removed — FS/BS variants no longer rendered.

    // _ucDrawLegThreeQuarter removed — FS/BS variants no longer rendered.

    _ucDrawTorsoFrontAdvancedPhase2(ctx, p, d, w, h) {
        const cx = w / 2;
        const shoulderHW = p.shoulderW / 2;
        const waistHW = p.waistW / 2;
        const hipHW = p.hipW / 2;
        const neckBaseY = h * 0.02;
        const shoulderY = h * 0.08;
        const chestY = h * 0.30;
        const waistY = h * 0.55;
        const hipY = h * 0.80;
        const crotchY = h * 0.98;
        const isFemale = p.isFemale;
        const isMuscular = this._ucIsMuscularBodyType(d);
        const isOverweight = this._ucIsFullerBodyType(d);
        const bustDelta = (this._ucClampNum(d.bust, 0, 100, 50) - 50) / 50;
        const bustPositive = Math.max(0, bustDelta);
        const bustNegative = Math.max(0, -bustDelta);
        const bellyDelta = (this._ucClampNum(d.belly, 0, 100, 50) - 50) / 50;
        const bellyPositive = Math.max(0, bellyDelta);
        const chestHW = shoulderHW * (0.84 + bustPositive * (isFemale ? 0.03 : 0.08) - bustNegative * 0.08);
        const chestLiftY = chestY * (0.89 - bustPositive * (isFemale ? 0.015 : 0.06));
        const outline = new Path2D();

        outline.moveTo(cx - p.neckW * 0.54, neckBaseY);
        outline.quadraticCurveTo(cx - shoulderHW * 0.56, shoulderY * 0.48, cx - shoulderHW * 1.02, shoulderY);
        outline.quadraticCurveTo(cx - shoulderHW * 1.02, chestLiftY, cx - chestHW, chestY);
        outline.quadraticCurveTo(cx - chestHW, (chestY + waistY) * 0.52, cx - waistHW, waistY);
        const pregnancyLike = this._ucClampNum(d.belly, 0, 100, 50) >= 84;
        const bellyBulge = (p.bellyExtra || 0) * (1.90 + bellyPositive * 0.80);
        const bellyMidY = waistY + (hipY - waistY) * 0.38;
        outline.quadraticCurveTo(cx - waistHW * 0.92 - bellyBulge, bellyMidY, cx - hipHW, hipY);
        outline.lineTo(cx - hipHW * 0.24, crotchY);
        outline.quadraticCurveTo(cx, crotchY + h * 0.02, cx + hipHW * 0.24, crotchY);
        outline.lineTo(cx + hipHW, hipY);
        outline.quadraticCurveTo(cx + waistHW * 0.92 + bellyBulge, bellyMidY, cx + waistHW, waistY);
        outline.quadraticCurveTo(cx + chestHW, (chestY + waistY) * 0.52, cx + chestHW, chestY);
        outline.quadraticCurveTo(cx + shoulderHW * 1.02, chestLiftY, cx + shoulderHW * 1.02, shoulderY);
        outline.quadraticCurveTo(cx + shoulderHW * 0.56, shoulderY * 0.48, cx + p.neckW * 0.54, neckBaseY);
        outline.quadraticCurveTo(cx + p.neckW * 0.20, h * 0.035, cx, h * 0.028);
        outline.quadraticCurveTo(cx - p.neckW * 0.20, h * 0.035, cx - p.neckW * 0.54, neckBaseY);
        outline.closePath();

        const skinGrad = ctx.createLinearGradient(cx, neckBaseY, cx, crotchY);
        skinGrad.addColorStop(0, this._ucShadeColor(d.skin, 0.10));
        skinGrad.addColorStop(0.30, this._ucShadeColor(d.skin, 0.03));
        skinGrad.addColorStop(0.65, d.skin);
        skinGrad.addColorStop(1, this._ucShadeColor(d.skin, -0.10));
        ctx.fillStyle = skinGrad;
        ctx.fill(outline);

        ctx.save();
        ctx.clip(outline);
        const volumeGrad = ctx.createLinearGradient(cx - shoulderHW, chestY, cx + shoulderHW, hipY);
        volumeGrad.addColorStop(0, 'rgba(0,0,0,0.14)');
        volumeGrad.addColorStop(0.18, 'rgba(255,255,255,0.06)');
        volumeGrad.addColorStop(0.50, 'rgba(255,255,255,0.10)');
        volumeGrad.addColorStop(0.82, 'rgba(0,0,0,0.05)');
        volumeGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = volumeGrad;
        ctx.fillRect(cx - shoulderHW * 1.2, shoulderY, shoulderHW * 2.4, hipY - shoulderY + h * 0.12);

        if (isFemale) {
            const breastAmount = this._ucClampNum(d.bust, 0, 100, 50) / 100;
            const breastRx = shoulderHW * (0.18 + breastAmount * 0.34);
            const breastRy = h * (0.038 + breastAmount * 0.074);
            const breastOffsetX = shoulderHW * (0.22 + breastAmount * 0.12);
            const breastY = chestY * (0.70 + breastAmount * 0.08);
            const skinShadow = this._ucShadeColor(d.skin, -0.13);
            const skinHighlight = this._ucShadeColor(d.skin, 0.12);
            [-1, 1].forEach(side => {
                const bx = cx + side * breastOffsetX;
                const grad = ctx.createRadialGradient(
                    bx - side * breastRx * 0.22,
                    breastY - breastRy * 0.36,
                    Math.max(1, breastRx * 0.10),
                    bx,
                    breastY,
                    breastRx * 1.18
                );
                grad.addColorStop(0, this._ucWithAlpha(skinHighlight, 0.44));
                grad.addColorStop(0.50, this._ucWithAlpha(d.skin, 0.20));
                grad.addColorStop(1, this._ucWithAlpha(skinShadow, 0.08));
                ctx.globalAlpha = 0.34 + breastAmount * 0.18;
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(bx, breastY, breastRx, breastRy, side * 0.07, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        if (isOverweight || Math.abs(bellyDelta) > 0.08) {
            ctx.fillStyle = `rgba(0,0,0,${0.035 + bellyPositive * 0.055})`;
            ctx.beginPath();
            ctx.ellipse(cx, waistY + h * (0.03 + bellyPositive * 0.055), waistHW * (0.58 + bellyPositive * 0.42), h * (0.075 + bellyPositive * 0.095), 0, 0, Math.PI * 2);
            ctx.fill();
            if (pregnancyLike) {
                const bumpGrad = ctx.createRadialGradient(cx - waistHW * 0.18, waistY + h * 0.12, h * 0.02, cx, waistY + h * 0.13, h * 0.26);
                bumpGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
                bumpGrad.addColorStop(0.58, 'rgba(255,255,255,0.05)');
                bumpGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
                ctx.fillStyle = bumpGrad;
                ctx.beginPath();
                ctx.ellipse(cx, waistY + h * 0.13, waistHW * 0.92, h * 0.18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        this._ucApplyTorsoClothing(ctx, p, d, w, h, 'front');
        this._ucApplyTorsoOutfitDetails(ctx, p, d, w, h, 'front');
        if (this._ucUseIntegratedGarmentParts?.(d)) return;

        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.stroke(outline);
        this._ucDrawHumanLikeTorsoDetails(ctx, p, d, w, h, 'front');

        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
        ctx.lineWidth = d.ow * 0.60;
        ctx.globalAlpha = 0.34;

        ctx.beginPath();
        ctx.moveTo(cx - p.neckW * 0.32, neckBaseY + h * 0.03);
        ctx.quadraticCurveTo(cx - shoulderHW * 0.10, h * 0.12, cx - shoulderHW * 0.28, chestY * 0.72);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + p.neckW * 0.32, neckBaseY + h * 0.03);
        ctx.quadraticCurveTo(cx + shoulderHW * 0.10, h * 0.12, cx + shoulderHW * 0.28, chestY * 0.72);
        ctx.stroke();

        if (isMuscular) {
            ctx.beginPath();
            ctx.moveTo(cx - shoulderHW * 0.62, chestY * 0.84);
            ctx.quadraticCurveTo(cx - shoulderHW * 0.18, chestY * 0.58, cx, chestY * 0.88);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + shoulderHW * 0.62, chestY * 0.84);
            ctx.quadraticCurveTo(cx + shoulderHW * 0.18, chestY * 0.58, cx, chestY * 0.88);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - waistHW * 0.90, waistY * 0.98);
            ctx.quadraticCurveTo(cx - waistHW * 0.24, waistY * 0.72, cx - hipHW * 0.24, hipY * 0.76);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + waistHW * 0.90, waistY * 0.98);
            ctx.quadraticCurveTo(cx + waistHW * 0.24, waistY * 0.72, cx + hipHW * 0.24, hipY * 0.76);
            ctx.stroke();
        } else if (isFemale) {
            ctx.beginPath();
            ctx.moveTo(cx - waistHW * 0.74, waistY * 0.96);
            ctx.quadraticCurveTo(cx - waistHW * 0.28, waistY * 0.82, cx, waistY * 1.00);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + waistHW * 0.74, waistY * 0.96);
            ctx.quadraticCurveTo(cx + waistHW * 0.28, waistY * 0.82, cx, waistY * 1.00);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx, shoulderY + h * 0.04);
        ctx.lineTo(cx, hipY * 0.86);
        ctx.stroke();

        if (isOverweight) {
            ctx.beginPath();
            ctx.arc(cx, waistY + h * 0.02, waistHW * 0.72, 0.28, Math.PI - 0.28);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    _ucDrawTorsoSideAdvancedPhase2(ctx, p, d, w, h) {
        const cx = w / 2;
        const isFemale = p.isFemale;
        const isOverweight = this._ucIsFullerBodyType(d);
        const isMuscular = this._ucIsMuscularBodyType(d);
        const bustDelta = (this._ucClampNum(d.bust, 0, 100, 50) - 50) / 50;
        const bustPositive = Math.max(0, bustDelta);
        const bustNegative = Math.max(0, -bustDelta);
        const bellyDelta = (this._ucClampNum(d.belly, 0, 100, 50) - 50) / 50;
        const bellyPositive = Math.max(0, bellyDelta);
        const neckBaseY = h * 0.02;
        const shoulderY = h * 0.08;
        const chestPeakY = h * 0.24;
        const underBustY = h * 0.33;
        const waistY = h * 0.52;
        const hipTopY = h * 0.68;
        const buttPeakY = h * 0.76;
        const hipY = h * 0.82;
        const crotchY = h * 0.96;
        const depth = p.shoulderW;
        const chestFront = cx + depth * (0.44 + bustPositive * (isFemale ? 0.08 : 0.07) - bustNegative * 0.05);
        const waistFront = cx + depth * (isFemale ? 0.28 : 0.32);
        const pregnancyLike = this._ucClampNum(d.belly, 0, 100, 50) >= 84;
        const bellyFront = waistFront + (p.bellyExtra || 0) * (1.00 + bellyPositive * 0.62);
        const hipFront = cx + depth * (isFemale ? 0.32 : 0.30);
        const crotchFront = cx + depth * 0.18;
        const shoulderBack = cx - depth * 0.42;
        const scapBack = cx - depth * 0.38;
        const lowerBack = cx - depth * 0.28;
        const buttBack = cx - depth * (isFemale ? 0.48 : 0.40);
        const crotchBack = cx - depth * 0.15;
        const outline = new Path2D();

        outline.moveTo(cx + p.neckW * 0.18, neckBaseY);
        outline.quadraticCurveTo(chestFront - depth * 0.12, shoulderY * 0.7, chestFront * 0.97, shoulderY);
        outline.quadraticCurveTo(chestFront * 1.01, shoulderY + (chestPeakY - shoulderY) * (0.45 - bustPositive * 0.05), chestFront, chestPeakY);
        if (isFemale) {
            outline.quadraticCurveTo(chestFront + depth * (0.05 + bustPositive * 0.18), underBustY * (0.88 - bustPositive * 0.04), chestFront * (0.94 - bustPositive * 0.015), underBustY);
            outline.quadraticCurveTo(bellyFront + depth * 0.05, (underBustY + waistY) * 0.5, bellyFront, waistY);
        } else {
            outline.quadraticCurveTo(chestFront * 0.99, (chestPeakY + waistY) * 0.5, bellyFront, waistY);
        }
        outline.quadraticCurveTo(hipFront + depth * 0.02, (waistY + hipTopY) * 0.5, hipFront, hipTopY);
        outline.quadraticCurveTo(hipFront * 0.94, hipY, crotchFront, crotchY);
        outline.lineTo(crotchBack, crotchY);
        outline.quadraticCurveTo(buttBack, crotchY * 0.96, buttBack, buttPeakY);
        outline.quadraticCurveTo(buttBack + depth * 0.02, (buttPeakY + waistY) * 0.52, lowerBack, waistY);
        outline.quadraticCurveTo(scapBack - depth * 0.01, (waistY + chestPeakY) * 0.5, scapBack, chestPeakY);
        outline.quadraticCurveTo(shoulderBack - depth * 0.01, (chestPeakY + shoulderY) * 0.5, shoulderBack, shoulderY);
        outline.quadraticCurveTo(shoulderBack + depth * 0.15, shoulderY * 0.45, cx - p.neckW * 0.18, neckBaseY);
        outline.closePath();

        const skinGrad = ctx.createLinearGradient(shoulderBack, neckBaseY, chestFront, crotchY);
        skinGrad.addColorStop(0, this._ucShadeColor(d.skin, -0.02));
        skinGrad.addColorStop(0.36, this._ucShadeColor(d.skin, 0.08));
        skinGrad.addColorStop(0.68, d.skin);
        skinGrad.addColorStop(1, this._ucShadeColor(d.skin, -0.12));
        ctx.fillStyle = skinGrad;
        ctx.fill(outline);

        ctx.save();
        ctx.clip(outline);
        const planeGrad = ctx.createLinearGradient(shoulderBack, chestPeakY, chestFront, hipY);
        planeGrad.addColorStop(0, 'rgba(0,0,0,0.14)');
        planeGrad.addColorStop(0.34, 'rgba(255,255,255,0.05)');
        planeGrad.addColorStop(0.62, 'rgba(255,255,255,0.10)');
        planeGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = planeGrad;
        ctx.fillRect(shoulderBack - depth * 0.2, shoulderY, depth * 1.7, crotchY - shoulderY + h * 0.08);

        if (isFemale) {
            ctx.globalAlpha = 0.28 + bustPositive * 0.30;
            ctx.fillStyle = '#E49A95';
            ctx.beginPath();
            ctx.ellipse(cx + depth * (0.18 + bustPositive * 0.08), chestPeakY + h * (0.038 + bustPositive * 0.014), depth * (0.12 + bustPositive * 0.12), h * (0.080 + bustPositive * 0.075), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (isOverweight || Math.abs(bellyDelta) > 0.08) {
            ctx.fillStyle = `rgba(0,0,0,${0.035 + bellyPositive * 0.065})`;
            ctx.beginPath();
            ctx.ellipse(cx + depth * (0.10 + bellyPositive * 0.13), waistY + h * (0.03 + bellyPositive * 0.05), depth * (0.16 + bellyPositive * 0.22), h * (0.09 + bellyPositive * 0.105), 0, 0, Math.PI * 2);
            ctx.fill();
            if (pregnancyLike) {
                const bumpGrad = ctx.createRadialGradient(cx + depth * 0.12, waistY + h * 0.10, h * 0.02, cx + depth * 0.28, waistY + h * 0.10, h * 0.28);
                bumpGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
                bumpGrad.addColorStop(0.55, 'rgba(255,255,255,0.04)');
                bumpGrad.addColorStop(1, 'rgba(0,0,0,0.09)');
                ctx.fillStyle = bumpGrad;
                ctx.beginPath();
                ctx.ellipse(cx + depth * 0.25, waistY + h * 0.12, depth * 0.30, h * 0.20, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        this._ucApplyTorsoClothing(ctx, p, d, w, h, 'side');
        this._ucApplyTorsoOutfitDetails(ctx, p, d, w, h, 'side');

        if (this._ucUseIntegratedGarmentParts?.(d)) return;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.stroke(outline);
        this._ucDrawHumanLikeTorsoDetails(ctx, p, d, w, h, 'side');

        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
        ctx.lineWidth = d.ow * 0.56;
        ctx.globalAlpha = 0.34;
        ctx.beginPath();
        ctx.moveTo(shoulderBack + depth * 0.06, shoulderY + h * 0.01);
        ctx.quadraticCurveTo(scapBack + depth * 0.04, chestPeakY, scapBack + depth * 0.02, waistY);
        ctx.quadraticCurveTo(lowerBack + depth * 0.03, (waistY + buttPeakY) * 0.5, buttBack + depth * 0.12, hipY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + depth * 0.08, chestPeakY + h * 0.03);
        ctx.quadraticCurveTo(cx + depth * 0.18, waistY * 0.88, cx + depth * 0.10, hipTopY);
        ctx.stroke();

        if (isMuscular) {
            ctx.beginPath();
            ctx.moveTo(cx + depth * 0.04, chestPeakY - h * 0.01);
            ctx.quadraticCurveTo(cx + depth * 0.20, chestPeakY + h * 0.04, cx + depth * 0.12, underBustY + h * 0.02);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    _ucDrawHeadFrontAdvancedPhase2(ctx, p, d, w, h, cx, headRx, headRy, headCy) {
        const isFemale = d.gender === 'female';
        const isChild = d.ageGroup === 'neonate' || d.ageGroup === 'child';
        const isElderly = d.ageGroup === 'elderly';
        const humanLike = this._ucIsHumanLikeQuality(d.qualityPreset);
        const headProfile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const hairProfile = this._ucGetHairSilhouetteProfile(hairStyle, d);
        const jawCtrl = this._ucClampNum(d.jawScale, 70, 140, 100) / 100;
        const chinCtrl = this._ucClampNum(d.chinScale, 70, 140, 100) / 100;
        const cheekCtrl = this._ucClampNum(d.cheekScale, 70, 140, 100) / 100;
        const foreheadCtrl = this._ucClampNum(d.foreheadScale, 70, 140, 100) / 100;
        const lipCtrl = this._ucClampNum(d.lipScale, 70, 150, 100) / 100;
        const bridgeCtrl = this._ucClampNum(d.noseBridgeScale, 70, 150, 100) / 100;
        const detailStrength = this._ucClampNum(d.humanLikeStrength, 0, 100, 60) / 100;
        const faceDetail = humanLike ? (0.75 + detailStrength * 0.45) : 1;
        const jawY = p.headH * (isChild ? 0.70 : (humanLike ? 0.755 : 0.73));
        const chinY = p.headH * (isChild ? 0.91 : (humanLike ? 0.965 : 0.94)) * (1 + (chinCtrl - 1) * 0.055);
        const templeY = p.headH * (humanLike ? 0.255 : 0.24) * (1 + (foreheadCtrl - 1) * 0.10);
        const cheekY = p.headH * (humanLike ? 0.600 : 0.58) * (1 + (cheekCtrl - 1) * 0.035);
        const jawHW = headRx * (isFemale ? (humanLike ? 0.62 : 0.70) : (humanLike ? 0.72 : 0.80)) * headProfile.jawWidthMult * jawCtrl;
        const chinHW = headRx * (isFemale ? (humanLike ? 0.11 : 0.15) : (humanLike ? 0.17 : 0.23)) * headProfile.chinWidthMult * (0.85 + chinCtrl * 0.15);
        const skullHW = headRx * (humanLike ? 0.94 : 1.00) * headProfile.headWidthMult * (0.96 + foreheadCtrl * 0.04);
        const skinShadow = this._ucShadeColor(d.skin, -0.14);
        const skinMid = this._ucShadeColor(d.skin, -0.04);
        const skinHighlight = this._ucShadeColor(d.skin, 0.10);
        const frontNoseSize = this._ucClampNum(d.frontNoseScale, 60, 160, 100) / 100;
        const frontMouthSize = this._ucClampNum(d.frontMouthScale, 60, 160, 100) / 100;
        const eyeSize = this._ucClampNum(d.eyeScale, 60, 140, 100) / 100;
        const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);

        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            const hairBack = ctx.createLinearGradient(cx, 0, cx, p.headH * 0.62);
            hairBack.addColorStop(0, this._ucShadeColor(d.hair, 0.04));
            hairBack.addColorStop(1, this._ucShadeColor(d.hair, -0.16));
            ctx.fillStyle = hairBack;
            ctx.beginPath();
            ctx.moveTo(cx - skullHW * (0.92 + hairProfile.volume * 0.10), templeY + p.headH * (0.07 + hairProfile.frontDrop * 0.012));
            ctx.quadraticCurveTo(cx - skullHW * (0.98 + hairProfile.volume * 0.18), p.headH * (0.07 - hairProfile.height * 0.015), cx + skullHW * hairProfile.partBias, p.headH * (0.035 - hairProfile.height * 0.018));
            ctx.quadraticCurveTo(cx + skullHW * (0.98 + hairProfile.volume * 0.18), p.headH * (0.07 - hairProfile.height * 0.015), cx + skullHW * (0.92 + hairProfile.volume * 0.10), templeY + p.headH * (0.07 + hairProfile.frontDrop * 0.012));
            ctx.quadraticCurveTo(cx + skullHW * (0.86 + hairProfile.backDepth * 0.12), cheekY + p.headH * (hairProfile.frontDrop - 1) * 0.035, cx + jawHW * (0.82 + hairProfile.backDepth * 0.14), jawY + p.headH * (0.03 + hairProfile.backDepth * 0.03));
            ctx.quadraticCurveTo(cx, chinY * (0.94 + hairProfile.backDepth * 0.025), cx - jawHW * (0.82 + hairProfile.backDepth * 0.14), jawY + p.headH * (0.03 + hairProfile.backDepth * 0.03));
            ctx.quadraticCurveTo(cx - skullHW * (0.86 + hairProfile.backDepth * 0.12), cheekY + p.headH * (hairProfile.frontDrop - 1) * 0.035, cx - skullHW * (0.92 + hairProfile.volume * 0.10), templeY + p.headH * (0.07 + hairProfile.frontDrop * 0.012));
            ctx.closePath();
            ctx.fill();
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - skullHW * 0.92, templeY + p.headH * 0.03);
        ctx.quadraticCurveTo(cx - skullHW * 1.00, p.headH * 0.08, cx - skullHW * 0.94, p.headH * 0.20);
        ctx.quadraticCurveTo(cx - skullHW * 0.98, cheekY, cx - jawHW, jawY);
        ctx.quadraticCurveTo(cx - chinHW * 1.10, chinY * 0.98, cx, chinY);
        ctx.quadraticCurveTo(cx + chinHW * 1.10, chinY * 0.98, cx + jawHW, jawY);
        ctx.quadraticCurveTo(cx + skullHW * 0.98, cheekY, cx + skullHW * 0.94, p.headH * 0.20);
        ctx.quadraticCurveTo(cx + skullHW * 1.00, p.headH * 0.08, cx + skullHW * 0.92, templeY + p.headH * 0.03);
        ctx.quadraticCurveTo(cx + skullHW * 0.56, p.headH * 0.01, cx, p.headH * 0.015);
        ctx.quadraticCurveTo(cx - skullHW * 0.56, p.headH * 0.01, cx - skullHW * 0.92, templeY + p.headH * 0.03);
        ctx.closePath();

        const faceGrad = ctx.createLinearGradient(cx, p.headH * 0.02, cx, chinY);
        faceGrad.addColorStop(0, skinHighlight);
        faceGrad.addColorStop(0.52, d.skin);
        faceGrad.addColorStop(1, skinMid);
        ctx.fillStyle = faceGrad;
        ctx.fill();

        const sideShade = ctx.createLinearGradient(cx - skullHW, p.headH * 0.16, cx + skullHW, chinY);
            sideShade.addColorStop(0, `rgba(0,0,0,${0.10 * faceDetail})`);
        sideShade.addColorStop(0.18, 'rgba(0,0,0,0.05)');
        sideShade.addColorStop(0.42, 'rgba(255,255,255,0.08)');
        sideShade.addColorStop(0.60, 'rgba(255,255,255,0.08)');
        sideShade.addColorStop(0.82, 'rgba(0,0,0,0.05)');
            sideShade.addColorStop(1, `rgba(0,0,0,${0.09 * faceDetail})`);
        ctx.fillStyle = sideShade;
        ctx.fill();

        // Stroke the face outline NOW, while the face path is still current
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.stroke();

        ctx.globalAlpha = 0.10 + Math.max(0, cheekCtrl - 1) * 0.10;
        ctx.fillStyle = '#D98787';
        ctx.beginPath();
        ctx.ellipse(cx - skullHW * 0.44, cheekY + p.headH * 0.05, headRx * 0.16, headRy * 0.10, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + skullHW * 0.44, cheekY + p.headH * 0.05, headRx * 0.16, headRy * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            ctx.save();
            const hairFront = ctx.createLinearGradient(cx, 0, cx, p.headH * 0.60);
            hairFront.addColorStop(0, this._ucShadeColor(d.hair, 0.06));
            hairFront.addColorStop(1, this._ucShadeColor(d.hair, -0.12));
            ctx.fillStyle = hairFront;
            ctx.beginPath();
            ctx.moveTo(cx - skullHW * (0.88 + hairProfile.volume * 0.08), p.headH * (0.30 + hairProfile.frontDrop * 0.035));
            ctx.quadraticCurveTo(cx - skullHW * (0.90 + hairProfile.volume * 0.15), p.headH * (0.12 - hairProfile.height * 0.018), cx - skullHW * (0.62 + hairProfile.partBias * 0.14), p.headH * (0.075 - hairProfile.height * 0.025));
            ctx.quadraticCurveTo(cx - skullHW * (0.18 - hairProfile.partBias * 0.18), p.headH * (0.012 - hairProfile.height * 0.018), cx + skullHW * (0.10 + hairProfile.partBias * 0.26), p.headH * (0.055 - hairProfile.height * 0.012));
            ctx.quadraticCurveTo(cx + skullHW * (0.55 + hairProfile.partBias * 0.10), p.headH * (0.018 - hairProfile.height * 0.012), cx + skullHW * (0.86 + hairProfile.volume * 0.08), p.headH * (0.22 + hairProfile.frontDrop * 0.045));
            ctx.quadraticCurveTo(cx + skullHW * (0.72 + hairProfile.volume * 0.04), p.headH * (0.28 + hairProfile.frontDrop * 0.04), cx + skullHW * (0.50 + hairProfile.partBias * 0.12), p.headH * (0.29 + hairProfile.frontDrop * 0.045));
            ctx.quadraticCurveTo(cx + skullHW * (0.15 + hairProfile.partBias * 0.18), p.headH * (0.15 + hairProfile.frontDrop * 0.035), cx - skullHW * (0.08 - hairProfile.partBias * 0.12), p.headH * (0.20 + hairProfile.frontDrop * 0.035));
            ctx.quadraticCurveTo(cx - skullHW * (0.36 - hairProfile.partBias * 0.08), p.headH * (0.19 + hairProfile.frontDrop * 0.035), cx - skullHW * (0.58 + hairProfile.volume * 0.06), p.headH * (0.29 + hairProfile.frontDrop * 0.035));
            ctx.closePath();
            ctx.fill();
            this._ucDrawHairlineVariation(ctx, p, d, cx, headRx, p.headH * 0.24);

            ctx.strokeStyle = this._ucShadeColor(d.hair, -0.18);
            ctx.lineWidth = d.ow * 0.55;
            ctx.globalAlpha = 0.35;
            for (let i = -2; i <= 2; i++) {
                const strandX = cx + i * skullHW * 0.24;
                ctx.beginPath();
                ctx.moveTo(strandX, p.headH * 0.08 + Math.abs(i) * p.headH * 0.01);
                ctx.quadraticCurveTo(strandX + i * skullHW * 0.10, p.headH * 0.18, strandX - i * skullHW * 0.06, p.headH * 0.34);
                ctx.stroke();
            }
            ctx.restore();
            this._ucDrawHairSheen(ctx, p, d.hair, cx, p.headH * 0.05, headRx);
            this._ucDrawHairStyleAccent(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawHumanLikeHairTexture(ctx, p, d, cx, headRx, headRy, headCy);
        }

        const earY = p.headH * 0.46;
        const earH = headRx * 0.28;
        const earW = headRx * 0.13;
        [cx - skullHW * 0.95, cx + skullHW * 0.95].forEach(ex => {
            ctx.fillStyle = this._ucShadeColor(d.skin, -0.01);
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow * 0.95;
            ctx.beginPath();
            ctx.ellipse(ex, earY, earW, earH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
            ctx.lineWidth = d.ow * 0.45;
            ctx.beginPath();
            ctx.moveTo(ex, earY - earH * 0.40);
            ctx.quadraticCurveTo(ex - earW * 0.12, earY, ex + earW * 0.08, earY + earH * 0.30);
            ctx.stroke();
        });

        const eyeY = p.headH * (humanLike ? 0.435 : 0.45);
        const eyeSpacing = skullHW * (humanLike ? 0.465 : 0.50);
        const eyeW = headRx * (humanLike ? 0.205 : 0.25) * eyeSize * eyeTypeProfile.width;
        const eyeH = headRx * (humanLike ? 0.092 : 0.12) * eyeSize * eyeTypeProfile.height;
        const sclera = this._ucGetScleraColor(d);
        const socketShadow = this._ucDeriveSocketShadow(d.skin);
        const irisColor = this._ucGetEyeColor(d);
        const irisShade = this._ucShadeColor(irisColor, -0.18);
        const irisLight = this._ucShadeColor(irisColor, 0.14);
        if (!d._ucSeparateFacialFeatures) {
        [cx - eyeSpacing, cx + eyeSpacing].forEach((ex, index) => {
            const inner = index === 0 ? 1 : -1; // toward the nose
            // Eye-white (almond) path — reused as a clip so the iris/lid stay inside.
            const eyePath = new Path2D();
            eyePath.moveTo(ex - eyeW, eyeY);
            eyePath.quadraticCurveTo(ex - eyeW * 0.22, eyeY - eyeH * eyeTypeProfile.upper, ex, eyeY - eyeH * 0.72 * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop);
            eyePath.quadraticCurveTo(ex + eyeW * 0.26, eyeY - eyeH * 1.02 * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop, ex + eyeW, eyeY);
            eyePath.quadraticCurveTo(ex + eyeW * 0.20, eyeY + eyeH * 0.82 * eyeTypeProfile.lower, ex, eyeY + eyeH * 0.62 * eyeTypeProfile.lower);
            eyePath.quadraticCurveTo(ex - eyeW * 0.24, eyeY + eyeH * 0.86 * eyeTypeProfile.lower, ex - eyeW, eyeY);
            eyePath.closePath();

            ctx.fillStyle = sclera;
            ctx.fill(eyePath);

            // Iris + pupil, clipped to the eye-white and partly hidden by the
            // upper lid (humans rarely show the full iris circle).
            ctx.save();
            ctx.clip(eyePath);
            const irisCy = eyeY + eyeH * 0.20;
            const irisR = eyeH * 0.92 * eyeTypeProfile.iris;
            const irisGrad = ctx.createRadialGradient(ex - irisR * 0.25, irisCy - irisR * 0.25, irisR * 0.2, ex, irisCy, irisR);
            irisGrad.addColorStop(0, irisLight);
            irisGrad.addColorStop(0.7, irisColor);
            irisGrad.addColorStop(1, irisShade);
            ctx.fillStyle = irisGrad;
            ctx.beginPath();
            ctx.arc(ex, irisCy, irisR, 0, Math.PI * 2);
            ctx.fill();
            // Limbal ring for definition.
            ctx.strokeStyle = irisShade;
            ctx.lineWidth = d.ow * 0.4;
            ctx.beginPath();
            ctx.arc(ex, irisCy, irisR * 0.96, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#141414';
            ctx.beginPath();
            ctx.arc(ex, irisCy, irisR * 0.44, 0, Math.PI * 2);
            ctx.fill();
            // Catch-light.
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.arc(ex - irisR * 0.30, irisCy - irisR * 0.34, irisR * 0.18, 0, Math.PI * 2);
            ctx.fill();
            // Upper-lid soft shadow across the top of the eye-white.
            const lidShade = ctx.createLinearGradient(ex, eyeY - eyeH * 1.1, ex, eyeY + eyeH * 0.2);
            lidShade.addColorStop(0, this._ucWithAlpha(socketShadow, 0.42));
            lidShade.addColorStop(1, this._ucWithAlpha(socketShadow, 0));
            ctx.fillStyle = lidShade;
            ctx.fill(eyePath);
            ctx.restore();

            // Upper lash line (defines the lid), heavier than the rest of the rim.
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow * 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ex - eyeW, eyeY);
            ctx.quadraticCurveTo(ex - eyeW * 0.22, eyeY - eyeH * eyeTypeProfile.upper, ex, eyeY - eyeH * 0.72 * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop);
            ctx.quadraticCurveTo(ex + eyeW * 0.26, eyeY - eyeH * 1.02 * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop, ex + eyeW, eyeY);
            ctx.stroke();
            // Lighter lower lid.
            ctx.strokeStyle = this._ucWithAlpha(socketShadow, 0.55);
            ctx.lineWidth = d.ow * 0.42;
            ctx.beginPath();
            ctx.moveTo(ex - eyeW * 0.9, eyeY + eyeH * 0.05);
            ctx.quadraticCurveTo(ex, eyeY + eyeH * 0.78, ex + eyeW * 0.9, eyeY + eyeH * 0.02);
            ctx.stroke();
            // Upper-lid crease.
            ctx.strokeStyle = this._ucWithAlpha(socketShadow, 0.4);
            ctx.lineWidth = d.ow * 0.4;
            ctx.beginPath();
            ctx.moveTo(ex - eyeW * 0.86, eyeY - eyeH * 1.0);
            ctx.quadraticCurveTo(ex, eyeY - eyeH * 1.7, ex + eyeW * 0.86, eyeY - eyeH * 0.95);
            ctx.stroke();
            // Tear duct at the inner corner.
            ctx.fillStyle = this._ucWithAlpha(this._ucDeriveLipColor(d.skin), 0.5);
            ctx.beginPath();
            ctx.arc(ex + inner * eyeW * 0.9, eyeY + eyeH * 0.08, eyeH * 0.14, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = d.hair;
        ctx.lineWidth = d.ow * 1.7;
        ctx.lineCap = 'round';
        const browProfile = this._ucGetBrowProfile(d);
        [cx - eyeSpacing, cx + eyeSpacing].forEach((ex, index) => {
            const dir = index === 0 ? -1 : 1;
            this._ucDrawBrowShape(ctx, d, ex, eyeY, eyeW, eyeH, dir, browProfile, isElderly);
        });
        }

        const noseBridgeY = p.headH * (humanLike ? 0.485 : 0.50) * (1 - (bridgeCtrl - 1) * 0.035);
        const noseMidY = p.headH * (humanLike ? 0.595 : 0.59);
        const noseTipY = p.headH * (humanLike ? 0.655 : 0.64);
        const noseW = headRx * (humanLike ? 0.185 : 0.16) * frontNoseSize * (0.94 + bridgeCtrl * 0.06);
        // Soft form shadow down the nose's shadow side + under the tip.
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.55);
        ctx.lineCap = 'round';
        ctx.lineWidth = d.ow * (0.38 + bridgeCtrl * 0.16);
        ctx.beginPath();
        ctx.moveTo(cx - noseW * 0.18, noseBridgeY);
        ctx.quadraticCurveTo(cx - noseW * 0.5, noseMidY, cx - noseW * 0.42, noseTipY);
        ctx.stroke();
        // Tip highlight.
        ctx.fillStyle = this._ucWithAlpha(skinHighlight, 0.7);
        ctx.beginPath();
        ctx.ellipse(cx + noseW * 0.08, noseTipY - p.headH * 0.005, noseW * 0.30, noseW * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        // Nostril wings + nostril shadows.
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.7);
        ctx.lineWidth = d.ow * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - noseW * 0.5, noseTipY);
        ctx.quadraticCurveTo(cx - noseW * 0.72, noseTipY + p.headH * 0.02, cx - noseW * 0.34, noseTipY + p.headH * 0.025);
        ctx.moveTo(cx + noseW * 0.5, noseTipY);
        ctx.quadraticCurveTo(cx + noseW * 0.72, noseTipY + p.headH * 0.02, cx + noseW * 0.34, noseTipY + p.headH * 0.025);
        ctx.stroke();
        ctx.fillStyle = this._ucWithAlpha(skinShadow, 0.55);
        ctx.beginPath();
        ctx.ellipse(cx - noseW * 0.34, noseTipY + p.headH * 0.014, noseW * 0.12, noseW * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + noseW * 0.34, noseTipY + p.headH * 0.014, noseW * 0.12, noseW * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        this._ucDrawFacialHairFront(ctx, p, d, cx, headRx);

        // ── Lips with volume: derived color, upper + lower lip, philtrum ──
        const mouthY = p.headH * (humanLike ? 0.772 : 0.75);
        const mouthW = headRx * (humanLike ? 0.282 : 0.33) * frontMouthSize;
        const lipColor = this._ucDeriveLipColor(d.skin);
        const lipShadow = this._ucShadeColor(lipColor, -0.16);
        const lipHighlight = this._ucShadeColor(lipColor, 0.18);
        const lipH = headRx * (humanLike ? 0.072 : 0.085) * frontMouthSize * lipCtrl;
        // Philtrum shadow above the lip.
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.35);
        ctx.lineWidth = d.ow * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx, noseTipY + p.headH * 0.03);
        ctx.lineTo(cx, mouthY - lipH * 0.9);
        ctx.stroke();
        // Lip body (upper + lower) filled.
        if (!d._ucSeparateFacialFeatures) {
        ctx.fillStyle = lipColor;
        ctx.beginPath();
        ctx.moveTo(cx - mouthW, mouthY);
        // Upper lip with cupid's bow.
        ctx.quadraticCurveTo(cx - mouthW * 0.5, mouthY - lipH * 0.95, cx - mouthW * 0.12, mouthY - lipH * 0.35);
        ctx.quadraticCurveTo(cx, mouthY - lipH * 0.05, cx + mouthW * 0.12, mouthY - lipH * 0.35);
        ctx.quadraticCurveTo(cx + mouthW * 0.5, mouthY - lipH * 0.95, cx + mouthW, mouthY);
        // Lower lip.
        ctx.quadraticCurveTo(cx + mouthW * 0.5, mouthY + lipH * 1.25, cx, mouthY + lipH * 1.35);
        ctx.quadraticCurveTo(cx - mouthW * 0.5, mouthY + lipH * 1.25, cx - mouthW, mouthY);
        ctx.closePath();
        ctx.fill();
        // Lower-lip highlight.
        ctx.fillStyle = this._ucWithAlpha(lipHighlight, 0.55);
        ctx.beginPath();
        ctx.ellipse(cx, mouthY + lipH * 0.5, mouthW * 0.5, lipH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mouth seam (lip line).
        ctx.strokeStyle = lipShadow;
        ctx.lineWidth = d.ow * 1.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - mouthW, mouthY);
        ctx.quadraticCurveTo(cx, mouthY + lipH * 0.25, cx + mouthW, mouthY);
        ctx.stroke();
        }

        this._ucDrawHumanLikeFaceDetails(ctx, p, d, cx, headRx, eyeY, mouthY);

        if (isElderly) {
            ctx.strokeStyle = skinShadow;
            ctx.lineWidth = d.ow * 0.45;
            ctx.globalAlpha = 0.30;
            for (let i = 0; i < 3; i++) {
                const y = p.headH * (0.28 + i * 0.03);
                ctx.beginPath();
                ctx.moveTo(cx - skullHW * 0.38, y);
                ctx.quadraticCurveTo(cx, y - p.headH * 0.015, cx + skullHW * 0.38, y);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(cx - noseW * 1.4, noseTipY + p.headH * 0.02);
            ctx.quadraticCurveTo(cx - mouthW * 1.05, mouthY + p.headH * 0.02, cx - mouthW * 0.62, mouthY + p.headH * 0.12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + noseW * 1.4, noseTipY + p.headH * 0.02);
            ctx.quadraticCurveTo(cx + mouthW * 1.05, mouthY + p.headH * 0.02, cx + mouthW * 0.62, mouthY + p.headH * 0.12);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },

    _ucDrawNeckFrontAdvancedPhase2(ctx, p, d, w, h, cx) {
        const profile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const neckTop = p.headH * 0.88;
        const neckHalf = (p.neckW * profile.neckWidthMult) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - neckHalf * 0.84, neckTop);
        ctx.quadraticCurveTo(cx - neckHalf * 1.00, h - p.neckH * 0.62, cx - neckHalf * 1.18, h);
        ctx.lineTo(cx + neckHalf * 1.18, h);
        ctx.quadraticCurveTo(cx + neckHalf * 1.00, h - p.neckH * 0.62, cx + neckHalf * 0.84, neckTop);
        ctx.quadraticCurveTo(cx + neckHalf * 0.34, neckTop + p.neckH * 0.08, cx, neckTop + p.neckH * 0.03);
        ctx.quadraticCurveTo(cx - neckHalf * 0.34, neckTop + p.neckH * 0.08, cx - neckHalf * 0.84, neckTop);
        ctx.closePath();
        const neckGrad = ctx.createLinearGradient(cx, neckTop, cx, h);
        neckGrad.addColorStop(0, this._ucShadeColor(d.skin, 0.06));
        neckGrad.addColorStop(0.55, d.skin);
        neckGrad.addColorStop(1, this._ucShadeColor(d.skin, -0.10));
        ctx.fillStyle = neckGrad;
        ctx.fill();
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.14);
        ctx.lineWidth = d.ow * 0.52;
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.moveTo(cx - neckHalf * 0.48, neckTop + p.neckH * 0.10);
        ctx.quadraticCurveTo(cx - neckHalf * 0.18, h - p.neckH * 0.38, cx - neckHalf * 0.06, h - p.neckH * 0.04);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + neckHalf * 0.48, neckTop + p.neckH * 0.10);
        ctx.quadraticCurveTo(cx + neckHalf * 0.18, h - p.neckH * 0.38, cx + neckHalf * 0.06, h - p.neckH * 0.04);
        ctx.stroke();
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.08);
        ctx.lineWidth = d.ow * 0.40;
        ctx.beginPath();
        ctx.moveTo(cx, neckTop + p.neckH * 0.12);
        ctx.lineTo(cx, h - p.neckH * 0.10);
        ctx.stroke();
        ctx.globalAlpha = 1;
    },

    _ucDrawHeadSideAdvancedPhase2(ctx, p, d, w, h, cx, headRx, headRy, headCy) {
        if (d.qualityPreset === 'refined') {
            this._ucDrawRefinedSideHead(ctx, p, d, w, h);
            return;
        }
        const hh = p.headH;
        const isFemale = d.gender === 'female';
        const isChild = d.ageGroup === 'neonate' || d.ageGroup === 'child';
        const isElderly = d.ageGroup === 'elderly';
        const humanLike = this._ucIsHumanLikeQuality(d.qualityPreset);
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const hairProfile = this._ucGetHairSilhouetteProfile(hairStyle, d);
        const headProfile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const skinShadow = this._ucShadeColor(d.skin, -0.14);
        const sideFace = this._ucGetSideFaceProfile(d, humanLike);
        const sideNoseSize = this._ucClampNum(d.sideNoseScale, 60, 160, 100) / 100;
        const sideMouthSize = this._ucClampNum(d.sideMouthScale, 60, 160, 100) / 100;
        const eyeSize = this._ucClampNum(d.eyeScale, 60, 140, 100) / 100;
        const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);
        const jawCtrl = this._ucClampNum(d.jawScale, 70, 140, 100) / 100;
        const chinCtrl = this._ucClampNum(d.chinScale, 70, 140, 100) / 100;
        const cheekCtrl = this._ucClampNum(d.cheekScale, 70, 140, 100) / 100;
        const foreheadCtrl = this._ucClampNum(d.foreheadScale, 70, 140, 100) / 100;
        const lipCtrl = this._ucClampNum(d.lipScale, 70, 150, 100) / 100;
        const bridgeCtrl = this._ucClampNum(d.noseBridgeScale, 70, 150, 100) / 100;
        const detailStrength = this._ucClampNum(d.humanLikeStrength, 0, 100, 60) / 100;
        const faceDetail = humanLike ? (0.75 + detailStrength * 0.45) : 1;

        const backSkullX = w * (humanLike ? 0.125 : 0.145);
        const crownX = w * (humanLike ? 0.335 : 0.36);
        const foreheadX = w * (humanLike ? 0.602 : 0.625) * sideFace.foreheadX * (0.975 + foreheadCtrl * 0.025);
        const browX = w * (humanLike ? 0.636 : 0.642) * sideFace.browX * (0.982 + bridgeCtrl * 0.018);
        const noseBaseX = w * (humanLike ? 0.548 : 0.555);
        const noseTipX = w * (isChild ? 0.660 : (humanLike ? (isFemale ? 0.775 : 0.805) : 0.715)) * sideFace.noseTipX * (1 + (sideNoseSize - 1) * 0.26);
        const lipFrontX = w * (humanLike ? 0.660 : 0.615) * sideFace.lipFrontX;
        const chinFrontX = w * (isChild ? 0.540 : (isFemale ? (humanLike ? 0.610 : 0.555) : (humanLike ? 0.645 : 0.585))) * headProfile.chinWidthMult * sideFace.chinFrontX * (0.95 + chinCtrl * 0.05);
        const jawBackX = w * (isChild ? 0.345 : (humanLike ? 0.270 : 0.305)) * sideFace.jawBackX * (0.95 + jawCtrl * 0.05);

        const skullTopY = hh * (humanLike ? 0.030 : 0.045) * sideFace.skullTopY * (1 - (foreheadCtrl - 1) * 0.14);
        const foreheadY = hh * (isChild ? 0.230 : (humanLike ? 0.245 : 0.255)) * sideFace.foreheadY * (1 - (foreheadCtrl - 1) * 0.07);
        const browY = hh * (humanLike ? 0.348 : 0.355);
        const eyeY = hh * (humanLike ? 0.405 : 0.405) * sideFace.eyeY;
        const noseBridgeY = hh * (humanLike ? 0.422 : 0.432) * (1 - (bridgeCtrl - 1) * 0.05);
        const noseTipY = hh * (isChild ? 0.515 : (humanLike ? 0.535 : 0.545)) * sideFace.noseTipY;
        const noseBottomY = hh * (humanLike ? 0.595 : 0.592);
        const upperLipY = hh * (humanLike ? 0.642 : 0.638);
        const mouthY = hh * (humanLike ? 0.675 : 0.675) * sideFace.mouthY;
        const lowerLipY = hh * (humanLike ? 0.718 : 0.710);
        const chinY = hh * (isFemale ? (humanLike ? 0.858 : 0.835) : (humanLike ? 0.885 : 0.855)) * sideFace.chinY * (1 + (chinCtrl - 1) * 0.060);
        const jawAngleY = hh * (isElderly ? 0.755 : (humanLike ? 0.755 : 0.735)) * sideFace.jawAngleY * (1 + (jawCtrl - 1) * 0.035);

        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            const hairBack = ctx.createLinearGradient(w * 0.18, hh * 0.08, w * 0.42, hh * 0.62);
            hairBack.addColorStop(0, this._ucShadeColor(d.hair, 0.04));
            hairBack.addColorStop(1, this._ucShadeColor(d.hair, -0.18));
            ctx.fillStyle = hairBack;
            ctx.beginPath();
            ctx.ellipse(
                w * (0.305 - hairProfile.partBias * 0.04),
                hh * (0.305 + (hairProfile.backDepth - 1) * 0.035),
                w * 0.345 * hairProfile.backDepth,
                hh * 0.300 * hairProfile.height,
                -0.04 + hairProfile.partBias * 0.10,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(backSkullX, hh * 0.435);
        ctx.quadraticCurveTo(w * 0.070, hh * 0.220, w * 0.205, skullTopY + hh * 0.012);
        ctx.quadraticCurveTo(crownX + w * 0.110, skullTopY - hh * 0.016, foreheadX, foreheadY);
        ctx.quadraticCurveTo(foreheadX + w * 0.012, browY - hh * 0.055, browX, browY);
        ctx.quadraticCurveTo(w * 0.600, noseBridgeY + hh * 0.030, noseBaseX, noseTipY - hh * 0.066);
        ctx.quadraticCurveTo(noseTipX - w * 0.030 * sideNoseSize, noseTipY - hh * 0.030 * sideNoseSize, noseTipX, noseTipY);
        ctx.quadraticCurveTo(noseTipX - w * 0.012 * sideNoseSize, noseBottomY - hh * 0.022 * sideNoseSize, noseBaseX - w * 0.006 * sideNoseSize, noseBottomY);
        ctx.quadraticCurveTo(noseBaseX - w * 0.012, upperLipY - hh * 0.006, lipFrontX, upperLipY);
        ctx.quadraticCurveTo(lipFrontX + w * 0.026 * sideMouthSize, upperLipY + hh * 0.010 * sideMouthSize, lipFrontX + w * 0.010 * sideMouthSize, mouthY);
        ctx.quadraticCurveTo(lipFrontX + w * 0.004 * sideMouthSize, lowerLipY, lipFrontX - w * 0.024 * sideMouthSize, lowerLipY + hh * 0.02 * sideMouthSize);
        ctx.quadraticCurveTo(chinFrontX + w * 0.045, chinY - hh * 0.078, chinFrontX, chinY);
        ctx.quadraticCurveTo(w * (0.440 * headProfile.jawWidthMult), chinY + hh * 0.026, jawBackX, jawAngleY);
        ctx.quadraticCurveTo(w * 0.205, hh * 0.625, backSkullX, hh * 0.435);
        ctx.closePath();

        const faceGrad = ctx.createLinearGradient(w * 0.20, hh * 0.08, noseTipX, chinY);
        faceGrad.addColorStop(0, this._ucShadeColor(d.skin, 0.08));
        faceGrad.addColorStop(0.52, d.skin);
        faceGrad.addColorStop(1, this._ucShadeColor(d.skin, -0.10));
        ctx.fillStyle = faceGrad;
        ctx.fill();

        const planeShade = ctx.createLinearGradient(backSkullX, hh * 0.24, noseTipX, hh * 0.62);
        planeShade.addColorStop(0, `rgba(0,0,0,${0.10 * faceDetail})`);
        planeShade.addColorStop(0.35, 'rgba(255,255,255,0.07)');
        planeShade.addColorStop(0.75, 'rgba(0,0,0,0.04)');
        planeShade.addColorStop(1, `rgba(0,0,0,${0.10 * faceDetail})`);
        ctx.fillStyle = planeShade;
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.stroke();

        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            ctx.save();
            const hairFront = ctx.createLinearGradient(w * 0.24, hh * 0.08, w * 0.56, hh * 0.42);
            hairFront.addColorStop(0, this._ucShadeColor(d.hair, 0.05));
            hairFront.addColorStop(1, this._ucShadeColor(d.hair, -0.12));
            ctx.fillStyle = hairFront;
            ctx.beginPath();
            ctx.moveTo(backSkullX - w * (hairProfile.backDepth - 1) * 0.035, hh * 0.44);
            ctx.quadraticCurveTo(w * (0.075 - (hairProfile.volume - 1) * 0.040), hh * (0.218 - (hairProfile.height - 1) * 0.040), w * 0.195, skullTopY + hh * (0.005 - (hairProfile.height - 1) * 0.040));
            ctx.quadraticCurveTo(crownX + w * (0.118 + hairProfile.partBias * 0.08), skullTopY - hh * (0.028 + (hairProfile.height - 1) * 0.038), foreheadX + w * hairProfile.partBias * 0.018, foreheadY + hh * (hairProfile.frontDrop - 1) * 0.014);
            ctx.quadraticCurveTo(w * (0.555 + hairProfile.partBias * 0.04), foreheadY + hh * (0.018 + hairProfile.frontDrop * 0.012), w * 0.405, hh * (0.260 + hairProfile.frontDrop * 0.028));
            ctx.quadraticCurveTo(w * (0.260 - (hairProfile.backDepth - 1) * 0.025), hh * (0.370 + hairProfile.frontDrop * 0.020), backSkullX - w * (hairProfile.backDepth - 1) * 0.035, hh * 0.44);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this._ucShadeColor(d.hair, -0.18);
            ctx.lineWidth = d.ow * 0.55;
            ctx.globalAlpha = 0.34;
            ctx.beginPath();
            ctx.moveTo(w * (0.22 + hairProfile.partBias * 0.04), hh * (0.14 - (hairProfile.height - 1) * 0.02));
            ctx.quadraticCurveTo(w * (0.38 + hairProfile.partBias * 0.06), hh * 0.22, w * (0.42 + hairProfile.partBias * 0.04), hh * (0.38 + hairProfile.frontDrop * 0.03));
            ctx.stroke();
            ctx.restore();
            this._ucDrawHairSheen(ctx, p, d.hair, w * 0.33, p.headH * 0.06, w * 0.28);
            this._ucDrawHairStyleAccent(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawHumanLikeHairTexture(ctx, p, d, cx, headRx, headRy, headCy);
        }

        const earX = w * 0.355;
        const earY = hh * 0.455;
        const earW = w * 0.074;
        const earH = w * 0.132;
        ctx.fillStyle = this._ucShadeColor(d.skin, -0.01);
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow * 0.95;
        ctx.beginPath();
        ctx.ellipse(earX, earY, earW, earH, -0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.14);
        ctx.lineWidth = d.ow * 0.42;
        ctx.beginPath();
        ctx.moveTo(earX - earW * 0.10, earY - earH * 0.44);
        ctx.quadraticCurveTo(earX + earW * 0.12, earY, earX - earW * 0.02, earY + earH * 0.34);
        ctx.stroke();

        if (!d._ucSeparateFacialFeatures) {
        const eyeX = w * 0.610;
        const eyeW = w * 0.078 * eyeSize * eyeTypeProfile.width;
        const eyeH = w * 0.038 * eyeSize * eyeTypeProfile.height;
        const sideSclera = this._ucGetScleraColor(d);
        const sideSocket = this._ucDeriveSocketShadow(d.skin);
        const sideIris = this._ucGetEyeColor(d);
        // Almond eye-white path (reused as clip so iris/lid stay inside).
        const sideEyePath = new Path2D();
        sideEyePath.moveTo(eyeX - eyeW, eyeY);
        sideEyePath.quadraticCurveTo(eyeX - eyeW * 0.20, eyeY - eyeH * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop, eyeX + eyeW, eyeY - eyeH * 0.10 * eyeTypeProfile.upper);
        sideEyePath.quadraticCurveTo(eyeX + eyeW * 0.26, eyeY + eyeH * 0.54 * eyeTypeProfile.lower, eyeX - eyeW, eyeY);
        sideEyePath.closePath();
        ctx.fillStyle = sideSclera;
        ctx.fill(sideEyePath);

        ctx.save();
        ctx.clip(sideEyePath);
        const sIrisCx = eyeX + eyeH * 0.30;
        const sIrisCy = eyeY + eyeH * 0.04;
        const sIrisR = eyeH * 0.72 * eyeTypeProfile.iris;
        const sIrisGrad = ctx.createRadialGradient(sIrisCx - sIrisR * 0.25, sIrisCy - sIrisR * 0.25, sIrisR * 0.2, sIrisCx, sIrisCy, sIrisR);
        sIrisGrad.addColorStop(0, this._ucShadeColor(sideIris, 0.14));
        sIrisGrad.addColorStop(0.7, sideIris);
        sIrisGrad.addColorStop(1, this._ucShadeColor(sideIris, -0.18));
        ctx.fillStyle = sIrisGrad;
        ctx.beginPath();
        ctx.arc(sIrisCx, sIrisCy, sIrisR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.arc(sIrisCx, sIrisCy, sIrisR * 0.46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(sIrisCx - sIrisR * 0.3, sIrisCy - sIrisR * 0.34, sIrisR * 0.22, 0, Math.PI * 2);
        ctx.fill();
        // Upper-lid soft shadow.
        const sLid = ctx.createLinearGradient(eyeX, eyeY - eyeH * 1.1, eyeX, eyeY + eyeH * 0.2);
        sLid.addColorStop(0, this._ucWithAlpha(sideSocket, 0.42));
        sLid.addColorStop(1, this._ucWithAlpha(sideSocket, 0));
        ctx.fillStyle = sLid;
        ctx.fill(sideEyePath);
        ctx.restore();

        // Upper lash line (heavier) + lighter lower lid.
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow * 0.85;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeX - eyeW, eyeY);
        ctx.quadraticCurveTo(eyeX - eyeW * 0.20, eyeY - eyeH * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop, eyeX + eyeW, eyeY - eyeH * 0.10 * eyeTypeProfile.upper);
        ctx.stroke();
        ctx.strokeStyle = this._ucWithAlpha(sideSocket, 0.5);
        ctx.lineWidth = d.ow * 0.4;
        ctx.beginPath();
        ctx.moveTo(eyeX - eyeW * 0.85, eyeY + eyeH * 0.05);
        ctx.quadraticCurveTo(eyeX + eyeW * 0.20, eyeY + eyeH * 0.5, eyeX + eyeW * 0.84, eyeY + eyeH * 0.06);
        ctx.stroke();

        ctx.strokeStyle = d.hair;
        ctx.lineWidth = d.ow * 1.45 * (d.gender === 'female' ? 0.7 : 1.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeX - eyeW * 0.50, eyeY - eyeH * 2.6);
        ctx.quadraticCurveTo(eyeX + eyeW * 0.26, eyeY - eyeH * 3.2, eyeX + eyeW * 0.84, eyeY - eyeH * 2.3);
        ctx.stroke();
        }

        ctx.strokeStyle = skinShadow;
        ctx.lineWidth = d.ow * 0.62;
        ctx.beginPath();
        ctx.moveTo(noseBaseX - w * 0.008, noseTipY - hh * 0.055);
        ctx.quadraticCurveTo(noseTipX - w * 0.008 * sideNoseSize, noseTipY, noseBaseX, noseBottomY);
        ctx.stroke();
        // Nostril shadow under the nose base.
        ctx.fillStyle = this._ucWithAlpha(skinShadow, 0.6);
        ctx.beginPath();
        ctx.ellipse(noseBaseX - w * 0.004 * sideNoseSize, noseBottomY - hh * 0.004, w * 0.018 * sideNoseSize, hh * 0.012 * sideNoseSize, -0.2, 0, Math.PI * 2);
        ctx.fill();
        this._ucDrawFacialHairSide(ctx, p, d, w, hh, { jawBackX, jawAngleY, chinFrontX, chinY, mouthY, lipFrontX });
        // Lip body in derived lip color (profile bulge), with seam + highlight.
        if (!d._ucSeparateFacialFeatures) {
        const sideLip = this._ucDeriveLipColor(d.skin);
        ctx.fillStyle = sideLip;
        ctx.beginPath();
        ctx.moveTo(lipFrontX - w * 0.030 * sideMouthSize, upperLipY + hh * 0.006 * sideMouthSize * lipCtrl);
        ctx.quadraticCurveTo(lipFrontX + w * 0.020 * sideMouthSize, upperLipY + hh * 0.010 * sideMouthSize * lipCtrl, lipFrontX + w * 0.012 * sideMouthSize, mouthY);
        ctx.quadraticCurveTo(lipFrontX + w * 0.020 * sideMouthSize, lowerLipY, lipFrontX - w * 0.030 * sideMouthSize, lowerLipY + hh * 0.012 * sideMouthSize * lipCtrl);
        ctx.quadraticCurveTo(lipFrontX - w * 0.010 * sideMouthSize, mouthY, lipFrontX - w * 0.030 * sideMouthSize, upperLipY + hh * 0.006 * sideMouthSize * lipCtrl);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(sideLip, 0.18), 0.5);
        ctx.beginPath();
        ctx.ellipse(lipFrontX - w * 0.004 * sideMouthSize, lowerLipY - hh * 0.004, w * 0.012 * sideMouthSize, hh * 0.012 * sideMouthSize * lipCtrl, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this._ucShadeColor(sideLip, -0.16);
        ctx.lineWidth = d.ow * 0.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lipFrontX - w * 0.022 * sideMouthSize, upperLipY + hh * 0.015 * sideMouthSize);
        ctx.quadraticCurveTo(lipFrontX + w * 0.008 * sideMouthSize, mouthY, lipFrontX - w * 0.022 * sideMouthSize, lowerLipY + hh * 0.005 * sideMouthSize);
        ctx.stroke();
        }
        ctx.strokeStyle = skinShadow;
        ctx.lineWidth = d.ow * 0.62;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(w * 0.44, hh * 0.32);
        ctx.quadraticCurveTo(w * 0.54, hh * 0.40, w * 0.58, hh * 0.58);
        ctx.stroke();
        ctx.globalAlpha = 1;

        this._ucDrawHumanLikeSideHeadDetails(ctx, p, d, w, h, {
            jawBackX,
            jawAngleY,
            chinFrontX,
            chinY,
            eyeY,
            noseBaseX,
            noseBottomY,
            mouthY,
            lipFrontX
        });

        if (isElderly) {
            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            ctx.moveTo(w * 0.48, hh * 0.28);
            ctx.quadraticCurveTo(w * 0.56, hh * 0.32, w * 0.58, hh * 0.46);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lipFrontX - w * 0.05, mouthY + hh * 0.02);
            ctx.quadraticCurveTo(chinFrontX - w * 0.02, mouthY + hh * 0.07, chinFrontX - w * 0.01, chinY - hh * 0.03);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },

    _ucDrawSideHeadNeckBridge(ctx, p, d, w, h, cx) {
        const hh = p.headH;
        const isFemale = d.gender === 'female';
        const isChild = d.ageGroup === 'neonate' || d.ageGroup === 'child';
        const headProfile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const neckWidth = p.neckW * headProfile.neckWidthMult;
        const neckTopY = hh * 0.82;
        const chinFrontX = w * (isChild ? 0.52 : (isFemale ? 0.54 : 0.56)) * headProfile.chinWidthMult;
        const jawBackX = w * (isChild ? 0.36 : 0.33);
        const napeX = cx - neckWidth * 0.76;
        const throatX = cx + neckWidth * 0.40;
        const baseY = Math.min(h, hh + p.neckH * 0.10);

        ctx.save();
        const bridgeGrad = ctx.createLinearGradient(napeX, neckTopY, throatX, baseY);
        bridgeGrad.addColorStop(0, this._ucShadeColor(d.skin, -0.03));
        bridgeGrad.addColorStop(0.55, d.skin);
        bridgeGrad.addColorStop(1, this._ucShadeColor(d.skin, -0.08));
        ctx.fillStyle = bridgeGrad;
        ctx.beginPath();
        ctx.moveTo(jawBackX - neckWidth * 0.08, hh * 0.735);
        ctx.quadraticCurveTo(jawBackX + neckWidth * 0.32, hh * 0.800, napeX, neckTopY + p.neckH * 0.12);
        ctx.lineTo(throatX, neckTopY + p.neckH * 0.10);
        ctx.quadraticCurveTo(throatX + neckWidth * 0.28, hh * 0.855, chinFrontX - neckWidth * 0.05, hh * 0.830);
        ctx.quadraticCurveTo(cx + neckWidth * 0.06, hh * 0.870, jawBackX - neckWidth * 0.08, hh * 0.735);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    _ucDrawNeckSideAdvancedPhase2(ctx, p, d, w, h, cx) {
        const profile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const neckTopY = p.headH * 0.84;
        const neckWidth = p.neckW * profile.neckWidthMult;
        const throatX = cx + neckWidth * 0.14;
        const napeX = cx - neckWidth * 0.68;
        const baseFrontX = cx + neckWidth * 0.40;
        const baseBackX = cx - neckWidth * 0.96;

        this._ucDrawSideHeadNeckBridge(ctx, p, d, w, h, cx);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(napeX, neckTopY + p.neckH * 0.03);
        ctx.quadraticCurveTo(baseBackX + p.neckW * 0.12, h - p.neckH * 0.46, baseBackX, h);
        ctx.lineTo(baseFrontX, h);
        ctx.quadraticCurveTo(baseFrontX * 0.98, h - p.neckH * 0.34, throatX, neckTopY - p.neckH * 0.005);
        ctx.quadraticCurveTo(cx - p.neckW * 0.05, neckTopY - p.neckH * 0.05, napeX, neckTopY + p.neckH * 0.03);
        ctx.closePath();
        const neckGrad = ctx.createLinearGradient(baseBackX, neckTopY, baseFrontX, h);
        neckGrad.addColorStop(0, this._ucShadeColor(d.skin, -0.04));
        neckGrad.addColorStop(0.45, d.skin);
        neckGrad.addColorStop(1, this._ucShadeColor(d.skin, -0.12));
        ctx.fillStyle = neckGrad;
        ctx.fill();
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.16);
        ctx.lineWidth = d.ow * 0.48;
        ctx.globalAlpha = 0.34;
        ctx.beginPath();
        ctx.moveTo(baseBackX + p.neckW * 0.28, h - p.neckH * 0.02);
        ctx.quadraticCurveTo(cx - p.neckW * 0.10, h - p.neckH * 0.52, cx + p.neckW * 0.00, neckTopY + p.neckH * 0.02);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + p.neckW * 0.02, neckTopY + p.neckH * 0.06);
        ctx.quadraticCurveTo(cx + p.neckW * 0.18, h - p.neckH * 0.26, baseFrontX - p.neckW * 0.04, h - p.neckH * 0.02);
        ctx.stroke();
        ctx.globalAlpha = 1;
    },

    _ucDrawHead(p, d) {
        const w = Math.ceil(p.headW);
        const h = Math.ceil(p.headH + p.neckH);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        const cx = w / 2;
        const headRx = p.headW * 0.46;
        const headRy = p.headH * 0.44;
        const headCy = p.headH * 0.46;
        const fsc = p.faceScale;

        if (d.view === 'side') {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            this._ucDrawHeadSide(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawNeckSide(ctx, p, d, w, h, cx);
            ctx.restore();
        } else if (d.view === 'back') {
            this._ucDrawHeadBack(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawNeckBack(ctx, p, d, w, h, cx);
        } else {
            this._ucDrawHeadFront(ctx, p, d, w, h, cx, headRx, headRy, headCy, fsc);
            this._ucDrawNeckFront(ctx, p, d, w, h, cx);
        }

        this._ucDrawHeadAccessories(ctx, p, d, w, h, cx);

        return c;
    },

    _ucDrawHeadAccessories(ctx, p, d, w, h, cx) {
        if (d.qualityPreset === 'refined' && d.view === 'side' && this._ucDrawRefinedSideHeadwear(ctx, p, d, w)) return;
        const headwearStyle = this._ucNormalizeHeadwearStyle(
            d.headwearStyle || (this._ucIsHeadwearStyle(d.hairStyle) ? d.hairStyle : 'none')
        );
        if (headwearStyle !== 'none') {
            const clothing = this._ucGetClothing(d);
            const uniformCapColor = clothing.outfitPreset === 'pilot'
                ? clothing.bottomColor
                : clothing.topColor;
            const kufiCapColor = (clothing.outfitPreset === 'royal-agbada' || clothing.outfitPreset === 'royal-agbada-painted' || clothing.outfitPreset === 'chief')
                ? clothing.topColor
                : d.hair;
            const fabricHeadwearStyles = ['headwrap', 'gele', 'gele-pleated', 'beaded-gele', 'turban-wrap', 'ankara-wrap', 'tall-headwrap', 'hijab'];
            const fabricHeadwearColor = clothing.accentColor || clothing.topColor || d.hair;
            const headwearDrawContext = {
                ...d,
                hairStyle: headwearStyle,
                hair: headwearStyle === 'uniform-cap'
                    ? uniformCapColor
                    : (headwearStyle === 'kufi'
                        ? kufiCapColor
                        : (fabricHeadwearStyles.includes(headwearStyle) ? fabricHeadwearColor : d.hair)),
                headwearAccentColor: clothing.accentColor || clothing.bottomColor || clothing.topColor || d.hair,
                headwearPatternColor: clothing.bottomColor || clothing.topColor || clothing.accentColor || d.hair
            };
            const drawHeadwear = () => {
                ctx.save();
                if (d.qualityPreset === 'refined' && !['hijab', 'niqab'].includes(headwearStyle)) {
                    // Fitted crowns stay above animated brows and ears. Hair is
                    // retained underneath; scarves deliberately use their own drape.
                    ctx.beginPath();
                    ctx.rect(0, 0, w, p.headH * 0.292);
                    ctx.clip();
                    ctx.translate(cx, p.headH * 0.13);
                    ctx.scale(0.94, 0.88);
                    ctx.translate(-cx, -p.headH * 0.13);
                }
                this._ucDrawHairStyleAccent(ctx, p, headwearDrawContext, w, h, cx, p.headW * 0.46, p.headH * 0.44, p.headH * 0.46);
                ctx.restore();
            };
            if (d.view === 'side') {
                ctx.save();
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
                drawHeadwear();
                ctx.restore();
            } else {
                drawHeadwear();
            }
            return;
        }

        const clothing = this._ucGetClothing(d);
        if (clothing.outfitPreset === 'construction') {
            const brimY = p.headH * 0.18;
            const crownY = p.headH * 0.02;
            const helmetColor = clothing.accentColor || '#F4C542';
            const shadow = this._ucShadeColor(helmetColor, -0.18);
            ctx.fillStyle = helmetColor;
            ctx.strokeStyle = shadow;
            ctx.lineWidth = d.ow * 0.9;

            if (d.view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.22, brimY + p.headH * 0.02);
                ctx.quadraticCurveTo(w * 0.36, crownY, w * 0.60, crownY + p.headH * 0.01);
                ctx.quadraticCurveTo(w * 0.76, crownY + p.headH * 0.04, w * 0.82, brimY + p.headH * 0.06);
                ctx.lineTo(w * 0.68, brimY + p.headH * 0.10);
                ctx.quadraticCurveTo(w * 0.44, brimY + p.headH * 0.02, w * 0.18, brimY + p.headH * 0.12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                return;
            }

            ctx.beginPath();
            ctx.moveTo(cx - p.headW * 0.34, brimY + p.headH * 0.08);
            ctx.quadraticCurveTo(cx - p.headW * 0.26, crownY, cx, crownY);
            ctx.quadraticCurveTo(cx + p.headW * 0.26, crownY, cx + p.headW * 0.34, brimY + p.headH * 0.08);
            ctx.lineTo(cx + p.headW * 0.40, brimY + p.headH * 0.14);
            ctx.lineTo(cx - p.headW * 0.40, brimY + p.headH * 0.14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            return;
        }

        if (clothing.outfitPreset === 'chef') {
            ctx.fillStyle = this._ucShadeColor(clothing.topColor, 0.20);
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
            ctx.lineWidth = d.ow * 0.8;
            if (d.view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.34, p.headH * 0.14);
                ctx.quadraticCurveTo(w * 0.30, p.headH * 0.02, w * 0.46, p.headH * 0.00);
                ctx.quadraticCurveTo(w * 0.62, p.headH * 0.02, w * 0.68, p.headH * 0.18);
                ctx.lineTo(w * 0.32, p.headH * 0.18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - p.headW * 0.24, p.headH * 0.18);
                ctx.quadraticCurveTo(cx - p.headW * 0.30, p.headH * 0.02, cx - p.headW * 0.10, p.headH * 0.00);
                ctx.quadraticCurveTo(cx, p.headH * 0.05, cx + p.headW * 0.10, p.headH * 0.00);
                ctx.quadraticCurveTo(cx + p.headW * 0.30, p.headH * 0.02, cx + p.headW * 0.24, p.headH * 0.18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            return;
        }

        if (clothing.outfitPreset === 'nurse' && d.view !== 'back') {
            ctx.fillStyle = this._ucShadeColor(clothing.topColor, 0.24);
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
            ctx.lineWidth = d.ow * 0.75;
            const capTop = p.headH * 0.12;
            if (d.view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.40, capTop);
                ctx.lineTo(w * 0.64, capTop);
                ctx.lineTo(w * 0.58, p.headH * 0.24);
                ctx.lineTo(w * 0.36, p.headH * 0.24);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(cx - p.headW * 0.14, capTop, p.headW * 0.28, p.headH * 0.10);
                ctx.strokeRect(cx - p.headW * 0.14, capTop, p.headW * 0.28, p.headH * 0.10);
            }
            ctx.strokeStyle = clothing.accentColor;
            ctx.beginPath();
            ctx.moveTo(cx, capTop + p.headH * 0.02);
            ctx.lineTo(cx, capTop + p.headH * 0.08);
            ctx.moveTo(cx - p.headW * 0.05, capTop + p.headH * 0.05);
            ctx.lineTo(cx + p.headW * 0.05, capTop + p.headH * 0.05);
            ctx.stroke();
            return;
        }

        if (clothing.outfitPreset === 'hospitality' && d.view !== 'back') {
            ctx.fillStyle = clothing.accentColor;
            ctx.strokeStyle = this._ucShadeColor(clothing.accentColor, -0.16);
            ctx.lineWidth = d.ow * 0.7;
            if (d.view === 'side') {
                ctx.beginPath();
                ctx.moveTo(w * 0.42, p.headH * 0.14);
                ctx.lineTo(w * 0.62, p.headH * 0.14);
                ctx.lineTo(w * 0.56, p.headH * 0.24);
                ctx.lineTo(w * 0.38, p.headH * 0.24);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(cx - p.headW * 0.12, p.headH * 0.16);
                ctx.lineTo(cx + p.headW * 0.12, p.headH * 0.16);
                ctx.lineTo(cx + p.headW * 0.08, p.headH * 0.24);
                ctx.lineTo(cx - p.headW * 0.08, p.headH * 0.24);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    },

    _ucDrawNeckFront(ctx, p, d, w, h, cx) {
        const profile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const neckTop = p.headH * 0.88;
        const neckHalf = (p.neckW * profile.neckWidthMult) / 2;
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.beginPath();
        ctx.moveTo(cx - neckHalf * 0.88, neckTop);
        ctx.quadraticCurveTo(cx - neckHalf * 1.08, h - p.neckH * 0.55, cx - neckHalf * 1.18, h);
        ctx.lineTo(cx + neckHalf * 1.18, h);
        ctx.quadraticCurveTo(cx + neckHalf * 1.08, h - p.neckH * 0.55, cx + neckHalf * 0.88, neckTop);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.10);
        ctx.lineWidth = d.ow * 0.55;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(cx, neckTop + p.neckH * 0.08);
        ctx.lineTo(cx, h - p.neckH * 0.10);
        ctx.stroke();
        ctx.globalAlpha = 1;
    },

    _ucDrawNeckSide(ctx, p, d, w, h, cx) {
        const profile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const neckTopY = p.headH * 0.84;
        const neckWidth = p.neckW * profile.neckWidthMult;
        const throatX = cx + neckWidth * 0.14;
        const napeX = cx - neckWidth * 0.68;
        const baseFrontX = cx + neckWidth * 0.40;
        const baseBackX = cx - neckWidth * 0.94;

        this._ucDrawSideHeadNeckBridge(ctx, p, d, w, h, cx);

        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.beginPath();
        ctx.moveTo(napeX, neckTopY + p.neckH * 0.03);
        ctx.quadraticCurveTo(baseBackX + p.neckW * 0.08, h - p.neckH * 0.42, baseBackX, h);
        ctx.lineTo(baseFrontX, h);
        ctx.quadraticCurveTo(baseFrontX * 0.98, h - p.neckH * 0.36, throatX, neckTopY - p.neckH * 0.005);
        ctx.quadraticCurveTo(cx - p.neckW * 0.05, neckTopY - p.neckH * 0.05, napeX, neckTopY + p.neckH * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.14);
        ctx.lineWidth = d.ow * 0.55;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.moveTo(baseBackX + p.neckW * 0.26, h - p.neckH * 0.02);
        ctx.quadraticCurveTo(cx - p.neckW * 0.12, h - p.neckH * 0.50, cx - p.neckW * 0.02, neckTopY + p.neckH * 0.01);
        ctx.stroke();
        ctx.globalAlpha = 1;
    },

    _ucDrawNeckBack(ctx, p, d, w, h, cx) {
        const profile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const neckTop = p.headH * 0.87;
        const neckHalf = (p.neckW * profile.neckWidthMult) / 2;
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.beginPath();
        ctx.moveTo(cx - neckHalf * 0.82, neckTop);
        ctx.quadraticCurveTo(cx - neckHalf * 1.02, h - p.neckH * 0.46, cx - neckHalf * 1.10, h);
        ctx.lineTo(cx + neckHalf * 1.10, h);
        ctx.quadraticCurveTo(cx + neckHalf * 1.02, h - p.neckH * 0.46, cx + neckHalf * 0.82, neckTop);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    _ucDrawHeadFront(ctx, p, d, w, h, cx, headRx, headRy, headCy, fsc) {
        const jawY = p.headH * 0.72;
        const chinY = p.headH * 0.92;
        const isFemale = d.gender === 'female';
        const headProfile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const humanLike = this._ucIsHumanLikeQuality(d.qualityPreset);

        // Hair back layer
        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            ctx.fillStyle = d.hair;
            ctx.beginPath();
            ctx.ellipse(cx, headCy * 0.88, headRx * 1.04, headRy * 0.55, 0, Math.PI, 0);
            ctx.fill();
        }

        // Head shape
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.beginPath();
        ctx.ellipse(cx, headCy, headRx * headProfile.headWidthMult, headRy, 0, Math.PI, 0);
        const jawHW = headRx * (isFemale ? 0.72 : 0.80) * headProfile.jawWidthMult;
        const chinHW = headRx * (isFemale ? 0.18 : 0.28) * headProfile.chinWidthMult;
        ctx.lineTo(cx + jawHW, jawY);
        ctx.quadraticCurveTo(cx + chinHW, chinY * 0.98, cx, chinY);
        ctx.quadraticCurveTo(cx - chinHW, chinY * 0.98, cx - jawHW, jawY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Hair front layer
        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            ctx.fillStyle = d.hair;
            ctx.beginPath();
            const hairLine = p.headH * 0.28;
            ctx.ellipse(cx, headCy * 0.88, headRx * 1.02, headRy * 0.52, 0, Math.PI, 0);
            ctx.lineTo(cx + headRx * 0.96, hairLine);
            ctx.quadraticCurveTo(cx + headRx * 0.5, hairLine * 0.7, cx, hairLine * 0.85);
            ctx.quadraticCurveTo(cx - headRx * 0.5, hairLine * 0.7, cx - headRx * 0.96, hairLine);
            ctx.closePath();
            ctx.fill();
            this._ucDrawHairlineVariation(ctx, p, d, cx, headRx, hairLine);
            this._ucDrawHairSheen(ctx, p, d.hair, cx, p.headH * 0.06, headRx);
            this._ucDrawHairStyleAccent(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawHumanLikeHairTexture(ctx, p, d, cx, headRx, headRy, headCy);
        }

        // Ears
        const earY = p.headH * 0.43;
        const earH = headRx * 0.30;
        const earW = headRx * 0.15;
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        [cx - headRx * 0.97, cx + headRx * 0.97].forEach(ex => {
            ctx.beginPath();
            ctx.ellipse(ex, earY, earW, earH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // ── Facial features (drawn as reference, will be animated via sub-objects) ──
        // Eyes
        const eyeSize = this._ucClampNum(d.eyeScale, 60, 140, 100) / 100;
        const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);
        const frontNoseSize = this._ucClampNum(d.frontNoseScale, 60, 160, 100) / 100;
        const frontMouthSize = this._ucClampNum(d.frontMouthScale, 60, 160, 100) / 100;
        const eyeY = p.headH * (humanLike ? 0.455 : 0.45) * fsc;
        const eyeSpacing = headRx * (humanLike ? 0.47 : 0.52);
        const eyeW = headRx * (humanLike ? 0.22 : 0.26) * fsc * eyeSize * eyeTypeProfile.width;
        const eyeH = headRx * (humanLike ? 0.105 : 0.14) * fsc * eyeSize * eyeTypeProfile.height;
        const sclera = this._ucGetScleraColor(d);
        const socketShadow = this._ucDeriveSocketShadow(d.skin);
        const irisColor = this._ucGetEyeColor(d);
        if (!d._ucSeparateFacialFeatures) {
        [cx - eyeSpacing, cx + eyeSpacing].forEach((ex, index) => {
            const inner = index === 0 ? 1 : -1; // toward the nose
            // Almond eye-white path, reused as a clip.
            const eyePath = new Path2D();
            eyePath.moveTo(ex - eyeW, eyeY);
            eyePath.quadraticCurveTo(ex - eyeW * 0.25, eyeY - eyeH * eyeTypeProfile.upper, ex, eyeY - eyeH * 0.78 * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop);
            eyePath.quadraticCurveTo(ex + eyeW * 0.25, eyeY - eyeH * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop, ex + eyeW, eyeY);
            eyePath.quadraticCurveTo(ex + eyeW * 0.25, eyeY + eyeH * 0.9 * eyeTypeProfile.lower, ex, eyeY + eyeH * 0.68 * eyeTypeProfile.lower);
            eyePath.quadraticCurveTo(ex - eyeW * 0.25, eyeY + eyeH * 0.9 * eyeTypeProfile.lower, ex - eyeW, eyeY);
            eyePath.closePath();
            ctx.fillStyle = sclera;
            ctx.fill(eyePath);

            ctx.save();
            ctx.clip(eyePath);
            const irisCy = eyeY + eyeH * 0.22;
            const irisR = eyeH * 0.94 * eyeTypeProfile.iris;
            const irisGrad = ctx.createRadialGradient(ex - irisR * 0.25, irisCy - irisR * 0.25, irisR * 0.2, ex, irisCy, irisR);
            irisGrad.addColorStop(0, this._ucShadeColor(irisColor, 0.14));
            irisGrad.addColorStop(0.7, irisColor);
            irisGrad.addColorStop(1, this._ucShadeColor(irisColor, -0.18));
            ctx.fillStyle = irisGrad;
            ctx.beginPath();
            ctx.arc(ex, irisCy, irisR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#141414';
            ctx.beginPath();
            ctx.arc(ex, irisCy, irisR * 0.44, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.arc(ex - irisR * 0.3, irisCy - irisR * 0.34, irisR * 0.18, 0, Math.PI * 2);
            ctx.fill();
            // Upper-lid soft shadow.
            const lidShade = ctx.createLinearGradient(ex, eyeY - eyeH * 1.1, ex, eyeY + eyeH * 0.2);
            lidShade.addColorStop(0, this._ucWithAlpha(socketShadow, 0.42));
            lidShade.addColorStop(1, this._ucWithAlpha(socketShadow, 0));
            ctx.fillStyle = lidShade;
            ctx.fill(eyePath);
            ctx.restore();

            // Upper lash line (heavier) + lighter lower lid.
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow * 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ex - eyeW, eyeY);
            ctx.quadraticCurveTo(ex - eyeW * 0.25, eyeY - eyeH * eyeTypeProfile.upper, ex, eyeY - eyeH * 0.78 * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop);
            ctx.quadraticCurveTo(ex + eyeW * 0.25, eyeY - eyeH * eyeTypeProfile.upper + eyeH * eyeTypeProfile.lidDrop, ex + eyeW, eyeY);
            ctx.stroke();
            ctx.strokeStyle = this._ucWithAlpha(socketShadow, 0.5);
            ctx.lineWidth = d.ow * 0.42;
            ctx.beginPath();
            ctx.moveTo(ex - eyeW * 0.9, eyeY + eyeH * 0.05);
            ctx.quadraticCurveTo(ex, eyeY + eyeH * 0.8, ex + eyeW * 0.9, eyeY + eyeH * 0.02);
            ctx.stroke();
            // Tear duct at the inner corner.
            ctx.fillStyle = this._ucWithAlpha(this._ucDeriveLipColor(d.skin), 0.5);
            ctx.beginPath();
            ctx.arc(ex + inner * eyeW * 0.9, eyeY + eyeH * 0.06, eyeH * 0.16, 0, Math.PI * 2);
            ctx.fill();
        });

        // Eyebrows (gender/face-aware tapered shape)
        const browProfile = this._ucGetBrowProfile(d);
        [cx - eyeSpacing, cx + eyeSpacing].forEach((ex, i) => {
            const dir = i === 0 ? -1 : 1;
            this._ucDrawBrowShape(ctx, d, ex, eyeY, eyeW, eyeH, dir, browProfile, d.ageGroup === 'elderly');
        });
        }

        // Nose
        const noseTopY = eyeY + eyeH * 1.5;
        const noseMidY = p.headH * 0.58;
        const noseBottomY = p.headH * 0.64;
        const noseW = headRx * (humanLike ? 0.135 : 0.16) * frontNoseSize;
        const skinShadow = this._ucShadeColor(d.skin, -0.18);
        const skinHighlight = this._ucShadeColor(d.skin, 0.10);
        // Bridge form shadow (one side) + tip highlight + nostrils.
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.55);
        ctx.lineWidth = d.ow * 0.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - noseW * 0.18, noseTopY);
        ctx.quadraticCurveTo(cx - noseW * 0.5, noseMidY, cx - noseW * 0.42, noseBottomY);
        ctx.stroke();
        ctx.fillStyle = this._ucWithAlpha(skinHighlight, 0.7);
        ctx.beginPath();
        ctx.ellipse(cx + noseW * 0.08, noseBottomY - headRx * 0.01, noseW * 0.30, noseW * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this._ucWithAlpha(skinShadow, 0.55);
        ctx.beginPath();
        ctx.ellipse(cx - noseW * 0.34, noseBottomY + headRx * 0.012, noseW * 0.12, noseW * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + noseW * 0.34, noseBottomY + headRx * 0.012, noseW * 0.12, noseW * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        this._ucDrawFacialHairFront(ctx, p, d, cx, headRx);

        // Mouth — lips with volume + derived color.
        const mouthY = p.headH * (humanLike ? 0.715 : 0.73);
        const mouthW = headRx * (humanLike ? 0.29 : 0.35) * frontMouthSize;
        const lipColor = this._ucDeriveLipColor(d.skin);
        const lipH = headRx * (humanLike ? 0.065 : 0.09) * frontMouthSize;
        ctx.strokeStyle = this._ucWithAlpha(skinShadow, 0.35);
        ctx.lineWidth = d.ow * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, noseBottomY + headRx * 0.03);
        ctx.lineTo(cx, mouthY - lipH * 0.9);
        ctx.stroke();
        ctx.fillStyle = lipColor;
        ctx.beginPath();
        if (!d._ucSeparateFacialFeatures) {
        ctx.moveTo(cx - mouthW, mouthY);
        ctx.quadraticCurveTo(cx - mouthW * 0.5, mouthY - lipH * 0.95, cx - mouthW * 0.12, mouthY - lipH * 0.35);
        ctx.quadraticCurveTo(cx, mouthY - lipH * 0.05, cx + mouthW * 0.12, mouthY - lipH * 0.35);
        ctx.quadraticCurveTo(cx + mouthW * 0.5, mouthY - lipH * 0.95, cx + mouthW, mouthY);
        ctx.quadraticCurveTo(cx + mouthW * 0.5, mouthY + lipH * 1.25, cx, mouthY + lipH * 1.35);
        ctx.quadraticCurveTo(cx - mouthW * 0.5, mouthY + lipH * 1.25, cx - mouthW, mouthY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(lipColor, 0.18), 0.55);
        ctx.beginPath();
        ctx.ellipse(cx, mouthY + lipH * 0.5, mouthW * 0.5, lipH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this._ucShadeColor(lipColor, -0.16);
        ctx.lineWidth = d.ow * 1.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - mouthW, mouthY);
        ctx.quadraticCurveTo(cx, mouthY + lipH * 0.25, cx + mouthW, mouthY);
        ctx.stroke();

        }

        // Age-specific details
        if (d.ageGroup === 'elderly') {
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.10);
            ctx.lineWidth = d.ow * 0.5;
            ctx.globalAlpha = 0.35;
            // Forehead lines
            for (let i = 0; i < 3; i++) {
                const ly = p.headH * (0.30 + i * 0.025);
                ctx.beginPath();
                ctx.moveTo(cx - headRx * 0.45, ly);
                ctx.quadraticCurveTo(cx, ly - headRx * 0.015, cx + headRx * 0.45, ly);
                ctx.stroke();
            }
            // Nasolabial folds
            ctx.beginPath();
            ctx.moveTo(cx - headRx * 0.16, noseBottomY + headRx * 0.01);
            ctx.quadraticCurveTo(cx - mouthW * 1.0, mouthY, cx - mouthW * 0.8, mouthY + headRx * 0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + headRx * 0.16, noseBottomY + headRx * 0.01);
            ctx.quadraticCurveTo(cx + mouthW * 1.0, mouthY, cx + mouthW * 0.8, mouthY + headRx * 0.1);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },

    _ucDrawHeadSide(ctx, p, d, w, h, cx, headRx, headRy, headCy) {
        if (d.qualityPreset === 'refined') {
            this._ucDrawRefinedSideHead(ctx, p, d, w, h);
            return;
        }
        const hh = p.headH; // head-only height (excluding neck)
        const isFemale = d.gender === 'female';
        const isChild = d.ageGroup === 'neonate' || d.ageGroup === 'child';
        const isElderly = d.ageGroup === 'elderly';
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const sideFace = this._ucGetSideFaceProfile(d, this._ucIsHumanLikeQuality(d.qualityPreset));
        const sideNoseSize = this._ucClampNum(d.sideNoseScale, 60, 160, 100) / 100;
        const sideMouthSize = this._ucClampNum(d.sideMouthScale, 60, 160, 100) / 100;
        const eyeSize = this._ucClampNum(d.eyeScale, 60, 140, 100) / 100;
        const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);

        // ── Key anatomical landmarks (profile facing right) ──
        // X positions (back → front)
        const backSkullX  = w * 0.120;
        const crownMidX   = w * 0.375;
        const earCX       = w * 0.350;
        const noseBaseX   = w * 0.555;
        const foreheadX   = w * 0.610 * sideFace.foreheadX;
        const browRidgeX  = w * 0.636 * sideFace.browX;
        const noseTipX    = w * (isChild ? 0.668 : 0.742) * sideFace.noseTipX;
        const lipFrontX   = w * 0.636 * sideFace.lipFrontX;
        const chinFrontX  = w * (isChild ? 0.548 : (isFemale ? 0.572 : 0.603)) * sideFace.chinFrontX;

        // Y positions (top → bottom)
        const skullTopY   = hh * 0.035 * sideFace.skullTopY;
        const foreheadY   = hh * (isChild ? 0.230 : 0.245) * sideFace.foreheadY;
        const browY       = hh * 0.342;
        const eyeCY       = hh * 0.392 * sideFace.eyeY;
        const noseBridgeY = hh * 0.414;
        const noseTipY    = hh * (isChild ? 0.508 : 0.536) * sideFace.noseTipY;
        const noseBottomY = hh * 0.592;
        const upperLipY   = hh * 0.638;
        const mouthY      = hh * 0.675 * sideFace.mouthY;
        const lowerLipY   = hh * 0.710;
        const chinY       = hh * (isFemale ? 0.835 : 0.855) * sideFace.chinY;
        const jawAngleY   = hh * (isElderly ? 0.755 : 0.735) * sideFace.jawAngleY;
        const jawBackX    = w * (isChild ? 0.345 : 0.305) * sideFace.jawBackX;
        const headProfile = this._ucGetHeadNeckProfile(d.headNeckStyle);

        // ── Hair back layer (behind head shape) ──
        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            ctx.fillStyle = d.hair;
            ctx.beginPath();
            ctx.ellipse(w * 0.32, hh * 0.30, w * 0.34, hh * 0.285, -0.08, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Head outline — skin shape ──
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.beginPath();
        // Start at back of skull mid-height
        ctx.moveTo(backSkullX, hh * 0.42);
        // Up the back of the cranium
        ctx.quadraticCurveTo(w * 0.085, hh * 0.205, w * 0.215, skullTopY + hh * 0.018);
        // Crown arc sweeping forward
        ctx.quadraticCurveTo(crownMidX + w * 0.085, skullTopY - hh * 0.012, foreheadX, foreheadY);
        // Forehead down to brow ridge
        ctx.quadraticCurveTo(browRidgeX + w * 0.012, browY - hh * 0.036, browRidgeX, browY);
        // Brow ridge slight indent
        ctx.lineTo(w * 0.642, browY + hh * 0.018);
        // Nose bridge (concave dip)
        ctx.quadraticCurveTo(noseBaseX - w * 0.026, noseBridgeY + hh * 0.030, noseBaseX, noseTipY - hh * 0.060);
        // Nose profile — out to tip
        ctx.quadraticCurveTo(noseTipX - w * 0.026 * sideNoseSize, noseTipY - hh * 0.030 * sideNoseSize, noseTipX, noseTipY);
        // Nose underside — tip to nostril base
        ctx.quadraticCurveTo(noseTipX - w * 0.010 * sideNoseSize, noseBottomY - hh * 0.018 * sideNoseSize, noseBaseX - w * 0.006 * sideNoseSize, noseBottomY);
        // Philtrum groove to upper lip
        ctx.quadraticCurveTo(noseBaseX - w * 0.012, upperLipY - hh * 0.008, lipFrontX, upperLipY);
        // Upper lip cupid's bow forward
        ctx.quadraticCurveTo(lipFrontX + w * 0.024 * sideMouthSize, upperLipY + hh * 0.010 * sideMouthSize, lipFrontX + w * 0.010 * sideMouthSize, mouthY);
        // Lower lip protrusion
        ctx.quadraticCurveTo(lipFrontX + w * 0.006 * sideMouthSize, lowerLipY, lipFrontX - w * 0.026 * sideMouthSize, lowerLipY + hh * 0.01 * sideMouthSize);
        // Chin (curve in then out)
        ctx.quadraticCurveTo(chinFrontX + w * 0.040 * headProfile.chinWidthMult, chinY - hh * 0.070, chinFrontX, chinY);
        // Under-chin back to jaw angle
        ctx.quadraticCurveTo(w * (0.445 * headProfile.jawWidthMult), chinY + hh * 0.018, jawBackX, jawAngleY);
        // Jaw back to neck / back of skull
        ctx.quadraticCurveTo(w * 0.215, hh * 0.615, backSkullX, hh * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // ── Hair — top/front layer ──
        if (hairStyle !== 'bald' && !this._ucIsHeadwearStyle(hairStyle)) {
            ctx.fillStyle = d.hair;
            ctx.beginPath();
            ctx.moveTo(backSkullX, hh * 0.44);
            ctx.quadraticCurveTo(w * 0.080, hh * 0.20, w * 0.22, skullTopY + hh * 0.00);
            ctx.quadraticCurveTo(crownMidX + w * 0.08, skullTopY - hh * 0.01, foreheadX, foreheadY);
            ctx.quadraticCurveTo(w * 0.55, foreheadY + hh * 0.012, w * 0.405, hh * 0.302);
            ctx.quadraticCurveTo(w * 0.255, hh * 0.372, backSkullX, hh * 0.44);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = this._ucShadeColor(d.hair, -0.14);
            ctx.lineWidth = d.ow * 0.65;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(w * 0.24, hh * 0.18);
            ctx.quadraticCurveTo(w * 0.38, hh * 0.24, w * 0.42, hh * 0.42);
            ctx.stroke();
            ctx.globalAlpha = 1;
            this._ucDrawHairSheen(ctx, p, d.hair, w * 0.33, p.headH * 0.06, w * 0.28);
            this._ucDrawHairStyleAccent(ctx, p, d, w, h, cx, headRx, headRy, headCy);
            this._ucDrawHumanLikeHairTexture(ctx, p, d, cx, headRx, headRy, headCy);
        }

        // ── Ear (full side view) ──
        const earX = earCX;
        const earYc = hh * 0.44;
        const earW = w * 0.066;
        const earH = w * 0.118;
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        ctx.beginPath();
        ctx.ellipse(earX, earYc, earW, earH, -0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner ear: helix, antihelix, and lobe hints.
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
        ctx.lineWidth = d.ow * 0.6;
        ctx.beginPath();
        ctx.moveTo(earX + earW * 0.15, earYc - earH * 0.62);
        ctx.quadraticCurveTo(earX - earW * 0.50, earYc - earH * 0.36, earX - earW * 0.34, earYc + earH * 0.06);
        ctx.quadraticCurveTo(earX - earW * 0.26, earYc + earH * 0.34, earX + earW * 0.02, earYc + earH * 0.44);
        ctx.moveTo(earX + earW * 0.05, earYc - earH * 0.30);
        ctx.quadraticCurveTo(earX + earW * 0.38, earYc - earH * 0.02, earX + earW * 0.02, earYc + earH * 0.18);
        ctx.moveTo(earX - earW * 0.02, earYc + earH * 0.06);
        ctx.quadraticCurveTo(earX + earW * 0.20, earYc + earH * 0.10, earX + earW * 0.20, earYc + earH * 0.32);
        ctx.stroke();

        // ── Eye (single visible, foreshortened) ──
        if (!d._ucSeparateFacialFeatures) {
        const sEyeX = w * 0.596;
        const sEyeY = eyeCY;
        const sEyeW = w * 0.070 * eyeSize * eyeTypeProfile.width;
        const sEyeH = w * 0.027 * eyeSize * eyeTypeProfile.height;
        const sSclera = this._ucGetScleraColor(d);
        const sSocket = this._ucDeriveSocketShadow(d.skin);
        const sIris = this._ucGetEyeColor(d);
        const sEyePath = new Path2D();
        const lidY = sEyeY + (sEyeH * eyeTypeProfile.lidDrop * 0.22);
        sEyePath.moveTo(sEyeX - sEyeW, lidY + sEyeH * 0.04);
        sEyePath.quadraticCurveTo(sEyeX - sEyeW * 0.26, lidY - sEyeH * 1.02 * eyeTypeProfile.upper, sEyeX + sEyeW * 0.76, lidY - sEyeH * 0.26);
        sEyePath.quadraticCurveTo(sEyeX + sEyeW * 0.98, lidY - sEyeH * 0.04, sEyeX + sEyeW * 1.04, lidY + sEyeH * 0.10);
        sEyePath.quadraticCurveTo(sEyeX + sEyeW * 0.18, lidY + sEyeH * 0.74 * eyeTypeProfile.lower, sEyeX - sEyeW, lidY + sEyeH * 0.04);
        sEyePath.closePath();
        ctx.fillStyle = sSclera;
        ctx.fill(sEyePath);
        ctx.save();
        ctx.clip(sEyePath);
        const sIrisCx = sEyeX + sEyeW * 0.34;
        const sIrisR = sEyeH * 0.74 * eyeTypeProfile.iris;
        const sIrisGrad = ctx.createRadialGradient(sIrisCx - sIrisR * 0.25, sEyeY - sIrisR * 0.25, sIrisR * 0.2, sIrisCx, sEyeY, sIrisR);
        sIrisGrad.addColorStop(0, this._ucShadeColor(sIris, 0.14));
        sIrisGrad.addColorStop(0.7, sIris);
        sIrisGrad.addColorStop(1, this._ucShadeColor(sIris, -0.18));
        ctx.fillStyle = sIrisGrad;
        ctx.beginPath();
        ctx.arc(sIrisCx, sEyeY, sIrisR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.arc(sIrisCx, sEyeY, sIrisR * 0.46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(sIrisCx - sIrisR * 0.3, sEyeY - sIrisR * 0.34, sIrisR * 0.2, 0, Math.PI * 2);
        ctx.fill();
        const sLid = ctx.createLinearGradient(sEyeX, sEyeY - sEyeH * 1.1, sEyeX, sEyeY + sEyeH * 0.2);
        sLid.addColorStop(0, this._ucWithAlpha(sSocket, 0.42));
        sLid.addColorStop(1, this._ucWithAlpha(sSocket, 0));
        ctx.fillStyle = sLid;
        ctx.fill(sEyePath);
        ctx.restore();
        // Upper lash line.
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow * 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sEyeX - sEyeW, lidY + sEyeH * 0.04);
        ctx.quadraticCurveTo(sEyeX - sEyeW * 0.26, lidY - sEyeH * 1.02 * eyeTypeProfile.upper, sEyeX + sEyeW * 0.76, lidY - sEyeH * 0.26);
        ctx.quadraticCurveTo(sEyeX + sEyeW * 0.98, lidY - sEyeH * 0.04, sEyeX + sEyeW * 1.04, lidY + sEyeH * 0.10);
        ctx.stroke();

        // ── Eyebrow ──
        ctx.strokeStyle = d.hair;
        ctx.lineWidth = d.ow * 1.5 * (d.gender === 'female' ? 0.7 : 1.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sEyeX - sEyeW * 0.48, sEyeY - sEyeH * 2.6);
        ctx.quadraticCurveTo(sEyeX + sEyeW * 0.34, sEyeY - sEyeH * 3.1, sEyeX + sEyeW * 0.82, sEyeY - sEyeH * 2.25);
        ctx.stroke();
        }

        // Nose / mouth profile accents to sharpen the side silhouette
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.16);
        ctx.lineWidth = d.ow * 0.65;
        ctx.beginPath();
        ctx.moveTo(browRidgeX - w * 0.018, browY + hh * 0.012);
        ctx.quadraticCurveTo(noseBaseX - w * 0.060, noseBridgeY + hh * 0.020, noseBaseX - w * 0.018, noseTipY - hh * 0.072);
        ctx.stroke();
        ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(d.skin, -0.22), 0.38);
        ctx.beginPath();
        ctx.moveTo(noseBaseX - w * 0.008, noseTipY - hh * 0.046);
        ctx.quadraticCurveTo(noseTipX - w * 0.018 * sideNoseSize, noseTipY - hh * 0.004, noseBaseX, noseBottomY);
        ctx.stroke();
        // Nostril shadow.
        ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(d.skin, -0.18), 0.6);
        ctx.beginPath();
        ctx.ellipse(noseBaseX - w * 0.004 * sideNoseSize, noseBottomY - hh * 0.004, w * 0.018 * sideNoseSize, hh * 0.012 * sideNoseSize, -0.2, 0, Math.PI * 2);
        ctx.fill();
        this._ucDrawFacialHairSide(ctx, p, d, w, hh, { jawBackX, jawAngleY, chinFrontX, chinY, mouthY, lipFrontX });
        // Lip body in derived color (profile bulge) with seam + highlight.
        if (!d._ucSeparateFacialFeatures) {
        const sLip = this._ucDeriveLipColor(d.skin);
        ctx.fillStyle = sLip;
        ctx.beginPath();
        ctx.moveTo(lipFrontX - w * 0.030 * sideMouthSize, upperLipY + hh * 0.006 * sideMouthSize);
        ctx.quadraticCurveTo(lipFrontX + w * 0.020 * sideMouthSize, upperLipY + hh * 0.010 * sideMouthSize, lipFrontX + w * 0.012 * sideMouthSize, mouthY);
        ctx.quadraticCurveTo(lipFrontX + w * 0.020 * sideMouthSize, lowerLipY, lipFrontX - w * 0.030 * sideMouthSize, lowerLipY + hh * 0.012 * sideMouthSize);
        ctx.quadraticCurveTo(lipFrontX - w * 0.010 * sideMouthSize, mouthY, lipFrontX - w * 0.030 * sideMouthSize, upperLipY + hh * 0.006 * sideMouthSize);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(sLip, 0.18), 0.5);
        ctx.beginPath();
        ctx.ellipse(lipFrontX - w * 0.004 * sideMouthSize, lowerLipY - hh * 0.004, w * 0.012 * sideMouthSize, hh * 0.012 * sideMouthSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this._ucShadeColor(sLip, -0.16);
        ctx.lineWidth = d.ow * 0.7;
        ctx.beginPath();
        ctx.moveTo(lipFrontX - w * 0.022 * sideMouthSize, upperLipY + hh * 0.015 * sideMouthSize);
        ctx.quadraticCurveTo(lipFrontX + w * 0.008 * sideMouthSize, mouthY, lipFrontX - w * 0.022 * sideMouthSize, lowerLipY + hh * 0.005 * sideMouthSize);
        ctx.stroke();
        }

        if (isElderly) {
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.16);
            ctx.lineWidth = d.ow * 0.6;
            ctx.globalAlpha = 0.32;
            ctx.beginPath();
            ctx.moveTo(w * 0.48, hh * 0.28);
            ctx.quadraticCurveTo(w * 0.56, hh * 0.32, w * 0.58, hh * 0.46);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lipFrontX - w * 0.05, mouthY + hh * 0.02);
            ctx.quadraticCurveTo(chinFrontX - w * 0.02, mouthY + hh * 0.07, chinFrontX - w * 0.01, chinY - hh * 0.03);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },

    _ucDrawHeadBack(ctx, p, d, w, h, cx, headRx, headRy, headCy) {
        const jawY = p.headH * 0.72;
        const chinY = p.headH * 0.92;
        const isFemale = d.gender === 'female';
        const hairStyle = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const headProfile = this._ucGetHeadNeckProfile(d.headNeckStyle);

        const isHeadwear = this._ucIsHeadwearStyle(hairStyle);

        // Full hair/back-of-head shape
        if (hairStyle !== 'bald') {
            ctx.fillStyle = isHeadwear ? d.skin : d.hair;
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow;

            ctx.beginPath();
            ctx.ellipse(cx, headCy, headRx * headProfile.headWidthMult, headRy, 0, Math.PI, 0);
            const jawHW = headRx * (isFemale ? 0.72 : 0.80) * headProfile.jawWidthMult;
            const chinHW = headRx * (isFemale ? 0.15 : 0.22) * headProfile.chinWidthMult;
            ctx.lineTo(cx + jawHW, jawY);
            ctx.quadraticCurveTo(cx + chinHW, chinY * 0.98, cx, chinY);
            ctx.quadraticCurveTo(cx - chinHW, chinY * 0.98, cx - jawHW, jawY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            if (!isHeadwear) {
                ctx.strokeStyle = this._ucShadeColor(d.hair, -0.15);
                ctx.lineWidth = d.ow * 0.5;
                ctx.globalAlpha = 0.4;
                for (let i = -3; i <= 3; i++) {
                    const offset = i * headRx * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(cx + offset, headCy * 0.3);
                    ctx.quadraticCurveTo(cx + offset * 0.9, headCy * 0.9, cx + offset * 1.1, jawY);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                this._ucDrawHairStyleAccent(ctx, p, d, w, h, cx, headRx, headRy, headCy);
                this._ucDrawHumanLikeHairTexture(ctx, p, d, cx, headRx, headRy, headCy);
            }
        }

        // Ears (visible from behind)
        const earY = p.headH * 0.43;
        const earH = headRx * 0.28;
        const earW = headRx * 0.13;
        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;
        [cx - headRx * 0.98, cx + headRx * 0.98].forEach(ex => {
            ctx.beginPath();
            ctx.ellipse(ex, earY, earW, earH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Neck skin visible at bottom
        const neckVisY = p.headH * 0.85;
        ctx.fillStyle = d.skin;
        ctx.beginPath();
        ctx.moveTo(cx - p.neckW * 0.45, neckVisY);
        ctx.quadraticCurveTo(cx, chinY * 0.95, cx + p.neckW * 0.45, neckVisY);
        ctx.lineTo(cx + p.neckW * 0.45, p.headH);
        ctx.lineTo(cx - p.neckW * 0.45, p.headH);
        ctx.closePath();
        ctx.fill();

        // Hairline at nape
        if (hairStyle !== 'bald' && !isHeadwear) {
            ctx.strokeStyle = d.hair;
            ctx.lineWidth = d.ow * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx - p.neckW * 0.50, neckVisY);
            ctx.quadraticCurveTo(cx, chinY * 0.90, cx + p.neckW * 0.50, neckVisY);
            ctx.stroke();
        }

        this._ucDrawHumanLikeBackHeadDetails(ctx, p, d, w, h, cx, headRx, headRy, headCy);
    },

    // ════════════════════════════════════════════════════════════════
    //  Canvas Drawing: Torso
    // ════════════════════════════════════════════════════════════════

    _ucDrawTorso(p, d) {
        const w = Math.ceil(p.torsoW);
        const h = Math.ceil(p.torsoH);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        if (d.view === 'side') {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            this._ucDrawTorsoSide(ctx, p, d, w, h);
            ctx.restore();
        } else if (d.view === 'back') {
            this._ucDrawTorsoBack(ctx, p, d, w, h);
        } else {
            this._ucDrawTorsoFront(ctx, p, d, w, h);
        }
        return c;
    },

    _ucDrawTorsoFront(ctx, p, d, w, h) {
        const cx = w / 2;
        const shoulderHW = p.shoulderW / 2;
        const waistHW = p.waistW / 2;
        const hipHW = p.hipW / 2;
        const bustDelta = (this._ucClampNum(d.bust, 0, 100, 50) - 50) / 50;
        const bustPositive = Math.max(0, bustDelta);
        const bustNegative = Math.max(0, -bustDelta);
        const bellyDelta = (this._ucClampNum(d.belly, 0, 100, 50) - 50) / 50;

        const neckBaseY = h * 0.02, shoulderY = h * 0.08, chestY = h * 0.30;
        const waistY = h * 0.55, hipY = h * 0.80, crotchY = h * 0.98;
        const chestHW = shoulderHW * (0.84 + bustPositive * (p.isFemale ? 0.03 : 0.06) - bustNegative * (p.isFemale ? 0.08 : 0.08));
        const bellyPositive = Math.max(0, bellyDelta);
        const bellyBulge = (p.bellyExtra || 0) * (1.55 + bellyPositive * 0.58);
        const bellyMidY = waistY + (hipY - waistY) * 0.38;

        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;

        const outline = new Path2D();
        outline.moveTo(cx - p.neckW * 0.55, neckBaseY);
        outline.quadraticCurveTo(cx - shoulderHW * 0.6, shoulderY * 0.5, cx - shoulderHW, shoulderY);
        outline.quadraticCurveTo(cx - shoulderHW, chestY * (0.90 - bustPositive * (p.isFemale ? 0.015 : 0.06)), cx - chestHW, chestY);
        outline.quadraticCurveTo(cx - chestHW, (chestY + waistY) * 0.50, cx - waistHW, waistY);
        outline.quadraticCurveTo(cx - waistHW * 0.9 - bellyBulge, bellyMidY, cx - hipHW, hipY);
        outline.lineTo(cx - hipHW * 0.25, crotchY);
        outline.quadraticCurveTo(cx, crotchY + h * 0.02, cx + hipHW * 0.25, crotchY);
        outline.lineTo(cx + hipHW, hipY);
        outline.quadraticCurveTo(cx + waistHW * 0.9 + bellyBulge, bellyMidY, cx + waistHW, waistY);
        outline.quadraticCurveTo(cx + chestHW, (chestY + waistY) * 0.50, cx + chestHW, chestY);
        outline.quadraticCurveTo(cx + shoulderHW, chestY * (0.90 - bustPositive * (p.isFemale ? 0.015 : 0.06)), cx + shoulderHW, shoulderY);
        outline.quadraticCurveTo(cx + shoulderHW * 0.6, shoulderY * 0.5, cx + p.neckW * 0.55, neckBaseY);
        outline.closePath();
        ctx.fill(outline);
        this._ucApplyTorsoClothing(ctx, p, d, w, h, 'front');
        this._ucApplyTorsoOutfitDetails(ctx, p, d, w, h, 'front');
        if (this._ucUseIntegratedGarmentParts?.(d)) return;
        ctx.stroke(outline);

        // Detail lines
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
        ctx.lineWidth = d.ow * 0.7;
        ctx.globalAlpha = 0.5;
        if (p.isMale || this._ucIsMuscularBodyType(d)) {
            ctx.beginPath(); ctx.moveTo(cx, shoulderY + h * 0.02); ctx.lineTo(cx, chestY * 0.9); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, waistY * 0.85); ctx.lineTo(cx, hipY * 0.85); ctx.stroke();
        }
        if (this._ucIsMuscularBodyType(d)) {
            // Pec outlines
            ctx.beginPath();
            ctx.arc(cx - shoulderHW * 0.4, chestY * 0.72, shoulderHW * 0.32, -0.3, Math.PI * 0.85);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + shoulderHW * 0.4, chestY * 0.72, shoulderHW * 0.32, Math.PI * 0.15, Math.PI + 0.3);
            ctx.stroke();
        }
        if (this._ucIsFullerBodyType(d) || Math.abs(bellyDelta) > 0.08) {
            // Belly curve
            ctx.beginPath();
            ctx.arc(cx, waistY + h * bellyPositive * 0.06, waistHW * (0.65 + bellyPositive * 0.42), 0.3, Math.PI - 0.3);
            ctx.stroke();
        }
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(cx, waistY + (hipY - waistY) * 0.15, p.hu * 0.035, 0, Math.PI * 2);
        ctx.stroke();
        if (p.isFemale) {
            const breastAmount = this._ucClampNum(d.bust, 0, 100, 50) / 100;
            const breastRx = shoulderHW * (0.18 + breastAmount * 0.34);
            const breastRy = h * (0.038 + breastAmount * 0.074);
            const breastOffsetX = shoulderHW * (0.22 + breastAmount * 0.12);
            const breastY = chestY * (0.70 + breastAmount * 0.08);
            const skinShadow = this._ucShadeColor(d.skin, -0.11);
            const skinHighlight = this._ucShadeColor(d.skin, 0.10);
            [-1, 1].forEach(side => {
                const bx = cx + side * breastOffsetX;
                const grad = ctx.createRadialGradient(
                    bx - side * breastRx * 0.22,
                    breastY - breastRy * 0.32,
                    breastRx * 0.08,
                    bx,
                    breastY,
                    breastRx * 1.12
                );
                grad.addColorStop(0, this._ucWithAlpha(skinHighlight, 0.28));
                grad.addColorStop(0.50, this._ucWithAlpha(d.skin, 0.14));
                grad.addColorStop(1, this._ucWithAlpha(skinShadow, 0.06));
                ctx.save();
                ctx.globalAlpha = 0.18 + breastAmount * 0.12;
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(bx, breastY, breastRx, breastRy, side * 0.08, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(cx - waistHW * 0.7, waistY * 0.95);
            ctx.quadraticCurveTo(cx - waistHW * 0.3, waistY, cx, waistY * 1.02);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + waistHW * 0.7, waistY * 0.95);
            ctx.quadraticCurveTo(cx + waistHW * 0.3, waistY, cx, waistY * 1.02);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    _ucDrawTorsoSide(ctx, p, d, w, h) {
        const cx = w / 2;
        const isFemale = p.isFemale;
        const bustDelta = (this._ucClampNum(d.bust, 0, 100, 50) - 50) / 50;
        const bustPositive = Math.max(0, bustDelta);
        const bustNegative = Math.max(0, -bustDelta);
        const bellyDelta = (this._ucClampNum(d.belly, 0, 100, 50) - 50) / 50;
        const bellyPositive = Math.max(0, bellyDelta);

        // Y landmarks
        const neckBaseY  = h * 0.02;
        const shoulderY  = h * 0.08;
        const chestPeakY = h * 0.24;
        const underBustY = h * 0.33;
        const waistY     = h * 0.52;
        const hipTopY    = h * 0.68;
        const buttPeakY  = h * 0.76;
        const hipY       = h * 0.82;
        const crotchY    = h * 0.96;

        // Body depth — use shoulderW (already depth-factored) to fill the canvas
        const depth = p.shoulderW;
        const frontBase = cx + depth * 0.46;  // chest front edge
        const backBase  = cx - depth * 0.42;  // back edge at shoulders

        // Front contour key points
        const chestFront  = frontBase + depth * (bustPositive * (isFemale ? 0.08 : 0.06) - bustNegative * (isFemale ? 0.08 : 0.04));
        const waistFront  = cx + depth * (isFemale ? 0.28 : 0.32);
        let bellyFront    = waistFront;
        bellyFront = waistFront + (p.bellyExtra || 0) * (0.95 + bellyPositive * 0.55);
        const hipFront    = cx + depth * (isFemale ? 0.32 : 0.30);
        const crotchFront = cx + depth * 0.18;

        // Back contour key points
        const shoulderBack = backBase;
        const scapBack     = cx - depth * 0.38;
        const waistBack    = cx - depth * (isFemale ? 0.32 : 0.35);
        const lowerBack    = cx - depth * 0.28;  // lordosis curve (lower back concave)
        const buttBack     = cx - depth * (isFemale ? 0.48 : 0.40);
        const crotchBack   = cx - depth * 0.15;

        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;

        ctx.beginPath();
        // ── Front contour (body faces right) ──
        // Neck to shoulder
        ctx.moveTo(cx + p.neckW * 0.18, neckBaseY);
        ctx.quadraticCurveTo(chestFront - depth * 0.12, shoulderY * 0.7, chestFront * 0.97, shoulderY);
        // Shoulder to chest
        ctx.quadraticCurveTo(chestFront * 1.01, shoulderY + (chestPeakY - shoulderY) * 0.5, chestFront, chestPeakY);

        if (isFemale) {
            // Bust curve
            ctx.quadraticCurveTo(chestFront + depth * (0.05 + bustPositive * 0.18), underBustY * 0.86, chestFront * (0.94 - bustPositive * 0.01), underBustY);
            // Under-bust taper to waist
            ctx.quadraticCurveTo(waistFront + depth * 0.06, (underBustY + waistY) * 0.5, bellyFront, waistY);
        } else {
            // Male chest — flatter, straight taper to waist
            ctx.quadraticCurveTo(chestFront * 0.99, (chestPeakY + waistY) * 0.5, bellyFront, waistY);
        }
        // Waist to hip front
        ctx.quadraticCurveTo(hipFront + depth * 0.02, (waistY + hipTopY) * 0.5, hipFront, hipTopY);
        // Hip to crotch
        ctx.quadraticCurveTo(hipFront * 0.94, hipY, crotchFront, crotchY);

        // ── Crotch baseline ──
        ctx.lineTo(crotchBack, crotchY);

        // ── Back contour (left side = behind) ──
        // Butt
        ctx.quadraticCurveTo(buttBack, crotchY * 0.96, buttBack, buttPeakY);
        // Butt to lower back (lordosis — inward curve)
        ctx.quadraticCurveTo(buttBack + depth * 0.02, (buttPeakY + waistY) * 0.52, lowerBack, waistY);
        // Lower back to mid back (slight kyphosis — outward)
        ctx.quadraticCurveTo(scapBack - depth * 0.01, (waistY + chestPeakY) * 0.5, scapBack, chestPeakY);
        // Scapula area to shoulders
        ctx.quadraticCurveTo(shoulderBack - depth * 0.01, (chestPeakY + shoulderY) * 0.5, shoulderBack, shoulderY);
        // Back of neck
        ctx.quadraticCurveTo(shoulderBack + depth * 0.15, shoulderY * 0.45, cx - p.neckW * 0.18, neckBaseY);

        ctx.closePath();
        ctx.fill();
        this._ucApplyTorsoClothing(ctx, p, d, w, h, 'side');
        this._ucApplyTorsoOutfitDetails(ctx, p, d, w, h, 'side');
        if (this._ucUseIntegratedGarmentParts?.(d)) return;
        ctx.stroke();

        // ── Spine S-curve indicator ──
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.10);
        ctx.lineWidth = d.ow * 0.7;
        ctx.globalAlpha = 0.30;
        ctx.beginPath();
        ctx.moveTo(shoulderBack + depth * 0.06, shoulderY);
        ctx.quadraticCurveTo(scapBack + depth * 0.04, chestPeakY, scapBack + depth * 0.02, waistY);
        ctx.quadraticCurveTo(lowerBack + depth * 0.03, (waistY + buttPeakY) * 0.5, buttBack + depth * 0.12, hipY);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // ── Body type details ──
        if (this._ucIsMuscularBodyType(d)) {
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.08);
            ctx.lineWidth = d.ow * 0.6;
            ctx.globalAlpha = 0.25;
            // Pec/chest line
            ctx.beginPath();
            ctx.arc(cx + depth * 0.15, chestPeakY, depth * 0.15, -0.3, Math.PI * 0.6);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (isFemale) {
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
            ctx.lineWidth = d.ow * 0.62;
            ctx.globalAlpha = Math.min(0.46, 0.18 + bustPositive * 0.24);
            ctx.beginPath();
            ctx.moveTo(chestFront - depth * 0.02, chestPeakY + h * 0.015);
            ctx.quadraticCurveTo(chestFront + depth * (0.06 + bustPositive * 0.08), (chestPeakY + underBustY) * 0.52, chestFront - depth * 0.04, underBustY);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },

    _ucDrawTorsoBack(ctx, p, d, w, h) {
        const cx = w / 2;
        const shoulderHW = p.shoulderW / 2;
        const waistHW = p.waistW / 2;
        const hipHW = p.hipW / 2;
        const bellyDelta = (this._ucClampNum(d.belly, 0, 100, 50) - 50) / 50;
        const bellyPositive = Math.max(0, bellyDelta);
        const waistBackHW = waistHW * (0.92 + bellyPositive * 0.18);
        const backBulge = (p.bellyExtra || 0) * (0.62 + bellyPositive * 0.34);

        const neckBaseY = h * 0.02, shoulderY = h * 0.08, chestY = h * 0.30;
        const waistY = h * 0.55, hipY = h * 0.80, crotchY = h * 0.98;

        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;

        const outline = new Path2D();
        outline.moveTo(cx - p.neckW * 0.55, neckBaseY);
        outline.quadraticCurveTo(cx - shoulderHW * 0.6, shoulderY * 0.5, cx - shoulderHW, shoulderY);
        outline.quadraticCurveTo(cx - shoulderHW * 0.96, chestY, cx - waistBackHW, waistY);
        outline.quadraticCurveTo(cx - waistBackHW * 0.9 - backBulge, waistY + (hipY - waistY) * 0.4, cx - hipHW, hipY);
        outline.lineTo(cx - hipHW * 0.25, crotchY);
        outline.quadraticCurveTo(cx, crotchY + h * 0.02, cx + hipHW * 0.25, crotchY);
        outline.lineTo(cx + hipHW, hipY);
        outline.quadraticCurveTo(cx + waistBackHW * 0.9 + backBulge, waistY + (hipY - waistY) * 0.4, cx + waistBackHW, waistY);
        outline.quadraticCurveTo(cx + shoulderHW * 0.96, chestY, cx + shoulderHW, shoulderY);
        outline.quadraticCurveTo(cx + shoulderHW * 0.6, shoulderY * 0.5, cx + p.neckW * 0.55, neckBaseY);
        outline.closePath();
        ctx.fill(outline);
        this._ucApplyTorsoClothing(ctx, p, d, w, h, 'back');
        this._ucApplyTorsoOutfitDetails(ctx, p, d, w, h, 'back');
        if (this._ucUseIntegratedGarmentParts?.(d)) return;
        ctx.stroke(outline);
        this._ucDrawHumanLikeTorsoDetails(ctx, p, d, w, h, 'back');

        // Back detail — spine, shoulder blades, lower back dimples
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.10);
        ctx.lineWidth = d.ow * 0.7;
        ctx.globalAlpha = 0.4;
        // Spine
        ctx.beginPath();
        ctx.moveTo(cx, neckBaseY + h * 0.03);
        ctx.lineTo(cx, hipY * 0.95);
        ctx.stroke();
        // Shoulder blades
        if (!this._ucIsFullerBodyType(d)) {
            ctx.beginPath();
            ctx.ellipse(cx - shoulderHW * 0.35, chestY * 0.85, shoulderHW * 0.22, h * 0.06, -0.15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx + shoulderHW * 0.35, chestY * 0.85, shoulderHW * 0.22, h * 0.06, 0.15, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    // ════════════════════════════════════════════════════════════════
    //  Canvas Drawing: Arm (with hand)
    // ════════════════════════════════════════════════════════════════

    // Paint a cylindrical form shadow over the current (just-filled) limb path:
    // shaded edges + a lit center band, so limbs read as rounded volumes rather
    // than flat silhouettes. Must be called while the limb outline is the
    // current default path (i.e. right after ctx.fill()).
    _ucPaintLimbFormShadow(ctx, w, h) {
        ctx.save();
        ctx.clip();
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.18)');
        g.addColorStop(0.30, 'rgba(255,255,255,0.06)');
        g.addColorStop(0.48, 'rgba(255,255,255,0.10)');
        g.addColorStop(0.68, 'rgba(0,0,0,0.05)');
        g.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    },

    // Soft occlusion shadow at the top of a limb (where it tucks under the
    // shoulder/hip), clipped to the just-filled limb path. Ties parts together.
    _ucPaintLimbContactShadow(ctx, w, h, bandH) {
        ctx.save();
        ctx.clip();
        const g = ctx.createLinearGradient(0, 0, 0, bandH);
        g.addColorStop(0, 'rgba(0,0,0,0.30)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, bandH);
        ctx.restore();
    },

    _ucDrawArm(p, d, side) {
        const w = Math.ceil(p.armW);
        const h = Math.ceil(p.armTotalLen);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        const cx = w / 2;
        const upperEnd = p.upperArmLen;
        const foreEnd = upperEnd + p.forearmLen;
        const isMuscularArm = this._ucIsMuscularBodyType(d);
        const mArm = this._ucClampNum(d.muscle, 0, 100, 50) / 100;
        const handPose = this._ucNormalizeHandPose(d.handPose);

        // ── Side view arm (asymmetric bicep/tricep profile) ──
        if (d.view === 'side') {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            // Side arm is narrower — seen from the narrow dimension
            const sShoulderHW = w * 0.40;
            const sBicepHW    = w * (0.34 + mArm * 0.16);
            const sElbowHW    = w * 0.30;
            const sForeHW     = w * (0.26 + mArm * 0.18);
            const sWristHW    = w * 0.22;
            const sHandHW     = w * (handPose === 'fist' ? 0.27 : (handPose === 'open' ? 0.42 : (handPose === 'pointing' ? 0.34 : (handPose === 'holding' ? 0.36 : (handPose === 'thumbs-up' || handPose === 'thumbs-down' ? 0.40 : 0.35)))));

            // Asymmetry: front edge (inner / toward body) vs back edge (outer)
            // Front = positive x, Back = negative x (bicep on front, tricep on back)
            const bicepBulge  = w * (0.03 + mArm * 0.13);
            const tricepBulge = w * (0.04 + mArm * 0.12);
            const elbowPoint  = w * (0.03 + mArm * 0.03);

            ctx.fillStyle = d.skin;
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow;

            ctx.beginPath();
            // Front edge (bicep side): top → elbow
            ctx.moveTo(cx + sShoulderHW, 0);
            ctx.quadraticCurveTo(cx + sBicepHW + bicepBulge, upperEnd * 0.45, cx + sBicepHW, upperEnd * 0.68);
            ctx.quadraticCurveTo(cx + sElbowHW + bicepBulge * 0.3, upperEnd * 0.86, cx + sElbowHW, upperEnd);
            // Front edge: elbow → wrist
            ctx.quadraticCurveTo(cx + sForeHW * 0.98, upperEnd + p.forearmLen * 0.30, cx + sWristHW, foreEnd);
            // Hand (side view — edge-on, thinner profile)
            ctx.lineTo(cx + sHandHW, foreEnd + p.handLen * 0.08);
            ctx.quadraticCurveTo(cx + sHandHW * 1.02, foreEnd + p.handLen * 0.65, cx + sHandHW * 0.25, h);
            ctx.quadraticCurveTo(cx, h + p.handLen * 0.03, cx - sHandHW * 0.25, h);
            ctx.quadraticCurveTo(cx - sHandHW * 1.02, foreEnd + p.handLen * 0.65, cx - sHandHW, foreEnd + p.handLen * 0.08);
            ctx.lineTo(cx - sWristHW, foreEnd);
            // Back edge (tricep side): wrist → elbow
            ctx.quadraticCurveTo(cx - sForeHW * 0.96, upperEnd + p.forearmLen * 0.50, cx - sElbowHW - elbowPoint, upperEnd);
            // Back edge: elbow → top (tricep bulge in upper arm)
            ctx.quadraticCurveTo(cx - sBicepHW - tricepBulge, upperEnd * 0.55, cx - sBicepHW - tricepBulge * 0.6, upperEnd * 0.35);
            ctx.quadraticCurveTo(cx - sShoulderHW * 0.98, upperEnd * 0.15, cx - sShoulderHW, 0);
            ctx.closePath();
            ctx.fill();
            this._ucPaintLimbFormShadow(ctx, w, h);
            this._ucPaintLimbContactShadow(ctx, w, h, h * 0.12);
            this._ucApplyArmClothing(ctx, p, d, w, upperEnd, foreEnd);
            ctx.stroke();

            // Elbow point detail
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.12);
            ctx.lineWidth = d.ow * 0.6;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(cx - sElbowHW * 0.5, upperEnd, sElbowHW * 0.25, Math.PI * 0.3, Math.PI * 0.9);
            ctx.stroke();

            if (isMuscularArm) {
                ctx.strokeStyle = this._ucShadeColor(d.skin, -0.16);
                ctx.lineWidth = Math.max(1, d.ow * 0.8);
                ctx.globalAlpha = 0.38;
                ctx.beginPath();
                ctx.arc(cx + sBicepHW * 0.12, upperEnd * 0.42, sBicepHW * 0.48, Math.PI * 0.18, Math.PI * 0.92);
                ctx.moveTo(cx - sForeHW * 0.55, upperEnd + p.forearmLen * 0.24);
                ctx.quadraticCurveTo(cx - sForeHW * 0.18, upperEnd + p.forearmLen * 0.48, cx - sWristHW * 0.18, foreEnd - p.hu * 0.04);
                ctx.stroke();
            }

            // Finger lines: keep them readable at stage zoom without turning the hand into a UI icon.
            const fingerStartY = foreEnd + p.handLen * 0.45;
            ctx.globalAlpha = 0.78;
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.28);
            ctx.lineWidth = Math.max(0.75, d.ow * 0.58);
            ctx.beginPath();
            if (handPose === 'fist') {
                ctx.arc(cx, fingerStartY + p.handLen * 0.18, sHandHW * 0.48, Math.PI * 0.08, Math.PI * 0.92);
                ctx.moveTo(cx - sHandHW * 0.38, fingerStartY + p.handLen * 0.04);
                ctx.lineTo(cx + sHandHW * 0.38, fingerStartY + p.handLen * 0.04);
            } else if (handPose === 'pointing') {
                ctx.moveTo(cx, fingerStartY - p.handLen * 0.06);
                ctx.lineTo(cx + sHandHW * 0.34, h - p.handLen * 0.06);
                ctx.moveTo(cx - sHandHW * 0.22, fingerStartY + p.handLen * 0.10);
                ctx.quadraticCurveTo(cx - sHandHW * 0.10, fingerStartY + p.handLen * 0.28, cx + sHandHW * 0.12, fingerStartY + p.handLen * 0.24);
            } else if (handPose === 'holding') {
                ctx.arc(cx, fingerStartY + p.handLen * 0.16, sHandHW * 0.42, Math.PI * 0.15, Math.PI * 1.65);
            } else if (handPose === 'thumbs-up' || handPose === 'thumbs-down') {
                const thumbDir = handPose === 'thumbs-up' ? -1 : 1;
                ctx.arc(cx, fingerStartY + p.handLen * 0.16, sHandHW * 0.42, Math.PI * 0.10, Math.PI * 0.92);
                ctx.moveTo(cx + sHandHW * 0.18, fingerStartY + p.handLen * 0.12);
                ctx.lineTo(cx + sHandHW * 0.18, fingerStartY + thumbDir * p.handLen * 0.42);
                ctx.moveTo(cx - sHandHW * 0.28, fingerStartY + p.handLen * 0.08);
                ctx.lineTo(cx + sHandHW * 0.18, fingerStartY + p.handLen * 0.08);
            } else {
                ctx.moveTo(cx, fingerStartY - p.handLen * 0.04);
                ctx.lineTo(cx, h - p.handLen * 0.07);
                ctx.moveTo(cx - sHandHW * 0.26, fingerStartY + p.handLen * 0.04);
                ctx.lineTo(cx - sHandHW * 0.22, h - p.handLen * 0.11);
                ctx.moveTo(cx + sHandHW * 0.24, fingerStartY + p.handLen * 0.04);
                ctx.lineTo(cx + sHandHW * 0.20, h - p.handLen * 0.11);
            }
            ctx.stroke();
            ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(d.skin, 0.18), 0.78);
            const sideTipMarks = handPose === 'fist' ? [-0.28, 0, 0.28] : [-0.22, 0, 0.20];
            sideTipMarks.forEach(xr => {
                ctx.beginPath();
                ctx.ellipse(cx + sHandHW * xr, h - p.handLen * 0.065, sHandHW * 0.075, p.handLen * 0.020, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            // Thumb (visible in side view)
            ctx.beginPath();
            ctx.moveTo(cx + sWristHW * 0.6, foreEnd * 0.97);
            ctx.quadraticCurveTo(cx + sHandHW * 1.1, foreEnd + p.handLen * 0.22, cx + sHandHW * 0.75, foreEnd + p.handLen * 0.42);
            ctx.stroke();

            ctx.globalAlpha = 1;
            this._ucDrawHumanLikeLimbDetails(ctx, p, d, w, h, 'arm', d.view, side);
            return c;
        }

        // ── Front / Back view arm (symmetrical) ──
        const mAmt = this._ucClampNum(d.muscle, 0, 100, 50) / 100;  // 0 = smooth, 1 = defined
        const shoulderHW = w * (0.43 + mAmt * 0.06);
        const bicepHW = w * (0.40 + mAmt * 0.24);   // wider belly when defined
        const elbowHW = w * (0.42 - mAmt * 0.12);   // tighter elbow when defined
        const forearmHW = w * (0.32 + mAmt * 0.22);
        const wristHW = w * (0.31 - mAmt * 0.03);
        const handHW = w * (handPose === 'fist' ? 0.35 : (handPose === 'open' ? 0.58 : (handPose === 'pointing' ? 0.40 : (handPose === 'holding' ? 0.43 : (handPose === 'thumbs-up' || handPose === 'thumbs-down' ? 0.46 : 0.48)))));
        const bicepT = upperEnd * (0.32 + mAmt * 0.14);
        const foreT = upperEnd + p.forearmLen * (0.36 - mAmt * 0.12);

        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;

        ctx.beginPath();
        ctx.moveTo(cx - shoulderHW, 0);
        ctx.quadraticCurveTo(cx - bicepHW, bicepT, cx - elbowHW, upperEnd);
        ctx.quadraticCurveTo(cx - forearmHW, foreT, cx - wristHW, foreEnd);
        ctx.lineTo(cx - handHW, foreEnd + p.handLen * 0.1);
        ctx.quadraticCurveTo(cx - handHW * 1.05, foreEnd + p.handLen * 0.7, cx - handHW * 0.3, h);
        ctx.quadraticCurveTo(cx, h + p.handLen * 0.05, cx + handHW * 0.3, h);
        ctx.quadraticCurveTo(cx + handHW * 1.05, foreEnd + p.handLen * 0.7, cx + handHW, foreEnd + p.handLen * 0.1);
        ctx.lineTo(cx + wristHW, foreEnd);
        ctx.quadraticCurveTo(cx + forearmHW, foreT, cx + elbowHW, upperEnd);
        ctx.quadraticCurveTo(cx + bicepHW, bicepT, cx + shoulderHW, 0);
        ctx.closePath();
        ctx.fill();
        this._ucPaintLimbFormShadow(ctx, w, h);
        this._ucPaintLimbContactShadow(ctx, w, h, h * 0.12);
        this._ucApplyArmClothing(ctx, p, d, w, upperEnd, foreEnd);
        ctx.stroke();

        // Finger lines
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.28);
        ctx.lineWidth = Math.max(0.9, d.ow * 0.86);
        ctx.globalAlpha = 0.80;
        const fingerStartY = foreEnd + p.handLen * 0.45;
        const fingerSpacing = handHW * 0.30;
        if (handPose === 'fist') {
            ctx.beginPath();
            ctx.moveTo(cx - handHW * 0.58, fingerStartY + p.handLen * 0.05);
            ctx.quadraticCurveTo(cx, fingerStartY - p.handLen * 0.06, cx + handHW * 0.58, fingerStartY + p.handLen * 0.05);
            ctx.moveTo(cx - handHW * 0.50, fingerStartY + p.handLen * 0.20);
            ctx.quadraticCurveTo(cx, fingerStartY + p.handLen * 0.12, cx + handHW * 0.50, fingerStartY + p.handLen * 0.20);
            ctx.stroke();
        } else if (handPose === 'pointing') {
            ctx.beginPath();
            ctx.moveTo(cx - fingerSpacing * 0.25, fingerStartY - p.handLen * 0.06);
            ctx.quadraticCurveTo(cx + fingerSpacing * 0.10, fingerStartY + p.handLen * 0.20, cx + fingerSpacing * 0.18, h - p.handLen * 0.06);
            ctx.moveTo(cx - handHW * 0.46, fingerStartY + p.handLen * 0.18);
            ctx.quadraticCurveTo(cx - handHW * 0.10, fingerStartY + p.handLen * 0.36, cx + handHW * 0.38, fingerStartY + p.handLen * 0.24);
            ctx.stroke();
        } else if (handPose === 'holding') {
            ctx.beginPath();
            ctx.arc(cx, fingerStartY + p.handLen * 0.20, handHW * 0.48, Math.PI * 0.04, Math.PI * 1.65);
            ctx.moveTo(cx - handHW * 0.42, fingerStartY + p.handLen * 0.24);
            ctx.quadraticCurveTo(cx, fingerStartY + p.handLen * 0.38, cx + handHW * 0.42, fingerStartY + p.handLen * 0.24);
            ctx.stroke();
        } else if (handPose === 'thumbs-up' || handPose === 'thumbs-down') {
            const thumbSide = (side === 'right' || side === 'front') ? -1 : 1;
            const thumbDir = handPose === 'thumbs-up' ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(cx - handHW * 0.50, fingerStartY + p.handLen * 0.05);
            ctx.quadraticCurveTo(cx, fingerStartY - p.handLen * 0.02, cx + handHW * 0.50, fingerStartY + p.handLen * 0.05);
            ctx.moveTo(cx - handHW * 0.42, fingerStartY + p.handLen * 0.22);
            ctx.quadraticCurveTo(cx, fingerStartY + p.handLen * 0.14, cx + handHW * 0.42, fingerStartY + p.handLen * 0.22);
            ctx.moveTo(cx + thumbSide * handHW * 0.10, fingerStartY + p.handLen * 0.08);
            ctx.quadraticCurveTo(
                cx + thumbSide * handHW * 0.86,
                fingerStartY + thumbDir * p.handLen * 0.18,
                cx + thumbSide * handHW * 0.96,
                fingerStartY + thumbDir * p.handLen * 0.46
            );
            ctx.stroke();
        } else {
            for (let i = -1.5; i <= 1.5; i += 1) {
                ctx.beginPath();
                ctx.moveTo(cx + i * fingerSpacing, fingerStartY - p.handLen * 0.03);
                ctx.quadraticCurveTo(cx + i * fingerSpacing * 0.95, fingerStartY + p.handLen * 0.25, cx + i * fingerSpacing * 0.78, h - p.handLen * 0.06);
                ctx.stroke();
            }
        }
        // Fingertip separations, knuckle ridge, and subtle nails.
        ctx.globalAlpha = 0.64;
        ctx.fillStyle = this._ucShadeColor(d.skin, -0.24);
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            const markY = handPose === 'fist' ? fingerStartY + p.handLen * 0.06 : h - p.handLen * 0.052;
            ctx.arc(cx + i * fingerSpacing * 0.60, markY, handHW * 0.075, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(d.skin, 0.20), 0.72);
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.ellipse(cx + i * fingerSpacing * 0.60, h - p.handLen * 0.070, handHW * 0.050, p.handLen * 0.014, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.22);
        ctx.lineWidth = Math.max(0.65, d.ow * 0.62);
        ctx.globalAlpha = 0.50;
        ctx.beginPath();
        ctx.moveTo(cx - handHW * 0.6, fingerStartY - p.handLen * 0.06);
        ctx.quadraticCurveTo(cx, fingerStartY - p.handLen * 0.02, cx + handHW * 0.6, fingerStartY - p.handLen * 0.06);
        ctx.moveTo(cx - handHW * 0.56, fingerStartY + p.handLen * 0.15);
        ctx.quadraticCurveTo(cx, fingerStartY + p.handLen * 0.19, cx + handHW * 0.56, fingerStartY + p.handLen * 0.15);
        ctx.stroke();
        ctx.globalAlpha = 0.5;

        // Thumb
        const thumbSide = (side === 'right' || side === 'front') ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + thumbSide * wristHW * 0.8, foreEnd * 0.96);
        if (handPose === 'thumbs-up' || handPose === 'thumbs-down') {
            const thumbDir = handPose === 'thumbs-up' ? -1 : 1;
            ctx.quadraticCurveTo(
                cx + thumbSide * handHW * 1.34,
                foreEnd + p.handLen * (thumbDir < 0 ? 0.08 : 0.42),
                cx + thumbSide * handHW * 1.06,
                foreEnd + p.handLen * (thumbDir < 0 ? -0.18 : 0.78)
            );
        } else {
            ctx.quadraticCurveTo(cx + thumbSide * handHW * 1.2, foreEnd + p.handLen * 0.25, cx + thumbSide * handHW * 0.85, foreEnd + p.handLen * 0.5);
        }
        ctx.stroke();

        // Elbow crease
        ctx.beginPath();
        ctx.moveTo(cx - elbowHW * 0.6, upperEnd);
        ctx.quadraticCurveTo(cx, upperEnd - p.hu * 0.015, cx + elbowHW * 0.6, upperEnd);
        ctx.stroke();

        // Muscular definition
        if (isMuscularArm) {
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.17);
            ctx.lineWidth = Math.max(1, d.ow * 0.82);
            ctx.beginPath();
            ctx.arc(cx - bicepHW * 0.20, upperEnd * 0.42, bicepHW * 0.42, Math.PI * 0.08, Math.PI * 0.86);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + bicepHW * 0.20, upperEnd * 0.42, bicepHW * 0.42, Math.PI * 0.14, Math.PI * 0.92);
            ctx.stroke();
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(cx - forearmHW * 0.58, upperEnd + p.forearmLen * 0.20);
            ctx.quadraticCurveTo(cx - forearmHW * 0.18, upperEnd + p.forearmLen * 0.48, cx - wristHW * 0.18, foreEnd - p.hu * 0.04);
            ctx.moveTo(cx + forearmHW * 0.58, upperEnd + p.forearmLen * 0.20);
            ctx.quadraticCurveTo(cx + forearmHW * 0.18, upperEnd + p.forearmLen * 0.48, cx + wristHW * 0.18, foreEnd - p.hu * 0.04);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        this._ucDrawHumanLikeLimbDetails(ctx, p, d, w, h, 'arm', d.view, side);
        return c;
    },

    // ════════════════════════════════════════════════════════════════
    //  Canvas Drawing: Leg (with foot)
    // ════════════════════════════════════════════════════════════════

    _ucDrawLeg(p, d, side) {
        const w = Math.ceil(p.legW);
        const h = Math.ceil(p.legTotalLen);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        const cx = w / 2;
        const kneeY = p.upperLegLen;
        const ankleY = kneeY + p.lowerLegLen;
        const isMuscularArm = this._ucIsMuscularBodyType(d);
        const mLeg = this._ucClampNum(d.muscle, 0, 100, 50) / 100;

        // ── Side view leg (quad/hamstring/calf asymmetry) ──
        if (d.view === 'side') {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            // Side leg slightly narrower (seen from narrow dimension)
            const sHipHW    = w * 0.40;
            const sThighFW  = w * (0.36 + mLeg * 0.08);  // front (quad) half-width
            const sThighBW  = w * 0.35;  // back (hamstring) half-width
            const sKneeFW   = w * 0.30;
            const sKneeBW   = w * 0.28;
            const sCalfFW   = w * 0.24;
            const sCalfBW   = w * (0.26 + mLeg * 0.14);  // calf larger on back
            const sAnkleHW  = w * 0.20;
            const sFootLen  = w * 0.90;  // foot extends forward in side view
            const footHt    = p.footH;

            // Quad bulge (front) and calf bulge (back)
            const quadBulge = w * (0.03 + mLeg * 0.05);
            const calfBulge = w * (0.04 + mLeg * 0.10);

            ctx.fillStyle = d.skin;
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow;

            ctx.beginPath();
            // Front edge (quadricep side): hip → knee
            ctx.moveTo(cx + sHipHW, 0);
            ctx.quadraticCurveTo(cx + sThighFW + quadBulge, kneeY * 0.35, cx + sThighFW, kneeY * 0.6);
            ctx.quadraticCurveTo(cx + sKneeFW + quadBulge * 0.3, kneeY * 0.85, cx + sKneeFW, kneeY);
            // Front edge: knee → ankle (shin — relatively straight)
            ctx.quadraticCurveTo(cx + sCalfFW * 0.95, kneeY + (ankleY - kneeY) * 0.4, cx + sAnkleHW, ankleY);

            // Foot (side view — extends forward; toe points right)
            ctx.lineTo(cx + sAnkleHW, ankleY + footHt * 0.15);
            ctx.quadraticCurveTo(cx + sFootLen * 0.5, ankleY + footHt * 0.10, cx + sFootLen * 0.48, ankleY + footHt * 0.50);
            // Toe tip
            ctx.quadraticCurveTo(cx + sFootLen * 0.50, h - footHt * 0.05, cx + sFootLen * 0.35, h);
            // Sole
            ctx.lineTo(cx - sAnkleHW * 0.8, h);
            // Heel
            ctx.quadraticCurveTo(cx - sAnkleHW * 1.2, h - footHt * 0.1, cx - sAnkleHW * 1.0, ankleY + footHt * 0.2);
            ctx.lineTo(cx - sAnkleHW, ankleY);

            // Back edge (calf side): ankle → knee
            ctx.quadraticCurveTo(cx - sCalfBW - calfBulge, kneeY + (ankleY - kneeY) * 0.35, cx - sCalfBW - calfBulge * 0.7, kneeY + (ankleY - kneeY) * 0.25);
            ctx.quadraticCurveTo(cx - sKneeBW - calfBulge * 0.2, kneeY + (ankleY - kneeY) * 0.08, cx - sKneeBW, kneeY);
            // Back edge: knee → hip (hamstring)
            ctx.quadraticCurveTo(cx - sThighBW * 1.02, kneeY * 0.55, cx - sThighBW, kneeY * 0.35);
            ctx.quadraticCurveTo(cx - sHipHW * 0.98, kneeY * 0.12, cx - sHipHW, 0);
            ctx.closePath();
            ctx.fill();
            this._ucPaintLimbFormShadow(ctx, w, h);
            this._ucPaintLimbContactShadow(ctx, w, h, h * 0.10);
            this._ucApplyLegClothing(ctx, p, d, w, h, ankleY);
            ctx.stroke();

            // Knee cap detail
            ctx.strokeStyle = this._ucShadeColor(d.skin, -0.10);
            ctx.lineWidth = d.ow * 0.7;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(cx + sKneeFW * 0.3, kneeY, sKneeFW * 0.30, -0.5, Math.PI * 0.7);
            ctx.stroke();

            // Ankle bone
            ctx.beginPath();
            ctx.arc(cx, ankleY, sAnkleHW * 0.28, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 1;
            this._ucDrawHumanLikeLimbDetails(ctx, p, d, w, h, 'leg', d.view, side);
            return c;
        }

        // ── Front / Back view leg (symmetrical) ──
        const legMAmt = this._ucClampNum(d.muscle, 0, 100, 50) / 100;
        const hipHW = w * 0.46, thighHW = w * (0.42 + legMAmt * 0.12), kneeHW = w * 0.36;
        const calfHW = w * (0.28 + legMAmt * 0.20), ankleHW = w * 0.24;
        const calfT = kneeY + (ankleY - kneeY) * (0.38 - legMAmt * 0.16);
        const footW = w * 0.85, footHt = p.footH;
        const footInner = (side === 'right' || side === 'front') ? -1 : 1;

        ctx.fillStyle = d.skin;
        ctx.strokeStyle = d.outline;
        ctx.lineWidth = d.ow;

        ctx.beginPath();
        ctx.moveTo(cx - hipHW, 0);
        ctx.quadraticCurveTo(cx - thighHW * 1.02, kneeY * 0.4, cx - kneeHW, kneeY);
        ctx.quadraticCurveTo(cx - calfHW * 1.05, calfT, cx - ankleHW, ankleY);
        ctx.lineTo(cx - footW * 0.35 + footInner * footW * 0.05, ankleY);
        ctx.quadraticCurveTo(cx - footW * 0.4 + footInner * footW * 0.05, h, cx + footInner * footW * 0.1, h);
        ctx.lineTo(cx + footW * 0.35 - footInner * footW * 0.05, h);
        ctx.quadraticCurveTo(cx + footW * 0.4 - footInner * footW * 0.05, ankleY + footHt * 0.3, cx + ankleHW, ankleY);
        ctx.quadraticCurveTo(cx + calfHW * 1.05, calfT, cx + kneeHW, kneeY);
        ctx.quadraticCurveTo(cx + thighHW * 1.02, kneeY * 0.4, cx + hipHW, 0);
        ctx.closePath();
        ctx.fill();
        this._ucPaintLimbFormShadow(ctx, w, h);
        this._ucPaintLimbContactShadow(ctx, w, h, h * 0.10);
        this._ucApplyLegClothing(ctx, p, d, w, h, ankleY);
        ctx.stroke();

        // Knee + ankle details
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.10);
        ctx.lineWidth = d.ow * 0.7;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(cx, kneeY, kneeHW * 0.45, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + footInner * ankleHW * 0.2, ankleY, ankleHW * 0.25, 0, Math.PI * 2);
        ctx.stroke();

        // Toe lines
        ctx.lineWidth = d.ow * 0.5;
        const toeY = h - footHt * 0.15;
        const toeSpan = footW * 0.22;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * toeSpan + footInner * footW * 0.05, toeY);
            ctx.lineTo(cx + i * toeSpan + footInner * footW * 0.05, h - footHt * 0.05);
            ctx.stroke();
        }
        // Toe-tip separations + arch/instep shadow for a more foot-like shape.
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = this._ucShadeColor(d.skin, -0.16);
        for (let i = -1.5; i <= 1.5; i++) {
            ctx.beginPath();
            ctx.arc(cx + i * toeSpan * 0.5 + footInner * footW * 0.05, h - footHt * 0.04, footW * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = this._ucShadeColor(d.skin, -0.14);
        ctx.lineWidth = d.ow * 0.5;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - ankleHW * 0.8, ankleY + footHt * 0.25);
        ctx.quadraticCurveTo(cx + footInner * footW * 0.1, ankleY + footHt * 0.55, cx + footW * 0.2 - footInner * footW * 0.05, ankleY + footHt * 0.45);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Muscular calf definition
        if (this._ucIsMuscularBodyType(d)) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(cx, kneeY + (ankleY - kneeY) * 0.30, calfHW * 0.60, Math.PI * 0.2, Math.PI * 0.8);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        this._ucDrawHumanLikeLimbDetails(ctx, p, d, w, h, 'leg', d.view, side);
        return c;
    },

    // ════════════════════════════════════════════════════════════════
    //  Facial Feature Sub-Objects (for animation)
    // ════════════════════════════════════════════════════════════════

    /**
     * Create animatable facial feature overlay objects pinned to the head.
     * Each feature is a separate StageObject that can be swapped/transformed
     * by the facial animation system.
     */
    _ucGetSupportedFacialFeatureKeys(isSide = false) {
        return new Set(isSide
            ? ['eye-right', 'brow-right', 'mouth']
            : ['eye-left', 'eye-right', 'brow-left', 'brow-right', 'mouth']
        );
    },

    _ucPruneLegacyFacialFeatures(headObj, d = null) {
        if (!headObj || !this.objects?.objects) return false;

        const isSide = d?.view === 'side' || !!headObj?._facialProportions?.isSide;
        const allowedKeys = this._ucGetSupportedFacialFeatureKeys(isSide);
        const staleIds = new Set();
        const featureMap = (headObj._facialFeatures && typeof headObj._facialFeatures === 'object')
            ? headObj._facialFeatures
            : {};

        Object.entries(featureMap).forEach(([key, objId]) => {
            if (!allowedKeys.has(key)) {
                if (objId) staleIds.add(objId);
                delete featureMap[key];
            }
        });

        this.objects.objects.forEach(obj => {
            if (!obj || obj._facialParentHead !== headObj.id) return;
            const explicitKey = String(obj._facialFeatureKey || '').trim();
            const namedKey = String(obj.name || '').replace(/^Face:\s*/i, '').trim();
            const inferredKey = explicitKey || namedKey;
            if (!inferredKey || !allowedKeys.has(inferredKey)) {
                staleIds.add(obj.id);
            }
        });

        if (!staleIds.size) return false;

        staleIds.forEach(id => this.objects.removeObject(id));

        if (!headObj._facialFeatures || typeof headObj._facialFeatures !== 'object') {
            headObj._facialFeatures = {};
            return true;
        }

        Object.entries(headObj._facialFeatures).forEach(([key, objId]) => {
            if (staleIds.has(objId) || !this.objects.getObjectById(objId)) {
                delete headObj._facialFeatures[key];
            }
        });
        return true;
    },

    _ucGetFacialFeatureLayout(p, d, headW = p.headW, headH = p.headH) {
        const headRx = headW * 0.46;
        const fsc = p.faceScale;
        const isSide = d.view === 'side';


        // Feature definitions — each drawn on its own small canvas
        const features = [];

        if (isSide) {
            // Side head art is authored in a right-facing profile. Left-facing side
            // characters use mirrored anchors; right-facing side characters keep the
            // native profile anchors so pinned features stay attached to the face.
            const sideEngine = this._ucResolveCharacterEngine(d);
            const humanLikeFace = this._ucIsHumanLikeQuality(d.qualityPreset);
            const sideFace = this._ucGetSideFaceProfile(d, humanLikeFace);
            const sideMouthSize = this._ucClampNum(d.sideMouthScale, 60, 160, 100) / 100;
            const eyeSize = this._ucClampNum(d.eyeScale, 60, 140, 100) / 100;
            const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);
            const refined = d.qualityPreset === 'refined';
            const refinedMetrics = refined ? this._ucRefinedSideLandmarks(d) : null;
            const sideLipFrontX = refined ? refinedMetrics.lipX : (sideEngine === 'advanced' ? (humanLikeFace ? 0.660 : 0.615) : 0.636) * sideFace.lipFrontX;
            const sideMouthVisualX = sideLipFrontX - (refined ? 0.032 : 0.040);
            const useMirroredSideAnchors = String(d?.sideFacing || 'right').toLowerCase() !== 'right';
            const sideRatioX = (ratio) => useMirroredSideAnchors ? (1 - ratio) : ratio;
            const sideAnchors = {
                eyeX: sideRatioX(refined ? refinedMetrics.eyeX : 0.575 * sideFace.browX),
                browX: sideRatioX(refined ? refinedMetrics.eyeX : 0.575 * sideFace.browX),
                mouthX: sideRatioX(sideMouthVisualX)
            };
            const placeSideFeature = (key, centerRatioX, centerRatioY, width, height, draw) => ({
                key,
                x: headW * centerRatioX - width / 2,
                y: headH * centerRatioY - height / 2,
                w: width,
                h: height,
                draw: (ctx, fw, fh) => {
                    ctx.save();
                    if (useMirroredSideAnchors) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
                    draw(ctx, fw, fh);
                    ctx.restore();
                }
            });
            const featureAgeScale = (d.ageGroup === 'neonate' || d.ageGroup === 'child') ? 1.10 : (d.ageGroup === 'elderly' ? 0.95 : 1);
            const featureGenderScale = d.gender === 'female' ? 0.94 : (d.gender === 'male' ? 1.04 : 1);
            const eyeW = Math.ceil((refined ? headW * 0.15 : headRx * (humanLikeFace ? 0.34 : 0.36)) * featureAgeScale * featureGenderScale * eyeSize * eyeTypeProfile.width);
            const eyeH = Math.ceil((refined ? headH * 0.13 : headRx * (humanLikeFace ? 0.19 : 0.20)) * featureAgeScale * eyeSize * eyeTypeProfile.height);
            const browW = Math.ceil((refined ? headW * 0.17 : headRx * (humanLikeFace ? 0.42 : 0.46)) * featureGenderScale);
            const browH = Math.ceil((refined ? headH * 0.06 : headRx * (humanLikeFace ? 0.15 : 0.16)) * (d.gender === 'female' ? 0.88 : 1.05));
            const mouthW = Math.ceil(headW * (refined ? 0.125 : 0.14) * (d.gender === 'female' ? 0.92 : 1.04) * (d.ageGroup === 'child' ? 0.94 : 1) * sideMouthSize);
            const mouthH = Math.ceil((refined ? headH * 0.14 : headRx * (humanLikeFace ? 0.24 : 0.28)) * (d.gender === 'female' ? 0.92 : 1.02) * sideMouthSize);
            features.push(placeSideFeature(
                'eye-right',
                sideAnchors.eyeX,
                refined ? refinedMetrics.eyeY : (humanLikeFace ? 0.410 : 0.405) * sideFace.eyeY,
                eyeW,
                eyeH,
                (ctx, fw, fh) => this._ucDrawSideEyeFeature(ctx, fw, fh, d, 'open')
            ));
            features.push(placeSideFeature(
                'brow-right',
                sideAnchors.browX,
                refined ? refinedMetrics.browY : (humanLikeFace ? 0.330 : 0.315) * sideFace.foreheadY,
                browW,
                browH,
                (ctx, fw, fh) => this._ucDrawSideBrowFeature(ctx, fw, fh, d, 'neutral')
            ));
            features.push(placeSideFeature(
                'mouth',
                sideAnchors.mouthX,
                refined ? refinedMetrics.mouthY : (humanLikeFace ? 0.665 : 0.675) * sideFace.mouthY,
                mouthW,
                mouthH,
                (ctx, fw, fh) => this._ucDrawSideMouthFeature(ctx, fw, fh, d, 'neutral')
            ));
        } else {
            const humanLikeFace = this._ucIsHumanLikeQuality(d.qualityPreset);
            const isFrontThreeQuarter = d.view === 'front-3q';
            const qSign = this._ucThreeQuarterSign(d.view, d.sideFacing);
            const eyeSize = this._ucClampNum(d.eyeScale, 60, 140, 100) / 100;
            const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);
            const frontMouthSize = this._ucClampNum(d.frontMouthScale, 60, 160, 100) / 100;
            const eyeSpacing = headRx * (humanLikeFace ? 0.47 : 0.52);
            const effectiveEyeSpacing = eyeSpacing;
            const eyeW = Math.ceil(headRx * (humanLikeFace ? 0.46 : 0.56) * eyeSize * eyeTypeProfile.width);
            const eyeH = Math.ceil(headRx * (humanLikeFace ? 0.22 : 0.30) * eyeSize * eyeTypeProfile.height);
            const eyeDrawCtx = isFrontThreeQuarter
                ? { ...d, gazeX: qSign * 0.55, gazeY: 0 }
                : d;
            // Keep the animated eye/brow anchors on the same row as the base
            // head artwork. Advanced heads keep the painted eye row fixed while
            // faceScale changes feature drawing size; classic heads scale both.
            const featureEngine = this._ucResolveCharacterEngine(d);
            const eyeY = headH * (humanLikeFace ? (featureEngine === 'advanced' ? 0.435 : 0.455) : 0.45) * (featureEngine === 'classic' ? fsc : 1);
            const faceCenterX = headW / 2;
            const leftEyeScale = 1;
            const rightEyeScale = 1;
            const leftEyeW = Math.max(1, Math.ceil(eyeW * leftEyeScale));
            const rightEyeW = Math.max(1, Math.ceil(eyeW * rightEyeScale));

            features.push({
                key: 'eye-left',
                x: faceCenterX - effectiveEyeSpacing - leftEyeW / 2, y: eyeY - eyeH / 2,
                w: leftEyeW, h: eyeH,
                draw: (ctx, fw, fh) => this._ucDrawEye(ctx, fw, fh, eyeDrawCtx, 'open', fsc)
            });
            features.push({
                key: 'eye-right',
                x: faceCenterX + effectiveEyeSpacing - rightEyeW / 2, y: eyeY - eyeH / 2,
                w: rightEyeW, h: eyeH,
                draw: (ctx, fw, fh) => this._ucDrawEye(ctx, fw, fh, eyeDrawCtx, 'open', fsc)
            });

            const browW = Math.ceil(headRx * (humanLikeFace ? 0.52 : 0.60));
            const browH = Math.ceil(headRx * (humanLikeFace ? 0.13 : 0.16));
            features.push({
                key: 'brow-left',
                x: faceCenterX - effectiveEyeSpacing - (browW * leftEyeScale) / 2, y: eyeY - eyeH / 2 - browH * (humanLikeFace ? 1.12 : 1.3),
                w: Math.max(1, Math.ceil(browW * leftEyeScale)), h: browH,
                draw: (ctx, fw, fh) => this._ucDrawBrow(ctx, fw, fh, d, fsc)
            });
            features.push({
                key: 'brow-right',
                x: faceCenterX + effectiveEyeSpacing - (browW * rightEyeScale) / 2, y: eyeY - eyeH / 2 - browH * (humanLikeFace ? 1.12 : 1.3),
                w: Math.max(1, Math.ceil(browW * rightEyeScale)), h: browH,
                draw: (ctx, fw, fh) => this._ucDrawBrow(ctx, fw, fh, d, fsc)
            });

            const mouthW = Math.ceil(headRx * (humanLikeFace ? 0.54 : 0.72) * frontMouthSize);
            const mouthH = Math.ceil(headRx * (humanLikeFace ? 0.18 : 0.24) * frontMouthSize);
            const mouthScale = 1;
            features.push({
                key: 'mouth',
                x: faceCenterX - (mouthW * mouthScale) / 2,
                y: headH * (featureEngine === 'advanced' ? (humanLikeFace ? 0.772 : 0.75) : (humanLikeFace ? 0.715 : 0.73)) - mouthH / 2,
                w: Math.max(1, Math.ceil(mouthW * mouthScale)), h: mouthH,
                draw: (ctx, fw, fh) => this._ucDrawMouth(ctx, fw, fh, d, 'neutral', fsc)
            });
        }

        if (d.view === 'front-3q') {
            const sign = this._ucThreeQuarterSign(d.view, d.sideFacing);
            for (const feature of features) {
                const centerX = feature.x + feature.w / 2;
                const centerY = feature.y + feature.h / 2;
                feature.w *= .94;
                feature.x = headW / 2 + .94 * (centerX - headW / 2 + sign * headW * .015)
                    + sign * .08 * (centerY - headH * .52) - feature.w / 2;
            }
        }
        return features;
    },

    _ucCreateFacialFeatures(headObj, p, d) {
        if (!headObj || this._ucIsBackFamilyView(d.view)) return;
        this._ucPruneLegacyFacialFeatures(headObj, d);
        const previousFeatures = headObj._facialFeatures || {};
        headObj._facialFeatures = {};
        headObj._facialDrawCtx = d;
        const headW = headObj.width, headH = headObj.height - p.neckH;
        const headRx = headW * .46, headRy = headH * .44, fsc = p.faceScale;
        const isSide = d.view === 'side';
        const features = this._ucGetFacialFeatureLayout(p, d, headW, headH);
        if (headObj.scaleX < 0) features.forEach(feature => { feature.x = headW - feature.x - feature.w; });
        // Preserve feature IDs so existing speech tracks still target the same mouth.
        const _prevSuppressFacial = this.objects._suppressHistory;
        this.objects._suppressHistory = true;
        try {
        features.forEach(feat => {
            const fc = document.createElement('canvas');
            fc.width = Math.ceil(feat.w * 3); fc.height = Math.ceil(feat.h * 3);
            const fctx = fc.getContext('2d');
            fctx.scale(fc.width / feat.w, fc.height / feat.h);
            feat.draw(fctx, feat.w, feat.h);

            const dataUrl = fc.toDataURL('image/png');
            const existing = this.objects.getObjectById(previousFeatures[feat.key]);
            const featureObj = existing || new StageObject('image', {
                x: headObj.x + feat.x,
                y: headObj.y + feat.y,
                width: feat.w, height: feat.h,
                name: 'Face: ' + feat.key, layer: headObj.layer + 1, opacity: 1
            });
            featureObj.width = feat.w; featureObj.height = feat.h;
            featureObj.imageSrc = dataUrl;
            featureObj.loadImage(dataUrl, { preserveDimensions: true });
            if (!existing) this.objects.addObject(featureObj);
            featureObj.pivotX = 0.5;
            featureObj.pivotY = 0.5;
            featureObj._facialFeatureKey = feat.key;
            featureObj._facialParentHead = headObj.id;
            featureObj._facialLocalRect = {
                x: feat.x,
                y: feat.y,
                w: feat.w,
                h: feat.h
            };
            featureObj._facialUseAnchorPin = false;
            this._ucConfigureFacialFeaturePin(headObj, featureObj, feat);

            headObj._facialFeatures[feat.key] = featureObj.id;
        });
        } finally {
            this.objects._suppressHistory = _prevSuppressFacial;
        }

        // Store expression state
        headObj._facialExpression = 'neutral';
        headObj._facialDrawCtx = d;
        headObj._facialProportions = {
            headW: headObj.width, headH,
            headRx, headRy, faceScale: fsc, isSide, layoutVersion: 2
        };

        if (this.objects._resolvePins) this.objects._resolvePins();
    },

    _ucGetFacialJointPinReference(headObj) {
        if (!headObj || !Array.isArray(headObj.joints) || !headObj.joints.length) return null;
        const joint = headObj.joints.find(candidate => String(candidate?.name || '').toLowerCase() === 'neck') || headObj.joints[0];
        if (!joint) return null;
        const direction = StageObject.getJointDirectionMeta(headObj.jointDirection);
        const axisRatio = direction.isReverse ? 1 - joint.position : joint.position;
        return {
            joint,
            x: direction.isVertical ? headObj.width * (joint.crossOffset ?? 0.5) : headObj.width * axisRatio,
            y: direction.isVertical ? headObj.height * axisRatio : headObj.height * (joint.crossOffset ?? 0.5)
        };
    },

    _ucConfigureFacialFeaturePin(headObj, featureObj, featureRect = null) {
        if (!headObj || !featureObj) return false;

        const jointRef = this._ucGetFacialJointPinReference(headObj);
        const derivedLocalRect = !featureRect
            && !featureObj._facialLocalRect
            && jointRef
            && Number.isFinite(featureObj._facialBasePinOffsetX)
            && Number.isFinite(featureObj._facialBasePinOffsetY)
            ? {
                x: jointRef.x + featureObj._facialBasePinOffsetX - featureObj.width / 2,
                y: jointRef.y + featureObj._facialBasePinOffsetY - featureObj.height / 2,
                w: featureObj.width,
                h: featureObj.height
            }
            : null;
        const localRect = featureRect || featureObj._facialLocalRect || derivedLocalRect || null;
        // Turnaround mirrors this rectangle once. Rebinding must be idempotent.
        const mirroredLocalRect = localRect;
        const featureCenterLocalX = mirroredLocalRect
            ? (mirroredLocalRect.x + mirroredLocalRect.w / 2)
            : ((featureObj.x - headObj.x) + featureObj.width / 2);
        const featureCenterLocalY = mirroredLocalRect
            ? (mirroredLocalRect.y + mirroredLocalRect.h / 2)
            : ((featureObj.y - headObj.y) + featureObj.height / 2);

        if (mirroredLocalRect && Number.isFinite(headObj.width) && headObj.width > 0) {
            featureObj._facialBasePinOffsetX = featureCenterLocalX - (jointRef?.x ?? (headObj.width * 0.5));
        }
        if (mirroredLocalRect && Number.isFinite(headObj.height) && headObj.height > 0) {
            featureObj._facialBasePinOffsetY = featureCenterLocalY - (jointRef?.y ?? (headObj.height * 0.5));
        }

        if (mirroredLocalRect && !featureObj._facialLocalRect) {
            featureObj._facialLocalRect = {
                x: mirroredLocalRect.x,
                y: mirroredLocalRect.y,
                w: mirroredLocalRect.w,
                h: mirroredLocalRect.h
            };
        } else if (mirroredLocalRect && featureObj._facialLocalRect) {
            featureObj._facialLocalRect.x = mirroredLocalRect.x;
            featureObj._facialLocalRect.y = mirroredLocalRect.y;
            featureObj._facialLocalRect.w = mirroredLocalRect.w;
            featureObj._facialLocalRect.h = mirroredLocalRect.h;
        }

        featureObj.pinnedTo = headObj.id;
        featureObj.pinRotationMode = 'inherit';
        featureObj.pinInheritRotation = true;

        if (jointRef?.joint) {
            featureObj.pinTargetType = 'joint';
            featureObj.pinJointId = jointRef.joint.id;
            featureObj.pinJointName = jointRef.joint.name;
            featureObj.pinAnchorX = 0.5;
            featureObj.pinAnchorY = 0.5;
            featureObj._facialBasePinOffsetX = featureCenterLocalX - jointRef.x;
            featureObj._facialBasePinOffsetY = featureCenterLocalY - jointRef.y;
            featureObj.pinOffsetX = featureObj._facialBasePinOffsetX;
            featureObj.pinOffsetY = featureObj._facialBasePinOffsetY;
        } else {
            featureObj.pinTargetType = 'anchor';
            featureObj.pinJointId = null;
            featureObj.pinJointName = null;
            featureObj.pinAnchorX = featureCenterLocalX / Math.max(1, headObj.width);
            featureObj.pinAnchorY = featureCenterLocalY / Math.max(1, headObj.height);
            featureObj._facialBasePinOffsetX = featureCenterLocalX - (jointRef?.x ?? (headObj.width * 0.5));
            featureObj._facialBasePinOffsetY = featureCenterLocalY - (jointRef?.y ?? (headObj.height * 0.5));
            featureObj.pinOffsetX = featureObj._facialBasePinOffsetX;
            featureObj.pinOffsetY = featureObj._facialBasePinOffsetY;
        }

        const sideFlippedOffset = this._ucGetSideFlippedFacialFeatureOffset(headObj, featureObj);
        if (sideFlippedOffset) {
            featureObj._facialBasePinOffsetX = sideFlippedOffset.x;
            featureObj._facialBasePinOffsetY = sideFlippedOffset.y;
            featureObj.pinOffsetX = sideFlippedOffset.x;
            featureObj.pinOffsetY = sideFlippedOffset.y;
        }

        featureObj._facialBaseRotation = featureObj.rotation || 0;
        return true;
    },

    _ucGetSideFlippedFacialFeatureOffset(headObj, featureObj) {
        if (!headObj || !featureObj) return null;
        // Refined features use proportional local rectangles, not the legacy
        // fixed-pixel offsets that drift when a head is resized or flipped.
        if (featureObj._facialLocalRect || headObj._facialDrawCtx?.qualityPreset === 'refined') return null;
        const drawCtx = headObj._facialDrawCtx || null;
        const proportions = headObj._facialProportions || null;
        const isSideHead = !!proportions?.isSide
            || drawCtx?.view === 'side'
            || (Number.isFinite(headObj.width) && Number.isFinite(headObj.height) && headObj.width > headObj.height * 1.05);
        const isFlipped = Number.isFinite(headObj.scaleX) && headObj.scaleX < 0;
        if (!isSideHead) return null;

        const key = String(featureObj._facialFeatureKey || featureObj.name || '')
            .replace(/^Face:\s*/i, '')
            .trim()
            .toLowerCase();
        const flippedOffsets = {
            mouth: { x: -17, y: -41 },
            'brow-right': { x: -17, y: -74 },
            'eye-right': { x: -24, y: -68 }
        };
        const normalOffsets = {
            mouth: { x: 22, y: -41 },
            'brow-right': { x: 27, y: -75 },
            'eye-right': { x: 27, y: -67 }
        };
        const offsets = isFlipped ? flippedOffsets : normalOffsets;
        const offset = offsets[key];
        if (!offset) return null;
        // Legacy anchors are authored in the original head's pixel dimensions.
        const scale = Number.isFinite(proportions?.headW) && proportions.headW > 0
            && Number.isFinite(headObj.width) && headObj.width > 0 ? headObj.width / proportions.headW : 1;
        return { x: offset.x * scale, y: offset.y * scale };
    },

    _ucNormalizeFacialFeaturePins(headObj) {
        if (!headObj || !this.objects) return false;
        let changed = false;
        Object.values(headObj._facialFeatures || {}).forEach(objId => {
            const featureObj = this.objects.getObjectById(objId);
            if (!featureObj) return;
            featureObj._facialUseAnchorPin = false;
            const previousTargetType = featureObj.pinTargetType;
            const previousJointName = featureObj.pinJointName;
            this._ucConfigureFacialFeaturePin(headObj, featureObj);
            if (featureObj.pinTargetType !== previousTargetType || featureObj.pinJointName !== previousJointName) {
                changed = true;
            }
        });
        if (changed && this.objects._resolvePins) this.objects._resolvePins();
        return changed;
    },

    // ── Individual facial feature drawing helpers ──

    _ucDrawEye(ctx, w, h, d, state, fsc) {
        const cx = w / 2, cy = h / 2;
        const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);
        const eyeRx = w * 0.42 * eyeTypeProfile.width;
        const eyeRy = h * 0.38 * eyeTypeProfile.height;
        const eyeColor = this._ucGetEyeColor(d);
        const sclera = this._ucGetScleraColor(d);
        const baseIrisDx = Utils.clamp(Number(d?.gazeX || 0), -1, 1) * eyeRx * 0.30;
        const baseIrisDy = Utils.clamp(Number(d?.gazeY || 0), -1, 1) * eyeRy * 0.22;
        const drawOpenEye = (irisDx = 0, irisDy = 0, wideScale = 1) => {
            const openRy = eyeRy * wideScale;
            const path = new Path2D();
            path.moveTo(cx - eyeRx, cy);
            path.quadraticCurveTo(cx - eyeRx * 0.24, cy - openRy * eyeTypeProfile.upper + openRy * eyeTypeProfile.lidDrop, cx, cy - openRy * 0.72 * eyeTypeProfile.upper + openRy * eyeTypeProfile.lidDrop);
            path.quadraticCurveTo(cx + eyeRx * 0.24, cy - openRy * eyeTypeProfile.upper + openRy * eyeTypeProfile.lidDrop, cx + eyeRx, cy);
            path.quadraticCurveTo(cx + eyeRx * 0.24, cy + openRy * 0.86 * eyeTypeProfile.lower, cx, cy + openRy * 0.62 * eyeTypeProfile.lower);
            path.quadraticCurveTo(cx - eyeRx * 0.24, cy + openRy * 0.86 * eyeTypeProfile.lower, cx - eyeRx, cy);
            path.closePath();
            ctx.fillStyle = sclera;
            ctx.fill(path);
            ctx.strokeStyle = d.outline;
            ctx.lineWidth = d.ow * 0.6;
            ctx.stroke(path);
            ctx.save();
            ctx.clip(path);
            const irisR = openRy * 0.62 * eyeTypeProfile.iris;
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(cx + irisDx, cy + openRy * 0.05 + irisDy, irisR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(cx + irisDx, cy + openRy * 0.05 + irisDy, irisR * 0.53, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx + irisDx - openRy * 0.15, cy + irisDy - openRy * 0.10, openRy * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        ctx.clearRect(0, 0, w, h);

        switch (state) {
            case 'closed':
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 1.2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - eyeRx, cy);
                ctx.quadraticCurveTo(cx, cy + eyeRy * 0.6, cx + eyeRx, cy);
                ctx.stroke();
                break;
            case 'half':
                ctx.fillStyle = sclera;
                ctx.beginPath();
                ctx.ellipse(cx, cy + eyeRy * 0.2, eyeRx, eyeRy * 0.50, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 0.6;
                ctx.stroke();
                ctx.fillStyle = eyeColor;
                ctx.beginPath();
                ctx.arc(cx, cy + eyeRy * 0.25, eyeRy * 0.45, 0, Math.PI * 2);
                ctx.fill();
                // Eyelid line
                ctx.strokeStyle = d.skin;
                ctx.lineWidth = eyeRy * 0.45;
                ctx.beginPath();
                ctx.moveTo(cx - eyeRx * 1.1, cy - eyeRy * 0.6);
                ctx.lineTo(cx + eyeRx * 1.1, cy - eyeRy * 0.6);
                ctx.stroke();
                break;
            case 'wide':
                drawOpenEye(baseIrisDx, baseIrisDy, 1.18);
                break;
            case 'smile':
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 1.35;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - eyeRx, cy + eyeRy * 0.08);
                ctx.quadraticCurveTo(cx, cy + eyeRy * 0.85, cx + eyeRx, cy + eyeRy * 0.08);
                ctx.stroke();
                break;
            case 'squint':
                ctx.fillStyle = sclera;
                ctx.beginPath();
                ctx.ellipse(cx, cy + eyeRy * 0.10, eyeRx, eyeRy * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 0.8;
                ctx.stroke();
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 1.0;
                ctx.beginPath();
                ctx.moveTo(cx - eyeRx * 1.05, cy - eyeRy * 0.20);
                ctx.lineTo(cx + eyeRx * 1.05, cy - eyeRy * 0.02);
                ctx.stroke();
                ctx.fillStyle = '#1A1A1A';
                ctx.beginPath();
                ctx.arc(cx, cy + eyeRy * 0.12, eyeRy * 0.28, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'sad':
                ctx.fillStyle = sclera;
                ctx.beginPath();
                ctx.ellipse(cx, cy + eyeRy * 0.10, eyeRx * 0.96, eyeRy * 0.58, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 0.7;
                ctx.stroke();
                ctx.fillStyle = eyeColor;
                ctx.beginPath();
                ctx.arc(cx, cy + eyeRy * 0.22, eyeRy * 0.46, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 0.9;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - eyeRx * 1.0, cy - eyeRy * 0.18);
                ctx.quadraticCurveTo(cx, cy - eyeRy * 0.52, cx + eyeRx * 1.0, cy - eyeRy * 0.04);
                ctx.stroke();
                break;
            case 'tear':
                this._ucDrawEye(ctx, w, h, d, 'sad', fsc);
                ctx.fillStyle = 'rgba(125, 211, 252, 0.92)';
                ctx.beginPath();
                ctx.moveTo(cx + eyeRx * 0.72, cy + eyeRy * 0.28);
                ctx.quadraticCurveTo(cx + eyeRx * 0.98, cy + eyeRy * 0.78, cx + eyeRx * 0.68, cy + eyeRy * 1.12);
                ctx.quadraticCurveTo(cx + eyeRx * 0.36, cy + eyeRy * 0.78, cx + eyeRx * 0.72, cy + eyeRy * 0.28);
                ctx.closePath();
                ctx.fill();
                break;
            case 'look-left':
            case 'look-right':
            case 'look-up':
            case 'look-down':
            case 'speech-left':
            case 'speech-right':
            case 'speech-up':
            case 'speech-down': {
                const isSpeechGaze = state.startsWith('speech-');
                const horizontal = isSpeechGaze ? eyeRx * 0.11 : eyeRx * 0.25;
                const vertical = isSpeechGaze ? eyeRy * 0.08 : eyeRy * 0.40;
                const dx = state.endsWith('left') ? -horizontal : state.endsWith('right') ? horizontal : 0;
                const dy = state.endsWith('up') ? -vertical : state.endsWith('down') ? vertical : 0;
                drawOpenEye(dx, dy, 1);
                break;
            }
            case 'roll': {
                ctx.fillStyle = sclera;
                ctx.beginPath();
                ctx.ellipse(cx, cy, eyeRx, eyeRy, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = d.outline;
                ctx.lineWidth = d.ow * 0.6;
                ctx.stroke();
                // Iris mostly hidden at top
                ctx.fillStyle = eyeColor;
                ctx.beginPath();
                ctx.arc(cx, cy - eyeRy * 0.45, eyeRy * 0.55, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            default: // 'open'
                drawOpenEye(baseIrisDx, baseIrisDy, 1);
        }
    },

    _ucDrawBrow(ctx, w, h, d, state = 'neutral', side = 'center', fsc) {
        const cx = w / 2, cy = h * 0.6;
        const browHW = w * 0.42;
        const isLeft = side === 'left';
        const isRight = side === 'right';
        let startY = cy + h * 0.08;
        let controlY = cy - h * 0.25;
        let endY = cy + h * 0.12;

        switch (state) {
            case 'raised':
                startY -= h * 0.12;
                controlY -= h * 0.18;
                endY -= h * 0.10;
                break;
            case 'lowered':
                startY += h * 0.10;
                controlY += h * 0.06;
                endY += h * 0.12;
                break;
            case 'angry-left':
                startY += isLeft ? h * 0.14 : h * 0.04;
                controlY -= h * 0.04;
                endY -= isLeft ? h * 0.10 : h * 0.02;
                break;
            case 'angry-right':
                startY += isRight ? h * 0.14 : h * 0.04;
                controlY -= h * 0.04;
                endY -= isRight ? h * 0.10 : h * 0.02;
                break;
            case 'sad-left':
                startY -= isLeft ? h * 0.10 : h * 0.02;
                controlY -= h * 0.08;
                endY += isLeft ? h * 0.14 : h * 0.06;
                break;
            case 'sad-right':
                startY -= isRight ? h * 0.10 : h * 0.02;
                controlY -= h * 0.08;
                endY += isRight ? h * 0.14 : h * 0.06;
                break;
            case 'skeptical-high':
                startY -= h * 0.18;
                controlY -= h * 0.16;
                endY -= h * 0.02;
                break;
            case 'skeptical-low':
                startY += h * 0.08;
                controlY += h * 0.02;
                endY += h * 0.10;
                break;
            default:
                break;
        }

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = d.hair;
        ctx.lineWidth = d.ow * 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - browHW, startY);
        ctx.quadraticCurveTo(cx, controlY, cx + browHW, endY);
        ctx.stroke();
    },

    _ucDrawLipSyncMouth(ctx, w, h, d = {}, channels = {}, side = false) {
        const clamp = (value, min = 0, max = 1) => this._ucClampNum(value, min, max, 0);
        const mouthOpen = clamp(channels.mouthOpen);
        const mouthWide = clamp(channels.mouthWide, -1, 1);
        const mouthRound = clamp(channels.mouthRound);
        const lipPress = clamp(channels.lipPress);
        const jawOpen = clamp(channels.jawOpen);
        const upperLipLift = clamp(channels.upperLipLift, -1, 1);
        const lowerLipDrop = clamp(channels.lowerLipDrop, -1, 1);
        const openingGain = this._ucClampNum(
            channels.mouthOpeningGain ?? d?._lipSyncMouthOpening,
            0.75,
            3.2,
            1.45
        );
        const openingScale = this._ucClampNum(0.84 + openingGain * 0.16, 0.94, 1.36, 1.07);
        const openness = clamp(Math.max(
            mouthOpen,
            jawOpen * 0.88,
            lowerLipDrop * 0.74,
            upperLipLift * 0.45
        ) * (1 - lipPress * 0.94));
        const viseme = String(d?._lipSyncViseme || '').toUpperCase();
        const lip = this._ucDeriveLipColor?.(d.skin || '#d9a066') || '#9e5b5b';
        const lowerLip = this._ucShadeColor?.(lip, -0.18) || lip;
        const cavity = '#21070b';
        const cx = w * (side ? 0.51 : 0.50);
        const cy = h * 0.50;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const closed = openness < 0.035 || lipPress > 0.78;
        if (closed) {
            const halfWidth = w * (side ? 0.25 : 0.34) * (1 + mouthWide * 0.16 - mouthRound * 0.12);
            const pressOffset = h * (0.008 + lipPress * 0.012);
            ctx.strokeStyle = lip;
            ctx.lineWidth = Math.max(1, h * (side ? 0.16 : 0.12));
            ctx.beginPath();
            ctx.moveTo(cx - halfWidth, cy - pressOffset);
            ctx.quadraticCurveTo(cx, cy + h * 0.018, cx + halfWidth, cy - pressOffset);
            ctx.stroke();
            if (lipPress > 0.42) {
                ctx.strokeStyle = lowerLip;
                ctx.lineWidth = Math.max(0.8, h * (side ? 0.08 : 0.07));
                ctx.beginPath();
                ctx.moveTo(cx - halfWidth * 0.88, cy + pressOffset);
                ctx.quadraticCurveTo(cx, cy + h * 0.035, cx + halfWidth * 0.88, cy + pressOffset);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        const widthFactor = this._ucClampNum(
            0.72 + mouthWide * 0.28 - mouthRound * 0.33,
            side ? 0.34 : 0.30,
            side ? 0.96 : 1.04,
            0.72
        );
        const halfWidth = w * (side ? 0.34 : 0.42) * widthFactor;
        const roundLift = mouthRound * h * (side ? 0.014 : 0.008);
        const centerX = cx + (side ? mouthRound * w * 0.045 : 0);
        const centerY = cy + lowerLipDrop * h * 0.018 - upperLipLift * h * 0.012 + roundLift;
        const baseHeight = side ? 0.27 : 0.32;
        const radiusY = Math.min(
            h * (side ? 0.49 : 0.52),
            h * (0.025 + openness * baseHeight + jawOpen * 0.055 + lowerLipDrop * 0.035) * openingScale
        );
        const upperExtent = radiusY * this._ucClampNum(0.82 + upperLipLift * 0.18, 0.68, 1.12, 0.82);
        const lowerExtent = radiusY * this._ucClampNum(1.02 + lowerLipDrop * 0.14 + jawOpen * 0.10, 0.9, 1.28, 1.02);
        const leftX = centerX - halfWidth;
        const rightX = centerX + halfWidth;

        ctx.beginPath();
        ctx.moveTo(leftX, centerY);
        ctx.bezierCurveTo(
            centerX - halfWidth * 0.48,
            centerY - upperExtent,
            centerX + halfWidth * 0.48,
            centerY - upperExtent,
            rightX,
            centerY
        );
        ctx.bezierCurveTo(
            centerX + halfWidth * 0.48,
            centerY + lowerExtent,
            centerX - halfWidth * 0.48,
            centerY + lowerExtent,
            leftX,
            centerY
        );
        ctx.closePath();
        ctx.fillStyle = cavity;
        ctx.fill();

        ctx.save();
        ctx.clip();
        const teethOpacity = viseme === 'FV'
            ? this._ucClampNum(0.48 + openness * 0.48, 0, 0.96, 0.7)
            : (viseme === 'E'
                ? this._ucClampNum(0.34 + mouthWide * 0.55, 0, 0.9, 0.55)
                : (viseme === 'L' ? 0.26 : 0));
        if (teethOpacity > 0.02) {
            ctx.globalAlpha = teethOpacity;
            ctx.fillStyle = '#fffdf8';
            ctx.beginPath();
            ctx.roundRect(
                centerX - halfWidth * 0.72,
                centerY - upperExtent * 0.86,
                halfWidth * 1.44,
                Math.max(1, upperExtent * (viseme === 'FV' ? 0.72 : 0.52)),
                Math.max(1, radiusY * 0.12)
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        const tongueOpacity = viseme === 'L' ? 0.82 : (viseme === 'A' && openness > 0.68 ? 0.18 : 0);
        if (tongueOpacity > 0.02) {
            ctx.globalAlpha = tongueOpacity;
            ctx.fillStyle = '#c97575';
            ctx.beginPath();
            ctx.ellipse(
                centerX + (side ? halfWidth * 0.10 : 0),
                centerY + lowerExtent * 0.58,
                halfWidth * (side ? 0.42 : 0.36),
                Math.max(1, lowerExtent * 0.28),
                side ? -0.05 : 0,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        const lipWidth = Math.max(1, h * (side ? 0.105 : 0.085));
        ctx.strokeStyle = lip;
        ctx.lineWidth = lipWidth;
        ctx.beginPath();
        ctx.moveTo(leftX, centerY);
        ctx.bezierCurveTo(
            centerX - halfWidth * 0.48,
            centerY - upperExtent,
            centerX + halfWidth * 0.48,
            centerY - upperExtent,
            rightX,
            centerY
        );
        ctx.stroke();
        ctx.strokeStyle = lowerLip;
        ctx.lineWidth = lipWidth * 1.08;
        ctx.beginPath();
        ctx.moveTo(leftX, centerY);
        ctx.bezierCurveTo(
            centerX - halfWidth * 0.48,
            centerY + lowerExtent,
            centerX + halfWidth * 0.48,
            centerY + lowerExtent,
            rightX,
            centerY
        );
        ctx.stroke();
        ctx.restore();
    },

    _ucDrawMouth(ctx, w, h, d, state, fsc) {
        if (state === 'lip-sync-frame' && d?._lipSyncMouthChannels) {
            this._ucDrawLipSyncMouth(ctx, w, h, d, d._lipSyncMouthChannels, false);
            return;
        }
        const cx = w / 2, cy = h / 2;
        const mouthHW = w * 0.42;
        const mouthHH = h * 0.35;
        const openingGain = this._ucClampNum(d?._lipSyncMouthOpening, 0.75, 3.2, 1.45);
        const openingScale = this._ucClampNum(0.72 + openingGain * 0.28, 0.9, 1.64, 1.13);
        const openingRadiusY = base => Math.min(h * 0.52, mouthHH * base * openingScale);

        ctx.clearRect(0, 0, w, h);

        switch (state) {
            case 'viseme-mbp':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.7;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW * 0.72, cy);
                ctx.quadraticCurveTo(cx, cy + mouthHH * 0.12, cx + mouthHW * 0.72, cy);
                ctx.stroke();
                break;
            case 'viseme-fv':
                ctx.fillStyle = '#26090D';
                ctx.beginPath();
                ctx.ellipse(cx, cy + mouthHH * 0.10, mouthHW * 0.69, openingRadiusY(0.26), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.roundRect(cx - mouthHW * 0.62, cy - mouthHH * 0.30, mouthHW * 1.24, mouthHH * 0.34, mouthHH * 0.10);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.15;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW * 0.72, cy + mouthHH * 0.08);
                ctx.quadraticCurveTo(cx, cy + mouthHH * 0.44, cx + mouthHW * 0.72, cy + mouthHH * 0.08);
                ctx.stroke();
                break;
            case 'viseme-l':
                ctx.fillStyle = '#26090D';
                ctx.beginPath();
                ctx.ellipse(cx, cy + mouthHH * 0.12, mouthHW * 0.46, openingRadiusY(0.48), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#C97575';
                ctx.beginPath();
                ctx.ellipse(cx, cy + mouthHH * 0.34, mouthHW * 0.24, mouthHH * 0.14, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'viseme-a':
                ctx.fillStyle = '#21070B';
                ctx.beginPath();
                ctx.ellipse(cx, cy, mouthHW * 0.54, openingRadiusY(0.90), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow;
                ctx.stroke();
                break;
            case 'viseme-e':
                ctx.fillStyle = '#26090D';
                ctx.beginPath();
                ctx.ellipse(cx, cy + mouthHH * 0.06, mouthHW * 0.78, openingRadiusY(0.38), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(cx - mouthHW * 0.48, cy - openingRadiusY(0.38) * 0.70, mouthHW * 0.96, mouthHH * 0.24);
                break;
            case 'viseme-o':
                ctx.fillStyle = '#21070B';
                ctx.beginPath();
                ctx.ellipse(cx, cy, mouthHW * 0.34, openingRadiusY(0.72), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.25;
                ctx.stroke();
                break;
            case 'open':
                ctx.fillStyle = '#4A1A1A';
                ctx.beginPath();
                ctx.ellipse(cx, cy, mouthHW * 0.5, mouthHH * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow;
                ctx.stroke();
                // Teeth hint
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(cx - mouthHW * 0.25, cy - mouthHH * 0.55, mouthHW * 0.5, mouthHH * 0.35);
                break;
            case 'wide-open': // Shocked / shouting
                ctx.fillStyle = '#3A0E0E';
                ctx.beginPath();
                ctx.ellipse(cx, cy, mouthHW * 0.55, mouthHH * 1.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow;
                ctx.stroke();
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(cx - mouthHW * 0.3, cy - mouthHH * 0.8, mouthHW * 0.6, mouthHH * 0.4);
                break;
            case 'smile':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy - mouthHH * 0.3);
                ctx.quadraticCurveTo(cx, cy + mouthHH * 1.2, cx + mouthHW, cy - mouthHH * 0.3);
                ctx.stroke();
                break;
            case 'grin':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy - mouthHH * 0.18);
                ctx.quadraticCurveTo(cx, cy + mouthHH * 1.35, cx + mouthHW, cy - mouthHH * 0.18);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,0.65)';
                ctx.lineWidth = Math.max(1, d.ow * 0.6);
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW * 0.58, cy + mouthHH * 0.28);
                ctx.lineTo(cx + mouthHW * 0.58, cy + mouthHH * 0.28);
                ctx.stroke();
                break;
            case 'frown':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy + mouthHH * 0.3);
                ctx.quadraticCurveTo(cx, cy - mouthHH * 0.8, cx + mouthHW, cy + mouthHH * 0.3);
                ctx.stroke();
                break;
            case 'talking': // Partially open, mid-speech shape
                ctx.fillStyle = '#4A1A1A';
                ctx.beginPath();
                ctx.ellipse(cx, cy + mouthHH * 0.1, mouthHW * 0.45, mouthHH * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow;
                ctx.stroke();
                break;
            case 'singing': // Rounded O
                ctx.fillStyle = '#3A0E0E';
                ctx.beginPath();
                ctx.arc(cx, cy, Math.min(mouthHW, mouthHH) * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow;
                ctx.stroke();
                break;
            case 'cry':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.3;
                ctx.lineCap = 'round';
                // Wavy frown
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy);
                ctx.quadraticCurveTo(cx - mouthHW * 0.5, cy + mouthHH * 0.5, cx, cy + mouthHH * 0.2);
                ctx.quadraticCurveTo(cx + mouthHW * 0.5, cy - mouthHH * 0.3, cx + mouthHW, cy);
                ctx.stroke();
                break;
            case 'smirk':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy + mouthHH * 0.10);
                ctx.quadraticCurveTo(cx - mouthHW * 0.12, cy + mouthHH * 0.40, cx + mouthHW * 0.10, cy + mouthHH * 0.02);
                ctx.quadraticCurveTo(cx + mouthHW * 0.55, cy - mouthHH * 0.52, cx + mouthHW, cy - mouthHH * 0.18);
                ctx.stroke();
                break;
            case 'grimace':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy);
                ctx.lineTo(cx + mouthHW, cy);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,0.70)';
                ctx.lineWidth = Math.max(1, d.ow * 0.45);
                for (let i = -2; i <= 2; i++) {
                    const tx = cx + i * mouthHW * 0.34;
                    ctx.beginPath();
                    ctx.moveTo(tx, cy - mouthHH * 0.30);
                    ctx.lineTo(tx, cy + mouthHH * 0.30);
                    ctx.stroke();
                }
                break;
            case 'pout':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.25;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW * 0.82, cy + mouthHH * 0.08);
                ctx.quadraticCurveTo(cx, cy + mouthHH * 0.86, cx + mouthHW * 0.82, cy + mouthHH * 0.08);
                ctx.stroke();
                break;
            case 'snarl':
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.25;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy + mouthHH * 0.06);
                ctx.quadraticCurveTo(cx - mouthHW * 0.22, cy + mouthHH * 0.44, cx, cy + mouthHH * 0.10);
                ctx.quadraticCurveTo(cx + mouthHW * 0.32, cy - mouthHH * 0.56, cx + mouthHW, cy - mouthHH * 0.12);
                ctx.stroke();
                break;
            default: // neutral
                ctx.strokeStyle = '#9E5B5B';
                ctx.lineWidth = d.ow * 1.2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx - mouthHW, cy);
                ctx.quadraticCurveTo(cx, cy + mouthHH * 0.35, cx + mouthHW, cy);
                ctx.stroke();
        }
    },

    // ════════════════════════════════════════════════════════════════
    //  Facial Expression System
    // ════════════════════════════════════════════════════════════════

    _ucGetFacialRenderCache(headObj) {
        if (!headObj) return null;
        if (!(headObj._facialRenderCache instanceof Map)) {
            headObj._facialRenderCache = new Map();
            headObj._facialRenderCacheOrder = [];
        }
        if (!Array.isArray(headObj._facialRenderCacheOrder)) {
            headObj._facialRenderCacheOrder = [];
        }
        return headObj._facialRenderCache;
    },

    _ucGetFacialRenderStyleSignature(d, fsc) {
        if (!d) return 'facial-style:default';
        const eyeColor = this._ucGetEyeColor(d);
        const outlineWidth = Number.isFinite(d.ow) ? Number(d.ow).toFixed(2) : 'na';
        const faceScale = Number.isFinite(fsc) ? Number(fsc).toFixed(3) : '1.000';
        return [
            'v3',
            String(d.view || 'front'),
            String(d.gender || 'neutral'),
            String(d.ageGroup || 'adult'),
            String(d.qualityPreset || ''),
            String(d.eyeType || 'almond'),
            String(d.skin || ''),
            String(d.hair || ''),
            String(d.outline || ''),
            String(eyeColor || ''),
            outlineWidth,
            faceScale,
            this._ucClampNum(d.frontNoseScale, 60, 160, 100),
            this._ucClampNum(d.frontMouthScale, 60, 160, 100),
            this._ucClampNum(d.sideNoseScale, 60, 160, 100),
            this._ucClampNum(d.sideMouthScale, 60, 160, 100),
            this._ucClampNum(d.eyeScale, 60, 140, 100)
        ].join('|');
    },

    _ucGetFacialApplySignature(headObj, expression, styleSignature) {
        const featureSignature = Object.entries(headObj?._facialFeatures || {})
            .map(([key, objId]) => {
                const obj = this.objects?.getObjectById?.(objId);
                if (!obj) return `${key}:missing`;
                return `${key}:${obj.id}:${Math.round(obj.width || 0)}x${Math.round(obj.height || 0)}`;
            })
            .sort()
            .join(',');
        return `${expression}|${styleSignature}|${featureSignature}`;
    },

    _ucResolveFacialFeatureVisualSpec(key, expr, getSide) {
        if (!key || !expr) return null;
        if (key.startsWith('eye-')) {
            const side = getSide(key);
            return {
                type: 'eye',
                state: expr.eyes?.[side] || expr.eye || 'open',
                variant: side
            };
        }
        if (key.startsWith('brow-')) {
            const side = getSide(key);
            return {
                type: 'brow',
                state: expr.brows?.[side] || expr.brow || 'neutral',
                variant: side
            };
        }
        if (key === 'mouth') {
            return {
                type: 'mouth',
                state: expr.mouth || 'neutral',
                variant: 'center'
            };
        }
        return null;
    },

    _ucBuildFacialFeatureCacheKey(featureObj, spec, styleSignature) {
        return [
            spec?.type || 'unknown',
            spec?.variant || 'center',
            spec?.state || 'neutral',
            styleSignature || 'facial-style:default',
            Math.round(featureObj?.width || 0),
            Math.round(featureObj?.height || 0)
        ].join('|');
    },

    _ucDrawSideEyeFeature(ctx, w, h, d = {}, state = 'open') {
        const eyeTypeProfile = this._ucGetEyeTypeProfile(d.eyeType);
        const eyeColor = this._ucGetEyeColor(d);
        const sclera = this._ucGetScleraColor(d);
        const socket = this._ucDeriveSocketShadow(d.skin || '#d9a066');
        const cx = w * 0.48;
        const cy = h * 0.52;
        const rx = w * 0.46 * eyeTypeProfile.width;
        const baseRy = h * 0.30 * eyeTypeProfile.height;
        const stateName = String(state || 'open');
        const closed = stateName === 'closed' || stateName === 'blink';
        const half = stateName === 'half' || stateName === 'sad' || stateName === 'squint';
        const wide = stateName === 'wide';
        const ry = baseRy * (wide ? 1.12 : half ? 0.58 : 0.88);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (closed) {
            ctx.strokeStyle = d.outline || '#1f2937';
            ctx.lineWidth = Math.max(1, h * 0.16);
            ctx.beginPath();
            ctx.moveTo(cx - rx * 0.88, cy);
            ctx.quadraticCurveTo(cx - rx * 0.10, cy + ry * 0.34, cx + rx * 0.92, cy - ry * 0.02);
            ctx.stroke();
            ctx.restore();
            return;
        }

        const path = new Path2D();
        path.moveTo(cx - rx, cy + ry * 0.02);
        path.quadraticCurveTo(cx - rx * 0.24, cy - ry * eyeTypeProfile.upper, cx + rx * 0.58, cy - ry * 0.34);
        path.quadraticCurveTo(cx + rx * 0.96, cy - ry * 0.10, cx + rx * 1.04, cy + ry * 0.08);
        path.quadraticCurveTo(cx + rx * 0.22, cy + ry * eyeTypeProfile.lower, cx - rx, cy + ry * 0.02);
        path.closePath();
        ctx.fillStyle = sclera;
        ctx.fill(path);
        ctx.save();
        ctx.clip(path);
        const isSpeechGaze = stateName.startsWith('speech-');
        const horizontalGaze = isSpeechGaze ? rx * 0.08 : rx * 0.18;
        const verticalGaze = isSpeechGaze ? ry * 0.07 : ry * 0.36;
        let gazeDx = 0;
        if (stateName.endsWith('left')) gazeDx = -horizontalGaze;
        else if (stateName.endsWith('right')) gazeDx = horizontalGaze;
        const irisX = cx + rx * 0.38 + gazeDx;
        const irisY = cy + (stateName.endsWith('up') ? -verticalGaze : stateName.endsWith('down') ? verticalGaze : ry * 0.06);
        const irisR = Math.max(1, ry * 0.72 * eyeTypeProfile.iris);
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#161616';
        ctx.beginPath();
        ctx.arc(irisX, irisY, irisR * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(irisX - irisR * 0.24, irisY - irisR * 0.26, irisR * 0.18, 0, Math.PI * 2);
        ctx.fill();
        const lid = ctx.createLinearGradient(0, cy - ry, 0, cy + ry * 0.2);
        lid.addColorStop(0, this._ucWithAlpha(socket, half ? 0.58 : 0.34));
        lid.addColorStop(1, this._ucWithAlpha(socket, 0));
        ctx.fillStyle = lid;
        ctx.fill(path);
        ctx.restore();

        ctx.strokeStyle = d.outline || '#1f2937';
        ctx.lineWidth = Math.max(1, h * 0.12);
        ctx.beginPath();
        ctx.moveTo(cx - rx, cy + ry * 0.02);
        ctx.quadraticCurveTo(cx - rx * 0.24, cy - ry * eyeTypeProfile.upper, cx + rx * 0.58, cy - ry * 0.34);
        ctx.quadraticCurveTo(cx + rx * 0.96, cy - ry * 0.10, cx + rx * 1.04, cy + ry * 0.08);
        ctx.stroke();
        ctx.restore();
    },

    _ucDrawSideBrowFeature(ctx, w, h, d = {}, state = 'neutral') {
        const lift = state === 'raised' || state === 'surprised' ? -h * 0.10 : state === 'sad' ? h * 0.10 : 0;
        const slant = state === 'angry' ? -h * 0.14 : state === 'sad' ? h * 0.10 : -h * 0.04;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = d.hair || '#3b241a';
        ctx.lineWidth = Math.max(1, h * (d.gender === 'female' ? 0.18 : 0.24));
        ctx.beginPath();
        ctx.moveTo(w * 0.12, h * 0.65 + lift);
        ctx.quadraticCurveTo(w * 0.46, h * 0.30 + lift + slant, w * 0.92, h * 0.54 + lift);
        ctx.stroke();
        ctx.restore();
    },

    _ucDrawSideMouthFeature(ctx, w, h, d = {}, state = 'neutral') {
        if (state === 'lip-sync-frame' && d?._lipSyncMouthChannels) {
            this._ucDrawLipSyncMouth(ctx, w, h, d, d._lipSyncMouthChannels, true);
            return;
        }
        const lip = this._ucDeriveLipColor(d.skin || '#d9a066');
        const shadow = this._ucShadeColor(lip, -0.22);
        const cx = w * 0.50;
        const cy = h * 0.50;
        const openingGain = this._ucClampNum(d?._lipSyncMouthOpening, 0.75, 3.2, 1.45);
        const openingScale = this._ucClampNum(0.72 + openingGain * 0.28, 0.9, 1.64, 1.13);
        if (String(state).startsWith('viseme-')) {
            const shape = String(state).slice('viseme-'.length);
            const specs = {
                mbp: { rx: 0.25, ry: 0.025, open: false },
                fv: { rx: 0.27, ry: 0.09, open: true, teeth: true },
                l: { rx: 0.25, ry: 0.17, open: true, tongue: true },
                a: { rx: 0.25, ry: 0.28, open: true },
                e: { rx: 0.34, ry: 0.13, open: true, teeth: true },
                o: { rx: 0.17, ry: 0.24, open: true, round: true }
            };
            const spec = specs[shape] || specs.mbp;
            const apertureY = spec.open ? Math.min(0.49, spec.ry * openingScale) : spec.ry;
            ctx.save();
            ctx.lineCap = 'round';
            if (spec.open) {
                ctx.fillStyle = '#21070b';
                ctx.beginPath();
                ctx.ellipse(cx + (spec.round ? w * 0.08 : 0), cy, w * spec.rx, h * apertureY, -0.06, 0, Math.PI * 2);
                ctx.fill();
                if (spec.teeth) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(cx - w * spec.rx * 0.62, cy - h * apertureY * 0.72, w * spec.rx * 1.24, Math.max(1, h * apertureY * 0.38));
                }
                if (spec.tongue) {
                    ctx.fillStyle = '#c97575';
                    ctx.beginPath();
                    ctx.ellipse(cx + w * 0.02, cy + h * apertureY * 0.52, w * 0.11, h * 0.045, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.strokeStyle = lip;
            ctx.lineWidth = Math.max(1, h * (spec.open ? 0.12 : 0.18));
            ctx.beginPath();
            if (spec.open) ctx.ellipse(cx + (spec.round ? w * 0.08 : 0), cy, w * spec.rx, h * apertureY, -0.06, 0, Math.PI * 2);
            else {
                ctx.moveTo(cx - w * spec.rx, cy);
                ctx.quadraticCurveTo(cx, cy + h * 0.025, cx + w * spec.rx, cy);
            }
            ctx.stroke();
            ctx.restore();
            return;
        }
        const smile = state === 'smile' || state === 'grin' || state === 'smirk';
        const open = state === 'open' || state === 'wide-open' || state === 'talking' || state === 'singing';
        const frown = state === 'frown' || state === 'cry' || state === 'pout';
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = lip;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.34, cy - h * 0.08);
        ctx.quadraticCurveTo(cx + w * 0.10, cy - h * 0.20, cx + w * 0.32, cy - h * 0.02);
        ctx.quadraticCurveTo(cx + w * 0.18, cy + h * 0.08, cx - w * 0.30, cy + h * 0.16);
        ctx.quadraticCurveTo(cx - w * 0.08, cy + h * 0.02, cx - w * 0.34, cy - h * 0.08);
        ctx.closePath();
        ctx.fill();
        if (open) {
            ctx.fillStyle = '#3a1518';
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.02, cy + h * 0.03, w * 0.18, h * (state === 'wide-open' ? 0.30 : 0.20), -0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = shadow;
        ctx.lineWidth = Math.max(1, h * 0.13);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.34, cy + (frown ? h * 0.06 : 0));
        ctx.quadraticCurveTo(cx - w * 0.02, cy + (smile ? h * 0.22 : frown ? -h * 0.16 : h * 0.04), cx + w * 0.32, cy + (smile ? h * 0.02 : frown ? h * 0.10 : 0));
        ctx.stroke();
        ctx.strokeStyle = this._ucWithAlpha(shadow, 0.58);
        ctx.lineWidth = Math.max(0.8, h * 0.08);
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.12, cy - h * 0.18);
        ctx.quadraticCurveTo(cx + w * 0.26, cy - h * 0.12, cx + w * 0.32, cy - h * 0.02);
        ctx.stroke();
        ctx.restore();
    },

    _ucRenderFacialFeatureDataUrl(featureObj, spec, d, fsc) {
        const fc = document.createElement('canvas');
        const width = Math.max(1, featureObj.width || 1), height = Math.max(1, featureObj.height || 1);
        fc.width = Math.ceil(width * 3);
        fc.height = Math.ceil(height * 3);
        const fctx = fc.getContext('2d');
        if (!fctx) return null;
        fctx.scale(fc.width / width, fc.height / height);

        const isSide = d?.view === 'side';
        if (isSide && d.sideFacing === 'left') { fctx.translate(width, 0); fctx.scale(-1, 1); }
        if (isSide && spec.type === 'eye') {
            this._ucDrawSideEyeFeature(fctx, width, height, d, spec.state);
        } else if (isSide && spec.type === 'brow') {
            this._ucDrawSideBrowFeature(fctx, width, height, d, spec.state);
        } else if (isSide && spec.type === 'mouth') {
            this._ucDrawSideMouthFeature(fctx, width, height, d, spec.state);
        } else if (spec.type === 'eye') {
            this._ucDrawEye(fctx, width, height, d, spec.state, fsc);
        } else if (spec.type === 'brow') {
            this._ucDrawBrow(fctx, width, height, d, spec.state, spec.variant || 'center', fsc);
        } else if (spec.type === 'mouth') {
            this._ucDrawMouth(fctx, width, height, d, spec.state, fsc);
        } else {
            return null;
        }

        return fc.toDataURL('image/png');
    },

    _ucGetOrRenderFacialFeatureDataUrl(headObj, featureObj, spec, d, fsc, styleSignature) {
        const cache = this._ucGetFacialRenderCache(headObj);
        if (!cache) return null;

        const cacheKey = this._ucBuildFacialFeatureCacheKey(featureObj, spec, styleSignature);
        if (cache.has(cacheKey)) return cache.get(cacheKey);

        const dataUrl = this._ucRenderFacialFeatureDataUrl(featureObj, spec, d, fsc);
        if (!dataUrl) return null;

        cache.set(cacheKey, dataUrl);
        headObj._facialRenderCacheOrder.push(cacheKey);

        const MAX_CACHE_ENTRIES = 256;
        while (headObj._facialRenderCacheOrder.length > MAX_CACHE_ENTRIES) {
            const oldest = headObj._facialRenderCacheOrder.shift();
            if (oldest) cache.delete(oldest);
        }

        return dataUrl;
    },

    /**
     * Apply a named facial expression to a character head.
     * @param {StageObject} headObj - The head-neck StageObject
     * @param {string} expression - Expression name
     */
    applyFacialExpression(headObj, expression, options = {}) {
        if (!headObj?._facialFeatures || !headObj._facialDrawCtx) return;

        this._ucPruneLegacyFacialFeatures(headObj, headObj._facialDrawCtx);

        const d = headObj._facialDrawCtx;
        const fp = headObj._facialProportions || {};
        const fsc = Number.isFinite(fp.faceScale) ? fp.faceScale : 1;
        const baseExpr = this._ucGetExpressionSpec(expression);
        const eyeStateOverride = String(options.eyeStateOverride || '').trim();
        const expr = eyeStateOverride
            ? { ...baseExpr, eye: eyeStateOverride }
            : baseExpr;
        if (eyeStateOverride && Object.prototype.hasOwnProperty.call(expr, 'eyes')) {
            delete expr.eyes;
        }
        const getSide = (key) => key.includes('left') ? 'left' : 'right';
        const resolveFeatureOffset = (key, axis) => {
            const specific = expr.featureOffsets?.[key]?.[axis];
            const family = key.startsWith('brow-')
                ? expr.featureOffsets?.brow?.[axis]
                : key.startsWith('eye-')
                    ? expr.featureOffsets?.eye?.[axis]
                    : expr.featureOffsets?.[key]?.[axis];
            return Number.isFinite(specific) ? specific : (Number.isFinite(family) ? family : 0);
        };

        const styleSignature = this._ucGetFacialRenderStyleSignature(d, fsc);
        const expressionSignature = eyeStateOverride
            ? `${expression}|eye:${eyeStateOverride}`
            : expression;
        const applySignature = this._ucGetFacialApplySignature(headObj, expressionSignature, styleSignature);
        if (!options.force && headObj._facialLastApplySignature === applySignature) {
            return;
        }

        if (window.FacialExpressionSpecs) {
            const history = window.FacialExpressionSpecs.getExpressionHistory('uc');
            if (!window.__appExpressionHistory) window.__appExpressionHistory = [];
            window.__appExpressionHistory.push({
                ...history,
                expression: expression,
                headId: headObj.id
            });
            if (window.__appExpressionHistory.length > 100) {
                window.__appExpressionHistory.shift();
            }
        }

        const shouldRecord = !options.suppressRecording
            && !!this.objects?._isRecording
            && !this.objects?._contRec?.active
            && !this.objects?._recordSnapshots;

        if (shouldRecord) {
            const recordingTargets = [headObj, ...Object.values(headObj._facialFeatures || {})
                .map(objId => this.objects.getObjectById(objId))
                .filter(Boolean)];
            if (recordingTargets.length > 0) {
                this.objects._recordSnapshots = new Map(
                    recordingTargets.map(obj => [obj.id, this._buildArmatureObjSnapshot(obj)])
                );
            }
        }

        const syncOriginalState = (targetObj) => {
            if (
                options.syncOriginalState === false
                || !targetObj
                || !(this.animations?.originalStates instanceof Map)
            ) return;
            this.animations.originalStates.set(targetObj.id, Utils.deepClone(targetObj.toJSON()));
        };

        let changedAny = false;
        const headRx = Number.isFinite(fp.headRx) ? fp.headRx : Math.max(1, (headObj.width || 0) * 0.46);
        const headRy = Number.isFinite(fp.headRy) ? fp.headRy : Math.max(1, (headObj.height || 0) * 0.44);

        // Update each facial feature canvas
        Object.entries(headObj._facialFeatures).forEach(([key, objId]) => {
            const featureObj = this.objects.getObjectById(objId);
            if (!featureObj) return;

            const nextPinOffsetX = (featureObj._facialBasePinOffsetX || 0) + resolveFeatureOffset(key, 'x') * headRx;
            const nextPinOffsetY = (featureObj._facialBasePinOffsetY || 0) + resolveFeatureOffset(key, 'y') * headRy;
            const nextRotation = (featureObj._facialBaseRotation || 0) + resolveFeatureOffset(key, 'rotation');
            if (Math.abs((featureObj.pinOffsetX || 0) - nextPinOffsetX) > 0.001) {
                featureObj.pinOffsetX = nextPinOffsetX;
                changedAny = true;
            }
            if (Math.abs((featureObj.pinOffsetY || 0) - nextPinOffsetY) > 0.001) {
                featureObj.pinOffsetY = nextPinOffsetY;
                changedAny = true;
            }
            if (Math.abs((featureObj.rotation || 0) - nextRotation) > 0.001) {
                featureObj.rotation = nextRotation;
                changedAny = true;
            }

            const spec = this._ucResolveFacialFeatureVisualSpec(key, expr, getSide);
            if (!spec) return;

            const visualKey = this._ucBuildFacialFeatureCacheKey(featureObj, spec, styleSignature);
            const visualChanged = options.force || featureObj._facialVisualKey !== visualKey;
            if (visualChanged) {
                const newDataUrl = this._ucGetOrRenderFacialFeatureDataUrl(headObj, featureObj, spec, d, fsc, styleSignature);
                if (newDataUrl && featureObj.imageSrc !== newDataUrl) {
                    featureObj.imageSrc = newDataUrl;
                    if (featureObj.imageElement) {
                        featureObj.imageElement.src = newDataUrl;
                    } else {
                        featureObj.loadImage?.(newDataUrl);
                    }
                    changedAny = true;
                }
                featureObj._facialVisualKey = visualKey;
            }

            if (visualChanged) {
                syncOriginalState(featureObj);
            }
        });

        headObj._facialExpression = expression;
        if (options.finishGazeKey) headObj._facialGazeKey = options.finishGazeKey;
        headObj._facialLastApplySignature = applySignature;
        syncOriginalState(headObj);
        if (changedAny) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.stage.requestRender();
        }
        if (shouldRecord && this.objects?._recordSnapshots) {
            this.objects._showRecordingConfirm();
        }
    },

    _ucGetExpressionSpec(name) {
        const sharedSpecs = window.FacialExpressionSpecs;
        if (sharedSpecs && typeof sharedSpecs.getUCExpressionSpec === 'function') {
            return sharedSpecs.getUCExpressionSpec(name);
        }

        const expressions = {
            'neutral': {
                eye: 'open',
                brow: 'neutral',
                mouth: 'neutral'
            },
            'blink': {
                eye: 'closed',
                brow: 'neutral',
                mouth: 'neutral'
            },
            'half-blink': {
                eye: 'half',
                brow: 'neutral',
                mouth: 'neutral'
            },
            'wide-eyes': {
                eye: 'wide',
                brow: 'raised',
                mouth: 'neutral',
                featureOffsets: { brow: { y: -0.08 } }
            },
            'look-left': {
                eye: 'look-left',
                mouth: 'neutral'
            },
            'look-right': {
                eye: 'look-right',
                mouth: 'neutral'
            },
            'look-up': {
                eye: 'look-up',
                brow: 'raised',
                mouth: 'neutral',
                featureOffsets: { brow: { y: -0.04 } }
            },
            'look-down': {
                eye: 'look-down',
                mouth: 'neutral',
                featureOffsets: { brow: { y: 0.02 } }
            },
            'eye-roll': {
                eye: 'roll',
                brow: 'raised',
                mouth: 'neutral',
                featureOffsets: { brow: { y: -0.05 } }
            },
            'smile': {
                eye: 'half',
                brow: 'raised',
                mouth: 'smile',
                featureOffsets: { brow: { y: -0.03 } }
            },
            'happy': {
                eye: 'smile',
                brow: 'raised',
                mouth: 'grin',
                featureOffsets: { brow: { y: -0.05 }, mouth: { y: -0.01 } }
            },
            'sad': {
                eye: 'sad',
                brows: { left: 'sad-left', right: 'sad-right' },
                mouth: 'frown',
                featureOffsets: { brow: { y: 0.04 }, mouth: { y: 0.02 } }
            },
            'angry': {
                eye: 'squint',
                brows: { left: 'angry-left', right: 'angry-right' },
                mouth: 'snarl',
                featureOffsets: { brow: { y: -0.05 }, mouth: { y: -0.01 } }
            },
            'shocked': {
                eye: 'wide',
                brow: 'raised',
                mouth: 'wide-open',
                featureOffsets: { brow: { y: -0.10 }, mouth: { y: 0.02 } }
            },
            'talking': {
                eye: 'open',
                mouth: 'talking'
            },
            'singing': {
                eye: 'half',
                brow: 'raised',
                mouth: 'singing',
                featureOffsets: { mouth: { y: -0.01 } }
            },
            'shouting': {
                eye: 'wide',
                brows: { left: 'angry-left', right: 'angry-right' },
                mouth: 'wide-open',
                featureOffsets: { brow: { y: -0.06 }, mouth: { y: 0.01 } }
            },
            'crying': {
                eye: 'tear',
                brows: { left: 'sad-left', right: 'sad-right' },
                mouth: 'cry',
                featureOffsets: { brow: { y: 0.06 }, mouth: { y: 0.03 } }
            },
            'sleeping': {
                eye: 'closed',
                brow: 'lowered',
                mouth: 'neutral',
                featureOffsets: { brow: { y: 0.04 } }
            },
            'wink-left': {
                eyes: { left: 'closed', right: 'open' },
                brows: { left: 'lowered', right: 'raised' },
                mouth: 'smirk',
                featureOffsets: { 'brow-right': { y: -0.06 }, 'brow-left': { y: 0.02 } }
            },
            'wink-right': {
                eyes: { left: 'open', right: 'closed' },
                brows: { left: 'raised', right: 'lowered' },
                mouth: 'smirk',
                featureOffsets: { 'brow-left': { y: -0.06 }, 'brow-right': { y: 0.02 } }
            },
            'suspicious': {
                eyes: { left: 'half', right: 'open' },
                brows: { left: 'skeptical-high', right: 'skeptical-low' },
                mouth: 'smirk',
                featureOffsets: { 'brow-left': { y: -0.08 }, 'brow-right': { y: 0.04 } }
            },
            'surprised': {
                eye: 'wide',
                brow: 'raised',
                mouth: 'open',
                featureOffsets: { brow: { y: -0.08 }, mouth: { y: 0.01 } }
            },
            'laughing': {
                eye: 'smile',
                brow: 'raised',
                mouth: 'grin',
                featureOffsets: { brow: { y: -0.05 }, mouth: { y: -0.02 } }
            },
            'grimace': {
                eye: 'squint',
                brow: 'raised',
                mouth: 'grimace'
            },
            'pout': {
                eye: 'sad',
                brows: { left: 'sad-left', right: 'sad-right' },
                mouth: 'pout',
                featureOffsets: { mouth: { y: 0.02 } }
            }
        };
        return expressions[name] || expressions['neutral'];
    },

    _getFacialExpressionCatalog(headObj = null) {
        const isSide = !!headObj?._facialProportions?.isSide;
        return [
            { key: 'neutral', name: 'Neutral', icon: 'fa-face-meh', category: 'Core' },
            { key: 'smile', name: 'Smile', icon: 'fa-face-smile', category: 'Core' },
            { key: 'happy', name: 'Happy', icon: 'fa-face-grin-stars', category: 'Core' },
            { key: 'laughing', name: 'Laughing', icon: 'fa-face-laugh-beam', category: 'Core' },
            { key: 'sad', name: 'Sad', icon: 'fa-face-sad-tear', category: 'Emotion' },
            { key: 'crying', name: 'Crying', icon: 'fa-face-sad-cry', category: 'Emotion' },
            { key: 'angry', name: 'Angry', icon: 'fa-face-angry', category: 'Emotion' },
            { key: 'shocked', name: 'Shocked', icon: 'fa-face-surprise', category: 'Emotion' },
            { key: 'surprised', name: 'Surprised', icon: 'fa-face-grimace', category: 'Emotion' },
            { key: 'pout', name: 'Pout', icon: 'fa-face-frown-open', category: 'Emotion' },
            { key: 'blink', name: 'Blink', icon: 'fa-eye-slash', category: 'Eyes + Gaze' },
            { key: 'half-blink', name: 'Half Blink', icon: 'fa-eye-low-vision', category: 'Eyes + Gaze' },
            { key: 'wide-eyes', name: 'Wide Eyes', icon: 'fa-eye', category: 'Eyes + Gaze' },
            { key: 'look-left', name: 'Look Left', icon: 'fa-arrow-left', category: 'Eyes + Gaze' },
            { key: 'look-right', name: 'Look Right', icon: 'fa-arrow-right', category: 'Eyes + Gaze' },
            { key: 'look-up', name: 'Look Up', icon: 'fa-arrow-up', category: 'Eyes + Gaze' },
            { key: 'look-down', name: 'Look Down', icon: 'fa-arrow-down', category: 'Eyes + Gaze' },
            { key: 'eye-roll', name: 'Eye Roll', icon: 'fa-arrows-rotate', category: 'Eyes + Gaze' },
            { key: 'suspicious', name: 'Suspicious', icon: 'fa-face-monocle', category: 'Eyes + Gaze', allowSide: false },
            { key: 'wink-left', name: 'Wink Left', icon: 'fa-face-kiss-wink-heart', category: 'Eyes + Gaze', allowSide: false },
            { key: 'wink-right', name: 'Wink Right', icon: 'fa-face-kiss-wink-heart', category: 'Eyes + Gaze', allowSide: false },
            { key: 'talking', name: 'Talking', icon: 'fa-comment-dots', category: 'Speech' },
            { key: 'singing', name: 'Singing', icon: 'fa-music', category: 'Speech' },
            { key: 'shouting', name: 'Shouting', icon: 'fa-bullhorn', category: 'Speech' },
            { key: 'grimace', name: 'Grimace', icon: 'fa-teeth', category: 'Speech' },
            { key: 'sleeping', name: 'Sleeping', icon: 'fa-bed', category: 'Other' }
        ].filter(entry => !isSide || entry.allowSide !== false);
    },

    _getFacialMovementCatalog(headObj = null) {
        if (!headObj) return [];
        return [
            {
                key: 'blink-cycle',
                name: 'Blink Loop',
                icon: 'fa-eye-slash',
                category: 'Eyes + Gaze',
                duration: 1200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'neutral' },
                    { t: 0.27, expression: 'half-blink' },
                    { t: 0.33, expression: 'blink' },
                    { t: 0.40, expression: 'half-blink' },
                    { t: 0.58, expression: 'neutral' },
                    { t: 0.83, expression: 'look-down' },
                    { t: 0.92, expression: 'neutral' },
                    { t: 1.00, expression: 'neutral' }
                ]
            },
            {
                key: 'nervous-blink-loop',
                name: 'Nervous Blink',
                icon: 'fa-eye-low-vision',
                category: 'Eyes + Gaze',
                duration: 1600,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'neutral' },
                    { t: 0.12, expression: 'look-left' },
                    { t: 0.22, expression: 'half-blink' },
                    { t: 0.28, expression: 'blink' },
                    { t: 0.34, expression: 'half-blink' },
                    { t: 0.48, expression: 'neutral' },
                    { t: 0.66, expression: 'look-right' },
                    { t: 0.78, expression: 'blink' },
                    { t: 0.84, expression: 'wide-eyes' },
                    { t: 1.00, expression: 'neutral' }
                ]
            },
            {
                key: 'talking-loop',
                name: 'Talking',
                icon: 'fa-comment-dots',
                category: 'Speech',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'neutral' },
                    { t: 0.08, expression: 'talking' },
                    { t: 0.18, expression: 'neutral' },
                    { t: 0.33, expression: 'talking' },
                    { t: 0.44, expression: 'look-left' },
                    { t: 0.52, expression: 'talking' },
                    { t: 0.63, expression: 'half-blink' },
                    { t: 0.69, expression: 'talking' },
                    { t: 0.82, expression: 'neutral' },
                    { t: 0.91, expression: 'talking' },
                    { t: 1.00, expression: 'neutral' }
                ]
            },
            {
                key: 'whispering-loop',
                name: 'Whispering',
                icon: 'fa-volume-low',
                category: 'Speech',
                duration: 1900,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'neutral' },
                    { t: 0.10, expression: 'talking' },
                    { t: 0.22, expression: 'neutral' },
                    { t: 0.34, expression: 'look-right' },
                    { t: 0.42, expression: 'talking' },
                    { t: 0.56, expression: 'half-blink' },
                    { t: 0.63, expression: 'talking' },
                    { t: 0.76, expression: 'neutral' },
                    { t: 0.88, expression: 'suspicious' },
                    { t: 1.00, expression: 'neutral' }
                ]
            },
            {
                key: 'singing-loop',
                name: 'Singing',
                icon: 'fa-music',
                category: 'Speech',
                duration: 2100,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'singing' },
                    { t: 0.14, expression: 'wide-eyes' },
                    { t: 0.30, expression: 'singing' },
                    { t: 0.46, expression: 'happy' },
                    { t: 0.64, expression: 'singing' },
                    { t: 0.78, expression: 'blink' },
                    { t: 0.84, expression: 'singing' },
                    { t: 1.00, expression: 'singing' }
                ]
            },
            {
                key: 'chanting-loop',
                name: 'Chanting',
                icon: 'fa-wave-square',
                category: 'Speech',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'shouting' },
                    { t: 0.18, expression: 'angry' },
                    { t: 0.33, expression: 'shouting' },
                    { t: 0.51, expression: 'talking' },
                    { t: 0.66, expression: 'shouting' },
                    { t: 0.82, expression: 'wide-eyes' },
                    { t: 1.00, expression: 'shouting' }
                ]
            },
            {
                key: 'laughing-loop',
                name: 'Laughing',
                icon: 'fa-face-laugh-beam',
                category: 'Emotion',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'happy' },
                    { t: 0.12, expression: 'laughing' },
                    { t: 0.29, expression: 'happy' },
                    { t: 0.38, expression: 'laughing' },
                    { t: 0.56, expression: 'blink' },
                    { t: 0.63, expression: 'laughing' },
                    { t: 0.82, expression: 'wide-eyes' },
                    { t: 0.90, expression: 'laughing' },
                    { t: 1.00, expression: 'happy' }
                ]
            },
            {
                key: 'crying-loop',
                name: 'Crying',
                icon: 'fa-face-sad-cry',
                category: 'Emotion',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'crying' },
                    { t: 0.20, expression: 'sad' },
                    { t: 0.36, expression: 'crying' },
                    { t: 0.58, expression: 'blink' },
                    { t: 0.66, expression: 'crying' },
                    { t: 0.84, expression: 'pout' },
                    { t: 0.92, expression: 'crying' },
                    { t: 1.00, expression: 'crying' }
                ]
            },
            {
                key: 'breathing-loop',
                name: 'Breathing',
                icon: 'fa-wind',
                category: 'Other',
                duration: 2400,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'neutral' },
                    { t: 0.24, expression: 'look-down' },
                    { t: 0.46, expression: 'half-blink' },
                    { t: 0.54, expression: 'neutral' },
                    { t: 0.76, expression: 'smile' },
                    { t: 1.00, expression: 'neutral' }
                ]
            },
            {
                key: 'chewing-loop',
                name: 'Chewing',
                icon: 'fa-cookie-bite',
                category: 'Other',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'grimace' },
                    { t: 0.16, expression: 'neutral' },
                    { t: 0.32, expression: 'pout' },
                    { t: 0.46, expression: 'neutral' },
                    { t: 0.62, expression: 'grimace' },
                    { t: 0.78, expression: 'look-left' },
                    { t: 1.00, expression: 'neutral' }
                ]
            },
            {
                key: 'shouting-loop',
                name: 'Shouting',
                icon: 'fa-bullhorn',
                category: 'Speech',
                duration: 1350,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, expression: 'angry' },
                    { t: 0.14, expression: 'shouting' },
                    { t: 0.32, expression: 'shocked' },
                    { t: 0.52, expression: 'shouting' },
                    { t: 0.70, expression: 'wide-eyes' },
                    { t: 0.84, expression: 'shouting' },
                    { t: 1.00, expression: 'angry' }
                ]
            }
        ];
    },

    /**
     * Get all available expression names.
     */
    getAvailableFacialExpressions(headObj = null) {
        return this._getFacialExpressionCatalog(headObj).map(entry => entry.key);
    },

    _getArmatureHeadObject(armature = null) {
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature || this._currentArmature || this._detectArmature();
        const headObj = liveArmature?.parts?.head?.obj || null;
        const headNeckObj = liveArmature?.parts?.['head-neck']?.obj || null;
        const candidates = [headObj, headNeckObj].filter(Boolean);
        const facialHost = candidates.find(obj => {
            if (!obj?._facialFeatures || typeof obj._facialFeatures !== 'object' || !this.objects?.getObjectById) {
                return false;
            }
            return Object.values(obj._facialFeatures).some(objId => objId && this.objects.getObjectById(objId));
        });
        if (facialHost) return facialHost;
        return headObj || headNeckObj || null;
    },

    _hasArmatureFacialFeatures(headObj = null) {
        if (!headObj || !this.objects?.getObjectById) return false;
        const featureMap = (headObj._facialFeatures && typeof headObj._facialFeatures === 'object')
            ? headObj._facialFeatures
            : {};
        return Object.values(featureMap).some(objId => objId && this.objects.getObjectById(objId));
    },

    _cleanupArmatureDuplicateFacialHosts(armature = null, activeHeadObj = null) {
        if (!this.objects?.getObjectById || !this.objects?.removeObject) return false;
        const liveArmature = this._refreshDetectedArmatureReference(armature) || armature || this._currentArmature || this._detectArmature();
        const candidates = [
            liveArmature?.parts?.head?.obj || null,
            liveArmature?.parts?.['head-neck']?.obj || null
        ].filter(Boolean);
        if (candidates.length < 2) return false;

        const facialHost = activeHeadObj || candidates.find(obj => this._hasArmatureFacialFeatures(obj));
        if (!facialHost) return false;

        let removedAny = false;
        candidates.forEach(candidate => {
            if (!candidate || candidate === facialHost || !candidate._facialFeatures || typeof candidate._facialFeatures !== 'object') {
                return;
            }

            Object.entries(candidate._facialFeatures).forEach(([key, objId]) => {
                const featureObj = objId ? this.objects.getObjectById(objId) : null;
                if (!featureObj) {
                    delete candidate._facialFeatures[key];
                    return;
                }

                const belongsToCandidate = featureObj._facialParentHead === candidate.id || featureObj.pinnedTo === candidate.id;
                if (!belongsToCandidate) return;

                this.objects.removeObject(objId);
                delete candidate._facialFeatures[key];
                removedAny = true;
            });
        });

        if (removedAny) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.stage?.requestRender?.();
        }
        return removedAny;
    },

    _ensureArmatureFacialFeatures(armature = null, options = {}) {
        const headObj = this._getArmatureHeadObject(armature);
        if (!headObj || !this.objects) return null;
        this._cleanupArmatureDuplicateFacialHosts(armature, headObj);

        let drawCtx = headObj._facialDrawCtx || null;
        if (!this._ucHasValidFacialDrawContext(drawCtx)) {
            drawCtx = this._ucRepairFacialDrawContext(armature, headObj);
        }
        this._ucRepairGeneratedFaceLayout?.(armature, headObj);
        const proportions = headObj._facialProportions || null;
        const isSide = !!proportions?.isSide || drawCtx?.view === 'side';
        const expectedKeys = this._ucGetSupportedFacialFeatureKeys(isSide);
        const featureMap = (headObj._facialFeatures && typeof headObj._facialFeatures === 'object')
            ? headObj._facialFeatures
            : {};
        const existingKeys = Object.keys(featureMap).filter(key => {
            const objId = featureMap[key];
            return objId && this.objects.getObjectById(objId);
        });
        const missingFeatures = expectedKeys.size > 0 && existingKeys.length < expectedKeys.size;

        if (drawCtx && proportions) {
            this._ucPruneLegacyFacialFeatures(headObj, drawCtx);
        }

        if (drawCtx && proportions && (missingFeatures || existingKeys.length === 0)) {
            const inferredNeckHeight = Math.max(0, (headObj.height || 0) - (proportions.headH || 0));
            this._ucCreateFacialFeatures(headObj, {
                neckH: inferredNeckHeight,
                faceScale: proportions.faceScale || 1
            }, drawCtx);
        }

        const refreshedFeatureMap = (headObj._facialFeatures && typeof headObj._facialFeatures === 'object')
            ? headObj._facialFeatures
            : {};
        const hasFacialFeatures = Object.keys(refreshedFeatureMap).some(key => {
            const objId = refreshedFeatureMap[key];
            return objId && this.objects.getObjectById(objId);
        });
        if (!hasFacialFeatures) return null;

        this._ucNormalizeFacialFeaturePins(headObj);

        if (options.applyCurrentExpression !== false && drawCtx) {
            this.applyFacialExpression(headObj, headObj._facialExpression || 'neutral', { suppressRecording: true });
        }
        return headObj;
    },

    _getArmatureFacialHead(armature = null) {
        const headObj = this._getArmatureHeadObject(armature);
        if (!headObj || !this._hasArmatureFacialFeatures(headObj)) return null;
        this._cleanupArmatureDuplicateFacialHosts(armature, headObj);
        this._ucNormalizeFacialFeaturePins(headObj);
        return headObj;
    },

    _getArmatureFaceAdapter(armature = null, options = {}) {
        const liveArmature = this._refreshDetectedArmatureReference?.(armature)
            || armature
            || this._currentArmature
            || this._detectArmature?.();
        const seed = this._getArmatureHeadObject?.(liveArmature) || liveArmature?.root || null;
        const nativeHead = this.animations?._getSvgAfricanPremiumHeadObject?.(seed) || null;
        if (nativeHead) {
            const PremiumAssets = globalThis.SvgAfricanPremiumAssets || null;
            const config = nativeHead._svgCharacterConfig || {};
            const assetId = nativeHead._svgCharacterPremiumAssetId
                || nativeHead._svgAfricanPremiumAssetId
                || config.assetCharacterId
                || config.premiumAssetId
                || PremiumAssets?.getDefaultAssetId?.();
            const schema = assetId ? PremiumAssets?.getFacialRigSchema?.(assetId) : null;
            const supportedProperties = new Set(
                Array.isArray(schema?.stateProperties)
                    ? schema.stateProperties
                    : Object.keys(this.animations?._getSvgAfricanFacePropertyCatalog?.() || {})
            );
            const faceProperties = ['blink', 'mouthOpen', 'mouthWide', 'mouthRound', 'lipPress', 'jawOpen', 'smile', 'gazeX', 'gazeY', 'browRaise', 'listening'];
            return {
                kind: 'svg-african-native',
                headObj: nativeHead,
                schema,
                supportedProperties,
                supportsFacialFeatures: schema?.supportsFacialFeatures !== false
                    && faceProperties.some(property => supportedProperties.has(property)),
                isSide: String(nativeHead._svgCharacterViewProfileKey || config.view || config.styling?.view || '').startsWith('side-')
            };
        }

        const headObj = options.readOnly === true
            ? this._getArmatureHeadObject(liveArmature)
            : options.ensure === true
            ? this._ensureArmatureFacialFeatures?.(liveArmature, { applyCurrentExpression: false })
            : this._getArmatureFacialHead(liveArmature);
        if (!headObj) return null;
        if (options.readOnly === true) {
            const style = liveArmature?.root?._ucCharacterStyleConfig;
            if (this._ucIsBackFamilyView(style?.view || headObj._facialDrawCtx?.view)
                || (!this._hasArmatureFacialFeatures(headObj) && !headObj._facialDrawCtx && !style)) return null;
        }
        return {
            kind: 'universal-features',
            headObj,
            schema: null,
            supportedProperties: null,
            supportsFacialFeatures: true,
            isSide: !!headObj?._facialProportions?.isSide
        };
    },

    _getArmatureFaceExpressionCatalog(armature = null, adapter = null) {
        const resolved = adapter || this._getArmatureFaceAdapter(armature);
        if (!resolved?.headObj || resolved.supportsFacialFeatures === false) return [];
        const catalogHead = resolved.kind === 'svg-african-native'
            ? { _facialProportions: { isSide: resolved.isSide } }
            : resolved.headObj;
        const catalog = this._getFacialExpressionCatalog(catalogHead);
        if (resolved.kind !== 'svg-african-native') return catalog;
        const unsupported = new Set(['suspicious', 'wink-left', 'wink-right']);
        return catalog.filter(entry => !unsupported.has(entry.key));
    },

    _getArmatureFaceMovementCatalog(armature = null, adapter = null) {
        const resolved = adapter || this._getArmatureFaceAdapter(armature);
        if (!resolved?.headObj || resolved.supportsFacialFeatures === false) return [];
        return this._getFacialMovementCatalog(resolved.headObj);
    },

    _getSvgAfricanExpressionState(expression = 'neutral', adapter = null) {
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets || null;
        const base = PremiumAssets?.getFacePresetState?.('neutral')
            || this.animations?._getSvgAfricanFaceDefaultState?.()
            || {};
        const key = String(expression || 'neutral').toLowerCase();
        const states = {
            neutral: {},
            smile: { mouthOpen: 0.03, smile: 0.64, browRaise: 0.35 },
            happy: { mouthOpen: 0.10, smile: 0.90, browRaise: 1.15 },
            laughing: { mouthOpen: 0.78, smile: 0.96, browRaise: 1.45, blink: 0.18 },
            sad: { mouthOpen: 0.03, smile: -0.62, browRaise: -1.15, gazeY: 0.8 },
            crying: { mouthOpen: 0.16, smile: -0.78, browRaise: -1.8, blink: 0.28, gazeY: 1.4 },
            angry: { mouthOpen: 0.08, smile: -0.60, browRaise: -2.7, gazeY: -0.2 },
            shocked: { mouthOpen: 0.96, smile: -0.04, browRaise: 4.2, blink: 0 },
            surprised: { mouthOpen: 0.68, smile: 0.06, browRaise: 2.8, blink: 0 },
            pout: { mouthOpen: 0.12, smile: -0.46, browRaise: -0.45 },
            blink: { blink: 1 },
            'half-blink': { blink: 0.55 },
            'wide-eyes': { blink: 0, browRaise: 1.5 },
            'look-left': { gazeX: -4.8, gazeY: 0 },
            'look-right': { gazeX: 4.8, gazeY: 0 },
            'look-up': { gazeX: 0, gazeY: -3.2 },
            'look-down': { gazeX: 0, gazeY: 3.2 },
            'eye-roll': { gazeX: 3.8, gazeY: -3.4, browRaise: 0.8 },
            talking: { mouthOpen: 0.46, smile: 0.18, browRaise: 0.5 },
            singing: { mouthOpen: 0.82, smile: 0.28, browRaise: 1.0 },
            shouting: { mouthOpen: 1, smile: -0.24, browRaise: 2.0 },
            grimace: { mouthOpen: 0.16, smile: -0.72, browRaise: 0.9, blink: 0.26 },
            sleeping: { blink: 1, mouthOpen: 0.02, smile: 0.04, gazeX: 0, gazeY: 0 }
        };
        const target = { ...base, ...(states[key] || states.neutral) };
        const faceOnlyProperties = new Set([
            'blink', 'mouthOpen', 'mouthWide', 'mouthRound', 'lipPress', 'jawOpen', 'smile', 'gazeX', 'gazeY', 'browRaise', 'listening'
        ]);
        const supported = adapter?.supportedProperties instanceof Set
            ? adapter.supportedProperties
            : new Set(Object.keys(this.animations?._getSvgAfricanFacePropertyCatalog?.() || target));
        return Object.fromEntries(Object.entries(target)
            .filter(([property, value]) => faceOnlyProperties.has(property) && supported.has(property) && Number.isFinite(Number(value)))
            .map(([property, value]) => [
                property,
                this.animations?._clampSvgAfricanFaceValue?.(property, value) ?? Number(value)
            ]));
    },

    _applySvgAfricanExpressionToArmature(adapter, expression, options = {}) {
        const headObj = adapter?.headObj;
        if (!headObj || adapter.supportsFacialFeatures === false) return false;
        const targetState = this._getSvgAfricanExpressionState(expression, adapter);
        if (!Object.keys(targetState).length) return false;
        const state = this.animations?._getSvgAfricanFaceState?.(headObj) || {};
        Object.assign(state, targetState);
        headObj._svgAfricanFaceState = { ...state };
        headObj._facialExpression = String(expression || 'neutral');
        this.animations?._renderSvgAfricanFaceStateToImage?.(headObj);
        if (options.pushHistory !== false) eventBus.emit('history:push');
        return true;
    },

    _getArmaturePlayingFacialMovementKey(armature = null) {
        const headObj = this._getArmatureFaceAdapter(armature)?.headObj;
        return headObj?._facialMovementPlayingKey || null;
    },

    _resolveFacialMovementExpression(keyframes, progress) {
        if (!Array.isArray(keyframes) || !keyframes.length) return 'neutral';
        if (progress <= keyframes[0].t) return keyframes[0].expression;
        for (let index = keyframes.length - 1; index >= 0; index--) {
            if (progress >= keyframes[index].t) return keyframes[index].expression;
        }
        return keyframes[0].expression;
    },

    _captureFacialAnimationObjectState(obj) {
        if (!obj) return {};
        return Utils.deepClone(obj.toJSON?.() || {});
    },

    _restoreFacialAnimationObjectState(obj, state) {
        if (!obj || !state) return;
        if (this.animations?._restoreFullState) {
            this.animations._restoreFullState(obj, Utils.deepClone(state));
            return;
        }
        const applyProp = this.objects?._applyRecordableProperty
            ? this.objects._applyRecordableProperty.bind(this.objects)
            : ((target, prop, value) => { target[prop] = value; });
        ['x', 'y', 'width', 'height', 'rotation', 'depth', 'tiltX', 'tiltY', 'scaleX', 'scaleY', 'opacity', 'pinOffsetX', 'pinOffsetY', 'imageSrc', 'textureImageSrc', 'visible', 'flipH', 'flipV']
            .forEach(prop => {
                if (state[prop] !== undefined) applyProp(obj, prop, state[prop]);
            });
    },

    _applyFacialExpressionToArmature(armature, expression, options = {}) {
        const adapter = this._getArmatureFaceAdapter(armature, { ensure: true });
        if (adapter?.kind === 'svg-african-native') {
            return this._applySvgAfricanExpressionToArmature(adapter, expression, options);
        }
        const headObj = this._ensureArmatureFacialFeatures(armature, { applyCurrentExpression: false });
        if (!headObj) return false;
        this.applyFacialExpression(headObj, expression);
        if (options.pushHistory !== false) eventBus.emit('history:push');
        return true;
    },

    _getArmatureFacialPlaybackSpeedScale(armature = null) {
        const live = this._refreshDetectedArmatureReference?.(armature) || armature || this._currentArmature;
        const panel = typeof document !== 'undefined' ? document.getElementById('armature-panel') : null;
        const selectedKey = live?.root?._poseArmaturePlayingKey
            || (panel?.dataset?.armatureRootId === live?.root?.id ? panel.dataset.selectedMovementKey : '')
            || '';
        return this._getArmatureMovementSpeedScale?.(live, selectedKey) || 1;
    },

    _playArmatureFacialMovement(armature, moveKey) {
        const adapter = this._getArmatureFaceAdapter(armature, { ensure: true });
        if (adapter?.kind === 'svg-african-native') {
            return this._playSvgAfricanArmatureFacialMovement(armature, moveKey, adapter);
        }
        const headObj = this._ensureArmatureFacialFeatures(armature, { applyCurrentExpression: false });
        if (!headObj) return false;

        const movementCatalog = Object.fromEntries(
            this._getFacialMovementCatalog(headObj).map(entry => [entry.key, entry])
        );
        const move = movementCatalog[moveKey];
        if (!move || !Array.isArray(move.keyframes) || move.keyframes.length < 2) return false;

        this._stopArmatureFacialMovement(armature);

        const facialObjects = this._getArmatureFacialObjects(armature);
        headObj._facialMovementRestoreState = {
            expression: headObj._facialExpression || 'neutral',
            objects: new Map(facialObjects.map(obj => [obj.id, this._captureFacialAnimationObjectState(obj)]))
        };
        headObj._facialMovementPlayingKey = moveKey;
        headObj._facialMovementLastExpression = null;

        let lastTimestamp = null;
        let elapsed = 0;
        const repeatCount = move.repeat === Infinity
            ? Infinity
            : (Number.isFinite(move.repeat) && move.repeat > 0 ? move.repeat : 1);
        const maxRepeats = repeatCount === Infinity ? Infinity : repeatCount;

        const animate = (timestamp) => {
            if (!headObj._facialMovementPlayingKey || headObj._facialMovementPlayingKey !== moveKey) return;
            if (lastTimestamp == null) lastTimestamp = timestamp;
            const frameDelta = Math.max(0, Math.min(100, timestamp - lastTimestamp));
            lastTimestamp = timestamp;
            elapsed += frameDelta * this._getArmatureFacialPlaybackSpeedScale(armature);
            const currentRepeat = Math.floor(elapsed / move.duration);
            if (currentRepeat >= maxRepeats) {
                this._stopArmatureFacialMovement(armature, { restore: true });
                return;
            }

            const cycleProgress = ((elapsed % move.duration) / move.duration);
            const expression = this._resolveFacialMovementExpression(move.keyframes, cycleProgress);
            if (expression !== headObj._facialMovementLastExpression) {
                this.applyFacialExpression(headObj, expression, { suppressRecording: true });
                headObj._facialMovementLastExpression = expression;
            }

            headObj._facialMovementAnim = requestAnimationFrame(animate);
        };

        const firstExpression = this._resolveFacialMovementExpression(move.keyframes, 0);
        this.applyFacialExpression(headObj, firstExpression, { suppressRecording: true });
        headObj._facialMovementLastExpression = firstExpression;
        headObj._facialMovementAnim = requestAnimationFrame(animate);
        this._updateArmaturePanelPlayState(armature);
        return true;
    },

    _playSvgAfricanArmatureFacialMovement(armature, moveKey, adapter = null) {
        const resolved = adapter || this._getArmatureFaceAdapter(armature, { ensure: true });
        const headObj = resolved?.headObj;
        if (!headObj || resolved.kind !== 'svg-african-native' || resolved.supportsFacialFeatures === false) return false;
        const move = this._getArmatureFaceMovementCatalog(armature, resolved)
            .find(entry => entry.key === moveKey);
        if (!move || !Array.isArray(move.keyframes) || move.keyframes.length < 2) return false;

        this._stopArmatureFacialMovement(armature);
        headObj._facialMovementRestoreState = {
            expression: headObj._facialExpression || 'neutral',
            nativeState: Utils.deepClone(this.animations?._getSvgAfricanFaceState?.(headObj) || {})
        };
        headObj._facialMovementPlayingKey = moveKey;
        headObj._facialMovementLastExpression = null;

        let lastTimestamp = null;
        let elapsed = 0;
        const repeatCount = move.repeat === Infinity
            ? Infinity
            : (Number.isFinite(move.repeat) && move.repeat > 0 ? move.repeat : 1);
        const animate = (timestamp) => {
            if (headObj._facialMovementPlayingKey !== moveKey) return;
            if (lastTimestamp == null) lastTimestamp = timestamp;
            const frameDelta = Math.max(0, Math.min(100, timestamp - lastTimestamp));
            lastTimestamp = timestamp;
            elapsed += frameDelta * this._getArmatureFacialPlaybackSpeedScale(armature);
            const currentRepeat = Math.floor(elapsed / move.duration);
            if (currentRepeat >= repeatCount) {
                this._stopArmatureFacialMovement(armature, { restore: true });
                return;
            }
            const cycleProgress = (elapsed % move.duration) / move.duration;
            const expression = this._resolveFacialMovementExpression(move.keyframes, cycleProgress);
            if (expression !== headObj._facialMovementLastExpression) {
                this._applySvgAfricanExpressionToArmature(resolved, expression, { pushHistory: false });
                headObj._facialMovementLastExpression = expression;
            }
            headObj._facialMovementAnim = requestAnimationFrame(animate);
        };

        const firstExpression = this._resolveFacialMovementExpression(move.keyframes, 0);
        this._applySvgAfricanExpressionToArmature(resolved, firstExpression, { pushHistory: false });
        headObj._facialMovementLastExpression = firstExpression;
        headObj._facialMovementAnim = requestAnimationFrame(animate);
        this._updateArmaturePanelPlayState(armature);
        return true;
    },

    _stopArmatureFacialMovement(armature = this._currentArmature, options = {}) {
        const adapter = this._getArmatureFaceAdapter(armature);
        if (adapter?.kind === 'svg-african-native') {
            const headObj = adapter.headObj;
            const animId = headObj?._facialMovementAnim;
            if (animId) cancelAnimationFrame(animId);
            const hadMovement = !!animId || !!headObj?._facialMovementPlayingKey;
            const restoreState = headObj?._facialMovementRestoreState;
            if (headObj) {
                headObj._facialMovementPlayingKey = null;
                headObj._facialMovementLastExpression = null;
                headObj._facialMovementAnim = null;
                if (options.restore !== false && restoreState?.nativeState) {
                    headObj._svgAfricanFaceState = Utils.deepClone(restoreState.nativeState);
                    headObj._facialExpression = restoreState.expression || 'neutral';
                    this.animations?._renderSvgAfricanFaceStateToImage?.(headObj);
                }
                headObj._facialMovementRestoreState = null;
            }
            this._updateArmaturePanelPlayState(armature);
            return hadMovement;
        }
        const headObj = this._getArmatureFacialHead(armature);
        if (!headObj) return false;

        const animId = headObj._facialMovementAnim;
        if (animId) {
            cancelAnimationFrame(animId);
            headObj._facialMovementAnim = null;
        }

        const hadMovement = !!animId || !!headObj._facialMovementPlayingKey;
        const restoreState = headObj._facialMovementRestoreState;

        headObj._facialMovementPlayingKey = null;
        headObj._facialMovementLastExpression = null;
        headObj._facialMovementAnim = null;

        if (options.restore !== false && restoreState?.objects instanceof Map) {
            restoreState.objects.forEach((state, objectId) => {
                const liveObj = this.objects.getObjectById?.(objectId);
                if (!liveObj) return;
                this._restoreFacialAnimationObjectState(liveObj, state);
            });
            if (restoreState.expression) {
                headObj._facialExpression = restoreState.expression;
            }
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.stage.requestRender();
        }

        headObj._facialMovementRestoreState = null;
        this._updateArmaturePanelPlayState(armature);
        return hadMovement;
    },

    _recordArmatureFacialMovement(armature, moveKey, options = {}) {
        if (!this.objects || !this.animations) return false;

        const adapter = this._getArmatureFaceAdapter(armature, { ensure: true });
        if (adapter?.kind === 'svg-african-native') {
            return this._recordSvgAfricanArmatureFacialMovement(armature, moveKey, adapter, options);
        }

        const headObj = this._ensureArmatureFacialFeatures(armature, { applyCurrentExpression: false });
        if (!headObj) return false;

        const movementCatalog = Object.fromEntries(
            this._getFacialMovementCatalog(headObj).map(entry => [entry.key, entry])
        );
        const move = movementCatalog[moveKey];
        if (!move || !Array.isArray(move.keyframes) || move.keyframes.length < 2) return false;

        this._stopArmatureFacialMovement(armature);

        const facialObjects = this._getArmatureFacialObjects(armature);
        if (!facialObjects.length) return false;

        const playheadMs = this.animations.currentTime || 0;
        const repeatCount = Number.isFinite(options.repeatCountOverride)
            ? Math.max(1, Math.round(options.repeatCountOverride))
            : (move.repeat === Infinity
                ? 4
                : (Number.isFinite(move.repeat) && move.repeat > 0 ? move.repeat : 1));
        const baseExpression = headObj._facialExpression || 'neutral';
        const savedStates = new Map(facialObjects.map(obj => [obj.id, this._captureFacialAnimationObjectState(obj)]));
        const baselineSnapshots = new Map(facialObjects.map(obj => [obj.id, this._buildArmatureObjSnapshot(obj)]));
        const uniqueExpressions = [...new Set(move.keyframes.map(kf => kf.expression).filter(Boolean))];
        const expressionStates = new Map();
        const snapshotProps = ['pinOffsetX', 'pinOffsetY', 'rotation', 'imageSrc', 'textureImageSrc', 'visible'];
        const stringProps = new Set(['imageSrc', 'textureImageSrc']);

        const restoreSavedStates = () => {
            savedStates.forEach((state, objectId) => {
                const liveObj = this.objects.getObjectById?.(objectId);
                if (!liveObj) return;
                this._restoreFacialAnimationObjectState(liveObj, state);
            });
            if (this.objects._resolvePins) this.objects._resolvePins();
        };

        uniqueExpressions.forEach(expression => {
            restoreSavedStates();
            this.applyFacialExpression(headObj, expression, { suppressRecording: true });
            expressionStates.set(expression, new Map(
                facialObjects.map(obj => [obj.id, this._buildArmatureObjSnapshot(obj)])
            ));
        });
        restoreSavedStates();
        headObj._facialExpression = baseExpression;

        if (!this.animations.originalStates || !(this.animations.originalStates instanceof Map)) {
            this.animations.originalStates = new Map();
        }

        let recorded = 0;
        const firstExpression = move.keyframes[0]?.expression;
        const firstStateByObj = firstExpression ? expressionStates.get(firstExpression) : null;
        if (firstStateByObj) {
            facialObjects.forEach(obj => {
                const fromSnap = baselineSnapshots.get(obj.id);
                const toSnap = firstStateByObj.get(obj.id);
                if (!fromSnap || !toSnap) return;

                const generated = [];
                snapshotProps.forEach(prop => {
                    const before = fromSnap[prop];
                    const after = toSnap[prop];
                    const changed = stringProps.has(prop)
                        ? String(before ?? '') !== String(after ?? '')
                        : (typeof before === 'boolean' || typeof after === 'boolean')
                            ? before !== after
                            : Math.abs((before || 0) - (after || 0)) > 0.01;
                    if (!changed) return;
                    const entry = {
                        property: prop,
                        from: before,
                        to: after,
                        duration: 1,
                        easing: 'easeInOut'
                    };
                    if (stringProps.has(prop) || typeof before === 'boolean' || typeof after === 'boolean') {
                        entry.type = 'discrete';
                    }
                    generated.push(entry);
                });

                if (!generated.length) return;

                obj.animations.push({
                    id: Utils.generateId('anim'),
                    type: 'recorded',
                    name: `Face: ${move.name}`,
                    params: { duration: 0.001, easing: 'easeInOut' },
                    delay: playheadMs,
                    repeat: '1',
                    trigger: 'onLoad',
                    startMode: 'withPrevious',
                    generated
                });
                recorded++;

                if (!this.animations.originalStates.has(obj.id)) {
                    const originalState = Utils.deepClone(obj.toJSON());
                    snapshotProps.forEach(prop => { originalState[prop] = fromSnap[prop]; });
                    this.animations.originalStates.set(obj.id, originalState);
                }
            });
        }

        for (let cycle = 0; cycle < repeatCount; cycle++) {
            for (let index = 0; index < move.keyframes.length; index++) {
                const currentFrame = move.keyframes[index];
                const nextFrame = index === move.keyframes.length - 1
                    ? (cycle < repeatCount - 1 ? move.keyframes[0] : null)
                    : move.keyframes[index + 1];
                if (!nextFrame) continue;

                const fromExpression = currentFrame.expression;
                const toExpression = nextFrame.expression;
                const fromStateByObj = expressionStates.get(fromExpression);
                const toStateByObj = expressionStates.get(toExpression);
                if (!fromStateByObj || !toStateByObj) continue;

                let segmentStart = currentFrame.t * move.duration;
                let segmentDuration = (nextFrame.t - currentFrame.t) * move.duration;
                if (index === move.keyframes.length - 1) {
                    segmentDuration = move.duration - segmentStart;
                }
                if (segmentDuration <= 0) continue;

                facialObjects.forEach(obj => {
                    const fromSnap = fromStateByObj.get(obj.id);
                    const toSnap = toStateByObj.get(obj.id);
                    if (!fromSnap || !toSnap) return;

                    const generated = [];
                    snapshotProps.forEach(prop => {
                        const before = fromSnap[prop];
                        const after = toSnap[prop];
                        const changed = stringProps.has(prop)
                            ? String(before ?? '') !== String(after ?? '')
                            : (typeof before === 'boolean' || typeof after === 'boolean')
                                ? before !== after
                                : Math.abs((before || 0) - (after || 0)) > 0.01;
                        if (!changed) return;
                        const entry = {
                            property: prop,
                            from: before,
                            to: after,
                            duration: Math.max(1, Math.round(segmentDuration)),
                            easing: 'easeInOut'
                        };
                        if (stringProps.has(prop) || typeof before === 'boolean' || typeof after === 'boolean') {
                            entry.type = 'discrete';
                        }
                        generated.push(entry);
                    });

                    if (!generated.length) return;

                    obj.animations.push({
                        id: Utils.generateId('anim'),
                        type: 'recorded',
                        name: `Face: ${move.name}`,
                        params: { duration: Math.max(1, Math.round(segmentDuration)) / 1000, easing: 'easeInOut' },
                        delay: playheadMs + cycle * move.duration + Math.round(segmentStart),
                        repeat: '1',
                        trigger: 'onLoad',
                        startMode: 'withPrevious',
                        generated
                    });
                    recorded++;

                    if (!this.animations.originalStates.has(obj.id)) {
                        const originalState = Utils.deepClone(obj.toJSON());
                        snapshotProps.forEach(prop => { originalState[prop] = fromStateByObj.get(obj.id)?.[prop]; });
                        this.animations.originalStates.set(obj.id, originalState);
                    }
                });
            }
        }

        restoreSavedStates();
        this.animations.originalStates = null;

        if (recorded > 0) {
            if (options.emitEvents !== false) {
                eventBus.emit('timeline:update');
                eventBus.emit('objects:updated');
            }
            this.stage.requestRender();
            if (options.updateProperties !== false) {
                this.objects.updateProperties();
            }
            if (options.showToast !== false) {
                Utils.showToast(`Face movement "${move.name}" recorded to timeline (${repeatCount} cycles, ${move.duration}ms each)`, 'success');
            }
            if (options.previewAfterRecord !== false) {
                this._playArmatureFacialMovement(armature, moveKey);
            }
            return true;
        }

        return false;
    },

    _recordSvgAfricanArmatureFacialMovement(armature, moveKey, adapter = null, options = {}) {
        const resolved = adapter || this._getArmatureFaceAdapter(armature, { ensure: true });
        const headObj = resolved?.headObj;
        if (!headObj || resolved.kind !== 'svg-african-native' || !this.animations) return false;
        const move = this._getArmatureFaceMovementCatalog(armature, resolved)
            .find(entry => entry.key === moveKey);
        if (!move || !Array.isArray(move.keyframes) || move.keyframes.length < 2) return false;

        this._stopArmatureFacialMovement(armature);
        const playheadMs = this.animations.currentTime || 0;
        const repeatCount = Number.isFinite(options.repeatCountOverride)
            ? Math.max(1, Math.round(options.repeatCountOverride))
            : (move.repeat === Infinity
                ? 4
                : (Number.isFinite(move.repeat) && move.repeat > 0 ? move.repeat : 1));
        const initialState = Utils.deepClone(this.animations._getSvgAfricanFaceState?.(headObj) || {});
        const expressionStates = new Map(
            [...new Set(move.keyframes.map(frame => frame.expression).filter(Boolean))]
                .map(expression => [expression, this._getSvgAfricanExpressionState(expression, resolved)])
        );
        const properties = [...resolved.supportedProperties]
            .filter(property => move.keyframes.some(frame => Number.isFinite(Number(expressionStates.get(frame.expression)?.[property]))));
        const totalDuration = Math.max(1, Math.round(move.duration * repeatCount));
        const generated = properties.map(property => {
            const keyframes = [];
            for (let cycle = 0; cycle < repeatCount; cycle++) {
                move.keyframes.forEach(frame => {
                    const value = expressionStates.get(frame.expression)?.[property];
                    if (!Number.isFinite(Number(value))) return;
                    keyframes.push({
                        t: (cycle + Math.max(0, Math.min(1, Number(frame.t) || 0))) / repeatCount,
                        value: Number(value)
                    });
                });
            }
            keyframes.sort((a, b) => a.t - b.t);
            const lastValue = keyframes[keyframes.length - 1]?.value ?? initialState[property] ?? 0;
            return {
                property: `svgAfricanFace_${property}`,
                from: Number(initialState[property]) || 0,
                to: lastValue,
                keyframes,
                duration: totalDuration,
                easing: 'easeInOut'
            };
        }).filter(config => config.keyframes.length >= 2);
        if (!generated.length) return false;

        headObj.animations = Array.isArray(headObj.animations) ? headObj.animations : [];
        headObj.animations.push({
            id: Utils.generateId('anim'),
            type: 'recorded',
            name: `Face: ${move.name}`,
            params: { duration: totalDuration / 1000, easing: 'easeInOut' },
            delay: playheadMs,
            repeat: '1',
            trigger: 'onLoad',
            startMode: 'withPrevious',
            generated
        });
        if (!(this.animations.originalStates instanceof Map)) this.animations.originalStates = new Map();
        if (!this.animations.originalStates.has(headObj.id)) {
            const original = Utils.deepClone(headObj.toJSON?.() || {});
            original.svgAfricanFaceState = Utils.deepClone(initialState);
            this.animations.originalStates.set(headObj.id, original);
        }
        if (options.emitEvents !== false) {
            eventBus.emit('timeline:update');
            eventBus.emit('objects:updated');
            eventBus.emit('history:push');
        }
        this.stage?.requestRender?.();
        this.objects?.updateProperties?.();
        if (options.showToast !== false) {
            Utils.showToast(`Face movement "${move.name}" recorded to timeline (${repeatCount} cycles, ${move.duration}ms each)`, 'success');
        }
        if (options.previewAfterRecord !== false) {
            this._playSvgAfricanArmatureFacialMovement(armature, moveKey, resolved);
        }
        return true;
    },

    _recordSvgAfricanArmatureFacialExpression(armature, expression, adapter = null) {
        const resolved = adapter || this._getArmatureFaceAdapter(armature, { ensure: true });
        const headObj = resolved?.headObj;
        if (!headObj || resolved.kind !== 'svg-african-native' || !this.animations) return false;
        const before = Utils.deepClone(this.animations._getSvgAfricanFaceState?.(headObj) || {});
        const target = this._getSvgAfricanExpressionState(expression, resolved);
        const generated = Object.entries(target).flatMap(([property, value]) => {
            const from = Number(before[property]);
            const to = Number(value);
            if (!Number.isFinite(to) || Math.abs((Number.isFinite(from) ? from : 0) - to) <= 0.001) return [];
            return [{
                property: `svgAfricanFace_${property}`,
                from: Number.isFinite(from) ? from : 0,
                to,
                duration: 1,
                easing: 'linear'
            }];
        });
        if (!generated.length) {
            this._applySvgAfricanExpressionToArmature(resolved, expression, { pushHistory: false });
            return true;
        }
        headObj.animations = Array.isArray(headObj.animations) ? headObj.animations : [];
        headObj.animations.push({
            id: Utils.generateId('anim'),
            type: 'recorded',
            name: `Face: ${this._friendlyPresetName?.(expression) || expression}`,
            params: { duration: 0.001, easing: 'linear' },
            delay: this.animations.currentTime || 0,
            repeat: '1',
            trigger: 'onLoad',
            startMode: 'withPrevious',
            generated
        });
        if (!(this.animations.originalStates instanceof Map)) this.animations.originalStates = new Map();
        if (!this.animations.originalStates.has(headObj.id)) {
            const original = Utils.deepClone(headObj.toJSON?.() || {});
            original.svgAfricanFaceState = Utils.deepClone(before);
            this.animations.originalStates.set(headObj.id, original);
        }
        this._applySvgAfricanExpressionToArmature(resolved, expression, { pushHistory: false });
        eventBus.emit('timeline:update');
        eventBus.emit('objects:updated');
        eventBus.emit('history:push');
        this.stage?.requestRender?.();
        this.objects?.updateProperties?.();
        return true;
    },

    /**
     * Find the head object in the current armature that has facial features.
     */
    _ucFindFacialHead() {
        // Try the current/detected armature first
        const armature = this._currentArmature || this._detectArmature();
        if (armature?.parts) {
            for (const part of Object.values(armature.parts)) {
                const obj = part?.obj;
                if (obj?._facialFeatures && Object.keys(obj._facialFeatures).length > 0) return obj;
            }
        }
        // Fallback: search all stage objects
        for (const obj of (this.objects?.objects || [])) {
            if (obj?._facialFeatures && Object.keys(obj._facialFeatures).length > 0) return obj;
        }
        return null;
    },


});
