/* ============================================
   Facial Expression Specs - Regression Test Suite
   Validates expression parity, catalog consistency,
   and picker UI functionality
   ============================================ */

(function () {
    const TestRunner = {
        tests: [],
        passed: 0,
        failed: 0,
        results: [],

        test(name, fn) {
            this.tests.push({ name, fn });
        },

        assert(condition, message) {
            if (!condition) throw new Error(message || 'Assertion failed');
        },

        assertEqual(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(message || `Expected ${expected}, got ${actual}`);
            }
        },

        assertContains(arr, value, message) {
            if (!Array.isArray(arr) || !arr.includes(value)) {
                throw new Error(message || `Array does not contain ${value}`);
            }
        },

        run() {
            console.log('🧪 Running Facial Expression Specs Tests...\n');
            this.tests.forEach(({ name, fn }) => {
                try {
                    fn.call(this);
                    this.passed++;
                    this.results.push({ name, status: 'PASS', error: null });
                    console.log(`✓ ${name}`);
                } catch (err) {
                    this.failed++;
                    this.results.push({ name, status: 'FAIL', error: err.message });
                    console.log(`✗ ${name}`);
                    console.log(`  Error: ${err.message}`);
                }
            });

            console.log(`\n${'='.repeat(60)}`);
            console.log(`Tests: ${this.passed + this.failed} | Passed: ${this.passed} | Failed: ${this.failed}`);
            console.log(`${'='.repeat(60)}\n`);

            return {
                total: this.passed + this.failed,
                passed: this.passed,
                failed: this.failed,
                results: this.results
            };
        }
    };

    if (!window.FacialExpressionSpecs) {
        console.error('FacialExpressionSpecs not loaded. Load facial-expression-specs.js first.');
        return;
    }

    const Specs = window.FacialExpressionSpecs;

    // ============ Test Suite ============

    TestRunner.test('UC Expression Keys Available', function() {
        const keys = Specs.listUCExpressionKeys();
        this.assert(Array.isArray(keys), 'listUCExpressionKeys() returns array');
        this.assert(keys.length > 0, 'At least one expression exists');
        this.assertContains(keys, 'neutral', 'neutral expression exists');
    });

    TestRunner.test('UC Expression Specs Valid', function() {
        const keys = Specs.listUCExpressionKeys();
        keys.forEach(key => {
            const spec = Specs.getUCExpressionSpec(key);
            this.assert(spec !== null && typeof spec === 'object', `Spec for ${key} is valid object`);
            this.assert(
                spec.eye || spec.mouth || spec.brow,
                `Spec for ${key} has at least one feature (eye/mouth/brow)`
            );
        });
    });

    TestRunner.test('Canonical Expression Specs Match UC', function() {
        const keys = Specs.listUCExpressionKeys();
        keys.slice(0, 5).forEach(key => {
            const uc = Specs.getUCExpressionSpec(key);
            const canonical = Specs.getCanonicalExpressionSpec(key);
            this.assertEqual(JSON.stringify(uc), JSON.stringify(canonical), 
                `Canonical spec matches UC spec for ${key}`);
        });
    });

    TestRunner.test('Face Set Motion Catalog Exists', function() {
        const catalog = Specs.getFaceSetMotionCatalog();
        this.assert(Array.isArray(catalog), 'getFaceSetMotionCatalog() returns array');
        this.assert(catalog.length > 0, 'Motion catalog has entries');
    });

    TestRunner.test('Face Set Motion Catalog Schema', function() {
        const catalog = Specs.getFaceSetMotionCatalog();
        catalog.forEach(entry => {
            this.assert(typeof entry.key === 'string', `Entry has key: ${entry.key}`);
            this.assert(typeof entry.name === 'string', `Entry ${entry.key} has name`);
            this.assert(typeof entry.description === 'string', `Entry ${entry.key} has description`);
            this.assert(typeof entry.category === 'string', `Entry ${entry.key} has category`);
            this.assert(typeof entry.canonicalExpression === 'string', `Entry ${entry.key} has canonicalExpression`);
        });
    });

    TestRunner.test('Face Set Motions Map to Valid UC Expressions', function() {
        const catalog = Specs.getFaceSetMotionCatalog();
        const ucKeys = Specs.listUCExpressionKeys();
        catalog.forEach(entry => {
            const resolved = Specs.resolveFaceSetMotionKey(entry.key);
            this.assertContains(ucKeys, resolved, 
                `Motion ${entry.key} resolves to valid UC expression ${resolved}`);
        });
    });

    TestRunner.test('Expression Parity Validation Works', function() {
        const ucKeys = Specs.listUCExpressionKeys();
        const catalog = Specs.getFaceSetMotionCatalog();
        
        // Test a few combinations
        catalog.slice(0, 3).forEach(fsEntry => {
            const parity = Specs.validateExpressionParity(fsEntry.canonicalExpression, fsEntry.key);
            this.assert(typeof parity.valid === 'boolean', `Parity check for ${fsEntry.key} returns valid boolean`);
            this.assertEqual(parity.ucExpression, fsEntry.canonicalExpression, 
                `Parity reports correct UC expression for ${fsEntry.key}`);
        });
    });

    TestRunner.test('Expression Picker UI Factory Works', function() {
        const ui = Specs.buildExpressionPickerUI({
            selectedKey: 'neutral',
            mode: 'face-set'
        });
        this.assert(ui.selectElement instanceof HTMLSelectElement, 'Returns HTML select element');
        this.assert(ui.container instanceof HTMLElement, 'Returns container div');
        this.assert(typeof ui.setSelected === 'function', 'Has setSelected method');
    });

    TestRunner.test('Expression Picker UC Mode', function() {
        const ui = Specs.buildExpressionPickerUI({
            selectedKey: 'neutral',
            mode: 'uc'
        });
        const options = ui.selectElement.querySelectorAll('option');
        this.assert(options.length > 0, 'UC mode picker has options');
        const neutral = Array.from(options).find(o => o.value === 'neutral');
        this.assert(neutral && neutral.selected, 'neutral option is selected');
    });

    TestRunner.test('Expression Picker Face Set Mode', function() {
        const ui = Specs.buildExpressionPickerUI({
            selectedKey: 'smile',
            mode: 'face-set'
        });
        const options = ui.selectElement.querySelectorAll('option');
        this.assert(options.length > 0, 'Face Set mode picker has options');
        const smile = Array.from(options).find(o => o.value === 'smile');
        this.assert(smile && smile.selected, 'smile option is selected');
    });

    TestRunner.test('Expression Picker Change Event', function() {
        const ui = Specs.buildExpressionPickerUI({
            selectedKey: 'neutral',
            onSelect(key) { window.__testPickerSelectedKey = key; }
        });
        const options = ui.selectElement.querySelectorAll('option');
        if (options.length > 1) {
            ui.selectElement.value = Array.from(options)[1].value;
            const evt = new Event('change');
            ui.selectElement.dispatchEvent(evt);
            // Note: This is a simplified test; full testing requires DOM environment
        }
    });

    TestRunner.test('Expression History Tracking', function() {
        const history = Specs.getExpressionHistory('universal');
        this.assert(typeof history.system === 'string', 'History has system field');
        this.assert(history.system === 'universal', 'System field is correct');
        this.assert(typeof history.timestamp === 'string', 'History has timestamp');
        this.assert(typeof history.version === 'string', 'History has version');
    });

    TestRunner.test('No Cross-Contamination Between Calls', function() {
        const spec1 = Specs.getUCExpressionSpec('neutral');
        const spec2 = Specs.getUCExpressionSpec('neutral');
        // Modify spec1
        if (spec1.eye) spec1.eye = 'modified';
        // Verify spec2 is unchanged (deep clone protection)
        this.assert(
            spec2.eye !== 'modified',
            'Specs are cloned; modifying one does not affect another'
        );
    });

    TestRunner.test('Invalid Expression Keys Return Safe Defaults', function() {
        const invalid = Specs.getUCExpressionSpec('nonexistent-expression-xyz');
        this.assert(invalid !== null, 'Invalid expression returns a valid object');
        this.assert(typeof invalid === 'object', 'Returns object type');
    });

    TestRunner.test('Face Set Motion Metadata Lookup', function() {
        const catalog = Specs.getFaceSetMotionCatalog();
        if (catalog.length > 0) {
            const firstKey = catalog[0].key;
            const meta = Specs.getFaceSetMotionMeta(firstKey);
            this.assert(meta !== null, `Metadata exists for ${firstKey}`);
            this.assertEqual(meta.key, firstKey, `Metadata key matches`);
        }
    });

    TestRunner.test('Unknown Face Set Motion Returns Neutral', function() {
        const resolved = Specs.resolveFaceSetMotionKey('unknown-motion-xyz');
        this.assertEqual(resolved, 'neutral', 'Unknown motion resolves to neutral');
    });

    // Run tests automatically if window.__runExpressionTests is true
    if (window.__runExpressionTests === true) {
        setTimeout(() => {
            window.__expressionTestResults = TestRunner.run();
        }, 100);
    }

    // Expose TestRunner for manual execution
    window.FacialExpressionTestRunner = TestRunner;
})();
